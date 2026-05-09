// ═══════════════════════════════════════════════════════════════
// DIMENSIONARE POMPĂ DE CĂLDURĂ + SCOP/SEER SEZONIER
// SR EN 14825:2022 (SCOP/SEER), SR EN 15316-4-2:2017
// Tip: Aer-Apă (A/W), Sol-Apă (G/W), Apă-Apă (W/W)
// ═══════════════════════════════════════════════════════════════

// Sprint Audit Prețuri P2.4 (9 mai 2026) — costuri canonice rehab-prices
import { getPrice } from "../data/rehab-prices.js";

// Temperatura medie lunară de calcul pentru România (date INMH)
// Folosim datele climatice din obiectul climate

// COP la diferite temperaturi exterioare — date tipice per tip pompă
// Conform EN 14825:2022 — teste la temperaturi standard
export const HP_TYPES = [
  {
    id: "AA_STD", label: "Aer-Apă standard (A35W55)", type: "AA",
    // COP [ext_temp: cop] — la regim 55°C agent termic
    cop_curve: { "-15": 1.8, "-10": 2.1, "-7": 2.3, "2": 2.8, "7": 3.2, "10": 3.5, "12": 3.7 },
    seer_curve: { "20": 3.0, "25": 3.5, "30": 3.2, "35": 2.8 },
    t_biv: -7, // temperatura de bivalență [°C] — sub aceasta funcționează cu rezistență
    f_backup: 0.10, // fracție acoperire cu rezistență electrică la temp < t_biv
  },
  {
    id: "AA_HT", label: "Aer-Apă High-Temp (A35W65)", type: "AA",
    cop_curve: { "-15": 1.6, "-10": 1.9, "-7": 2.1, "2": 2.5, "7": 2.9, "10": 3.1, "12": 3.3 },
    seer_curve: { "20": 2.7, "25": 3.1, "30": 2.9, "35": 2.5 },
    t_biv: -7, f_backup: 0.15,
  },
  {
    id: "AA_LT", label: "Aer-Apă Low-Temp (A35W35)", type: "AA",
    cop_curve: { "-15": 2.2, "-10": 2.6, "-7": 2.9, "2": 3.5, "7": 4.0, "10": 4.5, "12": 4.8 },
    seer_curve: { "20": 3.8, "25": 4.2, "30": 3.9, "35": 3.5 },
    t_biv: -15, f_backup: 0.05,
  },
  {
    id: "GA", label: "Sol-Apă (G/W) cu sonde geotermale", type: "GA",
    cop_curve: { "-15": 3.5, "-10": 3.8, "-7": 4.0, "2": 4.3, "7": 4.5, "10": 4.7, "12": 5.0 },
    seer_curve: { "20": 4.5, "25": 4.8, "30": 4.5, "35": 4.2 },
    t_biv: -20, f_backup: 0.02,
  },
  {
    id: "GA_ORIZONTAL", label: "Sol-Apă (G/W) colectori orizontali", type: "GA",
    cop_curve: { "-15": 3.0, "-10": 3.3, "-7": 3.5, "2": 3.9, "7": 4.2, "10": 4.4, "12": 4.6 },
    seer_curve: { "20": 4.0, "25": 4.3, "30": 4.1, "35": 3.8 },
    t_biv: -15, f_backup: 0.03,
  },
  {
    id: "WA", label: "Apă-Apă (W/W) cu apă freatică", type: "WA",
    cop_curve: { "-15": 4.5, "-10": 4.8, "-7": 5.0, "2": 5.5, "7": 6.0, "10": 6.5, "12": 7.0 },
    seer_curve: { "20": 5.0, "25": 5.5, "30": 5.2, "35": 4.8 },
    t_biv: -20, f_backup: 0.01,
  },
];

function interpolateCOP(curve, tExt) {
  const temps = Object.keys(curve).map(Number).sort((a,b) => a-b);
  if (tExt <= temps[0]) return curve[temps[0]];
  if (tExt >= temps[temps.length-1]) return curve[temps[temps.length-1]];
  for (let i = 0; i < temps.length - 1; i++) {
    if (tExt >= temps[i] && tExt <= temps[i+1]) {
      const f = (tExt - temps[i]) / (temps[i+1] - temps[i]);
      return curve[temps[i]] + f * (curve[temps[i+1]] - curve[temps[i]]);
    }
  }
  return 3.0;
}

