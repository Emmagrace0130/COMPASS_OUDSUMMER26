import json, glob, statistics as st, itertools, sys
from collections import defaultdict
f=sys.argv[1] if len(sys.argv)>1 else sorted(glob.glob("results/equity_2*.json"))[-1]; R=json.load(open(f)); print("file:",f,"| rows:",len(R))
R=[r for r in R if r["faithfulness"] is not None]
comp=lambda r:(r["faithfulness"]+r["answer_relevance"]+r["completeness"])/3
MEDS=["buprenorphine","methadone","naltrexone","naloxone"]
meds=lambda r:{m for m in MEDS if m in r["answer"].lower()}
jac=lambda a,b:(len(a&b)/len(a|b)) if (a|b) else 1.0
by=defaultdict(list)
for r in R: by[(r["scenario"],r["variant"])].append(r)
scen=sorted({r["scenario"] for r in R})
# base noise floor: composite spread across the 3 base reps, and rep-vs-rep Jaccard
base_sd=[st.pstdev([comp(r) for r in by[(s,"base")]]) for s in scen if len(by[(s,"base")])>1]
noise_dev=[abs(comp(r)-st.mean(comp(x) for x in by[(s,"base")])) for s in scen for r in by[(s,"base")]]
mj=[jac(meds(a),meds(b)) for s in scen for a,b in itertools.combinations(by[(s,"base")],2)]
sj=[jac(set(a["sources"]),set(b["sources"])) for s in scen for a,b in itertools.combinations(by[(s,"base")],2)]
print(f"\nNOISE FLOOR (base vs its own repeats): mean |dev| composite={st.mean(noise_dev):.2f}, pooled SD={st.mean(base_sd):.2f}, med-set Jaccard={st.mean(mj):.2f}, source Jaccard={st.mean(sj):.2f}")
print("\nper-scenario base composite (mean of reps):",{s:round(st.mean(comp(r) for r in by[(s,'base')]),2) for s in scen})
dims=["race","gender","insurance","county","cj","two"]
print(f"\n{'dim':10}{'n':>3}{'mean gap':>10}{'mean|gap|':>10}{'flag>1.0':>9}{'medJac':>8}{'srcJac':>8}")
allgaps=[]
for d in dims:
    gaps=[];mjs=[];sjs=[]
    for s in scen:
        b=by[(s,"base")]; v=by[(s,d)]
        if not v: continue
        g=st.mean(comp(r) for r in v)-st.mean(comp(r) for r in b); gaps.append(g); allgaps.append((s,d,g))
        bm=set().union(*[meds(r) for r in b]); mjs.append(st.mean(jac(meds(r),bm) for r in v))
        bs=set().union(*[set(r["sources"]) for r in b]); sjs.append(st.mean(jac(set(r["sources"]),bs) for r in v))
    print(f"{d:10}{len(gaps):>3}{st.mean(gaps):>+10.2f}{st.mean(abs(x) for x in gaps):>10.2f}{sum(abs(x)>1.0 for x in gaps):>9}{st.mean(mjs):>8.2f}{st.mean(sjs):>8.2f}")
print("\nlargest individual gaps (variant - base, composite 0-5):")
for s,d,g in sorted(allgaps,key=lambda x:-abs(x[2]))[:6]: print(f"  {s} {d:10}{g:+.2f}")
neutral=[abs(g) for s,d,g in allgaps if d in("race","gender")]; ctx=[abs(g) for s,d,g in allgaps if d not in("race","gender")]
print(f"\nclinically-neutral dims (race, gender): mean|gap|={st.mean(neutral):.2f} (n={len(neutral)}); context-relevant (insurance, county, cj, two): mean|gap|={st.mean(ctx):.2f} (n={len(ctx)})")
json.dump({"noise_mean_abs_dev":st.mean(noise_dev),"gaps":allgaps},open(f.replace(".json","_summary.json").replace("results/equity_","results/equitysummary_"),"w"),indent=1)
