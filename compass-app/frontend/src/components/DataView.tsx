import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";
import { TOOLTIP_STYLE } from "../lib/chartTheme";
import { TN_REGION_ABBREVS } from "../lib/region";

interface Facility {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  certification: string;
  certified_date: string;
}

export function DataView() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("TN");

  useEffect(() => {
    fetch("/data/facilities")
      .then((r) => r.json())
      .then((d) => setFacilities(d.facilities))
      .catch(() => setError("Could not load facilities data."))
      .finally(() => setLoading(false));
  }, []);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of facilities) counts[f.state] = (counts[f.state] ?? 0) + 1;
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [facilities]);

  const certsByYear = useMemo(() => {
    const years: Record<string, number> = {};
    for (const f of facilities) {
      const yr = f.certified_date?.split("/")[2];
      if (yr && yr.length === 4) years[yr] = (years[yr] ?? 0) + 1;
    }
    return Object.entries(years).sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year, count }));
  }, [facilities]);

  // Chart shows Tennessee and its neighbors only — the full 50-state + territory
  // list buried the regional signal.
  const regionCounts = useMemo(
    () => stateCounts.filter((s) => TN_REGION_ABBREVS.has(s.state)),
    [stateCounts]
  );

  const states = useMemo(() => ["TN", "REGION", "ALL", ...stateCounts.map((s) => s.state).filter((s) => s !== "TN")], [stateCounts]);

  const stateLabel = (s: string) =>
    s === "ALL" ? "All states & territories" : s === "REGION" ? "TN + neighboring states" : s === "TN" ? "Tennessee" : s;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facilities.filter((f) => {
      const inScope =
        stateFilter === "ALL" ||
        (stateFilter === "REGION" ? TN_REGION_ABBREVS.has(f.state) : f.state === stateFilter);
      return inScope && (f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q) || f.zip.includes(q));
    });
  }, [facilities, search, stateFilter]);

  const tnCount = facilities.filter((f) => f.state === "TN").length;
  const regionCount = facilities.filter((f) => TN_REGION_ABBREVS.has(f.state)).length;

  const tnCityData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of facilities.filter(f => f.state === "TN"))
      counts[f.city] = (counts[f.city] ?? 0) + 1;
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [facilities]);

  if (loading)
    return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading facilities data…</div>;
  if (error)
    return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* TN REDLINE callout */}
      <div className="glass rounded-xl p-4 flex items-center justify-between gap-4 border border-compass-pink/20 bg-compass-pink/5">
        <div>
          <p className="text-sm font-semibold text-compass-white">Need help finding treatment right now?</p>
          <p className="text-xs text-compass-muted mt-0.5">
            Tennessee REDLINE — 24/7 confidential referral for substance use and problem gambling treatment. Operated by TAADAS for TDMHSAS.
          </p>
        </div>
        <a
          href="tel:8008899789"
          className="shrink-0 bg-compass-pink/15 hover:bg-compass-pink/25 border border-compass-pink/40 text-compass-pink rounded-lg px-4 py-2 text-sm font-semibold tracking-wide transition-all whitespace-nowrap"
        >
          Call/Text 800-889-9789
        </a>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tennessee Facilities", value: tnCount, color: "text-compass-pink", shadow: "shadow-pink" },
          { label: "TN + Neighboring States", value: regionCount.toLocaleString(), color: "text-compass-cyan", shadow: "shadow-cyan" },
          { label: "Nationwide", value: facilities.length.toLocaleString(), color: "text-compass-violet", shadow: "shadow-purple" },
        ].map((s) => (
          <div key={s.label} className={`glass rounded-xl p-5 text-center ${s.shadow}`}>
            <p className={`text-3xl font-bold ${s.color}`}>
              {s.value}
            </p>
            <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="space-y-4">
        {/* Bar chart — full width */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-xs font-semibold text-compass-violet/70 mb-4 tracking-widest uppercase">Facilities — Tennessee &amp; Neighboring States</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionCounts} margin={{ top: 0, right: 8, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(217,115,22,0.1)" />
              <XAxis dataKey="state" tick={{ fontSize: 11, fill: "#7a7060" }} interval={0} height={30} />
              <YAxis tick={{ fontSize: 10, fill: "#7a7060" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Facilities"]} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {regionCounts.map((entry) => (
                  <Cell key={entry.state} fill={entry.state === "TN" ? "#f43f5e" : "#d97316"} fillOpacity={entry.state === "TN" ? 1 : 0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">
            Tennessee in pink · switch the filter below to “All states &amp; territories” for the nationwide list
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">

        {/* Area chart — certifications over time */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-xs font-semibold text-compass-cyan/70 mb-4 tracking-widest uppercase">Certifications Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={certsByYear} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,148,136,0.1)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#7a7060" }} />
              <YAxis tick={{ fontSize: 10, fill: "#7a7060" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "New certifications"]} />
              <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#cyanGrad)" dot={{ fill: "#0d9488", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">New OTP certifications per year</p>
        </div>

        {/* TN facilities by city */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-xs font-semibold text-compass-pink/70 mb-4 tracking-widest uppercase">Tennessee Facilities by City</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tnCityData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,24,93,0.1)" />
              <XAxis dataKey="city" tick={{ fontSize: 9, fill: "#7a7060" }} angle={-35} textAnchor="end" height={55} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#7a7060" }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Facilities"]} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#be185d" fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">{tnCount} certified OTPs across Tennessee</p>
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-compass-purple/10 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, city, or zip…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-rim bg-panel px-3 py-2 text-sm text-compass-white placeholder-compass-muted focus:outline-none focus:ring-1 focus:ring-compass-purple/50"
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-rim bg-panel px-3 py-2 text-sm text-compass-white focus:outline-none focus:ring-1 focus:ring-compass-purple/50"
          >
            {states.map((s) => (
              <option key={s} value={s} className="bg-panel">{stateLabel(s)}</option>
            ))}
          </select>
          <span className="self-center text-[10px] text-compass-muted shrink-0 tracking-wide">
            {filtered.length.toLocaleString()} results
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-compass-purple/10">
              <tr>
                {["Program Name", "City", "State", "Zip", "Phone", "Certified"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 font-semibold text-compass-violet/50 tracking-widest uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((f, i) => (
                <tr key={i} className={`border-b border-compass-purple/5 transition-colors ${f.state === "TN" ? "bg-compass-pink/5" : "hover:bg-compass-purple/5"}`}>
                  <td className="px-4 py-2 font-medium text-compass-white/80 max-w-[220px] truncate">{f.name}</td>
                  <td className="px-4 py-2 text-compass-muted">{f.city}</td>
                  <td className="px-4 py-2">
                    <span className={`font-semibold ${f.state === "TN" ? "text-compass-pink" : "text-compass-violet"}`}>{f.state}</span>
                  </td>
                  <td className="px-4 py-2 text-compass-muted">{f.zip}</td>
                  <td className="px-4 py-2 text-compass-muted">{f.phone}</td>
                  <td className="px-4 py-2 text-compass-muted">{f.certified_date}</td>
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
