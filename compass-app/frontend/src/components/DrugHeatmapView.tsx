import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface HeatmapData {
  drugs: string[];
  matrix: number[][];
  prevalence: Record<string, number>;
  n_cases: number;
}

interface RiskMonth {
  month: string;
  n_cases: number;
  fentanyl_pct: number;
  xylazine_pct: number;
  polysubstance_pct: number;
  preliminary: boolean;
}

interface RiskWindow {
  label: string;
  fentanyl_pct: number;
  xylazine_pct: number;
  polysubstance_pct: number;
  n_cases: number;
}

interface RiskTrendData {
  months: RiskMonth[];
  risk_band: "Low" | "Elevated" | "High";
  current_window: RiskWindow;
  prior_window: RiskWindow;
  drivers: string[];
  caveats: string[];
  harm_reduction_tips: string[];
}

const RISK_COLORS: Record<string, { dot: string; text: string; ring: string }> = {
  Low:      { dot: "bg-compass-cyan",  text: "text-compass-cyan",  ring: "border-compass-cyan/30" },
  Elevated: { dot: "bg-amber-400",     text: "text-amber-400",     ring: "border-amber-400/30" },
  High:     { dot: "bg-rose-500",      text: "text-rose-500",      ring: "border-rose-500/30" },
};

const RISK_MUTED = "#8a8278";

// Short display labels for long drug names
const DRUG_LABELS: Record<string, string> = {
  "Methamphetamine":            "Meth",
  "Benzoylecgonine":            "Cocaine (M)",
  "Ecgonine Methyl Ester":      "Cocaine (M2)",
  "Delta-9 THC":                "THC",
  "Cannabinoids":               "Cannabinoids",
  "Diphenhydramine":            "Diphenhydr.",
  "Morphine - Free":            "Morphine",
  "Norbuprenorphine - Free":    "Norbuprenorphine",
  "Desmethylsertraline":        "Sertraline (M)",
  "Blood Alcohol Concentration (BAC)": "Alcohol (BAC)",
  "LIDOCAINE":                  "Lidocaine",
  "QUININE":                    "Quinine",
  "BROMAZOLAM":                 "Bromazolam",
};

function label(drug: string): string {
  return DRUG_LABELS[drug] ?? drug;
}

// Color: 0 → dark background, mid → amber, max → deep red
function heatColor(value: number, max: number, isDiag: boolean): string {
  if (value === 0) return "#1e1a16";
  const t = Math.pow(value / (max || 1), 0.6); // log-ish scale
  if (isDiag) {
    // diagonal uses a blue-teal scale
    return `rgba(20,184,166,${0.2 + t * 0.75})`;
  }
  if (t < 0.35) return `rgba(217,115,22,${0.15 + t * 1.5})`;
  if (t < 0.7)  return `rgba(249,115,22,${0.4 + (t - 0.35) * 0.9})`;
  return             `rgba(244,63,94,${0.55 + (t - 0.7) * 1.5})`;
}

function textColor(value: number, max: number, isDiag: boolean): string {
  const t = value / (max || 1);
  if (isDiag) return t > 0.3 ? "#f0ece5" : "#8a8278";
  return t > 0.25 ? "#f0ece5" : "#7a7060";
}

