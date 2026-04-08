/**
 * ProjectComparison — pct. 38
 * Comparare 2 proiecte side-by-side (înainte/după sau două clădiri diferite)
 */
import { useState, useRef } from "react";

const METRICS = [
  { key: "ep", label: "Energie primară", unit: "kWh/(m²·an)", path: (s) => s?.instSummary?.ep_total_m2 ?? s?.renewSummary?.ep_adjusted_m2, good: "low" },
  { key: "co2", label: "Emisii CO₂", unit: "kg/(m²·an)", path: (s) => s?.instSummary?.co2_total_m2 ?? s?.renewSummary?.co2_adjusted_m2, good: "low" },
  { key: "class", label: "Clasă energetică", unit: "", path: (s) => s?.energyClass, good: "high_class" },
  { key: "qf_h", label: "Necesar termic", unit: "kWh/an", path: (s) => s?.instSummary?.qf_h, good: "low" },
  { key: "qf_c", label: "Necesar răcire", unit: "kWh/an", path: (s) => s?.instSummary?.qf_c, good: "low" },
  { key: "rer", label: "Energie regenerabilă", unit: "%", path: (s) => s?.renewSummary?.rer, good: "high" },
  { key: "au", label: "Suprafață utilă", unit: "m²", path: (s) => parseFloat(s?.building?.areaUseful) || 0, good: "neutral" },
  { key: "cost", label: "Cost anual estimat", unit: "RON/an", path: (s) => s?.annualCost, good: "low" },
];

const CLASS_ORDER = ["A+","A","B","C","D","E","F","G"];

function isBetter(a, b, good) {
  if (!a || !b || a === b) return "equal";
  if (good === "low") return a < b ? "a" : "b";
  if (good === "high") return a > b ? "a" : "b";
  if (good === "high_class") {
    const ai = CLASS_ORDER.indexOf(a), bi = CLASS_ORDER.indexOf(b);
    return ai < bi ? "a" : ai > bi ? "b" : "equal";
  }
  return "equal";
}

export default function ProjectComparison({ currentState, projectList, onClose }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const importRef = useRef(null);

  const loadProject = (project) => {
    try {
      const data = JSON.parse(project.data);
      setSelectedProject({ ...data, _name: project.name });
    } catch { /* ignore */ }
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setSelectedProject({ ...data, _name: file.name.replace(".json", "") });
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const stateA = currentState;
  const stateB = selectedProject;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] sticky top-0 bg-[#0d0f1a] z-10">
          <div>
            <h3 className="text-base font-bold">⚖️ Comparare proiecte</h3>
            <p className="text-[10px] opacity-40">Proiect curent vs. alt proiect salvat sau importat</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
        </div>
        <div className="p-5">
          {/* Selector proiect B */}
          <div className="flex gap-3 mb-5">
            <div className="flex-1">
              <div className="text-xs opacity-40 mb-1.5">Selectează proiect de comparat</div>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                onChange={e => { const p = projectList?.find(p => p.name === e.target.value); if (p) loadProject(p); }}
                defaultValue=""
              >
                <option value="" disabled>— Alege din lista de proiecte salvate —</option>
                {projectList?.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={() => importRef.current?.click()}
                className="px-3 py-2 text-xs rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                📂 Import JSON
              </button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
            </div>
          </div>

          {/* Tabel comparativ */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-4 text-xs opacity-40 font-normal">Indicator</th>
                  <th className="text-right py-2 px-4 text-xs font-semibold text-amber-400">
                    {currentState?.building?.address?.slice(0,25) || "Proiect curent"}
                  </th>
                  <th className="text-right py-2 pl-4 text-xs font-semibold text-sky-400">
                    {stateB?._name?.slice(0,25) || "— Selectează proiect —"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m, i) => {
                  const valA = m.path(stateA);
                  const valB = m.path(stateB);
                  const better = isBetter(valA, valB, m.good);
                  const fmtVal = (v) => v == null ? "—" : typeof v === "number" ? v.toLocaleString("ro-RO", { maximumFractionDigits: 1 }) : v;
                  return (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-2 pr-4 text-xs opacity-50">{m.label} {m.unit && <span className="opacity-50">[{m.unit}]</span>}</td>
                      <td className={`text-right py-2 px-4 font-mono text-xs font-medium ${better === "a" ? "text-emerald-400" : better === "b" ? "text-red-400/70" : ""}`}>
                        {fmtVal(valA)} {better === "a" && "▲"}
                      </td>
                      <td className={`text-right py-2 pl-4 font-mono text-xs font-medium ${better === "b" ? "text-emerald-400" : better === "a" ? "text-red-400/70" : ""}`}>
                        {fmtVal(valB)} {better === "b" && "▲"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {stateB && (
            <div className="mt-4 text-[10px] opacity-30 text-center">
              ▲ = valoare mai bună · Verde = proiect cu performanță superioară
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
