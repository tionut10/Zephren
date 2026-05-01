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
2. ~~Integrare UI completă în `Step3Systems.jsx`~~ ✅ **FINALIZAT 30 apr 2026 (sprint P1)** — dropdown-urile folosesc `*_EXT` cu `buildOptions()` helper: bilingv + grouping pe categorii + applicability filter + partner sort + tooltip source.
3. **Cataloage NOI separate**: ACM_STORAGE_TYPES, ACM_ANTI_LEGIONELLA, PIPE_INSULATION_TYPES — exportate din loader, panouri UI dedicate în Step 3 sub-tab ACM rămân de adăugat (~4h, P2).
4. **Lookup wizard**: filtru "compatibil cu această sursă" pentru emisie (compatibleHeatSources) și pentru distribuție/control (~3h, P2).
5. **Activare parteneriate brand-uri**: registry pregătit (~165 brand-uri); pentru activare, vezi secțiunea **Brand Registry — Activare Parteneriate** mai jos.

---

## Brand Registry — pregătire parteneriate post-lansare

### Sumar

Sprint P1 (30 apr 2026) a adăugat un registru intern cu **~165 brand-uri majore HVAC** organizate în 12 categorii. Politica curentă: UI-ul rămâne **100% NEUTRU**; brand-urile NU se afișează până la activarea explicită a unui parteneriat.

### Acoperire

| Categorie | Brand-uri | Exemple cheie |
|---|---|---|
| **heating** | ~35 | Viessmann, Vaillant, Bosch, Buderus, Junkers, Wolf, Weishaupt, Brötje, Ariston, Immergas, Ferroli, Baxi, Beretta, Riello, Saunier Duval, De Dietrich, Atlantic, Protherm, Termet, Fröling, Hargassner, ÖkoFEN, Atmos, Centrometal |
| **heat-pumps** (în heating) | ~25 | Daikin, Mitsubishi Electric, Panasonic, Samsung, LG, Fujitsu, Hitachi, Toshiba, NIBE, IVT, CTC, Thermia, Stiebel Eltron, Dimplex, Waterkotte, Ochsner, Heliotherm |
| **cooling** | ~30 | Carrier, Trane, York/JCI, Lennox, Midea, Gree, Haier, Hisense, Sinclair, Inventor, Olimpia Splendid, Aermec, Galletti, Clivet |
| **acm** | ~12 | Ariston Thermo, Tesy, Eldom, Drazice, Reflex, Galmet, Hajdu, Styleboiler |
| **ventilation** | ~12 | Zehnder, Vallox, Helios, Lunos, Aldes, Brink, Komfovent, Paul, Vortice, Blauberg, Drexel und Weiss, Swegon, Systemair, TROX |
| **lighting** | ~15 | Philips Signify, Osram, Ledvance, Tridonic, Lutron, Casambi, Thorn, Trilux, Zumtobel, ERCO, Fagerhult, iGuzzini, Flos, Artemide, Schréder, Helvar, Cree |
| **smart-home** | ~18 | Honeywell, Siemens, Danfoss, tado, Nest, Ecobee, Schneider Electric, ABB, WAGO, Jung, Gira, Busch-Jaeger, Fibaro, Shelly, Sonoff, Eltako, Kieback&Peter, Distech Controls |
| **distribution** | ~14 | Uponor, REHAU, Roth, COMAP, Herz Armaturen, Heimeier, Flamco, Armacell, Kaiflex, ISOVER, ROCKWOOL, PAROC, Logstor, Brugg Pipes |
| **solar** | ~13 | Viessmann Solar, Vaillant Solar, Fronius, SMA, SolarEdge, Enphase, Huawei FusionSolar, Kostal, Trina, Jinko, LONGi, JA Solar, Canadian Solar |
| **battery** | ~10 | Tesla Powerwall, LG RESU, BYD, Pylontech, sonnen, Growatt, Victron, Studer, Deye, GoodWe, Sungrow |
| **fuels** (RO) | ~8 | Romgaz, OMV Petrom, Engie Romania, E.ON, Hidroelectrica, Nuclearelectrica, Restart Energy, Transgex, ELCEN București |

**Total: ~165 brand-uri** (după consolidare cross-categorii — multe brand-uri apar în mai multe categorii, ex: Viessmann e în heating + acm + cooling + solar).

### Schema brand entry

