# P1 HIGH — 14 itemi format upgrade + integrare critică

**Sprint propus**: Sprint Format Upgrade P1 (3 săptămâni)
**Estimare ore**: ~95-130h
**Teste noi propuse**: +110
**Total cumulativ post-P0+P1**: ~2964 → ~3074 PASS
**Trigger lansare**: după P0 sau în paralel cu săptămânile 3-4 P0 (P1 nu are dependențe rigide P0 cu excepția P1-01).

---

## P1-01 — Format dual DOCX + PDF/A-3 pentru CPE (oficial)

**Status curent**: ⚠️ doar DOCX prin `api/generate-document.py?type=cpe`
**Cale fișier afectat**: `api/generate-document.py` (extinde return), `src/steps/Step6Certificate.jsx:942` (handler)
**Problemă**: MDLPA acceptă oficial DOCX semnat, dar pentru arhivare 10 ani (clase A-D) avem nevoie de PDF/A-3 paralel. UE preferă PDF/A pentru interoperabilitate.

**Bază legală**: Art. 17 EPBD 2024/1275 + ISO 19005-3 + Mc 001-2022 §10.

**Diff abstract**:
- În `generate-document.py` adaugă param body `outputFormat: "docx" | "pdf-a3" | "both"` (default "both"). Când "pdf-a3" sau "both", convertește DOCX → PDF cu LibreOffice headless (deja în Vercel Python runtime via apt-get) → pikepdf PDF/A-3.
- Răspunsul: dacă "both", returnează ZIP cu .docx + .pdf; altfel format simplu.
- Step6Certificate.jsx Card export adaugă select "Format: DOCX / PDF/A-3 / Ambele" + procesare răspuns ZIP.

**Test plan** (+12 teste): roundtrip DOCX→PDF/A-3, ZIP structure, validare metadata, hash determinist.

**Estimare ore**: 12-16h (depinde de P0-01 PDF/A-3 infrastructure).

---

## P1-02 — Format dual DOCX + PDF/A-3 pentru RAE

**Status curent**: ⚠️ doar DOCX prin `api/generate-document.py?type=audit`
**Cale fișier afectat**: `api/generate-document.py` `_handle_audit_report`, `src/steps/Step7Audit.jsx:448`
**Problemă**: RAE = 9 capitole + Cap. 0 + figuri (CostOptimal curve, EP trajectory). Volumul ~30-50 pagini DOCX trebuie arhivabil PDF/A-3.

**Diff abstract**: Identic cu P1-01 dar pentru endpoint audit. Adaugă conversie LibreOffice → pikepdf cu OutputIntent + embed fonts pentru toate figurile SVG → raster PNG.

**Test plan** (+10 teste): integration cu 9 capitole, figuri prezente, fonturi diacritice.

**Estimare ore**: 10-14h.

---

## P1-03 — XML portal MDLPA pentru Anexa MDLPA

**Status curent**: ❌ avem AnexaMDLPAFields.jsx + DOCX, dar NU XML portal
**Cale fișier afectat**: `src/lib/anexa-mdlpa-xml.js` (NOU), `src/components/AnexaMDLPAFields.jsx`
**Problemă**: Portal electronic MDLPA (operațional 8.VII.2026 conform Art. 4 Ord. 348/2026) acceptă XML structurat conform schema oficială MDLPA. DOCX-ul scanat nu va fi acceptat post-portal-launch.

**Bază legală**: Art. 4 alin. 6 Ord. 348/2026 + portal MDLPA roadmap 8.VII.2026.

**Diff abstract**:
- Modul nou `anexa-mdlpa-xml.js` cu `generateAnexaMdlpaXml({building, instSummary, auditor, cpeCode, scopCpe, ...})` — produce XML structurat 35 câmpuri Anexa MDLPA + namespace mdlpa.gov.ro/schemas/anexa-cpe/2026.
- Helper `validateAnexaMdlpaXml(xml)` cu AJV/XSD validation (când publică schema oficială).
- Buton nou în AnexaMDLPAFields.jsx "Export XML portal MDLPA" + auto-validare pre-export.

**Test plan** (+8 teste): generate cu date complete + incomplete, namespace + structure validation, AJV roundtrip.

**Estimare ore**: 10-14h (8h fără validare oficială, +4-6h post-publicare schema).

---

## P1-04 — Curba cost-optim — export PDF + XLSX sensibilitate

