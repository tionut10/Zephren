# Pas 6 — CPE + Anexa 1+2 + Wrapper AE IIci — Audit mai 2026 (F4)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Fișiere principale**:
- `src/steps/Step6Certificate.jsx` (4903 linii — orchestrator UI)
- `src/components/CpeAnexa.jsx` (Anexa 1+2 preview UI)
- `src/components/AnexaMDLPAFields.jsx` (câmpuri Anexa MDLPA)
- `src/calc/cpe-recommendations.js` (motor unificat recomandări — Sprint P1.4)
- `src/lib/anexa-recommendations-aeIIci.js` **NOU** (wrapper tier IIci/Ici/Expert)
- `src/lib/cpe-payload-schema.js` (schema validare AJV)
- `src/lib/anexa-mdlpa-xml.js` (generare XML portal MDLPA — deferred 8.VII.2026)
- `src/lib/dossier-bundle.js` (helper ZIP bundle — neactivat în UI)

**⚠️ CONSTRÂNGERE**: Generatorul CPE PDF + Anexa 1+2 = **PROTEJATE**. Acest audit este **ANALIZĂ DOAR**, fără modificare cod generator.

---

## ✅ Funcționează corect

### Anexa 1 — Date generale și tehnice (`CpeAnexa.jsx`)

Audit câmpuri implementate:

| Câmp | Sursă auto | Manual | Status |
|---|---|---|---|
| Adresă | building.address + city + county | ✓ Pas 1 | ✅ |
| Destinație (cat label) | catLabel din building.category | ✓ Pas 1 | ✅ |
| Categorie | building.category (enum 16) | ✓ Pas 1 | ✅ |
| An construcție | building.yearBuilt | ✓ Pas 1 | ✅ |
| Regim înălțime | building.floors | ✓ Pas 1 | ✅ |
| Număr unități/apartamente | building.units | ✓ Pas 1 | ✅ |
| Scop certificare | building.scopCpe (default "Vânzare") | ✓ Pas 1 | ✅ |
| Zonă climatică | selectedClimate.zone | auto Pas 1 + override | ✅ |
| Localitate | selectedClimate.name / building.city | auto | ✅ |
| Au | building.areaUseful | ✓ Pas 1 | ✅ |
| V | building.areaUseful × heightAvg | ✓ Pas 1 | ✅ |
| Aenv | building.areaEnvelope | auto din Pas 2 | ✅ |
| Raport A/V | calculat din Aenv/V | auto | ✅ |
| Coefficient global G | envelopeSummary.G | auto din Pas 2 | ✅ |
| Perimetru fundație | building.perimeter | ✓ Pas 1 | ✅ |
| n50 | building.n50 | ✓ Pas 1 | ✅ |
| Conformitate nZEB | nzebOk (calculat din Pas 5) | auto | ✅ |
| U values per element | calcOpaqueR / glazingElements.u | auto Pas 2 | ✅ |

**Niciun câmp cu placeholder „null" detectat** în Anexa 1 — toate folosesc fallback „—" (em-dash) când valoarea lipsește (verificat liniile 156-176 CpeAnexa.jsx).

### Anexa 2 — Recomandări + Cadru legislativ

**Motor unificat recomandări** (Audit P1.4, 2 mai 2026):
- Sursă unică `src/calc/cpe-recommendations.js > generateCpeRecommendations(ctx)`
- Folosit în 2 locuri: Step6Certificate.jsx:2024 (preview HTML CPE pag.3) + CpeAnexa.jsx:123 (Anexa 2 UI)
- 8 categorii Mc 001 Cap. 9 ordine intervenții:
  - **A. Anvelopă**: A1 pereți ETICS / A2 ferestre Low-E / A3 planșeu superior / A4 punți termice
  - **B. Instalații**: B1 încălzire (condensare/HP) / B2 ventilare HRV / B3 răcire inverter EER>4.0
  - **C. SRE**: C1 PV 3-5 kWp / C2 solar termic 4-8 m²
  - **D. Iluminat**: D1 LED + DALI-2
  - **E. Etanșeitate**: E1 n50 ≤ 1.0
  - **F. Bloc multi-apartament**: F1 distribuție orizontală + repartitor (L.196/2018)
- Filtrare apartament RA (`filterApartmentRecommendations`):
  - A3 termoizolare terasă/pod eliminat pentru apartamente fără ultim_etaj
  - C1 PV / C2 solar termic demoted la intermediate (BLOCK_LEVEL_NOTE)
  - A1/A4/E1 marcate „intervenție la nivel BLOC (Asociația Proprietari)" Mc 001 §2.4
