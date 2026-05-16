/**
 * @vitest-environment jsdom
 *
 * merge-approved-measures.test.js — Sprint Suggestion Queue C (16 mai 2026)
 *
 * Acoperă cele 3 conversii (CPE / Audit / Pașaport) + merge logic.
 */

import { describe, it, expect } from "vitest";
import {
  convertMeasureToCpeRecommendation,
  mergeApprovedIntoCpeRecommendations,
  convertMeasureToAuditCard,
  buildR4Cards,
  convertMeasureToPassportFormat,
  buildAuditorPhase,
  mergeApprovedIntoPassportRoadmap,
} from "../merge-approved-measures.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const measureHeating = {
  id: "pm_abc123",
  sourceStep: "Step7-auto",
  category: "heating",
  catalogEntryId: "PC_AA_R290",
  label: "Pompă căldură aer-aer A++ R290",
  labelEN: "Air-air heat pump A++ R290",
  description: "Sistem premium cu invertor",
  tech: { SCOP: 4.2, capacity_kW: 8, COP: 4.5 },
  priceRange: { min: 4500, max: 6500, unit: "EUR" },
  tags: ["nZEB", "premium"],
  proposedAt: "2026-05-16T10:00:00Z",
  status: "approved",
  auditorEdits: null,
  auditorNotes: null,
};

const measureEnvelope = {
  id: "pm_def456",
  sourceStep: "manual",
  category: "envelope-opaque",
  catalogEntryId: "ETICS_EPS_15",
  label: "ETICS EPS 15 cm",
  description: "Sistem termoizolație fațade",
  tech: { lambda: 0.034, thickness_mm: 150, U: 0.21 },
  priceRange: { min: 180, max: 240, unit: "RON/m²" },
  tags: ["nZEB"],
  proposedAt: "2026-05-16T11:00:00Z",
  status: "approved",
  auditorEdits: null,
  auditorNotes: "Atenție colțuri și balcoane (Mc 001-2022 Cap. 7)",
};

const measurePV = {
  id: "pm_ghi789",
  sourceStep: "Step7-auto",
  category: "pv",
  catalogEntryId: "PV_5kWp",
  label: "Sistem PV 5 kWp",
  tech: { kWp: 5, panelCount: 12, panelW: 415 },
  priceRange: { min: 22000, max: 28000, unit: "RON" },
  tags: ["regenerabil"],
  proposedAt: "2026-05-16T12:00:00Z",
  status: "approved",
  auditorEdits: null,
  auditorNotes: null,
};

// ─── 1. CPE conversie ────────────────────────────────────────────────────────

describe("convertMeasureToCpeRecommendation()", () => {
  it("returnează null pentru input invalid", () => {
    expect(convertMeasureToCpeRecommendation(null)).toBe(null);
    expect(convertMeasureToCpeRecommendation(undefined)).toBe(null);
    expect(convertMeasureToCpeRecommendation("not-object")).toBe(null);
  });

  it("convertește heating cu SCOP=4.2 → format CPE cu category=Instalații + savings 30-50%", () => {
    const rec = convertMeasureToCpeRecommendation(measureHeating);
    expect(rec.code).toMatch(/^M-B/);
    expect(rec.category).toBe("Instalații");
    expect(rec.priority).toBe("înaltă");
    expect(rec.measure).toBe("Pompă căldură aer-aer A++ R290");
    expect(rec.savings).toBe("30-50%"); // SCOP > 3.5
    expect(rec.detail).toContain("SCOP=4.2");
    expect(rec._source).toBe("manual-auditor");
    expect(rec._measureId).toBe("pm_abc123");
  });

  it("convertește envelope cu auditorNotes → include nota în detail", () => {
    const rec = convertMeasureToCpeRecommendation(measureEnvelope);
    expect(rec.code).toMatch(/^M-A/);
    expect(rec.category).toBe("Anvelopă");
    expect(rec.priority).toBe("înaltă");
    expect(rec.savings).toBe("15-25%");
    expect(rec.detail).toContain("Notă auditor");
    expect(rec.detail).toContain("colțuri și balcoane");
  });

  it("convertește PV → category SRE + savings 20-40%", () => {
    const rec = convertMeasureToCpeRecommendation(measurePV);
    expect(rec.code).toMatch(/^M-C/);
    expect(rec.category).toBe("SRE");
    expect(rec.priority).toBe("medie");
    expect(rec.savings).toBe("20-40%");
  });

  it("foloseste auditorEdits.savings dacă există", () => {
    const m = { ...measureHeating, auditorEdits: { savings: "45% (calcul Step7 NPV)" } };
    const rec = convertMeasureToCpeRecommendation(m);
    expect(rec.savings).toBe("45% (calcul Step7 NPV)");
  });

  it("fallback category Altele + prefix M pentru categorie necunoscută", () => {
    const m = { ...measureHeating, category: "unknown-xyz" };
    const rec = convertMeasureToCpeRecommendation(m);
    expect(rec.category).toBe("Altele");
    expect(rec.code).toMatch(/^M-M/);
  });
});

