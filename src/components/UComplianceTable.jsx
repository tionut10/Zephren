import React, { memo } from "react";

/**
 * UComplianceTable — Tabel conformitate U față de referințe nZEB / renovare
 * Mc 001-2022 Tabel 2.4, 2.7, 2.10a, 2.10b
 *
 * Sprint 19 Performanță — wrapper memo (re-render doar la schimbare opaque/glazing/building)
 */
function UComplianceTableImpl({
  opaqueElements,
  glazingElements,
  building,
  calcOpaqueR,
  U_REF_NZEB_RES,
  U_REF_NZEB_NRES,
  U_REF_RENOV_RES,
  U_REF_RENOV_NRES,
  U_REF_GLAZING,
  ELEMENT_TYPES,
  lang,
}) {
  const isRes = ["RI", "RC", "RA"].includes(building?.category);
  const uNZEB = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  const uRenov = isRes ? U_REF_RENOV_RES : U_REF_RENOV_NRES;

  const ELEMENT_LABELS = {
    PE: "Perete exterior",
    PP: "Planșeu pod",
    PS: "Planșeu sol suspendat",
    PT: "Terasă",
    PB: "Planșeu subsol",
    PL: "Placă pe sol",
    PR: "Perete adiacent neîncălzit",
    PI: "Perete interior",
    SE: "Suprafață exterioară specială",
  };

  const rows = [];

  // Elemente opace
  (opaqueElements || []).forEach((el, idx) => {
    if (!calcOpaqueR || !el.layers) return;
    const { u } = calcOpaqueR(el.layers, el.type);
    if (!u) return;
    const uRef = uNZEB[el.type];
    const uRenovRef = uRenov[el.type];
    const label = ELEMENT_LABELS[el.type] || el.type;
    const name = el.name || `${label} ${idx + 1}`;
    const area = parseFloat(el.area) || 0;

    const statusNZEB = uRef ? (u <= uRef ? "nzeb" : u <= (uRenovRef || uRef * 1.3) ? "renov" : "fail") : "na";

    rows.push({
      id: el.id || idx,
      name,
      type: label,
      area,
      u: u.toFixed(3),
      uNZEB: uRef ? uRef.toFixed(2) : "—",
      uRenov: uRenovRef ? uRenovRef.toFixed(2) : "—",
      status: statusNZEB,
      isGlazing: false,
    });
  });

  // Vitrajuri
  (glazingElements || []).forEach((el, idx) => {
    const u = parseFloat(el.u) || 0;
    if (!u) return;
    const uRef = U_REF_GLAZING?.nzeb_res || 1.11;
    const uRenovRef = U_REF_GLAZING?.renov || 1.20;
    const area = parseFloat(el.area) || 0;

    const statusNZEB = u <= uRef ? "nzeb" : u <= uRenovRef ? "renov" : "fail";

    rows.push({
      id: el.id || `gl-${idx}`,
      name: el.name || `Vitrare ${idx + 1}`,
      type: "Vitrare",
      area,
      u: u.toFixed(2),
      uNZEB: uRef.toFixed(2),
      uRenov: uRenovRef.toFixed(2),
      status: statusNZEB,
      isGlazing: true,
    });
  });

  if (rows.length === 0) return null;

  const STATUS_CONFIG = {
    nzeb: { label: "nZEB ✓", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    renov: { label: "Renovare ✓", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    fail: { label: "Neconform ✗", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    na: { label: "—", color: "#6b7280", bg: "transparent" },
  };

  const nTotal = rows.length;
  const nOk = rows.filter(r => r.status === "nzeb").length;
  const nWarn = rows.filter(r => r.status === "renov").length;
  const nFail = rows.filter(r => r.status === "fail").length;

  return (
    <div>
      {/* Sumar conformitate */}
      <div className="flex gap-3 mb-3 text-xs">
        <span className="px-2 py-1 rounded" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
          {nOk}/{nTotal} conform nZEB
        </span>
        {nWarn > 0 && (
          <span className="px-2 py-1 rounded" style={{ backgroundColor: "rgba(234,179,8,0.12)", color: "#eab308" }}>
            {nWarn} conform renovare
          </span>
        )}
        {nFail > 0 && (
          <span className="px-2 py-1 rounded" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
            {nFail} neconform
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="opacity-40 border-b border-white/10">
              <th className="text-left py-1.5 pr-3 font-medium">Element</th>
              <th className="text-right py-1.5 px-2 font-medium">Arie (m²)</th>
              <th className="text-right py-1.5 px-2 font-medium">U calc</th>
              <th className="text-right py-1.5 px-2 font-medium">U nZEB</th>
              <th className="text-right py-1.5 px-2 font-medium">U renov.</th>
              <th className="text-center py-1.5 pl-2 font-medium">Conform</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.na;
              const uCalc = parseFloat(r.u);
              const uRef = parseFloat(r.uNZEB);
              const isOver = !isNaN(uCalc) && !isNaN(uRef) && uCalc > uRef;
              return (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-1.5 pr-3">
                    <div className="font-medium opacity-90">{r.name}</div>
                    <div className="opacity-40 text-[10px]">{r.type}</div>
                  </td>
                  <td className="text-right px-2 opacity-60 tabular-nums">{r.area > 0 ? r.area.toFixed(1) : "—"}</td>
                  <td className="text-right px-2 font-mono font-semibold tabular-nums" style={{ color: isOver ? "#f97316" : "#e5e7eb" }}>
                    {r.u}
                  </td>
                  <td className="text-right px-2 opacity-50 font-mono tabular-nums">{r.uNZEB}</td>
                  <td className="text-right px-2 opacity-40 font-mono tabular-nums">{r.uRenov}</td>
                  <td className="text-center pl-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] opacity-30 mt-2">
        Ref.: Mc 001-2022 Tab. 2.4/2.7 (nZEB) și Tab. 2.10 (renovare majoră). U în W/(m²·K).
      </p>
    </div>
  );
}

export default memo(UComplianceTableImpl);
