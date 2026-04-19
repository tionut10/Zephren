import { describe, it, expect } from "vitest";
import {
  generateCPECode,
  validateCPECode,
  parseCPECode,
  CPE_NAMESPACE,
} from "../cpe-code.js";

describe("Sprint 14 — Cod unic CPE (Ord. MDLPA 16/2023)", () => {
  const baseAuditor = {
    lastName: "Popescu",
    firstName: "Ion",
    atestat: "RO/4567",
    mdlpaCode: "12345",
  };
  const baseDate = new Date("2026-04-18");

  it("generează codul în formatul standard MDLPA", () => {
    const code = generateCPECode({
      auditor: baseAuditor,
      building: {},
      date: baseDate,
      registryIndex: 1,
    });
    expect(code).toMatch(/^12345_2026-04-18_Popescu_Ion_RO_4567_1_CPE_[a-f0-9]{8}$/);
  });

  it("acceptă data ca string ISO", () => {
    const code = generateCPECode({
      auditor: baseAuditor,
      building: {},
      date: "2026-04-18",
      registryIndex: 1,
    });
    expect(code.startsWith("12345_2026-04-18_")).toBe(true);
  });

  it("este deterministic — aceleași date → același cod", () => {
    const c1 = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 1 });
    const c2 = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 1 });
    expect(c1).toBe(c2);
  });

  it("produce hash-uri diferite pentru date diferite", () => {
    const c1 = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 1 });
    const c2 = generateCPECode({ auditor: baseAuditor, building: {}, date: "2026-04-19", registryIndex: 1 });
    expect(c1).not.toBe(c2);
  });

  it("produce hash-uri diferite pentru registryIndex diferit", () => {
    const c1 = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 1 });
    const c2 = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 2 });
    expect(c1).not.toBe(c2);
    expect(c1).toContain("_1_CPE_");
    expect(c2).toContain("_2_CPE_");
  });

  it("elimină spațiile din nume și prenume", () => {
    const code = generateCPECode({
      auditor: { ...baseAuditor, lastName: "Popescu ", firstName: " Ion" },
      building: {},
      date: baseDate,
      registryIndex: 1,
    });
    expect(code).toContain("_Popescu_Ion_");
  });

  it("folosește NONE când atestat lipsește", () => {
    const code = generateCPECode({
      auditor: { ...baseAuditor, atestat: "" },
      building: {},
      date: baseDate,
      registryIndex: 1,
    });
    // split NONE pe "/" → ["NONE", ""]; segmentul serie = "NONE", număr = ""
    expect(code).toContain("_NONE_");
  });

  it("aruncă eroare pentru dată invalidă", () => {
    expect(() =>
      generateCPECode({ auditor: baseAuditor, building: {}, date: "nu-e-data", registryIndex: 1 })
    ).toThrow(/data invalidă/);
  });

  it("default la registryIndex=1 când lipsește", () => {
    const code = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate });
    expect(code).toContain("_1_CPE_");
  });

  it("NAMESPACE este constant (RFC 4122 DNS)", () => {
    expect(CPE_NAMESPACE).toBe("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  });

  it("validateCPECode acceptă cod bine format", () => {
    const code = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 1 });
    expect(validateCPECode(code)).toBe(true);
  });

  it("validateCPECode respinge cod fără _CPE_ suffix", () => {
    expect(validateCPECode("12345_2026-04-18_Popescu_Ion_RO_4567_1_a3f7b9c2")).toBe(false);
  });

  it("validateCPECode respinge cod cu data malformată (prea scurtă)", () => {
    expect(validateCPECode("12345_2026-4-1_Popescu_Ion_RO_4567_1_CPE_a3f7b9c2")).toBe(false);
  });

  it("validateCPECode respinge cod cu hash prea scurt", () => {
    expect(validateCPECode("12345_2026-04-18_Popescu_Ion_RO_4567_1_CPE_a3f")).toBe(false);
  });

  it("validateCPECode respinge non-string", () => {
    expect(validateCPECode(null)).toBe(false);
    expect(validateCPECode(12345)).toBe(false);
    expect(validateCPECode(undefined)).toBe(false);
  });

  it("parseCPECode extrage toate componentele corect", () => {
    const code = generateCPECode({ auditor: baseAuditor, building: {}, date: baseDate, registryIndex: 7 });
    const parsed = parseCPECode(code);
    expect(parsed).not.toBeNull();
    expect(parsed.mdlpaCode).toBe("12345");
    expect(parsed.date).toBe("2026-04-18");
    expect(parsed.lastName).toBe("Popescu");
    expect(parsed.firstName).toBe("Ion");
    expect(parsed.series).toBe("RO");
    expect(parsed.number).toBe("4567");
    expect(parsed.registryIndex).toBe(7);
    expect(parsed.hash8).toMatch(/^[a-f0-9]{8}$/);
  });

  it("parseCPECode returnează null pentru cod invalid", () => {
    expect(parseCPECode("not-a-code")).toBeNull();
    expect(parseCPECode("")).toBeNull();
  });

  it("acceptă mdlpaCode cu dash și punct", () => {
    const code = generateCPECode({
      auditor: { ...baseAuditor, mdlpaCode: "CPE-12345/2026" },
      building: {},
      date: baseDate,
      registryIndex: 1,
    });
    expect(code.startsWith("CPE-12345/2026_")).toBe(true);
  });

  it("păstrează diacriticele în nume valide", () => {
    // Generatorul nu modifică diacriticele; validatorul le acceptă.
    const code = generateCPECode({
      auditor: { ...baseAuditor, lastName: "Țurcan", firstName: "Ștefania" },
      building: {},
      date: baseDate,
      registryIndex: 1,
    });
    expect(code).toContain("_Țurcan_Ștefania_");
    expect(validateCPECode(code)).toBe(true);
  });

  // ─── Etapa 2 (BUG extra) — regex relaxat pentru date reale câmp ────────
  describe("Etapa 2 — regex relaxat (19 apr 2026)", () => {
    it("acceptă cod cu titlu profesional 'ing.' în nume", () => {
      const code = "CE-2024-00756_2026-04-19_ing._BogdanMihai-Vlad_CT-00756__1_CPE_c37ed841";
      expect(validateCPECode(code)).toBe(true);
    });

    it("acceptă serie alfanumerică cu cifre (CT-00756)", () => {
      const code = "12345_2026-04-19_Popescu_Ion_CT-00756_42_1_CPE_a3f7b9c2";
      expect(validateCPECode(code)).toBe(true);
    });

    it("acceptă serie goală (auditor fără atestat)", () => {
      const code = "12345_2026-04-19_Popescu_Ion__1234_1_CPE_a3f7b9c2";
      expect(validateCPECode(code)).toBe(true);
    });

    it("acceptă serie ȘI număr goale", () => {
      const code = "12345_2026-04-19_Popescu_Ion___1_CPE_a3f7b9c2";
      expect(validateCPECode(code)).toBe(true);
    });

    it("acceptă nume compus cu cratimă (Mihai-Vlad)", () => {
      const code = "12345_2026-04-19_Popescu_Mihai-Vlad_RO_4567_1_CPE_a3f7b9c2";
      expect(validateCPECode(code)).toBe(true);
    });

    it("acceptă nume cu cifre legate (date 2024 prefix mdlpa)", () => {
      const code = "CE-2024-00756_2026-04-19_Popescu_Ion_RO_4567_1_CPE_a3f7b9c2";
      expect(validateCPECode(code)).toBe(true);
    });

    it("respinge totuși codurile fundamental rupte (lipsă _CPE_)", () => {
      expect(validateCPECode("12345_2026-04-19_Popescu_Ion_RO_4567_1_BAD_a3f7b9c2")).toBe(false);
    });

    it("respinge totuși hash invalid (G nu e hex)", () => {
      expect(validateCPECode("12345_2026-04-19_Popescu_Ion_RO_4567_1_CPE_g3f7b9c2")).toBe(false);
    });

    it("respinge totuși data malformată (an cu 3 cifre)", () => {
      expect(validateCPECode("12345_226-04-19_Popescu_Ion_RO_4567_1_CPE_a3f7b9c2")).toBe(false);
    });
  });
});
