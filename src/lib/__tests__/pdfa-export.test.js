/**
 * @vitest-environment jsdom
 *
 * Teste pentru pdfa-export.js — versiunea v3 (Sprint Conformitate P0-01,
 * 6 mai 2026): PDF/A-3 cu suport atașamente AFRelationship.
 *
 * Acoperire:
 *   1. Backward-compat convertToPDFA (mapare la part=1, conformance=B)
 *   2. convertToPDFA3 cu/fără atașamente
 *   3. AFRelationship (Source / Data / Alternative / Supplement / Unspecified)
 *   4. Atașamente JSON, CSV, binar
 *   5. Metadata XMP (part, conformance, extension schema)
 *   6. Document ID + Modification ID
 *   7. exportCpePDFA3WithAttachments helper
 *   8. inspectPDFAMetadata pentru toate field-urile noi
 *
 * Bază normativă: ISO 19005-3 + Mc 001-2022 §10.
 */
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  convertToPDFA,
  convertToPDFA3,
  exportAsPDFA,
  exportCpePDFA3WithAttachments,
  inspectPDFAMetadata,
  PRODUCER_TAG,
  AF_RELATIONSHIP,
} from "../pdfa-export.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function makeMinimalPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]); // A4
  return doc.save();
}

async function makeMultiPagePdf(pages = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([595, 842]);
  }
  return doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Backward-compat convertToPDFA (Sprint 17 API)
// ─────────────────────────────────────────────────────────────────────────────

describe("convertToPDFA (backward-compat → part=1)", () => {
  it("setează metadata Title/Author/Producer corect", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA(original, {
      title: "CPE Test",
      author: "Auditor Test",
      cpeCode: "ZEP_2026_007",
    });
    expect(pdfaBytes).toBeInstanceOf(Uint8Array);
    expect(pdfaBytes.length).toBeGreaterThan(original.length);

    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.title).toBe("CPE Test");
    expect(meta.xmpProducer).toBe(PRODUCER_TAG);
  });

  it("injectează XMP packet cu pdfaid:part=1", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA(original, { title: "Doc", cpeCode: "X" });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.hasPDFAMarker).toBe(true);
    expect(meta.pdfaPart).toBe(1);
    expect(meta.pdfaConformance).toBe("B");
  });

  it("acceptă input ca Blob", async () => {
    const original = await makeMinimalPdf();
    const blob = new Blob([original], { type: "application/pdf" });
    const pdfaBytes = await convertToPDFA(blob, { title: "T" });
    expect(pdfaBytes).toBeInstanceOf(Uint8Array);
  });

  it("acceptă input ca ArrayBuffer", async () => {
    const original = await makeMinimalPdf();
    const ab = original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength);
    const pdfaBytes = await convertToPDFA(ab, { title: "T" });
    expect(pdfaBytes).toBeInstanceOf(Uint8Array);
  });

  it("default title se construiește din cpeCode dacă lipsește", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA(original, { cpeCode: "ABC" });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.title).toContain("ABC");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. convertToPDFA3 — bază (fără atașamente)
// ─────────────────────────────────────────────────────────────────────────────

