import { describe, it, expect } from "vitest";
import {
  CITY_COORDINATES,
  COUNTY_CENTROIDS,
  RO_CENTROID,
  getCityCoordinates,
  getCityLongitude,
} from "../city-coordinates.js";

describe("Etapa 2 — city coordinates (BUG-6 fix, 19 apr 2026)", () => {
  describe("CITY_COORDINATES catalog", () => {
    it("conține minim 100 orașe RO (extins de la 60)", () => {
      const count = Object.keys(CITY_COORDINATES).length;
      expect(count).toBeGreaterThanOrEqual(100);
    });

    it("orașele majore au coordonate corecte", () => {
      expect(CITY_COORDINATES["București"]).toEqual(
        expect.objectContaining({ lat: 44.43, lng: 26.10, county: "B" })
      );
      expect(CITY_COORDINATES["Cluj-Napoca"]).toEqual(
        expect.objectContaining({ lat: 46.77, lng: 23.60, county: "CJ" })
      );
      expect(CITY_COORDINATES["Constanța"]).toEqual(
        expect.objectContaining({ lat: 44.18, lng: 28.65, county: "CT" })
      );
    });

    it("toate intrările au lat și lng numerice valide", () => {
      for (const [name, c] of Object.entries(CITY_COORDINATES)) {
        expect(typeof c.lat).toBe("number");
        expect(typeof c.lng).toBe("number");
        // RO bounding box: lat 43.6-48.3, lng 20.3-29.7
        expect(c.lat).toBeGreaterThan(43);
        expect(c.lat).toBeLessThan(49);
        expect(c.lng).toBeGreaterThan(20);
        expect(c.lng).toBeLessThan(30);
      }
    });

    it("fiecare oraș are cod județ valid (2 chars sau 1 pentru București)", () => {
      for (const [name, c] of Object.entries(CITY_COORDINATES)) {
        expect(c.county).toMatch(/^[A-Z]{1,2}$/);
      }
    });
  });

  describe("COUNTY_CENTROIDS", () => {
    it("conține toate cele 41 județe + B (București)", () => {
      const count = Object.keys(COUNTY_CENTROIDS).length;
      expect(count).toBeGreaterThanOrEqual(42);
    });

    it("toate centroidele sunt în bounding box RO", () => {
      for (const [code, c] of Object.entries(COUNTY_CENTROIDS)) {
        expect(c.lat).toBeGreaterThan(43);
        expect(c.lat).toBeLessThan(49);
        expect(c.lng).toBeGreaterThan(20);
        expect(c.lng).toBeLessThan(30);
      }
    });
  });

  describe("getCityCoordinates lookup", () => {
    it("match exact pentru oraș cunoscut → source='city'", () => {
      const r = getCityCoordinates("Cluj-Napoca");
      expect(r.source).toBe("city");
      expect(r.lat).toBe(46.77);
      expect(r.lng).toBe(23.60);
    });

    it("match case-insensitive (CLUJ-NAPOCA)", () => {
      const r = getCityCoordinates("CLUJ-NAPOCA");
      expect(r.source).toBe("city");
      expect(r.lat).toBe(46.77);
    });

    it("match fără diacritice (Sighisoara → Sighișoara)", () => {
      const r = getCityCoordinates("sighisoara");
      expect(r.source).toBe("city");
      expect(r.lng).toBeCloseTo(24.79, 2);
    });

    it("oraș necunoscut + cod județ → fallback centroid județ", () => {
      const r = getCityCoordinates("Sat Inexistent X", "BV");
      expect(r.source).toBe("county");
      expect(r.lat).toBe(45.80);
      expect(r.lng).toBe(25.30);
    });

    it("oraș necunoscut fără cod județ → fallback RO_CENTROID", () => {
      const r = getCityCoordinates("Localitate Imaginară", null);
      expect(r.source).toBe("ro");
      expect(r.lat).toBe(RO_CENTROID.lat);
      expect(r.lng).toBe(RO_CENTROID.lng);
    });

    it("string gol → fallback RO_CENTROID", () => {
      const r = getCityCoordinates("", "");
      expect(r.source).toBe("ro");
    });

    it("null/undefined → fallback RO_CENTROID", () => {
      expect(getCityCoordinates(null).source).toBe("ro");
      expect(getCityCoordinates(undefined).source).toBe("ro");
    });

    it("cod județ inexistent + oraș necunoscut → RO_CENTROID", () => {
      const r = getCityCoordinates("Necunoscut", "ZZ");
      expect(r.source).toBe("ro");
    });

    it("cod județ în lowercase e tolerat", () => {
      const r = getCityCoordinates("Inexistent", "bv");
      expect(r.source).toBe("county");
      expect(r.lat).toBe(45.80);
    });
  });

  describe("getCityLongitude — compat layer cu vechiul CITY_LNG", () => {
    it("returnează doar longitude pentru oraș cunoscut", () => {
      expect(getCityLongitude("București")).toBe(26.10);
      expect(getCityLongitude("Constanța")).toBe(28.65);
    });

    it("returnează longitude din centroid județ pentru oraș necunoscut", () => {
      expect(getCityLongitude("Necunoscut", "TM")).toBe(21.30);
    });

    it("returnează longitude RO_CENTROID pentru oraș necunoscut + județ necunoscut", () => {
      expect(getCityLongitude("Necunoscut")).toBe(RO_CENTROID.lng);
    });
  });

  describe("Regression: orașe care înainte erau 25.0 generic", () => {
    // Orașe care NU erau în vechiul CITY_LNG inline (60 orașe) și primeau fallback 25.0
    const newCities = ["Aiud", "Beiuș", "Borșa", "Brad", "Mediaș", "Sebeș", "Făgăraș", "Sinaia"];

    it.each(newCities)("oraș nou '%s' are coordonate corecte (nu 25.0 generic)", (city) => {
      const r = getCityCoordinates(city);
      expect(r.source).toBe("city");
      expect(r.lng).not.toBe(25.0);
    });
  });
});
