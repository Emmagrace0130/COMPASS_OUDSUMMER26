import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./components/MessageBubble";
import { StatusBadge } from "./components/StatusBadge";
import { DataView } from "./components/DataView";
import { ParticleBackground } from "./components/ParticleBackground";
import type { Message, Source } from "./types";

type Tab = "chat" | "data";

const EXAMPLE_QUESTIONS = [
  "What are the recommended first-line medications for OUD in Tennessee?",
  "How does buprenorphine work and what are the dosing guidelines?",
  "What are the CDC 2022 opioid prescribing recommendations?",
  "What does the research say about OUD treatment during pregnancy?",
  "How do Tennessee's buprenorphine treatment guidelines compare to ASAM standards?",
];

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
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
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question.trim() };
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
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: err.detail ?? "Something went wrong.", error: true }]);
          return;
        }
        const data: { answer: string; sources: Source[] } = await res.json();
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.answer, sources: data.sources }]);
      } catch {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Could not reach the server.", error: true }]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-void">

      {/* Header */}
      <header className="shrink-0 px-6 py-3 flex items-center justify-between border-b border-compass-purple/20 bg-dark/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-compass-purple/60 flex items-center justify-center shadow-purple">
            <span className="text-compass-violet font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-compass-white font-bold tracking-widest text-sm uppercase">COMPASS</h1>
            <p className="text-compass-muted text-[10px] tracking-wide">OUD Research Assistant · Tennessee</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {tab === "chat" && messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[10px] tracking-widest uppercase text-compass-muted hover:text-compass-violet border border-rim hover:border-compass-purple/40 rounded-lg px-3 py-1.5 transition-all"
            >
              New Chat
            </button>
          )}
          <StatusBadge />
        </div>
      </header>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-6 bg-dark/70 border-b border-compass-purple/15">
        {(["chat", "data"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-medium tracking-widest uppercase border-b-2 transition-all ${
              tab === t
                ? "border-compass-violet text-compass-violet"
                : "border-transparent text-compass-muted hover:text-compass-white"
            }`}
          >
            {t === "chat" ? "Chat" : "Treatment Facilities"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "data" ? (
        <main className="flex-1 overflow-y-auto">
          <DataView />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto relative">
          {isEmpty ? (
            <div className="relative flex flex-col items-center justify-center h-full px-6 pb-24 overflow-hidden">
              <ParticleBackground />

              {/* Background glow blobs */}
              <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-compass-purple/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-compass-pink/8 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Logo ring */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-compass-violet/50 animate-pulse_purple" />
                  <div className="absolute inset-2 rounded-full border border-compass-pink/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-compass-violet font-bold text-2xl" style={{ textShadow: "0 0 20px #a855f7" }}>C</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-compass-white tracking-widest uppercase mb-2" style={{ textShadow: "0 0 30px rgba(168,85,247,0.5)" }}>
                  COMPASS
                </h2>
                <p className="text-compass-violet/70 text-sm tracking-wide mb-1">OUD Research Assistant</p>
                <p className="text-compass-muted text-xs text-center max-w-sm mb-10">
                  Searching 150+ clinical guidelines, research papers, and Tennessee policy documents.
                </p>

                <div className="grid gap-2 w-full max-w-lg">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs glass rounded-lg px-4 py-3 text-compass-white/70 hover:text-compass-white hover:border-compass-purple/40 hover:shadow-purple transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full border border-compass-purple/50 flex items-center justify-center text-compass-violet text-xs font-bold">
                    C
                  </div>
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: "#1e1b4b", border: "1px solid #4c1d95" }}>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-compass-violet rounded-full animate-bounce"
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
      )}

      {/* Input bar */}
      {tab === "chat" && (
        <div className="shrink-0 border-t border-compass-purple/15 bg-dark px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about OUD medications, guidelines, Tennessee policy…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto leading-relaxed"
              style={{ fieldSizing: "content", background: "#2d2b55", border: "1px solid #7c3aed", color: "#ffffff" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-compass-purple/20 border border-compass-purple/50 hover:bg-compass-purple/30 hover:shadow-purple disabled:opacity-30 disabled:cursor-not-allowed text-compass-violet rounded-xl px-4 py-3 text-sm font-medium tracking-wide transition-all"
            >
              Send
            </button>
          </div>
          <p className="text-center text-[10px] text-compass-muted/50 mt-2 tracking-wide">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
