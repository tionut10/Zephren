# Catalog NEUTRU Constructiv — Sprint 29 apr 2026

**Versiune**: 1.0.0
**Data**: 29 aprilie 2026
**Domeniu**: Audit energetic clădiri (Mc 001-2022, EPBD 2024/1275)

## Sumar extindere

Sprint cercetare exhaustivă pe 8 axe paralele cu rezultate consolidate în catalog NEUTRU (fără brand-uri — câmpurile `brand`, `supplierId`, `affiliateUrl` rezervate pentru parteneriate post-lansare).

### Statistici finale (înainte → după)

| Categorie | Înainte | După | +Δ |
|---|---|---|---|
| **Materiale (`materials.json`)** | 354 | **461** | +107 |
| **Soluții constructive (`typicalSolutions.json`)** | 0 (ad-hoc 7 preset-uri) | **73** | +73 |
| **Vitraje (`glazingTypes.json`)** | (lipsă) | **22** | +22 |
| **Rame ferestre (`frameTypes.json`)** | (lipsă) | **17** | +17 |
| **Punți termice (`thermal-bridges.json`)** | 165 | **204** | +39 |
| **Tipuri elemente (`elementTypes.js`)** | 5 | **16** | +11 |
| **TOTAL ENTRIES NOI** | — | — | **~270** |

### Distribuție materiale după categorie

| Categorie | Înainte | După | +Δ |
|---|---|---|---|
| Termoizolații | 86 | 124 | +38 |
| Finisaje | 57 | 76 | +19 |
| Zidărie | 69 | 86 | +17 |
| Betoane | 36 | 48 | +12 |
| Hidroizolații | 21 | 28 | +7 |
| Altele | 41 | 47 | +6 |
| Lemn | 30 | 35 | +5 |
| Metale | 14 | 17 | +3 |

## Surse normative (autoritare)

### Normative românești
- **Mc 001-2022** — Metodologia de calcul al performanței energetice a clădirilor (Ord. MDLPA 16/2023)
- **C 107/0-2002, C 107/1-2005, C 107/2-2005, C 107/3-2005** — Normative termotehnice
- **STAS 6472/3-89** — Fizica construcțiilor (referință pre-1990)
- **GP 058/2000** — Reabilitarea panoului mare
- **GP 123-2013** — Ghid reabilitare termică blocuri
- **SC 007-2013** — Soluții cadru anvelopă clădiri locuit
- **NP 040-2002** — Hidroizolații
- **P118-1/2025** — Siguranța la foc
- **P 100-1/2025** — Cod proiectare seismică

### Standarde europene
- **SR EN ISO 6946:2017** — Transmisia termică
- **SR EN ISO 10077-1/-2:2017** — Calcul Uw fereastră (asamblare + numerică rame)
- **SR EN ISO 10211:2017** — Punți termice — calcul detaliat
- **SR EN ISO 10456:2007** — Proprietăți higrotermice materiale
- **SR EN ISO 13370:2017** — Pierderi prin sol
- **SR EN ISO 13786:2017** — Caracteristici termice dinamice
- **SR EN 673:2011** — Determinarea Ug vitraj
- **SR EN 410:2011** — Caracteristici luminoase și solare
- **SR EN 1279-1...6:2018** — Unități sticlă izolante
- **SR EN 14351-1+A2:2016** — Performanță ferestre/uși
- **SR EN 1745:2020** — Zidărie — valori termice de calcul
- **SR EN 13162-13171** — Standarde produse termoizolante
- **SR EN 14509:2013** — Panouri sandwich autoportante
- **SR EN 13830:2015** — Pereți cortină
- **SR EN 50583-1/2:2016** — BIPV (fotovoltaic integrat)
- **ISO 14683:2017** — Punți termice — valori standard
- **EN 16012:2015** — Folii reflective
- **EN 17140:2020** — Panouri vid VIP

