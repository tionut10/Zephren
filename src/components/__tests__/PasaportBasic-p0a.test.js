/**
 * PasaportBasic-p0a.test.js — Sprint P0-A (6 mai 2026)
 *
 * Teste de integrare pentru refactor PasaportBasic (P0-02 + P1-05 + P1-12):
 *   - buildRenovationPassport produce schema completă Anexa VIII (12 secțiuni)
 *     pornind de la phasedPlan calculat din smartSuggestions.
 *   - UUID v5 deterministic (din cpeCode) — nu mai e `epbd-basic-${Date.now()}`.
 *   - getMepsThresholdsFor returnează target dinamic per categoria de clădire
 *     (rezidențial 2035 / nerezidențial 2033 — EPBD Art. 9).
 *   - calcPhasedRehabPlan din smartSuggestions produce faze REALE, nu reduceri
 *     fixe [0, 20, 40, 60]%.
 */

import { describe, it, expect } from "vitest";
import { buildRenovationPassport, isValidPassportId } from "../../calc/renovation-passport.js";
import { calcPhasedRehabPlan } from "../../calc/phased-rehab.js";
import { getMepsThresholdsFor } from "../MEPSCheck.jsx";

describe("Sprint P0-A — Pașaport Renovare EPBD (PREVIEW)", () => {
  describe("UUID v5 deterministic din cpeCode (P0-02)", () => {
    it("același cpeCode produce același UUID v5 (cross-ref CPE↔Pașaport stabil)", () => {
      const ctx = {
        cpeCode: "CPE-2026-IS-12345",
        building: { address: "Str. Test 1, Iași", areaUseful: 100, category: "RC" },
        instSummary: { ep_total_m2: 250, energyClass: "D" },
      };
      const p1 = buildRenovationPassport(ctx);
      const p2 = buildRenovationPassport(ctx);
      expect(p1.passportId).toBe(p2.passportId);
      expect(isValidPassportId(p1.passportId)).toBe(true);
    });

    it("UUID format JSON Schema valid (RFC 4122 v4 sau v5)", () => {
      const p = buildRenovationPassport({
        cpeCode: "CPE-2026-XX-99999",
        building: { address: "X", areaUseful: 50, category: "RI" },
      });
      expect(p.passportId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("schema produsă conține cele 12 secțiuni Anexa VIII", () => {
      const p = buildRenovationPassport({
        cpeCode: "CPE-X",
        building: { address: "A", category: "BI", areaUseful: 500 },
        instSummary: { ep_total_m2: 180, energyClass: "C", co2_total_m2: 35 },
        renewSummary: { rer: 25 },
        climate: { zone: "II" },
        auditor: { name: "Ing. X", certNr: "GI-1" },
      });
      // Schema EPBD Anexa VIII — minimum 12 secțiuni / câmpuri principale
      expect(p).toHaveProperty("passportId");
      expect(p).toHaveProperty("version");
      expect(p).toHaveProperty("schemaUrl");
      expect(p).toHaveProperty("timestamp");
      expect(p).toHaveProperty("status");
      expect(p).toHaveProperty("history");
      expect(p).toHaveProperty("building");
      expect(p).toHaveProperty("baseline");
      expect(p).toHaveProperty("roadmap");
      expect(p).toHaveProperty("targetState");
      expect(p).toHaveProperty("financial");
      expect(p).toHaveProperty("auditor");
      expect(p).toHaveProperty("registry");
      expect(p.cpeCode).toBe("CPE-X");
    });
  });

  describe("Plan etapizat REAL din smartSuggestions (P1-05)", () => {
    const sampleMeasures = [
      {
        id: "m1",
        name: "Termoizolare pereți EPS 10cm",
        category: "Anvelopă",
        system: "Anvelopă",
        cost_RON: 30000,
        ep_reduction_kWh_m2: 40,
        co2_reduction: 9.2,
        priority: 1,
      },
      {
        id: "m2",
        name: "Înlocuire tâmplărie tripan U=0.9",
        category: "Anvelopă",
        system: "Anvelopă",
        cost_RON: 25000,
        ep_reduction_kWh_m2: 30,
        co2_reduction: 6.9,
        priority: 1,
      },
      {
        id: "m3",
        name: "Pompă căldură aer-apă",
        category: "Instalații",
        system: "Instalații",
        cost_RON: 35000,
        ep_reduction_kWh_m2: 50,
        co2_reduction: 11.5,
        priority: 2,
      },
      {
        id: "m4",
        name: "Panouri PV 5 kWp",
        category: "Regenerabile",
        system: "Regenerabile",
        cost_RON: 28000,
        ep_reduction_kWh_m2: 25,
        co2_reduction: 5.8,
        priority: 1,
      },
    ];

    it("produce faze REALE cu măsuri concrete, nu reduceri fixe procentuale", () => {
      const plan = calcPhasedRehabPlan(
        sampleMeasures,
        50000,    // buget anual
        "balanced",
        250,      // EP inițial
        "RC",     // categoria
        100,      // Au m²
        0.45,     // RON/kWh
      );
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.totalYears).toBeGreaterThan(0);
      // Fiecare fază trebuie să aibă măsuri concrete cu nume reale (nu placeholder)
      plan.phases.forEach(ph => {
        expect(ph.measures.length).toBeGreaterThan(0);
        ph.measures.forEach(m => {
          expect(m.name).toBeTruthy();
          expect(typeof m.name).toBe("string");
        });
        expect(ph.phaseCost_RON).toBeGreaterThan(0);
        expect(ph.ep_after).toBeLessThan(250); // EP scade după fiecare fază
      });
    });

    it("EP final după plan ≤ EP inițial (reducere obligatorie)", () => {
      const plan = calcPhasedRehabPlan(sampleMeasures, 50000, "balanced", 250, "RC", 100, 0.45);
      expect(plan.summary.ep_final).toBeLessThan(plan.summary.ep_initial);
      expect(plan.summary.ep_reduction_total).toBeGreaterThan(0);
    });

    it("integrare cu buildRenovationPassport — phasedPlan injectat în roadmap", () => {
      const plan = calcPhasedRehabPlan(sampleMeasures, 50000, "balanced", 250, "RC", 100, 0.45);
      const passport = buildRenovationPassport({
        cpeCode: "CPE-INT-001",
        building: { address: "Test", category: "RC", areaUseful: 100 },
        instSummary: { ep_total_m2: 250, energyClass: "D", co2_total_m2: 50 },
        phasedPlan: {
          strategy: "balanced",
          totalYears: plan.totalYears,
          annualBudget: 50000,
          energyPrice: 0.45,
          discountRate: 0.04,
          phases: plan.phases,
          epTrajectory: plan.epTrajectory,
          classTrajectory: plan.classTrajectory,
          summary: plan.summary,
        },
      });
      expect(passport.roadmap.phases.length).toBe(plan.phases.length);
      expect(passport.roadmap.totalYears).toBe(plan.totalYears);
      expect(passport.roadmap.strategy).toBe("balanced");
    });
  });

  describe("Target MEPS dinamic per categorie (P1-12)", () => {
    it("rezidențial RC → milestone 2035 clasă E", () => {
      const t = getMepsThresholdsFor("RC");
      expect(t.milestone2).toBe(2035);
      expect(t.class2nd).toBe("E");
      expect(t.class2030).toBe("F");
    });

    it("rezidențial RI → milestone 2035 clasă E", () => {
      const t = getMepsThresholdsFor("RI");
      expect(t.milestone2).toBe(2035);
      expect(t.class2nd).toBe("E");
    });

    it("nerezidențial BI → milestone 2033 clasă E", () => {
      const t = getMepsThresholdsFor("BI");
      expect(t.milestone2).toBe(2033);
      expect(t.class2nd).toBe("E");
    });

    it("nerezidențial SP (spital) → milestone 2033", () => {
      const t = getMepsThresholdsFor("SP");
      expect(t.milestone2).toBe(2033);
    });

    it("ep2nd e ep2035 pentru rezidențial / ep2033 pentru nerezidențial (backward compat)", () => {
      const tRes = getMepsThresholdsFor("RC");
      expect(tRes.ep2nd).toBe(tRes.ep2035);
      const tNRes = getMepsThresholdsFor("BI");
      expect(tNRes.ep2nd).toBe(tNRes.ep2033);
    });

    it("default fallback (categoria necunoscută) → milestone 2033", () => {
      const t = getMepsThresholdsFor("XX_INEXISTENT");
      expect(t.milestone2).toBe(2033);
      expect(t.class2030).toBe("F");
    });
  });

  describe("Watermark juridic + status pașaport", () => {
    it("status='draft' la prima emitere", () => {
      const p = buildRenovationPassport({
        cpeCode: "CPE-NEW",
        building: { address: "X", category: "RC", areaUseful: 100 },
      });
      expect(p.status).toBe("draft");
    });

    it("status='updated' la re-emitere cu existingPassportId", () => {
      const p1 = buildRenovationPassport({
        cpeCode: "CPE-UPDATE",
        building: { address: "X", category: "RC", areaUseful: 100 },
      });
      const p2 = buildRenovationPassport({
        cpeCode: "CPE-UPDATE",
        building: { address: "X", category: "RC", areaUseful: 100 },
        existingPassportId: p1.passportId,
      });
      expect(p2.status).toBe("updated");
      expect(p2.passportId).toBe(p1.passportId);
    });

    it("istoric păstrează versiuni la emitere repetată", () => {
      const p1 = buildRenovationPassport({
        cpeCode: "CPE-HIST",
        building: { address: "X", category: "RC", areaUseful: 100 },
        changeReason: "Inițial",
      });
      const p2 = buildRenovationPassport({
        cpeCode: "CPE-HIST",
        building: { address: "X", category: "RC", areaUseful: 100 },
        existingPassportId: p1.passportId,
        existingHistory: p1.history,
        changeReason: "Update după renovare fază 1",
      });
      expect(p2.history.length).toBe(2);
      expect(p2.history[0].changeReason).toBe("Inițial");
      expect(p2.history[1].changeReason).toBe("Update după renovare fază 1");
    });
  });
});
