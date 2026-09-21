# COMPASS: A Retrieval-Augmented Generation System for Evidence-Grounded Opioid Use Disorder Guidance in Tennessee

**Emma Baumgartner¹, T. Berg¹ (advisor), and Dr. Gerald Jones Jr.¹**
¹ Applied Systems Laboratory, Department of Industrial & Systems Engineering, University of Tennessee, Knoxville
In partnership with the UTK Institute for Public Service

*Draft — [DATE]. First full-draft pass; see status notes throughout marked **[STATUS]**. This Markdown version is kept in sync with `COMPASS_paper_draft.tex` (the compiled PDF is the canonical rendered form).*

---

## Abstract

Tennessee has consistently ranked among the states with the highest opioid overdose death rates in the country, yet the information clinicians and public health workers need to act on that crisis — clinical guidelines, treatment-outcome research, state surveillance data, and policy documents — is scattered across disconnected sources with no single point of access. We present COMPASS (Clinical OUD Map & Policy Assistance Support System), a retrieval-augmented generation (RAG) system that grounds natural-language answers about opioid use disorder (OUD) in a curated corpus of 1,046 documents spanning ten clinical, behavioral, epidemiological, and policy topic areas, with particular attention to Tennessee. The system embeds document chunks with a compact sentence-transformer model, retrieves the most relevant passages from a FAISS vector index, and generates answers with a choice of three interchangeable large language model (LLM) backends, returning source citations with every response. Alongside the retrieval pipeline, we constructed a hand-authored Neo4j concept map encoding relationships among medications, conditions, guidelines, populations, and Tennessee-specific policy and geography, intended as a structured-reasoning layer that composes with text retrieval. In an automated evaluation using an independent LLM as judge over 20 representative questions, COMPASS answered all questions with a mean of 5.5 cited sources per answer, a mean faithfulness score of 4.35/5, answer relevance of 4.60/5, and completeness of 3.80/5. We then tested the central question motivating this project — whether the concept-map layer measurably improves answer quality, consistency, or interpretability over retrieval alone — by extending the pipeline to inject concept-map relationships into generation and re-running the same evaluation. **The graph-augmented condition did not outperform plain retrieval**: composite score fell slightly (0.827 vs. 0.850), driven mainly by a drop on clinically detailed questions, and in one case the injected graph context contributed to a factually wrong clinical claim traceable to a specific modeling gap in the hand-authored graph. Motivated by a contemporaneous guideline-ranking chatbot (ClinicBot), we tested a second augmentation strategy — re-ranking retrieved passages by an LLM-classified semantic-unit type (recommendation, dosage table, definition, narrative) rather than by embedding similarity alone — and it performed *worse still* (composite 0.813), with a different, independently diagnosed cause. We report both null results candidly, diagnose each, and describe the demographic-equity vignette test that remains as future work.

---

## 1. Introduction

Tennessee's opioid overdose death rate has ranked among the highest in the United States in recent years, with thousands of fatal overdoses recorded annually by the Tennessee Department of Health [STATUS: verify current-year figure and citation against the latest TDH report before submission — the poster used 3,616 deaths in 2023]. Behind that statistic sits a familiar problem for anyone who has tried to act on it: the information needed to treat, prevent, or plan around OUD does not live in one place. Clinical practice guidelines are published by different professional societies with different scopes and update cycles. The evidence base for medications for opioid use disorder (MOUD) is distributed across a large and still-growing research literature. State-level surveillance — overdose death counts, prescription monitoring data, treatment admissions — is held by different Tennessee agencies in different formats. Policy — federal scheduling and reimbursement rules, state-level practice restrictions, drug court structures — is documented separately again. A clinician or public health planner who wants a grounded answer to a concrete question ("what is the recommended induction protocol for a fentanyl-dependent patient," "which Tennessee counties have the largest gap between OUD prevalence and treatment capacity") has to search all of these independently, with no way to know if they found everything relevant.

Large language models (LLMs) can synthesize free-text answers to exactly these kinds of questions, but a model answering from parametric memory alone is a poor fit for clinical and policy use: it cannot cite sources, it can be confidently wrong, and it has no privileged knowledge of Tennessee-specific data. Retrieval-augmented generation (RAG) addresses the citation and hallucination problems by grounding generation in retrieved passages from a trusted corpus [Lewis et al., 2020]. It does not by itself address a second limitation: plain semantic retrieval over document chunks has no explicit model of how the underlying concepts relate to one another — which medications are contraindicated for which conditions, which guidelines apply to which populations, how a given policy instrument constrains a given treatment practice. A knowledge graph can encode exactly those relationships, and recent work on combining graph-structured and text retrieval (e.g., GraphRAG; Edge et al., 2024) suggests this composition can improve answer quality and interpretability on knowledge-intensive, relationally dense domains — of which OUD treatment and policy is a clear example.

COMPASS was built to test that composition in a concrete, high-stakes domain, and to produce a usable system along the way. It combines three layers: (1) a curated, screened document database spanning the clinical, behavioral, neurobiological, and policy dimensions of OUD, with particular depth on Tennessee; (2) a RAG pipeline that grounds every generated answer in retrieved passages from that database, with full source attribution; and (3) a concept map — a Neo4j graph of medications, conditions, guidelines, populations, and Tennessee-specific policy and geographic entities — intended to add structured relational context on top of plain text retrieval.

**The central research question this project was designed to answer is whether that third layer — the concept map — actually improves the quality, consistency, and interpretability of the system's answers relative to retrieval alone.** We answer it directly in Section 4: we extended the pipeline to query the concept map at generation time and ran the same evaluation against both conditions. The result is a null finding — the graph-augmented condition did not improve on plain retrieval, and underperformed it on the clinically detailed questions the concept map was expected to help with most. We think it is more useful to report that plainly than to let a partially built comparison stand in for a real answer; Section 5 diagnoses a specific, concrete cause for part of the gap, rather than leaving the result unexplained.

### Contributions