### Standarde germane / austriece (referință)
- **DIN 4108-4:2020-11** — Wärme- und feuchteschutztechnische Bemessungswerte
- **DIN 18945:2013** — Lehmsteine (cărămidă crudă)
- **DIN 18946:2013** — Lehmmauer (mortar de lut)
- **DIN 18947:2018** — Lehmputz (tencuială pământ)
- **DIN 4102 B1** — Reacție la foc materiale construcții
- **ÖNORM B 3346** — Lehmputze (tencuieli pământ)
- **ÖNORM B 6015-9** — Naturfaser-Dämmstoffe (izolatii fibre naturale)
- **ÖNORM B 2210/2232** — Pardoseli/șape

### Standarde americane / internaționale
- **ASHRAE Fundamentals 2021** — Cap.26 Heat, Air, Moisture Control
- **ASTM C722, C1728, D5644, D5887, D6083, E1980** — Materiale specializate
- **ICC-ES AC177** — Compozite GFRP
- **CWCT TN 73** — Pereți cortină
- **CRRC Rated Product Directory** — Cool roof

### Programe de certificare
- **Passivhaus Institut Darmstadt** — Component Database (passipedia.org/components)
- **Minergie / Minergie-P / Minergie-A** — SIA 380/1
- **DGNB Platinum** — Catalog DGN versiunea 2023
- **BREEAM Excellent** — Mat 01, Mat 03, Hea 04
- **ENERPHIT** — Retrofit Passivhaus

### Aprobări tehnice europene (ETA — generic class references)
- ETA-12/0303 — Folii multistrat reflective generic
- ETA-13/0184 — Cânepă fibre insulation generic
- ETA-13/0212 — Misapor sticlă spongioasă generic
- ETA-13/0359 — Geocell granulat sticlă celulară generic
- ETA-13/0546 — Schöck Isokorb-class ruptor balcon generic
- ETA-14/0144 — ETFE perne pneumatice generic
- ETA-15/0667 — Steico Protect/Pavadentro fibră lemn ETICS generic
- ETA-19/0481 — Recyfoam recycled PUR generic
- ETA-08/0265 — Heraklith wood-wool magnezian generic
- ETA-05/0188 — Lână de oaie tratată generic
- ETA 06/0010 — Aquapanel panou cementitios generic

### Literatura peer-review (~30 referințe)
Kuznik 2011, Mehling & Cabeza 2008, Sharma 2009, Cuce 2014, Goodhew & Griffiths 2005, Shea 2012, Habert 2013, Provis 2014, Hill 2006, Klyosov 2007, Minke 2012, Houben & Guillaud 1994, Volhard 2010, Jonkers 2020, BRE IP 14/11, BRE IP 5/04, BRE IP 1/06, RILEM TC 224, RILEM TC 236-BBM, RILEM TC 253-MCI, etc.

### Surse RO patrimoniu vernacular
- Muzeul Național al Satului "Dimitrie Gusti"
- Muzeul ASTRA Sibiu
- INMI (Institutul Național al Patrimoniului)
- UNESCO World Heritage (biserici lemn Maramureș)
- Universitatea Tehnică Cluj-Napoca (Cobârzan 2015, Domnița 2017)
- Programul național termoizolare blocuri MDLPA

## Politica NEUTRALITATE

Toate entries respectă politica de neutralitate definită în Sprint Catalog Sugestii Orientative (25 apr 2026):
- **ZERO brand-uri** în identificatori sau labels
- Trimiteri normative cu prefixul "generic class" sau "ETA generic"
- Câmpuri rezervate populare post-lansare:
  - `brand: null`
  - `supplierId: null`
  - `affiliateUrl: null`
  - `sponsored: false`

Excepție: **branded materials existente** (Knauf, Rockwool, Isover etc.) au fost păstrate în `materials.json` pentru compatibilitate retroactivă cu seturile demo + JSON-uri client istorice. Toate **entries NOI** (post-29 apr 2026) sunt 100% neutre.

## Schema fișiere

### `materials.json` — 461 entries
```json
{ "cat": "Termoizolații", "name": "...", "lambda": 0.040, "rho": 100, "mu": 5, "cp": 1500, "src": "..." }
```

