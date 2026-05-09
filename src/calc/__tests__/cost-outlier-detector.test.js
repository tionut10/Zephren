// @vitest-environment jsdom
/**
 * cost-outlier-detector.test.js — Sprint Îmbunătățiri #2 (9 mai 2026)
 *
 * Verifică detecția outlier-urilor de investiție vs benchmark rehab-prices.
 */

import { describe, it, expect } from "vitest";
import {
  calcBenchmarkInvestmentRON,
  detectOutlier,
  _internals,
} from "../cost-outlier-detector.js";

describe("Sprint Îmbunătățiri #2 — cost-outlier-detector", () => {
  describe("calcBenchmarkInvestmentRON", () => {
    it("returnează gama low/mid/high pentru 100 m²", () => {
      const r = calcBenchmarkInvestmentRON(100);
      expect(r.low).toBeGreaterThan(0);
      expect(r.mid).toBeGreaterThan(r.low);
      expect(r.high).toBeGreaterThan(r.mid);
      expect(r.eurRon).toBeGreaterThan(4);
      expect(r.eurRon).toBeLessThan(8);
    });

    it("returnează zero pentru Au invalid", () => {
      expect(calcBenchmarkInvestmentRON(0)).toEqual({ low: 0, mid: 0, high: 0, eurRon: 0, breakdown: {} });
      expect(calcBenchmarkInvestmentRON(-50)).toEqual({ low: 0, mid: 0, high: 0, eurRon: 0, breakdown: {} });
    });

    it("breakdown include toate componentele pachet", () => {
      const r = calcBenchmarkInvestmentRON(100);
      expect(r.breakdown.mid).toHaveProperty("wallRON");
      expect(r.breakdown.mid).toHaveProperty("roofRON");
      expect(r.breakdown.mid).toHaveProperty("winRON");
      expect(r.breakdown.mid).toHaveProperty("hpRON");
      expect(r.breakdown.mid).toHaveProperty("pvRON");
      expect(r.breakdown.mid).toHaveProperty("totalRON");
    });

    it("scaling liniar cu suprafața utilă", () => {
      const r100 = calcBenchmarkInvestmentRON(100);
      const r200 = calcBenchmarkInvestmentRON(200);
      // Wall + roof + windows scalează cu Au; HP + PV sunt fixed → ratio < 2.0
      expect(r200.mid).toBeGreaterThan(r100.mid);
      expect(r200.mid / r100.mid).toBeLessThan(2.0);
      expect(r200.mid / r100.mid).toBeGreaterThan(1.4);
    });

    it("override curs eurRon respectat", () => {
      const r = calcBenchmarkInvestmentRON(100, { eurRon: 5.00 });
      expect(r.eurRon).toBe(5.00);
    });
  });

  describe("detectOutlier — levels", () => {
    it("OK pentru investiție în banda mid", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(benchmark.mid, 100);
      expect(r.level).toBe("ok");
      expect(r.message).toContain("✓");
    });

    it("warn-low pentru investiție sub banda low", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const investJustBelow = Math.round(benchmark.low * 0.85); // între 70%×low și low
      const r = detectOutlier(investJustBelow, 100);
      expect(r.level).toBe("warn-low");
      expect(r.message).toContain("sub-evaluată");
    });

    it("critical-low pentru investiție mult sub banda low", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const investCritical = Math.round(benchmark.low * 0.30); // mult sub
      const r = detectOutlier(investCritical, 100);
      expect(r.level).toBe("critical-low");
      expect(r.message).toContain("CRITIC");
    });

    it("warn-high pentru investiție peste banda high", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const investAbove = Math.round(benchmark.high * 1.15); // 115% × high (sub 150%)
      const r = detectOutlier(investAbove, 100);
      expect(r.level).toBe("warn-high");
      expect(r.message).toContain("supra-evaluată");
    });

    it("critical-high pentru investiție mult peste banda high", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const investCritical = Math.round(benchmark.high * 2.0); // 200% × high
      const r = detectOutlier(investCritical, 100);
      expect(r.level).toBe("critical-high");
      expect(r.message).toContain("CRITIC");
    });

    it("unknown pentru date insuficiente", () => {
      expect(detectOutlier(0, 100).level).toBe("unknown");
      expect(detectOutlier(50000, 0).level).toBe("unknown");
      expect(detectOutlier(-1, 100).level).toBe("unknown");
    });
  });

  describe("detectOutlier — context categorie", () => {
    it("include categoria în mesaj când e specificată", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(benchmark.low * 0.85, 100, { category: "RC" });
      expect(r.message).toContain("RC");
    });

    it("default 'general' dacă lipsește category", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(benchmark.low * 0.85, 100);
      expect(r.message).toContain("general");
    });
  });

  describe("detectOutlier — deltaPct și ratio", () => {
    it("ratio = 1.0 la mid exact", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(benchmark.mid, 100);
      expect(r.ratio).toBeCloseTo(1.0, 1);
      expect(r.deltaPct).toBe(0);
    });

    it("deltaPct corect la +20%", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(Math.round(benchmark.mid * 1.20), 100);
      expect(r.deltaPct).toBe(20);
    });

    it("deltaPct negativ la -25%", () => {
      const benchmark = calcBenchmarkInvestmentRON(100);
      const r = detectOutlier(Math.round(benchmark.mid * 0.75), 100);
      expect(r.deltaPct).toBe(-25);
    });
  });

  describe("Praguri sensibilitate", () => {
    it("THRESHOLD_LOW_CRIT și THRESHOLD_HIGH_CRIT au valori rezonabile", () => {
      expect(_internals.THRESHOLD_LOW_CRIT).toBe(0.70);
      expect(_internals.THRESHOLD_HIGH_CRIT).toBe(1.50);
    });
  });
});
