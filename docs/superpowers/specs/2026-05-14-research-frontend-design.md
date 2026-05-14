# Research Frontend — Design Spec

**Date:** 2026-05-14
**Owner:** Aishwarya Ashok
**Status:** Draft — pending review

## 1. Overview

A teaching demo that lets students experience how the same underlying LLM behaves differently as you stack on harness layers:

1. **LLM only** — the raw model
2. **+ Tools** — the model with external capabilities (RAG, web search, browser)
3. **+ Tools + Memory** — the model with capabilities AND persistent context (CLAUDE.md, SKILL.md, fact memory)

The demo is a Next.js web app with three tabs, one per layer. Each tab is an independent chat. Students type the same question across tabs and watch the answer get smarter (and more grounded, more personalized) as layers are added.

The domain is the **Wispr Flow competitive landscape** — the same example used by the reference `maven-workshop-research-agent` repo. This lets students compare two implementations of the same theme:

- `research-agent/` — Claude Code skill-based (the reference repo, copied verbatim, browsable)
- `research-frontend/` — this new Next.js demo + scaffold

## 2. Goals & Non-Goals

**Goals**
- Make the LLM / Tools / Memory layering visceral and visible.
- Ship a runnable demo students can play with in a browser.
- Ship a stripped-down scaffold version students fill in themselves (workshop format).
- Document each tool and the value it adds, so students understand *why* the layer matters.

