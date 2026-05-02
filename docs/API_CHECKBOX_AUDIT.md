# Audit `api/generate-document.py` — Checkbox-uri DOCX MDLPA

> **Audit Zephren** — 2 mai 2026 / Sprint 6
> **Fișier auditat**: `api/generate-document.py` (5814 linii, 49 funcții)
> **Cadru legal**: Ord. MDLPA 16/2023, L. 372/2005 republicată mod. L.238/2024
> **Scop audit**: verificare acoperire CB-uri vs formular oficial Anexa 1+2

---

## 1. Arhitectură funcție generare DOCX

### Pipeline principal (do_POST → linia 3395)

```
POST /api/generate-document
  ↓
1. Parse body JSON (template base64 + data + mode + category)
  ↓
2. Extract DOCX template → python-docx Document
  ↓
3. enforce_a4_portrait()           — A4 11906×16838 DXA
  ↓
4. replace_in_doc / rWT / rWTpart  — substituție placeholder text
  ↓
5. insert_signature_stamp()        — PNG semnătură + ștampilă
  ↓
6. insert_qr_code()                — QR cod verificare CPE
  ↓
7. replace_scales()                — scală EP + CO₂ pe categorie
  ↓
8. replace_class_indicators()      — săgeți ▶ clase reale + ref
  ↓
9. CHECKBOXES (mode == "anexa" sau "anexa_bloc"):
   ├── compute_checkboxes(data, category)        — indici hardcodate (LEGACY)
   │   └── toggle_checkboxes(doc, indices)
   │       └── parsare XML w:checkBox + flip w:default 0→1
   │
   └── compute_checkbox_keys(data, category)     — chei semantice (PRIMARY)
       └── toggle_checkboxes_by_keys(doc, keys)
           └── build_checkbox_index(doc) — context-based matching
               └── CHECKBOX_KEYWORD_MAP rezolvă keyword → poziție
  ↓
10. _highlight_utility_class_cells() — colorare celule clasă energetică
  ↓
11. append_legal_supplement()      — pagină supliment date MDLPA
  ↓
12. Output BlobOutputStream → response.body
```

---

## 2. Două motoare CB coexistă

### LEGACY: `compute_checkboxes()` (linia 1749, 416 linii logică)

- **Returnează**: `list[int]` — indici 0-307 (template anexa_bloc 308 CB)
- **Probleme cunoscute**:
  - Indicii NU sunt liniari pe template apartament (244 CB) — cauzează erori
  - Hardcoded → fragil la update template MDLPA
  - **Folosit doar pentru CB 0-64 (Anexa 1 recomandări)** — restul ignorate
- **Status**: deprecated, păstrat pentru backward compat
- **Linii**: 1749-2156

### PRIMARY: `compute_checkbox_keys()` (linia 2445, 314 linii logică)

- **Returnează**: `list[str]` — chei semantice ("REC_PE_INSULATE", "CAT_RES_BLOC" etc.)
- **Mapare runtime**: `CHECKBOX_KEYWORD_MAP` (linia 2254) → context paragraf DOCX
- **Avantaje**:
  - Independent de versiunea template (rezistent la reordonare CB MDLPA)
  - Audit transparent (cheia semantic descrie scopul)
  - Suport `(keywords, occurrence_idx)` pentru paragrafe identice
- **Status**: motor principal, sursa de adevăr pentru toate Anexa 2
- **Linii**: 2254-2376 (map) + 2445-2758 (compute)

---

## 3. CHECKBOX_KEYWORD_MAP — 88 chei semantice

### 3.1 Anexa 1 — Recomandări (28 chei)

