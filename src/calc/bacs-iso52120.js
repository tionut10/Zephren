/**
 * bacs-iso52120.js — BACS Impact Factors conform SR EN ISO 52120-1:2022
 *
 * Înlocuiește EN 15232-1:2017 (arhivat aprilie 2022).
 * Metodologie: Tabel B.1 – B.12 (factori f_BAC pe categorii × sisteme × clase).
 *
 * Referințe:
 * - SR EN ISO 52120-1:2022 — Energy performance of buildings — Contribution of
 *   building automation, controls and building management — Part 1: Framework
 *   and procedures (ASRO, iulie 2022) — înlocuiește EN 15232-1:2017.
 * - EPBD 2024/1275 Art. 13, 14, 15 — BACS, SRI, Autoreglare.
 * - Legea 238/2024 (MO 714/22.07.2024) — transpunere RO, art. 13-14 — BACS
 *   minim clasa B obligatoriu pentru clădiri nerezidențiale cu HVAC > 290 kW
 *   până la 31.12.2024 (termen expirat la data 17 apr 2026).
 * - Reg. delegat (UE) 2020/2155 + Reg. de punere în aplicare (UE) 2020/2156 (SRI).
 * - Mc 001-2022 Partea III — categorii clădire RO (RI, RC, RA, BI, ED, SA, HC,
 *   CO, SP, AL, HO_LUX, MAG, MALL, SUPER, SPA_H, AER).
 *
 * Modul master: acest fișier este SURSA UNICĂ pentru factori f_BAC în Zephren.
 * - `u-reference.js::BACS_CLASSES` (scalar unic) — deprecated, redirected aici
 * - `epbd.js::BACS_ENERGY_FACTORS` (2 categorii) — deprecated, migrate aici
 * - `bacs-en15232.js` (15 funcții evaluare) — deprecated, shim aici
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. FACTORI f_BAC pe CATEGORIE × SISTEM × CLASĂ (ISO 52120-1:2022 Anexa B)
// ═════════════════════════════════════════════════════════════════════════════
//
// Structură: BACS_FACTORS_ISO52120[categorie][clasă] = { heating, cooling,
// dhw, ventilation, lighting }.
//
// Valori: factor de corecție multiplicativ aplicat la energia raw per sistem.
// Clasa C este referința (factor = 1.00 pe toate sistemele).
// Clasa A oferă economie (< 1.00), clasa D aduce penalizare (> 1.00).
// `lighting = null` pentru rezidențial — norma nu prevede control BACS iluminat
// ca factor distinct pentru locuințe.
//
// Sursa: ISO 52120-1:2022 Tab. B.1 (Residential), B.2 (Office), B.3 (Lecture
// halls / Educational), B.4 (Hospitals), B.5 (Hotels), B.6 (Restaurants),
// B.7 (Wholesale & retail), B.8 (Sports facilities), B.9 (Cultural), B.10
// (Light industrial / mixed-use).

export const BACS_FACTORS_ISO52120 = {
  // ── Rezidențial (RI + RC + RA) — Tab. B.1 ─────────────────────────────────
  rezidential: {
    A: { heating: 0.81, cooling: 0.82, dhw: 0.92, ventilation: 0.87, lighting: null },
    B: { heating: 0.88, cooling: 0.88, dhw: 0.95, ventilation: 0.93, lighting: null },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: null },
    D: { heating: 1.10, cooling: 1.10, dhw: 1.00, ventilation: 1.07, lighting: null },
  },
  // ── Birouri (BI + AD) — Tab. B.2 ──────────────────────────────────────────
  birouri: {
    A: { heating: 0.70, cooling: 0.57, dhw: 0.88, ventilation: 0.70, lighting: 0.70 },
    B: { heating: 0.80, cooling: 0.80, dhw: 0.95, ventilation: 0.85, lighting: 0.85 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.51, cooling: 1.60, dhw: 1.00, ventilation: 1.20, lighting: 1.10 },
  },
  // ── Educație (ED + SC) — Tab. B.3 ─────────────────────────────────────────
  educatie: {
    A: { heating: 0.80, cooling: 0.75, dhw: 0.90, ventilation: 0.75, lighting: 0.80 },
    B: { heating: 0.88, cooling: 0.85, dhw: 0.95, ventilation: 0.87, lighting: 0.88 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.20, cooling: 1.30, dhw: 1.00, ventilation: 1.25, lighting: 1.15 },
  },
  // ── Spitale + Sănătate (SA + HC + SPA_H) — Tab. B.4 ───────────────────────
  spitale: {
    A: { heating: 0.85, cooling: 0.80, dhw: 0.90, ventilation: 0.80, lighting: 0.85 },
    B: { heating: 0.90, cooling: 0.88, dhw: 0.95, ventilation: 0.88, lighting: 0.90 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.31, cooling: 1.35, dhw: 1.00, ventilation: 1.25, lighting: 1.15 },
  },
  // ── Hoteluri + Cazare (HO_LUX + HO) — Tab. B.5 ────────────────────────────
  hoteluri: {
    A: { heating: 0.68, cooling: 0.70, dhw: 0.90, ventilation: 0.75, lighting: 0.82 },
    B: { heating: 0.85, cooling: 0.85, dhw: 0.95, ventilation: 0.88, lighting: 0.90 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.25, cooling: 1.40, dhw: 1.05, ventilation: 1.20, lighting: 1.12 },
  },
  // ── Restaurante — Tab. B.6 ────────────────────────────────────────────────
  restaurante: {
    A: { heating: 0.76, cooling: 0.72, dhw: 0.88, ventilation: 0.72, lighting: 0.85 },
    B: { heating: 0.88, cooling: 0.85, dhw: 0.94, ventilation: 0.85, lighting: 0.90 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.31, cooling: 1.45, dhw: 1.05, ventilation: 1.30, lighting: 1.15 },
  },
  // ── Comerț / Retail (CO + MAG + MALL + SUPER) — Tab. B.7 ──────────────────
  comert: {
    A: { heating: 0.77, cooling: 0.65, dhw: 0.90, ventilation: 0.73, lighting: 0.75 },
    B: { heating: 0.85, cooling: 0.82, dhw: 0.95, ventilation: 0.85, lighting: 0.85 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.56, cooling: 1.55, dhw: 1.00, ventilation: 1.30, lighting: 1.20 },
  },
  // ── Sport (SP + FIT) — Tab. B.8 ───────────────────────────────────────────
  sport: {
    A: { heating: 0.80, cooling: 0.75, dhw: 0.85, ventilation: 0.78, lighting: 0.80 },
    B: { heating: 0.90, cooling: 0.88, dhw: 0.92, ventilation: 0.88, lighting: 0.88 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.22, cooling: 1.35, dhw: 1.02, ventilation: 1.20, lighting: 1.12 },
  },
  // ── Cultură / Spectacole (TEA + MUZ + CIN) — Tab. B.9 ─────────────────────
  cultura: {
    A: { heating: 0.82, cooling: 0.74, dhw: 0.92, ventilation: 0.75, lighting: 0.75 },
    B: { heating: 0.90, cooling: 0.86, dhw: 0.95, ventilation: 0.87, lighting: 0.85 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.25, cooling: 1.40, dhw: 1.02, ventilation: 1.25, lighting: 1.18 },
  },
  // ── Industrie ușoară / Mixt (AL + IND) — Tab. B.10 ────────────────────────
  industrial: {
    A: { heating: 0.85, cooling: 0.78, dhw: 0.92, ventilation: 0.80, lighting: 0.80 },
    B: { heating: 0.92, cooling: 0.88, dhw: 0.95, ventilation: 0.90, lighting: 0.88 },
    C: { heating: 1.00, cooling: 1.00, dhw: 1.00, ventilation: 1.00, lighting: 1.00 },
    D: { heating: 1.20, cooling: 1.30, dhw: 1.00, ventilation: 1.20, lighting: 1.12 },
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. DESCRIERI CLASE BACS (ISO 52120-1:2022 §4.2)
// ═════════════════════════════════════════════════════════════════════════════

export const BACS_CLASS_LABELS = {
  A: {
    label: "A — Înalt performant",
    shortLabel: "A",
    desc: "High-energy-performance BACS + TBM: MPC, demand response, integrare PV/stocare/EV",
    color: "#22c55e",
    ringColor: "ring-emerald-500/50",
    textColor: "text-emerald-400",
    economyPct: "25-40%",
  },
  B: {
    label: "B — Avansat",
    shortLabel: "B",
    desc: "Advanced BACS + unele funcții TBM: control zonal, programare, compensare climatică",
    color: "#84cc16",
    ringColor: "ring-green-500/50",
    textColor: "text-green-400",
    economyPct: "10-25%",
  },
  C: {
    label: "C — Standard (referință)",
    shortLabel: "C",
    desc: "Standard BACS: termostate de cameră, programare de bază, senzori prezență punctuali",
    color: "#eab308",
    ringColor: "ring-yellow-500/50",
    textColor: "text-yellow-400",
    economyPct: "0% (referință)",
  },
  D: {
    label: "D — Non-eficient",
    shortLabel: "D",
    desc: "Clădire fără automatizare electronică: reglaj manual, fără programare, fără senzori",
    color: "#ef4444",
    ringColor: "ring-red-500/50",
    textColor: "text-red-400",
    economyPct: "+10% până +56% (penalizare)",
  },
};

// Alias pentru backward compat cu cod care folosea `BACS_CLASSES` din u-reference.js.
// Folosește factor mediu heating/cooling birouri ca valoare "scalar" legacy.
export const BACS_CLASSES = {
  A: { label: BACS_CLASS_LABELS.A.label, factor: 0.70, desc: BACS_CLASS_LABELS.A.desc },
  B: { label: BACS_CLASS_LABELS.B.label, factor: 0.80, desc: BACS_CLASS_LABELS.B.desc },
  C: { label: BACS_CLASS_LABELS.C.label, factor: 1.00, desc: BACS_CLASS_LABELS.C.desc },
  D: { label: BACS_CLASS_LABELS.D.label, factor: 1.10, desc: BACS_CLASS_LABELS.D.desc },
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. MAPARE COD CATEGORIE MC 001 → CATEGORIE ISO 52120
// ═════════════════════════════════════════════════════════════════════════════

const CATEGORY_MAP_MC001_TO_ISO = {
  // Rezidențial
  RI: "rezidential", RC: "rezidential", RA: "rezidential",
  // Birouri + administrație
  BI: "birouri", AD: "birouri",
  // Educație
  ED: "educatie", SC: "educatie", UN: "educatie", GR: "educatie",
  // Spitale + sănătate
  SA: "spitale", HC: "spitale", CL: "spitale", SPA_H: "spitale",
  // Hoteluri + cazare
  HO_LUX: "hoteluri", HO: "hoteluri", HOS: "hoteluri",
  // Restaurante
  REST: "restaurante",
  // Comerț / retail
  CO: "comert", MAG: "comert", MALL: "comert", SUPER: "comert",
  // Sport + fitness
  SP: "sport", FIT: "sport",
  // Cultură + spectacole
  TEA: "cultura", MUZ: "cultura", CIN: "cultura", CUL: "cultura",
  // Industrie ușoară + mixt
  AL: "industrial", IND: "industrial", IU: "industrial", HAL: "industrial",
  // Aeroport (fallback birouri — tratat ca nerezidențial cu trafic intens)
  AER: "birouri",
};

/**
 * Mapează un cod de categorie Mc 001 (RI, BI, SA, …) la categoria ISO 52120.
 * Default-uri: rezidențial pentru coduri neidentificate dar cu prefix "R",
 *              birouri pentru restul.
 *
 * @param {string} code  — cod categorie Mc 001 (ex: "BI", "RC", "SA")
 * @returns {keyof typeof BACS_FACTORS_ISO52120}
 */
