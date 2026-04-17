/**
 * bacs-en15232.js — @deprecated Evaluare detaliată BACS (EN 15232-1:2017)
 *
 * @deprecated Sprint 5 (17 apr 2026) — EN 15232-1:2017 a fost arhivat aprilie
 * 2022 și înlocuit de SR EN ISO 52120-1:2022. Folosește `bacs-iso52120.js`
 * pentru factori f_BAC, evaluare obligativitate EPBD Art. 14 și mapare SRI.
 *
 * Acest modul rămâne DOAR pentru compatibilitate retroactivă cu:
 *   - `__tests__/bacs-en15232.test.js` (teste de regresie pe BACS_FUNCTIONS)
 *   - eventuale rapoarte vechi care invocă `evaluateBACS()`
 *
 * Pentru calcule noi folosește:
 *   - `applyBACSFactor(Q_raw, utility, category, bacsClass)` — ISO 52120 Anexa B
 *   - `calcBACSImpact(raw, category, bacsClass)` — breakdown per sistem
 *   - `checkBACSMandatoryISO({ category, hvacPower })` — verificare EPBD Art. 14
 *
 * Referințe istorice:
 * - EN 15232-1:2017 — ARHIVAT aprilie 2022 (înlocuit ISO 52120)
 * - SR EN ISO 52120-1:2022 — standard în vigoare (ASRO iulie 2022)
 * - EPBD 2024/1275 Art.14 — Obligativitate BACS clădiri nerezidențiale >290 kW
 */

// Re-export factori ISO 52120 pentru codul care încă importă din acest fișier
export {
  BACS_FACTORS_ISO52120,
  BACS_CLASS_LABELS,
  applyBACSFactor,
  calcBACSImpact,
  getBACSFactors,
  getBACSCategoryFromCode,
  checkBACSMandatoryISO,
  sriScoreToBACSClass,
  sriScoreLevel,
  ISO_52120_REFERENCE,
} from "./bacs-iso52120.js";

