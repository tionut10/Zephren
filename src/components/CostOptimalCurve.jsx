/**
 * CostOptimalCurve — Curba cost-optimal Reg. UE 2025/2273
 * Scatter plot VAN(Invest, EP_final) cu frontieră Pareto și punct optim.
 * Conform EN 15459-1:2017 + Reg. delegat 2025/2273 (înlocuiește 244/2012).
 */
import { useState, useMemo, useRef } from "react";
import { cn } from "./ui.jsx";
import { calcAllPerspectives } from "../calc/financial.js";
import { getPrice } from "../data/rehab-prices.js";

// Sprint 25 P0.8 — prețuri derivate din rehab-prices.js (sursă canonică).
// Elimină PRICES constant local (era duplicat, pre-S25) → o singură sursă de adevăr.
// Fallback la valorile vechi pentru robustețe (catalogul oprit / categorie absentă).
function _getPackagePrices() {
  const _p = (cat, item, fb) => getPrice(cat, item)?.price ?? fb;
  return {
    envelope: {
      wall_eps_10cm: _p('envelope', 'wall_eps_10cm', 42),
      wall_eps_15cm: _p('envelope', 'wall_eps_15cm', 62),
      roof_eps_15cm: _p('envelope', 'roof_eps_15cm', 42),
      roof_mw_25cm:  _p('envelope', 'roof_mw_25cm',  68),
      windows_u140:  _p('envelope', 'windows_u140', 135),
      windows_u110:  _p('envelope', 'windows_u110', 200),
      windows_u090:  _p('envelope', 'windows_u090', 280),
    },
    heating: {
      boiler_cond_24kw: _p('heating',  'boiler_cond_24kw', 1750),
      hp_aw_12kw:       _p('heating',  'hp_aw_12kw',       9000),
    },
    cooling: {
      vmc_hr_90_per_m2: _p('cooling',  'vmc_hr_90_per_m2', 32),
    },
    renewables: {
      pv_kwp:           _p('renewables', 'pv_kwp',         1100),
      pv_battery_kwh:   _p('renewables', 'pv_battery_kwh',  550),
    },
    lighting: {
      led_replacement:  _p('lighting', 'led_replacement',  8),
      dali_upgrade:     _p('lighting', 'dali_upgrade',    12),
    },
    bacs: {
      class_c_to_b:     _p('bacs',     'class_c_to_b',  8000),
    },
  };
}

const COST_OPTIMAL_REF = 50; // kWh/m²·an — Reg. delegat UE 2025/2273

// Sprint 26 P1.2 — aliniere cu DEFAULT_RATES_BY_PERSPECTIVE: macro 4→3% (Reg. 2025/2273 Anexa I)
export const PERSPECTIVES = {
  financial:     { label: "Financiară 4%",     rate: 4, color: "#3b82f6" },
  social:        { label: "Socială 3%",         rate: 3, color: "#22c55e" },
  macroeconomic: { label: "Macroeconomică 3%",  rate: 3, color: "#a855f7", noVAT: true },
};

// ─── Algoritm frontieră Pareto ────────────────────────────────────────────────
// Sortare ascending după invest; păstrăm pachetele cu EP minim văzut până la acel invest.
export function paretoFrontier(packages) {
  const sorted = [...packages].sort((a, b) => a.invest_eur - b.invest_eur);
  const frontier = [];
  let minEp = Infinity;
  for (const p of sorted) {
    if (p.ep_final < minEp) {
      frontier.push(p);
      minEp = p.ep_final;
    }
  }
  return frontier;
}

// ─── Punct optim: VAN max cu EP ≤ 50; fallback VAN max global ────────────────
export function findOptimum(packages, perspective) {
  if (!packages || packages.length === 0) return null;
  const npvKey = `npv_${perspective}`;
  const eligible = packages.filter(p => p.ep_final <= COST_OPTIMAL_REF && p[npvKey] != null);
  if (eligible.length > 0) {
    return eligible.reduce((best, p) => (p[npvKey] > best[npvKey] ? p : best), eligible[0]);
  }
  const allValid = packages.filter(p => p[npvKey] != null);
  return allValid.length > 0
    ? allValid.reduce((best, p) => (p[npvKey] > best[npvKey] ? p : best), allValid[0])
    : null;
}

