import { describe, it, expect } from "vitest";
import {
  validateStep1,
  computeStep1Progress,
  classifyN50,
  getEVRequirements,
  isValidRomanianCUI,
  isValidCadastral,
  isValidLandBook,
  isResidential,
  SCOP_CPE_OPTIONS,
  OWNER_TYPE_OPTIONS,
  CADASTRAL_REGEX,
} from "../step1-validators.js";

describe("step1-validators — Sprint 21", () => {
  describe("isResidential", () => {
    it("recunoaște RI/RC/RA ca rezidențiale", () => {
      expect(isResidential("RI")).toBe(true);
      expect(isResidential("RC")).toBe(true);
      expect(isResidential("RA")).toBe(true);
    });
    it("non-rezidențiale false", () => {
      expect(isResidential("BI")).toBe(false);
      expect(isResidential("SPA_H")).toBe(false);
      expect(isResidential(undefined)).toBe(false);
    });
  });

  describe("isValidRomanianCUI — cheie control ANAF", () => {
    it("acceptă CUI valide", () => {
      // CUI-uri reale publice
      expect(isValidRomanianCUI("14186770")).toBe(true); // Emag (RO14186770)
      expect(isValidRomanianCUI("RO14186770")).toBe(true);
    });
    it("respinge CUI invalide", () => {
      expect(isValidRomanianCUI("12345678")).toBe(false);
      expect(isValidRomanianCUI("")).toBe(false);
      expect(isValidRomanianCUI(null)).toBe(false);
      expect(isValidRomanianCUI("abcdefg")).toBe(false);
    });
    it("respinge formate non-numerice", () => {
      expect(isValidRomanianCUI("RO1A2B3C")).toBe(false);
    });
  });

  describe("isValidCadastral — ANCPI modern", () => {
    it("acceptă formate valide", () => {
      expect(isValidCadastral("123456")).toBe(true);
      expect(isValidCadastral("123456-A")).toBe(true);
      expect(isValidCadastral("123456-C1")).toBe(true);
      expect(isValidCadastral("123456-C1-U5")).toBe(true);
      expect(isValidCadastral("1234567890")).toBe(true); // 10 cifre UAT modern
    });
    it("tratează gol ca valid (opțional)", () => {
      expect(isValidCadastral("")).toBe(true);
      expect(isValidCadastral(null)).toBe(true);
    });
    it("respinge formate invalide", () => {
      expect(isValidCadastral("abc")).toBe(false);
      expect(isValidCadastral("12")).toBe(false); // prea scurt
      expect(isValidCadastral("123-A-B-C")).toBe(false);
    });
    it("regex expus consumabil", () => {
      expect(CADASTRAL_REGEX).toBeInstanceOf(RegExp);
    });
  });

  describe("isValidLandBook — CF", () => {
    it("acceptă formate uzuale", () => {
      expect(isValidLandBook("CF nr. 123456 Cluj")).toBe(true);
      expect(isValidLandBook("123456")).toBe(true);
      expect(isValidLandBook("CF 123456/București Sector 3")).toBe(true);
    });
    it("gol = valid", () => {
      expect(isValidLandBook("")).toBe(true);
    });
  });

  describe("classifyN50 — prag nZEB diferențiat", () => {
    it("rezidențial: 0.8 → nZEB OK", () => {
      const c = classifyN50(0.8, "RI");
      expect(c.color).toBe("emerald");
      expect(c.ref.nZEB).toBe(1.0);
      expect(c.ref.residential).toBe(true);
    });
    it("non-rezidențial: 1.3 → nZEB OK (≤1.5)", () => {
      const c = classifyN50(1.3, "BI");
      expect(c.color).toBe("emerald");
      expect(c.ref.nZEB).toBe(1.5);
      expect(c.ref.residential).toBe(false);
    });
    it("valoare absurdă > 20", () => {
      const c = classifyN50(25, "RI");
      expect(c.color).toBe("red");
      expect(c.label).toContain("absurdă");
    });
    it("valoare invalidă → null", () => {
      expect(classifyN50(null, "RI")).toBeNull();
      expect(classifyN50("abc", "RI")).toBeNull();
    });
    it("passive house (< passive threshold)", () => {
      const c = classifyN50(0.5, "RI");
      expect(c.label).toBe("Passivhaus");
    });
  });

  describe("getEVRequirements — EPBD 2024 Art. 14 §3/§4", () => {
    it("sub 10 locuri → null (Art. 14 nu se aplică)", () => {
      expect(getEVRequirements({ parkingSpaces: 5, category: "BI", isRecent: true })).toBeNull();
    });
    it("rezidențial 20 locuri → 50% precablare, 0 instalate obligatorii", () => {
      const req = getEVRequirements({ parkingSpaces: 20, category: "RC", isRecent: false });
      expect(req.installedMin).toBe(0);
      expect(req.preparedMin).toBe(10);
      expect(req.reference).toContain("§3");
    });
    it("non-rezidențial 20 locuri existent → 1/20 instalate + 1/5 precablate", () => {
      const req = getEVRequirements({ parkingSpaces: 20, category: "BI", isRecent: false });
      expect(req.installedMin).toBe(1);
      expect(req.preparedMin).toBe(4);
      expect(req.reference).toContain("§4");
    });
    it("non-rezidențial >20 locuri renovat 2024 → 1/10 + 50%", () => {
      const req = getEVRequirements({ parkingSpaces: 30, category: "BI", isRecent: true });
      expect(req.installedMin).toBe(3);
      expect(req.preparedMin).toBe(15);
    });
  });

  describe("validateStep1 — integrare", () => {
    it("proiect gol → erori critice pentru toate câmpurile obligatorii", () => {
      const { errors } = validateStep1({}, "RO");
      expect(errors.city).toBeTruthy();
      expect(errors.county).toBeTruthy();
      expect(errors.category).toBeTruthy();
      expect(errors.yearBuilt).toBeTruthy();
      expect(errors.floors).toBeTruthy();
      expect(errors.areaUseful).toBeTruthy();
      expect(errors.locality).toBeTruthy();
      expect(errors.scopCpe).toBeTruthy();
    });

    it("proiect complet rezidențial → fără erori", () => {
      const b = {
        city: "Cluj-Napoca", county: "Cluj", category: "RI", structure: "zidarie",
        yearBuilt: "1975", floors: "P+1E",
        areaUseful: "120", volume: "300", areaEnvelope: "220", heightFloor: "2.7",
        locality: "Cluj-Napoca", scopCpe: "vanzare",
      };
      const { errors } = validateStep1(b, "RO");
      expect(errors.city).toBeUndefined();
      expect(errors.areaUseful).toBeUndefined();
      expect(Object.keys(errors).length).toBe(0);
    });

    it("yearRenov < yearBuilt → warning", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "2000", yearRenov: "1990", floors: "P",
        areaUseful: "100", volume: "270", areaEnvelope: "180", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const { warnings } = validateStep1(b, "RO");
      expect(warnings.yearRenov).toBeTruthy();
    });

    it("areaHeated > areaUseful → warning consistency", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "100", areaHeated: "200",
        volume: "270", areaEnvelope: "180", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const { warnings } = validateStep1(b, "RO");
      expect(warnings.areaHeated).toBeTruthy();
    });

    it("RC fără nApartments ≥ 2 → eroare critică", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RC", structure: "x",
        yearBuilt: "2000", floors: "P+4E",
        areaUseful: "1000", volume: "2700", areaEnvelope: "1500", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
        nApartments: "1", // prea puțin
      };
      const { errors } = validateStep1(b, "RO");
      expect(errors.nApartments).toBeTruthy();
    });

    it("RA fără apartmentNo → eroare critică", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RA", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "60", volume: "162", areaEnvelope: "110", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const { errors } = validateStep1(b, "RO");
      expect(errors.apartmentNo).toBeTruthy();
    });

    it("PJ fără CUI → warning", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "BI", structure: "x",
        yearBuilt: "2000", floors: "P+2E",
        areaUseful: "500", volume: "1350", areaEnvelope: "800", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "autorizare",
        ownerType: "PJ",
      };
      const { warnings } = validateStep1(b, "RO");
      expect(warnings.ownerCUI).toBeTruthy();
    });

    it("PF nu cere CUI", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "100", volume: "270", areaEnvelope: "180", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
        ownerType: "PF",
      };
      const { warnings } = validateStep1(b, "RO");
      expect(warnings.ownerCUI).toBeUndefined();
    });

    it("cadastru format modern C1-U5 OK", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RA", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "60", volume: "162", areaEnvelope: "110", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
        apartmentNo: "12",
        cadastralNumber: "123456-C1-U5",
      };
      const { warnings } = validateStep1(b, "RO");
      expect(warnings.cadastralNumber).toBeUndefined();
    });

    it("înălțime etaj < 2.2 → eroare critică", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "100", volume: "270", areaEnvelope: "180", heightFloor: "2.0",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const { errors } = validateStep1(b, "RO");
      expect(errors.heightFloor).toBeTruthy();
    });

    it("A/V absurd → warning", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "2000", floors: "P",
        areaUseful: "100", volume: "300", areaEnvelope: "3000", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const { errors } = validateStep1(b, "RO");
      expect(errors.areaEnvelope).toBeTruthy(); // A/V > 1.5 → eroare
    });
  });

  describe("computeStep1Progress", () => {
    it("proiect gol → 0/N", () => {
      const p = computeStep1Progress({}, "RO");
      expect(p.filled).toBe(0);
      expect(p.missing.length).toBeGreaterThan(5);
    });

    it("proiect rezidențial complet → 100%", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "1975", floors: "P+1E",
        areaUseful: "120", volume: "300", areaEnvelope: "220", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const p = computeStep1Progress(b, "RO");
      expect(p.filled).toBe(p.total);
      expect(p.missing.length).toBe(0);
    });

    it("RC fără nApartments → nApartments în missing", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RC", structure: "x",
        yearBuilt: "1975", floors: "P+4E",
        areaUseful: "1000", volume: "2700", areaEnvelope: "1500", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const p = computeStep1Progress(b, "RO");
      expect(p.missing).toContain("nApartments");
    });

    it("RI nu cere nApartments (filtru aplicabilitate)", () => {
      const b = {
        city: "Cluj", county: "Cluj", category: "RI", structure: "x",
        yearBuilt: "1975", floors: "P",
        areaUseful: "120", volume: "300", areaEnvelope: "220", heightFloor: "2.7",
        locality: "Cluj", scopCpe: "vanzare",
      };
      const p = computeStep1Progress(b, "RO");
      expect(p.missing).not.toContain("nApartments");
      expect(p.missing).not.toContain("apartmentNo");
    });
  });

  describe("Enum-uri exportate", () => {
    it("SCOP_CPE_OPTIONS include autorizare + PNRR + EEH", () => {
      const vals = SCOP_CPE_OPTIONS.map(o => o.value);
      expect(vals).toContain("autorizare");
      expect(vals).toContain("fonduri_PNRR");
      expect(vals).toContain("fonduri_EEH");
      expect(vals).toContain("renovare");
    });

    it("OWNER_TYPE_OPTIONS include PF/PJ/PUB/ASOC", () => {
      const vals = OWNER_TYPE_OPTIONS.map(o => o.value);
      expect(vals).toEqual(expect.arrayContaining(["PF", "PJ", "PUB", "ASOC"]));
    });

    it("opțiuni bilingve ro + en", () => {
      SCOP_CPE_OPTIONS.forEach(o => {
        expect(o.label).toBeTruthy();
        expect(o.labelEN).toBeTruthy();
      });
    });
  });

  describe("Bilingv EN", () => {
    it("erori în EN când lang='EN'", () => {
      const { errors } = validateStep1({}, "EN");
      expect(errors.city).toMatch(/required/i);
      expect(errors.areaUseful).toMatch(/usable area|must be/i);
    });
  });
});
