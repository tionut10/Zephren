import { describe, it, expect } from "vitest";
import {
  MAIN_CATEGORIES,
  getQuickPicks,
  suggestLength,
} from "../utils/bridgesCalc.js";

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
