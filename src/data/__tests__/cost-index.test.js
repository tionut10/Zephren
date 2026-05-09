// @vitest-environment jsdom
/**
 * cost-index.test.js — Sprint Audit Prețuri Tier 1 (9 mai 2026)
 *
 * Teste pentru indexarea costurilor de reabilitare via Eurostat sts_copi_q
 * (Construction Cost Index, residential, RO, quarterly).
 *
 * Acoperire:
 *   - Conversie dată → perioadă Eurostat (YYYY-Qx)
 *   - Cache localStorage 30 zile (read/write/expirat)
 *   - Override sessionStorage (set/get/reset)
 *   - Parse JSON-stat (structura răspuns Eurostat)
 *   - Calcul factor inflație (base / current)
 *   - Sanitize factor (FACTOR_MIN/MAX)
 *   - Fallback comportament (no fetch, no cache)
 *   - Wrappers getInflationAdjustedPrice + getInflationAdjustedPriceRON
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  dateToQuarter,
  setUserCostInflationOverride,
  calcInflationFactor,
  getCostInflationFactor,
  getCostInflationFactorSync,
  getInflationAdjustedPrice,
  getInflationAdjustedPriceRON,
  _internals,
} from "../cost-index.js";

beforeEach(() => {
  // Reset state-ul global persistent înainte de fiecare test
  try { localStorage.removeItem(_internals.CACHE_KEY); } catch {}
  try { sessionStorage.removeItem("user_cost_inflation_factor"); } catch {}
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Tier 1 — cost-index — conversie dată → perioadă", () => {
  it("dateToQuarter: ISO YYYY-MM-DD → YYYY-Qx", () => {
    expect(dateToQuarter("2026-01-15")).toBe("2026-Q1");
    expect(dateToQuarter("2026-04-26")).toBe("2026-Q2");
    expect(dateToQuarter("2026-07-01")).toBe("2026-Q3");
    expect(dateToQuarter("2026-10-31")).toBe("2026-Q4");
    expect(dateToQuarter("2025-12-15")).toBe("2025-Q4");
  });

  it("dateToQuarter: format deja YYYY-Qx → idempotent", () => {
    expect(dateToQuarter("2026-Q1")).toBe("2026-Q1");
    expect(dateToQuarter("2024-Q3")).toBe("2024-Q3");
  });

  it("dateToQuarter: input invalid → fallback la BASE_PERIOD", () => {
    expect(dateToQuarter("")).toBe(_internals.BASE_PERIOD);
    expect(dateToQuarter(null)).toBe(_internals.BASE_PERIOD);
    expect(dateToQuarter("invalid")).toBe(_internals.BASE_PERIOD);
  });
});

describe("Tier 1 — calcInflationFactor (matematica)", () => {
  const series = [
    { period: "2025-Q4", value: 100 },
    { period: "2026-Q1", value: 105 },
    { period: "2026-Q2", value: 108 },
    { period: "2026-Q3", value: 112 },
  ];

  it("base = mid serie, current = ultim → factor crescător", () => {
    const f = calcInflationFactor(series, "2026-Q1");
    expect(f).toBeCloseTo(112 / 105, 3); // ~1.067
  });

  it("base = current → factor 1.0", () => {
    const f = calcInflationFactor(series, "2026-Q3", "2026-Q3");
    expect(f).toBe(1.0);
  });

  it("base înainte de serie → factor descrește (ex: deflation)", () => {
    const desc = [
      { period: "2025-Q4", value: 110 },
      { period: "2026-Q1", value: 100 },
    ];
    const f = calcInflationFactor(desc, "2025-Q4");
    expect(f).toBeCloseTo(100 / 110, 3); // ~0.909
  });

  it("base inexistent în serie → factor neutru 1.0", () => {
    const f = calcInflationFactor(series, "2020-Q1");
    expect(f).toBe(1.0);
  });

  it("serie goală sau invalidă → factor neutru 1.0", () => {
    expect(calcInflationFactor([], "2026-Q1")).toBe(1.0);
    expect(calcInflationFactor(null, "2026-Q1")).toBe(1.0);
  });

  it("factor sanitize: respinge valori în afara [FACTOR_MIN, FACTOR_MAX]", () => {
    const extremeUp = [
      { period: "2026-Q1", value: 100 },
      { period: "2026-Q2", value: 1000 }, // 10× — peste FACTOR_MAX (3.0)
    ];
    expect(calcInflationFactor(extremeUp, "2026-Q1")).toBe(1.0);
    const extremeDown = [
      { period: "2026-Q1", value: 100 },
      { period: "2026-Q2", value: 10 }, // 0.1× — sub FACTOR_MIN (0.5)
    ];
    expect(calcInflationFactor(extremeDown, "2026-Q1")).toBe(1.0);
  });

  it("rotunjire la 3 zecimale", () => {
    const s = [
      { period: "2026-Q1", value: 100 },
      { period: "2026-Q2", value: 106.789 },
    ];
    const f = calcInflationFactor(s, "2026-Q1");
    expect(f).toBe(1.068); // 106.789/100 = 1.06789 → rounded
  });
});

describe("Tier 1 — Override sessionStorage", () => {
  it("setUserCostInflationOverride: valoare validă → true + persistă", () => {
    expect(setUserCostInflationOverride(1.06)).toBe(true);
    const r = getCostInflationFactorSync();
    expect(r.factor).toBe(1.06);
    expect(r.source).toBe("override");
  });

  it("setUserCostInflationOverride: valoare în afara limitelor → false", () => {
    expect(setUserCostInflationOverride(0.4)).toBe(false); // sub FACTOR_MIN
    expect(setUserCostInflationOverride(3.5)).toBe(false); // peste FACTOR_MAX
    expect(setUserCostInflationOverride(NaN)).toBe(false);
    expect(setUserCostInflationOverride("not-a-number")).toBe(false);
  });

  it("setUserCostInflationOverride(null) → reset (sourse: fallback)", () => {
    setUserCostInflationOverride(1.10);
    expect(setUserCostInflationOverride(null)).toBe(true);
    const r = getCostInflationFactorSync();
    expect(r.source).toBe("fallback");
    expect(r.factor).toBe(1.0);
  });
});

describe("Tier 1 — Cache localStorage", () => {
  it("getCostInflationFactorSync: cache valid → return cache", () => {
    const payload = {
      factor: 1.06,
      basePeriod: _internals.BASE_PERIOD,
      currentPeriod: "2026-Q3",
      ts: Date.now(),
    };
    localStorage.setItem(_internals.CACHE_KEY, JSON.stringify(payload));
    const r = getCostInflationFactorSync();
    expect(r.source).toBe("cache");
    expect(r.factor).toBe(1.06);
    expect(r.currentPeriod).toBe("2026-Q3");
  });

  it("getCostInflationFactorSync: cache expirat (>30d) → fallback", () => {
    const payload = {
      factor: 1.06,
      basePeriod: _internals.BASE_PERIOD,
      currentPeriod: "2025-Q1",
      ts: Date.now() - (_internals.CACHE_TTL_MS + 1000), // > 30 zile
    };
    localStorage.setItem(_internals.CACHE_KEY, JSON.stringify(payload));
    const r = getCostInflationFactorSync();
    expect(r.source).toBe("fallback");
    expect(r.factor).toBe(1.0);
  });

  it("getCostInflationFactorSync: cache cu basePeriod diferit → fallback (recalibrare)", () => {
    const payload = {
      factor: 1.10,
      basePeriod: "2024-Q1", // diferit de BASE_PERIOD
      currentPeriod: "2026-Q3",
      ts: Date.now(),
    };
    localStorage.setItem(_internals.CACHE_KEY, JSON.stringify(payload));
    const r = getCostInflationFactorSync();
    expect(r.source).toBe("fallback");
  });

  it("getCostInflationFactorSync: cache corupt → fallback fără crash", () => {
    localStorage.setItem(_internals.CACHE_KEY, "not-valid-json{");
    const r = getCostInflationFactorSync();
    expect(r.source).toBe("fallback");
    expect(r.factor).toBe(1.0);
  });
});

describe("Tier 1 — Fallback no cache no override", () => {
  it("getCostInflationFactorSync: gol → factor 1.0 + sursa fallback", () => {
    const r = getCostInflationFactorSync();
    expect(r.factor).toBe(1.0);
    expect(r.source).toBe("fallback");
    expect(r.basePeriod).toBe(_internals.BASE_PERIOD);
  });
});

describe("Tier 1 — getCostInflationFactor (async)", () => {
  it("override are prioritate față de fetch live", async () => {
    setUserCostInflationOverride(1.07);
    const r = await getCostInflationFactor();
    expect(r.source).toBe("override");
    expect(r.factor).toBe(1.07);
  });

  it("fetch eșuat (network down) → fallback factor 1.0", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const r = await getCostInflationFactor();
    expect(r.source).toBe("fallback");
    expect(r.factor).toBe(1.0);
  });

  it("fetch returnează 500 → fallback factor 1.0", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    const r = await getCostInflationFactor();
    expect(r.source).toBe("fallback");
  });
});

describe("Tier 1 — Wrappers getInflationAdjustedPrice", () => {
  it("getInflationAdjustedPrice: factor 1.0 → preț identic cu base", () => {
    const r = getInflationAdjustedPrice("envelope", "wall_eps_10cm", "mid");
    expect(r).not.toBeNull();
    expect(r.priceBase).toBe(49); // rehab-prices: wall_eps_10cm.mid = 49 EUR
    expect(r.price).toBe(49);
    expect(r.factor).toBe(1.0);
    expect(r.source).toBe("fallback");
  });

  it("getInflationAdjustedPrice: cu override → preț ajustat", () => {
    setUserCostInflationOverride(1.10); // +10%
    const r = getInflationAdjustedPrice("envelope", "wall_eps_10cm", "mid");
    expect(r.priceBase).toBe(49);
    expect(r.price).toBeCloseTo(49 * 1.10, 2); // 53.90
    expect(r.factor).toBe(1.10);
  });

  it("getInflationAdjustedPrice: 3 scenarii (low/mid/high) păstrate", () => {
    const low  = getInflationAdjustedPrice("envelope", "wall_eps_10cm", "low");
    const mid  = getInflationAdjustedPrice("envelope", "wall_eps_10cm", "mid");
    const high = getInflationAdjustedPrice("envelope", "wall_eps_10cm", "high");
    expect(low.priceBase).toBe(42);
    expect(mid.priceBase).toBe(49);
    expect(high.priceBase).toBe(60);
  });

  it("getInflationAdjustedPrice: item inexistent → null", () => {
    const r = getInflationAdjustedPrice("envelope", "nu_exista", "mid");
    expect(r).toBeNull();
  });

  it("getInflationAdjustedPriceRON: include curs EUR/RON + factor", () => {
    setUserCostInflationOverride(1.05);
    const r = getInflationAdjustedPriceRON("renewables", "pv_kwp", "mid");
    expect(r).not.toBeNull();
    expect(r.priceBaseEUR).toBe(1100);
    expect(r.priceEUR).toBeCloseTo(1100 * 1.05, 1); // 1155
    expect(r.eurRon).toBeGreaterThan(4);
    expect(r.eurRon).toBeLessThan(8);
    expect(r.priceRON).toBe(Math.round(1100 * 1.05 * r.eurRon));
  });
});

describe("Tier 1 — Constante export pentru testabilitate", () => {
  it("_internals expune EUROSTAT_URL, BASE_PERIOD, BASE_DATE, CACHE_KEY, FACTOR_MIN, FACTOR_MAX", () => {
    expect(_internals.EUROSTAT_URL).toContain("eurostat");
    expect(_internals.EUROSTAT_URL).toContain("sts_copi_q");
    expect(_internals.EUROSTAT_URL).toContain("geo=RO");
    expect(_internals.BASE_PERIOD).toMatch(/^\d{4}-Q[1-4]$/);
    expect(_internals.BASE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(_internals.FACTOR_MIN).toBe(0.5);
    expect(_internals.FACTOR_MAX).toBe(3.0);
  });

  it("parseJsonStatTimeSeries: parsează corect un răspuns minimal", () => {
    const mockJsonStat = {
      dimension: {
        time: {
          category: {
            index: { "2026-Q1": 0, "2026-Q2": 1 },
            label: { "2026-Q1": "2026-Q1", "2026-Q2": "2026-Q2" },
          },
        },
      },
      value: { 0: 100, 1: 105 },
    };
    const series = _internals.parseJsonStatTimeSeries(mockJsonStat);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ period: "2026-Q1", value: 100 });
    expect(series[1]).toEqual({ period: "2026-Q2", value: 105 });
  });

  it("parseJsonStatTimeSeries: input invalid → null", () => {
    expect(_internals.parseJsonStatTimeSeries({})).toBeNull();
    expect(_internals.parseJsonStatTimeSeries(null)).toBeNull();
    expect(_internals.parseJsonStatTimeSeries({ dimension: {} })).toBeNull();
  });
});
