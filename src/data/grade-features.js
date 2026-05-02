/**
 * grade-features.js — Sprint Refactor Pas 5 Faza 0 (1 mai 2026)
 *
 * Matricea care leagă fiecare funcționalitate din Pas 5/6/7/8 la:
 *   - gradMdlpa minim cerut (Ord. MDLPA 348/2026 Art. 6)
 *   - planul Zephren minim (pricing v7.0)
 *   - modul de fallback pentru UI cuit blocat (hide / upgrade / simple / show)
 *
 * Filozofie:
 *   - AE IIci vede STRICT ce e necesar pentru CPE locuință (Art. 6 alin. 2):
 *     bilanț, clase, conformitate nZEB, sumar pentru CPE. Restul e ascuns.
 *   - Funcțiile cu valoare comercială generală (cost simplu, benchmark % vs.
 *     județ) sunt vizibile la AE IIci în formă SIMPLE; detaliul → "upgrade".
 *   - Funcțiile EXCLUSIV de audit (NPV, scenarii, GWP detaliat, BACS Anexa B,
 *     penalizări p0-p11 cu breakdown) → "hide" la AE IIci. Sunt mutate în
 *     Pas 7/8, oricum invizibile lor prin maxStep=6.
 *   - mode "upgrade" afișează badge discret cu CTA, NU overlay agresiv
 *     (decizia 27 apr 2026 — UX curat, fără frustrare).
 *
 * Rang grad MDLPA (cumulativ — Ici include drepturile IIci):
 *   null  < IIci < Ici
 *
 * Rang plan Zephren (cumulativ):
 *   free < edu < audit (IIci) < pro (Ici) < expert < birou < enterprise
 */

export const GRADE_RANK = { null: 0, IIci: 1, Ici: 2 };

export const PLAN_RANK = {
  free:       0,
  edu:        1,
  audit:      2,  // AE IIci
  pro:        3,  // AE Ici
  expert:     4,
  birou:      5,
  enterprise: 6,
};

/**
 * Matrice features × grad × plan × mode.
 *
 * Reguli pentru câmpuri:
 *   minGrade  — grad MDLPA cerut: null (oricine), "IIci", "Ici"
 *   minPlan   — plan minim: "free" | "edu" | "audit" | "pro" | "expert" | ...
 *   mode      — comportament la blocaj:
 *                 "show"    — întotdeauna vizibil (no-gate, sanity)
 *                 "hide"    — ascuns total (mutat în alt pas)
 *                 "upgrade" — badge mic cu CTA upgrade (vizibil, dar inert)
 *                 "simple"  — caller furnizează simpleChildren (versiune redusă)
 *   label     — eticheta afișată în badge upgrade (RO)
 *   legalRef  — referință normativă opțională (pentru tooltip/banner)
 */
