# P2 MEDIUM — 16 itemi input nerezidențial + extensii

**Sprint propus**: Sprint Input Nerezidențial + Extensii P2 (2-3 săptămâni)
**Estimare ore**: ~75-100h
**Teste noi propuse**: +90
**Total cumulativ post-P0+P1+P2**: ~3074 → ~3164 PASS
**Trigger lansare**: după P0+P1 sau strategic devreme dacă auditorii NR (clienți Expert+) cer urgent. Dependențe minime cu P0/P1.

---

## P2-01 — BACS inventory upload (NR)

**Status curent**: ⚠️ doar BACSSelectorSimple cu clase A-D
**Cale fișier afectat**: `src/components/BACSInventoryUpload.jsx` (NOU), `DocumentUploadCenter.jsx` extindere
**Problemă**: Nerezidențial cere inventory complet ISO 52120-1 (200 factori × 5 sisteme). Auditorii NR exportă din BMS în CSV/Excel; Zephren trebuie să accepte upload + parse.

**Bază legală**: ISO 52120-1:2022 + Mc 001-2022 §4.5 + Sprint 5 BACS deja implementat.

**Diff abstract**:
- Component nou cu drop-zone CSV/XLSX (auto-parse coloane: SystemId, FunctionId, ClassA/B/C/D, ImplementedClass)
- Helper `parseBACSInventory(csvText)` cu mapping pe ISO 52120 services
- Auto-populate BACSSelectorSimple după upload + diff visual între curent (manual) și inventory (auto)
- Validare: ISO codes corecte, classification flux

**Test plan** (+8 teste): parse CSV/XLSX, mapping ISO codes, diff inventory vs manual.

**Estimare ore**: 8-10h.

---

## P2-02 — LENI baseline upload + zone iluminat (NR)

**Status curent**: ⚠️ calc en15193-lighting există; baseline upload lipsă
**Cale fișier afectat**: `src/components/LENIBaselineUpload.jsx` (NOU)
**Problemă**: NR cere LENI per zonă (birou / coridor / subsol / sală conferință) — nu doar agregat. Upload măsurători cu luxmetru (CSV) + plan zonal.

**Diff abstract**: Upload CSV (zona, suprafață, lux mediu, ore funcționare/an) + plan zonal opțional PDF. Auto-calcul LENI per zonă conform EN 15193-1 Anexa F.

**Test plan** (+8 teste): zone parsing, LENI calc per zonă, integrare en15193-lighting.

**Estimare ore**: 8-10h.

---

## P2-03 — Program funcționare upload (NR)

**Status curent**: ⚠️ doar input ore în Step5 (date generale)
**Cale fișier afectat**: `src/components/ScheduleUpload.jsx` (NOU)
**Problemă**: NR cere schedule detaliat: program zilnic (orar deschis/închis) × programe sezoniere (vară/iarnă) × zilnic vs weekend. Upload Excel cu sheet-uri orare.

**Diff abstract**: Upload XLSX cu structura standard (sheet1=Lucru, sheet2=Weekend, sheet3=Concedii) → auto-extract cu exceljs (deja în deps) → integrare cu calc EP NR (use multipliers).

**Test plan** (+6 teste): XLSX parse, schedule structure, integration EP calc.

**Estimare ore**: 6-8h.

---

## P2-04 — Dosar BMS / sub-metering (NR)

**Status curent**: ❌
**Cale fișier afectat**: `src/components/BMSDossierUpload.jsx` (NOU)
**Problemă**: NR avansat (Expert+ tier) cere matrice puncte BMS + schemă topologie + lista sub-contoare. Documentație tehnică pentru calcul real EP.

**Diff abstract**: Upload PDF/JSON BMS + schemă topologie SVG/PDF. Modul bonus `parseModbusPoints(json)` pentru integrare BACS detaliat.

**Test plan** (+5 teste): upload PDF + JSON, parsing fundamental.

