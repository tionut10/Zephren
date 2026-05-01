// Test pentru brands-registry.json + helpers brand din hvac-catalog.js
// Sprint P1 — 30 apr 2026

import { describe, it, expect } from "vitest";
import {
  BRANDS,
  BRANDS_BY_ID,
  HEAT_SOURCES_EXT,
  COOLING_SYSTEMS_EXT,
  LIGHTING_TYPES_EXT,
  CATALOG_META,
  getBrandsByCategory,
  getActivePartners,
  getBrandsForEntry,
  getEntriesByBrand,
  prioritizeBrand,
  applyPartnerSorting,
  getActivePartnersForEntry,
} from "../hvac-catalog.js";

describe("Brand Registry — sprint P1 30 apr 2026", () => {
  describe("Numărători + structură", () => {
    it("BRANDS conține cel puțin 100 brand-uri", () => {
      expect(BRANDS.length).toBeGreaterThanOrEqual(100);
    });

    it("CATALOG_META.brandCount sincronizat cu BRANDS.length", () => {
      expect(CATALOG_META.brandCount).toBe(BRANDS.length);
    });

    it("toate brand-urile au id, name, country, categories[], partnerStatus", () => {
      for (const b of BRANDS) {
        expect(b.id).toBeTruthy();
        expect(b.name).toBeTruthy();
        expect(b.country).toBeTruthy();
        expect(Array.isArray(b.categories)).toBe(true);
        expect(b.categories.length).toBeGreaterThan(0);
        expect(["none", "pending", "active", "discontinued"]).toContain(b.partnerStatus);
      }
    });

    it("toate IDs sunt unice", () => {
      const ids = BRANDS.map(b => b.id);
      const uniq = new Set(ids);
      expect(uniq.size).toBe(ids.length);
    });

    it("BRANDS_BY_ID este index corect pe id", () => {
      expect(BRANDS_BY_ID.viessmann).toBeTruthy();
      expect(BRANDS_BY_ID.viessmann.name).toBe("Viessmann");
      expect(BRANDS_BY_ID.daikin.country).toBe("JP");
    });
  });

  describe("Acoperire categorii HVAC", () => {
    const expectedCategories = ["heating", "cooling", "acm", "ventilation", "lighting", "smart-home", "distribution", "solar", "battery", "fuels"];

    for (const cat of expectedCategories) {
      it(`Categoria '${cat}' are cel puțin 5 brand-uri`, () => {
        const filtered = getBrandsByCategory(cat);
        expect(filtered.length).toBeGreaterThanOrEqual(5);
      });
    }

    it("Heating are cel puțin 25 brand-uri (cazane gaz/biomasă/PC)", () => {
      expect(getBrandsByCategory("heating").length).toBeGreaterThanOrEqual(25);
    });

    it("Lighting are cel puțin 15 brand-uri", () => {
      expect(getBrandsByCategory("lighting").length).toBeGreaterThanOrEqual(15);
    });

    it("Smart-home are cel puțin 10 brand-uri", () => {
      expect(getBrandsByCategory("smart-home").length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Geografia brand-urilor (acoperire RO + EU + global)", () => {
    it("Există brand-uri din DE (Germania)", () => {
      expect(BRANDS.some(b => b.country === "DE")).toBe(true);
    });

    it("Există brand-uri din IT (Italia)", () => {
      expect(BRANDS.some(b => b.country === "IT")).toBe(true);
    });

    it("Există brand-uri din JP (Japonia) — heat pumps + AC", () => {
      expect(BRANDS.some(b => b.country === "JP")).toBe(true);
    });

    it("Există brand-uri din RO (Romania) — naționale + furnizori", () => {
      expect(BRANDS.some(b => b.country === "RO")).toBe(true);
    });

    it("Există brand-uri din US, CN, KR (americane, chinezești, coreene)", () => {
      expect(BRANDS.some(b => b.country === "US")).toBe(true);
      expect(BRANDS.some(b => b.country === "CN")).toBe(true);
      expect(BRANDS.some(b => b.country === "KR")).toBe(true);
    });
  });

  describe("matchesEntries — legături cu catalog", () => {
    it("Viessmann matchează GAZ_COND (heating principal)", () => {
      expect(BRANDS_BY_ID.viessmann.matchesEntries).toContain("GAZ_COND");
    });

    it("Daikin matchează SPLIT_INV + VRF + PC_AA_INV", () => {
      const d = BRANDS_BY_ID.daikin;
      expect(d.matchesEntries).toContain("SPLIT_INV");
      expect(d.matchesEntries).toContain("VRF");
      expect(d.matchesEntries).toContain("PC_AA_INV");
    });

    it("Zehnder matchează MEC_HR_CFLOW + RAD_PROSOP_VENT (ventilare + radiator)", () => {
      const z = BRANDS_BY_ID.zehnder;
      expect(z.matchesEntries).toContain("MEC_HR_CFLOW");
      expect(z.matchesEntries).toContain("RAD_PROSOP_VENT");
    });

    it("Philips matchează cel puțin 5 entries lighting", () => {
      const p = BRANDS_BY_ID.philips;
      expect(p.matchesEntries.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Partner status — politică NEUTRĂ inițială", () => {
    it("La inițializare, ZERO brand-uri sunt active partener", () => {
      const active = getActivePartners();
      expect(active.length).toBe(0);
    });

    it("CATALOG_META.brandActivePartners este 0", () => {
      expect(CATALOG_META.brandActivePartners).toBe(0);
    });

    it("Toate brand-urile au partnerSince=null la inițializare", () => {
      for (const b of BRANDS) {
        expect(b.partnerSince).toBeNull();
      }
    });

    it("Toate brand-urile au partnerTier=null la inițializare", () => {
      for (const b of BRANDS) {
        expect(b.partnerTier).toBeNull();
      }
    });

    it("Toate brand-urile au affiliateUrl=null la inițializare", () => {
      for (const b of BRANDS) {
        expect(b.affiliateUrl).toBeNull();
      }
    });
  });

  describe("Helper getBrandsByCategory", () => {
    it("Returnează lista corectă pentru 'heating'", () => {
      const heating = getBrandsByCategory("heating");
      expect(heating.length).toBeGreaterThan(20);
      for (const b of heating) {
        expect(b.categories).toContain("heating");
      }
    });

    it("Returnează lista goală pentru categorie inexistentă", () => {
      expect(getBrandsByCategory("magic-unicorn")).toEqual([]);
    });
  });

  describe("Helper getBrandsForEntry", () => {
    it("Returnează brand-urile pentru GAZ_COND", () => {
      const brands = getBrandsForEntry("GAZ_COND");
      expect(brands.length).toBeGreaterThan(0);
      expect(brands).toContain("viessmann");
      expect(brands).toContain("vaillant");
    });

    it("Returnează listă goală pentru entry fără match", () => {
      expect(getBrandsForEntry("INEXISTENT_XYZ")).toEqual([]);
    });
  });

  describe("Helper getEntriesByBrand", () => {
    it("Returnează entries HEAT_SOURCES_EXT matchate de Viessmann", () => {
      const entries = getEntriesByBrand("viessmann", HEAT_SOURCES_EXT);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some(e => e.id === "GAZ_COND")).toBe(true);
    });

    it("Returnează listă goală pentru brand inexistent", () => {
      expect(getEntriesByBrand("nonexistent_brand_xyz", HEAT_SOURCES_EXT)).toEqual([]);
    });
  });

  describe("Helper prioritizeBrand — sortare partener manual", () => {
    it("Mută entries Viessmann în top când e specificat ca prioritar", () => {
      const sorted = prioritizeBrand(HEAT_SOURCES_EXT, "viessmann");
      const viessmannIds = new Set(BRANDS_BY_ID.viessmann.matchesEntries);
      // Primele entries trebuie să fie din lista Viessmann
      const firstFew = sorted.slice(0, 3);
      const allViess = firstFew.every(e => viessmannIds.has(e.id));
      expect(allViess).toBe(true);
    });

    it("Returnează ordine originală dacă brandul e null/undefined", () => {
      const sorted = prioritizeBrand(HEAT_SOURCES_EXT, null);
      expect(sorted[0]).toEqual(HEAT_SOURCES_EXT[0]);
    });
  });

  describe("Helper applyPartnerSorting — auto sort cu partneri activi", () => {
    it("Returnează ordine originală când nu există parteneri activi", () => {
      // Inițial nu există parteneri activi
      const sorted = applyPartnerSorting(HEAT_SOURCES_EXT);
      expect(sorted).toEqual(HEAT_SOURCES_EXT);
    });

    it("Funcționează corect cu listă goală", () => {
      expect(applyPartnerSorting([])).toEqual([]);
    });
  });

  describe("Helper getActivePartnersForEntry", () => {
    it("Returnează listă goală inițial (zero parteneri activi)", () => {
      const partners = getActivePartnersForEntry("GAZ_COND");
      expect(partners).toEqual([]);
    });
  });

  describe("Schema validare — câmpuri obligatorii pe fiecare brand", () => {
    it("Toate brand-urile au productLines array (poate fi gol)", () => {
      for (const b of BRANDS) {
        expect(Array.isArray(b.productLines)).toBe(true);
      }
    });

    it("Toate brand-urile au matchesEntries array (poate fi gol)", () => {
      for (const b of BRANDS) {
        expect(Array.isArray(b.matchesEntries)).toBe(true);
      }
    });

    it("Toate brand-urile au notes (string)", () => {
      for (const b of BRANDS) {
        expect(typeof b.notes).toBe("string");
      }
    });
  });

  describe("Furnizori energie RO", () => {
    it("Există furnizori gaz/electricitate RO (Romgaz, Engie, E.ON, Hidroelectrica)", () => {
      expect(BRANDS_BY_ID.romgaz).toBeTruthy();
      expect(BRANDS_BY_ID.engie_ro).toBeTruthy();
      expect(BRANDS_BY_ID.eon_ro).toBeTruthy();
      expect(BRANDS_BY_ID.hidroelectrica).toBeTruthy();
    });

    it("Hidroelectrica matchează electricitate verde + GO", () => {
      const h = BRANDS_BY_ID.hidroelectrica;
      expect(h.matchesEntries).toContain("electricitate_verde_ppa");
      expect(h.categories).toContain("fuels");
    });
  });

  describe("Acoperire RO — brand-uri populare piață locală", () => {
    it("Branduri RO native (Romstal, Baluți)", () => {
      expect(BRANDS.some(b => b.id === "romstal" && b.country === "RO")).toBe(true);
    });

    it("Branduri DE top pentru RO (Viessmann, Vaillant, Bosch, Wolf)", () => {
      expect(BRANDS_BY_ID.viessmann).toBeTruthy();
      expect(BRANDS_BY_ID.vaillant).toBeTruthy();
      expect(BRANDS_BY_ID.bosch).toBeTruthy();
      expect(BRANDS_BY_ID.wolf).toBeTruthy();
    });

    it("Branduri IT mari prezente RO (Ariston, Immergas, Ferroli, Baxi)", () => {
      expect(BRANDS_BY_ID.ariston).toBeTruthy();
      expect(BRANDS_BY_ID.immergas).toBeTruthy();
      expect(BRANDS_BY_ID.ferroli).toBeTruthy();
      expect(BRANDS_BY_ID.baxi).toBeTruthy();
    });

    it("Branduri JP heat pumps + AC (Daikin, Mitsubishi, Panasonic, LG)", () => {
      expect(BRANDS_BY_ID.daikin).toBeTruthy();
      expect(BRANDS_BY_ID.mitsubishi_electric).toBeTruthy();
      expect(BRANDS_BY_ID.panasonic).toBeTruthy();
      expect(BRANDS_BY_ID.lg).toBeTruthy();
    });
  });
});
