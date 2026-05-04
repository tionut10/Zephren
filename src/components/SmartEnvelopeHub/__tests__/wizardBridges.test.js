import { describe, it, expect } from "vitest";
import {
  MAIN_CATEGORIES,
  CATEGORY_GROUPS,
  getQuickPicks,
  getAllInGroup,
  getGroupedInCategory,
  suggestLength,
  getLengthRule,
  LENGTH_RULE_GLOBAL,
  GLOBAL_TB_LEVELS,
  computeGlobalTbLoss,
  PSI_QUALITY_CLASSES,
  PSI_SOURCES,
  getPsiQualityClass,
  getEducationTooltip,
} from "../utils/bridgesCalc.js";
import THERMAL_BRIDGES_DB from "../../../data/thermal-bridges.json";

// ═══════════════════════════════════════════════════════════════════════════════
// Teste unitare — WizardBridges: MAIN_CATEGORIES, getQuickPicks, suggestLength
// ═══════════════════════════════════════════════════════════════════════════════

// ── MAIN_CATEGORIES — structură ───────────────────────────────────────────────
describe("MAIN_CATEGORIES — structură", () => {
  it("conține exact 6 categorii principale", () => {
    expect(MAIN_CATEGORIES).toHaveLength(6);
  });

  it("fiecare categorie are id, icon, label, hint", () => {
    MAIN_CATEGORIES.forEach(cat => {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("icon");
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("hint");
      expect(typeof cat.id).toBe("string");
      expect(cat.id.length).toBeGreaterThan(0);
    });
  });

  it("ID-urile celor 6 categorii sunt corecte", () => {
    const ids = MAIN_CATEGORIES.map(c => c.id);
    expect(ids).toContain("Joncțiuni pereți");
    expect(ids).toContain("Ferestre");
    expect(ids).toContain("Balcoane");
    expect(ids).toContain("Acoperiș");
    expect(ids).toContain("Stâlpi/grinzi");
    expect(ids).toContain("Instalații");
  });

  it("prima categorie este 'Joncțiuni pereți' (cea mai frecventă în audit)", () => {
    expect(MAIN_CATEGORIES[0].id).toBe("Joncțiuni pereți");
  });
});

