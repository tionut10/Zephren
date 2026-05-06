/**
 * @vitest-environment jsdom
 *
 * Teste pentru funding-bundles.js (Sprint Conformitate P1-05..P1-10, 7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  FUNDING_PROGRAMS,
  listFundingPrograms,
  isValidProgram,
  generateFundingBundle,
} from "../funding-bundles.js";

const fakeBlob = (text) => new Blob([text], { type: "application/octet-stream" });

describe("FUNDING_PROGRAMS catalog", () => {
  it("este înghețat (read-only)", () => {
    expect(Object.isFrozen(FUNDING_PROGRAMS)).toBe(true);
  });

  it("conține cele 6 programe principale", () => {
    expect(FUNDING_PROGRAMS["afm-casa-eficienta"]).toBeDefined();
    expect(FUNDING_PROGRAMS["afm-casa-verde-pv"]).toBeDefined();
    expect(FUNDING_PROGRAMS["por-fedr-2027"]).toBeDefined();
    expect(FUNDING_PROGRAMS["ftj-tranzitie-justa"]).toBeDefined();
    expect(FUNDING_PROGRAMS["modernization-fund"]).toBeDefined();
    expect(FUNDING_PROGRAMS["uat-cofinantare-bloc"]).toBeDefined();
  });

  it("FTJ are deadline ferm 26.VIII.2026", () => {
    expect(FUNDING_PROGRAMS["ftj-tranzitie-justa"].deadline).toContain("26.VIII.2026");
  });

  it("Casa Verde PV NU cere CPE/RAE", () => {
    const cv = FUNDING_PROGRAMS["afm-casa-verde-pv"];
    expect(cv.requiresCpe).toBe(false);
    expect(cv.requiresRae).toBe(false);
  });

  it("UAT cofinanțare cere acord proprietari", () => {
    expect(FUNDING_PROGRAMS["uat-cofinantare-bloc"].requiresAcordProprietari).toBe(true);
  });
});

describe("listFundingPrograms + isValidProgram", () => {
  it("listează toate cele 6 programe", () => {
    const list = listFundingPrograms();
    expect(list).toHaveLength(6);
    expect(list[0]).toHaveProperty("key");
    expect(list[0]).toHaveProperty("name");
  });

  it("isValidProgram recunoaște chei standard", () => {
    expect(isValidProgram("afm-casa-eficienta")).toBe(true);
    expect(isValidProgram("ftj-tranzitie-justa")).toBe(true);
    expect(isValidProgram("nonexistent")).toBe(false);
  });
});

describe("generateFundingBundle", () => {
  it("generează ZIP pentru AFM Casa Eficientă cu structură folders", async () => {
    const result = await generateFundingBundle({
      programType: "afm-casa-eficienta",
      documents: [
        { folder: "01_CPE_pre", filename: "cpe.docx", blob: fakeBlob("cpe data") },
        { folder: "02_RAE", filename: "rae.docx", blob: fakeBlob("rae data") },
        { folder: "04_Foto_pre", filename: "foto1.jpg", blob: fakeBlob("img") },
        { folder: "06_Calcul_economii", filename: "calc.xlsx", blob: fakeBlob("xlsx") },
      ],
      metadata: {
        cpeCode: "ZEP-T-100",
        applicantName: "Popescu Ion",
        building: { address: "Str. Test 1" },
        auditor: { name: "M.I.", atestat: "AE-001" },
      },
      download: false,
    });
    expect(result.zipBlob).toBeInstanceOf(Blob);
    expect(result.filesAdded).toBe(4);
    expect(result.completeness.ok).toBe(true);
    expect(result.filename).toContain("afm-casa-eficienta");
  });

  it("validează completeness — lipsa CPE pentru AFM Casa Eficientă", async () => {
    const result = await generateFundingBundle({
      programType: "afm-casa-eficienta",
      documents: [
        { folder: "02_RAE", filename: "rae.docx", blob: fakeBlob("data") },
        { folder: "04_Foto_pre", filename: "img.jpg", blob: fakeBlob("img") },
      ],
      download: false,
    });
    expect(result.completeness.ok).toBe(false);
    expect(result.completeness.missing).toContain("CPE");
  });

  it("Casa Verde PV nu cere CPE — completeness ok fără CPE", async () => {
    const result = await generateFundingBundle({
      programType: "afm-casa-verde-pv",
      documents: [
        { folder: "01_Documentatie_tehnica_PV", filename: "tech.pdf", blob: fakeBlob("data") },
      ],
      download: false,
    });
    expect(result.completeness.ok).toBe(true);
  });

  it("UAT cofinanțare — necesită acord proprietari", async () => {
    const result = await generateFundingBundle({
      programType: "uat-cofinantare-bloc",
      documents: [
        { folder: "01_Audit_RC_integral", filename: "audit.docx", blob: fakeBlob("data") },
        { folder: "02_Anexa_2_multiapartament", filename: "anexa.docx", blob: fakeBlob("data") },
      ],
      download: false,
    });
    expect(result.completeness.ok).toBe(false);
    expect(result.completeness.missing).toContain("Acord_proprietari");
  });

  it("aruncă eroare pentru program necunoscut", async () => {
    await expect(
      generateFundingBundle({
        programType: "fake-program",
        documents: [],
        download: false,
      }),
    ).rejects.toThrow(/necunoscut/);
  });

  it("ZIP conține README.txt + manifest.json + fișierele în folderele corecte", async () => {
    const result = await generateFundingBundle({
      programType: "ftj-tranzitie-justa",
      documents: [
        { folder: "01_Audit_RAE", filename: "audit.docx", blob: fakeBlob("data") },
        { folder: "02_Studiu_fezabilitate", filename: "studiu.docx", blob: fakeBlob("data") },
        { folder: "04_Analiza_CO2", filename: "co2.xlsx", blob: fakeBlob("data") },
        { folder: "04_Foto_pre", filename: "foto.jpg", blob: fakeBlob("data") },
      ],
      metadata: { cpeCode: "X" },
      download: false,
    });
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(result.zipBlob);
    const files = Object.keys(zip.files);
    expect(files).toContain("README.txt");
    expect(files).toContain("manifest.json");
    expect(files).toContain("01_Audit_RAE/audit.docx");
    expect(files).toContain("04_Analiza_CO2/co2.xlsx");

    const readme = await zip.file("README.txt").async("string");
    expect(readme).toContain("FTJ Tranziție Justă");
    expect(readme).toContain("26.VIII.2026");

    const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
    expect(manifest.program.type).toBe("ftj-tranzitie-justa");
    expect(manifest.contents).toHaveLength(4);
  });

  it("documente fără blob/filename ignorate silent", async () => {
    const result = await generateFundingBundle({
      programType: "afm-casa-verde-pv",
      documents: [
        { folder: "01_Documentatie_tehnica_PV", filename: "ok.pdf", blob: fakeBlob("data") },
        { folder: "02_Plan_instalare", filename: "no-blob", blob: null },
        { filename: "no-folder.txt", blob: fakeBlob("x") }, // folder default „_other"
      ],
      download: false,
    });
    expect(result.filesAdded).toBe(2); // ok.pdf + no-folder.txt (cu folder _other)
  });
});
