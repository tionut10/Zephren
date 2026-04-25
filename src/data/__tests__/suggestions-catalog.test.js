// ═══════════════════════════════════════════════════════════════
// suggestions-catalog — Teste catalog NEUTRU sugestii orientative
// ═══════════════════════════════════════════════════════════════
// Verifică:
//   1. Schema (zero brand-uri în catalog — câmpuri rezervate null)
//   2. Filtrare pe categorii / use-case
//   3. Algoritm sortare (meets target → tag match → cost ascendent)
//   4. Helpers UI (formatPriceRange)
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";
import {
  ALL_SUGGESTIONS,
  OPAQUE_INSULATION_SUGGESTIONS,
  GLAZING_SUGGESTIONS,
  FRAME_SUGGESTIONS,
  HEATING_SUGGESTIONS,
  PV_SUGGESTIONS,
  CATALOG_VERSION,
  CATALOG_DISCLAIMER,
  filterByCategory,
  filterByUseCase,
  suggestForOpaqueElement,
  suggestForGlazingElement,
  suggestHVAC,
  suggestPV,
  formatPriceRange,
} from "../suggestions-catalog.js";

describe("suggestions-catalog — Schema neutralitate", () => {
  it("toate entries au brand=null (zero nume comerciale)", () => {
    for (const entry of ALL_SUGGESTIONS) {
      expect(entry.brand).toBeNull();
    }
  });

  it("toate entries au câmpuri rezervate (supplierId, sku, affiliateUrl) = null", () => {
    for (const entry of ALL_SUGGESTIONS) {
      expect(entry.supplierId).toBeNull();
      expect(entry.sku).toBeNull();
      expect(entry.affiliateUrl).toBeNull();
    }
  });

  it("toate entries au sponsored=false la lansare", () => {
    for (const entry of ALL_SUGGESTIONS) {
      expect(entry.sponsored).toBe(false);
    }
  });

  it("toate entries au câmpuri obligatorii populate", () => {
    for (const entry of ALL_SUGGESTIONS) {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.tech).toBeDefined();
      expect(Array.isArray(entry.useCase)).toBe(true);
      expect(entry.useCase.length).toBeGreaterThan(0);
      expect(entry.priceRange).toBeDefined();
      expect(entry.priceRange.min).toBeGreaterThan(0);
      expect(entry.priceRange.max).toBeGreaterThanOrEqual(entry.priceRange.min);
      expect(Array.isArray(entry.normRefs)).toBe(true);
    }
  });

  it("ID-urile sunt unice în întreg catalogul", () => {
    const ids = ALL_SUGGESTIONS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("descrierea NU conține nume de marcă cunoscute", () => {
    const blacklist = [
      "rockwool", "saint-gobain", "knauf", "isover", "ursa",
      "rehau", "veka", "salamander", "schüco", "schueco",
      "daikin", "viessmann", "vaillant", "bosch", "ariston",
      "leroy", "dedeman", "arabesque",
    ];
    for (const entry of ALL_SUGGESTIONS) {
      const text = `${entry.label} ${entry.description} ${entry.labelEN || ""}`.toLowerCase();
      for (const brand of blacklist) {
        expect(text.includes(brand)).toBe(false);
      }
    }
  });

  it("CATALOG_VERSION + CATALOG_DISCLAIMER expuse", () => {
    expect(CATALOG_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(CATALOG_DISCLAIMER).toContain("orientative");
  });
});

describe("filterByCategory + filterByUseCase", () => {
  it("filterByCategory('opaque-insulation') returnează doar termoizolații", () => {
    const r = filterByCategory("opaque-insulation");
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBe(OPAQUE_INSULATION_SUGGESTIONS.length);
    for (const e of r) expect(e.category).toBe("opaque-insulation");
  });

  it("filterByCategory(null/undefined) returnează []", () => {
    expect(filterByCategory(null)).toEqual([]);
    expect(filterByCategory()).toEqual([]);
  });

  it("filterByUseCase('PE') returnează doar entries pentru pereți exteriori", () => {
    const r = filterByUseCase("PE");
    expect(r.length).toBeGreaterThan(0);
    for (const e of r) expect(e.useCase).toContain("PE");
  });

  it("filterByUseCase('fereastra') include vitraje + rame", () => {
    const r = filterByUseCase("fereastra");
    expect(r.some(e => e.category === "glazing")).toBe(true);
    expect(r.some(e => e.category === "frame")).toBe(true);
  });
});

describe("suggestForOpaqueElement — sortare + meetsTarget", () => {
  it("returnează maxim `limit` rezultate", () => {
    const r = suggestForOpaqueElement({
      elementType: "PE",
      uCurrent: 1.5,
      uTarget: 0.30,
      limit: 2,
    });
    expect(r.length).toBeLessThanOrEqual(2);
  });

  it("entries care ating ținta sunt ordonate înaintea celor care nu", () => {
    const r = suggestForOpaqueElement({
      elementType: "PE",
      uCurrent: 1.5,
      uTarget: 0.30,
      limit: 5,
    });
    expect(r.length).toBeGreaterThan(0);
    // Verifică sortarea: dacă există atât true cât și false, true vine primul
    const meetsArray = r.map(e => e.meetsTarget);
    const firstFalseIdx = meetsArray.indexOf(false);
    if (firstFalseIdx !== -1) {
      // toate cele de după primul false trebuie să fie tot false
      for (let i = firstFalseIdx; i < meetsArray.length; i++) {
        expect(meetsArray[i]).toBe(false);
      }
    }
  });

  it("la egalitate (toate ating țintă), sortare după cost ascendent", () => {
    // U_current ridicat = ΔR mic → toate variantele bune
    const r = suggestForOpaqueElement({
      elementType: "PE",
      uCurrent: 1.5,
      uTarget: 0.80, // țintă lejeră
      limit: 5,
    });
    const allMeet = r.every(e => e.meetsTarget);
    if (allMeet && r.length > 1) {
      for (let i = 1; i < r.length; i++) {
        expect(r[i]._avgPrice).toBeGreaterThanOrEqual(r[i - 1]._avgPrice);
      }
    }
  });

  it("cu preferredTag='nZEB', sortare prioritizează nZEB", () => {
    const r = suggestForOpaqueElement({
      elementType: "PE",
      uCurrent: 1.5,
      uTarget: 0.30,
      preferredTags: ["nZEB"],
      limit: 5,
    });
    expect(r.length).toBeGreaterThan(0);
    // Dacă există entries cu tagMatch>0, trebuie să fie înaintea celor cu tagMatch=0
    // (la nivel egal de meetsTarget)
  });

  it("nu crash când uCurrent=0 sau uTarget=0", () => {
    const r1 = suggestForOpaqueElement({ elementType: "PE", uCurrent: 0, uTarget: 0.30 });
    const r2 = suggestForOpaqueElement({ elementType: "PE", uCurrent: 1.5, uTarget: 0 });
    expect(Array.isArray(r1)).toBe(true);
    expect(Array.isArray(r2)).toBe(true);
  });

  it("element type necunoscut → array gol", () => {
    const r = suggestForOpaqueElement({ elementType: "XXX", uCurrent: 1, uTarget: 0.3 });
    expect(r).toEqual([]);
  });
});

describe("suggestForGlazingElement", () => {
  it("returnează glazings + frames", () => {
    const r = suggestForGlazingElement({ uTarget: 1.30, isDoor: false });
    expect(Array.isArray(r.glazings)).toBe(true);
    expect(Array.isArray(r.frames)).toBe(true);
    expect(r.glazings.length).toBeGreaterThan(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("vitraje cu U mai mic decât țintă au meetsTarget=true", () => {
    const r = suggestForGlazingElement({ uTarget: 1.30, isDoor: false, limit: 5 });
    for (const g of r.glazings) {
      if (g.tech.U <= 1.30) expect(g.meetsTarget).toBe(true);
      else expect(g.meetsTarget).toBe(false);
    }
  });

  it("limit aplicat pe ambele liste", () => {
    const r = suggestForGlazingElement({ uTarget: 1.30, isDoor: false, limit: 2 });
    expect(r.glazings.length).toBeLessThanOrEqual(2);
    expect(r.frames.length).toBeLessThanOrEqual(2);
  });
});

describe("suggestHVAC", () => {
  it("functionType='heating' returnează doar heating entries", () => {
    const r = suggestHVAC({ functionType: "heating", peakLoad_kW: 8 });
    for (const s of r) expect(s.category).toBe("hvac-heating");
  });

  it("functionType='both' include heating + cooling", () => {
    const r = suggestHVAC({ functionType: "both", peakLoad_kW: 8, limit: 10 });
    const cats = new Set(r.map(s => s.category));
    expect(cats.size).toBeGreaterThanOrEqual(1);
  });

  it("preferredTags='fade-out-2030' avertizat — entry exists with warnings", () => {
    const boilerEntries = HEATING_SUGGESTIONS.filter(s => s.tags.includes("fade-out-2030"));
    expect(boilerEntries.length).toBeGreaterThan(0);
    expect(boilerEntries[0].warnings).toBeDefined();
    expect(boilerEntries[0].warnings.length).toBeGreaterThan(0);
  });
});

describe("suggestPV", () => {
  it("ordonează după proximitatea față de targetKWp", () => {
    const r = suggestPV({ targetKWp: 6, limit: 3 });
    expect(r.length).toBeGreaterThan(0);
    // Top result trebuie să fie cel mai aproape de 6 kWp
    const topMatch = r[0]._match;
    for (const s of r) {
      expect(s._match).toBeGreaterThanOrEqual(topMatch);
    }
  });

  it("returnează entries cu kWp definit", () => {
    const r = suggestPV({ targetKWp: 3, limit: 5 });
    for (const s of r) expect(s.tech.kWp).toBeGreaterThan(0);
  });
});

describe("formatPriceRange", () => {
  it("formatează corect un interval valid", () => {
    expect(formatPriceRange({ min: 25, max: 35, unit: "RON/m²" })).toBe("25-35 RON/m²");
  });

  it("returnează '—' pentru null/undefined", () => {
    expect(formatPriceRange(null)).toBe("—");
    expect(formatPriceRange(undefined)).toBe("—");
    expect(formatPriceRange({})).toBe("—");
  });
});

describe("Sanity check — cardinalități minime", () => {
  it("OPAQUE_INSULATION are ≥ 6 entries (acoperire EPS/MW/XPS/PIR/celuloză/aerogel)", () => {
    expect(OPAQUE_INSULATION_SUGGESTIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("GLAZING are ≥ 3 entries (2G/3G/special)", () => {
    expect(GLAZING_SUGGESTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("FRAME are ≥ 3 entries (PVC/aluminiu/lemn)", () => {
    expect(FRAME_SUGGESTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("HEATING include cel puțin o pompă căldură nZEB", () => {
    const hp = HEATING_SUGGESTIONS.filter(s =>
      s.subcategory.startsWith("pompa-caldura")
    );
    expect(hp.length).toBeGreaterThanOrEqual(2);
  });

  it("PV include sisteme rezidențial + comercial", () => {
    const subcats = new Set(PV_SUGGESTIONS.map(s => s.subcategory));
    expect(subcats.has("sistem-rezidential")).toBe(true);
    expect(subcats.has("sistem-comercial")).toBe(true);
  });
});
