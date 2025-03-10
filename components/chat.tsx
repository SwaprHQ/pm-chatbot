"use client";

import { Message, useChat } from "ai/react";
import { useEffect } from "react";
import MarkdownRenderer from "./markdown-renderer";
import Link from "next/link";

interface ChatProps {
  id: string;
  initialMessages: Message[];
}

export const Chat = ({ id, initialMessages }: ChatProps) => {
  const { messages, setInput, input, isLoading, reload, handleSubmit } =
    useChat({
      id,
      body: {
        id,
      },
      fetch: (input, init) => {
        return fetch("/api/market-chat", {
          ...init,
          method: "PUT",
        });
      },
      initialMessages,
    });

  useEffect(() => {
    if (initialMessages.length === 1) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitForm = () => {
    handleSubmit();
  };

  return (
    <div className="flex flex-col h-screen px-4 pt-20 pb-8">
      <div className="flex-1 overflow-y-auto p-2 h-full">
        {messages.map((message, index) => {
          const news = (
            message.annotations?.[0] as {
              news: { url: string; title: string }[];
            }
          )?.news;

          return (
            <div
              key={index}
              className={message.role === "user" ? "text-right" : "text-left"}
            >
              <MarkdownRenderer
                className={`inline-block p-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white max-w-[45%]"
                    : "bg-gray-200 text-black max-w-[45%]"
                } my-1`}
                content={message.content}
              />{" "}
              {news && (
                <div className="mt-4 space-y-2">
                  <p className="font-bold">Related news</p>
                  <div className="flex space-x-2">
                    {news.map(({ title, url }, index) => (
                      <Link
                        href={url}
                        key={index}
                        className="block bg-gray-200 rounded-lg p-2 text-black underline text-md max-w-40"
                        target="_blank"
                      >
                        {title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded border border-gray-300 text-black"
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
          onClick={isLoading ? undefined : submitForm}
          className="ml-2 p-2 rounded bg-blue-500 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
};
