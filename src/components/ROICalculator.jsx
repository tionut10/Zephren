import { useState, useMemo } from "react";
import { cn, Card, Input, Select } from "./ui.jsx";

const OWNER_TYPES = [
  { value: "casa",        label: "Casă particulară" },
  { value: "apartament",  label: "Apartament" },
  { value: "firma",       label: "Firmă / Spațiu comercial" },
];

// Măsuri de reabilitare implicite (pot fi suprascrise din props)
const DEFAULT_MEASURES = [
  {
    id: "izolatie_ext",
    name: "Izolație exterior 12 cm EPS",
    costPerM2: 120,
    areaFactor: "envelope",
    savingsPct: 0.22,
    co2FactorKg: 18,
    desc: "Termosistem exterior cu polistiren expandat, include tencuială și finisaj.",
  },
  {
    id: "izolatie_pod",
    name: "Izolație pod 25 cm vată minerală",
    costPerM2: 55,
    areaFactor: "roof",
    savingsPct: 0.10,
    co2FactorKg: 7,
    desc: "Izolație terică la nivelul planșeului podului, acces ușor, costuri reduse.",
  },
  {
    id: "ferestre_pvc",
    name: "Ferestre PVC tripan",
    costPerM2: 350,
    areaFactor: "windows",
    savingsPct: 0.12,
    co2FactorKg: 10,
    desc: "Înlocuire ferestre vechi cu tâmplărie PVC cu sticlă termoizolantă triplă.",
  },
  {
    id: "centrala_cond",
    name: "Centrală termică în condensație",
    costFixed: 8500,
    savingsPct: 0.15,
    co2FactorKg: 12,
    desc: "Înlocuire cazan vechi cu centrală în condensație, randament >95%.",
  },
  {
    id: "panouri_solare",
    name: "Panouri solare termice ACM",
    costFixed: 9000,
    savingsPct: 0.08,
    co2FactorKg: 6,
    desc: "Sistem solar termic pentru apă caldă menajeră, 2-3 colectoare.",
  },
  {
    id: "izolatie_planseu",
    name: "Izolație planșeu peste subsol",
    costPerM2: 70,
    areaFactor: "floor",
    savingsPct: 0.06,
    co2FactorKg: 4,
    desc: "Izolație termică la nivelul planșeului peste spațiu neîncălzit.",
  },
  {
    id: "pompa_caldura",
    name: "Pompă de căldură aer-apă",
    costFixed: 22000,
    savingsPct: 0.35,
    co2FactorKg: 40,
    desc: "Sistem de încălzire cu pompă de căldură, COP 3.5-4.5, înlocuiește complet cazanul.",
  },
];

function calcMeasureCost(m, building) {
  if (m.costFixed) return m.costFixed;
  const area = building?.areaUseful || 100;
  return Math.round(area * (m.costPerM2 || 100));
}

function fmtRON(val) {
  return val.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " RON";
}

