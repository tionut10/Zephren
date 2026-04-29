import { describe, it, expect } from "vitest";
import {
  ELEMENT_TYPES_WIZARD,
  ELEMENT_TYPES_WIZARD_FULL,
  ELEMENT_TYPES,
  LAYER_PRESETS,
  TYPICAL_SOLUTIONS,
  U_REF_NZEB_RES,
  U_REF_NZEB_NRES,
  getURefNZEB,
  buildLayerFromMaterialName,
  applyTypicalSolution,
  getSolutionsForElementType,
  filterSolutions,
} from "../utils/wizardOpaqueCalc.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint 29 apr 2026: ELEMENT_TYPES extins (5 → 16) + TYPICAL_SOLUTIONS catalog
// neutru (~73 soluții). Testele vechi refactorizate pentru noua structură.
// ═══════════════════════════════════════════════════════════════════════════════

// ── ELEMENT_TYPES_WIZARD (legacy 5 — backward compat) ─────────────────────────
describe("ELEMENT_TYPES_WIZARD — legacy compat (5 tipuri)", () => {
  it("conține exact 5 tipuri (subset legacy)", () => {
    expect(ELEMENT_TYPES_WIZARD).toHaveLength(5);
  });

  it("ID-urile legacy sunt PE, PT, PP, PL, PB", () => {
    const ids = ELEMENT_TYPES_WIZARD.map(t => t.id).sort();
    expect(ids).toEqual(["PB", "PE", "PL", "PP", "PT"]);
  });

  it("fiecare element legacy are câmpurile obligatorii", () => {
    ELEMENT_TYPES_WIZARD.forEach(t => {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("label");
      expect(t).toHaveProperty("icon");
      expect(t).toHaveProperty("tau");
      expect(t).toHaveProperty("rsi");
      expect(t).toHaveProperty("rse");
    });
  });

  it("PE tau=1.0, PP tau=0.9, PL tau=0.5, PB tau=0.5", () => {
    expect(ELEMENT_TYPES_WIZARD.find(t => t.id === "PE").tau).toBe(1.0);
    expect(ELEMENT_TYPES_WIZARD.find(t => t.id === "PP").tau).toBe(0.9);
    expect(ELEMENT_TYPES_WIZARD.find(t => t.id === "PL").tau).toBe(0.5);
    expect(ELEMENT_TYPES_WIZARD.find(t => t.id === "PB").tau).toBe(0.5);
  });
});

// ── ELEMENT_TYPES_WIZARD_FULL (16 tipuri extinse) ────────────────────────────
describe("ELEMENT_TYPES_WIZARD_FULL — catalog complet 16 tipuri", () => {
  it("conține 16 tipuri", () => {
    expect(ELEMENT_TYPES_WIZARD_FULL).toHaveLength(16);
  });

  it("include toate categoriile noi: PI, PR, PS, PA, PM, PV, US, UN, AT, AC_VERDE, PI_INTERMED", () => {
    const ids = ELEMENT_TYPES_WIZARD_FULL.map(t => t.id);
    ["PI", "PR", "PS", "PA", "PM", "PV", "US", "UN", "AT", "AC_VERDE", "PI_INTERMED"].forEach(id => {
      expect(ids).toContain(id);
    });
  });

  it("PE, PR au inEnvelope=true în ELEMENT_TYPES", () => {
    expect(ELEMENT_TYPES.find(t => t.id === "PE").inEnvelope).toBe(true);
    expect(ELEMENT_TYPES.find(t => t.id === "PR").inEnvelope).toBe(true);
  });

  it("PI, PI_INTERMED au inEnvelope=false (interior — nu intră în calcul anvelopă)", () => {
    expect(ELEMENT_TYPES.find(t => t.id === "PI").inEnvelope).toBe(false);
    expect(ELEMENT_TYPES.find(t => t.id === "PI_INTERMED").inEnvelope).toBe(false);
  });

  it("AC_VERDE există cu uRefIndex=PT (verde tratat ca terasă)", () => {
    const acVerde = ELEMENT_TYPES.find(t => t.id === "AC_VERDE");
    expect(acVerde).toBeDefined();
    expect(acVerde.uRefIndex).toBe("PT");
  });
});

