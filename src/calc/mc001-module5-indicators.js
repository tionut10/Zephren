/**
 * MC 001-2022 Module 5 — Indicatori Energetici Finali
 * Calcul EP (energie primară), ECS (energie răcire), EW (apă caldă), EL (iluminat)
 * Transformă consumuri finale [kWh/an] → energie primară [kWh/m²/an]
 */

// ═══════════════════════════════════════════════════════════════════════════
// FACTORI CONVERSIE ENERGIE FINALĂ → ENERGIE PRIMARĂ (Mc 001-2022 Tabel 2.8)
// ═══════════════════════════════════════════════════════════════════════════

const PRIMARY_ENERGY_FACTORS = {
  // Încălzire (fp pentru diferite combustibili/sisteme)
  heating: {
    gas: 1.1,           // Gaze naturale (producție + transport)
    oil: 1.15,          // Combustibil lichid
    coal: 1.05,         // Cărbune
    biomass: 0.0,       // Biomasa regenerabilă (factor 0)
    electricity: 2.5,   // Electricitate (mix naţional RO)
    heatPump: 2.5,      // Pompă căldură (factor electricitate)
    solar: 0.0,         // Colector solar termic (0 pentru calcul net)
    districtHeating: 1.1, // Încălzire din rețea (estimare medie)
  },

  // Răcire (fp pentru diferite sisteme)
  cooling: {
    electricity: 2.5,   // Electricitate (climatizare standard)
    heatPump: 2.5,      // Pompă căldură reversibilă
    nightVentilation: 0.0, // Răcire pasivă (0 factor)
    districtCooling: 1.2,  // Răcire din rețea (estimare)
  },

  // Apă caldă (DHW)
  dhw: {
    gas: 1.1,
    oil: 1.15,
    electricity: 2.5,
    solar: 0.0,
    heatPump: 2.5,
  },

  // Iluminat
  lighting: {
    electricity: 2.5,   // Tot electricitate
  },

  // Ventilație (sisteme de ventilare mecanică)
  ventilation: {
    electricity: 2.5,   // Motor ventilator
  },

  // Auxiliari (pompe, ventilare, control)
  auxiliaries: {
    electricity: 2.5,
  },
};

/**
 * Determină factorul energetic primar pentru o sursă de combustibil/sistem
 */
function getPrimaryEnergyFactor(domain, source) {
  const factors = PRIMARY_ENERGY_FACTORS[domain] || {};
  return factors[source] || 1.1; // default conservator
}

/**
 * Clasificare clădire după EP (Mc 001-2022)
 * Clase: A+ > A > B > C > D > E > F > G
 * Limite variază pe categoria clădire
 */
function classifyByEnergyClass(ep, category) {
  // Limite pentru clădiri rezidențiale (Mc 001-2022 Tabel 2.9)
  if (['RI', 'RC', 'RA'].includes(category)) {
    if (ep <= 50) return 'A+';
    if (ep <= 75) return 'A';
    if (ep <= 100) return 'B';
    if (ep <= 150) return 'C';
    if (ep <= 210) return 'D';
    if (ep <= 250) return 'E';
    if (ep <= 300) return 'F';
    return 'G';
  }

  // Limite pentru clădiri nerezidențiale (birou, comerț, etc)
  if (ep <= 60) return 'A+';
  if (ep <= 90) return 'A';
  if (ep <= 120) return 'B';
  if (ep <= 180) return 'C';
  if (ep <= 240) return 'D';
  if (ep <= 300) return 'E';
  if (ep <= 360) return 'F';
  return 'G';
}

/**
 * Calcul EP (energie primară încălzire) [kWh/an]
 * Input: QH [kWh/an] (consum final încălzire), fpH (factor primar), Au [m²]
 */
function calcEP_H(QH, fpH) {
  return (QH || 0) * fpH;
}

/**
 * Calcul ECS (energie primară răcire) [kWh/an]
 */
function calcEP_C(QC, fpC) {
  return (QC || 0) * fpC;
}

/**
 * Calcul EW (energie primară apă caldă) [kWh/an]
 */
function calcEP_W(QW, fpW) {
  return (QW || 0) * fpW;
}

/**
 * Calcul EL (energie primară iluminat) [kWh/an]
 * Pentru electricitate pură, fpL = 2.5
 */
function calcEP_L(QL, fpL = 2.5) {
  return (QL || 0) * fpL;
}

/**
 * Calcul EAux (energie primară auxiliari: pompe, ventilare, control) [kWh/an]
 */
function calcEP_Aux(QAux, fpAux = 2.5) {
  return (QAux || 0) * fpAux;
}

/**
 * Energie regenerabilă (PV, colector solar) [kWh/an]
 * Conform Mc 001-2022: ERn = factori specifici per sursă
 */
function calcEnergyRenewable(renewable) {
  const { pv = 0, solar = 0, biomass = 0, windSmall = 0 } = renewable;

  // PV: contorizează la valoarea generată (output system)
  const pv_energy = pv * 1.0;

  // Colector solar: contorizează doar fracția utilizată pentru DHW
  const solar_energy = solar * 1.0;

  // Biomasă: contorizează ca regenerabilă (factor 0 de conversie)
  const biomass_energy = biomass * 1.0;

  // Turbine vânt mic: similar PV
  const wind_energy = windSmall * 1.0;

  return pv_energy + solar_energy + biomass_energy + wind_energy;
}

