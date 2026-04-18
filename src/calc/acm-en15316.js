// ═══════════════════════════════════════════════════════════════
// ACM DETALIAT — SR EN 15316-3:2017 (distribuție ACM)
//                SR EN 15316-5:2017 (stocare ACM)
//                SR EN 15316-4-3:2017 (generare solar)
// Pierderi distribuție, stocare, circulație, acoperire solară
// Sprint 3 (2026-04-16): + Legionella + aux electric pompă circulație
// ═══════════════════════════════════════════════════════════════

import { calcLegionellaOverhead } from "./acm-legionella.js";

// Eficiență pompă circulație ACM [W specific per kW termic] — EN 15316-3 Tab.10
export const ACM_PUMP_W_SPECIFIC = {
  veche_neregulata: 0.80,  // IEE E — neregulată, mereu pornită
  standard:         0.50,  // IEE D-C — regulată treptat
  variabila:        0.30,  // IEE B — turație variabilă
  iee_sub_023:      0.20,  // IEE A+ — max eficiență
};

// Consum specific ACM [L/zi·persoană] — SR EN 15316-3 Tab.B.1 + Mc 001-2022 Anexă
// Sprint 4a (17 apr 2026) — extindere conform AUDIT_08 §1.4 + GEx 009-013 MDLPA:
//   + GR/CR (creșă/grădiniță cu cantină), CL/ST (clinică/stomatologie),
//   + DZ (dializă — critic sanitar), SPL (spălătorie ind.), FRM (fermă),
//   + TAB (tabără copii / cabană turism), HO_LUX (hotel 5*), HOSTEL, REST,
//   + SPA_H/W (spa umed/medical), CP (cămine).
export const ACM_CONSUMPTION_SPECIFIC = {
  // ── REZIDENȚIAL ──
  RI:  { low: 45, med: 60,  high: 80  }, // casă individuală [L/pers·zi]
  RC:  { low: 40, med: 55,  high: 70  }, // bloc rezidențial
  RA:  { low: 40, med: 55,  high: 70  }, // apartament

  // ── BIROURI & ADMINISTRATIVE ──
  BI:  { low: 5,  med: 8,   high: 12  }, // birouri [L/pers·zi]
  AD:  { low: 5,  med: 8,   high: 12  }, // administrativ
  BA_OFF: { low: 8, med: 12, high: 18 }, // bancă/oficiu public (cu dușuri personal)

  // ── EDUCAȚIE ── Mc 001 Anexă + GEx 011
  ED:  { low: 6,  med: 10,  high: 15  }, // educație generic [L/elev·zi]
  GR:  { low: 15, med: 25,  high: 35  }, // grădiniță cu cantină+dușuri [L/copil·zi]
  CR:  { low: 20, med: 30,  high: 45  }, // creșă (bebeluși, igienă intensă) [L/copil·zi]
  SC:  { low: 6,  med: 10,  high: 15  }, // școală (fără internat) [L/elev·zi]
  LI:  { low: 6,  med: 10,  high: 15  }, // liceu
  UN:  { low: 8,  med: 12,  high: 18  }, // universitate (laboratoare + sport)
  CP:  { low: 35, med: 50,  high: 75  }, // cămine studențești [L/student·zi]

  // ── SĂNĂTATE ── GEx 012 MDLPA (spitale)
  SA:  { low: 60, med: 90,  high: 150 }, // spital [L/pat·zi]
  SPA_H: { low: 70, med: 100, high: 160 }, // spital specializat (chirurgie, maternitate)
  CL:  { low: 20, med: 35,  high: 55  }, // clinică ambulatoriu [L/pacient·zi]
  ST:  { low: 20, med: 30,  high: 45  }, // clinică stomatologică [L/scaun·zi]
  LB_MED: { low: 15, med: 25, high: 40 }, // laborator medical
  AS_SOC: { low: 45, med: 70, high: 100 }, // centru asistență socială rezidențial
  DZ:  { low: 100, med: 200, high: 300 }, // centru dializă [L/pacient·ședință] — critic sanitar

  // ── HOTELURI & TURISM ── GEx 011 MDLPA (hoteluri)
  HC:  { low: 70, med: 100, high: 150 }, // hotel 3* [L/cameră·zi]
  HO_LUX: { low: 100, med: 130, high: 200 }, // hotel 4-5* (spa+piscină) [L/cameră·zi]
  HOSTEL: { low: 30, med: 50, high: 80 }, // hostel / pensiune agroturistică
  TAB:  { low: 60, med: 80,  high: 120 }, // tabără copii / cabană turism (dușuri comune) [L/pers·zi]

  // ── RESTAURANTE & ALIMENTAȚIE ──
  REST: { low: 8, med: 12,  high: 18  }, // restaurant [L/masă]
  BAR: { low: 4,  med: 6,   high: 10  }, // bar / cafenea
  CANTINE: { low: 10, med: 15, high: 25 }, // cantină (ocupare mare)
  FAST_F: { low: 4, med: 8, high: 12   }, // fast-food

  // ── COMERȚ ──
  CO:  { low: 3,  med: 5,   high: 8   }, // magazin mic [L/angajat·zi]
  MAG: { low: 3,  med: 5,   high: 8   },
  SUPER: { low: 5, med: 8, high: 12   }, // supermarket (pregătire alimente)
  MALL: { low: 4, med: 7, high: 10    },

  // ── SPORT & RECREERE ── dușuri intensiv
  SP:  { low: 20, med: 35,  high: 60  }, // sport generic [L/pers·ședință]
  PSC: { low: 50, med: 75,  high: 120 }, // piscină (dușuri+filtrare) [L/înotător·zi]
  SALA_POL: { low: 15, med: 25, high: 40 }, // sală polivalentă
  FIT: { low: 25, med: 40,  high: 65  }, // fitness / aerobic
  SPA_W: { low: 60, med: 100, high: 180 }, // spa wellness (saună+jacuzzi+dușuri) [L/client·zi]

  // ── CULTURĂ & SPECTACOLE ── consum mic (doar WC personal)
  CIN: { low: 3,  med: 5,   high: 8   }, // cinema [L/spectator·zi]
  TEA: { low: 3,  med: 5,   high: 8   },
  MUZ: { low: 3,  med: 5,   high: 8   },
  BIB: { low: 5,  med: 8,   high: 12  },
  CC:  { low: 5,  med: 10,  high: 15  }, // centru cultural
  EXP: { low: 4,  med: 8,   high: 12  },

  // ── TRANSPORT ── călătorii tranzit
  GARA: { low: 2, med: 4,   high: 6   }, // gară feroviară [L/pasager·zi]
  AER:  { low: 3, med: 6,   high: 10  }, // aeroport (dușuri pasageri business)

  // ── INDUSTRIE & SPECIALE ──
  IU:  { low: 15, med: 30,  high: 50  }, // industrie ușoară [L/angajat·zi]
  HAL: { low: 20, med: 35,  high: 60  }, // hale producție
  DEP: { low: 3,  med: 5,   high: 10  }, // depozit
  LAB_IND: { low: 20, med: 35, high: 55 }, // laborator industrial
  FRG: { low: 3,  med: 5,   high: 10  }, // frigorifice
  SPL: { low: 40, med: 80,  high: 150 }, // spălătorie industrială [L/kg rufe]
  FRM: { low: 30, med: 45,  high: 60  }, // fermă muls mecanizat [L/animal·zi]

  // ── FALLBACK ──
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
// Coeficient transfer termic liniar U_lin [W/(m·K)] — SR EN 15316-3:2017 Anexa B + Tab.B.2
// Sprint 13 (18 apr 2026): FIX bug `U_lin = 15` pentru conductă neizolată (factor ~33×
// supraevaluat). Valoarea fizic corectă este 0.45 W/(m·K) (conductă nudă DN15-DN32, ΔT ~30 K).
// Pentru conducte IZOLATE păstrăm formula analitică EN ISO 12241 (λ/radii, implicit 30 mm EPE),
// care este deja corectă și produce rezultate calibrate. Tabelul U_LIN_CONDUCTA_EN15316 este
// disponibil pentru UI viitor (dropdown grad izolație) — referință EN 15316-3 Tab.B.2.
export const U_LIN_CONDUCTA_EN15316 = Object.freeze({
  neizolat:             0.45, // W/(m·K) — conductă nudă DN15-DN32 (medie, EN 15316-3 §B.2) [FIX S13]
  // Izolat standard (≈ 20 mm EPE, zona rezidențial comun)
  izolat_standard_d15:  0.22,
  izolat_standard_d20:  0.25,
  izolat_standard_d25:  0.30,
  izolat_standard_d32:  0.35,
  // Izolat bun (≈ 30 mm AF, recomandat nZEB/renovare)
  izolat_bun_d15:       0.15,
  izolat_bun_d20:       0.17,
  izolat_bun_d25:       0.20,
  izolat_bun_d32:       0.24,
  // Izolat înalt (≥ 50 mm AF, premium)
  izolat_inalt_d20:     0.12,
  izolat_inalt_d25:     0.14,
  izolat_inalt_d32:     0.16,
});

/**
 * Selectare U_lin [W/(m·K)] conform configurare conductă ACM.
 * Conform SR EN 15316-3:2017 Tab.B.2.
 * @param {object} cfg
 * @param {boolean} cfg.hasInsulation        — conductă izolată?
 * @param {number}  cfg.pipeDiameter_mm      — diametru nominal [mm]
 * @param {string}  [cfg.insulationGrade]    — "standard" | "bun" | "inalt" (fallback "standard")
 * @returns {number} U_lin [W/(m·K)]
 */
export function selectULin(cfg = {}) {
  const { hasInsulation, pipeDiameter_mm, insulationGrade } = cfg;
  if (!hasInsulation) return U_LIN_CONDUCTA_EN15316.neizolat;

  const grade = (insulationGrade === "bun" || insulationGrade === "inalt") ? insulationGrade : "standard";
  const d = Number(pipeDiameter_mm) || 22;

  // Selectare DN aproximat — mapare d → DN din tabel
  let dnKey;
  if (d <= 17) dnKey = "d15";
  else if (d <= 22) dnKey = "d20";
  else if (d <= 28) dnKey = "d25";
  else dnKey = "d32";

  const key = `izolat_${grade}_${dnKey}`;
  return U_LIN_CONDUCTA_EN15316[key] ?? U_LIN_CONDUCTA_EN15316.izolat_standard_d20;
}

function calcCirculationLoss(pipeLength_m, pipeDiameter_mm, hasInsulation, deltaT_K, insulationGrade) {
  // Sprint 13: FIX bug neizolat (15 → 0.45). Două metode per situație:
  //   - neizolat: U_lin tabular 0.45 W/(m·K) [FIX — era hardcodat 15, factor 33× supraevaluat]
  //   - izolat + grad specificat: U_lin tabular din Tab.B.2 (UI viitor)
  //   - izolat + fără grad: formula analitică EN ISO 12241 (λ/radii, 30 mm EPE implicit) — păstrată
  //     pentru continuitate numerică cu baseline-ul S1-S12 (tests calibrate pe această formulă)
  let U_lin;
  if (!hasInsulation) {
    U_lin = U_LIN_CONDUCTA_EN15316.neizolat; // 0.45 W/(m·K) — fix
  } else if (insulationGrade === "bun" || insulationGrade === "inalt" || insulationGrade === "standard") {
    U_lin = selectULin({ hasInsulation, pipeDiameter_mm, insulationGrade });
  } else {
    // Default analitic pentru izolat: EN ISO 12241 cu 30 mm EPE (λ=0.035) — aprox 0.13-0.18 W/(m·K)
    const lambda_pipe = 0.035;
    const r_ins  = (pipeDiameter_mm / 2 + 30) / 1000;
    const r_pipe = (pipeDiameter_mm / 2) / 1000;
    U_lin = 2 * Math.PI * lambda_pipe / Math.log(r_ins / r_pipe);
  }
  const q_lin = U_lin * deltaT_K;   // W/m
  return q_lin * pipeLength_m;       // W (multiplicat cu ore în calcul final → kWh/an)
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

    // Override consum (dacă user introduce manual dailyLiters, îl respectăm peste tabel)
    dailyLitersOverride, // L/persoană/zi — override din UI (null → folosește ACM_CONSUMPTION_SPECIFIC)

    // Sprint 3 — pompă circulație ACM (dacă hasCirculation) + Legionella
    circPumpType,      // "veche_neregulata" | "standard" | "variabila" | "iee_sub_023"
    circHours_per_day, // ore/zi recirculare (default 16 dacă hasCirculation, 0 altfel)
    hasLegionella,     // tratament termic periodic activ
    legionellaFreq,    // "weekly" | "daily"
    legionellaT,       // temperatură șoc termic (default 70°C)
  } = params;

  if (!nPersons || nPersons <= 0) return null;

  const tSup = tSupply || 55;
  const zone = climateZone || "III";
  const tCold = T_COLD_BY_ZONE[zone] || 10;
  const consumSpec = ACM_CONSUMPTION_SPECIFIC[category] || ACM_CONSUMPTION_SPECIFIC.AL;
  const q_specific_L = dailyLitersOverride && dailyLitersOverride > 0
    ? parseFloat(dailyLitersOverride)
    : consumSpec[consumptionLevel || "med"];
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
  // storageVolume_L === 0 → explicit "fără stocare" (ex: combi instant, schimbător placi)
  // null / undefined / NaN → folosește default 50 L/persoană
  const hasNoStorage = storageVolume_L === 0;
  const vol_L = hasNoStorage ? 0 : (storageVolume_L > 0 ? storageVolume_L : nPersons * 50);
  const q_standby = vol_L > 0 ? calcStorageStandbyLoss(vol_L, insulationClass || "B") : 0;
  const Q_storage_kWh = q_standby * 365;

  // ─── 4. LEGIONELLA — supliment energetic tratament termic ─
  // Q_legionella = DOAR energia tratamentelor termice periodice.
  // Pierderile standby la T_set > 50°C sunt deja contabilizate în Q_storage_kWh.
  const insulF = insulationClass === "A" ? 0.45 : insulationClass === "B" ? 0.70 : 1.00;
  const legionella = calcLegionellaOverhead({
    volume_L: vol_L,
    T_set: tSup,
    category,
    hasTreatment: !!hasLegionella,
    treatmentFreq: legionellaFreq || (hasLegionella ? "weekly" : "none"),
    T_treatment: parseFloat(legionellaT) || 70,
    insulFactor: insulF,
  });
  const Q_legionella_kWh = legionella.overhead_treatment_kWh || 0;

  // ─── 5. AUXILIAR ELECTRIC — pompă recirculație ACM ─────────
  // W_circ = w_specific × Q_flow_termic × circHours × 365 [kWh/an]
  // Q_flow_termic ≈ Q_nd / (circHours × 365) × factor siguranță 1.3
  let W_circ_pump_kWh = 0;
  if (hasCirculation) {
    const hoursPerDay = circHours_per_day != null
      ? Math.max(0, Math.min(24, parseFloat(circHours_per_day)))
      : 16; // default 16h/zi dacă nu e specificat
    const w_spec = ACM_PUMP_W_SPECIFIC[circPumpType] || ACM_PUMP_W_SPECIFIC.standard;
    const annualHours = hoursPerDay * 365;
    // Debit echivalent termic [kW]: cerere totală medie pe orele de funcționare + marjă distribuție
    const Q_flow_kW = annualHours > 0 ? (Q_nd_annual_kWh + Q_dist_kWh) / annualHours : 0;
    W_circ_pump_kWh = w_spec * Q_flow_kW * annualHours;
  }

  // ─── 6. NECESARUL LA GENERATOR ────────────────────────────
  // Q_gen = Q_nd + Q_dist + Q_storage + Q_legionella (energy in = demand + all losses)
  const solarF = solarFraction || 0;
  const Q_gen_before_solar = Q_nd_annual_kWh + Q_dist_kWh + Q_storage_kWh + Q_legionella_kWh;
  const Q_solar_contribution = Q_gen_before_solar * solarF;
  const Q_gen_needed = Q_gen_before_solar * (1 - solarF);

  // ─── 7. ENERGIE FINALĂ LA SURSĂ ───────────────────────────
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

  // ─── 8. EFICIENȚĂ SISTEM ──────────────────────────────────
  const eta_system = Q_nd_annual_kWh / Q_final_kWh; // eficiență globală
  const f_dist_actual = Q_dist_kWh / Q_gen_before_solar;
  const f_storage_actual = Q_storage_kWh / Q_gen_before_solar;
  const f_legionella_actual = Q_gen_before_solar > 0 ? Q_legionella_kWh / Q_gen_before_solar : 0;

  // ─── 9. RECOMANDĂRI ───────────────────────────────────────
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
    Q_legionella_kWh: Math.round(Q_legionella_kWh),
    f_dist_pct: Math.round(f_dist_actual * 100),
    f_storage_pct: Math.round(f_storage_actual * 100),
    f_legionella_pct: Math.round(f_legionella_actual * 100),
    q_standby_kWh_day: Math.round(q_standby * 10) / 10,

    // Auxiliar electric pompă circulație
    W_circ_pump_kWh: Math.round(W_circ_pump_kWh),

    // Legionella
    legionella,

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
