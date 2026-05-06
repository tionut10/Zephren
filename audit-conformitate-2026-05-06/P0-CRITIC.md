# P0 CRITIC — 12 itemi blocante pentru emitere validă

**Sprint propus**: Sprint Conformitate P0 (3-4 săptămâni)
**Estimare ore**: ~120-160h
**Teste noi propuse**: +85
**Total cumulativ post-P0**: 2879 → ~2964 PASS
**Risc dacă nu se rezolvă**: documentele Zephren nu pot fi acceptate la portal MDLPA post-8.VII.2026, nu pot fi arhivate pentru valabilitatea CPE 5/10 ani (PDF/A-3), nu pot fi semnate ca acte juridice cu valoare probatorie (PAdES/CAdES). Riscul de class-action din partea auditorilor care emit documente refuzate este major.

---

## P0-01 — PDF/A-3 strict pentru CPE + RAE (ISO 19005-3)

**Status curent**: ❌ doar `pdfa-export.js` (PDF/A-1b „best-effort", neconform pentru fișiere atașate)
**Cale fișier afectat**: `src/lib/pdfa-export.js` (179 LOC), `api/generate-document.py` (Python motor RAE)
**Problemă**: PDF/A-1b NU permite atașamente (ex: factură OCR, CSV facturi, JSON inputs calc). PDF/A-3 e obligatoriu pentru bundle CPE+anexe digitale conforme ISO 14641 (arhivare). pdf-lib JS NU validează strict veraPDF.

**Bază legală**: ISO 19005-3 + Mc 001-2022 §10 (arhivare 30 ani) + Art. 17 EPBD 2024/1275 (CPE 5/10 ani).

**Diff abstract**:
- **Opțiune A** (client-side, fallback): extinde `pdfa-export.js` cu `convertToPDFA3()` (acceptă lista atașamente); embed fonts complet (LiberationSans + LibSans-Bold + LibSans-Italic în XObject); inject XMP `pdfaid:part=3` + `pdfaid:conformance=B`; inject OutputIntent sRGB ICC profile (binary); folosește pdf-lib `attachFile()` pentru embed JSON+CSV+facturi cu MIME type AFRelationship. Validare client-side via veraPDF WASM (~2MB).
- **Opțiune B** (server-side, recomandat): nou endpoint `api/pdfa-convert.py` cu `pikepdf` + `pdf2pdfa`. Acceptă PDF input + atașamente → returnează PDF/A-3b validat veraPDF. Necesită Python deps `pikepdf>=8.0`, `lxml`, `pyHanko`. **Atenție Vercel limit 12/12 atinsă** — necesită upgrade Pro sau split (mută `import-document.js` în `_deferred/`).

**Test plan** (+22 teste):
- 8 unit pdfa-export-v3.test.js: convert PDF cu/fără atașamente, validate XMP packet, OutputIntent prezență, font embedding complet
- 6 integration cpe-pdfa3.test.js: export CPE cu atașamente JSON+CSV, hash determinist, dimensiune <5MB
- 4 RAE PDF/A-3: verifică toate cele 9 capitole + Cap. 0 cu standarde + figuri embedded
- 4 cross-browser: Chrome+Firefox+Safari+Edge (BrowserStack) headless validate

**Estimare ore**: 35-45h (Opțiune B mai stabilă; Opțiune A dacă nu se face upgrade Vercel imediat).

---

## P0-02 — Semnături PAdES B-LT pentru CPE + RAE (eIDAS 2 + ETSI EN 319 142)

**Status curent**: ❌ documentele sunt nesemnate digital
**Cale fișier afectat**: `src/lib/pades-sign.js` (NOU), `src/components/QTSPAuthPanel.jsx` (NOU)
**Problemă**: Fără semnătură electronică calificată QTSP RO, niciun document Zephren nu are valoare probatorie juridică (Art. 4 alin. 6 Ord. 348/2026 + Legea 214/2024 transpunere eIDAS 2). PAdES B-LT (Long-Term) include LTV (Long-Term Validation) pentru valabilitate post-expirare certificat.

**Bază legală**: eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183) + ETSI EN 319 142-1 + ETSI EN 319 102-1 + Legea 214/2024 RO.

