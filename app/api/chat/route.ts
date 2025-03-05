import { NextResponse } from "next/server";
import {
  getChatById,
  getMessagesByChatId,
  getPredictionByMarketAddress,
  saveChat,
  saveMessage,
} from "../../../lib/db/queries";
import {
  createDataStreamResponse,
  generateText,
  Message,
  streamText,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { Chat } from "../../../lib/db/schema";
import { generateSystemPrompt, jsonPrompt } from "../util";
import { isAddress } from "viem";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

type MessageContent = Message & { content: { response: string; news: [] } };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session || !session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!id) {
    return new Response("No id provided", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new Response("No chat found", { status: 404 });
  }

  if (chat.userId !== session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const messages = (await getMessagesByChatId({
    id: chat.id,
  })) as MessageContent[];

  return NextResponse.json({
    ...chat,
    messages: messages.map(({ content, ...rest }) => ({
      ...rest,
      content: JSON.stringify(content.response),
      annotations: content.news ? [{ news: content.news }] : undefined,
    })),
  });
}

export async function POST(request: Request) {
  const { message, marketId }: { message: string; marketId: string } =
    await request.json();
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session || !session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const title =
    message.length > 40 ? message.slice(0, 40).concat("...") : message;

  const [chat] = await saveChat({
    userId: session.userId,
    title,
    marketAddress: marketId,
  });

  await saveMessage({
    chatId: chat.id,
    message: { response: message },
    role: "user",
  });

  try {
    if (marketId) createChat(message, chat, marketId);
    else verifyQuestionAndCreateChat(message, chat);
  } catch (error) {
    let message;
    if (error instanceof Error) message = error.message;
    else message = String(error);

    return new Response(message, { status: 400 });
  }

  return NextResponse.json({ chatId: chat.id });
}

async function createChat(message: string, chat: Chat, marketAddress: string) {
  const prediction = await getPredictionByMarketAddress({ marketAddress });

  if (!prediction) return generateAssistantAnswer(message, chat);

  await saveMessage({
    chatId: chat.id,
    message: {
      response: prediction.content as string,
    },
    role: "assistant",
  });
}

type QuestionValidity = {
  created_at: string;
  invalid: boolean;
  question: string;
};

async function verifyQuestionAndCreateChat(message: string, chat: Chat) {
  const invalidQuestionResponse = await fetch(
    `https://labs-api.ai.gnosisdev.com/question-invalid?question=${message}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const { invalid } =
    (await invalidQuestionResponse.json()) as QuestionValidity;

  if (invalid) {
    throw new Error("Invalid question");
  }

  return generateAssistantAnswer(message, chat);
}

async function generateAssistantAnswer(message: string, chat: Chat) {
  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    messages: [{ role: "user", content: message }],
    system: await generateSystemPrompt({
      marketAddress: null,
      message: message,
      systemPrompt: jsonPrompt,
    }),
  });

  await saveMessage({
    chatId: chat.id,
    message: {
      response: text,
    },
    role: "assistant",
  });
}

export async function PUT(request: Request) {
  const req = await request.json();
  const {
    messages,
    id,
  }: { messages: Message[]; id: string; marketId: string } = req;
  const userMessages = messages.filter((message) => message.role === "user");
  const lastUserMessage = userMessages.at(-1);
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session || !session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat: Chat = await getChatById({ id });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.userId !== session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!lastUserMessage) {
    return new Response("User message not found", { status: 404 });
  }

  const address =
    chat?.marketAddress && isAddress(chat.marketAddress)
      ? chat.marketAddress.toLowerCase()
      : null;

  const systemPrompt = await generateSystemPrompt({
    marketAddress: address,
  });

  if (userMessages.length > 1) {
    await saveMessage({
      chatId: chat.id,
      message: { response: lastUserMessage.content as string },
      role: "user",
    });
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: groq("llama-3.2-90b-vision-preview"),
        messages,
        system: systemPrompt,
        onFinish: async ({ response }) => {
          try {
            await saveMessage({
              chatId: chat.id,
              message: {
                response: (response.messages[0].content[0] as { text: string })
                  .text,
              },
              role: "assistant",
            });
          } catch (error) {
            console.error("Failed to save chat:", error);
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