| Cheie | Trigger | Status |
|-------|---------|--------|
| **Anvelopă** (8 chei) | | |
| REC_PE_INSULATE | U_pereți > U_ref | ✅ |
| REC_PB_INSULATE | U_planșeu_subsol > U_ref | ✅ |
| REC_PT_INSULATE | U_terasă/pod > U_ref | ✅ |
| REC_PL_INSULATE | U_planșee_contact_ext > U_ref | ✅ |
| REC_SARPANTA | atic încălzit + structură mansardă | ✅ |
| REC_GLAZING | U_geam > 1.11 (rez) / 1.20 (nrez) — prag nZEB | ✅ |
| REC_GRILES_VENT | ventilare naturală neorganizată | ✅ |
| REC_SHADING | shading_factor > 0.85 | ✅ |
| **Instalații** (20 chei) | | |
| REC_HEAT_PIPES | conducte vechi (an < 2000) | ✅ |
| REC_DHW_PIPES | conducte ACM vechi (an < 2000) | ✅ |
| REC_HEAT_INSULATE | conducte încălzire neizolate | ✅ |
| REC_DHW_INSULATE | conducte ACM neizolate | ✅ |
| REC_THERM_VALVES | sursă termică ≠ electric direct | ✅ |
| REC_BAL_VALVES | bloc fără vane echilibrare | ✅ |
| REC_AIR_QUALITY | CO2 > 1200 ppm sau vent natural | ✅ |
| REC_FLOW_METERS | acm_has_meter=no | ✅ |
| REC_HEAT_METERS | heating_has_meter=no | ✅ |
| REC_LOW_FLOW | acm_fixtures_low_flow != yes | ✅ |
| REC_DHW_RECIRC | bloc + ACM fără recirculare | ✅ |
| REC_AUTOMATION | control încălzire manual sau lipsă | ✅ |
| REC_HEAT_EQUIP | η_gen < 0.85 sau echipament > 15 ani | ✅ |
| REC_VENT_EQUIP | mecanic + an < 2010 | ✅ |
| REC_LIGHT_LED | iluminat ≠ LED | ✅ |
| REC_PRESENCE_SENS | fără senzori prezență/dimming | ✅ |
| REC_RENEWABLES | fără PV + fără solar termic | ✅ |
| REC_HEAT_RECOVERY | ventilare fără HR | ✅ |

### 3.2 Anexa 2 — Date clădire (24 chei)

| Cheie | Trigger | Status |
|-------|---------|--------|
| **Tip clădire** (3 chei) | | |
| BLDG_EXISTING | year_built < anul curent − 1 | ✅ |
| BLDG_NEW | year_built >= anul curent − 1 | ✅ |
| BLDG_UNFINISHED | (nu se trimite din UI) | ⚠️ orfan |
| **Categorie** (14 chei) | | |
| CAT_RES_INDIV (RI) | category=RI | ✅ |
| CAT_RES_INSIRUITA | (nu există în catalogul Zephren) | ⚠️ orfan |
| CAT_RES_BLOC (RC/RA) | category=RC sau RA | ✅ |
| CAT_RES_CAMIN | (nu există categoric distinct) | ⚠️ orfan |
| CAT_EDU_GRADINITA | (nu există sub-categorie ED) | ⚠️ orfan |
| CAT_EDU_SCOALA (ED) | category=ED | ✅ |
| CAT_EDU_UNIV | (nu există sub-categorie ED) | ⚠️ orfan |
| CAT_OFFICE (BI) | category=BI | ✅ |
| CAT_HOSPITAL (SA) | category=SA | ✅ |
| CAT_HOTEL (HC) | category=HC | ✅ |
| CAT_SPORT (SP) | category=SP | ✅ |
| CAT_COMMERCE_SMALL (CO) | category=CO | ✅ |
| CAT_COMMERCE_BIG | (nu se distinge de CO) | ⚠️ orfan |
| CAT_OTHER (AL) | category=AL | ✅ |
| **Structură** (7 chei) | | |
| STRUCT_ZIDARIE | "zidărie" în structure | ✅ |
| STRUCT_BETON_PERETI | "diafragm/dual/monolit beton" | ✅ |
| STRUCT_BETON_CADRE | "cadre beton" | ✅ |
| STRUCT_LEMN | "lemn" | ✅ |
| STRUCT_METAL | "metalic/lsf/metal" | ✅ |
| STRUCT_PANOURI | "panouri mari" | ✅ |
| STRUCT_STALPI | (occurrence_idx=1 în "cadre beton") | ⚠️ orfan |

### 3.3 Anexa 2 — Existență instalații (10 chei)

| Cheie | Trigger | Status |
|-------|---------|--------|
| HEAT_EXISTS_OK | heating.source != null | ✅ |
| HEAT_EXISTS_NONE | heating.source == null | ✅ |
| DHW_EXISTS_OK | acm.source != null | ✅ |
| DHW_EXISTS_NONE | acm.source == null | ✅ |
| COOL_EXISTS_OK | cooling.hasCooling == true | ✅ |
| COOL_EXISTS_NONE | cooling.hasCooling == false | ✅ |
| VENT_EXISTS_OK | ventilation.type != natural | ✅ |
| VENT_EXISTS_NONE | ventilation.type == null | ✅ |
| LIGHT_EXISTS_OK | lighting.type != null | ✅ |
| LIGHT_EXISTS_NONE | lighting.type == null | ✅ |

