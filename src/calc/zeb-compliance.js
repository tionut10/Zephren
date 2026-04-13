// ═══════════════════════════════════════════════════════════════
// ZEB — ZERO EMISSION BUILDINGS
// Directiva (UE) 2024/1275 (EPBD recast) Art.2, Art.7, Art.11
// ═══════════════════════════════════════════════════════════════
// Definiție ZEB (Art.2 par.2):
//   Clădire cu performanță energetică foarte înaltă, care necesită
//   zero sau foarte puțină energie, produce zero emisii CO₂ din
//   combustibili fosili, și are zero sau foarte puține emisii
//   operaționale de GES.
//
// Timeline implementare:
//   01.01.2028 — obligatoriu clădiri noi ocupate/deținute autorități publice
//   01.01.2030 — obligatoriu TOATE clădirile noi
//   2050       — orizont renovare fond existent spre ZEB
// ═══════════════════════════════════════════════════════════════

// ── Praguri ZEB per categorie clădire ──────────────────────────
// EPBD 2024/1275 Art.7 + Anexa I: Statele membre definesc pragurile
// Valori orientative bazate pe JRC Technical Report 2022 + BPIE
export const ZEB_THRESHOLDS = {
  residential: {
    ep_nren_max: 30,      // [kWh/(m²·an)] energie primară neregenerabilă
    ep_tot_max: 60,       // [kWh/(m²·an)] energie primară totală
    co2_max: 5,           // [kg CO₂/(m²·an)] emisii operaționale
    rer_min: 50,          // [%] pondere minimă energie regenerabilă
    label: "Rezidențial",
  },
  office: {
    ep_nren_max: 40,
    ep_tot_max: 80,
    co2_max: 7,
    rer_min: 50,
    label: "Birouri",
  },
  education: {
    ep_nren_max: 35,
    ep_tot_max: 70,
    co2_max: 6,
    rer_min: 50,
    label: "Educație",
  },
  healthcare: {
    ep_nren_max: 80,
    ep_tot_max: 150,
    co2_max: 12,
    rer_min: 40,
    label: "Sănătate",
  },
  hotel: {
    ep_nren_max: 55,
    ep_tot_max: 100,
    co2_max: 9,
    rer_min: 45,
    label: "Hotel/Restaurant",
  },
  retail: {
    ep_nren_max: 50,
    ep_tot_max: 90,
    co2_max: 8,
    rer_min: 45,
    label: "Comerț",
  },
  industry: {
    ep_nren_max: 45,
    ep_tot_max: 85,
    co2_max: 7,
    rer_min: 45,
    label: "Industrial",
  },
};

// Mapare categorie clădire Zephren → categorie ZEB
const CATEGORY_MAP = {
  RI: "residential", RC: "residential", RA: "residential",
  BI: "office",
  ED: "education",
  SA: "healthcare",
  HC: "hotel",
  CO: "retail",
  SP: "education",
  IN: "industry",
  AL: "office",
};

// ── Factori emisie CO₂ per sursă energie [kg CO₂/kWh final] ──
// Mc 001-2022 + ANRE 2024 + IPCC 2019
export const CO2_EMISSION_FACTORS = {
  gaz_natural:    0.202,  // kg CO₂/kWh (PCI)
  gpl:            0.227,
  motorina:       0.267,
  pacura:         0.279,
  carbune:        0.354,
  biomasa_lemn:   0.018,  // considerat aproape neutru (ciclu scurt carbon)
  biomasa_peleti: 0.015,
  electricitate:  0.261,  // mix rețea România 2024 (ANRE)
  termoficare:    0.180,  // mix tipic termoficare urbană
  solar_termic:   0.000,
  fotovoltaic:    0.000,
  eolian:         0.000,
  pompa_caldura:  0.000,  // emisii indirecte prin electricitate (contorizate separat)
};

