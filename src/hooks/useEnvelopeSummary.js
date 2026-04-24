import { useMemo } from "react";
import { VENTILATION_TYPES } from "../data/constants.js";
import { ELEMENT_TYPES } from "../data/building-catalog.js";
import { calcOpaqueR } from "../calc/opaque.js";
import { calcMonthlyISO13790, THERMAL_MASS_CLASS, WIND_SHIELD_FACTOR } from "../calc/iso13790.js";
import { calcHourlyISO52016 } from "../calc/hourly.js";
import { resolveTau } from "../calc/tau-dynamic.js";
// Sprint 19 Performanță (24 apr 2026) — cache LRU pentru evitare recalcule identice
import { globalCalcCache } from "../lib/calc-cache.js";

/**
 * useEnvelopeSummary — calcul anvelopă termică + bilanțuri lunare/orare
 * Extras din energy-calc.jsx Sprint 4 refactoring.
 * Conform ISO 13790:2008, ISO 52016-1:2017, ISO 13370:2017.
 *
 * @param {object} params
 * @param {Array}  params.opaqueElements   — elemente opace [{id, type, area, layers}]
 * @param {Array}  params.glazingElements  — vitrajuri [{id, area, u, g, orientation}]
 * @param {Array}  params.thermalBridges   — punți termice [{psi, length}]
 * @param {object} params.building         — date clădire (volume, perimeter, n50, areaUseful, etc.)
 * @param {object} params.heating          — parametri sistem încălzire (theta_int, tBasement, etc.)
 * @param {object} params.ventilation      — parametri ventilare (type, hrEfficiency, airflow)
 * @param {object} params.selectedClimate  — date climatice selectate (theta_e, temp_month, lat, solar)
 *
 * @returns {{ envelopeSummary, monthlyISO, hourlyISO }}
 */
