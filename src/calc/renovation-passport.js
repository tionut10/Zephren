/**
 * Generator pașaport renovare EPBD 2024/1275 Art. 12 + Anexa VIII.
 * Construiește obiect pașaport validabil contra schemei JSON preliminary.
 *
 * La update păstrăm passportId + istoric versiuni (cap la 50 entries).
 *
 * Sprint 25 P0.4 — UUID v5 determinist:
 *   passportId = uuidv5("PASSPORT:{cpeCode}", CPE_NAMESPACE) când cpeCode e
 *   prezent; fallback fingerprint clădire (cadastru + adresă + Au + an).
 *   Re-rularea aceluiași audit produce ACELAȘI UUID → cross-ref CPE↔Pașaport
 *   stabil pentru raport, registru MDLPA, integrare ANRE.
 *
 *   Pentru pașapoartele existente (UUID v4 din generații pre-S25), `legacyPassportId`
 *   păstrează ID-ul vechi la re-emitere (regenerare); nu se șterg date utilizator.
 */

import { v5 as uuidv5 } from "uuid";
import {
  JSON_SCHEMA,
  RENOVATION_PASSPORT_SCHEMA_VERSION,
  RENOVATION_PASSPORT_SCHEMA_URL,
} from "../data/renovation-passport-schema.js";
import { CPE_NAMESPACE } from "../utils/cpe-code.js";

const HISTORY_CAP = 50;

/**
 * UUID v5 determinist pentru pașaport.
 * @param {object} p
 * @param {string} [p.cpeCode]   Cod unic CPE (preferat — cross-ref direct)
 * @param {object} [p.building]  Date clădire pentru fingerprint fallback
 * @returns {string} UUID v5
 */
export function generatePassportIdV5({ cpeCode, building } = {}) {
  if (cpeCode && typeof cpeCode === "string" && cpeCode.trim()) {
    return uuidv5(`PASSPORT:${cpeCode}`, CPE_NAMESPACE);
  }
  // Fallback fingerprint: cadastru + adresă + Au + an (suficient de unic în practică)
  const fp = [
    building?.cadastralNumber || "",
    building?.address || "",
    Math.round(parseFloat(building?.areaUseful) || 0),
    building?.yearBuilt || "",
  ].join("|");
  return uuidv5(`PASSPORT_FALLBACK:${fp}`, CPE_NAMESPACE);
}

/**
 * UUID v4 random — păstrat pentru fallback și backward compat.
 * Folosește crypto.randomUUID când e disponibil; altfel Math.random.
 */
export function generatePassportIdV4() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generator default — alege v5 dacă context disponibil, altfel v4.
 * Backward-compatible: apelat fără argumente → UUID v4 random.
 */
export function generatePassportId(ctx) {
  if (ctx && (ctx.cpeCode || ctx.building)) {
    return generatePassportIdV5(ctx);
  }
  return generatePassportIdV4();
}

// Acceptă atât UUID v4 (random) cât și v5 (determinist) — RFC 4122 versiunea în [45]
const UUID_V4_OR_V5_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidPassportId(id) {
  return typeof id === "string" && UUID_V4_OR_V5_RE.test(id);
}

