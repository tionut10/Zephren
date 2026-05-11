/**
 * Prețuri reabilitare — sursă unică Zephren
 * Surse: HG 907/2016 (investiții publice) + piață Q1 2026 + MDLPA + oferte contractori
 * Actualizat: 2026-04-18
 * 3 scenarii: low (econom), mid (standard), high (premium)
 * Prețuri EUR, fără TVA, manoperă inclusă
 */

export const REHAB_PRICES = {
  currency: 'EUR',
  // Sprint 26 P1.1 — fallback EUR/RON 4.97 → 5.10 (rotunjire conservatoare BNR Q1 2026)
  eur_ron_fallback: 5.10,
  source: 'Piață Q1 2026 + HG 907/2016 + MDLPA + oferte contractori',
  last_updated: '2026-04-26',

  // ── Anvelopă (EUR/m²) ────────────────────────────────────────────────────
  envelope: {
    // Pereți exteriori (sistem ETICS — material + manoperă + schele)
    // Sprint 26 P1.8 — calibrare pe Daibau 2026 + ReConstruct 2026 + CIDConstruct
    wall_eps_10cm:     { low: 42, mid: 49, high: 60, lifespan: 40, unit: 'EUR/m²' },
    wall_eps_15cm:     { low: 58, mid: 68, high: 82, lifespan: 40, unit: 'EUR/m²' },
    wall_mw_10cm:      { low: 50, mid: 59, high: 72, lifespan: 45, unit: 'EUR/m²' },
    wall_mw_15cm:      { low: 68, mid: 80, high: 96, lifespan: 45, unit: 'EUR/m²' },
    wall_pur_8cm:      { low: 58, mid: 68, high: 82, lifespan: 35, unit: 'EUR/m²' },
    // Acoperiș / terasă
    // Sprint 26 P1.9 — calibrare în jos (era supraevaluat, materiale + manoperă reduse vs ETICS)
    roof_eps_15cm:     { low: 28, mid: 32, high: 40, lifespan: 35, unit: 'EUR/m²' },
    roof_xps_12cm:     { low: 48, mid: 55, high: 65, lifespan: 50, unit: 'EUR/m²' },
    roof_mw_25cm:      { low: 55, mid: 68, high: 82, lifespan: 40, unit: 'EUR/m²' },
    // Planșeu subsol / demisol (XPS)
    basement_xps_10cm: { low: 28, mid: 32, high: 38, lifespan: 40, unit: 'EUR/m²' },
    // Etanșare anvelopă (n50 blower door)
    airtightness_n50:  { low: 6,  mid: 8,  high: 12, lifespan: 25, unit: 'EUR/m²' },
    // Tâmplărie (EUR/m² montat, include glaf + chit)
    windows_u140:      { low: 115, mid: 135, high: 160, lifespan: 30, unit: 'EUR/m²' },
    windows_u110:      { low: 170, mid: 200, high: 240, lifespan: 30, unit: 'EUR/m²' },
    windows_u090:      { low: 240, mid: 280, high: 330, lifespan: 30, unit: 'EUR/m²' },
    windows_u070:      { low: 340, mid: 390, high: 470, lifespan: 30, unit: 'EUR/m²' },
  },

  // ── Încălzire / ACM ──────────────────────────────────────────────────────
  heating: {
    boiler_cond_24kw:    { low: 1400, mid: 1750, high: 2100, lifespan: 20, unit: 'EUR/set' },
    boiler_cond_35kw:    { low: 1800, mid: 2200, high: 2700, lifespan: 20, unit: 'EUR/set' },
    hp_aw_8kw:           { low: 5000, mid: 6500, high: 8500, lifespan: 20, unit: 'EUR/set' },
    hp_aw_12kw:          { low: 7000, mid: 9000, high: 11500, lifespan: 20, unit: 'EUR/set' },
    hp_aw_16kw:          { low: 9000, mid: 11500, high: 15000, lifespan: 20, unit: 'EUR/set' },
    hp_aa_multisplit:    { low: 280,  mid: 350,  high: 450,  lifespan: 15, unit: 'EUR/kW' },
    solar_thermal_4m2:   { low: 1600, mid: 2000, high: 2500, lifespan: 25, unit: 'EUR/set' },
    solar_thermal_6m2:   { low: 2200, mid: 2800, high: 3500, lifespan: 25, unit: 'EUR/set' },
    dhw_tank_200L_insul: { low: 450,  mid: 550,  high: 700,  lifespan: 20, unit: 'EUR/set' },
    wwhr_recuperator:    { low: 600,  mid: 800,  high: 1100, lifespan: 30, unit: 'EUR/set' },
  },

  // ── Răcire / Ventilație ──────────────────────────────────────────────────
  cooling: {
    chiller_inverter_kw: { low: 320, mid: 400, high: 520, lifespan: 15, unit: 'EUR/kW' },
    // NOTĂ: cele „per_m2" includ DOAR centrala VMC + comandă (echipament gross-rate)
    vmc_hr_80_per_m2:    { low: 18,  mid: 22,  high: 28,  lifespan: 20, unit: 'EUR/m²Au' },
    vmc_hr_90_per_m2:    { low: 25,  mid: 32,  high: 40,  lifespan: 20, unit: 'EUR/m²Au' },
    // Sprint Audit Prețuri P3.3 (9 mai 2026) — cost FULL-INSTALL per m² Au:
    // include centrală VMC + tubulatură rigidă/flexibilă + grile evacuare/insuflare +
    // izolație canal + comandă + manoperă + punere în funcțiune.
    // Calibrat pe oferte contractori RO Q1 2026 (ex: ~150 EUR/m² Au + ~800 EUR fix manoperă
    // pentru o casă 100 m² → 15.800 EUR full-install). Folosit de calc/vmc-hr.js.
    vmc_hr_full_install_per_m2: { low: 120, mid: 150, high: 190, lifespan: 20, unit: 'EUR/m²Au' },
    vmc_hr_full_install_fixed:  { low: 600, mid: 800, high: 1100, lifespan: 20, unit: 'EUR/set' },
    // Audit mai 2026 P2.2 — KIT STANDARD apartament (alternativă sub-premium):
    // include unitate VMC centralizată + tubulatură flexibilă standard + grile + manoperă 1 zi.
    // Calibrat pe Altecovent + Viessmann RO 2026 (apartament 65 m² → ~2.300-3.300 EUR
    // vs full-install premium ~10k+ EUR). Surse: Altecovent „costul sistem ventilație
    // recuperare căldură" (mai 2026), Viessmann VMC-HR c522 (ianuarie 2026), Komfovent
    // Domekt CF 400 V (15.842 RON unit only). Folosit DEFAULT pentru rezidențial standard;
    // auditorul comută manual la full_install pentru proiecte cu tubulatură HVAC complexă.
    vmc_hr_kit_standard_per_m2: { low: 30, mid: 45, high: 65, lifespan: 20, unit: 'EUR/m²Au' },
    vmc_hr_kit_standard_fixed:  { low: 400, mid: 600, high: 850, lifespan: 20, unit: 'EUR/set' },
    night_vent_control:  { low: 800, mid: 1200, high: 1800, lifespan: 15, unit: 'EUR/set' },
  },

  // ── Regenerabile ─────────────────────────────────────────────────────────
  renewables: {
    pv_kwp:               { low: 900,  mid: 1100, high: 1350, lifespan: 25, unit: 'EUR/kWp' },
    pv_battery_kwh:       { low: 400,  mid: 550,  high: 750,  lifespan: 15, unit: 'EUR/kWh' },
    biomass_pellet_25kw:  { low: 5000, mid: 6500, high: 8500, lifespan: 20, unit: 'EUR/set' },
    chp_micro_1kwe:       { low: 8000, mid: 11000, high: 15000, lifespan: 20, unit: 'EUR/set' },
    // Sprint Audit Prețuri P3.4 (9 mai 2026) — CHP scaling per range putere [EUR/kW_el].
    // Curba de cost descrește cu puterea (economies of scale):
    //   - micro 1-5 kW_el (rezidențial avansat / clădiri mici): tipic 3.000-5.000 EUR/kW_el
    //   - small 5-50 kW_el (clădiri mijlocii / tertiar mic): 1.800-3.000 EUR/kW_el
    //   - commercial 50-500 kW_el (industrie / district heating): 1.000-1.800 EUR/kW_el
    // Sursa: SR EN 50465:2015, IEA CHP Task 26, oferte Viessmann/Bosch RO 2025-2026.
    // Folosit de calc/chp-detailed.js prin getCHPInvestmentPerKW(power_kW).
    chp_micro_per_kwe:       { low: 3000, mid: 4000, high: 5000,  lifespan: 20, unit: 'EUR/kW_el' },
    chp_small_per_kwe:       { low: 1800, mid: 2400, high: 3000,  lifespan: 20, unit: 'EUR/kW_el' },
    chp_commercial_per_kwe:  { low: 1000, mid: 1400, high: 1800,  lifespan: 25, unit: 'EUR/kW_el' },
  },

  // ── Iluminat ─────────────────────────────────────────────────────────────
  lighting: {
    led_replacement:     { low: 6,  mid: 8,  high: 12, lifespan: 15, unit: 'EUR/m²Au' },
    pir_daylight_sensor: { low: 35, mid: 50, high: 75, lifespan: 15, unit: 'EUR/punct' },
    dali_upgrade:        { low: 8,  mid: 12, high: 18, lifespan: 20, unit: 'EUR/m²Au' },
  },

  // ── BACS (SR EN ISO 52120-1:2022) ────────────────────────────────────────
  bacs: {
    class_d_to_c: { low: 3000,  mid: 5000,  high: 8000,  lifespan: 15, unit: 'EUR/set' },
    class_c_to_b: { low: 5000,  mid: 8000,  high: 12000, lifespan: 15, unit: 'EUR/set' },
    class_b_to_a: { low: 8000,  mid: 15000, high: 25000, lifespan: 15, unit: 'EUR/set' },
  },

  // ── Durabilitate estimată per componentă (ani) ───────────────────────────
  // Folosit în LCC pentru calcul perioade de înlocuire intermediare
  lifespans: {
    envelope_opaque: 40,
    envelope_windows: 30,
    boiler: 20,
    heat_pump: 20,
    solar_thermal: 25,
    pv_panels: 25,
    pv_battery: 15,
    hvac_fan_coil: 15,
    vmc_hr: 20,
    led: 15,
    bacs: 15,
    biomass: 20,
    chp: 20,
  },
};

