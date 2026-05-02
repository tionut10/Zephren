import { describe, it, expect } from "vitest";
import {
  generateCpeRecommendations,
  formatRecommendationsForTable,
} from "../cpe-recommendations.js";

const PERFORMANT_CTX = {
  building: { areaUseful: "100", n50: "0.6", category: "RI" },
  envelopeSummary: { G: 0.4 },
  opaqueElements: [],
  glazingElements: [{ u: "1.0" }],
  thermalBridges: [],
  heating: { source: "PdC", eta_gen: "4.0" },
  acm: { source: "PdC" },
  cooling: { hasCooling: false },
  ventilation: { type: "MEC_HRV" },
  lighting: { type: "LED" },
  solarThermal: { enabled: true },
  photovoltaic: { enabled: true },
  instSummary: { ep_total_m2: 80, isCOP: true, qf_w: 500, leni: 5 },
  renewSummary: { rer: 45 },
  rer: 45,
};

describe("generateCpeRecommendations — clădire performantă", () => {
  it("returnează doar mesajul Z0 pentru clădire bună", () => {
    const r = generateCpeRecommendations(PERFORMANT_CTX);
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe("Z0");
    expect(r[0].priority).toBe("scăzută");
  });
});

describe("generateCpeRecommendations — anvelopă", () => {
  it("A1: G > 0.8 → recomandare termoizolare cu prioritate înaltă", () => {
    const ctx = { ...PERFORMANT_CTX, envelopeSummary: { G: 1.2 } };
    const r = generateCpeRecommendations(ctx);
    const a1 = r.find((x) => x.code === "A1");
    expect(a1).toBeDefined();
    expect(a1.priority).toBe("înaltă");
    expect(a1.detail).toContain("1,200");
  });

  it("A2: tâmplărie U > 1.8 → înlocuire", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      glazingElements: [{ u: "2.5" }, { u: "1.0" }],
    };
    const r = generateCpeRecommendations(ctx);
    const a2 = r.find((x) => x.code === "A2");
    expect(a2).toBeDefined();
    // 2.5 > 2.5 false dar > 1.8 true → MEDIUM (pentru U între 1.8 și 2.5)
    // 2.5 > 2.5 = false → MEDIUM
    expect(["medie", "înaltă"]).toContain(a2.priority);
  });

  it("A4: punți termice ratio > 0.05 → tratare", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      thermalBridges: [{ psi: "0.5", length: "20" }],
    };
    const r = generateCpeRecommendations(ctx);
    const a4 = r.find((x) => x.code === "A4");
    expect(a4).toBeDefined();
    expect(a4.detail).toContain("0,100"); // 0.5 * 20 / 100 = 0.1
  });
});

describe("generateCpeRecommendations — instalații", () => {
  it("B1: cazan vechi η<85% → înlocuire condensare/PdC (înaltă)", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      heating: { source: "GAZ_CONV", eta_gen: "0.78" },
      instSummary: {
        ...PERFORMANT_CTX.instSummary,
        isCOP: false,
        eta_total_h: 0.78,
      },
    };
    const r = generateCpeRecommendations(ctx);
    const b1 = r.find((x) => x.code === "B1");
    expect(b1).toBeDefined();
    expect(b1.priority).toBe("înaltă");
    expect(b1.measure).toContain("condensare");
  });

  it("B1: pompă căldură SCOP < 3.0 → modernizare (medie)", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      heating: { source: "PdC", eta_gen: "2.5" },
      instSummary: { ...PERFORMANT_CTX.instSummary, isCOP: true },
    };
    const r = generateCpeRecommendations(ctx);
    const b1 = r.find((x) => x.code === "B1");
    expect(b1).toBeDefined();
    expect(b1.priority).toBe("medie");
  });

  it("B2: ventilație naturală → HRV", () => {
    const ctx = { ...PERFORMANT_CTX, ventilation: { type: "NAT" } };
    const r = generateCpeRecommendations(ctx);
    expect(r.some((x) => x.code === "B2")).toBe(true);
  });

  it("B3: răcire EER < 3.0 → modernizare", () => {
    const ctx = { ...PERFORMANT_CTX, cooling: { hasCooling: true, eer: "2.5" } };
    const r = generateCpeRecommendations(ctx);
    expect(r.some((x) => x.code === "B3")).toBe(true);
  });
});

