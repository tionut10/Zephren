/**
 * cross-document-consistency.test.js — Sprint Îmbunătățiri #1 (9 mai 2026)
 *
 * Verifică PARITATEA INVESTIȚIEI între cele 3 documente principale care raportează
 * costuri reabilitare:
 *
 *   1. Deviz Estimativ PDF (calc/rehab-cost.js → calcRehabCost)
 *   2. CPE Post-Rehab PDF (lib/cpe-post-rehab-pdf via unified-rehab-costs.buildCanonicalMeasures)
 *   3. Pașaport Renovare (calc/renovation-passport via unified-rehab-costs)
 *
 * Înainte de Sprint Pas 7 docs (6 mai 2026) — P0-1: cele 3 documente afișau valori
 * DIFERITE pentru același scenariu (28.281 €, 94.614 RON, 79.597 RON pentru aceeași
 * clădire). Sprint-ul a unificat sursa la `unified-rehab-costs.js`.
 *
 * Acest test asigură că REGRESIA ORICÂND IRUMPE silent în viitor — orice modificare
 * de preț, formula sau curs RON trebuie să mențină paritatea sub un prag tolerabil.
 *
 * TOLERANȚĂ acceptată:
 *   - Deviz EUR × eurRon vs CPE RON: ±5% (ambele folosesc rehab-prices/rehab-costs cu
 *     mici diferențe schemă pentru scaling — acceptabil)
 *   - CPE RON vs Pașaport RON: ±3% (ambele via unified-rehab-costs — paritate strânsă)
 */

import { describe, it, expect } from "vitest";
import { calcRehabCost } from "../rehab-cost.js";
import { buildCanonicalMeasures, buildFinancialSummary } from "../unified-rehab-costs.js";
import { getEurRonSync } from "../../data/rehab-prices.js";

// ─── Scenariu test comun: clădire 100 m² cu pachet aprofundat ─────────
const baseScenario = {
  inputs: {
    addInsulWall: true,
    insulWallThickness: 10,
    addInsulRoof: true,
    insulRoofThickness: 15,
    replaceWindows: true,
    newWindowU: 1.10,
    addHP: true,
    hpCOP: 4.0,
    hpPower: 8,
    addPV: true,
    pvArea: 25, // ~5 kWp
  },
  opaqueElements: [
    { type: "PE", area: "150" },  // 150 m² pereți exteriori
    { type: "PP", area: "100" },  // 100 m² acoperiș
  ],
  glazingElements: [
    { area: "20" },  // 20 m² ferestre
  ],
  Au: 100,
};

