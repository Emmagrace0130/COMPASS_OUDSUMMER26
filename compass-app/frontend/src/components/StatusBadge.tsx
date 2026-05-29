import { useEffect, useState } from "react";
import type { HealthStatus } from "../types";

export function StatusBadge() {
  const [status, setStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const check = () =>
      fetch("/health")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const allGood = status.index_ready && status.chain_loaded;

  return (
    <div className="flex items-center gap-2 text-[10px] text-compass-muted tracking-wide uppercase">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${allGood ? "bg-compass-cyan shadow-cyan" : "bg-amber-400"}`} />
      {allGood ? "Ready" : (
        <span>
          {!status.index_ready && "Index not built"}
          {status.index_ready && !status.chain_loaded && "Loading"}
        </span>
      )}
    </div>
  );
}
