import { describe, it, expect } from "vitest";
// Test doar funcțiile de fallback offline (nu testăm API-ul extern)
// Importăm modulul și verificăm că fallback-ul funcționează la eroare fetch

describe("PVGIS fallback offline", () => {
  it("fetchPVGISProduction cu URL invalid → fallback offline", async () => {
    // Salvăm fetch-ul original și îl mock-uim
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("Network error"));

    try {
      const { fetchPVGISProduction } = await import("../pvgis.js");
      const r = await fetchPVGISProduction(44.4, 26.1, 5, 35, 0, "III");
      expect(r).not.toBeNull();
      expect(r.offline).toBe(true);
      expect(r.E_annual).toBeGreaterThan(0);
      expect(r.E_annual).toBeLessThan(10000); // 5 kWp × ~1120 kWh/kWp
      expect(r.monthly).toHaveLength(12);
      expect(r.source).toContain("Offline");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetchPVGISClimate cu URL invalid → fallback offline", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("Network error"));

    try {
      const { fetchPVGISClimate } = await import("../pvgis.js");
      const r = await fetchPVGISClimate(44.4, 26.1, { climateZone: "II" });
      expect(r).not.toBeNull();
      expect(r.offline).toBe(true);
      expect(r.annual_Gh).toBeGreaterThan(1000);
      expect(r.monthly).toHaveLength(12);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
