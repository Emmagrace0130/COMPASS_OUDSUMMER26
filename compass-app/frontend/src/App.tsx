import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./components/MessageBubble";
import { StatusBadge } from "./components/StatusBadge";
import type { Message, Source } from "./types";

const EXAMPLE_QUESTIONS = [
  "What are the recommended first-line medications for OUD in Tennessee?",
  "How does buprenorphine work and what are the dosing guidelines?",
  "What are the CDC 2022 opioid prescribing recommendations?",
  "What does the research say about OUD treatment during pregnancy?",
  "How do Tennessee's buprenorphine treatment guidelines compare to ASAM standards?",
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: question.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim() }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: err.detail ?? "Something went wrong.",
              error: true,
            },
          ]);
          return;
        }

        const data: { answer: string; sources: Source[] } = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Could not reach the server. Make sure the backend is running.",
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 bg-blue-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight">COMPASS</h1>
          <p className="text-blue-200 text-xs">
            OUD Research Assistant · Tennessee Focus
          </p>
        </div>
        <StatusBadge />
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full px-6 pb-24">
            <div className="w-16 h-16 rounded-full bg-blue-800 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
              C
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Ask COMPASS anything about OUD
            </h2>
            <p className="text-slate-400 text-sm text-center max-w-sm mb-8">
              I search {">"}150 clinical guidelines, research papers, and
              Tennessee policy documents to answer your questions.
            </p>
            <div className="grid gap-2 w-full max-w-lg">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input bar */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about OUD medications, guidelines, Tennessee policy…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 max-h-32 overflow-y-auto leading-relaxed"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 bg-blue-800 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
