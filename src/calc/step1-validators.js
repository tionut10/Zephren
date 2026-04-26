/**
 * step1-validators.js — Validatori extinși pentru Step 1 (Identificare & Clasificare clădire)
 *
 * Sursa adevărului pentru:
 *   - câmpuri obligatorii (critical)
 *   - consistență inter-câmp (cross-field)
 *   - praguri nZEB diferențiate (rezidențial vs. non-rezidențial)
 *   - validări condiționate (RA/RC)
 *   - validări format (CUI RO, CF, cadastru ANCPI modern)
 *
 * Referințe normative:
 *   - Mc 001-2022, Cap. 1 (identificare)
 *   - Ord. MDLPA 16/2023, Anexa 1 (identificare juridică)
 *   - Ord. MDLPA 161/2022 (n50 nZEB diferențiat)
 *   - EPBD 2024/1275 Art. 11 (IAQ), Art. 14 (EV charging §3 rezidențial / §4 non-rezidențial)
 *   - EN 16798-1 Cat. II (CO₂ ≤1200 ppm, NO₂ ≤40 µg/m³, PM10 ≤45)
 *   - OMS 2021 (PM2.5 ≤5), UE 2030 (PM2.5 ≤10)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Categorii rezidențiale (pentru praguri nZEB și EV charging diferențiat)
// ─────────────────────────────────────────────────────────────────────────────
export const RESIDENTIAL_CATEGORIES = new Set(["RI", "RC", "RA"]);

export const isResidential = (category) => RESIDENTIAL_CATEGORIES.has(category);

// ─────────────────────────────────────────────────────────────────────────────
// parseFloorsRegime — numără corect nivelurile dintr-un regim de înălțime RO
// Fix audit 24 apr 2026: `replace(/[^0-9]/g,"")` ignora S (subsol), D (demisol),
// P (parter), M (mansardă), undercount la "P+4E"→4 (corect 5), "S+P+4E+M"→4 (corect 7).
//
// Exemple:
//   "P"         → { total: 1, heated: 1, parts: [P] }
//   "P+4E"      → { total: 5, heated: 5, parts: [P, 4E] }
//   "S+P+4E+M"  → { total: 7, heated: 6 (S=dacă basement flag), parts: [S, P, 4E, M] }
//   "D+P+2E"    → { total: 4, heated: 3 }
//   "P+4E+M"    → { total: 6, heated: 6 }
// ─────────────────────────────────────────────────────────────────────────────
export function parseFloorsRegime(floorsStr, opts = {}) {
  const { basementHeated = false, atticHeated = false } = opts;
  const s = String(floorsStr || "").toUpperCase().replace(/\s/g, "");
  if (!s) return { total: 0, heated: 0, aboveGround: 0, parts: [] };

  const parts = s.split("+").filter(Boolean);
  let total = 0;
  let heated = 0;
  let aboveGround = 0;
  const labels = [];

  for (const p of parts) {
    if (p === "S" || p === "SUBSOL") {
      total += 1; labels.push("S");
      if (basementHeated) heated += 1;
    } else if (p === "D" || p === "DEMISOL") {
      total += 1; labels.push("D");
      if (basementHeated) heated += 1;
    } else if (p === "P" || p === "PARTER") {
      total += 1; heated += 1; aboveGround += 1; labels.push("P");
    } else if (p === "M" || p === "MANSARDA" || p === "MANSARDĂ" || p === "POD") {
      total += 1; aboveGround += 1; labels.push("M");
      if (atticHeated) heated += 1;
    } else {
      // ex: "4E", "10E", "2ETAJ", "2NIVELURI"
      const match = p.match(/^(\d+)(E|ETAJ|ETAJE|NIV|NIVELURI)?$/);
      if (match) {
        const n = parseInt(match[1]) || 0;
        total += n; heated += n; aboveGround += n;
        labels.push(`${n}E`);
      } else {
        // Necunoscut — ignoră dar loghează
        labels.push(`?${p}`);
      }
    }
  }

  return { total, heated, aboveGround, parts: labels };
}

// Convenience: returnează doar numărul de niveluri deasupra solului (pentru SVG)
export function countAboveGroundFloors(floorsStr) {
  return Math.max(1, parseFloorsRegime(floorsStr).aboveGround || 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: bilingv
// ─────────────────────────────────────────────────────────────────────────────
const L = (lang, ro, en) => (lang === "EN" ? en : ro);

// ─────────────────────────────────────────────────────────────────────────────
// Validare CUI/CIF (RO) — algoritm cheie control ANAF
// Referință: https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cui/cui.htm
// ─────────────────────────────────────────────────────────────────────────────
export function isValidRomanianCUI(raw) {
  if (!raw) return false;
  const cui = String(raw).trim().replace(/^RO\s*/i, "");
  if (!/^\d{2,10}$/.test(cui)) return false;
  const controlKey = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cui.split("").map(Number);
  const checkDigit = digits.pop();
  const padded = new Array(9 - digits.length).fill(0).concat(digits);
  const sum = padded.reduce((acc, d, i) => acc + d * controlKey[i], 0);
  const expected = (sum * 10) % 11 % 10;
  return expected === checkDigit;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validare număr cadastral modern ANCPI (5-10 cifre, opțional -CN -UN)