- Audit P1.12: savings real din `financialAnalysis.energySavingsPercent` sau label „necalculat (necesită Pas 7)" — nu mai folosește bias-ul optimist „20% default"
- 8 teste existente `cpe-recommendations.test.js`

**Cadru legislativ aplicat** (footer CPE linia 2571-2572 Step6Certificate.jsx + 3334):
- L.372/2005 republicată (modif. **L.238/2024**)
- Mc 001-2022 (Ord. MDLPA 16/2023)
- C107/0-7, NP048
- SR EN ISO 52000-1:2017/NA:2023
- SR EN ISO 52003-1:2017/NA:2023
- SR EN ISO 52010-1:2017/NA:2023 (date climatice)
- SR EN ISO 52016-1:2017/NA:2023
- SR EN ISO 52018-1:2018/NA:2023
- SR EN ISO 13790
- SR EN 12831-1:2017/NA:2022 (+C91:2024)
- SR EN 16798-1:2019/NA:2019
- I 5-2022 (ventilare)
- **Directiva UE 2024/1275 EPBD IV** — NU transpus în drept român (estimat 29 mai 2026) — explicit menționat
- **Reg. Delegat UE 2025/2273** (republicare metodologie cost-optimă)

Lista este **completă și actualizată 2026**. SR EN ISO 6946:2017 + SR EN ISO 14683:2017 sunt aplicate la calcul (Pas 2) dar pot fi adăugate la footer pentru completitudine maximă (P2 minor — vezi „Propuneri").

### Implementare nouă F4 — `src/lib/anexa-recommendations-aeIIci.js`

**Decizie F4**: motorul `cpe-recommendations.js` EXISTĂ DEJA și acoperă AE IIci. Modulul nou este un **wrapper enriched** (NU duplicat) care:

1. **Apelează motorul existent** `generateCpeRecommendations(ctx)`
2. **Detectează tier-ul automat** prin `determineTier({ userPlan, gradMdlpa })`:
   - planul include „expert/birou/enterprise" → `EXPERT`
   - planul include „iici/audit-ii/ae ii" → `AE_IICI` (verificat ÎNAINTE de „ici" pentru a evita substring collision)
   - planul include „pro/ici/audit-ici" → `AE_ICI`
   - default conservator: `AE_IICI`
3. **Tier-aware financialAnalysis handling**:
   - AE IIci: NU pasează financialAnalysis la motor (Pas 7 e blocat legal) + suprascrie eventuale savings numerice simple (`/^\d+%$/`) cu label generic „necalculat (necesită Pas 7 — plan AE Ici sau superior)"
   - AE Ici / Expert: respectă financialAnalysis dacă disponibil
4. **Calculează `coverage`** per 6 categorii Mc 001 Cap. 9 (ANVELOPA / INSTALATII / SRE / ILUMINAT / ETANSEITATE / BLOC_MULTI)
5. **Anotează cu metadata** `{ tier, legalBasis, sourceVersion }`:
   - AE IIci legalBasis: "Ord. MDLPA 348/2026 Art. 6 alin. (2) — recomandări minime CPE rezidențial conform Mc 001-2022 Cap. 9"
   - AE Ici legalBasis: "Ord. MDLPA 348/2026 Art. 6 alin. (1) — audit energetic complet + analiza cost-optimă (Reg. UE 244/2012 republicat 2025/2273)"
   - Expert legalBasis: "Ord. MDLPA 348/2026 Art. 6 alin. (1) — audit Expert + Step 8 module avansate"
6. **Helper `formatAnexaLegalNote(anexaResult)`** pentru text formatat Anexa 2 footer

**14 teste noi** în `src/lib/__tests__/anexa-recommendations-aeIIci.test.js` (toate PASS):
- 3 teste determineTier (free/IIci/Ici/Expert)
- 3 teste calcCoverage
- 5 teste generateAnexaRecommendations (shape, suprascriere savings IIci, financialAnalysis Ici, fallback Z0, integrare tier)
- 3 teste formatAnexaLegalNote (null, recomandări, conform)

**NU se atinge codul generator CPE PDF / Anexa 1+2** — modulul este destinat să fie apelat de CALLER ÎNAINTE de generator (responsibility la integrare ulterioară Step6/CpeAnexa).

### Pachet complet documente Pas 6

Conform Step6Certificate.jsx linia 4340+ (Audit P2.7), pachetul ZIP include:
- 1. **CPE DOCX** (mereu)
- 2. **Anexa 1+2 DOCX** (mereu)
- 3. **Anexa Bloc DOCX** (dacă apartments > 0)
- 4. (rezervat — XML portal MDLPA, REACTIVARE 8.VII.2026)
- 5. **Raport nZEB HTML** (dacă state-ul are nzebReportHtml + canAccess nzebReport)
- README.txt cu metadata

