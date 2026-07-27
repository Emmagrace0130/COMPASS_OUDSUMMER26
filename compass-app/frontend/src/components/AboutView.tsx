import { useEffect, useState } from "react";

interface Topic {
  folder: string;
  label: string;
  pdf_count: number;
  dataset_count: number;
}

interface LibraryData {
  topics: Topic[];
  total_pdfs: number;
}

const TOPIC_ICONS: Record<string, string> = {
  "T1:OUD_med&treat":                          "💊",
  "T2:Clinical_pract_guide":                   "📋",
  "T3:TN_OUD_data&surv":                       "📊",
  "T4:Behavioral&couns_treat":                 "🧠",
  "T5:How_Opioid_Dependance_Works_in_Brain":   "🔬",
  "T6:Co-occuring_mental_health_conditions":   "🤝",
  "T7:Health_equity_&_access_gaps_in_TN":      "⚖️",
  "T8:Harm_reduction":                         "🛡️",
  "T9:Policy_&_Law":                           "⚖️",
  "T11:TN_Judicial_&_Drug_Courts":             "⚖️",
};

const TOPIC_DESC: Record<string, string> = {
  "T1:OUD_med&treat":
    "Research on buprenorphine, methadone, naltrexone, and naloxone — dosing, efficacy, outcomes, and emerging fentanyl-era protocols.",
  "T2:Clinical_pract_guide":
    "ASAM, SAMHSA, CDC, VA/DoD, WHO, and Tennessee-specific clinical practice guidelines for OUD diagnosis and treatment.",
  "T3:TN_OUD_data&surv":
    "Tennessee and national surveillance data: SUDORS overdose reports, CDC provisional death counts, Knox County medical examiner case files, NSDUH state estimates, and CSMD prescription monitoring.",
  "T4:Behavioral&couns_treat":
    "Evidence on contingency management, motivational interviewing, CBT, and psychosocial interventions combined with MOUD.",
  "T5:How_Opioid_Dependance_Works_in_Brain":
    "Neuroscience of opioid dependence — receptor pharmacology, neuroadaptation, and the biological basis of addiction.",
  "T6:Co-occuring_mental_health_conditions":
    "Research on co-occurring SUD and mental illness, integrated treatment approaches, and dual-diagnosis outcomes.",
  "T7:Health_equity_&_access_gaps_in_TN":
    "Studies on racial/ethnic disparities, rural access barriers, housing instability, and structural inequities in OUD care.",
  "T8:Harm_reduction":
    "Naloxone distribution, syringe service programs, fentanyl test strips, xylazine, and overdose prevention strategies.",
  "T9:Policy_&_Law":
    "Tennessee opioid abatement reports, Purdue Sackler settlement, correctional MOUD policy, prescribing law, and federal regulations.",
  "T11:TN_Judicial_&_Drug_Courts":
    "Drug court best practices (NADCP, NTCRC), MAT in criminal justice settings, TN Administrative Office of the Courts reports, federal sentencing data, and jail/prison MOUD access studies.",
};

const STEPS = [
  {
    n: "01",
    title: "Ask a question",
    body: "Type any question about OUD medications, Tennessee policy, treatment protocols, or harm reduction into the chat bar. Plain English — no query syntax needed.",
  },
  {
    n: "02",
    title: "COMPASS searches 740+ sources",
    body: "The engine runs semantic search across peer-reviewed papers, ASAM/SAMHSA/CDC guidelines, Tennessee DOH data, and Knox County surveillance records — all at once.",
  },
  {
    n: "03",
    title: "Read the answer with citations",
    body: "You get a synthesized answer grounded in specific documents, each one named so you can verify. Every claim ties back to a real source in the library.",
  },
];