// ── GWP ciclu de viață clădire [kg CO₂eq/m²/50ani] ──
// EPBD 2024/1275 Art.7(2) + EN 15978
export const GWP_LIFECYCLE_LIMITS = {
  residential_new:    { gwp_max: 600,  label: "Rezidențial nou" },
  nonres_new:         { gwp_max: 800,  label: "Nerezidențial nou" },
  residential_renov:  { gwp_max: 400,  label: "Rezidențial renovare majoră" },
  nonres_renov:       { gwp_max: 600,  label: "Nerezidențial renovare majoră" },
  // Începând cu 2030 (EPBD Art.7(2) lit.c — Level(s) framework)
};

// ── Cerințe SOLAR-READY (EPBD Art.11) ──
export const SOLAR_READY_REQ = {
  new_residential:     { desc: "Clădire nouă rezidențială",      pv_min_kWp_per_m2: 0.020, deadline: "2030-01-01" },
  new_nonresidential:  { desc: "Clădire nouă nerezidențială >250m²", pv_min_kWp_per_m2: 0.025, deadline: "2028-01-01" },
  existing_nonres:     { desc: "Nerezidențial existent >500m²",  pv_min_kWp_per_m2: 0.015, deadline: "2027-01-01" },
  major_renovation:    { desc: "Renovare majoră",                pv_min_kWp_per_m2: 0.020, deadline: "2028-01-01" },
  public_parking:      { desc: "Parcare publică acoperită",      pv_min_kWp_per_m2: 0.030, deadline: "2027-01-01" },
};

/**
 * Verificare conformitate ZEB completă
 * EPBD 2024/1275 Art.2 + Art.7
 *
 * @param {object} params — Rezultate calcul energetic clădire
 * @returns {object} Verificare ZEB cu checks detaliate
 */
