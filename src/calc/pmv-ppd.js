/**
 * pmv-ppd.js — Calcul confort termic PMV/PPD
 *
 * Referințe normative:
 *   - ISO 7730:2005  Ergonomics of the thermal environment
 *   - ASHRAE 55-2020 Thermal Environmental Conditions for Human Occupancy
 *   - SR EN 16798-1:2019  Tabel B.2 — Categorii IEQ pentru clădiri fără sistem de răcire
 *
 * Exporturi: calcPMV, calcOperativeTemp, calcMRT, PMV_ACTIVITY, PMV_CLOTHING
 */

// ---------------------------------------------------------------------------
// Constante predefinite
// ---------------------------------------------------------------------------

/**
 * Activități metabolice predefinite [met]
 * 1 met = 58.15 W/m² suprafață corporală
 */
export const PMV_ACTIVITY = {
  'Culcat':              0.8,
  'Sedentar':            1.0,
  'Birou':               1.2,
  'Stând în picioare':   1.4,
  'Mers ușor':           1.7,
  'Mers':                2.0,
  'Mers rapid':          2.6,
  'Muncă ușoară':        2.0,
  'Muncă medie':         3.0,
  'Muncă grea':          4.0,
};

/**
 * Garnituri vestimentare predefinite [clo]
 * 1 clo = 0.155 m²·K/W
 */
export const PMV_CLOTHING = {
  'Dezbrăcat':           0.0,
  'Vară (ușor)':         0.5,
  'Demi-sezon':          0.7,
  'Iarnă (standard)':    1.0,
  'Iarnă (gros)':        1.5,
  'Îmbrăcăminte termică': 2.0,
};

// ---------------------------------------------------------------------------
// Funcții auxiliare
// ---------------------------------------------------------------------------

/**
 * Presiunea parțială a vaporilor de apă [Pa]
 * Formula Antoine adaptată (ISO 7730 Anexa C)
 * @param {number} ta  - temperatura aerului [°C]
 * @param {number} rh  - umiditate relativă [%]
 * @returns {number} presiunea vaporilor [Pa]
 */
function calcVaporPressure(ta, rh) {
  // Presiunea de saturație Magnus [Pa]
  const pSat = 133.322 * Math.exp(18.956 - 4030.18 / (ta + 235));
  return (rh / 100) * pSat;
}

/**
 * Coeficientul de transfer termic prin convecție al îmbrăcămintei [W/(m²·K)]
 * Calculat iterativ conform ISO 7730 Ecuația (A.3)
 * @param {number} tcl  - temperatura suprafeței îmbrăcămintei [°C]
 * @param {number} ta   - temperatura aerului [°C]
 * @param {number} va   - viteza aerului [m/s]
 * @returns {number} hc [W/(m²·K)]
 */
function calcHc(tcl, ta, va) {
  const hcNat = 2.38 * Math.pow(Math.abs(tcl - ta), 0.25); // convecție naturală
  const hcFor = 12.1 * Math.sqrt(va);                        // convecție forțată
  return Math.max(hcNat, hcFor);
}

/**
 * Factorul de suprafață a îmbrăcămintei fcl [-]
 * Raportul suprafață îmbrăcată / suprafață corporală nud
 * @param {number} icl - rezistența termică a îmbrăcămintei [clo]
 * @returns {number} fcl
 */
function calcFcl(icl) {
  if (icl <= 0.078) {
    return 1.00 + 1.290 * icl;
  }
  return 1.05 + 0.645 * icl;
}

// ---------------------------------------------------------------------------
// Temperatura operativă
// ---------------------------------------------------------------------------

/**
 * Calculează temperatura operativă [°C]
 * Conform ISO 7730 Ecuația (A.1)
 * to = (ta × sqrt(10·va) + tr) / (1 + sqrt(10·va))
 * Simplificare: to ≈ (ta + tr) / 2 pentru va < 0.2 m/s
 *
 * @param {number} ta  - temperatura aerului [°C]
 * @param {number} tr  - temperatura radiantă medie [°C]
 * @param {number} va  - viteza aerului [m/s]
 * @returns {number} temperatura operativă [°C]
 */
export function calcOperativeTemp(ta, tr, va = 0.1) {
  const sqrtV = Math.sqrt(10 * va);
  return (ta * sqrtV + tr) / (1 + sqrtV);
}

// ---------------------------------------------------------------------------
// Temperatura radiantă medie
// ---------------------------------------------------------------------------

/**
 * Calculează temperatura radiantă medie [°C] din temperaturile suprafețelor
 * Metodă: medie ponderată cu ariile (simplificată, fără factori de formă)
 * Conform ISO 7726:1998 Secțiunea 6.1
 *
 * @param {Array<{temp: number, area: number}>} surfaceTemps
 *   - temp: temperatura suprafeței [°C]
 *   - area: aria suprafeței [m²]
 * @returns {number} MRT [°C]
 */
