import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface Trend { year: number; [indicator: string]: number; }
interface CountyRow { county: string; "All Opioids for Pain"?: number; "All Benzodiazepines"?: number; }
interface Summary {
  peak_year: number;
  pct_decline: number;
  latest_year: number;
  latest_opioid_rate: number;
  latest_benzo_rate: number;
}
interface PrescriptionData {
  trends: Trend[];
  county_by_year: Record<string, CountyRow[]>;
  summary: Summary;
  indicators: string[];
}

const OPIOID_COLORS: Record<string, string> = {
  "All Opioids for Pain": "#f43f5e",
  Hydrocodone:            "#d97316",
  Oxycodone:              "#fb923c",
  Tramadol:               "#a78bfa",
};
const BENZO_COLORS: Record<string, string> = {
  "All Benzodiazepines":  "#14b8a6",
  Alprazolam:             "#34d399",
  Clonazepam:             "#60a5fa",
  Diazepam:               "#818cf8",
  Lorazepam:              "#e879f9",
};
const MUTED = "#8a8278";

const ALL_COLORS = { ...OPIOID_COLORS, ...BENZO_COLORS };

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function PrescriptionView() {
  const [data, setData]       = useState<PrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [year, setYear]       = useState("2024");
  const [metric, setMetric]   = useState<"All Opioids for Pain" | "All Benzodiazepines">("All Opioids for Pain");
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["All Opioids for Pain", "All Benzodiazepines", "Hydrocodone", "Oxycodone"])
  );

  useEffect(() => {
    fetch("/data/prescriptions")
      .then(r => r.json())
      .then((d: PrescriptionData) => setData(d))
      .catch(() => setError("Could not load prescription data."))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => data ? Object.keys(data.county_by_year).sort() : [], [data]);

  const topCounties = useMemo(() => {
    if (!data) return [];
    return (data.county_by_year[year] ?? []).slice(0, 20).map(c => ({
      county: c.county,
      rate: c[metric] ?? 0,
    }));
  }, [data, year, metric]);

  const toggleLine = (ind: string) =>
    setActiveLines(prev => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading prescription data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  const { summary } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Tennessee Prescription Trends</h2>
        <p className="text-compass-muted text-xs mt-1">Opioid &amp; benzodiazepine prescribing rates per 1,000 residents · All 95 counties · 2013–2024 · Source: TN CSMD</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Opioid Rx Rate (2024)"
          value={summary.latest_opioid_rate?.toLocaleString() ?? "—"}
          sub="per 1,000 residents"
          color="#f43f5e"
        />
        <StatCard
          label="Benzo Rx Rate (2024)"
          value={summary.latest_benzo_rate?.toLocaleString() ?? "—"}
          sub="per 1,000 residents"
          color="#14b8a6"
        />
        <StatCard
          label="Opioid Decline Since 2013"
          value={summary.pct_decline ? `${summary.pct_decline}%` : "—"}
          sub="reduction in prescribing rate"
          color="#fb923c"
        />
        <StatCard
          label="Peak Prescribing Year"
          value={summary.peak_year?.toString() ?? "—"}
          sub="highest opioid Rx rate"
          color="#a78bfa"
        />
      </div>

      {/* Trend line chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Statewide Prescribing Rate Over Time</h3>
          <div className="flex flex-wrap gap-2">
            {data.indicators.map(ind => (
              <button
                key={ind}
                onClick={() => toggleLine(ind)}
                className="text-[9px] tracking-wide px-2 py-1 rounded border transition-all"
                style={activeLines.has(ind)
                  ? { background: ALL_COLORS[ind] ?? "#888", borderColor: ALL_COLORS[ind] ?? "#888", color: "#fff" }
                  : { borderColor: "rgb(var(--tw-c-rim))", color: "rgb(var(--tw-c-muted))" }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trends} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "per 1,000"]} />
            <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
            {data.indicators.map(ind =>
              activeLines.has(ind) ? (
                <Line
                  key={ind}
                  type="monotone"
                  dataKey={ind}
                  stroke={ALL_COLORS[ind] ?? "#888"}
                  strokeWidth={ind.startsWith("All") ? 2.5 : 1.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* County rankings */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Top 20 Counties by Prescribing Rate</h3>
          <div className="flex items-center gap-3">
            <select
              value={metric}
              onChange={e => setMetric(e.target.value as typeof metric)}
              className="text-[10px] tracking-wide rounded-lg px-2.5 py-1.5 border border-rim text-compass-muted bg-panel focus:outline-none"
            >
              <option value="All Opioids for Pain">Opioids</option>
              <option value="All Benzodiazepines">Benzodiazepines</option>
            </select>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="text-[10px] tracking-wide rounded-lg px-2.5 py-1.5 border border-rim text-compass-muted bg-panel focus:outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={topCounties} layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis type="category" dataKey="county" tick={{ fontSize: 9, fill: MUTED }} width={80} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "per 1,000"]} />
            <Bar dataKey="rate" radius={[0, 3, 3, 0]}
              fill={metric === "All Opioids for Pain" ? "#f43f5e" : "#14b8a6"}
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-compass-muted/50 mt-2 text-center tracking-wide">Rate per 1,000 residents · {year}</p>
      </div>

    </div>
  );
}
