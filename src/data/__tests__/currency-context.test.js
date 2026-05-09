// @vitest-environment jsdom
/**
 * currency-context.test.js — Sprint Îmbunătățiri #3 (9 mai 2026)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getCurrencyMode,
  setCurrencyMode,
  fmtMoney,
  convertCurrency,
  getCurrencySymbol,
  _internals,
} from "../currency-context.js";

beforeEach(() => {
  try { localStorage.removeItem(_internals.STORAGE_KEY); } catch {}
});

describe("Sprint Îmbunătățiri #3 — currency-context", () => {
  describe("getCurrencyMode / setCurrencyMode", () => {
    it("default 'auto' fără setări", () => {
      expect(getCurrencyMode()).toBe("auto");
    });

    it("setează și citește valoare validă", () => {
      expect(setCurrencyMode("EUR")).toBe(true);
      expect(getCurrencyMode()).toBe("EUR");
      expect(setCurrencyMode("RON")).toBe(true);
      expect(getCurrencyMode()).toBe("RON");
    });

    it("respinge mode invalid", () => {
      expect(setCurrencyMode("USD")).toBe(false);
      expect(setCurrencyMode("")).toBe(false);
      expect(setCurrencyMode(null)).toBe(false);
    });
  });

  describe("fmtMoney — auto mode", () => {
    it("EUR sursă → afișează ambele", () => {
      const r = fmtMoney(1000, "EUR", { eurRon: 5.10 });
      expect(r).toContain("EUR");
      expect(r).toContain("RON");
      expect(r).toContain("1.000");
      expect(r).toContain("5.100");
    });

    it("RON sursă → afișează ambele", () => {
      const r = fmtMoney(5100, "RON", { eurRon: 5.10 });
      expect(r).toContain("RON");
      expect(r).toContain("EUR");
    });
  });

  describe("fmtMoney — EUR mode", () => {
    it("EUR sursă rămâne EUR", () => {
      setCurrencyMode("EUR");
      const r = fmtMoney(1000, "EUR", { eurRon: 5.10 });
      expect(r).toBe("1.000 EUR");
    });

    it("RON sursă convertit la EUR", () => {
      const r = fmtMoney(5100, "RON", { target: "EUR", eurRon: 5.10 });
      expect(r).toBe("1.000 EUR");
    });
  });

  describe("fmtMoney — RON mode", () => {
    it("RON sursă rămâne RON", () => {
      const r = fmtMoney(5100, "RON", { target: "RON", eurRon: 5.10 });
      expect(r).toBe("5.100 RON");
    });

    it("EUR sursă convertit la RON", () => {
      const r = fmtMoney(1000, "EUR", { target: "RON", eurRon: 5.10 });
      expect(r).toBe("5.100 RON");
    });
  });

  describe("fmtMoney — edge cases", () => {
    it("NaN / null → '—'", () => {
      expect(fmtMoney(NaN, "RON")).toBe("—");
      expect(fmtMoney(null, "RON")).toBe("—");
      expect(fmtMoney(undefined, "EUR")).toBe("—");
    });

    it("decimals option", () => {
      const r = fmtMoney(1234.56, "EUR", { target: "EUR", decimals: 2 });
      expect(r).toBe("1.234,56 EUR");
    });
  });

  describe("convertCurrency", () => {
    it("EUR → RON corect", () => {
      expect(convertCurrency(100, "EUR", "RON", 5.10)).toBeCloseTo(510, 2);
    });

    it("RON → EUR corect", () => {
      expect(convertCurrency(510, "RON", "EUR", 5.10)).toBeCloseTo(100, 2);
    });

    it("identity pentru aceeași monedă", () => {
      expect(convertCurrency(123, "EUR", "EUR", 5.10)).toBe(123);
      expect(convertCurrency(456, "RON", "RON", 5.10)).toBe(456);
    });

    it("NaN / non-finite → 0", () => {
      expect(convertCurrency(NaN, "EUR", "RON", 5.10)).toBe(0);
      expect(convertCurrency(Infinity, "EUR", "RON", 5.10)).toBe(0);
    });
  });

  describe("getCurrencySymbol", () => {
    it("returnează simbol corect per mod", () => {
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("RON")).toBe("RON");
      expect(getCurrencySymbol("auto")).toBe("€/RON");
    });
  });
});
