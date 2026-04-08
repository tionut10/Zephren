/**
 * LCCAnalysis — Analiză Cost de Ciclu de Viață per măsură de reabilitare
 * Metodologie: EN 15459-1, Regulamentul UE 244/2012 (republicat 2025/2273)
 * Punct de referință cost-optim: 50 kWh/m²·an
 */
import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";

const MEASURES_DEFAULT = [
  { id:"wall_ins",  name:"Termoizolație pereți ext. (EPS 10cm)",       deltaU_pct:65,  investRON_m2:280,  lifespan:30, maintPct:0.5 },
  { id:"roof_ins",  name:"Termoizolație planșeu/acoperiș (vată 20cm)", deltaU_pct:70,  investRON_m2:220,  lifespan:30, maintPct:0.5 },
  { id:"windows",   name:"Înlocuire ferestre (triplu vitraj Low-E)",    deltaU_pct:55,  investRON_m2:1200, lifespan:25, maintPct:1.0 },
  { id:"boiler",    name:"Cazan condensare gaz (η=109%)",               deltaEP_pct:15, investRON:12000,   lifespan:20, maintPct:2.0 },
  { id:"hp",        name:"Pompă de căldură aer-apă (COP=4)",            deltaEP_pct:40, investRON:22000,   lifespan:20, maintPct:2.0 },
  { id:"pv_5kw",    name:"Sistem fotovoltaic 5 kWp",                    prodkWh:5500,   investRON:20000,   lifespan:25, maintPct:1.0 },
  { id:"solar_th",  name:"Panouri solare termice 4m²",                  deltaEP_pct:12, investRON:8000,    lifespan:20, maintPct:1.5 },
  { id:"vmc_hr",    name:"VMC cu recuperare căldură (η=80%)",           deltaEP_pct:18, investRON:15000,   lifespan:20, maintPct:2.0 },
];

const COST_OPTIMAL_REF = 50; // kWh/m²·an — EN 15459-1 / 244/2012

// Calculează NPV economii — flux cu escaladare preț
function calcNPVSavings(saving_an1, escalare, rata, ani) {
  let npv = 0;
  for (let t = 1; t <= ani; t++) {
    const savingT = saving_an1 * Math.pow(1 + escalare, t - 1);
    npv += savingT / Math.pow(1 + rata, t);
  }
  return npv;
}

// Calculează NPV costuri mentenanță
function calcNPVMaint(maint_an1, rata, ani) {
  let npv = 0;
  for (let t = 1; t <= ani; t++) {
    npv += maint_an1 / Math.pow(1 + rata, t);
  }
  return npv;
}

// Payback actualizat (ani până când NPV cumulat > 0)
function calcDiscountedPayback(investitie, saving_an1, maint_an1, escalare, rata, lifespan) {
  let cumul = -investitie;
  for (let t = 1; t <= lifespan; t++) {
    const savingT = saving_an1 * Math.pow(1 + escalare, t - 1);
    const cashflow = savingT - maint_an1;
    cumul += cashflow / Math.pow(1 + rata, t);
    if (cumul >= 0) return t;
  }
  return null; // nu se recuperează
}

