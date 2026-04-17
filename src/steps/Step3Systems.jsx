import { useState, useCallback } from "react";
import { cn, Select, Input, Card, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";
import InvoiceOCR from "../components/InvoiceOCR.jsx";
import {
  HEAT_SOURCES, FUELS, EMISSION_SYSTEMS, DISTRIBUTION_QUALITY,
  CONTROL_TYPES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES,
  LIGHTING_TYPES, LIGHTING_CONTROL, LIGHTING_HOURS,
} from "../data/constants.js";

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
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);
  const [showOCR, setShowOCR] = useState(false);

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
            </>
          )}

          {/* ── ACM ── */}
          {instSubTab === "acm" && (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label={t("Volum vas stocare",lang)} value={acm.storageVolume} onChange={v => setAcm(p=>({...p,storageVolume:v}))} type="number" unit="litri" placeholder="0 = fără vas"
                    tooltip="Volum boiler acumulator. 0 pentru sisteme instant (combi, schimb placi)" />
                  <Select label={t("Clasa energetică boiler",lang)} value={acm.insulationClass || "B"} onChange={v => setAcm(p=>({...p,insulationClass:v}))}
                    options={[
                      {value:"A", label:t("Clasa A — premium (−55% pierderi)")},
                      {value:"B", label:t("Clasa B — standard")},
                      {value:"C", label:t("Clasa C — slab izolat")},
                    ]}
                    tooltip="ErP Reg. 812/2013 (etichetare ACM). Clasa A: izolație PU rigid 50mm+ (q_standby ~1.3 kWh/24h pentru 200L)" />
                  <Input label={t("Pierderi stocare",lang)} value={acm.storageLoss} onChange={v => setAcm(p=>({...p,storageLoss:v}))} type="number" unit="%" step="0.1"
                    tooltip="Fracție pierderi stocare (0-25%). Lăsați gol pentru calcul automat EN 50440 bazat pe volum + clasă" />
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
            </>
          )}

          {/* ── CLIMATIZARE ── */}
          {instSubTab === "cooling" && (
            <>
              <Card title={t("Sistem de răcire",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={cooling.hasCooling} onChange={e => setCooling(p=>({...p,hasCooling:e.target.checked}))}
                      className="accent-amber-500" />
                    <span className="font-medium">{t("Clădirea dispune de sistem de răcire/climatizare")}</span>
                  </label>

                  {cooling.hasCooling && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Select label={t("Tip sistem",lang)} value={cooling.system} onChange={v => {
                        const sys = COOLING_SYSTEMS.find(s=>s.id===v);
                        setCooling(p=>({...p,system:v,eer:sys?.eer.toString()||""}));
                      }} options={COOLING_SYSTEMS.filter(s=>s.id!=="NONE").map(s=>({value:s.id,label:s.label}))} />
                      <Input label={t("EER/COP răcire",lang)} value={cooling.eer || (COOLING_SYSTEMS.find(s=>s.id===cooling.system)?.eer||"").toString()}
                        onChange={v => setCooling(p=>({...p,eer:v}))} type="number" step="0.1" />
                      <Input label={t("Putere frigorifică",lang)} value={cooling.power} onChange={v => setCooling(p=>({...p,power:v}))} type="number" unit="kW" />
                      <Input label={t("Suprafață răcită",lang)} value={cooling.cooledArea} onChange={v => setCooling(p=>({...p,cooledArea:v}))} type="number" unit="m²"
                        placeholder={`${building.areaUseful || "= Au"}`} />
                      <Select label={t("Distribuție răcire",lang)} value={cooling.distribution} onChange={v => setCooling(p=>({...p,distribution:v}))}
                        options={DISTRIBUTION_QUALITY.slice(0,4).map(s=>({value:s.id,label:s.label}))} />
                    </div>
                  )}

                  {!cooling.hasCooling && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mt-2">
                      <div className="text-xs text-amber-400 font-medium mb-1">Notă Mc 001-2022</div>
                      <div className="text-xs opacity-60">Dacă clădirea nu dispune de sistem de răcire, se aplică grila de clasare fără răcire. Se va calcula totuși numărul de ore cu temperatura interioară peste limita de confort (27°C) în regim liber.</div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

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
            </>
            );
          })()}
        </div>

        {/* ── RIGHT PANEL: SUMAR ENERGIE ── */}
        <div className="space-y-5">
          <Card title={t("Sumar energetic",lang)} className="sticky top-6">
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

      {showOCR && <InvoiceOCR onApply={handleOCRApply} onClose={() => setShowOCR(false)} />}

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
