/**
 * epbd-art13-solar.js — S30B·B2
 *
 * Verificare obligație instalare sisteme solare conform EPBD 2024/1275 Art.13.
 *
 * Sursă: Directiva (UE) 2024/1275 Art.13 „Solar energy in buildings"
 * Locație: Normative/UE-Directive/DIR_2024-1275_EPBD-recast.pdf
 *
 * Termenele de tranziție națională (RO transpune până 29 mai 2026):
 *   - 31 dec 2026: clădiri publice noi > 250 m² (utile)
 *   - 31 dec 2027: toate clădirile noi nerezidențiale > 250 m²
 *   - 31 dec 2027: clădiri publice existente > 2.000 m² (renovare majoră / acoperiș nou)
 *   - 31 dec 2028: clădiri publice existente > 750 m²
 *   - 31 dec 2029: clădiri rezidențiale noi (cu derogări naționale: fezabilitate tehnică/economică)
 *
 * Derogări permise (RO poate notifica Comisia până la 1 ian 2026):
 *   - clădiri istorice (Legea 422/2001 monumente istorice)
 *   - acoperiș < 4 m² fezabil pentru solar
 *   - acoperire prin sisteme energetice alternative regenerabile
 *
 * Sprint 30 — apr 2026
 */

/** Categorii rezidențiale RO (Mc 001-2022) — relevante pentru deadline 2029. */
const RESIDENTIAL_CATEGORIES = new Set(["RI", "RA", "RC", "CP"]);

/** Categorii publice RO (servicii publice, educație, sănătate). */
const PUBLIC_CATEGORIES = new Set(["BI", "ED", "SA", "ST", "CO", "BC"]);

/**
 * Verifică obligația instalării sistemelor solare conform EPBD Art.13.
 *
 * @param {object} building - { category, areaUseful, isNew, isMajorRenov, isPublic, isHistoric, roofArea?, scopCpe? }
 * @returns {object} { applicable, deadline, required, recommendation, exceptions, sources }
 */
export function checkEPBDArt13Solar(building) {
  if (!building) {
    return { applicable: false, deadline: null, required: false, recommendation: "" };
  }

  const cat = building.category;
  const Au = parseFloat(building.areaUseful) || 0;
  const isNew = building.isNew === true;
  const isMajorRenov = building.isMajorRenov === true || building.scopCpe === "renovare" || building.scopCpe === "renovare_majora";
  const isPublic = building.isPublic === true || PUBLIC_CATEGORIES.has(cat);
  const isResidential = RESIDENTIAL_CATEGORIES.has(cat);
  const isHistoric = building.isHistoric === true;

  // Deroga monumente istorice
  if (isHistoric) {
    return {
      applicable: true,
      deadline: null,
      required: false,
      recommendation: "Clădire istorică (Legea 422/2001). EPBD Art.13 §3 permite derogare. Recomandăm soluții non-invazive (PV pe anexe, solar termic).",
      exceptions: ["historic_building"],
      sources: ["EPBD 2024/1275 Art.13 §3"],
    };
  }

  // Acoperiș prea mic pentru solar
  const roofArea = parseFloat(building.roofArea) || 0;
  if (roofArea > 0 && roofArea < 4) {
    return {
      applicable: true,
      deadline: null,
      required: false,
      recommendation: "Acoperiș < 4 m². EPBD Art.13 admite derogare pentru fezabilitate tehnică redusă.",
      exceptions: ["roof_too_small"],
      sources: ["EPBD 2024/1275 Art.13 §3"],
    };
  }

  // Determinare deadline aplicabil
  let deadline = null;
  let required = false;
  let categoryLabel = "";

  if (isNew) {
    if (isPublic && Au > 250) {
      deadline = "2026-12-31";
      required = true;
      categoryLabel = "clădire publică nouă > 250 m²";
    } else if (!isResidential && Au > 250) {
      deadline = "2027-12-31";
      required = true;
      categoryLabel = "clădire nerezidențială nouă > 250 m²";
    } else if (isResidential) {
      deadline = "2029-12-31";
      required = true;
      categoryLabel = "clădire rezidențială nouă";
    }
  } else if (isMajorRenov) {
    if (isPublic && Au > 2000) {
      deadline = "2027-12-31";
      required = true;
      categoryLabel = "clădire publică existentă > 2.000 m² în renovare majoră";
    } else if (isPublic && Au > 750) {
      deadline = "2028-12-31";
      required = true;
      categoryLabel = "clădire publică existentă > 750 m²";
    }
  }

  let recommendation;
  if (required) {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const monthsRemaining = Math.round((deadlineDate - today) / (1000 * 60 * 60 * 24 * 30.44));
    recommendation = monthsRemaining <= 12
      ? `OBLIGATORIU EPBD Art.13: ${categoryLabel}, termen ${deadline} (${monthsRemaining} luni). Instalați PV / solar termic acum.`
      : `OBLIGATORIU EPBD Art.13: ${categoryLabel}, termen ${deadline}. Planificare timpurie recomandată.`;
  } else {
    recommendation = "Nu există obligație EPBD Art.13 imediată. Solar voluntar — eligibil PNRR / Casa Verde.";
  }

  return {
    applicable: required,
    deadline,
    required,
    categoryLabel,
    recommendation,
    exceptions: [],
    sources: [
      "EPBD 2024/1275 Art.13 (Solar energy in buildings)",
      "Locație normativ: Normative/UE-Directive/DIR_2024-1275_EPBD-recast.pdf",
    ],
  };
}

/** Verdict scurt pentru afișare UI (banner / badge). */
export function getEPBDArt13Verdict(building, hasPV) {
  const check = checkEPBDArt13Solar(building);
  if (!check.required) return { level: "info", message: check.recommendation };
  if (hasPV) return { level: "success", message: `Conform EPBD Art.13 (${check.categoryLabel}) — PV instalat.` };
  return { level: "error", message: check.recommendation };
}