// ─── Generare 7 pachete benchmark cost-optim ─────────────────────────────────
function generatePackagesExtended(building, instSummary, energyPrices) {
  const Au       = parseFloat(building?.areaUseful) || 100;
  const epActual = parseFloat(instSummary?.ep_total_m2) || 400;
  const wallA    = Au * 0.7;
  const roofA    = Au * 0.9;
  const windA    = Au * 0.15;
  const priceEUR = energyPrices?.mixEUR || 0.08;
  const P        = _getPackagePrices(); // Sprint 25 P0.8 — runtime din rehab-prices.js

  function defaultParams(investEur, epFinal) {
    const epRed  = Math.max(0, epActual - epFinal);
    const saving = epRed * Au * priceEUR;
    return {
      investCost: investEur,
      annualSaving: saving > 0 ? saving : 1,  // minim 1 pentru calcFinancialAnalysis
      annualMaint: investEur * 0.015,
      period: 30,
      residualValue: 0,
    };
  }

  const pkg0Invest = 0;
  const pkg1Invest = roofA * P.envelope.roof_eps_15cm + windA * P.envelope.windows_u140;
  const pkg2Invest = wallA * P.envelope.wall_eps_10cm
                   + roofA * P.envelope.roof_eps_15cm
                   + windA * P.envelope.windows_u110
                   + Au    * P.lighting.led_replacement;
  const pkg3Invest = wallA * P.envelope.wall_eps_10cm
                   + roofA * P.envelope.roof_mw_25cm
                   + windA * P.envelope.windows_u090
                   + P.heating.boiler_cond_24kw
                   + Au    * P.lighting.led_replacement;
  const pkg4Invest = wallA * P.envelope.wall_eps_15cm
                   + roofA * P.envelope.roof_mw_25cm
                   + windA * P.envelope.windows_u090
                   + P.heating.hp_aw_12kw
                   + Au    * P.lighting.led_replacement;
  const pkg5Invest = pkg4Invest
                   + Au * P.cooling.vmc_hr_90_per_m2
                   + 5  * P.renewables.pv_kwp
                   + Au * P.lighting.dali_upgrade;
  const pkg6Invest = pkg5Invest
                   + 10 * P.renewables.pv_battery_kwh
                   + P.bacs.class_c_to_b;

  const packages = [
    {
      id: "baseline",
      label: "0. Baseline (nerenovat)",
      invest_eur: pkg0Invest,
      ep_final: epActual,
      measures: [],
      ep_reduction_pct: 0,
    },
    {
      id: "minimal",
      label: "1. Minimal (acoperiș+ferestre)",
      invest_eur: pkg1Invest,
      ep_final: epActual * 0.85,
      measures: ["Izolare acoperiș 15cm EPS", "Ferestre U≤1.40"],
      ep_reduction_pct: 15,
    },
    {
      id: "mediu_econom",
      label: "2. Mediu-Econom (anvelopă+LED)",
      invest_eur: pkg2Invest,
      ep_final: epActual * 0.60,
      measures: ["Anvelopă EPS 10cm", "Acoperiș 15cm", "Ferestre U≤1.10", "LED"],
      ep_reduction_pct: 40,
    },
    {
      id: "mediu_standard",
      label: "3. Mediu-Standard (anvelopă+HVAC)",
      invest_eur: pkg3Invest,
      ep_final: epActual * 0.45,
      measures: ["Anvelopă EPS 10cm", "Acoperiș 25cm MW", "Ferestre U≤0.90", "Cazan condensație", "LED+PIR"],
      ep_reduction_pct: 55,
    },
    {
      id: "nzeb_partial",
      label: "4. nZEB-Parțial (anvelopă+PC)",
      invest_eur: pkg4Invest,
      ep_final: epActual * 0.30,
      measures: ["Anvelopă EPS 15cm", "Acoperiș 25cm MW", "Ferestre U≤0.90", "PC aer-apă 12kW", "LED+DALI"],
      ep_reduction_pct: 70,
    },
    {
      id: "nzeb_integral",
      label: "5. nZEB-Integral (+VMC+PV)",
      invest_eur: pkg5Invest,
      ep_final: Math.max(COST_OPTIMAL_REF * 0.9, epActual * 0.15),
      measures: ["Anvelopă EPS 15cm", "Acoperiș 25cm MW", "Ferestre U≤0.90", "PC aer-apă", "VMC HR 90%", "PV 5kWp", "LED+DALI"],
      ep_reduction_pct: 85,
    },
    {
      id: "nzeb_plus_res",
      label: "6. nZEB+RES (baterie+BACS)",
      invest_eur: pkg6Invest,
      ep_final: Math.max(COST_OPTIMAL_REF * 0.7, epActual * 0.10),
      measures: ["Tot nZEB-Integral", "Baterie 10kWh", "BACS clasa B"],
      ep_reduction_pct: 90,
    },
  ];

  return packages.map(p => ({
    ...p,
    financialParams: defaultParams(p.invest_eur, p.ep_final),
  }));
}

