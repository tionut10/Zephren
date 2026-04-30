# Catalog HVAC Neutral — Sprint Cercetare 30 Apr 2026

## Sumar executiv

Extindere masivă a bazei de date pentru **Pas 2 Instalații** (Capitolul 3 Mc 001-2022) cu **424 entries noi** organizate în 16 cataloage extinse, totalizând **~715 entries** combinate cu cataloagele existente din `constants.js`.

- **Politică NEUTRĂ**: zero brand-uri (Daikin/Viessmann/Bosch/Mitsubishi/etc. excluse). Câmp `brand: null` rezervat pentru parteneriate post-lansare.
- **Bilingv RO+EN**: toate entries noi au `nameRo` (cu diacritice corecte) + `nameEn`.
- **Surse autoritare**: fiecare entry citează standard EN/SR/ISO/EU/ASHRAE/REHVA cu an.
- **Categorii Mc 001-2022**: aplicabilitate per `applicableCategories` (toate 11 tipologii rezidențial + nerezidențial).
- **Zero breaking changes**: cataloagele existente din `constants.js` păstrate intacte; extensiile fuzionate în arrays `*_EXT`.

## Metodologie

Cercetare paralelă cu **8 agenți OPUS** rulați simultan, fiecare focalizat pe o zonă tehnică:

| Agent | Zonă | Entries noi | Surse principale |
|-------|------|-------------|-------------------|
| **A1** | Surse de căldură (generare) | 50 | SR EN 15316-4-1/4-2/4-5/4-7, EN 14511, EN 14825, VDI 4640/4645, IEA HPT, REHVA GB31 |
| **A2** | Sisteme emisie | 41 | SR EN 442, SR EN 1264, SR EN ISO 11855, EN 14037, EN 16430, REHVA GB7 |
| **A3** | Distribuție + Control | 26 + 20 = 46 | SR EN 15316-3, SR EN 15232-1, SR EN ISO 52120-1:2022, EN 215, REHVA GB17 |
| **A4** | ACM + Stocare + Anti-Legionella + Izolație | 26 + 12 + 5 + 10 = 53 | SR EN 15316-3-1/3-2/3-3, EN 16147, EN 50440, HG 1425/2006, Ord. MS 1002/2015 |
| **A5** | Răcire + Emisie + Distribuție | 30 + 13 + 12 = 55 | EN 14511, EN 14825, EU 2016/2281, EN 16798-9, REHVA Cooling Guidebook 2024 |
| **A6** | Ventilare | 56 | SR EN 16798-3/7/9, I5-2022, EN 13141, EN 308, EU 1253/2014, ASHRAE 62.1/62.2 |
| **A7** | Iluminat + Control | 50 + 24 = 74 | SR EN 12464-1:2021, SR EN 15193-1:2017, EU 2019/2020 SLR, EN 1838, IEC 62386 DALI-2 |
| **A8** | Combustibili + Vectori energetici | 49 | SR EN ISO 52000-1:2017/NA:2023 Tab.A.16, RED II, IPCC AR6, DEFRA UK 2024 |

**Total: 424 entries noi** într-un singur sprint, similar ca volum cu sprintul Catalog Materials Neutral (~270 entries materiale opace).

## Structură fișiere

```
energy-app/src/data/catalogs/
├── _raw_a1_heating_sources.json       (50 entries)
├── _raw_a2_emission_systems.json      (41 entries)
├── _raw_a3_distribution_control.json  (26 + 20)
├── _raw_a4_acm.json                   (26 + 12 + 5 + 10)
├── _raw_a5_cooling.json               (30 + 13 + 12)
├── _raw_a6_ventilation.json           (56 entries)
├── _raw_a7_lighting.json              (50 + 24)
├── _raw_a8_fuels.json                 (49 entries)
├── hvac-catalog.js                    (loader + helpers + merging cu constants.js)
└── __tests__/
    └── hvac-catalog.test.js           (58 teste validare)
```

## Schema entries (unificată)

