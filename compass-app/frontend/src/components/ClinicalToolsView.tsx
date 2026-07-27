import { useState } from "react";

// ── COWS data ─────────────────────────────────────────────────────────────────
const COWS_ITEMS = [
  {
    id: "pulse",
    label: "Resting Pulse Rate",
    note: "Measure after patient sits or lies for 1 minute",
    options: [
      { value: 0, label: "≤80 bpm" },
      { value: 1, label: "81–100 bpm" },
      { value: 2, label: "101–120 bpm" },
      { value: 4, label: ">120 bpm" },
    ],
  },
  {
    id: "sweating",
    label: "Sweating",
    note: "Over the past 30 minutes, not accounted for by room temperature or activity",
    options: [
      { value: 0, label: "No report of chills or flushing" },
      { value: 1, label: "Subjective complaint, not observed" },
      { value: 2, label: "Flushed or observable moisture on face" },
      { value: 3, label: "Beads of sweat on brow or face" },
      { value: 4, label: "Sweat streaming off face" },
    ],
  },
  {
    id: "restlessness",
    label: "Restlessness",
    note: "Observation during assessment",
    options: [
      { value: 0, label: "Able to sit still" },
      { value: 1, label: "Reports difficulty sitting still, but able to do so" },
      { value: 3, label: "Frequent shifting or extraneous movements" },
      { value: 5, label: "Unable to sit still for more than a few seconds" },
    ],
  },
  {
    id: "pupils",
    label: "Pupil Size",
    note: "Account for room lighting",
    options: [
      { value: 0, label: "Pinned or normal for room light" },
      { value: 1, label: "Possibly larger than normal" },
      { value: 2, label: "Moderately dilated" },
      { value: 5, label: "So dilated only rim of iris is visible" },
    ],
  },
  {
    id: "bones",
    label: "Bone or Joint Aches",
    note: "If the patient was having pain previously, score only the additional component due to opioid withdrawal",
    options: [
      { value: 0, label: "Not present" },
      { value: 1, label: "Mild diffuse discomfort" },
      { value: 2, label: "Reports severe diffuse aching" },
      { value: 4, label: "Rubbing joints/muscles and unable to sit still" },
    ],
  },
  {
    id: "nose",
    label: "Runny Nose or Tearing",
    note: "Not accounted for by cold symptoms or allergies",
    options: [
      { value: 0, label: "Not present" },
      { value: 1, label: "Nasal stuffiness or unusually moist eyes" },
      { value: 2, label: "Nose running or tearing" },
      { value: 4, label: "Nose constantly running or tears streaming down cheeks" },
    ],
  },
  {
    id: "gi",
    label: "GI Upset",
    note: "Over last 30 minutes",
    options: [
      { value: 0, label: "No GI symptoms" },
      { value: 1, label: "Stomach cramps" },
      { value: 2, label: "Nausea or loose stool" },
      { value: 3, label: "Vomiting or diarrhea" },
      { value: 5, label: "Multiple episodes of diarrhea or vomiting" },
    ],
  },
  {
    id: "tremor",
    label: "Tremor",
    note: "Observation of outstretched hands",
    options: [
      { value: 0, label: "No tremor" },
      { value: 1, label: "Tremor felt but not observed" },
      { value: 2, label: "Slight tremor observable" },
      { value: 4, label: "Gross tremor or muscle twitching" },
    ],
  },
  {
    id: "yawning",
    label: "Yawning",
    note: "Observation during assessment",
    options: [
      { value: 0, label: "No yawning" },
      { value: 1, label: "Yawning 1–2 times" },
      { value: 2, label: "Yawning 3 or more times" },
      { value: 4, label: "Yawning several times per minute" },
    ],
  },
  {
    id: "anxiety",
    label: "Anxiety or Irritability",
    options: [
      { value: 0, label: "None" },
      { value: 1, label: "Reports increasing irritability or anxiousness" },
      { value: 2, label: "Obviously irritable or anxious" },
      { value: 4, label: "So irritable that participation in assessment is difficult" },
    ],
  },
  {
    id: "gooseflesh",
    label: "Gooseflesh Skin",
    options: [
      { value: 0, label: "Skin is smooth" },
      { value: 3, label: "Piloerection felt or hairs standing up on arms" },
      { value: 5, label: "Prominent piloerection" },
    ],
  },
];

