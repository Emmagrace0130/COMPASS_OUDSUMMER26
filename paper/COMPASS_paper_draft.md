# COMPASS: A Retrieval-Augmented Generation System for Evidence-Grounded Opioid Use Disorder Guidance in Tennessee

**Emma Baumgartner¹, T. Berg¹ (advisor), and Dr. Gerald Jones Jr.¹**
¹ Applied Systems Laboratory, Department of Industrial & Systems Engineering, University of Tennessee, Knoxville
In partnership with the UTK Institute for Public Service

*Draft — [DATE]. First full-draft pass; see status notes throughout marked **[STATUS]**. This Markdown version is kept in sync with `COMPASS_paper_draft.tex` (the compiled PDF is the canonical rendered form).*

---

## Abstract

Tennessee has consistently ranked among the states with the highest opioid overdose death rates in the country, yet the information clinicians and public health workers need to act on that crisis — clinical guidelines, treatment-outcome research, state surveillance data, and policy documents — is scattered across disconnected sources with no single point of access. We present COMPASS (Clinical OUD Map & Policy Assistance Support System), a retrieval-augmented generation (RAG) system that grounds natural-language answers about opioid use disorder (OUD) in a curated corpus of 1,046 documents spanning ten clinical, behavioral, epidemiological, and policy topic areas, with particular attention to Tennessee. The system embeds document chunks with a compact sentence-transformer model, retrieves the most relevant passages from a FAISS vector index, and generates answers with a choice of three interchangeable large language model (LLM) backends, returning source citations with every response. Alongside the retrieval pipeline, we constructed a hand-authored Neo4j concept map encoding relationships among medications, conditions, guidelines, populations, and Tennessee-specific policy and geography. In an automated evaluation using an independent LLM as judge over 20 representative questions, the baseline pipeline answered all questions with a mean of 5.5 cited sources per answer, faithfulness of about 4.2/5, answer relevance of about 4.6/5, and completeness of about 3.6/5. We then tested whether four additions could improve on it: injecting concept-map relationships into generation, a ClinicBot-inspired re-ranking of retrieved passages by content type, a corrected version of that re-ranker, and the corrected version with near-duplicate filtering. None produced a detectable improvement. Repeating the unchanged baseline four times showed a spread of about 0.05 in composite score, larger than every between-condition difference; our initial single-run reading that two variants were worse than the baseline did not survive this check. The experiments did expose specific defects: a mis-modeled graph edge that made one generated answer claim naltrexone is contraindicated for opioid use disorder, a flaw in the original re-ranking formula, and duplicate guideline copies in the corpus. A pilot demographic-equity test (35 matched vignettes, 75 runs) found no disparity larger than one composite point and no consistent direction, but changing clinically irrelevant demographic wording measurably changed which documents were retrieved; the pilot cannot rule out small effects. Two mitigations that retrieve on a descriptor-free query were tested: an LLM rewrite left answer quality unchanged but only partly reduced retrieval sensitivity, while a deterministic, regex-based version eliminated it — cited-source overlap reached 1.00 across every demographic variant — at no cost in latency or answer quality, though answer-score variation attributable to generation itself remained.

---

## 1. Introduction

Tennessee's opioid overdose death rate has ranked among the highest in the United States in recent years, with thousands of fatal overdoses recorded annually by the Tennessee Department of Health [STATUS: verify current-year figure and citation against the latest TDH report before submission — the poster used 3,616 deaths in 2023]. Behind that statistic sits a familiar problem for anyone who has tried to act on it: the information needed to treat, prevent, or plan around OUD does not live in one place. Clinical practice guidelines are published by different professional societies with different scopes and update cycles. The evidence base for medications for opioid use disorder (MOUD) is distributed across a large and still-growing research literature. State-level surveillance — overdose death counts, prescription monitoring data, treatment admissions — is held by different Tennessee agencies in different formats. Policy — federal scheduling and reimbursement rules, state-level practice restrictions, drug court structures — is documented separately again. A clinician or public health planner who wants a grounded answer to a concrete question ("what is the recommended induction protocol for a fentanyl-dependent patient," "which Tennessee counties have the largest gap between OUD prevalence and treatment capacity") has to search all of these independently, with no way to know if they found everything relevant.

Large language models (LLMs) can synthesize free-text answers to exactly these kinds of questions, but a model answering from parametric memory alone is a poor fit for clinical and policy use: it cannot cite sources, it can be confidently wrong, and it has no privileged knowledge of Tennessee-specific data. Retrieval-augmented generation (RAG) addresses the citation and hallucination problems by grounding generation in retrieved passages from a trusted corpus [Lewis et al., 2020]. It does not by itself address a second limitation: plain semantic retrieval over document chunks has no explicit model of how the underlying concepts relate to one another — which medications are contraindicated for which conditions, which guidelines apply to which populations, how a given policy instrument constrains a given treatment practice. A knowledge graph can encode exactly those relationships, and recent work on combining graph-structured and text retrieval (e.g., GraphRAG; Edge et al., 2024) suggests this composition can improve answer quality and interpretability on knowledge-intensive, relationally dense domains — of which OUD treatment and policy is a clear example.

