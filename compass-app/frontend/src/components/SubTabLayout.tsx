import { useState } from "react";

interface SubTab {
  id: string;
  label: string;
  content: React.ReactNode;
  overflow?: string;
}

export function SubTabLayout({ tabs, initial }: { tabs: SubTab[]; initial?: string }) {
  const [active, setActive] = useState(
    initial && tabs.some(t => t.id === initial) ? initial : tabs[0].id
  );
  const current = tabs.find(t => t.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex gap-1 px-4 py-2 bg-dark border-b border-rim overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap ${
              active === t.id
                ? "bg-compass-purple/15 text-compass-purple border border-compass-purple/30"
                : "text-compass-muted hover:text-compass-white hover:bg-panel border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={`flex-1 ${current.overflow ?? "overflow-y-auto"}`}>
        {current.content}
      </div>
    </div>
  );
}
