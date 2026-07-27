import { useState } from "react";

type MedId = "methadone" | "buprenorphine" | "naltrexone";

const MEDS = [
  {
    id: "methadone" as MedId,
    name: "Methadone",
    color: "amber",
    tagline: "Full μ-agonist · Schedule II · OTP required",
    mechanism: [
      "Full agonist at the mu-opioid receptor",
      "Average half-life 24 hrs (range 8–59 hrs) — highly variable between individuals",
      "Steady-state concentration reached in ~5 days",
      "Peak serum concentration 2–4 hrs post-dose — monitor for sedation in this window",
      "No ceiling effect; metabolized by CYP450 3A4",
      "WHO essential medication; largest evidence base of the three agents",
    ],
    dosing: [
      "Restricted to federally-certified Opioid Treatment Programs (OTPs)",
      "Dispensed in liquid formulation; patients initially attend OTP daily",
      "OTP admission: age ≥18 and OUD diagnosis ≥1 year (waived for pregnant women and recently incarcerated)",
      "Initiation and dose increases require great caution — rapid escalation risks respiratory depression",
      "Goal of first weeks: relieve withdrawal while avoiding oversedation",
      "Methadone can be initiated in hospitalized inpatients even without OTP designation",
    ],
    warnings: [
      { label: "QTc Prolongation", text: "Black box warning (2006). Obtain EKG at intake. QTc 450–500: discuss risks/benefits. QTc >500: do not initiate.", color: "rose" },
      { label: "Drug Interactions", text: "Most drug-drug interactions of the three medications. 3A4 inhibitors (antifungals, some antibiotics, antidepressants) cause accumulation. 3A4 inducers cause withdrawal.", color: "orange" },
      { label: "Respiratory Depression", text: "Highest risk in older/cachectic patients, COPD, concurrent BZD/alcohol/sedative use. Use lower doses with heightened caution.", color: "rose" },
    ],
    sideEffects: "Constipation, nausea, sweating, sexual dysfunction, drowsiness, weight gain, edema",
    contraindications: "Allergy, acute asthma, hypercapnic lung disease, paralytic ileus",
  },
  {
    id: "buprenorphine" as MedId,
    name: "Buprenorphine",
    color: "teal",
    tagline: "Partial μ-agonist · Ceiling effect · Office-based prescribing",
    mechanism: [
      "Partial agonist at the mu-opioid receptor — submaximal ceiling effect limits overdose risk vs. full agonists",
      "High binding affinity prevents reinforcement/euphoria if full agonists used concomitantly",
      "High affinity explains precipitated withdrawal: displaces full agonists but activates receptor less",
      "Also a potent kappa receptor antagonist — significant mood benefits, studied as antidepressant",
      "Children and pets can still develop respiratory depression — caution with storage",
    ],
    formulations: [
      { name: "Suboxone® (film)", desc: "Buprenorphine + naloxone sublingual — preferred formulation for OUD" },
      { name: "Zubsolv® (tablet)", desc: "Buprenorphine + naloxone sublingual tablet" },
      { name: "Subutex® (monoproduct)", desc: "Buprenorphine alone — recommended in pregnancy; otherwise not preferred" },
    ],
    dosing: [
      { day: "Pre-induction", text: "Patient must be in early withdrawal. Use COWS score — induction requires COWS > 6 to avoid precipitated withdrawal." },
      { day: "Day 1", text: "First dose 4 mg (or 4/1 mg combination). Monitor vitals, observe 1–2 hrs. May give additional 4 mg. Max day 1: 8–12 mg." },
      { day: "Day 2", text: "Start at max dose of Day 1, add 2–4 mg per residual withdrawal. Typical max: 12–16 mg." },
      { day: "Day 3+", text: "Target maintenance dose 16–20 mg (saturates most opioid receptors). Max daily: 24–32 mg. Split dosing (BID) acceptable per patient preference." },
    ],
    maintenance: [
      "Long-term maintenance superior to short-term detox — open-ended duration based on patient benefit",
      "Detox-only: only 11% retained at 14 weeks vs. 66% with maintenance",
      "Detox patients at higher overdose risk due to tolerance reduction",
      "No predetermined treatment duration — treat as a chronic disease (like diabetes/hypertension)",
    ],
    warnings: [
      { label: "Precipitated Withdrawal", text: "Occurs if given before patient is in sufficient withdrawal. High affinity displaces full agonists → partial activation only → acute withdrawal.", color: "rose" },
      { label: "Home Induction", text: "Safe in appropriate patients. COWS >6 required. Review with patient before discharge.", color: "amber" },
    ],
  },
  {
    id: "naltrexone" as MedId,
    name: "Naltrexone (XR-NTX)",
    color: "violet",
    tagline: "Competitive μ-antagonist · No abuse liability · Monthly injection",
    mechanism: [
      "Competitive mu-opioid receptor antagonist with high affinity — blocks effects of exogenously administered opioids",
      "Oral naltrexone not superior to placebo (poor daily adherence); extended-release injection (XR-NTX) FDA-approved 2010",
      "XR-NTX (Vivitrol®): 380 mg IM q4 weeks — encapsulated in polymer microspheres for sustained release",
      "No CYP450 involvement; limited drug-drug interactions vs. methadone/buprenorphine",
      "No abuse liability; no specific DEA prescribing regulations",
    ],
    induction: [
      "Patient must be abstinent from opioids for at least 7–10 days (longer for long-acting opioids)",
      "Consider naloxone challenge (0.8 mg IN/IM/IV) to confirm no active opioid dependence before induction",
      "Oral lead-in: naltrexone 25 mg Day 1 → 50 mg Day 2 → if tolerated, proceed to XR-NTX",
      "Major challenge: achieving required abstinence period — often requires inpatient/rehab setting",
    ],
    dosingNote: "380 mg IM every 4 weeks (gluteal injection). Ensure patient has naloxone kit. Counsel about overdose risk after missed doses.",
    warnings: [
      { label: "Overdose Risk After Discontinuation", text: "Tolerance markedly reduced while on naltrexone. Missing a dose or stopping treatment creates high overdose risk if opioids resumed. Counsel all patients — provide naloxone kit.", color: "rose" },
      { label: "Precipitated Withdrawal", text: "Naltrexone precipitates withdrawal in patients still using opioids. Confirmed by UDS + patient report + naloxone challenge before induction.", color: "orange" },
      { label: "Emergency Pain Management", text: "If opioids needed urgently, regional anesthesia and non-opioids preferred. Opioids may require high doses + ICU monitoring.", color: "amber" },
    ],
    contraindications: "Allergy, current opioid use, acute opioid withdrawal, severe hepatic impairment, pregnancy (not recommended)",
    monitoring: "Liver function tests at baseline, 6 months, 12 months",
  },
];

