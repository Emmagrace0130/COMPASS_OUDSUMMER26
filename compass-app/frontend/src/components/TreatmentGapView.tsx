import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";
import { TN_REGION_NAMES } from "../lib/region";

interface StateData {
  name: string;
  abbrev: string;
  oud_pct: number | null;
  needs_pct: number | null;
  received_pct: number | null;
  unmet_pct: number | null;
  gap_pct: number | null;
  facilities: number;
  fac_per_100k: number;
}

const MUTED = "#8a8278";

type MapMetric = "unmet_pct" | "gap_pct" | "fac_per_100k" | "oud_pct";

const METRIC_META: Record<MapMetric, { label: string; desc: string; higher: "bad" | "good" }> = {
  unmet_pct:    { label: "Unmet Need %",       desc: "% who need SU treatment but didn't receive it",   higher: "bad"  },
  gap_pct:      { label: "Treatment Gap %",     desc: "Needs treatment % minus received treatment %",    higher: "bad"  },
  oud_pct:      { label: "OUD Prevalence %",    desc: "% of adults 12+ with opioid use disorder",        higher: "bad"  },
  fac_per_100k: { label: "Facilities/100k",     desc: "OTPs per 100,000 population",                     higher: "good" },
};

function metricColor(val: number | null, min: number, max: number, higher: "bad" | "good"): string {
  if (val === null) return "#1e1c18";
  const t = Math.min(Math.max((val - min) / (max - min || 1), 0), 1);
  const intensity = higher === "bad" ? t : 1 - t;
  if (intensity < 0.2) return "#1a3a2a";
  if (intensity < 0.4) return "#1e5c30";
  if (intensity < 0.6) return "#d97316";
  if (intensity < 0.8) return "#ea5c1a";
  return "#f43f5e";
}

