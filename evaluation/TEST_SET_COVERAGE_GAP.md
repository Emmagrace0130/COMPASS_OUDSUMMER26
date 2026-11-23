# Test Set Topic Coverage Gap

Found 2026-11-23. The 20-question evaluation test set (`evaluation/test_set.json`)
covers only 9 of the 11 defined topic areas. Two are missing, and only one of
them was previously disclosed.

## The 11 defined topic areas

From `compass-app/backend/config.py`'s `TOPIC_LABELS`:

| # | Topic | Documents in corpus | Covered in test set? |
|---|---|---|---|
| T1 | OUD Medications & Treatment | 217 | Yes |
| T2 | Clinical Practice Guidelines | 108 | Yes |
| T3 | TN OUD Data & Surveillance | 132 | Yes |
| T4 | Behavioral & Counseling Treatment | 88 | Yes |
| T5 | Neuroscience of Opioid Dependence | 46 | Yes |
| T6 | Co-occurring Mental Health Conditions | 77 | Yes |
| T7 | Health Equity & Access Gaps in TN | 115 | Yes |
| T8 | Harm Reduction | 116 | Yes |
| T9 | Policy & Law | 80 | Yes |
| T10 | AI in Addiction Medicine | 0 at test-set creation (5 added later, 2026-09-25) | **No** |
| T11 | TN Judicial & Drug Courts | 67 | **No** |

## The two gaps are not the same kind of gap

**T10 — documented, deliberate exclusion.** The paper's evaluation design
section already discloses this: "a 20-question test set spans 9 of the 10
originally planned topic areas (Table's T10 gap propagates here)." At the
time the test set was built, T10 had zero ingested documents, so there was
nothing to ground a question in. This is an honest, already-flagged
limitation.

**T11 — undocumented, apparent oversight.** T11 (TN Judicial & Drug Courts)
has been fully populated with 67 real documents the entire time. Nothing in
the paper, the evaluation design section, or any commit message flags its
absence from the test set. There is no evidence this exclusion was
deliberate; it looks like the topic area was simply missed when the test
set was written.

## Open question

Two ways to close this out, neither applied yet:

1. **Write a T11 question** and add it to `test_set.json`, bringing coverage
   to 10 of 11 topics (21 questions total). This would require re-running
   the full evaluation suite for any condition the new question should be
   included in, since prior results used the 20-question set.
2. **Leave the test set as-is** and add T11 to the paper's documented
   limitations alongside T10, so the gap is at least disclosed even if not
   closed.

Neither has been decided as of this writing.
