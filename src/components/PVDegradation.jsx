/**
 * PVDegradation — Simulare degradare sistem fotovoltaic pe 25 ani
 * Metodologie: IEC 61724, SolarEdge LID model
 * Degradare: 0.5%/an (linear), PR sezonier, NPV cu rată actualizare
 */
import { useState, useMemo } from "react";
import { cn } from "./ui.jsx";

const MONTHS_RO = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];

// Factor PR sezonier (raport performanță) — afectat de temperatură panou
const PR_MONTHLY = [0.82, 0.83, 0.81, 0.78, 0.74, 0.71, 0.69, 0.70, 0.75, 0.79, 0.82, 0.83];

function calcNPV(cashflows, rate) {
  return cashflows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0);
}

function calcIRR(cashflows, initialInvest) {
  // Newton-Raphson aproximare IRR
  let r = 0.10;
  for (let iter = 0; iter < 100; iter++) {
    const npv = -initialInvest + cashflows.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i + 1), 0);
    const dnpv = cashflows.reduce((s, cf, i) => s - (i + 1) * cf / Math.pow(1 + r, i + 2), 0);
    if (Math.abs(dnpv) < 1e-10) break;
    const rNew = r - npv / dnpv;
    if (Math.abs(rNew - r) < 1e-6) { r = rNew; break; }
    r = Math.max(-0.99, Math.min(0.99, rNew));
  }
  return r;
}

