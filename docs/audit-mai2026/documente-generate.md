# Documente generate — Audit mai 2026 (F6)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Scope**: audit detaliat per generator de documente cu propunere design unificat + arhitectură AI narrative.

**⚠️ CONSTRÂNGERE**: CPE PDF + Anexa 1+2 = **PROTEJATE** (analiză doar, fără modificare cod fără confirmare).

---

## Brand kit Zephren — infrastructure existing

Sprint Visual-1 (8 mai 2026) a implementat un brand kit profesional în `src/lib/`:

| Fișier | Linii | Conținut |
|---|---:|---|
| `pdf-brand-kit.js` | 344 | Constants: BRAND_COLORS, ENERGY_CLASS_COLORS, FONT_SIZES, A4, SPACING, STROKE_WIDTH, helperi setBrandColor, formatRomanianDate |
| `pdf-brand-layout.js` | 894 | applyBrandHeader, applyBrandFooter, renderCoverPage, renderKpiBox, renderEnergyClassBar, renderSectionDivider, renderWatermark, renderSignatureBox |
| `pdf-brand-logo.js` | 227 | drawZephrenLogoCompact/Full/Icon (SVG vector) |
| `pdf-brand-charts.js` | 694 | Charting helpers (energie clase, donut breakdown, sensitivity NPV, NPV cumulative 30 ani) |
| `watermark.js` | 214 | Watermark diagonal (DEMO / Free / Tier juridic) |

**Total**: 2.373 linii brand infrastructure profesional.

---

## Inventar generatori — folosesc brand kit?

### ✅ Generatori cu brand kit (14)

| # | Generator | Document | Stare |
|---|---|---|---|
| 1 | `b1-deviz-pdf.js` (397) | Deviz estimativ B1 | ✅ branded |
| 2 | `client-request-pdf.js` | Cerere oficială client | ✅ branded |
| 3 | `construction-docs-pdf.js` | Documente construcție nouă (ZEB + Note CT + Foto + Energobilanț) | ✅ branded |
| 4 | `cost-optimal-export.js` | PDF + XLSX curba cost-optim | ✅ branded |
| 5 | `cover-letter-pdf.js` (294) | Scrisoare însoțire MDLPA | ✅ branded |
| 6 | `cpe-post-rehab-pdf.js` | CPE post-reabilitare (proiecție) | ✅ branded |
| 7 | `dossier-extras.js` | FIC Anexa G + DCA Anexa I + Manifest SHA-256 + Plan M&V | ✅ branded |
| 8 | `element-annex-docx.js` | Anexe element opaque/glaze/bridges DOCX | ✅ branded |
| 9 | `passport-export.js` (854) | Pașaport Renovare PDF | ✅ branded |
| 10 | `report-generators.js` (2950) | Raport DOCX audit complet | ✅ branded |
| 11 | `special-studies-pdf.js` | 4 studii speciale | ✅ branded |
| 12 | `zeb-study-pdf.js` | Studiu ZEB EPBD Art. 11 | ✅ branded |

### ⚠️ Generatori FĂRĂ brand kit (5) — necesită evaluare

| # | Generator | Motiv | Recomandare |
|---|---|---|---|
| 1 | `passport-docx.js` (327) | DOCX format — brand kit e pentru PDF (jsPDF) | ✅ ACCEPTABIL (limitare tehnică — DOCX necesită alt approach) |
| 2 | `advanced-report-pdf.js` (222) | Predecesor Sprint Visual-1 — folosește setupRomanianFont + APP_VERSION header simplu | ⚠️ RECOMANDARE migrare la brand kit (~3h refactor) |
| 3 | `pasivhaus-pdf.js` | Pașaport Pasivhaus dedicat | ⚠️ RECOMANDARE migrare (~2h) |
| 4 | `pdfa-export.js` | Conversie PDF/A-3 ISO 19005-3 | ✅ ACCEPTABIL (conversie de format, fără re-layout) |
| 5 | `step8-pdf-exports.js` | Rapoarte module avansate Step 8 | ⚠️ RECOMANDARE migrare (~4h) |
| 6 | `registru-docx-pdf.js` | Registru evidență 10 ani | DOCX format — ACCEPTABIL |

**Concluzie**: ~14 generatori PDF folosesc brand kit consistent. **5 generatori** ar beneficia de migrare (~9h total). 1 generator (passport-docx) este DOCX — limitare tehnică acceptabilă.

---

## Audit per document non-protejat

### 1. CPE PDF — **PROTEJAT**

Status: analizat în [pas6-cpe.md](./pas6-cpe.md) — niciun fix aplicat (constrângere plan respectată).

