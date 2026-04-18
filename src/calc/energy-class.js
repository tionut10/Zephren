/**
 * energy-class.js — Clasificarea energetică A+..G cu suport versioning EPBD 2024.
 *
 * Sprint P1-3 (18 apr 2026) — pregătire pentru rescalarea A–G impusă de
 * Directiva EPBD 2024/1275 Art. 19 (transpunere RO în curs, termen 29 mai 2026).
 *
 * IDEEA:
 *   Până la publicarea pragurilor oficiale MDLPA, păstrăm scala actuală
 *   (ord. 16/2023 → Mc 001-2022). Când apar valorile noi (presumbil ZEB=A în 2030),
 *   va fi suficient să completăm `THRESHOLDS_BY_VERSION.epbd_2024` și să activăm
 *   flag-ul `useEPBD2024Thresholds`.
 *
 * ZERO BREAKING CHANGES:
 *   - classifyEnergyClass() apelat fără `version` folosește "ord16_2023" implicit.
 *   - Fișierul existent src/calc/classification.js nu e modificat.
 *   - Nu expunem flag-ul useEPBD2024Thresholds decât după ce MDLPA publică pragurile.
 */

import { ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS } from "../data/energy-classes.js";
import { FLAGS, isFeatureEnabled } from "../config/featureFlags.js";

/**
 * THRESHOLDS_BY_VERSION — praguri [kWh/(m²·an)] pe clasă energetică,
 * indexate pe versiunea de scală.
 *
 * Structura: { [version]: { [categoryKey]: number[] } }
 * Fiecare array conține 7 praguri (A+ · A · B · C · D · E · F). G = peste F.
 *
 * Sursele:
 *   - ord16_2023: Mc 001-2022 Cap. 5, tabele 5.1–5.14 (oficial).
 *   - epbd_2024:  PLACEHOLDER — valori de completat după publicare MDLPA.
 *                 Ipoteze provizorii bazate pe Art. 19 EPBD 2024:
 *                   • ZEB = A (clasă rezervată clădirilor zero-emission)
 *                   • Scala se shiftează cu 1 poziție (A→B, B→C etc.)
 *                   • Threshold A ≈ 0.7 × threshold A+ actual (aproximativ)
 *                 NU FOLOSIȚI în producție până la confirmare oficială.
 */
export const THRESHOLDS_BY_VERSION = Object.freeze({
  ord16_2023: Object.freeze({
    RI_cool:    Object.freeze([91,  129, 257, 390, 522, 652, 783]),
    RI_nocool:  Object.freeze([78,  110, 220, 340, 460, 575, 690]),
    RC_cool:    Object.freeze([73,  101, 198, 297, 396, 495, 595]),
    RC_nocool:  Object.freeze([60,   84, 168, 260, 352, 440, 528]),
    RA_cool:    Object.freeze([73,  101, 198, 297, 396, 495, 595]),
    RA_nocool:  Object.freeze([60,   84, 168, 260, 352, 440, 528]),
    BI:         Object.freeze([68,   97, 193, 302, 410, 511, 614]),
    ED:         Object.freeze([48,   68, 135, 246, 358, 447, 536]),
    SA:         Object.freeze([117, 165, 331, 501, 671, 838, 1005]),
    HC:         Object.freeze([67,   93, 188, 321, 452, 565, 678]),
    CO:         Object.freeze([88,  124, 248, 320, 393, 492, 591]),
    SP:         Object.freeze([75,  104, 206, 350, 494, 617, 741]),
    AL:         Object.freeze([68,   97, 193, 302, 410, 511, 614]),
  }),

  // PLACEHOLDER EPBD 2024/1275 Art. 19 — de actualizat după transpunere RO
  // (termen 29 mai 2026). Până atunci NU activați flag-ul `useEPBD2024Thresholds`.
  epbd_2024: Object.freeze({
    RI_cool:    Object.freeze([64,   91, 129, 257, 390, 522, 652]),
    RI_nocool:  Object.freeze([55,   78, 110, 220, 340, 460, 575]),
    RC_cool:    Object.freeze([51,   73, 101, 198, 297, 396, 495]),
    RC_nocool:  Object.freeze([42,   60,  84, 168, 260, 352, 440]),
    RA_cool:    Object.freeze([51,   73, 101, 198, 297, 396, 495]),
    RA_nocool:  Object.freeze([42,   60,  84, 168, 260, 352, 440]),
    BI:         Object.freeze([48,   68,  97, 193, 302, 410, 511]),
    ED:         Object.freeze([34,   48,  68, 135, 246, 358, 447]),
    SA:         Object.freeze([82,  117, 165, 331, 501, 671, 838]),
    HC:         Object.freeze([47,   67,  93, 188, 321, 452, 565]),
    CO:         Object.freeze([62,   88, 124, 248, 320, 393, 492]),
    SP:         Object.freeze([53,   75, 104, 206, 350, 494, 617]),
    AL:         Object.freeze([48,   68,  97, 193, 302, 410, 511]),
  }),
});