```typescript
interface BrandEntry {
  id: string;                    // snake_case unic (ex: "viessmann", "lg_resu")
  name: string;                  // display name (ex: "Viessmann", "LG Energy Solution")
  country: string;               // ISO-3166 2-letter (DE/IT/JP/RO/...)
  categories: string[];          // ["heating", "cooling", "acm", "ventilation", ...]
  productLines: string[];        // ["Vitodens 200-W", "Vitocal 350-A", ...]
  matchesEntries: string[];      // ID-uri din *_EXT (ex: ["GAZ_COND", "PC_AA_R290"])
  partnerStatus: "none" | "pending" | "active" | "discontinued";
  partnerSince: string | null;   // ISO date "2026-08-15" sau null
  partnerTier: null | "basic" | "premium" | "exclusive";
  affiliateUrl: string | null;   // URL tracked sau null
  contactEmail: string | null;   // email comercial sau null
  notes: string;                 // 1-line context piață RO
}
```

### Activarea unui parteneriat (de către administratorul Zephren)

**Exemplu**: Semnezi contract cu Viessmann pe 15 august 2026, tier premium.

1. Editează `src/data/catalogs/brands-registry.json`:
   ```json
   {
     "id": "viessmann",
     "partnerStatus": "active",
     "partnerSince": "2026-08-15",
     "partnerTier": "premium",
     "affiliateUrl": "https://zephren.ro/go/viessmann?utm=catalog",
     "contactEmail": "vanzari@viessmann.ro"
   }
   ```

2. Comită modificarea (zero deploy required — JSON e static asset Vite).

3. Helper-ul `applyPartnerSorting()` din `hvac-catalog.js` va prioritiza automat entries Viessmann (GAZ_COND, GAZ_PREMIX, PC_AA_INV, PC_AA_R290, etc.) la începutul fiecărui dropdown din `Step3Systems.jsx`.

4. UI-ul afișează badge "🤝" pe entries cu parteneri activi (`partnerBadge: true` în opțiuni).

5. Multiple parteneriate paralele: poți activa **simultan** Viessmann (heating) + Daikin (cooling) + Zehnder (ventilation) + Philips (lighting) — fiecare prioritizează în categoria proprie.

### Helpers loader pentru brand registry

```js
import {
  BRANDS,
  BRANDS_BY_ID,
  getBrandsByCategory,
  getActivePartners,
  getBrandsForEntry,
  getEntriesByBrand,
  prioritizeBrand,
  applyPartnerSorting,
  getActivePartnersForEntry,
} from "../data/catalogs/hvac-catalog.js";

// Lista brand-urilor pentru o categorie HVAC
const heatingBrands = getBrandsByCategory("heating");

// Brand-urile care matchează un entry specific
const matches = getBrandsForEntry("GAZ_COND");
// → ["viessmann", "vaillant", "bosch", "buderus", ...]

// Entries dintr-un catalog matchate de un brand
const viessmannEntries = getEntriesByBrand("viessmann", HEAT_SOURCES_EXT);

// Sortare manuală cu un brand prioritar
const sorted = prioritizeBrand(HEAT_SOURCES_EXT, "viessmann");

// Sortare automată folosind toți partenerii activi
const autoSorted = applyPartnerSorting(HEAT_SOURCES_EXT);

// Lista parteneri activi care matchează un entry (pentru badge UI)
const partners = getActivePartnersForEntry("GAZ_COND");
// → [{id:"viessmann", name:"Viessmann", partnerTier:"premium"}]
```

### Cum funcționează `buildOptions()` în UI

Helper-ul din `Step3Systems.jsx` aplică în ordine:

1. **filterByBuildingCategory** — păstrează doar entries aplicabile pentru `building.category` (ex: pentru o școală păstrăm doar entries cu `applicableCategories` includes "ED" sau "all")
2. **applyPartnerSorting** — mută entries cu parteneri activi în top
3. **groupByCategory(lang)** — grupează pe categoria entry (RO sau EN)
4. **format options** — pentru fiecare entry: label bilingv via `getLabel(e, lang)`, tooltip cu source EN/SR/ISO + notes, `partnerBadge: true` dacă există parteneri activi
5. **isGroupHeader: true** — separator non-clickabil între categorii (afișat ca header subtle uppercase)

### Politica zero brand-uri în UI implicit

- La inițializare, **toți** ~165 brand-uri au `partnerStatus: "none"`
- Helperul `applyPartnerSorting()` returnează ordine originală când nu există parteneri activi
- Helperul `getActivePartnersForEntry()` returnează listă goală
- UI-ul nu afișează badge-uri sau brand-uri în nameRo/nameEn
- Schema validată de teste: zero brand-uri în labels (Daikin/Mitsubishi/Viessmann/Bosch/Zehnder/Philips/etc. excluse)

### ~~Restanțe brand registry~~ → ✅ FINALIZAT P2 (30 apr 2026)

