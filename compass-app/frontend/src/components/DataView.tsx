import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

  const states = useMemo(
    () => ["ALL", ...stateCounts.map((s) => s.state)],
    [stateCounts]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        (stateFilter === "ALL" || f.state === stateFilter) &&
        (f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.zip.includes(q))
    );
  }, [facilities, search, stateFilter]);

  const tnCount = facilities.filter((f) => f.state === "TN").length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-compass-steel tracking-wide">
        Loading facilities data…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {error}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Facilities", value: facilities.length.toLocaleString() },
          { label: "States & Territories", value: stateCounts.length },
          { label: "Tennessee Facilities", value: tnCount },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-compass-glow" style={{ textShadow: "0 0 20px rgba(0,212,224,0.5)" }}>
              {s.value}
            </p>
            <p className="text-xs text-compass-steel/70 mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-xs font-semibold text-compass-glow/70 mb-4 tracking-widest uppercase">
          OUD Treatment Facilities by State
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stateCounts} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,224,0.07)" />
            <XAxis
              dataKey="state"
              tick={{ fontSize: 10, fill: "#5F8190" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 11, fill: "#5F8190" }} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                background: "#0a2535",
                border: "1px solid rgba(0,212,224,0.2)",
                color: "#E2F0F0",
              }}
              formatter={(v) => [v, "Facilities"]}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {stateCounts.map((entry) => (
                <Cell
                  key={entry.state}
                  fill={entry.state === "TN" ? "#00d4e0" : "#0f3d52"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-compass-steel/40 mt-2 text-center tracking-wide">
          Tennessee highlighted in teal
        </p>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-compass-glow/10 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, city, or zip…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-compass-glow/20 bg-space/80 px-3 py-2 text-sm text-compass-mist placeholder-compass-steel/50 focus:outline-none focus:ring-1 focus:ring-compass-glow/40"
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-compass-glow/20 bg-space/80 px-3 py-2 text-sm text-compass-mist focus:outline-none focus:ring-1 focus:ring-compass-glow/40"
          >
            {states.map((s) => (
              <option key={s} value={s} className="bg-deep">
                {s === "ALL" ? "All states" : s}
              </option>
            ))}
          </select>
          <span className="self-center text-[10px] text-compass-steel/50 shrink-0 tracking-wide">
            {filtered.length.toLocaleString()} results
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-compass-glow/10">
              <tr>
                {["Program Name", "City", "State", "Zip", "Phone", "Certified"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 font-semibold text-compass-glow/50 tracking-widest uppercase text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((f, i) => (
                <tr
                  key={i}
                  className={`border-b border-compass-glow/5 transition-colors ${
                    f.state === "TN"
                      ? "bg-compass-glow/5"
                      : "hover:bg-compass-glow/5"
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-compass-mist/80 max-w-[220px] truncate">{f.name}</td>
                  <td className="px-4 py-2 text-compass-steel/70">{f.city}</td>
                  <td className="px-4 py-2">
                    <span className={`font-semibold ${f.state === "TN" ? "text-compass-glow" : "text-compass-steel"}`}>
                      {f.state}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-compass-steel/70">{f.zip}</td>
                  <td className="px-4 py-2 text-compass-steel/70">{f.phone}</td>
                  <td className="px-4 py-2 text-compass-steel/70">{f.certified_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-center text-[10px] text-compass-steel/40 py-3 tracking-wide">
              Showing 200 of {filtered.length} — use filters to narrow down
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
