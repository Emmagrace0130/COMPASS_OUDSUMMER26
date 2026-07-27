import { useState, useRef } from "react";

const PROTOCOLS = [
  {
    id: "fentanyl",
    label: "Fentanyl / Short-acting Opioid",
    color: "rose",
    steps: [
      { step: "1", text: "Wait at least 24 hrs from last use" },
      { step: "2", text: "Take 1/8 of film every hour × 8 hours" },
      { step: "3", text: "Then start 8 mg BID (maintenance)" },
    ],
  },
  {
    id: "oxycodone",
    label: "Oxycodone",
    color: "orange",
    steps: [
      { step: "1", text: "Wait at least 12 hrs from last use" },
      { step: "2", text: "Start maintenance dose 8 mg BID directly" },
    ],
  },
  {
    id: "naive",
    label: "Opioid Naïve",
    color: "teal",
    steps: [
      { step: "1", text: "Start lower than typical due to opioid naïve state" },
      { step: "2", text: "Start 4 mg daily" },
      { step: "3", text: "Continue standard dosing per response" },
    ],
  },
  {
    id: "methadone",
    label: "Methadone",
    color: "violet",
    steps: [
      { step: "1", text: "Taper methadone to below 40 mg/day" },
      { step: "2", text: "Wait 24 hrs from last methadone dose" },
      { step: "3", text: "Take 1/8 of film every hour × 8 hours" },
      { step: "★", text: "Consider inpatient detox if needed" },
    ],
  },
];

