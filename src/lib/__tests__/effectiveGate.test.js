/**
 * effectiveGate.test.js — Sprint Refactor Pas 5 Faza 0 (1 mai 2026)
 * Update Opțiunea B (2 mai 2026): teste pentru SOFT WARNING în perioada de tranziție.
 *
 * Acoperă:
 *   - Matricea STEP_FEATURE_GRADE_MATRIX — integritate (mode valid, count minim)
 *   - gradeAtLeast / planAtLeast — semantica cumulativă
 *   - computeEffectiveGrade — regula Sprint v6.3 (atestat real domină)
 *   - evaluateGate — verdict POST-tranziție (strict) + ÎN-tranziție (soft warning)
 *   - getAccessibleFeatures — listing per grad
 *
 * Notă: Folosim `now` parametru pentru a controla fereastra:
 *   - IN_TRANSITION: 2026-05-15 (înainte de 11.X.2026 → soft warning activ)
 *   - POST_TRANSITION: 2027-01-01 (după 11.X.2026 → gating strict activ)
 */

import { describe, it, expect } from "vitest";
import { evaluateGate, computeEffectiveGrade } from "../effectiveGate.js";
import {
  STEP_FEATURE_GRADE_MATRIX,
  gradeAtLeast,
  planAtLeast,
  getAccessibleFeatures,
  getFeatureConfig,
  GRADE_RANK,
  PLAN_RANK,
} from "../../data/grade-features.js";

// ── Constante temporale pentru testare deterministă ──
const IN_TRANSITION   = new Date("2026-05-15T00:00:00.000Z");  // în fereastră
const POST_TRANSITION = new Date("2027-01-01T00:00:00.000Z");  // după abrogare

// ════════════════════════════════════════════════════════════════
// Matricea — integritate
// ════════════════════════════════════════════════════════════════
describe("STEP_FEATURE_GRADE_MATRIX integritate", () => {
  it("are minim 25 entries (Pas 5 + DUAL MODE + EPBD + financiar)", () => {
    expect(Object.keys(STEP_FEATURE_GRADE_MATRIX).length).toBeGreaterThanOrEqual(25);
  });

  it("toate entries au mode valid (show/hide/upgrade/simple)", () => {
    const validModes = ["show", "hide", "upgrade", "simple"];
    Object.entries(STEP_FEATURE_GRADE_MATRIX).forEach(([key, cfg]) => {
      expect(validModes).toContain(cfg.mode);
    });
  });

  it("toate entries au minPlan valid", () => {
    const validPlans = Object.keys(PLAN_RANK);
    Object.entries(STEP_FEATURE_GRADE_MATRIX).forEach(([key, cfg]) => {
      expect(validPlans).toContain(cfg.minPlan);
    });
  });

  it("toate entries au minGrade null sau IIci sau Ici", () => {
    Object.entries(STEP_FEATURE_GRADE_MATRIX).forEach(([key, cfg]) => {
      expect([null, "IIci", "Ici"]).toContain(cfg.minGrade);
    });
  });

  it("toate entries au label string ne-vid", () => {
    Object.entries(STEP_FEATURE_GRADE_MATRIX).forEach(([key, cfg]) => {
      expect(typeof cfg.label).toBe("string");
      expect(cfg.label.length).toBeGreaterThan(0);
    });
  });

  it("npvCurve și rehabScenarios sunt mode='hide' (audit-only Pas 7)", () => {
    expect(STEP_FEATURE_GRADE_MATRIX.npvCurve.mode).toBe("hide");
    expect(STEP_FEATURE_GRADE_MATRIX.rehabScenarios.mode).toBe("hide");
  });

  it("costAnnualSimple și benchmarkSimple sunt mode='show' (vizibile la IIci)", () => {
    expect(STEP_FEATURE_GRADE_MATRIX.costAnnualSimple.mode).toBe("show");
    expect(STEP_FEATURE_GRADE_MATRIX.benchmarkSimple.mode).toBe("show");
  });

  it("gwpDetail și bacsDetail au minPlan='expert' (Step 8)", () => {
    expect(STEP_FEATURE_GRADE_MATRIX.gwpDetail.minPlan).toBe("expert");
    expect(STEP_FEATURE_GRADE_MATRIX.bacsDetail.minPlan).toBe("expert");
  });
});

