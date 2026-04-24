/**
 * fire-safety.test.js — Sprint 22 #17
 * Siguranță la foc pentru straturile izolante (P118/2013 + P118/3-2015).
 */
import { describe, it, expect } from "vitest";
import {
  getMaterialFireClass,
  getRequiredFireClass,
  checkFireSafety,
  FIRE_CLASSES,
} from "../fire-safety.js";

describe("Sprint 22 #17 — getMaterialFireClass (clasificare automată)", () => {
  it("EPS / Polistiren expandat → E", () => {
    expect(getMaterialFireClass("Polistiren expandat EPS-100")).toBe("E");
    expect(getMaterialFireClass("EPS-F 15 kg/m³")).toBe("E");
    expect(getMaterialFireClass("Styropor")).toBe("E");
  });

  it("XPS / Polistiren extrudat → E", () => {
    expect(getMaterialFireClass("Polistiren extrudat XPS")).toBe("E");
    expect(getMaterialFireClass("Roofmate")).toBe("E");
    expect(getMaterialFireClass("Styrodur 3035")).toBe("E");
  });

  it("Vată minerală bazaltică → A1", () => {
    expect(getMaterialFireClass("Vată bazaltică Rockwool")).toBe("A1");
    expect(getMaterialFireClass("Stone wool MW40")).toBe("A1");
    expect(getMaterialFireClass("Vată din piatră")).toBe("A1");
  });

  it("Vată minerală de sticlă → A2-s1,d0", () => {
    expect(getMaterialFireClass("Vată de sticlă Isover")).toBe("A2-s1,d0");
    expect(getMaterialFireClass("Glass wool insulation")).toBe("A2-s1,d0");
  });

  it("PUR / Poliuretan → E, PIR → B-s2,d0", () => {
    expect(getMaterialFireClass("Spumă poliuretanică PUR")).toBe("E");
    expect(getMaterialFireClass("PIR polyisocyanurate")).toBe("B-s2,d0");
  });

  it("Sticlă celulară (Foamglas) → A1", () => {
    expect(getMaterialFireClass("Sticlă celulară Foamglas")).toBe("A1");
  });

  it("Beton / cărămidă / BCA → A1 (incombustibile portante)", () => {
    expect(getMaterialFireClass("Beton armat")).toBe("A1");
    expect(getMaterialFireClass("Cărămidă ceramică")).toBe("A1");
    expect(getMaterialFireClass("BCA 25cm")).toBe("A1");
  });

  it("Override explicit fire_class pe obiect", () => {
    expect(getMaterialFireClass({ name: "EPS", fire_class: "A2-s1,d0" })).toBe("A2-s1,d0");
  });

  it("Material necunoscut → F (neclasificat)", () => {
    expect(getMaterialFireClass("Xyzzy material inventat")).toBe("F");
    expect(getMaterialFireClass("")).toBe("F");
    expect(getMaterialFireClass(null)).toBe("F");
  });
});

describe("Sprint 22 #17 — getRequiredFireClass per înălțime clădire", () => {
  it("Casă P (5m) → clasa minimă E (orice)", () => {
    const r = getRequiredFireClass(5);
    expect(r.required).toBe("E");
    expect(r.label).toMatch(/P\+1|≤11/);
  });

  it("Casă P+1 (8m) → clasa minimă E", () => {
    expect(getRequiredFireClass(8).required).toBe("E");
  });

  it("Bloc P+4 (15m) → clasa minimă B-s2,d0", () => {
    const r = getRequiredFireClass(15);
    expect(r.required).toBe("B-s2,d0");
    expect(r.rule).toMatch(/P118/);
  });

  it("Bloc P+8 (28m) → clasa minimă A2-s1,d0", () => {
    const r = getRequiredFireClass(28);
    expect(r.required).toBe("A2-s1,d0");
    expect(r.label).toMatch(/obligatoriu|>25/);
  });

  it("Casă fără h setat (0) → clasa minimă E (fallback permisiv)", () => {
    expect(getRequiredFireClass(0).required).toBe("E");
  });
});

