# COMPASS Evaluation Results Summary

Compiled 2026-11-23. A single reference document pulling together every metric
measured across this project's evaluation work, for reuse in papers, slides,
or status updates without re-deriving numbers each time. Source files for
every number below are listed in each section so results can be traced back
to raw data.

## Core quality metrics, defined

Every condition below is scored by an independent LLM judge (`qwen3:32b`,
via Ollama) on three 0–5 dimensions:

- **Faithfulness** — is the answer supported by the retrieved sources
- **Answer relevance** — does it address the question asked
- **Completeness** — does it cover the expected themes

**Composite** = mean of the three dimensions, normalized to 0–1. Keyword
overlap (against annotated expected themes), latency, and sources-cited
count are also recorded per run.

## Baseline (Llama 3.1 8B via Ollama), repeated 4 times

| Run | Composite | Faithfulness | Relevance | Completeness |
|---|---|---|---|---|
| 1 | 0.850 | 4.35 | 4.60 | 3.80 |
| 2 | 0.807 | — | — | — |
| 3 | 0.803 | — | — | — |
| 4 | 0.830 | — | — | — |
| **Mean ± SD** | **0.823 ± 0.022** | 4.16 | 4.57 | 3.60 |

Run-to-run **range: 0.047** — larger than every between-condition
difference measured below. This is the project's central methodological
finding: single-run RAG comparisons at this scale cannot be trusted without
first measuring this spread.

By difficulty tier (single run): completeness fell to 3.2/5 on "clinical"
questions (n=8) vs. 4.0–4.7/5 for every other tier — but tier scores alone
vary by a full point or more across baseline repeats, so treat as indicative
only.

*Source: `evaluation/results/eval_20260603_135426.csv` plus three same-day
repeats, `eval_20260921_155214.csv`, `eval_20260921_155858.csv`,
`eval_20260921_160441.csv`.*

## Testing additions against the baseline

| Condition | Runs | Composite | Latency | Verdict |
|---|---|---|---|---|
| Plain RAG (baseline) | 4 | 0.823 ± 0.022 | 4.3s | — |
| Graph-augmented | 1 | 0.827 | 4.6s | Within baseline noise range |
| Structured-rank v1 | 1 | 0.813 | 5.7s | Within noise; verifiable formula bug (type-priority term could outweigh similarity) |
| Structured-rank v2 | 3 | 0.877, 0.793, 0.837 → 0.836 ± 0.042 | 5.8s | Within noise; first run looked like a win, wasn't |
| Structured-rank v3 | 1 | 0.840 | 7.1s | Within noise |

**None beat the baseline's own 0.047 spread.** The graph-augmented run also
produced one traceable factual error (falsely claimed naltrexone is
contraindicated for OUD), traced to a graph edge whose qualifying note was
dropped by the triple formatter.

*Source: `evaluation/results/eval_20260918_184919_graph.csv` (graph),
`eval_20260918_195317_structured.csv` (v1), `eval_20260921_154841_structured_v2.csv`
+ 2 more same-day repeats (v2), `eval_20260921_155557_structured_v3.csv` (v3).*

## Demographic-equity pilot (35 vignettes, 75 runs)

Metrics: composite gap vs. each scenario's base mean, medication-set overlap
(Jaccard), and cited-source overlap (Jaccard).

| Dimension | Mean \|gap\| (composite) | Source overlap |
|---|---|---|
| Race/ethnicity | 0.42 | 0.77 |
| Gender | 0.39 | 0.72 |
| Insurance | 0.24 | 0.59 |
| County | 0.56 | 0.87 |
| Criminal-justice involvement | 0.39 | 0.85 |
| Two factors | 0.48 | 0.60 |
| Base vs. own repeats | — | 1.00 |

No variant differed from its base by more than 1 composite point, but
**source overlap fell as low as 0.59** once any demographic wording was
added — clinically irrelevant wording changed which documents were
retrieved, even though the clinical question never changed.

*Source: `evaluation/results/equity_20260921_192431.json`.*

## Equity mitigations

| Mitigation | Source overlap (all dims) | Answer quality | Cost |
|---|---|---|---|
| None (original) | 0.59–0.87 (varies by dimension) | baseline | — |
| v1: LLM rewrite | Partial improvement, uneven (0.49–0.94) | unchanged | +model call latency |
| v2: deterministic regex strip | **1.00 across every dimension** | 0.823 (identical to baseline) | none (no extra model call) |

*Source: `evaluation/results/equity_20260921_194614_clinicalquery.json` (v1),
`evaluation/results/equity_20260923_183254_clinicalqueryv2.json` (v2).*

## Noise floor (isolating generation-time variance)

Same unmodified question, no demographic variation, run 8 times per scenario
(n=40) — zero retrieval variance by construction, so any score spread here
is pure generation + judge noise.

| Scenario | Mean | SD | Min | Max |
|---|---|---|---|---|
| S1 | 3.58 | 0.43 | 3.33 | 4.33 |
| S2 | 4.46 | 0.23 | 4.33 | 5.00 |
| S3 | 4.25 | 0.43 | 3.33 | 5.00 |
| S4 | 3.83 | 0.50 | 3.33 | 4.67 |
| S5 | 4.54 | 0.23 | 4.00 | 4.67 |
| **Pooled mean \|deviation\|** | **0.30** | | | |

The v2-mitigated equity pilot's residual gaps (0.26–0.37) fall within
0.87–1.23× this floor — indistinguishable from ordinary stochasticity, not
a residual demographic effect.

*Source: `evaluation/results/noisefloor_20260923_185849.json`.*

## Model comparison: gpt-oss:20b vs. llama3.1:8b (current production model)

| Run | n | Composite | Faithfulness | Relevance | Completeness | Avg latency |
|---|---|---|---|---|---|---|
| Baseline (llama3.1:8b, 4 runs) | 20 | 0.823 ± 0.022 | 4.2 | 4.6 | 3.6–3.8 | ~4.3s |
| gpt-oss:20b, run 1 | 14* | 0.962 | 4.93 | 4.93 | 4.57 | 19.6s |
| gpt-oss:20b, run 2 (clean) | 20 | 0.943 | 4.75 | 4.90 | 4.50 | 10.3s |

\*Run 1 lost 6/20 questions to judge timeouts under GPU contention; run 2
fixed this and completed the full set. Both runs land within 0.019 of each
other, well inside the baseline's own 0.05 noise band, while sitting
~0.12–0.14 above the baseline mean — a repeated, consistent result, not a
single favorable draw. **Not yet adopted in production** as of this writing;
the live site still runs llama3.1:8b.

*Source: `evaluation/results/eval_20261016_192435.csv` (run 1),
`evaluation/results/eval_20261021_161925.csv` (run 2).*

## Where to look for raw data

All CSV/JSON files referenced above live in `evaluation/results/`. The
scripts that produced them: `evaluation/run_eval.py` (standard + condition
flags), `evaluation/run_equity.py` (equity pilot + mitigation flags),
`evaluation/run_noise_floor.py` (noise floor). Full narrative writeup with
discussion and limitations is in `paper/COMPASS_paper_draft.tex` (20-page
version) and `paper/COMPASS_W3PHIAI2027.tex` (8-page condensed version).