function num(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function int(v, fallback = null) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Construiește pașaport renovare din contextul Zephren.
 * Toate argumentele sunt opționale pentru tolerare la date incomplete.
 */
export function buildRenovationPassport({
  building = {},
  instSummary = {},
  renewSummary = {},
  climate = {},
  auditor = {},
  phasedPlan = null,
  mepsStatus = null,
  financialSummary = null,
  fundingEligible = null,
  cpeCode = null,                  // Sprint 25 P0.4 — cross-ref CPE↔Pașaport
  existingPassportId = null,
  existingHistory = [],
  existingTimestamp = null,
  legacyPassportId = null,         // Sprint 25 P0.4 — păstrare istoric pre-v5
  changeReason = "Creare inițială pașaport",
  changedBy = null,
} = {}) {
  const now = new Date().toISOString();
  // Sprint 25 P0.4 — UUID v5 determinist (când cpeCode/building disponibile)
  const passportId =
    existingPassportId && isValidPassportId(existingPassportId)
      ? existingPassportId
      : generatePassportId({ cpeCode, building });

  const newVersionEntry = {
    version: RENOVATION_PASSPORT_SCHEMA_VERSION,
    timestamp: now,
    changedBy: changedBy || auditor?.name || "Auditor nedefinit",
    changeReason,
  };

  const trimmedHistory = Array.isArray(existingHistory)
    ? existingHistory.slice(-Math.max(0, HISTORY_CAP - 1))
    : [];
  const history = [...trimmedHistory, newVersionEntry];

  const mepsThresholds = mepsStatus?.thresholds || {};
  const ep2030 = num(mepsThresholds.ep2030, 999);
  // Sprint 26 P1.18 — folosește ep2nd (2035 rez / 2033 nrez) cu fallback ep2033 backward compat
  const ep2nd = num(mepsThresholds.ep2nd ?? mepsThresholds.ep2035 ?? mepsThresholds.ep2033, 999);
  const milestone2 = mepsThresholds.milestone2 || 2033;
  const epTotalBase = num(instSummary?.ep_total_m2, 0);

  // Sprint 06may2026 audit P0 (B7 ext) — rotunjire 1 zecimală pentru XML/JSON
  // (anterior <ep_total>781.1893646160287</ep_total> — ilizibil în export)
  const round1 = (v) => Math.round(num(v, 0) * 10) / 10;
  const round2 = (v) => Math.round(num(v, 0) * 100) / 100;

  const baseline = {
    date: now.slice(0, 10),
    ep_total: round1(epTotalBase),
    ep_nren: round1(instSummary?.ep_nren_m2),
    ep_ren: round1(instSummary?.ep_ren_m2),
    co2: round2(instSummary?.co2_total_m2),
    energyClass: instSummary?.energyClass || "G",
    rer_pct: round1(renewSummary?.rer),
    meps2030_compliant: epTotalBase > 0 ? epTotalBase <= ep2030 : false,
    meps2033_compliant: epTotalBase > 0 ? epTotalBase <= ep2nd : false,
    mepsMilestone2: milestone2,
    cpeNumber: building?.cpeNumber || null,
    // M-8 (7 mai 2026) — fallback la auditor.date dacă building.cpeIssueDate lipsește
    // (în setupul curent CPE issue date = auditor.date din Pas 6).
    cpeIssueDate: building?.cpeIssueDate || auditor?.date || null,
  };

  const strategy = ["quick_wins", "envelope_first", "systems_first", "balanced"].includes(
    phasedPlan?.strategy
  )
    ? phasedPlan.strategy
    : "balanced";

  const phases = Array.isArray(phasedPlan?.phases)
    ? phasedPlan.phases.map((p) => ({
        year: int(p.year, 0) ?? 0,
        measures: (p.measures || []).map((m) => ({
          id: String(m.id || ""),
          name: String(m.name || m.id || ""),
          category: m.category || m.system || "Nespecificat",
          ep_reduction_kWh_m2: num(m.ep_reduction_kWh_m2, 0),
          co2_reduction: num(m.co2_reduction, 0),
          cost_RON: num(m.cost_RON, 0),
          lifespan_years: int(m.lifespan || m.lifespan_years, 20) ?? 20,
          fundingProgram: m.fundingProgram || null,
        })),
        phaseCost_RON: num(p.phaseCost_RON, 0),
        cumulativeCost_RON: num(p.cumulativeCost_RON, 0),
        ep_after: num(p.ep_after, epTotalBase),
        class_after: p.class_after || baseline.energyClass,
        annualSaving_RON: num(p.annualSaving_RON, 0),
        mepsComplianceAfterPhase: {
          meps2030: num(p.ep_after, 999) <= ep2030,
          meps2033: num(p.ep_after, 999) <= ep2nd,
        },
      }))
    : [];

  const roadmap = {
    strategy,
    totalYears: int(phasedPlan?.totalYears, 0) ?? 0,
    annualBudgetRON: num(phasedPlan?.annualBudget, 0),
    energyPriceRON: num(phasedPlan?.energyPrice, 0.4),
    discountRate: num(phasedPlan?.discountRate, 0.06),
    phases,
    epTrajectory: Array.isArray(phasedPlan?.epTrajectory)
      ? phasedPlan.epTrajectory.map((v) => num(v, 0))
      : [epTotalBase],
    classTrajectory: Array.isArray(phasedPlan?.classTrajectory)
      ? phasedPlan.classTrajectory.map((v) => String(v))
      : [baseline.energyClass],
  };

  const lastPhase = phases.length > 0 ? phases[phases.length - 1] : null;
  const epTarget = lastPhase ? lastPhase.ep_after : baseline.ep_total;
  const targetState = {
    ep_target: epTarget,
    energyClass_target: lastPhase
      ? lastPhase.class_after
      : baseline.energyClass,
    nzebCompliant: !!phasedPlan?.summary?.nzeb_reached,
    costOptimalCompliant: epTarget > 0 && epTarget <= 50,
    mepsComplianceTarget: {
      meps2030: epTarget <= ep2030,
      meps2033: epTarget <= ep2nd,
    },
  };

  const totalInvest = num(financialSummary?.totalInvest_RON, 0);
  const totalGrant = num(fundingEligible?.maxGrantCombined, 0);
  const financial = {
    totalInvestment_RON: totalInvest,
    totalGrant_RON: totalGrant,
    netInvestment_RON: Math.max(0, totalInvest - totalGrant),
    fundingPrograms: Array.isArray(fundingEligible?.programs)
      ? fundingEligible.programs.map(String)
      : [],
    npv_30years_RON: num(financialSummary?.npv, 0),
    irr_pct: num(financialSummary?.irr, 0),
    paybackSimple_years: num(financialSummary?.paybackSimple, 0),
    paybackDiscounted_years: num(financialSummary?.paybackDiscounted, 0),
    perspective: ["financial", "social", "macroeconomic"].includes(
      financialSummary?.perspective
    )
      ? financialSummary.perspective
      : "financial",
  };

  // M-8 (7 mai 2026) — mapping permisiv pentru câmpurile pașaport care lipseau în XML:
  //   - name: fallback adresă (clădirea nu are field „name" în UI; folosim adresa pentru identificare)
  //   - heightRegime: fallback la building.floors string (ex. „P+4" e regimul de înălțime real)
  //   - apartments: building folosește nApartments (camelCase), nu „apartments"
  //   - floors: extragem partea numerică din string-uri ca „P+4" → 4 (sau null dacă nu se poate)
  // Schema cere floors:integer|null + heightRegime:string, deci păstrăm tipurile.
  const floorsRaw = building?.floors;
  const floorsStr = floorsRaw != null ? String(floorsRaw) : "";
  // Extrage primul număr din „P+4", „D+P+4E", „4E" etc. — pentru câmpul int floors.
  const floorsNumMatch = floorsStr.match(/(\d+)/);
  const floorsInt = floorsNumMatch ? parseInt(floorsNumMatch[1], 10) : int(floorsRaw, null);
  const heightRegimeFallback = building?.heightRegime || floorsStr || "";
  const apartmentsCount = int(
    building?.nApartments ?? building?.apartmentsCount ?? building?.apartments,
    null,
  );
  const buildingObj = {
    name: building?.name || building?.address || "",
    address: building?.address || "",
    county: building?.county || "",
    cadastralNumber: building?.cadastralNumber || "",
    category: building?.category || "AL",
    areaUseful: num(building?.areaUseful, 0),
    yearBuilt: int(building?.yearBuilt, null),
    climateZone: ["I", "II", "III", "IV", "V"].includes(climate?.zone)
      ? climate.zone
      : "II",
    floors: floorsInt,
    apartments: apartmentsCount,
    heightRegime: heightRegimeFallback,
    protectedStatus: !!building?.protectedStatus,
    cpePreviousNumber: building?.cpeNumber || null,
  };

  // Sprint 06may2026 audit P0 — aliase complete pentru schema demoProjects
  // (atestat → certNumber, grade → category, company → firm, email → contact)
  const auditorObj = {
    name: auditor?.name || "",
    certNumber:
      auditor?.certNr || auditor?.certNumber || auditor?.atestat || "",
    category:
      auditor?.category || auditor?.grade || auditor?.specialty || "",
    firm:
      auditor?.firma || auditor?.firm || auditor?.company || "",
    contact:
      auditor?.contact || auditor?.email || auditor?.phone || "",
  };

  // Sprint 25 P0.4 — păstrare ID legacy v4 dacă re-emitere
  const legacy =
    legacyPassportId && isValidPassportId(legacyPassportId) && legacyPassportId !== passportId
      ? legacyPassportId
      : null;

  return {
    passportId,
    ...(legacy ? { legacyPassportId: legacy } : {}),
    ...(cpeCode ? { cpeCode } : {}),
    version: RENOVATION_PASSPORT_SCHEMA_VERSION,
    schemaUrl: RENOVATION_PASSPORT_SCHEMA_URL,
    timestamp: existingTimestamp || now,
    lastModified: now,
    status: existingPassportId ? "updated" : "draft",
    history,
    building: buildingObj,
    baseline,
    roadmap,
    targetState,
    financial,
    auditor: auditorObj,
    registry: {
      registryId: null,
      registryUrl: null,
      syncStatus: "not_registered",
      lastSync: null,
    },
  };
}

/**
 * Validare pașaport contra schemei (lazy-load ajv pentru a păstra bundle-ul mic).
 * Returnează { valid: bool, errors: [] }.
 */
export async function validatePassport(passport) {
  try {
    const { default: Ajv } = await import("ajv");
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(JSON_SCHEMA);
    const valid = validate(passport);
    return {
      valid: !!valid,
      errors: valid ? [] : (validate.errors || []).map((e) => ({
        path: e.instancePath,
        message: e.message,
        keyword: e.keyword,
      })),
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{ message: `Validator indisponibil: ${err.message}` }],
    };
  }
}