**Status curent**: ⚠️ doar UI grafic în CostOptimalCurve.jsx, fără export structurat
**Cale fișier afectat**: `src/components/CostOptimalCurve.jsx`, `src/lib/cost-optimal-export.js` (NOU)
**Problemă**: Conform Reg. UE 244/2012 + Comm. Reg. 2014/1051, curba cost-optim e document oficial pentru autorizare DTAC. Trebuie exportabil ca PDF (pentru anexa autorizație) + XLSX (pentru analiză sensibilitate beneficiar finanțare).

**Bază legală**: Reg. UE 244/2012 + Reg. UE 2014/1051.

**Diff abstract**:
- Modul nou `cost-optimal-export.js` cu:
  - `exportCostOptimalPdf(packages, scenarios)` — A4 PDF cu grafic SVG2PDF + tabel pachete + analiză sensibilitate per scenariu (low/expected/high) + perspective EN 15459-1 (financiar/macro/social)
  - `exportCostOptimalXlsx(packages, scenarios)` — XLSX cu 3 tab-uri (Pachete / Sensibilitate / Grafice ChartJS embed prin exceljs)
- 2 butoane noi în CostOptimalCurve.jsx ("📄 PDF cost-optim" + "📊 XLSX sensibilitate")

**Test plan** (+10 teste): PDF structure, XLSX 3 sheets, hash determinist, integrare cu rehab-scenarios.

**Estimare ore**: 10-12h.

---

## P1-05 — AFM Casa Eficientă — bundle template

**Status curent**: ❌ complet lipsă
**Cale fișier afectat**: `src/lib/funding-bundles.js` (NOU), `src/components/FundingBundlePanel.jsx` (NOU)
**Problemă**: AFM Casa Eficientă cere CPE max 6 luni + RAE + raport implementare cu fotografii. Fără template, auditorii pierd ~2 zile per dosar pentru reformatare. Volum estimat 2026: ~5.000-8.000 dosare RO.

**Bază legală**: Ghidul AFM Casa Eficientă 2026 + L.121/2014 (eficiență energetică).

**Diff abstract**:
- Modul nou `funding-bundles.js` cu helper generic `generateFundingBundle(programType, data)`:
  - `programType: "afm-casa-eficienta" | "afm-casa-verde-pv" | ...`
  - Per program: returnează ZIP cu structură agreată (ex AFM Casa Eficientă: `01_CPE_pre.pdf`, `02_RAE.pdf`, `03_Raport_implementare.docx`, `04_Foto_pre/`, `05_Foto_post/`, `06_Calcul_economii.xlsx`)
- Component nou `FundingBundlePanel.jsx` cu selector program + butoane export bundle pre-implementare / post-implementare.
- Pre-validare: verifică completitudine date înainte de export (ex: AFM cere foto pre-renovare obligatoriu).

**Test plan** (+12 teste): 4 AFM Casa Eficientă bundle, 4 validare completitudine, 4 ZIP structure.

**Estimare ore**: 14-18h (partea AFM; alte programe în P1-06+).

---

## P1-06 — POR/FEDR 2021-2027 bundle

**Status curent**: ❌
**Cale fișier afectat**: `funding-bundles.js` (extinde) + ghid utilizator
**Problemă**: POR/FEDR 2021-2027 axa 2 (eficiență energetică clădiri publice) cere audit + CPE pre/post + ACB Reg. UE 244/2012 + Plan investiții fazat. Volum estimat: ~1.500-2.500 dosare RO.

**Diff abstract**: Adaugă programType="por-fedr" cu structură ZIP: `01_Audit_RAE.pdf`, `02_CPE_pre.pdf`, `03_CPE_post.pdf`, `04_ACB_curba_cost_optim.pdf`, `05_Plan_investitii_fazat.docx`. Pre-fill cu date Step5 + Step7 + CostOptimalCurve.

**Test plan** (+8 teste): bundle structure + pre-fill + sensibilitate ACB.

**Estimare ore**: 8-10h.

---

## P1-07 — FTJ Tranziție Justă bundle (deadline 26.VIII.2026)

**Status curent**: ❌
**Cale fișier afectat**: `funding-bundles.js`
**Problemă**: Fond Tranziție Justă cu deadline ferm 26.VIII.2026 — ferestra de finanțare se închide. Auditori RO pierd oportunitate dacă nu au template gata.

**Diff abstract**: Adaugă programType="ftj-tranzitie-justa" cu bundle: audit + studiu fezabilitate energetică (template DOCX nou) + plan retrofit + analiză CO₂ pre/post + planning Just Transition (regiuni cărbune Hunedoara/Gorj/Mehedinți).

**Test plan** (+6 teste): bundle structure, regiuni FTJ filter, deadline countdown banner.

**Estimare ore**: 10-12h.