export function useEnvelopeSummary({
  opaqueElements,
  glazingElements,
  thermalBridges,
  pointThermalBridges = [], // Sprint 22 #2 — punți punctuale χ [W/K] × N
  building,
  heating,
  ventilation,
  selectedClimate,
}) {
  // ─── Total envelope summary (H_tr + H_ve, G coefficient) ───
  const envelopeSummary = useMemo(() => {
    const volume = parseFloat(building.volume) || 0;
    if (!volume) return null;
    let totalHeatLoss = 0;
    let totalArea = 0;

    opaqueElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const { u } = calcOpaqueR(el.layers, el.type, el.fastener);
      const elType = ELEMENT_TYPES.find(t => t.id === el.type);
      // Sprint 22 #3 — τ dinamic cu cascadă (Mc 001-2022 Anexa A.9.3):
      //   1. el.theta_u (override per element) → 2. heating.t* (global)
      //   → 3. THETA_U_DEFAULT (Mc 001 Tabel 2.4) → 4. ELEMENT_TYPES.tau static
      const tExtEnv = selectedClimate?.theta_e ?? -15;
      const tauResolved = resolveTau(el, heating, tExtEnv, elType?.tau);
      const tau = tauResolved.tau;
      let uEff = u;
      // ISO 13370 — ground floor types
      if (el.type === "PL") {
        // Slab-on-ground: U_bf = 2λ/(π·B'+d_t) · ln(π·B'/d_t + 1)
        const perim = parseFloat(building.perimeter) || 0;
        const lambda_g = 1.5;
        const d_t = 0.5 + parseFloat(
          el.layers?.reduce((s, l) => {
            const d = (parseFloat(l.thickness) || 0) / 1000;
            return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
          }, 0) || 0
        );
        if (perim > 0 && area > 0) {
          const Bp = area / (0.5 * perim);
          if (Bp < d_t) {
            uEff = lambda_g / (0.457 * Bp + d_t);
          } else {
            uEff = 2 * lambda_g / (Math.PI * Bp + d_t) * Math.log(Math.PI * Bp / d_t + 1);
          }
        }
      } else if (el.type === "PB") {
        // Floor over unheated basement — ISO 13370 §9.4 simplified
        uEff = u * 0.7;
      }
      totalHeatLoss += tau * area * uEff;
      totalArea += area;
    });

    glazingElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const u = parseFloat(el.u) || 0;
      totalHeatLoss += 1.0 * area * u; // tau=1 for windows
      totalArea += area;
    });

    // Punți termice liniare (ψ × L) — SR EN ISO 14683 §8.1
    let bridgeLoss = 0;
    thermalBridges.forEach(b => {
      bridgeLoss += (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0);
    });
    // Sprint 22 #2 — punți termice punctuale (χ × N) — SR EN ISO 14683 §8.3
    let pointBridgeLoss = 0;
    pointThermalBridges.forEach(b => {
      pointBridgeLoss += (parseFloat(b.chi) || 0) * (parseFloat(b.count) || 0);
    });
    bridgeLoss += pointBridgeLoss;
    totalHeatLoss += bridgeLoss;

    // Ventilare — folosim n50 dacă e disponibil, altfel n=0.5 h-1
    // e_shield: factor protecție vânt (ISO 13789 §8.3) — configurat din building.windExposure
    const n50 = parseFloat(building.n50) || 4.0;
    const e_shield = WIND_SHIELD_FACTOR[building.windExposure] || 0.07;
    const n_inf = n50 * e_shield;
    const n = Math.max(0.5, n_inf);
    const ventType = VENTILATION_TYPES.find(v => v.id === ventilation.type);
    const hrEta = ventType?.hasHR
      ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : ventType.hrEta || 0)
      : 0;
    const ventLoss = 0.34 * n * volume * (1 - hrEta);
    const totalLossWithVent = totalHeatLoss + ventLoss;
    const G = volume > 0 ? totalLossWithVent / volume : 0;

    // ─── ISO 52018-1 — H'tr,adj per suprafață anvelopă [W/(m²·K)] ───
    const A_envelope = totalArea > 0 ? totalArea : 1;
    const H_tr_adj_per_A = totalHeatLoss / A_envelope;

    // Sprint 3a (17 apr 2026) — expus opaqueElements/glazingElements pentru cooling-hourly.js
    // Sprint 22 #2 — pointBridgeLoss expus separat pentru rapoarte
    return {
      totalHeatLoss, totalArea, bridgeLoss, pointBridgeLoss, ventLoss, G, volume, hrEta, H_tr_adj_per_A,
      opaqueElements, glazingElements,
    };
  }, [
    opaqueElements, glazingElements, thermalBridges, pointThermalBridges,
    building.volume, building.perimeter, building.n50, building.windExposure,
    ventilation.type, ventilation.hrEfficiency,
    heating.theta_int, heating.tBasement, heating.tAttic, heating.tStaircase,
    selectedClimate,
  ]);

  // ─── ISO 13790 Monthly energy balance ───
  const monthlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const vt = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const hr = vt && vt.hasHR
      ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : vt.hrEta || 0)
      : 0;
    const params = {
      G_env: envelopeSummary.totalHeatLoss,
      V, Au, climate: selectedClimate,
      theta_int: parseFloat(heating.theta_int) || 20,
      glazingElements, shadingFactor: building.shadingFactor,
      hrEta: hr, category: building.category,
      n50: building.n50, structure: building.structure,
    };
    // Sprint 19: cache LRU read-through (evită recalcul identic la re-render memoized)
    const cacheKey = { building, climate: selectedClimate, opaqueElements: [], glazingElements, extras: { kind: "iso13790", params } };
    const cached = globalCalcCache.get(cacheKey);
    if (cached) return cached;
    const result = calcMonthlyISO13790(params);
    if (result) globalCalcCache.set(cacheKey, result);
    return result;
  }, [
    envelopeSummary, selectedClimate,
    building, heating.theta_int, glazingElements, ventilation,
  ]);

  // ─── ISO 52016-1:2017/NA:2023 — Calcul orar 5R1C ───
  const hourlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;

    // Date climatice orare — necesare T_ext[8760]
    const T_ext = selectedClimate.hourlyTemp || null;
    if (!T_ext || T_ext.length !== 8760) return null; // date orare indisponibile

    const C_m = Au * (THERMAL_MASS_CLASS[building.structure] || 165000);
    const vt = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const hr = vt?.hasHR
      ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : vt.hrEta || 0)
      : 0;
    const H_ve_raw = 0.34 * Math.max(0.5, (parseFloat(building.n50) || 4) *
      (WIND_SHIELD_FACTOR[building.windExposure] || 0.07)) * V;
    const H_ve = H_ve_raw * (1 - hr);

    const params = {
      T_ext,
      Au,
      H_tr: envelopeSummary.totalHeatLoss,
      H_ve,
      C_m,
      theta_int_set_h: parseFloat(heating.theta_int) || 20,
      theta_int_set_c: 26,
      Am: Au * 2.5,
    };
    // Sprint 19: cache LRU — calculul orar 8760 iterații e cel mai costisitor (~50-150ms)
    // cheie inclus hash T_ext: fallback pe lungime+primele 3 valori (evită JSON.stringify pe 8760 floats)
    const extHash = T_ext.length + ":" + T_ext[0] + ":" + T_ext[1000] + ":" + T_ext[5000];
    const cacheKey = { building, climate: { ...selectedClimate, _hourlyHash: extHash }, opaqueElements: [], glazingElements: [], extras: { kind: "iso52016", params: { ...params, T_ext: undefined, _hash: extHash } } };
    const cached = globalCalcCache.get(cacheKey);
    if (cached) return cached;
    const result = calcHourlyISO52016(params);
    if (result) globalCalcCache.set(cacheKey, result);
    return result;
  }, [envelopeSummary, selectedClimate, building, heating.theta_int, ventilation]);

  return { envelopeSummary, monthlyISO, hourlyISO };
}