// Accepta: "123456", "123456-A", "123456-C1-U5", "1234567-C2", "12345678901"
// ─────────────────────────────────────────────────────────────────────────────
export const CADASTRAL_REGEX = /^\d{5,11}(-[A-Z]\d*)?(-U\d+)?$/;

export function isValidCadastral(raw) {
  if (!raw) return true; // opțional, nu obligatoriu
  return CADASTRAL_REGEX.test(String(raw).trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Validare Carte Funciară (format: "CF nr. <număr> <localitate>")
// ─────────────────────────────────────────────────────────────────────────────
export const CF_REGEX = /^(CF\s*(nr\.?)?\s*)?\d{4,8}(\s*[\/\-\s]\s*[A-ZĂÂÎȘȚa-zăâîșț0-9\s.\-]+)?$/i;

export function isValidLandBook(raw) {
  if (!raw) return true;
  return CF_REGEX.test(String(raw).trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Prag nZEB pentru n50 (h⁻¹) — Ord. MDLPA 161/2022
//   - Rezidențial: ≤1.0 (ventilație naturală) sau ≤0.6 (pasiv)
//   - Non-rezidențial cu ventilație mecanică: ≤1.5
// ─────────────────────────────────────────────────────────────────────────────
export function getN50Reference(category) {
  if (isResidential(category)) {
    return { nZEB: 1.0, passive: 0.6, residential: true };
  }
  return { nZEB: 1.5, passive: 1.0, residential: false };
}

export function classifyN50(n50Value, category) {
  const v = parseFloat(n50Value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const ref = getN50Reference(category);
  if (v <= ref.passive) return { label: "Passivhaus", color: "emerald", value: v, ref };
  if (v <= ref.nZEB) return { label: `nZEB (≤${ref.nZEB})`, color: "emerald", value: v, ref };
  if (v <= ref.nZEB * 1.5) return { label: `Standard (≤${ref.nZEB * 1.5})`, color: "amber", value: v, ref };
  if (v <= 3.0) return { label: "Ventilație naturală (≤3.0)", color: "amber", value: v, ref };
  if (v > 20) return { label: "Valoare absurdă (>20)", color: "red", value: v, ref };
  return { label: "Peste limită (>3.0)", color: "red", value: v, ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// EV charging — EPBD 2024 Art. 14
//   §3 rezidențial: precablare ≥50% locuri
//   §4 non-rezidențial: ≥1 punct instalat + precablare 1/5 locuri (existent),
//     sau ≥1/10 locuri pentru renovare majoră/nou ≥20 locuri
// ─────────────────────────────────────────────────────────────────────────────
export function getEVRequirements({ parkingSpaces, category, isRecent }) {
  const n = parseInt(parkingSpaces) || 0;
  if (n < 10) return null; // Art. 14 aplicabil doar ≥10 locuri
  const residential = isResidential(category);
  if (residential) {
    return {
      installedMin: 0, // pentru rezidențial, precablarea primează
      preparedMin: Math.ceil(n * 0.5),
      reference: "EPBD 2024/1275 Art. 14 §3 (rezidențial)",
      description: `≥50% din ${n} locuri precablate`,
    };
  }
  const installedMin = isRecent ? Math.max(1, Math.ceil(n / 10)) : Math.max(1, Math.ceil(n / 20));
  const preparedMin = isRecent ? Math.ceil(n * 0.5) : Math.ceil(n * 0.2);
  return {
    installedMin,
    preparedMin,
    reference: "EPBD 2024/1275 Art. 14 §4 (non-rezidențial)",
    description: `${installedMin} puncte instalate + ${preparedMin} precablate`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validare câmpuri individuale (returnează mesaj eroare sau null)
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_VALIDATORS = {
  city: (v, _b, lang) =>
    !v || !String(v).trim() ? L(lang, "Localitatea este obligatorie", "City is required") : null,

  county: (v, _b, lang) =>
    !v || !String(v).trim() ? L(lang, "Județul este obligatoriu", "County is required") : null,

  category: (v, _b, lang) =>
    !v ? L(lang, "Selectați categoria clădirii", "Select building category") : null,

  structure: (v, _b, lang) =>
    !v || !String(v).trim() ? L(lang, "Selectați tipul structurii", "Select structure type") : null,

  yearBuilt: (v, _b, lang) => {
    const yr = parseInt(v);
    if (!yr || yr < 1800 || yr > 2030)
      return L(lang, "An construcție invalid (1800–2030)", "Invalid year built (1800–2030)");
    return null;
  },

  yearRenov: (v, b, lang) => {
    if (!v) return null; // opțional
    const yr = parseInt(v);
    const yb = parseInt(b.yearBuilt);
    if (!yr || yr < 1800 || yr > 2030)
      return L(lang, "An renovare invalid (1800–2030)", "Invalid renovation year");
    if (yb && yr < yb)
      return L(lang, "Anul renovării < anul construcției", "Renovation year < built year");
    return null;
  },

  floors: (v, _b, lang) =>
    !v || !String(v).trim()
      ? L(lang, "Regimul de înălțime este obligatoriu (ex: P+4E)", "Height regime is required (e.g. P+4E)")
      : null,

  areaUseful: (v, _b, lang) => {
    const Au = parseFloat(v);
    if (!Au || Au <= 0) return L(lang, "Suprafața utilă trebuie să fie > 0 m²", "Usable area must be > 0 m²");
    if (Au > 500_000) return L(lang, "Suprafață utilă suspect de mare (>500.000 m²)", "Usable area suspiciously large");
    return null;
  },

  volume: (v, b, lang) => {
    const V = parseFloat(v);
    if (!V || V <= 0) return L(lang, "Volumul încălzit trebuie să fie > 0 m³", "Heated volume must be > 0 m³");
    const Au = parseFloat(b.areaUseful);
    if (Au > 0) {
      const ratio = V / Au;
      if (ratio < 2.2 || ratio > 8) {
        return L(
          lang,
          `V/Au = ${ratio.toFixed(1)} neobișnuit (așteptat 2.5–4)`,
          `V/Au = ${ratio.toFixed(1)} unusual (expected 2.5–4)`,
        );
      }
    }
    return null;
  },

  areaEnvelope: (v, b, lang) => {
    const Aenv = parseFloat(v);
    if (!Aenv || Aenv <= 0)
      return L(lang, "Suprafața anvelopei trebuie > 0", "Envelope area must be > 0");
    const V = parseFloat(b.volume);
    if (V > 0) {
      const av = Aenv / V;
      if (av < 0.15 || av > 1.5)
        return L(
          lang,
          `A/V = ${av.toFixed(2)} m⁻¹ neobișnuit (așteptat 0.2–1.2)`,
          `A/V = ${av.toFixed(2)} m⁻¹ unusual (expected 0.2–1.2)`,
        );
    }
    return null;
  },

  heightFloor: (v, _b, lang) => {
    const h = parseFloat(v);
    if (!h || h <= 0) return L(lang, "Înălțimea etajului trebuie > 0", "Floor height must be > 0");
    if (h < 2.2) return L(lang, "Înălțime etaj < 2.2 m (necorespunzătoare)", "Floor height < 2.2 m");
    if (h > 6) return L(lang, "Înălțime etaj > 6 m (atipică rezidențial)", "Floor height > 6 m (unusual)");
    return null;
  },

  areaHeated: (v, b, lang) => {
    if (!v) return null;
    const Ah = parseFloat(v);
    const Au = parseFloat(b.areaUseful);
    if (Ah < 0) return L(lang, "Arie încălzită negativă", "Negative heated area");
    if (Au > 0 && Ah > Au * 1.01)
      return L(lang, "Arie încălzită > arie utilă (inconsistent)", "Heated > usable area");
    return null;
  },

  areaBuilt: (v, b, lang) => {
    if (!v) return null;
    const Ac = parseFloat(v);
    const Au = parseFloat(b.areaUseful);
    if (Ac < 0) return L(lang, "Arie construită negativă", "Negative built area");
    if (Au > 0 && Ac < Au * 0.9)
      return L(lang, "Acd < 0.9·Au (neobișnuit)", "Acd < 0.9·Au (unusual)");
    return null;
  },

  n50: (v, _b, lang) => {
    if (v == null || v === "") return null;
    const n = parseFloat(v);
    if (n < 0) return L(lang, "n50 negativ invalid", "Negative n50 invalid");
    if (n > 20) return L(lang, "n50 > 20 h⁻¹ (valoare absurdă)", "n50 > 20 h⁻¹ (absurd)");
    return null;
  },

  locality: (v, _b, lang) =>
    !v || !String(v).trim()
      ? L(lang, "Selectați localitatea de calcul climatic", "Select climatic locality")
      : null,

  scopCpe: (v, _b, lang) =>
    !v ? L(lang, "Selectați scopul elaborării CPE", "Select CPE purpose") : null,

  // Sprint 27 P2.4 — cadastru + CF obligatorii (Ord. MDLPA 16/2023 + L.238/2024 Art.12)
  cadastralNumber: (v, _b, lang) => {
    if (!v) return L(lang, "Numărul cadastral este obligatoriu pentru CPE", "Cadastral number required for CPE");
    if (!isValidCadastral(v)) {
      return L(
        lang,
        "Format cadastru neobișnuit (ex: 123456, 123456-A, 123456-C1-U5)",
        "Unusual cadastral format (e.g. 123456, 123456-A, 123456-C1-U5)",
      );
    }
    return null;
  },

  landBook: (v, _b, lang) => {
    if (!v) return L(lang, "Carte funciară este obligatorie pentru CPE", "Land book required for CPE");
    if (!isValidLandBook(v)) {
      return L(lang, 'Format CF neobișnuit (ex: "CF nr. 123456 Cluj")', 'Unusual CF format');
    }
    return null;
  },

  ownerType: (v, _b, lang) =>
    !v ? L(lang, "Selectați tipul proprietarului", "Select owner type") : null,

  ownerCUI: (v, b, lang) => {
    if (b.ownerType !== "PJ" && b.ownerType !== "PUB") return null;
    if (!v) return L(lang, "CUI/CIF este obligatoriu pentru PJ/Public", "CUI required for legal entity/public");
    if (!isValidRomanianCUI(v)) return L(lang, "CUI/CIF invalid (cheia de control nu verifică)", "Invalid CUI checksum");
    return null;
  },

  // Condiționate RA (apartament în bloc)
  apartmentNo: (v, b, lang) =>
    b.category === "RA" && (!v || !String(v).trim())
      ? L(lang, "Nr. apartament obligatoriu pentru RA", "Apartment number required for RA")
      : null,

  // Condiționat RC (bloc)
  nApartments: (v, b, lang) => {
    if (b.category !== "RC") return null;
    const n = parseInt(v);
    if (!n || n < 2) return L(lang, "Nr. apartamente (RC) trebuie ≥ 2", "Apartment count (RC) must be ≥ 2");
    return null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API principal: returnează { errors, warnings }
//
// errors = blocante (numele câmpului → mesaj) — nu permite trecere Step 2
// warnings = non-blocante (suspicious / unusual / inconsistente) — afișate ca hint
// ─────────────────────────────────────────────────────────────────────────────

// Sprint 27 P2.4 — cadastralNumber + landBook promovate la CRITICAL
// (obligatorii pentru CPE conform Ord. MDLPA 16/2023 + L.238/2024 Art. 12)
const CRITICAL_FIELDS = [
  "city",
  "county",
  "category",
  "structure",
  "yearBuilt",
  "floors",
  "areaUseful",
  "volume",
  "areaEnvelope",
  "heightFloor",
  "locality",
  "scopCpe",
  "apartmentNo",
  "nApartments",
  "cadastralNumber",
  "landBook",
];

const WARNING_ONLY_FIELDS = [
  "yearRenov",
  "areaHeated",
  "areaBuilt",
  "n50",
  "ownerCUI",
];

export function validateStep1(building, lang = "RO") {
  const b = building || {};
  const errors = {};
  const warnings = {};

  for (const field of CRITICAL_FIELDS) {
    const v = b[field];
    const validator = FIELD_VALIDATORS[field];
    if (!validator) continue;
    const msg = validator(v, b, lang);
    if (msg) errors[field] = msg;
  }

  for (const field of WARNING_ONLY_FIELDS) {
    const v = b[field];
    const validator = FIELD_VALIDATORS[field];
    if (!validator) continue;
    const msg = validator(v, b, lang);
    if (msg) warnings[field] = msg;
  }

  // Cross-field: volum vs. dimensiuni (doar warning)
  const Au = parseFloat(b.areaUseful);
  const hF = parseFloat(b.heightFloor);
  const V = parseFloat(b.volume);
  // Fix audit 24 apr 2026: folosește parseFloorsRegime — numără corect S/D/P/M, nu doar E
  const fr = parseFloorsRegime(b.floors, { basementHeated: !!b.basement, atticHeated: !!b.attic });
  const nF = fr.heated;
  if (Au > 0 && hF > 0 && V > 0 && nF > 0) {
    const Vexpected = Au * hF * Math.max(1, nF);
    const diff = Math.abs(V - Vexpected) / Vexpected;
    if (diff > 0.25) {
      warnings.volumeConsistency = L(
        lang,
        `Volum ≠ Au·h·etaje (diferență ${Math.round(diff * 100)}%)`,
        `Volume ≠ Au·h·floors (${Math.round(diff * 100)}% diff)`,
      );
    }
  }

  return { errors, warnings };
}

// Back-compat: forma veche cu doar erori (Sprint 18)
export function validateStep1Critical(building, lang = "RO") {
  return validateStep1(building, lang).errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress tracker — sync cu CRITICAL_FIELDS, fără override STEP1_FIELDS paralel
// ─────────────────────────────────────────────────────────────────────────────
export function computeStep1Progress(building, lang = "RO") {
  const { errors } = validateStep1(building, lang);
  const applicable = CRITICAL_FIELDS.filter((f) => {
    // Câmpuri condiționate: sunt contabilizate doar dacă sunt aplicabile
    if (f === "apartmentNo") return building?.category === "RA";
    if (f === "nApartments") return building?.category === "RC";
    return true;
  });
  const missing = applicable.filter((f) => errors[f]);
  return {
    filled: applicable.length - missing.length,
    total: applicable.length,
    missing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scop CPE enum complet (L. 372/2005 Art. 8¹ + extensii post-2024)
// ─────────────────────────────────────────────────────────────────────────────
export const SCOP_CPE_OPTIONS = [
  { value: "vanzare", label: "Vânzare imobil", labelEN: "Property sale" },
  { value: "inchiriere", label: "Închiriere", labelEN: "Rental" },
  { value: "receptie", label: "Recepție clădire nouă", labelEN: "New building reception" },
  { value: "informare", label: "Informare proprietar", labelEN: "Owner information" },
  { value: "renovare", label: "Renovare majoră (>25% anvelopă)", labelEN: "Major renovation (>25% envelope)" },
  { value: "autorizare", label: "Autorizare lucrări (L. 372/2005 Art. 8¹)", labelEN: "Building permit (L. 372/2005 Art. 8¹)" },
  { value: "fonduri_PNRR", label: "Accesare fonduri PNRR", labelEN: "PNRR funds application" },
  { value: "fonduri_EEH", label: "Program Casa Eficientă (EEH)", labelEN: "Energy Efficiency Home (EEH)" },
  { value: "cerere_notariat", label: "Cerere pentru notariat / tranzacție", labelEN: "Notary / transaction request" },
  { value: "alt", label: "Alt scop", labelEN: "Other" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tipuri proprietar (Anexa 1 MDLPA 16/2023)
// ─────────────────────────────────────────────────────────────────────────────
export const OWNER_TYPE_OPTIONS = [
  { value: "PF", label: "Persoană fizică", labelEN: "Natural person" },
  { value: "PJ", label: "Persoană juridică (SRL, SA etc.)", labelEN: "Legal entity (LLC etc.)" },
  { value: "PUB", label: "Autoritate publică / UAT / stat", labelEN: "Public authority / state" },
  { value: "ASOC", label: "Asociație de proprietari / locatari", labelEN: "Homeowners association" },
];
