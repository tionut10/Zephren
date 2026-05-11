// ═══════════════════════════════════════════════════════════════
// INITIAL STATE — Valori implicite pentru toate secțiunile formularului
// Extras din energy-calc.jsx (Faza 4 refactoring)
// ═══════════════════════════════════════════════════════════════

// ─── STEP 1: IDENTIFICARE ───
export const INITIAL_BUILDING = {
  address:"", city:"", county:"", postal:"",
  category:"RI", structure:"Zidărie portantă",
  yearBuilt:"", yearRenov:"",
  floors:"P", basement:false, attic:false,
  units:"1", stairs:"1",
  areaUseful:"", volume:"", areaEnvelope:"",
  heightBuilding:"", heightFloor:"2.80",
  locality:"",
  perimeter:"", n50:"4.0", shadingFactor:"0.90",
  gwpLifecycle:"", solarReady:false,
  scopCpe:"vanzare", parkingSpaces:"0",
  // Coordonate geografice — Anexa 6, Ord. MDLPA 348/2026
  latitude:"",   // grad zecimal WGS84, ex: "44.4268"
  longitude:"",  // grad zecimal WGS84, ex: "26.1025"
  // Date proprietar/administrator — Anexa 6, col. G
  owner:"",
  // ── Sprint 15 (18 apr 2026) — Identificare juridică Ord. MDLPA 16/2023 Anexa 1 ──
  cadastralNumber:"",    // Nr. cadastral ANCPI (ex: "123456-A")
  landBook:"",           // Carte Funciară (ex: "CF nr. 123456 București Sect. 3")
  areaBuilt:"",          // Suprafață construită desfășurată Acd [m²] — distinct de areaUseful
  areaHeated:"",         // Suprafață încălzită efectivă [m²] — poate diferi de Au
  nApartments:"1",       // Număr apartamente (pentru bloc / RC / RA)
  apartmentNo:"",        // Număr apartament individual (pentru RA)
  staircase:"",          // Scara (ex: "A", "B")
  floor:"",              // Etaj (pentru apartament)
  // ── Sprint 11 mai 2026 (TODO CLAUDE C3) — Poziție apartament în bloc ──
  // Folosit de motorul de recomandări Pas 7 (cpe-recommendations.js) pentru
  // a filtra măsuri fizic imposibile la un apartament dat:
  //   - "parter"     → fără placă pe sol propriu / fără terasă
  //   - "intermediar"→ fără placă pe sol propriu, fără terasă proprie
  //   - "ultim_etaj" → fără placă pe sol propriu, ARE terasă
  //   - "parter_ultim" → ARE placă pe sol + terasă (apartament parter-ultim
  //                       într-un bloc cu un singur etaj sau parter+1)
  positionInBlock:"",    // "parter" | "intermediar" | "ultim_etaj" | "parter_ultim" | ""
  // ── Sprint 15 — EPBD 2024 indicatori noi ──
  evChargingPoints:"0",  // Nr. puncte de încărcare EV instalate (EPBD 2024 Art. 14)
  evChargingPrepared:"0", // Nr. locuri parcare pregătite EV (precablare) — L.238/2024
  co2MaxPpm:"",          // CO₂ indoor (ppm) — IAQ (EN 16798-1)
  pm25Avg:"",            // PM2.5 (μg/m³) — IAQ (WHO 2021)
  scaleVersion:"2023",   // "2023" = A+..G actual | "2030_zeb" = rescalare ZEB=A (EPBD 2030)
  // Date post-renovare — Anexa 6, col. P-S (dacă e cazul)
  energyClassAfterRenov:"",      // clasa energetică după renovare (A+..G)
  emissionClassAfterRenov:"",    // clasa emisii după renovare (A+..G)
  energySavings:"",              // economii energie realizate (kWh/m²·an)
  co2Reduction:"",               // reducere emisii CO₂ (kgCO₂/m²·an)
  // ── Sprint 16 (18 apr 2026) — Multi-apartament pentru Anexa 2 (bloc) ──
  // Activ doar pentru category ∈ {RC, RA} (bloc rezidențial) sau BC (bloc cu spații mixte).
  apartments: [],                // array de { id, number, staircase, floor, areaUseful, orientation[], occupants, corner, topFloor, allocatedCommonPct, internalEP }
  commonSystems: {               // sisteme comune clădire (pentru alocare consum comun)
    elevator:          { installed: false, powerKW: "", hoursYear: "3500" },
    stairsLighting:    { installed: false, powerKW: "", hoursYear: "8760" },
    centralHeating:    { installed: false, fuel: "gaz_cond" },  // sursă centralizată bloc
    commonVentilation: { installed: false, powerKW: "", hoursYear: "8760" },
    pumpGroup:         { installed: false, powerKW: "", hoursYear: "8760" },  // grup pompe ACM/recirculare
  },
  // ── Sprint monolith (20 apr 2026) — Extinderi Anexa 1+2 MDLPA complete ──
  // Date necesare pentru completarea automată a tuturor tabelelor și câmpurilor
  // din Anexa 1+2 conform Ord. MDLPA 16/2023 (nu se setează implicit — auditor)
  heatGenLocation: "",            // "CT_PROP" (centrala proprie în clădire) | "CT_EXT" (centrala exterior) | "TERMOFICARE" | "SURSA_PROPRIE"
  heatingOtherSource: "",         // text liber pentru "Altă sursă sau sursă mixtă (precizați)"
  heatingRadiatorType: "",        // Tip corp static dominant: "Radiator oțel" / "Radiator fontă" / "Convector" / "Fan-coil" / "Alte"
  heatingRadiators: [],           // listă { type, count_private, count_common, power_kw } per tip corp static
  heatingHasMeter: "",            // "da" / "nu" / "nu_caz" (contor de căldură)
  heatingCostAllocator: "",       // "da" / "nu" / "nu_caz" (repartitoare costuri)
  heatingPipeDiameterMm: "",      // Diametru nominal racord centralizat [mm]
  heatingPipePressureMca: "",     // Presiune disponibilă racord centralizat [mCA]
  stoveCount: "",                 // Număr sobe (pentru încălzire locală)
  unheatedSpaces: [],             // listă { code, diameter_mm, length_m } pentru conducte în spații neîncălzite
  buildingHasDisconnectedApartments: "", // "da" / "nu" (pentru RC/RA/BC)
  // ACM
  acmFixtures: {                  // obiecte sanitare pe tipuri
    lavoare: "",
    cada_baie: "",
    spalatoare: "",
    rezervor_wc: "",
    bideuri: "",
    pisoare: "",
    dus: "",
    masina_spalat_vase: "",
    masina_spalat_rufe: "",
  },
  acmConsumePointsCount: "",      // Număr total puncte consum ACM
  acmPipeDiameterMm: "",          // Diametru nominal racord ACM [mm]
  acmInstantPowerKw: "",          // Putere boiler instant [kW]
  acmHasMeter: "",                // "da" / "nu" / "nu_caz"
  acmFlowMeters: "",              // "peste_tot" / "partial" / "nu_exista"
  acmRecirculation: "",           // "functionala" / "nu_functioneaza" / "nu_exista"
  // Răcire/climatizare
  coolingRefrigerant: "",         // cod agent frigorific (R32, R410A, R290 etc.)
  coolingDehumPowerKw: "",        // Necesar frig dezumidificare [kW]
  coolingIndoorUnits: "",         // Număr unități interioare (split)
  coolingOutdoorUnits: "",        // Număr unități exterioare (split)
  coolingPipeDiameterMm: "",      // Diametru nominal conducte răcire [mm]
  coolingSpaceScope: "",          // "complet" / "global" / "partial"
  coolingHumidityControl: "",     // "fara" / "cu_control" / "cu_partial"
  coolingIndividualMeter: "",     // "da" / "nu"
  // Ventilare
  ventilationFanCount: "",        // Număr total ventilatoare
  ventilationHrType: "",          // Tip recuperator ("rotativ" / "cu plăci" / "dublu flux" etc.)
  ventilationControlType: "",     // "program" / "manual_simpla" / "temporizare" / "jaluzele_reglate"
  // Iluminat
  lightingNetworkState: "",       // "buna" (default) / "uzata" / "indisp"
  lightingOtherType: "",          // Text liber pentru Mixt (precizați)
  // Umidificare (opțional)
  humidificationPowerKw: "",      // Necesar umidificare [kW]
  // Eoliene
  windCentralsCount: "",          // Număr centrale eoliene
  windPowerKw: "",                // Putere nominală [kW]
  windHubHeightM: "",             // Înălțime ax rotor [m]
  windRotorDiameterM: "",         // Diametru rotor [m]
  // ── Sprint D Task 1 (27 apr 2026) — Verificare cadastrală manuală auditor ──
  // ANCPI nu oferă API public pentru SaaS comercial; auditorul confirmă manual
  // că a verificat extrasul CF la OCPI. Flag-ul `verified=true` deblochează
  // exportul DOCX CPE oficial în Step 6 (blocaj hard).
  ancpi: {
    verified: false,              // checkbox „am verificat manual"
    fileName: null,               // nume fișier PDF extras CF încărcat
    fileSize: null,               // mărime în bytes
    fileBase64: null,              // conținut PDF (max 2 MB) — stocaj local browser
    uploadDate: null,              // ISO timestamp upload
    cadastralNr: "",               // sincronizat cu building.cadastralNumber
    carteFunciara: "",             // sincronizat cu building.landBook
  },
};

