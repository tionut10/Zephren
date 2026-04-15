// ═══════════════════════════════════════════════════════════════════════════
// IMPORT HANDLERS — extrase din energy-calc.jsx (refactor S5.2, pct.80)
// Fiecare funcție este pură (nu folosește hooks) și primește un obiect `ctx`
// cu setters + showToast + lang. Chunk-ul se încarcă dinamic la prima chemare.
// NU SCHIMBA LOGICA de parsare; doar relocare.
// ═══════════════════════════════════════════════════════════════════════════

import {
  INITIAL_BUILDING, INITIAL_HEATING, INITIAL_ACM, INITIAL_COOLING,
  INITIAL_VENTILATION, INITIAL_LIGHTING, INITIAL_SOLAR_TH, INITIAL_PV,
  INITIAL_HP, INITIAL_BIO, INITIAL_OTHER, INITIAL_AUDITOR,
} from "../data/initial-state.js";
import { ELEMENT_TYPES } from "../data/building-catalog.js";
import { normalizeGlazingList } from "../components/SmartEnvelopeHub/utils/normalizeGlazing.js";
import { parseIFC, mapIFCToZephren } from "../lib/ifc-parser.js";

// ═══════════════════════════════════════════════════════════════════════════
// 1. RESET PROJECT — restaurează starea inițială
// ═══════════════════════════════════════════════════════════════════════════
export function resetProject(ctx) {
  const {
    setStep, setBuilding, setOpaqueElements, setGlazingElements, setThermalBridges,
    setEditingOpaque, setShowOpaqueModal, setEditingGlazing, setShowGlazingModal,
    setEditingBridge, setShowBridgeModal, setShowBridgeCatalog,
    setInstSubTab, setHeating, setAcm, setCooling, setVentilation, setLighting,
    setRenewSubTab, setSolarThermal, setPhotovoltaic, setHeatPump, setBiomass, setOtherRenew,
    setAuditor, setShowResetConfirm,
  } = ctx;
  setStep(1);
  setBuilding({ ...INITIAL_BUILDING });
  setOpaqueElements([]);
  setGlazingElements([]);
  setThermalBridges([]);
  setEditingOpaque(null); setShowOpaqueModal(false);
  setEditingGlazing(null); setShowGlazingModal(false);
  setEditingBridge(null); setShowBridgeModal(false); setShowBridgeCatalog(false);
  setInstSubTab("heating");
  setHeating({ ...INITIAL_HEATING });
  setAcm({ ...INITIAL_ACM });
  setCooling({ ...INITIAL_COOLING });
  setVentilation({ ...INITIAL_VENTILATION });
  setLighting({ ...INITIAL_LIGHTING });
  setRenewSubTab("solar_th");
  setSolarThermal({ ...INITIAL_SOLAR_TH });
  setPhotovoltaic({ ...INITIAL_PV });
  setHeatPump({ ...INITIAL_HP });
  setBiomass({ ...INITIAL_BIO });
  setOtherRenew({ ...INITIAL_OTHER });
  setAuditor({ ...INITIAL_AUDITOR });
  setShowResetConfirm(false);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. IMPORT ENERGY+ / XML ENERGETIC — parser generic DOM
// ═══════════════════════════════════════════════════════════════════════════
export function importENERGPlus(ctx) {
  const { file, setBuilding, setOpaqueElements, showToast } = ctx;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, "text/xml");
      const getText = (tag) => doc.querySelector(tag)?.textContent?.trim() || "";
      const getNum = (tag) => parseFloat(getText(tag)) || 0;

      const updates = {};
      const addr = getText("Adresa") || getText("adresa") || getText("Address");
      const locality = getText("Localitate") || getText("localitate") || getText("Oras");
      const county = getText("Judet") || getText("judet");
      const au = getNum("SuprafataUtila") || getNum("Au") || getNum("suprafata_utila");
      const vol = getNum("Volum") || getNum("volum") || getNum("VolumIncalzit");
      const year = getText("AnConstructie") || getText("an_constructie");
      const cat = getText("Categorie") || getText("categorie") || getText("CategorieClase");

      if (addr) updates.address = addr;
      if (locality) updates.city = locality;
      if (county) updates.county = county;
      if (au) updates.areaUseful = au.toString();
      if (vol) updates.volume = vol.toString();
      if (year) updates.yearBuilt = year;
      if (cat) {
        const catMap = { "rezidential": "RI", "birouri": "BI", "invatamant": "ED", "sanatate": "SA", "hotel": "HC", "comercial": "CO", "sport": "SP", "altar": "AL" };
        updates.category = catMap[cat.toLowerCase()] || cat;
      }

      const importedOpaque = [];
      const wallNodes = doc.querySelectorAll("Element, element, Perete, perete, ElementOpac");
      wallNodes.forEach(node => {
        const name = node.getAttribute("denumire") || node.getAttribute("name") || node.querySelector("Denumire")?.textContent || "Import";
        const area = parseFloat(node.getAttribute("suprafata") || node.getAttribute("area") || node.querySelector("Suprafata")?.textContent) || 0;
        const uVal = parseFloat(node.getAttribute("U") || node.getAttribute("u") || node.querySelector("U")?.textContent) || 0;
        const type = node.getAttribute("tip") || node.getAttribute("type") || "wall_ext";
        if (area > 0) {
          importedOpaque.push({ name, area: area.toString(), type, orientation: "N", layers: [{ matName: "Import XML", lambda: 0.5, thickness: (uVal > 0 ? Math.round(1000 * 0.5 / ((1 / uVal) - 0.17)) : 200).toString() }] });
        }
      });

      if (Object.keys(updates).length > 0) {
        setBuilding(p => ({ ...p, ...updates }));
      }
      if (importedOpaque.length > 0) {
        setOpaqueElements(prev => [...prev, ...importedOpaque]);
      }

      showToast(`Import XML: ${Object.keys(updates).length} câmpuri + ${importedOpaque.length} elemente`, "success");
    } catch (e) {
      showToast("Eroare parsare XML: " + e.message, "error");
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. IMPORT OCR — scanare certificat existent via API Claude Vision
// ═══════════════════════════════════════════════════════════════════════════
export async function importOCR(ctx) {
  const { file, setBuilding, setAuditor, showToast } = ctx;
  try {
    showToast("Se analizează imaginea cu AI...", "info", 5000);
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const mediaType = file.type || "image/jpeg";
    const resp = await fetch("/api/ocr-cpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType }),
    });
    if (!resp.ok) throw new Error("OCR API error: " + resp.status);
    const result = await resp.json();
    if (result.data) {
      const d = result.data;
      const updates = {};
      if (d.address) updates.address = d.address;
      if (d.city) updates.city = d.city;
      if (d.county) updates.county = d.county;
      if (d.yearBuilt) updates.yearBuilt = String(d.yearBuilt);
      if (d.category) updates.category = d.category;
      if (d.areaUseful) updates.areaUseful = String(d.areaUseful);
      if (d.volume) updates.volume = String(d.volume);
      if (d.floors) updates.floors = d.floors;
      if (d.scope) updates.scopCpe = d.scope;
      setBuilding(function (p) { return Object.assign({}, p, updates); });
      if (d.auditorName) setAuditor(function (p) { return Object.assign({}, p, { name: d.auditorName, atestat: d.auditorAtestat || p.atestat }); });
      showToast("OCR import: " + Object.keys(updates).length + " câmpuri extrase din imagine", "success");
    } else {
      showToast("Nu s-au putut extrage date din imagine", "error");
    }
  } catch (e) { showToast("Eroare OCR: " + e.message, "error"); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMPORT DOSET — XML specific program MDLPA
// ═══════════════════════════════════════════════════════════════════════════
export function importDOSET(ctx) {
  const { file, setBuilding, showToast } = ctx;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, "text/xml");
      const getText = (tag) => { const el = doc.querySelector(tag); return el ? el.textContent.trim() : ""; };
      const getNum = (tag) => parseFloat(getText(tag)) || 0;
      const updates = {};
      const addr = getText("adresa_cladire") || getText("AdresaCladire") || getText("adresa");
      if (addr) updates.address = addr;
      const au = getNum("aria_utila") || getNum("AriaUtila") || getNum("au");
      if (au) updates.areaUseful = String(au);
      const vol = getNum("volum_incalzit") || getNum("VolumIncalzit") || getNum("volum");
      if (vol) updates.volume = String(vol);
      const year = getText("an_constructie") || getText("AnConstructie");
      if (year) updates.yearBuilt = year;
      const cat = getText("categorie_functionala") || getText("CategorieFunctionala");
      if (cat) { const m = { "1": "RI", "2": "RC", "3": "RA", "4": "BI", "5": "ED", "6": "SA", "7": "HC", "8": "CO", "9": "SP" }; updates.category = m[cat] || cat; }
      const locality = getText("localitate") || getText("Localitate");
      if (locality) updates.city = locality;
      const county = getText("judet") || getText("Judet");
      if (county) updates.county = county;
      if (Object.keys(updates).length > 0) setBuilding(function (p) { return Object.assign({}, p, updates); });
      showToast("Import DOSET: " + Object.keys(updates).length + " câmpuri importate", "success");
    } catch (e) { showToast("Eroare parsare DOSET: " + e.message, "error"); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. IMPORT gbXML / IFC — format internațional BIM
// ═══════════════════════════════════════════════════════════════════════════
export function importGbXML(ctx) {
  const { file, setBuilding, setOpaqueElements, showToast } = ctx;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, "text/xml");
      const ns = doc.documentElement.namespaceURI || "";
      const qry = (tag) => doc.getElementsByTagNameNS(ns, tag)[0]?.textContent?.trim() || doc.querySelector(tag)?.textContent?.trim() || "";
      const qryNum = (tag) => parseFloat(qry(tag)) || 0;
      const updates = {};
      const bldg = doc.getElementsByTagNameNS(ns, "Building")[0] || doc.querySelector("Building");
      if (bldg) {
        const area = parseFloat(bldg.querySelector("Area")?.textContent) || qryNum("FloorArea") || qryNum("Area");
        if (area > 0) updates.areaUseful = String(area);
        const name = bldg.getAttribute("buildingType") || "";
        if (name) { const m = { "Office": "BI", "School": "ED", "Hospital": "SA", "Hotel": "HC", "Retail": "CO" }; updates.category = m[name] || "AL"; }
      }
      const importedOpaque = [];
      const surfaces = doc.getElementsByTagNameNS(ns, "Surface");
      for (var si = 0; si < Math.min(surfaces.length, 20); si++) {
        var surf = surfaces[si];
        var sType = surf.getAttribute("surfaceType") || "";
        if (sType.includes("Wall") || sType.includes("Roof") || sType.includes("Floor")) {
          var sName = surf.getAttribute("id") || "gbXML Surface " + (si + 1);
          var areaEl = surf.getElementsByTagNameNS(ns, "Area")[0] || surf.querySelector("Area");
          var sArea = areaEl ? parseFloat(areaEl.textContent) : 0;
          var typeMap = { "ExteriorWall": "PE", "Roof": "PT", "InteriorFloor": "PI", "SlabOnGrade": "PL", "Underground": "PB" };
          var elType = "PE";
          for (var k in typeMap) { if (sType.includes(k)) { elType = typeMap[k]; break; } }
          if (sArea > 0) importedOpaque.push({ name: sName, area: String(sArea), type: elType, orientation: "N", layers: [] });
        }
      }
      if (Object.keys(updates).length > 0) setBuilding(function (p) { return Object.assign({}, p, updates); });
      if (importedOpaque.length > 0) setOpaqueElements(function (prev) { return prev.concat(importedOpaque); });
      showToast("Import gbXML: " + Object.keys(updates).length + " câmpuri + " + importedOpaque.length + " suprafețe", "success");
    } catch (e) { showToast("Eroare parsare gbXML/IFC: " + e.message, "error"); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. IMPORT PROJECT — JSON Zephren cu validare schemă
// ═══════════════════════════════════════════════════════════════════════════
export function importProject(ctx) {
  const {
    file, lang, showToast, setStep,
    setBuilding, setOpaqueElements, setGlazingElements, setThermalBridges,
    setHeating, setAcm, setCooling, setVentilation, setLighting,
    setSolarThermal, setPhotovoltaic, setHeatPump, setBiomass, setOtherRenew, setAuditor,
    setUseNA2023, setFinAnalysisInputs,
  } = ctx;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        showToast(lang === "EN" ? "Invalid format: file does not contain a valid project object." : "Format invalid: fișierul nu conține un obiect proiect valid.", "error"); return;
      }
      const knownKeys = ["building", "opaqueElements", "glazingElements", "thermalBridges", "heating", "acm", "cooling", "ventilation", "lighting", "solarThermal", "photovoltaic", "heatPump", "biomass", "otherRenew", "auditor"];
      const hasAnyKnown = knownKeys.some(k => data[k] !== undefined);
      if (!hasAnyKnown) {
        showToast(lang === "EN" ? "Invalid format: no recognized project data found." : "Format invalid: nu conține date de proiect recunoscute.", "error"); return;
      }
      if (data.opaqueElements && !Array.isArray(data.opaqueElements)) { showToast("Eroare: opaqueElements nu este un array valid.", "error"); return; }
      if (data.glazingElements && !Array.isArray(data.glazingElements)) { showToast("Eroare: glazingElements nu este un array valid.", "error"); return; }
      if (data.thermalBridges && !Array.isArray(data.thermalBridges)) { showToast("Eroare: thermalBridges nu este un array valid.", "error"); return; }
      if (data.building && (typeof data.building !== "object" || Array.isArray(data.building))) { showToast("Eroare: building nu este un obiect valid.", "error"); return; }

      if (data.building) setBuilding(prev => ({ ...INITIAL_BUILDING, ...data.building }));
      if (data.opaqueElements) setOpaqueElements(data.opaqueElements);
      if (data.glazingElements) setGlazingElements(normalizeGlazingList(data.glazingElements));
      if (data.thermalBridges) setThermalBridges(data.thermalBridges);
      if (data.heating) setHeating(prev => ({ ...INITIAL_HEATING, ...data.heating }));
      if (data.acm) setAcm(prev => ({ ...INITIAL_ACM, ...data.acm }));
      if (data.cooling) setCooling(prev => ({ ...INITIAL_COOLING, ...data.cooling }));
      if (data.ventilation) setVentilation(prev => ({ ...INITIAL_VENTILATION, ...data.ventilation }));
      if (data.lighting) setLighting(prev => ({ ...INITIAL_LIGHTING, ...data.lighting }));
      if (data.solarThermal) setSolarThermal(prev => ({ ...INITIAL_SOLAR_TH, ...data.solarThermal }));
      if (data.photovoltaic) setPhotovoltaic(prev => ({ ...INITIAL_PV, ...data.photovoltaic }));
      if (data.heatPump) setHeatPump(prev => ({ ...INITIAL_HP, ...data.heatPump }));
      if (data.biomass) setBiomass(prev => ({ ...INITIAL_BIO, ...data.biomass }));
      if (data.otherRenew) setOtherRenew(prev => ({ ...INITIAL_OTHER, ...data.otherRenew }));
      if (data.auditor) setAuditor(prev => ({ ...INITIAL_AUDITOR, ...data.auditor }));
      if (data.useNA2023 !== undefined) setUseNA2023(data.useNA2023);
      if (data.finAnalysisInputs) setFinAnalysisInputs(prev => ({ ...prev, ...data.finAnalysisInputs }));
      setStep(1);
      showToast("Proiect importat cu succes.", "success");
    } catch (err) {
      showToast("Eroare la import: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. IMPORT CSV — elemente anvelopă din fișier CSV
// ═══════════════════════════════════════════════════════════════════════════
export function importCSV(ctx) {
  const { file, setOpaqueElements, setGlazingElements, showToast } = ctx;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var lines = e.target.result.split("\n").filter(function (l) { return l.trim(); });
      if (lines.length < 2) { showToast("CSV invalid — lipsesc date", "error"); return; }
      var headers = lines[0].split(",").map(function (h) { return h.trim().toLowerCase(); });
      var nameIdx = headers.indexOf("denumire") >= 0 ? headers.indexOf("denumire") : headers.indexOf("name") >= 0 ? headers.indexOf("name") : 0;
      var typeIdx = headers.indexOf("tip") >= 0 ? headers.indexOf("tip") : headers.indexOf("type") >= 0 ? headers.indexOf("type") : 1;
      var areaIdx = headers.indexOf("suprafata") >= 0 ? headers.indexOf("suprafata") : headers.indexOf("area") >= 0 ? headers.indexOf("area") : 2;
      var uIdx = headers.indexOf("u") >= 0 ? headers.indexOf("u") : 3;
      var gIdx = headers.indexOf("g") >= 0 ? headers.indexOf("g") : -1;
      var orientIdx = headers.indexOf("orientare") >= 0 ? headers.indexOf("orientare") : headers.indexOf("orientation") >= 0 ? headers.indexOf("orientation") : -1;
      var catIdx = headers.indexOf("categorie") >= 0 ? headers.indexOf("categorie") : headers.indexOf("category") >= 0 ? headers.indexOf("category") : -1;
      var imported = [];
      for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split(",").map(function (c) { return c.trim(); });
        if (cols.length < 3) continue;
        var typeVal = cols[typeIdx] || "";
        var catVal = catIdx >= 0 ? (cols[catIdx] || "").toLowerCase() : "";
        var uVal = parseFloat(cols[uIdx]) || 0;
        var gVal = gIdx >= 0 ? parseFloat(cols[gIdx]) : -1;
        var isGlazing = catVal === "vitraj" || catVal === "glazing" || catVal === "fereastra" || catVal === "window"
          || typeVal.toLowerCase() === "vitraj" || typeVal.toLowerCase() === "glazing"
          || gVal >= 0
          || (uVal > 0 && uVal < 6 && !ELEMENT_TYPES.find(function (et) { return et.id === typeVal.toUpperCase(); }));
        if (isGlazing) {
          imported.push({ type: "glazing", name: cols[nameIdx] || "Import CSV", area: cols[areaIdx] || "0", u: uVal.toFixed(2), g: "0.50", orientation: cols[orientIdx] || "S", frameRatio: "25" });
        } else {
          imported.push({
            type: "opaque", name: cols[nameIdx] || "Import CSV", elType: cols[typeIdx] || "PE", area: cols[areaIdx] || "0", orientation: cols[orientIdx] || "S",
            layers: [{ material: "Import CSV", thickness: "300", lambda: 0.50, rho: 1500, matName: "Material importat" }]
          });
        }
      }
      var opaqueImports = imported.filter(function (el) { return el.type === "opaque"; }).map(function (el) { return { name: el.name, type: el.elType, area: el.area, orientation: el.orientation, layers: el.layers }; });
      var glazingImports = imported.filter(function (el) { return el.type === "glazing"; }).map(function (el) { return { name: el.name, area: el.area, u: el.u, g: el.g, orientation: el.orientation, frameRatio: el.frameRatio }; });
      if (opaqueImports.length) setOpaqueElements(function (prev) { return prev.concat(opaqueImports); });
      if (glazingImports.length) setGlazingElements(function (prev) { return prev.concat(glazingImports); });
      showToast("Importat " + opaqueImports.length + " elemente opace, " + glazingImports.length + " vitraje", "success");
    } catch (err) { showToast("Eroare CSV: " + err.message, "error"); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. IMPORT COMPARE REF — proiect de referință pentru comparație scenarii
// ═══════════════════════════════════════════════════════════════════════════
export function importCompareRef(ctx) {
  const { file, setCompareRef, showToast } = ctx;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.building && data.building.areaUseful) {
        setCompareRef({
          name: data.building.address || file.name,
          category: data.building.category,
          Au: parseFloat(data.building.areaUseful) || 0,
          ep: data.instSummary?.ep_total_m2 || data.renewSummary?.ep_adjusted_m2 || 0,
          co2: data.instSummary?.co2_total_m2 || data.renewSummary?.co2_adjusted_m2 || 0,
          rer: data.renewSummary?.rer || 0,
          G: data.envelopeSummary?.G || 0,
          qf_total: data.instSummary?.qf_total || 0,
        });
        showToast("Proiect referință importat pentru comparație", "success");
      } else {
        showToast("Fișierul nu conține date valide", "error");
      }
    } catch (err) { showToast("Eroare parsare JSON: " + err.message, "error"); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. IMPORT INVOICE OCR — factură energie/gaz/termoficare (S7.6)
// Folosește /api/ocr-cpe cu mode=invoice (multi-purpose endpoint).
// Extrage consum și actualizează în state.energyPrices + setează an referință.
// ═══════════════════════════════════════════════════════════════════════════
export async function importInvoiceOCR(ctx) {
  const { file, setEnergyPrices, setBuilding, showToast, onInvoiceData } = ctx;
  try {
    showToast("Se analizează factura cu AI...", "info", 5000);
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const mediaType = file.type || "image/jpeg";
    const resp = await fetch("/api/ocr-cpe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType, mode: "invoice" }),
    });
    if (!resp.ok) throw new Error("OCR API error: " + resp.status);
    const result = await resp.json();
    if (!result.data) {
      showToast("Nu s-au putut extrage date din factură.", "error");
      return;
    }
    const d = result.data;

    // ── Auto-populate energyPrices ──
    if (setEnergyPrices && d.avgPrice_leiPerKwh) {
      const priceNum = parseFloat(d.avgPrice_leiPerKwh);
      if (priceNum > 0) {
        const key = d.energyType === "gaz" ? "gas"
          : d.energyType === "electric" ? "electric"
            : d.energyType === "termoficare" ? "district"
              : "other";
        setEnergyPrices(prev => ({ ...prev, [key]: priceNum }));
      }
    }

    // ── Auto-populate adresă clădire dacă nu e setată ──
    if (setBuilding && d.clientAddress) {
      setBuilding(p => p.address ? p : { ...p, address: d.clientAddress });
    }

    // ── Callback pentru aplicație: poate folosi datele pentru comparație calcul ──
    if (onInvoiceData) onInvoiceData(d);

    const summary = [
      d.supplier ? `Furnizor: ${d.supplier}` : null,
      d.consumption_kWh ? `Consum: ${d.consumption_kWh} kWh` : null,
      d.totalCost_lei ? `Cost: ${d.totalCost_lei} lei` : null,
      d.periodStart && d.periodEnd ? `Perioadă: ${d.periodStart} → ${d.periodEnd}` : null,
    ].filter(Boolean).join(" · ");
    showToast("Factură procesată: " + (summary || "date extrase"), "success", 6000);
  } catch (e) {
    showToast("Eroare OCR factură: " + e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. IMPORT IFC — format BIM IFC 2x3 / IFC4 (Revit, ArchiCAD, etc.)
// ═══════════════════════════════════════════════════════════════════════════
export function importIFC(ctx) {
  const { file, setBuilding, setOpaqueElements, setGlazingElements, showToast } = ctx;
  if (!file.name.toLowerCase().endsWith(".ifc")) {
    showToast("Fișier IFC invalid — trebuie să aibă extensia .ifc", "error");
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    showToast("Fișierul IFC depășește 50 MB. Exportă doar structura arhitecturală.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = parseIFC(ev.target.result);
      if (!parsed.buildingData.nWalls && !parsed.buildingData.nSpaces && !parsed.buildingData.nWindows) {
        showToast("Fișierul IFC nu conține elemente recunoscute (pereți/spații/ferestre).", "error");
        return;
      }
      const mapped = mapIFCToZephren(parsed);
      const bUpdates = {};
      if (mapped.address) bUpdates.address = mapped.address;
      if (mapped.areaUseful) bUpdates.areaUseful = mapped.areaUseful;
      if (mapped.volume) bUpdates.volume = mapped.volume;
      if (mapped.nStories) bUpdates.floors = String(mapped.nStories);
      if (Object.keys(bUpdates).length > 0) setBuilding(p => ({ ...p, ...bUpdates }));

      if (mapped.suggestedElements?.length) {
        // Adaugă elemente opace cu layer placeholder (user ajustează ulterior straturi)
        const opaqueNew = mapped.suggestedElements.map(e => ({
          ...e,
          orientation: "N",
          layers: [{ matName: "BCA 25cm", lambda: 0.3, thickness: "250" }],
        }));
        setOpaqueElements(prev => [...prev, ...opaqueNew]);
      }
      if (mapped.suggestedGlazing?.length) {
        const glazingNew = mapped.suggestedGlazing.map(g => ({
          ...g,
          u: "1.8", g: "0.6", orientation: "S", frameRatio: "25",
        }));
        setGlazingElements(prev => [...prev, ...glazingNew]);
      }

      showToast(
        `Import IFC: ${mapped.suggestedElements?.length || 0} elemente opace + ` +
        `${mapped.suggestedGlazing?.length || 0} vitraje + ${parsed.buildingData.nStories} etaje`,
        "success", 5000
      );
    } catch (e) {
      showToast("Eroare parsare IFC: " + e.message, "error");
    }
  };
  reader.onerror = () => showToast("Nu s-a putut citi fișierul IFC.", "error");
  reader.readAsText(file, "UTF-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. IMPORT BULK PROJECTS — arhivă JSON multi-proiect
// ═══════════════════════════════════════════════════════════════════════════
export function importBulkProjects(ctx) {
  const { file, lang, showToast } = ctx;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const bulk = JSON.parse(e.target.result);
      if (bulk.format !== "zephren-bulk" || !Array.isArray(bulk.projects)) {
        showToast(lang === "EN" ? "Invalid format — not a Zephren bulk export." : "Format invalid — nu este un export bulk Zephren.", "error"); return;
      }
      let imported = 0;
      bulk.projects.forEach(p => {
        if (p.data && p.id) {
          const key = "zephren_project_" + p.id + "_import_" + Date.now();
          try {
            if (window.storage?.setItem) window.storage.setItem("project_" + key, JSON.stringify(p.data));
            else localStorage.setItem("zephren_project_" + key, JSON.stringify(p.data));
            imported++;
          } catch (e) { /* storage full */ }
        }
      });
      showToast(`${imported}/${bulk.projects.length} proiecte importate. Reîncărcați lista proiecte.`, "success");
    } catch (err) { showToast("Eroare import bulk: " + err.message, "error"); }
  };
  reader.readAsText(file);
}
