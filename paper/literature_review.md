# Literature Review: Systems Comparable to COMPASS

*Compiled 2026-09-18. Web research conducted via live search — see Sources at the end for
every link. This is meant to (a) stand on its own as a survey, and (b) feed directly into
the paper's thin Related Work section (Section 2 of `COMPASS_paper_draft.tex`), which
currently cites general AI-in-addiction-medicine literature but no specific comparable
*systems*.*

## Method

Searched for: RAG/LLM chatbots for OUD or addiction medicine; knowledge-graph-augmented
clinical decision support generally; general-purpose clinical evidence-QA tools; state-level
opioid surveillance dashboards; OUD-specific knowledge graphs and concept maps; substance-use
education/recovery AI tools; demographic-bias evaluation of clinical LLMs; and telehealth OUD
treatment platforms (to establish what category COMPASS is *not* in). Not a formal PRISMA
review — a targeted survey to answer one question: **does anything like COMPASS already
exist, and if so, what does it do that COMPASS doesn't (and vice versa)?**

---

## 1. The closest direct comparator: a Scotland MAT chatbot (RAG + LLM + Knowledge Graph)

**[Development of an AI-driven chatbot for medication-assisted treatment standards in
Scotland](https://pmc.ncbi.nlm.nih.gov/articles/PMC13461545/)** (Frontiers in Digital
Health, 2026) is architecturally the nearest thing to COMPASS found anywhere in this
search — the same three-part pattern (RAG + LLM + Neo4j concept map) applied to the same
underlying problem (MOUD/MAT clinical standards).

