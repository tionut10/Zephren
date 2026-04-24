/**
 * shading-factor.js — Sprint 22 #15
 * Factor de protecție solară F_sh pentru ferestre cu streașină/aripi laterale/obloane.
 *
 * Referințe:
 *  - Mc 001-2022 §10.4.2 + Anexa E (Tabelele E.1, E.2)
 *  - SR EN ISO 52016-1:2017 §6.5.4 (F_sh,o,b,m pentru obstacole externe + fins)
 *  - SR EN 13363-1:2003 (dispozitive protecție solară mobilă)
 *
 * Formula: F_sh = F_h × F_f × F_mobile
 *   F_h = factor streașină (overhang) — [0, 1]
 *   F_f = factor aripi laterale (fins) — [0, 1]
 *   F_mobile = factor protecție mobilă (obloane/rulouri închise) — 0.5 când există
 *
 * Q_sol = Σ F_sh · g · A · I_sol
 */

// ─────────────────────────────────────────────────────────────
// Mc 001-2022 Anexa E — Tabel E.1 (F_h overhang) orientare sudică, lat ~45°N
// Raport d/h = adâncime streașină / înălțime fereastră
// ─────────────────────────────────────────────────────────────
const F_H_TABLE = [
  { ratio: 0.0, fh: 1.00 },
  { ratio: 0.2, fh: 0.90 },
  { ratio: 0.4, fh: 0.76 },
  { ratio: 0.6, fh: 0.63 },
  { ratio: 0.8, fh: 0.55 },
  { ratio: 1.0, fh: 0.50 },
];

// ─────────────────────────────────────────────────────────────
// Mc 001-2022 Anexa E — Tabel E.2 (F_f fins)
// Raport d/w = adâncime aripă / lățime fereastră
// ─────────────────────────────────────────────────────────────
const F_F_TABLE = [
  { ratio: 0.0, ff: 1.00 },
  { ratio: 0.2, ff: 0.92 },
  { ratio: 0.4, ff: 0.85 },
  { ratio: 0.6, ff: 0.80 },
  { ratio: 0.8, ff: 0.77 },
  { ratio: 1.0, ff: 0.75 },
];

// Coeficient orientare pentru streașină — streașina afectează diferit funcție de orientare
// (sud e impact maxim; nord aproape zero pentru că soarele nu ajunge direct)
// Mc 001-2022 Anexa E — factor de ajustare
const ORIENT_SCALE_OVERHANG = {
  S: 1.00, SE: 0.90, SV: 0.90,
  E: 0.70, V: 0.70,
  NE: 0.40, NV: 0.40,
  N: 0.20,
  Orizontal: 0.00, // streașina nu afectează orientarea orizontală
};

/**
 * Interpolare liniară într-un tabel ordonat crescător după `ratio`.
 * @param {Array<{ratio:number,[key:string]:number}>} table
 * @param {number} ratio
 * @param {string} valueKey
 * @returns {number}
 */
function interpolate(table, ratio, valueKey) {
  if (!Number.isFinite(ratio) || ratio <= 0) return table[0][valueKey];
  if (ratio >= table[table.length - 1].ratio) return table[table.length - 1][valueKey];
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (ratio >= a.ratio && ratio <= b.ratio) {
      const t = (ratio - a.ratio) / (b.ratio - a.ratio);
      return a[valueKey] + t * (b[valueKey] - a[valueKey]);
    }
  }
  return 1.0;
}

/**
 * Calcul F_h (factor streașină / overhang).
 * @param {number} overhang_cm   — adâncime streașină [cm]
 * @param {number} winHeight_m   — înălțime fereastră [m]
 * @param {string} orientation   — orientare fereastră (S, SE, E, etc.)
 * @returns {number} F_h ∈ [0, 1]
 */
