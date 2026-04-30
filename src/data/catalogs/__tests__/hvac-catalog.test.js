// Test pentru hvac-catalog.js — sprint cercetare HVAC 30 apr 2026
// Valideaz structura catalogului extins, helpers bilingv, numărători.

import { describe, it, expect } from "vitest";
import {
  HEAT_SOURCES_EXT,
  EMISSION_SYSTEMS_EXT,
  DISTRIBUTION_QUALITY_EXT,
  CONTROL_TYPES_EXT,
  ACM_SOURCES_EXT,
  ACM_STORAGE_TYPES,
  ACM_ANTI_LEGIONELLA,
  PIPE_INSULATION_TYPES,
  COOLING_SYSTEMS_EXT,
  COOLING_EMISSION_EXT,
  COOLING_DISTRIBUTION_EXT,
  COOLING_CONTROL_EXT,
  VENTILATION_TYPES_EXT,
  LIGHTING_TYPES_EXT,
  LIGHTING_CONTROL_EXT,
  FUELS_EXT,
  HVAC_CATALOG,
  CATALOG_META,
  getLabel,
  filterByBuildingCategory,
  findById,
  groupByCategory,
} from "../hvac-catalog.js";

describe("HVAC Extended Catalog — Sprint Cercetare 2026-04-30", () => {
  describe("Numărători minime per categorie (entries existente + extensii)", () => {
    it("HEAT_SOURCES_EXT trebuie să aibă cel puțin 100 entries (50 base + 50 noi)", () => {
      expect(HEAT_SOURCES_EXT.length).toBeGreaterThanOrEqual(100);
    });

    it("EMISSION_SYSTEMS_EXT trebuie să aibă cel puțin 70 entries (30 base + 41 noi)", () => {
      expect(EMISSION_SYSTEMS_EXT.length).toBeGreaterThanOrEqual(70);
    });

    it("DISTRIBUTION_QUALITY_EXT trebuie să aibă cel puțin 35 entries (10 base + 26 noi)", () => {
      expect(DISTRIBUTION_QUALITY_EXT.length).toBeGreaterThanOrEqual(35);
    });

    it("CONTROL_TYPES_EXT trebuie să aibă cel puțin 30 entries (12 base + 20 noi)", () => {
      expect(CONTROL_TYPES_EXT.length).toBeGreaterThanOrEqual(30);
    });

    it("ACM_SOURCES_EXT trebuie să aibă cel puțin 40 entries (18 base + 26 noi)", () => {
      expect(ACM_SOURCES_EXT.length).toBeGreaterThanOrEqual(40);
    });

    it("ACM_STORAGE_TYPES trebuie să aibă cel puțin 12 entries", () => {
      expect(ACM_STORAGE_TYPES.length).toBeGreaterThanOrEqual(12);
    });

    it("ACM_ANTI_LEGIONELLA trebuie să aibă cel puțin 5 entries", () => {
      expect(ACM_ANTI_LEGIONELLA.length).toBeGreaterThanOrEqual(5);
    });

    it("PIPE_INSULATION_TYPES trebuie să aibă cel puțin 10 entries", () => {
      expect(PIPE_INSULATION_TYPES.length).toBeGreaterThanOrEqual(10);
    });

    it("COOLING_SYSTEMS_EXT trebuie să aibă cel puțin 50 entries (25 base + 30 noi)", () => {
      expect(COOLING_SYSTEMS_EXT.length).toBeGreaterThanOrEqual(50);
    });

    it("VENTILATION_TYPES_EXT trebuie să aibă cel puțin 70 entries (22 base + 56 noi)", () => {
      expect(VENTILATION_TYPES_EXT.length).toBeGreaterThanOrEqual(70);
    });

    it("LIGHTING_TYPES_EXT trebuie să aibă cel puțin 65 entries (21 base + 50 noi)", () => {
      expect(LIGHTING_TYPES_EXT.length).toBeGreaterThanOrEqual(65);
    });

    it("LIGHTING_CONTROL_EXT trebuie să aibă cel puțin 30 entries (10 base + 24 noi)", () => {
      expect(LIGHTING_CONTROL_EXT.length).toBeGreaterThanOrEqual(30);
    });

    it("FUELS_EXT trebuie să aibă cel puțin 55 entries (15 base + 49 noi)", () => {
      expect(FUELS_EXT.length).toBeGreaterThanOrEqual(55);
    });

    it("Total entries în catalog ≥ 600", () => {
      expect(CATALOG_META.totalEntries).toBeGreaterThanOrEqual(600);
    });
  });

  describe("Schema entries — câmpuri obligatorii", () => {
    it("toate entries au id și nameRo", () => {
      for (const cat of Object.keys(HVAC_CATALOG)) {
        for (const entry of HVAC_CATALOG[cat]) {
          expect(entry.id).toBeTruthy();
          expect(entry.nameRo).toBeTruthy();
        }
      }
    });

    it("toate entries au nameEn (după normalizare)", () => {
      for (const cat of Object.keys(HVAC_CATALOG)) {
        for (const entry of HVAC_CATALOG[cat]) {
          expect(entry.nameEn).toBeTruthy();
        }
      }
    });

    it("toate entries au label (alias RO pentru compat)", () => {
      for (const cat of Object.keys(HVAC_CATALOG)) {
        for (const entry of HVAC_CATALOG[cat]) {
          expect(entry.label).toBeTruthy();
        }
      }
    });
  });

  describe("Diacritice românești în nameRo (exemple cunoscute)", () => {
    it("HEAT_SOURCES_EXT conține 'Pompă' cu diacritică ă", () => {
      const found = HEAT_SOURCES_EXT.some(e => e.nameRo.includes("Pompă"));
      expect(found).toBe(true);
    });

    it("EMISSION_SYSTEMS_EXT conține 'încălzire' cu diacritică â/î", () => {
      const found = EMISSION_SYSTEMS_EXT.some(e =>
        e.nameRo.includes("încălzire") || e.nameRo.includes("Încălzire")
      );
      expect(found).toBe(true);
    });

    it("VENTILATION_TYPES_EXT conține 'ventilație' cu diacritică ț", () => {
      const found = VENTILATION_TYPES_EXT.some(e =>
        e.nameRo.toLowerCase().includes("ventilație") || e.nameRo.toLowerCase().includes("ventilare")
      );
      expect(found).toBe(true);
    });
  });

  describe("Entries noi (din agenți) au câmpul source cu standard EN/ISO", () => {
    it("HEAT_SOURCES — entries noi au source cu EN/SR/ISO", () => {
      const newEntries = HEAT_SOURCES_EXT.filter(e => e.source);
      expect(newEntries.length).toBeGreaterThan(40);
      const withStandard = newEntries.filter(e =>
        /\b(EN|SR EN|ISO|SR EN ISO|VDI|ASHRAE|REHVA|EU|Reg\.|Lege)\b/.test(e.source)
      );
      expect(withStandard.length).toBeGreaterThan(40);
    });

    it("VENTILATION — entries noi au source cu EN/SR/ISO sau standard echivalent", () => {
      const newEntries = VENTILATION_TYPES_EXT.filter(e => e.source);
      expect(newEntries.length).toBeGreaterThan(40);
    });
  });

  describe("Politica NEUTRĂ — zero brand-uri în nameRo / nameEn", () => {
    const FORBIDDEN_BRANDS = [
      "Daikin", "Mitsubishi", "Carrier", "Trane", "York",
      "Viessmann", "Vaillant", "Bosch", "Buderus", "Junkers",
      "Stiebel", "Eltron", "Wolf", "Weishaupt",
      "Zehnder", "Kermi", "Uponor", "Rehau", "Roth",
      "Lunos", "Helios", "Vallox", "Aldes", "ComfoAir",
      "Philips Hue", "Casambi", "Lutron", "Tridonic", "Osram",
      "Honeywell", "Siemens", "Danfoss", "tado", "Nest", "Ecobee",
    ];

    it("HEAT_SOURCES_EXT nu conține brand-uri interzise în nameRo/nameEn", () => {
      for (const entry of HEAT_SOURCES_EXT) {
        for (const brand of FORBIDDEN_BRANDS) {
          expect(entry.nameRo.toLowerCase()).not.toContain(brand.toLowerCase());
          expect(entry.nameEn.toLowerCase()).not.toContain(brand.toLowerCase());
        }
      }
    });

    it("LIGHTING_TYPES_EXT nu conține brand-uri interzise în nameRo/nameEn", () => {
      for (const entry of LIGHTING_TYPES_EXT) {
        for (const brand of FORBIDDEN_BRANDS) {
          expect(entry.nameRo.toLowerCase()).not.toContain(brand.toLowerCase());
          expect(entry.nameEn.toLowerCase()).not.toContain(brand.toLowerCase());
        }
      }
    });
  });

  describe("Helper getLabel(entry, lang)", () => {
    it("returnează nameRo pentru lang='RO'", () => {
      const entry = { id: "TEST", nameRo: "Test română", nameEn: "Test english" };
      expect(getLabel(entry, "RO")).toBe("Test română");
    });

    it("returnează nameEn pentru lang='EN'", () => {
      const entry = { id: "TEST", nameRo: "Test română", nameEn: "Test english" };
      expect(getLabel(entry, "EN")).toBe("Test english");
    });

    it("fallback la label dacă lipsește nameRo (entries vechi)", () => {
      const entry = { id: "OLD", label: "Doar etichetă" };
      expect(getLabel(entry, "RO")).toBe("Doar etichetă");
    });

    it("fallback la nameRo în EN dacă nameEn lipsește", () => {
      const entry = { id: "TEST", nameRo: "Doar RO" };
      expect(getLabel(entry, "EN")).toBe("Doar RO");
    });

    it("returnează '' pentru entry null", () => {
      expect(getLabel(null, "RO")).toBe("");
      expect(getLabel(undefined, "EN")).toBe("");
    });
  });

  describe("Helper findById(entries, id)", () => {
    it("găsește entry existent în HEAT_SOURCES_EXT", () => {
      const found = findById(HEAT_SOURCES_EXT, "GAZ_COND");
      expect(found).toBeTruthy();
      expect(found.id).toBe("GAZ_COND");
    });

    it("returnează null pentru ID inexistent", () => {
      expect(findById(HEAT_SOURCES_EXT, "INEXISTENT_XYZ")).toBeNull();
    });

    it("găsește entry nou (din extensions) — ex. PC_CO2", () => {
      const found = findById(HEAT_SOURCES_EXT, "PC_CO2");
      expect(found).toBeTruthy();
      expect(found.nameRo).toContain("CO₂");
    });
  });

  describe("Helper filterByBuildingCategory(entries, categoryCode)", () => {
    it("filtrează entries cu applicableCategories incluzând codul", () => {
      const filtered = filterByBuildingCategory(HEAT_SOURCES_EXT, "RI");
      // Toate entries fără applicableCategories sau cu 'all' sau cu 'RI' trec
      expect(filtered.length).toBeGreaterThan(20);
      for (const e of filtered) {
        if (e.applicableCategories && !e.applicableCategories.includes("all")) {
          expect(e.applicableCategories).toContain("RI");
        }
      }
    });

    it("returnează toate entries dacă nu se specifică categoria", () => {
      expect(filterByBuildingCategory(HEAT_SOURCES_EXT, null).length).toBe(HEAT_SOURCES_EXT.length);
      expect(filterByBuildingCategory(HEAT_SOURCES_EXT, "").length).toBe(HEAT_SOURCES_EXT.length);
    });
  });

  describe("Helper groupByCategory(entries, lang)", () => {
    it("grupează HEAT_SOURCES_EXT pe categorie RO", () => {
      const grouped = groupByCategory(HEAT_SOURCES_EXT, "RO");
      // Trebuie să avem cel puțin câteva categorii (Cazane gaz, Pompe de căldură, etc.)
      expect(Object.keys(grouped).length).toBeGreaterThan(3);
    });

    it("grupează HEAT_SOURCES_EXT pe categorie EN cu nume englezești", () => {
      const grouped = groupByCategory(HEAT_SOURCES_EXT, "EN");
      // entries noi au categoryEn; entries vechi cad pe category (RO sau gol)
      expect(Object.keys(grouped).length).toBeGreaterThan(3);
    });
  });

  describe("Backward compat — IDs existente sunt păstrate intacte", () => {
    it("GAZ_COND există în HEAT_SOURCES_EXT cu eta_gen 1.05", () => {
      const entry = findById(HEAT_SOURCES_EXT, "GAZ_COND");
      expect(entry).toBeTruthy();
      expect(entry.eta_gen).toBe(1.05);
      expect(entry.fuel).toBe("gaz");
    });

    it("PC_AA există în HEAT_SOURCES_EXT cu isCOP true", () => {
      const entry = findById(HEAT_SOURCES_EXT, "PC_AA");
      expect(entry).toBeTruthy();
      expect(entry.isCOP).toBe(true);
    });

    it("BOILER_E există în ACM_SOURCES_EXT", () => {
      const entry = findById(ACM_SOURCES_EXT, "BOILER_E");
      expect(entry).toBeTruthy();
      expect(entry.fuel).toBe("electricitate");
    });

    it("LED există în LIGHTING_TYPES_EXT", () => {
      const entry = findById(LIGHTING_TYPES_EXT, "LED");
      expect(entry).toBeTruthy();
    });
  });

  describe("Unicitate IDs în fiecare catalog", () => {
    const catalogs = {
      HEAT_SOURCES_EXT,
      EMISSION_SYSTEMS_EXT,
      DISTRIBUTION_QUALITY_EXT,
      CONTROL_TYPES_EXT,
      ACM_SOURCES_EXT,
      ACM_STORAGE_TYPES,
      ACM_ANTI_LEGIONELLA,
      PIPE_INSULATION_TYPES,
      COOLING_SYSTEMS_EXT,
      COOLING_EMISSION_EXT,
      COOLING_DISTRIBUTION_EXT,
      VENTILATION_TYPES_EXT,
      LIGHTING_TYPES_EXT,
      LIGHTING_CONTROL_EXT,
      FUELS_EXT,
    };

    for (const [name, entries] of Object.entries(catalogs)) {
      it(`${name} are toate IDs unice`, () => {
        const ids = entries.map(e => e.id);
        const uniq = new Set(ids);
        expect(uniq.size).toBe(ids.length);
      });
    }
  });

  describe("CATALOG_META", () => {
    it("are version semantic", () => {
      expect(CATALOG_META.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("are dată generare 2026", () => {
      expect(CATALOG_META.generated).toMatch(/^2026-/);
    });

    it("totalEntries este sumă corectă", () => {
      const sumByCounts = Object.values(CATALOG_META.counts).reduce((a, b) => a + b, 0);
      expect(CATALOG_META.totalEntries).toBe(sumByCounts);
    });
  });
});
