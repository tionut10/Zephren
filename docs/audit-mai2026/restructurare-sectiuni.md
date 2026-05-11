# Restructurare secțiuni — Propuneri reordonare UI (Phase 5 raport)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**⚠️ AVERTISMENT**: Acest document este **RAPORT DE PROPUNERI**, NU implementare. Utilizatorul aprobă separat fiecare modificare.

---

## Filozofie reordonare

Auditorul Zephren e expert tehnic dar lucrează rapid sub presiune. Reordonarea ar trebui să:
1. **Reducă click-uri inițiale** — primele 3-5 câmpuri suficiente pentru 80% cazuri tipice
2. **Grupeze logic** funcționalități înrudite în carduri primare vs secundare „🔧 Avansate"
3. **Păstreze accesul** la TOATE funcționalitățile existente — doar reorganizare vizibilitate
4. **Default conservator** — auditorul experimentat poate expanda toate carduri instant

---

## Pas 1 — Identificare clădire

### Ordine actuală
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
11. TMY climat (Pro+)
12. DocumentUploadCenter

### Propunere reordonare

**Card primar** (mereu vizibil, 6 câmpuri):
1. Adresă (autocomplete OSM)
2. Localitate + județ
3. **Zonă climatică (auto + badge override manual)**
4. Categoria clădirii
5. An construcție + niveluri
6. Suprafețe (Au, Ac, V)

**Card secundar „🔧 Validări avansate" (expand on demand)**:
- ANCPI verification
- EXIF GPS auto-localitate
- TMY orar (Pro+)

**Card secundar „📷 Documente și foto" (expand on demand)**:
- BuildingPhotos
- BuildingMapAdvanced
- DocumentUploadCenter

**Impact**: auditor experimentat → 2 click expand pentru toate funcționalitățile; auditor nou → ecran curat 6 câmpuri esențiale.

**Estimare implementare**: 2-3h pur UI, fără modificare logică engine.

---

## Pas 2 — Anvelopă

### Ordine actuală (cu SmartEnvelopeHub ON default)

Single component cu sub-secțiuni:
1. ElementsList (opace + vitraje + punți într-o singură listă)
2. ThermalBridgeCard
3. UComplianceTable (badge nZEB/Renovare/Neconform)
4. EnvelopeLossChart
5. EnvelopeHealthCheck
6. ThermalVizButton (deschide modal cu WallSection SVG Glaser)

### Propunere reordonare

**Ordinea actuală este OPTIMĂ pentru auditor experimentat**. Singura propunere:

**Tutorial mode** (`onLoadDemoTutorial` deja existent) — pornește în acest mode default pentru utilizatori noi:
1. „1️⃣ Pereți exteriori" highlight (preset bloc PAFP / casă cărămidă / casă post-2000)
2. „2️⃣ Planșee + plintă" (după ce pereți completați)
3. „3️⃣ Ferestre + uși" (după ce planșee completate)
4. „4️⃣ Punți termice" (auto-detect din elementele anterioare)
5. „5️⃣ Verificare U-uri" (UComplianceTable badge)
6. „🌡 Vizualizare termică" (ThermalViz modal)

**Estimare**: 4-5h pentru tutorial mode (incremental enable per stage + tooltips).

**Recomandare alternativă (sprint Visual-2)**: integrare LayerCrossSection / GlazingCrossSection direct în OpaqueModal/GlazingModal legacy (fallback `?envelopeHub=0`) — auditorul vede SVG cross-section fără să deschidă ThermalVizModal extra. **Estimare**: 1-2h.

---

## Pas 3 — Sisteme tehnice

### Ordine actuală
1. Sursă încălzire (catalog A1) + putere
2. Sistem emisie (A2)
3. Distribuție + control (A3)
4. ACM (A4)
5. Cooling (A5)
6. Ventilație (A6)
7. Iluminat (A7)
8. BACS class A/B/C/D + SRI score auto

