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

// criar endpoint que recebe  market id e retorna uma resposta na stream
// se for um chat novo, cria o chat na bd com user 0x0

const getCurrentDateTimeUTC = () => {
  const now = new Date();
  return now.toISOString();
};

const regularPrompt = `You are a friendly assistant which assists on prediciton the future! Omit all information related to the Omen prediction market. Today is ${getCurrentDateTimeUTC()}, so take into account the time left for the end of the user question. End the message with a prediction and confidence level.`;

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
  const { title, id } = market.fixedProductMarketMaker;

  const marketInsightsResponse = await fetch(
    `https://labs-api.ai.gnosisdev.com/market-insights?market_id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!marketInsightsResponse.ok) {
    return new Response("Failed to fetch market insights", {
      status: marketInsightsResponse.status,
    });
  }
  const marketInsights = await marketInsightsResponse.json();

  const saveChatResult = await saveChat({
    userId: "f161402a-c579-4225-9c82-e0e7cf0ea8d7",
    title,
    marketAddress: address,
  });

  const chat = saveChatResult[0];
  const [yesOdd, noOdd] = market.fixedProductMarketMaker
    ?.outcomeTokenMarginalPrices as [string, string];

  const yesPercentage = Math.round(Number(yesOdd) * 100);
  const noPercentage = Math.round(Number(noOdd) * 100);

  const systemPrompt = marketInsights?.summary
    ? `${regularPrompt}\n\n${`Take into account the current odds on the Omen prediction market. The market is showing a ${yesPercentage}% for the Yes outcome and ${noPercentage}% for the No outcome.`}\n\n${
        marketInsights.summary
      }`
    : regularPrompt;

  await saveMessage({
    chatId: chat.id,
    message: { response: title },
    role: "user",
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      if (marketInsights.results.length > 0)
        dataStream.writeMessageAnnotation({ news: marketInsights.results });

      const result = streamText({
        model: groq("llama-3.3-70b-versatile"), //old: 	llama-3.2-90b-vision-preview
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
                  (marketInsights?.results as {
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
