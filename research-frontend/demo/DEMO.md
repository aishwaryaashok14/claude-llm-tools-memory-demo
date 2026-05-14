# Demo script — Agentic AI PM course

A walkthrough for instructors. Three tabs, three layers of capability. Each
prompt below is chosen to light up a specific combination of "stickies" (the
chips that appear under each assistant reply explaining *why* the model
behaved the way it did).

## ⭐ The headline demo — same prompt in all three tabs

> **Prompt:** `Give me a competitor analysis for AI dictation tools.`

| Tab | What the audience sees |
|---|---|
| **LLM** | Honest disclaimer ("I can't verify current data…"), fuzzy recall from training data. Sticky: 🧠 **LLM only**. |
| **+ Tools** | Dives straight into `rag_search` (corpus has 5 dictation tools), may fall back to `web_search`. Stickies: 🔧 **rag_search**, possibly 🔧 **web_search**. **No scope question.** |
| **+ Tools + Memory** | *Stops and asks* a 2–3 part scope question. **No tools fire.** Stickies: 📄 **CLAUDE.md loaded**, 📘 **SKILL loaded** only. |

The visual punchline: same input, dramatically different sticky rows.

> ⚠️ **One-time setup for Tab 3 to do this:** `memory/CLAUDE.md` ships with
> example bullets under `## Known facts`. Clear them (delete the bullets,
> leave the heading) so the model treats this as a new thread. Otherwise it
> will skip the scope step.

---

## Tab 1 — LLM only

Goal: surface the limits of training data alone. Each prompt should make the
model admit something.

1. `What's Wispr Flow's current enterprise pricing, and how does it compare to Superwhisper?` — pricing changes; can't verify.
2. `What did Aqua Voice ship in the last six months?` — recency cutoff.
3. `Cite the three most-mentioned complaints about VoiceInk on Reddit.` — no way to cite from a layer with no retrieval.

Sticky every time: 🧠 **LLM only**.

**Talking point:** "This is what 'just an LLM' really means — training data
plus nothing else. No web, no docs, no citations."

---

## Tab 2 — + Tools (rag + web + browser)

Goal: show each tool firing in isolation, then together.

| Prompt | Stickies you'll see |
|---|---|
| `What does our corpus say about Willow Voice's weaknesses?` | 🔧 `rag_search` (1×) |
| `What's Otter.ai's current pricing?` *(not in corpus)* | 🔧 `rag_search` then 🔧 `web_search` |
| `Open wisprflow.ai and screenshot the hero section.` | 🔧 `browser_navigate` + 🔧 `browser_screenshot` (inline image in the trace) |
| `Build a 6-bullet competitor card for Aqua Voice with current pricing — cite sources.` | 🔧 `rag_search` + 🔧 `web_search` |
| `Compare all five tools in our corpus on positioning and pricing.` | 🔧 `rag_search` (shown as "5×") |

**Talking point:** "Tools give grounding, but the model has no idea who you
are or what you've already decided. Every conversation starts from zero."

---

## Tab 3 — + Tools + Memory  *(three-turn demo, in order)*

Make sure `## Known facts` in `memory/CLAUDE.md` is **empty** before starting.

### Turn 1 — deliberately under-scoped

```
I need a competitor analysis for an AI dictation tool.
```

→ Stickies: 📄 **CLAUDE.md loaded**, 📘 **SKILL loaded**. **No tools.**
The model replies with a 2–3 part scope question. **This is the magic moment.**

### Turn 2 — reveal scope

```
Anchor on US enterprise legal teams. The angle is accuracy + on-device privacy.
I want to anchor against Wispr Flow and Superwhisper.
```

→ Stickies: 📄 + 📘 + 💾 **remember_fact** *(green — shows the fact it persisted)* + 🔧 **rag_search**.
Open the right-side memory panel to show `Known facts` updated in real time.

### Turn 3 — follow-up that uses persisted context

```
What's the single strongest gap I can exploit against those two?
```

→ Stickies: 📄 + 📘 + 🔧 **rag_search**. **No re-asking of scope** — the
model used persisted memory. That's the payoff.

**Talking point:** "Memory plus a Skill turn the same model into a
structured collaborator. It respects scope, persists what you've told it, and
follows a procedure across turns instead of starting from zero."

---

## Sticky cheat sheet

| Icon | Kind | Meaning |
|---|---|---|
| 🧠 | LLM only | No tools, no memory. Training data only. |
| 🔧 | Tool | A tool was called this turn. Detail names the tool and (if repeated) the count. |
| 📄 | Memory | `memory/CLAUDE.md` was injected into the system prompt this turn (always-on in Tab 3). |
| 📘 | Skill | `skills/research/SKILL.md` was injected into the system prompt this turn (always-on in Tab 3). |
| 💾 | Persisted | `remember_fact` ran and wrote a new bullet into `memory/CLAUDE.md`. The detail shows the saved fact. |

**Always-on vs per-turn:** 📄 and 📘 in Tab 3 appear **every turn** because
those files *are* loaded every turn — that's the whole point. 🔧 and 💾
chips only appear when the model actually chose to call that tool for the
current query.

---

## Reset between demos

To reset Tab 3 for a fresh scope-first run:

1. Open `memory/CLAUDE.md`.
2. Delete every bullet under `## Known facts` (keep the heading).
3. Reload the browser tab (each tab keeps its own chat history in React state).

To reset all chat history without restarting the server: refresh the page.
