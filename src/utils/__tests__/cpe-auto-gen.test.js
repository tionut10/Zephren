import { describe, it, expect } from "vitest";
import {
  autoGenerateCPECode,
  canAutoGenerateCPE,
  splitAuditorName,
} from "../cpe-auto-gen.js";
import { validateCPECode, parseCPECode } from "../cpe-code.js";

describe("Sprint 14 / Etapa 1 — auto-generare CPE (19 apr 2026)", () => {
  describe("canAutoGenerateCPE", () => {
    it("returnează false pentru obiect gol", () => {
      expect(canAutoGenerateCPE({})).toBe(false);
    });

    it("returnează false dacă numele lipsește", () => {
      expect(canAutoGenerateCPE({ mdlpaCode: "123", date: "2026-01-01" })).toBe(false);
    });

    it("returnează false dacă mdlpaCode lipsește", () => {
      expect(canAutoGenerateCPE({ name: "Popescu Ion", date: "2026-01-01" })).toBe(false);
    });

    it("returnează false dacă data lipsește", () => {
      expect(canAutoGenerateCPE({ name: "Popescu Ion", mdlpaCode: "123" })).toBe(false);
    });

    it("returnează true dacă cele 3 câmpuri obligatorii sunt prezente", () => {
      expect(canAutoGenerateCPE({
        name: "Popescu Ion",
        mdlpaCode: "12345",
        date: "2026-04-19",
      })).toBe(true);
    });

    it("returnează false pentru null/undefined", () => {
      expect(canAutoGenerateCPE(null)).toBe(false);
      expect(canAutoGenerateCPE(undefined)).toBe(false);
    });

    it("returnează false dacă numele e doar spații", () => {
      expect(canAutoGenerateCPE({ name: "   ", mdlpaCode: "123", date: "2026-01-01" })).toBe(false);
    });
  });

  describe("splitAuditorName", () => {
    it("sparge numele complet în lastName + firstName", () => {
      expect(splitAuditorName("Popescu Ion")).toEqual({ lastName: "Popescu", firstName: "Ion" });
    });

    it("acceptă prenume compus", () => {
      expect(splitAuditorName("Popescu Ion Marian")).toEqual({
        lastName: "Popescu",
        firstName: "Ion Marian",
      });
    });

    it("acceptă diacritice", () => {
      expect(splitAuditorName("Țepeș Ștefan")).toEqual({
        lastName: "Țepeș",
        firstName: "Ștefan",
      });
    });

    it("returnează obiect cu string-uri goale pentru input gol", () => {
      expect(splitAuditorName("")).toEqual({ lastName: "", firstName: "" });
      expect(splitAuditorName(null)).toEqual({ lastName: "", firstName: "" });
    });

    it("acceptă un singur cuvânt — firstName devine gol", () => {
      expect(splitAuditorName("Popescu")).toEqual({ lastName: "Popescu", firstName: "" });
    });

    it("normalizează spații multiple", () => {
      expect(splitAuditorName("  Popescu   Ion  ")).toEqual({
        lastName: "Popescu",
        firstName: "Ion",
      });
    });
  });

  describe("autoGenerateCPECode", () => {
    const baseAuditor = {
      name: "Popescu Ion",
      mdlpaCode: "12345",
      date: "2026-04-19",
      atestat: "RO/4567",
      registryIndex: "1",
    };

    it("generează cod valid în format Ord. MDLPA 16/2023", () => {
      const code = autoGenerateCPECode({ auditor: baseAuditor, building: {} });
      expect(code).not.toBeNull();
      expect(validateCPECode(code)).toBe(true);
    });

    it("respectă format așteptat: mdlpa_data_nume_prenume_serie_nr_idx_CPE_hash8", () => {
      const code = autoGenerateCPECode({ auditor: baseAuditor, building: {} });
      expect(code).toMatch(/^12345_2026-04-19_Popescu_Ion_RO_4567_1_CPE_[a-f0-9]{8}$/);
    });

    it("returnează null dacă datele sunt incomplete", () => {
      expect(autoGenerateCPECode({ auditor: { name: "Popescu Ion" }, building: {} })).toBeNull();
      expect(autoGenerateCPECode({ auditor: {}, building: {} })).toBeNull();
    });

    it("este determinist (același input → același output)", () => {
      const c1 = autoGenerateCPECode({ auditor: baseAuditor, building: {} });
      const c2 = autoGenerateCPECode({ auditor: baseAuditor, building: {} });
      expect(c1).toBe(c2);
    });

    it("schimbă hash-ul când registryIndex diferă", () => {
      const c1 = autoGenerateCPECode({ auditor: baseAuditor, building: {} });
      const c2 = autoGenerateCPECode({
        auditor: { ...baseAuditor, registryIndex: "2" },
        building: {},
      });
      expect(c1).not.toBe(c2);
      const p1 = parseCPECode(c1);
      const p2 = parseCPECode(c2);
      expect(p1.registryIndex).toBe(1);
      expect(p2.registryIndex).toBe(2);
      expect(p1.hash8).not.toBe(p2.hash8);
    });

    it("acceptă atestat lipsă (default NONE)", () => {
      const code = autoGenerateCPECode({
        auditor: { name: "Popescu Ion", mdlpaCode: "12345", date: "2026-04-19" },
        building: {},
      });
      expect(code).not.toBeNull();
      expect(code).toContain("_NONE_");
    });

    it("acceptă registryIndex string non-numeric (default 1)", () => {
      const code = autoGenerateCPECode({
        auditor: { ...baseAuditor, registryIndex: "abc" },
        building: {},
      });
      expect(code).not.toBeNull();
      expect(parseCPECode(code).registryIndex).toBe(1);
    });

    it("acceptă diacritice românești corecte", () => {
      const code = autoGenerateCPECode({
        auditor: {
          name: "Țepeș Ștefan",
          mdlpaCode: "98765",
          date: "2026-04-19",
          atestat: "RO/1234",
          registryIndex: "5",
        },
        building: {},
      });
      expect(code).not.toBeNull();
      const parsed = parseCPECode(code);
      expect(parsed.lastName).toBe("Țepeș");
      expect(parsed.firstName).toBe("Ștefan");
    });

    it("returnează null pentru dată invalidă", () => {
      const code = autoGenerateCPECode({
        auditor: { ...baseAuditor, date: "not-a-date" },
        building: {},
      });
      expect(code).toBeNull();
    });

    it("nu aruncă excepții pentru building lipsă", () => {
      expect(() => autoGenerateCPECode({ auditor: baseAuditor })).not.toThrow();
    });
  });
});