// ─── Scatter plot SVG ─────────────────────────────────────────────────────────
function ScatterPlot({ packages, pareto, optimum, perspective, showPareto, svgRef }) {
  const W = 640, H = 420;
  const PAD = { top: 24, right: 80, bottom: 58, left: 72 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const maxInvest = Math.max(...packages.map(p => p.invest_eur), 1) * 1.1;
  const maxEp     = Math.max(...packages.map(p => p.ep_final),   1) * 1.1;

  const scaleX = v => PAD.left + (v / maxInvest) * chartW;
  const scaleY = v => PAD.top  + (1 - v / maxEp) * chartH;

  const npvKey    = `npv_${perspective}`;
  const maxAbsNpv = Math.max(...packages.map(p => Math.abs(p[npvKey] || 0)), 1);

  const gridEP  = [0, 50, 100, 150, 200, 300, 400, 600].filter(v => v <= maxEp * 0.98);
  const gridInv = [0, 5000, 10000, 25000, 50000, 100000, 200000, 400000].filter(v => v <= maxInvest * 0.98);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 800 }}>
      {/* Fundal zonă grafic */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="#0d0f1a" stroke="#ffffff18" />

      {/* Zona „peste prag" (EP > 50) — colorată discret */}
      {scaleY(COST_OPTIMAL_REF) < PAD.top + chartH && (
        <rect
          x={PAD.left} y={PAD.top}
          width={chartW} height={Math.max(0, scaleY(COST_OPTIMAL_REF) - PAD.top)}
          fill="#ef4444" opacity={0.05}
        />
      )}

      {/* Gridlines EP (Y) */}
      {gridEP.map(v => (
        <g key={`gy${v}`}>
          <line x1={PAD.left} x2={W - PAD.right} y1={scaleY(v)} y2={scaleY(v)} stroke="#ffffff0e" strokeWidth={1} />
          <text x={PAD.left - 6} y={scaleY(v) + 4} textAnchor="end" fontSize={9} fill="#ffffff45">{v}</text>
        </g>
      ))}

      {/* Gridlines Investiție (X) */}
      {gridInv.map(v => (
        <g key={`gx${v}`}>
          <line x1={scaleX(v)} x2={scaleX(v)} y1={PAD.top} y2={H - PAD.bottom} stroke="#ffffff08" strokeWidth={1} />
          <text x={scaleX(v)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#ffffff45">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          </text>
        </g>
      ))}

      {/* Linia referință Reg. 2025/2273 la 50 kWh/m²·an */}
      <line
        x1={PAD.left} x2={W - PAD.right}
        y1={scaleY(COST_OPTIMAL_REF)} y2={scaleY(COST_OPTIMAL_REF)}
        stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4"
      />
      <text
        x={W - PAD.right + 4} y={scaleY(COST_OPTIMAL_REF) + 4}
        fontSize={8} fill="#f59e0b" style={{ fontFamily: "sans-serif" }}
      >
        50 kWh/m²·an
      </text>
      <text
        x={W - PAD.right + 4} y={scaleY(COST_OPTIMAL_REF) + 14}
        fontSize={7} fill="#f59e0b80" style={{ fontFamily: "sans-serif" }}
      >
        Reg. 2025/2273
      </text>

      {/* Frontiera Pareto */}
      {showPareto && pareto.length > 1 && (
        <polyline
          points={pareto.map(p => `${scaleX(p.invest_eur)},${scaleY(p.ep_final)}`).join(" ")}
          fill="none" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.55}
        />
      )}

      {/* Bule pachete */}
      {packages.map(p => {
        const cx = scaleX(p.invest_eur);
        const cy = scaleY(p.ep_final);
        const npv = p[npvKey] || 0;
        const r   = 8 + (Math.abs(npv) / maxAbsNpv) * 26;
        const isPos   = npv >= 0;
        const isOpt   = optimum && p.id === optimum.id;
        const isPar   = pareto.some(x => x.id === p.id);
        return (
          <g key={p.id}>
            <circle
              cx={cx} cy={cy} r={r}
              fill={isPos ? "#22c55e" : "#ef4444"} opacity={0.45}
              stroke={isOpt ? "#fbbf24" : isPar ? "#22c55e" : "#ffffff18"}
              strokeWidth={isOpt ? 3 : 1.5}
            />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#fff" style={{ fontFamily: "sans-serif" }}>
              {p.label.split(" ")[0]}
            </text>
          </g>
        );
      })}

      {/* Etichetă punct optim */}
      {optimum && (() => {
        const ox = scaleX(optimum.invest_eur);
        const oy = scaleY(optimum.ep_final);
        const npv = optimum[npvKey] || 0;
        return (
          <g>
            <circle cx={ox} cy={oy} r={5} fill="#fbbf24" stroke="#fff" strokeWidth={2} />
            <text x={ox} y={oy - 42} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#fbbf24" style={{ fontFamily: "sans-serif" }}>
              COST-OPTIM
            </text>
            <text x={ox} y={oy - 29} textAnchor="middle" fontSize={9} fill="#fbbf24" style={{ fontFamily: "sans-serif" }}>
              {optimum.ep_final.toFixed(0)} kWh/m²·an
            </text>
            <text x={ox} y={oy - 18} textAnchor="middle" fontSize={8} fill="#fbbf2490" style={{ fontFamily: "sans-serif" }}>
              VAN: {(npv / 1000).toFixed(0)}k EUR
            </text>
          </g>
        );
      })()}

      {/* Etichete axe */}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="#ffffff70" style={{ fontFamily: "sans-serif" }}>
        Investiție (EUR)
      </text>
      <text
        transform={`translate(14, ${H / 2}) rotate(-90)`}
        textAnchor="middle" fontSize={10} fill="#ffffff70" style={{ fontFamily: "sans-serif" }}
      >
        EP final [kWh/(m²·an)]
      </text>
    </svg>
  );
}

