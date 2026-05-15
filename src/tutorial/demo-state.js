// ═════════════════════════════════════════════════════════════════════════════
// demo-state.js — Date sumarizate M1-M5 pentru afișare în tutorial
//
// NU duplicăm DEMO_PROJECTS complete (4000+ LOC) — păstrăm doar info esențială
// pentru afișare în snapshot-uri și branching. Datele complete rămân în
// src/data/demoProjects.js și se aplică prin energy-calc.jsx când utilizatorul
// finalizează tutorialul.
// ═════════════════════════════════════════════════════════════════════════════

export const DEMOS_SUMMARY = {
  M1: {
    id: "M1",
    title: "Apartament bloc PAFP '75",
    location: "Constanța (Zona I, ~2.000 GD)",
    category: "RA",
    categoryFull: "Rezidențial Apartament în Bloc",
    yearBuilt: 1975,
    areaUseful: 65,
    volume: 162,
    nLevels: "P+4 (apart. etaj 2)",
    n50: 7.5,
    envelope: "PAFP sandwich BA80+PS20deg+BA150 (neanvelopat)",
    U_perete: 1.47,
    heating: "Termoficare RADET (DH)",
    eta_gen: "0.85 rețea DH",
    acm: "Boiler electric",
    renewables: "Niciuna",
    rer: 0,
    ep_live: 700,
    ep_nren_live: 700,
    classLive: "G",
    classCO2: "G",
    co2_kgm2: 175,
    costEstYearly: 4200,
    scope: "renovare",
    keyChallenge: "Bloc — proprietarul individual nu poate modifica anvelopa fără asociație. Pașaport limitat.",
    epbdLimit: 110, // RC/RA nZEB limit kWh/m²a
  },
  M2: {
    id: "M2",
    title: "Casă unifamilială cărămidă",
    location: "Cluj-Napoca (Zona III, ~3.000 GD)",
    category: "RI",
    categoryFull: "Rezidențial Individual (casă unifamilială)",
    yearBuilt: 1965,
    areaUseful: 142,
    volume: 398,
    nLevels: "P+1E",
    n50: 5.5,
    envelope: "Cărămidă plină 40 cm neizolat + planșeu pod neizolat",
    U_perete: 1.18,
    heating: "CT gaz condensație + radiatoare",
    eta_gen: "0.97 (HHV 0.88)",
    acm: "Integrat CT (instant)",
    renewables: "PV 3 kWp existent (instalat 2020)",
    rer: 2.7,
    ep_live: 976,
    ep_nren_live: 909,
    classLive: "G",
    classCO2: "E",
    co2_kgm2: 195,
    costEstYearly: 7800,
    scope: "vanzare",
    keyChallenge: "Casă standalone — toată anvelopa proprietate. Multe scenarii reabilitare posibile (10/15 cm EPS, ferestre Low-E, VMC, HP).",
    epbdLimit: 125, // RI nZEB limit kWh/m²a
    isPrimary: true,
  },
  M3: {
    id: "M3",
    title: "Birouri 2005 BCA+ETICS",
    location: "București (Zona II, ~2.300 GD)",
    category: "BI",
    categoryFull: "Birouri nerezidențial",
    yearBuilt: 2005,
    areaUseful: 1200,
    volume: 3600,
    nLevels: "S+P+3E",
    n50: 3.0,
    envelope: "BCA 30 cm + ETICS 5 cm (origine 2005, degradat)",
    U_perete: 0.41,
    heating: "VRF degradat (SCOP 2.8) + radiatoare backup",
    eta_gen: "VRF 2.8 (degradat)",
    acm: "Boiler electric + recirculare",
    renewables: "PV 15 kWp + Solar termic 20 m²",
    rer: 3.6,
    ep_live: 334,
    ep_nren_live: 306,
    classLive: "D",
    classCO2: "C",
    co2_kgm2: 95,
    costEstYearly: 38500,
    scope: "consum",
    keyChallenge: "Nerezidențial — BACS clasa B obligatorie (>290 kW), SRI complet, MEPS 2030 conform Art. 9.1.b EPBD.",
    epbdLimit: 145, // BI nZEB limit kWh/m²a
  },
  M4: {
    id: "M4",
    title: "Școală gimnazială 1980",
    location: "Brașov (Zona IV, ~3.400 GD)",
    category: "ED",
    categoryFull: "Educație (școală)",
    yearBuilt: 1980,
    areaUseful: 1850,
    volume: 5550,
    nLevels: "P+2E",
    n50: 6.0,
    envelope: "Zidărie 38 cm + tencuială (NEREABILITATĂ)",
    U_perete: 1.10,
    heating: "CT central gaz (η=0.78) + radiatoare",
    eta_gen: "0.78",
    acm: "Boiler electric local (lavoar)",
    renewables: "Niciuna",
    rer: 0,
    ep_live: 1099,
    ep_nren_live: 1099,
    classLive: "G",
    classCO2: "F",
    co2_kgm2: 220,
    costEstYearly: 65000,
    scope: "consum",
    keyChallenge: "Nerezidențial public — eligibil PNRR + AFM. nZEB ED ≤60 kWh/m²a, foarte strict — necesită reabilitare profundă.",
    epbdLimit: 60, // ED nZEB limit kWh/m²a (foarte strict)
  },
  M5: {
    id: "M5",
    title: "Casă unifamilială nouă ZEB",
    location: "Sibiu (Zona III, ~3.170 GD)",
    category: "RI",
    categoryFull: "Rezidențial Individual nou ZEB",
    yearBuilt: 2024,
    areaUseful: 160,
    volume: 448,
    nLevels: "P+1E",
    n50: 0.6,
    envelope: "Cărămidă cu goluri + EPS 25 cm + ferestre triple Low-E",
    U_perete: 0.13,
    heating: "Pompă căldură sol-apă SCOP 4.8 + VMC HR90%",
    eta_gen: "SCOP 4.8",
    acm: "PC + boiler 300L",
    renewables: "PV 6 kWp + Solar termic 8 m² + baterie 10 kWh",
    rer: 66,
    ep_live: 156,
    ep_nren_live: 0,
    classLive: "A+",
    classCO2: "A+",
    co2_kgm2: 12,
    costEstYearly: 1800,
    scope: "construire",
    keyChallenge: "ZEB nouă — exemplu „cum arată conformitate”. Construire = bază pentru Raport nZEB obligatoriu Art. 6 alin. 1 Ord. 348/2026.",
    epbdLimit: 125, // RI nZEB limit kWh/m²a (M5 e mult sub)
  },
};

// Helper: returnează demo-ul activ sau M2 default
export function getDemo(id) {
  return DEMOS_SUMMARY[id] || DEMOS_SUMMARY.M2;
}

// Helper: formatare label scurt pentru badge
export function getDemoBadge(id) {
  const d = DEMOS_SUMMARY[id];
  if (!d) return "";
  return `${d.id} · ${d.category} · Clasă ${d.classLive}`;
}
