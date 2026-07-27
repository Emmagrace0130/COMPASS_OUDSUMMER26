import { useEffect, useState } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface TEDSRow {
  year: number;
  total: number;
  heroin: number;
  rx_opioid: number;
  methadone_sub: number;
  cj_referral: number;
  self_referral: number;
  health_referral: number;
  mat: number;
  heroin_pct: number;
  rx_opioid_pct: number;
  cj_pct: number;
  self_pct: number;
  health_pct: number;
}

interface TEDSData {
  rows: TEDSRow[];
  peak_year: number;
  peak_total: number;
  first_year: number;
  latest_year: number;
  growth_pct: number;
  source: string;
  notes: string[];
}

const HEROIN_COLOR  = "#f43f5e";
const RX_COLOR      = "#a78bfa";
const METH_COLOR    = "#d97316";
const CJ_COLOR      = "#fb923c";
const SELF_COLOR    = "#14b8a6";
const HEALTH_COLOR  = "#60a5fa";
const MUTED         = "#8a8278";

export function TEDSView() {
  const [data, setData]     = useState<TEDSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/data/teds")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load TEDS data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading treatment admissions data…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;
  if (!data)   return null;

  const latest = data.rows[data.rows.length - 1];
  const peak   = data.rows.find(r => r.year === data.peak_year)!;

  // For referral chart
  const referralRows = data.rows.map(r => ({
    year: r.year,
    "Criminal Justice": r.cj_referral,
    "Self / Family":    r.self_referral,
    "Health Provider":  r.health_referral,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">
            TN Opioid Treatment Admissions
          </h2>
          <p className="text-compass-muted text-xs mt-1">
            SAMHSA TEDS-A · Tennessee · 2006–{data.latest_year} · Specialty SUD programs only
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `Peak Admissions (${data.peak_year})`, value: peak.total.toLocaleString(),  color: "#f43f5e" },
          { label: `${data.latest_year} Admissions`,      value: latest.total.toLocaleString(), color: "#a78bfa" },
          { label: `2006→${data.latest_year} Growth`,     value: `+${data.growth_pct}%`,         color: "#d97316" },
          { label: `Heroin % (${data.latest_year})`,      value: `${latest.heroin_pct}%`,        color: HEROIN_COLOR },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Substance composition stacked area */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-1">
          Opioid Admissions by Primary Substance — The Rx-to-Heroin Shift
        </h3>
        <p className="text-[10px] text-compass-muted/60 mb-4">
          In 2006 zero TN opioid admissions listed heroin as primary substance — by 2019, heroin accounted for 46% of opioid admissions.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [(v as number).toLocaleString(), String(name)]} />
            <Legend wrapperStyle={{ fontSize: 10, color: MUTED }} />
            <ReferenceLine x={2020} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 2"
              label={{ value: "COVID", position: "top", fontSize: 8, fill: "#f43f5e" }} />
            <Area type="monotone" dataKey="rx_opioid"    name="Rx Opioids / Synthetics" stackId="1" fill={RX_COLOR}     stroke={RX_COLOR}     fillOpacity={0.6} />
            <Area type="monotone" dataKey="heroin"       name="Heroin"                  stackId="1" fill={HEROIN_COLOR}  stroke={HEROIN_COLOR}  fillOpacity={0.7} />
            <Area type="monotone" dataKey="methadone_sub" name="Non-Rx Methadone"       stackId="1" fill={METH_COLOR}    stroke={METH_COLOR}    fillOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Referral source + % composition side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* Referral source trend */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
            Referral Source — Criminal Justice vs. Self
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={referralRows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [(v as number).toLocaleString(), String(name)]} />
              <Legend wrapperStyle={{ fontSize: 9, color: MUTED }} />
              <ReferenceLine x={2020} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="Criminal Justice" stroke={CJ_COLOR}     strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Self / Family"    stroke={SELF_COLOR}   strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Health Provider"  stroke={HEALTH_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Heroin % bar */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">
            Heroin as % of TN Opioid Admissions
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}%`} domain={[0, 60]} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v}%`, "Heroin %"]} />
              <ReferenceLine x={2020} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 2" />
              <Bar dataKey="heroin_pct" name="Heroin %" fill={HEROIN_COLOR} radius={[2,2,0,0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CJ referral % over time */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-1">
          Criminal Justice as Referral Pathway (% of Opioid Admissions)
        </h3>
        <p className="text-[10px] text-compass-muted/60 mb-4">
          Criminal justice referrals peaked in 2016 at {Math.round(data.rows.find(r=>r.year===2016)!.cj_pct)}% of opioid treatment admissions — reflecting drug court expansion and diversion programs.
          The 2020 drop reflects COVID court closures.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "CJ referral %"]} />
            <ReferenceLine x={2020} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 2"
              label={{ value: "COVID", position: "top", fontSize: 8, fill: "#f43f5e" }} />
            <Area type="monotone" dataKey="cj_pct" name="CJ referral %" fill={CJ_COLOR} stroke={CJ_COLOR} fillOpacity={0.4} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Notes */}
      <div className="glass rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">Data Notes</h3>
        <ul className="space-y-1.5">
          {data.notes.map((note, i) => (
            <li key={i} className="text-xs text-compass-muted/80 leading-relaxed flex gap-2">
              <span className="text-compass-purple/50 shrink-0">·</span>
              {note}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-compass-muted/50 pt-1">{data.source}</p>
      </div>
    </div>
  );
}