export function calcSCOP(hpType, climate, phi_H_design, phi_H_annual_kwh) {
  if (!climate || !phi_H_design) return null;
  const hp = HP_TYPES.find(h => h.id === hpType) || HP_TYPES[0];
  const days = [31,28,31,30,31,30,31,31,30,31,30,31];
  const months = climate.temp_month || [];

  let totalElecH = 0, totalHeatH = 0;

  months.forEach((tExt, i) => {
    const hours = days[i] * 24;
    // Sarcina termică lunară estimată (proporțional cu grade-zile)
    const tInt = 20;
    const gdMonth = Math.max(0, (tInt - tExt)) * days[i];
    const gdAnnual = months.reduce((s, t, mi) => s + Math.max(0, (tInt - t)) * days[mi], 0);
    const qH_month = gdAnnual > 0 ? phi_H_annual_kwh * gdMonth / gdAnnual : 0;

    if (qH_month <= 0) return;

    // COP la temperatura medie lunară
    const cop = interpolateCOP(hp.cop_curve, tExt);
    // Fracție cu backup electric (când tExt < t_biv)
    const fBackup = tExt < hp.t_biv ? hp.f_backup : 0;
    const elec = qH_month / cop * (1 - fBackup) + qH_month * fBackup; // kWh electricitate
    totalElecH += elec;
    totalHeatH += qH_month;
  });

  const scop = totalElecH > 0 ? totalHeatH / totalElecH : 3.0;

  return {
    scop: Math.round(scop * 100) / 100,
    totalHeatH_kwh: Math.round(totalHeatH),
    totalElecH_kwh: Math.round(totalElecH),
    hpType: hp.label,
    t_biv: hp.t_biv,
    classification: scop >= 4.5 ? "A+++" : scop >= 3.8 ? "A++" : scop >= 3.2 ? "A+" : scop >= 2.5 ? "A" : "B/C",
    color: scop >= 4.0 ? "#22c55e" : scop >= 3.0 ? "#84cc16" : scop >= 2.5 ? "#eab308" : "#ef4444",
  };
}

// ═══════════════════════════════════════════════════════════════
// DIMENSIONARE SONDE GEOTERMALE — SR EN ISO 13370 + VDI 4640-2
// Calcul lungime sonde verticale / suprafață colectori orizontali
// ═══════════════════════════════════════════════════════════════

// Conductivitate termică sol [W/(m·K)] — tipuri de sol Romania
export const GROUND_TYPES = [
  { id: "argila_umeda",   label: "Argilă umedă",            lambda: 2.0, capacity: 2.0E6 },
  { id: "nisip_umed",     label: "Nisip umed / pietriș",     lambda: 2.4, capacity: 1.8E6 },
  { id: "roca_sedim",     label: "Rocă sedimentară",         lambda: 2.3, capacity: 2.0E6 },
  { id: "roca_dura",      label: "Granit / rocă cristalină", lambda: 3.0, capacity: 2.2E6 },
  { id: "argila_uscata",  label: "Argilă uscată / loess",    lambda: 1.2, capacity: 1.5E6 },
  { id: "nisip_uscat",    label: "Nisip uscat",              lambda: 0.8, capacity: 1.3E6 },
  { id: "sol_mixt",       label: "Sol mixt (medie)",         lambda: 1.8, capacity: 1.9E6 },
];

// Extracție termică specifică [W/m] funcție de conductivitate — VDI 4640-2 Tab.4
function getSpecificExtraction(lambda_s, operatingHoursPerYear) {
  // Relație empirică VDI 4640: q_s ≈ f(λ, ore funcționare)
  const h = operatingHoursPerYear || 2400;
  const baseFactor = h <= 1800 ? 1.2 : h <= 2400 ? 1.0 : h <= 3600 ? 0.85 : 0.70;
  // q_s [W/m] = 8 × λ^0.75 × factorOre
  return 8 * Math.pow(lambda_s, 0.75) * baseFactor;
}

