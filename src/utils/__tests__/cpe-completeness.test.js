import { describe, it, expect } from "vitest";
import {
  getCpeCompletenessItems,
  getCpeCompletenessScore,
  groupCompletenessItems,
  ANCPI_REQUIRED_SCOPES,
  APARTMENT_LIST_CATEGORIES,
} from "../cpe-completeness.js";

const FULL_CTX = {
  building: {
    address: "Str. Mihail Kogălniceanu nr. 12",
    city: "București",
    category: "RI",
    scopCpe: "vanzare",
    yearBuilt: "1985",
    floors: "P+2E",
    structure: "zidarie",
    areaUseful: "120",
    volume: "300",
    ancpi: { verified: true },
    apartments: [],
  },
  selectedClimate: { name: "București", zone: "II" },
  opaqueElements: [{ name: "Perete N" }],
  glazingElements: [{ name: "Fereastră S" }],
  heating: { source: "GAZ" },
  acm: { source: "BOILER" },
  instSummary: { ep_total_m2: 150 },
  renewSummary: { rer: 25 },
  auditor: {
    name: "Ion Popescu",
    atestat: "12345",
    mdlpaCode: "CPE-RO-2026-00001",
    date: "2026-05-02",
    grade: "AE Ici",
  },
};

describe("getCpeCompletenessItems — structură", () => {
  it("returnează 23 itemi (21 standard + 2 condiționali)", () => {
    // 7 Identificare + 2 Geometrie + 1 Climatică + 2 Anvelopă +
    // 2 Instalații + 2 Calcul + 5 Auditor + 2 condiționali = 23
    const items = getCpeCompletenessItems(FULL_CTX);
    expect(items).toHaveLength(23);
  });

  it("toate item-urile au `group`, `label`, `ok`", () => {
    const items = getCpeCompletenessItems(FULL_CTX);
    for (const it of items) {
      expect(it.group).toBeTypeOf("string");
      expect(it.label).toBeTypeOf("string");
      expect(it.ok).toBeTypeOf("boolean");
    }
  });

  it("acceptă context gol fără să arunce", () => {
    expect(() => getCpeCompletenessItems({})).not.toThrow();
    expect(() => getCpeCompletenessItems(undefined)).not.toThrow();
    const items = getCpeCompletenessItems({});
    expect(items.length).toBe(23);
    // Toate item-urile sunt fie ne-completate, fie marcate optional
    expect(items.every((i) => i.ok === false || i.optional)).toBe(true);
  });
});

describe("getCpeCompletenessScore — context complet", () => {
  it("scor 20/20 (toate non-opționale OK) pentru context valid scop=vanzare", () => {
    const r = getCpeCompletenessScore(FULL_CTX);
    expect(r.allDone).toBe(true);
    expect(r.score).toBe(r.total);
    expect(r.pct).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it("scop=vanzare → ANCPI obligatoriu (intră în scor)", () => {
    const ctx = { ...FULL_CTX, building: { ...FULL_CTX.building, ancpi: { verified: false } } };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
    expect(r.missing.some((m) => m.group === "Cadastru")).toBe(true);
  });

  it("scop=informare → ANCPI opțional (NU intră în scor)", () => {
    const ctx = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, scopCpe: "informare", ancpi: { verified: false } },
    };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it("scop=construire → ANCPI opțional", () => {
    const ctx = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, scopCpe: "construire", ancpi: { verified: false } },
    };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(true);
  });

  it("categoria RC → apartamente obligatorii", () => {
    const ctx = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, category: "RC", apartments: [] },
    };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
    expect(r.missing.some((m) => m.group === "Multi-apartament")).toBe(true);
  });

  it("categoria RI (locuință individuală) → apartamente N/A", () => {
    const ctx = { ...FULL_CTX, building: { ...FULL_CTX.building, category: "RI" } };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(true);
  });
});

describe("getCpeCompletenessScore — câmpuri lipsă", () => {
  it("an construcție invalid (1700) → ok=false", () => {
    const ctx = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, yearBuilt: "1700" },
    };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
    expect(r.missing.some((m) => m.label === "An construcție")).toBe(true);
  });

  it("an construcție viitor → ok=false", () => {
    const ctx = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, yearBuilt: String(new Date().getFullYear() + 5) },
    };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
  });

  it("Au=0 sau negativ → ok=false", () => {
    const ctx0 = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, areaUseful: "0" },
    };
    expect(getCpeCompletenessScore(ctx0).allDone).toBe(false);
    const ctxNeg = {
      ...FULL_CTX,
      building: { ...FULL_CTX.building, areaUseful: "-50" },
    };
    expect(getCpeCompletenessScore(ctxNeg).allDone).toBe(false);
  });

  it("heating.source=NONE → ok=false (nu doar truthy)", () => {
    const ctx = { ...FULL_CTX, heating: { source: "NONE" } };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
    expect(r.missing.some((m) => m.label === "Sistem încălzire")).toBe(true);
  });

  it("auditor.grade lipsă → ok=false", () => {
    const ctx = { ...FULL_CTX, auditor: { ...FULL_CTX.auditor, grade: "" } };
    const r = getCpeCompletenessScore(ctx);
    expect(r.allDone).toBe(false);
    expect(r.missing.some((m) => m.label === "Grad atestat")).toBe(true);
  });
});

describe("groupCompletenessItems", () => {
  it("grupează corect pe 7 secțiuni standard + 2 condiționale", () => {
    const items = getCpeCompletenessItems(FULL_CTX);
    const groups = groupCompletenessItems(items);
    expect(Object.keys(groups).sort()).toEqual([
      "Anvelopă",
      "Auditor",
      "Cadastru",
      "Calcul",
      "Climatică",
      "Geometrie",
      "Identificare",
      "Instalații",
      "Multi-apartament",
    ]);
    expect(groups.Identificare).toHaveLength(7);
    expect(groups.Auditor).toHaveLength(5);
  });
});

describe("constante exportate", () => {
  it("ANCPI_REQUIRED_SCOPES include vânzare/închiriere/renovare", () => {
    expect(ANCPI_REQUIRED_SCOPES).toContain("vanzare");
    expect(ANCPI_REQUIRED_SCOPES).toContain("inchiriere");
    expect(ANCPI_REQUIRED_SCOPES).toContain("renovare");
    expect(ANCPI_REQUIRED_SCOPES).toContain("renovare_majora");
  });

  it("ANCPI_REQUIRED_SCOPES NU include construire/informare/recepție", () => {
    expect(ANCPI_REQUIRED_SCOPES).not.toContain("construire");
    expect(ANCPI_REQUIRED_SCOPES).not.toContain("informare");
    expect(ANCPI_REQUIRED_SCOPES).not.toContain("receptie");
    expect(ANCPI_REQUIRED_SCOPES).not.toContain("alt");
  });

  it("APARTMENT_LIST_CATEGORIES include doar RC", () => {
    expect(APARTMENT_LIST_CATEGORIES).toEqual(["RC"]);
  });
});
