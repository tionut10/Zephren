/**
 * opaque.js — Calcul rezistență termică și transmitanță elemente opace
 * Referințe: ISO 6946:2017, Mc 001-2022 Tabel 2.19 (ΔU'')
 */

import { ELEMENT_TYPES } from "../data/building-catalog.js";

/**
 * Calculează R și U pentru un element opac stratificat.
 * @param {Array} layers - Straturi cu { thickness (mm), lambda (W/(m·K)), rho (kg/m³) }
 * @param {string} elementType - Cod tip element: PE, PT, PP, PL, PB etc.
 * @returns {{ r_layers, r_total, u, u_base, deltaU }}
 */
export function calcOpaqueR(layers, elementType) {
  if (!layers || !layers.length) return { r_layers: 0, r_total: 0.17, u: 5.88, u_base: 5.88, deltaU: 0 };

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

  // Corecție ΔU'' conform ISO 6946:2017 Tabel 7 / Mc 001-2022 Tabel 2.19
  // Elemente de fixare mecanică (dibluri) prin izolație: ΔU ≈ 0.04 W/(m²·K)
  // Aplicabilă doar dacă există strat izolant (λ < 0.06)
  const hasInsulation = layers.some(l => (parseFloat(l.lambda) || 1) < 0.06);
  const deltaU = hasInsulation ? 0.04 : 0;

  const u = u_base + deltaU;

  return {
    r_layers: Math.round(r_layers * 1000) / 1000,
    r_total: Math.round(r_total * 1000) / 1000,
    u: Math.round(u * 1000) / 1000,
    u_base: Math.round(u_base * 1000) / 1000,
    deltaU,
  };
}
