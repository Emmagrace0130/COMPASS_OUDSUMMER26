# Quarantined duplicate PDFs

These 41 files are exact or near-duplicate copies identified by the read-only scan
in `paper/corpus_duplicate_clusters.json` (36 clusters, one file per cluster kept
in `Vector_Library/`, the rest moved here on 2026-09-25). Nothing was deleted —
each file here is still a byte-for-byte copy of a file that remains in
`Vector_Library/`.

They were moved out of `Vector_Library/` so a future `ingest.py` run will not
embed the same passage twice. As of this move, the FAISS index has **not** been
rebuilt, so the deployed system and every eval number reported in
`paper/COMPASS_paper_draft.tex` still reflect the original, un-deduplicated
1,046-file corpus.

To restore a file, move it back to the matching relative path under
`Vector_Library/`. To finish the cleanup, rebuild the index
(`python ingest.py` in `compass-app/backend/`) and re-run the evaluation suite —
see `paper/corpus_duplicate_clusters.json` for the full cluster list.
