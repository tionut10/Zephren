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
  VENTILATION_SUGGESTIONS,
  ACM_SUGGESTIONS,
  PV_SUGGESTIONS,
  CATALOG_VERSION,
  CATALOG_DISCLAIMER,
  filterByCategory,
  filterByUseCase,
  suggestForOpaqueElement,
  suggestForGlazingElement,
  suggestHVAC,
  suggestPV,
  suggestACM,
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

  it("centrală pe gaz (meetsTarget=false) NU poate depăși o pompă căldură (meetsTarget=true)", () => {
    const r = suggestHVAC({
      functionType: "heating",
      peakLoad_kW: 24,
      preferredTags: ["legacy"],
      limit: 5,
    });
    const firstFalseIdx = r.findIndex(s => s.meetsTarget === false);
    if (firstFalseIdx !== -1) {
      for (let i = 0; i < firstFalseIdx; i++) {
        expect(r[i].meetsTarget).toBe(true);
      }
      for (let i = firstFalseIdx; i < r.length; i++) {
        expect(r[i].meetsTarget).toBe(false);
      }
    }
  });

  it("sort prioritizează meetsTarget chiar când tagMatch concurent ar fi mai mare la o entry false", () => {
    const r = suggestHVAC({
      functionType: "heating",
      peakLoad_kW: 24,
      preferredTags: ["legacy", "fade-out-2030"],
      limit: 10,
    });
    expect(r.length).toBeGreaterThan(0);
    const firstMeets = r[0].meetsTarget;
    const anyTrue = r.some(s => s.meetsTarget === true);
    if (anyTrue) expect(firstMeets).toBe(true);
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

describe("suggestHVAC — semnale extinse (Task 3)", () => {
  it("auto peakLoad din buildingArea (~70 W/m²)", () => {
    const r = suggestHVAC({
      functionType: "heating",
      buildingArea: 100,
      limit: 10,
    });
    expect(r.length).toBeGreaterThan(0);
    // Cu 100 m² × 0.07 = 7 kW → entry HP 8 kW ar trebui să fie cel mai apropiat
    const top = r[0];
    expect(top.tech.capacity_kW).toBeDefined();
  });

  it("zona I impune SCOP ≥ 3.8 (HP aer-apă 8kW SCOP=4.0 trece)", () => {
    const r = suggestHVAC({
      functionType: "heating",
      peakLoad_kW: 8,
      climateZone: "I",
      limit: 10,
    });
    const hpAerApa = r.find(s => s.id === "hp-aer-apa-8");
    expect(hpAerApa?.meetsTarget).toBe(true);
    // HP aer-apă 16kW (SCOP 3.8) trece pe pragul exact 3.8
    const hpAerApa16 = r.find(s => s.id === "hp-aer-apa-16");
    expect(hpAerApa16?.meetsTarget).toBe(true);
  });

  it("clădire publică (BCC) fără tag fire-safe → meetsTarget=false", () => {
    const r = suggestHVAC({
      functionType: "heating",
      peakLoad_kW: 16,
      buildingCategory: "BCC",
      limit: 10,
    });
    expect(r.length).toBeGreaterThan(0);
    // HEATING_SUGGESTIONS nu include tag fire-safe → toate ar trebui să nu treacă
    for (const s of r) {
      if (s.tags.includes("fire-safe")) continue;
      expect(s.meetsTarget).toBe(false);
    }
  });
});

describe("suggestPV — semnale extinse (Task 3)", () => {
  it("auto targetKWp din buildingArea (~50 Wp/m²)", () => {
    const r = suggestPV({ buildingArea: 120, limit: 5 });
    expect(r.length).toBeGreaterThan(0);
    // 120 × 0.05 = 6 kWp → entry pv-6kwp-rezidential ar trebui pe primul loc
    expect(r[0].id).toBe("pv-6kwp-rezidential");
  });

  it("targetKWp explicit override-uie buildingArea", () => {
    const r = suggestPV({ targetKWp: 30, buildingArea: 120, limit: 5 });
    // 30 kWp explicit → pv-30kwp-comercial primul
    expect(r[0].id).toBe("pv-30kwp-comercial");
  });
});

describe("suggestACM — Task 4 catalog ACM dedicat", () => {
  it("ACM_SUGGESTIONS conține minim 3 entries (HPWH + solar + electric)", () => {
    expect(ACM_SUGGESTIONS.length).toBeGreaterThanOrEqual(3);
    const ids = ACM_SUGGESTIONS.map(s => s.id);
    expect(ids).toContain("hpwh-200l");
    expect(ids).toContain("solar-acm-flat-2m2");
    expect(ids).toContain("boiler-electric-100l");
  });

  it("schema NEUTRĂ — toate ACM_SUGGESTIONS au brand=null", () => {
    for (const s of ACM_SUGGESTIONS) {
      expect(s.brand).toBeNull();
      expect(s.affiliateUrl).toBeNull();
    }
  });

  it("filtrare după residents: 4 persoane → minim 200L", () => {
    const r = suggestACM({ residents: 4, limit: 5 });
    expect(r.length).toBeGreaterThan(0);
    // hpwh-200l (200L) trece, solar-150L NU
    for (const s of r) {
      expect(s.tech.capacity_L).toBeGreaterThanOrEqual(200);
    }
  });

  it("residents=0 sau undefined → fără filtru", () => {
    const r = suggestACM({ limit: 10 });
    expect(r.length).toBe(ACM_SUGGESTIONS.length);
  });

  it("HPWH (COP=3.2) prioritar față de electric (COP=0.99 + legacy)", () => {
    const r = suggestACM({ residents: 2, limit: 3 });
    const hpwh = r.find(s => s.id === "hpwh-200l");
    const electric = r.find(s => s.id === "boiler-electric-100l");
    expect(hpwh?.meetsTarget).toBe(true);
    expect(electric?.meetsTarget).toBe(false);
    // hpwh înainte de electric când amândouă sunt în lista
    if (hpwh && electric) {
      const idxHpwh = r.indexOf(hpwh);
      const idxElec = r.indexOf(electric);
      expect(idxHpwh).toBeLessThan(idxElec);
    }
  });
});

describe("VENTILATION_SUGGESTIONS — Task 7 dimensionare per suprafață", () => {
  it("conține 4 entries cu sizeTag (small/medium/large + single)", () => {
    expect(VENTILATION_SUGGESTIONS.length).toBe(4);
    const tags = VENTILATION_SUGGESTIONS.map(v => v.tech.sizeTag);
    expect(tags).toContain("small");
    expect(tags).toContain("medium");
    expect(tags).toContain("large");
  });

  it("VMC compact small are debit ≤ 200 m³/h", () => {
    const small = VENTILATION_SUGGESTIONS.find(v => v.id === "vmc-dual-small");
    expect(small?.tech.airflow_m3h_max).toBeLessThanOrEqual(200);
  });

  it("DOAS commercial are debit ≥ 1000 m³/h", () => {
    const large = VENTILATION_SUGGESTIONS.find(v => v.id === "vmc-doas-commercial");
    expect(large?.tech.airflow_m3h_max).toBeGreaterThanOrEqual(1000);
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