// ─── STEP 3: INSTALAȚII ───
export const INITIAL_HEATING = {
  source:"GAZ_COND", power:"", eta_gen:"0.97",
  emission:"RAD_OT", eta_em:"0.93",
  distribution:"BINE_INT", eta_dist:"0.95",
  control:"TERMO_RAD", eta_ctrl:"0.93",
  regime:"intermitent", theta_int:"20", nightReduction:"4",
  tStaircase:"15", tBasement:"10", tAttic:"5",
};

export const INITIAL_ACM = {
  source:"CAZAN_H", consumers:"", dailyLiters:"60",
  consumptionLevel:"med",        // low / med / high — Mc 001 Tab.10 + GEx
  tSupply:"55",                  // temperatură setată boiler [°C] — min 60 pentru Legionella boilere >400L
  storageVolume:"",              // Sprint 4a: storageLoss eliminat — calcul automat EN 50440 din insulationClass + volum
  insulationClass:"B",           // A / B / C — clasa ErP boiler (EN 50440)
  pipeLength:"", pipeInsulated:true,
  pipeInsulationThickness:"20mm", // fara / 20mm / 30mm / 50mm — EN 15316-3 Tab.7
  pipeDiameter:"22",             // mm — diametru nominal conductă
  circRecirculation:false, circHours:"",
  circPumpType:"standard",       // veche_neregulata / standard / variabila / iee_sub_023 — EN 15316-3 Tab.10
  // Legionella — HG 1425/2006 + Ord. MS 1002/2015 + VDI 6023 (Sprint 3)
  hasLegionella:false,           // tratament termic periodic activ
  legionellaFreq:"weekly",       // weekly / daily / none
  legionellaT:"70",              // temperatură șoc termic [°C]
};