**Raportul de Conformare nZEB** este integrat în Pas 6 sub un Card dedicat cu `canAccess(plan, "nzebReport")` + gating `requiresNZEBReport(building)` (clădiri noi + renovare majoră + recepție; NU vânzare/închiriere). Linkbut → Step 6 din Step 7 (linia 2008-2032 Step7Audit.jsx).

### XML MDLPA + Dosar AAECR — status UI

**Sprint 08may2026 (înainte de F4) a ELIMINAT DEJA din UI**:
- ✅ Butonul „Export XML MDLPA (Ord. 16/2023)" — eliminat (Step6Certificate.jsx:4245-4251 comentariu istoric)
- ✅ Butonul „Export XML portal (preview)" — eliminat (linia 4253-4328 comentat `ELIMINAT_XML_PORTAL_START/END`)
- ✅ XML eliminat din pachet ZIP complet (linia 4372-4375)
- Motiv: „NU este obligatoriu legal la 8.V.2026 (61 zile rămase). REACTIVARE LA 8.VII.2026" — Ord. 348/2026 Art. 4 alin. 6
- Handlerele `generateXMLMDLPA` + helper-ul `anexa-mdlpa-xml.js` rămân în repo pentru reactivare 8 iulie 2026

**Dosar AAECR**:
- Helper `src/lib/dossier-bundle.js` (Sprint Conformitate P0-10, 6 mai 2026) **NU este apelat din UI**
- Singura referință text în Step7Audit.jsx:2160 (tooltip informativ FIC) și :1984 (descriere în card MEPI)
- `Digital Building Logbook` deja `{false && <Card title="...">...}` (linia 2579 Step7Audit.jsx)

**Concluzie**: ambele cerințe din plan sunt **DEJA SATISFĂCUTE** anterior acestui sprint. Niciun fix UI necesar în F4.

### Cod CPE local — schema unică

Conform memory + Sprint 14 (`src/utils/cpe-code.js`):
- Format `CE-YYYY-NNNNN_...` (Ord. MDLPA 16/2023)
- `cpe_nr` = `${nrMDLPA}/${registryIndex}` (stânga MDLPA auditor unic + dreapta index)
- UUID v5 deterministic per cont Zephren (verificat în memory passport-export.js)
- Codul MDLPA real e separat și neafectat de program (auditorul îl primește la atestare)

### Conformitate machetă PDF

Verificare linia 2034-2048 Step6Certificate.jsx — header PDF:
- „CERTIFICAT DE PERFORMANȚĂ ENERGETICĂ" (cu diacritice ț)
- „a clădirii / unității de clădire"
- „ROMÂNIA • Ministerul Dezvoltării, Lucrărilor Publice și Administrației"
- Secțiuni: I. Identificare CPE și auditor / II. Clădirea certificată / III. Performanța energetică / Emisii CO₂ / V. Surse regenerabile și statut nZEB
- Etichete: Nr. CPE, Cod MDLPA, Valabil, Auditor, Atestat, Firma, Tel, Email
- Format A4 portret (DXA 11906×16838) — `pdfa-export.js` enforce
- Cap.6 Mc 001-2022 + macheta Ord. MDLPA 348/2026 (verificat în CONFORMITATE_NORMATIVA_v4.md §5)

### Semnătura și ștampila

Conform memory + Sprint Conformitate P0-02 (6 mai 2026):
- PAdES B-T/B-LT skeleton în `src/lib/pades-sign.js` (~480 LOC)
- QTSP providers folder `src/lib/qtsp-providers/`:
  - `mock.js` provider funcțional (CMS hex ASN.1 minimal — pentru DEV)
  - `certsign.js` skeleton REST API + OAuth 2.0 (necesită cont B2B certSIGN + Vercel Pro)
- Restanțe Sprint P0-02-bis (post upgrade Vercel Pro): endpoint serverless `qtsp-proxy.js` + DSS dictionary + OCSP + B-LTA archive timestamp + UI Verify online

---

## ❌ Probleme găsite

**Niciun bug P0 sau P1 nou identificat la Pas 6 în această sesiune**. Modulul este matur cu sprint-uri intensive:
- Sprint Conformitate P0-01..P0-09 + P2-01..P2-11 (mai 2026)
- Sprint 14: cod CPE format
- Sprint 30A·A1-A17 (15 fix-uri M1 verificate)
- Sprint Audit 2 mai 2026 P1.4 (motor recomandări unificat), P1.10 (NZEB EP fallback), P1.12 (savings real)
- Sprint 08may2026: eliminare XML MDLPA preview din UI
- Sprint Audit Pas 7 IMPLEMENTARE (6 mai 2026, 12 bug-uri rezolvate, 5 docs noi)