// ─── Cache BNR ───────────────────────────────────────────────────────────────
const BNR_CACHE_KEY = 'bnr_eur_ron_cache';
const BNR_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Returnează cursul EUR/RON:
 * 1. Override utilizator din sessionStorage (dacă există)
 * 2. Din localStorage dacă < 24h
 * 3. Din API Frankfurter (https://api.frankfurter.app — CORS permis, gratuit)
 * 4. Fallback: REHAB_PRICES.eur_ron_fallback (4.97)
 */
export async function getLiveEurRon() {
  // Override utilizator prioritar
  try {
    const override = sessionStorage.getItem('user_eur_ron_override');
    if (override) {
      const r = parseFloat(override);
      if (r > 4 && r < 8) return r;
    }
  } catch {}

  // Cache localStorage
  try {
    const raw = localStorage.getItem(BNR_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.rate && Date.now() - (cached.ts || 0) < BNR_CACHE_MAX_AGE_MS) {
        return cached.rate;
      }
    }
  } catch {}

  // API Frankfurter — CORS activ, date ECB (aceleași ca BNR referință)
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=RON', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.RON;
      if (typeof rate === 'number' && rate > 4 && rate < 8) {
        try {
          localStorage.setItem(BNR_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
        } catch {}
        return rate;
      }
    }
  } catch {}

  return REHAB_PRICES.eur_ron_fallback;
}