const COMPETITORS = [
  {
    name: "PubMed",
    what: "Searches 36M+ biomedical articles",
    gap: "Returns raw citations — no synthesis, no clinical context. Requires you to read and interpret 20 papers yourself.",
    compass: "COMPASS synthesizes across sources and answers your question directly.",
  },
  {
    name: "UpToDate",
    what: "Clinical decision support for physicians",
    gap: "Expensive subscription, broad general medicine focus, minimal Tennessee or Appalachian context. Not OUD-specialized.",
    compass: "Free, deeply OUD-specific, Tennessee-anchored.",
  },
  {
    name: "ChatGPT / Gemini",
    what: "General AI chatbots",
    gap: "No grounding in real sources — answers are generated from training data and can hallucinate citations, doses, or policy details.",
    compass: "Every COMPASS answer cites the actual document it came from. No fabrication.",
  },
  {
    name: "SAMHSA TIP PDFs",
    what: "Authoritative OUD treatment guidelines",
    gap: "Static PDFs. You have to know which one to open, then search manually within it.",
    compass: "All SAMHSA TIPs are indexed. Ask a question and the right section surfaces instantly.",
  },
  {
    name: "State Health Dept. Dashboards",
    what: "Tennessee DOH overdose surveillance",
    gap: "Data-only. No clinical guidance, no treatment context, no way to ask follow-up questions.",
    compass: "Combines surveillance data with clinical literature in a single interface.",
  },
  {
    name: "Epic / EHR Tools",
    what: "Built-in clinical references",
    gap: "Tied to one health system, often months behind current literature, not OUD-specialized.",
    compass: "Independent of any health system. Updated continuously with current research.",
  },
];

const DATA_TABS = [
  {
    name: "Treatment Facilities",
    color: "#14b8a6",
    description: "SAMHSA-certified opioid treatment programs across the US. Filterable by state with certification date and contact info.",
    source: "SAMHSA National Directory of Opioid Treatment Programs",
    coverage: "All US states & territories",
  },
  {
    name: "Knox Co. Deaths",
    color: "#f43f5e",
    description: "Individual-level Knox County medical examiner records for drug-related deaths in 2025, including full toxicology panels.",
    source: "Knox County Regional Forensic Center — 2025 DRD dataset",
    coverage: "Knox County, TN · Jan–May 2025 · 336 cases",
  },
  {
    name: "CDC Data",
    color: "#d97316",
    description: "Provisional overdose death counts by TN state-level indicator, county-level death totals, and national drug-specific trends.",
    source: "CDC VSRR Provisional Drug Overdose Death Counts; CDC Provisional Overdose Specific Drugs",
    coverage: "National & TN · 2015–2025 · 4 datasets",
  },
  {
    name: "NSDUH",
    color: "#a78bfa",
    description: "State-level prevalence estimates for OUD, treatment access, unmet need, and co-occurring mental illness across all 50 states.",
    source: "SAMHSA National Survey on Drug Use and Health 2023–2024 Small Area Estimates",
    coverage: "All 50 states + DC · 41 tables · Ages 12+",
  },
  {
    name: "Drug Courts",
    color: "#14b8a6",
    description: "Searchable directory of Tennessee drug/treatment courts with jurisdiction, court level, presiding judge, and DUI eligibility. Backed by T11 library of 20+ drug court policy and outcomes studies.",
    source: "TN RecoveryVet Drug Court Directory · NADCP · NTCRC",
    coverage: "TN statewide · 38 courts · 31 jurisdictions · As of July 2015",
  },
];

