"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";

export const NewChat = () => {
  const { status } = useSession();
  const [text, setText] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    const response = await fetch("/api/market-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: text }),
    });

    //updates chat list
    router.refresh();

    if (response.ok) {
      const { chatId } = await response.json();
      redirect(`/chat/${chatId}`);
    } else {
      // Handle error
    }
  };

  if (status === "unauthenticated") return "Please sign in to chat";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <textarea
        className="w-3/4 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black overflow-hidden"
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
          }
        }}
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