export function calcBoreholeSizing(params) {
  const {
    phi_H_design_kW,   // sarcină termică de vârf [kW]
    phi_H_annual_kwh,  // consum anual încălzire [kWh/an]
    scop,              // SCOP sezonier (pompă)
    groundTypeId,      // ID tip sol
    boreholeDepth,     // adâncime sondă [m] (50-200m)
    nBoreholes,        // număr sonde (1-20)
    operatingHours,    // ore funcționare/an (1800-3600)
    horizontalArea,    // suprafață disponibilă teren [m²] (pt. colectori orizontali)
    hpTypeId,          // ID tip pompă (GA sau GA_ORIZONTAL)
  } = params;

  if (!phi_H_design_kW) return null;

  const ground = GROUND_TYPES.find(g => g.id === groundTypeId) || GROUND_TYPES[6];
  const lambda_s = ground.lambda;
  const h_op = operatingHours || 2400;
  const scop_val = scop || 4.0;

  // Putere extrasă din sol [kW] = Φ_H × (1 - 1/SCOP)
  const phi_ground_kW = phi_H_design_kW * (1 - 1 / scop_val);

  // Extracție termică specifică [W/m] — VDI 4640
  const q_specific_Wm = getSpecificExtraction(lambda_s, h_op);

  // ── SONDE VERTICALE ──────────────────────────────────
  // Lungime totală sonde [m] = Φ_sol[W] / q_specific[W/m]
  const totalBoreholeLength_m = (phi_ground_kW * 1000) / q_specific_Wm;
  const depth = boreholeDepth || 100; // m adâncime per sondă
  const nBH = nBoreholes || Math.ceil(totalBoreholeLength_m / depth);
  const actualDepth = Math.ceil(totalBoreholeLength_m / nBH);

  // Distanța minimă între sonde [m] — VDI 4640: min 5m, rec. 6-8m
  const minSpacing_m = Math.max(6, actualDepth * 0.05);
  const footprintArea_m2 = Math.ceil(Math.pow(nBH, 0.5) * (minSpacing_m + 2)) ** 2;

  // ── COLECTORI ORIZONTALI ─────────────────────────────
  // q_specific_orizontal: 10-35 W/m² (mai mică decât sonde)
  const q_horiz_Wm2 = lambda_s >= 2.0 ? 25 : lambda_s >= 1.5 ? 20 : 15; // W/m²
  const neededArea_m2 = (phi_ground_kW * 1000) / q_horiz_Wm2;
  const availableArea = horizontalArea || 0;
  const horizFeasible = availableArea >= neededArea_m2 * 0.9;

  // ── VOLUM GROUTING / COST ────────────────────────────
  const groutingVolume_L = nBH * actualDepth * 3.14 * 0.075 * 0.075 * 1000; // tuburi DN150
  const costPerMeter = lambda_s >= 2.5 ? 85 : 75; // EUR/m forare
  const costBorehole = nBH * actualDepth * costPerMeter;
  // Sprint Audit Prețuri P2.4 — preț canonic HP aer-apă (per kW): rehab-prices.heating.hp_aw_12kw mid 9000 EUR / 12 kW = 750 EUR/kW.
  // HP sol-apă include rețea hidraulică suplimentară (pompă, vas tampon mai mare) — mid +20% peste aer-apă tipic.
  // Folosim 750 (mid) ca proxy aer-apă, dar permitem fallback canonic gen 600 (anterior hardcoded ≈ low).
  const hpUnitEUR = (() => {
    const mid12 = getPrice("heating", "hp_aw_12kw", "mid")?.price;
    return mid12 ? mid12 / 12 : 750; // EUR/kW
  })();
  const costEquipment = phi_H_design_kW * hpUnitEUR;
  const costTotal = costBorehole + costEquipment;

  // ── VERIFICARE TEMPERATURĂ FLUID ─────────────────────
  // Temperatura medie fluid (tur/retur) — min. admisă: -5°C (glicol) / +1°C (apa)
  const t_fluid_avg = 5 - (phi_ground_kW / (actualDepth * nBH * q_specific_Wm / 1000)) * 2;

  // ── ENERGIE EXTRASĂ ANUAL ────────────────────────────
  const annualGround_kwh = phi_H_annual_kwh ? phi_H_annual_kwh * (1 - 1 / scop_val) : phi_ground_kW * h_op;

  return {
    groundType: ground.label,
    lambda_s,
    phi_ground_kW: Math.round(phi_ground_kW * 10) / 10,
    q_specific_Wm: Math.round(q_specific_Wm * 10) / 10,

    // Sonde verticale
    totalBoreholeLength_m: Math.round(totalBoreholeLength_m),
    nBoreholes: nBH,
    boreholeDepth_m: actualDepth,
    minSpacing_m: Math.round(minSpacing_m * 10) / 10,
    footprintArea_m2: Math.round(footprintArea_m2),
    t_fluid_avg: Math.round(t_fluid_avg * 10) / 10,

    // Colectori orizontali
    neededHorizArea_m2: Math.round(neededArea_m2),
    q_horiz_Wm2,
    horizFeasible,

    // Cost
    costBorehole: Math.round(costBorehole),
    costEquipment: Math.round(costEquipment),
    costTotal: Math.round(costTotal),
    annualGround_kwh: Math.round(annualGround_kwh),

    // Avertizări
    warnings: [
      t_fluid_avg < -3 ? "Temperatura fluid sub -3°C — necesită soluție antiîngheț concentrată (propilenglicol ≥35%)." : null,
      nBH > 10 ? "Număr mare sonde — recomandăm testare termică de răspuns (TRT) pe 72h." : null,
      footprintArea_m2 > 2000 ? "Suprafață foraj > 2000m² — verificați posibila interferență termică între sonde (λ_s scăzut)." : null,
    ].filter(Boolean),
    recommendation: `${nBH} sondă/e × ${actualDepth}m (${Math.round(totalBoreholeLength_m)}m total) — sol: ${ground.label} [λ=${lambda_s} W/(m·K)]`,
    referinta: "SR EN ISO 13370:2017 + VDI 4640-2:2001",
  };
}

