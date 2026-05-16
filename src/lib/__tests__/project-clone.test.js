/**
 * Teste pentru project-clone.js (C2 Sprint Optimizări 16 mai 2026).
 *
 * Funcția cloneProjectData e pură + are implicații LEGALE:
 * - cod CPE TREBUIE resetat (unic per CPE per Mc 001-2022 §10)
 * - semnătura auditor TREBUIE resetată (semnătură este per CPE specific)
 * - pașaport renovare TREBUIE reset (nou ciclu EPBD Anexa VIII)
 *
 * Regresia oricăruia din acestea = vulnerabilitate legală (auditor poate emite
 * accidental 2 CPE-uri cu același cod, sau semnătura veche aplicată la audit nou).
 */

import { describe, it, expect } from "vitest";
import { cloneProjectData, extractOriginalName } from "../project-clone.js";

const SAMPLE_PROJECT = {
  meta: {
    name: "Bloc P+4 1975 Sector 3",
    date: "2026-05-10",
    id: "p_old123",
  },
  building: {
    address: "Str. Mihai Bravu 100, București",
    category: "RC",
    constructionYear: 1975,
    heatedArea: 1200,
    cpeCode: "CPE-2026-12345",
    cpeCodeManual: false,
  },
  auditor: {
    name: "Ing. Popescu Ion",
    grade: "Ici",
    certNumber: "AT-IIci-001234",
    signature: "<svg base64...>",
    signatureBase64: "ABCDEF==",
    signatureDate: "2026-05-10T14:30:00Z",
    qtspToken: "qtsp-secret-token-xyz",
  },
  passport: {
    passportId: "550e8400-e29b-41d4-a716-446655440000",
    version: 3,
    status: "issued",
    history: [
      { ts: "2026-04-01", action: "draft created" },
      { ts: "2026-05-10", action: "issued" },
    ],
  },
  heating: { source: "centrala-gaz", efficiency: 0.92 },
  opaqueElements: [{ id: "e1", type: "wall", U: 0.45 }],
  documentUploads: { invoice1: "blob1", planSite: "blob2" },
  priorAuditData: { extractedCpe: "OLD-DATA" },
  lastCalculatedAt: "2026-05-10T10:00:00Z",
};

describe("cloneProjectData — câmpuri RESETATE (cerințe legale)", () => {
  const cloned = cloneProjectData(SAMPLE_PROJECT, "p_new456", "Bloc P+4 1975 Sector 3");

  it("cpeCode RESETAT (unic per CPE, Mc 001-2022 §10)", () => {
    expect(cloned.building.cpeCode).toBeUndefined();
    expect(cloned.building.cpeCodeManual).toBeUndefined();
  });

  it("auditor.signature RESETAT (semnătura este per CPE specific)", () => {
    expect(cloned.auditor.signature).toBeUndefined();
    expect(cloned.auditor.signatureBase64).toBeUndefined();
    expect(cloned.auditor.signatureDate).toBeUndefined();
    expect(cloned.auditor.qtspToken).toBeUndefined();
  });

  it("passport.passportId + history RESETATE (EPBD Anexa VIII — nou pașaport)", () => {
    expect(cloned.passport.passportId).toBeNull();
    expect(cloned.passport.history).toEqual([]);
    expect(cloned.passport.status).toBe("draft");
    expect(cloned.passport.version).toBe(0);
  });

  it("documentUploads RESETAT (documente fizice per proiect)", () => {
    expect(cloned.documentUploads).toBeUndefined();
  });

  it("priorAuditData RESETAT (clonarea este nou audit, nu folosește CPE precedent)", () => {
    expect(cloned.priorAuditData).toBeUndefined();
  });

  it("cache calc RESETAT (va fi recomputat)", () => {
    expect(cloned.lastCalculatedAt).toBeUndefined();
  });
});

