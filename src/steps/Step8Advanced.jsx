import { useState, useMemo } from "react";
import { cn, Card, Badge, ResultRow } from "../components/ui.jsx";
import { calcPeakThermalLoad, calcPeakCoolingLoad } from "../calc/en12831.js";
import { calcVentilationFlow, VENT_PER_PERSON } from "../calc/ventilation-flow.js";
import { generateEPBDXML, downloadXML } from "../calc/epbd-xml-export.js";
import { calcRehabPackages } from "../calc/rehab-comparator.js";
import { calcHeatPumpSizing, HP_TYPES } from "../calc/heat-pump-sizing.js";
import { calcMaintenanceFund, BUILDING_COMPONENTS } from "../calc/maintenance-fund.js";
import { calcPNRRFunding } from "../calc/pnrr-funding.js";
import { generateThermalMapSVG, generateThermalBridgeHeatmap } from "../calc/thermal-map.js";
import { calcSolarACMDetailed, COLLECTOR_TYPES } from "../calc/solar-acm-detailed.js";
import { checkPasivhaus } from "../calc/pasivhaus.js";
import { checkAcousticConformity } from "../calc/acoustic.js";
import { calcBenchmark } from "../calc/benchmark.js";
import { checkMajorRenovConformity } from "../calc/epbd.js";
import { calcFinancialScenarios } from "../calc/financial.js";

const TAB_SECTIONS = [
  { id:"benchmark",   icon:"📊", label:"Benchmark" },
  { id:"en12831",     icon:"🔥", label:"Sarcină vârf" },
  { id:"ventilare",   icon:"💨", label:"Ventilare" },
  { id:"pompa",       icon:"♨️", label:"Pompă căldură" },
  { id:"rehab",       icon:"🏗️", label:"Pachete reabilitare" },
  { id:"pnrr",        icon:"💶", label:"Finanțare" },
  { id:"fond_rep",    icon:"🔧", label:"Fond reparații" },
  { id:"solar_acm",   icon:"☀️", label:"Solar termic" },
  { id:"thermal_map", icon:"🌡️", label:"Hartă termică" },
  { id:"pasivhaus",   icon:"🏠", label:"Pasivhaus" },
  { id:"acustic",     icon:"🔊", label:"Acustic" },
  { id:"conformitate",icon:"✅", label:"Conformitate U" },
  { id:"xml_export",  icon:"📥", label:"Export XML" },
];

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">{icon} {title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ConformBadge({ ok, label }) {
  if (ok === null || ok === undefined) return <Badge className="bg-slate-700 text-slate-300">N/A</Badge>;
  return <Badge className={ok ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}>{ok ? "✓ " : "✗ "}{label}</Badge>;
}

function ColorBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, value / max * 100) : 0;
  return (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: pct + "%", backgroundColor: color || "#6366f1" }} />
    </div>
  );
}

