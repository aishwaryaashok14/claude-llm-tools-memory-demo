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