export function calcMRT(surfaceTemps) {
  if (!surfaceTemps || surfaceTemps.length === 0) {
    throw new Error('calcMRT: array surfaceTemps gol sau invalid');
  }

  // Metodă radiativă: T_mr^4 = Σ(A_i × T_i^4) / Σ(A_i)   [Kelvin la puterea 4]
  let sumAreaT4 = 0;
  let sumArea   = 0;

  for (const { temp, area } of surfaceTemps) {
    if (area <= 0) continue;
    const tK = temp + 273.15;
    sumAreaT4 += area * Math.pow(tK, 4);
    sumArea   += area;
  }

  if (sumArea === 0) {
    throw new Error('calcMRT: suma ariilor este zero');
  }

  return Math.pow(sumAreaT4 / sumArea, 0.25) - 273.15;
}

// ---------------------------------------------------------------------------
// Calcul PMV/PPD — formula Fanger completă
// ---------------------------------------------------------------------------

/**
 * Calculează PMV și PPD conform ISO 7730:2005 / ASHRAE 55-2020
 *
 * Algoritmul urmează pas cu pas Anexa A din ISO 7730:2005:
 *  1. Parametri de intrare
 *  2. Calculul icl, fcl, pa
 *  3. Estimare inițială tcl = ta
 *  4. Iterație pentru tcl (converge în ~5-10 pași)
 *  5. Calcul PMV cu formula Fanger
 *  6. Calcul PPD
 *
 * @param {Object} params
 * @param {number}  params.ta   - temperatura aerului [°C], ex: 20
 * @param {number}  [params.tr] - temperatura radiantă medie [°C], default = ta
 * @param {number}  [params.va] - viteza aerului [m/s], default 0.1
 * @param {number}  [params.rh] - umiditate relativă [%], default 50
 * @param {number}  [params.met]- activitate metabolică [met], default 1.2
 * @param {number}  [params.clo]- rezistența termică îmbrăcăminte [clo], default 1.0
 *
 * @returns {{
 *   pmv: number,
 *   ppd: number,
 *   sensation: string,
 *   color: string,
 *   operative_temp: number,
 *   category: string,
 *   IEQ_class: string,
 *   recommendations: string[]
 * }}
 */
