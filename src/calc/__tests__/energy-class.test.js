/**
 * Teste pentru versioning praguri A–G (EPBD 2024 / Ord. 16/2023).
 * Sprint P1-3 (18 apr 2026).
 */
import { describe, test, expect } from "vitest";
import {
  THRESHOLDS_BY_VERSION,
  VERSIONS,
  DEFAULT_VERSION,
  classifyEnergyClass,
  classifyEnergyClassAuto,
  getCurrentVersion,
} from "../energy-class.js";

describe("energy-class — THRESHOLDS_BY_VERSION", () => {
  test("conține ambele versiuni (ord16_2023 + epbd_2024)", () => {
    expect(THRESHOLDS_BY_VERSION).toHaveProperty("ord16_2023");
    expect(THRESHOLDS_BY_VERSION).toHaveProperty("epbd_2024");
  });

  test("ord16_2023 conține exact categoriile din Mc 001-2022", () => {
    const keys = Object.keys(THRESHOLDS_BY_VERSION.ord16_2023);
    expect(keys).toEqual(
      expect.arrayContaining([
        "RI_cool", "RI_nocool", "RC_cool", "RC_nocool",
        "RA_cool", "RA_nocool",
        "BI", "ED", "SA", "HC", "CO", "SP", "AL",
      ])
    );
  });

  test("fiecare categorie are exact 7 praguri (A+..F)", () => {
    for (const version of Object.keys(THRESHOLDS_BY_VERSION)) {
      for (const [cat, thresh] of Object.entries(THRESHOLDS_BY_VERSION[version])) {
        expect(thresh).toHaveLength(7);
        // Praguri crescătoare strict
        for (let i = 1; i < thresh.length; i++) {
          expect(thresh[i], `${version}.${cat}[${i}] > [${i-1}]`)
            .toBeGreaterThan(thresh[i - 1]);
        }
      }
    }
  });

  test("epbd_2024 are praguri mai mici decât ord16_2023 (rescalare mai strictă)", () => {
    for (const cat of Object.keys(THRESHOLDS_BY_VERSION.ord16_2023)) {
      const old_ = THRESHOLDS_BY_VERSION.ord16_2023[cat];
      const new_ = THRESHOLDS_BY_VERSION.epbd_2024[cat];
      // pragul A+ (index 0) la noua scală <= vechiul A+ (rescalare)
      expect(new_[0]).toBeLessThanOrEqual(old_[0]);
    }
  });
});

describe("classifyEnergyClass — comportament legacy (ord16_2023)", () => {
  test("DEFAULT_VERSION = 'ord16_2023'", () => {
    expect(DEFAULT_VERSION).toBe("ord16_2023");
  });

  test("apel fără version folosește ord16_2023", () => {
    const r = classifyEnergyClass(100, "RC_nocool");
    expect(r.version).toBe("ord16_2023");
    expect(r.cls).toBeTruthy();
  });

  test("clădire eficientă RC fără răcire → clasa A+ sau A", () => {
    // RC_nocool thresholds ord16_2023: [60, 84, 168, ...]
    const r = classifyEnergyClass(50, "RC_nocool");
    expect(r.cls).toBe("A+");
    expect(r.idx).toBe(0);
    expect(r.score).toBeGreaterThan(85);
  });

  test("clădire slabă → clasa G", () => {
    const r = classifyEnergyClass(2000, "RC_nocool");
    expect(r.cls).toBe("G");
    expect(r.idx).toBe(7);
    expect(r.score).toBe(1);
  });

  test("categorie invalidă → fallback '—'", () => {
    const r = classifyEnergyClass(100, "INVALID_CAT");
    expect(r.cls).toBe("—");
    expect(r.idx).toBe(-1);
  });

  test("version invalidă → fallback la DEFAULT_VERSION", () => {
    const r = classifyEnergyClass(100, "RC_nocool", "necunoscut");
    expect(r.version).toBe(DEFAULT_VERSION);
  });
});

describe("classifyEnergyClass — versiune epbd_2024", () => {
  test("aceleași valori de consum dau clasă mai slabă pe epbd_2024", () => {
    // RC_nocool 65 kWh/(m²·an) → ord16_2023: A (84), epbd_2024: A+ sau A
    const r1 = classifyEnergyClass(65, "RC_nocool", "ord16_2023");
    const r2 = classifyEnergyClass(65, "RC_nocool", "epbd_2024");
    // Pe scala nouă, același consum ar trebui să fie în clasă egală sau mai slabă.
    expect(r2.idx).toBeGreaterThanOrEqual(r1.idx);
  });

  test("epbd_2024 returnează versiunea corectă", () => {
    const r = classifyEnergyClass(100, "BI", "epbd_2024");
    expect(r.version).toBe("epbd_2024");
  });
});

describe("getCurrentVersion + classifyEnergyClassAuto", () => {
  test("în absența flag-ului, returnează ord16_2023", () => {
    // În mediul de test (Node, fără window/localStorage real), featureFlags
    // returnează DEFAULTS (EPBD_2024_THRESHOLDS = false).
    expect(getCurrentVersion()).toBe("ord16_2023");
  });

  test("classifyEnergyClassAuto delegă la classifyEnergyClass cu versiunea curentă", () => {
    const a = classifyEnergyClassAuto(100, "BI");
    const b = classifyEnergyClass(100, "BI", getCurrentVersion());
    expect(a.cls).toBe(b.cls);
    expect(a.version).toBe(b.version);
  });
});

describe("VERSIONS metadata", () => {
  test("conține câmpurile descriptive necesare", () => {
    expect(VERSIONS.ord16_2023).toMatchObject({
      id:       "ord16_2023",
      label:    expect.any(String),
      effective: expect.any(String),
      classes:  expect.any(Array),
    });
    expect(VERSIONS.epbd_2024).toMatchObject({
      id:       "epbd_2024",
      zebClass: "A",
      warning:  expect.stringContaining("PLACEHOLDER"),
    });
  });

  test("epbd_2024 are 7 clase (A..G), fără A+", () => {
    expect(VERSIONS.epbd_2024.classes).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });
});
