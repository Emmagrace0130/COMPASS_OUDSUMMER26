import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface StateRow { state: string; estimate: number; ci_low: number | null; ci_high: number | null; }
interface NSDUHData {
  tables: Record<string, StateRow[]>;
  table_labels: Record<string, string>;
}

const AMBER = "#d97316"; const ROSE = "#f43f5e"; const TEAL = "#14b8a6";
const GOLD  = "#fb923c"; const MUTED = "#8a8278";
const TN_COLOR = "#f43f5e";
const US_COLOR = "#8a8278";

const NEIGHBORS = new Set(["Tennessee","Kentucky","Virginia","North Carolina","Georgia","Alabama","Mississippi","Arkansas","Missouri"]);


function pct(v: number) { return `${v.toFixed(2)}%`; }

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-5 text-center">
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-compass-muted mt-0.5">{sub}</p>}
      <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function NSDUHView() {
  const [data, setData]       = useState<NSDUHData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [activeTable, setActiveTable] = useState("tab29");

  useEffect(() => {
    fetch("/data/nsduh")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load NSDUH data."))
      .finally(() => setLoading(false));
  }, []);

  const currentRows = useMemo(() => data?.tables[activeTable] ?? [], [data, activeTable]);

  const tnRow   = useMemo(() => currentRows.find(r => r.state === "Tennessee"), [currentRows]);
  const usRow   = useMemo(() => currentRows.find(r => r.state === "Total U.S."), [currentRows]);
  const tnRank  = useMemo(() => {
    const states = currentRows.filter(r => r.state !== "Total U.S." && !r.state.match(/Northeast|Midwest|South|West/));
    const idx = states.findIndex(r => r.state === "Tennessee");
    return idx >= 0 ? `#${idx + 1} of ${states.length}` : "—";
  }, [currentRows]);

  // Neighbors chart
  const neighborRows = useMemo(() =>
    currentRows
      .filter(r => NEIGHBORS.has(r.state))
      .sort((a, b) => b.estimate - a.estimate),
    [currentRows]);

  // Full state ranking (no regions)
  const rankingRows = useMemo(() =>
    currentRows
      .filter(r => r.state !== "Total U.S." && !r.state.match(/Northeast|Midwest|South|West/))
      .slice(0, 25),
    [currentRows]);

  // Unmet need gap
  const tnOUD      = useMemo(() => data?.tables["tab29"]?.find(r => r.state === "Tennessee"), [data]);
  const tnTreat    = useMemo(() => data?.tables["tab30"]?.find(r => r.state === "Tennessee"), [data]);
  const tnNeeds    = useMemo(() => data?.tables["tab31"]?.find(r => r.state === "Tennessee"), [data]);
  const tnUnmet    = useMemo(() => data?.tables["tab32"]?.find(r => r.state === "Tennessee"), [data]);
  const usOUD      = useMemo(() => data?.tables["tab29"]?.find(r => r.state === "Total U.S."), [data]);
  const usTreat    = useMemo(() => data?.tables["tab30"]?.find(r => r.state === "Total U.S."), [data]);

  const treatGapData = useMemo(() => [
    { label: "Tennessee", needs: tnNeeds?.estimate ?? 0, received: tnTreat?.estimate ?? 0, unmet: tnUnmet?.estimate ?? 0 },
    { label: "Total U.S.", needs: data?.tables["tab31"]?.find(r => r.state === "Total U.S.")?.estimate ?? 0,
      received: usTreat?.estimate ?? 0, unmet: data?.tables["tab32"]?.find(r => r.state === "Total U.S.")?.estimate ?? 0 },
  ], [data, tnNeeds, tnTreat, tnUnmet, usTreat]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading NSDUH data…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  const tableKeys = Object.keys(data.table_labels);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">SAMHSA NSDUH 2023–2024 State Estimates</h2>
        <p className="text-compass-muted text-xs mt-1">National Survey on Drug Use and Health · State-level small area estimates · Ages 12+</p>
      </div>

      {/* TN spotlight cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="TN Opioid Use Disorder" value={tnOUD ? pct(tnOUD.estimate) : "—"} sub={`US avg: ${usOUD ? pct(usOUD.estimate) : "—"}`} color={ROSE} />
        <StatCard label="TN Treatment Received"  value={tnTreat ? pct(tnTreat.estimate) : "—"} sub={`US avg: ${usTreat ? pct(usTreat.estimate) : "—"}`} color={TEAL} />
        <StatCard label="TN Needs Treatment"     value={tnNeeds ? pct(tnNeeds.estimate) : "—"} sub="ages 12+" color={AMBER} />
        <StatCard label="TN Unmet Need"          value={tnUnmet ? pct(tnUnmet.estimate) : "—"} sub="need but didn't receive" color={GOLD} />
      </div>

      {/* Table selector + state ranking */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">State Rankings — Top 25</h3>
          <div className="flex flex-wrap gap-1">
            {tableKeys.map(key => (
              <button key={key} onClick={() => setActiveTable(key)}
                className={`text-[9px] tracking-wide px-2 py-1 rounded border transition-all ${
                  activeTable === key
                    ? "text-void border-transparent"
                    : "border-rim text-compass-muted"
                }`}
                style={activeTable === key ? { background: AMBER } : {}}
              >
                {data.table_labels[key].split("(")[0].trim()}
              </button>
            ))}
          </div>
        </div>
        {tnRow && (
          <p className="text-xs text-compass-muted mb-3">
            Tennessee: <span style={{ color: TN_COLOR }}>{pct(tnRow.estimate)}</span>
            {tnRow.ci_low != null && tnRow.ci_high != null && (
              <span className="text-compass-muted/60"> ({pct(tnRow.ci_low)}–{pct(tnRow.ci_high)} 95% CI)</span>
            )}
            <span className="ml-3 text-compass-muted/60">Rank: {tnRank}</span>
            {usRow && <span className="ml-3">US avg: <span style={{ color: US_COLOR }}>{pct(usRow.estimate)}</span></span>}
          </p>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rankingRows} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="state" tick={{ fontSize: 8, fill: MUTED }} angle={-45} textAnchor="end" interval={0} height={70} />
            <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => `${v}%`} />
            {usRow && <ReferenceLine y={usRow.estimate} stroke={US_COLOR} strokeDasharray="4 3" label={{ value: "US avg", fill: US_COLOR, fontSize: 9 }} />}
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(2)}%`, "Estimate"]} />
            <Bar dataKey="estimate" radius={[2, 2, 0, 0]}>
              {rankingRows.map((r, i) => (
                <Cell key={i} fill={r.state === "Tennessee" ? TN_COLOR : AMBER} fillOpacity={r.state === "Tennessee" ? 1 : 0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Neighboring states + treatment gap */}
      <div className="grid grid-cols-2 gap-4">

        {/* Neighbors comparison */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-1 tracking-widest uppercase">Tennessee vs Neighboring States</h3>
          <p className="text-[10px] text-compass-muted/60 mb-4">{data.table_labels[activeTable]}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={neighborRows} margin={{ top: 4, right: 8, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="state" tick={{ fontSize: 8, fill: MUTED }} angle={-35} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(2)}%`, ""]} />
              <Bar dataKey="estimate" radius={[3, 3, 0, 0]}>
                {neighborRows.map((r, i) => (
                  <Cell key={i} fill={r.state === "Tennessee" ? TN_COLOR : AMBER} fillOpacity={r.state === "Tennessee" ? 1 : 0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Treatment gap */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-1 tracking-widest uppercase">Treatment Gap</h3>
          <p className="text-[10px] text-compass-muted/60 mb-4">Needs treatment vs. received treatment — ages 12+</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={treatGapData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(2)}%`, ""]} />
              <Bar dataKey="needs"    name="Needs treatment"    fill={ROSE}  radius={[3,3,0,0]} fillOpacity={0.85} />
              <Bar dataKey="received" name="Received treatment" fill={TEAL}  radius={[3,3,0,0]} fillOpacity={0.85} />
              <Bar dataKey="unmet"    name="Unmet need"         fill={AMBER} radius={[3,3,0,0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            {[["Needs treatment", ROSE], ["Received treatment", TEAL], ["Unmet need", AMBER]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1 text-[9px] text-compass-muted">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
