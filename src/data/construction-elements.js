/**
 * construction-elements.js — Bază de date constructive și energetice
 * Extrage din cercetare aprofundată: ZEPHREN_RESEARCH_PARAMETRI_CONSTRUCTIVI.md
 * Conține elemente opace, vitrate, punți termice, și sisteme energetice
 * Standarde: EN 15316, EN 15232, EN 16798, EN 12464, ISO 6946, EN 13370
 * Data: 10 aprilie 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. ELEMENTE CONSTRUCTIVE OPACE
// ═══════════════════════════════════════════════════════════════════════════

export const OPAQUE_WALL_TYPES = [
  // ── PEREȚI DIN ZIDĂRIE ──────────────────────────────────────────────────
  {
    id: "WALL_BRICK_SOLID",
    label: "Perete zidărie plin (cărămidă neizolată)",
    category: "Pereți din zidărie",
    lambda: { min: 0.5, max: 1.0, unit: "W/mK" },
    u_value: { min: 1.8, max: 2.0, unit: "W/m²K" },
    density: { min: 1600, max: 1800, unit: "kg/m³" },
    thermal_mass: "ÎNALT",
    market_ro: "ABUNDENT (clădiri vechi)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Fornaci Brioni", "Schreding", "Wienerberger"],
    price_per_m2: 25,
    notes: "Neizolat, valori tipice pentru pre-1990",
  },
  {
    id: "WALL_BRICK_ISOLATED",
    label: "Perete zidărie cărămidă + 50mm EPS",
    category: "Pereți din zidărie",
    lambda: 0.04,
    u_value: { min: 0.6, max: 0.8, unit: "W/m²K" },
    density: "Mix (1600+25)",
    thermal_mass: "MEDIU",
    market_ro: "MEDIU (renovări 2000-2010)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Termopan", "Isover", "Rockwool"],
    price_per_m2: 65,
    notes: "Îmbunătățire ~50% fa de neizolat",
  },
  {
    id: "WALL_BLOCK_CONCRETE_DENSE",
    label: "Perete din bloc beton dens (neizolat)",
    category: "Pereți din zidărie",
    lambda: 1.33,
    u_value: { min: 1.36, max: 1.78, unit: "W/m²K" },
    density: { min: 1800, max: 2200, unit: "kg/m³" },
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "ABUNDENT (blocuri 60-80)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Grup Beton", "Stoneblock", "Termobeton"],
    price_per_m2: 35,
    notes: "Tipic pentru blocuri cu goluri mici",
  },
  {
    id: "WALL_BLOCK_CONCRETE_MEDIUM",
    label: "Perete din bloc beton mediu (cavități)",
    category: "Pereți din zidărie",
    lambda: 0.51,
    u_value: { min: 0.44, max: 0.6, unit: "W/m²K" },
    density: { min: 1400, max: 1600, unit: "kg/m³" },
    thermal_mass: "MEDIU-ÎNALT",
    market_ro: "MEDIU (renovări moderne)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Thermobeton", "Isodomum", "Isobloc"],
    price_per_m2: 45,
    notes: "Cavități mici, mai ușor decât blocul dens",
  },

  // ── PEREȚI DIN BETON ─────────────────────────────────────────────────────
  {
    id: "WALL_CONCRETE_SOLID",
    label: "Perete beton masiv neizolat",
    category: "Pereți din beton",
    lambda: { min: 1.8, max: 2.0, unit: "W/mK" },
    u_value: { min: 3.5, max: 5.0, unit: "W/m²K" },
    density: { min: 2300, max: 2400, unit: "kg/m³" },
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "RĂR (clădiri industriale vechi)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Industrie", "Utilizări speciale"],
    price_per_m2: 40,
    notes: "Foarte rău din punct de vedere energetic",
  },
  {
    id: "WALL_CONCRETE_LIGHT",
    label: "Perete beton ușor (EPS + beton)",
    category: "Pereți din beton",
    lambda: { min: 0.4, max: 0.6, unit: "W/mK" },
    u_value: { min: 0.5, max: 1.2, unit: "W/m²K" },
    density: { min: 1200, max: 1800, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT (panouri prefab)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["YTONG", "Ático", "Thermopiù"],
    price_per_m2: 75,
    notes: "Panouri prefabricate standard modern",
  },
  {
    id: "WALL_CONCRETE_MINERAL_WOOL",
    label: "Perete beton + vată minerală izolație",
    category: "Pereți din beton",
    lambda: 0.05,
    u_value: { min: 0.25, max: 0.4, unit: "W/m²K" },
    density: "2300 + 120",
    thermal_mass: "MEDIU-ÎNALT (beton) + RĂZ (vată)",
    market_ro: "ABUNDENT (standard modern)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["YTONG", "Thermopiù", "Rockwool"],
    price_per_m2: 85,
    notes: "Standard pentru nZEB și renovări majore",
  },

  // ── PEREȚI DIN LEMN ──────────────────────────────────────────────────────
  {
    id: "WALL_TIMBER_SOLID",
    label: "Perete lemn masiv 150mm",
    category: "Pereți din lemn",
    lambda: 0.12,
    u_value: { min: 0.35, max: 0.5, unit: "W/m²K" },
    density: { min: 500, max: 700, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "RĂR (case din lemn)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Sieidi", "Thoma", "KLH Austria"],
    price_per_m2: 150,
    notes: "Ecologic, case din lemn tradiționale",
  },
  {
    id: "WALL_TIMBER_FRAME_INSULATED",
    label: "Perete cadru lemn + vată minerală",
    category: "Pereți din lemn",
    lambda: { min: 0.04, max: 0.07, unit: "W/mK" },
    u_value: { min: 0.2, max: 0.35, unit: "W/m²K" },
    density: "150-300 (izolație)",
    thermal_mass: "RĂZ (ușor)",
    market_ro: "MEDIU (case moderne din lemn)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Biomasa", "Eurotherm", "Isover"],
    price_per_m2: 140,
    notes: "Modern, ușor, case Skandinavian",
  },
  {
    id: "WALL_TIMBER_CLT",
    label: "Perete lemn laminat (CLT)",
    category: "Pereți din lemn",
    lambda: 0.12,
    u_value: { min: 0.3, max: 0.45, unit: "W/m²K" },
    density: { min: 420, max: 480, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "RĂR (foarte nou, Europa de Nord)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["KLH", "Stora Enso", "Hasslacher"],
    price_per_m2: 200,
    notes: "Masiv, structură, tendință viitoare",
  },

  // ── IZOLATII NOI 2026 ──────────────────────────────────────────────────────
  {
    id: "INSULATION_PUR_RIGID",
    label: "Poliuretan rigid (PUR) - 80mm",
    category: "Izolatii sintetice 2026",
    lambda: 0.024,
    u_value: { min: 0.28, max: 0.32, unit: "W/m²K" },
    density: { min: 30, max: 40, unit: "kg/m³" },
    thermal_mass: "SCĂZUT",
    market_ro: "ABUNDENT (calitate premium)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Knauf", "Recticel", "Kingspan", "Dow"],
    price_per_m2: 95,
    notes: "Cel mai eficient izolant sintetic, cost ridicat",
  },
  {
    id: "INSULATION_ROCKWOOL_80MM",
    label: "Lână de rocă (Rockwool) - 80mm",
    category: "Izolatii sintetice 2026",
    lambda: 0.037,
    u_value: { min: 0.45, max: 0.50, unit: "W/m²K" },
    density: { min: 100, max: 120, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Rockwool", "ISOVER", "Flumroc"],
    price_per_m2: 42,
    notes: "Bună izolare termică + acustică, ușor integrabilă",
  },
  {
    id: "INSULATION_ROCKWOOL_100MM",
    label: "Lână de rocă (Rockwool) - 100mm",
    category: "Izolatii sintetice 2026",
    lambda: 0.037,
    u_value: { min: 0.35, max: 0.42, unit: "W/m²K" },
    density: { min: 100, max: 120, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Rockwool", "ISOVER", "Flumroc"],
    price_per_m2: 52,
    notes: "Varian cu grosime mărită pentru performanță mai bună",
  },
  {
    id: "INSULATION_CORK_NATURAL",
    label: "Plută naturală (cork) - 100mm",
    category: "Izolatii naturale 2026",
    lambda: 0.038,
    u_value: { min: 0.37, max: 0.43, unit: "W/m²K" },
    density: { min: 100, max: 150, unit: "kg/m³" },
    thermal_mass: "MEDIU-ÎNALT",
    market_ro: "MEDIU (premium, ecologic)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["DKM", "Agglomerat", "Mesago"],
    price_per_m2: 85,
    notes: "Material ecologic renovabil, performanță bună, durabil",
  },
  {
    id: "INSULATION_AEROGEL_GRANULES",
    label: "Granule aerogel (silicat) - 80mm",
    category: "Izolatii avansate 2026",
    lambda: 0.015,
    u_value: { min: 0.18, max: 0.22, unit: "W/m²K" },
    density: { min: 150, max: 200, unit: "kg/m³" },
    thermal_mass: "SCĂZUT-MEDIU",
    market_ro: "RĂR (exotic, foarte scump)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Cabot", "Enersens", "Aspen Aerogels"],
    price_per_m2: 280,
    notes: "Cel mai bun izolant cunoscut, cost extrem de ridicat",
  },
  {
    id: "INSULATION_ETICS_SYSTEM",
    label: "Sistem ETICS (Rockwool 150mm + tencuială)",
    category: "Sisteme fațadă 2026",
    lambda: 0.037,
    u_value: { min: 0.20, max: 0.28, unit: "W/m²K" },
    density: "Mixt",
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT",
    standards: ["EN 15316", "EN ISO 6946", "EN 13751"],
    suppliers: ["Saint-Gobain", "Baumit", "Caparol"],
    price_per_m2: 145,
    notes: "Sistem complet thermofachade, standard în renovări",
  },
  {
    id: "INSULATION_TIMBER_FRAME",
    label: "Cadru din lemn cu izolație (lemn 100mm + vată)",
    category: "Sisteme structurale 2026",
    lambda: 0.045,
    u_value: { min: 0.25, max: 0.35, unit: "W/m²K" },
    density: { min: 60, max: 100, unit: "kg/m³" },
    thermal_mass: "MEDIU",
    market_ro: "MEDIU (trend crescător)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Holzwerk", "Schilliger", "Lignum"],
    price_per_m2: 180,
    notes: "Structură lemn masiv cu izolație, sustenabil, aer bun",
  },
  {
    id: "INSULATION_VENTILATED_FACADE",
    label: "Fațadă ventilată (plută 100mm + camera aer)",
    category: "Sisteme fațadă 2026",
    lambda: 0.041,
    u_value: { min: 0.22, max: 0.30, unit: "W/m²K" },
    density: "Mixt (plută + aer)",
    thermal_mass: "MEDIU",
    market_ro: "MEDIU (premium, ecologic)",
    standards: ["EN 15316", "EN ISO 6946"],
    suppliers: ["Rockpanel", "Eternit", "Equitone"],
    price_per_m2: 165,
    notes: "Drenaj prin camera aer, protecție suprafață, estetică",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. PLANȘEE
// ═══════════════════════════════════════════════════════════════════════════

export const CEILING_TYPES = [
  {
    id: "CEILING_CONCRETE_SOLID",
    label: "Planșeu beton plin 200mm (neizolat)",
    category: "Planșeu din beton",
    lambda: { min: 1.7, max: 2.0, unit: "W/mK" },
    u_value: { min: 2.5, max: 3.0, unit: "W/m²K" },
    density: 2400,
    rsi: "0.17 (orizontal sus)",
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "ABUNDENT (clădiri 60-90)",
    standards: ["EN 15316", "EN ISO 6946"],
    notes: "Cald în iarnă = punte termică majoră",
  },
  {
    id: "CEILING_CONCRETE_CAVITIES",
    label: "Planșeu beton cu cavități",
    category: "Planșeu din beton",
    lambda: 1.1,
    u_value: { min: 1.2, max: 1.5, unit: "W/m²K" },
    density: { min: 1900, max: 2000, unit: "kg/m³" },
    thermal_mass: "ÎNALT",
    market_ro: "MEDIU (pe stoc)",
    notes: "Ușor mai bun decât plinul",
  },
  {
    id: "CEILING_CONCRETE_INSULATED",
    label: "Planșeu beton + 100mm EPS (izolat)",
    category: "Planșeu din beton",
    lambda: 0.04,
    u_value: { min: 0.35, max: 0.45, unit: "W/m²K" },
    density: "2400 + 100",
    rsi: "0.17 (orizontal sus)",
    thermal_mass: "ÎNALT (beton) + RĂZ (EPS)",
    market_ro: "ABUNDENT (standard modern)",
    standards: ["EN 15316", "EN ISO 6946"],
    notes: "nZEB standard, renovări majore",
  },
  {
    id: "CEILING_TIMBER_SOLID",
    label: "Planșeu lemn masiv 200mm",
    category: "Planșeu din lemn",
    lambda: 0.12,
    u_value: { min: 0.45, max: 0.65, unit: "W/m²K" },
    density: 600,
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT (caseră tradițională)",
    notes: "Clădiri rurale vechi",
  },
  {
    id: "CEILING_TIMBER_FRAME",
    label: "Planșeu cadru lemn + vată",
    category: "Planșeu din lemn",
    lambda: 0.05,
    u_value: { min: 0.2, max: 0.3, unit: "W/m²K" },
    density: "100-150 (vată)",
    thermal_mass: "RĂZ",
    market_ro: "MEDIU (renovări caseră)",
    notes: "Case renovate modern",
  },
  {
    id: "CEILING_LIGHT_STYRENE",
    label: "Planșeu ușor (polistiren + beton)",
    category: "Planșeu ușor",
    lambda: 0.04,
    u_value: { min: 0.2, max: 0.35, unit: "W/m²K" },
    density: "500-800",
    market_ro: "ABUNDENT (panouri prefab)",
    standards: ["EN 15316"],
    suppliers: ["YTONG", "Isodomum"],
    notes: "Panouri prefabricate, ușoare",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. PODELE
// ═══════════════════════════════════════════════════════════════════════════

export const FLOOR_TYPES = [
  // ── PODELE PE TEREN ──────────────────────────────────────────────────────
  {
    id: "FLOOR_GROUND_CONCRETE_BARE",
    label: "Podea pe teren - beton neizolat",
    category: "Podele pe teren",
    lambda: 1.7,
    u_value: { min: 0.5, max: 1.0, unit: "W/m²K" },
    density: 2400,
    standard_ref: "EN 13370",
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "ABUNDENT (vechi)",
    notes: "Răcitor, pierderi mari; necesită izolație",
  },
  {
    id: "FLOOR_GROUND_CONCRETE_EPS",
    label: "Podea pe teren - beton + 80mm EPS",
    category: "Podele pe teren",
    lambda: 0.04,
    u_value: { min: 0.4, max: 0.5, unit: "W/m²K" },
    density: "2400 + 15",
    thermal_mass: "FOARTE ÎNALT (beton)",
    market_ro: "ABUNDENT (standard modern)",
    notes: "Minim standard modern; EN 13370",
  },
  {
    id: "FLOOR_GROUND_CONCRETE_PU",
    label: "Podea pe teren - beton + 100mm poliuretan",
    category: "Podele pe teren",
    lambda: 0.026,
    u_value: { min: 0.2, max: 0.25, unit: "W/m²K" },
    density: "2400 + 30",
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "RĂR (premium, scump)",
    notes: "nZEB premium, cel mai bun izolant",
  },

  // ── PODELE SUSPENDATE ────────────────────────────────────────────────────
  {
    id: "FLOOR_SUSPENDED_TIMBER",
    label: "Podea suspendată - lemn 100mm + aer 200mm",
    category: "Podele suspendate",
    lambda: "Mix",
    u_value: { min: 0.3, max: 0.45, unit: "W/m²K" },
    density: "500-700 (lemn)",
    thermal_mass: "MEDIU",
    market_ro: "MEDIU (case vechi renovate)",
    notes: "Ușoară, subspațiu neîncălzit",
  },
  {
    id: "FLOOR_SUSPENDED_CONCRETE_BARE",
    label: "Podea suspendată - beton 200mm neizolat",
    category: "Podele suspendate",
    lambda: 1.7,
    u_value: { min: 1.5, max: 2.0, unit: "W/m²K" },
    density: 2400,
    thermal_mass: "FOARTE ÎNALT",
    market_ro: "RĂR (clădiri vechi)",
    notes: "Neizolat, rău energetic",
  },
  {
    id: "FLOOR_SUSPENDED_CONCRETE_EPS",
    label: "Podea suspendată - beton + 80mm EPS",
    category: "Podele suspendate",
    lambda: 0.04,
    u_value: { min: 0.3, max: 0.45, unit: "W/m²K" },
    density: "2400 + 15",
    thermal_mass: "ÎNALT",
    market_ro: "ABUNDENT (standard modern)",
    notes: "nZEB, subspațiu neîncălzit",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. UȘI OPACE
// ═══════════════════════════════════════════════════════════════════════════

export const DOOR_TYPES = [
  {
    id: "DOOR_TIMBER_SOLID",
    label: "Ușă lemn masiv (neizolată)",
    category: "Uși opace",
    u_value: { min: 2.0, max: 3.0, unit: "W/m²K" },
    material: "Lemn + aer",
    thermal_mass: "MEDIU",
    market_ro: "ABUNDENT (tradițional)",
    standards: ["EN 14351-1"],
    notes: "Veche, rău din punct de vedere energetic",
  },
  {
    id: "DOOR_TIMBER_INSULATED",
    label: "Ușă lemn izolată (PU interior)",
    category: "Uși opace",
    u_value: { min: 1.2, max: 1.8, unit: "W/m²K" },
    material: "Lemn + poliuretan 30-50mm",
    thermal_mass: "MEDIU",
    market_ro: "MEDIU (modern)",
    standards: ["EN 14351-1"],
    suppliers: ["HÖRMANN", "Internorm", "Unilux"],
    notes: "Îmbunătățire substanțială",
  },
  {
    id: "DOOR_METAL_PU",
    label: "Ușă metal + poliuretan 40mm",
    category: "Uși opace",
    u_value: { min: 1.0, max: 1.3, unit: "W/m²K" },
    material: "Aluminiu/oțel + spumă PU",
    thermal_mass: "RĂZ",
    market_ro: "ABUNDENT (industrial, comercial)",
    standards: ["EN 14351-1"],
    notes: "Ușă rapidă, pune termică minimă",
  },
  {
    id: "DOOR_PVC_INSULATED",
    label: "Ușă PVC + izolație 60mm",
    category: "Uși opace",
    u_value: { min: 0.8, max: 1.2, unit: "W/m²K" },
    material: "PVC + EPS interior",
    thermal_mass: "RĂZ",
    market_ro: "ABUNDENT (modern standard)",
    standards: ["EN 14351-1"],
    suppliers: ["HÖRMANN", "Internorm", "UNILUX", "Aluplast"],
    price_per_m2: 200,
    notes: "nZEB standard, excelent termică",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 5. FERESTRE (ELEMENTE VITRATE)
// ═══════════════════════════════════════════════════════════════════════════

export const WINDOW_TYPES = [
  // ── FERESTRE CU 2 FOI (DUBLU) ───────────────────────────────────────────
  {
    id: "WIN_2PANE_AIR",
    label: "Fereastră 2 foi: 4+4mm aer 6mm (neizolată)",
    category: "Ferestre dublu",
    u_window: { min: 2.8, max: 3.0, unit: "W/m²K" },
    g_value: 0.75,
    frame_material: "Mix",
    market_ro: "RĂR (foarte veche, pre-1985)",
    standards: ["EN 14351-1", "EN 14351-2"],
    notes: "Fără aer nobil, prost izolant",
  },
  {
    id: "WIN_2PANE_ARGON",
    label: "Fereastră 2 foi: 4+4mm Argon 12mm",
    category: "Ferestre dublu",
    u_window: { min: 2.2, max: 2.4, unit: "W/m²K" },
    g_value: 0.7,
    frame_material: "PVC/lemn",
    market_ro: "MEDIU (vechi, pe stoc)",
    standards: ["EN 14351-1", "EN 14351-2"],
    notes: "Standard vechi (1990-2000)",
  },
  {
    id: "WIN_2PANE_LOWE_ARGON",
    label: "Fereastră 2 foi: LOW-E + Argon",
    category: "Ferestre dublu",
    u_window: { min: 1.6, max: 1.8, unit: "W/m²K" },
    g_value: { min: 0.6, max: 0.65 },
    frame_material: "PVC/lemn (bună)",
    market_ro: "ABUNDENT (standard modern 2000-2015)",
    standards: ["EN 14351-1", "EN 14351-2"],
    suppliers: ["Termopan", "Rehau", "Gealan", "Alufrig"],
    price_per_m2: 120,
    notes: "Bun compromis cost/performanță",
  },
  {
    id: "WIN_2PANE_LOWE_KRYPTON",
    label: "Fereastră 2 foi: LOW-E + Krypton",
    category: "Ferestre dublu",
    u_window: { min: 1.2, max: 1.4, unit: "W/m²K" },
    g_value: { min: 0.55, max: 0.6 },
    frame_material: "PVC/lemn premium",
    market_ro: "RĂR (premium, scump)",
    standards: ["EN 14351-1", "EN 14351-2"],
    notes: "Foarte bun, cost mare",
  },

  // ── FERESTRE CU 3 FOI (TRIPLU) ──────────────────────────────────────────
  {
    id: "WIN_3PANE_ARGON",
    label: "Fereastră 3 foi: 4+4+4mm Argon",
    category: "Ferestre triplu",
    u_window: { min: 1.0, max: 1.2, unit: "W/m²K" },
    g_value: { min: 0.55, max: 0.6 },
    frame_material: "PVC (bună)",
    market_ro: "ABUNDENT (trend modern)",
    standards: ["EN 14351-1", "EN 14351-2"],
    suppliers: ["Termopan", "Rehau", "Gealan"],
    price_per_m2: 180,
    notes: "Trend actual, nZEB standard",
  },
  {
    id: "WIN_3PANE_LOWE_ARGON",
    label: "Fereastră 3 foi: LOW-E + Argon dublu",
    category: "Ferestre triplu",
    u_window: { min: 0.8, max: 1.0, unit: "W/m²K" },
    g_value: { min: 0.5, max: 0.55 },
    frame_material: "PVC premium",
    market_ro: "ABUNDENT (standard nZEB)",
    standards: ["EN 14351-1", "EN 14351-2"],
    suppliers: ["Termopan", "Rehau"],
    price_per_m2: 220,
    notes: "nZEB standard, bun ecologic",
  },
  {
    id: "WIN_3PANE_LOWE_KRYPTON",
    label: "Fereastră 3 foi: LOW-E + Krypton dublu",
    category: "Ferestre triplu",
    u_window: { min: 0.6, max: 0.8, unit: "W/m²K" },
    g_value: { min: 0.45, max: 0.5 },
    frame_material: "PVC premium sau lemn",
    market_ro: "RĂR (premium, foarte scump)",
    standards: ["EN 14351-1", "EN 14351-2"],
    notes: "Excelent, cost foarte mare",
  },

  // ── FERESTRE NOI 2026 ──────────────────────────────────────────────────────
  {
    id: "WINDOW_VIG_VACUUM",
    label: "Fereastră cu geam vid (VIG) - dublu",
    category: "Ferestre avansate 2026",
    u_window: { min: 0.4, max: 0.6, unit: "W/m²K" },
    g_value: { min: 0.50, max: 0.60 },
    frame_material: "Aluminiu cu ruptor termic sau PVC",
    market_ro: "RĂR (inovație foarte nouă)",
    standards: ["EN 14351-1", "EN ISO 12567"],
    notes: "Gol vacuum între foi, izolație excepțională, cost premium",
  },
  {
    id: "WINDOW_TRIPLE_GLAZED_ADVANCED",
    label: "Fereastră cu trei foi - avansată (LOW-E + gaz)",
    category: "Ferestre avansate 2026",
    u_window: { min: 0.5, max: 0.7, unit: "W/m²K" },
    g_value: { min: 0.55, max: 0.65 },
    frame_material: "Aluminiu cu ruptor termic sau PVC premium",
    market_ro: "MEDIU (premium, din ce în ce mai frecvent)",
    standards: ["EN 14351-1", "EN 12567"],
    notes: "Trei foi LOW-E + argon, standard nZEB modern",
  },
  {
    id: "WINDOW_BIFACIAL_THIN_FILM",
    label: "Fereastră bifață cu peliculă PV integrată",
    category: "Ferestre inteligente 2026",
    u_window: { min: 0.8, max: 1.0, unit: "W/m²K" },
    g_value: { min: 0.10, max: 0.20 },
    pv_efficiency: { min: 0.05, max: 0.10, unit: "%" },
    frame_material: "Aluminiu cu ruptor termic",
    market_ro: "RĂR (prototip, R&D)",
    standards: ["EN 14351-1", "IEC 61215"],
    notes: "Generare mică de energie, izolație mai redusă, concept viitor",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 6. PUNȚI TERMICE
// ═══════════════════════════════════════════════════════════════════════════

export const THERMAL_BRIDGES = [
  {
    id: "TB_CORNER_EXTERNAL",
    label: "Colț exterior (perete + acoperiș)",
    psi_coefficient: { min: 0.05, max: 0.15, unit: "W/mK" },
    location: "Interfață verticală-orizontală",
    weight_in_balance: "5-15%",
    minimization: "Izolații continue fără întreruperi",
    standard: "EN 15316",
    notes: "Punte importantă în calcul; EN 15316 Tab. 7.2",
  },
  {
    id: "TB_PARAPET_WINDOW",
    label: "Paraapet deasupra geamului",
    psi_coefficient: { min: 0.08, max: 0.2, unit: "W/mK" },
    location: "Interfață ușă/fereastră-perete",
    weight_in_balance: "5-10%",
    minimization: "Ruperi termice pe profile metalice",
    standard: "EN 15316",
    notes: "Critică pentru ferestre la etaj",
  },
  {
    id: "TB_PIPE_TRAVERSAL",
    label: "Traversare țeavă (gaz, apă)",
    psi_coefficient: { min: 0.02, max: 0.04, unit: "W/mK" },
    location: "Prin perete exterior",
    weight_in_balance: "<1%",
    minimization: "Mânșon izolant",
    standard: "EN 15316",
  },
  {
    id: "TB_STRUCTURAL_ANCHOR",
    label: "Ancoraj structural (plăci beton)",
    psi_coefficient: { min: 0.04, max: 0.1, unit: "W/mK" },
    location: "Traversare beton prin izolație",
    weight_in_balance: "2-5%",
    minimization: "Ancore termice",
    standard: "EN 15316",
  },
  {
    id: "TB_CONCRETE_BEAM",
    label: "Grindă betoanată",
    psi_coefficient: { min: 0.1, max: 0.3, unit: "W/mK" },
    location: "Traversare perete complet",
    weight_in_balance: "5-10%",
    minimization: "Izolatii suplimentare, sisteme frameless",
    standard: "EN 15316",
    notes: "Cea mai importantă punte în multietaj",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 7. ECHIPAMENTE ENERGETICE PRINCIPALE (referință)
// ═══════════════════════════════════════════════════════════════════════════

export const HEATING_SYSTEMS_SUMMARY = [
  { id: "HP_AIR_AIR", label: "Pompă de căldură aer-aer", cop: 3.2, market: "ABUNDENT", price_ro: "€3000-5000" },
  { id: "HP_AIR_WATER", label: "Pompă de căldură aer-apă", cop: 3.5, market: "ABUNDENT", price_ro: "€4000-7000" },
  { id: "HP_GROUND", label: "Pompă de căldură sol-apă", cop: 4.5, market: "MEDIU", price_ro: "€6000-10000" },
  { id: "BOILER_COND", label: "Cazan condensare gaz", eta: 1.05, market: "ABUNDENT", price_ro: "€1500-3000" },
  { id: "BOILER_BIOMASS", label: "Cazan peleți automat", eta: 0.9, market: "MEDIU", price_ro: "€2000-4000" },
  { id: "SOLAR_THERMAL", label: "Panou solar termic", efficiency: 0.8, market: "MEDIU", price_ro: "€400-800/m²" },
  { id: "PV_MODULE", label: "Modul PV", efficiency: { min: 0.16, max: 0.22 }, market: "ABUNDENT", price_ro: "€0.15-0.25/W" },
];

// ═══════════════════════════════════════════════════════════════════════════
// 8. INDEXURI ȘI CĂUTĂRI RAPIDE
// ═══════════════════════════════════════════════════════════════════════════

export function findElementByCategory(category) {
  const all = [
    ...OPAQUE_WALL_TYPES,
    ...CEILING_TYPES,
    ...FLOOR_TYPES,
    ...DOOR_TYPES,
    ...WINDOW_TYPES,
  ];
  return all.filter((el) => el.category && el.category.includes(category));
}

export function findElementById(id) {
  const all = [
    ...OPAQUE_WALL_TYPES,
    ...CEILING_TYPES,
    ...FLOOR_TYPES,
    ...DOOR_TYPES,
    ...WINDOW_TYPES,
  ];
  return all.find((el) => el.id === id) || null;
}

export function getUValueRange(elementId) {
  const el = findElementById(elementId);
  if (!el) return null;
  const uVal = el.u_value || el.u_window;
  if (!uVal) return null;
  if (typeof uVal === "number") return { min: uVal, max: uVal };
  return uVal;
}

/**
 * Calculează U-value mediu din interval
 * @param {Object} uRange - {min, max, unit}
 * @returns {number} Media aritmetică
 */
export function getMeanUValue(uRange) {
  if (typeof uRange === "number") return uRange;
  if (uRange.min && uRange.max) return (uRange.min + uRange.max) / 2;
  return null;
}
