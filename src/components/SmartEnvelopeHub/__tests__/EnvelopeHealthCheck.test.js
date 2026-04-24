/**
 * EnvelopeHealthCheck.test.js — teste pentru logica de verificare automată anvelopă.
 */

import { describe, it, expect } from "vitest";
import { runEnvelopeHealthCheck } from "../EnvelopeHealthCheck.jsx";

const ELEMENT_TYPES = [
  { id: "PE", label: "Perete exterior", tau: 1.0 },
  { id: "PT", label: "Planșeu terasă", tau: 1.0 },
  { id: "PL", label: "Placă pe sol", tau: 0.5 },
];

// Mock getURefNZEB — returnează U'max conform Mc 001-2022 Anexa A
function mockGetURefNZEB(category, elType) {
  const map = { PE: 0.35, PT: 0.25, PL: 0.35 };
  return map[elType] || 0.5;
}

const mockU_REF_GLAZING = { nzeb_res: 1.30, nzeb_nres: 1.80 };

// Mock calcOpaqueR — simplificat pe baza grosimii izolației
function mockCalcOpaqueR(layers, type) {
  if (!layers || !layers.length) return { u: 0 };
  const rLayers = layers.reduce((s, l) => s + ((l.thickness || 0) / 1000) / (l.lambda || 1), 0);
  const rTot = 0.13 + rLayers + 0.04;
  return { u: rTot > 0 ? 1 / rTot : 0 };
}

describe("EnvelopeHealthCheck — coerență geometrică", () => {
  it("ridică warning când suma ariilor e <70% din perimetru×H×N", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 2, nUnderground: 0, category: "RI" },
      opaqueElements: [{ type: "PE", area: 50, layers: [] }], // 50 m² < 70% × 240 = 168
      glazingElements: [],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.geometry.length).toBeGreaterThan(0);
    expect(result.geometry[0].msg).toMatch(/mai mică/);
  });

  it("ridică warning când ariile depășesc cu >30%", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 20, height: 3, nFloors: 1, nUnderground: 0, category: "RI" },
      opaqueElements: [{ type: "PE", area: 100, layers: [] }], // 100 > 1.3 × 60 = 78
      glazingElements: [],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.geometry.length).toBeGreaterThan(0);
    expect(result.geometry[0].msg).toMatch(/depășește/);
  });

  it("trece fără warning când ariile sunt coerente", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, nUnderground: 0, category: "RI" },
      opaqueElements: [{ type: "PE", area: 100, layers: [] }], // 100 m² ≈ 83% din 120
      glazingElements: [{ area: 15, u: 1.0 }],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.geometry.length).toBe(0);
  });
});

describe("EnvelopeHealthCheck — punți termice lipsă", () => {
  it("detectează lipsa punții termice soclu când există PE", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{ type: "PE", area: 100, layers: [] }],
      glazingElements: [],
      thermalBridges: [{ name: "Colț exterior zidărie", psi: 0.1 }],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    const hasSoclu = result.missingBridges.some(mb => mb.label.toLowerCase().includes("soclu"));
    expect(hasSoclu).toBe(true);
  });

  it("detectează lipsa glafului când există ferestre", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{ type: "PE", area: 100, layers: [] }],
      glazingElements: [{ area: 15, u: 1.0 }],
      thermalBridges: [{ name: "Soclu fundație", psi: 0.12 }],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    const hasGlaf = result.missingBridges.some(mb => mb.label.toLowerCase().includes("glaf"));
    expect(hasGlaf).toBe(true);
  });

  it("nu ridică false positives când punțile esențiale sunt prezente", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{ type: "PE", area: 100, layers: [] }],
      glazingElements: [{ area: 15, u: 1.0 }],
      thermalBridges: [
        { name: "Soclu fundație beton", psi: 0.12 },
        { name: "Streașină perete-acoperiș", psi: 0.08 },
        { name: "Colț exterior PE-PE", psi: 0.10 },
        { name: "Planșeu intermediar BA penetrant", psi: 0.15 },
        { name: "Glaf sub fereastră PVC", psi: 0.05 },
      ],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.missingBridges.length).toBe(0);
  });
});

describe("EnvelopeHealthCheck — elemente peste U'max", () => {
  it("detectează element cu U > U'max nZEB", () => {
    // Perete subțire cu doar 5cm izolație — U ≈ 0.65 > U'max 0.35
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{
        name: "Perete subțire",
        type: "PE",
        area: 100,
        layers: [{ thickness: 50, lambda: 0.04 }],
      }],
      glazingElements: [],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.failingElements.length).toBeGreaterThan(0);
    expect(result.failingElements[0].excess).toBeGreaterThan(0);
  });

  it("trece când U respectă U'max", () => {
    // Perete cu 30cm izolație — U ≈ 0.12 < U'max 0.35
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{
        name: "Perete izolat bine",
        type: "PE",
        area: 100,
        layers: [{ thickness: 300, lambda: 0.04 }],
      }],
      glazingElements: [],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.failingElements.length).toBe(0);
  });
});

describe("EnvelopeHealthCheck — overall status", () => {
  it("returnează 'ok' când nu există probleme", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{
        name: "Perete izolat",
        type: "PE",
        area: 100,
        layers: [{ thickness: 300, lambda: 0.04 }],
      }],
      glazingElements: [],
      thermalBridges: [
        { name: "Soclu fundație beton", psi: 0.12 },
        { name: "Streașină", psi: 0.08 },
        { name: "Colț exterior", psi: 0.10 },
        { name: "Planșeu intermediar", psi: 0.15 },
      ],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.overallStatus).toBe("ok");
  });

  it("returnează 'fail' când există elemente peste U'max", () => {
    const result = runEnvelopeHealthCheck({
      building: { perimeter: 40, height: 3, nFloors: 1, category: "RI" },
      opaqueElements: [{ name: "Bad wall", type: "PE", area: 100, layers: [{ thickness: 50, lambda: 0.04 }] }],
      glazingElements: [],
      thermalBridges: [],
      calcOpaqueR: mockCalcOpaqueR,
      ELEMENT_TYPES,
      getURefNZEB: mockGetURefNZEB,
      U_REF_GLAZING: mockU_REF_GLAZING,
    });
    expect(result.overallStatus).toBe("fail");
  });
});