export function getBACSCategoryFromCode(code) {
  if (!code || typeof code !== "string") return "birouri";
  const mapped = CATEGORY_MAP_MC001_TO_ISO[code];
  if (mapped) return mapped;
  // Fallback pe prefix: R* = rezidențial, rest = birouri
  if (code.startsWith("R")) return "rezidential";
  return "birouri";
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. API PRINCIPAL — applyBACSFactor / calcBACSImpact
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Aplică factor f_BAC conform ISO 52120-1:2022 pe o valoare de energie raw.
 *
 * Formulă (ISO 52120-1:2022 §5.2):
 *   Q_corr = Q_raw × f_BAC(categorie, clasă, utilizare)
 *
 * @param {number} Q_raw           — energia raw [kWh/an] (înainte de BACS)
 * @param {"heating"|"cooling"|"dhw"|"ventilation"|"lighting"} utility
 * @param {string} categoryCode    — cod Mc 001 (RI/BI/SA/...) SAU cheie ISO
 * @param {"A"|"B"|"C"|"D"} bacsClass
 * @returns {number} energia corectată [kWh/an]
 */
export function applyBACSFactor(Q_raw, utility, categoryCode, bacsClass) {
  if (!isFinite(Q_raw) || Q_raw <= 0) return Q_raw;
  if (!utility || !bacsClass) return Q_raw;

  // Permite atât codul Mc 001 cât și cheia ISO direct
  const isoCategory = BACS_FACTORS_ISO52120[categoryCode]
    ? categoryCode
    : getBACSCategoryFromCode(categoryCode);

  const categoryFactors = BACS_FACTORS_ISO52120[isoCategory];
  if (!categoryFactors) return Q_raw;

  const classFactors = categoryFactors[bacsClass] || categoryFactors["C"];
  const factor = classFactors[utility];
  // Lighting pentru rezidențial e null — nu aplicăm corecție
  if (factor == null) return Q_raw;

  return Q_raw * factor;
}

/**
 * Returnează obiectul complet de factori pentru o combinație categorie × clasă.
 * Util pentru UI (afișare breakdown) și pentru calcule batch.
 *
 * @param {string} categoryCode
 * @param {"A"|"B"|"C"|"D"} bacsClass
 * @returns {{ heating:number, cooling:number, dhw:number, ventilation:number, lighting:number|null }}
 */
export function getBACSFactors(categoryCode, bacsClass) {
  const isoCategory = BACS_FACTORS_ISO52120[categoryCode]
    ? categoryCode
    : getBACSCategoryFromCode(categoryCode);
  const categoryFactors = BACS_FACTORS_ISO52120[isoCategory] || BACS_FACTORS_ISO52120.birouri;
  return categoryFactors[bacsClass] || categoryFactors["C"];
}

/**
 * Calculează impactul complet BACS: energie raw vs. energie corectată +
 * economie absolută/procentuală per sistem și total.
 *
 * Folosit pentru afișare breakdown în UI Step 5 + rapoarte CPE.
 *
 * @param {object} raw                — { qH, qC, qW, qV, qL } energii raw [kWh/an]
 * @param {string} categoryCode
 * @param {"A"|"B"|"C"|"D"} bacsClass
 * @returns {{
 *   bacsClass: string,
 *   category: string,
 *   factors: object,
 *   raw: object,
 *   corrected: object,
 *   savings: { heating, cooling, dhw, ventilation, lighting, total, totalPct }
 * }}
 */
export function calcBACSImpact(raw, categoryCode, bacsClass) {
  const qH = parseFloat(raw?.qH) || 0;
  const qC = parseFloat(raw?.qC) || 0;
  const qW = parseFloat(raw?.qW) || 0;
  const qV = parseFloat(raw?.qV) || 0;
  const qL = parseFloat(raw?.qL) || 0;

  const factors = getBACSFactors(categoryCode, bacsClass);
  const isoCategory = BACS_FACTORS_ISO52120[categoryCode]
    ? categoryCode
    : getBACSCategoryFromCode(categoryCode);

  const qH_corr = applyBACSFactor(qH, "heating", isoCategory, bacsClass);
  const qC_corr = applyBACSFactor(qC, "cooling", isoCategory, bacsClass);
  const qW_corr = applyBACSFactor(qW, "dhw", isoCategory, bacsClass);
  const qV_corr = applyBACSFactor(qV, "ventilation", isoCategory, bacsClass);
  const qL_corr = applyBACSFactor(qL, "lighting", isoCategory, bacsClass);

  const totalRaw = qH + qC + qW + qV + qL;
  const totalCorr = qH_corr + qC_corr + qW_corr + qV_corr + qL_corr;
  const totalSavings = totalRaw - totalCorr;
  const totalPct = totalRaw > 0 ? (totalSavings / totalRaw) * 100 : 0;

  return {
    bacsClass,
    category: isoCategory,
    factors,
    raw: { qH, qC, qW, qV, qL, total: totalRaw },
    corrected: { qH: qH_corr, qC: qC_corr, qW: qW_corr, qV: qV_corr, qL: qL_corr, total: totalCorr },
    savings: {
      heating: qH - qH_corr,
      cooling: qC - qC_corr,
      dhw: qW - qW_corr,
      ventilation: qV - qV_corr,
      lighting: qL - qL_corr,
      total: totalSavings,
      totalPct: Math.round(totalPct * 10) / 10,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. VERIFICARE OBLIGATIVITATE — EPBD Art. 14 + L. 238/2024
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifică dacă BACS este obligatoriu + dacă termenul a expirat.
 *
 * Referințe:
 * - EPBD 2024/1275 Art. 14 alin. (1): clădiri nerezidențiale cu HVAC > 290 kW
 *   trebuie echipate cu BACS minim clasa B (pentru clădiri noi) sau clasa C
 *   (existente modernizate) până la 31.12.2024.
 * - L. 238/2024 Art. 13-14: transpunere RO; amendă 5 000 – 20 000 lei.
 * - EPBD Art. 14 alin. (2): prag redus la 70 kW din 31.12.2029.
 *
 * @param {object} params
 * @param {string} params.category   — cod Mc 001
 * @param {number} params.hvacPower  — putere HVAC totală [kW]
 * @param {boolean} [params.isNew]   — clădire nouă? (atunci B, nu C)
 * @param {number} [params.year]     — anul evaluării (default: an curent)
 * @returns {{
 *   mandatory: boolean,
 *   minClass: "B"|"C"|null,
 *   deadline: string|null,
 *   deadlineExpired: boolean,
 *   reason: string,
 *   epbdRef: string,
 *   warningLevel: "none"|"info"|"warning"|"error",
 * }}
 */
export function checkBACSMandatoryISO({ category, hvacPower, isNew = false, year = new Date().getFullYear() }) {
  const isRes = ["RI", "RC", "RA"].includes(category);
  const kw = parseFloat(hvacPower) || 0;

  if (isRes || kw <= 70) {
    return {
      mandatory: false,
      minClass: null,
      deadline: null,
      deadlineExpired: false,
      reason: isRes
        ? "BACS nu este obligatoriu pentru clădiri rezidențiale (EPBD Art. 14)"
        : `HVAC ${Math.round(kw)} kW ≤ 70 kW — BACS opțional (EPBD Art. 14)`,
      epbdRef: "EPBD 2024/1275 Art. 14",
      warningLevel: "none",
    };
  }

  // Prag > 290 kW: termen 31.12.2024 (expirat la 17.04.2026)
  if (kw > 290) {
    const minClass = isNew ? "B" : "C";
    const expired = year > 2024;
    return {
      mandatory: true,
      minClass,
      deadline: "31.12.2024",
      deadlineExpired: expired,
      reason: expired
        ? `TERMEN DEPĂȘIT: HVAC ${Math.round(kw)} kW > 290 kW — BACS minim clasa ${minClass} obligatoriu din 31.12.2024. Risc amendă 5 000–20 000 lei (L. 238/2024).`
        : `HVAC ${Math.round(kw)} kW > 290 kW — BACS minim clasa ${minClass} obligatoriu până la 31.12.2024 (EPBD Art. 14).`,
      epbdRef: "EPBD 2024/1275 Art. 14 alin. (1) + L. 238/2024 Art. 13",
      warningLevel: expired ? "error" : "warning",
    };
  }

  // Prag 70–290 kW: termen 31.12.2029
  const minClass = isNew ? "B" : "C";
  return {
    mandatory: year >= 2029,
    minClass,
    deadline: "31.12.2029",
    deadlineExpired: year > 2029,
    reason: `HVAC ${Math.round(kw)} kW > 70 kW — BACS minim clasa ${minClass} obligatoriu până la 31.12.2029 (EPBD Art. 14 alin. 2).`,
    epbdRef: "EPBD 2024/1275 Art. 14 alin. (2)",
    warningLevel: year >= 2029 ? "warning" : "info",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. MAPARE SCOR SRI → CLASA BACS (ISO 52120-1:2022 §7.3)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Mapează un scor SRI (0-100) la clasa BACS recomandată conform ISO 52120-1:2022
 * §7.3 "SRI correspondence":
 *   - 0-20%   : Non-smart      → clasa D
 *   - 20-40%  : Basic          → clasa C
 *   - 40-60%  : Intermediate   → clasa C+ (între C și B)
 *   - 60-80%  : Advanced       → clasa B
 *   - 80-100% : Highly smart   → clasa A
 */
export function sriScoreToBACSClass(sriScore) {
  const s = parseFloat(sriScore) || 0;
  if (s >= 80) return "A";
  if (s >= 60) return "B";
  if (s >= 40) return "C"; // intermediate — referință
  if (s >= 20) return "C";
  return "D";
}

/**
 * Etichetă descriptivă pentru nivel SRI → BACS.
 */
export function sriScoreLevel(sriScore) {
  const s = parseFloat(sriScore) || 0;
  if (s >= 80) return { level: "Highly smart", bacs: "A", desc: "Clădire inteligentă avansată — MPC, DR, V2G" };
  if (s >= 60) return { level: "Advanced",     bacs: "B", desc: "Automatizare avansată cu integrare parțială IoT" };
  if (s >= 40) return { level: "Intermediate", bacs: "C", desc: "Automatizare medie — standard EPBD Art. 14" };
  if (s >= 20) return { level: "Basic",        bacs: "C", desc: "Automatizare de bază — programare + senzori punctuali" };
  return            { level: "Non-smart",    bacs: "D", desc: "Fără automatizare electronică — reglaj manual" };
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. CONSTANTE
// ═════════════════════════════════════════════════════════════════════════════

export const BACS_OBLIGATION_THRESHOLD_KW = 290;
export const BACS_OBLIGATION_THRESHOLD_KW_FUTURE = 70;
export const BACS_DEADLINE_290KW = "31.12.2024";
export const BACS_DEADLINE_70KW = "31.12.2029";
export const ISO_52120_REFERENCE = "SR EN ISO 52120-1:2022";
