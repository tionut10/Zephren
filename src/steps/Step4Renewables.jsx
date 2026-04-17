import { useState, useMemo } from "react";
import { cn, Select, Input, Card, Badge, ResultRow } from "../components/ui.jsx";
import { T } from "../data/translations.js";
import { calcSolarACMDetailed, COLLECTOR_TYPES } from "../calc/solar-acm-detailed.js";
import { calcCHP, CHP_TYPES_CATALOG } from "../calc/chp-detailed.js";
import {
  HEAT_SOURCES, FUELS,
  SOLAR_THERMAL_TYPES, PV_TYPES, PV_INVERTER_ETA,
  TILT_FACTORS, BIOMASS_TYPES, BATTERY_STORAGE_TYPES,
} from "../data/constants.js";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";

export default function Step4Renewables({
  building, lang, selectedClimate,
  solarThermal, setSolarThermal,
  photovoltaic, setPhotovoltaic,
  heatPump, setHeatPump,
  biomass, setBiomass,
  otherRenew, setOtherRenew,
  battery, setBattery,
  renewSubTab, setRenewSubTab,
  renewSummary, instSummary,
  ORIENTATIONS, getNzebEpMax,
  setStep, goToStep,
}) {
  const t = (key) => lang === "RO" ? key : (T[key]?.EN || key);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setStep(3)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 3</button>
          <h2 className="text-xl font-bold">Surse regenerabile de energie</h2>
        </div>
        <p className="text-xs opacity-40">Capitolul 4 Mc 001-2022 — Solar termic, Fotovoltaic, Pompe de căldură, Biomasă, Eolian, Cogenerare</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
        {[
          {id:"solar_th",label:"Solar termic",icon:"☀️"},
          {id:"pv",label:"Fotovoltaic",icon:"🔋"},
          {id:"heat_pump",label:"Pompe căldură",icon:"♨️"},
          {id:"biomass",label:"Biomasă",icon:"🌳"},
          {id:"other",label:"Eolian/CHP",icon:"🌬️"},
        ].map(tab => (
          <button key={tab.id} onClick={() => setRenewSubTab(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-[80px]",
              renewSubTab===tab.id ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "hover:bg-white/5 border border-transparent")}>
            <span>{tab.icon}</span>{t(tab.label,lang)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="space-y-5">

          {/* ── SOLAR TERMIC ── */}
          {renewSubTab === "solar_th" && (
            <>
              <Card title={t("Panouri solare termice",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={solarThermal.enabled} onChange={e => setSolarThermal(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">{t("Clădirea dispune de panouri solare termice",lang)}</span>
                  </label>

                  {solarThermal.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Select label={t("Tip colector",lang)} value={solarThermal.type} onChange={v => setSolarThermal(p=>({...p,type:v}))}
                        options={SOLAR_THERMAL_TYPES.map(s=>({value:s.id,label:s.label}))} />
                      <Input label={t("Suprafață colectoare",lang)} value={solarThermal.area} onChange={v => setSolarThermal(p=>({...p,area:v}))} type="number" unit="m2" min="0" step="0.1" />
                      <Select label={t("Orientare",lang)} value={solarThermal.orientation} onChange={v => setSolarThermal(p=>({...p,orientation:v}))}
                        options={ORIENTATIONS.filter(o=>o!=="Orizontal")} />
                      <Select label={t("Inclinare",lang)} value={solarThermal.tilt} onChange={v => setSolarThermal(p=>({...p,tilt:v}))}
                        options={Object.keys(TILT_FACTORS).map(k=>({value:k,label:`${k}° (factor ${TILT_FACTORS[k]})`}))} />
                      <Select label={t("Utilizare",lang)} value={solarThermal.usage} onChange={v => setSolarThermal(p=>({...p,usage:v}))}
                        options={[{value:"acm",label:t("Doar ACM",lang)},{value:"heating",label:t("Doar încălzire",lang)},{value:"both",label:t("ACM + Încălzire",lang)}]} />
                      <Input label={t("Volum stocare",lang)} value={solarThermal.storageVolume} onChange={v => setSolarThermal(p=>({...p,storageVolume:v}))} type="number" unit="litri" placeholder="50-80 l/m2" />
                      <Input label={t("Randament optic (eta_0)",lang)} value={solarThermal.eta0} onChange={v => setSolarThermal(p=>({...p,eta0:v}))} type="number" step="0.01" />
                      <Input label={t("Coeficient pierderi (a1)",lang)} value={solarThermal.a1} onChange={v => setSolarThermal(p=>({...p,a1:v}))} type="number" unit="W/(m2K)" step="0.1" />
                    </div>
                  )}

                  {solarThermal.enabled && renewSummary && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-50">{t("Producție anuală estimată",lang)}</span>
                        <span className="text-lg font-mono font-bold text-emerald-400">
                          {renewSummary.qSolarTh.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Calcul detaliat EN 15316-4-3 */}
                  {solarThermal.enabled && (() => {
                    const area = parseFloat(solarThermal.area) || 0;
                    const vol = parseFloat(solarThermal.storageVolume) || area * 60;
                    if (area <= 0 || !selectedClimate) return null;
                    let detailed = null;
                    try {
                      detailed = calcSolarACMDetailed({
                        collectorArea: area,
                        collectorType: solarThermal.type || "flat",
                        eta0: parseFloat(solarThermal.eta0) || 0.79,
                        a1: parseFloat(solarThermal.a1) || 3.5,
                        storageVolume_L: vol,
                        orientation: solarThermal.orientation || "S",
                        tilt: parseFloat(solarThermal.tilt) || 45,
                        climate: selectedClimate,
                        category: building?.category || "RI",
                        nPersons: parseFloat(building?.persons) || 3,
                      });
                    } catch { return null; }
                    if (!detailed) return null;
                    return (
                      <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2">Detaliu EN 15316-4-3</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: "Acoperire solară", val: `${(detailed.solarFraction * 100).toFixed(0)}%`, color: "text-emerald-400" },
                            { label: "Iradiere colectată", val: `${detailed.Q_sol_kWh?.toFixed(0)} kWh/an`, color: "" },
                            { label: "Pierderi sistem", val: `${detailed.Q_loss_kWh?.toFixed(0)} kWh/an`, color: "text-red-400" },
                            { label: "Economie auxiliar", val: `${detailed.Q_aux_saved_kWh?.toFixed(0)} kWh/an`, color: "text-amber-400" },
                          ].map((r, i) => (
                            <div key={i} className="bg-white/[0.02] rounded p-2">
                              <div className="text-[10px] opacity-40">{r.label}</div>
                              <div className={`text-xs font-bold font-mono ${r.color}`}>{r.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </>
          )}

          {/* ── FOTOVOLTAIC ── */}
          {renewSubTab === "pv" && (
            <>
              <Card title={t("Panouri fotovoltaice",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={photovoltaic.enabled} onChange={e => setPhotovoltaic(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">{t("Clădirea dispune de instalație fotovoltaică",lang)}</span>
                  </label>

                  {photovoltaic.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Select label={t("Tip celule PV",lang)} value={photovoltaic.type} onChange={v => setPhotovoltaic(p=>({...p,type:v}))}
                        options={PV_TYPES.map(s=>({value:s.id,label:`${s.label} (eta=${(s.eta*100).toFixed(0)}%)`}))} />
                      <Input label={t("Suprafață panouri",lang)} value={photovoltaic.area} onChange={v => setPhotovoltaic(p=>({...p,area:v}))} type="number" unit="m2" min="0" step="0.1" />
                      <Input label={t("Putere de varf instalată",lang)} value={photovoltaic.peakPower} onChange={v => setPhotovoltaic(p=>({...p,peakPower:v}))} type="number" unit="kWp" step="0.01" />
                      <Select label={t("Orientare",lang)} value={photovoltaic.orientation} onChange={v => setPhotovoltaic(p=>({...p,orientation:v}))}
                        options={ORIENTATIONS.filter(o=>o!=="Orizontal").concat(["Orizontal"])} />
                      <Select label={t("Inclinare",lang)} value={photovoltaic.tilt} onChange={v => setPhotovoltaic(p=>({...p,tilt:v}))}
                        options={Object.keys(TILT_FACTORS).map(k=>({value:k,label:`${k}° (factor ${TILT_FACTORS[k]})`}))} />
                      <Select label={t("Tip invertor",lang)} value={photovoltaic.inverterType} onChange={v => setPhotovoltaic(p=>({...p,inverterType:v}))}
                        options={PV_INVERTER_ETA.map(s=>({value:s.id,label:`${s.label} (${(s.eta*100).toFixed(0)}%)`}))} />
                      <Select label={t("Utilizare energie",lang)} value={photovoltaic.usage} onChange={v => setPhotovoltaic(p=>({...p,usage:v}))}
                        options={[{value:"all",label:t("Toate utilitățile",lang)},{value:"lighting",label:t("Doar iluminat",lang)},{value:"hvac",label:t("HVAC + ventilare",lang)},{value:"export",label:t("Export în rețea",lang)}]} />
                    </div>
                  )}

                  {photovoltaic.enabled && renewSummary && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-50">{t("Producție anuală estimată",lang)}</span>
                        <span className="text-lg font-mono font-bold text-emerald-400">
                          {renewSummary.qPV_kWh.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-50">Producție specifică</span>
                        <span className="text-xs font-mono opacity-60">
                          {(parseFloat(photovoltaic.peakPower) > 0 ? (renewSummary.qPV_kWh / parseFloat(photovoltaic.peakPower)).toFixed(0) : "—")} kWh/kWp/an
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ── STOCARE BATERII (în subtabul PV) ── */}
          {renewSubTab === "pv" && battery && (
            <Card title={t("Stocare energie în baterii",lang)}>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={battery.enabled} onChange={e => setBattery(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                  <span className="font-medium">{t("Sistem de stocare în baterii (BESS)",lang)}</span>
                </label>
                {battery.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <Select label={t("Tip baterie",lang)} value={battery.type} onChange={v => setBattery(p=>({...p,type:v}))}
                      options={BATTERY_STORAGE_TYPES.map(b=>({value:b.id,label:`${b.label} (η=${(b.efficiency*100).toFixed(0)}%)`}))} />
                    <Input label={t("Capacitate nominală",lang)} value={battery.capacity} onChange={v => setBattery(p=>({...p,capacity:v}))} type="number" unit="kWh" min="0" step="0.5" />
                    <Input label={t("Putere maximă",lang)} value={battery.power} onChange={v => setBattery(p=>({...p,power:v}))} type="number" unit="kW" step="0.5" />
                    <Input label={t("Adâncime descărcare (DoD)",lang)} value={battery.dod} onChange={v => setBattery(p=>({...p,dod:v}))} type="number" step="0.01" placeholder="0.80–0.95" />
                    <Input label={t("Autoconsum local",lang)} value={battery.selfConsumptionPct} onChange={v => setBattery(p=>({...p,selfConsumptionPct:v}))} type="number" unit="%" step="1" placeholder="80" className="col-span-2" />
                  </div>
                )}
                {battery.enabled && (
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mt-1">
                    <div className="text-[10px] opacity-50">
                      {(() => {
                        const bType = BATTERY_STORAGE_TYPES.find(b=>b.id===battery.type);
                        const cap = parseFloat(battery.capacity)||0;
                        const dod = parseFloat(battery.dod)||0.90;
                        if (!bType || cap===0) return "Completează capacitatea pentru estimare";
                        const usable = (cap * dod).toFixed(1);
                        const cyclesPerYear = 300;
                        const annualThroughput = (cap * dod * bType.efficiency * cyclesPerYear).toFixed(0);
                        return `Capacitate utilizabilă: ${usable} kWh | Debit anual estimat: ~${annualThroughput} kWh/an | Cicluri de viață: ~${bType.cycles.toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── POMPE DE CĂLDURĂ ── */}
          {renewSubTab === "heat_pump" && (
            <>
              <Card title={t("Pompă de căldură — componenta regenerabilă",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={heatPump.enabled} onChange={e => setHeatPump(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">{t("Încălzire/ACM prin pompă de căldură",lang)}</span>
                  </label>

                  {heatPump.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Select label={t("Tip pompă de căldură",lang)} value={heatPump.type} onChange={v => {
                        const pc = HEAT_SOURCES.find(s=>s.id===v);
                        setHeatPump(p=>({...p,type:v,cop:pc?.eta_gen.toString()||"3.50"}));
                      }} options={HEAT_SOURCES.filter(s=>s.isCOP).map(s=>({value:s.id,label:s.label}))} />
                      <Input label={t("COP nominal",lang)} value={heatPump.cop} onChange={v => setHeatPump(p=>({...p,cop:v}))} type="number" step="0.1" />
                      <Input label={t("SCOP sezonier incalzire",lang)} value={heatPump.scopHeating} onChange={v => setHeatPump(p=>({...p,scopHeating:v}))} type="number" step="0.1"
                        placeholder={`~${(parseFloat(heatPump.cop)*0.85).toFixed(1)}`} />
                      <Select label={t("Acoperire",lang)} value={heatPump.covers} onChange={v => setHeatPump(p=>({...p,covers:v}))}
                        options={[{value:"heating",label:t("Doar încălzire",lang)},{value:"acm",label:t("Doar ACM",lang)},{value:"heating_acm",label:t("Încălzire + ACM",lang)}]} />
                      <Input label={t("Temp. bivalentă",lang)} value={heatPump.bivalentTemp} onChange={v => setHeatPump(p=>({...p,bivalentTemp:v}))} type="number" unit="°C" />
                      <Select label={t("Sursă auxiliară (bivalent)",lang)} value={heatPump.auxSource} onChange={v => setHeatPump(p=>({...p,auxSource:v}))}
                        options={HEAT_SOURCES.filter(s=>!s.isCOP).slice(0,5).map(s=>({value:s.id,label:s.label}))} />
                    </div>
                  )}

                  {heatPump.enabled && renewSummary && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-50">{t("Energie ambientală (regenerabilă)",lang)}</span>
                        <span className="text-lg font-mono font-bold text-emerald-400">
                          {renewSummary.qPC_ren.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                        </span>
                      </div>
                      <div className="text-[10px] opacity-40 mt-1">
                        Fracție regenerabilă: {(parseFloat(heatPump.scopHeating||heatPump.cop) > 0 ? ((1 - 1/parseFloat(heatPump.scopHeating||heatPump.cop))*100).toFixed(0) : 0)}% din energia termică produsă
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-amber-500/[0.02] border-amber-500/10">
                <div className="text-xs text-amber-400 font-medium mb-1">Notă OAER privind Tabelul 5.17</div>
                <div className="text-xs opacity-60">OAER a inițiat procedura de înlocuire a factorilor de conversie cu valorile din SR EN ISO 52000-1:2017/NA:2023, unde factorul pentru energia ambientală devine 0 (zero), pentru a nu dezavantaja pompele de căldură. Aplicația utilizează în prezent valorile din Mc 001-2022 original.</div>
              </Card>
            </>
          )}

          {/* ── BIOMASĂ ── */}
          {renewSubTab === "biomass" && (
            <>
              <Card title={t("Biomasă",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={biomass.enabled} onChange={e => setBiomass(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">Încălzire/ACM pe biomasă</span>
                  </label>

                  {biomass.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Select label={t("Tip combustibil biomasă",lang)} value={biomass.type} onChange={v => setBiomass(p=>({...p,type:v}))}
                        options={BIOMASS_TYPES.map(s=>({value:s.id,label:`${s.label} (PCI=${s.pci} MJ/kg)`}))} />
                      <Input label={t("Randament cazan",lang)} value={biomass.boilerEta} onChange={v => setBiomass(p=>({...p,boilerEta:v}))} type="number" step="0.01" />
                      <Input label={t("Putere nominală",lang)} value={biomass.power} onChange={v => setBiomass(p=>({...p,power:v}))} type="number" unit="kW" />
                      <Select label={t("Acoperire",lang)} value={biomass.covers} onChange={v => setBiomass(p=>({...p,covers:v}))}
                        options={[{value:"heating",label:t("Doar încălzire",lang)},{value:"acm",label:t("Doar ACM",lang)},{value:"heating_acm",label:t("Încălzire + ACM",lang)}]} />
                      <Input label={t("Consum anual (opțional)",lang)} value={biomass.annualConsumption} onChange={v => setBiomass(p=>({...p,annualConsumption:v}))} type="number" unit="tone/an"
                        placeholder="auto din necesar" className="col-span-2" />
                    </div>
                  )}

                  {biomass.enabled && renewSummary && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-50">Energie regenerabilă (fP_ren=0.80)</span>
                        <span className="text-lg font-mono font-bold text-emerald-400">
                          {renewSummary.qBio_ren.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                        </span>
                      </div>
                      <div className="text-xs opacity-40 mt-1">
                        Energie totală biomasă: {renewSummary.qBio_total.toFixed(0)} kWh/an | Emisii CO2: 0 (biogenic net)
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ── EOLIAN / COGENERARE ── */}
          {renewSubTab === "other" && (
            <>
              <Card title={t("Energie eoliană",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={otherRenew.windEnabled} onChange={e => setOtherRenew(p=>({...p,windEnabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">{t("Turbină eoliană",lang)}</span>
                  </label>
                  {otherRenew.windEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <Input label={t("Capacitate instalată",lang)} value={otherRenew.windCapacity} onChange={v => setOtherRenew(p=>({...p,windCapacity:v}))} type="number" unit="kW" />
                      <Input label={t("Producție anuală estimată",lang)} value={otherRenew.windProduction} onChange={v => setOtherRenew(p=>({...p,windProduction:v}))} type="number" unit="kWh/an" />
                    </div>
                  )}
                </div>
              </Card>

              <Card title={t("Cogenerare (CHP)",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={otherRenew.cogenEnabled} onChange={e => setOtherRenew(p=>({...p,cogenEnabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">Sistem de cogenerare (SR EN 15316-4-4 + Dir. 2012/27/UE)</span>
                  </label>
                  {otherRenew.cogenEnabled && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <Select label={t("Tip CHP",lang)} value={otherRenew.cogenType || "mini_ice"} onChange={v => setOtherRenew(p=>({...p,cogenType:v}))}
                          options={Object.entries(CHP_TYPES_CATALOG).map(([id,c])=>({value:id,label:c.label}))} />
                        <Select label={t("Combustibil CHP",lang)} value={otherRenew.cogenFuel} onChange={v => setOtherRenew(p=>({...p,cogenFuel:v}))}
                          options={FUELS.filter(f=>["gaz","biogas","hidrogen","gpl","motorina"].includes(f.id)).map(f=>({value:f.id,label:f.label}))} />
                        <Input label={t("Putere electrică",lang)} value={otherRenew.cogenPowerEl} onChange={v => setOtherRenew(p=>({...p,cogenPowerEl:v}))} type="number" unit="kW" step="0.5" />
                        <Input label={t("Ore funcționare/an",lang)} value={otherRenew.cogenHours || "5000"} onChange={v => setOtherRenew(p=>({...p,cogenHours:v}))} type="number" unit="h/an" step="100" />
                        <Input label={t("Producție electrică anuală",lang)} value={otherRenew.cogenElectric} onChange={v => setOtherRenew(p=>({...p,cogenElectric:v}))} type="number" unit="kWh/an" />
                        <Input label={t("Producție termică anuală",lang)} value={otherRenew.cogenThermal} onChange={v => setOtherRenew(p=>({...p,cogenThermal:v}))} type="number" unit="kWh/an" />
                      </div>

                      {/* Calcul detaliat PES + CO₂ + payback conform Dir. 2012/27/UE */}
                      {otherRenew.cogenEnabled && parseFloat(otherRenew.cogenPowerEl) > 0 && (() => {
                        const fuelIdMap = { gaz:"natural_gas", biogas:"biogas", gpl:"lpg", hidrogen:"hydrogen", motorina:"diesel" };
                        const chpFuelKey = fuelIdMap[otherRenew.cogenFuel] || "natural_gas";
                        let chp = null;
                        try {
                          chp = calcCHP({
                            powerElec_kW: parseFloat(otherRenew.cogenPowerEl) || 5,
                            operatingHours: parseFloat(otherRenew.cogenHours) || 5000,
                            fuelType: chpFuelKey,
                            chpType: otherRenew.cogenType || "mini_ice",
                            heatDemand_kWh: (instSummary?.qH_nd || 0) + (instSummary?.qACM_nd || 0),
                            elecDemand_kWh: 10_000,
                          });
                        } catch { return null; }
                        if (!chp) return null;
                        return (
                          <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2">Detaliu EN 15316-4-4 + Dir. 2012/27/UE Anexa II</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label:"Electric produs", val:`${chp.Q_elec_kWh.toLocaleString("ro-RO")} kWh/an`, color:"text-amber-400" },
                                { label:"Termic produs", val:`${chp.Q_heat_kWh.toLocaleString("ro-RO")} kWh/an`, color:"text-red-400" },
                                { label:"Eficiență totală", val:`${(chp.efficiency_total*100).toFixed(0)}%`, color:chp.efficiency_total>=0.80?"text-emerald-400":"text-amber-400" },
                                { label:"PES", val:`${chp.PES_pct}%`, color:chp.PES_pct>=10?"text-emerald-400":"text-red-400" },
                                { label:"Acop. termic", val:`${chp.heat_coverage_pct}%`, color:"" },
                                { label:"CO₂ evitat", val:`${(chp.co2_saved_kg/1000).toFixed(1)} t/an`, color:"text-emerald-400" },
                                { label:"Ep economisită", val:`${chp.ep_saved_kWh.toLocaleString("ro-RO")} kWh/an`, color:"text-blue-400" },
                                { label:"Payback", val: chp.financial.payback_years ? `${chp.financial.payback_years} ani` : ">25 ani", color:"" },
                              ].map((r,i)=>(
                                <div key={i} className="bg-white/[0.02] rounded p-2">
                                  <div className="text-[10px] opacity-40">{r.label}</div>
                                  <div className={`text-xs font-bold font-mono ${r.color}`}>{r.val}</div>
                                </div>
                              ))}
                            </div>
                            {chp.recommendations && chp.recommendations.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {chp.recommendations.map((rec,i)=>(
                                  <div key={i} className="text-[10px] text-amber-300 opacity-80">• {rec}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </Card>

              {/* ── PROXIMITATE 30 km GPS (L.238/2024 Art.6) ── */}
              <Card title={t("Regenerabile în proximitate (≤30 km GPS)",lang)}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={otherRenew.proximityEnabled || false} onChange={e => setOtherRenew(p=>({...p,proximityEnabled:e.target.checked}))} className="accent-emerald-500" />
                    <span className="font-medium">Sursă regenerabilă externă (parc PV/eolian regional)</span>
                  </label>
                  <div className="text-[10px] opacity-50">
                    <strong>Legea 238/2024 Art.6:</strong> regenerabilul &quot;local&quot; include sursele produse în rază maximă ≤30 km GPS de clădire (parcuri PV, eoliene comunitare, cogenerare cartier). Contează la <em>RER total</em> (≥30%) dar <strong>NU la RER on-site</strong> (≥10% obligatoriu pe clădire).
                  </div>
                  {otherRenew.proximityEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <Select label={t("Tip sursă",lang)} value={otherRenew.proximitySource || "solar"} onChange={v => setOtherRenew(p=>({...p,proximitySource:v}))}
                        options={[
                          {value:"solar",label:"Parc fotovoltaic"},
                          {value:"wind",label:"Parc eolian"},
                          {value:"biomass",label:"Centrală biomasă"},
                          {value:"chp_bio",label:"CHP biogaz"},
                          {value:"dh_renewable",label:"Termoficare regenerabilă"},
                        ]} />
                      <Input label={t("Distanță GPS",lang)} value={otherRenew.proximityDistanceKm} onChange={v => setOtherRenew(p=>({...p,proximityDistanceKm:v}))} type="number" unit="km" step="0.5" min="0" max="30"
                        placeholder="≤30 km obligatoriu" />
                      <Input label={t("Producție atribuită",lang)} value={otherRenew.proximityProduction} onChange={v => setOtherRenew(p=>({...p,proximityProduction:v}))} type="number" unit="kWh/an"
                        placeholder="kWh garanție origine" />
                    </div>
                  )}
                  {otherRenew.proximityEnabled && parseFloat(otherRenew.proximityDistanceKm) > 30 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2 text-[10px] text-red-300">
                      ⚠ Distanța {otherRenew.proximityDistanceKm} km depășește pragul L.238/2024 (max 30 km). Sursa NU va fi contabilizată în RER.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL: SUMAR REGENERABILE ── */}
        <div className="space-y-5">
          <Card title={t("Sumar regenerabile",lang)} className="sticky top-6">
            {renewSummary ? (
              <div className="space-y-4">
                <div className="text-center py-3">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{t("Rata Energie Regenerabilă (RER)",lang)}</div>
                  <div className={cn("text-3xl font-bold font-mono",
                    renewSummary.rer >= 30 ? "text-emerald-400" : renewSummary.rer > 10 ? "text-amber-400" : "text-red-400")}>
                    {renewSummary.rer.toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-30 mt-1">{renewSummary.rer >= 30 ? "nZEB conform" : "sub 30% minim nZEB"}</div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">{t("Producție per sursă",lang)}</div>
                  {[
                    {label:"Solar termic", val:renewSummary.qSolarTh, enabled:solarThermal.enabled, color:"#f59e0b"},
                    {label:"Fotovoltaic", val:renewSummary.qPV_kWh, enabled:photovoltaic.enabled, color:"#3b82f6"},
                    {label:"PC ambientală", val:renewSummary.qPC_ren, enabled:heatPump.enabled, color:"#8b5cf6"},
                    {label:"Biomasă", val:renewSummary.qBio_ren, enabled:biomass.enabled, color:"#22c55e"},
                    {label:"Eolian", val:renewSummary.qWind, enabled:otherRenew.windEnabled, color:"#06b6d4"},
                  ].filter(i=>i.enabled).map(item => {
                    const pct = renewSummary.totalRenewable > 0 ? (item.val / renewSummary.totalRenewable * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-2 py-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:item.color}} />
                        <span className="text-xs opacity-60 flex-1">{t(item.label,lang)}</span>
                        <span className="text-xs font-mono w-20 text-right">{item.val.toFixed(0)} kWh</span>
                      </div>
                    );
                  })}
                  {!solarThermal.enabled && !photovoltaic.enabled && !heatPump.enabled && !biomass.enabled && !otherRenew.windEnabled && (
                    <div className="text-xs opacity-30 text-center py-2">{t("Nicio sursă regenerabilă activată",lang)}</div>
                  )}
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <ResultRow label="Total regenerabil" value={renewSummary.totalRenewable.toFixed(0)} unit="kWh/an" />
                  <ResultRow label="Regenerabil specific" value={renewSummary.totalRenewable_m2.toFixed(1)} unit="kWh/(m²·an)" />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{t("Energie primară ajustată",lang)}</div>
                  <ResultRow label={t("Ep fără regenerabile",lang)} value={(instSummary?.ep_total_m2||0).toFixed(1)} unit="kWh/(m²·an)" />
                  <ResultRow label={t("Reducere din regenerabile",lang)} value={renewSummary.ep_reduction > 0 ? `-${(renewSummary.ep_reduction / (parseFloat(building.areaUseful)||1)).toFixed(1)}` : "0"} unit="kWh/(m²·an)" status="ok" />
                  <ResultRow label={t("Ep ajustată",lang)} value={renewSummary.ep_adjusted_m2.toFixed(1)} unit="kWh/(m²·an)"
                    status={renewSummary.ep_adjusted_m2 < 120 ? "ok" : renewSummary.ep_adjusted_m2 < 250 ? "warn" : "fail"} />
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">CO2 ajustat</div>
                  <ResultRow label={t("CO2 fără regenerabile",lang)} value={(instSummary?.co2_total_m2||0).toFixed(1)} unit="kg/(m2an)" />
                  <ResultRow label={t("CO2 ajustat",lang)} value={renewSummary.co2_adjusted_m2.toFixed(1)} unit="kg/(m2an)" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 opacity-30">
                <div className="text-3xl mb-2">☀️</div>
                <div className="text-xs">Completează pașii anteriori pentru a vedea impactul surselor regenerabile</div>
              </div>
            )}
          </Card>

          {/* nZEB check — Sprint 6: extins cu RER on-site ≥10% (L.238/2024 Art.6) */}
          {renewSummary && (() => {
            const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
            const epMax = getNzebEpMax(building.category, selectedClimate?.zone);
            const rerTotalOk = renewSummary.rer >= nzeb.rer_min;
            const rerOnSiteOk = renewSummary.rerOnSite >= (nzeb.rer_onsite_min || 10);
            const epOk = renewSummary.ep_adjusted_m2 < epMax;
            const isNzeb = rerTotalOk && rerOnSiteOk && epOk;
            return (
            <Card title={t("Verificare nZEB (L.238/2024 Art.6)",lang)} className={isNzeb ? "border-emerald-500/20" : "border-red-500/20"}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">RER total &ge; {nzeb.rer_min}%</span>
                  <span className={cn("text-xs font-medium", rerTotalOk ? "text-emerald-400" : "text-red-400")}>
                    {rerTotalOk ? "DA" : "NU"} ({renewSummary.rer.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">RER on-site &ge; {nzeb.rer_onsite_min || 10}% <span className="opacity-40">(L.238/2024)</span></span>
                  <span className={cn("text-xs font-medium", rerOnSiteOk ? "text-emerald-400" : "text-red-400")}>
                    {rerOnSiteOk ? "DA" : "NU"} ({renewSummary.rerOnSite.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Ep &lt; {epMax} kWh/(m²an)</span>
                  <span className={cn("text-xs font-medium", epOk ? "text-emerald-400" : "text-red-400")}>
                    {epOk ? "DA" : "NU"} ({renewSummary.ep_adjusted_m2.toFixed(1)})
                  </span>
                </div>
                {renewSummary.proximityValid && renewSummary.qProximity > 0 && (
                  <div className="text-[10px] opacity-50 pt-1 border-t border-white/5">
                    ℹ Include {renewSummary.qProximity.toFixed(0)} kWh/an din proximitate ({renewSummary.proximityDistanceKm} km GPS) — contribuie la RER total, nu la on-site.
                  </div>
                )}
                {!rerOnSiteOk && rerTotalOk && (
                  <div className="text-[10px] text-amber-300 pt-1 border-t border-white/5">
                    ⚠ RER total OK, dar RER on-site sub 10% — L.238/2024 cere minim 10% pe clădire (nu doar proximitate). Adăugați PV/solar termic pe clădire.
                  </div>
                )}
                {renewSummary.pc_spf_compliant === false && (
                  <div className="text-[10px] text-amber-300 pt-1 border-t border-white/5">
                    ⚠ PC cu SCOP &lt; 2.5 — fracția regenerabilă nu se contabilizează (RED II Anexa VII, Dir. UE 2018/2001).
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-xs font-medium">Statut nZEB</span>
                  <Badge color={isNzeb ? "green" : "red"}>
                    {isNzeb ? "CONFORM" : "NECONFORM"}
                  </Badge>
                </div>
              </div>
            </Card>
            );
          })()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
        <button onClick={() => setStep(3)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
          ← Pas 3: Instalații
        </button>
        <button onClick={() => goToStep(5, 4)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
          Pasul 5: Calcul energetic →
        </button>
      </div>
    </div>
  );
}
