import { describe, it, expect } from "vitest";
import { generateEPBDXML } from "../epbd-xml-export.js";

describe("Sprint 19: EPBD XML — valabilitate CPE 5/10 ani (Mc 001-2022 cap.5)", () => {
  const baseData = {
    building: { address: "Str. Test", category: "RI", isNew: false },
    climate: { zone: "III", name: "Zona III" },
    certDate: "2026-04-23",
    auditorName: "Ing. Test",
    auditorCode: "12345",
    opaqueElements: [],
    glazingElements: [],
    instSummary: null,
    renewSummary: { ep_adjusted_m2: 120, rer: 25 },
    energyClass: { class: "C" },
  };

  it("Clădire existentă (isNew=false) → valabilitate 10 ani", () => {
    const xml = generateEPBDXML(baseData);
    expect(xml).toContain('<ValidityYears unit="ani">10</ValidityYears>');
    expect(xml).toContain("<ValidUntil>2036-04-23</ValidUntil>");
  });

  it("Clădire nouă (isNew=true) → valabilitate 5 ani", () => {
    const xml = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, isNew: true },
    });
    expect(xml).toContain('<ValidityYears unit="ani">5</ValidityYears>');
    expect(xml).toContain("<ValidUntil>2031-04-23</ValidUntil>");
  });

  it("IsNew nespecificat → default 10 ani (existentă)", () => {
    const xml = generateEPBDXML({
      ...baseData,
      building: { address: "Str. Test", category: "RI" }, // fără isNew
    });
    expect(xml).toContain('<ValidityYears unit="ani">10</ValidityYears>');
  });

  it("Marcaj IsNew în identificare corespunde cu ValidityYears", () => {
    const xmlNew = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, isNew: true },
    });
    expect(xmlNew).toContain("<IsNew>true</IsNew>");
    expect(xmlNew).toContain("<ValidityYears");

    const xmlOld = generateEPBDXML(baseData);
    expect(xmlOld).toContain("<IsNew>false</IsNew>");
  });
});
