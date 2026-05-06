/**
 * @vitest-environment jsdom
 *
 * Teste pentru dossier-bundle.js (Sprint Conformitate P0-10, 6 mai 2026).
 *
 * Acoperire:
 *   1. BUNDLE_FOLDERS frozen + getFolderFor mapping
 *   2. validateDossierCompleteness — required (CPE) + recommended
 *   3. generateDossierBundle — ZIP cu structura standardizată
 *   4. manifest.json + README.txt populat corect
 *   5. requireRAE flag — RAE devine obligatoriu pentru audit complet
 *   6. Documente fără filename/blob ignorate silent
 */

import { describe, it, expect } from "vitest";
import {
  BUNDLE_FOLDERS,
  getFolderFor,
  validateDossierCompleteness,
  generateDossierBundle,
} from "../dossier-bundle.js";

const fakeBlob = (text) => new Blob([text], { type: "application/octet-stream" });

describe("BUNDLE_FOLDERS + getFolderFor", () => {
  it("BUNDLE_FOLDERS este frozen", () => {
    expect(Object.isFrozen(BUNDLE_FOLDERS)).toBe(true);
  });

  it("conține cele 10 categorii standard", () => {
    expect(Object.keys(BUNDLE_FOLDERS).length).toBe(10);
    expect(BUNDLE_FOLDERS.CPE).toBe("01_CPE");
    expect(BUNDLE_FOLDERS.MANIFEST).toBe("09_Manifest");
  });

  it("getFolderFor mapping case-insensitive", () => {
    expect(getFolderFor("CPE")).toBe("01_CPE");
    expect(getFolderFor("cpe")).toBe("01_CPE");
    expect(getFolderFor("Pasaport")).toBe("03_Pasaport_renovare");
  });

  it("getFolderFor pentru categorie necunoscută → _other", () => {
    expect(getFolderFor("XYZ")).toBe("_other");
    expect(getFolderFor(null)).toBe("_other");
  });
});

describe("validateDossierCompleteness", () => {
  it("CPE prezent → ok=true", () => {
    const result = validateDossierCompleteness([
      { category: "CPE", filename: "cpe.docx", blob: fakeBlob("x") },
    ]);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("fără CPE → ok=false cu missing CPE", () => {
    const result = validateDossierCompleteness([
      { category: "RAE", filename: "rae.docx", blob: fakeBlob("y") },
    ]);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("CPE");
  });

  it("listează recommended lipsă (RAE/MANIFEST/FIC_DCA/ANEXE)", () => {
    const result = validateDossierCompleteness([
      { category: "CPE", filename: "x", blob: fakeBlob("x") },
    ]);
    expect(result.missingRecommended.length).toBeGreaterThan(0);
  });
});

describe("generateDossierBundle", () => {
  it("produce ZIP cu structura standardizată", async () => {
    const result = await generateDossierBundle({
      documents: [
        { category: "CPE", filename: "cpe.docx", blob: fakeBlob("CPE_content") },
        { category: "RAE", filename: "rae.docx", blob: fakeBlob("RAE_content") },
        { category: "MANIFEST", filename: "manifest.txt", blob: fakeBlob("hash...") },
      ],
      metadata: {
        cpeCode: "ZEP-2026-T20",
        auditor: { name: "Test Auditor", atestat: "AE-001" },
        building: { address: "Str. Test 1" },
      },
      download: false,
    });

    expect(result.zipBlob).toBeInstanceOf(Blob);
    expect(result.filesAdded).toBe(3);
    expect(result.filename).toMatch(/Dosar_audit_.*\.zip$/);
    expect(result.completeness.ok).toBe(true);
  });

  it("ZIP conține fișierele în folderele corecte (verificare reload JSZip)", async () => {
    const result = await generateDossierBundle({
      documents: [
        { category: "CPE", filename: "cpe.docx", blob: fakeBlob("a") },
        { category: "PASAPORT", filename: "pasaport.json", blob: fakeBlob("b") },
        { category: "FIC_DCA", filename: "fic.pdf", blob: fakeBlob("c") },
      ],
      metadata: { cpeCode: "Y" },
      download: false,
    });

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(result.zipBlob);
    const files = Object.keys(zip.files);
    expect(files).toContain("01_CPE/cpe.docx");
    expect(files).toContain("03_Pasaport_renovare/pasaport.json");
    expect(files).toContain("06_FIC_DCA/fic.pdf");
    expect(files).toContain("manifest.json");
    expect(files).toContain("README.txt");
  });

  it("manifest.json conține contents + cpeCode + auditor", async () => {
    const result = await generateDossierBundle({
      documents: [
        { category: "CPE", filename: "x.docx", blob: fakeBlob("x") },
      ],
      metadata: {
        cpeCode: "ZEP-T-31",
        auditor: { name: "A", atestat: "B" },
        building: { address: "C" },
      },
      download: false,
    });
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(result.zipBlob);
    const manifestText = await zip.file("manifest.json").async("string");
    const manifest = JSON.parse(manifestText);
    expect(manifest.cpeCode).toBe("ZEP-T-31");
    expect(manifest.auditor.name).toBe("A");
    expect(manifest.contents).toHaveLength(1);
    expect(manifest.legalBasis).toContain("Ord. MDLPA 348/2026 (MO 292/14.IV.2026)");
  });

  it("aruncă eroare dacă lipsește CPE (obligatoriu)", async () => {
    await expect(
      generateDossierBundle({
        documents: [
          { category: "RAE", filename: "rae.docx", blob: fakeBlob("y") },
        ],
        download: false,
      }),
    ).rejects.toThrow(/Documente obligatorii lipsă/);
  });

  it("requireRAE=true face RAE obligatoriu", async () => {
    await expect(
      generateDossierBundle({
        documents: [
          { category: "CPE", filename: "x", blob: fakeBlob("x") },
        ],
        requireRAE: true,
        download: false,
      }),
    ).rejects.toThrow(/RAE/);
  });

  it("documente fără blob ignorate silent (nu throw)", async () => {
    const result = await generateDossierBundle({
      documents: [
        { category: "CPE", filename: "ok.docx", blob: fakeBlob("data") },
        { category: "RAE", filename: "missing.docx", blob: null },
        { filename: "no-category.txt", blob: fakeBlob("x") },
      ],
      metadata: { cpeCode: "X" },
      download: false,
    });
    expect(result.filesAdded).toBe(1); // doar CPE
  });

  it("README.txt conține structura folderelor + bază legală", async () => {
    const result = await generateDossierBundle({
      documents: [{ category: "CPE", filename: "x", blob: fakeBlob("x") }],
      metadata: { cpeCode: "Z" },
      download: false,
    });
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(result.zipBlob);
    const readme = await zip.file("README.txt").async("string");
    expect(readme).toContain("Mc 001-2022");
    expect(readme).toContain("Ord. MDLPA 348/2026");
    expect(readme).toContain("01_CPE");
    expect(readme).toContain("Z"); // cpeCode
  });
});