export function calcPMV({ ta, tr = null, va = 0.1, rh = 50, met = 1.2, clo = 1.0 }) {
  // --- validări de intrare ---
  if (ta === undefined || ta === null) throw new Error('calcPMV: ta (temperatura aerului) este obligatorie');
  if (ta < -40 || ta > 80)   throw new Error(`calcPMV: ta=${ta} în afara domeniului [-40, 80]°C`);
  if (va < 0)                throw new Error('calcPMV: viteza aerului va nu poate fi negativă');
  if (rh < 0 || rh > 100)   throw new Error(`calcPMV: umiditate relativă rh=${rh} în afara [0, 100]%`);
  if (met <= 0)              throw new Error('calcPMV: met trebuie să fie pozitiv');
  if (clo < 0)               throw new Error('calcPMV: clo nu poate fi negativ');

  // Temperatura radiantă = temperatura aerului dacă nu e specificată
  if (tr === null || tr === undefined) tr = ta;

  // --- conversii ---
  const icl = clo * 0.155;              // [clo] → [m²·K/W]
  const M   = met * 58.15;              // [met] → [W/m²]
  const W   = 0;                        // lucru mecanic extern [W/m²] (tipic 0 pentru sedentari)
  const pa  = calcVaporPressure(ta, rh); // presiunea parțială a vaporilor [Pa]
  const fcl = calcFcl(icl);             // factor suprafață îmbrăcăminte [-]

  // Temperaturi în Kelvin pentru calcule radiative
  const taK  = ta + 273;
  const trK  = tr + 273;

  // --- iterație pentru temperatura suprafeței îmbrăcămintei (tcl) ---
  // Ecuația de echilibru: tcl = 35.7 - 0.028(M-W) - icl·fcl·[hc(tcl-ta) + 3.96e-8·fcl·(tcl^4 - tr^4)]
  let tcl = ta;  // estimare inițială
  let tclK, hc;

  for (let iter = 0; iter < 150; iter++) {
    tclK = tcl + 273;
    hc   = calcHc(tcl, ta, va);

    // Termenul de pierderi de căldură prin îmbrăcăminte
    const radTerm  = 3.96e-8 * fcl * (Math.pow(tclK, 4) - Math.pow(trK, 4));
    const convTerm = fcl * hc * (tcl - ta);

    // Temperatura suprafeței îmbrăcămintei din ecuația de echilibru
    const tclNew = 35.7 - 0.028 * (M - W) - icl * (radTerm + convTerm);

    if (Math.abs(tclNew - tcl) < 0.001) break; // convergit
    tcl = tcl + 0.5 * (tclNew - tcl);          // relaxare pentru stabilitate numerică
  }

  tclK = tcl + 273;
  hc   = calcHc(tcl, ta, va);

  // --- formula PMV Fanger (ISO 7730:2005 Ec. A.1) ---
  //
  // PMV = (0.303 × exp(-0.036M) + 0.028) × L
  //
  // unde L = sarcina termică = diferența dintre producția internă de căldură
  //          și pierderea de căldură în condiții de neutralitate termică
  //
  // L = (M - W)
  //   - 3.05e-3 × [5733 - 6.99(M-W) - pa]          (pierderi evaporative difuzie cutanată)
  //   - 0.42 × [(M-W) - 58.15]                       (pierderi evaporative transpirație)
  //   - 1.7e-5 × M × [5867 - pa]                     (pierderi respiratorii latente)
  //   - 0.0014 × M × (34 - ta)                       (pierderi respiratorii sensibile)
  //   - 3.96e-8 × fcl × [tcl_K^4 - tr_K^4]          (pierderi radiative)
  //   - fcl × hc × (tcl - ta)                        (pierderi convective)

  const L = (M - W)
    - 3.05e-3 * (5733 - 6.99 * (M - W) - pa)
    - 0.42 * ((M - W) - 58.15)
    - 1.7e-5 * M * (5867 - pa)
    - 0.0014 * M * (34 - ta)
    - 3.96e-8 * fcl * (Math.pow(tclK, 4) - Math.pow(trK, 4))
    - fcl * hc * (tcl - ta);

  const pmv = (0.303 * Math.exp(-0.036 * M) + 0.028) * L;

  // Rotunjire la 2 zecimale
  const pmvRounded = Math.round(pmv * 100) / 100;

  // --- PPD (ISO 7730 Ec. 2) ---
  // PPD = 100 - 95 × exp(-0.03353×PMV⁴ - 0.2179×PMV²)
  const ppd = 100 - 95 * Math.exp(-0.03353 * Math.pow(pmvRounded, 4) - 0.2179 * Math.pow(pmvRounded, 2));
  const ppdRounded = Math.round(ppd * 10) / 10;

  // --- temperatura operativă ---
  const operativeTemp = Math.round(calcOperativeTemp(ta, tr, va) * 10) / 10;

  // --- senzație termică și culoare ---
  const { sensation, color } = getSensation(pmvRounded);

  // --- categorii conformitate ---
  const category  = getISO7730Category(pmvRounded);
  const IEQ_class = getIEQClass(pmvRounded);

  // --- recomandări ---
  const recommendations = getRecommendations({ pmv: pmvRounded, ta, tr, va, rh, met, clo, ppd: ppdRounded });

  return {
    pmv: pmvRounded,
    ppd: ppdRounded,
    sensation,
    color,
    operative_temp: operativeTemp,
    category,
    IEQ_class,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Senzație termică
// ---------------------------------------------------------------------------

/**
 * Returnează eticheta senzației termice și culoarea hex asociată
 * conform scării ASHRAE de 7 puncte: -3 … +3
 * @param {number} pmv
 * @returns {{ sensation: string, color: string }}
 */
function getSensation(pmv) {
  if (pmv <= -2.5) return { sensation: 'Rece',           color: '#1565C0' }; // albastru închis
  if (pmv <= -1.5) return { sensation: 'Răcoros',        color: '#42A5F5' }; // albastru deschis
  if (pmv <= -0.5) return { sensation: 'Ușor răcoros',   color: '#80DEEA' }; // cyan deschis
  if (pmv <   0.5) return { sensation: 'Neutru',         color: '#66BB6A' }; // verde — confort
  if (pmv <   1.5) return { sensation: 'Ușor cald',      color: '#FFA726' }; // portocaliu deschis
  if (pmv <   2.5) return { sensation: 'Cald',           color: '#EF5350' }; // roșu mediu
  return               { sensation: 'Fierbinte',         color: '#B71C1C' }; // roșu închis
}

// ---------------------------------------------------------------------------
// Categorii ISO 7730 și IEQ
// ---------------------------------------------------------------------------

/**
 * Categorie conformitate conform ISO 7730:2005 Tabel A.2
 *   A: |PMV| ≤ 0.2,  PPD < 6%
 *   B: |PMV| ≤ 0.5,  PPD < 10%
 *   C: |PMV| ≤ 0.7,  PPD < 15%
 *   D: |PMV| >  0.7 — neconform
 * @param {number} pmv
 * @returns {string}
 */
function getISO7730Category(pmv) {
  const abs = Math.abs(pmv);
  if (abs <= 0.2) return 'A';
  if (abs <= 0.5) return 'B';
  if (abs <= 0.7) return 'C';
  return 'D (neconform)';
}

/**
 * Clasă IEQ conform SR EN 16798-1:2019 Tabel B.2
 * (același prag ca ISO 7730, cu notație romană)
 *   I:   |PMV| ≤ 0.2
 *   II:  |PMV| ≤ 0.5
 *   III: |PMV| ≤ 0.7
 *   IV:  |PMV| >  0.7
 * @param {number} pmv
 * @returns {string}
 */
function getIEQClass(pmv) {
  const abs = Math.abs(pmv);
  if (abs <= 0.2) return 'I';
  if (abs <= 0.5) return 'II';
  if (abs <= 0.7) return 'III';
  return 'IV';
}

// ---------------------------------------------------------------------------
// Recomandări automatizate
// ---------------------------------------------------------------------------

/**
 * Generează recomandări de îmbunătățire a confortului termic
 * bazate pe valorile PMV, PPD și parametrii de intrare
 *
 * @param {{ pmv, ta, tr, va, rh, met, clo, ppd }} p
 * @returns {string[]}
 */
function getRecommendations({ pmv, ta, tr, va, rh, met, clo, ppd }) {
  const recs = [];
  const abs  = Math.abs(pmv);

  // Fără probleme
  if (abs <= 0.2 && ppd < 6) {
    recs.push('Confortul termic este excelent. Nu sunt necesare modificări.');
    return recs;
  }

  if (abs <= 0.5) {
    recs.push('Confortul termic este acceptabil (categoria B). Îmbunătățirile sunt opționale.');
  }

  // Prea rece
  if (pmv < -0.5) {
    if (ta < 20) recs.push(`Creșteți temperatura aerului cu ${(20 - ta).toFixed(1)}°C (recomandare: minim 20°C iarna).`);
    if (tr < ta - 2) recs.push('Temperatura radiantă medie este scăzută — îmbunătățiți izolarea termică a anvelopei sau adăugați corpuri de încălzire radiante.');
    if (va > 0.15) recs.push(`Reduceți viteza curenților de aer (actual: ${va} m/s — depășește 0.15 m/s recomandat iarna).`);
    if (clo < 0.7) recs.push('Creșteți izolarea vestimentară (îmbrăcăminte mai caldă, minim demi-sezon = 0.7 clo).');
    if (met < 1.2) recs.push('Activitatea fizică redusă contribuie la senzația de frig. Luați în calcul exerciții ușoare.');
    if (abs > 1.5) recs.push('Disconfort termic sever prin frig — verificați sistemul de încălzire și etanșeitatea clădirii.');
  }

  // Prea cald
  if (pmv > 0.5) {
    if (ta > 26) recs.push(`Reduceți temperatura aerului cu ${(ta - 26).toFixed(1)}°C (recomandare: maxim 26°C vara).`);
    if (tr > ta + 2) recs.push('Temperatura radiantă medie este ridicată — protecție solară (jaluzele, storuri) sau răcire radiativă.');
    if (va < 0.2 && met <= 1.4) recs.push('Creșteți viteza aerului (ventilator de tavan sau aer condiționat) pentru a îmbunătăți răcirea convectivă.');
    if (clo > 0.7) recs.push('Reduceți izolarea vestimentară (îmbrăcăminte mai ușoară, sub 0.5 clo vara).');
    if (rh > 60) recs.push(`Umiditatea relativă de ${rh}% este ridicată — utilizați un dezumidificator (optim 40–60%).`);
    if (abs > 1.5) recs.push('Disconfort termic sever prin căldură — verificați sistemul de climatizare și protecția solară.');
  }

  // PPD ridicat
  if (ppd > 20) {
    recs.push(`PPD = ${ppd}% depășește limita de 20% — sunt necesare măsuri urgente de reabilitare a sistemului HVAC.`);
  } else if (ppd > 10) {
    recs.push(`PPD = ${ppd}% depășește limita categoriei B (10%) — recomandabil să îmbunătățiți condițiile termice.`);
  }

  // Umiditate
  if (rh < 30) recs.push(`Umiditatea relativă de ${rh}% este prea scăzută (optim 40–60%) — utilizați un umidificator.`);
  if (rh > 70) recs.push(`Umiditatea relativă de ${rh}% favorizează condensul și mucegaiul — ventilați sau dezumidificați.`);

  // Asimetrie radiantă (diferență mare ta–tr)
  if (Math.abs(ta - tr) > 4) {
    recs.push(`Diferența mare între temperatura aerului (${ta}°C) și cea radiantă (${tr}°C) poate cauza disconfort prin asimetrie — verificați suprafețele reci/calde din incintă.`);
  }

  if (recs.length === 0) {
    recs.push('Confortul termic este satisfăcător (categoria C). Îmbunătățirile minore pot optimiza confortul.');
  }

  return recs;
}
