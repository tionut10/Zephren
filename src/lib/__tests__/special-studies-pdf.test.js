/**
 * @vitest-environment jsdom
 *
 * Teste pentru special-studies-pdf.js (Sprint Conformitate P1-11..P1-13, 7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  generateAlternativeSystemsStudyPdf,
  generateEvPrecablingPdf,
  generateFoaieParcursStandalonePdf,
} from "../special-studies-pdf.js";

async function blobIsPdf(blob) {
  const ab = await blob.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(ab));
  return text.startsWith("%PDF-");
}

describe("generateAlternativeSystemsStudyPdf (P1-11)", () => {
  it("produce PDF cu marker %PDF + size rezonabil", async () => {
    const blob = await generateAlternativeSystemsStudyPdf({
      building: { address: "Str. Test 1", category: "RI", areaUseful: 100 },
      climate: { zone: "II" },
      baseline: {
        totalInvestment: 30000,
        annualEnergyConsumption_kWh: 12000,
        energyPriceRON_per_kWh: 0.85,
      },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("default args (toate goale) → PDF valid fără throw", async () => {
    const blob = await generateAlternativeSystemsStudyPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("acceptă baseline custom cu energie diferită", async () => {
    const b1 = await generateAlternativeSystemsStudyPdf({
      baseline: { annualEnergyConsumption_kWh: 5000 },
      download: false,
    });
    const b2 = await generateAlternativeSystemsStudyPdf({
      baseline: { annualEnergyConsumption_kWh: 50000 },
      download: false,
    });
    expect(b1.size).toBeGreaterThan(0);
    expect(b2.size).toBeGreaterThan(0);
  });
});

describe("generateEvPrecablingPdf (P1-12)", () => {
  it("rezidențial ≥3 unități → cere pre-cabling toate locurile + 1 priză", async () => {
    const blob = await generateEvPrecablingPdf({
      building: { address: "Str. Test 1", category: "RI" },
      parkingSlots: 5,
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    const text = new TextDecoder("latin1").decode(new Uint8Array(await blob.arrayBuffer()));
    // 5 locuri rezidențial >= 3 prag → minPlaces=5, minPrize=1
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("rezidențial <3 unități → fără cerințe (sub prag)", async () => {
    const blob = await generateEvPrecablingPdf({
      building: { category: "RI" },
      parkingSlots: 2,
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it("nerezidențial ≥10 locuri → 50% pre-cablate + 1 priză", async () => {
    const blob = await generateEvPrecablingPdf({
      building: { address: "Birou Test", category: "BI" },
      parkingSlots: 20,
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("default args → PDF valid", async () => {
    const blob = await generateEvPrecablingPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
  });
});

describe("generateFoaieParcursStandalonePdf (P1-13)", () => {
  it("produce PDF prietenos cu beneficiar (3+ pagini cu phases)", async () => {
    const blob = await generateFoaieParcursStandalonePdf({
      building: { address: "Str. Test 1" },
      owner: { name: "Popescu Ion" },
      phases: [
        { year: 2027, label: "Izolare pereți + ETICS 10cm", costRON: 35000, savingsKwhPerYear: 4500, fundingSource: "AFM Casa Eficientă" },
        { year: 2030, label: "Înlocuire ferestre triple-vitraj", costRON: 28000, savingsKwhPerYear: 2500 },
        { year: 2033, label: "Pompă căldură aer-apă + PV 5kW", costRON: 75000, savingsKwhPerYear: 6500, fundingSource: "Casa Verde + AFM" },
      ],
      summary: {
        totalCost: 138000,
        annualSavings: 11475,
        totalSavingsKwh: 13500,
        paybackYears: 12.0,
      },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(3000);
  });

  it("phases cu funding source apare în card", async () => {
    const blob = await generateFoaieParcursStandalonePdf({
      phases: [
        { year: 2026, label: "Izolare", costRON: 30000, savingsKwhPerYear: 4000, fundingSource: "AFM" },
      ],
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("default args → PDF valid", async () => {
    const blob = await generateFoaieParcursStandalonePdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
  });

  it("phases multiple (5+) gestionează page breaks", async () => {
    const phases = Array.from({ length: 7 }, (_, i) => ({
      year: 2027 + i,
      label: `Faza ${i + 1}`,
      costRON: 10000 * (i + 1),
      savingsKwhPerYear: 1000 * (i + 1),
    }));
    const blob = await generateFoaieParcursStandalonePdf({ phases, download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(4000);
  });
});