describe("cloneProjectData — câmpuri PĂSTRATE (punct start)", () => {
  const cloned = cloneProjectData(SAMPLE_PROJECT, "p_new456", "Bloc P+4 1975 Sector 3");

  it("building geometrie + materiale PĂSTRATE (anvelopa rămâne similară)", () => {
    expect(cloned.building.address).toBe("Str. Mihai Bravu 100, București");
    expect(cloned.building.category).toBe("RC");
    expect(cloned.building.constructionYear).toBe(1975);
    expect(cloned.building.heatedArea).toBe(1200);
  });

  it("auditor identitate PĂSTRATĂ (doar semnătura resetată)", () => {
    expect(cloned.auditor.name).toBe("Ing. Popescu Ion");
    expect(cloned.auditor.grade).toBe("Ici");
    expect(cloned.auditor.certNumber).toBe("AT-IIci-001234");
  });

  it("instalații + componente PĂSTRATE", () => {
    expect(cloned.heating.source).toBe("centrala-gaz");
    expect(cloned.heating.efficiency).toBe(0.92);
    expect(cloned.opaqueElements).toHaveLength(1);
    expect(cloned.opaqueElements[0].U).toBe(0.45);
  });
});

describe("cloneProjectData — meta clonă cu telemetrie", () => {
  const cloned = cloneProjectData(SAMPLE_PROJECT, "p_new456", "Bloc P+4 1975 Sector 3");

  it("meta.id este newId", () => {
    expect(cloned.meta.id).toBe("p_new456");
  });

  it('meta.name include prefix „Clonă din"', () => {
    expect(cloned.meta.name).toBe("Clonă din Bloc P+4 1975 Sector 3");
  });

  it("meta.date este astăzi (ISO YYYY-MM-DD)", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(cloned.meta.date).toBe(today);
  });

  it("meta.clonedFrom = ID-ul sursei (audit trail)", () => {
    expect(cloned.meta.clonedFrom).toBe("p_old123");
  });

  it("meta.clonedAt = timestamp ISO complet", () => {
    expect(cloned.meta.clonedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("cloneProjectData — protecții deep clone", () => {
  it("modificarea clonei NU afectează sursa (deep clone)", () => {
    const source = JSON.parse(JSON.stringify(SAMPLE_PROJECT));
    const cloned = cloneProjectData(source, "p_x");
    cloned.building.heatedArea = 9999;
    cloned.opaqueElements[0].U = 9.99;
    expect(source.building.heatedArea).toBe(1200); // neschimbat
    expect(source.opaqueElements[0].U).toBe(0.45); // neschimbat
  });

  it("aruncă eroare dacă sourceData lipsește", () => {
    expect(() => cloneProjectData(null, "p_x")).toThrow(/sourceData invalid/);
    expect(() => cloneProjectData(undefined, "p_x")).toThrow(/sourceData invalid/);
  });

  it("aruncă eroare dacă newId lipsește", () => {
    expect(() => cloneProjectData(SAMPLE_PROJECT, "")).toThrow(/newId obligatoriu/);
    expect(() => cloneProjectData(SAMPLE_PROJECT, null)).toThrow(/newId obligatoriu/);
  });

  it("funcționează cu sourceData minimal (doar building)", () => {
    const minimal = { building: { category: "RI" } };
    const cloned = cloneProjectData(minimal, "p_y");
    expect(cloned.meta.id).toBe("p_y");
    expect(cloned.building.category).toBe("RI");
  });
});

describe("extractOriginalName helper", () => {
  it("extrage numele original dintr-o clonă", () => {
    expect(extractOriginalName("Clonă din Bloc P+4 1975")).toBe("Bloc P+4 1975");
  });

  it("returnează numele neschimbat dacă NU e o clonă", () => {
    expect(extractOriginalName("Vila Snagov 2020")).toBe("Vila Snagov 2020");
  });

  it("gestionează inputuri null/empty", () => {
    expect(extractOriginalName(null)).toBe("");
    expect(extractOriginalName("")).toBe("");
    expect(extractOriginalName(undefined)).toBe("");
  });
});
