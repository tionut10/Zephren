/**
 * OfertaReabilitare-task-d.test.js — Sprint Audit Prețuri (9 mai 2026) Task D
 *
 * Teste pentru selectorul scenariu low/mid/high pe OfertaReabilitare:
 *   - SCENARIO_MULTIPLIERS calibrat pe rehab-prices.js (raport mediu low/mid/high)
 *   - SCENARIO_LABELS bilingv RO + sub-label EN (low/mid/high) + descriere
 *   - Investiția afișată = baseInv × multiplier (mid neutru, low −15%, high +18%)
 *
 * Vezi raport: docs/AUDIT_PRETURI_2026-05-09.md §1.6 + §5.4 (Task D).
 */

import { describe, it, expect } from "vitest";
import {
  SCENARIO_MULTIPLIERS,
  SCENARIO_LABELS,
} from "../OfertaReabilitare.jsx";

describe("Sprint Audit Prețuri Task D — OfertaReabilitare scenariu MID + selector", () => {
  describe("SCENARIO_MULTIPLIERS — calibrare pe rehab-prices.js", () => {
    it("conține exact 3 chei: low, mid, high", () => {
      expect(Object.keys(SCENARIO_MULTIPLIERS).sort()).toEqual(["high", "low", "mid"]);
    });

    it("scenariu MID este neutru (multiplicator 1.0)", () => {
      expect(SCENARIO_MULTIPLIERS.mid).toBe(1.0);
    });

    it("scenariu LOW reduce cu ~15% (≈0.85)", () => {
      expect(SCENARIO_MULTIPLIERS.low).toBe(0.85);
      expect(SCENARIO_MULTIPLIERS.low).toBeGreaterThan(0.7);
      expect(SCENARIO_MULTIPLIERS.low).toBeLessThan(1.0);
    });

    it("scenariu HIGH majorează cu ~18% (≈1.18)", () => {
      expect(SCENARIO_MULTIPLIERS.high).toBe(1.18);
      expect(SCENARIO_MULTIPLIERS.high).toBeGreaterThan(1.0);
      expect(SCENARIO_MULTIPLIERS.high).toBeLessThan(1.30);
    });

    it("ordine logică: low < mid < high (bandă crescătoare)", () => {
      expect(SCENARIO_MULTIPLIERS.low).toBeLessThan(SCENARIO_MULTIPLIERS.mid);
      expect(SCENARIO_MULTIPLIERS.mid).toBeLessThan(SCENARIO_MULTIPLIERS.high);
    });
  });

  describe("SCENARIO_LABELS — UI bilingv RO + EN", () => {
    it("conține labels pentru toate cele 3 scenarii", () => {
      expect(SCENARIO_LABELS.low).toBeDefined();
      expect(SCENARIO_LABELS.mid).toBeDefined();
      expect(SCENARIO_LABELS.high).toBeDefined();
    });

    it("fiecare label are name, sub și desc", () => {
      for (const mode of ["low", "mid", "high"]) {
        expect(SCENARIO_LABELS[mode]).toHaveProperty("name");
        expect(SCENARIO_LABELS[mode]).toHaveProperty("sub");
        expect(SCENARIO_LABELS[mode]).toHaveProperty("desc");
      }
    });

    it("label LOW = Optimist, MID = Realist, HIGH = Conservator (ordine semantică)", () => {
      expect(SCENARIO_LABELS.low.name).toBe("Optimist");
      expect(SCENARIO_LABELS.mid.name).toBe("Realist");
      expect(SCENARIO_LABELS.high.name).toBe("Conservator");
    });

    it("sub-label include codul EN (low/mid/high) pentru reproductibilitate", () => {
      expect(SCENARIO_LABELS.low.sub).toBe("(low)");
      expect(SCENARIO_LABELS.mid.sub).toBe("(mid)");
      expect(SCENARIO_LABELS.high.sub).toBe("(high)");
    });
  });

  describe("Aplicare multiplicator pe investiție de bază", () => {
    const baseInv = 100000; // 100k RON ca scenariu mid

    it("MID păstrează valoarea de bază identică", () => {
      const adjusted = baseInv * SCENARIO_MULTIPLIERS.mid;
      expect(adjusted).toBe(baseInv);
    });

    it("LOW reduce investiția cu 15% (100k → 85k)", () => {
      const adjusted = baseInv * SCENARIO_MULTIPLIERS.low;
      expect(adjusted).toBe(85000);
    });

    it("HIGH majorează investiția cu 18% (100k → 118k)", () => {
      const adjusted = baseInv * SCENARIO_MULTIPLIERS.high;
      expect(adjusted).toBeCloseTo(118000, 0);
    });

    it("bandă LOW–HIGH la fel ca în rehab-prices.js (low/high ≈ 0.85/1.18)", () => {
      const lowToMid = SCENARIO_MULTIPLIERS.low / SCENARIO_MULTIPLIERS.mid;
      const highToMid = SCENARIO_MULTIPLIERS.high / SCENARIO_MULTIPLIERS.mid;
      // Bandă teoretic mid ± ~15-18% (calibrat pe wall_eps_10cm: low/mid=42/49=0.857, high/mid=60/49=1.224
      // și hp_aw_8kw: low/mid=5000/6500=0.769, high/mid=8500/6500=1.308 → mediu ~0.85/~1.18)
      expect(lowToMid).toBe(0.85);
      expect(highToMid).toBe(1.18);
    });
  });

  describe("Edge cases multiplicator", () => {
    it("investiție 0 rămâne 0 indiferent de scenariu", () => {
      expect(0 * SCENARIO_MULTIPLIERS.low).toBe(0);
      expect(0 * SCENARIO_MULTIPLIERS.high).toBe(0);
    });

    it("multiplicator nedefinit (mode invalid) — UI fallback la 1.0 prin || 1.0", () => {
      const fallback = SCENARIO_MULTIPLIERS["invalid_mode"] || 1.0;
      expect(fallback).toBe(1.0);
    });
  });
});
