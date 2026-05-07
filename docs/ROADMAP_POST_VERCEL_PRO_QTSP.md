# Roadmap restanțe — post tranziție subscripții plătite

**Data**: 7 mai 2026
**Status la creare**: Sprint Conformitate P0+P1+P2+P3 + Integrare UI completă LIVE producție.
**Trigger reactivare**: după upgrade Vercel Pro ($49/lună) + onboarding cont QTSP RO (certSIGN PARAPHE) + decizie Supabase RLS pentru multi-tenant.

---

## 📌 Status actual la 7 mai 2026

**Live producție** (https://energy-app-ruby.vercel.app):
- 13 commits Sprint Conformitate push-uite pe master
- 3140/3140 teste PASS
- Acoperire conformitate ~95% (44/50 itemi)
- 17 module noi în `src/lib/` + 1 component nou + 6 integrări UI vizibile
- Build Vite 16.31s OK
- Zero regresii pe fluxurile existente

**Deploy-uri Vercel**:
- `dpl_FcXEzQbr1xCXF463idNkzMwSR2da` (P0)
- `zephren-dqpms3t2v` (P1)
- `zephren-3gmnrf1zp` (P2)
- `zephren-fhgmyv3fw` (P3)
- `zephren-p84brzjoa` (integrare UI finală)

**Aliasul de producție** propagat la toate cele 5 deploy-uri.

---

## 🔴 P0 — Blocant lansare comercială strictă (post-onboarding)

### 1. Onboarding certSIGN PARAPHE (decizie business)
**Acțiuni utilizator**:
- [ ] Cont B2B la certSIGN (formular înrolare API → `commercial@certsign.ro`)
- [ ] Pachet PARAPHE Starter (~150 EUR/lună, 1.000 semnături) sau Sandbox test 30 zile gratuit
- [ ] Setare în Vercel project env vars:
  - `CERTSIGN_CLIENT_ID` (~32 chars)
  - `CERTSIGN_CLIENT_SECRET` (~64 chars, rotire 90 zile)
  - `CERTSIGN_API_BASE` (default `https://api.certsign.ro/api`)

**Acțiuni dezvoltator post-credentials**: 1-2h smoke test live cu provider real + activare default `provider: "certsign"` în Card BETA Step 6.

**Documentație existentă**: `docs/CERTSIGN_SETUP.md` (ghid complet onboarding).

### 2. Upgrade Vercel Pro ($49/lună) — deblochează 3 funcționalități
- [ ] Upgrade din Vercel Dashboard
- [ ] Reactivare endpoint-uri din `api/_deferred/`:
  - `energy-prices-live.js` (scrape OPCOM PZU + ENTSOE)
  - `anre-tariff-scrape.js` (scrape comparator ANRE — Vercel cron lunar)
- [ ] Endpoint nou `api/qtsp-proxy.js` pentru certSIGN cu cert chain real (~3-4h)
- [ ] Endpoint nou `api/pdfa-convert.py` cu LibreOffice headless + pikepdf pentru P1-01/02 dual format (~6-8h)

### 3. Profil sRGB ICC v2 real (~3KB)
**Status**: placeholder gol în `src/data/icc-srgb-profile.js`.
- [ ] Descarc fișier sRGB v2 oficial de pe https://www.color.org/srgbprofiles.xalter
- [ ] Encode base64 → populez `SRGB_ICC_PROFILE_BASE64`
- [ ] Verificare validare strictă veraPDF pentru CPE cu imagini color
**Estimare**: 30 min.

### 4. P1-01/02 Dual format DOCX + PDF/A-3 nativ CPE/RAE (post Vercel Pro)
- [ ] Endpoint `api/pdfa-convert.py` cu pipeline DOCX → LibreOffice → PDF → pikepdf PDF/A-3
- [ ] Adăugare param `outputFormat: "docx" | "pdf-a3" | "both"` la `api/generate-document.py`
- [ ] UI Step 6 Card export → opțiune format selector
**Estimare**: 8-12h post-upgrade Vercel Pro.

### 5. Verificare browser POST-integrare UI masivă (B1-B7)
**Netestate live**:
- [ ] DocumentUploadCenter Step 1 (18 sloturi + IndexedDB upload)
- [ ] Buton „📜 Cerere oficială" AuditClientDataForm
- [ ] Banner expiry sidebar (cu auditor.attestationIssueDate setat)
- [ ] Buton „🌐 Export XML portal (NEW)" Step 6
- [ ] Step 7 Card master „🌱 Conformitate avansată" (3 sub-componente)
- [ ] Step 8 tab nou „🏗️ Construcție nouă" (4 butoane)
- [ ] passport-export schemaVersion: "1.0" (XML namespace v1)

**Estimare**: 30-45 min cu Chrome MCP autonom.

---

## 🟡 P1 — High impact, decizie strategică

### 6. Watermark refactor 8 fișiere export
**Modul `watermark.js` există**. Refactor să folosească `autoWatermark()` în:
- `cover-letter-pdf.js`
- `dossier-extras.js` (FIC + DCA + Manifest + M&V Op.C + M&V Avansat)
- `passport-export.js`
- `passport-docx.js`
- `element-annex-docx.js`
**Ore**: 2-3h | **Risc**: moderat (8 fișiere export critice; testare regresie atentă)
**Beneficiu**: cod centralizat + watermark consistent + cleanup duplicate.

### 7. scopCpe sub-categorii dropdown (P2-15)
**Modul `cpe-scope-subcategory.js` există**. Refactor select scopCpe în Step 1 din 1 → 2 dropdowns dependente:
- Dropdown 1: scopMain (vânzare/închiriere/recepție/informare/renovare/construire/alt)
- Dropdown 2: scopSub (depinde de scopMain)
- Validitate CPE auto-actualizată via `getValidityForScopAndClass`
**Ore**: 2h | **Risc**: moderat (modifică câmp `building.scopCpe` folosit în 8+ locații)
**Backward-compat**: păstrăm `scopCpe` ca string simplu + adăugăm `scopCpeSub` opțional.
**Beneficiu**: precizie validitate 5/10 ani per combinație juridică.

### 8. prior-audit-parser cu Claude Vision API (alternativă pdfjs)
**Modul `prior-audit-parser.js` există** cu fallback grace pdfjs. Opțiune **mai bună** fără bundle bloat:
- [ ] Extindere `api/ocr-cpe.js` (existing) cu endpoint `/api/parse-prior-audit`
- [ ] Apel Claude Vision API cu prompt pentru extracție EP/U/η/n50 din PDF audit
- [ ] Cost estimat: ~0.05 USD per audit
- [ ] Pre-fill modal Step 1 după upload în slot AUDIT_PRECEDENT
**Ore**: 2-3h | **Risc**: minim (folosește endpoint existent).

### 9. Foto-album BuildingPhotos store integration
**Modul `generatePhotoAlbumPdf` din construction-docs-pdf.js** primește array gol.
- [ ] Hook nou `useBuildingPhotosForAlbum()` care citește din BuildingPhotos store
- [ ] Transmitere automată la generator în Step 8 tab Construcție nouă
- [ ] Categorisire foto: dropdown lângă upload (săpături/structură/anvelopă/etc.)
**Ore**: 1-2h | **Risc**: minim.

---

## 🟠 P2 — Restanțe pre-Sprint Conformitate (din MEMORY.md)

### 10. Sprint P2 Renewable Catalog (1 mai 2026 — 6 task-uri ~15-20h)
**Status MEMORY.md**: ⏸️ PENDING explicit, „NU lansa autonom".
**Conține**:
- Filtrare per scope clădire în dropdown-uri Step 4
- Display CHP + Storage cards cu specs
- Eligibilitate Casa Verde Plus marker + badge UI verde + filtru
- Integrare engine calc cu parametri EXT (solar-acm-detailed, chp-detailed)
- Brand activation UI Step 4 (modal RenewableBrandsAdmin replica)
- Telemetrie click conversii Step4.* events FIFO 1000

**Trigger reactivare**: cerere explicită utilizator / primul parteneriat regenerabil real activat / feedback auditor „prea multe opțiuni" / decizie lansare comercială Pas 4.

### 11. Sprint P3 Brand Advanced (30 apr 2026 — 6 task-uri ~25-30h)
**Status MEMORY.md**: ⏸️ PENDING explicit, „NU lansa autonom".
**Conține**:
- Backend Supabase parteneriate centralizate multi-user (~6-8h, prerequisit)
- Link clickabil afiliat direct în dropdown
- Calcul revenue affiliate per partener + report financiar lunar/trimestrial PDF
- A/B testing parteneriate cu seed deterministic per user + chi-squared
- Notificări email automatizate threshold conversii via Vercel cron + SendGrid/Resend
- Multi-tenant analytics dashboard cross-tenant

**Trigger reactivare**: primul parteneriat real activat (link + revenue urgent) / 3+ discuții parteneriat / decizie multi-tenant Zephren.

**Risc Vercel**: limit 12 funcții (deja 13/12 soft-overflow); task 1 Supabase backend necesită split sau Supabase Edge Functions.

### 12. Sprint 23 OCR facturi Claude Vision (24 apr 2026 — ~10z, P1)
**Status MEMORY.md**: AMÂNAT explicit. Conține OCR facturi via Claude Vision API.
**Decizie utilizator**: NU porni autonom, așteaptă confirmare explicită.

### 13. Restanțe amânate 24 apr 2026 (13 itemi)
**Status MEMORY.md**: documentat în `restante_amanate_24apr2026.md` — REAMINTEȘTE la întrebări „ce urmează/priorități".
**Conține**:
- 4 P0 blocante v4.0
- 3 P1 Sprint21→22
- 4 P2 sprinturi diverse
- 2 EPBD 29 mai

### 14. Sprint P3+ atașamente vizuale Pas 7 (~3-5h)
**Status MEMORY.md sprint_audit_pas7_implementation_06may2026.md**: NU lansa autonom.
**Conține**:
- Foto clădire / vedere generală (PNG/JPG upload + add_picture python-docx)
- Plan amplasament + secțiuni anvelopă (schiță arhitectură)
- Schemă instalații (diagramă HVAC)

---

## 🟢 P3 — Nice-to-have (post-lansare, segment nișă)

### 15. P3-04 Inserare Cartea Tehnică C8
Agregare 5 documente (CPE final + RAE final + foto-album + note CT + studiu ZEB) într-un dosar PDF unic ~80-120 pagini cu numerotare continuă + cuprins + index foto.
**Ore**: 8-10h.

### 16. P3-05 IFC4 export complet (BIM)
Extindere `ifc-export.js` cu IfcThermalLoad + IfcEnergyResource + Energy AddView attributes (ISO 16739-1:2024).
**Bundle bloat**: ~500KB web-ifc — necesită lazy loading agresiv.
**Ore**: 12-16h.

### 17. P3-07 Multi-tenant analytics dashboard
Cross-tenant aggregations cu Supabase RLS pentru proprietar Zephren + per-tenant pentru clienți Birou/Enterprise.
**Decizie arhitecturală**: necesar.
**Ore**: 8-12h post-decizie.

### 18. Studiu sisteme alternative & EV pre-cabling integrare UI Step 8
Modulele `special-studies-pdf.js` (P1-11/12) sunt disponibile dar **neintegrate UI**. Adăugare butoane în Step 8 sau Step 7.
**Ore**: 1-2h.

### 19. P1-13 Foaie de Parcurs standalone integrare UI
`generateFoaieParcursStandalonePdf` din `special-studies-pdf.js` neintegrat UI. Buton în Step 7 Card pașaport sau Step 6.
**Ore**: 30 min.

### 20. P1-14 Plan M&V avansat IPMVP A+B+C+D integrare UI
`generateMonitoringPlanAdvancedPdf` din `dossier-extras.js` neintegrat UI. Card nou în Step 7 cu multi-select opțiuni.
**Ore**: 1-2h.

---

## 📊 Sumar prioritar restanțe

| Prioritate | Itemi | Ore estimate | Trigger reactivare |
|---|---:|---:|---|
| **P0** (blocant comercial) | 5 | ~12-20h + onboarding | Cont certSIGN + decizie Vercel Pro |
| **P1** (high impact decizie) | 4 | ~7-10h | După P0 sau în paralel |
| **P2** (restanțe pre-Sprint) | 5 | ~50-70h | Decizie business per sprint |
| **P3** (nice-to-have lansare ulterioară) | 6 | ~30-40h | Post-lansare comercială |
| **TOTAL restanțe** | **20** | **~99-140h** | — |

---

## 🎯 Ordine recomandată reactivare (post tranziție subscripții)

### **Fază 1 — Setup business** (decizii utilizator):
1. Onboarding cont B2B certSIGN (formular + verificare)
2. Upgrade Vercel Pro $49/lună
3. Configurare env vars CERTSIGN_* în Vercel project

### **Fază 2 — Activare automată** (~10-15h dezvoltator):
4. Smoke test certSIGN real cu Card BETA Step 6
5. Endpoint `api/qtsp-proxy.js` cu DSS dictionary populat
6. Endpoint `api/pdfa-convert.py` pentru P1-01/02 dual format
7. Profil sRGB ICC v2 real activat
8. Verificare browser autonomă completă (Chrome MCP)
9. Reactivare endpoint-uri `api/_deferred/`

### **Fază 3 — Polish UX** (~5-7h):
10. Watermark refactor 8 fișiere
11. scopCpe sub-categorii dropdown
12. prior-audit-parser via Claude Vision API
13. Foto-album BuildingPhotos store hook
14. Integrare UI Studiu alternative + EV + FdP + PMV avansat (P1-11..14 modules)

### **Fază 4 — Restanțe vechi MEMORY.md** (decizie business):
15-19. Sprint P2 Renewable / P3 Brand / OCR facturi / atașamente vizuale Pas 7 — per business case.

### **Fază 5 — Nice-to-have segment nișă** (post-feedback):
20. P3-04 Inserare CT + P3-05 IFC4 + P3-07 Multi-tenant.

---

## 📞 Contact reactivare

**Când ești gata să reactivăm**:
1. Confirmă onboarding certSIGN complet (CLIENT_ID + SECRET disponibile)
2. Confirmă upgrade Vercel Pro activ
3. Spune-mi „reactivăm Sprint Conformitate Phase 2" — și încep automat de la Fază 2 punctul 4

**Documentație de referință**:
- `audit-conformitate-2026-05-06/README.md` — raport master 50 itemi
- `audit-conformitate-2026-05-06/{P0,P1,P2,P3}-*.md` — sub-rapoarte detaliate
- `docs/CERTSIGN_SETUP.md` — ghid onboarding certSIGN PARAPHE
- `MEMORY.md` — pointers sprint anterior + restanțe

---

**Generat**: 7 mai 2026 post commit `090447f` (Integrare UI completă).
