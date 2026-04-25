/**
 * Tests Sprint D Task 5 — overpass-buildings (helpers puri)
 */
import { describe, it, expect } from "vitest";
import {
  polygonCentroid,
  haversineMeters,
  bearingDeg,
  azimuthToOrientation,
  parseHeight,
  computeShadingFromBuildings,
} from "../overpass-buildings.js";

describe("polygonCentroid", () => {
  it("centroid pentru pătrat unitar", () => {
    const c = polygonCentroid([
      { lat: 0, lon: 0 }, { lat: 0, lon: 1 },
      { lat: 1, lon: 1 }, { lat: 1, lon: 0 },
    ]);
    expect(c.lat).toBe(0.5);
    expect(c.lon).toBe(0.5);
  });

  it("returnează null pentru array gol", () => {
    expect(polygonCentroid([])).toBe(null);
    expect(polygonCentroid(null)).toBe(null);
  });
});

describe("haversineMeters (overpass)", () => {
  it("0 pentru același punct", () => {
    expect(haversineMeters(45, 25, 45, 25)).toBe(0);
  });
  it("distanță corectă ~111 km pentru 1° latitudine", () => {
    const d = haversineMeters(45, 25, 46, 25);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe("bearingDeg", () => {
  it("0° pentru N", () => {
    const b = bearingDeg(45, 25, 46, 25);
    // Acceptă atât 0° cât și 359.x° (datorită rotunjirii modulo 360)
    expect(b < 1 || b > 359).toBe(true);
  });
  it("90° pentru E", () => {
    const b = bearingDeg(45, 25, 45, 26);
    expect(b).toBeGreaterThan(89);
    expect(b).toBeLessThan(91);
  });
  it("180° pentru S", () => {
    const b = bearingDeg(45, 25, 44, 25);
    expect(b).toBeGreaterThan(179);
    expect(b).toBeLessThan(181);
  });
  it("270° pentru V", () => {
    const b = bearingDeg(45, 25, 45, 24);
    expect(b).toBeGreaterThan(269);
    expect(b).toBeLessThan(271);
  });
});

describe("azimuthToOrientation", () => {
  it("0° (N) → N", () => {
    expect(azimuthToOrientation(0)).toBe("N");
    expect(azimuthToOrientation(359)).toBe("N");
  });
  it("90° → E", () => {
    expect(azimuthToOrientation(90)).toBe("E");
  });
  it("180° → S", () => {
    expect(azimuthToOrientation(180)).toBe("S");
  });
  it("270° → V", () => {
    expect(azimuthToOrientation(270)).toBe("V");
  });
  it("45° → NE", () => {
    expect(azimuthToOrientation(45)).toBe("NE");
  });
  it("225° → SV", () => {
    expect(azimuthToOrientation(225)).toBe("SV");
  });
});

describe("parseHeight", () => {
  it("tag height ca număr simplu", () => {
    expect(parseHeight({ height: "12" })).toBe(12);
    expect(parseHeight({ height: "12.5" })).toBe(12.5);
  });
  it("tag height cu unit (m, metres)", () => {
    expect(parseHeight({ height: "15 m" })).toBe(15);
    expect(parseHeight({ height: "20 metres" })).toBe(20);
  });
  it("tag building:levels × 3 m/etaj", () => {
    expect(parseHeight({ "building:levels": "3" })).toBe(9);
    expect(parseHeight({ "building:levels": "10" })).toBe(30);
  });
  it("preferă height față de levels când ambele există", () => {
    expect(parseHeight({ height: "8", "building:levels": "5" })).toBe(8);
  });
  it("returnează null pentru tags lipsă/invalide", () => {
    expect(parseHeight({})).toBe(null);
    expect(parseHeight(null)).toBe(null);
    expect(parseHeight({ height: "abc" })).toBe(null);
    expect(parseHeight({ height: "999999" })).toBe(null); // exceeds 500m sanity
  });
});

describe("computeShadingFromBuildings", () => {
  // Mock pentru calcBuildingShadingFn — întotdeauna returnează un rezultat predictibil
  const mockShadingFn = ({ adjacentBuildingHeight, adjacentBuildingDistance }) => ({
    solarGain_reduction_pct: Math.min(80, Math.round((adjacentBuildingHeight / Math.max(1, adjacentBuildingDistance)) * 50)),
    shadingFactor_month: Array(12).fill(0.3),
  });

  it("returnează 8 orientări (S, SE, E, NE, N, NV, V, SV)", () => {
    const result = computeShadingFromBuildings(
      { lat: 45, lon: 25, height: 10 },
      [],
      mockShadingFn
    );
    expect(Object.keys(result).sort()).toEqual(["E", "N", "NE", "NV", "S", "SE", "SV", "V"]);
  });

  it("toate orientările sunt fără vecini când lista e goală", () => {
    const result = computeShadingFromBuildings(
      { lat: 45, lon: 25, height: 10 },
      [],
      mockShadingFn
    );
    Object.values(result).forEach(r => {
      expect(r.hasNeighbor).toBe(false);
      expect(r.shadingFactor).toBe(0);
    });
  });

  it("identifică vecinul dominant pe orientarea S", () => {
    const neighbors = [
      { id: 1, height: 20, distance: 15, orientation: "S", name: "Bloc S" },
    ];
    const result = computeShadingFromBuildings(
      { lat: 45, lon: 25, height: 10 },
      neighbors,
      mockShadingFn
    );
    expect(result.S.hasNeighbor).toBe(true);
    expect(result.S.neighbor.id).toBe(1);
    expect(result.S.shadingFactor).toBeGreaterThan(0);
  });

  it("alege vecinul cu scor cel mai mare (înalt + apropiat)", () => {
    const neighbors = [
      { id: 1, height: 5, distance: 10, orientation: "E", name: "Mic apropiat" },
      { id: 2, height: 30, distance: 20, orientation: "E", name: "Mare apropiat" }, // scor 30 - 20/5 = 26
      { id: 3, height: 50, distance: 50, orientation: "E", name: "Foarte mare departe" }, // scor 50 - 50/5 = 40
    ];
    const result = computeShadingFromBuildings(
      { lat: 45, lon: 25, height: 10 },
      neighbors,
      mockShadingFn
    );
    expect(result.E.neighbor.id).toBe(3);
  });
});