export default function PVDegradation({ renewSummary, building }) {
  const pvAnnualRaw = renewSummary?.pv_annual_kWh || 0;
  const pvPeak_kWp = renewSummary?.pv_peak_kWp || 0;

  const [pvPower, setPvPower] = useState(pvPeak_kWp > 0 ? String(pvPeak_kWp.toFixed(1)) : "5.0");
  const [annualProd, setAnnualProd] = useState(pvAnnualRaw > 0 ? String(Math.round(pvAnnualRaw)) : "5500");
  const [degradRate, setDegradRate] = useState("0.5"); // %/an
  const [elecPrice, setElecPrice] = useState("0.92"); // RON/kWh
  const [priceEscalation, setPriceEscalation] = useState("3.0"); // %/an
  const [discountRate, setDiscountRate] = useState("6.0"); // %
  const [investCost, setInvestCost] = useState(""); // RON (auto from kWp if empty)
  const [selfConsumeRate, setSelfConsumeRate] = useState("70"); // % autoconsum
  const [feedinTariff, setFeedinTariff] = useState("0.30"); // RON/kWh export
  const [omCostRate, setOmCostRate] = useState("1.0"); // % din investiție/an O&M
  const [showMonthly, setShowMonthly] = useState(false);

  const results = useMemo(() => {
    const P0 = parseFloat(pvPower) || 5;
    const E0 = parseFloat(annualProd) || 5500;
    const dRate = (parseFloat(degradRate) || 0.5) / 100;
    const pe = parseFloat(elecPrice) || 0.92;
    const esc = (parseFloat(priceEscalation) || 3) / 100;
    const disc = (parseFloat(discountRate) || 6) / 100;
    const selfPct = (parseFloat(selfConsumeRate) || 70) / 100;
    const feedin = parseFloat(feedinTariff) || 0.30;
    const omPct = (parseFloat(omCostRate) || 1) / 100;
    // Investiție: 800 EUR/kWp × 5 RON/EUR ≈ 4000 RON/kWp, sau custom
    const investAuto = P0 * 4000;
    const invest = parseFloat(investCost) || investAuto;
    const omAnnual = invest * omPct;

    const years = [];
    let cumulSavings = 0;
    let payback = null;
    const cashflows = [];

    for (let y = 1; y <= 25; y++) {
      const degradFactor = Math.pow(1 - dRate, y - 1);
      const priceY = pe * Math.pow(1 + esc, y - 1);
      const E_y = E0 * degradFactor;
      const selfE = E_y * selfPct;
      const exportE = E_y * (1 - selfPct);
      const savings = selfE * priceY + exportE * feedin;
      const netCF = savings - omAnnual;
      cumulSavings += netCF;
      cashflows.push(netCF);
      if (!payback && cumulSavings >= invest) payback = y;
      years.push({
        y, degradFactor, priceY,
        E_y: Math.round(E_y),
        savings: Math.round(savings),
        netCF: Math.round(netCF),
        cumul: Math.round(cumulSavings),
        pr_avg: PR_MONTHLY.reduce((s, v) => s + v, 0) / 12 * degradFactor,
      });
    }

    const npv = Math.round(calcNPV(cashflows, disc) - invest);
    const irr = calcIRR(cashflows, invest);
    const totalProd25 = years.reduce((s, r) => s + r.E_y, 0);
    const totalSavings25 = years.reduce((s, r) => s + r.savings, 0);
    const co2Saved25 = Math.round(totalProd25 * 0.315 / 1000); // tone CO₂ (factor RO 0.315 kg/kWh)

    // Monthly production estimate pentru Y1 (folosind PR sezonier)
    const avgDailyH = E0 / P0 / 365; // ore de vârf medii/zi
    const monthlyProd = MONTHS_RO.map((m, i) => {
      const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31][i];
      return Math.round(P0 * avgDailyH * daysInMonth * PR_MONTHLY[i]);
    });

    return { years, npv, irr, payback, invest, totalProd25, totalSavings25, co2Saved25, monthlyProd, E0, P0 };
  }, [pvPower, annualProd, degradRate, elecPrice, priceEscalation, discountRate, investCost, selfConsumeRate, feedinTariff, omCostRate]);

  const maxCumul = results.years[24]?.cumul || 1;
  const maxE = results.E0 || 1;

  return (
    <div className="space-y-5">
      {/* ── Parametri ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label:"Putere inst. (kWp)", value:pvPower, set:setPvPower, step:"0.1" },
          { label:"Producție an 1 (kWh)", value:annualProd, set:setAnnualProd, step:"100" },
          { label:"Degradare (%/an)", value:degradRate, set:setDegradRate, step:"0.1" },
          { label:"Preț energie (RON/kWh)", value:elecPrice, set:setElecPrice, step:"0.01" },
          { label:"Escaladare preț (%/an)", value:priceEscalation, set:setPriceEscalation, step:"0.5" },
          { label:"Rată actualizare (%)", value:discountRate, set:setDiscountRate, step:"0.5" },
          { label:"Autoconsum (%)", value:selfConsumeRate, set:setSelfConsumeRate, step:"5" },
          { label:"Tarif export (RON/kWh)", value:feedinTariff, set:setFeedinTariff, step:"0.05" },
          { label:"O&M (%/an din invest.)", value:omCostRate, set:setOmCostRate, step:"0.1" },
          { label:"Investiție (RON)", value:investCost, set:setInvestCost, step:"500", placeholder:`auto: ${Math.round((parseFloat(pvPower)||5)*4000)} RON` },
        ].map(({label, value, set, step, placeholder}) => (
          <div key={label}>
            <label className="text-[10px] text-slate-400 block mb-0.5">{label}</label>
            <input type="number" step={step} value={value} onChange={e => set(e.target.value)}
              placeholder={placeholder || ""}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" />
          </div>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"NPV 25 ani", value:`${results.npv > 0 ? "+" : ""}${results.npv.toLocaleString("ro-RO")} RON`, color: results.npv > 0 ? "#22c55e" : "#ef4444" },
          { label:"IRR", value:`${(results.irr * 100).toFixed(1)}%`, color: results.irr > 0.08 ? "#22c55e" : results.irr > 0 ? "#eab308" : "#ef4444" },
          { label:"Recuperare investiție", value: results.payback ? `An ${results.payback}` : ">25 ani", color: results.payback && results.payback <= 12 ? "#22c55e" : "#eab308" },
          { label:"CO₂ evitat 25 ani", value:`${results.co2Saved25} t CO₂`, color:"#6ee7b7" },
        ].map(({label, value, color}) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <div className="text-lg font-bold" style={{color}}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Grafic producție + economii ── */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-slate-300">Producție și economii cumulate pe 25 ani</div>
          <div className="flex gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-amber-500 inline-block"/>Producție (kWh)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-emerald-500 inline-block"/>Economii cumulate (RON)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 500 120" className="w-full" style={{minWidth:"300px"}}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => (
              <line key={f} x1="30" y1={10 + (1-f)*95} x2="498" y2={10 + (1-f)*95}
                stroke="#334155" strokeWidth="0.5" />
            ))}
            {/* Producție bars */}
            {results.years.map((yr, i) => {
              const bw = 460 / 25;
              const x = 30 + i * bw + bw * 0.15;
              const h = (yr.E_y / maxE) * 85;
              return <rect key={yr.y} x={x} y={105-h} width={bw*0.35} height={h} fill="#f59e0b" opacity="0.7" rx="1" />;
            })}
            {/* Economii cumulate line */}
            {results.years.map((yr, i) => {
              const bw = 460 / 25;
              const x = 30 + i * bw + bw / 2;
              const y = 105 - Math.max(0, yr.cumul / maxCumul) * 85;
              return i === 0
                ? <circle key={yr.y} cx={x} cy={y} r="1.5" fill="#22c55e" />
                : null;
            })}
            <polyline fill="none" stroke="#22c55e" strokeWidth="1.5"
              points={results.years.map((yr, i) => {
                const bw = 460 / 25;
                const x = 30 + i * bw + bw / 2;
                const y = 105 - Math.max(0, yr.cumul / maxCumul) * 85;
                return `${x},${y}`;
              }).join(" ")} />
            {/* Linie investiție (break-even) */}
            {results.payback && (
              <line x1={30 + (results.payback - 1) * (460/25)} y1="10"
                x2={30 + (results.payback - 1) * (460/25)} y2="105"
                stroke="#6366f1" strokeWidth="1" strokeDasharray="3,2" />
            )}
            {/* X labels */}
            {[1,5,10,15,20,25].map(y => (
              <text key={y} x={30 + (y-1)*(460/25) + (460/25)/2} y="118"
                textAnchor="middle" fontSize="7" fill="#64748b">An {y}</text>
            ))}
          </svg>
        </div>
        {results.payback && (
          <div className="text-[10px] text-indigo-400 text-center mt-1">
            ▲ Linia punctată = recuperare investiție (An {results.payback})
          </div>
        )}
      </div>

      {/* ── Producție lunară An 1 ── */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-slate-300">Producție estimată lunară — Anul 1 (kWh)</div>
          <button onClick={() => setShowMonthly(v => !v)} className="text-[10px] text-slate-400 hover:text-white">
            {showMonthly ? "▲ Ascunde" : "▼ Arată tabel"}
          </button>
        </div>
        <svg viewBox="0 0 480 80" className="w-full">
          {results.monthlyProd.map((v, i) => {
            const maxM = Math.max(...results.monthlyProd);
            const bw = 480 / 12;
            const h = maxM > 0 ? (v / maxM) * 65 : 0;
            return (
              <g key={i}>
                <rect x={i*bw+bw*0.15} y={70-h} width={bw*0.7} height={h}
                  fill={v === Math.max(...results.monthlyProd) ? "#f59e0b" : "#475569"} rx="2" />
                <text x={i*bw+bw/2} y="78" textAnchor="middle" fontSize="7" fill="#64748b">{MONTHS_RO[i]}</text>
                <text x={i*bw+bw/2} y={67-h} textAnchor="middle" fontSize="6.5" fill="#94a3b8">{v}</text>
              </g>
            );
          })}
        </svg>
        {showMonthly && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-1 text-slate-400 font-normal">Lună</th>
                  <th className="text-right py-1 text-slate-400 font-normal">Prod. (kWh)</th>
                  <th className="text-right py-1 text-slate-400 font-normal">PR (%)</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS_RO.map((m, i) => (
                  <tr key={m} className="border-b border-white/[0.04]">
                    <td className="py-0.5 text-slate-300">{m}</td>
                    <td className="py-0.5 text-right font-mono text-amber-300">{results.monthlyProd[i]}</td>
                    <td className="py-0.5 text-right font-mono text-slate-400">{(PR_MONTHLY[i]*100).toFixed(0)}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 font-bold">
                  <td className="py-1 text-white">TOTAL</td>
                  <td className="py-1 text-right font-mono text-amber-400">{results.monthlyProd.reduce((s,v)=>s+v,0).toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-slate-400">{(PR_MONTHLY.reduce((s,v)=>s+v,0)/12*100).toFixed(0)} avg</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tabel anual (primii 10 ani) ── */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="text-xs font-medium text-slate-300 mb-2">Simulare detaliată an cu an</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-white/10">
                {["An","Degrad.","Prod. (kWh)","Preț (RON/kWh)","Economii (RON)","CF net (RON)","Cumul (RON)"].map(h => (
                  <th key={h} className="text-right py-1.5 px-2 text-slate-400 font-normal first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.years.map(yr => (
                <tr key={yr.y} className={cn("border-b border-white/[0.04]",
                  yr.y === results.payback && "bg-indigo-500/10",
                  yr.cumul >= results.invest && yr.y > (results.payback || 999) - 2 && "bg-emerald-500/5"
                )}>
                  <td className="py-1 px-2 text-left font-medium" style={{color: yr.y === results.payback ? "#818cf8" : "#cbd5e1"}}>An {yr.y}</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-400">{(yr.degradFactor*100).toFixed(1)}%</td>
                  <td className="py-1 px-2 text-right font-mono text-amber-300">{yr.E_y.toLocaleString("ro-RO")}</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-300">{yr.priceY.toFixed(3)}</td>
                  <td className="py-1 px-2 text-right font-mono text-blue-300">{yr.savings.toLocaleString("ro-RO")}</td>
                  <td className="py-1 px-2 text-right font-mono" style={{color: yr.netCF >= 0 ? "#22c55e" : "#ef4444"}}>{yr.netCF.toLocaleString("ro-RO")}</td>
                  <td className="py-1 px-2 text-right font-mono font-bold" style={{color: yr.cumul >= results.invest ? "#22c55e" : "#94a3b8"}}>{yr.cumul.toLocaleString("ro-RO")}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 font-bold bg-slate-700/50">
                <td className="py-1.5 px-2 text-left text-white">TOTAL 25 ani</td>
                <td/>
                <td className="py-1.5 px-2 text-right font-mono text-amber-400">{results.totalProd25.toLocaleString("ro-RO")} kWh</td>
                <td/>
                <td className="py-1.5 px-2 text-right font-mono text-blue-400">{results.totalSavings25.toLocaleString("ro-RO")} RON</td>
                <td/>
                <td className="py-1.5 px-2 text-right font-mono text-emerald-400">{results.years[24]?.cumul.toLocaleString("ro-RO")} RON</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-slate-600 mt-2">
          Notă: Simulare conform IEC 61724. Degradare liniară {degradRate}%/an. NPV calculat cu rată actualizare {discountRate}%.
          Factor emisie CO₂ Romania: 0.315 kg CO₂/kWh (ANRE 2024). {results.payback && `Rândul An ${results.payback} marcat în mov = recuperare investiție.`}
        </div>
      </div>
    </div>
  );
}