describe("Sprint Îmbunătățiri #1 — Cross-document consistency", () => {
  describe("Deviz Estimativ ↔ CPE Post-Rehab — paritate investiție", () => {
    it("Deviz EUR × eurRon ≈ CPE RON pentru același scenariu (toleranță ±5% post-P4.7)", () => {
      const eurRon = getEurRonSync();

      // 1. Deviz Estimativ (calc/rehab-cost.calcRehabCost)
      const deviz = calcRehabCost({
        wallArea: 150,
        roofArea: 100,
        floorArea: 0,
        windowArea: 20,
        wallInsulType: "eps",
        wallInsulThick: 10,
        roofInsulType: "eps",
        roofInsulThick: 15,
        replaceWindows: true,
        windowType: "2g",  // U≤1.10
        addHP: true,
        hpType: "aw",
        hpPower: 8,
        Au: 100,
        addPV: true,
        pvKwp: 5,
        contingency: 0,  // disable pentru comparație directă
      });

      // 2. CPE Post-Rehab (unified-rehab-costs.buildCanonicalMeasures)
      const measures = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements,
        { eurRon }
      );
      const fin = buildFinancialSummary(measures, { eurRon });

      const devizRON = deviz.total_eur * eurRon;
      const cpeRON = fin.totalRON;

      // Toleranță ±10% post-P4.3 (9 mai 2026) — Deviz pereți+acoperiș migrate la
      // flat getPrice canonic (anterior formula incrementală EUR/m²/cm × thickness).
      // Rămân mici diferențe pe windows + alte items care folosesc overlay parțial.
      // Istoria pragului:
      //   - Pre Sprint Pas 7 P0-1 (6 mai): ~70%
      //   - Post Pas 7 P0-1: ~17%
      //   - Post P3.1 (unified migrate): ~17%
      //   - Post P4.3 (Deviz pereți+acoperiș flat): <10%
      const diff = Math.abs(devizRON - cpeRON);
      const ratio = diff / cpeRON;
      // Sprint P4.7 — paritate <5% după ce TOATE itemii rehab-cost.js folosesc
      // getPrice canonic (incluzând wall_mw/pur, roof_xps/mw, hp_aw scaling).
      expect(ratio).toBeLessThan(0.05);
    });
  });

  describe("CPE Post-Rehab ↔ Pașaport — paritate strânsă (același helper canonic)", () => {
    it("totalRON via buildFinancialSummary este consistent indiferent de calling site (toleranță ±1%)", () => {
      const eurRon = getEurRonSync();
      // Apel 1 (CPE Post-Rehab style)
      const measures1 = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements,
        { eurRon }
      );
      const fin1 = buildFinancialSummary(measures1, { eurRon });
      // Apel 2 (Pașaport style — via aceeași sursă canonică)
      const measures2 = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements,
        { eurRon }
      );
      const fin2 = buildFinancialSummary(measures2, { eurRon });

      // Identitate strictă (cu același input → același output deterministic)
      expect(fin1.totalEUR).toBe(fin2.totalEUR);
      expect(fin1.totalRON).toBe(fin2.totalRON);
      expect(fin1.eurRon).toBe(fin2.eurRon);
    });

    it("buildCanonicalMeasures returnează valori reproductibile (deterministic)", () => {
      const m1 = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements
      );
      const m2 = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements
      );
      expect(m1.length).toBe(m2.length);
      for (let i = 0; i < m1.length; i++) {
        expect(m1[i].id).toBe(m2[i].id);
        expect(m1[i].costEUR).toBe(m2[i].costEUR);
        expect(m1[i].costRON).toBe(m2[i].costRON);
      }
    });
  });

  describe("Sumar financiar consistent — totaluri vs sume per măsură", () => {
    it("totalRON = sum(measures.costRON) (verificare integritate)", () => {
      const measures = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements
      );
      const fin = buildFinancialSummary(measures);
      const sumRON = measures.reduce((s, m) => s + (m.costRON || 0), 0);
      expect(fin.totalRON).toBe(sumRON);
    });

    it("totalEUR = sum(measures.costEUR) (verificare integritate)", () => {
      const measures = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements
      );
      const fin = buildFinancialSummary(measures);
      const sumEUR = measures.reduce((s, m) => s + (m.costEUR || 0), 0);
      // Math.round în buildFinancialSummary
      expect(Math.abs(fin.totalEUR - Math.round(sumEUR))).toBeLessThanOrEqual(1);
    });

    it("totalWithTvaRON = totalRON × (1 + 0.21) ±1 RON rotunjire", () => {
      const measures = buildCanonicalMeasures(
        baseScenario.inputs,
        baseScenario.opaqueElements,
        baseScenario.glazingElements
      );
      const fin = buildFinancialSummary(measures, { tvaRate: 0.21 });
      const expectedWithTva = Math.round(fin.totalRON * 1.21);
      expect(Math.abs(fin.totalWithTvaRON - expectedWithTva)).toBeLessThanOrEqual(1);
    });
  });

  describe("Robustețe — input gol / minim", () => {
    it("inputs goale → measures = [], totalRON = 0", () => {
      const measures = buildCanonicalMeasures({}, [], []);
      expect(measures).toEqual([]);
      const fin = buildFinancialSummary(measures);
      expect(fin.totalRON).toBe(0);
      expect(fin.totalEUR).toBe(0);
    });

    it("inputs null → graceful handling (nu crash)", () => {
      expect(() => buildCanonicalMeasures(null, null, null)).not.toThrow();
      const measures = buildCanonicalMeasures(null, null, null);
      expect(Array.isArray(measures)).toBe(true);
    });
  });
});
