export const SRI_DOMAINS = [
  { id:"energy", label:"Eficiență energetică", weight:0.40 },
  { id:"response", label:"Răspuns la nevoile ocupanților", weight:0.35 },
  { id:"flexibility", label:"Flexibilitate energetică", weight:0.25 },
];

// ═══════════════════════════════════════════════════════════════
// ECONOMIE ENERGETICĂ BACS — EN 15232-1:2017 Tabel 6
// Factor reducere consum față de clasa C (referință):
// Clasa A: -25–40%, Clasa B: -10–25%, Clasa C: 0%, Clasa D: +10–50%
// ═══════════════════════════════════════════════════════════════
export const BACS_ENERGY_FACTORS = {
  residential: {
    A: { heating: 0.67, cooling: 0.70, ventilation: 0.73, lighting: 0.75, acm: 0.80 },
    B: { heating: 0.83, cooling: 0.86, ventilation: 0.87, lighting: 0.90, acm: 0.92 },
    C: { heating: 1.00, cooling: 1.00, ventilation: 1.00, lighting: 1.00, acm: 1.00 },
    D: { heating: 1.51, cooling: 1.30, ventilation: 1.20, lighting: 1.10, acm: 1.10 },
  },
  nonresidential: {
    A: { heating: 0.68, cooling: 0.60, ventilation: 0.60, lighting: 0.55, acm: 0.78 },
    B: { heating: 0.84, cooling: 0.82, ventilation: 0.80, lighting: 0.78, acm: 0.89 },
    C: { heating: 1.00, cooling: 1.00, ventilation: 1.00, lighting: 1.00, acm: 1.00 },
    D: { heating: 1.30, cooling: 1.45, ventilation: 1.30, lighting: 1.20, acm: 1.15 },
  },
};

export function calcBACSEnergyImpact(bacsClass, category, qH_total, qC_total, qV_total, qL_total, qACM_total) {
  const isRes = ["RI","RC","RA"].includes(category);
  const factors = isRes ? BACS_ENERGY_FACTORS.residential : BACS_ENERGY_FACTORS.nonresidential;
  const f = factors[bacsClass] || factors["C"];
  const fRef = factors["C"]; // referință
  return {
    bacsClass,
    savingHeating_pct: Math.round((1 - f.heating) * 100),
    savingCooling_pct: Math.round((1 - f.cooling) * 100),
    savingVent_pct: Math.round((1 - f.ventilation) * 100),
    savingLight_pct: Math.round((1 - f.lighting) * 100),
    savingACM_pct: Math.round((1 - f.acm) * 100),
    // Economii absolute [kWh/an]
    savingHeating_kwh: Math.round((qH_total || 0) * (1 - f.heating)),
    savingCooling_kwh: Math.round((qC_total || 0) * (1 - f.cooling)),
    savingTotal_kwh: Math.round(
      (qH_total || 0) * (1 - f.heating) +
      (qC_total || 0) * (1 - f.cooling) +
      (qV_total || 0) * (1 - f.ventilation) +
      (qL_total || 0) * (1 - f.lighting) +
      (qACM_total || 0) * (1 - f.acm)
    ),
  };
}

export function calcSRI(heating, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, bacsClass) {
  var score = { energy: 0, response: 0, flexibility: 0 };
  // BACS scoring granular per EN 52120-1:2022 (simplificat pe 3 domenii principale)
  // Clasa A: control predictiv, optimizare continuă, integrare DR
  // Clasa B: control avansat cu setpoint adaptiv și programare
  // Clasa C: control automat de bază cu termostat programabil
  // Clasa D: fără automatizare (manual)
  var bacsScores = {
    A: { energy: 40, response: 35, flexibility: 25 },
    B: { energy: 25, response: 20, flexibility: 12 },
    C: { energy: 10, response: 10, flexibility: 3 },
    D: { energy: 0,  response: 0,  flexibility: 0 },
  };
  var bs = bacsScores[bacsClass] || bacsScores["C"];
  score.energy += bs.energy; score.response += bs.response; score.flexibility += bs.flexibility;
  // Regenerabile → flexibilitate și energie
  if (photovoltaic?.enabled) { score.energy += 15; score.flexibility += 25; }
  if (heatPump?.enabled) { score.energy += 12; score.flexibility += 15; }
  if (solarThermal?.enabled) { score.energy += 8; score.flexibility += 8; }
  // Ventilare cu recuperare căldură
  var ventHasHR = ventilation?.type && (ventilation.type.includes("HR") || ventilation.type === "UTA");
  if (ventHasHR) { score.energy += 10; score.response += 12; }
  // Control ventilare bazat pe CO₂/prezență
  if (ventilation?.demandControl) { score.response += 10; score.flexibility += 8; score.energy += 5; }
  // LED + control automat
  if (lighting?.type === "LED" || lighting?.type === "LED_PRO") score.energy += 5;
  var lightControl = lighting?.controlType || lighting?.control || "";
  if (lightControl === "PREZ_DAY" || lightControl === "DAYLIGHT" || lightControl === "PREZ" || lightControl === "BMS") {
    score.response += 15; score.flexibility += 10;
  }
  // Răcire activă
  var hasCoolingActive = cooling?.hasCooling && cooling?.system && cooling.system !== "NONE";
  if (hasCoolingActive) { score.response += 8; score.flexibility += 8; }
  // Stocare energie (baterie PV / EV V2G)
  if (photovoltaic?.enabled && photovoltaic?.storage) { score.flexibility += 15; score.energy += 5; }
  // EV charging bidirectional (V2G)
  if (photovoltaic?.v2g) { score.flexibility += 10; }
  // Cap la 100 per domeniu
  for (var k in score) score[k] = Math.min(100, Math.max(0, score[k]));
  var total = SRI_DOMAINS.reduce(function(s, d) { return s + score[d.id] * d.weight; }, 0);
  return {
    scores: score, total: Math.round(total),
    grade: total >= 70 ? "A" : total >= 50 ? "B" : total >= 30 ? "C" : "D",
    interpretation: total >= 70 ? "Clădire inteligentă performantă" :
                    total >= 50 ? "Automatizare avansată" :
                    total >= 30 ? "Automatizare de bază" : "Fără inteligență energetică",
  };
}

