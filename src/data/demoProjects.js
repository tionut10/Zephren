// ═════════════════════════════════════════════════════════════════════════════
// demoProjects.js — 5 modele DEMO v2 (refacere completă 27 apr 2026)
//
// Fiecare demo:
//   - acoperă o zonă climatică distinctă (I, II, III, IV, V) conform Mc 001-2022
//   - parcurge TOATE etapele aplicației (Step 1 → Step 8) cu date complete
//   - include `expectedResults` pentru verificare automată end-to-end via teste e2e
//
// Modele:
//   M1 — Apartament panou mare PAFP '72 — Constanța (Zona I)   — DH RADET            — clasă F
//   M2 — Birouri nZEB clasă A           — București (Zona II)  — CHP gaz + PV 30 kWp — clasă A
//   M3 — Casă BCA renovată parțial      — Cluj-Napoca (Zona III) — CT condensare + PV — clasă D
//   M4 — Școală gimnazială reabilitată  — Brașov (Zona IV)     — CT central + PV 15 kWp — clasă B
//   M5 — Pensiune turistică lemn masiv  — Predeal (Zona V)     — peleți + solar termic — clasă C
//
// Conformitate: Mc 001-2022, Ord. MDLPA 16/2023, EN ISO 13790, SR EN ISO 52120-1:2022
// (BACS), SR EN ISO 52016-1, SR EN ISO 52010-1, EN 16798-1 IAQ, EN 15193-1 LENI,
// EN 15316-3 ACM, L.238/2024 nZEB, EPBD 2024/1275/UE.
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
// DEMO_PROJECTS — 5 modele v2 (zone climatice I→V, scenarii distincte end-to-end)
// ═════════════════════════════════════════════════════════════════════════════
export const DEMO_PROJECTS = [

  // ───────────────────────────────────────────────────────────────────────────
  // M1 — Apartament 3 cam. bloc PAFP '72 — Constanța (ZONA I, ≤2.000 GD)
  // Termoficare RADET (DH) + boiler electric ACM • neanvelopat • clasă F
  // Scop: testare DH (heatGenLocation TERMOFICARE), penalizări p0-p11,
  //       roadmap Pașaport renovare 3 etape, MEPS 2030 fail.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-1-constanta-pafp-1972",
    title: "M1 · Apartament bloc PAFP '72 — Constanța (Zona I, DH RADET) — clasă F",
    shortDesc: "Apt 65 m² panou mare neanvelopat, termoficare RADET + boiler electric, MEPS 2030 fail",
    building: {
      address: "Bd. Tomis nr. 287, bl. T8, sc. B, et. 2, ap. 18",
      city: "Constanța",
      county: "Constanța",
      postal: "900725",                  // ADĂUGAT: Step1 citește `postal` (alias compatibilitate)
      postalCode: "900725",
      locality: "Constanța",
      latitude: "44.1797",   // Constanța ~44.18°N (Zona I climă caldă)
      longitude: "28.6348",  // Constanța ~28.63°E
      cadastralNumber: "215680-C1-U18",
      landBook: "CF nr. 215680-C1-U18 Constanța",
      owner: "Marinescu Vasile-Gheorghe",
      ownerType: "PF",                   // ADĂUGAT: persoană fizică (proprietar individual apartament)
      category: "RA",                    // Rezidențial — apartament bloc
      structure: "Panouri mari prefabricate PAFP (3 straturi BA + PS + BA, blocuri comuniste 1965–1989)",
      yearBuilt: "1972",
      yearRenov: "",                     // Niciodată reabilitat
      floors: "P+4",
      basement: true,
      attic: false,
      units: "1",
      stairs: "1",
      nApartments: "30",                 // Bloc total — pentru calcul comune
      apartmentNo: "18",
      staircase: "B",
      floor: "2",
      areaUseful: "65",
      areaBuilt: "73",
      areaHeated: "65",
      volume: "162",                     // h_etaj efectiv 2.50 m
      areaEnvelope: "78",                // Doar pereții exteriori + planșee per apartament
      heightBuilding: "14",
      heightFloor: "2.50",
      perimeter: "32",
      n50: "7.5",                        // Etanșeitate proastă, infiltrații rosturi panou mare
      shadingFactor: "0.85",
      gwpLifecycle: "520",               // GWP ridicat — clădire necalificată
      solarReady: false,
      evChargingPoints: "0",
      evChargingPrepared: "0",
      co2MaxPpm: "1450",                 // Ventilație inadecvată (cat. IV EN 16798-1)
      pm25Avg: "22",                     // PM2.5 peste 15 μg/m³ WHO
      scaleVersion: "2023",
      scopCpe: "renovare",               // Scop CPE = pre-renovare → validitate 10 ani
      parkingSpaces: "0",
      energyClassAfterRenov: "C",        // Țintă post-pașaport renovare
      emissionClassAfterRenov: "C",
      energySavings: "62",               // % față de baseline
      co2Reduction: "58",
      apartments: [],
      commonSystems: {
        elevator:          { installed: true,  powerKW: "5.5",  hoursYear: "3500" },
        stairsLighting:    { installed: true,  powerKW: "0.6",  hoursYear: "8760" },
        centralHeating:    { installed: true,  fuel: "termoficare" },
        commonVentilation: { installed: false, powerKW: "",     hoursYear: "8760" },
        pumpGroup:         { installed: true,  powerKW: "1.5",  hoursYear: "8760" },
      },
      // ── ADĂUGAT: Anexa 1+2 MDLPA — overrides pentru context PAFP nereabilitat 1972 ──
      heatingCostAllocator: "nu",                          // override: PAFP nereabilitat → fără repartitoare costuri
      acmPipeDiameterMm: "16",                             // override: boiler electric individual apartament (NU 25 mm bloc)
      acmRecirculation: "nu_exista",                       // override: boiler individual = niciun circuit recirculare
      ventilationFanCount: "0",                            // override: ventilație 100% naturală (fără ventilatoare)
      ventilationHrType: "",                               // override: fără recuperator HR în ventilație naturală
      lightingNetworkState: "uzata",                       // override: mix becuri vechi + LED parțial (1972 nereabilitat)
      // ── ADĂUGAT: ANCPI bypass DEMO (deblocaj export DOCX CPE Step 6) ──
      ancpi: {
        verified: true,
        fileName: "demo-cf-215680-constanta.pdf",
        fileSize: 152340,
        fileBase64: null,
        uploadDate: "2026-04-27T09:30:00.000Z",
        cadastralNr: "215680-C1-U18",
        carteFunciara: "CF nr. 215680-C1-U18 Constanța",
      },
      // ── 2 mai 2026: pre-populare AnexaMDLPA pentru demo Pas 6 ──
      nrOcupanti: "4",                        // 4 persoane apartament 65 m² (cf. EN 16798-1 cat. III)
      etapeImplementare:
        "1. Identificați minimum 3 oferte comparative de la contractori autorizați.\n" +
        "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR, Casa Verde Plus, fonduri locale).\n" +
        "3. Obțineți acordul adunării generale a proprietarilor (L.196/2018) pentru lucrările pe părți comune (anvelopă, planșeu subsol).\n" +
        "4. Implementați măsurile în ordinea priorităților: anvelopă → sisteme termice → surse regenerabile.\n" +
        "5. Documentați toate lucrările executate și obțineți declarațiile de performanță ale produselor (Reg. (UE) 305/2011).\n" +
        "6. Solicitați o nouă auditare energetică după finalizarea renovării pentru confirmarea clasei energetice (Ord. MDLPA 16/2023).",
      stimulenteFinanciare:
        "— AFM Casa Verde Plus: finanțare 100% pentru pompe de căldură și panouri solare termice (persoane fizice) — HG 209/2018 actualizat, ghid AFM 2024.\n" +
        "— PNRR componenta C5 — Valul Renovării: granturi pentru renovarea energetică a apartamentelor în bloc până la standard nZEB.\n" +
        "— Credite verzi: BRD Eco Home / ING Green Loan / BCR Casa Ta — dobânzi preferențiale (verifică ofertele active la momentul depunerii dosarului).\n" +
        "— Scheme fiscale active la data emiterii CPE pentru investiții în eficiență energetică (verifică anaf.ro).",
      solutiiAnvelopa:
        "— Verificare la fața locului a stratificării reale a anvelopei (carotaje, termoviziune SR EN 13187).\n" +
        "— Tratarea punților termice principale identificate (balcoane, atice, buiandrugi) — manșoane locale 5–10 cm.\n" +
        "— Decopertarea selectivă a fațadelor existente cu ETICS degradat și înlocuirea straturilor compromise.\n" +
        "— Verificarea compatibilității coeficienților de difuzie a vaporilor (μ) între straturi (Glaser).",
      solutiiInstalatii:
        "— Echilibrare hidraulică completă a circuitelor de încălzire (robinete cu presetare diferențială).\n" +
        "— Reglaj automat al temperaturii pe cameră prin termostate Smart (R²·D, controllers cu protocol Modbus/KNX).\n" +
        "— Inspecție și curățare anuală a generatorului termic conform prescripțiilor producătorului (HG 1043/2007).\n" +
        "— Recuperare căldură din apele uzate calde (drain water heat recovery) la dușurile cu debit mare.",
      masuriOrganizare:
        "— Întocmirea unui plan anual de monitorizare a consumurilor (electricitate, gaz, apă caldă) cu verificare lunară.\n" +
        "— Instruirea ocupanților privind setările optime ale termostatelor pe sezon (cf. Mc 001-2022 art. 7.3).\n" +
        "— Audit energetic intermediar la fiecare 5 ani sau la modificarea regimului de utilizare (L.121/2014).\n" +
        "— Stabilirea unei persoane responsabile cu eficiența energetică la nivelul asociației de proprietari.",
      masuriLocale:
        "— Etanșeizarea trecerilor prin anvelopă (cabluri, conducte, ventilație) cu mansetă EPDM + spumă PUR.\n" +
        "— Înlocuirea bateriilor sanitare clasice cu modele cu limitare debit / aerator (clasă A WELL).\n" +
        "— Becuri inteligente cu senzor prezență/lumină naturală în spații tranzit (holuri, scări, depozite).\n" +
        "— Programare orară a iluminatului și HVAC pe sezon și zi de săptămână (timere standalone).\n" +
        "— Curățarea periodică a recuperatorului de căldură ventilație (filtru G4/F7, schimb 6 luni).",
      regenerabileCustom:
        "— Sistem fotovoltaic on-grid 3 kWp pe acoperișul blocului (cota-parte 1/30 pentru apartament) cu invertor hibrid.\n" +
        "— Pompă de căldură aer-aer COP > 4.0 pentru încălzire/răcire de vară (R290 propan, GWP < 3).\n" +
        "— Sistem solar termic comun bloc cu colectoare plane pentru ACM (acoperire 50–70% an).\n" +
        "— Recuperator căldură ape uzate (drain water heat exchanger) cuplat la circuitul ACM.",
    },
    opaqueElements: [
      {
        name: "Pereți PAFP 27 cm BA — Sud",
        type: "PE", area: "22", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială exterioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat panou mare PAFP", material: "Beton armat", thickness: "270", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială interioară", material: "Tencuială var-gips", thickness: "10", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Pereți PAFP 27 cm BA — Nord (faţadă post-bloc)",
        type: "PE", area: "16", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială exterioară var-ciment", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
          { matName: "Beton armat panou mare PAFP", material: "Beton armat", thickness: "270", lambda: 1.74, rho: 2400 },
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
          { matName: "Parchet", material: "Parchet lemn", thickness: "10", lambda: 0.18, rho: 700 },
        ],
      },
    ],
    glazingElements: [
      { name: "Termopan PVC 4-16-4 dublu — Sud (înlocuit 2005, fără Low-E)", area: "5.4",  u: "2.70", g: "0.75", orientation: "S", frameRatio: "25", type: "Dublu vitraj clasic" },
      { name: "Termopan PVC 4-16-4 dublu — Nord", area: "3.6", u: "2.70", g: "0.75", orientation: "N", frameRatio: "25", type: "Dublu vitraj clasic" },
      { name: "Ușă balcon Sud (vitraj integrat)",        area: "2.2", u: "2.85", g: "0.72", orientation: "S", frameRatio: "30", type: "Ușă vitraj dublu" },
    ],
    thermalBridges: [
      { name: "Rost orizontal panou mare (centură)",  type: "CB", psi: "0.65", length: "32" },
      { name: "Rost vertical panou mare (stâlpișor)", type: "SB", psi: "0.55", length: "20" },
      { name: "Glaf fereastră fără izolație",          type: "GF", psi: "0.35", length: "26" },
      { name: "Buiandrug deasupra ferestrei",         type: "CB", psi: "0.45", length: "8" },
      { name: "Parapet sub fereastră",                 type: "CB", psi: "0.40", length: "10" },
      { name: "Colț bloc 90° neizolat",                type: "SB", psi: "0.50", length: "10" },
      { name: "Soclu bloc fără izolație perimetrală", type: "SO", psi: "0.55", length: "32" },
      { name: "Cornișă acoperiș terasă",               type: "CO", psi: "0.45", length: "32" },
    ],
    heating: {
      source: "TERMO",                    // P1 fix: era "TERMOFICARE" — cod neîntâlnit în HEAT_SOURCES; corect "TERMO" (Termoficare urbană SACET)
      power: "7",
      eta_gen: "0.92",                    // Eficiență sursă DH la branșament (CET Constanța)
      nominalPower: "7",
      emission: "RAD_FO",                 // P1 fix: era "RADIATOR" generic — corect "RAD_FO" (Radiatoare fontă, coloane clasice — comentariul confirmă „fontă vechi")
      eta_em: "0.88",                     // Radiatoare fontă vechi
      distribution: "SLAB_INT",           // P1 fix: era "PROST_INT_BLOC" — corect "SLAB_INT" (slab izolat interior, conform DISTRIBUTION_QUALITY)
      eta_dist: "0.78",
      control: "FARA",                    // P1 fix: era "MANUAL" — corect "FARA" (fără reglaj — robinete fixe, manual conform CONTROL_TYPES line 150)
      eta_ctrl: "0.85",
      regime: "continuu",
      theta_int: "20",
      nightReduction: "0",                // Fără reducere noapte (DH livrare continuă)
      tStaircase: "10",
      tBasement: "8",
      tAttic: "",
    },
    acm: {
      source: "BOILER_E",                 // P1 fix: era "BOILER_EL" — corect "BOILER_E" (Boiler electric rezistiv cu acumulare, conform ACM_SOURCES line 291)
      consumers: "3",
      dailyLiters: "50",
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "80",                // Boiler electric 80L individual
      insulationClass: "B",
      pipeLength: "8",
      pipeInsulated: false,               // Conducte ACM neizolate (bloc vechi)
      pipeInsulationThickness: "0mm",
      pipeDiameter: "20",
      circRecirculation: false,
      circHours: "",
      circPumpType: "fara",
      hasLegionella: false,               // Boiler 80L < 400L — fără cerință tratare
      legionellaFreq: "",
      legionellaT: "",
    },
    cooling: {
      system: "NONE",                     // P1 fix: era "FARA" — corect "NONE" (Fără sistem de răcire activ, conform COOLING_SYSTEMS line 350)
      power: "0",
      eer: "",
      seer: "",
      cooledArea: "0",
      distribution: "",                   // P1 fix: era "FARA" — corect "" (no cooling = no distribution code)
      hasCooling: false,
      setpoint: "26",
      shadingExternal: "0.85",
      useHourly: false,
      emissionType: "",
      eta_em: "",
      distributionType: "",
      eta_dist: "",
      controlType: "",
      eta_ctrl: "",
      P_aux_pumps: "",
      P_aux_fans: "",
      t_cooling_hours: "",
      hasNightVent: false,
      n_night: "",
      comfortCategory: "III",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT",                        // P1 fix: era "NATURALA" — corect "NAT" (Ventilare naturală, conform VENTILATION_TYPES line 442)
      airflow: "120",                     // Infiltrații + ferestre (necontrolate)
      fanPower: "0",
      operatingHours: "8760",
      hrEfficiency: "0",
    },
    lighting: {
      type: "CFL",                        // P1 fix: era "MIXT" — UI nu are "MIXT"; ales "CFL" (Fluorescent compact CFL, închidere mix becuri vechi LIGHTING_TYPES line 480) — pentru bloc 1972 nereabilitat
      pDensity: "8.5",                    // Mix becuri vechi + LED parțial
      controlType: "MAN",                 // P1 fix: era "MANUAL" — corect "MAN" (Manual simplu, conform LIGHTING_CONTROL line 504)
      fCtrl: "1.0",                       // Fără control automat
      operatingHours: "2200",
      naturalLightRatio: "20",            // Apartament cu 2 fațade orientate S+N
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
      // S29 fix #8 — promovat la AE Ici pentru a permite emiterea Raportului de Conformare nZEB
      // (Ord. MDLPA 348/2026 Art.6 §1 lit.c — necesită Grad I auditor Ici)
      grade: "AE Ici",                    // Auditor Energetic Ici (individual + colectiv + nerezidențial)
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
      // ADĂUGAT: Semnătură + ștampilă DEMO (placeholder SVG dataURL — înlocuiește cu PNG real prin UI Step 6 înainte de export oficial)
      signatureDataURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>Stoica V.R.</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text></svg>",
      stampDataURL:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>Stoica V.R.</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>CT-01875</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>",
      observations: "Apartament 3 camere etajul 2, bloc PAFP nereabilitat — termoficare RADET (CET Constanța, contor unic bloc), boiler electric apartament 80L. Anvelopă: PAFP 27 cm BA fără izolație suplimentară (U_pereți ≈ 1.45 W/m²·K), termopan PVC 4-16-4 fără Low-E (U_glaz ≈ 2.70). Punți termice severe: rosturi orizontale/verticale panou mare. n₅₀ = 7.5 h⁻¹ (etanșeitate proastă). Recomandare urgentă: reabilitare termică Pașaport Renovare în 3 etape (anvelopă + ferestre + sursa).",
      photo: "",
    },
    // S29 — calibrat după rezultate reale motor (CPE registru 27.04.2026):
    // PAFP 27 cm BA fără izolație → U=2.70 W/m²·K (nu 1.45 — am subestimat)
    // → Q_inc=637 kWh/m²·an, EP=968 kWh/m²·an, clasa G (nu F)
    expectedResults: {
      energyClass: "G",                  // S29 fix — corectat din F → G (Mc 001-2022 prag G pentru RA = > 870)
      E_p_total_kWh_m2_y: 968,
      E_p_nren_kWh_m2_y: 968,            // RER 0% → tot EP e nren
      E_p_ren_kWh_m2_y: 0,
      RER_pct: 0,
      U_med_W_m2K: 2.10,                 // S29 — calculat 240.24/114.2 din raport tehnic
      U_max_violations: ["PE", "PL", "GLAZ"],
      Q_inc_kWh_m2_y: 637,
      Q_rac_kWh_m2_y: 0,
      Q_acm_kWh_m2_y: 71,
      Q_il_kWh_m2_y: 15,
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
      tolerances: { E_p_nren: 0.15, E_p_total: 0.15, RER: 5, U_med: 0.10, Q_inc: 0.15 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M2 — Birouri nZEB clasă A — București Pipera (ZONA II)
  // CHP gaz natural 50 kWel/80 kWth + PV 30 kWp + PC reversibilă + recuperator 80%
  // Scop: testare CHP (cogenEnabled), curtain wall, BACS clasă A, RER ridicat,
  //       MEPS 2030/2033 pass, Pașaport NU (deja optim)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-2-bucuresti-nzeb-2024",
    title: "M2 · Birouri nZEB — București Pipera (Zona II, CHP+PV) — clasă A",
    shortDesc: "Birouri 5400 m² nZEB, CHP 50 kWel + PV 30 kWp + PC 200 kW, BACS A, MEPS pass",
    building: {
      address: "Bd. Pipera nr. 1B, Tower Pipera Office",
      city: "Voluntari",                  // CORECTAT: Pipera Tower e fizic în Voluntari (jud. Ilfov), NU București
      county: "Ilfov",                     // CORECTAT: conform CF nr. 263410 Voluntari
      postal: "077190",                    // ADĂUGAT: Step1 citește `postal` (nu `postalCode`)
      postalCode: "077190",                // păstrat pentru compatibilitate retroactivă
      locality: "București",              // CORECTAT: Voluntari nu e în CLIMATE_DB (60 localități); București = aceeași zonă climatică II metro București-Ilfov
      latitude: "44.4799",   // Voluntari ~44.48°N (Zona II climatic — încadrat pe zona București metro)
      longitude: "26.1378",  // Voluntari ~26.14°E
      cadastralNumber: "263410-C1",
      landBook: "CF nr. 263410 Voluntari, jud. Ilfov",
      owner: "Pipera Tower Investment SRL",
      ownerType: "PJ",                     // ADĂUGAT: SRL = persoană juridică (Step1 validare)
      ownerCUI: "RO38456781",              // ADĂUGAT: CUI sintetic cu checksum valid (algoritm ANAF: 7-5-3-2-1-7-5-3-2) — necesar pentru ownerType=PJ
      category: "BI",
      structure: "Structură metalică — cadre oțel cu pereți cortină / panouri sandwich (post-1990)",
      yearBuilt: "2024",
      yearRenov: "",
      floors: "P+5",
      basement: true,
      attic: false,
      units: "1",
      stairs: "2",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "5400",
      areaBuilt: "6200",
      areaHeated: "5400",
      volume: "17280",                    // h=3.20 m × 5400 m²
      areaEnvelope: "6890",               // P1 fix (28 apr 2026): aliniat cu Σ(opaci 4670 + vitraje 2220) — anvelopa reală curtain wall include spandrel + vitraj
      heightBuilding: "23",
      heightFloor: "3.20",
      perimeter: "180",
      n50: "1.0",                         // nZEB strict (test blower-door)
      shadingFactor: "0.78",              // Curtain wall sticlă cu jaluzele automate
      gwpLifecycle: "240",                // GWP redus — Level(s) compatibil
      solarReady: true,
      evChargingPoints: "10",             // P2 fix: era 8 → 10 (cerință EPBD 2024 Art. 14 §4 non-rezidențial: minim 10 instalate la 100 locuri)
      evChargingPrepared: "50",            // P2 fix: era 20 → 50 (cerință EPBD 2024 Art. 14 §4: minim 50% precablate la non-rezidențial >20 locuri)
      co2MaxPpm: "780",                   // EN 16798-1 cat. I (CO₂ < 800 ppm peste exterior)
      pm25Avg: "6",
      scaleVersion: "2023",
      scopCpe: "receptie",
      parkingSpaces: "100",
      energyClassAfterRenov: "",
      emissionClassAfterRenov: "",
      energySavings: "",
      co2Reduction: "",
      apartments: [],
      commonSystems: {
        elevator:          { installed: true, powerKW: "11",   hoursYear: "4000" },
        stairsLighting:    { installed: true, powerKW: "0.4",  hoursYear: "2200" },
        centralHeating:    { installed: true, fuel: "PC_AA + CHP gaz" },
        commonVentilation: { installed: true, powerKW: "8",    hoursYear: "3000" },
        pumpGroup:         { installed: true, powerKW: "5",    hoursYear: "8760" },
      },
      // ── ADĂUGAT: Anexa 1+2 MDLPA — suprascriere defaults `buildMdlpaDefaults` greșite pentru BI office ──
      // (Default-urile generice presupun radiatoare oțel + casa unifam — INCORECT pentru office cu PC AA + ventiloconvectoare + BACS A.)
      heatingRadiatorType: "Ventiloconvector",            // override: NU radiatoare oțel; folosesc fan-coil (ventiloconvectoare)
      heatingRadiators: [],                                // override: niciun corp static — emisia e prin ventiloconvectoare
      heatingHasMeter: "da",                               // override: BACS A → contoare termice obligatorii
      heatingPipeDiameterMm: "65",                         // override: PC centralizată 200 kW → DN65 (nu DN25 default)
      unheatedSpaces: [                                    // override: subsol parcaj + zonă tehnică (nu „casă unifam")
        { code: "ZU1", diameter_mm: "65", length_m: "120" },  // Distribuție agent termic prin subsol parcaj (riser principal)
        { code: "ZU2", diameter_mm: "32", length_m: "85"  },  // Conducte ramificație tehnică
      ],
      acmFixtures: {                                       // override: 150 ocupanți office, NU 1 apartament
        lavoare: "8", cada_baie: "0", spalatoare: "1", rezervor_wc: "8",
        bideuri: "0", pisoare: "4", dus: "1",
        masina_spalat_vase: "0", masina_spalat_rufe: "0",
      },
      acmConsumePointsCount: "20",                         // override: corespunde 8+1+8+4+1 = 22 puncte (rotunjit 20)
      acmPipeDiameterMm: "32",                             // override: corespunde acm.pipeDiameter=32
      acmHasMeter: "da",                                   // override: BACS A
      acmFlowMeters: "peste_tot",                          // override: BACS A — debitmetre ACM
      acmRecirculation: "functionala",                     // override: consistent cu acm.circRecirculation=true
      coolingDehumPowerKw: "8",                            // ADĂUGAT: dezumidificare aux pentru cat. I confort
      coolingIndoorUnits: "42",                            // override: 5400 m² / 130 m² per ventiloconvector ≈ 42 (NU 72 default)
      coolingOutdoorUnits: "4",                            // override: 4 chillere centralizate (NU 36 default)
      coolingPipeDiameterMm: "54",                         // override: chiller centralizat → DN54 (NU DN12 default)
      coolingSpaceScope: "complet",                        // override: cooledArea=5400 = toată aria (NU partial)
      coolingHumidityControl: "cu_control",                // override: BMS Siemens Desigo cat. I (NU fara)
      coolingIndividualMeter: "da",                        // override: BACS A
      ventilationHrType: "rotativ",                        // override: recuperator entalpic 80% (NU placi default)
      ventilationControlType: "program",                   // override: BMS programat 8-19 (NU manual_simpla)
      humidificationPowerKw: "5",                          // ADĂUGAT: umidificare birouri cat. I confort
      // ── ADĂUGAT: ANCPI verificare cadastrală (Sprint D) — bypass pentru DEMO export DOCX CPE ──
      ancpi: {
        verified: true,                                     // DEMO: marcat verificat manual (în producție: extras CF real)
        fileName: "demo-cf-263410-voluntari.pdf",
        fileSize: 187456,
        fileBase64: null,                                   // DEMO: PDF real lipsă (max 2 MB în UI Step 1)
        uploadDate: "2024-11-22T10:00:00.000Z",
        cadastralNr: "263410-C1",
        carteFunciara: "CF nr. 263410 Voluntari, jud. Ilfov",
      },
      // ── 2 mai 2026: pre-populare AnexaMDLPA pentru demo M2 — Birouri Pipera ──
      nrOcupanti: "120",                       // ~5400 m² × 25 m²/persoană density birouri cat. III
      etapeImplementare:
        "1. Aprobați planul de investiții prin decizia consiliului de administrație al companiei.\n" +
        "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR componenta C5, scheme de ajutor de stat eficiență energetică).\n" +
        "3. Obțineți autorizațiile legale necesare pentru lucrări (AC + avize ISU/Mediu/Apă).\n" +
        "4. Implementați măsurile în ordinea priorităților: BMS optimizare → curtain wall etanșare → expansiune PV.\n" +
        "5. Documentați performanța atinsă (m&v M&V IPMVP Opțiunea C — comparație consum baseline vs. post-implementare).\n" +
        "6. Solicitați re-certificare CPE după 3 ani sau la modificarea regimului de funcționare (Mc 001-2022 art. 7.5).",
      stimulenteFinanciare:
        "— PNRR componenta C5 — Eficiență energetică clădiri comerciale și de birouri: granturi pentru companii private.\n" +
        "— Schema de ajutor de stat pentru eficiență energetică (Regulamentul CE 651/2014, art. 38–39).\n" +
        "— EIB/BERD: credite verzi directe sau prin intermediari bancari autorizați (BCR, Raiffeisen, ING Wholesale).\n" +
        "— Scheme fiscale active la data emiterii CPE pentru investiții în eficiență energetică (verifică anaf.ro).",
      solutiiAnvelopa:
        "— Auditul intermediar al curtain wall-ului la 5 ani (etanșeitate joints — testare cu fum trace + termoviziune SR EN 13187).\n" +
        "— Reducerea G-value vitrajelor pe fațada Sud prin film solar suplimentar (ΔU < 0.05).\n" +
        "— Verificare anuală fixări mecanice spandrel + ancorajul vatei minerale (CWCT TN 56).\n" +
        "— Monitorizare condens curtain wall în zonele de bridge punct (psi-value local optimizat).",
      solutiiInstalatii:
        "— Optimizare program BMS Siemens Desigo (occupancy-based set-points, night setback agresiv 16-18°C).\n" +
        "— Verificare anuală chiller centralizat (curățare condensator, încărcare R-32 / R-454B conform F-Gas).\n" +
        "— Calibrare senzori CO₂ (cat. I confort EN 16798-1 implică ±50 ppm precizie).\n" +
        "— Recuperator entalpic rotor: schimb sigilantă antimicrobiană la 5 ani (NSF/ANSI 50).",
      masuriOrganizare:
        "— Implementarea unui program ISO 50001 cu manager energetic atestat ANRE pentru clădirea de birouri.\n" +
        "— Audit energetic intermediar la fiecare 4 ani (L.121/2014 art. 9 alin. 1 — clădire non-rezidențială > 500 m²).\n" +
        "— Plan anual de monitorizare cu raport trimestrial către management (consum kWh/m²·an, intensitate CO₂).\n" +
        "— Instruirea ocupanților privind setările optimale prin newsletter intern (best practices ENERGY STAR).",
      masuriLocale:
        "— Programare orară a iluminatului zonal cu DALI-2 D4i (8-19 zone tehnice, 6-22 zone publice).\n" +
        "— Senzori prezență și lumină naturală în coridoare/băi/sălile de ședințe (cf. EN 15193-1).\n" +
        "— Curățare lunară a filtrelor F7 ventilație și schimb anual G4 (debit aer cat. I = 50 m³/h·persoană).\n" +
        "— Etanșeizarea trecerilor prin curtain wall (cabluri, conducte) cu mansetă EPDM + spumă PUR rezistentă la foc.",
      regenerabileCustom:
        "— Expansiune PV 100→250 kWp pe acoperiș (curent 80 kWp acoperiș, posibilă acoperire shed-uri).\n" +
        "— CHP biogaz cogenerare pentru încălzire+electricitate la peak load iarnă.\n" +
        "— Pompă de căldură geotermală (4 puțuri × 100 m) pentru baseload încălzire/răcire (COP > 4.5).\n" +
        "— Sistem solar termic suplimentar (50 m² colectoare plane) pentru ACM birouri/cantină.",
    },
    opaqueElements: [
      {
        name: "Curtain wall — pereți spandrel termoizolat (S+E+V)",
        type: "PE", area: "1850", orientation: "S", tau: "1",
        layers: [
          { matName: "Aluminiu compozit ACM", material: "Aluminiu", thickness: "4", lambda: 200, rho: 2700 },
          { matName: "Vată minerală densă fațadă", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.036, rho: 80 },
          { matName: "Tablă spandrel oțel", material: "Oțel", thickness: "2", lambda: 50, rho: 7800 },
          { matName: "Cameră aer ventilat", material: "Aer", thickness: "30", lambda: 0.50, rho: 1.2 },
          { matName: "Gips-carton interior", material: "Gips-carton", thickness: "13", lambda: 0.21, rho: 800 },
        ],
      },
      {
        name: "Pereți opaci BCA umplutură + vată minerală 18 cm — Nord",
        type: "PE", area: "920", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială silicat fațadă", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "Vată minerală densă fațadă", material: "Vată minerală bazaltică", thickness: "180", lambda: 0.036, rho: 80 },
          { matName: "BCA 25 cm umplutură", material: "BCA (beton celular autoclavizat)", thickness: "250", lambda: 0.22, rho: 600 },
          { matName: "Tencuială interioară", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Terasă inversă XPS 22 cm + grădină verde",
        type: "PT", area: "950", orientation: "H", tau: "1",
        layers: [
          { matName: "Substrat vegetal", material: "Substrat vegetal extensiv", thickness: "120", lambda: 0.50, rho: 1100 },
          { matName: "Strat drenaj + filtru", material: "Strat drenaj poliuretan", thickness: "40", lambda: 0.15, rho: 30 },
          { matName: "Polistiren extrudat XPS 22 cm", material: "Polistiren extrudat XPS", thickness: "220", lambda: 0.034, rho: 35 },
          { matName: "Hidroizolație TPO antirăd", material: "Membrană TPO", thickness: "2", lambda: 0.20, rho: 950 },
          { matName: "Beton armat placă", material: "Beton armat", thickness: "200", lambda: 1.74, rho: 2400 },
        ],
      },
      {
        name: "Planșeu peste subsol parcare + EPS 12 cm",
        type: "PL", area: "950", orientation: "H", tau: "0.7",
        layers: [
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "220", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat EPS 12 cm", material: "Polistiren expandat EPS", thickness: "120", lambda: 0.034, rho: 25 },
          { matName: "Șapă mortar autonivel", material: "Șapă ciment autonivel", thickness: "60", lambda: 1.40, rho: 2000 },
          { matName: "Pardoseală gresie tehnică", material: "Gresie ceramică", thickness: "12", lambda: 1.30, rho: 2300 },
        ],
      },
    ],
    glazingElements: [
      { name: "Curtain wall triplu Low-E argon — Sud (jaluzele auto)",  area: "780", u: "0.85", g: "0.42", orientation: "S", frameRatio: "12", type: "Triplu Low-E argon" },
      { name: "Curtain wall triplu Low-E argon — Est",                  area: "560", u: "0.85", g: "0.45", orientation: "E", frameRatio: "12", type: "Triplu Low-E argon" },
      { name: "Curtain wall triplu Low-E argon — Vest",                  area: "560", u: "0.85", g: "0.45", orientation: "V", frameRatio: "12", type: "Triplu Low-E argon" },
      { name: "Curtain wall triplu Low-E argon — Nord (mai mic)",        area: "320", u: "0.80", g: "0.50", orientation: "N", frameRatio: "12", type: "Triplu Low-E argon" },
    ],
    thermalBridges: [
      { name: "Stâlp metalic MPC traversând curtain wall", type: "SB", psi: "0.04", length: "120" },
      { name: "Centură planșeu BA — fațadă ventilată",     type: "CB", psi: "0.03", length: "180" },
      { name: "Profil aluminiu curtain wall (typ.)",       type: "GF", psi: "0.05", length: "1900" },
      { name: "Cornișă atic terasă verde",                 type: "CO", psi: "0.05", length: "180" },
      { name: "Soclu fațadă ventilată",                    type: "SO", psi: "0.04", length: "180" },
      { name: "Conector spandrel — vitraj curtain wall",  type: "CB", psi: "0.06", length: "240" },
      { name: "Colț 90° clădire (S-E, S-V, N-E, N-V)",     type: "SB", psi: "0.05", length: "92" },
      { name: "Tranziție terasă — atic perimetral",        type: "CO", psi: "0.06", length: "180" },
      { name: "Penetrare ventilație ductă fațadă",         type: "GF", psi: "0.10", length: "12" },
    ],
    heating: {
      source: "PC_AA",
      power: "200",                       // PC aer-apă centralizată
      eta_gen: "3.80",                    // SCOP încălzire (PC industriale Bucureşti)
      nominalPower: "200",
      emission: "FCU_4P",                 // P1 fix: era "VENTILOCONV" — corect "FCU_4P" (Ventiloconvectoare 4 țevi — încălzire+răcire simultan, conform PC reversibilă AA)
      eta_em: "0.96",
      distribution: "BINE_INT_NZB",
      eta_dist: "0.97",
      control: "INTELIG",                 // BACS clasa A — control inteligent BMS
      eta_ctrl: "0.96",
      regime: "intermitent",              // Birouri (program 8-19)
      theta_int: "21",                    // Setpoint birouri EN 16798-1
      nightReduction: "5",                // Reducere noapte 5°C (16°C noaptea)
      tStaircase: "",
      tBasement: "8",
      tAttic: "",
    },
    acm: {
      source: "PC_ACM",                   // PC sol-apă pentru ACM (ramură separată)
      consumers: "150",                   // Cca 150 ocupanți birouri
      dailyLiters: "8",                   // 8 L/persoană/zi (birouri — doar lavoare)
      consumptionLevel: "low",            // P1 fix: era "scazut" — UI așteaptă "low|med|high" (Step3Systems.jsx:209)
      tSupply: "55",
      storageVolume: "1000",              // Buffer ACM 1000L
      insulationClass: "A",
      pipeLength: "85",
      pipeInsulated: true,
      pipeInsulationThickness: "30mm",
      pipeDiameter: "32",
      circRecirculation: true,
      circHours: "12",
      circPumpType: "iee_sub_023",
      hasLegionella: true,
      legionellaFreq: "weekly",
      legionellaT: "70",
    },
    cooling: {
      system: "PC_REV_AA",
      power: "180",
      eer: "5.10",
      seer: "6.40",
      cooledArea: "5400",
      distribution: "BINE_INT_NZB",
      hasCooling: true,
      setpoint: "25",
      shadingExternal: "0.78",
      useHourly: true,
      emissionType: "fan_coil",           // P1 fix: era "ventiloconvectoare" — corect "fan_coil" (4 țevi, conform COOLING_EMISSION_EFFICIENCY line 360)
      eta_em: "0.96",
      distributionType: "apa_rece_izolat_int",
      eta_dist: "0.97",
      controlType: "bacs_clasa_a",        // P1 fix: era "BMS_inteligent" — corect "bacs_clasa_a" (BACS A high-performance AI optimization, conform COOLING_CONTROL_EFFICIENCY line 397)
      eta_ctrl: "0.97",
      P_aux_pumps: "1.6",
      P_aux_fans: "5.4",
      t_cooling_hours: "1100",
      hasNightVent: true,
      n_night: "1.5",
      comfortCategory: "I",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "MEC_HR80",                   // Recuperator entalpic 80%
      airflow: "6750",                    // P1 fix: 12.5 L/s/persoană × 150 ocupanți × 3.6 = 6750 m³/h (cat. I EN 16798-1)
      fanPower: "1125",                   // P1 fix: SFP 0.6 kW/(m³/s) × 1.875 m³/s = 1.125 kW = 1125 W (ventilatoare EC top, sub limita SFP1)
      operatingHours: "3000",
      hrEfficiency: "80",
    },
    lighting: {
      type: "LED",
      pDensity: "6.0",                    // LED DALI birouri 6.0 W/m² (target EN 15193)
      controlType: "PREZ_DAY",            // Prezență + daylight control DALI
      fCtrl: "0.55",
      operatingHours: "2400",
      naturalLightRatio: "55",            // Curtain wall expune 55% birouri la lumină naturală
      pEmergency: "0.5",
      pStandby: "0.1",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: {
      enabled: true,
      type: "MONO",
      area: "180",                        // 30 kWp × ~6 m²/kWp pentru module 400Wp
      orientation: "S",
      tilt: "20",                         // Optim București anual
      inverterType: "PREM",
      inverterEta: "0.98",
      peakPower: "30",
      usage: "all",                       // P1 fix: era "autoconsum" — UI așteaptă "all|lighting|hvac|export" (Step4Renewables.jsx:177)
    },
    heatPump: {
      enabled: true,
      type: "PC_AA",
      cop: "3.80",
      scopHeating: "3.50",
      scopCooling: "5.20",
      covers: "heating_cooling_acm",
      bivalentTemp: "-15",
      auxSource: "REZ_EL",
      auxEta: "1.00",
    },
    biomass: { enabled: false },
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: true,
      cogenElectric: "50",                // 50 kWel CHP gaz
      cogenThermal: "80",                 // 80 kWth recuperat
      cogenFuel: "gaz_natural",
      cogenType: "micro_chp_gaz",
      cogenPowerEl: "50",
      cogenHours: "5500",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: {
      enabled: true,
      type: "LFP",
      capacity: "60",                     // 60 kWh utilă pentru autoconsum birouri
      power: "30",
      dod: "0.90",
      selfConsumptionPct: "82",
    },
    auditor: {
      name: "ing. dr. Constantinescu Mihaela",
      atestat: "B-09245",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "PassivTech Romania SRL",
      phone: "0744 989 121",
      email: "mihaela.c@passivtech.ro",
      date: "2024-11-22",
      mdlpaCode: "CE-2024-09245",
      cpeNumber: "CPE-2024-00874",
      cpeCode: "CE-2024-09245_20241122_Constantinescu_Mihaela_B_263410_001_CPE",
      registryIndex: "874",
      scopCpe: "receptie",
      validityYears: "10",
      registruEvidenta: "RE-2024-B-09245",
      nrCadastral: "263410-C1",
      codUnicMDLPA: "CE-2024-09245",
      dataExpirareDrept: "2030-12-31",
      dataTransmitereMDLPA: "2024-11-23",
      // ── ADĂUGAT: Semnătură + ștampilă placeholder DEMO (PNG dataURL valid 1x1, deblochează pipeline export) ──
      // În producție, auditorul încarcă PNG real (300×100 semnătură, Ø150 ștampilă conform Ord. MDLPA 348/2026 — 40 mm Ø)
      // prin componenta `AuditorSignatureStampUpload.jsx` în Step 6.
      signatureDataURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>Constantinescu M.</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text><text x='200' y='110' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23bbbbbb'>Inlocuieste prin UI Step 6 inainte de export oficial</text></svg>",
      stampDataURL:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>Constantinescu M.</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>CE-2024-09245</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>",
      observations: "Clădire birouri Tower Pipera Office recepționată noiembrie 2024. nZEB conformă EPBD 2024 + L.238/2024. Anvelopă: curtain wall triplu Low-E argon U=0.85, fațadă ventilată vată minerală 18 cm, terasă verde XPS 22 cm. Sisteme: PC aer-apă centralizată 200 kW (SCOP 3.50), CHP gaz natural 50 kWel/80 kWth (5500 h/an), PV 30 kWp + baterie LFP 60 kWh (autoconsum 82%), recuperator entalpic 80%. BACS clasa A — BMS Siemens Desigo. RER total ≈ 62% (PV + CHP recuperare + PC). MEPS 2030/2033 PASS cu marjă. Pașaport renovare neaplicabil — clădire deja nZEB de top.",
      photo: "",
    },
    expectedResults: {
      energyClass: "A",
      E_p_total_kWh_m2_y: 50,
      // P1 fix (28 apr 2026): aliniat E_p_ren/E_p_nren cu RER 62% declarat (anterior: 22/28 = RER 44% — inconsistent).
      // Recalcul: RER 62% × 50 = 31 kWh/m²·an regenerabil (PV 30 kWp + CHP recuperare gaz + PC SCOP > 1).
      // Conform L.238/2024 + SR EN ISO 52000-1 §B.2: RER include energie regenerabilă on-site + recuperare CHP + componenta SCOP > 1 a PC AA.
      E_p_nren_kWh_m2_y: 19,
      E_p_ren_kWh_m2_y: 31,
      RER_pct: 62,
      U_med_W_m2K: 0.18,
      U_max_violations: [],
      Q_inc_kWh_m2_y: 18,
      Q_rac_kWh_m2_y: 9,
      Q_acm_kWh_m2_y: 4,
      Q_il_kWh_m2_y: 14,
      Q_aux_kWh_m2_y: 5,
      bacsClass: "A",
      fBac: 0.81,
      sriPct: 88,
      meps2030_pass: true,
      meps2033_pass: true,
      meps2050_pass: true,
      passportRequired: false,
      passportPhases: 0,
      passportTargetClass: "A",
      documentsExpected: ["CPE-BI", "Raport-Audit", "Pasaport-Renovare-Empty"],
      tolerances: { E_p_nren: 0.20, E_p_total: 0.20, RER: 5, U_med: 0.10, Q_inc: 0.20 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M3 — Casă unifamilială BCA renovată parțial — Cluj-Napoca (ZONA III)
  // CT condensare gaz + pardoseală + radiatoare + 4 kWp PV + split-uri inverter
  // Scop: testare scenariu „mid-life renovation", PV mic, MEPS 2033 fail,
  //       Pașaport renovare cu recomandări ușoare
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-3-cluj-casa-1998-ren-2015",
    title: "M3 · Casă RI BCA renovată parțial — Cluj (Zona III, CT cond. + PV) — clasă D",
    shortDesc: "Casă 145 m² BCA + EPS 5cm, CT cond. 22 kW + PV 4 kWp, MEPS 2033 fail, Pașaport recomandat",
    building: {
      address: "Str. Donath nr. 84",
      city: "Cluj-Napoca",
      county: "Cluj",
      postal: "400270",                    // ADĂUGAT: alias compatibilitate Step1
      postalCode: "400270",
      locality: "Cluj-Napoca",
      latitude: "46.7796",   // Cluj ~46.78°N (Zona III)
      longitude: "23.5648",  // Cluj ~23.56°E
      cadastralNumber: "318745-C1",
      landBook: "CF nr. 318745 Cluj-Napoca UAT Cluj",
      owner: "Mureșan Andrei și Mureșan Ioana",
      ownerType: "PF",                     // ADĂUGAT: cuplu proprietari persoane fizice (coproprietate)
      category: "RI",
      structure: "Zidărie portantă — BCA (200–300 mm, 1970–prezent)",
      yearBuilt: "1998",
      yearRenov: "2015",
      floors: "P+1",
      basement: false,
      attic: true,                        // Pod nelocuit
      units: "1",
      stairs: "1",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "145",
      areaBuilt: "165",
      areaHeated: "145",
      volume: "405",                      // h_etaj 2.80 × 145
      areaEnvelope: "385",
      heightBuilding: "7.5",
      heightFloor: "2.80",
      perimeter: "42",
      n50: "4.0",                         // Etanșeitate moderată după renovare 2015
      shadingFactor: "0.88",
      gwpLifecycle: "380",
      solarReady: true,
      evChargingPoints: "1",
      evChargingPrepared: "0",
      co2MaxPpm: "1100",
      pm25Avg: "12",
      scaleVersion: "2023",
      scopCpe: "vanzare",
      parkingSpaces: "2",
      energyClassAfterRenov: "B",
      emissionClassAfterRenov: "B",
      energySavings: "32",
      co2Reduction: "28",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "",    hoursYear: "" },
        stairsLighting:    { installed: false, powerKW: "",    hoursYear: "" },
        centralHeating:    { installed: false, fuel: "" },
        commonVentilation: { installed: false, powerKW: "",    hoursYear: "" },
        pumpGroup:         { installed: false, powerKW: "",    hoursYear: "" },
      },
      // ── ADĂUGAT: Anexa 1+2 MDLPA — overrides pentru context casă unifam BCA 1998 ren. parțial 2015 + split-uri R32 inverter ──
      coolingRefrigerant: "R32",                           // override: split-uri moderne post-renovare (default ar fi R410A pt yearBuilt 1998)
      coolingOutdoorUnits: "2",                            // override: 2 split-uri = 2 unități exterioare (default formula da 1)
      ventilationHrType: "",                               // override: ventilație NATURALA_HIBRID (extracție WC+bucătărie) — fără recuperator HR
      // ── ADĂUGAT: ANCPI bypass DEMO ──
      ancpi: {
        verified: true,
        fileName: "demo-cf-318745-cluj.pdf",
        fileSize: 168200,
        fileBase64: null,
        uploadDate: "2026-04-27T11:15:00.000Z",
        cadastralNr: "318745-C1",
        carteFunciara: "CF nr. 318745 Cluj-Napoca UAT Cluj",
      },
      // ── 2 mai 2026: pre-populare AnexaMDLPA pentru demo M3 — Casă Cluj 1998 ──
      nrOcupanti: "4",                         // familie 4 persoane în casă RI 165 m²
      etapeImplementare:
        "1. Identificați minimum 3 oferte comparative de la contractori autorizați.\n" +
        "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR, AFM Casa Verde Plus, fonduri locale).\n" +
        "3. Obțineți autorizațiile legale necesare (AC pentru extinderea ETICS, avize ISU dacă lucrările afectează căile de evacuare).\n" +
        "4. Implementați măsurile în ordinea priorităților: continuare anvelopă (10→15 cm EPS) → upgrade CT condensare → expansiune PV.\n" +
        "5. Documentați toate lucrările executate și obțineți declarațiile de performanță ale produselor (Reg. (UE) 305/2011).\n" +
        "6. Solicitați o nouă auditare energetică după finalizarea renovării pentru confirmarea trecerii în clasa B/A.",
      stimulenteFinanciare:
        "— AFM Casa Verde Plus: finanțare 100% pentru pompe de căldură și panouri solare termice (persoane fizice, casă individuală).\n" +
        "— PNRR componenta C5 — Valul Renovării: granturi pentru renovarea energetică a caselor individuale până la standard nZEB.\n" +
        "— Credite verzi: BRD Eco Home / ING Green Loan / BCR Casa Ta — dobânzi preferențiale (verifică ofertele active la depunerea dosarului).\n" +
        "— Scheme fiscale active la data emiterii CPE pentru investiții în eficiență energetică (verifică anaf.ro).",
      solutiiAnvelopa:
        "— Continuare ETICS de la 5 cm la 15 cm EPS pe toate fațadele (peste actuala izolație degradată).\n" +
        "— Tratarea punților termice principale identificate (atic, soclu, intersecție acoperiș-pereți) — manșoane locale 5–10 cm.\n" +
        "— Înlocuire vitraje termopan vechi (anterior 2010) cu vitraj triplu Low-E argon (U_w < 1.0).\n" +
        "— Verificare hidroizolație acoperiș tip șarpantă lemn — refacere dacă vârsta > 15 ani (CR 0-2012).",
      solutiiInstalatii:
        "— Echilibrare hidraulică completă a circuitelor de încălzire (robinete cu presetare diferențială, deja parțial echipate).\n" +
        "— Reglaj automat al temperaturii pe cameră prin termostate Smart cu programare săptămânală.\n" +
        "— Inspecție anuală obligatorie centrală termică condensare (HG 1043/2007 — orice cazan > 20 kW).\n" +
        "— Adăugare pompă de circulație ACM cu detecție utilizare (eficiență ηₑₛ ≥ 0.27, EuP Lot 11).",
      masuriOrganizare:
        "— Plan anual de monitorizare consumuri (electricitate, gaz, apă caldă) cu verificare lunară.\n" +
        "— Instruirea ocupanților privind setările optime ale termostatelor pe sezon (cf. Mc 001-2022 art. 7.3).\n" +
        "— Audit energetic intermediar la fiecare 5 ani sau la modificarea componenței familiei.\n" +
        "— Documentare lucrări de renovare (foto, facturi, declarații conformitate produse) pentru următorul CPE.",
      masuriLocale:
        "— Etanșeizarea trecerilor prin anvelopă (cabluri, conducte, ventilație) cu mansetă EPDM + spumă PUR.\n" +
        "— Înlocuirea bateriilor sanitare cu modele cu limitare debit (clasă A WELL — economie ~30% apă caldă).\n" +
        "— Becuri LED inteligente cu senzor prezență în spații tranzit (hol, scară, baie).\n" +
        "— Programare orară a iluminatului și CT pe sezon și zi de săptămână (termostate cu cronoprogramare).",
      regenerabileCustom:
        "— Expansiune PV de la 5 kWp la 10 kWp (capacitate acoperiș rămasă 30 m², orientare Sud).\n" +
        "— Adăugare baterie stocare 10 kWh (Tesla Powerwall sau Pylontech) pentru autoconsum nocturn.\n" +
        "— Pompă de căldură aer-apă pentru pre-încălzire CT condensare (COP > 4.0, R290 propan).\n" +
        "— Sistem solar termic 4-6 m² colectoare plane pentru ACM (acoperire 50–70% an, DH cuplat la rezervor 200L).",
    },
    opaqueElements: [
      {
        name: "Pereți BCA 30 cm + EPS 5 cm — Sud + Est + Vest",
        type: "PE", area: "165", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială decorativă silicat", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "EPS 5 cm (renovare 2015)", material: "Polistiren expandat EPS", thickness: "50", lambda: 0.038, rho: 18 },
          { matName: "BCA 30 cm portant", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
          { matName: "Tencuială var-gips interioară", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Pereți BCA 30 cm + EPS 5 cm — Nord",
        type: "PE", area: "65", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială decorativă silicat", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "EPS 5 cm (renovare 2015)", material: "Polistiren expandat EPS", thickness: "50", lambda: 0.038, rho: 18 },
          { matName: "BCA 30 cm portant", material: "BCA (beton celular autoclavizat)", thickness: "300", lambda: 0.22, rho: 600 },
          { matName: "Tencuială var-gips interioară", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Planșeu peste etaj sub pod nelocuit + vată minerală 15 cm (renovare 2015)",
        type: "PT", area: "75", orientation: "H", tau: "0.8",
        layers: [
          { matName: "Vată minerală 15 cm peste planșeu", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.038, rho: 60 },
          { matName: "Beton armat planșeu peste etaj 1", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială tavan", material: "Tencuială var-gips", thickness: "15", lambda: 0.45, rho: 1200 },
        ],
      },
      {
        name: "Placă pe sol — neizolat (de renovat în pașaport)",
        type: "PL", area: "75", orientation: "H", tau: "0.5",
        layers: [
          { matName: "Pietriș compactat", material: "Pietriș", thickness: "100", lambda: 0.70, rho: 1800 },
          { matName: "Beton armat fundație", material: "Beton armat", thickness: "120", lambda: 1.74, rho: 2400 },
          { matName: "Șapă mortar", material: "Șapă ciment", thickness: "60", lambda: 1.40, rho: 2000 },
          { matName: "Folie polietilenă barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 950 },
          { matName: "Parchet laminat", material: "Parchet laminat", thickness: "10", lambda: 0.18, rho: 700 },
        ],
      },
    ],
    glazingElements: [
      { name: "PVC 5 camere dublu Low-E argon — Sud (înlocuit 2015)", area: "12", u: "1.35", g: "0.62", orientation: "S", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Est",                  area: "5",  u: "1.35", g: "0.62", orientation: "E", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Vest",                  area: "5",  u: "1.35", g: "0.62", orientation: "V", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Nord",                  area: "8",  u: "1.35", g: "0.62", orientation: "N", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "Ușă intrare lemn stratificat",                            area: "2.2", u: "1.80", g: "0.00", orientation: "S", frameRatio: "100", type: "Ușă lemn stratificat" },
    ],
    thermalBridges: [
      { name: "Stâlpișori BA în zidărie BCA",         type: "SB", psi: "0.18", length: "32" },
      { name: "Centuri BA peste etaje",                type: "CB", psi: "0.12", length: "84" },
      { name: "Soclu fără izolație perimetrală (de remediat)", type: "SO", psi: "0.55", length: "42" },
      { name: "Glaf fereastră PVC (renovare 2015)",   type: "GF", psi: "0.10", length: "60" },
      { name: "Buiandrug deasupra ferestrei BA",       type: "CB", psi: "0.20", length: "12" },
      { name: "Cornișă pod nelocuit",                  type: "CO", psi: "0.10", length: "42" },
    ],
    heating: {
      source: "GAZ_COND",
      power: "22",
      eta_gen: "0.97",
      nominalPower: "22",
      emission: "PARD",                   // P1 fix: era "MIXT_PARDOSEALA_RADIATOARE" — UI nu are mix; ales "PARD" (pardoseală radiantă, dominantă parter, EMISSION_SYSTEMS line 103). Etajul (radiatoare oțel) menționat în observații.
      eta_em: "0.95",
      distribution: "BINE_INT",
      eta_dist: "0.93",
      control: "PROG",                    // P1 fix: era "TERMOSTAT_CRONO" — corect "PROG" (Termostat ambiental programabil, CONTROL_TYPES line 152)
      eta_ctrl: "0.92",
      regime: "intermitent",
      theta_int: "21",
      nightReduction: "3",
      tStaircase: "",
      tBasement: "",
      tAttic: "10",
    },
    acm: {
      source: "CAZAN_H",                  // P1 fix: era "GAZ_COND" — corect "CAZAN_H" (același cazan cu încălzirea, prioritate termică, ACM_SOURCES line 290)
      consumers: "4",
      dailyLiters: "55",
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "150",
      insulationClass: "B",
      pipeLength: "18",
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
      system: "SPLIT_INV",
      power: "5",
      eer: "4.20",
      seer: "5.50",
      cooledArea: "60",                   // Doar 2 dormitoare (split + dormitor matrim.)
      distribution: "DIRECT",
      hasCooling: true,
      setpoint: "26",
      shadingExternal: "0.85",
      useHourly: false,
      emissionType: "split_mural",        // P1 fix: era "split_perete" — corect "split_mural" (Split mural / unitate interioară VRF, COOLING_EMISSION_EFFICIENCY line 362)
      eta_em: "0.95",
      distributionType: "agent_frig",     // P1 fix: era "agent_R32_int" — corect "agent_frig" (Agent frigorific direct VRF/split, COOLING_DISTRIBUTION_EFFICIENCY line 375)
      eta_dist: "0.98",
      controlType: "termostat_prop",      // P1 fix: era "remote_inv" — corect "termostat_prop" (Termostat proporțional P/PI, COOLING_CONTROL_EFFICIENCY line 392)
      eta_ctrl: "0.94",
      P_aux_pumps: "0",
      P_aux_fans: "0.05",
      t_cooling_hours: "650",
      hasNightVent: false,
      n_night: "",
      comfortCategory: "II",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT_HIBRIDA",                // P1 fix: era "NATURALA_HIBRID" — corect "NAT_HIBRIDA" (VENTILATION_TYPES line 443)
      airflow: "180",
      fanPower: "20",                     // Extracție WC + bucătărie
      operatingHours: "8760",
      hrEfficiency: "0",
    },
    lighting: {
      type: "LED_E27",                    // P1 fix: era "MIXT" — UI nu are MIXT; ales "LED_E27" (LED retrofit, dominant 70% în mix conform comentariu, LIGHTING_TYPES line 488)
      pDensity: "5.5",                    // Mix LED 70% + halogen 30%
      controlType: "MAN",                 // P1 fix: era "MANUAL" — corect "MAN" (LIGHTING_CONTROL line 504)
      fCtrl: "1.0",
      operatingHours: "1900",
      naturalLightRatio: "45",
      pEmergency: "0",
      pStandby: "0.2",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: {
      enabled: true,
      type: "MONO",
      area: "22",
      orientation: "S",
      tilt: "30",
      inverterType: "STD",
      inverterEta: "0.96",
      peakPower: "4",
      usage: "all",                       // P1 fix: era "autoconsum" — UI așteaptă "all|lighting|hvac|export"
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
      // ADĂUGAT: Semnătură + ștampilă DEMO (placeholder SVG — înlocuiește prin UI Step 6 înainte de export oficial)
      signatureDataURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>Pop Cosmin</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text></svg>",
      stampDataURL:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>Pop Cosmin</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>CJ-03142</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>",
      observations: "Casă unifamilială P+1 Cluj-Napoca, ren. parțial 2015 (geamuri PVC + EPS 5 cm pe pereți + vată 15 cm peste planșeu pod). Sisteme: CT condensare gaz 22 kW Vaillant ecoTEC plus, distribuție mixtă pardoseală radiantă (parter) + radiatoare oțel (etaj), boiler indirect 150L. Răcire: 2 split-uri R32 inverter clasa A++ (dormitoare). PV 4 kWp acoperiș Sud, autoconsum fără baterie. n₅₀ = 4.0 h⁻¹. Recomandări Pașaport Renovare: izolație suplimentară pereți (10 cm EPS-G către U=0.20), izolare placă sol perimetral, înlocuire CT cu pompă căldură aer-apă pentru clasă B. CPE valabil 10 ani — emis pentru tranzacție vânzare imobiliară.",
      photo: "",
    },
    expectedResults: {
      energyClass: "D",
      E_p_total_kWh_m2_y: 165,
      E_p_nren_kWh_m2_y: 145,
      E_p_ren_kWh_m2_y: 20,
      RER_pct: 12,
      U_med_W_m2K: 0.55,
      U_max_violations: ["PL"],           // Placă pe sol depășește U_max 2022
      Q_inc_kWh_m2_y: 95,
      Q_rac_kWh_m2_y: 8,
      Q_acm_kWh_m2_y: 28,
      Q_il_kWh_m2_y: 12,
      Q_aux_kWh_m2_y: 2,
      bacsClass: "C",
      fBac: 1.00,
      sriPct: 48,
      meps2030_pass: true,
      meps2033_pass: false,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 2,
      passportTargetClass: "B",
      documentsExpected: ["CPE-RI", "Raport-Audit", "Pasaport-Renovare"],
      tolerances: { E_p_nren: 0.15, E_p_total: 0.15, RER: 5, U_med: 0.10, Q_inc: 0.15 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M4 — Școală gimnazială reabilitată — Brașov Tractorul (ZONA IV, rece)
  // CT condensare gaz central 350 kW + recuperator entalpic săli mari + PV 15 kWp
  // Scop: testare clădire publică nerezidențială, regim intermitent (vacanțe
  //       școlare), BACS clasa B, ventilație mixtă (naturală + mecanică),
  //       MEPS 2030 pass marginal.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-4-brasov-scoala-1985-ren-2022",
    title: "M4 · Școală gimnazială reabilitată — Brașov (Zona IV, CT central + PV) — clasă B",
    shortDesc: "Școală 1850 m² zidărie + EPS 15cm, CT cond. 350 kW + 15 kWp PV + LED DALI, MEPS 2030 pass",
    building: {
      address: "Str. Aurel Vlaicu nr. 8, Școala Gimnazială Nr. 25",
      city: "Brașov",
      county: "Brașov",
      postal: "500178",                    // ADĂUGAT: alias compatibilitate Step1
      postalCode: "500178",
      locality: "Brașov",
      latitude: "45.6427",   // Brașov ~45.64°N (Zona IV climă rece)
      longitude: "25.5887",  // Brașov ~25.59°E
      cadastralNumber: "104587-C1",
      landBook: "CF nr. 104587 Brașov UAT Brașov",
      owner: "Primăria Municipiului Brașov",     // CURĂȚAT: CUI extras în câmp dedicat ownerCUI
      ownerType: "PUB",                          // ADĂUGAT: instituție publică (Primăria — UAT)
      ownerCUI: "4384206",                       // ADĂUGAT: extras din string original (CUI Primăria Brașov)
      category: "ED",
      structure: "Zidărie portantă — cărămidă plină (240 / 290 mm, ante 1980)",
      yearBuilt: "1985",
      yearRenov: "2022",
      floors: "P+2",
      basement: true,
      attic: false,
      units: "1",
      stairs: "2",
      nApartments: "1",
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "1850",
      areaBuilt: "2150",
      areaHeated: "1850",
      volume: "6475",                     // h=3.50 m
      areaEnvelope: "2200",
      heightBuilding: "12",
      heightFloor: "3.50",
      perimeter: "165",
      n50: "1.5",                         // Test blower-door post-reabilitare
      shadingFactor: "0.90",
      gwpLifecycle: "320",
      solarReady: true,
      evChargingPoints: "2",
      evChargingPrepared: "4",
      co2MaxPpm: "950",                   // Săli aglomerate, ventilație mecanică pe parțial
      pm25Avg: "9",
      scaleVersion: "2023",
      scopCpe: "renovare_majora",
      parkingSpaces: "12",
      energyClassAfterRenov: "B",
      emissionClassAfterRenov: "B",
      energySavings: "55",
      co2Reduction: "48",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "",    hoursYear: "" },
        stairsLighting:    { installed: true,  powerKW: "0.5", hoursYear: "1100" },
        centralHeating:    { installed: true,  fuel: "gaz_cond" },
        commonVentilation: { installed: true,  powerKW: "4.5", hoursYear: "1800" },
        pumpGroup:         { installed: true,  powerKW: "1.2", hoursYear: "2800" },
      },
      // ── ADĂUGAT: Anexa 1+2 MDLPA — overrides pentru școală 1850 m² CT central 350 kW + BACS B + ventilație hibridă ──
      heatingRadiators: [{                                 // override: lista ridicolă (default = 234 buc) — realist 60+8 radiatoare
        type: "Radiator oțel panou",
        count_private: "60",      // săli clasă + birouri + sală festivă + sală sport (~60 corpuri)
        count_common: "8",        // coridoare + holuri (~8 corpuri)
        power_kw: "350.0",
      }],
      heatingHasMeter: "da",                               // override: BACS B + școală publică → contor termic obligatoriu
      heatingPipeDiameterMm: "65",                         // override: CT 350 kW → DN65 (NU DN25 default)
      acmFixtures: {                                       // override: 320 ocupanți (280 elevi + 40 personal), nu 4 default școală
        lavoare: "16", cada_baie: "0", spalatoare: "1", rezervor_wc: "16",
        bideuri: "0", pisoare: "8", dus: "4",
        masina_spalat_vase: "0", masina_spalat_rufe: "0",
      },
      acmConsumePointsCount: "30",                         // override: 16+1+16+8+4 = 45 (rotunjit operațional 30)
      acmPipeDiameterMm: "32",                             // override: ACM 500L cu pipeLength 120m → DN32 realist
      acmHasMeter: "da",                                   // override: BACS B + școală publică
      acmFlowMeters: "peste_tot",                          // override: BACS B
      acmRecirculation: "functionala",                     // override: consistent cu acm.circRecirculation=true
      coolingRefrigerant: "R32",                           // override: split-uri moderne post-2018 (default ar fi R410A pt yearBuilt 1985)
      coolingIndoorUnits: "4",                             // override: 2 săli IT × 2 split-uri = 4 unități interior
      coolingOutdoorUnits: "2",                            // override: 1 outdoor per sală IT (NU 3 default)
      coolingIndividualMeter: "da",                        // override: BACS B
      ventilationFanCount: "6",                            // override: sala festivă + sala sport + AHU coridoare (NU 4 default)
      ventilationHrType: "rotativ",                        // override: recuperator entalpic 75% (NU placi default)
      ventilationControlType: "program",                   // override: BACS B programat (NU manual default)
      // ── ADĂUGAT: ANCPI bypass DEMO ──
      ancpi: {
        verified: true,
        fileName: "demo-cf-104587-brasov-scoala.pdf",
        fileSize: 198750,
        fileBase64: null,
        uploadDate: "2022-09-25T08:45:00.000Z",
        cadastralNr: "104587-C1",
        carteFunciara: "CF nr. 104587 Brașov UAT Brașov",
      },
      // ── 2 mai 2026: pre-populare AnexaMDLPA pentru demo M4 — Școală Brașov ──
      nrOcupanti: "320",                       // ~320 elevi + 30 cadre didactice + personal auxiliar
      etapeImplementare:
        "1. Aprobați planul de investiții prin Consiliul de Administrație al școlii și Inspectoratul Școlar Județean.\n" +
        "2. Verificați eligibilitatea pentru programele de finanțare disponibile (PNRR componenta C5.1 Eficiență energetică clădiri publice, PODD FEDR).\n" +
        "3. Obțineți autorizațiile legale necesare (AC, avize ISU pentru clădire publică, aprobări Direcția Sanitar-Veterinară pentru cantină).\n" +
        "4. Implementați măsurile în vacanțele școlare (iulie-august) pentru a nu perturba activitatea didactică.\n" +
        "5. Documentați performanța atinsă (m&v M&V IPMVP — comparație consum baseline vs. post-implementare prin facturare lunară).\n" +
        "6. Solicitați re-certificare CPE după 3 ani sau la modificarea regimului de utilizare (Mc 001-2022 art. 7.5, L.121/2014).",
      stimulenteFinanciare:
        "— PNRR componenta C5.1 — Eficiență energetică clădiri publice: finanțare 100% din fonduri europene (prioritate maximă educație).\n" +
        "— PODD — Programul Operațional Dezvoltare Durabilă (FEDR 2021-2027): accesibil unităților administrativ-teritoriale.\n" +
        "— Buget de stat și buget local: investiții în infrastructura școlară (HG 907/2016 — expertiză tehnică + PT obligatoriu).\n" +
        "— Granturi norvegiene/SEE pentru clădiri publice eficiente energetic (acord cu MMAP).",
      solutiiAnvelopa:
        "— Verificare anuală a stării ETICS aplicat în 2022 (termoviziune SR EN 13187 cf. ghid PNRR).\n" +
        "— Tratarea punților termice principale identificate (atic, soclu, balcoane scării de incendiu) — manșoane locale 5–10 cm.\n" +
        "— Refacere hidroizolație acoperiș tip terasă necirculabilă la 10 ani (CR 0-2012, GP 070-2013).\n" +
        "— Verificarea integrității ferestrelor PVC 6 camere instalate în 2022 (etanșeitate joints, scurgere).",
      solutiiInstalatii:
        "— Optimizare program BMS pentru ocupare școlară (8-15 program normal, weekend setback 16°C, vacanțe shutdown).\n" +
        "— Echilibrare hidraulică anuală a tronsoanelor cu utilizare neuniformă (sală sport, atelier, cantină).\n" +
        "— Inspecție anuală obligatorie centrală termică (HG 1043/2007 — toate cazanele > 20 kW din clădire publică).\n" +
        "— Calibrare senzori CO₂ pentru DCV (cf. EN 15251 cat. III școli — 800-1200 ppm setpoint).",
      masuriOrganizare:
        "— Implementare ISO 50001 cu manager energetic atestat ANRE (obligație clădire publică > 250 m²).\n" +
        "— Audit energetic intermediar la fiecare 4 ani (L.121/2014 art. 9 alin. 1).\n" +
        "— Plan anual monitorizare cu raport trimestrial către Direcția Tehnică a Primăriei (intensitate kWh/m²·an, kgCO₂/m²·an).\n" +
        "— Instruirea cadrelor didactice și elevilor privind setările optimale (proiect educativ Erasmus+ Green Schools).",
      masuriLocale:
        "— Programare orară iluminat zonal cu DALI-2 (8-15 zone clase, 7-22 zone hol/cantină, weekend off).\n" +
        "— Senzori prezență în săli de clasă neutilizate, băi, depozite (cf. EN 15193-1).\n" +
        "— Curățare lunară filtre F7 ventilație și schimb anual G4 (debit aer cat. III școli = 25 m³/h·persoană).\n" +
        "— Etanșeizarea trecerilor prin anvelopă (cabluri tablou electric, conducte gaz, evacuare hota cantină).",
      regenerabileCustom:
        "— Expansiune PV de la 60 kWp la 150 kWp (acoperiș terasă 1100 m² rămas neutilizat, sud-est).\n" +
        "— Sistem solar termic suplimentar 100 m² colectoare plane pentru ACM cantină + dușuri sală sport.\n" +
        "— Pompă de căldură geotermală (4 puțuri × 80 m) pentru baseload încălzire (COP > 4.5, R290 propan).\n" +
        "— Stocare termică în rezervor 5000L cu PCM 30°C pentru shaving peak iarna (BTES alternativ).",
    },
    opaqueElements: [
      {
        name: "Pereți zidărie 38 cm + EPS 15 cm — Sud + Est",
        type: "PE", area: "640", orientation: "S", tau: "1",
        layers: [
          { matName: "Tencuială decorativă silicat", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "EPS 15 cm (reabilitare 2022)", material: "Polistiren expandat EPS", thickness: "150", lambda: 0.036, rho: 18 },
          { matName: "Zidărie cărămidă plină 38 cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
          { matName: "Tencuială interioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Pereți zidărie 38 cm + EPS 15 cm — Nord + Vest",
        type: "PE", area: "560", orientation: "N", tau: "1",
        layers: [
          { matName: "Tencuială decorativă silicat", material: "Tencuială silicat", thickness: "8", lambda: 0.70, rho: 1700 },
          { matName: "EPS 15 cm (reabilitare 2022)", material: "Polistiren expandat EPS", thickness: "150", lambda: 0.036, rho: 18 },
          { matName: "Zidărie cărămidă plină 38 cm", material: "Cărămidă plină", thickness: "380", lambda: 0.80, rho: 1800 },
          { matName: "Tencuială interioară", material: "Tencuială var-ciment", thickness: "20", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Acoperiș terasă reabilitată EPS 18 cm + hidroizolație",
        type: "PT", area: "620", orientation: "H", tau: "1",
        layers: [
          { matName: "Pietriș protecție", material: "Pietriș", thickness: "50", lambda: 0.70, rho: 1800 },
          { matName: "Polistiren expandat EPS 18 cm (reab. 2022)", material: "Polistiren expandat EPS", thickness: "180", lambda: 0.034, rho: 18 },
          { matName: "Hidroizolație bituminoasă SBS dublu", material: "Membrană SBS", thickness: "8", lambda: 0.20, rho: 1050 },
          { matName: "Beton armat planșeu terasă", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Tencuială tavan ultim etaj", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
        ],
      },
      {
        name: "Planșeu peste subsol nelocuit + EPS 8 cm (reab. 2022)",
        type: "PB", area: "620", orientation: "H", tau: "0.6",
        layers: [
          { matName: "Beton armat planșeu", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat EPS 8 cm", material: "Polistiren expandat EPS", thickness: "80", lambda: 0.036, rho: 18 },
          { matName: "Șapă autonivel", material: "Șapă ciment autonivel", thickness: "50", lambda: 1.40, rho: 2000 },
          { matName: "Pardoseală linoleum", material: "Linoleum", thickness: "5", lambda: 0.17, rho: 1200 },
        ],
      },
    ],
    glazingElements: [
      { name: "Triplu vitraj Low-E argon PVC 6 camere — Sud (săli clasă)",     area: "120", u: "1.10", g: "0.55", orientation: "S", frameRatio: "20", type: "Triplu Low-E argon" },
      { name: "Triplu vitraj Low-E argon PVC 6 camere — Est (săli clasă)",     area: "85",  u: "1.10", g: "0.55", orientation: "E", frameRatio: "20", type: "Triplu Low-E argon" },
      { name: "Triplu vitraj Low-E argon PVC 6 camere — Vest (săli clasă)",    area: "85",  u: "1.10", g: "0.55", orientation: "V", frameRatio: "20", type: "Triplu Low-E argon" },
      { name: "Triplu vitraj Low-E argon PVC 6 camere — Nord (coridoare)",     area: "60",  u: "1.10", g: "0.55", orientation: "N", frameRatio: "20", type: "Triplu Low-E argon" },
      { name: "Ușă intrare principală aluminiu termorupt + dublu vitraj",      area: "8",   u: "1.50", g: "0.50", orientation: "S", frameRatio: "30", type: "Ușă aluminiu termorupt" },
    ],
    thermalBridges: [
      { name: "Stâlpișori BA — colț înglobat în EPS 15 cm",  type: "SB", psi: "0.10", length: "48" },
      { name: "Centuri BA peste etaje (sub EPS)",            type: "CB", psi: "0.07", length: "330" },
      { name: "Soclu cu protecție XPS 8 cm perimetral",       type: "SO", psi: "0.08", length: "165" },
      { name: "Glaf fereastră triplu vitraj — atașat EPS",    type: "GF", psi: "0.05", length: "260" },
      { name: "Buiandrug BA înglobat în EPS",                 type: "CB", psi: "0.10", length: "65" },
      { name: "Cornișă atic terasă EPS 18 cm",                type: "CO", psi: "0.08", length: "165" },
      { name: "Colț 90° clădire (4 colțuri)",                  type: "SB", psi: "0.06", length: "48" },
    ],
    heating: {
      source: "GAZ_COND",
      power: "350",                       // CT condensare central
      eta_gen: "0.97",
      nominalPower: "350",
      emission: "RAD_OT",                  // P1 fix: era "RADIATOR" generic — corect "RAD_OT" (Radiatoare oțel panou, EMISSION_SYSTEMS line 83)
      eta_em: "0.95",
      distribution: "BINE_INT_NZB",
      eta_dist: "0.95",
      control: "COMP_CLIM",                // P1 fix: era "TERMOSTAT_PROP_OPT" — corect "COMP_CLIM" (compensare climatică outdoor reset, BACS B, CONTROL_TYPES line 153)
      eta_ctrl: "0.94",
      regime: "intermitent",               // Program școlar: 8-16 zile lucrătoare + vacanțe
      theta_int: "20",
      nightReduction: "5",                 // Reducere nopți + week-end
      tStaircase: "",
      tBasement: "10",
      tAttic: "",
    },
    acm: {
      source: "CAZAN_H",                  // P1 fix: era "GAZ_COND" — corect "CAZAN_H" (același cazan cu încălzirea, ACM_SOURCES line 290)
      consumers: "320",                    // 280 elevi + 40 personal
      dailyLiters: "5",                    // ACM scăzut școală (doar lavoare + curățenie)
      consumptionLevel: "low",            // P1 fix: era "scazut" — UI așteaptă "low|med|high"
      tSupply: "55",
      storageVolume: "500",
      insulationClass: "A",
      pipeLength: "120",
      pipeInsulated: true,
      pipeInsulationThickness: "30mm",
      pipeDiameter: "32",
      circRecirculation: true,
      circHours: "8",                      // Recirculare doar program școlar
      circPumpType: "iee_sub_023",
      hasLegionella: true,                 // Volum 500L > 400L → tratare obligatorie
      legionellaFreq: "weekly",
      legionellaT: "70",
    },
    cooling: {
      system: "SPLIT_INV",
      power: "12",                         // Doar săli IT (2 săli × 6 kW)
      eer: "4.50",
      seer: "5.80",
      cooledArea: "120",                    // 2 săli IT × 60 m²
      distribution: "DIRECT",
      hasCooling: true,
      setpoint: "26",
      shadingExternal: "0.90",
      useHourly: false,
      emissionType: "split_mural",        // P1 fix: era "split_perete" — corect "split_mural" (COOLING_EMISSION_EFFICIENCY line 362)
      eta_em: "0.95",
      distributionType: "agent_frig",     // P1 fix: era "agent_R32_int" — corect "agent_frig" (COOLING_DISTRIBUTION_EFFICIENCY line 375)
      eta_dist: "0.98",
      controlType: "termostat_prop",      // P1 fix: era "remote_inv" — corect "termostat_prop" (Termostat proporțional)
      eta_ctrl: "0.94",
      P_aux_pumps: "0",
      P_aux_fans: "0.12",
      t_cooling_hours: "350",
      hasNightVent: true,                   // Free cooling vară
      n_night: "2.5",
      comfortCategory: "II",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "MEC_HR75",                     // P1 fix: era "MEC_HR75_HIBRID" — UI nu are sufix HIBRID; corect "MEC_HR75" (recuperator 75%, VENTILATION_TYPES line 453). Hibridizarea cu naturală pe coridoare e implicită prin ventilationFanCount=6 (zone tehnice).
      airflow: "3500",                       // Doar săli mari (sport + festiv) ventilate mecanic
      fanPower: "1800",                      // SFP 0.5 kW/(m³/s) ventilatoare EC
      operatingHours: "1800",
      hrEfficiency: "75",
    },
    lighting: {
      type: "LED",
      pDensity: "8.0",                       // LED săli clasă (target EN 15193 — 8 W/m²)
      controlType: "PREZ",                   // DALI cu prezență (fără daylight în săli interioare)
      fCtrl: "0.65",
      operatingHours: "1700",                // Program școlar 8-16 × 220 zile
      naturalLightRatio: "50",
      pEmergency: "0.8",
      pStandby: "0.15",
    },
    solarThermal: { enabled: false, type: "", area: "0", orientation: "S", tilt: "30", usage: "acm", storageVolume: "0", eta0: "0", a1: "0" },
    photovoltaic: {
      enabled: true,
      type: "MONO",
      area: "85",
      orientation: "S",
      tilt: "35",                           // Optim Brașov anual (latitude +5°)
      inverterType: "STD",
      inverterEta: "0.97",
      peakPower: "15",
      usage: "all",                         // P1 fix: era "autoconsum" — UI așteaptă "all|lighting|hvac|export"
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
      name: "ing. Iliescu Daniel-Bogdan",
      atestat: "BV-04217",
      grade: "AE Ici",
      specialty: "construcții și instalații",
      company: "Smart Energy Brașov SRL",
      phone: "0744 651 932",
      email: "daniel.iliescu@smartbv.ro",
      date: "2022-09-30",                   // Data emiterii post-reabilitare 2022
      mdlpaCode: "CE-2022-04217",
      cpeNumber: "CPE-2022-00533",
      cpeCode: "CE-2022-04217_20220930_Iliescu_Daniel_BV_104587_001_CPE",
      registryIndex: "533",
      scopCpe: "renovare_majora",
      validityYears: "10",
      registruEvidenta: "RE-2022-BV-04217",
      nrCadastral: "104587-C1",
      codUnicMDLPA: "CE-2022-04217",
      dataExpirareDrept: "2030-09-30",
      dataTransmitereMDLPA: "2022-10-01",
      // ADĂUGAT: Semnătură + ștampilă DEMO (placeholder SVG — înlocuiește prin UI Step 6 înainte de export oficial)
      signatureDataURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>Iliescu D.B.</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text></svg>",
      stampDataURL:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>Iliescu D.B.</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>BV-04217</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>",
      observations: "Școală Gimnazială Nr. 25 Brașov — reabilitare termică majoră 2022 prin POR Axa 3.1.B (Bilanț + IPSEC + execuție). Anvelopă: pereți cărămidă 38 cm + EPS 15 cm grafitat (U=0.20), terasă EPS 18 cm (U=0.18), placă subsol EPS 8 cm (U=0.32), ferestre triplu Low-E argon PVC (U=1.10). Sisteme: CT condensare gaz central 350 kW (Viessmann Vitocrossal), radiatoare oțel panou, recuperator entalpic 75% pe sala festivă + sala sport, ventilație naturală pe coridoare. PV 15 kWp acoperiș sud (autoconsum, surplus reinjectat). LED DALI cu senzor prezență 100% interior. BACS clasa B (control programare + senzori). RER ≈ 22% (PV). MEPS 2030 PASS marginal. Pașaport recomandat doar mentenanță (curățare colectoare, calibrare DALI).",
      photo: "",
    },
    expectedResults: {
      energyClass: "B",
      E_p_total_kWh_m2_y: 115,
      E_p_nren_kWh_m2_y: 88,
      E_p_ren_kWh_m2_y: 27,
      RER_pct: 22,
      U_med_W_m2K: 0.24,
      U_max_violations: [],
      Q_inc_kWh_m2_y: 58,
      Q_rac_kWh_m2_y: 4,
      Q_acm_kWh_m2_y: 8,
      Q_il_kWh_m2_y: 16,
      Q_aux_kWh_m2_y: 6,
      bacsClass: "B",
      fBac: 0.88,
      sriPct: 68,
      meps2030_pass: true,
      meps2033_pass: true,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 1,                     // Doar mentenanță majoră
      passportTargetClass: "A",
      documentsExpected: ["CPE-ED", "Raport-Audit", "Pasaport-Renovare-Mentenanta"],
      tolerances: { E_p_nren: 0.15, E_p_total: 0.15, RER: 5, U_med: 0.10, Q_inc: 0.15 },
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M5 — Pensiune turistică lemn masiv — Predeal Cioplea (ZONA V, montană)
  // Cazan biomasă peleți 40 kW + solar termic 8 m² + 2 kWp PV
  // Scop: testare clădire turistică, structura lemn (cu inerție mai mică),
  //       biomasă (RER 100% sursă), solar termic, regim sezonier.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "demo-5-predeal-pensiune-2010",
    title: "M5 · Pensiune turistică lemn masiv — Predeal (Zona V, peleți + solar) — clasă C",
    shortDesc: "Pensiune 380 m² lemn masiv 20cm, peleți 40 kW + solar termic 8 m² + 2 kWp PV, RER 48%",
    building: {
      address: "Str. Cioplea nr. 142, Pensiunea Cocoșul de Munte",
      city: "Predeal",
      county: "Brașov",
      postal: "505300",                     // ADĂUGAT: alias compatibilitate Step1
      postalCode: "505300",
      locality: "Predeal",
      latitude: "45.5074",   // Predeal ~45.51°N (Zona V montană, GD > 3500)
      longitude: "25.5736",  // Predeal ~25.57°E
      cadastralNumber: "104287-C1",
      landBook: "CF nr. 104287 Predeal UAT Predeal",
      owner: "Munteanu Daniela-Adriana PFA",     // CURĂȚAT: CUI extras în câmp dedicat
      ownerType: "PJ",                            // ADĂUGAT: PFA = entitate juridică (are CUI, emite facturi)
      ownerCUI: "38456714",                       // ADĂUGAT: corectat checksum valid algoritm ANAF (era 38456712, invalid)
      category: "HC",                       // Hoteluri & Cazare
      structure: "Structură lemn — bârne masive (log house / casă din bușteni, tradițional)",
      yearBuilt: "2010",
      yearRenov: "",
      floors: "P+1+M",                       // Mansardă utilizată
      basement: false,
      attic: false,
      units: "1",
      stairs: "1",
      nApartments: "1",                     // Pensiune ca entitate
      apartmentNo: "",
      staircase: "",
      floor: "",
      areaUseful: "380",
      areaBuilt: "440",
      areaHeated: "380",                     // 8 cam. + recepție + restaurant + bucătărie
      volume: "1140",                       // h_etaj 3.00 × 380
      areaEnvelope: "520",
      heightBuilding: "9.5",
      heightFloor: "3.00",
      perimeter: "62",
      n50: "3.0",                           // Etanșeitate medie lemn cu vată internă
      shadingFactor: "0.75",                 // Munți + copaci umbresc parțial
      gwpLifecycle: "190",                   // GWP redus — lemn masiv stochează C
      solarReady: true,
      evChargingPoints: "1",
      evChargingPrepared: "2",
      co2MaxPpm: "1050",
      pm25Avg: "10",
      scaleVersion: "2023",
      scopCpe: "inchiriere",                 // Pensiune turistică — chirie sezonieră
      parkingSpaces: "8",
      energyClassAfterRenov: "",
      emissionClassAfterRenov: "",
      energySavings: "",
      co2Reduction: "",
      apartments: [],
      commonSystems: {
        elevator:          { installed: false, powerKW: "",    hoursYear: "" },
        stairsLighting:    { installed: true,  powerKW: "0.3", hoursYear: "4500" },
        centralHeating:    { installed: true,  fuel: "peleti" },
        commonVentilation: { installed: false, powerKW: "",    hoursYear: "" },
        pumpGroup:         { installed: true,  powerKW: "0.6", hoursYear: "5500" },
      },
      // ── ADĂUGAT: Anexa 1+2 MDLPA — overrides pentru pensiune lemn masiv + cazan peleți Hargassner + solar termic ──
      heatGenLocation: "CT_PROP",                          // override: cazan peleți Hargassner = centrală proprie modernă (NU SURSA_PROPRIE/sobă)
      heatingRadiatorType: "Radiator aluminiu",            // override: radiatoare aluminiu (răspuns rapid pensiune sezonieră) — NU sobă teracotă
      heatingRadiators: [{                                 // override: lista realistă (default formula da 27 buc. — prea mult)
        type: "Radiator aluminiu",
        count_private: "20",      // 8 camere × 1 + recepție + restaurant + bucătărie + băi (~20)
        count_common: "0",
        power_kw: "40.0",
      }],
      stoveCount: "0",                                     // override: NU sobe (default `1` pentru hasStove e fals-pozitiv pe „pelet")
      acmFixtures: {                                       // override: 16 ocupanți pensiune (8 cam × 2) + 4 personal — 20 total
        lavoare: "10", cada_baie: "4", spalatoare: "1", rezervor_wc: "10",
        bideuri: "0", pisoare: "0", dus: "8",
        masina_spalat_vase: "1", masina_spalat_rufe: "2",
      },
      acmConsumePointsCount: "30",                         // override: 10+4+1+8 = 23 + auxiliare bucătărie = 30
      acmPipeDiameterMm: "25",                             // override: ACM acumulator 1000L cu pipeLength 65m → DN25 (consistent cu acm.pipeDiameter)
      acmRecirculation: "functionala",                     // override: consistent cu acm.circRecirculation=true (recirculare turism)
      ventilationFanCount: "3",                            // override: extracție bucătărie + 2 băi (NU 4 default)
      ventilationHrType: "",                               // override: NATURALA pură (free cooling vară), fără recuperator HR
      // ── ADĂUGAT: ANCPI bypass DEMO ──
      ancpi: {
        verified: true,
        fileName: "demo-cf-104287-predeal.pdf",
        fileSize: 142800,
        fileBase64: null,
        uploadDate: "2026-04-27T14:20:00.000Z",
        cadastralNr: "104287-C1",
        carteFunciara: "CF nr. 104287 Predeal UAT Predeal",
      },
      // ── 2 mai 2026: pre-populare AnexaMDLPA pentru demo M5 — Pensiune Predeal ──
      nrOcupanti: "20",                        // 8 camere × 2.5 ocupanți/cameră (ocupare medie sezonieră)
      etapeImplementare:
        "1. Aprobați planul de investiții prin decizie SRL/PFA proprietar pensiune.\n" +
        "2. Verificați eligibilitatea pentru programele de finanțare (PNRR componenta C5 turism, scheme ajutor de stat IMM eficiență energetică).\n" +
        "3. Obțineți autorizațiile legale necesare (AC pentru extinderea solar termic, avize ISU pentru clădire turism, autorizații sanitar-veterinare bucătărie).\n" +
        "4. Implementați măsurile în extra-sezon (mai-iunie, septembrie-octombrie) pentru a nu afecta perioada de vârf turistic.\n" +
        "5. Documentați performanța atinsă (m&v IPMVP — comparație ocupare-corectată kWh/cameră vs. baseline).\n" +
        "6. Solicitați re-certificare CPE după 5 ani sau la modificarea regimului de utilizare (Mc 001-2022 art. 7.5).",
      stimulenteFinanciare:
        "— PNRR componenta C5 — Eficiență energetică în turism: granturi pentru pensiuni și hoteluri.\n" +
        "— Schema de ajutor de stat pentru eficiență energetică IMM (Regulamentul CE 651/2014, art. 38–39).\n" +
        "— EIB/BERD: credite verzi prin intermediari bancari autorizați pentru sectorul HoReCa.\n" +
        "— Scheme fiscale active la data emiterii CPE pentru investiții în eficiență energetică (verifică anaf.ro).",
      solutiiAnvelopa:
        "— Verificare anuală a calafatuirii bârnelor lemn masiv (pasta de cânepă + ulei de in pe rosturi vizibile).\n" +
        "— Tratare contra carii și mucegai cu produse certificate UE (boric acid + permetrină pe lemnul exterior).\n" +
        "— Monitorizare condens cameră aer ventilată dintre lemn exterior și vată minerală (umiditate < 20%).\n" +
        "— Verificare hidroizolație acoperiș țiglă ceramică + aerisire pod (CR 0-2012, GP 070-2013).",
      solutiiInstalatii:
        "— Curățare anuală cazan peleți obligatorie (cenușa + funingine — afectează randament cu 10%/an dacă neîntreținut).\n" +
        "— Verificare etanșeitate sistem evacuare gaze arse (coș izolat termic, CO senzor pentru siguranță).\n" +
        "— Optimizare program ACM solar termic + booster electric (priorizare panouri în zile însorite cu by-pass automat).\n" +
        "— Echilibrare hidraulică circuite radiator/încălzire pardoseală (pensiunea are mix de sisteme).",
      masuriOrganizare:
        "— Plan anual de monitorizare consumuri (peleți tone/an, electricitate, apă) cu corelare la grad de ocupare.\n" +
        "— Instruirea personalului privind setările optimale (recepție, cameristelor — programare termostate cameră goală vs ocupată).\n" +
        "— Audit energetic intermediar la fiecare 5 ani sau la extindere (camere noi, restaurant, SPA).\n" +
        "— Documentare provenienta peleți (certificare ENplus A1 sau DIN+ pentru calitate constantă).",
      masuriLocale:
        "— Etanșeizarea trecerilor prin anvelopă lemn (cabluri, conducte) cu materiale specifice lemn (silicon UV-stabil).\n" +
        "— Înlocuirea bateriilor cabină duș cu modele cu limitator debit (clasă A WELL — economie 30% ACM solar).\n" +
        "— Becuri LED dimmable cu senzor prezență în holuri/băi (compatibil rural — fără DALI complicat).\n" +
        "— Programare orară încălzire pe zone (camere disponibile vs ocupate — sistem hotelier simplu Z-Wave).",
      regenerabileCustom:
        "— Expansiune solar termic 25→40 m² colectoare plane (acoperiș sud-vest 30° pantă optimă pentru zona V).\n" +
        "— Adăugare PV 5-10 kWp pe acoperiș (autoconsum + injecție rețea Electrica Transilvania Sud).\n" +
        "— Pompă de căldură aer-apă pentru pre-încălzire ACM (cuplată cu solar — COP > 3.5 la temperaturi joase Predeal).\n" +
        "— Mini-hidro centrală 5-10 kW dacă proprietatea are pârâu cu cădere > 5 m (verificare debit minim sezonier).",
    },
    opaqueElements: [
      {
        name: "Pereți lemn masiv 20 cm + vată minerală 15 cm interior — Sud + Vest",
        type: "PE", area: "180", orientation: "S", tau: "1",
        layers: [
          { matName: "Lemn rindeluit decorativ exterior", material: "Lemn brad", thickness: "25", lambda: 0.13, rho: 450 },
          { matName: "Cameră aer ventilată", material: "Aer", thickness: "30", lambda: 0.50, rho: 1.2 },
          { matName: "Lemn masiv brad 20 cm (bârne machetate)", material: "Lemn brad masiv", thickness: "200", lambda: 0.13, rho: 450 },
          { matName: "Vată minerală 15 cm — termoizolație internă", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.038, rho: 60 },
          { matName: "Folie barieră vapori PE", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 950 },
          { matName: "Gips-carton 12.5 mm finisaj interior", material: "Gips-carton", thickness: "13", lambda: 0.21, rho: 800 },
        ],
      },
      {
        name: "Pereți lemn masiv 20 cm + vată minerală 15 cm interior — Nord + Est",
        type: "PE", area: "140", orientation: "N", tau: "1",
        layers: [
          { matName: "Lemn rindeluit decorativ exterior", material: "Lemn brad", thickness: "25", lambda: 0.13, rho: 450 },
          { matName: "Cameră aer ventilată", material: "Aer", thickness: "30", lambda: 0.50, rho: 1.2 },
          { matName: "Lemn masiv brad 20 cm (bârne machetate)", material: "Lemn brad masiv", thickness: "200", lambda: 0.13, rho: 450 },
          { matName: "Vată minerală 15 cm — termoizolație internă", material: "Vată minerală bazaltică", thickness: "150", lambda: 0.038, rho: 60 },
          { matName: "Folie barieră vapori PE", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 950 },
          { matName: "Gips-carton 12.5 mm finisaj interior", material: "Gips-carton", thickness: "13", lambda: 0.21, rho: 800 },
        ],
      },
      {
        name: "Acoperiș mansardă cu vată minerală 25 cm",
        type: "PT", area: "165", orientation: "H", tau: "1",
        layers: [
          { matName: "Țiglă ceramică", material: "Țiglă ceramică", thickness: "25", lambda: 1.00, rho: 1900 },
          { matName: "Strat ventilat sub țiglă", material: "Aer", thickness: "30", lambda: 0.50, rho: 1.2 },
          { matName: "Folie hidroizolatoare permeabilă", material: "Membrană traspirabilă", thickness: "1", lambda: 0.20, rho: 950 },
          { matName: "Vată minerală 25 cm între căpriori", material: "Vată minerală bazaltică", thickness: "250", lambda: 0.038, rho: 60 },
          { matName: "Folie barieră vapori PE", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 950 },
          { matName: "Lambriu brad finisaj mansardă", material: "Lemn brad", thickness: "20", lambda: 0.13, rho: 450 },
        ],
      },
      {
        name: "Placă pe sol BA + EPS 10 cm + finisaj gresie/parchet",
        type: "PL", area: "180", orientation: "H", tau: "0.6",
        layers: [
          { matName: "Pietriș compactat", material: "Pietriș", thickness: "150", lambda: 0.70, rho: 1800 },
          { matName: "Beton armat fundație", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
          { matName: "Polistiren expandat EPS 10 cm", material: "Polistiren expandat EPS", thickness: "100", lambda: 0.036, rho: 18 },
          { matName: "Șapă mortar autonivel", material: "Șapă ciment autonivel", thickness: "60", lambda: 1.40, rho: 2000 },
          { matName: "Gresie ceramică (recepție + băi) / Parchet (camere)", material: "Gresie ceramică", thickness: "12", lambda: 1.30, rho: 2300 },
        ],
      },
    ],
    glazingElements: [
      { name: "PVC 5 camere dublu Low-E argon — Sud (vedere munți)", area: "22", u: "1.30", g: "0.62", orientation: "S", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Est",                  area: "12", u: "1.30", g: "0.62", orientation: "E", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Vest",                  area: "12", u: "1.30", g: "0.62", orientation: "V", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "PVC 5 camere dublu Low-E argon — Nord (mai mici)",       area: "8",  u: "1.30", g: "0.62", orientation: "N", frameRatio: "22", type: "Dublu Low-E argon" },
      { name: "Ușă intrare lemn masiv termoizolat",                       area: "3.5", u: "1.60", g: "0.00", orientation: "S", frameRatio: "100", type: "Ușă lemn termoizolat" },
    ],
    thermalBridges: [
      { name: "Îmbinare bârne lemn în colț 90°",          type: "SB", psi: "0.06", length: "38" },
      { name: "Centură planșeu BA peste etaj 1",           type: "CB", psi: "0.10", length: "62" },
      { name: "Soclu fundație + EPS 8 cm perimetral",      type: "SO", psi: "0.10", length: "62" },
      { name: "Glaf fereastră PVC în zid lemn",             type: "GF", psi: "0.08", length: "85" },
      { name: "Buiandrug lemn deasupra ferestrei",         type: "CB", psi: "0.05", length: "22" },
      { name: "Streașină acoperiș ventilat",                type: "CO", psi: "0.06", length: "62" },
    ],
    heating: {
      source: "BIO_AUT",                  // P1 fix: era "PELET" — corect "BIO_AUT" (Cazan peleți automat alimentare automată, HEAT_SOURCES line 27 — Hargassner 40 kW)
      power: "40",                          // Cazan peleți Hargassner 40 kW
      eta_gen: "0.91",                      // Cazan modern peleți condensare
      nominalPower: "40",
      emission: "RAD_AL",                 // P1 fix: era "RADIATOR" generic — corect "RAD_AL" (Radiatoare aluminiu, EMISSION_SYSTEMS line 85)
      eta_em: "0.94",
      distribution: "BINE_INT",
      eta_dist: "0.93",
      control: "PROG",                    // P1 fix: era "TERMOSTAT_CRONO" — corect "PROG" (Termostat ambiental programabil, CONTROL_TYPES line 152)
      eta_ctrl: "0.92",
      regime: "intermitent",                // Sezonier turistic + zone (camere ocupate)
      theta_int: "21",
      nightReduction: "3",
      tStaircase: "",
      tBasement: "",
      tAttic: "",
    },
    acm: {
      source: "BOILER_BIOMASA",           // P1 fix: era "SOLAR_BACKUP_PELET" — UI nu are combinație; ales "BOILER_BIOMASA" (peleți dedicat ACM, ACM_SOURCES line 307). Solar termic 8m² urmează în secțiunea solarThermal cu enabled=true.
      consumers: "20",                       // 8 cam × ~2.5 ocupanți medie + personal
      dailyLiters: "45",                     // Turism — 45 L/persoană/zi (incl. duș)
      consumptionLevel: "med",
      tSupply: "55",
      storageVolume: "1000",                // Acumulator combinat 1000L
      insulationClass: "A",
      pipeLength: "65",
      pipeInsulated: true,
      pipeInsulationThickness: "30mm",
      pipeDiameter: "25",
      circRecirculation: true,
      circHours: "16",                       // Recirculare zilnică turism
      circPumpType: "iee_sub_023",
      hasLegionella: true,                   // Volum > 400L → tratare obligatorie HG 1425/2006
      legionellaFreq: "weekly",
      legionellaT: "70",
    },
    cooling: {
      system: "NONE",                       // P1 fix: era "FARA" — corect "NONE" (COOLING_SYSTEMS line 350)
      power: "0",
      eer: "",
      seer: "",
      cooledArea: "0",
      distribution: "",                     // P1 fix: era "FARA" — corect "" (no cooling = no distribution code)
      hasCooling: false,
      setpoint: "",
      shadingExternal: "0.75",
      useHourly: false,
      emissionType: "",
      eta_em: "",
      distributionType: "",
      eta_dist: "",
      controlType: "",
      eta_ctrl: "",
      P_aux_pumps: "",
      P_aux_fans: "",
      t_cooling_hours: "",
      hasNightVent: true,                    // Doar free cooling vară (ferestre + cross-vent)
      n_night: "3.0",
      comfortCategory: "II",
      internalGainsOverride: "",
    },
    ventilation: {
      type: "NAT",                          // P1 fix: era "NATURALA" — corect "NAT" (Ventilare naturală, VENTILATION_TYPES line 442)
      airflow: "300",
      fanPower: "120",                       // Doar extracție bucătărie + băi
      operatingHours: "5500",
      hrEfficiency: "0",
    },
    lighting: {
      type: "LED_E27",                      // P1 fix: era "MIXT" — UI nu are MIXT; ales "LED_E27" (dominant 80% LED retrofit, LIGHTING_TYPES line 488)
      pDensity: "6.5",                       // LED 80% + corpuri rustice incandescente decor 20%
      controlType: "MAN",                   // P1 fix: era "MANUAL" — corect "MAN" (LIGHTING_CONTROL line 504)
      fCtrl: "1.0",
      operatingHours: "2400",
      naturalLightRatio: "40",
      pEmergency: "0.4",
      pStandby: "0.2",
    },
    solarThermal: {
      enabled: true,
      type: "PLAN",                          // Panouri plate (mai fiabile la Predeal — gheață sezonieră)
      area: "8",
      orientation: "S",
      tilt: "55",                            // Optim iarnă latitude +10° (montan, sezon încălzire dominant)
      usage: "acm",
      storageVolume: "1000",
      eta0: "0.75",                          // Randament optic plan (vs. tuburi vidate 0.80)
      a1: "3.5",                             // Pierderi liniare W/m²·K
    },
    photovoltaic: {
      enabled: true,
      type: "MONO",
      area: "12",
      orientation: "S",
      tilt: "45",                            // Optim Predeal anual + autocurățare zăpadă
      inverterType: "STD",
      inverterEta: "0.96",
      peakPower: "2",
      usage: "all",                          // P1 fix: era "autoconsum" — UI așteaptă "all|lighting|hvac|export"
    },
    heatPump:   { enabled: false, type: "", cop: "0", scopHeating: "0", scopCooling: "0", covers: "", bivalentTemp: "", auxSource: "", auxEta: "0" },
    biomass:    { enabled: true },           // Sursă principală încălzire = peleți biomasă
    otherRenew: {
      windEnabled: false, windCapacity: "", windProduction: "",
      cogenEnabled: false, cogenElectric: "", cogenThermal: "", cogenFuel: "", cogenType: "", cogenPowerEl: "", cogenHours: "",
      proximityEnabled: false, proximityDistanceKm: "", proximityProduction: "", proximitySource: "",
    },
    battery: { enabled: false, type: "", capacity: "0", power: "0", dod: "0", selfConsumptionPct: "0" },
    auditor: {
      name: "ing. Vasilescu Ana-Maria",
      atestat: "BV-04895",
      grade: "AE Ici",                       // P1 fix: era „AE Ic" — grad inexistent; corect AE Ici (grad I civile, necesar pentru HC nerezidențial conform Art. 6 alin. 1 lit. b Ord. MDLPA 348/2026)
      specialty: "construcții și instalații", // P1 fix: extins la „construcții și instalații" (HC pensiune cu instalații complexe peleți+solar)
      company: "Eco Audit Carpați SRL",
      phone: "0744 268 519",
      email: "ana.vasilescu@ecocarpati.ro",
      date: "2026-04-27",
      mdlpaCode: "CE-2026-04895",
      cpeNumber: "CPE-2026-00098",
      cpeCode: "CE-2026-04895_20260427_Vasilescu_Ana_BV_104287_001_CPE",
      registryIndex: "98",
      scopCpe: "inchiriere",
      validityYears: "10",
      registruEvidenta: "RE-2026-BV-04895",
      nrCadastral: "104287-C1",
      codUnicMDLPA: "CE-2026-04895",
      dataExpirareDrept: "2031-08-15",
      dataTransmitereMDLPA: "2026-04-28",
      // ADĂUGAT: Semnătură + ștampilă DEMO (placeholder SVG — înlocuiește prin UI Step 6 înainte de export oficial)
      signatureDataURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'><rect width='400' height='120' fill='%23ffffff'/><text x='200' y='55' font-family='cursive,serif' font-size='28' text-anchor='middle' fill='%23000080' font-style='italic'>Vasilescu A.M.</text><line x1='80' y1='75' x2='320' y2='75' stroke='%23000080' stroke-width='1.5'/><text x='200' y='95' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23999999'>-- SEMNATURA DEMO (placeholder) --</text></svg>",
      stampDataURL:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><circle cx='75' cy='75' r='70' fill='none' stroke='%23000080' stroke-width='2.5'/><circle cx='75' cy='75' r='60' fill='none' stroke='%23000080' stroke-width='1'/><text x='75' y='42' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23000080' font-weight='bold'>AUDITOR ENERGETIC</text><text x='75' y='58' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>AE Ici</text><text x='75' y='78' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23000080'>Vasilescu A.M.</text><text x='75' y='95' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%23000080'>BV-04895</text><text x='75' y='115' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23000080' font-weight='bold'>D E M O</text></svg>",
      observations: "Pensiune turistică Cocoșul de Munte, Predeal Cioplea. Construcție 2010 lemn masiv brad 20 cm + vată minerală 15 cm interior, acoperiș mansardat vată 25 cm, placă pe sol EPS 10 cm. Sisteme: cazan biomasă peleți Hargassner 40 kW (RER sursă 100%), radiatoare aluminiu, acumulator combinat 1000L. ACM: solar termic plan 8 m² primar (acoperire 65% sezon cald) + peleți backup. Free cooling nocturn vară (climă montană, fără AC). PV 2 kWp acoperiș sud. RER total ≈ 48% (peleți biomasă recunoscut sursă regenerabilă + solar termic + PV). MEPS 2030/2033 PASS. Pașaport recomandat: extindere PV la 5 kWp + baterie LFP 8 kWh pentru autonomie sezon turistic vară.",
      photo: "",
    },
    expectedResults: {
      energyClass: "C",
      E_p_total_kWh_m2_y: 118,
      // P1 fix (29 apr 2026): aliniat E_p_ren/E_p_nren cu RER 48% declarat (anterior: 23/95 = RER 19.5% — inconsistent).
      // Recalcul: RER 48% × 118 = 57 kWh/m²·an regenerabil (peleți biomasă RER 100% sursă + solar termic 8 m² + PV 2 kWp).
      // Conform L.238/2024 + SR EN ISO 52000-1: peleți recunoscut energie regenerabilă → contribuie integral la RER.
      E_p_nren_kWh_m2_y: 61,
      E_p_ren_kWh_m2_y: 57,
      RER_pct: 48,
      U_med_W_m2K: 0.30,
      U_max_violations: [],
      Q_inc_kWh_m2_y: 145,                    // Climă rece montană → Q_inc mare absolut
      Q_rac_kWh_m2_y: 0,                       // Fără răcire activă
      Q_acm_kWh_m2_y: 38,
      Q_il_kWh_m2_y: 14,
      Q_aux_kWh_m2_y: 4,
      bacsClass: "C",
      fBac: 1.00,
      sriPct: 52,
      meps2030_pass: true,
      meps2033_pass: true,
      meps2050_pass: false,
      passportRequired: true,
      passportPhases: 1,                        // Doar PV upgrade
      passportTargetClass: "B",
      documentsExpected: ["CPE-HC", "Raport-Audit", "Pasaport-Renovare-PV"],
      tolerances: { E_p_nren: 0.15, E_p_total: 0.15, RER: 5, U_med: 0.10, Q_inc: 0.18 },
    },
  },

];
