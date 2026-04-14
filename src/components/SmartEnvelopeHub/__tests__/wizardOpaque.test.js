import { describe, it, expect } from "vitest";
import {
  ELEMENT_TYPES_WIZARD,
  LAYER_PRESETS,
  U_REF_NZEB_RES,
  U_REF_NZEB_NRES,
  getURefNZEB,
  buildLayerFromMaterialName,
} from "../utils/wizardOpaqueCalc.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Teste unitare — WizardOpaque: ELEMENT_TYPES_WIZARD, LAYER_PRESETS,
//                               getURefNZEB, buildLayerFromMaterialName
// ═══════════════════════════════════════════════════════════════════════════════

// ── ELEMENT_TYPES_WIZARD ──────────────────────────────────────────────────────
describe("ELEMENT_TYPES_WIZARD — structură", () => {
  it("conține exact 5 tipuri de elemente", () => {
    expect(ELEMENT_TYPES_WIZARD).toHaveLength(5);
  });

  it("fiecare element are câmpurile obligatorii", () => {
    ELEMENT_TYPES_WIZARD.forEach(t => {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("label");
      expect(t).toHaveProperty("icon");
      expect(t).toHaveProperty("tau");
      expect(t).toHaveProperty("rsi");
      expect(t).toHaveProperty("rse");
    });
  });

  it("PE are tau=1.0 (fără reducere)", () => {
    const pe = ELEMENT_TYPES_WIZARD.find(t => t.id === "PE");
    expect(pe.tau).toBe(1.0);
  });

  it("PP are tau=0.9 (reducere pod)", () => {
    const pp = ELEMENT_TYPES_WIZARD.find(t => t.id === "PP");
    expect(pp.tau).toBe(0.9);
  });

  it("PL are tau=0.5 (reducere sol)", () => {
    const pl = ELEMENT_TYPES_WIZARD.find(t => t.id === "PL");
    expect(pl.tau).toBe(0.5);
  });

  it("PB are tau=0.5 (reducere subsol)", () => {
    const pb = ELEMENT_TYPES_WIZARD.find(t => t.id === "PB");
    expect(pb.tau).toBe(0.5);
  });

  it("ID-urile sunt: PE, PT, PP, PL, PB", () => {
    const ids = ELEMENT_TYPES_WIZARD.map(t => t.id);
    expect(ids).toEqual(["PE", "PT", "PP", "PL", "PB"]);
  });
});

// ── LAYER_PRESETS — structură generală ───────────────────────────────────────
describe("LAYER_PRESETS — structură generală", () => {
  it("are chei pentru toate cele 5 tipuri de element", () => {
    ["PE", "PT", "PP", "PL", "PB"].forEach(key => {
      expect(LAYER_PRESETS).toHaveProperty(key);
      expect(Array.isArray(LAYER_PRESETS[key])).toBe(true);
    });
  });

  it("fiecare preset are id, label, desc, layers", () => {
    Object.values(LAYER_PRESETS).flat().forEach(preset => {
      expect(preset).toHaveProperty("id");
      expect(preset).toHaveProperty("label");
      expect(preset).toHaveProperty("desc");
      expect(preset).toHaveProperty("layers");
      expect(Array.isArray(preset.layers)).toBe(true);
    });
  });

  it("fiecare strat din preset are material și thickness", () => {
    Object.values(LAYER_PRESETS).flat().forEach(preset => {
      preset.layers.forEach(layer => {
        expect(layer).toHaveProperty("material");
        expect(layer).toHaveProperty("thickness");
        expect(parseFloat(layer.thickness)).toBeGreaterThan(0);
      });
    });
  });
});

