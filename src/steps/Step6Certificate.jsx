import React from "react";
import ApartmentClasses from "../components/ApartmentClasses.jsx";
import CpeAnexa from "../components/CpeAnexa.jsx";

/**
 * Step6Certificate — Extracted from energy-calc.jsx lines 10211-12317
 * Certificate preview/generation, DOCX/PDF/XML export, auditor data,
 * nZEB report, energy class radar chart
 */
export default function Step6Certificate(props) {
  const {
    monthlyISO, instSummary, renewSummary, envelopeSummary,
    building, selectedClimate, lang, theme,
    heating, cooling, ventilation, lighting, acm,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew,
    opaqueElements, glazingElements, thermalBridges,
    auditor, setAuditor,
    setStep, goToStep,
    energyPrices,
    pdfPreviewHtml, setPdfPreviewHtml,
    pdfPreviewUrl, setPdfPreviewUrl,
    nzebReportHtml, setNzebReportHtml,
    certCount, incrementCertCount,
    projectList,
    showToast, tier, userTier,
    canExportDocx, canNzebReport, requireUpgrade, hasWatermark,
    presentationMode, setPresentationMode,
    financialAnalysis, finAnalysisInputs, setFinAnalysisInputs,
    exportPDFNative, exportQuickSheet, fetchTemplate,
    calcOpaqueR,
    // Constants passed as props
    Card, Badge, ResultRow, Select, Input, cn,
    getEnergyClass, getCO2Class, getNzebEpMax,
    ENERGY_CLASSES_DB, CLASS_LABELS, CLASS_COLORS, CO2_CLASSES_DB,
    NZEB_THRESHOLDS, ZEB_THRESHOLDS, ZEB_FACTOR,
    CATEGORY_BASE_MAP,
    BUILDING_CATEGORIES, ELEMENT_TYPES,
    FUELS, HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS,
    VENTILATION_TYPES, LIGHTING_TYPES, LIGHTING_CONTROL,
    SOLAR_THERMAL_TYPES, PV_TYPES,
    U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_GLAZING,
    CPE_TEMPLATES,
    REHAB_COSTS,
    getURefNZEB,
    bacsClass,
    buildingPhotos,
    t,
  } = props;

            const Au = parseFloat(building.areaUseful) || 0;
            const baseCatResolved = (CATEGORY_BASE_MAP?.[building.category]) || building.category;
            const catKey = baseCatResolved + (["RI","RC","RA"].includes(baseCatResolved) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, baseCatResolved);
            const rer = renewSummary?.rer || 0;
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";

            // ═══════════════════════════════════════════════════════════
            // GENERARE DOCX CU DOCXTEMPLATER + PIZZIP
            // ═══════════════════════════════════════════════════════════

            const fmtRo = (v, dec=1) => {
              const n = parseFloat(v) || 0;
              return n.toFixed(dec).replace(".", ",");
            };

            const generateDocxCPE = async (fileOrBuffer, mode="cpe", {download=true}={}) => {
              if (!fileOrBuffer) return;
              if (Au <= 0) { showToast("Completați Au în Pasul 1.", "error"); return; }
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }

              try {
                const arrayBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();

                // ── Calcul valori finale ──
                const co2Final_m2 = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
                const qfFinal_t = Au > 0 ? (instSummary.qf_h + instSummary.qf_w) / Au : 0;
                const qfFinal_e = Au > 0 ? (instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) / Au : 0;

                const sre_st = renewSummary && Au > 0 ? renewSummary.qSolarTh / Au : 0;
                const sre_pv = renewSummary && Au > 0 ? renewSummary.qPV_kWh / Au : 0;
                const sre_pc = renewSummary && Au > 0 ? renewSummary.qPC_ren / Au : 0;
                const sre_bio = renewSummary && Au > 0 ? renewSummary.qBio_ren / Au : 0;
                const sre_other = renewSummary && Au > 0 ? (renewSummary.qWind + (renewSummary.qCogen_el||0) + (renewSummary.qCogen_th||0)) / Au : 0;
                const sre_total = renewSummary && Au > 0 ? renewSummary.totalRenewable / Au : 0;

                const Aref = parseFloat(building.areaUseful) || 0;
                const Vol = parseFloat(building.volume) || 0;
                const latV = selectedClimate?.lat || 0;
                const CITY_LNG = {"București":26.10,"Cluj-Napoca":23.60,"Constanța":28.65,"Timișoara":21.23,"Iași":27.59,"Brașov":25.59,"Sibiu":24.15,"Craiova":23.80,"Galați":28.05,"Oradea":21.92,"Ploiești":25.98,"Brăila":27.97,"Arad":21.31,"Pitești":24.87,"Bacău":26.91,"Târgu Mureș":24.55,"Baia Mare":23.58,"Buzău":26.82,"Botoșani":26.67,"Satu Mare":22.88,"Râmnicu Vâlcea":24.37,"Suceava":26.25,"Drobeta-Turnu Severin":22.66,"Târgoviște":25.46,"Focșani":27.19,"Reșița":21.89,"Bistrița":24.50,"Alba Iulia":23.57,"Tulcea":28.79,"Slobozia":27.37,"Călărași":27.33,"Giurgiu":25.97,"Vaslui":27.73,"Deva":22.90,"Sfântu Gheorghe":25.79,"Zalău":23.06,"Miercurea Ciuc":25.80,"Piatra Neamț":26.38,"Târgu Jiu":23.28,"Alexandria":25.33,"Hunedoara":22.90,"Petroșani":23.37,"Mediaș":24.35,"Lugoj":21.90,"Sighișoara":24.79,"Mangalia":28.58,"Dej":23.87,"Curtea de Argeș":24.67,"Câmpina":25.74,"Câmpulung":24.97,"Turda":23.78,"Caransebeș":22.22,"Blaj":23.92,"Odorheiu Secuiesc":25.30,"Reghin":24.71,"Tecuci":27.43,"Roșiorii de Vede":24.98};
                const lngV = selectedClimate ? (CITY_LNG[selectedClimate.name] || 25.0) : 0;

                const fullAddress = [building.address, building.city, building.county].filter(Boolean).join(", ");
                const yearStr = building.yearBuilt || "____";
                const regimStr = building.floors || "____";
                const nrCam = building.units || "3";
                const arieDesf = Aref * 1.15;

                const baseCat = baseCatResolved; // sub-categorie rezolvată la baza Mc 001-2022
                const co2Grid = CO2_CLASSES_DB[baseCat] || CO2_CLASSES_DB.AL;
                const epRefMax = getNzebEpMax(baseCat, selectedClimate?.zone) || 148;

                const scaleEP = (ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[baseCat] || ENERGY_CLASSES_DB.AL).thresholds;

                const scopeLabels = {"vanzare":"Vânzare","inchiriere":"Închiriere","receptie":"Recepție","informare":"Informare","renovare":"Renovare majoră","alt":"Alt scop"};
                const expiryD = new Date(auditor.date || new Date());
                expiryD.setFullYear(expiryD.getFullYear() + 10);
                const nzebDocx = NZEB_THRESHOLDS[baseCat] || NZEB_THRESHOLDS.AL;
                const nzebOk = epFinal <= epRefMax && (renewSummary?.rer || 0) >= nzebDocx.rer_min;
                const enClassDocx = getEnergyClass(epFinal, catKey);
                const epTotalReal = Au > 0 ? epFinal * Au : 0;
                const epTotalRef = Au > 0 ? epRefMax * Au : 0;
                const gwpVal = parseFloat(building.gwpLifecycle) || 0;
                const ybDocx = parseInt(building.yearBuilt) || 2000;
                const embodiedDocx = ybDocx >= 2020 ? (["RI","RC","RA"].includes(baseCat) ? 10 : 12) : 5;
                const gwpTotalDocx = gwpVal > 0 ? gwpVal : (co2Final_m2 + embodiedDocx);

                // ═══════════════════════════════════════════
                // APEL API PYTHON — python-docx pe template original
                // ═══════════════════════════════════════════
                const templateBase64 = btoa(new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ""));

                const payload = {
                  template: templateBase64,
                  mode: mode,
                  category: baseCat,
                  photo: auditor.photo || null,
                  data: {
                    year: yearStr,
                    expiry: expiryD.toLocaleDateString("ro-RO"),
                    address: fullAddress,
                    gps: fmtRo(latV, 4) + " x " + fmtRo(lngV, 4),
                    regime: regimStr,
                    scope: scopeLabels[building.scopCpe] || "Vânzare",
                    software: "Zephren v2.0",
                    area_ref: fmtRo(Aref, 1),
                    area_gross: fmtRo(arieDesf, 1),
                    volume: Math.round(Vol).toString(),
                    nr_units: nrCam,
                    category_label: BUILDING_CATEGORIES.find(c=>c.id===baseCat)?.label || "",
                    city: building.city || "",
                    county: building.county || "",
                    climate_zone: selectedClimate?.zone ? "zona " + selectedClimate.zone : "",
                    ep_total_real: fmtRo(epTotalReal, 1),
                    ep_total_ref: fmtRo(epTotalRef, 1),
                    qf_thermal: fmtRo(qfFinal_t, 1),
                    qf_electric: fmtRo(qfFinal_e, 1),
                    ep_specific: fmtRo(epFinal, 1),
                    ep_ref: fmtRo(epRefMax, 1),
                    co2_val: fmtRo(co2Final_m2, 1),
                    sre_st: fmtRo(sre_st, 1),
                    sre_pv: fmtRo(sre_pv, 1),
                    sre_pc: fmtRo(sre_pc, 1),
                    sre_bio: fmtRo(sre_bio, 1),
                    sre_other: fmtRo(sre_other, 1),
                    sre_total: fmtRo(sre_total, 1),
                    s_ap: String(scaleEP[0]), s_a: String(scaleEP[1]), s_b: String(scaleEP[2]),
                    s_c: String(scaleEP[3]), s_d: String(scaleEP[4]), s_e: String(scaleEP[5]), s_f: String(scaleEP[6]),
                    co2_ap: fmtRo(co2Grid.thresholds[0],1), co2_a: fmtRo(co2Grid.thresholds[1],1),
                    co2_b: fmtRo(co2Grid.thresholds[2],1), co2_c: fmtRo(co2Grid.thresholds[3],1),
                    co2_d: fmtRo(co2Grid.thresholds[4],1), co2_e: fmtRo(co2Grid.thresholds[5],1),
                    co2_f: fmtRo(co2Grid.thresholds[6],1),
                    auditor_name: auditor.name || "",
                    auditor_atestat: auditor.atestat || "",
                    auditor_company: auditor.company || "",
                    auditor_phone: auditor.phone || "",
                    auditor_email: auditor.email || "",
                    auditor_date: auditor.date ? auditor.date.split("-").reverse().join(".") : "",
                    auditor_mdlpa: auditor.mdlpaCode || "",
                    energy_class: enClassDocx.cls,
                    ep_class_real: enClassDocx.cls,
                    ep_class_ref: getEnergyClass(epRefMax, catKey).cls,
                    co2_class_real: getCO2Class(co2Final_m2, baseCatResolved).cls,
                    rer: renewSummary ? fmtRo(renewSummary.rer, 1) : "0,0",
                    nzeb: nzebOk ? "DA" : "NU",
                    gwp: fmtRo(gwpTotalDocx, 1),
                    // Date instalații + anvelopă (pentru checkbox-uri Anexa)
                    heating_source: heating.source || "",
                    heating_fuel: heating.fuel || "",
                    heating_control: heating.control || "",
                    heating_power: String(heating.nominalPower || 0),
                    acm_source: acm.source || "",
                    cooling_source: cooling.source || "",
                    cooling_has: instSummary?.hasCool ? "true" : "false",
                    ventilation_type: ventilation.type || "",
                    lighting_type: lighting.type || "",
                    lighting_control: lighting.control || "",
                    solar_thermal_enabled: solarThermal.enabled ? "true" : "false",
                    pv_enabled: photovoltaic.enabled ? "true" : "false",
                    heat_pump_enabled: heatPump.enabled ? "true" : "false",
                    heat_pump_type: heatPump.type || "",
                    biomass_enabled: biomass.enabled ? "true" : "false",
                    biomass_type: biomass.type || "",
                    wind_enabled: (otherRenew && otherRenew.windEnabled) ? "true" : "false",
                    structure: building.structure || "",
                    year_built: building.yearBuilt || "",
                    climate_zone_num: String(parseInt(selectedClimate?.zone) || 3),
                    opaque_u_values: JSON.stringify(opaqueElements.map(function(el) {
                      if (!el.layers || el.layers.length === 0) return {type: el.type, u: 0};
                      var elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                      var rsi = elType ? elType.rsi : 0.13;
                      var rse = elType ? elType.rse : 0.04;
                      var rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                      return {type: el.type, u: rL > 0 ? 1/(rsi+rL+rse) : 0};
                    })),
                    glazing_max_u: String(glazingElements.length > 0 ? Math.max(0, ...glazingElements.map(function(e){return parseFloat(e.u)||0;})) : 0),
                  },
                  buildingPhotos: (buildingPhotos || []).slice(0, 6).map(p => ({ url: p.url, label: p.label || "", zone: p.zone || "altele", note: p.note || "" })),
                };

                const resp = await fetch("/api/generate-cpe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({ error: "Server error" }));
                  throw new Error(err.error || "Eroare server: " + resp.status);
                }

                const blob = await resp.blob();

                // Tot post-processing-ul (checkboxes, foto, scale) se face server-side în Python

                // [Checkpoint: tot codul vechi de post-processing (checkboxes, foto, repack) a fost eliminat]
                // [Python API gestionează totul server-side]
                if (false && mode === "anexa_DISABLED") {
                  // TOT ACEST BLOC E DEZACTIVAT — python-docx face totul server-side
                  const checkCB = (n) => {
                    let count = 0;
                    xml = xml.replace(/<w:checkBox><w:sizeAuto\/><w:default w:val="0"\/><\/w:checkBox>/g, (match) => {
                      if (count === n) { count++; return '<w:checkBox><w:sizeAuto/><w:default w:val="1"/></w:checkBox>'; }
                      count++;
                      return match;
                    });
                  };

                  // ── Helper: bifează mai multe checkbox-uri dintr-o dată (eficient) ──
                  const checkCBs = (indices) => {
                    const set = new Set(indices);
                    let count = 0;
                    xml = xml.replace(/<w:checkBox><w:sizeAuto\/><w:default w:val="0"\/><\/w:checkBox>/g, (match) => {
                      const result = set.has(count) ? '<w:checkBox><w:sizeAuto/><w:default w:val="1"/></w:checkBox>' : match;
                      count++;
                      return result;
                    });
                  };

                  const isRes = ["RI","RC","RA"].includes(building.category);
                  const uRef = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
                  const hSource = HEAT_SOURCES.find(function(h){return h.id===heating.source;});
                  const acmSrc = ACM_SOURCES.find(function(a){return a.id===acm.source;});
                  const coolSrc = COOLING_SYSTEMS.find(function(c){return c.id===cooling.source;});
                  const ventType = VENTILATION_TYPES.find(function(v){return v.id===ventilation.type;});
                  const lightType = LIGHTING_TYPES.find(function(l){return l.id===lighting.type;});
                  const lightCtrl = LIGHTING_CONTROL.find(function(l){return l.id===lighting.control;});

                  // ══════════════════════════════════════
                  // ANEXA 1 — RECOMANDĂRI (CB 0-64)
                  // ══════════════════════════════════════
                  const cbAnex1 = [];

                  // Anvelopă — bifăm dacă U calculat > U referință
                  const opaqueU = opaqueElements.map(function(el) {
                    if (!el.layers || el.layers.length === 0) return { type: el.type, u: 999 };
                    const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                    const rsi = elType ? elType.rsi : 0.13;
                    const rse = elType ? elType.rse : 0.04;
                    const rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                    return { type: el.type, u: 1/(rsi+rL+rse) };
                  });
                  // CB0: pereți exteriori neconformi
                  if (opaqueU.some(function(e){ return e.type==="PE" && e.u > (uRef.PE||0.25); })) cbAnex1.push(0);
                  // CB1: planșeu peste subsol
                  if (opaqueU.some(function(e){ return e.type==="PB" && e.u > (uRef.PB||0.29); })) cbAnex1.push(1);
                  // CB2: terasă/planșeu sub pod
                  if (opaqueU.some(function(e){ return (e.type==="PT"||e.type==="PP") && e.u > (uRef[e.type]||0.15); })) cbAnex1.push(2);
                  // CB3: planșee contact exterior / placă pe sol
                  if (opaqueU.some(function(e){ return (e.type==="PL"||e.type==="SE") && e.u > (uRef[e.type]||0.20); })) cbAnex1.push(3);
                  // CB5: tâmplărie
                  const uGlazRef = isRes ? 1.30 : 1.80;
                  if (glazingElements.some(function(e){ return (parseFloat(e.u)||0) > uGlazRef; })) cbAnex1.push(5);
                  // CB6: grile ventilare higroreglabile
                  if (!ventilation.type || ventilation.type === "natural_neorg") cbAnex1.push(6);
                  // CB13: robinete termostat
                  if (heating.source && !["electric_direct","pc_aer_aer"].includes(heating.source)) cbAnex1.push(13);
                  // CB21: automatizare
                  if (!heating.control || heating.control === "manual") cbAnex1.push(21);
                  // CB25: iluminat LED
                  if (lighting.type && lighting.type !== "led") cbAnex1.push(25);
                  // CB26: senzori prezență
                  if (!lighting.control || !["sensor_presence","daylight_dimming"].includes(lighting.control)) cbAnex1.push(26);
                  // CB27: regenerabile
                  if (!solarThermal.enabled && !photovoltaic.enabled) cbAnex1.push(27);
                  // CB28: recuperare căldură
                  if (!ventilation.type || !ventilation.type.includes("mec_hr")) cbAnex1.push(28);

                  // Estimare costuri (CB 48-53): < 1000, 1k-10k, 10k-25k, 25k-50k, 50k-100k, > 100k
                  const totalCostEst = (financialAnalysis?.totalInvestment || annualEnergyCost?.totalEur || 0);
                  if (totalCostEst < 1000) cbAnex1.push(48);
                  else if (totalCostEst < 10000) cbAnex1.push(49);
                  else if (totalCostEst < 25000) cbAnex1.push(50);
                  else if (totalCostEst < 50000) cbAnex1.push(51);
                  else if (totalCostEst < 100000) cbAnex1.push(52);
                  else cbAnex1.push(53);

                  // Estimare economii energie (CB 54-59): <10%, 10-20, 20-30, 30-40, 40-50, >60%
                  const savings = financialAnalysis?.energySavingsPercent || 20;
                  if (savings < 10) cbAnex1.push(54);
                  else if (savings < 20) cbAnex1.push(55);
                  else if (savings < 30) cbAnex1.push(56);
                  else if (savings < 40) cbAnex1.push(57);
                  else if (savings < 50) cbAnex1.push(58);
                  else cbAnex1.push(59);

                  // Durată recuperare (CB 60-64): <1 an, 1-3, 3-7, 7-10, >10
                  const payback = financialAnalysis?.paybackYears || 5;
                  if (payback < 1) cbAnex1.push(60);
                  else if (payback < 3) cbAnex1.push(61);
                  else if (payback < 7) cbAnex1.push(62);
                  else if (payback < 10) cbAnex1.push(63);
                  else cbAnex1.push(64);

                  // ══════════════════════════════════════
                  // ANEXA 2 — DATE CLĂDIRE (CB 65+)
                  // ══════════════════════════════════════

                  // Tipul clădirii: CB65=existentă, CB66=nouă finalizată, CB67=existentă nefinalizată
                  const yearB = parseInt(building.yearBuilt) || 2000;
                  if (yearB >= new Date().getFullYear() - 1) cbAnex1.push(66); // nouă finalizată
                  else cbAnex1.push(65); // existentă

                  // Categoria clădirii (CB 68-111)
                  const catCBMap = {
                    RI: [68, 69],   // rezidențial + casă individuală
                    RC: [68, 71],   // rezidențial + bloc locuințe
                    RA: [68, 71],   // rezidențial + bloc locuințe
                    BI: [79, 80],   // birouri + birouri
                    ED: [74, 76],   // învățământ + școală
                    SA: [86, 87],   // sănătate + spital
                    HC: [94, 95],   // turism + hotel
                    CO: [103, 104], // comerț + magazin mic
                    SP: [99, 100],  // sport + sală
                    AL: [108, 111], // alte tipuri + alte clădiri
                  };
                  const catCBs = catCBMap[building.category] || catCBMap.AL;
                  catCBs.forEach(function(cb){ cbAnex1.push(cb); });

                  // Zone climatice (CB 112-116 = zone I-V)
                  const zoneNum = parseInt(selectedClimate?.zone) || 3;
                  if (zoneNum >= 1 && zoneNum <= 5) cbAnex1.push(111 + zoneNum); // CB112=I, CB113=II, ...

                  // Zone eoliene (CB 117-120 = zone I-IV)
                  // Derivăm zona eoliană din locație (simplificat: câmpie=I-II, munte=III-IV)
                  const windZone = zoneNum <= 2 ? 1 : (zoneNum <= 4 ? 2 : 3);
                  if (windZone >= 1 && windZone <= 4) cbAnex1.push(116 + windZone);

                  // Structura constructivă (CB 127-134)
                  const structCBMap = {
                    "Zidărie portantă": 127,
                    "Cadre beton armat": 129,
                    "Panouri prefabricate mari": 133,
                    "Structură metalică": 132,
                    "Structură lemn": 131,
                    "Mixtă": 134,
                  };
                  const structCB = structCBMap[building.structure];
                  if (structCB) cbAnex1.push(structCB);

                  // ── ÎNCĂLZIRE (CB 135+) ──
                  // CB135=Da funcțională, CB136=Da nefuncțională, CB137=Nu
                  if (heating.source) cbAnex1.push(135); else cbAnex1.push(137);

                  // Sursa încălzire (CB 138-149)
                  if (heating.source) {
                    const heatSrcCBMap = {
                      gaz_conv: 144,    // CT în clădire
                      gaz_cond: 144,
                      termoficare: 146, // Termoficare
                      electric_direct: 139, // Sursă electrică
                      pc_aer_apa: 149,  // Altă sursă
                      pc_aer_aer: 139,
                      pc_sol_apa: 149,
                      pc_apa_apa: 149,
                      centrala_gpl: 144,
                      cazan_lemn: 138,  // Sursă proprie
                      cazan_peleti: 138,
                      soba_teracota: 138,
                      pompa_caldura: 149,
                    };
                    const hCB = heatSrcCBMap[heating.source];
                    if (hCB) cbAnex1.push(hCB);
                  }

                  // Tipul sistemului de încălzire (CB 150-157)
                  if (heating.source === "soba_teracota") cbAnex1.push(150);
                  else if (heating.source === "electric_direct") cbAnex1.push(154);
                  else cbAnex1.push(151); // corpuri statice (default)

                  // Tip distribuție (CB 160=inferioară, 161=superioară, 162=mixtă)
                  cbAnex1.push(160); // default inferioară

                  // ── ACM (CB 176+) ──
                  if (acm.source) cbAnex1.push(176); else cbAnex1.push(178);

                  // Sursa ACM (CB 179-186)
                  if (acm.source) {
                    const acmSrcCBMap = {
                      ct_prop: 181,     // CT în clădire
                      boiler_electric: 180, // Sursă electrică
                      termoficare: 183,
                      solar_termic: 179,
                      pc: 186,
                    };
                    const aCB = acmSrcCBMap[acm.source];
                    if (aCB) cbAnex1.push(aCB);
                  }

                  // Echipament ACM (CB 187-190)
                  if (acm.source === "boiler_electric") cbAnex1.push(187); // Boiler acumulare
                  else if (acm.source === "ct_prop") cbAnex1.push(188); // Instant

                  // Recirculare ACM (CB 193=funcțională, 194=nu funcționează, 195=nu există)
                  cbAnex1.push(195); // default: nu există

                  // ── RĂCIRE/CLIMATIZARE (CB 202+) ──
                  const hasCool = instSummary && instSummary.hasCool;
                  if (hasCool) cbAnex1.push(202); else cbAnex1.push(204);

                  // Tip sursă frig (CB 205-215)
                  if (hasCool && cooling.source) {
                    const coolCBMap = {
                      split: 214,
                      chiller_aer: 205,
                      chiller_apa: 206,
                      pc_aer_apa: 207,
                      pc_apa_apa: 208,
                      pc_aer_aer: 209,
                      monobloc: 213,
                    };
                    const cCB = coolCBMap[cooling.source];
                    if (cCB) cbAnex1.push(cCB);
                  }

                  // Climatizat complet/parțial (CB 229=complet, 230=global, 231=parțial)
                  if (hasCool) cbAnex1.push(229);

                  // Fără controlul umidității (CB 232)
                  if (hasCool) cbAnex1.push(232);

                  // ── VENTILARE MECANICĂ (CB 256+) ──
                  const hasVent = ventilation.type && ventilation.type !== "natural_neorg";
                  if (hasVent) cbAnex1.push(256); else cbAnex1.push(258);

                  // Tip ventilare (CB 259-265)
                  if (ventilation.type === "natural_neorg") cbAnex1.push(259);
                  else if (ventilation.type === "natural_org") cbAnex1.push(260);
                  else if (hasVent) cbAnex1.push(261); // Mecanică

                  // Recuperator (CB 270=Da, 271=Nu)
                  if (ventilation.type && ventilation.type.includes("hr")) cbAnex1.push(270);
                  else cbAnex1.push(271);

                  // ── ILUMINAT (CB 272+) ──
                  if (lighting.type) cbAnex1.push(272); else cbAnex1.push(274);

                  // Control iluminat (CB 275-280)
                  if (lighting.control === "manual") cbAnex1.push(276);
                  else if (lighting.control === "daylight_dimming") { cbAnex1.push(277); cbAnex1.push(278); }
                  else if (lighting.control === "sensor_presence") { cbAnex1.push(277); cbAnex1.push(279); }
                  else cbAnex1.push(275); // Funcționare on/off

                  // Tip iluminat (CB 281-284)
                  if (lighting.type === "fluorescent") cbAnex1.push(281);
                  else if (lighting.type === "incandescent") cbAnex1.push(282);
                  else if (lighting.type === "led") cbAnex1.push(283);
                  else cbAnex1.push(284); // Mixt

                  // Stare rețea (CB 285=Bună default)
                  cbAnex1.push(285);

                  // ── REGENERABILE (CB 288+) ──
                  // Panouri termosolare: CB288=Există, CB289=Nu
                  if (solarThermal.enabled) cbAnex1.push(288); else cbAnex1.push(289);
                  // PV: CB290=Există, CB291=Nu există
                  if (photovoltaic.enabled) cbAnex1.push(290); else cbAnex1.push(291);
                  // Pompă căldură: CB292=Există, CB293=Nu
                  if (heatPump.enabled) cbAnex1.push(292); else cbAnex1.push(293);
                  // Tip PC (CB 294-300)
                  if (heatPump.enabled) {
                    const pcCBMap = { "sol_apa_deschisa":294, "sol_apa_inchisa":295, "aer_apa":296, "aer_aer":297, "apa_aer":298, "sol_aer":299 };
                    const pcCB = pcCBMap[heatPump.type];
                    if (pcCB) cbAnex1.push(pcCB);
                  }
                  // Biomasă: CB301=Există, CB302=Nu
                  if (biomass.enabled) cbAnex1.push(301); else cbAnex1.push(302);
                  // Tip biomasă (CB 303-305)
                  if (biomass.enabled) {
                    if (biomass.type === "peleti") cbAnex1.push(303);
                    else if (biomass.type === "brichete") cbAnex1.push(304);
                    else cbAnex1.push(305);
                  }
                  // Eoliană: CB306=Există, CB307=Nu
                  if (otherRenew && otherRenew.windEnabled) cbAnex1.push(306); else cbAnex1.push(307);

                  // ── Aplică toate checkbox-urile dintr-o dată ──
                  checkCBs(cbAnex1);

                  // ══════════════════════════════════════
                  // ANEXA 1 — TEXT: adresa, nr certificat
                  // ══════════════════════════════════════
                  rWTpart("[adresa]", fullAddress);
                  xml = xml.replace(/(<w:t[^>]*>)\.{6,}(<\/w:t>)/g, function(match, p1, p2) {
                    // Golim primele 2 grupuri de puncte (nr certificat)
                    return p1 + " " + p2;
                  });

                  // An construcție/renovare
                  rWTpart(".................","" + yearStr + (building.yearRenov ? " / " + building.yearRenov : ""));

                  // ══════════════════════════════════════
                  // ANEXA 2 — GEOMETRIE + CLIMAT
                  // ══════════════════════════════════════
                  const seV = Vol > 0 ? (parseFloat(building.areaEnvelope) || 0) / Vol : 0;
                  const nrPers = Math.max(1, Math.round(Aref / (isRes ? 30 : 15)));

                  // Regim înălțime — numerele din template: noduri "2 (nr)" și "5 (nr)"
                  const floorCount = parseInt(building.floors?.replace(/[^0-9]/g, "")) || 0;
                  rWT("2\n(nr)", String(building.basement ? 1 : 0));

                  // Arii și volume
                  // Nodurile din Anexa 2 ce conțin "m2" sau "m³" sunt lângă valori
                  // Folosim rWTpart pentru a completa valorile

                  // Arie referință totală pardoseală
                  rWTpart("Aria de referință totală", "Aria de referință totală a pardoselii: " + fmtRo(Aref, 1));
                  // Volumul interior de referință
                  rWTpart("Volumul interior de referință", "Volumul interior de referință V: " + fmtRo(Vol, 1));

                  // Factor formă
                  rWTpart("Factorul de formă", "Factorul de formă al clădirii, SE/V: " + fmtRo(seV, 3));

                  // Număr persoane
                  rWTpart("pers.", fmtRo(nrPers, 0) + " pers.");

                  // ══════════════════════════════════════
                  // ANEXA 2 — TABEL ANVELOPĂ
                  // ══════════════════════════════════════
                  // Template-ul are rânduri fixe: PE 1, PE 2, FE, UE, TE, Sb, CS, ...
                  // Completăm cu valorile calculate per element
                  opaqueElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                    const rsi = elType ? elType.rsi : 0.13;
                    const rse = elType ? elType.rse : 0.04;
                    const rL = el.layers ? el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0) : 0;
                    const uCalc = rL > 0 ? 1/(rsi+rL+rse) : 0;
                    const rCalc = uCalc > 0 ? 1/uCalc : 0;
                    const uRefEl = uRef[el.type] || 0;
                    const rRefEl = uRefEl > 0 ? 1/uRefEl : 0;
                    rWT("E" + n + "_den", el.name || "Element " + n);
                    rWT("E" + n + "_tip", elType?.label || el.type);
                    rWT("E" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("E" + n + "_U", fmtRo(uCalc, 3));
                    rWT("E" + n + "_R", fmtRo(rCalc, 3));
                    rWT("E" + n + "_Rref", fmtRo(rRefEl, 3));
                    rWT("E" + n + "_ori", el.orientation || "—");
                    if (el.layers && el.layers.length > 0) {
                      const layerStr = el.layers.map(function(l){ return (l.matName||"?") + " " + (l.thickness||0) + "mm, λ=" + (l.lambda||0); }).join("; ");
                      rWT("E" + n + "_str", layerStr);
                    }
                  });

                  // Arie totală anvelopă
                  const seTotal = parseFloat(building.areaEnvelope) || opaqueElements.reduce(function(s,e){ return s + (parseFloat(e.area)||0); }, 0) + glazingElements.reduce(function(s,e){ return s + (parseFloat(e.area)||0); }, 0);
                  rWTpart("Aria totală a anvelopei", "Aria totală a anvelopei, SE: " + fmtRo(seTotal, 1));

                  // Tabel elemente vitrate
                  glazingElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    rWT("V" + n + "_den", el.name || "Vitraj " + n);
                    rWT("V" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("V" + n + "_U", fmtRo(el.u || 0, 2));
                    rWT("V" + n + "_g", fmtRo(el.g || 0, 2));
                    rWT("V" + n + "_ori", el.orientation || "—");
                    rWT("V" + n + "_tip", el.glazingType || "—");
                  });

                  // Punți termice sumar
                  const tbTotal = thermalBridges.reduce(function(s,b){ return s + (parseFloat(b.psi)||0) * (parseFloat(b.length)||0); }, 0);
                  rWT("PT_total", fmtRo(tbTotal, 1));
                  rWT("PT_nr", String(thermalBridges.length));

                  // ══════════════════════════════════════
                  // ANEXA 2 — DETALII INSTALAȚII
                  // ══════════════════════════════════════
                  // Încălzire
                  if (hSource) {
                    rWTpart("sursa incalzire", hSource.label);
                    rWTpart("sursa încălzire", hSource.label);
                    rWTpart("randament generare", fmtRo(heating.eta_gen || (hSource.eta_gen || 0), 2));
                    rWTpart("putere nominala", fmtRo(heating.nominalPower || 0, 1));
                    // Combustibil — completăm textul "combustibil ....."
                    const fuelLabel = FUELS.find(function(f){return f.id===heating.fuel;})?.label || "";
                    if (fuelLabel) {
                      rWTpart("combustibil .....................", "combustibil " + fuelLabel);
                      rWTpart("cu combustibil\n", "cu combustibil " + fuelLabel + "\n");
                    }
                    // Putere nominală în kW
                    rWTpart("Necesarul de căldură de calcul", "Necesarul de căldură de calcul (sarcina termică necesară) " + fmtRo(heating.nominalPower || 0, 1));
                    rWTpart("Puterea termică instalată totală pentru încălzire", "Puterea termică instalată totală pentru încălzire " + fmtRo(heating.nominalPower || 0, 1));
                  }

                  // ACM
                  if (acmSrc) {
                    rWTpart("sursa ACM", acmSrc.label);
                    const acmFuel = FUELS.find(function(f){return f.id===acm.fuel;})?.label || "";
                    if (acmFuel) rWTpart("combustibil ...........", "combustibil " + acmFuel);
                  }

                  // Răcire
                  if (hasCool && coolSrc) {
                    rWTpart("Valoarea nominală medie a coeficientului", "Valoarea nominală medie a coeficientului de performanță EER al sursei de răcire: " + fmtRo(cooling.eer || cooling.cop || 3.0, 1));
                  }

                  // Ventilare — eficiență HR
                  if (hasVent) {
                    const hrEta = ventilation.hrEta || (instSummary?.hrEta || 0);
                    rWTpart("Eficiență declarată pe durata verii/iernii", "Eficiență declarată pe durata verii/iernii: " + fmtRo(hrEta * 100, 0) + " / " + fmtRo(hrEta * 100, 0));
                  }

                  // Iluminat — puteri
                  const pNecIlum = Au > 0 && instSummary?.leni ? (instSummary.leni * Au / 8760 || 0) : 0;
                  rWTpart("Puterea electrică totală necesară a sistemului de iluminat", "Puterea electrică totală necesară a sistemului de iluminat: " + fmtRo(pNecIlum, 1));
                  rWTpart("Puterea electrică instalată totală a sistemului de iluminat", "Puterea electrică instalată totală a sistemului de iluminat: " + fmtRo(pNecIlum * 1.2, 1));

                  // ══════════════════════════════════════
                  // ANEXA 2 — SURSE REGENERABILE (detalii text)
                  // ══════════════════════════════════════
                  if (solarThermal.enabled) {
                    const stType = SOLAR_THERMAL_TYPES.find(function(t){return t.id===solarThermal.type;});
                    rWTpart("Tip panou (plan, cu tuburi vidate etc.)", "Tip panou: " + (stType?.label || solarThermal.type || "plan"));
                    rWTpart("Număr panouri\n", "Număr panouri: " + (solarThermal.panels || Math.ceil((parseFloat(solarThermal.area)||4)/2)) + "\n");
                  }
                  if (photovoltaic.enabled) {
                    const pvType = PV_TYPES.find(function(t){return t.id===photovoltaic.type;});
                    rWTpart("Tip panou (\nmonocristalin", "Tip panou: " + (pvType?.label || "monocristalin"));
                    rWTpart("Număr panouri\n", "Număr panouri: " + (photovoltaic.panels || Math.ceil((parseFloat(photovoltaic.kWp)||3)/0.4)) + "\n");
                  }
                  if (heatPump.enabled) {
                    rWTpart("Număr pompe de căldură", "Număr pompe de căldură: 1");
                    rWTpart("Valoarea medie", "Valoarea medie SCOP/SEER: " + fmtRo(heatPump.cop || 3.5, 1));
                  }

                  // Energie exportată
                  const expTh = renewSummary ? (renewSummary.exportedThermal || 0) : 0;
                  const expEl = renewSummary ? (renewSummary.exportedElectric || renewSummary.qPV_kWh || 0) : 0;
                  // Nod "Energia termică exportată:" urmat de un nod cu valoare
                  rWTpart("Energia termică exportată:", "Energia termică exportată: " + fmtRo(expTh, 0));
                  rWTpart("Energia electrică exportată:", "Energia electrică exportată: " + fmtRo(expEl, 0));
                  rWTpart("Energia termică exportată din surse regenerabile", "Energia termică exportată din surse regenerabile: " + fmtRo(expTh, 0));
                  rWTpart("Energia electrică exportată din surse regenerabile", "Energia electrică exportată din surse regenerabile: " + fmtRo(expEl, 0));

                  // ══════════════════════════════════════
                  // ANEXA 2 — INDICATORI + CONSUM DETALIAT
                  // ══════════════════════════════════════
                  // Clasa energetică text
                  rWT("CLASA_EP", enClassDocx.cls);
                  rWT("NOTA_EP", String(enClassDocx.score));

                  // Consum specific pe utilități (Anexa detaliată)
                  if (instSummary) {
                    rWT("qf_inc", fmtRo(Au > 0 ? instSummary.qf_h / Au : 0, 1));
                    rWT("qf_acm", fmtRo(Au > 0 ? instSummary.qf_w / Au : 0, 1));
                    rWT("qf_rac", fmtRo(Au > 0 ? instSummary.qf_c / Au : 0, 1));
                    rWT("qf_ven", fmtRo(Au > 0 ? instSummary.qf_v / Au : 0, 1));
                    rWT("qf_ilu", fmtRo(Au > 0 ? instSummary.qf_l / Au : 0, 1));
                    rWT("ep_inc", fmtRo(Au > 0 ? (instSummary.ep_h||0) / Au : 0, 1));
                    rWT("ep_acm", fmtRo(Au > 0 ? (instSummary.ep_w||0) / Au : 0, 1));
                    rWT("ep_rac", fmtRo(Au > 0 ? (instSummary.ep_c||0) / Au : 0, 1));
                    rWT("ep_ven", fmtRo(Au > 0 ? (instSummary.ep_v||0) / Au : 0, 1));
                    rWT("ep_ilu", fmtRo(Au > 0 ? (instSummary.ep_l||0) / Au : 0, 1));
                    // CO2 per utilitate
                    rWT("co2_inc", fmtRo(Au > 0 ? (instSummary.co2_h_m2||0) : 0, 1));
                    rWT("co2_acm", fmtRo(Au > 0 ? (instSummary.co2_w_m2||0) : 0, 1));
                    rWT("co2_rac", fmtRo(Au > 0 ? (instSummary.co2_c_m2||0) : 0, 1));
                    rWT("co2_ven", fmtRo(Au > 0 ? (instSummary.co2_v_m2||0) : 0, 1));
                    rWT("co2_ilu", fmtRo(Au > 0 ? (instSummary.co2_l_m2||0) : 0, 1));
                  }

                  // Indicatori EPP, RERP, CO2, SRI
                  rWTpart("Indicatorul energiei primare EP", "Indicatorul energiei primare EPP: " + fmtRo(epFinal, 1));
                  rWTpart("Indicele RER", "Indicele RERP: " + fmtRo((renewSummary?.rer || 0), 1));
                  rWTpart("Indicatorul emisiilor de CO", "Indicatorul emisiilor de CO2: " + fmtRo(co2Final_m2, 1));
                  // SRI — Smart Readiness Indicator (simplificat)
                  const sriVal = (heating.control === "pid" || heating.control === "bacs_a") ? 60 : (heating.control === "termostat" ? 30 : 10);
                  rWTpart("Indicele SRI", "Indicele SRI: " + sriVal + "%");

                  // Ore depășire temperatură confort (răcire)
                  if (hasCool) {
                    rWTpart("Timpul dintr-un an în care temperatura interioară depășește", "Timpul dintr-un an: " + (instSummary.overheatingHours || 0));
                    rWTpart("Volumul de referință al zonei climatizate", "Volumul de referință al zonei climatizate: " + fmtRo(Vol, 0));
                  }
                }

                // Foto + scale + repack se fac server-side în Python API

                const filename = mode === "anexa"
                  ? "Anexa_CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx"
                  : "CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx";

                if (download) {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                  if (canExportDocx && mode === "cpe") incrementCertCount();
                  showToast("DOCX generat: " + filename, "success");
                }
                return blob;

              } catch (err) {
                console.error("Eroare generare DOCX:", err);
                showToast("Eroare DOCX: " + err.message, "error", 6000);
                return null;
              }
            };


            // ═══════════════════════════════════════════════════════════
            // EXPORT XML MDLPA — Registrul electronic al certificatelor
            // Format conform Ord. MDLPA 16/2023 Anexa 4
            // ═══════════════════════════════════════════════════════════
            const generateXMLMDLPA = () => {
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }
              const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
              const fmtD = (d) => d ? d.split("-").reverse().join(".") : "";
              const validDate = auditor.date ? fmtD(auditor.date) : new Date().toISOString().slice(0,10).split("-").reverse().join(".");
              const expDate = auditor.date ? (() => { const d = new Date(auditor.date); d.setFullYear(d.getFullYear()+10); return d.toISOString().slice(0,10).split("-").reverse().join("."); })() : "";

              const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:ro:mdlpa:certificat-performanta-energetica:2023" versiune="1.0">
  <DateIdentificare>
    <CodUnic>${esc(auditor.mdlpaCode)}</CodUnic>
    <DataElaborare>${validDate}</DataElaborare>
    <DataExpirare>${expDate}</DataExpirare>
    <ScopElaborare>${esc(building.scopCpe || "vanzare")}</ScopElaborare>
    <ProgramCalcul>Zephren v2.0</ProgramCalcul>
  </DateIdentificare>
  <Auditor>
    <Nume>${esc(auditor.name)}</Nume>
    <Atestat>${esc(auditor.atestat)}</Atestat>
    <Grad>${esc(auditor.grade)}</Grad>
    <Firma>${esc(auditor.company)}</Firma>
    <Telefon>${esc(auditor.phone)}</Telefon>
    <Email>${esc(auditor.email)}</Email>
  </Auditor>
  <Cladire>
    <Categorie>${esc(building.category)}</Categorie>
    <CategorieLabel>${esc(catLabel)}</CategorieLabel>
    <Adresa>${esc(building.address)}</Adresa>
    <Localitate>${esc(building.city)}</Localitate>
    <Judet>${esc(building.county)}</Judet>
    <CodPostal>${esc(building.postalCode)}</CodPostal>
    <AnConstructie>${esc(building.yearBuilt)}</AnConstructie>
    <AnRenovare>${esc(building.yearRenov)}</AnRenovare>
    <RegimInaltime>${esc(building.floors)}</RegimInaltime>
    <ArieUtila unit="mp">${Au.toFixed(1)}</ArieUtila>
    <Volum unit="mc">${(parseFloat(building.volume)||0).toFixed(1)}</Volum>
    <ZonaClimatica>${esc(selectedClimate?.zone)}</ZonaClimatica>
    <Localitate_calcul>${esc(selectedClimate?.name)}</Localitate_calcul>
  </Cladire>
  <Anvelopa>
    <ElementeOpace>${opaqueElements.map(el => {
      const {u} = calcOpaqueR(el.layers, el.type);
      return `\n      <Element tip="${esc(el.type)}" denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${u.toFixed(3)}" orientare="${esc(el.orientation)}"/>`;
    }).join("")}
    </ElementeOpace>
    <ElementeVitrate>${glazingElements.map(el =>
      `\n      <Vitraj denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${parseFloat(el.u)||0}" g="${parseFloat(el.g)||0}" orientare="${esc(el.orientation)}"/>`
    ).join("")}
    </ElementeVitrate>
    <PuntiTermice>${thermalBridges.map(b =>
      `\n      <Punte denumire="${esc(b.name)}" psi="${parseFloat(b.psi)||0}" lungime="${parseFloat(b.length)||0}"/>`
    ).join("")}
    </PuntiTermice>
    <CoeficientG unit="W_per_m3K">${(envelopeSummary?.G||0).toFixed(3)}</CoeficientG>
  </Anvelopa>
  <Instalatii>
    <Incalzire sursa="${esc(heating.source)}" combustibil="${esc(instSummary.fuel?.id)}" eta_gen="${parseFloat(heating.eta_gen)||0}"/>
    <ACM sursa="${esc(acm.source)}"/>
    <Racire activ="${instSummary.hasCool}" EER="${parseFloat(cooling.eer)||0}"/>
    <Ventilare tip="${esc(ventilation.type)}" recuperare="${instSummary.hrEta||0}"/>
  </Instalatii>
  <RezultateEnergetice>
    <EnergiePrimaraSpecifica unit="kWh_per_mp_an">${epFinal.toFixed(1)}</EnergiePrimaraSpecifica>
    <ClasaEnergetica>${enClass.cls}</ClasaEnergetica>
    <NotaEnergetica>${enClass.score}</NotaEnergetica>
    <EmisiiCO2Specifice unit="kgCO2_per_mp_an">${co2Final.toFixed(1)}</EmisiiCO2Specifice>
    <ClasaCO2>${co2Class.cls}</ClasaCO2>
    <RER unit="procent">${rer.toFixed(1)}</RER>
    <ConsumFinal>
      <Incalzire unit="kWh_an">${(instSummary.qf_h||0).toFixed(0)}</Incalzire>
      <ACM unit="kWh_an">${(instSummary.qf_w||0).toFixed(0)}</ACM>
      <Racire unit="kWh_an">${(instSummary.qf_c||0).toFixed(0)}</Racire>
      <Ventilare unit="kWh_an">${(instSummary.qf_v||0).toFixed(0)}</Ventilare>
      <Iluminat unit="kWh_an">${(instSummary.qf_l||0).toFixed(0)}</Iluminat>
      <Total unit="kWh_an">${(instSummary.qf_total||0).toFixed(0)}</Total>
    </ConsumFinal>
    <nZEB indeplineste="${epFinal <= (getNzebEpMax(building.category, selectedClimate?.zone)||999) && rer >= (NZEB_THRESHOLDS[building.category]?.rer_min||30)}"/>
  </RezultateEnergetice>
