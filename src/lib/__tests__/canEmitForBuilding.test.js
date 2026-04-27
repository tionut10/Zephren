/**
 * canEmitForBuilding.test.js — Sprint v6.3 (27 apr 2026)
 *
 * Suite teste pentru helper-ul centralizat canEmitForBuilding() care impune
 * regulile MDLPA Ord. 348/2026 Art. 6 alin. (1) și (2).
 *
 * Acoperă:
 *   - Plan free / edu (no validation)
 *   - Plan AE IIci (audit) cu 6 reguli stricte Art. 6 alin. (2)
 *   - Plan AE Ici / Expert / Birou / Enterprise (full scope)
 *   - Operațiuni: cpe / audit / nzeb cu effectiveGrade
 *   - Cross-validation auditor real vs plan
 */

import { describe, it, expect } from "vitest";
import {
  canEmitForBuilding,
  getAllowedScopes,
  getAllowedCategories,
} from "../canEmitForBuilding.js";

const RES_BUILDING = { category: "RI", scopCpe: "construire" };
const NONRES_BUILDING = { category: "BIR", scopCpe: "construire" };
const PUBLIC_BUILDING = { category: "RI", scopCpe: "construire", isPublic: true };
const RENOVARE_BUILDING = { category: "RI", scopCpe: "renovare" };
const BLOC_VANZARE = { category: "RC", scopCpe: "vanzare" };
const APT_CONSTRUIRE = { category: "BC", scopCpe: "construire" };

describe("canEmitForBuilding — Plan free / edu (no validation)", () => {
  it("free permite orice combinație fără blocaj legal", () => {
    const r = canEmitForBuilding({ plan: "free", auditorGrad: null, building: NONRES_BUILDING });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("ok");
  });
  it("edu permite orice combinație fără blocaj legal (watermark obligatoriu separat)", () => {
    const r = canEmitForBuilding({ plan: "edu", auditorGrad: null, building: PUBLIC_BUILDING });
    expect(r.ok).toBe(true);
  });
  it("free permite renovare (e demo, nu emite oficial)", () => {
    const r = canEmitForBuilding({ plan: "free", auditorGrad: null, building: RENOVARE_BUILDING });
    expect(r.ok).toBe(true);
  });
});

describe("canEmitForBuilding — Plan AE IIci (audit) — Art. 6 alin. (2) STRICT", () => {
  it("permite CPE pentru casă nouă (RI + construire)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: RES_BUILDING });
    expect(r.ok).toBe(true);
  });
  it("permite CPE pentru apartament la vânzare (BC + vanzare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "BC", scopCpe: "vanzare" },
    });
    expect(r.ok).toBe(true);
  });
  it("permite CPE pentru bloc nou la construire (RC + construire)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RC", scopCpe: "construire" },
    });
    expect(r.ok).toBe(true);
  });
  it("BLOCHEAZĂ CPE pentru clădire nerezidențială (BIR)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: NONRES_BUILDING });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/AE IIci/);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(2\)/);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("BLOCHEAZĂ CPE pentru renovare energetică (RI + renovare)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: RENOVARE_BUILDING });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/renovare/i);
  });
  it("BLOCHEAZĂ CPE pentru clădire publică rezidențială (case protocol)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: PUBLIC_BUILDING });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/autorități publice|publice/i);
    expect(r.legalRef).toMatch(/L\.372\/2005/);
  });
  it("BLOCHEAZĂ vânzarea blocului întreg (RC + vanzare)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: BLOC_VANZARE });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/bloc.*întreg/i);
  });
  it("BLOCHEAZĂ închirierea blocului întreg (RC + inchiriere)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RC", scopCpe: "inchiriere" },
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
  });
  it("BLOCHEAZĂ apartament construire individuală (BC + construire)", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "IIci", building: APT_CONSTRUIRE });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/apartament/i);
  });
  it("BLOCHEAZĂ schimbare destinație (scop nepermis)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RI", scopCpe: "schimbare_destinatie" },
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
  });
});

describe("canEmitForBuilding — Plan AE Ici / Expert / Birou / Enterprise — full scope", () => {
  for (const plan of ["pro", "expert", "birou", "enterprise"]) {
    it(`${plan}: permite orice categorie + orice scop pentru auditor AE Ici`, () => {
      for (const building of [
        NONRES_BUILDING, PUBLIC_BUILDING, RENOVARE_BUILDING, BLOC_VANZARE, APT_CONSTRUIRE,
      ]) {
        const r = canEmitForBuilding({ plan, auditorGrad: "Ici", building });
        expect(r.ok, `plan=${plan} building=${JSON.stringify(building)}`).toBe(true);
      }
    });
  }
});

