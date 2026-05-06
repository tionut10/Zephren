/**
 * rehab-scenarios.test.js — Sprint P0-C (6 mai 2026) P1-04
 *
 * Verifică sursa canonică unică pentru SCENARIO_PRESETS — eliminarea
 * duplicării conflictuale (Minim 10cm vs MINIM 5cm) din energy-calc.jsx.
 */

import { describe, it, expect } from "vitest";
import {
  SCENARIO_PRESETS,
  getScenarioPreset,
  getMultiScenariosCompact,
} from "../rehab-scenarios.js";

describe("Sprint P0-C P1-04 — SCENARIO_PRESETS canonic", () => {
  it("3 preset-uri MINIM/MEDIU/MAXIM cu IDs unice", () => {
    expect(SCENARIO_PRESETS.length).toBe(3);
    const ids = SCENARIO_PRESETS.map(p => p.id);
    expect(ids).toEqual(["MINIM", "MEDIU", "MAXIM"]);
    expect(new Set(ids).size).toBe(3); // unice
  });

  it("MINIM = 5cm pereți (prag jos C107 legacy)", () => {
    const p = getScenarioPreset("MINIM");
    expect(p.insulWallThickness).toBe("5");
    expect(p.insulRoofThickness).toBe("8");
    expect(p.replaceWindows).toBe(false);
    expect(p.addPV).toBe(false);
    expect(p.addHP).toBe(false);
  });

  it("MEDIU = 10cm pereți (recomandat Mc 001-2022 + PNRR)", () => {
    const p = getScenarioPreset("MEDIU");
    expect(p.insulWallThickness).toBe("10");
    expect(p.insulRoofThickness).toBe("15");
    expect(p.replaceWindows).toBe(true);
    expect(p.newWindowU).toBe("0.90");
    expect(p.addPV).toBe(true);
    expect(p.addHR).toBe(true);
  });

  it("MAXIM = 15cm pereți (nZEB Tab 2.4)", () => {
    const p = getScenarioPreset("MAXIM");
    expect(p.insulWallThickness).toBe("15");
    expect(p.insulRoofThickness).toBe("25");
    expect(p.newWindowU).toBe("0.70");
    expect(p.addPV).toBe(true);
    expect(p.addHP).toBe(true);
    expect(p.addSolarTh).toBe(true);
    expect(p.addInsulBasement).toBe(true);
  });

  it("getMultiScenariosCompact returnează format React-ready cu IDs S1/S2/S3", () => {
    const compact = getMultiScenariosCompact();
    expect(compact.length).toBe(3);
    expect(compact.map(s => s.id)).toEqual(["S1", "S2", "S3"]);
    expect(compact[0].name).toBe("Minim");
    expect(compact[1].name).toBe("Mediu");
    expect(compact[2].name).toBe("Maxim (nZEB)");
    // Aceleași grosimi ca SCENARIO_PRESETS (consistency)
    expect(compact[0].insulWallThickness).toBe("5");
    expect(compact[1].insulWallThickness).toBe("10");
    expect(compact[2].insulWallThickness).toBe("15");
  });

  it("getScenarioPreset returnează null pentru ID invalid", () => {
    expect(getScenarioPreset("INVALID")).toBeNull();
    expect(getScenarioPreset("")).toBeNull();
  });

  it("Toate preset-urile au câmpurile obligatorii pentru rehabScenarioInputs", () => {
    const requiredFields = [
      "addInsulWall", "insulWallThickness", "addInsulRoof", "insulRoofThickness",
      "addInsulBasement", "insulBasementThickness", "replaceWindows", "newWindowU",
      "addHR", "hrEfficiency", "addPV", "pvArea", "addHP", "hpCOP",
      "addSolarTh", "solarThArea",
    ];
    SCENARIO_PRESETS.forEach(p => {
      requiredFields.forEach(f => {
        expect(p, `preset ${p.id} câmp ${f}`).toHaveProperty(f);
      });
    });
  });
});
