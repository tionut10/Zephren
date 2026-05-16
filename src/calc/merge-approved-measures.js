/**
 * merge-approved-measures.js — Sprint Suggestion Queue C (16 mai 2026)
 *
 * Conectează coada `proposedMeasures` (store) cu cele 3 destinații de export:
 *   1. Anexa 1+2 (CPE oficial) — format {code, priority, category, measure, detail, savings}
 *   2. Raport audit Pas 7 (R4 card) — format {name, recommendation, priority, source, ...}
 *   3. Pașaport renovare (Anexa VIII EPBD) — format {id, name, category, ep_reduction_kWh_m2, ...}
 *
 * Filozofie: măsurile aprobate de auditor în Pas 7 → injectate AUTOMAT în
 * toate documentele oficiale exportate, marcat cu prefix M-AUDITOR/M-MAN
 * pentru trasabilitate Mc 001-2022 §10.
 *
 * Surse normative:
 *   - Mc 001-2022 §10 (soluții de îmbunătățire a performanței energetice)
 *   - Ord. MDLPA 348/2026 Art. 6 alin. 1 (audit energetic AE Ici)
 *   - Ord. MDLPA 348/2026 Anexa nr. 1 (CPE — recomandări reducere consumuri)
 *   - EPBD 2024/1275 Art. 12 + Anexa VIII (pașaport renovare)
 *   - L.372/2005 republicată mod. L.238/2024
 *
 * Acceptă atât "approved" cât și "edited" — auditorul a confirmat explicit
 * măsura cu modificări proprii. "proposed" (default) și "rejected" sunt excluse.
 */

// ─── Categorii → priority default + cod CPE Anexa 2 ──────────────────────────

const CATEGORY_TO_CPE_GROUP = Object.freeze({
  heating:             { group: "Instalații", codePrefix: "B" }, // B1, B2...
  acm:                 { group: "Instalații", codePrefix: "B" },
  cooling:             { group: "Instalații", codePrefix: "B" },
  ventilation:         { group: "Instalații", codePrefix: "B" },
  lighting:            { group: "Iluminat",   codePrefix: "D" }, // D1
  pv:                  { group: "SRE",        codePrefix: "C" }, // C1
  "solar-thermal":     { group: "SRE",        codePrefix: "C" }, // C2
  wind:                { group: "SRE",        codePrefix: "C" },
  biomass:             { group: "SRE",        codePrefix: "C" },
  "heat-pump":         { group: "SRE",        codePrefix: "C" }, // C3
  chp:                 { group: "SRE",        codePrefix: "C" },
  battery:             { group: "SRE",        codePrefix: "C" },
  "envelope-opaque":   { group: "Anvelopă",   codePrefix: "A" }, // A1
  "envelope-glazing":  { group: "Anvelopă",   codePrefix: "A" }, // A2
  "envelope-bridge":   { group: "Anvelopă",   codePrefix: "A" }, // A3
});

const CATEGORY_TO_PRIORITY = Object.freeze({
  // Default priority bazat pe impact energetic tipic în CPE rezidențial
  "envelope-opaque":   "înaltă",   // 15-25% economii potențiale
  "envelope-glazing":  "înaltă",
  heating:             "înaltă",
  "envelope-bridge":   "medie",
  acm:                 "medie",
  ventilation:         "medie",
  "solar-thermal":     "medie",
  pv:                  "medie",
  "heat-pump":         "medie",
  cooling:             "scăzută",
  lighting:            "scăzută",
  biomass:             "medie",
  wind:                "scăzută",
  chp:                 "scăzută",
  battery:             "scăzută",
});

// ─── 1. Conversie pentru CPE Anexa 1+2 / Step6Certificate ───────────────────

/**
 * Convertește o măsură din coada `proposedMeasures` în formatul CPE Anexa 2.
 * Compatibil cu output-ul `generateCpeRecommendations()`.
 *
 * Cod generat: M-CAT-suffix (ex: M-A1-pm_abc) — prefix M-* indică sursă manuală
 * pentru a distinge de cele auto-generate (A1/B1/...).
 *
 * @param {Object} measure — măsură din store (vezi proposed-measures.js)
 * @returns {Object} { code, priority, category, measure, detail, savings }
 */