export function calcFshOverhang(overhang_cm, winHeight_m, orientation = "S") {
  const d_m = (parseFloat(overhang_cm) || 0) / 100;
  const h = parseFloat(winHeight_m);
  if (!h || h <= 0) return 1.0;
  if (d_m <= 0) return 1.0;
  const ratio = d_m / h;
  const fhBase = interpolate(F_H_TABLE, ratio, "fh");
  const orientScale = ORIENT_SCALE_OVERHANG[orientation] ?? 1.0;
  // Pentru orientări nordice streașina are efect redus: F_h ajustat spre 1.0
  const fhAdjusted = 1.0 - (1.0 - fhBase) * orientScale;
  return Math.max(0, Math.min(1.0, Math.round(fhAdjusted * 1000) / 1000));
}

/**
 * Calcul F_f (factor aripi laterale / fins).
 * @param {number} fin_cm      — adâncime aripi laterale [cm]
 * @param {number} winWidth_m  — lățime fereastră [m]
 * @returns {number} F_f ∈ [0, 1]
 */
export function calcFshFin(fin_cm, winWidth_m) {
  const d_m = (parseFloat(fin_cm) || 0) / 100;
  const w = parseFloat(winWidth_m);
  if (!w || w <= 0) return 1.0;
  if (d_m <= 0) return 1.0;
  const ratio = d_m / w;
  const ff = interpolate(F_F_TABLE, ratio, "ff");
  return Math.max(0, Math.min(1.0, Math.round(ff * 1000) / 1000));
}

/**
 * Factor protecție solară mobilă (obloane/rulouri/screen).
 * @param {boolean|string} hasMobile — true dacă există protecție mobilă activabilă
 * @returns {number} 0.5 dacă există, 1.0 altfel
 */
export function calcFshMobile(hasMobile) {
  const active = hasMobile === true || hasMobile === "true" || hasMobile === 1 || hasMobile === "da";
  return active ? 0.5 : 1.0;
}

/**
 * Estimare dimensiuni fereastră (H × W) din suprafață dacă nu sunt specificate explicit.
 * Presupune raport H/W ≈ 1.4 (tipic pentru ferestre verticale rezidențiale).
 * @param {number} area_m2
 * @returns {{ height: number, width: number }}
 */
export function inferWindowDims(area_m2) {
  const a = parseFloat(area_m2) || 0;
  if (a <= 0) return { height: 1.2, width: 0.9 };
  // H/W = 1.4 → H = sqrt(1.4 * A), W = A / H
  const height = Math.sqrt(1.4 * a);
  const width = a / height;
  return { height, width };
}

/**
 * Calcul F_sh complet pentru un element vitrat.
 * Aplicabil atât la vara (reducere Q_sol_cooling) cât și la iarna (reducere Q_sol_heating).
 *
 * @param {object} el — element vitrat cu opțional { shading }
 *   shading = {
 *     overhang_cm:     adâncime streașină [cm],
 *     fin_cm:          adâncime aripi [cm],
 *     hasMobile:       există obloane/rulouri,
 *     height_m:        override înălțime fereastră [m],
 *     width_m:         override lățime fereastră [m]
 *   }
 * @returns {{ fsh: number, fh: number, ff: number, fm: number, reference: string }}
 */
export function calcFsh(el) {
  const sh = el?.shading || {};
  const dims = (sh.height_m && sh.width_m)
    ? { height: parseFloat(sh.height_m), width: parseFloat(sh.width_m) }
    : inferWindowDims(el?.area);
  const fh = calcFshOverhang(sh.overhang_cm, dims.height, el?.orientation || "S");
  const ff = calcFshFin(sh.fin_cm, dims.width);
  const fm = calcFshMobile(sh.hasMobile);
  const fsh = Math.max(0, Math.min(1, fh * ff * fm));
  return {
    fsh: Math.round(fsh * 1000) / 1000,
    fh, ff, fm,
    dims,
    reference: "Mc 001-2022 Anexa E + SR EN ISO 52016-1 §6.5.4",
  };
}