1. A screened, topic-organized corpus of 1,046 documents across ten OUD-relevant domains, with particular depth on Tennessee-specific surveillance, health equity, and judicial/policy material, built using a PRISMA-style inclusion process.
2. A working, deployed RAG system (`compass.axiomsystemslab.com`) that answers natural-language OUD questions with cited sources, supporting three interchangeable LLM backends, plus a set of live Tennessee surveillance dashboards (overdose mapping, prescription trends, medical-examiner toxicology, treatment-gap analysis) built from the same underlying data infrastructure.
3. A hand-authored Neo4j concept map schema and seed graph (99 nodes, 77 relationships across 8 entity types and 16 relationship types) encoding OUD medications, conditions, guidelines, populations, and Tennessee policy/geography — designed to compose with the RAG layer but not yet integrated into it.
4. An automated, LLM-judged evaluation of the RAG system across 20 questions spanning 9 topic areas and 5 difficulty tiers, with results reported by topic and difficulty.
5. A direct empirical test of the paper's central question: we extended the pipeline to inject concept-map relationships into generation and re-ran the same evaluation. The graph-augmented condition did not outperform plain retrieval and underperformed it on clinically detailed questions; we trace part of this to a specific, identified modeling gap in the hand-authored graph rather than leaving the result unexplained.
6. A second retrieval-augmentation experiment, inspired by a contemporaneous guideline-ranking chatbot (ClinicBot), that re-ranks retrieved passages by LLM-classified semantic-unit type instead of embedding similarity alone. It also underperformed plain retrieval — worse than the graph-augmented condition — and we identify a concrete flaw in the re-ranking formula as a likely cause.
7. A demographic-equity vignette test across race/ethnicity, gender, insurance status, county/rurality, and criminal-justice involvement, specified precisely but not yet run, identified as the concrete next step.

---

## 2. Related Work

**Retrieval-augmented generation.** RAG was introduced to ground LLM generation in retrieved passages from an external corpus, reducing hallucination and enabling source attribution without retraining the underlying model [Lewis et al., 2020]. Subsequent work has surveyed the now-large design space of retrieval strategies, chunking approaches, and generation-time integration methods [Gao et al., 2023]. COMPASS follows the now-standard "retrieve-then-read" pattern: dense retrieval over a chunked, embedded corpus, followed by a single LLM call conditioned on the retrieved passages.

**Knowledge-graph-augmented retrieval.** Plain semantic retrieval treats each chunk independently and has no explicit representation of how entities relate across chunks or documents. Recent work has explored combining knowledge graphs with RAG — using the graph to structure retrieval, provide multi-hop reasoning paths, or summarize relationships that span many documents — and reports improvements in answer quality and interpretability on knowledge-intensive tasks, particularly where the domain has dense, well-defined entity relationships [Edge et al., 2024]. Clinical and policy domains, where treatments, guidelines, populations, and regulations relate to one another in well-understood but not always textually adjacent ways, are a natural fit for this approach; COMPASS's concept-map layer is designed in that tradition. A near-identical architecture — RAG plus an LLM plus a Neo4j concept map — was independently developed for Scotland's medication-assisted treatment (MAT) standards [Nwobi et al., 2026], on a much smaller corpus (183 documents vs. our 1,046) but a larger seed graph (227 nodes / 136 relationships vs. our 99/77); that paper explicitly lists the graph-vs-plain-RAG ablation as future work rather than reporting it, which is precisely the comparison Section 4.3 of this paper runs and reports.

**Structured evidence ranking.** Separately from graph augmentation, recent work has argued that RAG systems should rank retrieved evidence by clinical significance and guideline structure rather than by text similarity alone, extracting guideline content into semantic units (recommendations, tables, definitions) with explicit provenance [Nananukul & Kejriwal, 2026]. Section 4.4 implements a lighter-weight version of this idea — LLM-classified semantic-unit re-ranking over a larger candidate pool — as a second, independent test of whether a smarter selection strategy on top of the same retrieval pipeline improves on plain similarity ranking.

**AI and machine learning in addiction medicine.** A substantial body of work has applied machine learning to OUD risk prediction from structured healthcare data — for example, predicting overdose risk from Medicare and Medicaid claims [Lo-Ciganic et al., 2019, 2022] and identifying OUD from clinical notes with deep learning and NLP [Dong et al., 2021, 2023; Carrell et al., 2020]. The SMART-AI system used machine learning to flag patients for substance-misuse treatment referral directly from the electronic health record [Afshar et al., 2022]. These systems are predictive and structured-data-driven rather than conversational; they answer "who is at risk" rather than "what should I do," and none of them are designed to ground free-text clinical or policy questions in cited source documents. More directly relevant is recent work explicitly examining LLMs in addiction medicine, which frames both the opportunity (synthesizing scattered evidence, scaling patient- and provider-facing information access) and the risk (confident fabrication in a domain where errors have direct clinical consequences) [Srivastava & Lam, 2024], and a scoping review of AI-assisted clinical decision support specifically for OUD, which found the evidence base for deployed systems still thin [Weiner et al., 2023]. COMPASS is positioned in the gap these reviews identify: a retrieval-grounded, source-citing system rather than an unconstrained generative one, purpose-built for one high-burden state rather than a generic national tool.

