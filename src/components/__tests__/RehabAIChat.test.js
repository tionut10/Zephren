/**
 * RehabAIChat.test.js — audit-mai2026 F5
 *
 * Verifică:
 *   1. `buildChatContext` extrage corect câmpurile relevante din state-ul pașilor 1-5
 *   2. Constanta MAX_HISTORY = 10 (5 turns user+assistant)
 *   3. LS_KEY_PREFIX permite scoping per proiect
 *
 * NU testează render React (jsdom limited) — focus pe contract helper.
 */

import { describe, it, expect } from "vitest";
import { buildChatContext, MAX_HISTORY, LS_KEY_PREFIX } from "../RehabAIChat.jsx";

describe("audit-mai2026 F5 — RehabAIChat constants", () => {
  it("MAX_HISTORY = 10 (5 turns user+assistant)", () => {
    expect(MAX_HISTORY).toBe(10);
  });

  it("LS_KEY_PREFIX permite scoping per proiect", () => {
    expect(typeof LS_KEY_PREFIX).toBe("string");
    expect(LS_KEY_PREFIX.length).toBeGreaterThan(0);
    expect(LS_KEY_PREFIX.endsWith("_")).toBe(true);
  });
});

describe("audit-mai2026 F5 — buildChatContext", () => {
  it("input gol → returnează obiect cu valori undefined safe", () => {
    const ctx = buildChatContext({});
    expect(ctx).toBeDefined();
    expect(ctx.energyClass).toBeUndefined();
    expect(ctx.ep).toBeUndefined();
  });

  it("building cu address → include sub-obiect building cu categorie/au/yearBuilt", () => {
    const ctx = buildChatContext({
      building: {
        address: "Str. Decebal nr. 12",
        category: "RA",
        areaUseful: 65,
        yearBuilt: 1975,
        climateZone: "I",
      },
    });
    expect(ctx.building).toBeDefined();
    expect(ctx.building.categorie).toBe("RA");
    expect(ctx.building.au).toBe(65);
    expect(ctx.building.yearBuilt).toBe(1975);
    expect(ctx.category).toBe("RA");
    expect(ctx.zoneClimatica).toBe("I");
    expect(ctx.au).toBe(65);
    expect(ctx.yearBuilt).toBe(1975);
  });

  it("energyClass {cls, color} → extrage doar cls string", () => {
    const ctx = buildChatContext({
      energyClass: { cls: "G", color: "#ef4444" },
    });
    expect(ctx.energyClass).toBe("G");
  });

  it("energyClass string → forwardează direct", () => {
    const ctx = buildChatContext({ energyClass: "F" });
    expect(ctx.energyClass).toBe("F");
  });

  it("instSummary cu ep_total_m2 + rer → câmpuri ep + rer", () => {
    const ctx = buildChatContext({
      instSummary: { ep_total_m2: 285, rer: 12 },
    });
    expect(ctx.ep).toBe(285);
    expect(ctx.rer).toBe(12);
  });

  it("U mediu opac + vitraj rounding → propagat ca atare", () => {
    const ctx = buildChatContext({
      opaqueAvgU: 1.47,
      glazingAvgU: 2.70,
    });
    expect(ctx.uOpacMediu).toBe(1.47);
    expect(ctx.uVitrajMediu).toBe(2.70);
  });

  it("heating cu label → forwardează label, fallback la source", () => {
    expect(buildChatContext({ heating: { label: "Centrală gaz condensare", source: "GAZ_COND" } }).heating)
      .toBe("Centrală gaz condensare");
    expect(buildChatContext({ heating: { source: "HP_AW_8" } }).heating).toBe("HP_AW_8");
  });

  it("buget user → propagat în context (pentru sugestii limitate la buget)", () => {
    const ctx = buildChatContext({ buget: 30000 });
    expect(ctx.buget).toBe(30000);
  });

  it("context complet realistic (M1 Constanța PAFP) → toate câmpurile populate", () => {
    const ctx = buildChatContext({
      building: { address: "Constanța", category: "RA", areaUseful: 65, yearBuilt: 1975, climateZone: "I" },
      energyClass: { cls: "G" },
      instSummary: { ep_total_m2: 781, rer: 0 },
      heating: { label: "DH RADET termoficare" },
      acm: { source: "ELECTRIC_BOILER" },
      opaqueAvgU: 1.47,
      glazingAvgU: 2.70,
      buget: 35000,
    });
    expect(ctx.category).toBe("RA");
    expect(ctx.energyClass).toBe("G");
    expect(ctx.ep).toBe(781);
    expect(ctx.zoneClimatica).toBe("I");
    expect(ctx.uOpacMediu).toBe(1.47);
    expect(ctx.uVitrajMediu).toBe(2.70);
    expect(ctx.heating).toBe("DH RADET termoficare");
    expect(ctx.acm).toBe("ELECTRIC_BOILER");
    expect(ctx.buget).toBe(35000);
  });
});
