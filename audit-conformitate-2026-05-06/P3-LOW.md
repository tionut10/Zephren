# P3 LOW — 8 itemi nice-to-have construcție nouă + extensii

**Sprint propus**: Sprint Construcție Nouă + Industrial P3 (1-2 săptămâni, opțional)
**Estimare ore**: ~50-70h
**Teste noi propuse**: +45
**Total cumulativ post-P0+P1+P2+P3**: ~3164 → ~3209 PASS
**Trigger lansare**: după P0+P1+P2 SAU strategic dacă apare client real construcție nouă mare (ex: ansamblu rezidențial >100 unități, mall, hotel).

---

## P3-01 — Studiu ZEB ⚠️ (post-2030 EPBD 2024)

**Status curent**: ❌ avem ZEB_THRESHOLDS în u-reference.js dar fără document distinct
**Cale fișier afectat**: `src/lib/zeb-study-pdf.js` (NOU), `report-generators.js` extindere
**Problemă**: Post-2030 EPBD 2024/1275 cere clădiri publice noi ZEB (Zero Emission Building) — mai strict decât nZEB (RER ≥ 70%, EP_nren = 0). Studiu de fezabilitate ZEB e document distinct A4 PDF.

**Bază legală**: Art. 9 alin. 1 EPBD 2024/1275 (post-1.I.2030 clădiri publice noi) + L.238/2024 transpunere.

**Diff abstract**: Modul nou cu `generateZebStudyPdf({building, climate, scenarios, renew, ...})` — A4 PDF cu: definiție ZEB vs nZEB, calcul EP_nren și RER, comparație 3 scenarii (current / nZEB target / ZEB target), recomandări auditor. Folosește ZEB_THRESHOLDS deja existent.

**Test plan** (+6 teste): ZEB threshold logic, scenarios, PDF structure.

**Estimare ore**: 8-10h.

---

## P3-02 — Note Cartea Tehnică (B1) — fază execuție

**Status curent**: ❌
**Cale fișier afectat**: `src/lib/cartea-tehnica-notes-pdf.js` (NOU)
**Problemă**: Pentru construcții noi, post-execuție auditorul produce note pentru Cartea Tehnică (specificații finale, abateri vs proiect, măsurători n50 / U / kWh test). Document obligatoriu HG 273/1994 Art. 17.

**Diff abstract**: Modul nou cu `generateCarteaTehnicaNotesPdf({building, deviations, measurements, auditor})` — A4 PDF cu sumar specificații implementate vs proiect + 3 măsurători cheie (n50, etanșeitate, EP final).

**Test plan** (+5 teste): PDF generate, deviations table, measurements format.

**Estimare ore**: 6-8h.

---

## P3-03 — Foto-album construcții noi (B2)

**Status curent**: ⚠️ BuildingPhotos generic
**Cale fișier afectat**: `src/components/PhotoAlbumExport.jsx` (NOU)
**Problemă**: Foto-albumul construcții noi e document distinct (≥30 fotografii: săpături / fundație / structură / anvelopă / instalații / finisaje) cu data, locație GPS, descriere. PDF A4 cu poze 4x4 + caption.

**Diff abstract**: Component cu drag-and-drop multi-photo + categorisire (faze execuție 6 categorii) + export PDF A4 cu layout grid 4×4 + EXIF GPS + timestamp + caption auto-generat. Folosește pdf-lib.

**Test plan** (+5 teste): photo upload, categorisare, PDF grid layout, EXIF read.

**Estimare ore**: 6-8h.

---

## P3-04 — Inserare Cartea Tehnică (C8) — fază recepție

**Status curent**: ❌
**Cale fișier afectat**: `src/lib/ct-insertion-doc.js` (NOU)
**Problemă**: Document de inserare în Cartea Tehnică la receptie finală. Combinație CPE final + RAE final + foto-album + note CT — toate într-un singur dosar A4 portret (~80-120 pagini).

**Diff abstract**: Modul nou care agregă output-uri P3-01..03 + CPE+RAE final într-un dosar PDF unic cu numerotare continuă + cuprins + index foto.

**Test plan** (+4 teste): aggregare 5 documente, numerotare, cuprins.

**Estimare ore**: 8-10h.

---

## P3-05 — IFC4 export complet (BIM integrare)

**Status curent**: ⚠️ ifc-export.js există dar limitat (geometric basic, nu IFC4 cu Energy AddView)
**Cale fișier afectat**: `src/lib/ifc-export.js` extindere
**Problemă**: Pentru proiecte BIM mari (ansambluri rezidențiale, mall-uri), auditorul are nevoie de export IFC4 cu Energy AddView (calcul integrat). Standard ISO 16739-1:2024.

**Bază legală**: ISO 16739-1:2024 + EU BIM Mandat 2030.

**Diff abstract**: Extindere ifc-export.js cu IfcThermalLoad + IfcEnergyResource + Energy AddView attributes. Folosește web-ifc (deja în deps).

