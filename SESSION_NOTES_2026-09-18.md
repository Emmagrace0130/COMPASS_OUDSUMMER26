# COMPASS — Session Notes, 2026-09-18

A working log of everything done in this session, so it's easy to pick back up later.
**Nothing below has been committed to git yet** — see [Git status](#git-status) at the bottom.

---

## 1. Frontend navigation — flattened from 13 tabs to 6

**Why:** the site was "too complicated" with a lot of non-Tennessee content competing for attention.

- Went from 13 top-level tabs (behind 4 dropdown menus) to a flat bar: **Home · Ask · Find Treatment · Tennessee Data · Clinical Tools · Library**, plus a deliberately de-emphasized **National Context** link on the far right.
- Nothing was deleted — views that used to be top-level tabs became sub-tabs of the section they belong to (per Emma's explicit instruction: hide, don't delete).
  - **Tennessee Data**: County Map, Knox Co. Deaths, Statewide OD, Treatment Admissions, Rx Trends, Polysubstance Patterns, Policy Timeline, Drug Courts
  - **Clinical Tools**: All4Knox Guide, MOUD Prescriber Reference, COWS/DAST, MOUD Study, Patient Outcomes
  - **Library**: Document Library, Knowledge Map, Data Sources
  - **National Context** (muted, off to the side): CDC, NSDUH, Demographics, Treatment Gap, Wastewater (AZ pilot)
- New shared constant `frontend/src/lib/region.ts` — Tennessee + its 8 bordering states — deduplicated from a copy that used to live only in `TreatmentGapView.tsx`.
- **Find Treatment** (`DataView.tsx`) now defaults to Tennessee instead of "All states"; added a "TN + neighbors" filter option; stat cards reordered TN → Region → Nationwide.
- Fixed a source-count inconsistency across the UI (some places said 150+, others 740+) → standardized on **740+**.
- Key files: `App.tsx`, `lib/tabMeta.ts`, `lib/region.ts` (new), `components/SubTabLayout.tsx`, `components/DataView.tsx`, `components/MessageBubble.tsx`, `components/TreatmentGapView.tsx`.

## 2. Home tab split from Ask/chat

**Why:** the marketing/hero homepage used to only show when the chat was empty — once you sent one message, it was gone for good with no way back.

- **Home** is now its own tab (and the default landing tab): always shows the hero, spinning compass, and example questions.
- **Ask** is now a pure chat tab with its own minimal empty state ("Ask COMPASS anything" + a link back to Home for examples).
- Clicking an example question on Home switches to Ask and sends it.

## 3. Visual redesign — UT Tennessee Orange + TurboTax-style usability

- Recolored the entire theme by changing CSS custom properties in `index.css` (`:root` / `.dark`) — almost every component already used semantic Tailwind tokens (`compass-purple`, `compass-cyan`, etc.) rather than literal colors, so this was a token-value swap, not a per-component rewrite.
  - Primary/brand → **UT Tennessee Orange** `#FF8200` (was indigo)
  - Backgrounds/borders → warm off-white / UT Smokey Gray (was cool slate-blue)
  - Alerts stay red, positive status stays green — kept off-brand-orange on purpose so "clickable" and "alert" don't collapse into the same color
  - Also fixed `tailwind.config.js` box-shadow colors and `chartTheme.ts` tooltip border, which were hardcoded independent of the token system
- New spinning compass: `public/compass-hero.svg` — a clean flat orange/white/smokey compass rose with **no text on it** (rotating letters would read upside-down at 180°). Spins via the pre-existing (previously unused) `animate-spin_slow` Tailwind utility in the `HomeView.tsx` hero.
- Smaller polish: pill-style example-question buttons with hover lift, Policy section icons recolored to match their own green header instead of reusing Clinical's orange, Welcome Modal's third accent color changed from amber (would've clashed with the new orange) to neutral stone-gray.
- Verified with real headless-Chromium screenshots (light + dark mode) before and after deploying — not just a green build.

## 4. Deployment

All three rounds of frontend changes above (nav restructure → visual redesign → Home tab split) were rebuilt and redeployed to the live site:
```
cd compass-app && docker compose build --no-cache frontend && docker compose up -d frontend
```
Live at `https://compass.axiomsystemslab.com`.

## 5. Research paper — first full draft

Investigated the actual state of the project against the original plan (`LLM_Summer_Outline/Emma OUD_LLM_Project_Plan_v4 (3).docx`) and the June posters before writing anything, and used **real numbers pulled directly from the system**, not the (3-months-stale) posters:

| | Poster claimed | Actually is (verified 2026-09-18) |
|---|---|---|
| Document corpus | 295+ PDFs | **1,046 PDFs**, 10 topic areas (T10 "AI in Addiction Medicine" defined in code, but empty) |
| Concept map | 200+ nodes / 400+ edges | **99 nodes / 77 relationships** (queried live from Neo4j) |
| RAG eval | — | 20/20 answered, faithfulness 4.35/5, relevance 4.60/5, completeness 3.80/5, composite 0.850 |

Wrote a full first-pass draft (Abstract → Introduction → Related Work → Methods → Results → Discussion → Conclusion → References → Appendix), per Emma's explicit direction to **report what's actually built and mark what isn't as future work, rather than fabricate results.**

- `paper/COMPASS_paper_draft.md` — Markdown version (⚠️ **now stale**, see note below)
- `paper/COMPASS_paper_draft.tex` — LaTeX version, compiles cleanly to a 13-page PDF (`paper/COMPASS_paper_draft.pdf`) with `pdflatex` (needs 2 passes for cross-references)
- Related Work is grounded in the existing 150-paper bibliography (`SUD150_Citations_by_Category.docx`), plus 3 general RAG/GraphRAG citations added from general knowledge (Lewis et al. 2020, Gao et al. 2023, Edge et al. 2024) — flagged in the paper for Emma to verify
- Authors: Emma Baumgartner, T. Berg (advisor), Dr. Gerald Jones Jr. — **Gerald Jones Jr.'s actual role/affiliation is unconfirmed**, added with no label at Emma's request
- Still flagged in the paper as needing verification: the exact TN overdose death figure/year in the Introduction (currently using the poster's uncited "3,616 in 2023, TDH")

## 6. The big one: graph-augmented RAG comparison — implemented, run, and it's a null result

The project's central research question — *does the Neo4j concept-map layer improve RAG answers over plain retrieval* — had never been tested. Verified in code that `/chat` never queried the graph at all. Rather than leave this as "future work" a second time, built and ran the actual experiment.

**What was built** (opt-in only — default `/chat` behavior verified unchanged before and after):
- `compass-app/backend/graph.py` — `match_entities()` (substring match against the graph's 99 node names against the question + retrieved text) and `get_context_for_question()` (1-hop Neo4j neighborhood lookup → formatted relationship triples, capped at 15)
- `compass-app/backend/rag.py` — `run_ollama_graph_augmented()`: same top-6 FAISS retrieval, plus the graph triples injected into one combined prompt
- `compass-app/backend/main.py` — new `graph_augment: bool = False` field on `/chat`'s request body; routes to the new function only when `true`
- `evaluation/run_eval.py` — new `--graph` flag / `GRAPH_AUGMENT` env var; results saved with a `_graph` suffix so they don't overwrite the baseline

Rebuilt and redeployed the backend, verified the default path was untouched via curl, then ran the actual 20-question evaluation against the graph-augmented pipeline.

**Result — the graph-augmented condition did not help:**

| Metric | Plain RAG | Graph-augmented | Δ |
|---|---:|---:|---:|
| Composite score (0–1) | 0.850 | 0.827 | −0.023 |
| Faithfulness (0–5) | 4.35 | 4.15 | −0.20 |
| Completeness (0–5) | 3.80 | 3.65 | −0.15 |
| Relevance (0–5) | 4.60 | 4.60 | 0.00 |

The decline was concentrated entirely in **"clinical"-difficulty questions** — exactly the tier the concept map was hypothesized to help most (faithfulness 4.0→3.6, completeness 3.2→3.0).

**Diagnosed a specific cause, not just a number:** traced the worst-scoring question (T1-04, naltrexone vs. buprenorphine) to a real bug. The seed graph has `Naltrexone XR/oral —[CONTRAINDICATED_FOR]→ Opioid Use Disorder` (in `graph_ingest.py`'s `contras` list). This was meant to encode a real, narrow clinical fact — naltrexone needs an opioid-free window before induction — but was attached to the wrong node for lack of a more specific one, and the new triple-formatting code drops the relationship's `note` property that held that nuance. Stripped of context, the LLM read the bare triple and stated naltrexone is "contraindicated for OUD" — false; it's a first-line OUD medication. **This bug was documented, not fixed-then-silently-rerun** — the paper reports the result as actually measured, with the fix noted as a next step.

New eval artifacts: `evaluation/results/eval_20260918_184919_graph.csv` / `raw_20260918_184919_graph.json`.

The paper (`.tex` — see stale-file note below) was rewritten throughout to report this as a real, diagnosed finding: Abstract, Introduction, Contributions, Methods (new subsection describing the implementation), Results (two new tables + a case-study writeup), Discussion, Limitations, and Conclusion all updated.

---

## Current status / what's still open

1. **The demographic equity test (60 vignettes) still doesn't exist.** This is now the single most consequential remaining gap in the paper — nothing else in the original plan is still untested.
2. **`paper/COMPASS_paper_draft.md` is stale.** The graph-comparison results (Section 6 above) were only written into `COMPASS_paper_draft.tex`, not back-ported to the `.md` version. Treat the `.tex`/`.pdf` as the current source of truth; the `.md` still says "no results reported" for the graph comparison, which is no longer true. Worth asking me to sync them if you want both current.
3. **Known naltrexone graph bug is unfixed.** `graph_ingest.py`'s `contras` list still has the mismodeled relationship; fixing it (and/or including the `note` property in generated triples) is a natural next experiment, not yet done.
4. Items flagged in the paper for Emma to verify before this goes anywhere real: the TN overdose death statistic/source, the 3 added technical citations, Dr. Gerald Jones Jr.'s actual role.
5. No human clinician has reviewed any system output yet (the IPS review sessions from the original plan haven't happened).

## Git status

**Nothing from this session is committed.** Everything above is either a modified tracked file or a new untracked file in the working tree — `paper/`, `frontend/src/lib/region.ts`, `frontend/public/compass-hero.svg`, the eval result files, and the backend/frontend source changes are all sitting uncommitted. Also present but unrelated to this session's work: `Vector_Library.zip` and one new Vector_Library docx appear staged/added already. Commit whenever you're ready — nothing has been pushed.