```typescript
interface HvacEntry {
  id: string;                    // ID unic UPPERCASE_SNAKE
  nameRo: string;                // denumire în română cu diacritice
  nameEn: string;                // denumire în engleză
  category?: string;             // categorie RO (ex. "Pompe de căldură")
  categoryEn?: string;           // categorie EN (ex. "Heat pumps")
  fuel?: string;                 // gaz | electricitate | biomasa | solar | ambiental | ...
  // Câmpuri de eficiență (specific per tip)
  etaGen?: number;               // surse de căldură
  etaEm?: number;                // emisie
  etaDist?: number;              // distribuție
  etaCtrl?: number;              // control
  eer?: number; seer?: number;   // răcire
  fP_nren?: number;              // factori energie primară (combustibili)
  fP_ren?: number;
  fCO2?: number;
  // Aplicabilitate
  applicableCategories?: string[];  // ['RI','RC','BI','SA',...] sau ['all']
  newConstruction?: boolean;
  retrofit?: boolean;
  // Metadate
  source: string;                // standard EN/SR/ISO/EU + an
  notes?: string;                // 1-line technical note
  brand?: null;                  // rezervat pentru parteneriate viitoare
}
```

## Cum se folosește (developer)

### Import din loader

```js
import {
  HEAT_SOURCES_EXT,
  ACM_SOURCES_EXT,
  COOLING_SYSTEMS_EXT,
  VENTILATION_TYPES_EXT,
  LIGHTING_TYPES_EXT,
  FUELS_EXT,
  HVAC_CATALOG,
  CATALOG_META,
  getLabel,
  filterByBuildingCategory,
  findById,
  groupByCategory,
} from "../data/catalogs/hvac-catalog.js";
```

### Render dropdown bilingv

```jsx
<Select value={heating.source} onChange={(v) => setHeating({...heating, source: v})}>
  {HEAT_SOURCES_EXT.map(s => (
    <option key={s.id} value={s.id}>
      {getLabel(s, lang)}
    </option>
  ))}
</Select>
```

### Filtrare per categorie clădire

```js
const applicableSources = filterByBuildingCategory(HEAT_SOURCES_EXT, building.category);
```

### Lookup entry

```js
const selectedHP = findById(HEAT_SOURCES_EXT, "PC_CO2");
console.log(selectedHP.source);  // "EN 14511-2:2018 §B + IEA HPT Annex 53"
```

### Grupare pe categorii pentru optgroup

```jsx
const grouped = groupByCategory(HEAT_SOURCES_EXT, lang);
// {"Cazane gaz": [...], "Pompe de căldură": [...], "Cogenerare": [...], ...}
```

## Ce categorii sunt acoperite

### Surse de căldură (HEAT_SOURCES_EXT — ~100 entries)
Cazane gaz/GPL/motorină/biomasă (toate variantele inclusiv condensare modulant, hydrogen-ready, dual-fuel), 100% hidrogen, amoniac NH₃, dual-fuel, low-NOx Clasa 6, balcon ventuză.

Pompe de căldură: aer-apă R290 propan, CO₂ R744 transcritică, sol-apă verticală adâncă (>100m), piloți de fundație energetici, exhaust-air, ice-storage, asistate solar, hibride PVT-WSHP, multi-sursă, magnetocalorice (cercetare), absorbție GAHP, triple-effect.

Sisteme solare: combisystem, PV-T hibrid.

Termoficare: 4G LTDH, 5GDH, ambient loop, prosumer, geotermală, biomasă, WtE, biogaz, district HP industrial.

Cogenerare: motor Stirling, fuel cell PEM/SOFC, ORC, TPV, trigenerare CCHP.

Recuperare căldură: data center, supermarket, ape uzate, industrial.

Sobe tradiționale: Kachelofen, Russian, Baroque heritage.

### Sisteme emisie (EMISSION_SYSTEMS_EXT — ~70 entries)
Radiatoare: vacuum LT, grafen, bimetal Cu-Al, ceramic, oil-filled, port-prosop fan, LowH₂O dynamic, PCM, coloană fontă reproducere, bronz/alamă artistic, retrofit fan kit.

Pardoseală: instalare uscată subțire <30mm, capilară, gips PE-Xa, folie LV 12/24V, beton conductiv electric.

Plafon/perete radiant: TABS, capilară perete, plafon modular gips-carton hidronic, plafon HT >70°C.

Convectoare: trench fan/natural, plintă finned-tube, glass-floor.

Aer cald: furnace ducted, plenum crawl-space, aeroterme axial/centrifugal, district steam.

Industriale: tub gaz obscur, luminos high-bay, infrared cuarț/halogen.

BIST: solar wall asistat, fațadă solară termică ca emisie.

Personal comfort: panou desk, footwarmer, bancă biserică, towel cabinet.

Hibride: radiator + FCU 4-pipe.

