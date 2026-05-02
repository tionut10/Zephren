/**
 * effectiveGate.js — Sprint Refactor Pas 5 Faza 0 (1 mai 2026)
 * Update Opțiunea B (2 mai 2026): SOFT WARNING în perioada de tranziție legală.
 *
 * Combină plan-gating (planGating.js) + grade-gating (grade-features.js) într-un
 * verdict unitar pentru fiecare funcționalitate.
 *
 * Filozofia "effectiveGrade" (Sprint v6.3, 27 apr 2026):
 *   Atestatul real al auditorului DOMINĂ peste planul cumpărat.
 *   - Auditor IIci pe plan Pro → rămâne IIci (legal: Art. 6 alin. 2 Ord. 348/2026).
 *   - Auditor Ici pe plan IIci → limitat de plan (comercial), grad rămâne Ici.
 *
 * SOFT WARNING (Opțiunea B, 2 mai 2026):
 *   În fereastra de tranziție 14.IV.2026 → 11.X.2026 (180 zile), Ord. 2237/2010
 *   coexistă cu Ord. 348/2026 (atestatele vechi rămân valabile pe regimul vechi
 *   până la prelungirea naturală). Portalul electronic MDLPA nu e operațional
 *   până la 8.VII.2026. Pentru a respecta spiritul tranziției, GradeGate
 *   randează children + un banner soft *"din 11.X.2026 această funcție va fi
 *   rezervată AE Ici"* în loc să blocheze.
 *
 *   După 11.X.2026 (sau cu flag `__forceStrictGrade=true` în window pentru
 *   testare timpurie), gating-ul devine strict (allowed=false când blocat).
 *
 * Verdict efectiv:
 *   allowed = gradeAtLeast(effectiveGrade, minGrade) && planAtLeast(plan, minPlan)
 *
 * @see canEmitForBuilding.js — pentru gating per clădire (categorie + scop)
 * @see grade-features.js     — matricea STEP_FEATURE_GRADE_MATRIX
 * @see planGating.js         — PLAN_FEATURES, resolvePlan, canAccess
 * @see auditor-attestation-validity.js — isInTransitionWindow + ORD_2237_REPEAL_DATE
 */

import { resolvePlan, getRequiredMdlpaGrade } from "./planGating.js";
import {
  gradeAtLeast,
  planAtLeast,
  getFeatureConfig,
} from "../data/grade-features.js";
import {
  isInTransitionWindow,
  ORD_2237_REPEAL_DATE,
} from "../calc/auditor-attestation-validity.js";

/**
 * Verifică dacă un override global forțează gating-ul strict înainte de
 * 11.X.2026. Util pentru testare/preview comportament post-tranziție.
 * @returns {boolean}
 */
function isForceStrictMode() {
  if (typeof window === "undefined") return false;
  return window.__forceStrictGrade === true;
}

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
 * @param {Date} [args.now]            — pentru testare; default = new Date()
 * @returns {{
 *   allowed: boolean,
 *   reason: string,
 *   mode: string,
 *   label: string|null,
 *   legalRef: string|null,
 *   requiredGrade: string|null,
 *   requiredPlan: string,
 *   effectiveGrade: string|null,
 *   blockedBy: "grade"|"plan"|null,
 *   inTransition: boolean,
 *   softWarning: string|null,
 *   strictAllowedFromDate: Date|null
 * }}
 */
export function evaluateGate({ feature, plan, auditorGrad = null, now = new Date() }) {
  const config = getFeatureConfig(feature);
  const planId = resolvePlan(plan);
  const effectiveGrade = computeEffectiveGrade(auditorGrad, planId);
  const inTransition = isInTransitionWindow(now) && !isForceStrictMode();

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
      inTransition,
      softWarning: null,
      strictAllowedFromDate: null,
    };
  }

  const gradeOk = gradeAtLeast(effectiveGrade, config.minGrade);
  const planOk = planAtLeast(planId, config.minPlan);
  const strictAllowed = gradeOk && planOk;

  // În perioada de tranziție: dacă gating-ul ar fi blocat doar pe baza gradului
  // (nu și a planului), returnăm allowed=true cu softWarning. Plan-ul rămâne
  // strict (nu e legat de tranziția legală — e separare comercială).
  //
  // ORDINE VERIFICARE: plan FIRST (mai restrictiv UX-wise — CTA upgrade plan e
  // mai actionable decât CTA luare atestat). Dacă plan blochează, niciodată
  // soft warning de tranziție (oricum nu poate accesa funcționalitatea).
  let blockedBy = null;
  let reason = "";
  let softWarning = null;
  let allowed = strictAllowed;

  if (!strictAllowed) {
    if (!planOk) {
      blockedBy = "plan";
      reason = `Necesită plan Zephren ${config.minPlan} sau superior.`;
      // Plan-ul NU se relaxează în tranziție (e separare comercială, nu legală)
    } else {
      // !gradeOk (planOk e true)
      blockedBy = "grade";
      reason = `Necesită grad MDLPA ${config.minGrade} (Ord. 348/2026 Art. 6).`;
      // În tranziție, nu blocăm pe baza gradului — afișăm soft warning
      if (inTransition) {
        const expiryStr = ORD_2237_REPEAL_DATE.toLocaleDateString("ro-RO", {
          day: "2-digit", month: "long", year: "numeric",
        });
        softWarning =
          `Din ${expiryStr} această funcție va fi rezervată auditorilor ` +
          `AE ${config.minGrade} (abrogarea Ord. 2237/2010, Art. 7 Ord. 348/2026). ` +
          `Acum poți accesa pe regimul de tranziție.`;
        allowed = true;       // unblock în tranziție
        blockedBy = null;
        reason = "";
      }
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
    inTransition,
    softWarning,
    strictAllowedFromDate: !strictAllowed && inTransition ? ORD_2237_REPEAL_DATE : null,
  };
}
