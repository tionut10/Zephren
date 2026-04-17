// ═══════════════════════════════════════════════════════════════
// INITIAL STATE — Valori implicite pentru toate secțiunile formularului
// Extras din energy-calc.jsx (Faza 4 refactoring)
// ═══════════════════════════════════════════════════════════════

// ─── STEP 1: IDENTIFICARE ───
export const INITIAL_BUILDING = {
  address:"", city:"", county:"", postal:"",
  category:"RI", structure:"Zidărie portantă",
  yearBuilt:"", yearRenov:"",
  floors:"P", basement:false, attic:false,
  units:"1", stairs:"1",
  areaUseful:"", volume:"", areaEnvelope:"",
  heightBuilding:"", heightFloor:"2.80",
  locality:"",
  perimeter:"", n50:"4.0", shadingFactor:"0.90",
  gwpLifecycle:"", solarReady:false,
  scopCpe:"vanzare", parkingSpaces:"0",
  // Coordonate geografice — Anexa 6, Ord. MDLPA 348/2026
  latitude:"",   // grad zecimal WGS84, ex: "44.4268"
  longitude:"",  // grad zecimal WGS84, ex: "26.1025"
  // Date proprietar/administrator — Anexa 6, col. G
  owner:"",
  // Date post-renovare — Anexa 6, col. P-S (dacă e cazul)
  energyClassAfterRenov:"",      // clasa energetică după renovare (A+..G)
  emissionClassAfterRenov:"",    // clasa emisii după renovare (A+..G)
  energySavings:"",              // economii energie realizate (kWh/m²·an)
  co2Reduction:"",               // reducere emisii CO₂ (kgCO₂/m²·an)
};

// ─── STEP 3: INSTALAȚII ───
export const INITIAL_HEATING = {
  source:"GAZ_COND", power:"", eta_gen:"0.97",
  emission:"RAD_OT", eta_em:"0.93",
  distribution:"BINE_INT", eta_dist:"0.95",
  control:"TERMO_RAD", eta_ctrl:"0.93",
  regime:"intermitent", theta_int:"20", nightReduction:"4",
  tStaircase:"15", tBasement:"10", tAttic:"5",
};

export const INITIAL_ACM = {
  source:"CAZAN_H", consumers:"", dailyLiters:"60",
  consumptionLevel:"med",        // low / med / high — Mc 001 Tab.10 + GEx
  tSupply:"55",                  // temperatură setată boiler [°C] — min 60 pentru Legionella boilere >400L
  storageVolume:"", storageLoss:"2.0",
  insulationClass:"B",           // A / B / C — clasa ErP boiler (EN 50440)
  pipeLength:"", pipeInsulated:true,
  pipeInsulationThickness:"20mm", // fara / 20mm / 30mm / 50mm — EN 15316-3 Tab.7
  pipeDiameter:"22",             // mm — diametru nominal conductă
  circRecirculation:false, circHours:"",
  circPumpType:"standard",       // veche_neregulata / standard / variabila / iee_sub_023 — EN 15316-3 Tab.10
  // Legionella — HG 1425/2006 + Ord. MS 1002/2015 + VDI 6023 (Sprint 3)
  hasLegionella:false,           // tratament termic periodic activ
  legionellaFreq:"weekly",       // weekly / daily / none
  legionellaT:"70",              // temperatură șoc termic [°C]
};

export const INITIAL_COOLING = {
  system:"NONE", power:"", eer:"",
  cooledArea:"", distribution:"BINE_INT",
  hasCooling:false,
  // Sprint 3a (17 apr 2026) — EN 14825 + EN 15316-2 + EN 16798-9
  seer:"",                          // SEER sezonier — gol → EER_nominal × 1.8 (fallback grosier)
  setpoint:"26",                    // °C setpoint răcire (EN 16798-1 cat. II)
  shadingExternal:"0.70",           // factor umbrire externă global (0–1)
  useHourly:true,                   // true → calc orar cooling-hourly.js (precizie); false → lunar ISO 13790
  emissionType:"fan_coil",          // cheie COOLING_EMISSION_EFFICIENCY
  eta_em:"0.97",                    // η emisie răcire
  distributionType:"apa_rece_izolat_int",
  eta_dist:"0.95",                  // η distribuție răcire
  controlType:"termostat_prop",
  eta_ctrl:"0.96",                  // η control răcire
};

export const INITIAL_VENTILATION = {
  type:"NAT", airflow:"", fanPower:"",
  operatingHours:"", hrEfficiency:"",
};

export const INITIAL_LIGHTING = {
  type:"LED", pDensity:"4.5", controlType:"MAN",
  fCtrl:"1.00", operatingHours:"", naturalLightRatio:"30",
  // Sprint 2 (17 apr 2026) — W_P (energie parazită) EN 15193-1 Annex B
  // gol → default categorie: rezidențial 0, altele 1.0 W/m² urgență + 0.3 W/m² standby
  pEmergency:"", pStandby:"",
};

// ─── STEP 4: REGENERABILE ───
export const INITIAL_SOLAR_TH = {
  enabled:false, type:"PLAN", area:"", orientation:"S", tilt:"35",
  usage:"acm", storageVolume:"", eta0:"0.75", a1:"3.5",
};

export const INITIAL_PV = {
  enabled:false, type:"MONO", area:"", peakPower:"",
  orientation:"S", tilt:"30", inverterType:"STD",
  inverterEta:"0.95", usage:"all",
};

export const INITIAL_HP = {
  enabled:false, type:"PC_AA", cop:"3.50", scopHeating:"3.00",
  scopCooling:"", covers:"heating_acm", bivalentTemp:"-5",
  auxSource:"GAZ_COND", auxEta:"0.97",
};

export const INITIAL_BIO = {
  enabled:false, type:"PELETI", boilerEta:"0.88", power:"",
  covers:"heating", annualConsumption:"",
};

export const INITIAL_OTHER = {
  windEnabled:false, windCapacity:"", windProduction:"",
  cogenEnabled:false, cogenElectric:"", cogenThermal:"", cogenFuel:"gaz",
};

export const INITIAL_BATTERY = {
  enabled:false, type:"LFP", capacity:"", power:"", dod:"0.90",
  selfConsumptionPct:"80",
};

// ─── STEP 6: AUDITOR ───
export const INITIAL_AUDITOR = {
  name:"", atestat:"", grade:"AE Ici", company:"",
  phone:"", email:"", date: new Date().toISOString().slice(0,10),
  mdlpaCode:"", observations:"", photo:"",
  scopCpe:"vanzare",
  validityYears:"10",
  registruEvidenta:"",
  nrCadastral:"",
  codUnicMDLPA:"",
  // Câmpuri specifice Registrului de Evidență (Anexa 6, Ord. MDLPA 348/2026)
  specialty:"construcții și instalații",  // specialitate: "construcții" / "instalații" / "construcții și instalații"
  dataExpirareDrept:"",                    // data expirării dreptului de practică (ISO: YYYY-MM-DD)
  dataTransmitereMDLPA:"",                 // data transmiterii informațiilor în baza de date MDLPA (ISO)
  cpeNumber:"",                            // nr. înregistrare CPE (ex: "CPE-12345")
};
