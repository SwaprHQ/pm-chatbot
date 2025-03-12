import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SiweMessage } from "siwe";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { createUser, getUser } from "@/lib/db/queries";
import { User } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    const { message, signature } = await req.json();
    const siweMessage = new SiweMessage(message);

    await siweMessage.verify({ signature });

    if (siweMessage.nonce !== session.nonce) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 422 });
    }

    session.address = siweMessage.address;
    session.isLoggedIn = true;

    let user: User | undefined;
    const users = await getUser(siweMessage.address);
    user = users[0];

    if (!user) {
      const newUser = await createUser(siweMessage.address);
      if (newUser.length !== 0) user = newUser[0];
      else
        return NextResponse.json(
          { error: "User not found nor created" },
          { status: 404 }
        );
    }

    session.userId = user.id;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
