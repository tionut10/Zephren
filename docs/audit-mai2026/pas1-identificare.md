# Pas 1 — Identificare și clasificare clădire — Audit mai 2026 (F1)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Fișier principal**: `src/steps/Step1Identification.jsx` (~860 linii)
**Engine validator**: `src/calc/step1-validators.js`
**Documente conexe**: `docs/CONFORMITATE_NORMATIVA_v4.md` (scor 94/100), `docs/SR-4839-grade-zile.md`

---

## ✅ Funcționează corect (verificat)

1. **Zone climatice I-V — implementare avansată**:
   - `src/data/climate.json` cuprinde zonele I-V (Mc 001-2022 Anexa A) cu T_e_min, HDD/CDD per orientare
   - `src/data/ro-localities.json` mapează ~3000 localități → zonă
   - Lazy-load cu cache (`_localitiesCache`) — performanță bună
   - Override manual al zonei climatice — auditorul poate suprascrie zona detectată automat
   - Footnote SR 4839:2014 sub valoarea NGZ în UI (S30B·B7 — `Step1Identification.jsx`)

2. **OSM Nominatim geocoding integrat**:
   - `searchStreetOSM` cu rate-limit-friendly user-agent „Zephren/3.2"
   - `geocodeAddress` complet (lat/lon/city/county/postal)
   - Autocomplete cu deduplicare label+sub

3. **Overpass API pentru building footprint**:
   - `getBuildingFootprint(lat, lon)` cu radius 30m
   - `polygonAreaM2` cu proiecție echidistantă locală (eroare <0.5%)
   - Cache `_overpassCache` TTL 10 min
   - Rezultatele alimentează Au și înălțimi în `building` state

4. **ANCPI verification panel** (`ANCPIVerificationPanel.jsx`, Sprint D Task 1):
   - Verifică cadastru pentru proprietate validă
   - Integrare via `lib/external-apis.js > fetchCadastralData`

5. **EXIF GPS auto-localitate** (Sprint D Task 6):
   - `utils/exif-gps.js > findNearestLocality` din coordonate foto
   - Reduce dramatic eroarea de identificare zonă

6. **TMY orar climat** (`TMYPanel.jsx`, Sprint B Task 2 Pro+):
   - Import EPW, CSV, fetch Open-Meteo (`parseEPW`, `parseClimateCSV`, `fetchOpenMeteo`)
   - `openMeteoToClimateData` + `validateClimateData` pentru consistență
   - Disponibil doar planuri Pro+ via `canAccess(plan, "tmyHourly")`

7. **Au și V — propagare engine**:
   - Au se introduce direct în `building.Au` și se propagă în `useEnvelopeSummary > H_tr / Au`, `iso13790.js`, toate calculele EP raportate la m²
   - V intră în calcul ventilare `useEnvelopeSummary` linia 122 (`0.34 × n × volume × (1 − hrEta)`)

8. **Categoria clădirii**:
   - 16 tipuri enumerate (`step1-validators.js > BUILDING_CATEGORIES` + alias-uri RI/RC/RA/BI/ED/SP/HC/CO/SA/AL)
   - Sincronizat cu `planGating.js > getRequiredMdlpaGrade` (Ord. 348/2026 Art. 6)
   - Validare grad MDLPA ↔ tip clădire în Sprint v6.2 (`auditor-grad-validation.js` + `canEmitForBuilding.js`)

9. **DocumentUploadCenter** (Sprint Conformitate P0-05..09, 18 sloturi):
   - Upload condiționat documente input client (act proprietate, releveu, fișe tehnice)
   - Reactivat în Pas 1 (memory: Sprint Conformitate finalizat)

10. **Validări Step1**:
    - `validateStep1`, `computeStep1Progress`, `classifyN50`, `getEVRequirements`
    - `SCOP_CPE_OPTIONS`, `OWNER_TYPE_OPTIONS`
    - `isResidential(category)` și `parseFloorsRegime` pentru regim niveluri

---

## ❌ Probleme găsite

**Niciun bug P0 sau P1 nou identificat la Pas 1 în această sesiune** — modulul a fost auditat și remediat extensiv prin S30A·A6 (`loadDemoByIndex` + plan-gating demo bypass), S30A·A7 (mapare postalCode), S30B·B7 (SR 4839:2014 footnote NGZ).

