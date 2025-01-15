import React from "react";
import Link from "next/link";
import { getChatsByUserId } from "../lib/db/queries";
import { auth } from "../app/auth";

const ChatList = async () => {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return null;
  }

  const chats = await getChatsByUserId({ id: session.user.id });

  if (!chats) return <div>No chats</div>;

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-800 text-white pt-20">
      <h2 className="font-bold mb-4">Chats</h2>
      <ul>
        {chats.map((chat: { id: string; title: string }) => (
          <li key={chat.id}>
            <Link
              className="font-bold text-sm text-white p-2 rounded w-full block"
              href={`/chat/${chat.id}`}
            >
              {chat.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