export const INITIAL_COOLING = {
  system:"NONE", power:"", eer:"",
  cooledArea:"", distribution:"BINE_INT",
  hasCooling:false,
  // Sprint 3a (17 apr 2026) — EN 14825 + EN 15316-2 + EN 16798-9
  seer:"",                          // SEER sezonier — gol → EER_nominal × 1.8 (fallback grosier)
  setpoint:"26",                    // °C setpoint răcire (EN 16798-1 cat. II)
  shadingExternal:"0.70",           // factor umbrire externă global (0–1)
  useHourly:true,                   // true → calc orar cooling-hourly.js (precizie); false → lunar ISO 13790
  emissionType:"fan_coil",          // cheie COOLING_EMISSION_EFFICIENCY
  eta_em:"0.97",                    // η emisie răcire
  distributionType:"apa_rece_izolat_int",
  eta_dist:"0.95",                  // η distribuție răcire
  controlType:"termostat_prop",
  eta_ctrl:"0.96",                  // η control răcire
  // Sprint 3b (17 apr 2026) — auxiliare electrice răcire (EN 15316-4-2)
  P_aux_pumps:"",                   // kW pompe circuit apă rece (chiller apă / PC reversibilă hidronică)
  P_aux_fans:"",                    // kW ventilatoare fan-coil / ventilator condensator (chiller aer)
  t_cooling_hours:"",               // ore operare răcire anual — gol → default pe zonă climatică
  // Sprint 3b — free cooling nocturn (EN 16798-9 + EN ISO 13790 §12.2)
  hasNightVent:false,               // checkbox activare ventilație nocturnă
  n_night:"2.0",                    // h⁻¹ — rată schimb aer nocturn (tipic 1.5–3.0)
  comfortCategory:"II",             // I / II / III / IV — EN 16798-1 (ΔT_min fezabilitate)
  // Sprint 3b — override tipologie aporturi (implicit: mapCategoryToGains din category)
  internalGainsOverride:"",         // "" = auto, altfel: office/retail/residential/school/hospital
};

