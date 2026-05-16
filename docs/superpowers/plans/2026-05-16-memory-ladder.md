# Memory Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the 3-tab demo into a 5-tab contrastive memory ladder (LLM / +Short-term / +Long-term / +Tools / +Tools+Memory) with a collapsible in-app lesson panel and a 🔄 new-session punchline.

**Architecture:** Add two new stateless-or-replay mode handlers, make the existing `llm` and `tools` handlers stateless, isolate long-term memory to a CLAUDE.md-only tab using `remember_fact` as the sole write tool, and add a `LessonPanel` React component carrying two comparison tables. The `+ Tools + Memory` capstone is untouched.

**Tech Stack:** Next.js (App Router, `node` runtime), React client components, Anthropic SDK, Vitest (`lib/**/*.test.ts` only), Tailwind.

All paths are relative to `research-frontend/demo/`. Run all commands from that directory.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `lib/stickies.ts` | provenance chips per mode | modify (new modes/kinds) |
| `lib/stickies.test.ts` | unit tests for stickies | modify (TDD) |
| `lib/tools.ts` | Anthropic tool definitions | modify (long-term tool set) |
| `components/ChatPane.tsx` | chat + sticky rendering | modify (one new sticky style) |
| `components/MemoryPanel.tsx` | live file side panel | modify (optional `showSkill`) |
| `components/LessonPanel.tsx` | collapsible lesson tables | **create** |
| `app/api/chat/modes/llm-only.ts` | LLM mode | modify (stateless) |
| `app/api/chat/modes/llm-tools.ts` | Tools mode | modify (stateless) |
| `app/api/chat/modes/short-term.ts` | Short-term mode | **create** |
| `app/api/chat/modes/long-term.ts` | Long-term mode | **create** |
| `app/api/chat/route.ts` | mode router | modify (2 cases) |
| `app/page.tsx` | tabs, histories, panels, reset | modify |
| `DEMO.md` | instructor script | modify (5-tab) |

`lib/memory.ts`, `lib/rag.ts`, `lib/playwright.ts`, `lib/tool-loop.ts`, `app/api/chat/modes/llm-tools-memory.ts`, `app/api/memory/route.ts` are **unchanged**.

---

## Task 1: Stickies — new modes and sticky kinds (TDD)

