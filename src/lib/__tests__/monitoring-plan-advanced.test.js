/**
 * @vitest-environment jsdom
 *
 * Teste pentru generateMonitoringPlanAdvancedPdf (Sprint Conformitate P1-14).
 */

import { describe, it, expect } from "vitest";
import {
  IPMVP_OPTIONS_META,
  generateMonitoringPlanAdvancedPdf,
  generateMonitoringPlanPdf,
} from "../dossier-extras.js";

async function blobIsPdf(blob) {
  const ab = await blob.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(ab));
  return text.startsWith("%PDF-");
}

describe("IPMVP_OPTIONS_META", () => {
  it("conține cele 4 opțiuni standard A/B/C/D", () => {
    expect(IPMVP_OPTIONS_META.A).toBeDefined();
    expect(IPMVP_OPTIONS_META.B).toBeDefined();
    expect(IPMVP_OPTIONS_META.C).toBeDefined();
    expect(IPMVP_OPTIONS_META.D).toBeDefined();
  });

  it("este înghețat", () => {
    expect(Object.isFrozen(IPMVP_OPTIONS_META)).toBe(true);
  });

  it("fiecare opțiune are 7 câmpuri obligatorii", () => {
    for (const opt of ["A", "B", "C", "D"]) {
      const m = IPMVP_OPTIONS_META[opt];
      expect(m.label).toBeTruthy();
      expect(m.method).toBeTruthy();
      expect(m.boundary).toBeTruthy();
      expect(m.keyMeasurements).toBeTruthy();
      expect(m.frequency).toBeTruthy();
      expect(m.bestFor).toBeTruthy();
      expect(m.uncertaintyTypical).toBeTruthy();
    }
  });
});

describe("generateMonitoringPlanAdvancedPdf", () => {
  it("default options=['C'] → PDF cu o singură opțiune", async () => {
    const blob = await generateMonitoringPlanAdvancedPdf({
      building: { address: "Str. Test 1" },
      auditor: { name: "Test", atestat: "A" },
      scenario: { totalCost_RON: 50000, expectedSavings_RON_y: 8000 },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("multi-select A+B+C+D → PDF cu 4 capitole", async () => {
    const blob = await generateMonitoringPlanAdvancedPdf({
      options: ["A", "B", "C", "D"],
      building: { address: "x" },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(3000); // mai mare pentru 4 capitole
  });

  it("opțiuni invalide filtrate, fallback la C", async () => {
    const blob = await generateMonitoringPlanAdvancedPdf({
      options: ["X", "Y", "Z"], // toate invalide
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    // Fallback la ["C"] — PDF generat fără throw
  });

  it("doar A — recomandare combinație cu C", async () => {
    const blob = await generateMonitoringPlanAdvancedPdf({
      options: ["A"],
      download: false,
    });
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("default args (toate goale) → PDF valid fără throw", async () => {
    const blob = await generateMonitoringPlanAdvancedPdf({ download: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
  });
});

describe("Backward-compat — generateMonitoringPlanPdf existing NEATINS", () => {
  it("API existing rămâne neschimbat", async () => {
    const blob = await generateMonitoringPlanPdf({
      building: { address: "Test" },
      auditor: { name: "A" },
      instSummary: { ep_total_m2: 100 },
      scenario: { measures: [], totalCost_RON: 10000, expectedSavings_RON_y: 1500 },
      download: false,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blobIsPdf(blob)).toBe(true);
  });
});
