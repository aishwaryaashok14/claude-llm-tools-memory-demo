import { anthropic, MODEL } from "@/lib/anthropic";
import { toolsForMemoryMode } from "@/lib/tools";
import { executeToolUse, formatTrace } from "@/lib/tool-loop";
import { readMemory, readSkill } from "@/lib/memory";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/components/ChatPane";

const MAX_ITERATIONS = 6;

export async function runLlmToolsMemory(messages: ChatMessage[]) {
  const [claudeMd, skillMd] = await Promise.all([readMemory(), readSkill()]);

  const system = [
    `You are the assistant in the Memory tab of a teaching demo. The lesson here is how *persistent context + a written procedure* change agent behavior.`,
    ``,
    `Operating rules for this tab (override anything that would contradict):`,
    `1. ALWAYS read <user_context> below FIRST. It is your persistent memory across turns and sessions.`,
    `2. If <user_context> does not name the user's current research target and segment, you MUST follow SKILL Step 1 (scope question) BEFORE any tool call. Do not call rag_search/web_search/browser_* yet.`,
    `3. The instant the user reveals a durable fact (target, segment, angle, constraint, decision), call \`remember_fact\` exactly once with a one-sentence summary. This is the headline behavior of this tab — leaning on it is required, not optional.`,
    `4. Follow the procedure in the SKILL document strictly. Do not skip Step 1 to "save time."`,
    ``,
    `--- SKILL ---`,
    skillMd.trim(),
    ``,
    `--- USER CONTEXT (persistent memory) ---`,
    `<user_context>`,
    claudeMd.trim(),
    `</user_context>`,
  ].join("\n");

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
      const result = await executeToolUse({
        name: block.name,
        input: block.input as Record<string, unknown>,
      });

      let trace = formatTrace(block.name, block.input as Record<string, unknown>);
      let toolContent: Anthropic.ToolResultBlockParam["content"];

      if (result.imageBase64) {
        toolContent = [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: result.imageBase64,
            },
          },
          { type: "text", text: result.text },
        ];
        trace += `<br/><img src="data:image/png;base64,${result.imageBase64}" alt="screenshot" style="max-width:100%;margin-top:6px;border-radius:6px;border:1px solid #ececec" />`;
      } else {
        toolContent = result.text.slice(0, 6000);
      }

      traces.push(trace);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: toolContent,
      });
    }

    apiMessages.push({ role: "user", content: toolResults });
  }

  return { content: "(stopped after max tool iterations)", traces };
}
