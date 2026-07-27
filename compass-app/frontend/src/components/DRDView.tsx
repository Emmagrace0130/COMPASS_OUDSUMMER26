import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface DRDRecord {
  case_number: string;
  county?: string;
  sex?: string;
  race?: string;
  ethnicity?: string;
  date?: string;
  age?: number;
  location_type?: string;
  city?: string;
  zip?: string | number;
  cause?: string;
  cod_type?: string;
  toxicology: string[];
  homeless?: string;
  source: string;
}

const AMBER  = "#d97316";
const GOLD   = "#fb923c";
const TEAL   = "#14b8a6";
const ROSE   = "#f43f5e";
const MUTED  = "#8a8278";


function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function DRDView() {
  const [records, setRecords] = useState<DRDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sexFilter, setSexFilter] = useState("ALL");
  const [raceFilter, setRaceFilter] = useState("ALL");

  useEffect(() => {
    fetch("/data/drd")
      .then(r => r.json())
      .then(d => setRecords(d.records))
      .catch(() => setError("Could not load DRD data."))
      .finally(() => setLoading(false));
  }, []);

  // ── derived stats ──────────────────────────────────────────────
  const totalCases = records.length;

  // Only records with toxicology data are Knox Co. autopsy cases — use those as denominator
  const toxRecords = useMemo(() => records.filter(r => r.toxicology.length > 0), [records]);

  const fentanylPct = useMemo(() => {
    if (!toxRecords.length) return 0;
    const n = toxRecords.filter(r => r.toxicology.some(t => t.toLowerCase().includes("fentanyl"))).length;
    return Math.round((n / toxRecords.length) * 100);
  }, [toxRecords]);

  const xylazinePct = useMemo(() => {
    if (!toxRecords.length) return 0;
    const n = toxRecords.filter(r => r.toxicology.some(t => t.toLowerCase().includes("xylazine"))).length;
    return Math.round((n / toxRecords.length) * 100);
  }, [toxRecords]);

  const avgAge = useMemo(() => {
    const ages = records.map(r => r.age).filter((a): a is number => typeof a === "number");
    return ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
  }, [records]);

  // ── top substances ─────────────────────────────────────────────
  const topSubstances = useMemo(() => {
    const counts: Record<string, number> = {};
    const SKIP = new Set(["caffeine", "cotinine", "nicotine"]);
    for (const r of records)
      for (const t of r.toxicology)
        if (!SKIP.has(t.toLowerCase())) counts[t] = (counts[t] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [records]);

  // ── monthly trend ──────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      if (!r.date) continue;
      const ym = r.date.slice(0, 7);
      counts[ym] = (counts[ym] ?? 0) + 1;
    }
    return Object.entries(counts).sort().map(([month, count]) => ({ month, count }));
  }, [records]);

  // ── sex / race breakdown ───────────────────────────────────────
  const sexData = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of records) if (r.sex) c[r.sex] = (c[r.sex] ?? 0) + 1;
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [records]);

  const raceData = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of records) if (r.race) c[r.race] = (c[r.race] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [records]);

  const PIE_COLORS = [AMBER, TEAL, ROSE, GOLD, "#a78bfa", "#34d399"];

  // ── filtered table ─────────────────────────────────────────────
  const sexOptions  = useMemo(() => ["ALL", ...new Set(records.map(r => r.sex).filter(Boolean) as string[])], [records]);
  const raceOptions = useMemo(() => ["ALL", ...new Set(records.map(r => r.race).filter(Boolean) as string[])], [records]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r =>
      (sexFilter  === "ALL" || r.sex  === sexFilter) &&
      (raceFilter === "ALL" || r.race === raceFilter) &&
      (!q || (r.cause ?? "").toLowerCase().includes(q) ||
             (r.city  ?? "").toLowerCase().includes(q) ||
             r.toxicology.some(t => t.toLowerCase().includes(q)) ||
             (r.case_number ?? "").toLowerCase().includes(q))
    );
  }, [records, search, sexFilter, raceFilter]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading DRD data…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Knox County Drug-Related Deaths</h2>
        <p className="text-compass-muted text-xs mt-1">2025 medical examiner case data · individual-level toxicology records</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Cases"     value={totalCases}                    color={AMBER} />
        <StatCard label="Fentanyl Involved" value={`${fentanylPct}%`} color={ROSE}  />
        <StatCard label="Xylazine Detected" value={`${xylazinePct}%`} color={TEAL}  />
        <StatCard label="Average Age"     value={avgAge}                            color={GOLD}  />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top substances */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Top Substances Detected</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topSubstances} layout="vertical" margin={{ left: 80, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: MUTED }} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Cases"]} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {topSubstances.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? ROSE : i === 1 ? AMBER : GOLD} fillOpacity={1 - i * 0.05} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Deaths by Month</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Deaths"]} />
              <Line type="monotone" dataKey="count" stroke={AMBER} strokeWidth={2}
                dot={{ fill: AMBER, r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 — demographics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">By Sex</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={sexData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {sexData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">By Race</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={raceData} margin={{ top: 0, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: MUTED }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {raceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-compass-purple/10 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by cause, city, substance, case #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-rim bg-panel px-3 py-2 text-sm text-compass-white placeholder-compass-muted focus:outline-none focus:ring-1 focus:ring-compass-purple/50"
          />
          <select value={sexFilter} onChange={e => setSexFilter(e.target.value)}
            className="rounded-lg border border-rim bg-panel px-3 py-2 text-sm text-compass-white focus:outline-none focus:ring-1 focus:ring-compass-purple/50">
            {sexOptions.map(s => <option key={s} value={s} className="bg-panel">{s === "ALL" ? "All sexes" : s}</option>)}
          </select>
          <select value={raceFilter} onChange={e => setRaceFilter(e.target.value)}
            className="rounded-lg border border-rim bg-panel px-3 py-2 text-sm text-compass-white focus:outline-none focus:ring-1 focus:ring-compass-purple/50">
            {raceOptions.map(r => <option key={r} value={r} className="bg-panel">{r === "ALL" ? "All races" : r}</option>)}
          </select>
          <span className="self-center text-[10px] text-compass-muted shrink-0 tracking-wide">{filtered.length} cases</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-compass-purple/10">
              <tr>
                {["Case #", "Date", "Age", "Sex", "Race", "City", "Cause of Death", "Substances"].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-semibold text-compass-violet/50 tracking-widest uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b border-compass-purple/5 hover:bg-compass-purple/5 transition-colors">
                  <td className="px-4 py-2 text-compass-muted font-mono">{r.case_number}</td>
                  <td className="px-4 py-2 text-compass-muted">{r.date}</td>
                  <td className="px-4 py-2 text-compass-white/80">{r.age}</td>
                  <td className="px-4 py-2 text-compass-muted">{r.sex}</td>
                  <td className="px-4 py-2 text-compass-muted">{r.race}</td>
                  <td className="px-4 py-2 text-compass-muted">{r.city}</td>
                  <td className="px-4 py-2 text-compass-white/80 max-w-[220px] truncate" title={r.cause ?? ""}>{r.cause}</td>
                  <td className="px-4 py-2 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {r.toxicology.slice(0, 4).map((t, j) => (
                        <span key={j} className="bg-compass-purple/15 text-compass-violet border border-compass-purple/25 rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap">{t}</span>
                      ))}
                      {r.toxicology.length > 4 && <span className="text-compass-muted text-[9px]">+{r.toxicology.length - 4}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-center text-[10px] text-compass-muted/40 py-3 tracking-wide">
              Showing 200 of {filtered.length} — use filters to narrow down
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
