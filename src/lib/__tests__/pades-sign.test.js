/**
 * @vitest-environment jsdom
 *
 * Teste pentru pades-sign.js — Sprint Conformitate P0-02 (6 mai 2026).
 *
 * Acoperire:
 *   1. PADES_SUBFILTERS + PADES_LEVELS + SIGNATURE_PLACEHOLDER_SIZE constante
 *   2. prepareSignaturePlaceholder — AcroForm + SigField + Sig dict + DSS (B-LT)
 *   3. locateContentsRange — găsește offset /Contents <hex>
 *   4. rewriteByteRangeInPdf — înlocuiește placeholder cu valori reale
 *   5. hashPdfByteRange — SHA-256 over byte ranges
 *   6. embedCmsSignature — replace /Contents placeholder cu CMS hex
 *   7. signPdfPades — orchestrator complet (mock + structure verification)
 *   8. inspectSignature — extract metadata post-signing
 *
 * Bază normativă: ETSI EN 319 142-1 (PAdES baseline) + eIDAS 2 + Legea 214/2024.
 */
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  PADES_SUBFILTERS,
  PADES_LEVELS,
  SIGNATURE_PLACEHOLDER_SIZE,
  prepareSignaturePlaceholder,
  locateContentsRange,
  rewriteByteRangeInPdf,
  hashPdfByteRange,
  embedCmsSignature,
  signPdfPades,
  inspectSignature,
} from "../pades-sign.js";

async function makeMinimalPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  return doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Constante
// ─────────────────────────────────────────────────────────────────────────────

describe("PADES constants", () => {
  it("PADES_SUBFILTERS conține valori standard ETSI EN 319 142", () => {
    expect(PADES_SUBFILTERS.ETSI_CADES_DETACHED).toBe("ETSI.CAdES.detached");
    expect(PADES_SUBFILTERS.ETSI_RFC3161).toBe("ETSI.RFC3161");
    expect(PADES_SUBFILTERS.ADBE_PKCS7_DETACHED).toBe("adbe.pkcs7.detached");
    expect(Object.isFrozen(PADES_SUBFILTERS)).toBe(true);
  });

  it("PADES_LEVELS conține cele 4 niveluri baseline", () => {
    expect(PADES_LEVELS.B_B).toBe("B-B");
    expect(PADES_LEVELS.B_T).toBe("B-T");
    expect(PADES_LEVELS.B_LT).toBe("B-LT");
    expect(PADES_LEVELS.B_LTA).toBe("B-LTA");
    expect(Object.isFrozen(PADES_LEVELS)).toBe(true);
  });

  it("SIGNATURE_PLACEHOLDER_SIZE e suficient pentru cert chain medium", () => {
    expect(SIGNATURE_PLACEHOLDER_SIZE).toBeGreaterThanOrEqual(8192);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. prepareSignaturePlaceholder
// ─────────────────────────────────────────────────────────────────────────────

describe("prepareSignaturePlaceholder", () => {
  it("adaugă AcroForm + SigField + Sig dict pentru B-T default", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const refs = prepareSignaturePlaceholder(doc, { level: PADES_LEVELS.B_T });
    expect(refs.sigDictRef).toBeDefined();
    expect(refs.fieldRef).toBeDefined();

    const out = await doc.save({ useObjectStreams: false });
    const text = new TextDecoder("latin1").decode(out);
    expect(text).toContain("/AcroForm");
    expect(text).toContain("/SigFlags");
    expect(text).toContain("/FT /Sig");
    expect(text).toContain("/SubFilter /ETSI.CAdES.detached");
  });

  it("adaugă /DSS dictionary pentru level B-LT", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { level: PADES_LEVELS.B_LT });
    const out = await doc.save({ useObjectStreams: false });
    const text = new TextDecoder("latin1").decode(out);
    expect(text).toMatch(/\/DSS\s/);
  });

  it("nu adaugă /DSS pentru level B-T", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { level: PADES_LEVELS.B_T });
    const out = await doc.save({ useObjectStreams: false });
    const text = new TextDecoder("latin1").decode(out);
    expect(text).not.toMatch(/\/DSS\s/);
  });

  it("setează reason și location în Sig dict", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, {
      reason: "CPE Mc 001-2022",
      location: "Cluj-Napoca",
    });
    const out = await doc.save({ useObjectStreams: false });
    const meta = await inspectSignature(out);
    expect(meta.reason).toBe("CPE Mc 001-2022");
    expect(meta.location).toBe("Cluj-Napoca");
  });

  it("placeholder /Contents are mărimea cerută în hex", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { placeholderSize: 4096 });
    const out = await doc.save({ useObjectStreams: false });
    const meta = await inspectSignature(out);
    expect(meta.contentsLength).toBe(4096);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. locateContentsRange
