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
// Ferestre: nZEB rez 1.11, nZEB nerez 1.20, renovare 1.20, uși vitrate 1.30, uși opace 1.80
// Sprint v1.3 (16 mai 2026) — adăugat `opaque_door: 1.80` (Mc 001-2022 Anexa F + Tab 2.5)
// pentru a corecta calculul U'max nZEB pentru uși exterioare opace (g=0). Anterior modal
// arăta 1.20 (prag fereastră) pentru orice ușă, indiferent de zona vitrată — bug confirmat
// în screenshot user 16 mai 2026.
//
// Surse:
//   - Mc 001-2022 §4.5 Tabel 2.5: "Uși exterioare opace, intrare principală" U_max = 1.80 W/m²K
//   - Mc 001-2022 §4.5 Tabel 2.5: "Uși exterioare vitrate (≥50% vitraj)" U_max = 1.30 W/m²K
//   - Mc 001-2022 §4.5 Tabel 2.4 (nZEB rez): U_max ferestre = 1.11 W/m²K (Z1-Z3 mediată)
//   - Mc 001-2022 §4.5 Tabel 2.7 (nZEB nerez): U_max ferestre = 1.20 W/m²K
export const U_REF_GLAZING = {
  nzeb_res: 1.11,      // Fereastră în clădire rezidențială nZEB
  nzeb_nres: 1.20,     // Fereastră în clădire nerezidențială nZEB
  renov: 1.20,         // Renovare majoră (rez + nerez)
  door: 1.30,          // Ușă exterioară VITRATĂ (≥50% vitraj, g>0)
  opaque_door: 1.80,   // Ușă exterioară OPACĂ (g=0, fără vitraj sau ochi <10%)
};

/**
 * Rezolvă pragul U'max pentru un element vitrat conform Mc 001-2022 §4.5.
 * Distinge fereastră/ușă-vitrată/ușă-opacă × rezidențial/nerezidențial × nzeb/renovare.
 *
 * @param {Object} opts
 * @param {string} opts.elementCategory - "window" | "door" | "skylight" | "curtainwall"
 * @param {string} opts.buildingCategory - "RI" | "RC" | "RA" | "BI" | ...
 * @param {number} opts.gValue - factor solar g [0..1]; pentru ușă, g=0 ⇒ opacă, g>0 ⇒ vitrată
 * @param {string} [opts.scope="nzeb"] - "nzeb" | "renov" — context construcție/renovare
 * @returns {number} prag U_max în W/(m²·K)
 */
export function getURefGlazingFor(opts = {}) {
  const { elementCategory = "window", buildingCategory = "RI", gValue = 0, scope = "nzeb" } = opts;
  const isRes = ["RI", "RC", "RA"].includes(buildingCategory);

  // Uși: distincție g=0 (opacă) vs g>0 (vitrată)
  if (elementCategory === "door") {
    if (gValue <= 0.05) return U_REF_GLAZING.opaque_door; // 1.80 — toleranță 5% pentru micro-ochi
    return U_REF_GLAZING.door; // 1.30 — uși vitrate (≥50% sticlă)
  }

  // Skylight: același prag ca fereastră (Mc 001-2022 Tab 2.5)
  // Curtainwall: pragul fereastră dar cu corecție +0.10 ψ_spacer (SR EN 13830)
  // Window: nZEB rez/nres vs renovare
  if (scope === "renov") return U_REF_GLAZING.renov;
  return isRes ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
}

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
// Sprint 27 P2.5 — ZEB_FACTOR 0.9 conform EPBD 2024/1275 Art. 11:
// ZEB = clădire cu emisii zero la fața locului ȘI ep ≤ 90% din pragul nZEB.
// Anterior 1.0 era prea permisiv (ep_max identic cu nZEB → orice nZEB ar fi ZEB).
export const ZEB_FACTOR = 0.9;

// ═══════════════════════════════════════════════════════════════════════════
// nZEB EP fallback per categorie (Mc 001-2022)
// ═══════════════════════════════════════════════════════════════════════════
// Audit 2 mai 2026 — P1.10: înlocuiește hardcoded `|| 148` din docx-data-mapper
// + Step6Certificate. Valoarea 148 era arbitrară (folosită fără sursă documentată).
// Aceste fallback-uri sunt orientative — derivate din Mc 001-2022 Tabel 5.x prin
// medie a pragurilor nZEB pe zone climatice (pentru când zona nu e cunoscută).
//
// Folosit DOAR ca ultim resort, când `getNzebEpMax(cat, climateZone)` returnează
// undefined (zonă lipsă, categorie nestandard etc.).
//
// Surse: Mc 001-2022 Partea III §5.4 (clădiri rezidențiale + nerezidențiale),
// HG 1593/2022 (modif. HG 1455/2022) — actualizare praguri nZEB.
export const NZEB_EP_FALLBACK = Object.freeze({
  RI: 105,  // Locuință individuală
  RC: 110,  // Locuință colectivă (bloc)
  RA: 105,  // Apartament din bloc (similar RI)
  BI: 130,  // Birou
  ED: 150,  // Educație (școală/grădiniță)
  SA: 145,  // Sănătate (spital/cabinet)
  HC: 145,  // Hotel/cazare
  CO: 130,  // Comercial (magazin/mall)
  SP: 145,  // Sport (sală/bazin)
  AL: 175,  // Altele (clădiri specializate — fallback conservator)
});

/**
 * Helper centralizat pentru obținerea pragului nZEB EP cu fallback documentat.
 * @param {string} category — codul categoriei (RI/RC/RA/BI/ED/SA/HC/CO/SP/AL/...)
 * @param {Function} [getNzebEpMaxFn] — funcția existentă din smart-rehab.js
 * @param {string} [climateZone]
 * @returns {number} prag EP în kWh/(m²·an)
 */
export function getNzebEpMaxWithFallback(category, getNzebEpMaxFn, climateZone) {
  if (typeof getNzebEpMaxFn === "function") {
    const v = getNzebEpMaxFn(category, climateZone);
    if (Number.isFinite(v) && v > 0) return v;
  }
  // Fallback documentat per categorie; fallback final 175 (categorii AL).
  return NZEB_EP_FALLBACK[category] || NZEB_EP_FALLBACK.AL;
}

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

