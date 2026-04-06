// ═══════════════════════════════════════════════════════════════
// CALCULATOR FINANȚARE — Casa Verde Plus, PNRR, AFM, HG 906/2023
// Actualizat cu programele active în România (2024-2026)
// ═══════════════════════════════════════════════════════════════

export const FUNDING_PROGRAMS = [
  {
    id: "casa_verde_plus_rez",
    name: "Casa Verde Plus — Rezidențial",
    authority: "AFM (Administrația Fondului pentru Mediu)",
    legal: "OUG 20/2023, Ghidul 2024",
    category: "rezidential",
    buildingTypes: ["RI", "RC", "RA"],
    maxGrant_EUR: 20000,
    grantPct: 90,  // % din valoarea eligibilă
    cofinancePct: 10,
    eligibleMeasures: ["Pompă de căldură", "PV + stocare", "Solar termic", "Termoizolare anvelopă"],
    conditions: [
      "Proprietar persoană fizică",
      "Clădire cu vechime >5 ani sau casă nouă cu materiale ecologice",
      "Racordat la rețea electrică (pentru PV)",
    ],
    maxMeasures: {
      pv_kwp: 10,        // kWp maxim eligibil
      hp_kw: null,       // fără limită kW
      storage_kwh: 20,   // kWh baterie maxim
      solar_m2: null,    // fără limită m²
    },
    active: true,
    note: "Sesiune continuă 2024-2026, epuizare fonduri probabilă în 2025",
  },
  {
    id: "pnrr_cladiri",
    name: "PNRR — Renovare clădiri rezidențiale (C5-I3)",
    authority: "MDLPA + AFM",
    legal: "PNRR Component 5, Regulament UE 241/2021",
    category: "rezidential",
    buildingTypes: ["RI", "RC", "RA"],
    maxGrant_EUR: 30000,
    grantPct: 80,
    cofinancePct: 20,
    eligibleMeasures: ["Termoizolare completă anvelopă", "Sisteme HVAC eficiente", "PV", "Ferestre", "Smart metering"],
    conditions: [
      "Renovare profundă cu reducere EP ≥ 30%",
      "Clădire construită înainte de 2000",
      "Audit energetic înainte și după renovare",
      "Implementare în max 36 luni",
    ],
    minEpReduction_pct: 30,
    targetClass: "C", // clasă energetică minimă după renovare
    active: true,
    note: "Fonduri alocate până în 2026, cereri prin MDLPA",
  },
  {
    id: "pnrr_publice",
    name: "PNRR — Renovare clădiri publice (C10-I1)",
    authority: "MDLPA",
    legal: "PNRR Component 10",
    category: "nerezidential",
    buildingTypes: ["ED", "SA", "BI"],
    maxGrant_EUR: 500000,
    grantPct: 100,
    cofinancePct: 0,
    eligibleMeasures: ["Renovare integrată", "HVAC", "Iluminat LED", "PV", "Automatizare BACS"],
    conditions: [
      "Clădire publică (primărie, școală, spital, dispensar)",
      "Proprietate UAT sau stat",
      "Reducere EP ≥ 30%",
    ],
    minEpReduction_pct: 30,
    active: true,
    note: "Exclusiv pentru autorități publice locale și centrale",
  },
  {
    id: "hg906_blocuri",
    name: "HG 906/2023 — Reabilitare blocuri (P+4+)",
    authority: "MDLPA + CL",
    legal: "HG 906/2023, Legea 153/2011 republicată",
    category: "colectiv",
    buildingTypes: ["RC", "RA"],
    maxGrant_EUR: 40000, // per apartament
    grantPct: 50,
    cofinancePct: 50,
    eligibleMeasures: ["Termoizolare fațadă", "Termoizolare acoperiș", "Ferestre comune", "Instalații comune"],
    conditions: [
      "Bloc cu minimum 4 etaje",
      "Asociație de proprietari constituită legal",
      "Acord minim 2/3 din proprietari",
      "Proiect tehnic avizat",
    ],
    active: true,
    note: "Cofinanțare 50% din buget local/județean",
  },
  {
    id: "eco_casa",
    name: "Eco Casa — Case noi pasive/nZEB",
    authority: "AFM",
    legal: "OUG 20/2023 Art.15",
    category: "nou",
    buildingTypes: ["RI"],
    maxGrant_EUR: 25000,
    grantPct: 50,
    cofinancePct: 50,
    eligibleMeasures: ["Construire casă nZEB nouă", "Materiale ecologice certificate", "PV obligatoriu"],
    conditions: [
      "Casă nouă construită conform nZEB",
      "Autorizație de construire după 2024",
      "Certificat energetic clasa A/A+",
      "PV min. 3 kWp",
    ],
    active: true,
    note: "Program pilot 2024-2025",
  },
];