**Files:**
- Modify: `lib/stickies.ts`
- Test: `lib/stickies.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the top-level `describe("buildStickies", ...)` block in `lib/stickies.test.ts`, before its closing `});`:

```typescript
  describe("short-term mode", () => {
    it("returns a single short-term sticky regardless of inputs", () => {
      const stickies = buildStickies({ mode: "short-term" });
      expect(stickies).toHaveLength(1);
      expect(stickies[0].kind).toBe("short-term");
      expect(stickies[0].label).toMatch(/short-term/i);
      expect(stickies[0].detail).toMatch(/transcript|history/i);
    });
  });

  describe("long-term mode", () => {
    it("always includes the CLAUDE.md sticky, never SKILL or tool stickies", () => {
      const stickies = buildStickies({
        mode: "long-term",
        toolCalls: [{ name: "rag_search", input: { query: "x" } }],
      });
      const kinds = stickies.map((s) => s.kind);
      expect(kinds).toContain("memory");
      expect(kinds).not.toContain("skill");
      expect(kinds).not.toContain("tool");
    });

    it("emits a remember sticky when remember_fact fired, with the fact in detail", () => {
      const stickies = buildStickies({
        mode: "long-term",
        toolCalls: [
          { name: "remember_fact", input: { fact: "User researches Luma AI." } },
        ],
      });
      const remember = stickies.find((s) => s.kind === "remember");
      expect(remember).toBeDefined();
      expect(remember!.detail).toContain("Luma AI");
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/stickies.test.ts`
Expected: FAIL — `short-term`/`long-term` not assignable to `mode`, and assertions fail.

- [ ] **Step 3: Implement the stickies changes**

In `lib/stickies.ts`, change the `StickyKind` type (line 1):

```typescript
export type StickyKind = "llm-only" | "tool" | "memory" | "skill" | "remember" | "short-term";
```

Change `BuildStickiesInput.mode` (the `mode:` field of the `BuildStickiesInput` type):

```typescript
  mode: "llm" | "short-term" | "long-term" | "tools" | "memory";
```

Add this constant next to the other sticky constants (after the `SKILL_LOADED` constant):

```typescript
const SHORT_TERM: Sticky = {
  kind: "short-term",
  label: "Short-term memory",
  detail:
    "The full conversation transcript is replayed in messages[] every turn. Volatile — a new session wipes it. No persisted store, no tools.",
};
```

In `buildStickies`, immediately after the existing `if (input.mode === "llm") return [LLM_ONLY];` line, add:

```typescript
  if (input.mode === "short-term") return [SHORT_TERM];
```

Then, replace the final block of `buildStickies` (from `const memory: Sticky[] = [CLAUDE_MD, SKILL_LOADED];` through the closing `return [...memory, ...tool];`) with:

```typescript
  if (input.mode === "long-term") {
    const out: Sticky[] = [CLAUDE_MD];
    for (const r of grouped.get("remember_fact") ?? []) {
      out.push({
        kind: "remember",
        label: "remember_fact",
        detail: `Saved to memory/CLAUDE.md: "${String(r.input.fact ?? "")}"`,
      });
    }
    return out; // never SKILL, never tool stickies — long-term adds no tools
  }

  const memory: Sticky[] = [CLAUDE_MD, SKILL_LOADED];
  const remembers = grouped.get("remember_fact") ?? [];
  for (const r of remembers) {
    const fact = String(r.input.fact ?? "");
    memory.push({
      kind: "remember",
      label: "remember_fact",
      detail: `Saved to memory/CLAUDE.md: "${fact}"`,
    });
  }

  return [...memory, ...tool];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/stickies.test.ts`
Expected: PASS — all existing tests plus the two new describe blocks.

- [ ] **Step 5: Commit**

```bash
git add lib/stickies.ts lib/stickies.test.ts
git commit -m "feat(stickies): short-term + long-term modes"
```

---

## Task 2: ChatPane sticky style for the short-term kind

**Files:**
- Modify: `components/ChatPane.tsx:12-18`

- [ ] **Step 1: Add the style entry**

In `components/ChatPane.tsx`, add one line to the `STICKY_STYLES` record (after the `remember:` line, before the closing `};`):

```typescript
  "short-term": { bg: "#ecfeff", border: "#a5f3fc", text: "#155e75", icon: "💬", tag: "Memory" },
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors (the `Record<Sticky["kind"], ...>` now requires this key — Task 1 added `short-term` to the union, so this satisfies it).

- [ ] **Step 3: Commit**

```bash
git add components/ChatPane.tsx
git commit -m "feat(ui): short-term sticky style"
```

---

## Task 3: Long-term tool set

**Files:**
- Modify: `lib/tools.ts:69-70`

- [ ] **Step 1: Add the tool set**

In `lib/tools.ts`, after the `toolsForMemoryMode` export (the last line), add:

```typescript
export const toolsForLongTermMode = [rememberFactTool];
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/tools.ts
git commit -m "feat(tools): long-term tool set (remember_fact only)"
```

---

## Task 4: Make the LLM mode stateless

**Files:**
- Modify: `app/api/chat/modes/llm-only.ts:18`

- [ ] **Step 1: Send only the last message**

In `app/api/chat/modes/llm-only.ts`, replace this line:

```typescript
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
```

with:

```typescript
    // Stateless: only the latest user message reaches the model — no prior turns.
    messages: [
      {
        role: "user",
        content: messages[messages.length - 1]?.content ?? "",
      },
    ],
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/modes/llm-only.ts
git commit -m "feat(llm): make LLM tab stateless"
```

---

## Task 5: Make the Tools mode stateless

**Files:**
- Modify: `app/api/chat/modes/llm-tools.ts:23-26`

- [ ] **Step 1: Seed the loop with only the last message**

In `app/api/chat/modes/llm-tools.ts`, replace:

```typescript
  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
```

with:

```typescript
  // Stateless: only the latest user message seeds the loop — no prior turns.
  // The within-turn tool loop still appends assistant/tool_result blocks below.
  const apiMessages: Anthropic.MessageParam[] = [
    { role: "user", content: messages[messages.length - 1]?.content ?? "" },
  ];
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/modes/llm-tools.ts
git commit -m "feat(tools): make Tools tab stateless"
```

---

## Task 6: Short-term mode handler

**Files:**
- Create: `app/api/chat/modes/short-term.ts`

- [ ] **Step 1: Create the handler**

Create `app/api/chat/modes/short-term.ts`:

```typescript
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/anthropic";
import type { ChatMessage } from "@/components/ChatPane";
import { buildStickies } from "@/lib/stickies";

const SYSTEM = `You are a helpful research assistant. You have NO tools and NO persistent memory. Your only context is the conversation transcript you are given this turn — earlier messages are present only because they are replayed to you. Answer naturally using that transcript. If asked something only knowable from earlier in this conversation, use the transcript; if it is not in the transcript, say you don't have it.`;

export async function runShortTerm(messages: ChatMessage[]) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    // Short-term memory: the ENTIRE transcript is replayed every turn.
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { content: text, traces: [], stickies: buildStickies({ mode: "short-term" }) };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/modes/short-term.ts
git commit -m "feat(short-term): in-context transcript-replay mode"
```

---

## Task 7: Long-term mode handler

**Files:**
- Create: `app/api/chat/modes/long-term.ts`

- [ ] **Step 1: Create the handler**

Create `app/api/chat/modes/long-term.ts`. It is stateless on the transcript (only the latest user message seeds the loop) but injects `CLAUDE.md` into the system prompt and exposes `remember_fact` only:

```typescript
import { anthropic, MODEL } from "@/lib/anthropic";
import { toolsForLongTermMode } from "@/lib/tools";
import { executeToolUse, formatTrace } from "@/lib/tool-loop";
import { readMemory } from "@/lib/memory";
import { buildStickies, type ObservedToolCall } from "@/lib/stickies";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/components/ChatPane";

const MAX_ITERATIONS = 4;

export async function runLongTerm(messages: ChatMessage[]) {
  const claudeMd = await readMemory();

  const system = [
    `You are a research assistant with LONG-TERM MEMORY but NO conversation history and NO research tools.`,
    `You cannot see earlier turns — treat each message as the start of a fresh session.`,
    `Your only durable context is <user_context> below, which is loaded from memory/CLAUDE.md on EVERY request.`,
    ``,
    `Rules:`,
    `1. Read <user_context> first and use it to answer (e.g. the user's name, what they research).`,
    `2. The instant the user states something durable about themselves or their work, call \`remember_fact\` once with a single short sentence so it survives future sessions.`,
    `3. You have no rag_search/web_search/browser tools. Do not claim to.`,
    ``,
    `--- USER CONTEXT (persistent memory) ---`,
    `<user_context>`,
    claudeMd.trim(),
    `</user_context>`,
  ].join("\n");

  const traces: string[] = [];
  const toolCalls: ObservedToolCall[] = [];

  // Stateless on the transcript: only the latest user message seeds the loop.
  const apiMessages: Anthropic.MessageParam[] = [
    { role: "user", content: messages[messages.length - 1]?.content ?? "" },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system,
      tools: toolsForLongTermMode as Anthropic.ToolUnion[],
      messages: apiMessages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return {
        content: text,
        traces,
        stickies: buildStickies({ mode: "long-term", toolCalls }),
      };
    }

    apiMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolCalls.push({
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
      const result = await executeToolUse({
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
      traces.push(formatTrace(block.name, block.input as Record<string, unknown>));
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.text.slice(0, 4000),
      });
    }

    apiMessages.push({ role: "user", content: toolResults });
  }

  return {
    content: "(stopped after max tool iterations)",
    traces,
    stickies: buildStickies({ mode: "long-term", toolCalls }),
  };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/modes/long-term.ts
git commit -m "feat(long-term): CLAUDE.md-only persistent memory mode"
```

---

## Task 8: Route the new modes

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Import and route**

In `app/api/chat/route.ts`, add two imports after the existing mode imports:

```typescript
import { runShortTerm } from "./modes/short-term";
import { runLongTerm } from "./modes/long-term";
```

Add two cases inside the `switch (mode)` block, after the `case "llm":` block and before `case "tools":`:

```typescript
      case "short-term":
        return NextResponse.json(await runShortTerm(messages));
      case "long-term":
        return NextResponse.json(await runLongTerm(messages));
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(api): route short-term + long-term modes"
```

---

## Task 9: LessonPanel component

**Files:**
- Create: `components/LessonPanel.tsx`

- [ ] **Step 1: Create the component**

Create `components/LessonPanel.tsx`. It is collapsible, has two views (`behavior` / `capabilities`), and highlights the active mode's row. Caller controls default open state.

```typescript
"use client";

import { useState } from "react";

export type Mode = "llm" | "short-term" | "long-term" | "tools" | "memory";

const ROWS: { mode: Mode; label: string }[] = [
  { mode: "llm", label: "LLM" },
  { mode: "short-term", label: "+ Short-term" },
  { mode: "long-term", label: "+ Long-term" },
  { mode: "tools", label: "+ Tools" },
  { mode: "memory", label: "+ Tools + Memory" },
];

const BEHAVIOR: Record<Mode, [string, string, string, string]> = {
  llm:          ["current message only", "none", "❌", "❌"],
  "short-term": ["full transcript replayed in messages[]", "volatile session state", "❌", "❌"],
  "long-term":  ["current message + facts in system prompt (no transcript)", "memory/CLAUDE.md", "✅", "❌"],
  tools:        ["current message + tool results", "none", "❌", "✅"],
  memory:       ["facts + SKILL in system prompt + tool results", "CLAUDE.md + SKILL.md", "✅", "✅"],
};

const CAPS: Record<Mode, [string, string, string, string, string, string, string]> = {
  //          history  CLAUDE.md  rag    web    browser  SKILL  remember_fact
  llm:          ["—", "—", "—", "—", "—", "—", "—"],
  "short-term": ["✅", "—", "—", "—", "—", "—", "—"],
  "long-term":  ["—", "✅", "—", "—", "—", "—", "✅"],
  tools:        ["—", "—", "✅", "✅", "✅", "—", "—"],
  memory:       ["—", "✅", "✅", "✅", "✅", "✅", "✅"],
};

const BEHAVIOR_COLS = ["Layer", "What's sent to the model", "Memory store", "Survives 🔄 new session", "Grounded / can cite"];
const CAPS_COLS = ["Layer", "msg history", "CLAUDE.md", "rag_search", "web_search", "browser_*", "SKILL.md", "remember_fact"];

export function LessonPanel({ active, defaultOpen }: { active: Mode; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState<"behavior" | "capabilities">("behavior");

  const cols = view === "behavior" ? BEHAVIOR_COLS : CAPS_COLS;

  return (
    <div className="border-b border-line bg-[#fafafa] px-6 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-semibold text-ink-2 hover:text-ink"
        >
          {open ? "▾" : "▸"} Lesson — short-term vs long-term memory
        </button>
        {open && (
          <div className="ml-auto flex gap-1 text-[11px]">
            {(["behavior", "capabilities"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={
                  "rounded-md border px-2 py-0.5 capitalize " +
                  (view === v
                    ? "border-orange bg-orange-soft text-ink"
                    : "border-line text-ink-3 hover:text-ink-2")
                }
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-[11px] leading-snug">
            <thead>
              <tr className="bg-white">
                {cols.map((c) => (
                  <th key={c} className="border border-line px-2 py-1 text-left font-semibold text-ink-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ mode, label }) => {
                const cells = view === "behavior" ? BEHAVIOR[mode] : CAPS[mode];
                const isActive = mode === active;
                return (
                  <tr
                    key={mode}
                    className={isActive ? "bg-orange-soft font-semibold" : "bg-white"}
                  >
                    <td className="border border-line px-2 py-1">{label}</td>
                    {cells.map((cell, i) => (
                      <td key={i} className="border border-line px-2 py-1 text-ink-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/LessonPanel.tsx
git commit -m "feat(ui): collapsible lesson panel (behavior + capabilities)"
```

---

## Task 10: MemoryPanel — optional SKILL section

**Files:**
- Modify: `components/MemoryPanel.tsx`

- [ ] **Step 1: Add the `showSkill` prop**

Replace the entire contents of `components/MemoryPanel.tsx` with:

```typescript
"use client";

type Props = {
  claudeMd: string;
  skillMd: string;
  showSkill?: boolean;
};

export function MemoryPanel({ claudeMd, skillMd, showSkill = true }: Props) {
  return (
    <aside className="space-y-4 border-l border-line bg-[#fafafa] p-4 text-xs">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
          📁 memory/CLAUDE.md
        </h4>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-white p-2 font-mono text-[10px] leading-relaxed text-ink-2">
          {claudeMd || "(empty — no facts yet)"}
        </pre>
      </section>
      {showSkill && (
        <section>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
            📋 skills/research/SKILL.md
          </h4>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-white p-2 font-mono text-[10px] leading-relaxed text-ink-2">
            {skillMd || "(empty)"}
          </pre>
        </section>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/MemoryPanel.tsx
git commit -m "feat(ui): MemoryPanel optional SKILL section"
```

---

## Task 11: page.tsx — tabs, histories, lesson panel, new-session

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `app/page.tsx` with:

```typescript
"use client";

import { useEffect, useState } from "react";
import { ChatPane, type ChatMessage } from "@/components/ChatPane";
import { MemoryPanel } from "@/components/MemoryPanel";
import { LessonPanel, type Mode } from "@/components/LessonPanel";

const TABS: { id: Mode; label: string; hint: string; banner: string; tone: "warn" | "ok"; lessonOpen: boolean }[] = [
  {
    id: "llm",
    label: "LLM",
    hint: "no memory, no tools",
    banner:
      "⚠️ Stateless. Only the current message reaches the model — no prior turns, no tools, no persisted memory. Ask it something from earlier and it won't know.",
    tone: "warn",
    lessonOpen: true,
  },
  {
    id: "short-term",
    label: "+ Short-term",
    hint: "in-context transcript",
    banner:
      "💬 Short-term memory: the entire conversation transcript is replayed every turn. It remembers within this session — but press 🔄 New session and it forgets everything. No tools, no persisted store.",
    tone: "ok",
    lessonOpen: true,
  },
  {
    id: "long-term",
    label: "+ Long-term",
    hint: "persistent CLAUDE.md",
    banner:
      "✅ Long-term memory: no transcript is replayed, but memory/CLAUDE.md is injected into the system prompt every request. remember_fact writes durable facts. Press 🔄 New session — it still knows you, from disk.",
    tone: "ok",
    lessonOpen: true,
  },
  {
    id: "tools",
    label: "+ Tools",
    hint: "rag + web + browser",
    banner:
      "✓ Tools enabled (stateless): rag_search, web_search, browser_*. Grounded answers — but no memory of who you are or earlier turns.",
    tone: "ok",
    lessonOpen: false,
  },
  {
    id: "memory",
    label: "+ Tools + Memory",
    hint: "memory + skill + remember_fact",
    banner:
      "✓ Tools + Memory: everything from the Tools tab, plus the system prompt loads memory/CLAUDE.md and skills/research/SKILL.md every turn. The remember_fact tool persists user context.",
    tone: "ok",
    lessonOpen: false,
  },
];

const EMPTY_HISTORIES: Record<Mode, ChatMessage[]> = {
  llm: [], "short-term": [], "long-term": [], tools: [], memory: [],
};

export default function Home() {
  const [active, setActive] = useState<Mode>("llm");
  const [histories, setHistories] = useState<Record<Mode, ChatMessage[]>>(EMPTY_HISTORIES);
  const [loading, setLoading] = useState(false);
  const [mem, setMem] = useState({ claudeMd: "", skillMd: "" });

  const activeTab = TABS.find((t) => t.id === active)!;
  const showPanel = active === "long-term" || active === "memory";

  async function refreshMemory() {
    try {
      const res = await fetch("/api/memory");
      if (res.ok) setMem(await res.json());
    } catch {}
  }

  useEffect(() => {
    if (showPanel) refreshMemory();
  }, [active, showPanel]);

  function newSession() {
    setHistories((h) => ({ ...h, [active]: [] }));
  }

  async function handleSend(text: string) {
    const next = [...histories[active], { role: "user", content: text } as ChatMessage];
    setHistories({ ...histories, [active]: next });
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: active, messages: next }),
      });
      const data = await res.json();
      const reply: ChatMessage = {
        role: "assistant",
        content: data.content ?? "(no reply)",
        traces: data.traces,
        stickies: data.stickies,
      };
      setHistories((h) => ({ ...h, [active]: [...next, reply] }));
      if (showPanel) refreshMemory();
    } catch (err) {
      setHistories((h) => ({
        ...h,
        [active]: [...next, { role: "assistant", content: `Error: ${(err as Error).message}` }],
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-screen-2xl p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange font-bold text-white">✻</div>
        <h1 className="text-base font-semibold">Competitor Research Agent — Agentic AI PM Course</h1>
      </header>

      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex border-b border-line px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "flex flex-col items-start border-b-2 px-4 py-2 text-left transition " +
                (active === t.id
                  ? "border-orange text-ink"
                  : "border-transparent text-ink-3 hover:text-ink-2")
              }
            >
              <span className={"text-sm " + (active === t.id ? "font-semibold" : "")}>{t.label}</span>
              <span className="text-[10px] text-ink-3">{t.hint}</span>
            </button>
          ))}
        </div>

        <LessonPanel key={active} active={active} defaultOpen={activeTab.lessonOpen} />

        <div
          className={
            "flex items-center gap-3 px-6 py-3 text-xs leading-relaxed " +
            (activeTab.tone === "warn"
              ? "border-b border-orange-border bg-orange-soft text-ink-2"
              : "border-b border-line bg-[#fafafa] text-ink-2")
          }
        >
          <span className="flex-1">{activeTab.banner}</span>
          <button
            onClick={newSession}
            className="shrink-0 rounded-md border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:text-ink"
          >
            🔄 New session
          </button>
        </div>

        <div className={"h-[600px] " + (showPanel ? "grid grid-cols-[1fr_280px]" : "flex")}>
          <div className="flex flex-1 flex-col p-6">
            <ChatPane messages={histories[active]} loading={loading} onSend={handleSend} />
          </div>
          {showPanel && (
            <MemoryPanel
              claudeMd={mem.claudeMd}
              skillMd={mem.skillMd}
              showSkill={active === "memory"}
            />
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify typecheck + build pass**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; Next.js build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(ui): 5-tab ladder, lesson panel, new-session button"
```

---

## Task 12: Rewrite DEMO.md for the 5-tab ladder

**Files:**
- Modify: `DEMO.md`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `DEMO.md` with:

```markdown
# Demo script — Agentic AI PM course

Five tabs, a contrastive memory ladder. Each tab changes exactly one variable.
The collapsible **Lesson** panel at the top of every tab shows the same two
comparison tables (Behavior / Capabilities) with the current row highlighted.

## The headline: the 🔄 New session punchline

Run this two-turn script in **+ Short-term**, then in **+ Long-term**:

1. `My name is Aishwarya and I'm researching Luma AI.`
2. `What's my name, and what am I researching?`

Both recall it correctly. Now press **🔄 New session** in each tab and ask
turn 2 again:

| Tab | After 🔄 New session |
|---|---|
| **+ Short-term** | "I don't have that — this is a fresh conversation." Transcript was volatile; it died with the session. |
| **+ Long-term** | "You're Aishwarya, researching Luma AI." It re-read memory/CLAUDE.md from disk. Sticky: 📄 CLAUDE.md loaded (+ 💾 remember_fact on turn 1). |

That single contrast is the whole lesson: short-term = replayed transcript,
long-term = a persisted store re-injected every request.

---

## Tab 1 — LLM (stateless)

`What's my name?` after any earlier message → it cannot know. There is no
history and no memory; only the current message reaches the model.
Sticky: 🧠 **LLM only**.

## Tab 2 — + Short-term

The transcript is replayed every turn, so multi-turn conversation works.
Sticky every turn: 💬 **Short-term memory**. Press 🔄 → amnesia.

## Tab 3 — + Long-term

No transcript is replayed (each turn is a "fresh session"), but CLAUDE.md is
injected every request. State a durable fact → 💾 **remember_fact** writes it;
open the right-side panel to watch `## Known facts` grow. 🔄 does NOT wipe the
file — that is the point. No rag/web/browser here.

## Tab 4 — + Tools (stateless)

`What does our corpus say about Willow Voice's weaknesses?` → 🔧 `rag_search`.
`Open wisprflow.ai and screenshot the hero.` → 🔧 `browser_navigate` +
`browser_screenshot`. Grounded answers, but it has no memory of you or earlier
turns — ask a follow-up referencing a prior turn and it won't recall it.

## Tab 5 — + Tools + Memory (the capstone, unchanged)

Make `## Known facts` in `memory/CLAUDE.md` empty before starting.

1. `I need a competitor analysis for an AI dictation tool.` → scope question,
   no tools. Stickies: 📄 + 📘.
2. `Anchor on US enterprise legal teams; accuracy + on-device privacy; vs
   Wispr Flow and Superwhisper.` → 📄 + 📘 + 💾 remember_fact + 🔧 rag_search.
3. `What's the single strongest gap I can exploit against those two?` → uses
   persisted context, no re-scoping.

---

## Reset between demos

- **🔄 New session** (in-app button): clears the current tab's chat only.
  Does NOT touch CLAUDE.md.
- **Full reset of long-term memory:** open `memory/CLAUDE.md`, delete every
  bullet under `## Known facts` (keep the heading), reload the page.

## Sticky cheat sheet

| Icon | Kind | Meaning |
|---|---|---|
| 🧠 | LLM only | No memory, no tools. Training data only. |
| 💬 | Short-term | Full transcript replayed this turn. |
| 📄 | Memory | memory/CLAUDE.md injected into the system prompt this turn. |
| 📘 | Skill | skills/research/SKILL.md injected (capstone tab only). |
| 💾 | Persisted | remember_fact wrote a bullet to memory/CLAUDE.md. |
| 🔧 | Tool | A tool was called (Tools / capstone tabs only). |
```

- [ ] **Step 2: Commit**

```bash
git add DEMO.md
git commit -m "docs(demo): rewrite instructor script for 5-tab ladder"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: PASS — `stickies.test.ts` (incl. new short-term/long-term blocks), `rag.test.ts`, `memory.test.ts`, `tool-loop.test.ts` all green.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Manual demo walkthrough**

Run: `npm run dev`, then in the browser verify, per `DEMO.md`:
- All 5 tabs render; Lesson panel open on LLM/Short-term/Long-term, collapsed on Tools/Memory; active row highlighted; Behavior/Capabilities toggle works.
- LLM tab: a follow-up referencing an earlier turn is NOT recalled.
- Short-term: two-turn name script recalls; 🔄 New session → forgets.
- Long-term: two-turn script recalls; side panel shows CLAUDE.md updating; 🔄 New session → still recalls; no 🔧/📘 stickies ever appear; no SKILL section in the side panel.
- Tools: rag/browser stickies fire; no memory of earlier turns.
- Tools + Memory: byte-for-byte the old behavior (scope-first, SKILL, side panel with both files).

- [ ] **Step 4: Final commit (if any docs/notes changed during verification)**

```bash
git add -A && git commit -m "chore: memory ladder verification notes" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** ladder (Tasks 4–8,11), lesson panel dual tables + per-tab default (Task 9,11), unchanged visual/capstone (capstone handler untouched; Task 11 preserves styling), 🔄 new-session (Task 11), remember_fact framing / no 🔧/📘 in long-term (Tasks 1,7), stickies (Task 1), DEMO.md (Task 12), testing (Task 13). All spec sections mapped.
- **Non-goals respected:** no context inspector, no tab unlocking, no DB store, New session never resets CLAUDE.md (Task 11 `newSession` only clears React state).
- **Type consistency:** `Mode` defined once in `LessonPanel.tsx`, imported by `page.tsx`; mode strings (`"short-term"`, `"long-term"`) consistent across stickies union, route cases, handlers, TABS, histories.
- **Risk mitigations in plan:** statelessness regression handled by rewritten DEMO.md (Task 12) + manual checks (Task 13); long-term vs capstone confusion handled by distinct system prompts + Lesson panel rows; first-turn write timing handled by long-term system prompt rule 2.
```
