/**
 * fire-safety.js — Sprint 22 #17
 * Verificare siguranță la foc pentru straturile izolante conform:
 *  - P118/2013 (Normativ siguranța la foc a construcțiilor)
 *  - P118/3-2015 (Normativ privind securitatea la incendiu a construcțiilor, Partea a III-a — instalații detectare)
 *  - SR EN 13501-1:2019 (clasificare reacție la foc — Euroclasse)
 *
 * Reguli cumulative ETICS (siguranță la foc la finisaj termoizolant):
 *  - Clădiri >25 m înălțime → obligatoriu A2-s1,d0 (vată minerală)
 *  - Clădiri 11-25 m → min B-s2,d0 pe partea exterioară
 *  - Clădiri ≤11 m (casă P / P+1) → orice clasă acceptată (inclusiv E pentru EPS)
 */

// ─────────────────────────────────────────────────────────────
// Clase de reacție la foc (SR EN 13501-1:2019)
// Ordonate de la cea mai rezistentă la cea mai combustibilă.
// ─────────────────────────────────────────────────────────────
export const FIRE_CLASSES = {
  "A1":         { rank: 0, label: "Incombustibil total (A1)",            isIncombustible: true },
  "A2-s1,d0":   { rank: 1, label: "Aproape incombustibil (A2-s1,d0)",    isIncombustible: true },
  "A2-s2,d0":   { rank: 2, label: "Aproape incombustibil (A2-s2,d0)",    isIncombustible: true },
  "B-s1,d0":    { rank: 3, label: "Combustibilitate foarte redusă (B)",  isIncombustible: false },
  "B-s2,d0":    { rank: 4, label: "Combustibilitate redusă (B-s2,d0)",   isIncombustible: false },
  "C-s2,d0":    { rank: 5, label: "Combustibilitate medie (C)",          isIncombustible: false },
  "D-s2,d2":    { rank: 6, label: "Combustibil mediu (D)",               isIncombustible: false },
  "E":          { rank: 7, label: "Combustibil ridicat (E)",             isIncombustible: false },
  "F":          { rank: 8, label: "Neclasificat / necunoscut (F)",       isIncombustible: false },
};

// ─────────────────────────────────────────────────────────────
// Clasificare implicită per material (pattern matching pe nume)
// Bazat pe fișe tehnice uzuale ETICS RO (Rockwool, Knauf, Austrotherm, Baumit).
// ─────────────────────────────────────────────────────────────
const MATERIAL_FIRE_PATTERNS = [
  // Vată minerală bazaltică (stone wool) — A1
  { re: /vat[ăa].{0,5}(bazaltic|piatr)|rockwool|stone\s*wool/i, fire: "A1" },
  // Vată sticlă (glass wool) — A2-s1,d0
  { re: /vat[ăa].{0,5}stic|glass\s*wool|isover|knauf\s*insul/i, fire: "A2-s1,d0" },
  // Vată minerală generic — A1 (conservator)
  { re: /vat[ăa]\s*mineral/i, fire: "A1" },
  // Polistiren grafitat (EPS-SE modificat) — E (clasificare standard)
  { re: /grafitat|neopor/i, fire: "E" },
  // EPS expandat (EPS-F, EPS-100, EPS-200) — E
  { re: /polistiren\s*expandat|\beps\b|styropor/i, fire: "E" },
  // XPS extrudat (Roofmate, Styrodur) — E
  { re: /polistiren\s*extrudat|\bxps\b|roofmate|styrodur|fibran/i, fire: "E" },
  // PIR — B-s2,d0 (plăci izolante)
  { re: /\bpir\b|poliisocianurat/i, fire: "B-s2,d0" },
  // PUR spumă — E
  { re: /poliuretan|\bpur\b|spum[ăa].{0,3}poliuret/i, fire: "E" },
  // Sticla celulară (Foamglas) — A1
  { re: /sticl[ăa]\s*celular|foamglas/i, fire: "A1" },
  // Fibre lemn (Steico, Gutex) — E sau D
  { re: /fibr[ăa]\s*lemn|steico|gutex|wood\s*fiber/i, fire: "E" },
  // Celuloză izolantă — E
  { re: /celuloz[ăa]|cellulose/i, fire: "E" },
  // Panouri sandwich — funcție de miez (rare să apară direct ca strat)
  { re: /sandwich\s*mineral/i, fire: "A2-s1,d0" },
  { re: /sandwich\s*pur|sandwich\s*pir/i, fire: "B-s2,d0" },
  // Termorefl. / barieră vapori / membrane — nu sunt izolante relevante
  { re: /membran[ăa]|polietilen[ăa]|pvc/i, fire: "E" },
  // Lemn masiv / strat structural — D (clasă implicită pentru lemn netratat)
  { re: /^lemn|c[ăa]priori|sc[ăa]ndur[ăa]/i, fire: "D-s2,d2" },
  // Beton, cărămidă, zidărie, tencuieli, mortare — A1 (incombustibile minerale)
  { re: /beton|c[ăa]r[ăa]mid[ăa]|b\.?c\.?a|zid[ăa]rie|piatr[ăa]|gips/i, fire: "A1" },
  { re: /tencui[ae]l[ăa]|mortar|[şs]ap[ăa]|finisaj\s*mineral/i, fire: "A1" },
];