1. ✅ **UI admin** pentru activare parteneriate — `BrandPartnersAdmin.jsx` cu modal complet (listare, editare per brand, tabs Brands/Telemetry/Import)
2. ✅ **Tooltip extins** pentru entries cu parteneri — buildOptions adaugă "🤝 Partener: {name} ({tier}), ..." sub source
3. ✅ **Filtru "Doar brand-uri partenere"** — toggle în Step3 sub-tab, vizibil doar dacă există parteneri activi
4. ✅ **Telemetrie click** — `logPartnerClick()` în localStorage cu pattern `Step3.{tab}.{field}`, agregare per brand, export CSV
5. ✅ **Importator brand-uri batch** din CSV — UI admin tab "Import / Export" cu file picker JSON sau CSV

---

## Sprint P2 — Brand Admin UI + ACM Panels (30 apr 2026)

### 1. Strat override localStorage (`partner-overrides.js`)

Mecanism cheie pentru activare instantă parteneriate **fără commit + redeploy**: stratul de overrides salvează modificările în `localStorage.zephren_partner_overrides`. Helperele din `hvac-catalog.js` (`getActivePartners`, `getActivePartnersForEntry`, `getBrands`) merge automat overrides peste valorile din `brands-registry.json`.

```js
// Activare partener instant (din admin UI):
setOverride("viessmann", {
  partnerStatus: "active",
  partnerSince: "2026-08-15",
  partnerTier: "premium",
  affiliateUrl: "https://zephren.ro/go/viessmann",
  contactEmail: "vanzari@viessmann.ro"
});
// → toate dropdown-urile reflectă instant: prioritizare + badge '🤝' + tooltip extins
```

**Promovare la production**: admin UI permite export JSON cu overrides curente, care poate fi pasted în `brands-registry.json` și commit pentru persistență cross-browser.

### 2. `BrandPartnersAdmin.jsx` — UI Admin completă

Modal full-screen cu 3 tabs:
- **Brand-uri**: listare ~165 brand-uri cu filtre (search + categorie + status), inline edit form per brand (partnerStatus / partnerSince / partnerTier / affiliateUrl / contactEmail), badge "OVERRIDE" pe brand-uri modificate localStorage, butoane Edit / Reset / Anulează
- **Telemetrie click**: lista evenimente (entryId + brandIds + context + timestamp) + agregare top brand-uri (counts), export CSV pentru analiză externă, refresh auto la 5s
- **Import / Export**: butoane Export JSON, Export CSV, file picker pentru import (acceptă .json și .csv); buton Reset complet overrides

### 3. Helpers loader noi (`hvac-catalog.js`)

```js
// Re-exports din partner-overrides.js disponibile direct prin hvac-catalog.js
import {
  getOverrides, setOverride, clearOverride, clearAllOverrides,
  exportOverridesJson, importOverridesJson,
  exportOverridesCsv, importOverridesCsv, parseCsv,
  logPartnerClick, getTelemetryEvents, getTelemetryByBrand,
  exportTelemetryCsv, clearTelemetry,
  filterByActivePartner, // NOU: păstrează doar entries cu parteneri activi
  getBrands, // live brands cu overrides aplicate (vs BRANDS care e snapshot static)
} from "../data/catalogs/hvac-catalog.js";
```

Nou: **`filterByActivePartner(entries)`** — folosit de filtru "Doar parteneri" în Step3.

### 4. Integrare Step3Systems.jsx — Tooltip + Filtru + Telemetrie

#### Tooltip extins
`buildOptions()` include partener info sub source standard:
```
SR EN 15316-4-1:2017 §5.4.3 + EU 813/2013 — Modulație 10-100%, ideal sarcini parțiale

🤝 Partener: Viessmann (premium), Vaillant (basic)
```

#### Filtru "Doar brand-uri partenere"
Banner toggle vizibil **doar** când există parteneri activi:
```
🤝 3 brand-uri partenere active — entries linkate apar primele cu badge
[ ] Afișează doar brand-uri partenere
```

#### Telemetrie click
Fiecare schimbare valoare în dropdown verifică dacă entry-ul ales are parteneri activi → log în `localStorage.zephren_partner_telemetry`:
```json
{
  "entryId": "GAZ_COND",
  "partnerBrandIds": ["viessmann"],
  "context": "Step3.heating.source",
  "timestamp": "2026-08-20T14:32:11.234Z"
}
```
Limită 1000 events (auto-trim FIFO). Admin UI permite export CSV pentru analiză.

### 5. Panouri UI avansate ACM (Phase D)

Card nou "⚙️ Configurare avansată ACM (catalog extins)" în sub-tab ACM cu **3 selectoare bilingv** + display info dinamic:

#### A) Tip stocare ACM (`ACM_STORAGE_TYPES` — 12 tipologii)
- Buffer stratificat multi-strat
- Two-tank (preîncălzire + final)
- VIP vacuum-insulated tank (clasa A++)
- PCM phase-change storage
- Ice/water dual-tank (heating + cooling)
- BTES sezonier subteran (foraj 30-200m)
- ATES acvifer
- PIT thermal energy storage groapă mare
- Direct electric tank
- Indirect dual-coil tank
- Tank-in-tank inox 304/316
- Bladder presurizat

