# Memory Ladder — Short-term vs Long-term Teaching Demo

**Date:** 2026-05-16
**Scope:** `research-frontend/demo/` (the Next.js teaching app)
**Status:** Approved design, ready for implementation plan

## Goal

Teach students the difference between **no memory**, **short-term (in-context)
memory**, and **long-term (persistent) memory** — and how tools sit orthogonally
to all of it. Today the demo has 3 tabs (`LLM` → `+ Tools` → `+ Tools +
Memory`) and conflates all memory into the last tab. We extend it to a
**5-tab contrastive ladder** where each tab changes exactly one variable, plus
a persistent in-app lesson panel.

The core pedagogical insight the tool must make unmistakable: **the model is
stateless every call. "Memory" is just what the harness chooses to put back
into the request.** Short-term = replay the transcript (volatile, dies with the
session). Long-term = write distilled facts to an external store and re-inject
them into the system prompt every turn (survives a new session).

## The ladder (contrastive isolation)

Each tab = base LLM + exactly one added variable. Only the final capstone
combines everything.

| Tab | What's sent to the model | Memory store | Tools | Survives 🔄 new session | Status |
|---|---|---|---|---|---|
| **LLM** | current message only | none | none | ❌ | **modified** → made stateless |
| **+ Short-term** | full transcript replayed in `messages[]` | volatile React state | none | ❌ | **new** |
| **+ Long-term** | current message + facts injected into system prompt (no transcript) | `memory/CLAUDE.md` | `remember_fact` only (write path) | ✅ | **new** |
| **+ Tools** | current message + tool results | none | rag_search, web_search, browser_* | ❌ | **modified** → made stateless |
| **+ Tools + Memory** | facts + SKILL in system prompt + tool results | CLAUDE.md + SKILL.md | all tools + remember_fact | ✅ | **unchanged** (existing capstone) |

**Why `+ Tools` becomes stateless:** contrastive isolation requires the only
new variable in that tab to be "tools." It currently replays history; that is
removed so the ladder stays clean.

## The lesson panel (shown in every tab)

A collapsible panel at the top of the chat area, present on **every** tab, with
two switchable views:

1. **Behavior** — the 5-row table above (Layer / what's sent / memory store /
   survives new session / grounded & can cite).
2. **Capabilities** — the per-tab capability matrix (message history, CLAUDE.md,
   rag_search, web_search, browser_*, SKILL.md, remember_fact).

The **active tab's row is highlighted** in both views, so a student always sees
"you are here, and this is the one thing that changed."

**Default state:** expanded on the new teaching tabs (`+ Short-term`,
`+ Long-term`, and `LLM`); collapsed on `+ Tools` and `+ Tools + Memory` so
those tabs are visually identical to the current app when not teaching. One
click toggles either way on any tab.

## The 🔄 New session button

A small button near the input, present on all tabs. It **clears the active
tab's chat transcript in React state only** — it never deletes CLAUDE.md.

This is the punchline mechanism:

- **+ Short-term** after 🔄: transcript array is empty → the model can't recall
  anything from before → visible amnesia.
- **+ Long-term** after 🔄: transcript is also empty, **but** the next request
  still injects CLAUDE.md into the system prompt → the model still knows the
  user. Recall provably came from the persisted file, not replayed history.
- Other tabs: clears chat; behavior otherwise unchanged.

Instructor-driven reset of `## Known facts` in CLAUDE.md remains a manual step
(already documented in `DEMO.md`); the New session button does **not** do this,
by design — wiping the file would destroy the long-term-memory demo.

## remember_fact / CLAUDE.md / memory — the relationship

Three distinct things students conflate. The tool must keep them visibly
separate:

- **"Memory" (long-term)** — the capability/concept. Not one object in code.
- **`memory/CLAUDE.md`** — the **store**. A markdown file with a `## Known
  facts` section. The *where*.
- **`remember_fact`** — the **write path**. A tool the model calls; routes
  through `appendFact()` in `lib/memory.ts` to append a bullet to CLAUDE.md.
- **Read path** — every request, `readMemory()` loads CLAUDE.md and injects it
  into the **system prompt** as `<user_context>`. This is what produces recall,
  not `remember_fact`.

**Push vs pull (course-wide framing):** memory is *pushed* into context every
turn automatically (so the 📄 sticky shows every turn). A tool like
`rag_search` is *pulled* — only runs when the model calls it (🔧 sticky shows
only sometimes). The lesson panel and stickies must preserve this contrast.

### remember_fact framing in `+ Long-term`

`remember_fact` is technically a tool call, but in the `+ Long-term` tab it is
framed as the **long-term-memory write mechanism**, not a research tool:

- It surfaces the existing green 💾 **PERSISTED** sticky — never a 🔧 Tool
  sticky.
- The lesson panel still reads "no tools" for the `+ Long-term` row.
- rag_search / web_search / browser_* are not registered for this tab at all.

## Backend changes

Mode key changes: `llm`, `tools`, `memory` (existing) + new `short-term`,
`long-term`.