**Diff abstract**:
- Modul nou `src/lib/pades-sign.js` cu `signPdfPadesBLT(pdfBytes, certificate, signingTime)` — folosește `node-signpdf` (există ports browser) sau `pdf-lib + @signpdf/signer-p12` cu integrare TSA (Time-Stamp Authority) RO (`https://tsa.certsign.ro/tss/post`).
- Component nou `QTSPAuthPanel.jsx` — selector QTSP (certSIGN / DigiSign / TransSped / AlfaSign) + OAuth flow per provider + cache token.
- Endpoint serverless `api/qtsp-sign.js` (proxy CORS pentru SignServer-uri QTSP care nu au CORS public).
- Integrare în Step6Certificate.jsx la export DOCX→PDF/A-3→PAdES B-LT (chain).

**Test plan** (+18 teste):
- 6 unit pades-sign.test.js: sign + verify chain, ByteRange placeholder, AcroForm field SigField
- 4 integration TSA RO: roundtrip cu mock TSA + assert RFC 3161 timestamp valid
- 4 LTV: embed CRL + OCSP responses în DSS dictionary
- 4 multi-QTSP: certSIGN + DigiSign + TransSped flows

**Estimare ore**: 30-40h (depinde de QTSP API stability).

---

## P0-03 — Manifest CAdES B-T detașat pentru Manifest SHA-256

**Status curent**: ⚠️ TXT pur cu hash-uri, nesemnat (`dossier-extras.js:324`)
**Cale fișier afectat**: `src/lib/dossier-extras.js`, modul nou `src/lib/cades-detached.js`
**Problemă**: Manifestul SHA-256 e elementul de integritate al întregului dosar audit. Fără semnătură detașată CAdES B-T (RFC 5652 + ETSI EN 319 122-1), poate fi modificat retroactiv. Art. 11 Ord. 348/2026 cere deduplicare la registrul electronic, dar fără manifest semnat nu există dovadă cronologică.

**Bază legală**: ETSI EN 319 122-1 + RFC 5652 + Art. 11 Ord. 348/2026.

