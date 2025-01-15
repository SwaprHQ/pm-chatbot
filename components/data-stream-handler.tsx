"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";

type DataStreamDelta = {
  type: "chat-id";
  content: string;
};

export function DataStreamHandler({ id }: { id: string }) {
  const { data: dataStream } = useChat({ id });
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    (newDeltas as DataStreamDelta[]).forEach((delta: DataStreamDelta) => {
      if (delta.type === "chat-id") {
        console.log("chat-id", delta.content as string);
        return;
      }

      switch (delta.type) {
        default:
          console.log(delta.type, delta.content);
          return;
      }
    });
  }, [dataStream]);

  return null;
}
