// ═══════════════════════════════════════════════════════════════
// ACM SOLAR DETALIAT — SR EN ISO 9806:2017, SR EN 15316-4-3:2017
// Curbe colector, temperaturi operare, protecție îngheț, stagnare
// ═══════════════════════════════════════════════════════════════

// Tipuri de colectori solar-termici (date de performanță din certificări Solar Keymark)
export const COLLECTOR_TYPES = [
  {
    id: "PLAN_BASIC",
    label: "Colector plan — standard (neselective)",
    eta0: 0.72,    // eficiență optică la incidență normală
    a1: 3.5,       // coeficient pierderi termice liniare [W/(m²·K)]
    a2: 0.015,     // coeficient pierderi termice pătratice [W/(m²·K²)]
    stagnation_t: 175, // temperatură stagnare [°C]
    costPerM2: 280,
  },
  {
    id: "PLAN_SEL",
    label: "Colector plan — selectiv (High-Performance)",
    eta0: 0.80,
    a1: 2.8,
    a2: 0.012,
    stagnation_t: 195,
    costPerM2: 380,
  },
  {
    id: "TUBURI_HEAT_PIPE",
    label: "Tuburi vidate — Heat Pipe",
    eta0: 0.72,
    a1: 1.8,
    a2: 0.008,
    stagnation_t: 280,
    costPerM2: 480,
  },
  {
    id: "TUBURI_U_PIPE",
    label: "Tuburi vidate — U-Pipe direct",
    eta0: 0.75,
    a1: 1.6,
    a2: 0.007,
    stagnation_t: 260,
    costPerM2: 520,
  },
];

// Proprietăți fluid solar anti-îngheț
// Propilenglicol 30%: protecție la -15°C | 40%: -23°C | 50%: -33°C
export const ANTIFREEZE_MIX = {
  "PG30": { protection_t: -15, cp_factor: 0.96, name: "Propilenglicol 30%" },
  "PG40": { protection_t: -23, cp_factor: 0.94, name: "Propilenglicol 40%" },
  "PG50": { protection_t: -33, cp_factor: 0.92, name: "Propilenglicol 50%" },
};

// Fracții solare lunare orare (distribuție 0-1 per oră, medie per orientare/lună)
// Utilizat pentru estimarea perioadelor de stagnare
const SOLAR_HOURS_PER_MONTH = [5, 6, 8, 10, 11, 12, 13, 12, 10, 8, 6, 5]; // ore solare medii

function calcCollectorEfficiency(collector, Tm, Tamb, G) {
  // Ecuație colector EN ISO 9806: η = η0 - a1·(Tm-Tamb)/G - a2·(Tm-Tamb)²/G
  if (G <= 0) return 0;
  const dT = Tm - Tamb;
  const eta = collector.eta0 - collector.a1 * dT / G - collector.a2 * dT * dT / G;
  return Math.max(0, eta);
}

