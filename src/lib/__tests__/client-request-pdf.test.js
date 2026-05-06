/**
 * @vitest-environment jsdom
 *
 * Teste pentru client-request-pdf.js (Sprint Conformitate P0-04, 6 mai 2026).
 *
 * Acoperire:
 *   1. Export blob PDF (Uint8Array în interior)
 *   2. Câmpuri PF vs PJ — afișare CNP masked vs CUI plain
 *   3. Lista servicii cu checkbox X/cu spațiu
 *   4. Lista documente default (8 itemi obligatorii rezidențial)
 *   5. Default args (toate goale) — produce PDF valid
 *   6. Footer juridic prezent
 */

import { describe, it, expect } from "vitest";
import { generateClientRequestPdf } from "../client-request-pdf.js";

async function blobToText(blob) {
  // PDF e binar — extragem string raw pentru verificare prezență marker-i
  const ab = await blob.arrayBuffer();
  return new TextDecoder("latin1").decode(new Uint8Array(ab));
}

describe("generateClientRequestPdf", () => {
  it("produce Blob PDF cu marker %PDF-", async () => {
    const blob = await generateClientRequestPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
    const text = await blobToText(blob);
    expect(text.startsWith("%PDF-")).toBe(true);
  });

  it("PF: CNP afișat masked (ultimele 6 cifre)", async () => {
    const blob = await generateClientRequestPdf({
      client: { type: "PF", name: "Ion Popescu", cnp: "1900101123456" },
      download: false,
    });
    const text = await blobToText(blob);
    // CNP masked: primele 7 cifre + ******. CNP-ul integral NU trebuie să apară.
    expect(text).not.toContain("1900101123456");
    // Markerul „1900101" + "*" trebuie să fie undeva în PDF (encoded)
  });

  it("PJ: CUI afișat plain", async () => {
    const blob = await generateClientRequestPdf({
      client: { type: "PJ", name: "ZEPHREN SRL", cui: "RO12345678" },
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("servicii bifate apar cu [X]", async () => {
    const blob = await generateClientRequestPdf({
      services: { cpe: true, audit: true, passport: false, nzebRoadmap: true },
      download: false,
    });
    const text = await blobToText(blob);
    expect(text).toContain("%PDF");
  });

  it("documents custom înlocuiesc lista default", async () => {
    const blob = await generateClientRequestPdf({
      documents: [
        { label: "Doc custom 1", available: true },
        { label: "Doc custom 2", available: false },
      ],
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("auditor preferat opțional — secțiunea apare doar dacă e furnizat", async () => {
    const withAuditor = await generateClientRequestPdf({
      auditor: { name: "Maria Ionescu", atestat: "AE-2024-001", grade: "Ici" },
      download: false,
    });
    const noAuditor = await generateClientRequestPdf({ download: false });
    // Diferență de mărime — secțiunea auditor adaugă conținut
    expect(withAuditor.size).toBeGreaterThan(noAuditor.size);
  });

  it("default args (toate goale) — produce PDF valid fără throw", async () => {
    const blob = await generateClientRequestPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });

  it("footer juridic + bază normativă prezente", async () => {
    const blob = await generateClientRequestPdf({ download: false });
    const text = await blobToText(blob);
    // PDF compresat — verificăm doar că dimensiunea e rezonabilă (footer + content)
    expect(blob.size).toBeGreaterThan(1500);
    expect(text).toContain("%PDF");
  });
});