describe("canEmitForBuilding — cross-validation auditor REAL vs plan", () => {
  it("auditor IIci real pe plan Pro (Ici) → blocat la nerezidențial", () => {
    const r = canEmitForBuilding({ plan: "pro", auditorGrad: "IIci", building: NONRES_BUILDING });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("auditor IIci real pe plan Expert → blocat la renovare (chiar pe rezidențial)", () => {
    const r = canEmitForBuilding({ plan: "expert", auditorGrad: "IIci", building: RENOVARE_BUILDING });
    expect(r.ok).toBe(false);
  });
  it("auditor IIci real pe plan Birou → blocat la vânzare bloc întreg", () => {
    const r = canEmitForBuilding({ plan: "birou", auditorGrad: "IIci", building: BLOC_VANZARE });
    expect(r.ok).toBe(false);
  });
  it("auditor Ici real pe plan AE IIci → permis (atestatul superior nu coboară)", () => {
    // Cazul: auditor cu atestat AE Ici a luat plan AE IIci 199 RON din economie.
    // Plan-ul cere IIci dar atestatul Ici acoperă rezidențial (superior).
    // Pentru rezidențial → permis. Pentru nerezidențial → planul îl limitează (gradMdlpaRequired).
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: "Ici", building: RES_BUILDING });
    expect(r.ok).toBe(true);
  });
  it("auditor fără grad declarat pe plan AE IIci + nerezidențial → blocat", () => {
    const r = canEmitForBuilding({ plan: "audit", auditorGrad: null, building: NONRES_BUILDING });
    expect(r.ok).toBe(false);
  });
});

describe("canEmitForBuilding — operation audit + nzeb (Art. 6 alin. 1 lit. b/c)", () => {
  it("operation=audit blocat pentru AE IIci real chiar pe plan Pro", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "audit",
    });
    expect(r.ok).toBe(false);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(1\) lit\. b\)/);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("operation=audit blocat pentru plan AE IIci (gradMdlpaRequired=IIci)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "audit",
    });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("operation=audit permis pentru AE Ici real pe plan Expert", () => {
    const r = canEmitForBuilding({
      plan: "expert", auditorGrad: "Ici",
      building: RES_BUILDING, operation: "audit",
    });
    expect(r.ok).toBe(true);
  });
  it("operation=nzeb blocat pentru AE IIci (Art. 6 alin. 1 lit. c)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "nzeb",
    });
    expect(r.ok).toBe(false);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(1\) lit\. c\)/);
  });
  it("operation=nzeb permis pentru AE Ici pe plan Pro", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "Ici",
      building: RES_BUILDING, operation: "nzeb",
    });
    expect(r.ok).toBe(true);
  });
});

describe("canEmitForBuilding — edge cases", () => {
  it("categoria lipsă → severity info, fără blocaj", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { scopCpe: "construire" },
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("info");
  });
  it("scope lipsă pe AE IIci + rezidențial → permis (scope opțional la editare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RI" },
    });
    expect(r.ok).toBe(true);
  });
  it("plan invalid → fallback la free", () => {
    const r = canEmitForBuilding({
      plan: "necunoscut", auditorGrad: "Ici", building: NONRES_BUILDING,
    });
    expect(r.ok).toBe(true);
  });
  it("backward compat — plan legacy starter → audit", () => {
    const r = canEmitForBuilding({
      plan: "starter", auditorGrad: "IIci", building: NONRES_BUILDING,
    });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
});

describe("getAllowedScopes / getAllowedCategories", () => {
  it("free / edu / pro / expert / birou / enterprise → 'all'", () => {
    expect(getAllowedScopes("free")).toBe("all");
    expect(getAllowedScopes("edu")).toBe("all");
    expect(getAllowedScopes("pro")).toBe("all");
    expect(getAllowedScopes("expert")).toBe("all");
    expect(getAllowedScopes("birou")).toBe("all");
    expect(getAllowedScopes("enterprise")).toBe("all");
  });
  it("audit (AE IIci) → 4 scope-uri permise (fără renovare)", () => {
    const allowed = getAllowedScopes("audit");
    expect(Array.isArray(allowed)).toBe(true);
    expect(allowed).toContain("construire");
    expect(allowed).toContain("vanzare");
    expect(allowed).toContain("inchiriere");
    expect(allowed).toContain("receptie");
    expect(allowed).not.toContain("renovare");
    expect(allowed).not.toContain("schimbare_destinatie");
  });
  it("audit (AE IIci) → 4 categorii rezidențiale", () => {
    const allowed = getAllowedCategories("audit");
    expect(allowed).toEqual(["RI", "RC", "RA", "BC"]);
  });
  it("pro (AE Ici) → toate categoriile (null)", () => {
    expect(getAllowedCategories("pro")).toBeNull();
  });
});