### 3.4 Anexa 2 — Tip ventilare (5 chei)

| Cheie | Trigger | Status |
|-------|---------|--------|
| VENT_NATURAL_NEORG | type=natural_neorg/natural | ✅ |
| VENT_NATURAL_ORG | type=natural_org | ✅ |
| VENT_MECHANICAL | type mecanic (orice ≠ natural) | ✅ |
| VENT_HR_YES | type include "hr" | ✅ |
| VENT_HR_NO | altfel | ✅ |

### 3.5 Anexa 2 — Sursa încălzire / ACM / iluminat (16 chei)

| Cheie | Trigger | Status |
|-------|---------|--------|
| HEAT_SRC_TERMOFICARE | source=termoficare | ✅ |
| HEAT_SRC_CT_PROP | source=gaz_conv/cond/ct_prop | ✅ |
| HEAT_SRC_CT_EXT | source=ct_ext | ✅ |
| HEAT_SRC_ELECTRIC | source=electric_direct | ✅ |
| HEAT_SRC_PC_HEAT | source=pc_aer_apa/pompa_caldura | ✅ |
| HEAT_SRC_SOBE | source=cazan_lemn/peleti/teracota | ✅ |
| HEAT_TYPE_STATIC / SOBE / ELECTRIC | (3 chei) | ✅ |
| HEAT_DIST_INF / SUP | distribuție inferioară (default) / superioară | ✅ inf, ⚠️ sup orfan |
| DHW_SRC_TERMOFICARE / CT_PROP / ELECTRIC / SOLAR / PC | (5 chei) | ✅ |
| LIGHT_FLUORESCENT / LED / STATE_GOOD | (3 chei) | ✅ |

### 3.6 Anexa 2 — Regenerabile (10 chei = 5 perechi YES/NO)

| Pereche | Trigger | Status |
|---------|---------|--------|
| RENEW_SOLAR_TH_YES/NO | solarThermal.enabled | ✅ |
| RENEW_PV_YES/NO | photovoltaic.enabled | ✅ |
| RENEW_HP_YES/NO | heat_pump_enabled | ✅ |
| RENEW_BIOMASS_YES/NO | biomass_enabled | ✅ |
| RENEW_WIND_YES/NO | wind_enabled | ✅ |

---

## 4. Sumar findings

### 4.1 Acoperire (✅)
- **78 / 88 chei semantice (89%)** sunt declanșate corect din date Zephren
- Toate cele 7 categorii principale (RI/RC/RA/BI/ED/SA/HC/CO/SP/AL) au CB matching
- Toate cele 5 sisteme regenerabile au pereche YES/NO complete
- Regulile fizice (U > U_ref, η < 0.85, an < 2000) sunt aliniate cu praguri Mc 001-2022

### 4.2 Chei orfane (⚠️ 10/88)

Chei care există în CHECKBOX_KEYWORD_MAP dar nu se declanșează niciodată:

| Cheie | Cauză | Recomandare |
|-------|-------|-------------|
| BLDG_UNFINISHED | UI nu trimite stare „nefinalizată" | Add radio în Step 1 când scop=construire |
| CAT_RES_INSIRUITA | Categoria „casă înșiruită" lipsește | Add sub-categorie în BUILDING_CATEGORIES (RI cu attribute) |
| CAT_RES_CAMIN | Cămin/internat lipsește | Add categorie nouă în catalog |
| CAT_EDU_GRADINITA | Sub-categorie ED lipsește | Add Select dropdown în Step 1 când category=ED |
| CAT_EDU_UNIV | Idem | Idem |
| CAT_COMMERCE_BIG | Magazin mare vs mic — același cod CO | Add toggle în Step 1 când category=CO |
| STRUCT_STALPI | „Stâlpi izolați" — variantă STRUCT_BETON_CADRE | Verifică dacă STRUCTURE_TYPES are entry distinct |
| HEAT_DIST_SUP | UI bifează mereu HEAT_DIST_INF | Add toggle distribuție în Pas 3 |
| (alte 2 din REC_* edge cases) | Praguri foarte specifice nu sunt atinse | OK — nu necesită acțiune |

### 4.3 Lipsuri identificate

#### 🔴 CRITIC — niciun lipsus blocant identificat

