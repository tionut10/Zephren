import { describe, it, expect } from "vitest";
import {
  HORIZON_PROFILES,
  horizonElevationAtAzimuth,
  isSunBlocked,
  directBeamVisibility,
  skyViewFactor,
} from "../horizon.js";

describe("Sprint 20: horizon masking (SR EN ISO 52010-1 §6.5.1)", () => {
  describe("HORIZON_PROFILES — presetări standard", () => {
    it("open_rural are elevații mici (<6°)", () => {
      const vals = Object.values(HORIZON_PROFILES.open_rural.elevations);
      vals.forEach(v => expect(v).toBeLessThanOrEqual(5));
    });

    it("urban_dense are elevații mari (>20°)", () => {
      const vals = Object.values(HORIZON_PROFILES.urban_dense.elevations);
      const max = Math.max(...vals);
      expect(max).toBeGreaterThanOrEqual(30);
    });

    it("no_obstruction are toate 0", () => {
      const vals = Object.values(HORIZON_PROFILES.no_obstruction.elevations);
      vals.forEach(v => expect(v).toBe(0));
    });
  });

  describe("horizonElevationAtAzimuth — interpolare", () => {
    const elev = { S: 10, SV: 20, V: 30, NV: 40, N: 50, NE: 40, E: 30, SE: 20 };

    it("la azimut 0 (S) → 10", () => {
      expect(horizonElevationAtAzimuth(0, elev)).toBe(10);
    });

    it("la azimut 45 (SV) → 20", () => {
      expect(horizonElevationAtAzimuth(45, elev)).toBe(20);
    });

    it("între S și SV interpolează liniar", () => {
      const v = horizonElevationAtAzimuth(22.5, elev);
      expect(v).toBeCloseTo(15, 1); // media între 10 și 20
    });

    it("wrap around (170° vs -170°)", () => {
      // Aproape de N=180 (sau -180)
      const v1 = horizonElevationAtAzimuth(170, elev);
      const v2 = horizonElevationAtAzimuth(-170, elev);
      expect(Math.abs(v1 - v2)).toBeLessThan(10);
    });
  });

  describe("isSunBlocked", () => {
    it("soare sub orizont geografic → blocat", () => {
      expect(isSunBlocked(-5, 0, HORIZON_PROFILES.open_rural.elevations)).toBe(true);
    });

    it("soare peste orizont urban dens → blocat dacă altitudine < elev", () => {
      // Urban dens S=25°; soare la altitudine 20° + azimut 0 (S) → blocat
      expect(isSunBlocked(20, 0, HORIZON_PROFILES.urban_dense.elevations)).toBe(true);
    });

    it("soare la altitudine 45° peste urban dens (S) → vizibil", () => {
      expect(isSunBlocked(45, 0, HORIZON_PROFILES.urban_dense.elevations)).toBe(false);
    });
  });

  describe("directBeamVisibility", () => {
    it("soare sub orizont geografic → 0", () => {
      expect(directBeamVisibility(-1, 0, "open_rural")).toBe(0);
    });

    it("soare peste orizont + 2° → 1", () => {
      // urban_medium S=15°; soare la 17° + 0° az → 1
      expect(directBeamVisibility(18, 0, "urban_medium")).toBe(1);
    });

    it("soare exact la orizont → 0", () => {
      expect(directBeamVisibility(15, 0, "urban_medium")).toBe(0);
    });

    it("interpolare 0-1 pe ±1°", () => {
      const v = directBeamVisibility(15.5, 0, "urban_medium");
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    });
  });

  describe("skyViewFactor", () => {
    it("no_obstruction → svf = 1", () => {
      expect(skyViewFactor("no_obstruction")).toBe(1);
    });

    it("open_rural → svf ≈ 0,99", () => {
      expect(skyViewFactor("open_rural")).toBeGreaterThan(0.98);
    });

    it("urban_dense → svf semnificativ redus (<0,75)", () => {
      expect(skyViewFactor("urban_dense")).toBeLessThan(0.75);
    });

    it("urban_dense svf < suburban svf < rural svf", () => {
      const rural = skyViewFactor("open_rural");
      const suburban = skyViewFactor("suburban");
      const dense = skyViewFactor("urban_dense");
      expect(rural).toBeGreaterThan(suburban);
      expect(suburban).toBeGreaterThan(dense);
    });
  });
});
