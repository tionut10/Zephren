# DEMO Models v2 — Test Matrix end-to-end

**Generat**: 27 apr 2026 · **Sprint**: refacere DEMO v2 (zone climatice I-V)

Matrice **5 modele × 8 etape (Step 1-8)** pentru verificarea end-to-end a aplicației Zephren.
Fiecare celulă listează **valorile critice de verificat** pe ecran și în documentele generate.

---

## Legenda zonelor climatice (Mc 001-2022)

| Zonă | Climat | Locația modelului | Lat (°N) | GD aprox. | Caracteristic |
|---|---|---|---|---|---|
| **I** | Caldă | Constanța (M1) | 44.18 | ≤ 2000 | Litoral, vară lungă |
| **II** | Sud-est | București (M2) | 44.48 | 2000-2400 | Câmpie, dominant încălzire |
| **III** | Centru | Cluj-Napoca (M3) | 46.78 | 2400-3000 | Cel mai mare lot audit RO |
| **IV** | Rece | Brașov (M4) | 45.64 | 3000-3500 | Depresiune intramontană |
| **V** | Montană | Predeal (M5) | 45.51 | > 3500 | > 1000 m altitudine |

---

## Step 1 — Identificare clădire

| Criteriu | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **Adresă** | Bd. Tomis 287, Constanța | Bd. Pipera 1B, București | Str. Donath 84, Cluj | Str. Aurel Vlaicu 8, Brașov | Str. Cioplea 142, Predeal |
| **Cad. + CF** | 215680-C1-U18 | 263410-C1 | 318745-C1 | 104587-C1 | 104287-C1 |
| **Categorie** | RA (apt. bloc) | BI (birouri) | RI (casă unif.) | ED (educație) | HC (cazare) |
| **An constr.** | 1972 | 2024 | 1998 (ren. 2015) | 1985 (ren. 2022) | 2010 |
| **Au [m²]** | 65 | 5400 | 145 | 1850 | 380 |
| **Volum [m³]** | 162 | 17280 | 405 | 6475 | 1140 |
| **n50 [h⁻¹]** | 7.5 (rău) | 1.0 (nZEB) | 4.0 | 1.5 | 3.0 |
| **GPS WGS84** | 44.18, 28.63 | 44.48, 26.14 | 46.78, 23.56 | 45.64, 25.59 | 45.51, 25.57 |
| **Scop CPE** | renovare | recepție | vânzare | renovare_majoră | închiriere |
| **Validitate** | 10 ani | 10 ani | 10 ani | 10 ani | 10 ani |
| **EV puncte** | 0 / 0 | 8 / 20 | 1 / 0 | 2 / 4 | 1 / 2 |

**Verificare automată Step 1**:
- ✅ city, county, postalCode populate
- ✅ latitude/longitude validate WGS84 (Romania)
- ✅ cadastralNumber + landBook formate corect
- ✅ owner conține nume sau CUI

---

## Step 2 — Anvelopă (opaque + glazing + bridges)

| Element | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **# Pereți (PE)** | 2 | 2 | 2 | 2 | 2 |
| **# Acoperișuri (PT)** | 0 (apt. interm.) | 1 | 1 | 1 | 1 |
| **# Plăci sol (PL)** | 1 | 1 | 1 | 1 | 1 |
| **U_pereți** [W/m²K] | ≈ 1.45 | ≈ 0.18 | ≈ 0.42 | ≈ 0.20 | ≈ 0.25 |
| **U_acoperiș** | – | 0.13 | 0.32 | 0.18 | 0.18 |
| **U_placă sol** | 1.50 | 0.32 | 1.95 (de renovat) | 0.32 | 0.32 |
| **# Vitraje** | 3 | 4 | 5 | 5 | 5 |
| **U_glaz** | 2.70 | 0.85 | 1.35 | 1.10 | 1.30 |
| **g_glaz** | 0.75 | 0.42 | 0.62 | 0.55 | 0.62 |
| **# Punți termice** | 8 | 9 | 6 | 7 | 6 |
| **Ψ punți (max)** | 0.65 (rost panou) | 0.10 | 0.55 (soclu) | 0.10 | 0.10 |

**Verificare automată Step 2**:
- ✅ Toate elementele opace au minim 2 straturi
- ✅ Toate vitrajele au {area, u, g, orientation}
- ✅ Bridges cu ψ ≥ 0 și length > 0
- ✅ U_med calculat în range așteptat (vezi tabel)

---

## Step 3 — Instalații (heating + cooling + ACM + ventilation)