---

## P1-08 — Modernization Fund bundle

**Status curent**: ❌
**Cale fișier afectat**: `funding-bundles.js`
**Problemă**: Modernization Fund (UE 2021-2030) cu apeluri trimestriale; Q3 2026 e ușa următoare. Cere audit + plan investiții + reduceri CO₂ tCO₂eq calculate riguros.

**Diff abstract**: Adaugă programType="modernization-fund" cu bundle: audit + plan investiții 2026-2030 + calcul reduceri CO₂ (extends GWPReport.jsx) + plan M&V IPMVP Op. C (există deja). Filter doar 7 sectoare eligibile.

**Test plan** (+6 teste): bundle structure + CO₂ calc + M&V integration.

**Estimare ore**: 8-10h.

---

## P1-09 — UAT cofinanțare blocuri bundle

**Status curent**: ❌
**Cale fișier afectat**: `funding-bundles.js`, integrare ApartmentListEditor
**Problemă**: Programul național cofinanțare reabilitare blocuri (~700 milioane RON 2026 prin UAT-uri) cere audit bloc întreg + acord proprietari + plan financiar 50% UAT / 50% asociație. Auditori pierd ~3 zile per bloc pentru integrare.

**Diff abstract**: Adaugă programType="uat-cofinantare-bloc" cu bundle: audit RC integral + Anexa 2 multi-apartament (există) + acord scris proprietari (P0-09) + plan financiar template + buget aproximativ pe categorii intervenție.

**Test plan** (+8 teste): bundle structure, integrare RC, plan financiar, validare acord prezent.

**Estimare ore**: 12-14h.

---

## P1-10 — AFM Casa Verde Fotovoltaice — ghid Zephren

**Status curent**: ⚠️ Step 4 are calc PV, dar nu ghid + bundle
**Cale fișier afectat**: `src/components/AFMCasaVerdePanel.jsx` (NOU), `funding-bundles.js`
**Problemă**: AFM Casa Verde NU cere CPE/audit, dar cere documentație tehnică PV + plan instalare + estimare producție. Mulți clienți confunda cu Casa Eficientă; ghid clar previne lossuri.

**Diff abstract**: Component informativ nou `AFMCasaVerdePanel.jsx` în Step 4 cu: explicație diferență vs Casa Eficientă, pre-fill din Step4Renewables PV calc, bundle ZIP cu ghid + estimare producție + diagrama instalare.

**Test plan** (+5 teste): UI panel, pre-fill PV, bundle structure.

**Estimare ore**: 6-8h.

---

## P1-11 — Studiu sisteme alternative (construcție nouă)

**Status curent**: ⚠️ parțial via Step4Renewables, fără document distinct
**Cale fișier afectat**: `src/lib/alternative-systems-pdf.js` (NOU)
**Problemă**: Conform Mc 001-2022 §11 + Art. 9 EPBD 2024/1275, pentru construcții noi ≥50 m² e obligatoriu studiu sisteme alternative (HP / PV / solar termic / district heating / ...). Document distinct A4 PDF.

**Diff abstract**: Modul nou cu `generateAlternativeSystemsStudyPdf({building, climate, renew, scenarios})` — produce A4 PDF cu: 6 alternative analizate (HP geo / aer-aer / aer-apă / PV+battery / solar termic / DH proximitate), TIR + LCC per alt, recomandare auditor + decizie tehnico-economică.

**Test plan** (+8 teste): 6 alternative comparate, calc TIR, integrare Step4 data.

**Estimare ore**: 10-14h.

---

## P1-12 — Studiu pre-cabling EV (Art. 14 §3/§4 EPBD)

**Status curent**: ⚠️ există calc EV în step1-validators, fără document distinct
**Cale fișier afectat**: `src/lib/ev-precabling-pdf.js` (NOU)
**Problemă**: Art. 14 alin. 3-4 EPBD 2024/1275 + L.238/2024: clădiri rezidențiale ≥3 unități / nerezidențiale ≥10 locuri parcare nou-construite OBLIGATORII pre-cabling EV (ducting + tablou pregătit). Document tehnic distinct.

**Diff abstract**: Modul nou cu `generateEvPrecablingPdf({building, parkingSlots, evPrecabledSlots, location})` — A4 PDF cu calcul cota pre-cabling + schemă tablou + ghid execuție + memoriu tehnic + cerințe minime (Art. 14 §3 = 1 priză / §4 = 50% locuri pregătite).

**Test plan** (+6 teste): residential vs non-residential thresholds, pre-cabling minim cota, schema tablou rendering.

