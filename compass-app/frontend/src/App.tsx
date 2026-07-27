import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./components/MessageBubble";
import { StatusBadge } from "./components/StatusBadge";
import { SubTabLayout } from "./components/SubTabLayout";
import { DataView } from "./components/DataView";
import { DRDView } from "./components/DRDView";
import { CDCView } from "./components/CDCView";
import { NSDUHView } from "./components/NSDUHView";
import { AboutView } from "./components/AboutView";
import { TNODView } from "./components/TNODView";
import { WastewaterView } from "./components/WastewaterView";
import { MOUDView } from "./components/MOUDView";
import { TNCountyMap } from "./components/TNCountyMap";
import { ClinicalToolsView } from "./components/ClinicalToolsView";
import { TreatmentGapView } from "./components/TreatmentGapView";
import { TNTimelineView } from "./components/TNTimelineView";
import { LibraryView } from "./components/LibraryView";
import { DrugHeatmapView } from "./components/DrugHeatmapView";
import { PrescriptionView } from "./components/PrescriptionView";
import { All4KnoxView } from "./components/All4KnoxView";
import { MOUDGuideView } from "./components/MOUDGuideView";
import { PatientOutcomesView } from "./components/PatientOutcomesView";
import { ConceptMapView } from "./components/ConceptMapView";
import { DrugCourtsView } from "./components/DrugCourtsView";
import { DemographicsView } from "./components/DemographicsView";
import { TEDSView } from "./components/TEDSView";
import { WelcomeModal } from "./components/WelcomeModal";
import { HomeView } from "./components/HomeView";
import { TAB_LABELS, TAB_TOOLTIPS } from "./lib/tabMeta";
import type { Tab } from "./lib/tabMeta";
import type { Message, Source } from "./types";


// ── Tab icons (Heroicons outline, 24×24) ────────────────────────────────────
function Icon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
      {path2 && <path d={path2} />}
    </svg>
  );
}

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  chat:         <Icon path="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  data:         <Icon path="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" path2="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
  tnsurv:       <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  tnmap:        <Icon path="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
  ww:           <Icon path="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
  natdata:      <Icon path="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  moudresearch: <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  clinref:      <Icon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  gap:          <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  drugtrends:   <Icon path="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  library:      <Icon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.753 0-3.332.477-4.5 1.253" />,
  graph:        <Icon path="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
  about:        <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