// ─── Componentă principală ────────────────────────────────────────────────────
export default function CostOptimalCurve({ building, instSummary, energyPrices, auditor, onClose }) {
  const [perspective, setPerspective]   = useState("financial");
  const [showPareto,  setShowPareto]    = useState(true);
  const [exporting,   setExporting]     = useState(false);
  const [showWarning, setShowWarning]   = useState(false);
  const svgRef = useRef(null);

  // 1. Generare pachete
  const packages = useMemo(
    () => generatePackagesExtended(building, instSummary, energyPrices),
    [building, instSummary, energyPrices],
  );

  // 2. Calcul 3 perspective simultan (useMemo pentru fiecare pachet)
  const packagesWithNPV = useMemo(() => packages.map(p => {
    if (p.invest_eur <= 0) {
      return { ...p, npv_financial: 0, npv_social: 0, npv_macroeconomic: 0 };
    }
    const all = calcAllPerspectives(p.financialParams);
    return {
      ...p,
      npv_financial:     all.financial?.npv     ?? 0,
      npv_social:        all.social?.npv         ?? 0,
      npv_macroeconomic: all.macroeconomic?.npv  ?? 0,
    };
  }), [packages]);

  // 3. Pareto + optim
  const pareto   = useMemo(() => paretoFrontier(packagesWithNPV), [packagesWithNPV]);
  const optimum  = useMemo(() => {
    const opt = findOptimum(packagesWithNPV, perspective);
    setShowWarning(opt ? opt.ep_final > COST_OPTIMAL_REF : false);
    return opt;
  }, [packagesWithNPV, perspective]);

  // Tabel sortat după NPV perspectivei active
  const npvKey = `npv_${perspective}`;
  const sorted = useMemo(
    () => [...packagesWithNPV].sort((a, b) => (b[npvKey] ?? -Infinity) - (a[npvKey] ?? -Infinity)),
    [packagesWithNPV, npvKey],
  );

  const epActual = parseFloat(instSummary?.ep_total_m2) || 400;

  // ─── Export PDF ─────────────────────────────────────────────────────────────
  async function handleExportPDF() {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      doc.setFontSize(15);
      doc.setTextColor(30, 30, 50);
      doc.text("Curba Cost-Optimal — Reg. UE 2025/2273", 20, 20);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 120);
      const adresa = building?.address || "—";
      doc.text(`Clădire: ${adresa} | Au: ${building?.areaUseful || "—"} m² | Categorie: ${building?.category || "—"}`, 20, 28);
      doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")} | Auditor: ${auditor?.name || "—"} (Cert. ${auditor?.certNr || "—"})`, 20, 34);
      doc.text(`Perspectivă: ${PERSPECTIVES[perspective].label} | EN 15459-1:2017 + Reg. UE 2025/2273`, 20, 40);

      // Scatter SVG → Canvas → PNG
      const svgEl = svgRef.current;
      if (svgEl) {
        try {
          const svgString = new XMLSerializer().serializeToString(svgEl);
          const canvas = document.createElement("canvas");
          canvas.width = 1280; canvas.height = 840;
          const ctx = canvas.getContext("2d");
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = () => {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, 1280, 840);
              ctx.drawImage(img, 0, 0, 1280, 840);
              resolve();
            };
            img.onerror = reject;
            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
          });
          const png = canvas.toDataURL("image/png");
          doc.addImage(png, "PNG", 15, 48, 180, 118);
        } catch (svgErr) {
          console.warn("SVG export avertisment:", svgErr);
        }
      }

      // Tabel pachete
      let y = 180;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 50);
      doc.text("Pachete analizate", 20, y);
      y += 6;

      // Header tabel
      doc.setFontSize(7.5);
      doc.setFillColor(240, 240, 248);
      doc.rect(18, y - 3, 174, 5.5, "F");
      doc.setTextColor(60, 60, 90);
      doc.text("#",        20,  y);
      doc.text("Pachet",   26,  y);
      doc.text("Invest.",  82,  y);
      doc.text("EP fin.",  102, y);
      doc.text("VAN",      120, y);
      doc.text("Pareto",   142, y);
      doc.text("Cost-opt.",158, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 60);

      sorted.forEach((p, i) => {
        const isOpt = optimum && p.id === optimum.id;
        if (isOpt) { doc.setFillColor(255, 243, 200); doc.rect(18, y - 3, 174, 5, "F"); }
        const npvVal = p[npvKey] ?? 0;
        doc.text(String(i + 1),                                20,  y);
        doc.text(p.label.slice(0, 32),                         26,  y);
        doc.text(`${Math.round(p.invest_eur).toLocaleString("ro-RO")}`,  82,  y);
        doc.text(`${p.ep_final.toFixed(0)}`,                   102, y);
        doc.text(`${(npvVal / 1000).toFixed(0)}k`,             120, y);
        doc.text(pareto.some(x => x.id === p.id) ? "DA" : "—", 142, y);
        doc.text(p.ep_final <= COST_OPTIMAL_REF ? "DA" : "NU", 158, y);
        y += 5;
      });

      // Interpretare
      y += 6;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text("Interpretare si Recomandare", 20, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      let interp = optimum
        ? (optimum.ep_final <= COST_OPTIMAL_REF
          ? `Pachetul "${optimum.label}" este COST-OPTIM conform Reg. UE 2025/2273. EP final estimat: ${optimum.ep_final.toFixed(0)} kWh/(m2*an) <= 50 (prag referinta). VAN ${PERSPECTIVES[perspective].label}: ${(optimum[npvKey] / 1000).toFixed(0)}k EUR pe 30 ani. Investitie estimata: ${Math.round(optimum.invest_eur).toLocaleString("ro-RO")} EUR.`
          : `Atentie: niciun pachet nu atinge pragul 50 kWh/(m2*an). Optimul identificat (VAN maxim) este "${optimum.label}" cu EP final ${optimum.ep_final.toFixed(0)} kWh/(m2*an). Recomandam extinderea masurilor sau revizuirea potentialului cladirii.`)
        : "Nu s-a putut identifica un pachet optim. Verificati parametrii de calcul.";

      const lines = doc.splitTextToSize(interp, 172);
      doc.text(lines, 20, y);
      y += lines.length * 4.2 + 6;

      // Referinte normative
      doc.setFontSize(6.5);
      doc.setTextColor(130, 130, 150);
      doc.text("Referinte: EN 15459-1:2017 | Reg. delegat UE 2025/2273 | Mc 001-2022 Partea I | Ord. MDLPA 16/2023", 20, y);

      // Footer
      doc.setFontSize(6);
      doc.setTextColor(160, 160, 180);
      doc.text(`Zephren Energy Calculator — ${new Date().toISOString().slice(0, 10)} | Pagina 1/1`, 20, 290);

      const safeName = (building?.address || "building").replace(/\W+/g, "_");
      doc.save(`curba_cost_optimal_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Export PDF esuat:", err);
      alert("Export PDF esuat. Verificati consola pentru detalii.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 text-sm text-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-amber-400">Curba Cost-Optimal — Reg. UE 2025/2273</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            EN 15459-1:2017 · Scatter VAN/Investiție/EP · Frontieră Pareto · Prag: {COST_OPTIMAL_REF} kWh/m²·an
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            {exporting ? "Export…" : "Export PDF"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs border border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 transition-all"
            >
              Inchide
            </button>
          )}
        </div>
      </div>

      {/* Toggle 3 perspective + Pareto toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(PERSPECTIVES).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setPerspective(key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              perspective === key
                ? "text-amber-300"
                : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/70",
            )}
            style={perspective === key
              ? { borderColor: p.color + "90", backgroundColor: p.color + "18", color: p.color }
              : undefined}
          >
            {p.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPareto}
            onChange={e => setShowPareto(e.target.checked)}
            className="accent-green-500"
          />
          Frontieră Pareto
        </label>
      </div>

      {/* Warning: niciun pachet sub prag */}
      {showWarning && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          ⚠️ Niciun pachet nu atinge pragul cost-optim de {COST_OPTIMAL_REF} kWh/m²·an.
          Punctul optim identificat este cel cu VAN maxim — verificați dacă sunt disponibile măsuri mai ambițioase.
        </div>
      )}

      {/* Scatter plot */}
      <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 overflow-x-auto">
        <ScatterPlot
          packages={packagesWithNPV}
          pareto={pareto}
          optimum={optimum}
          perspective={perspective}
          showPareto={showPareto}
          svgRef={svgRef}
        />
      </div>

      {/* Legendă scatter */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block opacity-60" /> VAN pozitiv</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block opacity-60" /> VAN negativ</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-green-400 inline-block" /> Frontieră Pareto</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Punct cost-optim ★</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-500 inline-block" style={{borderStyle:"dashed"}} /> Prag 50 kWh/m²·an</span>
        <span>Diametru bulă ∝ |VAN|</span>
      </div>

      {/* Tabel pachete */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-3">
          Pachete analizate — sortat după VAN ({PERSPECTIVES[perspective].label})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400 font-semibold">
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">Pachet</th>
                <th className="px-2 py-1.5 text-right">Investiție (EUR)</th>
                <th className="px-2 py-1.5 text-right">EP final</th>
                <th className="px-2 py-1.5 text-right">ΔEP %</th>
                <th className="px-2 py-1.5 text-right">VAN ({PERSPECTIVES[perspective].label})</th>
                <th className="px-2 py-1.5 text-center">Pareto</th>
                <th className="px-2 py-1.5 text-center">Cost-optim</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const isOpt = optimum && p.id === optimum.id;
                const isPar = pareto.some(x => x.id === p.id);
                const npv   = p[npvKey] ?? 0;
                const isCO  = p.ep_final <= COST_OPTIMAL_REF;
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-slate-700/50 transition-colors",
                      isOpt ? "bg-amber-500/10 border-amber-500/30" : "hover:bg-slate-700/30",
                    )}
                  >
                    <td className="px-2 py-1.5 font-mono text-slate-400">{i + 1}</td>
                    <td className={cn("px-2 py-1.5 max-w-[220px]", isPar ? "text-green-400" : "text-slate-200")}>
                      {isOpt && <span className="text-amber-400 mr-1">★</span>}
                      {p.label}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-white">
                      {Math.round(p.invest_eur).toLocaleString("ro-RO")}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                      {p.ep_final.toFixed(0)} kWh/m²·an
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                      {p.ep_reduction_pct}%
                    </td>
                    <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", npv >= 0 ? "text-green-400" : "text-red-400")}>
                      {(npv / 1000).toFixed(1)}k EUR
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isPar ? <span className="text-green-400">✓</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center text-lg">
                      {isCO
                        ? <span className="text-green-400" title={`EP: ${p.ep_final.toFixed(0)} kWh/m²·an ≤ 50`}>✓</span>
                        : <span className="text-red-400"  title={`EP: ${p.ep_final.toFixed(0)} kWh/m²·an > 50`}>✗</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Cost-optim ✓ = EP final ≤ {COST_OPTIMAL_REF} kWh/m²·an · Pareto ✓ = frontieră eficienței · ★ = pachet recomandat
        </p>
      </div>

      {/* Contextul clădirii */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-400">
        <span className="text-slate-300 font-medium">Context: </span>
        Suprafață utilă: <span className="text-white">{building?.areaUseful || "—"} m²</span> ·
        EP actual: <span className="text-white">{instSummary?.ep_total_m2 || "—"} kWh/m²·an</span> ·
        Prețuri: rehab-prices.js Q1 2026 + HG 907/2016 ·
        Metodologie: EN 15459-1:2017 + Reg. UE 2025/2273
      </div>
    </div>
  );
}