// Verificare eligibilitate și calcul grant
export function calcPNRRFunding(params) {
  const {
    building,           // { category, yearBuilt, isNew, areaUseful }
    epActual,           // EP actual [kWh/(m²·an)]
    epAfterRehab,       // EP după reabilitare estimat
    investTotal,        // cost total reabilitare [EUR]
    measures,           // array de măsuri ["Pompă de căldură", "PV", ...]
    pvKwp,              // kWp PV instalat
    storageKwh,         // kWh baterie
    isPublicBuilding,   // bool
    ownerType,          // "fizica", "juridica", "uat"
  } = params;

  const cat = building?.category || "RI";
  const year = parseInt(building?.yearBuilt) || 1980;
  const Au = parseFloat(building?.areaUseful) || 100;
  const isRes = ["RI","RC","RA"].includes(cat);
  const epReduction_pct = epActual > 0 ? Math.round((epActual - (epAfterRehab || epActual * 0.5)) / epActual * 100) : 0;

  const results = [];

  FUNDING_PROGRAMS.forEach(prog => {
    const eligible = [];
    const ineligible = [];

    // Verificare categorie clădire
    if (!prog.buildingTypes.includes(cat)) {
      ineligible.push(`Programul nu acoperă categoria "${cat}"`);
    }

    // Verificare proprietar
    if (prog.id === "pnrr_publice" && ownerType !== "uat") {
      ineligible.push("Exclusiv pentru autorități publice (UAT)");
    }
    if (["casa_verde_plus_rez","eco_casa"].includes(prog.id) && ownerType === "uat") {
      ineligible.push("Nu este disponibil pentru UAT");
    }

    // Verificare reducere EP
    if (prog.minEpReduction_pct && epReduction_pct < prog.minEpReduction_pct) {
      ineligible.push(`Reducere EP insuficientă: ${epReduction_pct}% (minim: ${prog.minEpReduction_pct}%)`);
    }

    // Verificare vârstă clădire
    if (prog.id === "pnrr_cladiri" && year >= 2000) {
      ineligible.push("Clădiri construite după 2000 nu sunt eligibile");
    }

    // Calcul grant
    let grantAmount = 0;
    let eligibleCost = investTotal;

    // Limitare kWp PV
    if (pvKwp && prog.maxMeasures?.pv_kwp) {
      const pvEligible = Math.min(pvKwp, prog.maxMeasures.pv_kwp);
      const pvPct = pvKwp > 0 ? pvEligible / pvKwp : 1;
      eligibleCost = investTotal * pvPct; // simplificare
    }

    grantAmount = Math.min(eligibleCost * (prog.grantPct / 100), prog.maxGrant_EUR);
    const cofinanceProprie = investTotal - grantAmount;

    if (ineligible.length === 0) {
      eligible.push(`Reducere EP: ${epReduction_pct}% ✓`);
      eligible.push(`Categorie clădire: ${cat} ✓`);
    }

    const isEligible = ineligible.length === 0 && prog.active;

    results.push({
      programId: prog.id,
      programName: prog.name,
      authority: prog.authority,
      legal: prog.legal,
      isEligible,
      eligible,
      ineligible,
      grantAmount: isEligible ? Math.round(grantAmount) : 0,
      grantPct: prog.grantPct,
      cofinanceProprie: isEligible ? Math.round(cofinanceProprie) : Math.round(investTotal),
      maxGrant: prog.maxGrant_EUR,
      eligibleMeasures: prog.eligibleMeasures,
      conditions: prog.conditions,
      note: prog.note,
      active: prog.active,
      color: isEligible ? "#22c55e" : "#6b7280",
    });
  });

  // Cel mai bun program eligibil (grant maxim)
  const eligible = results.filter(r => r.isEligible).sort((a,b) => b.grantAmount - a.grantAmount);
  const best = eligible[0] || null;

  // Grant cumulabil (unele programe se pot combina)
  const combinable = eligible.filter(r => !["pnrr_publice"].includes(r.programId));
  const maxCombined = combinable.length >= 2
    ? Math.min(investTotal, combinable[0].grantAmount + combinable[1].grantAmount * 0.5)
    : best?.grantAmount || 0;

  return {
    results,
    bestProgram: best,
    eligibleCount: eligible.length,
    maxGrant: best?.grantAmount || 0,
    maxGrantCombined: Math.round(maxCombined),
    selfFinancing: Math.round(investTotal - (best?.grantAmount || 0)),
    epReduction_pct,
    investTotal,
    note: eligible.length > 1 ? "Atenție: verificați cumulabilitatea cu consultantul dvs. — unele programe nu se pot cumula!" : null,
  };
}