// ════════════════════════════════════════════════════════════════
// gradeAtLeast — ierarhia null < IIci < Ici
// ════════════════════════════════════════════════════════════════
describe("gradeAtLeast — semantică cumulativă", () => {
  it("cerință null e satisfăcută de oricine", () => {
    expect(gradeAtLeast(null, null)).toBe(true);
    expect(gradeAtLeast("IIci", null)).toBe(true);
    expect(gradeAtLeast("Ici", null)).toBe(true);
  });

  it("IIci satisface IIci", () => {
    expect(gradeAtLeast("IIci", "IIci")).toBe(true);
  });

  it("IIci NU satisface Ici", () => {
    expect(gradeAtLeast("IIci", "Ici")).toBe(false);
  });

  it("Ici satisface ambele (IIci și Ici) — drepturi cumulative", () => {
    expect(gradeAtLeast("Ici", "IIci")).toBe(true);
    expect(gradeAtLeast("Ici", "Ici")).toBe(true);
  });

  it("null grade NU satisface IIci sau Ici", () => {
    expect(gradeAtLeast(null, "IIci")).toBe(false);
    expect(gradeAtLeast(null, "Ici")).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// planAtLeast
// ════════════════════════════════════════════════════════════════
describe("planAtLeast — ierarhie planuri", () => {
  it("expert satisface pro și audit", () => {
    expect(planAtLeast("expert", "pro")).toBe(true);
    expect(planAtLeast("expert", "audit")).toBe(true);
  });

  it("audit NU satisface pro", () => {
    expect(planAtLeast("audit", "pro")).toBe(false);
  });

  it("free NU satisface niciun plan plătit", () => {
    expect(planAtLeast("free", "audit")).toBe(false);
    expect(planAtLeast("free", "pro")).toBe(false);
    expect(planAtLeast("free", "expert")).toBe(false);
  });

  it("enterprise satisface tot", () => {
    Object.keys(PLAN_RANK).forEach(plan => {
      expect(planAtLeast("enterprise", plan)).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// computeEffectiveGrade — Sprint v6.3 rule
// ════════════════════════════════════════════════════════════════
describe("computeEffectiveGrade — atestat real domină", () => {
  it("auditor IIci pe plan pro → effectiveGrade = IIci (atestat domină)", () => {
    expect(computeEffectiveGrade("IIci", "pro")).toBe("IIci");
  });

  it("auditor IIci pe plan expert → effectiveGrade = IIci", () => {
    expect(computeEffectiveGrade("IIci", "expert")).toBe("IIci");
  });

  it("auditor Ici pe plan audit → effectiveGrade = IIci (plan limitează)", () => {
    expect(computeEffectiveGrade("Ici", "audit")).toBe("IIci");
  });

  it("auditor null pe plan pro → effectiveGrade = Ici (din plan)", () => {
    expect(computeEffectiveGrade(null, "pro")).toBe("Ici");
  });

  it("auditor null pe plan free → effectiveGrade = null", () => {
    expect(computeEffectiveGrade(null, "free")).toBe(null);
  });

  it("auditor null pe plan audit → effectiveGrade = IIci (din plan)", () => {
    expect(computeEffectiveGrade(null, "audit")).toBe("IIci");
  });
});

// ════════════════════════════════════════════════════════════════
// evaluateGate — POST tranziție (strict, după 11.X.2026)
// ════════════════════════════════════════════════════════════════
describe("evaluateGate — IIci STRICT post-11.X.2026 (Art. 6 alin. 2)", () => {
  it("VEDE costAnnualSimple (vizibil la IIci pentru vânzare locuință)", () => {
    const v = evaluateGate({ feature: "costAnnualSimple", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.allowed).toBe(true);
    expect(v.effectiveGrade).toBe("IIci");
  });

  it("VEDE benchmarkSimple (% vs. județ)", () => {
    expect(evaluateGate({ feature: "benchmarkSimple", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(true);
  });

  it("VEDE bacsSimple (selector A-D, EPBD obligatoriu)", () => {
    expect(evaluateGate({ feature: "bacsSimple", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(true);
  });

  it("NU VEDE costAnnualDetail (ANRE preseturi → AE Ici+)", () => {
    const v = evaluateGate({ feature: "costAnnualDetail", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.allowed).toBe(false);
    expect(v.requiredGrade).toBe("Ici");
    expect(v.blockedBy).toBe("grade");
    expect(v.softWarning).toBe(null);
    expect(v.inTransition).toBe(false);
  });

  it("NU VEDE npvCurve (audit-only, mode=hide)", () => {
    const v = evaluateGate({ feature: "npvCurve", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.allowed).toBe(false);
    expect(v.mode).toBe("hide");
    expect(v.legalRef).toMatch(/EN 15459/);
  });

  it("NU VEDE rehabScenarios (Cap. 8 audit)", () => {
    expect(evaluateGate({ feature: "rehabScenarios", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(false);
  });

  it("NU VEDE gwpSimple sau gwpDetail (rezidențial mic neobligatoriu)", () => {
    expect(evaluateGate({ feature: "gwpSimple", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(false);
    expect(evaluateGate({ feature: "gwpDetail", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(false);
  });

  it("NU VEDE bacsDetail (ISO 52120 Anexa B → Step 8 Expert)", () => {
    const v = evaluateGate({ feature: "bacsDetail", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.allowed).toBe(false);
  });

  it("NU VEDE penaltiesBreakdown (UI listă p0-p11 → audit)", () => {
    expect(evaluateGate({ feature: "penaltiesBreakdown", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(false);
  });

  it("NU VEDE evCharger (EPBD Art. 12 = recomandare audit)", () => {
    expect(evaluateGate({ feature: "evCharger", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION }).allowed).toBe(false);
  });
});

describe("evaluateGate — Ici STRICT post-11.X.2026 (Art. 6 alin. 1)", () => {
  it("VEDE costAnnualDetail, npvCurve, rehabScenarios", () => {
    expect(evaluateGate({ feature: "costAnnualDetail", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
    expect(evaluateGate({ feature: "npvCurve", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
    expect(evaluateGate({ feature: "rehabScenarios", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
  });

  it("VEDE penaltiesBreakdown, evCharger, gwpSimple", () => {
    expect(evaluateGate({ feature: "penaltiesBreakdown", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
    expect(evaluateGate({ feature: "evCharger", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
    expect(evaluateGate({ feature: "gwpSimple", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(true);
  });

  it("NU VEDE gwpDetail / bacsDetail / compareProjects (Step 8 Expert)", () => {
    const v1 = evaluateGate({ feature: "gwpDetail", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION });
    expect(v1.allowed).toBe(false);
    expect(v1.blockedBy).toBe("plan");
    expect(v1.requiredPlan).toBe("expert");

    expect(evaluateGate({ feature: "bacsDetail", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(false);
    expect(evaluateGate({ feature: "compareProjects", plan: "pro", auditorGrad: "Ici", now: POST_TRANSITION }).allowed).toBe(false);
  });

  it("Ici pe plan expert vede TOATE features", () => {
    Object.keys(STEP_FEATURE_GRADE_MATRIX).forEach(feature => {
      const v = evaluateGate({ feature, plan: "expert", auditorGrad: "Ici", now: POST_TRANSITION });
      expect(v.allowed).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// evaluateGate — atestat real domină plan superior (post-tranziție)
// ════════════════════════════════════════════════════════════════
describe("evaluateGate — atestat real IIci pe plan superior (post-tranziție)", () => {
  it("auditor IIci pe plan pro NU vede npvCurve (gradul real domină)", () => {
    const v = evaluateGate({ feature: "npvCurve", plan: "pro", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.effectiveGrade).toBe("IIci");
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toBe("grade");
  });

  it("auditor IIci pe plan expert NU vede gwpDetail", () => {
    const v = evaluateGate({ feature: "gwpDetail", plan: "expert", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.effectiveGrade).toBe("IIci");
    expect(v.allowed).toBe(false);
  });

  it("auditor Ici pe plan audit limitat de PLAN la IIci pentru gwpDetail", () => {
    const v = evaluateGate({ feature: "gwpDetail", plan: "audit", auditorGrad: "Ici", now: POST_TRANSITION });
    expect(v.effectiveGrade).toBe("IIci");
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toBe("grade");
  });
});

// ════════════════════════════════════════════════════════════════
// evaluateGate — SOFT WARNING în fereastra de tranziție (Opțiunea B)
// ════════════════════════════════════════════════════════════════
describe("evaluateGate — SOFT WARNING în tranziție 14.IV.2026 → 11.X.2026", () => {
  it("inTransition=true în fereastra de tranziție", () => {
    const v = evaluateGate({ feature: "energyClass", plan: "audit", auditorGrad: "IIci", now: IN_TRANSITION });
    expect(v.inTransition).toBe(true);
  });

  it("inTransition=false după 11.X.2026", () => {
    const v = evaluateGate({ feature: "energyClass", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.inTransition).toBe(false);
  });

  it("IIci VEDE npvCurve în tranziție (allowed=true + softWarning)", () => {
    const v = evaluateGate({ feature: "npvCurve", plan: "audit", auditorGrad: "IIci", now: IN_TRANSITION });
    expect(v.allowed).toBe(true);
    expect(v.softWarning).toMatch(/AE Ici/);
    expect(v.softWarning).toMatch(/octombrie 2026/);
    expect(v.blockedBy).toBe(null);
    expect(v.strictAllowedFromDate).toBeInstanceOf(Date);
  });

  it("IIci VEDE costAnnualDetail, rehabScenarios, gwpSimple, bacsDetail, evCharger în tranziție", () => {
    ["costAnnualDetail", "rehabScenarios", "gwpSimple", "evCharger", "penaltiesBreakdown"].forEach(feature => {
      const v = evaluateGate({ feature, plan: "audit", auditorGrad: "IIci", now: IN_TRANSITION });
      expect(v.allowed).toBe(true);
      expect(v.softWarning).toBeTruthy();
    });
  });

  it("Plan-ul rămâne strict ÎN TRANZIȚIE (separare comercială, nu legală)", () => {
    // Auditor Ici pe plan audit cere gwpDetail (minPlan=expert) — blocat de plan,
    // NU se relaxează în tranziție (e diferențiator comercial Zephren, nu legal).
    const v = evaluateGate({ feature: "gwpDetail", plan: "pro", auditorGrad: "Ici", now: IN_TRANSITION });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toBe("plan");
    expect(v.requiredPlan).toBe("expert");
    expect(v.softWarning).toBe(null);  // doar grad-blocking primește soft warning
  });

  it("Feature deja permis (energyClass) NU primește softWarning", () => {
    const v = evaluateGate({ feature: "energyClass", plan: "audit", auditorGrad: "IIci", now: IN_TRANSITION });
    expect(v.allowed).toBe(true);
    expect(v.softWarning).toBe(null);
  });

  it("strictAllowedFromDate = 11.X.2026 când în tranziție și grad-blocked", () => {
    const v = evaluateGate({ feature: "npvCurve", plan: "audit", auditorGrad: "IIci", now: IN_TRANSITION });
    expect(v.strictAllowedFromDate).toBeInstanceOf(Date);
    expect(v.strictAllowedFromDate.getUTCFullYear()).toBe(2026);
    expect(v.strictAllowedFromDate.getUTCMonth()).toBe(9);   // October (0-indexed)
    expect(v.strictAllowedFromDate.getUTCDate()).toBe(11);
  });
});

// ════════════════════════════════════════════════════════════════
// evaluateGate — free / unknown
// ════════════════════════════════════════════════════════════════
describe("evaluateGate — free plan & feature necunoscut", () => {
  it("free vede feature-uri de bază (energyClass, monthlyBalance)", () => {
    expect(evaluateGate({ feature: "energyClass", plan: "free", auditorGrad: null, now: POST_TRANSITION }).allowed).toBe(true);
    expect(evaluateGate({ feature: "monthlyBalance", plan: "free", auditorGrad: null, now: POST_TRANSITION }).allowed).toBe(true);
  });

  it("free NU vede features audit-only POST tranziție", () => {
    expect(evaluateGate({ feature: "npvCurve", plan: "free", auditorGrad: null, now: POST_TRANSITION }).allowed).toBe(false);
    expect(evaluateGate({ feature: "rehabScenarios", plan: "free", auditorGrad: null, now: POST_TRANSITION }).allowed).toBe(false);
  });

  it("feature necunoscut → fail-open (allowed=true)", () => {
    const v = evaluateGate({ feature: "_nonexistent_", plan: "audit", auditorGrad: "IIci", now: POST_TRANSITION });
    expect(v.allowed).toBe(true);
    expect(v.mode).toBe("show");
  });
});

// ════════════════════════════════════════════════════════════════
// getAccessibleFeatures — listing per grad
// ════════════════════════════════════════════════════════════════
describe("getAccessibleFeatures", () => {
  it("null grade returnează doar features cu minGrade=null", () => {
    const feats = getAccessibleFeatures(null);
    expect(feats).toContain("energyClass");
    expect(feats).toContain("monthlyBalance");
    expect(feats).not.toContain("npvCurve");
    expect(feats).not.toContain("gwpDetail");
  });

  it("Ici returnează strict mai multe features decât IIci", () => {
    const ici = getAccessibleFeatures("Ici");
    const iici = getAccessibleFeatures("IIci");
    expect(ici.length).toBeGreaterThan(iici.length);
  });

  it("Ici include toate features accesibile IIci (cumulativ)", () => {
    const ici = new Set(getAccessibleFeatures("Ici"));
    const iici = getAccessibleFeatures("IIci");
    iici.forEach(f => expect(ici.has(f)).toBe(true));
  });
});

// ════════════════════════════════════════════════════════════════
// getFeatureConfig — lookup
// ════════════════════════════════════════════════════════════════
describe("getFeatureConfig", () => {
  it("returnează config pentru feature existent", () => {
    const cfg = getFeatureConfig("npvCurve");
    expect(cfg).toBeTruthy();
    expect(cfg.minGrade).toBe("Ici");
    expect(cfg.mode).toBe("hide");
  });

  it("returnează null pentru feature inexistent", () => {
    expect(getFeatureConfig("_nope_")).toBe(null);
  });
});