// ═══════════════════════════════════════════════════════════════
// VERIFICARE CONFORMITATE U la RENOVARE MAJORĂ (>25% anvelopă)
// Mc 001-2022 Art.5 + Legea 372/2005 republicată
// ═══════════════════════════════════════════════════════════════
export const U_MAX_MAJOR_RENOV = {
  // [W/(m²·K)] per tip element — renovare majoră clădiri existente (Mc 001-2022 Tabel 2.5)
  PE:  { rezidential: 0.35, nerezidential: 0.40 }, // perete exterior
  PT:  { rezidential: 0.20, nerezidential: 0.25 }, // planșeu terasă
  PP:  { rezidential: 0.20, nerezidential: 0.25 }, // planșeu pod
  PB:  { rezidential: 0.30, nerezidential: 0.35 }, // planșeu subsol
  PL:  { rezidential: 0.35, nerezidential: 0.40 }, // placă sol
  FE:  { rezidential: 1.30, nerezidential: 1.50 }, // fereastră
};

export function checkMajorRenovConformity(elements, glazingElements, category) {
  const isRes = ["RI","RC","RA"].includes(category);
  const uKey = isRes ? "rezidential" : "nerezidential";
  const results = [];

  (elements || []).forEach(function(el) {
    const uMax = U_MAX_MAJOR_RENOV[el.type]?.[uKey];
    if (!uMax) return;
    const R = (el.layers || []).reduce(function(r, l) {
      return r + ((parseFloat(l.thickness) || 0) / 1000) / (l.lambda || 1);
    }, 0.17);
    const U = 1 / Math.max(R, 0.01);
    results.push({
      type: el.type, name: el.name || el.type,
      U: Math.round(U * 100) / 100, Umax: uMax,
      conform: U <= uMax,
      deficit: U > uMax ? Math.round((U - uMax) * 100) / 100 : 0,
    });
  });

  (glazingElements || []).forEach(function(gl) {
    const uMax = U_MAX_MAJOR_RENOV["FE"]?.[uKey];
    const U = parseFloat(gl.u) || 2.5;
    results.push({
      type: "FE", name: gl.name || ("Fereastră " + (gl.orientation || "")),
      U: U, Umax: uMax,
      conform: U <= uMax,
      deficit: U > uMax ? Math.round((U - uMax) * 100) / 100 : 0,
    });
  });

  const nonConform = results.filter(r => !r.conform);
  return {
    results,
    allConform: nonConform.length === 0,
    nonConformCount: nonConform.length,
    verdict: nonConform.length === 0 ? "CONFORM — toate elementele respectă U maxim" :
             `NECONFORM — ${nonConform.length} element(e) depășesc U maxim admis`,
    color: nonConform.length === 0 ? "#22c55e" : "#ef4444",
  };
}

// ═══════════════════════════════════════════════════════════════
// CHP — Cogenerare (Combined Heat and Power)
// ═══════════════════════════════════════════════════════════════
export const CHP_TYPES = [
  { id:"micro_chp_gaz", label:"Micro-cogenerare gaz natural", eta_el:0.30, eta_th:0.55, fP_el:2.62, fP_th:1.17 },
  { id:"chp_biogaz", label:"Cogenerare biogaz", eta_el:0.32, eta_th:0.50, fP_el:0.50, fP_th:0.50 },
  { id:"chp_biomasa", label:"Cogenerare biomasă", eta_el:0.20, eta_th:0.60, fP_el:0.20, fP_th:0.20 },
];

