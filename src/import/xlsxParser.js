/**
 * Parser XLSX/XLS/CSV client-side pentru import date clădire.
 * Suportă:
 *  1. Template Zephren (foi denumite: Identificare, Anvelopa, Instalatii, Regenerabile)
 *  2. CSV/XLSX generic cu detecție automată coloane
 *  3. Tabel simplu de elemente anvelopă
 *
 * v3.5 — parsare completă a tuturor câmpurilor din template (Pas 1–4)
 */
import * as XLSX from "xlsx";

// ── Cod categorie din text liber ──────────────────────────────────────────────
function detectCategory(val) {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  if (v === "ri" || v.includes("cas") || v.includes("individual")) return "RI";
  if (v === "rc" || v.includes("bloc") || v.includes("colectiv")) return "RC";
  if (v === "ra" || v.includes("apartament")) return "RA";
  if (v === "bi" || v.includes("birou")) return "BI";
  if (v === "ed" || v.includes("coal") || v.includes("nv") || v.includes("ducati")) return "ED";
  if (v === "sa" || v.includes("spital") || v.includes("clinic") || v.includes("s\u0103n")) return "SA";
  if (v === "hc" || v.includes("hotel") || v.includes("cazare")) return "HC";
  if (v === "co" || v.includes("comercial") || v.includes("magazin")) return "CO";
  if (v === "sp" || v.includes("sport") || v.includes("sal")) return "SP";
  return "AL";
}

// ── Tip element opac din text ─────────────────────────────────────────────────
function detectElementType(val) {
  if (!val) return "PE";
  const v = String(val).toUpperCase().trim();
  if (v === "PE" || v.includes("PERETE EXT")) return "PE";
  if (v === "PT" || v.includes("TERA") || v.includes("TERAS")) return "PT";
  if (v === "PP" || v.includes("POD") || v.includes("ACOPER")) return "PP";
  if (v === "PL" || v.includes("SOL") || v.includes("PARD")) return "PL";
  if (v === "PB" || v.includes("BECI") || v.includes("SUBS")) return "PB";
  if (v === "PI" || v.includes("INTER")) return "PI";
  return "PE";
}

// ── Orientare din text ────────────────────────────────────────────────────────
function detectOrientation(val) {
  if (!val) return "S";
  const v = String(val).toUpperCase().trim();
  const orientations = ["NV", "NE", "SE", "SV", "N", "E", "S", "V"];
  for (const o of orientations) {
    if (v === o || v.startsWith(o)) return o;
  }
  return "S";
}

// ── Helper: boolean din text ──────────────────────────────────────────────────
function parseBool(val) {
  if (val === undefined || val === null || val === "") return undefined;
  const v = String(val).toLowerCase().trim();
  return ["da", "yes", "true", "1", "activ", "enabled"].includes(v);
}

// ── Parsare foaie "Identificare" (format key-value) ──────────────────────────
function parseSheetIdentificare(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const result = {};
  const keyMap = {
    "adresa": "address", "strada": "address", "address": "address",
    "localitate": "city", "oras": "city", "city": "city",
    "judet": "county", "county": "county", "jude\u021b": "county",
    "cod postal": "postal", "postal": "postal",
    "categorie": "category", "category": "category",
    "structura": "structure", "tip structura": "structure", "structure": "structure",
    "an constructie": "yearBuilt", "an construc\u021bie": "yearBuilt", "year built": "yearBuilt",
    "an renovare": "yearRenov", "an renov": "yearRenov",
    "suprafata utila": "areaUseful", "aria utila": "areaUseful", "au": "areaUseful", "area useful": "areaUseful",
    "volum": "volume", "volum incalzit": "volume", "volume": "volume",
    "suprafata anvelopa": "areaEnvelope", "aria anvelopa": "areaEnvelope",
    "inaltime etaj": "heightFloor", "h etaj": "heightFloor",
    "etaje": "floors", "regim": "floors", "floors": "floors",
    "perimetru": "perimeter", "perimeter": "perimeter",
    "nr unitati": "units", "numar unitati": "units", "units": "units",
    "n50": "n50", "infiltratii": "n50",
    "scop cpe": "scopCpe", "scop": "scopCpe",
  };

  for (const row of rows) {
    if (!row[0]) continue;
    const key = String(row[0]).toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
    const val = row[1] !== undefined ? String(row[1]).trim() : "";
    if (!val || val === "") continue;

    const mappedKey = keyMap[key];
    if (mappedKey) {
      if (mappedKey === "category") {
        result[mappedKey] = detectCategory(val);
      } else {
        result[mappedKey] = val;
      }
    }
  }
  return result;
}

