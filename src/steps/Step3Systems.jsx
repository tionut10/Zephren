import { useState, useCallback, useMemo } from "react";
import { cn, Select, Input, Card, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";
import InvoiceOCR from "../components/InvoiceOCR.jsx";
import SuggestionPanel from "../components/SuggestionPanel.jsx";
import { suggestHVAC, suggestACM, filterByCategory } from "../data/suggestions-catalog.js";
import { FUELS, LIGHTING_HOURS, HEAT_SOURCES as HEAT_SOURCES_LEGACY } from "../data/constants.js";
// HVAC Extended Catalog — Sprint 30 apr 2026: 424 entries noi bilingv RO+EN, ~165 brand-uri în registry
import {
  HEAT_SOURCES_EXT as HEAT_SOURCES,
  EMISSION_SYSTEMS_EXT as EMISSION_SYSTEMS,
  DISTRIBUTION_QUALITY_EXT as DISTRIBUTION_QUALITY,
  CONTROL_TYPES_EXT as CONTROL_TYPES,
  ACM_SOURCES_EXT as ACM_SOURCES,
  COOLING_SYSTEMS_EXT as COOLING_SYSTEMS,
  COOLING_EMISSION_EXT as COOLING_EMISSION_EFFICIENCY,
  COOLING_DISTRIBUTION_EXT as COOLING_DISTRIBUTION_EFFICIENCY,
  COOLING_CONTROL_EXT as COOLING_CONTROL_EFFICIENCY,
  VENTILATION_TYPES_EXT as VENTILATION_TYPES,
  LIGHTING_TYPES_EXT as LIGHTING_TYPES,
  LIGHTING_CONTROL_EXT as LIGHTING_CONTROL,
  ACM_STORAGE_TYPES,
  ACM_ANTI_LEGIONELLA,
  PIPE_INSULATION_TYPES,
  getLabel,
  filterByBuildingCategory,
  groupByCategory,
  applyPartnerSorting,
  filterByActivePartner,
  getActivePartnersForEntry,
  getActivePartners,
  logPartnerClick,
} from "../data/catalogs/hvac-catalog.js";
import { validateACMInputs, summarizeValidation } from "../calc/acm-validation.js";

// ── Helper pentru construire opțiuni dropdown cu: grouping pe categorii (optgroup),
//    bilingv RO/EN via getLabel, filter applicabilitate per building.category,
//    sortare prioritate parteneri activi, tooltip cu source EN/SR/ISO + parteneri.
//    Suport filtru "Doar brand-uri partenere" via parametrul onlyPartners.
function buildOptions(entries, lang, buildingCategory, applyFilter = true, onlyPartners = false) {
  let filtered = applyFilter ? filterByBuildingCategory(entries, buildingCategory) : entries;
  if (onlyPartners) {
    filtered = filterByActivePartner(filtered);
  }
  const sorted = applyPartnerSorting(filtered);
  const grouped = groupByCategory(sorted, lang);
  const out = [];
  for (const [cat, items] of Object.entries(grouped)) {
    if (cat && cat !== "Altele" && cat !== "Other") {
      out.push({ label: cat, isGroupHeader: true });
    }
    for (const e of items) {
      const label = getLabel(e, lang);
      const partners = getActivePartnersForEntry(e.id);
      const partnerBadge = partners.length > 0;
      const baseTip = e.source ? `${e.source}${e.notes ? " — " + e.notes : ""}` : (e.notes || "");
      // Tooltip extins cu info partener: nume + tier + product line + URL afiliat
      let partnerInfo = "";
      if (partnerBadge) {
        partnerInfo = "\n\n🤝 Partener: " + partners
          .map(p => `${p.name}${p.partnerTier ? ` (${p.partnerTier})` : ""}`)
          .join(", ");
      }
      const tooltip = (baseTip + partnerInfo) || undefined;
      out.push({ value: e.id, label, tooltip, partnerBadge });
    }
  }
  return out;
}

// ── Wrapper onChange pentru telemetrie click: dacă entry ales are parteneri activi,
//    logăm event-ul (entryId + partnerBrandIds + context) în localStorage analytics.
//    Returnează handler care face și set state.
function trackAndSet(field, context, setter) {
  return (v) => {
    if (v) {
      const partners = getActivePartnersForEntry(v);
      if (partners.length > 0) {
        logPartnerClick(v, partners.map(p => p.id), context);
      }
    }
    setter(p => ({ ...p, [field]: v }));
  };
}

// ── Task 5 — Tags derivate contextual din clădire+climă, NU hardcodate ────────
// Înlocuiește preferredTags=["nZEB"] generic cu tag-uri reale per scenariu.
function deriveHeatingTags(building, climate) {
  const tags = [];
  const cat = building?.category || "";
  const zone = climate?.zone;
  const isPublic = ["BCC", "BCA", "BC", "BI"].includes(cat);
  const isResSmall = ["RI", "RA"].includes(cat);
  if (isPublic) tags.push("fire-safe", "publica");
  if (isResSmall) tags.push("rezidential");
  // Zona I/II = nevoie mare → soluție premium prioritară (HP sol-apă SCOP 4.5+)
  if (zone === "I" || zone === "II") tags.push("premium");
  else tags.push("nZEB");
  return tags;
}

function deriveCoolingTags(building) {
  const cat = building?.category || "";
  const isResSmall = ["RI", "RA"].includes(cat);
  const isResMed = cat === "RC";
  if (isResSmall) return ["rezidential", "low-cost"];
  if (isResMed) return ["modular", "rezidential"];
  return ["birouri", "comercial"];
}

function deriveVentilationTags(building) {
  const cat = building?.category || "";
  const isPublic = ["BCC", "BCA", "BC", "BI"].includes(cat);
  if (isPublic) return ["nZEB", "comercial", "passivhaus"];
  return ["nZEB", "rezidential"];
}

// ── Task 2 — Mapping subcategory → ID din constants.js ────────────────────────
// Aplicăm cea mai bună potrivire entry catalog → câmp setat în heating/cooling/ventilation/lighting.
const HEATING_SUBCAT_TO_ID = {
  "pompa-caldura-aer-apa": "PC_AA_INV",
  "pompa-caldura-sol-apa": "PC_SA",
  "centrala-condensatie": "GAZ_COND",
};
const COOLING_SUBCAT_TO_ID = {
  "VRF": "VRF",
  "split-inverter": "SPLIT_INV",
};
const VENTILATION_SUBCAT_TO_ID = {
  "VMC-dual-flow-recuperare": "MEC_HR90",
  "VMC-dual-flow-small": "MEC_HR85",
  "VMC-single-flow": "MEC_EXT",
  "DOAS": "DOAS",
};
const ACM_SUBCAT_TO_SOURCE = {
  "boiler-pompa-caldura": "PC_AA",
  "solar-termic-acm": "TERMO",
  "boiler-electric": "ELEC",
};

export default function Step3Systems({
  building, lang, selectedClimate,
  heating, setHeating,
  acm, setAcm,
  cooling, setCooling,
  ventilation, setVentilation,
  lighting, setLighting,
  instSubTab, setInstSubTab,
  instSummary,
  setStep, goToStep,
  showToast,
  userPlan,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  const [showOCR, setShowOCR] = useState(false);
  const [showMultiZone, setShowMultiZone] = useState(false);

  // ── Filtru "Doar brand-uri partenere" — Sprint P2 — afișat doar dacă există parteneri activi
  const [onlyPartners, setOnlyPartners] = useState(false);
  const activePartnersCount = useMemo(() => getActivePartners().length, []);
  // Forțăm dezactivare filtru dacă nu mai există parteneri activi (după reset overrides)
  useMemo(() => { if (activePartnersCount === 0 && onlyPartners) setOnlyPartners(false); }, [activePartnersCount]);

  // ── Sugestii orientative (fără brand) per tab — Task 3+5 cu semnale + tags derivate ────
  const heatingSuggestions = useMemo(() => {
    const peakLoad = parseFloat(heating?.power) || 0;
    const buildingArea = parseFloat(building?.areaUseful) || undefined;
    return suggestHVAC({
      functionType: "heating",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      climateZone: selectedClimate?.zone,
      buildingCategory: building?.category,
      buildingArea,
      preferredTags: deriveHeatingTags(building, selectedClimate),
      limit: 3,
    });
  }, [heating?.power, selectedClimate?.zone, building?.category, building?.areaUseful]);

  const coolingSuggestions = useMemo(() => {
    const peakLoad = parseFloat(cooling?.power) || 0;
    const buildingArea = parseFloat(building?.areaUseful) || undefined;
    return suggestHVAC({
      functionType: "cooling",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      climateZone: selectedClimate?.zone,
      buildingCategory: building?.category,
      buildingArea,
      preferredTags: deriveCoolingTags(building),
      limit: 3,
    });
  }, [building?.category, building?.areaUseful, cooling?.power, selectedClimate?.zone]);

  const ventilationSuggestions = useMemo(() => {
    const type = ventilation?.type || "";
    if (!type || type === "NAT" || type === "NAT_HIBRIDA") return [];
    const buildingArea = parseFloat(building?.areaUseful) || 0;
    // Task 7 — dimensionare automată per suprafață: small <120m² / medium 120-500 / large ≥500
    let sizeFilter;
    if (buildingArea > 0) {
      if (buildingArea < 120) sizeFilter = "small";
      else if (buildingArea < 500) sizeFilter = "medium";
      else sizeFilter = "large";
    }
    const hasHR = VENTILATION_TYPES.find(v => v.id === type)?.hasHR ?? false;
    let pool = filterByCategory("ventilation");
    if (!hasHR) {
      // Sistem fără recuperare → afișăm și entries fără HR
      pool = pool.filter(s => s.id === "vmc-single" || (sizeFilter && s.tech.sizeTag === sizeFilter));
    } else {
      // VMC cu HR → filtrare după sizeTag dacă e disponibil
      if (sizeFilter) {
        const sized = pool.filter(s => s.tech.sizeTag === sizeFilter && s.tech.recoveryEff > 0);
        pool = sized.length > 0 ? sized : pool.filter(s => s.tech.recoveryEff > 0);
      } else {
        pool = pool.filter(s => s.tech.recoveryEff > 0);
      }
    }
    return pool.slice(0, 3);
  }, [ventilation?.type, building?.areaUseful]);

  const lightingSuggestions = useMemo(() => {
    const cat = building?.category || "";
    const isResidential = ["RI", "RC", "RA"].includes(cat);
    const all = filterByCategory("lighting");
    if (isResidential) return all.filter(s => s.id === "led-control-presence");
    return all;
  }, [building?.category]);

  // Task 4 — Sugestii ACM per consumatori
  const acmSuggestions = useMemo(() => {
    const residents = parseInt(acm?.consumers, 10) || 0;
    return suggestACM({
      residents: residents > 0 ? residents : undefined,
      preferredTags: ["nZEB", "regenerabil-partial", "casa-verde"],
      limit: 3,
    });
  }, [acm?.consumers]);

  // ── Task 6 — Status conformitate sistem selectat (compliance feedback) ─────
  const heatingComplianceStatus = useMemo(() => {
    if (!heating?.source) return null;
    const src = HEAT_SOURCES_LEGACY.find(h => h.id === heating.source);
    if (!src) return null;
    // Pompe căldură → eta_gen reprezintă SCOP/COP; cazane → eta_gen e randament termic
    if (src.isCOP) {
      const scop = src.eta_gen;
      return scop >= 3.5 ? "ok" : "warning";
    }
    // Cazane fosile / electric → fail nZEB
    if (src.fuel === "gaz" || src.fuel === "gpl" || src.fuel === "motorina" || src.fuel === "carbune") {
      return "warning";
    }
    if (src.fuel === "biomasa" || src.fuel === "lemn_foc" || src.fuel === "termoficare") {
      return src.eta_gen >= 0.85 ? "ok" : "warning";
    }
    return null;
  }, [heating?.source]);

  const coolingComplianceStatus = useMemo(() => {
    if (!cooling?.hasCooling || !cooling?.system) return null;
    const seer = parseFloat(cooling.seer) || 0;
    if (seer === 0) return null;
    return seer >= 5.0 ? "ok" : "warning";
  }, [cooling?.hasCooling, cooling?.system, cooling?.seer]);

  const ventilationComplianceStatus = useMemo(() => {
    if (!ventilation?.type || ventilation.type === "NAT") return null;
    const vt = VENTILATION_TYPES.find(v => v.id === ventilation.type);
    if (!vt) return null;
    if (!vt.hasHR) return "warning";
    return (vt.hrEta || 0) >= 0.85 ? "ok" : "warning";
  }, [ventilation?.type]);

  const handleOCRApply = useCallback((data) => {
    try {
      localStorage.setItem("zephren_measured_consumption", JSON.stringify(data));
    } catch {}
    setShowOCR(false);
    showToast?.("Date consum din factură salvate", "success");
  }, [showToast]);

  // ── Task 2 — onSelect handlers: aplică sugestii din catalog la formular ───
  const handleApplyHeatingSuggestion = useCallback((entry) => {
    const newSource = HEATING_SUBCAT_TO_ID[entry.subcategory];
    setHeating(p => ({
      ...p,
      ...(newSource ? { source: newSource } : {}),
      power: entry.tech?.capacity_kW != null ? String(entry.tech.capacity_kW) : p.power,
      eta_gen: entry.tech?.SCOP != null
        ? String(entry.tech.SCOP)
        : entry.tech?.COP != null
        ? String(entry.tech.COP)
        : entry.tech?.efficiency != null
        ? String(entry.tech.efficiency)
        : p.eta_gen,
    }));
    showToast?.("Soluție aplicată din catalog orientativ", "success");
  }, [setHeating, showToast]);

  const handleApplyCoolingSuggestion = useCallback((entry) => {
    const newSystem = COOLING_SUBCAT_TO_ID[entry.subcategory];
    setCooling(p => ({
      ...p,
      hasCooling: true,
      ...(newSystem ? { system: newSystem } : {}),
      power: entry.tech?.capacity_kW != null ? String(entry.tech.capacity_kW) : p.power,
      eer: entry.tech?.EER != null ? String(entry.tech.EER) : p.eer,
      seer: entry.tech?.SEER != null ? String(entry.tech.SEER) : p.seer,
    }));
    showToast?.("Sistem răcire aplicat din catalog orientativ", "success");
  }, [setCooling, showToast]);

  const handleApplyVentilationSuggestion = useCallback((entry) => {
    const newType = VENTILATION_SUBCAT_TO_ID[entry.subcategory];
    setVentilation(p => ({
      ...p,
      ...(newType ? { type: newType } : {}),
      hrEfficiency: entry.tech?.recoveryEff != null
        ? String(Math.round(entry.tech.recoveryEff * 100))
        : p.hrEfficiency,
    }));
    showToast?.("Sistem ventilare aplicat din catalog orientativ", "success");
  }, [setVentilation, showToast]);

  const handleApplyLightingSuggestion = useCallback((entry) => {
    setLighting(p => ({
      ...p,
      type: entry.subcategory === "control-prezenta" ? p.type : "LED",
      controlType: entry.subcategory === "control-prezenta" ? "PREZ_DIM" : p.controlType,
      pDensity: entry.tech?.power_W != null ? String(entry.tech.power_W / 10) : p.pDensity,
    }));
    showToast?.("Soluție iluminat aplicată din catalog orientativ", "success");
  }, [setLighting, showToast]);

  const handleApplyACMSuggestion = useCallback((entry) => {
    const newSource = ACM_SUBCAT_TO_SOURCE[entry.subcategory];
    setAcm(p => ({
      ...p,
      ...(newSource ? { source: newSource } : {}),
      storageVolume: entry.tech?.capacity_L != null ? String(entry.tech.capacity_L) : p.storageVolume,
    }));
    showToast?.("Soluție ACM aplicată din catalog orientativ", "success");
  }, [setAcm, showToast]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <button onClick={() => setStep(2)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 2</button>
            <h2 className="text-xl font-bold">{lang==="EN"?"Building systems":"Instalații"}</h2>
          </div>
          <p className="text-xs opacity-40">Capitolul 3 Mc 001-2022 — Încălzire, ACM, Ventilare, Climatizare, Iluminat</p>
        </div>
        <button
          onClick={() => setShowOCR(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all shrink-0"
        >
          <span aria-hidden="true">📄</span> OCR Factură
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
        {[
          {id:"heating",label:t("Încălzire"),icon:"🔥"},
          {id:"acm",label:"ACM",icon:"🚿"},
          {id:"ventilation",label:t("Ventilare"),icon:"💨"},
          {id:"cooling",label:t("Climatizare"),icon:"❄️"},
          {id:"lighting",label:t("Iluminat"),icon:"💡"},
        ].map(tab => (
          <button key={tab.id} onClick={() => setInstSubTab(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-[80px]",
              instSubTab===tab.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "hover:bg-white/5 border border-transparent")}>
            <span aria-hidden="true">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Filtru parteneri — afișat doar dacă există parteneri activi (Sprint P2) */}
      {activePartnersCount > 0 && (
        <div className="mb-3 flex items-center justify-between bg-amber-500/[0.04] border border-amber-500/15 rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="opacity-70">🤝 {activePartnersCount} brand-uri partenere active</span>
            <span className="text-[10px] opacity-40">— entries linkate apar primele cu badge</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyPartners}
              onChange={e => setOnlyPartners(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="font-medium">{t("Afișează doar brand-uri partenere")}</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main content area */}
        <div className="xl:col-span-2 space-y-3">

          {/* ── ÎNCĂLZIRE ── */}
          {instSubTab === "heating" && (
            <>
              <Card title={t("Sursa de căldură (generare)",lang)}>
                <div className="space-y-3">
                  <Select label={t("Tip sursă",lang)} value={heating.source} onChange={trackAndSet("source", "Step3.heating.source", setHeating)}
                    options={buildOptions(HEAT_SOURCES, lang, building?.category, true, onlyPartners)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label={t("Putere nominală",lang)} value={heating.power} onChange={v => setHeating(p=>({...p,power:v}))} type="number" unit="kW" min="0" step="0.1" tooltip="Puterea termică nominală a generatorului — Mc 001 Cap.3, valoare de pe plăcuța echipamentului" />
                    <Input label={HEAT_SOURCES.find(s=>s.id===heating.source)?.isCOP ? "COP/SCOP" : "Randament generare (eta_gen)"}
                      value={heating.eta_gen} onChange={v => setHeating(p=>({...p,eta_gen:v}))} type="number"
                      unit={HEAT_SOURCES.find(s=>s.id===heating.source)?.isCOP ? "" : "%"} step="0.01" />
                  </div>
                  {(() => { const src = HEAT_SOURCES.find(s=>s.id===heating.source); const fl = FUELS.find(f=>f.id===src?.fuel);
                    return fl ? (
                      <div className="bg-white/[0.02] rounded-lg p-3 flex items-center justify-between">
                        <span className="text-xs opacity-40">Combustibil</span>
                        <span className="text-xs font-medium">{fl.label} <span className="opacity-40">(fP = {fl.fP_tot}, fCO2 = {fl.fCO2})</span></span>
                      </div>
                    ) : null;
                  })()}
                  {/* Sprint 27 P2.10 — Banner EPBD 2024 interdicție subvenții/instalare cazane gaz */}
                  {(() => {
                    const src = HEAT_SOURCES.find(s=>s.id===heating.source);
                    const isGas = src?.fuel === "gaz" || src?.fuel === "gpl";
                    if (!isGas) return null;
                    return (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200 leading-relaxed">
                        <span className="font-semibold text-amber-300">⚠ EPBD 2024 (Art.17)</span> — interdicție
                        subvenții pentru cazane fosile <strong>din 2025</strong>; interdicție instalare nouă
                        cazane gaz <strong>din 2030</strong> (transpunere prin L.238/2024 + ordin MDLPA 2026).
                        Considerați pompă de căldură (aer-apă/sol-apă) pentru conformitate viitoare.
                      </div>
                    );
                  })()}
                </div>
              </Card>

              <Card title={t("Distribuție și control",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select label={t("Calitate distribuție",lang)} value={heating.distribution} onChange={trackAndSet("distribution", "Step3.heating.distribution", setHeating)}
                    options={buildOptions(DISTRIBUTION_QUALITY, lang, building?.category, true, onlyPartners)} />
                  <Input label={t("Randament distribuție (eta_dist)",lang)} value={heating.eta_dist} onChange={v => setHeating(p=>({...p,eta_dist:v}))} type="number" step="0.01" />
                  <Select label={t("Tip reglaj/control",lang)} value={heating.control} onChange={trackAndSet("control", "Step3.heating.control", setHeating)}
                    options={buildOptions(CONTROL_TYPES, lang, building?.category, true, onlyPartners)} />
                  <Input label={t("Randament reglaj (eta_ctrl)",lang)} value={heating.eta_ctrl} onChange={v => setHeating(p=>({...p,eta_ctrl:v}))} type="number" step="0.01" />
                </div>
              </Card>

              <Card title={t("Sistem de emisie",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select label={t("Tip corpuri de încălzire",lang)} value={heating.emission} onChange={trackAndSet("emission", "Step3.heating.emission", setHeating)}
                    options={buildOptions(EMISSION_SYSTEMS, lang, building?.category, true, onlyPartners)} />
                  <Input label={t("Randament emisie (eta_em)",lang)} value={heating.eta_em} onChange={v => setHeating(p=>({...p,eta_em:v}))} type="number" step="0.01" />
                </div>
              </Card>

              <Card title={t("Regim de funcționare",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select label={t("Regim",lang)} value={heating.regime} onChange={v => setHeating(p=>({...p,regime:v}))}
                    options={[{value:"continuu",label:t("Continuu 24h")},{value:"intermitent",label:t("Intermitent (reducere nocturnă)")},{value:"oprire",label:t("Intermitent (oprire nocturnă)")}]} />
                  <Input label={t("Temp. confort (theta_int)",lang)} value={heating.theta_int} onChange={v => setHeating(p=>({...p,theta_int:v}))} type="number" unit="°C" tooltip="Temperatura interioară de calcul — Mc 001 Tabel 1.2: 20°C rezidențial, 18°C depozite, 24°C sănătate" />
                  <Input label={t("Reducere nocturnă",lang)} value={heating.nightReduction} onChange={v => setHeating(p=>({...p,nightReduction:v}))} type="number" unit="°C" />
                  {/* #7 Multi-zonă simplificată — collapsible */}
                  <div className="col-span-full border-t border-white/5 pt-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowMultiZone(v => !v)}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity"
                    >
                      <span>{showMultiZone ? "▾" : "▸"}</span>
                      {t("Zone termice adiacente (multi-zonă simplificată)")}
                    </button>
                    {showMultiZone && (
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <Input label="T scară/hol comun" value={heating.tStaircase || "15"} onChange={v => setHeating(p=>({...p,tStaircase:v}))} type="number" unit="°C" tooltip="Temperatura medie a scării/holului comun neîncălzit (afectează τ perete interior)" />
                        <Input label="T subsol" value={heating.tBasement || "10"} onChange={v => setHeating(p=>({...p,tBasement:v}))} type="number" unit="°C" tooltip="Temperatura medie a subsolului neîncălzit" />
                        <Input label="T pod" value={heating.tAttic || "5"} onChange={v => setHeating(p=>({...p,tAttic:v}))} type="number" unit="°C" tooltip="Temperatura medie a podului neîncălzit" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Sugestii orientative HVAC încălzire (fără brand) — Task 2 onSelect activ */}
              <SuggestionPanel
                suggestions={heatingSuggestions}
                title={t("Soluții recomandate pentru sursa de căldură",lang)}
                subtitle={t("Echipamente tipice piață RO 2025-2026 — fără nume de marcă. Click pe un card pentru a aplica.",lang)}
                mode="card"
                onSelect={handleApplyHeatingSuggestion}
                lang={lang}
              />
              {/* Task 6 — feedback compliance după selecție */}
              {heatingComplianceStatus === "ok" && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-1 px-2">
                  <span aria-hidden="true">✅</span>
                  <span>Sistemul ales îndeplinește pragul nZEB (SCOP ≥ 3.5 sau η ≥ 0.85)</span>
                </div>
              )}
              {heatingComplianceStatus === "warning" && (
                <div className="text-[11px] text-amber-400 flex items-center gap-1.5 mt-1 px-2">
                  <span aria-hidden="true">⚠</span>
                  <span>Sistemul ales poate să nu atingă clasa nZEB — verificați SCOP / eligibilitate combustibil EPBD 2024</span>
                </div>
              )}
            </>
          )}

          {/* ── ACM ── Sprint 4b (17 apr 2026): validări complete + cuplaj solar Step 8 ── */}
          {instSubTab === "acm" && (() => {
            const acmValidation = validateACMInputs(acm, {
              category: building.category,
              areaUseful: parseFloat(building.areaUseful) || 0,
            });
            const acmSummary = summarizeValidation(acmValidation);
            return (
            <>
              <Card title={t("Preparare apă caldă de consum",lang)}>
                <div className="space-y-3">
                  <Select label={t("Sursa ACM",lang)} value={acm.source} onChange={trackAndSet("source", "Step3.acm.source", setAcm)}
                    options={buildOptions(ACM_SOURCES, lang, building?.category, true, onlyPartners)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label={t("Nivel de consum",lang)} value={acm.consumptionLevel || "med"} onChange={v => setAcm(p=>({...p,consumptionLevel:v}))}
                      options={[
                        {value:"low",  label:t("Scăzut (utilizare redusă)")},
                        {value:"med",  label:t("Mediu (uzual)")},
                        {value:"high", label:t("Ridicat (utilizare intensivă)")},
                      ]} />
                    <Input label={t("Temperatură ACM setată",lang)} value={acm.tSupply} onChange={v => setAcm(p=>({...p,tSupply:v}))} type="number" unit="°C" min="40" max="70" step="1"
                      tooltip="T_set boiler. Min 60°C obligatoriu pentru boilere >400L în clădiri publice (Ord. MS 1002/2015 — Legionella)" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input label={t("Nr. consumatori echivalenți",lang)} value={acm.consumers} onChange={v => setAcm(p=>({...p,consumers:v}))} type="number"
                      placeholder={`auto: ${Math.max(1,Math.round((parseFloat(building.areaUseful)||100)/30))}`} min="1" />
                    <Input label={t("Consum specific",lang)} value={acm.dailyLiters} onChange={v => setAcm(p=>({...p,dailyLiters:v}))} type="number" unit="l/pers/zi"
                      tooltip="Mc 001 Tab.10 + GEx 009-013: rezidențial 45-80, birouri 5-12, spital 60-150 L/pat, hotel 70-150 L/cameră" />
                    <div className="bg-white/[0.02] rounded-lg p-3 flex flex-col justify-center">
                      <span className="text-[10px] opacity-40">{t("Necesar termic ACM")}</span>
                      <span className="text-sm font-mono font-medium text-amber-400">
                        {instSummary ? instSummary.qACM_nd.toFixed(0) : "—"} <span className="text-[10px] opacity-40">kWh/an</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title={t("Stocare ACM",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={t("Volum vas stocare",lang)} value={acm.storageVolume} onChange={v => setAcm(p=>({...p,storageVolume:v}))} type="number" unit="litri" placeholder="0 = fără vas"
                    tooltip="Volum boiler acumulator. 0 pentru sisteme instant (combi, schimb placi). Pierderile se calculează automat EN 50440 din volum × clasă izolație." />
                  <Select label={t("Clasa energetică boiler",lang)} value={acm.insulationClass || "B"} onChange={v => setAcm(p=>({...p,insulationClass:v}))}
                    options={[
                      {value:"A", label:t("Clasa A — premium (−55% pierderi)")},
                      {value:"B", label:t("Clasa B — standard")},
                      {value:"C", label:t("Clasa C — slab izolat")},
                    ]}
                    tooltip="ErP Reg. 812/2013 (etichetare ACM). Clasa A: izolație PU rigid 50mm+ (q_standby ~1.3 kWh/24h pentru 200L)" />
                </div>
                {/* Sprint 4a: afișare live pierderi stocare calculate automat (EN 50440) */}
                {instSummary?.acmDetailed?.Q_storage_kWh > 0 && (
                  <div className="mt-3 bg-white/[0.02] rounded-lg p-3 flex items-center justify-between text-xs">
                    <span className="opacity-50">Pierderi stocare (calc. automat EN 50440)</span>
                    <span className="font-mono font-medium text-amber-300">
                      {instSummary.acmDetailed.Q_storage_kWh} kWh/an
                      <span className="opacity-40 ml-2">({instSummary.acmDetailed.f_storage_pct}% din Q_gen)</span>
                    </span>
                  </div>
                )}
              </Card>

              <Card title={t("Distribuție ACM",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={t("Lungime conducte distribuție",lang)} value={acm.pipeLength} onChange={v => setAcm(p=>({...p,pipeLength:v}))} type="number" unit="m"
                    tooltip="Lungime totală rețea ACM (tur + retur pentru recirculare). Estimare: 5-8m apartament, 20-40m casă, 40-100m bloc" />
                  <Input label={t("Diametru conducte",lang)} value={acm.pipeDiameter || "22"} onChange={v => setAcm(p=>({...p,pipeDiameter:v}))} type="number" unit="mm" min="10" max="100" step="1"
                    tooltip="Diametru nominal (DN) — tipic 22mm residential, 28-35mm bloc, 42mm+ centralizat" />
                  <Select label={t("Izolație conducte",lang)} value={acm.pipeInsulationThickness || "20mm"} onChange={v => setAcm(p=>({
                    ...p,
                    pipeInsulationThickness:v,
                    pipeInsulated: v !== "fara",
                  }))}
                    options={[
                      {value:"fara",  label:t("Fără izolație (pierderi maxime)")},
                      {value:"20mm", label:t("20 mm standard")},
                      {value:"30mm", label:t("30 mm îmbunătățit")},
                      {value:"50mm", label:t("50 mm+ superior (low-loss)")},
                    ]}
                    tooltip="Grosime izolație λ=0.035 W/(m·K). EN 15316-3 Tab.7" />
                  <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2">
                    <input type="checkbox" checked={acm.circRecirculation} onChange={e => setAcm(p=>({...p,circRecirculation:e.target.checked}))} className="accent-amber-500" />
                    {t("Circuit de recirculare")}
                    <span className="text-[10px] opacity-30 ml-1">(pierderi +8-15%)</span>
                  </label>
                  {acm.circRecirculation && (
                    <>
                      <Input label={t("Ore funcționare recirculare/zi",lang)} value={acm.circHours} onChange={v => setAcm(p=>({...p,circHours:v}))} type="number" unit="h/zi" min="0" max="24"
                        placeholder="24 = permanent, 16 = programat" />
                      <Select label={t("Tip pompă circulație",lang)} value={acm.circPumpType || "standard"} onChange={v => setAcm(p=>({...p,circPumpType:v}))}
                        options={[
                          {value:"veche_neregulata", label:t("Veche, neregulată (IEE E)")},
                          {value:"standard",         label:t("Standard (IEE D-C)")},
                          {value:"variabila",        label:t("Cu turație variabilă (IEE B)")},
                          {value:"iee_sub_023",      label:t("IEE A+ (<0.23, max eficiență)")},
                        ]}
                        tooltip="EN 15316-3 Tab.10 + Reg. UE 641/2009 (ecodesign pompe)" />
                    </>
                  )}
                </div>
              </Card>

              <Card title={t("Protecție anti-Legionella (HG 1425/2006 + Ord. MS 1002/2015)",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!acm.hasLegionella} onChange={e => setAcm(p=>({...p,hasLegionella:e.target.checked}))} className="accent-amber-500" />
                    <span className="font-medium">{t("Tratament termic periodic activ")}</span>
                    <span className="text-[10px] opacity-40">(supliment energetic 3-5%/an)</span>
                  </label>
                  {acm.hasLegionella && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select label={t("Frecvență tratament",lang)} value={acm.legionellaFreq || "weekly"} onChange={v => setAcm(p=>({...p,legionellaFreq:v}))}
                        options={[
                          {value:"weekly", label:t("Săptămânal (VDI 6023 standard)")},
                          {value:"daily",  label:t("Zilnic (risc ridicat)")},
                        ]} />
                      <Input label={t("Temperatură șoc termic",lang)} value={acm.legionellaT || "70"} onChange={v => setAcm(p=>({...p,legionellaT:v}))} type="number" unit="°C" min="60" max="80" step="1"
                        tooltip="Minim 70°C timp de 3 min pentru distrugere Legionella" />
                    </div>
                  )}
                  {/* Banner avertizare — clădire risc ridicat, fără măsuri */}
                  {instSummary?.acmDetailed?.legionella?.warnings?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs">
                      <div className="font-medium text-red-400 mb-1">⚠ Risc Legionella detectat</div>
                      {instSummary.acmDetailed.legionella.warnings.map((w, i) => (
                        <div key={i} className="text-red-300/80 leading-relaxed">• {w}</div>
                      ))}
                    </div>
                  )}
                  {instSummary?.acmDetailed?.legionella?.recommendations?.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs">
                      <div className="font-medium text-amber-400 mb-1">💡 Recomandări</div>
                      {instSummary.acmDetailed.legionella.recommendations.map((r, i) => (
                        <div key={i} className="text-amber-300/80 leading-relaxed">• {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Sprint 4b — cuplaj solar Step 8 → ACM (EN 15316-4-3) indicator */}
              {instSummary?.acmSolar?.appliesToACM && (
                <Card title={t("Cuplaj panouri solare termice (Step 4 Regenerabile)",lang)}>
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="opacity-60">{t("Fracție solară aplicată ACM")}</span>
                      <span className="font-mono font-bold text-emerald-400 text-base">
                        {instSummary.acmSolar.fraction_pct}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] opacity-50">
                      <span>{t("Sursă valoare")}</span>
                      <span className="font-mono">
                        {instSummary.acmSolar.source === "step8_calc"
                          ? "✓ calculată din Step 4 (area + orientare + climă)"
                          : "⚠ implicită (constantă ACM_SOURCES)"}
                      </span>
                    </div>
                    {instSummary.acmSolar.detail && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] opacity-40">{t("Producție utilă")}</div>
                          <div className="font-mono text-amber-300">{instSummary.acmSolar.detail.totalSolarYield_kwh} kWh/an</div>
                        </div>
                        <div>
                          <div className="text-[10px] opacity-40">{t("Cerere ACM")}</div>
                          <div className="font-mono opacity-70">{instSummary.acmSolar.detail.totalDemand_kwh} kWh/an</div>
                        </div>
                        <div>
                          <div className="text-[10px] opacity-40">{t("Stagnare vara")}</div>
                          <div className={cn("font-mono", instSummary.acmSolar.detail.stagnRisk ? "text-red-400" : "opacity-70")}>
                            {instSummary.acmSolar.detail.stagnHoursAnnual || 0} h/an
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Sugestii orientative ACM (fără brand) — Task 4 onSelect activ */}
              <SuggestionPanel
                suggestions={acmSuggestions}
                title={t("Soluții recomandate pentru preparare ACM",lang)}
                subtitle={t("HPWH / solar termic / boiler electric — click pe un card pentru a aplica.",lang)}
                mode="card"
                onSelect={handleApplyACMSuggestion}
                lang={lang}
              />

              {/* Sprint P2 — panouri avansate ACM cu cataloage extinse (Storage + Anti-Legionella + Pipe Insulation) */}
              <Card title={t("⚙️ Configurare avansată ACM (catalog extins)",lang)}>
                <div className="space-y-4">
                  <div className="text-[11px] opacity-50 leading-relaxed">
                    {t("Cataloage detaliate post-Sprint HVAC 30 apr 2026 — tipologii avansate cu surse autoritare EN/SR/ISO. Selecțiile sunt opționale; dacă lipsesc, se folosesc valorile simple din panourile de mai sus.")}
                  </div>

                  {/* ── Tip stocare ACM (12 tipologii: buffer stratificat / VIP / PCM / BTES / ATES / etc.) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label={t("Tip stocare ACM (avansat)",lang)}
                      value={acm.storageType || ""}
                      placeholder={t("Selectează (opțional)")}
                      onChange={trackAndSet("storageType", "Step3.acm.storageType", setAcm)}
                      options={buildOptions(ACM_STORAGE_TYPES, lang, building?.category, false, onlyPartners)}
                      tooltip="EN 12977-3, EN 50440, IEA SHC Task 42 — buffer stratificat, two-tank, VIP vacuum, PCM phase-change, gheață/apă dual, BTES sezonier subteran, ATES acvifer, PIT groapă mare, tank-in-tank inox 304/316, bladder presurizat etc."
                    />
                    {acm.storageType && (() => {
                      const st = ACM_STORAGE_TYPES.find(s => s.id === acm.storageType);
                      if (!st) return null;
                      return (
                        <div className="bg-white/[0.02] rounded-lg p-3 text-[11px] space-y-1">
                          <div className="flex justify-between"><span className="opacity-50">Clasa energetică</span><span className="font-mono text-amber-400">{st.energyClassDefault}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Pierderi/zi</span><span className="font-mono">{st.lossKwhPerLDay} kWh/L</span></div>
                          <div className="flex justify-between gap-2"><span className="opacity-50 shrink-0">Sursă</span><span className="font-mono opacity-70 text-[10px] text-right truncate" title={st.source}>{st.source}</span></div>
                          {st.notes && <div className="text-[10px] opacity-60 pt-1 border-t border-white/5">{st.notes}</div>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Metodă anti-Legionella (5 metode: UV, Cu-Ag, ClO₂, pasteurizare, șoc termic) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label={t("Metodă anti-Legionella (avansat)",lang)}
                      value={acm.legionellaMethod || ""}
                      placeholder={t("Selectează (opțional)")}
                      onChange={trackAndSet("legionellaMethod", "Step3.acm.legionellaMethod", setAcm)}
                      options={buildOptions(ACM_ANTI_LEGIONELLA, lang, building?.category, false, onlyPartners)}
                      tooltip="HG 1425/2006 + Ord. MS 1002/2015 + EN 14897 + ISO 15858 — termic (pasteurizare 60°C/30min, șoc 70°C/3min), chimic (Cu-Ag ionizare, ClO₂ dozare), UV-C 254 nm in-line"
                    />
                    {acm.legionellaMethod && (() => {
                      const lm = ACM_ANTI_LEGIONELLA.find(l => l.id === acm.legionellaMethod);
                      if (!lm) return null;
                      return (
                        <div className="bg-white/[0.02] rounded-lg p-3 text-[11px] space-y-1">
                          <div className="flex justify-between"><span className="opacity-50">Metodă</span><span className="font-mono text-amber-400 capitalize">{lm.method}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Supliment energetic</span><span className="font-mono">{(lm.energyOverhead * 100).toFixed(1)}% / an</span></div>
                          <div className="flex justify-between gap-2"><span className="opacity-50 shrink-0">Sursă</span><span className="font-mono opacity-70 text-[10px] text-right truncate" title={lm.source}>{lm.source}</span></div>
                          {lm.notes && <div className="text-[10px] opacity-60 pt-1 border-t border-white/5">{lm.notes}</div>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Tip izolație conducte (10 tipologii: elastomeric / PE / vată / aerogel / PUR pre-izolat / azbest legacy) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label={t("Tip izolație conducte (avansat)",lang)}
                      value={acm.pipeInsulationType || ""}
                      placeholder={t("Selectează (opțional)")}
                      onChange={trackAndSet("pipeInsulationType", "Step3.acm.pipeInsulationType", setAcm)}
                      options={buildOptions(PIPE_INSULATION_TYPES, lang, building?.category, false, onlyPartners)}
                      tooltip="SR EN ISO 12241 + SR EN 14304/14313/14303 + ISO 8497 — elastomerică Armaflex-class, spumă PE, vată minerală cu vapor barrier, aerogel ultra-subțire, PUR pre-izolate, sticlă celulară HT, UV-PVC outdoor, azbest legacy (FLAG REMOVE), bare/none, perlit istoric"
                    />
                    {acm.pipeInsulationType && (() => {
                      const it = PIPE_INSULATION_TYPES.find(i => i.id === acm.pipeInsulationType);
                      if (!it) return null;
                      const isAsbestos = it.id === "INS_ASBESTOS_LEGACY";
                      const isBare = it.id === "INS_BARE";
                      return (
                        <div className={cn("rounded-lg p-3 text-[11px] space-y-1",
                          isAsbestos ? "bg-red-500/10 border border-red-500/30" :
                          isBare ? "bg-amber-500/10 border border-amber-500/20" :
                          "bg-white/[0.02]")}>
                          {isAsbestos && (
                            <div className="font-bold text-red-400 mb-1.5">⚠ FLAG CRITIC: AZBEST — necesită îndepărtare prin firmă autorizată ANSESM (HG 124/2003)</div>
                          )}
                          {isBare && (
                            <div className="font-bold text-amber-400 mb-1.5">⚠ FLAG: țeavă neizolată — măsură P0 retrofit obligatorie</div>
                          )}
                          <div className="flex justify-between"><span className="opacity-50">λ izolație</span><span className="font-mono text-amber-400">{it.lambda ?? "—"} W/(m·K)</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Clasă grosime ISO 12241</span><span className="font-mono">{it.thicknessClass}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Randament conducte η_pipe</span><span className="font-mono">{it.etaPipe}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Limită temp.</span><span className="font-mono">{it.tempLimit ?? "—"} °C</span></div>
                          <div className="flex justify-between gap-2"><span className="opacity-50 shrink-0">Sursă</span><span className="font-mono opacity-70 text-[10px] text-right truncate" title={it.source}>{it.source}</span></div>
                          {it.notes && <div className="text-[10px] opacity-60 pt-1 border-t border-white/5">{it.notes}</div>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              {/* Sprint 4b — panou validări input ACM (error / warning / info) */}
              {(acmValidation.errors.length > 0 || acmValidation.warnings.length > 0 || acmValidation.info.length > 0) && (
                <Card title={t("Validări intrări ACM",lang)}>
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="opacity-50">{t("Stare configurație")}</span>
                    <span className="font-mono font-semibold" style={{color: acmSummary.color}}>
                      {acmSummary.label}
                    </span>
                  </div>
                  {acmValidation.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs space-y-1 mb-2">
                      <div className="font-medium text-red-400">🛑 {t("Erori blocante")}</div>
                      {acmValidation.errors.map((e, i) => (
                        <div key={i} className="text-red-300/80 leading-relaxed">
                          • <span className="font-mono text-[10px] opacity-60">[{e.field}]</span> {e.message}
                          {e.reference && <span className="text-[10px] opacity-40 ml-2">({e.reference})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {acmValidation.warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-xs space-y-1 mb-2">
                      <div className="font-medium text-amber-400">⚠ {t("Avertizări")}</div>
                      {acmValidation.warnings.map((w, i) => (
                        <div key={i} className="text-amber-300/80 leading-relaxed">
                          • <span className="font-mono text-[10px] opacity-60">[{w.field}]</span> {w.message}
                          {w.reference && <span className="text-[10px] opacity-40 ml-2">({w.reference})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {acmValidation.info.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-medium text-blue-400">💡 {t("Recomandări")}</div>
                      {acmValidation.info.map((inf, i) => (
                        <div key={i} className="text-blue-300/80 leading-relaxed">
                          • <span className="font-mono text-[10px] opacity-60">[{inf.field}]</span> {inf.message}
                          {inf.reference && <span className="text-[10px] opacity-40 ml-2">({inf.reference})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
            );
          })()}

          {/* ── CLIMATIZARE ── Sprint 3a (17 apr 2026): SEER + η separate + calc orar */}
          {instSubTab === "cooling" && (() => {
            // Validări input Climatizare — Sprint 3a
            const coolErrors = [];
            const eerNum = parseFloat(cooling.eer);
            const seerNum = parseFloat(cooling.seer);
            const powerNum = parseFloat(cooling.power);
            const areaNum = parseFloat(cooling.cooledArea);
            const Au = parseFloat(building.areaUseful) || 0;
            const etaEmNum = parseFloat(cooling.eta_em);
            const etaDistNum = parseFloat(cooling.eta_dist);
            const etaCtrlNum = parseFloat(cooling.eta_ctrl);
            const setpointNum = parseFloat(cooling.setpoint);
            // Sprint 3b — validări noi W_aux + night vent
            const pAuxPumpsNum = parseFloat(cooling.P_aux_pumps);
            const pAuxFansNum = parseFloat(cooling.P_aux_fans);
            const tCoolHoursNum = parseFloat(cooling.t_cooling_hours);
            const nNightNum = parseFloat(cooling.n_night);
            if (cooling.eer && (eerNum <= 0 || eerNum > 20)) {
              coolErrors.push("EER nominal: trebuie în intervalul 0 – 20 (valori tipice 2.5–6.0 pentru split/chiller).");
            }
            if (cooling.seer && (seerNum <= 0 || seerNum > 20)) {
              coolErrors.push("SEER sezonier: trebuie în intervalul 0 – 20 (EN 14825 — valori tipice 4.0–9.0).");
            }
            if (cooling.power && powerNum < 0) {
              coolErrors.push("Putere frigorifică: trebuie ≥ 0 kW (sanity check).");
            }
            if (cooling.cooledArea && Au > 0 && (areaNum < 0 || areaNum > Au)) {
              coolErrors.push(`Suprafață răcită: trebuie în intervalul 0 – ${Au} m² (maximum = Au).`);
            }
            if (cooling.eta_em && (etaEmNum < 0.7 || etaEmNum > 1.0)) {
              coolErrors.push("η emisie răcire: trebuie în intervalul 0.70 – 1.00 (EN 15316-2).");
            }
            if (cooling.eta_dist && (etaDistNum < 0.7 || etaDistNum > 1.0)) {
              coolErrors.push("η distribuție răcire: trebuie în intervalul 0.70 – 1.00 (EN 15316-3).");
            }
            if (cooling.eta_ctrl && (etaCtrlNum < 0.7 || etaCtrlNum > 1.10)) {
              coolErrors.push("η control răcire: trebuie în intervalul 0.70 – 1.10 (EN 15232-1 BACS A poate >1).");
            }
            if (cooling.setpoint && (setpointNum < 20 || setpointNum > 30)) {
              coolErrors.push("Setpoint răcire: trebuie în intervalul 20 – 30 °C (EN 16798-1 cat. I–IV).");
            }
            if (cooling.P_aux_pumps && (pAuxPumpsNum < 0 || pAuxPumpsNum > 500)) {
              coolErrors.push("Putere pompe circuit rece: trebuie între 0 și 500 kW (sanity check EN 15316-4-2).");
            }
            if (cooling.P_aux_fans && (pAuxFansNum < 0 || pAuxFansNum > 500)) {
              coolErrors.push("Putere ventilatoare fan-coil/condensator: trebuie între 0 și 500 kW.");
            }
            if (cooling.t_cooling_hours && (tCoolHoursNum < 0 || tCoolHoursNum > 8760)) {
              coolErrors.push("Ore operare răcire: trebuie între 0 și 8760 h/an.");
            }
            if (cooling.n_night && (nNightNum < 0 || nNightNum > 10)) {
              coolErrors.push("Rată ventilație nocturnă: trebuie între 0 și 10 h⁻¹ (tipic 1.5–3.0).");
            }
            const hasErrors = coolErrors.length > 0;
            const coolSysSelected = COOLING_SYSTEMS.find(s => s.id === cooling.system);
            const autoSeer = coolSysSelected ? coolSysSelected.seer : 0;
            return (
            <>
              <Card title={t("Sistem de răcire",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={cooling.hasCooling} onChange={e => setCooling(p=>({...p,hasCooling:e.target.checked}))}
                      className="accent-amber-500" />
                    <span className="font-medium">{t("Clădirea dispune de sistem de răcire/climatizare")}</span>
                  </label>

                  {cooling.hasCooling && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <Select label={t("Tip sistem",lang)} value={cooling.system} onChange={v => {
                          const sys = COOLING_SYSTEMS.find(s=>s.id===v);
                          setCooling(p=>({...p,
                            system:v,
                            eer:sys?.eer.toString()||"",
                            seer:sys?.seer && sys.seer > 0 ? sys.seer.toString() : "",
                          }));
                        }} options={buildOptions(COOLING_SYSTEMS.filter(s=>s.id!=="NONE"), lang, building?.category, false, onlyPartners)} />
                        <Input label={t("EER nominal",lang)} value={cooling.eer || (coolSysSelected?.eer||"").toString()}
                          onChange={v => setCooling(p=>({...p,eer:v}))} type="number" step="0.1" min="0" max="20"
                          tooltip="EER = Energy Efficiency Ratio la sarcina nominală (ISO 5151 / EN 14511, punct A = 27/35 °C). Valoare etichetă echipament." />
                        <Input label={t("SEER sezonier",lang)} value={cooling.seer}
                          onChange={v => setCooling(p=>({...p,seer:v}))} type="number" step="0.1" min="0" max="20"
                          placeholder={autoSeer > 0 ? `auto: ${autoSeer} (catalog)` : (eerNum > 0 ? `auto: ${(eerNum * 1.8).toFixed(1)} (EER × 1.8)` : "auto")}
                          tooltip="SEER = Seasonal EER (EN 14825). Pentru calcul anual corect folosește SEER (tipic 1.5–1.7× EER). Gol → catalog → EER × 1.8." />
                        <Input label={t("Putere frigorifică",lang)} value={cooling.power} onChange={v => setCooling(p=>({...p,power:v}))} type="number" unit="kW" min="0" />
                        <Input label={t("Suprafață răcită",lang)} value={cooling.cooledArea} onChange={v => setCooling(p=>({...p,cooledArea:v}))} type="number" unit="m²"
                          min="0" max={Au || undefined}
                          placeholder={`${building.areaUseful || "= Au"}`} />
                        <Input label={t("Setpoint răcire",lang)} value={cooling.setpoint || "26"} onChange={v => setCooling(p=>({...p,setpoint:v}))} type="number" unit="°C"
                          min="20" max="30" step="0.5"
                          tooltip="Temperatura interioară de confort vara. EN 16798-1: cat. I = 24.5°C, II = 26°C, III = 27°C, IV = 28°C." />
                      </div>

                      {/* Metoda de calcul + avertizare SEER ≠ EER */}
                      <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={cooling.useHourly !== false}
                            onChange={e => setCooling(p=>({...p,useHourly:e.target.checked}))}
                            className="accent-blue-500" />
                          <span className="font-medium text-blue-300">Metoda orară (precizie ridicată) — SR EN ISO 52016-1 + CIBSE Guide A</span>
                        </label>
                        <div className="text-[11px] opacity-60 leading-relaxed">
                          ✓ Activ: calcul pe 8760 h cu 9 orientări + PVGIS + profil orar ocupare + sarcina de vârf.<br/>
                          ✗ Inactiv: metoda lunară ISO 13790 (mai rapid, mai puțin precis pentru clădiri cu sarcini variabile).
                        </div>
                      </div>

                      {/* η RANDAMENTE RĂCIRE — EN 15316-2 (paritate cu încălzire) */}
                      <div className="mt-3">
                        <div className="text-xs font-medium text-amber-400 mb-2">RANDAMENTE SEPARATE — SR EN 15316-2:2017</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select label={t("Tip distribuție răcire",lang)} value={cooling.distributionType || "apa_rece_izolat_int"} onChange={v => {
                            const di = COOLING_DISTRIBUTION_EFFICIENCY.find(d=>d.id===v);
                            setCooling(p=>({...p,distributionType:v,eta_dist:di?.eta.toString()||"0.95"}));
                          }} options={buildOptions(COOLING_DISTRIBUTION_EFFICIENCY, lang, building?.category, false, onlyPartners)} />
                          <Input label="η distribuție" value={cooling.eta_dist || "0.95"} onChange={v => setCooling(p=>({...p,eta_dist:v}))}
                            type="number" step="0.01" min="0.70" max="1.00"
                            tooltip="Randament distribuție răcire (0.70–1.00). Conform EN 15316-3 Tab.7." />

                          <Select label={t("Tip emisie răcire",lang)} value={cooling.emissionType || "fan_coil"} onChange={v => {
                            const em = COOLING_EMISSION_EFFICIENCY.find(e=>e.id===v);
                            setCooling(p=>({...p,emissionType:v,eta_em:em?.eta.toString()||"0.97"}));
                          }} options={buildOptions(COOLING_EMISSION_EFFICIENCY, lang, building?.category, false, onlyPartners)} />
                          <Input label="η emisie" value={cooling.eta_em || "0.97"} onChange={v => setCooling(p=>({...p,eta_em:v}))}
                            type="number" step="0.01" min="0.70" max="1.00"
                            tooltip="Randament emisie răcire (0.70–1.00). Conform EN 15316-2 Tab.7." />

                          <Select label={t("Reglare răcire",lang)} value={cooling.controlType || "termostat_prop"} onChange={v => {
                            const ct = COOLING_CONTROL_EFFICIENCY.find(c=>c.id===v);
                            setCooling(p=>({...p,controlType:v,eta_ctrl:ct?.eta.toString()||"0.96"}));
                          }} options={buildOptions(COOLING_CONTROL_EFFICIENCY, lang, building?.category, false, onlyPartners)} />
                          <Input label="η control" value={cooling.eta_ctrl || "0.96"} onChange={v => setCooling(p=>({...p,eta_ctrl:v}))}
                            type="number" step="0.01" min="0.70" max="1.10"
                            tooltip="Randament control răcire (0.70–1.10). BACS clasa A/B poate >1.00 (EN 15232-1 / ISO 52120-1)." />
                        </div>
                      </div>

                      {/* Sprint 3b — AUXILIARE ELECTRICE RĂCIRE (EN 15316-4-2) */}
                      <div className="mt-3">
                        <div className="text-xs font-medium text-amber-400 mb-2">AUXILIARE ELECTRICE — SR EN 15316-4-2:2017</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Pompe circuit apă rece" value={cooling.P_aux_pumps} onChange={v => setCooling(p=>({...p,P_aux_pumps:v}))}
                            type="number" unit="kW" min="0" max="500" step="0.01"
                            placeholder="0 = fără pompe (split aer-aer)"
                            tooltip="Putere electrică TOTALĂ pompe circulație agent rece (chiller apă, PC hidronică, fan-coils). Tipic 0.5-3% din putere frigorifică." />
                          <Input label="Ventilatoare fan-coil / condensator" value={cooling.P_aux_fans} onChange={v => setCooling(p=>({...p,P_aux_fans:v}))}
                            type="number" unit="kW" min="0" max="500" step="0.01"
                            placeholder="0 = fără (chiller apă)"
                            tooltip="Putere electrică TOTALĂ ventilatoare fan-coil-uri + ventilator condensator chiller aer-aer. Tipic 3-8% din putere frigorifică." />
                          <Input label="Ore operare răcire" value={cooling.t_cooling_hours} onChange={v => setCooling(p=>({...p,t_cooling_hours:v}))}
                            type="number" unit="h/an" min="0" max="8760" step="10"
                            placeholder={instSummary ? `auto: ${instSummary.t_cooling_hours} h (${building.category || "?"} × zona ${selectedClimate?.zone || "III"})` : "auto"}
                            tooltip="Ore efective funcționare chiller/PC. Gol → default Mc 001 Tab. 9.3 per categorie × zonă climatică." />
                        </div>
                        <div className="text-[11px] opacity-50 mt-2 leading-relaxed">
                          E<sub>aux</sub> = (P<sub>pompe</sub> + P<sub>ventilatoare</sub>) × t<sub>operare</sub> — se adaugă la consumul compresorului.
                        </div>

                        {/* Sprint 9b — breakdown tabel compresor / auxiliare / free cooling */}
                        {instSummary && instSummary.qf_c != null && instSummary.qf_c > 0 && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border-t border-amber-500/20 pt-2">
                            <div className="bg-amber-500/5 rounded p-2">
                              <div className="opacity-60">Compresor</div>
                              <div className="font-mono font-medium">{Math.round(instSummary.qf_c_compressor || 0)} kWh</div>
                            </div>
                            <div className="bg-amber-500/5 rounded p-2">
                              <div className="opacity-60">Pompe</div>
                              <div className="font-mono font-medium">{Math.round(instSummary.qf_c_aux_pumps || 0)} kWh</div>
                            </div>
                            <div className="bg-amber-500/5 rounded p-2">
                              <div className="opacity-60">Ventilatoare</div>
                              <div className="font-mono font-medium">{Math.round(instSummary.qf_c_aux_fans || 0)} kWh</div>
                            </div>
                            <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30">
                              <div className="opacity-80 font-medium">Total răcire</div>
                              <div className="font-mono font-semibold text-amber-300">{Math.round(instSummary.qf_c)} kWh</div>
                            </div>
                            {instSummary.Q_night_vent_reduction > 0 && (
                              <div className="col-span-2 sm:col-span-4 bg-emerald-500/10 rounded p-2 border border-emerald-500/30 flex justify-between items-center">
                                <span className="opacity-80">Free cooling nocturn evitat (EN 16798-9)</span>
                                <span className="font-mono font-semibold text-emerald-300">−{Math.round(instSummary.Q_night_vent_reduction)} kWh Q<sub>NC</sub></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sprint 3b — FREE COOLING NOCTURN (EN 16798-9 + EN ISO 13790 §12.2) */}
                      <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={!!cooling.hasNightVent}
                            onChange={e => setCooling(p=>({...p,hasNightVent:e.target.checked}))}
                            className="accent-emerald-500" />
                          <span className="font-medium text-emerald-300">Free cooling nocturn (ventilație pasivă de noapte)</span>
                          <span className="text-[10px] opacity-40">(economie 20–40% răcire pentru birouri/școli cu masă termică)</span>
                        </label>
                        {cooling.hasNightVent && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Input label={t("Rată schimb aer nocturn",lang)} value={cooling.n_night} onChange={v => setCooling(p=>({...p,n_night:v}))}
                              type="number" unit="h⁻¹" step="0.1" min="0" max="10"
                              placeholder="2.0 (EN 16798-1 cat. II)"
                              tooltip="Rata de ventilație naturală/mecanică pe timp de noapte (22:00–06:00). Tipic 1.5–3.0 h⁻¹." />
                            <Select label={t("Categorie confort",lang)} value={cooling.comfortCategory || "II"} onChange={v => setCooling(p=>({...p,comfortCategory:v}))}
                              options={[
                                { value:"I",   label:"Cat. I — Confort ridicat (ΔT ≥ 3K, n ≥ 2.0)" },
                                { value:"II",  label:"Cat. II — Confort normal (ΔT ≥ 3K, n ≥ 1.5)" },
                                { value:"III", label:"Cat. III — Confort moderat (ΔT ≥ 2K, n ≥ 1.0)" },
                                { value:"IV",  label:"Cat. IV — Confort minim (ΔT ≥ 2K, n ≥ 0.8)" },
                              ]} />
                          </div>
                        )}
                        {cooling.hasNightVent && instSummary?.nightVentResult && (
                          <div className="text-[11px] leading-relaxed pt-1 border-t border-emerald-500/10">
                            <span className="opacity-60">Fezabilitate:</span>{" "}
                            <span className={cn("font-medium", instSummary.nightVentResult.feasible ? "text-emerald-400" : "text-orange-400")}>
                              {instSummary.nightVentResult.feasible ? "✓ da" : "✗ nu (ΔT insuficient)"}
                            </span>{" "}
                            · <span className="opacity-60">ΔT:</span> <span className="font-mono">{instSummary.nightVentResult.delta_T}K</span>
                            {instSummary.nightVentResult.feasible && (
                              <>
                                {" · "}<span className="opacity-60">Reducere Q<sub>NC</sub>:</span>{" "}
                                <span className="font-mono text-emerald-400">{Math.round(instSummary.Q_night_vent_reduction)} kWh/an</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sprint 3b — OVERRIDE TIPOLOGIE APORTURI INTERNE (Mc 001 Tab. 9.2 + CIBSE) */}
                      <div className="mt-3">
                        <Select label={t("Tipologie aporturi interne (pentru calcul orar)",lang)}
                          value={cooling.internalGainsOverride || ""} onChange={v => setCooling(p=>({...p,internalGainsOverride:v}))}
                          options={[
                            { value:"",            label:`Auto (din categoria clădirii: ${building.category || "?"} → ${instSummary?.internalGainsType || "office"})` },
                            { value:"office",      label:"Birouri (35 W/m², ocupare 8-18)" },
                            { value:"retail",      label:"Comerț / retail (40 W/m², ocupare 9-21)" },
                            { value:"residential", label:"Rezidențial (15 W/m², ocupare seară+noapte)" },
                            { value:"school",      label:"Școală / educație (35 W/m², ocupare 8-16)" },
                            { value:"hospital",    label:"Spital / sănătate (50 W/m², ocupare 24/24)" },
                          ]}
                        />
                        <div className="text-[11px] opacity-50 mt-1 leading-relaxed">
                          Influențează profilul orar al aporturilor interne (persoane + echipamente + iluminat) folosit în calculul orar CIBSE.
                        </div>
                      </div>

                      {hasErrors && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs space-y-1 mt-3">
                          <div className="font-medium text-red-400 mb-1">⚠ Valori în afara intervalului admis</div>
                          {coolErrors.map((e, i) => (
                            <div key={i} className="text-red-300/80 leading-relaxed">• {e}</div>
                          ))}
                        </div>
                      )}

                      {/* Sprint 3b — BREAKDOWN consum răcire (compresor vs. auxiliare) */}
                      {instSummary?.hasCool && (
                        <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-300 mb-2">Defalcare consum răcire (kWh/an)</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="opacity-60">Compresor chiller/PC</span>
                              <span className="font-mono">{Math.round(instSummary.qf_c_compressor || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Pompe circuit apă rece</span>
                              <span className="font-mono">{Math.round(instSummary.qf_c_aux_pumps || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Ventilatoare fan-coil/condensator</span>
                              <span className="font-mono">{Math.round(instSummary.qf_c_aux_fans || 0)}</span>
                            </div>
                            <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1 font-medium">
                              <span>TOTAL răcire</span>
                              <span className="font-mono text-blue-300">{Math.round(instSummary.qf_c || 0)}</span>
                            </div>
                            {instSummary.Q_night_vent_reduction > 0 && (
                              <div className="flex justify-between text-emerald-400 pt-1">
                                <span>↓ Evitat prin free cooling</span>
                                <span className="font-mono">−{Math.round(instSummary.Q_night_vent_reduction)} (necesar termic)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Distribuție legacy — păstrat pentru compatibilitate */}
                      <div className="mt-3">
                        <Select label={t("Calitate izolație distribuție (legacy)",lang)} value={cooling.distribution} onChange={v => setCooling(p=>({...p,distribution:v}))}
                          options={buildOptions(DISTRIBUTION_QUALITY.slice(0,4), lang, building?.category, false, onlyPartners)} />
                      </div>
                    </>
                  )}

                  {!cooling.hasCooling && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mt-2">
                      <div className="text-xs text-amber-400 font-medium mb-1">Notă Mc 001-2022</div>
                      <div className="text-xs opacity-60">Dacă clădirea nu dispune de sistem de răcire, se aplică grila de clasare fără răcire. Se va calcula totuși numărul de ore cu temperatura interioară peste limita de confort (27°C) în regim liber.</div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sugestii orientative climatizare (fără brand) — Task 2 onSelect activ */}
              {cooling.hasCooling !== false && (
                <>
                  <SuggestionPanel
                    suggestions={coolingSuggestions}
                    title={t("Soluții recomandate pentru climatizare",lang)}
                    subtitle={t("Sisteme răcire orientative — click pe un card pentru a aplica.",lang)}
                    mode="card"
                    onSelect={handleApplyCoolingSuggestion}
                    lang={lang}
                  />
                  {coolingComplianceStatus === "ok" && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-1 px-2">
                      <span aria-hidden="true">✅</span>
                      <span>Sistem răcire conform nZEB (SEER ≥ 5.0)</span>
                    </div>
                  )}
                  {coolingComplianceStatus === "warning" && (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5 mt-1 px-2">
                      <span aria-hidden="true">⚠</span>
                      <span>SEER {parseFloat(cooling.seer).toFixed(1)} sub pragul nZEB 5.0 — considerați un sistem inverter premium</span>
                    </div>
                  )}
                </>
              )}
            </>
            );
          })()}

          {/* ── VENTILARE ── */}
          {instSubTab === "ventilation" && (() => {
            // Validări input ventilație — Sprint 1 fix (17 apr 2026)
            // Conform Mc 001-2022 Partea III + EN 16798-3 + EN 308
            const ventErrors = [];
            const airflowNum = parseFloat(ventilation.airflow);
            const fanPowerNum = parseFloat(ventilation.fanPower);
            const hrNum = parseFloat(ventilation.hrEfficiency);
            const hoursNum = parseFloat(ventilation.operatingHours);
            if (ventilation.airflow && (airflowNum <= 0 || airflowNum > 100000)) {
              ventErrors.push("Debit aer: trebuie în intervalul 0 – 100 000 m³/h (EN 16798-3).");
            }
            if (ventilation.fanPower && (fanPowerNum < 0 || fanPowerNum > 50000)) {
              ventErrors.push("Putere ventilator: trebuie între 0 și 50 000 W (sanity check).");
            }
            if (ventilation.hrEfficiency && (hrNum < 0 || hrNum > 95)) {
              ventErrors.push("Randament recuperare: trebuie între 0 și 95 % (EN 308 — limită fizică realistă).");
            }
            if (ventilation.operatingHours && (hoursNum < 0 || hoursNum > 8760)) {
              ventErrors.push("Ore funcționare: trebuie între 0 și 8760 h/an (= 365 zile × 24 h).");
            }
            const hasErrors = ventErrors.length > 0;
            return (
            <>
              <Card title={t("Sistem de ventilare",lang)}>
                <div className="space-y-3">
                  <Select label={t("Tip ventilare",lang)} value={ventilation.type} onChange={v => {
                    if (v) { const ps = getActivePartnersForEntry(v); if (ps.length > 0) logPartnerClick(v, ps.map(p=>p.id), "Step3.ventilation.type"); }
                    const vt = VENTILATION_TYPES.find(t=>t.id===v);
                    setVentilation(p=>({...p,type:v,hrEfficiency:vt?.hrEta ? (vt.hrEta*100).toFixed(0) : ""}));
                  }} options={buildOptions(VENTILATION_TYPES, lang, building?.category, true, onlyPartners)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label={t("Debit aer proaspăt",lang)} value={ventilation.airflow} onChange={v => setVentilation(p=>({...p,airflow:v}))} type="number" unit="m3/h"
                      min="0" max="100000" step="1"
                      placeholder={`auto: ${((parseFloat(building.volume)||100)*0.5).toFixed(0)}`}
                      tooltip="Interval valid: 0 – 100 000 m³/h. EN 16798-3 — debit aer proaspăt conform categoriei IDA." />
                    <Input label={t("Putere ventilator",lang)} value={ventilation.fanPower} onChange={v => setVentilation(p=>({...p,fanPower:v}))} type="number" unit="W"
                      min="0" max="50000" step="1"
                      disabled={ventilation.type==="NAT"}
                      tooltip="Putere electrică nominală ventilator (W). Când e completat, are prioritate față de SFP din catalog." />
                    <Input label={t("Ore funcționare/an",lang)} value={ventilation.operatingHours} onChange={v => setVentilation(p=>({...p,operatingHours:v}))} type="number" unit="h/an"
                      min="0" max="8760" step="1"
                      placeholder={`auto: 8760 (funcționare continuă)`}
                      disabled={ventilation.type==="NAT"}
                      tooltip="Ore funcționare efectivă ventilator. Maxim 8760 h/an. Default Mc 001: funcționare continuă pentru CMV." />
                    {VENTILATION_TYPES.find(t=>t.id===ventilation.type)?.hasHR && (
                      <Input label={t("Randament recuperare",lang)} value={ventilation.hrEfficiency} onChange={v => setVentilation(p=>({...p,hrEfficiency:v}))} type="number" unit="%" step="1"
                        min="0" max="95"
                        tooltip="Randament schimbător de căldură. Interval valid: 0 – 95 % (EN 308). Passivhaus ≥ 75 %." />
                    )}
                  </div>

                  {hasErrors && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-medium text-red-400 mb-1">⚠ Valori în afara intervalului admis</div>
                      {ventErrors.map((e, i) => (
                        <div key={i} className="text-red-300/80 leading-relaxed">• {e}</div>
                      ))}
                    </div>
                  )}

                  {ventilation.type === "NAT" && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                      <div className="text-xs text-amber-400 font-medium mb-1">{t("Ventilare naturală")}</div>
                      <div className="text-xs opacity-60">{lang==="EN"?"Ventilation rate n = 0.5 h⁻¹ (mandatory minimum) is applied. No electrical energy is consumed for ventilation, but there is no heat recovery.":"Se consideră rata de ventilare n = 0,5 h-1 (minimul obligatoriu). Nu se consumă energie electrică pentru ventilare, dar nu există recuperare de căldură."}</div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sugestii orientative ventilare (fără brand) — Task 2+7 activ */}
              <SuggestionPanel
                suggestions={ventilationSuggestions}
                title={t("Soluții recomandate pentru ventilare mecanică",lang)}
                subtitle={t("VMC dimensionat automat după suprafață — click pe un card pentru a aplica.",lang)}
                mode="card"
                onSelect={handleApplyVentilationSuggestion}
                lang={lang}
              />
              {ventilationComplianceStatus === "ok" && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-1 px-2">
                  <span aria-hidden="true">✅</span>
                  <span>VMC cu recuperare ≥ 85% — conform nZEB / Passivhaus</span>
                </div>
              )}
              {ventilationComplianceStatus === "warning" && (
                <div className="text-[11px] text-amber-400 flex items-center gap-1.5 mt-1 px-2">
                  <span aria-hidden="true">⚠</span>
                  <span>Ventilare fără recuperare suficientă — nZEB cere η ≥ 85% (preferați MEC_HR85+ sau DOAS)</span>
                </div>
              )}
            </>
            );
          })()}

          {/* ── ILUMINAT ── */}
          {instSubTab === "lighting" && (() => {
            // Validări input iluminat — Sprint 2 fix (17 apr 2026)
            // Conform Mc 001-2022 Partea IV + EN 15193-1 + EN 12464-1
            const lightErrors = [];
            const pDensNum = parseFloat(lighting.pDensity);
            const fCtrlNum = parseFloat(lighting.fCtrl);
            const fDNum = parseFloat(lighting.naturalLightRatio);
            const hoursNum = parseFloat(lighting.operatingHours);
            const pEmNum = parseFloat(lighting.pEmergency);
            const pStbNum = parseFloat(lighting.pStandby);
            if (lighting.pDensity && (pDensNum <= 0 || pDensNum > 50)) {
              lightErrors.push("Densitate putere: trebuie în intervalul 0 – 50 W/m² (EN 15193-1).");
            }
            if (lighting.fCtrl && (fCtrlNum < 0.3 || fCtrlNum > 1.0)) {
              lightErrors.push("Factor control F_C: trebuie în intervalul 0.3 – 1.0 (EN 15193-1 Tab. B.6).");
            }
            if (lighting.naturalLightRatio && (fDNum < 0 || fDNum > 80)) {
              lightErrors.push("Raport lumină naturală: trebuie între 0 și 80 %.");
            }
            if (lighting.operatingHours && (hoursNum <= 0 || hoursNum > 8760)) {
              lightErrors.push("Ore funcționare: trebuie între 0 și 8760 h/an.");
            }
            if (lighting.pEmergency && (pEmNum < 0 || pEmNum > 5)) {
              lightErrors.push("Iluminat urgență: trebuie între 0 și 5 W/m² (EN 1838).");
            }
            if (lighting.pStandby && (pStbNum < 0 || pStbNum > 2)) {
              lightErrors.push("Standby drivere/senzori: trebuie între 0 și 2 W/m² (EN 15193-1 Annex B).");
            }
            const hasLightErrors = lightErrors.length > 0;
            const isRes = ["RI","RC","RA"].includes(building.category);
            return (
            <>
              <Card title={t("Iluminat artificial (LENI)",lang)}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label={t("Tip sursă de lumină predominantă",lang)} value={lighting.type} onChange={v => {
                      if (v) { const ps = getActivePartnersForEntry(v); if (ps.length > 0) logPartnerClick(v, ps.map(p=>p.id), "Step3.lighting.type"); }
                      const lt = LIGHTING_TYPES.find(t=>t.id===v);
                      setLighting(p=>({...p, type:v, pDensity: lt?.pDensity?.toString() || p.pDensity}));
                    }}
                      options={buildOptions(LIGHTING_TYPES, lang, building?.category, true, onlyPartners)} />
                    <Input label={t("Densitate putere instalată",lang)} value={lighting.pDensity} onChange={v => setLighting(p=>({...p,pDensity:v}))} type="number" unit="W/m2" step="0.1" min="0" max="50"
                      tooltip="EN 15193-1: tipic rezidențial 3–8 W/m², birouri 8–12 W/m², industrial 10–20 W/m²" />
                    <Input label={t("Ore funcționare / an",lang)} value={lighting.operatingHours} onChange={v => setLighting(p=>({...p,operatingHours:v}))} type="number" unit="h/an" min="0" max="8760"
                      placeholder={`auto: ${LIGHTING_HOURS[building.category] || 1800} h/an (${building.category || "—"})`}
                      tooltip="Gol → default categorie (Mc 001-2022 Anexa). Rezidențial 1800h, birouri 2500h, spital 3500h, supermarket 5000h." />
                    <Input label={t("Raport lumină naturală",lang)} value={lighting.naturalLightRatio} onChange={v => setLighting(p=>({...p,naturalLightRatio:v}))} type="number" unit="%" min="0" max="80"
                      tooltip="Factor F_d aplicat DOAR pe termenul diurn (Sprint 2 fix: nu există daylight noaptea)." />
                    <Select label={t("Sistem de control",lang)} value={lighting.controlType} onChange={v => {
                      if (v) { const ps = getActivePartnersForEntry(v); if (ps.length > 0) logPartnerClick(v, ps.map(p=>p.id), "Step3.lighting.controlType"); }
                      const ctrl = LIGHTING_CONTROL.find(c=>c.id===v);
                      setLighting(p=>({...p, controlType:v, fCtrl: ctrl?.fCtrl?.toString() || p.fCtrl}));
                    }}
                      options={buildOptions(LIGHTING_CONTROL, lang, building?.category, true, onlyPartners)} />
                    <Input label={t("Factor control (F_C)",lang)} value={lighting.fCtrl} onChange={v => setLighting(p=>({...p,fCtrl:v}))} type="number" step="0.01" min="0.3" max="1.0"
                      tooltip="EN 15193-1 Tab. B.6: manual 1.00, PIR 0.80, DALI 0.45, auto integral 0.40" />
                  </div>

                  {/* ── Sprint 2: W_P (energie parazită) EN 15193-1 Annex B ── */}
                  <div className="border-t border-white/5 pt-3 mt-2">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">{t("Energie parazită (W_P) — EN 15193-1 Annex B")}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label={t("Iluminat de urgență")} value={lighting.pEmergency} onChange={v => setLighting(p=>({...p,pEmergency:v}))} type="number" unit="W/m2" step="0.1" min="0" max="5"
                        placeholder={`auto: ${isRes ? "0" : "1.0"} W/m² (${isRes ? "rezidențial" : "clădire publică"})`}
                        tooltip="EN 1838: iluminat siguranță permanent (8760h). Rezidențial default 0, non-rezidențial 1.0 W/m²." />
                      <Input label={t("Standby drivere / senzori")} value={lighting.pStandby} onChange={v => setLighting(p=>({...p,pStandby:v}))} type="number" unit="W/m2" step="0.1" min="0" max="2"
                        placeholder="auto: 0.3 W/m²"
                        tooltip="Consum drivere LED + senzori când iluminat principal OFF × (8760 − ore funcționare)." />
                    </div>
                  </div>

                  {hasLightErrors && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-medium text-red-400 mb-1">⚠ Valori în afara intervalului admis</div>
                      {lightErrors.map((e, i) => (
                        <div key={i} className="text-red-300/80 leading-relaxed">• {e}</div>
                      ))}
                    </div>
                  )}

                  {instSummary && (
                    <div className="bg-white/[0.03] rounded-lg p-4 mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-50">{t("Indicator LENI calculat", lang)}</span>
                        <span className={cn("text-lg font-mono font-bold",
                          instSummary.leniStatus === "excelent" ? "text-emerald-400" :
                          instSummary.leniStatus === "conform" ? "text-amber-400" : "text-red-400")}>
                          {instSummary.leni.toFixed(1)} <span className="text-xs opacity-40 font-normal">kWh/(m2·an)</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] opacity-60 border-t border-white/5 pt-2">
                        <div>W_L <span className="font-mono text-amber-300/80">{instSummary.W_L.toFixed(1)}</span></div>
                        <div>W_em <span className="font-mono text-amber-300/80">{instSummary.W_em.toFixed(2)}</span></div>
                        <div>W_sb <span className="font-mono text-amber-300/80">{instSummary.W_standby.toFixed(2)}</span></div>
                      </div>
                      <div className="text-[11px] opacity-50">
                        LENI_max categorie {building.category || "—"}: <span className="font-mono">{instSummary.leniMax} kWh/(m²·an)</span> — EN 15193-1 Tab. NA.1
                      </div>
                    </div>
                  )}

                  {instSummary?.leniStatus === "neconform" && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs">
                      <div className="font-medium text-red-400 mb-1">⚠ NECONFORM — LENI depășește limita</div>
                      <div className="text-red-300/80 leading-relaxed">
                        LENI calculat {instSummary.leni.toFixed(1)} kWh/(m²·an) &gt; LENI_max {instSummary.leniMax} kWh/(m²·an) conform EN 15193-1 + Mc 001-2022 Partea IV.
                        Reduceți puterea instalată, adăugați control automat sau mărește raportul lumină naturală.
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sugestii orientative iluminat (fără brand) — Task 2 onSelect activ */}
              <SuggestionPanel
                suggestions={lightingSuggestions}
                title={t("Soluții recomandate pentru iluminat",lang)}
                subtitle={t("Corpuri LED + control prezență — click pe un card pentru a aplica.",lang)}
                mode="card"
                onSelect={handleApplyLightingSuggestion}
                lang={lang}
              />
            </>
            );
          })()}
        </div>

        {/* ── RIGHT PANEL: SUMAR ENERGIE ── */}
        <div className="space-y-3">
          <Card title={t("Sumar energetic",lang)}>
            {instSummary ? (
              <div className="space-y-3">
                {/* Energie primară totală */}
                <div className="text-center py-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5 text-center">{t("Energie primară specifică")}</div>
                  <div className={cn("text-3xl font-bold font-mono",
                    instSummary.ep_total_m2 < 120 ? "text-emerald-400" : instSummary.ep_total_m2 < 250 ? "text-amber-400" : "text-red-400")}>
                    {instSummary.ep_total_m2.toFixed(0)}
                  </div>
                  <div className="text-xs opacity-30">kWh/(m2·an)</div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Defalcare energie finală */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1 text-center">{t("Energie finală per utilitate")}</div>
                  {[
                    {label:"Încălzire", val:instSummary.qf_h, color:"#ef4444"},
                    {label:"ACM", val:instSummary.qf_w, color:"#f97316"},
                    {label:"Răcire", val:instSummary.qf_c, color:"#3b82f6"},
                    {label:"Ventilare", val:instSummary.qf_v, color:"#8b5cf6"},
                    {label:"Iluminat", val:instSummary.qf_l, color:"#eab308"},
                  ].map(item => {
                    const pct = instSummary.qf_total > 0 ? (item.val / instSummary.qf_total * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-2 py-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:item.color}} />
                        <span className="text-xs opacity-60 w-20">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:item.color}} />
                        </div>
                        <span className="text-xs font-mono w-16 text-right">{item.val.toFixed(0)}</span>
                        <span className="text-[10px] opacity-30 w-8">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Totale */}
                <div className="space-y-1">
                  <ResultRow label={t("Energie finală totală")} value={instSummary.qf_total.toFixed(0)} unit="kWh/an" />
                  <ResultRow label={t("Energie finală specifică")} value={instSummary.qf_total_m2.toFixed(1)} unit="kWh/(m2·an)" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label={t("Energie primară totală")} value={instSummary.ep_total.toFixed(0)} unit="kWh/an" />
                  <ResultRow label={t("Energie primară specifică")} value={instSummary.ep_total_m2.toFixed(1)} unit="kWh/(m2·an)"
                    status={instSummary.ep_total_m2 < 120 ? "ok" : instSummary.ep_total_m2 < 250 ? "warn" : "fail"} />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label="Emisii CO2 totale" value={instSummary.co2_total.toFixed(0)} unit="kg CO2/an" />
                  <ResultRow label="Emisii CO2 specifice" value={instSummary.co2_total_m2.toFixed(1)} unit="kg CO2/(m2·an)" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Randament global */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5 text-center">Randamente instalație încălzire</div>
                  <ResultRow label={instSummary.isCOP ? "COP/SCOP" : "eta generare"} value={parseFloat(heating.eta_gen).toFixed(2)} />
                  <ResultRow label="eta emisie" value={parseFloat(heating.eta_em).toFixed(2)} />
                  <ResultRow label="eta distribuție" value={parseFloat(heating.eta_dist).toFixed(2)} />
                  <ResultRow label="eta control" value={parseFloat(heating.eta_ctrl).toFixed(2)} />
                  <ResultRow label="eta total sistem" value={instSummary.eta_total_h.toFixed(3)}
                    status={instSummary.eta_total_h > 0.75 ? "ok" : instSummary.eta_total_h > 0.55 ? "warn" : "fail"} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-xs">Completează suprafața utilă (Pas 1) și anvelopa (Pas 2) pentru a vedea rezultatele</div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showOCR && <InvoiceOCR userPlan={userPlan} onApply={handleOCRApply} onClose={() => setShowOCR(false)} />}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4 sm:mt-5">
        <button onClick={() => setStep(2)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
          ← Pas 2: Anvelopă
        </button>
        <button onClick={() => goToStep(4, 3)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
          Pasul 4: Regenerabile →
        </button>
      </div>
    </div>
  );
}
