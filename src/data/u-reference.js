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

// ═══════════════════════════════════════════════════════════════════════════
// FACTORI ENERGIE PRIMARĂ ELECTRICITATE — SEN România
// ═══════════════════════════════════════════════════════════════════════════
// Mc 001-2022 Tabel 5.17 (legacy):         fP_nren = 2.62, fP_ren = 0.00 → fP_tot = 2.62
// SR EN ISO 52000-1:2017/NA:2023 Tab A.16: fP_nren = 2.00, fP_ren = 0.50 → fP_tot = 2.50
//
// Sprint 11 (17 apr 2026) — migrare globală Tab A.16 (NA:2023) gated pe flag `useNA2023`
// Licență ASRO TUNARU IONUȚ / Factură 148552 — valori confirmate din PDF original
// ═══════════════════════════════════════════════════════════════════════════

// Legacy — păstrat pentru compatibilitate retroactivă (flag useNA2023 = false)
export const FP_ELEC = 2.62;

// NA:2023 Tab A.16 — valori autoritare SR EN ISO 52000-1/NA:2023
export const FP_ELEC_NA2023_NREN = 2.00;
export const FP_ELEC_NA2023_REN = 0.50;
export const FP_ELEC_NA2023_TOT = 2.50;

// CO2 electricitate — neafectat de migrare (Tab A.16 păstrează 0.107 kg/kWh)
export const CO2_ELEC = 0.107;

/**
 * Factor electricitate fP_nren (nerecuperabilă) gated pe useNA2023.
 * @param {boolean} useNA2023 — true: Tab A.16 (2.00), false: Tab 5.17 (2.62)
 */
export function getFPElecNren(useNA2023) {
  return useNA2023 ? FP_ELEC_NA2023_NREN : 2.62;
}

/**
 * Factor electricitate fP_ren (recuperabilă) gated pe useNA2023.
 * @param {boolean} useNA2023 — true: 0.50 (NA:2023 recunoaște partea RES din mix SEN), false: 0
 */
export function getFPElecRen(useNA2023) {
  return useNA2023 ? FP_ELEC_NA2023_REN : 0.00;
}

/**
 * Factor electricitate fP_tot = fP_nren + fP_ren.
 * @param {boolean} useNA2023
 */
export function getFPElecTot(useNA2023) {
  return useNA2023 ? FP_ELEC_NA2023_TOT : FP_ELEC;
}

// BACS — Building Automation & Control (EPBD Art.14)
// Sprint 5 (17 apr 2026): migrare EN 15232 → SR EN ISO 52120-1:2022.
// Sursă canonică: `src/calc/bacs-iso52120.js` (factori per categorie × sistem).
// Re-export aici pentru compatibilitate cu codul existent care importă
// BACS_CLASSES / BACS_OBLIGATION_THRESHOLD_KW din u-reference.js.
export {
  BACS_CLASSES,
  BACS_OBLIGATION_THRESHOLD_KW,
} from "../calc/bacs-iso52120.js";

