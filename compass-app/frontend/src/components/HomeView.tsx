interface HomeViewProps {
  onAsk: (q: string) => void;
}

const CLINICAL_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Ask in Plain English",
    body: "Ask any OUD question in natural language. Answers are synthesized from real peer-reviewed sources — not guessed.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "Clinical Reference Tools",
    body: "COWS & DAST screening calculators, MOUD prescriber reference, All4Knox induction guide, and drug court resources — built in.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Find Treatment",
    body: "Searchable directory of Tennessee OUD treatment facilities with location, services, and MOUD availability.",
  },
];

const POLICY_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    title: "Tennessee-Specific Data",
    body: "County overdose maps, Knox Co. medical examiner toxicology, TennCare policy, and Appalachian context — not just national averages.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Live Surveillance Data",
    body: "CDC overdose counts, NSDUH prevalence, Tennessee treatment admissions, and Knox County toxicology updated as new data is published.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.753 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "One Search, Every Source",
    body: "740+ sources in one place: peer-reviewed papers, SAMHSA TIPs, ASAM guidelines, CDC reports, Tennessee DOH data, and Knox County ME records.",
  },
];

const EXAMPLE_QUESTIONS = [
  "What are the recommended first-line medications for OUD in Tennessee?",
  "How does buprenorphine work and what are the dosing guidelines?",
  "Which Tennessee counties have the largest treatment access gaps?",
  "How do Tennessee's MOUD policies compare to federal guidelines?",
];

export function HomeView({ onAsk }: HomeViewProps) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto px-5 py-10 space-y-16">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="text-center space-y-5">
          <img
            src="/compass-hero.svg"
            alt=""
            aria-hidden="true"
            className="w-28 h-28 md:w-36 md:h-36 mx-auto animate-spin_slow drop-shadow-sm"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-compass-purple/30 text-compass-purple text-[11px] font-semibold tracking-widest uppercase mb-2">
            Clinical &amp; Policy Decision Support · Tennessee
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-compass-white leading-tight">
            Find your way through<br />
            <span className="text-compass-purple">opioid use disorder care</span>
          </h1>
          <p className="text-compass-muted text-base max-w-2xl mx-auto leading-relaxed">
            COMPASS helps Tennessee clinicians and policymakers get grounded answers — from dosing
            protocols to county-level treatment gaps — searched across 740+ clinical guidelines,
            research papers, and state surveillance data, with citations.
          </p>
          <p className="text-compass-muted/70 text-xs font-medium uppercase tracking-widest pt-1">
            Not sure where to start? Try a question below.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {EXAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => onAsk(q)}
                className="text-[12px] px-4 py-2.5 rounded-full border border-rim bg-panel text-compass-muted hover:text-white hover:bg-compass-purple hover:border-compass-purple transition-all shadow-sm hover:shadow-purple hover:-translate-y-0.5"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* ── WHAT IT DOES ─────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-compass-white mb-1">What COMPASS does</h2>
            <p className="text-compass-muted text-sm">For clinical care and for policy &amp; planning.</p>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-compass-purple mb-3">For Clinical Care</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CLINICAL_FEATURES.map(f => (
                <div key={f.title} className="glass rounded-xl p-5 space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-compass-purple/10 flex items-center justify-center text-compass-purple">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-compass-white text-sm">{f.title}</h3>
                  <p className="text-compass-muted text-xs leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-compass-cyan mb-3">For Policy &amp; Planning</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POLICY_FEATURES.map(f => (
                <div key={f.title} className="glass rounded-xl p-5 space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-compass-cyan/10 flex items-center justify-center text-compass-cyan">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-compass-white text-sm">{f.title}</h3>
                  <p className="text-compass-muted text-xs leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER NOTE ──────────────────────────────────────────────── */}
        <section className="border-t border-rim pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-compass-white font-semibold text-sm">COMPASS · University of Tennessee</p>
            <p className="text-compass-muted text-xs mt-0.5">Built for clinicians and policymakers working on OUD in Tennessee.</p>
          </div>
          <p className="text-[10px] text-compass-muted/60 leading-relaxed max-w-xs text-right">
            Not a substitute for clinical judgment. Always verify citations.
          </p>
        </section>

        {/* ── RUBY ─────────────────────────────────────────────────────── */}
        <div className="flex justify-center pb-4">
          <img src="/ruby.png" alt="Ruby — Thanks for researching with me!" className="w-52 h-auto drop-shadow-md" />
        </div>

      </div>
    </div>
  );
}
