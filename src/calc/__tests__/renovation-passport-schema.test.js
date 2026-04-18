import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import {
  JSON_SCHEMA,
  RENOVATION_PASSPORT_SCHEMA_VERSION,
  RENOVATION_PASSPORT_SCHEMA_URL,
  XML_SCHEMA_NAMESPACE,
} from "../../data/renovation-passport-schema.js";
import { buildRenovationPassport } from "../renovation-passport.js";

describe("renovation-passport-schema", () => {
  const ajv = new Ajv({ allErrors: true, strict: false });

  it("compilează fără erori ca JSON Schema Draft 07", () => {
    expect(() => ajv.compile(JSON_SCHEMA)).not.toThrow();
  });

  it("exportă versiune + URL-uri constante", () => {
    expect(RENOVATION_PASSPORT_SCHEMA_VERSION).toMatch(/^0\.\d+\.\d+/);
    expect(RENOVATION_PASSPORT_SCHEMA_URL).toMatch(/^https:\/\//);
    expect(XML_SCHEMA_NAMESPACE).toMatch(/^http:\/\//);
  });

  it("validează pașaport complet corect (minimal args)", () => {
    const validate = ajv.compile(JSON_SCHEMA);
    const p = buildRenovationPassport({
      building: { address: "Test", category: "RC", areaUseful: 120, yearBuilt: 1980 },
      instSummary: { ep_total_m2: 280, co2_total_m2: 55, energyClass: "E" },
      climate: { zone: "II" },
      auditor: { name: "Ing.", certNr: "GI-1" },
    });
    const ok = validate(p);
    if (!ok) {
      // eslint-disable-next-line no-console
      console.log("Erori validare:", validate.errors);
    }
    expect(ok).toBe(true);
  });

  it("respinge pașaport cu UUID invalid", () => {
    const validate = ajv.compile(JSON_SCHEMA);
    const p = buildRenovationPassport({
      building: { address: "Test", category: "RC", areaUseful: 120 },
      instSummary: { ep_total_m2: 280, energyClass: "E" },
      climate: { zone: "II" },
      auditor: { name: "Ing.", certNr: "GI-1" },
    });
    p.passportId = "not-valid-uuid";
    const ok = validate(p);
    expect(ok).toBe(false);
    expect(validate.errors.some((e) => e.instancePath === "/passportId")).toBe(true);
  });

  it("respinge category clădire în afara enum", () => {
    const validate = ajv.compile(JSON_SCHEMA);
    const p = buildRenovationPassport({
      building: { address: "X", category: "RC", areaUseful: 100 },
      instSummary: { ep_total_m2: 200, energyClass: "D" },
      climate: { zone: "II" },
      auditor: { name: "A", certNr: "B" },
    });
    p.building.category = "INVALID";
    expect(validate(p)).toBe(false);
  });

  it("respinge status în afara enum", () => {
    const validate = ajv.compile(JSON_SCHEMA);
    const p = buildRenovationPassport({
      building: { address: "X", category: "RC", areaUseful: 100 },
      instSummary: { ep_total_m2: 200, energyClass: "D" },
      climate: { zone: "II" },
      auditor: { name: "A", certNr: "B" },
    });
    p.status = "pending";
    expect(validate(p)).toBe(false);
  });
});
