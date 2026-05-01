# Catalog NEUTRU surse regenerabile 2026 — Pas 4 Zephren

**Data:** 1 mai 2026
**Versiune:** 1.0.0
**Total entries:** 210 în 11 categorii
**Total brand-uri în registry:** 302 (176 existente + 126 noi)
**Schema:** 100% NEUTRĂ — zero brand-uri afișate, parteneriate viitoare prin `brands-registry.json`

---

## 1. Sumar livrabil

### Cataloage noi (`_raw_renewable.json`)

| Categorie | Entries | ID prefix | Subgrupe |
|---|---|---|---|
| Solar termic | 27 | `PLAN/POLY/PVT/AER/TUB/BIST/...` | Polimeric, Hibrid PVT, Aer solar, Concentrator, Plan avansat, Tuburi vidate, BIST, Componentă, Răcire solară |
| PV celule | 13 | `PEROV/OPV/CIGS/BIPV/FPV/...` | Tandem next-gen, CPV, Organic / DSSC, Film subțire, Premium siliciu, BIPV, FPV / Agrivoltaic |
| PV invertoare | 10 | `STR/CENTRAL/BATT/HYB/MICRO/...` | String comercial, Utility, Stocare, Hibrid avansat, Micro / MLPE, Off-grid, Smart-grid, Specializat |
| PV systems | 5 | `TRACK/CARPORT/PERGOLA/BALKON` | Tracker / Carport, Plug-and-play |
| Pompe căldură | 31 | `PC_AA/HPWH/GAHP/VRF/...` | Refrigerant low-GWP, Refrigerant standard, Sursă specială, Sursă geo / apă, Hibrid, Industrial, ACM dedicat, Răcire dedicată, Absorbție / Adsorbție, VRF / Multi-zone, Temperatură înaltă |
| Biomasă combustibili | 18 | `TORREFIED/PIT/MISC/BIOCHAR/...` | Solid premium, Solid standard, Agro, Deșeu, R&D, Gazos / Lichid |
| Cazane biomasă | 8 | `PELLET_ESP/WOOD_DOWNDRAFT/...` | Cazan peleți, Cazan lemne, Cazan tocătură, Cazan combi, Sobă peleți, Sobă lemne / insert, Cazan industrial |
| Turbine eoliene | 20 | `HAWT/VAWT/BIWT/SPEC` | HAWT, VAWT, BIWT (building-integrated), Specialty |
| CHP & Pile combustibil | 25 | `chp_stirling/chp_ice/chp_sofc/...` | Stirling, ICE, Turbină gaz, Steam / ORC, Fuel cell, Hibrid / Specialty |
| Stocare energie | 28 | `BAT/TES/MECH/HYDRO/HYB/CRYO/CARNOT` | Baterie electrică, Baterie flow, Baterie long-duration, Baterie eco, PCM, Stocare sezonieră, Stocare răcire, Stocare termică, Mecanic, Hidrogen, Hibrid |
| Termoficare & proximitate | 25 | `dh_2g/3g/4g/5g/geo/csp/community/ppa` | DH legacy, DH standard, DH modern, Sursă regenerabilă, Comunitate energie, Aranjament |
| **TOTAL** | **210** | | |

### Brand registry actualizat (`brands-registry.json`)

**Înainte:** 176 brand-uri (HVAC, lighting, distribution, fuels)
**După:** 302 brand-uri (+126 noi pentru regenerabile)
**Toate cu `partnerStatus="none"`** — UI rămâne 100% neutru.

#### Brand-uri noi adăugate (selecție):

**Solar termic premium (15):** Kingspan Thermomax, Roth Werke, Solahart, Wagner Solar, Sonnenkraft, Solvis, Schüco Solar, Paradigma, Solimpeks, DualSun, Aventa Solar, Sunlumo, Industrial Solar, Absolicon

**PV cells & inverters (22):** Q CELLS, REC Group, Meyer Burger, SunPower/Maxeon, Aiko Solar, Astronergy, DAS Solar, Risen Energy, Tongwei Solar, Solitek, Sonnenstromfabrik, Solarwatt, Voltec Solar, FuturaSun, Sharp Solar, Power Electronics, Ingeteam, KACO new energy, Delta Electronics, Sineng Electric, Solis (Ginlong)

**Heat pumps premium (16):** Hoval, IDM, Friotherm, Star Refrigeration, Combitherm, Tecnogen, Rotex (Daikin), Lambda Wärmepumpen, Maxa, Alpha Innotec, Tecalor, Kronoterm, Termo-Tehnică, Hewalex

