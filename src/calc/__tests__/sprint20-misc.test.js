import { describe, it, expect } from "vitest";
import { getSeasonalAlbedo, ALBEDO_SEASONAL } from "../solar-radiation.js";
import { calcFD, F_D_C_BY_CONTROL } from "../en15193-lighting.js";
import {
  generateDocumentUUID,
  verifyDocumentUUID,
  ZEPHREN_NAMESPACE_CPE,
  ZEPHREN_NAMESPACE_PASSPORT,
} from "../mdlpa-registry.js";
import { loadTMYFromData, generateTMY } from "../weather.js";

describe("Sprint 20: albedo sezonier (ISO 52010-1 + IPCC AR6)", () => {
  it("Zone IV iarna (ian) → albedo ridicat (zăpadă)", () => {
    expect(getSeasonalAlbedo("IV", 0)).toBeGreaterThanOrEqual(0.5);
  });

  it("Zone IV vara (iul) → albedo standard 0,20", () => {
    expect(getSeasonalAlbedo("IV", 6)).toBe(0.20);
  });

  it("Zone I (litoral) — fără zăpadă persistentă, valori joase toată iarna", () => {
    for (let m = 0; m < 12; m++) {
      expect(getSeasonalAlbedo("I", m)).toBeLessThanOrEqual(0.30);
    }
  });

  it("Zone V (munte) ianuarie → albedo > 0,7", () => {
    expect(getSeasonalAlbedo("V", 0)).toBeGreaterThan(0.7);
  });

  it("Toate zonele au 12 valori lunare", () => {
    ["I", "II", "III", "IV", "V"].forEach(z => {
      expect(ALBEDO_SEASONAL[z]).toHaveLength(12);
    });
  });
});

describe("Sprint 20: F_D tabular EN 15193-1 Anexa F", () => {
  it("WFR=0 → F_D=1 (fără daylight)", () => {
    expect(calcFD(0, "manual")).toBe(1);
  });

  it("WFR=0.2 manual → F_D=0.76 (Tab F.26)", () => {
    expect(calcFD(0.2, "manual")).toBeCloseTo(0.76, 2);
  });

  it("WFR=0.3 cu dimming avansat → F_D mai mic decât manual", () => {
    const manual = calcFD(0.3, "manual");
    const advanced = calcFD(0.3, "advanced");
    expect(advanced).toBeLessThan(manual);
  });

  it("Interpolare liniară între puncte (WFR=0.15)", () => {
    const v = calcFD(0.15, "manual");
    // între 0.90 (WFR=0.1) și 0.76 (WFR=0.2) → mijloc ~0.83
    expect(v).toBeGreaterThan(0.80);
    expect(v).toBeLessThan(0.87);
  });

  it("WFR > 0.7 → clamp la valoarea minimă din tabel", () => {
    expect(calcFD(0.9, "manual")).toBe(0.28);
  });

  it("F_D_C_BY_CONTROL are toate 4 tipuri", () => {
    expect(F_D_C_BY_CONTROL.manual).toBeDefined();
    expect(F_D_C_BY_CONTROL.auto_switch).toBeDefined();
    expect(F_D_C_BY_CONTROL.dimming).toBeDefined();
    expect(F_D_C_BY_CONTROL.advanced).toBeDefined();
  });
});

describe("Sprint 20: MDLPA UUID v5 determinist", () => {
  const params = {
    type: "cpe",
    address: "Str. Victoriei 1, București",
    cadastralNr: "123456",
    auditorCode: "IC12345",
    certDate: "2026-04-23",
  };

  it("Aceleași date → același UUID", () => {
    const a = generateDocumentUUID(params);
    const b = generateDocumentUUID(params);
    expect(a).toBe(b);
  });

  it("UUID este format v5 standard (32 hex + 4 dash)", () => {
    const uuid = generateDocumentUUID(params);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("CPE și Pașaport folosesc namespace diferite", () => {
    const cpe = generateDocumentUUID({ ...params, type: "cpe" });
    const pass = generateDocumentUUID({ ...params, type: "passport" });
    expect(cpe).not.toBe(pass);
  });

  it("verifyDocumentUUID → true pentru aceleași date", () => {
    const uuid = generateDocumentUUID(params);
    expect(verifyDocumentUUID(uuid, params)).toBe(true);
  });

  it("verifyDocumentUUID → false dacă datele diferă", () => {
    const uuid = generateDocumentUUID(params);
    expect(verifyDocumentUUID(uuid, { ...params, address: "Alta" })).toBe(false);
  });

  it("Normalizare: trailing spaces / case → același UUID", () => {
    const a = generateDocumentUUID(params);
    const b = generateDocumentUUID({
      ...params,
      address: "  STR. VICTORIEI 1, BUCUREȘTI  ",
    });
    expect(a).toBe(b);
  });

  it("Namespace-urile sunt UUID-uri v4/v5 valide", () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(ZEPHREN_NAMESPACE_CPE).toMatch(re);
    expect(ZEPHREN_NAMESPACE_PASSPORT).toMatch(re);
  });
});

describe("Sprint 20: TMY orar (weather.js)", () => {
  it("generateTMY sintetic — source='synthetic'", () => {
    const tempMonth = [-2, 0, 5, 10, 15, 20, 22, 21, 17, 11, 5, 0];
    const r = generateTMY(tempMonth, 45);
    expect(r.source).toBe("synthetic");
    expect(r.T_ext).toHaveLength(8760);
  });

  it("loadTMYFromData cu array 8760 orare → source='omtct-2210-2013'", () => {
    const rows = Array.from({ length: 8760 }, (_, h) => ({
      t_db: 10 + Math.sin(h / 8760 * 2 * Math.PI) * 10,
      g_h: h % 24 >= 6 && h % 24 <= 18 ? 500 : 0,
      g_b: h % 24 >= 8 && h % 24 <= 16 ? 300 : 0,
      g_d: h % 24 >= 6 && h % 24 <= 18 ? 200 : 0,
      rh: 50,
      wind_speed: 3,
    }));
    const r = loadTMYFromData(rows);
    expect(r).not.toBeNull();
    expect(r.source).toBe("omtct-2210-2013");
    expect(r.hoursCount).toBe(8760);
    expect(r.T_ext).toHaveLength(8760);
    expect(r.Q_sol_direct).toHaveLength(8760);
    expect(r.Q_sol_diffuse).toHaveLength(8760);
  });

  it("loadTMYFromData returnează null pentru array prea scurt", () => {
    expect(loadTMYFromData([{ t_db: 10 }])).toBeNull();
  });

  it("loadTMYFromData returnează null pentru input invalid", () => {
    expect(loadTMYFromData(null)).toBeNull();
    expect(loadTMYFromData(123)).toBeNull();
  });
});