| | Scotland MAT Chatbot | COMPASS |
|---|---|---|
| LLM | Llama2 7B, no fine-tuning | Llama 3.1 8B / Claude / HF, switchable at runtime |
| Corpus | 183 scraped web documents; blocked by `robots.txt` from the Scottish Government's own MAT standards | 1,046 screened PDFs across 10 topic areas |
| Knowledge graph | Neo4j, **227 nodes / 136 relationships**, 8 relationship types | Neo4j, 99 nodes / 77 relationships, 16 relationship types |
| Graph tested against plain RAG? | **No** — authors list "ablation studies comparing RAG impact quantitatively" as future work | **Yes** — ran the comparison; found a null/negative result and a traceable graph-data bug (Section 4.3 of the paper) |
| Evaluation | BLEU (36.64) / ROUGE-1 (0.48) / ROUGE-L (0.42) — lexical overlap metrics — plus a 39-respondent professional survey (31% response rate) | LLM-as-judge on faithfulness/relevance/completeness (0–5), a stronger semantic-quality signal than lexical overlap |
| Deployment | Prototype only; authors explicitly flag "absence of real-world deployment testing" as a limitation | Live and deployed at `compass.axiomsystemslab.com` |
| Scope | MAT/MOUD standards only | 10 topics: medications, guidelines, neuroscience, behavioral treatment, co-occurring conditions, health equity, harm reduction, policy/law, judicial/drug courts, TN surveillance |
| Policy integration | No | Yes (TN policy & law, drug courts) |
| Surveillance data | No | Yes (overdose maps, Rx trends, toxicology, wastewater, treatment gap — separate structured-data layer) |
| Audience | Clinicians (Scotland's MAT Implementation Support Team network) only | Clinicians *and* policymakers *and* the public |
| Demographic equity testing | Not addressed | Specified in detail (60-vignette design), not yet run |

Their own systematic review (PRISMA, 5 databases, 2022–2024, 92→14 studies) **found zero
existing MAT-specific chatbots** before their own — useful corroboration that this is a
genuinely small, recent field, not one COMPASS is late to. Two honest takeaways for our
paper: (1) their concept map is nearly 2× the size of ours by node count, even though ours
draws on a >5× larger document corpus — worth noting as a limitation, not glossing over;
(2) they never ran the graph-vs-plain-RAG ablation their own paper says is needed — which
means **COMPASS's null result on that exact question, reported honestly, may be the first
one in this specific sub-literature**, not a replication of a known finding.

## 2. Same architecture pattern, other clinical domains (not competitors — evidence this is a maturing genre)

The "retrieve-then-read over one guideline set" pattern shows up repeatedly outside OUD,
which is useful for framing COMPASS as an instance of a recognized approach rather than a
one-off:

- **[ClinicBot](https://arxiv.org/abs/2605.00846)** (USC ISI, 2026) — diabetes-focused demo (ADA
  2025 Standards of Care). Notably more sophisticated retrieval than COMPASS: structured
  extraction of guidelines into semantic units (recommendations, tables, definitions) with
  explicit provenance, and evidence *ranked by clinical significance and guideline
  structure* rather than plain text similarity. COMPASS's top-6 cosine-similarity retrieval
  is comparatively naive — worth flagging as a concrete direction to borrow from.
- **[A bipolar-disorder RAG chatbot](https://www.medrxiv.org/content/10.64898/2025.11.30.25341311.full.pdf)**
  grounded in the CANMAT/ISBD 2018 guidelines, open-weight LLM — same pattern, different
  disease, single guideline document rather than a 1,046-document corpus.
- **[Guideline-grounded RAG for ophthalmic clinical decision support](https://arxiv.org/pdf/2603.21925)**
  and a **[consensus-anchored Long COVID chatbot](https://arxiv.org/html/2607.25038)** — two
  more single-specialty instances of the same pattern.
- **[FHIR-RAG-MEDS](https://arxiv.org/pdf/2509.07706)** — integrates RAG with live EHR data via
  HL7 FHIR, a direction COMPASS doesn't attempt (no patient-specific data at all — COMPASS
  answers general clinical/policy questions, not patient-specific ones).

## 3. General-purpose clinical evidence-QA tools

**[OpenEvidence](https://www.iatrox.com/blog/uptodate-openevidence-medical-AI)** and
**[Glass Health](https://glass.health/resources/best-clinical-decision-support)** are the
two most visible commercial products in this space: free (OpenEvidence) or workflow-embedded
(Glass Health) conversational Q&A grounded in medical literature and guidelines, covering
*all* of medicine. **UpToDate** has substantial existing OUD content (pharmacologic
management, epidemiology, withdrawal management, treatment overview) as static reference
articles, not a chatbot.

None of these are OUD-specific, none integrate Tennessee (or any state's) policy or
surveillance data, and none appear to have a knowledge-graph layer or a published
graph-vs-plain-RAG comparison. **This is the most important category to be honest about in
the paper**: the claim can't be "no tool answers OUD clinical questions with citations" —
general tools already do that reasonably well, at national scale, for free or cheap.
COMPASS's actual differentiation is the *combination*: OUD-specific depth + Tennessee policy
and surveillance data + a concept map + open, self-hostable, multi-backend infrastructure —
not being the first evidence-citing clinical chatbot in existence.

## 4. Substance-use AI tools with a different audience or purpose

- **[Suzy](https://pmc.ncbi.nlm.nih.gov/articles/PMC13234539/)** (JMIR Formative Research,
  2026) — RAG chatbot for **patients** in SUD recovery, grounded in trusted content plus
  local support-group/recovery-program information. Patient-facing peer-support tool, not a
  clinician/policymaker information system — different audience, not a competitor.
- **[Glow](https://arxiv.org/pdf/2602.08121)** — generative-AI DBT skills coach for substance
  use recovery + HIV prevention. Also patient-facing, therapeutic-skills focused.
- **[Agentic AI for Substance Use Education](https://arxiv.org/pdf/2605.00383)** (2026) —
  combines DEA regulatory records with peer-reviewed literature via agentic RAG with live
  PubMed queries, for **education** (not point-of-care decision support). Evaluated by 5
  subject-matter experts on 30 questions across 4 criteria (factual accuracy, citation
  quality, contextual coherence, regulatory appropriateness), scoring 4.18–4.35/5 with
  substantial inter-rater agreement (Cohen's κ = 0.78). **This is a methodological gap in
  COMPASS worth naming directly**: they used human domain experts as judges; COMPASS's
  evaluation to date is entirely automated (LLM-as-judge), and the paper's own Limitations
  section already flags the missing IPS clinician review — this comparator is good evidence
  that a small human-expert eval (5 people, 30 questions) is a feasible, precedented next
  step, not an unreasonably large ask.

## 5. OUD-specific knowledge graphs and visual tools — different purpose than a chatbot

- **[A Joint Survival Modeling and Therapy Knowledge Graph Framework for OUD
  Trajectories](https://pmc.ncbi.nlm.nih.gov/articles/PMC12869392/)** (2026) — a knowledge
  graph connecting risk factors to treatments, combined with survival modeling, for
  *research hypothesis generation* about OUD treatment trajectories — not conversational,
  not point-of-care, no LLM.
- An **[OUD evidence map](https://www.sciencedirect.com/science/article/abs/pii/S0376871622003945)**
  — a literature-navigation visualization, not a graph of clinical entities and not
  interactive Q&A.
- A **[Community-Centered Patient Journey Map](https://pmc.ncbi.nlm.nih.gov/articles/PMC10037586/)**
  for community pharmacists — an educational compassion-fatigue tool, unrelated architecture.

None of these are chatbots; none combine the graph with retrieval-augmented generation.
COMPASS's concept map is the only one found here that was built specifically to compose
with an LLM's answers (even though, per the paper's own finding, that composition doesn't
yet help).

## 6. Policy simulation and surveillance — adjacent, not overlapping

- **[Policy4OOD: A Knowledge-Guided World Model for Policy Intervention Simulation against
  the Opioid Overdose Crisis](https://arxiv.org/pdf/2602.12373)** (KDD 2026) — this is the
  most important adjacent-but-different system found, because **it uses Tennessee as one of
  its case-study states.** It is not a RAG chatbot at all: it's a predictive world model
  (LSTM + attention + graph neural networks, knowledge-graph-*guided* rather than
  knowledge-graph-*retrieved*) that forecasts what would happen to overdose rates and
  treatment access under a proposed policy change (e.g., expanding naloxone distribution),
  trained on CDC mortality data, Federal Reserve economic indicators, census demographics,
  crime statistics, and treatment-capacity data. **The distinction that matters for COMPASS's
  paper**: Policy4OOD answers "what would happen if Tennessee did X," COMPASS answers "what
  does the evidence/guideline/policy already say about X." These are complementary
  questions, not competing answers to the same question — worth citing in Related Work
  explicitly to pre-empt a reviewer asking "isn't this already solved by TN-focused opioid
  policy AI work?"
- **State overdose dashboards** — New Jersey, Michigan's SOS, Illinois, Washington,
  Massachusetts, plus CDC's SUDORS/DOSE — are all pure data visualizations (choropleth maps,
  trend charts). No search result surfaced a state dashboard with an embedded conversational
  or document-retrieval layer. This supports (without proving a negative) the claim that
  no other state has paired a surveillance dashboard with a cited-source chatbot and a
  document library the way COMPASS's frontend does.

## 7. Telehealth OUD treatment platforms — a different category entirely, worth naming to pre-empt confusion

**[reSET-O](https://www.choosingtherapy.com/bicycle-health-review/)** (FDA-cleared
prescription digital therapeutic), **Bicycle Health, Ophelia, Workit Health, and Boulder
Care** are telehealth platforms that *prescribe and deliver* MOUD treatment directly to
patients — care coordination, virtual visits, medication management. They are not
information or decision-support tools at all. Worth one clarifying sentence in the paper's
Related Work so a reader doesn't wonder why COMPASS wasn't compared against them: COMPASS
does not treat patients or replace clinical care in any sense; these platforms don't answer
clinical or policy questions. Different problem entirely.

## 8. Demographic bias in clinical LLMs — strong independent motivation for the still-unrun equity test

A [systematic review of demographic disparities in medical
LLMs](https://pmc.ncbi.nlm.nih.gov/articles/PMC11866893/) found gender bias reported in 15
of 16 studies reviewed (93.7%) and racial/ethnic bias in 10 of 11 (90.9%). Specific
documented harms directly relevant to COMPASS's planned test dimensions: GPT-4
over-representing disease stereotypes by race/ethnicity/gender in diagnosis and treatment
recommendations ([Dr.
Bias](https://arxiv.org/pdf/2510.09162)), and an ED-triage fairness audit
([EQUITRIAGE](https://arxiv.org/pdf/2605.03998)) finding cases labeled Black-and-unhoused,
Black-transgender-women, and Black-transgender-men were more likely to be escalated to
urgent/inpatient/mental-health-assessment status than otherwise-identical cases. This is
strong, specific, recent evidence that COMPASS's not-yet-run 60-vignette demographic test
(race, gender, insurance, rurality, criminal-justice involvement) is testing a real,
well-documented failure mode of exactly this class of system — not a speculative concern.
Worth citing 2–3 of these directly in the paper to strengthen the motivation for that test.

---

## Gap analysis: what COMPASS has that nothing else found combines

No single system surveyed combines all of the following — each piece exists somewhere, but
not together:

1. **OUD-specific + one-state depth** (Tennessee) at this granularity — Scotland's MAT
   chatbot is the only other state/nation-specific OUD chatbot found, and it covers MAT
   standards only, not the full 10-topic span COMPASS covers.
2. **A live, deployed system**, not a research prototype — most comparators (Scotland MAT
   chatbot, ClinicBot, bipolar chatbot, Agentic Substance Use Education) explicitly report
   no real-world deployment.
3. **A conversational RAG layer plus a live surveillance-dashboard layer in the same
   product** — no state dashboard found has a chatbot; no chatbot found has a dashboard.
4. **A knowledge-graph augmentation actually tested against plain retrieval, with the
   result reported regardless of outcome** — Scotland's paper names this as needed future
   work; COMPASS did it and got (and published) a null result with a diagnosed cause.
5. **Policy and judicial/drug-court content integrated alongside clinical guidance** — none
   of the clinical chatbots found include policy or legal material; Policy4OOD includes
   policy but isn't a chatbot.
6. **Multi-backend LLM support** (Ollama / Claude / HuggingFace, switchable at runtime) —
   not mentioned as a feature in any comparator found.

## Honest gaps: what others have that COMPASS doesn't (yet)

1. **Human expert evaluation.** The Agentic Substance Use Education tool used 5 SMEs
   scoring 30 questions with measured inter-rater agreement (κ = 0.78). COMPASS's evaluation
   is entirely automated (LLM-as-judge) — already flagged in the paper's Limitations, and
   this literature review adds a concrete, small-scale precedent for how to close that gap.
2. **More sophisticated, guideline-structure-aware retrieval.** ClinicBot's evidence
   extraction and clinical-significance ranking is a more advanced retrieval design than
   COMPASS's flat top-6 cosine-similarity search.
3. **A larger concept map, despite a smaller document corpus.** Scotland's MAT chatbot's
   graph (227 nodes / 136 relationships) is bigger than COMPASS's (99/77) even though their
   underlying document corpus is roughly a sixth the size of COMPASS's.
4. **Live PubMed / real-time literature queries.** The Agentic Substance Use Education tool
   pulls current PubMed results at query time in addition to its curated corpus; COMPASS's
   corpus is static until the next `ingest.py` run.

## Suggested next step for the paper

Section 2 (Related Work) in `COMPASS_paper_draft.tex` currently cites general
AI-in-addiction-medicine review papers but names no specific comparable *system*. This
review surfaces at least four citations that belong there directly (Scotland MAT chatbot,
ClinicBot, Policy4OOD, Agentic AI for Substance Use Education) plus 2–3 demographic-bias
citations to strengthen the Limitations section's equity-testing motivation. I haven't made
those edits yet — say the word and I'll fold them into the `.tex` (and this time keep the
`.md` in sync, given it's already flagged as stale from the last round of paper edits).

---

## Sources

- [Development of an AI-driven chatbot for medication-assisted treatment standards in Scotland (Frontiers in Digital Health)](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1698657/full)
- [Same paper, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC13461545/)
- [Same paper, PubMed](https://pubmed.ncbi.nlm.nih.gov/42591218/)
- [ClinicBot: A Guideline-Grounded Clinical Chatbot with Prioritized Evidence RAG and Verifiable Citations](https://arxiv.org/abs/2605.00846)
- [A Chatbot for the Management of Bipolar Disorder (CANMAT/ISBD RAG chatbot)](https://www.medrxiv.org/content/10.64898/2025.11.30.25341311.full.pdf)
- [Guideline-grounded RAG for ophthalmic clinical decision support](https://arxiv.org/pdf/2603.21925)
- [Grounded in Consensus, In Step With Emerging Science: a Long COVID chatbot](https://arxiv.org/html/2607.25038)
- [FHIR-RAG-MEDS](https://arxiv.org/pdf/2509.07706)
- [Development, Feasibility, Acceptability, and Usability of an AI-Powered Chatbot (Suzy) for SUD Recovery](https://pmc.ncbi.nlm.nih.gov/articles/PMC13234539/)
- [Initial Risk Probing and Feasibility Testing of Glow](https://arxiv.org/pdf/2602.08121)
- [Agentic AI for Substance Use Education: Integrating Regulatory and Scientific Knowledge Sources](https://arxiv.org/pdf/2605.00383)
- [Policy4OOD: A Knowledge-Guided World Model for Policy Intervention Simulation against the Opioid Overdose Crisis](https://arxiv.org/pdf/2602.12373)
- [A Joint Survival Modeling and Therapy Knowledge Graph Framework to Characterize OUD Trajectories](https://pmc.ncbi.nlm.nih.gov/articles/PMC12869392/)
- [Opioid Use Disorder Treatments: An Evidence Map](https://www.sciencedirect.com/science/article/abs/pii/S0376871622003945)
- [Community-Centered Patient Journey Map in Opioid Use Disorder](https://pmc.ncbi.nlm.nih.gov/articles/PMC10037586/)
- [Beyond UpToDate: how iatroX, OpenEvidence, Medwise & Glass Health are shaping medical AI](https://www.iatrox.com/blog/uptodate-openevidence-medical-AI)
- [Best Clinical Decision Support Tools for 2026 (Glass Health)](https://glass.health/resources/best-clinical-decision-support)
- [UpToDate: Opioid use disorder, pharmacologic management](https://www.uptodate.com/contents/opioid-use-disorder-pharmacologic-management)
- [New Jersey Overdose Data Dashboard](https://www.nj.gov/health/populationhealth/opioid/)
- [Michigan System for Opioid Overdose Surveillance (SOS)](https://injurycenter.umich.edu/opioid-surveillance/)
- [SUDORS Dashboard: Fatal Drug Overdose Data (CDC)](https://www.cdc.gov/overdose-prevention/data-research/facts-stats/sudors-dashboard-fatal-overdose-data.html)
- [Ophelia Health Review 2026](https://www.choosingtherapy.com/ophelia-health-review/)
- [Bicycle Health Review 2026](https://www.choosingtherapy.com/bicycle-health-review/)
- [Evaluating and addressing demographic disparities in medical large language models: a systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11866893/)
- [Dr. Bias: Social Disparities in AI-Powered Medical Guidance](https://arxiv.org/pdf/2510.09162)
- [EQUITRIAGE: A Fairness Audit of Gender Bias in LLM-Based Emergency Department Triage](https://arxiv.org/pdf/2605.03998)
