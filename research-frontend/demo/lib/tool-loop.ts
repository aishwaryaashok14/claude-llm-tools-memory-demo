import { ragSearch } from "./rag";
import { navigate, clickByText, screenshot } from "./playwright";
import { appendFact } from "./memory";

export type ToolUse = { name: string; input: Record<string, unknown> };

export async function executeToolUse(tool: ToolUse): Promise<string> {
  try {
    switch (tool.name) {
      case "rag_search": {
        const { query, limit } = tool.input as { query: string; limit?: number };
        const chunks = await ragSearch(query, limit ?? 3);
        return chunks
          .map((c) => `## ${c.source} — ${c.heading}\n${c.content}`)
          .join("\n\n---\n\n");
      }
      case "browser_navigate": {
        const { url } = tool.input as { url: string };
        return await navigate(url);
      }
      case "browser_click": {
        const { text } = tool.input as { text: string };
        return await clickByText(text);
      }
      case "browser_screenshot": {
        return await screenshot();
      }
      case "remember_fact": {
        const { fact } = tool.input as { fact: string };
        await appendFact(fact);
        return `Persisted: ${fact}`;
      }
      default:
        return `Unknown tool: ${tool.name}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function formatTrace(name: string, input: Record<string, unknown>): string {
  const args = Object.entries(input)
    .map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`)
    .join(", ");
  return `🔧 <strong>${name}</strong>(${args})`;
}