Display dinamic per selecție: clasă energetică, pierderi/zi, sursă standard, notes.

#### B) Metodă anti-Legionella (`ACM_ANTI_LEGIONELLA` — 5 metode)
- UV in-line 254 nm (overhead 2%)
- Ionizare Cu-Ag (overhead 1%)
- Dozare ClO₂ continuu (overhead 1.5%)
- Pasteurizare zilnică 60°C/30min (overhead 5%, HG 1425/2006)
- Șoc termic săptămânal 70°C/3min (overhead 3%)

#### C) Tip izolație conducte (`PIPE_INSULATION_TYPES` — 10 tipologii)
- Elastomerică Armaflex-class (λ 0.037)
- Spumă PE (λ 0.040)
- Vată minerală cu vapor barrier (λ 0.035)
- Aerogel ultra-subțire (λ 0.014)
- PUR pre-izolate (λ 0.026)
- Sticlă celulară HT (λ 0.043, până 430°C)
- UV-PVC outdoor
- ⚠ **Azbest legacy** (FLAG REMOVE — HG 124/2003 + Directiva 2009/148/CE) — display roșu cu avertisment îndepărtare prin firmă autorizată ANSESM
- ⚠ **Bare/none** (FLAG retrofit P0 obligatoriu) — display amber
- Perlit/vermiculit istoric

Display per selecție: λ, clasă grosime ISO 12241, η_pipe, limită temp, sursă, notes.

### 6. Componenta `Select` extensă (ui.jsx)

- ✅ Suport `isGroupHeader: true` pentru optgroup-like
- ✅ Suport `tooltip` per opțiune (HTML title)
- ✅ Suport `partnerBadge` (afișează '🤝')

### 7. Validare

- **30 teste noi** în `__tests__/partner-overrides.test.js` (override storage, JSON/CSV export-import, parse CSV cu quoted values + escape, telemetrie click + agregare + auto-trim 1000)
- Suite completă: 2367 → **2397 PASS** (+30, zero regresii)

### Workflow tipic activare parteneriat (30 apr 2026)

```
1. Negociere comercială cu producător (ex: Viessmann RO)
2. Semnare contract → primesti URL afiliat + email contact + tier (basic/premium/exclusive)
3. Deschizi Zephren admin → Brand Partners Admin
4. Caută "Viessmann" → click "Editare"
5. Setezi:
   - partnerStatus: "active"
   - partnerSince: "2026-08-15"
   - partnerTier: "premium"
   - affiliateUrl: "https://zephren.ro/go/viessmann?utm=catalog"
   - contactEmail: "vanzari@viessmann.ro"
6. Click "Salvează" → instant:
   - Toate dropdown-urile Step 3 prioritizează entries Viessmann (GAZ_COND, GAZ_PREMIX,
     PC_AA_INV, SOLAR_COMBI etc.)
   - Badge '🤝' apare pe entries linkate
   - Tooltip extins arată "Partener: Viessmann (premium)"
   - Banner toggle "🤝 1 brand activ" apare în sub-tab heading
   - Filtru "Doar brand-uri partenere" disponibil
7. (Opțional) Export JSON overrides → commit la production prin update brands-registry.json
8. Periodic: deschizi tab Telemetry → vezi câte clicks au avut entries Viessmann
   → export CSV pentru raport conversii lunar
```

### Promovare overrides la production (post MVP)

Două căi:

**A) Manual**: admin UI → Export JSON → developer face PR cu override aplicat în `brands-registry.json` → merge → deploy → toate browser-ele văd noile valori (fără localStorage).

**B) Backend (post-launch)**: Supabase tabel `partner_overrides` + migration; helperul `getOverrides()` cheamă API endpoint (cu fallback localStorage). Permite admin centralizat multi-user.

### Restanțe P3 (sprinturi viitoare)

1. Backend Supabase pentru parteneriate centralizate (fără localStorage limit per browser)
2. Tooltip cu link clickabil afiliat direct în dropdown (în prezent doar text)
3. Calcul revenue affiliate per partener din telemetrie + report financiar
4. A/B testing parteneriate (ex: 50% useri văd Viessmann prima, 50% văd Vaillant)
5. Notificări email automatizate pentru threshold conversii (ex: "Viessmann a depășit 100 clicks/lună")
6. Analytics dashboard cross-tenant (când Zephren va avea multi-tenant cu mai multe firme audit)

## Update teste — sprint P1

- 52 teste noi în `__tests__/brands-registry.test.js` (acoperire 12 categorii, ~165 brand-uri, helpers, schema)
- Suite completă: 2315 → **2367 PASS** (zero regresii)

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
