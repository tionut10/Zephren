/**
 * glazingCalc.js — Funcții pure extrase din WizardGlazing.jsx.
 * Fără dependențe React — importabil direct în teste Vitest.
 *
 * Formula U total = U_vitraj*(1-fr) + U_ramă*fr + ΔU_spacer  (ISO 10077-1)
 */

// ── Baze de date vitraj / ramă ─────────────────────────────────────────────
export const GLAZING_DB = [
  { name: "Simplu vitraj",                u: 5.80, g: 0.85, icon: "⬜", desc: "Vechi / ne-izolant — renovare urgentă recomandată" },
  { name: "Dublu vitraj (4-12-4)",        u: 2.80, g: 0.75, icon: "🟦", desc: "Standard anii '90 — nu atinge nZEB" },
  { name: "Dublu vitraj termoizolant",    u: 1.60, g: 0.65, icon: "🟦", desc: "Minim acceptabil renovare" },
  { name: "Dublu vitraj Low-E",           u: 1.10, g: 0.50, icon: "🟩", desc: "Atinge nZEB rezidențial (U ≤ 1.11)" },
  { name: "Triplu vitraj",                u: 0.90, g: 0.50, icon: "🟩", desc: "Nou rezidențial — performanță bună" },
  { name: "Triplu vitraj Low-E",          u: 0.70, g: 0.45, icon: "🟩", desc: "Premium — clădiri pasive" },
  { name: "Triplu vitraj 2×Low-E",        u: 0.50, g: 0.40, icon: "🟩", desc: "Top performanță — casa pasivă" },
];

export const FRAME_DB = [
  { name: "PVC (5 camere)",       u: 1.30, icon: "◽", desc: "Cel mai folosit — raport bun preț/performanță" },
  { name: "PVC (6-7 camere)",     u: 1.10, icon: "◽", desc: "Premium PVC — nZEB-ready" },
  { name: "Lemn stratificat",     u: 1.40, icon: "🟫", desc: "Estetic — întreținere periodică" },
  { name: "Aluminiu fără RPT",    u: 5.00, icon: "▫️", desc: "NU folosi în climă rece — punte termică majoră" },
  { name: "Aluminiu cu RPT",      u: 2.00, icon: "▫️", desc: "Acceptabil — RPT = ruperea punții termice" },
  { name: "Lemn-aluminiu",        u: 1.20, icon: "🟫", desc: "Premium combo — lemn interior, aluminiu exterior" },
];

// ── U_REF vitraj (Mc 001-2022) ────────────────────────────────────────────
export const U_REF_GLAZING = { nzeb_res: 1.11, nzeb_nres: 1.20, renov: 1.20, door: 1.30 };

/**
 * Returnează U_ref nZEB pentru vitraj/ușă vitrată.
 * @param {string}  category - Categoria clădirii (RI, RC, RA = rezidențial)
 * @param {boolean} isDoor   - True dacă e ușă vitrată
 * @returns {number}
 */
export function getURefGlazing(category, isDoor) {
  if (isDoor) return U_REF_GLAZING.door;
  return ["RI", "RC", "RA"].includes(category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
}

/**
 * Calculează U total fereastră (ISO 10077-1).
 * U_total = U_vitraj*(1-fr) + U_ramă*fr + ψ_spacer*P_sticlă/A
 *
 * @param {string} glazingName  - Numele din GLAZING_DB
 * @param {string} frameName    - Numele din FRAME_DB
 * @param {number|string} frameRatio - Fracție ramă în % (ex: 30 pentru 30%)
 * @param {number|string} area  - Suprafața totală în m²
 * @returns {{ u: number, g: number, uGlass: number, uFrame: number, deltaUSpacer: number }}
 */
export function computeUTotal(glazingName, frameName, frameRatio, area) {
  const gl = GLAZING_DB.find(g => g.name === glazingName);
  const fr = FRAME_DB.find(f => f.name === frameName);
  if (!gl || !fr) return { u: 0, g: 0, uFrame: 0, deltaUSpacer: 0 };

  const fRatio = (parseFloat(frameRatio) || 30) / 100;
  const a = Math.max(parseFloat(area) || 1, 0.5);
  const aspect = Math.sqrt(a);
  const perimGlass = aspect > 0 ? 2 * (aspect + aspect * 0.7) : 4;
  const psiSpacer = fr.name?.includes("Aluminiu") ? 0.08 : 0.04;
  const deltaUSpacer = a > 0 ? psiSpacer * perimGlass / a : 0;
  const uTotal = gl.u * (1 - fRatio) + fr.u * fRatio + deltaUSpacer;
  const gEff = gl.g * (1 - fRatio);

  return {
    u: uTotal,
    g: gEff,
    uFrame: fr.u,
    uGlass: gl.u,
    deltaUSpacer,
  };
}