### Propunere reordonare grupare logică

**Card grupare „🔥 Încălzire" (collapsed default după completare)**:
- 1 + 2 + 3 (sursă + emisie + distribuție + control)

**Card grupare „🚿 Apă caldă menajeră"**:
- 4 (ACM cu sursă dedicată sau combinată cu încălzire)

**Card grupare „❄️🌬 Vară (răcire + ventilație)"**:
- 5 + 6

**Card secundar „💡 Iluminat"** (mereu vizibil dar collapsed default — secundar față de HVAC pentru rezidențial):
- 7

**Card validare „⚙️ Automatizare BACS+SRI"** (auto-calculat, vizibil final):
- 8

**Impact**: auditorul vede progresul natural prin sezoane (iarnă → ACM → vară → iluminat → auto).

**Estimare**: 3h reorganizare layout.

---

## Pas 4 — Surse regenerabile

### Ordine actuală
Sub-taburi:
1. Solar termic (collectors)
2. Solar PV
3. Pompă căldură
4. Wind
5. CHP
6. Storage (battery/PCM/BTES)
7. District heating proximitate
8. Biomass

### Propunere tier-uri funcție frecvență

**Tier 1 (uzual rezidențial)** — tab default deschis:
- Solar PV ⭐ (cel mai frecvent prosumator 2026)
- Solar termic ACM
- Pompă căldură aer-apă

**Tier 2 (case + complexe)**:
- Biomass (cazane peleți/lemne)
- District heating proximitate

**Tier 3 (industrial / community)**:
- Wind (turbine HAWT/VAWT/BIWT)
- CHP (Stirling/ICE/Fuel cell)
- Storage (BESS/PCM/BTES/H2)

**Impact**: auditor rezidențial nu vede 6 secțiuni nerelevante; auditor industrial expand Tier 3.

**Estimare**: 3-4h tab redesign + persist user choice last opened tab.

---

## Pas 5 — Bilanț energetic

### Ordine actuală
1. Calcul lunar (12 luni table)
2. EP_H / EP_W / EP_C / EP_V / EP_L breakdown
3. EP_total + clasă energetică
4. Verificare nZEB (vs prag + zonă)
5. Verificare ZEB (Art.11 EPBD)
6. Clădire de referință (qf_ref + ep_ref)
7. NPV preview + buton spre Step 7

### Propunere reordonare

**Card primar „📊 Rezultate principale"** (mereu vizibil):
- EP_total + clasă (badge mare colorat A+→G)
- Verificare nZEB (badge DA/NU)
- Verificare ZEB EPBD Art.11 (badge dacă aplicabil)

**Card secundar „🧮 Calcul detaliat"** (expand on demand):
- 1 (12 luni table)
- 2 (breakdown utilități)

**Card secundar „🏢 Clădire de referință"** (expand):
- 6

**Card secundar „💰 Preview financiar"** (expand + buton spre Pas 7):
- 7

**Impact**: auditorul vede instant rezultatele cheie; detalii la expand.

**Estimare**: 2-3h reorganizare carduri.

---

## Pas 6 — CPE + Anexa 1+2

### Ordine actuală
1. Auditor card (date personale)
2. Anexa MDLPA Fields
3. Building map / foto preview
4. Preview CPE (HTML iframe)
5. CpeAnexa (Anexa 1+2 UI)
6. Raport conformare nZEB (gating)
7. Export buttons
8. Checklist depunere
9. ANCPI verification link

### Propunere

**Card auditor → top sticky** (rămâne mereu vizibil indiferent de scroll):
- 1 (auditor card cu cpeCode + nrMDLPA + atestat)

**Card primar „📋 Anexa 1+2"** (vizibil default):
- 2 + 5

**Card primar „📄 Preview CPE"** (vizibil default):
- 4

**Card secundar „🌱 Raport nZEB"** (vizibil dacă gating):
- 6

**Card secundar „📦 Export"**:
- 7 + 8

