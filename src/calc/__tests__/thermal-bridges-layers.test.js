import { describe, it, expect } from "vitest";
import {
  ELEMENT_CATEGORIES,
  CONSTRUCTIONS_NORMATIVE_BASIS,
  SURFACE_RESISTANCES,
  MATERIAL_LIBRARY,
  getAllConstructions,
  getConstructionsByCategory,
  getConstructionById,
  getConstructionLayers,
  calcRFromLayers,
  calcUFromConstruction,
  getPsiFactor,
  adjustPsiForConstruction,
  suggestConstruction,
  formatLayersSummary,
  checkConstructionCompliance,
  getMaterialsByGroup,
  findMaterial,
  airGapResistance,
} from "../thermal-bridges-layers.js";

describe("thermal-bridges-layers — catalog & normative", () => {
  it("catalogul are minim 15 stratigrafii", () => {
    expect(getAllConstructions().length).toBeGreaterThanOrEqual(15);
  });

  it("acoperă toate cele 4 categorii principale PE/PT/PP/PL", () => {
    expect(getConstructionsByCategory("PE").length).toBeGreaterThanOrEqual(8);
    expect(getConstructionsByCategory("PT").length).toBeGreaterThanOrEqual(2);
    expect(getConstructionsByCategory("PP").length).toBeGreaterThanOrEqual(1);
    expect(getConstructionsByCategory("PL").length).toBeGreaterThanOrEqual(1);
  });

  it("citează minim 10 normative în vigoare (C107, ISO, Mc 001)", () => {
    expect(CONSTRUCTIONS_NORMATIVE_BASIS.length).toBeGreaterThanOrEqual(10);
    const all = CONSTRUCTIONS_NORMATIVE_BASIS.join("|");
    expect(all).toContain("C107/3-2005");
    expect(all).toContain("Mc 001-2022");
    expect(all).toContain("SR EN ISO 6946");
    expect(all).toContain("SR EN ISO 10211");
    expect(all).toContain("SR EN ISO 14683");
    expect(all).toContain("SR EN ISO 13370");
  });

  it("ELEMENT_CATEGORIES are câte o intrare pentru PE/PT/PP/PL/PB", () => {
    ["PE", "PT", "PP", "PL", "PB"].forEach(c => {
      expect(ELEMENT_CATEGORIES[c]).toBeDefined();
      expect(ELEMENT_CATEGORIES[c].name_ro).toBeTruthy();
      expect(ELEMENT_CATEGORIES[c].name_en).toBeTruthy();
    });
  });
});

describe("getConstructionById & getConstructionLayers", () => {
  it("returnează stratigrafia pentru ID existent", () => {
    const c = getConstructionById("PE-01");
    expect(c).toBeTruthy();
    expect(c.category).toBe("PE");
    expect(c.layers_ext_to_int.length).toBeGreaterThan(2);
  });

  it("returnează straturi exterior-interior în ordinea corectă", () => {
    const layers = getConstructionLayers("PE-01");
    expect(layers[0].material.toLowerCase()).toMatch(/tencuial.*ciment|tencuial.*ext|exterior/);
    expect(layers[layers.length - 1].material.toLowerCase()).toMatch(/interior|gips|var/);
  });

  it("returnează null pentru ID inexistent", () => {
    expect(getConstructionById("XXX-999")).toBe(null);
    expect(getConstructionLayers("XXX-999")).toEqual([]);
  });
});

describe("calcRFromLayers — SR EN ISO 6946:2017", () => {
  it("include Rsi + Rse pentru perete vertical", () => {
    // Un strat singur: EPS 100mm, λ=0.040 → R=2.5; + Rsi 0.13 + Rse 0.04 = 2.67
    const R = calcRFromLayers([{ d_mm: 100, lambda: 0.040, R: null }], "perete_vertical");
    expect(R).toBeCloseTo(2.67, 1);
  });

  it("sumează corect straturi multiple", () => {
    const layers = [
      { d_mm: 100, lambda: 0.040, R: null }, // R=2.5
      { d_mm: 250, lambda: 0.80, R: null },  // R=0.3125
    ];
    const R = calcRFromLayers(layers, "perete_vertical");
    // 0.13 (Rsi) + 0.04 (Rse) + 2.5 + 0.3125 = 2.9825
    expect(R).toBeCloseTo(2.98, 1);
  });

  it("folosește valoarea R declarată (strat cu R override — ex. spațiu aer)", () => {
    const layers = [{ d_mm: 30, lambda: null, R: 0.180 }];
    const R = calcRFromLayers(layers, "perete_vertical");
    expect(R).toBeCloseTo(0.13 + 0.04 + 0.18, 2);
  });

  it("returnează 0 pentru input invalid", () => {
    expect(calcRFromLayers(null, "perete_vertical")).toBe(0);
    expect(calcRFromLayers([], "perete_vertical")).toBe(0);
  });

  it("diferențiază orientarea (Rsi diferit pentru planșeu ascendent vs descendent)", () => {
    const layer = [{ d_mm: 100, lambda: 0.034, R: null }];
    // ascendent: Rsi=0.10, Rse=0.04 → sum 0.14
    // descendent: Rsi=0.17, Rse=0.04 → sum 0.21
    const R_asc = calcRFromLayers(layer, "planseu_ascendent_vertical");
    const R_desc = calcRFromLayers(layer, "planseu_descendent_vertical");
    expect(R_desc).toBeGreaterThan(R_asc);
    expect(R_desc - R_asc).toBeCloseTo(0.07, 2);
  });
});

