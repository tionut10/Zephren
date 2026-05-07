/**
 * service-classes.test.js — Test lock-in pentru SERVICE_CLASSES_DB + getServiceClass
 *
 * Sprint Audit Pas 6+7 V3 (7 mai 2026) — CR-2 fix
 *
 * Aceste teste fixează comportamentul motorului de clasificare per-utilitate
 * (Mc 001-2022 Tab I.1) astfel încât orice modificare viitoare a pragurilor
 * să producă fail-uri vizibile (regresie controlată).
 *
 * Date concrete: cazul Bd. Tomis 287 (apartament RA) cu valorile reale audit
 * 7 mai 2026 — folosit ca regression baseline pentru fix-ul CR-2.
 */
import { describe, it, expect } from "vitest";
import {
  SERVICE_CLASSES_DB,
  getServiceClass,
  CLASS_LABELS,
} from "../energy-classes.js";

describe("SERVICE_CLASSES_DB — Mc 001-2022 Tab I.1 lock-in", () => {
  it("conține toate cele 10 categorii Mc 001-2022", () => {
    const expected = ["RI", "RC", "RA", "BI", "ED", "SA", "HC", "CO", "SP", "AL"];
    expected.forEach((cat) => {
      expect(SERVICE_CLASSES_DB[cat]).toBeDefined();
      expect(typeof SERVICE_CLASSES_DB[cat]).toBe("object");
    });
  });

  it("fiecare categorie are toate cele 5 servicii", () => {
    const services = ["heating", "dhw", "cooling", "ventilation", "lighting"];
    Object.entries(SERVICE_CLASSES_DB).forEach(([cat, svcs]) => {
      services.forEach((svc) => {
        expect(svcs[svc], `${cat}.${svc} lipsă`).toBeDefined();
        expect(Array.isArray(svcs[svc])).toBe(true);
        expect(svcs[svc].length).toBe(7); // 7 praguri (A+, A, B, C, D, E, F) → G = >ultimul
      });
    });
  });

  it("pragurile pentru RA rezidențial sunt strict crescătoare", () => {
    const ra = SERVICE_CLASSES_DB.RA;
    Object.entries(ra).forEach(([svc, thresholds]) => {
      for (let i = 1; i < thresholds.length; i++) {
        expect(
          thresholds[i],
          `${svc}: prag ${i} (${thresholds[i]}) <= prag ${i - 1} (${thresholds[i - 1]})`,
        ).toBeGreaterThan(thresholds[i - 1]);
      }
    });
  });

  it("RA ACM (apă caldă) folosește pragurile Mc 001-2022 Tab I.1 [21, 29, 57, 65, 73, 91, 109]", () => {
    expect(SERVICE_CLASSES_DB.RA.dhw).toEqual([21, 29, 57, 65, 73, 91, 109]);
  });

  it("RA Iluminat folosește pragurile Mc 001-2022 Tab I.1 [5, 7, 13, 23, 33, 42, 50]", () => {
    expect(SERVICE_CLASSES_DB.RA.lighting).toEqual([5, 7, 13, 23, 33, 42, 50]);
  });

  it("RA Încălzire folosește pragurile Mc 001-2022 Tab I.1 [30, 42, 84, 150, 217, 271, 325]", () => {
    expect(SERVICE_CLASSES_DB.RA.heating).toEqual([30, 42, 84, 150, 217, 271, 325]);
  });
});

