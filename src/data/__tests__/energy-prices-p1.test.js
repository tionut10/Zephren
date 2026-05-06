/**
 * energy-prices-p1.test.js — Sprint P1 (6 mai 2026) cleanup
 *
 * Teste pentru helperii canonici noi din energy-prices.js (P1-10):
 *   - getEnergyPriceFromPreset(fuelId, presetId): RON/kWh per combustibil + preset ANRE
 *   - getAverageEnergyPriceRON(presetId): medie ponderată gaz 60% + electricitate 40%
 *
 * Înlocuiește hardcodingul din Step7Audit (electricitate=1.30, gaz=0.32, default=0.30).
 */

import { describe, it, expect } from "vitest";
import {
  ENERGY_PRICE_PRESETS,
  DEFAULT_ENERGY_PRICES,
  getEnergyPriceFromPreset,
  getAverageEnergyPriceRON,
} from "../energy-prices.js";

describe("Sprint P1 P1-10 — getEnergyPriceFromPreset", () => {
  it("returnează prețul corect pentru gaz casnic 2025 (0.31 RON/kWh)", () => {
    expect(getEnergyPriceFromPreset("gaz", "casnic_2025")).toBe(0.31);
  });

  it("returnează prețul corect pentru electricitate casnic 2025 (1.29 RON/kWh)", () => {
    expect(getEnergyPriceFromPreset("electricitate", "casnic_2025")).toBe(1.29);
  });

  it("returnează prețul corect pentru biomasă casnic 2025 (0.21 RON/kWh)", () => {
    expect(getEnergyPriceFromPreset("biomasa", "casnic_2025")).toBe(0.21);
  });

  it("returnează preț redus pentru preset IMM 2025 (electricitate 0.92 vs 1.29 casnic)", () => {
    const casnic = getEnergyPriceFromPreset("electricitate", "casnic_2025");
    const imm = getEnergyPriceFromPreset("electricitate", "imm_2025");
    expect(imm).toBeLessThan(casnic);
    expect(imm).toBe(0.92);
  });

  it("returnează preț spike pentru preset criză 2022-2023", () => {
    const criza = getEnergyPriceFromPreset("electricitate", "maxim_2024");
    expect(criza).toBe(2.10);
    expect(criza).toBeGreaterThan(getEnergyPriceFromPreset("electricitate", "casnic_2025"));
  });

  it("fallback la DEFAULT_ENERGY_PRICES pentru preset invalid", () => {
    const r = getEnergyPriceFromPreset("gaz", "INEXISTENT");
    expect(r).toBe(DEFAULT_ENERGY_PRICES.gaz);
  });

  it("fallback graceful pentru combustibil necunoscut → preț gaz (FUEL_PRICE_KEY.default='gaz')", () => {
    // FUEL_PRICE_KEY.default = "gaz" pentru a evita NaN în calcul → fallback predictibil.
    const r = getEnergyPriceFromPreset("XYZ_UNKNOWN", "casnic_2025");
    expect(r).toBe(0.31); // gaz casnic 2025
  });

  it("acceptă alias termoficare_sursa → termoficare", () => {
    expect(getEnergyPriceFromPreset("termoficare_sursa", "casnic_2025"))
      .toBe(getEnergyPriceFromPreset("termoficare", "casnic_2025"));
  });
});

describe("Sprint P1 P1-10 — getAverageEnergyPriceRON", () => {
  it("medie ponderată 60% gaz + 40% electricitate (casnic 2025)", () => {
    // 0.31 * 0.6 + 1.29 * 0.4 = 0.186 + 0.516 = 0.702 → 0.70
    const r = getAverageEnergyPriceRON("casnic_2025");
    expect(r).toBeCloseTo(0.70, 1);
  });

  it("preț mediu mai mic pentru IMM vs casnic", () => {
    expect(getAverageEnergyPriceRON("imm_2025"))
      .toBeLessThan(getAverageEnergyPriceRON("casnic_2025"));
  });

  it("preț mediu mai mic pentru industrial vs IMM", () => {
    expect(getAverageEnergyPriceRON("industrial_2025"))
      .toBeLessThan(getAverageEnergyPriceRON("imm_2025"));
  });
});

describe("Sprint P1 — ENERGY_PRICE_PRESETS structure", () => {
  it("4 preset-uri (casnic, IMM, industrial, maxim_2024)", () => {
    expect(ENERGY_PRICE_PRESETS.length).toBe(4);
    const ids = ENERGY_PRICE_PRESETS.map(p => p.id);
    expect(ids).toContain("casnic_2025");
    expect(ids).toContain("imm_2025");
    expect(ids).toContain("industrial_2025");
    expect(ids).toContain("maxim_2024");
  });

  it("toate preset-urile au 8 combustibili (gaz, electricitate, GPL, motorină, cărbune, biomasă, lemn, termoficare)", () => {
    const expected = ["gaz", "electricitate", "gpl", "motorina", "carbune", "biomasa", "lemn_foc", "termoficare"];
    ENERGY_PRICE_PRESETS.forEach(preset => {
      expected.forEach(fuel => {
        expect(preset.prices, `preset ${preset.id} fuel ${fuel}`).toHaveProperty(fuel);
        expect(typeof preset.prices[fuel]).toBe("number");
        expect(preset.prices[fuel]).toBeGreaterThan(0);
      });
    });
  });
});