// 15 funcții BACS evaluate individual — fiecare cu clasă A-D
// Clasele corespund nivelului de automatizare per funcție
export const BACS_FUNCTIONS = [
  // ── ÎNCĂLZIRE (4 funcții) ──────────────────────────────────────
  { id: "H1", group: "Încălzire", name: "Control emitere căldură", weight: 0.12,
    levels: {
      D: "Manual (robinet termostat simplu)",
      C: "Termostat de cameră ON/OFF",
      B: "Termostat individual cu programare + PI control",
      A: "Control predictiv cu auto-adaptare + senzori prezență",
    }},
  { id: "H2", group: "Încălzire", name: "Control generare căldură", weight: 0.08,
    levels: {
      D: "Fără control automat (manual on/off)",
      C: "Compensare cu curba climatică (OTC)",
      B: "OTC cu optimizare pornire/oprire",
      A: "Optimizare continuă cu predicție meteo + învățare",
    }},
  { id: "H3", group: "Încălzire", name: "Control distribuție căldură", weight: 0.05,
    levels: {
      D: "Fără control pompe circulație",
      C: "Pompe viteza constantă cu programare",
      B: "Pompe viteza variabilă controlate pe presiune diferențială",
      A: "Pompe variabile cu optimizare debit per zonă",
    }},
  { id: "H4", group: "Încălzire", name: "Funcționare intermitentă", weight: 0.05,
    levels: {
      D: "Funcționare continuă fără programare",
      C: "Programare simplă (timer)",
      B: "Programare avansată pe zone cu setback",
      A: "Programare adaptivă cu optimizare start/stop + senzori ocupare",
    }},
  // ── VENTILARE (3 funcții) ───────────────────────────────────────
  { id: "V1", group: "Ventilare", name: "Control debit aer proaspăt", weight: 0.10,
    levels: {
      D: "Fără control (ventilare naturală nereglabilă)",
      C: "Control manual (grile reglabile)",
      B: "Control automat pe program (debite constante programate)",
      A: "Control pe cerere (senzori CO₂/prezență + debit variabil)",
    }},
  { id: "V2", group: "Ventilare", name: "Recuperare căldură ventilare", weight: 0.08,
    levels: {
      D: "Fără recuperare",
      C: "Recuperare fixă (η < 65%)",
      B: "Recuperare performantă (η 65-80%) cu bypass vară",
      A: "Recuperare entalpică (η > 80%) cu bypass + control antigel",
    }},
  { id: "V3", group: "Ventilare", name: "Free-cooling / ventilare nocturnă", weight: 0.05,
    levels: {
      D: "Neimplementat",
      C: "Manual (ferestre deschise noaptea)",
      B: "Automatic cu setpoint temperatura exterioară",
      A: "Automatic cu optimizare termică (masă termică + previziune meteo)",
    }},
  // ── ILUMINAT (3 funcții) ────────────────────────────────────────
  { id: "L1", group: "Iluminat", name: "Control ocupare iluminat", weight: 0.08,
    levels: {
      D: "Manual ON/OFF (comutator simplu)",
      C: "Manual ON / auto OFF (timer după 15 min)",
      B: "Senzori prezență auto ON/OFF per zonă",
      A: "Senzori prezență + dimming automat per activitate",
    }},
  { id: "L2", group: "Iluminat", name: "Control lumină naturală", weight: 0.07,
    levels: {
      D: "Fără control (iluminat constant)",
      C: "Zonare manuală (rânduri de corpuri pe/lângă fereastră)",
      B: "Dimming automat funcție de lumină naturală (senzor lux)",
      A: "Dimming + comutare automată + control jaluzele coordonat",
    }},
  { id: "L3", group: "Iluminat", name: "Eficiență energetică corpuri", weight: 0.05,
    levels: {
      D: "Incandescent / halogen (> 15 W/m²)",
      C: "Fluorescent (8-12 W/m²)",
      B: "LED standard (4-6 W/m²)",
      A: "LED high-efficacy cu driver inteligent (< 4 W/m²)",
    }},
  // ── JALUZELE (2 funcții) ────────────────────────────────────────
  { id: "S1", group: "Protecție solară", name: "Control jaluzele / umbrire", weight: 0.06,
    levels: {
      D: "Fără jaluzele exterioare / fixe",
      C: "Manual (utilizatorul reglează)",
      B: "Automatic pe radiație solară (senzor + motor)",
      A: "Automatic combinat: radiație + temperatură interioară + iluminat + vânt",
    }},
  { id: "S2", group: "Protecție solară", name: "Integrare cu HVAC", weight: 0.04,
    levels: {
      D: "Neintegrat",
      C: "Integrare parțială (jaluzele și HVAC operate separat)",
      B: "Coordonare jaluzele-răcire (umbrire activă când AC funcționează)",
      A: "Coordonare completă: jaluzele + HVAC + iluminat + free-cooling",
    }},
  // ── GENERARE / STOCARE (2 funcții) ──────────────────────────────
  { id: "G1", group: "Generare energie", name: "Gestionare sursă regenerabilă", weight: 0.07,
    levels: {
      D: "Fără sursă regenerabilă",
      C: "Producție PV/solar fără gestionare (inject total în rețea)",
      B: "Auto-consum prioritar + export surplus",
      A: "Auto-consum optimizat + stocare baterie + V2G + demand response",
    }},
  { id: "G2", group: "Generare energie", name: "Stocare energie", weight: 0.05,
    levels: {
      D: "Fără stocare",
      C: "Stocare termică (vas tampon) fără control inteligent",
      B: "Stocare termică + electrică (baterie) cu programare",
      A: "Stocare multi-energie cu optimizare cost/emisii + grid services",
    }},
  // ── MONITORING (1 funcție) ──────────────────────────────────────
  { id: "M1", group: "Monitoring", name: "Monitorizare și raportare energie", weight: 0.05,
    levels: {
      D: "Fără monitorizare (doar contoare de facturare)",
      C: "Contorizare pe utilități (electricitate, gaz, apă)",
      B: "Sub-contorizare per zonă/sistem + dashboard cu alarme",
      A: "Monitoring continuu + analiză AI + raportare automată + benchmarking",
    }},
];