// Dropdown nav groups — Chat stays standalone; everything else collapses under a category
const NAV_GROUPS: { label: string; tabs: Tab[] }[] = [
  { label: "Clinical",           tabs: ["data", "moudresearch", "clinref"] },
  { label: "Tennessee Data",     tabs: ["tnsurv", "tnmap", "drugtrends"] },
  { label: "National & Policy",  tabs: ["natdata", "gap", "ww"] },
  { label: "Reference",          tabs: ["library", "graph", "about"] },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("compass-theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("compass-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark] as const;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useDarkMode();
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("compass-welcomed"));

  const dismissWelcome = () => {
    localStorage.setItem("compass-welcomed", "1");
    setShowWelcome(false);
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (openGroup === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openGroup]);

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
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}

      {/* Crisis banner */}
      <div className="shrink-0 bg-red-700 text-white text-[11px] font-semibold text-center py-1.5 px-4 tracking-wide">
        If you suspect an overdose, call <strong>911</strong> immediately and use naloxone if available.
        &nbsp;Poison Control: <strong>1-800-222-1222</strong>
      </div>

      {/* Header */}
      <header className="shrink-0 px-5 py-2.5 flex items-center justify-between border-b border-rim bg-dark z-10">
        <div className="flex items-center gap-3">
          <img src="/compass-mark.svg" alt="COMPASS" className="w-8 h-8" />
          <div>
            <h1 className="text-compass-white font-bold tracking-widest text-sm uppercase leading-tight">COMPASS</h1>
            <p className="text-compass-muted text-[10px] tracking-wide leading-tight">Clinical &amp; Policy Assistant · University of Tennessee</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge />
          {tab === "chat" && (
            <button
              onClick={() => { setMessages([]); localStorage.removeItem("compass-messages"); }}
              className="text-[10px] tracking-wide text-compass-muted hover:text-compass-purple border border-rim hover:border-compass-purple/40 rounded-lg px-3 py-1.5 transition-all"
            >
              New Chat
            </button>
          )}
          <button
            onClick={() => setDark(d => !d)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rim hover:border-compass-purple/40 text-compass-muted hover:text-compass-purple transition-all text-[10px] tracking-wide"
            title="Toggle light/dark mode"
          >
            {dark ? (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
            {dark ? "Light" : "Dark"}
          </button>
          <button
            onClick={() => setShowWelcome(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-rim hover:border-compass-purple/40 text-compass-muted hover:text-compass-purple transition-all text-xs font-bold"
            title="About COMPASS"
          >?</button>
        </div>
      </header>

      {/* Tab bar — Chat standalone, everything else under grouped dropdowns */}
      <nav ref={navRef} className="shrink-0 flex items-stretch bg-dark border-b border-rim px-2 overflow-visible">
        <button
          onClick={() => { setTab("chat"); setOpenGroup(null); }}
          className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${
            tab === "chat"
              ? "border-compass-purple text-compass-purple"
              : "border-transparent text-compass-muted hover:text-compass-white"
          }`}
        >
          {TAB_ICONS.chat}
          {TAB_LABELS.chat}
        </button>

        {NAV_GROUPS.map((group, gi) => {
          const isActiveGroup = group.tabs.includes(tab);
          const isOpen = openGroup === gi;
          return (
            <div key={group.label} className="flex items-stretch shrink-0">
              <div className="flex items-center px-1">
                <div className="w-px h-5 bg-rim" />
              </div>
              <div className="relative">
                <button
                  onClick={() => setOpenGroup(isOpen ? null : gi)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActiveGroup || isOpen
                      ? "border-compass-purple text-compass-purple"
                      : "border-transparent text-compass-muted hover:text-compass-white"
                  }`}
                >
                  {group.label}
                  <svg className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="absolute top-full left-0 z-30 w-64 bg-dark border border-rim rounded-b-lg shadow-lg overflow-hidden">
                    {group.tabs.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setOpenGroup(null); }}
                        className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-all ${
                          tab === t
                            ? "bg-compass-purple/10 text-compass-purple"
                            : "text-compass-muted hover:bg-panel hover:text-compass-white"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{TAB_ICONS[t]}</span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-medium">{TAB_LABELS[t]}</span>
                          <span className="block text-[10px] text-compass-muted/70 mt-0.5 leading-snug">{TAB_TOOLTIPS[t]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Content */}
      {tab === "data" ? (
        <main className="flex-1 overflow-y-auto"><DataView /></main>
      ) : tab === "tnsurv" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout tabs={[
            { id: "drd",        label: "Knox Co. Overdose Deaths", content: <DRDView /> },
            { id: "tnod",       label: "Statewide OD Dashboard",   content: <TNODView /> },
            { id: "timeline",   label: "TN Policy Timeline",        content: <TNTimelineView /> },
            { id: "teds",       label: "Treatment Admissions",      content: <TEDSView /> },
            { id: "drugcourts", label: "Drug Courts",               content: <DrugCourtsView /> },
          ]} />
        </main>
      ) : tab === "tnmap" ? (
        <main className="flex-1 overflow-y-auto"><TNCountyMap /></main>
      ) : tab === "ww" ? (
        <main className="flex-1 overflow-y-auto"><WastewaterView /></main>
      ) : tab === "natdata" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout tabs={[
            { id: "cdc",   label: "CDC Overdose Counts",  content: <CDCView /> },
            { id: "nsduh", label: "NSDUH Prevalence",     content: <NSDUHView /> },
            { id: "demo",  label: "OD Demographics",      content: <DemographicsView /> },
          ]} />
        </main>
      ) : tab === "moudresearch" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout tabs={[
            { id: "moud",     label: "MOUD Study Overview", content: <MOUDView /> },
            { id: "outcomes", label: "Patient Outcomes",    content: <PatientOutcomesView /> },
          ]} />
        </main>
      ) : tab === "clinref" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout tabs={[
            { id: "a4k",       label: "All4Knox Induction Guide",  content: <All4KnoxView /> },
            { id: "moudguide", label: "MOUD Prescriber Reference", content: <MOUDGuideView /> },
            { id: "tools",     label: "COWS / DAST Screening",     content: <ClinicalToolsView /> },
          ]} />
        </main>
      ) : tab === "gap" ? (
        <main className="flex-1 overflow-y-auto"><TreatmentGapView /></main>
      ) : tab === "drugtrends" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout tabs={[
            { id: "rx",      label: "Prescription Drug Rates",   content: <PrescriptionView /> },
            { id: "heatmap", label: "Polysubstance Co-occurrence", content: <DrugHeatmapView /> },
          ]} />
        </main>
      ) : tab === "library" ? (
        <main className="flex-1 overflow-hidden flex"><LibraryView /></main>
      ) : tab === "graph" ? (
        <main className="flex-1 overflow-hidden"><ConceptMapView /></main>
      ) : tab === "about" ? (
        <main className="flex-1 overflow-y-auto"><AboutView /></main>
      ) : (
        /* Chat view */
        <main className="flex-1 overflow-y-auto relative">
          {isEmpty ? (
            <HomeView onAsk={sendMessage} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onTabChange={setTab} />
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full border border-rim bg-dark flex items-center justify-center text-compass-purple text-xs font-bold">
                    C
                  </div>
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 glass">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-compass-purple rounded-full animate-bounce"
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

      {/* Chat input bar */}
      {tab === "chat" && (
        <div className="shrink-0 border-t border-rim bg-dark px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about OUD medications, guidelines, Tennessee policy…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-compass-purple/50 disabled:opacity-50 max-h-32 overflow-y-auto leading-relaxed transition-colors"
              style={{ fieldSizing: "content", background: "rgb(var(--tw-c-panel))", border: "1px solid rgb(var(--tw-c-rim))", color: "rgb(var(--tw-c-white))" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-compass-purple hover:bg-compass-violet disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl px-5 py-3 text-sm font-semibold tracking-wide transition-all"
            >
              Send
            </button>
          </div>
          <p className="text-center text-[10px] text-compass-muted/40 mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
