/**
 * Mapper date Zephren → variabile template CPE DOCX
 * Completează Anexa 1 (date clădire) și Anexa 2 (date instalații)
 * conform structurii CPE Mc 001-2022 (Ord. MDLPA 16/2023)
 */

/**
 * Construiește payload-ul complet de date pentru template-ul CPE DOCX.
 * Mapează toate câmpurile din starea Zephren la variabilele template-ului.
 *
 * @param {Object} params - Toți parametrii stării aplicației
 * @returns {Object} - Obiect cu toate variabilele template-ului completate
 */
export function buildDocxPayload(params) {
  const {
    building, climate, selectedClimate,
    opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew,
    instSummary, renewSummary, envelopeSummary,
    auditor, energyClass,
    BUILDING_CATEGORIES, ELEMENT_TYPES, FUELS,
    HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS,
    VENTILATION_TYPES, LIGHTING_TYPES,
    getEnergyClass, getCO2Class, getNzebEpMax,
    CO2_CLASSES_DB, CATEGORY_BASE_MAP,
  } = params;

  // Referință climatică (suport pentru ambele forme de prop)
  const clim = selectedClimate || climate || {};

  const Au = parseFloat(building?.areaUseful) || 0;
  const Vol = parseFloat(building?.volume) || 0;
  const epF = renewSummary?.ep_adjusted_m2 ?? instSummary?.ep_total_m2 ?? 0;
  const co2F = renewSummary?.co2_adjusted_m2 ?? instSummary?.co2_total_m2 ?? 0;

  const rawCat = building?.category || "AL";
  const baseCat = (CATEGORY_BASE_MAP?.[rawCat]) || rawCat;
  const catKey = baseCat + (["RI","RC","RA"].includes(baseCat)
    ? (cooling?.hasCooling ? "_cool" : "_nocool")
    : "");

  // Clasă energetică
  const enClassObj = getEnergyClass
    ? getEnergyClass(epF, catKey)
    : { cls: "—", score: 0 };
  const co2ClassObj = getCO2Class
    ? getCO2Class(co2F, baseCat)
    : { cls: "—" };

  // nZEB
  const epRefMax = getNzebEpMax
    ? (getNzebEpMax(baseCat, clim?.zone) || 148)
    : 148;
  const nzebOk = epF <= epRefMax && (renewSummary?.rer || 0) >= 30;

  // Categorie label
  const catLabel = BUILDING_CATEGORIES
    ? (BUILDING_CATEGORIES.find(c => c.id === baseCat)?.label || baseCat)
    : baseCat;

  // Combustibil label
  const fuelLabel = FUELS && heating?.fuel
    ? (FUELS.find(f => f.id === heating.fuel)?.label || heating.fuel)
    : (heating?.fuel || "");

  // Surse label
  const heatSrcLabel = HEAT_SOURCES && heating?.source
    ? (HEAT_SOURCES.find(h => h.id === heating.source)?.label || heating.source)
    : (heating?.source || "");
  const acmSrcLabel = ACM_SOURCES && acm?.source
    ? (ACM_SOURCES.find(a => a.id === acm.source)?.label || acm.source)
    : (acm?.source || "");
  const coolSrcLabel = COOLING_SYSTEMS && cooling?.source
    ? (COOLING_SYSTEMS.find(c => c.id === cooling.source)?.label || cooling.source)
    : (cooling?.source || "");
  const ventLabel = VENTILATION_TYPES && ventilation?.type
    ? (VENTILATION_TYPES.find(v => v.id === ventilation.type)?.label || ventilation.type)
    : (ventilation?.type || "");
  const lightLabel = LIGHTING_TYPES && lighting?.type
    ? (LIGHTING_TYPES.find(l => l.id === lighting.type)?.label || lighting.type)
    : (lighting?.type || "");

  // Indicator de suprafață anvelopă (din elemente sau câmp manual)
  const seTotal = parseFloat(building?.areaEnvelope)
    || (opaqueElements || []).reduce((s, e) => s + (parseFloat(e.area) || 0), 0)
    + (glazingElements || []).reduce((s, e) => s + (parseFloat(e.area) || 0), 0);

  // Factor de formă SE/V
  const seV = Vol > 0 ? seTotal / Vol : 0;

  // Adresă completă
  const fullAddress = [building?.address, building?.city, building?.county]
    .filter(Boolean).join(", ");

  // Expirare CPE (10 ani de la elaborare)
  const elabDate = auditor?.date ? new Date(auditor.date) : new Date();
  const expiryDate = new Date(elabDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);
  const fmtDate = (d) => d.toLocaleDateString("ro-RO");

  // Cod scop CPE
  const scopeLabels = {
    vanzare: "Vânzare", inchiriere: "Închiriere",
    receptie: "Recepție", informare: "Informare",
    renovare: "Renovare majoră", alt: "Alt scop",
    constructie_noua: "Construcție nouă",
  };

  // SRE per m²
  const sre_st  = Au > 0 && renewSummary ? (renewSummary.qSolarTh ?? 0) / Au : 0;
  const sre_pv  = Au > 0 && renewSummary ? (renewSummary.qPV_kWh ?? 0) / Au : 0;
  const sre_pc  = Au > 0 && renewSummary ? (renewSummary.qPC_ren ?? 0) / Au : 0;
  const sre_bio = Au > 0 && renewSummary ? (renewSummary.qBio_ren ?? 0) / Au : 0;

  // Consum final defalcat
  const qf_h = instSummary?.qf_h ?? 0;
  const qf_w = instSummary?.qf_w ?? 0;
  const qf_c = instSummary?.qf_c ?? 0;
  const qf_v = instSummary?.qf_v ?? 0;
  const qf_l = instSummary?.qf_l ?? 0;

  return {
    // ── SECȚIUNEA A — Identificare clădire ──────────────────────────────
    adresa: building?.address || "",
    adresa_completa: fullAddress,
    localitate: building?.city || "",
    judet: building?.county || "",
    cod_postal: building?.postalCode || "",
    categorie: baseCat,
    categorie_label: catLabel,
    an_constructie: building?.yearBuilt || "",
    an_renovare: building?.yearRenov || "",
    suprafata_utila: Au > 0 ? Au.toFixed(1) : "",
    suprafata_utila_num: Au,
    suprafata_anvelopa: seTotal > 0 ? seTotal.toFixed(1) : "",
    arie_desfasurata: Au > 0 ? (Au * 1.15).toFixed(1) : "",
    volum_incalzit: Vol > 0 ? Math.round(Vol).toString() : "",
    numar_niveluri: building?.floors || "",
    regim_inaltime: building?.floors || "",
    structura: building?.structure || "",
    scop_cpe: scopeLabels[building?.scopCpe] || building?.scopCpe || "Vânzare",
    nr_unitati: building?.units || "",

    // ── SECȚIUNEA B — Date climatice ────────────────────────────────────
    zona_climatica: clim?.zone ? "zona " + clim.zone : "",
    zona_climatica_num: String(parseInt(clim?.zone) || 3),
    localitate_climatica: clim?.name || "",
    theta_e: clim?.theta_e ?? "",
    HDD: clim?.HDD ?? "",
    factor_forma: seV > 0 ? seV.toFixed(3) : "",
    lat: clim?.lat ?? "",

    // ── SECȚIUNEA C — Caracteristici termice ────────────────────────────
    n50: building?.n50 || "",
    coef_G: envelopeSummary?.G ? envelopeSummary.G.toFixed(3) : "",
    pt_total: (thermalBridges || [])
      .reduce((s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0), 0)
      .toFixed(2),
    pt_nr: String((thermalBridges || []).length),

    // ── SECȚIUNEA D — Instalații ─────────────────────────────────────────
    sistem_incalzire: heatSrcLabel,
    sursa_incalzire: heating?.source || "",
    combustibil: fuelLabel,
    combustibil_id: heating?.fuel || "",
    eta_incalzire: heating?.eta_gen ?? heating?.etaGen ?? "",
    putere_incalzire: heating?.nominalPower ? String(heating.nominalPower) : "",
    control_incalzire: heating?.control || "",
    sistem_acm: acmSrcLabel,
    sursa_acm: acm?.source || "",
    litri_acm: acm?.dailyLiters ?? acm?.litersPerPerson ?? "",
    sistem_racire: coolSrcLabel,
    sursa_racire: cooling?.source || "",
    eer_racire: cooling?.eer ?? cooling?.cop ?? "",
    sistem_ventilare: ventLabel,
    tip_ventilare: ventilation?.type || "",
    hr_eta: ventilation?.hrEta ? (ventilation.hrEta * 100).toFixed(0) : "",
    tip_iluminat: lightLabel,
    iluminat_id: lighting?.type || "",
    iluminat_densitate: lighting?.power ?? "",
    iluminat_control: lighting?.control || "",

    // ── SECȚIUNEA E — Surse regenerabile ────────────────────────────────
    solar_termic: solarThermal?.enabled ? "Da" : "Nu",
    solar_termic_m2: solarThermal?.area ? String(solarThermal.area) : "0",
    solar_termic_tip: solarThermal?.type || "",
    solar_termic_orientare: solarThermal?.orientation || "S",
    solar_termic_inclinare: solarThermal?.tilt ? String(solarThermal.tilt) : "35",
    pv: photovoltaic?.enabled ? "Da" : "Nu",
    pv_kwp: photovoltaic?.power ?? photovoltaic?.kWp ? String(photovoltaic.power ?? photovoltaic.kWp) : "0",
    pv_m2: photovoltaic?.area ? String(photovoltaic.area) : "0",
    pv_tip: photovoltaic?.type || "",
    pompa_caldura: heatPump?.enabled ? "Da" : "Nu",
    pompa_caldura_tip: heatPump?.type || "",
    pompa_caldura_cop: heatPump?.cop ? String(heatPump.cop) : "",
    biomasa: biomass?.enabled ? "Da" : "Nu",
    biomasa_tip: biomass?.type || "",
    rer_procent: renewSummary?.rer != null ? renewSummary.rer.toFixed(1) : "0",
    sre_st: sre_st.toFixed(1),
    sre_pv: sre_pv.toFixed(1),
    sre_pc: sre_pc.toFixed(1),
    sre_bio: sre_bio.toFixed(1),

    // ── SECȚIUNEA F — Rezultate energetice ──────────────────────────────
    ep_total: epF.toFixed(1),
    ep_total_real: Au > 0 ? (epF * Au).toFixed(1) : "0",
    ep_ref: epRefMax.toFixed(1),
    ep_total_ref: Au > 0 ? (epRefMax * Au).toFixed(1) : "0",
    ep_incalzire: Au > 0 && instSummary?.ep_h != null ? (instSummary.ep_h / Au).toFixed(1) : "",
    ep_acm:       Au > 0 && instSummary?.ep_w != null ? (instSummary.ep_w / Au).toFixed(1) : "",
    ep_racire:    Au > 0 && instSummary?.ep_c != null ? (instSummary.ep_c / Au).toFixed(1) : "",
    ep_ventilare: Au > 0 && instSummary?.ep_v != null ? (instSummary.ep_v / Au).toFixed(1) : "",
    ep_iluminat:  Au > 0 && instSummary?.ep_l != null ? (instSummary.ep_l / Au).toFixed(1) : "",
    qf_incalzire: Au > 0 ? (qf_h / Au).toFixed(1) : "",
    qf_acm:       Au > 0 ? (qf_w / Au).toFixed(1) : "",
    qf_racire:    Au > 0 ? (qf_c / Au).toFixed(1) : "",
    qf_ventilare: Au > 0 ? (qf_v / Au).toFixed(1) : "",
    qf_iluminat:  Au > 0 ? (qf_l / Au).toFixed(1) : "",
    qf_total: instSummary?.qf_total_m2 != null ? instSummary.qf_total_m2.toFixed(1) : "",
    qf_termic: Au > 0 ? ((qf_h + qf_w) / Au).toFixed(1) : "",
    qf_electric: Au > 0 ? ((qf_c + qf_v + qf_l) / Au).toFixed(1) : "",
    co2_total: co2F.toFixed(1),
    co2_incalzire: instSummary?.co2_h_m2 != null ? instSummary.co2_h_m2.toFixed(1) : "",
    co2_acm:       instSummary?.co2_w_m2 != null ? instSummary.co2_w_m2.toFixed(1) : "",
    co2_racire:    instSummary?.co2_c_m2 != null ? instSummary.co2_c_m2.toFixed(1) : "",
    co2_ventilare: instSummary?.co2_v_m2 != null ? instSummary.co2_v_m2.toFixed(1) : "",
    co2_iluminat:  instSummary?.co2_l_m2 != null ? instSummary.co2_l_m2.toFixed(1) : "",
    clasa_energetica: enClassObj.cls,
    clasa_co2: co2ClassObj.cls,
    nota_ep: String(enClassObj.score ?? ""),
    nzeb_conform: nzebOk ? "DA" : "NU",

    // ── SECȚIUNEA G — Auditor ────────────────────────────────────────────
    auditor_nume: auditor?.name || "",
    auditor_atestat: auditor?.atestat || "",
    auditor_grad: auditor?.grade || "",
    auditor_firma: auditor?.company || "",
    auditor_email: auditor?.email || "",
    auditor_tel: auditor?.phone || "",
    auditor_mdlpa: auditor?.mdlpaCode || "",
    data_elaborare: fmtDate(elabDate),
    data_expirare: fmtDate(expiryDate),
    valabilitate: auditor?.validityYears || "10",
    scop_cpe_cod: building?.scopCpe || "vanzare",

    // ── Tabele (populate din buildDocxTables) ───────────────────────────
    tabel_elemente: [],
    tabel_punti: [],
    tabel_vitraj: [],
  };
}

