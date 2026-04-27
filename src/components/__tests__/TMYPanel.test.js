import { describe, it, expect } from "vitest";
import { buildTMYCSV, buildTMYJSON } from "../TMYPanel.jsx";

/**
 * Sprint B Task 1 — Teste export CSV/JSON pentru date TMY
 *
 * Acoperă: header CSV cu metadate, structură 12×24 = 288 rânduri,
 * formatare zecimală 2 zecimale, JSON serializare corectă, edge cases.
 */

describe("buildTMYCSV — export CSV cu metadate header", () => {
  const monthlyHourlyMock = {
    T:   Array.from({ length: 12 }, (_, m) => Array(24).fill(10 + m)),
    GHI: Array.from({ length: 12 }, () => Array(24).fill(200)),
    RH:  Array.from({ length: 12 }, () => Array(24).fill(65)),
    WS:  Array.from({ length: 12 }, () => Array(24).fill(2.5)),
  };

  const tmyMockComplete = {
    monthlyHourly: monthlyHourlyMock,
    metadata: {
      source: "PVGIS 5.2",
      lat: 44.4268,
      lon: 26.1025,
      elevation: 88,
      periods: "2010-2020",
      isLunarApprox: false,
    },
  };

  it("returnează null pentru date lipsă", () => {
    expect(buildTMYCSV(null)).toBeNull();
    expect(buildTMYCSV({})).toBeNull();
    expect(buildTMYCSV({ metadata: {} })).toBeNull();
  });

  it("generează 288 rânduri de date (12 luni × 24 ore) plus header", () => {
    const csv = buildTMYCSV(tmyMockComplete);
    const lines = csv.split("\n");
    const dataLines = lines.filter((l) => /^\d+,\d+,/.test(l));
    expect(dataLines).toHaveLength(288);
  });

  it("include header CSV standard cu coloanele corecte", () => {
    const csv = buildTMYCSV(tmyMockComplete);
    expect(csv).toContain("month,hour,T_C,GHI_Wm2,RH_pct,wind_ms");
  });

  it("include metadata sursă, coordonate și altitudine ca comentarii (#)", () => {
    const csv = buildTMYCSV(tmyMockComplete);
    expect(csv).toContain("# Source: PVGIS 5.2");
    expect(csv).toContain("# Coordinates: 44.4268°N, 26.1025°E");
    expect(csv).toContain("# Elevation: 88 m");
    expect(csv).toContain("# Period: 2010-2020");
  });

  it("avertizează în comentariu dacă datele sunt aproximare lunară", () => {
    const tmyApprox = {
      monthlyHourly: monthlyHourlyMock,
      metadata: { source: "EPW", isLunarApprox: true },
    };
    const csv = buildTMYCSV(tmyApprox);
    expect(csv).toMatch(/approxim/i);
  });

  it("formatează valorile cu 2 zecimale", () => {
    const csv = buildTMYCSV(tmyMockComplete);
    // Prima linie de date: month=1, hour=0, T=10, GHI=200, RH=65, WS=2.5
    expect(csv).toContain("1,0,10.00,200.00,65.00,2.50");
  });

  it("tratează valori lipsă (null/undefined) ca string gol", () => {
    const tmyWithNulls = {
      monthlyHourly: {
        T:   Array.from({ length: 12 }, () => Array(24).fill(null)),
        GHI: Array.from({ length: 12 }, () => Array(24).fill(undefined)),
        RH:  Array.from({ length: 12 }, () => Array(24).fill(50)),
        WS:  Array.from({ length: 12 }, () => Array(24).fill(NaN)),
      },
      metadata: {},
    };
    const csv = buildTMYCSV(tmyWithNulls);
    // Verificăm că valorile null/NaN devin string gol între virgule
    expect(csv).toContain("1,0,,,50.00,");
  });

  it("include referință standard SR EN ISO 15927-4:2007", () => {
    const csv = buildTMYCSV(tmyMockComplete);
    expect(csv).toContain("SR EN ISO 15927-4:2007");
  });
});

describe("buildTMYJSON — export JSON complet", () => {
  it("returnează null pentru date lipsă", () => {
    expect(buildTMYJSON(null)).toBeNull();
    expect(buildTMYJSON(undefined)).toBeNull();
  });

  it("produce JSON valid cu metadata + monthlyHourly", () => {
    const tmy = {
      monthlyHourly: { T: [[20]], GHI: [[500]], RH: [[60]], WS: [[3]] },
      metadata: { source: "TEST", lat: 45, lon: 25 },
      hourly: [],
    };
    const json = buildTMYJSON(tmy);
    const parsed = JSON.parse(json);
    expect(parsed.metadata.source).toBe("TEST");
    expect(parsed.metadata.lat).toBe(45);
    expect(parsed.monthlyHourly.T).toEqual([[20]]);
    expect(parsed.standard).toMatch(/15927-4/);
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("include hourly array dacă PVGIS real disponibil (8760 valori)", () => {
    const hourly8760 = Array.from({ length: 8760 }, (_, i) => ({
      hour: i,
      T: 15 + Math.sin(i / 1000) * 10,
    }));
    const tmy = {
      monthlyHourly: { T: [], GHI: [], RH: [], WS: [] },
      metadata: { source: "PVGIS 5.2" },
      hourly: hourly8760,
    };
    const json = buildTMYJSON(tmy);
    const parsed = JSON.parse(json);
    expect(parsed.hourly).toHaveLength(8760);
  });
});