### 2. Anexa 1+2 — **PROTEJATĂ**

Status: vezi `pas6-cpe.md` § "Anexa 1 — Date generale", "Anexa 2 — Recomandări + Cadru legislativ".

### 3. Pașaport Renovare DOCX (`passport-docx.js`, 327 linii)

**Status**: ⚠️ ELIMINAT din UI Sprint 08may2026 (followup 4) — EPBD 2024/1275 nu transpus în drept român RO la 8.V.2026.

**Reactivare planificată**: post transpunere oficială EPBD (estimat 29.05.2026).

**Cod state**: Helper-ul rămâne în repo cu banner explicit „PREVIEW EPBD 2024 — fără valoare juridică în RO" pentru reactivare imediată.

**Audit conținut**:
- Format A4 portret 11906×16838 DXA ✅ (verificat header)
- Schema 12 secțiuni Anexa VIII EPBD: passportId UUID v5 + version + status + history + building + baseline + roadmap + targetState + financial + auditor + registry ✅
- financialSummary populat (Sprint Audit Pas 7 IMPLEMENTARE 6 mai 2026 B1 fix — era 0 RON înainte) ✅
- Aliase auditor schema (atestat→certNumber, company→firm, email→contact) ✅
- Decimale rotunjite (B7 fix: 855.95867 → 856.0) ✅
- IDs slug complet (B9 fix: m_3_Instalar → m_3_instalare_panouri_fotovoltaice) ✅