export function checkZEBCompliance(params) {
  const {
    category,           // cod categorie clădire (BI, RI, etc.)
    Au,                 // suprafață utilă [m²]
    ep_nren,            // energie primară neregenerabilă [kWh/(m²·an)]
    ep_tot,             // energie primară totală [kWh/(m²·an)]
    rer,                // pondere regenerabilă [%]
    isNew = false,      // clădire nouă
    isPublic = false,   // clădire publică
    isMajorRenov = false,
    yearBuilt = null,
    // Detalii consum per sursă [kWh/an]
    consumption = {},   // { gaz_natural, electricitate, biomasa_peleti, solar_termic, ... }
    // GWP lifecycle [kg CO₂eq/m²]
    gwp_lifecycle = null,
    // PV instalat
    pv_kWp = 0,
    roofArea_m2 = 0,
  } = params;

  if (!Au || !category) return null;

  const zebCat = CATEGORY_MAP[category] || "office";
  const thresholds = ZEB_THRESHOLDS[zebCat] || ZEB_THRESHOLDS.office;

  // ── 1. CALCUL EMISII CO₂ OPERAȚIONALE ────────────────────
  let co2_total = 0;
  Object.entries(consumption).forEach(([source, kWh]) => {
    const f = CO2_EMISSION_FACTORS[source] || 0;
    co2_total += (kWh || 0) * f;
  });
  const co2_m2 = Au > 0 ? co2_total / Au : 0;

  // ── 2. VERIFICARE CERINȚE ZEB ────────────────────────────
  const checks = [];

  // 2a. Energie primară neregenerabilă
  checks.push({
    id: "ep_nren",
    label: `Energie primară neregenerabilă ≤ ${thresholds.ep_nren_max} kWh/(m²·an)`,
    value: Math.round(ep_nren * 10) / 10,
    target: thresholds.ep_nren_max,
    ok: ep_nren <= thresholds.ep_nren_max,
    severity: ep_nren <= thresholds.ep_nren_max ? "ok" : "error",
    unit: "kWh/(m²·an)",
  });

  // 2b. Energie primară totală
  checks.push({
    id: "ep_tot",
    label: `Energie primară totală ≤ ${thresholds.ep_tot_max} kWh/(m²·an)`,
    value: Math.round(ep_tot * 10) / 10,
    target: thresholds.ep_tot_max,
    ok: ep_tot <= thresholds.ep_tot_max,
    severity: ep_tot <= thresholds.ep_tot_max ? "ok" : "warning",
    unit: "kWh/(m²·an)",
  });

  // 2c. Emisii CO₂ operaționale
  checks.push({
    id: "co2",
    label: `Emisii CO₂ operaționale ≤ ${thresholds.co2_max} kg/(m²·an)`,
    value: Math.round(co2_m2 * 10) / 10,
    target: thresholds.co2_max,
    ok: co2_m2 <= thresholds.co2_max,
    severity: co2_m2 <= thresholds.co2_max ? "ok" : "error",
    unit: "kg CO₂/(m²·an)",
  });

  // 2d. Pondere regenerabilă
  checks.push({
    id: "rer",
    label: `Energie regenerabilă ≥ ${thresholds.rer_min}%`,
    value: Math.round(rer * 10) / 10,
    target: thresholds.rer_min,
    ok: rer >= thresholds.rer_min,
    severity: rer >= thresholds.rer_min ? "ok" : "warning",
    unit: "%",
  });

  // 2e. Zero combustibili fosili (Art.2 — "zero fossil fuel emissions")
  const fossilSources = ["gaz_natural", "gpl", "motorina", "pacura", "carbune"];
  const hasFossil = fossilSources.some(s => (consumption[s] || 0) > 0);
  checks.push({
    id: "no_fossil",
    label: "Zero emisii din combustibili fosili la fața locului",
    value: hasFossil ? "NU — folosește combustibili fosili" : "DA",
    target: "DA",
    ok: !hasFossil,
    severity: hasFossil ? "error" : "ok",
  });

  // 2f. GWP ciclu de viață (dacă disponibil)
  if (gwp_lifecycle !== null) {
    const isRes = ["RI","RC","RA"].includes(category);
    const gwpKey = isNew
      ? (isRes ? "residential_new" : "nonres_new")
      : (isRes ? "residential_renov" : "nonres_renov");
    const gwpLimit = GWP_LIFECYCLE_LIMITS[gwpKey];
    checks.push({
      id: "gwp_lifecycle",
      label: `GWP ciclu viață ≤ ${gwpLimit.gwp_max} kg CO₂eq/m² (50 ani)`,
      value: Math.round(gwp_lifecycle),
      target: gwpLimit.gwp_max,
      ok: gwp_lifecycle <= gwpLimit.gwp_max,
      severity: gwp_lifecycle <= gwpLimit.gwp_max ? "ok" : "warning",
      unit: "kg CO₂eq/m²",
    });
  }

  // 2g. Instalare PV / solar-ready (Art.11)
  if (roofArea_m2 > 0) {
    const pvDensity = pv_kWp / roofArea_m2;
    const pvTarget = isNew ? 0.020 : 0.015;
    checks.push({
      id: "solar_pv",
      label: `Instalare PV ≥ ${pvTarget * 1000} Wp/m² acoperiș`,
      value: Math.round(pvDensity * 1000 * 10) / 10,
      target: pvTarget * 1000,
      ok: pvDensity >= pvTarget,
      severity: pvDensity >= pvTarget ? "ok" : "warning",
      unit: "Wp/m² acoperiș",
    });
  }

  // ── 3. CLASIFICARE ZEB ───────────────────────────────────
  const criticalChecks = checks.filter(c => c.id === "ep_nren" || c.id === "co2" || c.id === "no_fossil");
  const allCritical = criticalChecks.every(c => c.ok);
  const allChecks = checks.every(c => c.ok);
  const passCount = checks.filter(c => c.ok).length;

  // ── 4. TIMELINE OBLIGATIVITATE ───────────────────────────
  let deadline = null;
  let mandatory = false;
  if (isNew && isPublic) {
    deadline = "2028-01-01";
    mandatory = true;
  } else if (isNew) {
    deadline = "2030-01-01";
    mandatory = true;
  } else if (isMajorRenov) {
    deadline = "2030-01-01";
    mandatory = false; // recomandat, nu obligatoriu
  }

  const isZEB = allCritical && passCount >= checks.length - 1;

  return {
    checks,
    category: zebCat,
    categoryLabel: thresholds.label,

    // Emisii calculate
    co2_total_kg: Math.round(co2_total),
    co2_m2_kg: Math.round(co2_m2 * 10) / 10,

    // Clasificare
    isZEB,
    passCount,
    totalChecks: checks.length,
    allCriticalPass: allCritical,

    // Timeline
    deadline,
    mandatory,
    mandatoryLabel: mandatory
      ? `Obligatoriu de la ${deadline} (EPBD 2024/1275 Art.7)`
      : "Neobligatoriu în prezent — recomandat",

    // Verdict
    verdict: isZEB
      ? "CLĂDIRE CU EMISII ZERO (ZEB) — CONFORM EPBD 2024/1275"
      : allCritical
        ? `APROAPE ZEB — ${checks.length - passCount} criteriu(i) sub prag`
        : `NECONFORM ZEB — ${criticalChecks.filter(c=>!c.ok).length} criteriu(i) critice neîndeplinite`,
    color: isZEB ? "#22c55e" : allCritical ? "#eab308" : "#ef4444",
    reference: "Directiva (UE) 2024/1275 EPBD Art.2, Art.7, Art.11 + JRC Technical Report",
  };
}