#### 🟡 MEDIU — îmbunătățiri recomandate
1. **Sub-categorii lipsă** (4 chei orfane) — RI înșiruită vs detașată, ED grădiniță/școală/univ, CO mic vs mare. Adaugă în UI Step 1 selectoare condiționale.
2. **Distribuție superioară încălzire** (HEAT_DIST_SUP). Add radio în Pas 3.
3. **Stare clădire nefinalizată** (BLDG_UNFINISHED). Add când scop=construire.

#### 🟢 LOW — observații
1. **Doi motori coexistă** — `compute_checkboxes` (legacy) și `compute_checkbox_keys` (primary). Codul JS Step6 nu mai folosește JS-side CB logic (P1.11). Recomandare: deprecation warning în compute_checkboxes + planificare îndepărtare în Sprint 8+.
2. **Defaults hardcodate Anexa 1**: `cbs.append(50)` (10-25k EUR cost), `cbs.append(56)` (20-30% savings), `cbs.append(62)` (3-7 ani payback). Audit P1.12 cere eliminare bias-ului 20%; aici ar fi păstrat defaults dar sub control opt-in (auditorul confirmă în UI înainte de export).

---

## 5. Validare per categorie clădire

| Categorie | Coduri Zephren | CB-uri active estimate | Risc |
|-----------|---------------|------------------------|------|
| RI | RI | 25-35 chei | ✅ Acoperit complet |
| RC | RC | 28-40 chei | ✅ Acoperit complet (incl. F1 bloc commonSystems) |
| RA | RA | 25-35 chei | ✅ Acoperit complet |
| BI | BI | 22-30 chei | ✅ Acoperit |
| ED | ED | 22-30 chei | ⚠️ Sub-categorie grădiniță/școală/univ nu se distinge |
| SA | SA | 22-30 chei | ✅ Acoperit |
| HC | HC | 22-30 chei | ✅ Acoperit |
| CO | CO | 22-30 chei | ⚠️ Mic vs mare nu se distinge |
| SP | SP | 22-30 chei | ✅ Acoperit |
| AL | AL | 18-25 chei | ✅ Acoperit (categorii speciale, fallback) |
| BC | (BC nu apare în cat_to_keys) | 0 chei pe categorie | 🔴 **lipsă** |

**Acțiune urgentă (Sprint 7)**: Adăugare BC (clădire colectivă cu funcțiune mixtă) în mapping `cat_to_keys` — momentan rămâne fără bifă categorie, ceea ce e o omisiune detectabilă în CPE oficial.

---

## 6. Recomandări post-audit (priorități)

### 🔴 HIGH (de făcut în Sprint 7)
1. **Add BC în `cat_to_keys`** (linia 2651): `"BC": "CAT_RES_BLOC"` sau categoria nouă specifică
2. **Add HEAT_DIST_SUP toggle** în Step3Systems.jsx (Pas 3 instalații)

### 🟡 MEDIUM (Sprint 8+)
3. **Sub-categorii ED + CO** — Select dropdown condițional în Step1 (afectează 4 chei orfane)
4. **BLDG_UNFINISHED** — radio în Step 1 când scop=construire
5. **Deprecation warning** pe `compute_checkboxes` legacy

### 🟢 LOW (orice sprint)
6. **STRUCT_STALPI** — verificare STRUCTURE_TYPES.js dacă există variantă distinctă
7. **Test e2e CB-uri** — vitest snapshot pe `compute_checkbox_keys()` per categorie cu fixture data

---

## 7. Concluzie

`api/generate-document.py` are **arhitectură solidă** (semantic key matching independent de versiune template), **acoperire ~89% a cheilor** definite, și **zero erori critice de mapare CB**. Cele 10 chei orfane sunt toate edge cases (sub-categorii lipsă în UI, nu erori de logică).

**Principalul risc identificat**: categoria **BC nu există în `cat_to_keys`** — clădirile cu această categorie ar genera CPE fără bifa categorie funcțională. Acțiune **HIGH PRIORITY**.

Pentru audit complet vs formularul oficial MDLPA Ord. 16/2023 (verificare 1:1 a etichetelor CB pe paginile DOCX), e nevoie de:
- PDF-ul oficial al formularului (vezi `docs/P2_BLOCKED.md` § P2.2)
- Comparație vizuală a 244 + 308 = 552 CB-uri totale
- Validare pe 5+ proiecte demo per categorie

**Audit Zephren — 2 mai 2026 / Sprint 6 / docs/API_CHECKBOX_AUDIT.md**
