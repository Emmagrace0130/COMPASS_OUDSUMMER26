import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface TrendRow {
  timepoint: string;
  n_enrolled: number;
  n_responded: number;
  response_rate: number;
  [key: string]: number | string | null;
}

interface OutcomesData {
  trend: TrendRow[];
  by_group: Record<string, TrendRow[]>;
  mat_counts: Record<string, number>;
  ss_counts: Record<string, number>;
  enrollment: number;
  outcome_labels: Record<string, string>;
  source: string;
}

const OUTCOME_KEYS = [
  { key: "op_abst_pct",    label: "Opioid Abstinent",    color: "#14b8a6" },
  { key: "fn_abst_pct",    label: "Fentanyl Abstinent",  color: "#34d399" },
  { key: "hr_abst_pct",    label: "Heroin Abstinent",    color: "#60a5fa" },
  { key: "in_tx_pct",      label: "In Any Treatment",    color: "#d97316" },
  { key: "employed_pct",   label: "Employed",            color: "#a78bfa" },
  { key: "overdose_pct",   label: "Overdose Event",      color: "#f43f5e" },
  { key: "ed_visit_pct",   label: "ED Visit",            color: "#fb923c" },
  { key: "mental_ill_pct", label: "Mental Illness Dx",   color: "#e879f9" },
];

const GROUP_COLORS: Record<string, string> = {
  Methadone:        "#d97316",
  Buprenorphine:    "#14b8a6",
  Naltrexone:       "#a78bfa",
  "Counseling Only":"#fb923c",
};

