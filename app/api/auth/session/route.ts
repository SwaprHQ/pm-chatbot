import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  return NextResponse.json({
    isLoggedIn: session.isLoggedIn ?? false,
    address: session.address || null,
    userId: session.userId || null,
  });
}
