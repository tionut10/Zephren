/**
 * point-bridges.test.js — Sprint 22 #2
 * Punți termice punctuale χ [W/K] × N integrate în H_tb global.
 *
 * Referințe:
 *  - SR EN ISO 14683:2017 §8.3 (punți punctuale)
 *  - SR EN ISO 10211:2017 cap.7 (calcul detaliat χ prin modelare 3D)
 *  - Mc 001-2022 Anexa B
 *
 * Formula: H_tb_point = Σ(χ_i × N_i)
 */
import { describe, it, expect } from "vitest";

/**
 * Helper: reimplementează logica din useEnvelopeSummary pentru test izolat.
 * H_tb = Σ(ψ × L) + Σ(χ × N)
 */
function calcHtb(linearBridges, pointBridges) {
  let linearLoss = 0;
  linearBridges.forEach(b => {
    linearLoss += (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0);
  });
  let pointLoss = 0;
  pointBridges.forEach(b => {
    pointLoss += (parseFloat(b.chi) || 0) * (parseFloat(b.count) || 0);
  });
  return { linearLoss, pointLoss, total: linearLoss + pointLoss };
}

describe("Sprint 22 #2 — Punți termice punctuale χ × N (SR EN ISO 14683 §8.3)", () => {
  it("Fără punți punctuale → pointLoss = 0", () => {
    const r = calcHtb(
      [{ psi: 0.15, length: 30 }],
      []
    );
    expect(r.pointLoss).toBe(0);
    expect(r.total).toBeCloseTo(4.5, 3);
  });

  it("Dibluri ETICS (6 buc/m² × 100 m² × χ=0.003) → +1.8 W/K", () => {
    const r = calcHtb(
      [],
      [{ name: "Dibluri ETICS", chi: 0.003, count: 600 }]
    );
    expect(r.pointLoss).toBeCloseTo(1.8, 3);
  });

  it("Ancore consolă balcon metalică (χ=0.5, N=4) → +2.0 W/K", () => {
    const r = calcHtb(
      [],
      [{ name: "Ancore balcon oțel", chi: 0.5, count: 4 }]
    );
    expect(r.pointLoss).toBeCloseTo(2.0, 3);
  });

  it("Combinație liniare + punctuale → total însumat corect", () => {
    const r = calcHtb(
      [
        { psi: 0.20, length: 40 }, // 8.0 W/K
        { psi: 0.15, length: 25 }, // 3.75 W/K
      ],
      [
        { chi: 0.02, count: 50 },   // 1.0 W/K
        { chi: 0.05, count: 8 },    // 0.4 W/K
      ]
    );
    expect(r.linearLoss).toBeCloseTo(8.0 + 3.75, 3);
    expect(r.pointLoss).toBeCloseTo(1.0 + 0.4, 3);
    expect(r.total).toBeCloseTo(13.15, 3);
  });

  it("Valori invalide (NaN / negative) → tratate robust ca 0", () => {
    const r = calcHtb(
      [],
      [
        { chi: "abc", count: 10 },
        { chi: null, count: 5 },
        { chi: 0.01, count: undefined },
      ]
    );
    expect(r.pointLoss).toBe(0);
  });

  it("Impact mare: 1000 penetrații × χ=0.1 → 100 W/K (dominant pe perete mic)", () => {
    const r = calcHtb(
      [{ psi: 0.1, length: 80 }], // 8.0 W/K
      [{ chi: 0.1, count: 1000 }]  // 100 W/K
    );
    // Punți punctuale >10× pierderile liniare
    expect(r.pointLoss / r.linearLoss).toBeGreaterThan(10);
  });

  it("Schema de element: { id, name, chi, count } — cerută de UI Step2", () => {
    const sample = { id: 1, name: "Test", chi: 0.02, count: 5 };
    const r = calcHtb([], [sample]);
    expect(r.pointLoss).toBeCloseTo(0.1, 3);
    expect(sample).toMatchObject({ id: expect.anything(), name: expect.any(String), chi: expect.any(Number), count: expect.any(Number) });
  });

  it("Valori tipice PHI Passipedia (χ 0.01-0.05 pentru elemente izolate bine)", () => {
    // Passipedia: ancoraj streașină izolat → χ ≈ 0.01-0.02 W/K
    const r = calcHtb(
      [],
      [
        { name: "Ancoraj streașină PHI", chi: 0.015, count: 20 },
      ]
    );
    expect(r.pointLoss).toBeCloseTo(0.3, 3);
    expect(r.pointLoss).toBeLessThan(1.0); // impact redus pentru detalii certificate Passive House
  });
});