/**
 * Returnează clasa de reacție la foc pentru un material (pe baza numelui).
 * Dacă există explicit `fire_class` în material → folosește-l.
 * Altfel, pattern matching pe nume. Fallback: "F" (necunoscut).
 *
 * @param {object|string} material - { name, cat, fire_class? } sau doar numele
 * @returns {string} cod clasă foc (ex: "A1", "B-s2,d0", "E", "F")
 */
export function getMaterialFireClass(material) {
  if (!material) return "F";
  // Suport pentru string (doar numele) sau obiect cu diverse câmpuri de identificare
  const name = typeof material === "string"
    ? material
    : (material.name || material.matName || material.material || "");
  // Override explicit
  if (typeof material === "object" && material.fire_class) {
    return material.fire_class;
  }
  if (!name) return "F";
  for (const entry of MATERIAL_FIRE_PATTERNS) {
    if (entry.re.test(name)) return entry.fire;
  }
  return "F";
}

/**
 * Compară două clase de foc: întoarce -1 dacă a > b (a e MAI rezistent),
 * 0 dacă egale, +1 dacă a < b (a e mai slab).
 */
function compareFire(a, b) {
  const ra = FIRE_CLASSES[a]?.rank ?? 99;
  const rb = FIRE_CLASSES[b]?.rank ?? 99;
  if (ra < rb) return -1;
  if (ra > rb) return +1;
  return 0;
}

/**
 * Verdict pe clasă de foc pentru o înălțime de clădire.
 *
 * @param {number} heightM - înălțimea clădirii [m]
 * @returns {{ required: string, label: string }}
 */
export function getRequiredFireClass(heightM) {
  const h = parseFloat(heightM) || 0;
  if (h > 25) {
    return {
      required: "A2-s1,d0",
      label: "Clădiri >25m — obligatoriu A2-s1,d0 (vată minerală)",
      rule: "P118/2013 art.2.4.2 + Ord.MDRAP 2466/2017",
    };
  }
  if (h > 11) {
    return {
      required: "B-s2,d0",
      label: "Clădiri 11–25m — minim B-s2,d0 pe exterior",
      rule: "P118/2013 art.2.4.3",
    };
  }
  return {
    required: "E",
    label: "Clădiri ≤11m (P / P+1) — orice clasă acceptată",
    rule: "P118/2013 art.2.4.4",
  };
}

/**
 * Verifică siguranța la foc pentru un ansamblu de straturi izolante.
 * Returnează verdict + detalii per strat.
 *
 * @param {Array} layers - straturi element opac
 * @param {number} heightM - înălțime clădire [m]
 * @returns {{
 *   verdict: "ok"|"warn"|"fail",
 *   message: string,
 *   requiredClass: string,
 *   ruleRef: string,
 *   layerResults: Array,
 * }}
 */
export function checkFireSafety(layers, heightM) {
  const req = getRequiredFireClass(heightM);
  const layerResults = (layers || []).map((l, idx) => {
    const fire = getMaterialFireClass(l);
    const cmp = compareFire(fire, req.required);
    let status;
    if (fire === "F") status = "warn"; // necunoscut
    else if (cmp <= 0) status = "ok";  // la fel sau mai bun
    else status = "fail";              // mai slab decât cerut
    return {
      index: idx,
      name: l.matName || l.material || `Strat ${idx + 1}`,
      fire_class: fire,
      status,
      label: FIRE_CLASSES[fire]?.label || fire,
    };
  });

  // Filtru: verificarea se aplică doar straturilor izolante (λ < 0.06)
  // sau combustibile (non-A1/A2). Straturile incombustibile portante nu se verifică.
  const relevantLayers = layerResults.filter((r, idx) => {
    const layer = layers[idx];
    const lambda = parseFloat(layer?.lambda) || 1;
    const isInsulation = lambda < 0.06;
    const isCombustible = !FIRE_CLASSES[r.fire_class]?.isIncombustible;
    return isInsulation || isCombustible;
  });

  if (relevantLayers.length === 0) {
    return {
      verdict: "ok",
      message: "Fără straturi combustibile — conform P118/2013",
      requiredClass: req.required,
      ruleRef: req.rule,
      layerResults,
    };
  }

  const failed = relevantLayers.filter(r => r.status === "fail");
  const unknown = relevantLayers.filter(r => r.status === "warn");

  if (failed.length > 0) {
    return {
      verdict: "fail",
      message: `${failed.length} strat(uri) sub clasa minimă ${req.required}: ${failed.map(f => f.name).join(", ")}`,
      requiredClass: req.required,
      ruleRef: req.rule,
      layerResults,
    };
  }
  if (unknown.length > 0) {
    return {
      verdict: "warn",
      message: `${unknown.length} strat(uri) cu clasă de foc necunoscută — verificați fișa tehnică`,
      requiredClass: req.required,
      ruleRef: req.rule,
      layerResults,
    };
  }
  return {
    verdict: "ok",
    message: `Toate straturile îndeplinesc clasa minimă ${req.required}`,
    requiredClass: req.required,
    ruleRef: req.rule,
    layerResults,
  };
}