/**
 * Construiește tabelele de elemente anvelopă și punți termice
 * pentru completarea Anexei 2 din CPE DOCX.
 *
 * @param {Array} opaqueElements - Elemente opace din Pasul 2
 * @param {Array} glazingElements - Elemente vitrate din Pasul 2
 * @param {Array} thermalBridges - Punți termice din Pasul 2
 * @param {Function|null} calcOpaqueR - Funcție calcul R/U per element (opțional)
 * @param {Array|null} ELEMENT_TYPES - Constante tipuri elemente
 * @param {string} category - Categoria clădirii (pentru U ref)
 * @returns {{ tabel_elemente, tabel_punti, tabel_vitraj }}
 */
export function buildDocxTables(
  opaqueElements,
  glazingElements,
  thermalBridges,
  calcOpaqueR = null,
  ELEMENT_TYPES = null,
  category = "RI"
) {
  // ── Tabel elemente opace ──────────────────────────────────────────────
  const tabel_elemente = (opaqueElements || []).map((el, idx) => {
    let uCalc = 0;
    let rCalc = 0;

    if (calcOpaqueR) {
      // Folosim funcția de calcul externă (din props)
      const res = calcOpaqueR(el.layers, el.type);
      uCalc = res?.u ?? 0;
      rCalc = uCalc > 0 ? 1 / uCalc : 0;
    } else if (el.layers && el.layers.length > 0) {
      // Calcul direct
      const elTypeDef = ELEMENT_TYPES?.find(t => t.id === el.type);
      const rsi = elTypeDef?.rsi ?? 0.13;
      const rse = elTypeDef?.rse ?? 0.04;
      const rL = el.layers.reduce((s, l) => {
        const d = (parseFloat(l.thickness) || 0) / 1000;
        return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
      }, 0);
      uCalc = rL > 0 ? 1 / (rsi + rL + rse) : 0;
      rCalc = uCalc > 0 ? 1 / uCalc : 0;
    }

    // Straturi ca string descriptiv
    const layersStr = el.layers
      ? el.layers.map(l => `${l.matName || "?"} ${l.thickness || 0}mm λ=${l.lambda || 0}`).join("; ")
      : "";

    return {
      nr: idx + 1,
      tip: el.type || "",
      denumire: el.name || ("Element " + (idx + 1)),
      suprafata: (parseFloat(el.area) || 0).toFixed(1),
      u: uCalc > 0 ? uCalc.toFixed(3) : "—",
      r: rCalc > 0 ? rCalc.toFixed(3) : "—",
      orientare: el.orientation || "—",
      straturi: layersStr,
      conform: uCalc > 0 ? (uCalc <= _uRefForType(el.type, category) ? "DA" : "NU") : "—",
    };
  });

  // ── Tabel elemente vitrate ────────────────────────────────────────────
  const tabel_vitraj = (glazingElements || []).map((el, idx) => {
    const uVal = parseFloat(el.u) || 0;
    const uRef = ["RI","RC","RA"].includes(category) ? 1.30 : 1.80;
    return {
      nr: idx + 1,
      denumire: el.name || ("Vitraj " + (idx + 1)),
      suprafata: (parseFloat(el.area) || 0).toFixed(1),
      u: uVal > 0 ? uVal.toFixed(2) : "—",
      g: (parseFloat(el.g) || 0).toFixed(2),
      orientare: el.orientation || "—",
      tip: el.glazingType || "—",
      conform: uVal > 0 ? (uVal <= uRef ? "DA" : "NU") : "—",
    };
  });

  // ── Tabel punți termice ───────────────────────────────────────────────
  const tabel_punti = (thermalBridges || []).map((tb, idx) => {
    const psi = parseFloat(tb.psi) || 0;
    const lung = parseFloat(tb.length) || 0;
    return {
      nr: idx + 1,
      desc: tb.desc || tb.name || tb.cat || ("Punte " + (idx + 1)),
      lungime: lung.toFixed(1),
      psi: psi.toFixed(3),
      psiL: (lung * psi).toFixed(2),
    };
  });

  return { tabel_elemente, tabel_punti, tabel_vitraj };
}