describe("calcUFromConstruction", () => {
  it("PE-04 (nZEB BCA+MW15) — U ≤ 0.18 (nZEB target)", () => {
    const U = calcUFromConstruction("PE-04");
    expect(U).toBeLessThanOrEqual(0.18);
    expect(U).toBeGreaterThan(0.10);
  });

  it("PE-06 (IPCT neizolat) — U > 0.6 (worst case)", () => {
    const U = calcUFromConstruction("PE-06");
    expect(U).toBeGreaterThan(0.6);
  });

  it("PL-02 (Passivhaus radier L) — U ≤ 0.15", () => {
    const U = calcUFromConstruction("PL-02");
    expect(U).toBeLessThanOrEqual(0.15);
  });
});

describe("getPsiFactor & adjustPsiForConstruction", () => {
  it("PE-04 (nZEB) reduce ψ la colț exterior cu factor ≤ 0.6", () => {
    const f = getPsiFactor("Colț exterior", "PE-04");
    expect(f).toBeLessThanOrEqual(0.6);
  });

  it("PE-06 (IPCT) crește ψ la planșeu intermediar (factor ≥ 1.2)", () => {
    const f = getPsiFactor("Perete ext. — Planșeu intermediar", "PE-06");
    expect(f).toBeGreaterThanOrEqual(1.2);
  });

  it("factor default 1.0 pentru combinații fără override", () => {
    expect(getPsiFactor("Punte xyz inexistentă", "PE-01")).toBe(1.0);
    expect(getPsiFactor("Colț exterior", "XX-99")).toBe(1.0);
  });

  it("adjustPsiForConstruction returnează ψ ajustat + clasă ISO", () => {
    const b = { name: "Colț exterior", psi: 0.05 };
    const r = adjustPsiForConstruction(b, "PE-04");
    expect(r.psi_base).toBe(0.05);
    expect(r.factor).toBeLessThanOrEqual(0.6);
    expect(r.psi_adjusted).toBeLessThan(0.05);
    expect(r.iso_class_base).toMatch(/^[ABCD]$/);
    expect(r.iso_class_adjusted).toMatch(/^[ABCD]$/);
  });
});

describe("suggestConstruction — heuristic an/tip construcție", () => {
  it("clădire istorică (pre-1945) → piatră izolație interioară (PE-10)", () => {
    expect(suggestConstruction({ year: 1920 })).toBe("PE-10");
  });

  it("bloc IPCT (1970-1990) → panou prefabricat (PE-06)", () => {
    expect(suggestConstruction({ year: 1975 })).toBe("PE-06");
    expect(suggestConstruction({ year: 1985 })).toBe("PE-06");
  });

  it("construcție nouă 2021+ → BCA nZEB (PE-04)", () => {
    expect(suggestConstruction({ year: 2023 })).toBe("PE-04");
  });

  it("structureType override prevalează peste an", () => {
    expect(suggestConstruction({ year: 2023, structureType: "CLT panouri" })).toBe("PE-08");
    expect(suggestConstruction({ year: 1970, structureType: "timber frame" })).toBe("PE-07");
  });

  it("returnează null pentru input fără an și fără structureType", () => {
    expect(suggestConstruction({})).toBe(null);
  });
});

describe("formatLayersSummary + checkConstructionCompliance", () => {
  it("formatLayersSummary returnează reprezentare compactă straturi", () => {
    const s = formatLayersSummary("PE-01");
    expect(s).toContain("EPS");
    expect(s).toContain("λ=");
    expect(s).toContain("mm");
  });

  it("checkConstructionCompliance — PE-04 satisface U_max nZEB 0.18", () => {
    const r = checkConstructionCompliance("PE-04", 0.18);
    expect(r.compliant).toBe(true);
    expect(r.margin).toBeGreaterThanOrEqual(0);
  });

  it("checkConstructionCompliance — PE-06 NU satisface U_max 0.35", () => {
    const r = checkConstructionCompliance("PE-06", 0.35);
    expect(r.compliant).toBe(false);
    expect(r.margin).toBeLessThan(0);
  });
});

