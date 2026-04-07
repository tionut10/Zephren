// ═══════════════════════════════════════════════════════════════
// DEVIZ ESTIMATIV REABILITARE TERMICĂ — Prețuri unitare orientative RO 2024-2025
// Surse: MDLPA, URBANISM, oferte contractori, piața materialelor Q1 2025
// Curs de referință: 1 EUR = 4.97 RON (BNR medie 2025)
// ═══════════════════════════════════════════════════════════════

// ---------------------------------------------------------------
// BAZA DE DATE PREȚURI UNITARE [EUR]
// Format array: [label, price_eur_m2_per_cm, min_thick_cm, note]
// Pentru sisteme mecanice: { label, price_kw } sau { label, price_m2 }
// ---------------------------------------------------------------

/**
 * Prețuri unitare orientative pentru lucrări de reabilitare termică, România 2025.
 * Prețurile includ manoperă + materiale + transport, fără TVA.
 * Surse: cataloage producători (Baumit, Weber, Knauf), devize pilot MDLPA,
 *        statistici ANT-AFM pentru proiecte PNRR 2023-2024.
 */
export const REHAB_PRICE_DB = {
  // ─── Termoizolație pereți exteriori (sistem ETICS / fațadă ventilată) ───────
  // [label, EUR/m²/cm grosime, grosime minimă recomandată [cm], notă]
  insul_wall_eps: [
    "Termoizolație pereți EPS (sistem ETICS)",
    3.2,   // EUR/m² per cm grosime (material + manoperă + placare)
    10,    // grosime minimă recomandată
    "EPS 100 kPa; preț total = price_per_cm × thick + 18 EUR/m² manoperă fixă"
  ],
  insul_wall_mw: [
    "Termoizolație pereți vată minerală (MW, sistem ETICS)",
    4.1,   // EUR/m²/cm — vată minerală mai scumpă ca EPS
    12,
    "MW λ≤0.035 W/mK; recomandat pentru clădiri A/B risc incendiu"
  ],
  insul_wall_pur: [
    "Termoizolație pereți poliuretan proiectat (PUR)",
    5.8,   // EUR/m²/cm — preț ridicat dar grosimi mici
    6,
    "PUR λ≤0.025 W/mK; aplicabil unde spațiul e limitat (fundații, socluri)"
  ],

  // ─── Termoizolație acoperiș / terasă ─────────────────────────────────────
  insul_roof_eps: [
    "Termoizolație terasă EPS (sub șapă sau în inversă)",
    2.8,
    15,
    "EPS 150 sau 200 kPa; include manoperă + bariere vapori"
  ],
  insul_roof_xps: [
    "Termoizolație terasă XPS (terasă inversă, zone umede)",
    4.4,
    12,
    "XPS λ≤0.034 W/mK; recomandat pentru terase circulabile sau verzi"
  ],
  insul_roof_mw: [
    "Termoizolație șarpantă vată minerală (MW suflată/role)",
    2.4,
    20,
    "MW vrac suflată; economic pentru poduri necirculabile"
  ],

  // ─── Înlocuire tâmplărie ────────────────────────────────────────────────
  // [label, EUR/m² tâmplărie montată, U [W/m²K], notă]
  windows_2g: [
    "Ferestre geam termoizolant dublu (Low-E + Ar)",
    145,   // EUR/m² montat, inclusiv glaf, chit, transport
    1.1,   // Uw [W/m²K] tipic
    "U≤1.1 W/m²K; PVC sau aluminiu cu RPT; clasa A/B energie"
  ],
  windows_3g: [
    "Ferestre geam termoizolant triplu (Low-E + Ar/Kr)",
    235,
    0.8,
    "U≤0.8 W/m²K; recomandat climat rece / nZEB; PVC sau lemn-aluminiu"
  ],
  windows_pvc: [
    "Ferestre PVC standard dublu vitraj (fără Low-E)",
    110,
    1.4,
    "U≤1.4 W/m²K; soluție economică, nerecomandat pentru nZEB"
  ],

  // ─── Sisteme mecanice ───────────────────────────────────────────────────
  hp_aa: {
    label:      "Pompă de căldură aer-aer (split / multi-split)",
    price_kw:   280,   // EUR/kW capacitate termică instalată (echipament + montaj)
    cop_ref:    3.5,   // COP la A7/W20
    note:       "Include unitate interioară + exterioară + cablaj; fără lucrări civile"
  },
  hp_aw: {
    label:      "Pompă de căldură aer-apă (monobloc/bibloc)",
    price_kw:   420,   // EUR/kW — mai scump ca aer-aer (include hidraulică)
    cop_ref:    3.2,   // COP la A7/W35
    note:       "Include boiler tampon 120L, armături, cablaj; fără radiatoare"
  },
  vmc_hr: {
    label:      "Ventilare mecanică controlată cu recuperare căldură (VMC-HR)",
    price_m2:   28,    // EUR/m² Au arie utilă ventilată
    efficiency: 0.85,  // eficiență schimbător 85%
    note:       "Include centrală VMC + rețea tubulară + grile; η≥80% recuperare"
  },
  solar_thermal: {
    label:      "Panouri solare termice ACM (colectori tuburi vidate)",
    price_m2:   380,   // EUR/m² colector montat (include boiler, pompă, reglaj)
    yield_kwh:  650,   // kWh/m²/an producție estimată RO (medie națională)
    note:       "Sistem complet cu boiler bivalent 200-300L; recomandat 1.5 m²/persoană"
  },
  pv_panels: {
    label:      "Sistem fotovoltaic pe acoperiș (panouri + invertor)",
    price_kwp:  1100,  // EUR/kWp instalat (panouri mono PERC + invertor + montaj)
    yield_kwh:  1150,  // kWh/kWp/an producție medie RO
    note:       "Include montaj, invertor, DC cablaj, priză pământ; fără baterie"
  },

  // ─── Alte lucrări de reabilitare ────────────────────────────────────────
  airtightness: {
    label:      "Etanșare îmbinări / airtightness (folie + benzi)",
    price_m2:   8,     // EUR/m² anvelopă
    note:       "Folie barieră vapori + benzi adezive Contega/Pro Clima; manoperă inclusă"
  },
  basement_insul: {
    label:      "Termoizolație planșeu peste subsol / demisol (XPS)",
    price_m2:   32,    // EUR/m² planșeu (10 cm XPS + chit + finisaj)
    note:       "XPS 10 cm aplicat pe tavan subsol; include primer + adeziv + dibluri"
  },
};