**Non-Goals**
- Production-grade authentication, multi-user state, or persistence beyond a local file.
- Real-time streaming polish (we'll stream simply, not perfectly).
- Anthropic Agent SDK semantics. We use the Messages API directly so each layer is one visible API-call change.

## 3. Repo Structure

```
course-demo/
├── README.md                            ← Landing page: links the two themes
├── research-agent/                      ← Theme 1: copied verbatim from maven-workshop-research-agent
└── research-frontend/                   ← Theme 2: this new app
    ├── demo/                            ← Working version (answer key)
    │   ├── app/
    │   │   ├── page.tsx                 ← Three-tab UI
    │   │   ├── api/chat/route.ts        ← Dispatcher (routes by mode)
    │   │   └── api/chat/modes/
    │   │       ├── llm-only.ts
    │   │       ├── llm-tools.ts
    │   │       └── llm-tools-memory.ts
    │   ├── corpus/                      ← RAG source docs
    │   │   ├── wispr-flow.md
    │   │   ├── superwhisper.md
    │   │   ├── aqua-voice.md
    │   │   ├── voiceink.md
    │   │   └── willow-voice.md
    │   ├── memory/CLAUDE.md             ← Grows over conversation (visible in UI)
    │   ├── skills/research/SKILL.md     ← Static procedure (visible in UI)
    │   ├── lib/
    │   │   ├── anthropic.ts             ← SDK client
    │   │   ├── rag.ts                   ← MiniSearch keyword retrieval
    │   │   └── memory.ts                ← Read/append CLAUDE.md
    │   ├── package.json
    │   └── .env.example                 ← ANTHROPIC_API_KEY (plus optional VOYAGE_API_KEY for the stretch)
    └── scaffold/                        ← TODO-stubbed version (same tree)
        ├── WORKSHOP.md                  ← Step-by-step exercises
        └── (same files with stubs)
```

## 4. Architecture & Per-Mode Implementation

All three modes use the same Anthropic Messages API. The differences are entirely in the API call shape — that's the teaching point.

### 4.1 Tab 1 — LLM only

```ts
// app/api/chat/modes/llm-only.ts
return anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: "You are a research assistant.",
  messages: chatHistory,
});
```

**What students observe:** The model confidently makes up competitor info, has no awareness of recent products, no sources. Teaching moment: training data is stale and fuzzy.

### 4.2 Tab 2 — + Tools

```ts
return anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: "You are a research assistant. Use tools to ground answers in real data.",
  messages: chatHistory,
  tools: [
    rag_search_tool,                                       // custom: MiniSearch over corpus/
    { type: "web_search_20250305", name: "web_search" },   // Anthropic built-in
    browser_navigate_tool,                                 // custom: wraps Playwright page.goto
    browser_snapshot_tool,                                 // custom: wraps Playwright page.content / accessibility tree
    browser_click_tool,                                    // custom: wraps Playwright page.click
    browser_screenshot_tool,                               // custom: wraps Playwright page.screenshot
  ],
});
// Loop: handle tool_use blocks → execute → return tool_result → repeat until stop_reason=end_turn
```

**Note on Playwright:** We use the [`playwright`](https://playwright.dev/) library directly inside our Next.js API route — *not* the `@playwright/mcp` server. Reason: Anthropic's `mcp_servers` parameter only accepts HTTP/SSE URL-based MCP servers, and `@playwright/mcp` is stdio-based. The cleanest path is to wrap a small set of Playwright operations as custom Anthropic tools. The "tools" framing still applies conceptually — these are tools the LLM calls — but the wire protocol is plain custom-tool, not MCP.

**What students observe:** The LLM **chooses** which tool to fire based on the question. Tool-call traces appear in the UI so students see the decisions. Answers get grounded, current, and sourced.

### 4.3 Tab 3 — + Tools + Memory

```ts
const claudeMd = await fs.readFile("memory/CLAUDE.md", "utf-8");
const skillMd  = await fs.readFile("skills/research/SKILL.md", "utf-8");

return anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: `${skillMd}\n\n<user_context>\n${claudeMd}\n</user_context>`,
  messages: chatHistory,
  tools: [...tab2Tools, remember_fact_tool], // remember_fact appends to CLAUDE.md
});
```

**What students observe:**
- Answers are personalized to the user's prior research (read from CLAUDE.md).
- The procedure follows SKILL.md (e.g., always returns 6-bullet competitor cards + gap analysis + closing question).
- After each turn, the model decides what to persist via `remember_fact`. The UI panel shows CLAUDE.md growing in real time.

## 5. Tool Catalog & Value-Add

This is the documentation students should be able to read and understand *why* each tool matters.

### 5.1 `rag_search` — local corpus retrieval (MiniSearch)

**What it does:** Searches the 5 local corpus markdown files for chunks relevant to a query. Returns the top-3 matching chunks with their source file.

**Implementation:** `lib/rag.ts` uses [MiniSearch](https://lucaong.github.io/minisearch/) — pure-JS keyword search with fuzzy + prefix matching. ~10 lines. No API key. No vector DB.

> **MiniSearch is still RAG.** RAG = Retrieval-Augmented Generation. The retrieval mechanism (keyword, embedding, vector, hybrid) is an implementation detail. MiniSearch does step 1 (retrieve relevant chunks) and step 2 (inject into context); the LLM does step 3 (generate). Same pattern as embeddings or a managed RAG service — just a different retriever under the hood. The stretch exercises swap in alternative retrievers so students experience this directly.

**Value added:**
- The LLM gets information *we curated*, not whatever the open web says. Critical for ground-truth domains (internal docs, product specs, legal contracts).
- Cheap, fast, deterministic. Same query → same chunks every time.
- Teaches the core RAG pattern: query → retrieve → augment context → generate.

**Limits:**
- Keyword match misses semantic synonyms ("dictation gap" won't match "pricing void" without shared tokens).
- Doesn't scale beyond a few thousand docs without a real index.

**Stretch exercises (optional):**
- **Exercise 4 — Local embeddings:** Swap MiniSearch for Voyage AI (`voyage-3-lite`) + cosine similarity. Students compare retrieval quality on edge-case queries.
- **Exercise 5 — Managed RAG service:** Wire in [Traversaal Pro](https://pro.traversaal.ai/) (upload corpus via their UI, query via Bearer token API). Students experience "build vs. buy" for RAG and see the same answer pattern emerge from a different retriever.

### 5.2 `web_search` — Anthropic's built-in search

**What it does:** Anthropic-hosted search. Returns title + URL + snippet for top results.

**Implementation:** Zero. Pass `web_search_20250305` in the `tools` array. Anthropic handles the search and parses results.

**Value added:**
- Live information, no training-data staleness.
- Sources cited automatically; students can verify claims.
- Fastest path to grounded answers — ~1s round-trip.

**Limits:**
- Only sees what's indexed. Misses JS-rendered SPA content.
- Read-only: can't click, fill forms, or interact.
- Snippet-based: doesn't see full page content.

### 5.3 `browser_*` — Playwright (browser automation, custom tools)

**What it does:** Drives a real headless Chromium. Tools we expose to Claude: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_screenshot`. Each is a custom Anthropic tool whose handler calls the equivalent `playwright` library method.

**Implementation:** `lib/browser.ts` keeps a singleton Playwright `BrowserContext` (one headless Chromium for the demo lifetime). Each custom tool's handler awaits a Playwright operation and returns the result as a `tool_result` block. The browser context is destroyed on process shutdown.

**Value added:**
- Sees fully rendered DOM, including JS-loaded content (SPA pricing pages, infinite-scroll feeds).
- Can interact: click "Annual" pricing toggle, fill forms, scroll.
- Takes screenshots — answers questions like "what does this page look like?"
- No API key needed (it's a real browser, not an API).

**Limits:**
- Slow (~2–10s per action vs. ~1s for `web_search`).
- Brittle: site DOM changes break selectors.
- Heavyweight: ~300MB Chromium download on first install.

**Teaching moment — when does Claude pick each?**

| Query | Likely tool | Why |
|---|---|---|
| "Who competes with Wispr Flow?" | `rag_search` | The answer is in our corpus. |
| "What did Wispr Flow announce this month?" | `web_search` | Fresh, indexed news. |
| "What does Aqua Voice's pricing page show after clicking 'Annual'?" | `browser_*` | Stateful SPA interaction. |
| "Take a screenshot of Wispr Flow's homepage." | `browser_*` | Only Playwright can. |

This decision-making is the *real* lesson of the Tools layer.

### 5.4 `remember_fact` — memory persistence (Tab 3 only)

**What it does:** Custom tool that takes a single string `fact` and appends it as a bullet to `memory/CLAUDE.md`.

**Implementation:** `lib/memory.ts` defines an Anthropic custom tool. The LLM decides what's worth persisting (e.g., "user is tracking the agent-voice-interface angle" but not "user said hello").

**Value added:**
- Personalization across turns and sessions — the next question benefits from prior context.
- Teaches the file-as-memory pattern that real Claude Code uses (`CLAUDE.md`).
- Shows that "memory" doesn't require a database — a markdown file is enough at this scale.

**Limits:**
- No structure (it's free-text bullets). For real apps, you'd want typed facts or a vector memory.
- No retrieval — every read loads the full file. Fine at a few KB; doesn't scale.
- LLM may persist trivial or wrong facts. Demo includes a "reset memory" button.

## 6. Memory Design (Tab 3)

Two files, two kinds of memory, both read into the system prompt at the start of every turn.

|  | `memory/CLAUDE.md` | `skills/research/SKILL.md` |
|---|---|---|
| Kind | Episodic / factual ("what I know about *you*") | Procedural ("how I should *work*") |
| Mutability | Grows over time (mutable) | Static, hand-authored |
| Written by | Model itself via `remember_fact` tool | Instructor / student |
| Lives in system prompt as | `<user_context>...</user_context>` block | Procedure instructions |

> **Important framing for students:** "Memory" isn't a magic box. It's the *pattern* of "read a file at the start of every turn, optionally write back via a tool at the end." The file is just storage. The pattern is what matters.

### 6.1 `memory/CLAUDE.md` — full template shipped in both demo and scaffold

The Do/Don't rules header is present in both `demo/memory/CLAUDE.md` and `scaffold/memory/CLAUDE.md`. The "Known facts" section is empty in both — the demo accumulates facts only when used.

````markdown
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
````

These rules are visible to the LLM every turn (because the file is loaded into the system prompt), so they govern its own write behavior via `remember_fact`.

### 6.2 `skills/research/SKILL.md` — full content shipped in both demo and scaffold

Adapted from the original `maven-workshop-research-agent` competitor-research skill: subagent dispatching removed, tool names mapped to ours, do/don'ts kept and extended for our tools.

````markdown
# Research procedure

You are a competitor-research assistant for the dictation / voice-AI space.
Follow this procedure for every research question.

## Tool selection

| Task | Reach for |
|---|---|
| Find known competitor facts | `rag_search` (corpus is curated) |
| Get fresh or dated info | `web_search` (Anthropic built-in, indexed) |
| See SPA-rendered pricing, click a toggle, take a screenshot | `browser_*` (Playwright) |
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

```
### [Competitor Name]
- **Positioning**: one sentence (their words, plain English)
- **Target customer**: who they're built for
- **Pricing**: tiers and price points, or "Not public"
- **Differentiators**: 2–3 things they do well
- **Weaknesses**: 1–2 recurring complaints from reviews / forums
- **Source date**: most recent source pulled (YYYY-MM)
```

Hard rules:
- 6 bullets exactly. If a bullet is empty, write "—" but keep the line.
- Pricing must cite a source URL inline if public.
- No marketing language in your translation.

### Step 5 — Gap Analysis
Add this section verbatim:

```
### Gap Analysis
- **What no competitor does well**: [specific capability gap]
- **Where pricing is underserved**: [a tier or model nobody offers]
- **Unclaimed positioning angle**: [a frame nobody owns]
```

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
````

Students can edit either file to change the assistant's behavior on the fly — that's the teaching demo of "memory and skills are instructions, not magic."

## 7. UI Design

- **Three tabs:** LLM | + Tools | + Tools + Memory. Each is an independent chat with its own history.
- **Active tab** gets the orange underline (`#d97757`).
- **User messages** in soft orange bubbles (`#fef7f2` background, `#f0d4c1` border).
- **Assistant messages** in white with a thin gray border.
- **Tool-call traces** appear inline between user and assistant messages: dashed-orange border, light-yellow background, monospace font. Shows the tool name, args, and what came back.
- **Tab 3 only:** right-side 240px panel showing live `memory/CLAUDE.md` (file grows as `remember_fact` fires) and static `skills/research/SKILL.md`.

**Palette:**
- Orange: `#d97757`
- Soft orange: `#fef7f2`
- Orange border: `#f0d4c1`
- Ink: `#1a1a1a`
- Secondary ink: `#4a4a4a`
- Light border: `#ececec`
- Background: `#ffffff`

**Typography:** System sans-serif default (Inter or SF). Mono (`ui-monospace`) for tool traces and file blocks. Font refinement is a future pass.

## 8. Workshop Scaffold

`research-frontend/scaffold/` mirrors `demo/` but with key files stubbed. Students get a `WORKSHOP.md` with three required exercises and two optional stretches:

| Exercise | Files | Lines stubbed | Learning goal |
|---|---|---|---|
| 1 — Warm-up | `app/api/chat/modes/llm-only.ts` | ~10 | The bare Anthropic Messages API call. Run it, see hallucination. |
| 2 — Tools | `app/api/chat/modes/llm-tools.ts`, `lib/rag.ts` | ~80 | `tool_use` loop, MiniSearch RAG, web_search, Playwright MCP wiring. Run it, see grounded + interactive answers. |
| 3 — Memory | `app/api/chat/modes/llm-tools-memory.ts`, `lib/memory.ts` | ~60 | Reading CLAUDE.md + SKILL.md into system prompt; `remember_fact` tool; appending to file. |
| 4 — Stretch (local embeddings) | `lib/rag.ts` | n/a | Swap MiniSearch for Voyage embeddings. Compare recall on edge cases. |
| 5 — Stretch (managed RAG) | `lib/rag.ts` | n/a | Wire in Traversaal Pro as the retriever. Experience "build vs. buy" for RAG. |

**What's NOT stubbed** (provided fully in scaffold): UI components, corpus markdown files, CLAUDE.md template (Do/Don't rules header included, "Known facts" empty), full SKILL.md, env example, package.json. Students stay focused on the AI-engineering layer.

`WORKSHOP.md` per-exercise structure: *Goal → What you'll build → Inline hints → Run it and observe → Peek at `demo/` if stuck.*

## 9. Environment & Dependencies

**Required env vars** (scaffold ships with `.env.example`):
- `ANTHROPIC_API_KEY` — for all three modes
- Optional `VOYAGE_API_KEY` — only for Exercise 4 stretch (local embeddings)
- Optional `TRAVERSAAL_API_KEY` — only for Exercise 5 stretch (managed RAG)

**Key npm dependencies:**
- `next` (15.x)
- `react` (19.x)
- `@anthropic-ai/sdk`
- `minisearch`
- `playwright` (the library — installed once, drives headless Chromium)
- `tailwindcss` (for styling — Next.js default; palette is configured in `tailwind.config.ts`)

**Models:**
- LLM: `claude-sonnet-4-6` (good balance of speed + capability for a demo)

**Total install size:** ~400MB once Chromium is pulled for Playwright MCP. Document this upfront in WORKSHOP.md so students aren't surprised.

## 10. README Outline

Top-level `course-demo/README.md` is the student's entry point. It must explain the three layers, what each adds, and how to differentiate them at a glance.

```markdown
# Maven Workshop: AI Agent Layers

Two themes showing how the same LLM behaves differently as you stack on
harness layers. Built for students learning what "agent" actually means.

## The three layers

### Layer 1: LLM only
The model alone. Pre-trained knowledge, no live data, no memory.

- What it is: a single `messages.create` call with a system prompt + chat history.
- What it can do: answer from training data, reason, write, summarize.
- What it can't: read your docs, browse the web, remember the last turn beyond what's in the chat history.
- What students will observe: confident-sounding answers that may be stale, hallucinated, or sourceless.

### Layer 2: LLM + Tools
The model with capabilities. Tools let it retrieve, search, and interact.

- `rag_search` — search a curated corpus (this is RAG; MiniSearch under the hood)
- `web_search` — Anthropic's built-in live web search
- `browser_*` — drive a real browser via Playwright MCP (for SPAs, screenshots, stateful pages)

- What changes: answers become grounded, sourced, and current.
- The teaching moment: the LLM **chooses** which tool to fire per question. Watch the tool-call trace in the UI.

### Layer 3: LLM + Tools + Memory
The model with capabilities AND persistent context across turns.

- `CLAUDE.md` — episodic memory ("what we know about *you*"). Mutable. Written by the model via `remember_fact`.
- `SKILL.md` — procedural memory ("how the model *works*"). Static. Hand-authored.

- What changes: answers personalize, follow a consistent procedure, and don't repeat themselves.
- The teaching moment: memory isn't a database. It's a file read into the system prompt every turn.

## How to differentiate the three at a glance

| | Tab 1 (LLM) | Tab 2 (+ Tools) | Tab 3 (+ Memory) |
|---|---|---|---|
| Cites sources? | No | Yes | Yes |
| Hallucinates competitors? | Often | Rare | Rare |
| Sees live web? | No | Yes | Yes |
| Sees interactive pages? | No | Yes (`browser_*`) | Yes |
| Persists facts across turns? | No | No | Yes (CLAUDE.md) |
| Follows a consistent output format? | Inconsistent | Mostly | Always (SKILL.md) |
| Adapts to your prior questions? | No | No | Yes |

## Repo map

- `research-agent/` — **Theme 1**: original Claude Code skill-based agent (browsable reference, no frontend)
- `research-frontend/demo/` — **Theme 2**: working Next.js demo (run it, play with it)
- `research-frontend/scaffold/` — **Theme 2 workshop**: TODO-stubbed version students fill in

## Getting started

1. Copy `.env.example` to `.env.local`, set `ANTHROPIC_API_KEY`.
2. `cd research-frontend/demo && npm install && npm run dev`
3. Open the URL, type a question in each tab, and notice the difference.

For the workshop, see `research-frontend/scaffold/WORKSHOP.md`.
```

`research-frontend/scaffold/WORKSHOP.md` is the per-exercise companion (Section 8). The top-level README is the conceptual map; WORKSHOP.md is the build guide.

## 11. Open Questions / Future Work

- Streaming responses to the UI — start simple (await full response), add streaming after MVP.
- Auth / multi-user — out of scope for v1; demo is single-user, file-based.
- A "reset" button per tab and a "reset memory" button for Tab 3.
- Visual diff of CLAUDE.md as it grows (highlight the newly appended line).
- Deployment story (Vercel for the demo? Students run locally?) — TBD.
- Font refinement pass.
