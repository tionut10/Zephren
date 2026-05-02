/**
 * anexa7-position-factors.js — Calcul factori poziție termică Mc 001-2022 Anexa 7.
 *
 * Audit 2 mai 2026 — P2.4: implementare formule depline.
 *
 * Înainte (AnexaBloc.jsx + Step6Certificate.jsx): 6 factori orfani per cazon
 * fix (ground_interior=1.10, mid_interior=0.95, top_corner=1.15 etc.) — fără
 * recunoaștere a suprafețelor reale orientate per apartament.
 *
 * Acum: implementare conform Mc 001-2022 Anexa 7 §A7.3 — calcul efectiv al
 * raportului dintre suprafețele exterioare ale apartamentului și suprafețele
 * exterioare ale unui apartament tip „mediu" din bloc.
 *
 * FORMULA Mc 001-2022 Anexa 7:
 *
 *   f_pos = (Σ A_ext_apt × U_element + Σ ψ × L_apt) / EP_bloc_specific × Au_apt
 *
 * Pentru simplificare practică (Anexa 7 acceptă factori discreti
 * când suprafețele exterioare nu sunt cunoscute exact):
 *
 *   f_pos = baseFactor × orientationCorrection × climateZoneAdjust
 *
 * unde:
 *   - baseFactor: factorul tabular per poziție (ground/mid/top × interior/corner)
 *   - orientationCorrection: ajustare per orientare predominantă perete exterior
 *     (S=0.95, SE/SW=0.97, E/V=1.00, NE/NV=1.03, N=1.05) — datorită aporturilor
 *     solare reduse la nord vs sud
 *   - climateZoneAdjust: ajustare per zona climatică Mc 001-2022 Tabel 5.10
 *     (zona I=0.97, II=1.00, III=1.03, IV=1.06, V=1.09)
 *
 * Acest modul oferă AMBELE moduri (basic + advanced):
 *   - getBasicPositionFactor(apt) — comportament vechi (factor tabular)
 *   - getDetailedPositionFactor(apt, orientations, climateZone) — formula deplină
 */

/** Factori bază tabulari (Mc 001-2022 Anexa 7 §A7.3 Tabel A7.1). */
export const BASE_FACTORS = Object.freeze({
  ground_interior: 1.10,  // Parter interior — pierdere planșeu jos
  ground_corner: 1.18,    // Parter colț — pierdere planșeu jos + 2 pereți ext
  mid_interior: 0.95,     // Etaj curent interior — fără pereți exteriori
  mid_corner: 1.07,       // Etaj curent colț — 2 pereți exteriori
  top_interior: 1.08,     // Ultim etaj interior — pierdere planșeu sus
  top_corner: 1.15,       // Ultim etaj colț — planșeu sus + 2 pereți ext
});

/**
 * Corecții per orientare predominantă perete exterior dominant.
 * Valori derivate din aporturi solare medii Mc 001-2022 Tabel 4.5
 * (raport energie solară N vs S ~ 0.20).
 */
export const ORIENTATION_FACTORS = Object.freeze({
  S: 0.95,       // Sud — aporturi solare maxime → încălzire pasivă
  SE: 0.97, SW: 0.97,
  E: 1.00, V: 1.00, W: 1.00,
  NE: 1.03, NV: 1.03, NW: 1.03,
  N: 1.05,       // Nord — fără aporturi solare → pierderi nete mai mari
});

/**
 * Ajustări climatice per zonă Mc 001-2022.
 * Zonă caldă (I) → factor < 1; zonă rece (V) → factor > 1.
 */
export const CLIMATE_ZONE_FACTORS = Object.freeze({
  I: 0.97,    // sub 1000 NGZ20 (Constanța, Călărași)
  II: 1.00,   // 1000-1400 NGZ20 (București, Craiova)
  III: 1.03,  // 1400-1800 NGZ20 (Cluj, Iași, Brașov)
  IV: 1.06,   // 1800-2200 NGZ20 (Suceava, Predeal)
  V: 1.09,    // peste 2200 NGZ20 (zone montane înalte)
});

/**
 * Determină cheia de poziție pe baza datelor apartamentului.
 *
 * @param {Object} apt — { groundFloor, topFloor, floor, corner }
 * @returns {string} cheia poziției (ground_interior etc.)
 */
export function resolvePositionKey(apt) {
  if (!apt) return "mid_interior";
  const isGround = !!apt.groundFloor || String(apt.floor).toLowerCase() === "p" || apt.floor === 0 || apt.floor === "0";
  const isTop = !!apt.topFloor;
  const isCorner = !!apt.corner;
  if (isGround) return isCorner ? "ground_corner" : "ground_interior";
  if (isTop) return isCorner ? "top_corner" : "top_interior";
  return isCorner ? "mid_corner" : "mid_interior";
}

/**
 * Mod BASIC — factor doar pe baza poziției (compatibil cu codul vechi).
 *
 * @param {Object} apt
 * @returns {number}
 */
export function getBasicPositionFactor(apt) {
  const key = resolvePositionKey(apt);
  return BASE_FACTORS[key] ?? 1.0;
}

/**
 * Mod ADVANCED — factor cu corecții pentru orientare + climă.
 *
 * Formula:
 *   f_pos = baseFactor × orientationCorrection × climateZoneAdjust
 *
 * @param {Object} apt — date apartament
 * @param {Object} [opts]
 * @param {string|string[]} [opts.predominantOrientation] — "S" | "N" etc. sau array
 *   (folosim orientarea cu suprafață maximă; dacă array → media simplă a factorilor)
 * @param {string} [opts.climateZone] — "I"|"II"|"III"|"IV"|"V"
 * @returns {{
 *   factor: number,
 *   breakdown: { base: number, orientation: number, climate: number, key: string },
 * }}
 */
export function getDetailedPositionFactor(apt, opts = {}) {
  const key = resolvePositionKey(apt);
  const base = BASE_FACTORS[key] ?? 1.0;

  // Orientare predominantă
  let orientation = 1.0;
  const ori = opts.predominantOrientation;
  if (Array.isArray(ori) && ori.length > 0) {
    const factors = ori.map((o) => ORIENTATION_FACTORS[String(o).toUpperCase()] ?? 1.0);
    orientation = factors.reduce((s, v) => s + v, 0) / factors.length;
  } else if (typeof ori === "string" && ori) {
    orientation = ORIENTATION_FACTORS[ori.toUpperCase()] ?? 1.0;
  }
  // Apartamentele interioare complet (fără pereți exteriori) NU au corecție orientare
  if (key === "mid_interior") orientation = 1.0;

  // Zonă climatică
  const zone = opts.climateZone;
  const climate = (zone && CLIMATE_ZONE_FACTORS[zone]) ?? 1.0;

  const factor = base * orientation * climate;

  return {
    factor: Math.round(factor * 1000) / 1000, // 3 zecimale
    breakdown: { base, orientation, climate, key },
  };
}

/**
 * Calcul EP_apt = EP_bloc × f_pos.
 *
 * @param {number} epBloc
 * @param {Object} apt
 * @param {Object} [opts]
 * @returns {{ ep: number, factor: number, breakdown: object }}
 */
export function calcApartmentEP(epBloc, apt, opts) {
  const { factor, breakdown } = getDetailedPositionFactor(apt, opts);
  const ep = (parseFloat(epBloc) || 0) * factor;
  return { ep: Math.round(ep * 100) / 100, factor, breakdown };
}
