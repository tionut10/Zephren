import { describe, it, expect } from "vitest";
import { C107_U_MAX, C107_R_MIN, getC107UMax, getRenovUMax, checkC107Conformity } from "../c107.js";

describe("C107/2-2005 — Tabele U maxim", () => {
  it("U max perete exterior rezidențial = 0.35", () => {
    expect(getC107UMax("PE", "RI")).toBe(0.35);
    expect(getC107UMax("PE", "RC")).toBe(0.35);
  });

  it("U max fereastră rezidențial = 1.30", () => {
    expect(getC107UMax("FE", "RI")).toBe(1.30);
  });

  it("U max terasă rezidențial = 0.30", () => {
    expect(getC107UMax("PT", "RI")).toBe(0.30);
  });

  it("U max birouri fereastră = 1.50", () => {
    expect(getC107UMax("FE", "BI")).toBe(1.50);
  });

  it("Tip element necunoscut → null", () => {
    expect(getC107UMax("XX", "RI")).toBeNull();
  });

  it("R min = invers U max", () => {
    expect(C107_R_MIN.PE.RI).toBeCloseTo(1 / 0.35, 1);
  });
});

describe("Mc 001-2022 — U max renovare majoră", () => {
  it("U renov PE rezidențial = 0.22 (mai strict decât C107)", () => {
    expect(getRenovUMax("PE", "RI")).toBe(0.22);
    expect(getRenovUMax("PE", "RI")).toBeLessThan(getC107UMax("PE", "RI"));
  });

  it("U renov FE rezidențial = 1.10", () => {
    expect(getRenovUMax("FE", "RI")).toBe(1.10);
  });
});

describe("checkC107Conformity — verificare elemente", () => {
  const calcR = (layers) => {
    return layers.reduce((r, l) => r + ((l.thickness || 0) / 1000) / (l.lambda || 1), 0.17);
  };

  it("Perete bine izolat → CONFORM", () => {
    const result = checkC107Conformity(
      [{ name: "PE Nord", type: "PE", layers: [
        { thickness: 300, lambda: 0.46 },  // cărămidă
        { thickness: 100, lambda: 0.04 },  // EPS
      ]}],
      [],
      "RI",
      calcR
    );
    expect(result.nNonConform).toBe(0);
    expect(result.checks[0].conform).toBe(true);
  });

  it("Perete neizolat → NECONFORM", () => {
    const result = checkC107Conformity(
      [{ name: "PE Nord", type: "PE", layers: [
        { thickness: 300, lambda: 0.46 },  // cărămidă fără izolație
      ]}],
      [],
      "RI",
      calcR
    );
    expect(result.nNonConform).toBe(1);
    expect(result.checks[0].conform).toBe(false);
    expect(result.checks[0].severity).toMatch(/neconform/);
  });

  it("Fereastră performantă → CONFORM", () => {
    const result = checkC107Conformity(
      [],
      [{ name: "Fereastră S", type: "FE", u_value: 1.1 }],
      "RI",
      calcR
    );
    expect(result.nNonConform).toBe(0);
  });

  it("Categorie invalidă → aruncă eroare", () => {
    expect(() => checkC107Conformity([], [], "INVALID", calcR)).toThrow();
  });

  it.each([
    ["CP", "RC"],   // cămin studențesc → rezidențial colectiv
    ["AD", "BI"],   // clădire administrativă → birouri
    ["BA_OFF", "BI"],
    ["GR", "AL"],   // grădiniță
    ["SC", "AL"],   // școală
    ["UN", "AL"],   // universitate
    ["SPA_H", "AL"],// spital
    ["REST", "CO"], // restaurant
    ["MAG", "CO"],  // magazin
    ["SUPER", "CO"],// supermarket
    ["IU", "IN"],   // industrie ușoară
    ["HAL", "IN"],  // hală
    ["DEP", "IN"],  // depozit
  ])("Mapare categorie %s → %s nu aruncă eroare", (cat) => {
    expect(() => checkC107Conformity([], [], cat, calcR)).not.toThrow();
  });
});