// ═══════════════════════════════════════════════════════════════
// LEGEA 121/2014 — EFICIENȚĂ ENERGETICĂ CLĂDIRI PUBLICE
// Transpunere Directiva 2012/27/UE (EED) + OUG 130/2022 + OUG 59/2025
// ═══════════════════════════════════════════════════════════════

// Obligații cheie Legea 121/2014 Art.5-6
export const PUBLIC_BUILDING_OBLIGATIONS = {
  annual_renovation_rate: 3, // % din suprafața totală/an
  min_area_threshold: 250,   // m² — prag aplicabilitate (post 09.07.2015)
  audit_mandatory: true,     // audit energetic obligatoriu
  green_procurement: true,   // achiziții publice verzi

  // Exceptări Art.5 alin.5
  exemptions: [
    "Clădiri protejate ca monument istoric sau parte a unui sit protejat",
    "Clădiri deținute de forțele armate (exceptând locuințe și birouri)",
    "Lăcașuri de cult și clădiri pentru activități religioase",
  ],

  // Flexibilitate Art.5 alin.6
  flexibility: "Excesul de renovare peste 3% într-un an poate fi creditat în oricare din cei 3 ani anteriori sau următori",
};

/**
 * Verificare conformitate Legea 121/2014 pentru clădiri publice
 * @param {object} building — Date clădire publică
 * @returns {object} Verificare obligații + recomandări
 */