**Estimare ore**: 5-6h.

---

## P2-05 — Contracte service HVAC upload (NR)

**Status curent**: ❌
**Cale fișier afectat**: `DocumentUploadCenter.jsx` Slot extindere
**Problemă**: NR avansat cere contracte service HVAC (anuale, dovezile mentenanței recurente). Acestea afectează randamentele estimate (cazan service la zi → η+5%).

**Diff abstract**: 1 slot upload PDF (max 5MB per contract) + auto-detect (heating/cooling/ventilation/IT cooling) + UI display tabel "contracte active" + factor randament ajustat.

**Test plan** (+4 teste): upload, parsing tip contract, factor η ajustare.

**Estimare ore**: 5-6h.

---

## P2-06 — Releveu iluminat upload (NR)

**Status curent**: ❌
**Cale fișier afectat**: `LENIBaselineUpload.jsx` (extinde din P2-02)
**Problemă**: Diferit de baseline LENI: e harta măsurătorilor luxmetru pe plan (poză + coordonate). Pentru clădiri mari (>2000 m²), e document distinct.

**Diff abstract**: Upload CSV (id_punct, x_m, y_m, lux, lux_target, conformitate) + opțional plan PDF cu puncte marcate. Auto-calculat conformitate uniformă (Uo) per zonă.

**Test plan** (+5 teste): parse coords, Uo calc, integrare LENI.

**Estimare ore**: 6-8h.

---

## P2-07 — Plan amplasament cu rețele (NR + RC)

**Status curent**: ❌
**Cale fișier afectat**: `DocumentUploadCenter.jsx` Slot extindere
**Problemă**: Pentru NR mari + bloc RC, plan situație cu rețele (gaz / termoficare / apă / electrică) e necesar pentru calcul costuri reabilitare + verificare alternative (district heating proximitate).

**Diff abstract**: 1 slot upload PDF/DWG plan amplasament + integrare cu Step4 proximitate DH (există deja calc 30 km GPS).

**Test plan** (+4 teste): upload, integrare DH proximity.

**Estimare ore**: 4-5h.

---

## P2-08 — Audit precedent upload + extracție date

**Status curent**: ❌
**Cale fișier afectat**: `src/components/PriorAuditUpload.jsx` (NOU), `src/lib/prior-audit-parser.js` (NOU)
**Problemă**: Pentru clădiri reabilitate parțial (frecvent în portfolio), auditul precedent dă baseline EP_pre. Upload PDF audit anterior + extracție Eᵢ, U, η pentru pre-fill.

**Diff abstract**: Upload PDF audit precedent + parser helper care extrage tabele cheie (folosește Claude Vision via api/ocr-cpe.js extension sau on-device pdf.js). Pre-populare Step5 cu valori istorice + flag "before vs after".

**Test plan** (+6 teste): parse PDF, extract tabele, pre-fill.

**Estimare ore**: 8-10h.

---

## P2-09 — Plan apartament + plan etaj (RC)

**Status curent**: ❌ (P0-09 acoperă acord, nu planuri)
**Cale fișier afectat**: `ApartmentListEditor.jsx` extindere
**Problemă**: Pentru CPE apartament în RC, auditorul are nevoie de plan apartament + plan etaj (situare). Dacă lipsesc, tip apartament + suprafață sunt presupuneri.

**Diff abstract**: 2 slot-uri upload per apartament în ApartmentListEditor (plan + situare etaj). PDF/DWG max 5MB.

**Test plan** (+4 teste): upload per apartament, validare obligatoriu.

**Estimare ore**: 4-6h.

---

## P2-10 — Repartiție apă/încălzire RC (vert/oriz)

**Status curent**: ❌
**Cale fișier afectat**: `ApartmentListEditor.jsx` extindere
**Problemă**: Bloc RC cu repartiție verticală vs orizontală afectează calc per apartament (costurile termice individuale vs proporționale). Lipsă select tip + upload schemă.

