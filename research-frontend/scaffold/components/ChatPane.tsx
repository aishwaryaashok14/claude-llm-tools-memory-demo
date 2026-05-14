"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  useEffect(autoResize, [draft]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function submit(e?: FormEvent | KeyboardEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    onSend(text);
    setDraft("");
    setTimeout(autoResize, 0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      submit(e);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-1"
      >
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-orange-border bg-orange-soft px-4 py-2.5 text-sm leading-relaxed"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-auto max-w-[85%] space-y-2">
              {m.traces?.map((t, j) => (
                <div
                  key={j}
                  className="rounded-lg border border-dashed border-orange-border bg-[#fffaf4] px-3 py-2 font-mono text-xs leading-relaxed text-ink-2"
                  dangerouslySetInnerHTML={{ __html: t }}
                />
              ))}
              <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-line bg-white px-4 py-2.5 text-sm leading-relaxed">
                {m.content}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="mr-auto inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2 text-sm text-ink-3">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse [animation-delay:0.2s]">●</span>
            <span className="animate-pulse [animation-delay:0.4s]">●</span>
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-4 flex items-end gap-2 border-t border-line pt-3"
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything…  (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-line px-3 py-2 text-sm leading-relaxed focus:border-orange focus:outline-none"
          style={{ overflow: "hidden" }}
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="rounded-xl bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