// ── Parsare foaie "Anvelopa" (tabel cu coloane) ───────────────────────────────
function parseSheetAnvelopa(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (rows.length < 2) return { opaqueElements: [], glazingElements: [] };

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  const opaqueElements = [];
  const glazingElements = [];

  // Detectare indici coloane
  const idx = {
    name: headers.findIndex(h => h.includes("den") || h.includes("name") || h === "element"),
    type: headers.findIndex(h => h === "tip" || h === "type" || h.includes("categ")),
    area: headers.findIndex(h => h.includes("supraf") || h.includes("area") || h === "s"),
    u: headers.findIndex(h => h === "u" || h === "u [w/m2k]" || h === "coef u"),
    g: headers.findIndex(h => h === "g" || h === "factor g" || h.includes("solar")),
    orient: headers.findIndex(h => h.includes("orient")),
    lambda: headers.findIndex(h => h.includes("lambda") || h === "\u03bb"),
    thickness: headers.findIndex(h => h.includes("grosime") || h.includes("thick") || h === "d [mm]" || h === "d"),
    material: headers.findIndex(h => h.includes("material") || h.includes("strat")),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(c => c !== "")) continue; // rând gol

    const name = idx.name >= 0 ? String(row[idx.name] || "Element " + i) : "Element " + i;
    const typeRaw = idx.type >= 0 ? row[idx.type] : "";
    const area = parseFloat(idx.area >= 0 ? row[idx.area] : 0) || 0;
    const uVal = parseFloat(idx.u >= 0 ? row[idx.u] : 0);
    const gVal = parseFloat(idx.g >= 0 ? row[idx.g] : 0);
    const orientation = detectOrientation(idx.orient >= 0 ? row[idx.orient] : "S");

    if (area <= 0) continue;

    // Detectare tip: vitraj (are g, sau tip "vitraj/fereastra", sau U>0 și g>0)
    const typeStr = String(typeRaw).toLowerCase();
    const isGlazing = typeStr.includes("vitraj") || typeStr.includes("fereastr") || typeStr.includes("glaz") || typeStr.includes("window")
      || (gVal > 0 && gVal <= 1 && uVal > 0 && uVal < 6);

    if (isGlazing) {
      glazingElements.push({
        name,
        area: String(area),
        u: uVal > 0 ? String(uVal) : "1.10",
        g: gVal > 0 ? String(gVal) : "0.60",
        orientation,
        frameRatio: "25",
        type: uVal <= 0.8 ? "Triplu vitraj" : uVal <= 1.2 ? "Dublu vitraj Low-E" : "Dublu vitraj termoizolant",
      });
    } else {
      const elType = detectElementType(typeRaw);
      const layers = [];

      if (uVal > 0) {
        // Crează un strat fictiv cu U dat (R = 1/U - 0.17, lambda=0.5)
        const R_total = Math.max(0.05, 1 / uVal - 0.17);
        const thickness = Math.round(R_total * 500); // lambda=0.5 → d=R×lambda×1000mm
        layers.push({
          matName: "Material compus (import)", material: "Material compus (import)",
          lambda: 0.50, rho: 1200,
          thickness: String(Math.max(50, thickness)),
        });
      } else if (idx.material >= 0 && idx.lambda >= 0 && idx.thickness >= 0) {
        layers.push({
          matName: String(row[idx.material] || "Material"),
          material: String(row[idx.material] || "Material"),
          lambda: parseFloat(row[idx.lambda]) || 0.5,
          rho: 1200,
          thickness: String(Math.round(parseFloat(row[idx.thickness]) || 200)),
        });
      } else {
        layers.push({ matName: "Material importat", material: "Material importat", lambda: 0.50, rho: 1200, thickness: "300" });
      }

      opaqueElements.push({ name, type: elType, area: String(area), orientation, tau: 1.0, layers });
    }
  }

  return { opaqueElements, glazingElements };
}

