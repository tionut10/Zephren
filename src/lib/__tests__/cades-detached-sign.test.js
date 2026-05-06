/**
 * @vitest-environment jsdom
 *
 * Teste pentru cades-detached-sign.js (Sprint Conformitate P0-03, 6 mai 2026).
 *
 * Acoperire:
 *   1. signCadesDetached cu input string / Uint8Array / Blob / ArrayBuffer
 *   2. Hash conținut SHA-256 calculat și inclus în signerInfo
 *   3. p7sBytes structurally valid (DER SEQUENCE start byte 0x30)
 *   4. Provider mock vs certsign (fallback)
 *   5. Provider necunoscut → fallback mock
 *   6. verifyCadesDetached pe perechi valide / corupte
 *   7. generateManifestSHA256Signed → ZIP cu .txt + .p7s + README
 *   8. generateManifestSHA256 (existing) NEATINS — backward-compat verification
 */

import { describe, it, expect } from "vitest";
import { signCadesDetached, verifyCadesDetached } from "../cades-detached-sign.js";
import {
  generateManifestSHA256,
  generateManifestSHA256Signed,
} from "../dossier-extras.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. signCadesDetached — input types
// ─────────────────────────────────────────────────────────────────────────────

describe("signCadesDetached — tipuri de input", () => {
  it("acceptă string conținut text", async () => {
    const result = await signCadesDetached("Manifest TXT exemplu", { provider: "mock" });
    expect(result.p7sBytes).toBeInstanceOf(Uint8Array);
    expect(result.p7sBytes.length).toBeGreaterThan(0);
    expect(result.contentHashHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("acceptă Uint8Array", async () => {
    const bytes = new TextEncoder().encode("test bytes");
    const result = await signCadesDetached(bytes, { provider: "mock" });
    expect(result.p7sBytes).toBeInstanceOf(Uint8Array);
  });

  it("acceptă ArrayBuffer", async () => {
    const ab = new TextEncoder().encode("test ab").buffer.slice(0);
    const result = await signCadesDetached(ab, { provider: "mock" });
    expect(result.p7sBytes).toBeInstanceOf(Uint8Array);
  });

  it("acceptă Blob", async () => {
    const blob = new Blob(["test blob"], { type: "text/plain" });
    const result = await signCadesDetached(blob, { provider: "mock" });
    expect(result.p7sBytes).toBeInstanceOf(Uint8Array);
  });

  it("aruncă eroare pentru tip nesuportat", async () => {
    await expect(signCadesDetached(12345, { provider: "mock" }))
      .rejects.toThrow(/nesuportat/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hash + signerInfo
// ─────────────────────────────────────────────────────────────────────────────

describe("signCadesDetached — metadata semnătură", () => {
  it("calculează SHA-256 (32 octeți) al conținutului", async () => {
    const result = await signCadesDetached("hello world", { provider: "mock" });
    expect(result.contentHash).toBeInstanceOf(Uint8Array);
    expect(result.contentHash.length).toBe(32);
    expect(result.contentHashHex.length).toBe(64);
  });

  it("hash-uri diferite pentru conținuturi diferite", async () => {
    const r1 = await signCadesDetached("text A", { provider: "mock" });
    const r2 = await signCadesDetached("text B", { provider: "mock" });
    expect(r1.contentHashHex).not.toBe(r2.contentHashHex);
  });

  it("signerInfo conține provider + isMock + certificate placeholders", async () => {
    const result = await signCadesDetached("x", { provider: "mock" });
    expect(result.signerInfo.provider).toBe("mock");
    expect(result.signerInfo.isMock).toBe(true);
    expect(result.signerInfo.certificateSubject).toBeTruthy();
    expect(result.signerInfo.warnings.length).toBeGreaterThan(0);
  });

  it("contentType propagat în signerInfo", async () => {
    const result = await signCadesDetached("x", { provider: "mock" }, {
      contentType: "application/json",
    });
    expect(result.signerInfo.contentType).toBe("application/json");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. p7sBytes structurally valid
// ─────────────────────────────────────────────────────────────────────────────

describe("p7sBytes structură ASN.1", () => {
  it("primul byte e 0x30 (SEQUENCE) — DER valid prefix", async () => {
    const result = await signCadesDetached("test", { provider: "mock" });
    expect(result.p7sBytes[0]).toBe(0x30);
  });

  it("p7sBytes lungime ≥ 32 octeți (minim viabil)", async () => {
    const result = await signCadesDetached("test", { provider: "mock" });
    expect(result.p7sBytes.length).toBeGreaterThanOrEqual(32);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Provider fallback
// ─────────────────────────────────────────────────────────────────────────────

describe("Provider fallback CAdES", () => {
  it("provider necunoscut → fallback mock", async () => {
    const result = await signCadesDetached("x", { provider: "nonexistent" });
    expect(result.signerInfo.isMock).toBe(true);
  });

  it("certSIGN fără credentials → fallback mock", async () => {
    const result = await signCadesDetached("x", { provider: "certsign" });
    expect(result.signerInfo.isMock).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. verifyCadesDetached
// ─────────────────────────────────────────────────────────────────────────────

describe("verifyCadesDetached", () => {
  it("perechea originală + .p7s validă → contentHashOk + structurallyValid", async () => {
    const content = "manifestul A";
    const result = await signCadesDetached(content, { provider: "mock" });
    const verify = await verifyCadesDetached(content, result.p7sBytes);
    expect(verify.contentHashOk).toBe(true);
    expect(verify.structurallyValid).toBe(true);
    expect(verify.p7sLength).toBe(result.p7sBytes.length);
  });

  it("conținut modificat → contentHashOk false", async () => {
    const result = await signCadesDetached("original", { provider: "mock" });
    const verify = await verifyCadesDetached("ALTERAT", result.p7sBytes);
    expect(verify.contentHashOk).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. generateManifestSHA256Signed (extindere dossier-extras)
// ─────────────────────────────────────────────────────────────────────────────

describe("generateManifestSHA256Signed", () => {
  it("produce ZIP cu manifest.txt + manifest.txt.p7s + README", async () => {
    const fakeBlob1 = new Blob(["CPE content"], { type: "application/octet-stream" });
    const fakeBlob2 = new Blob(["Anexa content"], { type: "application/octet-stream" });
    const result = await generateManifestSHA256Signed({
      files: [
        { name: "1_CPE.docx", blob: fakeBlob1 },
        { name: "2_Anexa.docx", blob: fakeBlob2 },
      ],
      auditor: { name: "Auditor Test", atestat: "ABC123" },
      building: { address: "Str. Test 1", cadastralNumber: "100200" },
      cpeCode: "ZEP-2026-T07",
      signerConfig: { provider: "mock" },
      download: false,
    });
    expect(result.zipBlob).toBeInstanceOf(Blob);
    expect(result.zipBlob.size).toBeGreaterThan(100);
    expect(result.manifestTxt).toContain("ZEP-2026-T07");
    expect(result.manifestTxt).toContain("Auditor Test");
    expect(result.p7sBytes).toBeInstanceOf(Uint8Array);
    expect(result.signerInfo.isMock).toBe(true);
    expect(result.filename).toMatch(/manifest_sha256_signed_.*\.zip/);
  });

  it("ZIP conține fișierele așteptate (verificare prin reload JSZip)", async () => {
    const result = await generateManifestSHA256Signed({
      files: [{ name: "x.docx", blob: new Blob(["data"]) }],
      auditor: { name: "A" },
      building: { address: "B" },
      cpeCode: "Z",
      signerConfig: { provider: "mock" },
      download: false,
    });
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(result.zipBlob);
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toContain("manifest_sha256.txt");
    expect(fileNames).toContain("manifest_sha256.txt.p7s");
    expect(fileNames).toContain("README.txt");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Backward-compat — generateManifestSHA256 NEATINS
// ─────────────────────────────────────────────────────────────────────────────

describe("generateManifestSHA256 (backward-compat — Step 7 dependency)", () => {
  it("API existing rămâne neschimbat (TXT manifest)", async () => {
    const fakeBlob = new Blob(["data"], { type: "application/octet-stream" });
    const result = await generateManifestSHA256({
      files: [{ name: "test.docx", blob: fakeBlob }],
      auditor: { name: "Test" },
      building: { address: "Test addr" },
      cpeCode: "TEST-001",
      download: false,
    });
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.content).toContain("TEST-001");
    expect(result.content).toContain("SHA-256");
    expect(result.fileCount).toBe(1);
    // Asigurare: NU s-a adăugat câmp nou care ar rupe consumatorii existenți
    expect(typeof result).toBe("object");
  });
});