export function convertMeasureToCpeRecommendation(measure) {
  if (!measure || typeof measure !== "object") return null;

  const meta = CATEGORY_TO_CPE_GROUP[measure.category] || { group: "Altele", codePrefix: "M" };
  const priorityDefault = CATEGORY_TO_PRIORITY[measure.category] || "medie";

  // Cod stabil: M-{Prefix}{shortId} — M = "manual" (vs A/B/C/D auto)
  const shortId = (measure.id || "").replace(/^pm_/, "").slice(0, 8);
  const code = `M-${meta.codePrefix}${shortId || "00"}`;

  // Savings: dacă auditor a editat valori, folosește auditorEdits; altfel
  // text default "estimat audit" pentru a respecta Mc 001-2022 §10.
  let savings = "estimat audit";
  if (measure.auditorEdits?.savings) {
    savings = String(measure.auditorEdits.savings);
  } else if (measure.tech?.SCOP && measure.tech.SCOP > 3.5) {
    // Pompă căldură performantă → 30-50% economii tipice vs cazan gaz baseline
    savings = "30-50%";
  } else if (measure.tech?.efficiency && measure.tech.efficiency > 0.92) {
    // Cazan condensare → 15-25%
    savings = "15-25%";
  } else if (measure.category === "pv" || measure.category === "solar-thermal") {
    savings = "20-40%";
  } else if (measure.category.startsWith("envelope")) {
    savings = "15-25%";
  } else if (measure.category === "lighting") {
    savings = "5-10%";
  }

  // Detail: combinație tehnică + note auditor (dacă există)
  let detail = measure.description || measure.label || "";
  if (measure.auditorNotes) {
    detail = `${detail} | Notă auditor: ${measure.auditorNotes}`;
  }
  // Adaugă date tehnice relevante dacă există
  const techStr = _formatTechSummary(measure.tech);
  if (techStr) {
    detail = `${detail} (${techStr})`;
  }

  return {
    code,
    priority: priorityDefault,
    category: meta.group,
    measure: measure.label || "Măsură auditor",
    detail: detail.trim(),
    savings,
    // Metadata extra (nu rupe compatibilitatea — câmpuri opționale ignorate de render-uri legacy)
    _source: "manual-auditor",
    _measureId: measure.id,
    _proposedAt: measure.proposedAt,
    _sourceStep: measure.sourceStep,
  };
}

function _formatTechSummary(tech) {
  if (!tech || typeof tech !== "object") return "";
  const parts = [];
  if (tech.SCOP != null) parts.push(`SCOP=${tech.SCOP}`);
  if (tech.COP != null) parts.push(`COP=${tech.COP}`);
  if (tech.efficiency != null) parts.push(`η=${tech.efficiency}`);
  if (tech.capacity_kW != null) parts.push(`${tech.capacity_kW}kW`);
  if (tech.kWp != null) parts.push(`${tech.kWp}kWp`);
  if (tech.U != null) parts.push(`U=${tech.U}`);
  if (tech.lambda != null) parts.push(`λ=${tech.lambda}`);
  if (tech.recoveryEff != null) parts.push(`η_HR=${(tech.recoveryEff * 100).toFixed(0)}%`);
  return parts.join(", ");
}

/**
 * Merge măsurile aprobate (status="approved" sau "edited") cu lista de
 * recomandări auto-generate din `generateCpeRecommendations()`.
 *
 * Dedupe: dacă există deja o recomandare auto cu același category + măsură similară,
 * cea manuală o suprascrie (auditorul are autoritate explicită).
 *
 * Sortare: măsurile manuale aprobate apar PRIMELE în listă (prioritate auditor),
 * urmate de cele auto-generate.
 *
 * @param {Array} autoRecs — output din generateCpeRecommendations()
 * @param {Array} approvedMeasures — măsuri din store cu status approved/edited
 * @param {Object} [options]
 * @param {number} [options.maxItems=20] — limită Anexa 2 (default 20)
 * @returns {Array} listă combinată sortată
 */
