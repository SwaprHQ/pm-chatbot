"use client";

import { Message, useChat } from "ai/react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { message } from "../lib/db/schema";
import { getMessagesByChatId } from "../lib/db/queries";

interface ChatProps {
  id: string;
  initialMessages: Message[];
}

//resolver probelma de mensagens sem id

export const Chat = ({ id, initialMessages }: ChatProps) => {
  const { messages, setInput, input, isLoading, reload, handleSubmit } =
    useChat({
      id,
      body: {
        id,
      },
      fetch: (input, init) => {
        console.log("fetching", init);
        return fetch(input, {
          ...init,
          method: "PUT",
        });
      },
      initialMessages,
    });

  useEffect(() => {
    if (initialMessages.length === 1) reload();
  }, []);

  const { data: session, status } = useSession();

  const submitForm = () => {
    handleSubmit();
  };

  if (status === "unauthenticated") return "Please sign in to chat";

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 border border-gray-300 mt-20 mb-24">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              } my-1`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex p-2 border-t border-gray-300 fixed bottom-10 left-0 right-0 text-black">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded border border-gray-300"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();

              if (isLoading) {
                console.error(
                  "Please wait for the model to finish its response!"
                );
              } else {
                submitForm();
              }
            }
          }}
        />
        <button
          onClick={submitForm}
          className="ml-2 p-2 rounded bg-blue-500 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
};