### Distribuție + Control (DISTRIBUTION_QUALITY_EXT + CONTROL_TYPES_EXT — ~65 entries)
**Distribuție**: PUR preizolate Cls.1/Cls.3, aerogel, VIP, district twin-pipe/single-pipe, PEX-EVOH înglobat, manifold thermo-actuator, 4-pipe Tichelmann, retur invers/direct, primar-secundar variabil, VSP Δp-c/Δp-v/Δp-T, gravitațională istorică, buffer LLH, HIU EN 1434, descentralizată DHW, azbest legacy (flag REMOVE), vată minerală 50/80/100/120mm, vas atmosferic deschis, presurizat închis EN 12828.

**Control**: outdoor reset cu prognoză adaptivă, predictiv PMV/PPD, ML self-learning, geofencing, DCV CO₂ modulantă, mixed-mode, OSS, eTRV feedback auto-balansare, PIBV, automated commissioning, FDD, two-stage cascade, bivalent, smart-home Matter/Thread/Zigbee 3.0/EnOcean/Z-Wave, voice control, EMS ISO 50001, ML occupancy prediction, DR-ready, VSP Δp-c automatic.

### ACM (ACM_SOURCES_EXT + STORAGE + LEGIONELLA + PIPE — ~95 entries)
**Surse ACM**: HPWH CO₂/R290/PVT, solar termosifon FP/ETC, drainback, PCM, combi solar+biomasă/HP+PVT, tankless E POU, tankless gaz condensare modulant, DH HEX instant/buffer, WWHR drain, recuperare chiller/refrigerare, dish solar, PV+E, pellet combi, gazificare lemn buffer, GAHP, HP cu desuperîncălzitor, PV direct vară, data center waste heat, micro-CHP SOFC/Stirling.

**Stocare**: buffer stratificat, dual two-tank, VIP, PCM, gheață/apă dual, BTES sezonier, ATES, PIT, electric direct, dual coil, tank-in-tank inox, bladder.

**Anti-Legionella**: UV in-line 254 nm, Cu-Ag ionizare, ClO₂ dozare, pasteurizare 60°C/30min, șoc 70°C/3min.

**Izolație conducte**: elastomerică Armaflex-class, PE foam, vată minerală cu vapor barrier, aerogel, PUR pre-izolate, sticlă celulară HT, UV-PVC outdoor, azbest legacy (flag), bare/none, perlit/vermiculit istoric.

### Răcire (COOLING_SYSTEMS_EXT + EMISSION + DISTRIBUTION — ~80 entries)
**Răcire**: chiller CO₂ R744, magnetic-bearing centrifugal oil-free, scroll modular, screw inverter, HRC heat-recovery, TWR 4-pipe total recovery, hibrid electric+absorbție, absorbție solară LiBr, desicantă solid silicagel/lichidă LiCl, evaporativă M-cycle/2-stage, TABS radiant, capilară mat, PCM/ice/CWS storage, 5GDC ambient, mobile spot, criogenic LN2, EAHX pasiv, PV-direct DC mini-split, VRF heat-recovery 3-pipe, A+++, AC fereastră/PTAC, personal cooling, WSHP multi, geotermal hibrid CT, DOAS+CB hibrid hidronic.

**Emisie răcire**: grindă activă multi-serviciu/pasivă finned, tavan metal casetă/gips-carton, TABS pardoseală/tavan, capilară tavan/perete, convector pardoseală fan, UFAD, spot personal, radiator 4-pipe baterie, downdraft industrial.

**Distribuție răcire**: ΔT mic 4°C / mare 8-10°C, debit variabil VFD/PIBV, debit constant 3-căi, agent frigorific lung/scurt, glicol antigel, amoniac NH₃, PHX district, subteran PUR-PE, aerian fără izolație (legacy), aerogel ultra-subțire.

### Ventilare (VENTILATION_TYPES_EXT — ~80 entries)
Naturale: tiraj termic, cross single/double, windcatcher, solar chimney, trickle vents, VHA/VHM higro, Stoßlüften.

Mecanice: extras baie humidistat, hotă bucătărie boost, MVHR-EO cascadă, descentralizat backflow, HEPA lab, smoke-control F300, garaj CO/NO₂, vacuum WC.

UTA: plenum, displacement, UFAD, personalizată, mixing, economizer, desicant, adiabatic/abur, dual-duct, multizonă RH.

VAV: fan-powered, parallel fan.

DOAS: active beams, ERV rotor, residential ductless.