export function mergeApprovedIntoCpeRecommendations(autoRecs = [], approvedMeasures = [], options = {}) {
  const { maxItems = 20 } = options;
  const safeAuto = Array.isArray(autoRecs) ? autoRecs : [];
  const safeManual = Array.isArray(approvedMeasures) ? approvedMeasures : [];

  // Convertește manuale → format CPE
  const manualRecs = safeManual
    .map(convertMeasureToCpeRecommendation)
    .filter(Boolean);

  // Dedupe: dacă o manuală menționează același catalogEntryId care e implicit
  // în auto-rec, ignorăm auto-rec (manual win). Heuristic: comparăm category +
  // primele 4 cuvinte din measure label.
  const manualSigs = new Set(
    manualRecs.map(r => `${r.category}:${(r.measure || "").toLowerCase().split(/\s+/).slice(0, 4).join("-")}`)
  );

  const filteredAuto = safeAuto.filter(r => {
    const sig = `${r.category}:${(r.measure || "").toLowerCase().split(/\s+/).slice(0, 4).join("-")}`;
    return !manualSigs.has(sig);
  });

  // Manual FIRST (auditorul a ales explicit), apoi auto
  const combined = [...manualRecs, ...filteredAuto];

  // Limită
  if (maxItems > 0 && combined.length > maxItems) {
    return combined.slice(0, maxItems);
  }
  return combined;
}

// ─── 2. Conversie pentru Raport audit Pas 7 (R4 card) ───────────────────────

/**
 * Convertește o măsură din coadă pentru afișarea în card R4 (Pas 7 audit).
 * Format aliniat cu R1 (envelopeAnalysis) / R2 (installAnalysis) / R3 (renewRecommendations).
 *
 * @param {Object} measure
 * @returns {Object} { name, recommendation, priority, source, category, cost, ... }
 */
export function convertMeasureToAuditCard(measure) {
  if (!measure || typeof measure !== "object") return null;

  const priorityDefault = CATEGORY_TO_PRIORITY[measure.category] || "medie";
  const techStr = _formatTechSummary(measure.tech);

  // Cost orientativ — preluat din priceRange dacă există
  let costStr = "";
  if (measure.priceRange?.max != null && measure.priceRange?.min != null) {
    const unit = measure.priceRange.unit || "RON";
    costStr = `${measure.priceRange.min}-${measure.priceRange.max} ${unit}`;
  }

  return {
    id: measure.id,
    name: measure.label,
    category: measure.category,
    recommendation: measure.description || measure.label,
    detail: techStr,
    priority: priorityDefault,
    source: measure.sourceStep, // "Step3" / "Step4" / "manual"
    proposedAt: measure.proposedAt,
    status: measure.status,
    cost: costStr,
    auditorNotes: measure.auditorNotes || null,
  };
}

/**
 * Generează cardurile R4 pentru toate măsurile aprobate.
 */
export function buildR4Cards(approvedMeasures = []) {
  return (Array.isArray(approvedMeasures) ? approvedMeasures : [])
    .map(convertMeasureToAuditCard)
    .filter(Boolean);
}

// ─── 3. Conversie pentru Pașaport renovare (Anexa VIII EPBD) ────────────────

const PASSPORT_CATEGORY_LABELS = Object.freeze({
  heating: "Sistem încălzire",
  acm: "Sistem ACM",
  cooling: "Sistem răcire",
  ventilation: "Ventilare mecanică",
  lighting: "Iluminat",
  pv: "Fotovoltaic",
  "solar-thermal": "Solar termic",
  wind: "Turbină eoliană",
  biomass: "Biomasă",
  "heat-pump": "Pompă căldură",
  chp: "Cogenerare",
  battery: "Stocare electrică",
  "envelope-opaque": "Anvelopă opacă",
  "envelope-glazing": "Anvelopă vitrată",
  "envelope-bridge": "Punți termice",
});

/**
 * Convertește o măsură pentru format Anexa VIII EPBD.
 *
 * Notă: ep_reduction_kWh_m2 / co2_reduction NU sunt calculate aici (au nevoie de
 * context global: suprafață, factor emisie, sezon încălzire). Le lasă 0 dacă
 * auditorul nu a editat — pașaportul va prelua valorile real-calculate din
 * phasedPlan dacă există integrare ulterioară.
 *
 * @param {Object} measure
 * @returns {Object} format roadmap.phases.measures[]
 */
