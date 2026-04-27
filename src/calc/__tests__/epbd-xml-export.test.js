import { describe, it, expect } from "vitest";
import { generateEPBDXML } from "../epbd-xml-export.js";

describe("Sprint 30 (S30A·A3): EPBD XML — valabilitate CPE unificată", () => {
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

  it("Default (Ord. 16/2023, scaleVersion absent) → 10 ani uniform indiferent de clasă", () => {
    // Existentă, clasa C → 10 ani (regula RO actuală)
    const xml = generateEPBDXML(baseData);
    expect(xml).toContain('<ValidityYears unit="ani">10</ValidityYears>');
    expect(xml).toContain("<ValidUntil>2036-04-23</ValidUntil>");
  });

  it("Default cu clasă D → tot 10 ani (Ord. 16/2023 uniform)", () => {
    const xml = generateEPBDXML({
      ...baseData,
      energyClass: { class: "D" },
    });
    expect(xml).toContain('<ValidityYears unit="ani">10</ValidityYears>');
  });

  it("scaleVersion=2026 + clasă G → 5 ani (EPBD Art.17 transpus RO 29 mai 2026)", () => {
    const xml = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, scaleVersion: "2026" },
      energyClass: { class: "G" },
    });
    expect(xml).toContain('<ValidityYears unit="ani">5</ValidityYears>');
    expect(xml).toContain("<ValidUntil>2031-04-23</ValidUntil>");
  });

  it("scaleVersion=2026 + clasă A → 10 ani (clase bune EPBD Art.17)", () => {
    const xml = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, scaleVersion: "2026" },
      energyClass: { class: "A" },
    });
    expect(xml).toContain('<ValidityYears unit="ani">10</ValidityYears>');
  });

  it("Marcaj IsNew în identificare independent de ValidityYears (S30A·A3)", () => {
    const xmlNew = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, isNew: true },
    });
    expect(xmlNew).toContain("<IsNew>true</IsNew>");
    expect(xmlNew).toContain("<ValidityYears");

    const xmlOld = generateEPBDXML(baseData);
    expect(xmlOld).toContain("<IsNew>false</IsNew>");
  });

  it("S30A·A7 — PostalCode în identificare clădire", () => {
    const xml = generateEPBDXML({
      ...baseData,
      building: { ...baseData.building, postalCode: "900001" },
    });
    expect(xml).toContain("<PostalCode>900001</PostalCode>");
  });

  it("S30A·A4 — DH (TERMOFICARE) → combustibil termoficare_mix + fP_nren 0.92", () => {
    const xml = generateEPBDXML({
      ...baseData,
      instSummary: { heatingSource: "TERMOFICARE", eta_gen: 0.95 },
    });
    expect(xml).toContain("<HeatingFuel>termoficare_mix</HeatingFuel>");
    expect(xml).toContain("<HeatingFpNren>0.92</HeatingFpNren>");
  });

  it("S30A·A8 — EP cu maxim 1 zecimală", () => {
    const xml = generateEPBDXML({
      ...baseData,
      renewSummary: { ep_adjusted_m2: 968.0560978721536, rer: 25.4567 },
    });
    expect(xml).toContain("<EP_total unit=\"kWh/(m2.an)\">968.1</EP_total>");
    expect(xml).toContain("<RER unit=\"pct\">25.5</RER>");
  });
});
