/**
 * Parser XLSX/XLS/CSV client-side pentru import date clădire.
 * Suportă:
 *  1. Template Zephren (foi denumite: Identificare, Anvelopa, Instalatii, Regenerabile)
 *  2. CSV/XLSX generic cu detecție automată coloane
 *  3. Tabel simplu de elemente anvelopă
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
    "n50": "n50", "infiltratii": "n50",
    "perimetru": "perimeter",
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
    "gaz condensare": "GAZ_COND", "gaz": "GAZ_COND", "gas condensing": "GAZ_COND",
    "biomasa": "BIOMASA", "biomass": "BIOMASA",
    "pompa": "HP_AA", "heat pump": "HP_AA", "pd": "HP_AA",
    "electric": "ELECTRICA", "electricity": "ELECTRICA",
    "district": "DISTRICT", "termoficare": "DISTRICT",
    "gaz conventional": "GAZ_CONV",
  };

  for (const row of rows) {
    if (!row[0]) continue;
    const key = String(row[0]).toLowerCase().trim();
    const val = row[1] !== undefined ? String(row[1]).trim() : "";
    if (!val) continue;

    if (key.includes("sursa incalzire") || key.includes("sistem incalzire") || key.includes("heating source")) {
      const vl = val.toLowerCase();
      result.heating.source = Object.entries(heatingSourceMap).find(([k]) => vl.includes(k))?.[1] || "GAZ_COND";
    } else if (key.includes("eficienta incalzire") || key.includes("eta") || key.includes("cop incalzire")) {
      result.heating.eta_gen = val;
    } else if (key.includes("putere incalzire") || key.includes("heating power")) {
      result.heating.power = val;
    } else if (key.includes("temperatura interioara") || key.includes("theta int")) {
      result.heating.theta_int = val;
    } else if (key.includes("sursa acm") || key.includes("hot water")) {
      result.acm.source = Object.entries(heatingSourceMap).find(([k]) => val.toLowerCase().includes(k))?.[1] || "CAZAN_H";
    } else if (key.includes("litri") || key.includes("daily liters") || key.includes("consum acm")) {
      result.acm.dailyLiters = val;
    } else if (key.includes("racire") || key.includes("cooling") && key.includes("sistem")) {
      result.cooling.hasCooling = val.toLowerCase() !== "nu" && val.toLowerCase() !== "no" && val !== "0";
    } else if (key.includes("cop racire") || key.includes("eer")) {
      result.cooling.eer = val;
    } else if (key.includes("tip ventilare") || key.includes("ventilation type")) {
      const vl = val.toUpperCase();
      result.ventilation.type = vl.includes("MEC") || vl.includes("VMC") ? (vl.includes("R") || vl.includes("HR") ? "VMCR" : "VMC") : "NAT";
    } else if (key.includes("recuperare caldura") || key.includes("hr eta") || key.includes("heat recovery")) {
      result.ventilation.hrEfficiency = val;
    } else if (key.includes("iluminat") || key.includes("lighting type")) {
      result.lighting.type = val.toUpperCase().includes("LED") ? "LED" : val.toUpperCase().includes("FLUOR") ? "FLUOR" : "LED";
    } else if (key.includes("densitate putere") || key.includes("w/m2") || key.includes("p iluminat")) {
      result.lighting.pDensity = val;
    }
  }

  return result;
}

// ── Parsare foaie "Regenerabile" (key-value) ──────────────────────────────────
function parseSheetRegenerabile(sheet) {
  const result = {
    solarThermal: { enabled: false },
    photovoltaic: { enabled: false },
    heatPump: { enabled: false },
    biomass: { enabled: false },
  };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  for (const row of rows) {
    if (!row[0]) continue;
    const key = String(row[0]).toLowerCase().trim();
    const val = row[1] !== undefined ? String(row[1]).trim() : "";
    if (!val) continue;

    const enabled = ["da", "yes", "true", "1", "activ", "enabled"].includes(val.toLowerCase());

    if (key.includes("solar termic") || key.includes("solar thermal")) {
      result.solarThermal.enabled = enabled;
    } else if (key.includes("suprafata captatori") || key.includes("solar area")) {
      result.solarThermal.area = val;
      if (parseFloat(val) > 0) result.solarThermal.enabled = true;
    } else if (key.includes("fotovoltaic") || key.includes("pv") || key.includes("photovoltaic")) {
      result.photovoltaic.enabled = enabled;
    } else if (key.includes("putere pv") || key.includes("pv power") || key.includes("kwp")) {
      result.photovoltaic.peakPower = val;
      if (parseFloat(val) > 0) result.photovoltaic.enabled = true;
    } else if (key.includes("suprafata pv") || key.includes("pv area")) {
      result.photovoltaic.area = val;
    } else if (key.includes("pompa de caldura") || key.includes("heat pump")) {
      result.heatPump.enabled = enabled;
    } else if (key.includes("cop pompa") || key.includes("cop hp")) {
      result.heatPump.cop = val;
      if (parseFloat(val) > 0) result.heatPump.enabled = true;
    } else if (key.includes("biomasa") || key.includes("biomass")) {
      result.biomass.enabled = enabled;
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
 *             solarThermal, photovoltaic, heatPump, biomass, _summary }}
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
  let heatPump = { enabled: false };
  let biomass = { enabled: false };

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
        heatPump = ren.heatPump;
        biomass = ren.biomass;
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
    hasRenewables: solarThermal.enabled || photovoltaic.enabled || heatPump.enabled || biomass.enabled,
  };

  return { building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, _summary };
}
