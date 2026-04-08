/**
 * u-reference.js — Tabele U de referință pentru verificare conformitate
 * Sursa: Mc 001-2022, EPBD 2024/1275, transpunere estimată România
 */

import { getEnergyClass } from "../calc/classification.js";

// Mc 001-2022 Tabel 2.4 — Clădiri REZIDENȚIALE nZEB noi
export const U_REF_NZEB_RES = { PE:0.25, PR:0.67, PS:0.29, PT:0.15, PP:0.15, PB:0.29, PI:null, PL:0.20, SE:0.20 };
// Tabel 2.7 — Clădiri NEREZIDENȚIALE nZEB noi
export const U_REF_NZEB_NRES = { PE:0.33, PR:0.80, PS:0.35, PT:0.17, PP:0.17, PB:0.35, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10a — Renovare majoră clădiri rezidențiale
export const U_REF_RENOV_RES = { PE:0.33, PR:0.90, PS:0.35, PT:0.20, PP:0.20, PB:0.40, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10b — Renovare majoră clădiri nerezidențiale
export const U_REF_RENOV_NRES = { PE:0.40, PR:1.00, PS:0.40, PT:0.22, PP:0.22, PB:0.45, PI:null, PL:0.25, SE:0.25 };
// Ferestre: nZEB rez 1.11, nZEB nerez 1.20, renovare 1.20, uși ext 1.30
export const U_REF_GLAZING = { nzeb_res:1.11, nzeb_nres:1.20, renov:1.20, door:1.30 };

// Legacy aliases
export const U_REF_NZEB = U_REF_NZEB_RES;
export const U_REF_RENOV = U_REF_RENOV_RES;

export function getURefNZEB(category, elementType) {
  const isRes = ["RI","RC","RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[elementType] !== undefined ? ref[elementType] : null;
}

// EPBD 2024/1275 Art.16 — Rescalare A-G
export const EPBD_AG_ACTIVE = true;
export const EPBD_AG_THRESHOLDS = {
  RI: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 },
  RC: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 },
  RA: { A: 50, B: 75, C: 100, D: 150, E: 200, F: 300 },
  BI: { A: 60, B: 90, C: 120, D: 180, E: 250, F: 350 },
  ED: { A: 55, B: 80, C: 110, D: 160, E: 220, F: 320 },
  SA: { A: 80, B: 120, C: 160, D: 240, E: 330, F: 450 },
  HC: { A: 70, B: 105, C: 140, D: 210, E: 290, F: 400 },
  CO: { A: 65, B: 95, C: 130, D: 195, E: 270, F: 380 },
  SP: { A: 55, B: 85, C: 115, D: 170, E: 240, F: 340 },
  AL: { A: 65, B: 95, C: 130, D: 195, E: 270, F: 380 },
};

// ZEB (Zero Emission Building) — EPBD 2024/1275 Art.11
export const ZEB_THRESHOLDS = {
  RI: { ep_max: 50, rer_min: 80 },
  RC: { ep_max: 50, rer_min: 80 },
  RA: { ep_max: 50, rer_min: 80 },
  BI: { ep_max: 60, rer_min: 80 },
  ED: { ep_max: 55, rer_min: 80 },
  SA: { ep_max: 80, rer_min: 80 },
  HC: { ep_max: 70, rer_min: 80 },
  CO: { ep_max: 65, rer_min: 80 },
  SP: { ep_max: 55, rer_min: 80 },
  AL: { ep_max: 65, rer_min: 80 },
};
export const ZEB_FACTOR = 1.0;

// Factor energie primară electricitate din rețea SEN România
export const FP_ELEC = 2.62;

// BACS — Building Automation & Control (EPBD Art.14)
export const BACS_CLASSES = {
  A: { label:"A — Înalt performant", factor:0.70, desc:"Automatizare avansată cu optimizare, monitoring continuu" },
  B: { label:"B — Avansat", factor:0.80, desc:"Automatizare pe zone, funcții de programare" },
  C: { label:"C — Standard", factor:0.90, desc:"Termostare de cameră, programare simplă" },
  D: { label:"D — Non-eficient", factor:1.00, desc:"Fără automatizare, reglaj manual" },
};
export const BACS_OBLIGATION_THRESHOLD_KW = 290;

export function getEnergyClassEPBD(epKwhM2, categoryKey) {
  if (!EPBD_AG_ACTIVE) return getEnergyClass(epKwhM2, categoryKey);
  const cat = categoryKey?.replace(/_cool|_nocool/g, "") || "RI";
  const t = EPBD_AG_THRESHOLDS[cat] || EPBD_AG_THRESHOLDS.RI;
  const classes = [
    { cls: "A", max: t.A }, { cls: "B", max: t.B }, { cls: "C", max: t.C },
    { cls: "D", max: t.D }, { cls: "E", max: t.E }, { cls: "F", max: t.F },
    { cls: "G", max: Infinity },
  ];
  const colors = { A:"#00a651", B:"#39b54a", C:"#8dc63f", D:"#ffc20e", E:"#f7941d", F:"#f15a24", G:"#ed1c24" };
  for (const c of classes) {
    if (epKwhM2 <= c.max) {
      return { cls: c.cls, color: colors[c.cls], score: Math.max(0, Math.round(100 - epKwhM2 / c.max * 100)) };
    }
  }
  return { cls: "G", color: colors.G, score: 0 };
}
