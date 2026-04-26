import { describe, it, expect } from "vitest";
import {
  buildRenovationPassport,
  generatePassportId,
  generatePassportIdV4,
  generatePassportIdV5,
  isValidPassportId,
  validatePassportShallow,
  findMepsMilestone,
} from "../renovation-passport.js";
import { RENOVATION_PASSPORT_SCHEMA_VERSION } from "../../data/renovation-passport-schema.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Sprint 25 P0.4: UUID v5 (determinist) acceptat alături de v4 (random)
const UUID_V4_OR_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const minimalArgs = {
  building: { address: "Str. Test nr. 1", category: "RC", areaUseful: 120, yearBuilt: 1980 },
  instSummary: { ep_total_m2: 280, co2_total_m2: 55, energyClass: "E" },
  renewSummary: { rer: 8 },
  climate: { zone: "II" },
  auditor: { name: "Ing. Popescu", certNr: "GI-1234" },
};

describe("generatePassportId", () => {
  it("fără argumente returnează UUID v4 random", () => {
    const id = generatePassportId();
    expect(id).toMatch(UUID_V4);
  });

  it("generează ID-uri unice pe 100 iterații (mod random)", () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(generatePassportId());
    expect(ids.size).toBe(100);
  });

  it("isValidPassportId acceptă atât v4 cât și v5", () => {
    expect(isValidPassportId(generatePassportId())).toBe(true);
    expect(isValidPassportId(generatePassportIdV5({ cpeCode: "TEST_CPE_a3f7b9c2" }))).toBe(true);
    expect(isValidPassportId("not-a-uuid")).toBe(false);
    expect(isValidPassportId("")).toBe(false);
    expect(isValidPassportId(null)).toBe(false);
  });
});

describe("Sprint 25 P0.4 — generatePassportIdV5 determinist", () => {
  it("același cpeCode → același UUID v5 (re-rulare stabilă)", () => {
    const id1 = generatePassportIdV5({ cpeCode: "12345_2026-04-26_Popescu_Ion_RO_4567_12_CPE_a3f7b9c2" });
    const id2 = generatePassportIdV5({ cpeCode: "12345_2026-04-26_Popescu_Ion_RO_4567_12_CPE_a3f7b9c2" });
    expect(id1).toBe(id2);
    expect(id1).toMatch(UUID_V4_OR_V5);
    expect(id1.charAt(14)).toBe("5"); // versiunea UUID = 5
  });

  it("cpeCode diferit → UUID-uri diferite", () => {
    const id1 = generatePassportIdV5({ cpeCode: "CPE_A" });
    const id2 = generatePassportIdV5({ cpeCode: "CPE_B" });
    expect(id1).not.toBe(id2);
  });

  it("fingerprint clădire fără cpeCode → UUID determinist din cadastru+adresă", () => {
    const b = { cadastralNumber: "100200", address: "Str. Test 1", areaUseful: 100, yearBuilt: 1980 };
    const id1 = generatePassportIdV5({ building: b });
    const id2 = generatePassportIdV5({ building: b });
    expect(id1).toBe(id2);
    expect(id1).toMatch(UUID_V4_OR_V5);
  });

  it("buildRenovationPassport cu cpeCode → UUID v5 determinist (re-rulare stabilă)", () => {
    const args = {
      ...minimalArgs,
      cpeCode: "TEST_CPE_2026-04-26_a3f7b9c2",
    };
    const p1 = buildRenovationPassport(args);
    const p2 = buildRenovationPassport(args);
    expect(p1.passportId).toBe(p2.passportId);
    expect(p1.passportId.charAt(14)).toBe("5");
    expect(p1.cpeCode).toBe("TEST_CPE_2026-04-26_a3f7b9c2");
  });

  it("legacyPassportId păstrat când e UUID v4 valid și diferit de cel nou", () => {
    const legacy = generatePassportIdV4();
    const p = buildRenovationPassport({
      ...minimalArgs,
      cpeCode: "NEW_CPE",
      legacyPassportId: legacy,
    });
    expect(p.legacyPassportId).toBe(legacy);
    expect(p.passportId).not.toBe(legacy);
  });

  it("legacyPassportId omis dacă invalid sau egal cu passportId", () => {
    const p1 = buildRenovationPassport({
      ...minimalArgs,
      cpeCode: "X",
      legacyPassportId: "not-a-uuid",
    });
    expect(p1.legacyPassportId).toBeUndefined();
  });
});

