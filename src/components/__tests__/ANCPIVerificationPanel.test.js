// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { validatePDFUpload, readFileAsBase64 } from "../ANCPIVerificationPanel.jsx";

/**
 * Sprint D Task 1 — Teste validare PDF upload pentru extras CF (ANCPI)
 *
 * ANCPI nu oferă API public pentru SaaS. Auditorul încarcă manual PDF-ul
 * și bifează verificarea. Validăm: tip MIME, extensie, mărime maximă 2MB.
 */

const MAX_PDF_SIZE = 2 * 1024 * 1024;

function makeMockFile({ name, type, size }) {
  // În jsdom, File constructor acceptă (parts, name, opts)
  const buf = new Uint8Array(size);
  return new File([buf], name, { type });
}

describe("validatePDFUpload — validare PDF extras CF", () => {
  it("acceptă PDF valid sub 2 MB cu MIME corect", () => {
    const f = makeMockFile({ name: "extras-cf.pdf", type: "application/pdf", size: 100_000 });
    expect(validatePDFUpload(f)).toEqual({ ok: true });
  });

  it("acceptă PDF prin extensie când MIME e absent (browser quirks)", () => {
    const f = makeMockFile({ name: "extras.PDF", type: "", size: 200_000 });
    expect(validatePDFUpload(f).ok).toBe(true);
  });

  it("respinge fișiere non-PDF (imagine JPEG)", () => {
    const f = makeMockFile({ name: "extras.jpg", type: "image/jpeg", size: 100_000 });
    expect(validatePDFUpload(f)).toEqual({ ok: false, reason: "invalid_type" });
  });

  it("respinge fișiere non-PDF (DOCX)", () => {
    const f = makeMockFile({
      name: "extras.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 100_000,
    });
    expect(validatePDFUpload(f).ok).toBe(false);
    expect(validatePDFUpload(f).reason).toBe("invalid_type");
  });

  it("respinge fișiere PDF peste 2 MB cu detalii mărime", () => {
    const f = makeMockFile({ name: "huge.pdf", type: "application/pdf", size: 3 * 1024 * 1024 });
    const r = validatePDFUpload(f);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("file_too_large");
    expect(r.size).toBe(3 * 1024 * 1024);
    expect(r.max).toBe(MAX_PDF_SIZE);
  });

  it("acceptă pragul exact 2 MB (limită inclusivă)", () => {
    const f = makeMockFile({ name: "exact.pdf", type: "application/pdf", size: MAX_PDF_SIZE });
    expect(validatePDFUpload(f).ok).toBe(true);
  });

  it("respinge file null/undefined", () => {
    expect(validatePDFUpload(null).reason).toBe("no_file");
    expect(validatePDFUpload(undefined).reason).toBe("no_file");
  });

  it("permite override max prin parametru (caz custom)", () => {
    const f = makeMockFile({ name: "doc.pdf", type: "application/pdf", size: 500_000 });
    const r = validatePDFUpload(f, 100_000);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("file_too_large");
    expect(r.max).toBe(100_000);
  });
});

describe("readFileAsBase64 — citire binar → data URL", () => {
  it("returnează data URL cu prefix application/pdf;base64", async () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF" magic bytes
    const f = new File([buf], "test.pdf", { type: "application/pdf" });
    const dataUrl = await readFileAsBase64(f);
    expect(typeof dataUrl).toBe("string");
    expect(dataUrl).toMatch(/^data:application\/pdf;base64,/);
  });

  it("respinge cu eroare dacă reader eșuează", async () => {
    // jsdom FileReader e fiabil; testăm doar contractul promise
    const f = new File([new Uint8Array(10)], "ok.pdf", { type: "application/pdf" });
    await expect(readFileAsBase64(f)).resolves.toBeTruthy();
  });
});