/**
 * Variantă sincronă minimă, fără ajv — verifică doar câmpurile critice.
 * Util pentru UI rapid (ex. badge status).
 */
export function validatePassportShallow(passport) {
  const errors = [];
  if (!passport || typeof passport !== "object") {
    return { valid: false, errors: [{ message: "Pașaport gol" }] };
  }
  if (!isValidPassportId(passport.passportId)) {
    errors.push({ path: "/passportId", message: "UUID v4 sau v5 invalid" });
  }
  if (!passport.version) errors.push({ path: "/version", message: "Versiune lipsă" });
  if (!passport.building?.address) {
    errors.push({ path: "/building/address", message: "Adresa clădirii lipsă" });
  }
  if (!Number.isFinite(passport.baseline?.ep_total)) {
    errors.push({ path: "/baseline/ep_total", message: "EP baseline lipsă" });
  }
  if (!passport.auditor?.name) {
    errors.push({ path: "/auditor/name", message: "Nume auditor lipsă" });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Caută prima fază (an plan) unde EP după renovare ≤ prag.
 * Util pentru marcare milestone MEPS 2030 / 2033 pe traiectorie.
 * Returnează număr an sau null dacă nu se atinge niciodată.
 */
export function findMepsMilestone(phases, epThreshold) {
  if (!Array.isArray(phases) || !Number.isFinite(epThreshold)) return null;
  for (const p of phases) {
    if (num(p.ep_after, Infinity) <= epThreshold) return int(p.year, null);
  }
  return null;
}
