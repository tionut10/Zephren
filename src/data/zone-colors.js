/**
 * zone-colors.js — Culori UI pentru zone climatice România
 *
 * Sprint Audit Prețuri P4.6 (9 mai 2026) — extras din rehab-costs.js (acum eliminat)
 * pentru a separa concerns UI de prețuri reabilitare.
 *
 * Folosit pentru hartă proximitate auditori (energy-calc.jsx) și benchmark
 * climatice. Zonele I-V definite în SR 1907-1:1997 / Mc 001-2022.
 */

export const ZONE_COLORS = {
  I:   "#22c55e",  // verde — zonă caldă (litoral Constanța)
  II:  "#eab308",  // galben — zonă temperată
  III: "#f97316",  // portocaliu — zonă rece moderată (București, Iași)
  IV:  "#ef4444",  // roșu — zonă rece (Brașov, Cluj)
  V:   "#7c3aed",  // mov — zonă foarte rece montane (Sibiu, Predeal)
};
