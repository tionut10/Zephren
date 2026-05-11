/**
 * thermal-bridges-point-filter.test.js — audit-mai2026 F1 P0 fix
 *
 * Verifică că intrările `bridge_type:"point"` din catalogul de punți termice:
 *   1. sunt excluse implicit din `getCatalogByCategory()` (catalog liniar UI)
 *   2. sunt returnate de `getPointCatalog()` (catalog punctual UI)
 *   3. produc `psiL_dyn = 0` cu warning în `calcDynamicBridges()` dacă sunt
 *      adăugate accidental în lista liniară `thermalBridges` (prevenire bug
 *      ψ × L aplicat la χ punctual cu unități greșite).
 *
 * Ref: SR EN ISO 14683:2017 §8.1 (Ψ × L liniar) vs §8.3 (Σ χ × N punctual).
 */

import { describe, it, expect } from "vitest";
import {
  getCatalogByCategory,
  getPointCatalog,
  calcDynamicBridges,
} from "../thermal-bridges-dynamic.js";

describe("audit-mai2026 F1 — filtrare bridge_type:point", () => {
  it("getCatalogByCategory() exclude implicit intrările bridge_type=point", () => {
    const cat = getCatalogByCategory();
    const allEntries = Object.values(cat).flat();
    const pointEntries = allEntries.filter(e => e.bridge_type === "point");
    expect(pointEntries.length).toBe(0);
  });

  it("getCatalogByCategory({ includePoint: true }) include și punctuale", () => {
    const catLinear = getCatalogByCategory();
    const catAll = getCatalogByCategory({ includePoint: true });
    const linearCount = Object.values(catLinear).flat().length;
    const allCount = Object.values(catAll).flat().length;
    expect(allCount).toBeGreaterThan(linearCount);
  });

  it("getPointCatalog() returnează DOAR intrările cu bridge_type=point", () => {
    const points = getPointCatalog();
    expect(points.length).toBeGreaterThan(0);
    points.forEach(p => {
      expect(p.bridge_type).toBe("point");
      expect(p.unit).toBe("W/K");
    });
  });

  it("calcDynamicBridges nu aplică ψ × L pentru intrări bridge_type=point (psiL_dyn=0 + warning)", () => {
    const fakeBridge = {
      cat: "Elemente punctuale (chi)",
      desc: "Diblu metalic pentru izolație",
      psi: 0.002, // unitate W/K, NU W/(m·K)
      length: 50, // dacă engine-ul ar aplica ψ×L: 0.002 × 50 = 0.1 W/K — eronat dimensional
      bridge_type: "point",
    };
    const [result] = calcDynamicBridges([fakeBridge], []);
    expect(result.psiL_dyn).toBe(0);
    expect(result.isPointBridge).toBe(true);
    expect(result.warning).toBeTruthy();
  });

  it("calcDynamicBridges aplică normal ψ × L pentru intrări liniare (control)", () => {
    const fakeBridge = {
      cat: "Joncțiuni pereți",
      desc: "Colț exterior",
      psi: 0.05,
      length: 12,
    };
    const [result] = calcDynamicBridges([fakeBridge], []);
    expect(result.psiL_dyn).toBeGreaterThan(0);
    expect(result.isPointBridge).toBeFalsy();
  });
});