/**
 * MAIN: Calcul complet indicatori Mc 001-2022 Module 5
 *
 * Input:
 *   - QH [kWh/an]: consum final încălzire
 *   - QC [kWh/an]: consum final răcire
 *   - QW [kWh/an]: consum final apă caldă
 *   - QL [kWh/an]: consum final iluminat
 *   - QAux [kWh/an]: auxiliari (pompe, ventilare, control)
 *   - Au [m²]: arie utilă
 *   - category: cod categorie clădire (RI, RC, RA, NR, etc)
 *   - heatingSource: tipul de sursă încălzire (gas, oil, biomass, electricity, heatPump, etc)
 *   - coolingSource: tipul de sursă răcire (electricity, heatPump, districtCooling, etc)
 *   - dhwSource: tipul de sursă apă caldă
 *   - renewable: { pv, solar, biomass, windSmall } [kWh/an]
 *
 * Output:
 *   - EP [kWh/m²/an]: indicator energetic global (energie primară)
 *   - ECS [kWh/m²/an]: consum răcire
 *   - energyClass: A+ ... G
 *   - breakdown: detaliere EP_H, EP_C, EP_W, EP_L
 */
export function calcMc001Module5(params) {
  const {
    QH = 0,
    QC = 0,
    QW = 0,
    QL = 0,
    QAux = 0,
    Au = 1,
    category = 'RI',
    heatingSource = 'gas',
    coolingSource = 'electricity',
    dhwSource = 'gas',
    renewable = {},
  } = params;

  // Factori conversie
  const fpH = getPrimaryEnergyFactor('heating', heatingSource);
  const fpC = getPrimaryEnergyFactor('cooling', coolingSource);
  const fpW = getPrimaryEnergyFactor('dhw', dhwSource);
  const fpL = 2.5; // lighting - always electricity
  const fpAux = 2.5; // auxiliaries - always electricity

  // Calcul energie primară pe componente [kWh/an]
  const EP_H = calcEP_H(QH, fpH);
  const EP_C = calcEP_C(QC, fpC);
  const EP_W = calcEP_W(QW, fpW);
  const EP_L = calcEP_L(QL, fpL);
  const EP_Aux = calcEP_Aux(QAux, fpAux);

  // Energie regenerabilă [kWh/an]
  const E_renewable = calcEnergyRenewable(renewable);

  // EP total [kWh/an] = sum componente - regenerabilă
  const EP_total = EP_H + EP_C + EP_W + EP_L + EP_Aux - E_renewable;

  // Indicator energetic global [kWh/m²/an]
  const EP_indicator = Au > 0 ? EP_total / Au : 0;

  // Clasificare
  const energyClass = classifyByEnergyClass(EP_indicator, category);

  // ECS (consum răcire specific) [kWh/m²/an]
  const ECS_indicator = Au > 0 ? QC / Au : 0;

  // Energie finală (pentru comparație cu consum real facturat)
  const EF_total = QH + QC + QW + QL + QAux;
  const EF_indicator = Au > 0 ? EF_total / Au : 0;

  return {
    // Indicatori principali
    EP_indicator: Math.round(EP_indicator * 10) / 10, // [kWh/m²/an]
    ECS_indicator: Math.round(ECS_indicator * 10) / 10,
    EF_indicator: Math.round(EF_indicator * 10) / 10,
    energyClass,

    // Breakdown componente [kWh/an]
    components: {
      heating: {
        final_kWh: Math.round(QH),
        primary_kWh: Math.round(EP_H),
        factor: fpH,
        source: heatingSource,
      },
      cooling: {
        final_kWh: Math.round(QC),
        primary_kWh: Math.round(EP_C),
        factor: fpC,
        source: coolingSource,
      },
      dhw: {
        final_kWh: Math.round(QW),
        primary_kWh: Math.round(EP_W),
        factor: fpW,
        source: dhwSource,
      },
      lighting: {
        final_kWh: Math.round(QL),
        primary_kWh: Math.round(EP_L),
        factor: fpL,
      },
      auxiliaries: {
        final_kWh: Math.round(QAux),
        primary_kWh: Math.round(EP_Aux),
        factor: fpAux,
      },
      renewable: {
        pv: renewable.pv || 0,
        solar: renewable.solar || 0,
        biomass: renewable.biomass || 0,
        windSmall: renewable.windSmall || 0,
        total_kWh: Math.round(E_renewable),
      },
    },

    // Totaluri
    totals: {
      final_energy_kWh: Math.round(EF_total),
      primary_energy_kWh: Math.round(EP_total),
      renewable_energy_kWh: Math.round(E_renewable),
      net_primary_kWh: Math.round(EP_total - E_renewable),
    },

    // Procentaj conturi pe sursă
    distribution: {
      heating_pct: EF_total > 0 ? ((QH / EF_total) * 100).toFixed(1) : 0,
      cooling_pct: EF_total > 0 ? ((QC / EF_total) * 100).toFixed(1) : 0,
      dhw_pct: EF_total > 0 ? ((QW / EF_total) * 100).toFixed(1) : 0,
      lighting_pct: EF_total > 0 ? ((QL / EF_total) * 100).toFixed(1) : 0,
      auxiliaries_pct: EF_total > 0 ? ((QAux / EF_total) * 100).toFixed(1) : 0,
    },
  };
}

export default calcMc001Module5;