// ── TYPICAL_SOLUTIONS — catalog NEUTRU ────────────────────────────────────────
describe("TYPICAL_SOLUTIONS — catalog neutru", () => {
  it("conține minim 70 soluții", () => {
    expect(TYPICAL_SOLUTIONS.length).toBeGreaterThanOrEqual(70);
  });

  it("toate soluțiile au câmpuri obligatorii", () => {
    TYPICAL_SOLUTIONS.forEach(s => {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("elementType");
      expect(s).toHaveProperty("label");
      expect(s).toHaveProperty("era");
      expect(s).toHaveProperty("structure");
      expect(s).toHaveProperty("layers");
      expect(s).toHaveProperty("source");
      expect(Array.isArray(s.layers)).toBe(true);
      expect(s.layers.length).toBeGreaterThan(0);
    });
  });

  it("toate soluțiile au câmpurile NEUTRE rezervate (brand=null, supplierId=null)", () => {
    TYPICAL_SOLUTIONS.forEach(s => {
      expect(s.brand).toBeNull();
      expect(s.supplierId).toBeNull();
      expect(s.affiliateUrl).toBeNull();
      expect(s.sponsored).toBe(false);
    });
  });

  it("toate soluțiile au sursă normativă citată (string non-empty)", () => {
    TYPICAL_SOLUTIONS.forEach(s => {
      expect(typeof s.source).toBe("string");
      expect(s.source.length).toBeGreaterThan(5);
    });
  });

  it("acoperă elemente PE (perete exterior) — minim 15 soluții", () => {
    const pe = TYPICAL_SOLUTIONS.filter(s => s.elementType === "PE");
    expect(pe.length).toBeGreaterThanOrEqual(15);
  });

  it("acoperă cel puțin 3 ere distincte (pre1970, 2010-2020, nzeb-2020+)", () => {
    const eras = new Set(TYPICAL_SOLUTIONS.map(s => s.era));
    expect(eras.has("pre1970")).toBe(true);
    expect(eras.has("nzeb-2020+")).toBe(true);
    expect(eras.size).toBeGreaterThanOrEqual(3);
  });

  it("acoperă structura panou-mare (specific RO 1965-1990)", () => {
    const pm = TYPICAL_SOLUTIONS.filter(s => s.structure === "panou-mare");
    expect(pm.length).toBeGreaterThanOrEqual(2);
  });

  it("conține soluții vernaculare RO (chirpici/blockhaus)", () => {
    const vernac = TYPICAL_SOLUTIONS.filter(s =>
      s.tags?.includes("vernacular") || s.tags?.includes("ro-traditional")
    );
    expect(vernac.length).toBeGreaterThanOrEqual(3);
  });

  it("conține soluții Passivhaus / nZEB premium", () => {
    const ph = TYPICAL_SOLUTIONS.filter(s =>
      s.tags?.includes("passivhaus") || s.tags?.includes("enerphit")
    );
    expect(ph.length).toBeGreaterThanOrEqual(3);
  });
});

// ── filterSolutions — helpers ─────────────────────────────────────────────────
describe("filterSolutions / getSolutionsForElementType — helpers", () => {
  it("filterSolutions({elementType: 'PE'}) returnează doar PE", () => {
    const filtered = filterSolutions({ elementType: "PE" });
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(s => expect(s.elementType).toBe("PE"));
  });

  it("filterSolutions({era: 'pre1970'}) returnează doar pre-1970", () => {
    const filtered = filterSolutions({ era: "pre1970" });
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(s => expect(s.era).toBe("pre1970"));
  });

  it("filterSolutions cu mai multe filtre combinate", () => {
    const filtered = filterSolutions({ elementType: "PE", era: "nzeb-2020+", structure: "zidarie" });
    filtered.forEach(s => {
      expect(s.elementType).toBe("PE");
      expect(s.era).toBe("nzeb-2020+");
      expect(s.structure).toBe("zidarie");
    });
  });

  it("getSolutionsForElementType('PA') returnează soluții acoperiș înclinat", () => {
    const sols = getSolutionsForElementType("PA");
    expect(sols.length).toBeGreaterThan(0);
    sols.forEach(s => expect(s.elementType).toBe("PA"));
  });
});

// ── LAYER_PRESETS legacy compat (3 preset-uri/tip generate dinamic) ──────────
describe("LAYER_PRESETS — backward compat (legacy 5 tipuri)", () => {
  it("are chei pentru toate cele 5 tipuri legacy", () => {
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

  it("PE conține minim 1 preset", () => {
    expect(LAYER_PRESETS.PE.length).toBeGreaterThanOrEqual(1);
  });
});

// ── applyTypicalSolution — convertește soluție tip la element complet ─────────
describe("applyTypicalSolution — aplicare soluție catalog", () => {
  it("returnează null pentru ID inexistent", () => {
    expect(applyTypicalSolution("FAKE-ID")).toBeNull();
  });

  it("aplică o soluție existentă cu layers complete", () => {
    const firstSol = TYPICAL_SOLUTIONS[0];
    const result = applyTypicalSolution(firstSol.id);
    expect(result).toBeDefined();
    expect(result.layers.length).toBe(firstSol.layers.length);
    result.layers.forEach(l => {
      expect(l).toHaveProperty("material");
      expect(l).toHaveProperty("thickness");
      expect(l).toHaveProperty("lambda");
    });
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
