import { describe, it, expect } from "vitest";
import {
  calcPenalties,
  calcP0_AnvelopaSubizolata,
  calcP1_FerestreSlab,
  calcP2_PuntiNecorectate,
  calcP3_CazanIneficient,
  calcP4_DistributieNeoptima,
  calcP5_Reglare,
  calcP6_ACMIneficient,
  calcP7_Stocare,
  calcP8_Ventilatie,
  calcP9_Iluminat,
  calcP10_FaraBACS,
  calcP11_FaraRegenerabile,
  applyPenaltiesToEP,
  PENALTY_DELTAS,
  PENALTY_THRESHOLDS,
} from "../penalties.js";

describe("Sprint 14 — Penalizări p0-p11 Mc 001-2022 §8.10", () => {
  // ── p0 — Anvelopa subizolată ──
  describe("p0 — Anvelopa subizolată", () => {
    it("NU penalizează când U mediu ≤ U_ref", () => {
      const env = { opaque: [{ type: "PE", area: 100, u: 0.20 }] };
      const r = calcP0_AnvelopaSubizolata(env, "RC");
      expect(r.applied).toBe(false);
      expect(r.delta_EP_pct).toBe(0);
    });

    it("PENALIZEAZĂ când U mediu > 120% × U_ref", () => {
      const env = { opaque: [{ type: "PE", area: 100, u: 1.5 }] };
      const r = calcP0_AnvelopaSubizolata(env, "RC");
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p0);
    });

    it("returnează applied=false când lista goală", () => {
      const r = calcP0_AnvelopaSubizolata({ opaque: [] }, "RC");
      expect(r.applied).toBe(false);
    });
  });

  // ── p1 — Ferestre slabe (Sprint 26 P1.11: prag adaptiv RES 1.30 / NRES 1.80) ──
  describe("p1 — Ferestre slabe", () => {
    it("REZ: NU penalizează ferestre moderne (U_w ≤ 1.30)", () => {
      const r = calcP1_FerestreSlab([{ u: 1.1 }, { u: 1.25 }], "RC");
      expect(r.applied).toBe(false);
    });

    it("REZ: PENALIZEAZĂ ferestre slabe (U_w > 1.30)", () => {
      const r = calcP1_FerestreSlab([{ u: 1.5 }], "RC");
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p1);
    });

    it("NREZ: NU penalizează ferestre cu U_w 1.5 (prag 1.80)", () => {
      const r = calcP1_FerestreSlab([{ u: 1.5 }], "BI");
      expect(r.applied).toBe(false);
    });

    it("NREZ: PENALIZEAZĂ ferestre cu U_w > 1.80", () => {
      const r = calcP1_FerestreSlab([{ u: 2.5 }], "BI");
      expect(r.applied).toBe(true);
    });

    it("returnează value=maxU (cea mai slabă)", () => {
      const r = calcP1_FerestreSlab([{ u: 1.0 }, { u: 3.0 }], "RC");
      expect(r.value).toBe(3.0);
    });
  });

  // ── p2 — Punți termice ──
  describe("p2 — Punți termice necorectate", () => {
    it("NU penalizează ψ ≤ 0.15 (1.5 × ψ_ref)", () => {
      const r = calcP2_PuntiNecorectate([{ psi: 0.08 }, { psi: 0.12 }]);
      expect(r.applied).toBe(false);
    });

    it("PENALIZEAZĂ ψ > 0.15", () => {
      const r = calcP2_PuntiNecorectate([{ psi: 0.30 }]);
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p2);
    });

    // Etapa 5 (BUG-8) — regression: bridges propagate prin calcPenalties end-to-end
    it("REGRESSION: calcPenalties propagă bridges din envelope (Etapa 5)", () => {
      const result = calcPenalties({
        envelope: {
          opaque: [{ type: "PE", area: 100, u: 0.20 }],
          glazing: [{ u: 1.5 }],
          bridges: [{ psi: 0.30, length: 50 }, { psi: 0.08, length: 30 }],
        },
        instSummary: {
          heating: { eta_gen: 0.92, eta_dist: 0.95, controls: "termostat" },
          dhw: { eta_dhw: 0.90, storage: { volume: 100, standing_loss: 0.3 } },
          lighting: { leni: 8 },
          bacs: "C",
        },
        ventilation: { type: "natural_org" },
        building: { category: "RC" },
        renewables: { rer: 35 },
      });
      // p2 trebuie să fie applied (worst psi = 0.30 > limit 0.15)
      expect(result.p2.applied).toBe(true);
      expect(result.p2.value).toBe(0.30);
      expect(result.p2.delta_EP_pct).toBe(PENALTY_DELTAS.p2);
    });

    it("REGRESSION: calcPenalties cu bridges=[] NU declanșează p2 (înainte era cazul pe Step6)", () => {
      const result = calcPenalties({
        envelope: { opaque: [], glazing: [], bridges: [] },
        instSummary: {
          heating: { eta_gen: 0.92, eta_dist: 0.95, controls: "termostat" },
          dhw: { eta_dhw: 0.90, storage: { volume: 100, standing_loss: 0.3 } },
          lighting: { leni: 8 },
          bacs: "C",
        },
        ventilation: { type: "natural_org" },
        building: { category: "RC" },
        renewables: { rer: 35 },
      });
      // p2 NU se aplică pentru bridges goale (comportament corect)
      expect(result.p2.applied).toBe(false);
      expect(result.p2.delta_EP_pct).toBe(0);
    });
  });

  // ── p3 — Cazan ineficient ──
  describe("p3 — Cazan ineficient", () => {
    it("NU penalizează cazan cu η_gen ≥ 0.85", () => {
      const r = calcP3_CazanIneficient({ eta_gen: 0.92 });
      expect(r.applied).toBe(false);
    });

    it("PENALIZEAZĂ cazan cu η_gen < 0.85", () => {
      const r = calcP3_CazanIneficient({ eta_gen: 0.72 });
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p3);
    });

    it("NU penalizează pompă căldură (COP > 1)", () => {
      const r = calcP3_CazanIneficient({ eta_gen: 3.5 });
      expect(r.applied).toBe(false);
      expect(r.reason).toMatch(/COP/);
    });

    it("returnează applied=false când eta_gen lipsește", () => {
      const r = calcP3_CazanIneficient({});
      expect(r.applied).toBe(false);
    });
  });

  // ── p4 — Distribuție ──
  describe("p4 — Distribuție neoptimă", () => {
    it("NU penalizează η_dist ≥ 0.85", () => {
      expect(calcP4_DistributieNeoptima({ eta_dist: 0.95 }).applied).toBe(false);
    });
    it("PENALIZEAZĂ η_dist < 0.85", () => {
      const r = calcP4_DistributieNeoptima({ eta_dist: 0.70 });
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p4);
    });
  });

  // ── p5 — Reglare ──
  describe("p5 — Reglare inadecvată", () => {
    it("NU penalizează când reglare adecvată (termostat)", () => {
      expect(calcP5_Reglare("termostat").applied).toBe(false);
    });
    it("NU penalizează PID / BACS", () => {
      expect(calcP5_Reglare("pid").applied).toBe(false);
      expect(calcP5_Reglare("bacs_a").applied).toBe(false);
    });
    it("PENALIZEAZĂ absența reglării", () => {
      const r = calcP5_Reglare("manual");
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p5);
    });
    it("PENALIZEAZĂ string gol", () => {
      expect(calcP5_Reglare("").applied).toBe(true);
    });
  });

  // ── p6 — ACM ──
  describe("p6 — ACM ineficient", () => {
    it("NU penalizează η_dhw ≥ 0.70", () => {
      expect(calcP6_ACMIneficient({ eta_dhw: 0.85 }).applied).toBe(false);
    });
    it("PENALIZEAZĂ η_dhw < 0.70", () => {
      const r = calcP6_ACMIneficient({ eta_dhw: 0.55 });
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p6);
    });
  });

  // ── p7 — Stocare ──
  describe("p7 — Stocaj fără izolație", () => {
    it("NU penalizează stocaj bine izolat", () => {
      const r = calcP7_Stocare({ volume: 200, standing_loss: 50 });
      // 50/200 = 0.25 W/(K·L) < 0.50
      expect(r.applied).toBe(false);
    });
    it("PENALIZEAZĂ stocaj cu pierderi > 0.50 W/(K·L)", () => {
      const r = calcP7_Stocare({ volume: 100, standing_loss: 80 });
      // 80/100 = 0.80 > 0.50
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p7);
    });
  });

  // ── p8 — Ventilație ──
  describe("p8 — Ventilație fără HR", () => {
    it("NU penalizează ventilație naturală (HR nu e obligatoriu)", () => {
      const r = calcP8_Ventilatie({ type: "naturala", hrEfficiency: 0 });
      expect(r.applied).toBe(false);
    });
    it("NU penalizează VMC cu HR ≥ 70%", () => {
      const r = calcP8_Ventilatie({ type: "mecanica_vmc", hrEfficiency: 85 });
      expect(r.applied).toBe(false);
    });
    it("PENALIZEAZĂ VMC cu HR < 70%", () => {
      const r = calcP8_Ventilatie({ type: "mecanica_vmc", hrEfficiency: 40 });
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p8);
    });
  });

  // ── p9 — Iluminat ──
  describe("p9 — Iluminat LENI", () => {
    it("NU penalizează LENI ≤ 15", () => {
      expect(calcP9_Iluminat({ leni: 8 }).applied).toBe(false);
    });
    it("PENALIZEAZĂ LENI > 15", () => {
      const r = calcP9_Iluminat({ leni: 22 });
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p9);
    });
  });

  // ── p10 — BACS ──
  describe("p10 — Lipsă BACS", () => {
    it("NU penalizează clasă A/B/C", () => {
      expect(calcP10_FaraBACS("A").applied).toBe(false);
      expect(calcP10_FaraBACS("B").applied).toBe(false);
      expect(calcP10_FaraBACS("C").applied).toBe(false);
    });
    it("PENALIZEAZĂ clasă D", () => {
      const r = calcP10_FaraBACS("D");
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p10);
    });
    it("PENALIZEAZĂ absent", () => {
      expect(calcP10_FaraBACS("").applied).toBe(true);
      expect(calcP10_FaraBACS(null).applied).toBe(true);
    });
  });

  // ── p11 — Regenerabile ──
  describe("p11 — Fără regenerabile", () => {
    it("NU penalizează RER ≥ 30%", () => {
      expect(calcP11_FaraRegenerabile({ rer: 45 }, "RC").applied).toBe(false);
    });
    it("PENALIZEAZĂ RER < 30%", () => {
      const r = calcP11_FaraRegenerabile({ rer: 12 }, "RC");
      expect(r.applied).toBe(true);
      expect(r.delta_EP_pct).toBe(PENALTY_DELTAS.p11);
    });
    it("folosește NZEB_THRESHOLDS per categorie", () => {
      // Toate categoriile au rer_min = 30 în starea curentă
      expect(calcP11_FaraRegenerabile({ rer: 35 }, "BI").applied).toBe(false);
    });
  });

  // ── Agregator ──
  describe("calcPenalties agregat", () => {
    it("returnează 12 penalizări + summary", () => {
      const result = calcPenalties({
        envelope: { opaque: [], glazing: [], bridges: [] },
        instSummary: { heating: {}, dhw: {}, lighting: {}, bacs: "C" },
        ventilation: { type: "naturala" },
        building: { category: "RC" },
        renewables: { rer: 35 },
      });
      for (let i = 0; i <= 11; i++) {
        expect(result[`p${i}`]).toBeDefined();
        expect(result[`p${i}`]).toHaveProperty("applied");
        expect(result[`p${i}`]).toHaveProperty("delta_EP_pct");
      }
      expect(result.summary).toBeDefined();
      expect(result.summary.count_applied).toBeGreaterThanOrEqual(0);
    });

    it("total_delta_pct este suma penalizărilor aplicate", () => {
      const result = calcPenalties({
        envelope: { opaque: [{ type: "PE", area: 100, u: 2.0 }], glazing: [{ u: 3.0 }], bridges: [] },
        instSummary: { heating: { eta_gen: 0.5 }, dhw: {}, lighting: {}, bacs: "D" },
        ventilation: { type: "naturala" },
        building: { category: "RC" },
        renewables: { rer: 10 },
      });
      const sum = Object.values(result)
        .filter((r) => r.applied)
        .reduce((s, r) => s + r.delta_EP_pct, 0);
      expect(result.summary.total_delta_pct).toBe(sum);
    });

    it("ep_multiplier = 1 când niciuna aplicată", () => {
      const result = calcPenalties({
        envelope: { opaque: [{ type: "PE", area: 100, u: 0.15 }], glazing: [{ u: 1.0 }], bridges: [{ psi: 0.05 }] },
        instSummary: { heating: { eta_gen: 0.95, eta_dist: 0.95, control: "termostat" }, dhw: { eta_dhw: 0.85, storage: { volume: 200, standing_loss: 30 } }, lighting: { leni: 8 }, bacs: "B" },
        ventilation: { type: "mecanica_vmc", hrEfficiency: 85 },
        building: { category: "RC" },
        renewables: { rer: 45 },
      });
      expect(result.summary.ep_multiplier).toBe(1);
    });

    it("ep_multiplier > 1 când aplicate", () => {
      const result = calcPenalties({
        envelope: { opaque: [{ type: "PE", area: 100, u: 2.0 }], glazing: [{ u: 3.5 }], bridges: [] },
        instSummary: { heating: { eta_gen: 0.4 }, dhw: {}, lighting: {}, bacs: "D" },
        ventilation: { type: "naturala" },
        building: { category: "RC" },
        renewables: { rer: 5 },
      });
      expect(result.summary.ep_multiplier).toBeGreaterThan(1);
    });
  });

  describe("applyPenaltiesToEP", () => {
    it("returnează EP × multiplier", () => {
      const pen = { summary: { ep_multiplier: 1.2 } };
      expect(applyPenaltiesToEP(100, pen)).toBeCloseTo(120, 5);
    });

    it("returnează EP când multiplier=1", () => {
      const pen = { summary: { ep_multiplier: 1 } };
      expect(applyPenaltiesToEP(150, pen)).toBe(150);
    });

    it("tolerează penalties undefined", () => {
      expect(applyPenaltiesToEP(100, undefined)).toBe(100);
    });
  });

  describe("Constante — integritate praguri", () => {
    it("toate deltas > 0", () => {
      for (let i = 0; i <= 11; i++) {
        expect(PENALTY_DELTAS[`p${i}`]).toBeGreaterThan(0);
      }
    });
    it("U_MEDIU_RATIO_LIMIT > 1 (toleranță)", () => {
      expect(PENALTY_THRESHOLDS.U_MEDIU_RATIO_LIMIT).toBeGreaterThan(1);
    });
    it("RER_MIN = 30 (Mc 001-2022 nZEB)", () => {
      expect(PENALTY_THRESHOLDS.RER_MIN).toBe(30);
    });
  });
});