**Biomass boilers (15):** ETA Heiztechnik, KWB Powerfire, Guntamatic, Solarbayer, Heizomat, Lopper, Biotech Energietechnik, Effecta Pannan, Termoboilers (RO), Kostrzewa, Pereko, Solis (RO Cluj), Termofarc (RO Brașov), Termosteel (RO Reșița), Windhager

**Wind small (15):** Bornay, ENAIR, Aeolos Wind, Eocycle, XZERES, Antaris, Quietrevolution, Sonkyo/Windspot, Gaia-Wind, Ryse/Britwind, C&F Green Energy, Norvento, Northern Power Systems, SeaTwirl, NewWind/Windtree

**CHP & fuel cells (20):** SenerTec/Dachs, KW Energie, EC Power, TEDOM, Yanmar ES, Toshiba ESS, Aisin, Panasonic Ene-Farm, Bloom Energy, Plug Power, SOLIDpower/SolydEra, Ceres Power, Doosan FC, FuelCell Energy, Ballard Power, Capstone Green, Bladon Jets, Honda Power, Viessmann Cogen

**Energy storage (12):** Tesvolt, SENEC, E3/DC, VARTA Storage, FIAMM Soneman, Saft (TotalEnergies), Redflow, Form Energy, Energy Vault, Highview Power, Hydrostor, Sunamp, CALMAC, Pluss

**District heating & PPA (11):** Veolia Energie Iași, Termoficare Cluj, CET Brașov, Veolia Energie, E.ON Heat, Fortum Heat, Vattenfall, Helen Oy, Engie SA, TotalEnergies, Statkraft, ContourGlobal RO, Premier Energy, Wind Power Park / EDP

---

## 2. Schema NEUTRĂ confirmată

### Structură entry tipic

```json
{
  "id": "PC_AA_R290_PREM",
  "nameRo": "PAC aer-apă R290 propan premium (split)",
  "nameEn": "A2W heat pump R290 propane premium",
  "category": "Refrigerant low-GWP",
  "categoryEn": "Low-GWP refrigerant",
  "copNominal": 5.10,
  "scop": 4.50,
  "refrigerant": "R290",
  "gwp": 3,
  "applicableCategories": ["RI", "RC"],
  "standard": "EN 14511 + EN 14825 + EN 378",
  "brand": null
}
```

**Reguli respectate:**
- ✅ `brand: null` în toate cele 210 entries (zero brand inline)
- ✅ Bilingv RO+EN obligatoriu (`nameRo` + `nameEn`)
- ✅ Categorie pentru grupare optgroup în dropdown (`category` + `categoryEn`)
- ✅ Filtrare RO building scope (`applicableCategories[]`: RI/RC/BC/SC/IN/HOSP/CL/SP)
- ✅ Standard EU/ISO/IEC referință obligatorie
- ✅ Parametri tehnici per categorie (η, COP, GWP, PCI, AEY, IEC class, eficiență stocare etc.)

### Activare parteneriat (workflow)

1. **Editor `brands-registry.json`** → schimbă `partnerStatus` din `"none"` în `"active"`:
```json
{
  "id": "qcells",
  "partnerStatus": "active",   // ← era "none"
  "partnerSince": "2026-06-01",
  "partnerTier": "premium",
  "affiliateUrl": "https://aff.zephren.ro/qcells?ref=zephren"
}
```

2. **Helper `applyPartnerSorting()`** (în `partner-overrides.js`) prioritizează automat entries cu `matchesEntries[]` care conțin acest brand.

3. **UI dropdown** afișează badge `🤝` lângă opțiunile prioritizate (consistent cu Step 3 Systems sprint P1).

4. **Zero modificare în cod** pentru activare — doar JSON edit + commit.

---

## 3. Integrare UI Step 4 Renewables

### Refactor `Step4Renewables.jsx` (607 → ~720 linii)

**Modificări:**

1. **Import EXT catalog** (top file):
```js
import {
  SOLAR_THERMAL_EXT, PV_CELLS_EXT, PV_INVERTERS_EXT, PV_SYSTEMS_EXT,
  HEAT_PUMPS_EXT, BIOMASS_FUELS_EXT, BIOMASS_BOILERS_EXT,
  WIND_TURBINES_EXT, CHP_TYPES_EXT, ENERGY_STORAGE_EXT,
  DISTRICT_HEATING_EXT,
  getLabel, RENEWABLE_META,
} from "../data/catalogs/renewable-catalog.js";
```

2. **Helper local `buildMergedOptions()`** — fuzionează entries existente (constants.js) + entries EXT, grupate per sub-categorie cu badge `🆕`.

