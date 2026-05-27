#!/bin/bash
# Run this from inside your COMPASS_OUDSUMMER26 repo root
# It moves all loose PDFs into their correct T1-T10 folders

echo "Organizing COMPASS_OUDSUMMER26 documents..."

# T1: OUD Medications & Treatment
mv "UpdatesTennCareBuprenorphinePriorAuthorizationCriteriaMemo.pdf" "T1:OUD_med&treat/" 2>/dev/null && echo "✓ T1 ← UpdatesTennCareBuprenorphinePriorAuthorizationCriteriaMemo.pdf"
mv "oaem-10-009.pdf" "T1:OUD_med&treat/" 2>/dev/null && echo "✓ T1 ← oaem-10-009.pdf"

# T2: Clinical Practice Guidelines
mv "ChronicPainGuidelines.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← ChronicPainGuidelines.pdf"
mv "TN Together Outpatient Opioid Prescribing Flow Chart.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← TN Together Outpatient Opioid Prescribing Flow Chart.pdf"
mv "TN-Together-FAQs-2019.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← TN-Together-FAQs-2019.pdf"
mv "nihms-774547.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← nihms-774547.pdf (CDC opioid prescribing guideline - Frieden & Houry)"
mv "11606_2009_Article_981.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← 11606_2009_Article_981.pdf (PEG pain scale)"
mv "11606_2010_Article_1452.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← 11606_2010_Article_1452.pdf (Update in pain medicine)"
mv "nihms912909.pdf" "T2:Clinical_pract_guide/" 2>/dev/null && echo "✓ T2 ← nihms912909.pdf (Pain as 5th vital sign)"

# T3: Tennessee OUD Data & Surveillance
mv "OpioidWebsite.pdf" "T3:TN_OUD_data&surv/" 2>/dev/null && echo "✓ T3 ← OpioidWebsite.pdf (TN Comptroller opioid prescribing patterns)"
mv "2024-N-SUMHSS-Companion-Report.pdf" "T3:TN_OUD_data&surv/" 2>/dev/null && echo "✓ T3 ← 2024-N-SUMHSS-Companion-Report.pdf"
mv "2024-nsumhss-annual-report.pdf" "T3:TN_OUD_data&surv/" 2>/dev/null && echo "✓ T3 ← 2024-nsumhss-annual-report.pdf"
mv "13011_2020_Article_308.pdf" "T3:TN_OUD_data&surv/" 2>/dev/null && echo "✓ T3 ← 13011_2020_Article_308.pdf (Opioid overdose death trends)"
mv "jmla-109-1-120.pdf" "T3:TN_OUD_data&surv/" 2>/dev/null && echo "✓ T3 ← jmla-109-1-120.pdf (Consumer health info East Tennessee)"

# T5: Neuroscience of Opioid Dependence
mv "41398_2019_Article_625.pdf" "T5:How_Opioid_Dependance_Works/" 2>/dev/null && echo "✓ T5 ← 41398_2019_Article_625.pdf (Fentanyl - pharmacology & mechanisms)"
mv "nihms-1561241.pdf" "T5:How_Opioid_Dependance_Works/" 2>/dev/null && echo "✓ T5 ← nihms-1561241.pdf (Long-term opioid therapy predictors)"

# T6: Co-occurring Mental Health Conditions
mv "11606_2016_Article_3703.pdf" "T6:Co-occuring_mental_health_con/" 2>/dev/null && echo "✓ T6 ← 11606_2016_Article_3703.pdf (PC-PTSD-5 screening)"
mv "nihms-1761361.pdf" "T6:Co-occuring_mental_health_con/" 2>/dev/null && echo "✓ T6 ← nihms-1761361.pdf (Social & behavioral contributions to overdose)"

# T7: Health Equity & Access Gaps
mv "IJMA-8-89.pdf" "T7:Health_equity_&_access_gaps_in/" 2>/dev/null && echo "✓ T7 ← IJMA-8-89.pdf (OUD social determinants & epidemiology)"
mv "nihms-992698.pdf" "T7:Health_equity_&_access_gaps_in/" 2>/dev/null && echo "✓ T7 ← nihms-992698.pdf (Age impact on opioid prescribing & overdose)"

# T9: Policy & Law
mv "OAC_Remediation_List_Revised_10-10-22.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← OAC_Remediation_List_Revised_10-10-22.pdf (TN Opioid Abatement Council)"
mv "TAFT XV 2025 Tribal Opioid Abatement Report.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← TAFT XV 2025 Tribal Opioid Abatement Report.pdf"
mv "purduesackler-settlement.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← purduesackler-settlement.pdf (Purdue/Sackler settlement)"
mv "nihms-1625653.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← nihms-1625653.pdf (Drug company liability)"
mv "main.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← main.pdf (State PDMPs & naloxone laws)"
mv "nihms854100.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← nihms854100.pdf (Medicare Schedule II opioid prescribers)"
mv "40621_2017_Article_118.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← 40621_2017_Article_118.pdf (Risk markers for prescription drug overdose)"
mv "jmcp.2020.26.12.1597.pdf" "T9:Policy_&_Law/" 2>/dev/null && echo "✓ T9 ← jmcp.2020.26.12.1597.pdf (Genetic factors in opioid safety)"

echo ""
echo "Done! Check each folder — then run: git add . && git commit -m 'Organize PDFs into topic folders' && git push"
