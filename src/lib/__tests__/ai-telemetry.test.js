// @vitest-environment jsdom
/**
 * ai-telemetry.test.js — Sprint Pas 2 AI-First (16 mai 2026)
 *
 * Suite pentru FIFO 500 evenimente AI cu stats agregat și export CSV.
 *
 * Acoperă:
 *  - logAIEvent: persistare localStorage + filtrare intent invalid
 *  - readEvents: graceful fallback (no localStorage, JSON invalid, key lipsă)
 *  - FIFO 500: depășire → shift cele mai vechi
 *  - getAIStats: rata succes, latency medie per intent
 *  - exportAIEventsCSV: CSV well-formed cu escape virgule/newlines
 *  - clearAIEvents: cleanup
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  logAIEvent,
  readEvents,
  getAIStats,
  exportAIEventsCSV,
  clearAIEvents,
  __testing__,
} from "../ai-telemetry.js";

describe("ai-telemetry", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  describe("logAIEvent — persistare bază", () => {
    it("scrie un eveniment minimal", () => {
      logAIEvent({ intent: "envelope-fill", success: true });
      const events = readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].intent).toBe("envelope-fill");
      expect(events[0].success).toBe(true);
      expect(typeof events[0].t).toBe("number");
    });

    it("ignoră intent invalid (defensive)", () => {
      logAIEvent({ intent: "random-fake", success: true });
      expect(readEvents()).toHaveLength(0);
    });

    it("ignoră evenimente fără intent", () => {
      logAIEvent({ success: true });
      logAIEvent(null);
      logAIEvent(undefined);
      expect(readEvents()).toHaveLength(0);
    });

    it("trunchiază errorMsg la 200 caractere", () => {
      const longMsg = "X".repeat(500);
      logAIEvent({ intent: "envelope-fill", success: false, errorMsg: longMsg });
      const ev = readEvents()[0];
      expect(ev.errorMsg.length).toBe(200);
    });

    it("rotunjește latencyMs", () => {
      logAIEvent({ intent: "envelope-fill", success: true, latencyMs: 123.78 });
      expect(readEvents()[0].latencyMs).toBe(124);
    });

    it("acceptă toate intent-urile valide", () => {
      for (const intent of __testing__.VALID_INTENTS) {
        logAIEvent({ intent, success: true });
      }
      expect(readEvents().length).toBe(__testing__.VALID_INTENTS.size);
    });
  });

  describe("FIFO 500", () => {
    it("păstrează maxim 500 evenimente, le shift pe cele vechi", () => {
      for (let i = 0; i < 510; i++) {
        logAIEvent({ intent: "envelope-fill", success: true, latencyMs: i });
      }
      const events = readEvents();
      expect(events).toHaveLength(__testing__.MAX_EVENTS);
      // primul eveniment păstrat trebuie să aibă latencyMs >= 10 (au fost evacuate 0-9)
      expect(events[0].latencyMs).toBeGreaterThanOrEqual(10);
      expect(events[events.length - 1].latencyMs).toBe(509);
    });
  });

  describe("readEvents — graceful fallback", () => {
    it("returnează array gol când nu există key", () => {
      expect(readEvents()).toEqual([]);
    });

    it("returnează array gol când JSON e corupt", () => {
      localStorage.setItem(__testing__.STORAGE_KEY, "{not valid json");
      expect(readEvents()).toEqual([]);
    });

    it("returnează array gol când valoarea nu e array", () => {
      localStorage.setItem(__testing__.STORAGE_KEY, '{"foo":"bar"}');
      expect(readEvents()).toEqual([]);
    });
  });

  describe("getAIStats", () => {
    it("agregă corect rata succes + latency per intent", () => {
      logAIEvent({ intent: "envelope-fill", success: true, latencyMs: 100 });
      logAIEvent({ intent: "envelope-fill", success: true, latencyMs: 200 });
      logAIEvent({ intent: "envelope-fill", success: false, errorMsg: "x" });
      logAIEvent({ intent: "facade-vision", success: true, latencyMs: 500 });

      const stats = getAIStats();
      expect(stats.totalEvents).toBe(4);
      expect(stats.byIntent["envelope-fill"].total).toBe(3);
      expect(stats.byIntent["envelope-fill"].success).toBe(2);
      expect(stats.byIntent["envelope-fill"].fail).toBe(1);
      expect(stats.byIntent["envelope-fill"].successRate).toBeCloseTo(0.667, 2);
      expect(stats.byIntent["envelope-fill"].avgLatencyMs).toBe(150);
      expect(stats.byIntent["facade-vision"].avgLatencyMs).toBe(500);
    });

    it("returnează 0 când nu există evenimente", () => {
      const stats = getAIStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.byIntent).toEqual({});
    });
  });

  describe("exportAIEventsCSV", () => {
    it("generează header corect + rânduri", () => {
      logAIEvent({
        intent: "envelope-fill",
        fileType: "text",
        success: true,
        latencyMs: 1200,
        confidence: "high",
        elementsCount: 5,
      });
      const csv = exportAIEventsCSV();
      const lines = csv.split("\n");
      expect(lines[0]).toBe(
        "timestamp,intent,fileType,latencyMs,success,confidence,elementsCount,errorMsg",
      );
      expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2}T.*,envelope-fill,text,1200,true,high,5,$/);
    });

    it("escape-ază virgule și newlines din errorMsg", () => {
      logAIEvent({
        intent: "envelope-fill",
        success: false,
        errorMsg: "Eroare cu, virgulă\nși newline",
      });
      const csv = exportAIEventsCSV();
      expect(csv).not.toContain("Eroare cu,");
      expect(csv).toContain("Eroare cu  virgulă");
    });
  });

  describe("clearAIEvents", () => {
    it("șterge toate evenimentele", () => {
      logAIEvent({ intent: "envelope-fill", success: true });
      expect(readEvents()).toHaveLength(1);
      clearAIEvents();
      expect(readEvents()).toHaveLength(0);
    });
  });
});
