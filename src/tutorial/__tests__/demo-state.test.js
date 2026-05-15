// ═════════════════════════════════════════════════════════════════════════════
// demo-state.test.js — Sumare M1-M5 complete și coerente
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { DEMOS_SUMMARY, getDemo, getDemoBadge } from "../demo-state.js";

describe("Demo-state M1-M5", () => {
  it("are toate 5 demos (M1-M5)", () => {
    expect(DEMOS_SUMMARY.M1).toBeDefined();
    expect(DEMOS_SUMMARY.M2).toBeDefined();
    expect(DEMOS_SUMMARY.M3).toBeDefined();
    expect(DEMOS_SUMMARY.M4).toBeDefined();
    expect(DEMOS_SUMMARY.M5).toBeDefined();
  });

  it("fiecare demo are câmpurile cheie", () => {
    Object.entries(DEMOS_SUMMARY).forEach(([key, d]) => {
      expect(d.id, `${key} id`).toBe(key);
      expect(d.title, `${key} title`).toBeDefined();
      expect(d.category, `${key} category`).toBeDefined();
      expect(d.areaUseful, `${key} areaUseful`).toBeDefined();
      expect(d.ep_live, `${key} ep_live`).toBeDefined();
      expect(d.classLive, `${key} classLive`).toBeDefined();
      expect(d.epbdLimit, `${key} epbdLimit`).toBeDefined();
    });
  });

  it("categoriile sunt valide (RI/RC/RA/BI/ED/SP)", () => {
    const VALID_CATS = ["RI", "RC", "RA", "BC", "BI", "ED", "SP", "CO", "HC", "SA", "AL"];
    Object.entries(DEMOS_SUMMARY).forEach(([key, d]) => {
      expect(VALID_CATS, `${key} cat ${d.category}`).toContain(d.category);
    });
  });

  it("clasele sunt valide A+/A/B/C/D/E/F/G", () => {
    const VALID_CLASSES = ["A+", "A", "B", "C", "D", "E", "F", "G"];
    Object.entries(DEMOS_SUMMARY).forEach(([key, d]) => {
      expect(VALID_CLASSES, `${key} class ${d.classLive}`).toContain(d.classLive);
    });
  });

  it("M2 este marcat primary", () => {
    expect(DEMOS_SUMMARY.M2.isPrimary).toBe(true);
  });

  it("M5 este ZEB (clasă A+, EP_nren=0, RER>50%)", () => {
    expect(DEMOS_SUMMARY.M5.classLive).toBe("A+");
    expect(DEMOS_SUMMARY.M5.ep_nren_live).toBe(0);
    expect(DEMOS_SUMMARY.M5.rer).toBeGreaterThan(50);
  });

  it("helper getDemo returnează corect", () => {
    expect(getDemo("M2").id).toBe("M2");
    expect(getDemo("INVALID").id).toBe("M2"); // fallback M2
  });

  it("helper getDemoBadge returnează string formatat", () => {
    const badge = getDemoBadge("M2");
    expect(badge).toContain("M2");
    expect(badge).toContain("RI");
  });

  it("areaUseful e număr pozitiv în m²", () => {
    Object.entries(DEMOS_SUMMARY).forEach(([key, d]) => {
      expect(d.areaUseful, `${key} areaUseful tip`).toBeGreaterThan(0);
      expect(d.areaUseful, `${key} areaUseful realist`).toBeLessThan(5000);
    });
  });

  it("ep_live e număr pozitiv (kWh/m²a)", () => {
    Object.entries(DEMOS_SUMMARY).forEach(([key, d]) => {
      expect(d.ep_live, `${key} ep_live`).toBeGreaterThanOrEqual(0);
      expect(d.ep_live, `${key} ep_live realist`).toBeLessThan(2000);
    });
  });

  it("epbdLimit conform Mc 001-2022", () => {
    // RI/RC/RA: 110-125, BI: 145, ED: 60, SP: 70
    expect(DEMOS_SUMMARY.M1.epbdLimit).toBe(110); // RC/RA
    expect(DEMOS_SUMMARY.M2.epbdLimit).toBe(125); // RI
    expect(DEMOS_SUMMARY.M3.epbdLimit).toBe(145); // BI
    expect(DEMOS_SUMMARY.M4.epbdLimit).toBe(60);  // ED
    expect(DEMOS_SUMMARY.M5.epbdLimit).toBe(125); // RI nou
  });
});