// ─── Merge CPE ───────────────────────────────────────────────────────────────

describe("mergeApprovedIntoCpeRecommendations()", () => {
  const autoRecs = [
    { code: "A1", priority: "înaltă", category: "Anvelopă", measure: "Termoizolare pereți exteriori (sistem ETICS)", detail: "G = 0.85", savings: "15-25%" },
    { code: "B1", priority: "înaltă", category: "Instalații", measure: "Înlocuire cazan gaz vechi", detail: "η < 0.85", savings: "20%" },
    { code: "D1", priority: "scăzută", category: "Iluminat", measure: "LED + senzori prezență", detail: "LENI > 5", savings: "5-10%" },
  ];

  it("returnează auto-recs unchanged dacă coadă goală", () => {
    const result = mergeApprovedIntoCpeRecommendations(autoRecs, []);
    expect(result).toHaveLength(3);
    expect(result[0].code).toBe("A1");
  });

  it("măsurile manuale apar PRIMELE în listă", () => {
    const result = mergeApprovedIntoCpeRecommendations(autoRecs, [measureHeating]);
    expect(result.length).toBeGreaterThan(3);
    expect(result[0]._source).toBe("manual-auditor");
    expect(result[0].measure).toBe("Pompă căldură aer-aer A++ R290");
  });

  it("dedupe: dacă manuală menționează aceeași categorie + măsură similară, auto e exclus", () => {
    // Auto: "Termoizolare pereți exteriori (sistem ETICS)" — Anvelopă
    // Manual: "ETICS EPS 15 cm" — Anvelopă (label diferit dar similar)
    const result = mergeApprovedIntoCpeRecommendations([
      { code: "A1", priority: "înaltă", category: "Anvelopă", measure: "ETICS EPS 15 cm cu vată", detail: "Auto", savings: "20%" },
    ], [measureEnvelope]);
    // Auto e exclus deoarece signature category+primele-4-cuvinte se potrivește
    expect(result).toHaveLength(1);
    expect(result[0]._source).toBe("manual-auditor");
  });

  it("respectă limita maxItems", () => {
    const measures = Array(30).fill(0).map((_, i) => ({
      ...measureHeating,
      id: `pm_${i}`,
    }));
    const result = mergeApprovedIntoCpeRecommendations([], measures, { maxItems: 10 });
    expect(result).toHaveLength(10);
  });

  it("default maxItems = 20 (Anexa 2 limită pagină A4)", () => {
    const measures = Array(25).fill(0).map((_, i) => ({
      ...measureHeating,
      id: `pm_${i}`,
    }));
    const result = mergeApprovedIntoCpeRecommendations([], measures);
    expect(result).toHaveLength(20);
  });

  it("handles input invalid grațios (null/undefined/non-array)", () => {
    expect(mergeApprovedIntoCpeRecommendations(null, null)).toEqual([]);
    expect(mergeApprovedIntoCpeRecommendations(undefined, undefined)).toEqual([]);
    expect(mergeApprovedIntoCpeRecommendations("string", "string")).toEqual([]);
  });
});

// ─── 2. Audit Card R4 ────────────────────────────────────────────────────────

describe("convertMeasureToAuditCard()", () => {
  it("returnează format Card R4 cu source preservat", () => {
    const card = convertMeasureToAuditCard(measureHeating);
    expect(card.id).toBe("pm_abc123");
    expect(card.name).toBe("Pompă căldură aer-aer A++ R290");
    expect(card.priority).toBe("înaltă");
    expect(card.source).toBe("Step7-auto");
    expect(card.status).toBe("approved");
    expect(card.cost).toContain("EUR");
  });

  it("returnează null pentru input invalid", () => {
    expect(convertMeasureToAuditCard(null)).toBe(null);
  });
});