export function convertMeasureToPassportFormat(measure) {
  if (!measure || typeof measure !== "object") return null;

  // Cost RON: priceRange median (sau auditorEdits)
  let costRON = 0;
  if (measure.auditorEdits?.cost_RON) {
    costRON = parseFloat(measure.auditorEdits.cost_RON) || 0;
  } else if (measure.priceRange) {
    const min = parseFloat(measure.priceRange.min) || 0;
    const max = parseFloat(measure.priceRange.max) || 0;
    costRON = (min + max) / 2;
    // Conversie EUR → RON dacă unit indică EUR
    if (measure.priceRange.unit === "EUR" || measure.priceRange.currency === "EUR") {
      costRON *= 5.12; // curs fallback (Sprint Audit Prețuri 9 mai 2026)
    }
  }

  // Lifespan default per categorie (Mc 001-2022 Anexa H — durate de viață tipice)
  const lifespanDefault = {
    heating: 20, acm: 15, cooling: 15, ventilation: 20, lighting: 25,
    pv: 25, "solar-thermal": 20, wind: 20, biomass: 20, "heat-pump": 20,
    chp: 20, battery: 10,
    "envelope-opaque": 30, "envelope-glazing": 30, "envelope-bridge": 50,
  };

  return {
    id: measure.id || `m_${Math.random().toString(36).slice(2, 9)}`,
    name: measure.label || "Măsură auditor",
    category: PASSPORT_CATEGORY_LABELS[measure.category] || measure.category,
    ep_reduction_kWh_m2: parseFloat(measure.auditorEdits?.ep_reduction_kWh_m2) || 0,
    co2_reduction: parseFloat(measure.auditorEdits?.co2_reduction) || 0,
    cost_RON: costRON,
    lifespan_years: lifespanDefault[measure.category] || 20,
    fundingProgram: measure.auditorEdits?.fundingProgram || null,
    // Metadata extra pentru audit trail
    _source: "manual-auditor",
    _measureId: measure.id,
    _proposedAt: measure.proposedAt,
    _sourceStep: measure.sourceStep,
  };
}

/**
 * Construiește o "fază adițională" pentru pașaport care conține toate măsurile
 * aprobate de auditor, dacă nu sunt deja în plan-ul fazat.
 *
 * @param {Array} approvedMeasures
 * @param {number} [year=new Date().getFullYear()] — anul fazei (default an curent)
 * @returns {Object|null} { year, measures, phaseCost_RON, ... } sau null dacă listă goală
 */
export function buildAuditorPhase(approvedMeasures = [], year) {
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const measures = (Array.isArray(approvedMeasures) ? approvedMeasures : [])
    .map(convertMeasureToPassportFormat)
    .filter(Boolean);

  if (measures.length === 0) return null;

  const phaseCost_RON = measures.reduce((s, m) => s + (parseFloat(m.cost_RON) || 0), 0);

  return {
    year: safeYear,
    measures,
    phaseCost_RON,
    cumulativeCost_RON: phaseCost_RON,
    ep_after: 0, // necunoscut fără calcul integrat
    class_after: null,
    annualSaving_RON: 0,
    mepsComplianceAfterPhase: { meps2030: false, meps2033: false },
    _source: "manual-auditor",
  };
}

/**
 * Merge măsurile aprobate în roadmap pașaport existent.
 * Dacă pașaportul are deja faze auto-generate, adăugăm măsurile manuale ca o
 * fază nouă "auditor-extras" în plus.
 *
 * @param {Object} roadmap — { phases, ... } din buildRenovationPassport
 * @param {Array} approvedMeasures
 * @returns {Object} roadmap modificat (clone) cu măsurile auditor incluse
 */
export function mergeApprovedIntoPassportRoadmap(roadmap, approvedMeasures = []) {
  if (!roadmap || typeof roadmap !== "object") return roadmap;
  const auditorPhase = buildAuditorPhase(approvedMeasures);
  if (!auditorPhase) return roadmap;

  const phases = Array.isArray(roadmap.phases) ? [...roadmap.phases] : [];
  // Inserăm auditor phase la final pentru a păstra ordinea temporală a fazelor auto
  phases.push(auditorPhase);

  return {
    ...roadmap,
    phases,
    _auditorPhaseAdded: true,
  };
}