describe("Sprint 22 #17 — checkFireSafety (verificare ansamblu)", () => {
  it("Perete P+4 (h=15m) cu EPS → FAIL (B-s2,d0 cerut, EPS e E)", () => {
    const layers = [
      { matName: "Cărămidă ceramică", lambda: 0.46, thickness: 250 },
      { matName: "Polistiren expandat EPS-100", lambda: 0.036, thickness: 100 },
      { matName: "Tencuială decorativă", lambda: 0.87, thickness: 10 },
    ];
    const r = checkFireSafety(layers, 15);
    expect(r.verdict).toBe("fail");
    expect(r.requiredClass).toBe("B-s2,d0");
    expect(r.message).toMatch(/strat|EPS/i);
  });

  it("Perete P+4 (h=15m) cu vată bazaltică → OK", () => {
    const layers = [
      { matName: "Cărămidă ceramică", lambda: 0.46, thickness: 250 },
      { matName: "Vată bazaltică Rockwool FP", lambda: 0.038, thickness: 100 },
      { matName: "Tencuială decorativă", lambda: 0.87, thickness: 10 },
    ];
    const r = checkFireSafety(layers, 15);
    expect(r.verdict).toBe("ok");
  });

  it("Bloc turn >25m cu EPS → FAIL critic (cerută A2-s1,d0)", () => {
    const layers = [
      { matName: "Polistiren expandat", lambda: 0.036, thickness: 150 },
    ];
    const r = checkFireSafety(layers, 30);
    expect(r.verdict).toBe("fail");
    expect(r.requiredClass).toBe("A2-s1,d0");
  });

  it("Bloc >25m cu vată bazaltică → OK", () => {
    const layers = [
      { matName: "Beton armat", lambda: 1.74, thickness: 250 },
      { matName: "Vată bazaltică Rockwool FP", lambda: 0.038, thickness: 120 },
      { matName: "Tencuială minerală", lambda: 0.87, thickness: 10 },
    ];
    const r = checkFireSafety(layers, 30);
    expect(r.verdict).toBe("ok");
  });

  it("Casă P+1 (h=8m) cu EPS → OK (≤11m permite orice clasă)", () => {
    const layers = [
      { matName: "BCA 25cm", lambda: 0.17, thickness: 250 },
      { matName: "Polistiren expandat EPS-F", lambda: 0.036, thickness: 100 },
      { matName: "Tencuială", lambda: 0.87, thickness: 10 },
    ];
    const r = checkFireSafety(layers, 8);
    expect(r.verdict).toBe("ok");
  });

  it("Material necunoscut → verdict warn (verificați fișa)", () => {
    const layers = [
      { matName: "Cărămidă", lambda: 0.46, thickness: 250 },
      { matName: "Izolație brand obscur XZ-9000", lambda: 0.035, thickness: 100 },
    ];
    const r = checkFireSafety(layers, 15);
    expect(r.verdict).toBe("warn");
  });

  it("layerResults include status per strat (ok/fail/warn)", () => {
    const layers = [
      { matName: "Beton", lambda: 1.74, thickness: 250 },
      { matName: "EPS", lambda: 0.036, thickness: 100 },
    ];
    const r = checkFireSafety(layers, 20);
    expect(r.layerResults).toHaveLength(2);
    expect(r.layerResults[0].fire_class).toBe("A1");
    expect(r.layerResults[1].fire_class).toBe("E");
    expect(r.layerResults[1].status).toBe("fail");
  });

  it("Straturi fără izolație (toate A1) → OK indiferent de h", () => {
    const layers = [
      { matName: "Beton", lambda: 1.74, thickness: 200 },
      { matName: "Cărămidă", lambda: 0.46, thickness: 250 },
    ];
    const r = checkFireSafety(layers, 50);
    expect(r.verdict).toBe("ok");
  });

  it("FIRE_CLASSES expune toate Euroclasele standard", () => {
    expect(FIRE_CLASSES["A1"].isIncombustible).toBe(true);
    expect(FIRE_CLASSES["A2-s1,d0"].isIncombustible).toBe(true);
    expect(FIRE_CLASSES["B-s2,d0"].isIncombustible).toBe(false);
    expect(FIRE_CLASSES["E"].isIncombustible).toBe(false);
    expect(FIRE_CLASSES["F"].isIncombustible).toBe(false);
  });
});