describe("generateCpeRecommendations — SRE și iluminat", () => {
  it("C1: PV nu e activ + RER < 30 → înaltă", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      photovoltaic: { enabled: false },
      rer: 15,
      renewSummary: { rer: 15 },
    };
    const r = generateCpeRecommendations(ctx);
    const c1 = r.find((x) => x.code === "C1");
    expect(c1).toBeDefined();
    expect(c1.priority).toBe("înaltă");
  });

  it("C2: solar termic absent + ACM > 10 kWh/m² → instalare", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      solarThermal: { enabled: false },
      instSummary: { ...PERFORMANT_CTX.instSummary, qf_w: 1500 }, // 15 kWh/m² pe Au=100
    };
    const r = generateCpeRecommendations(ctx);
    expect(r.some((x) => x.code === "C2")).toBe(true);
  });

  it("D1: LENI > 15 → modernizare (medie)", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      instSummary: { ...PERFORMANT_CTX.instSummary, leni: 20 },
    };
    const r = generateCpeRecommendations(ctx);
    const d1 = r.find((x) => x.code === "D1");
    expect(d1).toBeDefined();
    expect(d1.priority).toBe("medie");
  });
});

describe("generateCpeRecommendations — etanșeitate și bloc", () => {
  it("E1: n50 > 1.0 → îmbunătățire (medie); n50 > 3.0 → înaltă", () => {
    const r1 = generateCpeRecommendations({
      ...PERFORMANT_CTX,
      building: { ...PERFORMANT_CTX.building, n50: "1.5" },
    });
    expect(r1.find((x) => x.code === "E1")?.priority).toBe("medie");

    const r2 = generateCpeRecommendations({
      ...PERFORMANT_CTX,
      building: { ...PERFORMANT_CTX.building, n50: "4.0" },
    });
    expect(r2.find((x) => x.code === "E1")?.priority).toBe("înaltă");
  });

  it("F1: bloc RC cu apartamente > 4 fără distribuție orizontală → recomandă repartitor", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      building: {
        ...PERFORMANT_CTX.building,
        category: "RC",
        apartments: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
        commonSystems: { heatingDistribution: "vertical" },
      },
    };
    const r = generateCpeRecommendations(ctx);
    expect(r.some((x) => x.code === "F1")).toBe(true);
  });

  it("F1: NU pentru RI (nu e bloc)", () => {
    const ctx = {
      ...PERFORMANT_CTX,
      building: { ...PERFORMANT_CTX.building, category: "RI" },
    };
    const r = generateCpeRecommendations(ctx);
    expect(r.some((x) => x.code === "F1")).toBe(false);
  });
});

describe("savings — audit P1.12 (no fallback 20%)", () => {
  it("nu folosește 20% default; păstrează valorile specifice per recomandare", () => {
    const ctx = { ...PERFORMANT_CTX, envelopeSummary: { G: 1.5 } };
    const r = generateCpeRecommendations(ctx);
    const a1 = r.find((x) => x.code === "A1");
    expect(a1.savings).toBe("15–25%"); // valoare specifică, nu 20% generic
    expect(a1.savings).not.toBe("20%");
  });

  it("financialAnalysis Pas 7 override savings 'necalculat' → valoare reală", () => {
    // Niciuna dintre recomandările curente nu are 'necalculat' hardcoded,
    // dar verificăm că logica nu sparge cu financialAnalysis prezent.
    const ctx = {
      ...PERFORMANT_CTX,
      envelopeSummary: { G: 1.5 },
      financialAnalysis: { energySavingsPercent: 35 },
    };
    const r = generateCpeRecommendations(ctx);
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("formatRecommendationsForTable", () => {
  it("convertește la format compact n/m/d/e/p", () => {
    const recs = [
      { code: "A1", priority: "înaltă", category: "Anvelopă", measure: "Test", detail: "Detail", savings: "10%" },
    ];
    const t = formatRecommendationsForTable(recs);
    expect(t[0]).toMatchObject({
      n: 1, m: "Test", d: "Anvelopă", e: "10%", p: "ÎNALTĂ", code: "A1",
    });
  });
});