// ── getQuickPicks — filtrare thermal-bridges.json ────────────────────────────
describe("getQuickPicks — filtrare din thermal-bridges.json", () => {
  it("returnează maxim 4 punți pentru 'Joncțiuni pereți'", () => {
    const picks = getQuickPicks("Joncțiuni pereți");
    expect(picks.length).toBeGreaterThanOrEqual(1);
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it("fiecare bridge returnat are name, psi, cat", () => {
    const picks = getQuickPicks("Joncțiuni pereți");
    picks.forEach(b => {
      expect(b).toHaveProperty("name");
      expect(b).toHaveProperty("psi");
      expect(b).toHaveProperty("cat");
    });
  });

  it("toate bridge-urile returnate au cat='Joncțiuni pereți'", () => {
    const picks = getQuickPicks("Joncțiuni pereți");
    picks.forEach(b => {
      expect(b.cat).toBe("Joncțiuni pereți");
    });
  });

  it("returnează maxim 4 punți pentru 'Ferestre'", () => {
    const picks = getQuickPicks("Ferestre");
    expect(picks.length).toBeLessThanOrEqual(4);
    expect(picks.length).toBeGreaterThanOrEqual(1);
  });

  it("returnează maxim 4 punți pentru 'Balcoane'", () => {
    const picks = getQuickPicks("Balcoane");
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it("returnează maxim 4 punți pentru 'Acoperiș'", () => {
    const picks = getQuickPicks("Acoperiș");
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it("returnează maxim 4 punți pentru 'Stâlpi/grinzi'", () => {
    const picks = getQuickPicks("Stâlpi/grinzi");
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it("returnează maxim 4 punți pentru 'Instalații'", () => {
    const picks = getQuickPicks("Instalații");
    expect(picks.length).toBeLessThanOrEqual(4);
  });

  it("categorie inexistentă → array gol", () => {
    const picks = getQuickPicks("Categorie fictivă");
    expect(picks).toHaveLength(0);
  });

  it("psi valorile sunt numerice finite", () => {
    const picks = getQuickPicks("Joncțiuni pereți");
    picks.forEach(b => {
      expect(typeof b.psi).toBe("number");
      expect(Number.isFinite(b.psi)).toBe(true);
    });
  });
});

// ── suggestLength — estimare lungimi ─────────────────────────────────────────
describe("suggestLength — lungimi sugerate pe baza geometriei", () => {
  // building cu areaUseful=100m² → perim = 4*sqrt(100) = 40m
  const building100 = { areaUseful: "100" };
  // building cu areaUseful=400m² → perim = 4*sqrt(400) = 80m
  const building400 = { areaUseful: "400" };

  it("'Planșeu intermediar' → 80% din perim (areaUseful=100 → 32.0m)", () => {
    const val = suggestLength("Perete ext. — Planșeu intermediar", building100);
    expect(parseFloat(val)).toBeCloseTo(32.0, 1);
  });

  it("'Planșeu terasă' → 100% din perim (areaUseful=100 → 40.0m)", () => {
    const val = suggestLength("Perete ext. — Planșeu terasă", building100);
    expect(parseFloat(val)).toBeCloseTo(40.0, 1);
  });

  it("'Planșeu terasă' cu areaUseful=400 → 80.0m (scală corect cu suprafața)", () => {
    const val = suggestLength("Perete ext. — Planșeu terasă", building400);
    expect(parseFloat(val)).toBeCloseTo(80.0, 1);
  });

  it("'Planșeu peste subsol' → 100% din perim", () => {
    const val = suggestLength("Perete ext. — Planșeu peste subsol", building100);
    expect(parseFloat(val)).toBeCloseTo(40.0, 1);
  });

  it("'Soclu' → 100% din perim", () => {
    const val = suggestLength("Perete ext. — Soclu/fundație", building100);
    expect(parseFloat(val)).toBeCloseTo(40.0, 1);
  });

  it("'Colț exterior' → '10' (fix — 4 colțuri × 2.5m)", () => {
    const val = suggestLength("Colț exterior", building100);
    expect(val).toBe("10");
  });

  it("'Glaf' → '24' (fix — 6 ferestre × 4m)", () => {
    const val = suggestLength("Glaf fereastră", building100);
    expect(val).toBe("24");
  });

  it("'Prag' → '4' (fix)", () => {
    const val = suggestLength("Prag ușă", building100);
    expect(val).toBe("4");
  });

  it("'Consolă' → '8' (fix — console balcon)", () => {
    const val = suggestLength("Consolă balcon", building100);
    expect(val).toBe("8");
  });

  it("'Cornișă' → 100% din perim", () => {
    const val = suggestLength("Cornișă acoperiș", building100);
    expect(parseFloat(val)).toBeCloseTo(40.0, 1);
  });

  it("'Coamă' → 40% din perim", () => {
    const val = suggestLength("Coamă acoperiș", building100);
    expect(parseFloat(val)).toBeCloseTo(16.0, 1);
  });

  it("'Stâlp' → '12' (fix — 4 stâlpi × 3m)", () => {
    const val = suggestLength("Stâlp beton", building100);
    expect(val).toBe("12");
  });

  it("'Grindă' → '6' (fix)", () => {
    const val = suggestLength("Grindă perete", building100);
    expect(val).toBe("6");
  });

  it("'Țeavă' → '2' (fix)", () => {
    const val = suggestLength("Țeavă trecere", building100);
    expect(val).toBe("2");
  });

  it("'Coș' → '8' (fix)", () => {
    const val = suggestLength("Coș fum", building100);
    expect(val).toBe("8");
  });

  it("'Roletă' → '6' (fix)", () => {
    const val = suggestLength("Casete Roletă", building100);
    expect(val).toBe("6");
  });

  it("element necunoscut → '5' (fallback)", () => {
    const val = suggestLength("Element necunoscut xyz", building100);
    expect(val).toBe("5");
  });

  it("building undefined → folosește areaUseful default 100 → perim=40", () => {
    const val = suggestLength("Perete ext. — Planșeu terasă", undefined);
    expect(parseFloat(val)).toBeCloseTo(40.0, 1);
  });

  it("returnează string (nu număr) — compatibil cu defaultValue input", () => {
    const val = suggestLength("Colț exterior", building100);
    expect(typeof val).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint Audit Pas 2 (4 mai 2026) — extindere acoperire wizard punți
// CATEGORY_GROUPS + getAllInGroup + getGroupedInCategory + getLengthRule
// ═══════════════════════════════════════════════════════════════════════════════

// ── CATEGORY_GROUPS — 8 grupe acoperă cele 31 sub-categorii reale ────────────
describe("CATEGORY_GROUPS — structură extinsă", () => {
  it("conține 8 grupe principale", () => {
    expect(CATEGORY_GROUPS).toHaveLength(8);
  });

  it("fiecare grupă are key, icon, label, hint, subCats", () => {
    CATEGORY_GROUPS.forEach(g => {
      expect(g).toHaveProperty("key");
      expect(g).toHaveProperty("icon");
      expect(g).toHaveProperty("label");
      expect(g).toHaveProperty("hint");
      expect(g).toHaveProperty("subCats");
      expect(Array.isArray(g.subCats)).toBe(true);
      expect(g.subCats.length).toBeGreaterThan(0);
    });
  });

  it("acoperă toate cele 31 sub-categorii din thermal-bridges.json fără duplicate", () => {
    const allSubCats = CATEGORY_GROUPS.flatMap(g => g.subCats);
    const uniqueSubCats = new Set(allSubCats);
    // Fără duplicate între grupe
    expect(uniqueSubCats.size).toBe(allSubCats.length);
    // Toate sub-categoriile reale din JSON sunt acoperite
    const realCats = new Set(THERMAL_BRIDGES_DB.map(b => b.cat));
    realCats.forEach(cat => {
      expect(uniqueSubCats.has(cat)).toBe(true);
    });
  });

  it("acoperirea totală a punților = 100% (toate cele 204 sunt accesibile)", () => {
    const allBridgesInGroups = CATEGORY_GROUPS.flatMap(g => getAllInGroup(g.key));
    expect(allBridgesInGroups.length).toBe(THERMAL_BRIDGES_DB.length);
  });

  it("grupa 'punctuale' conține EXACT categoria 'Elemente punctuale (chi)'", () => {
    const punct = CATEGORY_GROUPS.find(g => g.key === "punctuale");
    expect(punct.subCats).toEqual(["Elemente punctuale (chi)"]);
  });

  it("grupa 'passivhaus' conține Passivhaus / nZEB", () => {
    const ph = CATEGORY_GROUPS.find(g => g.key === "passivhaus");
    expect(ph.subCats).toContain("Passivhaus / nZEB");
  });
});

// ── getAllInGroup ────────────────────────────────────────────────────────────
describe("getAllInGroup — toate punțile dintr-o grupă", () => {
  it("grupa 'perete' returnează > 50 punți (10 sub-categorii)", () => {
    const all = getAllInGroup("perete");
    expect(all.length).toBeGreaterThan(50);
  });

  it("grupa 'fereastra' returnează ≥ 25 punți (4 sub-categorii)", () => {
    const all = getAllInGroup("fereastra");
    expect(all.length).toBeGreaterThanOrEqual(25);
  });

  it("toate punțile returnate aparțin unei sub-categorii din grupă", () => {
    const group = CATEGORY_GROUPS.find(g => g.key === "balcon");
    const all = getAllInGroup("balcon");
    all.forEach(b => {
      expect(group.subCats).toContain(b.cat);
    });
  });

  it("grupă inexistentă → array gol", () => {
    expect(getAllInGroup("xxxxx")).toEqual([]);
  });
});

// ── getGroupedInCategory ─────────────────────────────────────────────────────
describe("getGroupedInCategory — grupare pe sub-categorie cu separatori", () => {
  it("returnează array de { subCat, bridges }", () => {
    const grouped = getGroupedInCategory("acoperis");
    expect(Array.isArray(grouped)).toBe(true);
    grouped.forEach(g => {
      expect(g).toHaveProperty("subCat");
      expect(g).toHaveProperty("bridges");
      expect(Array.isArray(g.bridges)).toBe(true);
      expect(g.bridges.length).toBeGreaterThan(0);
    });
  });

  it("toate bridge-urile au cat = subCat", () => {
    const grouped = getGroupedInCategory("structura");
    grouped.forEach(g => {
      g.bridges.forEach(b => expect(b.cat).toBe(g.subCat));
    });
  });

  it("nu returnează sub-categorii cu 0 punți", () => {
    const grouped = getGroupedInCategory("perete");
    grouped.forEach(g => expect(g.bridges.length).toBeGreaterThan(0));
  });
});

// ── getLengthRule — ghidaj ISO 14683 §5 ──────────────────────────────────────
describe("getLengthRule — reguli măsurare lungime ISO 14683 §5", () => {
  it("LENGTH_RULE_GLOBAL menționează DIMENSIUNI EXTERIOARE și ISO 14683", () => {
    expect(LENGTH_RULE_GLOBAL).toMatch(/EXTERIOARE/);
    expect(LENGTH_RULE_GLOBAL).toMatch(/ISO 14683/);
  });

  it("punte 'Colț exterior' → menționează 'EXTERIOARĂ' și 'O SINGURĂ DATĂ'", () => {
    const rule = getLengthRule("Colț exterior perete-perete");
    expect(rule).toMatch(/EXTERIOAR/);
    expect(rule).toMatch(/SINGURĂ DATĂ/);
  });

  it("punte 'Glaf' → menționează lățime fereastră", () => {
    const rule = getLengthRule("Glaf fereastră");
    expect(rule).toMatch(/lățim|fereastr/i);
  });

  it("punte 'Stâlp' → menționează înălțime", () => {
    const rule = getLengthRule("Stâlp beton armat");
    expect(rule).toMatch(/înălțim/i);
  });

  it("punte 'Consolă balcon' → menționează balcon", () => {
    const rule = getLengthRule("Consolă balcon");
    expect(rule).toMatch(/balcon/i);
  });

  it("punte 'Planșeu intermediar' → menționează perimetru exterior", () => {
    const rule = getLengthRule("Perete ext. — Planșeu intermediar");
    expect(rule).toMatch(/perimetr/i);
    expect(rule).toMatch(/EXTERIOR/i);
  });

  it("punte necunoscută → fallback la regula globală", () => {
    const rule = getLengthRule("Punte fictivă XYZ");
    expect(rule).toBe(LENGTH_RULE_GLOBAL);
  });

  it("nume nul/undefined → fallback la regula globală", () => {
    expect(getLengthRule(null)).toBe(LENGTH_RULE_GLOBAL);
    expect(getLengthRule(undefined)).toBe(LENGTH_RULE_GLOBAL);
  });

  it("toate regulile menționează 'EXTERIOR' sau 'lungime' (consistență)", () => {
    const samples = [
      "Colț exterior", "Glaf fereastră", "Prag ușă", "Consolă balcon",
      "Stâlp beton", "Grindă perete", "Coamă acoperiș", "Cornișă acoperiș",
      "Perete ext. — Planșeu intermediar", "Atic terasă", "Soclu fundație",
    ];
    samples.forEach(name => {
      const rule = getLengthRule(name);
      expect(rule.length).toBeGreaterThan(20); // tooltip non-trivial
      expect(rule).toMatch(/EXTERIOAR|perimetr|înălțim|lățim|lungim/i);
    });
  });
});

// ── Metoda globală ΔU_tb forfetar (P1-7 — Mc 001-2022 §3.2.6) ────────────────
describe("GLOBAL_TB_LEVELS — niveluri calitate execuție", () => {
  it("conține exact 3 niveluri (A, B, C)", () => {
    expect(GLOBAL_TB_LEVELS).toHaveLength(3);
    expect(GLOBAL_TB_LEVELS.map(l => l.id)).toEqual(["A", "B", "C"]);
  });

  it("ΔU crește A < B < C (calitate scade)", () => {
    const a = GLOBAL_TB_LEVELS.find(l => l.id === "A");
    const b = GLOBAL_TB_LEVELS.find(l => l.id === "B");
    const c = GLOBAL_TB_LEVELS.find(l => l.id === "C");
    expect(a.deltaU).toBeLessThan(b.deltaU);
    expect(b.deltaU).toBeLessThan(c.deltaU);
  });

  it("A = 0.05, B = 0.10, C = 0.15 W/(m²·K) — Mc 001 Tab 3.18", () => {
    expect(GLOBAL_TB_LEVELS.find(l => l.id === "A").deltaU).toBe(0.05);
    expect(GLOBAL_TB_LEVELS.find(l => l.id === "B").deltaU).toBe(0.10);
    expect(GLOBAL_TB_LEVELS.find(l => l.id === "C").deltaU).toBe(0.15);
  });

  it("toate au sursă normativă (Mc 001-2022)", () => {
    GLOBAL_TB_LEVELS.forEach(lvl => {
      expect(lvl.source).toMatch(/Mc 001|ISO 14683/i);
    });
  });
});

describe("computeGlobalTbLoss — pierdere globală ΔU_tb × A_env", () => {
  it("nivel B + 200 m² → 0.10 × 200 = 20 W/K", () => {
    const r = computeGlobalTbLoss("B", 200);
    expect(r.deltaU).toBe(0.10);
    expect(r.totalLoss).toBeCloseTo(20.0, 1);
  });

  it("nivel A + 350 m² → 0.05 × 350 = 17.5 W/K", () => {
    const r = computeGlobalTbLoss("A", 350);
    expect(r.totalLoss).toBeCloseTo(17.5, 1);
  });

  it("nivel C + 1000 m² → 150 W/K (pierdere semnificativă)", () => {
    const r = computeGlobalTbLoss("C", 1000);
    expect(r.totalLoss).toBeCloseTo(150.0, 1);
  });

  it("nivel inexistent → null", () => {
    expect(computeGlobalTbLoss("Z", 100)).toBeNull();
  });

  it("areaEnvelope 0 sau negativ → null", () => {
    expect(computeGlobalTbLoss("B", 0)).toBeNull();
    expect(computeGlobalTbLoss("B", -10)).toBeNull();
  });

  it("rezultat include level (referință completă pentru afișare)", () => {
    const r = computeGlobalTbLoss("B", 100);
    expect(r.level.id).toBe("B");
    expect(r.level.label).toMatch(/Execuție bună/);
  });
});

// ── Câmpuri avansate punți (P1-8 — ISO 14683 §7.3) ──────────────────────────
describe("PSI_QUALITY_CLASSES — clase calitate calcul ψ", () => {
  it("conține 4 clase A/B/C/D", () => {
    expect(PSI_QUALITY_CLASSES).toHaveLength(4);
    expect(PSI_QUALITY_CLASSES.map(c => c.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("fiecare clasă are id, label, desc, confidence", () => {
    PSI_QUALITY_CLASSES.forEach(c => {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("label");
      expect(c).toHaveProperty("desc");
      expect(c).toHaveProperty("confidence");
    });
  });

  it("clasa A menționează 'numeric 2D/3D' (THERM/Flixo)", () => {
    expect(PSI_QUALITY_CLASSES[0].label).toMatch(/numeric|2D/i);
  });

  it("clasa C menționează ISO 14683 (default catalog)", () => {
    expect(PSI_QUALITY_CLASSES[2].label).toMatch(/ISO 14683/i);
  });

  it("clasa D — confidence 'Redusă' (estimare empirică)", () => {
    const d = PSI_QUALITY_CLASSES.find(c => c.id === "D");
    expect(d.confidence).toMatch(/Redusă|empirică/i);
  });
});

describe("PSI_SOURCES — surse referință pentru documentare", () => {
  it("conține minim 8 surse standard", () => {
    expect(PSI_SOURCES.length).toBeGreaterThanOrEqual(8);
  });

  it("include atlasele majore (ROCKWOOL, Schöck, NSAI, BRE, PHI)", () => {
    const labels = PSI_SOURCES.map(s => s.label).join(" ");
    expect(labels).toMatch(/ROCKWOOL/);
    expect(labels).toMatch(/Schöck/);
    expect(labels).toMatch(/NSAI/);
    expect(labels).toMatch(/BRE/);
    expect(labels).toMatch(/Passivhaus|PHI/);
  });

  it("include software calcul 2D/3D (THERM/Flixo, Heat3D/Bisco)", () => {
    const labels = PSI_SOURCES.map(s => s.label).join(" ");
    expect(labels).toMatch(/THERM|Flixo/);
    expect(labels).toMatch(/Heat3D|Bisco/);
  });

  it("default ISO 14683 Annex C există", () => {
    const def = PSI_SOURCES.find(s => s.id === "iso_14683_annex_c");
    expect(def).toBeDefined();
  });
});

describe("getPsiQualityClass — lookup helper", () => {
  it("ID valid → returnează obiectul complet", () => {
    const a = getPsiQualityClass("A");
    expect(a.id).toBe("A");
    expect(a.confidence).toMatch(/Foarte ridicată/i);
  });

  it("ID inexistent → null", () => {
    expect(getPsiQualityClass("Z")).toBeNull();
  });
});

// ── P2-8: Tooltip educațional pe quick-pick punți ────────────────────────────
describe("getEducationTooltip — descriere tehnică punți (P2-8)", () => {
  it("punte balcon traversant menționează ruptură termică Schöck/Isokorb", () => {
    const tip = getEducationTooltip("Balcon traversant fără ruptură termică");
    expect(tip).toMatch(/Schöck|Isokorb|HALFEN/i);
    expect(tip).toMatch(/ruptur[ăa] termic/i);
  });

  it("punte planșeu intermediar explică ETICS continuitate", () => {
    const tip = getEducationTooltip("Perete ext. — Planșeu intermediar");
    expect(tip).toMatch(/continui|continuita|ETICS/i);
  });

  it("punte stâlp menționează λ-mismatch", () => {
    const tip = getEducationTooltip("Stâlp beton armat în perete");
    expect(tip).toMatch(/λ|lambda/i);
  });

  it("punte glaf menționează etanșare bandă elastică", () => {
    const tip = getEducationTooltip("Glaf fereastră");
    expect(tip).toMatch(/etan[șs]are|band[ăa] elastic/i);
  });

  it("punte coș menționează izolație radială", () => {
    const tip = getEducationTooltip("Coș fum");
    expect(tip).toMatch(/radial|coș|carcas/i);
  });

  it("punte rost prefabricat menționează specific RO", () => {
    const tip = getEducationTooltip("Rost vertical panou prefabricat");
    expect(tip).toMatch(/RO|prefabric|panou|sigilare/i);
  });

  it("punte necunoscută → null (nu fallback)", () => {
    expect(getEducationTooltip("Punte fictivă")).toBeNull();
  });

  it("nume nul/undefined → null", () => {
    expect(getEducationTooltip(null)).toBeNull();
    expect(getEducationTooltip(undefined)).toBeNull();
  });

  it("toate tooltip-urile au minim 80 caractere (descriere completă)", () => {
    const samples = [
      "Perete ext. — Planșeu intermediar",
      "Balcon traversant fără ruptură termică",
      "Glaf fereastră",
      "Stâlp beton armat",
      "Atic terasă",
      "Coamă acoperiș",
      "Streașină acoperiș",
      "Soclu fundație",
      "Țeavă trecere perete",
      "Roletă casetă",
    ];
    samples.forEach(name => {
      const tip = getEducationTooltip(name);
      if (tip) {
        expect(tip.length).toBeGreaterThan(80);
      }
    });
  });

  it("acoperă minim 15 categorii distincte de punți", () => {
    const samples = [
      "Planșeu intermediar", "Planșeu terasă", "Planșeu peste subsol", "Soclu",
      "Colț exterior", "Glaf", "Jambă", "Prag", "Consolă balcon",
      "Stâlp beton", "Grindă", "Coamă", "Cornișă", "Atic",
      "Țeavă", "Coș", "Roletă", "Rost",
    ];
    const matched = samples.filter(s => getEducationTooltip(s) !== null);
    expect(matched.length).toBeGreaterThanOrEqual(15);
  });
});
