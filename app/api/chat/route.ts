import { NextResponse } from "next/server";
import {
  getPredictionByMarketAddress,
  saveChat,
  saveMessage,
  savePrediction,
} from "@/lib/db/queries";
import { generateText } from "ai";
import { Chat } from "@/lib/db/schema";
import { generateSystemPrompt, jsonPrompt } from "../prompt";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { groqModel } from "@/lib/ai/groq";

type QuestionValidity = {
  created_at: string;
  invalid: boolean;
  question: string;
};

async function verifyQuestionAndSaveAnswer(message: string, chat: Chat) {
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

  if (invalid) throw new Error("Invalid question");

  await generateAndSavePrediction(message, chat);
}

async function generateAndSavePrediction(
  message: string,
  chat: Chat,
  marketAddress?: string
) {
  const { text } = await generateText({
    model: groqModel,
    messages: [{ role: "user", content: message }],
    system: await generateSystemPrompt({
      marketAddress,
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

  if (marketAddress) {
    await savePrediction({
      content: text,
      marketAddress: marketAddress,
    });
  }
}

async function savePredictionAnswer(
  message: string,
  chat: Chat,
  marketAddress: string
) {
  const prediction = await getPredictionByMarketAddress({ marketAddress });

  if (!prediction) {
    await generateAndSavePrediction(message, chat, marketAddress);
    return;
  }

  await saveMessage({
    chatId: chat.id,
    message: {
      response: prediction.content as string,
    },
    role: "assistant",
  });
}

export async function POST(request: Request) {
  const { message, marketId }: { message: string; marketId?: string } =
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
    if (marketId) await savePredictionAnswer(message, chat, marketId);
    else await verifyQuestionAndSaveAnswer(message, chat);
  } catch (error) {
    let message;
    if (error instanceof Error) message = error.message;
    else message = String(error);

    return new Response(message, { status: 400 });
  }

  return NextResponse.json({ chatId: chat.id });
}
