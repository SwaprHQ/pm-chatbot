import { NextResponse } from "next/server";
import {
  getChatById,
  getMessagesByChatId,
  getPredictionByMarketAddress,
  saveChat,
  saveMessage,
} from "../../../lib/db/queries";
import { auth } from "../../auth";
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

type MessageContent = Message & { content: { response: string; news: [] } };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!id) {
    return new Response("No id provided", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new Response("No chat found", { status: 404 });
  }

  if (chat.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const messages = (await getMessagesByChatId({
    id: chat.id,
  })) as MessageContent[];

  return NextResponse.json({
    ...chat,
    messages: messages.map(({ content, ...rest }) => ({
      ...rest,
      content: content.response,
      annotations: content.news ? [{ news: content.news }] : undefined,
    })),
  });
}

export async function POST(request: Request) {
  const { message, marketId }: { message: string; marketId: string } =
    await request.json();
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const title =
    message.length > 40 ? message.slice(0, 40).concat("...") : message;

  const [chat] = await saveChat({
    userId: session.user.id,
    title,
    marketAddress: marketId,
  });

  await saveMessage({
    chatId: chat.id,
    message: { response: message },
    role: "user",
  });

  try {
    if (marketId) createMarketChat(message, chat, marketId);
    else verifyAndCreateChat(message, chat);
  } catch (error) {
    let message;
    if (error instanceof Error) message = error.message;
    else message = String(error);

    return new Response(message, { status: 400 });
  }

  return NextResponse.json({ chatId: chat.id });
}

async function createMarketChat(
  message: string,
  chat: Chat,
  marketAddress: string
) {
  const preditcion = await getPredictionByMarketAddress({ marketAddress });

  if (!preditcion) return createChat(message, chat);

  await saveMessage({
    chatId: chat.id,
    message: {
      response: preditcion.content as string,
    },
    role: "assistant",
  });
}

type QuestionValidity = {
  created_at: string;
  invalid: boolean;
  question: string;
};

async function verifyAndCreateChat(message: string, chat: Chat) {
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

  return createChat(message, chat);
}

async function createChat(message: string, chat: Chat) {
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
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat: Chat = await getChatById({ id });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.userId !== session.user.id) {
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
          if (session.user?.id) {
            try {
              await saveMessage({
                chatId: chat.id,
                message: {
                  response: (
                    response.messages[0].content[0] as { text: string }
                  ).text,
                },
                role: "assistant",
              });
            } catch (error) {
              console.error("Failed to save chat:", error);
            }
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
