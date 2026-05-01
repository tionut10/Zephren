/**
 * effectiveGate.js — Sprint Refactor Pas 5 Faza 0 (1 mai 2026)
 *
 * Combină plan-gating (planGating.js) + grade-gating (grade-features.js) într-un
 * verdict unitar pentru fiecare funcționalitate.
 *
 * Filozofia "effectiveGrade" (Sprint v6.3, 27 apr 2026):
 *   Atestatul real al auditorului DOMINĂ peste planul cumpărat.
 *   - Auditor IIci pe plan Pro → rămâne IIci (legal: Art. 6 alin. 2 Ord. 348/2026).
 *   - Auditor Ici pe plan IIci → limitat de plan (comercial), grad rămâne Ici.
 *
 * Verdict efectiv:
 *   allowed = gradeAtLeast(effectiveGrade, minGrade) && planAtLeast(plan, minPlan)
 *
 * @see canEmitForBuilding.js — pentru gating per clădire (categorie + scop)
 * @see grade-features.js     — matricea STEP_FEATURE_GRADE_MATRIX
 * @see planGating.js         — PLAN_FEATURES, resolvePlan, canAccess
 */

import { resolvePlan, getRequiredMdlpaGrade } from "./planGating.js";
import {
  gradeAtLeast,
  planAtLeast,
  getFeatureConfig,
} from "../data/grade-features.js";

/**
 * Calculează gradul efectiv al utilizatorului — cel mai restrictiv dintre
 * gradul real (atestat MDLPA) și gradul cerut de planul cumpărat.
 *
 * @param {string|null} auditorGrad — "Ici" | "IIci" | null
 * @param {string} planId           — id plan canonic (rezolvat)
 * @returns {string|null}
 */
export function computeEffectiveGrade(auditorGrad, planId) {
  const planGrade = getRequiredMdlpaGrade(planId);
  // Atestat real "IIci" sau plan IIci (audit) → limitat la IIci
  if (auditorGrad === "IIci" || planGrade === "IIci") return "IIci";
  // Atestat real "Ici" sau plan Ici/Expert/Birou/Enterprise → Ici
  if (auditorGrad === "Ici" || planGrade === "Ici") return "Ici";
  return null;
}

/**
 * Evaluează verdictul de acces pentru o funcționalitate, combinând plan + grad.
 *
 * @param {object} args
 * @param {string} args.feature        — cheie din STEP_FEATURE_GRADE_MATRIX
 * @param {string} args.plan           — id plan (free/audit/pro/...)
 * @param {string|null} [args.auditorGrad] — grad real auditor ("Ici"|"IIci"|null)
 * @returns {{
 *   allowed: boolean,
 *   reason: string,
 *   mode: string,
 *   label: string|null,
 *   legalRef: string|null,
 *   requiredGrade: string|null,
 *   requiredPlan: string,
 *   effectiveGrade: string|null,
 *   blockedBy: "grade"|"plan"|null
 * }}
 */
export function evaluateGate({ feature, plan, auditorGrad = null }) {
  const config = getFeatureConfig(feature);
  const planId = resolvePlan(plan);
  const effectiveGrade = computeEffectiveGrade(auditorGrad, planId);

  // Feature necunoscut — permis implicit (fail-open pentru forward compat)
  if (!config) {
    return {
      allowed: true,
      reason: "",
      mode: "show",
      label: null,
      legalRef: null,
      requiredGrade: null,
      requiredPlan: "free",
      effectiveGrade,
      blockedBy: null,
    };
  }

  const gradeOk = gradeAtLeast(effectiveGrade, config.minGrade);
  const planOk = planAtLeast(planId, config.minPlan);
  const allowed = gradeOk && planOk;

  let blockedBy = null;
  let reason = "";
  if (!allowed) {
    if (!gradeOk) {
      blockedBy = "grade";
      reason = `Necesită grad MDLPA ${config.minGrade} (Ord. 348/2026 Art. 6).`;
    } else {
      blockedBy = "plan";
      reason = `Necesită plan Zephren ${config.minPlan} sau superior.`;
    }
  }

  return {
    allowed,
    reason,
    mode: config.mode || "show",
    label: config.label || null,
    legalRef: config.legalRef || null,
    requiredGrade: config.minGrade,
    requiredPlan: config.minPlan ?? "free",
    effectiveGrade,
    blockedBy,
  };
}