export function checkLegea121Compliance(building) {
  const {
    isPublic = false,
    isCentralAdmin = false,  // administrație publică centrală
    Au = 0,                  // suprafață utilă totală [m²]
    totalPublicArea = 0,     // suprafața totală clădiri publice entitate [m²]
    renovatedArea = 0,       // suprafață renovată an curent [m²]
    hasEnergyAudit = false,  // audit energetic realizat
    hasCPE = false,          // certificat performanță energetică
    yearBuilt = null,
    category = "BI",
    // Exceptări
    isHistoric = false,
    isMilitary = false,
    isReligious = false,
  } = building;

  if (!isPublic) {
    return {
      applicable: false,
      verdict: "Legea 121/2014 Art.5-6 se aplică doar clădirilor publice",
      checks: [],
    };
  }

  // Verificare exceptare
  const isExempt = isHistoric || isMilitary || isReligious;
  if (isExempt) {
    return {
      applicable: false,
      verdict: "Clădire exceptată conform Legea 121/2014 Art.5 alin.5",
      exemptionReason: isHistoric ? "Monument istoric" : isMilitary ? "Clădire militară" : "Lăcaș de cult",
      checks: [],
    };
  }

  const checks = [];

  // 1. Prag suprafață
  const meetsThreshold = Au >= PUBLIC_BUILDING_OBLIGATIONS.min_area_threshold;
  checks.push({
    id: "area_threshold",
    label: `Suprafață ≥ ${PUBLIC_BUILDING_OBLIGATIONS.min_area_threshold} m²`,
    value: Math.round(Au),
    target: PUBLIC_BUILDING_OBLIGATIONS.min_area_threshold,
    ok: meetsThreshold,
    severity: meetsThreshold ? "ok" : "info",
    unit: "m²",
  });

  // 2. Rata renovare 3% (dacă administrație publică centrală)
  if (isCentralAdmin && totalPublicArea > 0) {
    const renovTarget = totalPublicArea * 0.03;
    const renovOk = renovatedArea >= renovTarget;
    checks.push({
      id: "renovation_3pct",
      label: `Renovare ≥ 3% din suprafața totală (${Math.round(renovTarget)} m²/an)`,
      value: Math.round(renovatedArea),
      target: Math.round(renovTarget),
      ok: renovOk,
      severity: renovOk ? "ok" : "error",
      unit: "m² renovați/an",
    });
  }

  // 3. Audit energetic
  checks.push({
    id: "energy_audit",
    label: "Audit energetic realizat (obligatoriu)",
    value: hasEnergyAudit ? "DA" : "NU",
    target: "DA",
    ok: hasEnergyAudit,
    severity: hasEnergyAudit ? "ok" : "warning",
  });

  // 4. Certificat performanță energetică
  checks.push({
    id: "cpe",
    label: "Certificat de performanță energetică (CPE) valabil",
    value: hasCPE ? "DA" : "NU",
    target: "DA",
    ok: hasCPE,
    severity: hasCPE ? "ok" : "warning",
  });

  // 5. CPE afișat vizibil (Art.6 L.372/2005 + L.121/2014)
  if (Au >= 250) {
    checks.push({
      id: "cpe_display",
      label: "CPE afișat vizibil (clădire publică >250 m²)",
      value: hasCPE ? "PRESUPUS" : "NU",
      target: "DA",
      ok: hasCPE, // presupunem afișat dacă există
      severity: hasCPE ? "ok" : "warning",
    });
  }

  const allOk = checks.every(c => c.ok);
  const criticalFails = checks.filter(c => !c.ok && c.severity === "error").length;

  return {
    applicable: true,
    checks,
    isExempt: false,
    allOk,
    passCount: checks.filter(c => c.ok).length,
    totalChecks: checks.length,
    criticalFails,

    // Recomandări
    recommendations: [
      ...(!hasEnergyAudit ? ["Realizați audit energetic conform NP 048-2000 / Legea 121/2014"] : []),
      ...(!hasCPE ? ["Obțineți Certificat de Performanță Energetică (CPE) conform Mc 001-2022"] : []),
      ...(isCentralAdmin && totalPublicArea > 0 && renovatedArea < totalPublicArea * 0.03
        ? [`Renovați minim ${Math.round(totalPublicArea * 0.03)} m² în anul curent (3% obligatoriu)`] : []),
    ],

    verdict: allOk
      ? "CONFORM Legea 121/2014 — obligații clădiri publice îndeplinite"
      : criticalFails > 0
        ? `NECONFORM — ${criticalFails} obligație(i) critice neîndeplinite`
        : `PARȚIAL CONFORM — ${checks.length - checks.filter(c=>c.ok).length} verificare(i) de rezolvat`,
    color: allOk ? "#22c55e" : criticalFails > 0 ? "#ef4444" : "#eab308",
    reference: "Legea 121/2014 Art.5-6 + OUG 130/2022 + OUG 59/2025",
  };
}