// ─────────────────────────────────────────────────────────────────────────────

describe("locateContentsRange", () => {
  it("găsește offset-urile /Contents <hex> placeholder", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { placeholderSize: 1024 });
    const out = await doc.save({ useObjectStreams: false });
    const range = locateContentsRange(out);
    expect(range).not.toBeNull();
    expect(range.byteRange).toHaveLength(4);
    expect(range.byteRange[0]).toBe(0);
    expect(range.byteRange[1]).toBeGreaterThan(0);
    expect(range.byteRange[3]).toBeGreaterThan(0);
    expect(range.contentsHexLength).toBe(1024);
  });

  it("returnează null pentru PDF fără /Contents", async () => {
    const bytes = await makeMinimalPdf();
    const range = locateContentsRange(bytes);
    expect(range).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. rewriteByteRangeInPdf
// ─────────────────────────────────────────────────────────────────────────────

describe("rewriteByteRangeInPdf", () => {
  it("înlocuiește /ByteRange placeholder fixed-width cu valori reale (după expand)", async () => {
    const { expandByteRangePlaceholder } = await import("../pades-sign.js");
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { placeholderSize: 512 });
    const out = await doc.save({ useObjectStreams: false });
    // Pas obligatoriu: expandează `[0 0 0 0]` la `[0 9999999999 ...]` pentru spațiu suficient
    const expanded = expandByteRangePlaceholder(out);
    const range = locateContentsRange(expanded);
    const rewritten = rewriteByteRangeInPdf(expanded, range.byteRange);
    const meta = await inspectSignature(rewritten);
    expect(meta.byteRange).toEqual(range.byteRange);
  });

  it("aruncă eroare dacă noul ByteRange depășește lungimea placeholder-ului", () => {
    // Placeholder mic intenționat — valori reale prea mari
    const fakeBytes = new TextEncoder().encode("/ByteRange [0 0]\n/Contents <00>");
    expect(() =>
      rewriteByteRangeInPdf(fakeBytes, [0, 99999999, 99999999, 99999999]),
    ).toThrow(/too long/);
  });

  it("expandByteRangePlaceholder transformă [0 0 0 0] la [0 9999999999 9999999999 9999999999]", async () => {
    const { expandByteRangePlaceholder } = await import("../pades-sign.js");
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc);
    const out = await doc.save({ useObjectStreams: false });
    const expanded = expandByteRangePlaceholder(out);
    const text = new TextDecoder("latin1").decode(expanded);
    expect(text).toContain("/ByteRange [0 9999999999 9999999999 9999999999]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. hashPdfByteRange
// ─────────────────────────────────────────────────────────────────────────────

describe("hashPdfByteRange", () => {
  it("calculează SHA-256 32 octeți peste regiunile ByteRange", async () => {
    const bytes = new Uint8Array(1000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const hash = await hashPdfByteRange(bytes, [0, 100, 200, 300]);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it("hash-uri diferite pentru regiuni diferite", async () => {
    const bytes = new Uint8Array(1000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const h1 = await hashPdfByteRange(bytes, [0, 100, 200, 300]);
    const h2 = await hashPdfByteRange(bytes, [0, 50, 100, 200]);
    const h1Hex = Array.from(h1).map(b => b.toString(16).padStart(2, "0")).join("");
    const h2Hex = Array.from(h2).map(b => b.toString(16).padStart(2, "0")).join("");
    expect(h1Hex).not.toBe(h2Hex);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. embedCmsSignature
// ─────────────────────────────────────────────────────────────────────────────

describe("embedCmsSignature", () => {
  it("înlocuiește placeholder hex cu CMS real, păstrând lungimea", async () => {
    const bytes = await makeMinimalPdf();
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    prepareSignaturePlaceholder(doc, { placeholderSize: 512 });
    const out = await doc.save({ useObjectStreams: false });
    const range = locateContentsRange(out);
    const cmsHex = "ab".repeat(50); // 100 hex chars
    const result = embedCmsSignature(out, cmsHex, range.contentsHexStart, range.contentsHexLength);
    expect(result.length).toBe(out.length);

    const meta = await inspectSignature(result);
    expect(meta.contentsLength).toBe(512);
  });

  it("aruncă eroare dacă CMS hex e mai mare decât placeholder-ul", () => {
    const bytes = new Uint8Array(100);
    expect(() =>
      embedCmsSignature(bytes, "f".repeat(200), 0, 100),
    ).toThrow(/too long/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. signPdfPades — orchestrator complet (cu mock provider)
// ─────────────────────────────────────────────────────────────────────────────

describe("signPdfPades (mock provider)", () => {
  it("produce PDF semnat cu structură PAdES B-T validă", async () => {
    const bytes = await makeMinimalPdf();
    const result = await signPdfPades(bytes, { provider: "mock" });

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(bytes.length);
    expect(result.byteRange).toHaveLength(4);
    expect(result.signerInfo.provider).toBe("mock");
    expect(result.signerInfo.isMock).toBe(true);
    expect(result.signerInfo.warnings.length).toBeGreaterThan(0);
  });

  it("inspectSignature pe PDF semnat returnează metadata corect", async () => {
    const bytes = await makeMinimalPdf();
    const result = await signPdfPades(bytes, { provider: "mock" }, {
      reason: "CPE locuință",
      location: "Iași",
    });
    const meta = await inspectSignature(result.bytes);
    expect(meta.hasSignature).toBe(true);
    expect(meta.subFilter).toBe("ETSI.CAdES.detached");
    expect(meta.filter).toBe("Adobe.PPKLite");
    expect(meta.reason).toBe("CPE locuință");
    expect(meta.location).toBe("Iași");
    expect(meta.byteRange).toHaveLength(4);
    expect(meta.isAcroFormSigned).toBe(true);
  });

  it("level B-LT adaugă /DSS în output", async () => {
    const bytes = await makeMinimalPdf();
    const result = await signPdfPades(bytes, { provider: "mock" }, {
      level: PADES_LEVELS.B_LT,
    });
    const meta = await inspectSignature(result.bytes);
    expect(meta.hasDss).toBe(true);
  });

  it("acceptă input ca Blob", async () => {
    const bytes = await makeMinimalPdf();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const result = await signPdfPades(blob, { provider: "mock" });
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it("provider necunoscut → fallback la mock + warning", async () => {
    const bytes = await makeMinimalPdf();
    const result = await signPdfPades(bytes, { provider: "nonexistent_provider" });
    expect(result.signerInfo.isMock).toBe(true);
  });

  it("certSIGN fără credentials → fallback la mock", async () => {
    const bytes = await makeMinimalPdf();
    // Fără env vars CERTSIGN_*, certSIGN throw → fallback mock
    const result = await signPdfPades(bytes, { provider: "certsign" });
    expect(result.signerInfo.isMock).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. inspectSignature — edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("inspectSignature", () => {
  it("returnează hasSignature=false pentru PDF nesemnat", async () => {
    const bytes = await makeMinimalPdf();
    const meta = await inspectSignature(bytes);
    expect(meta.hasSignature).toBe(false);
    expect(meta.byteRange).toBeNull();
  });
});
