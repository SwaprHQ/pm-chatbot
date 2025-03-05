import {
  getPredictionByMarketAddress,
  savePrediction,
} from "../../../lib/db/queries";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { isAddress } from "viem";
import { getMarket } from "../../../queries/omen/markets";
import { NextResponse } from "next/server";
import { generateSystemPrompt, jsonPrompt } from "../util";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("market_id");

  const address =
    marketId && isAddress(marketId) ? marketId.toLowerCase() : null;

  if (!address) {
    return new Response("No address provided", { status: 400 });
  }

  const prediction = await getPredictionByMarketAddress({
    marketAddress: address,
  });

  if (!prediction) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    message: {
      response: JSON.stringify(prediction.content),
    },
    role: "assistant",
  });
}

export async function POST(request: Request) {
  const { marketId }: { marketId: string } = await request.json();

  const address = isAddress(marketId) ? marketId.toLowerCase() : null;

  if (!address) {
    return new Response("No address provided", { status: 400 });
  }

  const market = await getMarket({ id: address });

  if (!market) {
    return new Response("Market not found", { status: 404 });
  }

  if (!market.fixedProductMarketMaker?.title) {
    return new Response("Market title not found", { status: 400 });
  }

  const systemPrompt = await generateSystemPrompt({
    marketAddress: address,
    message: market.fixedProductMarketMaker.title,
    systemPrompt: jsonPrompt,
  });

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: [{ role: "user", content: market.fixedProductMarketMaker.title }],
  });

  const prediction = await savePrediction({
    content: text,
    marketAddress: address,
  });

  if (!prediction) {
    return new Response("Prediction not saved", { status: 500 });
  }

  return NextResponse.json({
    message: {
      response: text,
    },
    role: "assistant",
  });
}
