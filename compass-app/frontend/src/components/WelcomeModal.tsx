interface Props {
  onClose: () => void;
}

const USE_CASES = [
  {
    icon: "◈",
    color: "text-compass-purple",
    border: "border-compass-purple/20 bg-compass-purple/5",
    title: "Ask Clinical Questions",
    desc: "Get evidence-based answers about OUD medications, dosing protocols, ASAM/SAMHSA guidelines, and Tennessee-specific policy — grounded in 740+ source documents.",
    example: "What is the recommended starting dose of buprenorphine for a fentanyl-dependent patient?",
  },
  {
    icon: "◉",
    color: "text-compass-cyan",
    border: "border-compass-cyan/20 bg-compass-cyan/5",
    title: "Track Policy & Access Data",
    desc: "Visualize overdose death trends, county-level treatment gaps, prescription rates, drug court coverage, and facility access across all 95 TN counties — built for planning and legislative use.",
    example: "Which counties have the largest gap between OUD prevalence and treatment access?",
  },
  {
    icon: "◆",
    color: "text-stone-500",
    border: "border-stone-400/30 bg-stone-400/10",
    title: "Use Clinical Reference Tools",
    desc: "Access the All4Knox buprenorphine induction guide, MOUD prescriber reference, COWS/DAST screening tools, and the OUD concept map — all in one place.",
    example: "Score a patient on the COWS withdrawal scale during induction.",
  },
];

export function WelcomeModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-2xl border border-compass-purple/30 shadow-purple overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-rim">
          <div className="flex items-center gap-3 mb-3">
            <img src="/compass-mark.svg" alt="" className="w-8 h-8" />
            <h1 className="text-compass-white font-bold tracking-widest text-lg uppercase">
              COMPASS
            </h1>
          </div>
          <p className="text-compass-white text-sm font-medium">Clinical OUD Map &amp; Policy Assistance Support System</p>
          <p className="text-compass-muted text-xs mt-1">
            An AI assistant built for Tennessee clinicians and policymakers working on opioid use disorder —
            grounded in clinical guidelines, state surveillance data, and local policy documents.
          </p>
        </div>

        {/* Use cases */}
        <div className="px-8 py-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-compass-muted">Three ways to use COMPASS</p>
          {USE_CASES.map(uc => (
            <div key={uc.title} className={`flex gap-4 rounded-xl border p-4 ${uc.border}`}>
              <span className={`shrink-0 text-xl ${uc.color} mt-0.5`}>{uc.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${uc.color} mb-1`}>{uc.title}</p>
                <p className="text-xs text-compass-white/80 leading-relaxed">{uc.desc}</p>
                <p className="text-[10px] text-compass-muted/70 mt-1.5 italic">e.g. {uc.example}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex items-center justify-between">
          <p className="text-[10px] text-compass-muted/50 tracking-wide">
            UTK Applied Systems Lab · Summer 2026 · <span className="text-compass-violet">compass.axiomsystemslab.com</span>
          </p>
          <button
            onClick={onClose}
            className="bg-compass-purple/20 hover:bg-compass-purple/30 border border-compass-purple/50 text-compass-violet rounded-xl px-6 py-2.5 text-sm font-medium tracking-wide transition-all shadow-purple"
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
