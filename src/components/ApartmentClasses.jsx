/**
 * ApartmentClasses — calcul clasă energetică per apartament (pentru bloc RC)
 * Metodologie: distribuție pro-rata pe suprafață + corecție poziție termică
 * Conform Mc 001-2022 Cap. 4.7 și Anexa 7
 */
import { useState, useMemo, useCallback } from "react";

// Corecții poziție termică față de media blocului
// Apartamentele de colț, de la etaj/parter sunt mai expuse
const POSITION_CORRECTION = {
  // [etaj_parter, etaj_curent, etaj_top] × [interior, colt]
  ground_interior: 1.10,  // parter, interior bloc
  ground_corner:   1.18,  // parter, colț
  mid_interior:    1.00,  // etaj curent, interior
  mid_corner:      1.07,  // etaj curent, colț
  top_interior:    1.08,  // ultimul etaj, interior
  top_corner:      1.15,  // ultimul etaj, colț
};

const POSITION_LABELS = {
  mid_interior: "Etaj curent, interior",
  mid_corner:   "Etaj curent, colț",
  ground_interior: "Parter, interior",
  ground_corner:   "Parter, colț",
  top_interior:  "Ultimul etaj, interior",
  top_corner:    "Ultimul etaj, colț",
};

const CLASS_COLORS_MAP = {
  "A+": "#00A550", "A": "#4CB848", "B": "#BDD630",
  "C": "#FFF200", "D": "#FDB913", "E": "#F37021",
  "F": "#ED1C24", "G": "#B31217",
};
const CLASS_TEXT_DARK = ["B", "C"];

function getEpClass(ep, thresholds) {
  const labels = ["A+","A","B","C","D","E","F","G"];
  for (let i = 0; i < thresholds.length; i++) {
    if (ep <= thresholds[i]) return labels[i];
  }
  return "G";
}

function ClassPill({ cls }) {
  const bg = CLASS_COLORS_MAP[cls] || "#666";
  const textDark = CLASS_TEXT_DARK.includes(cls);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: bg, color: textDark ? "#333" : "#fff",
      fontWeight: 700, borderRadius: "6px", fontSize: "11px",
      width: "32px", height: "22px", flexShrink: 0,
    }}>{cls}</span>
  );
}

const DEFAULT_APT = { nr: "", floor: "mid", corner: false, area: "" };

export default function ApartmentClasses({ epBuildingM2, thresholds, buildingArea, cn, showToast }) {
  const [apartments, setApartments] = useState([
    { ...DEFAULT_APT, nr: "Ap. 1", area: "60" },
    { ...DEFAULT_APT, nr: "Ap. 2", area: "75", floor: "ground_interior" },
  ]);
  const [showExport, setShowExport] = useState(false);

  const calcApt = useCallback((apt, epBldg) => {
    const posKey = apt.floor + (apt.corner ? "_corner" : "_interior");
    const corr = POSITION_CORRECTION[posKey] ?? 1.0;
    const epApt = epBldg * corr;
    return {
      ...apt,
      posKey,
      correction: corr,
      epM2: epApt,
      cls: thresholds ? getEpClass(epApt, thresholds) : "—",
    };
  }, [thresholds]);

  const results = useMemo(() => {
    if (!epBuildingM2 || epBuildingM2 <= 0) return [];
    return apartments.map(apt => calcApt(apt, epBuildingM2));
  }, [apartments, epBuildingM2, calcApt]);

  const addRow = () => setApartments(prev => [...prev, { ...DEFAULT_APT, nr: `Ap. ${prev.length + 1}`, area: "60" }]);
  const removeRow = (i) => setApartments(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setApartments(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const exportCSV = () => {
    if (!results.length) return;
    const lines = ["Nr,Suprafata (m2),Pozitie,Corectie,EP (kWh/m2an),Clasa"];
    results.forEach(r => {
      lines.push(`${r.nr},${r.area},${POSITION_LABELS[r.posKey] || r.posKey},${r.correction.toFixed(2)},${r.epM2.toFixed(1)},${r.cls}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "apartamente_clase_energetice.csv"; a.click();
  };

  if (!epBuildingM2 || epBuildingM2 <= 0) {
    return (
      <div className={cn("rounded-xl border border-white/10 bg-amber-500/5 p-4 text-center")}>
        <div className="text-xs opacity-50">Completați calculul energetic (Pasul 5) pentru a calcula clasa per apartament.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-40">EP bloc: <span className="text-amber-400 font-semibold">{epBuildingM2.toFixed(1)} kWh/m²an</span></div>
          <div className="text-[10px] opacity-30 mt-0.5">Corecție poziție conform Mc 001-2022 Anexa 7</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
            CSV ↓
          </button>
          <button onClick={addRow} className="text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
            + Apartament
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-2 pr-3 text-[10px] uppercase opacity-40 font-normal">Nr.</th>
              <th className="text-left py-2 pr-3 text-[10px] uppercase opacity-40 font-normal">Suprafață</th>
              <th className="text-left py-2 pr-3 text-[10px] uppercase opacity-40 font-normal">Poziție</th>
              <th className="text-center py-2 pr-3 text-[10px] uppercase opacity-40 font-normal">Corecție</th>
              <th className="text-right py-2 pr-3 text-[10px] uppercase opacity-40 font-normal">EP</th>
              <th className="text-center py-2 text-[10px] uppercase opacity-40 font-normal">Clasă</th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {apartments.map((apt, i) => {
              const res = results[i];
              return (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2 pr-3">
                    <input value={apt.nr} onChange={e => updateRow(i, "nr", e.target.value)}
                      className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs" />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <input type="number" value={apt.area} min="0" step="1" onChange={e => updateRow(i, "area", e.target.value)}
                        className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-right" />
                      <span className="opacity-40 text-[10px]">m²</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <select value={(apt.floor || "mid") + (apt.corner ? "_corner" : "_interior")}
                      onChange={e => {
                        const v = e.target.value;
                        const isCorner = v.endsWith("_corner");
                        const floor = v.replace("_corner","").replace("_interior","");
                        updateRow(i, "floor", floor);
                        updateRow(i, "corner", isCorner);
                      }}
                      className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] max-w-[160px]">
                      {Object.entries(POSITION_LABELS).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span className="text-[11px] opacity-60">×{res?.correction.toFixed(2) || "—"}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span className="font-mono text-[11px]">{res?.epM2.toFixed(1) || "—"}</span>
                    <span className="text-[9px] opacity-40 ml-0.5">kWh/m²</span>
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {res?.cls ? <ClassPill cls={res.cls} /> : <span className="opacity-30">—</span>}
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeRow(i)} className="w-5 h-5 rounded hover:bg-red-500/20 text-red-400/40 hover:text-red-400 flex items-center justify-center text-xs transition-all">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Statistici sumar */}
      {results.length > 0 && (() => {
        const classCounts = {};
        results.forEach(r => { classCounts[r.cls] = (classCounts[r.cls] || 0) + 1; });
        return (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            <span className="text-[10px] opacity-40 self-center">Distribuție:</span>
            {Object.entries(classCounts).sort(([a],[b]) => ["A+","A","B","C","D","E","F","G"].indexOf(a) - ["A+","A","B","C","D","E","F","G"].indexOf(b)).map(([cls, cnt]) => (
              <div key={cls} className="flex items-center gap-1">
                <ClassPill cls={cls} />
                <span className="text-[10px] opacity-60">{cnt} ap.</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
