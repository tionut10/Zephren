import { describe, it, expect } from "vitest";
import {
  nextUnheatedCode,
  getResidentialFixturesDefaults,
  isFixturesEmpty,
  computeVisibility,
  validateNumericRange,
} from "../AnexaMDLPAFields.jsx";

/**
 * Sprint UI Anexa 1+2 (20 apr 2026) — Teste helperi AnexaMDLPAFields
 *
 * Acoperă logica pură extrasă din componentă (nu necesită DOM):
 *  - Auto-generare coduri ZU (nextUnheatedCode)
 *  - Defaults rezidențial obiecte sanitare (getResidentialFixturesDefaults)
 *  - Detectare fixtures goale (isFixturesEmpty)
 *  - Calcul vizibilitate condiționată (computeVisibility)
 *  - Validare range numeric (validateNumericRange)
 */

describe("nextUnheatedCode — auto-generare ZU incremental", () => {
  it("returnează ZU1 pentru listă goală", () => {
    expect(nextUnheatedCode([])).toBe("ZU1");
    expect(nextUnheatedCode()).toBe("ZU1");
    expect(nextUnheatedCode(null)).toBe("ZU1");
  });

  it("returnează ZU2 când ZU1 există", () => {
    expect(nextUnheatedCode([{ code: "ZU1" }])).toBe("ZU2");
  });

  it("returnează primul cod liber din serie", () => {
    // ZU1 și ZU3 ocupate → ZU2 e primul liber
    expect(nextUnheatedCode([{ code: "ZU1" }, { code: "ZU3" }])).toBe("ZU2");
  });

  it("ignoră case-ul (zu1 === ZU1)", () => {
    expect(nextUnheatedCode([{ code: "zu1" }, { code: "Zu2" }])).toBe("ZU3");
  });

  it("tratează elemente cu code gol ca libere", () => {
    expect(nextUnheatedCode([{ code: "" }, { code: null }])).toBe("ZU1");
  });
});

describe("getResidentialFixturesDefaults — defaults 1/apartament", () => {
  it("returnează 1 per apartament pentru nApt=1", () => {
    const defaults = getResidentialFixturesDefaults(1);
    expect(defaults.lavoare).toBe("1");
    expect(defaults.cada_baie).toBe("1");
    expect(defaults.spalatoare).toBe("1");
    expect(defaults.rezervor_wc).toBe("1");
    expect(defaults.dus).toBe("1");
    expect(defaults.masina_spalat_rufe).toBe("1");
    // Bideuri + pisoare + mașină spălat vase = 0 default
    expect(defaults.bideuri).toBe("0");
    expect(defaults.pisoare).toBe("0");
    expect(defaults.masina_spalat_vase).toBe("0");
  });

  it("scalează la număr mare de apartamente", () => {
    const defaults = getResidentialFixturesDefaults(20);
    expect(defaults.lavoare).toBe("20");
    expect(defaults.dus).toBe("20");
  });

  it("minimum 1 pentru nApt invalid sau 0", () => {
    expect(getResidentialFixturesDefaults(0).lavoare).toBe("1");
    expect(getResidentialFixturesDefaults(null).lavoare).toBe("1");
    expect(getResidentialFixturesDefaults("abc").lavoare).toBe("1");
  });

  it("are exact 9 câmpuri (matchuiește tabelul MDLPA Anexa 1+2)", () => {
    const defaults = getResidentialFixturesDefaults(1);
    expect(Object.keys(defaults).sort()).toEqual([
      "bideuri", "cada_baie", "dus", "lavoare",
      "masina_spalat_rufe", "masina_spalat_vase",
      "pisoare", "rezervor_wc", "spalatoare",
    ]);
  });
});

describe("isFixturesEmpty — detectare fixtures goale", () => {
  it("true pentru obiect gol", () => {
    expect(isFixturesEmpty({})).toBe(true);
    expect(isFixturesEmpty()).toBe(true);
  });

  it("true când toate valorile sunt 0 sau gol", () => {
    expect(isFixturesEmpty({ lavoare: "0", cada_baie: "", dus: "0" })).toBe(true);
  });

  it("false când cel puțin o valoare e > 0", () => {
    expect(isFixturesEmpty({ lavoare: "1", cada_baie: "0" })).toBe(false);
  });
});

