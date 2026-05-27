import type { Source } from "../types";

interface Props {
  sources: Source[];
}

export function SourcesPanel({ sources }: Props) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        Sources ({sources.length})
      </p>
      <div className="space-y-2">
        {sources.map((src, i) => (
          <div
            key={i}
            className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-slate-700 break-all leading-tight">
                {src.file}
              </span>
              {src.page !== "" && (
                <span className="shrink-0 text-slate-400">p.{src.page}</span>
              )}
            </div>
            {src.topic && (
              <span className="inline-block bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 text-[10px] mb-1">
                {src.topic}
              </span>
            )}
            <p className="text-slate-500 italic line-clamp-3">{src.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