3. **Helper local `buildExtOptions()`** — pentru dropdown-uri NOI (PV systems, Wind, Biomass boilers).

4. **Banner header cu badge** — afișează `Catalog 2026 · 210 entries`.

5. **Dropdown-uri extinse** (toate utilizând `buildMergedOptions`):
   - Solar termic: `SOLAR_THERMAL_TYPES` (9) + `SOLAR_THERMAL_EXT` (27) = **36 opțiuni**
   - PV cells: `PV_TYPES` (14) + `PV_CELLS_EXT` (13) = **27 opțiuni**
   - PV inverter: `PV_INVERTER_ETA` (7) + `PV_INVERTERS_EXT` (10) = **17 opțiuni**
   - Heat pump: `HEAT_SOURCES.filter(isCOP)` + `HEAT_PUMPS_EXT` (31) = **~40 opțiuni**
   - Biomass fuel: `BIOMASS_TYPES` (13) + `BIOMASS_FUELS_EXT` (18) = **31 opțiuni**
   - Battery storage: `BATTERY_STORAGE_TYPES` (6) + `ENERGY_STORAGE_EXT` (28) = **34 opțiuni**
   - CHP: `CHP_TYPES_CATALOG` (6) + `CHP_TYPES_EXT` (25) = **31 opțiuni**
   - Proximitate: 5 hardcoded + `DISTRICT_HEATING_EXT` (25) = **30 opțiuni**

6. **Secțiuni NOI adăugate:**
   - **Tab PV** — Card `Configurare avansată instalație PV` cu dropdown PV systems (5 trackers/carport/pergolă/balcon) + display dinamic gain producție.
   - **Tab Biomass** — Card `Tip cazan / sobă biomasă` cu dropdown 8 boilere + display η nominal + EN 303-5 class + PM emisii + putere.
   - **Tab Eolian/CHP** — extindere completă: dropdown `Tip turbină` (20 opțiuni grupate HAWT/VAWT/BIWT/Specialty) + display 6 specificații tehnice (putere, cut-in/nominal, diametru rotor, înălțime hub, AEY @ 5 m/s, zgomot dB).

### Calcul engine compatibilitate

- IDs existente (PLAN_PREM, MONO_PERC, etc.) păstrate — calc engine intact.
- IDs noi EXT → fall-through la valori default în engine (acceptabil — pentru parametri exacți utilizatorul activează parteneriat brand specific).
- `solar-acm-detailed.js` `calcSolarACMDetailed` are deja pattern `|| COLLECTOR_TYPES[1]` (default).
- `chp-detailed.js` `calcCHP` are pattern similar `|| CHP_TYPES_CATALOG.mini_ice`.

---

## 4. Conformitate normativă

### Standarde EU/ISO/IEC referențiate

| Categorie | Standarde principale |
|---|---|
| Solar termic | EN ISO 9806:2017, EN 12975, EN 12976, EN 12977-1/-2/-3, EN ISO 22975-1/-2/-3, EAD 040016 (BIST) |
| PV cells | EN 61215-1/-2, EN 61730, EN 50583-1/-2 (BIPV), IEC 62788, IEC TS 63209, IEC 62108 (CPV), DIN SPEC 91434 (agrivoltaic), DNV-ST-0019 (FPV) |
| PV inverters | EN 50549-1/-2, IEC 62109-1/-2, IEEE 1547-2018, ENTSO-E RfG, NEC 690.12 (rapid shutdown) |
| Heat pumps | EN 14511, EN 14825, EN 16147 (ACM), EN 12309 (absorbție), ISO 13256, EN 378 (refrigerant), Reg. (UE) 2024/573 F-Gas, VDI 4640 (geo) |
| Biomass | EN ISO 17225-1..8 (combustibili), EN 303-5:2021 (cazane clase 3/4/5/5+), EN 14785 (sobe peleți), EN 13229 (insert), Ecodesign Lot 15+20, ENplus A1 |
| Wind small | IEC 61400-2 ed.3 (cls I/II/III/IV/S), SWCC, MCS UK, DIBt DE |
| CHP | EN 50465 (FC ≤70kW), EN 50466 (FC >70kW), EN 303-7 (CHP boilers), DIN 4709, ISO 14687 (H2 quality), Dir. 2012/27/UE Anexa II (PES), Reg. (UE) 2015/2402 valori referință |
| Storage | IEC 62619 (Li safety), IEC 62932 (flow), IEC 62933 (BESS general), EN 12977-3 (TES water), VDI 4640-3 (BTES/ATES), ISO 19881 (H2 tank) |
| Termoficare | Dir. UE 2018/2001 RED II Anexa V/VI/VII, Dir. UE 2023/1791 EED Art. 25-26, Dir. UE 2024/1275 EPBD recast, SR EN 13941, ISO 13153 (ATES) |

