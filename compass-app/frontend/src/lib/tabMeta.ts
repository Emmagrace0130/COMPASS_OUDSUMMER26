export type Tab = "chat" | "data" | "tnsurv" | "tnmap" | "ww" | "natdata" |
                  "moudresearch" | "clinref" | "gap" | "drugtrends" | "library" | "graph" | "about";

export const TAB_LABELS: Record<Tab, string> = {
  chat:         "Chat",
  data:         "Find Treatment",
  tnsurv:       "Tennessee Data",
  tnmap:        "County Map",
  ww:           "Drug Supply",
  natdata:      "National Stats",
  moudresearch: "Medication Research",
  clinref:      "Clinical Tools",
  gap:          "Access & Gaps",
  drugtrends:   "Drug Trends",
  library:      "Library",
  graph:        "Knowledge Map",
  about:        "Data Sources",
};

export const TAB_TOOLTIPS: Record<Tab, string> = {
  chat:         "Ask the AI assistant questions about OUD medications, clinical guidelines, and Tennessee policy",
  data:         "Search and filter certified opioid treatment programs and facilities across the US",
  tnsurv:       "Knox County overdose deaths, statewide OD trends, treatment admissions (TEDS 2006–2023), policy timeline, and drug court directory",
  tnmap:        "Overdose death rates per 100k mapped across all 95 Tennessee counties",
  ww:           "Opioid presence in municipal wastewater — early warning signal for community drug supply trends (Tempe, AZ pilot data)",
  natdata:      "CDC national overdose counts, NSDUH state prevalence estimates, and demographic breakdowns by sex, age, and race",
  moudresearch: "Longitudinal patient outcomes from the 1,974-patient CDC MOUD clinical study",
  clinref:      "All4Knox buprenorphine induction guide, MOUD prescriber reference, and COWS/DAST clinical screening tools",
  gap:          "Gap between OUD prevalence and treatment access, broken down by state (SAMHSA/NSDUH data)",
  drugtrends:   "Tennessee prescription drug rates 2013–2024 and polysubstance co-occurrence patterns in overdose deaths",
  library:      "Search and browse 150+ clinical guidelines, research papers, and Tennessee policy documents",
  graph:        "Interactive concept map linking OUD medications, guidelines, populations, and policy topics",
  about:        "Data sources, ingestion methodology, topic coverage, and study background",
};

// Keywords in chat answers → suggested tabs to explore
const KEYWORD_MAP: Array<{ patterns: RegExp; tab: Tab; label: string }> = [
  { patterns: /buprenorphine|suboxone|subutex|zubsolv|induction|bernese/i,          tab: "clinref",      label: "All4Knox Guide" },
  { patterns: /methadone|naltrexone|vivitrol|moud|mat\b|medication.assisted/i,       tab: "moudresearch", label: "MOUD Research" },
  { patterns: /overdose.death|fatal.overdose|mortality|death.rate/i,                tab: "tnsurv",       label: "TN Surveillance" },
  { patterns: /county|knox|shelby|davidson|hamilton|appalachian|rural.ten/i,         tab: "tnmap",        label: "TN County Map" },
  { patterns: /prescri(b|ption)|rx\b|hydrocodone|oxycodone|tramadol|benzo/i,         tab: "drugtrends",   label: "Drug Trends" },
  { patterns: /treatment.facilit|otp\b|opioid.treatment.program|clinic/i,           tab: "data",         label: "Treatment Facilities" },
  { patterns: /wastewater|sewage|biomarker|epidemiolog/i,                            tab: "ww",           label: "Wastewater" },
  { patterns: /cdc\b|nsduh|national.survey|provisional|overdose.surveillance/i,     tab: "natdata",      label: "National Data" },
  { patterns: /treatment.gap|unmet.need|access.barri|rural.access|insurance/i,      tab: "gap",          label: "Treatment Gap" },
  { patterns: /guideline|asam|samhsa|who\b|recommend|clinical.practice/i,           tab: "library",      label: "Library" },
  { patterns: /concept.map|graph|relationship|contraindic/i,                        tab: "graph",        label: "Concept Map" },
  { patterns: /treatment.admission|TEDS\b|treatment.episode|heroin.shift|Rx.opioid.transit|opioid.admission|SUD.program|specialty.treatment/i, tab: "tnsurv", label: "Treatment Admissions" },
  { patterns: /drug.court|treatment.court|recovery.court|criminal.justice|incarcerat|jail|prison|diversion|NADCP|MAT.criminal/i, tab: "tnsurv",  label: "Drug Courts" },
  { patterns: /disparit|equity|race|racial|ethnic|sex.differ|age.group|demograph|Black|Hispanic|Native.American|AIAN|gender/i,   tab: "natdata", label: "Demographics" },
];

export function suggestTabs(answerText: string): Array<{ tab: Tab; label: string }> {
  const seen = new Set<Tab>();
  const suggestions: Array<{ tab: Tab; label: string }> = [];
  for (const { patterns, tab, label } of KEYWORD_MAP) {
    if (!seen.has(tab) && patterns.test(answerText)) {
      seen.add(tab);
      suggestions.push({ tab, label });
    }
    if (suggestions.length >= 3) break;
  }
  return suggestions;
}