export const STEP_FEATURE_GRADE_MATRIX = {
  // ────────────────────────────────────────────────────────────
  // Pas 5 — Bilanț energetic global (toți auditorii — §5 Mc 001)
  // ────────────────────────────────────────────────────────────
  energyClass:        { minGrade: null, minPlan: "free", mode: "show",
                        label: "Clasa energetică A+–G" },
  co2Class:           { minGrade: null, minPlan: "free", mode: "show",
                        label: "Clasa de mediu CO₂" },
  dashboardKpi:       { minGrade: null, minPlan: "free", mode: "show",
                        label: "Dashboard sumar EP/CO₂/EF/RER" },
  nzebVerification:   { minGrade: null, minPlan: "free", mode: "show",
                        label: "Verificare nZEB / ZEB (EPBD)" },
  rerCompliance:      { minGrade: null, minPlan: "free", mode: "show",
                        label: "Conformitate RER L.238/2024" },
  monthlyBalance:     { minGrade: null, minPlan: "free", mode: "show",
                        label: "Bilanț lunar quasi-staționar" },
  isoMonthly:         { minGrade: null, minPlan: "free", mode: "show",
                        label: "Tabel ISO 13790 detaliat" },
  primaryFactors:     { minGrade: null, minPlan: "free", mode: "show",
                        label: "Factori conversie energie primară" },
  na2023Toggle:       { minGrade: null, minPlan: "free", mode: "show",
                        label: "Toggle NA:2023 fP_nren" },
  utilityBreakdown:   { minGrade: null, minPlan: "free", mode: "show",
                        label: "Defalcare EF + EP per utilitate" },
  performanceRadar:   { minGrade: null, minPlan: "free", mode: "show",
                        label: "Radar performanță vs. nZEB A+" },
  cpeSummary:         { minGrade: null, minPlan: "free", mode: "show",
                        label: "Sumar final pentru CPE" },
  sankeyFlow:         { minGrade: null, minPlan: "free", mode: "show",
                        label: "Sankey flux energie (intrări/pierderi)" },

  // ────────────────────────────────────────────────────────────
  // Cost & financiar — SPLIT simple/detail
  // ────────────────────────────────────────────────────────────
  costAnnualSimple:   { minGrade: null,  minPlan: "free", mode: "show",
                        label: "Cost anual energie (sumar RON+EUR)" },
  costAnnualDetail:   { minGrade: "Ici", minPlan: "pro",  mode: "upgrade",
                        label: "Cost anual cu preseturi ANRE + tarife custom" },
  rehabCostEstimate:  { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Cost estimativ reabilitare + finanțare" },
  npvCurve:           { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Amortizare investiție NPV 20 ani",
                        legalRef: "Mc 001-2022 §8.5 + EN 15459-1" },
  rehabScenarios:     { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Comparație scenarii reabilitare",
                        legalRef: "Mc 001-2022 Cap. 8" },
  costOptimal:        { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Curbă cost-optim EN 15459",
                        legalRef: "EN 15459-1 + Reg. UE 244/2012" },

  // ────────────────────────────────────────────────────────────
  // EPBD prealabile (cerințe input/proiectare/recomandare)
  // ────────────────────────────────────────────────────────────
  evCharger:          { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Puncte încărcare EV",
                        legalRef: "EPBD 2024/1275 Art. 12" },
  solarReady:         { minGrade: null,  minPlan: "free", mode: "show",
                        label: "Solar-Ready",
                        legalRef: "EPBD 2024/1275 Art. 11" },
  uCompliance:        { minGrade: null,  minPlan: "free", mode: "show",
                        label: "Conformitate U față de nZEB" },
  avValidation:       { minGrade: null,  minPlan: "free", mode: "show",
                        label: "Validare A/V factor" },

  // ────────────────────────────────────────────────────────────
  // Benchmark — SPLIT simple/peer
  // ────────────────────────────────────────────────────────────
  benchmarkSimple:    { minGrade: null,  minPlan: "free", mode: "show",
                        label: "Benchmark medie națională (% vs. județ)" },
  benchmarkPeer:      { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Benchmark referințe Pasivhaus / pre-1990" },

  // ────────────────────────────────────────────────────────────
  // Penalizări p0-p11 — aplicate ÎN EP la toți, breakdown UI doar Ici+
  // ────────────────────────────────────────────────────────────
  penaltiesBreakdown: { minGrade: "Ici", minPlan: "pro",  mode: "hide",
                        label: "Breakdown penalizări p0-p11",
                        legalRef: "Mc 001-2022 §8.10" },

  // ────────────────────────────────────────────────────────────
  // DUAL MODE (simple/detail per grad sau plan)
  // ────────────────────────────────────────────────────────────
  gwpSimple:          { minGrade: "Ici", minPlan: "pro",    mode: "upgrade",
                        label: "GWP — sumar carbon (operațional + estimat)",
                        legalRef: "EPBD 2024/1275 Art. 7" },
  gwpDetail:          { minGrade: "Ici", minPlan: "expert", mode: "upgrade",
                        label: "GWP detaliu lifecycle EN 15978" },
  bacsSimple:         { minGrade: null,  minPlan: "free",   mode: "show",
                        label: "BACS — Selector clase A-D",
                        legalRef: "SR EN ISO 52120-1:2022" },
  bacsDetail:         { minGrade: "Ici", minPlan: "expert", mode: "upgrade",
                        label: "BACS — 200 factori Anexa B detaliat" },
  acmSimple:          { minGrade: null,  minPlan: "free",   mode: "show",
                        label: "ACM Q_w → EP_w (sumar)" },
  acmDetail:          { minGrade: null,  minPlan: "free",   mode: "show",
                        label: "ACM EN 15316-3/5 detaliat" },

  // ────────────────────────────────────────────────────────────
  // Utilitar QA / comparație proiecte
  // ────────────────────────────────────────────────────────────
  compareProjects:    { minGrade: "Ici", minPlan: "expert", mode: "upgrade",
                        label: "Import JSON proiect referință" },

  // ────────────────────────────────────────────────────────────
  // Pas 7 — Documente exclusive AE Ici (Ord. MDLPA 348/2026 Art. 6 alin. 1)
  // ────────────────────────────────────────────────────────────
  nzebReport:         { minGrade: "Ici", minPlan: "pro", mode: "hide",
                        label: "Raport conformare nZEB (fază proiectare)",
                        legalRef: "Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026" },
  auditEnergetic:     { minGrade: "Ici", minPlan: "pro", mode: "hide",
                        label: "Audit energetic Mc 001-2022 + LCC + NPV",
                        legalRef: "Art. 6 alin. (1) lit. b) Ord. MDLPA 348/2026" },
};

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

/**
 * Verifică dacă `actualGrade` îndeplinește cerința `requiredGrade`.
 * Folosește GRADE_RANK (cumulativ: Ici include drepturile IIci).
 */
export function gradeAtLeast(actualGrade, requiredGrade) {
  if (requiredGrade === null || requiredGrade === undefined) return true;
  const actual = GRADE_RANK[actualGrade ?? "null"] ?? 0;
  const required = GRADE_RANK[requiredGrade] ?? 0;
  return actual >= required;
}

/**
 * Verifică dacă `actualPlan` îndeplinește cerința `requiredPlan`.
 * Folosește PLAN_RANK (cumulativ).
 */
export function planAtLeast(actualPlan, requiredPlan) {
  if (!requiredPlan) return true;
  const actual = PLAN_RANK[actualPlan] ?? 0;
  const required = PLAN_RANK[requiredPlan] ?? 0;
  return actual >= required;
}

/**
 * Returnează configurarea unui feature din matrice, sau null dacă nu există.
 */
export function getFeatureConfig(featureKey) {
  return STEP_FEATURE_GRADE_MATRIX[featureKey] || null;
}

/**
 * Returnează lista cheilor features la care un grad are acces (ignoră plan).
 * Util pentru audit drepturi sau debugging UI.
 */
export function getAccessibleFeatures(grade) {
  return Object.entries(STEP_FEATURE_GRADE_MATRIX)
    .filter(([_, cfg]) => gradeAtLeast(grade, cfg.minGrade))
    .map(([key]) => key);
}
