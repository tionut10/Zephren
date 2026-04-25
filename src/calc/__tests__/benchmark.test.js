import { describe, it, expect } from "vitest";
import { calcBenchmark, EP_BENCHMARKS, ERA_LABELS } from "../benchmark.js";

// ═══════════════════════════════════════════════════════════════
// Teste unitare — Benchmark EP clădiri similare
// ═══════════════════════════════════════════════════════════════

describe("EP_BENCHMARKS — date din JSON", () => {
  it("conține toate categoriile funcționale principale", () => {
    const categorii = ["RI", "RC", "RA", "BI", "ED", "SA", "HC", "CO", "SP", "AL"];
    categorii.forEach(cat => {
      expect(EP_BENCHMARKS[cat]).toBeDefined();
    });
  });

  it("fiecare categorie are toate zonele climatice I-V", () => {
    Object.entries(EP_BENCHMARKS).forEach(([cat, zones]) => {
      ["I", "II", "III", "IV", "V"].forEach(zona => {
        expect(zones[zona], `${cat}.${zona}`).toBeDefined();
      });
    });
  });

  it("percentilele sunt în ordine crescătoare p10 < p25 < p50 < p75 < p90", () => {
    Object.entries(EP_BENCHMARKS).forEach(([cat, zones]) => {
      Object.entries(zones).forEach(([zona, bm]) => {
        expect(bm.p10, `${cat}.${zona}.p10`).toBeLessThan(bm.p25);
        expect(bm.p25, `${cat}.${zona}.p25`).toBeLessThan(bm.p50);
        expect(bm.p50, `${cat}.${zona}.p50`).toBeLessThan(bm.p75);
        expect(bm.p75, `${cat}.${zona}.p75`).toBeLessThan(bm.p90);
      });
    });
  });

  it("zona V (mai rece) are valori EP mai mari decât zona I", () => {
    Object.entries(EP_BENCHMARKS).forEach(([cat, zones]) => {
      if (zones.I && zones.V) {
        expect(zones.V.p50, `${cat}: Zona V > Zona I`).toBeGreaterThan(zones.I.p50);
      }
    });
  });

  it("clădirile de sănătate (SA) au p50 mai mare decât rezidențiale (RI) — intensitate energetică mai mare", () => {
    expect(EP_BENCHMARKS.SA.III.p50).toBeGreaterThan(EP_BENCHMARKS.RI.III.p50);
  });
});

describe("ERA_LABELS — date din JSON", () => {
  it("conține toate perioadele constructive", () => {
    const perioade = ["pre1950", "s1950_70", "s1970_89", "s1990_02", "s2003_12", "s2013_22", "post2023"];
    perioade.forEach(p => {
      expect(ERA_LABELS[p], p).toBeDefined();
      expect(typeof ERA_LABELS[p]).toBe("string");
    });
  });
});

describe("calcBenchmark — returnare null / fallback", () => {
  it("returnează obiect pentru date minimale", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 200 });
    expect(res).not.toBeNull();
  });

  it("folosește AL ca fallback pentru categorie necunoscută", () => {
    const res = calcBenchmark({ category: "XX", zone: "III", epActual: 150 });
    expect(res).not.toBeNull();
    expect(res.category).toBe("XX");
  });

  it("folosește zona III ca fallback", () => {
    const res = calcBenchmark({ epActual: 200 });
    expect(res).not.toBeNull();
    expect(res.zone).toBe("III");
  });
});

describe("calcBenchmark — calcul corect percentile", () => {
  const bm = EP_BENCHMARKS.RI.III;

  it("EP sub p10 → percentilă 10 (Top 10% eficient)", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: bm.p10 - 1 });
    expect(res.percentileActual.pct).toBe(10);
  });

  it("EP între p10 și p25 → percentilă 25", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: (bm.p10 + bm.p25) / 2 });
    expect(res.percentileActual.pct).toBe(25);
  });

  it("EP între p25 și p50 → percentilă 50 (Median)", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: (bm.p25 + bm.p50) / 2 });
    expect(res.percentileActual.pct).toBe(50);
  });

  it("EP între p75 și p90 → percentilă 90 (Top 10% ineficient)", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: (bm.p75 + bm.p90) / 2 });
    expect(res.percentileActual.pct).toBe(90);
  });

  it("EP peste p90 → percentilă 99 (Extrem)", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: bm.p90 + 50 });
    expect(res.percentileActual.pct).toBe(99);
  });
});

describe("calcBenchmark — potențial de economisire", () => {
  it("savingToMedian = 0 pentru clădiri sub p50", () => {
    const bm = EP_BENCHMARKS.RI.III;
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: bm.p10 });
    expect(res.savingToMedian).toBe(0);
  });

  it("savingToTop10 > savingToMedian pentru clădiri ineficiente", () => {
    const bm = EP_BENCHMARKS.BI.III;
    const res = calcBenchmark({ category: "BI", zone: "III", epActual: bm.p90 });
    expect(res.savingToTop10).toBeGreaterThan(res.savingToMedian);
  });
});

