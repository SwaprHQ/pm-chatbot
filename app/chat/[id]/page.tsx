import { Message } from "ai/react";
import { Chat } from "../../../components/chat";
import { getMessagesByChatId } from "../../../lib/db/queries";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const id = (await params).id;

  const messages = await getMessagesByChatId({ id });

  return (
    <Chat
      id={id}
      initialMessages={messages.map(({ content, role, id }) => {
        return {
          content: (content as { response: string }).response,
          role: role as Message["role"],
          id,
        };
      })}
    />
  );
}
