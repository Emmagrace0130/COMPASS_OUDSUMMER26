import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

// ── Policy / epidemic milestones ──────────────────────────────────────────────
const EVENTS = [
  { year: 2013, month: 1,  type: "policy",   label: "TN Schedule II laws enacted", detail: "Tennessee passes legislation targeting opioid pill mills; CSMD prescription monitoring enhanced." },
  { year: 2016, month: 1,  type: "epidemic", label: "Heroin era accelerates",       detail: "Prescription opioid crackdowns drive users to heroin; TN overdose deaths begin rapid rise." },
  { year: 2018, month: 4,  type: "policy",   label: "TN Together initiative",        detail: "Governor Haslam launches TN Together — statewide opioid strategy including prevention, treatment expansion, and law enforcement." },
  { year: 2019, month: 7,  type: "policy",   label: "CSMD mandatory query",          detail: "Tennessee requires mandatory CSMD queries before prescribing opioids or benzodiazepines." },
  { year: 2020, month: 3,  type: "epidemic", label: "COVID-19 disrupts treatment",   detail: "Pandemic begins. Treatment programs disrupted. Telehealth flexibilities for buprenorphine introduced. Overdose deaths surge." },
  { year: 2021, month: 1,  type: "epidemic", label: "Fentanyl dominates supply",     detail: "Illicit fentanyl overtakes heroin entirely in TN drug supply. Overdose deaths hit record highs statewide." },
  { year: 2021, month: 6,  type: "policy",   label: "TennCare bup prior auth eased", detail: "TennCare reduces prior authorization barriers for buprenorphine to expand MOUD access." },
  { year: 2022, month: 1,  type: "epidemic", label: "Xylazine detected in TN",       detail: "Xylazine ('tranq') identified in Knox County overdose deaths. Complicates naloxone reversal; causes severe wounds." },
  { year: 2023, month: 1,  type: "policy",   label: "X-waiver eliminated nationally",detail: "DEA eliminates DATA waiver requirement — any DEA-licensed prescriber can now prescribe buprenorphine for OUD without special certification." },
  { year: 2023, month: 6,  type: "policy",   label: "TN buprenorphine guidelines updated", detail: "Tennessee updates prescribing guidelines for buprenorphine to reflect fentanyl-era induction protocols and expanded prescriber access." },
  { year: 2024, month: 1,  type: "policy",   label: "OAC grants distributed",        detail: "TN Opioid Abatement Council approves $80.9M in grants to 85 organizations across Tennessee from Purdue Sackler settlement funds." },
  { year: 2024, month: 6,  type: "epidemic", label: "Nitazenes emerging",            detail: "Novel synthetic opioids (nitazenes) begin appearing in TN toxicology reports, potency exceeds fentanyl." },
];

const ERA_PHASES = [
  { start: 2013, end: 2015.5, label: "Prescription\nOpioid Era",  color: "rgba(167,139,250,0.07)" },
  { start: 2015.5, end: 2018, label: "Heroin\nTransition",         color: "rgba(217,115,22,0.07)"  },
  { start: 2018, end: 2020.5, label: "Poly-drug\nEra",             color: "rgba(20,184,166,0.07)"  },
  { start: 2020.5, end: 2023, label: "Fentanyl\nEra",              color: "rgba(244,63,94,0.10)"   },
  { start: 2023, end: 2025,   label: "Fentanyl +\nXylazine Era",   color: "rgba(244,63,94,0.16)"   },
];

const EVENT_COLORS: Record<string, string> = {
  policy:   "#14b8a6",
  epidemic: "#f43f5e",
};

const MUTED = "#8a8278";

interface TNODData {
  fatal_trends: Record<string, number | string>[];
  fatal_indicators: string[];
}

