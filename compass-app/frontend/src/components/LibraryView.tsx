import { useEffect, useState, useMemo } from "react";

interface Doc {
  filename: string;
  display_name: string;
  topic: string;
  topic_folder: string;
  size_kb: number;
}

const TOPIC_COLORS: Record<string, string> = {
  "OUD Medications & Treatment":          "#14b8a6",
  "Clinical Practice Guidelines":          "#d97316",
  "TN OUD Data & Surveillance":            "#f43f5e",
  "Behavioral & Counseling Treatment":     "#a78bfa",
  "Neuroscience of Opioid Dependence":     "#60a5fa",
  "Co-occurring Mental Health Conditions": "#34d399",
  "Health Equity & Access Gaps in TN":     "#fb923c",
  "Harm Reduction":                        "#e879f9",
  "Policy & Law":                          "#fbbf24",
};

function topicColor(topic: string): string {
  return TOPIC_COLORS[topic] ?? "#8a8278";
}

export function LibraryView() {
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [topicFilter, setTopic] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/library_docs")
      .then(r => r.json())
      .then(d => setDocs(d.docs))
      .catch(() => setError("Could not load library."))
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => ["All", ...Array.from(new Set(docs.map(d => d.topic))).sort()], [docs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter(d =>
      (topicFilter === "All" || d.topic === topicFilter) &&
      (!q || d.display_name.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q) || d.topic.toLowerCase().includes(q))
    );
  }, [docs, search, topicFilter]);

  const topicCounts = useMemo(() =>
    Object.fromEntries(topics.map(t => [t, t === "All" ? docs.length : docs.filter(d => d.topic === t).length])),
    [docs, topics]);

  async function loadPreview(doc: Doc) {
    const key = doc.filename;
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (previews[key]) return;
    setPreviewLoading(key);
    try {
      const r = await fetch(`/data/library_docs/preview?file=${encodeURIComponent(doc.filename)}&folder=${encodeURIComponent(doc.topic_folder)}`);
      const d = await r.json();
      setPreviews(p => ({ ...p, [key]: d.preview }));
    } catch {
      setPreviews(p => ({ ...p, [key]: "Preview unavailable." }));
    } finally {
      setPreviewLoading(null);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading library…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;

  return (
    <div className="flex h-full">

      {/* Sidebar — topic filters */}
      <aside className="w-56 shrink-0 border-r border-compass-purple/15 overflow-y-auto p-4 space-y-1">
        <p className="text-[10px] text-compass-muted tracking-widest uppercase mb-3">Topic Area</p>
        {topics.map(t => (
          <button key={t} onClick={() => setTopic(t)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 ${
              topicFilter === t ? "bg-compass-purple/15 text-compass-violet" : "text-compass-muted hover:text-compass-white hover:bg-compass-purple/5"
            }`}>
            <span className="truncate">{t}</span>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${topicFilter === t ? "bg-compass-purple/20 text-compass-violet" : "bg-rim text-compass-muted"}`}>
              {topicCounts[t]}
            </span>
          </button>
        ))}
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search bar + stats */}
        <div className="sticky top-0 bg-dark/95 backdrop-blur-md border-b border-compass-purple/10 px-6 py-3 z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-compass-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, filename, or topic…"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-panel border border-rim text-compass-white placeholder-compass-muted focus:outline-none focus:ring-1 focus:ring-compass-purple/50"
              />
            </div>
            <span className="text-[10px] text-compass-muted shrink-0">
              {filtered.length} / {docs.length} documents
            </span>
          </div>
        </div>

        {/* Document list */}
        <div className="px-6 py-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-compass-muted text-sm py-16">No documents match your search.</div>
          )}

          {filtered.map(doc => (
            <div key={doc.filename}
              className={`glass rounded-xl overflow-hidden transition-all ${expanded === doc.filename ? "border-compass-violet/30" : "border-transparent"}`}>

              {/* Header row */}
              <button className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-compass-purple/5 transition-colors"
                onClick={() => loadPreview(doc)}>

                {/* PDF icon */}
                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold"
                  style={{ background: topicColor(doc.topic) + "22", color: topicColor(doc.topic) }}>
                  PDF
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-compass-white text-sm font-medium leading-snug truncate">{doc.display_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[9px] px-2 py-0.5 rounded-full"
                      style={{ background: topicColor(doc.topic) + "22", color: topicColor(doc.topic) }}>
                      {doc.topic}
                    </span>
                    <span className="text-[10px] text-compass-muted/60">{doc.size_kb} KB</span>
                    <span className="text-[10px] text-compass-muted/40 truncate hidden sm:block">{doc.filename}</span>
                  </div>
                </div>

                {/* Expand chevron */}
                <svg className={`shrink-0 w-4 h-4 text-compass-muted transition-transform mt-1 ${expanded === doc.filename ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Preview panel */}
              {expanded === doc.filename && (
                <div className="px-4 pb-4 border-t border-compass-purple/10">
                  {previewLoading === doc.filename ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-compass-muted">
                      <div className="w-1.5 h-1.5 bg-compass-violet rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-compass-violet rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <div className="w-1.5 h-1.5 bg-compass-violet rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                      <span className="ml-1">Loading preview…</span>
                    </div>
                  ) : (
                    <p className="text-xs text-compass-muted leading-relaxed pt-3 line-clamp-6">
                      {previews[doc.filename] ?? "No preview available."}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] text-compass-muted/50">Ask COMPASS about this document:</span>
                    <button
                      className="text-[10px] tracking-widest uppercase text-compass-violet border border-compass-purple/30 hover:border-compass-violet/50 rounded-lg px-3 py-1 transition-all"
                      onClick={() => {
                        navigator.clipboard?.writeText(doc.display_name).catch(() => {});
                      }}>
                      Copy title
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
