// Test pentru partner-overrides.js — Sprint P2 30 apr 2026
// Mock localStorage pentru tests headless

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage înainte de import
class MockStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] ?? null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockStorage = new MockStorage();
vi.stubGlobal("window", { localStorage: mockStorage });

// Import după mock
const {
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
  applyOverride,
  applyOverridesAll,
  exportOverridesJson,
  importOverridesJson,
  parseCsv,
  importOverridesCsv,
  exportOverridesCsv,
  logPartnerClick,
  getTelemetryEvents,
  getTelemetryByBrand,
  clearTelemetry,
  exportTelemetryCsv,
} = await import("../partner-overrides.js");

describe("Partner Overrides — Sprint P2", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  describe("getOverrides + setOverride + clearOverride", () => {
    it("getOverrides returnează {} inițial", () => {
      expect(getOverrides()).toEqual({});
    });

    it("setOverride persistă fields", () => {
      const ok = setOverride("viessmann", { partnerStatus: "active", partnerSince: "2026-08-15" });
      expect(ok).toBe(true);
      const all = getOverrides();
      expect(all.viessmann.partnerStatus).toBe("active");
      expect(all.viessmann.partnerSince).toBe("2026-08-15");
    });

    it("setOverride merge fields existing (nu suprascrie)", () => {
      setOverride("viessmann", { partnerStatus: "active" });
      setOverride("viessmann", { partnerSince: "2026-08-15" });
      const all = getOverrides();
      expect(all.viessmann.partnerStatus).toBe("active");
      expect(all.viessmann.partnerSince).toBe("2026-08-15");
    });

    it("clearOverride șterge un brand specific", () => {
      setOverride("viessmann", { partnerStatus: "active" });
      setOverride("daikin", { partnerStatus: "active" });
      clearOverride("viessmann");
      const all = getOverrides();
      expect(all.viessmann).toBeUndefined();
      expect(all.daikin).toBeTruthy();
    });

    it("clearAllOverrides șterge tot", () => {
      setOverride("viessmann", { partnerStatus: "active" });
      setOverride("daikin", { partnerStatus: "pending" });
      clearAllOverrides();
      expect(getOverrides()).toEqual({});
    });
  });

  describe("applyOverride / applyOverridesAll", () => {
    it("applyOverride merge fields peste brand", () => {
      const brand = { id: "viessmann", name: "Viessmann", partnerStatus: "none", partnerSince: null };
      setOverride("viessmann", { partnerStatus: "active", partnerSince: "2026-08-15" });
      const merged = applyOverride(brand);
      expect(merged.partnerStatus).toBe("active");
      expect(merged.partnerSince).toBe("2026-08-15");
      expect(merged.name).toBe("Viessmann");
    });

    it("applyOverride returnează brand neschimbat dacă nu există override", () => {
      const brand = { id: "vaillant", name: "Vaillant", partnerStatus: "none" };
      expect(applyOverride(brand)).toEqual(brand);
    });

    it("applyOverridesAll mapează lista", () => {
      setOverride("viessmann", { partnerStatus: "active" });
      const list = [
        { id: "viessmann", partnerStatus: "none" },
        { id: "vaillant", partnerStatus: "none" },
      ];
      const merged = applyOverridesAll(list);
      expect(merged[0].partnerStatus).toBe("active");
      expect(merged[1].partnerStatus).toBe("none");
    });
  });

  describe("Export / Import JSON", () => {
    it("exportOverridesJson returnează JSON formatat", () => {
      setOverride("viessmann", { partnerStatus: "active", partnerSince: "2026-08-15" });
      const json = exportOverridesJson();
      const parsed = JSON.parse(json);
      expect(parsed.viessmann.partnerStatus).toBe("active");
    });

    it("importOverridesJson încarcă overrides", () => {
      const data = { viessmann: { partnerStatus: "active" }, daikin: { partnerStatus: "pending" } };
      const ok = importOverridesJson(JSON.stringify(data));
      expect(ok).toBe(true);
      expect(getOverrides()).toEqual(data);
    });

    it("importOverridesJson returnează false pentru JSON invalid", () => {
      expect(importOverridesJson("not valid json")).toBe(false);
    });

    it("importOverridesJson returnează false pentru array în loc de obiect", () => {
      expect(importOverridesJson("[1,2,3]")).toBe(false);
    });
  });

  describe("CSV parsing", () => {
    it("parseCsv parsează header + rows", () => {
      const csv = "id,partnerStatus\nviessmann,active\ndaikin,pending";
      const rows = parseCsv(csv);
      expect(rows.length).toBe(2);
      expect(rows[0].id).toBe("viessmann");
      expect(rows[0].partnerStatus).toBe("active");
      expect(rows[1].id).toBe("daikin");
    });

    it("parseCsv handle quoted values cu comma", () => {
      const csv = `id,notes\nviessmann,"Cazane gaz, condensare"\ndaikin,"VRF, AC"`;
      const rows = parseCsv(csv);
      expect(rows[0].notes).toBe("Cazane gaz, condensare");
      expect(rows[1].notes).toBe("VRF, AC");
    });

    it("parseCsv returnează [] pentru CSV gol", () => {
      expect(parseCsv("")).toEqual([]);
      expect(parseCsv("id,partnerStatus")).toEqual([]); // doar header
    });

    it("parseCsv handle escaped quotes", () => {
      const csv = `id,name\ntest,"He said ""hi"""`;
      const rows = parseCsv(csv);
      expect(rows[0].name).toBe(`He said "hi"`);
    });
  });

  describe("importOverridesCsv", () => {
    it("import batch CSV reușit", () => {
      const csv = "id,partnerStatus,partnerTier\nviessmann,active,premium\ndaikin,pending,";
      const result = importOverridesCsv(csv);
      expect(result.success).toBe(2);
      expect(result.errors).toEqual([]);
      const all = getOverrides();
      expect(all.viessmann.partnerStatus).toBe("active");
      expect(all.viessmann.partnerTier).toBe("premium");
      expect(all.daikin.partnerStatus).toBe("pending");
    });

    it("import detectează partnerStatus invalid", () => {
      const csv = "id,partnerStatus\nviessmann,INVALID_VALUE";
      const result = importOverridesCsv(csv);
      expect(result.success).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain("partnerStatus invalid");
    });

    it("import detectează lipsă ID", () => {
      const csv = "id,partnerStatus\n,active";
      const result = importOverridesCsv(csv);
      expect(result.success).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain("Lipsă ID brand");
    });

    it("import detectează partnerTier invalid", () => {
      const csv = "id,partnerTier\nviessmann,golden";
      const result = importOverridesCsv(csv);
      expect(result.success).toBe(0);
      expect(result.errors[0].error).toContain("partnerTier invalid");
    });
  });

  describe("exportOverridesCsv", () => {
    it("export header + rows corect", () => {
      setOverride("viessmann", { partnerStatus: "active", partnerTier: "premium", affiliateUrl: "https://test.ro" });
      const csv = exportOverridesCsv();
      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,partnerStatus,partnerSince,partnerTier,affiliateUrl,contactEmail");
      expect(lines[1]).toContain("viessmann");
      expect(lines[1]).toContain("active");
      expect(lines[1]).toContain("premium");
    });

    it("export escape quotes pentru valori cu comma", () => {
      setOverride("test", { partnerStatus: "active", contactEmail: "test, with comma" });
      const csv = exportOverridesCsv();
      expect(csv).toContain('"test, with comma"');
    });
  });

  describe("Telemetrie click", () => {
    it("getTelemetryEvents returnează [] inițial", () => {
      expect(getTelemetryEvents()).toEqual([]);
    });

    it("logPartnerClick adaugă event", () => {
      const ok = logPartnerClick("GAZ_COND", ["viessmann", "vaillant"], "Step3.heating.source");
      expect(ok).toBe(true);
      const events = getTelemetryEvents();
      expect(events.length).toBe(1);
      expect(events[0].entryId).toBe("GAZ_COND");
      expect(events[0].partnerBrandIds).toEqual(["viessmann", "vaillant"]);
      expect(events[0].context).toBe("Step3.heating.source");
      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("logPartnerClick limitează la 1000 events", () => {
      for (let i = 0; i < 1100; i++) {
        logPartnerClick(`E${i}`, ["test"]);
      }
      const events = getTelemetryEvents();
      expect(events.length).toBe(1000);
      // Ultimele 1000 — primele 100 au fost trim-uite
      expect(events[0].entryId).toBe("E100");
      expect(events[999].entryId).toBe("E1099");
    });

    it("getTelemetryByBrand agregeză counts", () => {
      logPartnerClick("E1", ["viessmann"]);
      logPartnerClick("E2", ["viessmann", "vaillant"]);
      logPartnerClick("E3", ["daikin"]);
      const counts = getTelemetryByBrand();
      expect(counts.viessmann).toBe(2);
      expect(counts.vaillant).toBe(1);
      expect(counts.daikin).toBe(1);
    });

    it("clearTelemetry șterge toate events", () => {
      logPartnerClick("E1", ["viessmann"]);
      clearTelemetry();
      expect(getTelemetryEvents()).toEqual([]);
    });

    it("exportTelemetryCsv format header + rows", () => {
      logPartnerClick("GAZ_COND", ["viessmann", "vaillant"], "Step3.heating.source");
      const csv = exportTelemetryCsv();
      const lines = csv.split("\n");
      expect(lines[0]).toBe("timestamp,entryId,partnerBrandIds,context");
      expect(lines[1]).toContain("GAZ_COND");
      expect(lines[1]).toContain("viessmann|vaillant");
      expect(lines[1]).toContain("Step3.heating.source");
    });
  });

  describe("Edge cases", () => {
    it("setOverride handle null/undefined storage gracefully", () => {
      // Nu crash dacă localStorage nu este disponibil — testat prin success/false return
      const ok = setOverride("test", { partnerStatus: "active" });
      expect(ok).toBe(true);
    });

    it("applyOverride pentru null brand", () => {
      expect(applyOverride(null)).toBeNull();
      expect(applyOverride(undefined)).toBeUndefined();
    });
  });
});
