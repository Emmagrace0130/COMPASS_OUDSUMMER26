import { useEffect, useState, useMemo } from "react";

interface Court {
  jurisdiction: string;
  title: string;
  level: string;
  judge: string | null;
  city: string | null;
  serves_dui: "Y" | "N" | null;
}

interface DrugCourtsData {
  courts: Court[];
  total: number;
  unique_jurisdictions: number;
  level_counts: Record<string, number>;
  data_note: string;
}

const LEVEL_COLORS: Record<string, string> = {
  "Criminal Court":            "#f43f5e",
  "Criminal":                  "#f43f5e",
  "Circuit":                   "#d97316",
  "Circuit ":                  "#d97316",
  "General Sessions/Circuit":  "#fb923c",
  "General Sessions":          "#a78bfa",
  "General Sessions ":         "#a78bfa",
  "City Court":                "#14b8a6",
  "Criminal/General Sessions": "#f43f5e",
};

function levelColor(level: string): string {
  return LEVEL_COLORS[level] ?? "#8a8278";
}

function levelLabel(level: string): string {
  return level.replace("General Sessions", "Gen. Sessions").trim();
}

export function DrugCourtsView() {
  const [data, setData]     = useState<DrugCourtsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [duiFilter, setDuiFilter]   = useState("All");
  const [sortCol, setSortCol]       = useState<"jurisdiction" | "title" | "level" | "city">("jurisdiction");
  const [sortAsc, setSortAsc]       = useState(true);

  useEffect(() => {
    fetch("/data/drug_courts")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load drug courts data."))
      .finally(() => setLoading(false));
  }, []);

  const uniqueLevels = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.courts.map(c => c.level))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.courts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.jurisdiction.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.judge?.toLowerCase().includes(q) ?? false) ||
        (c.city?.toLowerCase().includes(q) ?? false)
      );
    }
    if (levelFilter !== "All") list = list.filter(c => c.level === levelFilter);
    if (duiFilter === "Y")     list = list.filter(c => c.serves_dui === "Y");
    if (duiFilter === "N")     list = list.filter(c => c.serves_dui !== "Y");

    return [...list].sort((a, b) => {
      const av = (a[sortCol] ?? "").toLowerCase();
      const bv = (b[sortCol] ?? "").toLowerCase();
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data, search, levelFilter, duiFilter, sortCol, sortAsc]);

  function toggleSort(col: typeof sortCol) {
    if (col === sortCol) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-compass-muted tracking-wide">Loading drug courts data…</div>;
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>;
  if (!data)   return null;

  // Normalize level counts: merge trailing-space variants
  const cleanLevels: Record<string, number> = {};
  for (const [lv, n] of Object.entries(data.level_counts)) {
    const k = lv.trim();
    cleanLevels[k] = (cleanLevels[k] ?? 0) + n;
  }
  const topLevels = Object.entries(cleanLevels).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">
              TN Drug Court Directory
            </h2>
            <p className="text-compass-muted text-xs mt-1">
              T11 · TN Judicial & Drug Courts · {data.data_note}
            </p>
          </div>
          <div className="text-[10px] text-amber-400/80 border border-amber-400/20 bg-amber-400/5 rounded-lg px-3 py-2 max-w-xs">
            Directory reflects 2015 court roster. Court names, judges, and coverage have changed since publication. Use for structural reference only.
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Courts",       value: data.total,               color: "#a78bfa" },
          { label: "Jurisdictions",       value: data.unique_jurisdictions, color: "#d97316" },
          { label: "Serve DUI Offenders", value: data.courts.filter(c => c.serves_dui === "Y").length, color: "#14b8a6" },
          { label: "Court Levels",        value: topLevels.length,          color: "#fb923c" },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-compass-muted mt-1 tracking-wide uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Level breakdown */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase mb-4">Courts by Level</h3>
        <div className="flex flex-wrap gap-3">
          {topLevels.map(([lv, n]) => (
            <div key={lv} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: levelColor(lv) }} />
              <span className="text-compass-white/80">{lv}</span>
              <span className="text-compass-muted">({n})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search county, court name, judge…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 text-xs rounded-lg px-3 py-2 border border-rim focus:outline-none focus:border-compass-purple/50"
          style={{ background: "rgb(var(--tw-c-panel))", color: "rgb(var(--tw-c-white))" }}
        />
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border border-rim focus:outline-none"
          style={{ background: "rgb(var(--tw-c-panel))", color: "rgb(var(--tw-c-muted))" }}
        >
          <option value="All">All Levels</option>
          {uniqueLevels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
        </select>
        <select
          value={duiFilter}
          onChange={e => setDuiFilter(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border border-rim focus:outline-none"
          style={{ background: "rgb(var(--tw-c-panel))", color: "rgb(var(--tw-c-muted))" }}
        >
          <option value="All">DUI: All</option>
          <option value="Y">Serves DUI</option>
          <option value="N">No DUI</option>
        </select>
        <span className="text-[10px] text-compass-muted">{filtered.length} courts</span>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-compass-purple/10">
                {(["jurisdiction", "title", "level", "city"] as const).map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-compass-violet/60 tracking-widest uppercase cursor-pointer hover:text-compass-violet select-none"
                  >
                    {col === "jurisdiction" ? "County / Jurisdiction" : col.charAt(0).toUpperCase() + col.slice(1)}
                    {sortCol === col && (sortAsc ? " ↑" : " ↓")}
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-compass-violet/60 tracking-widest uppercase">Judge</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-compass-violet/60 tracking-widest uppercase">DUI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((court, i) => (
                <tr
                  key={i}
                  className="border-b border-compass-purple/5 hover:bg-compass-purple/5 transition-colors"
                >
                  <td className="px-4 py-3 text-compass-white/80 font-medium max-w-[180px]">
                    {court.jurisdiction}
                  </td>
                  <td className="px-4 py-3 text-compass-white/70 max-w-[220px]">
                    {court.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="text-[10px] font-semibold rounded px-2 py-0.5"
                      style={{ color: levelColor(court.level), border: `1px solid ${levelColor(court.level)}33`, background: `${levelColor(court.level)}11` }}
                    >
                      {levelLabel(court.level)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-compass-muted">{court.city ?? "—"}</td>
                  <td className="px-4 py-3 text-compass-muted max-w-[160px]">{court.judge ?? "—"}</td>
                  <td className="px-4 py-3">
                    {court.serves_dui === "Y" ? (
                      <span className="text-[10px] text-teal-400 font-semibold">Yes</span>
                    ) : court.serves_dui === "N" ? (
                      <span className="text-[10px] text-compass-muted">No</span>
                    ) : (
                      <span className="text-[10px] text-compass-muted/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-compass-muted text-xs">
                    No courts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context note */}
      <div className="glass rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-semibold text-compass-muted tracking-widest uppercase">About TN Drug Courts</h3>
        <p className="text-xs text-compass-muted/80 leading-relaxed">
          Drug treatment courts divert substance-using offenders away from incarceration toward structured treatment, supervision, and support services.
          Tennessee has one of the largest drug court systems in the Southeast. The T11 topic library contains 20+ studies and policy reports on drug court best practices, MAT in criminal justice settings, and TN-specific outcomes data from NADCP, NTCRC, SAMHSA, BJA, and the TN Administrative Office of the Courts.
        </p>
        <p className="text-xs text-compass-muted/60 leading-relaxed">
          For current Tennessee drug court listings and contact information, see the TN Administrative Office of the Courts or the National Drug Court Resource Center (NDCRC).
        </p>
      </div>
    </div>
  );
}