describe("buildRenovationPassport", () => {
  it("creează pașaport minimal cu UUID v4 sau v5 + history 1 entry", () => {
    const p = buildRenovationPassport(minimalArgs);
    expect(p.passportId).toMatch(UUID_V4_OR_V5);
    expect(p.version).toBe(RENOVATION_PASSPORT_SCHEMA_VERSION);
    expect(p.status).toBe("draft");
    expect(p.history).toHaveLength(1);
    expect(p.history[0].changedBy).toBe("Ing. Popescu");
  });

  it("păstrează passportId + crește history la update", () => {
    const p1 = buildRenovationPassport(minimalArgs);
    const p2 = buildRenovationPassport({
      ...minimalArgs,
      existingPassportId: p1.passportId,
      existingHistory: p1.history,
      existingTimestamp: p1.timestamp,
      changeReason: "Revizuire Q2",
    });
    expect(p2.passportId).toBe(p1.passportId);
    expect(p2.history).toHaveLength(2);
    expect(p2.history[1].changeReason).toBe("Revizuire Q2");
    expect(p2.status).toBe("updated");
    expect(p2.timestamp).toBe(p1.timestamp);
  });

  it("cap la 50 entries în history", () => {
    const big = Array.from({ length: 60 }, (_, i) => ({
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      changedBy: "T",
      changeReason: `rev ${i}`,
    }));
    const p = buildRenovationPassport({
      ...minimalArgs,
      existingPassportId: generatePassportId(),
      existingHistory: big,
      changeReason: "nou",
    });
    expect(p.history.length).toBeLessThanOrEqual(50);
    expect(p.history[p.history.length - 1].changeReason).toBe("nou");
  });

  it("folosește baseline când phasedPlan lipsește", () => {
    const p = buildRenovationPassport(minimalArgs);
    expect(p.roadmap.phases).toEqual([]);
    expect(p.targetState.ep_target).toBe(280);
    expect(p.targetState.energyClass_target).toBe("E");
  });

  it("mapează phasedPlan.phases + calculează mepsComplianceAfterPhase", () => {
    const phasedPlan = {
      strategy: "envelope_first",
      totalYears: 3,
      annualBudget: 50000,
      energyPrice: 0.4,
      discountRate: 0.06,
      summary: { nzeb_reached: false },
      phases: [
        {
          year: 1,
          measures: [{ id: "wall_eps", name: "EPS 10cm", ep_reduction_kWh_m2: 40, cost_RON: 25000 }],
          phaseCost_RON: 25000,
          cumulativeCost_RON: 25000,
          ep_after: 240,
          class_after: "D",
          annualSaving_RON: 4800,
        },
        {
          year: 3,
          measures: [{ id: "hp", name: "PC aer-apă", ep_reduction_kWh_m2: 80, cost_RON: 35000 }],
          phaseCost_RON: 35000,
          cumulativeCost_RON: 60000,
          ep_after: 160,
          class_after: "C",
          annualSaving_RON: 9600,
        },
      ],
      epTrajectory: [280, 240, 240, 160],
      classTrajectory: ["E", "D", "D", "C"],
    };
    const mepsStatus = { thresholds: { ep2030: 200, ep2033: 160 } };
    const p = buildRenovationPassport({ ...minimalArgs, phasedPlan, mepsStatus });

    expect(p.roadmap.phases).toHaveLength(2);
    expect(p.roadmap.phases[0].mepsComplianceAfterPhase.meps2030).toBe(false);
    expect(p.roadmap.phases[0].mepsComplianceAfterPhase.meps2033).toBe(false);
    expect(p.roadmap.phases[1].mepsComplianceAfterPhase.meps2030).toBe(true);
    expect(p.roadmap.phases[1].mepsComplianceAfterPhase.meps2033).toBe(true);
    expect(p.targetState.ep_target).toBe(160);
    expect(p.targetState.mepsComplianceTarget.meps2030).toBe(true);
  });

  it("detectează cost-optimal (EP țintă ≤ 50 kWh)", () => {
    const phasedPlan = {
      strategy: "balanced",
      phases: [{ year: 5, measures: [], phaseCost_RON: 0, cumulativeCost_RON: 0, ep_after: 48, class_after: "A", annualSaving_RON: 0 }],
      epTrajectory: [280, 48],
      classTrajectory: ["E", "A"],
    };
    const p = buildRenovationPassport({ ...minimalArgs, phasedPlan });
    expect(p.targetState.costOptimalCompliant).toBe(true);
  });

  it("rezistă la date complet lipsă (fără crash)", () => {
    const p = buildRenovationPassport({});
    expect(p.passportId).toMatch(UUID_V4_OR_V5);
    expect(p.building.category).toBe("AL");
    expect(p.building.climateZone).toBe("II");
  });

  it("normalizează perspectiva financiară invalidă la 'financial'", () => {
    const p = buildRenovationPassport({
      ...minimalArgs,
      financialSummary: { perspective: "wrong_one", totalInvest_RON: 100 },
    });
    expect(p.financial.perspective).toBe("financial");
  });
});

describe("validatePassportShallow", () => {
  it("returnează valid=true pentru pașaport corect", () => {
    const p = buildRenovationPassport(minimalArgs);
    const v = validatePassportShallow(p);
    expect(v.valid).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("detectează UUID invalid", () => {
    const p = buildRenovationPassport(minimalArgs);
    p.passportId = "not-a-uuid";
    const v = validatePassportShallow(p);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.path === "/passportId")).toBe(true);
  });

  it("detectează pașaport gol", () => {
    expect(validatePassportShallow(null).valid).toBe(false);
    expect(validatePassportShallow(undefined).valid).toBe(false);
  });
});

describe("findMepsMilestone", () => {
  const phases = [
    { year: 1, ep_after: 240 },
    { year: 2, ep_after: 200 },
    { year: 4, ep_after: 160 },
    { year: 7, ep_after: 100 },
  ];

  it("returnează primul an unde EP ≤ prag", () => {
    expect(findMepsMilestone(phases, 200)).toBe(2);
    expect(findMepsMilestone(phases, 160)).toBe(4);
    expect(findMepsMilestone(phases, 99)).toBe(null);
  });

  it("returnează null pentru input invalid", () => {
    expect(findMepsMilestone(null, 100)).toBe(null);
    expect(findMepsMilestone([], 100)).toBe(null);
    expect(findMepsMilestone(phases, null)).toBe(null);
  });

  it("atinge pragul la prima fază dacă EP de la început e sub prag", () => {
    expect(findMepsMilestone(phases, 500)).toBe(1);
  });
});
