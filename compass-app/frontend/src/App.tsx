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
import { TAB_LABELS, TAB_TOOLTIPS, PRIMARY_TABS, SECONDARY_TAB, SUB } from "./lib/tabMeta";
import type { Tab, NavTarget } from "./lib/tabMeta";
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
  home:    <Icon path="M3 12l2-2m0 0l7-7 7 7m-9-7v18M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  chat:    <Icon path="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  data:    <Icon path="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" path2="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
  tnsurv:  <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  clinref: <Icon path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  library: <Icon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.753 0-3.332.477-4.5 1.253" />,
  natl:    <Icon path="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" path2="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" />,
};

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("compass-theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("compass-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark] as const;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [subTab, setSubTab] = useState<string | undefined>(undefined);
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

  // Single entry point for navigation, so chat suggestions can deep-link to a sub-tab.
  const go = useCallback((target: NavTarget) => {
    setTab(target.tab);
    setSubTab(target.sub);
  }, []);

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

  // Remount SubTabLayout when a deep-link targets a different sub-tab.
  const subKey = `${tab}:${subTab ?? ""}`;

  return (
    <div className="flex flex-col h-screen bg-void">
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}

      {/* Crisis banner */}
      <div className="shrink-0 bg-red-700 text-white text-[11px] font-semibold text-center py-1.5 px-4 tracking-wide">
        If you suspect an overdose, call <strong>911</strong> immediately and use naloxone if available.
        &nbsp;Poison Control: <strong>1-800-222-1222</strong>
        &nbsp;·&nbsp;Need treatment? TN REDLINE (24/7, call or text): <strong>800-889-9789</strong>
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
          {tab === "chat" && !isEmpty && (
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

      {/* Tab bar — five primary destinations; national/out-of-state data sits apart on the right */}
      <nav className="shrink-0 flex items-stretch bg-dark border-b border-rim px-2">
        {PRIMARY_TABS.map((t) => (
          <button
            key={t}
            onClick={() => go({ tab: t })}
            title={TAB_TOOLTIPS[t]}
            className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${
              tab === t
                ? "border-compass-purple text-compass-purple"
                : "border-transparent text-compass-muted hover:text-compass-white"
            }`}
          >
            {TAB_ICONS[t]}
            {TAB_LABELS[t]}
          </button>
        ))}

        <button
          onClick={() => go({ tab: SECONDARY_TAB })}
          title={TAB_TOOLTIPS[SECONDARY_TAB]}
          className={`ml-auto flex items-center gap-1.5 px-3 py-3 text-[10px] tracking-wide border-b-2 transition-all whitespace-nowrap shrink-0 ${
            tab === SECONDARY_TAB
              ? "border-compass-purple/50 text-compass-purple"
              : "border-transparent text-compass-muted/50 hover:text-compass-muted"
          }`}
        >
          {TAB_LABELS[SECONDARY_TAB]}
        </button>
      </nav>

      {/* Content */}
      {tab === "home" ? (
        <main className="flex-1 overflow-y-auto">
          <HomeView onAsk={(q) => { go({ tab: "chat" }); sendMessage(q); }} />
        </main>
      ) : tab === "data" ? (
        <main className="flex-1 overflow-y-auto"><DataView /></main>
      ) : tab === "tnsurv" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout key={subKey} initial={subTab} tabs={[
            { id: SUB.tnsurv.map,        label: "County Map",            content: <TNCountyMap /> },
            { id: SUB.tnsurv.drd,        label: "Knox Co. Overdose Deaths", content: <DRDView /> },
            { id: SUB.tnsurv.tnod,       label: "Statewide OD Dashboard", content: <TNODView /> },
            { id: SUB.tnsurv.teds,       label: "Treatment Admissions",   content: <TEDSView /> },
            { id: SUB.tnsurv.rx,         label: "Prescription Trends",    content: <PrescriptionView /> },
            { id: SUB.tnsurv.heatmap,    label: "Polysubstance Patterns", content: <DrugHeatmapView /> },
            { id: SUB.tnsurv.timeline,   label: "TN Policy Timeline",     content: <TNTimelineView /> },
            { id: SUB.tnsurv.drugcourts, label: "Drug Courts",            content: <DrugCourtsView /> },
          ]} />
        </main>
      ) : tab === "clinref" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout key={subKey} initial={subTab} tabs={[
            { id: SUB.clinref.a4k,       label: "All4Knox Induction Guide",  content: <All4KnoxView /> },
            { id: SUB.clinref.moudguide, label: "MOUD Prescriber Reference", content: <MOUDGuideView /> },
            { id: SUB.clinref.tools,     label: "COWS / DAST Screening",     content: <ClinicalToolsView /> },
            { id: SUB.clinref.moud,      label: "MOUD Study Overview",       content: <MOUDView /> },
            { id: SUB.clinref.outcomes,  label: "Patient Outcomes",          content: <PatientOutcomesView /> },
          ]} />
        </main>
      ) : tab === "library" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout key={subKey} initial={subTab} tabs={[
            { id: SUB.library.docs,    label: "Document Library", content: <LibraryView />,     overflow: "overflow-hidden flex" },
            { id: SUB.library.graph,   label: "Knowledge Map",    content: <ConceptMapView />,  overflow: "overflow-hidden" },
            { id: SUB.library.sources, label: "Data Sources",     content: <AboutView /> },
          ]} />
        </main>
      ) : tab === "natl" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <SubTabLayout key={subKey} initial={subTab} tabs={[
            { id: SUB.natl.cdc,   label: "CDC Overdose Counts", content: <CDCView /> },
            { id: SUB.natl.nsduh, label: "NSDUH Prevalence",    content: <NSDUHView /> },
            { id: SUB.natl.demo,  label: "OD Demographics",     content: <DemographicsView /> },
            { id: SUB.natl.gap,   label: "Treatment Gap",       content: <TreatmentGapView /> },
            { id: SUB.natl.ww,    label: "Wastewater (AZ pilot)", content: <WastewaterView /> },
          ]} />
        </main>
      ) : (
        /* Chat view */
        <main className="flex-1 overflow-y-auto relative">
          {isEmpty ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm px-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-compass-purple/10 flex items-center justify-center text-compass-purple">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-compass-white font-semibold text-sm mb-1">Ask COMPASS anything</p>
                <p className="text-compass-muted text-xs leading-relaxed">
                  Type a question below about OUD medications, clinical guidelines, or Tennessee policy — or visit{" "}
                  <button onClick={() => go({ tab: "home" })} className="text-compass-purple hover:underline font-medium">
                    Home
                  </button>{" "}
                  for example questions.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onNavigate={go} />
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
