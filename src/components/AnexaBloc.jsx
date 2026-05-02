/**
 * AnexaBloc — Anexa 2 CPE pentru bloc multi-apartament
 * Sprint 16 Task 1 — Zephren
 *
 * Conform Ord. MDLPA 16/2023 Anexa 2 + Mc 001-2022 Cap. 4.7 + Anexa 7.
 *
 * Tabel principal per apartament:
 *   Nr. | Ap. | Au [m²] | Orientare | Etaj | EP_apt | Clasă | CO₂ | Clasă CO₂
 *
 * Calcul EP_apt:
 *   1. Consum propriu (proporțional Au_apt × EP_bloc)
 *   2. + corecție poziție termică (parter/colț/ultim etaj — Anexa 7 Mc 001)
 *   3. + alocare consum comun (pro-rata Au sau explicit)
 *
 * Sumar clădire: media ponderată pe Au + distribuție clase.
 */
import React, { useMemo } from "react";
import { getEnergyClass, getCO2Class } from "../calc/classification.js";
import { CLASS_COLORS, CLASS_LABELS } from "../data/energy-classes.js";
import { CATEGORY_BASE_MAP } from "../data/building-catalog.js";

// ═══════════════════════════════════════════════════════════════
// CORECȚII POZIȚIE TERMICĂ — Mc 001-2022 Anexa 7
// ═══════════════════════════════════════════════════════════════
// Factori aplicați la EP_bloc pentru fiecare apartament, pe baza poziției
// (interior/colț) × (parter/curent/ultim etaj).
//
// Audit 2 mai 2026 — P1.14: mid_interior 1.00 → 0.95.
// Justificare: apartament curent interior, fără pereți exteriori
// (4 vecini încălziți + planșeu jos încălzit + planșeu sus încălzit)
// are pierderi termice MAI MICI decât media blocului. Mc 001-2022
// Anexa 7 recunoaște acest scenariu (toate suprafețele de schimb
// termic sunt cu zone încălzite ⇒ ΔT~0 pe pierderi anvelopă).
// Praguri permise: factor minim 0.85 pentru cazuri extreme;
// 0.95 e o estimare conservatoare pentru apartament tipic mid_interior.
const POSITION_FACTORS = {
  ground_interior: 1.10,
  ground_corner: 1.18,
  mid_interior: 0.95,   // < 1.0: pierderi reduse pentru apt complet interior
  mid_corner: 1.07,
  top_interior: 1.08,
  top_corner: 1.15,
};

function resolvePositionKey(apt) {
  const isGround = apt.groundFloor || String(apt.floor).toLowerCase() === "p" || apt.floor === 0 || apt.floor === "0";
  const isTop = !!apt.topFloor;
  const isCorner = !!apt.corner;
  if (isGround) return isCorner ? "ground_corner" : "ground_interior";
  if (isTop) return isCorner ? "top_corner" : "top_interior";
  return isCorner ? "mid_corner" : "mid_interior";
}

// ═══════════════════════════════════════════════════════════════
// CULORI CLASĂ — badge
// ═══════════════════════════════════════════════════════════════
const CLASS_COLOR_MAP = CLASS_LABELS.reduce((acc, cls, i) => {
  acc[cls] = CLASS_COLORS[i];
  return acc;
}, {});

function ClassPill({ cls }) {
  if (!cls || cls === "—") return <span className="opacity-30">—</span>;
  const bg = CLASS_COLOR_MAP[cls] || "#666";
  const dark = ["B", "C"].includes(cls);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color: dark ? "#222" : "#fff",
        fontWeight: 700,
        borderRadius: "5px",
        fontSize: "10px",
        width: "28px",
        height: "20px",
      }}
    >
      {cls}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTIL — formatare
// ═══════════════════════════════════════════════════════════════
function fmt(v, d = 1) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(d);
}

function fmtRo(v, d = 1) {
  return fmt(v, d).replace(".", ",");
}

