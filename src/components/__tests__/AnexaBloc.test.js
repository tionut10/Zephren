import { describe, it, expect } from "vitest";
import { calcApartmentResults } from "../AnexaBloc.jsx";

/**
 * Sprint 16 Task 7 — Teste calcul EP per apartament (Mc 001-2022 Anexa 7)
 */

describe("calcApartmentResults — clasificare multi-apartament", () => {
  const baseApartments = [
    { id: "1", number: "1", areaUseful: "60", floor: 0, groundFloor: true, corner: false, topFloor: false },
    { id: "2", number: "2", areaUseful: "60", floor: 1, corner: false, topFloor: false },
    { id: "3", number: "3", areaUseful: "60", floor: 2, corner: false, topFloor: false },
    { id: "4", number: "4", areaUseful: "60", floor: 3, corner: true, topFloor: true },
  ];

  it("returnează rezultate pentru fiecare apartament", () => {
    const { results, summary } = calcApartmentResults(baseApartments, 150, 40, "RC_nocool");
    expect(results).toHaveLength(4);
    expect(summary.count).toBe(4);
  });

  it("aplică corecție +10% pentru parter interior", () => {
    const { results } = calcApartmentResults(baseApartments, 100, 30, "RC_nocool");
    const ground = results.find((r) => r.posKey === "ground_interior");
    expect(ground.posFactor).toBe(1.10);
    expect(ground.epAptM2).toBeCloseTo(110, 5);
  });

  it("aplică corecție +15% pentru ultimul etaj colț", () => {
    const { results } = calcApartmentResults(baseApartments, 100, 30, "RC_nocool");
    const top = results.find((r) => r.posKey === "top_corner");
    expect(top.posFactor).toBe(1.15);
    expect(top.epAptM2).toBeCloseTo(115, 5);
  });

  it("aplică corecție 1.00 pentru etaj curent interior", () => {
    const { results } = calcApartmentResults(baseApartments, 100, 30, "RC_nocool");
    const mid = results.filter((r) => r.posKey === "mid_interior");
    expect(mid).toHaveLength(2);
    mid.forEach((r) => {
      expect(r.posFactor).toBe(1.00);
      expect(r.epAptM2).toBe(100);
    });
  });

  it("calculează media ponderată pe Au", () => {
    const { summary } = calcApartmentResults(baseApartments, 100, 30, "RC_nocool");
    // 4 ap × 60 m² each → total 240 m²
    expect(summary.totalAu).toBe(240);
    // Factori: 1.10 + 1.00 + 1.00 + 1.15 = 4.25 → media ponderată = 100 × 4.25/4 = 106.25
    expect(summary.epAvgWeighted).toBeCloseTo(106.25, 1);
  });

  it("returnează distribuția claselor", () => {
    const { summary } = calcApartmentResults(baseApartments, 100, 30, "RC_nocool");
    expect(summary.classDistribution).toBeDefined();
    // Toate în jurul clasei B-C pentru RC_nocool (prag 84/168)
    const totalCount = Object.values(summary.classDistribution).reduce((s, n) => s + n, 0);
    expect(totalCount).toBe(4);
  });

  it("returnează rezultate goale la input vid", () => {
    const { results, summary } = calcApartmentResults([], 100, 30, "RC_nocool");
    expect(results).toEqual([]);
    expect(summary).toBeNull();
  });

  it("returnează rezultate goale la EP=0", () => {
    const { results, summary } = calcApartmentResults(baseApartments, 0, 30, "RC_nocool");
    expect(results).toEqual([]);
    expect(summary).toBeNull();
  });

  it("calculează allocatedPct pro-rata suprafață", () => {
    const mixed = [
      { id: "1", number: "1", areaUseful: "120", floor: 1 },
      { id: "2", number: "2", areaUseful: "60", floor: 1 },
    ];
    const { results } = calcApartmentResults(mixed, 100, 30, "RC_nocool");
    expect(results[0].allocatedPct).toBeCloseTo(66.67, 1);
    expect(results[1].allocatedPct).toBeCloseTo(33.33, 1);
  });

  it("păstrează pct explicit dacă e deja setat", () => {
    const withExplicit = [
      { id: "1", areaUseful: "60", floor: 1, allocatedCommonPct: 30 },
      { id: "2", areaUseful: "60", floor: 1, allocatedCommonPct: 70 },
    ];
    const { results } = calcApartmentResults(withExplicit, 100, 30, "RC_nocool");
    expect(results[0].allocatedPct).toBe(30);
    expect(results[1].allocatedPct).toBe(70);
  });

  it("calculează CO₂ cu același factor de poziție", () => {
    const apt = [
      { id: "1", areaUseful: "60", floor: 0, groundFloor: true, corner: true },
    ];
    const { results } = calcApartmentResults(apt, 100, 30, "RC_nocool");
    expect(results[0].posFactor).toBe(1.18); // ground_corner
    expect(results[0].co2AptM2).toBeCloseTo(30 * 1.18, 2);
  });
});
