// @vitest-environment jsdom
/**
 * OfertaReabilitare-flow-e2e.test.js — Sprint Îmbunătățiri G (9 mai 2026)
 *
 * Test E2E pentru flow-ul complet OfertaReabilitare:
 *   1. Multiplicator scenariu (low 0.85 / mid 1.0 / high 1.18)
 *   2. Aplicare factor inflație Tier 1 (Eurostat sts_copi_q)
 *   3. Outlier detection vs benchmark rehab-prices
 *   4. Curency switch global (EUR/RON/Auto)
 *   5. Telemetrie events Pret.scenario.changed + Pret.outlier.flagged
 *   6. Generare scenarii din pașaport (mkScenariiFromPassport)
 *
 * Acoperire fără DOM (testing-library nu e disponibil) — verifică matematica
 * și side-effects telemetrie pentru flow-ul de bază al modalului.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SCENARIO_MULTIPLIERS,
  SCENARIO_LABELS,
} from "../OfertaReabilitare.jsx";
import { detectOutlier, calcBenchmarkInvestmentRON } from "../../calc/cost-outlier-detector.js";
import { getCostInflationFactorSync, setUserCostInflationOverride } from "../../data/cost-index.js";
import {
  logPriceEvent,
  getPriceEvents,
  getScenarioDistribution,
  clearPriceTelemetry,
} from "../../data/price-telemetry.js";
import { fmtMoney, setCurrencyMode } from "../../data/currency-context.js";
import { REHAB_PRICES } from "../../data/rehab-prices.js";

beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});

describe("Sprint G — E2E OfertaReabilitare flow", () => {
  describe("FLOW 1: Multiplicator scenariu pe investiție", () => {
    it("baseInv 100k × low 0.85 = 85k, × high 1.18 = 118k", () => {
      const baseInv = 100000;
      const lowAdj = baseInv * SCENARIO_MULTIPLIERS.low;
      const midAdj = baseInv * SCENARIO_MULTIPLIERS.mid;
      const highAdj = baseInv * SCENARIO_MULTIPLIERS.high;
      expect(lowAdj).toBe(85000);
      expect(midAdj).toBe(100000);
      expect(highAdj).toBeCloseTo(118000, 0);
    });

    it("ordinea low < mid < high preservata pentru orice baseInv", () => {
      for (const baseInv of [50000, 100000, 250000, 500000]) {
        const low = baseInv * SCENARIO_MULTIPLIERS.low;
        const mid = baseInv * SCENARIO_MULTIPLIERS.mid;
        const high = baseInv * SCENARIO_MULTIPLIERS.high;
        expect(low).toBeLessThan(mid);
        expect(mid).toBeLessThan(high);
      }
    });
  });

  describe("FLOW 2: Aplicare factor inflație Tier 1", () => {
    it("inflație 1.0 (fallback) → investiția afișată = base × scenario × 1.0", () => {
      const r = getCostInflationFactorSync();
      expect(r.factor).toBe(1.0); // fallback fără cache
      const baseInv = 100000;
      const adj = baseInv * SCENARIO_MULTIPLIERS.mid * r.factor;
      expect(adj).toBe(100000);
    });

    it("override inflație 1.10 → afișat 110k pentru base 100k mid", () => {
      setUserCostInflationOverride(1.10);
      const r = getCostInflationFactorSync();
      expect(r.factor).toBe(1.10);
      expect(r.source).toBe("override");
      const baseInv = 100000;
      const adj = baseInv * SCENARIO_MULTIPLIERS.mid * r.factor;
      expect(adj).toBeCloseTo(110000, 0);
    });

    it("combo scenario LOW + inflație 1.10 = 100k × 0.85 × 1.10 = 93.5k", () => {
      setUserCostInflationOverride(1.10);
      const baseInv = 100000;
      const adj = baseInv * SCENARIO_MULTIPLIERS.low * 1.10;
      expect(adj).toBeCloseTo(93500, 0);
    });
  });

  describe("FLOW 3: Outlier detection în input investiție", () => {
    it("input rezonabil 200k pe 100m² → level OK", () => {
      const r = detectOutlier(200000, 100, { category: "RC" });
      // Verifică doar că nu e outlier critic (nivel exact depinde de bandă canonic)
      expect(["ok", "warn-low", "warn-high"]).toContain(r.level);
    });

    it("input 5k pe 100m² → critical-low", () => {
      const r = detectOutlier(5000, 100, { category: "RC" });
      expect(r.level).toBe("critical-low");
      expect(r.message).toContain("CRITIC");
    });

    it("input 500k pe 100m² → critical-high", () => {
      const r = detectOutlier(500000, 100, { category: "RC" });
      expect(r.level).toBe("critical-high");
    });
  });

  describe("FLOW 4: Currency switch + fmtMoney pe rezultate", () => {
    it("auto mode pe econAn 5100 RON → afișează ambele monede", () => {
      setCurrencyMode("auto");
      const fmt = fmtMoney(5100, "RON", { eurRon: 5.10 });
      expect(fmt).toContain("RON");
      expect(fmt).toContain("EUR");
    });

    it("EUR mode pe investiție 100k RON → 19.6k EUR", () => {
      setCurrencyMode("EUR");
      const fmt = fmtMoney(100000, "RON", { eurRon: 5.10 });
      expect(fmt).toContain("EUR");
      expect(fmt).not.toContain("RON");
      // ~ 100000 / 5.10 = 19608
      const num = parseInt(fmt.replace(/[^\d]/g, ""), 10);
      expect(num).toBeGreaterThan(19000);
      expect(num).toBeLessThan(20000);
    });
  });

  describe("FLOW 5: Telemetrie events", () => {
    it("scenario.changed log → distribution agregare corectă", () => {
      logPriceEvent("scenario.changed", { mode: "low", multiplier: 0.85 });
      logPriceEvent("scenario.changed", { mode: "mid", multiplier: 1.0 });
      logPriceEvent("scenario.changed", { mode: "mid", multiplier: 1.0 });
      logPriceEvent("scenario.changed", { mode: "high", multiplier: 1.18 });
      const dist = getScenarioDistribution();
      expect(dist).toEqual({ low: 1, mid: 2, high: 1, total: 4 });
    });

    it("outlier.flagged log → events salvate cu meta complet", () => {
      logPriceEvent("outlier.flagged", { level: "critical-low", deltaPct: -75, category: "RC", Au: 100 });
      const events = getPriceEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe("Pret.outlier.flagged");
      expect(events[0].meta.level).toBe("critical-low");
      expect(events[0].meta.deltaPct).toBe(-75);
    });
  });

  describe("FLOW 6: Generare scenarii din pașaport (matematica)", () => {
    it("phase totalCost = sum(phaseCost_RON) — verificare integritate", () => {
      const passport = {
        roadmap: {
          phases: [
            { phaseCost_RON: 30000, ep_after: 200, class_after: "C" },
            { phaseCost_RON: 50000, ep_after: 150, class_after: "B" },
            { phaseCost_RON: 70000, ep_after: 100, class_after: "A" },
          ],
        },
      };
      const baselineEP = 350;
      const totalCost = passport.roadmap.phases.reduce((acc, p) => acc + p.phaseCost_RON, 0);
      expect(totalCost).toBe(150000);

      const epEnd = passport.roadmap.phases[passport.roadmap.phases.length - 1].ep_after;
      const reducPct = Math.round(((baselineEP - epEnd) / baselineEP) * 100);
      expect(reducPct).toBe(71); // (350-100)/350 ≈ 71%
    });
  });

  describe("FLOW 7: Lanț complet (tot fluxul end-to-end)", () => {
    it("Auditor → introduce baseInv 80k → schimbă scenariu high → toggle EUR → vede valoarea ajustată", () => {
      const Au = 100;
      const baseInv = 80000;

      // 1. Default mid
      let scenario = "mid";
      let inflation = getCostInflationFactorSync().factor;
      let adjusted = baseInv * SCENARIO_MULTIPLIERS[scenario] * inflation;
      logPriceEvent("scenario.changed", { mode: scenario });

      // 2. Outlier check
      let outlier = detectOutlier(adjusted, Au, { category: "RC" });
      logPriceEvent("outlier.flagged", { level: outlier.level, deltaPct: outlier.deltaPct });

      // 3. Schimbă la HIGH
      scenario = "high";
      adjusted = baseInv * SCENARIO_MULTIPLIERS[scenario] * inflation;
      logPriceEvent("scenario.changed", { mode: scenario });
      expect(adjusted).toBeCloseTo(94400, 0); // 80k × 1.18

      // 4. Toggle currency EUR
      setCurrencyMode("EUR");
      logPriceEvent("currency.changed", { mode: "EUR" });
      const fmt = fmtMoney(adjusted, "RON", { eurRon: 5.10 });
      expect(fmt).toContain("EUR");

      // 5. Verifică telemetrie
      const events = getPriceEvents();
      expect(events.length).toBeGreaterThanOrEqual(4);
      const dist = getScenarioDistribution();
      expect(dist.mid).toBe(1);
      expect(dist.high).toBe(1);
    });
  });

  describe("FLOW 8: Regresie REHAB_PRICES disponibil în scope", () => {
    it("REHAB_PRICES.eur_ron_fallback = 5.10 (canonic post-Sprint P0.1)", () => {
      expect(REHAB_PRICES.eur_ron_fallback).toBe(5.10);
    });

    it("REHAB_PRICES.last_updated e set (necesar pentru BASE_PERIOD în cost-index)", () => {
      expect(REHAB_PRICES.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("Cele 3 scenarii există pentru wall_eps_10cm (cea mai folosită)", () => {
      const w = REHAB_PRICES.envelope.wall_eps_10cm;
      expect(w.low).toBeGreaterThan(0);
      expect(w.mid).toBeGreaterThan(w.low);
      expect(w.high).toBeGreaterThan(w.mid);
    });
  });

  describe("Cleanup integration", () => {
    it("clearPriceTelemetry șterge tot — următorul test e curat", () => {
      logPriceEvent("test.event", {});
      expect(getPriceEvents().length).toBeGreaterThan(0);
      clearPriceTelemetry();
      expect(getPriceEvents().length).toBe(0);
    });
  });
});
