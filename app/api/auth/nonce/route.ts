import { generateNonce } from "siwe";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  const nonce = generateNonce();
  session.nonce = nonce;
  await session.save();

  return NextResponse.json({ nonce });
}