function calcMeasure(m, Au, ep_m2, pretEnergie, escalare, rata, perioadaAnalize) {
  // Reducere EP anuală (kWh)
  let ep_reducere_kWh = 0;
  if (m.deltaEP_pct) {
    ep_reducere_kWh = ep_m2 * Au * (m.deltaEP_pct / 100);
  } else if (m.deltaU_pct) {
    // Proporție din EP total atribuită anvelopei
    ep_reducere_kWh = ep_m2 * Au * (m.deltaU_pct / 100) * 0.45;
  } else if (m.prodkWh) {
    ep_reducere_kWh = m.prodkWh; // producție PV
  }

  // Investiție totală
  const investitie = m.investRON_m2 ? m.investRON_m2 * Au : (m.investRON || 0);

  // Economie an 1 (RON)
  const economie_an1 = ep_reducere_kWh * pretEnergie;

  // Mentenanță an 1
  const maint_an1 = investitie * (m.maintPct / 100);

  // Payback simplu
  const payback_simplu = economie_an1 > 0 ? investitie / economie_an1 : Infinity;

  // NPV pe perioadaAnalize ani
  const npv_economii = calcNPVSavings(economie_an1, escalare, rata, perioadaAnalize);
  const npv_maint = calcNPVMaint(maint_an1, rata, perioadaAnalize);
  const npv = npv_economii - npv_maint - investitie;

  // LCC (cost total actualizat de ciclu de viață)
  const lcc = investitie + npv_maint - npv_economii;

  // Payback actualizat
  const payback_disc = calcDiscountedPayback(investitie, economie_an1, maint_an1, escalare, rata, m.lifespan);

  // LCOE (RON per kWh economisit, actualizat)
  const total_kwh_disc = ep_reducere_kWh > 0
    ? calcNPVSavings(ep_reducere_kWh, 0, rata, m.lifespan)
    : 0;
  const lcoe = total_kwh_disc > 0 ? (investitie + npv_maint) / total_kwh_disc : null;

  // EP după măsură
  let deltaEP_abs = 0;
  if (m.deltaEP_pct) deltaEP_abs = ep_m2 * (m.deltaEP_pct / 100);
  else if (m.deltaU_pct) deltaEP_abs = ep_m2 * (m.deltaU_pct / 100) * 0.45;
  else if (m.prodkWh && Au > 0) deltaEP_abs = m.prodkWh / Au;

  const ep_dupa = Math.max(0, ep_m2 - deltaEP_abs);
  const cost_optim = ep_dupa <= COST_OPTIMAL_REF;

  return { ep_reducere_kWh, investitie, economie_an1, maint_an1, payback_simplu, payback_disc, npv, lcc, lcoe, ep_dupa, cost_optim };
}

const fmtRON = v => isFinite(v) && v !== null ? v.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " RON" : "—";
const fmtAni = v => v !== null && isFinite(v) ? v.toFixed(1) + " ani" : "N/R";
const fmtKWh = v => v != null ? v.toLocaleString("ro-RO", { maximumFractionDigits: 2 }) : "—";

const SORT_COLS = ["name","investitie","economie_an1","payback_simplu","npv","lcc"];