/**
 * Permite utilizatorului să suprascrie cursul EUR/RON manual.
 * Valoarea este persistată în sessionStorage (valabil doar pe sesiune).
 */
export function setUserEurRon(rate) {
  const r = parseFloat(rate);
  if (!r || r < 4 || r > 8) return false;
  try {
    sessionStorage.setItem('user_eur_ron_override', String(r));
  } catch {}
  return true;
}

/**
 * Returnează cursul EUR/RON: override user (dacă există) > BNR cache > fallback.
 * Versiune sincronă — folosește cache sau fallback, nu face fetch.
 */
export function getEurRonSync() {
  try {
    const override = sessionStorage.getItem('user_eur_ron_override');
    if (override) {
      const r = parseFloat(override);
      if (r > 4 && r < 8) return r;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(BNR_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.rate && Date.now() - (cached.ts || 0) < BNR_CACHE_MAX_AGE_MS) {
        return cached.rate;
      }
    }
  } catch {}

  return REHAB_PRICES.eur_ron_fallback;
}

/**
 * Returnează prețul unui element din catalog.
 * @param {'envelope'|'heating'|'cooling'|'renewables'|'lighting'|'bacs'} category
 * @param {string} item - cheia elementului (ex: 'wall_eps_10cm')
 * @param {'low'|'mid'|'high'} scenario - scenariul de preț (default: 'mid')
 * @returns {{ price: number, unit: string, lifespan: number } | null}
 */