**Diff abstract**: Select tip distribuție (vert/oriz/mixt) + upload schemă PDF max 2MB. Integrare calc apartament cu tip distribuție selectat.

**Test plan** (+3 teste): select + upload + integrare calc.

**Estimare ore**: 3-4h.

---

## P2-11 — Detalii anvelopă bloc / fațadă comună (RC)

**Status curent**: ⚠️ parțial via Step2Envelope (general)
**Cale fișier afectat**: `Step2Envelope.jsx` extindere RC mode
**Problemă**: Pentru bloc RC, anvelopa e comună (fațadă întreagă), dar wizard tratează ca apartament individual. Necesită flag RC + secțiuni constructive PDF (detalii noduri).

**Diff abstract**: În Step2Envelope, dacă `building.category === "RC"`, banner "RC integral - introduceți date pentru fațada comună" + 1 slot upload secțiuni constructive PDF.

**Test plan** (+3 teste): RC banner, upload, integrare calc anvelopă.

**Estimare ore**: 4-5h.

---

## P2-12 — Documente vechi termice (regiuni climatice)

**Status curent**: ⚠️ Step2Envelope CSV import generic
**Cale fișier afectat**: `Step2Envelope.jsx` documentare zone climatice
**Problemă**: Pentru clădiri vechi (1960-1990), normativele vechi termice (C107/82, C107/85, C107/97) impun valori U specifice pe zone climatice. Lipsă context juridic + comparație cu cerințele actuale.

**Diff abstract**: Banner informativ în Step2Envelope cu valori U_max istorice per normativ × zonă climatică (tabular). Buton "Verifică conformitatea istorică" cu rezultat A/B/C/D.

**Test plan** (+4 teste): mapping normativ vechi, conformare A/B/C/D.

**Estimare ore**: 5-6h.

---

## P2-13 — Foto-documentare clădire istorică (categorisire)

**Status curent**: ⚠️ BuildingPhotos generic
**Cale fișier afectat**: `BuildingPhotos.jsx` extindere (există) + HistoricBuildingPanel.jsx integrare
**Problemă**: Pentru clădiri istorice (Patrimoniu UNESCO RO + monument LMI), foto-documentarea trebuie categorisită: detalii tâmplărie, finisaje exterioare/interioare, elemente decorative (frize / cornișe / coloane). Compatibil cu cerințe DJC (Directia Judeteană Cultură).

**Diff abstract**: În BuildingPhotos.jsx adaugă category select per foto (tâmplărie / finisaj / decorativ / structural / altele). Integrare cu HistoricBuildingPanel pentru tag "monument" → activare panou special.

**Test plan** (+5 teste): categorize foto, monument flag integration.

**Estimare ore**: 4-6h.

---

## P2-14 — Document financiare detaliate (contracte furnizare energie)

**Status curent**: ⚠️ InvoiceOCR pentru facturi singulare
**Cale fișier afectat**: `InvoiceOCR.jsx` extindere
**Problemă**: Auditori NR avansați au contracte furnizare cu termeni speciali (PPA, ToU pricing, demand charge). Facturile sunt insuficiente; contracte PDF necesare.

**Diff abstract**: În InvoiceOCR, extindere cu tab "Contracte furnizare" + upload PDF contract + parser dedicate (Claude Vision) pentru ToU/PPA terms. Output: factor preț pe interval orar.

**Test plan** (+6 teste): parse contract, ToU detection, factor preț.

**Estimare ore**: 8-10h.

---

## P2-15 — Sub-categorisare scope CPE (validitate avansată)

**Status curent**: ⚠️ Step1 are scopCpe simplu (vânzare/închiriere/recepție/informare/renovare/alt)
**Cale fișier afectat**: `Step1Identification.jsx`, `cpe-validity.js`
**Problemă**: Sub-categorii lipsesc: vânzare bunuri imobile (notari) vs vânzare drepturi reale (uzufruct), închiriere comercială vs locuință, recepție DTAC vs receptie finală etc. Afectează valabilitate (5 vs 10 ani) + cerințe specifice MDLPA.

