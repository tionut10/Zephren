// ===============================================================
// CONSTANTE INSTALAȚII — Cap. 3 Mc 001-2022
// ===============================================================

export const HEAT_SOURCES = [
  { id:"GAZ_STD", label:"Cazan gaz natural - standard", fuel:"gaz", eta_gen:0.85, cat:"Cazane" },
  { id:"GAZ_TJ", label:"Cazan gaz natural - temperatură joasă", fuel:"gaz", eta_gen:0.90, cat:"Cazane" },
  { id:"GAZ_COND", label:"Cazan gaz natural - condensare", fuel:"gaz", eta_gen:0.97, cat:"Cazane" },
  { id:"MOT_STD", label:"Cazan motorină - standard", fuel:"motorina", eta_gen:0.83, cat:"Cazane" },
  { id:"MOT_COND", label:"Cazan motorină - condensare", fuel:"motorina", eta_gen:0.95, cat:"Cazane" },
  { id:"CARB", label:"Cazan cărbune", fuel:"carbune", eta_gen:0.75, cat:"Cazane" },
  { id:"BIO_MAN", label:"Cazan biomasă - manual", fuel:"biomasa", eta_gen:0.78, cat:"Cazane" },
  { id:"BIO_AUT", label:"Cazan peleți - automat", fuel:"biomasa", eta_gen:0.88, cat:"Cazane" },
  { id:"ELEC", label:"Cazan electric", fuel:"electricitate", eta_gen:0.99, cat:"Cazane" },
  { id:"GPL_STD", label:"Cazan GPL - standard", fuel:"gpl", eta_gen:0.85, cat:"Cazane" },
  { id:"GPL_COND", label:"Cazan GPL - condensare", fuel:"gpl", eta_gen:0.95, cat:"Cazane" },
  { id:"PC_AA", label:"Pompă de căldură aer-apă", fuel:"electricitate", eta_gen:3.50, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_AERAER", label:"Pompă de căldură aer-aer", fuel:"electricitate", eta_gen:4.00, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_SA", label:"Pompă de căldură sol-apă", fuel:"electricitate", eta_gen:4.50, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_APA", label:"Pompă de căldură apă-apă", fuel:"electricitate", eta_gen:5.00, cat:"Pompe de caldura", isCOP:true },
  { id:"TERMO", label:"Termoficare (racord urban)", fuel:"termoficare", eta_gen:0.95, cat:"Termoficare" },
  { id:"COGEN", label:"Cogenerare (CHP)", fuel:"gaz", eta_gen:0.85, cat:"Cogenerare" },
];

export const EMISSION_SYSTEMS = [
  { id:"RAD_OT", label:"Radiatoare din oțel", eta_em:0.93 },
  { id:"RAD_FO", label:"Radiatoare din fontă", eta_em:0.90 },
  { id:"RAD_AL", label:"Radiatoare din aluminiu", eta_em:0.94 },
  { id:"CONV", label:"Convectoare", eta_em:0.92 },
  { id:"PARD", label:"Incălzire in pardoseală", eta_em:0.97 },
  { id:"PERE", label:"Incălzire in perete", eta_em:0.96 },
  { id:"PLAF", label:"Incălzire in plafon", eta_em:0.95 },
  { id:"VENT_CONV", label:"Ventiloconvectoare", eta_em:0.93 },
  { id:"AERO", label:"Aeroterme", eta_em:0.88 },
  { id:"SOBA_TER", label:"Sobă de teracotă", eta_em:0.80 },
  { id:"SOBA_MET", label:"Sobă metalică", eta_em:0.75 },
];

export const DISTRIBUTION_QUALITY = [
  { id:"BINE_INT", label:"Bine izolată - interioară", eta_dist:0.95 },
  { id:"MED_INT", label:"Mediu izolată - interioară", eta_dist:0.90 },
  { id:"SLAB_INT", label:"Slab izolată - interioară", eta_dist:0.85 },
  { id:"BINE_EXT", label:"Bine izolată - exterioară", eta_dist:0.88 },
  { id:"MED_EXT", label:"Mediu izolată - exterioară", eta_dist:0.82 },
  { id:"SLAB_EXT", label:"Slab izolată - exterioară", eta_dist:0.75 },
  { id:"NEIZ", label:"Neizolată", eta_dist:0.70 },
];

export const CONTROL_TYPES = [
  { id:"FARA", label:"Fără reglaj", eta_ctrl:0.82 },
  { id:"CENTR", label:"Centralizat (termostat ambiental)", eta_ctrl:0.88 },
  { id:"TERMO_RAD", label:"Robinete termostatice pe radiatoare", eta_ctrl:0.93 },
  { id:"ZONAL", label:"Reglaj zonal (multizonă)", eta_ctrl:0.95 },
  { id:"INTELIG", label:"Reglaj inteligent (smart/BMS)", eta_ctrl:0.97 },
];

export const FUELS = [
  // Prețuri actualizate Q1/2026 conform date normative, OUG 6/2025, OUG 12/2026
  { id:"gaz", label:"Gaz natural", fP_nren:1.17, fP_ren:0.00, fP_tot:1.17, fCO2:0.202, pci:34.00, unit:"mc", price_lei_kwh:0.31, price_note:"Plafonat 310 lei/MWh TVA incl. (OUG 6/2025), din apr.2026: min(contract, reglementat) per OUG 12/2026" },
  { id:"motorina", label:"Motorină/combustibil lichid", fP_nren:1.10, fP_ren:0.00, fP_tot:1.10, fCO2:0.263, pci:42.60, unit:"litri", price_lei_kwh:0.75, price_note:"Preț orientativ 2025-2026" },
  { id:"carbune", label:"Cărbune (huilă)", fP_nren:1.20, fP_ren:0.00, fP_tot:1.20, fCO2:0.348, pci:26.00, unit:"kg", price_lei_kwh:0.18, price_note:"Preț orientativ 2025" },
  { id:"biomasa", label:"Biomasă (lemn/peleți)", fP_nren:0.28, fP_ren:0.80, fP_tot:1.08, fCO2:0.039, pci:17.50, unit:"kg", price_lei_kwh:0.22, price_note:"Peleți ENplus A1: 1300-1500 lei/t; Lemn 5.0-5.3 kWh/kg" },
  { id:"electricitate", label:"Electricitate din rețea (SEN)", fP_nren:2.62, fP_ren:0.00, fP_tot:2.62, fCO2:0.107, pci:null, unit:"kWh", price_lei_kwh:1.12, price_note:"Media 2026: ~1.12 lei/kWh TVA incl. (ANRE, actualizat aprilie 2026)" },
  { id:"termoficare", label:"Termoficare/cogenerare", fP_nren:0.92, fP_ren:0.00, fP_tot:0.92, fCO2:0.220, pci:null, unit:"kWh", price_lei_kwh:0.40, price_note:"Tarif mediu 2025, subvenționat local" },
  { id:"gpl", label:"GPL (gaz petrolier lichefiat)", fP_nren:1.15, fP_ren:0.00, fP_tot:1.15, fCO2:0.227, pci:46.00, unit:"litri", price_lei_kwh:0.55, price_note:"Preț variabil ~4.5-6.0 lei/L (2024-2025)" },
  { id:"lemn_foc", label:"Lemne de foc", fP_nren:0.09, fP_ren:1.00, fP_tot:1.09, fCO2:0.018, pci:14.40, unit:"kg", price_lei_kwh:0.12, price_note:"Plafonat 400 lei/mc, putere calorifică ~5.0-5.3 kWh/kg" },
];

// Factor energie ambientală conform SR EN ISO 52000-1:2017/NA:2023 (Tabel A.16)
// OAER: factor 0 pentru energia ambientală a pompelor de căldură (în loc de 1.0 din Mc001 original)
export const AMBIENT_ENERGY_FACTOR = {
  mc001_original: { fP_nren: 1.0, fP_ren: 0.0, fP_tot: 1.0, fCO2: 0.0, label: "Mc001-2022 original (Tabel 5.17)" },
  na2023:         { fP_nren: 0.0, fP_ren: 0.0, fP_tot: 0.0, fCO2: 0.0, label: "SR EN ISO 52000-1/NA:2023 (Tabel A.16)" },
};

export const ACM_SOURCES = [
  { id:"CAZAN_H", label:"Același cazan cu încălzirea", eta:null },
  { id:"BOILER_E", label:"Boiler electric", eta:0.95, fuel:"electricitate" },
  { id:"BOILER_G", label:"Boiler pe gaz", eta:0.85, fuel:"gaz" },
  { id:"PC_ACM", label:"Pompă de căldură dedicată ACM", eta:3.0, fuel:"electricitate", isCOP:true },
  { id:"SOLAR_AUX", label:"Solar termic + auxiliar electric", eta:0.95, fuel:"electricitate", solarFraction:0.60 },
  { id:"TERMO_ACM", label:"Termoficare", eta:0.92, fuel:"termoficare" },
  { id:"INSTANT_G", label:"Instant pe gaz (centrală murală)", eta:0.88, fuel:"gaz" },
  { id:"INSTANT_E", label:"Instant electric", eta:0.97, fuel:"electricitate" },
];

export const COOLING_SYSTEMS = [
  { id:"SPLIT", label:"Split/Multi-split", eer:3.50, fuel:"electricitate" },
  { id:"VRF", label:"Sistem VRF/VRV", eer:4.50, fuel:"electricitate" },
  { id:"CHILLER_A", label:"Chiller răcit cu aer", eer:3.00, fuel:"electricitate" },
  { id:"CHILLER_W", label:"Chiller răcit cu apă", eer:4.00, fuel:"electricitate" },
  { id:"ABSORB", label:"Mașină cu absorbție", eer:0.80, fuel:"gaz" },
  { id:"PC_REV", label:"Pompă de căldură reversibilă", eer:4.00, fuel:"electricitate" },
  { id:"NONE", label:"Fără sistem de răcire", eer:0, fuel:null },
];

// Tipuri ventilare conform I5-2022 (Ord. MDLPA 2023) + Mc 001-2022 Cap. 3
// SFP conform EN 13779 Tabel B.5 + I5-2022 Tabel 6.1 (W/(m³/s))
export const VENTILATION_TYPES = [
  { id:"NAT", label:"Ventilare naturală", hasHR:false, sfp:0 },
  { id:"MEC_EXT", label:"Ventilare mecanică - extracție", hasHR:false, sfp:0.50 },
  { id:"MEC_INT", label:"Ventilare mecanică - introducere", hasHR:false, sfp:0.50 },
  { id:"MEC_DUB", label:"Ventilare mecanică dublă (fără recuperare)", hasHR:false, sfp:1.00 },
  { id:"MEC_HR70", label:"Ventilare mecanică cu recuperare 70%", hasHR:true, hrEta:0.70, sfp:1.20 },
  { id:"MEC_HR80", label:"Ventilare mecanică cu recuperare 80%", hasHR:true, hrEta:0.80, sfp:1.40 },
  { id:"MEC_HR90", label:"Ventilare mecanică cu recuperare 90%", hasHR:true, hrEta:0.90, sfp:1.60 },
  { id:"UTA", label:"Unitate de tratare aer (UTA)", hasHR:true, hrEta:0.75, sfp:2.00 },
];

export const LIGHTING_TYPES = [
  { id:"INCAND", label:"Incandescent (bec clasic)", pDensity:25.0, efficacy:12 },
  { id:"HALOGEN", label:"Halogen", pDensity:18.0, efficacy:18 },
  { id:"CFL", label:"Fluorescent compact (CFL)", pDensity:8.0, efficacy:55 },
  { id:"TUB_T8", label:"Tub fluorescent T8", pDensity:10.0, efficacy:80 },
  { id:"TUB_T5", label:"Tub fluorescent T5", pDensity:7.0, efficacy:95 },
  { id:"LED", label:"LED", pDensity:4.5, efficacy:130 },
  { id:"LED_PRO", label:"LED profesional/panel", pDensity:3.5, efficacy:160 },
];

export const LIGHTING_CONTROL = [
  { id:"MAN", label:"Manual (întrerupător)", fCtrl:1.00 },
  { id:"TIMER", label:"Programator orar", fCtrl:0.90 },
  { id:"PREZ", label:"Senzor de prezență", fCtrl:0.80 },
  { id:"DAYLIGHT", label:"Reglaj funcție de lumină naturală", fCtrl:0.70 },
  { id:"PREZ_DAY", label:"Prezență + lumină naturală", fCtrl:0.60 },
  { id:"BMS", label:"Sistem BMS integrat", fCtrl:0.55 },
];

export const ACM_CONSUMPTION = { RI:60, RC:50, RA:50, BI:10, ED:15, SA:40, HC:80, CO:10, SP:30, AL:20 };
export const LIGHTING_HOURS = { RI:1800, RC:1800, RA:1800, BI:2500, ED:2000, SA:3500, HC:3000, CO:3000, SP:2000, AL:2200 };

// ===============================================================
// BAZE DE DATE REGENERABILE — Cap. 4 Mc 001-2022
// ===============================================================

export const SOLAR_THERMAL_TYPES = [
  { id:"PLAN", label:"Colector solar plan", eta0:0.75, a1:3.5, a2:0.015 },
  { id:"TUB_VID", label:"Colector tuburi vidate", eta0:0.70, a1:1.5, a2:0.005 },
  { id:"TUB_HP", label:"Tuburi vidate heat-pipe", eta0:0.65, a1:1.2, a2:0.004 },
  { id:"NEGL", label:"Colector neglazurat (piscine)", eta0:0.85, a1:15.0, a2:0.00 },
];

export const PV_TYPES = [
  { id:"MONO", label:"Monocristalin", eta:0.21, degradation:0.005 },
  { id:"POLI", label:"Policristalin", eta:0.17, degradation:0.006 },
  { id:"THIN", label:"Film subțire (CdTe/CIGS)", eta:0.14, degradation:0.004 },
  { id:"BIFACIAL", label:"Bifacial monocristalin", eta:0.22, degradation:0.004 },
  { id:"HJT", label:"Heterojuncțiune (HJT)", eta:0.24, degradation:0.003 },
];

export const PV_INVERTER_ETA = [
  { id:"STD", label:"Invertor standard", eta:0.95 },
  { id:"PREM", label:"Invertor premium", eta:0.97 },
  { id:"MICRO", label:"Micro-invertoare", eta:0.96 },
  { id:"OPTIM", label:"Optimizatoare + invertor", eta:0.97 },
];

export const TILT_FACTORS = {
  "0":0.87, "10":0.93, "15":0.96, "20":0.98, "25":0.99, "30":1.00,
  "35":1.00, "40":0.99, "45":0.97, "50":0.94, "60":0.87, "70":0.78, "90":0.56,
};

export const ORIENT_FACTORS = { S:1.00, SE:0.95, SV:0.95, E:0.82, V:0.82, NE:0.60, NV:0.60, N:0.45, Oriz:0.87 };

export const BIOMASS_TYPES = [
  { id:"LEMN_CRUD", label:"Lemne de foc (crude)", pci:14.4, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"LEMN_UCAT", label:"Lemne de foc (uscate)", pci:16.5, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"PELETI", label:"Peleți din lemn", pci:17.5, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"BRICHETE", label:"Brichete din lemn", pci:17.0, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"TOCATURA", label:"Tocătură / așchii lemn", pci:12.0, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
];