function RecoveryChart({ measures }) {
  if (!measures || measures.length === 0) return null;
  const maxYears = Math.max(...measures.map(m => m.payback), 0);
  const scale = maxYears > 0 ? 180 / maxYears : 1;
  const COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#a78bfa", "#f43f5e"];

  return (
    <svg width="100%" viewBox={`0 0 400 ${measures.length * 36 + 30}`} className="mt-2">
      {/* Axă */}
      <line x1="90" y1="10" x2="90" y2={measures.length * 36 + 10} stroke="#ffffff18" strokeWidth="1" />
      {/* Etichete ani */}
      {[0, 5, 10, 15, 20].filter(y => y <= maxYears + 2).map(y => (
        <g key={y}>
          <line x1={90 + y * scale} y1="10" x2={90 + y * scale} y2={measures.length * 36 + 10}
            stroke="#ffffff0a" strokeWidth="1" strokeDasharray="3,3" />
          <text x={90 + y * scale} y={measures.length * 36 + 24} fill="#ffffff40"
            fontSize="9" textAnchor="middle">{y} ani</text>
        </g>
      ))}
      {measures.map((m, i) => {
        const barW = Math.max(m.payback * scale, 4);
        const color = COLORS[i % COLORS.length];
        return (
          <g key={m.id}>
            <text x="86" y={10 + i * 36 + 18} fill="#ffffff80" fontSize="9" textAnchor="end"
              className="font-medium">
              {m.name.length > 18 ? m.name.slice(0, 18) + "…" : m.name}
            </text>
            <rect x="90" y={10 + i * 36 + 6} width={barW} height="20" rx="4"
              fill={color} opacity="0.75" />
            <text x={94 + barW} y={10 + i * 36 + 20} fill={color}
              fontSize="9" fontWeight="bold">
              {m.payback.toFixed(1)} ani
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ROICalculator({ instSummary, envelopeSummary, building, energyPrices, onClose }) {
  const [budget, setBudget]         = useState("");
  const [ownerType, setOwnerType]   = useState("casa");
  const [showReport, setShowReport] = useState(false);

  const annualEnergyCost = useMemo(() => {
    const ep = parseFloat(instSummary?.ep_total_m2) || 150;
    const au = parseFloat(building?.areaUseful) || 100;
    const gasPrice = parseFloat(energyPrices?.gas) || 0.38;
    return Math.round(ep * au * gasPrice / 11.63);
  }, [instSummary, building, energyPrices]);

  const measures = useMemo(() => {
    return DEFAULT_MEASURES.map(m => {
      const cost   = calcMeasureCost(m, building);
      const annual = Math.round(annualEnergyCost * m.savingsPct);
      const payback = annual > 0 ? cost / annual : 999;
      const co2Annual = Math.round((annualEnergyCost * m.savingsPct / 0.38) * 11.63 * 0.2 / 1000);
      const trees = Math.round(co2Annual * 1000 / 21);
      const km    = Math.round(co2Annual * 1000 / 0.12);
      return { ...m, cost, annual, payback, co2Annual, trees, km };
    });
  }, [annualEnergyCost, building]);

  const budgetNum = parseFloat(String(budget).replace(/\./g, "").replace(",", ".")) || Infinity;

  const filtered = useMemo(() => {
    return [...measures]
      .filter(m => m.cost <= budgetNum)
      .sort((a, b) => a.payback - b.payback)
      .slice(0, 5);
  }, [measures, budgetNum]);

  const totalCostTop = filtered.reduce((s, m) => s + m.cost, 0);
  const totalAnnual  = filtered.reduce((s, m) => s + m.annual, 0);
  const totalCO2     = filtered.reduce((s, m) => s + m.co2Annual, 0);
  const totalTrees   = filtered.reduce((s, m) => s + m.trees, 0);

  const reportText = useMemo(() => {
    const lines = [
      `RAPORT ROI REABILITARE ENERGETICĂ`,
      `Tip proprietar: ${OWNER_TYPES.find(o => o.value === ownerType)?.label}`,
      `Adresă: ${building?.address || "—"}`,
      ``,
      `Top măsuri recomandate (ordonate după recuperare rapidă):`,
      ``,
      ...filtered.map((m, i) =>
        `${i + 1}. ${m.name}\n   Investiție: ${fmtRON(m.cost)}\n   Economie anuală: ${fmtRON(m.annual)}/an\n   Recuperare: ${m.payback.toFixed(1)} ani\n   ${m.desc}`
      ),
      ``,
      `TOTAL investiție top măsuri: ${fmtRON(totalCostTop)}`,
      `TOTAL economie anuală: ${fmtRON(totalAnnual)}/an`,
      `Recuperare medie: ${totalAnnual > 0 ? (totalCostTop / totalAnnual).toFixed(1) : "—"} ani`,
      ``,
      `IMPACT MEDIU`,
      `Reducere CO₂: ~${totalCO2} tone/an`,
      `Echivalent: ${totalTrees} copaci plantați / ${Math.round(filtered.reduce((s,m) => s + m.km, 0)).toLocaleString()} km condus mai puțin`,
      ``,
      `Notă: Valorile sunt estimative și depind de tipul de construcție, condițiile meteorologice și comportamentul ocupanților.`,
    ];
    return lines.join("\n");
  }, [filtered, ownerType, building, totalCostTop, totalAnnual, totalCO2, totalTrees]);

  function downloadReport() {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "raport_ROI_proprietar.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Calculator ROI Reabilitare</h2>
            <p className="text-xs text-white/40 mt-0.5">Analiză investiție simplificată pentru proprietari</p>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Input parametri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Buget disponibil" value={budget} onChange={setBudget}
              type="number" unit="RON" placeholder="Ex: 30000"
              tooltip="Suma maximă disponibilă pentru investiție în reabilitare" />
            <Select label="Tip proprietar" value={ownerType} onChange={setOwnerType}
              options={OWNER_TYPES} />
          </div>

          {/* Info cost curent */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-wrap gap-4">
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Cost energie estimat</div>
              <div className="text-xl font-bold text-amber-400">{fmtRON(annualEnergyCost)}<span className="text-sm font-normal text-white/40">/an</span></div>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">EP calcul</div>
              <div className="text-xl font-bold text-white">{parseFloat(instSummary?.ep_total_m2) || 150} <span className="text-sm font-normal text-white/40">kWh/m²an</span></div>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Suprafață</div>
              <div className="text-xl font-bold text-white">{building?.areaUseful || 100} <span className="text-sm font-normal text-white/40">m²</span></div>
            </div>
          </div>

          {/* Măsuri recomandate */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
              Măsuri recomandate
              {budget && <span className="ml-2 text-amber-400/60 font-normal normal-case">
                (buget: {fmtRON(budgetNum)})
              </span>}
            </h3>

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm border border-white/5 rounded-xl">
                Nicio măsură în limita bugetului specificat. Măriți bugetul sau lăsați câmpul gol.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((m, i) => {
                  const urgColor = m.payback < 7 ? "text-emerald-400" : m.payback < 12 ? "text-amber-400" : "text-orange-400";
                  return (
                    <div key={m.id}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-amber-500/20 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg font-bold text-amber-500/40 w-6 text-center mt-0.5">{i + 1}</span>
                          <div>
                            <div className="text-sm font-semibold text-white">{m.name}</div>
                            <div className="text-xs text-white/40 mt-1 max-w-md">{m.desc}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-right">
                          <div>
                            <div className="text-xs text-white/40">Investiție</div>
                            <div className="text-sm font-bold text-white">{fmtRON(m.cost)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-white/40">Economie/an</div>
                            <div className="text-sm font-bold text-emerald-400">{fmtRON(m.annual)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-white/40">Recuperare</div>
                            <div className={cn("text-sm font-bold", urgColor)}>{m.payback.toFixed(1)} ani</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 flex flex-wrap gap-3 text-xs text-white/40">
                        <span>CO₂ redus: <span className="text-white/60">{m.co2Annual} t/an</span></span>
                        <span>≈ {m.trees} copaci plantați</span>
                        <span>≈ {m.km.toLocaleString()} km condus mai puțin</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grafic recuperare */}
          {filtered.length > 0 && (
            <Card title="Grafic recuperare investiție">
              <RecoveryChart measures={filtered} />
            </Card>
          )}

          {/* Sumar total + CO2 */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total investiție", value: fmtRON(totalCostTop), color: "text-white" },
                { label: "Economie anuală",  value: fmtRON(totalAnnual), color: "text-emerald-400" },
                { label: "Recuperare medie", value: `${totalAnnual > 0 ? (totalCostTop / totalAnnual).toFixed(1) : "—"} ani`, color: "text-amber-400" },
                { label: "CO₂ redus/an",     value: `${totalCO2} t`, color: "text-sky-400" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className={cn("text-lg font-bold", kpi.color)}>{kpi.value}</div>
                  <div className="text-xs text-white/40 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Impact mediu rezumat */}
          {filtered.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Impact de mediu estimat</div>
              <p className="text-sm text-white/60">
                Prin implementarea măsurilor selectate, reduci emisiile cu{" "}
                <span className="font-semibold text-emerald-400">~{totalCO2} tone CO₂/an</span>, echivalentul plantării a{" "}
                <span className="font-semibold text-emerald-400">{totalTrees.toLocaleString()} copaci</span> sau
                parcurgerii a <span className="font-semibold text-white/80">{filtered.reduce((s, m) => s + m.km, 0).toLocaleString()} km mai puțin</span> cu mașina.
              </p>
            </div>
          )}

          {/* Raport text */}
          {showReport && (
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Raport pentru proprietar</span>
                <button onClick={() => setShowReport(false)}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors">Închide</button>
              </div>
              <pre className="text-xs text-white/50 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto" style={{scrollbarWidth:"thin"}}>
                {reportText}
              </pre>
            </div>
          )}

          {/* Butoane */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={() => setShowReport(v => !v)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Generează raport pentru proprietar
            </button>
            <button onClick={downloadReport}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Descarcă raport .txt
            </button>
          </div>

          <p className="text-xs text-white/25">
            Calculele sunt estimative. Valorile reale depind de calitatea execuției, condițiile meteorologice și comportamentul ocupanților.
          </p>
        </div>
      </div>
    </div>
  );
}
