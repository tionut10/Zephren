// ═══════════════════════════════════════════════════════════════════════════
// EXPORT HANDLERS — extrase din energy-calc.jsx (refactor S5.1, pct.80)
// Fiecare funcție este pură (nu folosește hooks) și primește un obiect `ctx`
// cu toate dependențele necesare. Importurile grele (jsPDF, xlsx, qrcode)
// rămân dinamice — chunk-ul acesta se încarcă lazy la prima chemare.
// NU SCHIMBA LOGICA de calcul; doar relocatare.
// ═══════════════════════════════════════════════════════════════════════════

import {
  HEAT_SOURCES, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY, CONTROL_TYPES,
  ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES,
} from "../data/constants.js";
import {
  BUILDING_CATEGORIES, ELEMENT_TYPES, buildCatKey,
} from "../data/building-catalog.js";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";
import { ZEB_THRESHOLDS, FP_ELEC, getFPElecTot, getFPElecNren, getFPElecRen } from "../data/u-reference.js";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { getNzebEpMax } from "../calc/smart-rehab.js";
import { checkC107Conformity } from "../calc/c107.js";

// ─── Helper local: U inline (doar pentru exportCSV / exportExcel / exportExcelFull / exportXML) ───
// exportFullReport și exportComplianceReport primesc `calcOpaqueR` ca ctx param (logica locală specifică).
function _uInline(layers) {
  const rL = (layers || []).reduce((s, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000;
    return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
  }, 0);
  return rL > 0 ? (1 / (0.13 + rL + 0.04)) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXPORT PROJECT — JSON descărcat direct (backup complet)
// ═══════════════════════════════════════════════════════════════════════════
export function exportProject(ctx) {
  const {
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor,
    useNA2023, finAnalysisInputs,
  } = ctx;
  const data = {
    version: "2.0", exportDate: new Date().toISOString(),
    normativeRef: "Mc 001-2022 + SR EN ISO 52000-1/NA:2023",
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor,
    useNA2023, finAnalysisInputs,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Zephren_${building.address || "proiect"}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXPORT CSV — anvelopă + instalații + rezultate
// ═══════════════════════════════════════════════════════════════════════════
export function exportCSV(ctx) {
  const {
    opaqueElements, glazingElements, thermalBridges,
    building, heating, acm, cooling, ventilation, lighting,
    selectedClimate, instSummary, renewSummary, envelopeSummary,
    showToast, lang,
  } = ctx;

  const rows = [];
  rows.push("Tip,Denumire,Tip element,Orientare,Suprafata m2,U W/m2K,g factor,Lambda W/mK,Grosime mm,Psi W/mK,Lungime m");
  opaqueElements.forEach(function (el) {
    const uCalc = el.layers && el.layers.length > 0 ? (function () {
      const elType = ELEMENT_TYPES.find(function (t) { return t.id === el.type; });
      const rsi = elType ? elType.rsi : 0.13;
      const rse = elType ? elType.rse : 0.04;
      const rL = el.layers.reduce(function (s, l) { var d = (parseFloat(l.thickness) || 0) / 1000; return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0); }, 0);
      return 1 / (rsi + rL + rse);
    })() : 0;
    rows.push(["Opac", el.name || "", el.type || "", el.orientation || "", el.area || "", uCalc.toFixed(3), "", "", "", "", ""].join(","));
    if (el.layers) {
      el.layers.forEach(function (l) {
        rows.push(["  Strat", l.matName || "", "", "", "", "", "", l.lambda || "", l.thickness || "", "", ""].join(","));
      });
    }
  });
  glazingElements.forEach(function (el) {
    rows.push(["Vitraj", el.name || "", el.glazingType || "", el.orientation || "", el.area || "", el.u || "", el.g || "", "", "", "", ""].join(","));
  });
  thermalBridges.forEach(function (b) {
    rows.push(["Punte", b.name || "", b.type || "", "", "", "", "", "", "", b.psi || "", b.length || ""].join(","));
  });
  rows.push("");
  rows.push("=== DATE GENERALE ===");
  rows.push("Parametru,Valoare");
  rows.push("Categorie," + (building.category || ""));
  rows.push("Localitate," + (building.locality || ""));
  rows.push("Au m2," + (building.areaUseful || ""));
  rows.push("Volum m3," + (building.volume || ""));
  rows.push("An constructie," + (building.yearBuilt || ""));
  rows.push("Zona climatica," + (selectedClimate?.zone || ""));
  rows.push("");
  rows.push("=== INSTALATII ===");
  rows.push("Sursa incalzire," + (HEAT_SOURCES.find(function (s) { return s.id === heating.source; })?.label || heating.source));
  rows.push("Randament generare," + (heating.eta_gen || ""));
  rows.push("Sursa ACM," + (ACM_SOURCES.find(function (s) { return s.id === acm.source; })?.label || acm.source));
  rows.push("Sistem racire," + (COOLING_SYSTEMS.find(function (s) { return s.id === cooling.system; })?.label || cooling.system));
  rows.push("Tip ventilare," + (VENTILATION_TYPES.find(function (s) { return s.id === ventilation.type; })?.label || ventilation.type));
  rows.push("Tip iluminat," + (LIGHTING_TYPES.find(function (s) { return s.id === lighting.type; })?.label || lighting.type));
  if (instSummary) {
    var epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    var co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    rows.push("");
    rows.push("=== REZULTATE ===");
    rows.push("Energie primara kWh/(m2·an)," + (epF?.toFixed(1) || ""));
    rows.push("Emisii CO2 kgCO2/(m2·an)," + (co2F?.toFixed(1) || ""));
    rows.push("Clasa energetica," + (getEnergyClass(epF, buildCatKey(building.category, cooling.hasCooling))?.cls || ""));
    rows.push("RER %," + ((renewSummary?.rer || 0).toFixed(1)));
    rows.push("Coef global G W/(m3·K)," + (envelopeSummary?.G?.toFixed(4) || ""));
    rows.push("Energie finala kWh/(m2·an)," + (instSummary.qf_total_m2?.toFixed(1) || ""));
  }

  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Zephren_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30) + "_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast(lang === "EN" ? "CSV exported successfully." : "CSV exportat cu succes.", "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EXPORT EXCEL — workbook 9 foi (dynamic xlsx)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportExcel(ctx) {
  const {
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, auditor,
    selectedClimate, instSummary, renewSummary, envelopeSummary, monthlyISO,
    showToast, setExporting, lang,
  } = ctx;
  try {
    setExporting("excel");
    const XLSX = (await import("xlsx")).default || await import("xlsx");
    const wb = XLSX.utils.book_new();

    const infoData = [
      ["Parametru", "Valoare"],
      ["Adresa", building.address || ""], ["Localitate", building.locality || ""],
      ["Județ", building.county || ""], ["Categorie", building.category || ""],
      ["An construcție", building.yearBuilt || ""], ["Suprafață utilă (m²)", building.areaUseful || ""],
      ["Volum (m³)", building.volume || ""], ["Suprafață anvelopă (m²)", building.areaEnvelope || ""],
      ["Zonă climatică", selectedClimate?.zone || ""], ["Temp ext calcul (°C)", selectedClimate?.theta_e || ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), "Clădire");

    const opaqueData = [["Denumire", "Tip", "Suprafață (m²)", "Orientare", "U (W/m²K)", "Straturi"]];
    opaqueElements.forEach(el => {
      const rL = (el.layers || []).reduce((s, l) => { const d = (parseFloat(l.thickness) || 0) / 1000; return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0); }, 0);
      const u = rL > 0 ? (1 / (0.13 + rL + 0.04)).toFixed(3) : "0";
      opaqueData.push([el.name || "", el.type || "", el.area || "", el.orientation || "", u, (el.layers || []).map(l => l.matName || "?").join(" + ")]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(opaqueData), "Elemente opace");

    const glazData = [["Denumire", "Tip vitraj", "Suprafață (m²)", "Orientare", "U (W/m²K)", "g"]];
    glazingElements.forEach(el => glazData.push([el.name || "", el.glazingType || "", el.area || "", el.orientation || "", el.u || "", el.g || ""]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(glazData), "Vitraje");

    const bridgeData = [["Denumire", "Tip", "Ψ (W/mK)", "Lungime (m)", "Pierdere (W/K)"]];
    thermalBridges.forEach(b => bridgeData.push([b.name || "", b.type || "", b.psi || "", b.length || "", ((parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0)).toFixed(2)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bridgeData), "Punți termice");

    if (instSummary) {
      const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
      const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
      const Au = parseFloat(building.areaUseful) || 1;
      const resultsData = [
        ["Indicator", "Valoare", "Unitate"],
        ["Energie primară totală", epF?.toFixed(1) || "", "kWh/(m²·an)"],
        ["Emisii CO₂", co2F?.toFixed(1) || "", "kgCO₂/(m²·an)"],
        ["Clasă energetică", getEnergyClass(epF, buildCatKey(building.category, cooling.hasCooling))?.cls || "", ""],
        ["RER", (renewSummary?.rer || 0).toFixed(1), "%"],
        ["Conform nZEB", (renewSummary?.rer || 0) >= 30 && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
        ["Coef. global G", envelopeSummary?.G?.toFixed(4) || "", "W/(m³·K)"],
        ["", "", ""],
        ["Energie finală per utilitate", "kWh/an", "kWh/(m²·an)"],
        ["Încălzire", instSummary.qf_h?.toFixed(0) || "", (instSummary.qf_h / Au)?.toFixed(1) || ""],
        ["Apă caldă (ACM)", instSummary.qf_w?.toFixed(0) || "", (instSummary.qf_w / Au)?.toFixed(1) || ""],
        ["Răcire", instSummary.qf_c?.toFixed(0) || "", (instSummary.qf_c / Au)?.toFixed(1) || ""],
        ["Ventilare", instSummary.qf_v?.toFixed(0) || "", (instSummary.qf_v / Au)?.toFixed(1) || ""],
        ["Iluminat", instSummary.qf_l?.toFixed(0) || "", (instSummary.qf_l / Au)?.toFixed(1) || ""],
        ["TOTAL finală", instSummary.qf_total?.toFixed(0) || "", instSummary.qf_total_m2?.toFixed(1) || ""],
        ["", "", ""],
        ["Energie primară per utilitate", "kWh/an", "kWh/(m²·an)"],
        ["Încălzire", instSummary.ep_h?.toFixed(0) || "", (instSummary.ep_h / Au)?.toFixed(1) || ""],
        ["Apă caldă (ACM)", instSummary.ep_w?.toFixed(0) || "", (instSummary.ep_w / Au)?.toFixed(1) || ""],
        ["Răcire", instSummary.ep_c?.toFixed(0) || "", (instSummary.ep_c / Au)?.toFixed(1) || ""],
        ["Ventilare", instSummary.ep_v?.toFixed(0) || "", (instSummary.ep_v / Au)?.toFixed(1) || ""],
        ["Iluminat", instSummary.ep_l?.toFixed(0) || "", (instSummary.ep_l / Au)?.toFixed(1) || ""],
        ["TOTAL primară", instSummary.ep_total?.toFixed(0) || "", instSummary.ep_total_m2?.toFixed(1) || ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsData), "Rezultate");
    }

    if (monthlyISO && monthlyISO.length === 12) {
      const monthData = [["Lună", "T ext (°C)", "Q pierderi (kWh)", "Q aporturi (kWh)", "Q încălzire (kWh)", "Q răcire (kWh)", "η_H", "γ_H"]];
      monthlyISO.forEach(m => monthData.push([
        m.name, m.tExt?.toFixed(1) || "", m.Q_loss?.toFixed(0) || "", m.Q_gain?.toFixed(0) || "",
        m.qH_nd?.toFixed(0) || "", m.qC_nd?.toFixed(0) || "", m.eta_H?.toFixed(3) || "", m.gamma_H?.toFixed(3) || ""
      ]));
      monthData.push(["TOTAL", "", monthlyISO.reduce((s, m) => s + (m.Q_loss || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.Q_gain || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.qH_nd || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.qC_nd || 0), 0).toFixed(0), "", ""]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthData), "Bilanț lunar");
    }

    const sysData = [
      ["Sistem", "Parametru", "Valoare"],
      ["Încălzire", "Sursă", HEAT_SOURCES.find(s => s.id === heating.source)?.label || heating.source],
      ["", "Putere nominală (kW)", heating.power || ""],
      ["", "Randament generare", heating.eta_gen || ""],
      ["", "Sistem emisie", EMISSION_SYSTEMS.find(s => s.id === heating.emission)?.label || ""],
      ["", "Calitate distribuție", DISTRIBUTION_QUALITY.find(s => s.id === heating.distribution)?.label || ""],
      ["", "Tip reglaj", CONTROL_TYPES.find(s => s.id === heating.control)?.label || ""],
      ["ACM", "Sursă", ACM_SOURCES.find(s => s.id === acm.source)?.label || acm.source],
      ["", "Consumatori", acm.consumers || ""],
      ["", "Litri/zi/pers", acm.dailyLiters || ""],
      ["Răcire", "Sistem", COOLING_SYSTEMS.find(s => s.id === cooling.system)?.label || cooling.system],
      ["", "EER", cooling.eer || ""],
      ["Ventilare", "Tip", VENTILATION_TYPES.find(s => s.id === ventilation.type)?.label || ventilation.type],
      ["", "Debit (m³/h)", ventilation.airflow || ""],
      ["", "Recuperare (%)", ventilation.hrEfficiency || ""],
      ["Iluminat", "Tip", LIGHTING_TYPES.find(s => s.id === lighting.type)?.label || lighting.type],
      ["", "Densitate (W/m²)", lighting.pDensity || ""],
      ["", "LENI (kWh/m²·an)", instSummary?.leni?.toFixed(1) || ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sysData), "Instalații");

    const renData = [
      ["Sursă regenerabilă", "Parametru", "Valoare"],
      ["PV", "Activ", photovoltaic.enabled ? "DA" : "NU"],
      ["", "Putere (kWp)", photovoltaic.peakPower || ""],
      ["", "Suprafață (m²)", photovoltaic.area || ""],
      ["", "Producție (kWh/an)", renewSummary?.qPV_kWh?.toFixed(0) || ""],
      ["Solar termic", "Activ", solarThermal.enabled ? "DA" : "NU"],
      ["", "Suprafață (m²)", solarThermal.area || ""],
      ["", "Producție (kWh/an)", renewSummary?.qSolarTh?.toFixed(0) || ""],
      ["Pompă căldură", "Activ", heatPump.enabled ? "DA" : "NU"],
      ["", "Tip", heatPump.type || ""],
      ["", "COP nominal", heatPump.cop || ""],
      ["Biomasă", "Activ", biomass.enabled ? "DA" : "NU"],
      ["", "Tip", biomass.type || ""],
      ["", "", ""],
      ["TOTAL", "RER (%)", (renewSummary?.rer || 0).toFixed(1)],
      ["", "RER on-site (%)", (renewSummary?.rerOnSite || 0).toFixed(1)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renData), "Regenerabile");

    if (auditor.name) {
      const audData = [
        ["Câmp", "Valoare"],
        ["Nume auditor", auditor.name || ""],
        ["Nr. atestat", auditor.atestat || ""],
        ["Grad", auditor.grade || ""],
        ["Firmă", auditor.company || ""],
        ["Telefon", auditor.phone || ""],
        ["Email", auditor.email || ""],
        ["Data CPE", auditor.date || ""],
        ["Observații", auditor.observations || ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(audData), "Auditor");
    }

    const filename = `Zephren_${(building.address || "proiect").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(lang === "EN" ? "Excel exported successfully." : "Excel exportat cu succes.", "success");
  } catch (e) {
    showToast("Eroare export Excel: " + e.message, "error");
  } finally { setExporting(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXPORT XML — CPE Mc 001-2022 / MDLPA Registru Electronic
// ═══════════════════════════════════════════════════════════════════════════
export function exportXML(ctx) {
  const {
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, auditor,
    instSummary, renewSummary, envelopeSummary, selectedClimate,
    showToast,
  } = ctx;

  if (!instSummary) { showToast("Completați calculul energetic (Pasul 5) înainte de export XML.", "error"); return; }
  const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
  const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
  const catKey = buildCatKey(building.category, cooling.hasCooling);
  const cls = getEnergyClass(epF, catKey);
  const rer = renewSummary?.rer || 0;
  const Au = parseFloat(building.areaUseful) || 0;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CPE_RegistruElectronic xmlns="urn:ro:mdlpa:certificat-performanta-energetica:2023" version="1.0">
  <MetaDate>
    <FormatVersiune>Mc001-2022</FormatVersiune>
    <DataExport>${new Date().toISOString()}</DataExport>
    <Software>Zephren v3.0</Software>
    <NormativCalcul>SR EN ISO 52000-1:2017/NA:2023</NormativCalcul>
  </MetaDate>
  <Cladire>
    <Adresa>${building.address || ""}</Adresa>
    <Localitate>${building.city || ""}</Localitate>
    <Judet>${building.county || ""}</Judet>
    <CodPostal>${building.postal || ""}</CodPostal>
    <NrCadastral>${auditor.nrCadastral || ""}</NrCadastral>
    <CategorieClase>${building.category || "RI"}</CategorieClase>
    <CategorieFunctionala>${BUILDING_CATEGORIES.find(c => c.id === building.category)?.label || ""}</CategorieFunctionala>
    <AnConstructie>${building.yearBuilt || ""}</AnConstructie>
    <AnReabilitare>${building.yearRenov || ""}</AnReabilitare>
    <SuprafataUtila unit="m2">${Au}</SuprafataUtila>
    <VolumIncalzit unit="m3">${building.volume || ""}</VolumIncalzit>
    <SuprafataAnvelopa unit="m2">${building.areaEnvelope || ""}</SuprafataAnvelopa>
    <ZonaClimatica>${selectedClimate?.zone || ""}</ZonaClimatica>
    <TemperaturaExterioara unit="C">${selectedClimate?.theta_e || ""}</TemperaturaExterioara>
    <GradeZile>${selectedClimate?.ngz || ""}</GradeZile>
  </Cladire>
  <Anvelopa>
    <CoeficientGlobal unit="W/(m3·K)">${envelopeSummary?.G?.toFixed(4) || ""}</CoeficientGlobal>
    <ElementeOpace>${opaqueElements.map(el => {
    const rL = (el.layers || []).reduce((s, l) => { const d = (parseFloat(l.thickness) || 0) / 1000; return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0); }, 0);
    const uVal = rL > 0 ? (1 / (0.13 + rL + 0.04)) : 0;
    return `\n      <Element tip="${el.type}" suprafata="${el.area}" U="${uVal.toFixed(3)}" denumire="${el.name || ""}"/>`;
  }).join("")}
    </ElementeOpace>
    <ElementeVitrate>${glazingElements.map(el => `\n      <Element suprafata="${el.area}" U="${el.u}" g="${el.g}" orientare="${el.orientation}" denumire="${el.name || ""}"/>`).join("")}
    </ElementeVitrate>
    <PuntiTermice>${thermalBridges.map(b => `\n      <Punte psi="${b.psi}" lungime="${b.length}" denumire="${b.name || ""}"/>`).join("")}
    </PuntiTermice>
  </Anvelopa>
  <Instalatii>
    <Incalzire sursa="${heating.source}" randament="${instSummary.eta_total_h?.toFixed(2) || ""}" combustibil="${instSummary.fuel?.id || ""}"/>
    <ACM sursa="${acm.source}"/>
    <Climatizare activa="${cooling.hasCooling}" EER="${cooling.eer || ""}"/>
    <Ventilare tip="${ventilation.type}" recuperare="${ventilation.hrEfficiency || "0"}"/>
    <Iluminat tip="${lighting.type}" LENI="${instSummary.leni?.toFixed(1) || ""}"/>
  </Instalatii>
  <Regenerabile>
    <RER unit="%">${rer.toFixed(1)}</RER>
    <RER_OnSite unit="%">${(renewSummary?.rerOnSite || 0).toFixed(1)}</RER_OnSite>
    <PV activ="${photovoltaic.enabled}" putere_kWp="${photovoltaic.peakPower || "0"}"/>
    <SolarTermic activ="${solarThermal.enabled}" suprafata="${solarThermal.area || "0"}"/>
    <PompaCaldura activ="${heatPump.enabled}" COP="${heatPump.cop || ""}"/>
    <Biomasa activ="${biomass.enabled}" tip="${biomass.type || ""}"/>
  </Regenerabile>
  <BilanțEnergetic>
    <EnergieFinala unit="kWh/an">${instSummary.qf_total?.toFixed(1) || ""}</EnergieFinala>
    <EnergieFinalaSpecifica unit="kWh/(m2·an)">${instSummary.qf_total_m2?.toFixed(1) || ""}</EnergieFinalaSpecifica>
    <EnergiePrimara unit="kWh/an">${(renewSummary?.ep_adjusted || instSummary.ep_total || 0).toFixed(1)}</EnergiePrimara>
    <EnergiePrimaraSpecifica unit="kWh/(m2·an)">${epF.toFixed(1)}</EnergiePrimaraSpecifica>
    <EmisiiCO2 unit="kgCO2/(m2·an)">${co2F.toFixed(1)}</EmisiiCO2>
    <ClasaEnergetica>${cls.cls}</ClasaEnergetica>
    <NotaEnergetica>${cls.score}</NotaEnergetica>
    <ConformNZEB>${epF <= (getNzebEpMax(building.category, selectedClimate?.zone) || 999) && rer >= (NZEB_THRESHOLDS[building.category]?.rer_min || 30)}</ConformNZEB>
  </BilanțEnergetic>
  <Auditor>
    <Nume>${auditor.name || ""}</Nume>
    <GradAtestat>${auditor.grade || ""}</GradAtestat>
    <NrAtestat>${auditor.atestat || ""}</NrAtestat>
    <Firma>${auditor.company || ""}</Firma>
    <DataElaborare>${auditor.date || ""}</DataElaborare>
    <ScopCPE>${auditor.scopCpe || ""}</ScopCPE>
    <DurataValabilitate ani="${auditor.validityYears || "10"}"/>
    <CodUnicMDLPA>${auditor.codUnicMDLPA || ""}</CodUnicMDLPA>
  </Auditor>
</CPE_RegistruElectronic>`;
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `CPE_XML_${(building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.xml`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
  showToast("XML MDLPA exportat cu succes", "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. GENERATE QR CODE SVG — pattern simplu (non-scanabil, vizual)
// ═══════════════════════════════════════════════════════════════════════════
export function generateQRCodeSVG(text, size) {
  size = size || 100;
  const cells = 21;
  const cellSize = size / cells;
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const seed = hash(text || "zephren");
  const rects = [];
  const addFinder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const on = (y === 0 || y === 6 || x === 0 || x === 6) || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
      if (on) rects.push(`<rect x="${(ox + x) * cellSize}" y="${(oy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`);
    }
  };
  addFinder(0, 0); addFinder(cells - 7, 0); addFinder(0, cells - 7);
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    if ((x < 8 && y < 8) || (x >= cells - 8 && y < 8) || (x < 8 && y >= cells - 8)) continue;
    if ((seed * (y * cells + x + 1)) % 3 === 0) {
      rects.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`);
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#fff"/>${rects.join("")}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. EXPORT EXCEL FULL — workbook 7 foi detaliate (dynamic xlsx)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportExcelFull(ctx) {
  const {
    building, selectedClimate, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    photovoltaic, solarThermal, heatPump, biomass,
    instSummary, renewSummary, envelopeSummary, monthlyISO, auditor,
    showToast, setExporting,
  } = ctx;
  try {
    setExporting("excelFull");
    const XLSX = (await import("xlsx")).default || await import("xlsx");
    const wb = XLSX.utils.book_new();
    const Au = parseFloat(building.areaUseful) || 1;
    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
    const catKey = buildCatKey(building.category, cooling?.hasCooling);

    // Foaie 1: Rezumat
    const rezumatData = [
      ["REZUMAT"],
      [],
      ["DATE CLADIRE", ""],
      ["Adresa", building.address || ""],
      ["Localitate", building.locality || ""],
      ["Judet", building.county || ""],
      ["Categorie functionala", building.category || ""],
      ["An constructie", building.yearBuilt || ""],
      ["Regim inaltime", building.floors || ""],
      ["Suprafata utila (m2)", building.areaUseful || ""],
      ["Volum incalzit (m3)", building.volume || ""],
      ["Suprafata anvelopa (m2)", building.areaEnvelope || ""],
      ["Structura", building.structure || ""],
      [],
      ["DATE CLIMATICE", ""],
      ["Localitate referinta", selectedClimate?.name || ""],
      ["Zona climatica", selectedClimate?.zone || ""],
      ["Temperatura ext. calcul (C)", selectedClimate?.theta_e || ""],
      ["Temperatura medie anuala (C)", selectedClimate?.theta_a || ""],
      ["GZile (C*zile)", selectedClimate?.gzile || ""],
      [],
      ["KPI ENERGETICI", "", ""],
      ["Indicator", "Valoare", "Unitate"],
      ["Energie primara totala EP", epF?.toFixed(1) || "", "kWh/(m2*an)"],
      ["Energie finala totala EF", instSummary?.qf_total_m2?.toFixed(1) || "", "kWh/(m2*an)"],
      ["Emisii CO2", co2F?.toFixed(1) || "", "kgCO2/(m2*an)"],
      ["Clasa energetica EP", getEnergyClass(epF, catKey)?.cls || "", ""],
      ["RER total (%)", (renewSummary?.rer || 0).toFixed(1), "%"],
      ["RER on-site (%)", (renewSummary?.rerOnSite || 0).toFixed(1), "%"],
      ["Coef. global pierderi G", envelopeSummary?.G?.toFixed(4) || "", "W/(m3*K)"],
      ["Conform nZEB", (renewSummary?.rer || 0) >= 30 && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
      ["EP maxim nZEB", getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0) || "", "kWh/(m2*an)"],
      ["LENI iluminat", instSummary?.leni?.toFixed(1) || "", "kWh/(m2*an)"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rezumatData), "Rezumat");

    // Foaie 2: Anvelopa
    const anvData = [
      ["ANVELOPA"],
      [],
      ["ELEMENTE OPACE"],
      ["Denumire", "Tip", "Suprafata (m2)", "Orientare", "U calculat (W/m2K)", "U ref nZEB (W/m2K)", "Straturi"],
    ];
    opaqueElements.forEach(el => {
      const rL = (el.layers || []).reduce((s, l) => { const d = (parseFloat(l.thickness) || 0) / 1000; return s + (d > 0 && l.lambda > 0 ? d / l.lambda : 0); }, 0);
      const uCalc = rL > 0 ? (1 / (0.13 + rL + 0.04)) : 0;
      const uRef = el.type === "PE" ? 0.56 : el.type === "PSol" ? 0.40 : el.type === "PlanInt" ? 0.50 : el.type === "PlanExt" ? 0.20 : el.type === "Acoperis" ? 0.20 : 0.35;
      anvData.push([
        el.name || "", el.type || "", el.area || "", el.orientation || "",
        uCalc.toFixed(3), uRef.toFixed(2),
        (el.layers || []).map(l => `${l.matName || "?"} (${l.thickness || 0}mm, lambda=${l.lambda || 0})`).join(" | "),
      ]);
    });
    anvData.push([]);
    anvData.push(["ELEMENTE VITRATE"]);
    anvData.push(["Denumire", "Tip vitraj", "Suprafata (m2)", "Orientare", "U (W/m2K)", "g (-)", "Tip rama"]);
    glazingElements.forEach(el => anvData.push([
      el.name || "", el.glazingType || "", el.area || "", el.orientation || "",
      el.u || "", el.g || "", el.frameType || "",
    ]));
    anvData.push([]);
    anvData.push(["PUNTI TERMICE"]);
    anvData.push(["Denumire", "Tip", "Psi (W/mK)", "Lungime (m)", "Pierdere liniara (W/K)"]);
    thermalBridges.forEach(b => anvData.push([
      b.name || "", b.type || "", b.psi || "", b.length || "",
      ((parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0)).toFixed(3),
    ]));
    if (envelopeSummary) {
      const totalBridgeLoss = thermalBridges.reduce((s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0), 0);
      anvData.push(["TOTAL punti termice", "", "", "", totalBridgeLoss.toFixed(3)]);
      anvData.push([]);
      anvData.push(["REZUMAT ANVELOPA", "Valoare", "Unitate"]);
      anvData.push(["Coef. global G", envelopeSummary.G?.toFixed(4) || "", "W/(m3*K)"]);
      anvData.push(["H_T total", envelopeSummary.H_T?.toFixed(2) || "", "W/K"]);
      anvData.push(["H_V total", envelopeSummary.H_V?.toFixed(2) || "", "W/K"]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(anvData), "Anvelopa");

    // Foaie 3: Calcul termic ISO 13790
    if (monthlyISO && monthlyISO.length === 12) {
      const thermalData = [
        ["CALCUL TERMIC LUNAR ISO 13790"],
        [],
        ["Luna", "T ext (C)", "Q pierderi (kWh)", "Q sol (kWh)", "Q interne (kWh)",
          "Q aporturi total (kWh)", "Factor utilizare eta_H", "Raport gamma_H",
          "Q incalzire (kWh)", "Q racire (kWh)"],
      ];
      monthlyISO.forEach(m => thermalData.push([
        m.name, m.tExt?.toFixed(1) || "", m.Q_loss?.toFixed(0) || "",
        m.Q_sol?.toFixed(0) || "", m.Q_int?.toFixed(0) || "",
        m.Q_gain?.toFixed(0) || "",
        m.eta_H?.toFixed(3) || "", m.gamma_H?.toFixed(3) || "",
        m.qH_nd?.toFixed(0) || "", m.qC_nd?.toFixed(0) || "",
      ]));
      thermalData.push([
        "TOTAL", "",
        monthlyISO.reduce((s, m) => s + (m.Q_loss || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.Q_sol || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.Q_int || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.Q_gain || 0), 0).toFixed(0),
        "", "",
        monthlyISO.reduce((s, m) => s + (m.qH_nd || 0), 0).toFixed(0),
        monthlyISO.reduce((s, m) => s + (m.qC_nd || 0), 0).toFixed(0),
      ]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(thermalData), "Calcul termic");
    }

    // Foaie 4: Instalatii
    const instData = [
      ["INSTALATII — CONSUMURI PER UTILITATE"],
      [],
      ["CONSUMURI FINALE SI PRIMARE", "", "", "", ""],
      ["Utilitate", "Energie finala (kWh/an)", "EF (kWh/m2*an)", "Energie primara (kWh/an)", "EP (kWh/m2*an)",
        "Factor primar fp", "CO2 (kgCO2/an)"],
    ];
    if (instSummary) {
      const hFuel = HEAT_SOURCES.find(s => s.id === heating.source);
      const fpH = hFuel?.fp || heating.fp || 1.1;
      const rows_inst = [
        ["Incalzire", instSummary.qf_h, instSummary.ep_h, fpH, instSummary.co2_h],
        ["Apa calda (ACM)", instSummary.qf_w, instSummary.ep_w, fpH, instSummary.co2_w],
        ["Racire", instSummary.qf_c, instSummary.ep_c, 2.5, instSummary.co2_c],
        ["Ventilare", instSummary.qf_v, instSummary.ep_v, 2.5, instSummary.co2_v],
        ["Iluminat", instSummary.qf_l, instSummary.ep_l, 2.5, instSummary.co2_l],
      ];
      rows_inst.forEach(([label, qf, ep, fp, co2]) => instData.push([
        label,
        (qf || 0).toFixed(0), ((qf || 0) / Au).toFixed(1),
        (ep || 0).toFixed(0), ((ep || 0) / Au).toFixed(1),
        fp,
        (co2 || 0).toFixed(0),
      ]));
      instData.push([
        "TOTAL",
        instSummary.qf_total?.toFixed(0) || "", instSummary.qf_total_m2?.toFixed(1) || "",
        instSummary.ep_total?.toFixed(0) || "", instSummary.ep_total_m2?.toFixed(1) || "",
        "", instSummary.co2_total?.toFixed(0) || "",
      ]);
      instData.push([]);
      instData.push(["PARAMETRI SISTEME", "", ""]);
      instData.push(["Sistem", "Parametru", "Valoare"]);
      instData.push(["Incalzire", "Sursa", HEAT_SOURCES.find(s => s.id === heating.source)?.label || heating.source]);
      instData.push(["", "Putere nominala (kW)", heating.power || ""]);
      instData.push(["", "Randament generare (eta_gen)", heating.etaGen || heating.eta_gen || ""]);
      instData.push(["", "Randament distributie (eta_distr)", heating.etaDistr || heating.eta_distr || ""]);
      instData.push(["", "Randament emisie (eta_emit)", heating.etaEmit || heating.eta_emit || ""]);
      instData.push(["", "Factor primar fp", heating.fp || fpH || ""]);
      instData.push(["ACM", "Sursa", ACM_SOURCES.find(s => s.id === acm.source)?.label || acm.source]);
      instData.push(["", "Consumatori", acm.consumers || ""]);
      instData.push(["", "Litri/zi/persoana", acm.dailyLiters || ""]);
      instData.push(["Racire", "Sistem", COOLING_SYSTEMS.find(s => s.id === cooling.system)?.label || cooling.system]);
      instData.push(["", "EER nominal", cooling.eer || ""]);
      instData.push(["Ventilare", "Tip", VENTILATION_TYPES.find(s => s.id === ventilation.type)?.label || ventilation.type]);
      instData.push(["", "Debit (m3/h)", ventilation.airflow || ""]);
      instData.push(["", "Eficienta recuperare (%)", ventilation.hrEfficiency || ""]);
      instData.push(["Iluminat", "Tip", LIGHTING_TYPES.find(s => s.id === lighting.type)?.label || lighting.type]);
      instData.push(["", "Densitate putere (W/m2)", lighting.pDensity || ""]);
      instData.push(["", "LENI (kWh/m2*an)", instSummary?.leni?.toFixed(1) || ""]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instData), "Instalatii");

    // Foaie 5: Regenerabile
    const renData = [
      ["SURSE REGENERABILE"],
      [],
      ["Sursa", "Parametru", "Valoare", "Unitate"],
      ["Fotovoltaic (PV)", "Activ", photovoltaic.enabled ? "DA" : "NU", ""],
      ["", "Putere de varf (kWp)", photovoltaic.peakPower || photovoltaic.power || "", "kWp"],
      ["", "Suprafata panouri (m2)", photovoltaic.area || "", "m2"],
      ["", "Tip panouri", photovoltaic.type || "", ""],
      ["", "Productie anuala estimata", renewSummary?.qPV_kWh?.toFixed(0) || "", "kWh/an"],
      [],
      ["Solar termic", "Activ", solarThermal.enabled ? "DA" : "NU", ""],
      ["", "Suprafata colectori (m2)", solarThermal.area || "", "m2"],
      ["", "Tip colectori", solarThermal.type || "", ""],
      ["", "Productie anuala estimata", renewSummary?.qSolarTh?.toFixed(0) || "", "kWh/an"],
      [],
      ["Pompa de caldura", "Activ", heatPump.enabled ? "DA" : "NU", ""],
      ["", "Tip", heatPump.type || "", ""],
      ["", "COP nominal", heatPump.cop || "", ""],
      ["", "Energie ambiental extrasa", renewSummary?.qHP_ren?.toFixed(0) || "", "kWh/an"],
      [],
      ["Biomasa", "Activ", biomass.enabled ? "DA" : "NU", ""],
      ["", "Tip combustibil", biomass.type || "", ""],
      ["", "Putere nominala (kW)", biomass.power || "", "kW"],
      [],
      ["TOTAL REGENERABILE", "", "", ""],
      ["RER total (%)", (renewSummary?.rer || 0).toFixed(1), "", "%"],
      ["RER on-site (%)", (renewSummary?.rerOnSite || 0).toFixed(1), "", "%"],
      ["Energie regenerabila totala (kWh/an)", renewSummary?.qRen_total?.toFixed(0) || "", "", "kWh/an"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renData), "Regenerabile");

    // Foaie 6: Clasificare
    const clasifData = [
      ["CLASIFICARE ENERGETICA"],
      [],
      ["INDICATORI FINALI", "", ""],
      ["Indicator", "Valoare", "Unitate"],
      ["EP total (dupa regenerabile)", epF?.toFixed(1) || "", "kWh/(m2*an)"],
      ["EP total fara regenerabile", instSummary?.ep_total_m2?.toFixed(1) || "", "kWh/(m2*an)"],
      ["CO2 total (dupa regenerabile)", co2F?.toFixed(1) || "", "kgCO2/(m2*an)"],
      [],
      ["CLASIFICARE", "", ""],
      ["Clasa energetica EP", getEnergyClass(epF, catKey)?.cls || "", ""],
      ["Clasa CO2", getCO2Class(co2F, building.category)?.cls || "", ""],
      [],
      ["nZEB", "", ""],
      ["EP maxim nZEB (zona " + (selectedClimate?.zone || "III") + ")", getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0) || "", "kWh/(m2*an)"],
      ["RER minim nZEB (%)", (NZEB_THRESHOLDS[building.category]?.rer_min || 30) + "", "%"],
      ["RER realizat (%)", (renewSummary?.rer || 0).toFixed(1), "%"],
      ["Conformitate nZEB", (renewSummary?.rer || 0) >= (NZEB_THRESHOLDS[building.category]?.rer_min || 30) && epF <= getNzebEpMax(building.category, selectedClimate?.zone) ? "DA" : "NU", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clasifData), "Clasificare");

    // Foaie 7: Auditor
    const audData = [
      ["DATE AUDITOR SI CPE"],
      [],
      ["Camp", "Valoare"],
      ["Nume auditor energetic", auditor.name || ""],
      ["Nr. atestat", auditor.atestat || ""],
      ["Grad atestat", auditor.grade || ""],
      ["Firma / Birou", auditor.company || ""],
      ["Telefon", auditor.phone || ""],
      ["Email", auditor.email || ""],
      ["Data emitere CPE", auditor.date || ""],
      ["Valabilitate CPE (ani)", auditor.validity || 10],
      ["Nr. inregistrare CPE", auditor.cpeNumber || ""],
      ["Scopul auditului", auditor.purpose || ""],
      [],
      ["OBSERVATII"],
      [auditor.observations || ""],
      [],
      ["Data generare fisier", new Date().toLocaleDateString("ro-RO")],
      ["Versiune calculator", "Zephren Energy Calculator v3.2"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(audData), "Auditor");

    const filename = `Zephren_COMPLET_${(building.address || "proiect").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast("Export Excel complet realizat cu succes — 7 foi de calcul.", "success");
  } catch (e) {
    showToast("Eroare export Excel complet: " + e.message, "error");
  } finally { setExporting(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. EXPORT PDF NATIV — CPE 1 pagină (jsPDF dinamic)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportPDFNative(ctx) {
  const {
    building, auditor, instSummary, renewSummary, annualEnergyCost,
    selectedClimate, cooling,
    showToast, setExporting, lang,
  } = ctx;
  if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
  try {
    setExporting("pdf");
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const cls = getEnergyClass(epF, catKey);
    const co2Cls = getCO2Class(co2F, building.category);
    const rer = renewSummary?.rer || 0;
    const Au = parseFloat(building.areaUseful) || 0;
    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
    const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
    const w = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("CERTIFICAT DE PERFORMANTA ENERGETICA", w / 2, y, { align: "center" }); y += 6;
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(100);
    doc.text("conform Mc 001-2022 (Ordinul MDLPA nr. 16/2023)", w / 2, y, { align: "center" }); y += 10;

    try {
      const QRCode = await import("qrcode");
      const qrContent = `https://zephren.ro/cpe?adr=${encodeURIComponent(building.address || '')}&cls=${cls.cls}&ep=${epF.toFixed(0)}&an=${new Date().getFullYear()}`;
      const qrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, "PNG", w - 40, 10, 25, 25);
      doc.setFontSize(6); doc.setFont(undefined, "normal"); doc.setTextColor(120);
      doc.text("Scanează pentru verificare CPE", w - 27.5, 37, { align: "center" });
    } catch (qrErr) {
      console.warn("QR code generation failed:", qrErr);
    }

    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("1. Identificare cladire", 15, y); y += 2;
    doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5); doc.line(15, y, w - 15, y); y += 4;
    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Adresa", `${building.address || "-"}, ${building.city || "-"}, jud. ${building.county || "-"}`],
        ["Categorie functionala", BUILDING_CATEGORIES.find(c => c.id === building.category)?.label || building.category],
        ["An constructie / renovare", `${building.yearBuilt || "-"} / ${building.yearRenov || "-"}`],
        ["Suprafata utila incalzita", `${Au} m\u00B2`],
        ["Volum incalzit", `${building.volume || "-"} m\u00B3`],
        ["Zona climatica", `${selectedClimate?.name || "-"} - Zona ${selectedClimate?.zone || "-"} (\u03B8e = ${selectedClimate?.theta_e || "-"}\u00B0C)`],
      ],
    });
    y = doc.lastAutoTable.finalY + 8;

    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("2. Clasare energetica", 15, y); y += 2;
    doc.line(15, y, w - 15, y); y += 6;

    const hexToRgb = (h) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); return [r, g, b]; };
    const clsRgb = hexToRgb(cls.color || "#666666");
    doc.setFillColor(...clsRgb); doc.roundedRect(w / 2 - 30, y, 24, 24, 4, 4, "F");
    doc.setFontSize(22); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(cls.cls, w / 2 - 18, y + 16, { align: "center" });

    const co2Rgb = hexToRgb(co2Cls.color || "#666666");
    doc.setFillColor(...co2Rgb); doc.roundedRect(w / 2 + 6, y, 24, 24, 4, 4, "F");
    doc.setFontSize(10); doc.text("CO2", w / 2 + 18, y + 10, { align: "center" });
    doc.setFontSize(16); doc.text(co2Cls.cls, w / 2 + 18, y + 20, { align: "center" });
    y += 30;

    doc.setTextColor(0); doc.setFontSize(14); doc.setFont(undefined, "bold");
    doc.text(`${epF.toFixed(1)}`, 40, y, { align: "center" });
    doc.text(`${co2F.toFixed(1)}`, w / 2, y, { align: "center" });
    doc.text(`${rer.toFixed(0)}%`, w - 40, y, { align: "center" }); y += 4;
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(100);
    doc.text("kWh/(m\u00B2\u00B7an) EP", 40, y, { align: "center" });
    doc.text("kgCO\u2082/(m\u00B2\u00B7an)", w / 2, y, { align: "center" });
    doc.text(`RER (min ${nzeb.rer_min}%)`, w - 40, y, { align: "center" }); y += 6;

    doc.setFontSize(9); doc.setFont(undefined, "bold");
    if (isNZEB) { doc.setTextColor(21, 87, 36); doc.text("\u2713 nZEB CONFORM", w / 2, y, { align: "center" }); }
    else { doc.setTextColor(114, 28, 36); doc.text("\u2717 nZEB NECONFORM", w / 2, y, { align: "center" }); }
    y += 3;
    doc.setTextColor(40, 53, 147); doc.setFont(undefined, "normal"); doc.setFontSize(8);
    doc.text(`Nota: ${cls.score}/100`, w / 2, y, { align: "center" }); y += 8;

    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("3. Consum si costuri", 15, y); y += 2;
    doc.line(15, y, w - 15, y); y += 4;
    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      head: [["Utilitate", "Energie finala [kWh/an]", "Energie primara [kWh/an]"]],
      headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      body: [
        ["Incalzire", instSummary.qf_h?.toFixed(0) || "-", instSummary.ep_h?.toFixed(0) || "-"],
        ["Apa calda", instSummary.qf_w?.toFixed(0) || "-", instSummary.ep_w?.toFixed(0) || "-"],
        ["Climatizare", instSummary.qf_c?.toFixed(0) || "-", instSummary.ep_c?.toFixed(0) || "-"],
        ["Ventilare", instSummary.qf_v?.toFixed(0) || "-", instSummary.ep_v?.toFixed(0) || "-"],
        ["Iluminat", instSummary.qf_l?.toFixed(0) || "-", instSummary.ep_l?.toFixed(0) || "-"],
      ],
      foot: [["TOTAL", instSummary.qf_total?.toFixed(0) || "-", (renewSummary?.ep_adjusted || instSummary.ep_total || 0).toFixed(0)]],
      footStyles: { fillColor: [240, 244, 248], fontStyle: "bold", fontSize: 8 },
    });
    y = doc.lastAutoTable.finalY + 4;
    if (annualEnergyCost) {
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont(undefined, "normal");
      doc.text(`Cost anual estimat: ${annualEnergyCost.total?.toLocaleString("ro-RO")} lei/an (~${annualEnergyCost.totalEur?.toLocaleString("ro-RO")} EUR/an)`, 15, y);
      y += 6;
    }

    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("4. Date auditor", 15, y); y += 2;
    doc.line(15, y, w - 15, y); y += 4;
    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [26, 26, 46], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Auditor energetic", auditor.name || "-"],
        ["Nr. atestat / Grad", `${auditor.atestat || "-"} / Grad ${auditor.grade || "-"}`],
        ["Firma", auditor.company || "-"],
        ["Data elaborarii", auditor.date || "-"],
        ["Scop CPE", auditor.scopCpe || "-"],
        ["Valabilitate", `${auditor.validityYears || "10"} ani`],
      ],
    });

    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Generat cu Zephren v3.1 | Mc 001-2022, ISO 52000-1/NA:2023, EPBD 2024/1275 | ${new Date().toLocaleDateString("ro-RO")}`, w / 2, 285, { align: "center" });

    const filename = `CPE_${(building.address || "certificat").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    showToast((lang === "EN" ? "PDF generated: " : "PDF generat: ") + filename, "success");
  } catch (e) {
    showToast("Eroare generare PDF: " + e.message, "error");
    console.error("PDF export error:", e);
  } finally { setExporting(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. EXPORT QUICK SHEET — fișă sintetică 1 pagină client-friendly (jsPDF)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportQuickSheet(ctx) {
  const {
    building, auditor, instSummary, renewSummary, annualEnergyCost,
    rehabComparison, selectedClimate, cooling,
    showToast, setExporting,
  } = ctx;
  if (!instSummary) { showToast("Completați calculul (Pasul 5)", "error"); return; }
  try {
    setExporting("pdf_quick");
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const cls = getEnergyClass(epF, catKey);
    const co2Cls = getCO2Class(co2F, building.category);
    const rer = renewSummary?.rer || 0;
    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
    const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
    const hexToRgb = (h2) => { const r = parseInt(h2.slice(1, 3), 16), g = parseInt(h2.slice(3, 5), 16), b = parseInt(h2.slice(5, 7), 16); return [r, g, b]; };

    let y = 0;
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, w, 22, "F");
    doc.setFontSize(18); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text("ZEPHREN", 15, 13);
    doc.setFontSize(10); doc.setFont(undefined, "normal");
    doc.text("Fișă energetică rezumativă", 15, 19);
    doc.setFontSize(8); doc.setTextColor(180, 210, 255);
    doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, w - 15, 19, { align: "right" });
    y = 28;

    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text(`${building.address || "—"}, ${building.city || "—"}, jud. ${building.county || "—"}`, 15, y); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(80);
    const auditorName = auditor?.name || auditor?.firstName ? `${auditor.firstName || ""} ${auditor.lastName || ""}`.trim() : "";
    if (auditorName) { doc.text(`Auditor energetic: ${auditorName}`, 15, y); y += 5; }
    y += 2;

    const clsRgb = hexToRgb(cls.color || "#666666");
    doc.setFillColor(...clsRgb);
    doc.roundedRect(15, y, 38, 38, 5, 5, "F");
    doc.setFontSize(32); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(cls.cls, 34, y + 24, { align: "center" });
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text("Clasă EP", 34, y + 34, { align: "center" });

    const co2Rgb = hexToRgb(co2Cls.color || "#666666");
    doc.setFillColor(...co2Rgb);
    doc.roundedRect(58, y, 32, 32, 5, 5, "F");
    doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(co2Cls.cls, 74, y + 18, { align: "center" });
    doc.setFontSize(7); doc.setFont(undefined, "normal");
    doc.text("Clasă CO₂", 74, y + 27, { align: "center" });

    const nzebColor = isNZEB ? [21, 128, 61] : [185, 28, 28];
    doc.setFillColor(...nzebColor);
    doc.roundedRect(95, y, 50, 18, 3, 3, "F");
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(isNZEB ? "✓ nZEB CONFORM" : "✗ nZEB NECONFORM", 120, y + 11, { align: "center" });
    y += 44;

    doc.setFillColor(240, 244, 248);
    doc.rect(15, y, w - 30, 36, "F");
    const costAnual = annualEnergyCost?.total || 0;
    const kpis = [
      { label: "EP [kWh/(m²·an)]", value: epF.toFixed(1) },
      { label: "CO₂ [kg/(m²·an)]", value: co2F.toFixed(1) },
      { label: "Cost anual [lei]", value: costAnual > 0 ? costAnual.toLocaleString("ro-RO") : "—" },
      { label: "RER [%]", value: rer.toFixed(1) + "%" },
    ];
    const colW = (w - 30) / 2;
    kpis.forEach((kpi, i) => {
      const kx = 15 + (i % 2) * colW + colW / 2;
      const ky = y + 10 + Math.floor(i / 2) * 18;
      doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
      doc.text(kpi.value, kx, ky, { align: "center" });
      doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(100);
      doc.text(kpi.label, kx, ky + 5, { align: "center" });
    });
    y += 42;

    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("Distribuție consum pe utilități", 15, y); y += 5;
    const utilColors = {
      incalzire: [239, 68, 68], acm: [249, 115, 22],
      racire: [59, 130, 246], ventilare: [34, 197, 94], iluminat: [234, 179, 8],
    };
    const utilLabels = {
      incalzire: "Încălzire", acm: "ACM",
      racire: "Răcire", ventilare: "Ventilare", iluminat: "Iluminat",
    };
    const utilVals = {
      incalzire: instSummary.q_heating_m2 || 0,
      acm: instSummary.q_acm_m2 || 0,
      racire: instSummary.q_cooling_m2 || 0,
      ventilare: instSummary.q_vent_m2 || 0,
      iluminat: instSummary.q_light_m2 || 0,
    };
    const totalUtil = Object.values(utilVals).reduce((s, v) => s + v, 0) || 1;
    const barMaxW = w - 70;
    Object.entries(utilVals).forEach(([key, val]) => {
      if (val <= 0) return;
      const barW = (val / totalUtil) * barMaxW;
      doc.setFillColor(...(utilColors[key] || [100, 100, 100]));
      doc.rect(35, y, barW, 5, "F");
      doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(60);
      doc.text(utilLabels[key], 15, y + 4);
      doc.text(`${val.toFixed(1)} kWh/m²`, 35 + barW + 2, y + 4);
      y += 8;
    });
    y += 4;

    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
    doc.text("Top recomandări de îmbunătățire", 15, y); y += 5;
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y, w - 30, 28, "F");
    const recList = rehabComparison?.measures?.slice(0, 3) || [];
    if (recList.length > 0) {
      recList.forEach((rec, i) => {
        doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(0, 51, 102);
        doc.text(`${i + 1}.`, 18, y + 6 + i * 9);
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        const recText = rec.name || rec.label || rec.desc || "Măsură de reabilitare";
        doc.text(recText.slice(0, 70), 24, y + 6 + i * 9);
      });
    } else {
      doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(80);
      doc.text("1. Îmbunătățire izolație termică anvelopă (pereți, acoperiș, planșeu)", 18, y + 6);
      doc.text("2. Înlocuire tâmplărie exterioară cu profile triple Low-E", 18, y + 15);
      doc.text("3. Instalare sistem HVAC eficient + recuperare căldură ventilare", 18, y + 22);
    }
    y += 34;

    doc.setFillColor(0, 51, 102);
    doc.rect(0, h - 10, w, 10, "F");
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(180, 210, 255);
    doc.text(`Zephren v3.2 | Generat la ${new Date().toLocaleDateString("ro-RO")} | Date cu caracter informativ`, w / 2, h - 4, { align: "center" });

    const filename = `Fisa_Sintetica_${(building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    showToast("Fișă sintetică generată: " + filename, "success");
  } catch (e) {
    showToast("Eroare generare fișă: " + e.message, "error");
    console.error("QuickSheet export error:", e);
  } finally { setExporting(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. EXPORT FULL REPORT — raport tehnic multi-pagini (jsPDF + autotable)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportFullReport(ctx) {
  const {
    building, auditor, instSummary, renewSummary, annualEnergyCost, selectedClimate,
    opaqueElements, glazingElements, thermalBridges, envelopeSummary,
    heating, cooling, ventilation, solarThermal, photovoltaic, heatPump, biomass,
    monthlyISO, rehabComparison, financialAnalysis, buildingPhotos,
    showToast, setExporting, calcOpaqueR,
  } = ctx;
  if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
  try {
    setExporting("pdf_full");
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    let y = 0;
    const BLUE = [0, 51, 102];
    const GRAY = [100, 100, 100];
    const LGRAY = [240, 244, 248];
    const Au = parseFloat(building.areaUseful) || 1;
    const V = parseFloat(building.volume) || 1;
    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const cls = getEnergyClass(epF, catKey);
    const co2Cls = getCO2Class(co2F, building.category);
    const rer = renewSummary?.rer || 0;
    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
    const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
    const hexToRgb = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return [r, g, b]; };

    const addPageHeader = (pageNum, title) => {
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, w, 10, "F");
      doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
      doc.text("ZEPHREN — Raport Tehnic de Performanță Energetică", 8, 6.5);
      doc.text(`Pag. ${pageNum}`, w - 8, 6.5, { align: "right" });
      doc.setTextColor(0); doc.setFont(undefined, "normal");
      y = 16;
      if (title) {
        doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text(title, 15, y); y += 2;
        doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(15, y, w - 15, y); y += 6;
        doc.setFont(undefined, "normal"); doc.setTextColor(0);
      }
    };

    const addPageFooter = () => {
      doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(`Zephren v3.2 | Mc 001-2022, ISO 52000-1/NA:2023, EPBD 2024/1275 | ${new Date().toLocaleDateString("ro-RO")}`, w / 2, h - 5, { align: "center" });
    };

    // ── PAGINA 1: COPERTĂ ──────────────────────────────────────────
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, w, 60, "F");
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(180, 200, 220);
    doc.text("RAPORT TEHNIC DE PERFORMANȚĂ ENERGETICĂ", w / 2, 20, { align: "center" });
    doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text("Zephren Energy Report", w / 2, 33, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(180, 200, 220);
    doc.text("conform Mc 001-2022 | ISO 52000-1/NA:2023 | EPBD 2024/1275", w / 2, 42, { align: "center" });

    const clsRgb = hexToRgb(cls.color || "#666666");
    doc.setFillColor(...clsRgb);
    doc.roundedRect(w / 2 - 16, 50, 32, 20, 4, 4, "F");
    doc.setFontSize(18); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text("Clasa " + cls.cls, w / 2, 64, { align: "center" });

    y = 80;
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
    doc.text("Clădire:", 15, y); y += 6;
    doc.setFont(undefined, "normal"); doc.setFontSize(9); doc.setTextColor(0);
    const bldgLines = [
      building.address ? `Adresă: ${building.address}, ${building.city || ""}, jud. ${building.county || ""}` : "Adresă: —",
      `Categorie: ${BUILDING_CATEGORIES.find(c => c.id === building.category)?.label || building.category}`,
      `An construcție: ${building.yearBuilt || "—"} | Renovare: ${building.yearRenov || "—"}`,
      `Suprafață utilă: ${Au} m²  |  Volum: ${V} m³`,
      `Zonă climatică: ${selectedClimate?.name || "—"} — Zona ${selectedClimate?.zone || "—"} (θe = ${selectedClimate?.theta_e || "—"}°C)`,
    ];
    bldgLines.forEach(l => { doc.text(l, 20, y); y += 5; });

    y += 4;
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
    doc.text("Auditor energetic:", 15, y); y += 6;
    doc.setFont(undefined, "normal"); doc.setFontSize(9); doc.setTextColor(0);
    const audLines = [
      `Nume: ${auditor.name || "—"}  |  Atestat: ${auditor.atestat || "—"} / Grad ${auditor.grade || "—"}`,
      `Firmă: ${auditor.company || "—"}`,
      `Data elaborării: ${auditor.date || new Date().toLocaleDateString("ro-RO")}  |  Valabilitate: ${auditor.validityYears || 10} ani`,
    ];
    audLines.forEach(l => { doc.text(l, 20, y); y += 5; });

    y += 8;
    doc.setFillColor(...LGRAY); doc.rect(15, y, w - 30, 28, "F");
    doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
    doc.text("INDICATORI CHEIE", w / 2, y + 6, { align: "center" }); y += 10;
    const kpis = [
      [`EP: ${epF.toFixed(1)} kWh/(m²·an)`, "Energie primară"],
      [`CO₂: ${co2F.toFixed(1)} kg/(m²·an)`, "Emisii CO₂"],
      [`RER: ${rer.toFixed(0)}%`, "Surse regenerabile"],
      [`Ef: ${instSummary.qf_total_m2?.toFixed(1)} kWh/(m²·an)`, "Energie finală"],
      [`G: ${envelopeSummary?.G?.toFixed(3)} W/(m³·K)`, "Coef. global pierderi"],
      [isNZEB ? "✓ nZEB" : "✗ non-nZEB", "Cerință EPBD"],
    ];
    kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const xk = 22 + col * 58;
      const yk = y + row * 10;
      doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(0);
      doc.text(kpi[0], xk, yk);
      doc.setFont(undefined, "normal"); doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(kpi[1], xk, yk + 3.5);
    });
    addPageFooter();

    // ── PAGINA 2: ANVELOPĂ ────────────────────────────────────────
    doc.addPage();
    addPageHeader(2, "1. Anvelopă clădire — elemente opace și vitrate");

    if (opaqueElements.length > 0) {
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("1.1 Elemente opace", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Element", "Tip", "Suprafață [m²]", "U [W/(m²·K)]", "Pierderi [W/K]"]],
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        body: opaqueElements.map(el => {
          const { u } = calcOpaqueR(el.layers, el.type);
          const area = parseFloat(el.area) || 0;
          return [el.name || el.type, el.type, area.toFixed(1), u.toFixed(3), (area * u).toFixed(1)];
        }),
        foot: [["TOTAL", "", opaqueElements.reduce((s, e) => s + (parseFloat(e.area) || 0), 0).toFixed(1), "—",
          opaqueElements.reduce((s, e) => { const { u } = calcOpaqueR(e.layers, e.type); return s + (parseFloat(e.area) || 0) * u; }, 0).toFixed(1)]],
        footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (glazingElements.length > 0) {
      if (y > h - 60) { doc.addPage(); addPageHeader(2, ""); }
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("1.2 Elemente vitrate", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Element", "Orientare", "Suprafață [m²]", "Uw [W/(m²·K)]", "g [-]", "Pierderi [W/K]"]],
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        body: glazingElements.map(el => [
          el.name || "Geam", el.orientation || "S",
          (parseFloat(el.area) || 0).toFixed(1),
          (parseFloat(el.u) || 0).toFixed(2),
          (parseFloat(el.g) || 0).toFixed(2),
          ((parseFloat(el.area) || 0) * (parseFloat(el.u) || 0)).toFixed(1),
        ]),
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (thermalBridges.length > 0) {
      if (y > h - 50) { doc.addPage(); addPageHeader(2, ""); }
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("1.3 Punți termice liniare", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Descriere", "Tip", "Lungime [m]", "ψ [W/(m·K)]", "L·ψ [W/K]"]],
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        body: thermalBridges.map(tb => [
          tb.desc || tb.cat || "PT",
          tb.cat || "—",
          (parseFloat(tb.length) || 0).toFixed(1),
          (parseFloat(tb.psi) || 0).toFixed(3),
          ((parseFloat(tb.length) || 0) * (parseFloat(tb.psi) || 0)).toFixed(2),
        ]),
        foot: [["TOTAL", "", thermalBridges.reduce((s, t) => s + (parseFloat(t.length) || 0), 0).toFixed(1), "—",
          thermalBridges.reduce((s, t) => s + (parseFloat(t.length) || 0) * (parseFloat(t.psi) || 0), 0).toFixed(2)]],
        footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (envelopeSummary) {
      if (y > h - 30) { doc.addPage(); addPageHeader(2, ""); }
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("1.4 Sumar anvelopă", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Suprafață totală anvelopă", `${envelopeSummary.totalArea?.toFixed(1) || "—"} m²`],
          ["Pierderi transmisie (H_tr)", `${envelopeSummary.totalHeatLoss?.toFixed(2) || "—"} W/K`],
          ["Coeficient global pierderi G", `${envelopeSummary.G?.toFixed(4) || "—"} W/(m³·K)`],
          ["Raport A/V", `${envelopeSummary.AV?.toFixed(3) || (envelopeSummary.totalArea / V).toFixed(3)} m⁻¹`],
        ],
      });
      y = doc.lastAutoTable.finalY;
    }
    addPageFooter();

    // ── PAGINA 3: CALCUL TERMIC ───────────────────────────────────
    doc.addPage();
    addPageHeader(3, "2. Calcul termic — pierderi, câștiguri, bilanț energetic");

    if (monthlyISO && monthlyISO.length === 12) {
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("2.1 Bilanț termic lunar (ISO 13790)", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Lună", "T ext [°C]", "Q pierderi [kWh]", "Q aporturi [kWh]", "Q încălzire [kWh]", "Q răcire [kWh]", "η_H"]],
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        body: monthlyISO.map(m => [
          m.name || "—",
          m.tExt?.toFixed(1) ?? "—",
          m.Q_loss?.toFixed(0) ?? "—",
          m.Q_gain?.toFixed(0) ?? "—",
          m.qH_nd?.toFixed(0) ?? "—",
          m.qC_nd?.toFixed(0) ?? "—",
          m.eta_H?.toFixed(3) ?? "—",
        ]),
        foot: [["ANUAL", "—",
          monthlyISO.reduce((s, m) => s + (m.Q_loss || 0), 0).toFixed(0),
          monthlyISO.reduce((s, m) => s + (m.Q_gain || 0), 0).toFixed(0),
          monthlyISO.reduce((s, m) => s + (m.qH_nd || 0), 0).toFixed(0),
          monthlyISO.reduce((s, m) => s + (m.qC_nd || 0), 0).toFixed(0),
          "—",
        ]],
        footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7 },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (y > h - 55) { doc.addPage(); addPageHeader(3, ""); }
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
    doc.text("2.2 Parametri clădire și climă", 15, y); y += 4;
    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
      body: [
        ["Temperatură interioară de calcul θint", `${heating.theta_int || 20} °C`],
        ["Temperatură exterioară de proiectare θe", `${selectedClimate?.theta_e ?? "—"} °C`],
        ["Rata ventilare n50 (test Blower Door)", `${building.n50 || "—"} h⁻¹`],
        ["Rata schimb aer (ventilare mecanică)", `${ventilation?.ach || "—"} h⁻¹`],
        ["Temperatură medie anuală", `${selectedClimate?.theta_a ?? "—"} °C`],
        ["Grad-zile încălzire (HDD)", `${selectedClimate?.HDD ?? "—"} °C·zile`],
        ["Iradianță orizontală anuală", `${selectedClimate?.Gh ?? "—"} kWh/m²/an`],
      ],
    });
    y = doc.lastAutoTable.finalY;
    addPageFooter();

    // ── PAGINA 4: INSTALAȚII ──────────────────────────────────────
    doc.addPage();
    addPageHeader(4, "3. Instalații energetice — consumuri per utilitate");

    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      head: [["Utilitate", "Energie finală [kWh/an]", "kWh/(m²·an)", "Energie primară [kWh/an]", "kWh/(m²·an)", "CO₂ [kgCO₂/an]"]],
      headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      body: [
        ["Încălzire", instSummary.qf_h?.toFixed(0) || "0", (instSummary.qf_h / Au)?.toFixed(1) || "0", instSummary.ep_h?.toFixed(0) || "0", (instSummary.ep_h / Au)?.toFixed(1) || "0", instSummary.co2_h?.toFixed(0) || "0"],
        ["Apă caldă", instSummary.qf_w?.toFixed(0) || "0", (instSummary.qf_w / Au)?.toFixed(1) || "0", instSummary.ep_w?.toFixed(0) || "0", (instSummary.ep_w / Au)?.toFixed(1) || "0", instSummary.co2_w?.toFixed(0) || "0"],
        ["Climatizare", instSummary.qf_c?.toFixed(0) || "0", (instSummary.qf_c / Au)?.toFixed(1) || "0", instSummary.ep_c?.toFixed(0) || "0", (instSummary.ep_c / Au)?.toFixed(1) || "0", instSummary.co2_c?.toFixed(0) || "0"],
        ["Ventilare", instSummary.qf_v?.toFixed(0) || "0", (instSummary.qf_v / Au)?.toFixed(1) || "0", instSummary.ep_v?.toFixed(0) || "0", (instSummary.ep_v / Au)?.toFixed(1) || "0", instSummary.co2_v?.toFixed(0) || "0"],
        ["Iluminat", instSummary.qf_l?.toFixed(0) || "0", (instSummary.qf_l / Au)?.toFixed(1) || "0", instSummary.ep_l?.toFixed(0) || "0", (instSummary.ep_l / Au)?.toFixed(1) || "0", instSummary.co2_l?.toFixed(0) || "0"],
      ],
      foot: [["TOTAL",
        instSummary.qf_total?.toFixed(0) || "0", (instSummary.qf_total_m2)?.toFixed(1) || "0",
        (renewSummary?.ep_adjusted || instSummary.ep_total || 0).toFixed(0),
        epF.toFixed(1),
        (renewSummary?.co2_adjusted || instSummary.co2_total || 0).toFixed(0),
      ]],
      footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
    });
    y = doc.lastAutoTable.finalY + 5;

    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
    doc.text("3.1 Parametri sistem încălzire", 15, y); y += 4;
    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
      body: [
        ["Tip sistem încălzire", heating.type || "—"],
        ["Eficiență generare ηgen", heating.etaGen ? (heating.etaGen * 100).toFixed(0) + " %" : "—"],
        ["Eficiență distribuție ηdist", heating.etaDist ? (heating.etaDist * 100).toFixed(0) + " %" : "—"],
        ["Eficiență emisie ηemit", heating.etaEmit ? (heating.etaEmit * 100).toFixed(0) + " %" : "—"],
        ["Factor primar fp", heating.fp || "—"],
        ["Factor emisie CO₂", heating.fCO2 || "—"],
      ].filter(r => r[1] !== "—"),
    });
    y = doc.lastAutoTable.finalY + 3;

    if (annualEnergyCost) {
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("3.2 Costuri energetice anuale estimate", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Cost total anual", `${annualEnergyCost.total?.toLocaleString("ro-RO") || "—"} lei/an`],
          ["Echivalent EUR", `~${annualEnergyCost.totalEur?.toLocaleString("ro-RO") || "—"} EUR/an`],
          ["Cost pe m² util", `${annualEnergyCost.perM2 ? (annualEnergyCost.perM2).toFixed(1) : "—"} lei/(m²·an)`],
        ],
      });
      y = doc.lastAutoTable.finalY;
    }
    addPageFooter();

    // ── PAGINA 5: SURSE REGENERABILE ─────────────────────────────
    doc.addPage();
    addPageHeader(5, "4. Surse regenerabile de energie");

    const hasPV = parseFloat(photovoltaic?.power) > 0;
    const hasSolarT = parseFloat(solarThermal?.area) > 0;
    const hasHP = heatPump?.enabled;
    const hasBiomass = biomass?.enabled;

    if (renewSummary) {
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        head: [["Sursă", "Producție [kWh/an]", "kWh/(m²·an)", "Contribuție RER [%]"]],
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        body: [
          hasPV && ["Fotovoltaic (PV)", renewSummary.e_pv?.toFixed(0) || "0", ((renewSummary.e_pv || 0) / Au).toFixed(1), "—"],
          hasSolarT && ["Solar termic ACM", renewSummary.e_solar_acm?.toFixed(0) || "0", ((renewSummary.e_solar_acm || 0) / Au).toFixed(1), "—"],
          hasHP && ["Pompă de căldură", renewSummary.e_hp?.toFixed(0) || "0", ((renewSummary.e_hp || 0) / Au).toFixed(1), "—"],
          hasBiomass && ["Biomasă", renewSummary.e_biomass?.toFixed(0) || "0", ((renewSummary.e_biomass || 0) / Au).toFixed(1), "—"],
        ].filter(Boolean),
        foot: [["TOTAL RER", renewSummary.totalRenew?.toFixed(0) || "0", ((renewSummary.totalRenew || 0) / Au).toFixed(1), rer.toFixed(1) + "%"]],
        footStyles: { fillColor: LGRAY, fontStyle: "bold", fontSize: 7.5 },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    if (hasPV) {
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("4.1 Sistem fotovoltaic (GP 123/2004)", 15, y); y += 4;
      const pvProd = renewSummary?.pv_production;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Putere instalată Ppv", `${photovoltaic.power} kWp`],
          ["Suprafață panouri", `${photovoltaic.area || (parseFloat(photovoltaic.power) / 0.20).toFixed(1)} m²`],
          ["Orientare", photovoltaic.orientation || "S"],
          ["Eficiență modul", `${((parseFloat(photovoltaic.eta) || 0.20) * 100).toFixed(0)} %`],
          ["Putere invertor", `${photovoltaic.invPower || (parseFloat(photovoltaic.power) * 0.95).toFixed(1)} kW`],
          pvProd && ["Producție anuală estimată", `${pvProd.E_annual?.toLocaleString()} kWh/an`],
          pvProd && ["Producție specifică", `${pvProd.specific_yield} kWh/kWp·an`],
        ].filter(Boolean),
      });
      y = doc.lastAutoTable.finalY + 3;
    }

    if (hasSolarT) {
      if (y > h - 40) { doc.addPage(); addPageHeader(5, ""); }
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
      doc.text("4.2 Solar termic ACM", 15, y); y += 4;
      doc.autoTable({
        startY: y, margin: { left: 15, right: 15 }, theme: "grid",
        headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
        body: [
          ["Suprafață colectori", `${solarThermal.area} m²`],
          ["Tip colector", solarThermal.type || "—"],
          ["Fracție solară anuală", renewSummary?.fSolar ? `${(renewSummary.fSolar * 100).toFixed(0)} %` : "—"],
        ],
      });
      y = doc.lastAutoTable.finalY;
    }
    addPageFooter();

    // ── PAGINA 6: CLASIFICARE ENERGETICĂ ─────────────────────────
    doc.addPage();
    addPageHeader(6, "5. Clasificare energetică — Mc 001-2022");

    doc.setFontSize(9); doc.setTextColor(0); doc.setFont(undefined, "normal");
    doc.text("Clasare conform metodologiei Mc 001-2022 (Ordinul MDLPA nr. 16/2023) și ISO 52000-1/NA:2023", 15, y); y += 8;

    const clsRgb2 = hexToRgb(cls.color || "#666666");
    doc.setFillColor(...clsRgb2); doc.roundedRect(w / 2 - 35, y, 30, 28, 4, 4, "F");
    doc.setFontSize(22); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(cls.cls, w / 2 - 20, y + 18, { align: "center" });
    doc.setFontSize(8); doc.text("EP", w / 2 - 20, y + 25, { align: "center" });

    const co2Rgb2 = hexToRgb(co2Cls.color || "#666666");
    doc.setFillColor(...co2Rgb2); doc.roundedRect(w / 2 + 5, y, 30, 28, 4, 4, "F");
    doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(co2Cls.cls, w / 2 + 20, y + 15, { align: "center" });
    doc.setFontSize(8); doc.text("CO₂", w / 2 + 20, y + 24, { align: "center" });
    y += 34;

    doc.setFontSize(9); doc.setFont(undefined, "bold");
    doc.setTextColor(isNZEB ? 21 : 114, isNZEB ? 87 : 28, isNZEB ? 36 : 36);
    doc.text(isNZEB ? "✓ CONFORM nZEB" : "✗ NECONFORM nZEB", w / 2, y, { align: "center" }); y += 8;

    doc.autoTable({
      startY: y, margin: { left: 15, right: 15 }, theme: "grid",
      headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
      body: [
        ["Energie primară EP [kWh/(m²·an)]", `${epF.toFixed(1)} — Clasă ${cls.cls}`],
        ["CO₂ specific [kgCO₂/(m²·an)]", `${co2F.toFixed(1)} — Clasă CO₂: ${co2Cls.cls}`],
        ["Energie finală Ef [kWh/(m²·an)]", `${instSummary.qf_total_m2?.toFixed(1)}`],
        ["Cotă surse regenerabile RER", `${rer.toFixed(1)} % (minim nZEB: ${nzeb.rer_min} %)`],
        ["Prag nZEB-EP pentru zonă/categorie", `${getNzebEpMax(building.category, selectedClimate?.zone)?.toFixed(0) || "—"} kWh/(m²·an)`],
        ["Scor energetic", `${cls.score || "—"} / 100`],
        ["Eticheta energetică", cls.cls + (isNZEB ? " (nZEB)" : "")],
      ],
    });
    y = doc.lastAutoTable.finalY;
    addPageFooter();

    // ── PAGINA 7: RECOMANDĂRI ─────────────────────────────────────
    if (rehabComparison || (financialAnalysis)) {
      doc.addPage();
      addPageHeader(7, "6. Scenariu de reabilitare și analiză financiară");

      if (rehabComparison) {
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          head: [["Indicator", "Stare actuală", "Stare reabilitată", "Economie"]],
          headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 },
          body: [
            ["EP [kWh/(m²·an)]",
              rehabComparison.before?.ep?.toFixed(1) || "—",
              rehabComparison.after?.ep?.toFixed(1) || "—",
              rehabComparison.delta?.ep ? rehabComparison.delta.ep.toFixed(1) + " kWh/(m²·an)" : "—"
            ],
            ["Clasă energetică",
              rehabComparison.before?.cls || "—",
              rehabComparison.after?.cls || "—",
              rehabComparison.before?.cls !== rehabComparison.after?.cls ? `${rehabComparison.before?.cls} → ${rehabComparison.after?.cls}` : "Idem"
            ],
            ["Cost anual energie [lei/an]",
              rehabComparison.before?.cost?.toLocaleString("ro-RO") || "—",
              rehabComparison.after?.cost?.toLocaleString("ro-RO") || "—",
              rehabComparison.delta?.cost ? rehabComparison.delta.cost.toLocaleString("ro-RO") + " lei/an" : "—"
            ],
          ],
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (financialAnalysis) {
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text("6.1 Analiză financiară reabilitare", 15, y); y += 4;
        doc.autoTable({
          startY: y, margin: { left: 15, right: 15 }, theme: "grid",
          headStyles: { fillColor: LGRAY, textColor: [26, 26, 46], fontStyle: "bold", fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5 }, columnStyles: { 0: { cellWidth: 90 } },
          body: [
            ["Investiție totală estimată", `${financialAnalysis.investitie?.toLocaleString("ro-RO") || "—"} lei`],
            ["Economie anuală energie", `${financialAnalysis.economieAnuala?.toLocaleString("ro-RO") || "—"} lei/an`],
            ["Perioadă simplă de recuperare (PBP)", `${financialAnalysis.pbp?.toFixed(1) || "—"} ani`],
            ["VAN (25 ani, rata 5%)", `${financialAnalysis.npv?.toLocaleString("ro-RO") || "—"} lei`],
            ["Rată internă de rentabilitate IRR", `${financialAnalysis.irr ? (financialAnalysis.irr * 100).toFixed(1) + " %" : "—"}`],
            ["Eligibil PNRR/Casa Verde", financialAnalysis.eligibil ? "Da" : "Nu"],
          ].filter(r => r[1] !== "—"),
        });
        y = doc.lastAutoTable.finalY;
      }
      addPageFooter();
    }

    // ── PAGINA FOTOGRAFII (opțional) ─────────────────────────────
    if (buildingPhotos && buildingPhotos.length > 0) {
      doc.addPage();
      const pageNum = doc.getNumberOfPages();
      addPageHeader(pageNum, "7. Documentare fotografică");
      const catLabels = { exterior: "Exterior", interior: "Interior", ir: "Termoviziune IR", instalatii: "Instalații", defecte: "Defecte", altele: "Altele" };
      const grouped = {};
      buildingPhotos.forEach(p => {
        const cat = p.zone || "altele";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
      });
      for (const [cat, photos] of Object.entries(grouped)) {
        if (y > h - 50) { doc.addPage(); addPageHeader(doc.getNumberOfPages(), ""); }
        doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...BLUE);
        doc.text((catLabels[cat] || cat) + ` (${photos.length})`, 15, y); y += 4;
        const imgW = 55; const imgH = 38; const cols = 3; const gap = 5;
        photos.forEach((ph, i) => {
          if (y + imgH + 10 > h - 12) { doc.addPage(); addPageHeader(doc.getNumberOfPages(), ""); }
          const col = i % cols;
          const xImg = 15 + col * (imgW + gap);
          if (col === 0 && i > 0) y += imgH + 8;
          try {
            doc.addImage(ph.url, "JPEG", xImg, y, imgW, imgH, undefined, "MEDIUM");
          } catch (e) { /* skip unreadable image */ }
          if (ph.label) {
            doc.setFontSize(6); doc.setFont(undefined, "normal"); doc.setTextColor(...GRAY);
            doc.text(ph.label.slice(0, 30), xImg + imgW / 2, y + imgH + 2, { align: "center" });
          }
          if (col === cols - 1 || i === photos.length - 1) { y += imgH + 8; }
        });
        y += 4;
        addPageFooter();
      }
    }

    const finalPage = doc.getNumberOfPages();
    doc.setPage(finalPage);
    const ySign = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 230;
    doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
    doc.line(15, ySign, 85, ySign);
    doc.line(w - 85, ySign, w - 15, ySign);
    doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text("Semnătură auditor", 50, ySign + 4, { align: "center" });
    doc.text("Ștampilă / Dată", w - 50, ySign + 4, { align: "center" });

    const filename = `Zephren_Raport_Tehnic_${(building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    showToast(`Raport tehnic complet generat (${doc.getNumberOfPages()} pagini)`, "success");
  } catch (e) {
    showToast("Eroare generare raport: " + e.message, "error");
    console.error("Full report export error:", e);
  } finally { setExporting(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. EXPORT BULK PROJECTS — arhivă JSON cu toate proiectele salvate
// ═══════════════════════════════════════════════════════════════════════════
export function exportBulkProjects(ctx) {
  const { projectList, showToast } = ctx;
  if (!projectList.length) { showToast("Niciun proiect salvat pentru export bulk.", "error"); return; }
  const allProjects = [];
  projectList.forEach(p => {
    try {
      const raw = window.storage?.getItem ? window.storage.getItem("project_" + p.id) : localStorage.getItem("zephren_project_" + p.id);
      if (raw) allProjects.push({ id: p.id, name: p.name, date: p.date, data: JSON.parse(raw) });
    } catch (e) { /* skip corrupted */ }
  });
  const blob = new Blob([JSON.stringify({ format: "zephren-bulk", version: "3.0", exportDate: new Date().toISOString(), projects: allProjects }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Zephren_BULK_${allProjects.length}proiecte_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
  showToast(`${allProjects.length} proiecte exportate`, "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. GENERATE AUDIT REPORT — raport text (.txt) simplificat
// ═══════════════════════════════════════════════════════════════════════════
export function generateAuditReport(ctx) {
  const {
    building, auditor, instSummary, renewSummary, annualEnergyCost,
    envelopeSummary, airInfiltrationCalc, naturalLightingCalc, gwpDetailed,
    smartSuggestions, selectedClimate, cooling,
    showToast,
  } = ctx;
  if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
  const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
  const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
  const catKey = buildCatKey(building.category, cooling.hasCooling);
  const cls = getEnergyClass(epF, catKey);
  const rer = renewSummary?.rer || 0;
  const Au = parseFloat(building.areaUseful) || 0;
  const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
  const isNZEB = epF <= getNzebEpMax(building.category, selectedClimate?.zone) && rer >= nzeb.rer_min;
  const catLabel = BUILDING_CATEGORIES.find(c => c.id === building.category)?.label || building.category;

  const lines = [];
  lines.push("RAPORT DE AUDIT ENERGETIC");
  lines.push("═".repeat(50));
  lines.push("");
  lines.push("1. IDENTIFICARE CLĂDIRE");
  lines.push("─".repeat(50));
  lines.push(`Adresă: ${building.address || "—"}, ${building.city || "—"}, jud. ${building.county || "—"}`);
  lines.push(`Categorie: ${catLabel}`);
  lines.push(`An construcție: ${building.yearBuilt || "—"}, An renovare: ${building.yearRenov || "—"}`);
  lines.push(`Suprafață utilă: ${Au} m², Volum: ${building.volume || "—"} m³`);
  lines.push(`Zonă climatică: ${selectedClimate?.name || "—"} (Zona ${selectedClimate?.zone}, θe=${selectedClimate?.theta_e}°C)`);
  lines.push("");
  lines.push("2. REZULTATE CALCUL ENERGETIC");
  lines.push("─".repeat(50));
  lines.push(`Clasa energetică: ${cls.cls} (notă ${cls.score}/100)`);
  lines.push(`Energie primară: ${epF.toFixed(1)} kWh/(m²·an)`);
  lines.push(`Emisii CO₂: ${co2F.toFixed(1)} kgCO₂/(m²·an)`);
  lines.push(`Energie finală: ${instSummary.qf_total_m2?.toFixed(1)} kWh/(m²·an)`);
  lines.push(`RER (rata energie regenerabilă): ${rer.toFixed(1)}%`);
  lines.push(`Conformitate nZEB: ${isNZEB ? "DA — conform Legea 238/2024" : "NU — necesită reabilitare"}`);
  lines.push(`  Prag EP: ≤${getNzebEpMax(building.category, selectedClimate?.zone)} kWh/(m²·an), actual: ${epF.toFixed(1)}`);
  lines.push(`  Prag RER: ≥${nzeb.rer_min}%, actual: ${rer.toFixed(1)}%`);
  lines.push("");
  lines.push("3. OBSERVAȚII ȘI CONSTATĂRI");
  lines.push("─".repeat(50));

  if (envelopeSummary) {
    lines.push(`Coeficient global G = ${envelopeSummary.G?.toFixed(3)} W/(m³·K)`);
    if (envelopeSummary.G > 0.5) lines.push("  ⚠ G ridicat — anvelopă termică slab izolată");
  }
  if (airInfiltrationCalc) {
    lines.push(`Etanșeitate: n50 = ${airInfiltrationCalc.n50} h⁻¹ (${airInfiltrationCalc.classification})`);
  }
  if (naturalLightingCalc) {
    lines.push(`Iluminat natural: FLZ = ${naturalLightingCalc.flz}% (${naturalLightingCalc.classification})`);
  }
  if (gwpDetailed) {
    lines.push(`Amprenta de carbon: ${gwpDetailed.gwpPerM2Year} kgCO₂eq/(m²·an) (${gwpDetailed.classification})`);
  }
  if (annualEnergyCost) {
    lines.push(`Cost anual estimat: ${annualEnergyCost.total.toLocaleString("ro-RO")} lei/an (≈${annualEnergyCost.totalEur.toLocaleString("ro-RO")} EUR/an)`);
  }

  lines.push("");
  lines.push("4. RECOMANDĂRI DE REABILITARE");
  lines.push("─".repeat(50));
  if (smartSuggestions && smartSuggestions.length > 0) {
    smartSuggestions.forEach((s, i) => {
      const pLabel = s.priority === 1 ? "URGENT" : s.priority === 2 ? "RECOMANDAT" : "OPȚIONAL";
      lines.push(`${i + 1}. [${pLabel}] ${s.measure}`);
      lines.push(`   ${s.detail}`);
      lines.push(`   Impact: ${s.impact} | Cost: ${s.costEstimate} | Recuperare: ${s.payback}`);
    });
  } else {
    lines.push("Nu sunt disponibile recomandări. Completați datele anvelopei și instalațiilor.");
  }

  lines.push("");
  lines.push("5. DATE AUDITOR");
  lines.push("─".repeat(50));
  lines.push(`Auditor: ${auditor.name || "—"} (${auditor.atestat || "—"}, Grad ${auditor.grade || "—"})`);
  lines.push(`Firmă: ${auditor.company || "—"}`);
  lines.push(`Data: ${auditor.date || "—"}`);
  lines.push("");
  lines.push("═".repeat(50));
  lines.push(`Generat cu Zephren v3.0 · ${new Date().toLocaleDateString("ro-RO")}`);
  lines.push("Normative: Mc 001-2022, SR EN ISO 52000-1:2017/NA:2023, Legea 238/2024");

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Raport_Audit_${(building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
  showToast("Raport audit generat", "success");
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. EXPORT COMPLIANCE REPORT — raport multi-normativ (jsPDF + autotable)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportComplianceReport(ctx) {
  const {
    instSummary, renewSummary, building, selectedClimate, cooling,
    envelopeSummary, opaqueElements, glazingElements, bacsClass, auditor,
    showToast, setExporting, calcOpaqueR, useNA2023,
  } = ctx;
  if (!instSummary) { showToast("Completați calculul energetic (Pasul 5)", "error"); return; }
  setExporting("pdf");
  try {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 14;
    const colW = pageW - margin * 2;

    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
    const rer = renewSummary?.rer || 0;
    const catKey = buildCatKey(building.category, cooling.hasCooling);
    const enClass = getEnergyClass(epF, catKey);
    const Au = parseFloat(building.areaUseful) || 0;
    const nzebEpMax = getNzebEpMax(building.category, selectedClimate?.zone);
    const nzebThresh = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
    const isNZEB = epF <= nzebEpMax && rer >= nzebThresh.rer_min;
    const zebThresh = ZEB_THRESHOLDS[building.category] || ZEB_THRESHOLDS.RI;
    const isZEB = epF <= zebThresh.ep_max && rer >= zebThresh.rer_min;
    const bacsOk = ["A", "B", "C"].includes(bacsClass);
    const catLabel = BUILDING_CATEGORIES.find(c => c.id === building.category)?.label || building.category;

    const c107Result = checkC107Conformity(opaqueElements, glazingElements, building.category, calcOpaqueR);
    const c107Ok = c107Result?.checks?.every(c => c.ok) ?? false;
    const c107Pct = c107Result?.checks?.length
      ? Math.round(c107Result.checks.filter(c => c.ok).length / c107Result.checks.length * 100) : 0;

    doc.setFillColor(13, 15, 26);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RAPORT DE CONFORMITATE ENERGETICĂ", margin, 12);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 200);
    doc.text("Multi-normativ: Mc 001-2022 · C107 · BACS EN 15232-1 · EPBD 2024/1275 · nZEB/ZEB", margin, 19);
    doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")} | Auditor: ${auditor?.name || "—"} | Atestat: ${auditor?.atestat || "—"}`, margin, 25);

    doc.setTextColor(40, 40, 60);
    doc.setFillColor(245, 246, 250);
    doc.rect(margin, 33, colW, 18, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 100);
    doc.text("CLĂDIRE IDENTIFICATĂ", margin + 3, 39);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 60);
    doc.text(`Adresă: ${[building.address, building.city, building.county].filter(Boolean).join(", ") || "—"}`, margin + 3, 44);
    doc.text(`Categorie: ${catLabel} · Suprafață utilă: ${Au.toFixed(0)} m² · An construcție: ${building.yearBuilt || "—"} · Zonă climatică: ${selectedClimate?.zone || "—"}`, margin + 3, 49);

    const checks = [
      {
        normativ: "Mc 001-2022",
        cerinta: "Clasă energetică A+…G",
        valoare: `EP = ${epF.toFixed(1)} kWh/(m²·an) → Clasa ${enClass}`,
        status: ["A+", "A", "B"].includes(enClass) ? "EXCELENT" : ["C", "D"].includes(enClass) ? "SATISFĂCĂTOR" : "NECESITĂ INTERVENȚIE",
        ok: ["A+", "A", "B", "C"].includes(enClass),
      },
      {
        normativ: "Mc 001-2022",
        cerinta: "nZEB (Legea 238/2024)",
        valoare: `EP ≤ ${nzebEpMax} kWh/(m²·an) · RER ≥ ${nzebThresh.rer_min}% | EP=${epF.toFixed(1)}, RER=${rer.toFixed(0)}%`,
        status: isNZEB ? "CONFORM" : "NECONFORM",
        ok: isNZEB,
      },
      {
        normativ: "EPBD 2024/1275 Art.11",
        cerinta: "ZEB (Zero Emission Building)",
        valoare: `EP ≤ ${zebThresh.ep_max} kWh/(m²·an) · RER ≥ ${zebThresh.rer_min}% | EP=${epF.toFixed(1)}, RER=${rer.toFixed(0)}%`,
        status: isZEB ? "CONFORM" : "NECONFORM (termen: mai 2026)",
        ok: isZEB,
      },
      {
        normativ: "C107/2-2005",
        cerinta: "Rezistențe termice minime anvelopă",
        valoare: `${c107Result?.checks?.length || 0} elemente verificate · ${c107Pct}% conforme`,
        status: c107Ok ? "CONFORM" : `NECONFORM (${100 - c107Pct}% elemente sub limită)`,
        ok: c107Ok,
      },
      {
        normativ: "BACS EN 15232-1",
        cerinta: "Clasa automatizare ≥ C (EPBD Art.14)",
        valoare: `Clasa BACS detectată: ${bacsClass}`,
        status: bacsOk ? "CONFORM" : "NECONFORM — necesită upgrade BACS",
        ok: bacsOk,
      },
      {
        normativ: useNA2023 ? "SR EN ISO 52000-1:2017/NA:2023 Tab A.16" : "Mc 001-2022 Tab 5.17",
        cerinta: "Factor energie primară electricitate",
        valoare: useNA2023
          ? `fP_nren=${getFPElecNren(true)} + fP_ren=${getFPElecRen(true)} → fP_tot=${getFPElecTot(true)} (Tab A.16)`
          : `fP(electricitate) = ${FP_ELEC} (Tab 5.17 legacy)`,
        status: useNA2023 ? "APLICAT (NA:2023)" : "APLICAT (legacy)",
        ok: true,
      },
      {
        normativ: "Mc 001-2022 Cap.3",
        cerinta: "Emisii CO₂ echivalent",
        valoare: `CO₂ = ${co2F.toFixed(2)} kg/(m²·an)`,
        status: co2F < 20 ? "PERFORMANT" : co2F < 50 ? "MEDIU" : "RIDICAT",
        ok: co2F < 50,
      },
      ...(envelopeSummary?.avRatio != null ? [{
        normativ: "Mc 001-2022 Art.4.2",
        cerinta: "Compact clădire (Av/V ≤ 1.0 rezidențial)",
        valoare: `Av/V = ${envelopeSummary.avRatio?.toFixed(3) || "—"}`,
        status: (envelopeSummary.avRatio || 0) <= 1.2 ? "SATISFĂCĂTOR" : "COMPACT REDUS",
        ok: (envelopeSummary.avRatio || 0) <= 1.2,
      }] : []),
    ];

    doc.autoTable({
      startY: 54,
      head: [["Normativ", "Cerință", "Valoare calculată", "Status"]],
      body: checks.map(c => [c.normativ, c.cerinta, c.valoare, c.status]),
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 230], lineWidth: 0.3 },
      headStyles: { fillColor: [13, 15, 26], textColor: [245, 158, 11], fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 50 },
        2: { cellWidth: 72 },
        3: { cellWidth: 28, fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          const ok = checks[data.row.index]?.ok;
          data.cell.styles.textColor = ok ? [22, 163, 74] : [220, 38, 38];
        }
      },
      margin: { left: margin, right: margin },
    });

    if (c107Result?.checks?.length > 0) {
      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 60);
      doc.text("Detaliu conformitate C107/2-2005 — elemente anvelopă", margin, finalY);
      doc.autoTable({
        startY: finalY + 3,
        head: [["Element", "Tip", "U calc. [W/(m²·K)]", "U ref. [W/(m²·K)]", "Status"]],
        body: c107Result.checks.map(c => [
          c.name || "—",
          c.type || "—",
          c.uCalc != null ? c.uCalc.toFixed(3) : "—",
          c.uRef != null ? c.uRef.toFixed(3) : "—",
          c.ok ? "✓ CONFORM" : "✗ NECONFORM",
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5 },
        columnStyles: { 4: { fontStyle: "bold" } },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === "body") {
            data.cell.styles.textColor = c107Result.checks[data.row.index]?.ok ? [22, 163, 74] : [220, 38, 38];
          }
        },
        margin: { left: margin, right: margin },
      });
    }

    const endY = doc.lastAutoTable.finalY + 8;
    const conformCount = checks.filter(c => c.ok).length;
    const conformPct = Math.round(conformCount / checks.length * 100);
    doc.setFillColor(conformPct >= 80 ? 240 : 254, conformPct >= 80 ? 253 : 242, conformPct >= 80 ? 244 : 232);
    doc.rect(margin, endY, colW, 18, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(conformPct >= 80 ? 22 : 180, conformPct >= 80 ? 163 : 80, conformPct >= 80 ? 74 : 0);
    doc.text(`CONFORMITATE GLOBALĂ: ${conformCount}/${checks.length} cerințe îndeplinite (${conformPct}%)`, margin + 3, endY + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 120);
    doc.text("Valorile sunt calculate conform metodologiei Mc 001-2022 și normativelor europene în vigoare la data generării.", margin + 3, endY + 12);
    doc.text(`Auditor: ${auditor?.name || "—"} · Atestat: ${auditor?.atestat || "—"} · Data: ${new Date().toLocaleDateString("ro-RO")}`, margin + 3, endY + 16);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 180);
      doc.text(`Zephren v3.8 | Raport conformitate multi-normativ | Pag. ${i}/${pageCount}`, pageW / 2, 292, { align: "center" });
    }

    const addr = (building.address || "cladire").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    doc.save(`Conformitate_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast("Raport conformitate generat!", "success");
  } catch (e) {
    console.error("Compliance PDF error:", e);
    showToast("Eroare generare raport conformitate", "error");
  } finally {
    setExporting(null);
  }
}
