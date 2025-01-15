"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useChat } from "ai/react";
import { generateUUID } from "../lib/utils";

export const NewChat = () => {
  const { data: session, status } = useSession();
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: text }),
    });

    if (response.ok) {
      //should use useChat here
      const { chatId } = await response.json();
      redirect(`/chat/${chatId}`);
    } else {
      // Handle error
    }
  };

  // const handleSubmit = async () => {
  //   append({ role: "user", content: text });
  //   redirect(`/chat/${id}`);
  // };

  // useEffect(() => {
  //   if (!dataStream?.length) return;

  //   const lastDataStream = dataStream[dataStream.length - 1] as {
  //     type: "chat-id";
  //     content: string;
  //   };

  //   if (lastDataStream.type === "chat-id") {
  //     redirect(`/chat/${id}`);
  //   }
  // }, [dataStream]);

  if (status === "unauthenticated") return "Please sign in to chat";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <textarea
        className="w-3/4 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black overflow-hidden"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
      />
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleSubmit}
      >
        Ask
      </button>
    </div>
  );
};