// ---------------------------------------------------------------
// CONSTANTE AUXILIARE
// ---------------------------------------------------------------

/** Curs valutar de referință EUR → RON (BNR medie 2025) */
export const EUR_RON = 4.97;

/** Manoperă fixă per m² pentru sistem ETICS (include schele, grunduire, placare) */
const ETICS_FIXED_EUR_M2 = 18;

/** Manoperă fixă per m² pentru termoizolație acoperiș (include bariere vapori, șapă) */
const ROOF_FIXED_EUR_M2 = 14;

// ---------------------------------------------------------------
// LIMITE FINANȚARE — programe active RO 2024-2026
// ---------------------------------------------------------------

const FUNDING_LIMITS = {
  /** PNRR Component 5-I3: renovare profundă rezidențial, grant max 80% */
  pnrr_max: 30000,
  /** Casa Verde Plus — pompă căldură / PV / solar termic, grant max 90% */
  casa_verde_max: 20000,
  /** AFM — termoizolare anvelopă clădiri rezidențiale, grant max 50% */
  afm_max: 15000,
};

// ---------------------------------------------------------------
// FUNCȚIE PRINCIPALĂ — calcRehabCost
// ---------------------------------------------------------------

/**
 * Calculează devizul estimativ pentru un pachet de reabilitare termică.
 *
 * @param {object} params
 * @param {number} params.wallArea          - Suprafața pereților exteriori [m²]
 * @param {number} params.roofArea          - Suprafața acoperișului / terasei [m²]
 * @param {number} params.floorArea         - Suprafața planșeului peste subsol [m²]
 * @param {number} params.windowArea        - Suprafața tâmplăriei [m²]
 * @param {string} params.wallInsulType     - Tip izolație pereți: "eps" | "mw" | "pur"
 * @param {number} params.wallInsulThick    - Grosime izolație pereți [cm]
 * @param {string} params.roofInsulType     - Tip izolație acoperiș: "eps" | "xps" | "mw"
 * @param {number} params.roofInsulThick    - Grosime izolație acoperiș [cm]
 * @param {boolean} params.replaceWindows   - Înlocuire tâmplărie
 * @param {string} params.windowType        - Tip ferestre: "2g" | "3g" | "pvc"
 * @param {boolean} params.addHP            - Montaj pompă de căldură
 * @param {string} params.hpType            - Tip pompă: "aa" | "aw"
 * @param {number} params.hpPower           - Putere pompă [kW]
 * @param {boolean} params.addVMC           - Montaj VMC cu recuperare
 * @param {number} params.Au                - Arie utilă clădire [m²]
 * @param {boolean} params.addSolar         - Montaj panouri solare termice
 * @param {number} params.solarArea         - Suprafața colectori solari [m²]
 * @param {boolean} params.addPV            - Montaj sistem fotovoltaic
 * @param {number} params.pvKwp             - Putere instalată PV [kWp]
 * @param {number} params.contingency       - Factor neprevăzut (0.10–0.20)
 * @returns {object} Deviz detaliat cu toate pozițiile și totaluri
 */
