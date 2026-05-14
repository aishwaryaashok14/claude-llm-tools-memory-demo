# Research Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js teaching demo with three tabs (LLM / +Tools / +Tools+Memory) demonstrating how harness layers change LLM behavior, using the Wispr Flow competitive landscape as the domain. Ship both a working `demo/` and a TODO-stubbed `scaffold/` for students.

**Architecture:** Single Next.js 15 (App Router, TypeScript) app per theme. The three modes share one dispatcher route (`/api/chat`) and differ only in the Anthropic Messages API call shape — that's the teaching point. Tools include MiniSearch RAG over local corpus, Anthropic's built-in `web_search`, and Playwright wrapped as custom tools. Memory is a `CLAUDE.md` file read into the system prompt every turn, written to via a custom `remember_fact` tool. Reference spec: `docs/superpowers/specs/2026-05-14-research-frontend-design.md`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, `@anthropic-ai/sdk`, `minisearch`, `playwright`, `vitest`.

**Working directory for all tasks:** `/Users/aishwaryaashok/course-demo/`

---

## Phase 0 — Repo Setup

### Task 1: Clone the reference repo into `research-agent/`

**Files:**
- Create: `research-agent/` (cloned directory tree)

- [ ] **Step 1: Clone the reference repo as a non-git subtree**

Run from `course-demo/`:
```bash
git clone https://github.com/aishwaryaashok14/maven-workshop-research-agent.git research-agent
rm -rf research-agent/.git
```

Expected: `research-agent/` now contains the reference repo's files (CLAUDE.md, README.md, `.claude/`, `docs/`, `examples/`, `runs/`) without its own `.git/` dir, so it lives inside our repo.

- [ ] **Step 2: Verify the directory looks right**

Run: `ls research-agent/`
Expected output includes: `CLAUDE.md`, `README.md`, `.claude`, `docs`, `examples`, `runs`, `.mcp.json`, `.env.example`.

- [ ] **Step 3: Commit**

```bash
git add research-agent/
git commit -m "chore: copy maven-workshop-research-agent reference into research-agent/"
```

---

### Task 2: Initialize Next.js app at `research-frontend/demo/`

**Files:**
- Create: `research-frontend/demo/` (Next.js scaffold)

- [ ] **Step 1: Run create-next-app non-interactively**

Run from `course-demo/`:
```bash
mkdir -p research-frontend
cd research-frontend
npx --yes create-next-app@latest demo \
  --typescript --tailwind --app --src-dir=false \
  --import-alias='@/*' --use-npm --no-eslint --no-turbopack --skip-install
cd ../..
```

Expected: `research-frontend/demo/package.json`, `research-frontend/demo/app/page.tsx`, `research-frontend/demo/tailwind.config.ts`, etc. exist.

- [ ] **Step 2: Verify the scaffold**

Run: `ls research-frontend/demo/`
Expected: `app/`, `public/`, `package.json`, `tailwind.config.ts`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`.

- [ ] **Step 3: Commit**

```bash
git add research-frontend/
git commit -m "feat: scaffold Next.js 15 app at research-frontend/demo/"
```

---

### Task 3: Install runtime dependencies

**Files:**
- Modify: `research-frontend/demo/package.json`

- [ ] **Step 1: Install runtime deps**

Run from `research-frontend/demo/`:
```bash
npm install @anthropic-ai/sdk minisearch playwright
```

Expected: `package.json` `dependencies` now includes `@anthropic-ai/sdk`, `minisearch`, `playwright`.

- [ ] **Step 2: Install Chromium for Playwright**

Run:
```bash
npx playwright install chromium
```

Expected: Chromium binary downloaded (~150MB). Console message: "Chromium ... downloaded".

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/package.json research-frontend/demo/package-lock.json
git commit -m "feat: install anthropic-sdk, minisearch, playwright deps"
```

---

### Task 4: Install dev dependencies and configure Vitest

**Files:**
- Modify: `research-frontend/demo/package.json` (add `test` script)
- Create: `research-frontend/demo/vitest.config.ts`

- [ ] **Step 1: Install Vitest and test deps**

Run from `research-frontend/demo/`:
```bash
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Create `vitest.config.ts`**

File: `research-frontend/demo/vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

Modify `research-frontend/demo/package.json` `scripts` block — add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet → exits 0 with "No test files found")**

Run: `npm test`
Expected: Exits successfully with message like "No test files found".

- [ ] **Step 5: Commit**

```bash
git add research-frontend/demo/package.json research-frontend/demo/package-lock.json research-frontend/demo/vitest.config.ts
git commit -m "feat: configure vitest for unit tests"
```

---

### Task 5: Configure Tailwind with the design palette + create env example

**Files:**
- Modify: `research-frontend/demo/tailwind.config.ts`
- Modify: `research-frontend/demo/app/globals.css` (add CSS vars + reset)
- Create: `research-frontend/demo/.env.example`

- [ ] **Step 1: Replace `tailwind.config.ts` with palette**