describe("calcBenchmark — chart bars", () => {
  const res = calcBenchmark({ category: "RI", zone: "III", epActual: 150 });

  it("chart.bars conține minim 4 bare", () => {
    expect(res.chart.bars.length).toBeGreaterThanOrEqual(4);
  });

  it("prima bară este clădirea curentă cu highlight", () => {
    expect(res.chart.bars[0].highlight).toBe(true);
    expect(res.chart.bars[0].value).toBe(150);
  });

  it("cu epAfterRehab → 5 bare", () => {
    const r2 = calcBenchmark({ category: "RI", zone: "III", epActual: 200, epAfterRehab: 80 });
    expect(r2.chart.bars.length).toBe(5);
    expect(r2.percentileAfter).not.toBeNull();
  });
});

describe("calcBenchmark — etichetă perioadă constructivă", () => {
  const cases = [
    { year: 1940, era: "pre1950" },
    { year: 1960, era: "s1950_70" },
    { year: 1980, era: "s1970_89" },
    { year: 1995, era: "s1990_02" },
    { year: 2007, era: "s2003_12" },
    { year: 2018, era: "s2013_22" },
    { year: 2024, era: "post2023" },
  ];

  cases.forEach(({ year, era }) => {
    it(`an ${year} → ${era}`, () => {
      const res = calcBenchmark({ category: "RI", zone: "III", epActual: 150, yearBuilt: year });
      expect(res.era).toBe(era);
      expect(res.eraLabel).toBe(ERA_LABELS[era]);
    });
  });
});

describe("calcBenchmark — câmpuri obligatorii în rezultat", () => {
  const res = calcBenchmark({ category: "RC", zone: "II", epActual: 120, Au: 80 });

  it("are toate câmpurile necesare", () => {
    expect(res).toHaveProperty("benchmark");
    expect(res).toHaveProperty("percentileActual");
    expect(res).toHaveProperty("betterThanPct");
    expect(res).toHaveProperty("savingToMedian");
    expect(res).toHaveProperty("savingToTop10");
    expect(res).toHaveProperty("nzebTarget");
    expect(res).toHaveProperty("verdict");
    expect(res).toHaveProperty("recommendation");
    expect(res).toHaveProperty("chart");
  });

  it("nzebTarget = p10 din categoria/zona selectată (fără yearBuilt → baseline neajustat)", () => {
    expect(res.nzebTarget).toBe(EP_BENCHMARKS.RC.II.p10);
  });
});

// ═══════════════════════════════════════════════════════════════
// Sprint B Task 3 — filtrare REALĂ pe era construcției
// ═══════════════════════════════════════════════════════════════
describe("calcBenchmark — filtrare pe eră (Sprint B Task 3)", () => {
  it("fără yearBuilt → era=s2003_12 (baseline), factor 1.00, eraAdjusted=false", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 150 });
    expect(res.era).toBe("s2003_12");
    expect(res.eraFactor).toBe(1.0);
    expect(res.eraAdjusted).toBe(false);
    expect(res.benchmark.p50).toBe(EP_BENCHMARKS.RI.III.p50);
  });

  it("yearBuilt=1980 (s1970_89) → factor >1, percentile MAI MARI decât baseline", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 200, yearBuilt: 1980 });
    expect(res.era).toBe("s1970_89");
    expect(res.eraFactor).toBeGreaterThan(1.0);
    expect(res.eraAdjusted).toBe(true);
    expect(res.benchmark.p50).toBeGreaterThan(EP_BENCHMARKS.RI.III.p50);
  });

  it("yearBuilt=2024 (post2023, nZEB) → factor <1, percentile MAI MICI decât baseline", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 80, yearBuilt: 2024 });
    expect(res.era).toBe("post2023");
    expect(res.eraFactor).toBeLessThan(1.0);
    expect(res.benchmark.p50).toBeLessThan(EP_BENCHMARKS.RI.III.p50);
  });

  it("benchmarkRaw păstrează valorile baseline neajustate", () => {
    const res = calcBenchmark({ category: "RC", zone: "IV", epActual: 200, yearBuilt: 1965 });
    expect(res.benchmarkRaw.p50).toBe(EP_BENCHMARKS.RC.IV.p50);
    // benchmark ajustat e diferit
    expect(res.benchmark.p50).not.toBe(res.benchmarkRaw.p50);
  });

  it("clădire pre-1950 are p50 ajustat cu factor mai mare decât s2013_22", () => {
    const oldHouse = calcBenchmark({ category: "RI", zone: "III", epActual: 250, yearBuilt: 1930 });
    const newHouse = calcBenchmark({ category: "RI", zone: "III", epActual: 80, yearBuilt: 2018 });
    expect(oldHouse.benchmark.p50).toBeGreaterThan(newHouse.benchmark.p50);
  });

  it("meta conține disclaimer text + sursă", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 150 });
    expect(res.meta).toBeDefined();
    expect(res.meta.warning).toMatch(/orientativ/i);
    expect(res.meta.source).toMatch(/UTBv|ICCPDC|INCERC|Mc 001/);
  });

  it("verdict include perioada constructivă când e ajustată", () => {
    const res = calcBenchmark({ category: "RI", zone: "III", epActual: 150, yearBuilt: 1985 });
    expect(res.verdict).toMatch(/perioad|factor/i);
  });
});
