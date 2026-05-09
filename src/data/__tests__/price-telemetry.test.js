// @vitest-environment jsdom
/**
 * price-telemetry.test.js — Sprint Îmbunătățiri #4 (9 mai 2026)
 *
 * Teste pentru telemetria evenimentelor de preț (FIFO 1000 events localStorage).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  logPriceEvent,
  getPriceEvents,
  getPriceEventsByPrefix,
  getPriceEventsCounts,
  getScenarioDistribution,
  getPresetDistribution,
  getRecentPriceEvents,
  clearPriceTelemetry,
  exportPriceEventsCSV,
  _internals,
} from "../price-telemetry.js";

beforeEach(() => {
  try { localStorage.removeItem(_internals.TELEMETRY_KEY); } catch {}
});

describe("Sprint Îmbunătățiri #4 — price telemetry", () => {
  describe("logPriceEvent", () => {
    it("salvează un eveniment cu prefix Pret.", () => {
      expect(logPriceEvent("scenario.changed", { mode: "low" })).toBe(true);
      const events = getPriceEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe("Pret.scenario.changed");
      expect(events[0].meta).toEqual({ mode: "low" });
      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("salvează multiple events ordonate cronologic", () => {
      logPriceEvent("scenario.changed", { mode: "low" });
      logPriceEvent("scenario.changed", { mode: "mid" });
      logPriceEvent("scenario.changed", { mode: "high" });
      const events = getPriceEvents();
      expect(events).toHaveLength(3);
      expect(events.map(e => e.meta.mode)).toEqual(["low", "mid", "high"]);
    });

    it("FIFO 1000 — păstrează doar ultimele MAX_EVENTS", () => {
      const max = _internals.MAX_EVENTS;
      // Simulează 1010 events
      for (let i = 0; i < max + 10; i++) {
        logPriceEvent("test.event", { index: i });
      }
      const events = getPriceEvents();
      expect(events).toHaveLength(max);
      // Primele 10 trebuie scoase
      expect(events[0].meta.index).toBe(10);
      expect(events[max - 1].meta.index).toBe(max + 9);
    });
  });

  describe("getPriceEventsByPrefix", () => {
    it("filtrează după prefix exact", () => {
      logPriceEvent("scenario.changed", { mode: "low" });
      logPriceEvent("scenario.reset", {});
      logPriceEvent("eurRon.override", { rate: 5.05 });
      const scenarios = getPriceEventsByPrefix("scenario");
      expect(scenarios).toHaveLength(2);
      expect(scenarios.every(e => e.action.startsWith("Pret.scenario"))).toBe(true);
    });

    it("acceptă prefix cu sau fără 'Pret.'", () => {
      logPriceEvent("scenario.changed", { mode: "low" });
      expect(getPriceEventsByPrefix("scenario")).toHaveLength(1);
      expect(getPriceEventsByPrefix("Pret.scenario")).toHaveLength(1);
    });
  });

  describe("getScenarioDistribution", () => {
    it("agregare corectă low/mid/high", () => {
      logPriceEvent("scenario.changed", { mode: "low" });
      logPriceEvent("scenario.changed", { mode: "mid" });
      logPriceEvent("scenario.changed", { mode: "mid" });
      logPriceEvent("scenario.changed", { mode: "high" });
      logPriceEvent("scenario.changed", { mode: "high" });
      logPriceEvent("scenario.changed", { mode: "high" });
      const dist = getScenarioDistribution();
      expect(dist).toEqual({ low: 1, mid: 2, high: 3, total: 6 });
    });

    it("ignoră mode-uri invalide", () => {
      logPriceEvent("scenario.changed", { mode: "invalid_mode" });
      logPriceEvent("scenario.changed", { mode: "mid" });
      const dist = getScenarioDistribution();
      expect(dist.total).toBe(1);
      expect(dist.mid).toBe(1);
    });
  });

  describe("getPresetDistribution", () => {
    it("agregare per preset id", () => {
      logPriceEvent("preset.changed", { presetId: "casnic_2025" });
      logPriceEvent("preset.changed", { presetId: "casnic_2025" });
      logPriceEvent("preset.changed", { presetId: "imm_2025" });
      const dist = getPresetDistribution();
      expect(dist).toEqual({ casnic_2025: 2, imm_2025: 1 });
    });
  });

  describe("getPriceEventsCounts", () => {
    it("agregare per action exactă", () => {
      logPriceEvent("scenario.changed", {});
      logPriceEvent("scenario.changed", {});
      logPriceEvent("eurRon.override", {});
      const counts = getPriceEventsCounts();
      expect(counts["Pret.scenario.changed"]).toBe(2);
      expect(counts["Pret.eurRon.override"]).toBe(1);
    });
  });

  describe("getRecentPriceEvents", () => {
    it("returnează ultimele N events în ordine descrescătoare timp", () => {
      logPriceEvent("a", {});
      logPriceEvent("b", {});
      logPriceEvent("c", {});
      const recent = getRecentPriceEvents(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].action).toBe("Pret.c"); // cel mai recent primul
      expect(recent[1].action).toBe("Pret.b");
    });
  });

  describe("clearPriceTelemetry", () => {
    it("șterge toate evenimentele", () => {
      logPriceEvent("a", {});
      logPriceEvent("b", {});
      expect(getPriceEvents()).toHaveLength(2);
      expect(clearPriceTelemetry()).toBe(true);
      expect(getPriceEvents()).toHaveLength(0);
    });
  });

  describe("exportPriceEventsCSV", () => {
    it("returnează header CSV gol când nu sunt events", () => {
      const csv = exportPriceEventsCSV();
      expect(csv).toBe("timestamp,action,meta\n");
    });

    it("export valid cu escape quotes JSON", () => {
      logPriceEvent("scenario.changed", { mode: "mid", note: 'cu "ghilimele"' });
      const csv = exportPriceEventsCSV();
      expect(csv).toContain("timestamp,action,meta");
      expect(csv).toContain("Pret.scenario.changed");
      expect(csv).toContain("mid");
      // Quotes interne din JSON sunt escapate prin combinația JSON.stringify (\")
      // urmată de CSV replace (\""). Verificăm că textul "ghilimele" se păstrează.
      expect(csv).toContain("ghilimele");
    });
  });

  describe("Robustețe — storage corupt sau lipsă", () => {
    it("storage corupt → getPriceEvents returnează []", () => {
      localStorage.setItem(_internals.TELEMETRY_KEY, "not-valid-json{");
      expect(getPriceEvents()).toEqual([]);
    });

    it("storage cu non-array → []", () => {
      localStorage.setItem(_internals.TELEMETRY_KEY, JSON.stringify({ wrong: "shape" }));
      expect(getPriceEvents()).toEqual([]);
    });
  });
});