/**
 * Returnează U'max de referință nZEB pentru un tip de element și o categorie de clădire.
 * Valori conform Mc 001-2022 Tabel 4 (clădiri rezidențiale și nerezidențiale).
 *
 * @param {string} type - Tipul elementului (PE, PT, PP, PL, PB, etc.)
 * @param {string} category - Categoria clădirii
 * @returns {number} - U'max [W/m²K]
 */
function _uRefForType(type, category) {
  const isRes = ["RI","RC","RA"].includes(category);
  const refs = isRes
    ? { PE: 0.25, PT: 0.15, PP: 0.15, PL: 0.20, PB: 0.29, SE: 0.20, PI: 0.60 }
    : { PE: 0.35, PT: 0.20, PP: 0.20, PL: 0.30, PB: 0.35, SE: 0.30, PI: 0.80 };
  return refs[type] ?? 0.35;
}

/**
 * Calculează scorul de completitudine al datelor pentru generarea CPE DOCX.
 * Returnează lista itemelor și scorul total.
 *
 * @param {Object} params - Câmpurile de stare Zephren
 * @returns {{ items: Array<{label, ok}>, score: number, total: number, percent: number }}
 */
export function calcDocxCompleteness(params) {
  const {
    building, selectedClimate, opaqueElements,
    heating, instSummary, auditor,
  } = params;

  const items = [
    {
      label: "Date identificare clădire",
      ok: !!(building?.address && building?.city),
    },
    {
      label: "Date climatice selectate",
      ok: !!(selectedClimate?.name || selectedClimate?.zone),
    },
    {
      label: "Elemente anvelopă introduse",
      ok: (opaqueElements?.length ?? 0) > 0,
    },
    {
      label: "Sistem încălzire configurat",
      ok: !!(heating?.source && heating.source !== "NONE" && heating.source !== "none"),
    },
    {
      label: "Calcul energetic efectuat",
      ok: !!instSummary,
    },
    {
      label: "Date auditor completate",
      ok: !!(auditor?.name && auditor?.atestat),
    },
  ];

  const score = items.filter(i => i.ok).length;
  const total = items.length;
  const percent = Math.round((score / total) * 100);

  return { items, score, total, percent };
}
