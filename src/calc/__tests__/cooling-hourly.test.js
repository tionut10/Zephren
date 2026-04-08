import { describe, it, expect } from "vitest";
import { calcCoolingHourly, COOLING_INTERNAL_GAINS } from "../cooling-hourly.js";

const climate = { temp_month: [-3, -1, 5, 12, 18, 22, 24, 24, 19, 12, 5, -1], zone: "II" };

describe("Sarcină frigorifică orară — ISO 52016-1 simplificat", () => {
  it("Birouri 200 m² — sarcina anuală > 0", () => {
    const r = calcCoolingHourly({
      Au: 200, V: 560,
      glazingElements: [
        { area: 15, orientation: "S", g: 0.6, u: 1.1 },
        { area: 10, orientation: "E", g: 0.6, u: 1.1 },
      ],
      opaqueElements: [{ area: 300, type: "PE", u: 0.35 }],
      climate,
      internalGainsType: "office",
    });
    expect(r.Q_annual_kWh).toBeGreaterThan(0);
    expect(r.peak_kW).toBeGreaterThan(0);
    expect(r.monthly).toHaveLength(12);
  });

  it("Câștiguri solare Est/Vest vara > iarna", () => {
    // Pe orientarea E/V, iradianța e clar mai mare vara
    const r = calcCoolingHourly({
      Au: 100, V: 280, climate,
      glazingElements: [{ area: 10, orientation: "E", g: 0.6, u: 1.1 }],
    });
    const july = r.monthly[6]; // Iulie
    const jan = r.monthly[0];  // Ianuarie
    expect(july.Q_solar_kWh).toBeGreaterThan(jan.Q_solar_kWh);
  });

  it("Breakdown adună la 100%", () => {
    const r = calcCoolingHourly({ Au: 200, V: 560, climate, glazingElements: [{ area: 20, orientation: "S", g: 0.6, u: 1.1 }] });
    const sum = r.breakdown.solar_pct + r.breakdown.internal_pct + r.breakdown.transmission_pct + r.breakdown.ventilation_pct;
    expect(sum).toBeCloseTo(100, 0);
  });

  it("5 tipuri câștiguri interne definite", () => {
    expect(Object.keys(COOLING_INTERNAL_GAINS)).toContain("office");
    expect(Object.keys(COOLING_INTERNAL_GAINS)).toContain("residential");
    expect(Object.keys(COOLING_INTERNAL_GAINS)).toContain("hospital");
  });

  it("Recomandări generate", () => {
    const r = calcCoolingHourly({ Au: 200, V: 560, climate, glazingElements: [{ area: 30, orientation: "V", g: 0.6, u: 1.1 }] });
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});
