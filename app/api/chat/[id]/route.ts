import { NextResponse } from "next/server";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { Message } from "ai";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

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
