/**
 * Tests Sprint D Task 6 — exif-gps utilities (pure helpers)
 */
import { describe, it, expect } from "vitest";
import {
  isInRomania,
  haversineMeters,
  findNearestLocality,
} from "../exif-gps.js";

describe("isInRomania", () => {
  it("acceptă coordonate în interiorul țării", () => {
    expect(isInRomania(46.77, 23.60)).toBe(true);  // Cluj-Napoca
    expect(isInRomania(44.43, 26.10)).toBe(true);  // București
    expect(isInRomania(47.16, 27.59)).toBe(true);  // Iași
    expect(isInRomania(43.80, 28.58)).toBe(true);  // Mangalia
  });

  it("respinge coordonate clar în afara României", () => {
    expect(isInRomania(48.85, 2.35)).toBe(false);  // Paris
    expect(isInRomania(40.41, -3.70)).toBe(false); // Madrid
    expect(isInRomania(0, 0)).toBe(false);
    expect(isInRomania(-30, 130)).toBe(false);     // Australia
  });

  it("respinge tipuri non-numerice", () => {
    expect(isInRomania(null, null)).toBe(false);
    expect(isInRomania("46", "23")).toBe(false);
    expect(isInRomania(NaN, 23)).toBe(false);
  });
});

describe("haversineMeters", () => {
  it("distanța de la un punct la el însuși = 0", () => {
    expect(haversineMeters(46.77, 23.60, 46.77, 23.60)).toBe(0);
  });

  it("Cluj-Napoca → București ≈ 322 km (±5 km toleranță)", () => {
    const d = haversineMeters(46.77, 23.60, 44.43, 26.10);
    expect(d).toBeGreaterThan(317000);
    expect(d).toBeLessThan(327000);
  });

  it("0.001° lat ≈ 111 m", () => {
    const d = haversineMeters(46.77, 23.60, 46.771, 23.60);
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(115);
  });
});

describe("findNearestLocality", () => {
  const climateDB = [
    { name: "Cluj-Napoca", zone: "III", lat: 46.77, lon: 23.60 },
    { name: "București", zone: "II", lat: 44.43, lon: 26.10 },
    { name: "Iași", zone: "II", lat: 47.16, lon: 27.59 },
    { name: "Constanța", zone: "II", lat: 44.18, lon: 28.65 },
    { name: "Sibiu", zone: "III", lat: 45.80, lon: 24.15 },
  ];

  it("găsește Cluj-Napoca pentru coords aproape de el", () => {
    const r = findNearestLocality(46.78, 23.61, climateDB);
    expect(r.name).toBe("Cluj-Napoca");
    expect(r._distanceMeters).toBeLessThan(2000);
  });

  it("găsește București pentru coords în Muntenia", () => {
    const r = findNearestLocality(44.50, 26.00, climateDB);
    expect(r.name).toBe("București");
  });

  it("returnează null pentru DB gol", () => {
    expect(findNearestLocality(46, 23, [])).toBe(null);
    expect(findNearestLocality(46, 23, null)).toBe(null);
  });

  it("ignoră entries fără lat/lon", () => {
    const partial = [
      { name: "Fără coords", zone: "X" },
      { name: "Cu coords", zone: "Y", lat: 45, lon: 25 },
    ];
    const r = findNearestLocality(45, 25, partial);
    expect(r.name).toBe("Cu coords");
  });

  it("include _distanceMeters în rezultat", () => {
    const r = findNearestLocality(46.77, 23.60, climateDB);
    expect(r._distanceMeters).toBeDefined();
    expect(typeof r._distanceMeters).toBe("number");
    expect(r._distanceMeters).toBeGreaterThanOrEqual(0);
  });
});
