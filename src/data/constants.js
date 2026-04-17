// ===============================================================
// CONSTANTE INSTALAȚII — Cap. 3 Mc 001-2022
// Liste complete pentru toate categoriile de echipamente
// ===============================================================

export const HEAT_SOURCES = [
  // ── CAZANE PE GAZ NATURAL ──────────────────────────────────────────────
  { id:"GAZ_STD",      label:"Cazan gaz natural - standard (atmosferic)",          fuel:"gaz", eta_gen:0.85, cat:"Cazane gaz" },
  { id:"GAZ_TJ",       label:"Cazan gaz natural - temperatură joasă",              fuel:"gaz", eta_gen:0.90, cat:"Cazane gaz" },
  { id:"GAZ_COND",     label:"Cazan gaz natural - condensare",                     fuel:"gaz", eta_gen:1.05, cat:"Cazane gaz" },
  { id:"GAZ_VEC",      label:"Cazan gaz natural - vechi (pre-1994)",               fuel:"gaz", eta_gen:0.73, cat:"Cazane gaz" },
  { id:"GAZ_CASC",     label:"Cazane gaz condensare în cascadă (≥2 module)",        fuel:"gaz", eta_gen:1.07, cat:"Cazane gaz" },
  { id:"CONV_GAZ_ECH", label:"Convector gaz cu cameră etanșă (tiraj echilibrat)",  fuel:"gaz", eta_gen:0.88, cat:"Cazane gaz" },
  { id:"CONV_GAZ_NAT", label:"Convector gaz cu cameră deschisă (tiraj natural)",   fuel:"gaz", eta_gen:0.72, cat:"Cazane gaz" },
  { id:"INFRARED_G",   label:"Panou radiant infraroșu pe gaz (industrial/hală)",   fuel:"gaz", eta_gen:0.92, cat:"Cazane gaz" },

  // ── CAZANE PE GPL ──────────────────────────────────────────────────────
  { id:"GPL_STD",      label:"Cazan GPL - standard (propan/butan)",                fuel:"gpl", eta_gen:0.85, cat:"Cazane GPL" },
  { id:"GPL_COND",     label:"Cazan GPL - condensare",                             fuel:"gpl", eta_gen:1.03, cat:"Cazane GPL" },

  // ── CAZANE PE MOTORINĂ / PĂCURĂ ────────────────────────────────────────
  { id:"MOT_STD",      label:"Cazan motorină/gasoil - standard",                   fuel:"motorina", eta_gen:0.83, cat:"Cazane motorină" },
  { id:"MOT_COND",     label:"Cazan motorină - condensare",                        fuel:"motorina", eta_gen:1.01, cat:"Cazane motorină" },
  { id:"MOT_VEC",      label:"Cazan motorină - vechi (pre-1990)",                  fuel:"motorina", eta_gen:0.73, cat:"Cazane motorină" },

  // ── CAZANE BIOMASĂ — PELEȚI ────────────────────────────────────────────
  { id:"BIO_AUT",      label:"Cazan peleți - automat (alimentare automată)",       fuel:"biomasa", eta_gen:0.90, cat:"Cazane biomasă" },
  { id:"BIO_MAN",      label:"Cazan biomasă - manual (lemn/brichete)",             fuel:"biomasa", eta_gen:0.78, cat:"Cazane biomasă" },
  { id:"BIO_PEL_MAN",  label:"Cazan peleți - manual",                             fuel:"biomasa", eta_gen:0.82, cat:"Cazane biomasă" },
  { id:"BIO_GAZIF",    label:"Cazan gazeificare lemn (cu acumulare termică)",      fuel:"lemn_foc", eta_gen:0.88, cat:"Cazane biomasă" },
  { id:"BIO_CHIP",     label:"Cazan tocătură lemnoasă / chips (G30/G50)",          fuel:"biomasa", eta_gen:0.84, cat:"Cazane biomasă" },
  { id:"BIO_CASC",     label:"Cazane peleți în cascadă (≥2 module)",              fuel:"biomasa", eta_gen:0.91, cat:"Cazane biomasă" },
  { id:"BIO_BRICHETE", label:"Cazan brichete din lemn/biomasă",                   fuel:"biomasa", eta_gen:0.82, cat:"Cazane biomasă" },
  { id:"BIO_AGRO",     label:"Cazan agropeleți (coajă semințe, paie comprimate)", fuel:"biomasa", eta_gen:0.80, cat:"Cazane biomasă" },

  // ── CAZANE CĂRBUNE / COCS ──────────────────────────────────────────────
  { id:"CARB",         label:"Cazan cărbune (huilă/antracit)",                     fuel:"carbune", eta_gen:0.75, cat:"Cazane cărbune" },
  { id:"CARB_BRN",     label:"Cazan cărbune brun / lignit",                        fuel:"carbune", eta_gen:0.70, cat:"Cazane cărbune" },
  { id:"COCS_K",       label:"Cazan cocs/cocsificat",                              fuel:"carbune", eta_gen:0.77, cat:"Cazane cărbune" },

  // ── CAZANE ELECTRICE ───────────────────────────────────────────────────
  { id:"ELEC",         label:"Cazan electric (rezistiv cu acumulare)",             fuel:"electricitate", eta_gen:0.99, cat:"Electrice" },
  { id:"ELEC_ACC",     label:"Radiator electric cu acumulare (stocare nocturnă)",  fuel:"electricitate", eta_gen:0.97, cat:"Electrice" },
  { id:"ELEC_PANEL",   label:"Panou electric radiant (calorifer electric direct)", fuel:"electricitate", eta_gen:1.00, cat:"Electrice" },
  { id:"INFRARED_E",   label:"Panou radiant infraroșu electric (tavan/perete)",    fuel:"electricitate", eta_gen:1.00, cat:"Electrice" },

  // ── SOBE ────────────────────────────────────────────────────────────────
  { id:"SOBA_TER",     label:"Sobă teracotă (cahle) — lemn de foc",               fuel:"lemn_foc", eta_gen:0.75, cat:"Sobe" },
  { id:"SOBA_MET",     label:"Sobă metalică — lemn / peleți",                     fuel:"lemn_foc", eta_gen:0.70, cat:"Sobe" },
  { id:"SOBA_SAM",     label:"Sobă șamotă (mase termice mari) — lemn",            fuel:"lemn_foc", eta_gen:0.78, cat:"Sobe" },
  { id:"SOBA_INO",     label:"Sobă inox design (insert / free-standing) — lemn",  fuel:"lemn_foc", eta_gen:0.72, cat:"Sobe" },
  { id:"SOBA_PEL",     label:"Sobă peleți cu termostat",                          fuel:"biomasa",  eta_gen:0.85, cat:"Sobe" },
  { id:"SOBA_CARB",    label:"Sobă cărbune / cocs",                               fuel:"carbune",  eta_gen:0.65, cat:"Sobe" },

  // ── SEMINEE ─────────────────────────────────────────────────────────────
  { id:"SEM_DESC",     label:"Șemineu deschis (focar deschis) — lemn",            fuel:"lemn_foc", eta_gen:0.20, cat:"Seminee" },
  { id:"SEM_INCH",     label:"Șemineu închis cu geam (focar închis) — lemn",      fuel:"lemn_foc", eta_gen:0.65, cat:"Seminee" },
  { id:"SEM_INS_L",    label:"Inserție șemineu pe lemn (cu recuperator căldură)", fuel:"lemn_foc", eta_gen:0.75, cat:"Seminee" },
  { id:"SEM_INS_P",    label:"Inserție șemineu pe peleți cu termostat",           fuel:"biomasa",  eta_gen:0.87, cat:"Seminee" },

  // ── POMPE DE CĂLDURĂ ────────────────────────────────────────────────────
  { id:"PC_AA",        label:"Pompă de căldură aer-apă (monosplit / monoblock)",  fuel:"electricitate", eta_gen:3.00, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_AA_INV",    label:"Pompă de căldură aer-apă inverter (performanță ridicată)", fuel:"electricitate", eta_gen:3.50, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_AA_LT",     label:"Pompă de căldură aer-apă temperatură joasă (≤35°C, pentru pardoseală)", fuel:"electricitate", eta_gen:4.00, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_AERAER",    label:"Pompă de căldură aer-aer (multi-split / VRF)",      fuel:"electricitate", eta_gen:3.20, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_SA",        label:"Pompă de căldură sol-apă (sonde verticale geotermale)", fuel:"electricitate", eta_gen:4.20, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_SA_HOR",    label:"Pompă de căldură sol-apă (colector orizontal)",     fuel:"electricitate", eta_gen:3.80, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_APA",       label:"Pompă de căldură apă-apă (pânză freatică)",         fuel:"electricitate", eta_gen:5.00, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_HIB",       label:"Sistem hibrid pompă de căldură aer-apă + cazan gaz",fuel:"electricitate", eta_gen:2.50, cat:"Pompe de căldură", isCOP:true },
  { id:"PC_HIB_BIO",   label:"Sistem hibrid pompă de căldură + cazan peleți",     fuel:"electricitate", eta_gen:2.80, cat:"Pompe de căldură", isCOP:true },

  // ── TERMOFICARE ─────────────────────────────────────────────────────────
  { id:"TERMO",        label:"Termoficare urbană SACET (punct termic)",            fuel:"termoficare", eta_gen:0.95, cat:"Termoficare" },
  { id:"TERMO_CHP",    label:"Termoficare cu cogenerare de înaltă eficiență (CHP)",fuel:"termoficare", eta_gen:0.95, cat:"Termoficare" },

  // ── COGENERARE ──────────────────────────────────────────────────────────
  { id:"COGEN",        label:"Cogenerare gaz CHP — recuperare termică",            fuel:"gaz", eta_gen:0.90, cat:"Cogenerare" },
  { id:"MICRO_COGEN",  label:"Microcogenerare rezidențială gaz (mCHP)",            fuel:"gaz", eta_gen:0.88, cat:"Cogenerare" },
];

export const EMISSION_SYSTEMS = [
  // ── RADIATOARE CU APĂ ────────────────────────────────────────────────────
  { id:"RAD_OT",       label:"Radiatoare oțel panou (tip 11 / 21 / 22 / 33)",    eta_em:0.95 },
  { id:"RAD_FO",       label:"Radiatoare fontă (coloane clasice)",                eta_em:0.93 },
  { id:"RAD_AL",       label:"Radiatoare aluminiu (răspuns rapid)",               eta_em:0.96 },
  { id:"RAD_DESIGN",   label:"Radiatoare design / tubulare oțel",                 eta_em:0.94 },
  { id:"RAD_LT",       label:"Radiatoare panou temperatură joasă (≤45°C, supradimensionate)", eta_em:0.97 },
  { id:"RAD_PROSOP",   label:"Radiatoare port-prosop (baie)",                     eta_em:0.93 },

  // ── CONVECTOARE CU APĂ ─────────────────────────────────────────────────
  { id:"CONV",         label:"Convectoare cu apă fără ventilator (convecție naturală)", eta_em:0.93 },
  { id:"CONV_PARD",    label:"Convector încastrat în pardoseală (fără ventilator)", eta_em:0.92 },

  // ── VENTILOCONVECTOARE (FAN COILS) ─────────────────────────────────────
  { id:"VENT_CONV",    label:"Ventiloconvectoare 2 țevi (încălzire/răcire alternativ)", eta_em:0.97 },
  { id:"FCU_4P",       label:"Ventiloconvectoare 4 țevi (încălzire + răcire simultan)", eta_em:0.97 },
  { id:"FCU_CAS",      label:"Ventiloconvectoare tip casetă (tavan)",             eta_em:0.96 },
  { id:"FCU_DUCT",     label:"Ventiloconvectoare tip duct (canalizat)",           eta_em:0.95 },
  { id:"FCU_CONS",     label:"Ventiloconvectoare consolă (perete / pardoseală)",  eta_em:0.97 },
  { id:"FCU_FLOOR",    label:"Ventiloconvectoare de pardoseală (încastrat)",      eta_em:0.96 },

  // ── ÎNCĂLZIRE ÎN PARDOSEALĂ ─────────────────────────────────────────────
  { id:"PARD",         label:"Încălzire în pardoseală cu apă (circuite înglobate în șapă)", eta_em:0.98 },
  { id:"PARD_E_REZ",   label:"Încălzire în pardoseală electrică — cablu/mat rezistiv", eta_em:0.98 },
  { id:"PARD_E_FOL",   label:"Încălzire în pardoseală electrică — folii radiante", eta_em:0.97 },

  // ── ÎNCĂLZIRE ÎN PERETE / PLAFON ───────────────────────────────────────
  { id:"PERE",         label:"Încălzire în perete cu apă (circuite înglobate)",   eta_em:0.97 },
  { id:"PERE_E",       label:"Încălzire în perete electrică (folii/panouri)",     eta_em:0.97 },
  { id:"PLAF",         label:"Încălzire în plafon cu apă (radiantă)",             eta_em:0.95 },
  { id:"PLAF_E",       label:"Încălzire în plafon electrică (folii/panouri)",     eta_em:0.95 },

  // ── AEROTERME ───────────────────────────────────────────────────────────
  { id:"AERO",         label:"Aeroterme cu apă caldă (ventilator axial/centrifugal)", eta_em:0.93 },
  { id:"AERO_ABR",     label:"Aeroterme cu abur",                                eta_em:0.91 },
  { id:"AERO_E",       label:"Aeroterme electrice",                               eta_em:0.93 },

  // ── GRINZI DE RĂCIRE-ÎNCĂLZIRE ──────────────────────────────────────────
  { id:"BEAM_ACT",     label:"Grinzi active de răcire-încălzire (active chilled beams)", eta_em:0.98 },
  { id:"BEAM_PAS",     label:"Grinzi pasive de răcire-încălzire (passive chilled beams)", eta_em:0.97 },

  // ── PANOURI RADIANTE INFRAROȘU ──────────────────────────────────────────
  { id:"RAD_IR_GAZ",   label:"Panouri radiante infraroșu pe gaz (tub luminos/întunecat)", eta_em:0.92 },
  { id:"RAD_IR_E",     label:"Panouri radiante infraroșu electrice (tavan/perete)", eta_em:0.95 },

  // ── SISTEME ELECTRICE DIRECTE ───────────────────────────────────────────
  { id:"SOBA_TER",     label:"Sobă de teracotă (sursă + emisie)",                eta_em:0.80 },
  { id:"SOBA_MET",     label:"Sobă metalică (sursă + emisie)",                   eta_em:0.75 },
  { id:"ELEC_CONV_D",  label:"Convector electric direct (convecție naturală)",    eta_em:0.93 },
  { id:"ELEC_STOR",    label:"Radiator electric cu acumulare (storage heater)",   eta_em:0.91 },
];

export const DISTRIBUTION_QUALITY = [
  // ── REȚELE INTERIOARE (spațiu încălzit) ─────────────────────────────────
  { id:"BINE_INT_NZB", label:"Bine izolată — interioară (standard nZEB / nou)",   eta_dist:0.97 },
  { id:"BINE_INT",     label:"Bine izolată — interioară (spațiu încălzit)",       eta_dist:0.95 },
  { id:"MED_INT",      label:"Mediu izolată — interioară (spațiu încălzit)",      eta_dist:0.92 },
  { id:"SLAB_INT",     label:"Slab izolată — interioară (spațiu încălzit)",       eta_dist:0.88 },
  { id:"NEIZ_INT",     label:"Fără izolație — interioară (spațiu încălzit)",      eta_dist:0.82 },
  // ── REȚELE ÎN PLANȘEU / ȘAPĂ ────────────────────────────────────────────
  { id:"PARD_IZOL",    label:"Bine izolată — în planșeu/șapă (pardoseală radiantă)", eta_dist:0.94 },
  // ── REȚELE EXTERIOARE / SUBTERANE ───────────────────────────────────────
  { id:"BINE_EXT",     label:"Bine izolată — exterioară / subterană",             eta_dist:0.93 },
  { id:"MED_EXT",      label:"Mediu izolată — exterioară",                        eta_dist:0.87 },
  { id:"SLAB_EXT",     label:"Slab izolată — exterioară",                         eta_dist:0.80 },
  { id:"NEIZ",         label:"Fără izolație — exterioară / neprotejată",           eta_dist:0.70 },
];

export const CONTROL_TYPES = [
  { id:"FARA",         label:"Fără reglaj (robinete fixe, manual)",                eta_ctrl:0.77, bacs:"D" },
  { id:"CENTR",        label:"Termostat ambiental simplu on/off (cameră de referință)", eta_ctrl:0.85, bacs:"C" },
  { id:"PROG",         label:"Termostat ambiental programabil (orar/zilnic + setback noapte)", eta_ctrl:0.88, bacs:"C" },
  { id:"COMP_CLIM",    label:"Reglaj cu compensare climatică (outdoor reset — curbă de reglaj)", eta_ctrl:0.90, bacs:"B" },
  { id:"TERMO_RAD",    label:"Robinete termostatice pe radiatoare TRV (EN 215)",   eta_ctrl:0.88, bacs:"B" },
  { id:"TRV_CENTR",    label:"TRV + termostat ambiental de referință (hibrid)",    eta_ctrl:0.91, bacs:"B" },
  { id:"ZONAL",        label:"Reglaj zonal multizonă termostată (2–4 zone)",       eta_ctrl:0.93, bacs:"B" },
  { id:"INDIV_CABLU",  label:"Reglaj individual per cameră — cablat (wired)",      eta_ctrl:0.95, bacs:"A" },
  { id:"INTELIG",      label:"Smart home / IoT wireless (app, geofencing, prezență)", eta_ctrl:0.94, bacs:"A" },
  { id:"BMS",          label:"BMS centralizat (BACnet/Modbus — clădiri comerciale/publice)", eta_ctrl:0.96, bacs:"A" },
  { id:"BMS_PRED",     label:"BMS cu predicție ML/MPC (prognoze meteo + ocupare)", eta_ctrl:0.97, bacs:"A+" },
  { id:"PREZ_CTRL",    label:"Sisteme cu senzori prezență/CO₂ (ocupare adaptivă)", eta_ctrl:0.93, bacs:"A" },
];

export const FUELS = [
  // ── COMBUSTIBILI GAZOȘI ──────────────────────────────────────────────────
  { id:"gaz",       label:"Gaz natural (rețea)",
    fP_nren:1.17, fP_ren:0.00, fP_tot:1.17, fCO2:0.202, pci:9.97, unit:"Nm³",
    price_lei_kwh:0.31, price_note:"Plafonat 310 lei/MWh TVA incl. (OUG 6/2025), apr.2026: min(contract, reglementat) per OUG 12/2026" },
  { id:"gpl",       label:"GPL (gaz petrolier lichefiat — vrac/rezervor propan)",
    fP_nren:1.15, fP_ren:0.00, fP_tot:1.15, fCO2:0.227, pci:12.87, unit:"kg",
    price_lei_kwh:0.52, price_note:"Preț vrac propan 2025–2026 (variabil ~4.5–6.0 lei/kg)" },
  { id:"gpl_butelie", label:"GPL butelie (propan-butan 10–26 kg)",
    fP_nren:1.15, fP_ren:0.00, fP_tot:1.15, fCO2:0.234, pci:12.50, unit:"kg",
    price_lei_kwh:0.65, price_note:"Cost mai ridicat față de vrac (distribuție butelii)" },
  { id:"biogas",    label:"Biogaz (metan 55–65% din digestie anaerobă)",
    fP_nren:0.00, fP_ren:1.00, fP_tot:1.00, fCO2:0.025, pci:6.00, unit:"Nm³",
    price_lei_kwh:0.42, price_note:"Preț estimat 2025-2026 (producție locală)" },
  { id:"hidrogen",  label:"Hidrogen verde (electroliză din surse regenerabile)",
    fP_nren:0.00, fP_ren:1.00, fP_tot:1.00, fCO2:0.00, pci:33.33, unit:"kg",
    price_lei_kwh:1.20, price_note:"Estimat 2026 — hidrogen verde în faza de pionierat" },

  // ── COMBUSTIBILI LICHIZI ─────────────────────────────────────────────────
  { id:"motorina",  label:"Motorină / combustibil lichid (gasoil)",
    fP_nren:1.10, fP_ren:0.00, fP_tot:1.10, fCO2:0.263, pci:11.83, unit:"kg",
    price_lei_kwh:0.75, price_note:"Preț orientativ 2025–2026" },
  { id:"bioetanol", label:"Bioetanol (E100, combustibil regenerabil lichid)",
    fP_nren:0.00, fP_ren:1.00, fP_tot:1.00, fCO2:0.027, pci:7.44, unit:"kg",
    price_lei_kwh:0.70, price_note:"Conform RED II 2018/2001 — biogen neutru CO₂" },
  { id:"biodiesel", label:"Biodiesel (FAME — rapiță/palmier/deșeuri)",
    fP_nren:0.20, fP_ren:0.90, fP_tot:1.10, fCO2:0.025, pci:9.80, unit:"kg",
    price_lei_kwh:0.68, price_note:"Conform RED II — biogen; include lanțul de aprovizionare" },

  // ── COMBUSTIBILI SOLIZI ──────────────────────────────────────────────────
  { id:"carbune",   label:"Cărbune (huilă / antracit)",
    fP_nren:1.20, fP_ren:0.00, fP_tot:1.20, fCO2:0.341, pci:8.14, unit:"kg",
    price_lei_kwh:0.32, price_note:"Preț orientativ 2025" },
  { id:"carbune_brun", label:"Cărbune brun / lignit",
    fP_nren:1.20, fP_ren:0.00, fP_tot:1.20, fCO2:0.364, pci:3.56, unit:"kg",
    price_lei_kwh:0.22, price_note:"Cel mai poluant combustibil solid uzual" },
  { id:"cocs",      label:"Cocs / cocsificat",
    fP_nren:1.20, fP_ren:0.00, fP_tot:1.20, fCO2:0.354, pci:8.19, unit:"kg",
    price_lei_kwh:0.28, price_note:"Reziduuri cocserie; putere calorifică ridicată" },
  { id:"biomasa",   label:"Biomasă (lemn / peleți — generic)",
    fP_nren:0.28, fP_ren:0.80, fP_tot:1.08, fCO2:0.039, pci:17.50, unit:"kg",
    price_lei_kwh:0.22, price_note:"Peleți ENplus A1: 1300–1500 lei/t" },
  { id:"lemn_foc",  label:"Lemne de foc (buștean, lemn de foc ≤20% umiditate)",
    fP_nren:0.09, fP_ren:1.00, fP_tot:1.09, fCO2:0.018, pci:4.00, unit:"kg",
    price_lei_kwh:0.12, price_note:"Plafonat 400 lei/mc; putere calorifică ~4.0 kWh/kg (20% umiditate)" },

  // ── ENERGIE ELECTRICĂ ────────────────────────────────────────────────────
  { id:"electricitate", label:"Electricitate din rețea (SEN — mix național)",
    fP_nren:2.62, fP_ren:0.00, fP_tot:2.62, fCO2:0.107, pci:null, unit:"kWh",
    price_lei_kwh:1.12, price_note:"Media 2026: ~1.12 lei/kWh TVA incl. (ANRE, actualizat aprilie 2026)" },

  // ── TERMOFICARE ──────────────────────────────────────────────────────────
  { id:"termoficare", label:"Termoficare / cogenerare urbană (SACET)",
    fP_nren:0.92, fP_ren:0.00, fP_tot:0.92, fCO2:0.220, pci:null, unit:"kWh",
    price_lei_kwh:0.40, price_note:"Tarif mediu 2025, subvenționat local" },
];

// Factor energie ambientală conform SR EN ISO 52000-1:2017/NA:2023 (Tabel A.16)
// OAER: factor 0 pentru energia ambientală a pompelor de căldură (în loc de 1.0 din Mc001 original)
export const AMBIENT_ENERGY_FACTOR = {
  mc001_original: { fP_nren: 1.0, fP_ren: 0.0, fP_tot: 1.0, fCO2: 0.0, label: "Mc001-2022 original (Tabel 5.17)" },
  na2023:         { fP_nren: 0.0, fP_ren: 0.0, fP_tot: 0.0, fCO2: 0.0, label: "SR EN ISO 52000-1/NA:2023 (Tabel A.16)" },
};

export const ACM_SOURCES = [
  { id:"CAZAN_H",       label:"Același cazan cu încălzirea (prioritate termică)",      eta:null,  fuel:"gaz" },
  { id:"BOILER_E",      label:"Boiler electric rezistiv (cu acumulare)",               eta:0.95,  fuel:"electricitate" },
  { id:"BOILER_E_NOAPTE",label:"Boiler electric cu acumulare (tarif noapte redus)",   eta:0.93,  fuel:"electricitate" },
  { id:"BOILER_G",      label:"Boiler dedicat pe gaz natural",                        eta:0.87,  fuel:"gaz" },
  { id:"BOILER_G_COND", label:"Boiler dedicat gaz condensare (ACM instantaneu)",      eta:0.95,  fuel:"gaz" },
  { id:"BOILER_GPL",    label:"Boiler dedicat pe GPL",                                eta:0.87,  fuel:"gpl" },
  { id:"INSTANT_G",     label:"Centrală murală combinată gaz (combi) / instant gaz",  eta:0.88,  fuel:"gaz" },
  { id:"INSTANT_E",     label:"Preparator electric instant (termoelectric)",           eta:0.97,  fuel:"electricitate" },
  { id:"PC_ACM",        label:"Pompă de căldură dedicată ACM (split / monoblock)",    eta:2.50,  fuel:"electricitate", isCOP:true },
  { id:"PC_ACM_ERV",    label:"Pompă de căldură ACM aerotermă (aer extras ventilare)",eta:3.00,  fuel:"electricitate", isCOP:true },
  { id:"SOLAR_AUX",     label:"Solar termic + auxiliar electric",                     eta:0.95,  fuel:"electricitate", solarFraction:0.50 },
  { id:"SOLAR_GAZ",     label:"Solar termic + auxiliar gaz",                          eta:0.87,  fuel:"gaz",           solarFraction:0.50 },
  { id:"SOLAR_PC",      label:"Solar termic + pompă de căldură",                      eta:2.50,  fuel:"electricitate", isCOP:true, solarFraction:0.55 },
  { id:"TERMO_ACM",     label:"Termoficare urbană (schimbător de căldură punct termic)",eta:0.92, fuel:"termoficare" },
  { id:"COGEN_ACM",     label:"Cogenerare / microcogenerare CHP — recuperare ACM",    eta:0.85,  fuel:"gaz" },
  { id:"CENTRALIZAT_BLOC",label:"Sistem centralizat pe scară / bloc (CT comun)",      eta:0.82,  fuel:"gaz" },
  { id:"DESUPERHEATER", label:"Recuperator căldură condensator AC (desuperheater)",   eta:3.50,  fuel:"electricitate", isCOP:true },
  { id:"BOILER_BIOMASA",label:"Boiler biomasă / peleți dedicat ACM",                 eta:0.85,  fuel:"biomasa" },
];

// COOLING_SYSTEMS — catalog 25 tipologii răcire
// EER = Energy Efficiency Ratio (sarcină nominală, punct A EN 14511 / ISO 5151)
// SEER = Seasonal EER (sezonier EN 14825 — pentru calcul consum anual corect)
// Sprint 3a (17 apr 2026): adăugată coloană `seer` conform Reg. UE 2016/2281 Anexa II
export const COOLING_SYSTEMS = [
  // ── APARATE SPLIT ─────────────────────────────────────────────────────────
  { id:"SPLIT",        label:"Split monosplit fix",                                   eer:3.20, seer:5.40, fuel:"electricitate", cat:"Split" },
  { id:"SPLIT_MULTI",  label:"Multisplit (o unitate ext. — mai multe int.)",          eer:3.50, seer:5.80, fuel:"electricitate", cat:"Split" },
  { id:"SPLIT_INV",    label:"Split inverter (monosplit sau multisplit inverter)",     eer:4.00, seer:6.10, fuel:"electricitate", cat:"Split" },
  // ── VRF / VRV ─────────────────────────────────────────────────────────────
  { id:"VRF",          label:"Sistem VRF/VRV 2 pipe (doar răcire sau doar încălzire)",eer:4.50, seer:6.50, fuel:"electricitate", cat:"VRF" },
  { id:"VRF_3P",       label:"Sistem VRF/VRV 3 pipe cu recuperare (simultan încălzire + răcire)", eer:5.00, seer:7.00, fuel:"electricitate", cat:"VRF" },
  // ── CHILLERE RĂCITE CU AER ────────────────────────────────────────────────
  { id:"CHILLER_A",    label:"Chiller răcit cu aer — compresor scroll",               eer:3.00, seer:4.40, fuel:"electricitate", cat:"Chiller" },
  { id:"CHILLER_A_SCR",label:"Chiller răcit cu aer — compresor cu șurub (screw)",    eer:3.20, seer:4.70, fuel:"electricitate", cat:"Chiller" },
  // ── CHILLERE RĂCITE CU APĂ ────────────────────────────────────────────────
  { id:"CHILLER_W",    label:"Chiller răcit cu apă + turn de răcire (water-cooled)",  eer:5.00, seer:6.25, fuel:"electricitate", cat:"Chiller" },
  { id:"CHILLER_W_CTR",label:"Chiller răcit cu apă — compresor centrifugal (mare)",  eer:6.00, seer:7.50, fuel:"electricitate", cat:"Chiller" },
  // ── MAȘINI CU ABSORBȚIE (SEER ≈ EER — nu există bin-method EN 14825 pt. termic) ─
  { id:"ABSORB",       label:"Mașină cu absorbție — un efect (gaz / LiBr-H₂O)",     eer:0.70, seer:0.70, fuel:"gaz",           cat:"Absorbție" },
  { id:"ABSORB_2E",    label:"Mașină cu absorbție — dublu efect (gaz)",              eer:1.20, seer:1.20, fuel:"gaz",           cat:"Absorbție" },
  { id:"ABSORB_ABR",   label:"Mașină cu absorbție acționată cu abur / căldură reziduală", eer:0.80, seer:0.80, fuel:"termoficare", cat:"Absorbție" },
  // ── POMPE DE CĂLDURĂ REVERSIBILE ─────────────────────────────────────────
  { id:"PC_REV",       label:"Pompă de căldură reversibilă aer-apă",                 eer:3.50, seer:6.00, fuel:"electricitate", cat:"PC reversibilă" },
  { id:"PC_REV_SA",    label:"Pompă de căldură reversibilă sol-apă (geotermală)",    eer:5.00, seer:7.50, fuel:"electricitate", cat:"PC reversibilă" },
  { id:"PC_REV_AA",    label:"Pompă de căldură reversibilă apă-apă (acvifer/râu)",   eer:5.50, seer:8.20, fuel:"electricitate", cat:"PC reversibilă" },
  // ── FREE-COOLING (SEER ≈ EER — exploatare directă sezonieră constantă) ───
  { id:"FREE_COOL_AER",label:"Free-cooling cu aer exterior (economizor aer-aer)",    eer:8.00, seer:8.00, fuel:"electricitate", cat:"Free-cooling" },
  { id:"FREE_COOL_APA",label:"Free-cooling cu apă (economizor hidraulic + chiller)", eer:10.00,seer:10.00,fuel:"electricitate", cat:"Free-cooling" },
  { id:"GEO_RACIRE",   label:"Răcire geotermală pasivă (fără compresor, sol-apă)",   eer:15.00,seer:15.00,fuel:"electricitate", cat:"Geotermală" },
  // ── GRINZI RĂCITE ─────────────────────────────────────────────────────────
  { id:"BEAM_ACT",     label:"Grinzi active răcite (active chilled beams)",           eer:5.50, seer:6.00, fuel:"electricitate", cat:"Chilled beams" },
  { id:"BEAM_PAS",     label:"Grinzi pasive răcite (passive chilled beams)",          eer:5.00, seer:5.00, fuel:"electricitate", cat:"Chilled beams" },
  { id:"FCU_CHILL",    label:"Fan coil-uri cu chiller central (apă răcită)",          eer:4.50, seer:5.80, fuel:"electricitate", cat:"Fan coil" },
  // ── RĂCIRE ADIABATICĂ ─────────────────────────────────────────────────────
  { id:"ADIAB_DIR",    label:"Răcire adiabatică directă (evaporativă directă)",       eer:12.00,seer:12.00,fuel:"electricitate", cat:"Adiabatică" },
  { id:"ADIAB_IND",    label:"Răcire adiabatică indirectă (evaporativă indirectă)",   eer:8.00, seer:8.00, fuel:"electricitate", cat:"Adiabatică" },
  // ── DISTRICT COOLING ──────────────────────────────────────────────────────
  { id:"DISTRICT_COOL",label:"District cooling (rețea urbană apă răcită)",            eer:6.00, seer:6.00, fuel:"termoficare",  cat:"District" },
  // ── FĂRĂ RĂCIRE ───────────────────────────────────────────────────────────
  { id:"NONE",         label:"Fără sistem de răcire activ",                           eer:0,    seer:0,    fuel:null,           cat:"Fără răcire" },
];

// ═══════════════════════════════════════════════════════════════════════════
// RANDAMENTE RĂCIRE — EN 15316-2:2017 + EN 16798-9 (Sprint 3a, 17 apr 2026)
// Q_NC_final = Q_NC_calculat / (η_em × η_dist × η_ctrl × SEER)
// ═══════════════════════════════════════════════════════════════════════════

// Randament emisie răcire η_em — SR EN 15316-2 Tab.7 + SR EN 16798-9 Anexa C
export const COOLING_EMISSION_EFFICIENCY = [
  { id:"fan_coil",         label:"Ventiloconvector 4 țevi (fan coil)",              eta:0.97 },
  { id:"fan_coil_2t",      label:"Ventiloconvector 2 țevi",                          eta:0.96 },
  { id:"split_mural",      label:"Split mural / unitate interioară VRF",             eta:0.95 },
  { id:"casetta",          label:"Casetta (tavan aparent/fals, difuzie 360°)",       eta:0.96 },
  { id:"plafon_radiant",   label:"Plafon radiant răcire (cooling ceiling)",          eta:0.98 },
  { id:"pardoseala_rad",   label:"Pardoseală radiantă răcire",                       eta:0.97 },
  { id:"grinzi_active",    label:"Grinzi active răcite (active chilled beams)",      eta:0.96 },
  { id:"grinzi_pasive",    label:"Grinzi pasive răcite",                             eta:0.95 },
  { id:"difuzoare_canal",  label:"Difuzoare canal cu grile",                         eta:0.94 },
  { id:"doas",             label:"DOAS — sistem aer proaspăt dedicat",               eta:0.95 },
];

// Randament distribuție răcire η_dist — SR EN 15316-3 Tab.7 + EN 16798-9
// Valori funcție de izolație conducte + tip agent + poziție (interior/exterior zonă)
export const COOLING_DISTRIBUTION_EFFICIENCY = [
  { id:"agent_frig",         label:"Agent frigorific direct (VRF / split)",         eta:0.98 },
  { id:"apa_rece_izolat_int",label:"Apă rece, izolat ≥20 mm, conducte interioare",  eta:0.95 },
  { id:"apa_rece_izolat_ext",label:"Apă rece, izolat ≥20 mm, conducte exterioare",  eta:0.92 },
  { id:"apa_rece_mediu",     label:"Apă rece, izolație medie (10–15 mm)",           eta:0.92 },
  { id:"apa_rece_slab",      label:"Apă rece, izolație slabă (<10 mm)",             eta:0.88 },
  { id:"apa_rece_neizolat",  label:"Apă rece, conducte neizolate",                  eta:0.85 },
  { id:"aer_tratat_izolat",  label:"Aer tratat, canale izolate",                     eta:0.94 },
  { id:"aer_tratat_slab",    label:"Aer tratat, canale puțin izolate",               eta:0.90 },
  { id:"aer_tratat_neizolat",label:"Aer tratat, canale neizolate",                   eta:0.85 },
];

// Randament control răcire η_ctrl — SR EN 15232-1:2017 / ISO 52120-1:2022 Tab.3
// Valori >1.00 pentru BACS clasa A/B reflectă optimizare (reducere setpoint dinamic)
export const COOLING_CONTROL_EFFICIENCY = [
  { id:"manual",             label:"Reglare manuală (on/off utilizator)",            eta:0.88 },
  { id:"termostat_onoff",    label:"Termostat central ON/OFF",                       eta:0.92 },
  { id:"termostat_zona",     label:"Termostat pe zonă (on/off)",                     eta:0.94 },
  { id:"termostat_prop",     label:"Termostat proporțional P/PI",                    eta:0.96 },
  { id:"termostat_pid",      label:"Termostat PID + senzor CO₂/prezență",            eta:0.98 },
  { id:"bacs_clasa_d",       label:"BACS Clasa D (non-eficient — EPBD deprecated)",  eta:0.90 },
  { id:"bacs_clasa_c",       label:"BACS Clasa C (standard ISO 52120-1 — bază)",     eta:1.00 },
  { id:"bacs_clasa_b",       label:"BACS Clasa B (avansat — setpoint dinamic)",      eta:1.02 },
  { id:"bacs_clasa_a",       label:"BACS Clasa A (high-performance — optimizare AI)",eta:1.05 },
];

// Sprint 3b (17 apr 2026) — Ore tipice operare răcire anual per zonă climatică × categorie
// Conform Mc 001-2022 Partea III Tab. 9.3 + experiență auditori RO
// Sezon de răcire RO: 15 mai – 15 septembrie (~120 zile)
// Ore efective chiller/PC = zile sezon × (ore ocupare × factor utilizare)
// Zone climatice Mc 001: I (Timișoara-Oradea) / II (Cluj-Iași) / III (București) / IV (Constanța) / V (Dobrogea-sud)
export const COOLING_HOURS_BY_ZONE = {
  // Rezidențial (funcționare intermitentă, seara + noapte + weekend)
  RI: { I:600, II:800, III:1000, IV:1200, V:1400 },
  RC: { I:600, II:800, III:1000, IV:1200, V:1400 },
  RA: { I:600, II:800, III:1000, IV:1200, V:1400 },
  // Birouri (8-10h/zi lucrătoare × ~90 zile răcire)
  BI: { I:800, II:1000, III:1200, IV:1500, V:1800 },
  AD: { I:800, II:1000, III:1200, IV:1500, V:1800 },
  // Comerț / retail (12h/zi × 120 zile)
  CO: { I:1200, II:1400, III:1700, IV:2000, V:2300 },
  MAG: { I:1200, II:1400, III:1700, IV:2000, V:2300 },
  MALL: { I:1500, II:1800, III:2100, IV:2400, V:2700 },
  // Educație (8h/zi × 100 zile, pauze vară)
  SC: { I:400, II:500, III:600, IV:700, V:800 },
  ED: { I:400, II:500, III:600, IV:700, V:800 },
  // Sănătate (24/24 × sezon răcire)
  SA: { I:2000, II:2400, III:2800, IV:3200, V:3600 },
  SPA_H: { I:2000, II:2400, III:2800, IV:3200, V:3600 },
  // Hotel (12-14h/zi × 120 zile)
  HC: { I:1000, II:1200, III:1500, IV:1800, V:2100 },
  HO_LUX: { I:1200, II:1500, III:1800, IV:2100, V:2400 },
  // Sport / Altele
  SP: { I:700, II:900, III:1100, IV:1300, V:1500 },
  AL: { I:800, II:1000, III:1200, IV:1400, V:1600 },
  AER: { I:2000, II:2200, III:2500, IV:2800, V:3100 },
};

// Default fallback când categoria sau zona lipsesc
export const COOLING_HOURS_DEFAULT = 1200;

// Tipuri ventilare conform I5-2022 (Ord. MDLPA 2023) + Mc 001-2022 Cap. 3 + EN 13779
// SFP stocat în kW/(m³/s) — echivalent cu Wh/m³ — conform SR EN 13779 Tab.B.5 + I5-2022 Tab.6.1
// Exemplu: sfp=1.40 kW/(m³/s) = 1400 W/(m³/s) ≈ SFP4 pentru recuperator 80%
// P_fan [W] = sfp × (debit [m³/h] / 3600) × 1000
// hrEta = eficiența recuperare termică sensibilă (fracție 0–1) conform EN 308
export const VENTILATION_TYPES = [
  // ── NATURALĂ ──────────────────────────────────────────────────────────────
  { id:"NAT",          label:"Ventilare naturală (ferestre / grile fixe / tiraj natural)", hasHR:false, hrEta:0,    sfp:0.00, cat:"Naturală" },
  { id:"NAT_HIBRIDA",  label:"Ventilare hibridă (naturală + asistată mecanic)",            hasHR:false, hrEta:0,    sfp:0.20, cat:"Naturală" },
  // ── MECANICĂ SIMPLĂ ───────────────────────────────────────────────────────
  { id:"MEC_EXT",      label:"Ventilare mecanică — extracție simplă",                      hasHR:false, hrEta:0,    sfp:0.45, cat:"Mecanică simplă" },
  { id:"MEC_EXT_AUTO", label:"Ventilare mecanică — extracție cu grilă higroautomatică",    hasHR:false, hrEta:0,    sfp:0.55, cat:"Mecanică simplă" },
  { id:"MEC_INT",      label:"Ventilare mecanică — insuflare simplă",                      hasHR:false, hrEta:0,    sfp:0.45, cat:"Mecanică simplă" },
  // ── DUBLĂ FLUX FĂRĂ RECUPERARE ────────────────────────────────────────────
  { id:"MEC_DUB",      label:"Ventilare mecanică dublă flux (fără recuperare de căldură)", hasHR:false, hrEta:0,    sfp:1.00, cat:"Dublă flux" },
  // ── RECUPERARE CĂLDURĂ SENSIBILĂ ──────────────────────────────────────────
  { id:"MEC_HR60",     label:"Ventilare cu recuperare de căldură sensibilă — η = 60%",     hasHR:true,  hrEta:0.60, sfp:1.00, cat:"Recuperare" },
  { id:"MEC_HR70",     label:"Ventilare cu recuperare de căldură sensibilă — η = 70%",     hasHR:true,  hrEta:0.70, sfp:1.20, cat:"Recuperare" },
  { id:"MEC_HR75",     label:"Ventilare cu recuperare de căldură sensibilă — η = 75%",     hasHR:true,  hrEta:0.75, sfp:1.30, cat:"Recuperare" },
  { id:"MEC_HR80",     label:"Ventilare cu recuperare de căldură sensibilă — η = 80%",     hasHR:true,  hrEta:0.80, sfp:1.40, cat:"Recuperare" },
  { id:"MEC_HR85",     label:"Ventilare cu recuperare de căldură sensibilă — η = 85%",     hasHR:true,  hrEta:0.85, sfp:1.55, cat:"Recuperare" },
  { id:"MEC_HR90",     label:"Ventilare cu recuperare de căldură sensibilă — η = 90%",     hasHR:true,  hrEta:0.90, sfp:1.60, cat:"Recuperare" },
  { id:"MEC_HR95",     label:"Ventilare cu recuperare de căldură sensibilă — η = 95% (Passive House)", hasHR:true, hrEta:0.95, sfp:1.80, cat:"Recuperare" },
  // ── RECUPERARE ENTALPICĂ (SENSIBIL + LATENT) ─────────────────────────────
  { id:"MEC_ERV",      label:"Ventilare cu recuperare entalpică (rotor entalpic / membrană) — η ≈ 75%", hasHR:true, hrEta:0.75, sfp:1.40, cat:"Recuperare entalpică", hasEnthalpy:true },
  // ── UTA — UNITATE DE TRATARE AER ─────────────────────────────────────────
  { id:"UTA",          label:"UTA — unitate tratare aer (baterie încălzire/răcire, AHU standard)", hasHR:true, hrEta:0.75, sfp:2.00, cat:"UTA" },
  { id:"UTA_ERV",      label:"UTA — cu recuperare entalpică integrată",             hasHR:true,  hrEta:0.75, sfp:2.30, cat:"UTA", hasEnthalpy:true },
  // ── SISTEME AVANSATE ──────────────────────────────────────────────────────
  { id:"VRF_VENT",     label:"VRF/VRV cu unitate de ventilare și recuperare de energie", hasHR:true, hrEta:0.70, sfp:1.60, cat:"VRF", hasEnthalpy:true },
  { id:"FCU",          label:"Fan coil-uri / ventiloconvectoare (recirculare aer interior)", hasHR:false, hrEta:0, sfp:0.30, cat:"Fan coil" },
  { id:"VAV",          label:"Ventilare cu debit variabil VAV (Variable Air Volume)", hasHR:true,  hrEta:0.70, sfp:1.50, cat:"VAV" },
  { id:"DOAS",         label:"DOAS — sistem dedicat aer proaspăt cu recuperare entalpică", hasHR:true, hrEta:0.80, sfp:1.80, cat:"DOAS", hasEnthalpy:true },
  { id:"GEO_AER",      label:"Schimbător sol-aer geothermic pasiv (earth-to-air HX)", hasHR:true,  hrEta:0.60, sfp:0.40, cat:"Geotermic pasiv" },
  { id:"ADIAB_VENT",   label:"Răcire adiabatică directă / evaporativă (cu ventilare)", hasHR:false, hrEta:0, sfp:0.60, cat:"Adiabatică" },
];

export const LIGHTING_TYPES = [
  // ── INCANDESCENTE ─────────────────────────────────────────────────────────
  { id:"INCAND",       label:"Incandescent clasic (bec cu filament 60–100 W)",            pDensity:25.0, efficacy:12,  cat:"Incandescent" },
  { id:"HALOGEN",      label:"Halogen clasic 230 V (reflector PAR/R)",                    pDensity:18.0, efficacy:18,  cat:"Incandescent" },
  // ── HALOGEN ───────────────────────────────────────────────────────────────
  { id:"HAL_REFL",     label:"Halogen cu reflector dicroic (50 W / 35 W)",               pDensity:16.0, efficacy:20,  cat:"Halogen" },
  { id:"HAL_MR16",     label:"Halogen MR16 low-voltage 12 V (GU5.3, 35–50 W)",           pDensity:13.0, efficacy:24,  cat:"Halogen" },
  // ── FLUORESCENTE ──────────────────────────────────────────────────────────
  { id:"CFL",          label:"Fluorescent compact CFL (E27/E14, 11–23 W)",               pDensity:8.0,  efficacy:55,  cat:"Fluorescent" },
  { id:"TUB_T8",       label:"Tub fluorescent T8 standard (balast magnetic, 36 W)",      pDensity:12.0, efficacy:70,  cat:"Fluorescent" },
  { id:"TUB_T8_HF",    label:"Tub fluorescent T8 cu balast electronic HF (36 W)",        pDensity:10.0, efficacy:90,  cat:"Fluorescent" },
  { id:"TUB_T5",       label:"Tub fluorescent T5 HE — high efficiency (28 W)",           pDensity:8.0,  efficacy:95,  cat:"Fluorescent" },
  { id:"TUB_T5_HO",    label:"Tub fluorescent T5 HO — high output (54 W)",               pDensity:10.0, efficacy:90,  cat:"Fluorescent" },
  // ── INDUCȚIE ──────────────────────────────────────────────────────────────
  { id:"INDUCTIE",     label:"Lampă cu inducție electromagnetică (55–85 W, lungă viață)", pDensity:7.0,  efficacy:80,  cat:"Inducție" },
  // ── LED ───────────────────────────────────────────────────────────────────
  { id:"LED_E27",      label:"LED retrofit E27/E14 (bulb LED 8–15 W)",                   pDensity:4.5,  efficacy:100, cat:"LED" },
  { id:"LED_SPOT",     label:"LED spot/downlight (GU10 / MR16 LED, 5–12 W)",             pDensity:5.0,  efficacy:90,  cat:"LED" },
  { id:"LED_TUB_T8",   label:"LED tub T8 retrofit (18–22 W, înlocuire fluorescent)",     pDensity:6.0,  efficacy:130, cat:"LED" },
  { id:"LED",          label:"LED panou / panel (60×60 cm, 36–40 W)",                    pDensity:4.0,  efficacy:130, cat:"LED" },
  { id:"LED_LINEAR",   label:"LED linear (profil LED continuu, troffer)",                 pDensity:5.0,  efficacy:120, cat:"LED" },
  { id:"LED_PRO",      label:"LED profesional high-lumen (industrial, >150 lm/W)",       pDensity:3.5,  efficacy:160, cat:"LED" },
  { id:"LED_STRADAL",  label:"LED stradal / exterior (50–200 W, ≥130 lm/W)",             pDensity:3.0,  efficacy:140, cat:"LED" },
  // ── METAL HALIDE ──────────────────────────────────────────────────────────
  { id:"METAL_HAL",    label:"Metal halide — proiector (70–400 W)",                       pDensity:14.0, efficacy:85,  cat:"Metal halide" },
  { id:"METAL_HAL_HB", label:"Metal halide — high bay industrial (150–1000 W)",           pDensity:12.0, efficacy:100, cat:"Metal halide" },
  // ── SODIU ÎNALTĂ PRESIUNE ─────────────────────────────────────────────────
  { id:"SODIU_IP",     label:"Sodiu înaltă presiune HPS/SON (70–400 W)",                  pDensity:10.0, efficacy:120, cat:"Sodiu" },
  { id:"SODIU_JP",     label:"Sodiu joasă presiune LPS/SOX (35–180 W — galben monocromatic)", pDensity:8.0, efficacy:175, cat:"Sodiu" },
];

export const LIGHTING_CONTROL = [
  { id:"MAN",          label:"Manual simplu (întrerupător perete, fără automatizare)", fCtrl:1.00, cat:"Manual" },
  { id:"TIMER",        label:"Programator orar / ceas astronomic (timer)",             fCtrl:0.90, cat:"Automat" },
  { id:"PREZ",         label:"Senzor de prezență PIR (infraroșu pasiv)",               fCtrl:0.80, cat:"Prezență" },
  { id:"PREZ_MIC",     label:"Senzor de prezență microunde (acoperire largă)",         fCtrl:0.75, cat:"Prezență" },
  { id:"PREZ_DIM",     label:"Senzor de prezență + dimmer (reglaj nivel luminos)",     fCtrl:0.70, cat:"Prezență + Dimmer" },
  { id:"DAYLIGHT",     label:"Reglaj daylighting — senzor lumină naturală (dimming continuu)", fCtrl:0.70, cat:"Lumină naturală" },
  { id:"PREZ_DAY",     label:"Combinat: senzor prezență + reglaj daylighting",         fCtrl:0.55, cat:"Combinat" },
  { id:"BMS",          label:"BMS integrat cu scenarii de iluminat (clădiri complexe)", fCtrl:0.50, cat:"BMS" },
  { id:"DALI",         label:"Control DALI / KNX / Zigbee Smart (protocol digital adresabil)", fCtrl:0.45, cat:"Smart" },
  { id:"AUTO_INT",     label:"Automat integral — fără acțiune umană (senzori + scenarii complete)", fCtrl:0.40, cat:"Automat integral" },
];

export const ACM_CONSUMPTION = {
  // Rezidențial
  RI:60, RC:50, RA:50,
  // Birouri & Administrative
  BI:10, AD:10, BA_OFF:10,
  // Educație
  ED:15, GR:20, SC:15, LI:15, UN:15, CP:45,
  // Sănătate
  SA:40, SPA_H:80, CL:30, ST:25, LB_MED:20, AS_SOC:60,
  // Hoteluri & Turism
  HC:80, HO_LUX:120, HOSTEL:50,
  // Restaurante
  REST:25, BAR:15, CANTINE:20, FAST_F:10,
  // Comerț
  CO:10, MAG:5, SUPER:10, MALL:10, AG_COM:8,
  // Sport & Recreere
  SP:30, PSC:60, SALA_POL:20, FIT:40, SPA_W:80,
  // Cultură & Spectacole
  CIN:5, TEA:5, MUZ:5, BIB:8, CC:10, EXP:8,
  // Transport
  GARA:5, AER:5,
  // Industrie
  IU:15, HAL:20, DEP:5, LAB_IND:15, FRG:5,
  // Parcări & Altele
  PRC:0, GAR_IND:0, CUL:5, AL:20,
};

export const LIGHTING_HOURS = {
  // Rezidențial
  RI:1800, RC:1800, RA:1800,
  // Birouri & Administrative
  BI:2500, AD:2500, BA_OFF:2500,
  // Educație
  ED:2000, GR:2200, SC:1800, LI:2000, UN:2500, CP:2200,
  // Sănătate
  SA:3500, SPA_H:8760, CL:3000, ST:2500, LB_MED:3000, AS_SOC:4000,
  // Hoteluri & Turism
  HC:3000, HO_LUX:4000, HOSTEL:2500,
  // Restaurante
  REST:3500, BAR:3500, CANTINE:2500, FAST_F:4000,
  // Comerț
  CO:3000, MAG:3000, SUPER:5000, MALL:4500, AG_COM:2800,
  // Sport & Recreere
  SP:2000, PSC:3500, SALA_POL:2500, FIT:3500, SPA_W:3000,
  // Cultură & Spectacole
  CIN:3000, TEA:2500, MUZ:2800, BIB:2500, CC:2500, EXP:2000,
  // Transport
  GARA:5000, AER:8760,
  // Industrie
  IU:2500, HAL:3500, DEP:2000, LAB_IND:2500, FRG:3000,
  // Parcări & Altele
  PRC:4380, GAR_IND:1000, CUL:2000, AL:2200,
};

// ===============================================================
// BAZE DE DATE REGENERABILE — Cap. 4 Mc 001-2022
// ===============================================================

// Colectoare solare termice — parametri conform EN ISO 9806:2017
// eta0 = randament optic; a1 = pierderi liniare [W/(m²·K)]; a2 = pătratice [W/(m²·K²)]
export const SOLAR_THERMAL_TYPES = [
  { id:"NEGL",         label:"Colector neglazurat (piscine / preîncălzire)",              eta0:0.90, a1:20.0, a2:0.000 },
  { id:"PLAN",         label:"Colector plan glazurat standard (absorbant selectiv)",      eta0:0.78, a1:3.80, a2:0.014 },
  { id:"PLAN_PREM",    label:"Colector plan glazurat selectiv premium (TiNOX / CPC-flat)", eta0:0.82, a1:3.20, a2:0.012 },
  { id:"PLAN_AR",      label:"Colector plan glazurat cu sticlă anti-reflexie (AR glass)", eta0:0.85, a1:3.50, a2:0.013 },
  { id:"TUB_VID",      label:"Tuburi vidate tip Sydney (all-glass evacuated tube)",       eta0:0.72, a1:1.50, a2:0.010 },
  { id:"TUB_HP",       label:"Tuburi vidate heat-pipe verticale",                         eta0:0.76, a1:1.20, a2:0.008 },
  { id:"TUB_HP_INC",   label:"Tuburi vidate heat-pipe orizontale / înclinate",           eta0:0.74, a1:1.30, a2:0.009 },
  { id:"CPC",          label:"Colector concentrator CPC low-concentration (±30–60°)",    eta0:0.68, a1:0.90, a2:0.006 },
  { id:"FRESNEL",      label:"Colector Fresnel liniar (necesită tracking solar N-S)",     eta0:0.60, a1:0.50, a2:0.003 },
];

export const PV_TYPES = [
  { id:"MONO",         label:"Monocristalin standard (Al-BSF)",                          eta:0.175, degradation:0.006 },
  { id:"MONO_PERC",    label:"Monocristalin PERC (Passivated Emitter Rear Cell)",        eta:0.205, degradation:0.005 },
  { id:"MONO_TOPCON",  label:"Monocristalin TOPCon N-type (top eficiență comercial 2024–2026)", eta:0.225, degradation:0.004 },
  { id:"POLI",         label:"Policristalin (p-Si, tehnologie matură)",                  eta:0.160, degradation:0.006 },
  { id:"THIN",         label:"Film subțire CdTe (Cadmiu Telurida — First Solar)",        eta:0.185, degradation:0.005 },
  { id:"CIGS",         label:"Film subțire CIGS/CIS",                                   eta:0.160, degradation:0.005 },
  { id:"AMORF",        label:"Amorf (a-Si) — film subțire (eficiență mică, TCO mare)",  eta:0.070, degradation:0.007 },
  { id:"BIFACIAL",     label:"Bifacial monocristalin PERC (câștig 10–20% față/spate)",  eta:0.210, degradation:0.005 },
  { id:"BIFACIAL_TOPCON",label:"Bifacial monocristalin TOPCon N-type (câștig 15–25%)", eta:0.228, degradation:0.004 },
  { id:"HJT",          label:"Heterojuncțiune HJT/HIT N-type (minim degradare, TCO excelent)", eta:0.230, degradation:0.003 },
  { id:"IBC",          label:"IBC (Interdigitated Back Contact — Maxeon/SunPower)",      eta:0.245, degradation:0.003 },
  { id:"BIPV_GLASS",   label:"BIPV — Sticlă semi-transparentă (Spandrel/Atrium)",       eta:0.080, degradation:0.006 },
  { id:"BIPV_TIGLA",   label:"BIPV — Țiglă solară (Solar Roof Tile)",                   eta:0.190, degradation:0.005 },
  { id:"BIPV_FOLIE",   label:"BIPV — Folie flexibilă (Thin-film pe membrană/acoperiș)", eta:0.110, degradation:0.006 },
];

export const PV_INVERTER_ETA = [
  { id:"STD",          label:"Invertor string standard (monofazat/trifazat)",             eta:0.974 },
  { id:"PREM",         label:"Invertor string premium (SMA / Fronius / SolarEdge string)", eta:0.985 },
  { id:"MICRO",        label:"Micro-invertoare per panou (Enphase IQ)",                   eta:0.970 },
  { id:"OPTIM",        label:"Optimizatoare de putere + invertor central (SolarEdge)",    eta:0.975 },
  { id:"HIBRID",       label:"Invertor hibrid cu baterie integrată (Huawei / SMA / Victron)", eta:0.963 },
  { id:"TRIFAZAT_COM", label:"Invertor trifazat comercial (>10 kW — ABB / Sungrow / Huawei)", eta:0.984 },
  { id:"OFF_GRID",     label:"Invertor off-grid / UPS solar (Victron / Studer)",           eta:0.940 },
];

export const TILT_FACTORS = {
  "0":0.87, "10":0.93, "15":0.96, "20":0.98, "25":0.99, "30":1.00,
  "35":1.00, "40":0.99, "45":0.97, "50":0.94, "60":0.87, "70":0.78, "90":0.56,
};

export const ORIENT_FACTORS = { S:1.00, SE:0.95, SV:0.95, E:0.82, V:0.82, NE:0.60, NV:0.60, N:0.45, Oriz:0.87 };

export const BIOMASS_TYPES = [
  // ── LEMN DE FOC ──────────────────────────────────────────────────────────
  { id:"LEMN_CRUD",    label:"Lemne de foc crude (umiditate 35–40%)",                    pci:2.90, fP_nren:0.09, fP_ren:1.00, fCO2:0.018 },
  { id:"LEMN_SEMI",    label:"Lemne de foc semi-uscate (umiditate 20%)",                 pci:3.50, fP_nren:0.09, fP_ren:1.00, fCO2:0.018 },
  { id:"LEMN_UCAT",    label:"Lemne de foc uscate (umiditate <15%)",                     pci:4.00, fP_nren:0.09, fP_ren:1.00, fCO2:0.018 },
  // ── PELEȚI ───────────────────────────────────────────────────────────────
  { id:"PELETI",       label:"Peleți din lemn clasa A1 (ENplus A1 — premium)",           pci:4.90, fP_nren:0.09, fP_ren:0.99, fCO2:0.039 },
  { id:"PELETI_A2",    label:"Peleți din lemn clasa A2 (ENplus A2 — industrial)",        pci:4.70, fP_nren:0.09, fP_ren:0.99, fCO2:0.039 },
  // ── BRICHETE ─────────────────────────────────────────────────────────────
  { id:"BRICHETE",     label:"Brichete din lemn (RUF / Nestro compactate, <12% umiditate)", pci:4.80, fP_nren:0.09, fP_ren:0.99, fCO2:0.035 },
  // ── TOCĂTURĂ ─────────────────────────────────────────────────────────────
  { id:"TOCATURA",     label:"Tocătură lemn G30 (chip, umiditate 30–35%)",               pci:3.10, fP_nren:0.09, fP_ren:0.99, fCO2:0.030 },
  { id:"TOCATURA_G50", label:"Tocătură lemn G50 (chip, umiditate 35–45%)",               pci:2.60, fP_nren:0.09, fP_ren:0.99, fCO2:0.030 },
  // ── AGROBIOMASĂ ──────────────────────────────────────────────────────────
  { id:"AGROPELETI",   label:"Agropeleți (coajă semințe floarea-soarelui / porumb)",     pci:4.50, fP_nren:0.05, fP_ren:1.00, fCO2:0.025 },
  { id:"PAIE",         label:"Paie comprimate / baloți presați (cereale)",               pci:4.20, fP_nren:0.05, fP_ren:1.00, fCO2:0.025 },
  // ── BIOCOMBUSTIBILI GAZOȘI / LICHIZI ─────────────────────────────────────
  { id:"BIOGAS",       label:"Biogaz (metan 55–65%, digestie anaerobă) — kWh/Nm³",      pci:6.00, fP_nren:0.00, fP_ren:1.00, fCO2:0.025 },
  { id:"BIOETANOL",    label:"Bioetanol (E100 — cereale/sfeclă) — kWh/kg",              pci:7.44, fP_nren:0.20, fP_ren:0.80, fCO2:0.027 },
  { id:"BIODIESEL",    label:"Biodiesel FAME (rapiță/deșeuri conform RED II) — kWh/kg", pci:9.80, fP_nren:0.20, fP_ren:0.90, fCO2:0.025 },
];

// ── STOCARE ENERGIE (nou — EPBD 2024/1275) ────────────────────────────────────
// efficiency: randament ciclu dus-întors (roundtrip efficiency, RTE) [-]
// selfDischarge: auto-descărcare [%/zi]
// cycles: cicluri viață la 80% DoD
export const BATTERY_STORAGE_TYPES = [
  { id:"LFP",          label:"Baterie Li-Ion LFP (LiFePO₄ — Litiu Fier Fosfat)",        efficiency:0.96, selfDischarge:0.050, cycles:6000 },
  { id:"NMC",          label:"Baterie Li-Ion NMC (Nichel Mangan Cobalt)",                efficiency:0.95, selfDischarge:0.080, cycles:2000 },
  { id:"LEAD_ACID",    label:"Baterie Lead-Acid / AGM / Gel (Plumb-Acid)",               efficiency:0.80, selfDischarge:0.200, cycles:800  },
  { id:"SALTWATER",    label:"Baterie Saltwater (electrolit apos salin — non-toxic)",    efficiency:0.85, selfDischarge:0.050, cycles:3000 },
  { id:"FLYWHEEL",     label:"Volant de inerție (Flywheel — stocare cinetică, UPS)",     efficiency:0.90, selfDischarge:5.000, cycles:100000 },
  { id:"THERMAL_TES",  label:"Stocare termică (boiler electric + TES, apă caldă 55–90°C)", efficiency:0.92, selfDischarge:0.500, cycles:50000 },
];

// ── PROFILE ORARE APORTURI INTERNE — Sprint 9b (17 apr 2026) ─────────────────
// Conform SR EN ISO 52016-1:2017 Anexa A.30 + CIBSE Guide A Tab. 6.5.
// Factori de ocupare relativi [0,1] per oră (0..23), separați weekday vs. weekend.
// Se multiplică cu aportul intern maxim (W/m² din COOLING_INTERNAL_GAINS) pentru
// a obține profilul orar Q_int_hourly[h] folosit în calculul de vârf CIBSE.
// ──────────────────────────────────────────────────────────────────────────────
export const INTERNAL_GAINS_PROFILES = {
  rezidential: {
    label: "Rezidențial (apartament + casă individuală)",
    weekday: [0.2,0.2,0.2,0.2,0.2,0.3,0.5,0.4,0.3,0.2,0.2,0.3,0.5,0.4,0.3,0.3,0.5,0.8,1.0,0.9,0.7,0.5,0.3,0.2],
    weekend: [0.3,0.2,0.2,0.2,0.2,0.2,0.3,0.4,0.5,0.5,0.5,0.5,0.6,0.5,0.5,0.5,0.7,0.8,1.0,0.9,0.7,0.5,0.4,0.3],
  },
  birouri: {
    label: "Birouri (8-18 activ, ocupare scăzută weekend)",
    weekday: [0.05,0.05,0.05,0.05,0.05,0.05,0.1,0.3,0.8,1.0,1.0,1.0,0.7,1.0,1.0,1.0,0.9,0.5,0.2,0.1,0.05,0.05,0.05,0.05],
    weekend: Array(24).fill(0.05),
  },
  scoli: {
    label: "Școli / educație (8-16 program, pauză 12-14)",
    weekday: [0.05,0.05,0.05,0.05,0.05,0.05,0.1,0.3,0.8,0.9,0.9,0.5,0.3,0.9,0.9,0.5,0.2,0.1,0.05,0.05,0.05,0.05,0.05,0.05],
    weekend: Array(24).fill(0.05),
  },
  comercial: {
    label: "Comerț / retail (9-21 activ, weekend similar)",
    weekday: [0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.4,0.8,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.7,0.5,0.3,0.2,0.1],
    weekend: [0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.3,0.5,0.8,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.8,0.6,0.4,0.3,0.2,0.1],
  },
  hotel: {
    label: "Hotel / cazare (ocupare dimineață + seară)",
    weekday: [0.6,0.5,0.5,0.5,0.5,0.6,0.8,0.9,0.7,0.4,0.3,0.3,0.4,0.3,0.3,0.3,0.4,0.5,0.7,0.9,1.0,1.0,0.9,0.7],
    weekend: [0.7,0.6,0.5,0.5,0.5,0.6,0.7,0.8,0.7,0.5,0.4,0.4,0.5,0.4,0.4,0.4,0.5,0.6,0.8,1.0,1.0,1.0,0.9,0.8],
  },
  spitale: {
    label: "Spitale / sănătate (24/24, ocupare ridicată)",
    weekday: [0.7,0.7,0.7,0.7,0.7,0.7,0.9,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.9,0.8,0.8,0.8,0.8,0.7],
    weekend: [0.7,0.7,0.7,0.7,0.7,0.7,0.8,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.9,0.8,0.8,0.8,0.8,0.7],
  },
};

// Mapare tipologie COOLING_INTERNAL_GAINS (engleză) → INTERNAL_GAINS_PROFILES (română)
export const COOLING_TYPE_TO_GAINS_PROFILE = {
  residential: "rezidential",
  office:      "birouri",
  school:      "scoli",
  retail:      "comercial",
  hospital:    "spitale",
  // hotel nu are echivalent în COOLING_INTERNAL_GAINS — se folosește direct cheia "hotel"
};
