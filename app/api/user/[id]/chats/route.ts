import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { getChatsByUserId } from "@/lib/db/queries";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session || !session.userId || session.userId !== id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chats = await getChatsByUserId({ id });
    const chatList = chats.map(({ id, title }) => ({
      id,
      title,
    }));

    return NextResponse.json(chatList);
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return new Response("Server error", { status: 500 });
  }
}