function cowsSeverity(score: number) {
  if (score <= 4)  return { label: "No Withdrawal", color: "#8a8278",  bg: "rgba(138,130,120,0.15)" };
  if (score <= 12) return { label: "Mild",           color: "#14b8a6",  bg: "rgba(20,184,166,0.15)"  };
  if (score <= 24) return { label: "Moderate",       color: "#d97316",  bg: "rgba(217,115,22,0.15)"  };
  if (score <= 36) return { label: "Moderately Severe", color: "#f97316", bg: "rgba(249,115,22,0.18)" };
  return                  { label: "Severe",         color: "#f43f5e",  bg: "rgba(244,63,94,0.18)"   };
}

// ── DAST-10 data ──────────────────────────────────────────────────────────────
const DAST_ITEMS = [
  { id: "d1",  q: "Have you used drugs other than those required for medical reasons?",                        yesScore: 1 },
  { id: "d2",  q: "Have you abused prescription drugs?",                                                       yesScore: 1 },
  { id: "d3",  q: "Do you abuse more than one drug at a time?",                                                yesScore: 1 },
  { id: "d4",  q: "Can you get through the week without using drugs? (No = problem)",                         yesScore: 0, noScore: 1 },
  { id: "d5",  q: "Are you always able to stop using drugs when you want to? (No = problem)",                 yesScore: 0, noScore: 1 },
  { id: "d6",  q: "Have you had blackouts or flashbacks as a result of drug use?",                             yesScore: 1 },
  { id: "d7",  q: "Do you ever feel bad or guilty about your drug use?",                                       yesScore: 1 },
  { id: "d8",  q: "Does your spouse or parents ever complain about your involvement with drugs?",               yesScore: 1 },
  { id: "d9",  q: "Has your drug use created problems between you and a loved one?",                           yesScore: 1 },
  { id: "d10", q: "Have you lost friends or family because of your use of drugs?",                             yesScore: 1 },
];

function dastSeverity(score: number) {
  if (score === 0) return { label: "No Problem Indicated",   color: "#8a8278",  action: "No action indicated." };
  if (score <= 2)  return { label: "Low Level",              color: "#14b8a6",  action: "Monitor; re-evaluate at follow-up visits." };
  if (score <= 5)  return { label: "Moderate Level",         color: "#d97316",  action: "Brief intervention; assessment for SUD indicated." };
  if (score <= 8)  return { label: "Substantial Level",      color: "#fb923c",  action: "Intensive assessment; referral to specialist recommended." };
  return                  { label: "Severe Level",           color: "#f43f5e",  action: "Intensive assessment; referral to treatment program." };
}