| Sistem | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **Heating source** | TERMOFICARE | PC_AA | GAZ_COND | GAZ_COND | PELET |
| **Putere [kW]** | 7 | 200 | 22 | 350 | 40 |
| **η_gen** | 0.92 | SCOP 3.50 | 0.97 | 0.97 | 0.91 |
| **Emissions** | RADIATOR fontă | VENTILOCONV | MIXT pard.+rad. | RADIATOR oțel | RADIATOR Al |
| **Distribuție** | PROST | BINE_NZB | BINE | BINE_NZB | BINE |
| **Control** | MANUAL | INTELIG (BACS A) | TERMOSTAT_CRONO | TERMOSTAT_PROP | TERMOSTAT_CRONO |
| **Regim** | continuu | intermitent | intermitent | intermitent | intermitent |
| **Cooling** | LIPSĂ | PC_REV_AA SEER 6.4 | SPLIT_INV | SPLIT_INV (săli IT) | LIPSĂ |
| **ACM source** | BOILER_EL | PC_ACM | GAZ_COND | GAZ_COND | SOLAR + PELET |
| **ACM stoc [L]** | 80 | 1000 | 150 | 500 | 1000 |
| **Legionella** | NU (< 400L) | DA săpt 70°C | NU | DA săpt 70°C | DA săpt 70°C |
| **Ventilație** | NATURALA | MEC_HR80 | NATURALA_HIBRID | MEC_HR75_HIBRID | NATURALA |
| **Recuperator** | – | 80% entalpic | – | 75% pe săli mari | – |

**Verificare automată Step 3**:
- ✅ heating.source nevidă pentru toate
- ✅ Power castabil numeric
- ✅ Cooling activ doar pentru M2/M3/M4 (nu M1/M5)

---

## Step 4 — Regenerabile (PV + solar termic + HP + cogen + biomasă)

| Sursă | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **PV [kWp]** | – | 30 | 4 | 15 | 2 |
| **PV usage** | – | autoconsum | autoconsum | autoconsum | autoconsum |
| **Baterie [kWh]** | – | 60 LFP (82% autocon) | – | – | – |
| **Solar termic [m²]** | – | – | – | – | 8 (plan, 65% acop.) |
| **Heat pump** | – | PC_AA reversibilă 200 kW | – | – | – |
| **CHP cogen** | – | **50 kWel + 80 kWth gaz** | – | – | – |
| **Biomasă** | – | – | – | – | **Peleți primary** |
| **Wind** | – | – | – | – | – |
| **Proximity (30km)** | – | – | – | – | – |
| **RER total [%]** | 0 | 62 | 12 | 22 | 48 |

**Verificare automată Step 4**:
- ✅ M2 are `cogenEnabled = true` + cogenFuel = "gaz_natural"
- ✅ M5 are `biomass.enabled = true` + `solarThermal.enabled = true`
- ✅ PV peakPower castabil numeric

---

## Step 5 — Calcul (energie + clasă + KPI)

| KPI | M1 | M2 | M3 | M4 | M5 | Toleranță |
|---|---|---|---|---|---|---|
| **E_p,total** [kWh/m²·an] | 310 | 50 | 165 | 115 | 118 | ±15% |
| **E_p,nren** | 285 | 28 | 145 | 88 | 95 | ±15% |
| **E_p,ren** | 25 | 22 | 20 | 27 | 23 | ±15% |
| **Q_inc** | 215 | 18 | 95 | 58 | 145 | ±15% |
| **Q_rac** | 0 | 9 | 8 | 4 | 0 | ±20% |
| **Q_acm** | 32 | 4 | 28 | 8 | 38 | ±15% |
| **Q_il** (LENI) | 18 | 14 | 12 | 16 | 14 | ±15% |
| **Q_aux** (pompe/fans) | 4 | 5 | 2 | 6 | 4 | ±20% |
| **U_med [W/m²K]** | 1.42 | 0.18 | 0.55 | 0.24 | 0.30 | ±10% |
| **Clasa energetică** | **F** | **A** | **D** | **B** | **C** | exact |
| **U_max violations** | PE, PL, GLAZ | – | PL | – | – | – |

**Verificare automată Step 5**:
- ✅ Clasa afișată = `expectedResults.energyClass`
- ✅ E_p_nren în interval ±15%
- ✅ U_med în interval ±10%

---

## Step 6 — Certificat (BACS + SRI + MEPS + scaleVersion)

| Indicator | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **BACS clasă** | D | A | C | B | C |
| **f_BAC** | 1.10 | 0.81 | 1.00 | 0.88 | 1.00 |
| **SRI [%]** | 22 | 88 | 48 | 68 | 52 |
| **MEPS 2030** | ❌ FAIL | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| **MEPS 2033** | ❌ FAIL | ✅ PASS | ❌ FAIL | ✅ PASS | ✅ PASS |
| **MEPS 2050** | ❌ FAIL | ✅ PASS | ❌ FAIL | ❌ FAIL | ❌ FAIL |
| **Cod CPE unic** | UUID v5 | UUID v5 | UUID v5 | UUID v5 | UUID v5 |
| **scaleVersion** | 2023 | 2023 | 2023 | 2023 | 2023 |
| **Validitate ani** | 10 | 10 | 10 | 10 | 10 |
| **Scop CPE** | renovare | recepție | vânzare | renovare_majoră | închiriere |
| **Document generat** | CPE-RA + Anexă apt. | CPE-BI | CPE-RI | CPE-ED | CPE-HC |

