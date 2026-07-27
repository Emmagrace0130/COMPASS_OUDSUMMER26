import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface TNODData {
  fatal_trends: Record<string, number | string>[];
  fatal_indicators: string[];
  nonfatal_trends: Record<string, number | string>[];
  nonfatal_indicators: string[];
  top_counties: { county: string; deaths: number }[];
  latest_year: number;
}

const COLORS = ["#f43f5e","#d97316","#14b8a6","#fb923c","#a78bfa","#34d399","#60a5fa","#f472b6"];
const MUTED  = "#8a8278";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function TNODView() {
  const [data, setData]     = useState<TNODData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [activeInds, setActiveInds] = useState<Set<string>>(new Set());
  const [showNonfatal, setShowNonfatal] = useState(false);

  useEffect(() => {
    fetch("/data/tn_od")
      .then(r => r.json())
      .then((d: TNODData) => {
        setData(d);
        setActiveInds(new Set(d.fatal_indicators.slice(0, 4)));
      })
      .catch(() => setError("Could not load TN overdose data."))
      .finally(() => setLoading(false));
  }, []);

  const latestTotal = useMemo(() => {
    if (!data) return null;
    const rows = data.fatal_trends.filter(r => "All Drug OD Deaths" in r);
    return rows.length ? (rows[rows.length - 1]["All Drug OD Deaths"] as number) : null;
  }, [data]);

  const latestFentanyl = useMemo(() => {
    if (!data) return null;
    const rows = data.fatal_trends.filter(r => "Fentanyl" in r);
    return rows.length ? (rows[rows.length - 1]["Fentanyl"] as number) : null;
  }, [data]);

  const latestOpioids = useMemo(() => {
    if (!data) return null;
    const rows = data.fatal_trends.filter(r => "All Opioids" in r);
    return rows.length ? (rows[rows.length - 1]["All Opioids"] as number) : null;
  }, [data]);

  const fentanylPct = useMemo(() => {
    if (!latestTotal || !latestFentanyl) return null;
    return Math.round((latestFentanyl / latestTotal) * 100);
  }, [latestTotal, latestFentanyl]);

  const toggle = (ind: string) => {
    setActiveInds(prev => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });
  };

  const currentTrends = showNonfatal ? data?.nonfatal_trends ?? [] : data?.fatal_trends ?? [];
  const currentInds   = showNonfatal ? data?.nonfatal_indicators ?? [] : data?.fatal_indicators ?? [];

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading TN overdose data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Tennessee Overdose Dashboard</h2>
        <p className="text-compass-muted text-xs mt-1">
          TN Department of Health · Fatal & nonfatal drug overdose data · County, region & state · 2013–2023
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label={`Total OD Deaths (${data.latest_year})`} value={latestTotal?.toLocaleString() ?? "—"} color="#f43f5e" sub="TN statewide" />
        <StatCard label="Opioid OD Deaths"      value={latestOpioids?.toLocaleString() ?? "—"} color="#d97316" sub={`${data.latest_year}`} />
        <StatCard label="Fentanyl OD Deaths"    value={latestFentanyl?.toLocaleString() ?? "—"} color="#fb923c" sub={`${data.latest_year}`} />
        <StatCard label="Fentanyl % of All OD"  value={fentanylPct != null ? `${fentanylPct}%` : "—"} color="#a78bfa" sub={`${data.latest_year}`} />
      </div>

      {/* Trend chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">
              {showNonfatal ? "Nonfatal Overdose — Hospital & ED Stays" : "Fatal Overdose Deaths — Tennessee Statewide"}
            </h3>
            <div className="flex rounded-lg border border-rim overflow-hidden text-[9px]">
              <button onClick={() => setShowNonfatal(false)}
                className={`px-2.5 py-1 transition-colors ${!showNonfatal ? "bg-compass-purple/20 text-compass-violet" : "text-compass-muted hover:text-compass-white"}`}>
                Fatal
              </button>
              <button onClick={() => setShowNonfatal(true)}
                className={`px-2.5 py-1 transition-colors ${showNonfatal ? "bg-compass-purple/20 text-compass-violet" : "text-compass-muted hover:text-compass-white"}`}>
                Nonfatal
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentInds.map((ind, i) => (
              <button key={ind} onClick={() => toggle(ind)}
                className={`text-[9px] tracking-wide px-2 py-1 rounded border transition-all ${
                  activeInds.has(ind) ? "border-transparent text-void" : "border-rim text-compass-muted"
                }`}
                style={activeInds.has(ind) ? { background: COLORS[i % COLORS.length] } : {}}>
                {ind}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={currentTrends} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v as number).toLocaleString(), ""]} />
            {currentInds.map((ind, i) =>
              activeInds.has(ind) ? (
                <Line key={ind} type="monotone" dataKey={ind}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={ind === "All Drug OD Deaths" || ind === "All Drug OD (Inpatient)" ? 2.5 : 1.8}
                  dot={{ r: 3 }} connectNulls />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* County rankings + combined fatal vs nonfatal */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top counties */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-1 tracking-widest uppercase">
            Top 20 Counties — All OD Deaths ({data.latest_year})
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.top_counties} layout="vertical" margin={{ left: 70, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis type="category" dataKey="county" tick={{ fontSize: 9, fill: MUTED }} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Deaths"]} />
              <Bar dataKey="deaths" radius={[0, 3, 3, 0]}>
                {data.top_counties.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f43f5e" : "#d97316"} fillOpacity={1 - i * 0.03} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fatal vs nonfatal total side by side over time */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
            Fatal vs Nonfatal — All Drug OD (State)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={data.fatal_trends.map(r => {
                const yr = r.year as number;
                const nf = data.nonfatal_trends.find(n => n.year === yr);
                return {
                  year: yr,
                  "Fatal Deaths": r["All Drug OD Deaths"] ?? null,
                  "Hospital Stays": nf?.["All Drug OD (Inpatient)"] ?? null,
                };
              })}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v as number).toLocaleString(), ""]} />
              <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
              <Bar dataKey="Fatal Deaths"   fill="#f43f5e" radius={[2,2,0,0]} fillOpacity={0.85} />
              <Bar dataKey="Hospital Stays" fill="#14b8a6" radius={[2,2,0,0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
