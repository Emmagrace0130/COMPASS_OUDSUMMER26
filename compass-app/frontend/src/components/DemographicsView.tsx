import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface DemographicsData {
  sex_trends:  Record<string, Array<{ year: number; Male?: number; Female?: number }>>;
  age_dist:    Array<Record<string, number | string>>;
  race_dist:   Record<string, Array<{ race: string; Male?: number; Female?: number }>>;
  panels:      string[];
  latest_year: number;
  unit:        string;
  source:      string;
}

const MALE_COLOR   = "#60a5fa";  // blue
const FEMALE_COLOR = "#f472b6";  // pink
const MUTED        = "#8a8278";

const PANEL_COLORS: Record<string, string> = {
  "All OD Deaths":              "#d97316",
  "Any Opioid":                 "#f43f5e",
  "Synthetic Opioids (fentanyl)":"#a78bfa",
  "Heroin":                     "#fb923c",
  "Prescription Opioids":       "#14b8a6",
  "Methadone":                  "#60a5fa",
};


export function DemographicsView() {
  const [data, setData]     = useState<DemographicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [panel, setPanel]   = useState("Any Opioid");

  useEffect(() => {
    fetch("/data/cdc_demographics")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load demographics data."))
      .finally(() => setLoading(false));
  }, []);

  const sexTrend  = useMemo(() => data?.sex_trends[panel]  ?? [], [data, panel]);
  const raceDist  = useMemo(() => data?.race_dist[panel]   ?? [], [data, panel]);
  const agePanels = useMemo(() => data?.panels ?? [], [data]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading demographics data…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;
  if (!data)   return null;

  // Stats for selected panel in latest year
  const latestSex = sexTrend.find(r => r.year === data.latest_year);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">
            OD Deaths — Demographics & Equity
          </h2>
          <p className="text-compass-muted text-xs mt-1">
            {data.source} · {data.unit}
          </p>
        </div>
        <div className="text-[10px] text-amber-400/80 border border-amber-400/20 bg-amber-400/5 rounded-lg px-3 py-2 max-w-xs">
          National data through {data.latest_year}. Post-2018 fentanyl-era shifts (rising Black/AIAN mortality) are not reflected here.
        </div>
      </div>

      {/* Panel selector */}
      <div className="flex flex-wrap gap-2">
        {data.panels.map(p => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-lg border transition-all ${
              p === panel
                ? "border-compass-purple/50 bg-compass-purple/15 text-compass-violet"
                : "border-rim text-compass-muted hover:text-compass-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Latest year callout */}
      {latestSex && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: `Male OD Rate (${data.latest_year})`,   value: latestSex.Male?.toFixed(1) ?? "—",   color: MALE_COLOR },
            { label: `Female OD Rate (${data.latest_year})`, value: latestSex.Female?.toFixed(1) ?? "—", color: FEMALE_COLOR },
            { label: "Male-to-Female Ratio",
              value: latestSex.Male && latestSex.Female
                ? `${(latestSex.Male / latestSex.Female).toFixed(1)}×`
                : "—",
              color: "#d97316" },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sex trends */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
          {panel} — Rates by Sex, 1999–{data.latest_year}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sexTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [`${(v as number).toFixed(1)} / 100k`, String(name)]} />
            <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
            <Line type="monotone" dataKey="Male"   stroke={MALE_COLOR}   strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Female" stroke={FEMALE_COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Age distribution + Race/Ethnicity side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* Age distribution for current panel */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
            {panel} — By Age Group ({data.latest_year})
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.age_dist} layout="vertical" margin={{ top: 2, right: 20, left: 64, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}`} />
              <YAxis type="category" dataKey="age" tick={{ fontSize: 8.5, fill: MUTED }} width={64} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [`${(v as number).toFixed(1)} / 100k`, String(name)]} />
              <Bar dataKey={panel} radius={[0, 3, 3, 0]}>
                {data.age_dist.map((_, i) => (
                  <Cell key={i} fill={PANEL_COLORS[panel] ?? "#d97316"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Race/ethnicity */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
            {panel} — By Race/Ethnicity & Sex ({data.latest_year})
          </h3>
          {raceDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={raceDist} layout="vertical" margin={{ top: 2, right: 20, left: 80, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}`} />
                <YAxis type="category" dataKey="race" tick={{ fontSize: 8.5, fill: MUTED }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [`${(v as number).toFixed(1)} / 100k`, String(name)]} />
                <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
                <Bar dataKey="Male"   fill={MALE_COLOR}   radius={[0,2,2,0]} />
                <Bar dataKey="Female" fill={FEMALE_COLOR} radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-compass-muted text-xs">
              No race breakdown available for this panel.
            </div>
          )}
        </div>
      </div>

      {/* All panels age comparison */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
          All Drug Types — Age Group Comparison ({data.latest_year})
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.age_dist} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="age" tick={{ fontSize: 8, fill: MUTED }} angle={-25} textAnchor="end" height={52} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [`${(v as number).toFixed(1)} / 100k`, String(name)]} />
            <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
            {agePanels.filter(p => p !== "All OD Deaths").map((p) => (
              <Bar key={p} dataKey={p} fill={PANEL_COLORS[p] ?? "#8a8278"} radius={[2,2,0,0]} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Equity note */}
      <div className="glass rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Equity Context</h3>
        <p className="text-xs text-compass-muted/80 leading-relaxed">
          These data show persistent disparities in overdose mortality by sex (men die at ~2× the rate of women),
          age (peak burden in the 25–54 age group), and race/ethnicity (Non-Hispanic White and AI/AN populations
          have historically shown the highest rates, though this gap has narrowed since 2018 as fentanyl has
          disproportionately increased mortality among Black Americans). The T7 library contains research on
          structural drivers of these disparities: rural access barriers, insurance coverage, racial bias in
          prescribing, and housing instability.
        </p>
        <p className="text-[10px] text-compass-muted/50">
          Note: 2018 is the most recent year in this dataset. CDC WONDER contains provisional data through 2023 showing continued demographic shifts.
        </p>
      </div>
    </div>
  );
}
