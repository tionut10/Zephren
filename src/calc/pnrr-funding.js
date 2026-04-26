// ═══════════════════════════════════════════════════════════════
// CALCULATOR FINANȚARE — Casa Verde Plus, PNRR, AFM, HG 906/2023,
//                        AFM Termoizolare, POR 2021-2027, Casa Eficientă
// Actualizat: 2026-04-26 (Sprint 25 P0.3 — Casa Verde Plus 2026 RON corectat)
// ═══════════════════════════════════════════════════════════════

import { getEurRonSync } from '../data/rehab-prices.js';

// Sprint 25 P0.3 — curs static pentru valorile EUR derivate la încărcare modul.
// Conversia runtime se face în logică (calcGrantsForBuilding) cu getEurRonSync().
const _EUR_RON_STATIC = 5.10;
const _toEur = (ron) => Math.round(ron / _EUR_RON_STATIC);

export const FUNDING_PROGRAMS = [
  {
    id: "casa_verde_plus_rez",
    name: "Casa Verde Plus — Rezidențial (AFM 2026)",
    authority: "AFM (Administrația Fondului pentru Mediu)",
    legal: "OUG 20/2023, Ghid AFM 2026",
    category: "rezidential",
    buildingTypes: ["RI", "RC", "RA"],
    // Sprint 25 P0.3 — Ghid AFM 2026: valorile sunt în RON (NU EUR).
    // Surse: energieacasa.ro (2026 ghid sub.), money.ro (max 20k RON pompă),
    // termo-solar.ro. PV/storage NU sunt în Casa Verde Plus — sunt în
    // programul separat „Casa Verde Fotovoltaice".
    maxGrant_RON: 30000,           // Sol-apă max (cel mai mare plafon HP)
    maxGrant_EUR: _toEur(30000),   // ≈ 5.882 EUR la curs 5.10
    grantPct: 90,
    cofinancePct: 10,
    eligibleMeasures: ["Pompă de căldură", "Solar termic"],
    // Detaliu plafoane per măsură (Ghid AFM 2026)
    maxGrantBreakdown_RON: {
      hp_aw:          20000,  // RON — pompă căldură aer-apă
      hp_gw:          30000,  // RON — pompă căldură sol-apă
      hp_hybrid:      35000,  // RON — sistem hibrid (PC + altă sursă)
      solar_thermal:  10000,  // RON — panouri solare termice ACM
      cumul_max:      35000,  // RON — un singur sistem primar (NU se cumulează tipurile HP)
    },
    // Compat backward — valori EUR derivate static (5.10 RON/EUR fallback)
    maxGrantBreakdown: {
      hp_standalone:  _toEur(30000),  // ≈ 5.882 EUR — sol-apă (max realistic)
      pv_addon:       0,              // ELIMINAT — vezi „Casa Verde Fotovoltaice"
      solar_addon:    _toEur(10000),  // ≈ 1.961 EUR
      cumul_max:      _toEur(35000),  // ≈ 6.863 EUR
    },
    conditions: [
      "Proprietar persoană fizică (extras CF dovada)",
      "Clădire cu uz rezidențial (NU comercial/industrial)",
      "Niciun ajutor AFM pentru același tip de instalație în ultimii 3 ani",
      "Echipament nou cu certificat CE",
      "Instalator validat AFM (lista oficială)",
    ],
    maxMeasures: {
      pv_kwp: 0,         // ELIMINAT — PV e în Casa Verde Fotovoltaice
      hp_kw: null,
      storage_kwh: 0,    // ELIMINAT — stocare e în Casa Verde Fotovoltaice
      solar_m2: null,
    },
    active: true,
    note: "Ghid AFM 2026: 20.000 RON aer-apă, 30.000 RON sol-apă, 35.000 RON hibrid, " +
          "10.000 RON solar termic. PV/baterii sunt în program separat (Casa Verde Fotovoltaice).",
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
    // Sprint 26 P1.17 — cofinanțare variabilă L.153/2011 republicată:
    //   - UAT (autoritate publică locală): 30% cofinanțare locală + 70% buget de stat
    //   - Asociație proprietari (privat): 50% cofinanțare proprie + 50% MDLPA
    //   - Mixt (intervenție mixtă UAT + privat): 40% cofinanțare medie
    // grantPct rămâne 50 ca DEFAULT (cazul cel mai frecvent — asociație); apelantii
    // pot suprascrie via building.ownerType ("uat" | "asociation" | "mixed").
    grantPct: 50,
    cofinancePct: 50,
    cofinanceByOwnerType: {
      uat:        { grantPct: 70, cofinancePct: 30 },  // UAT primește 70% stat, contribuie 30% local
      asociation: { grantPct: 50, cofinancePct: 50 },  // Asociație: 50/50 (default)
      mixed:      { grantPct: 60, cofinancePct: 40 },  // Mixt: 60/40
    },
    eligibleMeasures: ["Termoizolare fațadă", "Termoizolare acoperiș", "Ferestre comune", "Instalații comune"],
    conditions: [
      "Bloc cu minimum 4 etaje",
      "Asociație de proprietari constituită legal SAU UAT proprietar",
      "Acord minim 2/3 din proprietari (asociație) sau hotărâre CL (UAT)",
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

    // Sprint 26 P1.17 — HG 906/2023 cofinanțare variabilă per ownerType
    let progEffective = prog;
    if (prog.id === "hg906_blocuri" && prog.cofinanceByOwnerType) {
      const owner = ownerType === "uat" ? "uat"
                  : ownerType === "mixed" ? "mixed"
                  : "asociation";
      const override = prog.cofinanceByOwnerType[owner];
      if (override) {
        progEffective = { ...prog, grantPct: override.grantPct, cofinancePct: override.cofinancePct };
      }
    }

    // Calcul grant
    let grantAmount = 0;
    let eligibleCost = investTotal;

    // Sprint 25 P0.3 — Casa Verde Plus 2026: breakdown nativ RON convertit la EUR runtime
    if (prog.id === "casa_verde_plus_rez" && prog.maxGrantBreakdown_RON) {
      const eurRon = getEurRonSync();
      const measuresStr = (measures || []).join(" ").toLowerCase();
      const hasHybrid = /hibrid|hybrid/.test(measuresStr);
      const hasGW = /sol[ -]apa|sol[ -]apă|geotermal/.test(measuresStr);
      const hasAW = /aer[ -]apa|aer[ -]apă|aer[ -]aer/.test(measuresStr);
      const hasSolar = /solar term|panouri solare acm/.test(measuresStr);
      const hasHP = /pompă|pompa|heat pump|hp[ _]/.test(measuresStr);

      let limit_RON;
      if (hasHybrid)      limit_RON = prog.maxGrantBreakdown_RON.hp_hybrid;
      else if (hasGW)     limit_RON = prog.maxGrantBreakdown_RON.hp_gw;
      else if (hasAW)     limit_RON = prog.maxGrantBreakdown_RON.hp_aw;
      else if (hasHP)     limit_RON = prog.maxGrantBreakdown_RON.hp_aw;  // fallback aer-apă
      else                limit_RON = prog.maxGrant_RON;

      if (hasSolar) {
        limit_RON = Math.min(
          limit_RON + prog.maxGrantBreakdown_RON.solar_thermal,
          prog.maxGrantBreakdown_RON.cumul_max
        );
      }

      const limit_EUR = limit_RON / eurRon;
      eligibleCost = Math.min(investTotal, limit_EUR / (prog.grantPct / 100));
    }

    // Limitare kWp PV
    if (pvKwp && prog.maxMeasures?.pv_kwp) {
      const pvEligible = Math.min(pvKwp, prog.maxMeasures.pv_kwp);
      const pvPct = pvKwp > 0 ? pvEligible / pvKwp : 1;
      if (pvPct < 1) eligibleCost = investTotal * pvPct;
    }

    // Sprint 26 P1.17 — folosește progEffective.grantPct (override per ownerType pentru HG 906)
    grantAmount = Math.min(eligibleCost * (progEffective.grantPct / 100), prog.maxGrant_EUR);
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
      grantPct: progEffective.grantPct,
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