Recuperare: descentralizate push-pull/cassette/window, centralizate HP/electric preheat/brine, contracurent/cross-flow, rotativ sensibil/entalpic, run-around coil, heat pipe, membrană entalpic.

Specializate: cleanroom ULPA, proces push-pull, presurizare scări, night cooling, mixed-mode hibrid auto, geo tube, solar wall.

### Iluminat (LIGHTING_TYPES_EXT + CONTROL — ~95 entries)
**Tipuri**: LED tunable white, RGB+W, HCL biodinamic, UV-C 264nm dezinfecție, Far-UV-C 222nm, OLED panel, quantum-dot CRI 97, laser diode, phosphor UV >180 lm/W, filament/Edison/candelabra decorative E14, panel edge-lit/back-lit, troffer 60×60, suspendat liniar, downlight COB/SMD, wall-pack/bollard/stradal HE/standard outdoor, stadium high-mast, tunnel, museum CRI 97, picture-light, grow-light horticulture, aquarium, pool IP68, emergency self-contained/CBS/exit, cleanroom, ATEX hazardous, freezer, marine, humid IP66, amber low-blue circadian, integrated sensor PIR, PoE, low-voltage 12/24 VDC, plasma LEP, sulfur, mercury (interzisă 2015), T2/T4, CCFL, neon, light-emitting textile, bioluminescent.

**Control**: Bluetooth-mesh, KNX, EnOcean, Wi-Fi smart, Zigbee 3.0, Thread/Matter, PoE, DALI-2 D4i, DALI-BLE bridge, fotocelulă astronomică, CLO, lumen-maintenance, DR-ready, voice, dual lux+T, ultrasonic, dual-tech PIR+US, camera anonim, time-tunable circadian, vacancy, astro-clock, daylight-harvesting closed/open-loop, AI predictive ML.

### Combustibili / Vectori energetici (FUELS_EXT — ~65 entries)
H₂ albastru/gri/roz/turcoaz, amoniac NH₃, e-fuels PtL, e-metan PtG, metanol CO₂, DME, păcură HFO/LFO, kerosen, ulei uzat UCO, biogaz nămol/landfill/cocserie/furnal/syngas, RDF, TDF, SAF aviație, electricitate verde PPA/eolian offshore/hidro/solar utility/mix/CHP/baterie/V2G/off-grid PV+baterie/microgrid local, termoficare căldură industrială/4G solar/geotermală/biomasă/WtE/biogaz/5G ambient/HP industrial, geotermal buclă închisă/deschisă, hidrotermal, recuperare ape uzate/aer evacuat HRV/ape gri DHR/condensator frigorific, solar termic direct, PV DC direct, eolian on-site, hidro micro on-site.

## Politica brand-uri (zero brand-uri)

**Schema include `brand: null`** rezervat pentru parteneriate viitoare cu producători. Se va completa POST-LANSARE cu acord juridic semnat per producător. Până atunci, toate entries sunt 100% generice (descriptive tehnologic).

Brand-uri excluse explicit din nameRo/nameEn (validat de teste):
- Daikin, Mitsubishi, Carrier, Trane, York
- Viessmann, Vaillant, Bosch, Buderus, Junkers
- Stiebel, Eltron, Wolf, Weishaupt
- Zehnder, Kermi, Uponor, Rehau, Roth
- Lunos, Helios, Vallox, Aldes, ComfoAir
- Philips Hue, Casambi, Lutron, Tridonic, Osram
- Honeywell, Siemens, Danfoss, tado, Nest, Ecobee

## Validare

- **58 teste Vitest**: numărători, schema, diacritice, unicitate IDs, brand-policy, helpers — toate PASS
- **Suite completă: 2315/2315 PASS** (zero regresii vs baseline 2255)

## Restanțe & next steps (sprinturi viitoare)

1. **Bilingv complet pentru entries existente din `constants.js`**: în prezent entries vechi au doar `label` (RO); trebuie traduse `nameEn` (sprint dedicat — ~290 entries × 1-2 min = ~10h).
2. **Integrare UI completă în `Step3Systems.jsx`**: dropdown-urile actuale folosesc arrays din `constants.js`. Migrarea la `*_EXT` cu render bilingv via `getLabel()` și grouping pe categorii (~6h, P1).
3. **Cataloage NOI separate**: ACM_STORAGE_TYPES, ACM_ANTI_LEGIONELLA, PIPE_INSULATION_TYPES — adăugare panouri UI dedicate în Step 3 sub-tab ACM (~4h, P1).
4. **Lookup wizard**: filtru "compatibil cu această sursă" pentru emisie (compatibleHeatSources) și pentru distribuție/control (~3h, P2).
5. **Brand opt-in**: după parteneriate semnate, populare câmp `brand` + filtru "afișează doar brand-uri partenere" (~5h, post-lansare).

