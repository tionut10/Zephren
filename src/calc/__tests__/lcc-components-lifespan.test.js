import { describe, it, expect } from "vitest";
import { calcMeasure } from "../../components/LCCAnalysis.jsx";

// Parametri comuni pentru calcMeasure(m, Au, ep_m2, pretEnergie, escalare, rata, perioadaAnalize, perspective)
const AU        = 100;   // m²
const EP_M2     = 200;   // kWh/m²·an
const PRET      = 0.50;  // RON/kWh
const ESCALARE  = 0.03;
const RATA      = 0.04;
const PERIOADA  = 30;    // ani

describe("LCC — durate componente diferite (EN 15459-1)", () => {

  // ─── LED 10 ani în perioadă 30 ani ─────────────────────────────────────────
  it("LED 10 ani generează 2 replacements în perioadă 30 ani", () => {
    const m = { id:"led", name:"LED", deltaEP_pct:6, investRON_m2:40, lifespan:10, maintPct:0.5 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(2);
    expect(result.replacementCosts[0].year).toBe(10);
    expect(result.replacementCosts[1].year).toBe(20);
  });

  it("LED 10 ani — replacements au cost egal cu investiția inițială", () => {
    const m = { id:"led", name:"LED", deltaEP_pct:6, investRON_m2:40, lifespan:10, maintPct:0.5 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    const investAsteptat = 40 * AU;  // 4000 RON
    result.replacementCosts.forEach(rc => {
      expect(rc.cost).toBeCloseTo(investAsteptat, 0);
    });
  });

  it("LED 10 ani — valoare reziduală ≈ 0 (ciclu complet la an 30)", () => {
    const m = { id:"led", name:"LED", deltaEP_pct:6, investRON_m2:40, lifespan:10, maintPct:0.5 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.residualValue).toBeCloseTo(0, 1);
  });

  // ─── Anvelopă 40 ani în perioadă 30 ani ────────────────────────────────────
  it("anvelopă 40 ani nu generează replacements în perioadă 30 ani", () => {
    const m = { id:"wall", name:"Anvelopă EPS", deltaU_pct:65, investRON_m2:280, lifespan:40, maintPct:0.5 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(0);
  });

  it("anvelopă 40 ani — valoare reziduală > 0 (25% din durata rămasă)", () => {
    const m = { id:"wall", name:"Anvelopă EPS", deltaU_pct:65, investRON_m2:280, lifespan:40, maintPct:0.5 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.residualValue).toBeGreaterThan(0);
  });

  // ─── Cazanul 20 ani în perioadă 30 ani ─────────────────────────────────────
  it("cazan 20 ani generează 1 replacement la an 20", () => {
    const m = { id:"boiler", name:"Cazan", deltaEP_pct:15, investRON:12000, lifespan:20, maintPct:2.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(1);
    expect(result.replacementCosts[0].year).toBe(20);
  });

  it("cazan 20 ani — valoare reziduală > 0 (instalat la an 20, perioadă se termină la 30)", () => {
    const m = { id:"boiler", name:"Cazan", deltaEP_pct:15, investRON:12000, lifespan:20, maintPct:2.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    // Ultimul replacement la an 20; la an 30 componenta are 10 ani → 50% residual
    expect(result.residualValue).toBeGreaterThan(0);
  });

  // ─── PV 25 ani în perioadă 30 ani ──────────────────────────────────────────
  it("PV 25 ani generează 1 replacement la an 25 în perioadă 30 ani", () => {
    const m = { id:"pv", name:"PV 5kWp", prodkWh:5500, investRON:27300, lifespan:25, maintPct:1.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(1);
    expect(result.replacementCosts[0].year).toBe(25);
  });

  // ─── BACS 15 ani în perioadă 30 ani ────────────────────────────────────────
  it("BACS 15 ani generează 1 replacement la an 15", () => {
    const m = { id:"bacs", name:"BACS B", deltaEP_pct:17, investRON:25000, lifespan:15, maintPct:3.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(1);
    expect(result.replacementCosts[0].year).toBe(15);
  });

  // ─── Ferestre 30 ani în perioadă 30 ani ────────────────────────────────────
  it("ferestre 30 ani nu generează replacements (lifespan = perioadă)", () => {
    const m = { id:"windows", name:"Ferestre", deltaU_pct:55, investRON_m2:1200, lifespan:30, maintPct:1.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.replacementCosts).toHaveLength(0);
  });

  it("ferestre 30 ani — valoare reziduală ≈ 0 (tocmai terminate)", () => {
    const m = { id:"windows", name:"Ferestre", deltaU_pct:55, investRON_m2:1200, lifespan:30, maintPct:1.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result.residualValue).toBeCloseTo(0, 1);
  });

  // ─── Câmpuri returnate ─────────────────────────────────────────────────────
  it("calcMeasure returnează câmpurile de bază obligatorii", () => {
    const m = { id:"test", name:"Test", deltaEP_pct:10, investRON:10000, lifespan:20, maintPct:1.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "financial");
    expect(result).toHaveProperty("investitie");
    expect(result).toHaveProperty("economie_an1");
    expect(result).toHaveProperty("npv");
    expect(result).toHaveProperty("lcc");
    expect(result).toHaveProperty("ep_dupa");
    expect(result).toHaveProperty("cost_optim");
    expect(result).toHaveProperty("replacementCosts");
    expect(result).toHaveProperty("residualValue");
    expect(result).toHaveProperty("fin");
  });

  it("calcMeasure cu perspectivă macroeconomică setează vatExcluded=true în fin", () => {
    const m = { id:"test", name:"Test", deltaEP_pct:10, investRON:10000, lifespan:20, maintPct:1.0 };
    const result = calcMeasure(m, AU, EP_M2, PRET, ESCALARE, RATA, PERIOADA, "macroeconomic");
    expect(result.fin?.vatExcluded).toBe(true);
  });
});