export default function Step8Advanced({ building, climate, opaqueElements, glazingElements, thermalBridges, instSummary, renewSummary, systems }) {
  const [activeTab, setActiveTab] = useState("benchmark");
  const [hpTypeId, setHpTypeId] = useState("AA_STD");
  const [collectorType, setCollectorType] = useState("PLAN_SEL");
  const [nPersons, setNPersons] = useState("");
  const [maintComponents, setMaintComponents] = useState([]);
  const [externalNoise, setExternalNoise] = useState(55);
  const [ownerType, setOwnerType] = useState("fizica");
  const [xmlGenerated, setXmlGenerated] = useState(false);

  const Au = parseFloat(building?.areaUseful) || 100;
  const V = parseFloat(building?.volume) || Au * 2.8;
  const cat = building?.category || "RI";
  const zone = climate?.zone || "III";
  const epActual = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 150;

  // ── Benchmark ──
  const benchmark = useMemo(() => calcBenchmark({
    category: cat, zone, epActual,
    yearBuilt: building?.yearBuilt, Au,
    epAfterRehab: renewSummary?.ep_adjusted_m2 !== epActual ? renewSummary?.ep_adjusted_m2 : null,
  }), [cat, zone, epActual, building?.yearBuilt, Au]);

  // ── EN 12831 ──
  const peakLoad = useMemo(() => calcPeakThermalLoad({
    opaqueElements, glazingElements, thermalBridges,
    V, Au, n50: parseFloat(building?.n50) || 4.0, hrEta: systems?.hrEta || 0,
    climate, category: cat,
    structure: building?.structure, windExposure: building?.windExposure,
  }), [opaqueElements, glazingElements, thermalBridges, V, Au, building, systems, climate, cat]);

  const peakCooling = useMemo(() => calcPeakCoolingLoad({
    Au, glazingElements, climate,
    internalGains: 6,
  }), [Au, glazingElements, climate]);

  // ── Ventilare ──
  const ventFlow = useMemo(() => calcVentilationFlow({
    Au, H: V/Au, category: cat, ieqCategory: "II",
    ventType: systems?.ventType || "NATURAL",
    occupancy: nPersons ? parseInt(nPersons) : null,
    hrEta: systems?.hrEta || 0,
    climate,
  }), [Au, V, cat, systems, nPersons, climate]);

  // ── Pompă de căldură ──
  const hpSizing = useMemo(() => peakLoad ? calcHeatPumpSizing({
    phi_H_design: peakLoad.phi_H_total,
    phi_H_annual: instSummary?.qH_nd_total || peakLoad.phi_H_total * 2,
    hpTypeId, climate, Au,
    emissionSystem: systems?.emissionSystem,
  }) : null, [peakLoad, hpTypeId, climate, Au, instSummary, systems]);

  // ── Comparator pachete reabilitare ──
  const rehabPackages = useMemo(() => calcRehabPackages({
    building, climate, epActual,
    wallArea: opaqueElements?.filter(e=>e.type==="PE").reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.7,
    roofArea: opaqueElements?.filter(e=>["PT","PP"].includes(e.type)).reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.9,
    windowArea: glazingElements?.reduce((s,e)=>s+(parseFloat(e.area)||0),0) || Au*0.15,
    energyPriceEUR: 0.08, discountRate: 5, escalation: 3, period: 30,
  }), [building, climate, epActual, opaqueElements, glazingElements, Au]);

  // ── PNRR ──
  const pnrrResult = useMemo(() => calcPNRRFunding({
    building, epActual, epAfterRehab: rehabPackages?.packages?.[2]?.epNew,
    investTotal: rehabPackages?.packages?.[2]?.invest || 0,
    measures: ["Pompă de căldură","PV","Termoizolare"],
    ownerType,
  }), [building, epActual, rehabPackages, ownerType]);

  // ── Hartă termică ──
  const thermalMap = useMemo(() => generateThermalMapSVG({
    opaqueElements, glazingElements, thermalBridges,
    tInt: building?.theta_int || 20,
    tExt: climate?.theta_e || -15,
    width: 560, height: 280,
  }), [opaqueElements, glazingElements, thermalBridges, building, climate]);

  const tbHeatmap = useMemo(() => generateThermalBridgeHeatmap(thermalBridges), [thermalBridges]);

  // ── Solar ACM ──
  const solarACM = useMemo(() => calcSolarACMDetailed({
    collectorType, collectorArea: Math.max(2, Au * 0.03),
    orientation: "S", tiltDeg: 45, climate,
    nPersons: nPersons ? parseInt(nPersons) : Math.ceil(Au/25),
    storageVolume: Math.round(Math.max(2, Au*0.03) * 60),
    antifreeze: climate?.zone >= "IV" ? "PG50" : "PG40",
  }), [collectorType, Au, climate, nPersons]);

  // ── Pasivhaus ──
  const pasivhausCheck = useMemo(() => checkPasivhaus({
    opaqueElements, glazingElements, thermalBridges,
    n50: parseFloat(building?.n50) || 4.0,
    hrEta: systems?.hrEta || 0,
    qH_nd_m2: instSummary?.qH_nd_m2,
    qC_nd_m2: instSummary?.qC_nd_m2,
    peakHeating_Wm2: peakLoad ? peakLoad.phi_specific : null,
    ep_primary_m2: epActual, Au, V,
    category: cat,
  }), [opaqueElements, glazingElements, thermalBridges, building, systems, instSummary, peakLoad, epActual, Au, V, cat]);

  // ── Acustic ──
  const acousticCheck = useMemo(() => checkAcousticConformity({
    opaqueElements, glazingElements, category: cat, externalNoise,
  }), [opaqueElements, glazingElements, cat, externalNoise]);

  // ── Conformitate U reabilitare majoră ──
  const uConformity = useMemo(() => checkMajorRenovConformity(opaqueElements, glazingElements, cat), [opaqueElements, glazingElements, cat]);

  // ── Export XML ──
  function handleXMLExport() {
    const xml = generateEPBDXML({
      building, climate, instSummary, renewSummary,
      opaqueElements, glazingElements,
      energyClass: renewSummary?.energyClass || instSummary?.energyClass,
      certDate: new Date().toISOString().split('T')[0],
      auditorName: building?.auditorName || "Auditor energetic",
      auditorCode: building?.auditorCode || "AE-XXXX",
    });
    downloadXML(xml, `CPE-${(building?.address || "cladire").replace(/[^a-z0-9]/gi,'_')}.xml`);
    setXmlGenerated(true);
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TAB_SECTIONS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === t.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ BENCHMARK ═══ */}
      {activeTab === "benchmark" && (
        <Card className="p-4">
          <SectionHeader icon="📊" title="Benchmark performanță energetică"
            subtitle="Comparare cu stocul de clădiri similar din aceeași zonă climatică (date agregate MDLPA 2022-2024)" />
          {benchmark ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Clădirea dvs.</div>
                  <div className="text-2xl font-bold text-white">{epActual} <span className="text-sm text-slate-400">kWh/(m²·an)</span></div>
                  <Badge className="mt-1" style={{ backgroundColor: benchmark.percentileActual?.color + "33", color: benchmark.percentileActual?.color }}>
                    {benchmark.percentileActual?.label}
                  </Badge>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Median similar (zona {zone})</div>
                  <div className="text-2xl font-bold text-slate-300">{benchmark.benchmark.p50} <span className="text-sm text-slate-400">kWh/(m²·an)</span></div>
                  <div className="text-xs text-slate-500 mt-1">Perioada: {benchmark.eraLabel}</div>
                </div>
              </div>
              {/* Bar chart */}
              <div className="space-y-2">
                {benchmark.chart.bars.map(bar => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cn("text-slate-300", bar.highlight && "font-bold text-white")}>{bar.label}</span>
                      <span className="text-slate-400">{bar.value} kWh/m²</span>
                    </div>
                    <ColorBar value={bar.value} max={benchmark.benchmark.p90 * 1.1} color={bar.color} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3">
                {benchmark.verdict}<br/>
                <span className="text-indigo-300">{benchmark.recommendation}</span>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Date insuficiente pentru benchmark.</p>}
        </Card>
      )}

      {/* ═══ EN 12831 ═══ */}
      {activeTab === "en12831" && (
        <Card className="p-4">
          <SectionHeader icon="🔥" title="Sarcină termică de vârf — SR EN 12831-1:2017"
            subtitle="Calcul putere necesară pentru dimensionarea instalației de încălzire și răcire" />
          {peakLoad ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-red-300 mb-1">Sarcină vârf încălzire</div>
                  <div className="text-2xl font-bold text-white">{(peakLoad.phi_H_total/1000).toFixed(1)}</div>
                  <div className="text-xs text-slate-400">kW</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-300 mb-1">Sarcină specifică</div>
                  <div className="text-2xl font-bold text-white">{peakLoad.phi_specific}</div>
                  <div className="text-xs text-slate-400">W/m²</div>
                </div>
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-300 mb-1">ΔT calcul</div>
                  <div className="text-2xl font-bold text-white">{peakLoad.deltaT}°C</div>
                  <div className="text-xs text-slate-400">{peakLoad.tInt}°C interior / {peakLoad.tExt}°C exterior</div>
                </div>
              </div>
              <ResultRow label="H_T — transmisie" value={peakLoad.H_T + " W/K"} />
              <ResultRow label="H_V — ventilare" value={peakLoad.H_V + " W/K"} />
              <ResultRow label="H_TB — punți termice" value={peakLoad.H_TB + " W/K"} />
              <ResultRow label="H_total" value={peakLoad.H_total + " W/K"} />
              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-sm text-indigo-200">
                <strong>Sistem recomandat:</strong> {peakLoad.systemRecommendation}
              </div>
              {peakCooling && (
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="text-sm font-medium text-slate-300 mb-2">Sarcină de răcire (estimare EN 15243)</div>
                  <ResultRow label="Sarcină vârf răcire" value={(peakCooling.phi_C_total/1000).toFixed(1) + " kW"} />
                  <ResultRow label="Specific" value={peakCooling.phi_C_m2 + " W/m²"} />
                  <div className="text-xs text-slate-400 mt-2">{peakCooling.coolingSysRec}</div>
                </div>
              )}
              {/* Tabel elemente */}
              {peakLoad.elementLoads?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Detaliu pierderi pe elemente</div>
                  <div className="overflow-auto max-h-40">
                    <table className="w-full text-xs text-slate-300">
                      <thead><tr className="text-slate-500 border-b border-slate-700">
                        <th className="text-left pb-1">Element</th>
                        <th className="text-right pb-1">Arie m²</th>
                        <th className="text-right pb-1">U W/(m²·K)</th>
                        <th className="text-right pb-1">H W/K</th>
                      </tr></thead>
                      <tbody>{peakLoad.elementLoads.map((el,i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="py-1">{el.name}</td>
                          <td className="text-right">{el.area}</td>
                          <td className="text-right">{el.U}</td>
                          <td className="text-right">{el.load_WK}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți date anvelopă (Pasul 2) pentru calcul sarcină termică.</p>}
        </Card>
      )}

      {/* ═══ VENTILARE ═══ */}
      {activeTab === "ventilare" && (
        <Card className="p-4">
          <SectionHeader icon="💨" title="Debit ventilare igienic — SR EN 16798-1:2019"
            subtitle="Verificare calitate aer interior, calcul CO₂ estimat și conformitate debit" />
          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Număr persoane (opțional)</label>
              <input type="number" value={nPersons} onChange={e=>setNPersons(e.target.value)} min="1" placeholder="auto"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            </div>
          </div>
          {ventFlow ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Debit necesar</div>
                  <div className="text-xl font-bold text-white">{ventFlow.q_total_M3H}</div>
                  <div className="text-xs text-slate-400">m³/h</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">CO₂ estimat</div>
                  <div className={cn("text-xl font-bold", ventFlow.co2Conform ? "text-green-400" : "text-red-400")}>{ventFlow.co2_steady}</div>
                  <div className="text-xs text-slate-400">ppm (limită: {ventFlow.co2Limit})</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Schimburi aer</div>
                  <div className="text-xl font-bold text-white">{ventFlow.n_air}</div>
                  <div className="text-xs text-slate-400">ach</div>
                </div>
              </div>
              <ResultRow label="Persoane estimate" value={ventFlow.nPersons + " pers."} />
              <ResultRow label="Debit specific per persoană" value={VENT_PER_PERSON["II"] + " L/s·pers (Cat. II)"} />
              <ResultRow label="Debit minim igienic" value={ventFlow.q_min_LS + " L/s"} />
              <ResultRow label="Energie ventilare estimată" value={ventFlow.ventEnergyKwh + " kWh/an"} />
              <div className="flex gap-2">
                <ConformBadge ok={ventFlow.qConform} label="Debit conform" />
                <ConformBadge ok={ventFlow.co2Conform} label={"CO₂ ≤ " + ventFlow.co2Limit + " ppm"} />
              </div>
              <div className="text-xs rounded-lg p-3" style={{ backgroundColor: ventFlow.color + "22", color: ventFlow.color }}>
                {ventFlow.verdict}
              </div>
              {ventFlow.recommendation && (
                <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">{ventFlow.recommendation}</div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți aria utilă pentru calcul ventilare.</p>}
        </Card>
      )}

      {/* ═══ POMPĂ CĂLDURĂ ═══ */}
      {activeTab === "pompa" && (
        <Card className="p-4">
          <SectionHeader icon="♨️" title="Dimensionare pompă de căldură + SCOP sezonier"
            subtitle="SR EN 14825:2022 — putere nominală, SCOP real pe date climatice" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Tip pompă de căldură</label>
            <select value={hpTypeId} onChange={e=>setHpTypeId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
              {HP_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
          </div>
          {hpSizing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-300">Putere recomandată</div>
                  <div className="text-2xl font-bold text-white">{hpSizing.phi_nom_kW} kW</div>
                </div>
                <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-300">SCOP sezonier</div>
                  <div className="text-2xl font-bold text-white">{hpSizing.scop?.scop || "—"}</div>
                  <div className="text-xs text-slate-400">{hpSizing.scop?.classification}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Cost estimat</div>
                  <div className="text-lg font-bold text-white">{hpSizing.costEstimate?.toLocaleString()} EUR</div>
                </div>
              </div>
              <ResultRow label="Temperatură agent termic" value={hpSizing.agentTemp + "°C — " + hpSizing.agentTempLabel.split("—")[0]} />
              <ResultRow label="Vas tampon recomandat" value={hpSizing.vasBuffer_L + " L"} />
              <ResultRow label="Boiler ACM recomandat" value={hpSizing.boilerACM_L + " L"} />
              <ConformBadge ok={hpSizing.compatible_floor_heating} label="Compatibil pardoseală" />
              {hpSizing.recommendation?.map((r,i) => (
                <div key={i} className="text-xs text-indigo-200 bg-indigo-900/20 rounded p-2">{r}</div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">Calculați mai întâi sarcina termică (tab Sarcină vârf).</p>}
        </Card>
      )}

      {/* ═══ COMPARATOR PACHETE REABILITARE ═══ */}
      {activeTab === "rehab" && (
        <Card className="p-4">
          <SectionHeader icon="🏗️" title="Comparator pachete de reabilitare"
            subtitle="Analiză paralelă 3 scenarii: Minimal, Mediu, nZEB Integral — NPV + termen recuperare" />
          {rehabPackages ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-3">
                EP actual: <strong className="text-white">{epActual}</strong> kWh/(m²·an) |
                Țintă nZEB: <strong className="text-green-400">{rehabPackages.nzebEpMax}</strong> kWh/(m²·an) |
                Gap: <strong className="text-orange-400">{rehabPackages.epGap}</strong> kWh/(m²·an)
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {rehabPackages.packages.map((pkg, i) => (
                  <div key={i} className={cn("rounded-xl p-4 border",
                    pkg.isBest ? "border-green-600 bg-green-900/10" : "border-slate-700 bg-slate-800/50")}>
                    {pkg.isBest && <Badge className="bg-green-600 text-white text-xs mb-2">⭐ Optim NPV</Badge>}
                    <div className="font-bold text-white mb-1">{pkg.label}</div>
                    <div className="text-2xl font-bold" style={{color: pkg.nzebConform ? "#22c55e" : "#f97316"}}>
                      {pkg.epNew} <span className="text-sm text-slate-400">kWh/(m²·an)</span>
                    </div>
                    <div className="text-xs text-slate-400">Reducere: -{pkg.epReductionPct}%</div>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Investiție</span><span className="text-white font-medium">{pkg.invest?.toLocaleString()} EUR</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Economie anuală</span><span className="text-green-400">{pkg.annualSaving?.toLocaleString()} EUR/an</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">NPV 30 ani</span>
                        <span className={pkg.fin?.npv >= 0 ? "text-green-400" : "text-red-400"}>{pkg.fin?.npv?.toLocaleString()} EUR</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Recuperare</span><span className="text-white">{pkg.fin?.paybackSimple} ani</span></div>
                      {pkg.fin?.irr && <div className="flex justify-between"><span className="text-slate-400">IRR</span><span className="text-white">{pkg.fin.irr}%</span></div>}
                    </div>
                    <ConformBadge ok={pkg.nzebConform} label={pkg.nzebConform ? "Conform nZEB" : "Sub nZEB"} />
                    <div className="mt-2 text-xs text-slate-500">
                      {pkg.measures?.map((m,j) => <div key={j}>• {m}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Date insuficiente pentru compararea pachetelor.</p>}
        </Card>
      )}

      {/* ═══ PNRR / FINANȚARE ═══ */}
      {activeTab === "pnrr" && (
        <Card className="p-4">
          <SectionHeader icon="💶" title="Calculator finanțare — Casa Verde Plus, PNRR, AFM"
            subtitle="Eligibilitate și grant estimat pentru programele active 2024-2026 în România" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Tip proprietar</label>
            <select value={ownerType} onChange={e=>setOwnerType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
              <option value="fizica">Persoană fizică</option>
              <option value="juridica">Persoană juridică / Firmă</option>
              <option value="uat">Autoritate publică (UAT)</option>
            </select>
          </div>
          {pnrrResult ? (
            <div className="space-y-3">
              {pnrrResult.bestProgram && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
                  <div className="text-xs text-green-400 font-medium mb-1">CEL MAI BUN PROGRAM ELIGIBIL</div>
                  <div className="font-bold text-white">{pnrrResult.bestProgram.programName}</div>
                  <div className="text-2xl font-bold text-green-400 mt-1">{pnrrResult.bestProgram.grantAmount?.toLocaleString()} EUR <span className="text-sm text-slate-400">grant</span></div>
                  <div className="text-xs text-slate-400">Cofinanțare proprie: {pnrrResult.selfFinancing?.toLocaleString()} EUR ({pnrrResult.bestProgram.grantPct}% grant)</div>
                  <div className="text-xs text-slate-500 mt-2">{pnrrResult.bestProgram.note}</div>
                </div>
              )}
              {pnrrResult.results.map(r => (
                <div key={r.programId} className={cn("rounded-lg p-3 border",
                  r.isEligible ? "border-green-800/40 bg-green-900/10" : "border-slate-700 bg-slate-800/40 opacity-60")}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-sm text-white">{r.programName}</div>
                    <ConformBadge ok={r.isEligible} label={r.isEligible ? "Eligibil" : "Neeligibil"} />
                  </div>
                  <div className="text-xs text-slate-400">{r.authority} | {r.legal}</div>
                  {r.isEligible && <div className="text-sm text-green-300 mt-1">Grant estimat: {r.grantAmount?.toLocaleString()} EUR ({r.grantPct}%)</div>}
                  {r.ineligible.map((msg,i) => <div key={i} className="text-xs text-red-400 mt-1">✗ {msg}</div>)}
                </div>
              ))}
              {pnrrResult.note && <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">{pnrrResult.note}</div>}
            </div>
          ) : null}
        </Card>
      )}

      {/* ═══ FOND REPARAȚII ═══ */}
      {activeTab === "fond_rep" && (
        <Card className="p-4">
          <SectionHeader icon="🔧" title="Fond de reparații — simulare 30 ani"
            subtitle="Planificare costuri mentenanță și înlocuire componente. Selectați componentele existente." />
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-2">Selectați componentele clădirii:</div>
            <div className="grid grid-cols-2 gap-1">
              {BUILDING_COMPONENTS.filter(c => ["cazan","pompa_caldura","ventilare_hr","pv_sistem","tamp_ferestre","invelitoare","terasa_hidroiz","boiler_acm","solar_termic","led"].includes(c.id)).map(comp => {
                const selected = maintComponents.find(m=>m.id===comp.id);
                return (
                  <label key={comp.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={!!selected}
                      onChange={e => {
                        if (e.target.checked) setMaintComponents(p => [...p, {id:comp.id, units:1}]);
                        else setMaintComponents(p => p.filter(m=>m.id!==comp.id));
                      }} className="rounded" />
                    {comp.label} ({comp.cat})
                  </label>
                );
              })}
            </div>
          </div>
          {maintComponents.length > 0 && (() => {
            const fund = calcMaintenanceFund({ components: maintComponents, years: 30, inflationRate: 4, discountRate: 5 });
            if (!fund) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">Total VAN 30 ani</div>
                    <div className="text-lg font-bold text-white">{fund.totalPVCost?.toLocaleString()} EUR</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400">Medie anuală</div>
                    <div className="text-lg font-bold text-white">{fund.avgAnnualCost?.toLocaleString()} EUR/an</div>
                  </div>
                  <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-indigo-300">Contribuție lunară</div>
                    <div className="text-lg font-bold text-white">{fund.monthlyContribution?.toLocaleString()} EUR/lună</div>
                  </div>
                </div>
                {fund.criticalYears?.length > 0 && (
                  <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">
                    <strong>Ani critici (cheltuieli mari):</strong> {fund.criticalYears.map(y=>y.year).join(", ")}
                  </div>
                )}
                <div className="space-y-1">
                  {fund.componentDetails.map(c => (
                    <div key={c.id} className="flex justify-between text-xs text-slate-300 bg-slate-800 rounded px-3 py-2">
                      <span>{c.label}</span>
                      <span className="text-slate-400">{c.pvCost?.toLocaleString()} EUR VAN</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {maintComponents.length === 0 && <p className="text-slate-500 text-sm">Selectați componentele pentru simulare.</p>}
        </Card>
      )}

      {/* ═══ SOLAR ACM ═══ */}
      {activeTab === "solar_acm" && (
        <Card className="p-4">
          <SectionHeader icon="☀️" title="ACM solar detaliat — SR EN ISO 9806:2017"
            subtitle="Calcul producție, fracție solară lunară, risc stagnare, curbe colector" />
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tip colector</label>
              <select value={collectorType} onChange={e=>setCollectorType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white">
                {COLLECTOR_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Număr persoane</label>
              <input type="number" value={nPersons} onChange={e=>setNPersons(e.target.value)} min="1" placeholder="auto"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            </div>
          </div>
          {solarACM ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-yellow-300">Fracție solară anuală</div>
                  <div className="text-2xl font-bold text-white">{solarACM.fSolarAnnual}%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Producție anuală</div>
                  <div className="text-xl font-bold text-white">{solarACM.totalSolarYield_kwh} kWh</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400">Suprafață colectori</div>
                  <div className="text-xl font-bold text-white">{solarACM.collectorArea?.toFixed(1)} m²</div>
                </div>
              </div>
              <ResultRow label="Vas acumulare recomandat" value={solarACM.storageRec + " L"} />
              <ResultRow label="Fluid anti-îngheț" value={solarACM.antifreeze?.name + " (protecție " + solarACM.antifreeze?.protection_t + "°C)"} />
              <ResultRow label="Cost total estimat" value={solarACM.costTotal?.toLocaleString() + " EUR"} />
              {solarACM.warnings?.map((w,i) => <div key={i} className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">⚠️ {w}</div>)}
              {/* Tabel lunar */}
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs text-slate-300">
                  <thead><tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left pb-1">Lună</th>
                    <th className="text-right">Tamb °C</th>
                    <th className="text-right">G kWh/m²</th>
                    <th className="text-right">η %</th>
                    <th className="text-right">Producție kWh</th>
                    <th className="text-right">Fracție %</th>
                  </tr></thead>
                  <tbody>{solarACM.monthly?.map((m,i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-1">{m.month}</td>
                      <td className="text-right">{m.Tamb}</td>
                      <td className="text-right">{m.G_month}</td>
                      <td className="text-right">{m.eta}</td>
                      <td className="text-right">{m.Q_sol_useful}</td>
                      <td className="text-right" style={{color: m.fSolar>=60?"#22c55e":m.fSolar>=40?"#84cc16":m.fSolar>=25?"#eab308":"#ef4444"}}>{m.fSolar}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți date climatice pentru calcul solar.</p>}
        </Card>
      )}

      {/* ═══ HARTĂ TERMICĂ ═══ */}
      {activeTab === "thermal_map" && (
        <Card className="p-4">
          <SectionHeader icon="🌡️" title="Hartă termică anvelopă"
            subtitle="Vizualizare flux termic per element — albastru (pierderi mici) → roșu (pierderi mari)" />
          {thermalMap?.svg ? (
            <div className="space-y-4">
              <div dangerouslySetInnerHTML={{ __html: thermalMap.svg }} className="rounded-lg overflow-hidden" />
              <div className="text-xs text-slate-400">Flux maxim: {thermalMap.maxFlux} W/m² la ΔT = {Math.abs((building?.theta_int||20)-(climate?.theta_e||-15))}°C</div>
              {tbHeatmap?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase">Punți termice — clasificate după pierderi</div>
                  <div className="space-y-1">
                    {tbHeatmap.map((tb,i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded" style={{backgroundColor: tb.color}} />
                        <span className="text-slate-300 flex-1">{tb.desc || tb.cat}</span>
                        <span className="text-slate-400">ψ={tb.psi} W/(m·K) × {tb.length}m = <strong className="text-white">{tb.psiL} W/K</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă (Pasul 2) pentru a genera harta termică.</p>}
        </Card>
      )}

      {/* ═══ PASIVHAUS ═══ */}
      {activeTab === "pasivhaus" && (
        <Card className="p-4">
          <SectionHeader icon="🏠" title="Verificare standard Pasivhaus — PHI Darmstadt"
            subtitle="Criterii PHPP 10 pentru certificare Pasivhaus Classic / Plus / Premium" />
          {pasivhausCheck ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 text-center" style={{backgroundColor: pasivhausCheck.color + "22", border: "1px solid " + pasivhausCheck.color + "55"}}>
                  <div className="text-xs mb-1" style={{color: pasivhausCheck.color}}>Scor conformitate</div>
                  <div className="text-3xl font-bold text-white">{pasivhausCheck.score}%</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Certificare posibilă</div>
                  <div className="text-lg font-bold text-white">{pasivhausCheck.achievable || "Nu este posibilă"}</div>
                </div>
              </div>
              <div className="space-y-1">
                {pasivhausCheck.checks.map(c => (
                  <div key={c.id} className={cn("flex items-center justify-between px-3 py-2 rounded text-xs",
                    c.pass === true ? "bg-green-900/20 text-green-300" :
                    c.pass === false ? (c.critical ? "bg-red-900/20 text-red-300" : "bg-amber-900/20 text-amber-300") :
                    "bg-slate-800 text-slate-400")}>
                    <span>{c.pass===true?"✓":c.pass===false?"✗":"?"} {c.label}</span>
                    <span className="font-mono">{c.value_str} {c.unit} / necesar {c.target}</span>
                  </div>
                ))}
              </div>
              {pasivhausCheck.gaps?.length > 0 && (
                <div className="bg-red-900/20 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-300 mb-2">CRITERII CRITICE NEÎNDEPLINITE:</div>
                  {pasivhausCheck.gaps.map((g,i) => <div key={i} className="text-xs text-red-400">• {g}</div>)}
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Introduceți toate datele anvelopei pentru verificare Pasivhaus.</p>}
        </Card>
      )}

      {/* ═══ ACUSTIC ═══ */}
      {activeTab === "acustic" && (
        <Card className="p-4">
          <SectionHeader icon="🔊" title="Verificare acustică simplificată — SR EN ISO 717-1:2013"
            subtitle="Indice izolare acustică Rw [dB] calculat din masa și structura elementelor" />
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-1">Nivel zgomot exterior [dB(A)]</label>
            <input type="number" value={externalNoise} onChange={e=>setExternalNoise(parseInt(e.target.value)||55)} min="30" max="90"
              className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
            <span className="text-xs text-slate-500 ml-2">55 dB = stradă normală | 70+ dB = artere aglomerate</span>
          </div>
          {acousticCheck ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <ConformBadge ok={acousticCheck.allConform} label={acousticCheck.allConform ? "Conform NP 008-97" : acousticCheck.verdict} />
                {acousticCheck.avgRw && <Badge className="bg-slate-700 text-slate-300">Rw mediu: {acousticCheck.avgRw} dB</Badge>}
              </div>
              <div className="space-y-1">
                {acousticCheck.results.map((r,i) => (
                  <div key={i} className={cn("flex justify-between px-3 py-2 rounded text-xs",
                    r.conform ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300")}>
                    <span>{r.conform?"✓":"✗"} {r.name} ({r.type})</span>
                    <span>Rw={r.Rw} dB / necesar ≥{r.Rw_req} dB{!r.conform ? " (deficit "+r.deficit+" dB)" : ""}</span>
                  </div>
                ))}
              </div>
              {acousticCheck.recommendations?.length > 0 && (
                <div className="bg-amber-900/20 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-300 mb-1">RECOMANDĂRI:</div>
                  {acousticCheck.recommendations.map((r,i) => <div key={i} className="text-xs text-amber-400">• {r}</div>)}
                </div>
              )}
              <div className="text-xs text-slate-500">{acousticCheck.method}</div>
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă pentru verificare acustică.</p>}
        </Card>
      )}

      {/* ═══ CONFORMITATE U RENOVARE ═══ */}
      {activeTab === "conformitate" && (
        <Card className="p-4">
          <SectionHeader icon="✅" title="Conformitate U la renovare majoră"
            subtitle="Verificare automată față de U maxim admis Mc 001-2022 Tabel 2.5 (renovare >25% anvelopă)" />
          {uConformity ? (
            <div className="space-y-3">
              <ConformBadge ok={uConformity.allConform} label={uConformity.verdict} />
              <div className="space-y-1">
                {uConformity.results.map((r,i) => (
                  <div key={i} className={cn("flex justify-between px-3 py-2 rounded text-xs",
                    r.conform ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300")}>
                    <span>{r.conform?"✓":"✗"} {r.name}</span>
                    <span>U={r.U} / U_max={r.Umax} W/(m²·K){!r.conform?" (depășit cu "+r.deficit+")":" "}</span>
                  </div>
                ))}
              </div>
              {!uConformity.allConform && (
                <div className="text-xs text-amber-300 bg-amber-900/20 rounded p-2">
                  Elementele marcate cu ✗ necesită îmbunătățire termică înainte de obținerea avizului de renovare majoră.
                </div>
              )}
            </div>
          ) : <p className="text-slate-500 text-sm">Adăugați elemente de anvelopă pentru verificare conformitate.</p>}
        </Card>
      )}

      {/* ═══ EXPORT XML ═══ */}
      {activeTab === "xml_export" && (
        <Card className="p-4">
          <SectionHeader icon="📥" title="Export date CPE — format XML EPBDcheck"
            subtitle="Format compatibil Directiva 2024/1275/UE — SR EN ISO 52000-1:2017" />
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 space-y-2">
              <p>Generează fișier XML cu toate datele calculului curent:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                <li>Date identificare clădire și date climatice</li>
                <li>Anvelopă detaliată (straturi, U-value, punți termice)</li>
                <li>Sisteme instalații și regenerabile</li>
                <li>Performanță energetică: EP, RER, CO₂, clasă energetică</li>
                <li>Date auditor și dată certificat</li>
              </ul>
            </div>
            <button
              onClick={handleXMLExport}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              📥 Descarcă CPE.xml
            </button>
            {xmlGenerated && (
              <div className="text-xs text-green-400 text-center">✓ Fișier generat și descărcat cu succes!</div>
            )}
            <div className="text-xs text-slate-500 text-center">
              Fișierul XML poate fi importat în sisteme naționale EPBDcheck sau arhivat cu dosarul tehnic al clădirii.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
