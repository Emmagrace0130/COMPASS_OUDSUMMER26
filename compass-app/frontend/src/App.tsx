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
            { id: crypto.randomUUID(), role: "assistant", content: err.detail ?? "Something went wrong.", error: true },
          ]);
          return;
        }

        const data: { answer: string; sources: Source[] } = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.answer, sources: data.sources },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Could not reach the server. Make sure the backend is running.", error: true },
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
    <div className="flex flex-col h-screen bg-space">

      {/* Header */}
      <header className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-compass-glow/10 bg-deep/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-compass-glow/50 flex items-center justify-center shadow-glow">
            <span className="text-compass-glow font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold tracking-widest text-sm uppercase">COMPASS</h1>
            <p className="text-compass-glow/60 text-[10px] tracking-wide">OUD Research Assistant · Tennessee</p>
          </div>
        </div>
        <StatusBadge />
      </header>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-6 bg-deep/60 border-b border-compass-glow/10">
        {(["chat", "data"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-medium tracking-widest uppercase border-b-2 transition-all ${
              tab === t
                ? "border-compass-glow text-compass-glow"
                : "border-transparent text-compass-steel hover:text-compass-bright"
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

              {/* Radial glow blob */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-compass-glow/5 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Compass ring logo */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-compass-glow/40 animate-pulse_glow" />
                  <div className="absolute inset-2 rounded-full border border-compass-glow/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-compass-glow font-bold text-2xl" style={{ textShadow: "0 0 20px #00d4e0" }}>C</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-2" style={{ textShadow: "0 0 30px rgba(0,212,224,0.4)" }}>
                  COMPASS
                </h2>
                <p className="text-compass-glow/70 text-sm tracking-wide mb-1">OUD Research Assistant</p>
                <p className="text-compass-steel text-xs text-center max-w-sm mb-10">
                  Searching 150+ clinical guidelines, research papers, and Tennessee policy documents.
                </p>

                <div className="grid gap-2 w-full max-w-lg">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs glass rounded-lg px-4 py-3 text-compass-mist/80 hover:text-compass-bright hover:border-compass-glow/40 hover:shadow-glow transition-all"
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
                  <div className="shrink-0 w-8 h-8 rounded-full border border-compass-glow/50 flex items-center justify-center text-compass-glow text-xs font-bold">
                    C
                  </div>
                  <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-compass-glow rounded-full animate-bounce"
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
        <div className="shrink-0 border-t border-compass-glow/10 bg-deep/80 backdrop-blur-md px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about OUD medications, guidelines, Tennessee policy…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-compass-glow/20 bg-space/80 px-4 py-3 text-sm text-compass-mist placeholder-compass-steel/60 focus:outline-none focus:ring-1 focus:ring-compass-glow/50 focus:border-compass-glow/50 disabled:opacity-50 max-h-32 overflow-y-auto leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-compass-glow/10 border border-compass-glow/40 hover:bg-compass-glow/20 hover:shadow-glow disabled:opacity-30 disabled:cursor-not-allowed text-compass-glow rounded-xl px-4 py-3 text-sm font-medium tracking-wide transition-all"
            >
              Send
            </button>
          </div>
          <p className="text-center text-[10px] text-compass-steel/50 mt-2 tracking-wide">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