const MUTED = "#8a8278";

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function PatientOutcomesView() {
  const [data, setData]       = useState<OutcomesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [activeKeys, setActiveKeys] = useState<Set<string>>(
    new Set(["op_abst_pct", "in_tx_pct", "overdose_pct", "employed_pct"])
  );
  const [groupMetric, setGroupMetric] = useState("op_abst_pct");
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    new Set(["Methadone", "Buprenorphine"])
  );

  useEffect(() => {
    fetch("/data/patient_outcomes")
      .then(r => r.json())
      .then((d: OutcomesData) => setData(d))
      .catch(() => setError("Could not load patient outcomes data."))
      .finally(() => setLoading(false));
  }, []);

  const pieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.mat_counts).map(([label, n]) => ({
      name: label, value: n, color: GROUP_COLORS[label] ?? "#888",
    }));
  }, [data]);

  const ssPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Low",      value: data.ss_counts.Low,      color: "#f43f5e" },
      { name: "Moderate", value: data.ss_counts.Moderate, color: "#d97316" },
      { name: "High",     value: data.ss_counts.High,     color: "#14b8a6" },
    ];
  }, [data]);

  // Merge by_group data into a single series per timepoint for the comparison chart
  const groupTrend = useMemo(() => {
    if (!data) return [];
    const tps = ["Baseline", "3-month", "6-month", "12-month", "18-month"];
    return tps.map(tp => {
      const row: Record<string, number | string | null> = { timepoint: tp };
      for (const [group, rows] of Object.entries(data.by_group)) {
        const r = rows.find(x => x.timepoint === tp);
        row[group] = r ? (r[groupMetric] as number | null) : null;
      }
      return row;
    });
  }, [data, groupMetric]);

  const toggleKey = (key: string) => setActiveKeys(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const toggleGroup = (g: string) => setActiveGroups(prev => {
    const next = new Set(prev);
    next.has(g) ? next.delete(g) : next.add(g);
    return next;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading patient outcomes data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  const latest = data.trend[data.trend.length - 1];
  const baseline = data.trend[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Patient Outcomes — MOUD Longitudinal Study</h2>
        <p className="text-compass-muted text-xs mt-1">{data.source}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Enrolled" value={data.enrollment.toLocaleString()} sub="outpatient facilities" color="#d97316" />
        <StatCard label="Response at 18mo" value={`${latest?.response_rate ?? "—"}%`} sub={`n=${latest?.n_responded}`} color="#fb923c" />
        <StatCard label="Opioid Abstinent" value={`${latest?.op_abst_pct ?? "—"}%`} sub="at 18 months" color="#14b8a6" />
        <StatCard label="In Treatment" value={`${latest?.in_tx_pct ?? "—"}%`} sub="at 18 months" color="#a78bfa" />
        <StatCard label="Overdose Rate" value={`${latest?.overdose_pct ?? "—"}%`} sub={`vs ${baseline?.overdose_pct}% baseline`} color="#f43f5e" />
      </div>

      {/* Treatment group + social support row */}
      <div className="grid grid-cols-3 gap-4">

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-amber mb-3">Treatment Group Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={2}>
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} patients`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-compass-muted">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.name} ({Math.round(d.value / data.enrollment * 100)}%)
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-teal mb-3">Social Support at Baseline</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ssPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={2}>
                {ssPieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} patients`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {ssPieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-compass-muted">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.name} ({Math.round(d.value / data.enrollment * 100)}%)
              </div>
            ))}
          </div>
          <p className="text-[10px] text-compass-muted/60 mt-2">59% had low social support at enrollment</p>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-violet mb-3">Response Rates by Timepoint</h3>
          <div className="space-y-2 mt-1">
            {data.trend.map(tp => (
              <div key={tp.timepoint} className="flex items-center gap-2">
                <span className="text-[10px] text-compass-muted w-16 shrink-0">{tp.timepoint}</span>
                <div className="flex-1 h-4 bg-rim rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-compass-violet transition-all"
                    style={{ width: `${tp.response_rate}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-compass-violet w-10 text-right">{tp.response_rate}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-compass-muted/60 mt-3">100% at baseline → 53.4% at 18 months</p>
        </div>

      </div>

      {/* Longitudinal trend chart */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-bold tracking-widets uppercase text-compass-muted">Outcome Trends Over 18 Months</h3>
          <div className="flex flex-wrap gap-2">
            {OUTCOME_KEYS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleKey(key)}
                className="text-[9px] tracking-wide px-2 py-1 rounded border transition-all"
                style={activeKeys.has(key)
                  ? { background: color, borderColor: color, color: "#fff" }
                  : { borderColor: "rgb(var(--tw-c-rim))", color: "rgb(var(--tw-c-muted))" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="timepoint" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
            <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
            {OUTCOME_KEYS.map(({ key, label, color }) =>
              activeKeys.has(key) ? (
                <Line key={key} type="monotone" dataKey={key} name={label}
                  stroke={color} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Outcomes by treatment group */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-muted">Outcomes by Treatment Group</h3>
          <div className="flex items-center gap-3">
            <select
              value={groupMetric}
              onChange={e => setGroupMetric(e.target.value)}
              className="text-[10px] rounded-lg px-2.5 py-1.5 border border-rim text-compass-muted bg-panel focus:outline-none"
            >
              {OUTCOME_KEYS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {Object.keys(GROUP_COLORS).map(g => (
                <button
                  key={g}
                  onClick={() => toggleGroup(g)}
                  className="text-[9px] tracking-wide px-2 py-1 rounded border transition-all"
                  style={activeGroups.has(g)
                    ? { background: GROUP_COLORS[g], borderColor: GROUP_COLORS[g], color: "#fff" }
                    : { borderColor: "rgb(var(--tw-c-rim))", color: "rgb(var(--tw-c-muted))" }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={groupTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="timepoint" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => v != null ? [`${v}%`, ""] : ["—", ""]} />
            <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
            {Object.keys(GROUP_COLORS).map(g =>
              activeGroups.has(g) ? (
                <Line key={g} type="monotone" dataKey={g} name={g}
                  stroke={GROUP_COLORS[g]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-compass-muted/50 mt-2 text-center">
          {OUTCOME_KEYS.find(o => o.key === groupMetric)?.label} · % of respondents at each timepoint
        </p>
      </div>

    </div>
  );
}