// ── LAYER_PRESETS PE — 3 preset-uri ──────────────────────────────────────────
describe("LAYER_PRESETS PE — 3 preset-uri standard", () => {
  it("PE are exact 3 preset-uri", () => {
    expect(LAYER_PRESETS.PE).toHaveLength(3);
  });

  it("PE-clasic are 4 straturi (tencuială + EPS + cărămidă + tencuială)", () => {
    const clasic = LAYER_PRESETS.PE.find(p => p.id === "PE-clasic");
    expect(clasic).toBeDefined();
    expect(clasic.layers).toHaveLength(4);
  });

  it("PE-clasic conține EPS cu grosime 100mm", () => {
    const clasic = LAYER_PRESETS.PE.find(p => p.id === "PE-clasic");
    const epsLayer = clasic.layers.find(l => l.material.includes("EPS"));
    expect(epsLayer).toBeDefined();
    expect(epsLayer.thickness).toBe(100);
  });

  it("PE-bca conține BCA cu grosime 250mm", () => {
    const bca = LAYER_PRESETS.PE.find(p => p.id === "PE-bca");
    expect(bca).toBeDefined();
    const bcaLayer = bca.layers.find(l => l.material.includes("BCA"));
    expect(bcaLayer).toBeDefined();
    expect(bcaLayer.thickness).toBe(250);
  });

  it("PE-prefab conține Beton armat cu grosime 250mm", () => {
    const prefab = LAYER_PRESETS.PE.find(p => p.id === "PE-prefab");
    expect(prefab).toBeDefined();
    const baLayer = prefab.layers.find(l => l.material.includes("Beton armat"));
    expect(baLayer).toBeDefined();
    expect(baLayer.thickness).toBe(250);
  });

  it("PE-prefab are EPS cu grosime 150mm (mai gros decât PE-clasic)", () => {
    const prefab = LAYER_PRESETS.PE.find(p => p.id === "PE-prefab");
    const epsLayer = prefab.layers.find(l => l.material.includes("EPS"));
    expect(epsLayer.thickness).toBe(150);
    expect(epsLayer.thickness).toBeGreaterThan(
      LAYER_PRESETS.PE.find(p => p.id === "PE-clasic").layers.find(l => l.material.includes("EPS")).thickness
    );
  });
});

// ── LAYER_PRESETS PT / PP / PL / PB ──────────────────────────────────────────
describe("LAYER_PRESETS PT, PP, PL, PB — conținut", () => {
  it("PT-clasic are 5 straturi (terasă completă)", () => {
    const pt = LAYER_PRESETS.PT.find(p => p.id === "PT-clasic");
    expect(pt).toBeDefined();
    expect(pt.layers).toHaveLength(5);
  });

  it("PT-clasic conține EPS cu grosime 200mm", () => {
    const pt = LAYER_PRESETS.PT.find(p => p.id === "PT-clasic");
    const epsLayer = pt.layers.find(l => l.material.includes("EPS"));
    expect(epsLayer).toBeDefined();
    expect(epsLayer.thickness).toBe(200);
  });

  it("PP-pod conține vată bazaltică acoperiș cu grosime 200mm", () => {
    const pp = LAYER_PRESETS.PP.find(p => p.id === "PP-pod");
    expect(pp).toBeDefined();
    const vataLayer = pp.layers.find(l => l.material.includes("Vată bazaltică"));
    expect(vataLayer).toBeDefined();
    expect(vataLayer.thickness).toBe(200);
  });

  it("PL-clasic conține XPS cu grosime 100mm", () => {
    const pl = LAYER_PRESETS.PL.find(p => p.id === "PL-clasic");
    expect(pl).toBeDefined();
    const xpsLayer = pl.layers.find(l => l.material.includes("XPS"));
    expect(xpsLayer).toBeDefined();
    expect(xpsLayer.thickness).toBe(100);
  });

  it("PB-subsol conține EPS cu grosime 100mm", () => {
    const pb = LAYER_PRESETS.PB.find(p => p.id === "PB-subsol");
    expect(pb).toBeDefined();
    const epsLayer = pb.layers.find(l => l.material.includes("EPS"));
    expect(epsLayer).toBeDefined();
    expect(epsLayer.thickness).toBe(100);
  });
});

