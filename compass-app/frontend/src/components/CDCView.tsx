import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface CDCData {
  tn_trends: Record<string, number | string>[];
  tn_indicators: string[];
  tn_counties: { county: string; deaths: number }[];
  national_drug_trends: Record<string, number | string>[];
  national_drugs: string[];
}

const COLORS = ["#d97316","#f43f5e","#14b8a6","#fb923c","#a78bfa","#34d399","#60a5fa"];
const MUTED   = "#8a8278";

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function CDCView() {
  const [data, setData]     = useState<CDCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/cdc")
      .then(r => r.json())
      .then((d: CDCData) => {
        setData(d);
        setActiveIndicators(new Set(d.tn_indicators));
      })
      .catch(() => setError("Could not load CDC data."))
      .finally(() => setLoading(false));
  }, []);

  // latest TN total deaths
  const latestTNTotal = useMemo(() => {
    if (!data) return null;
    const label = "Total Overdose Deaths";
    const rows = data.tn_trends.filter(r => label in r);
    if (!rows.length) return null;
    return rows[rows.length - 1][label] as number;
  }, [data]);

  // latest fentanyl count
  const latestFentanyl = useMemo(() => {
    if (!data) return null;
    const label = "Synthetic Opioids (fentanyl)";
    const rows = data.tn_trends.filter(r => label in r);
    if (!rows.length) return null;
    return rows[rows.length - 1][label] as number;
  }, [data]);

  // top TN county
  const topCounty = useMemo(() => data?.tn_counties[0] ?? null, [data]);

  // latest national fentanyl
  const latestNatFentanyl = useMemo(() => {
    if (!data) return null;
    const rows = data.national_drug_trends.filter(r => "Fentanyl" in r);
    if (!rows.length) return null;
    return (rows[rows.length - 1]["Fentanyl"] as number).toLocaleString();
  }, [data]);

  // thin out TN trend data to annual (December only) for readability
  const tnTrendAnnual = useMemo(() => {
    if (!data) return [];
    return data.tn_trends.filter(r => (r.period as string).endsWith("-12"));
  }, [data]);

  // thin out national drug data to ~annual
  const nationalAnnual = useMemo(() => {
    if (!data) return [];
    return data.national_drug_trends.filter((_, i) => i % 12 === 0);
  }, [data]);

  // top 15 TN counties
  const topCounties = useMemo(() => data?.tn_counties.slice(0, 15) ?? [], [data]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading CDC data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  const toggleIndicator = (ind: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">CDC Overdose Surveillance Data</h2>
        <p className="text-compass-muted text-xs mt-1">Provisional overdose death counts · Tennessee state & county · National drug trends</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="TN Overdose Deaths (latest)"  value={latestTNTotal?.toLocaleString() ?? "—"}   color="#d97316" sub="12-month ending" />
        <StatCard label="TN Synthetic Opioids"          value={latestFentanyl?.toLocaleString() ?? "—"}  color="#f43f5e" sub="fentanyl era" />
        <StatCard label="Top TN County"                 value={topCounty?.county ?? "—"}                 color="#14b8a6" sub={topCounty ? `${topCounty.deaths.toLocaleString()} deaths` : ""} />
        <StatCard label="US Fentanyl Deaths (latest)"   value={latestNatFentanyl ?? "—"}                 color="#a78bfa" sub="12-month rolling" />
      </div>

      {/* TN trends by indicator */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Tennessee Overdose Deaths by Drug Type</h3>
          <div className="flex flex-wrap gap-2">
            {data.tn_indicators.map((ind, i) => (
              <button key={ind} onClick={() => toggleIndicator(ind)}
                className={`text-[9px] tracking-wide px-2 py-1 rounded border transition-all ${
                  activeIndicators.has(ind)
                    ? "border-transparent text-void"
                    : "border-rim text-compass-muted bg-transparent"
                }`}
                style={activeIndicators.has(ind) ? { background: COLORS[i % COLORS.length] } : {}}
              >{ind}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={tnTrendAnnual} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="period" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {data.tn_indicators.map((ind, i) =>
              activeIndicators.has(ind) ? (
                <Line key={ind} type="monotone" dataKey={ind} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={ind === "Total Overdose Deaths" ? 2.5 : 1.5}
                  dot={false} connectNulls />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* National drug trends + TN counties */}
      <div className="grid grid-cols-2 gap-4">

        {/* National specific drug trends */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">US Drug-Specific Overdose Deaths</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={nationalAnnual} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: MUTED }} angle={-30} textAnchor="end" height={44} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v as number).toLocaleString(), ""]} />
              <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
              {data.national_drugs.map((drug, i) => (
                <Line key={drug} type="monotone" dataKey={drug} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={drug === "Fentanyl" ? 2.5 : 1.5} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TN top counties */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Tennessee — Top Counties by Deaths</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topCounties} layout="vertical" margin={{ left: 72, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis type="category" dataKey="county" tick={{ fontSize: 9, fill: MUTED }} width={72} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Deaths"]} />
              <Bar dataKey="deaths" radius={[0, 3, 3, 0]}>
                {topCounties.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f43f5e" : "#d97316"} fillOpacity={1 - i * 0.04} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