**Card secundar „🗺 Vizual"**:
- 3 + 9

**Impact**: auditorul lucrează cu cpeCode mereu vizibil (sticky) + focus pe Anexa 1+2 + Preview.

**Estimare**: 2-3h reorganizare layout sticky + carduri.

---

## Pas 7 — Recomandări reabilitare

### Ordine actuală
1. Quick wins (smart-rehab) — măsuri ROI<5 ani
2. 3 scenarii (rehab-comparator) — minim/mediu/maxim
3. Pachet etapizat (phased-rehab) — plan multi-an
4. CostOptimalCurve
5. LCCAnalysis
6. MEPSCheck
7. RaportConformareNZEB referință
8. MEPI consum reconciliere (link Pas 8)
9. Pachet documente client (ZIP)
10. **Chat AI Reabilitare** (NEW F5 — panel flotant — nu intră în ordine layout)

### Propunere reordonare

**Card prim „🚀 Quick wins"** (default deschis, ROI rapid):
- 1

**Card primar „📊 Scenarii reabilitare"**:
- 2 + 3 (minim/mediu/maxim + plan etapizat în tab-uri)

**Card primar „💰 Analiză financiară"**:
- 4 + 5 (CostOptimalCurve + LCC)

**Card secundar „⚖️ Conformitate"**:
- 6 + 7

**Card secundar „📊 Date reale"**:
- 8 (link Pas 8 MEPI)

**Card final „📦 Generare documente"**:
- 9 (ZIP master)

**Chat AI**: rămâne panel flotant (poziție DOM irrelevantă) — vizibil mereu.

**Impact**: flux logic decisional: măsuri rapide → scenarii → analiză cost → conformitate → date reale → documente.

**Estimare**: 3-4h reorganizare layout.

---

## Sumar estimare implementare reordonări

| Pas | Modificare | Ore | Prioritate |
|---|---|---:|---|
| Pas 1 | Carduri primare + secundare expand | 2-3 | P1 |
| Pas 2 | Tutorial mode pas-cu-pas + integrare SVG modale legacy | 4-5 | P2 |
| Pas 3 | Grupare sezonieră (iarnă/ACM/vară/iluminat) | 3 | P2 |
| Pas 4 | Tier-uri 1/2/3 RES + persist tab last opened | 3-4 | P1 |
| Pas 5 | Carduri primare/secundare cu badge mare clasă | 2-3 | P1 |
| Pas 6 | Auditor sticky top + reorganizare carduri | 2-3 | P1 |
| Pas 7 | Reordonare logică decisional + grupare scenarii | 3-4 | P1 |

**Total estimate**: **19-25 ore** sprint dedicat reorganizare UI (NU în acest audit).

---

## Eliminări UI — status (deja efectuate)

- ✅ XML MDLPA preview Step 6 — eliminat 08may2026 (reactivare 8.VII.2026)
- ✅ XML portal preview Step 6 — eliminat 08may2026
- ✅ Pașaport Renovare full Step 7 — eliminat 08may2026 (EPBD nu transpus RO)
- ✅ Manifest semnat Step 7 (mock signer) — eliminat 08may2026
- ✅ Card BACS+SRI+MEPS Step 6 mutat în Step 5 (Sprint 11 mai 2026)
- ✅ Step7CostOptimalExports mutat în Step 8 (Sprint 08may2026 followup 4)
- ✅ Step7FundingBundles mutat în Step 8

**Niciun XML MDLPA / Dosar AAECR rămâne vizibil în UI** la 11 mai 2026.

---

## Concluzie

Restructurarea propusă este un sprint **dedicat post-audit** cu valoare UX semnificativă (~20h cumulative). **Nu este urgent** — funcționalitatea actuală e completă, doar organizarea poate fi îmbunătățită pentru fluiditate.

**Nicio modificare aplicată în F7**. Utilizatorul aprobă separat per pas când dorește execuție.
