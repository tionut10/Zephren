import { describe, it, expect } from "vitest";
import BRIDGES_DB from "../../data/thermal-bridges.json";
import META from "../../data/thermal-bridges-metadata.json";
import {
  ISO_14683_CLASSES,
  PRIMARY_REFERENCES,
  CROSS_SOURCE_DATABASES,
  ISO_CLASS_THRESHOLDS,
  getBridgeId,
  getBridgeSource,
  getBridgeEnglishName,
  classifyIsoLevel,
  validatePsiRange,
  getCrossSourceValidation,
  getEnrichedBridge,
  getAllEnrichedBridges,
  getMetadataCoverage,
} from "../thermal-bridges-metadata.js";

describe("thermal-bridges-metadata — constante și structură", () => {
  it("exportă cele 4 clase ISO 14683 (A/B/C/D)", () => {
    expect(Object.keys(ISO_14683_CLASSES).sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("include minim 5 referințe normative principale", () => {
    expect(PRIMARY_REFERENCES.length).toBeGreaterThanOrEqual(5);
    expect(PRIMARY_REFERENCES.some(r => r.includes("ISO 14683"))).toBe(true);
    expect(PRIMARY_REFERENCES.some(r => r.includes("Mc 001-2022"))).toBe(true);
  });

  it("include minim 5 surse cruce (BD_PERI, PHI, ROCKWOOL, Schöck...)", () => {
    expect(CROSS_SOURCE_DATABASES.length).toBeGreaterThanOrEqual(5);
    const all = CROSS_SOURCE_DATABASES.join("|");
    expect(all).toMatch(/PHI|Passipedia/);
    expect(all).toMatch(/ROCKWOOL/);
    expect(all).toMatch(/Sch[öo]ck/);
  });

  it("pragurile ISO sunt crescătoare A < B < C", () => {
    expect(ISO_CLASS_THRESHOLDS.A).toBeLessThan(ISO_CLASS_THRESHOLDS.B);
    expect(ISO_CLASS_THRESHOLDS.B).toBeLessThan(ISO_CLASS_THRESHOLDS.C);
  });

  it("fiecare categorie din catalog are metadate în JSON", () => {
    const cats = new Set(BRIDGES_DB.map(b => b.cat));
    for (const c of cats) {
      expect(META.categories[c], `lipsește metadata pentru categoria "${c}"`).toBeDefined();
      expect(META.categories[c].reference).toBeTruthy();
      expect(META.categories[c].category_en).toBeTruthy();
    }
  });
});

describe("getBridgeId — ID-uri deterministe", () => {
  it("returnează ID explicit pentru intrări cu metadate", () => {
    expect(getBridgeId("Colț exterior")).toBe("TB-WJ-001");
    expect(getBridgeId("Consolă balcon — beton neîntrerupt")).toBe("TB-B-001");
    expect(getBridgeId("Glaf fereastră — montaj standard")).toBe("TB-W-001");
  });

  it("generează hash determinist pentru intrări fără metadate", () => {
    const id1 = getBridgeId("Ancoră de cavitate metalică (cavity wall tie)");
    const id2 = getBridgeId("Ancoră de cavitate metalică (cavity wall tie)");
    expect(id1).toBe(id2); // determinist
    expect(id1).toMatch(/^TB-[A-Z]+-[0-9a-f]{4}$/);
  });

  it("prefix categorie corect pentru hash-uri", () => {
    // categoria "Elemente punctuale (chi)" → CH
    const id = getBridgeId("Ancoră de cavitate metalică (cavity wall tie)");
    expect(id.startsWith("TB-CH-")).toBe(true);
  });

  it("nu dă același ID pentru nume diferite (coliziuni improbabile)", () => {
    const ids = BRIDGES_DB.map(b => getBridgeId(b.name));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("returnează TB-UNKNOWN pentru input invalid", () => {
    expect(getBridgeId(null)).toBe("TB-UNKNOWN");
    expect(getBridgeId("")).toBe("TB-UNKNOWN");
    expect(getBridgeId(undefined)).toBe("TB-UNKNOWN");
  });
});

describe("getBridgeSource — referințe normative citabile", () => {
  it("returnează sursă explicită pentru intrări cu metadate detaliate", () => {
    const src = getBridgeSource("Colț exterior");
    expect(src).toContain("ISO 14683");
    expect(src).toContain("ROCKWOOL");
  });

  it("cascadă: fallback la metadate categorie dacă intrarea nu are sursă explicită", () => {
    const src = getBridgeSource("Ancoră de cavitate metalică (cavity wall tie)");
    expect(src).toMatch(/ISO 10211|SCI P380/);
  });

  it("fallback final pentru nume inexistent", () => {
    const src = getBridgeSource("Punte inexistentă xyz");
    expect(src).toContain("ISO 14683");
  });

  it("sursele Schöck sunt citate pentru ruptoare termice", () => {
    const src = getBridgeSource("Consolă balcon — cu ruptoare termice");
    expect(src).toMatch(/Sch[öo]ck/);
  });
});

describe("getBridgeEnglishName — nume multilingv", () => {
  it("returnează nume englezesc pentru intrări cu metadate", () => {
    expect(getBridgeEnglishName("Colț exterior")).toBe("External corner");
    expect(getBridgeEnglishName("Perete ext. — Planșeu pe sol"))
      .toBe("External wall — ground floor slab");
  });

  it("returnează null pentru intrări fără mapping", () => {
    expect(getBridgeEnglishName("Punte random xyz")).toBe(null);
  });
});

describe("classifyIsoLevel — clasificare automată ψ", () => {
  it("clasa A (Passivhaus): ψ ≤ 0.01", () => {
    expect(classifyIsoLevel(0.005)).toBe("A");
    expect(classifyIsoLevel(0.01)).toBe("A");
  });

  it("clasa A: ψ negativ (efect favorabil geometric)", () => {
    expect(classifyIsoLevel(-0.05)).toBe("A");
    expect(classifyIsoLevel(-0.062)).toBe("A"); // Passipedia EWFS
  });

  it("clasa B: 0.01 < ψ ≤ 0.05", () => {
    expect(classifyIsoLevel(0.03)).toBe("B");
    expect(classifyIsoLevel(0.05)).toBe("B");
  });

  it("clasa C: 0.05 < ψ ≤ 0.15", () => {
    expect(classifyIsoLevel(0.10)).toBe("C");
    expect(classifyIsoLevel(0.15)).toBe("C");
  });

  it("clasa D: ψ > 0.15", () => {
    expect(classifyIsoLevel(0.25)).toBe("D");
    expect(classifyIsoLevel(0.70)).toBe("D"); // balcon neîntrerupt
  });

  it("return D pentru input invalid", () => {
    expect(classifyIsoLevel(NaN)).toBe("D");
    expect(classifyIsoLevel(undefined)).toBe("D");
  });
});

describe("validatePsiRange — verificare interval", () => {
  it("inRange=true pentru ψ în intervalul [min, max]", () => {
    const r = validatePsiRange("Consolă balcon — beton neîntrerupt", 0.70);
    expect(r.inRange).toBe(true);
    expect(r.typical).toBe(0.70);
  });

  it("above=true pentru ψ peste max", () => {
    const r = validatePsiRange("Colț exterior", 0.50);
    expect(r.above).toBe(true);
    expect(r.inRange).toBe(false);
  });

  it("below=true pentru ψ sub min", () => {
    const r = validatePsiRange("Consolă balcon — beton neîntrerupt", 0.10);
    expect(r.below).toBe(true);
    expect(r.inRange).toBe(false);
  });

  it("returnează null pentru intrări fără metadate", () => {
    expect(validatePsiRange("Punte random xyz", 0.1)).toBe(null);
  });

  it("validează valori negative (ψ favorabil)", () => {
    const r = validatePsiRange("Colț interior", -0.05);
    expect(r.inRange).toBe(true);
  });
});

describe("getCrossSourceValidation — validare cruce-surse", () => {
  it("returnează array cu minim 2 surse pentru intrări cheie", () => {
    const srcs = getCrossSourceValidation("Consolă balcon — beton neîntrerupt");
    expect(srcs.length).toBeGreaterThanOrEqual(3);
    expect(srcs.some(s => s.includes("ISO"))).toBe(true);
  });

  it("returnează array gol pentru intrări fără metadate", () => {
    expect(getCrossSourceValidation("xyz")).toEqual([]);
  });
});

describe("getEnrichedBridge — agregator", () => {
  it("combină catalog + metadate într-un singur obiect", () => {
    const e = getEnrichedBridge("Colț exterior");
    expect(e.name).toBe("Colț exterior");
    expect(e.psi).toBeDefined();
    expect(e.metadata.iso_class).toBe("C");
    expect(e.metadata.iso_14683_type).toBe("CO");
    expect(e.metadata.name_en).toBe("External corner");
    expect(e.metadata.source).toMatch(/ISO 14683/);
    expect(e.id).toBe("TB-WJ-001");
  });

  it("funcționează și pentru intrări fără metadate detaliate", () => {
    const e = getEnrichedBridge("Ancoră de cavitate metalică (cavity wall tie)");
    expect(e.name).toBe("Ancoră de cavitate metalică (cavity wall tie)");
    expect(e.metadata.source).toBeTruthy(); // fallback categorie
    expect(e.metadata.category_en).toBe("Point thermal bridges (chi)");
  });

  it("returnează null pentru nume inexistent", () => {
    expect(getEnrichedBridge("xyz inexistent")).toBe(null);
  });
});

describe("getAllEnrichedBridges + coverage", () => {
  it("îmbogățește toate cele 165 intrări din catalog", () => {
    const all = getAllEnrichedBridges();
    expect(all.length).toBe(BRIDGES_DB.length);
    expect(all.length).toBe(165);
    all.forEach(e => {
      expect(e.id).toMatch(/^TB-/);
      expect(e.metadata.source).toBeTruthy();
      expect(e.metadata.iso_class).toMatch(/^[ABCD]$/);
    });
  });

  it("coverage metadate per-entry ≥ 30% (minim 50 intrări cu metadate complete)", () => {
    const cov = getMetadataCoverage();
    expect(cov.total).toBe(165);
    expect(cov.withFullMeta).toBeGreaterThanOrEqual(50);
    expect(cov.coveragePct).toBeGreaterThanOrEqual(30);
  });
});

describe("Consistență valori ψ existente vs. metadate", () => {
  it("cel puțin una dintre ψ/ψ_izolat ale intrărilor cu metadate se află în [psi_min, psi_max]", () => {
    // Notă: pentru unele tipologii (ex. consolă neîntreruptă) `psi_izolat` din catalog
    // reprezintă starea post-intervenție (adăugare ruptor termic) — semantic diferit
    // de tipologia curentă. Validarea flexibilă: acceptăm dacă fie ψ (curent), fie
    // ψ_izolat (țintă) se află în intervalul declarat pentru tipologia respectivă.
    const tol = 0.02;
    const checked = [];
    const outOfRange = [];
    for (const [name, m] of Object.entries(META.entries)) {
      const entry = BRIDGES_DB.find(b => b.name === name);
      if (!entry) continue;
      if (typeof m.psi_min !== "number" || typeof m.psi_max !== "number") continue;
      const psi = entry.psi;
      const psiIz = entry.psi_izolat;
      const inRange = v => v >= (m.psi_min - tol) && v <= (m.psi_max + tol);
      if (!inRange(psi) && !inRange(psiIz)) {
        outOfRange.push(`${name}: ψ=${psi}, ψ_izolat=${psiIz} ∉ [${m.psi_min}, ${m.psi_max}]`);
      }
      checked.push(name);
    }
    expect(outOfRange, outOfRange.join("\n")).toEqual([]);
    expect(checked.length).toBeGreaterThanOrEqual(10);
  });
});