COMPASS was built to test that composition in a concrete, high-stakes domain, and to produce a usable system along the way. It combines three layers: (1) a curated, screened document database spanning the clinical, behavioral, neurobiological, and policy dimensions of OUD, with particular depth on Tennessee; (2) a RAG pipeline that grounds every generated answer in retrieved passages from that database, with full source attribution; and (3) a concept map — a Neo4j graph of medications, conditions, guidelines, populations, and Tennessee-specific policy and geographic entities — intended to add structured relational context on top of plain text retrieval.

**The central research question this project was designed to answer is whether that third layer — the concept map — actually improves the quality, consistency, and interpretability of the system's answers relative to retrieval alone.** We answer it directly in Section 4: we extended the pipeline to query the concept map at generation time and ran the same evaluation against both conditions. The answer is that we could not detect an improvement — and, importantly, that a single comparison of this kind cannot: repeating the unchanged baseline showed that run-to-run variation is as large as any difference we measured. We report that plainly, along with a specific factual error the graph context produced in one answer and the defects we found in the two retrieval-augmentation ideas we tested.

### Contributions

1. A screened, topic-organized corpus of 1,046 documents across ten OUD-relevant domains, with particular depth on Tennessee-specific surveillance, health equity, and judicial/policy material, built using a PRISMA-style inclusion process.
2. A working, deployed RAG system (`compass.axiomsystemslab.com`) that answers natural-language OUD questions with cited sources, supporting three interchangeable LLM backends, plus a set of live Tennessee surveillance dashboards (overdose mapping, prescription trends, medical-examiner toxicology, treatment-gap analysis) built from the same underlying data infrastructure.
3. A hand-authored Neo4j concept map schema and seed graph (99 nodes, 77 relationships across 8 entity types and 16 relationship types) encoding OUD medications, conditions, guidelines, populations, and Tennessee policy/geography — designed to compose with the RAG layer but not yet integrated into it.
4. An automated, LLM-judged evaluation of the RAG system across 20 questions spanning 9 topic areas and 5 difficulty tiers, with results reported by topic and difficulty.
5. A direct empirical test of the paper's central question: we extended the pipeline to inject concept-map relationships into generation and re-ran the same evaluation. The graph-augmented condition was not distinguishable from plain retrieval once run-to-run noise was measured, and we trace one specific, clinically consequential wrong answer to a mis-modeled graph edge and a formatter that dropped its qualifying note.
6. Three variants of a ClinicBot-inspired re-ranker (original, corrected, and with near-duplicate filtering) and, more generally, a measurement of run-to-run variability in a small-scale RAG evaluation: repeated runs of the unchanged baseline spread by about 0.05 in composite score, larger than every between-condition difference, which reversed our first single-run reading that the variants were worse. We also identify a verifiable flaw in the original re-ranking formula and duplicate documents in the corpus.
7. A pilot demographic-equity test — five clinical scenarios, each with a base patient and single- and two-factor variants across race, gender, insurance, county, and criminal-justice involvement — measured against the baseline's own run-to-run spread. It found no gap above one composite point and no consistent direction, and it found that irrelevant demographic wording changes retrieval; a descriptor-free retrieval mitigation was tested against it, with partial, suggestive benefit; a second, deterministic version of the mitigation then fully resolved the retrieval-side sensitivity.

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

**De-duplication check.** The 1,046 figure counts PDF files, not distinct documents. A read-only scan (exact SHA-256 of file bytes, plus a match on normalized text from the first two pages) found 36 clusters of duplicate files containing 41 redundant copies, so the corpus holds roughly 1,005 distinct PDFs (about 4% redundancy). Twenty-two of the clusters span more than one topic folder — the same paper filed under, for example, both Clinical Practice Guidelines and Health Equity — and the 2022 CDC opioid-prescribing guideline appears three times under different filenames. Because 99 PDFs have too little extractable text for the content match and were checked by exact hash only, 41 is a lower bound. Nothing was removed or re-indexed; the cluster list is provided with the repository (`paper/corpus_duplicate_clusters.json`). Since every copy is embedded separately, duplicates can occupy several of the six retrieved slots with the same passage in *any* pipeline condition, not only the ones tested here.

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

#### Corrected structured-evidence ranking, v2 and v3 (opt-in)

After analyzing v1 we implemented a corrected version (`structured_rank_v2=true`) with three changes. (1) The re-ranking score is now the similarity of each candidate, min-max normalized from the FAISS distance to the range 0–1 within the 12-chunk pool, plus a type term capped at 0.15 (type priority divided by its maximum), so the label can only break near-ties and cannot override relevance. (2) At most two of the final six chunks may come from the same source file. (3) A fifth category, `statistic`, is added for reported rates, trends, and surveillance estimates. If the cap leaves fewer than six chunks, the remainder are back-filled in score order. Version v3 (`structured_rank_v3=true`) is v2 plus a near-duplicate filter: a candidate is skipped if its Jaccard similarity over word 5-gram shingles (first 120 words) with any already-selected chunk is at least 0.6, which targets the same document appearing under several filenames. v1's code is left unchanged so its original result remains reproducible.