// ═══════════════════════════════════════════════════════════════
// CALCUL EP & CO₂ PER APARTAMENT
// ═══════════════════════════════════════════════════════════════
/**
 * Calculează EP per apartament folosind metoda Mc 001-2022 Anexa 7.
 *
 * @param {Array} apartments
 * @param {number} epBuildingM2   EP clădire [kWh/(m²·an)]
 * @param {number} co2BuildingM2  CO₂ clădire [kg/(m²·an)]
 * @returns {Array} rezultate per apartament + sumar
 */
export function calcApartmentResults(apartments, epBuildingM2, co2BuildingM2, categoryKey) {
  if (!apartments?.length || !epBuildingM2) return { results: [], summary: null };

  const totalAu = apartments.reduce((s, a) => s + (parseFloat(a.areaUseful) || 0), 0);

  const results = apartments.map((apt) => {
    const au = parseFloat(apt.areaUseful) || 0;
    const posKey = resolvePositionKey(apt);
    const posFactor = POSITION_FACTORS[posKey] || 1.0;
    // Consum propriu: EP_bloc × factor_poziție
    const epOwn = epBuildingM2 * posFactor;
    // Alocare consum comun (pro-rata)
    const allocatedPct = apt.allocatedCommonPct != null
      ? parseFloat(apt.allocatedCommonPct)
      : (totalAu > 0 ? (au / totalAu) * 100 : 0);
    // EP total per apartament = EP propriu (consumul comun e deja inclus în EP_bloc la nivel agregat,
    // dar poziția termică afectează doar consumul propriu; alocarea pro-rata este pentru info).
    const epAptM2 = epOwn;
    const co2AptM2 = (co2BuildingM2 || 0) * posFactor;

    const enCls = categoryKey ? getEnergyClass(epAptM2, categoryKey) : null;
    const co2Cls = categoryKey ? getCO2Class(co2AptM2, (CATEGORY_BASE_MAP?.[categoryKey] || categoryKey.split("_")[0])) : null;

    return {
      ...apt,
      posKey,
      posFactor,
      epOwnM2: epOwn,
      epAptM2,
      co2AptM2,
      allocatedPct,
      enClass: enCls?.cls || "—",
      co2Class: co2Cls?.cls || "—",
      enClassColor: enCls?.color,
      co2ClassColor: co2Cls?.color,
    };
  });

  // Sumar: media ponderată pe Au
  const weightedEp = results.reduce((s, r) => s + r.epAptM2 * (parseFloat(r.areaUseful) || 0), 0);
  const weightedCo2 = results.reduce((s, r) => s + r.co2AptM2 * (parseFloat(r.areaUseful) || 0), 0);
  const epAvgWeighted = totalAu > 0 ? weightedEp / totalAu : 0;
  const co2AvgWeighted = totalAu > 0 ? weightedCo2 / totalAu : 0;

  // Distribuție clase
  const classDistribution = {};
  results.forEach((r) => {
    classDistribution[r.enClass] = (classDistribution[r.enClass] || 0) + 1;
  });

  return {
    results,
    summary: {
      totalAu,
      epAvgWeighted,
      co2AvgWeighted,
      classDistribution,
      count: results.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTA PRINCIPALĂ
// ═══════════════════════════════════════════════════════════════
export default function AnexaBloc({
  building,
  apartments = [],
  commonSystems = {},
  epBuildingM2,
  co2BuildingM2,
  categoryKey,
  auditor,
  selectedClimate,
}) {
  const { results, summary } = useMemo(
    () => calcApartmentResults(apartments, epBuildingM2, co2BuildingM2, categoryKey),
    [apartments, epBuildingM2, co2BuildingM2, categoryKey]
  );

  if (!apartments.length) {
    return (
      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-[11px] opacity-70">
        Anexa 2 (bloc): nu sunt apartamente definite. Adaugă apartamentele în
        Pasul 1 pentru a genera tabelul multi-apartament.
      </div>
    );
  }

  if (!epBuildingM2) {
    return (
      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-[11px] opacity-70">
        Anexa 2 (bloc): completează calculul energetic pentru a genera clasele
        individuale per apartament.
      </div>
    );
  }

  const commonSystemsCount = Object.values(commonSystems || {}).filter(
    (s) => s?.installed
  ).length;

  return (
    <div className="space-y-5 text-xs">
      <h3 className="text-sm font-bold text-amber-400">
        ANEXA 2 — Bloc multi-apartament ({results.length} apartamente)
      </h3>

      {/* Antet bloc */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-2 rounded-lg bg-white/[0.03]">
          <div className="text-[10px] opacity-40">Adresă bloc</div>
          <div className="font-medium text-[11px] truncate">
            {[building?.address, building?.city].filter(Boolean).join(", ") || "—"}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <div className="text-[10px] opacity-40">EP clădire</div>
          <div className="font-mono text-sm text-amber-400">
            {fmtRo(epBuildingM2, 1)}
          </div>
          <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <div className="text-[10px] opacity-40">Au total</div>
          <div className="font-mono text-sm">{fmtRo(summary.totalAu, 1)}</div>
          <div className="text-[10px] opacity-30">m²</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <div className="text-[10px] opacity-40">EP ponderat</div>
          <div className="font-mono text-sm text-emerald-400">
            {fmtRo(summary.epAvgWeighted, 1)}
          </div>
          <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
        </div>
      </div>

      {/* Tabel apartamente */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider opacity-40">
              <th className="text-left py-2 pr-2 font-normal">Nr.</th>
              <th className="text-left py-2 pr-2 font-normal">Ap.</th>
              <th className="text-left py-2 pr-2 font-normal">Sc.</th>
              <th className="text-left py-2 pr-2 font-normal">Etaj</th>
              <th className="text-right py-2 pr-2 font-normal">Au [m²]</th>
              <th className="text-left py-2 pr-2 font-normal">Orient.</th>
              <th className="text-center py-2 pr-2 font-normal">Poziție</th>
              <th className="text-right py-2 pr-2 font-normal">×Corr</th>
              <th className="text-right py-2 pr-2 font-normal">EP [kWh/(m²·an)]</th>
              <th className="text-center py-2 pr-2 font-normal">Clasă</th>
              <th className="text-right py-2 pr-2 font-normal">CO₂</th>
              <th className="text-center py-2 pr-2 font-normal">Clasă CO₂</th>
              <th className="text-right py-2 pr-2 font-normal">Comun %</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr
                key={r.id || idx}
                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="py-1.5 pr-2 opacity-40">{idx + 1}</td>
                <td className="py-1.5 pr-2 font-medium">{r.number || "—"}</td>
                <td className="py-1.5 pr-2 opacity-60">{r.staircase || "—"}</td>
                <td className="py-1.5 pr-2 opacity-60">
                  {r.floor === 0 || r.floor === "0" ? "P" : r.floor || "—"}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono">
                  {fmtRo(r.areaUseful, 1)}
                </td>
                <td className="py-1.5 pr-2 opacity-60">
                  {(r.orientation || []).join("·") || "—"}
                </td>
                <td className="py-1.5 pr-2 text-center opacity-60 text-[10px]">
                  {r.posKey.replace("_", " ")}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono opacity-60">
                  {r.posFactor.toFixed(2)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono font-medium">
                  {fmtRo(r.epAptM2, 1)}
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <ClassPill cls={r.enClass} />
                </td>
                <td className="py-1.5 pr-2 text-right font-mono opacity-70">
                  {fmtRo(r.co2AptM2, 1)}
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <ClassPill cls={r.co2Class} />
                </td>
                <td className="py-1.5 pr-2 text-right font-mono opacity-50">
                  {r.allocatedPct != null ? fmtRo(r.allocatedPct, 1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Rând sumar — media ponderată */}
          <tfoot>
            <tr className="border-t-2 border-amber-500/30 bg-amber-500/5">
              <td className="py-2 pr-2 font-semibold text-amber-400" colSpan={4}>
                MEDIE PONDERATĂ BLOC
              </td>
              <td className="py-2 pr-2 text-right font-mono font-semibold">
                {fmtRo(summary.totalAu, 1)}
              </td>
              <td colSpan={3}></td>
              <td className="py-2 pr-2 text-right font-mono font-semibold">
                {fmtRo(summary.epAvgWeighted, 1)}
              </td>
              <td className="py-2 pr-2 text-center">
                <ClassPill
                  cls={getEnergyClass(summary.epAvgWeighted, categoryKey)?.cls || "—"}
                />
              </td>
              <td className="py-2 pr-2 text-right font-mono font-semibold">
                {fmtRo(summary.co2AvgWeighted, 1)}
              </td>
              <td className="py-2 pr-2 text-center">
                <ClassPill
                  cls={
                    getCO2Class(
                      summary.co2AvgWeighted,
                      CATEGORY_BASE_MAP?.[categoryKey] || categoryKey?.split("_")[0]
                    )?.cls || "—"
                  }
                />
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Distribuție clase + sisteme comune */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5">
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
            Distribuție clase apartamente
          </div>
          <div className="flex flex-wrap gap-2">
            {CLASS_LABELS.map((cls) => {
              const cnt = summary.classDistribution[cls] || 0;
              if (cnt === 0) return null;
              const pct = summary.count > 0 ? (cnt / summary.count) * 100 : 0;
              return (
                <div key={cls} className="flex items-center gap-1.5">
                  <ClassPill cls={cls} />
                  <span className="text-[11px]">
                    <span className="font-semibold">{cnt}</span>
                    <span className="opacity-40"> ap. ({pct.toFixed(0)}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
            Sisteme comune bloc ({commonSystemsCount})
          </div>
          {commonSystemsCount === 0 ? (
            <div className="text-[11px] opacity-40 italic">
              Niciun sistem comun declarat.
            </div>
          ) : (
            <div className="space-y-1 text-[11px]">
              {Object.entries(commonSystems || {})
                .filter(([, s]) => s?.installed)
                .map(([key, s]) => {
                  const labels = {
                    elevator: "Lift",
                    stairsLighting: "Iluminat scări/holuri",
                    centralHeating: "Centrală termică comună",
                    commonVentilation: "Ventilație comună",
                    pumpGroup: "Grup pompe",
                  };
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-0.5 border-b border-white/5"
                    >
                      <span className="opacity-70">{labels[key] || key}</span>
                      <span className="font-mono text-[10px] opacity-60">
                        {s.powerKW ? `${s.powerKW} kW` : ""}
                        {s.hoursYear ? ` × ${s.hoursYear} h/an` : ""}
                        {s.fuel ? ` (${s.fuel})` : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Metodologie */}
      <div className="text-[10px] opacity-40 italic pt-2 border-t border-white/5">
        Metodologie: Mc 001-2022 Cap. 4.7 + Anexa 7 (corecție poziție termică
        parter/colț/ultim etaj). Consumul comun alocat pro-rata Au. Clasificare
        pe categoria clădirii{" "}
        {categoryKey && (
          <code className="text-amber-400/70">{categoryKey}</code>
        )}
        .
      </div>

      {/* Auditor */}
      {auditor?.name && (
        <div className="pt-2 border-t border-white/10 text-[10px] opacity-40">
          Emitent: {auditor.name}
          {auditor.atestat && ` — Atestat nr. ${auditor.atestat}`}
          {auditor.date &&
            ` — Data: ${new Date(auditor.date).toLocaleDateString("ro-RO")}`}
        </div>
      )}
    </div>
  );
}
