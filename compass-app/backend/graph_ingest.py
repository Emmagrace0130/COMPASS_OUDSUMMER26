"""
COMPASS Concept Map — Neo4j population script.
Run inside the backend container after Neo4j is healthy:
  docker exec compass-backend python graph_ingest.py
"""
import os, time
from neo4j import GraphDatabase

NEO4J_URI  = os.getenv("NEO4J_URI",      "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD", "compass4OUD")


def wait_for_neo4j(driver, retries=20):
    for i in range(retries):
        try:
            with driver.session() as s:
                s.run("RETURN 1")
            print("Neo4j ready.")
            return
        except Exception:
            print(f"Waiting for Neo4j… ({i+1}/{retries})")
            time.sleep(3)
    raise RuntimeError("Neo4j did not become ready in time.")


def run(driver, cypher, **params):
    with driver.session() as s:
        s.run(cypher, **params)


def build_graph(driver):
    # ── Constraints & indexes ────────────────────────────────────────────────
    for label in ["Medication", "Guideline", "Population", "Condition",
                  "Location", "Policy", "Organization", "Symptom", "Treatment"]:
        run(driver, f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.name IS UNIQUE")

    # ── MEDICATIONS ──────────────────────────────────────────────────────────
    meds = [
        {"name": "Methadone",             "class": "Full opioid agonist", "schedule": "II",  "route": "Oral liquid",    "fda_approved": True,  "setting": "OTP only"},
        {"name": "Buprenorphine",         "class": "Partial opioid agonist","schedule": "III","route": "Sublingual film/tablet","fda_approved": True, "setting": "Office-based"},
        {"name": "Buprenorphine/Naloxone","class": "Partial opioid agonist","schedule": "III","route": "Sublingual film/tablet","fda_approved": True, "setting": "Office-based", "brand": "Suboxone"},
        {"name": "Naltrexone XR",         "class": "Opioid antagonist",    "schedule": None,  "route": "IM injection",  "fda_approved": True,  "setting": "Any", "brand": "Vivitrol"},
        {"name": "Naloxone",              "class": "Opioid antagonist",    "schedule": None,  "route": "IN/IM/IV",      "fda_approved": True,  "setting": "Any", "brand": "Narcan"},
        {"name": "Naltrexone oral",       "class": "Opioid antagonist",    "schedule": None,  "route": "Oral",          "fda_approved": True,  "setting": "Any"},
        {"name": "Clonidine",             "class": "Alpha-2 agonist",      "schedule": None,  "route": "Oral/patch",    "fda_approved": False, "setting": "Any", "note": "Off-label withdrawal management"},
        {"name": "Lofexidine",            "class": "Alpha-2 agonist",      "schedule": None,  "route": "Oral",          "fda_approved": True,  "setting": "Any", "note": "Withdrawal management"},
    ]
    for m in meds:
        run(driver, "MERGE (n:Medication {name: $name}) SET n += $props",
            name=m["name"], props={k: v for k, v in m.items() if k != "name" and v is not None})

    # ── CONDITIONS ───────────────────────────────────────────────────────────
    conditions = [
        {"name": "Opioid Use Disorder",         "dsm5": True,  "icd10": "F11.20"},
        {"name": "Opioid Withdrawal",            "dsm5": True,  "icd10": "F11.23"},
        {"name": "Opioid Overdose",              "dsm5": False, "icd10": "T40.0-T40.4"},
        {"name": "Alcohol Use Disorder",         "dsm5": True,  "icd10": "F10.20"},
        {"name": "Major Depressive Disorder",    "dsm5": True,  "icd10": "F32"},
        {"name": "Anxiety Disorder",             "dsm5": True,  "icd10": "F41"},
        {"name": "PTSD",                         "dsm5": True,  "icd10": "F43.1"},
        {"name": "Stimulant Use Disorder",       "dsm5": True,  "icd10": "F15.20"},
        {"name": "Benzodiazepine Use Disorder",  "dsm5": True,  "icd10": "F13.20"},
        {"name": "Neonatal Opioid Withdrawal",   "dsm5": False, "icd10": "P96.1"},
        {"name": "Hepatitis C",                  "dsm5": False, "icd10": "B18.2"},
        {"name": "HIV",                          "dsm5": False, "icd10": "B20"},
        {"name": "Chronic Pain",                 "dsm5": False, "icd10": "G89.29"},
        {"name": "QTc Prolongation",             "dsm5": False, "icd10": "R94.31"},
    ]
    for c in conditions:
        run(driver, "MERGE (n:Condition {name: $name}) SET n += $props",
            name=c["name"], props={k: v for k, v in c.items() if k != "name"})

    # ── POPULATIONS ──────────────────────────────────────────────────────────
    populations = [
        "Pregnant women", "Adolescents", "Older adults", "Rural patients",
        "Justice-involved", "Veterans", "Homeless", "Uninsured",
        "TennCare enrollees", "Native American", "Black patients",
        "Hispanic patients", "LGBTQ+", "Chronic pain patients",
        "Post-incarceration", "First responders",
    ]
    for p in populations:
        run(driver, "MERGE (n:Population {name: $name})", name=p)

    # ── GUIDELINES ───────────────────────────────────────────────────────────
    guidelines = [
        {"name": "ASAM National Practice Guideline 2020",    "org": "ASAM",    "year": 2020, "focus": "OUD treatment"},
        {"name": "ASAM National Practice Guideline 2015",    "org": "ASAM",    "year": 2015, "focus": "OUD treatment"},
        {"name": "CDC Opioid Prescribing CPG 2022",          "org": "CDC",     "year": 2022, "focus": "Opioid prescribing"},
        {"name": "CDC Opioid Prescribing CPG 2016",          "org": "CDC",     "year": 2016, "focus": "Opioid prescribing"},
        {"name": "SAMHSA TIP 63 MOUD 2021",                  "org": "SAMHSA",  "year": 2021, "focus": "MOUD"},
        {"name": "SAMHSA Federal OTP Guidelines 2024",       "org": "SAMHSA",  "year": 2024, "focus": "Methadone OTP"},
        {"name": "WHO Opioid Agonist Maintenance 2025",      "org": "WHO",     "year": 2025, "focus": "OAT globally"},
        {"name": "VA/DoD Opioids CPG 2022",                  "org": "VA/DoD",  "year": 2022, "focus": "OUD in veterans"},
        {"name": "TN Buprenorphine Guidelines 2023",         "org": "Tennessee","year": 2023,"focus": "TN-specific buprenorphine"},
        {"name": "TN Chronic Pain Guidelines 3rd Ed",        "org": "Tennessee","year": 2021,"focus": "Chronic pain prescribing"},
        {"name": "TN Controlled Substance Prescribing 2021", "org": "Tennessee","year": 2021,"focus": "TN prescribing rules"},
        {"name": "PCSS Buprenorphine Fentanyl Guidelines 2023","org":"PCSS",   "year": 2023,"focus": "Fentanyl-era induction"},
        {"name": "NICE CG52 Opioid Detox",                   "org": "NICE",    "year": 2007,"focus": "Opioid detox UK"},
        {"name": "USPSTF Drug Use Screening 2020",           "org": "USPSTF",  "year": 2020,"focus": "Screening"},
    ]
    for g in guidelines:
        run(driver, "MERGE (n:Guideline {name: $name}) SET n += $props",
            name=g["name"], props={k: v for k, v in g.items() if k != "name"})

    # ── LOCATIONS ────────────────────────────────────────────────────────────
    counties = [
        ("Knox", "urban", 478971),  ("Shelby", "urban", 929744),
        ("Davidson", "urban", 715884), ("Hamilton", "urban", 376935),
        ("Morgan", "rural Appalachian", 21700), ("Scott", "rural Appalachian", 21686),
        ("Hancock", "rural Appalachian", 6555), ("Unicoi", "rural Appalachian", 17547),
        ("Grundy", "rural", 12846), ("Cocke", "rural Appalachian", 35663),
    ]
    run(driver, "MERGE (n:Location {name: 'Tennessee'}) SET n.type='State', n.region='Southeast'")
    for county, ctype, pop in counties:
        run(driver, """
            MERGE (c:Location {name: $name})
            SET c.type='County', c.county_type=$ctype, c.population=$pop
            MERGE (tn:Location {name: 'Tennessee'})
            MERGE (c)-[:PART_OF]->(tn)
        """, name=f"{county} County", ctype=ctype, pop=pop)

    # ── ORGANIZATIONS ────────────────────────────────────────────────────────
    orgs = [
        {"name": "Cherokee Health Systems",     "type": "Treatment provider",   "location": "Knox County"},
        {"name": "ReVida Recovery Centers",     "type": "Treatment provider",   "location": "Tennessee"},
        {"name": "Cedar Recovery",              "type": "Treatment provider",   "location": "Tennessee"},
        {"name": "McNabb Center",               "type": "Treatment provider",   "location": "Knox County"},
        {"name": "River Valley Behavioral Health","type":"Treatment provider",  "location": "Tennessee"},
        {"name": "TDH",                         "type": "State agency",         "location": "Tennessee"},
        {"name": "SAMHSA",                      "type": "Federal agency",       "location": "National"},
        {"name": "ASAM",                        "type": "Medical society",      "location": "National"},
        {"name": "CDC",                         "type": "Federal agency",       "location": "National"},
        {"name": "DEA",                         "type": "Federal agency",       "location": "National"},
        {"name": "CMS",                         "type": "Federal agency",       "location": "National"},
        {"name": "UTK Applied Systems Lab",     "type": "Research institution", "location": "Knox County"},
    ]
    for o in orgs:
        run(driver, "MERGE (n:Organization {name: $name}) SET n += $props",
            name=o["name"], props={k: v for k, v in o.items() if k != "name"})

    # ── POLICIES ─────────────────────────────────────────────────────────────
    policies = [
        {"name": "DATA Act 2000",                   "level": "Federal", "year": 2000, "note": "Authorized office-based buprenorphine"},
        {"name": "X-Waiver Elimination 2023",       "level": "Federal", "year": 2023, "note": "Any DEA-licensed prescriber can now prescribe buprenorphine"},
        {"name": "Ryan Haight Act",                 "level": "Federal", "year": 2008, "note": "In-person evaluation required for controlled substance telehealth"},
        {"name": "TennCare MAT Coverage",           "level": "State",   "note": "Tennessee Medicaid coverage for MOUD"},
        {"name": "TN Opioid Abatement Fund",        "level": "State",   "year": 2022, "note": "Settlement funds from Purdue/opioid manufacturers"},
        {"name": "TN Together Initiative",          "level": "State",   "year": 2018, "note": "Comprehensive TN opioid response plan"},
        {"name": "TN Syringe Exchange Law",         "level": "State",   "note": "Limited legal authority for needle/syringe programs in TN"},
        {"name": "TN Prescriber Limits",            "level": "State",   "note": "NP/PA max 16mg/day BUP; MD max 20mg/day"},
        {"name": "Opioid Treatment Program Regs",   "level": "Federal", "note": "42 CFR Part 8 governs methadone OTPs"},
        {"name": "Good Samaritan Law TN",           "level": "State",   "note": "Limited overdose immunity in Tennessee"},
    ]
    for p in policies:
        run(driver, "MERGE (n:Policy {name: $name}) SET n += $props",
            name=p["name"], props={k: v for k, v in p.items() if k != "name"})

    # ── TREATMENTS ───────────────────────────────────────────────────────────
    treatments = [
        {"name": "Medication Assisted Treatment",  "abbrev": "MAT"},
        {"name": "Contingency Management",         "abbrev": "CM",  "evidence": "Strong RCT evidence"},
        {"name": "Cognitive Behavioral Therapy",   "abbrev": "CBT", "evidence": "Strong evidence"},
        {"name": "Motivational Interviewing",      "abbrev": "MI",  "evidence": "Moderate evidence"},
        {"name": "12-Step Facilitation",           "abbrev": "TSF"},
        {"name": "Peer Recovery Support",          "abbrev": "PRS"},
        {"name": "Opioid Treatment Program",       "abbrev": "OTP", "note": "Federally certified methadone clinic"},
        {"name": "Residential Treatment",          "abbrev": "RES"},
        {"name": "Intensive Outpatient",           "abbrev": "IOP"},
        {"name": "MOUD",                           "note": "Medications for Opioid Use Disorder"},
        {"name": "Low-Dose Induction (Bernese)",   "note": "Micro-dosing buprenorphine induction protocol"},
        {"name": "Standard Induction",             "note": "Requires COWS >6-8 before first BUP dose"},
        {"name": "Home Induction",                 "note": "Patient self-administers first dose with remote support"},
        {"name": "Harm Reduction",                 "note": "Naloxone distribution, syringe programs, fentanyl strips"},
    ]
    for t in treatments:
        run(driver, "MERGE (n:Treatment {name: $name}) SET n += $props",
            name=t["name"], props={k: v for k, v in t.items() if k != "name"})

    # ── RELATIONSHIPS ────────────────────────────────────────────────────────
    print("Building relationships…")

    # Medications → Conditions (TREATS)
    treats = [
        ("Methadone",             "Opioid Use Disorder",       {"first_line": True,  "evidence": "Strong"}),
        ("Methadone",             "Opioid Withdrawal",         {"first_line": True}),
        ("Buprenorphine",         "Opioid Use Disorder",       {"first_line": True,  "evidence": "Strong"}),
        ("Buprenorphine",         "Opioid Withdrawal",         {"first_line": True}),
        ("Buprenorphine/Naloxone","Opioid Use Disorder",       {"first_line": True,  "evidence": "Strong", "preferred_formulation": True}),
        ("Naltrexone XR",         "Opioid Use Disorder",       {"first_line": True,  "evidence": "Moderate", "barrier": "Requires 7-10 day abstinence"}),
        ("Naloxone",              "Opioid Overdose",           {"first_line": True,  "reverses_overdose": True}),
        ("Lofexidine",            "Opioid Withdrawal",         {"first_line": False, "note": "Non-opioid withdrawal management"}),
        ("Clonidine",             "Opioid Withdrawal",         {"first_line": False, "off_label": True}),
        ("Methadone",             "Chronic Pain",              {"note": "Off-label but common"}),
        ("Buprenorphine",         "Chronic Pain",              {"note": "Belbuca formulation approved for pain"}),
    ]
    for med, cond, props in treats:
        run(driver, """
            MATCH (m:Medication {name:$med}), (c:Condition {name:$cond})
            MERGE (m)-[r:TREATS]->(c) SET r += $props
        """, med=med, cond=cond, props=props)

    # Medications → Conditions (CONTRAINDICATED_FOR)
    contras = [
        ("Methadone",     "QTc Prolongation",  "Absolute if QTc >500ms; relative 450-500ms"),
        ("Naltrexone XR", "Opioid Use Disorder","Must be opioid-free 7-10 days; will precipitate withdrawal"),
        ("Naltrexone oral","Opioid Use Disorder","Daily adherence barrier limits effectiveness"),
    ]
    for med, cond, note in contras:
        run(driver, """
            MATCH (m:Medication {name:$med}), (c:Condition {name:$cond})
            MERGE (m)-[r:CONTRAINDICATED_FOR]->(c) SET r.note=$note
        """, med=med, cond=cond, note=note)

    # Medications → Populations (RECOMMENDED_FOR / CAUTION_WITH)
    med_pop = [
        ("Buprenorphine",          "Pregnant women",     "RECOMMENDED_FOR", "Preferred MOUD in pregnancy; reduces neonatal risk vs untreated OUD"),
        ("Methadone",              "Pregnant women",     "RECOMMENDED_FOR", "Established safety record in pregnancy; requires OTP"),
        ("Naltrexone XR",          "Pregnant women",     "CAUTION_WITH",    "Limited data; not generally recommended in pregnancy"),
        ("Buprenorphine/Naloxone", "Pregnant women",     "CAUTION_WITH",    "Monoproduct preferred in pregnancy; newer data questions this"),
        ("Methadone",              "Older adults",       "CAUTION_WITH",    "QTc risk, polypharmacy, falls"),
        ("Buprenorphine",          "Adolescents",        "RECOMMENDED_FOR", "FDA approved age 16+; off-label younger"),
        ("Buprenorphine",          "Justice-involved",   "RECOMMENDED_FOR", "Strong retention evidence in criminal justice settings"),
        ("Naltrexone XR",          "Justice-involved",   "RECOMMENDED_FOR", "Used widely in pre-release and reentry programs"),
        ("Buprenorphine",          "Rural patients",     "RECOMMENDED_FOR", "Office-based; telehealth prescribing possible post-X-waiver"),
        ("Methadone",              "Rural patients",     "CAUTION_WITH",    "Requires daily OTP visit; access barrier in rural TN"),
    ]
    for med, pop, rel, note in med_pop:
        run(driver, f"""
            MATCH (m:Medication {{name:$med}}), (p:Population {{name:$pop}})
            MERGE (m)-[r:{rel}]->(p) SET r.note=$note
        """, med=med, pop=pop, note=note)

    # Guidelines → Medications (RECOMMENDS)
    guideline_meds = [
        ("ASAM National Practice Guideline 2020", "Buprenorphine/Naloxone", {"tier": "First-line"}),
        ("ASAM National Practice Guideline 2020", "Methadone",              {"tier": "First-line"}),
        ("ASAM National Practice Guideline 2020", "Naltrexone XR",          {"tier": "First-line"}),
        ("SAMHSA TIP 63 MOUD 2021",               "Buprenorphine",          {"tier": "First-line"}),
        ("SAMHSA TIP 63 MOUD 2021",               "Methadone",              {"tier": "First-line"}),
        ("SAMHSA TIP 63 MOUD 2021",               "Naltrexone XR",          {"tier": "First-line"}),
        ("TN Buprenorphine Guidelines 2023",      "Buprenorphine/Naloxone", {"tier": "First-line", "tn_specific": True}),
        ("VA/DoD Opioids CPG 2022",               "Buprenorphine/Naloxone", {"tier": "First-line", "population": "Veterans"}),
        ("VA/DoD Opioids CPG 2022",               "Naltrexone XR",          {"tier": "First-line", "population": "Veterans"}),
        ("CDC Opioid Prescribing CPG 2022",       "Naloxone",               {"note": "Co-prescribe with opioids when risk factors present"}),
    ]
    for g, m, props in guideline_meds:
        run(driver, """
            MATCH (gl:Guideline {name:$g}), (med:Medication {name:$m})
            MERGE (gl)-[r:RECOMMENDS]->(med) SET r += $props
        """, g=g, m=m, props=props)

    # Treatments ↔ Medications
    run(driver, """
        MATCH (t:Treatment {name:'MOUD'}), (m:Medication) WHERE m.fda_approved=true AND m.name IN ['Methadone','Buprenorphine','Buprenorphine/Naloxone','Naltrexone XR']
        MERGE (t)-[:INCLUDES]->(m)
    """)
    run(driver, """
        MATCH (t:Treatment {name:'Opioid Treatment Program'}), (m:Medication {name:'Methadone'})
        MERGE (t)-[:REQUIRES]->(m)
    """)
    run(driver, """
        MATCH (t:Treatment {name:'Harm Reduction'}), (m:Medication {name:'Naloxone'})
        MERGE (t)-[:INCLUDES]->(m)
    """)

    # Policies → Medications / Treatments
    pol_rels = [
        ("X-Waiver Elimination 2023",   "Buprenorphine",              "ENABLES",   "Any DEA prescriber can now prescribe buprenorphine for OUD"),
        ("DATA Act 2000",               "Buprenorphine",              "ENABLED",   "Originally created X-waiver system"),
        ("Opioid Treatment Program Regs","Methadone",                  "RESTRICTS", "Methadone for OUD only dispensable at certified OTPs"),
        ("TN Prescriber Limits",        "Buprenorphine",              "RESTRICTS", "NP/PA 16mg; MD 20mg daily limit in Tennessee"),
        ("TennCare MAT Coverage",       "Medication Assisted Treatment","FUNDS",    "TennCare covers all three FDA-approved MOUD"),
        ("TN Opioid Abatement Fund",    "Harm Reduction",             "FUNDS",     "Portion allocated to harm reduction services"),
        ("TN Together Initiative",      "Opioid Treatment Program",   "SUPPORTS",  "State initiative to expand OTP access"),
    ]
    for pol, target, rel, note in pol_rels:
        for label in ["Medication", "Treatment"]:
            run(driver, f"""
                MATCH (p:Policy {{name:$pol}})
                OPTIONAL MATCH (t:{label} {{name:$target}})
                WITH p, t WHERE t IS NOT NULL
                MERGE (p)-[r:{rel}]->(t) SET r.note=$note
            """, pol=pol, target=target, note=note)

    # Organizations → Locations (OPERATES_IN)
    org_locs = [
        ("Cherokee Health Systems", "Knox County"),
        ("McNabb Center",           "Knox County"),
        ("ReVida Recovery Centers", "Tennessee"),
        ("Cedar Recovery",          "Tennessee"),
        ("TDH",                     "Tennessee"),
        ("UTK Applied Systems Lab", "Knox County"),
    ]
    for org, loc in org_locs:
        run(driver, """
            MATCH (o:Organization {name:$org}), (l:Location {name:$loc})
            MERGE (o)-[:OPERATES_IN]->(l)
        """, org=org, loc=loc)

    # Organizations → Guidelines (PUBLISHED)
    pub = [
        ("ASAM",    "ASAM National Practice Guideline 2020"),
        ("ASAM",    "ASAM National Practice Guideline 2015"),
        ("CDC",     "CDC Opioid Prescribing CPG 2022"),
        ("CDC",     "CDC Opioid Prescribing CPG 2016"),
        ("SAMHSA",  "SAMHSA TIP 63 MOUD 2021"),
        ("SAMHSA",  "SAMHSA Federal OTP Guidelines 2024"),
    ]
    for org, gl in pub:
        run(driver, """
            MATCH (o:Organization {name:$org}), (g:Guideline {name:$gl})
            MERGE (o)-[:PUBLISHED]->(g)
        """, org=org, gl=gl)

    # Co-occurring conditions
    cooccur = [
        ("Opioid Use Disorder", "Major Depressive Disorder", 0.40),
        ("Opioid Use Disorder", "Anxiety Disorder",          0.35),
        ("Opioid Use Disorder", "PTSD",                      0.30),
        ("Opioid Use Disorder", "Alcohol Use Disorder",      0.25),
        ("Opioid Use Disorder", "Hepatitis C",               0.50),
        ("Opioid Use Disorder", "HIV",                       0.08),
        ("Opioid Use Disorder", "Stimulant Use Disorder",    0.30),
        ("Opioid Use Disorder", "Chronic Pain",              0.40),
    ]
    for c1, c2, prev in cooccur:
        run(driver, """
            MATCH (a:Condition {name:$c1}), (b:Condition {name:$c2})
            MERGE (a)-[r:CO_OCCURS_WITH]->(b) SET r.prevalence=$prev
        """, c1=c1, c2=c2, prev=prev)

    # High-overdose counties connected to TN
    high_od = ["Grundy County","Unicoi County","Hancock County","Cocke County","Morgan County"]
    for county in high_od:
        run(driver, """
            MATCH (c:Location {name:$county})
            SET c.high_overdose = true
        """, county=county)

    print("✅ Concept map built successfully.")
    print("   Run MATCH (n) RETURN count(n) to verify node count.")


if __name__ == "__main__":
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    wait_for_neo4j(driver)
    build_graph(driver)
    driver.close()
