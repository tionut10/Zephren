/**
 * @vitest-environment jsdom
 *
 * Teste pentru renovation-passport-schema-v1.js (Sprint Conformitate P0-12, 6 mai 2026).
 *
 * Acoperire:
 *   1. SCHEMA_VERSION_V1 + SCHEMA_URL_V1 + XML_NAMESPACE_V1 constante
 *   2. SCHEMA_DEFINITION_V1 — validare structură JSON Schema Draft 2020-12
 *   3. migrateLegacyToV1 — best-effort cu fallback null
 *   4. validateAgainstV1Schema — required fields + UUID v5 pattern + grade enum
 *   5. passportToXmlV1 — namespace v1 + structură + escape
 *   6. MIGRATION_BANNER_TEXT prezent
 */

import { describe, it, expect } from "vitest";
import {
  SCHEMA_VERSION_V1,
  SCHEMA_URL_V1,
  XML_NAMESPACE_V1,
  SCHEMA_DEFINITION_V1,
  MIGRATION_BANNER_TEXT,
  migrateLegacyToV1,
  validateAgainstV1Schema,
  passportToXmlV1,
} from "../renovation-passport-schema-v1.js";

describe("Constante schema v1", () => {
  it("SCHEMA_VERSION_V1 indică pending MDLPA", () => {
    expect(SCHEMA_VERSION_V1).toBe("1.0.0-pending-mdlpa");
  });

  it("URL + namespace populat (provizoriu)", () => {
    expect(SCHEMA_URL_V1).toMatch(/^https?:\/\//);
    expect(XML_NAMESPACE_V1).toMatch(/^https?:\/\//);
  });

  it("MIGRATION_BANNER_TEXT explicit menționează 29.V.2026", () => {
    expect(MIGRATION_BANNER_TEXT).toContain("29.V.2026");
  });
});

describe("SCHEMA_DEFINITION_V1", () => {
  it("are structură JSON Schema Draft 2020-12", () => {
    expect(SCHEMA_DEFINITION_V1.$schema).toContain("draft/2020-12");
    expect(SCHEMA_DEFINITION_V1.type).toBe("object");
    expect(SCHEMA_DEFINITION_V1.required).toBeInstanceOf(Array);
  });

  it("are 12 secțiuni minimale (EPBD Anexa VIII)", () => {
    const props = Object.keys(SCHEMA_DEFINITION_V1.properties);
    expect(props).toEqual(expect.arrayContaining([
      "schemaVersion", "passportId", "issueDate", "building", "baseline",
      "milestones", "targetState", "financial", "indoorEnvironment",
      "embodiedCarbon", "auditor", "history", "validation", "metadata",
    ]));
  });

  it("auditor.grade enum acceptă doar Ici / IIci", () => {
    const grade = SCHEMA_DEFINITION_V1.properties.auditor.properties.grade;
    expect(grade.enum).toEqual(["Ici", "IIci"]);
  });

  it("targetState.complianceLevel enum (nZEB/ZEB/MEPS)", () => {
    const cl = SCHEMA_DEFINITION_V1.properties.targetState.properties.complianceLevel;
    expect(cl.enum).toContain("nZEB");
    expect(cl.enum).toContain("ZEB");
    expect(cl.enum).toContain("MEPS-2030");
  });
});

describe("migrateLegacyToV1", () => {
  it("returnează null pentru input invalid", () => {
    expect(migrateLegacyToV1(null)).toBeNull();
    expect(migrateLegacyToV1(undefined)).toBeNull();
    expect(migrateLegacyToV1("string")).toBeNull();
  });

  it("setează schemaVersion la v1", () => {
    const result = migrateLegacyToV1({ passportId: "x" });
    expect(result.schemaVersion).toBe(SCHEMA_VERSION_V1);
  });

  it("mapează building.areaUseful din 0.1 areaUtila", () => {
    const v0 = {
      passportId: "x",
      building: { address: "Str", areaUtila: 100 },
    };
    const v1 = migrateLegacyToV1(v0);
    expect(v1.building.areaUseful).toBe(100);
  });

  it("mapează auditor.atestat din 0.1 certNumber alias", () => {
    const v0 = {
      passportId: "x",
      auditor: { name: "A", certNumber: "ABC" },
    };
    const v1 = migrateLegacyToV1(v0);
    expect(v1.auditor.atestat).toBe("ABC");
  });

  it("mapează roadmap.phases la milestones[]", () => {
    const v0 = {
      passportId: "x",
      roadmap: {
        phases: [
          { year: 2030, measures: ["m1"], targetEp: 80 },
          { year: 2035, measures: ["m2"], targetEp: 50 },
        ],
      },
    };
    const v1 = migrateLegacyToV1(v0);
    expect(v1.milestones).toHaveLength(2);
    expect(v1.milestones[0].targetEpPrimary).toBe(80);
  });

  it("legalBasis default conține 3 referințe normative", () => {
    const v1 = migrateLegacyToV1({ passportId: "x" });
    expect(v1.metadata.legalBasis).toContain("EPBD 2024/1275 Anexa VIII");
    expect(v1.metadata.legalBasis).toContain("Ord. MDLPA 348/2026");
  });
});

describe("validateAgainstV1Schema", () => {
  it("respinge passport null/invalid", () => {
    const r = validateAgainstV1Schema(null);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("listează câmpuri obligatorii lipsă", () => {
    const r = validateAgainstV1Schema({});
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path.includes("passportId"))).toBe(true);
  });

  it("validează UUID v5 format pentru passportId", () => {
    const goodUuid = "1234abcd-5678-5cde-89f0-0123456789ab"; // v5 marker (5 după group 2)
    const r = validateAgainstV1Schema({
      schemaVersion: SCHEMA_VERSION_V1,
      passportId: goodUuid,
      issueDate: "2026-05-06T00:00:00Z",
      building: { address: "x", category: "RI", areaUseful: 100 },
      baseline: {},
      milestones: [],
      targetState: {},
      auditor: { name: "A", atestat: "B", grade: "Ici" },
    });
    // Câmpurile obligatorii prezente, UUID valid → ok
    expect(r.valid).toBe(true);
  });

  it("respinge UUID v4 (nu e v5)", () => {
    const v4 = "1234abcd-5678-4cde-89f0-0123456789ab"; // v4 marker
    const r = validateAgainstV1Schema({
      schemaVersion: SCHEMA_VERSION_V1,
      passportId: v4,
      issueDate: "2026-05-06T00:00:00Z",
      building: {}, baseline: {}, milestones: [], targetState: {},
      auditor: { grade: "Ici" },
    });
    expect(r.errors.some(e => e.message.includes("UUID v5"))).toBe(true);
  });

  it("respinge auditor.grade necunoscut", () => {
    const r = validateAgainstV1Schema({
      schemaVersion: SCHEMA_VERSION_V1,
      passportId: "1234abcd-5678-5cde-89f0-0123456789ab",
      issueDate: "2026-05-06T00:00:00Z",
      building: { address: "x", category: "RI", areaUseful: 100 },
      baseline: {}, milestones: [], targetState: {},
      auditor: { name: "A", atestat: "B", grade: "III" },
    });
    expect(r.errors.some(e => e.message.includes("Ici"))).toBe(true);
  });
});

describe("passportToXmlV1", () => {
  it("produce XML cu namespace v1 + schemaVersion", () => {
    const xml = passportToXmlV1({
      passportId: "abc",
      building: { address: "Str. Test 1" },
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(`xmlns="${XML_NAMESPACE_V1}"`);
    expect(xml).toContain(`schemaVersion="${SCHEMA_VERSION_V1}"`);
  });

  it("escape caractere speciale (& < >)", () => {
    const xml = passportToXmlV1({
      passportId: "x",
      building: { address: "A & B <C>" },
    });
    expect(xml).toContain("A &amp; B &lt;C&gt;");
  });

  it("ignoră valori null/undefined", () => {
    const xml = passportToXmlV1({
      passportId: "x",
      building: { address: "y", category: null },
    });
    expect(xml).not.toContain("<category>");
    expect(xml).toContain("<address>y</address>");
  });

  it("returnează string gol pentru pașaport null", () => {
    expect(passportToXmlV1(null)).toBe("");
  });

  it("auto-migrează din schema 0.1 la v1 înainte de export", () => {
    const v0 = {
      passportId: "abc",
      building: { areaUtila: 100 }, // alias 0.1
      auditor: { certNumber: "X" }, // alias 0.1
    };
    const xml = passportToXmlV1(v0);
    expect(xml).toContain(`schemaVersion="${SCHEMA_VERSION_V1}"`);
    expect(xml).toContain("<areaUseful>100</areaUseful>"); // după migrare
  });
});