describe("getServiceClass — clasificare per utilitate", () => {
  // ── Test caz REAL audit 7 mai 2026: Bd. Tomis 287 (RA) ──
  // Aceste valori sunt cele care AU CAUZAT bug-ul CR-2 (clase greșite în
  // Anexa 1+2 DOCX). Lock-in pentru a preveni regresia.
  describe("Cazul Bd. Tomis 287 — apartament RA", () => {
    it("ACM 171,8 kWh/m²·an → clasa G (>109) — corectează bug ACM=C", () => {
      expect(getServiceClass(171.8, "dhw", "RA")).toBe("G");
    });

    it("Iluminat 43,2 kWh/m²·an → clasa F (42-50) — corectează bug Iluminat=A+", () => {
      expect(getServiceClass(43.2, "lighting", "RA")).toBe("F");
    });

    it("Încălzire 641,0 kWh/m²·an → clasa G (>325) — comportament corect anterior păstrat", () => {
      expect(getServiceClass(641, "heating", "RA")).toBe("G");
    });

    it("Răcire 0 (apartament fără AC) → clasa A+", () => {
      expect(getServiceClass(0, "cooling", "RA")).toBe("A+");
    });

    it("Ventilare 0 (naturală neorganizată) → clasa A+", () => {
      expect(getServiceClass(0, "ventilation", "RA")).toBe("A+");
    });
  });

  // ── Cazuri sintetice pentru fiecare clasă ──
  describe("acoperă toate cele 8 clase pentru ACM RA", () => {
    const cases = [
      { ep: 0, expected: "A+" },
      { ep: 21, expected: "A+" }, // pragul superior A+
      { ep: 21.1, expected: "A" },
      { ep: 29, expected: "A" },
      { ep: 29.1, expected: "B" },
      { ep: 57, expected: "B" },
      { ep: 57.1, expected: "C" },
      { ep: 65, expected: "C" },
      { ep: 65.1, expected: "D" },
      { ep: 73, expected: "D" },
      { ep: 73.1, expected: "E" },
      { ep: 91, expected: "E" },
      { ep: 91.1, expected: "F" },
      { ep: 109, expected: "F" },
      { ep: 109.1, expected: "G" },
      { ep: 200, expected: "G" },
    ];
    cases.forEach(({ ep, expected }) => {
      it(`ACM ${ep} kWh/m²·an → clasa ${expected}`, () => {
        expect(getServiceClass(ep, "dhw", "RA")).toBe(expected);
      });
    });
  });

  describe("aliase service: acm și acc → dhw", () => {
    it("getServiceClass cu service='acm' → folosește grila dhw", () => {
      expect(getServiceClass(50, "acm", "RA")).toBe(getServiceClass(50, "dhw", "RA"));
    });

    it("getServiceClass cu service='acc' → folosește grila dhw", () => {
      expect(getServiceClass(50, "acc", "RA")).toBe(getServiceClass(50, "dhw", "RA"));
    });
  });

  describe("fallback pentru categorii necunoscute", () => {
    it("categorie necunoscută → folosește AL", () => {
      expect(getServiceClass(50, "heating", "XX_INVALID")).toBe(
        getServiceClass(50, "heating", "AL"),
      );
    });

    it("categorie undefined → folosește AL", () => {
      expect(getServiceClass(50, "heating")).toBe(
        getServiceClass(50, "heating", "AL"),
      );
    });
  });

  describe("validari input", () => {
    it("epValue NaN -> returneaza dash", () => {
      expect(getServiceClass(NaN, "heating", "RA")).toBe("—");
    });

    it("epValue null -> returneaza dash", () => {
      expect(getServiceClass(null, "heating", "RA")).toBe("—");
    });

    it("epValue negativ -> returneaza dash", () => {
      expect(getServiceClass(-10, "heating", "RA")).toBe("—");
    });

    it("service necunoscut -> returneaza dash", () => {
      expect(getServiceClass(50, "INVALID_SERVICE", "RA")).toBe("—");
    });
  });
});

describe("CR-2 regression: payload Python recipe", () => {
  // Lock-in pentru valorile EXACTE care ar fi trimise în payload-ul Python
  // (cls_incalzire, cls_acm etc.) pentru cazul Bd. Tomis 287.
  // Dacă unul dintre aceste teste pică, înseamnă că pragurile Mc 001-2022
  // au fost modificate accidental — verificați impactul în Anexa 1+2 DOCX.
  it("payload cls_* pentru Bd. Tomis 287 (RA, EP=856 G) corespunde Anexa 1+2 corectă", () => {
    const Au = 65;
    // Valori reale instSummary (din audit 7 mai 2026)
    const ep_h_total = 41665; // încălzire 641,0 × Au
    const ep_w_total = 11167; // ACM 171,8 × Au
    const ep_c_total = 0;
    const ep_v_total = 0;
    const ep_l_total = 2808; // iluminat 43,2 × Au

    const ep_h = ep_h_total / Au;
    const ep_w = ep_w_total / Au;
    const ep_c = ep_c_total / Au;
    const ep_v = ep_v_total / Au;
    const ep_l = ep_l_total / Au;

    expect(getServiceClass(ep_h, "heating", "RA")).toBe("G");
    expect(getServiceClass(ep_w, "dhw", "RA")).toBe("G"); // (era „C" în bug)
    expect(getServiceClass(ep_c, "cooling", "RA")).toBe("A+");
    expect(getServiceClass(ep_v, "ventilation", "RA")).toBe("A+");
    expect(getServiceClass(ep_l, "lighting", "RA")).toBe("F"); // (era „A+" în bug)
  });
});
