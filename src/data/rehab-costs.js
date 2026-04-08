/**
 * rehab-costs.js — Prețuri orientative reabilitare energetică [EUR/m²]
 * Sursa: MDLPA, INS, oferte piață 2025-2026
 */

export const ZONE_COLORS = { I:"#22c55e", II:"#eab308", III:"#f97316", IV:"#ef4444", V:"#7c3aed" };

export const REHAB_COSTS = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  hpPerKw: 900,
  solarThPerM2: 380,
};

export const REHAB_COSTS_2025 = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  pvPerKwp: 1100,
  hpAerApa: 900,
  hpSolApa: 1400,
  solarThPerM2: 380,
  bmsSimple: 2000, bmsComplex: 8000,
  evCharger: 1500,
};