describe("convertToPDFA3 — bază", () => {
  it("produce PDF cu pdfaid:part=3 default", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, { title: "CPE 3" });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.pdfaPart).toBe(3);
    expect(meta.pdfaConformance).toBe("B");
  });

  it("permite override part=2 explicit", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, { title: "T", part: 2 });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.pdfaPart).toBe(2);
  });

  it("setează keywords cu ISO 19005-3", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, { cpeCode: "TEST-001" });
    const text = new TextDecoder("latin1").decode(pdfaBytes);
    expect(text).toMatch(/ISO 19005-3/);
  });

  it("preservă numărul de pagini din PDF original", async () => {
    const original = await makeMultiPagePdf(5);
    const pdfaBytes = await convertToPDFA3(original, { title: "Multipage" });
    const reloaded = await PDFDocument.load(pdfaBytes);
    expect(reloaded.getPageCount()).toBe(5);
  });

  it("ID-ul documentului e prezent în trailer", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, { title: "T" });
    const text = new TextDecoder("latin1").decode(pdfaBytes);
    expect(text).toMatch(/\/ID\s*\[/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. convertToPDFA3 — atașamente (PDF/A-3 specific)
// ─────────────────────────────────────────────────────────────────────────────

describe("convertToPDFA3 — atașamente AFRelationship", () => {
  it("atașează JSON cu relationship Source", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "CPE cu inputs",
      cpeCode: "ZEP-001",
      attachments: [{
        filename: "inputs.json",
        bytes: '{"step1":{"address":"Str. Test 1"}}',
        mime: "application/json",
        relationship: AF_RELATIONSHIP.Source,
        description: "Date wizard CPE",
      }],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentCount).toBe(1);
    expect(meta.attachmentNames).toContain("inputs.json");
  });

  it("atașează multiple fișiere (JSON + CSV + binar)", async () => {
    const original = await makeMinimalPdf();
    const csvData = "luna,kWh\n01,1234\n02,1456";
    const binData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header
    const pdfaBytes = await convertToPDFA3(original, {
      title: "CPE bundle",
      attachments: [
        { filename: "inputs.json", bytes: "{}", mime: "application/json", relationship: AF_RELATIONSHIP.Source },
        { filename: "facturi.csv", bytes: csvData, mime: "text/csv", relationship: AF_RELATIONSHIP.Data },
        { filename: "foto.jpg", bytes: binData, mime: "image/jpeg", relationship: AF_RELATIONSHIP.Supplement },
      ],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentCount).toBe(3);
    expect(meta.attachmentNames).toEqual(
      expect.arrayContaining(["inputs.json", "facturi.csv", "foto.jpg"]),
    );
  });

  it("AFRelationship Source persistă pe Filespec dict", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [{
        filename: "src.json",
        bytes: "{}",
        mime: "application/json",
        relationship: AF_RELATIONSHIP.Source,
      }],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentRelationships).toEqual(["Source"]);
    expect(meta.hasCatalogAFArray).toBe(true);
  });

  it("AFRelationship Data persistă pe Filespec dict", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [{
        filename: "data.csv",
        bytes: "a,b\n1,2",
        mime: "text/csv",
        relationship: AF_RELATIONSHIP.Data,
      }],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentRelationships).toEqual(["Data"]);
  });

  it("default relationship = Unspecified dacă nu e setat", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [{
        filename: "x.txt",
        bytes: "hello",
        mime: "text/plain",
      }],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentRelationships).toEqual(["Unspecified"]);
  });

  it("multiple atașamente păstrează relationship distincte", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "Mix",
      attachments: [
        { filename: "a.json", bytes: "{}", mime: "application/json", relationship: AF_RELATIONSHIP.Source },
        { filename: "b.csv", bytes: "x,y", mime: "text/csv", relationship: AF_RELATIONSHIP.Data },
        { filename: "c.bin", bytes: new Uint8Array([1, 2, 3]), mime: "application/octet-stream", relationship: AF_RELATIONSHIP.Supplement },
      ],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentRelationships).toEqual(["Source", "Data", "Supplement"]);
    expect(meta.hasCatalogAFArray).toBe(true);
  });

  it("ignoră atașamente cu bytes invalid (warning silent)", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [
        { filename: "ok.txt", bytes: "OK", mime: "text/plain" },
        { filename: "bad.bin", bytes: 12345, mime: "application/octet-stream" }, // tip nesuportat
      ],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentCount).toBe(1);
    expect(meta.attachmentNames).toContain("ok.txt");
  });

  it("part=1 NU permite atașamente (warning + ignorare)", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T", part: 1,
      attachments: [{ filename: "x.json", bytes: "{}", mime: "application/json" }],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.pdfaPart).toBe(1);
    expect(meta.attachmentCount).toBe(0);
  });

  it("XMP packet conține zeph:attachments listă", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [{ filename: "x.json", bytes: "{}", mime: "application/json" }],
    });
    const text = new TextDecoder("latin1").decode(pdfaBytes);
    expect(text).toMatch(/zeph:attachments/);
    expect(text).toMatch(/zeph:filename>x\.json/);
  });

  it("XMP packet conține pdfaExtension:schemas pentru part=3 cu atașamente", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA3(original, {
      title: "T",
      attachments: [{ filename: "x.json", bytes: "{}", mime: "application/json" }],
    });
    const text = new TextDecoder("latin1").decode(pdfaBytes);
    expect(text).toMatch(/pdfaExtension:schemas/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. exportCpePDFA3WithAttachments — helper bundle
// ─────────────────────────────────────────────────────────────────────────────

describe("exportCpePDFA3WithAttachments", () => {
  it("creează bundle CPE cu inputs JSON + facturi CSV", async () => {
    const original = await makeMinimalPdf();
    const blob = new Blob([original], { type: "application/pdf" });
    const result = await exportCpePDFA3WithAttachments(blob, {
      cpeCode: "ZEP-2026-100",
      inputsJson: { step1: { address: "Test 1" }, step5: { ep: 200 } },
      invoicesCsv: "luna,kwh\n01,500\n02,600",
    });
    expect(result.attachmentCount).toBe(2);
    expect(result.size).toBeGreaterThan(original.length);
    expect(result.filename).toMatch(/PDFA3/);
  });

  it("acceptă extra atașamente cu relationship custom", async () => {
    const original = await makeMinimalPdf();
    const blob = new Blob([original], { type: "application/pdf" });
    const result = await exportCpePDFA3WithAttachments(blob, {
      cpeCode: "ZEP-001",
      extraAttachments: [
        { filename: "manifest.txt", bytes: new TextEncoder().encode("hash"), mime: "text/plain", relationship: AF_RELATIONSHIP.Supplement },
      ],
    });
    expect(result.attachmentCount).toBe(1);
  });

  it("bundle gol (fără inputs / facturi / extra) → 0 atașamente", async () => {
    const original = await makeMinimalPdf();
    const blob = new Blob([original], { type: "application/pdf" });
    const result = await exportCpePDFA3WithAttachments(blob, { cpeCode: "ZEP-002" });
    expect(result.attachmentCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. AF_RELATIONSHIP enum
// ─────────────────────────────────────────────────────────────────────────────

describe("AF_RELATIONSHIP enum", () => {
  it("conține toate cele 5 valori standard ISO 19005-3", () => {
    expect(AF_RELATIONSHIP.Source).toBe("Source");
    expect(AF_RELATIONSHIP.Data).toBe("Data");
    expect(AF_RELATIONSHIP.Alternative).toBe("Alternative");
    expect(AF_RELATIONSHIP.Supplement).toBe("Supplement");
    expect(AF_RELATIONSHIP.Unspecified).toBe("Unspecified");
  });

  it("este înghețat (read-only)", () => {
    expect(Object.isFrozen(AF_RELATIONSHIP)).toBe(true);
  });
});