export function All4KnoxView() {
  const [selected, setSelected] = useState<string | null>(null);
  const protocolRef = useRef<HTMLDivElement>(null);

  function selectProtocol(id: string) {
    setSelected(id);
    setTimeout(() => {
      protocolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="glass rounded-xl p-5 border-l-4 border-compass-violet">
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">All4Knox — Clinical Guidance Summary</h2>
        <p className="text-compass-muted text-xs mt-1">
          When to start buprenorphine · How to start BUP · Interpreting UDS · Responding to positive UDS
        </p>
        <p className="text-compass-muted/60 text-[10px] mt-2 tracking-wide uppercase">
          Source: All4Knox Clinical Summary 2026 · Knox County OUD Treatment Guidance
        </p>
      </div>

      {/* ── SECTION 1: Initiation ── */}
      <Section color="amber" title="Initiation of Suboxone Maintenance">
        <div className="grid grid-cols-2 gap-4">
          <Card title="Starting Criteria" accent="amber">
            <BulletList items={[
              "Patient meets criteria for diagnosis of opioid use disorder (OUD)",
              "Patient agrees to Suboxone maintenance",
              "Choose induction method based on recent substance use and level of tolerance",
              "Method is designed to promptly initiate maintenance treatment while avoiding precipitated withdrawal",
            ]} />
          </Card>
          <Card title="Choose Induction Method" accent="amber">
            <p className="text-xs text-compass-muted mb-3">Click the protocol for the patient's most recent substance:</p>
            <div className="space-y-1.5">
              {PROTOCOLS.map(({ id, label, color }) => {
                const isActive = selected === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectProtocol(id)}
                    className={`w-full flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg border transition-all text-left
                      ${isActive
                        ? `bg-compass-${color}/25 border-compass-${color}/70 shadow-purple`
                        : `bg-compass-${color}/10 border-compass-${color}/20 hover:bg-compass-${color}/20 hover:border-compass-${color}/40`
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full bg-compass-${color} shrink-0 ${isActive ? "shadow-purple" : ""}`} />
                    <span className={`font-medium ${isActive ? `text-compass-${color}` : "text-compass-white"}`}>{label}</span>
                    {isActive && (
                      <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest text-compass-${color}`}>
                        Selected ↓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </Section>

      {/* ── SECTION 2: Induction Protocols ── */}
      <div ref={protocolRef}>
        <Section color="orange" title="Induction Protocols by Prior Substance Use">
          {selected ? (
            // Expanded single-protocol view when one is selected
            (() => {
              const p = PROTOCOLS.find(p => p.id === selected)!;
              return (
                <div className="space-y-3">
                  <div className={`glass rounded-xl p-6 border-2 border-compass-${p.color} shadow-purple`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-sm font-bold tracking-wide uppercase text-compass-${p.color}`}>{p.label}</h4>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-[10px] tracking-widest uppercase text-compass-muted hover:text-compass-violet border border-rim hover:border-compass-purple/40 rounded-lg px-3 py-1.5 transition-all"
                      >
                        Show All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {p.steps.map(({ step, text }) => (
                        <div key={step} className="flex items-start gap-4">
                          <span className={`shrink-0 w-8 h-8 rounded-full bg-compass-${p.color}/20 border-2 border-compass-${p.color}/60 flex items-center justify-center text-sm font-bold text-compass-${p.color}`}>
                            {step}
                          </span>
                          <p className="text-sm text-compass-white leading-relaxed pt-1">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Other protocols dimmed below */}
                  <div className="grid grid-cols-3 gap-3 opacity-40">
                    {PROTOCOLS.filter(p2 => p2.id !== selected).map(p2 => (
                      <button
                        key={p2.id}
                        onClick={() => selectProtocol(p2.id)}
                        className={`glass rounded-xl p-3 border-l-4 border-compass-${p2.color} text-left hover:opacity-100 transition-opacity`}
                      >
                        <p className={`text-[10px] font-bold uppercase text-compass-${p2.color} mb-1`}>{p2.label}</p>
                        <p className="text-[10px] text-compass-muted">{p2.steps.length} steps</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            // Default grid when nothing selected
            <div className="grid grid-cols-2 gap-4">
              {PROTOCOLS.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProtocol(p.id)}
                  className={`glass rounded-xl p-4 border-l-4 border-compass-${p.color} text-left hover:bg-compass-${p.color}/5 hover:border-compass-${p.color} transition-all group`}
                >
                  <h4 className={`text-[11px] font-bold tracking-wide uppercase text-compass-${p.color} mb-3 group-hover:underline`}>{p.label}</h4>
                  <div className="space-y-2">
                    {p.steps.map(({ step, text }) => (
                      <div key={step} className="flex items-start gap-3">
                        <span className={`shrink-0 w-5 h-5 rounded-full bg-compass-${p.color}/20 border border-compass-${p.color}/40 flex items-center justify-center text-[9px] font-bold text-compass-${p.color}`}>
                          {step}
                        </span>
                        <p className="text-xs text-compass-white/85 leading-snug">{text}</p>
                      </div>
                    ))}
                  </div>
                  <p className={`mt-3 text-[9px] uppercase tracking-widest text-compass-${p.color}/50 group-hover:text-compass-${p.color} transition-colors`}>
                    Click to expand →
                  </p>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── SECTION 3: Buprenorphine-Naloxone Education ── */}
      <Section color="teal" title="Buprenorphine-Naloxone (Suboxone) — Key Facts">
        <div className="grid grid-cols-3 gap-4">
          <Card title="What It Is" accent="teal">
            <BulletList items={[
              'Buprenorphine-naloxone combination = "Suboxone"',
              "Buprenorphine is the active ingredient",
              "Naloxone is not absorbed sublingually — only present to prevent injection misuse",
              "Suboxone is the only FDA-approved formulation to treat OUD",
              'Buprenorphine monoproduct "Subutex" is NOT appropriate for treating OUD',
            ]} />
            <Note text='Naloxone ("Narcan") is available OTC. No documented anaphylactic reactions — patients sometimes conflate allergy with precipitated withdrawal.' />
          </Card>

          <Card title="Safety Profile" accent="amber">
            <BulletList items={[
              "Suboxone is incredibly safe — LD₅₀ ~40,000 mg (impossible to reach a lethal amount alone)",
              "Risk increases in combination with other substances (over-sedation, overdose risk)",
            ]} />
            <div className="mt-3 p-3 rounded-lg bg-compass-rose/10 border border-compass-rose/30">
              <p className="text-[10px] font-bold text-compass-rose uppercase tracking-wide mb-1">⚠ Major Safety Risk</p>
              <p className="text-xs text-compass-white/80">Precipitated withdrawal</p>
            </div>
          </Card>

          <Card title="Precipitated Withdrawal" accent="rose">
            <p className="text-xs text-compass-muted mb-2">Occurs when Suboxone is taken too soon after a full opioid agonist:</p>
            <BulletList items={[
              "Buprenorphine's high affinity for the μ-opioid receptor displaces fentanyl/other full agonists",
              "Partial agonism causes ~50% of opioid withdrawal instantly",
              "Very uncomfortable and potentially dangerous",
              "Prevented by waiting the appropriate interval before induction",
            ]} />
          </Card>
        </div>
      </Section>

      {/* ── SECTION 4: Ongoing Treatment ── */}
      <Section color="violet" title="Ongoing Treatment — Dosing &amp; Monitoring">
        <div className="grid grid-cols-2 gap-4">
          <Card title="Suboxone Dosing" accent="violet">
            <BulletList items={[
              "Titrate dose to control cravings — patients with cravings are at higher relapse risk",
              "Standard dose: 16 mg/day",
              "Often divided: 8 mg BID, or taken once daily per patient preference",
              "FDA/package insert standard range: 8–24 mg/day",
            ]} />
            <div className="mt-3 p-3 rounded-lg bg-compass-amber/10 border border-compass-amber/30">
              <p className="text-[10px] font-bold text-compass-amber uppercase tracking-wide mb-1">Tennessee-Specific Limits</p>
              <p className="text-xs text-compass-white/80">
                NPs &amp; PAs: max 16 mg/day &nbsp;·&nbsp; Most physicians: max 20 mg/day
                <br />
                <span className="text-compass-muted">(Addiction specialists may exceed — not standard in most other states)</span>
              </p>
            </div>
            <Note text="Patients needing higher doses: refer to McNabb, Cherokee/River Valley, ReVida, Cedar Recovery." />
          </Card>

          <Card title="Urine Drug Screen (UDS) Monitoring" accent="teal">
            <BulletList items={[
              "Ideally obtain UDS at each appointment",
              "Confirms patient is taking Suboxone (BUP positive expected)",
              "Helps risk-stratify patients who may need higher level of care",
              "Gold standard even if positive result doesn't change prescription plan",
            ]} />
            <div className="mt-3 p-3 rounded-lg bg-compass-teal/10 border border-compass-teal/30">
              <p className="text-[10px] font-bold text-compass-teal uppercase tracking-wide mb-1">Interpreting Results</p>
              <p className="text-xs text-compass-white/80">
                FENT or other opioids present alongside BUP: assess for relapse, consider referral to higher level of care or more intensive monitoring.
              </p>
            </div>
            <Note text="Some providers debate routine UDS if it won't change management — however UDS at each visit is gold standard." />
          </Card>
        </div>
      </Section>

    </div>
  );
}

/* ── Helper components ── */

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const textColor = `text-compass-${color}`;
  const dotColor  = `bg-compass-${color}`;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h3 className={`text-xs font-bold tracking-widest uppercase ${textColor}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Card({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className={`glass rounded-xl p-4 border-t-2 border-compass-${accent}`}>
      <h4 className={`text-[11px] font-bold tracking-wide uppercase text-compass-${accent} mb-3`}>{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-compass-white/80 leading-snug">
          <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-compass-muted" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p className="mt-3 text-[10px] text-compass-muted/70 italic border-t border-rim pt-2 leading-relaxed">
      {text}
    </p>
  );
}
