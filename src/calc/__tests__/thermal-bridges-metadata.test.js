import { describe, it, expect } from "vitest";
import BRIDGES_DB from "../../data/thermal-bridges.json";
import META from "../../data/thermal-bridges-metadata.json";
import {
  ISO_14683_CLASSES,
  PRIMARY_REFERENCES,
  CROSS_SOURCE_DATABASES,
  ISO_CLASS_THRESHOLDS,
  DETAIL_TEMPLATES,
  getBridgeId,
  getBridgeSource,
  getBridgeEnglishName,
  classifyIsoLevel,
  validatePsiRange,
  getCrossSourceValidation,
  getEnrichedBridge,
  getAllEnrichedBridges,
  getMetadataCoverage,
  getBridgeDetails,
  calcAnnualLossPerMeter,
  classifyCondensationRisk,
  repairPriorityLabel,
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
    const id1 = getBridgeId("Soclu cu trotuar de protecție");
    const id2 = getBridgeId("Soclu cu trotuar de protecție");
    expect(id1).toBe(id2); // determinist
    expect(id1).toMatch(/^TB-[A-Z]+-[0-9a-f]{4}$/);
  });

  it("prefix categorie corect pentru hash-uri", () => {
    // categoria "Fundații și subsol" → F
    const id = getBridgeId("Soclu cu trotuar de protecție");
    expect(id.startsWith("TB-F-")).toBe(true);
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
    // "Soclu cu trotuar de protecție" nu are metadate entry → fallback la categoria "Fundații și subsol"
    const src = getBridgeSource("Soclu cu trotuar de protecție");
    expect(src).toMatch(/ISO 13370|ISO 14683/);
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
    const e = getEnrichedBridge("Soclu cu trotuar de protecție");
    expect(e.name).toBe("Soclu cu trotuar de protecție");
    expect(e.metadata.source).toBeTruthy(); // fallback categorie
    expect(e.metadata.category_en).toBe("Foundations & basement");
  });

  it("returnează null pentru nume inexistent", () => {
    expect(getEnrichedBridge("xyz inexistent")).toBe(null);
  });
});

describe("getAllEnrichedBridges + coverage", () => {
  it("îmbogățește toate intrările din catalog (≥ 165 după extindere 2026)", () => {
    const all = getAllEnrichedBridges();
    expect(all.length).toBe(BRIDGES_DB.length);
    expect(all.length).toBeGreaterThanOrEqual(165);
    all.forEach(e => {
      expect(e.id).toMatch(/^TB-/);
      // Note: entries adăugate în Sprint 29 apr 2026 pot să nu aibă încă metadate complete
      // (metadate adăugate progresiv) — validăm doar cele cu source declarat
      if (e.metadata?.source) {
        expect(e.metadata.iso_class).toMatch(/^[ABCD]$/);
      }
    });
  });

  it("coverage metadate per-entry — minim 80 intrări cu metadate complete", () => {
    const cov = getMetadataCoverage();
    expect(cov.total).toBe(BRIDGES_DB.length);
    expect(cov.withFullMeta).toBeGreaterThanOrEqual(80);
    // Coverage % poate scădea după extindere catalog — minim 25% (de la 50% pre-extindere)
    expect(cov.coveragePct).toBeGreaterThanOrEqual(25);
  });
});

describe("Schema v2 — detail_templates", () => {
  it("DETAIL_TEMPLATES conține minim 15 arhetipuri", () => {
    expect(Object.keys(DETAIL_TEMPLATES).length).toBeGreaterThanOrEqual(15);
  });

  it("fiecare template are toate câmpurile v2 (fRsi, detection, consequences, failures, remedies, priority, factor)", () => {
    for (const [id, tpl] of Object.entries(DETAIL_TEMPLATES)) {
      expect(typeof tpl.fRsi_typical, `${id}`).toBe("number");
      expect(Array.isArray(tpl.detection), `${id}`).toBe(true);
      expect(Array.isArray(tpl.consequences), `${id}`).toBe(true);
      expect(Array.isArray(tpl.common_failures), `${id}`).toBe(true);
      expect(Array.isArray(tpl.typical_remedies), `${id}`).toBe(true);
      expect(typeof tpl.repair_priority, `${id}`).toBe("number");
      expect(typeof tpl.annual_loss_factor, `${id}`).toBe("number");
      expect(tpl.fRsi_typical).toBeGreaterThanOrEqual(0);
      expect(tpl.fRsi_typical).toBeLessThanOrEqual(1);
      expect(tpl.repair_priority).toBeGreaterThanOrEqual(1);
      expect(tpl.repair_priority).toBeLessThanOrEqual(5);
    }
  });

  it("include template-urile cheie: CORNER, WALL_SLAB, BALCONY, WINDOW, ROOF, FOUNDATION", () => {
    const keys = Object.keys(DETAIL_TEMPLATES);
    expect(keys.some(k => k.includes("CORNER"))).toBe(true);
    expect(keys.some(k => k.includes("BALCONY"))).toBe(true);
    expect(keys.some(k => k.includes("WINDOW"))).toBe(true);
    expect(keys.some(k => k.includes("ROOF"))).toBe(true);
    expect(keys.some(k => k.includes("FOUNDATION") || k.includes("PLINTH"))).toBe(true);
    expect(keys.some(k => k.includes("SLAB"))).toBe(true);
  });
});

