# Calibration TODO — qH_nd Over-Estimate Investigation

**Data deschidere:** 15 mai 2026
**Origine:** Sprint Rebalansare M1-M5 + Audit JS Gotcha (commits `c72d7a3`, `8f078f4`, `9c6172c`)
**Status:** OPEN — investigare necesară în sprint dedicat
**Severity:** MEDIE (afectează clădiri vechi standalone, nu blochează producția)

---

## Sumar issue

Calculatorul energetic Zephren produce valori EP_total semnificativ peste valorile target normative pentru clădirile standalone vechi (pre-1990, fără izolație, n50 ≥ 5). Discrepanța se manifestă astfel:

| Demo | Tip | Live EP | Target normativ | Factor |
|---|---|---:|---:|---:|
| M1 | Apartament bloc PAFP'75 RC | 700 | ~780 | **0.90×** ✅ |
| M2 | Casă cărămidă 1965 RI standalone | 976 | ~400-500 | **2.2×** ⚠️ |
| M3 | Birouri 2005 BCA+ETICS 4cm BI | 334 | ~240 | **1.4×** ⚠️ |
| M4 | Școală 1980 fără izolație ED | 1099 | ~460 | **2.4×** ⚠️ |
| M5 | Casă nZEB 2022 PassivHaus RI | 156 brut | ~60 | **2.6×** ⚠️ |

**Pattern observabil:** Discrepanța crește cu raportul Surface/Volume (S/V) al clădirii. Apartamentul bloc (RC) are S/V mic (perete comun cu vecini) și calculul e corect. Clădirile standalone (RI/BI/ED) au S/V mare și over-estimează.

## Cauze ipotetice (prioritizate pentru investigare)

### 1. Ipoteza primară: ISO 13790 monthly aggregation peste H_total