**Estimare ore**: 8-10h.

---

## P1-13 — Foaia de Parcurs (FdP) standalone PDF

**Status curent**: ✅ funcțional via Step7 Card, dar embedded în pașaport — nu standalone
**Cale fișier afectat**: `src/lib/foaie-parcurs-pdf.js` (NOU), Step7Audit.jsx buton dedicat
**Problemă**: Mc 001-2022 cere FdP ca document distinct pentru clientul beneficiar (separat de pașaport renovare care e tehnic). FdP standalone e pe limba beneficiarului (jargon redus).

**Diff abstract**: Modul nou cu `generateFoaieParcursPdf({plan, building, finance, owner})` — A4 PDF simplificat (2-3 pagini) cu fazare 5-10-15 ani + costuri RON estimate + economii kWh/an + finanțare disponibilă (link AFM/POR/PNRR). Limbaj non-tehnic, infografică simpla.

**Test plan** (+5 teste): generate cu plan etapizat, finance integration, lang RO/EN.

**Estimare ore**: 8-10h.

---

## P1-14 — Plan M&V (PMV) avansat — IPMVP Op. A + B + C

**Status curent**: ✅ doar Op. C (consum total facturat) prin `generateMonitoringPlanPdf`
**Cale fișier afectat**: `src/lib/dossier-extras.js:405` (extinde la 3 opțiuni)
**Problemă**: IPMVP propune 4 opțiuni (A retrofit isolation / B retrofit isolation+system / C whole facility / D calibrated simulation). Pentru cazuri complexe, Op. A+B sunt mai precise. Auditorii experiență înaltă au nevoie.

**Diff abstract**: Extinde `generateMonitoringPlanPdf` cu param `options: ["A","B","C","D"]` (multi-select); pentru fiecare opțiune adăugat capitol distinct cu metodologie + boundary + măsurători cheie + frecvență + analiză sensitivity. Default "C" (păstrare comportament curent).

**Test plan** (+7 teste): 4 opțiuni separate, multi-select integration, content per opțiune.

**Estimare ore**: 8-10h.

---

## Recapitulare P1

| # | Item | Ore | Tests |
|---:|---|---:|---:|
| 01 | DOCX + PDF/A-3 dual CPE | 12-16 | +12 |
| 02 | DOCX + PDF/A-3 dual RAE | 10-14 | +10 |
| 03 | XML portal MDLPA Anexa | 10-14 | +8 |
| 04 | Curba cost-optim PDF+XLSX | 10-12 | +10 |
| 05 | AFM Casa Eficientă bundle | 14-18 | +12 |
| 06 | POR/FEDR bundle | 8-10 | +8 |
| 07 | FTJ Tranziție Justă bundle | 10-12 | +6 |
| 08 | Modernization Fund bundle | 8-10 | +6 |
| 09 | UAT cofinanțare blocuri bundle | 12-14 | +8 |
| 10 | AFM Casa Verde PV ghid | 6-8 | +5 |
| 11 | Studiu sisteme alternative PDF | 10-14 | +8 |
| 12 | Studiu pre-cabling EV PDF | 8-10 | +6 |
| 13 | FdP standalone PDF | 8-10 | +5 |
| 14 | PMV avansat Op. A+B+C+D | 8-10 | +7 |

**Total**: 134-172h (~22-28 zile dezvoltator senior), +111 teste.

## Ordine cronologică recomandată

1. **Săptămâna 1**: P1-01 + P1-02 (format dual CPE+RAE — depind de P0-01 PDF/A-3 infrastructure)
2. **Săptămâna 2**: P1-03 + P1-04 + P1-05 (XML MDLPA + cost-optim export + AFM Casa Eficientă)
3. **Săptămâna 3**: P1-06 + P1-07 + P1-08 + P1-09 (4 bundles finanțare în paralel)
4. **Săptămâna 4 (parțială)**: P1-10 + P1-11 + P1-12 + P1-13 + P1-14 (clean-up final)

## Riscuri identificate

- **R1 (HIGH)**: Schema oficială XML MDLPA poate fi publicată întârziat → P1-03 partial blocked. Mitigare: pregătim infrastructura, populăm la publicare.
- **R2 (MEDIUM)**: AFM/POR/FTJ ghiduri 2026 pot avea actualizări — necesită monitorizare lunară a portalurilor.
- **R3 (MEDIUM)**: Volumul tests +110 va crește durata test suite de la 8s la ~12-14s; acceptabil.
- **R4 (LOW)**: LibreOffice headless în Vercel Python runtime — necesită verificare cold start performance (~2-4s prima invocare).