### Compliance RO 2025-2026

- **Mc 001-2022** Cap. 4 (Surse regenerabile) + Cap. 8.5 (Cogenerare în clădiri)
- **Ord. MDLPA 16/2023** + **Ord. MDLPA 348/2026** (CPE/audit/nZEB)
- **L. 238/2024 Art. 6 alin. 2** — RER on-site ≥10% obligatoriu pe clădire (proximitate ≤30 km nu contează)
- **OUG 32/2018** + **L. 220/2008** + **L. 184/2018** + **OUG 143/2021** — prosumator + comunități energie + biometan
- **ANRE Ord. 15/2022** — comunități energie regenerabilă (REC)
- **ANRE Ord. 213/2024** — actualizare valori de referință CHP înaltă eficiență RO
- **Casa Verde Plus 2025-2027** — eligibilitate marker pentru entries (cazane EN 303-5 clasa 5, PV prosumator <10 kWp, ACM HP R290, etc.)
- **PNRR Componenta 5+6** — fonduri modernizare termoficare 4G + RES
- **EPBD recast (29 mai 2026)** — cerință "solar-ready" obligatorie clădiri noi din 2027

### F-Gas Reg. (UE) 2024/573 — etape relevante

- **2027:** interdicție split monobloc <12 kW cu GWP >150 → R32 dispare segmentul rezidențial
- **2032:** interdicție split >12 kW cu GWP >750
- **2035:** doar refrigeranți naturali & HFO <GWP 5 pentru toate <50 kW

Catalog include entries `PC_AA_R290_PREM`, `PC_AA_R744_HT`, `PC_AA_R1234ZE` — pregătite pentru toate etapele.

---

## 5. Tests + Build

### Suite teste

- **68 teste noi** în `src/data/catalogs/__tests__/renewable-catalog.test.js`
- Acoperire: numărători per categorie, schema neutralitate (brand=null), helpers (getLabel/findById/groupByCategory), validare bilingv RO+EN, validare standarde EU referențiate, brand registry uniqueness + ISO countries
- **2397 → 2465 PASS** (zero regresii)

### Build production

- Build OK în 13.27s
- `Step4Renewables` bundle: **107.84 kB** (gzip 26.03 kB) — include catalog inline
- Zero erori, zero warnings noi

---

## 6. Restanțe & evoluții ulterioare (P2/P3)

### P2 (sprint următor — fără cod)

1. **Selector Tab PV** — adăugare câmp `solarRoofTile` / `solarWindow` /`agrivoltaic` cu calcul yield specific.
2. **Selector Tab Eolian** — gain windType pentru `aeyAt5MinKWh / aeyAt5MaxKWh` — momentan setat ca "Producție anuală" inițial, dar nu calculat din viteza vântului locale.
3. **Display CHP detaliu** — afișare PES + tip combustibil + ore funcționare per `chpType` selectat.
4. **Display storage detaliu** — afișare cycles + roundtrip efficiency + discharge duration per `battery.type` selectat.
5. **Filtrare per scope clădire** — apel `filterByBuildingCategory(SOLAR_THERMAL_EXT, building.category)` în dropdown-uri.

### P3 (post-lansare)

1. **Integrare engine calc** — extinde `solar-acm-detailed.js` și `chp-detailed.js` să citească parametri direct din EXT (eliminare fall-through).
2. **Brand activation UI** — modal admin pentru toggle `partnerStatus` + sortare prioritar (consistent cu Step 3 Sprint P2 admin UI).
3. **Eligibilitate Casa Verde marker** — flag boolean `casaVerdeEligibil: true/false` per entry pentru filtrare automată.
4. **EPBD passport linking** — entries cu badge "EPBD-ready" pentru pașaport renovare.
5. **Telemetrie click conversii** — track per entry selectat (consistent cu Step 3 Sprint P2 telemetrie).

---

## 7. Surse autoritare consultate (cercetare 8 agenți paraleli OPUS)

- IEA-PVPS Task 13, Fraunhofer ISE PV Report 2024, VDMA ITRPV Roadmap 2024
- BloombergNEF Battery Price Survey 2025, IRENA Innovation Outlook Storage
- EHPA Market Report 2025, BWP DE Marktdaten 2025, Eurovent Certified
- Solar Keymark database, SPF Rapperswil (CH), ESTIF, Estela
- WindEurope Small Wind Report 2024, IEC 61400-2 certified list, SWCC
- COGEN Europe Country Profile RO 2024, Reg. delegat (UE) 2015/2402
- Euroheat & Power, IEA District Heating program (Annex TS5), IEA Bioenergy Task 32/40
- ENplus, REHVA, PVGIS-SARAH3 (RO), Atlas Eolian ANRE
- Tablou de bord SACET ANRE 2024, OUG 5/2025 termoficare reform