File: `research-frontend/demo/tailwind.config.ts`
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: { DEFAULT: "#d97757", soft: "#fef7f2", border: "#f0d4c1" },
        ink: { DEFAULT: "#1a1a1a", 2: "#4a4a4a", 3: "#888888" },
        line: "#ececec",
      },
      fontFamily: {
        sans: ["-apple-system", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Replace `app/globals.css`**

File: `research-frontend/demo/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { background: #ffffff; color: #1a1a1a; }
body { font-family: -apple-system, "Inter", system-ui, sans-serif; }
```

- [ ] **Step 3: Create `.env.example`**

File: `research-frontend/demo/.env.example`
```
# Required — used by all three modes
ANTHROPIC_API_KEY=

# Optional — only for Exercise 4 stretch (local embeddings)
VOYAGE_API_KEY=

# Optional — only for Exercise 5 stretch (managed RAG)
TRAVERSAAL_API_KEY=
```

- [ ] **Step 4: Verify dev server still boots**

Run from `research-frontend/demo/`: `npm run dev` (Ctrl+C after seeing "Ready").
Expected: Server boots without errors.

- [ ] **Step 5: Commit**

```bash
git add research-frontend/demo/tailwind.config.ts research-frontend/demo/app/globals.css research-frontend/demo/.env.example
git commit -m "feat: configure tailwind palette + env example"
```

---

## Phase 1 — UI Shell

### Task 6: Build the three-tab layout in `app/page.tsx`

**Files:**
- Modify: `research-frontend/demo/app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

File: `research-frontend/demo/app/page.tsx`
```tsx
"use client";

import { useState } from "react";

type Mode = "llm" | "tools" | "memory";

const TABS: { id: Mode; label: string }[] = [
  { id: "llm", label: "LLM" },
  { id: "tools", label: "+ Tools" },
  { id: "memory", label: "+ Tools + Memory" },
];

export default function Home() {
  const [active, setActive] = useState<Mode>("llm");

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange font-bold text-white">✻</div>
        <h1 className="text-base font-semibold">Research Assistant — Wispr Flow workshop</h1>
      </header>

      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex border-b border-line px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "border-b-2 px-4 py-3 text-sm transition " +
                (active === t.id
                  ? "border-orange font-semibold text-ink"
                  : "border-transparent text-ink-3 hover:text-ink-2")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-[420px] p-6 text-sm text-ink-3">
          Tab placeholder: <strong>{active}</strong>. Chat UI lands in Task 7.
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify dev server renders the tab strip**

Run from `research-frontend/demo/`: `npm run dev`, open http://localhost:3000.
Expected: Three tabs visible. Clicking each updates the placeholder text. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/app/page.tsx
git commit -m "feat: render three-tab layout with state"
```

---

### Task 7: Build `ChatPane` component

**Files:**
- Create: `research-frontend/demo/components/ChatPane.tsx`

- [ ] **Step 1: Create the component**

File: `research-frontend/demo/components/ChatPane.tsx`
```tsx
"use client";

import { FormEvent, useState } from "react";

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; traces?: string[] };

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
};

export function ChatPane({ messages, loading, onSend }: Props) {
  const [draft, setDraft] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1">
        {messages.length === 0 && (
          <p className="text-ink-3">Ask about Wispr Flow's competitive landscape to begin.</p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] rounded-xl border border-orange-border bg-orange-soft px-3 py-2"
            >
              <strong>You:</strong> {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[85%] space-y-2">
              {m.traces?.map((t, j) => (
                <div
                  key={j}
                  className="rounded-lg border border-dashed border-orange-border bg-[#fffaf4] px-3 py-2 font-mono text-xs text-ink-2"
                  dangerouslySetInnerHTML={{ __html: t }}
                />
              ))}
              <div className="rounded-xl border border-line bg-white px-3 py-2">
                <strong>Assistant:</strong> {m.content}
              </div>
            </div>
          ),
        )}
        {loading && <p className="text-ink-3">…thinking</p>}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-line pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded-xl border border-line px-3 py-2 text-sm focus:border-orange focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Wire `ChatPane` into `app/page.tsx`**

Replace `app/page.tsx` (full file):
```tsx
"use client";

import { useState } from "react";
import { ChatPane, type ChatMessage } from "@/components/ChatPane";

type Mode = "llm" | "tools" | "memory";

const TABS: { id: Mode; label: string }[] = [
  { id: "llm", label: "LLM" },
  { id: "tools", label: "+ Tools" },
  { id: "memory", label: "+ Tools + Memory" },
];

export default function Home() {
  const [active, setActive] = useState<Mode>("llm");
  const [histories, setHistories] = useState<Record<Mode, ChatMessage[]>>({
    llm: [], tools: [], memory: [],
  });
  const [loading, setLoading] = useState(false);

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
      };
      setHistories((h) => ({ ...h, [active]: [...next, reply] }));
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
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange font-bold text-white">✻</div>
        <h1 className="text-base font-semibold">Research Assistant — Wispr Flow workshop</h1>
      </header>

      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex border-b border-line px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "border-b-2 px-4 py-3 text-sm transition " +
                (active === t.id
                  ? "border-orange font-semibold text-ink"
                  : "border-transparent text-ink-3 hover:text-ink-2")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-[440px] p-6">
          <ChatPane
            messages={histories[active]}
            loading={loading}
            onSend={handleSend}
          />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify the chat UI renders (it'll 404 on submit until Task 11; just verify layout)**

Run: `npm run dev`, open http://localhost:3000. Type a message; expect "Error: …" reply (no `/api/chat` yet). Layout should look right. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add research-frontend/demo/components/ChatPane.tsx research-frontend/demo/app/page.tsx
git commit -m "feat: ChatPane component + per-tab history state"
```

---

### Task 8: Build `MemoryPanel` component (used only on Tab 3, but shipped now)

**Files:**
- Create: `research-frontend/demo/components/MemoryPanel.tsx`

- [ ] **Step 1: Create the component**

File: `research-frontend/demo/components/MemoryPanel.tsx`
```tsx
"use client";

type Props = {
  claudeMd: string;
  skillMd: string;
};

export function MemoryPanel({ claudeMd, skillMd }: Props) {
  return (
    <aside className="space-y-4 border-l border-line bg-[#fafafa] p-4 text-xs">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
          📁 memory/CLAUDE.md
        </h4>
        <pre className="overflow-x-auto rounded-md border border-line bg-white p-2 font-mono text-[10px] leading-relaxed text-ink-2">
          {claudeMd || "(empty — no facts yet)"}
        </pre>
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
          📋 skills/research/SKILL.md
        </h4>
        <pre className="overflow-x-auto rounded-md border border-line bg-white p-2 font-mono text-[10px] leading-relaxed text-ink-2">
          {skillMd || "(empty)"}
        </pre>
      </section>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add research-frontend/demo/components/MemoryPanel.tsx
git commit -m "feat: MemoryPanel component for Tab 3 right rail"
```

---

## Phase 2 — Tab 1 (LLM only) End-to-End

### Task 9: Create `lib/anthropic.ts` SDK client

**Files:**
- Create: `research-frontend/demo/lib/anthropic.ts`

- [ ] **Step 1: Create the SDK wrapper**

File: `research-frontend/demo/lib/anthropic.ts`
```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";
```

- [ ] **Step 2: Commit**

```bash
git add research-frontend/demo/lib/anthropic.ts
git commit -m "feat: shared Anthropic SDK client"
```

---

### Task 10: Create the `/api/chat` dispatcher route

**Files:**
- Create: `research-frontend/demo/app/api/chat/route.ts`

- [ ] **Step 1: Create the dispatcher**

File: `research-frontend/demo/app/api/chat/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { runLlmOnly } from "./modes/llm-only";

export const runtime = "nodejs"; // needed for Playwright + fs in later modes

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
```

- [ ] **Step 2: Commit**

```bash
git add research-frontend/demo/app/api/chat/route.ts
git commit -m "feat: /api/chat dispatcher with placeholder for tools/memory modes"
```

---

### Task 11: Implement `llm-only` mode

**Files:**
- Create: `research-frontend/demo/app/api/chat/modes/llm-only.ts`

- [ ] **Step 1: Create the mode handler**

File: `research-frontend/demo/app/api/chat/modes/llm-only.ts`
```ts
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
```

- [ ] **Step 2: Verify the LLM-only flow end-to-end**

Run `npm run dev`, open http://localhost:3000. With Tab 1 (`LLM`) active, ask: *"Who are Wispr Flow's main competitors?"*
Expected: A response from Claude, likely admitting uncertainty about Wispr Flow specifically, possibly inventing plausible-sounding competitor names. **No tool traces** appear. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/app/api/chat/modes/llm-only.ts
git commit -m "feat: Tab 1 — bare Anthropic Messages call (no tools, no memory)"
```

---

## Phase 3 — Corpus + RAG Library

### Task 12: Create the five corpus markdown files

**Files:**
- Create: `research-frontend/demo/corpus/wispr-flow.md`
- Create: `research-frontend/demo/corpus/superwhisper.md`
- Create: `research-frontend/demo/corpus/aqua-voice.md`
- Create: `research-frontend/demo/corpus/voiceink.md`
- Create: `research-frontend/demo/corpus/willow-voice.md`

> **Why:** These are the documents `rag_search` will retrieve from. Each is a short positioning brief modeled on the reference repo's Wispr Flow example.

- [ ] **Step 1: `corpus/wispr-flow.md`**

```markdown
# Wispr Flow

## Positioning
AI-powered voice dictation built for knowledge workers and developers using
modern AI coding tools. Hero claim: "Type at the speed of thought."

## Target customer
Power users on macOS who already work with Cursor, Claude Code, ChatGPT — people
who want voice to be a first-class input to AI agents and IDEs.

## Pricing
- Free: limited monthly minutes
- Pro: $15/month for unlimited dictation
- Teams pricing on request

## Differentiators
- Tight integration with AI tools (Cursor, Claude Code, ChatGPT, Linear)
- Inline editing — speak corrections, model adjusts text in place
- Mac-first; iOS companion in beta

## Weaknesses (from user reports)
- No offline mode
- Windows / Linux support is roadmap, not shipped
- iOS app still beta, occasional drift on long dictations

## Source date
2026-04
```

- [ ] **Step 2: `corpus/superwhisper.md`**

```markdown
# Superwhisper

## Positioning
Local AI voice-to-text for Mac, Windows, and iOS power users. Emphasizes
offline capability and ownership of the transcription model.

## Target customer
Privacy-conscious individuals; users with unreliable internet; people who
want lifetime pricing and full local control.

## Pricing
- Free: limited
- Pro: ~$8.49/month or $84.99/year
- Lifetime: $249.99 one-time

## Differentiators
- Fully offline transcription option (on-device Whisper model)
- Multi-platform (Mac, Windows, iOS)
- Lifetime license tier — uncommon in the space

## Weaknesses (from user reports)
- Steep configuration curve; many settings expose technical concepts
- User-submitted feature requests sit unaddressed for months
- UI feels developer-oriented, not consumer-polished

## Source date
2026-04
```

- [ ] **Step 3: `corpus/aqua-voice.md`**

```markdown
# Aqua Voice

## Positioning
Context-aware dictation powered by a proprietary speech model called Avalon.
Markets fast startup and high accuracy on jargon-heavy speech.

## Target customer
Knowledge workers, founders, technical professionals who do a lot of
short-form dictation (Slack, email, docs).

## Pricing
- Free: limited minutes
- Pro: starts at $8/month billed annually
- Team plans available

## Differentiators
- Proprietary Avalon speech model — not Whisper-based
- ~50ms cold-start to capture
- Strong context awareness — picks up domain vocabulary fast

## Weaknesses (from user reports)
- No offline mode — frequently cited limitation (12+ mentions)
- macOS only at launch
- Pricing transparency for teams is limited

## Source date
2026-04
```

- [ ] **Step 4: `corpus/voiceink.md`**

```markdown
# VoiceInk

## Positioning
Open-source, privacy-first voice dictation for Mac. GPL v3 licensed. Markets
itself as the auditable alternative to closed-source dictation tools.

## Target customer
Open-source enthusiasts, privacy-focused individuals, Mac developers who want
one-time pricing and inspectable code.

## Pricing
- One-time: $25–$49 depending on tier
- No subscription

## Differentiators
- GPL v3 open-source — fully auditable
- On-device processing only
- One-time pricing (no subscription)

## Weaknesses (from user reports)
- iOS companion app has reliability issues
- No IDE integration (no Cursor/VS Code plugin)
- Documentation gaps for non-technical users

## Source date
2026-04
```

- [ ] **Step 5: `corpus/willow-voice.md`**

```markdown
# Willow Voice

## Positioning
Context-aware dictation with mid-sentence correction. Markets to knowledge
workers and the healthcare vertical (HIPAA-aware messaging).

## Target customer
Knowledge workers; healthcare professionals doing documentation; users who
correct themselves mid-thought.

## Pricing
- Pro: $12/month
- Team pricing on request
- No free tier (trial only)

## Differentiators
- Mid-sentence correction that re-runs transcription as you speak
- Healthcare-oriented messaging (HIPAA awareness referenced; not certified)
- iOS keyboard with voice-first UX

## Weaknesses (from user reports)
- iOS keyboard UX has friction complaints (autocorrect collisions)
- No offline mode
- HIPAA messaging may overstate certification level

## Source date
2026-04
```

- [ ] **Step 6: Commit**

```bash
git add research-frontend/demo/corpus/
git commit -m "feat: add 5-doc Wispr Flow competitive corpus for RAG"
```

---

### Task 13: Write failing test for `lib/rag.ts`

**Files:**
- Create: `research-frontend/demo/lib/rag.test.ts`

- [ ] **Step 1: Write the test**

File: `research-frontend/demo/lib/rag.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { ragSearch } from "./rag";

describe("ragSearch", () => {
  it("returns chunks from the wispr flow doc for a Wispr Flow query", async () => {
    const results = await ragSearch("Wispr Flow pricing");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toMatch(/wispr-flow/);
  });

  it("returns chunks from multiple sources for a generic competitor query", async () => {
    const results = await ragSearch("competitor pricing");
    const sources = new Set(results.map((r) => r.source));
    expect(sources.size).toBeGreaterThan(1);
  });

  it("returns the open-source brief for a license query", async () => {
    const results = await ragSearch("open source GPL");
    expect(results.some((r) => r.source.includes("voiceink"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL (module not found)**

Run from `research-frontend/demo/`: `npm test`
Expected: `Cannot find module './rag'` or similar.

---

### Task 14: Implement `lib/rag.ts` with MiniSearch

**Files:**
- Create: `research-frontend/demo/lib/rag.ts`

- [ ] **Step 1: Create the retriever**

File: `research-frontend/demo/lib/rag.ts`
```ts
import MiniSearch from "minisearch";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type RagChunk = {
  id: string;
  source: string;
  heading: string;
  content: string;
};

let cached: { index: MiniSearch<RagChunk>; chunks: RagChunk[] } | null = null;

async function buildIndex() {
  const dir = path.join(process.cwd(), "corpus");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));

  const chunks: RagChunk[] = [];
  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf-8");
    const sections = text.split(/^##\s+/m); // first section is the H1 header
    for (let i = 1; i < sections.length; i++) {
      const lines = sections[i].split("\n");
      const heading = (lines.shift() ?? "").trim();
      const content = lines.join("\n").trim();
      chunks.push({
        id: `${file}#${heading.toLowerCase().replace(/\s+/g, "-")}`,
        source: file,
        heading,
        content,
      });
    }
  }

  const index = new MiniSearch<RagChunk>({
    fields: ["heading", "content", "source"],
    storeFields: ["source", "heading", "content"],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { heading: 2 } },
  });
  index.addAll(chunks);

  return { index, chunks };
}

export async function ragSearch(query: string, limit = 3): Promise<RagChunk[]> {
  cached ??= await buildIndex();
  const hits = cached.index.search(query, { boost: { heading: 2 } }).slice(0, limit);
  return hits.map((h) => cached!.chunks.find((c) => c.id === h.id)!).filter(Boolean);
}
```

- [ ] **Step 2: Run the test — expect PASS**

Run: `npm test`
Expected: All 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/lib/rag.ts research-frontend/demo/lib/rag.test.ts
git commit -m "feat: MiniSearch-based ragSearch over corpus/ + tests"
```

---

## Phase 4 — Tab 2 (Tools)

### Task 15: Define tool schemas in `lib/tools.ts`

**Files:**
- Create: `research-frontend/demo/lib/tools.ts`

- [ ] **Step 1: Create the tool schema module**

File: `research-frontend/demo/lib/tools.ts`
```ts
import type Anthropic from "@anthropic-ai/sdk";

export const ragSearchTool: Anthropic.Tool = {
  name: "rag_search",
  description:
    "Search the local Wispr Flow / dictation-space corpus for relevant chunks. Use FIRST for any question about known competitors or their positioning, pricing, weaknesses.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural-language query." },
      limit: { type: "number", description: "Max chunks to return (default 3)." },
    },
    required: ["query"],
  },
};

export const webSearchTool = {
  type: "web_search_20250305" as const,
  name: "web_search",
  max_uses: 5,
};

export const browserNavigateTool: Anthropic.Tool = {
  name: "browser_navigate",
  description:
    "Open a URL in a headless browser and return its text content. Use when you need fresh data, JS-rendered pages, or content not in the corpus.",
  input_schema: {
    type: "object",
    properties: { url: { type: "string" } },
    required: ["url"],
  },
};

export const browserScreenshotTool: Anthropic.Tool = {
  name: "browser_screenshot",
  description: "Take a screenshot of the most recently navigated page. Returns a data URL.",
  input_schema: { type: "object", properties: {} },
};

export const browserClickTool: Anthropic.Tool = {
  name: "browser_click",
  description: "Click an element by visible text on the current page, then return updated content.",
  input_schema: {
    type: "object",
    properties: { text: { type: "string", description: "Visible text of the target element." } },
    required: ["text"],
  },
};

export const rememberFactTool: Anthropic.Tool = {
  name: "remember_fact",
  description:
    "Persist a single short sentence to memory/CLAUDE.md when the user reveals something durable about their research focus, constraints, or strategic angle. Follow the persistence rules in CLAUDE.md. Do NOT use for small talk or query phrasing.",
  input_schema: {
    type: "object",
    properties: { fact: { type: "string", description: "One sentence to persist." } },
    required: ["fact"],
  },
};

export const toolsForToolsMode: (Anthropic.Tool | typeof webSearchTool)[] = [
  ragSearchTool,
  webSearchTool,
  browserNavigateTool,
  browserScreenshotTool,
  browserClickTool,
];

export const toolsForMemoryMode = [...toolsForToolsMode, rememberFactTool];
```

- [ ] **Step 2: Commit**

```bash
git add research-frontend/demo/lib/tools.ts
git commit -m "feat: tool schemas for rag_search, web_search, browser_*, remember_fact"
```

---

### Task 16: Create `lib/playwright.ts` — shared browser instance

**Files:**
- Create: `research-frontend/demo/lib/playwright.ts`

- [ ] **Step 1: Create the browser singleton**

File: `research-frontend/demo/lib/playwright.ts`
```ts
import { chromium, type Browser, type Page } from "playwright";

let browser: Browser | null = null;
let currentPage: Page | null = null;

export async function getPage(): Promise<Page> {
  if (!browser) browser = await chromium.launch({ headless: true });
  if (!currentPage || currentPage.isClosed()) currentPage = await browser.newPage();
  return currentPage;
}

export async function navigate(url: string): Promise<string> {
  const page = await getPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(500); // small settle for SPAs
  // Return readable content rather than raw HTML
  return (await page.evaluate(() => document.body.innerText)).slice(0, 8000);
}

export async function clickByText(text: string): Promise<string> {
  const page = await getPage();
  await page.getByText(text, { exact: false }).first().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  return (await page.evaluate(() => document.body.innerText)).slice(0, 8000);
}

export async function screenshot(): Promise<string> {
  const page = await getPage();
  const buf = await page.screenshot({ type: "png", fullPage: false });
  return `data:image/png;base64,${buf.toString("base64")}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add research-frontend/demo/lib/playwright.ts
git commit -m "feat: shared Playwright browser singleton + helpers"
```

---

### Task 17: Write failing test for tool-loop executor

**Files:**
- Create: `research-frontend/demo/lib/tool-loop.test.ts`

- [ ] **Step 1: Write the test**

File: `research-frontend/demo/lib/tool-loop.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { executeToolUse } from "./tool-loop";

describe("executeToolUse", () => {
  it("routes rag_search calls to ragSearch", async () => {
    const result = await executeToolUse({
      name: "rag_search",
      input: { query: "Wispr Flow" },
    });
    expect(typeof result).toBe("string");
    expect(result.toLowerCase()).toContain("wispr");
  });

  it("returns an error string for unknown tools instead of throwing", async () => {
    const result = await executeToolUse({
      name: "nonexistent_tool",
      input: {},
    });
    expect(result).toMatch(/unknown/i);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

Run: `npm test`
Expected: `Cannot find module './tool-loop'`.

---

### Task 18: Implement `lib/tool-loop.ts`

**Files:**
- Create: `research-frontend/demo/lib/tool-loop.ts`

- [ ] **Step 1: Create the executor**

File: `research-frontend/demo/lib/tool-loop.ts`
```ts
import { ragSearch } from "./rag";
import { navigate, clickByText, screenshot } from "./playwright";
import { appendFact } from "./memory"; // implemented in Task 23 — safe to import here, the binding only resolves at call time

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
```

- [ ] **Step 2: Run tests — `tool-loop.test.ts` should now pass; `memory` import is unresolved**

This task is in a transitional state because `appendFact` doesn't exist yet. Add a temporary stub to unblock testing:

Create file `research-frontend/demo/lib/memory.ts` with just:
```ts
export async function appendFact(_fact: string): Promise<void> {
  throw new Error("memory.appendFact not implemented yet — see Task 23");
}
```

Run: `npm test`
Expected: tool-loop tests PASS (they don't exercise `remember_fact`).

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/lib/tool-loop.ts research-frontend/demo/lib/tool-loop.test.ts research-frontend/demo/lib/memory.ts
git commit -m "feat: executeToolUse dispatcher with rag/browser tools (memory stub)"
```

---

### Task 19: Implement `llm-tools` mode

**Files:**
- Create: `research-frontend/demo/app/api/chat/modes/llm-tools.ts`
- Modify: `research-frontend/demo/app/api/chat/route.ts`

- [ ] **Step 1: Create the mode handler**

File: `research-frontend/demo/app/api/chat/modes/llm-tools.ts`
```ts
import { anthropic, MODEL } from "@/lib/anthropic";
import { toolsForToolsMode } from "@/lib/tools";
import { executeToolUse, formatTrace } from "@/lib/tool-loop";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/components/ChatPane";

const MAX_ITERATIONS = 6;

const SYSTEM = `You are a research assistant for the dictation / voice-AI space.
Use tools to ground every claim in real data.

Tool priority: rag_search first (the local corpus is curated). web_search for fresh news
or competitors not in the corpus. browser_navigate / browser_click only when you need
stateful UI or JS-rendered content.`;

export async function runLlmTools(messages: ChatMessage[]) {
  const traces: string[] = [];
  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      tools: toolsForToolsMode as Anthropic.ToolUnion[],
      messages: apiMessages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { content: text, traces };
    }

    // Echo assistant response (with tool_use blocks) back
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
```

- [ ] **Step 2: Wire it into the dispatcher**

Modify `research-frontend/demo/app/api/chat/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { runLlmOnly } from "./modes/llm-only";
import { runLlmTools } from "./modes/llm-tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { mode, messages } = await req.json();
  try {
    switch (mode) {
      case "llm":
        return NextResponse.json(await runLlmOnly(messages));
      case "tools":
        return NextResponse.json(await runLlmTools(messages));
      case "memory":
        return NextResponse.json({ content: `Mode 'memory' not yet wired.`, traces: [] });
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Verify Tab 2 manually**

Run: `npm run dev`. Switch to Tab 2 (`+ Tools`). Ask: *"Who are Wispr Flow's main competitors?"*
Expected: Yellow tool-trace boxes appear (showing `rag_search(...)`), followed by an answer that names Superwhisper, Aqua Voice, VoiceInk, Willow Voice with details drawn from the corpus. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add research-frontend/demo/app/api/chat/modes/llm-tools.ts research-frontend/demo/app/api/chat/route.ts
git commit -m "feat: Tab 2 — tool_use loop with rag_search, web_search, browser tools"
```

---

## Phase 5 — Tab 3 (Memory)

### Task 20: Ship `memory/CLAUDE.md` and `skills/research/SKILL.md` starter content

**Files:**
- Create: `research-frontend/demo/memory/CLAUDE.md`
- Create: `research-frontend/demo/skills/research/SKILL.md`

- [ ] **Step 1: Create `memory/CLAUDE.md`** (verbatim from spec §6.1)

File: `research-frontend/demo/memory/CLAUDE.md`
```markdown
# User context

This file is the assistant's persistent memory across the conversation. The
system prompt loads it at the start of every turn. The `remember_fact` tool
appends to the "Known facts" section.

## How to update this file (rules for the assistant)

**Do:**
- Persist user goals, constraints, and stated preferences
- Persist competitors / products the user has already researched so we don't repeat ourselves
- Update an existing fact rather than appending a contradictory one
- Keep each fact atomic — one bullet, one claim, falsifiable

**Don't:**
- Persist trivia ("user said hi"), small talk, or one-off observations
- Persist anything private (emails, names, secrets) without explicit user confirmation
- Re-state what's already here in different words
- Persist guesses or inferences — only what the user has stated or what tools have confirmed

## Known facts

_(this section grows over the conversation)_
```

- [ ] **Step 2: Create `skills/research/SKILL.md`** (verbatim from spec §6.2)

File: `research-frontend/demo/skills/research/SKILL.md`
```markdown
# Research procedure

You are a competitor-research assistant for the dictation / voice-AI space.
Follow this procedure for every research question.

## Tool selection

| Task | Reach for |
|---|---|
| Find known competitor facts | `rag_search` (corpus is curated) |
| Get fresh or dated info | `web_search` (Anthropic built-in, indexed) |
| See SPA-rendered pricing, click a toggle, take a screenshot | `browser_*` (Playwright wrappers) |
| Persist a fact learned about the user | `remember_fact` (only when worth keeping) |

**Default principle:** start with `rag_search`. Reach for `web_search` only if
the corpus is silent. Reach for `browser_*` only if the page is stateful
(SPA, form, interactive). Built-ins first; heavy tools last.

## Procedure

### Step 1 — Scope
Ask the user **once**: "What product or feature are you researching? Who is
it for?" Skip if they already said. Cap at 2 clarifying questions.

### Step 2 — Identify competitors
`rag_search` first. If the corpus is silent, fall back to `web_search`. List
the competitors back briefly so the user can correct the set.

### Step 3 — Per competitor, gather
- Positioning (verbatim hero / subhead if available)
- Pricing (cite source URL; use `browser_*` only if SPA-rendered)
- Differentiators (plain English, not marketing-speak)
- Weaknesses (recurring patterns, ≥3 confirming mentions)

### Step 4 — Synthesize per-competitor cards
Exactly **6 bullets** per competitor:

\`\`\`
### [Competitor Name]
- **Positioning**: one sentence (their words, plain English)
- **Target customer**: who they're built for
- **Pricing**: tiers and price points, or "Not public"
- **Differentiators**: 2–3 things they do well
- **Weaknesses**: 1–2 recurring complaints from reviews / forums
- **Source date**: most recent source pulled (YYYY-MM)
\`\`\`

Hard rules:
- 6 bullets exactly. If a bullet is empty, write "—" but keep the line.
- Pricing must cite a source URL inline if public.
- No marketing language in your translation.

### Step 5 — Gap Analysis
Add this section verbatim:

\`\`\`
### Gap Analysis
- **What no competitor does well**: [specific capability gap]
- **Where pricing is underserved**: [a tier or model nobody offers]
- **Unclaimed positioning angle**: [a frame nobody owns]
\`\`\`

Each gap must be **falsifiable** — grounded in something a reader can verify.
"Better UX" is not a gap. "No competitor offers per-seat pricing under
$10/mo for teams under 5" is.

### Step 6 — Close
End with exactly one line:

> **Based on this, which gap are you trying to own?**

No summary. No "let me know if you want more." Just the question.

## Do
- ✅ Use `rag_search` first — it's curated, cheap, and deterministic
- ✅ Quote pricing verbatim with a source URL
- ✅ When the user reveals a new angle, segment, or constraint they care about, call `remember_fact`
- ✅ Acknowledge limits — say "the corpus is silent on X" rather than inventing
- ✅ Update a fact in CLAUDE.md instead of appending a contradictory one

## Don't
- ❌ Invent pricing or details when sources are vague
- ❌ Open a browser when `rag_search` or `web_search` would have sufficed (slow + expensive)
- ❌ Add a 7th bullet "for completeness"
- ❌ Write a closing paragraph after the sharp question
- ❌ Call `remember_fact` for trivia ("user said hi") or one-off observations
- ❌ Re-state CLAUDE.md facts back to the user verbatim — assume they remember
- ❌ Use `browser_*` for tasks `web_search` could have handled (~5–10× slower)
```

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/memory/ research-frontend/demo/skills/
git commit -m "feat: ship CLAUDE.md memory template + SKILL.md procedure"
```

---

### Task 21: Write failing test for `lib/memory.ts`

**Files:**
- Modify: `research-frontend/demo/lib/memory.ts` (stub from Task 18 will be replaced)
- Create: `research-frontend/demo/lib/memory.test.ts`

- [ ] **Step 1: Write the test**

File: `research-frontend/demo/lib/memory.test.ts`
```ts
import { afterEach, describe, it, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readMemory, appendFact } from "./memory";

const FILE = path.join(process.cwd(), "memory/CLAUDE.md");

let backup: string;

describe("memory", () => {
  afterEach(async () => {
    if (backup !== undefined) await writeFile(FILE, backup, "utf-8");
  });

  it("readMemory returns the file contents", async () => {
    backup = await readFile(FILE, "utf-8");
    const text = await readMemory();
    expect(text).toContain("User context");
  });

  it("appendFact adds a bullet to Known facts", async () => {
    backup = await readFile(FILE, "utf-8");
    await appendFact("the user is exploring the agent-voice-interface angle");
    const updated = await readFile(FILE, "utf-8");
    expect(updated).toMatch(/- the user is exploring the agent-voice-interface angle/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (current memory.ts throws or readMemory doesn't exist)**

Run: `npm test`
Expected: `readMemory is not exported` / `memory.appendFact not implemented yet`.

---

### Task 22: Implement `lib/memory.ts`

**Files:**
- Modify: `research-frontend/demo/lib/memory.ts`

- [ ] **Step 1: Replace the stub with the real implementation**

File: `research-frontend/demo/lib/memory.ts`
```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "memory/CLAUDE.md");
const SKILL = path.join(process.cwd(), "skills/research/SKILL.md");
const FACTS_MARKER = "## Known facts";

export async function readMemory(): Promise<string> {
  return await readFile(FILE, "utf-8");
}

export async function readSkill(): Promise<string> {
  return await readFile(SKILL, "utf-8");
}

export async function appendFact(fact: string): Promise<void> {
  const cleaned = fact.trim().replace(/^[-*]\s*/, "");
  const current = await readFile(FILE, "utf-8");
  const idx = current.indexOf(FACTS_MARKER);
  if (idx === -1) {
    // Fall back: just append at end
    await writeFile(FILE, `${current.trimEnd()}\n\n- ${cleaned}\n`, "utf-8");
    return;
  }
  const before = current.slice(0, idx + FACTS_MARKER.length);
  const after = current.slice(idx + FACTS_MARKER.length);
  const newAfter = after.replace(/_\(this section grows over the conversation\)_\s*/g, "");
  const updated = `${before}\n\n- ${cleaned}${newAfter.startsWith("\n") ? "" : "\n"}${newAfter}`;
  await writeFile(FILE, updated, "utf-8");
}
```

- [ ] **Step 2: Run tests — expect PASS**

Run: `npm test`
Expected: All tests pass (rag, tool-loop, memory).

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/lib/memory.ts research-frontend/demo/lib/memory.test.ts
git commit -m "feat: lib/memory.ts — readMemory, readSkill, appendFact"
```

---

### Task 23: Implement `llm-tools-memory` mode

**Files:**
- Create: `research-frontend/demo/app/api/chat/modes/llm-tools-memory.ts`
- Modify: `research-frontend/demo/app/api/chat/route.ts`

- [ ] **Step 1: Create the mode handler**

File: `research-frontend/demo/app/api/chat/modes/llm-tools-memory.ts`
```ts
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
```

- [ ] **Step 2: Wire into dispatcher**

Replace `research-frontend/demo/app/api/chat/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { runLlmOnly } from "./modes/llm-only";
import { runLlmTools } from "./modes/llm-tools";
import { runLlmToolsMemory } from "./modes/llm-tools-memory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { mode, messages } = await req.json();
  try {
    switch (mode) {
      case "llm":
        return NextResponse.json(await runLlmOnly(messages));
      case "tools":
        return NextResponse.json(await runLlmTools(messages));
      case "memory":
        return NextResponse.json(await runLlmToolsMemory(messages));
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add research-frontend/demo/app/api/chat/modes/llm-tools-memory.ts research-frontend/demo/app/api/chat/route.ts
git commit -m "feat: Tab 3 — reads CLAUDE.md + SKILL.md, adds remember_fact tool"
```

---

### Task 24: Add `/api/memory` route and wire `MemoryPanel` into Tab 3

**Files:**
- Create: `research-frontend/demo/app/api/memory/route.ts`
- Modify: `research-frontend/demo/app/page.tsx`

- [ ] **Step 1: Create the memory read endpoint**

File: `research-frontend/demo/app/api/memory/route.ts`
```ts
import { NextResponse } from "next/server";
import { readMemory, readSkill } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET() {
  const [claudeMd, skillMd] = await Promise.all([readMemory(), readSkill()]);
  return NextResponse.json({ claudeMd, skillMd });
}
```

- [ ] **Step 2: Wire `MemoryPanel` into `page.tsx` for Tab 3**

Replace `research-frontend/demo/app/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { ChatPane, type ChatMessage } from "@/components/ChatPane";
import { MemoryPanel } from "@/components/MemoryPanel";

type Mode = "llm" | "tools" | "memory";

const TABS: { id: Mode; label: string }[] = [
  { id: "llm", label: "LLM" },
  { id: "tools", label: "+ Tools" },
  { id: "memory", label: "+ Tools + Memory" },
];

export default function Home() {
  const [active, setActive] = useState<Mode>("llm");
  const [histories, setHistories] = useState<Record<Mode, ChatMessage[]>>({
    llm: [], tools: [], memory: [],
  });
  const [loading, setLoading] = useState(false);
  const [mem, setMem] = useState({ claudeMd: "", skillMd: "" });

  async function refreshMemory() {
    try {
      const res = await fetch("/api/memory");
      if (res.ok) setMem(await res.json());
    } catch {}
  }

  useEffect(() => {
    if (active === "memory") refreshMemory();
  }, [active]);

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
      };
      setHistories((h) => ({ ...h, [active]: [...next, reply] }));
      if (active === "memory") refreshMemory();
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
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange font-bold text-white">✻</div>
        <h1 className="text-base font-semibold">Research Assistant — Wispr Flow workshop</h1>
      </header>

      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex border-b border-line px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "border-b-2 px-4 py-3 text-sm transition " +
                (active === t.id
                  ? "border-orange font-semibold text-ink"
                  : "border-transparent text-ink-3 hover:text-ink-2")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className={
            "min-h-[460px] " +
            (active === "memory" ? "grid grid-cols-[1fr,260px]" : "")
          }
        >
          <div className="p-6">
            <ChatPane
              messages={histories[active]}
              loading={loading}
              onSend={handleSend}
            />
          </div>
          {active === "memory" && <MemoryPanel claudeMd={mem.claudeMd} skillMd={mem.skillMd} />}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify Tab 3 end-to-end**

Run: `npm run dev`. Switch to Tab 3.
1. Ask: *"I'm researching the Wispr Flow competitive landscape — what's an unclaimed positioning angle?"*
2. Expected: Tool traces include `rag_search`, possibly `web_search`, and ideally `remember_fact`. Right panel shows the SKILL.md procedure; CLAUDE.md grows with a new bullet after the model persists a fact.
3. Ask a follow-up: *"Continue from where I left off."*
4. Expected: The model references the persisted angle (from CLAUDE.md) in its answer.

Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add research-frontend/demo/app/api/memory/route.ts research-frontend/demo/app/page.tsx
git commit -m "feat: Tab 3 right rail with live memory + skill display"
```

---

## Phase 6 — Polish

### Task 25: Add the landing README at the repo root

**Files:**
- Create: `course-demo/README.md`

- [ ] **Step 1: Create the landing README**

File: `course-demo/README.md`
```markdown
# Course Demo — Two Themes, One Workshop

Teaching demos for understanding LLM harness layers.

## Themes

### 🎯 Theme 1 — `research-agent/`
A Claude Code skill-based competitor research agent. Browse to understand the
"CC harness" pattern: skills, subagents, MCP servers, file-based memory.
Imported verbatim from
[maven-workshop-research-agent](https://github.com/aishwaryaashok14/maven-workshop-research-agent).

### 🎨 Theme 2 — `research-frontend/`
A Next.js teaching demo where students experience the **same domain** through
three harness layers, side-by-side:

| Tab | What it shows |
|---|---|
| **LLM** | The raw model — confidently hallucinated answers |
| **+ Tools** | RAG + web_search + Playwright — grounded, sourced answers |
| **+ Tools + Memory** | Above + CLAUDE.md persistent context + SKILL.md procedure |

Run `research-frontend/demo/` for the working version.
Work through `research-frontend/scaffold/` to build it yourself.

## Spec & Plan

- Design: [docs/superpowers/specs/2026-05-14-research-frontend-design.md](docs/superpowers/specs/2026-05-14-research-frontend-design.md)
- Plan: [docs/superpowers/plans/2026-05-14-research-frontend.md](docs/superpowers/plans/2026-05-14-research-frontend.md)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: landing README linking both themes"
```

---

### Task 26: Full test + smoke pass

- [ ] **Step 1: Run unit tests**

Run from `research-frontend/demo/`: `npm test`
Expected: All tests pass (rag: 3, tool-loop: 2, memory: 2 — total 7).

- [ ] **Step 2: Smoke test each tab**

Run: `npm run dev`. Open http://localhost:3000.

| Tab | Query | Pass criterion |
|---|---|---|
| LLM | "Who competes with Wispr Flow?" | No tool traces; model admits uncertainty or invents names |
| + Tools | "Who competes with Wispr Flow?" | `rag_search` trace appears; answer names the 4 corpus competitors |
| + Tools + Memory | "I'm tracking the agent-voice-interface gap. What positioning is unclaimed?" | `rag_search` + `remember_fact` traces; right rail shows CLAUDE.md gaining the persisted fact |

If any tab fails its pass criterion, debug before continuing. Ctrl+C when done.

- [ ] **Step 3: Commit any polish fixes (if needed)**

```bash
git add -A
git commit -m "fix: polish after smoke test" --allow-empty
```

---

## Phase 7 — Scaffold Derivation

### Task 27: Copy `demo/` to `scaffold/`

**Files:**
- Create: `research-frontend/scaffold/` (copy of `demo/`)

- [ ] **Step 1: Copy the tree, excluding node_modules and .next**

Run from `research-frontend/`:
```bash
rsync -a --exclude='node_modules' --exclude='.next' demo/ scaffold/
```

- [ ] **Step 2: Verify**

Run: `ls research-frontend/scaffold/`
Expected: same top-level files as `demo/`, no `node_modules` / `.next`.

- [ ] **Step 3: Commit**

```bash
git add research-frontend/scaffold/
git commit -m "chore: copy demo/ to scaffold/ as base for workshop stubs"
```

---

### Task 28: Stub the three mode files in `scaffold/`

**Files:**
- Modify: `research-frontend/scaffold/app/api/chat/modes/llm-only.ts`
- Modify: `research-frontend/scaffold/app/api/chat/modes/llm-tools.ts`
- Modify: `research-frontend/scaffold/app/api/chat/modes/llm-tools-memory.ts`

- [ ] **Step 1: Stub `llm-only.ts`**

File: `research-frontend/scaffold/app/api/chat/modes/llm-only.ts`
```ts
import type { ChatMessage } from "@/components/ChatPane";

export async function runLlmOnly(messages: ChatMessage[]) {
  // TODO Exercise 1 — Warm-up
  // Call the Anthropic Messages API with no tools and no memory.
  // Use the shared client from "@/lib/anthropic" and the MODEL constant.
  // Hint: model, max_tokens, system, messages.
  // Return shape: { content: string, traces: string[] }
  return { content: "(unimplemented — see Exercise 1)", traces: [] };
}
```

- [ ] **Step 2: Stub `llm-tools.ts`**

File: `research-frontend/scaffold/app/api/chat/modes/llm-tools.ts`
```ts
import type { ChatMessage } from "@/components/ChatPane";

export async function runLlmTools(messages: ChatMessage[]) {
  // TODO Exercise 2 — Tools
  // 1. Implement lib/rag.ts (see its TODO) so rag_search has something to call
  // 2. Loop: call anthropic.messages.create with tools from "@/lib/tools",
  //    if stop_reason === "tool_use", execute each tool_use block via
  //    executeToolUse in "@/lib/tool-loop", append tool_results, loop.
  // 3. Stop when stop_reason !== "tool_use" or after MAX_ITERATIONS.
  // 4. Return { content, traces } — traces are formatted via formatTrace.
  return { content: "(unimplemented — see Exercise 2)", traces: [] };
}
```

- [ ] **Step 3: Stub `llm-tools-memory.ts`**

File: `research-frontend/scaffold/app/api/chat/modes/llm-tools-memory.ts`
```ts
import type { ChatMessage } from "@/components/ChatPane";

export async function runLlmToolsMemory(messages: ChatMessage[]) {
  // TODO Exercise 3 — Memory
  // Build on Exercise 2:
  // 1. Read memory/CLAUDE.md and skills/research/SKILL.md (see lib/memory.ts)
  // 2. Compose the system prompt: SKILL.md + <user_context>CLAUDE.md</user_context>
  // 3. Use toolsForMemoryMode (adds remember_fact) instead of toolsForToolsMode
  // 4. Same tool_use loop as Exercise 2
  return { content: "(unimplemented — see Exercise 3)", traces: [] };
}
```

- [ ] **Step 4: Commit**

```bash
git add research-frontend/scaffold/app/api/chat/modes/
git commit -m "chore: stub mode handlers in scaffold for Exercises 1-3"
```

---

### Task 29: Stub `lib/rag.ts` and `lib/memory.ts` in scaffold

**Files:**
- Modify: `research-frontend/scaffold/lib/rag.ts`
- Modify: `research-frontend/scaffold/lib/memory.ts`

- [ ] **Step 1: Stub `lib/rag.ts`**

File: `research-frontend/scaffold/lib/rag.ts`
```ts
export type RagChunk = {
  id: string;
  source: string;
  heading: string;
  content: string;
};

export async function ragSearch(_query: string, _limit = 3): Promise<RagChunk[]> {
  // TODO Exercise 2 (part 1) — implement keyword search over corpus/*.md
  // Suggested approach:
  // 1. Read all *.md files from corpus/
  // 2. Split each on "## " headings to make chunks
  // 3. Build a MiniSearch index over fields: heading, content, source
  // 4. Search with the query, return top `limit` chunks
  // Cache the index across calls so we don't rebuild on every query.
  return [];
}
```

- [ ] **Step 2: Stub `lib/memory.ts`**

File: `research-frontend/scaffold/lib/memory.ts`
```ts
export async function readMemory(): Promise<string> {
  // TODO Exercise 3 (part 1) — return contents of memory/CLAUDE.md
  return "";
}

export async function readSkill(): Promise<string> {
  // TODO Exercise 3 (part 1) — return contents of skills/research/SKILL.md
  return "";
}

export async function appendFact(_fact: string): Promise<void> {
  // TODO Exercise 3 (part 2) — append "- <fact>" under the "## Known facts" section in CLAUDE.md
}
```

- [ ] **Step 3: Commit**

```bash
git add research-frontend/scaffold/lib/rag.ts research-frontend/scaffold/lib/memory.ts
git commit -m "chore: stub lib/rag.ts and lib/memory.ts in scaffold"
```

---

### Task 30: Write `WORKSHOP.md`

**Files:**
- Create: `research-frontend/scaffold/WORKSHOP.md`

- [ ] **Step 1: Create the workshop guide**

File: `research-frontend/scaffold/WORKSHOP.md`
````markdown
# Workshop — Build the Research Frontend

You're starting from a working UI + corpus + memory templates. Your job is to
fill in the three mode handlers and their supporting libs. After each exercise,
run the app and play with the corresponding tab — the behavior should change.

## Setup

```bash
cd research-frontend/scaffold
npm install
npx playwright install chromium
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

---

## Exercise 1 — Warm-up: bare LLM call

**File:** `app/api/chat/modes/llm-only.ts`

**Goal:** Make Tab 1 actually call Claude.

**What you'll build:** A single `anthropic.messages.create` call with no
tools, returning the text content. ~10 lines.

**Hints:**
- Use `anthropic` and `MODEL` from `@/lib/anthropic`.
- The API expects `messages: [{ role, content }]` — translate from ChatMessage.
- `response.content` is an array of blocks; filter for `type === "text"`.

**Run it:** Ask Tab 1 *"Who are Wispr Flow's competitors?"* — expect a confident
but un-grounded answer with no tool traces.

**Stuck?** Peek at `research-frontend/demo/app/api/chat/modes/llm-only.ts`.

---

## Exercise 2 — Tools: RAG + Web Search + Browser

**Files:**
- `lib/rag.ts` — implement MiniSearch retrieval over the corpus
- `app/api/chat/modes/llm-tools.ts` — the tool_use loop

**Goal:** Make Tab 2 use the corpus, web search, and a real browser.

**What you'll build:**
1. `ragSearch(query, limit)` — index the 5 corpus markdown files and return top
   matches.
2. `runLlmTools` — call the API with `tools` from `@/lib/tools`, loop on
   `stop_reason === "tool_use"`, dispatch each `tool_use` via `executeToolUse`
   from `@/lib/tool-loop`, return when the model stops requesting tools.

**Hints:**
- See MiniSearch docs at https://lucaong.github.io/minisearch/
- Split each corpus file on `^## ` headings to create section-sized chunks.
- The tool_use loop pattern is in Anthropic's tool use docs — `tool_use` blocks
  go in the assistant message, `tool_result` blocks go back in the next user
  message with the matching `tool_use_id`.
- Stop after ~6 iterations to avoid runaway loops.

**Run it:** Ask Tab 2 the same question as Tab 1 — expect yellow tool-trace
boxes followed by an answer naming the four corpus competitors with sources.

**Stuck?** Peek at the corresponding `demo/` files.

---

## Exercise 3 — Memory: CLAUDE.md + SKILL.md + remember_fact

**Files:**
- `lib/memory.ts` — read/append for CLAUDE.md, read for SKILL.md
- `app/api/chat/modes/llm-tools-memory.ts` — system prompt with memory + skill

**Goal:** Make Tab 3 read persistent context, follow a procedure, and persist
new facts.

**What you'll build:**
1. `readMemory`, `readSkill`, `appendFact` — file I/O over `memory/CLAUDE.md`
   and `skills/research/SKILL.md`.
2. `runLlmToolsMemory` — load both files, compose
   `SKILL.md\n\n<user_context>\nCLAUDE.md\n</user_context>` as the system
   prompt, use `toolsForMemoryMode` (which adds `remember_fact`), same tool
   loop as Exercise 2.

**Hints:**
- `appendFact` should insert a bullet under `## Known facts`. Watch out for
  the `_(this section grows ...)_` placeholder text — remove it once you start
  appending real facts.
- The model decides when to call `remember_fact` based on CLAUDE.md's own
  persistence rules. Don't force it from code.

**Run it:** Ask Tab 3 *"I'm tracking the agent-voice-interface gap. What's
unclaimed?"* Expect a `remember_fact` trace and the right rail to gain a new
bullet. Then ask a follow-up that references your prior framing — the model
should pick it up from CLAUDE.md.

**Stuck?** Peek at the `demo/` versions.

---

## Stretch — Exercise 4: Embeddings instead of keywords

Swap `MiniSearch` for `voyage-3-lite` embeddings in `lib/rag.ts`. Set
`VOYAGE_API_KEY` in `.env.local`. Compute corpus embeddings on first run, cache
to `corpus/.embeddings.json`. Use cosine similarity.

Compare retrieval quality on these queries:
- "dictation pricing gap" (semantic — embeddings should win)
- "Wispr Flow" (exact term — keyword is fine)

---

## Stretch — Exercise 5: Managed RAG via Traversaal Pro

Upload `corpus/*.md` to https://pro.traversaal.ai/, get a Bearer token, set
`TRAVERSAAL_API_KEY` in `.env.local`. Replace `ragSearch` with a fetch to their
API. Same answer shape — different retriever.

Reflect: when would you build (MiniSearch / Voyage) vs. buy (Traversaal)?
````

- [ ] **Step 2: Commit**

```bash
git add research-frontend/scaffold/WORKSHOP.md
git commit -m "docs: WORKSHOP.md with 3 required + 2 stretch exercises"
```

---

### Task 31: Verify scaffold installs and runs (with stubs)

- [ ] **Step 1: Fresh install in scaffold**

Run from `research-frontend/scaffold/`:
```bash
npm install
```

- [ ] **Step 2: Boot the scaffold dev server**

Run: `npm run dev`. Open http://localhost:3000.
Expected: UI renders. All three tabs respond with `(unimplemented — see Exercise N)`. No crashes.

Ctrl+C.

- [ ] **Step 3: Commit any final fixes (if any)**

```bash
git add -A
git commit -m "chore: scaffold runs cleanly with stub responses" --allow-empty
```

---

## Plan complete

After Task 31, the repo state is:
- `research-agent/` — the reference CC harness (copied verbatim)
- `research-frontend/demo/` — fully working three-tab teaching demo
- `research-frontend/scaffold/` — same shell, TODO-stubbed for student exercises
- `course-demo/README.md` — landing page linking the two themes
- Tests pass; both apps boot.

**Future work (not in this plan, per spec §10):** streaming, reset buttons, deployment story (Vercel?), font refinement pass.
