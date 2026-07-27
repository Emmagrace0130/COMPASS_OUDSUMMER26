import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

interface CountyData {
  county: string;
  fips: string;
  deaths: number | null;
  suppressed: boolean;
}

interface YearData {
  max_deaths: number;
  total: number;
  counties: CountyData[];
}

interface TNCountyData {
  years: string[];
  data: Record<string, YearData>;
}

// Interpolate a warm color scale: white → amber → deep red
function deathColor(deaths: number | null, suppressed: boolean, max: number): string {
  if (suppressed) return "#4a3520";
  if (deaths === null || deaths === 0) return "#1e1c18";
  const t = Math.min(deaths / (max || 1), 1);
  // 0 → warm dark background, 0.5 → amber, 1 → deep red
  if (t < 0.25) {
    const v = t / 0.25;
    return `rgb(${Math.round(30 + 170*v)},${Math.round(28 + 80*v)},${Math.round(24)})`;
  } else if (t < 0.6) {
    const v = (t - 0.25) / 0.35;
    return `rgb(${Math.round(200 + 55*v)},${Math.round(108 - 60*v)},${Math.round(24 - 10*v)})`;
  } else {
    const v = (t - 0.6) / 0.4;
    return `rgb(${Math.round(255 - 30*v)},${Math.round(48 - 30*v)},${Math.round(14 - 5*v)})`;
  }
}

export function TNCountyMap() {
  const [countyData, setCountyData] = useState<TNCountyData | null>(null);
  const [geoJSON, setGeoJSON]       = useState<GeoJsonObject | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [year, setYear]             = useState("2023");
  const [selected, setSelected]     = useState<CountyData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/tn_counties").then(r => r.json()),
      fetch("/tn_counties.geojson").then(r => r.json()),
    ])
      .then(([d, g]) => {
        setCountyData(d);
        setGeoJSON(g);
        if (d.years?.includes("2023")) setYear("2023");
        else if (d.years?.length)      setYear(d.years[d.years.length - 1]);
      })
      .catch(() => setError("Could not load county map data."))
      .finally(() => setLoading(false));
  }, []);

  const yearData = useMemo(() => countyData?.data[year], [countyData, year]);

  // Build lookup: fips → CountyData
  const lookup = useMemo(() => {
    const map: Record<string, CountyData> = {};
    for (const c of yearData?.counties ?? []) map[c.fips] = c;
    return map;
  }, [yearData]);

  // Top 10 counties
  const topCounties = useMemo(() =>
    [...(yearData?.counties ?? [])]
      .filter(c => c.deaths !== null)
      .sort((a, b) => (b.deaths ?? 0) - (a.deaths ?? 0))
      .slice(0, 10),
    [yearData]);

  const getStyle = useCallback((feature: GeoJSON.Feature | undefined): PathOptions => {
    const fips = feature?.id as string;
    const c = lookup[fips];
    return {
      fillColor:   deathColor(c?.deaths ?? null, c?.suppressed ?? false, yearData?.max_deaths ?? 1),
      fillOpacity: 0.85,
      color:       "#2a2520",
      weight:      0.8,
    };
  }, [lookup, yearData]);

  const onEachFeature = useCallback((feature: GeoJSON.Feature, layer: Layer) => {
    const fips = feature.id as string;
    const name = (feature.properties as Record<string, string>)?.NAME ?? fips;
    const c = lookup[fips];
    const label = c?.suppressed
      ? `<strong>${name} County</strong><br/>1–9 deaths (suppressed)`
      : c?.deaths != null
        ? `<strong>${name} County</strong><br/>${c.deaths} overdose deaths`
        : `<strong>${name} County</strong><br/>No data`;
    (layer as L.Path).bindTooltip(label, { sticky: true });
    (layer as L.Path).on("click", () => setSelected(c ?? { county: name, fips, deaths: null, suppressed: false }));
  }, [lookup]);

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading county map…</div>;
  if (error || !countyData || !geoJSON) return <div className="flex items-center justify-center h-64 text-red-400">{error || "No data"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Tennessee County Overdose Map</h2>
          <p className="text-compass-muted text-xs mt-1">Provisional drug overdose deaths · CDC VSRR · 95 counties · 2020–2025</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-compass-muted tracking-widest uppercase">Year:</span>
          <div className="flex rounded-lg border border-rim overflow-hidden text-[10px]">
            {countyData.years.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className={`px-3 py-1.5 transition-colors ${y === year ? "bg-compass-purple/20 text-compass-violet" : "text-compass-muted hover:text-compass-white"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-compass-violet">{yearData?.total.toLocaleString() ?? "—"}</p>
          <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">Total TN Deaths ({year})</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "#f43f5e" }}>{topCounties[0]?.county ?? "—"}</p>
          <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">Highest County ({topCounties[0]?.deaths ?? "—"} deaths)</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "#fb923c" }}>
            {yearData ? Math.round((yearData.total / 95)) : "—"}
          </p>
          <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">Avg Deaths per County</p>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="grid grid-cols-3 gap-4">

        {/* Map */}
        <div className="col-span-2 glass rounded-xl overflow-hidden" style={{ height: 460 }}>
          <MapContainer
            center={[35.85, -86.35]}
            zoom={7}
            style={{ height: "100%", width: "100%", background: "rgb(var(--tw-c-void))" }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              attribution=""
            />
            {geoJSON && (
              <GeoJSON
                key={year}
                data={geoJSON}
                style={getStyle as never}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
        </div>

        {/* Sidebar: top counties + selected */}
        <div className="space-y-3">
          {selected && (
            <div className="glass rounded-xl p-4 border border-compass-violet/30">
              <p className="text-compass-white font-semibold text-sm">{selected.county} County</p>
              <p className="text-compass-muted text-xs mt-1">FIPS: {selected.fips}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#f43f5e" }}>
                {selected.suppressed ? "1–9*" : selected.deaths != null ? selected.deaths : "—"}
              </p>
              <p className="text-[10px] text-compass-muted tracking-wide uppercase">
                {selected.suppressed ? "deaths (suppressed)" : "overdose deaths"}
              </p>
            </div>
          )}

          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-compass-muted tracking-widest uppercase mb-3">Top 10 Counties — {year}</p>
            <div className="space-y-2">
              {topCounties.map((c, i) => (
                <div key={c.fips} className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                  onClick={() => setSelected(c)}>
                  <span className="text-[10px] text-compass-muted w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-compass-white truncate">{c.county}</span>
                      <span className="text-xs font-bold shrink-0 ml-2" style={{ color: "#f43f5e" }}>{c.deaths}</span>
                    </div>
                    <div className="mt-0.5 h-1 rounded-full bg-rim overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${((c.deaths ?? 0) / (topCounties[0]?.deaths ?? 1)) * 100}%`,
                        background: deathColor(c.deaths, false, yearData?.max_deaths ?? 1),
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] text-compass-muted tracking-widest uppercase mb-2">Legend</p>
            <div className="flex items-center gap-1 mb-1">
              {[0, 0.15, 0.35, 0.6, 0.85, 1].map(t => (
                <div key={t} className="h-3 flex-1 rounded-sm" style={{ background: deathColor(Math.round(t * (yearData?.max_deaths ?? 100)), false, yearData?.max_deaths ?? 100) }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-compass-muted">
              <span>0</span>
              <span>{yearData?.max_deaths ?? "—"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[9px] text-compass-muted">
              <div className="w-3 h-3 rounded-sm" style={{ background: "#4a3520" }} />
              <span>1–9 deaths (suppressed per NCHS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