## Surse autoritare folosite

### Standarde europene & românești
- SR EN ISO 52000-1:2017/NA:2023 (factori energie primară)
- SR EN ISO 52120-1:2022 (BACS clase A-D, ex-EN 15232)
- SR EN 12464-1:2021 (iluminat la locul de muncă)
- SR EN 15193-1:2017 (LENI)
- SR EN 16798-1/3/7/9:2017 (ventilare + IEQ)
- SR EN 15316-1/2/3/4-1/4-2/4-3/4-4/4-5/4-7:2017 (sisteme HVAC)
- SR EN 14511, 14825 (răcire, SEER/SCOP)
- SR EN 1264-1/2/3/4/5:2021 (pardoseală radiantă)
- SR EN ISO 11855 (radiant)
- SR EN 442 (radiatoare)
- SR EN 14037 (panouri radiante plafon)
- SR EN 16430 (radiatoare cu fan)
- SR EN 13141 (componente ventilare)
- SR EN 308:2022 (HRV testing)
- SR EN 50440 (boilere acumulare)
- SR EN 16147 (HPWH)
- SR EN 12977 (sisteme solare)
- SR EN 15500-1:2021 (control termostat)
- SR EN 215 (TRV)
- SR EN 12828 (sisteme închise)
- SR EN ISO 12241 (izolație conducte)
- SR EN 253 (țevi preizolate)
- SR EN 14336 (commissioning hidronic)
- SR EN 1838 (iluminat siguranță)
- I5-2022 (Ord. MDLPA RO ventilare)
- P 118-3/2015 (RO siguranță foc)
- Mc 001-2022 (RO normativ energetic clădiri)

### Reglementări UE & internaționale
- EU Reg 813/2013, 814/2013, 206/2012 (Ecodesign Lot 1/2/10)
- EU Reg 1253/2014 (Lot 6 ventilare)
- EU Reg 2016/2281 (Lot 21 chillere)
- EU Reg 2019/2020 SLR (Single Lighting Regulation)
- EU Reg 622/2012, 2019/1781 (circulatoare/motoare)
- Directiva 2018/2001 RED II (regenerabile)
- Directiva (UE) 2023/1791 EED (eficiență energetică)
- Directiva 2014/34/UE ATEX
- ISO 50001:2018 (EMS)
- ISO 14644-1 (cleanroom)
- ASHRAE 90.1-2022, 62.1/62.2-2022, 55-2023, Guideline 36-2021
- REHVA Guidebooks 1, 5, 7, 11, 12, 14, 17, 23, 28, 31 (Cooling, Radiant, BACS, district, HVAC)
- IEC 62386 (DALI-2), IEC 60598, IEC 62717
- IPCC AR6 WG3 §6 (Mitigation)
- DEFRA UK 2024 GHG Conversion Factors

### Reglementări RO specifice
- HG 1425/2006 (Legionella)
- Ord. MS 1002/2015 (anti-Legionella)
- HG 1875/2005 (azbest)
- Lege 220/2008 (regenerabile RO)
- Lege 121/2014 transp. EED, actualizată 2024
- ANRE Reg. 2.345/2018 (resurse geotermale)
- Lege Apelor 107/1996

## Commit

Sprintul aceasta produce 12 fișiere noi (~7700 linii):
- `src/data/catalogs/_raw_a1_heating_sources.json` (50)
- `src/data/catalogs/_raw_a2_emission_systems.json` (41)
- `src/data/catalogs/_raw_a3_distribution_control.json` (46)
- `src/data/catalogs/_raw_a4_acm.json` (53)
- `src/data/catalogs/_raw_a5_cooling.json` (55)
- `src/data/catalogs/_raw_a6_ventilation.json` (56)
- `src/data/catalogs/_raw_a7_lighting.json` (74)
- `src/data/catalogs/_raw_a8_fuels.json` (49)
- `src/data/catalogs/hvac-catalog.js` (loader + helpers)
- `src/data/catalogs/__tests__/hvac-catalog.test.js` (58 teste)
- `docs/CATALOG_HVAC_NEUTRAL_2026.md` (acest document)

**Validare**: 2315/2315 teste PASS.
