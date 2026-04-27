import { describe, it, expect } from "vitest";
import {
  ATTESTATION_VALIDITY_YEARS,
  RENEWAL_WINDOW_MIN_DAYS,
  RENEWAL_WINDOW_MAX_DAYS,
  ORD_2237_REPEAL_DATE,
  calcExpiryDate,
  daysUntilExpiry,
  getAttestationStatus,
  formatDaysLeft,
  getAttestationOrdinanceVersion,
  isInTransitionWindow,
} from "../auditor-attestation-validity.js";

describe("auditor-attestation-validity — Sprint v6.2 (Ord. MDLPA 348/2026)", () => {

  describe("constante legale", () => {
    it("perioada de valabilitate = 5 ani (Art. 30 alin. 3)", () => {
      expect(ATTESTATION_VALIDITY_YEARS).toBe(5);
    });
    it("fereastra renewal: minim 30, maxim 90 zile (Art. 31 alin. 1)", () => {
      expect(RENEWAL_WINDOW_MIN_DAYS).toBe(30);
      expect(RENEWAL_WINDOW_MAX_DAYS).toBe(90);
    });
    it("data abrogării Ord. 2237/2010 = 11 oct 2026", () => {
      expect(ORD_2237_REPEAL_DATE.getUTCFullYear()).toBe(2026);
      expect(ORD_2237_REPEAL_DATE.getUTCMonth()).toBe(9); // 0-indexed: 9 = octombrie
      expect(ORD_2237_REPEAL_DATE.getUTCDate()).toBe(11);
    });
  });

  describe("calcExpiryDate", () => {
    it("adaugă 5 ani la data emiterii", () => {
      const exp = calcExpiryDate("2024-06-15");
      expect(exp.getFullYear()).toBe(2029);
      expect(exp.getMonth()).toBe(5); // iunie
      expect(exp.getDate()).toBe(15);
    });
    it("returnează null pentru input invalid", () => {
      expect(calcExpiryDate(null)).toBe(null);
      expect(calcExpiryDate("")).toBe(null);
      expect(calcExpiryDate("not-a-date")).toBe(null);
    });
    it("acceptă obiect Date", () => {
      const exp = calcExpiryDate(new Date("2025-01-01"));
      expect(exp.getFullYear()).toBe(2030);
    });
  });

  describe("daysUntilExpiry", () => {
    it("calculează corect zile rămase", () => {
      const now = new Date("2026-04-27T00:00:00.000Z");
      const exp = new Date("2026-05-27T00:00:00.000Z");
      expect(daysUntilExpiry(exp, now)).toBe(30);
    });
    it("returnează negativ dacă deja expirat", () => {
      const now = new Date("2026-05-01T00:00:00.000Z");
      const exp = new Date("2026-04-21T00:00:00.000Z");
      expect(daysUntilExpiry(exp, now)).toBe(-10);
    });
  });

  describe("getAttestationStatus", () => {
    const NOW = new Date("2026-04-27T00:00:00.000Z");

    it("status missing dacă lipsește data emiterii", () => {
      const r = getAttestationStatus({ attestationIssueDate: null, now: NOW });
      expect(r.status).toBe("missing");
      expect(r.severity).toBe("warning");
    });

    it("status expired dacă atestatul a expirat", () => {
      // Emis 2020-01-01 → expira 2025-01-01 → la 2026-04-27 e expirat de 482 zile
      const r = getAttestationStatus({ attestationIssueDate: "2020-01-01", now: NOW });
      expect(r.status).toBe("expired");
      expect(r.severity).toBe("blocking");
      expect(r.daysLeft).toBeLessThan(0);
      expect(r.legalRef).toMatch(/Art\. 30 alin\. \(4\)/);
    });

    it("status renewal_urgent dacă < 30 zile rămase", () => {
      // Expirare la 2026-05-15 → 18 zile de la 2026-04-27
      const r = getAttestationStatus({ attestationExpiryDate: "2026-05-15", now: NOW });
      expect(r.status).toBe("renewal_urgent");
      expect(r.severity).toBe("warning");
      expect(r.canRenew).toBe(true);
    });

    it("status renewal_window dacă între 30 și 90 zile", () => {
      // Expirare la 2026-06-30 → ~64 zile de la 2026-04-27
      const r = getAttestationStatus({ attestationExpiryDate: "2026-06-30", now: NOW });
      expect(r.status).toBe("renewal_window");
      expect(r.severity).toBe("info");
      expect(r.canRenew).toBe(true);
      expect(r.daysLeft).toBeGreaterThan(30);
      expect(r.daysLeft).toBeLessThanOrEqual(90);
    });

    it("status active_warning dacă între 90 și 180 zile", () => {
      // Expirare la 2026-09-15 → ~141 zile
      const r = getAttestationStatus({ attestationExpiryDate: "2026-09-15", now: NOW });
      expect(r.status).toBe("active_warning");
      expect(r.severity).toBe("info");
      expect(r.canRenew).toBe(false);
    });

    it("status active dacă > 180 zile", () => {
      // Expirare la 2028-01-01 → ~614 zile
      const r = getAttestationStatus({ attestationExpiryDate: "2028-01-01", now: NOW });
      expect(r.status).toBe("active");
      expect(r.severity).toBe("ok");
      expect(r.canRenew).toBe(false);
    });
  });

  describe("formatDaysLeft", () => {
    it("zile pentru < 30", () => {
      expect(formatDaysLeft(15)).toBe("15 zile");
    });
    it("luni pentru < 365", () => {
      expect(formatDaysLeft(90)).toBe("3 luni");
    });
    it("ani pentru >= 365", () => {
      expect(formatDaysLeft(800)).toMatch(/2 ani/);
    });
    it("expirat pentru negativ", () => {
      expect(formatDaysLeft(-15)).toBe("expirat acum 15 zile");
    });
    it("returnează string gol pentru null/NaN", () => {
      expect(formatDaysLeft(null)).toBe("");
      expect(formatDaysLeft(NaN)).toBe("");
    });
  });

  describe("getAttestationOrdinanceVersion", () => {
    it("legacy_2237 pentru emisii anterioare 14 apr 2026", () => {
      expect(getAttestationOrdinanceVersion("2024-01-15")).toBe("legacy_2237");
      expect(getAttestationOrdinanceVersion("2026-04-13")).toBe("legacy_2237");
    });
    it("new_348 pentru emisii din 14 apr 2026 încolo", () => {
      expect(getAttestationOrdinanceVersion("2026-04-14")).toBe("new_348");
      expect(getAttestationOrdinanceVersion("2026-12-01")).toBe("new_348");
    });
    it("null pentru input invalid", () => {
      expect(getAttestationOrdinanceVersion(null)).toBe(null);
    });
  });

  describe("isInTransitionWindow", () => {
    it("true pentru 27 apr 2026", () => {
      expect(isInTransitionWindow(new Date("2026-04-27"))).toBe(true);
    });
    it("true pentru 10 oct 2026 (înainte de abrogare)", () => {
      expect(isInTransitionWindow(new Date("2026-10-10"))).toBe(true);
    });
    it("false pentru 12 oct 2026 (după abrogare)", () => {
      expect(isInTransitionWindow(new Date("2026-10-12"))).toBe(false);
    });
    it("false pentru 2027", () => {
      expect(isInTransitionWindow(new Date("2027-01-01"))).toBe(false);
    });
  });

});