**"Stateless" defined precisely:** the request sent to the model excludes all
*prior conversation turns* — the initial `messages` array contains only the
latest user message. The within-turn tool loop is unaffected: assistant
`tool_use` blocks and `tool_result` blocks still accumulate across iterations of
the *current* turn (that is one request cycle, not cross-turn history). So
`+ Tools` (stateless) still completes multi-step tool sequences for a single
question; it just doesn't remember the previous question.

| File | Change |
|---|---|
| `app/api/chat/route.ts` | route `short-term` → `runShortTerm`, `long-term` → `runLongTerm` |
| `app/api/chat/modes/llm-only.ts` | send only the last user message (stateless); keep the honest-disclaimer system prompt |
| `app/api/chat/modes/llm-tools.ts` | send only the last user message (stateless); tools unchanged |
| `app/api/chat/modes/short-term.ts` | **new** — replay full `messages[]`; plain assistant system prompt; no tools, no memory |
| `app/api/chat/modes/long-term.ts` | **new** — send only last user message; inject CLAUDE.md via `readMemory()` into system prompt; register `rememberFactTool` only; reuse the tool loop for the write path |
| `app/api/chat/modes/llm-tools-memory.ts` | **unchanged** |
| `lib/tools.ts` | add `toolsForLongTermMode = [rememberFactTool]` |
| `lib/stickies.ts` | support new modes; add a `short-term` sticky kind ("💬 Short-term memory — full transcript replayed"); for `long-term` emit 📄 **CLAUDE.md loaded** (always) + 💾 **PERSISTED** (when remember_fact ran) and **no** 📘 SKILL, **no** 🔧 tool stickies |
| `lib/memory.ts` | **unchanged** — `readMemory()` / `appendFact()` reused |

## Frontend changes

| File | Change |
|---|---|
| `app/page.tsx` | extend `Mode` and `TABS`; add `short-term` / `long-term` histories; mount `LessonPanel`; add 🔄 New session button (clears `histories[active]`); show file side panel for `long-term` (CLAUDE.md only) and `memory` (CLAUDE.md + SKILL, as today) |
| `components/LessonPanel.tsx` | **new** — collapsible, two views (Behavior / Capabilities), highlights active row, per-tab default expand/collapse |
| `components/ChatPane.tsx` | add sticky style for the new `short-term` kind; otherwise unchanged |
| `components/MemoryPanel.tsx` | reused for `long-term` (CLAUDE.md only) and `memory` (unchanged) |
| `DEMO.md` | rewrite instructor script for the 5-tab ladder, incl. the 🔄 new-session punchline for Short-term vs Long-term |

## What is explicitly unchanged

- All existing visual language: chat bubbles, dashed tool-trace box, the
  colored MEMORY/SKILL/PERSISTED stickies, the live file side panel, the input
  bar, header, theme.
- The `+ Tools + Memory` capstone: scope-first behavior, SKILL injection,
  remember_fact, side panel — byte-for-byte behavior preserved.
- `lib/memory.ts`, `lib/rag.ts`, `lib/playwright.ts`, `lib/tool-loop.ts`
  (the long-term mode reuses the existing tool loop for the remember_fact
  write path).

## Non-goals (YAGNI)

- No context-window inspector panel for `+ Short-term` (the lesson table +
  new-session button already teach it). Possible later stretch, out of scope
  now.
- No progressive tab unlocking / guided walkthrough — all tabs stay open,
  instructor-driven; the always-present lesson panel carries the progression.
- No DB/vector-store long-term memory — the file (`CLAUDE.md`) is the store, as
  today.
- No change to the corpus, RAG, or Playwright behavior.
- The New session button does not reset CLAUDE.md.

## Risks / things to watch

- **Statelessness regression:** making `LLM` and `+ Tools` stateless changes
  observable behavior of two existing tabs. The instructor script (`DEMO.md`)
  must be rewritten so prompts still demonstrate the intended point.
- **`+ Long-term` vs `+ Tools + Memory` confusion:** both touch CLAUDE.md. The
  lesson panel framing ("Long-term = persistence only; capstone = persistence +
  skill + tools") must be explicit, or students conflate them.
- **First-turn write timing:** in `+ Long-term`, a fact must be persisted on the
  turn it's revealed for the post-🔄 recall demo to work. The system prompt must
  instruct the model to call `remember_fact` promptly on durable info.
- **Sticky correctness:** `long-term` must never show 🔧 or 📘 stickies, or the
  "no tools" teaching claim breaks.

## Testing

- `lib/stickies.test.ts` — extend for `short-term` and `long-term` modes
  (assert long-term emits 📄 + 💾 only, never 🔧/📘; short-term emits the
  transcript-replay sticky).
- Manual demo walkthrough per the rewritten `DEMO.md`: each tab's headline
  prompt produces the expected sticky row and the 🔄 punchline behaves
  correctly in Short-term vs Long-term.
- `npm run build` / typecheck clean; existing `rag.test.ts`,
  `memory.test.ts`, `tool-loop.test.ts` stay green (those modules unchanged).
