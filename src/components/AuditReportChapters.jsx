/**
 * AuditReportChapters — Capitole 4, 7, 8 pentru Raport Audit Energetic
 * Sprint 16 Tasks 3-5 — Zephren
 *
 * Conform Mc 001-2022 Partea IV (metodologia auditului) +
 *         L.238/2024 (nZEB) + EPBD 2024/1275 (MEPS + rescalare ZEB).
 *
 * Capitol 4 — Evaluare conformitate normativă
 *   4.1 Transmitanțe U vs. C 107-2005 + Mc 001 Tabel 2.4/2.7
 *   4.2 Consum primar Q_p vs. Ord. MDLPA 16/2023
 *   4.3 Verificare nZEB (L.238/2024 Art. 6)
 *   4.4 MEPS 2030/2033 (EPBD 2024 Art. 9)
 *   4.5 Rescalare A-G (ZEB=A 2030)
 *
 * Capitol 7 — Concluzii și recomandări
 *   Text auto-generat + textarea editabilă + timeline cronologic
 *
 * Capitol 8 — Anexe
 *   Upload planuri/foto/IR/blower-door/CPE anterior/atestat auditor
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { NZEB_THRESHOLDS, CLASS_LABELS } from "../data/energy-classes.js";
import {
  U_REF_NZEB_RES,
  U_REF_NZEB_NRES,
  U_REF_GLAZING,
  ZEB_THRESHOLDS,
  ZEB_FACTOR,
} from "../data/u-reference.js";
import { getMepsThresholdsFor, getMepsStatus } from "./MEPSCheck.jsx";

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function fmt(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(d);
}

function fmtRo(v, d = 2) {
  return fmt(v, d).replace(".", ",");
}

function calcU(element) {
  if (!element?.layers || element.layers.length === 0) return 0;
  const rLayers = element.layers.reduce((sum, l) => {
    const d = parseFloat(l.thickness) || 0;
    const lambda = parseFloat(l.lambda) || 1;
    return sum + d / 1000 / lambda;
  }, 0);
  return 1 / (rLayers + 0.17);
}

function isResidential(category) {
  return ["RI", "RC", "RA"].includes(category);
}

// ═══════════════════════════════════════════════════════════════
// 4.1 TABEL U vs. REFERINȚĂ nZEB
// ═══════════════════════════════════════════════════════════════
function UComplianceCompact({ opaqueElements, glazingElements, category }) {
  const uRefTable = isResidential(category) ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  const uRefGlaz = isResidential(category)
    ? U_REF_GLAZING?.nzeb_res
    : U_REF_GLAZING?.nzeb_nres;

  const rows = [];

  (opaqueElements || []).forEach((el, i) => {
    const u = calcU(el);
    if (!u) return;
    const uRef = uRefTable[el.type];
    const ok = uRef == null || u <= uRef;
    rows.push({
      id: `o_${i}`,
      name: el.name || el.type || `Element ${i + 1}`,
      type: el.type,
      uCalc: u,
      uRef,
      area: parseFloat(el.area) || 0,
      status: ok ? "ok" : "fail",
      delta: uRef != null ? u - uRef : null,
    });
  });

  (glazingElements || []).forEach((gl, i) => {
    const u = parseFloat(gl.u) || 0;
    if (!u) return;
    const ok = u <= (uRefGlaz || 1.3);
    rows.push({
      id: `g_${i}`,
      name: gl.name || gl.orientation || `Vitraj ${i + 1}`,
      type: "VM",
      uCalc: u,
      uRef: uRefGlaz,
      area: parseFloat(gl.area) || 0,
      status: ok ? "ok" : "fail",
      delta: u - (uRefGlaz || 1.3),
    });
  });

  if (rows.length === 0) {
    return (
      <p className="text-[11px] opacity-40 italic">
        Nu există elemente de anvelopă definite pentru evaluare.
      </p>
    );
  }

  const nFail = rows.filter((r) => r.status === "fail").length;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase opacity-40">
              <th className="text-left py-1.5 pr-2 font-normal">Element</th>
              <th className="text-left py-1.5 pr-2 font-normal">Tip</th>
              <th className="text-right py-1.5 pr-2 font-normal">
                U calc [W/(m²·K)]
              </th>
              <th className="text-right py-1.5 pr-2 font-normal">
                U ref nZEB
              </th>
              <th className="text-right py-1.5 pr-2 font-normal">Δ</th>
              <th className="text-center py-1.5 pr-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04]">
                <td className="py-1.5 pr-2">{r.name}</td>
                <td className="py-1.5 pr-2 opacity-60 font-mono text-[10px]">
                  {r.type}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono">
                  {fmtRo(r.uCalc, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right opacity-60 font-mono">
                  {r.uRef != null ? fmtRo(r.uRef, 2) : "—"}
                </td>
                <td
                  className={`py-1.5 pr-2 text-right font-mono text-[10px] ${
                    r.status === "ok" ? "text-emerald-400/70" : "text-red-400"
                  }`}
                >
                  {r.delta != null
                    ? r.delta > 0
                      ? `+${fmtRo(r.delta, 3)}`
                      : fmtRo(r.delta, 3)
                    : "—"}
                </td>
                <td className="py-1.5 pr-2 text-center">
                  {r.status === "ok" ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px]">
        <span className="opacity-60">
          {nFail === 0 ? (
            <span className="text-emerald-400">
              ✓ Toate elementele respectă U_ref nZEB
            </span>
          ) : (
            <span className="text-red-400">
              ✗ {nFail} element{nFail > 1 ? "e" : ""} depășe{nFail > 1 ? "sc" : "ște"}{" "}
              U_ref nZEB
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4.2 VERIFICARE Q_p vs. Ord. 16/2023
// ═══════════════════════════════════════════════════════════════
function QPComplianceRow({ building, instSummary, epFinal }) {
  const category = building?.category || "RI";
  const zone = building?.climateZone || 2;
  const thresholds = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
  const epMax = thresholds?.ep_max?.[zone - 1] || 148;
  const qpCurrent = parseFloat(epFinal) || parseFloat(instSummary?.ep_total_m2) || 0;
  const ok = qpCurrent <= epMax;
  const deficit = qpCurrent - epMax;

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-1.5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div>
          <div className="text-[10px] opacity-40">Q_p curent</div>
          <div
            className={`font-mono text-sm ${
              ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {fmtRo(qpCurrent, 1)}
          </div>
          <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
        </div>
        <div>
          <div className="text-[10px] opacity-40">Q_p max Ord. 16/2023</div>
          <div className="font-mono text-sm opacity-70">{fmtRo(epMax, 1)}</div>
          <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
        </div>
        <div>
          <div className="text-[10px] opacity-40">Deviație</div>
          <div
            className={`font-mono text-sm ${
              ok ? "text-emerald-400/70" : "text-red-400"
            }`}
          >
            {deficit > 0 ? "+" : ""}
            {fmtRo(deficit, 1)}
          </div>
          <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
        </div>
        <div>
          <div className="text-[10px] opacity-40">Status</div>
          <div
            className={`font-semibold ${
              ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {ok ? "✓ CONFORM" : "✗ NECONFORM"}
          </div>
          <div className="text-[10px] opacity-30">
            categoria {category} zona {zone}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4.3 VERIFICARE nZEB (L.238/2024 Art. 6)
// ═══════════════════════════════════════════════════════════════
function NZEBCompliance({ epFinal, rer, rerOnsite, category, zone }) {
  const thresholds = NZEB_THRESHOLDS[category] || NZEB_THRESHOLDS.AL;
  const epMax = thresholds?.ep_max?.[(zone || 2) - 1] || 148;
  const rerMin = thresholds?.rer_min ?? 30;
  const rerOnsiteMin = thresholds?.rer_onsite_min ?? 10;
  const epOk = parseFloat(epFinal) <= epMax;
  const rerOk = parseFloat(rer) >= rerMin;
  const rerOnsiteOk = rerOnsite == null || parseFloat(rerOnsite) >= rerOnsiteMin;
  const allOk = epOk && rerOk;

  return (
    <div
      className={`p-3 rounded-lg border-2 ${
        allOk
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-red-500/50 bg-red-500/5"
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-semibold text-[12px]">
          Conformitate nZEB (L.238/2024 Art. 6)
        </span>
        <span
          className={`text-base font-bold ${
            allOk ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {allOk ? "✓ DA" : "✗ NU"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
        <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03]">
          <span className="opacity-60">EP ≤ EP_max nZEB</span>
          <span className={epOk ? "text-emerald-400" : "text-red-400"}>
            {fmt(epFinal, 1)} / {fmt(epMax, 1)} {epOk ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03]">
          <span className="opacity-60">RER ≥ {rerMin}%</span>
          <span className={rerOk ? "text-emerald-400" : "text-red-400"}>
            {fmt(rer, 1)}% {rerOk ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03]">
          <span className="opacity-60">RER onsite ≥ {rerOnsiteMin}%</span>
          <span
            className={rerOnsiteOk ? "text-emerald-400" : "text-amber-400"}
          >
            {rerOnsite != null ? `${fmt(rerOnsite, 1)}%` : "—"}{" "}
            {rerOnsite != null ? (rerOnsiteOk ? "✓" : "⚠") : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4.4 MEPS 2030/2033 (EPBD 2024 Art. 9)
// ═══════════════════════════════════════════════════════════════
function MEPSComplianceCompact({ energyClass, epTotal, category }) {
  const status = getMepsStatus(energyClass, epTotal, category);
  const thr = status.thresholds;
  const colorMap = {
    red: "border-red-500/50 bg-red-500/5 text-red-400",
    amber: "border-amber-500/50 bg-amber-500/5 text-amber-400",
    green: "border-emerald-500/50 bg-emerald-500/5 text-emerald-400",
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${colorMap[status.level]}`}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-semibold text-[12px]">
          MEPS 2030/2033 (EPBD 2024 Art. 9)
        </span>
        <span className="text-[11px]">
          {status.level === "green"
            ? "✓ CONFORM"
            : status.level === "amber"
            ? `⚠ Limită ${status.year}`
            : `✗ Neconform ${status.year}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="px-2 py-1.5 rounded bg-white/[0.03]">
          <div className="text-[10px] opacity-40">2030</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono">EP ≤ {thr.ep2030}</span>
            <span className="opacity-40">·</span>
            <span>clasa ≥ {thr.class2030}</span>
          </div>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/[0.03]">
          <div className="text-[10px] opacity-40">2033</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono">EP ≤ {thr.ep2033}</span>
            <span className="opacity-40">·</span>
            <span>clasa ≥ {thr.class2033}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4.5 RESCALARE A-G (ZEB = A 2030)
// ═══════════════════════════════════════════════════════════════
function ZEBScaleCheck({ epFinal, category, scaleVersion }) {
  const zebMax = ZEB_THRESHOLDS?.[category]?.ep_max ?? 90;
  const zebFactor = ZEB_FACTOR ?? 0.9;
  const currentScale = scaleVersion || "2023";
  const ep = parseFloat(epFinal) || 0;
  const wouldBeZEB = ep <= zebMax;

  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-semibold text-[12px]">
          Rescalare A-G (ZEB=A 2030, EPBD 2024/1275)
        </span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${
            currentScale === "2030_zeb"
              ? "bg-indigo-500/20 text-indigo-300"
              : "bg-white/5 opacity-60"
          }`}
        >
          Scala: {currentScale === "2030_zeb" ? "EPBD 2030 (ZEB=A)" : "Actuală (2023)"}
        </span>
      </div>
      <div className="text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="opacity-60">
            Prag ZEB = 0,9 × nZEB ({(zebFactor * 100).toFixed(0)}%)
          </span>
          <span className="font-mono">
            EP_ZEB ≤ {fmtRo(zebMax, 1)} kWh/(m²·an)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="opacity-60">EP curent:</span>
          <span
            className={`font-mono font-semibold ${
              wouldBeZEB ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {fmtRo(ep, 1)} {wouldBeZEB ? "✓ ZEB" : "nu atinge ZEB"}
          </span>
        </div>
        {!wouldBeZEB && (
          <div className="text-[10px] opacity-40 italic mt-1">
            Pentru rescalare 2030 (ZEB=A), clădirea necesită {fmtRo(ep - zebMax, 1)} kWh/(m²·an) reducere.
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAPITOL 4 — CONFORMITATE (export principal)
// ═══════════════════════════════════════════════════════════════
export function Capitol4_Conformitate({
  building,
  instSummary,
  opaqueElements,
  glazingElements,
  epFinal,
  rer,
  rerOnsite,
  energyClass,
}) {
  const category = building?.category || "RI";
  const zone = building?.climateZone || 2;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">
        4. Evaluare conformitate normativă
      </h3>

      {/* 4.1 */}
      <div>
        <div className="text-[11px] font-semibold opacity-70 mb-1.5">
          4.1 Transmitanțe termice U vs. Mc 001-2022 Tabel 2.4/2.7 + C 107-2005
        </div>
        <UComplianceCompact
          opaqueElements={opaqueElements}
          glazingElements={glazingElements}
          category={category}
        />
      </div>

      {/* 4.2 */}
      <div>
        <div className="text-[11px] font-semibold opacity-70 mb-1.5">
          4.2 Consum primar Q_p vs. Ord. MDLPA 16/2023
        </div>
        <QPComplianceRow
          building={building}
          instSummary={instSummary}
          epFinal={epFinal}
        />
      </div>

      {/* 4.3 */}
      <div>
        <div className="text-[11px] font-semibold opacity-70 mb-1.5">
          4.3 Verificare nZEB (L.238/2024 Art. 6)
        </div>
        <NZEBCompliance
          epFinal={epFinal}
          rer={rer}
          rerOnsite={rerOnsite}
          category={category}
          zone={zone}
        />
      </div>

      {/* 4.4 */}
      <div>
        <div className="text-[11px] font-semibold opacity-70 mb-1.5">
          4.4 MEPS 2030/2033 (EPBD 2024 Art. 9)
        </div>
        <MEPSComplianceCompact
          energyClass={energyClass}
          epTotal={parseFloat(epFinal)}
          category={category}
        />
      </div>

      {/* 4.5 */}
      <div>
        <div className="text-[11px] font-semibold opacity-70 mb-1.5">
          4.5 Rescalare A-G (ZEB=A 2030)
        </div>
        <ZEBScaleCheck
          epFinal={epFinal}
          category={category}
          scaleVersion={building?.scaleVersion}
        />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// GENERATOR TEXT CONCLUZII (Capitol 7)
