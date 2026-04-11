/**
 * renewable-systems.js — Sisteme regenerabile și surse de energie
 * Extrase din cercetare: ZEPHREN_RESEARCH_PARAMETRI_CONSTRUCTIVI.md
 * Standarde: EN 15316, EN 15232-1, EN 16798, EN 12464
 * Data: 10 aprilie 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. PANOURI SOLARE TERMICE
// ═══════════════════════════════════════════════════════════════════════════

export const SOLAR_THERMAL_SYSTEMS = [
  {
    id: "ST_FLAT_PLATE",
    label: "Panou solar termic cu placă plană (absorbitor cupru)",
    type: "Plană",
    efficiency: { min: 0.75, max: 0.85, unit: "%" },
    thermal_capacity: "MEDIU",
    market_ro: "ABUNDENT",
    suppliers: ["Viessman", "Bosch", "Ariston", "DRU-Dunkermotoren"],
    price_per_m2_eur: 600,
    standards: ["EN 15316-4-3", "EN 12977"],
    notes: "Standard modern, cost-eficient",
    application: "ACS (apă caldă menajeră), suport încălzire",
  },
  {
    id: "ST_VACUUM_TUBE",
    label: "Panou solar termic - țevi vidate (vacuum tubes)",
    type: "Țevi vidate",
    efficiency: { min: 0.8, max: 0.95, unit: "%" },
    thermal_capacity: "RIDICATĂ",
    market_ro: "MEDIU (import)",
    suppliers: ["Sunrain", "Apricus", "NIBE"],
    price_per_m2_eur: 800,
    standards: ["EN 15316-4-3", "EN 12977"],
    notes: "Performance superioară, cost mai mare",
    application: "ACS + suport încălzire în climă continentală",
  },
  {
    id: "ST_HYBRID",
    label: "Panou hibrid solar termic-fotovoltaic (PVT)",
    type: "Hibrid PVT",
    efficiency_thermal: { min: 0.4, max: 0.6, unit: "%" },
    efficiency_electric: { min: 0.12, max: 0.18, unit: "%" },
    market_ro: "RĂR (foarte nou, pe import)",
    suppliers: ["Sunergy", "DualSun", "Solargis"],
    price_per_m2_eur: 1200,
    standards: ["EN 15316-4-3"],
    notes: "Viitor, dual-funcție în 1m²",
  },

  // ── PANOURI SOLARE TERMICE NOI 2026 ────────────────────────────────────────
  {
    id: "ST_EVACUATED_TUBE",
    label: "Panou solar termic cu tuburi vidate (evacuated tube)",
    type: "Tuburi vidate",
    efficiency: { min: 0.80, max: 0.88, unit: "%" },
    thermal_capacity: "MEDIU-ÎNALT",
    market_ro: "MEDIU (specialist, climat rece)",
    suppliers: ["Viessmann", "Solargis", "Apricus", "Denson"],
    price_per_m2_eur: 850,
    standards: ["EN 15316-4-3", "EN 12975"],
    notes: "Randament maxim, iarnă/nori, cost mare, fiabilitate excepțională",
    application: "ACS + suport încălzire, climat temperat/rece",
  },
  {
    id: "ST_HEAT_PIPE_COLLECTOR",
    label: "Panou solar termic heat-pipe cu absorbant selectiv",
    type: "Heat-pipe",
    efficiency: { min: 0.78, max: 0.85, unit: "%" },
    thermal_capacity: "MEDIU",
    market_ro: "MEDIU (calitate superioară)",
    suppliers: ["Viessmann", "Bosch", "Baxi", "DRU"],
    price_per_m2_eur: 750,
    standards: ["EN 15316-4-3", "EN 12977"],
    notes: "Transfer căldură prin heat-pipe, protecție îngheț automată, fiabil",
    application: "ACS + suport încălzire, clădiri mari",
  },
  {
    id: "ST_INTEGRATED_STORAGE",
    label: "Sistem solar termic integrat cu acumulator 300L",
    type: "Sistem complet",
    efficiency: { min: 0.70, max: 0.78, unit: "%" },
    thermal_capacity: "MEDIU",
    storage_liters: 300,
    market_ro: "MEDIU (soluție plug-and-play)",
    suppliers: ["Viessmann", "Ariston", "Baxi"],
    price_eur: 4500,
    standards: ["EN 15316-4-3", "EN 12977"],
    notes: "Panou + boiler în sistem, instalare rapidă, ideal case unifamiliale",
    application: "ACS, locuințe unifamiliale 3-4 persoane",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. PANOURI FOTOVOLTAICE
// ═══════════════════════════════════════════════════════════════════════════

export const PHOTOVOLTAIC_SYSTEMS = [
  {
    id: "PV_MONOCRYSTALLINE",
    label: "Modul PV monocristalin",
    type: "Monocristalin",
    efficiency: { min: 0.19, max: 0.22, unit: "%" },
    power_per_m2: 190,
    thermal_coefficient: -0.004,
    market_ro: "ABUNDENT",
    suppliers: ["Sunwatt", "Canadian Solar", "JA Solar", "LONGi"],
    price_per_watt_eur: 0.18,
    standards: ["EN 60904", "IEC 61215"],
    notes: "Standard modern, cea mai bună eficiență",
    warranty_years: 25,
  },
  {
    id: "PV_POLYCRYSTALLINE",
    label: "Modul PV policristalin",
    type: "Policristalin",
    efficiency: { min: 0.16, max: 0.19, unit: "%" },
    power_per_m2: 170,
    thermal_coefficient: -0.005,
    market_ro: "ABUNDENT (ieftin)",
    suppliers: ["LONGi", "JinkoSolar", "Trina"],
    price_per_watt_eur: 0.15,
    standards: ["EN 60904", "IEC 61215"],
    notes: "Ieftin, eficiență mai mică, în declin",
  },
  {
    id: "PV_THIN_FILM",
    label: "Modul PV film subțire (CIGS, CdTe)",
    type: "Film subțire",
    efficiency: { min: 0.11, max: 0.16, unit: "%" },
    power_per_m2: 140,
    thermal_coefficient: -0.0025,
    market_ro: "RĂR (pe import, specializat)",
    suppliers: ["First Solar", "Suntech", "CIGS R&D"],
    price_per_watt_eur: 0.12,
    standards: ["EN 60904", "IEC 61646"],
    notes: "Bun pentru temperaturi ridicate, rar",
  },

  // ── MODULE PV NOI 2026 ──────────────────────────────────────────────────────
  {
    id: "PV_TOPCON",
    label: "Modul PV TOPCon (Tunnel Oxide Passivated Contact)",
    type: "TOPCon",
    efficiency: { min: 0.22, max: 0.24, unit: "%" },
    power_per_m2: 230,
    thermal_coefficient: -0.003,
    market_ro: "MEDIU (inovație 2025-2026)",
    suppliers: ["LONGi", "JinkoSolar", "Trina", "Jolywood"],
    price_per_watt_eur: 0.22,
    standards: ["EN 60904", "IEC 61215"],
    notes: "Eficiență înaltă, stabilitate superbă, viitorul PV mainstream",
    warranty_years: 30,
  },
  {
    id: "PV_HJT",
    label: "Modul PV HJT (Heterojunction)",
    type: "Heterojunction",
    efficiency: { min: 0.23, max: 0.25, unit: "%" },
    power_per_m2: 240,
    thermal_coefficient: -0.0025,
    market_ro: "RĂR (inovație premium)",
    suppliers: ["Sunpower", "Enel Green Power", "Kaneka", "Hasloe"],
    price_per_watt_eur: 0.28,
    standards: ["EN 60904", "IEC 61215"],
    notes: "Eficiență maximă, coeficient termic optim, producție costisitoare",
    warranty_years: 35,
  },
  {
    id: "PV_BIFACIAL_STANDARD",
    label: "Modul PV bifață (dual-side) - monocristalin",
    type: "Bifață",
    efficiency: { min: 0.21, max: 0.23, unit: "%" },
    power_per_m2: 215,
    thermal_coefficient: -0.004,
    rear_gain_factor: { min: 0.10, max: 0.25, unit: "%" },
    market_ro: "MEDIU (utility scale, teren)",
    suppliers: ["LONGi", "Trina", "JinkoSolar"],
    price_per_watt_eur: 0.20,
    standards: ["EN 60904", "IEC 61215"],
    notes: "Dual-face: beneficiază de lumina reflectată din spate (teren alb, zăpadă)",
    warranty_years: 25,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. POMPE DE CĂLDURĂ
// ═══════════════════════════════════════════════════════════════════════════

export const HEAT_PUMP_TYPES = [
  {
    id: "HP_AA_STANDARD",
    label: "Pompă de căldură aer-aer (monosplit)",
    type: "Aer-aer",
    cop_heating: { min: 3.0, max: 3.5, unit: "sans-dimension" },
    cop_cooling_eer: { min: 2.8, max: 3.5, unit: "sans-dimension" },
    market_ro: "ABUNDENT",
    suppliers: ["DAIKIN", "LG", "Mitsubishi", "Toshiba", "Panasonic"],
    price_eur: 3000,
    standards: ["EN 15316-4-2", "EN 14511", "EN 13273"],
    application: "Răcire + încălzire pentru clădiri mici",
    notes: "Cost-eficient, reversibilă, zgomot moderat",
  },
  {
    id: "HP_AA_INVERTER",
    label: "Pompă de căldură aer-aer inverter",
    type: "Aer-aer",
    cop_heating: { min: 3.5, max: 4.2, unit: "sans-dimension" },
    cop_cooling_eer: { min: 3.5, max: 4.5, unit: "sans-dimension" },
    market_ro: "ABUNDENT (trend actual)",
    suppliers: ["DAIKIN", "LG", "Mitsubishi", "Panasonic"],
    price_eur: 4500,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Răcire + încălzire, eficient energetic",
    notes: "Performanță superioară, zgomot redus",
  },
  {
    id: "HP_AW_STANDARD",
    label: "Pompă de căldură aer-apă",
    type: "Aer-apă",
    cop_heating: { min: 3.5, max: 4.0, unit: "sans-dimension" },
    capacity_heating_kw: { min: 8, max: 20, unit: "kW" },
    market_ro: "ABUNDENT",
    suppliers: ["NIBE", "Bosch", "Viessman", "Daikin", "Ariston"],
    price_eur: 5000,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Încălzire apă + ACS, sistem central",
    notes: "Standard pentru nZEB, cost moderat",
  },
  {
    id: "HP_AW_INVERTER",
    label: "Pompă de căldură aer-apă inverter",
    type: "Aer-apă",
    cop_heating: { min: 4.0, max: 5.0, unit: "sans-dimension" },
    capacity_heating_kw: { min: 8, max: 20, unit: "kW" },
    market_ro: "ABUNDENT (standard modern)",
    suppliers: ["NIBE", "Bosch", "Daikin", "Panasonic"],
    price_eur: 6500,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "nZEB standard, sistem central",
    notes: "Eficiență maximă, cost mai mare",
  },
  {
    id: "HP_AW_LOW_TEMP",
    label: "Pompă de căldură aer-apă temperatură joasă (≤35°C)",
    type: "Aer-apă",
    cop_heating: { min: 4.0, max: 4.8, unit: "sans-dimension" },
    capacity_heating_kw: { min: 6, max: 18, unit: "kW" },
    market_ro: "MEDIU (specializată)",
    suppliers: ["NIBE", "Bosch Compress", "Viessman"],
    price_eur: 7000,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Pardoseală radiante, nZEB premium",
    notes: "COP ridicat cu pardoseală, ideal pentru nZEB",
  },
  {
    id: "HP_GA_GROUND",
    label: "Pompă de căldură sol-apă (sonde geotermale)",
    type: "Sol-apă",
    cop_heating: { min: 4.5, max: 6.5, unit: "sans-dimension" },
    cop_cooling: { min: 4.0, max: 5.0, unit: "sans-dimension" },
    capacity_heating_kw: { min: 10, max: 30, unit: "kW" },
    market_ro: "MEDIU (cost foraj)",
    suppliers: ["NIBE", "Stiebel Eltron", "Bosch", "Daikin"],
    price_eur: 12000,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Încălzire/răcire centrală, nZEB premium",
    notes: "COP maxim, investiție mare (foraj €4000-8000)",
    installation_cost_remarks: "Foraj 100-200m, €4000-8000",
  },
  {
    id: "HP_GA_HORIZONTAL",
    label: "Pompă de căldură sol-apă (colector orizontal)",
    type: "Sol-apă",
    cop_heating: { min: 3.8, max: 4.5, unit: "sans-dimension" },
    cop_cooling: { min: 3.5, max: 4.2, unit: "sans-dimension" },
    capacity_heating_kw: { min: 8, max: 20, unit: "kW" },
    market_ro: "RĂR (terenuri mari necesare)",
    suppliers: ["NIBE", "Stiebel Eltron", "Bosch"],
    price_eur: 9000,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Teren mare, alternativă foraj",
    notes: "Necesită teren liber 1-2x suprafață clădire",
  },

  // ── POMPE CĂLDURĂ NOI 2026 ──────────────────────────────────────────────────
  {
    id: "HP_AA_QUIET_INVERTER",
    label: "Pompă de căldură aer-aer inverter silencios (< 22dB)",
    type: "Aer-aer",
    cop_heating: { min: 3.8, max: 4.5, unit: "sans-dimension" },
    cop_cooling_eer: { min: 3.8, max: 4.8, unit: "sans-dimension" },
    noise_level_db: 22,
    market_ro: "MEDIU (premium)",
    suppliers: ["Mitsubishi Heavy", "Daikin Ururu", "LG Silence"],
    price_eur: 5500,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Dormitoare, birouri, spații sensibile la zgomot",
    notes: "Compressor special silențios, performanță înaltă, cost premium",
  },
  {
    id: "HP_AW_HYBRID_BOILER",
    label: "Pompă de căldură aer-apă hibridă cu cazan gaz",
    type: "Aer-apă",
    cop_heating: { min: 4.2, max: 5.2, unit: "sans-dimension" },
    capacity_heating_kw: { min: 8, max: 16, unit: "kW" },
    market_ro: "MEDIU (în creștere)",
    suppliers: ["Bosch", "Viessman", "Immergas", "Riello"],
    price_eur: 7500,
    standards: ["EN 15316-4-2", "EN 14511"],
    application: "Tranziție durabilă la nZEB, backup gaz",
    notes: "Control smart: PdC pentru mild, cazan gaz pentru vârf, eficiență maximă",
  },
  {
    id: "HP_GROUND_SONDE_BOREHOLE",
    label: "Pompă de căldură teren-apă cu foraj (80m sonde)",
    type: "Teren-apă",
    cop_heating: { min: 5.0, max: 6.0, unit: "sans-dimension" },
    capacity_heating_kw: { min: 10, max: 25, unit: "kW" },
    market_ro: "MEDIU (teren, condiții)",
    suppliers: ["NIBE", "Bosch", "IVT", "Stiebel Eltron"],
    price_eur: 12000,
    standards: ["EN 15316-4-2", "EN 14511", "EN 15450"],
    application: "Blocuri mari, clădiri instituționale, teren disponibil",
    notes: "COP maxim (5-6), foraj 80-120m, cost instalație ridicat, cost operare minim",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. SISTEME DE BIOMASĂ
// ═══════════════════════════════════════════════════════════════════════════

export const BIOMASS_SYSTEMS = [
  {
    id: "BM_PELLETS_AUTO",
    label: "Cazan peleți - automat (alimentare automată)",
    type: "Peleți",
    efficiency: { min: 0.88, max: 0.92, unit: "%" },
    power_kw: { min: 15, max: 50, unit: "kW" },
    market_ro: "ABUNDENT (trend crescător)",
    suppliers: ["Viessmann", "Hargassner", "Ökofen", "Fröhlich"],
    price_eur: 4000,
    standards: ["EN 15316-5", "EN 303-5"],
    fuel_price_eur_per_ton: 300,
    notes: "Standard modern, comod, cost combustibil mic",
  },
  {
    id: "BM_WOOD_CHIPS",
    label: "Cazan tocătură lemnoasă (G30/G50)",
    type: "Chips",
    efficiency: { min: 0.82, max: 0.88, unit: "%" },
    power_kw: { min: 20, max: 100, unit: "kW" },
    market_ro: "MEDIU (mai pentru industrie)",
    suppliers: ["Fröhlich", "Hargassner", "ÖkoFEN"],
    price_eur: 6000,
    standards: ["EN 15316-5", "EN 303-5"],
    fuel_price_eur_per_ton: 70,
    notes: "Combustibil ieftin, necesită spațiu stocare",
  },
  {
    id: "BM_LOG_WOOD",
    label: "Cazan lemn masiv - manual",
    type: "Lemn foc",
    efficiency: { min: 0.75, max: 0.82, unit: "%" },
    power_kw: { min: 10, max: 30, unit: "kW" },
    market_ro: "MEDIU (traditionist)",
    suppliers: ["Locale", "Hargassner", "Viessmann"],
    price_eur: 2500,
    standards: ["EN 15316-5", "EN 303-5"],
    fuel_price_eur_per_ton: 50,
    notes: "Manual, confort redus, eficiență mai mică",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 5. TURBINE EOLIENE MICI
// ═══════════════════════════════════════════════════════════════════════════

export const SMALL_WIND_TURBINES = [
  {
    id: "WT_1KW",
    label: "Turbină vânt 1kW (orizontală)",
    power_nominal_kw: 1,
    rotor_diameter_m: 2.5,
    annual_production_kwh: 2000,
    market_ro: "RĂR (test, DIY)",
    suppliers: ["HAWT 1.5", "Bergey", "Proven"],
    price_eur: 3000,
    wind_class: "Clase I-II",
    notes: "Mic, pentru entuziaști",
  },
  {
    id: "WT_5KW",
    label: "Turbină vânt 5kW (orizontală)",
    power_nominal_kw: 5,
    rotor_diameter_m: 6.0,
    annual_production_kwh: 12000,
    market_ro: "MEDIU (fermă, terase)",
    suppliers: ["Enercon", "Proven", "Vestas V1.8"],
    price_eur: 15000,
    wind_class: "Clase II-III",
    notes: "Mediu, pentru ferme și terase",
  },
  {
    id: "WT_10KW",
    label: "Turbină vânt 10kW (orizontală)",
    power_nominal_kw: 10,
    rotor_diameter_m: 8.0,
    annual_production_kwh: 25000,
    market_ro: "RĂR (cooperativă, industriă)",
    suppliers: ["Enercon E10", "Proven", "Bergey"],
    price_eur: 30000,
    wind_class: "Clase III",
    notes: "Mare, pentru poziții cu vânt bun",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 6. COGENERARE (CHP - COMBINED HEAT AND POWER)
// ═══════════════════════════════════════════════════════════════════════════

export const CHP_SYSTEMS = [
  {
    id: "CHP_GAS_5KW",
    label: "Cogenerare gaz 5kW (micro-CHP)",
    type: "Gaz natural",
    electric_power_kw: 5,
    thermal_power_kw: 10,
    electric_efficiency: { min: 0.25, max: 0.30, unit: "%" },
    thermal_efficiency: { min: 0.50, max: 0.55, unit: "%" },
    total_efficiency: { min: 0.75, max: 0.85, unit: "%" },
    market_ro: "RĂR (teste pilot)",
    suppliers: ["Viesmann", "Vitogas 300", "Bosch"],
    price_eur: 8000,
    standards: ["EN 15316-4-5"],
    notes: "Investigare pentru bloc mic, piață incipientă",
  },
  {
    id: "CHP_GAS_20KW",
    label: "Cogenerare gaz 20kW",
    type: "Gaz natural",
    electric_power_kw: 20,
    thermal_power_kw: 40,
    electric_efficiency: { min: 0.27, max: 0.32, unit: "%" },
    thermal_efficiency: { min: 0.48, max: 0.53, unit: "%" },
    total_efficiency: { min: 0.75, max: 0.85, unit: "%" },
    market_ro: "MEDIU (clădire mari, bloc)",
    suppliers: ["Viessman", "Bosch", "Viessmann"],
    price_eur: 25000,
    standards: ["EN 15316-4-5"],
    notes: "Atractiv pentru bloc mic cu încălzire centrală",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 7. VENTILAȚIE RECUPERARE CĂLDURĂ
// ═══════════════════════════════════════════════════════════════════════════

export const VENTILATION_SYSTEMS = [
  {
    id: "VENT_NATURAL",
    label: "Ventilație naturală (gravitație)",
    type: "Naturală",
    recovery_rate: 0,
    market_ro: "ABUNDENT (tradițional)",
    notes: "Fără recuperare, perdere energetică mare",
  },
  {
    id: "VENT_MECHANICAL_SIMPLE",
    label: "Ventilație mecanică simplă (exhaustor)",
    type: "Mecanică",
    recovery_rate: 0,
    market_ro: "ABUNDENT",
    power_kw: 0.05,
    notes: "Fără recuperare, cost energetic",
  },
  {
    id: "VENT_DOUBLE_FLOW_PLATE",
    label: "Ventilație dublu flux - schimbător de căldură plană",
    type: "Dublu flux",
    recovery_rate: { min: 0.60, max: 0.75, unit: "%" },
    sensible_heat_recovery: { min: 0.60, max: 0.75, unit: "%" },
    latent_heat_recovery: { min: 0.40, max: 0.55, unit: "%" },
    power_kw: 0.10,
    market_ro: "ABUNDENT (standard modern)",
    suppliers: ["Helios", "Pluglane", "Daikin", "Zehnder"],
    price_eur: 3000,
    standards: ["EN 16798", "EN 13141"],
    notes: "nZEB standard, recuperare 60-75%",
  },
  {
    id: "VENT_DOUBLE_FLOW_ROTOR",
    label: "Ventilație dublu flux - rotor recuperare",
    type: "Dublu flux",
    recovery_rate: { min: 0.70, max: 0.85, unit: "%" },
    sensible_heat_recovery: { min: 0.70, max: 0.85, unit: "%" },
    latent_heat_recovery: { min: 0.50, max: 0.70, unit: "%" },
    power_kw: 0.12,
    market_ro: "MEDIU (premium)",
    suppliers: ["Pluglane", "Helios", "Zehnder"],
    price_eur: 4500,
    standards: ["EN 16798", "EN 13141"],
    notes: "Performance superioară, cost mai mare",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 8. ILUMINAT
// ═══════════════════════════════════════════════════════════════════════════

export const LIGHTING_SYSTEMS = [
  {
    id: "LIGHT_LED_G9",
    label: "LED G9 - pentru aplice și pendul",
    type: "LED",
    lumens_per_watt: { min: 85, max: 120, unit: "lm/W" },
    lifespan_hours: 25000,
    cost_per_bulb_eur: 8,
    market_ro: "ABUNDENT",
    standards: ["EN 12464-1"],
    notes: "Substituire LED, eficienț maximă",
  },
  {
    id: "LIGHT_LED_E27",
    label: "LED E27 (standard) - pentru lustre și abajuri",
    type: "LED",
    lumens_per_watt: { min: 90, max: 120, unit: "lm/W" },
    lifespan_hours: 25000,
    cost_per_bulb_eur: 5,
    market_ro: "ABUNDENT",
    standards: ["EN 12464-1"],
  },
  {
    id: "LIGHT_LED_TUBE_T8",
    label: "LED Tub T8 - pentru corpuri neon",
    type: "LED",
    lumens_per_watt: { min: 100, max: 130, unit: "lm/W" },
    lifespan_hours: 30000,
    cost_per_bulb_eur: 12,
    market_ro: "ABUNDENT",
    standards: ["EN 12464-1"],
  },
  {
    id: "LIGHT_LED_PANEL",
    label: "LED Panou flat - pentru plafoniere moderne",
    type: "LED",
    lumens_per_watt: { min: 80, max: 120, unit: "lm/W" },
    lifespan_hours: 30000,
    cost_per_m2_eur: 80,
    market_ro: "ABUNDENT",
    standards: ["EN 12464-1"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 9. FUNCȚII HELPER
// ═══════════════════════════════════════════════════════════════════════════

export function getHeatPumpCOP(hpType, scenario = "heating") {
  const hp = HEAT_PUMP_TYPES.find((h) => h.id === hpType);
  if (!hp) return null;
  if (scenario === "heating" && hp.cop_heating) {
    const val = hp.cop_heating;
    return typeof val === "number" ? val : (val.min + val.max) / 2;
  }
  if (scenario === "cooling" && hp.cop_cooling_eer) {
    const val = hp.cop_cooling_eer;
    return typeof val === "number" ? val : (val.min + val.max) / 2;
  }
  return null;
}

export function getSolarThermalEfficiency(solarType) {
  const sys = SOLAR_THERMAL_SYSTEMS.find((s) => s.id === solarType);
  if (!sys) return null;
  const eff = sys.efficiency;
  return typeof eff === "number" ? eff : (eff.min + eff.max) / 2;
}

export function getPVModuleEfficiency(pvType) {
  const pv = PHOTOVOLTAIC_SYSTEMS.find((p) => p.id === pvType);
  if (!pv) return null;
  const eff = pv.efficiency;
  return typeof eff === "number" ? eff : (eff.min + eff.max) / 2;
}

export function getHeatingSystemEfficiency(systemId) {
  const hp = HEAT_PUMP_TYPES.find((h) => h.id === systemId);
  if (hp) {
    const cop = hp.cop_heating;
    return typeof cop === "number" ? cop : (cop.min + cop.max) / 2;
  }
  const bm = BIOMASS_SYSTEMS.find((b) => b.id === systemId);
  if (bm) {
    const eff = bm.efficiency;
    return typeof eff === "number" ? eff : (eff.min + eff.max) / 2;
  }
  return null;
}