export function calcRehabCost({
  wallArea     = 0,
  roofArea     = 0,
  floorArea    = 0,
  windowArea   = 0,
  wallInsulType  = "eps",
  wallInsulThick = 12,
  roofInsulType  = "eps",
  roofInsulThick = 15,
  replaceWindows = false,
  windowType     = "2g",
  addHP          = false,
  hpType         = "aw",
  hpPower        = 10,
  addVMC         = false,
  Au             = 100,
  addSolar       = false,
  solarArea      = 0,
  addPV          = false,
  pvKwp          = 0,
  contingency    = 0.15,
} = {}) {

  // Lista pozițiilor din deviz
  const items = [];

  // ── Helper: adaugă o poziție în deviz ──────────────────────────────────
  function addItem(label, qty, unit, price_unit) {
    if (qty <= 0 || price_unit <= 0) return;
    const total_eur = Math.round(qty * price_unit * 100) / 100;
    items.push({ label, qty: Math.round(qty * 100) / 100, unit, price_unit, total_eur });
  }

  // ── 1. Termoizolație pereți exteriori ──────────────────────────────────
  if (wallArea > 0 && wallInsulThick > 0) {
    const typeKey = "insul_wall_" + (wallInsulType || "eps");
    const dbEntry = REHAB_PRICE_DB[typeKey];
    if (dbEntry && Array.isArray(dbEntry)) {
      const [label, pricePerCm] = dbEntry;
      // Cost total = manoperă fixă + preț per cm × grosime
      const priceTotal_m2 = ETICS_FIXED_EUR_M2 + pricePerCm * wallInsulThick;
      addItem(`${label} (${wallInsulThick} cm)`, wallArea, "m²", priceTotal_m2);
    }
  }

  // ── 2. Termoizolație acoperiș / terasă ───────────────────────────────
  if (roofArea > 0 && roofInsulThick > 0) {
    const typeKey = "insul_roof_" + (roofInsulType || "eps");
    const dbEntry = REHAB_PRICE_DB[typeKey];
    if (dbEntry && Array.isArray(dbEntry)) {
      const [label, pricePerCm] = dbEntry;
      const priceTotal_m2 = ROOF_FIXED_EUR_M2 + pricePerCm * roofInsulThick;
      addItem(`${label} (${roofInsulThick} cm)`, roofArea, "m²", priceTotal_m2);
    }
  }

  // ── 3. Termoizolație planșeu peste subsol ────────────────────────────
  if (floorArea > 0) {
    addItem(
      REHAB_PRICE_DB.basement_insul.label,
      floorArea,
      "m²",
      REHAB_PRICE_DB.basement_insul.price_m2
    );
  }

  // ── 4. Înlocuire tâmplărie ───────────────────────────────────────────
  if (replaceWindows && windowArea > 0) {
    const typeKey = "windows_" + (windowType || "2g");
    const dbEntry = REHAB_PRICE_DB[typeKey];
    if (dbEntry && Array.isArray(dbEntry)) {
      const [label, priceM2] = dbEntry;
      addItem(label, windowArea, "m²", priceM2);
    }
  }

  // ── 5. Pompă de căldură ──────────────────────────────────────────────
  if (addHP && hpPower > 0) {
    const typeKey = "hp_" + (hpType || "aw");
    const dbEntry = REHAB_PRICE_DB[typeKey];
    if (dbEntry && dbEntry.price_kw) {
      addItem(dbEntry.label, hpPower, "kW", dbEntry.price_kw);
    }
  }

  // ── 6. VMC cu recuperare de căldură ─────────────────────────────────
  if (addVMC && Au > 0) {
    addItem(
      REHAB_PRICE_DB.vmc_hr.label,
      Au,
      "m²",
      REHAB_PRICE_DB.vmc_hr.price_m2
    );
  }

  // ── 7. Panouri solare termice ────────────────────────────────────────
  if (addSolar && solarArea > 0) {
    addItem(
      REHAB_PRICE_DB.solar_thermal.label,
      solarArea,
      "m²",
      REHAB_PRICE_DB.solar_thermal.price_m2
    );
  }

  // ── 8. Sistem fotovoltaic ────────────────────────────────────────────
  if (addPV && pvKwp > 0) {
    addItem(
      REHAB_PRICE_DB.pv_panels.label,
      pvKwp,
      "kWp",
      REHAB_PRICE_DB.pv_panels.price_kwp
    );
  }

  // ── 9. Etanșare anvelopă (inclusă automat dacă există lucrări) ───────
  const hasEnvelope = (wallArea > 0 || roofArea > 0);
  if (hasEnvelope && Au > 0) {
    addItem(
      REHAB_PRICE_DB.airtightness.label,
      Au,                                   // estimat pe baza ariei utile
      "m²",
      REHAB_PRICE_DB.airtightness.price_m2
    );
  }

  // ── Totaluri ─────────────────────────────────────────────────────────
  const subtotal_eur = items.reduce((s, i) => s + i.total_eur, 0);
  const contingencyFactor = Math.max(0.05, Math.min(0.30, contingency || 0.15));
  const contingency_eur  = Math.round(subtotal_eur * contingencyFactor * 100) / 100;
  const total_eur        = Math.round((subtotal_eur + contingency_eur) * 100) / 100;
  const total_lei        = Math.round(total_eur * EUR_RON * 100) / 100;
  const total_per_m2     = Au > 0 ? Math.round(total_eur / Au * 100) / 100 : 0;

  // ── Estimare finanțare eligibilă ─────────────────────────────────────
  // PNRR: eligible dacă există termoizolare completă (pereți + acoperiș + ferestre)
  const hasFullEnvelope = (wallArea > 0 && roofArea > 0 && replaceWindows);
  const pnrr_max = hasFullEnvelope
    ? Math.min(total_eur * 0.80, FUNDING_LIMITS.pnrr_max)
    : 0;

  // Casa Verde Plus: eligible pentru sisteme mecanice (HP, PV, solar)
  const hasMechanical = (addHP || addPV || addSolar);
  const mechCost = items
    .filter(i => i.unit === "kW" || i.unit === "kWp" ||
      (i.label && (i.label.includes("solar") || i.label.includes("Solar"))))
    .reduce((s, i) => s + i.total_eur, 0);
  const casa_verde_max = hasMechanical
    ? Math.min(mechCost * 0.90, FUNDING_LIMITS.casa_verde_max)
    : 0;

  // AFM — termoizolare: 50% din costul anvelopei
  const envelopeCost = items
    .filter(i => i.unit === "m²" &&
      (i.label.includes("Termoizolație") || i.label.includes("Ferestre")))
    .reduce((s, i) => s + i.total_eur, 0);
  const afm_max = hasEnvelope
    ? Math.min(envelopeCost * 0.50, FUNDING_LIMITS.afm_max)
    : 0;

  return {
    items,
    subtotal_eur:   Math.round(subtotal_eur * 100) / 100,
    contingency_eur,
    contingency_pct: contingencyFactor,
    total_eur,
    total_lei,
    total_per_m2,
    fundingEligible: {
      pnrr_max:       Math.round(pnrr_max),
      casa_verde_max: Math.round(casa_verde_max),
      afm_max:        Math.round(afm_max),
    },
    meta: {
      currency:  "EUR",
      eur_ron:   EUR_RON,
      note:      "Prețuri orientative 2024-2025, fără TVA. Deviz detaliat necesită oferte de la contractori.",
    },
  };
}
