/**
 * @vitest-environment jsdom
 *
 * Teste batch P2 — module noi prior-audit-parser, cpe-scope-subcategory,
 * auditor-expiry-notifier + extensii DOCUMENT_SLOTS la 18 sloturi (Sprint
 * Conformitate P2-01..P2-16, 7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  DOCUMENT_SLOTS,
  validateMagicBytes,
} from "../document-upload-store.js";
import {
  extractAuditMetrics,
  parseAndMapPriorAudit,
} from "../prior-audit-parser.js";
import {
  SCOP_CPE_HIERARCHY,
  listScopMain,
  listScopSubcategories,
  getValidityForScopAndClass,
  isValidScopCombo,
  getDefaultSubcategory,
} from "../cpe-scope-subcategory.js";
import {
  EXPIRY_THRESHOLDS,
  calcDaysUntilExpiry,
  getExpirySeverity,
  buildExpiryNotification,
} from "../auditor-expiry-notifier.js";

// ─────────────────────────────────────────────────────────────────────────────
// P2-01..P2-07 + P2-09..P2-11 — DOCUMENT_SLOTS extended
// ─────────────────────────────────────────────────────────────────────────────

describe("DOCUMENT_SLOTS extended la 18 sloturi", () => {
  it("conține 18 sloturi totale (8 standard + 10 P2)", () => {
    expect(Object.keys(DOCUMENT_SLOTS).length).toBe(18);
  });

  it("8 sloturi NR (BACS/LENI/program/BMS/contracte/lighting/audit_precedent + 1 share NR_RC)", () => {
    const nrSlots = Object.values(DOCUMENT_SLOTS).filter(s => s.scope === "nr" || s.scope === "nr_rc");
    expect(nrSlots.length).toBeGreaterThanOrEqual(7);
    expect(DOCUMENT_SLOTS.BACS_INVENTORY.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.LENI_BASELINE.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.PROGRAM_FUNCTIONARE.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.DOSAR_BMS.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.CONTRACTE_SERVICE_HVAC.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.RELEVEU_ILUMINAT.scope).toBe("nr");
    expect(DOCUMENT_SLOTS.PLAN_AMPLASAMENT.scope).toBe("nr_rc");
  });

  it("3 sloturi RC (acord + plan apartament + repartiție)", () => {
    const rcSlots = Object.values(DOCUMENT_SLOTS).filter(s => s.scope === "rc");
    expect(rcSlots.length).toBe(3);
  });

  it("BACS_INVENTORY acceptă CSV/XLSX/PDF", () => {
    expect(DOCUMENT_SLOTS.BACS_INVENTORY.accept).toContain(".csv");
    expect(DOCUMENT_SLOTS.BACS_INVENTORY.accept).toContain(".xlsx");
  });

  it("AUDIT_PRECEDENT scope all (orice clădire)", () => {
    expect(DOCUMENT_SLOTS.AUDIT_PRECEDENT.scope).toBe("all");
    expect(DOCUMENT_SLOTS.AUDIT_PRECEDENT.maxMb).toBe(30);
  });
});

describe("validateMagicBytes — extensii CSV/XLSX/JSON", () => {
  it("XLSX magic = ZIP (PK\\x03\\x04)", () => {
    const xlsxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(xlsxBytes, ".xlsx")).toBe(true);
  });

  it("CSV text — accept dacă bytes >= 4", () => {
    const csv = new Uint8Array([0x6e, 0x61, 0x6d, 0x65]); // "name"
    expect(validateMagicBytes(csv, ".csv")).toBe(true);
  });

  it("JSON text — accept dacă bytes >= 4", () => {
    const json = new Uint8Array([0x7b, 0x22, 0x61, 0x22]); // {"a"
    expect(validateMagicBytes(json, ".json")).toBe(true);
  });

  it("text < 4 bytes respins", () => {
    expect(validateMagicBytes(new Uint8Array([0x6e]), ".csv")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-08 — prior-audit-parser
// ─────────────────────────────────────────────────────────────────────────────

describe("prior-audit-parser — extractAuditMetrics", () => {
  it("extrage EP primar din text RO standard", () => {
    const text = "EP total = 245,3 kWh/m²·an. Clasa energetică: D";
    const m = extractAuditMetrics(text);
    expect(m.ep_primary).toBeCloseTo(245.3, 1);
    expect(m.ep_class).toBe("D");
  });

  it("extrage CO₂ + suprafață utilă", () => {
    const text = "Emisii CO₂ specifice: 65,4 kg/m². Suprafață utilă Au: 120 m²";
    const m = extractAuditMetrics(text);
    expect(m.co2).toBeCloseTo(65.4, 1);
    expect(m.area_useful).toBe(120);
  });

  it("extrage U_med + n50", () => {
    const text = "U med = 1,82 W/m²K. n50 = 4,5 h-1";
    const m = extractAuditMetrics(text);
    expect(m.u_med).toBeCloseTo(1.82, 1);
    expect(m.n50).toBeCloseTo(4.5, 1);
  });

  it("extrage an construcție și an audit", () => {
    const text = "Construit în 1985. Data emiterii: 15.06.2018";
    const m = extractAuditMetrics(text);
    expect(m.year_built).toBe(1985);
  });

  it("text gol → object gol", () => {
    expect(extractAuditMetrics("")).toEqual({});
    expect(extractAuditMetrics(null)).toEqual({});
  });

  it("parser robust — nu throw pe text random", () => {
    const m = extractAuditMetrics("Lorem ipsum text fără date energetice");
    expect(m).toEqual({});
  });
});

describe("prior-audit-parser — parseAndMapPriorAudit", () => {
  it("returnează stepFields gol dacă pdfjs lipsește (fallback grace)", async () => {
    // pdfjs-dist nu e în package.json — funcția returnează source:no-text-extracted
    const fakeBlob = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" });
    const r = await parseAndMapPriorAudit(fakeBlob);
    expect(r.source).toBeDefined();
    // text e null pentru că pdfjs a eșuat → stepFields gol
    expect(r.stepFields).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-15 — cpe-scope-subcategory
// ─────────────────────────────────────────────────────────────────────────────

describe("cpe-scope-subcategory", () => {
  it("SCOP_CPE_HIERARCHY conține 7 categorii main", () => {
    expect(Object.keys(SCOP_CPE_HIERARCHY).length).toBe(7);
    expect(SCOP_CPE_HIERARCHY.vanzare).toBeDefined();
    expect(SCOP_CPE_HIERARCHY.construire).toBeDefined();
  });

  it("este înghețat", () => {
    expect(Object.isFrozen(SCOP_CPE_HIERARCHY)).toBe(true);
  });

  it("listScopMain returnează toate cele 7 main", () => {
    expect(listScopMain()).toHaveLength(7);
  });

  it("listScopSubcategories pentru vânzare → 3 sub-cat", () => {
    expect(listScopSubcategories("vanzare")).toHaveLength(3);
  });

  it("getValidityForScopAndClass pentru receptie/dtac → 10 ani indiferent de clasă", () => {
    expect(getValidityForScopAndClass("receptie", "dtac", "G")).toBe(10);
    expect(getValidityForScopAndClass("receptie", "dtac", "A+")).toBe(10);
  });

  it("getValidityForScopAndClass pentru vânzare/imobil_notarial cu clasă D → 5 ani", () => {
    expect(getValidityForScopAndClass("vanzare", "imobil_notarial", "D")).toBe(5);
  });

  it("getValidityForScopAndClass pentru vânzare/imobil_notarial cu clasă A → 10 ani", () => {
    expect(getValidityForScopAndClass("vanzare", "imobil_notarial", "A")).toBe(10);
  });

  it("isValidScopCombo recunoaște combinații standard", () => {
    expect(isValidScopCombo("vanzare", "imobil_notarial")).toBe(true);
    expect(isValidScopCombo("vanzare", "fake_sub")).toBe(false);
  });

  it("getDefaultSubcategory returnează prima sub-cat", () => {
    expect(getDefaultSubcategory("vanzare")).toBe("imobil_notarial");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-16 — auditor-expiry-notifier
// ─────────────────────────────────────────────────────────────────────────────

describe("auditor-expiry-notifier", () => {
  it("EXPIRY_THRESHOLDS valori corecte", () => {
    expect(EXPIRY_THRESHOLDS.CRITICAL).toBe(30);
    expect(EXPIRY_THRESHOLDS.URGENT).toBe(90);
    expect(EXPIRY_THRESHOLDS.WARNING).toBe(180);
    expect(EXPIRY_THRESHOLDS.INFO).toBe(365);
  });

  it("calcDaysUntilExpiry — 5 ani după issue", () => {
    const issue = new Date("2024-05-01");
    const now = new Date("2024-05-01");
    const r = calcDaysUntilExpiry(issue, 5, now);
    // 5 ani = ~1826 zile (cu 1-2 ani bisecți)
    expect(r.daysUntilExpiry).toBeGreaterThan(1825);
    expect(r.daysUntilExpiry).toBeLessThan(1828);
    expect(r.isExpired).toBe(false);
  });

  it("calcDaysUntilExpiry — atestat expirat", () => {
    const issue = new Date("2018-01-01");
    const now = new Date("2024-01-01");
    const r = calcDaysUntilExpiry(issue, 5, now);
    expect(r.daysUntilExpiry).toBeLessThan(0);
    expect(r.isExpired).toBe(true);
  });

  it("getExpirySeverity nivel corect per zile", () => {
    expect(getExpirySeverity(-10)).toBe("expired");
    expect(getExpirySeverity(15)).toBe("critical");
    expect(getExpirySeverity(60)).toBe("urgent");
    expect(getExpirySeverity(120)).toBe("warning");
    expect(getExpirySeverity(300)).toBe("info");
    expect(getExpirySeverity(500)).toBe("ok");
  });

  it("buildExpiryNotification — atestat expirat → blocaj operațiuni", () => {
    const n = buildExpiryNotification({
      attestationIssueDate: "2018-01-01",
      auditorName: "Test",
      atestat: "AE-001",
      validityYears: 5,
    });
    expect(n.severity).toBe("expired");
    expect(n.shouldBlockOperations).toBe(true);
    expect(n.bannerColor).toBe("red");
    expect(n.bannerText).toContain("EXPIRAT");
    expect(n.emailPayload).toBeTruthy();
    expect(n.emailPayload.priority).toBe("high");
  });

  it("buildExpiryNotification — atestat în fereastra renewal", () => {
    // Issue 4 ani 10 luni în urmă → expiră în ~60 zile
    const issue = new Date();
    issue.setFullYear(issue.getFullYear() - 4);
    issue.setMonth(issue.getMonth() - 10);
    const n = buildExpiryNotification({
      attestationIssueDate: issue,
      validityYears: 5,
    });
    expect(n.severity).toBe("urgent");
    expect(n.bannerColor).toBe("amber");
    expect(n.shouldBlockOperations).toBe(false);
    expect(n.actionRequired).toContain("Pregătiți");
  });

  it("buildExpiryNotification — atestat valid 4 ani+ → no banner", () => {
    const issue = new Date();
    issue.setMonth(issue.getMonth() - 6);
    const n = buildExpiryNotification({
      attestationIssueDate: issue,
      validityYears: 5,
    });
    expect(n.severity).toBe("ok");
    expect(n.shouldBlockOperations).toBe(false);
    expect(n.emailPayload).toBeNull();
  });

  it("EN translation pentru expired", () => {
    const n = buildExpiryNotification({
      attestationIssueDate: "2018-01-01",
      lang: "EN",
    });
    expect(n.bannerText).toContain("EXPIRED");
    expect(n.actionRequired).toContain("re-attestation");
  });
});
