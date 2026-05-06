/**
 * @vitest-environment jsdom
 *
 * Teste pentru cost-optimal-export.js (Sprint Conformitate P1-04, 7 mai 2026).
 */

import { describe, it, expect } from "vitest";
import {
  exportCostOptimalPdf,
  exportCostOptimalXlsx,
} from "../cost-optimal-export.js";

const samplePackages = [
  {
    label: "Minim — izolație 5cm pereți",
    totalCost: 35000,
    npv: 12000,
    paybackYears: 8.5,
    epReduction: 25,
  },
  {
    label: "Mediu — izolație 10cm + ferestre triple",
    totalCost: 65000,
    npv: 28000,
    paybackYears: 6.2,
    epReduction: 45,
  },
  {
    label: "Maxim — izolație 15cm + HP geo + PV",
    totalCost: 120000,
    npv: 45000,
    paybackYears: 9.8,
    epReduction: 70,
  },
];

describe("exportCostOptimalPdf", () => {
  it("produce Blob PDF cu marker %PDF", async () => {
    const blob = await exportCostOptimalPdf({
      packages: samplePackages,
      building: { address: "Str. Test 1" },
      cpeCode: "ZEP-2026-T01",
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(2000);

    const ab = await blob.arrayBuffer();
    const text = new TextDecoder("latin1").decode(new Uint8Array(ab));
    expect(text.startsWith("%PDF-")).toBe(true);
  });

  it("acceptă scenarii custom multipliers", async () => {
    const blob = await exportCostOptimalPdf({
      packages: samplePackages,
      scenarios: { low: 0.7, expected: 1.0, high: 1.3 },
      download: false,
    });
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("default args (toate goale) — produce PDF valid fără throw", async () => {
    const blob = await exportCostOptimalPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });

  it("packages cu un singur element produce raport valid", async () => {
    const blob = await exportCostOptimalPdf({
      packages: [samplePackages[0]],
      download: false,
    });
    expect(blob.size).toBeGreaterThan(1000);
  });
});

describe("exportCostOptimalXlsx", () => {
  it("produce Blob XLSX (cu MIME corect)", async () => {
    const blob = await exportCostOptimalXlsx({
      packages: samplePackages,
      building: { address: "Str. Test 1" },
      cpeCode: "ZEP-2026-T01",
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain("openxmlformats-officedocument.spreadsheetml");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("XLSX conține 3 sheets (Pachete, Sensibilitate, Sumar)", async () => {
    const blob = await exportCostOptimalXlsx({
      packages: samplePackages,
      cpeCode: "X",
      download: false,
    });
    const xlsx = await import("xlsx");
    const ab = await blob.arrayBuffer();
    const wb = xlsx.read(new Uint8Array(ab), { type: "array" });
    expect(wb.SheetNames).toEqual(["Pachete", "Sensibilitate", "Sumar"]);
  });

  it("Sheet Pachete conține header + rânduri pentru fiecare pachet", async () => {
    const blob = await exportCostOptimalXlsx({
      packages: samplePackages,
      download: false,
    });
    const xlsx = await import("xlsx");
    const ab = await blob.arrayBuffer();
    const wb = xlsx.read(new Uint8Array(ab), { type: "array" });
    const ws = wb.Sheets["Pachete"];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    expect(rows).toHaveLength(samplePackages.length + 1); // header + 3 pachete
    expect(rows[0]).toEqual(["Pachet", "Cost total RON", "VAN 25 ani", "Payback (ani)", "Reducere EP %"]);
  });

  it("Sheet Sumar conține pachet recomandat (cel cu reducere EP max)", async () => {
    const blob = await exportCostOptimalXlsx({
      packages: samplePackages,
      cpeCode: "ZEP-X",
      building: { address: "Adr Test" },
      download: false,
    });
    const xlsx = await import("xlsx");
    const ab = await blob.arrayBuffer();
    const wb = xlsx.read(new Uint8Array(ab), { type: "array" });
    const ws = wb.Sheets["Sumar"];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    // Cel cu epReduction=70 (Maxim) ar trebui recomandat
    const recRow = rows.find(r => r[0] === "Pachet recomandat");
    expect(recRow[1]).toContain("Maxim");
  });

  it("Sensibilitate aplică multipliers corect", async () => {
    const blob = await exportCostOptimalXlsx({
      packages: [{ label: "Test", totalCost: 100000, paybackYears: 5, epReduction: 30 }],
      scenarios: { low: 0.8, expected: 1.0, high: 1.2 },
      download: false,
    });
    const xlsx = await import("xlsx");
    const ab = await blob.arrayBuffer();
    const wb = xlsx.read(new Uint8Array(ab), { type: "array" });
    const ws = wb.Sheets["Sensibilitate"];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    expect(rows[1]).toEqual(["Test", 80000, 100000, 120000]);
  });
});
