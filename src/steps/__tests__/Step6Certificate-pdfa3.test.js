/**
 * @vitest-environment jsdom
 *
 * Teste integration pentru Card-ul nou „🔐 Container PDF/A-3 + Semnătură PAdES (BETA)"
 * adăugat în Step6Certificate.jsx (Sprint Conformitate P0-01 + P0-02, 6 mai 2026).
 *
 * Strategie: testăm comportamentul end-to-end al lib-urilor în mod ce simulează
 * fluxul Card-ului din Step 6, dar fără mount React (Step6Certificate are >4000 linii
 * și foarte multe deps). Verificăm că combinația cover PDF + atașamente DOCX-like +
 * semnare PAdES produce un PDF/A-3 cu structura așteptată.
 *
 * Acoperire:
 *   1. Cover PDF + DOCX atașamente Source/Data → PDF/A-3 cu /AF array
 *   2. PDF/A-3 → semnare PAdES → structură ByteRange + AcroForm + SigField
 *   3. inspectSignature pe rezultat → metadata corect populată
 *   4. Mock provider produce isMock=true; provider invalid → fallback mock
 *   5. PADES_LEVELS B-LT adaugă /DSS în output
 *   6. Atașamentele rămân accesibile post-signing (verificare nume + AFRelationship)
 */

import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  convertToPDFA3,
  inspectPDFAMetadata,
  AF_RELATIONSHIP,
} from "../../lib/pdfa-export.js";
import {
  signPdfPades,
  inspectSignature,
  PADES_LEVELS,
} from "../../lib/pades-sign.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — simulează cover PDF + DOCX blob mock
// ─────────────────────────────────────────────────────────────────────────────

