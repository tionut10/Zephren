// ═══════════════════════════════════════════════════════════════
// DIMENSIONARE POMPĂ DE CĂLDURĂ + SCOP/SEER SEZONIER
// SR EN 14825:2022 (SCOP/SEER), SR EN 15316-4-2:2017
// Tip: Aer-Apă (A/W), Sol-Apă (G/W), Apă-Apă (W/W)
// ═══════════════════════════════════════════════════════════════

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
  const costPerKw = hp.type === "GA" ? 1800 : 900; // EUR/kW
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
