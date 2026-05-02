/**
 * cpe-validity.test.js — Teste helper valabilitate EPBD 2024 Art. 17.
 *
 * Sprint 15 — 18 apr 2026
 */
import { describe, it, expect } from "vitest";
import {
  getValidityYears,
  getExpiryDate,
  getValidityLabel,
  monthsUntilExpiry,
  getNotificationIntervals,
  VALIDITY_LONG,
  VALIDITY_SHORT,
  LONG_VALIDITY_CLASSES,
} from "../cpe-validity.js";

describe("getValidityYears", () => {
  it("returnează 10 ani pentru clase A+/A/B/C", () => {
    expect(getValidityYears("A+")).toBe(10);
    expect(getValidityYears("A")).toBe(10);
    expect(getValidityYears("B")).toBe(10);
    expect(getValidityYears("C")).toBe(10);
  });

  it("returnează 5 ani pentru clase D/E/F/G", () => {
    expect(getValidityYears("D")).toBe(5);
    expect(getValidityYears("E")).toBe(5);
    expect(getValidityYears("F")).toBe(5);
    expect(getValidityYears("G")).toBe(5);
  });

  it("fallback pe 10 ani pentru null/undefined/empty (retro-compat)", () => {
    expect(getValidityYears(null)).toBe(VALIDITY_LONG);
    expect(getValidityYears(undefined)).toBe(VALIDITY_LONG);
    expect(getValidityYears("")).toBe(VALIDITY_LONG);
  });

  it("normalizează case + whitespace", () => {
    expect(getValidityYears(" a+ ")).toBe(10);
    expect(getValidityYears("c")).toBe(10);
    expect(getValidityYears("g")).toBe(5);
  });

  it("clase necunoscute → 5 ani (prudent)", () => {
    expect(getValidityYears("H")).toBe(VALIDITY_SHORT);
    expect(getValidityYears("X")).toBe(VALIDITY_SHORT);
  });
});

describe("getExpiryDate", () => {
  it("adaugă 10 ani pentru clasa A", () => {
    const iss = "2026-04-18";
    const exp = getExpiryDate(iss, "A");
    expect(exp).toBeInstanceOf(Date);
    expect(exp.getFullYear()).toBe(2036);
    expect(exp.getMonth()).toBe(3); // April
    expect(exp.getDate()).toBe(18);
  });

  it("adaugă 5 ani pentru clasa E", () => {
    const iss = "2026-04-18";
    const exp = getExpiryDate(iss, "E");
    expect(exp.getFullYear()).toBe(2031);
    expect(exp.getMonth()).toBe(3);
    expect(exp.getDate()).toBe(18);
  });

  it("returnează null pentru input invalid", () => {
    expect(getExpiryDate("", "A")).toBe(null);
    expect(getExpiryDate(null, "A")).toBe(null);
    expect(getExpiryDate("invalid-date", "A")).toBe(null);
  });

  it("acceptă Date object", () => {
    const d = new Date("2026-01-01");
    const exp = getExpiryDate(d, "B");
    expect(exp.getFullYear()).toBe(2036);
  });
});

describe("getValidityLabel", () => {
  // Audit 2 mai 2026 — P0.1: label-ul nu mai citează EPBD 2024/1275 ca normativ
  // aplicat (Directiva NU este transpusă în drept român până la 29.05.2026).
  // Folosește L.372/2005 republicată mod. L.238/2024 ca referință legală RO.
  it("formatează label RO pentru clasa A (10 ani)", () => {
    const label = getValidityLabel("A");
    expect(label).toContain("10 ani");
    expect(label).toContain("clasa A");
    expect(label).toContain("L.372/2005");
    expect(label).toContain("L.238/2024");
    expect(label).not.toContain("EPBD"); // garanție că nu citează EPBD ca normativ aplicat
  });

  it("formatează label RO pentru clasa F (5 ani)", () => {
    // Sub Ord. MDLPA 16/2023 (regimul actual înainte de transpunerea EPBD)
    // valabilitatea e 10 ani uniform. Diferențierea 5/10 ani per clasă va
    // deveni aplicabilă doar cu scaleVersion="2026" (post-transpunere).
    const label = getValidityLabel("F");
    expect(label).toContain("clasa F");
    expect(label).toMatch(/\d+ ani/); // exact valoare verificată în getValidityYears
    expect(label).not.toContain("EPBD");
  });

  it("formatează label EN", () => {
    const label = getValidityLabel("B", "EN");
    expect(label).toContain("years");
    expect(label).toContain("class B");
    expect(label).toContain("L.372/2005");
    expect(label).toContain("L.238/2024");
    expect(label).not.toContain("EPBD");
  });
});

describe("monthsUntilExpiry", () => {
  it("returnează număr pozitiv pentru CPE neexpirat", () => {
    const today = new Date();
    const issued = new Date(today);
    issued.setMonth(issued.getMonth() - 6); // Emis acum 6 luni, clasa A (10 ani)
    const m = monthsUntilExpiry(issued.toISOString(), "A");
    expect(m).toBeGreaterThan(100); // ~114 luni rămase
    expect(m).toBeLessThan(120);
  });

  it("returnează negativ pentru CPE expirat", () => {
    const issued = new Date();
    issued.setFullYear(issued.getFullYear() - 11); // Emis acum 11 ani, clasa A (expirat de 1 an)
    const m = monthsUntilExpiry(issued.toISOString(), "A");
    expect(m).toBeLessThan(0);
  });

  it("returnează null pentru input invalid", () => {
    expect(monthsUntilExpiry("", "A")).toBe(null);
  });
});

describe("getNotificationIntervals", () => {
  it("returnează intervale standard (12/6/3/1/exp) pentru clase lungi", () => {
    const intervals = getNotificationIntervals("A");
    expect(intervals).toHaveLength(5);
    expect(intervals[0].months).toBe(12);
    expect(intervals[4].months).toBe(0);
  });

  it("returnează intervale proporționale (30/18/6/1/exp) pentru clase scurte", () => {
    const intervals = getNotificationIntervals("F");
    expect(intervals).toHaveLength(5);
    expect(intervals[0].months).toBe(30);
    expect(intervals[4].months).toBe(0);
  });

  it("fallback pe intervale standard pentru input invalid", () => {
    const intervals = getNotificationIntervals(null);
    expect(intervals[0].months).toBe(12); // 10 ani default
  });
});

describe("LONG_VALIDITY_CLASSES", () => {
  it("conține exact A+/A/B/C", () => {
    expect(LONG_VALIDITY_CLASSES).toEqual(["A+", "A", "B", "C"]);
  });
});
