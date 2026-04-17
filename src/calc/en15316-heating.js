// ═══════════════════════════════════════════════════════════════
// EN 15316 — SERIA COMPLETĂ SISTEME ÎNCĂLZIRE
// ═══════════════════════════════════════════════════════════════
// EN 15316-1:2017   — Cadru general (structură calcul)
// EN 15316-2:2017   — Emisie (corpuri de încălzire)
// EN 15316-3:2017   — Distribuție (rețea conducte)
// EN 15316-4-1:2017 — Generare: combustie (cazane gaz/motorină/GPL)
// EN 15316-4-2:2017 — Generare: pompe de căldură
// EN 15316-4-3:2017 — Generare: sisteme solare termice
// EN 15316-4-4:2017 — Generare: cogenerare (CHP)
// EN 15316-4-5:2017 — Generare: termoficare (district heating)
// EN 15316-4-6:2017 — Generare: sisteme fotovoltaice (PV)
// EN 15316-4-7:2017 — Generare: biomasă (stuf, lemne, peleți)
// EN 15316-4-8:2017 — Generare: sisteme electrice directe
// EN 15316-5:2017   — Stocare energie termică
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// EN 15316-2 — EMISIE (corpuri de încălzire)
// Pierderi de emisie la transferul căldurii în spațiu
// ═══════════════════════════════════════════════════════════════

// Factori eficiență emisie per tip corp de încălzire — EN 15316-2 Tab.5
export const EMISSION_EFFICIENCY = {
  radiator_clasic:     { eta: 0.87, label: "Radiator clasic din fontă",           control: "manual" },
  radiator_otel:       { eta: 0.90, label: "Radiator oțel cu suprafață plană",    control: "manual" },
  radiator_aluminiu:   { eta: 0.93, label: "Radiator aluminiu",                   control: "termostat" },
  convector:           { eta: 0.88, label: "Convector (natural/forțat)",           control: "termostat" },
  pardoseala:          { eta: 0.96, label: "Încălzire în pardoseală",              control: "termostat" },
  perete:              { eta: 0.94, label: "Încălzire în perete",                  control: "termostat" },
  plafon:              { eta: 0.90, label: "Încălzire în tavan (radiantă)",        control: "termostat" },
  aeroterma:           { eta: 0.85, label: "Aerotermă / ventiloconvector",         control: "termostat" },
  soba_teracota:       { eta: 0.80, label: "Sobă teracotă (inerție mare)",         control: "manual" },
  soba_metalica:       { eta: 0.75, label: "Sobă metalică",                        control: "manual" },
  plinta_radianta:     { eta: 0.92, label: "Plintă radiantă",                      control: "termostat" },
};

// Factori corecție control emisie — EN 15316-2 Tab.6
export const CONTROL_EMISSION_FACTOR = {
  manual:       1.06, // fără control automat — supraîncălzire frecventă
  termostat:    1.00, // termostat ON/OFF pe corp
  prop_PI:      0.97, // reglaj proporțional/PI pe radiator
  predictiv:    0.94, // control predictiv (BACS clasa A)
  zona_multi:   0.96, // multi-zonă cu termostate individuale
};

/**
 * Calcul pierderi emisie EN 15316-2
 * @param {number} Q_nd - Necesarul net de încălzire [kWh/an]
 * @param {string} emitterType - Tipul corpului de încălzire
 * @param {string} controlType - Tipul de control
 * @param {number} heightRoom - Înălțime medie cameră [m]
 * @returns {object} Pierderi emisie și necesarul la distribuție
 */