const KEY_INDICATORS = [
  { key: "All Drug OD Deaths",         color: "#f43f5e", width: 2.5 },
  { key: "Fentanyl",                   color: "#fb923c", width: 2   },
  { key: "All Opioids",                color: "#d97316", width: 1.5 },
  { key: "Meth/Stimulants",            color: "#a78bfa", width: 1.5 },
  { key: "Cocaine",                    color: "#14b8a6", width: 1.5 },
  { key: "Heroin",                     color: "#60a5fa", width: 1.5 },
];

export function TNTimelineView() {
  const [data, setData]         = useState<TNODData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [activeEvent, setActiveEvent] = useState<typeof EVENTS[0] | null>(null);
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["All Drug OD Deaths", "Fentanyl", "All Opioids"])
  );

  useEffect(() => {
    fetch("/data/tn_od")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load timeline data."))
      .finally(() => setLoading(false));
  }, []);

  // Chart data: one row per year with death counts
  const chartData = useMemo((): Record<string, number | null>[] => {
    if (!data) return [];
    return data.fatal_trends.map(row => ({
      year: Number(row.year),
      ...Object.fromEntries(
        KEY_INDICATORS.map(ind => [ind.key, row[ind.key] != null ? Number(row[ind.key]) : null])
      ),
    }));
  }, [data]);

  // Peak year for total deaths
  const peakYear = useMemo(() => {
    const rows = chartData.filter(r => r["All Drug OD Deaths"] != null);
    if (!rows.length) return null;
    return rows.reduce((a, b) => (a["All Drug OD Deaths"] ?? 0) > (b["All Drug OD Deaths"] ?? 0) ? a : b);
  }, [chartData]);

  // Latest year total
  const latestRow = useMemo(() => chartData[chartData.length - 1], [chartData]);

  const toggleLine = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading timeline…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Tennessee Opioid Epidemic Timeline</h2>
        <p className="text-compass-muted text-xs mt-1">
          TN Department of Health fatal overdose data 2013–2023 · Key policy events & epidemic milestones
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-rose-400">{peakYear?.["All Drug OD Deaths"]?.toLocaleString() ?? "—"}</p>
          <p className="text-[10px] text-compass-muted mt-0.5">Peak year deaths ({peakYear?.year})</p>
          <p className="text-[10px] text-compass-muted/60 mt-1 uppercase tracking-wide">All drug OD deaths</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{latestRow?.["All Drug OD Deaths"]?.toLocaleString() ?? "—"}</p>
          <p className="text-[10px] text-compass-muted mt-0.5">Deaths in {latestRow?.year}</p>
          <p className="text-[10px] text-compass-muted/60 mt-1 uppercase tracking-wide">Most recent year</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">{latestRow?.["Fentanyl"]?.toLocaleString() ?? "—"}</p>
          <p className="text-[10px] text-compass-muted mt-0.5">Fentanyl deaths ({latestRow?.year})</p>
          <p className="text-[10px] text-compass-muted/60 mt-1 uppercase tracking-wide">Synthetic opioid</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">
            {chartData.length > 1
              ? `${Math.round(((latestRow?.["All Drug OD Deaths"] ?? 0) / (chartData[0]?.["All Drug OD Deaths"] ?? 1) - 1) * 100)}%`
              : "—"}
          </p>
          <p className="text-[10px] text-compass-muted mt-0.5">Increase 2013→{latestRow?.year}</p>
          <p className="text-[10px] text-compass-muted/60 mt-1 uppercase tracking-wide">All drug OD deaths</p>
        </div>
      </div>

      {/* Main chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">TN Drug Overdose Deaths by Type — 2013 to 2023</h3>
          <div className="flex flex-wrap gap-2">
            {KEY_INDICATORS.map(ind => (
              <button key={ind.key} onClick={() => toggleLine(ind.key)}
                className={`text-[9px] tracking-wide px-2 py-1 rounded border transition-all ${
                  activeLines.has(ind.key) ? "border-transparent text-void" : "border-rim text-compass-muted"
                }`}
                style={activeLines.has(ind.key) ? { background: ind.color } : {}}>
                {ind.key}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v as number).toLocaleString(), ""]} />

            {/* Era phase backgrounds */}
            {ERA_PHASES.map(phase => (
              <ReferenceLine key={phase.label} x={phase.start} stroke="transparent">
                <Label position="insideTopRight" value="" />
              </ReferenceLine>
            ))}

            {/* Event markers */}
            {EVENTS.filter(e => e.year >= 2013 && e.year <= 2023).map(ev => (
              <ReferenceLine key={ev.label} x={ev.year}
                stroke={EVENT_COLORS[ev.type]} strokeDasharray="3 3" strokeOpacity={0.5}
                strokeWidth={activeEvent?.label === ev.label ? 2 : 1} />
            ))}

            {KEY_INDICATORS.filter(ind => activeLines.has(ind.key)).map(ind => (
              <Line key={ind.key} type="monotone" dataKey={ind.key}
                stroke={ind.color} strokeWidth={ind.width}
                dot={{ r: 3, fill: ind.color }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Era labels */}
        <div className="flex text-[9px] text-compass-muted/60 mt-1 gap-4 flex-wrap">
          {ERA_PHASES.map(p => (
            <span key={p.label} className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm inline-block" style={{ background: p.color.replace("0.07","0.5").replace("0.10","0.5").replace("0.16","0.5") }} />
              {p.label.replace("\n", " ")} ({p.start}–{p.end})
            </span>
          ))}
        </div>
      </div>

      {/* Timeline events */}
      <div>
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-3">Key Milestones & Policy Events</h3>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[88px] top-0 bottom-0 w-px bg-compass-purple/20" />

          <div className="space-y-0">
            {EVENTS.map((ev, i) => (
              <div key={i}
                className={`flex gap-4 cursor-pointer group ${i > 0 ? "mt-0" : ""}`}
                onClick={() => setActiveEvent(activeEvent?.label === ev.label ? null : ev)}>

                {/* Year + dot */}
                <div className="flex items-start gap-3 shrink-0 w-[88px]">
                  <span className="text-[10px] text-compass-muted tabular-nums pt-3">{ev.year}</span>
                  <div className="relative flex items-center justify-center mt-3">
                    <div className="w-3 h-3 rounded-full border-2 transition-all"
                      style={{
                        borderColor: EVENT_COLORS[ev.type],
                        background: activeEvent?.label === ev.label ? EVENT_COLORS[ev.type] : "rgb(var(--tw-c-void))",
                        boxShadow: activeEvent?.label === ev.label ? `0 0 8px ${EVENT_COLORS[ev.type]}` : "none",
                      }} />
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 pt-2 border-b border-compass-purple/10 transition-all`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: EVENT_COLORS[ev.type] + "22", color: EVENT_COLORS[ev.type] }}>
                      {ev.type}
                    </span>
                    <p className={`text-sm font-medium transition-colors ${activeEvent?.label === ev.label ? "text-compass-white" : "text-compass-white/80 group-hover:text-compass-white"}`}>
                      {ev.label}
                    </p>
                  </div>
                  {(activeEvent?.label === ev.label) && (
                    <p className="text-xs text-compass-muted leading-relaxed mt-2 max-w-2xl">
                      {ev.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fentanyl era deep dive */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Fentanyl Takeover — TN Death Composition Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData.filter(r => r["All Drug OD Deaths"])}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.06)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v as number)?.toLocaleString() ?? "—", ""]} />
            <Area type="monotone" dataKey="Heroin"          stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.5} />
            <Area type="monotone" dataKey="Fentanyl"        stackId="2" stroke="#fb923c" fill="#fb923c" fillOpacity={0.7} />
            <Area type="monotone" dataKey="Meth/Stimulants" stackId="3" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.5} />
            <Area type="monotone" dataKey="Cocaine"         stackId="4" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 flex-wrap">
          {[["Fentanyl","#fb923c"],["Heroin","#60a5fa"],["Meth/Stimulants","#a78bfa"],["Cocaine","#14b8a6"]].map(([l,c]) => (
            <span key={l} className="flex items-center gap-1 text-[9px] text-compass-muted">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
