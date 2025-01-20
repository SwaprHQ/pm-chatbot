import { NextResponse } from "next/server";
import { getChatById, saveChat, saveMessage } from "../../../lib/db/queries";
import { auth } from "../../auth";
import { createDataStreamResponse, Message, streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { Chat } from "../../../lib/db/schema";
import { isAddress } from "viem";
import { getMarket } from "../../../queries/omen/markets";

const regularPrompt =
  "You are a friendly assistant which assists on prediciton the future!";

export async function POST(request: Request) {
  const { message }: { message: string } = await request.json();
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const address = isAddress(message) ? message : null;

  if (!address) {
    return new Response("No address provided", { status: 400 });
  }

  const market = await getMarket({ id: address });
  console.log("market", market.fixedProductMarketMaker);

  if (
    !market ||
    !market.fixedProductMarketMaker ||
    !market.fixedProductMarketMaker.title
  ) {
    return new Response("No market found", { status: 404 });
  }
  const { title } = market.fixedProductMarketMaker;

  const saveChatResult = await saveChat({
    userId: session.user.id,
    title,
    marketAddress: address,
  });
  const chat = saveChatResult[0];

  await saveMessage({
    chatId: chat.id,
    message: { response: title },
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

  console.log(chat.marketAddress);
  const market = await getMarket({ id: chat.marketAddress || "" });

  const marketInsightsResponse = await fetch(
    `https://labs-api.ai.gnosisdev.com/market-insights?market_id=${chat.marketAddress}`,
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
  console.log("marketInsights", marketInsights);

  const [yesOdd, noOdd] = market.fixedProductMarketMaker
    ?.outcomeTokenMarginalPrices as [string, string];

  const yesPercentage = Math.round(Number(yesOdd) * 100);
  const noPercentage = Math.round(Number(noOdd) * 100);

  const systemPrompt = marketInsights?.summary
    ? `${regularPrompt}\n\n${`Take into account the current odds on the Omen prediction market. The market is showing a ${yesPercentage}% for Yes and ${noPercentage}% for a No.`}\n\n${
        marketInsights.summary
      }`
    : regularPrompt;

  console.log("systemPrompt", systemPrompt);

  if (userMessages.length > 1) {
    await saveMessage({
      chatId: chat.id,
      message: { response: lastUserMessage.content as string },
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

      if (marketInsights.results.length > 0 && messages.length < 2)
        dataStream.writeMessageAnnotation({ news: marketInsights.results });

      const result = streamText({
        model: groq("llama-3.2-90b-vision-preview"),
        system: systemPrompt,
        messages,
        onFinish: async ({ response }) => {
          if (session.user?.id) {
            try {
              await saveMessage({
                chatId: chat.id,
                message: {
                  response: (
                    response.messages[0].content[0] as { text: string }
                  ).text,
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
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