export function AboutView() {
  const [library, setLibrary] = useState<LibraryData | null>(null);

  useEffect(() => {
    fetch("/data/library").then(r => r.json()).then(setLibrary).catch(() => {});
  }, []);

  const totalPdfs = library?.total_pdfs ?? "—";
  const totalDatasets = library?.topics.reduce((s, t) => s + t.dataset_count, 0) ?? "—";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-3">
        <img src="/compass-mark.svg" alt="" className="w-14 h-14 mx-auto opacity-80" />
        <h1 className="text-compass-white font-bold text-2xl tracking-widest uppercase">COMPASS</h1>
        <p className="text-compass-muted text-sm max-w-xl mx-auto leading-relaxed">
          A retrieval-augmented research assistant for Opioid Use Disorder, built for the University of Tennessee.
          Ask questions in natural language and get answers grounded in clinical guidelines, research literature, and Tennessee-specific data.
        </p>
        <div className="flex justify-center gap-8 pt-2">
          {[
            { label: "Documents in index", value: String(totalPdfs) },
            { label: "Structured datasets", value: String(totalDatasets) },
            { label: "Topic areas", value: "10" },
            { label: "Data visualization tabs", value: "4" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-compass-violet">{s.value}</p>
              <p className="text-[10px] text-compass-muted tracking-wide uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to use */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
          <span className="w-4 h-px bg-compass-purple/40 inline-block" />
          How to Use COMPASS
          <span className="flex-1 h-px bg-compass-purple/20 inline-block" />
        </h2>
        <div className="grid gap-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-xl p-4 flex gap-4">
              <div className="shrink-0 text-xl font-extrabold text-compass-purple/30 leading-none w-8 text-right">{s.n}</div>
              <div>
                <p className="text-compass-white text-sm font-semibold">{s.title}</p>
                <p className="text-compass-muted text-xs leading-relaxed mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research library */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
          <span className="w-4 h-px bg-compass-purple/40 inline-block" />
          Research Library — Searchable via Chat
          <span className="flex-1 h-px bg-compass-purple/20 inline-block" />
        </h2>
        <div className="grid gap-3">
          {(library?.topics ?? []).map(t => (
            <div key={t.folder} className="glass rounded-xl p-4 flex gap-4">
              <span className="text-2xl shrink-0 mt-0.5">{TOPIC_ICONS[t.folder] ?? "📁"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className="text-compass-white text-sm font-semibold">{t.label}</p>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-compass-muted tracking-wide">
                    {t.pdf_count > 0 && (
                      <span className="bg-compass-purple/15 text-compass-violet border border-compass-purple/20 rounded px-2 py-0.5">
                        {t.pdf_count} PDFs
                      </span>
                    )}
                    {t.dataset_count > 0 && (
                      <span className="bg-compass-cyan/10 text-compass-cyan border border-compass-cyan/20 rounded px-2 py-0.5">
                        {t.dataset_count} datasets
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-compass-muted text-xs leading-relaxed">
                  {TOPIC_DESC[t.folder] ?? ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data visualization tabs */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
          <span className="w-4 h-px bg-compass-purple/40 inline-block" />
          Data Visualization Tabs
          <span className="flex-1 h-px bg-compass-purple/20 inline-block" />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {DATA_TABS.map(tab => (
            <div key={tab.name} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tab.color }} />
                <p className="text-compass-white text-sm font-semibold">{tab.name}</p>
              </div>
              <p className="text-compass-muted text-xs leading-relaxed">{tab.description}</p>
              <div className="pt-1 space-y-1">
                <p className="text-[10px] text-compass-muted/60">
                  <span className="text-compass-muted/80">Source:</span> {tab.source}
                </p>
                <p className="text-[10px] text-compass-muted/60">
                  <span className="text-compass-muted/80">Coverage:</span> {tab.coverage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How chat works */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
          <span className="w-4 h-px bg-compass-purple/40 inline-block" />
          How the Chat Works
          <span className="flex-1 h-px bg-compass-purple/20 inline-block" />
        </h2>
        <div className="glass rounded-xl p-5 text-xs text-compass-muted leading-relaxed space-y-3">
          <p>
            COMPASS uses <span className="text-compass-white">Retrieval-Augmented Generation (RAG)</span>. When you ask a question,
            it searches a FAISS vector index built from the research library, retrieves the most relevant passages,
            and passes them to the selected language model to generate a grounded answer with citations.
          </p>
          <p>
            The <span className="text-compass-white">model selector</span> in the header lets you switch between configured backends —
            Ollama (local LLM), Claude (Anthropic API), or HuggingFace — without restarting the server.
            Answers always cite source documents so you can verify the evidence directly.
          </p>
          <p className="text-compass-muted/50 text-[10px]">
            Built at the University of Tennessee · Axiom Systems Lab · 2025–2026
          </p>
        </div>
      </div>

      {/* Competitive landscape */}
      <div>
        <h2 className="text-compass-white font-bold tracking-widest text-xs uppercase mb-4 flex items-center gap-2">
          <span className="w-4 h-px bg-compass-purple/40 inline-block" />
          How COMPASS Compares
          <span className="flex-1 h-px bg-compass-purple/20 inline-block" />
        </h2>
        <div className="glass rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-rim">
                <th className="text-left px-5 py-3 font-semibold text-compass-muted uppercase tracking-wide text-[10px] w-32">Tool</th>
                <th className="text-left px-5 py-3 font-semibold text-compass-muted uppercase tracking-wide text-[10px]">What it does</th>
                <th className="text-left px-5 py-3 font-semibold text-compass-muted uppercase tracking-wide text-[10px]">The gap</th>
                <th className="text-left px-5 py-3 font-semibold text-compass-purple uppercase tracking-wide text-[10px]">COMPASS fills it by…</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr key={c.name} className={i < COMPETITORS.length - 1 ? "border-b border-rim" : ""}>
                  <td className="px-5 py-4 font-semibold text-compass-white whitespace-nowrap align-top">{c.name}</td>
                  <td className="px-5 py-4 text-compass-muted leading-relaxed align-top">{c.what}</td>
                  <td className="px-5 py-4 text-compass-muted leading-relaxed align-top">{c.gap}</td>
                  <td className="px-5 py-4 text-compass-purple leading-relaxed align-top font-medium">{c.compass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