export const INITIAL_VENTILATION = {
  type:"NAT", airflow:"", fanPower:"",
  operatingHours:"", hrEfficiency:"",
};

export const INITIAL_LIGHTING = {
  type:"LED", pDensity:"4.5", controlType:"MAN",
  fCtrl:"1.00", operatingHours:"", naturalLightRatio:"30",
  // Sprint 2 (17 apr 2026) — W_P (energie parazită) EN 15193-1 Annex B
  // gol → default categorie: rezidențial 0, altele 1.0 W/m² urgență + 0.3 W/m² standby
  pEmergency:"", pStandby:"",
};

// ─── STEP 4: REGENERABILE ───
export const INITIAL_SOLAR_TH = {
  enabled:false, type:"PLAN", area:"", orientation:"S", tilt:"35",
  usage:"acm", storageVolume:"", eta0:"0.75", a1:"3.5",
};

export const INITIAL_PV = {
  enabled:false, type:"MONO", area:"", peakPower:"",
  orientation:"S", tilt:"30", inverterType:"STD",
  inverterEta:"0.95", usage:"all",
};

export const INITIAL_HP = {
  enabled:false, type:"PC_AA", cop:"3.50", scopHeating:"3.00",
  scopCooling:"", covers:"heating_acm", bivalentTemp:"-5",
  auxSource:"GAZ_COND", auxEta:"0.97",
};

export const INITIAL_BIO = {
  enabled:false, type:"PELETI", boilerEta:"0.88", power:"",
  covers:"heating", annualConsumption:"",
};

export const INITIAL_OTHER = {
  windEnabled:false, windCapacity:"", windProduction:"",
  // Cogenerare — Sprint 6: extensie pentru calcCHP() detaliat (PES, CO₂, payback)
  cogenEnabled:false, cogenElectric:"", cogenThermal:"", cogenFuel:"gaz",
  cogenType:"mini_ice", cogenPowerEl:"", cogenHours:"5000",
  // L.238/2024 Art.6 — Proximitate 30 km GPS (Sprint 6)
  // Regenerabile produse în rază ≤30 km GPS de clădire contează la RER total (dar nu la on-site)
  proximityEnabled:false, proximityDistanceKm:"", proximityProduction:"", proximitySource:"solar",
};

export const INITIAL_BATTERY = {
  enabled:false, type:"LFP", capacity:"", power:"", dod:"0.90",
  selfConsumptionPct:"80",
};

// ─── STEP 6: AUDITOR ───
export const INITIAL_AUDITOR = {
  name:"", atestat:"", grade:"AE Ici", company:"",
  phone:"", email:"", date: new Date().toISOString().slice(0,10),
  mdlpaCode:"", observations:"", photo:"",
  scopCpe:"vanzare",
  validityYears:"10",
  registruEvidenta:"",
  nrCadastral:"",
  codUnicMDLPA:"",
  // Câmpuri specifice Registrului de Evidență (Anexa 6, Ord. MDLPA 348/2026)
  specialty:"construcții și instalații",  // specialitate: "construcții" / "instalații" / "construcții și instalații"
  dataExpirareDrept:"",                    // data expirării dreptului de practică (ISO: YYYY-MM-DD)
  dataTransmitereMDLPA:"",                 // data transmiterii informațiilor în baza de date MDLPA (ISO)
  cpeNumber:"",                            // nr. înregistrare CPE (ex: "CPE-12345")
  // Sprint 14 — cod unic CPE generat (format Ord. MDLPA 16/2023 + L.238/2024)
  cpeCode:"",                              // codul unic final: {mdlpa}_{data}_{Nume}_{Prenume}_{serie}_{nr}_{idx}_CPE_{hash8}
  registryIndex:"1",                       // index în registrul local al auditorului (incremental)
  nrMDLPA:"",                              // numărul de înregistrare național MDLPA (completat după upload pe portal)
  // Sprint 15 — Semnătură + ștampilă auditor (PNG dataURL cu transparență, max ~300KB)
  signatureDataURL:"",                     // dataURL PNG semnătură (dimensiune optimă 400x150)
  stampDataURL:"",                         // dataURL PNG ștampilă (dimensiune optimă 150x150)
};