export function calcEmissionLoss(Q_nd, emitterType = "radiator_otel", controlType = "termostat", heightRoom = 2.7) {
  const emitter = EMISSION_EFFICIENCY[emitterType] || EMISSION_EFFICIENCY.radiator_otel;
  const f_ctrl = CONTROL_EMISSION_FACTOR[controlType] || CONTROL_EMISSION_FACTOR.termostat;

  // Corecție pentru înălțime cameră > 3m (stratificare)
  const f_height = heightRoom > 3 ? 1 + 0.02 * (heightRoom - 3) : 1.0;

  const eta_emission = emitter.eta / (f_ctrl * f_height);
  const Q_em_loss = Q_nd * (1 / eta_emission - 1);
  const Q_to_distribution = Q_nd + Q_em_loss;

  return {
    emitterType, emitterLabel: emitter.label,
    controlType, controlFactor: f_ctrl,
    heightFactor: Math.round(f_height * 1000) / 1000,
    eta_emission: Math.round(eta_emission * 1000) / 1000,
    Q_nd_kWh: Math.round(Q_nd),
    Q_em_loss_kWh: Math.round(Q_em_loss),
    Q_to_distribution_kWh: Math.round(Q_to_distribution),
    loss_pct: Math.round((1 - eta_emission) * 100),
    reference: "SR EN 15316-2:2017 Tab.5-6",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-3 — DISTRIBUȚIE (rețea conducte încălzire)
// Pierderi termice din conductele de distribuție
// ═══════════════════════════════════════════════════════════════

// Pierderi lineare per metru conductă [W/(m·K)] — EN 15316-3 Tab.7
export const PIPE_HEAT_LOSS = {
  neizolat_interior:    { label: "Conductă neizolată în spațiu încălzit",   q_lin: 0.20 },
  neizolat_exterior:    { label: "Conductă neizolată în spațiu neîncălzit", q_lin: 0.45 },
  izolat_20mm:          { label: "Izolat 20mm (standard)",                  q_lin: 0.12 },
  izolat_30mm:          { label: "Izolat 30mm (îmbunătățit)",               q_lin: 0.08 },
  izolat_50mm:          { label: "Izolat 50mm+ (superior)",                 q_lin: 0.05 },
  preizolat_subteran:   { label: "Preizolat subteran (district heating)",   q_lin: 0.03 },
};

// Eficiență pompă de circulație — EN 15316-3 Tab.10
export const PUMP_EFFICIENCY = {
  veche_neregulata: { eta: 0.15, label: "Pompă veche, neregulată (constantă)", W_specific: 0.80 },
  standard:         { eta: 0.30, label: "Pompă standard regulată treptat",     W_specific: 0.50 },
  variabila:        { eta: 0.45, label: "Pompă cu turație variabilă (VSD)",     W_specific: 0.30 },
  iee_sub_023:      { eta: 0.55, label: "Pompă IEE < 0.23 (eficiență max)",    W_specific: 0.20 },
};

/**
 * Calcul pierderi distribuție EN 15316-3
 * @param {number} Q_em - Necesarul la emisie [kWh/an]
 * @param {object} params - Parametri rețea distribuție
 * @returns {object} Pierderi distribuție + auxiliare pompe
 */
export function calcDistributionLoss(Q_em, params = {}) {
  const {
    pipeLength = 30,          // lungime totală rețea [m]
    pipeType = "izolat_20mm", // tipul izolației
    tSupply = 65,             // temperatură tur [°C]
    tReturn = 45,             // temperatură retur [°C]
    tAmbient = 15,            // temperatură mediu conducte [°C]
    hoursOperation = 4500,    // ore funcționare pe an
    pumpType = "standard",    // tip pompă circulație
  } = params;

  const pipe = PIPE_HEAT_LOSS[pipeType] || PIPE_HEAT_LOSS.izolat_20mm;
  const pump = PUMP_EFFICIENCY[pumpType] || PUMP_EFFICIENCY.standard;

  // Temperatura medie fluid
  const tMean = (tSupply + tReturn) / 2;
  const deltaT = tMean - tAmbient;

  // Pierderi termice conducte [kWh/an]
  const Q_pipe_loss = pipe.q_lin * pipeLength * deltaT * hoursOperation / 1000;

  // Pierderi recuperabile (conducte în spațiu încălzit)
  const isInterior = pipeType.includes("interior");
  const f_recoverable = isInterior ? 0.80 : 0.10; // 80% recuperabile dacă interior
  const Q_recoverable = Q_pipe_loss * f_recoverable;
  const Q_net_pipe_loss = Q_pipe_loss - Q_recoverable;

  // Energie auxiliară pompe [kWh/an]
  const Q_flow_kW = Q_em / (hoursOperation * 1.163 * (tSupply - tReturn)); // debit kW termic
  const W_pump = pump.W_specific * Q_flow_kW * hoursOperation; // kWh/an electric

  const Q_to_generation = Q_em + Q_net_pipe_loss;
  const eta_distribution = Q_em / (Q_to_generation + W_pump);

  return {
    pipeType, pipeLabel: pipe.label,
    pumpType, pumpLabel: pump.label,
    pipeLength, tSupply, tReturn, tAmbient,
    deltaT_K: Math.round(deltaT * 10) / 10,
    Q_pipe_loss_kWh: Math.round(Q_pipe_loss),
    Q_recoverable_kWh: Math.round(Q_recoverable),
    Q_net_pipe_loss_kWh: Math.round(Q_net_pipe_loss),
    W_pump_kWh: Math.round(W_pump),
    Q_to_generation_kWh: Math.round(Q_to_generation),
    eta_distribution: Math.round(eta_distribution * 1000) / 1000,
    loss_pct: Math.round((1 - eta_distribution) * 100),
    reference: "SR EN 15316-3:2017 Tab.7, Tab.10",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-4-1 — GENERARE: CAZANE (combustie gaz/motorină/GPL)
// ═══════════════════════════════════════════════════════════════

// Randamente nominale cazane — EN 15316-4-1 Tab.3
export const BOILER_EFFICIENCY = {
  vechi_fara_cond:    { eta_nom: 0.82, eta_pl: 0.78, label: "Cazan vechi (pre-1990) fără condensare" },
  standard:           { eta_nom: 0.88, eta_pl: 0.85, label: "Cazan standard (1990-2005)" },
  randament_inalt:    { eta_nom: 0.92, eta_pl: 0.90, label: "Cazan randament înalt (2005-2015)" },
  condensare:         { eta_nom: 0.97, eta_pl: 0.98, label: "Cazan cu condensare (post-2015)" },
  condensare_premium: { eta_nom: 0.98, eta_pl: 1.03, label: "Cazan condensare premium (ErP A+)" },
  biomasa_manual:     { eta_nom: 0.75, eta_pl: 0.65, label: "Cazan biomasă alimentare manuală" },
  biomasa_auto:       { eta_nom: 0.88, eta_pl: 0.85, label: "Cazan biomasă peleți (automat)" },
  biomasa_gazeificare:{ eta_nom: 0.92, eta_pl: 0.89, label: "Cazan biomasă gazeificare" },
};

// Pierderi în regim de așteptare — EN 15316-4-1 Tab.5
export const BOILER_STANDBY_LOSS = {
  vechi_fara_cond:    0.030, // 3% din puterea nominală
  standard:           0.020,
  randament_inalt:    0.010,
  condensare:         0.005,
  condensare_premium: 0.003,
  biomasa_manual:     0.040,
  biomasa_auto:       0.015,
  biomasa_gazeificare:0.012,
};

/**
 * Calcul generare cazan EN 15316-4-1
 * @param {number} Q_dist - Necesarul la distribuție [kWh/an]
 * @param {object} params - Parametri cazan
 * @returns {object} Consum final combustibil + pierderi
 */
export function calcBoilerGeneration(Q_dist, params = {}) {
  const {
    boilerType = "condensare",
    nominalPower_kW = 24,     // putere nominală [kW]
    partLoadRatio = 0.35,     // rata medie sarcină parțială
    hoursOperation = 4500,
    hoursStandby = 3760,      // ore în standby = 8760 - ore funcționare
    fuel = "gaz_natural",     // gaz_natural | gpl | motorina | peleti | lemne
  } = params;

  const boiler = BOILER_EFFICIENCY[boilerType] || BOILER_EFFICIENCY.condensare;

  // Randament mediu ponderat (funcționare + sarcină parțială)
  const eta_avg = boiler.eta_nom * partLoadRatio + boiler.eta_pl * (1 - partLoadRatio);

  // Pierderi standby [kWh/an]
  const f_standby = BOILER_STANDBY_LOSS[boilerType] || 0.01;
  const Q_standby = nominalPower_kW * f_standby * hoursStandby;

  // Energie finală la sursă (combustibil)
  const Q_fuel = Q_dist / eta_avg + Q_standby;

  // Energie auxiliară electrică (pompă, ventilator, control)
  const W_aux = boilerType.includes("biomasa") ? nominalPower_kW * 0.02 * hoursOperation :
                nominalPower_kW * 0.005 * hoursOperation; // kWh/an

  return {
    boilerType, boilerLabel: boiler.label,
    nominalPower_kW, fuel,
    eta_nominal: boiler.eta_nom,
    eta_partLoad: boiler.eta_pl,
    eta_average: Math.round(eta_avg * 1000) / 1000,
    partLoadRatio,
    Q_dist_kWh: Math.round(Q_dist),
    Q_standby_kWh: Math.round(Q_standby),
    Q_fuel_kWh: Math.round(Q_fuel),
    W_aux_kWh: Math.round(W_aux),
    eta_generation: Math.round((Q_dist / Q_fuel) * 1000) / 1000,
    reference: "SR EN 15316-4-1:2017 Tab.3, Tab.5",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-4-2 — GENERARE: POMPE DE CĂLDURĂ
// ═══════════════════════════════════════════════════════════════

// COP/SCOP referință per tip sursă — EN 15316-4-2 Tab.4
export const HEAT_PUMP_PERFORMANCE = {
  aer_apa:     { cop_nom: 3.5,  scop: 3.2,  label: "Aer-apă (A7/W35)",   tSource: 7 },
  aer_aer:     { cop_nom: 3.8,  scop: 3.0,  label: "Aer-aer (A7/A20)",   tSource: 7 },
  sol_apa:     { cop_nom: 4.5,  scop: 4.2,  label: "Sol-apă (B0/W35)",   tSource: 0 },
  apa_apa:     { cop_nom: 5.0,  scop: 4.8,  label: "Apă-apă (W10/W35)",  tSource: 10 },
  hibrida_gaz: { cop_nom: 3.2,  scop: 2.8,  label: "Hibridă aer-apă + gaz", tSource: 7 },
};

// Factor corecție COP pentru temperatura de livrare — EN 15316-4-2 Tab.7
export const COP_TEMP_CORRECTION = {
  // Scădere COP per grad peste W35 (referință)
  perDegree: -0.025, // ~2.5% scădere per °C
  refTemp: 35,
};

/**
 * Calcul performanță pompă de căldură EN 15316-4-2
 * @param {number} Q_dist - Necesarul la distribuție [kWh/an]
 * @param {object} params - Parametri pompă de căldură
 * @returns {object} SCOP, consum electric, performanță
 */
export function calcHeatPumpGeneration(Q_dist, params = {}) {
  const {
    hpType = "aer_apa",
    tSupply = 45,           // temperatură tur [°C]
    tSourceAvg = null,      // temperatură medie sursă [°C]
    nominalPower_kW = 12,   // putere termică nominală [kW]
    hasBuffer = true,       // vas tampon / acumulator
    hasBivalent = false,    // sistem bivalent (PC + cazan backup)
    bivalentTemp = -5,      // temperatura sub care pornește backup [°C]
    bivalentShare = 0.15,   // fracție acoperită de backup
    hoursOperation = 4500,
  } = params;

  const hp = HEAT_PUMP_PERFORMANCE[hpType] || HEAT_PUMP_PERFORMANCE.aer_apa;
  const tSource = tSourceAvg !== null ? tSourceAvg : hp.tSource;

  // Corecție COP pentru temperatura tur
  const deltaTsupply = tSupply - COP_TEMP_CORRECTION.refTemp;
  const copCorrected = hp.cop_nom * (1 + COP_TEMP_CORRECTION.perDegree * deltaTsupply);
  const scopCorrected = hp.scop * (1 + COP_TEMP_CORRECTION.perDegree * deltaTsupply);

  // Corecție suplimentară sursă (pentru aer: -2% per °C sub 7°C)
  const deltaTsource = tSource - hp.tSource;
  const scopFinal = Math.max(1.5, scopCorrected * (1 + 0.015 * deltaTsource));

  // Energie acoperită de PC vs backup
  const Q_hp = Q_dist * (1 - (hasBivalent ? bivalentShare : 0));
  const Q_backup = Q_dist * (hasBivalent ? bivalentShare : 0);

  // Consum electric PC
  const W_hp = Q_hp / scopFinal;

  // Pierderi vas tampon
  const Q_buffer_loss = hasBuffer ? nominalPower_kW * 0.005 * 8760 : 0; // kWh/an

  // Auxiliare (ventilator, defrost, pompă sursă, control)
  const W_aux = hpType === "sol_apa" ? nominalPower_kW * 0.03 * hoursOperation :
                hpType === "apa_apa" ? nominalPower_kW * 0.02 * hoursOperation :
                nominalPower_kW * 0.015 * hoursOperation;

  // Energie regenerabilă capturată din mediu
  const Q_renewable = Q_hp * (1 - 1 / scopFinal);

  return {
    hpType, hpLabel: hp.label,
    tSupply, tSource,
    cop_nominal: hp.cop_nom,
    cop_corrected: Math.round(copCorrected * 100) / 100,
    scop_final: Math.round(scopFinal * 100) / 100,
    Q_hp_kWh: Math.round(Q_hp),
    Q_backup_kWh: Math.round(Q_backup),
    W_hp_kWh: Math.round(W_hp),
    W_aux_kWh: Math.round(W_aux),
    Q_buffer_loss_kWh: Math.round(Q_buffer_loss),
    Q_renewable_kWh: Math.round(Q_renewable),
    W_total_electric_kWh: Math.round(W_hp + W_aux),
    eta_generation: Math.round(scopFinal * 100) / 100,
    reference: "SR EN 15316-4-2:2017 Tab.4, Tab.7",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-4-4 — GENERARE: COGENERARE (CHP)
// ═══════════════════════════════════════════════════════════════

// Tipuri instalații CHP — EN 15316-4-4 Tab.3
export const CHP_PERFORMANCE = {
  micro_gaz:      { eta_el: 0.30, eta_th: 0.55, label: "Micro-cogenerare gaz (<50kW)", pMin_kW: 1 },
  mini_gaz:       { eta_el: 0.33, eta_th: 0.52, label: "Mini-cogenerare gaz (50-500kW)", pMin_kW: 50 },
  biogaz:         { eta_el: 0.32, eta_th: 0.50, label: "Cogenerare biogaz",              pMin_kW: 10 },
  biomasa:        { eta_el: 0.20, eta_th: 0.60, label: "Cogenerare biomasă",             pMin_kW: 50 },
  fuel_cell:      { eta_el: 0.45, eta_th: 0.35, label: "Pile de combustibil (SOFC/PEM)", pMin_kW: 1 },
  stirling:       { eta_el: 0.15, eta_th: 0.70, label: "Motor Stirling",                 pMin_kW: 1 },
};

/**
 * Calcul cogenerare EN 15316-4-4
 * @param {number} Q_heat_demand - Cerere termică [kWh/an]
 * @param {object} params - Parametri CHP
 * @returns {object} Producție termică + electrică
 */
export function calcCHPGeneration(Q_heat_demand, params = {}) {
  const {
    chpType = "micro_gaz",
    nominalPower_el_kW = 5,
    hoursOperation = 5000,
  } = params;

  const chp = CHP_PERFORMANCE[chpType] || CHP_PERFORMANCE.micro_gaz;
  const eta_total = chp.eta_el + chp.eta_th;

  // Putere termică nominală
  const nominalPower_th_kW = nominalPower_el_kW * chp.eta_th / chp.eta_el;

  // Producție anuală
  const Q_th_annual = Math.min(nominalPower_th_kW * hoursOperation, Q_heat_demand);
  const Q_el_annual = Q_th_annual * chp.eta_el / chp.eta_th;

  // Combustibil consumat
  const Q_fuel = Q_th_annual / chp.eta_th;

  // Economie de energie primară (PES) — Directiva 2012/27 Art.2(34)
  // PES = 1 - 1 / (η_el/η_ref_el + η_th/η_ref_th)
  const eta_ref_el = 0.40; // referință producere separată electricitate
  const eta_ref_th = 0.90; // referință producere separată căldură
  const PES = 1 - 1 / (chp.eta_el / eta_ref_el + chp.eta_th / eta_ref_th);

  return {
    chpType, chpLabel: chp.label,
    nominalPower_el_kW, nominalPower_th_kW: Math.round(nominalPower_th_kW * 10) / 10,
    eta_el: chp.eta_el, eta_th: chp.eta_th, eta_total: Math.round(eta_total * 100) / 100,
    Q_th_kWh: Math.round(Q_th_annual),
    Q_el_kWh: Math.round(Q_el_annual),
    Q_fuel_kWh: Math.round(Q_fuel),
    PES_pct: Math.round(PES * 100),
    isHighEfficiency: PES >= 0.10, // cogenerare de înaltă eficiență dacă PES ≥ 10%
    reference: "SR EN 15316-4-4:2017 Tab.3 + Directiva 2012/27",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-4-5 — GENERARE: TERMOFICARE (District Heating)
// ═══════════════════════════════════════════════════════════════

// Factori pierderi rețea termoficare — EN 15316-4-5 Tab.2
export const DH_NETWORK_LOSSES = {
  veche_neizolata:   { f_loss: 0.25, label: "Rețea veche, neizolată (pre-1990)" },
  standard:          { f_loss: 0.15, label: "Rețea standard (1990-2010)" },
  moderna:           { f_loss: 0.10, label: "Rețea modernă, preizolată" },
  generatia_4:       { f_loss: 0.06, label: "Rețea generația 4 (low-temp, 50-70°C)" },
  generatia_5:       { f_loss: 0.04, label: "Rețea generația 5 (ultra-low, 35-50°C)" },
};

/**
 * Calcul termoficare EN 15316-4-5
 * @param {number} Q_dist - Necesarul la distribuție [kWh/an]
 * @param {object} params - Parametri termoficare
 * @returns {object} Consum final + pierderi rețea
 */
export function calcDistrictHeating(Q_dist, params = {}) {
  const {
    networkType = "standard",
    substatEta = 0.97,      // randament substație termică
    hasMeter = true,         // contor energie termică
  } = params;

  const dh = DH_NETWORK_LOSSES[networkType] || DH_NETWORK_LOSSES.standard;

  // Energie livrată la substație
  const Q_substation = Q_dist / substatEta;

  // Pierderi rețea (pe partea consumatorului)
  const Q_network_loss = Q_substation * dh.f_loss;

  // Energie totală facturată
  const Q_delivered = Q_substation + Q_network_loss;

  // Auxiliare (pompă internă)
  const W_aux = Q_dist * 0.005; // 0.5% din Q termic

  return {
    networkType, networkLabel: dh.label,
    substatEta, hasMeter,
    Q_dist_kWh: Math.round(Q_dist),
    Q_substation_kWh: Math.round(Q_substation),
    Q_network_loss_kWh: Math.round(Q_network_loss),
    Q_delivered_kWh: Math.round(Q_delivered),
    W_aux_kWh: Math.round(W_aux),
    eta_generation: Math.round((Q_dist / Q_delivered) * 1000) / 1000,
    network_loss_pct: Math.round(dh.f_loss * 100),
    reference: "SR EN 15316-4-5:2017 Tab.2",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-4-8 — GENERARE: SISTEME ELECTRICE DIRECTE
// ═══════════════════════════════════════════════════════════════

// Tipuri sisteme electrice — EN 15316-4-8
export const ELECTRIC_HEATING = {
  convector_electric:  { eta: 1.00, label: "Convector electric",                control: "termostat" },
  pardoseala_electrica:{ eta: 0.99, label: "Pardoseală electrică",              control: "termostat" },
  infrarosu:           { eta: 0.95, label: "Panou infraroșu",                   control: "termostat" },
  acumulator_noapte:   { eta: 0.90, label: "Acumulator nocturn (tari redus)",   control: "program" },
  boiler_electric:     { eta: 0.95, label: "Boiler electric (ACM)",             control: "termostat" },
};

/**
 * Calcul generare electrică directă EN 15316-4-8
 * @param {number} Q_dist - Necesarul la distribuție [kWh/an]
 * @param {string} type - Tipul de încălzire electrică
 * @returns {object} Consum electric + performanță
 */
export function calcElectricHeating(Q_dist, type = "convector_electric") {
  const sys = ELECTRIC_HEATING[type] || ELECTRIC_HEATING.convector_electric;
  const W_electric = Q_dist / sys.eta;

  return {
    type, label: sys.label,
    eta: sys.eta,
    Q_dist_kWh: Math.round(Q_dist),
    W_electric_kWh: Math.round(W_electric),
    // Factor energie primară electric aplicat în hook-uri (useInstallationSummary / useRenewableSummary)
    note: "fP_nren electricitate: 2.00 (NA:2023 Tab A.16 — implicit) sau 2.62 (Tab 5.17 legacy — toggle)",
    reference: "SR EN 15316-4-8:2017 + SR EN ISO 52000-1/NA:2023",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-5 — STOCARE ENERGIE TERMICĂ
// ═══════════════════════════════════════════════════════════════

/**
 * Calcul pierderi stocare EN 15316-5
 * @param {object} params - Parametri stocare
 * @returns {object} Pierderi stocare anuale
 */
export function calcThermalStorage(params = {}) {
  const {
    volume_L = 500,           // volum acumulator [L]
    insulationClass = "B",    // A (premium) / B (standard) / C (slab)
    tStorage = 60,            // temperatura stocată [°C]
    tAmbient = 20,            // temperatura ambientală [°C]
    storageType = "buffer",   // buffer (vas tampon) / dhw (boiler ACM) / combi
  } = params;

  // Factor izolație
  const insulFactor = insulationClass === "A" ? 0.45 : insulationClass === "B" ? 0.70 : 1.00;

  // Pierderi standby [kWh/24h] — EN 50440 + EN 15316-5
  const q_standby_24h = (0.45 * Math.pow(volume_L, 0.5) + 0.007 * volume_L) * insulFactor;

  // Corecție temperatură
  const deltaT = tStorage - tAmbient;
  const deltaTref = 45; // referință EN 50440 (65-20°C)
  const q_standby_corrected = q_standby_24h * (deltaT / deltaTref);

  // Pierderi anuale
  const Q_storage_loss = q_standby_corrected * 365;

  // Clasă energetică EU (EN 50440 / Reg. 812/2013)
  const energyClass = q_standby_24h < 1.5 ? "A+" :
                      q_standby_24h < 2.5 ? "A" :
                      q_standby_24h < 4.0 ? "B" :
                      q_standby_24h < 6.0 ? "C" :
                      q_standby_24h < 8.0 ? "D" : "E";

  return {
    volume_L, insulationClass, tStorage, tAmbient, storageType,
    q_standby_24h: Math.round(q_standby_corrected * 100) / 100,
    Q_storage_loss_kWh: Math.round(Q_storage_loss),
    energyClass,
    reference: "SR EN 15316-5:2017 + EN 50440 (ecodesign)",
  };
}


// ═══════════════════════════════════════════════════════════════
// EN 15316-1 — CALCUL INTEGRAT SISTEM COMPLET ÎNCĂLZIRE
// Lanț: Emisie → Distribuție → Generare → Stocare
// ═══════════════════════════════════════════════════════════════

/**
 * Calcul integrat lanț energetic complet EN 15316
 * @param {number} Q_nd - Necesarul net de încălzire [kWh/an]
 * @param {object} config - Configurare sistem complet
 * @returns {object} Rezultate per subsistem + global
 */
export function calcFullHeatingSystem(Q_nd, config = {}) {
  if (!Q_nd || Q_nd <= 0) return null;

  const {
    emission = {},
    distribution = {},
    generation = {},
    storage = {},
  } = config;

  // 1. EMISIE (EN 15316-2)
  const emResult = calcEmissionLoss(
    Q_nd,
    emission.emitterType || "radiator_otel",
    emission.controlType || "termostat",
    emission.heightRoom || 2.7
  );

  // 2. DISTRIBUȚIE (EN 15316-3)
  const distResult = calcDistributionLoss(emResult.Q_to_distribution_kWh, distribution);

  // 3. STOCARE (EN 15316-5) — dacă există
  const hasStorage = storage.volume_L > 0;
  const storResult = hasStorage ? calcThermalStorage(storage) : null;
  const Q_at_gen = distResult.Q_to_generation_kWh + (storResult?.Q_storage_loss_kWh || 0);

  // 4. GENERARE (EN 15316-4-x)
  let genResult;
  const genType = generation.type || "boiler";
  switch (genType) {
    case "heat_pump":
    case "pompa_caldura":
      genResult = calcHeatPumpGeneration(Q_at_gen, generation);
      break;
    case "chp":
    case "cogenerare":
      genResult = calcCHPGeneration(Q_at_gen, generation);
      break;
    case "district_heating":
    case "termoficare":
      genResult = calcDistrictHeating(Q_at_gen, generation);
      break;
    case "electric":
    case "electric_direct":
      genResult = calcElectricHeating(Q_at_gen, generation.electricType);
      break;
    default:
      genResult = calcBoilerGeneration(Q_at_gen, generation);
      break;
  }

  // 5. EFICIENȚĂ GLOBALĂ SISTEM
  const Q_final = genResult.Q_fuel_kWh || genResult.W_electric_kWh ||
                  genResult.W_hp_kWh || genResult.Q_delivered_kWh || Q_at_gen;
  const W_aux_total = (distResult.W_pump_kWh || 0) +
                      (genResult.W_aux_kWh || 0) +
                      (genResult.W_hp_kWh ? 0 : 0); // evitare dublare la PC
  const eta_global = Q_nd / (Q_final + W_aux_total);

  return {
    // Subsisteme
    emission: emResult,
    distribution: distResult,
    storage: storResult,
    generation: genResult,

    // Totale
    Q_nd_kWh: Math.round(Q_nd),
    Q_final_kWh: Math.round(Q_final),
    W_aux_total_kWh: Math.round(W_aux_total),
    eta_global: Math.round(eta_global * 1000) / 1000,
    eta_global_pct: Math.round(eta_global * 100),

    // Verdict
    verdict: eta_global >= 0.85 ? "Sistem de încălzire performant" :
             eta_global >= 0.70 ? "Eficiență medie — potențial de îmbunătățire" :
             eta_global >= 0.50 ? "Eficiență scăzută — recomandare modernizare" :
             "Sistem ineficient — necesită înlocuire urgentă",
    color: eta_global >= 0.85 ? "#22c55e" : eta_global >= 0.70 ? "#eab308" :
           eta_global >= 0.50 ? "#f97316" : "#ef4444",
    reference: "SR EN 15316-1:2017 — Calcul integrat sistem încălzire",
  };
}