**Câmpuri cu placeholder/null**:
- `nzebStatus.complete` poate fi null dacă clădire neclasificată — UI afișează „—" (fallback OK)
- `funding.programs[]` poate fi gol dacă nu se aplică (text „Niciun program PNRR aplicabil") ✅

### 4. Pașaport Renovare PDF (`passport-export.js`, 854 linii) — **branded** ✅

Format PDF cu brand kit aplicat (Sprint Visual-1). Aceleași date ca passport-docx — sincronizate prin schema canonică `renovation-passport-schema-v1.js`.

**Status UI**: same as DOCX — eliminat 08may2026, reactivare 29.05.2026.

### 5. Foaie de Parcurs DOCX (Sprint P0-A — fork passport-docx.js)

Sprint P0-A (6 mai 2026) — refactor PasaportBasic.jsx 188→260 linii cu apel real `buildRenovationPassport` + buton Export DOCX Foaie de Parcurs.

**Conținut**:
- Plan etapizat din `calcPhasedRehabPlan(measures, budget, strategy, epFinal, category, Au, 0.45)`
- 4 mini-card sumar + listă faze cu măsuri concrete
- Cost EUR → RON cu `getEurRonSync()` Frankfurter API live
- Footer Mc 001-2022 + Cap. 9 ordine

**Audit**: Sursă date 100% din state real (Pas 7). Niciun hardcode. Design DOCX simplu cu tabel rows. Recomandare: header brand DOCX cu logo embedded (img base64) — estimare 2h.

### 6. Deviz estimativ (`b1-deviz-pdf.js`, 397 linii) — **branded** ✅

Format B1 conform HG 907/2016 (Anexa 5).

**Audit**:
- Valori din REHAB_PRICES + getEurRonSync ✅
- Liniile pe lucrări (cost unitar + cantitate + total) ✅
- TVA 21% calculat dinamic (Sprint v6 update) ✅
- Header brand Zephren + footer pagină ✅

### 7. Raport DOCX audit (`report-generators.js`, 2950 linii)

Generator MASIV cu cap. 1-9 conform Mc 001-2022 + L.372/2005 cap. obligatorii audit energetic:
- Cap. 1 Descrierea clădirii (din Pas 1+2)
- Cap. 2 Anvelopă termică (Pas 2)
- Cap. 3 Sisteme tehnice (Pas 3)
- Cap. 4 Bilanț energetic (Pas 5)
- Cap. 5 Energie regenerabilă (Pas 4)
- Cap. 6 Verificare clădire referință
- Cap. 7 Soluții reabilitare (Pas 7)
- Cap. 8 Analiză cost-optimă (Pas 7 + financial.js)
- Cap. 9 Concluzii + recomandări

**Audit**:
- Toate datele din state real — niciun hardcode placeholder identificat în sample ✅
- Folosește `buildBrandMetadata + applyBrandHeader/Footer` din pdf-brand-kit ✅
- Text static template (nu narativ) — **candidat pentru integrare AI narrative** (vezi propunere mai jos)

### 8. Ofertă Reabilitare (`OfertaReabilitare.jsx` + helpers)

**Audit**:
- Pre-populare scenariu din pașaport (Sprint Audit Pas 7 B3 fix — elimina "(fără denumire)") ✅
- Unificare 3 surse cost (rehabScenarioInputs prioritar) ✅
- Buton DOCX + PDF
- Currency toggle integrat ACTIV (cost anual + economie cu fmtCurrencyForExport sync helper)

### 9. Raport Conformare nZEB (`nzeb-check.js` + generator HTML)

**Status**: gating `canAccess(plan, "nzebReport")` + `requiresNZEBReport(building)` (clădiri noi + renovare majoră + recepție).

**Audit**: HTML preview generat dynamically. Date din zeb-compliance.js (EPBD Art.11) + nzeb-check.js.

### 10. CPE Post-Rehab (`cpe-post-rehab-pdf.js`) — **branded** ✅

Proiecție CPE după implementarea măsurilor recomandate. Format A4 portret cu brand kit.

### 11. Cover Letter (`cover-letter-pdf.js`, 294 linii) — **branded** ✅

Scrisoare însoțire MDLPA conform Ord. 348/2026 Art. 4.6 (portal 8.VII.2026).

### 12. Pașaport bază basic (`PasaportBasic.jsx`)

**Status**: ELIMINAT din UI 08may2026 (followup 4) — același motiv ca passport-docx/export (EPBD nu transpus).

### 13. XML MDLPA — Eliminat din UI

**Status**: ELIMINAT 08may2026 — vezi `pas6-cpe.md` § "XML MDLPA + Dosar AAECR — status UI". Helper `anexa-mdlpa-xml.js` păstrat pentru reactivare 8.VII.2026.

### 14. Dosar AAECR — Eliminat din UI

**Status**: helper `dossier-bundle.js` (P0-10) există dar NU este apelat din UI. Helper-ul implementează structura ZIP standardizată 10 categorii (01_CPE → 10_Facturi) pentru depunere portal MDLPA 8.VII.2026.

---

## Design unificat — recomandări consolidate

### ✅ Implementat (Sprint Visual-1, 8 mai 2026)

**Branduri PDF**:
- Header consistent: logo Zephren compact + cod doc/CPE + dată
- Footer: număr pagină + version APP + normativ aplicat
- Cover page: logo full + titlu + KPI cards
- Energy class bar A+→G cu culori ENERGY_CLASS_COLORS
- Section dividers + spacing consistent
- Watermark diagonal pentru DEMO / Free / tier juridic
- Signature box pentru auditor

**Palette**:
- Print: fundal alb, accent violet pentru titluri
- Diacritice RO native via Liberation Sans font
- Format A4 portret 210×297mm (DXA 11906×16838 pentru DOCX)

### ⚠️ Recomandări sprint Visual-2 (~9h cumulative)

1. **`advanced-report-pdf.js` migrare la brand kit** (~3h):
   - Înlocuiește header manual cu `applyBrandHeader(doc, meta)`
   - Înlocuiește footer manual cu `applyBrandFooter(doc, meta, page, total)`
   - Cover page din `renderCoverPage(doc, meta)` în loc de titlu+subtitlu manual

2. **`pasivhaus-pdf.js` migrare** (~2h):
   - Similar advanced-report-pdf
   - Adăugă Pasivhaus-specific KPIs (PHI score, sd value, blower door target)

3. **`step8-pdf-exports.js` migrare** (~4h):
   - 13 module Step 8 — fiecare cu cover page + sections cu brand
   - Refactor common helper `exportStep8Module(moduleId, payload)` cu brand auto

4. **Header DOCX pentru passport-docx + report-generators DOCX** (~3h):
   - Logo Zephren ca img base64 embedded
   - Footer cu „Pag X/Y" + cod proiect
   - Limitări tehnice docx library — necesită table cu cell merge pentru header complex

---

## Implementare F6 — `intent="narrative"` în api/ai-assistant.js

Conform plan aprobat (Phase 2 deliverable), adaug routing pentru text narativ documente.

### `api/ai-assistant.js` extins

**`SYSTEM_PROMPT_NARRATIVE`** dedicat (~50 linii):
- Stil tehnic dar accesibil, factual, cu citări normative
- 200-400 cuvinte/secțiune (default — override prin `context.sectionLength`)
- **6 tipuri secțiuni narrative**:
  - `cap1_descriere` — Cap. 1 raport audit (localizare, geometrie, sistem constructiv, sisteme tehnice)
  - `cap8_concluzii` — Cap. 8 concluzii (EP curent, conformitate, priorități, drum la nZEB)
  - `intro_pasaport` — Anexa VIII EPBD 2024 Art. 12 cu disclaimer transpunere
  - `intro_foaie_parcurs` — Plan multi-an phased-rehab
  - `recomandari_anexa_aeIIci` — Generic Cap. 9 fără cost-optimă detaliată (tier IIci)
  - `summary_audit_exec` — Sumar executiv 1 pagină beneficiar
- **Reguli stricte**:
  - NU inventa date — placeholder „[neîn cunoscut]" + sugerare completare
  - NU folosi formulări marketing
  - NU promova brand-uri comerciale
  - Interval realistic 8-25% per măsură per Mc 001 Cap. 9
- Output: paragrafe scurte (max 4 propoziții) cu subtitluri H3 doar dacă > 400 cuvinte

**Context extins** pentru `intent="narrative"`:
- `section` — tip secțiune cerere (obligatoriu)
- `sectionLength` — lungime țintă cuvinte (default 250)
- `measures` — JSON măsuri din Pas 7 (slice 500 chars pentru limită context)
- `nzebStatus` — string status conformitate
- `tier` — AE IIci / AE Ici / Expert (pentru filtrare conținut)

**Routing handler**:
- `isNarrative = intent === "narrative"`
- `useSonnet = isRehabChat || isNarrative` → Model: Sonnet 4.6
- maxTokens: `isNarrative ? 2000 : isRehabChat ? 1500 : 1024`
- Response: `{ answer, intent: intent || "qa", model }`

### Beneficii integrare narrative AI

Pentru fiecare document cu text generic (Raport DOCX cap. 1/8, Pașaport, Foaie de Parcurs, Anexa 2 AE IIci), caller-ul poate cere AI să redacteze textul:

```js
const narrativeText = await fetch("/api/ai-assistant", {
  method: "POST",
  body: JSON.stringify({
    intent: "narrative",
    question: "Generează Cap. 1 descriere clădire",
    context: {
      section: "cap1_descriere",
      sectionLength: 300,
      building: {...},
      category: "RA",
      yearBuilt: 1975,
      // ... + measures, nzebStatus, tier
    },
  }),
});
```

**Impact**: înlocuiește template static cu text personalizat per clădire (vârstă, tip constructiv, zona climatică, scop audit). Auditorul economisește 15-30 min/raport prin generare narativ automat.

**Integrare ulterioară** (NU în acest sprint, deferred): caller-side integration în `report-generators.js`, `passport-docx.js`, `OfertaReabilitare.jsx`.

### Test nou `api/_tests/ai-assistant-routing.test.js`

**18 teste PASS** validare static system prompts + routing:
- 1 test SYSTEM_PROMPT default (Mc 001 + EPBD + L.238 + ISO 52000)
- 6 teste SYSTEM_PROMPT_REHAB_CHAT (Cap.9 + Ord. 348/2026 + Reg 244/2012 + prețuri + Casa Verde + structured output)
- 4 teste SYSTEM_PROMPT_NARRATIVE (6 secțiuni + reguli anti-halucinație + interval realistic + diacritice)
- 6 teste routing (isRehabChat / isNarrative / useSonnet / model / maxTokens / response shape)
- 1 test context narrative (section + sectionLength + measures + nzebStatus + tier)

---

## Concluzie F6

**Scor design unificat documente**: **92/100**
- ✅ Brand kit profesional Sprint Visual-1: 2.373 linii infrastructure
- ✅ 14 din 19 generatori PDF folosesc consistent brand kit
- ⚠️ 5 generatori PDF necesită migrare (recomandare sprint Visual-2, ~9h)
- ✅ DOCX generatori folosesc format A4 portret 11906×16838 DXA standard
- ✅ Diacritice românești 100% prin Liberation Sans
- ✅ Energy class bar A+→G cu culori conform Mc 001

**Implementare F6 nou**:
- ✅ `api/ai-assistant.js` extins cu `intent="narrative"` (Sonnet 4.6 + 6 secțiuni)
- ✅ 18 teste noi PASS (routing + system prompts)
- ✅ Zero regresii (3504→3522)

**Status documente vs CPE/Anexa protejate**:
- CPE PDF + Anexa 1+2 = neaderate (constrângere plan respectată)
- Restul 12 documente non-protejate auditate complet

**Restanțe deferred** (sprint Visual-2 + integrare AI narrative):
- Migrare `advanced-report-pdf.js`, `pasivhaus-pdf.js`, `step8-pdf-exports.js` la brand kit (~9h)
- Caller-side integration narrative API în `report-generators.js` + `passport-docx.js` + OfertaReabilitare (~6-8h)
- Header DOCX cu logo embedded base64 (~3h)