</CertificatPerformantaEnergetica>`;

              const blob = new Blob([xmlContent], {type: "application/xml;charset=utf-8"});
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "CPE_XML_" + (auditor.mdlpaCode || building.address || "export").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + ".xml";
              document.body.appendChild(a); a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
              showToast("XML MDLPA exportat cu succes", "success");
            };

            const generatePDF = () => {
              try {
              showToast("Generare CPE...", "info", 2000);
              // Build HTML string, then show in inline iframe via srcdoc
              const isEN = lang === "EN";
              const T = {
                title: isEN ? "Energy Performance Certificate" : "Certificat de Performan\u021b\u0103 Energetic\u0103",
                subtitle: isEN ? "of the building / building unit" : "a cl\u0103dirii / unit\u0103\u021bii de cl\u0103dire",
                ministry: isEN ? "ROMANIA \u2022 Ministry of Development, Public Works and Administration" : "ROM\u00c2NIA \u2022 Ministerul Dezvolt\u0103rii, Lucr\u0103rilor Publice \u0219i Administra\u021biei",
                s1: isEN ? "I. CPE IDENTIFICATION & ENERGY AUDITOR" : "I. IDENTIFICARE CPE \u0218I AUDITOR ENERGETIC",
                s2: isEN ? "II. CERTIFIED BUILDING" : "II. CL\u0102DIREA CERTIFICAT\u0102",
                s3ep: isEN ? "III. CALCULATED ENERGY PERFORMANCE" : "III. PERFORMAN\u021aA ENERGETIC\u0102",
                s3co2: isEN ? "CO\u2082 EMISSIONS" : "EMISII CO\u2082",
                s5: isEN ? "V. RENEWABLE ENERGY SOURCES (RES) & nZEB STATUS" : "V. SURSE REGENERABILE DE ENERGIE (SRE) \u0218I STATUT nZEB",
                cpeNr: isEN ? "CPE No.:" : "Nr. CPE:",
                codMdlpa: isEN ? "MDLPA Code:" : "Cod MDLPA:",
                valid: isEN ? "Valid:" : "Valabil:",
                auditor: isEN ? "Auditor:" : "Auditor:",
                cert: isEN ? "Certificate:" : "Atestat:",
                company: isEN ? "Company:" : "Firma:",
                tel: isEN ? "Phone:" : "Tel:",
                email: isEN ? "Email:" : "Email:",
                date: isEN ? "Date:" : "Data:",
                category: isEN ? "Category:" : "Categorie:",
                yrBuilt: isEN ? "Year built:" : "An constr.:",
                yrRenov: isEN ? "Year renov.:" : "An renov.:",
                address: isEN ? "Address:" : "Adresa:",
                height: isEN ? "Height reg.:" : "Regim H:",
                program: isEN ? "Software:" : "Program:",
                perfHigh: isEN ? "\u25B2 High performance" : "\u25B2 Performan\u021b\u0103 ridicat\u0103",
                perfLow: isEN ? "\u25BC Low performance" : "\u25BC Performan\u021b\u0103 sc\u0103zut\u0103",
                pollLow: isEN ? "\u25B2 Low pollution" : "\u25B2 Poluare sc\u0103zut\u0103",
                pollHigh: isEN ? "\u25BC High pollution" : "\u25BC Poluare ridicat\u0103",
                thisBuilding: isEN ? "THIS BUILDING:" : "ACEAST\u0102 CL\u0102DIRE:",
                utility: isEN ? "Utility" : "Utilitate",
                system: isEN ? "System" : "Sistem",
                finalEn: isEN ? "Final energy" : "Energie final\u0103",
                primaryEn: isEN ? "Primary energy" : "Energie primar\u0103",
                co2em: isEN ? "CO\u2082 emissions" : "Emisii CO\u2082",
                clsEp: isEN ? "Cls. Ep" : "Cls. Ep",
                total: isEN ? "TOTAL" : "TOTAL",
                heating: isEN ? "Heating" : "\u00CEnc\u0103lzire",
                dhw: isEN ? "DHW" : "Ap\u0103 cald\u0103 consum",
                cooling: isEN ? "Cooling" : "R\u0103cire",
                ventilation: isEN ? "Mech. ventilation" : "Ventilare mec.",
                lighting: isEN ? "Lighting" : "Iluminat",
                solarTh: isEN ? "Solar thermal" : "Solar termic",
                heatPumps: isEN ? "Heat pumps" : "Pompe c\u0103ld.",
                solarPV: isEN ? "Solar PV" : "Solar PV",
                biomass: isEN ? "Biomass" : "Biomas\u0103",
                otherRes: isEN ? "Other RES" : "Alte SRE",
                totalRes: isEN ? "Total RES" : "Total SRE",
                nzebYes: isEN ? "Building MEETS nZEB requirements" : "Cl\u0103direa \u00eendepline\u0219te cerin\u021bele nZEB",
                nzebNo: isEN ? "Building DOES NOT meet nZEB requirements" : "Cl\u0103direa NU \u00eendepline\u0219te cerin\u021bele nZEB",
                signature: isEN ? "Signature/stamp" : "Semn\u0103tura/\u0219tampila",
                cpeCode: isEN ? "CPE UNIQUE IDENTIFICATION CODE" : "COD UNIC DE IDENTIFICARE CPE",
                p2title: isEN ? "CPE \u2013 Technical details" : "CPE \u2013 Detalii tehnice",
                envTitle: isEN ? "A. BUILDING THERMAL ENVELOPE" : "A. ANVELOPA TERMIC\u0102 A CL\u0102DIRII",
                opaqueEl: isEN ? "A.1 Opaque elements" : "A.1 Elemente opace",
                glazEl: isEN ? "A.2 Glazing elements" : "A.2 Elemente vitrate",
                bridges: isEN ? "A.3 Thermal bridges & global indicators" : "A.3 Pun\u021bi termice \u0219i indicatori globali",
                instTitle: isEN ? "B. BUILDING SYSTEMS" : "B. SISTEME DE INSTALA\u021aII",
                balTitle: isEN ? "C. ENERGY BALANCE PER UTILITY" : "C. BILAN\u021a ENERGETIC PE UTILIT\u0102\u021aI",
                p3title: isEN ? "CPE \u2013 Rehabilitation recommendations" : "CPE \u2013 Recomand\u0103ri de reabilitare energetic\u0103",
                recTitle: isEN ? "D. ENERGY REHABILITATION RECOMMENDATIONS" : "D. RECOMAND\u0102RI PENTRU REABILITAREA / MODERNIZAREA ENERGETIC\u0102",
                obsTitle: isEN ? "E. AUDITOR OBSERVATIONS" : "E. OBSERVA\u021aII ALE AUDITORULUI",
                measure: isEN ? "Proposed measure" : "M\u0103sura propus\u0103",
                domain: isEN ? "Domain" : "Domeniu",
                savings: isEN ? "Estimated savings" : "Economie estimat\u0103",
                priority: isEN ? "Priority" : "Prioritate",
                envelope: isEN ? "Envelope" : "Anvelop\u0103",
                systems: isEN ? "Systems" : "Instala\u021bii",
                high: isEN ? "HIGH" : "RIDICAT\u0102",
                medium: isEN ? "MEDIUM" : "MEDIE",
                auditorSig: isEN ? "Auditor signature" : "Semn\u0103tura auditor",
                benefSig: isEN ? "Beneficiary signature" : "Semn\u0103tura beneficiar",
                back: isEN ? "Back" : "\u00cenapoi",
                photo: isEN ? "BUILDING PHOTO" : "FOTO CL\u0102DIRE",
                name: isEN ? "Name" : "Denumire",
                type: isEN ? "Type" : "Tip",
                area: isEN ? "Area" : "Aria",
                fuel: isEN ? "Fuel" : "Combustibil",
                efficiency: isEN ? "Efficiency / COP" : "Randament / COP",
              };

              // Per-utility specific values
              const getUtilClass = (epVal) => {
                if (!grid) return "\u2014";
                const t = grid.thresholds;
                for (let i = 0; i < t.length; i++) { if (epVal <= t[i]) return CLASS_LABELS[i]; }
                return CLASS_LABELS[CLASS_LABELS.length - 1];
              };

              const ep_h_m2 = Au > 0 ? (instSummary?.ep_h || 0) / Au : 0;
              const ep_w_m2 = Au > 0 ? (instSummary?.ep_w || 0) / Au : 0;
              const ep_c_m2 = Au > 0 ? (instSummary?.ep_c || 0) / Au : 0;
              const ep_v_m2 = Au > 0 ? (instSummary?.ep_v || 0) / Au : 0;
              const ep_l_m2 = Au > 0 ? (instSummary?.ep_l || 0) / Au : 0;

              const qf_h_m2 = Au > 0 ? (instSummary?.qf_h || 0) / Au : 0;
              const qf_w_m2 = Au > 0 ? (instSummary?.qf_w || 0) / Au : 0;
              const qf_c_m2 = Au > 0 ? (instSummary?.qf_c || 0) / Au : 0;
              const qf_v_m2 = Au > 0 ? (instSummary?.qf_v || 0) / Au : 0;
              const qf_l_m2 = Au > 0 ? (instSummary?.qf_l || 0) / Au : 0;

              const co2_h_m2 = Au > 0 ? (instSummary?.co2_h || 0) / Au : 0;
              const co2_w_m2 = Au > 0 ? (instSummary?.co2_w || 0) / Au : 0;
              const co2_c_m2 = Au > 0 ? (instSummary?.co2_c || 0) / Au : 0;
              const co2_v_m2 = Au > 0 ? (instSummary?.co2_v || 0) / Au : 0;
              const co2_l_m2 = Au > 0 ? (instSummary?.co2_l || 0) / Au : 0;

              const qf_total_m2 = qf_h_m2 + qf_w_m2 + qf_c_m2 + qf_v_m2 + qf_l_m2;
              const ep_sum_m2 = ep_h_m2 + ep_w_m2 + ep_c_m2 + ep_v_m2 + ep_l_m2;
              const co2_sum_m2 = co2_h_m2 + co2_w_m2 + co2_c_m2 + co2_v_m2 + co2_l_m2;

              const utilClassH = getUtilClass(ep_h_m2);
              const utilClassW = getUtilClass(ep_w_m2);
              const utilClassC = getUtilClass(ep_c_m2);
              const utilClassV = getUtilClass(ep_v_m2);
              const utilClassL = getUtilClass(ep_l_m2);

              // SRE
              const sre_solar_th = renewSummary ? (Au > 0 ? renewSummary.qSolarTh / Au : 0) : 0;
              const sre_pv = renewSummary ? (Au > 0 ? renewSummary.qPV_kWh / Au : 0) : 0;
              const sre_pc = renewSummary ? (Au > 0 ? renewSummary.qPC_ren / Au : 0) : 0;
              const sre_bio = renewSummary ? (Au > 0 ? renewSummary.qBio_ren / Au : 0) : 0;
              const sre_total = Au > 0 && renewSummary ? renewSummary.totalRenewable / Au : 0;

              // Scale — culori reale extrase pixel-by-pixel din template MDLPA
              const scaleColors    = ["#009B00","#32C831","#00FF00","#FFFF00","#F39C00","#FF6400","#FE4101","#FE0000"];
              const co2ScaleColors = ["#0000FE","#3265FF","#009BFF","#9CD2FF","#BEBEBE","#969696","#646464","#333333"];
              const scaleLabels = CLASS_LABELS;
              const co2Thresholds = (CO2_CLASSES_DB[baseCatResolved] || CO2_CLASSES_DB[building.category] || CO2_CLASSES_DB.AL).thresholds;
              // Culoare text contrastantă (WCAG) pentru fundal hex
              const txtClr = (hex) => { const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255; return (0.2126*r+0.7152*g+0.0722*b)>0.4?'#000':'#fff'; };

              // Systems
              const heatSrc = HEAT_SOURCES.find(s => s.id === heating.source);
              const heatDesc = heatSrc ? heatSrc.label : "\u2014";
              const heatFuel = instSummary?.fuel?.label || "Gaz natural";
              const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
              const acmDesc = acmSrc ? acmSrc.label : "\u2014";
              const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
              const coolDesc = cooling.hasCooling && coolSys ? coolSys.label : "Nu este cazul";
              const ventTypeObj = VENTILATION_TYPES.find(t => t.id === ventilation.type);
              const ventDesc = ventTypeObj?.label || "Natural\u0103";
              const lightDesc = LIGHTING_TYPES.find(t => t.id === lighting.type)?.label || "\u2014";

              // nZEB
              const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
              const nzebOk = rer >= nzeb.rer_min && epFinal < getNzebEpMax(building.category, selectedClimate?.zone);
              const nzebLabel = nzebOk ? "DA" : "NU";

              // Dates
              const validDate = new Date(auditor.date);
              const expiryDate = new Date(validDate);
              expiryDate.setFullYear(expiryDate.getFullYear() + 10);
              const expiryStr = expiryDate.toLocaleDateString("ro-RO");
              const dateNow = new Date().toLocaleDateString("ro-RO");

              // Envelope
              const envG = envelopeSummary?.G?.toFixed(3) || "\u2014";
              const envBridgeLoss = envelopeSummary?.bridgeLoss?.toFixed(1) || "0.0";
              const envTotalArea = envelopeSummary?.totalArea?.toFixed(1) || "\u2014";

              const envRows = opaqueElements.map(el => {
                const elType = ELEMENT_TYPES?.find(t => t.id === el.type);
                const typeName = elType?.label || el.type;
                const area = parseFloat(el.area) || 0;
                const rCalc = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : {u:0, r_total:0};
                return { name: el.name || typeName, type: typeName, area: area.toFixed(1), u: rCalc.u.toFixed(3), r: rCalc.r_total.toFixed(3) };
              });
              const glazRows = glazingElements.map(el => {
                return { name: el.name || "Fereastr\u0103", area: (parseFloat(el.area)||0).toFixed(1), u: (parseFloat(el.u)||0).toFixed(2), g: (parseFloat(el.g)||0).toFixed(2) };
              });

              // Utility data for 15-col table
              const utilData = [
                { label: T.heating, sys: heatDesc, qf: qf_h_m2, ep: ep_h_m2, co2: co2_h_m2, cls: utilClassH },
                { label: T.dhw, sys: acmDesc, qf: qf_w_m2, ep: ep_w_m2, co2: co2_w_m2, cls: utilClassW },
                { label: T.cooling, sys: coolDesc, qf: qf_c_m2, ep: ep_c_m2, co2: co2_c_m2, cls: utilClassC },
                { label: T.ventilation, sys: ventDesc, qf: qf_v_m2, ep: ep_v_m2, co2: co2_v_m2, cls: utilClassV },
                { label: T.lighting, sys: lightDesc, qf: qf_l_m2, ep: ep_l_m2, co2: co2_l_m2, cls: utilClassL },
              ];

              // === BUILD HTML ===
              const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=2">
<title>CPE - ${building.address || "Cl\u0103dire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:9pt;color:#000;background:#fff;-webkit-text-size-adjust:100%}
@media print{@page{size:A4 portrait;margin:8mm 10mm} .page-break{page-break-before:always} body{padding:0} .no-print{display:none!important} table.d tr,table.u tr,table.c tr{page-break-inside:avoid} table.d,table.u,table.c{page-break-inside:auto}}
@media screen{body{padding:8mm 12mm;max-width:210mm;margin:0 auto} .page-break{margin-top:20px;padding-top:15px;border-top:2px dashed #ccc}}
@media screen and (max-width:600px){
  body{padding:3mm 2mm;font-size:7pt;max-width:100%;overflow-x:auto}
  .hdr h1{font-size:10pt!important;letter-spacing:0}
  .hdr .flag{font-size:5.5pt}
  table.c td,table.c th{padding:1px 2px;font-size:6.5pt}
  table.u td,table.u th{padding:1px 1px;font-size:5.5pt}
  table.u .uh{font-size:5pt}
  table.u .us{font-size:5pt}
  table.d td,table.d th{padding:1px 2px;font-size:6.5pt}
  .S{font-size:7pt;padding:2px}
  .V{font-size:7.5pt}
  .Vs{font-size:6.5pt}
  .L{font-size:6pt;padding:1px 2px}
  .br td{height:13px;font-size:6pt}
  .bl{padding:1px 3px!important;font-size:6.5pt}
  .brng{font-size:5.5pt}
  .bm{font-size:7pt;right:-10px}
  .stmp{min-height:30px}
  .nz{font-size:6pt;padding:1px 4px}
}
.hdr{text-align:center;margin-bottom:5px;padding-bottom:3px;border-bottom:2.5px solid #003366}
.hdr .flag{font-size:6.5pt;color:#003366;letter-spacing:1px;text-transform:uppercase;margin-bottom:1px}
.hdr h1{font-size:13pt;font-weight:bold;text-transform:uppercase;color:#003366;letter-spacing:1px;margin:0}
.hdr .sub{font-size:7.5pt;color:#555}
.hdr .ref{font-size:6.5pt;color:#999}
table.c{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:3px}
table.c td,table.c th{border:1px solid #444;padding:2px 4px;font-size:7.5pt;vertical-align:middle}
.S{background:#003366;color:#fff;font-weight:bold;font-size:8.5pt;text-align:center;padding:3px;letter-spacing:0.3px}
.S2{background:#e8edf5;font-weight:bold;font-size:7.5pt;padding:2px 4px}
.S3{background:#f0f4fa;font-size:7pt;text-align:center;font-weight:bold}
.V{text-align:center;font-weight:bold;font-size:9pt}
.Vs{text-align:center;font-weight:bold;font-size:7.5pt}
.L{font-size:7pt;padding:2px 4px}
.Ls{font-size:6.5pt;padding:1px 3px}
/* Scale bars */
.br td{padding:0;height:16px;font-size:7.5pt}
.bl{color:#fff;font-weight:bold;padding:1px 5px !important;text-align:left;letter-spacing:0.5px}
.brng{font-size:6.5pt;padding:1px 3px !important;color:#444}
.ba{outline:2.5px solid #000;outline-offset:-1px;position:relative}
.bm{position:absolute;right:-14px;top:50%;transform:translateY(-50%);color:#000;font-size:10pt;font-weight:bold}
/* Utility table */
table.u{width:100%;border-collapse:collapse;margin-bottom:3px}
table.u td,table.u th{border:1px solid #444;padding:1px 3px;font-size:7pt;text-align:center;vertical-align:middle}
table.u .uh{background:#003366;color:#fff;font-weight:bold;font-size:6.5pt;padding:2px}
table.u .us{background:#e0e8f0;font-weight:bold;font-size:6.5pt}
table.u .un{text-align:left;padding-left:3px;font-size:7pt}
table.u .uy{font-size:6pt;color:#555;font-style:italic}
table.u .uc{font-weight:bold;font-size:7.5pt;color:#fff;padding:1px}
table.u .ut td{background:#f0f4fa;font-weight:bold;font-size:7.5pt}
/* Detail tables */
table.d{width:100%;border-collapse:collapse;margin-bottom:5px}
table.d td,table.d th{border:1px solid #555;padding:2px 4px;font-size:7.5pt;vertical-align:top}
table.d .dh{background:#003366;color:#fff;font-weight:bold;font-size:8pt;text-align:center;padding:3px}
table.d .ds{background:#e8edf5;font-weight:bold;font-size:7.5pt}
table.d .dv{text-align:center;font-weight:bold;font-size:7.5pt}
/* nZEB */
.nz{display:inline-block;padding:1px 6px;border-radius:2px;font-weight:bold;font-size:7.5pt;letter-spacing:0.3px}
.nz-ok{background:#00642d;color:#fff}
.nz-no{background:#d42517;color:#fff}
/* Misc */
.stmp{border:1px dashed #999;min-height:45px;text-align:center;font-size:6pt;color:#999;padding:4px;vertical-align:middle}
.bcd{text-align:center;font-size:6.5pt;color:#555;padding:5px;border:1px solid #bbb;margin-top:3px;background:#fafafa}
.ft{font-size:6pt;color:#999;text-align:center;margin-top:4px;padding-top:2px;border-top:1px solid #ddd}
/* Back button for mobile */
.back-btn{display:none;position:fixed;top:8px;right:8px;z-index:100;background:#003366;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:10pt;cursor:pointer;font-family:sans-serif}
@media screen and (max-width:600px){.back-btn{display:block}}
</style>
</head><body>
<button class="back-btn no-print" onclick="window.history.back()">&#x2190; ${T.back}</button>
${hasWatermark ? '<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0.07"><div style="transform:rotate(-35deg);font-size:80pt;font-weight:900;color:#003366;white-space:nowrap;font-family:sans-serif;letter-spacing:10px">Zephren DEMO</div></div>' : ''}

<!-- ======== PAGINA 1 ======== -->
<div class="hdr">
  <div class="flag">${T.ministry}</div>
  <h1>${T.title}</h1>
  <div class="sub">${T.subtitle}</div>
  <div class="ref">Legea 372/2005 (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023)</div>
</div>

<!-- TABLE 1: IDENTIFICARE CPE ȘI AUDITOR -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND IDENTIFICAREA CPE \u0218I A AUDITORULUI ENERGETIC</td></tr>
<tr>
  <td colspan="4" class="L"><strong>CPE num\u0103rul</strong></td>
  <td colspan="4" class="Vs" style="font-size:7pt;letter-spacing:1.5px">${auditor.mdlpaCode || ".................."}</td>
  <td colspan="2" class="L" style="text-align:right"><strong>valabil 10 ani</strong></td>
  <td colspan="5" class="L"><strong>Nume &amp; prenume auditor energetic</strong></td>
  <td colspan="5" class="L">${auditor.name || "________________"}</td>
</tr>
<tr>
  <td colspan="4" class="L" style="font-size:6.5pt;color:#666">Cod \u00eenregistrare MDLPA</td>
  <td colspan="4" class="Vs" style="font-size:6.5pt;letter-spacing:2px">${auditor.mdlpaCode || "\u2014"}</td>
  <td colspan="2" class="L"></td>
  <td colspan="5" class="L"><strong>Certificat atestare:</strong> ${auditor.atestat || "XX/XXXXX"}</td>
  <td colspan="2" class="L"><strong>gradul</strong></td>
  <td colspan="3" class="Vs"><strong>${auditor.grade || "I / II"}</strong></td>
</tr>
</table>

<!-- TABLE 2: DATE PRIVIND CLĂDIREA/APARTAMENTUL -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND ${ building.category === "AP" ? "APARTAMENTUL CERTIFICAT" : "CL\u0102DIREA CERTIFICAT\u0102" }</td></tr>
<tr>
  <td colspan="7" class="L"><strong>Categoria cl\u0103dirii:</strong> ${catLabel}</td>
  <td colspan="4" class="L"><strong>Anul construirii:</strong> ${building.yearBuilt || "AAAA"}</td>
  <td colspan="3" class="L"><strong>Renov.:</strong> ${building.yearRenov || "\u2014"}</td>
  <td colspan="6" rowspan="5" class="stmp" style="padding:2px;vertical-align:middle;text-align:center">${auditor.photo ? '<img src="' + auditor.photo + '" style="max-width:100%;max-height:100px;object-fit:contain;display:inline-block;" />' : '<div style="font-size:7pt;color:#999">' + T.photo + '</div>'}</td>
</tr>
<tr>
  <td colspan="14" class="L"><strong>Adresa cl\u0103dirii:</strong> ${building.address || "\u2014"}, ${building.city || "\u2014"}, jud. ${building.county || "\u2014"}</td>
</tr>
<tr>
  <td colspan="8" class="L">${building.address ? '' : '.....................................'}</td>
  <td colspan="3" class="L"><strong>Aria de referin\u021b\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Coordonate GPS:</strong> ${(selectedClimate?.lat || 0).toFixed(4)} x ${(selectedClimate ? ({"Bucure\u0219ti":26.10,"Cluj-Napoca":23.60,"Constan\u021ba":28.65,"Timi\u0219oara":21.23,"Ia\u0219i":27.59,"Bra\u0219ov":25.59}[selectedClimate.name] || 25.0) : 0).toFixed(4)}</td>
  <td colspan="3" class="L"><strong>Aria util\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Regim de \u00een\u0103l\u021bime:</strong> ${building.floors || "\u2014"}</td>
  <td colspan="3" class="L"><strong>Volumul interior:</strong></td>
  <td colspan="2" class="V">${building.volume || "\u2014"}</td>
  <td colspan="1" class="L">m\u00b3</td>
</tr>
</table>

<!-- TABLE 3: SCOP ȘI PROGRAM -->
<table class="c">
<tr>
  <td colspan="5" class="L" style="background:#E7E6E6"><strong>Scopul elabor\u0103rii CPE:</strong></td>
  <td colspan="8" class="L">${({"vanzare":"V\u00e2nzare","inchiriere":"\u00cenchiriere","receptie":"Recep\u021bie cl\u0103dire nou\u0103","informare":"Informare proprietar","renovare":"Renovare major\u0103","alt":"Alt scop"})[building.scopCpe] || "V\u00e2nzare"}</td>
  <td colspan="7" class="L"><strong>Program de calcul:</strong> Zephren v1.0</td>
</tr>
</table>

<!-- TABLE 4: SCALA ENERGETICĂ A+ → G (DUAL: EP + CO₂) -->
<table class="c">
<tr>
  <td colspan="13" class="S" style="font-size:8pt;background:#E7E6E6">PERFORMAN\u021aA ENERGETIC\u0102 CALCULAT\u0102<br><span style="font-size:6pt;font-weight:normal">[kWh/m\u00b2,an]</span></td>
  <td colspan="7" class="S" style="font-size:8pt;background:#E7E6E6">EMISII CO\u2082<br><span style="font-size:6pt;font-weight:normal">[kgCO\u2082/m\u00b2,an]</span></td>
</tr>
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#009B00;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 ridicat\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#0000FE;padding:1px;font-weight:bold">Nivel de poluare sc\u0103zut</td>
</tr>
${scaleLabels.map((cls, idx) => {
  const t = grid?.thresholds || [];
  const rangeStr = idx === 0 ? ("\u2264 " + (t[0]||"")) : idx < t.length ? ((t[idx-1]||"") + " \u2013 " + (t[idx]||"")) : ("> " + (t[t.length-1]||""));
  const ct = co2Thresholds;
  const co2Str = idx === 0 ? ("\u2264 " + (ct[0]||"")) : idx < ct.length ? ((ct[idx-1]||"") + " \u2013 " + (ct[idx]||"")) : ("> " + (ct[ct.length-1]||""));
  const isEp = idx === enClass.idx;
  const isCO2 = idx === co2Class.idx;
  const bg = scaleColors[idx];
  const co2bg = co2ScaleColors[idx];
  const bw = 9 - idx;
  const rw = 13 - bw;
  const cw = Math.max(2, 5 - Math.floor(idx*0.5));
  const crw = 7 - cw;
  return '<tr class="br">' +
    '<td colspan="' + bw + '" class="bl' + (isEp?' ba':'') + '" style="background:' + bg + ';color:' + txtClr(bg) + '">' + cls + (isEp?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + rw + '" class="brng" style="border-left:none">' + rangeStr + (isEp?' <strong style="color:' + bg + '">\u25C0 ' + T.thisBuilding + ' ' + epFinal.toFixed(1) + ' kWh/m\u00b2,an</strong>':'') + '</td>' +
    '<td colspan="' + cw + '" class="bl' + (isCO2?' ba':'') + '" style="background:' + co2bg + ';color:' + txtClr(co2bg) + '">' + cls + (isCO2?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + crw + '" class="brng" style="border-left:none">' + co2Str + (isCO2?' <strong style="color:' + co2bg + '">\u25C0 ' + co2Final.toFixed(1) + '</strong>':'') + '</td>' +
  '</tr>';
}).join("")}
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#FE0000;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 sc\u0103zut\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#333333;padding:1px;font-weight:bold">Nivel de poluare ridicat</td>
</tr>
<tr>
  <td colspan="6" class="L" style="font-size:7pt"><strong>Consum specific anual [kWh/m\u00b2,an]:</strong></td>
  <td colspan="3" class="V" style="font-size:7pt"><strong>final\u0103:</strong> ${qf_total_m2.toFixed(1)}</td>
  <td colspan="4" class="V" style="font-size:7pt"><strong>primar\u0103:</strong> ${epFinal.toFixed(1)}</td>
  <td colspan="3" class="L" style="font-size:7pt"><strong>CO\u2082:</strong></td>
  <td colspan="4" class="V" style="font-size:7pt">${co2Final.toFixed(1)} kgCO\u2082/m\u00b2,an</td>
</tr>
</table>

<!-- TABLE 5: SURSE REGENERABILE -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="2" class="S3" style="background:#E7E6E6;font-size:6.5pt"><strong>Consum specific anual din surse regenerabile</strong></td>
  <td colspan="3" class="S3">${T.solarTh}</td>
  <td colspan="3" class="S3">${T.solarPV}</td>
  <td colspan="3" class="S3">${T.heatPumps}</td>
  <td colspan="3" class="S3">${T.biomass}</td>
  <td colspan="2" class="S3">${T.otherRes}</td>
  <td colspan="4" class="S3" style="background:#003366;color:#fff">${T.totalRes}</td>
</tr>
<tr>
  <td colspan="2" class="L" style="font-size:6.5pt;text-align:center">kWh/m\u00b2,an</td>
  <td colspan="3" class="Vs">${sre_solar_th.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pv.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pc.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_bio.toFixed(1)}</td>
  <td colspan="2" class="Vs">0.0</td>
  <td colspan="4" class="V" style="background:#f0f4fa"><strong>${sre_total.toFixed(1)}</strong></td>
</tr>
</table>

<!-- TABLE 6: CONSUM PER UTILITATE (cu clasa energetică pe celule colorate) -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="4" rowspan="2" class="S3" style="background:#E7E6E6;vertical-align:middle">Tip sistem instala\u021bie cl\u0103dire real\u0103</td>
  <td colspan="16" class="S3" style="background:#E7E6E6">Clas\u0103 energetic\u0103 / Consum specific anual de energie primar\u0103 per utilitate [kWh/m\u00b2,an]</td>
</tr>
<tr>
  ${scaleLabels.map((lbl, i) => '<td colspan="2" style="background:' + scaleColors[i] + ';color:' + txtClr(scaleColors[i]) + ';text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + lbl + '</td>').join("")}
</tr>
${[
  { label: T.heating, sys: heatDesc, ep: ep_h_m2, cls: utilClassH },
  { label: T.dhw, sys: acmDesc, ep: ep_w_m2, cls: utilClassW },
  { label: T.cooling, sys: coolDesc, ep: ep_c_m2, cls: utilClassC },
  { label: T.ventilation, sys: ventDesc, ep: ep_v_m2, cls: utilClassV },
  { label: T.lighting, sys: lightDesc, ep: ep_l_m2, cls: utilClassL },
].map(u => {
  const clsIdx = CLASS_LABELS.indexOf(u.cls);
  return '<tr>' +
    '<td colspan="1" class="L" style="font-size:7pt;font-weight:bold;padding:2px 3px">' + u.label + '</td>' +
    '<td colspan="3" class="L" style="font-size:6.5pt;padding:2px 3px">' + u.sys + '</td>' +
    scaleLabels.map((lbl, i) => {
      if (i === clsIdx) {
        return '<td colspan="2" style="background:' + scaleColors[i] + ';color:' + txtClr(scaleColors[i]) + ';text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + u.ep.toFixed(1) + '</td>';
      } else {
        return '<td colspan="2" style="border:1px solid #ddd;padding:2px"></td>';
      }
    }).join("") +
  '</tr>';
}).join("")}
</table>

<!-- TABLE 7: COD DE BARE -->
<table class="c" style="margin-top:3px">
<tr><td colspan="20" class="S3" style="background:#E7E6E6;text-align:center;font-size:7pt"><strong>COD UNIC DE BARE GENERAT DIN BAZA NA\u021aIONAL\u0102 DE CPE</strong></td></tr>
</table>

<!-- Semnătură și validitate -->
<div style="display:flex;gap:8px;margin-top:3px;font-size:7pt">
  <div style="flex:1;line-height:1.5">
    <strong>Auditor energetic:</strong> ${auditor.name || "________"}<br>
    <strong>Firma:</strong> ${auditor.company || "________"} | <strong>Tel:</strong> ${auditor.phone || "____"} | <strong>Email:</strong> ${auditor.email || "________"}<br>
    <strong>Data elabor\u0103rii:</strong> ${auditor.date || dateNow} | <strong>Valabil 10 ani, p\u00e2n\u0103 la:</strong> ${expiryStr}
  </div>
  <div style="text-align:center;width:120px">
    <div style="font-size:5.5pt;color:#999">${T.signature}</div>
    <div class="stmp" style="min-height:35px"></div>
  </div>
</div>
<div class="bcd" id="qr-area">
  <div style="margin-bottom:3px;font-size:7pt"><strong>${T.cpeCode}</strong></div>
  <canvas id="qr-canvas" width="260" height="60" style="display:block;margin:0 auto 3px auto"></canvas>
  <div style="font-size:6pt;letter-spacing:1px;color:#333">${auditor.mdlpaCode || "XXXXXX"}/${auditor.date||"AAAA-LL-ZZ"}/${auditor.atestat||"SERIE"}</div>
</div>
<script>
(function(){
  // Code128 barcode generator — real barcode, not pseudo-QR
  var data = "${(auditor.mdlpaCode || 'XXXXXX') + '/' + (auditor.date||'0000-00-00') + '/' + (auditor.atestat||'00000')}";
  var c = document.getElementById('qr-canvas');
  if (!c) return;
  c.width = 260; c.height = 60;
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
  // Code128B encoding
  var CODE128B = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],[2,3,3,1,1,1,2]
  ];
  var START_B = 104, STOP = 106;
  var codes = [START_B];
  var checksum = START_B;
  for (var i = 0; i < data.length && i < 30; i++) {
    var cv = data.charCodeAt(i) - 32;
    if (cv < 0 || cv > 94) cv = 0;
    codes.push(cv);
    checksum += cv * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  // Draw
  var x = 10, bH = 45, y0 = 3;
  var totalW = 0;
  codes.forEach(function(code) {
    var pat = CODE128B[code];
    if (pat) for (var p = 0; p < pat.length; p++) totalW += pat[p];
  });
  var scale = Math.min(1.5, (c.width - 20) / totalW);
  ctx.fillStyle = '#000000';
  codes.forEach(function(code) {
    var pat = CODE128B[code];
    if (!pat) return;
    for (var p = 0; p < pat.length; p++) {
      var w = pat[p] * scale;
      if (p % 2 === 0) ctx.fillRect(x, y0, w, bH);
      x += w;
    }
  });
  ctx.fillStyle = '#333'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText(data.substring(0, 35), c.width / 2, c.height - 2);
})();
</script>
<div class="ft">Pagina 1/3 | Mc 001-2022 (Ord. MDLPA 16/2023) | Zephren v1.0 | ${dateNow}</div>


<!-- ======== PAGINA 2 ======== -->
<div class="page-break"></div>
<div class="hdr">
  <h1 style="font-size:10pt">${T.p2title}</h1>
  <div class="ref">CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${catLabel}</div>
</div>

<!-- A. ANVELOP\u0102 -->
<table class="d">
<tr><td colspan="6" class="dh">${T.envTitle}</td></tr>
<tr><td colspan="6" class="ds">${T.opaqueEl}</td></tr>
<tr>
  <td class="ds" style="width:5%">Nr.</td>
  <td class="ds" style="width:24%">${T.name}</td>
  <td class="ds" style="width:18%">${T.type}</td>
  <td class="ds" style="width:14%">Aria [m\u00b2]</td>
  <td class="ds" style="width:17%">U [W/m\u00b2K]</td>
  <td class="ds" style="width:17%">R [m\u00b2K/W]</td>
</tr>
${envRows.length > 0 ? envRows.map((r, i) => '<tr><td style="text-align:center">' + (i+1) + '</td><td>' + r.name + '</td><td>' + r.type + '</td><td class="dv">' + r.area + '</td><td class="dv">' + r.u + '</td><td class="dv">' + r.r + '</td></tr>').join("") : '<tr><td colspan="6" style="text-align:center;color:#999">\u2014 Nu sunt definite \u2014</td></tr>'}
<tr><td colspan="6" class="ds">${T.glazEl}</td></tr>
<tr>
  <td class="ds">Nr.</td>
  <td class="ds" colspan="2">${T.name}</td>
  <td class="ds">Aria [m\u00b2]</td>
  <td class="ds">U [W/m\u00b2K]</td>
  <td class="ds">g [-]</td>
</tr>
${glazRows.length > 0 ? glazRows.map((r, i) => '<tr><td style="text-align:center">' + (i+1) + '</td><td colspan="2">' + r.name + '</td><td class="dv">' + r.area + '</td><td class="dv">' + r.u + '</td><td class="dv">' + r.g + '</td></tr>').join("") : '<tr><td colspan="6" style="text-align:center;color:#999">\u2014 Nu sunt definite \u2014</td></tr>'}
<tr><td colspan="6" class="ds">${T.bridges}</td></tr>
<tr>
  <td colspan="2"><strong>Pierderi pun\u021bi [W/K]:</strong></td><td class="dv">${envBridgeLoss}</td>
  <td><strong>Arie total\u0103 [m\u00b2]:</strong></td><td class="dv">${envTotalArea}</td>
  <td></td>
</tr>
<tr>
  <td colspan="2"><strong>G [W/m\u00b3K]:</strong></td><td class="dv">${envG}</td>
  <td><strong>V [m\u00b3]:</strong></td><td class="dv">${building.volume || "\u2014"}</td>
  <td></td>
</tr>
</table>

<!-- B. INSTALA\u021aII -->
<table class="d">
<tr><td colspan="4" class="dh">${T.instTitle}</td></tr>
<tr><td class="ds" style="width:22%">${T.utility}</td><td class="ds" style="width:28%">Sistem / Surs\u0103</td><td class="ds" style="width:22%">Combustibil</td><td class="ds" style="width:28%">Randament / COP</td></tr>
<tr><td><strong>\u00CEnc\u0103lzire</strong></td><td>${heatDesc}</td><td>${heatFuel}</td><td class="dv">${instSummary?.isCOP ? 'COP ' + (parseFloat(heating.eta_gen)||0).toFixed(2) : '\u03b7=' + ((instSummary?.eta_total_h||0)*100).toFixed(1) + '%'}</td></tr>
<tr><td><strong>ACC</strong></td><td>${acmDesc}</td><td>${acm.source === 'CAZAN_H' ? heatFuel : 'Electricitate'}</td><td class="dv">${acmSrc ? (acmSrc.isCOP ? 'COP ' + (acmSrc.eta||0).toFixed(2) : '\u03b7=' + ((acmSrc.eta||0)*100).toFixed(1) + '%') : '\u2014'}</td></tr>
<tr><td><strong>R\u0103cire</strong></td><td>${coolDesc}</td><td>${cooling.hasCooling ? 'Electricitate' : '\u2014'}</td><td class="dv">${cooling.hasCooling ? 'EER ' + (parseFloat(cooling.eer) || coolSys?.eer || 0).toFixed(2) : '\u2014'}</td></tr>
<tr><td><strong>Ventilare</strong></td><td>${ventDesc}</td><td>${ventilation.type !== 'NAT' ? 'Electricitate' : '\u2014'}</td><td class="dv">${instSummary?.hrEta > 0 ? 'HR \u03b7=' + (instSummary.hrEta*100).toFixed(0) + '%' : '\u2014'}</td></tr>
<tr><td><strong>Iluminat</strong></td><td>${lightDesc}</td><td>Electricitate</td><td class="dv">LENI=${instSummary?.leni?.toFixed(1) || '\u2014'} kWh/m\u00b2\u00b7an</td></tr>
</table>

<!-- C. BILAN\u021a SINTEZ\u0102 -->
<table class="d">
<tr><td colspan="6" class="dh">${T.balTitle}</td></tr>
<tr><td class="ds">Indicator</td><td class="ds" style="text-align:center">\u00CEnc\u0103lzire</td><td class="ds" style="text-align:center">ACC</td><td class="ds" style="text-align:center">R\u0103cire</td><td class="ds" style="text-align:center">Ventilare</td><td class="ds" style="text-align:center">Iluminat</td></tr>
<tr><td><strong>Qf [kWh/m\u00b2\u00b7an]</strong></td><td class="dv">${qf_h_m2.toFixed(1)}</td><td class="dv">${qf_w_m2.toFixed(1)}</td><td class="dv">${qf_c_m2.toFixed(1)}</td><td class="dv">${qf_v_m2.toFixed(1)}</td><td class="dv">${qf_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>Ep [kWh/m\u00b2\u00b7an]</strong></td><td class="dv">${ep_h_m2.toFixed(1)}</td><td class="dv">${ep_w_m2.toFixed(1)}</td><td class="dv">${ep_c_m2.toFixed(1)}</td><td class="dv">${ep_v_m2.toFixed(1)}</td><td class="dv">${ep_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>CO\u2082 [kg/m\u00b2\u00b7an]</strong></td><td class="dv">${co2_h_m2.toFixed(1)}</td><td class="dv">${co2_w_m2.toFixed(1)}</td><td class="dv">${co2_c_m2.toFixed(1)}</td><td class="dv">${co2_v_m2.toFixed(1)}</td><td class="dv">${co2_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>Clas\u0103 Ep</strong></td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassH)]||'#999'};color:#fff">${utilClassH}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassW)]||'#999'};color:#fff">${utilClassW}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassC)]||'#999'};color:#fff">${utilClassC}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassV)]||'#999'};color:#fff">${utilClassV}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassL)]||'#999'};color:#fff">${utilClassL}</td>
</tr>
</table>

<div class="ft">Pagina 2/3 | CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${dateNow}</div>


<!-- ======== PAGINA 3 ======== -->
<div class="page-break"></div>
<div class="hdr">
  <h1 style="font-size:10pt">${T.p3title}</h1>
  <div class="ref">CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${catLabel}</div>
</div>

<table class="d">
<tr><td colspan="5" class="dh">${T.recTitle}</td></tr>
<tr>
  <td class="ds" style="width:5%">${isEN?"No.":"Nr."}</td>
  <td class="ds" style="width:38%">${T.measure}</td>
  <td class="ds" style="width:13%">${T.domain}</td>
  <td class="ds" style="width:22%">${T.savings}</td>
  <td class="ds" style="width:22%">${T.priority}</td>
</tr>
${(() => {
  const recs = [];
  let n = 1;
  const avgUOp = envRows.length > 0 ? envRows.reduce((s,r) => s + parseFloat(r.u), 0) / envRows.length : 0;
  const avgUGl = glazRows.length > 0 ? glazRows.reduce((s,r) => s + parseFloat(r.u), 0) / glazRows.length : 0;
  if (avgUOp > 0.5) recs.push({n:n++, m:'Termoizolare pere\u021bi exteriori ETICS (EPS/vat\u0103 mineral\u0103, 10\u201315 cm) \u2014 U \u2264 0.30 W/m\u00b2K', d:'Anvelop\u0103', e:'15\u201330% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  else if (avgUOp > 0.3) recs.push({n:n++, m:'Suplimentare termoizola\u021bie pere\u021bi (5\u201310 cm) pentru nivel nZEB', d:'Anvelop\u0103', e:'8\u201315% Qf \u00eenc\u0103lzire', p:'MEDIE'});
  if (avgUGl > 1.3) recs.push({n:n++, m:'\u00cenlocuire t\u00e2mpl\u0103rie exterioar\u0103 cu ferestre tripan (U \u2264 1.0 W/m\u00b2K, g \u2265 0.50)', d:'Anvelop\u0103', e:'10\u201320% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  const roofEl = envRows.find(r => r.type && (r.type.includes('Terasa') || r.type.includes('Pod') || r.type.includes('Acoperi')));
  if (roofEl && parseFloat(roofEl.u) > 0.25) recs.push({n:n++, m:'Termoizolare plan\u0219eu superior/teras\u0103 (15\u201320 cm vat\u0103 mineral\u0103/XPS)', d:'Anvelop\u0103', e:'8\u201315% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  if (instSummary && !instSummary.isCOP && instSummary.eta_total_h < 0.80) recs.push({n:n++, m:'\u00cenlocuire cazan cu condensare (\u03b7>95%) sau pomp\u0103 de c\u0103ldur\u0103 aer-ap\u0103 (COP>3.5)', d:'Instala\u021bii', e:'20\u201340% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  if (instSummary?.isCOP && parseFloat(heating.eta_gen) < 3.0) recs.push({n:n++, m:'Modernizare pomp\u0103 de c\u0103ldur\u0103 (COP>4.0, inverter)', d:'Instala\u021bii', e:'10\u201320% Qf \u00eenc\u0103lzire', p:'MEDIE'});
  if (ventilation.type === 'NAT') recs.push({n:n++, m:'Sistem ventilare mecanic\u0103 cu recuperare c\u0103ldur\u0103 (\u03b7 \u2265 75%)', d:'Instala\u021bii', e:'10\u201325% Qf total', p:'MEDIE'});
  if (instSummary?.leni > 10) recs.push({n:n++, m:'\u00cenlocuire iluminat cu LED + senzori prezen\u021b\u0103', d:'Instala\u021bii', e:'30\u201360% Qf iluminat', p:'MEDIE'});
  if (rer < 30) recs.push({n:n++, m:'Instalare sistem fotovoltaic (3\u20135 kWp) pentru RER \u2265 30%', d:'SRE', e:'RER +10\u201330%', p:'RIDICAT\u0102'});
  if (sre_solar_th < 1 && qf_w_m2 > 10) recs.push({n:n++, m:'Panouri solare termice pentru ACC (2\u20134 m\u00b2)', d:'SRE', e:'40\u201370% Qf ACC', p:'MEDIE'});
  if (recs.length === 0) recs.push({n:1, m:'Cl\u0103direa prezint\u0103 performan\u021b\u0103 energetic\u0103 bun\u0103. Men\u021binere \u00eentre\u021binere regulat\u0103.', d:'General', e:'\u2014', p:'\u2014'});
  return recs.map(r => '<tr><td style="text-align:center">' + r.n + '</td><td>' + r.m + '</td><td style="text-align:center">' + r.d + '</td><td style="text-align:center">' + r.e + '</td><td style="text-align:center;font-weight:bold;color:' + (r.p==='RIDICAT\u0102'?'#d42517':r.p==='MEDIE'?'#e17000':'#555') + '">' + r.p + '</td></tr>').join("");
})()}
</table>

<!-- E. OBSERVA\u021aII -->
<table class="d">
<tr><td class="dh">${T.obsTitle}</td></tr>
<tr><td style="min-height:50px;line-height:1.5;padding:5px 6px;font-size:7.5pt">${auditor.observations || 'Cl\u0103direa a fost evaluat\u0103 conform Mc 001-2022. Valorile sunt calculate pe baza datelor furnizate \u0219i a inspec\u021biei vizuale.'}</td></tr>
</table>

<!-- Note legislative -->
<div style="font-size:6pt;color:#666;margin-top:4px;line-height:1.4;padding:3px;border:1px solid #ddd;background:#fafafa">
  <strong>Cadru legislativ:</strong> L.372/2005 (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023), C107/0-7, NP048, SR EN ISO 52000-1:2017/NA:2023, SR EN ISO 13790, Dir. UE 2024/1275 (EPBD IV).<br>
  * Valori calculate. Certificatul este valabil 10 ani. Nu garanteaz\u0103 consumul real.
</div>

<!-- Semn\u0103turi finale -->
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;font-size:7pt">
  <div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "...."} / Gr. ${auditor.grade}<br>Data: ${auditor.date || dateNow}</div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.auditorSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.benefSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
</div>

<div class="ft">Pagina 3/3 | CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${dateNow}</div>

</body></html>`;
              // Show in state-driven overlay iframe via srcdoc
              setPdfPreviewHtml(htmlContent);
              return htmlContent;
              } catch(err) { showToast("Eroare generare CPE: " + err.message, "error", 8000); console.error("generatePDF error:", err); return null; }
            };

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(5)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 5</button>
                  <h2 className="text-xl font-bold">Certificat de Performanta Energetica (CPE)</h2>
                </div>
                <p className="text-xs opacity-40">Generare CPE conform Ordinului MDLPA nr. 16/2023 — format oficial cu clasare dubla</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Date auditor + generare */}
                <div className="space-y-5">
                  <Card title={t("Date auditor energetic",lang)}>
                    <div className="space-y-3">
                      <Input label={t("Nume complet auditor",lang)} value={auditor.name} onChange={v => setAuditor(p=>({...p,name:v}))} placeholder="Ing. Popescu Ion" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Nr. atestat MLPAT/MDLPA",lang)} value={auditor.atestat} onChange={v => setAuditor(p=>({...p,atestat:v}))} placeholder="12345" />
                        <Select label={t("Grad atestat",lang)} value={auditor.grade} onChange={v => setAuditor(p=>({...p,grade:v}))}
                          options={[{value:"I",label:"Gradul I"},{value:"II",label:"Gradul II"},{value:"III",label:"Gradul III"}]} />
                      </div>
                      <Input label={t("Firma / PFA",lang)} value={auditor.company} onChange={v => setAuditor(p=>({...p,company:v}))} />
                      {tier.brandingCPE && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/10">
                          {auditor.companyLogo && <img src={auditor.companyLogo} alt="Logo" className="h-8 object-contain" />}
                          <label className="text-xs opacity-50 cursor-pointer hover:opacity-80">
                            {auditor.companyLogo ? "Schimbă logo" : "📎 Adaugă logo firmă (Business)"}
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setAuditor(p=>({...p,companyLogo:reader.result}));
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Telefon",lang)} value={auditor.phone} onChange={v => setAuditor(p=>({...p,phone:v}))} />
                        <Input label={t("Email",lang)} value={auditor.email} onChange={v => setAuditor(p=>({...p,email:v}))} />
                      </div>
                      <Input label={t("Data elaborarii CPE",lang)} value={auditor.date} onChange={v => setAuditor(p=>({...p,date:v}))} type="date" />
                      <Input label={t("Cod unic MDLPA (dupa inregistrare)",lang)} value={auditor.mdlpaCode} onChange={v => {
                        // Format validation: allow digits, letters, dots, dashes
                        const cleaned = v.replace(/[^A-Za-z0-9.\-\/]/g, "").toUpperCase().slice(0, 20);
                        setAuditor(p=>({...p,mdlpaCode:cleaned}));
                      }}
                        placeholder="ex: CPE-12345/2026" />
                      {auditor.mdlpaCode && auditor.mdlpaCode.length > 3 && (
                        <div className="text-[10px] mt-0.5 opacity-30 flex items-center gap-2">
                          <span>Cod: <strong>{auditor.mdlpaCode}</strong></span>
                          <span>•</span>
                          <span>Format așteptat: CPE-XXXXX/AAAA sau numeric</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* MDLPA Registry info */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                    <div className="text-[10px] opacity-50 font-medium mb-1">Registru MDLPA</div>
                    <div className="text-[10px] opacity-35 space-y-1">
                      <div>Codul unic se obține după înregistrarea CPE pe platforma electronică a MDLPA.</div>
                      <div>Platforma: <strong>https://www.mdlpa.ro</strong> → Registru certificate energetice</div>
                      <div>Conform Art.19 L.372/2005 mod. L.238/2024, CPE se înregistrează în max 30 zile de la elaborare.</div>
                    </div>
                  </div>

                  {/* Cost-optim quick summary */}
                  {instSummary && renewSummary && (
                    <Card title="Analiză cost-optimă rapidă" className="border-blue-500/20">
                      <div className="space-y-2">
                        {(() => {
                          const Au = parseFloat(building.areaUseful) || 1;
                          const costKwh = instSummary.fuel?.id === "electricitate" ? 1.30 : instSummary.fuel?.id === "gaz" ? 0.32 : 0.30;
                          const annCost = (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) * costKwh / 4.95;
                          const epF = renewSummary.ep_adjusted_m2;
                          const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                          const gap = Math.max(0, epF - getNzebEpMax(building.category, selectedClimate?.zone));
                          const rerGap = Math.max(0, nzeb.rer_min - renewSummary.rer);
                          return (<>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{annCost.toFixed(0)} €</div>
                                <div className="text-[10px] opacity-40">Cost energie/an</div>
                              </div>
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{epF.toFixed(0)}</div>
                                <div className="text-[10px] opacity-40">Ep [kWh/m²a]</div>
                              </div>
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{renewSummary.co2_adjusted_m2.toFixed(1)}</div>
                                <div className="text-[10px] opacity-40">CO₂ [kg/m²a]</div>
                              </div>
                            </div>
                            {gap > 0 && (
                              <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                                ⚠ Depășire prag nZEB cu <strong>{gap.toFixed(0)} kWh/m²a</strong>. 
                                Prioritate: termoizolarea anvelopei + pompa de căldură.
                              </div>
                            )}
                            {rerGap > 0 && (
                              <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                                ⚠ RER insuficient: mai sunt necesare <strong>{rerGap.toFixed(0)}%</strong> surse regenerabile.
                                Soluție: PV {(rerGap*Au*epF/100/350).toFixed(0)} m² panouri.
                              </div>
                            )}
                            {gap <= 0 && rerGap <= 0 && (
                              <div className="text-[10px] text-emerald-400/80 bg-emerald-500/5 rounded p-2">
                                ✓ Clădirea îndeplinește pragurile nZEB. Economie față de clasă G: ~{Math.round(annCost * 0.6)} €/an.
                              </div>
                            )}
                          </>);
                        })()}
                      </div>
                    </Card>
                  )}

                  <Card title={t("Observatii suplimentare",lang)}>
                    <textarea value={auditor.observations} onChange={e => setAuditor(p=>({...p,observations:e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm min-h-[100px] focus:outline-none focus:border-amber-500/50 resize-y"
                      placeholder="Observatii privind starea cladirii, limitari ale evaluarii, etc." />
                  </Card>

                  {/* Dashboard auditor statistici */}
                  <Card title="Statistici auditor">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-amber-400">{certCount}</div>
                        <div className="text-[10px] opacity-40">Certificate luna</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-emerald-400">{projectList.length}</div>
                        <div className="text-[10px] opacity-40">Proiecte salvate</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold" style={{color:enClass.color}}>{enClass.cls}</div>
                        <div className="text-[10px] opacity-40">Clasă curentă</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold text-blue-400">{rer.toFixed(0)}%</div>
                        <div className="text-[10px] opacity-40">RER</div>
                      </div>
                    </div>
                  </Card>

                  {/* Google Maps localizare */}
                  {building.city && (
                    <Card title="Localizare">
                      <div className="rounded-lg overflow-hidden border border-white/10" style={{height:"150px"}}>
                        <iframe
                          src={`https://maps.google.com/maps?q=${encodeURIComponent((building.address||"") + ", " + building.city + ", Romania")}&z=15&output=embed`}
                          className="w-full h-full border-0" title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                      </div>
                    </Card>
                  )}

                  <Card title={t("Foto cladire (optional)",lang)}>
                    <div className="space-y-2">
                      {auditor.photo && (
                        <div className="relative">
                          <img src={auditor.photo} alt="Foto cladire" className="w-full max-h-40 object-contain rounded-lg border border-white/10" />
                          <button onClick={() => setAuditor(p=>({...p,photo:""}))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500">&times;</button>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all text-sm">
                        <span>📷</span> {auditor.photo ? "Schimba foto" : "Incarca foto cladire"}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { showToast("Imaginea trebuie să fie sub 2 MB", "error"); return; }
                          // #8 Compresie foto — redimensionare la max 600px și compresie JPEG 0.7
                          const img = new Image();
                          img.onload = () => {
                            const maxDim = 600;
                            let w = img.width, h = img.height;
                            if (w > maxDim || h > maxDim) {
                              const ratio = Math.min(maxDim / w, maxDim / h);
                              w = Math.round(w * ratio);
                              h = Math.round(h * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            const compressed = canvas.toDataURL('image/jpeg', 0.7);
                            setAuditor(p => ({...p, photo: compressed}));
                          };
                          img.src = URL.createObjectURL(file);
                          e.target.value = "";
                        }} />
                      </label>
                      <div className="text-[10px] opacity-30">Max 2 MB, JPG/PNG. Apare in CPE la rubrica foto cladire.</div>
                    </div>
                  </Card>

                  {/* Validation warnings */}
                  {(() => {
                    const warns = [];
                    const infos = [];
                    // CRITICE — blochează generarea
                    if (Au <= 0) warns.push("❌ Suprafața utilă (Au) nu este definită — Pasul 1");
                    if (!building.locality) warns.push("❌ Localitatea de calcul nu este selectată — Pasul 1");
                    if (!building.category) warns.push("❌ Categoria funcțională nu este selectată — Pasul 1");
                    if (opaqueElements.length === 0 && glazingElements.length === 0) warns.push("❌ Niciun element de anvelopă definit — Pasul 2");
                    if ((parseFloat(building.volume) || 0) <= 0) warns.push("❌ Volumul interior nu este definit — Pasul 1");
                    if (!heating.source) warns.push("❌ Sursa de încălzire nu este configurată — Pasul 3");
                    if (!instSummary) warns.push("❌ Calculul energetic nu este disponibil (completați pașii 1-4)");
                    // IMPORTANTE — afectează calitatea
                    if (!auditor.name) warns.push("⚠ Numele auditorului nu este completat");
                    if (!auditor.atestat) warns.push("⚠ Nr. atestat MDLPA lipsește");
                    if (!auditor.date) infos.push("ℹ Data elaborării CPE nu este setată");
                    if (!building.yearBuilt) infos.push("ℹ Anul construcției lipsește");
                    else if (parseInt(building.yearBuilt) < 1800 || parseInt(building.yearBuilt) > new Date().getFullYear()) warns.push("⚠ Anul construcției (" + building.yearBuilt + ") pare incorect");
                    if (!building.address) infos.push("ℹ Adresa clădirii nu este completată");
                    if (parseFloat(building.volume) <= 0) infos.push("ℹ Volumul încălzit (V) nu este definit");
                    if (!building.floors) infos.push("ℹ Regimul de înălțime nu este completat");
                    // RECOMANDĂRI nZEB
                    if (renewSummary && renewSummary.rer < 30) infos.push("ℹ RER < 30% — clădirea nu îndeplinește cerința nZEB");
                    if (thermalBridges.length === 0) infos.push("ℹ Punțile termice nu sunt definite (se folosesc valori forfetare)");
                    if (!photovoltaic.enabled && !solarThermal.enabled && !heatPump.enabled && !biomass.enabled) infos.push("ℹ Nicio sursă regenerabilă configurată — Pasul 4");
                    // Completitudine
                    const totalChecks = 12;
                    const passedChecks = [
                      Au > 0, !!building.locality, !!building.category, opaqueElements.length > 0,
                      glazingElements.length > 0, !!heating.source, !!instSummary, !!auditor.name,
                      !!auditor.atestat, !!building.yearBuilt, !!building.address, !!auditor.date
                    ].filter(Boolean).length;
                    const completePct = Math.round(passedChecks / totalChecks * 100);

                    if (warns.length === 0 && infos.length === 0) return (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-xs font-bold text-emerald-400">✓ Toate datele sunt complete ({completePct}%)</div>
                        <div className="text-[10px] opacity-40 mt-1">CPE-ul poate fi generat fără probleme.</div>
                      </div>
                    );
                    return (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-amber-400">Verificări necesare</div>
                          <div className="text-[10px] px-2 py-0.5 rounded bg-white/5">{completePct}% complet</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{width:completePct+"%",background:completePct>=80?"#22c55e":completePct>=50?"#eab308":"#ef4444"}} />
                        </div>
                        {warns.map((w,i) => <div key={"w"+i} className="text-[11px] text-amber-300/80">{w}</div>)}
                        {infos.map((w,i) => <div key={"i"+i} className="text-[10px] opacity-40">{w}</div>)}
                      </div>
                    );
                  })()}


                  <button onClick={function() {
                    if (!canNzebReport) { requireUpgrade("Raport nZEB necesită plan Pro"); return; }
                    if (!instSummary || !renewSummary) { showToast("Completați pașii 1-5 pentru raport nZEB.", "error"); return; }
                    try {
                    const Au = parseFloat(building.areaUseful) || 0;
                    const V = parseFloat(building.volume) || 0;
                    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                    const epF = renewSummary.ep_adjusted_m2;
                    const n50Val = parseFloat(building.n50) || 4.0;
                    const isEN = lang === "EN";
                    const dateNow = new Date().toISOString().slice(0,10);
                    const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";
                    const zebMax = getNzebEpMax(building.category, selectedClimate?.zone) * ZEB_FACTOR;
                    const hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                    const isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;

                    // Verificari U per element
                    const uChecks = opaqueElements.map(function(el) {
                      const uRef = getURefNZEB(building.category, el.type);
                      const uCalc = el.layers && el.layers.length > 0 ? (function() {
                        const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                        const rsi = elType ? elType.rsi : 0.13;
                        const rse = elType ? elType.rse : 0.04;
                        const rLayers = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                        return 1/(rsi+rLayers+rse);
                      })() : null;
                      return { name: el.name || el.type, type: el.type, uCalc: uCalc, uRef: uRef, ok: uRef ? (uCalc !== null ? uCalc <= uRef : null) : null };
                    });
                    const glazUChecks = glazingElements.map(function(el) {
                      const uVal = parseFloat(el.u) || 3.0;
                      const uRef = ["RI","RC","RA"].includes(building.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
                      return { name: el.name || "Vitraj", uCalc: uVal, uRef: uRef, ok: uVal <= uRef };
                    });

                    // Criterii complete nZEB L.238/2024
                    const criteria = [
                      { id: "EP", name: "Energie primară (Ep)", value: epF.toFixed(1) + " kWh/m²·an", limit: "< " + getNzebEpMax(building.category, selectedClimate?.zone) + " kWh/m²·an", ok: epF <= getNzebEpMax(building.category, selectedClimate?.zone), weight: "CRITIC" },
                      { id: "RER", name: "RER total (Renewable Energy Ratio)", value: renewSummary.rer.toFixed(1) + "%", limit: "≥ " + nzeb.rer_min + "%", ok: renewSummary.rer >= nzeb.rer_min, weight: "CRITIC" },
                      { id: "RER_ONSITE", name: "RER on-site (producție proprie)", value: renewSummary.rerOnSite.toFixed(1) + "%", limit: "≥ 10%", ok: renewSummary.rerOnSiteOk, weight: "CRITIC" },
                      { id: "N50", name: "Permeabilitate la aer (n50)", value: n50Val.toFixed(1) + " h⁻¹", limit: "≤ 1.0 h⁻¹ (nZEB) / ≤ 3.0 h⁻¹ (renovare)", ok: n50Val <= 3.0, ideal: n50Val <= 1.0, weight: "MAJOR" },
                    ];
                    const allOpOk = uChecks.every(function(c){return c.ok === null || c.ok === true;});
                    const allGlOk = glazUChecks.every(function(c){return c.ok;});
                    const globalNzeb = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && renewSummary.rer >= nzeb.rer_min && renewSummary.rerOnSiteOk && allOpOk && allGlOk;

                    // Cost-optim simplu per măsură (NPV pe 20 ani, discount 5%)
                    const costEn = instSummary ? (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) : 0;
                    const priceKwh = instSummary?.fuel?.id === "electricitate" ? 1.30 : instSummary?.fuel?.id === "gaz" ? 0.32 : 0.30;
                    const annualCostEur = costEn * priceKwh / 4.95;

                    const nzebHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Raport nZEB — ${building.address || "Clădire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI","Roboto",sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;padding:12mm 15mm;max-width:210mm;margin:0 auto;line-height:1.5}
@media print{@page{size:A4;margin:10mm 12mm} body{padding:0} .no-print{display:none!important}}
@media screen and (max-width:600px){body{padding:4mm 3mm;font-size:8.5pt}}
h1{font-size:14pt;color:#003366;text-align:center;margin-bottom:2px;letter-spacing:0.5px}
h2{font-size:11pt;color:#003366;margin:14px 0 6px;padding:4px 8px;background:#e8edf5;border-left:4px solid #003366}
h3{font-size:9.5pt;color:#003366;margin:10px 0 4px}
.sub{text-align:center;font-size:8pt;color:#555;margin-bottom:12px}
.meta{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:8pt;color:#444;margin-bottom:10px;padding:6px 8px;background:#f8f9fc;border:1px solid #ddd;border-radius:4px}
.meta b{color:#003366}
table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8.5pt}
th,td{border:1px solid #999;padding:3px 6px;vertical-align:middle}
th{background:#003366;color:#fff;font-weight:600;text-align:center;font-size:8pt}
.ok{background:#d4edda;color:#155724;font-weight:bold;text-align:center}
.fail{background:#f8d7da;color:#721c24;font-weight:bold;text-align:center}
.warn{background:#fff3cd;color:#856404;font-weight:bold;text-align:center}
.crit{font-weight:bold;color:#721c24}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:8pt;font-weight:bold;letter-spacing:0.3px}
.badge-ok{background:#00642d;color:#fff}
.badge-fail{background:#d42517;color:#fff}
.badge-warn{background:#e17000;color:#fff}
.global{text-align:center;padding:12px;margin:10px 0;border:2px solid;border-radius:8px;font-size:12pt;font-weight:bold}
.global-ok{border-color:#00642d;background:#d4edda;color:#00642d}
.global-fail{border-color:#d42517;background:#f8d7da;color:#d42517}
.note{font-size:7.5pt;color:#666;padding:4px 8px;background:#fafafa;border:1px solid #eee;margin-top:6px;border-radius:3px}
.bar{height:14px;border-radius:3px;display:inline-block;vertical-align:middle}
.ft{text-align:center;font-size:7pt;color:#999;margin-top:10px;padding-top:4px;border-top:1px solid #ddd}
.cost-row td{font-size:8pt}
.flex-row{display:flex;gap:12px;margin:8px 0}
.flex-row>div{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center}
.flex-row .big{font-size:16pt;font-weight:bold;color:#003366}
.flex-row .lbl{font-size:7.5pt;color:#888;margin-top:2px}
</style></head><body>
<h1>RAPORT DE CONFORMARE nZEB</h1>
<div class="sub">conform Legii 372/2005 (modificată prin Legea 238/2024) și Mc 001-2022 (Ord. MDLPA 16/2023)</div>

<div class="meta">
<div><b>Clădire:</b> ${building.address || "—"}, ${building.city || ""} ${building.county || ""}</div>
<div><b>Categorie:</b> ${catLabel}</div>
<div><b>An constr.:</b> ${building.yearBuilt || "—"}</div>
<div><b>Au:</b> ${Au.toFixed(1)} m²</div>
<div><b>V:</b> ${V.toFixed(0)} m³</div>
<div><b>Zonă climatică:</b> ${selectedClimate?.zone || "—"} (${selectedClimate?.name || "—"})</div>
<div><b>Auditor:</b> ${auditor.name || "—"} (At. ${auditor.atestat || "—"})</div>
<div><b>Data:</b> ${dateNow}</div>
</div>

<div class="global ${globalNzeb ? 'global-ok' : 'global-fail'}">
${globalNzeb ? '✓ CLĂDIREA ÎNDEPLINEȘTE CERINȚELE nZEB' : '✗ CLĂDIREA NU ÎNDEPLINEȘTE CERINȚELE nZEB'}
</div>

<h2>1. Criterii principale nZEB</h2>
<table>
<tr><th style="width:5%">Nr.</th><th style="width:28%">Criteriu</th><th style="width:18%">Valoare calculată</th><th style="width:20%">Limită nZEB</th><th style="width:12%">Rezultat</th><th style="width:17%">Importanță</th></tr>
${criteria.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.value+'</td><td style="text-align:center">'+c.limit+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓ DA':'✗ NU')+'</td><td style="text-align:center" class="'+(c.weight==='CRITIC'?'crit':'')+'">'+c.weight+'</td></tr>';}).join("")}
</table>

<h2>2. Verificare transmitanță termică U vs. U'max nZEB</h2>
<h3>2.1 Elemente opace</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>Tip</th><th>U calculat [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${uChecks.length > 0 ? uChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td>'+c.type+'</td><td style="text-align:center;font-weight:bold">'+(c.uCalc!==null?c.uCalc.toFixed(3):'—')+'</td><td style="text-align:center">'+(c.uRef!==null?c.uRef.toFixed(2):'N/A')+'</td><td class="'+(c.ok===null?'warn':c.ok?'ok':'fail')+'">'+(c.ok===null?'—':c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="6" style="text-align:center;color:#999">— Niciun element opac definit —</td></tr>'}
</table>
<h3>2.2 Elemente vitrate</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>U [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${glazUChecks.length > 0 ? glazUChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.uCalc.toFixed(2)+'</td><td style="text-align:center">'+c.uRef.toFixed(2)+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="5" style="text-align:center;color:#999">— Niciun element vitrat definit —</td></tr>'}
</table>

<h2>3. Surse regenerabile de energie (SRE)</h2>
<div class="flex-row">
<div><div class="big">${renewSummary.rer.toFixed(1)}%</div><div class="lbl">RER Total (min 30%)</div></div>
<div><div class="big">${renewSummary.rerOnSite.toFixed(1)}%</div><div class="lbl">RER On-site (min 10%)</div></div>
<div><div class="big">${(renewSummary.totalRenewable/Math.max(Au,1)).toFixed(1)}</div><div class="lbl">kWh/m²·an din SRE</div></div>
</div>
<table>
<tr><th>Sursă SRE</th><th>Producție [kWh/an]</th><th>kWh/m²·an</th><th>Activă</th></tr>
<tr><td>Solar termic</td><td style="text-align:right">${renewSummary.qSolarTh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qSolarTh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${solarThermal.enabled?'✓':'—'}</td></tr>
<tr><td>Fotovoltaic (PV)</td><td style="text-align:right">${renewSummary.qPV_kWh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPV_kWh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${photovoltaic.enabled?'✓':'—'}</td></tr>
<tr><td>Pompă de căldură (ambientală)</td><td style="text-align:right">${renewSummary.qPC_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPC_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${heatPump.enabled?'✓':'—'}</td></tr>
<tr><td>Biomasă</td><td style="text-align:right">${renewSummary.qBio_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qBio_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${biomass.enabled?'✓':'—'}</td></tr>
<tr><td>Eolian + Cogenerare</td><td style="text-align:right">${(renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0)).toFixed(0)}</td><td style="text-align:right">${((renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0))/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${otherRenew.windEnabled||otherRenew.cogenEnabled?'✓':'—'}</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>TOTAL SRE</td><td style="text-align:right">${renewSummary.totalRenewable.toFixed(0)}</td><td style="text-align:right">${renewSummary.totalRenewable_m2.toFixed(1)}</td><td></td></tr>
</table>

<h2>4. Verificare ZEB Ready (EPBD IV — Dir. UE 2024/1275)</h2>
<table>
<tr><th style="width:35%">Criteriu ZEB</th><th style="width:25%">Valoare</th><th style="width:25%">Cerință</th><th style="width:15%">Rezultat</th></tr>
<tr><td>Ep ≤ nZEB × 0.90</td><td style="text-align:center">${epF.toFixed(1)} kWh/m²a</td><td style="text-align:center">≤ ${zebMax.toFixed(0)} kWh/m²a</td><td class="${epF<=zebMax?'ok':'fail'}">${epF<=zebMax?'✓':'✗'}</td></tr>
<tr><td>Combustibil fosil on-site</td><td style="text-align:center">${hasFossil?'DA — '+instSummary.fuel?.label:'NU'}</td><td style="text-align:center">NU (zero emisii)</td><td class="${!hasFossil?'ok':'fail'}">${!hasFossil?'✓':'✗'}</td></tr>
<tr><td>RER ≥ 30%</td><td style="text-align:center">${renewSummary.rer.toFixed(1)}%</td><td style="text-align:center">≥ 30%</td><td class="${renewSummary.rer>=30?'ok':'fail'}">${renewSummary.rer>=30?'✓':'✗'}</td></tr>
<tr style="font-weight:bold"><td>Status ZEB</td><td colspan="2" style="text-align:center">Obligatoriu: cl. publice noi 01.01.2028 / toate cl. noi 01.01.2030</td><td class="${isZEB?'ok':'warn'}">${isZEB?'✓ ZEB READY':'⚠ NU ZEB'}</td></tr>
</table>

${["BI","ED","SA","HC","CO","SP"].includes(building.category) && Au > 250 ? '<div class="note" style="border-color:#e17000;background:#fff8f0"><strong>⚠ Obligație solară EPBD IV Art.10:</strong> Clădire non-rezidențială > 250 m² — instalație solară obligatorie de la sfârșitul 2026. ' + (photovoltaic.enabled || solarThermal.enabled ? '<span class="badge badge-ok">✓ Instalație solară configurată</span>' : '<span class="badge badge-fail">✗ Nicio instalație solară configurată</span>') + '</div>' : ''}

<h2>5. GWP Lifecycle (EPBD IV Art.7)</h2>
<table>
<tr><th style="width:35%">Parametru</th><th style="width:25%">Valoare</th><th style="width:40%">Observații</th></tr>
<tr><td>CO₂ operațional</td><td style="text-align:center;font-weight:bold">${renewSummary.co2_adjusted_m2.toFixed(1)} kg/m²·an</td><td>Din calcul Mc 001-2022</td></tr>
<tr><td>Carbon înglobat (estimare)</td><td style="text-align:center">${(function(){var yb=parseInt(building.yearBuilt)||2000; return yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5;})().toFixed(0)} kg CO₂eq/m²·an</td><td>Estimare simplificată EN 15978 (50 ani)</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>GWP Lifecycle Total</td><td style="text-align:center">${(function(){var co2O=renewSummary.co2_adjusted_m2; var gwpM=parseFloat(building.gwpLifecycle)||0; var yb=parseInt(building.yearBuilt)||2000; var emb=yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5; return gwpM>0?gwpM:(co2O+emb);})().toFixed(1)} kg CO₂eq/m²·an</td><td>${Au>1000?'<span class="badge badge-warn">OBLIGATORIU (>1000 m²)</span>':'Opțional (obligatoriu >1000m² din 2028)'}</td></tr>
</table>
<div class="note">Conform EPBD IV Art.7, declararea GWP lifecycle devine obligatorie: clădiri noi >1000 m² din 2028, toate clădirile noi din 2030. Calculul complet necesită analiza ciclului de viață (LCA) conform EN 15978.</div>

<h2>6. Analiză cost-optimă simplificată</h2>
<div class="flex-row">
<div><div class="big">${annualCostEur.toFixed(0)} €</div><div class="lbl">Cost energie anual estimat</div></div>
<div><div class="big">${epF.toFixed(0)}</div><div class="lbl">kWh/m²·an (Ep)</div></div>
<div><div class="big">${renewSummary.co2_adjusted_m2.toFixed(1)}</div><div class="lbl">kg CO₂/m²·an</div></div>
</div>
<div class="note"><strong>Metodă cost-optimă:</strong> Pentru atingerea nZEB, se recomandă prioritizarea măsurilor cu raportul economie/investiție cel mai favorabil: (1) termoizolarea anvelopei opace, (2) înlocuirea tâmplăriei, (3) pompe de căldură/PV, (4) ventilare cu recuperare. Analiza cost-optimă detaliată necesită calcul conform Regulamentului Delegat UE 244/2012.</div>

<h2>7. Cadru legislativ aplicabil</h2>
<div class="note" style="line-height:1.6">
<strong>Legislație națională:</strong> Legea 372/2005 privind performanța energetică a clădirilor (mod. Legea 238/2024 + OUG 59/2025 RED III); Mc 001-2022 (Ord. MDLPA 16/2023); C107/2005 + Ord. 2641/2017; I5-2022 (ventilare și climatizare); SR 4839:2014 (date climatice).<br>
<strong>Legislație europeană:</strong> Directiva UE 2024/1275 (EPBD IV) — termen transpunere 29 mai 2026; Reg. Delegat UE 2025/2273 (republicare metodologie cost-optimă, referință 50 kWh/m²·an); SR EN ISO 52000-1:2017/NA:2023; SR EN ISO 52016-1:2017; SR EN ISO 13790; I5-2022 (ventilare).<br>
<strong>Praguri nZEB categoria ${building.category}:</strong> Ep < ${getNzebEpMax(building.category, selectedClimate?.zone)} kWh/m²·an, RER ≥ ${nzeb.rer_min}%, RER on-site ≥ ${NZEB_THRESHOLDS[building.category]?.rer_onsite_min || 10}%.<br>
<strong>Notă:</strong> Acest raport este generat automat și are caracter orientativ. Nu înlocuiește raportul de audit energetic elaborat de un auditor atestat MDLPA.
</div>

<div style="display:flex;justify-content:space-between;margin-top:15px;font-size:8pt">
<div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "____"} / Gr. ${auditor.grade}</div>
<div style="text-align:center;border:1px dashed #999;padding:4px 20px;min-height:40px;font-size:6pt;color:#999">Semnătura / ștampila</div>
</div>

<div class="ft">Raport nZEB generat cu EnergoPro Mc001 v1.0 | ${dateNow} | L.372/2005 mod. L.238/2024, Mc 001-2022</div>
</body></html>`;

                    setNzebReportHtml(nzebHtml);
                    showToast("Raport nZEB generat.", "success");
                    } catch(e) { showToast("Eroare raport nZEB: " + e.message, "error", 6000); }
                  }}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm mt-3">
                    <span className="text-lg">📋</span> Raport conformare nZEB (L.238/2024)
                    {!canNzebReport && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>}
                  </button>

                  {/* nZEB Report as downloadable HTML file */}
                  {nzebReportHtml && (
                    <button onClick={function() {
                      try {
                        const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "Raport_nZEB_" + (building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + "_" + new Date().toISOString().slice(0,10) + ".html";
                        document.body.appendChild(a); a.click();
                        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                        showToast("Raport nZEB descărcat ca HTML (deschide în browser → Print → Save as PDF)", "success", 5000);
                      } catch(e) { showToast("Eroare: " + e.message, "error"); }
                    }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] text-emerald-400/70 hover:bg-emerald-500/10 transition-all text-xs">
                      <span>💾</span> Descarcă raport nZEB (.html → Print to PDF)
                    </button>
                  )}

                  <button onClick={async function() {
                    try {
                      showToast("Se generează preview PDF...", "info", 3000);

                      // Generează DOCX via API + convertește la PDF via Gotenberg
                      const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                      const buf = await fetchTemplate(tpl.cpe);
                      const docxBlob = await generateDocxCPE(buf, "cpe", {download: false});
                      if (docxBlob) {
                        const pdfResp = await fetch("/api/preview-pdf", { method: "POST", body: docxBlob });
                        if (pdfResp.ok) {
                          const pdfBlob = await pdfResp.blob();
                          if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                          const url = URL.createObjectURL(pdfBlob);
                          setPdfPreviewUrl(url);
                          showToast("Preview PDF generat", "success", 1500);
                        } else {
                          throw new Error("Gotenberg unavailable");
                        }
                      }
                    } catch(e) {
                      // Fallback: HTML preview (nu setăm pdfPreviewHtml care deschide overlay)
                      showToast("Preview HTML (fallback)", "info", 1500);
                    }
                  }}
                    data-auto-preview="true"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all text-sm">
                    <span className="text-lg">📄</span> {lang==="EN"?"Generate EPC (Print / PDF)":"Generează CPE (Print / PDF)"}
                  </button>

                  {/* Certificate counter */}
                  {userTier !== "free" && (
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 text-[10px]">
                      <span className="opacity-50">{lang==="EN"?"Certificates this month":"Certificate luna aceasta"}</span>
                      <span className="font-bold">{certCount} / {tier.maxCerts === 999 ? "∞" : tier.maxCerts}</span>
                    </div>
                  )}

                  {/* #20 Mod prezentare */}
                  <button onClick={() => setPresentationMode(true)}
                    disabled={!instSummary}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-xs opacity-60 hover:opacity-100 transition-all">
                    <span>🖥️</span> Mod prezentare (ecran complet)
                  </button>

                </div>

                {/* Preview CPE — renderizare DOCX oficial */}
                <div className="xl:col-span-2 xl:sticky xl:top-6 xl:self-start">
                  <Card title={t("Preview Certificat",lang)} className="border-amber-500/30 shadow-lg shadow-amber-500/5">
                    {!pdfPreviewUrl ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="animate-pulse">
                          <div className="text-4xl mb-3">📜</div>
                          <div className="text-sm opacity-50">{lang==="EN" ? "Generating PDF preview..." : "Se generează previzualizarea PDF..."}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg overflow-hidden" style={{height:"85vh"}}>
                        <iframe src={pdfPreviewUrl} className="w-full h-full border-0" title="CPE Preview PDF" />
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* ═══ CHECKLIST COMPLETITUDINE CPE ═══ */}
              {(() => {
                const completenessItems = [
                  { label: "Date identificare clădire", ok: !!(building?.address && building?.city) },
                  { label: "Date climatice selectate", ok: !!(selectedClimate?.name || selectedClimate?.zone) },
                  { label: "Elemente anvelopă introduse", ok: (opaqueElements?.length ?? 0) > 0 },
                  { label: "Sistem încălzire configurat", ok: !!(heating?.source && heating.source !== "NONE" && heating.source !== "none") },
                  { label: "Calcul energetic efectuat", ok: !!instSummary },
                  { label: "Date auditor completate", ok: !!(auditor?.name && auditor?.atestat) },
                ];
                const completenessScore = completenessItems.filter(i => i.ok).length;
                const completenessTotal = completenessItems.length;
                const completenessPct = Math.round((completenessScore / completenessTotal) * 100);
                const allDone = completenessScore === completenessTotal;
                const barColor = allDone ? "#22c55e" : completenessScore >= 4 ? "#eab308" : "#f97316";

                return (
                  <div className={`mt-5 rounded-xl border p-4 ${allDone ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/20 bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-xs font-semibold ${allDone ? "text-emerald-400" : "text-amber-400"}`}>
                        {allDone ? "✓ Date complete pentru generare CPE" : "Completitudine date CPE DOCX"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{color: barColor}}>
                          {completenessScore}/{completenessTotal} câmpuri completate
                        </span>
                        <span className="text-[10px] opacity-40">({completenessPct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: completenessPct + "%", background: barColor }}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                      {completenessItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`text-[11px] flex-shrink-0 ${item.ok ? "text-emerald-400" : "text-red-400/70"}`}>
                            {item.ok ? "✓" : "○"}
                          </span>
                          <span className={`text-[11px] ${item.ok ? "opacity-70" : "opacity-45"}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ═══ EXPORT DOCX OFICIAL — full-width sub grid ═══ */}
              {(() => {
                const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                const dataComplete = Au > 0 && instSummary && building.locality && building.category;
                const canGenerate = canExportDocx && dataComplete;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
                    <button
                      disabled={!canGenerate}
                      onClick={async () => {
                        if (!canGenerate) {
                          if (!dataComplete) showToast("Completați datele obligatorii (Au, localitate, categorie, instalații)", "error");
                          return;
                        }
                        try {
                          showToast("Se generează CPE DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.cpe);
                          await generateDocxCPE(buf, "cpe");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !canGenerate
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📋</span>
                        <div className="text-left">
                          <div className="font-medium">{lang==="EN" ? "Generate CPE DOCX" : "Generează CPE DOCX"}</div>
                          <div className="text-[10px] opacity-60">{tpl.cpe}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      disabled={!canGenerate}
                      onClick={async () => {
                        if (!canGenerate) {
                          if (!dataComplete) showToast("Completați datele obligatorii", "error");
                          return;
                        }
                        try {
                          showToast("Se generează Anexa DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.anexa);
                          await generateDocxCPE(buf, "anexa");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !canGenerate
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📎</span>
                        <div className="text-left">
                          <div className="font-medium">{lang==="EN" ? "Generate Annex 1+2 DOCX" : "Generează Anexa 1+2 DOCX"}</div>
                          <div className="text-[10px] opacity-60">{tpl.anexa}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const html = generatePDF();
                        if (!html) return;
                        const printWin = window.open("", "_blank");
                        printWin.document.write(html);
                        printWin.document.close();
                        printWin.onload = () => { printWin.print(); };
                        showToast("PDF: folosește Print → Save as PDF", "info", 3000);
                      }}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">🖨️</span>
                        <div className="text-left">
                          <div className="font-medium">Export PDF (Print)</div>
                          <div className="text-[10px] opacity-60">Deschide CPE HTML → Save as PDF</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={generateXMLMDLPA}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📤</span>
                        <div className="text-left">
                          <div className="font-medium">Export XML MDLPA</div>
                          <div className="text-[10px] opacity-60">Registru electronic Ord. 16/2023</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={exportPDFNative}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📑</span>
                        <div className="text-left">
                          <div className="font-medium">Export PDF cu QR</div>
                          <div className="text-[10px] opacity-60">Certificat complet cu QR code</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={exportQuickSheet}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📋</span>
                        <div className="text-left">
                          <div className="font-medium">Fișă sintetică client</div>
                          <div className="text-[10px] opacity-60">1 pagină rezumativă client-friendly</div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })()}

              {/* ═══ CLASE ENERGETICE PER APARTAMENT (doar RC — bloc colectiv) ═══ */}
              {(building.category === "RC") && (() => {
                const catKey = "RC" + (cooling.hasCooling ? "_cool" : "_nocool");
                const epBloc = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
                const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB["RC_nocool"];
                return (
                  <div className="mt-6">
                    <Card title="🏢 Clase energetice per apartament">
                      <div className="mb-3 text-[11px] opacity-50">
                        Calculul distribuie energia blocului pe fiecare apartament cu corecții pentru poziție termică (parter, colț, ultimul etaj) conform Mc 001-2022 Anexa 7.
                      </div>
                      <ApartmentClasses
                        epBuildingM2={epBloc}
                        thresholds={grid?.thresholds}
                        buildingArea={Au}
                        cn={cn}
                        showToast={showToast}
                      />
                    </Card>
                  </div>
                );
              })()}

              {/* ── CPE ANEXA 1 + ANEXA 2 ── */}
              {instSummary && (
                <div className="mt-6">
                  <Card title="📋 Anexa 1 + Anexa 2 CPE — Preview date complete">
                    <CpeAnexa
                      building={building}
                      heating={heating} cooling={cooling} ventilation={ventilation}
                      lighting={lighting} acm={acm}
                      solarThermal={solarThermal} photovoltaic={photovoltaic}
                      heatPump={heatPump} biomass={biomass}
                      instSummary={instSummary} renewSummary={renewSummary}
                      envelopeSummary={envelopeSummary}
                      opaqueElements={opaqueElements} glazingElements={glazingElements}
                      selectedClimate={selectedClimate}
                      auditor={auditor}
                      enClass={enClass} co2Class={co2Class}
                      epFinal={epFinal} co2Final={co2Final} rer={rer}
                      getNzebEpMax={getNzebEpMax}
                      bacsClass={bacsClass}
                      BUILDING_CATEGORIES={BUILDING_CATEGORIES} ELEMENT_TYPES={ELEMENT_TYPES}
                      HEAT_SOURCES={HEAT_SOURCES} ACM_SOURCES={ACM_SOURCES}
                      COOLING_SYSTEMS={COOLING_SYSTEMS} VENTILATION_TYPES={VENTILATION_TYPES}
                      LIGHTING_TYPES={LIGHTING_TYPES}
                      calcOpaqueR={calcOpaqueR}
                      lang={lang}
                    />
                  </Card>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 5: Calcul
                </button>
                <button onClick={() => goToStep(7, 6)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 7: Audit →
                </button>
              </div>
            </div>
            );
}