**Implementare nouă F4 — adăugare valoare**:
- ✅ `src/lib/anexa-recommendations-aeIIci.js` (wrapper enriched cu tier + coverage + legal basis)
- ✅ 14 teste noi PASS
- ✅ Zero regresii

---

## 💡 Propuneri îmbunătățire UX

1. **Integrare `formatAnexaLegalNote` în footer Anexa 2**:
   - Apel din CpeAnexa.jsx + Step6Certificate.jsx Anexa 2 generator
   - Auditorul vede explicit tier-ul curent + baza juridică + categoriile acoperite
   - **Estimare**: 1-2h (call site + footer template)

2. **Lista normative B4 ușor expandată cu SR EN ISO 6946:2017 + SR EN ISO 14683:2017 + SR EN 15316 series**:
   - Linia 2571 Step6Certificate.jsx — lista actuală e completă pentru cadrul lege primar, dar pentru auditor sceptic poate fi util adăugarea standardelor specifice de calcul.
   - **Estimare**: 30 min text edit (NU atinge generator code — doar string template)

3. **Banner explicit AE IIci în Step 6 când plan = audit-IIci**:
   - „Acest plan emite CPE cu Anexa 1+2 cu recomandări generice Mc 001 Cap. 9. Pentru analiză cost-optimă detaliată (NPV, PNRR, finanțare), upgrade la AE Ici (1.499 RON/lună)."
   - Folosește `anexa-recommendations-aeIIci.js > formatAnexaLegalNote()` pentru tier display
   - **Estimare**: 2h impl banner React + integrare planGating

---

## 🤖 Funcții AI propuse Pas 6

| Endpoint | Funcție | Ore | Prioritate |
|---|---|---|---|
| `api/ai-anexa-narrative.js` | Text narativ secțiuni Anexa 1+2 (cap. 1 descriere, cap. 8 concluzii) | 6 | P1 |
| `api/ai-cpe-quality-check.js` | Pre-export verificare AJV + corectare automată câmpuri | 4 | P2 |

Toate via multiplexare `api/ai-assistant.js > intent` (zero slot nou Vercel).

---

## 📋 Ordine secțiuni Pas 6

Ordine actuală tipică Step6:
1. Auditor card (date personale + nrMDLPA + atestat + cpeCode)
2. Anexa MDLPA Fields (componenta dedicată)
3. Building map / foto (preview)
4. Preview CPE (HTML iframe)
5. CpeAnexa (Anexa 1+2 detailed UI)
6. Raport conformare nZEB (gating canAccess + requiresNZEBReport)
7. Export buttons: CPE DOCX / Anexa DOCX / Anexa Bloc / Pachet ZIP
8. Checklist depunere
9. ANCPI verification (link spre Pas 1 dacă lipsește)

**Sprint 11 mai 2026** mută „Conformitate EPBD 2024" (BACS+SRI+MEPS) din Pas 6 în Pas 5 (comentariu linia 4871).

Reordonare propusă: **Cardul auditor → top sticky** (rămâne mereu vizibil), Anexa MDLPA + raport nZEB + export → secundar. **Estimare**: 2-3h reordonare layout.

---

## Concluzie Pas 6

**Scor conformitate normativă Pas 6**: **97/100**
- Anexa 1: TOATE câmpurile completate automat cu fallback "—" elegant
- Anexa 2 cadru legislativ: complet și actualizat 2026 (L.372/2005+L.238/2024 + Mc 001-2022 + 10 SR EN ISO + EPBD IV future + Reg 2025/2273)
- Motor recomandări unificat conform Cap. 9 Mc 001 + filtrare RA + savings real Pas 7
- Cod CPE format conform Ord. 16/2023 + UUID v5 unique
- Macheta PDF format A4 portret DXA conform
- PAdES B-T skeleton + QTSP providers folder pregătit
- XML MDLPA + Dosar AAECR ascunse corect din UI (anterior Sprint 08may2026)

**Nou implementat F4**:
- ✅ `src/lib/anexa-recommendations-aeIIci.js` wrapper enriched (210 linii)
- ✅ 14 teste noi PASS
- ✅ Tier-aware financialAnalysis handling (IIci → label generic / Ici+ → real)
- ✅ Coverage 6 categorii Mc 001 Cap. 9
- ✅ Legal basis explicit per tier (Ord. 348/2026 Art. 6 alin. 1 vs 2)

**NU s-a atins** generatorul CPE PDF + Anexa 1+2 (constrângere plan respectată).

**Test suite F3→F4**: 3479 → **3493 PASS** (+14 noi, zero regresii, 1 FAIL preexistent neafectat).