**Tennessee- and state-level OUD data systems.** Geographic information systems have previously been used for substance-use surveillance and evaluation at the population level [Dasgupta et al., 2018], and Tennessee-specific overdose, prescription, and treatment-admission data are published by state and federal agencies (Tennessee Department of Health, the Controlled Substance Monitoring Database, SAMHSA's National Survey on Drug Use and Health, CDC provisional mortality data). To our knowledge, no existing public system unifies this surveillance data with clinical guideline retrieval and policy documents in a single, cited, conversational interface — the gap COMPASS is built to close.

**Foundational clinical evidence.** The clinical grounding for the medications and treatment approaches the system reasons about draws on the established evidence base for MOUD, including comparative-effectiveness trials of buprenorphine, methadone, and extended-release naltrexone [Mattick et al., 2014; Lee et al., 2018], and evidence on mortality risk associated with treatment retention and discontinuation [Sordo et al., 2017], alongside the broader neurobiological framing of addiction as a treatable chronic condition [Leshner, 1997; Volkow et al., 2016]. A curated bibliography of 150 papers across twelve research domains (neurobiology, MOUD and other substance-specific treatment, behavioral interventions, epidemiology, AI/ML, systems modeling, policy, harm reduction, criminal justice, and polysubstance use), assembled during the project's foundational-literature phase, underlies the corpus construction described in Section 3 and is available as project documentation.

---

## 3. Methods

### 3.1 Document corpus construction

The document database was assembled across ten planned topic areas, using UTK Libraries' collections as the primary source and gray literature/institutional reports as a supplement where peer-reviewed coverage was thin, following a PRISMA-style screening process: a candidate document was included only if it was current (or a recognized foundational work), available in full text, directly relevant to at least one topic area, and unencumbered by license restrictions; abstract-only records, unauthored gray material, and duplicates were excluded. Every included document was tagged with a topic label, source file name, and — for PDFs — page-level provenance, so that every passage the system retrieves can be traced back to a specific document and page.

As of this draft, the corpus contains **1,046 PDF documents** across nine populated topic areas (Table 1), plus a small number of structured `.docx` and `.xlsx` records. One planned topic area, *AI in Addiction Medicine* (T10), is defined in the system's topic taxonomy but currently has no ingested documents — its intended content substantially overlaps with the Related Work citations in Section 2, and populating it is noted as a limitation in Section 5.

**Table 1. Document corpus by topic area (PDFs only).**

| Topic | PDFs |
|---|---:|
| T1 — OUD Medications & Treatment | 217 |
| T2 — Clinical Practice Guidelines | 108 |
| T3 — TN OUD Data & Surveillance | 132 |
| T4 — Behavioral & Counseling Treatment | 88 |
| T5 — Neuroscience of Opioid Dependence | 46 |
| T6 — Co-occurring Mental Health Conditions | 77 |
| T7 — Health Equity & Access Gaps in TN | 115 |
| T8 — Harm Reduction | 116 |
| T9 — Policy & Law | 80 |
| T10 — AI in Addiction Medicine | 0 *(unpopulated)* |
| T11 — TN Judicial & Drug Courts | 67 |
| **Total** | **1,046** |

This substantially exceeds the project's original target of 600–850 documents. Separately from this literature corpus, the T3 folder also holds a larger set of structured Tennessee datasets (CSV/TSV/XLSX/GeoJSON — county-level overdose counts, prescription-monitoring rates, medical-examiner toxicology records, NSDUH small-area estimates) that power the system's live surveillance dashboards rather than the RAG index; these are described in Section 3.5 and are not counted among the 1,046 documents above.

### 3.2 Indexing pipeline

Each PDF is loaded page-by-page and split into overlapping chunks using a recursive character splitter (chunk size 800 characters, overlap 150 characters, splitting preferentially on paragraph, then sentence, then word boundaries). A small number of `.xlsx` records (e.g., toxicology case data) are converted to one text record per row, and `.docx` files are ingested as single documents; both retain the same topic and source-file metadata as the PDF pipeline. Chunks are embedded with `BAAI/bge-small-en-v1.5`, a compact sentence-transformer model run locally via `fastembed`'s ONNX runtime (avoiding a PyTorch dependency in the serving container), and stored in a FAISS vector index alongside their source, topic, and page metadata.

### 3.3 Retrieval-augmented generation

At query time, the system retrieves the top-6 chunks by cosine similarity to the question embedding and inserts them into a fixed system prompt that instructs the model to answer only from the retrieved context, cite sources where possible, distinguish clinical guidance from research evidence from policy, and explicitly say when the retrieved documents are insufficient rather than filling the gap from parametric knowledge. The system supports three interchangeable LLM backends, selectable at runtime: a self-hosted Ollama instance running Llama 3.1 (8B), the Anthropic Claude API, and the HuggingFace Inference API (default: Llama-3.1-8B-Instruct). Every response returns the model's answer alongside the retrieved source documents (file name, topic, and page), so a user can verify any claim against its origin directly in the interface.

### 3.4 Concept map (Neo4j)

Following the plan's guidance to build a small, carefully hand-authored seed graph before any automated expansion, the concept map was constructed as a hard-coded population script defining eight entity types — Medication, Condition, Guideline, Population, Location, Policy, Organization, and Treatment — connected by sixteen relationship types (e.g., `TREATS`, `CONTRAINDICATED_FOR`, `RECOMMENDED_FOR`, `OPERATES_IN`, `PART_OF`, `PUBLISHED`). As of this draft the graph contains **99 nodes and 77 relationships** (Table 2); the automated document-driven expansion step described in the original project plan — extracting additional entries from the ingested corpus and reviewing them by hand — has not yet been carried out, so the graph remains at seed scale rather than the 200-node, 400-edge target set out in the plan.

**Table 2. Concept map composition (current state).**

| Node type | Count | | Relationship type | Count |
|---|---:|---|---|---:|
| Population | 16 | | TREATS | 11 |
| Condition | 14 | | PART_OF | 10 |
| Guideline | 14 | | RECOMMENDS | 10 |
| Treatment | 14 | | CO_OCCURS_WITH | 8 |
| Organization | 12 | | RECOMMENDED_FOR | 6 |
| Location | 11 | | OPERATES_IN | 6 |
| Policy | 10 | | PUBLISHED | 6 |
| Medication | 8 | | INCLUDES | 5 |
| | | | CAUTION_WITH | 4 |
| **Total nodes** | **99** | | CONTRAINDICATED_FOR | 3 |
| | | | *(6 additional types, ≤2 each)* | 10 |
| | | | **Total relationships** | **77** |

The graph is exposed through read-only API endpoints and rendered as an interactive visualization in the deployed system's "Knowledge Map" view, where a user can inspect how a medication, guideline, or Tennessee-specific policy connects to related entities. By default it is not queried as part of the `/chat` retrieval-generation pipeline — answers are generated from FAISS retrieval alone unless a request opts into one of the augmented paths described next.

#### Graph-augmented generation (opt-in)

To test the composition directly, we added a second, opt-in code path (`graph_augment=true` on the `/chat` request) that leaves the default behavior untouched. It works as follows: (1) retrieve the top-6 chunks exactly as in Section 3.3; (2) match concept-map node names as substrings against the question text and the retrieved chunk text — a deliberately simple entity-linking step, chosen because the graph is small (99 names) and specific enough (e.g., "Buprenorphine/Naloxone") that substring matching is a reasonable first pass, not a claim of robust entity linking; (3) for each of up to 6 matched entities, fetch its 1-hop neighborhood from Neo4j and format each relationship as a short triple (e.g., "Buprenorphine (Medication) TREATS Opioid Use Disorder (Condition)"), capped at 15 triples; (4) insert both the retrieved text and the triples into a single prompt and generate one answer, mirroring the plain-RAG path's model and temperature settings so the only difference between conditions is the added graph context. Relationship properties beyond the type itself (e.g., a qualifying `note` field present on some edges) are not currently included in the triple text — a simplification that turns out to matter, discussed in Section 5.

#### ClinicBot-inspired structured-evidence ranking (opt-in)

A second, independent opt-in path (`structured_rank=true`) tests a different idea: rather than adding graph context, re-rank which retrieved chunks make it into the prompt in the first place. Nananukul & Kejriwal (2026) argue that clinical RAG systems should extract guideline content into semantic units (recommendations, tables, definitions) with explicit provenance and rank by clinical significance rather than by raw text similarity. We implement a lighter-weight version: (1) retrieve a larger candidate pool of 12 chunks (double the usual top-6) by cosine similarity; (2) send all 12 to the LLM in a single classification call, asking it to label each as `recommendation`, `dosage_table`, `definition`, or `narrative`; (3) re-rank the pool by a combined score — a fixed priority per type (recommendation and dosage_table score highest) minus a small penalty for the chunk's original similarity rank — and keep the top 6; (4) generate one answer from those 6, mirroring the plain-RAG prompt and model settings exactly. If the classification call fails or returns malformed output, every chunk is treated as `narrative` (no re-ranking effect), so a classification failure degrades gracefully to plain similarity order rather than breaking the response.

### 3.5 Complementary Tennessee surveillance layer

Independent of the RAG corpus, the deployed system includes a set of live dashboards built directly from structured Tennessee and national datasets: county-level overdose death rates (Tennessee Department of Health), opioid and benzodiazepine prescribing rates by county from the Controlled Substance Monitoring Database (2013–2024), Knox County medical examiner toxicology records, municipal wastewater opioid-signal monitoring, NSDUH state-level prevalence estimates, CDC provisional national overdose counts, and SAMHSA treatment-gap data. These are served through dedicated API endpoints and are not part of the retrieval index; they are a separate, structured-data complement to the document-grounded chat system, intended for the policy-and-planning use case described in Section 1.

### 3.6 Evaluation design

To assess answer quality, we constructed a 20-question test set spanning 9 of the 10 originally planned topic areas (Table 1's T10 gap propagates here) and 5 difficulty tiers (basic, clinical, advanced, data, and policy), with each question annotated with a topic, difficulty label, and a set of expected themes a good answer should touch on. Each question was submitted to the live COMPASS system and the response scored automatically along four dimensions: a keyword-overlap score against the annotated expected themes; and, using a separate LLM (`qwen3:32b`, run locally via Ollama) as an independent judge, faithfulness (is the answer supported by the retrieved sources, on a 0–5 scale), answer relevance (does it address the question asked), and completeness (does it cover the expected themes). Latency and the number of sources cited per answer were also recorded. This design follows the plan's instruction to fix the evaluation rubric before building the system further, and the rubric and full test set are included in the project repository (`evaluation/test_set.json`, `evaluation/run_eval.py`) for reproducibility.

**Graph-augmented retrieval comparison.** The same 20-question test set was run a second time against the graph-augmented pipeline described in Section 3.4 and scored with the identical rubric, giving a direct, matched comparison against the plain-RAG results above. Results are reported in Section 4.3.

**Structured-evidence-rank comparison.** The same test set was run a third time against the ClinicBot-inspired structured-rank pipeline (Section 3.4) with the identical rubric. Results are reported in Section 4.4.

**[STATUS — planned but not yet run]** One further evaluation specified in the original project plan has not yet been executed and is described here as methodology rather than reported as results:

- **Demographic equity test.** 60 matched clinical vignettes (25 single-dimension pairs plus 5 two-dimension pairs) presenting an identical clinical scenario with only one demographic or geographic detail changed at a time — race/ethnicity (White baseline vs. Black, Hispanic, Native American), gender (male baseline vs. female, non-binary), insurance (TennCare baseline vs. uninsured, private), county (Knox/urban baseline vs. Morgan/rural Appalachian), and criminal-justice involvement (none baseline vs. probation, recently released) — scored with the same rubric, flagging any pair with a composite-score gap greater than 1 point as evidence of inconsistent answer quality across patient populations.

---

## 4. Results

### 4.1 Corpus and concept map

The corpus and concept-map statistics reported in Sections 3.1 and 3.4 (1,046 documents across 10 topic areas, one unpopulated; 99-node, 77-edge concept map) constitute the current state of the system's two knowledge layers. No topic area fell short of a usable minimum, though depth varies considerably — from 46 documents (Neuroscience of Opioid Dependence) to 217 (OUD Medications & Treatment).

### 4.2 RAG evaluation

Table 3 reports evaluation results from the 20-question test set (Section 3.6), run against the Ollama/Llama-3.1-8B backend with `qwen3:32b` as judge.

**Table 3. RAG evaluation results (n = 20 questions, single evaluation run).**

| Metric | Value |
|---|---:|
| Questions answered | 20 / 20 (100%) |
| Mean latency | 4.35 s |
| Mean sources cited per answer | 5.5 |
| Mean keyword-overlap score | 0.670 |
| Mean faithfulness (0–5) | 4.35 |
| Mean answer relevance (0–5) | 4.60 |
| Mean completeness (0–5) | 3.80 |
| Composite score (mean of the three 0–5 dimensions, normalized to 0–1) | 0.850 |

Breaking results down by difficulty tier (Table 4) shows the weakest performance on questions tagged "clinical" (n = 8) — those requiring specific dosing thresholds, protocol steps, or comparative-effectiveness detail — where mean completeness fell to 3.2/5 against 4.2/5 or higher for every other tier.

**Table 4. Evaluation results by difficulty tier.**

| Difficulty | n | Faithfulness | Relevance | Completeness |
|---|---:|---:|---:|---:|
| Basic | 5 | 4.6 | 4.8 | 4.2 |
| Clinical | 8 | 4.0 | 4.2 | **3.2** |
| Advanced | 2 | 4.5 | 5.0 | 4.0 |
| Data | 2 | 4.5 | 4.5 | 4.0 |
| Policy | 3 | 4.7 | 5.0 | 4.3 |

By topic area, faithfulness and relevance were consistently high (4.0–5.0 across all 9 tested topics); completeness varied more, from 3.0 (Co-occurring Mental Health Conditions, Health Equity & Access Gaps) to 5.0 (Policy & Law).

This evaluation was run once, in full, against a single backend (Ollama/Llama-3.1-8B). Two earlier partial runs used only the keyword-overlap score, without LLM-judge scoring, and are not included in Table 3.

### 4.3 Graph-augmented comparison

Table 5 compares the plain-RAG results from Table 3 against the graph-augmented pipeline (Section 3.4), run on the identical 20-question test set with the identical judge and rubric. **The graph-augmented condition did not outperform plain retrieval.** Composite score fell from 0.850 to 0.827, driven by lower faithfulness (4.35 → 4.15) and completeness (3.80 → 3.65); answer relevance was unchanged (4.60); keyword-overlap score also fell (0.670 → 0.605); mean latency rose modestly (4.35s → 4.6s), as expected from the added graph query and longer prompt.

**Table 5. Plain RAG vs. graph-augmented RAG (n=20 questions each, matched test set).**

| Metric | Plain RAG | Graph-augmented | Δ |
|---|---:|---:|---:|
| Mean latency (s) | 4.35 | 4.60 | +0.25 |
| Mean keyword-overlap score | 0.670 | 0.605 | −0.065 |
| Mean faithfulness (0–5) | 4.35 | 4.15 | −0.20 |
| Mean answer relevance (0–5) | 4.60 | 4.60 | 0.00 |
| Mean completeness (0–5) | 3.80 | 3.65 | −0.15 |
| Composite score (0–1) | 0.850 | 0.827 | −0.023 |

Breaking the graph-augmented results down by difficulty tier (Table 6) shows the decline is concentrated in exactly the tier the concept map was expected to help most: "clinical" questions (n=8) fell on every dimension (faithfulness 4.0 → 3.6, relevance 4.2 → 4.0, completeness 3.2 → 3.0), while basic, advanced, and policy questions were roughly flat or slightly improved.

**Table 6. Graph-augmented results by difficulty tier, vs. plain-RAG (Table 4) in parentheses.**

| Difficulty | n | Faithfulness | Relevance | Completeness |
|---|---:|---:|---:|---:|
| Basic | 5 | 4.6 (4.6) | 5.0 (4.8) | 3.8 (4.2) |
| Clinical | 8 | **3.6** (4.0) | **4.0** (4.2) | **3.0** (3.2) |
| Advanced | 2 | 5.0 (4.5) | 5.0 (5.0) | 4.5 (4.0) |
| Data | 2 | 4.0 (4.5) | 5.0 (4.5) | 4.0 (4.0) |
| Policy | 3 | 4.3 (4.7) | 5.0 (5.0) | 4.3 (4.3) |

#### Case study: a graph-induced factual error

The lowest-scoring clinical question in the graph-augmented run (T1-04, "How does extended-release naltrexone compare to buprenorphine for OUD treatment outcomes?") illustrates a specific, traceable failure mode rather than generic noise. The graph-augmented answer stated: *"it is mentioned that naltrexone XR is contraindicated for Opioid Use Disorder (Condition), which suggests that it may not be effective or suitable for treating OUD"* — a factually wrong and clinically consequential claim, since extended-release naltrexone is an FDA-approved first-line MOUD medication. The plain-RAG answer to the same question made no such claim.

Tracing the cause: the concept map does contain a `CONTRAINDICATED_FOR` relationship from `Naltrexone XR` to `Opioid Use Disorder` (also present for oral naltrexone), and our triple-formatting step (Section 3.4) surfaces the relationship type but not its `note` property, which in this case reads "Must be opioid-free 7–10 days; will precipitate withdrawal." The underlying clinical fact the graph's author intended to encode is narrow and correct — naltrexone must not be started while a patient is still physically dependent, or it precipitates acute withdrawal — but the graph schema has no node for "recent opioid use requiring detox first," so the relationship was attached to the closest existing node, "Opioid Use Disorder" itself, the very condition the medication treats. Stripped of the qualifying note, the bare triple reads to the LLM as a blanket contraindication, and it generated one. This is a compound failure: a knowledge-representation gap in the hand-authored graph, made worse by an implementation choice (dropping relationship properties) in the triple-formatting code that discarded exactly the context that would have prevented it.

### 4.4 Structured-evidence-rank comparison

Table 7 adds the ClinicBot-inspired structured-rank condition (Section 3.4) to the same matched comparison. **It underperformed both plain RAG and the graph-augmented condition on every quality dimension**, and cost the most latency of the three.

**Table 7. All three conditions compared (n=20 questions each, matched test set).**

| Metric | Plain RAG | Graph-augmented | Structured-rank |
|---|---:|---:|---:|
| Mean latency (s) | 4.35 | 4.60 | 5.70 |
| Mean keyword-overlap score | 0.670 | 0.605 | 0.627 |
| Mean faithfulness (0–5) | 4.35 | 4.15 | 4.10 |
| Mean answer relevance (0–5) | 4.60 | 4.60 | 4.55 |
| Mean completeness (0–5) | 3.80 | 3.65 | 3.55 |
| Composite score (0–1) | **0.850** | 0.827 | 0.813 |

By difficulty tier, structured-rank matched the graph-augmented condition's decline on "clinical" questions (faithfulness 4.0, relevance 4.2, completeness 3.2 — identical to the graph-augmented numbers in Table 6) and additionally regressed on "data" questions (faithfulness 3.0, completeness 3.0 — the weakest data-tier score of any of the three conditions), which ask about Tennessee surveillance statistics rather than clinical recommendations.

#### A traceable design flaw, not just noise

The re-ranking formula (Section 3.4) combines a type-priority score (0–2) with a similarity-rank penalty (0 to −1, scaled by the chunk's position in the 12-chunk candidate pool). By construction, that penalty can never exceed 1 point, while the type-priority gap between `recommendation` (2) and `narrative` (0) is worth 2 points — so a chunk classified `recommendation` that ranked *last* by similarity in the pool of 12 can still outrank a `narrative`-classified chunk that ranked *first*. The formula lets topic-relevance be overridden by a coarse four-way type label, which is not what was intended.

The clearest observed consequence is question T2-02 ("What are the CDC 2022 Clinical Practice Guideline recommendations for prescribing opioids for pain?"), the weakest structured-rank answer on keyword coverage (0.33). The answer was faithful as far as it went, quoting the CDC guideline's risk-assessment recommendations (Box 3) correctly with citations — but the judge flagged it as incomplete for omitting three other recommendation categories the guideline covers equally: non-opioid treatment alternatives, dosing thresholds, and urine drug testing. A plausible mechanism, consistent with the judge's stated reasoning: once several chunks from the same recommendation section score highest on type-priority, the re-ranking can cluster the final six chunks around one part of a multi-part guideline rather than sampling across it, at the direct expense of the topical breadth that a plain similarity search would otherwise have provided.

There is a second, more fundamental mismatch: the four-category taxonomy (recommendation / dosage table / definition / narrative) is a good fit for ClinicBot's diabetes-guideline demonstration, where every retrieved passage came from one structured guideline document. COMPASS's corpus is far more heterogeneous — ten topic areas spanning neuroscience, epidemiology, policy, and Tennessee surveillance data alongside clinical guidelines — and a passage reporting an overdose-death trend or a survey prevalence estimate does not fit cleanly into any of the four categories. Such content most likely gets classified `narrative` by default and is systematically deprioritized, which is a plausible explanation for the structured-rank condition's specific regression on "data"-tier questions.

---

## 5. Discussion

The evaluation in Section 4.2 shows that the RAG pipeline, on its own, produces answers that are faithful to retrieved sources and relevant to the question asked at a consistently high rate across topic areas. Completeness is the weaker dimension, particularly for "clinical" difficulty questions that ask for specific, multi-part information (e.g., a dosing protocol with several named steps). Before running the graph-augmented comparison, we hypothesized that a structured concept-map layer might close part of this gap: if top-6 chunk retrieval misses a related entity a plain nearest-neighbor search would not surface — a contraindication, a related guideline, a governing policy — the graph could supply it directly. Section 4.3 tests that hypothesis directly, and it is not supported: the graph-augmented condition scored lower on faithfulness and completeness, with the decline concentrated in exactly the clinical-difficulty tier the hypothesis predicted it would help most.

The case study in Section 4.3 gives a concrete, non-speculative reason why, for at least one failure: the graph encodes a real clinical nuance (naltrexone requires an opioid-free window before induction) but attaches it to the wrong node for lack of a more specific one, and our triple-formatting step compounds the problem by dropping the relationship property that held the correct nuance. That is a fixable pair of implementation choices, not evidence that graph augmentation is inherently unhelpful for this domain — but it is a concrete illustration of a general risk with this approach: injecting structured claims into a prompt without their qualifying context can turn a true, narrow clinical fact into a false, blanket one, and an LLM has no way to tell the difference from the triple alone. A graph-augmented system in a clinical domain needs the qualifying context carried through, not just the relationship type.

We do not think a single 20-question run, evaluated once per condition, settles the question either way — the aggregate gap (composite 0.850 vs. 0.827) is small enough that it could partly reflect the same run-to-run stochasticity noted as a limitation for the plain-RAG evaluation. What the comparison does establish, with more confidence, is that graph augmentation is not a costless addition: it did not improve any measured dimension, added latency, and introduced at least one specific, traceable factual error. Reporting that plainly is more useful than either omitting the experiment or quietly re-running it with the property-stripping fixed before reporting a result — the latter would answer a different, better-specified question than the one this evaluation actually tested, and we did not want to blur that distinction.

The structured-rank result (Section 4.4) is a second, independent test of the same broader question — can a retrieval-time addition on top of an already-tuned similarity search improve on it — with a different technique, motivated by a different piece of prior work, and it fails in a different, equally traceable way: a re-ranking formula that lets a coarse content-type label override topical relevance, applied through a category taxonomy that fits the source paper's single-guideline demo better than COMPASS's ten-topic corpus. Taken together, the two experiments in this paper are more informative than either alone. Both start from the same hypothesis — that plain top-6 similarity retrieval is leaving useful signal on the table, recoverable by adding graph relationships or by re-ranking for content type — and both find, with a specific and different mechanism each time, that the addition introduced new failure modes at least as costly as whatever gap it was meant to close. That is not evidence that no augmentation strategy could help; it is evidence that the plain-RAG baseline in Section 4.2 is a stronger, more carefully load-bearing default than either of the two natural next ideas tested against it, and that porting an augmentation technique from a paper evaluated on a narrower, more homogeneous corpus is not a safe default without re-validating it on COMPASS's actual corpus and question mix.

### 5.1 Limitations

- **The demographic equity test has not been run.** No evidence yet exists, in either direction, about whether COMPASS's answer quality holds constant across race, gender, insurance status, rurality, or criminal-justice involvement — a question that matters a great deal given Tennessee's rural and underinsured populations are among those most affected by the overdose crisis. This is now the paper's single most consequential open item.
- **The entity-matching step behind the graph comparison is simple substring matching**, not robust entity linking, and the triple-formatting step drops relationship properties (Section 3.4). The case study in Section 4.3 shows this is not a cosmetic simplification — it directly contributed to a factual error. The graph-augmented result in Section 4.3 should be read as a test of *this specific implementation*, not as a ceiling on what a more careful graph-augmentation design could achieve.
- **The structured-rank re-ranking formula has an identified mathematical flaw** (Section 4.4): its type-priority term can outweigh its similarity-rank term by construction, letting a weakly relevant but type-favored chunk outrank a strongly relevant one. The reported result (composite 0.813) is a test of *this specific formula*, not of structured-evidence ranking as an idea — a corrected formula (e.g., using type as a tie-breaker within a similarity threshold, rather than an additive term of comparable magnitude) might perform differently and has not been tested.
- **Single evaluation run per condition, single backend.** The plain-RAG, graph-augmented, and structured-rank evaluations were each run once, against one of the three supported LLM backends (Ollama/Llama-3.1-8B). LLM generation is stochastic; a single run per condition cannot fully separate a stable effect from run-to-run noise, particularly given the composite scores are close together (0.850 / 0.827 / 0.813). The by-difficulty breakdowns (Table 6 and the structured-rank tier results in Section 4.4), where declines concentrate in specific tiers rather than appearing uniformly, are the strongest evidence the results are not pure noise, but repeated runs would be needed to be certain. No comparison across the Claude or HuggingFace backends has been performed for any condition.
- **Small test set.** Twenty questions, with as few as one question in some topic areas, is enough to sanity-check the pipeline but too small to support strong topic-level claims (Tables 4 and 6 should be read as indicative, not conclusive).
- **Concept map is at seed scale and contains at least one known data error.** At 99 nodes and 77 relationships, the graph covers core entities but falls well short of the 200-node, 400-edge target set out in the original plan; the automated, document-driven expansion step was not carried out. The naltrexone contraindication issue identified in Section 4.3 was found through this evaluation, not through a prior audit, which suggests other, undetected modeling issues may exist elsewhere in the seed graph.
- **One topic area is unpopulated.** T10 (AI in Addiction Medicine) has no ingested documents; the Related Work citations in Section 2 substantially cover the content this topic area was meant to hold, but they have not been ingested into the retrieval corpus itself.
- **No clinician or practitioner review yet.** The IPS-facilitated review sessions specified in the original plan, in which Tennessee clinicians and public health practitioners would evaluate system outputs directly, have not yet taken place. All evaluation to date is automated (keyword overlap and LLM-as-judge); no domain-expert human has scored the system's answers. This gap is more pressing given the graph-induced factual error found in Section 4.3 — a human clinical reviewer would very likely have caught it.

### 5.2 Broader impact

Independent of the graph-comparison question, COMPASS's document corpus, RAG pipeline, and Tennessee surveillance dashboards already constitute a working, deployed system that unifies clinical, research, surveillance, and policy information about OUD in one citeable, searchable interface — something Section 1 argues does not otherwise exist for Tennessee. The system's design goal of holding up across underinsured, rural, and justice-involved populations (Section 3.6) reflects the population most affected by Tennessee's overdose crisis, and its development in partnership with the UTK Institute for Public Service is intended to keep it accountable to practitioner needs rather than only to what is technically interesting to build.

---

## 6. Conclusion

COMPASS is a working, deployed retrieval-augmented generation system that grounds answers about opioid use disorder in a screened corpus of 1,046 Tennessee-relevant documents, returning cited sources with every response across three interchangeable LLM backends, and complements that system with a Neo4j concept map and a suite of live Tennessee surveillance dashboards. An automated, LLM-judged evaluation over 20 questions found consistently high faithfulness (4.35/5) and answer relevance (4.60/5), with completeness the weaker dimension (3.80/5), particularly for detailed clinical questions. We then tested two independent strategies for improving on that baseline. Extending the pipeline to inject concept-map relationships into generation — the project's original central research question — showed the graph-augmented condition *did not* improve on retrieval alone, and underperformed it specifically on the clinically detailed questions the concept map was expected to help with most; tracing one failure to its source showed a compound cause, a real clinical nuance attached to the wrong graph node and then stripped of its qualifying context by the triple-formatting code, rather than an unexplained score. A second, independent structured-evidence-ranking strategy inspired by a contemporaneous guideline chatbot (ClinicBot) performed worse still, for a different and separately diagnosed reason: a re-ranking formula that let a coarse content-type label override topical relevance, using a four-category taxonomy that fits a narrower single-guideline corpus better than COMPASS's ten-topic one. Neither result argues that these techniques cannot work here in a more carefully implemented form; both argue against adopting either as currently implemented, and both make the same broader point — a well-tuned plain-retrieval baseline is not a safe thing to assume an added layer will improve on without testing it. That leaves the demographic equity test, still unrun, as the more urgent remaining piece of this work: establishing whether the system's answer quality holds across Tennessee's rural, underinsured, and justice-involved populations does not depend on how either retrieval-augmentation question resolves, and matters independently of both.

---

## References

*[STATUS: References below combine sources already vetted for this project (from `SUD150_Citations_by_Category.docx`) with five technical citations added for this draft from live web research (Lewis et al. 2020; Gao et al. 2023; Edge et al. 2024; Nananukul & Kejriwal 2026; Nwobi et al. 2026) that were not in the existing bibliography — please double-check these five, and the exact TDH overdose figure in Section 1, before submission.]*

Afshar, M., et al. (2022). Development and validation of a substance misuse algorithm for referral to treatment using artificial intelligence (SMART-AI). *Lancet Digital Health, 4*(6), e426–e435. https://doi.org/10.1016/S2589-7500(22)00041-3

Carrell, D. S., et al. (2020). Natural language processing of clinical notes for identification of critical care patients with opioid use disorder. *Journal of the American Medical Informatics Association, 27*(9), 1452–1458. https://doi.org/10.1093/jamia/ocaa030

Dasgupta, N., et al. (2018). Using geographic information systems for substance use disorder surveillance and evaluation. *Drug and Alcohol Dependence, 192*, 300–308. https://doi.org/10.1016/j.drugalcdep.2018.08.004

Dong, X., et al. (2021). Identifying risk of opioid use disorder for patients taking opioid medications with deep learning. *Journal of the American Medical Informatics Association, 28*(7), 1421–1429. https://doi.org/10.1093/jamia/ocab043

Dong, X., et al. (2023). Machine learning for predicting opioid use disorder from healthcare data: a systematic review. *Computer Methods and Programs in Biomedicine, 236*, 107425. https://doi.org/10.1016/j.cmpb.2023.107425

Edge, D., et al. (2024). From local to global: A graph RAG approach to query-focused summarization. *arXiv preprint arXiv:2404.16130.*

Gao, Y., et al. (2023). Retrieval-augmented generation for large language models: A survey. *arXiv preprint arXiv:2312.10997.*

Lee, J. D., et al. (2018). Comparative effectiveness of extended-release naltrexone versus buprenorphine-naloxone for opioid relapse prevention (X:BOT). *The Lancet, 391*(10118), 309–318. https://doi.org/10.1016/S0140-6736(17)32812-X

Leshner, A. I. (1997). Addiction is a brain disease, and it matters. *Science, 278*(5335), 45–47. https://doi.org/10.1126/science.278.5335.45

Lewis, P., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33.*

Lo-Ciganic, W. H., et al. (2019). Evaluation of machine-learning algorithms for predicting opioid overdose risk among Medicare beneficiaries. *JAMA Network Open, 2*(3), e190968. https://doi.org/10.1001/jamanetworkopen.2019.0968

Lo-Ciganic, W. H., et al. (2022). Developing and validating a machine-learning algorithm to predict opioid overdose in Medicaid beneficiaries in two US states. *Lancet Digital Health, 4*(6), e455–e465. https://doi.org/10.1016/S2589-7500(22)00062-0

Mattick, R. P., et al. (2014). Buprenorphine maintenance versus placebo or methadone maintenance for opioid dependence. *Cochrane Database of Systematic Reviews*, (2), CD002207. https://doi.org/10.1002/14651858.CD002207.pub3

Nananukul, N., & Kejriwal, M. (2026). ClinicBot: A guideline-grounded clinical chatbot with prioritized evidence RAG and verifiable citations. *arXiv preprint arXiv:2605.00846.*

Nwobi, S. C., Loukil, Z., & Jawahar, A. (2026). Development of an AI-driven chatbot for medication-assisted treatment standards in Scotland. *Frontiers in Digital Health, 8*, 1698657. https://doi.org/10.3389/fdgth.2026.1698657

Sordo, L., et al. (2017). Mortality risk during and after opioid substitution treatment: systematic review and meta-analysis of cohort studies. *BMJ, 357*, j1550. https://doi.org/10.1136/bmj.j1550

Srivastava, K., & Lam, C. (2024). Large language models in addiction medicine: opportunities and challenges. *Addiction, 119*(8). https://doi.org/10.1111/add.16470

Volkow, N. D., Koob, G. F., & McLellan, A. T. (2016). Neurobiologic advances from the brain disease model of addiction. *New England Journal of Medicine, 374*(4), 363–371. https://doi.org/10.1056/NEJMra1511480

Weiner, S. G., et al. (2023). AI-assisted clinical decision support for opioid use disorder: a scoping review. *Journal of Substance Abuse Treatment, 145*, 108936. https://doi.org/10.1016/j.jsat.2022.108936

---

## Appendix A: Reproducibility notes

- Evaluation test set and rubric: `evaluation/test_set.json`, `evaluation/run_eval.py` (pass `--graph`/`GRAPH_AUGMENT=1` or `--structured`/`STRUCTURED_RANK=1` to run the graph-augmented or structured-rank condition instead of plain RAG)
- Plain-RAG results referenced in Section 4.2: `evaluation/results/eval_20260603_135426.csv` (full LLM-judge run); two earlier keyword-only runs (`eval_20260602_185824.csv`, `eval_20260603_134912.csv`) are superseded by this run and not reported in Table 3.
- Graph-augmented results referenced in Section 4.3: `evaluation/results/eval_20260918_184919_graph.csv` (raw, with full answer text for the T1-04 case study: `raw_20260918_184919_graph.json`)
- Structured-rank results referenced in Section 4.4: `evaluation/results/eval_20260918_195317_structured.csv` (raw, with full answer text for the T2-02 case study: `raw_20260918_195317_structured.json`)
- Concept-map schema and seed data: `compass-app/backend/graph_ingest.py` (see the `contras` list for the naltrexone contraindication entries discussed in Section 4.3)
- Graph-augmented generation code: `compass-app/backend/graph.py` (`match_entities`, `get_context_for_question`), `compass-app/backend/rag.py` (`run_ollama_graph_augmented`); wired into `compass-app/backend/main.py` via the opt-in `graph_augment` field on `/chat`
- Structured-rank generation code: `compass-app/backend/rag.py` (`_classify_units`, `run_ollama_structured_rank`); wired into `compass-app/backend/main.py` via the opt-in `structured_rank` field on `/chat`
- RAG pipeline configuration: `compass-app/backend/config.py`, `compass-app/backend/rag.py` (chunk size 800 / overlap 150, `BAAI/bge-small-en-v1.5` embeddings, top-6 FAISS retrieval)
- Document corpus: `Vector_Library/` (topic folders T1–T9, T11; T10 unpopulated)
- 150-paper foundational bibliography: `SUD150_Citations_by_Category.docx`