describe("buildR4Cards()", () => {
  it("convertește lista de măsuri în carduri", () => {
    const cards = buildR4Cards([measureHeating, measurePV]);
    expect(cards).toHaveLength(2);
    expect(cards[0].id).toBe("pm_abc123");
    expect(cards[1].id).toBe("pm_ghi789");
  });

  it("listă goală pentru input null", () => {
    expect(buildR4Cards(null)).toEqual([]);
    expect(buildR4Cards(undefined)).toEqual([]);
  });
});

// ─── 3. Pașaport renovare ────────────────────────────────────────────────────

describe("convertMeasureToPassportFormat()", () => {
  it("convertește heating cu preț EUR → RON la curs 5.12", () => {
    const passportMeasure = convertMeasureToPassportFormat(measureHeating);
    expect(passportMeasure.name).toBe("Pompă căldură aer-aer A++ R290");
    expect(passportMeasure.category).toBe("Sistem încălzire");
    expect(passportMeasure.lifespan_years).toBe(20); // default heating
    // (4500+6500)/2 = 5500 EUR × 5.12 = 28160 RON
    expect(passportMeasure.cost_RON).toBe(5500 * 5.12);
    expect(passportMeasure._source).toBe("manual-auditor");
  });

  it("envelope-opaque are lifespan 30 ani (Mc 001-2022 Anexa H)", () => {
    const p = convertMeasureToPassportFormat(measureEnvelope);
    expect(p.lifespan_years).toBe(30);
    expect(p.category).toBe("Anvelopă opacă");
  });

  it("PV are lifespan 25 ani + cost în RON (priceRange.unit nu e EUR)", () => {
    const p = convertMeasureToPassportFormat(measurePV);
    expect(p.lifespan_years).toBe(25);
    expect(p.category).toBe("Fotovoltaic");
    // (22000+28000)/2 = 25000 RON, NU conversie (unit = "RON")
    expect(p.cost_RON).toBe(25000);
  });

  it("foloseste auditorEdits.cost_RON dacă există", () => {
    const m = { ...measureHeating, auditorEdits: { cost_RON: 30000 } };
    const p = convertMeasureToPassportFormat(m);
    expect(p.cost_RON).toBe(30000);
  });
});

describe("buildAuditorPhase()", () => {
  it("construiește o fază nouă cu sumă costuri", () => {
    const phase = buildAuditorPhase([measureHeating, measureEnvelope, measurePV]);
    expect(phase.measures).toHaveLength(3);
    expect(phase.phaseCost_RON).toBeGreaterThan(0);
    expect(phase._source).toBe("manual-auditor");
    expect(phase.year).toBe(new Date().getFullYear());
  });

  it("returnează null pentru listă goală", () => {
    expect(buildAuditorPhase([])).toBe(null);
    expect(buildAuditorPhase(null)).toBe(null);
  });

  it("acceptă year override", () => {
    const phase = buildAuditorPhase([measureHeating], 2030);
    expect(phase.year).toBe(2030);
  });
});

describe("mergeApprovedIntoPassportRoadmap()", () => {
  const existingRoadmap = {
    strategy: "balanced",
    phases: [
      { year: 2026, measures: [], phaseCost_RON: 10000 },
      { year: 2028, measures: [], phaseCost_RON: 20000 },
    ],
    epTrajectory: [200, 180, 150],
    classTrajectory: ["E", "D", "C"],
  };

  it("adaugă fază auditor la sfârșitul roadmap-ului existent", () => {
    const result = mergeApprovedIntoPassportRoadmap(existingRoadmap, [measureHeating, measureEnvelope]);
    expect(result.phases).toHaveLength(3); // 2 existing + 1 auditor phase
    expect(result.phases[2]._source).toBe("manual-auditor");
    expect(result._auditorPhaseAdded).toBe(true);
  });

  it("returnează roadmap-ul original dacă coadă goală", () => {
    const result = mergeApprovedIntoPassportRoadmap(existingRoadmap, []);
    expect(result.phases).toHaveLength(2);
    expect(result._auditorPhaseAdded).toBeUndefined();
  });

  it("returnează input dacă roadmap invalid", () => {
    expect(mergeApprovedIntoPassportRoadmap(null, [measureHeating])).toBe(null);
    expect(mergeApprovedIntoPassportRoadmap(undefined, [measureHeating])).toBe(undefined);
  });

  it("nu mutează roadmap-ul original (immutabil)", () => {
    const original = { ...existingRoadmap, phases: [...existingRoadmap.phases] };
    mergeApprovedIntoPassportRoadmap(original, [measureHeating]);
    expect(original.phases).toHaveLength(2); // neschimbat
  });
});