În [`useEnvelopeSummary.js:127`](../src/hooks/useEnvelopeSummary.js#L127) → [`iso13790.js:73-80`](../src/calc/iso13790.js#L73):

```js
var H_tr = G_env;            // doar transmisie din envelopeSummary
var H_ve = 0.34 * n_vent * V * (1 - hrEta);
var H_inf = 0.34 * n50 * V * e_shield;
var H_total = H_tr + H_ve + H_inf;
```

**Verificare necesară:** ISO 13789 §6.3 prevede ca H_total = H_tr + H_ve (cu H_ve incluzând infiltrațiile prin ecuația 8). În implementarea Zephren, H_inf este adăugat SEPARAT, ceea ce poate dubla pierderile prin infiltrație dacă n_vent default 0.5 deja include infiltrațiile.

**Test propus:** Verificare manuală pentru M2:
- n50 = 5.5, e_shield = 0.07, V = 336 → H_inf = 0.34 × 5.5 × 336 × 0.07 = **44 W/K**
- n_vent = 0.5, V = 336, hrEta = 0 → H_ve = 0.34 × 0.5 × 336 = **57 W/K**
- Total ventilare+infiltrație = 101 W/K

Per ISO 13789 §8.3 corect: H_ve_total = 0.34 × max(n_vent, n_inf) × V × (1 - hrEta), unde n_inf = n50 × e_shield. Pentru M2: max(0.5, 0.385) = 0.5 → H_ve_total = 57 W/K, NU 101 W/K.

**Diferență potențială:** 44 W/K supra-numărate pentru M2. La 3300 GD: 44 × 3300 × 24 / 1000 = 3485 kWh/an supra-loss, adică 29 kWh/m²·an. Asta NU explică toată discrepanța (200+ kWh/m²·an), dar e o parte.

### 2. Ipoteza secundară: ELEMENT_TYPES tau values

Verificat în [`building-catalog.js:304-321`](../src/data/building-catalog.js#L304):
- PE (perete exterior): tau = 1.0 ✓
- PT (planșeu terasă): tau = 1.0 ✓
- PL (placă pe sol): tau = 0.5 — corect pentru ISO 13370

NU pare a fi problema.

### 3. Ipoteza terțiară: Q_int phi_int per categorie

În [`iso13790.js:85-86`](../src/calc/iso13790.js#L85):
```js
var qIntMap = {RI:4, RC:4, RA:4, BI:8, ED:6, SA:5, ...};
var phi_int = (qIntMap[category] || 4) * Au;
```

Pentru rezidențial RI/RC/RA: 4 W/m² constant. Mc 001-2022 Anexa A.8 specifică:
- Locuințe ocupate ≥ 8h/zi: 5 W/m² (sau 4 W/m² conservativ)
- Birouri 8h/zi ocupare: 12 W/m² (Zephren: 8 W/m²)

**Verificare necesară:** comparare cu Mc 001 Anexa A.8 actualizat 2022.

### 4. Ipoteza cuaternar: ISO 13370 floor U_eff (slab-on-ground)

În [`useEnvelopeSummary.js:56-74`](../src/hooks/useEnvelopeSummary.js#L56), formula ISO 13370:
```js
uEff = lambda_g / (0.457 * Bp + d_t);
```

Pentru M5 cu perimetru 42 m, floor 75 m²: Bp = 75/(0.5×42) = 3.57; d_t ≈ 5.08 → uEff = 1.5/(0.457×3.57+5.08) = 0.219 W/(m²·K).

Valoare reasonable, NU pare a fi cauza majoră.

## Mc 001-2022 — referințe normative pentru verificare

- **§3.3 + Tab 2.4**: Coeficienți globali G_max admisibili pentru categorii de clădiri
- **§5.3 Anvelopă**: Calcul H_tr per ISO 13789 §6 + ISO 13790 §7
- **Anexa A.7**: Factori utilizare câștiguri η_H (a_H formula)
- **Anexa A.8**: Surse interne phi_int per categorie (W/m²)
- **Anexa A.9**: Factori reducere temperatură tau (b_tr)
- **Anexa F**: Calcul detaliat case sezon încălzire (monthly method)

## ISO 13789:2017 — referințe complementare

- **§6.3**: H = H_tr,adj + H_ve (formulele 9 + 12)
- **§8.3**: H_ve cu infiltration n_inf incluzând wind shield factor
- **§8.4**: Factor reducere temperatură b_tr (ISO 13370 + 13789 §B.5)

## Plan investigare propus (sprint dedicat ~10-15h)

1. **Compute manual pentru M2** (3-4h):
   - Reproducere monthly ISO 13790 pe foaie de calcul Excel cu input M2
   - Compare cu output live Zephren
   - Identificare exact linia/formula cu discrepanță

2. **Comparare cu calcul Mc 001 oficial** (2-3h):
   - Validation împotriva Mc 001-2022 Anexa F (exemple worked)
   - Verificare cazul A1 (locuință neanvelopată) cu output Zephren

3. **Investigare specifică H_ve + H_inf double-counting** (3-4h):
   - Analiză ISO 13789 §8.3 versus implementare Zephren
   - Test cu n50 variabil (1.0 → 7.0) pentru a vedea sensibilitatea

4. **Fix calc + rebalansare expectedResults** (2-4h):
   - Aplicare fix (eventual feature flag pentru backward-compat)
   - Re-snapshot live values pentru M1-M5
   - Update expectedResults pentru a reflecta calc fix

## Impact pe proiecte reale

**Risk MEDIU pentru:**
- Clădiri rezidențiale standalone pre-1990 fără izolație (cărămidă, paiantă)
- Clădiri publice nereabilitate (școli, primării) cu n50 > 4
- Case unifamiliale cu raport S/V mare (P+1 individuale)

**Risk SCĂZUT pentru:**
- Apartamente în blocuri (RC) — calc validat M1
- Clădiri post-2010 cu n50 < 2 (calc dominant transmission, nu infiltration)
- Clădiri nZEB / ZEB — focus normativ diferit

**Mitigare interim până la fix:**
- Auditorii compară EP calculat cu benchmark național ([`benchmark-national.js`](../src/data/benchmark-national.js)) — discrepanță >50% = alarm
- Comparare cu prior CPE-uri (dacă există) — același U, n50 ar trebui să dea same EP ±15%
- Pentru clădiri vechi standalone: validare manuală qH_nd via Mc 001 Anexa F worked example

## Recomandare strategică

Acest issue NU blochează producția (calcul actual e DETERMINIST și REPRODUCIBIL — auditorii pot acomoda valorile). Dar e o **calibration debt** care trebuie eliminată pentru:
1. Conformitate strictă cu Mc 001-2022
2. Compatibilitate cu CPE-uri emise prin alte calculatoare (PassiveHouse Planning Package, EnergyPlus, etc.)
3. Credibilitate la audit MDLPA

**Recomand sprint dedicat în Q3 2026** după ce sprintul curent (Audit JS Gotcha + Rebalansare DEMO) e închis.
