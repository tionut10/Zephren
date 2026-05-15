// ═════════════════════════════════════════════════════════════════════════════
// demoProjects.js — 5 modele DEMO v3 (refactor 9 mai 2026 + rebalansare 15 mai 2026)
//
// Tipologii noi (zone climatice I→V):
//   M1 — Apartament bloc PAFP '75 — Constanța (Zona I, ≤2.000 GD) — DH RADET — clasă G
//   M2 — Casă unifamilială cărămidă — Cluj-Napoca (Zona III, ~3.000 GD) — CT gaz cond + PV 3 kWp — clasă E
//   M3 — Birouri BI 2005 — București (Zona II, ~2.300 GD) — VRF degradat + PV 15 + ST 20 m² — clasă C
//   M4 — Școală gimnazială — Brașov (Zona IV, ~3.400 GD) — CT central gaz, NEREABILITATĂ — clasă F
//   M5 — Casă unifamilială nouă ZEB — Sibiu (Zona III, ~3.170 GD) — PC sol-apă + VMC HR90 + PV 6 + ST 8 — clasă A+ (ZEB)
//
// Conformitate: Mc 001-2022, Ord. MDLPA 16/2023, SR EN ISO 14683 (punți Ψ liniare),
// SR EN ISO 6946 (Rsi/Rse stratigrafii), SR EN 10456 (λ/ρ materiale), EN 16798-1 (IAQ),
// EN 15193-1 (LENI iluminat), EN 15316-3 (ACM), EN 15232 (BACS), L.238/2024 nZEB,
// EPBD 2024/1275/UE, Ord. MDLPA 348/2026.
//
// SPRINT REBALANSARE 15 MAI 2026 — M5 actualizat la statut ZEB legitim post calibrări:
//   - PV calibrat PVGIS 29 apr 2026 (×3.65 față de formulă veche, eroare <5% PVGIS v5.2)
//   - useNA2023 ON default: fP_elec_tot=2.50, fP_ambient=1.0 (Tab A.16 + corecție MDLPA 50843/09.03.2026)
//   - M5 cu PV 6 kWp produce mai mult primar decât consumă → EP_net=0 → clasă A+ (ZEB)
//
// TODO future sprint — verificare M1-M4 expectedResults vs calcul live cu NA:2023:
//   - M2 (Cluj) live arată EP 968 vs expected 280 — discrepanță 3.5×, posibil over-estimare qH_nd
//   - M1, M3, M4 nu au fost verificate live în acest sprint (panou Mostre exemplu accesibil
//     doar prin click manual, automation Playwright recomandat pentru full audit)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * buildMdlpaDefaults(demo) — valori Anexa 1+2 MDLPA (Ord. 16/2023)
 *
 * Produce contextul DEMO în funcție de specificitățile proiectului încărcat:
 *  - Sobe (soba_teracota / cazan_lemn) → stoveCount calculat
 *  - Bloc (RC/RA/BC) → buildingHasDisconnectedApartments + nApartments
 *  - Nerezidențial (BI/ED/CO etc.) → fixtures minime (lavoar + WC)
 *  - Heat pump aer-apă sau sol-apă → ajustări diametru/agent
 *  - Wind enabled → detalii eoliene cu valori reale
 *  - Cooling activ → unitățile interior/exterior calculate din power
 *
 * Apelată din `loadDemoByIndex` (energy-calc.jsx) cu spread:
 *   setBuilding({ ...buildMdlpaDefaults(d), ...d.building })
 *
 * Proprietățile explicite din d.building override-uiesc defaults contextuale.
 */
export function buildMdlpaDefaults(demo = {}) {
  const b = demo.building || {};
  const heating = demo.heating || {};
  const cooling = demo.cooling || {};
  const acm = demo.acm || {};
  const solar = demo.solarThermal || {};
  const pv = demo.photovoltaic || {};
  const hp = demo.heatPump || {};
  const other = demo.otherRenew || {};

  const cat = b.category || "";
  const isBlock = ["RC", "RA", "BC"].includes(cat);
  const isResidential = ["RI", "RC", "RA", "BC"].includes(cat);
  const isOffice = cat === "BI";
  const isEdu = ["ED", "IU"].includes(cat);

  // ── Detectare surse încălzire pentru adaptări specifice ──
  // Compatibil cu codurile noi (HEAT_SOURCES din constants.js) și cu legacy lowercase
  const heatSource = String(heating.source || "").toLowerCase();
  // Coduri sobă/biomasă: SOBA_* (sobe tradiționale) + BIO_* (cazane peleți/biomasă) + legacy keywords
  const hasStove = ["soba_", "bio_", "sem_ins_p", "soba_teracota", "soba", "cazan_lemn", "cazan_peleti", "pelet"].some(
    (s) => heatSource.includes(s)
  );
  // Termoficare: TERMO/TERMO_CHP (codurile noi) + legacy "termof"
  const isTermoficare = heatSource.startsWith("termo") || heatSource.includes("termof");
  const hasCooling = !!cooling.hasCooling;
  const coolingPowerKw = parseFloat(cooling.power) || 0;
  const heatingPowerKw = parseFloat(heating.power) || 0;

  // Număr apartamente — derivare din b.units sau default 1
  const nApt = parseInt(b.units) || parseInt(b.nApartments) || 1;

  // Număr radiatoare estimat (1.5 kW / radiator standard)
  const nRadiators = heatingPowerKw > 0 ? Math.max(3, Math.ceil(heatingPowerKw / 1.5)) : 6;

  // Unități split estimate din coolingPower (~2.5 kW / split standard)
  const nCoolingUnits = coolingPowerKw > 0 ? Math.max(1, Math.ceil(coolingPowerKw / 2.5)) : 1;

  // Fixtures: rezidențial vs. nerezidențial
  const fixtures = isResidential ? {
    lavoare: String(nApt),
    cada_baie: String(nApt),
    spalatoare: String(nApt),
    rezervor_wc: String(nApt),
    bideuri: "0",
    pisoare: "0",
    dus: String(nApt),
    masina_spalat_vase: nApt > 1 ? String(Math.ceil(nApt / 2)) : "0",
    masina_spalat_rufe: String(nApt),
  } : isOffice ? {
    lavoare: "2",  cada_baie: "0", spalatoare: "1", rezervor_wc: "2",
    bideuri: "0",  pisoare: "1",   dus: "1",
    masina_spalat_vase: "0", masina_spalat_rufe: "0",
  } : isEdu ? {
    lavoare: "4",  cada_baie: "0", spalatoare: "1", rezervor_wc: "4",
    bideuri: "0",  pisoare: "2",   dus: "2",
    masina_spalat_vase: "0", masina_spalat_rufe: "0",
  } : {
    lavoare: "1",  cada_baie: "0", spalatoare: "0", rezervor_wc: "1",
    bideuri: "0",  pisoare: "0",   dus: "0",
    masina_spalat_vase: "0", masina_spalat_rufe: "0",
  };

  // Puncte consum total (lavoare + cadă + duș + spălătoare)
  const totalPoints =
    (parseInt(fixtures.lavoare) || 0) +
    (parseInt(fixtures.cada_baie) || 0) +
    (parseInt(fixtures.spalatoare) || 0) +
    (parseInt(fixtures.dus) || 0);

  // Radiator type based on heating source (CT → oțel; centralizat → fontă vechi)
  const radiatorType = hasStove ? "Soba teracotă"
    : isTermoficare ? "Radiator fontă (termoficare)"
    : "Radiator oțel panou";

  // Unheated spaces — subsol + pod standard pentru casă / bloc
  const unheated = isBlock ? [
    { code: "ZU1", diameter_mm: "32", length_m: "15" },  // Subsol bloc (distribuție)
    { code: "ZU2", diameter_mm: "20", length_m: "8" },   // Scara (riser)
  ] : [
    { code: "ZU1", diameter_mm: "20", length_m: "6" },   // Subsol casă
  ];

  // Agent frigorific — R32 pentru split-uri moderne, R410A pentru mai vechi
  const coolingRefrigerant = !hasCooling ? ""
    : (parseInt(b.yearBuilt) >= 2015) ? "R32"
    : "R410A";

  return {
    // ── Grup A — Încălzire ──
    heatGenLocation: isTermoficare ? "TERMOFICARE"
      : hasStove ? "SURSA_PROPRIE"
      : "CT_PROP",
    heatingOtherSource: "",
    heatingRadiatorType: radiatorType,
    heatingRadiators: heatingPowerKw > 0 ? [{
      type: radiatorType,
      count_private: isBlock ? Math.max(3, nRadiators - 1) : nRadiators,
      count_common: isBlock ? 1 : 0,
      power_kw: heatingPowerKw.toFixed(1),
    }] : [],
    heatingHasMeter: isBlock ? "nu" : "nu_caz",
    heatingCostAllocator: isBlock ? "da" : "nu_caz",
    heatingPipeDiameterMm: isBlock ? "32" : "25",
    heatingPipePressureMca: isTermoficare ? "4.0" : "3.5",
    stoveCount: hasStove ? (isResidential ? "2" : "1") : "",
    // ── Grup B — Anvelopă ──
    unheatedSpaces: unheated,
    buildingHasDisconnectedApartments: isBlock ? "nu" : "",
    // ── Grup C — ACM ──
    acmFixtures: fixtures,
    acmConsumePointsCount: String(totalPoints),
    acmPipeDiameterMm: isBlock ? "25" : "20",
    acmInstantPowerKw: String(acm.source || "").toLowerCase().includes("instant")
      ? (heatingPowerKw > 0 ? (heatingPowerKw * 0.5).toFixed(1) : "18")
      : "",
    acmHasMeter: isBlock ? "nu" : "nu_caz",
    acmFlowMeters: "nu_exista",
    acmRecirculation: isBlock ? "nu_functioneaza" : "nu_exista",
    // ── Grup D — Răcire ──
    coolingRefrigerant,
    coolingDehumPowerKw: "",
    coolingIndoorUnits: hasCooling ? String(nCoolingUnits) : "",
    coolingOutdoorUnits: hasCooling ? String(Math.max(1, Math.ceil(nCoolingUnits / 2))) : "",
    coolingPipeDiameterMm: hasCooling ? "12" : "",
    coolingSpaceScope: hasCooling ? "partial" : "",
    coolingHumidityControl: hasCooling ? "fara" : "",
    coolingIndividualMeter: hasCooling ? "nu" : "",
    // ── Grup E — Ventilare + Iluminat ──
    ventilationFanCount: isResidential ? "2" : (isOffice ? "6" : "4"),
    ventilationHrType: "placi",
    ventilationControlType: "manual_simpla",
    lightingNetworkState: "buna",
    lightingOtherType: "",
    // ── Grup F — Umidificare + Eoliene ──
    humidificationPowerKw: "",
    windCentralsCount: other.windEnabled ? "1" : "",
    windPowerKw: other.windEnabled && other.windCapacity ? String(other.windCapacity) : "",
    windHubHeightM: other.windEnabled ? "12" : "",
    windRotorDiameterM: other.windEnabled ? "5.5" : "",
    // ── Identificare juridică (fallback doar dacă demo nu o specifică) ──
    cadastralNumber: "250100-C1-U1",
    landBook: "CF nr. 250100",
    nApartments: String(nApt),
  };
}

