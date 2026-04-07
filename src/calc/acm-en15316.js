// ═══════════════════════════════════════════════════════════════
// ACM DETALIAT — SR EN 15316-3:2017 (distribuție ACM)
//                SR EN 15316-5:2017 (stocare ACM)
//                SR EN 15316-4-3:2017 (generare solar)
// Pierderi distribuție, stocare, circulație, acoperire solară
// ═══════════════════════════════════════════════════════════════

// Consum specific ACM [L/zi·persoană] — SR EN 15316-3 Tab.B.1 + Mc 001-2022
export const ACM_CONSUMPTION_SPECIFIC = {
  RI:  { low: 45, med: 60,  high: 80  }, // casă individuală
  RC:  { low: 40, med: 55,  high: 70  }, // bloc rezidențial
  RA:  { low: 40, med: 55,  high: 70  }, // apartament
  BI:  { low: 5,  med: 8,   high: 12  }, // birouri (L/persoană·zi)
  ED:  { low: 6,  med: 10,  high: 15  }, // educație
  SA:  { low: 60, med: 90,  high: 150 }, // spital (L/pat·zi)
  HC:  { low: 70, med: 100, high: 150 }, // hotel (L/cameră·zi)
  CO:  { low: 3,  med: 5,   high: 8   }, // comerț
  SP:  { low: 20, med: 35,  high: 60  }, // sport (L/pers·ședință)
  AL:  { low: 20, med: 35,  high: 50  },
};

// Temperatura apă rece rețea [°C] pe zone climatice Romania
export const T_COLD_BY_ZONE = {
  I: 12, II: 11, III: 10, IV: 9, V: 8,
};

// ── Pierderi distribuție ACM ────────────────────────────────────
// Factori pierderi distribuție EN 15316-3 Tab.7 (fracție din Q_demand)
export const DISTRIBUTION_LOSS_FACTORS = {
  // [izolat: bool, circulatie: bool] → fracție pierderi
  fara_izolatie_fara_circ:    0.25, // conductă neizolată, fără circulație
  fara_izolatie_cu_circ:      0.35, // conductă neizolată, cu circulație
  cu_izolatie_fara_circ:      0.10, // conductă izolată, fără circulație
  cu_izolatie_cu_circ:        0.18, // conductă izolată, cu circulație
  izolatie_inalta_fara_circ:  0.05, // izolație înaltă (>50mm), fără circulație
  izolatie_inalta_cu_circ:    0.10, // izolație înaltă (>50mm), cu circulație
};

// ── Pierderi stocare ACM ────────────────────────────────────────
// EN 15316-5: pierderi vasul acumulator [kWh/24h per litru] → f(volum, izolație)
function calcStorageStandbyLoss(volumeL, insulationClass) {
  // Standing heat loss [kWh/24h] per EN 50440 ecodesign label 2017
  // Izolație A: top 30%, B: 70%, C: bottom
  const insulFactor = insulationClass === "A" ? 0.45 : insulationClass === "B" ? 0.70 : 1.00;
  // Formula EN 50440: Q_loss = (0.45 × V^0.5 + 0.007 × V) × insulFactor [kWh/24h]
  const q_loss_24h = (0.45 * Math.pow(volumeL, 0.5) + 0.007 * volumeL) * insulFactor;
  return q_loss_24h; // kWh/24h
}

// ── Pierderi sistem circulație ──────────────────────────────────
function calcCirculationLoss(pipeLength_m, pipeDiameter_mm, hasInsulation, deltaT_K) {
  // Pierdere linie circulație [W/m] per EN ISO 12241 simplificat
  const lambda_pipe = 0.035; // izolație EPE/AF (λ = 35 mW/(m·K))
  const r_ins = hasInsulation ? (pipeDiameter_mm / 2 + 30) / 1000 : (pipeDiameter_mm / 2) / 1000; // raza exterioară cu izolație
  const r_pipe = (pipeDiameter_mm / 2) / 1000;
  const U_lin = hasInsulation
    ? 2 * Math.PI * lambda_pipe / Math.log(r_ins / r_pipe) // W/(m·K) cu izolație
    : 15; // W/(m·K) fără izolație (aproximare)
  const q_lin = U_lin * deltaT_K; // W/m
  return q_lin * pipeLength_m; // W → convertit la kWh/an în calcul final
}

