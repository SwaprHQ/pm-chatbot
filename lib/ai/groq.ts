import { createGroq } from "@ai-sdk/groq";

export const model = process.env.CHAT_AI_MODEL || "llama-3.3-70b-versatile";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const groqModel = groq(model);