export function getPrice(category, item, scenario = 'mid') {
  const entry = REHAB_PRICES[category]?.[item];
  if (!entry) return null;
  return {
    price: entry[scenario] ?? entry.mid,
    unit: entry.unit || 'EUR/m²',
    lifespan: entry.lifespan || 20,
  };
}

/**
 * Returnează prețul în RON (folosind cursul sincron).
 */
export function getPriceRON(category, item, scenario = 'mid') {
  const p = getPrice(category, item, scenario);
  if (!p) return null;
  const rate = getEurRonSync();
  return {
    priceEUR: p.price,
    priceRON: Math.round(p.price * rate),
    unit: p.unit,
    lifespan: p.lifespan,
    rate,
  };
}

/**
 * Sprint Audit Prețuri P3.4 (9 mai 2026) — selectează preț CHP per range putere.
 * Curba de cost CHP descrește cu puterea (economies of scale):
 *   - 1-5 kW_el → chp_micro_per_kwe (3000-5000 EUR/kW_el, mid 4000)
 *   - 5-50 kW_el → chp_small_per_kwe (1800-3000 EUR/kW_el, mid 2400)
 *   - >50 kW_el → chp_commercial_per_kwe (1000-1800 EUR/kW_el, mid 1400)
 *
 * @param {number} power_kW_el - puterea electrică instalată
 * @param {'low'|'mid'|'high'} [scenario='mid']
 * @returns {{ pricePerKW: number, range: string, lifespan: number, unit: string }}
 */
export function getCHPInvestmentPerKW(power_kW_el, scenario = 'mid') {
  const p = parseFloat(power_kW_el) || 0;
  let key, range;
  if (p <= 5) { key = 'chp_micro_per_kwe';      range = 'micro (1-5 kW_el)'; }
  else if (p <= 50) { key = 'chp_small_per_kwe'; range = 'small (5-50 kW_el)'; }
  else { key = 'chp_commercial_per_kwe';         range = 'commercial (50+ kW_el)'; }
  const entry = REHAB_PRICES.renewables[key];
  if (!entry) {
    return { pricePerKW: 4000, range, lifespan: 20, unit: 'EUR/kW_el' };
  }
  return {
    pricePerKW: entry[scenario] ?? entry.mid,
    range,
    lifespan: entry.lifespan || 20,
    unit: entry.unit || 'EUR/kW_el',
  };
}

/**
 * Calculează costul unui pachet de măsuri cu 3 scenarii.
 * @param {Array<{category: string, item: string, qty: number}>} measures
 * @returns {{ low: number, mid: number, high: number }} total EUR
 */
export function calcPackageCost(measures) {
  const totals = { low: 0, mid: 0, high: 0 };
  for (const m of measures) {
    for (const sc of ['low', 'mid', 'high']) {
      const p = getPrice(m.category, m.item, sc);
      if (p) totals[sc] += p.price * (m.qty || 1);
    }
  }
  return {
    low: Math.round(totals.low),
    mid: Math.round(totals.mid),
    high: Math.round(totals.high),
  };
}