**Diff abstract**: Refactor scopCpe în 2 nivele: scopMain (vânzare/închiriere/recepție/...) + scopSub (drepturi imobiliare / drepturi reale / DTAC / finală / ...). Update getValidityYears cu logică sub-scope.

**Test plan** (+7 teste): combinatorice main+sub, validitate per combinație.

**Estimare ore**: 6-8h.

---

## P2-16 — Notificări auditor expirare atestat + drept practică

**Status curent**: ⚠️ există calc `getAttestationStatus` în auditor-attestation-validity.js, dar nu notificări proactive
**Cale fișier afectat**: `src/components/AuditorExpiryNotifier.jsx` (NOU), Sidebar global
**Problemă**: Atestat MDLPA expiră 5 ani (Art. 30 alin. 3 Ord. 348/2026); fereastră renewal 30-90 zile pre-expirare (Art. 31 alin. 1). Auditori uită → semnături blocate. Notificare automată = retention + valoare premium.

**Diff abstract**: Component nou cu calc days_until_expiry (există) + banner sidebar cu countdown + email opțional via Vercel cron + Resend (dacă plan Birou+). Banner severitate: > 90 zile (verde) / 30-90 (amber) / <30 (red, blocaj parțial export).

**Test plan** (+8 teste): countdown, severity levels, banner UI.

**Estimare ore**: 6-8h.

---

## Recapitulare P2

| # | Item | Ore | Tests |
|---:|---|---:|---:|
| 01 | BACS inventory upload | 8-10 | +8 |
| 02 | LENI baseline + zone | 8-10 | +8 |
| 03 | Program funcționare XLSX | 6-8 | +6 |
| 04 | Dosar BMS sub-metering | 5-6 | +5 |
| 05 | Contracte service HVAC | 5-6 | +4 |
| 06 | Releveu iluminat | 6-8 | +5 |
| 07 | Plan amplasament rețele | 4-5 | +4 |
| 08 | Audit precedent + extracție | 8-10 | +6 |
| 09 | Plan apartament + etaj RC | 4-6 | +4 |
| 10 | Repartiție apă/încălzire RC | 3-4 | +3 |
| 11 | Detalii anvelopă bloc RC | 4-5 | +3 |
| 12 | Documente vechi termice | 5-6 | +4 |
| 13 | Foto-doc clădire istorică | 4-6 | +5 |
| 14 | Contracte furnizare energie | 8-10 | +6 |
| 15 | Sub-categorisare scope CPE | 6-8 | +7 |
| 16 | Notificări expirare atestat | 6-8 | +8 |

**Total**: 90-126h (~15-20 zile dezvoltator senior), +96 teste.

## Ordine cronologică recomandată

1. **Săptămâna 1**: P2-01..04 (toate input NR principale) + P2-09..11 (RC apartament)
2. **Săptămâna 2**: P2-05..08 (input NR avansat + audit precedent + plan amplasament)
3. **Săptămâna 3**: P2-12..16 (extensii și clean-up)

## Riscuri identificate

- **R1 (MEDIUM)**: Volumul de upload-uri va impacta IndexedDB cu fișiere mari (>50MB blocuri RC). Mitigare: stocare temp cu cleanup auto la 7 zile + opțiune Cloud Sync (Pro+).
- **R2 (MEDIUM)**: Schema BACS inventory variabilă per BMS vendor (Honeywell vs Siemens vs Schneider) — poate necesita parsers custom. Începem cu format CSV generic + ISO 52120 mapping.
- **R3 (LOW)**: Program funcționare XLSX cu structuri non-standard — fallback editor manual dacă parse eșuează.
- **R4 (LOW)**: Audit precedent extracție via Claude Vision — costuri token estimate ~0.05 USD per audit. Acceptabil pentru tier Pro+.