const CLASS_SCORE = { A: 4, B: 3, C: 2, D: 1 };

/**
 * Evaluare detaliată BACS — clasă per funcție + clasă globală
 * @param {Object} evaluation - { H1: "A", H2: "B", V1: "C", ... } — clasă per funcție
 * @param {boolean} isResidential - clădire rezidențială?
 * @returns {Object} rezultat evaluare
 */
export function evaluateBACS(evaluation, isResidential = false) {
  if (!evaluation || typeof evaluation !== "object") return null;

  let totalWeightedScore = 0;
  let totalWeight = 0;
  const details = [];

  for (const func of BACS_FUNCTIONS) {
    const cls = evaluation[func.id] || "D";
    const score = CLASS_SCORE[cls] || 1;
    const weightedScore = score * func.weight;
    totalWeightedScore += weightedScore;
    totalWeight += func.weight;

    details.push({
      id: func.id,
      group: func.group,
      name: func.name,
      class: cls,
      score,
      description: func.levels[cls] || "",
      weight: func.weight,
    });
  }

  // Scor normalizat 0-100
  const normalizedScore = totalWeight > 0
    ? Math.round((totalWeightedScore / totalWeight - 1) / 3 * 100)
    : 0;

  // Clasă globală BACS
  const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 1;
  let globalClass;
  if (avgScore >= 3.5) globalClass = "A";
  else if (avgScore >= 2.5) globalClass = "B";
  else if (avgScore >= 1.5) globalClass = "C";
  else globalClass = "D";

  // Economii estimate per clasă globală (EN 15232-1 Tabel 6)
  const savingsPct = isResidential
    ? { A: 33, B: 17, C: 0, D: -51 }
    : { A: 40, B: 22, C: 0, D: -35 };
  const estimatedSavings = savingsPct[globalClass] || 0;

  // Funcții care necesită îmbunătățire (cele mai slabe)
  const weakFunctions = details
    .filter(d => d.score <= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Grupare per categorie
  const byGroup = {};
  for (const d of details) {
    if (!byGroup[d.group]) byGroup[d.group] = { functions: [], avgScore: 0 };
    byGroup[d.group].functions.push(d);
  }
  for (const g of Object.values(byGroup)) {
    g.avgScore = Math.round(g.functions.reduce((s, f) => s + f.score, 0) / g.functions.length * 10) / 10;
    g.class = g.avgScore >= 3.5 ? "A" : g.avgScore >= 2.5 ? "B" : g.avgScore >= 1.5 ? "C" : "D";
  }

  // Conformitate EPBD Art.14
  const epbd14Compliant = globalClass <= "B"; // EPBD cere minim clasa B pentru clădiri >290kW

  return {
    globalClass,
    normalizedScore,
    estimatedSavings,
    details,
    byGroup,
    weakFunctions,
    epbd14Compliant,
    verdict: globalClass === "A" ? "Clădire inteligentă — performanță maximă BACS" :
             globalClass === "B" ? "Automatizare avansată — conform EPBD Art.14" :
             globalClass === "C" ? "Automatizare de bază — necesită upgrade pentru conformitate" :
             "Fără automatizare semnificativă — investiție BACS necesară",
    color: globalClass === "A" ? "#22c55e" : globalClass === "B" ? "#84cc16" :
           globalClass === "C" ? "#eab308" : "#ef4444",
    recommendations: weakFunctions.map(f =>
      `${f.name}: upgrade de la ${f.class} la ${f.score === 1 ? "C" : "B"} — ${BACS_FUNCTIONS.find(bf => bf.id === f.id)?.levels[f.score === 1 ? "C" : "B"] || ""}`
    ),
    reference: "SR EN ISO 52120-1:2022 (înlocuiește EN 15232-1:2017 arhivat)",
  };
}
