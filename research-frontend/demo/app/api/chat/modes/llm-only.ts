import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/anthropic";
import type { ChatMessage } from "@/components/ChatPane";

export async function runLlmOnly(messages: ChatMessage[]) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: "You are a research assistant.",
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { content: text, traces: [] };
}