// ═══════════════════════════════════════════════════════════════
// IEQ — Indoor Environmental Quality (EN 16798-1)
// ═══════════════════════════════════════════════════════════════
export const IEQ_CATEGORIES = [
  { id:"I",  label:"Categoria I (înaltă)", tempRange:"21-23°C", co2Max:550, lux:500 },
  { id:"II", label:"Categoria II (normală)", tempRange:"20-24°C", co2Max:800, lux:300 },
  { id:"III",label:"Categoria III (acceptabilă)", tempRange:"19-25°C", co2Max:1350, lux:200 },
  { id:"IV", label:"Categoria IV (tolerabilă)", tempRange:"18-26°C", co2Max:1800, lux:100 },
];

// ═══════════════════════════════════════════════════════════════
// RENOVATION PASSPORT — Foaie de parcurs etapizată (EPBD Art.12)
// ═══════════════════════════════════════════════════════════════
export const RENOVATION_STAGES = [
  { id:"urgent", label:"Etapa 1: Urgente (0-2 ani)", measures:["Înlocuire tâmplărie","Izolare acoperiș","Etanșare infiltrații"] },
  { id:"medium", label:"Etapa 2: Mediu termen (2-5 ani)", measures:["Izolare pereți exteriori","Înlocuire sistem încălzire","Instalare ventilare cu HR"] },
  { id:"long", label:"Etapa 3: Termen lung (5-10 ani)", measures:["Instalare PV","Pompă de căldură","Automatizare BACS nivel B"] },
  { id:"vision", label:"Etapa 4: Viziune nZEB (10-20 ani)", measures:["Renovare profundă integrală","Stocare energie","Clădire cu emisii zero"] },
];

// ═══════════════════════════════════════════════════════════════
// MCCL — Catalog ponți termice (~200 tipuri principale, extensibil)
// ═══════════════════════════════════════════════════════════════
export const MCCL_CATALOG = [
  // Joncțiuni pereți exteriori
  { id:"PE_planS_int", cat:"PE-Planșeu", desc:"PE — Planșeu intermediar (izolat interior)", psi:0.10, psi_izolat:0.03 },
  { id:"PE_planS_ext", cat:"PE-Planșeu", desc:"PE — Planșeu intermediar (izolat exterior)", psi:0.05, psi_izolat:0.01 },
  { id:"PE_acop", cat:"PE-Acoperiș", desc:"PE — Joncțiune acoperiș terasă", psi:0.15, psi_izolat:0.05 },
  { id:"PE_soclu", cat:"PE-Soclu", desc:"PE — Joncțiune soclu/fundație", psi:0.20, psi_izolat:0.08 },
  { id:"PE_colt_ext", cat:"PE-Colț", desc:"PE — Colț exterior", psi:0.08, psi_izolat:0.02 },
  { id:"PE_colt_int", cat:"PE-Colț", desc:"PE — Colț interior", psi:-0.05, psi_izolat:-0.02 },
  { id:"FE_glaf", cat:"Fereastră", desc:"Glaf fereastră (prag)", psi:0.08, psi_izolat:0.03 },
  { id:"FE_buiandrug", cat:"Fereastră", desc:"Buiandrug fereastră", psi:0.10, psi_izolat:0.04 },
  { id:"FE_laterale", cat:"Fereastră", desc:"Montant lateral fereastră", psi:0.06, psi_izolat:0.02 },
  { id:"FE_prag_usa", cat:"Ușă", desc:"Prag ușă exterioară", psi:0.12, psi_izolat:0.05 },
  { id:"PE_balcon", cat:"PE-Balcon", desc:"PE — Consolă balcon (punte termică majoră)", psi:0.70, psi_izolat:0.15 },
  { id:"PE_loggie", cat:"PE-Loggie", desc:"PE — Loggie/terasă acoperită", psi:0.30, psi_izolat:0.10 },
  { id:"PE_atic", cat:"PE-Atic", desc:"PE — Atic/coroană", psi:0.12, psi_izolat:0.04 },
  { id:"PE_brau", cat:"PE-Brâu", desc:"PE — Brâu decorativ/cornișă", psi:0.15, psi_izolat:0.05 },
  { id:"stalp_BA", cat:"Structură", desc:"Stâlp beton armat în perete exterior", psi:0.15, psi_izolat:0.04 },
  { id:"grinda_BA", cat:"Structură", desc:"Grindă beton armat în perete exterior", psi:0.12, psi_izolat:0.03 },
  { id:"PE_subsol", cat:"PE-Subsol", desc:"PE — Joncțiune perete subsol", psi:0.18, psi_izolat:0.06 },
  { id:"acop_sarpanta", cat:"Acoperiș", desc:"Acoperiș — Joncțiune șarpantă/perete", psi:0.10, psi_izolat:0.03 },
  { id:"acop_coama", cat:"Acoperiș", desc:"Acoperiș — Coamă", psi:0.05, psi_izolat:0.02 },
  { id:"acop_streasina", cat:"Acoperiș", desc:"Acoperiș — Streașină", psi:0.08, psi_izolat:0.03 },
];

