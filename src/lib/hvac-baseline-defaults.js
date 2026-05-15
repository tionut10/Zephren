// ═══════════════════════════════════════════════════════════════════════════
//  HVAC Baseline Defaults — derivă instalațiile tipice (Pas 3) din yearBuilt+cat
//  Reduce frustrarea auditorului care altfel completează manual sursa încălzirii
//  pentru fiecare șablon aplicat. Logică validată cu Mc 001-2022 + practică RO.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sursa încălzirii tipică per epocă & categorie.
 * Returnează cheile compatibile cu Pas 3 al wizard-ului (vezi Step3Installations).
 */
const HEAT_SOURCE_BY_EPOCH = {
  // Rezidențial individual
  RI: [
    { maxYear: 1989, source: "wood_stove",        fuel: "wood",         distribution: "stove_local" },
    { maxYear: 2007, source: "boiler_gas",        fuel: "gas",          distribution: "radiators_steel" },
    { maxYear: 2018, source: "boiler_condensing", fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "heat_pump_air",     fuel: "electricity",  distribution: "underfloor_heating" },
  ],
  // Rezidențial colectiv (blocuri)
  RC: [
    { maxYear: 1989, source: "district_heating",       fuel: "district",     distribution: "radiators_cast_iron" },
    { maxYear: 2007, source: "district_heating",       fuel: "district",     distribution: "radiators_steel" },
    { maxYear: 2018, source: "boiler_apartment",       fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "heat_pump_centralized",  fuel: "electricity",  distribution: "underfloor_heating" },
  ],
  // Birouri
  BI: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_condensing",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "vrf_system",          fuel: "electricity",  distribution: "vrf_indoor_units" },
  ],
  // Educație (școli, licee, universități)
  ED: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_condensing",   fuel: "gas",          distribution: "radiators_steel" },
    { maxYear: 9999, source: "heat_pump_air_water", fuel: "electricity",  distribution: "underfloor_heating" },
  ],
  // Grădinițe / creșe
  GR: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_condensing",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "heat_pump_air_water", fuel: "electricity",  distribution: "underfloor_heating" },
  ],
  // Spitale (24/7, blocuri operator critice)
  SPA_H: [
    { maxYear: 1989, source: "district_heating",     fuel: "district",     distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_central_gas",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "chiller_heat_pump",    fuel: "electricity",  distribution: "ahu_centralized" },
  ],
  // Clinici / centre medicale (8-14h funcționare)
  CL: [
    { maxYear: 2000, source: "boiler_central_gas",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "vrf_system",           fuel: "electricity",  distribution: "vrf_indoor_units" },
  ],
  // Comerț (magazine, supermarket, mall)
  CO: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2005, source: "split_ac",            fuel: "electricity",  distribution: "split_indoor_units" },
    { maxYear: 9999, source: "rooftop_unit",        fuel: "electricity",  distribution: "duct_air" },
  ],
  // Hoteluri
  HO: [
    { maxYear: 1989, source: "district_heating",       fuel: "district",     distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_central_gas",     fuel: "gas",          distribution: "fan_coil_4tube" },
    { maxYear: 9999, source: "chiller_heat_pump",      fuel: "electricity",  distribution: "fan_coil_4tube" },
  ],
  // Industrial / hale
  IN: [
    { maxYear: 1989, source: "radiant_gas_heater",  fuel: "gas",          distribution: "radiant_overhead" },
    { maxYear: 2018, source: "warm_air_unit",       fuel: "gas",          distribution: "warm_air_overhead" },
    { maxYear: 9999, source: "heat_pump_air_air",   fuel: "electricity",  distribution: "warm_air_overhead" },
  ],
  // Administrative
  AD: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_condensing",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "vrf_system",          fuel: "electricity",  distribution: "vrf_indoor_units" },
  ],
  // Servicii / agrement
  SA: [
    { maxYear: 1989, source: "boiler_central_old",  fuel: "gas",          distribution: "radiators_cast_iron" },
    { maxYear: 2010, source: "boiler_condensing",   fuel: "gas",          distribution: "radiators_panel" },
    { maxYear: 9999, source: "heat_pump_air_water", fuel: "electricity",  distribution: "underfloor_heating" },
  ],
};

/** ACM (apă caldă menajeră) tipică per epocă & categorie. */
function inferAcmSource(yearBuilt, category) {
  if (category === "RC" && yearBuilt < 1990) return "district_heating_acm";
  if (category === "SPA_H" || category === "HO") return yearBuilt >= 2018 ? "heat_pump_acm" : "central_boiler_acm";
  if (category === "RI" && yearBuilt < 1990) return "wood_boiler_acm";
  if (yearBuilt >= 2018) return "instant_gas_or_hp_acm";
  if (yearBuilt >= 2000) return "gas_boiler_acm";
  return "electric_boiler_acm";
}

