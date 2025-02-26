import { drizzle } from "drizzle-orm/postgres-js";
import { chat, message, prediction, user, User } from "./schema";
import { asc, desc, eq } from "drizzle-orm";
import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL!, { prepare: false });
const db = drizzle(client);

export async function getUser(walletAddress: string): Promise<Array<User>> {
  try {
    return await db
      .select()
      .from(user)
      .where(eq(user.walletAddress, walletAddress));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(walletAddress: string) {
  try {
    return await db.insert(user).values({ walletAddress }).returning();
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({
  userId,
  title,
  marketAddress,
}: {
  userId: string;
  title: string;
  marketAddress?: string;
}) {
  try {
    return await db
      .insert(chat)
      .values({
        createdAt: new Date(),
        userId,
        title,
        marketAddress,
      })
      .returning();
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function getChatByMarketAddress({
  marketAddress,
}: {
  marketAddress: string;
}) {
  try {
    const [selectedChat] = await db
      .select()
      .from(chat)
      .where(eq(chat.marketAddress, marketAddress));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by market address from database");
    throw error;
  }
}

export async function saveMessage({
  chatId,
  message: content,
  role = "user",
}: {
  chatId: string;
  message: { response: string; news?: { url: string; title: string }[] };
  role: string;
}) {
  try {
    return await db
      .insert(message)
      .values({
        createdAt: new Date(),
        content: JSON.stringify(content),
        role,
        chatId,
      })
      .returning();
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const [selectedMessage] = await db
      .select()
      .from(message)
      .where(eq(message.id, id));
    return selectedMessage;
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function savePrediction({
  content,
  marketAddress,
}: {
  content: string;
  marketAddress: string;
}) {
  try {
    return await db
      .insert(prediction)
      .values({
        createdAt: new Date(),
        updatedAt: new Date(),
        content,
        marketAddress,
      })
      .returning();
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function getPredictionByMarketAddress({
  marketAddress,
}: {
  marketAddress: string;
}) {
  try {
    const [selectedPrediction] = await db
      .select()
      .from(prediction)
      .where(eq(prediction.marketAddress, marketAddress));
    return selectedPrediction;
  } catch (error) {
    console.error("Failed to get prediction by market address from database");
    throw error;
  }
}