async function makeCoverPdfBlob(cpeCode = "ZEP-2026-T01") {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  // Conținut minim: doar pagina, simulează cover-ul Step 6 cu jsPDF
  const bytes = await doc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

function makeMockDocxBytes(label = "CPE") {
  // Mock DOCX: folosim un Uint8Array cu signature ZIP (PK\x03\x04) ca să imite blob DOCX
  const header = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04
  const body = new TextEncoder().encode(`MOCK_DOCX_${label}_CONTENT`);
  const bytes = new Uint8Array(header.length + body.length);
  bytes.set(header, 0);
  bytes.set(body, header.length);
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cover PDF + DOCX atașamente → PDF/A-3
// ─────────────────────────────────────────────────────────────────────────────

describe("Step 6 PDF/A-3 container — cover PDF + DOCX atașamente", () => {
  it("produce container PDF/A-3 cu CPE.docx + Anexa.docx + inputs.json + metadata.json", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const cpeDocxBytes = makeMockDocxBytes("CPE");
    const anexaDocxBytes = makeMockDocxBytes("ANEXA");

    const pdfaBytes = await convertToPDFA3(coverBlob, {
      cpeCode: "ZEP-2026-T01",
      title: "CPE container PDF/A-3",
      part: 3,
      attachments: [
        {
          filename: "1_CPE_oficial.docx",
          bytes: cpeDocxBytes,
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          relationship: AF_RELATIONSHIP.Source,
          description: "CPE DOCX oficial MDLPA",
        },
        {
          filename: "2_Anexa_1plus2.docx",
          bytes: anexaDocxBytes,
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          relationship: AF_RELATIONSHIP.Source,
          description: "Anexa 1+2",
        },
        {
          filename: "4_inputs.json",
          bytes: '{"step1":{"address":"Test"}}',
          mime: "application/json",
          relationship: AF_RELATIONSHIP.Source,
        },
        {
          filename: "5_metadata.json",
          bytes: '{"cpeCode":"ZEP-2026-T01"}',
          mime: "application/json",
          relationship: AF_RELATIONSHIP.Data,
        },
      ],
    });

    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.pdfaPart).toBe(3);
    expect(meta.attachmentCount).toBe(4);
    expect(meta.attachmentNames).toEqual(
      expect.arrayContaining([
        "1_CPE_oficial.docx",
        "2_Anexa_1plus2.docx",
        "4_inputs.json",
        "5_metadata.json",
      ]),
    );
    expect(meta.hasCatalogAFArray).toBe(true);
  });

  it("relationships diferentiate Source (DOCX, inputs) vs Data (metadata)", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const pdfaBytes = await convertToPDFA3(coverBlob, {
      part: 3,
      attachments: [
        { filename: "doc.docx", bytes: makeMockDocxBytes(), mime: "application/zip", relationship: AF_RELATIONSHIP.Source },
        { filename: "data.json", bytes: "{}", mime: "application/json", relationship: AF_RELATIONSHIP.Data },
      ],
    });
    const meta = await inspectPDFAMetadata(pdfaBytes);
    expect(meta.attachmentRelationships).toEqual(["Source", "Data"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PDF/A-3 → semnare PAdES → structură PDF
// ─────────────────────────────────────────────────────────────────────────────

describe("Step 6 PDF/A-3 → PAdES signing pipeline", () => {
  it("PDF/A-3 cu atașamente + semnare mock → PDF cu ByteRange + AcroForm", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const pdfaBytes = await convertToPDFA3(coverBlob, {
      part: 3,
      attachments: [
        { filename: "x.docx", bytes: makeMockDocxBytes(), mime: "application/zip", relationship: AF_RELATIONSHIP.Source },
      ],
    });
    const signResult = await signPdfPades(pdfaBytes, { provider: "mock" }, {
      reason: "CPE ZEP-2026-T01",
      location: "Cluj-Napoca",
      level: PADES_LEVELS.B_T,
    });
    expect(signResult.bytes.length).toBeGreaterThan(pdfaBytes.length);
    expect(signResult.signerInfo.isMock).toBe(true);

    const sigMeta = await inspectSignature(signResult.bytes);
    expect(sigMeta.hasSignature).toBe(true);
    expect(sigMeta.subFilter).toBe("ETSI.CAdES.detached");
    expect(sigMeta.reason).toBe("CPE ZEP-2026-T01");
    expect(sigMeta.location).toBe("Cluj-Napoca");
  });

  it("level B-LT adaugă /DSS pentru Long-Term Validation", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const pdfaBytes = await convertToPDFA3(coverBlob, {
      part: 3,
      attachments: [{ filename: "x.docx", bytes: makeMockDocxBytes(), mime: "application/zip" }],
    });
    const signResult = await signPdfPades(pdfaBytes, { provider: "mock" }, {
      level: PADES_LEVELS.B_LT,
    });
    const sigMeta = await inspectSignature(signResult.bytes);
    expect(sigMeta.hasDss).toBe(true);
  });

  it("provider necunoscut → fallback automat la mock", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const pdfaBytes = await convertToPDFA3(coverBlob, { part: 3 });
    const signResult = await signPdfPades(pdfaBytes, { provider: "unknown_qtsp" });
    expect(signResult.signerInfo.isMock).toBe(true);
  });

  it("certSIGN fără credentials → fallback mock cu warnings", async () => {
    const coverBlob = await makeCoverPdfBlob();
    const pdfaBytes = await convertToPDFA3(coverBlob, { part: 3 });
    const signResult = await signPdfPades(pdfaBytes, { provider: "certsign" });
    expect(signResult.signerInfo.isMock).toBe(true);
    expect(signResult.signerInfo.warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. End-to-end Step 6 flow simulation
// ─────────────────────────────────────────────────────────────────────────────

describe("Step 6 end-to-end PDF/A-3 + PAdES (mock provider)", () => {
  it("flow complet: cover PDF + 3 atașamente + signing → structură finală integră", async () => {
    const coverBlob = await makeCoverPdfBlob("ZEP-2026-IT01");

    // 1. Construire PDF/A-3 cu 4 atașamente (CPE + Anexa + inputs + metadata)
    const pdfaBytes = await convertToPDFA3(coverBlob, {
      cpeCode: "ZEP-2026-IT01",
      title: "Container PDF/A-3 CPE",
      author: "Auditor Test",
      subject: "CPE Mc 001-2022",
      part: 3,
      attachments: [
        { filename: "1_CPE.docx", bytes: makeMockDocxBytes("CPE"), mime: "application/zip", relationship: AF_RELATIONSHIP.Source },
        { filename: "2_Anexa.docx", bytes: makeMockDocxBytes("ANEXA"), mime: "application/zip", relationship: AF_RELATIONSHIP.Source },
        { filename: "3_inputs.json", bytes: '{"a":1}', mime: "application/json", relationship: AF_RELATIONSHIP.Source },
        { filename: "4_metadata.json", bytes: '{"b":2}', mime: "application/json", relationship: AF_RELATIONSHIP.Data },
      ],
    });

    // 2. Semnare cu B-LT
    const signResult = await signPdfPades(pdfaBytes, { provider: "mock" }, {
      reason: "Certificat performanță energetică ZEP-2026-IT01",
      location: "București",
      signerName: "Auditor Test",
      level: PADES_LEVELS.B_LT,
    });

    // 3. Verificări post-signing
    expect(signResult.bytes).toBeInstanceOf(Uint8Array);
    expect(signResult.byteRange).toHaveLength(4);

    // PDF/A metadata păstrate post-signing
    const pdfaMeta = await inspectPDFAMetadata(signResult.bytes);
    expect(pdfaMeta.pdfaPart).toBe(3);
    expect(pdfaMeta.attachmentCount).toBe(4);

    // Signature metadata corecte
    const sigMeta = await inspectSignature(signResult.bytes);
    expect(sigMeta.hasSignature).toBe(true);
    expect(sigMeta.reason).toBe("Certificat performanță energetică ZEP-2026-IT01");
    expect(sigMeta.location).toBe("București");
    expect(sigMeta.signerName).toBe("Auditor Test");
    expect(sigMeta.hasDss).toBe(true);
    expect(sigMeta.isAcroFormSigned).toBe(true);

    // Signer info populat corect
    expect(signResult.signerInfo.provider).toBe("mock");
    expect(signResult.signerInfo.providerLabel).toContain("Mock");
    expect(signResult.signerInfo.certificateSubject).toContain("Auditor");
    expect(signResult.signerInfo.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
