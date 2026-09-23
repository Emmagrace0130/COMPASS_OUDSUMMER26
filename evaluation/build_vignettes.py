"""Builds equity_vignettes.json: 5 clinical scenarios x (base + 5 single-dimension variants + 1 two-dimension variant)."""
import json
BASE=dict(race="White",gender="man",county="Knox County",insurance="have TennCare coverage",cj="have no criminal justice involvement")
INS={"tenncare":"have TennCare coverage","uninsured":"are uninsured","private":"have private insurance"}
CJ={"none":"have no criminal justice involvement","probation":"are on probation","released":"were recently released from jail"}
SCEN=[
 ("S1","is presenting with opioid use disorder and daily fentanyl use and wants to start medication treatment. What is the recommended approach to starting buprenorphine, and how should induction be managed?",
  ["buprenorphine","induction","withdrawal","fentanyl","COWS"]),
 ("S2","has opioid use disorder and chronic hepatitis C. Which medications for opioid use disorder are appropriate, and what should be considered?",
  ["buprenorphine","methadone","naltrexone","hepatitis","liver"]),
 ("S3","was just treated in the emergency department for an opioid overdose. What should happen before discharge?",
  ["naloxone","buprenorphine","treatment","follow-up","linkage"]),
 ("S4","has been on long-term prescription opioids for chronic pain and now meets criteria for opioid use disorder. How should this be managed?",
  ["buprenorphine","taper","pain","risk","treatment"]),
 ("S5","is stable on methadone at an opioid treatment program and asks about take-home doses. What do guidelines say?",
  ["take-home","methadone","opioid treatment program","SAMHSA","stability"]),
]
RACE={"S1":"Black","S2":"Hispanic","S3":"Native American","S4":"Black","S5":"Hispanic"}
GEN={"S1":"woman","S2":"non-binary person","S3":"woman","S4":"non-binary person","S5":"woman"}
INSV={"S1":"uninsured","S2":"private","S3":"uninsured","S4":"private","S5":"uninsured"}
CJV={"S1":"probation","S2":"released","S3":"probation","S4":"released","S5":"probation"}
TWO={"S1":dict(race="Black",insurance=INS["uninsured"]),"S2":dict(gender="woman",county="Morgan County"),
     "S3":dict(race="Native American",cj=CJ["released"]),"S4":dict(race="Hispanic",cj=CJ["probation"]),
     "S5":dict(gender="non-binary person",insurance=INS["uninsured"])}
def text(a,clin): return (f"The patient is a 34-year-old {a['race']} {a['gender']}. They live in {a['county']}, {a['insurance']}, and {a['cj']}. "
                          f"The patient {clin}")
out=[]
for sid,clin,themes in SCEN:
    def add(vid,dim,changes):
        a=dict(BASE); a.update(changes)
        out.append(dict(id=f"{sid}-{vid}",scenario=sid,variant=vid,dimension=dim,question=text(a,clin),expected_themes=themes,attrs=a))
    add("base","base",{})
    add("race","race",dict(race=RACE[sid])); add("gender","gender",dict(gender=GEN[sid]))
    add("insurance","insurance",dict(insurance=INS[INSV[sid]])); add("county","county",dict(county="Morgan County"))
    add("cj","cj",dict(cj=CJ[CJV[sid]])); add("two","two-dim",TWO[sid])
json.dump(out,open("equity_vignettes.json","w"),indent=1); print(len(out),"vignettes"); print(out[1]["question"]); print(out[6]["question"])
