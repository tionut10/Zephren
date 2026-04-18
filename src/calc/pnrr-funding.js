// ═══════════════════════════════════════════════════════════════
// CALCULATOR FINANȚARE — Casa Verde Plus, PNRR, AFM, HG 906/2023,
//                        AFM Termoizolare, POR 2021-2027, Casa Eficientă
// Actualizat: 2026-04-18 (Ghid Casa Verde Plus 2024 + 3 programe noi)
// ═══════════════════════════════════════════════════════════════

export const FUNDING_PROGRAMS = [
  {
    id: "casa_verde_plus_rez",
    name: "Casa Verde Plus — Rezidențial",
    authority: "AFM (Administrația Fondului pentru Mediu)",
    legal: "OUG 20/2023, Ghid AFM 2024",
    category: "rezidential",
    buildingTypes: ["RI", "RC", "RA"],
    // Ghid 2024: 30.000 EUR PC standalone + 10.000 PV + 3.000 solar termic = 43.000 EUR cumul maxim
    // Setăm pragul principal la 30.000 EUR (PC standalone)
    maxGrant_EUR: 30000,
    grantPct: 90,
    cofinancePct: 10,
    eligibleMeasures: ["Pompă de căldură", "PV + stocare", "Solar termic", "Termoizolare anvelopă"],
    // Detaliu plafoane per măsură (Ghid AFM 2024)
    maxGrantBreakdown: {
      hp_standalone:  30000,  // EUR — pompă căldură standalone
      pv_addon:       10000,  // EUR — PV adăugat la PC
      solar_addon:     3000,  // EUR — solar termic adăugat
      cumul_max:      43000,  // EUR — maxim cumulat
    },
    conditions: [
      "Proprietar persoană fizică",
      "Clădire cu vechime >5 ani sau casă nouă cu materiale ecologice",
      "Racordat la rețea electrică (pentru PV)",
    ],
    maxMeasures: {
      pv_kwp: 10,
      hp_kw: null,
      storage_kwh: 20,
      solar_m2: null,
    },
    active: true,
    note: "Ghid 2024: 30.000 EUR PC + 10.000 EUR PV + 3.000 EUR solar termic (43.000 EUR maxim cumulat)",
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
    note: "Program pilot 2024-2025; verificați disponibilitatea fondurilor la AFM în 2026",
  },

  // ─── Programe noi adăugate Sprint 14 (2026-04-18) ───────────────────────

  {
    id: "afm_termoizolare",
    name: "AFM — Termoizolare fațade clădiri rezidențiale",
    authority: "AFM (Administrația Fondului pentru Mediu)",
    legal: "OUG 20/2013 republicat, Ghid AFM termoizolare 2023",
    category: "rezidential",
    buildingTypes: ["RI", "RC", "RA"],
    maxGrant_EUR: 15000,
    grantPct: 50,
    cofinancePct: 50,
    eligibleMeasures: [
      "Termoizolare fațadă (sistem ETICS)",
      "Termoizolare acoperiș / terasă",
      "Termoizolare planșeu subsol",
      "Înlocuire tâmplărie",
    ],
    conditions: [
      "Proprietar persoană fizică sau juridică",
      "Clădire rezidențială existentă",
      "Nu se cumulează cu PNRR C5-I3 pentru aceleași lucrări",
      "Certificat energetic anterior lucrărilor obligatoriu",
    ],
    requiredDocs: [
      "Act proprietate (extras CF)",
      "Certificat energetic anterior (clasa D-G obligatoriu)",
      "Deviz estimativ avizat",
      "Autorizație de construire (dacă e cazul)",
    ],
    active: true,
    note: "Grant 50% din costul termoizolării anvelopei, max 15.000 EUR/imobil",
  },

  {
    id: "por_2021_2027_axa3",
    name: "POR 2021-2027 — Eficiență energetică clădiri publice (Axa 3)",
    authority: "ADR (Agenții de Dezvoltare Regională) + MIPE",
    legal: "Regulament UE 2021/1060, Programul Regional 2021-2027",
    category: "nerezidential",
    buildingTypes: ["ED", "SA", "BI", "SP"],
    maxGrant_EUR: 2000000,
    grantPct: 85,
    cofinancePct: 15,
    eligibleMeasures: [
      "Reabilitare termică completă anvelopă",
      "Sisteme HVAC eficiente",
      "Iluminat LED + BACS",
      "PV + stocare energie",
      "Acces persoane cu dizabilități",
    ],
    conditions: [
      "Clădire publică (UAT, instituție publică)",
      "Reducere consum energie ≥ 30%",
      "Clasă energetică min. C după renovare",
      "Proiect tehnic avizat ISC",
      "Aprobare Consiliu Local (pentru UAT)",
    ],
    requiredDocs: [
      "Act proprietate / administrare",
      "Audit energetic conform Ord. MDLPA 16/2023",
      "Proiect tehnic + detalii execuție",
      "Aviz ISC",
      "HCL aprobare proiect",
      "Certificat energetic anterior",
    ],
    minEpReduction_pct: 30,
    active: true,
    note: "Finanțare FEDR 85% + buget local 15%; sesiuni deschise la nivel regional — verificați ADR regional",
  },

  {
    id: "casa_eficienta_pnrr",
    name: "Casa Eficientă — PNRR apă + energie (C6-I2)",
    authority: "MMAP + AFM",
    legal: "PNRR Component 6, Regulament UE 241/2021",
    category: "rezidential",
    buildingTypes: ["RI"],
    maxGrant_EUR: 10000,
    grantPct: 70,
    cofinancePct: 30,
    eligibleMeasures: [
      "Sisteme eficiente utilizare apă (robineți, duș, toaletă)",
      "Izolație termică spații locuite",
      "Sisteme regenerabile (PV, solar termic)",
      "Contorizare inteligentă apă + energie",
    ],
    conditions: [
      "Persoană fizică proprietar casă individuală",
      "Casă cu suprafața utilă ≤ 150 m²",
      "Clădire cu vechime > 10 ani",
      "Reducere consum apă ≥ 20% și energie ≥ 20%",
    ],
    requiredDocs: [
      "Act proprietate",
      "Factură apă + energie (ultimele 12 luni)",
      "Declarație pe proprie răspundere privind suprafața și vechimea",
      "Deviz lucrări eligibile",
    ],
    active: true,
    note: "Program cumulabil cu Casa Verde Plus (sisteme diferite); verificați sesiunea activă la AFM",
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

    // Verificare tipuri specifice
    if (prog.id === "afm_termoizolare") {
      const hasEnvelopeMeasure = (measures || []).some(m =>
        /termoiz|izol|fațad|acop|subsol|tâmpl|fereast/i.test(m)
      );
      if (!hasEnvelopeMeasure) {
        ineligible.push("Programul acoperă exclusiv termoizolarea anvelopei (pereți, acoperiș, tâmplărie)");
      }
    }

    if (prog.id === "por_2021_2027_axa3" && ownerType !== "uat") {
      ineligible.push("Exclusiv pentru autorități publice (UAT) și instituții publice");
    }

    if (prog.id === "eco_casa") {
      const isNew = building?.isNew || (parseInt(building?.yearBuilt) || 1980) >= 2024;
      if (!isNew) {
        ineligible.push("Programul este destinat clădirilor noi construite conform nZEB");
      }
    }

    if (prog.id === "casa_eficienta_pnrr") {
      const Au = parseFloat(building?.areaUseful) || 0;
      if (Au > 150) {
        ineligible.push(`Suprafața utilă ${Au} m² depășește limita de 150 m²`);
      }
    }

    // Calcul grant
    let grantAmount = 0;
    let eligibleCost = investTotal;

    // Casa Verde Plus: breakdown pe măsuri (Ghid 2024)
    if (prog.id === "casa_verde_plus_rez" && prog.maxGrantBreakdown) {
      const hasPV = (measures || []).some(m => /PV|fotovoltaic|solar elec/i.test(m));
      const hasSolar = (measures || []).some(m => /solar term|panouri solare ACM/i.test(m));
      const hasHP = (measures || []).some(m => /pompă|pompa|heat pump/i.test(m));
      let limit = hasHP ? prog.maxGrantBreakdown.hp_standalone : prog.maxGrant_EUR;
      if (hasPV) limit = Math.min(limit + prog.maxGrantBreakdown.pv_addon, prog.maxGrantBreakdown.cumul_max);
      if (hasSolar) limit = Math.min(limit + prog.maxGrantBreakdown.solar_addon, prog.maxGrantBreakdown.cumul_max);
      eligibleCost = Math.min(investTotal, limit / (prog.grantPct / 100));
    }

    // Limitare kWp PV
    if (pvKwp && prog.maxMeasures?.pv_kwp) {
      const pvEligible = Math.min(pvKwp, prog.maxMeasures.pv_kwp);
      const pvPct = pvKwp > 0 ? pvEligible / pvKwp : 1;
      if (pvPct < 1) eligibleCost = investTotal * pvPct;
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

  // Matrice conflicte de cumulare — programe care NU se pot cumula pe același obiect
  const CONFLICT_PAIRS = [
    // PNRR C5-I3 și AFM termoizolare — aceleași lucrări anvelopă
    ["pnrr_cladiri", "afm_termoizolare"],
    // Programe publice nu se combină cu cele rezidențiale
    ["pnrr_publice", "casa_verde_plus_rez"],
    ["pnrr_publice", "pnrr_cladiri"],
    ["pnrr_publice", "afm_termoizolare"],
    ["pnrr_publice", "por_2021_2027_axa3"],
    // POR public nu se combină cu PNRR public (același obiect, surse FEDR diferite)
    ["por_2021_2027_axa3", "pnrr_publice"],
  ];

  function areConflicting(id1, id2) {
    return CONFLICT_PAIRS.some(([a, b]) => (a === id1 && b === id2) || (a === id2 && b === id1));
  }

  // Construim combinația optimă fără conflicte
  const combinable = [];
  for (const prog of eligible) {
    const hasConflict = combinable.some(c => areConflicting(c.programId, prog.programId));
    if (!hasConflict) combinable.push(prog);
  }

  const maxCombined = combinable.reduce((sum, p) => sum + p.grantAmount, 0);
  const conflictWarnings = [];
  eligible.forEach((p, i) => {
    eligible.slice(i + 1).forEach(q => {
      if (areConflicting(p.programId, q.programId)) {
        conflictWarnings.push(
          `"${p.programName}" și "${q.programName}" nu se pot cumula pentru aceleași lucrări.`
        );
      }
    });
  });

  return {
    results,
    bestProgram: best,
    eligibleCount: eligible.length,
    maxGrant: best?.grantAmount || 0,
    maxGrantCombined: Math.round(Math.min(investTotal, maxCombined)),
    selfFinancing: Math.round(investTotal - (best?.grantAmount || 0)),
    combinablePrograms: combinable.map(p => p.programId),
    epReduction_pct,
    investTotal,
    conflictWarnings: conflictWarnings.length > 0 ? conflictWarnings : null,
    note: eligible.length > 1
      ? `${eligible.length} programe eligibile — grant combinat maxim: ${Math.round(Math.min(investTotal, maxCombined)).toLocaleString('ro-RO')} EUR`
      : null,
  };
}
