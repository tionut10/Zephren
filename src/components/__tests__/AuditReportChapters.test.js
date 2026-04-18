import { describe, it, expect } from "vitest";
import { generateConclusionsText } from "../AuditReportChapters.jsx";

/**
 * Sprint 16 Task 7 — Teste generator text concluzii (Capitol 7)
 */

describe("generateConclusionsText — auto-generare text concluzii", () => {
  const defaultInput = {
    energyClass: "C",
    epFinal: 150.5,
    rer: 25,
    nzebOk: false,
    mepsStatus: { level: "amber", year: 2030 },
    recs: [
      { priority: "HIGH", measure: "Termoizolare pereți exteriori" },
      { priority: "HIGH", measure: "Înlocuire tâmplărie" },
      { priority: "MED", measure: "Instalare pompă căldură" },
    ],
    building: { category: "RC", address: "Str. Test 1", city: "București" },
  };

  it("conține adresa clădirii", () => {
    const text = generateConclusionsText(defaultInput);
    expect(text).toContain("Str. Test 1");
    expect(text).toContain("București");
  });

  it("conține consumul EP formatat cu 1 zecimală", () => {
    const text = generateConclusionsText(defaultInput);
    expect(text).toContain("150.5");
  });

  it("menționează clasa energetică", () => {
    const text = generateConclusionsText(defaultInput);
    expect(text).toContain("clasa energetică C");
  });

  it("marchează RER sub 30% ca nerespectând pragul", () => {
    const text = generateConclusionsText({ ...defaultInput, rer: 25 });
    expect(text).toContain("sub");
    expect(text).toContain("25");
  });

  it("marchează RER ≥ 30% ca respectând pragul", () => {
    const text = generateConclusionsText({ ...defaultInput, rer: 35 });
    expect(text).toContain("respectând");
  });

  it("marchează NU nZEB când nzebOk=false", () => {
    const text = generateConclusionsText({ ...defaultInput, nzebOk: false });
    expect(text).toContain("NU respectă");
  });

  it("marchează RESPECTĂ nZEB când nzebOk=true", () => {
    const text = generateConclusionsText({ ...defaultInput, nzebOk: true });
    expect(text).toContain("RESPECTĂ");
  });

  it("include numărul de recomandări", () => {
    const text = generateConclusionsText(defaultInput);
    expect(text).toContain("3 măsuri");
  });

  it("listează primele 5 priorități", () => {
    const text = generateConclusionsText(defaultInput);
    expect(text).toContain("Termoizolare pereți exteriori");
    expect(text).toContain("Înlocuire tâmplărie");
    expect(text).toContain("Instalare pompă căldură");
  });

  it("tratează MEPS neconform ca 'intervenții urgente'", () => {
    const text = generateConclusionsText({
      ...defaultInput,
      mepsStatus: { level: "red", year: 2030 },
    });
    expect(text).toContain("urgente");
  });

  it("tratează MEPS conform ca 'respectă'", () => {
    const text = generateConclusionsText({
      ...defaultInput,
      mepsStatus: { level: "green", year: null },
    });
    expect(text).toContain("respectă MEPS");
  });

  it("gestionează lipsă recomandări (0)", () => {
    const text = generateConclusionsText({ ...defaultInput, recs: [] });
    expect(text).toContain("0 măsuri");
    expect(text).not.toContain("Priorități de intervenție");
  });

  it("gestionează clasă energetică lipsă", () => {
    const text = generateConclusionsText({
      ...defaultInput,
      energyClass: undefined,
    });
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
  });
});