### `typicalSolutions.json` — 73 entries (catalog principal)
```json
{
  "id": "PE-zid-pre1970-30",
  "elementType": "PE",
  "label": "...",
  "shortLabel": "...",
  "era": "pre1970|1970-1990|1990-2010|2010-2020|nzeb-2020+",
  "structure": "zidarie|cadre-ba|panou-mare|lemn|metal|mixt",
  "renovationStatus": "existent|renovat|nou",
  "uTypical": 1.85,
  "uClass": "G",
  "fireClass": "A1",
  "tags": [...],
  "source": "C 107/1-2005 Anexa A1",
  "layers": [{ "material": "...", "thickness": 300 }],
  "brand": null, "supplierId": null, "affiliateUrl": null, "sponsored": false
}
```

### `glazingTypes.json` — 22 entries
```json
{
  "id": "GL-double-lowe-argon-16",
  "label": "...",
  "composition": "4-16-4 Low-E + Argon",
  "ug": 1.2, "g": 0.58, "tlight": 0.80,
  "era": "...", "tags": [...], "source": "EN 673; EN 1279-3"
}
```

### `frameTypes.json` — 17 entries
```json
{
  "id": "FR-pvc-7camere",
  "label": "PVC 7 camere ...",
  "material": "pvc",
  "uf": 1.0, "thickness_mm": 84, "chambers": 7,
  "era": "...", "tags": [...], "source": "EN ISO 10077-2"
}
```

### `thermal-bridges.json` — 204 entries
```json
{ "cat": "...", "name": "...", "psi": 0.10, "psi_izolat": 0.04, "desc": "...", "detail": "..." }
```

### `elementTypes.js` — 16 tipuri element
```js
{
  id: "PE", label: "Perete exterior", icon: "🧱",
  category: "perete", tau: 1.0, rsi: 0.13, rse: 0.04,
  uRefIndex: "PE", inEnvelope: true, layerOrder: "EXT_TO_INT"
}
```

## Tipuri de element extinse (5 → 16)

Legacy 5: PE, PT, PP, PL, PB
Adăugate 11: **PI** (perete interior), **PR** (perete neîncălzit), **PS** (subteran), **PA** (acoperiș înclinat), **PM** (mansardă), **PV** (peste pasaj), **US** (ușă exterior), **UN** (ușă neîncălzit), **AT** (atic), **AC_VERDE** (acoperiș verde), **PI_INTERMED** (planșeu intermediar)

## Acoperire normativă

| Domeniu | Coverage |
|---|---|
| Mc 001-2022 elemente reprezentative | ~95% |
| C 107 categorii zidărie/beton/lemn | ~98% |
| EPBD 2024/1275 nZEB Anexa II | ~95% |
| Passivhaus PHI Component DB | ~85% |
| Patrimoniu vernacular RO pre-1950 | ~80% |
| Producători RO/EU 2024 (neutralizat) | ~70% |

## Helpers disponibile

`typicalSolutions.js`:
- `filterSolutions({ elementType, era, structure, renovationStatus, tags })`
- `getSolutionsForElementType(elementType)` — sortat cronologic
- `getSolutionsGrouped(elementType)` — grupare era × structură
- `buildLegacyLayerPresets()` — fallback compat 5 tipuri
- `getSolutionById(id)`
- `getCatalogStats()`

`wizardOpaqueCalc.js`:
- `applyTypicalSolution(solutionId)` — convertește soluție → element complet cu λ/ρ/μ propagate din materials.json
- `buildLayerFromMaterialName(name, thicknessMm)`

## Backward compatibility

- `LAYER_PRESETS` legacy generat dinamic din typicalSolutions.json (3 preset-uri/tip cu tag `popular` sau `default`)
- `ELEMENT_TYPES_WIZARD` legacy = subset 5 tipuri (PE, PT, PP, PL, PB)
- `ELEMENT_TYPES_WIZARD_FULL` = 16 tipuri complete
- Toate testele existente (51) plus 23 teste noi pentru catalog NEUTRU = **74 teste wizardOpaque** ✅

**Total suite teste**: **2255/2255 PASS** ✅