export function DrugHeatmapView() {
  const [data, setData]       = useState<HeatmapData | null>(null);
  const [risk, setRisk]       = useState<RiskTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null); // highlighted row/col

  useEffect(() => {
    Promise.all([
      fetch("/data/drd_heatmap").then(r => r.json()),
      fetch("/data/drd_risk_trend").then(r => r.json()),
    ])
      .then(([heatmap, riskTrend]) => {
        setData(heatmap);
        setRisk(riskTrend);
      })
      .catch(() => setError("Could not load heatmap data."))
      .finally(() => setLoading(false));
  }, []);

  const maxDiag = useMemo(() =>
    data ? Math.max(...data.matrix.map((row, i) => row[i])) : 1, [data]);

  const maxOff = useMemo(() => {
    if (!data) return 1;
    let m = 0;
    data.matrix.forEach((row, i) => row.forEach((v, j) => { if (i !== j) m = Math.max(m, v); }));
    return m;
  }, [data]);

  // Sorted order: descending by prevalence
  const sortedIdx = useMemo(() => {
    if (!data) return [];
    return data.drugs
      .map((_, i) => i)
      .sort((a, b) => data.matrix[b][b] - data.matrix[a][a]);
  }, [data]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading heatmap…</div>;
  if (error || !data) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  const n = sortedIdx.length;
  const CELL = 38;
  const LABEL_W = 110;
  const svgW = LABEL_W + n * CELL + 4;
  const svgH = LABEL_W + n * CELL + 4;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Drug Co-occurrence &amp; Supply Risk Trend</h2>
        <p className="text-compass-muted text-xs mt-1">
          Knox County medical examiner toxicology data · {data.n_cases} drug-related deaths ·
          A trend indicator of what's been found in the local drug supply — not a real-time test of any specific substance.
        </p>
      </div>

      {/* Risk banner */}
      {risk && (() => {
        const colors = RISK_COLORS[risk.risk_band];
        const chartData = risk.months.map(m => ({
          month: m.month.slice(2),
          Fentanyl: m.fentanyl_pct,
          Xylazine: m.xylazine_pct,
          "Polysubstance (3+)": m.polysubstance_pct,
          preliminary: m.preliminary,
        }));
        return (
          <div className={`glass rounded-xl p-5 border ${colors.ring}`}>
            <div className="flex items-center gap-3">
              <span className={`inline-block w-3 h-3 rounded-full ${colors.dot}`} style={{ boxShadow: "0 0 12px currentColor" }} />
              <span className={`text-sm font-bold tracking-widest uppercase ${colors.text}`}>{risk.risk_band} Risk</span>
              <span className="text-[10px] text-compass-muted tracking-wide">— {risk.current_window.label} vs. {risk.prior_window.label}</span>
            </div>

            <ul className="mt-3 space-y-1">
              {risk.drivers.map((d, i) => (
                <li key={i} className="text-xs text-compass-white/80">• {d}</li>
              ))}
            </ul>

            <div className="mt-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: RISK_MUTED }} />
                  <YAxis tick={{ fontSize: 9, fill: RISK_MUTED }} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Fentanyl" stroke="#f43f5e" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="Xylazine" stroke="#a78bfa" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="Polysubstance (3+)" stroke="#fb923c" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">
                {risk.months.some(m => m.preliminary) && "Last month shown is preliminary — recent deaths take weeks to be finalized in toxicology records."}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-[10px] font-semibold text-amber-400 tracking-widest uppercase mb-1.5">Important context</p>
              <ul className="space-y-1 mb-3">
                {risk.caveats.map((c, i) => (
                  <li key={i} className="text-[11px] text-compass-muted">{c}</li>
                ))}
              </ul>
              <p className="text-[10px] font-semibold text-compass-cyan tracking-widest uppercase mb-1.5">If you use drugs</p>
              <ul className="space-y-1">
                {risk.harm_reduction_tips.map((t, i) => (
                  <li key={i} className="text-[11px] text-compass-white/70">• {t}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-4">
        {sortedIdx.slice(0, 4).map(i => {
          const drug = data.drugs[i];
          const count = data.matrix[i][i];
          const pct = Math.round(100 * count / data.n_cases);
          return (
            <div key={drug} className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: "#14b8a6" }}>{pct}%</p>
              <p className="text-compass-white text-xs font-medium mt-0.5">{label(drug)}</p>
              <p className="text-[10px] text-compass-muted">in {count} of {data.n_cases} deaths</p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] text-compass-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(20,184,166,0.7)" }} />
          <span>Diagonal — how often this drug appeared alone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.55, 0.75, 1].map(t => (
              <div key={t} className="w-4 h-4 rounded-sm" style={{ background: heatColor(Math.round(t * maxOff), maxOff, false) }} />
            ))}
          </div>
          <span>Low → high co-occurrence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ background: "#1e1a16", border: "1px solid #282828" }} />
          <span>Never co-occurred</span>
        </div>
      </div>

      {/* Heatmap SVG */}
      <div className="glass rounded-xl p-4 overflow-auto">
        <svg width={svgW} height={svgH}
          onMouseLeave={() => { setTooltip(null); setHighlight(null); }}>

          {/* Column labels (top, rotated) */}
          {sortedIdx.map((di, ci) => (
            <text key={`col-${di}`}
              x={LABEL_W + ci * CELL + CELL / 2}
              y={LABEL_W - 4}
              textAnchor="start"
              transform={`rotate(-45, ${LABEL_W + ci * CELL + CELL / 2}, ${LABEL_W - 4})`}
              fontSize={9}
              fill={highlight === di ? "#f0ece5" : "#7a7060"}
              fontWeight={highlight === di ? "600" : "400"}>
              {label(data.drugs[di])}
            </text>
          ))}

          {/* Row labels (left) */}
          {sortedIdx.map((di, ri) => (
            <text key={`row-${di}`}
              x={LABEL_W - 6}
              y={LABEL_W + ri * CELL + CELL / 2 + 4}
              textAnchor="end"
              fontSize={9}
              fill={highlight === di ? "#f0ece5" : "#7a7060"}
              fontWeight={highlight === di ? "600" : "400"}>
              {label(data.drugs[di])}
            </text>
          ))}

          {/* Cells */}
          {sortedIdx.map((ri, rowPos) =>
            sortedIdx.map((ci, colPos) => {
              const v = data.matrix[ri][ci];
              const isDiag = ri === ci;
              const maxV = isDiag ? maxDiag : maxOff;
              const isHighlighted = highlight === ri || highlight === ci;
              return (
                <g key={`${ri}-${ci}`}
                  onMouseEnter={(e) => {
                    setHighlight(ri === ci ? ri : null);
                    const rect = (e.target as SVGElement).getBoundingClientRect();
                    setTooltip({
                      x: rect.left + window.scrollX,
                      y: rect.top + window.scrollY,
                      text: ri === ci
                        ? `${label(data.drugs[ri])}: ${v} deaths (${Math.round(100*v/data.n_cases)}%)`
                        : `${label(data.drugs[ri])} + ${label(data.drugs[ci])}: ${v} cases together`,
                    });
                    setHighlight(ri);
                  }}>
                  <rect
                    x={LABEL_W + colPos * CELL + 1}
                    y={LABEL_W + rowPos * CELL + 1}
                    width={CELL - 2}
                    height={CELL - 2}
                    rx={2}
                    fill={heatColor(v, maxV, isDiag)}
                    opacity={highlight !== null && !isHighlighted ? 0.5 : 1}
                    style={{ cursor: "crosshair", transition: "opacity 0.1s" }}
                  />
                  {v > 0 && CELL >= 28 && (
                    <text
                      x={LABEL_W + colPos * CELL + CELL / 2}
                      y={LABEL_W + rowPos * CELL + CELL / 2 + 4}
                      textAnchor="middle"
                      fontSize={CELL >= 36 ? 10 : 8}
                      fill={textColor(v, maxV, isDiag)}
                      style={{ pointerEvents: "none" }}>
                      {v}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 glass rounded-lg px-3 py-2 text-xs text-compass-white pointer-events-none shadow-lg"
            style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Top co-occurrences table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-compass-purple/10">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Top Drug Combinations</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-compass-purple/10">
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-compass-violet/50 tracking-widest uppercase">Drug A</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-compass-violet/50 tracking-widest uppercase">Drug B</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-compass-violet/50 tracking-widest uppercase">Cases Together</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-compass-violet/50 tracking-widest uppercase">% of All Deaths</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const pairs: { a: string; b: string; count: number }[] = [];
              data.drugs.forEach((da, i) =>
                data.drugs.forEach((db, j) => {
                  if (i < j) pairs.push({ a: da, b: db, count: data.matrix[i][j] });
                })
              );
              return pairs
                .sort((x, y) => y.count - x.count)
                .slice(0, 15)
                .map((p, idx) => (
                  <tr key={idx} className="border-b border-compass-purple/5 hover:bg-compass-purple/5 transition-colors">
                    <td className="px-4 py-2 text-compass-white/80">{label(p.a)}</td>
                    <td className="px-4 py-2 text-compass-white/80">{label(p.b)}</td>
                    <td className="px-4 py-2">
                      <span className="font-bold" style={{ color: "#f43f5e" }}>{p.count}</span>
                    </td>
                    <td className="px-4 py-2 text-compass-muted">
                      {Math.round(100 * p.count / data.n_cases)}%
                    </td>
                  </tr>
                ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
