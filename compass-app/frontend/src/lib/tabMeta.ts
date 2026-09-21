// Navigation model.
//
// Six primary destinations carry everything a Tennessee clinician or policymaker
// needs day to day. Nothing has been removed — views that used to be top-level tabs
// are now sub-tabs of the section they belong to, and the national/out-of-state
// material lives under `natl`, reachable from a de-emphasized link rather than
// competing with Tennessee data in the main tab bar.
//
// `home` and `chat` are deliberately separate: `home` is the always-available
// landing page (hero, example questions), `chat` is the conversation itself.
// Before this split, the landing page was just what "Ask" showed when there
// were no messages yet — once you'd sent one, there was no way back to it.

export type Tab = "home" | "chat" | "data" | "tnsurv" | "clinref" | "library" | "natl";

/** Tabs shown in the main tab bar, in order. */
export const PRIMARY_TABS: Tab[] = ["home", "chat", "data", "tnsurv", "clinref", "library"];

/** Reachable, but deliberately kept off the main tab bar. */
export const SECONDARY_TAB: Tab = "natl";

export const TAB_LABELS: Record<Tab, string> = {
  home:    "Home",
  chat:    "Ask",
  data:    "Find Treatment",
  tnsurv:  "Tennessee Data",
  clinref: "Clinical Tools",
  library: "Library",
  natl:    "National Context",
};

export const TAB_TOOLTIPS: Record<Tab, string> = {
  home:    "What COMPASS does, with example questions to get started",
  chat:    "Ask the AI assistant questions about OUD medications, clinical guidelines, and Tennessee policy",
  data:    "Certified opioid treatment programs across Tennessee and neighboring states",
  tnsurv:  "County overdose map, Knox County toxicology, statewide trends, treatment admissions, prescribing rates, policy timeline, and drug courts",
  clinref: "All4Knox induction guide, MOUD prescriber reference, COWS/DAST screening tools, and MOUD outcome research",
  library: "Search 740+ clinical guidelines, research papers, and Tennessee policy documents",
  natl:    "National and out-of-state reference data — CDC counts, NSDUH prevalence, treatment gap by state, and wastewater surveillance",
};

// ── Sub-tab ids, grouped by their parent tab ────────────────────────────────
export const SUB = {
  tnsurv: {
    map: "map", drd: "drd", tnod: "tnod", teds: "teds",
    rx: "rx", heatmap: "heatmap", timeline: "timeline", drugcourts: "drugcourts",
  },
  clinref: { a4k: "a4k", moudguide: "moudguide", tools: "tools", moud: "moud", outcomes: "outcomes" },
  library: { docs: "docs", graph: "graph", sources: "sources" },
  natl:    { cdc: "cdc", nsduh: "nsduh", demo: "demo", gap: "gap", ww: "ww" },
} as const;

export interface NavTarget {
  tab: Tab;
  sub?: string;
}

// Keywords in chat answers → the view that goes deeper on that topic
const KEYWORD_MAP: Array<{ patterns: RegExp; target: NavTarget; label: string }> = [
  { patterns: /buprenorphine|suboxone|subutex|zubsolv|induction|bernese/i,            target: { tab: "clinref", sub: SUB.clinref.a4k },        label: "All4Knox Guide" },
  { patterns: /methadone|naltrexone|vivitrol|moud|mat\b|medication.assisted/i,        target: { tab: "clinref", sub: SUB.clinref.moud },       label: "MOUD Research" },
  { patterns: /overdose.death|fatal.overdose|mortality|death.rate/i,                  target: { tab: "tnsurv",  sub: SUB.tnsurv.drd },         label: "Knox Co. Deaths" },
  { patterns: /county|knox|shelby|davidson|hamilton|appalachian|rural.ten/i,          target: { tab: "tnsurv",  sub: SUB.tnsurv.map },         label: "TN County Map" },
  { patterns: /prescri(b|ption)|rx\b|hydrocodone|oxycodone|tramadol|benzo/i,          target: { tab: "tnsurv",  sub: SUB.tnsurv.rx },          label: "Prescription Trends" },
  { patterns: /treatment.facilit|otp\b|opioid.treatment.program|clinic/i,             target: { tab: "data" },                                 label: "Find Treatment" },
  { patterns: /treatment.admission|TEDS\b|treatment.episode|heroin.shift|Rx.opioid.transit|opioid.admission|SUD.program|specialty.treatment/i, target: { tab: "tnsurv", sub: SUB.tnsurv.teds }, label: "Treatment Admissions" },
  { patterns: /drug.court|treatment.court|recovery.court|criminal.justice|incarcerat|jail|prison|diversion|NADCP|MAT.criminal/i,               target: { tab: "tnsurv", sub: SUB.tnsurv.drugcourts }, label: "Drug Courts" },
  { patterns: /polysubstance|co.occur|xylazine|stimulant|methamphetamine|fentanyl.mix/i, target: { tab: "tnsurv", sub: SUB.tnsurv.heatmap },   label: "Polysubstance Patterns" },
  { patterns: /cows\b|dast\b|withdrawal.scale|screening.tool|clinical.opiate/i,       target: { tab: "clinref", sub: SUB.clinref.tools },      label: "COWS / DAST" },
  { patterns: /guideline|asam|samhsa|who\b|recommend|clinical.practice/i,             target: { tab: "library", sub: SUB.library.docs },       label: "Library" },
  { patterns: /concept.map|graph|relationship|contraindic/i,                          target: { tab: "library", sub: SUB.library.graph },      label: "Knowledge Map" },
  { patterns: /treatment.gap|unmet.need|access.barri|rural.access|insurance/i,        target: { tab: "natl",    sub: SUB.natl.gap },           label: "Treatment Gap" },
  { patterns: /cdc\b|nsduh|national.survey|provisional|overdose.surveillance/i,       target: { tab: "natl",    sub: SUB.natl.cdc },           label: "National Data" },
  { patterns: /disparit|equity|race|racial|ethnic|sex.differ|age.group|demograph|Black|Hispanic|Native.American|AIAN|gender/i,                 target: { tab: "natl", sub: SUB.natl.demo },   label: "Demographics" },
  { patterns: /wastewater|sewage|biomarker|epidemiolog/i,                             target: { tab: "natl",    sub: SUB.natl.ww },            label: "Wastewater" },
];

export function suggestTabs(answerText: string): Array<NavTarget & { label: string }> {
  const seen = new Set<string>();
  const suggestions: Array<NavTarget & { label: string }> = [];
  for (const { patterns, target, label } of KEYWORD_MAP) {
    const key = `${target.tab}:${target.sub ?? ""}`;
    if (!seen.has(key) && patterns.test(answerText)) {
      seen.add(key);
      suggestions.push({ ...target, label });
    }
    if (suggestions.length >= 3) break;
  }
  return suggestions;
}