const DSM5_CRITERIA = [
  { label: "Amount", text: "Opioids taken in larger amounts or over longer periods than intended" },
  { label: "Craving", text: "Persistent desire or unsuccessful efforts to cut down or control use" },
  { label: "Time", text: "Great deal of time spent obtaining, using, or recovering from opioids" },
  { label: "Craving", text: "Strong desire or urge to use opioids" },
  { label: "Relapse", text: "Recurrent use resulting in failure to fulfill major role obligations (work, school, home)" },
  { label: "Dysfunction", text: "Continued use despite persistent social or interpersonal problems caused by opioids" },
  { label: "Withdrawal", text: "Important social, occupational, or recreational activities given up or reduced" },
  { label: "Harm", text: "Recurrent use in physically hazardous situations" },
  { label: "Insight", text: "Continued use despite knowledge of a physical or psychological problem caused by opioids" },
  { label: "Tolerance", text: "Need for markedly increased amounts to achieve desired effect, or diminished effect with same amount" },
  { label: "Withdrawal", text: "Characteristic opioid withdrawal syndrome, or same/related substance taken to relieve withdrawal" },
];

export function MOUDGuideView() {
  const [activeMed, setActiveMed] = useState<MedId>("buprenorphine");
  const med = MEDS.find(m => m.id === activeMed)!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="glass rounded-xl p-5 border-l-4 border-compass-violet">
        <h2 className="text-compass-white font-bold tracking-widest text-sm uppercase">MOUD Prescriber Guide</h2>
        <p className="text-compass-muted text-xs mt-1">Medications for Opioid Use Disorder · Methadone · Buprenorphine · Naltrexone</p>
        <p className="text-compass-muted/60 text-[10px] mt-2 tracking-wide">
          Source: Azhar N, Chockalingam R, Azhar A. "Medications for Opioid Use Disorder: A Guide for Physicians."
          Missouri Medicine. 2020;117(1):59–64.
        </p>
      </div>

      {/* DSM-5 Criteria */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-compass-amber" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-amber">DSM-5 OUD Criteria</h3>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-compass-muted mb-3">
            ≥2 criteria in 12 months = OUD. &nbsp;
            <span className="text-compass-teal">2–3 = Mild</span> &nbsp;·&nbsp;
            <span className="text-compass-amber">4–5 = Moderate</span> &nbsp;·&nbsp;
            <span className="text-compass-rose">≥6 = Severe</span>
            &nbsp;· Tolerance and withdrawal alone do NOT qualify if opioids taken as prescribed.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DSM5_CRITERIA.map((c, i) => (
              <div key={i} className="flex items-start gap-2 bg-panel rounded-lg px-3 py-2 border border-rim">
                <span className="shrink-0 text-[9px] font-bold text-compass-muted w-4 mt-0.5">{i + 1}</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-compass-violet block mb-0.5">{c.label}</span>
                  <p className="text-[10px] text-compass-white/80 leading-snug">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Medication selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-compass-teal" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-compass-teal">FDA-Approved Medications</h3>
        </div>
        <div className="flex gap-3 mb-4">
          {MEDS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMed(m.id)}
              className={`flex-1 rounded-xl p-4 border-2 text-left transition-all ${
                activeMed === m.id
                  ? `border-compass-${m.color} bg-compass-${m.color}/10`
                  : `border-rim hover:border-compass-${m.color}/40 hover:bg-compass-${m.color}/5`
              }`}
            >
              <p className={`text-sm font-bold ${activeMed === m.id ? `text-compass-${m.color}` : "text-compass-white"}`}>{m.name}</p>
              <p className="text-[10px] text-compass-muted mt-1">{m.tagline}</p>
            </button>
          ))}
        </div>

        {/* Medication detail panel */}
        <div className={`glass rounded-xl border-t-4 border-compass-${med.color} p-5 space-y-5`}>

          {/* Mechanism */}
          <Section title="Mechanism & Pharmacology" color={med.color}>
            <ul className="space-y-1.5">
              {med.mechanism.map((item, i) => <BulletItem key={i} text={item} />)}
            </ul>
          </Section>

          {/* Formulations (buprenorphine only) */}
          {"formulations" in med && med.formulations && (
            <Section title="Formulations" color={med.color}>
              <div className="grid grid-cols-3 gap-3">
                {med.formulations.map(f => (
                  <div key={f.name} className={`bg-compass-${med.color}/10 border border-compass-${med.color}/25 rounded-lg p-3`}>
                    <p className={`text-[11px] font-bold text-compass-${med.color} mb-1`}>{f.name}</p>
                    <p className="text-[11px] text-compass-white/80">{f.desc}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Dosing */}
          {"dosing" in med && Array.isArray(med.dosing) && typeof med.dosing[0] === "string" && (
            <Section title="Prescribing & Dosing" color={med.color}>
              <ul className="space-y-1.5">
                {(med.dosing as string[]).map((item, i) => <BulletItem key={i} text={item} />)}
              </ul>
            </Section>
          )}

          {/* Buprenorphine day-by-day dosing */}
          {"dosing" in med && Array.isArray(med.dosing) && typeof med.dosing[0] === "object" && (
            <Section title="Induction & Dosing Schedule" color={med.color}>
              <div className="space-y-2">
                {(med.dosing as {day: string; text: string}[]).map(d => (
                  <div key={d.day} className="flex items-start gap-3">
                    <span className={`shrink-0 text-[10px] font-bold text-compass-${med.color} bg-compass-${med.color}/15 border border-compass-${med.color}/30 rounded-lg px-2 py-1 w-24 text-center`}>
                      {d.day}
                    </span>
                    <p className="text-xs text-compass-white/85 leading-relaxed pt-1">{d.text}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Naltrexone induction */}
          {"induction" in med && med.induction && (
            <Section title="Induction Requirements" color={med.color}>
              <ul className="space-y-1.5">
                {med.induction.map((item, i) => <BulletItem key={i} text={item} />)}
              </ul>
              {med.dosingNote && (
                <div className={`mt-3 p-3 rounded-lg bg-compass-${med.color}/10 border border-compass-${med.color}/30`}>
                  <p className={`text-[10px] font-bold text-compass-${med.color} uppercase tracking-wide mb-1`}>Dosing</p>
                  <p className="text-xs text-compass-white/85">{med.dosingNote}</p>
                </div>
              )}
            </Section>
          )}

          {/* Maintenance (buprenorphine) */}
          {"maintenance" in med && med.maintenance && (
            <Section title="Detox vs. Maintenance" color={med.color}>
              <ul className="space-y-1.5">
                {med.maintenance.map((item, i) => <BulletItem key={i} text={item} />)}
              </ul>
            </Section>
          )}

          {/* Warnings */}
          <Section title="Key Warnings" color={med.color}>
            <div className="space-y-2">
              {med.warnings.map(w => (
                <div key={w.label} className={`p-3 rounded-lg bg-compass-${w.color}/10 border border-compass-${w.color}/30`}>
                  <p className={`text-[10px] font-bold text-compass-${w.color} uppercase tracking-wide mb-1`}>⚠ {w.label}</p>
                  <p className="text-xs text-compass-white/80">{w.text}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Side effects / contraindications */}
          {"sideEffects" in med && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-panel rounded-lg p-3 border border-rim">
                <p className="text-[10px] font-bold text-compass-muted uppercase tracking-wide mb-1">Common Side Effects</p>
                <p className="text-xs text-compass-white/80">{med.sideEffects}</p>
              </div>
              <div className="bg-panel rounded-lg p-3 border border-rim">
                <p className="text-[10px] font-bold text-compass-muted uppercase tracking-wide mb-1">Contraindications</p>
                <p className="text-xs text-compass-white/80">{med.contraindications}</p>
              </div>
            </div>
          )}
          {"contraindications" in med && !("sideEffects" in med) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-panel rounded-lg p-3 border border-rim">
                <p className="text-[10px] font-bold text-compass-muted uppercase tracking-wide mb-1">Contraindications</p>
                <p className="text-xs text-compass-white/80">{med.contraindications}</p>
              </div>
              {"monitoring" in med && (
                <div className="bg-panel rounded-lg p-3 border border-rim">
                  <p className="text-[10px] font-bold text-compass-muted uppercase tracking-wide mb-1">Monitoring</p>
                  <p className="text-xs text-compass-white/80">{med.monitoring}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Duration of treatment */}
      <div className="glass rounded-xl p-5 border-l-4 border-compass-cyan">
        <h3 className="text-xs font-bold tracking-widest uppercase text-compass-cyan mb-3">Duration of Treatment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-compass-white mb-2">Preferred: Maintenance</p>
            <ul className="space-y-1.5">
              {[
                "No predetermined duration — treat OUD as a chronic disease (like diabetes or hypertension)",
                "Maintenance medication: 66% retention at 14 weeks",
                "Patients can focus on long-term recovery rather than managing withdrawal",
                "Discontinuation of medication leads to relapse — short-term treatment generally not recommended",
              ].map((t, i) => <BulletItem key={i} text={t} />)}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-compass-rose mb-2">Caution: Detox-Only</p>
            <ul className="space-y-1.5">
              {[
                "Only 11% retained in treatment at 14 weeks on detox regimen",
                "Detox patients at higher overdose risk — tolerance reduced after short sobriety",
                "Over 25% reported non-fatal overdose during 2-year follow-up after detox discharge",
                "Rapid detoxification strategies place patients at elevated relapse and overdose risk",
              ].map((t, i) => <BulletItem key={i} text={t} color="rose" />)}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest text-compass-${color} mb-2`}>{title}</p>
      {children}
    </div>
  );
}

function BulletItem({ text, color = "muted" }: { text: string; color?: string }) {
  return (
    <li className="flex items-start gap-2 text-xs text-compass-white/80 leading-snug list-none">
      <span className={`shrink-0 mt-1.5 w-1 h-1 rounded-full bg-compass-${color}`} />
      {text}
    </li>
  );
}