export function calcHeatPumpSizing(params) {
  const {
    phi_H_design,   // sarcina termică de vârf [W] din EN 12831
    phi_C_design,   // sarcina de răcire de vârf [W] (opțional)
    phi_H_annual,   // consum anual încălzire [kWh/an]
    hpTypeId,       // ID tip pompă căldură
    climate,        // date climatice
    emissionSystem, // tip sistem distribuție (pardoseală = 35°C, radiatoare = 55°C)
    Au,             // arie utilă
  } = params;

  if (!phi_H_design || !climate) return null;

  const hp = HP_TYPES.find(h => h.id === hpTypeId) || HP_TYPES[0];

  // ─── Putere nominală selectată ───
  // EN 14825: putere la A2/W35 (standard) — adăugare 10% siguranță
  const phi_nom_kW = Math.ceil((phi_H_design / 1000) * 1.10);

  // Temperatura agent termic recomandată per sistem de distribuție
  const agentTemp = emissionSystem === "PARD" ? 35 : emissionSystem === "PERE" ? 40 : 55;
  const agentLabel = agentTemp <= 35 ? "Joasă (<45°C) — compatibil pardoseală" :
                     agentTemp <= 45 ? "Medie (45-55°C) — ventiloconvectoare" :
                     "Înaltă (>55°C) — radiatoare existente";

  // ─── SCOP sezonier ───
  const scopResult = calcSCOP(hpTypeId, climate, phi_H_design, phi_H_annual || phi_H_design * 2000 / 1000);

  // ─── SEER (răcire) ───
  let seer = null;
  if (phi_C_design) {
    const tExtSummer = Math.max.apply(null, (climate.temp_month || []).slice(5, 8));
    const seerKey = String(Math.round(tExtSummer / 5) * 5);
    seer = hp.seer_curve[seerKey] || hp.seer_curve["35"] || 3.5;
  }

  // ─── Cost estimat total instalare ───
  // Sprint Audit Prețuri P2.4 — canonic rehab-prices pentru HP aer-apă (default).
  // GA = gas absorption (1800 EUR/kW) — schemă specializată, nu e în rehab-prices, păstrată hardcodată.
  const costPerKw = hp.type === "GA"
    ? 1800
    : (getPrice("heating", "hp_aw_12kw", "mid")?.price / 12 || 900); // mid 9000/12 = 750 EUR/kW
  const costTotal = phi_nom_kW * costPerKw;

  // ─── Recomandare dimensionare vas tampon ───
  const vasBuffer_L = Math.max(50, phi_nom_kW * 15); // 15L/kW, minim 50L

  // ─── Recomandare dimensionare boiler ACM ───
  const boilerACM_L = Math.max(200, Au * 1.5); // 1.5L/m² Au, minim 200L

  return {
    phi_nom_kW,
    phi_H_design_kW: Math.round(phi_H_design / 100) / 10,
    hpType: hp.label,
    agentTemp,
    agentTempLabel: agentLabel,
    scop: scopResult,
    seer: seer ? Math.round(seer * 100) / 100 : null,
    costEstimate: Math.round(costTotal),
    costPerKw,
    vasBuffer_L: Math.round(vasBuffer_L),
    boilerACM_L: Math.round(boilerACM_L),
    compatible_floor_heating: agentTemp <= 45,
    recommendation: [
      `Pompă de căldură ${hp.label} — putere nominală recomandată: ${phi_nom_kW} kW`,
      `SCOP sezonier estimat: ${scopResult?.scop || '—'} (${scopResult?.classification || ''})`,
      agentTemp > 45 ? "Atenție: la 55°C eficiența scade. Recomandăm înlocuire radiatoare cu unele mai mari sau trecere la pardoseală." : null,
      hp.t_biv > -15 ? `Backup electric necesar la temperaturi sub ${hp.t_biv}°C.` : null,
    ].filter(Boolean),
  };
}