// ── Parsare foaie "Instalatii" (key-value) ────────────────────────────────────
function parseSheetInstalatii(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const result = { heating: {}, acm: {}, cooling: {}, ventilation: {}, lighting: {} };

  const heatingSourceMap = {
    "gaz condensare": "GAZ_COND", "gaz_cond": "GAZ_COND", "gaz": "GAZ_COND",
    "gas condensing": "GAZ_COND",
    "gaz conventional": "GAZ_CONV", "gaz_conv": "GAZ_CONV",
    "biomasa": "BIOMASA", "biomass": "BIOMASA",
    "pompa aer aer": "HP_AA", "hp_aa": "HP_AA",
    "pompa aer apa": "HP_AW", "hp_aw": "HP_AW",
    "pompa apa apa": "HP_WW", "hp_ww": "HP_WW",
    "geotermal": "HP_GEO", "hp_geo": "HP_GEO",
    "pompa": "HP_AA", "heat pump": "HP_AA", "pd": "HP_AA",
    "electric": "ELECTRICA", "electricity": "ELECTRICA", "electrica": "ELECTRICA",
    "district": "DISTRICT", "termoficare": "DISTRICT",
  };

  const acmSourceMap = {
    "cazan_h": "CAZAN_H", "cazan h": "CAZAN_H", "cazan": "CAZAN_H",
    "solar_th": "SOLAR_TH", "solar": "SOLAR_TH",
    "hp_acm": "HP_ACM", "pompa": "HP_ACM",
    "electrica": "ELECTRICA", "electric": "ELECTRICA",
    "district": "DISTRICT", "termoficare": "DISTRICT",
    "cazan_sep": "CAZAN_SEP",
  };

  const emissionMap = {
    "radiatoare": "RADIATOARE", "radiator": "RADIATOARE",
    "pardoseala": "PARDOSEALA", "incalzire pardoseala": "PARDOSEALA",
    "ventiloconvector": "VENTILOCONVECTOARE", "ventiloconvectoare": "VENTILOCONVECTOARE", "fcus": "VENTILOCONVECTOARE",
    "aeroterme": "AEROTERME", "aeroterma": "AEROTERME",
    "panou": "PANOU_RADIANT", "panou radiant": "PANOU_RADIANT",
  };

  const distributionMap = {
    "standard": "STANDARD",
    "izolat": "IZOLAT",
    "neizolat": "NEIZOLAT",
    "performant": "PERFORMANT",
  };

  const controlMap = {
    "fara": "FARA", "fără": "FARA",
    "central": "CENTRAL",
    "individual": "INDIVIDUAL",
    "individual_prog": "INDIVIDUAL_PROG", "programabil": "INDIVIDUAL_PROG",
    "smart": "SMART", "bms": "SMART",
  };

  const ventMap = {
    "nat": "NAT", "natural": "NAT", "naturala": "NAT",
    "vmc": "VMC", "mecanica": "VMC", "mecanică": "VMC",
    "vmcr": "VMCR", "recuperare": "VMCR", "hr": "VMCR",
  };

  const lightControlMap = {
    "manual": "MANUAL",
    "detector": "DETECTOR_PREZENTA", "prezenta": "DETECTOR_PREZENTA",
    "fotocelula": "FOTOCELULA", "foto": "FOTOCELULA",
    "dimmer": "DIMMER",
    "smart": "SMART_BMS", "bms": "SMART_BMS",
  };

  const coolSystemMap = {
    "ac_split": "AC_SPLIT", "split": "AC_SPLIT",
    "vrv": "VRV_VRF", "vrf": "VRV_VRF", "vrv_vrf": "VRV_VRF",
    "chiller": "CHILLER",
    "free_cooling": "FREE_COOLING", "free cooling": "FREE_COOLING",
    "evaporativ": "EVAPORATIV",
  };

  function mapFromDict(val, dict, fallback) {
    const v = String(val).toLowerCase().trim();
    for (const [k, mapped] of Object.entries(dict)) {
      if (v === k || v.includes(k)) return mapped;
    }
    return fallback || val.toUpperCase();
  }

  for (const row of rows) {
    if (!row[0]) continue;
    const rawKey = String(row[0]).trim();
    // Ignoră antetele de secțiune (── ... ──)
    if (rawKey.startsWith("──") || rawKey.startsWith("--")) continue;
    const key = rawKey.toLowerCase().replace(/[^a-z0-9 /]/g, "").trim();
    const val = row[1] !== undefined ? String(row[1]).trim() : "";
    if (!val) continue;

    // ── ÎNCĂLZIRE
    if (key.includes("sursa incalzire") || key.includes("sistem incalzire") || key.includes("heating source")) {
      result.heating.source = mapFromDict(val, heatingSourceMap, "GAZ_COND");
    } else if (key.includes("putere incalzire") || key.includes("heating power") || key.includes("putere nominala")) {
      result.heating.power = val;
    } else if (key.includes("eficienta incalzire") || key === "eta" || key.includes("cop incalzire")) {
      result.heating.eta_gen = val;
    } else if (key.includes("tip emisie") || key.includes("corpuri de incalzire") || key.includes("emission")) {
      result.heating.emission = mapFromDict(val, emissionMap, "RADIATOARE");
    } else if (key.includes("randament emisie") || key === "eta em") {
      result.heating.eta_em = val;
    } else if (key.includes("calitate distributie") || key.includes("distribution quality")) {
      result.heating.distribution = mapFromDict(val, distributionMap, "STANDARD");
    } else if (key.includes("randament distributie") || key === "eta dist") {
      result.heating.eta_dist = val;
    } else if (key.includes("tip control") || key.includes("reglaj") || key.includes("control type")) {
      result.heating.control = mapFromDict(val, controlMap, "INDIVIDUAL");
    } else if (key.includes("randament control") || key === "eta ctrl") {
      result.heating.eta_ctrl = val;
    } else if (key.includes("regim functionare") || key.includes("operating regime")) {
      const v = val.toLowerCase();
      result.heating.regime = v.includes("inter") ? "intermitent" : v.includes("oprir") ? "oprire" : "continuu";
    } else if (key.includes("temperatura interioara") || key.includes("theta int") || key.includes("indoor temp")) {
      result.heating.theta_int = val;
    } else if (key.includes("reducere nocturna") || key.includes("night reduction")) {
      result.heating.nightReduction = val;
    } else if (key.includes("t scara") || key.includes("hol comun") || key.includes("staircase")) {
      result.heating.tStaircase = val;
    } else if (key.includes("t subsol") || key.includes("basement temp")) {
      result.heating.tBasement = val;
    } else if (key.includes("t pod") || key.includes("attic temp")) {
      result.heating.tAttic = val;

    // ── ACM
    } else if (key.includes("sursa acm") || key.includes("hot water source") || key.includes("acm source")) {
      result.acm.source = mapFromDict(val, acmSourceMap, "CAZAN_H");
    } else if (key.includes("nr consumatori") || key.includes("consumers") || key.includes("persoane")) {
      result.acm.consumers = val;
    } else if (key.includes("litri") || key.includes("daily liters") || key.includes("consum specific acm") || key.includes("l/pers")) {
      result.acm.dailyLiters = val;
    } else if (key.includes("volum boiler") || key.includes("storage volume acm") || (key.includes("volum") && key.includes("stocare") && !key.includes("solar") && !key.includes("baterie"))) {
      result.acm.storageVolume = val;
    } else if (key.includes("lungime conducte acm") || key.includes("pipe length")) {
      result.acm.pipeLength = val;
    } else if (key.includes("conducte izolate") || key.includes("pipe insulated")) {
      result.acm.pipeInsulated = parseBool(val) ?? false;
    } else if (key.includes("circuit recirculare") || key.includes("recirculation")) {
      result.acm.circRecirculation = parseBool(val) ?? false;
    } else if (key.includes("ore recirculare") || key.includes("recirculation hours")) {
      result.acm.circHours = val;

    // ── RĂCIRE
    } else if ((key.includes("sistem racire") || key.includes("cooling system")) && !key.includes("tip")) {
      result.cooling.hasCooling = parseBool(val) ?? (val.toLowerCase() !== "nu" && val.toLowerCase() !== "no");
    } else if (key.includes("tip sistem racire") || key.includes("cooling type")) {
      result.cooling.system = mapFromDict(val, coolSystemMap, "AC_SPLIT");
      if (!result.cooling.hasCooling) result.cooling.hasCooling = true;
    } else if (key.includes("cop racire") || key.includes("eer racire") || key === "eer") {
      result.cooling.eer = val;
    } else if (key.includes("putere frigorifica") || key.includes("cooling power")) {
      result.cooling.power = val;
    } else if (key.includes("suprafata racita") || key.includes("cooled area")) {
      result.cooling.cooledArea = val;
    } else if (key.includes("distributie racire") || key.includes("cooling distribution")) {
      result.cooling.distribution = mapFromDict(val, distributionMap, "STANDARD");

    // ── VENTILARE
    } else if (key.includes("tip ventilare") || key.includes("ventilation type")) {
      const vl = String(val).toUpperCase();
      result.ventilation.type = mapFromDict(val, ventMap,
        vl.includes("MEC") || vl.includes("VMC") ? (vl.includes("R") || vl.includes("HR") ? "VMCR" : "VMC") : "NAT");
    } else if (key.includes("recuperare caldura") || key.includes("hr eta") || key.includes("heat recovery") || key.includes("randament recuperare")) {
      result.ventilation.hrEfficiency = val;
    } else if (key.includes("debit aer") || key.includes("airflow")) {
      result.ventilation.airflow = val;
    } else if (key.includes("putere ventilator") || key.includes("fan power")) {
      result.ventilation.fanPower = val;
    } else if ((key.includes("ore ventilare") || key.includes("ore functionare") && key.includes("venti")) || key.includes("ventilation hours")) {
      result.ventilation.operatingHours = val;

    // ── ILUMINAT
    } else if (key.includes("tip iluminat") || key.includes("lighting type")) {
      const v = val.toUpperCase();
      result.lighting.type = v.includes("LED") ? (v.includes("SMART") ? "LED_SMART" : "LED")
        : v.includes("FLUOR") ? "FLUOR"
        : v.includes("HALOG") ? "HALOGEN"
        : "INCAND";
    } else if (key.includes("densitate putere") || key.includes("w/m2") || key.includes("p iluminat") || key.includes("power density")) {
      result.lighting.pDensity = val;
    } else if (key.includes("sistem control iluminat") || key.includes("lighting control")) {
      result.lighting.controlType = mapFromDict(val, lightControlMap, "MANUAL");
    } else if (key.includes("factor control") || key === "fc" || key.includes("f_c")) {
      result.lighting.fCtrl = val;
    } else if ((key.includes("ore iluminat") || (key.includes("ore functionare") && !key.includes("venti") && !key.includes("recir"))) || key.includes("lighting hours")) {
      result.lighting.operatingHours = val;
    } else if (key.includes("lumina naturala") || key.includes("natural light") || key.includes("daylight")) {
      result.lighting.naturalLightRatio = val;
    }
  }

  return result;
}

