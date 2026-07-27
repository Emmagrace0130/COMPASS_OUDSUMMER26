import { useEffect, useRef, useState } from "react";
import type { HealthStatus } from "../types";

export function StatusBadge() {
  const [status, setStatus]   = useState<HealthStatus | null>(null);
  const [open, setOpen]       = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchStatus = () =>
    fetch("/health")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchBackend = async (id: string) => {
    if (!status || id === status.llm_backend) { setOpen(false); return; }
    setSwitching(true);
    setOpen(false);
    try {
      await fetch("/settings/backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backend: id }),
      });
      await fetchStatus();
    } finally {
      setSwitching(false);
    }
  };

  if (!status) return null;

  const allGood = status.index_ready && status.chain_loaded;
  const current = status.available_backends?.find(b => b.id === status.llm_backend);
  const currentLabel = current?.label ?? status.llm_backend;

  return (
    <div className="flex items-center gap-3" ref={ref}>

      {/* Status dot */}
      <div className="flex items-center gap-1.5 text-[10px] text-compass-muted tracking-wide uppercase">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${allGood ? "bg-compass-cyan shadow-cyan" : "bg-amber-400"}`} />
        {allGood ? "Ready" : !status.index_ready ? "Index not built" : "Loading"}
      </div>

      {/* Model selector */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          disabled={switching}
          className="flex items-center gap-1.5 text-[10px] tracking-wide border border-rim hover:border-compass-purple/40 rounded-lg px-2.5 py-1.5 text-compass-muted hover:text-compass-purple transition-all disabled:opacity-50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-compass-purple/70 inline-block" />
          {switching ? "Switching…" : currentLabel}
          <svg className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && status.available_backends?.length > 0 && (
          <div className="absolute right-0 mt-1 z-50 min-w-[200px] rounded-xl border border-rim bg-panel shadow-lg overflow-hidden">
            {status.available_backends.map(b => (
              <button
                key={b.id}
                onClick={() => switchBackend(b.id)}
                className={`w-full text-left px-3 py-2.5 text-[11px] tracking-wide flex items-center gap-2 transition-colors hover:bg-compass-purple/10 ${
                  b.id === status.llm_backend ? "text-compass-purple" : "text-compass-muted hover:text-compass-white"
                }`}
              >
                {b.id === status.llm_backend && (
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {b.id !== status.llm_backend && <span className="w-3 shrink-0" />}
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
