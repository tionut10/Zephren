/**
 * shading-factor.test.js — Sprint 22 #15
 * F_sh = F_h × F_f × F_mobile (Mc 001-2022 Anexa E + SR EN ISO 52016-1 §6.5.4)
 */
import { describe, it, expect } from "vitest";
import {
  calcFshOverhang,
  calcFshFin,
  calcFshMobile,
  calcFsh,
  inferWindowDims,
} from "../shading-factor.js";

describe("Sprint 22 #15 — calcFshOverhang (streașină)", () => {
  it("Fără streașină (d=0) → F_h = 1.0", () => {
    expect(calcFshOverhang(0, 1.5, "S")).toBe(1.0);
  });

  it("Streașină 30 cm pe fereastră 1.5 m sud (d/h=0.2) → F_h ≈ 0.90", () => {
    expect(calcFshOverhang(30, 1.5, "S")).toBeCloseTo(0.90, 2);
  });

  it("Streașină 60 cm pe fereastră 1.5 m sud (d/h=0.4) → F_h ≈ 0.76", () => {
    expect(calcFshOverhang(60, 1.5, "S")).toBeCloseTo(0.76, 2);
  });

  it("Streașină 150 cm pe fereastră 1.5 m sud (d/h=1.0) → F_h ≈ 0.50", () => {
    expect(calcFshOverhang(150, 1.5, "S")).toBeCloseTo(0.50, 2);
  });

  it("Streașină foarte mare (d/h > 1.0) → F_h clamp la 0.50", () => {
    expect(calcFshOverhang(300, 1.5, "S")).toBeCloseTo(0.50, 2);
  });

  it("Aceeași streașină pe nord → F_h aproape de 1.0 (soare nu ajunge direct)", () => {
    const fhSouth = calcFshOverhang(60, 1.5, "S");
    const fhNorth = calcFshOverhang(60, 1.5, "N");
    expect(fhNorth).toBeGreaterThan(fhSouth);
    expect(fhNorth).toBeGreaterThan(0.90);
  });

  it("Streașină pe orizontală (plafon vitrat) → F_h = 1.0 (nu afectează)", () => {
    expect(calcFshOverhang(100, 1.5, "Orizontal")).toBe(1.0);
  });

  it("Interpolare liniară între puncte tabel", () => {
    // d/h = 0.3 → între 0.90 și 0.76, la jumătate → ≈ 0.83
    expect(calcFshOverhang(45, 1.5, "S")).toBeCloseTo(0.83, 2);
  });
});

describe("Sprint 22 #15 — calcFshFin (aripi laterale)", () => {
  it("Fără aripi (d=0) → F_f = 1.0", () => {
    expect(calcFshFin(0, 1.0)).toBe(1.0);
  });

  it("Aripi 20 cm pe fereastră 1.0 m lată (d/w=0.2) → F_f ≈ 0.92", () => {
    expect(calcFshFin(20, 1.0)).toBeCloseTo(0.92, 2);
  });

  it("Aripi adânci (d/w=1.0) → F_f ≈ 0.75 (minim)", () => {
    expect(calcFshFin(100, 1.0)).toBeCloseTo(0.75, 2);
  });

  it("Lățime fereastră 0 → F_f = 1.0 (fail-safe)", () => {
    expect(calcFshFin(50, 0)).toBe(1.0);
  });
});

describe("Sprint 22 #15 — calcFshMobile (obloane/rulouri)", () => {
  it("Fără protecție mobilă → F_mobile = 1.0", () => {
    expect(calcFshMobile(false)).toBe(1.0);
    expect(calcFshMobile(undefined)).toBe(1.0);
    expect(calcFshMobile(null)).toBe(1.0);
  });

  it("Cu protecție mobilă → F_mobile = 0.5", () => {
    expect(calcFshMobile(true)).toBe(0.5);
    expect(calcFshMobile("true")).toBe(0.5);
    expect(calcFshMobile("da")).toBe(0.5);
    expect(calcFshMobile(1)).toBe(0.5);
  });
});

describe("Sprint 22 #15 — calcFsh integrat", () => {
  it("Fereastră fără protecții → F_sh = 1.0", () => {
    const el = { area: 2.0, orientation: "S" };
    const r = calcFsh(el);
    expect(r.fsh).toBe(1.0);
    expect(r.fh).toBe(1.0);
    expect(r.ff).toBe(1.0);
    expect(r.fm).toBe(1.0);
  });

  it("Fereastră sud cu streașină + aripi + obloane → F_sh redus semnificativ", () => {
    const el = {
      area: 2.0, orientation: "S",
      shading: { overhang_cm: 60, fin_cm: 30, hasMobile: true },
    };
    const r = calcFsh(el);
    // F_h ≈ 0.79, F_f ≈ 0.90, F_m = 0.5 → F_sh ≈ 0.36 (aporturi solare reduse ~64%)
    expect(r.fsh).toBeLessThan(0.40);
    expect(r.fsh).toBeGreaterThan(0.30);
    expect(r.fm).toBe(0.5);
  });

  it("Dimensiuni explicite override cele inferate", () => {
    const elInferred = { area: 2.0, orientation: "S", shading: { overhang_cm: 50 } };
    const elExplicit = { area: 2.0, orientation: "S", shading: { overhang_cm: 50, height_m: 2.5, width_m: 0.8 } };
    // Cu H=2.5 → d/h = 0.5/2.5 = 0.2 → F_h ≈ 0.90
    // Cu H inferată din 2m² ≈ 1.67 → d/h ≈ 0.30 → F_h ≈ 0.83
    const rI = calcFsh(elInferred);
    const rE = calcFsh(elExplicit);
    expect(rE.fsh).toBeGreaterThan(rI.fsh);
  });

  it("Orientare nord → F_sh aproape 1.0 indiferent de streașină", () => {
    const el = {
      area: 2.0, orientation: "N",
      shading: { overhang_cm: 100 },
    };
    const r = calcFsh(el);
    expect(r.fsh).toBeGreaterThan(0.85);
  });

  it("Integrare Q_sol: F_sh = 0.5 → aporturi solare înjumătățite", () => {
    // Simulare simplă: Q_sol ∝ F_sh
    const elNoShade = { area: 2.0, orientation: "S" };
    const elWithMobile = { area: 2.0, orientation: "S", shading: { hasMobile: true } };
    const rNoShade = calcFsh(elNoShade);
    const rMobile = calcFsh(elWithMobile);
    expect(rMobile.fsh / rNoShade.fsh).toBeCloseTo(0.5, 2);
  });

  it("Reference menționează Mc 001-2022 + ISO 52016-1", () => {
    const r = calcFsh({ area: 2.0, orientation: "S" });
    expect(r.reference).toMatch(/Mc 001-2022/);
    expect(r.reference).toMatch(/ISO 52016-1/);
  });
});

describe("Sprint 22 #15 — inferWindowDims", () => {
  it("Suprafață 2 m² → aproximativ 1.67 × 1.20 (H/W=1.4)", () => {
    const d = inferWindowDims(2.0);
    expect(d.height).toBeCloseTo(1.673, 2);
    expect(d.width).toBeCloseTo(1.195, 2);
    expect(d.height / d.width).toBeCloseTo(1.4, 1);
  });

  it("Suprafață 0 → defaults rezonabili (1.2 × 0.9)", () => {
    const d = inferWindowDims(0);
    expect(d.height).toBeGreaterThan(1);
    expect(d.width).toBeGreaterThan(0.5);
  });
});
