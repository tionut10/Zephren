/**
 * opaque.js — Calcul rezistență termică și transmitanță elemente opace
 * Referințe: ISO 6946:2017, Mc 001-2022 Tabel 2.19 (ΔU'')
 */

import { ELEMENT_TYPES } from "../data/building-catalog.js";

// ═══════════════════════════════════════════════════════════════
// TIPURI FIXĂRI MECANICE — ISO 6946:2017 Annex F + Mc 001-2022 Tabel 2.19
// ═══════════════════════════════════════════════════════════════
// α = factor de corecție: 0.8 (fixare traversantă complet), 0.8 (diblu cu cap),
//     0.6 (diblu cu cap acoperit de izolație suplimentară)
// λ_f = conductivitate termică a fixării [W/(m·K)]
// A_f = secțiune transversală a fixării [m²] (diametru 8-12 mm → π×d²/4)
// n_f_default = densitate implicită fixări [buc/m²]
// ═══════════════════════════════════════════════════════════════
export const FASTENER_TYPES = {
  none:           { label: "Fără fixări mecanice (lipire integrală)",
                    alpha: 0, lambda_f: 0, A_f: 0, n_f_default: 0, deltaU_flat: 0.00 },
  plastic_cap:    { label: "Diblu plastic cu cap (Ø8 mm, EPS/MW standard)",
                    alpha: 0.8, lambda_f: 0.30, A_f: 50.3e-6, n_f_default: 6, deltaU_flat: 0.02 },
  plastic_recessed:{ label: "Diblu plastic cu cap înecat (acoperit ≥20 mm izolație)",
                    alpha: 0.6, lambda_f: 0.30, A_f: 50.3e-6, n_f_default: 6, deltaU_flat: 0.01 },
  metal_pin:      { label: "Diblu cu tijă metalică (Ø10 mm, oțel galvanizat)",
                    alpha: 0.8, lambda_f: 17.0, A_f: 78.5e-6, n_f_default: 6, deltaU_flat: 0.04 },
  metal_pin_thermal:{ label: "Diblu cu tijă metalică și rupere punte termică",
                    alpha: 0.8, lambda_f: 4.0, A_f: 78.5e-6, n_f_default: 6, deltaU_flat: 0.03 },
  steel_bracket:  { label: "Consolă metalică oțel (fațadă ventilată, Ø12 mm)",
                    alpha: 0.8, lambda_f: 50.0, A_f: 113.1e-6, n_f_default: 3, deltaU_flat: 0.06 },
  steel_bracket_thermal:{ label: "Consolă metalică cu izolator termic (fațadă ventilată)",
                    alpha: 0.8, lambda_f: 10.0, A_f: 113.1e-6, n_f_default: 3, deltaU_flat: 0.04 },
  chemical_anchor:{ label: "Ancorare chimică (rășină epoxidică, fără punte termică)",
                    alpha: 0.8, lambda_f: 0.50, A_f: 50.3e-6, n_f_default: 4, deltaU_flat: 0.00 },
  default:        { label: "Fixare standard (estimare conservatoare Mc 001-2022)",
                    alpha: 0.8, lambda_f: 17.0, A_f: 78.5e-6, n_f_default: 6, deltaU_flat: 0.04 },
};

/**
 * Calculează corecția ΔU'' pentru fixări mecanice conform ISO 6946:2017 Annex F
 *
 * Formula exactă: ΔU = α × λ_f × A_f × n_f / d_ins
 * Dacă nu sunt date parametrii detaliați, folosește valoarea forfetară per tip.
 *
 * @param {string} fastenerType - Cod tip fixare din FASTENER_TYPES
 * @param {number} [d_ins]      - Grosime izolație [m] (opțional, pentru calcul exact)
 * @param {number} [n_f]        - Nr. fixări pe m² (opțional, default din FASTENER_TYPES)
 * @returns {{ deltaU, method, fastenerLabel }}
 */
