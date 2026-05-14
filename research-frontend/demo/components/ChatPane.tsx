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
          <p className="text-ink-3">Ask about Wispr Flow&apos;s competitive landscape to begin.</p>
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
