// ═══════════════════════════════════════════════════════════════
// Phase1Diagnose — Pas 7 Faza F1 (D1 Sprint Optimizări 16 mai 2026)
// ═══════════════════════════════════════════════════════════════
//
// Extras din Step7Audit.jsx (~138 lin) ca prima etapă a refactor-ului D1.
// Mc 001-2022 §8.2 + EN 16247-2 — diagnostic clădire înainte de propuneri.
//
// Conține:
// - Card „Situația actuală — Sumar diagnostic" (4 KPI tiles: clasa E/CO₂/RER/nZEB)
// - Card „Radar performanță energetică" (5 axe: anvelopă/încălzire/ACM/ventilare/RES)
// - Card „Benchmarking — comparație referințe" (gated benchmarkPeer, ascuns la IIci)
//
// Pattern de extragere validat aici → urmează F2-F8 ca sprint separate
// (vezi TODO § sprint Optimizări §D1 din plan-ul de implementare).
// ═══════════════════════════════════════════════════════════════

import { Card } from "../../components/ui.jsx";
import { PhaseHeader } from "../../components/PhaseHeader.jsx";
import GradeGate from "../../components/GradeGate.jsx";
import { getNzebEpMax } from "../../calc/smart-rehab.js";

export default function Phase1Diagnose({
  // Display state computed în parent (lasă responsabilitatea calculului acolo)
  enClass,
  co2Class,
  epFinal,
  co2Final,
  rer,
  isNZEB,
  // Raw state pentru calcule interne radar
  instSummary,
  envelopeSummary,
  renewSummary,
  building,
  selectedClimate,
  // Gating
  userPlan,
  auditorGrad,
  // i18n — funcție locală din parent (NU T tabel direct)
  t,
  lang,
}) {
  return (
    <PhaseHeader icon="📊" title="F1 · Diagnostic"
                 normative="Mc 001-2022 §8.2 + EN 16247-2"
                 color="amber">

      {/* ── Sumar situație actuală ── */}
      <Card title={t("Situatia actuala — Sumar diagnostic", lang)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-2xl font-black mb-1" style={{ color: enClass.color }}>{enClass.cls}</div>
            <div className="text-xs opacity-50">Clasa energetica</div>
            <div className="text-sm font-bold mt-1">{epFinal.toFixed(1)} kWh/m²·an</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-2xl font-black mb-1" style={{ color: co2Class.color }}>{co2Class.cls}</div>
            <div className="text-xs opacity-50">Clasa CO₂</div>
            <div className="text-sm font-bold mt-1">{co2Final.toFixed(1)} kg/(m²·an)</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className={`text-2xl font-black mb-1 ${rer >= 30 ? "text-green-400" : "text-red-400"}`}>{rer.toFixed(1)}%</div>
            <div className="text-xs opacity-50">RER (regenerabile)</div>
            <div className="text-sm font-bold mt-1">{rer >= 30 ? "≥ 30% ✓" : "< 30% ✗"}</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className={`text-2xl font-black mb-1 ${isNZEB ? "text-green-400" : "text-red-400"}`}>{isNZEB ? "DA" : "NU"}</div>
            <div className="text-xs opacity-50">Statut nZEB</div>
            <div className="text-sm font-bold mt-1">{isNZEB ? "Conform" : "Neconform"}</div>
          </div>
        </div>
      </Card>

      {/* ── Radar performanță ── */}
      {instSummary && envelopeSummary && (() => {
        // G_ref — Mc 001-2022 Tab. 2.3, interpolare liniară după m=At/V
        const isRes = ["RI", "RC", "RA"].includes(building?.category);
        const mComp = Math.max(0.2, Math.min(1.2, envelopeSummary.totalArea / (envelopeSummary.volume || 1)));
        const gRef = isRes ? 0.19 + 0.72 * mComp : 0.046 + 0.547 * mComp;
        // scoruri normative (100% = referință normativă, >100% → clamped)
        const sAnv = Math.min(100, Math.max(0, gRef / (envelopeSummary.G || 0.01) * 100));
        // Încălzire — EN 15316-1: η_ref=0.90 cazan condensare; pompe căldură COP_ref=3.5
        const etaH = instSummary.eta_total_h || 0;
        const sInc = Math.min(100, (instSummary.isCOP ? etaH / 3.5 : etaH / 0.90) * 100);
        // ACM — EN 15316-3: η_ref=0.75 sistem referință
        const sAcm = Math.min(100, ((instSummary.acmDetailed?.eta_system) || 0) / 0.75 * 100);
        // Ventilare — EN 16798-3: HR_ref=0.75 (75%); fără VMC-HR → 0%
        const sVent = Math.min(100, instSummary.hrEta > 0 ? instSummary.hrEta / 0.75 * 100 : 0);
        // Regenerabile — Mc 001-2022 §4: RER_min_nZEB=30%; 100% la RER≥30%
        const rerRadar = renewSummary?.rer || 0;
        const sRen = Math.min(100, rerRadar / 30 * 100);
        const radarAxes = [
          { l: "Anvelopă",     v: sAnv,  ref: "G_ref=" + gRef.toFixed(2) + " W/(m³K) · Mc 001-2022 Tab.2.3" },
          { l: "Încălzire",    v: sInc,  ref: instSummary.isCOP ? "COP_ref=3.5 · EN 15316-1" : "η_ref=0.90 · EN 15316-1" },
          { l: "ACM",          v: sAcm,  ref: "η_ref=0.75 · EN 15316-3" },
          { l: "Ventilare",    v: sVent, ref: "HR_ref=75% · EN 16798-3" },
          { l: "Regenerabile", v: sRen,  ref: "RER_min=30% · Mc 001-2022 §4" },
        ];
        const axColor = v => v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444";
        const nn = radarAxes.length, cx = 170, cy = 148, mR = 108;
        const ang = i => (i * 360 / nn - 90) * Math.PI / 180;
        const pt = (r, i) => `${cx + r * Math.cos(ang(i))},${cy + r * Math.sin(ang(i))}`;
        const gridPts = f => Array.from({ length: nn }, (_, i) => pt(mR * f, i)).join(" ");
        return (
          <Card title={t("Radar performanță energetică", lang)}>
            <svg viewBox="0 0 340 296" width="100%" height="260" className="mx-auto block">
              {[0.25, 0.5, 0.75, 1].map((f, fi) => (
                <polygon key={"g" + f} points={gridPts(f)} fill="none" stroke="#334155" strokeWidth="0.7" opacity={0.25 + fi * 0.12} />
              ))}
              {radarAxes.map((_, i) => (
                <line key={"ax" + i} x1={cx} y1={cy} x2={cx + mR * Math.cos(ang(i))} y2={cy + mR * Math.sin(ang(i))} stroke="#334155" strokeWidth="0.7" />
              ))}
              {radarAxes.map((ax, i) => (
                <text key={"lb" + i} x={cx + (mR + 22) * Math.cos(ang(i))} y={cy + (mR + 22) * Math.sin(ang(i)) + 4} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="500">{ax.l}</text>
              ))}
              <polygon points={radarAxes.map((_, i) => pt(mR * (radarAxes[i].v / 100), i)).join(" ")} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="2" />
              {radarAxes.map((ax, i) => (
                <circle key={"d" + i} cx={cx + mR * (ax.v / 100) * Math.cos(ang(i))} cy={cy + mR * (ax.v / 100) * Math.sin(ang(i))} r="4.5" fill={axColor(ax.v)} stroke="#0f172a" strokeWidth="1.5" />
              ))}
            </svg>
            {/* tabel scoruri + referință normativă */}
            <div className="grid grid-cols-5 gap-x-2 gap-y-1 mt-1 px-2">
              {radarAxes.map((ax, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-400 text-center leading-tight">{ax.l}</span>
                  <div className="w-full bg-slate-800 rounded-full h-1">
                    <div className="h-1 rounded-full transition-all" style={{ width: ax.v + "%", backgroundColor: axColor(ax.v) }} />
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: axColor(ax.v) }}>{Math.round(ax.v)}%</span>
                  <span className="text-[8px] text-slate-600 text-center leading-tight">{ax.ref}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 text-center mt-2">100% = referință normativă per axă · exterior inel = conformitate deplină</p>
          </Card>
        );
      })()}

      {/* ── BENCHMARKING REFERINȚE (mutat din linia 2072 în F1 Diagnostic — Sprint reorg-pas7) ── */}
      {/* Faza B — context audit, ascuns la IIci. Mc 001-2022 §8.2 comparație construcții similare. */}
      {instSummary && (
        <GradeGate feature="benchmarkPeer" plan={userPlan} auditorGrad={auditorGrad}>
          <Card title={lang === "EN" ? "Benchmarking vs. reference buildings" : "Benchmarking — comparație referințe"} className="mb-6">
            <div className="space-y-2">
              {(function () {
                const cat = building.category || "RI";
                const isRes = ["RI", "RC", "RA"].includes(cat);
                const nzebEp = getNzebEpMax(cat, selectedClimate?.zone);
                return isRes ? [
                  { label: "Clădire veche neizolată (pre-1990)",   ep: 350,    co2: 45 },
                  { label: "Clădire izolată parțial (1990-2010)",  ep: 180,    co2: 25 },
                  { label: "Clădire conformă 2010-2020",           ep: 120,    co2: 15 },
                  { label: "Standard nZEB (2021+)",                ep: nzebEp, co2: 8 },
                  { label: "Pasivhaus",                            ep: 40,     co2: 4 },
                ] : [
                  { label: "Clădire veche neizolată (pre-1990)",   ep: 450,    co2: 55 },
                  { label: "Clădire izolată parțial (1990-2010)",  ep: 250,    co2: 30 },
                  { label: "Clădire conformă 2010-2020",           ep: 160,    co2: 18 },
                  { label: "Standard nZEB (2021+)",                ep: nzebEp, co2: 10 },
                  { label: "Best practice",                        ep: 60,     co2: 5 },
                ];
              })().map(function (ref, i) {
                var myEp = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
                var maxEp = 400;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] opacity-50 w-40 shrink-0 truncate">{ref.label}</span>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                      <div className="h-full rounded-full opacity-40" style={{ width: Math.min(100, ref.ep / maxEp * 100) + "%", backgroundColor: "#666" }} />
                      <div className="absolute top-0 left-0 h-full w-0.5 bg-amber-500" style={{ left: Math.min(100, (renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2) / maxEp * 100) + "%" }} />
                    </div>
                    <span className="text-[10px] font-mono opacity-40 w-10 text-right">{ref.ep}</span>
                  </div>
                );
              })}
              <div className="text-[10px] opacity-30 mt-1">Linia amber = clădirea dvs. ({(renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2).toFixed(0)} kWh/m2a) | Bare gri = referințe tipice</div>
            </div>
          </Card>
        </GradeGate>
      )}

      {/* ═════════════════════════════════════ END F1 ═════════════════════════════════════ */}
    </PhaseHeader>
  );
}