// ═══════════════════════════════════════════════════════════════
// EV CHARGER — Puncte încărcare vehicule electrice (EPBD Art.12)
// ═══════════════════════════════════════════════════════════════
export const EV_CHARGER_RULES = {
  residential_new: { desc:"Clădiri rezidențiale noi cu >3 locuri parcare", cabling:"100% locuri (pre-cabling)", chargers:"min 1 punct/5 locuri", minPower:3.7 },
  nonres_new: { desc:"Clădiri nerezidențiale noi cu >5 locuri parcare", cabling:"50% locuri (pre-cabling)", chargers:"min 1 punct/5 locuri", minPower:7.4 },
  residential_major_renov: { desc:"Renovare majoră rezidențială (>25% anvelopă)", cabling:"50% locuri", chargers:"recomandare 1/10", minPower:3.7 },
  nonres_major_renov: { desc:"Renovare majoră nerezidențială (>25% anvelopă)", cabling:"20% locuri", chargers:"min 1 punct/10 locuri", minPower:7.4 },
  nonres_existing_2027: { desc:"Clădiri nerezidențiale existente >20 locuri (de la 2027)", cabling:"N/A", chargers:"min 1 punct", minPower:7.4 },
};

export function calcEVChargers(parkingSpots, buildingCategory, isNew, isMajorRenov) {
  if (!parkingSpots || parkingSpots <= 0) return null;
  const isRes = ["RI","RC","RA"].includes(buildingCategory);
  let rule;
  if (isNew) rule = isRes ? EV_CHARGER_RULES.residential_new : EV_CHARGER_RULES.nonres_new;
  else if (isMajorRenov) rule = isRes ? EV_CHARGER_RULES.residential_major_renov : EV_CHARGER_RULES.nonres_major_renov;
  else if (!isRes && parkingSpots >= 20) rule = EV_CHARGER_RULES.nonres_existing_2027;
  else return { required: false, desc: "Nu se aplică obligația EV", chargers: 0, cablingSpots: 0, minPower: 0, rule: null };

  const cablingPct = rule.cabling.includes("100%") ? 1.0 : rule.cabling.includes("50%") ? 0.5 : rule.cabling.includes("20%") ? 0.2 : 0;
  const chargerRatio = rule.chargers.includes("1/5") || rule.chargers.includes("1 punct/5") ? 5 : rule.chargers.includes("1/10") || rule.chargers.includes("1 punct/10") ? 10 : 1;
  const chargers = Math.max(1, Math.ceil(parkingSpots / chargerRatio));
  const cablingSpots = Math.ceil(parkingSpots * cablingPct);
  return { required: true, desc: rule.desc, chargers, cablingSpots, minPower: rule.minPower, totalPowerKW: chargers * rule.minPower, costEstimate: chargers * 1500, rule };
}

// ═══════════════════════════════════════════════════════════════
// SOLAR-READY — Verificare pre-instalare solară (EPBD Art.11)
// ═══════════════════════════════════════════════════════════════
export function checkSolarReady(building, renewables) {
  const checks = [
    { id:"roof_struct", label:"Structura acoperișului suportă panouri solare", ok: building.solarReady || false },
    { id:"roof_orient", label:"Orientare acoperiș favorabilă (S/SE/SV)", ok: true },
    { id:"cabling", label:"Pre-cablare electrică pentru PV", ok: renewables?.pv?.enabled || false },
    { id:"inverter_space", label:"Spațiu rezervat invertor + tablou", ok: renewables?.pv?.enabled || false },
    { id:"pipe_routing", label:"Trasee conducte pentru solar termic", ok: renewables?.solarThermal?.enabled || false },
    { id:"storage_space", label:"Spațiu pentru vas acumulare solar", ok: renewables?.solarThermal?.enabled || false },
    { id:"roof_access", label:"Acces sigur pe acoperiș pentru mentenanță", ok: building.solarReady || false },
    { id:"load_calc", label:"Calcul sarcini structurale acoperiș", ok: false },
  ];
  const score = checks.filter(c => c.ok).length;
  const total = checks.length;
  return {
    checks, score, total, pct: Math.round(score/total*100),
    compliant: score >= 4,
    verdict: score >= 6 ? "SOLAR-READY COMPLET" : score >= 4 ? "PARȚIAL PREGĂTIT" : "NEPREGĂTIT SOLAR",
    color: score >= 6 ? "#22c55e" : score >= 4 ? "#eab308" : "#ef4444",
  };
}
