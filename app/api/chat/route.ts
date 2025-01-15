import { NextResponse } from "next/server";
import { getChatById, saveChat, saveMessage } from "../../../lib/db/queries";
import { auth } from "../../auth";
import { createDataStreamResponse, Message, streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { Chat } from "../../../lib/db/schema";

export async function POST(request: Request) {
  const { message }: { message: string } = await request.json();
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const title =
    message.length > 40 ? message.slice(0, 40).concat("...") : message;

  const saveChatResult = await saveChat({
    userId: session.user.id,
    title,
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
