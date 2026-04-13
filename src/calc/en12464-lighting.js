// ═══════════════════════════════════════════════════════════════
// EN 12464-1:2021 — ILUMINAT LOCURI DE MUNCĂ (interior)
// Complement la EN 15193-1 (LENI) utilizat în Mc 001-2022
// ═══════════════════════════════════════════════════════════════
// Cerințe fotometrice per tip activitate:
//   Ēm  = iluminanță medie menținută [lux]
//   UGR = indice de orbire unificat (max)
//   Ra  = indice de redare a culorii (min)
//   U₀  = uniformitate (min)
// ═══════════════════════════════════════════════════════════════

// ── Tabel 5.2-5.56 EN 12464-1:2021 — Cerințe iluminare pe activitate ──
export const LIGHTING_REQUIREMENTS = {
  // === BIROURI ===
  birouri_general:        { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Birou general, scriere, citire" },
  birouri_desen_tehnic:   { Em: 750, UGR: 16, Ra: 80, U0: 0.70, label: "Birou desen tehnic/CAD" },
  sala_conferinte:        { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Sală conferințe" },
  receptie:               { Em: 300, UGR: 22, Ra: 80, U0: 0.60, label: "Recepție, hol" },
  arhiva:                 { Em: 200, UGR: 25, Ra: 80, U0: 0.40, label: "Arhivă, depozit documente" },

  // === EDUCAȚIE ===
  clasa:                  { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Sală de clasă" },
  clasa_seara:            { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Sală de clasă — cursuri serale" },
  tabla_interactiva:      { Em: 500, UGR: 19, Ra: 80, U0: 0.70, label: "Zonă tablă/ecran interactiv" },
  laborator:              { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Laborator" },
  biblioteca_lectura:     { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Bibliotecă — zonă lectură" },
  biblioteca_rafturi:     { Em: 200, UGR: 19, Ra: 80, U0: 0.60, label: "Bibliotecă — rafturi" },
  sala_sport:             { Em: 300, UGR: 22, Ra: 80, U0: 0.60, label: "Sală sport" },

  // === SĂNĂTATE ===
  salon_spital:           { Em: 100, UGR: 19, Ra: 80, U0: 0.40, label: "Salon spital (general)" },
  salon_examinare:        { Em: 300, UGR: 19, Ra: 80, U0: 0.60, label: "Salon examinare" },
  sala_operatie:          { Em: 1000, UGR: 19, Ra: 90, U0: 0.60, label: "Sală operație (general)" },
  sala_operatie_camp:     { Em: 40000, UGR: null, Ra: 90, U0: 0.70, label: "Sală operație (câmp operator)" },
  terapie_intensiva:      { Em: 300, UGR: 19, Ra: 90, U0: 0.60, label: "Terapie intensivă" },
  farmacie:               { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Farmacie" },
  cabinet_dental:         { Em: 500, UGR: 16, Ra: 90, U0: 0.60, label: "Cabinet dentar" },

  // === COMERȚ ===
  magazin_general:        { Em: 300, UGR: 22, Ra: 80, U0: 0.40, label: "Magazin — zonă generală" },
  magazin_casa:           { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Magazin — casă de marcat" },
  supermarket:            { Em: 500, UGR: 22, Ra: 80, U0: 0.40, label: "Supermarket" },
  depozit_comercial:      { Em: 100, UGR: 25, Ra: 60, U0: 0.40, label: "Depozit comercial" },

  // === INDUSTRIE ===
  atelier_mecanic:        { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Atelier mecanic" },
  atelier_precizie:       { Em: 750, UGR: 16, Ra: 80, U0: 0.70, label: "Atelier precizie fină" },
  linie_asamblare:        { Em: 500, UGR: 22, Ra: 80, U0: 0.60, label: "Linie asamblare" },
  hala_productie:         { Em: 300, UGR: 22, Ra: 80, U0: 0.60, label: "Hală producție generală" },
  control_calitate:       { Em: 750, UGR: 16, Ra: 90, U0: 0.70, label: "Control calitate" },
  depozit_industrial:     { Em: 100, UGR: 25, Ra: 60, U0: 0.40, label: "Depozit industrial" },
  laborator_chimic:       { Em: 500, UGR: 19, Ra: 80, U0: 0.60, label: "Laborator chimic" },

  // === HOTEL / RESTAURANT ===
  hotel_lobby:            { Em: 300, UGR: 22, Ra: 80, U0: 0.40, label: "Hotel — lobby/recepție" },
  hotel_camera:           { Em: 200, UGR: 22, Ra: 80, U0: 0.40, label: "Hotel — cameră" },
  restaurant:             { Em: 200, UGR: 22, Ra: 80, U0: 0.40, label: "Restaurant" },
  bucatarie_profesionala: { Em: 500, UGR: 22, Ra: 80, U0: 0.60, label: "Bucătărie profesională" },

  // === SPAȚII COMUNE ===
  coridor:                { Em: 100, UGR: 25, Ra: 80, U0: 0.40, label: "Coridor, hol circulație" },
  scara:                  { Em: 150, UGR: 25, Ra: 80, U0: 0.40, label: "Scară, casă de scară" },
  toaleta:                { Em: 200, UGR: 25, Ra: 80, U0: 0.40, label: "Toaletă, grup sanitar" },
  sala_tehnica:           { Em: 200, UGR: 25, Ra: 80, U0: 0.40, label: "Sală tehnică, centrală termică" },
  parcare_interioara:     { Em: 75,  UGR: 25, Ra: 40, U0: 0.40, label: "Parcare interioară" },
  rampa_parcare:          { Em: 300, UGR: 25, Ra: 40, U0: 0.40, label: "Rampă acces parcare" },

  // === REZIDENȚIAL (complement) ===
  living:                 { Em: 300, UGR: 22, Ra: 80, U0: 0.40, label: "Living / cameră zi" },
  dormitor:               { Em: 150, UGR: 22, Ra: 80, U0: 0.40, label: "Dormitor" },
  bucatarie:              { Em: 500, UGR: 22, Ra: 80, U0: 0.60, label: "Bucătărie" },
  baie:                   { Em: 200, UGR: 22, Ra: 80, U0: 0.40, label: "Baie" },
};

// Mapare categorie clădire → zone tipice de iluminat
export const BUILDING_LIGHTING_ZONES = {
  BI: ["birouri_general", "sala_conferinte", "receptie", "coridor", "toaleta", "arhiva"],
  ED: ["clasa", "laborator", "biblioteca_lectura", "biblioteca_rafturi", "sala_sport", "coridor"],
  SA: ["salon_spital", "salon_examinare", "terapie_intensiva", "coridor", "farmacie", "sala_tehnica"],
  HC: ["hotel_lobby", "hotel_camera", "restaurant", "bucatarie_profesionala", "coridor", "toaleta"],
  CO: ["magazin_general", "magazin_casa", "depozit_comercial", "coridor"],
  SP: ["sala_sport", "coridor", "toaleta", "receptie"],
  IN: ["hala_productie", "atelier_mecanic", "control_calitate", "depozit_industrial", "sala_tehnica"],
  RI: ["living", "dormitor", "bucatarie", "baie", "coridor"],
  RC: ["living", "dormitor", "bucatarie", "baie", "coridor", "scara"],
  RA: ["living", "dormitor", "bucatarie", "baie", "coridor"],
  AL: ["coridor", "toaleta", "birouri_general", "sala_conferinte"],
};

// ── Tipuri corpuri de iluminat + eficacitate [lm/W] ──
export const LUMINAIRE_TYPES = {
  incandescent:       { efficacy: 12,  label: "Incandescent (bec clasic)",        phase_out: true },
  halogen:            { efficacy: 18,  label: "Halogen",                           phase_out: true },
  fluorescent_T8:     { efficacy: 75,  label: "Fluorescent T8 (36W)",              phase_out: false },
  fluorescent_T5:     { efficacy: 95,  label: "Fluorescent T5 (28W)",              phase_out: false },
  cfl:                { efficacy: 60,  label: "Compact fluorescent (CFL)",         phase_out: false },
  led_standard:       { efficacy: 120, label: "LED standard (2020+)",              phase_out: false },
  led_premium:        { efficacy: 160, label: "LED premium (eficacitate înaltă)",  phase_out: false },
  led_tunable:        { efficacy: 130, label: "LED tunable white (HCL)",           phase_out: false },
  hid_hps:            { efficacy: 90,  label: "HPS (sodiu înaltă presiune)",       phase_out: true },
  hid_mh:             { efficacy: 80,  label: "Metal halide",                      phase_out: false },
};

// ── Tipuri control iluminat + factori reducere ──
export const LIGHTING_CONTROL = {
  manual:       { f: 1.00, label: "Comutator manual ON/OFF" },
  programat:    { f: 0.90, label: "Programator orar" },
  prezenta:     { f: 0.75, label: "Senzor prezență (PIR/US)" },
  daylight:     { f: 0.70, label: "Reglaj lumină naturală (dimming)" },
  prez_day:     { f: 0.60, label: "Prezență + lumină naturală" },
  dali:         { f: 0.55, label: "DALI — control digital adresabil" },
  bms:          { f: 0.50, label: "BMS integrat (BACS clasa A)" },
};

/**
 * Calcul putere instalată necesară per zonă
 * @param {string} zoneType - Tipul zonei din LIGHTING_REQUIREMENTS
 * @param {number} area_m2 - Suprafața zonei [m²]
 * @param {string} luminaireType - Tipul corpului de iluminat
 * @param {number} maintenanceFactor - Factor mentenanță (0.5-0.9, implicit 0.8)
 * @param {number} utilizationFactor - Factor utilizare (0.3-0.7, implicit 0.5)
 * @returns {object} Putere instalată, număr corpuri, verificare conformitate
 */
export function calcZoneLighting(zoneType, area_m2, luminaireType = "led_standard", maintenanceFactor = 0.8, utilizationFactor = 0.5) {
  const req = LIGHTING_REQUIREMENTS[zoneType];
  if (!req || !area_m2) return null;

  const lum = LUMINAIRE_TYPES[luminaireType] || LUMINAIRE_TYPES.led_standard;

  // Flux luminos necesar [lm] = Em × A / (MF × UF)
  const phi_total = req.Em * area_m2 / (maintenanceFactor * utilizationFactor);

  // Putere instalată necesară [W]
  const P_installed = phi_total / lum.efficacy;

  // Densitate putere [W/m²]
  const p_density = P_installed / area_m2;

  // Referință LENI (EN 15193-1) — putere specifică maximă
  const p_leni_max = req.Em <= 200 ? 8 : req.Em <= 500 ? 12 : 16; // W/m²

  return {
    zoneType, zoneLabel: req.label,
    area_m2,
    Em_required: req.Em,
    UGR_max: req.UGR,
    Ra_min: req.Ra,
    U0_min: req.U0,
    luminaireType, luminaireLabel: lum.label,
    efficacy_lm_W: lum.efficacy,
    phi_total_lm: Math.round(phi_total),
    P_installed_W: Math.round(P_installed),
    p_density_W_m2: Math.round(p_density * 10) / 10,
    p_leni_max_W_m2: p_leni_max,
    conform_density: p_density <= p_leni_max,
    phase_out_warning: lum.phase_out ? `${lum.label} — eliminat progresiv (Reg. UE 2019/2020)` : null,
  };
}

/**
 * Calcul LENI complet clădire — EN 15193-1 + EN 12464-1
 * @param {string} category - Categoria clădirii (BI, ED, SA, etc.)
 * @param {number} Au - Suprafață utilă [m²]
 * @param {object} params - Parametri iluminat
 * @returns {object} LENI [kWh/(m²·an)], putere instalată, conformitate
 */
export function calcBuildingLENI(category, Au, params = {}) {
  if (!Au || Au <= 0) return null;

  const {
    luminaireType = "led_standard",
    controlType = "prezenta",
    maintenanceFactor = 0.8,
    dayUseHours = 2500,          // ore utilizare pe an (zilnice)
    nightUseHours = 250,         // ore funcționare nocturnă
    parasitePower_W_m2 = 0.5,    // putere standby (transformatoare, indicatoare, etc.)
    emergencyFactor = 0.03,      // 3% pentru iluminat de urgență
    zones = null,                 // zone personalizate [{type, area_m2}]
  } = params;

  const ctrl = LIGHTING_CONTROL[controlType] || LIGHTING_CONTROL.manual;

  // Zone standard per categorie, sau personalizate
  const buildingZones = zones || (BUILDING_LIGHTING_ZONES[category] || ["birouri_general"]).map(z => ({
    type: z,
    area_m2: Au / (BUILDING_LIGHTING_ZONES[category]?.length || 1),
  }));

  // Calcul per zonă
  let P_total = 0;
  const zoneResults = buildingZones.map(z => {
    const result = calcZoneLighting(z.type, z.area_m2, luminaireType, maintenanceFactor);
    if (result) P_total += result.P_installed_W;
    return result;
  }).filter(Boolean);

  // Putere specifică medie [W/m²]
  const pn = P_total / Au;

  // LENI [kWh/(m²·an)] — EN 15193-1 Eq.1
  // LENI = (P_lighting × tD × FO × FD + P_lighting × tN × FO) / A + P_parasitic × t_year / A
  const FO = ctrl.f;                    // factor ocupare (control)
  const FD = controlType.includes("day") || controlType === "dali" || controlType === "bms" ? 0.75 : 1.0; // factor lumină zilei
  const tD = dayUseHours;
  const tN = nightUseHours;

  const W_lighting = (P_total * tD * FO * FD + P_total * tN * FO) / 1000; // kWh/an
  const W_parasitic = parasitePower_W_m2 * Au * 8760 / 1000;              // kWh/an
  const W_emergency = P_total * emergencyFactor * 8760 / 1000;            // kWh/an

  const W_total = W_lighting + W_parasitic + W_emergency;
  const LENI = W_total / Au;

  // Referință LENI maxim per categorie (EN 15193-1 Tab.NA.1 + Mc 001-2022)
  const LENI_MAX = {
    BI: 25, ED: 20, SA: 35, HC: 25, CO: 35, SP: 20, IN: 20,
    RI: 12, RC: 12, RA: 12, AL: 20,
  };
  const leni_max = LENI_MAX[category] || 25;

  return {
    category,
    Au,
    luminaireType,
    controlType, controlLabel: ctrl.label,
    controlFactor: ctrl.f,

    // Rezultate per zonă
    zones: zoneResults,

    // Totale
    P_total_W: Math.round(P_total),
    P_specific_W_m2: Math.round(pn * 10) / 10,
    W_lighting_kWh: Math.round(W_lighting),
    W_parasitic_kWh: Math.round(W_parasitic),
    W_emergency_kWh: Math.round(W_emergency),
    W_total_kWh: Math.round(W_total),

    // LENI
    LENI: Math.round(LENI * 10) / 10,
    LENI_max: leni_max,
    conform_LENI: LENI <= leni_max,

    // Verdict
    verdict: LENI <= leni_max * 0.7 ? "EXCELENT — iluminat foarte eficient" :
             LENI <= leni_max ? "CONFORM — LENI sub limita maximă" :
             `NECONFORM — LENI ${Math.round(LENI)} depășește maximul ${leni_max} kWh/(m²·an)`,
    color: LENI <= leni_max * 0.7 ? "#22c55e" : LENI <= leni_max ? "#eab308" : "#ef4444",
    reference: "EN 12464-1:2021 + EN 15193-1:2017 + Mc 001-2022",
  };
}
