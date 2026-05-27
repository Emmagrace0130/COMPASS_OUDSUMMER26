import type { Source } from "../types";

interface Props {
  sources: Source[];
}

export function SourcesPanel({ sources }: Props) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold text-compass-glow/50 uppercase tracking-widest">
        Sources ({sources.length})
      </p>
      <div className="space-y-2">
        {sources.map((src, i) => (
          <div key={i} className="glass rounded-lg p-3 text-xs">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-compass-mist/80 break-all leading-tight">
                {src.file}
              </span>
              {src.page !== "" && (
                <span className="shrink-0 text-compass-steel/60">p.{src.page}</span>
              )}
            </div>
            {src.topic && (
              <span className="inline-block bg-compass-glow/10 text-compass-glow border border-compass-glow/20 rounded px-1.5 py-0.5 text-[10px] mb-1">
                {src.topic}
              </span>
            )}
            <p className="text-compass-steel/70 italic line-clamp-3">{src.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
