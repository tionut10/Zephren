/**
 * sri-auto-map.js — Mapare automată controale instalații → nivele SRI.
 *
 * Scopul: să elimine hardcoded-ul `{pid:60, termostat:30, else:10}` din
 * CpeAnexa.jsx, înlocuindu-l cu calcul SRI conform ISO 52120-1:2022 pe baza
 * controalelor deja selectate în building/heating/cooling/ventilation/lighting
 * + setupurile de regenerabile și BACS.
 *
 * Nu este un înlocuitor pentru selectorul complet SRI (UI dedicat pe 9 domenii
 * × 4 niveluri cu funcționalitate individuală), ci o „pre-populare" rezonabilă
 * care permite raportarea CPE fără workflow separat.
 *
 * Sprint 17 (18 apr 2026).
 */

import { calculateSRI, getDefaultSelections } from "./sri-indicator.js";

/**
 * Mapare heating.control → nivel H1 (emitere) + H2 (generare).
 */
function mapHeatingLevels(heating) {
  const ctrl = heating?.control || "manual";
  const map = {
    manual:       { H1: 0, H2: 0, H3: 0, H4: 0, H5: 0, H6: 0 },
    timer:        { H1: 1, H2: 1, H3: 1, H4: 1, H5: 0, H6: 1 },
    termostat:    { H1: 2, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 },
    thermostat:   { H1: 2, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 }, // alias
    programare:   { H1: 2, H2: 2, H3: 1, H4: 2, H5: 1, H6: 1 },
    pid:          { H1: 3, H2: 2, H3: 2, H4: 2, H5: 2, H6: 2 },
    bacs_c:       { H1: 2, H2: 2, H3: 2, H4: 2, H5: 1, H6: 1 },
    bacs_b:       { H1: 3, H2: 2, H3: 2, H4: 2, H5: 2, H6: 2 },
    bacs_a:       { H1: 4, H2: 3, H3: 3, H4: 3, H5: 3, H6: 3 },
  };
  return map[ctrl] || map.manual;
}

function mapCoolingLevels(cooling) {
  if (!cooling?.hasCooling) return { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0 };
  const ctrl = cooling?.control || cooling?.ctrl || "termostat";
  const map = {
    manual:     { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0 },
    termostat:  { C1: 2, C2: 1, C3: 1, C4: 0, C5: 0 },
    programare: { C1: 3, C2: 2, C3: 1, C4: 1, C5: 0 },
    pid:        { C1: 3, C2: 3, C3: 2, C4: 2, C5: 1 },
    bacs_b:     { C1: 3, C2: 2, C3: 2, C4: 2, C5: 1 },
    bacs_a:     { C1: 4, C2: 3, C3: 2, C4: 3, C5: 2 },
  };
  return map[ctrl] || map.termostat;
}

function mapDHWLevels(acm, solarThermal, heatPump) {
  const hasSolar = !!solarThermal?.enabled;
  const hasHP = !!heatPump?.enabled;
  const hasRecirc = !!acm?.hasRecirculation;
  const hasLegionella = !!acm?.legionellaControl;

  return {
    W1: hasHP ? 2 : hasSolar ? 2 : acm?.control === "pid" ? 2 : 1,
    W2: hasRecirc ? (acm?.recircControl === "demand" ? 2 : 1) : 0,
    W3: hasLegionella ? 2 : 1,
    W4: hasSolar && hasHP ? 3 : hasSolar ? 2 : 0,
  };
}

function mapVentilationLevels(ventilation) {
  const type = ventilation?.type || "natural";
  const hasHR = !!ventilation?.hrEfficiency && ventilation.hrEfficiency >= 50;
  const hrEff = ventilation?.hrEfficiency || 0;
  const demandCtrl = ventilation?.control === "co2" || ventilation?.control === "demand";

  const v1 = demandCtrl ? 3 : type === "mechanical" ? 2 : type === "natural" ? 0 : 1;
  const v2 = !hasHR ? 0 : hrEff >= 80 ? 3 : hrEff >= 65 ? 2 : 1;

  return {
    V1: v1,
    V2: v2,
    V3: ventilation?.nightPurge ? 2 : 0,
    V4: ventilation?.humidityControl ? 1 : 0,
    V5: ventilation?.pm25Sensor ? 2 : 0,
  };
}

function mapLightingLevels(lighting) {
  const ctrl = lighting?.control || "manual";
  const map = {
    manual:     { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    timer:      { L1: 1, L2: 0, L3: 0, L4: 1, L5: 0 },
    presence:   { L1: 1, L2: 0, L3: 0, L4: 1, L5: 0 },
    dimming:    { L1: 2, L2: 1, L3: 0, L4: 1, L5: 1 },
    daylight:   { L1: 3, L2: 2, L3: 0, L4: 1, L5: 1 },
    smart:      { L1: 4, L2: 3, L3: 2, L4: 2, L5: 2 },
  };
  return map[ctrl] || map.manual;
}

function mapElectricityLevels({ photovoltaic, building }) {
  const hasPV = !!photovoltaic?.enabled;
  const hasBatt = !!photovoltaic?.battery || !!building?.batteryStorage;
  const evPoints = parseFloat(building?.evChargingPoints) || 0;

  return {
    E1: building?.energyMonitoring ? 3 : 1,
    E2: hasBatt ? 2 : 0,
    E3: hasPV ? (hasBatt ? 3 : 2) : 0,
    E4: 0, // DR e rar în RO rezidențial — default fără
    E5: 0,
    EV1: evPoints > 0 ? (evPoints >= 3 ? 3 : 2) : 0,
    EV2: 0,
    EV3: evPoints > 0 && hasPV ? 2 : 0,
  };
}

function mapMonitoringLevels({ bacsClass, building }) {
  const bacsLvl = { A: 4, B: 3, C: 2, D: 0 }[bacsClass] ?? 0;
  return {
    M1: bacsLvl,
    M2: building?.occupantDashboard ? 2 : 0,
    M3: bacsLvl >= 3 ? 2 : 0,
    M4: 0,
    M5: building?.energyReporting ? 1 : 0,
    M6: bacsLvl >= 4 ? 2 : 0,
  };
}

function mapEnvelopeLevels(building) {
  return {
    DE1: building?.solarShading ? 2 : 0,
    DE2: building?.motorizedWindows ? 2 : 0,
    DE3: building?.thermoMonitoring ? 1 : 0,
  };
}

/**
 * Construiește selecțiile SRI (map serviceId → nivelIndex) din starea clădirii.
 */
export function autoMapSRISelections({
  building = {},
  heating = {},
  cooling = {},
  ventilation = {},
  lighting = {},
  acm = {},
  solarThermal = {},
  photovoltaic = {},
  heatPump = {},
  bacsClass = "D",
}) {
  return {
    ...getDefaultSelections(),
    ...mapHeatingLevels(heating),
    ...mapCoolingLevels(cooling),
    ...mapDHWLevels(acm, solarThermal, heatPump),
    ...mapVentilationLevels(ventilation),
    ...mapLightingLevels(lighting),
    ...mapEnvelopeLevels(building),
    ...mapElectricityLevels({ photovoltaic, building }),
    ...mapMonitoringLevels({ bacsClass, building }),
  };
}

/**
 * Scurtătură: calculează SRI complet din starea clădirii, fără UI dedicat.
 * Returnează obiectul complet din calculateSRI + selecțiile folosite.
 */
export function computeAutoSRI(context) {
  const selections = autoMapSRISelections(context);
  const result = calculateSRI(selections, { residential: ["RI", "RC", "RA"].includes(context.building?.category) });
  return { ...result, selections };
}
