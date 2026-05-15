# Sprint S6 — Pas 2 AI-First · Restanțe out-of-scope din Sprint S5a+S5b

> **Status**: PENDING — așteaptă confirmare explicită user
> **Trigger lansare**: cerere user „lansează S6 Pas 2 restanțe" / feedback auditori cu date din producție AI / Vercel Pro upgrade pentru limite Hobby depășite
> **Effort estimat cumulativ**: ~12-16h
> **Prerequisites**: Sprint S5a+S5b LIVE producție (commits `094a109`→`efc87c1`, deploy `dpl_qHXLyFxGfa6zVVcsrX7tS3F5wmG6` din 15/16.V.2026)

---

## Context

Sprint S5a+S5b a activat ierarhia AI-first completă pe Pas 2 (5 căi Smart Input + Drop Zone Hub + RampFile 4F + EnvelopeAssistant tab AI). Următoarele 4 task-uri au fost **explicit out-of-scope** în planul aprobat (vezi `plans/cum-trat-m-rezultatele-ai-snug-kettle.md` secțiunea „Restanțe out-of-scope") pentru a păstra cumulul sub 18h și a livra incremental.

Cele 4 restanțe sunt **independente** unele de altele — pot fi lansate selectiv, în orice ordine. Recomandare prioritate: T1 (4E Excel) → T3 (geolocation) → T4 (A/B test) → T2 (4G Catalog catalogue, cea mai complexă, necesită schema nouă).

---

## Task 1 (T1) — 4E Excel xlsx multi-sheet (parser openpyxl serverless)

### Scop
Convertește placeholder-ul S6 din `RampFile.jsx` (linia ~213-218) într-un import functional care acceptă un singur fișier `.xlsx` cu 3 sheet-uri: **Pereți / Vitraje / Punți**. Reduce numărul de operațiuni utilizator de la 3 CSV-uri la 1 fișier Excel.

### Constrângeri
- Vercel limit 11/12 funcții — **nu adăugăm endpoint nou serverless** decât dacă forțăm o consolidare (mutare CSV parser din client în server).
- Schema sheet-uri identică cu CSV existente (compatibilitate cross-format).
- Parser client-side via `xlsx` (deja încărcat în `excel-engine-CTdEcjT6.js` 1358 kB).
- Template descărcabil (replică pattern CSV existent în `RampFile.jsx`).

### Fișiere implicate
| Cale | Modificare |
|---|---|
| `src/components/SmartEnvelopeHub/RampFile.jsx` | Convertește placeholder S6 4E → ActiveAction cu input `.xlsx`; reutilizează parseopaque/parseGlazing/parseBridges existente prin adapter Sheet → CSV-like rows |
| `src/components/SmartEnvelopeHub/utils/xlsxEnvelopeAdapter.js` (NOU ~80 linii) | Adapter pur: `parseEnvelopeXlsx(arrayBuffer) → { opaque[], glazing[], bridges[], errors[] }` reutilizând logica deja validă din parsers CSV |
| `src/components/SmartEnvelopeHub/utils/xlsxTemplate.js` (NOU ~60 linii) | Generator template: 3 sheet-uri cu header + 2 rânduri exemple per sheet |
| Tests (NOU): `src/lib/__tests__/xlsx-envelope-adapter.test.js` ~12 teste | Validate parsing 3 sheets / missing sheets / invalid rows / Romanian diacritics in headers |

### Reutilizare
- `parseGlazingCSV` și `parseBridgesCSV` din `RampFile.jsx:99-167` (logica de validare păstrată)
- `xlsx` library nativă (`utils.sheet_to_json` cu `header:1` returnează arrays compatibile cu split CSV)
- Template downloader pattern `downloadCSV()` extins → `downloadXLSX()` cu `XLSX.writeFile()`

### Acceptance criteria
- ✅ Upload `.xlsx` cu 3 sheet-uri populate → append corect la `opaqueElements/glazingElements/thermalBridges`
- ✅ Sheet-uri lipsă → eroare clară user („Lipsește sheet 'Vitraje'") fără crash
- ✅ Rânduri invalide (arie 0, ψ negativ) → skip silent + toast „X rânduri ignorate"
- ✅ Template descărcabil populat cu exemple realiste RO 2026
- ✅ Bundle Step2 chunk nu crește > 5 kB (xlsx deja încărcat)

### Effort estimat: ~3-4h

---

## Task 2 (T2) — 4G Catalog producător PDF → bibliotecă materiale

### Scop
Conversie placeholder S6 din `RampFile.jsx` (4G) în feature funcțional. **NU populează Pas 2 direct** — populează o nouă bibliotecă globală de materiale (`src/data/materials-library.js`) accesibilă din `OpaqueModal` la editarea straturilor.

### De ce e mai complexă
- Necesită schema nouă `MaterialEntry { id, name, lambda, rho, c, mu, source }` separată de schema envelope
- Necesită endpoint AI nou cu prompt `MATERIAL_EXTRACTION_PROMPT` în `api/import-document.js` (`fileType="catalog"`)
- Necesită UI nou: modal/sidebar pentru navigare materiale extrase
- Necesită storage persistent: `localStorage` sau `document-upload-store` pentru materiale per proiect

### Constrângeri
- Vercel: NU adăugăm funcție nouă — extindem `import-document.js` cu `fileType="catalog"` (deja are 7 tipuri)
- Materialele extrase rămân **per browser session** (localStorage) în T2; persistență Supabase amânată T2-bis
- AI Sonnet 4.6 cu prompt strict JSON schema validată cu zod

### Fișiere implicate
| Cale | Modificare |
|---|---|
| `api/import-document.js` | Adăugă `CATALOG_PROMPT` + branch `fileType="catalog"` |
| `src/data/materials-library.js` (NOU) | Schema + helpers `loadMaterials/saveMaterials/searchByName` |
| `src/components/MaterialsLibraryModal.jsx` (NOU ~250 linii) | UI navigare + selecție materiale extrase din catalog |
| `src/components/OpaqueModal.jsx` | Buton nou „📚 Din bibliotecă" pe câmpul `matName` strat → deschide MaterialsLibraryModal |
| `src/components/SmartEnvelopeHub/RampFile.jsx` | Activează 4G → upload PDF → AI catalog → save în bibliotecă + toast „X materiale adăugate" |
| `src/lib/envelope-ai-orchestrator.js` | Adaugă `extractMaterialsFromCatalog(file)` (apel separat de envelope) |
| Tests: ~25 teste pentru parsing materiale + library helpers |

### Acceptance criteria
- ✅ Upload catalog PDF producător (ex: Knauf, Rockwool) → AI extrage 10-50 materiale cu λ, ρ, source
- ✅ Materiale apar în `MaterialsLibraryModal` accesibil din OpaqueModal
- ✅ Selectare material din bibliotecă auto-populează strat în editor envelope
- ✅ Fallback graceful când AI nu extrage (PDF scanat slabă rezoluție)
- ✅ Persistență cross-session via localStorage cu key `zephren-materials-library-v1`

### Effort estimat: ~5-6h

---

## Task 3 (T3) — Geolocation pentru orientare automată fotografii

### Scop
Când utilizatorul face poză unei fațade via Smart Input camera 📷 (1D), să se folosească EXIF GPS + compass al telefonului pentru a auto-completa câmpul `orientation` (N/NE/E/SE/S/SV/V/NV) la elementele extrase de AI.

### Constrângeri
- Funcționează DOAR pe mobile (desktop nu are GPS/compass)
- EXIF GPS prezent doar dacă utilizatorul a permis geolocation pentru camera
- Compass heading lipsește din EXIF iPhone (sunt necesare permisiuni Web API `DeviceOrientationEvent`)
- Permisiune explicită utilizator — graceful fallback dacă refuză

### Fișiere implicate
| Cale | Modificare |
|---|---|
| `src/lib/envelope-ai-orchestrator.js` | Adaugă `enrichWithGeolocation(file, results)` post-procesare opțională |
| `src/lib/exif-parser.js` (NOU ~120 linii) | Parser EXIF light-weight (no library) pentru `GPSImgDirection`, `GPSLatitude`, `GPSLongitude` |
| `src/components/SmartEnvelopeHub/EnvelopeAIReviewModal.jsx` | Badge nou „🧭 Auto-orientat din GPS" pe elemente cu orientation derivată |
| Tests: ~10 teste cu EXIF mock |

### Reguli orientare
```
heading (° de la N, clockwise) → orientation:
  337.5-22.5  → N
  22.5-67.5   → NE
  67.5-112.5  → E
  112.5-157.5 → SE
  157.5-202.5 → S
  202.5-247.5 → SV
  247.5-292.5 → V
  292.5-337.5 → NV
```

### Acceptance criteria
- ✅ Mobil cu GPS+compass: poză fațadă → AI întoarce 1 perete → orientation populat din EXIF
- ✅ Fără GPS: orientation rămâne `""` (forțează edit manual ca acum)
- ✅ Multiple poze ale aceleiași fațade dar la unghiuri diferite → dedup folosește orientation
- ✅ Badge vizual „🧭 GPS" în Review Modal

### Effort estimat: ~2-3h

---

## Task 4 (T4) — A/B test heuristic local (5D legacy) vs AI envelope-fill

### Scop
Telemetrie comparativă: când utilizatorul folosește Diagnostic Local (5D heuristic) după AI envelope-fill, înregistrează care din sugestiile AI au fost respinse/editate. Permite optimizarea progressivă a `SYSTEM_PROMPT_ENVELOPE_FILL` (PR4 backend) cu date reale auditor.

### Fișiere implicate
| Cale | Modificare |
|---|---|
| `src/lib/ai-telemetry.js` | Adaugă intent nou `ab-test-feedback` cu metadate: `{aiSuggestedCount, userKept, userRejected, userEdited}` |
| `src/components/SmartEnvelopeHub/EnvelopeAIReviewModal.jsx` | Hook callback `onElementOutcome(el, action: "kept"\|"rejected"\|"edited")` apelat la fiecare click utilizator |
| `src/components/SmartEnvelopeHub/EnvelopeAssistant.jsx` | Mode `diagnostic` post-AI: prompt sugestiv „Vrei să verific ce a propus AI?" + comparație cu state actual |
| `docs/AI_TELEMETRY_DASHBOARD.md` (NOU) | Ghid analiză CSV export — ce să citească designer de prompt |
| Tests: ~8 teste outcome tracking |

### Privacy
- Datele rămân DOAR în browser (`localStorage` FIFO 500)
- Export CSV manual la cererea utilizatorului (existent în `exportAIEventsCSV()`)
- ZERO PII — doar metadata structurală (count + action)

### Acceptance criteria
- ✅ După AI envelope-fill → user respinge 2 din 5 pereți → telemetrie înregistrează `{kept:3, rejected:2, edited:0}`
- ✅ Tabular în UI „Verifică-ți AI-ul" mostră din ultimele 10 sesiuni
- ✅ Export CSV cu coloană nouă `outcome_summary`

### Effort estimat: ~2-3h

---

## Sequence de lansare propusă

### Faza 1 — Quick wins (5-7h)
- T1 Excel xlsx (3-4h) — completare cartela „Din fișier"
- T3 Geolocation (2-3h) — îmbunătățire UX mobile-first

### Faza 2 — Strategic (7-9h)
- T4 A/B telemetrie (2-3h) — învățare din producție pentru prompt tuning
- T2 Materials library (5-6h) — feature de monetizare separată potențială (Pașaport Plus?)

### Total cumulativ: ~12-16h (vs ~22-28h plan original Sprint S5)

---

## Trigger criteria pentru lansare

Lansează acest sprint când:
1. **Cerere explicită user**: „lansează S6 Pas 2 restanțe" sau „T1+T3+T4"
2. **Feedback auditor real**: după 50+ apeluri AI envelope-fill înregistrate în `ai-telemetry`, cu pattern de eroare repetabil pe orientare (→ trigger T3)
3. **Decizie Vercel Pro upgrade**: dacă upgrade-ul se aprobă, T2 catalog devine mai atractiv (limite plătite)
4. **Plan Pricing Plus**: dacă lansăm un plan Pas 2 Plus care include bibliotecă materiale → T2 prioritar

**NU lansa autonom** — așteaptă confirmare.

---

## Out-of-scope explicit (rămâne pentru S7+)

- IFC parser nativ complet (înlocuire IFCImport stub) — Sprint BIM separat
- 3D viewer pentru anvelopă extrasă AI — necesită three.js + bundle mare
- Material library cu sync Supabase cross-device — depinde de Vercel Pro
- Voice command „adaugă perete sud 50 mp" → execute direct fără AI — necesită NLU local

---

## Acknowledgments

Sprint S5a+S5b commits live (15-16/V/2026):
- `094a109` — PR1 orchestrator + telemetrie
- `c7e9875` — PR2 review modal + drop zone
- `52f356b` — PR3 Smart Input handlers
- `67d9039` — PR4 RampFile AI sus + intent envelope-fill
- `efc87c1` — PR5 EnvelopeAssistant tab AI

Deploy: `dpl_qHXLyFxGfa6zVVcsrX7tS3F5wmG6` · alias `energy-app-ruby.vercel.app` (HTTP 200).