**Test plan** (+6 teste): IFC4 schema validation, Energy AddView attrs, geom + thermal data.

**Estimare ore**: 12-16h.

---

## P3-06 — ENERGOBILANȚ MO industrial

**Status curent**: ❌
**Cale fișier afectat**: `src/lib/energobilant-mo-pdf.js` (NOU)
**Problemă**: Pentru clădiri industriale (clasa "AL" / industrii energo-intensive), ENERGOBILANȚUL MO cere format specific (consum agregat per proces / pe ore / pe sezon). Nu e CPE clasic.

**Bază legală**: HG 122/2024 (eficiență energetică industrii energo-intensive) + L.121/2014.

**Diff abstract**: Modul nou pentru clădiri industriale cu input: procese principale (lista), consum per proces (kWh/an), pondere energetică, indicatori specifici. Output PDF A4 cu format ENERGOBILANT MO standard.

**Test plan** (+4 teste): industrial flow, MO format, indicatori specifici.

**Estimare ore**: 6-8h.

---

## P3-07 — Multi-tenant analytics dashboard (cross-cliente)

**Status curent**: ⚠️ există PortfolioDashboard.jsx pentru 1 user; cross-tenant lipsă
**Cale fișier afectat**: `src/components/MultiTenantAnalytics.jsx` (NOU), `supabase/migrations/...sql`
**Problemă**: Pentru proprietar Zephren (operator) + clienți Birou/Enterprise — vizualizare cross-tenant agregată (volum auditori per județ, pattern consum NR, benchmark național).

**Diff abstract**: Component cu Supabase queries cross-table (ANONYMIZED) — agregare volum CPE/RAE per județ, distribuție clase energetice, top 10 categorii intervenție. Necesită migrare Supabase RLS policies.

**Test plan** (+6 teste): RLS policies, agregare anonimă, dashboard rendering.

**Estimare ore**: 8-12h.

---

## P3-08 — POR/FTJ/Modernization Fund/UAT — workflow asistat

**Status curent**: ⚠️ P1-06..09 produc bundle-urile, dar fără workflow ghidat
**Cale fișier afectat**: `src/components/FundingWizard.jsx` (NOU)
**Problemă**: Auditorii noi au nevoie de wizard pas-cu-pas pentru fiecare program (eligibilitate / cerințe / deadline / template). Reduce timp aplicare cu 30-50%.

**Diff abstract**: Component wizard 5 pași per program (selecție program / verificare eligibilitate / pre-completare / generare bundle / submit ghid). Folosește FundingBundlePanel din P1.

**Test plan** (+5 teste): wizard flow, eligibility check, bundle integration.

**Estimare ore**: 6-8h.

---

## Recapitulare P3

| # | Item | Ore | Tests |
|---:|---|---:|---:|
| 01 | Studiu ZEB ⚠️ post-2030 | 8-10 | +6 |
| 02 | Note Cartea Tehnică (B1) | 6-8 | +5 |
| 03 | Foto-album construcții noi (B2) | 6-8 | +5 |
| 04 | Inserare CT (C8) | 8-10 | +4 |
| 05 | IFC4 export complet | 12-16 | +6 |
| 06 | ENERGOBILANȚ MO industrial | 6-8 | +4 |
| 07 | Multi-tenant analytics | 8-12 | +6 |
| 08 | Funding workflow wizard | 6-8 | +5 |

**Total**: 60-80h (~10-13 zile dezvoltator senior), +41 teste.

## Ordine cronologică recomandată (opțional)

1. **Săptămâna 1**: P3-01 + P3-02 + P3-03 + P3-04 (construcție nouă pipeline complet)
2. **Săptămâna 2 (parțială)**: P3-05 IFC4 (BIM) + P3-06 industrial + P3-08 wizard
3. **Săptămâna 3 (eventual)**: P3-07 multi-tenant (depinde decizie arhitectură Supabase)

## Riscuri identificate

- **R1 (LOW)**: Volum redus utilizatori construcție nouă în RO — ROI scăzut comercial. Mitigare: P3 NU este blocant; lansare doar la cerere.
- **R2 (LOW)**: IFC4 schema mare — possible bundle bloat (~500KB web-ifc full). Mitigare: dynamic import.
- **R3 (LOW)**: Multi-tenant analytics necesită Supabase RLS riguros — risc leak data clienți. Mitigare: external audit înainte de lansare.

## Decizie strategică

**Recomand AMÂNARE P3** până când:
- Există minim 5 clienți activi cu construcții noi în pipeline (ROI direct)
- Sau apare proiect mare BIM care cere IFC4 (Hotel / Mall / Ansamblu rez.)
- Sau Zephren atinge 50+ auditori plătiți (multi-tenant analytics relevant)

P0 + P1 + P2 acoperă **~95%** din cerințele auditorilor MDLPA RO existenți. P3 e pentru segmentele de nișă (construcții noi mari + industrial).
