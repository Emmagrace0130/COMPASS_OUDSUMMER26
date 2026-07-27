import { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";

interface GraphNode { id: string; label: string; name: string; props?: Record<string, unknown>; }
interface GraphLink { source: string; target: string; type: string; }
interface GraphData  { nodes: GraphNode[]; links: GraphLink[]; }

const LABEL_COLORS: Record<string, string> = {
  Medication:    "#d97316",
  Guideline:     "#14b8a6",
  Condition:     "#f43f5e",
  Population:    "#a78bfa",
  Location:      "#60a5fa",
  Policy:        "#fb923c",
  Organization:  "#34d399",
  Treatment:     "#e879f9",
};

const LABEL_ORDER = Object.keys(LABEL_COLORS);

export function ConceptMapView() {
  const [data, setData]           = useState<GraphData | null>(null);
  const [filtered, setFiltered]   = useState<GraphData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [search, setSearch]       = useState("");
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set(LABEL_ORDER));
  const [selected, setSelected]   = useState<GraphNode | null>(null);
  const [mode, setMode]           = useState<"full" | "neighborhood">("full");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Check availability first
  useEffect(() => {
    fetch("/graph/status")
      .then(r => r.json())
      .then(d => setAvailable(d.available))
      .catch(() => setAvailable(false));
  }, []);

  // Load graph once available
  useEffect(() => {
    if (!available) return;
    setLoading(true);
    fetch("/graph/full")
      .then(r => r.json())
      .then((d: GraphData) => { setData(d); setLoading(false); })
      .catch(() => { setError("Could not load concept map."); setLoading(false); });
  }, [available]);

  // Filter by active labels
  useEffect(() => {
    if (!data) return;
    const nodeSet = new Set(
      data.nodes.filter(n => activeLabels.has(n.label)).map(n => n.id)
    );
    setFiltered({
      nodes: data.nodes.filter(n => nodeSet.has(n.id)),
      links: data.links.filter(l =>
        nodeSet.has(typeof l.source === "object" ? (l.source as GraphNode).id : l.source) &&
        nodeSet.has(typeof l.target === "object" ? (l.target as GraphNode).id : l.target)
      ),
    });
  }, [data, activeLabels]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelected(node);
    if (mode === "neighborhood") {
      setLoading(true);
      fetch(`/graph/neighborhood?name=${encodeURIComponent(node.name)}&depth=2`)
        .then(r => r.json())
        .then((d: GraphData) => { setFiltered(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [mode]);

  const resetToFull = () => {
    setSelected(null);
    if (data) {
      const nodeSet = new Set(data.nodes.filter(n => activeLabels.has(n.label)).map(n => n.id));
      setFiltered({
        nodes: data.nodes.filter(n => nodeSet.has(n.id)),
        links: data.links.filter(l =>
          nodeSet.has(typeof l.source === "object" ? (l.source as GraphNode).id : l.source) &&
          nodeSet.has(typeof l.target === "object" ? (l.target as GraphNode).id : l.target)
        ),
      });
    }
  };

  const toggleLabel = (label: string) =>
    setActiveLabels(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  if (available === false) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-compass-muted">
      <div className="text-4xl">◈</div>
      <p className="text-sm font-medium tracking-wide">Neo4j concept map is starting up…</p>
      <p className="text-xs text-compass-muted/60">The graph database takes ~30s to initialize on first run.</p>
      <button onClick={() => window.location.reload()}
        className="text-xs border border-rim px-4 py-2 rounded-lg hover:border-compass-purple/40 hover:text-compass-violet transition-all">
        Retry
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full text-compass-muted tracking-wide text-sm">
      Loading concept map…
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-full text-red-400">{error}</div>
  );
  if (!filtered) return null;

  const nodeCounts = LABEL_ORDER.reduce((acc, label) => {
    acc[label] = data?.nodes.filter(n => n.label === label).length ?? 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-full">

      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-rim bg-dark flex flex-col gap-4 p-4 overflow-y-auto">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-compass-muted mb-2">Node Types</p>
          {LABEL_ORDER.map(label => (
            <button key={label} onClick={() => toggleLabel(label)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-all hover:bg-panel"
              style={{ opacity: activeLabels.has(label) ? 1 : 0.35 }}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: LABEL_COLORS[label] }} />
              <span className="text-compass-white flex-1">{label}</span>
              <span className="text-compass-muted text-[10px]">{nodeCounts[label]}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-compass-muted mb-2">Click Mode</p>
          {(["full", "neighborhood"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-all ${mode === m ? "text-compass-violet bg-compass-purple/10" : "text-compass-muted hover:text-compass-white"}`}>
              {m === "full" ? "Select node" : "Show neighbors"}
            </button>
          ))}
          {selected && mode === "neighborhood" && (
            <button onClick={resetToFull}
              className="w-full text-left text-[10px] px-2 py-1 mt-1 text-compass-muted hover:text-compass-violet border border-rim rounded transition-all">
              ← Back to full graph
            </button>
          )}
        </div>

        {selected && (
          <div className="bg-panel rounded-lg p-3 border border-rim">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
               style={{ color: LABEL_COLORS[selected.label] ?? "#888" }}>
              {selected.label}
            </p>
            <p className="text-xs font-semibold text-compass-white mb-2">{selected.name}</p>
            {selected.props && Object.entries(selected.props)
              .filter(([k, v]) => v != null && k !== "name" && typeof v !== "object")
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} className="text-[10px] mb-1">
                  <span className="text-compass-muted">{k}: </span>
                  <span className="text-compass-white">{String(v)}</span>
                </div>
              ))}
          </div>
        )}

        <div className="mt-auto">
          <p className="text-[10px] text-compass-muted/50 tracking-wide">
            {filtered.nodes.length} nodes · {filtered.links.length} edges
          </p>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="flex-1 text-xs bg-dark/90 border border-rim rounded-lg px-3 py-2 text-compass-white placeholder-compass-muted focus:outline-none focus:border-compass-purple/50 backdrop-blur"
            onKeyDown={e => {
              if (e.key === "Enter" && search && data) {
                const match = data.nodes.find(n => n.name.toLowerCase().includes(search.toLowerCase()));
                if (match) handleNodeClick(match);
              }
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="text-[10px] bg-dark/90 border border-rim rounded-lg px-3 text-compass-muted hover:text-compass-violet transition-all backdrop-blur">
              ✕
            </button>
          )}
        </div>

        <ForceGraph2D
          ref={graphRef}
          graphData={filtered}
          nodeLabel="name"
          nodeColor={(node: GraphNode) => LABEL_COLORS[node.label] ?? "#888"}
          nodeRelSize={5}
          linkColor={() => "rgba(138,130,120,0.4)"}
          linkWidth={1}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkLabel={(link: GraphLink) => link.type}
          backgroundColor="rgb(var(--tw-c-void))"
          onNodeClick={handleNodeClick}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = Math.max(8, 12 / globalScale);
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = "rgba(240,236,229,0.85)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const x = (node as unknown as {x: number}).x ?? 0;
            const y = (node as unknown as {y: number}).y ?? 0;
            if (globalScale > 1.5 || (selected && selected.id === node.id)) {
              ctx.fillText(label, x, y + 9);
            }
            if (selected && selected.id === node.id) {
              ctx.beginPath();
              ctx.arc(x, y, 8, 0, 2 * Math.PI);
              ctx.strokeStyle = LABEL_COLORS[node.label] ?? "#888";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }}
          width={window.innerWidth - 224}
          height={window.innerHeight - 110}
        />
      </div>
    </div>
  );
}