/** Ventilare: naturală pentru pre-2010, mecanică simplă/dublă-flux pentru post-2018 nZEB. */
function inferVentilation(yearBuilt, category) {
  if (yearBuilt >= 2018 && (category === "ED" || category === "GR")) return "vmc_double_flow_co2";
  if (yearBuilt >= 2018) return "vmc_double_flow_hr";
  if (yearBuilt >= 2010 && ["BI", "CL", "HO", "SPA_H"].includes(category)) return "vmc_simple_flow";
  return "natural";
}

/** Cooling: adaugat doar la categoriile/erele care au tipic AC. */
function inferCooling(yearBuilt, category) {
  if (["IN"].includes(category)) return "none";
  if (category === "RI" && yearBuilt < 2010) return "none";
  if (category === "RC" && yearBuilt < 2010) return "none";
  if (yearBuilt >= 2018) return "heat_pump_reversible";
  if (yearBuilt >= 2005) return "split_ac";
  return "none";
}

/**
 * Returnează configurația HVAC implicită pentru un șablon, derivată din
 * yearBuilt + categorie. Dacă șablonul are deja `hvacBaseline` setat manual,
 * acel obiect se returnează intact (override-uri pentru cazuri speciale:
 * piscina, frig industrial, biserică tradițională etc.).
 */
export function getHvacBaselineFor(template) {
  if (template?.hvacBaseline) return template.hvacBaseline;
  const yearBuilt = parseInt(template?.building?.yearBuilt) || 1985;
  const cat = template?.cat || template?.building?.category || "RI";
  const epochs = HEAT_SOURCE_BY_EPOCH[cat] || HEAT_SOURCE_BY_EPOCH.RI;
  const heat = epochs.find(e => yearBuilt <= e.maxYear) || epochs[epochs.length - 1];
  return {
    heatSource: heat.source,
    fuel: heat.fuel,
    distribution: heat.distribution,
    acm: inferAcmSource(yearBuilt, cat),
    ventilation: inferVentilation(yearBuilt, cat),
    cooling: inferCooling(yearBuilt, cat),
  };
}

/** Etichete RO pentru afișare în UI/tooltip. */
export const HVAC_LABELS = {
  // Heat sources
  wood_stove:           "Sobă lemn",
  boiler_gas:           "Centrală gaz",
  boiler_condensing:    "Centrală condensare",
  boiler_central_old:   "Centrală termică gaz veche",
  boiler_central_gas:   "Centrală termică gaz",
  boiler_apartment:     "Centrală apartament",
  district_heating:     "Termoficare RADET/CAF",
  heat_pump_air:        "Pompă căldură aer-aer",
  heat_pump_air_water:  "Pompă căldură aer-apă",
  heat_pump_centralized:"Pompă căldură centralizată",
  vrf_system:           "VRF/VRV",
  chiller_heat_pump:    "Chiller + pompă căldură",
  rooftop_unit:         "Rooftop unit (RTU)",
  split_ac:             "Split AC",
  radiant_gas_heater:   "Radianți gaz",
  warm_air_unit:        "Aerotermă gaz",
  heat_pump_air_air:    "Pompă căldură aer-aer",
  // Distribution
  stove_local:          "Sobă locală",
  radiators_cast_iron:  "Radiatori fontă",
  radiators_steel:      "Radiatori oțel",
  radiators_panel:      "Radiatori panou",
  underfloor_heating:   "Încălzire pardoseală",
  vrf_indoor_units:     "Unități interne VRF",
  ahu_centralized:      "AHU centralizat",
  fan_coil_4tube:       "Ventiloconvectoare 4-tub",
  split_indoor_units:   "Unități interne split",
  duct_air:             "Aer prin tubulatură",
  radiant_overhead:     "Radianți plafonieri",
  warm_air_overhead:    "Aer cald plafonier",
  // ACM
  wood_boiler_acm:        "Boiler lemn",
  electric_boiler_acm:    "Boiler electric",
  gas_boiler_acm:         "Boiler gaz",
  instant_gas_or_hp_acm:  "Instant gaz / HP",
  central_boiler_acm:     "Boiler centralizat",
  heat_pump_acm:          "Pompă căldură ACM",
  district_heating_acm:   "ACM termoficare",
  // Ventilation
  natural:                "Naturală",
  vmc_simple_flow:        "VMC simplu flux",
  vmc_double_flow_hr:     "VMC dublu flux + recuperare",
  vmc_double_flow_co2:    "VMC dublu flux + senzor CO₂",
  // Cooling
  none:                   "Fără răcire",
  heat_pump_reversible:   "Pompă căldură reversibilă",
  // Fuels
  wood:        "Lemn",
  gas:         "Gaz natural",
  electricity: "Electricitate",
  district:    "Termoficare",
};

/** Returnează un rezumat scurt 1-linie pentru tooltip. */
export function summarizeHvac(hvac) {
  if (!hvac) return "—";
  const heat = HVAC_LABELS[hvac.heatSource] || hvac.heatSource;
  const fuel = HVAC_LABELS[hvac.fuel] || hvac.fuel;
  return `${heat} (${fuel})`;
}
