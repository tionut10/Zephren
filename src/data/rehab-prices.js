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
    vmc_hr_80_per_m2:    { low: 18,  mid: 22,  high: 28,  lifespan: 20, unit: 'EUR/m²Au' },
    vmc_hr_90_per_m2:    { low: 25,  mid: 32,  high: 40,  lifespan: 20, unit: 'EUR/m²Au' },
    night_vent_control:  { low: 800, mid: 1200, high: 1800, lifespan: 15, unit: 'EUR/set' },
  },

  // ── Regenerabile ─────────────────────────────────────────────────────────
  renewables: {
    pv_kwp:               { low: 900,  mid: 1100, high: 1350, lifespan: 25, unit: 'EUR/kWp' },
    pv_battery_kwh:       { low: 400,  mid: 550,  high: 750,  lifespan: 15, unit: 'EUR/kWh' },
    biomass_pellet_25kw:  { low: 5000, mid: 6500, high: 8500, lifespan: 20, unit: 'EUR/set' },
    chp_micro_1kwe:       { low: 8000, mid: 11000, high: 15000, lifespan: 20, unit: 'EUR/set' },
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