**Verificare automată Step 6**:
- ✅ BACS class afișată în UI
- ✅ Cod CPE generat (format `CE-YYYY-NNNNN_YYYYMMDD_Nume_Județ_Cad_NNN_CPE`)
- ✅ Buton „Generează CPE" disponibil

---

## Step 7 — Audit (raport audit energetic complet)

| Element | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **Auditor** | Stoica V. (CT-01875) | Constantinescu M. (B-09245) | Pop C. (CJ-03142) | Iliescu D. (BV-04217) | Vasilescu A. (BV-04895) |
| **Grade auditor** | AE Ic | AE Ici | AE Ici | AE Ici | AE Ic |
| **Cap. 1 — Date generale** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cap. 2 — Anvelopă** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cap. 3 — Instalații** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cap. 4 — Regenerabile** | – | ✅ | ✅ (PV) | ✅ (PV) | ✅ (Biomasă+solar) |
| **Cap. 5 — Calcul** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cap. 6 — Recomandări** | ✅ multe (clasă F→C) | ✅ puține (deja optim) | ✅ moderate | ✅ mentenanță | ✅ PV upgrade |
| **Cap. 7 — Cost-Optimal** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cap. 8 — Concluzii** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Format DOCX** | A4 portret | A4 portret | A4 portret | A4 portret | A4 portret |
| **Roboto TTF** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TOC + paginare** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MDLPASubmit PDF/A-1b** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Verificare automată Step 7**:
- ✅ Auditor.cpeCode + cpeNumber + scopCpe + validityYears prezente
- ✅ Buton „Descarcă raport DOCX" disponibil
- ✅ Buton „Trimite la MDLPA" funcțional

---

## Step 8 — Module avansate (BACS detaliat, MEPS roadmap, Pașaport)

| Modul | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| **BACS 200 factori** | clasă D, dispar 5 | clasă A, complet | clasă C, parțial | clasă B, complet | clasă C, parțial |
| **SRI 42 servicii** | 22% (9/42) | 88% (37/42) | 48% (20/42) | 68% (29/42) | 52% (22/42) |
| **MEPS roadmap** | 2030 fail, plan 3 etape | 2050 pass, idle | 2033 fail, upgrade | 2050 fail, mentenanță | 2050 fail, PV upgrade |
| **Pașaport renovare detaliat** | **3 etape**, target C, LCC 28 ani | – | **2 etape**, target B | **1 etapă**, mentenanță | **1 etapă** PV |
| **Cost-Optimal** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pasivhaus check** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Mixed-use** | ❌ | ✅ (poate) | ❌ | ❌ | ❌ |
| **Historic** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Thermovision** | sugerat | – | sugerat | sugerat | sugerat |

**Verificare automată Step 8**:
- ✅ Pașaport JSON valid (UUID v4 root + UUID v5 link CPE)
- ✅ Pașaport XML conform schemă EPBD
- ✅ Pașaport DOCX A4 + QR code scanabil
- ✅ Pașaport faze numbered cu cost + ROI per fază

---

## Documente finale generate per model

| Document | Format | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|---|
| **CPE principal** | DOCX A4 | CPE-RA + Anexă-Apt | CPE-BI | CPE-RI | CPE-ED | CPE-HC |
| **Anexa 1+2 MDLPA** | DOCX A4 | ✅ apartament | ✅ clădire | ✅ clădire | ✅ clădire | ✅ clădire |
| **Raport audit complet** | DOCX A4 + Roboto | ✅ 8 cap. | ✅ 8 cap. | ✅ 8 cap. | ✅ 8 cap. | ✅ 8 cap. |
| **Pașaport renovare** | JSON+XML+DOCX+QR | ✅ 3 etape | ❌ | ✅ 2 etape | ✅ 1 etapă | ✅ 1 etapă |
| **MDLPASubmit** | PDF/A-1b | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Registru evidență** | CSV | ✅ RE-2026-CT | ✅ RE-2024-B | ✅ RE-2026-CJ | ✅ RE-2022-BV | ✅ RE-2026-BV |

---

## Comenzi utile pentru testare

```bash
# Vitest unit-test (rapid, în sub 5s)
cd "D:/Claude Projects/Zephren/energy-app"
npx vitest run src/data/__tests__/demoProjects-v2.test.js

# Playwright e2e (necesită vite dev server pe port 5173)
npx playwright test e2e/demo-models-end-to-end.spec.js

# Toate testele
npm test           # vitest
npm run e2e        # playwright (verifică package.json)
```

## Status

- ✅ 5 modele scrise + validate sintactic
- ✅ ENVELOPE_TEMPLATES refactor (8 → 5)
- ✅ Cămin Brașov 1997 eliminat complet
- ✅ Vitest + Playwright e2e teste create
- ⏳ **Build + verificări locale înainte de commit**
- ⏳ **Push + deploy automat → smoke test producție**