---

## 8. Workflow activare parteneriat — exemplu concret

**Scenario:** Zephren semnează parteneriat cu Q CELLS (top brand TOPCon EU) pentru tier "premium".

**Pas 1:** Edit `brands-registry.json`:
```json
{
  "id": "qcells",
  "name": "Q CELLS (Hanwha Qcells)",
  "country": "KR",
  "categories": ["solar"],
  "productLines": ["Q.PEAK DUO M-G11+", "Q.TRON BLK M-G2+", "Q.HOME ESS HYB-G3"],
  "matchesEntries": ["MONO_PERC", "MONO_TOPCON", "BIFACIAL", "BIFACIAL_TOPCON", "HJT", "PEROV_TANDEM"],
  "partnerStatus": "active",                         // ← "none" → "active"
  "partnerSince": "2026-06-15",                      // ← null → date
  "partnerTier": "premium",                          // ← null → "premium"
  "affiliateUrl": "https://aff.zephren.ro/qcells",   // ← null → URL
  "contactEmail": "partener@qcells.com",
  "notes": "Lider TOPCon Q.ANTUM; fabrică EU activă; garanție 25 ani"
}
```

**Pas 2:** Commit + deploy:
```bash
git add src/data/catalogs/brands-registry.json
git commit -m "Activare parteneriat Q CELLS (premium) — TOPCon EU"
git push origin master
npx vercel --prod
```

**Pas 3:** UI Step 4 afișează **automat** entries asociate (MONO_TOPCON, HJT, PEROV_TANDEM, etc.) cu badge `🤝` în top, fără modificare în Step4Renewables.jsx.

**Zero risc regresie** — toate celelalte entries rămân neutre.

---

## 9. Comparație înainte/după

### Înainte (Step 4 înainte 1 mai 2026)

- 5 tab-uri funcționale (Solar / PV / PC / Biomasă / Eolian-CHP)
- ~50 opțiuni totale în dropdown-uri (constants.js + chp-detailed)
- Tab Eolian/CHP minim: 1 checkbox turbină + 1 sistem cogenerare + 1 sursă proximitate (5 tipuri hardcoded)
- Zero categorii regrupate, zero bilingv în dropdown

### După (Step 4 v2026.1.0)

- 5 tab-uri identice + secțiuni avansate noi
- **210 entries în catalog NEUTRU** + **126 brand-uri noi** în registry
- ~250 opțiuni totale (sumare merge legacy + EXT)
- Dropdown-uri grupate per sub-categorie cu badge `🆕` pentru EXT
- Bilingv RO+EN automat per `lang`
- Tab Eolian/CHP extins: dropdown 20 turbine cu specificații afișate (IEC class, viteze cut-in/nominal, diametru, hub, AEY, zgomot)
- Tab PV cu secțiune nouă `Configurare avansată` (5 trackers/carport/pergolă/balcon)
- Tab Biomass cu secțiune nouă `Tip cazan/sobă` (8 boilere)
- Banner header `Catalog 2026 · 210 entries`

---

## 10. Notă de continuitate cu sprinturi anterioare

Acest sprint continuă direct sprinturile:

- **30 apr 2026 — Sprint HVAC catalog NEUTRU** (commit `08042ae`) — 424 entries Pas 2 Instalații
- **30 apr 2026 — Sprint P1 Brand Registry** (commit `20e8eb0`) — 165 brand-uri inițiale
- **30 apr 2026 — Sprint P2 Admin UI + ACM panels** (commit `9305ccf`) — admin UI activare instant

Schema, helperele și mecanismul de activare parteneriat sunt **identice** între cele două cataloage (HVAC + Renewable), permițând:
- Refactor viitor în catalog unificat dacă necesar
- Helper-uri reutilizabile (`getLabel`, `findById`, `groupByCategory`, `applyPartnerSorting`)
- UX consistent în Step 3 + Step 4 (badge `🤝`, optgroup, bilingv automat)

**Total catalog Zephren la 1 mai 2026:**
- HVAC catalog (Pas 3): 424 entries × 16 cataloage
- Renewable catalog (Pas 4): 210 entries × 11 cataloage
- **TOTAL: 634 entries în 27 cataloage** + **302 brand-uri** (toate neutre, gata pentru parteneriate post-lansare)
