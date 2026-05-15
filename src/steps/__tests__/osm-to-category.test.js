/**
 * Teste pentru Sprint Smart Input 2026 (1.4) — OSM++ Overpass helpers
 *
 * Acoperă maparea OSM tag → categorie Zephren + derivările floors/Au.
 * Helpers sunt exportate din Step1Identification.jsx pentru testabilitate.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  osmTagToCategory,
  levelsToFloorsRegime,
  estimateAreaUseful,
} from "../Step1Identification.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// osmTagToCategory
// ─────────────────────────────────────────────────────────────────────────────

describe("osmTagToCategory — Sprint 1.4", () => {
  describe("Rezidențial", () => {
    it("apartments → RC indiferent de nr. etaje", () => {
      expect(osmTagToCategory("apartments", 2)).toBe("RC");
      expect(osmTagToCategory("apartments", 8)).toBe("RC");
    });

    it("residential + ≥3 niveluri → RC (bloc)", () => {
      expect(osmTagToCategory("residential", 3)).toBe("RC");
      expect(osmTagToCategory("residential", 10)).toBe("RC");
    });

    it("residential + <3 niveluri → RI (casă)", () => {
      expect(osmTagToCategory("residential", 1)).toBe("RI");
      expect(osmTagToCategory("residential", 2)).toBe("RI");
    });

    it("house/detached/semidetached_house/bungalow/terrace → RI", () => {
      expect(osmTagToCategory("house", 2)).toBe("RI");
      expect(osmTagToCategory("detached", 1)).toBe("RI");
      expect(osmTagToCategory("semidetached_house", 2)).toBe("RI");
      expect(osmTagToCategory("bungalow", 1)).toBe("RI");
      expect(osmTagToCategory("terrace", 2)).toBe("RI");
    });

    it("yes (generic) → bazat pe niveluri", () => {
      expect(osmTagToCategory("yes", 1)).toBe("RI");
      expect(osmTagToCategory("yes", 5)).toBe("RC");
    });
  });

  describe("Educație", () => {
    it("școală/grădiniță/universitate/cămin", () => {
      expect(osmTagToCategory("school", null)).toBe("SC");
      expect(osmTagToCategory("kindergarten", null)).toBe("GR");
      expect(osmTagToCategory("university", null)).toBe("UN");
      expect(osmTagToCategory("college", null)).toBe("UN");
      expect(osmTagToCategory("dormitory", null)).toBe("CP");
    });
  });

  describe("Birouri & administrație", () => {
    it("office/commercial → BI", () => {
      expect(osmTagToCategory("office", null)).toBe("BI");
      expect(osmTagToCategory("commercial", null)).toBe("BI");
    });

    it("government/civic/public/courthouse → AD", () => {
      expect(osmTagToCategory("government", null)).toBe("AD");
      expect(osmTagToCategory("courthouse", null)).toBe("AD");
    });

    it("bank → BA_OFF", () => {
      expect(osmTagToCategory("bank", null)).toBe("BA_OFF");
    });
  });

  describe("Sănătate", () => {
    it("hospital → SPA_H, clinic → CL, nursing_home → AS_SOC", () => {
      expect(osmTagToCategory("hospital", null)).toBe("SPA_H");
      expect(osmTagToCategory("clinic", null)).toBe("CL");
      expect(osmTagToCategory("nursing_home", null)).toBe("AS_SOC");
    });
  });

  describe("Cazare & alimentație", () => {
    it("hotel/hostel/restaurant", () => {
      expect(osmTagToCategory("hotel", null)).toBe("HC");
      expect(osmTagToCategory("hostel", null)).toBe("HOSTEL");
      expect(osmTagToCategory("restaurant", null)).toBe("REST");
    });

    it("supermarket/retail/mall", () => {
      expect(osmTagToCategory("supermarket", null)).toBe("SUPER");
      expect(osmTagToCategory("retail", null)).toBe("MAG");
      expect(osmTagToCategory("mall", null)).toBe("MALL");
    });
  });

  describe("Industrial & sport", () => {
    it("sports_centre/stadium → SP", () => {
      expect(osmTagToCategory("sports_centre", null)).toBe("SP");
      expect(osmTagToCategory("stadium", null)).toBe("SP");
    });

    it("industrial/warehouse → AL", () => {
      expect(osmTagToCategory("industrial", null)).toBe("AL");
      expect(osmTagToCategory("warehouse", null)).toBe("AL");
    });
  });

  describe("Edge cases", () => {
    it("null/empty/undefined → null", () => {
      expect(osmTagToCategory(null, 5)).toBeNull();
      expect(osmTagToCategory("", 5)).toBeNull();
      expect(osmTagToCategory(undefined, 5)).toBeNull();
    });

    it("tag necunoscut → null (nu inventăm)", () => {
      expect(osmTagToCategory("greenhouse", null)).toBeNull();
      expect(osmTagToCategory("barn", null)).toBeNull();
      expect(osmTagToCategory("random_string", null)).toBeNull();
    });

    it("case-insensitive: HOTEL → HC", () => {
      expect(osmTagToCategory("HOTEL", null)).toBe("HC");
      expect(osmTagToCategory("Hospital", null)).toBe("SPA_H");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// levelsToFloorsRegime
// ─────────────────────────────────────────────────────────────────────────────

describe("levelsToFloorsRegime — Sprint 1.4", () => {
  it("1 nivel → 'P'", () => {
    expect(levelsToFloorsRegime(1)).toBe("P");
  });

  it("2 niveluri → 'P+1E'", () => {
    expect(levelsToFloorsRegime(2)).toBe("P+1E");
  });

  it("5 niveluri → 'P+4E'", () => {
    expect(levelsToFloorsRegime(5)).toBe("P+4E");
  });

  it("10 niveluri → 'P+9E'", () => {
    expect(levelsToFloorsRegime(10)).toBe("P+9E");
  });

  it("string '4' parsed correct", () => {
    expect(levelsToFloorsRegime("4")).toBe("P+3E");
  });

  it("0/null/undefined → null", () => {
    expect(levelsToFloorsRegime(0)).toBeNull();
    expect(levelsToFloorsRegime(null)).toBeNull();
    expect(levelsToFloorsRegime(undefined)).toBeNull();
  });

  it("input invalid → null", () => {
    expect(levelsToFloorsRegime("abc")).toBeNull();
    expect(levelsToFloorsRegime(-3)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// estimateAreaUseful
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateAreaUseful — Sprint 1.4", () => {
  it("100 m² × 5 etaje × 0.85 = 425 m²", () => {
    expect(estimateAreaUseful(100, 5)).toBe(425);
  });

  it("200 m² × 2 etaje × 0.85 = 340 m²", () => {
    expect(estimateAreaUseful(200, 2)).toBe(340);
  });

  it("rotunjire corectă (Math.round)", () => {
    // 150 × 3 × 0.85 = 382.5 → 383 (Math.round half-up; deși JS Math.round folosește half-to-even)
    const r = estimateAreaUseful(150, 3);
    expect(r).toBeGreaterThanOrEqual(382);
    expect(r).toBeLessThanOrEqual(383);
  });

  it("footprint <10 m² → null (suspicios)", () => {
    expect(estimateAreaUseful(5, 2)).toBeNull();
    expect(estimateAreaUseful(0, 2)).toBeNull();
  });

  it("levels <1 → null", () => {
    expect(estimateAreaUseful(100, 0)).toBeNull();
    expect(estimateAreaUseful(100, null)).toBeNull();
  });

  it("ambele null → null", () => {
    expect(estimateAreaUseful(null, null)).toBeNull();
  });
});