**P2 — propuneri minore** (NU implementate în această sesiune, vezi „Propuneri îmbunătățire" mai jos):

- P2.1 — Volum V pentru clădiri cu etaje de înălțimi diferite: implementarea actuală folosește `H_total × Au` sau introducere manuală. Pentru clădiri istorice cu mansardă/pod cu pante variabile, V real poate fi 5-10% mai mic. **Recomandare**: adaugă opțiune „V calculat per nivel" cu lista niveluri × Au_nivel × H_nivel.

- P2.2 — Override manual zonă climatică ar trebui marcat vizibil în CPE generat (footer „Zonă climatică modificată manual de auditor: II → III" pentru trasabilitate audit MDLPA).

---

## 💡 Propuneri îmbunătățire UX

1. **Reordonare default câmpuri Pas 1** (raport pentru `restructurare-sectiuni.md`):
   `Adresă (autocomplete OSM)` → `Zonă climatică (auto detectată + override)` → `Categorie clădire (enum)` → `An construcție` → `Suprafețe (Au, Ac, niveluri)` → `Înălțimi` → `Regim utilizare` → `Validare ANCPI (opțional)` → `Foto/EXIF GPS (opțional)`.

   Ordinea actuală este corectă funcțional, dar pentru UX optim ar ajuta colapsarea „advanced" (ANCPI + EXIF + TMY) într-o secțiune secundară „🔧 Validări avansate" cu expand on demand.

2. **Wizard categorie din limbaj natural** (necesită AI):
   Câmp text liber „Descrie clădirea într-un rând" → sugestie automată categoria + subcategoria.

3. **Indicator vizual override zonă**:
   Când utilizatorul modifică zona climatică detectată automat, badge amber „⚠ Modificat manual" + footer note în payload pentru CPE.

---

## 🤖 Funcții AI propuse (pentru `ai-features-architecture.md`)

| Endpoint | Funcție | Ore | Prioritate | Vercel slot |
|---|---|---|---|---|
| `api/ai-zone-climatica.js` | Geocoding OSM → zonă I-V cu validare confidence | 3 | P1 | nou (post Pro) |
| `api/ai-wizard-categorie.js` | Limbaj natural → categorie + subcategorie | 5 | P1 | nou (post Pro) |
| `api/ai-ocr-releveu.js` | Releveu PDF → Au + niveluri + an construcție | 8 | P2 | refold pe `ai-assistant.js` |

**Cost estimat tokens**: ~20-30k/lună la 100 utilizatori → ~$5/lună Claude Sonnet 4.6.

---

## 📊 Grafice Pas 1

- **NGZ histogram per zonă** (există via S30B·B7) — ✅ dark theme consistent
- **Curba HDD/CDD lunară** din `climate.json` — există în `TMYPanel.jsx` pentru Pro+

Niciun grafic nou propus la Pas 1 — modulul este deja complet.

---

## 📋 Ordine secțiuni — propunere reordonare

Secțiuni actuale (în ordine UI):
1. Auto-detect (OSM autocomplete adresă)
2. Localitate + județ + cod poștal
3. Zonă climatică (auto + override)
4. Categoria clădirii (enum 16 tipuri)
5. An construcție + regim niveluri
6. Suprafețe (Au, Ac, V)
7. Foto clădire (BuildingPhotos)
8. Hartă cu shading (BuildingMapAdvanced)
9. ANCPI verification
10. EXIF GPS
11. TMY (Pro+)
12. DocumentUploadCenter (Sprint Conformitate)

**Propunere reordonare** (mutare în card secundar):
- **Card principal** (rămân vizibile): 1, 2, 3, 4, 5, 6
- **Card „🔧 Validări avansate" (expand on demand)**: 9, 10, 11
- **Card „📷 Documente și foto" (expand on demand)**: 7, 8, 12

**Impact**: reduce paralel-decizional pentru auditor în primul pas; păstrează acces la toate funcționalitățile.

**Estimare ore implementare reordonare**: 2-3h (pur UI, fără modificare logică).

---

## Concluzie Pas 1

**Scor conformitate normativă Pas 1**: **96/100**
- Funcțional 100%: zone climatice, OSM, Overpass, ANCPI, EXIF GPS, TMY
- Lipsește doar V calculat per nivel pentru clădiri istorice (P2.1)

**Nu necesită modificări de cod în această sesiune**. Reordonarea UI rămâne pentru `restructurare-sectiuni.md` (Phase 5, raport).