**Diff abstract**:
- Adaugă în `dossier-extras.js` funcție `generateManifestSHA256Signed()` care apelează `signCadesDetached(manifestTxt, cert, signingTime)` din modul nou `cades-detached.js`. Output: `{manifest.txt, manifest.txt.p7s}` (PKCS#7 detașat).
- Folosește `node-forge` (deja în deps) sau `@peculiar/x509` pentru CMS SignedData.
- Integrare în Step7Audit.jsx butonul "Manifest SHA-256" → produce ZIP cu .txt + .p7s.

**Test plan** (+8 teste):
- 4 unit cades-detached.test.js: sign + verify roundtrip, signing time embed, certificate chain
- 4 manifest-signed.test.js: integrare cu hash-uri SHA-256 reale

**Estimare ore**: 12-16h.

---

## P0-04 — Cerere oficială client → auditor (input lipsă)

**Status curent**: ❌ — generator output există (`cover-letter-pdf.js`) dar e auditor→MDLPA, nu client→auditor
**Cale fișier afectat**: `src/components/AuditClientDataForm.jsx` (extinde), `src/lib/client-request-pdf.js` (NOU)
**Problemă**: Auditorul are nevoie de cerere oficială scrisă a clientului pentru a deschide dosarul (Art. 6 alin. 1 Ord. 348/2026 + cerințe AFM Casa Eficientă pentru documentația de aplicare).

**Bază legală**: Art. 6 alin. 1 Ord. 348/2026 + AFM ghid finanțare 2026.

**Diff abstract**:
- Modul nou `client-request-pdf.js` cu `generateClientRequestPdf({client, building, scopCpe, auditor})` — produce A4 PDF cu: identificare client, date clădire, scop solicitare, declarație acord pentru date GDPR, semnătură client.
- În AuditClientDataForm.jsx adaugă tab nou "Cerere oficială" cu pre-fill din formData + buton "Generează PDF cerere → trimite client la semnat".

**Test plan** (+5 teste): 3 unit generate cu/fără date complete, 2 integration cu Step1 form data.

**Estimare ore**: 6-8h.

---

## P0-05 — Cartea Tehnică upload obligatoriu (≥1995)

**Status curent**: ⚠️ doar select Y/N/Parțial în AuditClientDataForm
**Cale fișier afectat**: `src/components/AuditClientDataForm/utils/sectionConfig.js` (linia 22), `src/components/DocumentUploadCenter.jsx` (NOU)
**Problemă**: Cartea Tehnică e document obligatoriu (HG 273/1994 pentru construcții ≥1995). Fără upload PDF (max 50MB), auditorul nu poate verifica plan, materiale, intervenții, scenografie de execuție.

**Bază legală**: HG 273/1994 + Mc 001-2022 §3.2.

**Diff abstract**:
- Component nou `DocumentUploadCenter.jsx` (~250 LOC) cu suport multi-document upload:
  - Slot 1: Cartea Tehnică (PDF max 50MB, validare PDF magic bytes 0x25504446)
  - Slot 2: Procesul-verbal recepție (PDF max 10MB)
  - Slot 3: Releveu actualizat (PDF/DWG max 30MB)
  - Slot 4: Autorizație construire (PDF max 5MB)
- Stocare temporară IndexedDB (există `indexed-db.js`); cu hash SHA-256 pe fișier la upload.
- Integrare în Step1Identification.jsx prin tab nou "Documente client".
- Validare condiționată: dacă `building.yearBuilt >= 1995` → Cartea Tehnică obligatorie cu blocaj export Step6.

**Test plan** (+10 teste):
- 4 unit DocumentUploadCenter: validate PDF magic, max size, hash determinist
- 3 integration Step1: blocaj export dacă lipsește
- 3 IndexedDB: salvare + retrieve + cleanup

**Estimare ore**: 14-18h.

---

## P0-06 — Procesul-verbal recepție upload

**Status curent**: ❌ complet lipsă
**Cale fișier afectat**: `DocumentUploadCenter.jsx` (vezi P0-05) Slot 2
**Problemă**: PV recepție e document obligatoriu pentru clădiri ≥1995 (HG 273/1994 Art. 17). Lipsa lui blochează emitere CPE post-receptie pentru construcții noi.

**Diff abstract**: Slot 2 în DocumentUploadCenter (vezi P0-05). Validare condiționată dacă `building.scopCpe === "receptie"` → PV obligatoriu cu blocaj.

**Test plan** (+4 teste): inclus în P0-05.

**Estimare ore**: 3-4h (incrementeaza P0-05).

---

## P0-07 — Releveu actualizat upload (PDF/DWG)

**Status curent**: ❌ complet lipsă (există IFC opțional ca alternativă, dar 95% auditori RO nu folosesc IFC)
**Cale fișier afectat**: `DocumentUploadCenter.jsx` Slot 3
**Problemă**: Releveul actualizat e baza pentru calculul anvelopei; fără el, valorile A_envelope/A_useful sunt presupuneri. Multe clădiri 1980-2000 au planuri arhive INMI dar nu releveu actual.

**Diff abstract**: Slot 3 cu suport PDF + DWG (folosește `dxf-parser` deja existent în deps pentru extracție geometrică opțională).

**Test plan** (+4 teste): upload PDF, upload DWG, validare dimensiuni geometrice extrase din DXF, integrare cu Step2 wizard.

**Estimare ore**: 6-8h.

---

## P0-08 — Avize ANCPI / ISC / monumente upload (zone protejate)

**Status curent**: ❌ complet lipsă
**Cale fișier afectat**: `DocumentUploadCenter.jsx` Slot 4-5-6 (3 slot-uri condiționate)
**Problemă**: Zone urbane protejate (centru istoric Brașov / Sibiu / București), monumente (Patrimoniu UNESCO RO 7 zone), zone seismice cat I (București / Buzău / Vrancea) — necesită avize speciale. Lipsa lor face renovarea ilegală.

**Bază legală**: Legea 422/2001 (monumente), L.50/1991 (autorizare), L.346/2004 (clădiri seismice).

**Diff abstract**:
- 3 slot-uri condiționate în DocumentUploadCenter:
  - ANCPI dacă `building.protectedZone === true` (auto-detect via Overpass API per coordonate, există deja în external-apis.js)
  - ISC dacă scop=construire / scop=renovare_majora
  - Monumente dacă `building.heritage === true`
- Integrare cu HistoricBuildingPanel.jsx pentru workflow special clădiri istorice.

**Test plan** (+6 teste): 2 conditional logic, 2 integration Overpass detect, 2 blocaj export.

**Estimare ore**: 8-10h.

---

## P0-09 — Acord scris proprietari pentru bloc RC

**Status curent**: ❌ complet lipsă (există ApartmentListEditor pentru date apartament, nu acord)
**Cale fișier afectat**: `src/components/ApartmentListEditor.jsx` (extinde), `src/lib/owners-consent-pdf.js` (NOU)
**Problemă**: Pentru bloc RC integral (mai mult de 50% proprietari), Anexa 2 multi-apartament necesită acord scris colectiv conform Mc 001 P.III + Legea 196/2018 (asociații proprietari).

**Bază legală**: Mc 001-2022 P.III + Legea 196/2018 Art. 49.

**Diff abstract**:
- Modul nou `owners-consent-pdf.js` cu `generateOwnersConsentPdf({apartments, building, auditor})` — produce A4 PDF model acord cu listă apartamente + tabelă semnături + declarație colectivă.
- Tab nou în ApartmentListEditor "Acord proprietari" → buton "Generează model acord" + slot upload acord scanat semnat (PDF max 20MB).
- Validare: dacă `building.category === "RC" && building.scopCpe === "renovare_majora"` → acord obligatoriu cu blocaj export.

**Test plan** (+8 teste): 4 generate template, 4 validare upload + blocaj export.

**Estimare ore**: 10-14h.

---

## P0-10 — Bundle ZIP complet (CPE + RAE + Pașaport + Anexe + Manifest)

**Status curent**: ❌ butoane separate per document, nu există export bundle ZIP
**Cale fișier afectat**: `src/lib/dossier-bundle.js` (NOU), `src/steps/Step7Audit.jsx` (buton master)
**Problemă**: Auditorul descarcă 16 fișiere separate. Pentru depunere portal MDLPA (Art. 4 alin. 6 Ord. 348/2026) e nevoie de un singur ZIP cu structură standardizată: `/CPE/`, `/RAE/`, `/Pasaport/`, `/Anexe/`, `/Facturi/`, `/Manifest/` + manifest SHA-256 inclus în root.

**Bază legală**: Art. 4 alin. 6 Ord. 348/2026 (portal electronic) + ISO 14641 (arhivare).

**Diff abstract**:
- Modul nou `dossier-bundle.js` cu `generateDossierBundle({allDocs, attachments, auditor, cpeCode})` — folosește JSZip (există în deps) pentru construire ZIP cu structură standardizată + manifest.txt + manifest.txt.p7s la root.
- Buton master "📦 Descarcă dosar complet ZIP" în Step7Audit.jsx (înlocuiește/completează cele 16 butoane individuale).
- Pre-validare: toate documentele obligatorii prezente (CPE+RAE+FIC+DCA+Manifest) → altfel blocaj cu listă lipsuri.

**Test plan** (+10 teste): 4 ZIP structure, 4 manifest integration, 2 validare lipsuri.

**Estimare ore**: 14-18h.

---

## P0-11 — Watermark juridic dual DEMO/SCOP DIDACTIC pe TOATE export-urile

**Status curent**: ⚠️ implementat pe CPE DOCX (Step6Certificate.jsx:1936) dar incomplet pe DCA, FIC, Pașaport, Manifest, Cover Letter
**Cale fișier afectat**: 8 fișiere export (`cover-letter-pdf.js`, `dossier-extras.js` 4 funcții, `passport-export.js`, `passport-docx.js`, `element-annex-docx.js`)
**Problemă**: Conform Sprint Pricing v6.1 + Art. 5 alin. 5 Ord. 348/2026, documentele emise în plan Free/EDU NU pot fi confundate cu documente reale. Watermark dual obligatoriu: DEMO (auditori în testare) + SCOP DIDACTIC (studenți EDU).

**Bază legală**: Art. 5 alin. 5 Ord. 348/2026 + planGating.js v6.0 watermark.

**Diff abstract**:
- Adaugă opțiune `watermarkText` la fiecare funcție export din `dossier-extras.js`, `cover-letter-pdf.js`, `passport-export.js`, `passport-docx.js`, `element-annex-docx.js`.
- În jsPDF: `doc.setTextColor(255, 200, 200, 0.3); doc.text(watermarkText, x, y, {angle: -35, fontSize: 80})` pe fiecare pagină.
- În DOCX: header XML watermark inserat la ToC level.
- Helper `getWatermarkText(plan, eduStatus)` în planGating.js → returnează `"DEMO"` / `"SCOP DIDACTIC"` / `null`.

**Test plan** (+5 teste): per fișier export, watermark prezent dacă plan free/edu, absent dacă plan paid.

**Estimare ore**: 10-12h.

---

## P0-12 — Schema OneClickRENO XML oficial (preparare adaptare)

**Status curent**: ⚠️ folosim schema proprie 0.1.0-preliminary (`src/data/renovation-passport-schema.js`)
**Cale fișier afectat**: `src/data/renovation-passport-schema.js`, `src/lib/passport-export.js:104` `passportToXml`
**Problemă**: EPBD 2024/1275 Anexa VIII cere schema XML OneClickRENO unificată EU. Termen transpunere RO: 29.V.2026 (la 23 zile de azi). Schema proprie zephren.ro/schemas/0.1.0 NU va fi acceptată la portal MDLPA.

**Bază legală**: EPBD 2024/1275 Anexa VIII + termen transpunere RO 29.V.2026.

**Diff abstract**:
- Pre-construire infrastructură pentru migrare:
  - Modul `src/data/renovation-passport-schema-v1.js` (gol acum, populat când publică ordinul MDLPA)
  - Helper `migrateLegacyToV1(legacyPassport)` în `passport-export.js` pentru conversie schema 0.1→1.0 fără pierdere date
  - Banner "⚠️ Pașaport în schema preliminary; adaptare la schema oficială MDLPA în curs (29.V.2026)" pe buton export XML
- Monitor publicare ordin MDLPA — script Node `scripts/check-mdlpa-publication.js` (rulat zilnic post-25.V.2026) care detectează publicarea și trimite alert email.
- Test JSON Schema validation cu schema oficială când e disponibilă.

**Test plan** (+5 teste): 2 migrate legacy→v1 backward-compat, 2 validare AJV cu schema mock, 1 banner UI.

**Estimare ore**: 8-10h pre-publicare + 4-6h post-publicare adaptare chirurgicală.

---

## Recapitulare P0

| # | Item | Ore | Tests |
|---:|---|---:|---:|
| 01 | PDF/A-3 strict CPE+RAE | 35-45 | +22 |
| 02 | PAdES B-LT semnături QTSP | 30-40 | +18 |
| 03 | CAdES B-T detașat Manifest | 12-16 | +8 |
| 04 | Cerere oficială client | 6-8 | +5 |
| 05 | Cartea Tehnică upload | 14-18 | +10 |
| 06 | PV recepție upload | 3-4 | +0 (inclus 05) |
| 07 | Releveu actualizat upload | 6-8 | +4 |
| 08 | Avize ANCPI/ISC/monumente | 8-10 | +6 |
| 09 | Acord proprietari RC | 10-14 | +8 |
| 10 | Bundle ZIP complet | 14-18 | +10 |
| 11 | Watermark dual TOATE export | 10-12 | +5 |
| 12 | Schema OneClickRENO preparare | 8-10 | +5 |

**Total**: 156-203h (~25 zile efective dezvoltator senior), +101 teste.

## Ordine cronologică implementare (dependențe)

1. **Săptămâna 1**: P0-05 + P0-06 + P0-07 + P0-08 + P0-09 + P0-04 = DocumentUploadCenter complet (40-50h)
2. **Săptămâna 2**: P0-01 PDF/A-3 + P0-11 watermark = 45-57h
3. **Săptămâna 3**: P0-02 PAdES + P0-03 CAdES = 42-56h
4. **Săptămâna 4**: P0-10 bundle ZIP + P0-12 schema preparare = 22-28h + integrare + tests + docs

## Riscuri identificate

- **R1 (HIGH)**: Vercel limit 12 funcții → P0-01 Opțiunea B necesită upgrade Pro 49 USD/lună sau split `import-document.js` în 2 (extragere `analyze-drawing.js` din `_deferred/`).
- **R2 (HIGH)**: QTSP RO API stability — certSIGN are downtime ocazional (~2-3 incidente/an); fallback DigiSign ca QTSP secundar.
- **R3 (MEDIUM)**: Schema OneClickRENO oficială poate fi publicată DUPĂ 29.V.2026 (delay frecvent în RO); pregătim migrare incremental.
- **R4 (MEDIUM)**: Performance — bundle ZIP cu 16 documente + atașamente poate depăși 50MB → trigger limit Vercel POST 4.5MB.
- **R5 (LOW)**: Browser compat — Web Crypto SubtleCrypto pentru SHA-256 ok pe toate moderne; pentru CAdES P7S avem fallback Node forge.
