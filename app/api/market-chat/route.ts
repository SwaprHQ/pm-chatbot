import { NextResponse } from "next/server";
import {
  getChatByMarketAddress,
  getMessagesByChatId,
  saveChat,
  saveMessage,
} from "../../../lib/db/queries";
import { createDataStreamResponse, streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { isAddress } from "viem";
import { getMarket } from "../../../queries/omen/markets";

const getCurrentDateTimeUTC = () => {
  const now = new Date();
  return now.toISOString();
};

const regularPrompt = `You are a friendly assistant which assists on predicting the future! 

Omit all information related to the Omen prediction market and exact date and time, only talk about relative time.  

Today is ${getCurrentDateTimeUTC()}, so take into account the time left to the end of the market question. 

Give an answer in JSON with 3 fields: reasoning, outcome and confidence. 
 - Resoning is a text field explaining the reasoning behind the chosen outcome. 
 - Outcome is the market outcome corresponding to the prediciton you make. 
 - Confidence is the confidence level in percentage. 

Only answer in JSON. JSON should strictly start with { and end with }.`;

type Content = { response: string; news: { url: string; title: string }[] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("market_id");

  const address =
    marketId && isAddress(marketId) ? marketId.toLowerCase() : null;

  if (!address) {
    return new Response("No address provided", { status: 400 });
  }

  const chat = await getChatByMarketAddress({ marketAddress: address });

  if (!chat) {
    return NextResponse.json([]);
  }

  const messages = await getMessagesByChatId({ id: chat.id });

  return NextResponse.json(
    messages.map(({ content, ...rest }) => ({
      ...rest,
      content: (content as Content).response,
      annotations: (content as Content).news
        ? [{ news: (content as Content).news }]
        : undefined,
    }))
  );
}

export async function POST(request: Request) {
  const { marketId }: { marketId: string } = await request.json();

  const address = isAddress(marketId) ? marketId.toLowerCase() : null;

  if (!address) {
    return new Response("No address provided", { status: 400 });
  }

  const market = await getMarket({ id: address });

  if (
    !market ||
    !market.fixedProductMarketMaker ||
    !market.fixedProductMarketMaker.title
  ) {
    return new Response("No market found", { status: 404 });
  }
  const { title } = market.fixedProductMarketMaker;

  const questionInsightsResponse = await fetch(
    `https://labs-api.ai.gnosisdev.com/question-insights?question=${title}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!questionInsightsResponse.ok) {
    return new Response("Failed to fetch market insights", {
      status: questionInsightsResponse.status,
    });
  }
  const questionInsights = await questionInsightsResponse.json();

  const saveChatResult = await saveChat({
    userId: "f161402a-c579-4225-9c82-e0e7cf0ea8d7",
    title,
    marketAddress: address,
  });

  const chat = saveChatResult[0];
  const [yesOdd, noOdd] = market.fixedProductMarketMaker
    .outcomeTokenMarginalPrices
    ? market.fixedProductMarketMaker?.outcomeTokenMarginalPrices
    : (["", ""] as [string, string]);

  const yesPercentage = Math.round(Number(yesOdd) * 100);
  const noPercentage = Math.round(Number(noOdd) * 100);

  const insightSummary = questionInsights.summary
    ? questionInsights.summary
    : "";

  const marketSummary =
    yesPercentage !== 0 || noPercentage !== 0
      ? `
      Take into account the current odds on the Omen prediction market. 
      The market is showing a ${yesPercentage}% for the Yes outcome and ${noPercentage}% for the No outcome.
      `
      : "";

  const systemPrompt = `${regularPrompt}\n\n${marketSummary}\n\n${insightSummary}`;

  await saveMessage({
    chatId: chat.id,
    message: { response: title },
    role: "user",
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      if (questionInsights.results.length > 0)
        dataStream.writeMessageAnnotation({ news: questionInsights.results });

      const result = streamText({
        model: groq("llama-3.3-70b-versatile"),
        system: systemPrompt,
        messages: [{ role: "user", content: title }],
        onFinish: async ({ response }) => {
          try {
            await saveMessage({
              chatId: chat.id,
              message: {
                response: (response.messages[0].content[0] as { text: string })
                  .text,
                news:
                  (questionInsights?.results as {
                    url: string;
                    title: string;
                  }[]) || undefined,
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