// ── getURefNZEB — valori U_ref nZEB ──────────────────────────────────────────
describe("getURefNZEB — categorii rezidențiale (RI, RC, RA)", () => {
  it("RI + PE → 0.25", () => {
    expect(getURefNZEB("RI", "PE")).toBe(0.25);
  });

  it("RC + PT → 0.15 (terasă rezidențial)", () => {
    expect(getURefNZEB("RC", "PT")).toBe(0.15);
  });

  it("RA + PP → 0.15 (pod rezidențial)", () => {
    expect(getURefNZEB("RA", "PP")).toBe(0.15);
  });

  it("RI + PL → 0.20 (placă pe sol rezidențial)", () => {
    expect(getURefNZEB("RI", "PL")).toBe(0.20);
  });

  it("RI + PB → 0.29 (planșeu subsol rezidențial)", () => {
    expect(getURefNZEB("RI", "PB")).toBe(0.29);
  });
});

describe("getURefNZEB — categorii nerezidențiale", () => {
  it("BI + PE → 0.33 (birouri)", () => {
    expect(getURefNZEB("BI", "PE")).toBe(0.33);
  });

  it("SA + PT → 0.17 (sănătate, terasă)", () => {
    expect(getURefNZEB("SA", "PT")).toBe(0.17);
  });

  it("ED + PB → 0.35 (educație, subsol)", () => {
    expect(getURefNZEB("ED", "PB")).toBe(0.35);
  });
});

describe("getURefNZEB — tip element necunoscut", () => {
  it("tip necunoscut → null", () => {
    expect(getURefNZEB("RI", "XX")).toBeNull();
  });

  it("undefined tip → null", () => {
    expect(getURefNZEB("RI", undefined)).toBeNull();
  });

  it("rezidențial are U_ref mai mic decât nerezidențial pentru PE", () => {
    expect(getURefNZEB("RI", "PE")).toBeLessThan(getURefNZEB("BI", "PE"));
  });
});

// ── buildLayerFromMaterialName — material cunoscut ────────────────────────────
describe("buildLayerFromMaterialName — material cunoscut din materials.json", () => {
  const layer = buildLayerFromMaterialName("Beton armat", 200);

  it("returnează material și matName corecte", () => {
    expect(layer.material).toBe("Beton armat");
    expect(layer.matName).toBe("Beton armat");
  });

  it("thickness este preservat", () => {
    expect(layer.thickness).toBe(200);
  });

  it("lambda > 0 (conductivitate termică validă)", () => {
    expect(layer.lambda).toBeGreaterThan(0);
  });

  it("rho > 0 (densitate validă)", () => {
    expect(layer.rho).toBeGreaterThan(0);
  });

  it("propagă câmpul src (sursă normativă)", () => {
    expect(typeof layer.src).toBe("string");
  });
});

describe("buildLayerFromMaterialName — material necunoscut", () => {
  const layer = buildLayerFromMaterialName("Material fictiv XYZ", 50);

  it("returnează material cu numele furnizat", () => {
    expect(layer.material).toBe("Material fictiv XYZ");
    expect(layer.matName).toBe("Material fictiv XYZ");
  });

  it("lambda = 0 pentru material necunoscut", () => {
    expect(layer.lambda).toBe(0);
  });

  it("rho = 0 pentru material necunoscut", () => {
    expect(layer.rho).toBe(0);
  });

  it("thickness este preservat", () => {
    expect(layer.thickness).toBe(50);
  });

  it("src este string gol", () => {
    expect(layer.src).toBe("");
  });
});

// ── U_REF_NZEB_RES vs NRES — valori absolute ─────────────────────────────────
describe("U_REF_NZEB — valori constante", () => {
  it("U_REF_NZEB_RES.PE = 0.25", () => {
    expect(U_REF_NZEB_RES.PE).toBe(0.25);
  });

  it("U_REF_NZEB_NRES.PE = 0.33", () => {
    expect(U_REF_NZEB_NRES.PE).toBe(0.33);
  });

  it("valorile rezidențiale sunt mai stricte (mai mici) decât nerezidențiale", () => {
    ["PE", "PT", "PP", "PL", "PB"].forEach(type => {
      expect(U_REF_NZEB_RES[type]).toBeLessThanOrEqual(U_REF_NZEB_NRES[type]);
    });
  });
});