describe("MATERIAL_LIBRARY — bibliotecă materiale cu λ", () => {
  it("conține minim 50 materiale în 9+ grupe", () => {
    expect(MATERIAL_LIBRARY.length).toBeGreaterThanOrEqual(50);
    const groups = new Set(MATERIAL_LIBRARY.map(m => m.group));
    expect(groups.size).toBeGreaterThanOrEqual(8);
  });

  it("include izolațiile standard (EPS, XPS, MW, PUR, Aerogel)", () => {
    const names = MATERIAL_LIBRARY.filter(m => m.group === "Izolație").map(m => m.name);
    expect(names.some(n => n.includes("EPS"))).toBe(true);
    expect(names.some(n => n.includes("XPS"))).toBe(true);
    expect(names.some(n => n.includes("Vată"))).toBe(true);
    expect(names.some(n => n.includes("PUR"))).toBe(true);
    expect(names.some(n => n.includes("Aerogel"))).toBe(true);
  });

  it("include zidărie RO (cărămidă GVP, BCA 450/500/700, piatră)", () => {
    const names = MATERIAL_LIBRARY.filter(m => m.group === "Zidărie").map(m => m.name);
    expect(names.some(n => n.includes("GVP"))).toBe(true);
    expect(names.some(n => n.includes("BCA") && n.includes("400"))).toBe(true);
    expect(names.some(n => n.includes("BCA") && n.includes("500"))).toBe(true);
    expect(names.some(n => n.includes("BCA") && n.includes("700"))).toBe(true);
    expect(names.some(n => n.includes("Piatră"))).toBe(true);
  });

  it("toate materialele au λ pozitiv rezonabil (0.01–500)", () => {
    for (const m of MATERIAL_LIBRARY) {
      expect(m.lambda, `${m.name}: λ=${m.lambda} invalid`).toBeGreaterThan(0.01);
      expect(m.lambda, `${m.name}: λ=${m.lambda} prea mare`).toBeLessThanOrEqual(500);
      expect(m.source).toBeTruthy();
    }
  });

  it("getMaterialsByGroup returnează dict grupat", () => {
    const g = getMaterialsByGroup();
    expect(Object.keys(g).length).toBeGreaterThanOrEqual(8);
    expect(Array.isArray(g["Izolație"])).toBe(true);
    expect(g["Izolație"].length).toBeGreaterThanOrEqual(10);
  });

  it("findMaterial găsește exact materialul după nume", () => {
    const m = findMaterial("XPS extrudat (ρ≈30-35 kg/m³)");
    expect(m).toBeTruthy();
    expect(m.lambda).toBe(0.034);
  });

  it("findMaterial returnează null pentru nume necunoscut", () => {
    expect(findMaterial("Material inexistent")).toBe(null);
  });
});

describe("airGapResistance — SR EN ISO 6946:2017 Tab. 2", () => {
  it("strat subțire (<5mm) are R=0", () => {
    expect(airGapResistance(3, "horizontal")).toBe(0);
  });

  it("aer 25mm orizontal: R ≈ 0.18", () => {
    expect(airGapResistance(25, "horizontal")).toBeCloseTo(0.18, 2);
  });

  it("aer 100mm flux descendent: R mai mare decât ascendent", () => {
    const rDown = airGapResistance(100, "down");
    const rUp = airGapResistance(100, "up");
    expect(rDown).toBeGreaterThan(rUp);
  });

  it("interpolare liniară pentru grosimi intermediare", () => {
    // Între 10mm (0.15) și 15mm (0.17) orizontal → 12mm ≈ 0.158
    const r = airGapResistance(12, "horizontal");
    expect(r).toBeGreaterThan(0.15);
    expect(r).toBeLessThan(0.17);
  });

  it("aer >300mm cap la valoarea max (≥300)", () => {
    const r500 = airGapResistance(500, "horizontal");
    const r300 = airGapResistance(300, "horizontal");
    expect(r500).toBe(r300);
  });
});

describe("SURFACE_RESISTANCES conform SR EN ISO 6946 Tab. 7", () => {
  it("perete vertical: Rsi=0.13, Rse=0.04", () => {
    expect(SURFACE_RESISTANCES.perete_vertical.Rsi).toBe(0.13);
    expect(SURFACE_RESISTANCES.perete_vertical.Rse).toBe(0.04);
  });

  it("sol: Rsi=0.17, Rse=0", () => {
    expect(SURFACE_RESISTANCES.sol.Rsi).toBe(0.17);
    expect(SURFACE_RESISTANCES.sol.Rse).toBe(0);
  });
});
