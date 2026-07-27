import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject, Feature } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";

interface WastewaterData {
  drugs: string[];
  areas: string[];
  area_to_site: Record<string, string>;
  series: Record<string, Record<string, { date: string; pnml: number }[]>>;
  latest: Record<string, Record<string, number>>;
}

const DRUG_COLORS: Record<string, string> = {
  "Fentanyl":          "#f43f5e",
  "Norfentanyl":       "#fb923c",
  "Heroin":            "#d97316",
  "6-Acetylmorphine":  "#f59e0b",
  "6-acetylmorphine":  "#f59e0b",
  "Oxycodone":         "#a78bfa",
  "Noroxycodone":      "#c084fc",
  "Codeine":           "#34d399",
  "Xylazine":          "#f87171",
};

const MUTED = "#8a8278";

// Scale pnml to a fill color: green → yellow → red
function heatColor(val: number, max: number): string {
  const t = Math.min(val / (max || 1), 1);
  if (t < 0.5) {
    const r = Math.round(255 * (t * 2));
    return `rgb(${r},200,80)`;
  } else {
    const g = Math.round(200 * (1 - (t - 0.5) * 2));
    return `rgb(255,${g},50)`;
  }
}

export function WastewaterView() {
  const [data, setData]     = useState<WastewaterData | null>(null);
  const [geo, setGeo]       = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [drug, setDrug]     = useState("Fentanyl");
  const [area, setArea]     = useState("Collection Area 1");

  useEffect(() => {
    Promise.all([
      fetch("/data/wastewater").then(r => r.json()),
      fetch("/wastewater_collection_areas.geojson").then(r => r.json()),
    ])
      .then(([ww, gj]) => {
        setData(ww);
        setGeo(gj);
        if (ww.drugs.includes("Fentanyl")) setDrug("Fentanyl");
        else if (ww.drugs.length) setDrug(ww.drugs[0]);
        if (ww.areas.length) setArea(ww.areas[0]);
      })
      .catch(() => setError("Could not load wastewater data."))
      .finally(() => setLoading(false));
  }, []);

  // Latest values for current drug across all areas
  const latestByArea = useMemo(() =>
    data ? (data.latest[drug] ?? {}) : {}, [data, drug]);

  const maxVal = useMemo(() =>
    Math.max(...Object.values(latestByArea).map(Number).filter(Boolean), 1),
    [latestByArea]);

  // Time series for selected drug + area
  const timeSeries = useMemo(() =>
    data?.series[drug]?.[area] ?? [], [data, drug, area]);

  // Latest across-area bar data for selected drug
  const areaBarData = useMemo(() =>
    data?.areas.map(a => ({
      area: a.replace("Collection Area ", "CA"),
      pnml: latestByArea[a] ?? 0,
      full: a,
    })) ?? [], [data, latestByArea]);

  // GeoJSON style function
  const geoStyle = (feature?: Feature) => {
    const site = feature?.properties?.Site as string;
    const siteToArea = Object.fromEntries(
      Object.entries(data?.area_to_site ?? {}).map(([a, s]) => [s, a])
    );
    const areaName = siteToArea[site];
    const val = areaName ? (latestByArea[areaName] ?? 0) : 0;
    return {
      fillColor: heatColor(val, maxVal),
      fillOpacity: 0.65,
      color: "#fff",
      weight: 2,
    };
  };

  // Top drug stats
  const topDrug = useMemo(() => {
    if (!data) return null;
    const totals = data.drugs.map(d => ({
      drug: d,
      total: Object.values(data.latest[d] ?? {}).reduce((s, v) => s + v, 0),
    }));
    return totals.sort((a, b) => b.total - a.total)[0]?.drug ?? null;
  }, [data]);

  const latestDate = useMemo(() =>
    timeSeries.length ? timeSeries[timeSeries.length - 1].date : "—",
    [timeSeries]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading wastewater data…</div>;
  if (error || !data || !geo) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Wastewater Opioid Surveillance</h2>
        <p className="text-compass-muted text-xs mt-1">
          City of Tempe + Arizona State University · Population-normalized mass load (mg/day/1000 capita) · {data.areas.length} collection areas · {data.drugs.length} compounds · Nov 2022–Aug 2025
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-3xl font-bold" style={{ color: "#f43f5e" }}>
            {(latestByArea[area] ?? 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-compass-muted mt-0.5">mg/day/1000 cap</p>
          <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{drug} — {area.replace("Collection Area ","Area ")}</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-3xl font-bold" style={{ color: "#d97316" }}>
            {data.drugs.length}
          </p>
          <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">Compounds Tested</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-xl font-bold text-compass-violet" style={{ textShadow: "0 0 18px currentColor" }}>
            {topDrug}
          </p>
          <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">Highest Aggregate Load</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-xl font-bold" style={{ color: "#14b8a6" }}>
            {latestDate}
          </p>
          <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">Latest Sample Date</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-compass-muted tracking-widest uppercase">Drug:</span>
          <select value={drug} onChange={e => setDrug(e.target.value)}
            className="rounded-lg border border-rim bg-panel px-3 py-1.5 text-xs text-compass-white focus:outline-none focus:ring-1 focus:ring-compass-purple/50">
            {data.drugs.map(d => <option key={d} value={d} className="bg-panel">{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-compass-muted tracking-widest uppercase">Area:</span>
          <select value={area} onChange={e => setArea(e.target.value)}
            className="rounded-lg border border-rim bg-panel px-3 py-1.5 text-xs text-compass-white focus:outline-none focus:ring-1 focus:ring-compass-purple/50">
            {data.areas.map(a => <option key={a} value={a} className="bg-panel">{a}</option>)}
          </select>
        </div>
      </div>

      {/* Map + area bar chart */}
      <div className="grid grid-cols-2 gap-4">

        {/* Leaflet map */}
        <div className="glass rounded-xl overflow-hidden" style={{ height: 340 }}>
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">
              Collection Areas — {drug} (latest week)
            </h3>
            <p className="text-[10px] text-compass-muted/60">Green = low · Red = high · Areas 6–9 have no polygon data</p>
          </div>
          <MapContainer
            center={[33.415, -111.94]}
            zoom={11}
            style={{ height: 270, width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />
            <GeoJSON
              key={drug}
              data={geo}
              style={geoStyle as never}
              onEachFeature={(feature, layer) => {
                const site = feature?.properties?.Site as string;
                const siteToArea = Object.fromEntries(
                  Object.entries(data.area_to_site).map(([a, s]) => [s, a])
                );
                const areaName = siteToArea[site] ?? site;
                const val = latestByArea[areaName];
                layer.bindTooltip(
                  `<strong>${areaName}</strong> (${site})<br/>${drug}: ${val != null ? val.toFixed(2) : "N/A"} mg/day/1000 cap`
                );
              }}
            />
          </MapContainer>
        </div>

        {/* Area bar chart */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
            {drug} by Area (latest)
          </h3>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={areaBarData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
              <XAxis dataKey="area" tick={{ fontSize: 9, fill: MUTED }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} label={{ value: "mg/day/1000 cap", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(3)}`, "pnml"]}
                labelFormatter={(l, payload) => payload?.[0]?.payload?.full ?? l} />
              <Bar dataKey="pnml" radius={[3, 3, 0, 0]}>
                {areaBarData.map((entry, i) => (
                  <Cell key={i}
                    fill={DRUG_COLORS[drug] ?? "#d97316"}
                    fillOpacity={entry.full === area ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time series for selected area */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
          {drug} — {area} — Time Series (weekly)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={timeSeries} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: MUTED }}
              tickFormatter={d => d.slice(0, 7)}
              interval={Math.floor(timeSeries.length / 12)} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} label={{ value: "mg/day/1000 cap", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 9 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(3)}`, "pnml"]} />
            <Line type="monotone" dataKey="pnml"
              stroke={DRUG_COLORS[drug] ?? "#d97316"}
              strokeWidth={1.8} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* All drugs latest comparison */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted mb-4 tracking-widest uppercase">
          All Compounds — {area} — Latest Values
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={data.drugs.map(d => ({
              drug: d.length > 14 ? d.slice(0, 14) + "…" : d,
              full: d,
              pnml: data.latest[d]?.[area] ?? 0,
            }))}
            margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.08)" />
            <XAxis dataKey="drug" tick={{ fontSize: 8, fill: MUTED }} angle={-30} textAnchor="end" height={60} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${(v as number).toFixed(3)}`, "pnml"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} />
            <Bar dataKey="pnml" radius={[3, 3, 0, 0]}>
              {data.drugs.map((d, i) => (
                <Cell key={i} fill={DRUG_COLORS[d] ?? "#d97316"} fillOpacity={d === drug ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
