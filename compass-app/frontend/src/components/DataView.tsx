import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";

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
  const [stateFilter, setStateFilter] = useState("ALL");

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

  const states = useMemo(() => ["ALL", ...stateCounts.map((s) => s.state)], [stateCounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        (stateFilter === "ALL" || f.state === stateFilter) &&
        (f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q) || f.zip.includes(q))
    );
  }, [facilities, search, stateFilter]);

  const tnCount = facilities.filter((f) => f.state === "TN").length;

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    background: "#1a1a35",
    border: "1px solid rgba(124,58,237,0.3)",
    color: "#f0f0ff",
  };

  if (loading)
    return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading facilities data…</div>;
  if (error)
    return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Facilities", value: facilities.length.toLocaleString(), color: "text-compass-violet", shadow: "shadow-purple" },
          { label: "States & Territories", value: stateCounts.length, color: "text-compass-pink", shadow: "shadow-pink" },
          { label: "Tennessee Facilities", value: tnCount, color: "text-compass-cyan", shadow: "shadow-cyan" },
        ].map((s) => (
          <div key={s.label} className={`glass rounded-xl p-5 text-center ${s.shadow}`}>
            <p className={`text-3xl font-bold ${s.color}`} style={{ textShadow: "0 0 20px currentColor" }}>
              {s.value}
            </p>
            <p className="text-xs text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-xs font-semibold text-compass-violet/70 mb-4 tracking-widest uppercase">Facilities by State</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stateCounts} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.08)" />
              <XAxis dataKey="state" tick={{ fontSize: 9, fill: "#6b6b9a" }} interval={0} angle={-45} textAnchor="end" height={44} />
              <YAxis tick={{ fontSize: 10, fill: "#6b6b9a" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Facilities"]} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {stateCounts.map((entry) => (
                  <Cell key={entry.state} fill={entry.state === "TN" ? "#ec4899" : "#7c3aed"} fillOpacity={entry.state === "TN" ? 1 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">Tennessee in pink</p>
        </div>

        {/* Area chart — certifications over time */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-xs font-semibold text-compass-cyan/70 mb-4 tracking-widest uppercase">Certifications Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={certsByYear} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.08)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#6b6b9a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b6b9a" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "New certifications"]} />
              <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#cyanGrad)" dot={{ fill: "#06b6d4", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-compass-muted/40 mt-1 text-center tracking-wide">New OTP certifications per year</p>
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
              <option key={s} value={s} className="bg-panel">{s === "ALL" ? "All states" : s}</option>
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
