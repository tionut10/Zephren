/**
 * Teste pentru mdlpa-validator.js
 * Sprint MDLPA Faza 0 (27 apr 2026)
 */

import { describe, it, expect } from "vitest";
import {
  validateSubmissionPayload,
  isPayloadSubmittable,
  getErrorMessages,
  MAX_PAYLOAD_BYTES,
  MAX_XML_BYTES,
  MAX_PDF_BYTES,
} from "../mdlpa-validator.js";

const VALID = {
  document_type: "CPE",
  document_uuid: "550e8400-e29b-41d4-a716-446655440000",
  document_xml: "<cpe><nr>123</nr></cpe>",
  auditor_atestat: "AE12345/2024",
};

describe("validateSubmissionPayload — happy path", () => {
  it("acceptă payload minimal valid", () => {
    const r = validateSubmissionPayload(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("populează stats corect", () => {
    const r = validateSubmissionPayload(VALID);
    expect(r.stats.payload_size_bytes).toBeGreaterThan(0);
    expect(r.stats.xml_size_bytes).toBeGreaterThan(0);
    expect(r.stats.pdf_size_bytes).toBe(0);
  });

  it("acceptă toate cele 7 tipuri de document", () => {
    const types = ["CPE", "RAE", "PASAPORT", "ATESTARE", "EXTINDERE", "REINNOIRE", "RAPORT_ANUAL"];
    for (const t of types) {
      const r = validateSubmissionPayload({ ...VALID, document_type: t });
      expect(r.valid).toBe(true);
    }
  });
});

describe("validateSubmissionPayload — câmpuri obligatorii", () => {
  it.each(["document_type", "document_uuid", "document_xml", "auditor_atestat"])(
    "raportează lipsa câmpului %s",
    (field) => {
      const partial = { ...VALID };
      delete partial[field];
      const r = validateSubmissionPayload(partial);
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.field === field && e.code === "FIELD_REQUIRED")).toBe(true);
    }
  );

  it("respinge payload null", () => {
    const r = validateSubmissionPayload(null);
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("PAYLOAD_MISSING");
  });

  it("respinge payload non-obiect", () => {
    expect(validateSubmissionPayload("string").valid).toBe(false);
    expect(validateSubmissionPayload(123).valid).toBe(false);
    // Arrays tehnic sunt obiecte, dar required check pe document_type etc. va eșua
    expect(validateSubmissionPayload([]).valid).toBe(false);
  });
});

describe("validateSubmissionPayload — formate", () => {
  it("respinge document_type invalid", () => {
    const r = validateSubmissionPayload({ ...VALID, document_type: "INVALID" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "INVALID_DOC_TYPE")).toBe(true);
  });

  it("respinge UUID invalid", () => {
    const r = validateSubmissionPayload({ ...VALID, document_uuid: "not-a-uuid" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "INVALID_UUID")).toBe(true);
  });

  it("warning pe atestat în format neuzual", () => {
    const r = validateSubmissionPayload({ ...VALID, auditor_atestat: "weird-format-123" });
    expect(r.valid).toBe(true); // doar warning, nu error
    expect(r.warnings.some(w => w.code === "ATESTAT_FORMAT_WARN")).toBe(true);
  });

  it("acceptă formate de atestat valide", () => {
    const formats = ["AE12345/2024", "TC100", "AE1234", "AE99999/2026"];
    for (const a of formats) {
      const r = validateSubmissionPayload({ ...VALID, auditor_atestat: a });
      expect(r.warnings.find(w => w.code === "ATESTAT_FORMAT_WARN")).toBeUndefined();
    }
  });
});

describe("validateSubmissionPayload — XML structurat", () => {
  it("respinge XML malformat (taguri dezechilibrate)", () => {
    const r = validateSubmissionPayload({ ...VALID, document_xml: "<a><b></a>" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "XML_MALFORMED")).toBe(true);
  });

  it("respinge XML care nu începe cu <", () => {
    const r = validateSubmissionPayload({ ...VALID, document_xml: "not xml content" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "XML_MALFORMED")).toBe(true);
  });

  it("acceptă XML cu declarație", () => {
    const xml = `<?xml version="1.0"?><cpe><a/></cpe>`;
    const r = validateSubmissionPayload({ ...VALID, document_xml: xml });
    expect(r.valid).toBe(true);
  });

  it("acceptă self-closing tags", () => {
    const xml = `<cpe><a/><b/></cpe>`;
    const r = validateSubmissionPayload({ ...VALID, document_xml: xml });
    expect(r.valid).toBe(true);
  });

  it("respinge declarație XML fără ?>", () => {
    const xml = `<?xml version="1.0"<cpe/>`;
    const r = validateSubmissionPayload({ ...VALID, document_xml: xml });
    expect(r.valid).toBe(false);
  });
});

describe("validateSubmissionPayload — limite dimensionale", () => {
  it("respinge XML > 5 MB", () => {
    const huge = "<root>" + "x".repeat(MAX_XML_BYTES + 100) + "</root>";
    const r = validateSubmissionPayload({ ...VALID, document_xml: huge });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "XML_TOO_LARGE")).toBe(true);
  });

  it("respinge PDF base64 > 25 MB", () => {
    // 25 MB raw → ~33 MB base64
    const hugeB64 = "A".repeat(Math.ceil((MAX_PDF_BYTES + 1024) / 0.75));
    const r = validateSubmissionPayload({ ...VALID, document_pdf_base64: hugeB64 });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "PDF_TOO_LARGE")).toBe(true);
  });
});

describe("isPayloadSubmittable", () => {
  it("returnează true pentru payload valid", () => {
    expect(isPayloadSubmittable(VALID)).toBe(true);
  });
  it("returnează false pentru payload invalid", () => {
    expect(isPayloadSubmittable({})).toBe(false);
    expect(isPayloadSubmittable(null)).toBe(false);
  });
});

describe("getErrorMessages", () => {
  it("returnează mesaje formatate pe error fields", () => {
    const msgs = getErrorMessages({ document_type: "CPE" });
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0]).toMatch(/^\[/); // începe cu [field]
  });

  it("returnează array gol pentru payload valid", () => {
    expect(getErrorMessages(VALID)).toEqual([]);
  });
});
