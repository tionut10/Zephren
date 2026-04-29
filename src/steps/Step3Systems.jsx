import { useState, useCallback, useMemo } from "react";
import { cn, Select, Input, Card, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";
import InvoiceOCR from "../components/InvoiceOCR.jsx";
import SuggestionPanel from "../components/SuggestionPanel.jsx";
import { suggestHVAC, filterByCategory } from "../data/suggestions-catalog.js";
import {
  HEAT_SOURCES, FUELS, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY,
  CONTROL_TYPES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL, LIGHTING_HOURS,
  COOLING_EMISSION_EFFICIENCY, COOLING_DISTRIBUTION_EFFICIENCY, COOLING_CONTROL_EFFICIENCY,
} from "../data/constants.js";
import { validateACMInputs, summarizeValidation } from "../calc/acm-validation.js";

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

  // ── Sugestii orientative (fără brand) per tab ───────────────────────────
  // Filtrare statică din catalog — afișate în fiecare sub-tab Step 3.
  const heatingSuggestions = useMemo(() => {
    const peakLoad = parseFloat(heating?.power) || 0;
    return suggestHVAC({
      functionType: "heating",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      preferredTags: ["nZEB"],
      limit: 3,
    });
  }, [heating?.power]);

  const coolingSuggestions = useMemo(() => {
    const cat = building?.category || "";
    const isResSmall = ["RI", "RA"].includes(cat);
    const isResMed = cat === "RC";
    const peakLoad = parseFloat(cooling?.power) || 0;
    const tags = isResSmall
      ? ["rezidential", "low-cost"]
      : isResMed
      ? ["modular", "rezidential"]
      : ["birouri", "comercial"];
    return suggestHVAC({
      functionType: "cooling",
      peakLoad_kW: peakLoad > 0 ? peakLoad : undefined,
      preferredTags: tags,
      limit: 3,
    });
  }, [building?.category, cooling?.power]);

  const ventilationSuggestions = useMemo(() => {
    const type = ventilation?.type || "";
    if (!type || type === "NAT" || type === "NAT_HIBRIDA") return [];
    const hasHR = VENTILATION_TYPES.find(v => v.id === type)?.hasHR ?? false;
    if (hasHR) return filterByCategory("ventilation").filter(s => s.id === "vmc-dual-90");
    return filterByCategory("ventilation");
  }, [ventilation?.type]);

  const lightingSuggestions = useMemo(() => {
    const cat = building?.category || "";
    const isResidential = ["RI", "RC", "RA"].includes(cat);
    const all = filterByCategory("lighting");
    if (isResidential) return all.filter(s => s.id === "led-control-presence");
    return all;
  }, [building?.category]);

  const handleOCRApply = useCallback((data) => {
    try {
      localStorage.setItem("zephren_measured_consumption", JSON.stringify(data));
    } catch {}
    setShowOCR(false);
    showToast?.("Date consum din factură salvate", "success");
  }, [showToast]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setStep(2)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 2</button>
          <h2 className="text-xl font-bold">{lang==="EN"?"Building systems":"Instalații"}</h2>
        </div>
        <p className="text-xs opacity-40">Capitolul 3 Mc 001-2022 — Încălzire, ACM, Climatizare, Ventilare, Iluminat</p>
      </div>

      {/* OCR Factură */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowOCR(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all"
        >
          <span aria-hidden="true">📄</span> OCR Factură — import consum
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
        {[
          {id:"heating",label:t("Încălzire"),icon:"🔥"},
          {id:"acm",label:"ACM",icon:"🚿"},
          {id:"cooling",label:t("Climatizare"),icon:"❄️"},
          {id:"ventilation",label:t("Ventilare"),icon:"💨"},
          {id:"lighting",label:t("Iluminat"),icon:"💡"},
        ].map(tab => (
          <button key={tab.id} onClick={() => setInstSubTab(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-[80px]",
              instSubTab===tab.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "hover:bg-white/5 border border-transparent")}>
            <span aria-hidden="true">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main content area */}
        <div className="xl:col-span-2 space-y-5">

          {/* ── ÎNCĂLZIRE ── */}
          {instSubTab === "heating" && (
            <>
              <Card title={t("Sursa de căldură (generare)",lang)}>
                <div className="space-y-3">
                  <Select label={t("Tip sursă",lang)} value={heating.source} onChange={v => setHeating(p=>({...p,source:v}))}
                    options={HEAT_SOURCES.map(s=>({value:s.id, label:`${s.label} (${s.cat})`}))} />
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

              <Card title={t("Sistem de emisie",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select label={t("Tip corpuri de încălzire",lang)} value={heating.emission} onChange={v => setHeating(p=>({...p,emission:v}))}
                    options={EMISSION_SYSTEMS.map(s=>({value:s.id,label:s.label}))} />
                  <Input label={t("Randament emisie (eta_em)",lang)} value={heating.eta_em} onChange={v => setHeating(p=>({...p,eta_em:v}))} type="number" step="0.01" />
                </div>
              </Card>

              <Card title={t("Distribuție și control",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select label={t("Calitate distribuție",lang)} value={heating.distribution} onChange={v => setHeating(p=>({...p,distribution:v}))}
                    options={DISTRIBUTION_QUALITY.map(s=>({value:s.id,label:s.label}))} />
                  <Input label={t("Randament distribuție (eta_dist)",lang)} value={heating.eta_dist} onChange={v => setHeating(p=>({...p,eta_dist:v}))} type="number" step="0.01" />
                  <Select label={t("Tip reglaj/control",lang)} value={heating.control} onChange={v => setHeating(p=>({...p,control:v}))}
                    options={CONTROL_TYPES.map(s=>({value:s.id,label:s.label}))} />
                  <Input label={t("Randament reglaj (eta_ctrl)",lang)} value={heating.eta_ctrl} onChange={v => setHeating(p=>({...p,eta_ctrl:v}))} type="number" step="0.01" />
                </div>
              </Card>

              <Card title={t("Regim de funcționare",lang)}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select label={t("Regim",lang)} value={heating.regime} onChange={v => setHeating(p=>({...p,regime:v}))}
                    options={[{value:"continuu",label:t("Continuu 24h")},{value:"intermitent",label:t("Intermitent (reducere nocturnă)")},{value:"oprire",label:t("Intermitent (oprire nocturnă)")}]} />
                  <Input label={t("Temp. confort (theta_int)",lang)} value={heating.theta_int} onChange={v => setHeating(p=>({...p,theta_int:v}))} type="number" unit="°C" tooltip="Temperatura interioară de calcul — Mc 001 Tabel 1.2: 20°C rezidențial, 18°C depozite, 24°C sănătate" />
                  <Input label={t("Reducere nocturnă",lang)} value={heating.nightReduction} onChange={v => setHeating(p=>({...p,nightReduction:v}))} type="number" unit="°C" />
                  {/* #7 Multi-zonă simplificată */}
                  <div className="col-span-full border-t border-white/5 pt-2 mt-1">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">{t("Zone termice adiacente (multi-zonă simplificată)")}</div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="T scară/hol comun" value={heating.tStaircase || "15"} onChange={v => setHeating(p=>({...p,tStaircase:v}))} type="number" unit="°C" tooltip="Temperatura medie a scării/holului comun neîncălzit (afectează τ perete interior)" />
                      <Input label="T subsol" value={heating.tBasement || "10"} onChange={v => setHeating(p=>({...p,tBasement:v}))} type="number" unit="°C" tooltip="Temperatura medie a subsolului neîncălzit" />
                      <Input label="T pod" value={heating.tAttic || "5"} onChange={v => setHeating(p=>({...p,tAttic:v}))} type="number" unit="°C" tooltip="Temperatura medie a podului neîncălzit" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sugestii orientative HVAC încălzire (fără brand) */}
              <SuggestionPanel
                suggestions={heatingSuggestions}
                title={t("Soluții recomandate pentru sursa de căldură",lang)}
                subtitle={t("Echipamente tipice piață RO 2025-2026 — fără nume de marcă. Pentru oferte concrete contactați furnizori autorizați.",lang)}
                mode="card"
                lang={lang}
              />
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
                  <Select label={t("Sursa ACM",lang)} value={acm.source} onChange={v => setAcm(p=>({...p,source:v}))}
                    options={ACM_SOURCES.map(s=>({value:s.id,label:s.label}))} />
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
                        }} options={COOLING_SYSTEMS.filter(s=>s.id!=="NONE").map(s=>({value:s.id,label:s.label}))} />
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
                          <Select label={t("Tip emisie răcire",lang)} value={cooling.emissionType || "fan_coil"} onChange={v => {
                            const em = COOLING_EMISSION_EFFICIENCY.find(e=>e.id===v);
                            setCooling(p=>({...p,emissionType:v,eta_em:em?.eta.toString()||"0.97"}));
                          }} options={COOLING_EMISSION_EFFICIENCY.map(e=>({value:e.id,label:`${e.label} (η=${e.eta})`}))} />
                          <Input label="η emisie" value={cooling.eta_em || "0.97"} onChange={v => setCooling(p=>({...p,eta_em:v}))}
                            type="number" step="0.01" min="0.70" max="1.00"
                            tooltip="Randament emisie răcire (0.70–1.00). Conform EN 15316-2 Tab.7." />

                          <Select label={t("Tip distribuție răcire",lang)} value={cooling.distributionType || "apa_rece_izolat_int"} onChange={v => {
                            const di = COOLING_DISTRIBUTION_EFFICIENCY.find(d=>d.id===v);
                            setCooling(p=>({...p,distributionType:v,eta_dist:di?.eta.toString()||"0.95"}));
                          }} options={COOLING_DISTRIBUTION_EFFICIENCY.map(d=>({value:d.id,label:`${d.label} (η=${d.eta})`}))} />
                          <Input label="η distribuție" value={cooling.eta_dist || "0.95"} onChange={v => setCooling(p=>({...p,eta_dist:v}))}
                            type="number" step="0.01" min="0.70" max="1.00"
                            tooltip="Randament distribuție răcire (0.70–1.00). Conform EN 15316-3 Tab.7." />

                          <Select label={t("Reglare răcire",lang)} value={cooling.controlType || "termostat_prop"} onChange={v => {
                            const ct = COOLING_CONTROL_EFFICIENCY.find(c=>c.id===v);
                            setCooling(p=>({...p,controlType:v,eta_ctrl:ct?.eta.toString()||"0.96"}));
                          }} options={COOLING_CONTROL_EFFICIENCY.map(c=>({value:c.id,label:`${c.label} (η=${c.eta})`}))} />
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
                          options={DISTRIBUTION_QUALITY.slice(0,4).map(s=>({value:s.id,label:s.label}))} />
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

              {/* Sugestii orientative climatizare (fără brand) */}
              {cooling.hasCooling !== false && (
                <SuggestionPanel
                  suggestions={coolingSuggestions}
                  title={t("Soluții recomandate pentru climatizare",lang)}
                  subtitle={t("Sisteme de răcire orientative pentru rezidențial/comercial — fără nume de marcă.",lang)}
                  mode="card"
                  lang={lang}
                />
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
                    const vt = VENTILATION_TYPES.find(t=>t.id===v);
                    setVentilation(p=>({...p,type:v,hrEfficiency:vt?.hrEta ? (vt.hrEta*100).toFixed(0) : ""}));
                  }} options={VENTILATION_TYPES.map(s=>({value:s.id,label:s.label}))} />
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

              {/* Sugestii orientative ventilare (fără brand) */}
              <SuggestionPanel
                suggestions={ventilationSuggestions}
                title={t("Soluții recomandate pentru ventilare mecanică",lang)}
                subtitle={t("Sisteme VMC tipice — VMC dual-flux cu recuperare ≥ 90% e obligatoriu pentru nZEB.",lang)}
                mode="card"
                lang={lang}
              />
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
                      const lt = LIGHTING_TYPES.find(t=>t.id===v);
                      setLighting(p=>({...p, type:v, pDensity: lt?.pDensity?.toString() || p.pDensity}));
                    }}
                      options={LIGHTING_TYPES.map(s=>({value:s.id,label:`${s.label} (${s.efficacy} lm/W)`}))} />
                    <Input label={t("Densitate putere instalată",lang)} value={lighting.pDensity} onChange={v => setLighting(p=>({...p,pDensity:v}))} type="number" unit="W/m2" step="0.1" min="0" max="50"
                      tooltip="EN 15193-1: tipic rezidențial 3–8 W/m², birouri 8–12 W/m², industrial 10–20 W/m²" />
                    <Select label={t("Sistem de control",lang)} value={lighting.controlType} onChange={v => {
                      const ctrl = LIGHTING_CONTROL.find(c=>c.id===v);
                      setLighting(p=>({...p, controlType:v, fCtrl: ctrl?.fCtrl?.toString() || p.fCtrl}));
                    }}
                      options={LIGHTING_CONTROL.map(s=>({value:s.id,label:s.label}))} />
                    <Input label={t("Factor control (F_C)",lang)} value={lighting.fCtrl} onChange={v => setLighting(p=>({...p,fCtrl:v}))} type="number" step="0.01" min="0.3" max="1.0"
                      tooltip="EN 15193-1 Tab. B.6: manual 1.00, PIR 0.80, DALI 0.45, auto integral 0.40" />
                    <Input label={t("Ore funcționare / an",lang)} value={lighting.operatingHours} onChange={v => setLighting(p=>({...p,operatingHours:v}))} type="number" unit="h/an" min="0" max="8760"
                      placeholder={`auto: ${LIGHTING_HOURS[building.category] || 1800} h/an (${building.category || "—"})`}
                      tooltip="Gol → default categorie (Mc 001-2022 Anexa). Rezidențial 1800h, birouri 2500h, spital 3500h, supermarket 5000h." />
                    <Input label={t("Raport lumină naturală",lang)} value={lighting.naturalLightRatio} onChange={v => setLighting(p=>({...p,naturalLightRatio:v}))} type="number" unit="%" min="0" max="80"
                      tooltip="Factor F_d aplicat DOAR pe termenul diurn (Sprint 2 fix: nu există daylight noaptea)." />
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

              {/* Sugestii orientative iluminat (fără brand) */}
              <SuggestionPanel
                suggestions={lightingSuggestions}
                title={t("Soluții recomandate pentru iluminat",lang)}
                subtitle={t("Corpuri LED + control prezență — reduc LENI cu 30-50%, BACS clasă C obligatoriu nZEB.",lang)}
                mode="card"
                lang={lang}
              />
            </>
            );
          })()}
        </div>

        {/* ── RIGHT PANEL: SUMAR ENERGIE ── */}
        <div className="space-y-5">
          <Card title={t("Sumar energetic",lang)}>
            {instSummary ? (
              <div className="space-y-4">
                {/* Energie primară totală */}
                <div className="text-center py-3">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{t("Energie primară specifică")}</div>
                  <div className={cn("text-3xl font-bold font-mono",
                    instSummary.ep_total_m2 < 120 ? "text-emerald-400" : instSummary.ep_total_m2 < 250 ? "text-amber-400" : "text-red-400")}>
                    {instSummary.ep_total_m2.toFixed(0)}
                  </div>
                  <div className="text-xs opacity-30">kWh/(m2·an)</div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* Defalcare energie finală */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">{t("Energie finală per utilitate")}</div>
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
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Randamente instalație încălzire</div>
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
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
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