/** Alias static pentru backward-compat (default rezidențial generic). */
export const DEMO_MDLPA_DEFAULTS = buildMdlpaDefaults({
  building: { category: "RI", units: "1", yearBuilt: "2010" },
  heating: { source: "GAZ_COND", power: "15" },
  cooling: { hasCooling: false },
  acm: {}, otherRenew: {},
});

// ═════════════════════════════════════════════════════════════════════════════
// SVG semnătură + ștampilă DEMO (placeholder reutilizat — vezi Step 6 UI pentru încărcare reală)
// ═════════════════════════════════════════════════════════════════════════════
const DEMO_SIG_SVG = (name) => `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>${name}</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text></svg>`;

const DEMO_STAMP_SVG = (name, code) => `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>${name}</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>${code}</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>`;

// Boilerplate AnexaMDLPA — text generic reutilizat unde tipologia nu cere conținut specific
const ANEXA_GENERIC = {
  etapeImplementare:
    "1. Identificați minimum 3 oferte comparative de la contractori autorizați.\n" +
    "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR, AFM Casa Verde Plus, fonduri locale).\n" +
    "3. Obțineți autorizațiile legale necesare (AC, avize ISU, aprobări de mediu dacă sunt aplicabile).\n" +
    "4. Implementați măsurile în ordinea priorităților: anvelopă → sisteme termice → surse regenerabile.\n" +
    "5. Documentați toate lucrările executate și obțineți declarațiile de performanță ale produselor (Reg. (UE) 305/2011).\n" +
    "6. Solicitați o nouă auditare energetică după finalizarea renovării pentru confirmarea clasei energetice (Ord. MDLPA 16/2023).",
  stimulenteFinanciare:
    "— AFM Casa Verde Plus: finanțare 100% pentru pompe de căldură și panouri solare termice (persoane fizice).\n" +
    "— PNRR componenta C5 — Valul Renovării: granturi pentru renovarea energetică până la standard nZEB.\n" +
    "— Credite verzi: BRD Eco Home / ING Green Loan / BCR Casa Ta — dobânzi preferențiale.\n" +
    "— Scheme fiscale active la data emiterii CPE pentru investiții în eficiență energetică (verifică anaf.ro).",
  solutiiAnvelopa:
    "— Verificare la fața locului a stratificării reale a anvelopei (carotaje, termoviziune SR EN 13187).\n" +
    "— Tratarea punților termice principale identificate (centură, soclu, glafuri, buiandruguri) — manșoane locale 5–10 cm.\n" +
    "— Verificarea compatibilității coeficienților de difuzie a vaporilor (μ) între straturi (Glaser).\n" +
    "— Inspecție hidroizolație acoperiș cf. CR 0-2012 / GP 070-2013.",
  solutiiInstalatii:
    "— Echilibrare hidraulică completă a circuitelor de încălzire (robinete cu presetare diferențială).\n" +
    "— Reglaj automat al temperaturii pe cameră prin termostate Smart cu programare.\n" +
    "— Inspecție și curățare anuală a generatorului termic conform prescripțiilor producătorului (HG 1043/2007).\n" +
    "— Recuperare căldură din apele uzate calde (drain water heat recovery) la dușurile cu debit mare.",
  masuriOrganizare:
    "— Plan anual de monitorizare a consumurilor (electricitate, gaz, apă caldă) cu verificare lunară.\n" +
    "— Instruirea ocupanților privind setările optime ale termostatelor pe sezon (cf. Mc 001-2022 art. 7.3).\n" +
    "— Audit energetic intermediar la fiecare 5 ani sau la modificarea regimului de utilizare (L.121/2014).\n" +
    "— Stabilirea unei persoane responsabile cu eficiența energetică.",
  masuriLocale:
    "— Etanșeizarea trecerilor prin anvelopă (cabluri, conducte, ventilație) cu mansetă EPDM + spumă PUR.\n" +
    "— Înlocuirea bateriilor sanitare cu modele cu limitare debit / aerator (clasă A WELL).\n" +
    "— Becuri LED inteligente cu senzor prezență/lumină naturală în spații tranzit.\n" +
    "— Programare orară a iluminatului și HVAC pe sezon și zi de săptămână.",
  regenerabileCustom:
    "— Sistem fotovoltaic on-grid cu invertor hibrid (autoconsum + reinjecție în rețea).\n" +
    "— Pompă de căldură aer-apă COP > 4.0 pentru încălzire/răcire (R290 propan, GWP < 3).\n" +
    "— Sistem solar termic cu colectoare plane pentru ACM (acoperire 50–70% an).\n" +
    "— Recuperator căldură ape uzate (drain water heat exchanger) cuplat la circuitul ACM.",
};

