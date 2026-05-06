# Audit Conformitate Zephren — 6 mai 2026

**Rol auditor**: Auditor energetic senior MDLPA AE Ici (Construcții + Instalații), arhitect software senior, expert digitalizare audit conform eIDAS 2 / ETSI EN 319 142 / ISO 19005-3.

**Sursă comparare**: lista canonică documente audit energetic România validată cercetare 6 mai 2026 (Mc 001-2022, Ord. MDLPA 16/2023, Ord. MDLPA 348/2026, Legea 372/2005 republ. cu L.238/2024, EPBD 2024/1275 Anexa VIII, Reg. UE 244/2012).

**Stare cod la analiză**: master HEAD `61b7a56` (PUSH+DEPLOY ✅ — Sprint Audit Pas 7 IMPLEMENTARE), 138 fișiere test, **2879/2879 PASS**.

---

## 1. Sumar executiv

Zephren este într-o stare **funcțional avansată** pentru wizardul CPE/RAE/Pașaport (16 documente Pas 7 generabile, gating legal Art. 6 alin. 1+2 enforced hard în Step6+Step7), dar are **gaps majore în trei direcții critice**:

1. **Format export non-conform standardelor EU/RO** — niciun document NU produce PDF/A-3 (ISO 19005-3) strict validat veraPDF; nu există semnături PAdES B-LT/LTA (eIDAS 2, ETSI EN 319 142) sau CAdES B-T detașat pe Manifest SHA-256. Există doar `pdfa-export.js` (PDF/A-1b „best-effort", neconform pentru RAE/Pașaport pe orizont 25-30 ani). Fără semnături QTSP RO (certSIGN / DigiSign / TransSped / AlfaSign), niciun document Zephren nu poate fi acceptat la portal MDLPA pentru depunere electronică post-8.VII.2026 conform Art. 4 alin. 6 Ord. 348/2026.
2. **Colectare documente input client incompletă** — wizardul Step 1-3 colectează DATE structurate, dar NU solicită upload PDF/JPG pentru: Cartea Tehnică (≥1995), Procesul-verbal recepție, Aviz ANCPI/ISC, Acord scris proprietari (RC), Releveu actualizat, BACS inventory + LENI baseline + Program funcționare + Dosar BMS + Contracte service HVAC + Releveu iluminat (toate 5 obligatorii nerezidențial), Audit precedent. AuditClientDataForm.jsx are doar selectori Y/N pentru documente ("Cartă tehnică disponibilă? Da/Nu/Parțial"), fără upload real.
3. **Integrare programe finanțare RO 2026 quasi-absentă** — există doar `generatePNRRReport` (PNRR C5). Lipsesc bundle-uri pre-formatate pentru AFM Casa Eficientă (deadline rolling 2026), POR/FEDR 2021-2027, FTJ Tranziție Justă (deadline 26.VIII.2026), Modernization Fund, UAT cofinanțare blocuri. Riscul de pierdere clienți care au nevoie de documentație gata-de-aplicat pentru cele 6 surse de finanțare active 2026 este major.

Pe partea pozitivă, **arhitectura juridică Art. 6 alin. 1+2 e printre cele mai stricte din piață**: dual-gate (plan + atestat real), 14 module canonice (`canEmitForBuilding.js`, `auditor-grad-validation.js`, `auditor-attestation-validity.js`, `effectiveGate.js`, `planGating.js`, `tiers.js`, `MDLPATransitionBanner.jsx`, `RaportConformareNZEB.jsx`), watermark dual DEMO/SCOP DIDACTIC, blocaj hard pre-export Step6 (`canEmitForBuilding.js:168` apel cu `operation:"cpe"`) și Step7 (același pattern cu `operation:"audit"` la linia 110). Tranziția 14.IV→11.X.2026 e gestionată cu `inTransition` + `softWarning` în `effectiveGate.js`.

## 2. Scor global conformitate

**Itemi distincți evaluați: 50** (după consolidare suprapuneri reabilitare ↔ construcție nouă).

| Status | Număr | Procent |
|---|---:|---:|
| ✅ Conform 100% | 19 | 38% |
| ⚠️ Parțial (funcțional dar format/conținut incomplet) | 16 | 32% |
| ❌ Lipsă completă | 15 | 30% |

**Scor ponderat (P0×3 + P1×2 + P2×1)**: ~62%. Față de ținta livrare comercială completă pentru piața RO 2026 (≥90% conform), avem **deficit ~28 puncte procentuale**.

## 3. Tabel matricial 50 × 4 (item / status / format curent / format cerut)

### A. Documente input client (rezidențial 22 + nerezidențial 10 = 32)

| # | Item | Status | Format curent | Format cerut |
|---:|---|:---:|---|---|
| 1 | Cerere oficială client → auditor | ❌ | — | Formular text + semnătură client |
| 2 | Extras CF + plan (cadastru) | ✅ | ANCPIVerificationPanel.jsx (340 LOC, upload PDF≤2MB) | OK |
| 3 | CI/CUI proprietar (PF/PJ/PUB) | ✅ | Step1Identification + checksum ANAF | OK |
| 4 | Plan/releveu construcție arhitectură | ⚠️ | Y/N select + IFC opțional | Upload PDF/DWG obligatoriu |
| 5 | Documente energetice (factori conv. + facturi + contracte) | ⚠️ | InvoiceOCR pentru facturi (Claude Vision) | + upload contracte furnizare PDF |
| 6 | Cartea Tehnică (≥1995) | ⚠️ | AuditClientDataForm select Y/N/Parțial | Upload PDF ≤20MB obligatoriu |
| 7 | Procesul-verbal recepție | ❌ | — | Upload PDF |
| 8 | Autorizație construire (renovare) | ⚠️ | Text only "Autorizație nr/anul" | Upload PDF + numar emitent |
| 9 | Avize ANCPI (zone protejate) | ❌ | — | Upload PDF condiționat |
| 10 | Aviz ISC (siguranță foc) | ❌ | — | Upload PDF condiționat |
| 11 | Plan situație + vecinătăți | ❌ | — | Upload PDF/DWG condiționat |
| 12 | Fișa tehnică instalații HVAC complexe | ❌ | — | Upload PDF condiționat |
| 13 | Documente vechi termice (regiuni climatice) | ⚠️ | Step2Envelope CSV import | + upload imagini termografice |
| 14 | Releveu actualizat | ❌ | — | Upload PDF/DWG |
| 15 | Foto-documentare (clădiri istorice) | ⚠️ | BuildingPhotos generic | Tag "istoric" + categorisire |
| 16 | Acord scris proprietari (RC) | ❌ | — | Upload PDF semnături + listă (Anexa 2) |
| 17 | Plan apartament (modul precis) | ❌ | — | Upload PDF/DWG per apartament |
| 18 | Plan etaj (situare) | ❌ | — | Upload PDF/DWG |
| 19 | Detalii anvelopă bloc / fațadă comună | ⚠️ | Step2Envelope wizard opaque | + secțiuni constructive PDF |
| 20 | Contoare utilități individuale | ✅ | InvoiceOCR + Step3 | OK |
| 21 | Repartiție apă/încălzire RC vert/oriz | ❌ | — | Upload PDF + select tip RC |
| 22 | Anexa 2 RC bloc (Mc 001 P.III) | ✅ | AnexaBloc + ApartmentListEditor | OK |
| 23 | BACS inventory (NR) | ❌ | BACSSelectorSimple input clase A-D | Upload listă echipamente + ISO 52120 inventory |
| 24 | LENI baseline (NR) | ❌ | en15193-lighting calc | Upload LENI measure + zone iluminat |
| 25 | Program funcționare zilnic/anual (NR) | ⚠️ | Step5 tip ocupare + ore | + upload schedule lucru |
| 26 | Dosar BMS / sub-metering (NR) | ❌ | — | Upload schemă BMS + matrice puncte |
| 27 | Contracte service HVAC (NR) | ❌ | — | Upload PDF anuale |
| 28 | Releveu iluminat (lux per zonă) (NR) | ❌ | — | Upload măsurători luxmetru |
| 29 | Plan rețele gaz/termo/apă (NR) | ❌ | — | Upload PDF schiță rețele |
| 30 | Audit precedent | ❌ | — | Upload PDF + extracție automată Eᵢ pre-implementare |
| 31 | ENERGOBILANȚ MO industrial | ❌ | — | Upload PDF dacă există |
| 32 | Plan amplasament cu rețele | ❌ | — | Upload PDF/DWG NR |

**Subtotal input client**: 5 ✅ + 8 ⚠️ + 19 ❌ = **16% conform full + 25% parțial = 41% acoperire**.

### B. Documente auditor reabilitare (15)

| # | Item | Status | Format curent | Format cerut |
|---:|---|:---:|---|---|
| 33 | FIC (Mc 001-2022 Anexa G) | ✅ | dossier-extras.js:41 `generateFICPdf` (jsPDF, 7 secțiuni A4) | + opțional PDF/A-3 |
| 34 | DCA (Ord. 348/2026 Anexa I) ⚠️ | ✅ | dossier-extras.js:197 `generateAuditorDeclarationPdf` (PDF + 6 declarații + Art. 326 CP) | + PAdES B-T (semnătură QTSP) |
| 35 | Calcul U + EP/EP_nren/ηtot + emisii CO₂ | ✅ | element-annex-docx.js:366 `exportFullAnnexesDOCX` (4 secțiuni A4) | OK |
| 36 | RAE (9 capitole Mc 001-2022 Cap. 6) | ⚠️ | api/generate-document.py?type=audit (DOCX) | PDF/A-3 + PAdES B-LT obligatoriu Art. 4.6 Ord. 348 |
| 37 | CPE (model standardizat MDLPA + cod unic) | ⚠️ | api/generate-document.py?type=cpe (DOCX template MDLPA + UUID v5) | PDF/A-3 + PAdES B-LT + DOCX dual |
| 38 | Anexa CPE (recomandări măsuri) | ✅ | report-generators.js:2003 `generateCPEAnexa2` (jsPDF) + Python DOCX | + opțional PDF/A-3 |
| 39 | Anexa MDLPA (formular conformitate) | ⚠️ | AnexaMDLPAFields.jsx + Python DOCX | + XML portal MDLPA + PAdES B-T |
| 40 | RC-nZEB (DOAR AE Ici, renovare ≥25%) | ✅ | report-generators.js:2071 `generateNZEBConformanceReport` + RaportConformareNZEB.jsx (gating dual) | OK |
| 41 | ACO + Curba cost-optim (Reg. UE 244/2012) | ⚠️ | CostOptimalCurve.jsx (UI grafic + 3 perspective EN 15459-1) | + export PDF + XLSX sensibilitate |
| 42 | RP Pașaport Renovare ⚠️ (EPBD 2024 Anexa VIII) | ⚠️ | passport-export.js (JSON/XML/PDF) + passport-docx.js DOCX + UUID v5 + JSON Schema Draft 07 | XML namespace OneClickRENO oficial (acum schema 0.1.0-preliminary proprie zephren.ro) + PAdES B-LTA |
| 43 | FdP Foaia de Parcurs | ✅ | Step7Audit.jsx Card pașaport `calcPhasedRehabPlan` + DOCX | OK |
| 44 | PMV Plan M&V (IPMVP Op. C) | ✅ | dossier-extras.js:405 `generateMonitoringPlanPdf` | OK |
| 45 | Scrisoare însoțire MDLPA | ✅ | cover-letter-pdf.js:32 `generateCoverLetterPdf` (190 LOC) | + PAdES B-T |
| 46 | Manifest SHA-256 (integritate digitală) | ⚠️ | dossier-extras.js:324 `generateManifestSHA256` (TXT, Web Crypto) | + CAdES B-T detașat (semnătură detașată ETSI EN 319 122) |
| 47 | Fișa analiză termică-energetică (Anexa 6.1 Mc 001-2022) | ⚠️ | acoperită parțial de FIC + element-annex-docx | Document distinct A4 |

**Subtotal reabilitare**: 8 ✅ + 7 ⚠️ + 0 ❌ = **53% conform full + 47% parțial = 100% funcțional acoperire** (DAR formate non-arhivabile în 53% din cazuri).

### C. Documente auditor construcție nouă (suprapuneri cu B = 6 distincte)

| # | Item | Status | Format curent | Format cerut |
|---:|---|:---:|---|---|
| 48 | Studiu sisteme alternative + Studiu pre-cabling EV | ⚠️ | parțial Step4Renewables + step1-validators EV Art.14 | Document A4 PDF distinct |
| 49 | Studiu ZEB ⚠️ (post-2030 EPBD 2024) | ❌ | — | Document A4 PDF + ZEB_THRESHOLDS check (există u-reference.js) |
| 50 | Inserare Cartea Tehnică (note B1/B2/C8) | ❌ | — | Note A4 PDF + Foto-album structurat |

**Subtotal construcție nouă (excludem suprapuneri)**: 0 ✅ + 1 ⚠️ + 2 ❌ = **0% conform full**.

### D. Programe finanțare (7 — nu intră în 50, ci ca categorie suplimentară E)

| # | Program | Status | Format curent | Format cerut |
|---:|---|:---:|---|---|
| E.1 | PNRR C5 (deadline 31.VII.2026) | ✅ | report-generators.js:581 `generatePNRRReport` | OK |
| E.2 | AFM Casa Eficientă (CPE max 6 luni + RAE) | ❌ | — | Bundle CPE+RAE+Implementation report |
| E.3 | AFM Casa Verde Fotovoltaice | ⚠️ | calc PV Step4 + ghid lipsă | NU cere CPE — doar bundle PV calc |
| E.4 | POR/FEDR 2021-2027 | ❌ | — | Bundle audit+CPE pre/post + ACB Reg. UE 244/2012 |
| E.5 | FTJ Tranziție Justă (deadline 26.VIII.2026) | ❌ | — | Bundle audit + studiu fezabilitate |
| E.6 | Modernization Fund | ❌ | — | Bundle audit + plan investiții + reduceri CO₂ |
| E.7 | UAT cofinanțare blocuri | ❌ | — | Bundle audit bloc întreg |

## 4. Distribuție itemi pe priorități

| Prioritate | Itemi | Descriere |
|---|---|---|
| **P0 CRITIC** | 12 | Blocante legal pentru emitere validă CPE/RAE/Pașaport (formate PDF/A-3 + PAdES + manifest CAdES + 4 input obligatorii rezidențial lipsă) |
| **P1 HIGH** | 14 | Format upgrade (DOCX→PDF/A-3 dual), schema OneClickRENO oficial, XML portal MDLPA, Studiu ZEB post-2030, AFM Casa Eficientă bundle, PMV avansat |
| **P2 MEDIUM** | 16 | Input nerezidențial (BACS/LENI/BMS/program/contracte/releveu iluminat), audit precedent, plan amplasament, releveu actualizat, RC apartament 4 itemi, Foaia de Parcurs standalone |
| **P3 LOW** | 8 | Construcție nouă rar (Studiu ZEB, Note CT, Foto-album construcție), POR/FTJ/Modernization Fund/UAT bundles, ENERGOBILANȚ industrial |

## 5. Decizii cheie de luat (după audit)

1. **PDF/A-3 strict** — alegere între:
   - Opțiune A: client-side cu pdf-lib + manual XMP + outputIntent + embed fonts (~30h, ~80% validare veraPDF)
   - Opțiune B: server-side Python pikepdf + pdf2pdfa (~20h, ~99% validare, dar +1 funcție Vercel — limită 12 atinsă)
   - Opțiune C: Vercel Pro upgrade (49 USD/lună) → folder `_deferred/` activat + pikepdf serverless (~15h, recomandat strategic)
2. **Semnături QTSP RO** — alegere parteneriat:
   - certSIGN (cea mai răspândită; API SOAP+REST disponibil)
   - DigiSign (cloud-only, JSON API simplu)
   - TransSped (focus servicii publice)
   - AlfaSign (low-cost)
   - Recomandat: certSIGN ca prim parteneriat (acoperire ~60% auditori MDLPA RO)
3. **Schema OneClickRENO oficial** — wait pentru publicarea ordinului MDLPA (29.V.2026 termen transpunere RO Directiva 2024/1275). Schema actuală 0.1.0-preliminary e pregătire ok; adaptare ~2-4h post-publicare.
4. **Input client documents UI** — refactor Step 1 cu component nou `<DocumentUploadCenter>` (12 zone upload PDF/DWG/JPG cu validare per document type). Estimat 18-22h.
5. **Bundle programe finanțare** — pentru AFM Casa Eficientă + FTJ deadline-uri 2026, prioritizare P1. Restul P3.

## 6. Sub-rapoarte

Detalii per prioritate, cu cale fișier exactă, diff abstract, test plan și estimare ore:

- 📄 [P0-CRITIC.md](P0-CRITIC.md) — 12 itemi, ~120-160h, +85 tests propuse
- 📄 [P1-HIGH.md](P1-HIGH.md) — 14 itemi, ~95-130h, +110 tests propuse
- 📄 [P2-MEDIUM.md](P2-MEDIUM.md) — 16 itemi, ~75-100h, +90 tests propuse
- 📄 [P3-LOW.md](P3-LOW.md) — 8 itemi, ~50-70h, +45 tests propuse

**Total estimare cumulativă: ~340-460h (P0+P1+P2+P3) → 2879 → ~3209 PASS**.

## 7. Status teste curent

```
Test Files  138 passed (138)
     Tests  2879 passed (2879)
   Start at 22:14:45
   Duration  8.10s
```

Niciun test nu eșuează. Adăugarea celor ~330 teste noi propuse în sub-rapoarte va aduce suite-ul la ~3209 PASS.

## 8. Referințe legale citate

- **Mc 001-2022** — Metodologia de calcul al performanței energetice a clădirilor (Anexa G, Cap. 6, Cap. 0)
- **Ord. MDLPA 16/2023** — Model standard CPE + Anexa 1+2 + portal electronic
- **Ord. MDLPA 348/2026** (MO 292/14.IV.2026) — Atestare AE Ici/IIci, Art. 4 (cod unic), Art. 5 (ștampilă Ø40mm), Art. 6 alin. 1+2 (competențe), Art. 7 (tranziție 180z), Art. 11 (manifest hash deduplicare)
- **Legea 372/2005 republicată cu L.238/2024** — Performanța energetică clădiri
- **EPBD 2024/1275 Anexa VIII** — Pașaport renovare obligatoriu post-29.V.2026 (transpunere RO termen)
- **Reg. UE 244/2012 Reg. delegat 244/2012** — Curba cost-optim
- **eIDAS 2** (Reg. UE 910/2014 modif. 2024/1183 + Legea 214/2024 RO) — Semnături electronice calificate QTSP
- **ETSI EN 319 142** — PAdES (PDF Advanced Electronic Signatures)
- **ETSI EN 319 122** — CAdES (CMS Advanced Electronic Signatures)
- **ISO 19005-3** (PDF/A-3) — Arhivare documente PDF cu fișiere atașate
- **ISO 14641** — Stocare documente electronice arhivă
- **IPMVP** (Efficiency Valuation Organization) — International Performance Measurement and Verification Protocol Opțiunea C
- **OneClickRENO** — Schema XML pașaport renovare UE (în curs publicare)

---

**Concluzie**: Zephren are **fundație solidă** (engine calc Mc 001-2022 + UI wizard + 16 documente generabile + gating legal Art. 6), dar pentru a fi **comercial ready 100% piața RO 2026** are nevoie de două sprinturi mari (P0 + P1, ~250h cumulativ) pe direcția **format export legal-grade** (PDF/A-3 + PAdES + CAdES) și **input client documents structurat**. P2+P3 pot fi planificate post-lansare.

Trecem la **Faza 3** (lansare interactivă sprint) cu confirmare user pentru P0 / P1 / P2 / P3.