export default function LCCAnalysis({ building = {}, instSummary = {}, opaqueElements = [] }) {
  const Au = building.areaUseful || 200;
  const ep_m2 = instSummary.ep_total_m2 || 120;

  const [params, setParams] = useState({
    pretEnergie: 0.92,
    escalare: 0.03,
    rata: 0.05,
    perioadaAnalize: 30,
  });
  const [measures, setMeasures] = useState(MEASURES_DEFAULT);
  const [sortCol, setSortCol] = useState("npv");
  const [sortDir, setSortDir] = useState(-1); // -1 desc, 1 asc
  const [pachet, setPachet] = useState({});
  const [editingMeasure, setEditingMeasure] = useState(null);

  const results = useMemo(() => {
    return measures.map(m => ({
      ...m,
      ...calcMeasure(m, Au, ep_m2, params.pretEnergie, params.escalare, params.rata, params.perioadaAnalize),
    }));
  }, [measures, Au, ep_m2, params]);

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const av = a[sortCol] ?? (sortDir === -1 ? -Infinity : Infinity);
      const bv = b[sortCol] ?? (sortDir === -1 ? -Infinity : Infinity);
      return sortDir * (typeof av === "string" ? av.localeCompare(bv) : bv - av);
    });
  }, [results, sortCol, sortDir]);

  // Pachet optim
  const pachetSelected = results.filter(r => pachet[r.id]);
  const pachetAnalysis = useMemo(() => {
    if (!pachetSelected.length) return null;
    const totalInvest = pachetSelected.reduce((s, r) => s + r.investitie, 0);
    // Reducere EP aditivă, limitată la 90%
    let deltaEP_pct_total = 0;
    pachetSelected.forEach(r => {
      if (r.deltaEP_pct) deltaEP_pct_total += r.deltaEP_pct;
      else if (r.deltaU_pct) deltaEP_pct_total += r.deltaU_pct * 0.45;
      else if (r.prodkWh && Au > 0) deltaEP_pct_total += (r.prodkWh / Au / ep_m2) * 100;
    });
    deltaEP_pct_total = Math.min(90, deltaEP_pct_total);
    const ep_reducere_total = ep_m2 * Au * deltaEP_pct_total / 100;
    const economie_an1 = ep_reducere_total * params.pretEnergie;
    const maint_an1 = pachetSelected.reduce((s, r) => s + r.maint_an1, 0);
    const npv = calcNPVSavings(economie_an1, params.escalare, params.rata, params.perioadaAnalize)
      - calcNPVMaint(maint_an1, params.rata, params.perioadaAnalize)
      - totalInvest;
    const ep_dupa = Math.max(0, ep_m2 - ep_m2 * deltaEP_pct_total / 100);
    return { totalInvest, deltaEP_pct_total, ep_reducere_total, economie_an1, npv, ep_dupa, cost_optim: ep_dupa <= COST_OPTIMAL_REF };
  }, [pachetSelected, Au, ep_m2, params]);

  // SVG bar chart
  const chartMeasures = [...sorted].sort((a, b) => b.npv - a.npv);
  const maxAbs = Math.max(...chartMeasures.map(r => Math.abs(r.npv)), 1);
  const BAR_H = 22, BAR_GAP = 6, LABEL_W = 200, CHART_W = 320, SVG_PAD = 8;
  const svgH = chartMeasures.length * (BAR_H + BAR_GAP) + SVG_PAD * 2;

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(-1); }
  }

  function handleParamChange(key, val) {
    setParams(p => ({ ...p, [key]: parseFloat(val) || 0 }));
  }

  function handleMeasureEdit(id, field, val) {
    setMeasures(ms => ms.map(m => m.id === id ? { ...m, [field]: field === "name" ? val : parseFloat(val) || 0 } : m));
  }

  const SortTh = ({ col, label }) => (
    <th
      className="px-2 py-1.5 text-left text-xs font-semibold text-amber-400 cursor-pointer hover:text-amber-300 whitespace-nowrap select-none"
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortDir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );

  return (
    <div className="space-y-6 text-sm text-slate-200">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h2 className="text-base font-bold text-amber-400 mb-1">Analiză Cost Ciclu de Viață (LCC)</h2>
        <p className="text-xs text-slate-400">EN 15459-1 · Regulamentul UE 244/2012 (rep. 2025/2273) · Referință cost-optim: {COST_OPTIMAL_REF} kWh/m²·an</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
          <span>Suprafață utilă: <b className="text-white">{Au} m²</b></span>
          <span>EP actual: <b className="text-white">{ep_m2} kWh/m²·an</b></span>
          <span>EP total: <b className="text-white">{(ep_m2 * Au).toLocaleString("ro-RO", {maximumFractionDigits:0})} kWh/an</b></span>
        </div>
      </div>

      {/* Parametri globali */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">Parametri analiză</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key:"pretEnergie",    label:"Preț energie (RON/kWh)",  step:"0.01" },
            { key:"escalare",       label:"Escaladare preț (%/an)",   step:"0.1", pct:true },
            { key:"rata",           label:"Rată actualizare (%/an)",  step:"0.1", pct:true },
            { key:"perioadaAnalize",label:"Perioadă analiză (ani)",   step:"1" },
          ].map(({ key, label, step, pct }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">{label}</span>
              <input
                type="number"
                step={step}
                value={pct ? (params[key] * 100).toFixed(1) : params[key]}
                onChange={e => handleParamChange(key, pct ? parseFloat(e.target.value) / 100 : e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:border-amber-500 focus:outline-none w-full"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Catalog măsuri — tabel editabil */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">Catalog măsuri reabilitare</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-2 py-1.5 text-left text-slate-400 font-semibold">Măsură</th>
                <th className="px-2 py-1.5 text-right text-slate-400 font-semibold">ΔU/ΔEP%</th>
                <th className="px-2 py-1.5 text-right text-slate-400 font-semibold">Invest. (RON sau RON/m²)</th>
                <th className="px-2 py-1.5 text-right text-slate-400 font-semibold">Durată (ani)</th>
                <th className="px-2 py-1.5 text-right text-slate-400 font-semibold">Maint. %/an</th>
              </tr>
            </thead>
            <tbody>
              {measures.map(m => {
                const isEdit = editingMeasure === m.id;
                return (
                  <tr key={m.id}
                    className={cn("border-b border-slate-700/50 cursor-pointer transition-colors",
                      isEdit ? "bg-slate-700/60" : "hover:bg-slate-700/30")}
                    onClick={() => setEditingMeasure(isEdit ? null : m.id)}
                  >
                    <td className="px-2 py-1.5">
                      {isEdit
                        ? <input className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 w-56 text-white text-xs focus:outline-none"
                            value={m.name} onChange={e => handleMeasureEdit(m.id, "name", e.target.value)} onClick={e => e.stopPropagation()} />
                        : <span className="text-slate-200">{m.name}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">
                      {isEdit
                        ? <input type="number" className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 w-16 text-right text-white text-xs focus:outline-none"
                            value={m.deltaEP_pct ?? m.deltaU_pct ?? m.prodkWh ?? ""}
                            onChange={e => {
                              const f = m.deltaEP_pct != null ? "deltaEP_pct" : m.deltaU_pct != null ? "deltaU_pct" : "prodkWh";
                              handleMeasureEdit(m.id, f, e.target.value);
                            }} onClick={e => e.stopPropagation()} />
                        : m.prodkWh ? `${m.prodkWh} kWh` : `${m.deltaEP_pct ?? m.deltaU_pct}%`}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">
                      {isEdit
                        ? <input type="number" className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 w-20 text-right text-white text-xs focus:outline-none"
                            value={m.investRON_m2 ?? m.investRON ?? ""}
                            onChange={e => handleMeasureEdit(m.id, m.investRON_m2 != null ? "investRON_m2" : "investRON", e.target.value)}
                            onClick={e => e.stopPropagation()} />
                        : m.investRON_m2 ? `${m.investRON_m2}/m²` : m.investRON?.toLocaleString("ro-RO")}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">
                      {isEdit
                        ? <input type="number" className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 w-14 text-right text-white text-xs focus:outline-none"
                            value={m.lifespan} onChange={e => handleMeasureEdit(m.id, "lifespan", e.target.value)} onClick={e => e.stopPropagation()} />
                        : m.lifespan}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-300">
                      {isEdit
                        ? <input type="number" step="0.1" className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 w-14 text-right text-white text-xs focus:outline-none"
                            value={m.maintPct} onChange={e => handleMeasureEdit(m.id, "maintPct", e.target.value)} onClick={e => e.stopPropagation()} />
                        : `${m.maintPct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-1.5">Clic pe un rând pentru editare inline.</p>
        </div>
      </div>

      {/* Tabel rezultate */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">Rezultate LCC — sortabil</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-400">Pachet</th>
                <SortTh col="name" label="Măsură" />
                <SortTh col="investitie" label="Investiție" />
                <SortTh col="economie_an1" label="Economie An 1" />
                <SortTh col="payback_simplu" label="Payback simplu" />
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-amber-400 whitespace-nowrap">Payback act.</th>
                <SortTh col="npv" label={`NPV ${params.perioadaAnalize} ani`} />
                <SortTh col="lcc" label="LCC" />
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-amber-400 whitespace-nowrap">LCOE</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-amber-400 whitespace-nowrap">Cost-optim</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" className="accent-amber-500 cursor-pointer"
                      checked={!!pachet[r.id]}
                      onChange={e => setPachet(p => ({ ...p, [r.id]: e.target.checked }))} />
                  </td>
                  <td className="px-2 py-1.5 text-slate-200 max-w-[180px]">{r.name}</td>
                  <td className="px-2 py-1.5 text-right text-white font-mono">{fmtRON(r.investitie)}</td>
                  <td className="px-2 py-1.5 text-right text-green-400 font-mono">{fmtRON(r.economie_an1)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-300 font-mono">
                    {isFinite(r.payback_simplu) ? fmtAni(r.payback_simplu) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300 font-mono">{fmtAni(r.payback_disc)}</td>
                  <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", r.npv >= 0 ? "text-green-400" : "text-red-400")}>
                    {fmtRON(r.npv)}
                  </td>
                  <td className={cn("px-2 py-1.5 text-right font-mono", r.lcc <= 0 ? "text-green-400" : "text-slate-300")}>
                    {fmtRON(r.lcc)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300 font-mono">
                    {r.lcoe != null ? `${fmtKWh(r.lcoe)} RON/kWh` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center text-lg">
                    {r.cost_optim
                      ? <span className="text-green-400" title={`EP după: ${r.ep_dupa.toFixed(1)} kWh/m²·an`}>✓</span>
                      : <span className="text-red-400" title={`EP după: ${r.ep_dupa.toFixed(1)} kWh/m²·an`}>✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">Cost-optim ✓ = EP după măsură ≤ {COST_OPTIMAL_REF} kWh/m²·an · Hover pe ✓/✗ pentru valoare exactă.</p>
      </div>

      {/* Grafic SVG NPV */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">NPV per măsură (RON) — sortat descrescător</h3>
        <div className="overflow-x-auto">
          <svg width={LABEL_W + CHART_W + SVG_PAD * 2} height={svgH} className="font-mono text-xs">
            {chartMeasures.map((r, i) => {
              const y = SVG_PAD + i * (BAR_H + BAR_GAP);
              const barW = Math.abs(r.npv) / maxAbs * CHART_W;
              const isPos = r.npv >= 0;
              const barX = isPos ? LABEL_W + SVG_PAD : LABEL_W + SVG_PAD - barW;
              return (
                <g key={r.id}>
                  <text x={LABEL_W + SVG_PAD - 4} y={y + BAR_H / 2 + 4} textAnchor="end"
                    fill="#94a3b8" fontSize="10">
                    {r.name.slice(0, 30)}{r.name.length > 30 ? "…" : ""}
                  </text>
                  <rect x={barX} y={y} width={Math.max(barW, 2)} height={BAR_H}
                    fill={isPos ? "#4ade80" : "#f87171"} rx="3" opacity="0.85" />
                  <text x={isPos ? barX + Math.max(barW, 2) + 3 : barX - 3} y={y + BAR_H / 2 + 4}
                    textAnchor={isPos ? "start" : "end"} fill={isPos ? "#4ade80" : "#f87171"} fontSize="9">
                    {r.npv >= 0 ? "+" : ""}{(r.npv / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}
            {/* Axă 0 */}
            <line x1={LABEL_W + SVG_PAD} y1={0} x2={LABEL_W + SVG_PAD} y2={svgH} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>
      </div>

      {/* Pachet optim */}
      <div className={cn("bg-slate-800 border rounded-xl p-4 transition-colors",
        pachetSelected.length ? "border-amber-500/60" : "border-slate-700")}>
        <h3 className="text-sm font-semibold text-amber-400 mb-2">
          Pachet optim selectat ({pachetSelected.length} măsuri)
        </h3>
        {pachetSelected.length === 0 ? (
          <p className="text-xs text-slate-500">Bifați măsuri în tabelul de mai sus pentru a compune un pachet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {pachetSelected.map(r => (
                <span key={r.id} className="bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded px-2 py-0.5 text-xs">{r.name}</span>
              ))}
            </div>
            {pachetAnalysis && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label:"Investiție totală",     val: fmtRON(pachetAnalysis.totalInvest) },
                  { label:"Reducere EP",            val: `${pachetAnalysis.deltaEP_pct_total.toFixed(1)}% (cap 90%)` },
                  { label:"Economie An 1",          val: fmtRON(pachetAnalysis.economie_an1) },
                  { label:`NPV ${params.perioadaAnalize} ani`, val: fmtRON(pachetAnalysis.npv), highlight: pachetAnalysis.npv >= 0 ? "green" : "red" },
                  { label:"EP după pachet",         val: `${pachetAnalysis.ep_dupa.toFixed(1)} kWh/m²·an` },
                  { label:"Cost-optim pachet",      val: pachetAnalysis.cost_optim ? "✓ DA" : "✗ NU", highlight: pachetAnalysis.cost_optim ? "green" : "red" },
                ].map(({ label, val, highlight }) => (
                  <div key={label} className="bg-slate-900/60 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                    <div className={cn("text-sm font-semibold",
                      highlight === "green" ? "text-green-400" : highlight === "red" ? "text-red-400" : "text-white")}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">* Reducerile EP sunt considerate aditive, limitate la 90% din EP total.</p>
          </>
        )}
      </div>
    </div>
  );
}
