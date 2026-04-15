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
  storageVolume:"", storageLoss:"2.0",
  pipeLength:"", pipeInsulated:true,
  circRecirculation:false, circHours:"",
};

export const INITIAL_COOLING = {
  system:"NONE", power:"", eer:"",
  cooledArea:"", distribution:"BINE_INT",
  hasCooling:false,
};

export const INITIAL_VENTILATION = {
  type:"NAT", airflow:"", fanPower:"",
  operatingHours:"", hrEfficiency:"",
};

export const INITIAL_LIGHTING = {
  type:"LED", pDensity:"4.5", controlType:"MAN",
  fCtrl:"1.00", operatingHours:"", naturalLightRatio:"30",
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
};