// ═════════════════════════════════════════════════════════════════════════════
// DEMO_PROJECTS — 5 modele v3 (zone climatice I→V, scenarii distincte end-to-end)
// ═════════════════════════════════════════════════════════════════════════════
export const DEMO_PROJECTS = [

  // ───────────────────────────────────────────────────────────────────────────
  // M1 — Apartament 3 cam. bloc PAFP '75 — Constanța (ZONA I, ≤2.000 GD)
  // Termoficare RADET (DH) + boiler electric ACM • neanvelopat • clasă G
  // Scop CPE: renovare (validitate 10 ani, pre-Pașaport) • fără regenerabile
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-1-constanta-pafp-1975",
    title: "M1 · Apartament bloc PAFP '75 — Constanța (Zona I, DH RADET) — clasă G",
    shortDesc: "Apt 65 m² panou mare neanvelopat, termoficare RADET + boiler electric, baseline pur (clasă G)",
    building: {
      address: "Bd. Tomis nr. 287, bl. T8, sc. B, et. 2, ap. 18",
      city: "Constanța",
      county: "Constanța",
      postal: "900725",
      postalCode: "900725",
      locality: "Constanța",
      latitude: "44.1797",
      longitude: "28.6348",
      cadastralNumber: "215680-C1-U18",
      landBook: "CF nr. 215680-C1-U18 Constanța",
      owner: "Marinescu Vasile-Gheorghe",
      ownerType: "PF",
      category: "RA",
      structure: "Panouri mari prefabricate PAFP — sandwich BA exterior 80 mm + polistiren expandat 20 mm degradat + BA interior 150 mm (1965–1989)",
      yearBuilt: "1975",
      yearRenov: "",
      floors: "P+4",
      basement: true,
      attic: false,
      units: "1",
      stairs: "1",
      nApartments: "30",
      apartmentNo: "18",
      staircase: "B",
      floor: "2",
      areaUseful: "65",
      areaBuilt: "73",
      areaHeated: "65",
      volume: "162",
      areaEnvelope: "78",
      heightBuilding: "14",
      heightFloor: "2.50",
      perimeter: "32",
      n50: "7.5",
      shadingFactor: "0.85",
      gwpLifecycle: "520",
      solarReady: false,
      evChargingPoints: "0",
      evChargingPrepared: "0",
      co2MaxPpm: "1450",
      pm25Avg: "22",
      scaleVersion: "2023",
      scopCpe: "renovare",
      parkingSpaces: "0",
      energyClassAfterRenov: "C",
      emissionClassAfterRenov: "C",
      energySavings: "62",
      co2Reduction: "58",
      apartments: [],
      commonSystems: {
        elevator:          { installed: true,  powerKW: "5.5",  hoursYear: "3500" },
        stairsLighting:    { installed: true,  powerKW: "0.6",  hoursYear: "8760" },
        centralHeating:    { installed: true,  fuel: "termoficare" },
        commonVentilation: { installed: false, powerKW: "",     hoursYear: "8760" },
        pumpGroup:         { installed: true,  powerKW: "1.5",  hoursYear: "8760" },
      },
      heatingCostAllocator: "nu",
      acmPipeDiameterMm: "16",
      acmRecirculation: "nu_exista",
      ventilationFanCount: "0",
      ventilationHrType: "",
      lightingNetworkState: "uzata",
      ancpi: {
        verified: true,
        fileName: "demo-cf-215680-constanta.pdf",
        fileSize: 152340,
        fileBase64: null,
        uploadDate: "2026-04-27T09:30:00.000Z",
        cadastralNr: "215680-C1-U18",
        carteFunciara: "CF nr. 215680-C1-U18 Constanța",
      },
      nrOcupanti: "4",
      ...ANEXA_GENERIC,
    },
    opaqueElements: [
      {
        // U calculat: 1/(0.04 + 0.020/0.87 + 0.080/1.74 + 0.020/0.060 + 0.150/1.74 + 0.010/0.45 + 0.13) ≈ 1.47 W/m²K
        name: "PAFP sandwich BA80+PS20deg+BA150 — Sud",
        type: "PE", area: "22", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială exterioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat panou exterior", material: "Beton armat", thickness: "80", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat degradat (50 ani)", material: "Polistiren expandat EPS umed/comprimat", thickness: "20", lambda: 0.060, rho: 22 },
          { matName: "Beton armat panou interior", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială interioară", material: "Tencuială var-gips", thickness: "10", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "PAFP sandwich BA80+PS20deg+BA150 — Nord",
        type: "PE", area: "16", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială exterioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat panou exterior", material: "Beton armat", thickness: "80", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat degradat (50 ani)", material: "Polistiren expandat EPS umed/comprimat", thickness: "20", lambda: 0.060, rho: 22 },
          { matName: "Beton armat panou interior", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială interioară", material: "Tencuială var-gips", thickness: "10", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Planșeu peste subsol neîncălzit (pivnițe)",
        type: "PB", area: "65", orientation: "H", tau: "0.5",
        layers: [
          { matName: "Tencuială tavan subsol", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "160", lambda: 1.74, rho: 2400 },
          { matName: "Șapă mortar", material: "Șapă ciment", thickness: "30", lambda: 1.40, rho: 2000 },
          { matName: "Parchet lemn", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 700 },
        ],
      },
    ],
    glazingElements: [
      { name: "Termopan PVC 4-16-4 fără Low-E — Sud (înlocuit 2005)", area: "5.4", u: "2.70", g: "0.75", orientation: "S", frameRatio: "25", type: "Dublu vitraj clasic" },
      { name: "Termopan PVC 4-16-4 fără Low-E — Nord",                area: "3.6", u: "2.70", g: "0.75", orientation: "N", frameRatio: "25", type: "Dublu vitraj clasic" },
      { name: "Ușă balcon Sud (vitraj integrat)",                      area: "2.2", u: "2.85", g: "0.72", orientation: "S", frameRatio: "30", type: "Ușă vitraj dublu" },
    ],
    thermalBridges: [
      // SR EN ISO 14683 — Ψ liniar 0.45-0.65 pentru PAFP nereabilitat (rosturi panou mare severe)
      { name: "Rost orizontal panou mare (centură)",   type: "CB", psi: "0.65", length: "32" },
      { name: "Rost vertical panou mare (stâlpișor)",  type: "SB", psi: "0.55", length: "20" },
      { name: "Glaf fereastră fără izolație",           type: "GF", psi: "0.45", length: "26" },
      { name: "Buiandrug deasupra ferestrei",          type: "CB", psi: "0.50", length: "8"  },
      { name: "Parapet sub fereastră",                  type: "CB", psi: "0.45", length: "10" },
      { name: "Colț bloc 90° neizolat",                 type: "SB", psi: "0.55", length: "10" },
      { name: "Soclu bloc fără izolație perimetrală",  type: "SO", psi: "0.55", length: "32" },
      { name: "Cornișă acoperiș terasă",                type: "CO", psi: "0.50", length: "32" },
    ],
    heating: {
      source: "TERMO",                    // Termoficare urbană SACET (HEAT_SOURCES)
      power: "7",
      eta_gen: "0.92",
      nominalPower: "7",
      emission: "RAD_FO",                 // Radiatoare fontă coloane clasice
      eta_em: "0.88",
      distribution: "SLAB_INT",           // Slab izolată interior (DISTRIBUTION_QUALITY)
      eta_dist: "0.78",
      control: "FARA",                    // Fără reglaj (robinete fixe, manual) — CONTROL_TYPES
      eta_ctrl: "0.85",
      regime: "continuu",
      theta_int: "20",
      nightReduction: "0",
      tStaircase: "10",
      tBasement: "8",
      tAttic: "",
    },
    acm: {
      source: "BOILER_E",                 // Boiler electric rezistiv cu acumulare (ACM_SOURCES)
      consumers: "3",
      dailyLiters: "50",
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "80",
      insulationClass: "B",
      pipeLength: "8",
      pipeInsulated: false,
      pipeInsulationThickness: "0mm",
      pipeDiameter: "20",
      circRecirculation: false,
      circHours: "",
      circPumpType: "fara",
      hasLegionella: false,
      legionellaFreq: "",
      legionellaT: "",
    },
    cooling: {
      system: "NONE",
      power: "0", eer: "", seer: "",
      cooledArea: "0",
      distribution: "",
      hasCooling: false,
      setpoint: "26",
      shadingExternal: "0.85",
      useHourly: false,
      emissionType: "", eta_em: "",
      distributionType: "", eta_dist: "",
      controlType: "", eta_ctrl: "",
      P_aux_pumps: "", P_aux_fans: "",
      t_cooling_hours: "",
      hasNightVent: false, n_night: "",
      comfortCategory: "III",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT",                        // Ventilare naturală (VENTILATION_TYPES)
      airflow: "120",
      fanPower: "0",
      operatingHours: "8760",
      hrEfficiency: "0",
    },
    lighting: {
      type: "CFL",                        // Fluorescent compact CFL (LIGHTING_TYPES) — mix becuri vechi 1975
      pDensity: "8.5",
      controlType: "MAN",                 // Manual simplu (LIGHTING_CONTROL)
      fCtrl: "1.0",
      operatingHours: "2200",
      naturalLightRatio: "20",
      pEmergency: "0",
      pStandby: "0.3",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: { enabled: false, type: "", area: "0", orientation: "S", tilt: "0", inverterType: "", inverterEta: "0", peakPower: "0", usage: "" },
    heatPump:     { enabled: false, type: "", cop: "0", scopHeating: "0", scopCooling: "0", covers: "", bivalentTemp: "", auxSource: "", auxEta: "0" },
    biomass:      { enabled: false },
    otherRenew:   {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Stoica Vlad-Răzvan",
      atestat: "CT-01875",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "EnergyConstanța Audit SRL",
      phone: "0744 123 456",
      email: "vlad.stoica@energyct.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-01875",
      cpeNumber: "CPE-2026-00041",
      cpeCode: "CE-2026-01875_20260427_Stoica_Vlad_CT_215680_018_CPE",
      registryIndex: "41",
      scopCpe: "renovare",
      validityYears: "10",
      registruEvidenta: "RE-2026-CT-01875",
      nrCadastral: "215680-C1-U18",
      codUnicMDLPA: "CE-2026-01875",
      dataExpirareDrept: "2030-06-30",
      dataTransmitereMDLPA: "2026-04-28",
      signatureDataURL: DEMO_SIG_SVG("Stoica V.R."),
      stampDataURL: DEMO_STAMP_SVG("Stoica V.R.", "CT-01875"),
      observations: "Apartament 3 camere etajul 2, bloc PAFP nereabilitat 1975 — termoficare RADET (CET Constanța, contor unic bloc), boiler electric apartament 80L. Anvelopă: PAFP sandwich BA80+PS20deg+BA150 fără izolație suplimentară (U_pereți ≈ 1.47 W/m²·K), termopan PVC 4-16-4 fără Low-E (U_glaz ≈ 2.70). Punți termice severe SR EN ISO 14683 categoria 3 (Ψ 0.45-0.65 — rosturi orizontale/verticale panou mare). n₅₀ = 7.5 h⁻¹ (etanșeitate proastă). Recomandare urgentă: reabilitare termică Pașaport Renovare în 3 etape (anvelopă ETICS 15 cm + ferestre triplu Low-E + branșament individual gaz).",
      photo: "",
    },
    expectedResults: {
      energyClass: "G",
      E_p_total_kWh_m2_y: 781,
      E_p_nren_kWh_m2_y: 740,
      E_p_ren_kWh_m2_y: 41,
      RER_pct: 0,
      U_med_W_m2K: 2.10,
      U_max_violations: ["PE", "PL", "GLAZ"],
      Q_inc_kWh_m2_y: 625,
      Q_rac_kWh_m2_y: 0,
      Q_acm_kWh_m2_y: 71,
      Q_il_kWh_m2_y: 14,
      Q_aux_kWh_m2_y: 4,
      bacsClass: "D",
      fBac: 1.10,
      sriPct: 22,
      meps2030_pass: false,
      meps2033_pass: false,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 3,
      passportTargetClass: "C",
      documentsExpected: ["CPE-RA", "CPE-AnexaIndividuala", "Raport-Audit", "Pasaport-Renovare"],
      tolerances: { E_p_nren: 0.18, E_p_total: 0.18, RER: 5, U_med: 0.15, Q_inc: 0.18 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M2 — Casă unifamilială cărămidă plină — Cluj-Napoca (ZONA III, ~3.000 GD)
  // CT gaz condensare 24 kW + radiatoare oțel + PV 3 kWp acoperiș înclinat
  // Scop CPE: vânzare • reabilitare parțială (ferestre 2010, fără izolație)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-2-cluj-casa-1965-caramida",
    title: "M2 · Casă RI cărămidă plină 1965 — Cluj (Zona III, CT gaz cond + PV 3 kWp) — clasă E",
    shortDesc: "Casă 120 m² cărămidă 500 mm fără izolație, ferestre PVC 2010, CT gaz cond. + PV 3 kWp",
    building: {
      address: "Str. Donath nr. 84",
      city: "Cluj-Napoca",
      county: "Cluj",
      postal: "400270",
      postalCode: "400270",
      locality: "Cluj-Napoca",
      latitude: "46.7796",
      longitude: "23.5648",
      cadastralNumber: "318745-C1",
      landBook: "CF nr. 318745 Cluj-Napoca UAT Cluj",
      owner: "Mureșan Andrei și Mureșan Ioana",
      ownerType: "PF",
      category: "RI",
      structure: "Zidărie portantă cărămidă plină 500 mm fără izolație — casă interbelică tardivă (1955–1975)",
      yearBuilt: "1965",
      yearRenov: "2010",                  // Doar ferestre înlocuite în 2010
      floors: "P+1",
      basement: false,
      attic: true,
      units: "1",
      stairs: "1",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "120",
      areaBuilt: "138",
      areaHeated: "120",
      volume: "324",                      // h_etaj 2.70 × 120
      areaEnvelope: "320",
      heightBuilding: "7.0",
      heightFloor: "2.70",
      perimeter: "38",
      n50: "5.5",
      shadingFactor: "0.88",
      gwpLifecycle: "440",
      solarReady: true,
      evChargingPoints: "0",
      evChargingPrepared: "1",
      co2MaxPpm: "1200",
      pm25Avg: "14",
      scaleVersion: "2023",
      scopCpe: "vanzare",
      parkingSpaces: "2",
      energyClassAfterRenov: "B",
      emissionClassAfterRenov: "B",
      energySavings: "42",
      co2Reduction: "38",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "", hoursYear: "" },
        stairsLighting:    { installed: false, powerKW: "", hoursYear: "" },
        centralHeating:    { installed: false, fuel: "" },
        commonVentilation: { installed: false, powerKW: "", hoursYear: "" },
        pumpGroup:         { installed: false, powerKW: "", hoursYear: "" },
      },
      ventilationHrType: "",
      ancpi: {
        verified: true,
        fileName: "demo-cf-318745-cluj.pdf",
        fileSize: 168200,
        fileBase64: null,
        uploadDate: "2026-04-27T11:15:00.000Z",
        cadastralNr: "318745-C1",
        carteFunciara: "CF nr. 318745 Cluj-Napoca UAT Cluj",
      },
      nrOcupanti: "4",
      ...ANEXA_GENERIC,
    },
    opaqueElements: [
      {
        // U calculat: 1/(0.04 + 0.020/0.87 + 0.500/0.80 + 0.015/0.45 + 0.13) ≈ 1.18 W/m²K
        name: "Cărămidă plină 500 mm fără izolație — Sud + Est",
        type: "PE", area: "165", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială ciment exterioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Cărămidă plină 500 mm portantă", material: "Cărămidă plină arsă", thickness: "500", lambda: 0.80, rho: 1800 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Cărămidă plină 500 mm fără izolație — Nord + Vest",
        type: "PE", area: "135", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială ciment exterioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Cărămidă plină 500 mm portantă", material: "Cărămidă plină arsă", thickness: "500", lambda: 0.80, rho: 1800 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Planșeu peste pod nelocuit (BA + zgură 1965, fără izolație suplimentară)",
        type: "PT", area: "75", orientation: "H", tau: "0.8",
        layers: [
          { matName: "Tencuială tavan", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
          { matName: "Strat zgură fără sortare (1965)", material: "Zgură vrac 1965", thickness: "150", lambda: 0.40, rho: 1100 },
          { matName: "Lambriu lemn pod", material: "Lemn brad", thickness: "20", lambda: 0.18, rho: 500 },
        ],
      },
      {
        name: "Placă pe sol — beton fără izolație (1965)",
        type: "PL", area: "75", orientation: "H", tau: "0.6",
        layers: [
          { matName: "Pietriș compactat fundație", material: "Pietriș", thickness: "150", lambda: 0.70, rho: 1800 },
          { matName: "Beton armat placă", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Șapă mortar", material: "Șapă ciment", thickness: "40", lambda: 1.40, rho: 2000 },
          { matName: "Parchet lemn / gresie", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 700 },
        ],
      },
    ],
    glazingElements: [
      { name: "PVC 5 camere dublu vitraj clasic — Sud (înlocuit 2010)", area: "8", u: "1.40", g: "0.75", orientation: "S", frameRatio: "22", type: "Dublu vitraj clasic 4-16-4" },
      { name: "PVC 5 camere dublu vitraj clasic — Est",                  area: "5", u: "1.40", g: "0.75", orientation: "E", frameRatio: "22", type: "Dublu vitraj clasic 4-16-4" },
      { name: "PVC 5 camere dublu vitraj clasic — Vest",                  area: "5", u: "1.40", g: "0.75", orientation: "V", frameRatio: "22", type: "Dublu vitraj clasic 4-16-4" },
      { name: "PVC 5 camere dublu vitraj clasic — Nord",                  area: "4", u: "1.40", g: "0.75", orientation: "N", frameRatio: "22", type: "Dublu vitraj clasic 4-16-4" },
      { name: "Ușă intrare lemn stratificat",                              area: "2.2", u: "1.80", g: "0.00", orientation: "S", frameRatio: "100", type: "Ușă lemn" },
    ],
    thermalBridges: [
      // SR EN ISO 14683 — clădire necalificată cărămidă fără ETICS, Ψ moderat
      { name: "Stâlpișori BA în zidărie cărămidă",      type: "SB", psi: "0.30", length: "28" },
      { name: "Centură BA peste etaj",                   type: "CB", psi: "0.40", length: "76" },
      { name: "Soclu fără izolație perimetrală",         type: "SO", psi: "0.50", length: "38" },
      { name: "Glaf fereastră PVC fără manșoane",        type: "GF", psi: "0.30", length: "56" },
      { name: "Buiandrug BA deasupra ferestrei",         type: "CB", psi: "0.30", length: "10" },
      { name: "Cornișă acoperiș pod",                    type: "CO", psi: "0.30", length: "38" },
    ],
    heating: {
      source: "GAZ_COND",                 // Cazan gaz natural condensare (HEAT_SOURCES)
      power: "24",
      eta_gen: "0.97",
      nominalPower: "24",
      emission: "RAD_OT",                 // Radiatoare oțel panou (EMISSION_SYSTEMS)
      eta_em: "0.95",
      distribution: "BINE_INT",           // Bine izolată interior single-family (DISTRIBUTION_QUALITY)
      eta_dist: "0.95",
      control: "PROG",                    // Termostat ambiental programabil (CONTROL_TYPES)
      eta_ctrl: "0.88",
      regime: "intermitent",
      theta_int: "21",
      nightReduction: "3",
      tStaircase: "",
      tBasement: "",
      tAttic: "10",
    },
    acm: {
      source: "CAZAN_H",                  // Același cazan cu încălzirea (ACM_SOURCES)
      consumers: "4",
      dailyLiters: "50",
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "100",
      insulationClass: "B",
      pipeLength: "12",
      pipeInsulated: true,
      pipeInsulationThickness: "20mm",
      pipeDiameter: "20",
      circRecirculation: false,
      circHours: "",
      circPumpType: "iee_023_027",
      hasLegionella: false,
      legionellaFreq: "",
      legionellaT: "",
    },
    cooling: {
      system: "NONE",
      power: "0", eer: "", seer: "",
      cooledArea: "0",
      distribution: "",
      hasCooling: false,
      setpoint: "",
      shadingExternal: "0.88",
      useHourly: false,
      emissionType: "", eta_em: "",
      distributionType: "", eta_dist: "",
      controlType: "", eta_ctrl: "",
      P_aux_pumps: "", P_aux_fans: "",
      t_cooling_hours: "",
      hasNightVent: false, n_night: "",
      comfortCategory: "II",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT",                        // Ventilare naturală pură (casă veche)
      airflow: "150",
      fanPower: "0",
      operatingHours: "8760",
      hrEfficiency: "0",
    },
    lighting: {
      type: "LED_E27",                    // LED retrofit E27/E14 (LIGHTING_TYPES)
      pDensity: "5.0",
      controlType: "MAN",
      fCtrl: "1.0",
      operatingHours: "1900",
      naturalLightRatio: "45",
      pEmergency: "0",
      pStandby: "0.2",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: {
      enabled: true,
      type: "MONO",                       // Monocristalin standard (PV_TYPES)
      area: "17",                         // 3 kWp × ~5.5 m²/kWp (panouri 350Wp)
      orientation: "S",
      tilt: "35",                         // Optim Cluj anual (lat 46.78° + 5°)
      inverterType: "PREM",               // Invertor string premium (PV_INVERTER_ETA)
      inverterEta: "0.97",
      peakPower: "3",
      usage: "all",
    },
    heatPump:   { enabled: false, type: "", cop: "0", scopHeating: "0", scopCooling: "0", covers: "", bivalentTemp: "", auxSource: "", auxEta: "0" },
    biomass:    { enabled: false },
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Pop Cosmin-Lucian",
      atestat: "CJ-03142",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "Audit Energetic Cluj SRL",
      phone: "0744 712 384",
      email: "cosmin.pop@auditcluj.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-03142",
      cpeNumber: "CPE-2026-00187",
      cpeCode: "CE-2026-03142_20260427_Pop_Cosmin_CJ_318745_001_CPE",
      registryIndex: "187",
      scopCpe: "vanzare",
      validityYears: "10",
      registruEvidenta: "RE-2026-CJ-03142",
      nrCadastral: "318745-C1",
      codUnicMDLPA: "CE-2026-03142",
      dataExpirareDrept: "2031-03-15",
      dataTransmitereMDLPA: "2026-04-28",
      signatureDataURL: DEMO_SIG_SVG("Pop Cosmin"),
      stampDataURL: DEMO_STAMP_SVG("Pop Cosmin", "CJ-03142"),
      observations: "Casă unifamilială P+1 Cluj-Napoca, construită 1965 zidărie cărămidă plină 500 mm fără izolație suplimentară (U ≈ 1.18 W/m²·K). Reabilitare parțială 2010: înlocuire ferestre lemn cu termopan PVC dublu vitraj clasic (U ≈ 1.40, fără Low-E). Sisteme: CT gaz condensare 24 kW Vaillant ecoTEC plus, distribuție bine izolată, radiatoare oțel panou. ACM: cazan combi instantaneu. Răcire: niciun sistem activ. PV 3 kWp acoperiș Sud, autoconsum fără baterie. n₅₀ = 5.5 h⁻¹. CPE emis pentru tranzacție vânzare. Recomandări Pașaport: ETICS 12-15 cm pereți + izolare placă sol perimetral + înlocuire ferestre cu triplu Low-E + extindere PV → 5 kWp.",
      photo: "",
    },
    expectedResults: {
      energyClass: "E",
      E_p_total_kWh_m2_y: 280,
      E_p_nren_kWh_m2_y: 245,
      E_p_ren_kWh_m2_y: 35,
      RER_pct: 12,
      U_med_W_m2K: 1.20,
      U_max_violations: ["PE", "PT", "PL"],
      Q_inc_kWh_m2_y: 195,
      Q_rac_kWh_m2_y: 0,
      Q_acm_kWh_m2_y: 32,
      Q_il_kWh_m2_y: 8,
      Q_aux_kWh_m2_y: 2,
      bacsClass: "C",
      fBac: 1.00,
      sriPct: 38,
      meps2030_pass: false,
      meps2033_pass: false,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 2,
      passportTargetClass: "B",
      documentsExpected: ["CPE-RI", "Raport-Audit", "Pasaport-Renovare"],
      tolerances: { E_p_nren: 0.18, E_p_total: 0.18, RER: 5, U_med: 0.15, Q_inc: 0.18 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M3 — Birouri BI 2005 — București (ZONA II, ~2.300 GD)
  // VRF degradat (SEER 2.80) + CT gaz backup + ventiloconvectoare 4 țevi
  // PV 15 kWp + Solar termic 20 m² ACM
  // PROBLEMĂ INTENȚIONATĂ: răcire exagerată → Q_rac > 30 kWh/m²·an
  // Scop CPE: vânzare/tranzacție • clasă C • MEPS 2033 fail
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-3-bucuresti-birouri-2005",
    title: "M3 · Birouri BI 2005 — București (Zona II, VRF degradat + PV 15 + ST 20) — clasă C",
    shortDesc: "Birouri 1500 m² BCA+EPS 4cm, VRF SEER 2.80 + CT gaz, PV 15 kWp + ST 20 m², Q_rac>30, MEPS 2033 fail",
    building: {
      address: "Bd. Decebal nr. 28, Centrul de Afaceri Decebal",
      city: "București",
      county: "București",
      postal: "030971",
      postalCode: "030971",
      locality: "București",
      latitude: "44.4268",
      longitude: "26.1278",
      cadastralNumber: "224580-C1",
      landBook: "CF nr. 224580 București Sect. 3",
      owner: "Decebal Office Investments SRL",
      ownerType: "PJ",
      ownerCUI: "RO24871235",
      category: "BI",
      structure: "Cadre BA + zidărie BCA 25 cm + ETICS EPS 4 cm degradat (post-2000, pre-EPBD 2010)",
      yearBuilt: "2005",
      yearRenov: "",
      floors: "P+3",
      basement: true,
      attic: false,
      units: "1",
      stairs: "2",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "1500",
      areaBuilt: "1720",
      areaHeated: "1500",
      volume: "4500",                     // h=3.0 × 1500
      areaEnvelope: "1850",
      heightBuilding: "13.5",
      heightFloor: "3.00",
      perimeter: "120",
      n50: "2.5",
      shadingFactor: "0.82",
      gwpLifecycle: "350",
      solarReady: true,
      evChargingPoints: "4",
      evChargingPrepared: "8",
      co2MaxPpm: "950",
      pm25Avg: "11",
      scaleVersion: "2023",
      scopCpe: "vanzare",
      parkingSpaces: "20",
      energyClassAfterRenov: "",
      emissionClassAfterRenov: "",
      energySavings: "",
      co2Reduction: "",
      apartments: [],
      commonSystems: {
        elevator:          { installed: true,  powerKW: "7.5",  hoursYear: "3500" },
        stairsLighting:    { installed: true,  powerKW: "0.4",  hoursYear: "2400" },
        centralHeating:    { installed: true,  fuel: "PC_AERAER (VRF) + CT gaz backup" },
        commonVentilation: { installed: true,  powerKW: "1.5",  hoursYear: "3000" },
        pumpGroup:         { installed: true,  powerKW: "1.2",  hoursYear: "8760" },
      },
      heatingRadiatorType: "Ventiloconvector",
      heatingRadiators: [],
      heatingHasMeter: "da",
      heatingPipeDiameterMm: "54",
      acmFixtures: {
        lavoare: "8", cada_baie: "0", spalatoare: "1", rezervor_wc: "8",
        bideuri: "0", pisoare: "4", dus: "1",
        masina_spalat_vase: "0", masina_spalat_rufe: "0",
      },
      acmConsumePointsCount: "18",
      acmPipeDiameterMm: "32",
      acmHasMeter: "da",
      acmFlowMeters: "peste_tot",
      acmRecirculation: "functionala",
      coolingDehumPowerKw: "4",
      coolingIndoorUnits: "32",
      coolingOutdoorUnits: "4",
      coolingPipeDiameterMm: "32",
      coolingSpaceScope: "complet",
      coolingHumidityControl: "fara",
      coolingIndividualMeter: "da",
      ventilationHrType: "rotativ",
      ventilationControlType: "program",
      ancpi: {
        verified: true,
        fileName: "demo-cf-224580-bucuresti.pdf",
        fileSize: 187456,
        fileBase64: null,
        uploadDate: "2026-04-27T10:00:00.000Z",
        cadastralNr: "224580-C1",
        carteFunciara: "CF nr. 224580 București Sect. 3",
      },
      nrOcupanti: "80",
      ...ANEXA_GENERIC,
    },
    opaqueElements: [
      {
        // U calculat: 1/(0.04 + 0.008/0.70 + 0.040/0.045 + 0.250/0.22 + 0.015/0.45 + 0.13) ≈ 0.45 W/m²K
        name: "BCA 25 cm + ETICS EPS 4 cm degradat — Sud + Est + Vest",
        type: "PE", area: "850", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială silicat exterioară", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "Polistiren expandat EPS 4 cm (degradat 2005)", material: "Polistiren expandat EPS", thickness: "40", lambda: 0.045, rho: 18 },
          { matName: "BCA 25 cm umplutură", material: "BCA (beton celular autoclavizat)", thickness: "250", lambda: 0.22, rho: 600 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "BCA 25 cm + ETICS EPS 4 cm degradat — Nord",
        type: "PE", area: "320", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială silicat exterioară", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "Polistiren expandat EPS 4 cm (degradat 2005)", material: "Polistiren expandat EPS", thickness: "40", lambda: 0.045, rho: 18 },
          { matName: "BCA 25 cm umplutură", material: "BCA (beton celular autoclavizat)", thickness: "250", lambda: 0.22, rho: 600 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Acoperiș terasă BA + EPS 8 cm + hidroizolație SBS",
        type: "PT", area: "440", orientation: "H", tau: "1",
        layers: [
          { matName: "Pietriș protecție", material: "Pietriș", thickness: "50", lambda: 0.70, rho: 1800 },
          { matName: "Polistiren expandat EPS 8 cm", material: "Polistiren expandat EPS", thickness: "80", lambda: 0.034, rho: 22 },
          { matName: "Hidroizolație bituminoasă SBS", material: "Membrană SBS", thickness: "8", lambda: 0.20, rho: 1050 },
          { matName: "Beton armat planșeu terasă", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială tavan ultim etaj", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Planșeu peste subsol parcaj + EPS 6 cm",
        type: "PL", area: "440", orientation: "H", tau: "0.7",
        layers: [
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat EPS 6 cm", material: "Polistiren expandat EPS", thickness: "60", lambda: 0.034, rho: 22 },
          { matName: "Șapă mortar autonivel", material: "Șapă ciment autonivel", thickness: "60", lambda: 1.40, rho: 2000 },
          { matName: "Pardoseală gresie tehnică", material: "Gresie ceramică", thickness: "12", lambda: 1.30, rho: 2300 },
        ],
      },
    ],
    glazingElements: [
      // 2005 dublu Low-E argon standard pre-curtain wall, ratio fereastră ~30%
      { name: "PVC 5 camere dublu Low-E argon — Sud (curtain partial)", area: "180", u: "1.80", g: "0.55", orientation: "S", frameRatio: "20", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Est",                    area: "110", u: "1.80", g: "0.55", orientation: "E", frameRatio: "20", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Vest",                    area: "110", u: "1.80", g: "0.55", orientation: "V", frameRatio: "20", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Nord",                    area: "80",  u: "1.80", g: "0.55", orientation: "N", frameRatio: "20", type: "Dublu Low-E argon" },
    ],
    thermalBridges: [
      // SR EN ISO 14683 — clădire post-2000, Ψ moderat (0.10-0.20)
      { name: "Centură planșeu BA peste etaje (sub EPS)", type: "CB", psi: "0.20", length: "220" },
      { name: "Stâlp colț 90° clădire",                    type: "SB", psi: "0.18", length: "54"  },
      { name: "Stâlp metalic perete cortină parțial",      type: "SB", psi: "0.15", length: "80"  },
      { name: "Glaf fereastră PVC",                        type: "GF", psi: "0.10", length: "320" },
      { name: "Soclu cu protecție XPS perimetrală",        type: "SO", psi: "0.20", length: "120" },
      { name: "Cornișă atic terasă EPS 8 cm",              type: "CO", psi: "0.15", length: "120" },
      { name: "Penetrare ventilație ductă fațadă",         type: "GF", psi: "0.15", length: "12"  },
    ],
    heating: {
      source: "PC_AERAER",                // Pompă de căldură aer-aer (multi-split / VRF) — HEAT_SOURCES
      power: "60",
      eta_gen: "2.80",                    // SCOP încălzire VRF degradat 2005
      nominalPower: "60",
      emission: "FCU_4P",                 // Ventiloconvectoare 4 țevi (EMISSION_SYSTEMS)
      eta_em: "0.97",
      distribution: "MED_INT",            // Mediu izolată interior (post-2000 not nZEB)
      eta_dist: "0.92",
      control: "COMP_CLIM",               // Compensare climatică BMS (BACS clasa B)
      eta_ctrl: "0.90",
      regime: "intermitent",
      theta_int: "21",
      nightReduction: "4",
      tStaircase: "",
      tBasement: "10",
      tAttic: "",
    },
    acm: {
      source: "SOLAR_GAZ",                // Solar termic + auxiliar gaz (ACM_SOURCES)
      consumers: "80",
      dailyLiters: "8",                   // Office — doar lavoare
      consumptionLevel: "low",
      tSupply: "55",
      storageVolume: "800",
      insulationClass: "A",
      pipeLength: "60",
      pipeInsulated: true,
      pipeInsulationThickness: "20mm",
      pipeDiameter: "25",
      circRecirculation: true,
      circHours: "11",
      circPumpType: "iee_023_027",
      hasLegionella: true,
      legionellaFreq: "weekly",
      legionellaT: "70",
    },
    cooling: {
      // PROBLEMĂ INTENȚIONATĂ — răcire exagerată per brief utilizator (Q_rac > 30 kWh/m²·an)
      system: "VRF",                      // Sistem VRF/VRV 2 pipe (COOLING_SYSTEMS)
      power: "80",
      eer: "2.20",
      seer: "2.80",                       // ← USER REQUIREMENT (VRF vechi 2005 degradat)
      cooledArea: "1500",                 // ← USER REQUIREMENT (toată suprafața utilă)
      distribution: "MED_INT",
      hasCooling: true,
      setpoint: "25",
      shadingExternal: "0.82",
      useHourly: false,
      emissionType: "fan_coil",           // Ventiloconvector 4 țevi (COOLING_EMISSION_EFFICIENCY)
      eta_em: "0.97",
      distributionType: "aer_tratat_slab", // Aer tratat, canale puțin izolate (COOLING_DISTRIBUTION_EFFICIENCY)
      eta_dist: "0.85",                   // ← USER REQUIREMENT
      controlType: "manual",              // Reglare manuală on/off utilizator (COOLING_CONTROL_EFFICIENCY)
      eta_ctrl: "0.88",
      P_aux_pumps: "1.2",
      P_aux_fans: "4.5",
      t_cooling_hours: "1400",            // ← USER REQUIREMENT (veri calde București + program lung)
      hasNightVent: false,
      n_night: "",
      comfortCategory: "III",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "MEC_HR80",                   // Recuperator căldură 80% (VENTILATION_TYPES)
      airflow: "4500",                    // 80 ocupanți × 25 m³/h × 2.25 ratio cat. III
      fanPower: "1500",                   // SFP ~1.0 kW/(m³/s)
      operatingHours: "3000",
      hrEfficiency: "80",
    },
    lighting: {
      type: "LED",                        // LED panou 60×60 (LIGHTING_TYPES)
      pDensity: "7.0",
      controlType: "TIMER",               // Programator orar office (LIGHTING_CONTROL)
      fCtrl: "0.90",
      operatingHours: "2400",
      naturalLightRatio: "35",
      pEmergency: "0.5",
      pStandby: "0.2",
    },
    solarThermal: {
      enabled: true,
      type: "PLAN",                       // Colector plan glazurat standard (SOLAR_THERMAL_TYPES)
      area: "20",
      orientation: "S",
      tilt: "45",
      usage: "acm",
      storageVolume: "800",
      eta0: "0.78",
      a1: "3.80",
    },
    photovoltaic: {
      enabled: true,
      type: "MONO",
      area: "85",                         // 15 kWp × ~5.7 m²/kWp
      orientation: "S",
      tilt: "15",                         // Acoperiș plat București — tilt jos optim autoconsum
      inverterType: "STD",
      inverterEta: "0.97",
      peakPower: "15",
      usage: "all",
    },
    heatPump:   { enabled: false, type: "", cop: "0", scopHeating: "0", scopCooling: "0", covers: "", bivalentTemp: "", auxSource: "", auxEta: "0" },
    biomass:    { enabled: false },
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Constantinescu Mihaela",
      atestat: "B-09245",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "PassivTech Romania SRL",
      phone: "0744 989 121",
      email: "mihaela.c@passivtech.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-09245",
      cpeNumber: "CPE-2026-00874",
      cpeCode: "CE-2026-09245_20260427_Constantinescu_Mihaela_B_224580_001_CPE",
      registryIndex: "874",
      scopCpe: "vanzare",
      validityYears: "10",
      registruEvidenta: "RE-2026-B-09245",
      nrCadastral: "224580-C1",
      codUnicMDLPA: "CE-2026-09245",
      dataExpirareDrept: "2031-06-30",
      dataTransmitereMDLPA: "2026-04-28",
      signatureDataURL: DEMO_SIG_SVG("Constantinescu M."),
      stampDataURL: DEMO_STAMP_SVG("Constantinescu M.", "B-09245"),
      observations: "Birouri Centrul Decebal, București Sect. 3 — clădire 2005 BCA 25 cm + ETICS EPS 4 cm degradat (U_pereți ≈ 0.45 W/m²·K), vitraje dublu Low-E argon (U ≈ 1.80, g ≈ 0.55). Sisteme: PC aer-aer VRF 60 kW (SCOP încălzire 2.80 — degradat după 20 ani exploatare) + CT gaz backup, ventiloconvectoare 4 țevi, recuperator entalpic rotativ 80%. RĂCIRE PROBLEMATICĂ: VRF reversibil SEER 2.80 (vs. cerere actuală ≥ 5.0), distribuție aer tratat slab izolat (η = 0.85), control manual la fiecare birou (η = 0.88), 1400 h funcționare/an (veri calde 2024-2026). PV 15 kWp acoperiș plat tilt 15° (autoconsum), Solar termic 20 m² ACM (acoperire ~ 60% sezon cald). RER ≈ 20% (PV + ST). MEPS 2030 PASS marginal, MEPS 2033 FAIL — necesită upgrade major: înlocuire VRF cu PC reversibilă (SEER ≥ 6.0), trecere la BMS clasa A cu reglaj zonal, ETICS suplimentar 8-10 cm.",
      photo: "",
    },
    expectedResults: {
      energyClass: "C",
      E_p_total_kWh_m2_y: 240,
      E_p_nren_kWh_m2_y: 195,
      E_p_ren_kWh_m2_y: 45,
      RER_pct: 19,
      U_med_W_m2K: 0.65,
      U_max_violations: ["GLAZ"],
      Q_inc_kWh_m2_y: 55,
      Q_rac_kWh_m2_y: 35,                 // ← TARGET > 30 (problemă răcire)
      Q_acm_kWh_m2_y: 6,
      Q_il_kWh_m2_y: 18,
      Q_aux_kWh_m2_y: 8,
      bacsClass: "C",
      fBac: 1.00,
      sriPct: 50,
      meps2030_pass: true,
      meps2033_pass: false,               // ← USER REQUIREMENT
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 2,
      passportTargetClass: "B",
      documentsExpected: ["CPE-BI", "Raport-Audit", "Pasaport-Renovare"],
      tolerances: { E_p_nren: 0.20, E_p_total: 0.20, RER: 5, U_med: 0.15, Q_inc: 0.20, Q_rac: 0.25 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M4 — Școală gimnazială ED — Brașov (ZONA IV, ~3.400 GD)
  // CT central gaz STANDARD 120 kW + radiatoare fontă + ventilare naturală
  // NEREABILITATĂ • niciun renewable • clasă F • eligibil PNRR C5.1
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-4-brasov-scoala-1980-nereabilitat",
    title: "M4 · Școală gimnazială 1980 NEREABILITATĂ — Brașov (Zona IV, CT gaz central) — clasă F",
    shortDesc: "Școală 1200 m² cărămidă goluri 30 cm fără izolație, CT gaz 120 kW + RAD fontă, baseline pre-PNRR (clasă F)",
    building: {
      address: "Str. Nicolae Bălcescu nr. 12, Școala Gimnazială Nr. 14",
      city: "Brașov",
      county: "Brașov",
      postal: "500178",
      postalCode: "500178",
      locality: "Brașov",
      latitude: "45.6427",
      longitude: "25.5887",
      cadastralNumber: "104587-C1",
      landBook: "CF nr. 104587 Brașov UAT Brașov",
      owner: "Primăria Municipiului Brașov",
      ownerType: "PUB",
      ownerCUI: "4384206",
      category: "ED",
      structure: "Zidărie portantă cărămidă cu goluri orizontale 30 cm fără izolație — clădire publică ante-1990 (1965-1989)",
      yearBuilt: "1980",
      yearRenov: "",                      // NEREABILITAT — eligibil PNRR C5.1
      floors: "P+1",
      basement: true,
      attic: false,
      units: "1",
      stairs: "2",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "1200",
      areaBuilt: "1380",
      areaHeated: "1200",
      volume: "4200",                     // h=3.50 × 1200
      areaEnvelope: "1450",
      heightBuilding: "8.5",
      heightFloor: "3.50",
      perimeter: "140",
      n50: "5.0",
      shadingFactor: "0.92",
      gwpLifecycle: "510",
      solarReady: false,
      evChargingPoints: "0",
      evChargingPrepared: "0",
      co2MaxPpm: "1350",
      pm25Avg: "13",
      scaleVersion: "2023",
      scopCpe: "renovare",                // Pre-renovare PNRR
      parkingSpaces: "8",
      energyClassAfterRenov: "B",
      emissionClassAfterRenov: "B",
      energySavings: "65",
      co2Reduction: "60",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "",    hoursYear: "" },
        stairsLighting:    { installed: true,  powerKW: "0.5", hoursYear: "1100" },
        centralHeating:    { installed: true,  fuel: "gaz_std" },
        commonVentilation: { installed: false, powerKW: "",    hoursYear: "" },
        pumpGroup:         { installed: true,  powerKW: "0.8", hoursYear: "2500" },
      },
      heatingRadiators: [{
        type: "Radiator fontă coloane clasice",
        count_private: "45",
        count_common: "8",
        power_kw: "120.0",
      }],
      heatingHasMeter: "nu",              // Pre-PNRR școală — fără contor termic
      heatingPipeDiameterMm: "50",
      acmFixtures: {
        lavoare: "10", cada_baie: "0", spalatoare: "1", rezervor_wc: "10",
        bideuri: "0", pisoare: "5", dus: "0",
        masina_spalat_vase: "0", masina_spalat_rufe: "0",
      },
      acmConsumePointsCount: "21",
      acmPipeDiameterMm: "32",
      acmHasMeter: "nu",
      acmFlowMeters: "nu_exista",
      acmRecirculation: "nu_exista",
      ventilationFanCount: "0",           // Ventilare naturală 100% — fără ventilatoare
      ventilationHrType: "",
      ventilationControlType: "manual_simpla",
      lightingNetworkState: "uzata",
      ancpi: {
        verified: true,
        fileName: "demo-cf-104587-brasov-scoala.pdf",
        fileSize: 198750,
        fileBase64: null,
        uploadDate: "2026-04-27T08:45:00.000Z",
        cadastralNr: "104587-C1",
        carteFunciara: "CF nr. 104587 Brașov UAT Brașov",
      },
      nrOcupanti: "280",
      ...ANEXA_GENERIC,
    },
    opaqueElements: [
      {
        // U calculat: 1/(0.04 + 0.020/0.87 + 0.300/0.55 + 0.020/0.87 + 0.13) ≈ 1.31 W/m²K (target ~1.25)
        name: "Cărămidă cu goluri orizontale 30 cm fără izolație — Sud + Est",
        type: "PE", area: "420", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială ciment exterioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Cărămidă cu goluri orizontale 30 cm", material: "Cărămidă cu goluri", thickness: "300", lambda: 0.55, rho: 1400 },
          { matName: "Tencuială interioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Cărămidă cu goluri orizontale 30 cm fără izolație — Nord + Vest",
        type: "PE", area: "360", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială ciment exterioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Cărămidă cu goluri orizontale 30 cm", material: "Cărămidă cu goluri", thickness: "300", lambda: 0.55, rho: 1400 },
          { matName: "Tencuială interioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Acoperiș terasă necirculabilă fără izolație (1980 typical)",
        type: "PT", area: "440", orientation: "H", tau: "1",
        layers: [
          { matName: "Pietriș protecție", material: "Pietriș", thickness: "50", lambda: 0.70, rho: 1800 },
          { matName: "Hidroizolație bituminoasă SBS dublu", material: "Membrană SBS", thickness: "8", lambda: 0.20, rho: 1050 },
          { matName: "Beton armat planșeu terasă", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială tavan ultim etaj", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Planșeu peste subsol nelocuit fără izolație",
        type: "PB", area: "440", orientation: "H", tau: "0.6",
        layers: [
          { matName: "Tencuială tavan subsol", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
          { matName: "Șapă mortar", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
          { matName: "Pardoseală linoleum", material: "Linoleum", thickness: "5", lambda: 0.17, rho: 1200 },
        ],
      },
    ],
    glazingElements: [
      // Termopan PVC dublu vitraj clasic (înlocuit ad-hoc 2000s, fără Low-E) + ușă veche
      { name: "Termopan PVC dublu clasic — Sud (săli clasă)",     area: "90", u: "2.85", g: "0.78", orientation: "S", frameRatio: "22", type: "Dublu vitraj clasic" },
      { name: "Termopan PVC dublu clasic — Est (săli clasă)",     area: "65", u: "2.85", g: "0.78", orientation: "E", frameRatio: "22", type: "Dublu vitraj clasic" },
      { name: "Termopan PVC dublu clasic — Vest (săli clasă)",    area: "65", u: "2.85", g: "0.78", orientation: "V", frameRatio: "22", type: "Dublu vitraj clasic" },
      { name: "Termopan PVC dublu clasic — Nord (coridoare)",     area: "45", u: "2.85", g: "0.78", orientation: "N", frameRatio: "22", type: "Dublu vitraj clasic" },
      { name: "Ușă intrare aluminiu vechi (1980)",                area: "6",  u: "3.20", g: "0.45", orientation: "S", frameRatio: "30", type: "Ușă aluminiu fără termorupt" },
    ],
    thermalBridges: [
      // SR EN ISO 14683 — clădire 1980 NEREABILITATĂ, Ψ severe (0.40-0.55)
      { name: "Centură BA peste etaje (sub tencuială)",  type: "CB", psi: "0.55", length: "280" },  // ← USER REQUIREMENT
      { name: "Stâlpișori BA în zidărie cărămidă",       type: "SB", psi: "0.45", length: "60"  },
      { name: "Soclu fără izolație perimetrală",          type: "SO", psi: "0.55", length: "140" },
      { name: "Glaf fereastră fără izolație",             type: "GF", psi: "0.40", length: "220" },  // ← USER REQUIREMENT
      { name: "Buiandrug BA deasupra ferestrei",          type: "CB", psi: "0.45", length: "50"  },
      { name: "Cornișă atic terasă fără izolație",        type: "CO", psi: "0.50", length: "140" },
      { name: "Colț 90° clădire (4 colțuri)",              type: "SB", psi: "0.50", length: "34"  },
    ],
    heating: {
      source: "GAZ_STD",                  // Cazan gaz natural standard atmosferic (HEAT_SOURCES)
      power: "120",                       // ← USER REQUIREMENT (CT central gaz 120 kW)
      eta_gen: "0.85",
      nominalPower: "120",
      emission: "RAD_FO",                 // Radiatoare fontă coloane clasice ← USER REQUIREMENT
      eta_em: "0.93",
      distribution: "SLAB_INT",           // Slab izolată interior (școală 1980 nerenovat)
      eta_dist: "0.78",
      control: "CENTR",                   // Termostat ambiental simplu central on/off
      eta_ctrl: "0.85",
      regime: "intermitent",              // Program școlar 8-15 + vacanțe
      theta_int: "20",
      nightReduction: "5",
      tStaircase: "12",
      tBasement: "10",
      tAttic: "",
    },
    acm: {
      source: "CAZAN_H",                  // Același cazan cu încălzirea
      consumers: "280",                   // 250 elevi + 30 cadre
      dailyLiters: "5",                   // ACM scăzut (doar lavoare + curățenie)
      consumptionLevel: "low",
      tSupply: "55",
      storageVolume: "300",               // 300L < 400L → fără cerință Legionella HG 1425/2006
      insulationClass: "C",
      pipeLength: "100",
      pipeInsulated: false,               // Conducte ACM neizolate (școală nereabilitată)
      pipeInsulationThickness: "0mm",
      pipeDiameter: "32",
      circRecirculation: false,           // Fără recirculare (1980 typical)
      circHours: "",
      circPumpType: "fara",
      hasLegionella: false,
      legionellaFreq: "",
      legionellaT: "",
    },
    cooling: {
      system: "NONE",                     // ← USER REQUIREMENT (niciun sistem cooling)
      power: "0", eer: "", seer: "",
      cooledArea: "0",
      distribution: "",
      hasCooling: false,
      setpoint: "",
      shadingExternal: "0.92",
      useHourly: false,
      emissionType: "", eta_em: "",
      distributionType: "", eta_dist: "",
      controlType: "", eta_ctrl: "",
      P_aux_pumps: "", P_aux_fans: "",
      t_cooling_hours: "",
      hasNightVent: false, n_night: "",
      comfortCategory: "III",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT",                        // ← USER REQUIREMENT (ventilare naturală)
      airflow: "1500",
      fanPower: "0",
      operatingHours: "1700",
      hrEfficiency: "0",
    },
    lighting: {
      type: "TUB_T8",                     // Tub fluorescent T8 cu balast magnetic — typical 1980 ← USER alternativă
      pDensity: "12.0",
      controlType: "MAN",
      fCtrl: "1.0",
      operatingHours: "1700",
      naturalLightRatio: "50",
      pEmergency: "0.6",
      pStandby: "0.2",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: { enabled: false, type: "", area: "0", orientation: "S", tilt: "0", inverterType: "", inverterEta: "0", peakPower: "0", usage: "" },
    heatPump:     { enabled: false, type: "", cop: "0", scopHeating: "0", scopCooling: "0", covers: "", bivalentTemp: "", auxSource: "", auxEta: "0" },
    biomass:      { enabled: false },
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Iliescu Daniel-Bogdan",
      atestat: "BV-04217",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "Smart Energy Brașov SRL",
      phone: "0744 651 932",
      email: "daniel.iliescu@smartbv.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-04217",
      cpeNumber: "CPE-2026-00533",
      cpeCode: "CE-2026-04217_20260427_Iliescu_Daniel_BV_104587_001_CPE",
      registryIndex: "533",
      scopCpe: "renovare",
      validityYears: "10",
      registruEvidenta: "RE-2026-BV-04217",
      nrCadastral: "104587-C1",
      codUnicMDLPA: "CE-2026-04217",
      dataExpirareDrept: "2030-12-31",
      dataTransmitereMDLPA: "2026-04-28",
      signatureDataURL: DEMO_SIG_SVG("Iliescu D.B."),
      stampDataURL: DEMO_STAMP_SVG("Iliescu D.B.", "BV-04217"),
      observations: "Școala Gimnazială Nr. 14 Brașov — clădire 1980 NEREABILITATĂ termic, eligibilă pentru reabilitare PNRR Componenta C5.1 (clădiri publice eficiență energetică). Anvelopă: pereți cărămidă cu goluri orizontale 30 cm fără izolație (U ≈ 1.31 W/m²·K), terasă necirculabilă fără izolație (U ≈ 2.40), planșeu subsol fără izolație (U ≈ 3.20). Vitraje termopan PVC dublu clasic fără Low-E (U ≈ 2.85, g ≈ 0.78), uși aluminiu vechi fără termorupt (U ≈ 3.20). Punți termice severe SR EN ISO 14683 cat. 3: centură BA Ψ=0.55, glafuri Ψ=0.40, soclu Ψ=0.55. Sisteme: CT central gaz standard atmosferic 120 kW (η ≈ 0.85, vechi >25 ani), radiatoare fontă coloane, distribuție slab izolată interioară. ACM: același cazan, 300L acumulator. Ventilație: 100% naturală (fereastră deschisă). Iluminat: tub fluorescent T8 cu balast magnetic (12 W/m² — vechi, ineficient). Niciun renewable. n₅₀ = 5.0 h⁻¹. Recomandări reabilitare PNRR: ETICS 15 cm pereți + izolație terasă 18 cm + izolație subsol 8 cm + ferestre triplu Low-E + CT condensare + LED DALI + PV 30 kWp + recuperator entalpic săli mari → țintă clasă B (EP < 130 kWh/m²·an).",
      photo: "",
    },
    expectedResults: {
      energyClass: "F",
      E_p_total_kWh_m2_y: 460,
      E_p_nren_kWh_m2_y: 445,
      E_p_ren_kWh_m2_y: 15,
      RER_pct: 3,
      U_med_W_m2K: 1.10,
      U_max_violations: ["PE", "PT", "PB", "GLAZ"],
      Q_inc_kWh_m2_y: 295,
      Q_rac_kWh_m2_y: 0,
      Q_acm_kWh_m2_y: 14,
      Q_il_kWh_m2_y: 28,
      Q_aux_kWh_m2_y: 4,
      bacsClass: "D",
      fBac: 1.10,
      sriPct: 18,
      meps2030_pass: false,
      meps2033_pass: false,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 3,
      passportTargetClass: "B",
      documentsExpected: ["CPE-ED", "Raport-Audit", "Pasaport-Renovare-PNRR"],
      tolerances: { E_p_nren: 0.18, E_p_total: 0.18, RER: 5, U_med: 0.15, Q_inc: 0.18 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M5 — Casă unifamilială nouă RI ZEB — Sibiu (ZONA III, ~3.170 GD)
  // PC sol-apă 12 kW (COP 4.5) + pardoseală radiantă + VMC HR 90%
  // PV 6 kWp + Solar termic 8 m² ACM → ZEB legitim (energy-positive)
  // Scop CPE: construire (recepție) • clasă A+ (ZEB) • MEPS 2030/2033/2050 PASS
  // Update Sprint Rebalansare (15 mai 2026): post-NA:2023 + PV calibrat PVGIS,
  // M5 devine ZEB real (credit export PV ≥ consum brut). Vezi expectedResults
  // pentru valori actualizate. Per EPBD 2024/1275 Art. 9 + L. 238/2024 Art. 5.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-5-sibiu-casa-2022-zeb",
    title: "M5 · Casă RI ZEB nouă 2022 — Sibiu (Zona III, PC sol-apă + VMC HR90 + PV 6 + ST 8) — clasă A+",
    shortDesc: "Casă 140 m² ZEB BCA + vată 18cm, PC sol-apă 12 kW COP 4.5 + VMC HR 90% + PV 6 kWp + ST 8 m² · energy-positive",
    building: {
      address: "Str. Mihai Viteazu nr. 47, Cartier Selimbăr",
      city: "Sibiu",
      county: "Sibiu",
      postal: "550100",
      postalCode: "550100",
      locality: "Sibiu",
      latitude: "45.7983",
      longitude: "24.1256",
      cadastralNumber: "401580-C1",
      landBook: "CF nr. 401580 Sibiu UAT Sibiu",
      owner: "Marin Andrei și Marin Elena",
      ownerType: "PF",
      category: "RI",
      structure: "Cadre BA + zidărie BCA 25 cm + ETICS vată minerală 18 cm + ferestre triplu Low-E argon — construcție nZEB nouă L.238/2024",
      yearBuilt: "2022",
      yearRenov: "",
      floors: "P+1",
      basement: false,
      attic: false,
      units: "1",
      stairs: "1",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "140",
      areaBuilt: "160",
      areaHeated: "140",
      volume: "378",                      // h=2.70 × 140
      areaEnvelope: "340",
      heightBuilding: "6.5",
      heightFloor: "2.70",
      perimeter: "42",
      n50: "0.6",                         // ← USER REQUIREMENT (PassivHaus level)
      shadingFactor: "0.85",
      gwpLifecycle: "180",
      solarReady: true,
      evChargingPoints: "1",
      evChargingPrepared: "1",
      co2MaxPpm: "780",
      pm25Avg: "5",
      scaleVersion: "2023",
      scopCpe: "construire",              // ← USER REQUIREMENT (recepție)
      parkingSpaces: "2",
      energyClassAfterRenov: "",
      emissionClassAfterRenov: "",
      energySavings: "",
      co2Reduction: "",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "",    hoursYear: "" },
        stairsLighting:    { installed: false, powerKW: "",    hoursYear: "" },
        centralHeating:    { installed: true,  fuel: "PC_SA + ST" },
        commonVentilation: { installed: true,  powerKW: "0.075", hoursYear: "8760" },
        pumpGroup:         { installed: true,  powerKW: "0.4", hoursYear: "5500" },
      },
      heatingHasMeter: "da",              // BACS B+ → contor termic obligatoriu nZEB
      heatingPipeDiameterMm: "22",
      ancpi: {
        verified: true,
        fileName: "demo-cf-401580-sibiu.pdf",
        fileSize: 175600,
        fileBase64: null,
        uploadDate: "2022-11-15T14:00:00.000Z",
        cadastralNr: "401580-C1",
        carteFunciara: "CF nr. 401580 Sibiu UAT Sibiu",
      },
      nrOcupanti: "4",
      ...ANEXA_GENERIC,
    },
    opaqueElements: [
      {
        // U calculat: 1/(0.04 + 0.008/0.70 + 0.180/0.036 + 0.250/0.22 + 0.015/0.45 + 0.13) ≈ 0.158 W/m²K (target ≤ 0.20)
        name: "BCA 25 cm + vată minerală 18 cm — Sud + Est",
        type: "PE", area: "115", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială silicat decorativă", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "Vată minerală densă fațadă 18 cm", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.036, rho: 80 },
          { matName: "BCA 25 cm portant", material: "BCA (beton celular autoclavizat)", thickness: "250", lambda: 0.22, rho: 600 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "BCA 25 cm + vată minerală 18 cm — Nord + Vest",
        type: "PE", area: "95", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială silicat decorativă", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "Vată minerală densă fațadă 18 cm", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.036, rho: 80 },
          { matName: "BCA 25 cm portant", material: "BCA (beton celular autoclavizat)", thickness: "250", lambda: 0.22, rho: 600 },
          { matName: "Tencuială interioară var-gips", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Acoperiș terasă + XPS 25 cm + hidroizolație TPO",
        type: "PT", area: "75", orientation: "H", tau: "1",
        layers: [
          { matName: "Pietriș protecție", material: "Pietriș", thickness: "50", lambda: 0.70, rho: 1800 },
          { matName: "Polistiren extrudat XPS 25 cm", material: "Polistiren extrudat XPS", thickness: "250", lambda: 0.034, rho: 35 },
          { matName: "Hidroizolație TPO", material: "Membrană TPO", thickness: "2", lambda: 0.20, rho: 950 },
          { matName: "Beton armat planșeu terasă", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială tavan ultim etaj", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Placă pe sol — beton + EPS 15 cm + șapă + parchet",
        type: "PL", area: "75", orientation: "H", tau: "0.6",
        layers: [
          { matName: "Pietriș compactat fundație", material: "Pietriș", thickness: "150", lambda: 0.70, rho: 1800 },
          { matName: "Beton armat placă", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat EPS 15 cm", material: "Polistiren expandat EPS", thickness: "150", lambda: 0.036, rho: 25 },
          { matName: "Șapă mortar autonivel", material: "Șapă ciment autonivel", thickness: "60", lambda: 1.40, rho: 2000 },
          { matName: "Parchet lemn stratificat", material: "Parchet lemn", thickness: "12", lambda: 0.18, rho: 700 },
        ],
      },
    ],
    glazingElements: [
      // Triplu Low-E argon PassivHaus (frame PVC 6 camere termorupte 22%)
      { name: "Triplu Low-E argon PVC 6 camere — Sud (vedere)",  area: "11", u: "0.85", g: "0.50", orientation: "S", frameRatio: "22", type: "Triplu Low-E argon" },
      { name: "Triplu Low-E argon PVC 6 camere — Est",            area: "5",  u: "0.85", g: "0.50", orientation: "E", frameRatio: "22", type: "Triplu Low-E argon" },
      { name: "Triplu Low-E argon PVC 6 camere — Vest",            area: "5",  u: "0.85", g: "0.50", orientation: "V", frameRatio: "22", type: "Triplu Low-E argon" },
      { name: "Triplu Low-E argon PVC 6 camere — Nord (mai mici)", area: "4",  u: "0.85", g: "0.50", orientation: "N", frameRatio: "22", type: "Triplu Low-E argon" },
      { name: "Ușă intrare lemn termizolat",                       area: "2.5", u: "1.20", g: "0.00", orientation: "S", frameRatio: "100", type: "Ușă lemn termizolat" },
    ],
    thermalBridges: [
      // SR EN ISO 14683 — clădire nZEB nouă 2022, Ψ < 0.10 (PassivHaus level)
      { name: "Stâlpișori BA înglobat în vată minerală", type: "SB", psi: "0.04", length: "30" },
      { name: "Centură BA peste etaj (sub vată)",         type: "CB", psi: "0.05", length: "84" },
      { name: "Soclu cu protecție XPS perimetrală",        type: "SO", psi: "0.05", length: "42" },
      { name: "Glaf fereastră — atașat vată",              type: "GF", psi: "0.04", length: "70" },
      { name: "Buiandrug BA înglobat în vată",             type: "CB", psi: "0.04", length: "18" },
      { name: "Cornișă atic terasă XPS 25 cm",             type: "CO", psi: "0.05", length: "42" },
    ],
    heating: {
      source: "PC_SA",                    // Pompă căldură sol-apă sonde verticale geotermale (HEAT_SOURCES)
      power: "12",                        // ← USER REQUIREMENT
      eta_gen: "4.50",                    // ← USER REQUIREMENT (COP nominal)
      nominalPower: "12",
      emission: "PARD",                   // Încălzire pardoseală cu apă (EMISSION_SYSTEMS)
      eta_em: "0.98",
      distribution: "BINE_INT_NZB",       // Bine izolată interior nZEB (DISTRIBUTION_QUALITY)
      eta_dist: "0.97",
      control: "INTELIG",                 // Smart home / IoT wireless (CONTROL_TYPES)
      eta_ctrl: "0.94",
      regime: "continuu",                 // Pardoseală radiantă continuu cu setback
      theta_int: "21",
      nightReduction: "1",
      tStaircase: "",
      tBasement: "",
      tAttic: "",
    },
    acm: {
      source: "SOLAR_PC",                 // Solar termic + pompă căldură (ACM_SOURCES)
      consumers: "4",
      dailyLiters: "50",
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "300",
      insulationClass: "A",
      pipeLength: "18",
      pipeInsulated: true,
      pipeInsulationThickness: "30mm",
      pipeDiameter: "22",
      circRecirculation: false,
      circHours: "",
      circPumpType: "iee_sub_023",
      hasLegionella: false,
      legionellaFreq: "",
      legionellaT: "",
    },
    cooling: {
      system: "PC_REV_SA",                // Pompă căldură reversibilă sol-apă (COOLING_SYSTEMS)
      power: "5",
      eer: "5.50",
      seer: "7.50",
      cooledArea: "80",
      distribution: "BINE_INT_NZB",
      hasCooling: true,
      setpoint: "26",
      shadingExternal: "0.85",
      useHourly: false,
      emissionType: "pardoseala_rad",     // Pardoseală radiantă răcire (COOLING_EMISSION_EFFICIENCY)
      eta_em: "0.97",
      distributionType: "apa_rece_izolat_int", // Apă rece izolat ≥20mm (COOLING_DISTRIBUTION_EFFICIENCY)
      eta_dist: "0.95",
      controlType: "termostat_pid",       // Termostat PID + senzor CO₂/prezență (COOLING_CONTROL_EFFICIENCY)
      eta_ctrl: "0.98",
      P_aux_pumps: "0.2",
      P_aux_fans: "0",
      t_cooling_hours: "600",             // Climă montană Sibiu — sezon scurt
      hasNightVent: true,
      n_night: "2.0",
      comfortCategory: "II",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "MEC_HR90",                   // ← USER REQUIREMENT (recuperator căldură 90%)
      airflow: "280",                     // 4 persoane × 30 m³/h × 2.3 ratio cat. II
      fanPower: "75",                     // SFP 1.0 kW/(m³/s) × 0.075 m³/s = 75 W
      operatingHours: "8760",
      hrEfficiency: "90",
    },
    lighting: {
      type: "LED",                        // LED panou nZEB (LIGHTING_TYPES)
      pDensity: "4.0",
      controlType: "PREZ_DAY",            // ← USER REQUIREMENT (Combinat: prezență + daylight)
      fCtrl: "0.55",
      operatingHours: "1900",
      naturalLightRatio: "50",
      pEmergency: "0.3",
      pStandby: "0.1",
    },
    solarThermal: {
      enabled: true,
      type: "PLAN",                       // Colector plan glazurat standard (SOLAR_THERMAL_TYPES)
      area: "8",                          // ← USER REQUIREMENT
      orientation: "S",
      tilt: "45",                         // ← USER REQUIREMENT
      usage: "acm",                       // ← USER REQUIREMENT
      storageVolume: "300",
      eta0: "0.78",                       // ← USER REQUIREMENT
      a1: "3.80",                         // ← USER REQUIREMENT
    },
    photovoltaic: {
      enabled: true,
      type: "MONO",                       // ← USER REQUIREMENT
      area: "32",                         // 6 kWp × ~5.4 m²/kWp
      orientation: "S",                   // ← USER REQUIREMENT
      tilt: "38",                         // ← USER REQUIREMENT
      inverterType: "HIBRID",             // Cu pregătire baterie LFP viitoare
      inverterEta: "0.96",
      peakPower: "6",                     // ← USER REQUIREMENT
      usage: "all",
    },
    heatPump: {
      enabled: true,
      type: "PC_SA",                      // ← USER REQUIREMENT (sol-apă sonde verticale)
      cop: "4.50",                        // ← USER REQUIREMENT
      scopHeating: "4.20",                // ← USER REQUIREMENT
      scopCooling: "5.80",                // ← USER REQUIREMENT
      covers: "heating_acm",              // ← USER REQUIREMENT
      bivalentTemp: "-20",                // ← USER REQUIREMENT
      auxSource: "REZ_EL",
      auxEta: "1.00",
    },
    biomass:    { enabled: false },
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Vasilescu Ana-Maria",
      atestat: "SB-04895",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "Eco Audit Carpați SRL",
      phone: "0744 268 519",
      email: "ana.vasilescu@ecocarpati.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-04895",
      cpeNumber: "CPE-2026-00098",
      cpeCode: "CE-2026-04895_20260427_Vasilescu_Ana_SB_401580_001_CPE",
      registryIndex: "98",
      scopCpe: "construire",
      validityYears: "10",
      registruEvidenta: "RE-2026-SB-04895",
      nrCadastral: "401580-C1",
      codUnicMDLPA: "CE-2026-04895",
      dataExpirareDrept: "2031-08-15",
      dataTransmitereMDLPA: "2026-04-28",
      signatureDataURL: DEMO_SIG_SVG("Vasilescu A.M."),
      stampDataURL: DEMO_STAMP_SVG("Vasilescu A.M.", "SB-04895"),
      observations: "Casă unifamilială P+1 Cartier Selimbăr Sibiu — recepționată septembrie 2022 conform L.238/2024 nZEB + EPBD 2024/1275. Anvelopă: BCA 25 cm + ETICS vată minerală 18 cm (U_pereți ≈ 0.158 W/m²·K), terasă XPS 25 cm (U ≈ 0.128), placă sol EPS 15 cm (U ≈ 0.21), ferestre triplu Low-E argon PVC 6 camere (U ≈ 0.85, g ≈ 0.50). Punți termice nZEB SR EN ISO 14683: toate Ψ ≤ 0.05 (atașat vată minerală + termorupt). Sisteme: PC sol-apă 12 kW (3 sonde verticale 100 m, COP nominal 4.50, SCOP încălzire 4.20, SCOP răcire 5.80), pardoseală radiantă cu apă, BACS B+ (smart home wireless). ACM: solar termic 8 m² PLAN tilt 45° + booster PC dedicată (acoperire ~ 70% an). Răcire: PC reversibilă sol-apă pasivă (geo-cooling — energie minimă). VMC HR 90% (recuperator căldură sensibilă PassivHaus, SFP < 1.0). PV 6 kWp MONO Sud tilt 38° (autoconsum + injecție rețea Electrica Transilvania). RER total ≈ 50% (PC RES + PV + ST). MEPS 2030/2033/2050 PASS cu marjă. n₅₀ = 0.6 h⁻¹ (test blower-door PassivHaus). Pașaport renovare neaplicabil — clădire deja nZEB top.",
      photo: "",
    },
    expectedResults: {
      // Sprint Rebalansare M5 ZEB (15 mai 2026) — aliniere completă cu calculul actual.
      // Valori extrase live din useInstallationSummary + useRenewableSummary cu:
      //   - useNA2023 = ON (default): fP_elec_tot=2.50, fP_ambient=1.0 (Tab A.16 + corecție MDLPA 50843/09.03.2026)
      //   - PV calibrat PVGIS (29 apr 2026): qPV_kWh×3.65× față de formulă veche
      // Per ISO 52000-1 §11.7 + Mc 001 §5.7.3 + L. 238/2024 Art. 5 + EPBD 2024/1275 Art. 9:
      // M5 (PC sol-apă + PV 6 kWp + ST 8 m² + VMC HR90%) este ZEB legitim, nu doar nZEB clasic.
      // E_p_total_kWh_m2_y = EP brut consum (cu energie ambientală HP per NA:2023).
      // E_p_net_kWh_m2_y = EP după credit export PV (canonic pentru clasificare Anexa 4).
      energyClass: "A+",                  // ZEB după credit export PV (era "A" pre-rebalansare)
      E_p_total_kWh_m2_y: 156,            // EP brut consum: 67.4(ep_h) + 54.4(ep_w) + 4.2(ep_c) + 12.5(ep_v) + 17.4(ep_l) — era 60
      E_p_net_kWh_m2_y: 0,                // EP net după credit PV (Math.max clamp) — canonic clasificare
      E_p_nren_kWh_m2_y: 84,              // Electric × fP_nren(2.00) — era 32 (formulă pre-NA:2023)
      E_p_ren_kWh_m2_y: 72,               // Electric × fP_ren(0.50) + ambient HP × 1.0 — era 28
      RER_pct: 68,                        // era 47 — calibrat post-PV PVGIS + ambient HP
      U_med_W_m2K: 0.18,
      U_max_violations: [],
      Q_inc_kWh_m2_y: 52,                 // qH_nd specific: Sibiu Zona III ngz~3170, U_med 0.18 — era 22
      Q_rac_kWh_m2_y: 2,                  // qC_nd specific: sezon scurt montan — era 4
      Q_acm_kWh_m2_y: 14,                 // qACM_nd: 4 consumers × 50 L/zi — era 12
      Q_il_kWh_m2_y: 7,                   // qL: LED 4 W/m² × controale PREZ_DAY (f_ctrl=0.55) — era 8
      Q_aux_kWh_m2_y: 5,                  // qf_v ventilare VMC HR fans (75W × 8760h ≈ 657 kWh / 140 m²) — era 3
      qf_total_kWh_m2_y: 42,              // NOU: energie finală totală (după COP/eta_total) per Mc 001-2022 §3.2.4
      bacsClass: "B",
      fBac: 0.85,
      sriPct: 75,
      meps2030_pass: true,
      meps2033_pass: true,
      meps2050_pass: true,
      passportRequired: false,
      passportPhases: 0,
      passportTargetClass: "A+",          // aliniat cu energyClass ZEB
      isZeb: true,                        // flag explicit per EPBD 2024/1275 Art. 9 + L. 238/2024
      documentsExpected: ["CPE-RI", "Raport-Audit", "Pasaport-Renovare-Empty"],
      tolerances: { E_p_nren: 0.20, E_p_total: 0.15, E_p_net: 1.0, RER: 8, U_med: 0.10, Q_inc: 0.15, qf_total: 0.15 },
    },
  },

];
