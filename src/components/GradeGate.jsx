/**
 * GradeGate.jsx — Sprint Refactor Pas 5 Faza 0 (1 mai 2026)
 *
 * Wrapper React pentru gating dual: grad MDLPA + plan Zephren.
 *
 * Spre deosebire de PlanGate (care verifică DOAR planul), GradeGate aplică
 * regula "effectiveGrade" Sprint v6.3 — atestatul real al auditorului
 * domină peste plan (Art. 6 alin. 2 Ord. MDLPA 348/2026).
 *
 * Utilizare tipică:
 *   <GradeGate feature="npvCurve" plan={user.plan} auditorGrad={auditor.grade}>
 *     <NPVCurveCard ... />
 *   </GradeGate>
 *
 * Cu fallback simplificat pentru AE IIci:
 *   <GradeGate
 *     feature="costAnnualDetail"
 *     plan={user.plan}
 *     auditorGrad={auditor.grade}
 *     simpleChildren={<CostSimpleCard ... />}
 *   >
 *     <CostDetailCard ... />
 *   </GradeGate>
 *
 * Strategie UX (decisă 1 mai 2026):
 *   - mode="hide"    → null total (decizia "audit-only feature")
 *   - mode="upgrade" → badge mic discret (NU overlay agresiv)
 *   - mode="simple"  → caller furnizează simpleChildren (versiune redusă)
 *   - mode="show"    → no-op (sanity)
 */

import React from "react";
import { evaluateGate } from "../lib/effectiveGate.js";

const PLAN_LABELS = {
  free:       "Free",
  edu:        "Edu",
  audit:      "AE IIci",
  pro:        "AE Ici",
  expert:     "Expert",
  birou:      "Birou",
  enterprise: "Enterprise",
};

const GRADE_LABELS = {
  IIci: "AE IIci",
  Ici:  "AE Ici",
};

/**
 * Wrapper principal.
 *
 * @param {object} props
 * @param {string} props.feature                    — cheie matrice STEP_FEATURE_GRADE_MATRIX
 * @param {string} props.plan                       — plan curent al userului
 * @param {string|null} [props.auditorGrad]         — grad real auditor (din profil)
 * @param {React.ReactNode} props.children          — UI gated
 * @param {React.ReactNode} [props.simpleChildren]  — UI fallback redus pentru IIci/free
 * @param {("auto"|"hide"|"upgrade")} [props.fallbackMode]  — override mode din matrice
 * @param {function} [props.onUpgradeClick]         — handler click CTA upgrade
 */
export default function GradeGate({
  feature,
  plan,
  auditorGrad = null,
  children,
  simpleChildren,
  fallbackMode = "auto",
  onUpgradeClick,
}) {
  const verdict = evaluateGate({ feature, plan, auditorGrad });

  if (verdict.allowed) return <>{children}</>;

  // Caller a furnizat versiune simplificată — o folosim întotdeauna ca fallback
  if (simpleChildren !== undefined && simpleChildren !== null) {
    return <>{simpleChildren}</>;
  }

  const mode = fallbackMode === "auto" ? verdict.mode : fallbackMode;

  if (mode === "hide" || mode === "show" || mode === "simple") {
    // "show" cu allowed=false e bug logic; "simple" fără simpleChildren = null
    return null;
  }

  // mode === "upgrade" — badge discret (decizia 1 mai 2026 — UX curat)
  const targetLabel = verdict.requiredGrade
    ? GRADE_LABELS[verdict.requiredGrade]
    : PLAN_LABELS[verdict.requiredPlan] || verdict.requiredPlan;

  return (
    <div
      role="region"
      aria-label={verdict.label || feature}
      className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5"
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span aria-hidden="true" className="opacity-50">🔒</span>
        <span className="flex-1 font-semibold opacity-70 truncate">
          {verdict.label || feature}
        </span>
        <span
          className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20"
          title={verdict.reason}
        >
          {targetLabel}
        </span>
      </div>
      {(verdict.reason || verdict.legalRef) && (
        <div className="text-[10px] opacity-40 mt-1 leading-snug">
          {verdict.reason}
          {verdict.legalRef && (
            <span className="ml-1 opacity-70">· {verdict.legalRef}</span>
          )}
        </div>
      )}
      {onUpgradeClick && (
        <button
          type="button"
          onClick={onUpgradeClick}
          className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
        >
          Upgrade →
        </button>
      )}
    </div>
  );
}

/**
 * Hook pentru gating inline (verdict fără randare).
 *
 * @example
 *   const { allowed, mode, label, requiredGrade } = useGradeGate(
 *     "costAnnualDetail", user.plan, auditor.grade
 *   );
 *   if (!allowed) return <SimpleVariant />;
 */
export function useGradeGate(feature, plan, auditorGrad = null) {
  return React.useMemo(
    () => evaluateGate({ feature, plan, auditorGrad }),
    [feature, plan, auditorGrad]
  );
}