// ═══════════════════════════════════════════════════════════════
export function generateConclusionsText({
  energyClass,
  epFinal,
  rer,
  nzebOk,
  mepsStatus,
  recs,
  building,
}) {
  const lines = [];
  const cat = building?.category || "clădire";
  const addr = [building?.address, building?.city].filter(Boolean).join(", ");

  lines.push(
    `În urma auditului energetic efectuat asupra clădirii ${
      addr ? `situate în ${addr}` : ""
    } (categoria ${cat}), s-au constatat următoarele concluzii principale:`
  );
  lines.push("");
  lines.push(
    `1. Consumul de energie primară calculat este ${fmt(
      epFinal,
      1
    )} kWh/(m²·an), încadrând clădirea în clasa energetică ${energyClass ||
      "—"}.`
  );

  if (rer != null) {
    lines.push(
      `2. Ponderea energiei regenerabile (RER) este ${fmt(
        rer,
        1
      )}%, ${rer >= 30 ? "respectând" : "sub"} pragul minim nZEB de 30%.`
    );
  }

  if (nzebOk !== undefined) {
    lines.push(
      `3. Clădirea ${
        nzebOk ? "RESPECTĂ" : "NU respectă"
      } cerințele nZEB conform L.238/2024 Art. 6.`
    );
  }

  if (mepsStatus) {
    const mepsText =
      mepsStatus.level === "green"
        ? "respectă MEPS 2030/2033 conform EPBD 2024 Art. 9"
        : mepsStatus.level === "amber"
        ? `va trebui să îndeplinească MEPS ${mepsStatus.year} pentru conformitate`
        : `nu respectă MEPS ${mepsStatus.year} și necesită intervenții urgente`;
    lines.push(`4. Clădirea ${mepsText}.`);
  }

  lines.push("");
  lines.push(
    `Se recomandă un pachet de ${
      recs?.length || 0
    } măsuri de reabilitare prioritizate, detaliate în capitolul 5, cu potențial de îmbunătățire a performanței energetice și încadrare într-o clasă superioară.`
  );

  if (recs?.length > 0) {
    lines.push("");
    lines.push("Priorități de intervenție:");
    recs.slice(0, 5).forEach((r, i) => {
      lines.push(`   ${i + 1}. ${r.measure || r.title || "Măsură"}`);
    });
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// CAPITOL 7 — CONCLUZII ȘI RECOMANDĂRI
// ═══════════════════════════════════════════════════════════════
export function Capitol7_Concluzii({
  energyClass,
  epFinal,
  rer,
  nzebOk,
  mepsStatus,
  recs = [],
  building,
  initialText,
  onTextChange,
}) {
  const autoText = useMemo(
    () =>
      generateConclusionsText({
        energyClass,
        epFinal,
        rer,
        nzebOk,
        mepsStatus,
        recs,
        building,
      }),
    [energyClass, epFinal, rer, nzebOk, mepsStatus, recs, building]
  );

  const [customText, setCustomText] = useState(initialText || autoText);
  const [isDirty, setIsDirty] = useState(!!initialText);

  const regenerate = useCallback(() => {
    setCustomText(autoText);
    setIsDirty(false);
    onTextChange?.(autoText);
  }, [autoText, onTextChange]);

  const handleChange = useCallback(
    (e) => {
      const v = e.target.value;
      setCustomText(v);
      setIsDirty(true);
      onTextChange?.(v);
    },
    [onTextChange]
  );

  // Timeline cronologic pași următori
  const timelineSteps = useMemo(() => {
    const steps = [];
    const hasHigh = recs.some((r) => r.priority === "HIGH" || r.priority === "înaltă");
    if (hasHigh) {
      steps.push({
        when: "Imediat (0-6 luni)",
        what: "Măsuri prioritate înaltă: termoizolare anvelopă, înlocuire tâmplărie",
        status: "urgent",
      });
    }
    steps.push({
      when: "Termen scurt (6-18 luni)",
      what: "Obținere DALI/PT + cerere finanțare (PNRR, BEI, Casa Verde)",
      status: "planned",
    });
    steps.push({
      when: "Termen mediu (18-36 luni)",
      what: "Execuție lucrări reabilitare energetică",
      status: "planned",
    });
    steps.push({
      when: "Post-intervenție",
      what: "Recertificare CPE + monitorizare consumuri efective",
      status: "future",
    });
    return steps;
  }, [recs]);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">
          7. Concluzii și recomandări
        </h3>
        <button
          type="button"
          onClick={regenerate}
          disabled={!isDirty}
          className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
          title="Regenerează automat din datele curente"
        >
          ↻ Regenerează text auto
        </button>
      </div>

      <textarea
        value={customText}
        onChange={handleChange}
        rows={14}
        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-[12px] leading-relaxed font-mono"
        placeholder="Textul concluziilor (auto-generat; editabil)..."
      />

      {/* Timeline pași următori */}
      <div className="pt-2">
        <div className="text-[11px] font-semibold opacity-70 mb-2">
          7.1 Pași următori cronologici
        </div>
        <div className="space-y-1.5">
          {timelineSteps.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2 rounded border border-white/5 bg-white/[0.02]"
            >
              <div
                className={`shrink-0 w-1.5 h-10 rounded-full ${
                  s.status === "urgent"
                    ? "bg-red-500"
                    : s.status === "planned"
                    ? "bg-amber-500"
                    : "bg-emerald-500/60"
                }`}
              ></div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold opacity-80">
                  {s.when}
                </div>
                <div className="text-[11px] opacity-60">{s.what}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAPITOL 8 — ANEXE (Upload fișiere)
// ═══════════════════════════════════════════════════════════════
const ATTACHMENT_TYPES = [
  { key: "plans", label: "A. Planuri clădire (DWG/PDF)", accept: ".pdf,.dwg,.dxf" },
  { key: "facade", label: "B. Fotografii fațade", accept: "image/*" },
  { key: "interior", label: "C. Fotografii interior", accept: "image/*" },
  { key: "basement", label: "D. Fotografii subsol/terasă/pod", accept: "image/*" },
  { key: "thermography", label: "E. Termografie IR", accept: "image/*,.pdf" },
  { key: "blowerDoor", label: "F. Raport blower-door (n50)", accept: ".pdf" },
  { key: "prevCPE", label: "G. Copie CPE anterior", accept: ".pdf" },
  { key: "auditorCert", label: "H. Copie atestat auditor", accept: ".pdf,image/*" },
];

const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Capitol8_Anexe({ attachments = {}, onAttachmentsChange, showToast, passportInfo = null }) {
  const totalBytes = useMemo(() => {
    let total = 0;
    Object.values(attachments).forEach((files) => {
      (files || []).forEach((f) => {
        total += f.size || 0;
      });
    });
    return total;
  }, [attachments]);

  const usagePct = Math.min(100, (totalBytes / MAX_TOTAL_BYTES) * 100);

  const addFiles = useCallback(
    async (key, fileList) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      const incomingBytes = files.reduce((s, f) => s + f.size, 0);
      if (totalBytes + incomingBytes > MAX_TOTAL_BYTES) {
        showToast?.(
          `Limită 50 MB depășită (ar rezulta ${bytesToHuman(totalBytes + incomingBytes)})`,
          "error"
        );
        return;
      }
      const encoded = await Promise.all(
        files.map(async (f) => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: f.name,
          size: f.size,
          type: f.type,
          dataURL: await fileToDataURL(f),
        }))
      );
      const next = { ...attachments, [key]: [...(attachments[key] || []), ...encoded] };
      onAttachmentsChange?.(next);
      showToast?.(`${files.length} fișier${files.length > 1 ? "e" : ""} adăugat`, "success");
    },
    [attachments, onAttachmentsChange, totalBytes, showToast]
  );

  const removeFile = useCallback(
    (key, fileId) => {
      const next = {
        ...attachments,
        [key]: (attachments[key] || []).filter((f) => f.id !== fileId),
      };
      onAttachmentsChange?.(next);
    },
    [attachments, onAttachmentsChange]
  );

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">
          8. Anexe raport audit
        </h3>
        <span className="text-[10px] opacity-40">
          {bytesToHuman(totalBytes)} / {bytesToHuman(MAX_TOTAL_BYTES)}
        </span>
      </div>

      {/* Bar utilizare */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${usagePct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ATTACHMENT_TYPES.map(({ key, label, accept }) => {
          const files = attachments[key] || [];
          return (
            <div
              key={key}
              className="p-2 rounded-lg border border-white/10 bg-white/[0.02]"
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] font-semibold opacity-80">
                  {label}
                </span>
                <span className="text-[10px] opacity-40">
                  {files.length} fișier{files.length !== 1 ? "e" : ""}
                </span>
              </div>
              <label className="block">
                <input
                  type="file"
                  accept={accept}
                  multiple
                  onChange={(e) => {
                    addFiles(key, e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <span className="inline-block text-[10px] px-2 py-1 rounded border border-dashed border-white/20 bg-white/[0.02] cursor-pointer hover:bg-white/10">
                  + Adaugă fișier
                </span>
              </label>
              {files.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-[10px] py-0.5 border-b border-white/5"
                    >
                      <span className="truncate opacity-70 flex-1">{f.name}</span>
                      <span className="opacity-40 shrink-0 ml-2">
                        {bytesToHuman(f.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(key, f.id)}
                        className="ml-2 text-red-400/60 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sprint 17 — Anexa G: Pașaport renovare asociat (EPBD 2024/1275 Art. 12) */}
      {passportInfo?.passportId && (
        <div className="mt-3 p-3 rounded-lg border border-violet-500/30 bg-violet-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-violet-300">
              🆔 Anexa G — Pașaport renovare asociat
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/20">
              EPBD 2024/1275 Art. 12
            </span>
          </div>
          <div className="text-[10px] opacity-60">
            Pașaportul de renovare generat din acest audit este încorporat automat ca Anexa G în raportul PDF.
            Include trajectory EP multi-an, cross-ref MEPS 2030/2033 și referință la planul etapizat.
          </div>
          <div>
            <div className="text-[9px] opacity-40 mb-1">UUID pașaport:</div>
            <code className="text-[10px] font-mono break-all block p-1.5 rounded bg-black/30 border border-white/5">
              {passportInfo.passportId}
            </code>
          </div>
          {passportInfo.url && (
            <div className="text-[9px]">
              <span className="opacity-50">URL verificare: </span>
              <a href={passportInfo.url} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200 underline">
                {passportInfo.url}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] opacity-40 italic">
        Anexele vor fi încorporate în raportul PDF generat. Limită totală 50 MB
        (pentru a permite trimiterea prin email).
      </div>
    </section>
  );
}

export default { Capitol4_Conformitate, Capitol7_Concluzii, Capitol8_Anexe, generateConclusionsText };
