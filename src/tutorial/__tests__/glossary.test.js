// ═════════════════════════════════════════════════════════════════════════════
// glossary.test.js — Glosar termeni complet și valid
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { GLOSSARY } from "../glossary.js";

describe("Tutorial glossary", () => {
  it("glosar exportat ca obiect non-vid", () => {
    expect(GLOSSARY).toBeDefined();
    expect(Object.keys(GLOSSARY).length).toBeGreaterThan(15);
  });

  it("fiecare termen are term + short + long", () => {
    Object.entries(GLOSSARY).forEach(([key, t]) => {
      expect(t.term, `${key} term`).toBeDefined();
      expect(t.short, `${key} short`).toBeDefined();
      expect(t.long, `${key} long`).toBeDefined();
    });
  });

  it("short e suficient scurt (≤80 chars), long e suficient detaliat (>50 chars)", () => {
    Object.entries(GLOSSARY).forEach(([key, t]) => {
      expect(t.short.length, `${key} short`).toBeLessThanOrEqual(80);
      expect(t.long.length, `${key} long`).toBeGreaterThan(50);
    });
  });

  it("are termeni esențiali (EP, Au, V, U, RER, nZEB, MEPS, BACS, SCOP, CPE)", () => {
    const REQUIRED = ["EP", "Au", "V", "U", "RER", "nZEB", "MEPS", "BACS", "SCOP", "CPE"];
    REQUIRED.forEach((termId) => {
      expect(GLOSSARY[termId], `lipsește ${termId}`).toBeDefined();
    });
  });

  it("are termeni legali (AE_Ici, AE_IIci, PAdES, PDFA3)", () => {
    expect(GLOSSARY.AE_Ici).toBeDefined();
    expect(GLOSSARY.AE_IIci).toBeDefined();
    expect(GLOSSARY.PAdES).toBeDefined();
    expect(GLOSSARY.PDFA3).toBeDefined();
  });

  it("termenii nu se repetă (term unic)", () => {
    const terms = Object.values(GLOSSARY).map((t) => t.term);
    const uniqueTerms = new Set(terms);
    expect(uniqueTerms.size).toBe(terms.length);
  });
});