describe("computeVisibility — flaguri condiționate per grup", () => {
  it("hasCooling true DOAR când cooling.hasCooling=true", () => {
    expect(computeVisibility({ cooling: { hasCooling: true } }).hasCooling).toBe(true);
    expect(computeVisibility({ cooling: { hasCooling: false } }).hasCooling).toBe(false);
    expect(computeVisibility({}).hasCooling).toBe(false);
  });

  it("hasVentHR detectează 'hr' case-insensitive în ventilation.type", () => {
    expect(computeVisibility({ ventilation: { type: "mec_hr" } }).hasVentHR).toBe(true);
    expect(computeVisibility({ ventilation: { type: "MEC_HR70" } }).hasVentHR).toBe(true);
    expect(computeVisibility({ ventilation: { type: "natural" } }).hasVentHR).toBe(false);
  });

  it("isBlock true pentru RC/RA/BC", () => {
    expect(computeVisibility({ building: { category: "RC" } }).isBlock).toBe(true);
    expect(computeVisibility({ building: { category: "RA" } }).isBlock).toBe(true);
    expect(computeVisibility({ building: { category: "BC" } }).isBlock).toBe(true);
    expect(computeVisibility({ building: { category: "RI" } }).isBlock).toBe(false);
    expect(computeVisibility({ building: { category: "BI" } }).isBlock).toBe(false);
  });

  it("isResidential true pentru RI/RC/RA/BC", () => {
    ["RI", "RC", "RA", "BC"].forEach((cat) => {
      expect(computeVisibility({ building: { category: cat } }).isResidential).toBe(true);
    });
    expect(computeVisibility({ building: { category: "BI" } }).isResidential).toBe(false);
  });

  it("hasLocalHeating pentru sobe/cazan lemn/peleți", () => {
    expect(computeVisibility({ heating: { source: "soba_teracota" } }).hasLocalHeating).toBe(true);
    expect(computeVisibility({ heating: { source: "cazan_lemn" } }).hasLocalHeating).toBe(true);
    expect(computeVisibility({ heating: { source: "gaz_cond" } }).hasLocalHeating).toBe(false);
  });

  it("hasWind reflectă otherRenew.windEnabled", () => {
    expect(computeVisibility({ otherRenew: { windEnabled: true } }).hasWind).toBe(true);
    expect(computeVisibility({ otherRenew: { windEnabled: false } }).hasWind).toBe(false);
    expect(computeVisibility({}).hasWind).toBe(false);
  });

  it("lightingMixt true pentru lighting.type='mixt'", () => {
    expect(computeVisibility({ lighting: { type: "mixt" } }).lightingMixt).toBe(true);
    expect(computeVisibility({ lighting: { type: "MIXT" } }).lightingMixt).toBe(true);
    expect(computeVisibility({ lighting: { type: "led" } }).lightingMixt).toBe(false);
  });

  it("robust la state gol (nu crashează)", () => {
    const vis = computeVisibility();
    expect(vis).toBeDefined();
    expect(vis.hasCooling).toBe(false);
    expect(vis.isBlock).toBe(false);
  });
});

describe("validateNumericRange — validare range", () => {
  it("'' / null / undefined sunt OK (nu obligatoriu)", () => {
    expect(validateNumericRange("", { min: 0, max: 10 })).toBe("");
    expect(validateNumericRange(null, { min: 0, max: 10 })).toBe("");
    expect(validateNumericRange(undefined, { min: 0, max: 10 })).toBe("");
  });

  it("returnează eroare pentru format non-numeric", () => {
    expect(validateNumericRange("abc", { label: "Diametru" })).toContain("invalid");
  });

  it("returnează eroare pentru valoare sub minim", () => {
    const err = validateNumericRange(5, { min: 10, max: 500, label: "Diametru" });
    expect(err).toContain("minim 10");
  });

  it("returnează eroare pentru valoare peste maxim", () => {
    const err = validateNumericRange(1000, { min: 10, max: 500, label: "Diametru" });
    expect(err).toContain("maxim 500");
  });

  it("returnează '' pentru valoare în range", () => {
    expect(validateNumericRange(50, { min: 10, max: 500 })).toBe("");
    expect(validateNumericRange("50", { min: 10, max: 500 })).toBe("");
  });

  it("acceptă doar min fără max", () => {
    expect(validateNumericRange(5, { min: 0 })).toBe("");
    expect(validateNumericRange(-1, { min: 0, label: "X" })).toContain("minim 0");
  });
});
