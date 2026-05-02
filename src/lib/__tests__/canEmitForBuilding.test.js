/**
 * canEmitForBuilding.test.js — Sprint Tranziție 2026 (2 mai 2026)
 *
 * Suite teste pentru helper-ul centralizat canEmitForBuilding() care impune
 * regulile MDLPA Ord. 348/2026 Art. 6 alin. (1) și (2).
 *
 * Noua filozofie (T1.5 Sprint Tranziție):
 *   - Verificările LEGALE folosesc auditorGrad strict (atestat real domină).
 *   - Plan-ul NU mai influențează drepturile legale (rămâne UI gating separat).
 *   - În tranziție (14.IV.2026 → 11.X.2026) blocările → soft warning.
 *   - Override testare: window.__forceStrictGrade = true.
 *
 * Acoperă:
 *   - Plan free / edu (no validation)
 *   - AE IIci real cu 6 reguli stricte Art. 6 alin. (2)
 *   - AE Ici real (orice plan) — full scope, fără restricții legale
 *   - Operațiuni: cpe / audit / nzeb pe baza atestatului real
 *   - Cross-validation auditor real vs plan (atestatul superior nu coboară)
 *   - Tranziție: blocking → warning soft (ok=true + softWarning text)
 *   - Strict mode: post-11.X.2026 sau __forceStrictGrade
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

// Date pentru testare strict (post-tranziție): 11.X.2026 + 1 zi = 12.X.2026
const STRICT_NOW = new Date("2026-12-01T00:00:00.000Z");
// Date pentru testare în tranziție: 1 mai 2026 (între 14.IV și 11.X)
const TRANSITION_NOW = new Date("2026-05-01T00:00:00.000Z");

describe("canEmitForBuilding — Plan free / edu (no validation)", () => {
  it("free permite orice combinație fără blocaj legal", () => {
    const r = canEmitForBuilding({
      plan: "free", auditorGrad: null, building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("ok");
  });
  it("edu permite orice combinație fără blocaj legal (watermark obligatoriu separat)", () => {
    const r = canEmitForBuilding({
      plan: "edu", auditorGrad: null, building: PUBLIC_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("free permite renovare (e demo, nu emite oficial)", () => {
    const r = canEmitForBuilding({
      plan: "free", auditorGrad: null, building: RENOVARE_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
});

describe("canEmitForBuilding — AE IIci real STRICT (post-tranziție) — Art. 6 alin. (2)", () => {
  it("permite CPE pentru casă nouă (RI + construire)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: RES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("permite CPE pentru apartament la vânzare (BC + vanzare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "BC", scopCpe: "vanzare" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("permite CPE pentru bloc nou la construire (RC + construire)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RC", scopCpe: "construire" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("BLOCHEAZĂ CPE pentru clădire nerezidențială (BIR)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/AE IIci/);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(2\)/);
    expect(r.upgradePath).toBe("AE Ici");
    expect(r.blockedBy).toBe("grade");
  });
  it("BLOCHEAZĂ CPE pentru renovare energetică (RI + renovare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: RENOVARE_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/renovare/i);
  });
  it("BLOCHEAZĂ CPE pentru clădire publică rezidențială (case protocol)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: PUBLIC_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/autorități publice|publice/i);
    expect(r.legalRef).toMatch(/L\.372\/2005/);
  });
  it("BLOCHEAZĂ vânzarea blocului întreg (RC + vanzare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: BLOC_VANZARE, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/bloc.*întreg/i);
  });
  it("BLOCHEAZĂ închirierea blocului întreg (RC + inchiriere)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RC", scopCpe: "inchiriere" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
  });
  it("BLOCHEAZĂ apartament construire individuală (BC + construire)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: APT_CONSTRUIRE, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
    expect(r.reason).toMatch(/apartament/i);
  });
  it("BLOCHEAZĂ schimbare destinație (scop nepermis)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RI", scopCpe: "schimbare_destinatie" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("blocking");
  });
});

describe("canEmitForBuilding — AE Ici real (orice plan) — full legal scope", () => {
  for (const plan of ["audit", "pro", "expert", "birou", "enterprise"]) {
    it(`${plan}: AE Ici REAL → permis orice categorie + orice scop (atestatul domină plan)`, () => {
      for (const building of [
        NONRES_BUILDING, PUBLIC_BUILDING, RENOVARE_BUILDING, BLOC_VANZARE, APT_CONSTRUIRE,
      ]) {
        const r = canEmitForBuilding({
          plan, auditorGrad: "Ici", building, now: STRICT_NOW,
        });
        expect(r.ok, `plan=${plan} building=${JSON.stringify(building)}`).toBe(true);
      }
    });
  }
  it("AE Ici real cu plan IIci + clădire BIR → ALLOWED (atestat permite, plan limitează doar UI)", () => {
    // Cazul cheie nou: un AE Ici care a luat plan IIci 599 RON pentru economie.
    // Atestatul Ici îi dă drept LEGAL pe BIR; plan-ul îl limitează doar în UI.
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "Ici", building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("ok");
  });
});

describe("canEmitForBuilding — cross-validation auditor REAL vs plan (strict)", () => {
  it("AE IIci real pe plan Pro (Ici) → blocat la nerezidențial (atestat domină)", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "IIci", building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("AE IIci real pe plan Expert → blocat la renovare (chiar pe rezidențial)", () => {
    const r = canEmitForBuilding({
      plan: "expert", auditorGrad: "IIci", building: RENOVARE_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
  });
  it("AE IIci real pe plan Birou → blocat la vânzare bloc întreg", () => {
    const r = canEmitForBuilding({
      plan: "birou", auditorGrad: "IIci", building: BLOC_VANZARE, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
  });
  it("AE Ici real pe plan AE IIci + rezidențial → permis (atestatul superior nu coboară)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "Ici", building: RES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("auditor fără grad declarat pe plan AE IIci + nerezidențial → blocat (proxy din plan)", () => {
    // Fail-safe: fără atestat declarat, presupunem gradul minim al planului (IIci)
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: null, building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
  });
  it("auditor fără grad declarat pe plan Pro → permis (proxy = Ici)", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: null, building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
});

describe("canEmitForBuilding — operation audit + nzeb (strict, Art. 6 alin. 1 lit. b/c)", () => {
  it("operation=audit blocat pentru AE IIci real chiar pe plan Pro", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "audit", now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(1\) lit\. b\)/);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("operation=audit blocat pentru plan AE IIci fără auditorGrad declarat (proxy IIci)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: null,
      building: RES_BUILDING, operation: "audit", now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("operation=audit permis pentru AE Ici real pe plan Expert", () => {
    const r = canEmitForBuilding({
      plan: "expert", auditorGrad: "Ici",
      building: RES_BUILDING, operation: "audit", now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("operation=audit permis pentru AE Ici real pe plan AE IIci (atestat domină)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "Ici",
      building: RES_BUILDING, operation: "audit", now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("operation=nzeb blocat pentru AE IIci (Art. 6 alin. 1 lit. c)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "nzeb", now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(1\) lit\. c\)/);
  });
  it("operation=nzeb permis pentru AE Ici pe plan Pro", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "Ici",
      building: RES_BUILDING, operation: "nzeb", now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
});

describe("canEmitForBuilding — perioadă de tranziție (Sprint Tranziție 2026)", () => {
  it("AE IIci real + nerezidențial în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: NONRES_BUILDING, now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.inTransition).toBe(true);
    expect(r.softWarning).toMatch(/tranziție|abrogare/i);
    expect(r.softWarning).toMatch(/octombrie 2026/i);
    expect(r.blockedBy).toBe("grade-transition");
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(2\)/);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("AE IIci real + renovare în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: RENOVARE_BUILDING, now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.softWarning).toMatch(/renovare/i);
  });
  it("AE IIci real + audit operation în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "audit", now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.softWarning).toMatch(/audit energetic/i);
    expect(r.legalRef).toMatch(/Art\. 6 alin\. \(1\) lit\. b\)/);
  });
  it("AE IIci real + nzeb operation în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: RES_BUILDING, operation: "nzeb", now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.softWarning).toMatch(/nZEB/);
  });
  it("AE IIci real + bloc vânzare în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: BLOC_VANZARE, now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.softWarning).toMatch(/bloc.*întreg|tranziție/i);
  });
  it("AE IIci real + clădire publică în tranziție → ok=true + softWarning", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: PUBLIC_BUILDING, now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warning");
    expect(r.softWarning).toMatch(/autorități publice|tranziție/i);
  });
  it("AE Ici real în tranziție → ok=true severity ok (nu intră soft warning, nu e blocat)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "Ici", building: NONRES_BUILDING, now: TRANSITION_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("ok");
    expect(r.softWarning).toBeNull();
  });
  it("rezultatul în tranziție conține inTransition=true chiar și pe verdict ok", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "Ici", building: RES_BUILDING, now: TRANSITION_NOW,
    });
    expect(r.inTransition).toBe(true);
  });
  it("rezultatul post-tranziție conține inTransition=false", () => {
    const r = canEmitForBuilding({
      plan: "pro", auditorGrad: "Ici", building: RES_BUILDING, now: STRICT_NOW,
    });
    expect(r.inTransition).toBe(false);
  });
});

describe("canEmitForBuilding — edge cases", () => {
  it("categoria lipsă → severity info, fără blocaj", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { scopCpe: "construire" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("info");
  });
  it("scope lipsă pe AE IIci + rezidențial → permis (scope opțional la editare)", () => {
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci",
      building: { category: "RI" }, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("plan invalid → fallback la free", () => {
    const r = canEmitForBuilding({
      plan: "necunoscut", auditorGrad: "Ici", building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(true);
  });
  it("backward compat — plan legacy starter + auditorGrad IIci → blocat (proxy strict)", () => {
    const r = canEmitForBuilding({
      plan: "starter", auditorGrad: "IIci", building: NONRES_BUILDING, now: STRICT_NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.upgradePath).toBe("AE Ici");
  });
  it("default now (omis) → comportament curent (tranziție activă în 2026)", () => {
    // Test fără parametru now — folosește new Date() implicit
    // În tranziție (2 mai 2026 < 11 oct 2026) → AE IIci + BIR e warning
    const r = canEmitForBuilding({
      plan: "audit", auditorGrad: "IIci", building: NONRES_BUILDING,
    });
    // Acceptăm ambele rezultate: tranziție (warning) sau strict (blocking)
    // în funcție de data de rulare a testului în viitor
    expect(["warning", "blocking"]).toContain(r.severity);
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