// ── Parsare foaie "Regenerabile" (key-value) ──────────────────────────────────
function parseSheetRegenerabile(sheet) {
  const result = {
    solarThermal: { enabled: false },
    photovoltaic: { enabled: false },
    battery: { enabled: false },
    heatPump: { enabled: false },
    biomass: { enabled: false },
    otherRenew: { windEnabled: false, cogenEnabled: false },
  };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const solarTypeMap = {
    "plan": "PLAN", "plat": "PLAN",
    "evacuate_tube": "EVACUATE_TUBE", "tuburi evacuate": "EVACUATE_TUBE", "evacuate": "EVACUATE_TUBE",
    "concentrator": "CONCENTRATOR",
  };

  const pvTypeMap = {
    "mono": "MONO", "monocristalin": "MONO",
    "poli": "POLI", "policristalin": "POLI",
    "thin_film": "THIN_FILM", "thin film": "THIN_FILM",
    "bifacial": "BIFACIAL",
    "hit": "HIT",
  };

  const invertorMap = {
    "string": "STRING",
    "micro": "MICRO",
    "central": "CENTRAL",
    "optimizat": "OPTIMIZAT", "optimized": "OPTIMIZAT",
  };

  const batteryTypeMap = {
    "lfp": "LFP", "lifepo4": "LFP",
    "nmc": "NMC",
    "lead_acid": "LEAD_ACID", "plumb": "LEAD_ACID",
    "flow": "FLOW",
  };

  const heatPumpTypeMap = {
    "hp_aa": "HP_AA", "aer aer": "HP_AA", "aer-aer": "HP_AA",
    "hp_aw": "HP_AW", "aer apa": "HP_AW", "aer-apă": "HP_AW",
    "hp_ww": "HP_WW", "apa apa": "HP_WW",
    "hp_geo": "HP_GEO", "geotermal": "HP_GEO",
  };

  const biomassTypeMap = {
    "peleti": "PELETI", "pellet": "PELETI",
    "brichete": "BRICHETE",
    "lemne": "LEMNE", "lemn": "LEMNE",
    "chips": "CHIPS",
  };

  const auxSourceMap = {
    "gaz_cond": "GAZ_COND", "gaz condensare": "GAZ_COND",
    "gaz_conv": "GAZ_CONV", "gaz conventional": "GAZ_CONV",
    "electrica": "ELECTRICA", "electric": "ELECTRICA",
  };

  function mapFromDict(val, dict, fallback) {
    const v = String(val).toLowerCase().trim();
    for (const [k, mapped] of Object.entries(dict)) {
      if (v === k || v.includes(k)) return mapped;
    }
    return fallback || String(val).toUpperCase();
  }

  for (const row of rows) {
    if (!row[0]) continue;
    const rawKey = String(row[0]).trim();
    if (rawKey.startsWith("──") || rawKey.startsWith("--")) continue;
    const key = rawKey.toLowerCase().replace(/[^a-z0-9 /]/g, "").trim();
    const val = row[1] !== undefined ? String(row[1]).trim() : "";
    if (!val) continue;

    const boolVal = parseBool(val);
    const numVal = parseFloat(val);

    // ── SOLAR TERMIC
    if ((key === "solar termic" || key === "solar thermal") && !key.includes("tip") && !key.includes("supraf") && !key.includes("volum")) {
      result.solarThermal.enabled = boolVal ?? true;
    } else if (key.includes("tip colector") || key.includes("solar collector type")) {
      result.solarThermal.type = mapFromDict(val, solarTypeMap, "PLAN");
    } else if (key.includes("suprafata captatori") || key.includes("solar area") || key.includes("suprafata colect")) {
      result.solarThermal.area = val;
      if (numVal > 0) result.solarThermal.enabled = true;
    } else if (key.includes("orientare captatori") || key.includes("solar orientation")) {
      result.solarThermal.orientation = detectOrientation(val);
    } else if (key.includes("inclinare captatori") || key.includes("solar tilt")) {
      result.solarThermal.tilt = val;
    } else if (key.includes("utilizare solar") || key.includes("solar usage")) {
      const v = val.toLowerCase();
      result.solarThermal.usage = v.includes("heat") ? "heating" : v.includes("both") || v.includes("ambele") ? "both" : "acm";
    } else if (key.includes("volum stocare solar") || key.includes("solar storage")) {
      result.solarThermal.storageVolume = val;
    } else if (key.includes("randament optic") || key.includes("eta0") || key === "eta 0") {
      result.solarThermal.eta0 = val;
    } else if (key.includes("coef pierderi") || key.includes("a1") || key.includes("heat loss coef")) {
      result.solarThermal.a1 = val;

    // ── FOTOVOLTAIC
    } else if ((key === "fotovoltaic" || key === "photovoltaic" || key === "pv") && !key.includes("tip") && !key.includes("putere") && !key.includes("supraf")) {
      result.photovoltaic.enabled = boolVal ?? true;
    } else if (key.includes("tip celule pv") || key.includes("pv cell type") || key.includes("tip pv")) {
      result.photovoltaic.type = mapFromDict(val, pvTypeMap, "MONO");
    } else if (key.includes("putere pv") || key.includes("pv power") || key.includes("kwp")) {
      result.photovoltaic.peakPower = val;
      if (numVal > 0) result.photovoltaic.enabled = true;
    } else if (key.includes("suprafata pv") || key.includes("pv area")) {
      result.photovoltaic.area = val;
    } else if (key.includes("orientare pv") || key.includes("pv orientation")) {
      result.photovoltaic.orientation = detectOrientation(val);
    } else if (key.includes("inclinare pv") || key.includes("pv tilt")) {
      result.photovoltaic.tilt = val;
    } else if (key.includes("tip invertor") || key.includes("inverter type") || key.includes("invertor")) {
      result.photovoltaic.inverterType = mapFromDict(val, invertorMap, "STRING");
    } else if (key.includes("utilizare pv") || key.includes("pv usage")) {
      const v = val.toLowerCase();
      result.photovoltaic.usage = v.includes("light") ? "lighting"
        : v.includes("hvac") ? "hvac"
        : v.includes("export") ? "export"
        : "all";

    // ── BATERII
    } else if ((key === "baterii" || key.includes("stocare baterii") || key.includes("battery storage")) && !key.includes("tip") && !key.includes("capac")) {
      result.battery.enabled = boolVal ?? true;
    } else if (key.includes("tip baterie") || key.includes("battery type")) {
      result.battery.type = mapFromDict(val, batteryTypeMap, "LFP");
    } else if (key.includes("capacitate baterie") || key.includes("battery capacity")) {
      result.battery.capacity = val;
      if (numVal > 0) result.battery.enabled = true;
    } else if (key.includes("putere maxima baterie") || key.includes("battery power")) {
      result.battery.power = val;
    } else if (key.includes("adancime descarcare") || key.includes("dod") || key.includes("depth of discharge")) {
      result.battery.dod = val;
    } else if (key.includes("autoconsum local") || key.includes("self consumption")) {
      result.battery.selfConsumptionPct = val;

    // ── POMPĂ DE CĂLDURĂ
    } else if ((key.includes("pompa de caldura") || key.includes("heat pump")) && !key.includes("cop") && !key.includes("scop") && !key.includes("tip") && !key.includes("acoper") && !key.includes("bival") && !key.includes("aux")) {
      result.heatPump.enabled = boolVal ?? true;
    } else if (key.includes("tip pompa") || key.includes("heat pump type")) {
      result.heatPump.type = mapFromDict(val, heatPumpTypeMap, "HP_AW");
      if (!result.heatPump.enabled) result.heatPump.enabled = true;
    } else if (key.includes("cop nominal") || (key === "cop" && !key.includes("racire"))) {
      result.heatPump.cop = val;
      if (numVal > 0) result.heatPump.enabled = true;
    } else if (key.includes("scop sezonier") || key.includes("seasonal cop") || key === "scop") {
      result.heatPump.scopHeating = val;
    } else if (key.includes("acoperire pdc") || key.includes("heat pump covers")) {
      const v = val.toLowerCase();
      result.heatPump.covers = v.includes("acm") && v.includes("heat") ? "heating_acm"
        : v.includes("acm") ? "acm"
        : "heating";
    } else if (key.includes("temperatura bivalenta") || key.includes("bivalent temp")) {
      result.heatPump.bivalentTemp = val;
    } else if (key.includes("sursa auxiliara") || key.includes("aux source")) {
      result.heatPump.auxSource = mapFromDict(val, auxSourceMap, "GAZ_CONV");

    // ── BIOMASĂ
    } else if ((key === "biomasa" || key === "biomass") && !key.includes("tip") && !key.includes("putere") && !key.includes("randament") && !key.includes("acoper") && !key.includes("consum")) {
      result.biomass.enabled = boolVal ?? true;
    } else if (key.includes("tip biomasa") || key.includes("biomass type") || key.includes("tip combustibil biomasa")) {
      result.biomass.type = mapFromDict(val, biomassTypeMap, "PELETI");
    } else if (key.includes("randament cazan biomasa") || key.includes("biomass boiler efficiency")) {
      result.biomass.boilerEta = val;
      if (!result.biomass.enabled) result.biomass.enabled = true;
    } else if (key.includes("putere biomasa") || key.includes("biomass power")) {
      result.biomass.power = val;
    } else if (key.includes("acoperire biomasa") || key.includes("biomass covers")) {
      const v = val.toLowerCase();
      result.biomass.covers = v.includes("acm") && v.includes("heat") ? "heating_acm"
        : v.includes("acm") ? "acm"
        : "heating";
    } else if (key.includes("consum anual biomasa") || key.includes("biomass consumption")) {
      result.biomass.annualConsumption = val;

    // ── EOLIAN
    } else if (key.includes("turbina eoliana") || key.includes("wind turbine")) {
      result.otherRenew.windEnabled = boolVal ?? true;
    } else if (key.includes("capacitate eolian") || key.includes("wind capacity")) {
      result.otherRenew.windCapacity = val;
      if (numVal > 0) result.otherRenew.windEnabled = true;
    } else if (key.includes("productie eolian") || key.includes("wind production")) {
      result.otherRenew.windProduction = val;

    // ── COGENERARE
    } else if (key.includes("cogenerare") || key.includes("chp") && !key.includes("productie") && !key.includes("combustibil")) {
      result.otherRenew.cogenEnabled = boolVal ?? true;
    } else if (key.includes("productie electrica chp") || key.includes("chp electric")) {
      result.otherRenew.cogenElectric = val;
      if (numVal > 0) result.otherRenew.cogenEnabled = true;
    } else if (key.includes("productie termica chp") || key.includes("chp thermal")) {
      result.otherRenew.cogenThermal = val;
    } else if (key.includes("combustibil chp") || key.includes("chp fuel")) {
      result.otherRenew.cogenFuel = mapFromDict(val, { "gaz": "GAZ_COND", "biomasa": "BIOMASA", "hidrogen": "HIDROGEN" }, "GAZ_COND");
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL — parseXLSX
// ═══════════════════════════════════════════════════════════════
/**
 * Parsează un fișier XLSX/XLS/CSV și returnează date normalizate.
 * @param {ArrayBuffer} buffer - conținut fișier
 * @param {string} filename - numele fișierului (pentru detecție format)
 * @returns {{ building, opaqueElements, glazingElements, thermalBridges,
 *             heating, acm, cooling, ventilation, lighting,
 *             solarThermal, photovoltaic, battery, heatPump, biomass, otherRenew, _summary }}
 */
export function parseXLSX(buffer, filename = "") {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetNames = workbook.SheetNames.map(s => s.toLowerCase().trim());

  let building = {};
  let opaqueElements = [];
  let glazingElements = [];
  let thermalBridges = [];
  let heating = {};
  let acm = {};
  let cooling = {};
  let ventilation = {};
  let lighting = {};
  let solarThermal = { enabled: false };
  let photovoltaic = { enabled: false };
  let battery = { enabled: false };
  let heatPump = { enabled: false };
  let biomass = { enabled: false };
  let otherRenew = { windEnabled: false, cogenEnabled: false };

  const isZephrenTemplate = sheetNames.some(n =>
    n.includes("identificare") || n.includes("anvelop") || n.includes("instala")
  );

  if (isZephrenTemplate) {
    // ── Parsare template Zephren ──────────────────────────────
    for (const sheetName of workbook.SheetNames) {
      const sl = sheetName.toLowerCase();
      const sheet = workbook.Sheets[sheetName];

      if (sl.includes("identif")) {
        building = parseSheetIdentificare(sheet);
      } else if (sl.includes("anvelop") || sl.includes("anvelopa")) {
        const env = parseSheetAnvelopa(sheet);
        opaqueElements = env.opaqueElements;
        glazingElements = env.glazingElements;
      } else if (sl.includes("instala")) {
        const sys = parseSheetInstalatii(sheet);
        heating = sys.heating;
        acm = sys.acm;
        cooling = sys.cooling;
        ventilation = sys.ventilation;
        lighting = sys.lighting;
      } else if (sl.includes("regener")) {
        const ren = parseSheetRegenerabile(sheet);
        solarThermal = ren.solarThermal;
        photovoltaic = ren.photovoltaic;
        battery = ren.battery;
        heatPump = ren.heatPump;
        biomass = ren.biomass;
        otherRenew = ren.otherRenew;
      }
    }
  } else {
    // ── Parsare generică: toate foile ca anvelopă sau identificare ──
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (rows.length < 2) continue;

      const headers = rows[0].map(h => String(h).toLowerCase().trim());
      const hasArea = headers.some(h => h.includes("supraf") || h.includes("area") || h === "s");
      const hasKeyVal = headers.length <= 3 && rows.length >= 4;

      if (hasKeyVal) {
        // Format key-value: identificare sau instalații
        const id = parseSheetIdentificare(sheet);
        if (Object.keys(id).length > 0) building = { ...building, ...id };
      } else if (hasArea) {
        // Format tabelar: anvelopă
        const env = parseSheetAnvelopa(sheet);
        opaqueElements = [...opaqueElements, ...env.opaqueElements];
        glazingElements = [...glazingElements, ...env.glazingElements];
      }
    }
  }

  // Statistici pentru preview
  const _summary = {
    format: isZephrenTemplate ? "Template Zephren" : "Tabel generic",
    buildingFields: Object.keys(building).filter(k => building[k] !== "").length,
    opaqueCount: opaqueElements.length,
    glazingCount: glazingElements.length,
    hasHeating: Object.keys(heating).length > 0,
    hasCooling: cooling.hasCooling === true,
    hasVentilation: Object.keys(ventilation).length > 0,
    hasRenewables: solarThermal.enabled || photovoltaic.enabled || heatPump.enabled || biomass.enabled || battery.enabled || otherRenew.windEnabled || otherRenew.cogenEnabled,
  };

  return {
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, battery, heatPump, biomass, otherRenew,
    _summary,
  };
}
