import { NextResponse } from "next/server";
import {
  getChatById,
  getMessageById,
  getMessagesByChatId,
  saveChat,
  saveMessage,
} from "../../../lib/db/queries";
import { Message as ChatMessage } from "../../../lib/db/schema";
import { auth } from "../../auth";
import {
  convertToCoreMessages,
  CoreMessage,
  createDataStreamResponse,
  generateText,
  Message,
  streamText,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { Chat } from "../../../lib/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!id) {
    return new Response("No id", { status: 400 });
  }
  const messages = await getMessagesByChatId({ id });

  if (!messages || messages.length === 0) {
    return new Response("Messages not found", { status: 404 });
  }

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const { message }: { message: string } = await request.json();
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const saveChatResult = await saveChat({
    userId: session.user.id,
    title: message,
  });
  const chat = saveChatResult[0];
  await saveMessage({
    chatId: chat.id,
    message: message,
    role: "user",
  });

  return NextResponse.json({ chatId: chat.id });
}

export async function PUT(request: Request) {
  const req = await request.json();
  const { messages, id }: { messages: Message[]; id: string } = req;
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

  if (!lastUserMessage) {
    return new Response("User message not found", { status: 404 });
  }

  if (userMessages.length > 1) {
    await saveMessage({
      chatId: chat.id,
      message: lastUserMessage.content as string,
      role: "user",
    });
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      if (!id) {
        dataStream.writeData({
          type: "chat-id",
          content: chat.id,
        });
      }

      const result = streamText({
        model: groq("llama-3.2-90b-vision-preview"),
        messages,
        onFinish: async ({ response }) => {
          if (session.user?.id) {
            try {
              await saveMessage({
                chatId: chat.id,
                message: (response.messages[0].content[0] as { text: string })
                  .text,
                role: "assistant",
              });
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
