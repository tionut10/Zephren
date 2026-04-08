import { useEffect } from "react";
import {
  HEAT_SOURCES, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY, CONTROL_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL, ACM_CONSUMPTION, LIGHTING_HOURS,
  SOLAR_THERMAL_TYPES, PV_TYPES, PV_INVERTER_ETA,
} from "../data/constants.js";

/**
 * useAutoSync — sincronizare automată parametri dependenți
 * Extras din energy-calc.jsx Sprint 4 refactoring.
 * Grupează toate useEffect-urile care actualizează state derivat
 * (eficiențe, densitate putere, debite, etc.) când tipul de sistem se schimbă.
 */
export function useAutoSync({
  heating, setHeating,
  lighting, setLighting,
  building, setAcm, setLighting: setLightingAlias,
  solarThermal, setSolarThermal,
  photovoltaic, setPhotovoltaic,
}) {
  // ─── Auto-update heating efficiencies when source/emission/distribution/control changes ───
  useEffect(() => {
    setHeating(p => {
      const updates = {};
      const src = HEAT_SOURCES.find(s => s.id === p.source);
      if (src) updates.eta_gen = src.eta_gen.toString();
      const em = EMISSION_SYSTEMS.find(s => s.id === p.emission);
      if (em) updates.eta_em = em.eta_em.toString();
      const d = DISTRIBUTION_QUALITY.find(s => s.id === p.distribution);
      if (d) updates.eta_dist = d.eta_dist.toString();
      const c = CONTROL_TYPES.find(s => s.id === p.control);
      if (c) updates.eta_ctrl = c.eta_ctrl.toString();
      return Object.keys(updates).length > 0 ? { ...p, ...updates } : p;
    });
  }, [heating.source, heating.emission, heating.distribution, heating.control, setHeating]);

  // ─── Auto-update lighting power density and control factor ───
  useEffect(() => {
    setLighting(p => {
      const updates = {};
      const lt = LIGHTING_TYPES.find(t => t.id === p.type);
      if (lt) updates.pDensity = lt.pDensity.toString();
      const lc = LIGHTING_CONTROL.find(c => c.id === p.controlType);
      if (lc) updates.fCtrl = lc.fCtrl.toString();
      return Object.keys(updates).length > 0 ? { ...p, ...updates } : p;
    });
  }, [lighting.type, lighting.controlType, setLighting]);

  // ─── Auto-set default ACM liters and lighting hours by building category ───
  useEffect(() => {
    setAcm(p => ({ ...p, dailyLiters: (ACM_CONSUMPTION[building.category] || 60).toString() }));
    // Use setLightingAlias if provided (same setter, different param name in caller)
    const setL = setLightingAlias || setLighting;
    setL(p => ({ ...p, operatingHours: (LIGHTING_HOURS[building.category] || 2000).toString() }));
  }, [building.category, setAcm, setLighting, setLightingAlias]);

  // ─── Auto-update solar thermal optical efficiency and heat loss coefficient ───
  useEffect(() => {
    const st = SOLAR_THERMAL_TYPES.find(t => t.id === solarThermal.type);
    if (st) setSolarThermal(p => ({ ...p, eta0: st.eta0.toString(), a1: st.a1.toString() }));
  }, [solarThermal.type, setSolarThermal]);

  // ─── Auto-update PV peak power from panel area × module efficiency ───
  useEffect(() => {
    const pv = PV_TYPES.find(t => t.id === photovoltaic.type);
    if (pv && photovoltaic.area) {
      const kWp = (parseFloat(photovoltaic.area) || 0) * pv.eta;
      setPhotovoltaic(p => ({ ...p, peakPower: kWp.toFixed(2) }));
    }
  }, [photovoltaic.type, photovoltaic.area, setPhotovoltaic]);

  // ─── Auto-update inverter efficiency when inverter type changes ───
  useEffect(() => {
    const inv = PV_INVERTER_ETA.find(t => t.id === photovoltaic.inverterType);
    if (inv) setPhotovoltaic(p => ({ ...p, inverterEta: inv.eta.toString() }));
  }, [photovoltaic.inverterType, setPhotovoltaic]);
}