export function calcDeltaU(fastenerType, d_ins, n_f) {
  const ft = FASTENER_TYPES[fastenerType] || FASTENER_TYPES.default;

  if (ft.alpha === 0) {
    return { deltaU: 0, method: "fără fixări mecanice", fastenerLabel: ft.label };
  }

  const nf = n_f || ft.n_f_default;

  // Dacă avem grosimea izolației → calcul exact ISO 6946 Annex F
  if (d_ins && d_ins > 0) {
    const deltaU_exact = ft.alpha * ft.lambda_f * ft.A_f * nf / d_ins;
    // Cap la 0.15 W/(m²·K) — peste această valoare fixarea este structural neadecvată
    const deltaU = Math.min(0.15, Math.round(deltaU_exact * 1000) / 1000);
    return { deltaU, method: "ISO 6946:2017 Annex F (calcul exact)", fastenerLabel: ft.label };
  }

  // Fără grosime izolație → valoare forfetară per tip
  return { deltaU: ft.deltaU_flat, method: "ISO 6946:2017 Tabel 7 (valoare forfetară)", fastenerLabel: ft.label };
}

/**
 * Calculează R și U pentru un element opac stratificat.
 * @param {Array} layers - Straturi cu { thickness (mm), lambda (W/(m·K)), rho (kg/m³) }
 * @param {string} elementType - Cod tip element: PE, PT, PP, PL, PB etc.
 * @param {Object} [fastenerOpts] - Opțional: { type, n_f } pentru calcul ΔU'' detaliat
 * @returns {{ r_layers, r_total, u, u_base, deltaU, deltaU_method, fastenerLabel }}
 */
export function calcOpaqueR(layers, elementType, fastenerOpts) {
  if (!layers || !layers.length) return { r_layers: 0, r_total: 0.17, u: 5.88, u_base: 5.88, deltaU: 0, deltaU_method: "n/a", fastenerLabel: "n/a" };

  const elType = ELEMENT_TYPES.find(e => e.id === elementType);
  const rsi = elType?.rsi ?? 0.13;
  const rse = elType?.rse ?? 0.04;

  // Rezistența termică a straturilor
  const r_layers = layers.reduce((r, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000; // mm → m
    const lambda = parseFloat(l.lambda) || 1;
    return r + (d > 0 && lambda > 0 ? d / lambda : 0);
  }, 0);

  const r_total = rsi + r_layers + rse;

  // U de bază (fără corecție)
  const u_base = r_total > 0 ? 1 / r_total : 5.88;

  // ── Corecție ΔU'' conform ISO 6946:2017 Annex F / Mc 001-2022 Tabel 2.19 ──
  // Aplicabilă doar dacă există strat izolant (λ < 0.06 W/(m·K))
  const hasInsulation = layers.some(l => (parseFloat(l.lambda) || 1) < 0.06);

  let deltaU = 0;
  let deltaU_method = "fără izolație — ΔU'' = 0";
  let fastenerLabel = "n/a";

  if (hasInsulation) {
    // Grosime totală izolație [m] (pentru calcul exact Annex F)
    const d_ins = layers.reduce((sum, l) => {
      const lam = parseFloat(l.lambda) || 1;
      if (lam < 0.06) sum += (parseFloat(l.thickness) || 0) / 1000;
      return sum;
    }, 0);

    const fastenerType = fastenerOpts?.type || "default";
    const n_f = fastenerOpts?.n_f;
    const result = calcDeltaU(fastenerType, d_ins, n_f);
    deltaU = result.deltaU;
    deltaU_method = result.method;
    fastenerLabel = result.fastenerLabel;
  }

  const u = u_base + deltaU;

  return {
    r_layers: Math.round(r_layers * 1000) / 1000,
    r_total: Math.round(r_total * 1000) / 1000,
    u: Math.round(u * 1000) / 1000,
    u_base: Math.round(u_base * 1000) / 1000,
    deltaU,
    deltaU_method,
    fastenerLabel,
  };
}