export function TreatmentGapView() {
  const [data, setData]     = useState<StateData[]>([]);
  const [geo, setGeo]       = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [metric, setMetric] = useState<MapMetric>("unmet_pct");
  const [selected, setSelected] = useState<StateData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/treatment_gap").then(r => r.json()),
      fetch("/us_states.geojson").then(r => r.json()),
    ])
      .then(([d, g]) => { setData(d.states); setGeo(g); })
      .catch(() => setError("Could not load treatment gap data."))
      .finally(() => setLoading(false));
  }, []);

  const lookup = useMemo(() => Object.fromEntries(data.map(s => [s.name, s])), [data]);
  const tn = useMemo(() => data.find(s => s.name === "Tennessee"), [data]);

  const { min, max } = useMemo(() => {
    const vals = data.map(s => s[metric]).filter((v): v is number => v !== null);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [data, metric]);

  const meta = METRIC_META[metric];

  // Neighbor comparison data
  const neighborData = useMemo(() =>
    data.filter(s => TN_REGION_NAMES.has(s.name))
      .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0)),
    [data, metric]);

  // National gap context
  // Top worst / best states
  const ranked = useMemo(() =>
    [...data].filter(s => s[metric] !== null).sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0)),
    [data, metric]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading treatment gap data…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Treatment Gap Map</h2>
          <p className="text-compass-muted text-xs mt-1">
            SAMHSA NSDUH 2023–2024 · SAMHSA OTP Directory · 50 states + DC
          </p>
        </div>
        {/* Metric selector */}
        <div className="flex rounded-lg border border-rim overflow-hidden text-[10px]">
          {(Object.keys(METRIC_META) as MapMetric[]).map(m => (
            <button key={m} onClick={() => setMetric(m)}
              className={`px-3 py-2 transition-colors ${m === metric ? "bg-compass-purple/20 text-compass-violet" : "text-compass-muted hover:text-compass-white"}`}>
              {METRIC_META[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* TN spotlight */}
      {tn && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "TN OUD Prevalence",   value: tn.oud_pct,      suffix: "%", color: "#a78bfa", vs: null },
            { label: "TN Needs Treatment",  value: tn.needs_pct,    suffix: "%", color: "#d97316", vs: null },
            { label: "TN Received Treat.",  value: tn.received_pct, suffix: "%", color: "#14b8a6", vs: null },
            { label: "TN Unmet Need",       value: tn.unmet_pct,    suffix: "%", color: "#f43f5e", vs: null },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value != null ? `${s.value}${s.suffix}` : "—"}
              </p>
              <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Map + ranking */}
      <div className="grid grid-cols-3 gap-4">

        {/* Map */}
        <div className="col-span-2 glass rounded-xl overflow-hidden" style={{ height: 400 }}>
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">{meta.label}</h3>
              <p className="text-[10px] text-compass-muted/60">{meta.desc}</p>
            </div>
          </div>
          {geo && (
            <MapContainer center={[38, -96]} zoom={4}
              style={{ height: 345, width: "100%", background: "rgb(var(--tw-c-void))" }}
              zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" attribution="" />
              <GeoJSON key={metric} data={geo}
                style={(f) => {
                  const s = lookup[f?.properties?.name ?? ""];
                  const val = s?.[metric] ?? null;
                  const isTN = f?.properties?.name === "Tennessee";
                  return {
                    fillColor:   metricColor(val, min, max, meta.higher),
                    fillOpacity: 0.8,
                    color:       isTN ? "#f43f5e" : "#1a1816",
                    weight:      isTN ? 2.5 : 0.8,
                  };
                }}
                onEachFeature={(f, layer) => {
                  const name = f.properties?.name ?? "";
                  const s = lookup[name];
                  const val = s?.[metric];
                  layer.bindTooltip(
                    `<strong>${name}</strong><br/>${meta.label}: ${val != null ? val.toFixed(1) + (metric === "fac_per_100k" ? "" : "%") : "N/A"}<br/>Facilities: ${s?.facilities ?? 0}`,
                    { sticky: true }
                  );
                  (layer as L.Path).on("click", () => setSelected(s ?? null));
                }}
              />
            </MapContainer>
          )}
        </div>

        {/* Top 10 states */}
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] text-compass-muted tracking-widest uppercase mb-3">
            {meta.higher === "bad" ? "Worst" : "Best"} States — {meta.label}
          </p>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 340 }}>
            {ranked.slice(0, 15).map((s, i) => (
              <div key={s.abbrev}
                className={`flex items-center gap-2 cursor-pointer hover:opacity-80 p-1 rounded ${s.name === "Tennessee" ? "border border-rose-500/30 bg-rose-500/5" : ""}`}
                onClick={() => setSelected(s)}>
                <span className="text-[10px] text-compass-muted w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${s.name === "Tennessee" ? "text-rose-400 font-semibold" : "text-compass-white"}`}>{s.abbrev}</span>
                    <span className="text-xs font-bold shrink-0 ml-1" style={{ color: s.name === "Tennessee" ? "#f43f5e" : "#d97316" }}>
                      {s[metric]?.toFixed(1)}{metric !== "fac_per_100k" ? "%" : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 rounded-full bg-rim overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${((s[metric] ?? 0) / (ranked[0]?.[metric] ?? 1)) * 100}%`,
                      background: metricColor(s[metric], min, max, meta.higher),
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected state detail + neighbors */}
      <div className="grid grid-cols-2 gap-4">

        {/* Selected state */}
        <div className="glass rounded-xl p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-compass-white font-bold">{selected.name}</h3>
                <span className="text-[10px] text-compass-muted border border-rim rounded px-2 py-0.5">{selected.abbrev}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "OUD Prevalence",   value: selected.oud_pct,      color: "#a78bfa" },
                  { label: "Needs Treatment",  value: selected.needs_pct,    color: "#d97316" },
                  { label: "Received Treat.",  value: selected.received_pct, color: "#14b8a6" },
                  { label: "Unmet Need",       value: selected.unmet_pct,    color: "#f43f5e" },
                  { label: "OTPs",             value: selected.facilities,   color: "#fb923c", noPercent: true },
                  { label: "OTPs/100k",        value: selected.fac_per_100k, color: "#60a5fa", noPercent: true },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-xl font-bold" style={{ color: m.color }}>
                      {m.value != null ? `${m.value}${m.noPercent ? "" : "%"}` : "—"}
                    </p>
                    <p className="text-[10px] text-compass-muted tracking-wide uppercase mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-compass-muted text-xs">
              Click a state on the map to see details
            </div>
          )}
        </div>

        {/* Neighbor comparison */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
            TN vs Neighboring States — {meta.label}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={neighborData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="abbrev" tick={{ fontSize: 9, fill: MUTED }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickFormatter={v => metric !== "fac_per_100k" ? `${v}%` : `${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${(v as number).toFixed(1)}${metric !== "fac_per_100k" ? "%" : ""}`, meta.label]} />
              <Bar dataKey={metric} radius={[3,3,0,0]}>
                {neighborData.map(s => (
                  <Cell key={s.abbrev} fill={s.name === "Tennessee" ? "#f43f5e" : "#d97316"} fillOpacity={s.name === "Tennessee" ? 1 : 0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* National need vs facility scatter context */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
          All States — Needs Treatment vs. Facilities per 100k (bubble = OUD prevalence)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-compass-purple/10">
                {["State","OUD %","Needs Treat. %","Received %","Unmet Need %","OTPs","OTPs/100k"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-compass-violet/50 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 20).map(s => (
                <tr key={s.abbrev}
                  className={`border-b border-compass-purple/5 transition-colors cursor-pointer hover:bg-compass-purple/5 ${s.name === "Tennessee" ? "bg-rose-500/5" : ""}`}
                  onClick={() => setSelected(s)}>
                  <td className={`px-3 py-2 font-medium ${s.name === "Tennessee" ? "text-rose-400" : "text-compass-white/80"}`}>{s.name}</td>
                  <td className="px-3 py-2 text-compass-muted">{s.oud_pct?.toFixed(2) ?? "—"}%</td>
                  <td className="px-3 py-2 text-compass-muted">{s.needs_pct?.toFixed(1) ?? "—"}%</td>
                  <td className="px-3 py-2 text-compass-muted">{s.received_pct?.toFixed(1) ?? "—"}%</td>
                  <td className="px-3 py-2">
                    <span className={`font-semibold ${(s.unmet_pct ?? 0) > 80 ? "text-rose-400" : (s.unmet_pct ?? 0) > 70 ? "text-amber-400" : "text-compass-muted"}`}>
                      {s.unmet_pct?.toFixed(1) ?? "—"}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-compass-muted">{s.facilities}</td>
                  <td className="px-3 py-2 text-compass-muted">{s.fac_per_100k?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
