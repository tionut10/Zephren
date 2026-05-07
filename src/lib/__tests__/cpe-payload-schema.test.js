/**
 * cpe-payload-schema.test.js — Lock-in pentru validarea schemei payload CPE
 * V6 audit Pas 6+7 (7 mai 2026)
 */
import { describe, it, expect } from "vitest";
import {
  CPE_PAYLOAD_SCHEMA,
  validateCpePayload,
  formatValidationMessage,
} from "../cpe-payload-schema.js";

describe("CPE_PAYLOAD_SCHEMA — structura schemei", () => {
  it("are toate câmpurile required obligatorii Ord. MDLPA 16/2023", () => {
    const required = CPE_PAYLOAD_SCHEMA.required;
    expect(required).toContain("cpe_code");
    expect(required).toContain("auditor_name");
    expect(required).toContain("auditor_atestat");
    expect(required).toContain("auditor_grade");
    expect(required).toContain("address");
    expect(required).toContain("category_label");
    expect(required).toContain("area_ref");
    expect(required).toContain("ep_specific");
    expect(required).toContain("ep_class_real");
    // Scale clase A+..F
    ["s_ap", "s_a", "s_b", "s_c", "s_d", "s_e", "s_f"].forEach((s) => {
      expect(required).toContain(s);
    });
  });

  it("permite câmpuri suplimentare (additionalProperties=true)", () => {
    expect(CPE_PAYLOAD_SCHEMA.additionalProperties).toBe(true);
  });
});

describe("validateCpePayload — payload Bd. Tomis 287 valid", () => {
  const validPayload = {
    cpe_code: "CE-2026-01875_20260427_Stoica_Vlad_CT_215680_018_CPE",
    auditor_name: "ing. Stoica Vlad-Razvan",
    auditor_atestat: "CT-01875",
    auditor_grade: "AE Ici",
    auditor_date: "07.05.2026",
    address: "Bd. Tomis nr. 287, bl. T8, sc. B, et. 2, ap. 18",
    category_label: "Apartament in bloc",
    area_ref: "65,0",
    year: "1972",
    regime: "P+4",
    ep_specific: "856,0",
    ep_class_real: "G",
    s_ap: "60",
    s_a: "84",
    s_b: "168",
    s_c: "260",
    s_d: "352",
    s_e: "440",
    s_f: "528",
    scope: "Renovare majora",
  };

  it("payload complet trece validarea", () => {
    const r = validateCpePayload(validPayload, "cpe");
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("warnings pentru semnatura/stampila lipsa pe CPE", () => {
    const r = validateCpePayload(validPayload, "cpe");
    expect(r.warnings.length).toBeGreaterThan(0);
    // Normalize diacritice pentru comparare ("Semnătură" → "Semnatura")
    const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    expect(r.warnings.some((w) => normalize(w).toLowerCase().includes("semnatur"))).toBe(true);
  });

  it("payload cu signature_png_b64 + stamp_png_b64 → fara warnings semnatura", () => {
    const r = validateCpePayload(
      { ...validPayload, signature_png_b64: "BASE64...", stamp_png_b64: "BASE64..." },
      "cpe",
    );
    const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    expect(r.warnings.some((w) => normalize(w).toLowerCase().includes("semn"))).toBe(false);
  });

  it("data ISO YYYY-MM-DD acceptata", () => {
    const r = validateCpePayload({ ...validPayload, auditor_date: "2026-05-07" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("data DD.MM.YYYY acceptata", () => {
    const r = validateCpePayload({ ...validPayload, auditor_date: "07.05.2026" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("ep_class_real invalid → eroare", () => {
    const r = validateCpePayload({ ...validPayload, ep_class_real: "H" }, "cpe");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "ep_class_real")).toBe(true);
  });

  it("auditor_grade neacceptat → eroare", () => {
    const r = validateCpePayload({ ...validPayload, auditor_grade: "Junior" }, "cpe");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "auditor_grade")).toBe(true);
  });

  it("auditor_grade Ici (fara prefix AE) acceptat (tranzitie)", () => {
    const r = validateCpePayload({ ...validPayload, auditor_grade: "Ici" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("auditor_grade IIci acceptat", () => {
    const r = validateCpePayload({ ...validPayload, auditor_grade: "IIci" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("auditor_grade AE IIci acceptat", () => {
    const r = validateCpePayload({ ...validPayload, auditor_grade: "AE IIci" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("payload gol → multiple erori required", () => {
    const r = validateCpePayload({}, "cpe");
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(10);
  });

  it("etichetele erorilor sunt in romana cu locatia in UI", () => {
    const r = validateCpePayload({}, "cpe");
    const labels = r.errors.map((e) => e.label).join(" ");
    // Normalize diacritice pentru comparare (ă→a, ș→s, ț→t etc.)
    const normalized = labels
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    expect(normalized).toContain("auditor");
    expect(normalized).toContain("clad"); // cladirii / categoriei / etc.
    expect(labels).toContain("Pas 1"); // referință explicită locație UI
  });
});

describe("validateCpePayload — clase per utilitate (CR-2)", () => {
  const base = {
    cpe_code: "CE-TEST",
    auditor_name: "ing. Test",
    auditor_atestat: "TEST-01",
    auditor_grade: "AE Ici",
    auditor_date: "2026-05-07",
    address: "Test address",
    category_label: "Test",
    area_ref: "100,0",
    year: "2000",
    regime: "P+0",
    ep_specific: "100,0",
    ep_class_real: "C",
    s_ap: "30", s_a: "60", s_b: "100", s_c: "150", s_d: "200", s_e: "260", s_f: "325",
    scope: "Vanzare",
  };

  it("cls_acm valid → trece", () => {
    const r = validateCpePayload({ ...base, cls_acm: "G" }, "cpe");
    expect(r.ok).toBe(true);
  });

  it("cls_acm invalid → eroare", () => {
    const r = validateCpePayload({ ...base, cls_acm: "Z" }, "cpe");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "cls_acm")).toBe(true);
  });
});

describe("formatValidationMessage", () => {
  it("payload valid → mesaj OK", () => {
    const msg = formatValidationMessage({ ok: true, errors: [], warnings: [] });
    expect(msg).toContain("complet");
  });

  it("payload incomplet → lista erori", () => {
    const msg = formatValidationMessage({
      ok: false,
      errors: [
        { field: "auditor_name", label: "Numele auditorului", message: "lipseste" },
        { field: "address", label: "Adresa cladirii", message: "lipseste" },
      ],
      warnings: [],
    });
    expect(msg).toContain("auditor");
    expect(msg).toContain("Adresa");
  });

  it("trunchere la 5 erori cu mesaj suplimentar", () => {
    const errors = Array.from({ length: 10 }, (_, i) => ({
      field: `f${i}`,
      label: `Camp ${i}`,
      message: "lipseste",
    }));
    const msg = formatValidationMessage({ ok: false, errors, warnings: [] });
    expect(msg).toContain("+5");
  });
});
