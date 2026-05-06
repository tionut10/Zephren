/**
 * @vitest-environment jsdom
 *
 * Teste pentru anexa-mdlpa-xml.js (Sprint Conformitate P1-03, 6-7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  ANEXA_MDLPA_XML_NAMESPACE,
  ANEXA_MDLPA_XML_VERSION,
  generateAnexaMdlpaXml,
  validateAnexaMdlpaXml,
} from "../anexa-mdlpa-xml.js";

describe("Constante XML Anexa MDLPA", () => {
  it("namespace + version provizoriu", () => {
    expect(ANEXA_MDLPA_XML_NAMESPACE).toMatch(/^https?:\/\/portal\.mdlpa/);
    expect(ANEXA_MDLPA_XML_VERSION).toContain("pending-mdlpa");
  });
});

describe("generateAnexaMdlpaXml — date complete", () => {
  it("produce XML cu structură 7 secțiuni", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "ZEP-2026-T01",
      building: {
        address: "Str. Test 1",
        category: "RI",
        areaUseful: 100,
        scopCpe: "vanzare",
        locality: "Iași",
        county: "Iași",
        cadastralNumber: "12345",
        latitude: 47.16,
        longitude: 27.59,
      },
      auditor: {
        name: "Maria Ionescu",
        atestat: "AE-2024-001",
        grade: "Ici",
      },
      issueDate: new Date("2026-05-06"),
      validityYears: 10,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.xml).toContain('<?xml version="1.0"');
    expect(r.xml).toContain(`xmlns="${ANEXA_MDLPA_XML_NAMESPACE}"`);
    expect(r.xml).toContain("<identificareCpe>");
    expect(r.xml).toContain("<cladire>");
    expect(r.xml).toContain("<geometrie>");
    expect(r.xml).toContain("<performantaEnergetica>");
    expect(r.xml).toContain("<sistemeServicii>");
    expect(r.xml).toContain("<emisiiCO2>");
    expect(r.xml).toContain("<auditorEnergetic>");
  });

  it("calculează expiryDate corect (issueDate + validityYears)", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b" },
      issueDate: new Date("2026-05-06"),
      validityYears: 5,
    });
    expect(r.xml).toContain("<dataElaborare>2026-05-06</dataElaborare>");
    expect(r.xml).toContain("<dataExpirare>2031-05-06</dataExpirare>");
    expect(r.xml).toContain("<valabilitateAni>5</valabilitateAni>");
  });

  it("escape XML pentru caractere speciale (& < >)", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X & Y",
      building: { address: "<test>", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b" },
    });
    expect(r.xml).toContain("X &amp; Y");
    expect(r.xml).toContain("&lt;test&gt;");
  });

  it("auditor.grade fallback la auditorAttestation.gradeMdlpa", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b" },
      auditorAttestation: { gradeMdlpa: "IIci", issueDate: "2025-06-01" },
    });
    expect(r.xml).toContain("<gradAtestat>IIci</gradAtestat>");
    // ordin auto-detect: pre-14.IV.2026 → 2237/2010
    expect(r.xml).toContain("Ord. MDLPA 2237/2010");
  });

  it("ordinance auto-detect post-14.IV.2026 → 348/2026", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b", grade: "Ici" },
      auditorAttestation: { issueDate: "2026-05-01" },
    });
    expect(r.xml).toContain("Ord. MDLPA 348/2026");
  });

  it("inserează RER + EP_nren dacă renewSummary disponibil", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b" },
      renewSummary: {
        ep_adjusted_m2: 80,
        ep_nren_m2: 60,
        ep_ren_m2: 20,
        rer: 0.25,
        co2_adjusted_m2: 18,
      },
    });
    expect(r.xml).toContain("<RER unit=\"procent\">25.00</RER>");
    expect(r.xml).toContain("<energiePrimaraNeregenerabila");
    expect(r.xml).toContain("<surseRegenerabile>");
  });

  it("include semnătură electronică dacă signature setată", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", areaUseful: 100 },
      auditor: { name: "a", atestat: "b" },
      signature: {
        type: "PAdES-B-LT",
        signedAt: "2026-05-06T12:00:00Z",
        qtspProvider: "certSIGN PARAPHE",
      },
    });
    expect(r.xml).toContain("<semnaturaElectronica>");
    expect(r.xml).toContain("<tip>PAdES-B-LT</tip>");
    expect(r.xml).toContain("eIDAS 2");
  });
});

describe("generateAnexaMdlpaXml — validare", () => {
  it("respinge cpeCode lipsă cu eroare path", () => {
    const r = generateAnexaMdlpaXml({
      building: { address: "x", category: "RI" },
      auditor: { name: "a", atestat: "b" },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === "/cpeCode")).toBe(true);
  });

  it("respinge category necunoscută", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "ZZ" },
      auditor: { name: "a", atestat: "b" },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === "/building/category")).toBe(true);
  });

  it("respinge scopCpe necunoscut", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "x", category: "RI", scopCpe: "altceva" },
      auditor: { name: "a", atestat: "b" },
    });
    expect(r.errors.some(e => e.path === "/building/scopCpe")).toBe(true);
  });

  it("acceptă toate cele 11 categorii standard Mc 001-2022", () => {
    const cats = ["RI", "RC", "RA", "BC", "BI", "ED", "SP", "HC", "CO", "SA", "AL"];
    for (const cat of cats) {
      const r = generateAnexaMdlpaXml({
        cpeCode: "X",
        building: { address: "x", category: cat, areaUseful: 100 },
        auditor: { name: "a", atestat: "b" },
      });
      expect(r.valid).toBe(true);
    }
  });
});

describe("validateAnexaMdlpaXml", () => {
  it("acceptă XML generat valid", () => {
    const r = generateAnexaMdlpaXml({
      cpeCode: "X",
      building: { address: "y", category: "RI", areaUseful: 100 },
      auditor: { name: "A", atestat: "B" },
    });
    const v = validateAnexaMdlpaXml(r.xml);
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("respinge XML lipsă", () => {
    const v = validateAnexaMdlpaXml(null);
    expect(v.valid).toBe(false);
  });

  it("respinge XML fără namespace MDLPA", () => {
    const v = validateAnexaMdlpaXml('<?xml version="1.0"?><anexaCpe><codUnic>X</codUnic><numarAtestat>Y</numarAtestat></anexaCpe>');
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("namespace"))).toBe(true);
  });

  it("respinge XML fără declarație XML", () => {
    const v = validateAnexaMdlpaXml(`<anexaCpe xmlns="${ANEXA_MDLPA_XML_NAMESPACE}"><codUnic>X</codUnic><numarAtestat>Y</numarAtestat></anexaCpe>`);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("declarație XML"))).toBe(true);
  });
});
