import { anthropic, MODEL } from "@/lib/anthropic";
import { toolsForMemoryMode } from "@/lib/tools";
import { executeToolUse, formatTrace } from "@/lib/tool-loop";
import { readMemory, readSkill } from "@/lib/memory";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/components/ChatPane";

const MAX_ITERATIONS = 6;

export async function runLlmToolsMemory(messages: ChatMessage[]) {
  const [claudeMd, skillMd] = await Promise.all([readMemory(), readSkill()]);

  const system =
    `${skillMd.trim()}\n\n<user_context>\n${claudeMd.trim()}\n</user_context>`;

  const traces: string[] = [];
  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      tools: toolsForMemoryMode as Anthropic.ToolUnion[],
      messages: apiMessages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { content: text, traces };
    }

    apiMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      traces.push(formatTrace(block.name, block.input as Record<string, unknown>));
      const output = await executeToolUse({
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: output.slice(0, 6000),
      });
    }

    apiMessages.push({ role: "user", content: toolResults });
  }

  return { content: "(stopped after max tool iterations)", traces };
}