// ── Buprenorphine reference ───────────────────────────────────────────────────
const BUP_PROTOCOLS = [
  {
    title: "Standard Induction (Short-acting opioids / heroin)",
    when: "Use when patient is on heroin, oxycodone, hydrocodone, or other short-acting opioids. Patient must be in mild-moderate withdrawal (COWS ≥ 8–12).",
    steps: [
      "Confirm COWS ≥ 8–12 and last opioid use > 12–24h ago.",
      "Give buprenorphine/naloxone 2–4 mg SL. Observe 30–60 minutes.",
      "If no precipitated withdrawal and COWS remains elevated, give additional 2–4 mg.",
      "Day 1 total: typically 8–12 mg. Do not exceed 16 mg day 1.",
      "Day 2 onward: titrate to clinical effect. Most patients stabilize at 16–24 mg/day.",
      "Target dose: 16–24 mg/day for most patients. Higher doses (up to 32 mg) may be needed in fentanyl era.",
    ],
    warning: null,
  },
  {
    title: "Low-Dose (Bernese) Induction — Fentanyl Era",
    when: "Use when patient is actively using fentanyl, has long-acting opioids on board, or is at high risk for precipitated withdrawal. No withdrawal requirement.",
    steps: [
      "Day 1–2: Buprenorphine 0.5–1 mg SL every 6–8h while continuing full-agonist opioids.",
      "Day 3–4: Increase to 2 mg SL every 6–8h. May reduce full-agonist opioid use.",
      "Day 5–7: Increase to 4–8 mg SL twice daily. Discontinue full-agonist opioid.",
      "Day 7–14: Titrate to standard maintenance dose (16–24 mg/day).",
      "Requires patient education and careful monitoring. Consider inpatient or intensive outpatient setting.",
    ],
    warning: "⚠️ Requires clinician supervision. Precipitated withdrawal risk is lower but not zero. Naloxone-containing formulation preferred.",
  },
  {
    title: "Maintenance Dosing",
    when: "For patients stabilized on buprenorphine therapy.",
    steps: [
      "Standard maintenance: 16–24 mg/day (buprenorphine/naloxone SL film or tablet).",
      "Fentanyl-era consideration: higher doses (24–32 mg/day) may be needed for adequate receptor occupancy.",
      "Extended-release injectable (CAM2038, Sublocade): monthly or weekly injections for improved adherence.",
      "Buprenorphine implants (Probuphine): 6-month subdermal implants for stable patients on ≤8 mg/day.",
      "Monitor for diversion; use urine drug screens per clinic protocol.",
      "Long-term treatment is associated with significantly better outcomes — no arbitrary time limits.",
    ],
    warning: null,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
type Tool = "cows" | "dast" | "bup";

export function ClinicalToolsView() {
  const [tool, setTool] = useState<Tool>("cows");

  // COWS state
  const [cowsAnswers, setCowsAnswers] = useState<Record<string, number>>({});
  const cowsScore   = Object.values(cowsAnswers).reduce((s, v) => s + v, 0);
  const cowsAnswered = Object.keys(cowsAnswers).length;
  const cowsSev     = cowsSeverity(cowsScore);

  // DAST state
  const [dastAnswers, setDastAnswers] = useState<Record<string, "yes" | "no" | null>>({});
  const dastScore = DAST_ITEMS.reduce((s, item) => {
    const ans = dastAnswers[item.id];
    if (ans === "yes") return s + item.yesScore;
    if (ans === "no" && item.noScore) return s + item.noScore;
    return s;
  }, 0);
  const dastAnswered = Object.values(dastAnswers).filter(v => v !== null).length;
  const dastSev = dastSeverity(dastScore);

  const TABS: { id: Tool; label: string }[] = [
    { id: "cows", label: "COWS" },
    { id: "dast", label: "DAST-10" },
    { id: "bup",  label: "Buprenorphine Reference" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">Clinical Tools</h2>
        <p className="text-compass-muted text-xs mt-1">Calculators and quick-reference guides for OUD clinical assessment and treatment</p>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-1 border-b border-compass-purple/15">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`px-5 py-2.5 text-xs font-medium tracking-widest uppercase border-b-2 transition-all ${
              tool === t.id ? "border-compass-violet text-compass-violet" : "border-transparent text-compass-muted hover:text-compass-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── COWS ── */}
      {tool === "cows" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-compass-white font-semibold">Clinical Opiate Withdrawal Scale (COWS)</h3>
              <p className="text-compass-muted text-xs mt-1">11-item clinician-rated scale. Complete all items before scoring.</p>
            </div>
            {cowsAnswered > 0 && (
              <div className="text-right shrink-0 ml-6">
                <div className="text-4xl font-bold" style={{ color: cowsSev.color }}>{cowsScore}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: cowsSev.color }}>{cowsSev.label}</div>
                <div className="text-[10px] text-compass-muted mt-0.5">{cowsAnswered}/11 items</div>
              </div>
            )}
          </div>

          {/* Score interpretation bar */}
          <div className="glass rounded-xl p-4">
            <div className="flex text-[9px] text-compass-muted justify-between mb-1">
              <span>0</span><span>5</span><span>12</span><span>25</span><span>36+</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-2">
              <div className="flex-none w-[10%] bg-compass-muted/40" />
              <div className="flex-none w-[16%] bg-teal-500" />
              <div className="flex-none w-[26%] bg-amber-500" />
              <div className="flex-none w-[22%] bg-orange-500" />
              <div className="flex-1 bg-rose-600" />
            </div>
            <div className="flex text-[9px] text-compass-muted justify-between mt-1">
              <span>None</span><span>Mild</span><span>Moderate</span><span>Mod-Severe</span><span>Severe</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {COWS_ITEMS.map(item => (
              <div key={item.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-compass-white text-sm font-medium">{item.label}</p>
                    {item.note && <p className="text-compass-muted text-[11px] mt-0.5 italic">{item.note}</p>}
                  </div>
                  {cowsAnswers[item.id] !== undefined && (
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded" style={{ background: cowsSev.bg, color: cowsSev.color }}>
                      +{cowsAnswers[item.id]}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.options.map(opt => (
                    <button key={opt.value}
                      onClick={() => setCowsAnswers(p => ({ ...p, [item.id]: opt.value }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        cowsAnswers[item.id] === opt.value
                          ? "border-compass-violet text-compass-violet bg-compass-purple/15"
                          : "border-rim text-compass-muted hover:border-compass-purple/40 hover:text-compass-white"
                      }`}>
                      {opt.label} <span className="opacity-60 text-[10px]">(+{opt.value})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          {cowsAnswered === 11 && (
            <div className="rounded-xl p-5 border" style={{ background: cowsSev.bg, borderColor: cowsSev.color + "44" }}>
              <p className="text-lg font-bold" style={{ color: cowsSev.color }}>
                Score: {cowsScore} — {cowsSev.label} Withdrawal
              </p>
              <div className="mt-3 text-xs text-compass-muted space-y-1">
                {cowsScore < 8 && <p>COWS &lt; 8: Patient not yet in sufficient withdrawal for standard buprenorphine induction. Consider low-dose (Bernese) protocol or wait until COWS ≥ 8–12.</p>}
                {cowsScore >= 8 && cowsScore <= 12 && <p>COWS 8–12: Patient is in mild withdrawal. Appropriate to begin standard buprenorphine induction with 2–4 mg test dose.</p>}
                {cowsScore >= 13 && cowsScore <= 24 && <p>COWS 13–24: Moderate withdrawal. Begin buprenorphine induction. Patient may benefit from comfort medications alongside.</p>}
                {cowsScore >= 25 && <p>COWS ≥ 25: Moderately severe to severe withdrawal. Initiate buprenorphine and consider adjunct comfort medications (clonidine, hydroxyzine, NSAIDS, anti-diarrheals).</p>}
              </div>
              <button onClick={() => setCowsAnswers({})}
                className="mt-3 text-[10px] tracking-widest uppercase text-compass-muted hover:text-compass-violet border border-rim hover:border-compass-purple/40 rounded-lg px-3 py-1.5 transition-all">
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DAST-10 ── */}
      {tool === "dast" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-compass-white font-semibold">Drug Abuse Screening Test (DAST-10)</h3>
              <p className="text-compass-muted text-xs mt-1">
                10-item self-report screen. "In the past 12 months..." Ask about drugs other than alcohol.
              </p>
            </div>
            {dastAnswered > 0 && (
              <div className="text-right shrink-0 ml-6">
                <div className="text-4xl font-bold" style={{ color: dastSev.color }}>{dastScore}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: dastSev.color }}>{dastSev.label}</div>
                <div className="text-[10px] text-compass-muted mt-0.5">{dastAnswered}/10 answered</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {DAST_ITEMS.map((item, i) => (
              <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4">
                <span className="shrink-0 text-compass-muted text-xs w-5">{i + 1}.</span>
                <p className="flex-1 text-compass-white text-sm">{item.q}</p>
                <div className="flex gap-2 shrink-0">
                  {(["yes", "no"] as const).map(ans => (
                    <button key={ans}
                      onClick={() => setDastAnswers(p => ({ ...p, [item.id]: ans }))}
                      className={`text-xs px-4 py-1.5 rounded-lg border uppercase tracking-widest transition-all ${
                        dastAnswers[item.id] === ans
                          ? ans === "yes" ? "border-rose-500 text-rose-400 bg-rose-500/10" : "border-teal-500 text-teal-400 bg-teal-500/10"
                          : "border-rim text-compass-muted hover:border-compass-purple/40 hover:text-compass-white"
                      }`}>
                      {ans}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {dastAnswered >= 8 && (
            <div className="rounded-xl p-5 border" style={{ background: `${dastSev.color}18`, borderColor: dastSev.color + "44" }}>
              <p className="text-lg font-bold" style={{ color: dastSev.color }}>
                Score: {dastScore}/10 — {dastSev.label}
              </p>
              <p className="text-compass-muted text-xs mt-2">{dastSev.action}</p>
              <button onClick={() => setDastAnswers({})}
                className="mt-3 text-[10px] tracking-widest uppercase text-compass-muted hover:text-compass-violet border border-rim hover:border-compass-purple/40 rounded-lg px-3 py-1.5 transition-all">
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Buprenorphine Reference ── */}
      {tool === "bup" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-compass-white font-semibold">Buprenorphine Induction & Dosing Reference</h3>
            <p className="text-compass-muted text-xs mt-1">
              Quick reference based on SAMHSA TIP 63, ASAM CPG 2020, and PCSS fentanyl-era guidance.
              Not a substitute for clinical judgment.
            </p>
          </div>

          {BUP_PROTOCOLS.map((p, i) => (
            <div key={i} className="glass rounded-xl p-5 space-y-3">
              <div>
                <h4 className="text-compass-white font-semibold text-sm">{p.title}</h4>
                <p className="text-compass-muted text-xs mt-1 italic">{p.when}</p>
              </div>

              {p.warning && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                  {p.warning}
                </div>
              )}

              <ol className="space-y-2">
                {p.steps.map((step, j) => (
                  <li key={j} className="flex gap-3 text-xs text-compass-muted leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-compass-purple/20 text-compass-violet flex items-center justify-center text-[10px] font-bold mt-0.5">{j + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* Key clinical pearls */}
          <div className="glass rounded-xl p-5">
            <h4 className="text-compass-white font-semibold text-sm mb-3">Key Clinical Pearls — Fentanyl Era</h4>
            <ul className="space-y-2 text-xs text-compass-muted">
              {[
                "Fentanyl has high receptor affinity and long tissue half-life — patients may not be in withdrawal for 24–48h+ after last use.",
                "Standard COWS ≥ 8 threshold may not apply with fentanyl — patients can have a positive urine fentanyl yet still experience precipitated withdrawal.",
                "Higher buprenorphine doses (24–32 mg/day) are often needed in the fentanyl era to achieve adequate receptor occupancy.",
                "Precipitated withdrawal with buprenorphine in fentanyl-dependent patients can be severe — low-dose Bernese induction significantly reduces this risk.",
                "Home induction (patient-initiated) is evidence-supported and reduces barriers to treatment initiation.",
                "TN TennCare requires prior authorization for buprenorphine — confirm patient insurance before initiating.",
              ].map((p, i) => (
                <li key={i} className="flex gap-2 leading-relaxed">
                  <span className="shrink-0 text-compass-violet mt-0.5">›</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
