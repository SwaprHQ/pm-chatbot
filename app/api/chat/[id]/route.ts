import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import {
  getChatById,
  getMessagesByChatId,
  saveMessage,
} from "@/lib/db/queries";
import { createDataStreamResponse, Message, streamText } from "ai";
import { Chat } from "@/lib/db/schema";
import { generateSystemPrompt } from "../../prompt";
import { isAddress } from "viem";
import { groqModel } from "@/lib/ai/groq";

type MessageContent = Message & { content: { response: string; news: [] } };

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session || !session.userId) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  if (!id) {
    return NextResponse.json("No id provided", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return NextResponse.json("No chat found", { status: 404 });
  }

  if (chat.userId !== session.userId) {
    return NextResponse.json("Unauthorized", { status: 401 });
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const req = await request.json();
  const { messages }: { messages: Message[]; marketId: string } = req;
  const userMessages = messages.filter((message) => message.role === "user");
  const lastUserMessage = userMessages.at(-1);
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  const sanitizedMessages = messages.map((msg) => ({
    ...msg,
    content: JSON.stringify(msg.content),
  }));

  if (!session || !session.userId) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  if (!lastUserMessage?.content) {
    return NextResponse.json("Invalid message", { status: 400 });
  }

  const chat: Chat = await getChatById({ id });

  if (!chat) {
    return NextResponse.json("Chat not found", { status: 404 });
  }

  if (chat.userId !== session.userId) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }

  if (!lastUserMessage) {
    return NextResponse.json("User message not found", { status: 400 });
  }

  const address =
    chat?.marketAddress && isAddress(chat.marketAddress)
      ? chat.marketAddress.toLowerCase()
      : null;

  let systemPrompt = "";
  try {
    systemPrompt = await generateSystemPrompt({
      marketAddress: address,
    });
  } catch (error) {
    console.error("Failed generating system prompt:", error);
    return NextResponse.json("Failed generating answer", { status: 500 });
  }

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
        model: groqModel,
        messages: sanitizedMessages,
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