export function calcSolarACMDetailed(params) {
  const {
    collectorType,    // ID tip colector
    collectorArea,    // m² aperture area
    orientation,      // "S","SE","SV","E","V"
    tiltDeg,          // unghi înclinare față de orizont [°]
    climate,          // date climatice
    nPersons,         // număr persoane
    acmDemandPerPerson, // L/zi·persoană (default 60L)
    storageVolume,    // volum vas acumulare [L]
    antifreeze,       // "PG30","PG40","PG50"
    tSupplyACM,       // temperatură livrare ACM [°C] (default 55°C)
    tCold,            // temperatură apă rece intrare [°C] (default 10°C)
    auxSource,        // sursă auxiliară (pentru complementare)
  } = params;

  if (!climate || !collectorArea || collectorArea <= 0) return null;

  const coll = COLLECTOR_TYPES.find(c => c.id === collectorType) || COLLECTOR_TYPES[1];
  const af = ANTIFREEZE_MIX[antifreeze || "PG40"];
  const nP = nPersons || 4;
  const qACM_LDay = (acmDemandPerPerson || 60) * nP; // L/zi total
  const tSup = tSupplyACM || 55; // °C
  const tColdW = tCold || 10;    // °C
  const months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  const days = [31,28,31,30,31,30,31,31,30,31,30,31];

  // Factor orientare (față de S = 1.0)
  const orientFactor = { S:1.00, SE:0.95, SV:0.95, E:0.85, V:0.85, N:0.60, NE:0.70, NV:0.70, Orizontal:0.90 };
  const fOrient = orientFactor[orientation] || 0.95;
  // Factor înclinare (față de 45° = 1.0)
  const tilt = tiltDeg || 45;
  const fTilt = Math.cos(Math.abs(tilt - 45) * Math.PI / 180) * 0.5 + 0.5; // aproximare

  // Iradianță pe suprafața colectorului [kWh/m²·an → per lună]
  const solarKey = orientation === "Orizontal" ? "Oriz" : (orientation || "S");
  const solarAnnual = (climate.solar && climate.solar[solarKey]) || 400; // kWh/m²·an

  // Distribuție lunară a iradianței (proporțional cu ore solare)
  const totalHours = SOLAR_HOURS_PER_MONTH.reduce((s,h) => s+h, 0);
  const solarMonthly = SOLAR_HOURS_PER_MONTH.map(h => solarAnnual * h / totalHours); // kWh/m²·lună

  // Necesar termic ACM lunar [kWh/lună]
  const Q_ACM_monthly = days.map(d => qACM_LDay * d * 4.186 * (tSup - tColdW) / 3600); // kWh

  const monthResults = [];
  let totalSolarYield = 0, totalDemand = 0, totalStagnHours = 0, stagnRisk = false;

  months.forEach((name, i) => {
    const Tamb = climate.temp_month[i];
    const G_month_kWh_m2 = solarMonthly[i] * fOrient * fTilt;
    const G_hour = G_month_kWh_m2 / SOLAR_HOURS_PER_MONTH[i] * 1000; // W/m² medie ore solare

    // Temperatura medie fluid colector (estimată)
    const Tm = tSup - 5; // temperatura medie fluid ≈ temperatură livrare - 5°C

    // Eficiență colector la condiții lunare medii
    const eta = calcCollectorEfficiency(coll, Tm, Tamb, G_hour);

    // Producție solară brută lunară [kWh]
    const Q_sol_gross = eta * collectorArea * G_month_kWh_m2 * af.cp_factor;
    // Factor utilizare (vas tampon limitează la necesar + 10% pierderi stocare)
    const storageEff = storageVolume ? Math.min(1.0, (storageVolume * 4.186 * 20 / 3600) / (Q_ACM_monthly[i] / days[i])) : 0.90;
    const Q_sol_useful = Math.min(Q_sol_gross * storageEff, Q_ACM_monthly[i] * 1.05);

    // Fracție solară lunară [%]
    const fSolar = Q_ACM_monthly[i] > 0 ? Math.min(100, Q_sol_useful / Q_ACM_monthly[i] * 100) : 0;

    // Risc stagnare (vara, Tamb ridicat, cerere ACM mică)
    const i_summer = i >= 5 && i <= 7; // Iun-Aug
    const stagnHoursEst = i_summer && fSolar > 90 ? Math.max(0, (fSolar - 90) / 10 * SOLAR_HOURS_PER_MONTH[i] * 3) : 0;
    totalStagnHours += stagnHoursEst;
    if (stagnHoursEst > 20) stagnRisk = true;

    totalSolarYield += Q_sol_useful;
    totalDemand += Q_ACM_monthly[i];

    monthResults.push({
      month: name,
      Tamb: Math.round(Tamb * 10) / 10,
      G_month: Math.round(G_month_kWh_m2 * 10) / 10,
      G_hour: Math.round(G_hour),
      eta: Math.round(eta * 1000) / 10, // %
      Q_sol_gross: Math.round(Q_sol_gross * 10) / 10,
      Q_sol_useful: Math.round(Q_sol_useful * 10) / 10,
      Q_demand: Math.round(Q_ACM_monthly[i] * 10) / 10,
      fSolar: Math.round(fSolar * 10) / 10,
      stagnHours: Math.round(stagnHoursEst),
    });
  });

  const fSolarAnnual = totalDemand > 0 ? Math.min(100, totalSolarYield / totalDemand * 100) : 0;

  // Volum vas acumulare recomandat: 50-70 L/m² colector (SR EN 12977-3)
  const storageRec = Math.round(collectorArea * 60); // 60L/m²

  // Fluid anti-îngheț recomandat
  const tMin = Math.min.apply(null, climate.temp_month);
  const antifreezeRec = tMin < -20 ? "PG50" : tMin < -12 ? "PG40" : "PG30";

  // Cost instalație estimat
  const costCollectors = collectorArea * coll.costPerM2;
  const costStorage = (storageVolume || storageRec) * 3.5; // ~3.5 EUR/L boiler solar
  const costInstall = (costCollectors + costStorage) * 0.30; // 30% manoperă + conexiuni
  const costTotal = costCollectors + costStorage + costInstall;

  return {
    collectorLabel: coll.label,
    collectorArea,
    orientation, tiltDeg: tilt,
    nPersons: nP, qACM_LDay: Math.round(qACM_LDay),
    fSolarAnnual: Math.round(fSolarAnnual * 10) / 10,
    totalSolarYield_kwh: Math.round(totalSolarYield),
    totalDemand_kwh: Math.round(totalDemand),
    storageRec,
    antifreeze: ANTIFREEZE_MIX[antifreezeRec],
    antifreezeRec,
    stagnRisk,
    stagnHoursAnnual: Math.round(totalStagnHours),
    costTotal: Math.round(costTotal),
    monthly: monthResults,
    verdict: fSolarAnnual >= 60 ? "Excelent — acoperire solară ridicată" :
             fSolarAnnual >= 40 ? "Bun — recomandat pentru instalare" :
             fSolarAnnual >= 25 ? "Acceptabil — suprafață insuficientă" :
             "Insuficient — măriți suprafața colectoare",
    color: fSolarAnnual >= 60 ? "#22c55e" : fSolarAnnual >= 40 ? "#84cc16" : fSolarAnnual >= 25 ? "#eab308" : "#ef4444",
    warnings: [
      stagnRisk ? `Risc stagnare vara: ~${Math.round(totalStagnHours)} ore/an. Instalați supapă de suprapresiune și fluid cu punct fierbere ridicat.` : null,
      tMin < af.protection_t ? `Temperatura minimă (${tMin}°C) sub protecția glicolului! Utilizați ${ANTIFREEZE_MIX[antifreezeRec].name}.` : null,
    ].filter(Boolean),
  };
}
