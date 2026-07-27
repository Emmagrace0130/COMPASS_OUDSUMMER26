import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface Timepoint {
  timepoint: string;
  n_enrolled: number;
  n_responded: number;
  response_rate: number;
  retention_pct: number;
  abstinence_pct: number;
  overdose_pct: number;
  bup_pct: number;
  mmt_pct: number;
  ntx_pct: number;
  coun_pct: number;
}

interface TreatmentOutcome {
  treatment: string;
  n: number;
  abstinence_pct: number;
  overdose_pct: number;
  retention_pct: number;
}

interface MOUDData {
  timepoints: Timepoint[];
  treatment_outcomes: TreatmentOutcome[];
  enrollment: number;
  employed_pct: number;
  insured_pct: number;
  source: string;
}

const TX_COLORS: Record<string, string> = {
  "Methadone":       "#d97316",
  "Buprenorphine":   "#14b8a6",
  "Naltrexone":      "#a78bfa",
  "Counseling Only": "#fb923c",
};
const MUTED = "#8a8278";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function MOUDView() {
  const [data, setData]     = useState<MOUDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/data/moud")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load MOUD study data."))
      .finally(() => setLoading(false));
  }, []);

  const baseline = useMemo(() => data?.timepoints.find(t => t.timepoint === "Baseline"), [data]);
  const latest   = useMemo(() => data?.timepoints[data.timepoints.length - 1], [data]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading MOUD study data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">CDC MOUD Study — Longitudinal Outcomes</h2>
        <p className="text-compass-muted text-xs mt-1">{data.source}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Patients Enrolled"   value={data.enrollment.toLocaleString()} color="#d97316" sub="62 outpatient facilities" />
        <StatCard label="In Treatment at 18m" value={`${latest?.retention_pct ?? 0}%`} color="#14b8a6" sub="of those who responded" />
        <StatCard label="Abstinent at 18m"    value={`${latest?.abstinence_pct ?? 0}%`} color="#a78bfa" sub="opioid-free past 30 days" />
        <StatCard label="Overdose Rate 18m"   value={`${latest?.overdose_pct ?? 0}%`}  color="#f43f5e" sub="vs baseline" />
      </div>

      {/* Retention & abstinence over time */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
          Retention & Abstinence Over Time (% of respondents)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.timepoints} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="timepoint" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
            <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
            <Line type="monotone" dataKey="retention_pct"  name="In Treatment"       stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="abstinence_pct" name="Opioid Abstinence"  stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="overdose_pct"   name="Overdose"           stroke="#f43f5e" strokeWidth={1.8} dot={{ r: 3 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Treatment mix over time + outcomes by treatment */}
      <div className="grid grid-cols-2 gap-4">

        {/* Treatment mix */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Treatment Type Over Time (% of respondents)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.timepoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="timepoint" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
              <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
              <Bar dataKey="mmt_pct"  name="Methadone"       stackId="a" fill={TX_COLORS["Methadone"]}       />
              <Bar dataKey="bup_pct"  name="Buprenorphine"   stackId="a" fill={TX_COLORS["Buprenorphine"]}   />
              <Bar dataKey="ntx_pct"  name="Naltrexone"      stackId="a" fill={TX_COLORS["Naltrexone"]}      />
              <Bar dataKey="coun_pct" name="Counseling Only" stackId="a" fill={TX_COLORS["Counseling Only"]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcomes by treatment type */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Outcomes by Treatment Type (all follow-ups pooled)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.treatment_outcomes} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="treatment" tick={{ fontSize: 9, fill: MUTED }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
              <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
              <Bar dataKey="retention_pct"  name="Retention"    radius={[2,2,0,0]}>
                {data.treatment_outcomes.map(t => <Cell key={t.treatment} fill={TX_COLORS[t.treatment] ?? "#d97316"} />)}
              </Bar>
              <Bar dataKey="abstinence_pct" name="Abstinence"   fill="#a78bfa" fillOpacity={0.7} radius={[2,2,0,0]} />
              <Bar dataKey="overdose_pct"   name="Overdose"     fill="#f43f5e" fillOpacity={0.7} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Response & sample size */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">Study Retention — Response Rates Over Time</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.timepoints} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="timepoint" tick={{ fontSize: 10, fill: MUTED }} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [v, name === "n_responded" ? "Responded" : "Enrolled"]} />
            <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
            <Bar dataKey="n_enrolled"  name="Enrolled"   fill="#3a3530" radius={[2,2,0,0]} />
            <Bar dataKey="n_responded" name="Responded"  fill="#d97316" fillOpacity={0.85} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Baseline context */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Employed at Baseline"  value={`${data.employed_pct}%`} color="#d97316" />
        <StatCard label="Insured at Baseline"   value={`${data.insured_pct}%`}  color="#14b8a6" />
        <StatCard label="Baseline Overdose Rate" value={`${baseline?.overdose_pct ?? 0}%`} color="#f43f5e" sub="prior 30 days" />
      </div>

    </div>
  );
}
