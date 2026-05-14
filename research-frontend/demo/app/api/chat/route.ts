import { NextRequest, NextResponse } from "next/server";
import { runLlmOnly } from "./modes/llm-only";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { mode, messages } = await req.json();
  try {
    switch (mode) {
      case "llm":
        return NextResponse.json(await runLlmOnly(messages));
      case "tools":
      case "memory":
        return NextResponse.json({ content: `Mode '${mode}' not yet wired.`, traces: [] });
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