// ── CALCUL PRINCIPAL ACM EN 15316 ──────────────────────────────
export function calcACMen15316(params) {
  const {
    category,          // cod categorie clădire
    nPersons,          // număr persoane / paturi / camere
    consumptionLevel,  // "low" | "med" | "high"
    tSupply,           // temperatura de livrare ACM [°C] (default 55°C)
    climateZone,       // zona climatică "I"-"V"
    climate,           // date climatice (temp lunare)

    // Distribuție
    hasPipeInsulation, // conductă izolată?
    hasCirculation,    // pompa circulație?
    insulationClass,   // "A" | "B" | "C" (calitate izolație boiler)
    pipeLength_m,      // lungime rețea distribuție [m] (default estimat)
    pipeDiameter_mm,   // diametru conductă [mm] (default 22)

    // Stocare
    storageVolume_L,   // volum boiler acumulator [L]

    // Sursă generare
    acmSource,         // "ct_gaz" | "boiler_electric" | "solar_termic" | "termoficare" | "pc"
    etaGenerator,      // randament generator (0.7-1.0)
    copACM,            // COP pentru pompă de căldură ACM (2.0-3.5)

    // Solar termic (dacă există)
    solarFraction,     // fracție solară anuală [0-1] (din solar-acm-detailed.js)
  } = params;

  if (!nPersons || nPersons <= 0) return null;

  const tSup = tSupply || 55;
  const zone = climateZone || "III";
  const tCold = T_COLD_BY_ZONE[zone] || 10;
  const consumSpec = ACM_CONSUMPTION_SPECIFIC[category] || ACM_CONSUMPTION_SPECIFIC.AL;
  const q_specific_L = consumSpec[consumptionLevel || "med"];
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNames = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];

  // ─── 1. NECESAR TERMIC BRUT ────────────────────────────────
  // Q_ACM_nd [kWh/an] = nPersons × q_specific × 365 × ρ×c×ΔT / 3600
  const rho_c = 4186 / 3600; // [Wh/(L·K)] = 1.163 Wh/(L·K)
  const Q_nd_daily_kWh = nPersons * q_specific_L * rho_c * (tSup - tCold) / 1000; // kWh/zi
  const Q_nd_annual_kWh = Q_nd_daily_kWh * 365;

  // Distribuție lunară cu variație sezonieră apă rece
  const monthlyTcold = (climate?.temp_month || []).map((_, i) => {
    // Apa rece e mai caldă vara (+3°C), mai rece iarna (-2°C) față de medie
    const correction = i >= 5 && i <= 8 ? 3 : i >= 11 || i <= 1 ? -2 : 0;
    return Math.max(2, tCold + correction);
  });

  const monthly = monthNames.map((name, i) => {
    const tc = monthlyTcold[i] || tCold;
    const q_nd = nPersons * q_specific_L * days[i] * rho_c * (tSup - tc) / 1000;
    return { month: name, days: days[i], tCold: tc, q_nd: Math.round(q_nd * 10) / 10 };
  });

  // ─── 2. PIERDERI DISTRIBUȚIE ───────────────────────────────
  // Selectare factor pierderi
  const insClass = hasPipeInsulation ? "cu_izolatie" : "fara_izolatie";
  const circClass = hasCirculation ? "cu_circ" : "fara_circ";
  const lossKey = `${insClass}_${circClass}`;
  let f_dist = DISTRIBUTION_LOSS_FACTORS[lossKey] || DISTRIBUTION_LOSS_FACTORS.cu_izolatie_fara_circ;

  // Pierderi conducte calculate (dacă se cunoaște lungimea)
  const pipeLen = pipeLength_m || Math.sqrt(nPersons * q_specific_L * 10); // estimare
  const pipeDiam = pipeDiameter_mm || 22;
  const deltaT_dist = tSup - 25; // diferență față de temperatură ambient coridoare
  const Q_dist_pipe_W = calcCirculationLoss(pipeLen, pipeDiam, hasPipeInsulation, deltaT_dist);
  const Q_dist_pipe_kWh = Q_dist_pipe_W * 8760 / 1000;

  // Pierderi distribuție totale
  const Q_dist_kWh = Math.max(Q_nd_annual_kWh * f_dist, Q_dist_pipe_kWh);

  // ─── 3. PIERDERI STOCARE ───────────────────────────────────
  const vol_L = storageVolume_L || nPersons * 50; // 50L/persoană default
  const q_standby = calcStorageStandbyLoss(vol_L, insulationClass || "B");
  const Q_storage_kWh = q_standby * 365;

  // ─── 4. NECESARUL LA GENERATOR ────────────────────────────
  // Q_gen = Q_nd + Q_dist + Q_storage (energy in = demand + all losses)
  const solarF = solarFraction || 0;
  const Q_gen_before_solar = Q_nd_annual_kWh + Q_dist_kWh + Q_storage_kWh;
  const Q_solar_contribution = Q_gen_before_solar * solarF;
  const Q_gen_needed = Q_gen_before_solar * (1 - solarF);

  // ─── 5. ENERGIE FINALĂ LA SURSĂ ───────────────────────────
  let Q_final_kWh, eta_gen;
  if (acmSource === "boiler_electric") {
    eta_gen = 0.95;
    Q_final_kWh = Q_gen_needed / eta_gen;
  } else if (acmSource === "pc") {
    eta_gen = copACM || 2.5;
    Q_final_kWh = Q_gen_needed / eta_gen;
  } else if (acmSource === "termoficare") {
    eta_gen = 0.90;
    Q_final_kWh = Q_gen_needed / eta_gen;
  } else if (acmSource === "solar_termic") {
    eta_gen = 0.70;
    Q_final_kWh = Q_gen_needed / eta_gen;
  } else {
    // Cazan gaz / GPL
    eta_gen = etaGenerator || 0.87;
    Q_final_kWh = Q_gen_needed / eta_gen;
  }

  // ─── 6. EFICIENȚĂ SISTEM ──────────────────────────────────
  const eta_system = Q_nd_annual_kWh / Q_final_kWh; // eficiență globală
  const f_dist_actual = Q_dist_kWh / Q_gen_before_solar;
  const f_storage_actual = Q_storage_kWh / Q_gen_before_solar;

  // ─── 7. RECOMANDĂRI ───────────────────────────────────────
  const recommendations = [];
  if (f_dist_actual > 0.20) recommendations.push(`Pierderi distribuție ridicate (${Math.round(f_dist_actual*100)}%) — izolați conductele și eliminați circulația nocturnă.`);
  if (f_storage_actual > 0.15) recommendations.push(`Pierderi stocare ridicate (${Math.round(f_storage_actual*100)}%) — înlocuiți boilerul cu clasă energetică A sau reduceți volumul.`);
  if (!hasPipeInsulation && hasCirculation) recommendations.push("Circulație activă pe conductă neizolată — pierderi maxime. Izolați sau montați controller orar.");
  if (vol_L > nPersons * 100) recommendations.push(`Boiler supradimensionat (${vol_L}L / ${nPersons} pers.) — reduceți la ${nPersons * 60}L pentru pierderi mai mici.`);
  if (solarF < 0.30 && category !== "BI") recommendations.push("Fracție solară < 30% — instalarea colectoarelor termice (4-6m²) reduce costurile cu 35-50%.");

  return {
    // Cerere
    q_specific_L,
    Q_nd_annual_kWh: Math.round(Q_nd_annual_kWh),
    Q_nd_daily_kWh: Math.round(Q_nd_daily_kWh * 100) / 100,
    tSupply: tSup, tCold,

    // Pierderi
    Q_dist_kWh: Math.round(Q_dist_kWh),
    Q_storage_kWh: Math.round(Q_storage_kWh),
    f_dist_pct: Math.round(f_dist_actual * 100),
    f_storage_pct: Math.round(f_storage_actual * 100),
    q_standby_kWh_day: Math.round(q_standby * 10) / 10,

    // Solar
    solarFraction_pct: Math.round(solarF * 100),
    Q_solar_kWh: Math.round(Q_solar_contribution),

    // Generator
    Q_gen_needed_kWh: Math.round(Q_gen_needed),
    Q_final_kWh: Math.round(Q_final_kWh),
    eta_gen: Math.round(eta_gen * 100) / 100,
    eta_system: Math.round(eta_system * 100) / 100,

    // Lunar
    monthly,
    vol_L: Math.round(vol_L),

    // Verdict
    recommendations,
    verdict: eta_system >= 0.75 ? "Sistem ACM eficient" :
             eta_system >= 0.55 ? "Eficiență medie — potențial îmbunătățire" :
             "Sistem ineficient — pierderi semnificative",
    color: eta_system >= 0.75 ? "#22c55e" : eta_system >= 0.55 ? "#eab308" : "#ef4444",
    reference: "SR EN 15316-3:2017 + SR EN 15316-5:2017",
  };
}
