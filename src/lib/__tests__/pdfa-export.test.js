/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { convertToPDFA, inspectPDFAMetadata, PRODUCER_TAG } from "../pdfa-export.js";

async function makeMinimalPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]); // A4
  const bytes = await doc.save();
  return bytes;
}

describe("convertToPDFA", () => {
  it("setează metadata Title/Author/Producer corect", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA(original, {
      title: "CPE Test",
      author: "Auditor Test",
      cpeCode: "ZEP_2026_007",
    });
    expect(pdfaBytes).toBeInstanceOf(Uint8Array);
    expect(pdfaBytes.length).toBeGreaterThan(original.length); // adaugă XMP

    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.title).toBe("CPE Test");
    // PDF/A standard cere Producer în XMP packet (ISO 19005-1 §6.7.3) — îl verificăm acolo
    expect(meta.xmpProducer).toBe(PRODUCER_TAG);
  });

  it("injectează XMP packet cu pdfaid:part", async () => {
    const original = await makeMinimalPdf();
    const pdfaBytes = await convertToPDFA(original, {
      title: "Doc",
      cpeCode: "X",
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.hasPDFAMarker).toBe(true);
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