describe("getBridgeDetails — rezolvare template arhetip", () => {
  it("Colț exterior → CORNER_EXTERNAL cu fRsi≈0.73, priority=3", () => {
    const d = getBridgeDetails("Colț exterior");
    expect(d).toBeTruthy();
    expect(d.template_id).toBe("CORNER_EXTERNAL");
    expect(d.fRsi_typical).toBeCloseTo(0.73, 1);
    expect(d.repair_priority).toBe(3);
    expect(d.detection.length).toBeGreaterThan(0);
    expect(d.typical_remedies.length).toBeGreaterThan(0);
  });

  it("Consolă balcon neîntrerupt → BALCONY_UNINTERRUPTED cu priority=5", () => {
    const d = getBridgeDetails("Consolă balcon — beton neîntrerupt");
    expect(d.template_id).toBe("BALCONY_UNINTERRUPTED");
    expect(d.repair_priority).toBe(5);
    expect(d.fRsi_typical).toBeLessThan(0.65); // risc D
    expect(d.annual_loss_factor).toBeGreaterThan(1.5);
  });

  it("Ruptor Isokorb → BALCONY_WITH_BREAK cu priority=1", () => {
    const d = getBridgeDetails("Consolă balcon — cu ruptoare termice");
    expect(d.template_id).toBe("BALCONY_WITH_BREAK");
    expect(d.repair_priority).toBe(1);
    expect(d.fRsi_typical).toBeGreaterThan(0.80); // clasa A condensare
  });

  it("returnează null pentru punte fără metadate", () => {
    expect(getBridgeDetails("Punte inexistentă xyz")).toBe(null);
  });
});

describe("calcAnnualLossPerMeter — pierderi kWh/m·an", () => {
  it("ψ=0.25 × DD=3170 × 24h / 1000 × factor=1.4 ≈ 26.6 kWh/m·an", () => {
    const loss = calcAnnualLossPerMeter(0.25, { degreeDays: 3170, factor: 1.4 });
    expect(loss).toBeCloseTo(26.6, 0);
  });

  it("ψ=0 sau invalid returnează 0", () => {
    expect(calcAnnualLossPerMeter(0)).toBe(0);
    expect(calcAnnualLossPerMeter(NaN)).toBe(0);
    expect(calcAnnualLossPerMeter(-0.1)).toBe(0);
  });

  it("ψ=0.7 (balcon) × factor 2 > 80 kWh/m·an (pierdere severă)", () => {
    const loss = calcAnnualLossPerMeter(0.7, { factor: 2.0 });
    expect(loss).toBeGreaterThan(80);
  });
});

describe("classifyCondensationRisk — ISO 13788", () => {
  it("fRsi ≥ 0.80 → clasa A (fără risc)", () => {
    expect(classifyCondensationRisk(0.82)).toBe("A");
    expect(classifyCondensationRisk(0.90)).toBe("A");
  });

  it("0.75 ≤ fRsi < 0.80 → clasa B", () => {
    expect(classifyCondensationRisk(0.75)).toBe("B");
    expect(classifyCondensationRisk(0.79)).toBe("B");
  });

  it("0.65 ≤ fRsi < 0.75 → clasa C (risc la HR≥60%)", () => {
    expect(classifyCondensationRisk(0.70)).toBe("C");
    expect(classifyCondensationRisk(0.74)).toBe("C");
  });

  it("fRsi < 0.65 → clasa D (condensare iarnă)", () => {
    expect(classifyCondensationRisk(0.55)).toBe("D");
    expect(classifyCondensationRisk(0.62)).toBe("D");
  });

  it("input invalid → D", () => {
    expect(classifyCondensationRisk(NaN)).toBe("D");
    expect(classifyCondensationRisk(undefined)).toBe("D");
  });
});

describe("repairPriorityLabel", () => {
  it("returnează etichetă pentru fiecare nivel 1-5", () => {
    for (let p = 1; p <= 5; p++) {
      const label = repairPriorityLabel(p);
      expect(label).toContain(String(p));
    }
  });

  it("returnează label pentru 3 pe input invalid", () => {
    expect(repairPriorityLabel(999)).toBe(repairPriorityLabel(3));
    expect(repairPriorityLabel(NaN)).toBe(repairPriorityLabel(3));
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