/**
 * VERSIONS — metadate pentru versiunile de scală suportate.
 */
export const VERSIONS = Object.freeze({
  ord16_2023: Object.freeze({
    id:          "ord16_2023",
    label:       "Ord. MDLPA 16/2023 (Mc 001-2022)",
    description: "Scala actuală România — 8 clase A+..G.",
    effective:   "2023-07-15",
    classes:     CLASS_LABELS, // ["A+","A","B","C","D","E","F","G"]
    zebClass:    null,
  }),
  epbd_2024: Object.freeze({
    id:          "epbd_2024",
    label:       "EPBD 2024/1275 rescalat (ZEB = A)",
    description: "Scală EPBD 2024 Art. 19 — A rezervată ZEB, clasele shiftate.",
    effective:   "2030-01-01", // aproximativ, conform EPBD
    classes:     ["A", "B", "C", "D", "E", "F", "G"],
    zebClass:    "A",
    warning:     "PLACEHOLDER — praguri provizorii până la transpunere oficială RO.",
  }),
});

/**
 * DEFAULT_VERSION — scala folosită când apelul nu specifică `version`.
 * Păstrat pe ord16_2023 până la decizia explicită de trecere la epbd_2024.
 */
export const DEFAULT_VERSION = "ord16_2023";

/**
 * Returnează versiunea efectivă curentă, ținând cont de feature flag.
 * @returns {"ord16_2023"|"epbd_2024"}
 */
export function getCurrentVersion() {
  try {
    if (isFeatureEnabled(FLAGS.EPBD_2024_THRESHOLDS)) return "epbd_2024";
  } catch {
    // featureFlags indisponibil (ex: test Node fără window) → default
  }
  return DEFAULT_VERSION;
}

/**
 * Clasifică un consum EP [kWh/(m²·an)] pentru o categorie de clădire.
 *
 * @param {number} epKwhM2       — consumul de energie primară
 * @param {string} categoryKey   — cheia din THRESHOLDS_BY_VERSION (ex: "RI_nocool")
 * @param {string} [version]     — "ord16_2023" (default) sau "epbd_2024"
 * @returns {{ cls: string, idx: number, score: number, color: string, version: string }}
 */
export function classifyEnergyClass(epKwhM2, categoryKey, version = DEFAULT_VERSION) {
  const v = THRESHOLDS_BY_VERSION[version] ? version : DEFAULT_VERSION;
  const table = THRESHOLDS_BY_VERSION[v];
  const thresholds = table?.[categoryKey];

  if (!Array.isArray(thresholds) || thresholds.length !== 7) {
    return { cls: "—", idx: -1, score: 0, color: "#666666", version: v };
  }

  // Pentru versiunea epbd_2024, clasele sunt fără A+ (doar A..G) — shift cu 1.
  const labels = VERSIONS[v]?.classes || CLASS_LABELS;
  const colors = CLASS_COLORS; // păstrăm paleta actuală — urmează rebranding când MDLPA publică

  for (let i = 0; i < thresholds.length; i++) {
    if (epKwhM2 <= thresholds[i]) {
      const low  = i === 0 ? 0 : thresholds[i - 1];
      const high = thresholds[i];
      const pctInBand = high > low ? (epKwhM2 - low) / (high - low) : 0;
      const score = Math.round(100 - (i * (100 / 8)) - pctInBand * (100 / 8));
      return {
        cls:     labels[i] || CLASS_LABELS[i],
        idx:     i,
        score:   Math.max(1, Math.min(100, score)),
        color:   colors[i],
        version: v,
      };
    }
  }

  // Peste ultimul prag → G
  return {
    cls:     labels[labels.length - 1] || "G",
    idx:     7,
    score:   1,
    color:   colors[7],
    version: v,
  };
}

/**
 * Sugar helper — clasifică folosind versiunea curentă (feature flag).
 */
export function classifyEnergyClassAuto(epKwhM2, categoryKey) {
  return classifyEnergyClass(epKwhM2, categoryKey, getCurrentVersion());
}

// Re-export pentru consumatori care folosesc funcția originală fără versiuni —
// păstrează comportamentul legacy intact.
export { getEnergyClass } from "./classification.js";