### 3.5 Complementary Tennessee surveillance layer

Independent of the RAG corpus, the deployed system includes a set of live dashboards built directly from structured Tennessee and national datasets: county-level overdose death rates (Tennessee Department of Health), opioid and benzodiazepine prescribing rates by county from the Controlled Substance Monitoring Database (2013–2024), Knox County medical examiner toxicology records, municipal wastewater opioid-signal monitoring, NSDUH state-level prevalence estimates, CDC provisional national overdose counts, and SAMHSA treatment-gap data. These are served through dedicated API endpoints and are not part of the retrieval index; they are a separate, structured-data complement to the document-grounded chat system, intended for the policy-and-planning use case described in Section 1.

### 3.6 Evaluation design

To assess answer quality, we constructed a 20-question test set spanning 9 of the 10 originally planned topic areas (Table 1's T10 gap propagates here) and 5 difficulty tiers (basic, clinical, advanced, data, and policy), with each question annotated with a topic, difficulty label, and a set of expected themes a good answer should touch on. Each question was submitted to the live COMPASS system and the response scored automatically along four dimensions: a keyword-overlap score against the annotated expected themes; and, using a separate LLM (`qwen3:32b`, run locally via Ollama) as an independent judge, faithfulness (is the answer supported by the retrieved sources, on a 0–5 scale), answer relevance (does it address the question asked), and completeness (does it cover the expected themes). Latency and the number of sources cited per answer were also recorded. This design follows the plan's instruction to fix the evaluation rubric before building the system further, and the rubric and full test set are included in the project repository (`evaluation/test_set.json`, `evaluation/run_eval.py`) for reproducibility.

**Comparison conditions and repeated runs.** The same test set and rubric were run against the graph-augmented pipeline (Section 3.4), the ClinicBot-inspired structured-rank pipeline in three successive versions (v1, corrected v2, and v3 with near-duplicate filtering; Section 3.4), and repeated runs of the plain pipeline. Because generation is stochastic (temperature 0.1) and the judge scores free text, the plain baseline was run four times and v2 three times to estimate run-to-run variation; the other conditions were run once. Results are in Sections 4.3–4.5.

**Demographic-equity pilot.** The original plan specified 60 matched vignettes. We ran a smaller pilot of 35: five clinical scenarios (starting buprenorphine in fentanyl use, choosing medication with hepatitis C, discharge after an overdose, opioid use disorder arising from long-term pain treatment, and take-home methadone doses), each posed as a base patient (a 34-year-old White man on TennCare in Knox County with no criminal-justice involvement) plus five single-factor variants (race/ethnicity, gender, insurance, county, criminal-justice involvement) and one two-factor variant. Variants change only demographic wording; the clinical question is identical. Each base vignette was run three times and each variant twice against the default pipeline (75 runs), all scored with the same judge rubric. For each variant we computed the composite gap from its scenario's base mean (mean of the three 0–5 judge scores), the overlap of recommended medications (buprenorphine, methadone, naltrexone, naloxone) and of cited source files with the base answers, and compared those with the base's own repeat-to-repeat variation. Race and gender are clinically neutral for these questions, so a difference there is a concern; insurance, county, and criminal-justice involvement can legitimately change advice (for example, coverage or setting), so differences there are not by themselves bias. Results are in Section 4.6. We then tested one mitigation (`clinical_query=true`): an LLM (temperature 0) rewrites the question into a standalone clinical query with demographics, insurance, location, and legal status removed; retrieval runs on that rewrite; and the model still generates from the full original question. The equity pilot was repeated with it, and answer quality was checked with two runs of the standard 20-question set. Because that rewrite is itself an LLM call, we then built a second, deterministic version (`clinical_query_v2=true`): a fixed set of regular expressions drops sentences that introduce age, race/gender, insurance, county, or criminal-justice status (matched by sentence structure, e.g. a leading "is a *N*-year-old …" clause, or a clause naming where the patient lives together with an insurance or justice-status term), with no model call and therefore no added latency or non-determinism. The same pilot and quality check were repeated against it.

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

Table 3 reports a single run (June 3). Section 4.5 reports three same-day repeats of the identical configuration, which scored a composite of 0.807, 0.803, and 0.830 against this run's 0.850, so the values in Table 3 should be read as one draw from a distribution with a standard deviation of roughly 0.02, not as a precise measurement. Two earlier partial runs used only the keyword-overlap score and are not included.

### 4.3 Graph-augmented comparison

Table 5 compares the graph-augmented pipeline (Section 3.4) against the June 3 plain-RAG run from Table 3, on the identical 20-question test set with the identical judge and rubric. The graph-augmented composite score was 0.827 against 0.850, with lower faithfulness (4.15 vs. 4.35) and completeness (3.65 vs. 3.80), unchanged answer relevance (4.60), lower keyword overlap (0.605 vs. 0.670), and slightly higher latency (4.6 s vs. 4.35 s). Read alone, that looks like a small decline. Section 4.5 shows it is not distinguishable from run-to-run variation in the baseline itself (plain-RAG composites across four runs: 0.803–0.850), so we do not claim the graph layer made answers worse on aggregate.

**Table 5. Plain RAG (June 3 run) vs. graph-augmented RAG (n=20 questions each). Differences are within run-to-run noise (Section 4.5).**

| Metric | Plain RAG | Graph-augmented | Δ |
|---|---:|---:|---:|
| Mean latency (s) | 4.35 | 4.60 | +0.25 |
| Mean keyword-overlap score | 0.670 | 0.605 | −0.065 |
| Mean faithfulness (0–5) | 4.35 | 4.15 | −0.20 |
| Mean answer relevance (0–5) | 4.60 | 4.60 | 0.00 |
| Mean completeness (0–5) | 3.80 | 3.65 | −0.15 |
| Composite score (0–1) | 0.850 | 0.827 | −0.023 |

#### Case study: a graph-induced factual error

Whatever the aggregate, one answer in the graph-augmented run contained a specific, traceable error. For T1-04 ("How does extended-release naltrexone compare to buprenorphine for OUD treatment outcomes?"), the answer stated: *"it is mentioned that naltrexone XR is contraindicated for Opioid Use Disorder (Condition), which suggests that it may not be effective or suitable for treating OUD"* — factually wrong and clinically consequential, since extended-release naltrexone is an FDA-approved first-line MOUD medication. The plain-RAG answer to the same question in the June run made no such claim. (We did not re-run this question repeatedly, so we cannot say how often the graph condition reproduces the error; the parenthetical "(Condition)" in the answer shows it was copied from the injected triple.)

The cause is traceable. The concept map contains a `CONTRAINDICATED_FOR` relationship from `Naltrexone XR` to `Opioid Use Disorder` (also for oral naltrexone), and our triple-formatting step (Section 3.4) surfaces the relationship type but not its `note` property, which reads "Must be opioid-free 7–10 days; will precipitate withdrawal." The clinical fact the graph's author intended is narrow and correct — naltrexone must not be started while a patient is still physically dependent — but the schema has no node for "recent opioid use requiring detox first," so the edge was attached to the closest existing node, the very condition the medication treats. Stripped of its note, the bare triple reads as a blanket contraindication. This is a compound failure: a knowledge-representation gap in the hand-authored graph, made worse by a formatting choice that discarded the context that would have prevented it.

### 4.4 Structured-evidence-rank comparison

**v1.** The first implementation (Section 3.4) scored a composite of 0.813 in a single run (faithfulness 4.10, relevance 4.55, completeness 3.55, keyword overlap 0.627), with the highest latency of the conditions then tested (5.7 s). As with the graph condition, this is inside the baseline's run-to-run range (Section 4.5). Independently of its score, v1 has a verifiable design flaw: its combined score adds a type-priority term (0–2) to a similarity-rank penalty that can never exceed 1, so a chunk labeled `recommendation` that ranked *last* by similarity in the 12-chunk pool can outrank a `narrative` chunk that ranked *first*. One answer (T2-02, the CDC 2022 guideline question) illustrates a plausible consequence: it quoted the guideline's risk-assessment recommendations (Box 3) correctly but omitted three other recommendation categories the judge expected (non-opioid alternatives, dosing thresholds, urine drug testing), consistent with the re-ranker clustering the final six chunks in one part of a multi-part guideline. This is one answer and a hypothesis about mechanism, not an established effect.

**v2 and v3.** We then corrected the formula (Section 3.4): real similarity scores, a type term capped at 0.15, a per-file cap of two chunks, and a fifth `statistic` category. v2 was run three times, with composites of 0.877, 0.793, and 0.837 (mean 0.836). Its first run, at 0.877, was the highest of any condition, and had we stopped there we would have reported v2 as an improvement; the second and third runs show that it was a favorable draw. A diagnostic query on the same CDC question revealed why the per-file cap could not fix the clustering: the guideline appears in the corpus as `rr7103a1-H.pdf`, `CDC-2022-OpioidPrescribing-CPG.pdf`, and a PubMed Central copy, so the cap counted three sources but returned pages 2 and 6 of essentially one document. v3 adds a content-based near-duplicate filter (Jaccard similarity over word 5-gram shingles) to v2; on the same query it returned pages 7 and 13 of the guideline that v2 had not. v3 was run once (composite 0.840, latency 7.1 s), which is too little to interpret.

### 4.5 Run-to-run variability and overall comparison

Because single-run differences kept appearing at about the size of plausible noise, we re-ran the unmodified plain-RAG configuration on the same test set and judge. Composite scores across four runs (the June 3 run and three on September 21) were 0.850, 0.807, 0.803, and 0.830 (mean 0.823, SD 0.022; range 0.047). Table 6 places every condition against that spread.

**Table 6. All conditions, n=20 questions per run. Composite is the mean of the three 0–5 judge scores divided by 5.**

| Condition | Runs | Composite (each) | Mean ± SD | Faith. | Relev. | Compl. |
|---|---:|---|---|---:|---:|---:|
| Plain RAG | 4 | .850, .807, .803, .830 | **.823** ± .022 | 4.16 | 4.57 | 3.60 |
| Structured v2 | 3 | .877, .793, .837 | .836 ± .042 | 4.18 | 4.65 | 3.70 |
| Structured v3 | 1 | .840 | — | 4.15 | 4.70 | 3.75 |
| Graph-augmented | 1 | .827 | — | 4.15 | 4.60 | 3.65 |
| Structured v1 | 1 | .813 | — | 4.10 | 4.55 | 3.55 |

Every single-run condition lies inside the plain baseline's range, and v2's mean exceeds the plain mean by 0.013, about half the baseline's own standard deviation. By latency the plain pipeline is cheapest (4.3 s, against 5.8 s for v2, 5.7 s for v1, 4.6 s for graph, and 7.1 s for v3). On this evidence no variant beats plain RAG, and plain RAG is the best choice on cost: it is statistically tied on quality and needs no additional model call. The per-tier picture is equally noisy: across the four plain runs, clinical-tier faithfulness ranged from 3.75 to 4.0 and data-tier faithfulness from 3.0 to 4.5, so tier-level differences between single runs, including the ones we initially interpreted, are not reliable.

### 4.6 Demographic-equity pilot

Table 7 summarizes the pilot (Section 3.6). Across all 30 variant–base comparisons, **no variant differed from its base scenario by more than one composite point**; the flagging threshold from our plan was not exceeded. Two comparisons reached exactly +1.00 (county and two-factor variants of scenario S1), both in the scenario whose base scored lowest (3.33 of 5) and so had the most room to rise. The largest negative gaps were −0.83 (S4, race) and −0.67 (S3, race; S4, gender). Gaps ran in both directions across dimensions, and the base scenario's own repeats varied by a mean of 0.12 composite points, so most gaps are larger than repeat noise but well short of the size the plan treated as concerning.

**Table 7. Demographic-equity pilot: gap between each variant and its base scenario (five scenarios per row; composite on a 0–5 scale). Medication and source overlap are Jaccard similarities with the base answers.**

| Dimension varied | Mean gap | Mean \|gap\| | Gaps >1.0 | Med. overlap | Source overlap |
|---|---:|---:|---:|---:|---:|
| Race/ethnicity | −0.42 | 0.42 | 0 | 0.57 | 0.77 |
| Gender | −0.12 | 0.39 | 0 | 0.72 | 0.72 |
| Insurance | −0.02 | 0.24 | 0 | 0.80 | 0.59 |
| County | +0.11 | 0.56 | 0 | 0.67 | 0.87 |
| Criminal-justice involvement | +0.08 | 0.39 | 0 | 0.80 | 0.85 |
| Two factors | +0.41 | 0.48 | 0 | 0.75 | 0.60 |
| Base vs. its own repeats | — | 0.12 | — | 0.69 | 1.00 |

Three points qualify the reading. First, the clinically neutral dimensions (race and gender) had a mean absolute gap of 0.41, essentially the same as the context-relevant dimensions (0.42), so there is no sign that neutral wording matters more than relevant wording; race alone leans negative (mean −0.42) but rests on three of five scenarios, one of which (S5) had a base score of 5.0 and could only fall. Second, the recommended-medication sets changed between demographic variants in both directions — for the fentanyl-induction scenario the race variant added methadone to the base's buprenorphine-only answer, while for the hepatitis C scenario it dropped methadone and naltrexone — but the base answers were themselves inconsistent across repeats (in the overdose-discharge scenario the base alternated between naloxone-only and naloxone with buprenorphine and methadone), so we cannot attribute these shifts to demographics. Third, answers almost never engaged with demographics: only 2 of 75 mentioned any race, gender, or stigma term.

The clearest effect is on retrieval rather than answer quality. Because the base query is identical across repeats, its retrieved sources do not change (overlap 1.00); once demographic wording changes, the cited source files overlap the base's only 0.72–0.77 for race and gender, where the added words are clinically irrelevant, and 0.59–0.60 for insurance and two-factor variants. Irrelevant wording therefore changes which documents reach the model, even though the resulting judge scores stayed close.

#### Mitigation: retrieving on a descriptor-free query

Table 8 compares the original pilot against both mitigations. The LLM rewrite (v1) gave a partial, suggestive improvement: race and gender gaps shrank and medication overlap rose, but cited-source overlap barely moved for race (0.77 to 0.79) and fell for insurance and two-factor variants, because the rewriter paraphrases differently-worded variants differently and so introduces its own variance. The deterministic version (v2) resolved that specific problem directly: **cited-source overlap with the base scenario reached exactly 1.00 for every dimension**, because a correctly matched demographic sentence is removed identically regardless of which race, gender, insurance, county, or justice status it names, leaving byte-identical search queries within each scenario. Answer quality was unaffected (composite 0.810 and 0.837 across two runs, mean 0.823 — identical to the plain baseline's mean — at the plain baseline's own latency, 4.3 s, since no extra model call is made).

**Table 8. Equity pilot across the original condition and both mitigations. Mean absolute composite gap and overlaps are versus each scenario's base.**

| Dimension | Mean \|gap\| orig. | v1 | v2 | Med. overlap orig. | v1 | v2 | Source overlap orig. | v1 | v2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Race/ethnicity | 0.42 | 0.12 | 0.27 | 0.57 | 0.82 | 0.87 | 0.77 | 0.79 | **1.00** |
| Gender | 0.39 | 0.17 | 0.26 | 0.72 | 0.85 | 0.90 | 0.72 | 0.94 | **1.00** |
| Insurance | 0.24 | 0.37 | 0.28 | 0.80 | 0.85 | 0.88 | 0.59 | 0.49 | **1.00** |
| County | 0.56 | 0.22 | 0.34 | 0.67 | 0.87 | 0.75 | 0.87 | 0.78 | **1.00** |
| Criminal-justice | 0.39 | 0.42 | 0.37 | 0.80 | 0.90 | 0.80 | 0.85 | 0.72 | **1.00** |
| Two factors | 0.48 | 0.39 | 0.26 | 0.75 | 0.72 | 0.77 | 0.60 | 0.48 | **1.00** |

Eliminating retrieval variance did not eliminate score variance: v2's composite gaps (0.26–0.37) are similar in size to v1's and to the original condition's, and individual gaps still reach ±0.67. This is consistent with the mitigation's design — it only changes what is retrieved, not what the model reads at generation time, and the model still sees the full original question with demographics intact when producing its answer, deliberately, so that clinically relevant patient context is not discarded. The base scenario's own repeat variance was also higher in this run (mean deviation 0.21, against 0.12 in the original pilot and 0.27 for v1), and with three repeats per base scenario that estimate is itself imprecise, so the residual score gaps should be read as still within the range this pilot can attribute to noise, not as a demonstrated separate effect once retrieval is controlled for. What the v2 result does establish cleanly is that the retrieval-sensitivity finding from Section 4.6's opening paragraph has a working, deterministic fix, at no cost in quality or latency.

---

## 5. Discussion

The evaluation in Section 4.2 shows that the plain RAG pipeline produces answers that are faithful to retrieved sources and relevant to the question at a consistently high rate across topic areas, with completeness the weaker dimension, particularly for "clinical" questions that ask for specific, multi-part information. We hypothesized that two natural additions might close part of that gap: a concept-map layer that supplies related entities a nearest-neighbor search misses, and a re-ranker that promotes recommendation-type passages over background narrative. Sections 4.3–4.5 test those hypotheses, and neither is supported.

The most important result is methodological. Re-running the identical plain-RAG configuration produced composite scores of 0.850, 0.807, 0.803, and 0.830 — a spread of 0.047 with no change to the system. Every between-condition difference we measured (graph −0.023, v1 −0.037, v2 +0.013 on means) is smaller than that spread. Our first-pass reading of single runs was that graph augmentation and ClinicBot-style re-ranking made answers *worse*, with a "decline concentrated in clinical questions" attributed to graph context and a "data-tier regression" attributed to the re-ranker's taxonomy. The repeated runs do not support either statement: the graph run's clinical-tier scores fall inside the plain baseline's own range, and the plain baseline shows the same data-tier swings unaided. Single-run comparisons on a 20-question set with a stochastic generator and judge are not evidence of a difference of this size in either direction. We report the correction rather than the original reading because the correction is what the data support, and because it bears on how similar RAG ablations are usually reported.

What the experiments do establish are concrete defects, independent of any score. In the graph run, one answer stated that extended-release naltrexone is contraindicated for opioid use disorder — false, since it is a first-line medication. We traced it to a graph edge that encodes a narrow, correct caveat (an opioid-free window before induction) against the wrong node, compounded by a formatter that dropped the edge's qualifying note. In v1 re-ranking, the type-priority term could by construction outweigh the similarity term, letting a barely relevant chunk with a favored label displace a highly relevant one. And a diagnostic query on the CDC guideline showed the corpus holds that guideline under three filenames, so a per-file diversity cap counted three sources but delivered one document; a content-based duplicate filter (v3) reached previously unseen pages of the guideline on that query, though a single query is anecdotal. These are the kind of findings a null score comparison can hide.

Practically, the results argue for the simplest pipeline as the default: the re-ranking variants add roughly 1.5–3 s of latency per question (an extra LLM call to classify chunks) without a detectable quality gain, and the graph variant adds a database round trip and a documented way to inject a false clinical claim. That is a statement about these implementations at this scale, not about the ideas: v2's mean composite (0.836) sits 0.013 above the plain mean (0.823), and a larger evaluation could resolve a difference of that size. It also suggests that an augmentation ported from a paper evaluated on a narrower corpus should be re-validated on COMPASS's own corpus and question mix, with repeated runs, before it is adopted.

The equity pilot adds a modest but useful result. We found no disparity larger than one composite point and no consistent direction across dimensions, which is weak evidence that answer quality does not depend strongly on the demographic details tested. It is not evidence of fairness: the pilot has five scenarios per dimension, two repeats per variant, and a judge that scores groundedness and completeness rather than whether the clinical recommendation itself is appropriate for the patient. Its most actionable finding is mechanical — demographic wording changes retrieval by roughly a quarter of the cited sources — because that is a channel through which bias could enter even where the current judge scores do not show it, and a retrieval step that ignores clinically irrelevant patient descriptors is the obvious mitigation. An LLM-rewrite version of that step kept answer quality intact and improved medication consistency but only partly reduced retrieval variation, since the rewrite is itself variable; a deterministic, regex-based version removed the retrieval variance entirely (source overlap 1.00 across every dimension tested) at no cost in latency or quality. It does not address whatever residual score variance is driven by generation rather than retrieval, which a future test could isolate by also controlling what the model sees at generation time — a change we did not make here because it would mean withholding patient context the model may legitimately need.

### 5.1 Limitations

- **The demographic-equity result is a small pilot.** It used 35 vignettes (five scenarios per dimension, two repeats per variant) rather than the 60 planned, one generator and judge, and a rubric that does not assess whether a recommendation is clinically appropriate for the patient. It can rule out only large disparities; differences below roughly half a composite point cannot be separated from repeat variation, and a full test with more scenarios, clinician-scored answers, and additional dimensions (for example, pregnancy, housing, and language) remains the most important open item.
- **Repeated measurements are thin and uneven.** Plain RAG was run four times and structured-rank v2 three times; the graph-augmented, v1, and v3 conditions were each run once. Standard deviations estimated from three or four runs are themselves rough. The conclusion that no variant is distinguishable from the baseline is therefore a statement about the power of this design (20 questions, 1–4 runs), not a demonstration that the true effects are zero: differences smaller than roughly 0.04–0.05 in composite score cannot be detected here.
- **Single backend, small test set, and a judge that is itself noisy.** All evaluation used one generator (Ollama/Llama-3.1-8B) and one LLM judge on 20 questions, with as few as one question in some topic and difficulty cells. Tier-level tables should be read as indicative only; the repeated plain-RAG runs show that tier scores alone vary by a full point or more (e.g., data-tier faithfulness 3.0–4.5).
- **The graph-augmented implementation is deliberately simple.** Entity matching is substring matching, not robust entity linking, and the triple formatter drops relationship properties (Section 3.4). The naltrexone case in Section 4.3 shows this is not cosmetic. The result is a test of this implementation, not a ceiling on graph augmentation.
- **The proposed causes for the re-ranking behavior are only partly verified.** The v1 formula flaw (type priority able to outweigh similarity rank) is true by construction. The suggested taxonomy mismatch for surveillance-statistics questions and the suggested clustering mechanism for T2-02 are hypotheses consistent with single answers; the tier-level regression we first attributed to the taxonomy also appears in plain-RAG reruns and cannot be attributed to it.
- **Concept map is at seed scale and contains at least one known data error.** At 99 nodes and 77 relationships, the graph falls well short of the 200-node, 400-edge target in the original plan, and the naltrexone contraindication was found through this evaluation rather than a prior audit, which suggests other undetected modeling issues may exist.
- **Corpus duplication and an unpopulated topic.** About 41 of the 1,046 PDF files are redundant copies (roughly 1,005 distinct; Section 3.1), including the 2022 CDC opioid-prescribing guideline filed three times, and the index has not been rebuilt without them. Duplicates can fill several retrieval slots with the same passage and defeat per-file diversity limits. T10 (AI in Addiction Medicine) has no ingested documents.
- **No clinician or practitioner review yet.** The IPS-facilitated review sessions specified in the original plan have not taken place. All evaluation to date is automated (keyword overlap and LLM-as-judge); no domain expert has scored any answer. Given the graph-induced factual error in Section 4.3, which a clinical reviewer would very likely have caught, this gap matters.

### 5.2 Broader impact

Independent of the graph-comparison question, COMPASS's document corpus, RAG pipeline, and Tennessee surveillance dashboards already constitute a working, deployed system that unifies clinical, research, surveillance, and policy information about OUD in one citeable, searchable interface — something Section 1 argues does not otherwise exist for Tennessee. The system's design goal of holding up across underinsured, rural, and justice-involved populations (Section 3.6) reflects the population most affected by Tennessee's overdose crisis, and its development in partnership with the UTK Institute for Public Service is intended to keep it accountable to practitioner needs rather than only to what is technically interesting to build.

---

## 6. Conclusion

COMPASS is a working, deployed retrieval-augmented generation system that grounds answers about opioid use disorder in a screened corpus of 1,046 Tennessee-relevant documents, returning cited sources with every response across three interchangeable LLM backends, and complements that system with a Neo4j concept map and a suite of live Tennessee surveillance dashboards. Its plain retrieve-then-read pipeline scores consistently high on faithfulness and answer relevance under an independent LLM judge, with completeness the weaker dimension, particularly for detailed clinical questions. We then tested whether four ways of building on that baseline could improve it: injecting concept-map relationships into generation (the project's original central question), ClinicBot-style re-ranking of retrieved passages by content type, a corrected version of that re-ranker, and the corrected version with near-duplicate filtering. None produced a detectable improvement. Repeating the plain baseline showed that run-to-run variation in the composite score is about ±0.02–0.04, larger than every difference between conditions, so the single-run gaps we first observed, including our initial reading that two of the variants were *worse* than the baseline, were within noise. The evidence therefore supports keeping the simplest pipeline as the default, and treating the extra latency of the re-ranking variants (about 1.5–3 s per question) as unjustified until a variant shows a gain larger than the noise. What the experiments did surface are specific, verifiable defects rather than score differences: a graph edge that turned a narrow naltrexone caveat into a false blanket contraindication in one generated answer, a re-ranking formula in which the type term could override relevance, and duplicate copies of the same guideline in the corpus that defeat per-file diversity limits. A pilot demographic-equity test found no large or consistent disparity across race, gender, insurance, county, and justice involvement, but showed that irrelevant demographic wording changes which documents are retrieved; a fuller test with clinician-scored answers remains the most important open item, and does not depend on how any of the retrieval questions resolve; the retrieval-side sensitivity itself, however, now has a working, deterministic mitigation with no measured cost.

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
- Plain-RAG results: `evaluation/results/eval_20260603_135426.csv` (Table 3, the June 3 run) plus three same-day repeats, `eval_20260921_155214.csv`, `eval_20260921_155858.csv`, `eval_20260921_160441.csv`; two earlier keyword-only runs (`eval_20260602_185824.csv`, `eval_20260603_134912.csv`) are not reported.
- Graph-augmented results (Section 4.3):  
    `evaluation/results/eval_20260918_184919_graph.csv`  
    (raw, with full answer text for the T1-04 case study: `raw_20260918_184919_graph.json`)
- Structured-rank v1 results (Section 4.4):  
    `evaluation/results/eval_20260918_195317_structured.csv`  
    (raw, with full answer text for the T2-02 case study: `raw_20260918_195317_structured.json`)
- Structured-rank v2 results (three runs): `eval_20260921_154841_structured_v2.csv`, `eval_20260921_160207_structured_v2.csv`, `eval_20260921_160747_structured_v2.csv`; v3 (one run): `eval_20260921_155557_structured_v3.csv`
- Concept-map schema and seed data: `compass-app/backend/graph_ingest.py`  
    (see the `contras` list for the naltrexone contraindication entries discussed in Section 4.3)
- Graph-augmented generation code:  
    `compass-app/backend/graph.py` (`match_entities`, `get_context_for_question`)  
    `compass-app/backend/rag.py` (`run_ollama_graph_augmented`)  
    wired into `compass-app/backend/main.py` via the opt-in `graph_augment` field on `/chat`
- Structured-rank generation code:  
    `compass-app/backend/rag.py` (`_classify_units`, `run_ollama_structured_rank` for v1; `_classify_units_v2`, `run_ollama_structured_rank_v2` with `dedupe_content` for v2/v3)  
    wired into `compass-app/backend/main.py` via the opt-in `structured_rank`, `structured_rank_v2`, and `structured_rank_v3` fields on `/chat`
- Demographic-equity pilot: vignette generator `evaluation/build_vignettes.py` (output `evaluation/equity_vignettes.json`), runner `evaluation/run_equity.py`, analysis `evaluation/analyze_equity.py`, raw results `evaluation/results/equity_20260921_192431.json`
- Clinical-query mitigation, v1 (LLM rewrite): `compass-app/backend/rag.py` (`run_ollama_clinical_query`, `REWRITE_PROMPT`), opt-in `clinical_query` field on `/chat`; results `evaluation/results/equity_20260921_194614_clinicalquery.json`, `eval_20260921_194907_clinicalquery.csv`, `eval_20260921_195200_clinicalquery.csv`
- Clinical-query mitigation, v2 (deterministic): `compass-app/backend/rag.py` (`strip_demographic_descriptors`, `run_ollama_clinical_query_v2`), opt-in `clinical_query_v2` field on `/chat`, `--clinical-query-v2` flag in `run_equity.py` and `run_eval.py`; results `evaluation/results/equity_20260923_183254_clinicalqueryv2.json`, `eval_20260923_183533_clinicalqueryv2.csv`, `eval_20260923_183810_clinicalqueryv2.csv`
- Corpus de-duplication report: `paper/corpus_duplicate_clusters.json`
- RAG pipeline configuration: `compass-app/backend/config.py`, `compass-app/backend/rag.py` (chunk size 800 / overlap 150, `BAAI/bge-small-en-v1.5` embeddings, top-6 FAISS retrieval)
- Document corpus: `Vector_Library/` (topic folders T1–T9, T11; T10 unpopulated)
- 150-paper foundational bibliography: `SUD150_Citations_by_Category.docx`
