import { useMemo } from "react";
import { VENTILATION_TYPES } from "../data/constants.js";
import { ELEMENT_TYPES } from "../data/building-catalog.js";
import { calcOpaqueR } from "../calc/opaque.js";
import { calcMonthlyISO13790 } from "../calc/iso13790.js";
import { calcHourlyISO52016 } from "../calc/hourly.js";
import { generateTMY } from "../calc/weather.js";

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
      const { u } = calcOpaqueR(el.layers, el.type);
      const elType = ELEMENT_TYPES.find(t => t.id === el.type);
      // Multi-zonă: τ dinamic pe baza temperaturilor zonelor adiacente
      const tIntEnv = parseFloat(heating.theta_int) || 20;
      const tExtEnv = selectedClimate?.theta_e ?? -15;
      let tau = elType ? elType.tau : 1;
      if (tIntEnv !== tExtEnv) {
        if (el.type === "PB" || el.type === "PS") {
          tau = (tIntEnv - (parseFloat(heating.tBasement) || 10)) / (tIntEnv - tExtEnv);
        } else if (el.type === "PP") {
          tau = (tIntEnv - (parseFloat(heating.tAttic) || 5)) / (tIntEnv - tExtEnv);
        } else if (el.type === "PR") {
          tau = (tIntEnv - (parseFloat(heating.tStaircase) || 15)) / (tIntEnv - tExtEnv);
        }
      }
      tau = Math.max(0, Math.min(1, tau));
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

    // Punți termice
    let bridgeLoss = 0;
    thermalBridges.forEach(b => {
      bridgeLoss += (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0);
    });
    totalHeatLoss += bridgeLoss;

    // Ventilare — folosim n50 dacă e disponibil, altfel n=0.5 h-1
    const n50 = parseFloat(building.n50) || 4.0;
    const e_shield = 0.07;
    const n_inf = n50 * e_shield;
    const n = Math.max(0.5, n_inf);
    const ventType = VENTILATION_TYPES.find(v => v.id === ventilation.type);
    const hrEta = ventType?.hasHR
      ? (ventilation.hrEfficiency ? parseFloat(ventilation.hrEfficiency) / 100 : ventType.hrEta || 0)
      : 0;
    const ventLoss = 0.34 * n * volume * (1 - hrEta);
    const totalLossWithVent = totalHeatLoss + ventLoss;
    const G = volume > 0 ? totalLossWithVent / volume : 0;

    return { totalHeatLoss, totalArea, bridgeLoss, ventLoss, G, volume, hrEta };
  }, [
    opaqueElements, glazingElements, thermalBridges,
    building.volume, building.perimeter, building.n50,
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
    return calcMonthlyISO13790({
      G_env: envelopeSummary.totalHeatLoss,
      V, Au, climate: selectedClimate,
      theta_int: parseFloat(heating.theta_int) || 20,
      glazingElements, shadingFactor: building.shadingFactor,
      hrEta: hr, category: building.category,
      n50: building.n50, structure: building.structure,
    });
  }, [
    envelopeSummary, selectedClimate,
    building, heating.theta_int, glazingElements, ventilation,
  ]);

  // ─── ISO 52016-1 Hourly calculation (using generated TMY) ───
  const hourlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate?.temp_month || !selectedClimate?.lat) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au) return null;
    const tmy = generateTMY(selectedClimate.temp_month, selectedClimate.lat);
    if (!tmy) return null;
    const V = parseFloat(building.volume) || 0;
    const H_tr = envelopeSummary.totalHeatLoss || (envelopeSummary.G * V);
    const n_ach = parseFloat(building.n50) > 0 ? parseFloat(building.n50) / 20 : 0.5;
    const H_ve = 0.34 * n_ach * V;
    const C_m = Au * 165000;
    const Q_sol_on_building = tmy.Q_sol_horiz.map(g => g * Au * 0.03);
    return calcHourlyISO52016({
      T_ext: tmy.T_ext, Au, H_tr, H_ve, C_m,
      theta_int_set_h: parseFloat(heating.theta_int) || 20,
      theta_int_set_c: 26,
      Q_int: null,
      Q_sol: Q_sol_on_building,
    });
  }, [
    envelopeSummary, selectedClimate,
    building.areaUseful, building.volume, building.n50, heating.theta_int,
  ]);

  return { envelopeSummary, monthlyISO, hourlyISO };
}
