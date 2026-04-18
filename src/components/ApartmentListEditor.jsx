/**
 * ApartmentListEditor — Editor pentru lista apartamentelor bloc (Anexa 2)
 * Sprint 16 Task 2 — Zephren
 *
 * Permite:
 *  • Adăugare/ștergere/editare apartamente individuale
 *  • Import bulk din CSV (coloane standard: nr, scara, etaj, Au, orient, ocupanți, colț, ultim)
 *  • Alocare automată pro-rata a consumului comun în funcție de Au
 *  • Configurare sisteme comune bloc (lift, iluminat scări, centrală termică, ventilație)
 *
 * Conform Mc 001-2022 Cap. 4.7 + Anexa 7 (alocare consum bloc → apartament).
 * Utilizat în Step1General + CpeAnexa (mod annexType="building") + AuditReport.
 */
import React, { useState, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTE
// ═══════════════════════════════════════════════════════════════

const DEFAULT_APARTMENT = {
  id: "",
  number: "",
  staircase: "",
  floor: 1,
  areaUseful: "",
  orientation: [],      // array de ["N","E","S","V"]
  occupants: 2,
  corner: false,
  topFloor: false,
  groundFloor: false,
  internalEP: null,      // calculat automat
  allocatedCommonPct: null, // % din consumul comun (calculat pro-rata Au)
};

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV"];

// ═══════════════════════════════════════════════════════════════
// UTILITARE
// ═══════════════════════════════════════════════════════════════

function generateId(prefix = "ap") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Alocare pro-rata — recalculează allocatedCommonPct pentru fiecare apartament
 * în funcție de Au individuală raportată la suma Au totală.
 */
export function allocateCommonByArea(apartments) {
  const totalAu = apartments.reduce((sum, a) => sum + (parseFloat(a.areaUseful) || 0), 0);
  if (totalAu === 0) return apartments;
  return apartments.map((a) => {
    const au = parseFloat(a.areaUseful) || 0;
    const pct = totalAu > 0 ? (au / totalAu) * 100 : 0;
    return { ...a, allocatedCommonPct: parseFloat(pct.toFixed(2)) };
  });
}

/**
 * Import CSV — coloane standard (ordine fixă, separator virgulă sau punct-virgulă):
 *   numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj
 * Exemplu:
 *   1,A,P,58.5,N;E,3,true,false
 *   2,A,1,64.2,S;V,2,false,false
 */
export function parseApartmentsCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const header = lines[0].toLowerCase().split(sep).map((s) => s.trim());
  const hasHeader = ["nr", "numar", "number"].some((h) => header[0].includes(h));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, idx) => {
    const cells = line.split(sep).map((s) => s.trim());
    const [number, staircase, floor, areaUseful, orientRaw, occupants, corner, topFloor] = cells;
    const orientList = (orientRaw || "")
      .split(/[\s;|]+/)
      .map((o) => o.toUpperCase().trim())
      .filter((o) => ORIENTATIONS.includes(o));
    const floorNorm = String(floor || "").trim();
    return {
      ...DEFAULT_APARTMENT,
      id: generateId(),
      number: number || String(idx + 1),
      staircase: staircase || "",
      floor: floorNorm === "P" || floorNorm === "0" ? 0 :
             /^-?\d+$/.test(floorNorm) ? parseInt(floorNorm, 10) :
             floorNorm,
      areaUseful: areaUseful || "",
      orientation: orientList,
      occupants: parseInt(occupants, 10) || 2,
      corner: /^(true|1|da|yes|y)$/i.test(corner || ""),
      topFloor: /^(true|1|da|yes|y)$/i.test(topFloor || ""),
      groundFloor: floorNorm === "P" || floorNorm === "0",
    };
  });
}

/**
 * Export CSV — format compatibil cu parseApartmentsCSV.
 */
export function apartmentsToCSV(apartments) {
  const lines = ["numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj"];
  apartments.forEach((a) => {
    lines.push([
      a.number,
      a.staircase,
      a.floor,
      a.areaUseful,
      (a.orientation || []).join(";"),
      a.occupants,
      a.corner ? "true" : "false",
      a.topFloor ? "true" : "false",
    ].join(","));
  });
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTA PRINCIPALĂ
// ═══════════════════════════════════════════════════════════════

export default function ApartmentListEditor({
  apartments = [],
  commonSystems = {},
  onApartmentsChange,
  onCommonSystemsChange,
  showToast,
  buildingAreaUseful,
}) {
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showCommon, setShowCommon] = useState(false);

  const totalApartmentsAu = useMemo(
    () => apartments.reduce((s, a) => s + (parseFloat(a.areaUseful) || 0), 0),
    [apartments]
  );

  const autoAllocate = useCallback(() => {
    const allocated = allocateCommonByArea(apartments);
    onApartmentsChange?.(allocated);
    showToast?.("Alocare pro-rata consum comun aplicată ✓", "success");
  }, [apartments, onApartmentsChange, showToast]);

  const addApartment = useCallback(() => {
    const next = [
      ...apartments,
      { ...DEFAULT_APARTMENT, id: generateId(), number: String(apartments.length + 1) },
    ];
    onApartmentsChange?.(next);
  }, [apartments, onApartmentsChange]);

  const removeApartment = useCallback(
    (id) => {
      onApartmentsChange?.(apartments.filter((a) => a.id !== id));
    },
    [apartments, onApartmentsChange]
  );

  const updateApartment = useCallback(
    (id, field, value) => {
      onApartmentsChange?.(
        apartments.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );
    },
    [apartments, onApartmentsChange]
  );

  const toggleOrientation = useCallback(
    (id, orient) => {
      const apt = apartments.find((a) => a.id === id);
      if (!apt) return;
      const current = apt.orientation || [];
      const next = current.includes(orient)
        ? current.filter((o) => o !== orient)
        : [...current, orient];
      updateApartment(id, "orientation", next);
    },
    [apartments, updateApartment]
  );

  const doBulkImport = useCallback(() => {
    try {
      const parsed = parseApartmentsCSV(bulkText);
      if (parsed.length === 0) {
        showToast?.("Niciun apartament valid găsit în CSV", "error");
        return;
      }
      onApartmentsChange?.(allocateCommonByArea(parsed));
      showToast?.(`Importate ${parsed.length} apartamente ✓`, "success");
      setBulkImportOpen(false);
      setBulkText("");
    } catch (err) {
      showToast?.(`Eroare import CSV: ${err.message}`, "error");
    }
  }, [bulkText, onApartmentsChange, showToast]);

  const exportCsv = useCallback(() => {
    const csv = apartmentsToCSV(apartments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `apartamente_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [apartments]);

  const updateCommon = useCallback(
    (key, field, value) => {
      onCommonSystemsChange?.({
        ...commonSystems,
        [key]: { ...(commonSystems[key] || {}), [field]: value },
      });
    },
    [commonSystems, onCommonSystemsChange]
  );

  const consistencyWarning = useMemo(() => {
    const declared = parseFloat(buildingAreaUseful) || 0;
    if (declared === 0 || totalApartmentsAu === 0) return null;
    const diff = Math.abs(declared - totalApartmentsAu);
    const pct = (diff / declared) * 100;
    if (pct > 10) {
      return `⚠️ Suma Au apartamente (${totalApartmentsAu.toFixed(1)} m²) diferă de Au clădire declarată (${declared.toFixed(1)} m²) cu ${pct.toFixed(1)}%. Verifică.`;
    }
    return null;
  }, [buildingAreaUseful, totalApartmentsAu]);

  return (
    <div className="space-y-4">
      {/* Header cu acțiuni */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold text-amber-400">
            Apartamente ({apartments.length})
          </h4>
          <span className="text-[10px] opacity-40">
            Suma Au: {totalApartmentsAu.toFixed(1)} m²
            {buildingAreaUseful && ` · Clădire: ${parseFloat(buildingAreaUseful).toFixed(1)} m²`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBulkImportOpen((v) => !v)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={apartments.length === 0}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-30"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={autoAllocate}
            disabled={apartments.length === 0}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-30"
            title="Redistribuie consumul comun pro-rata suprafață utilă"
          >
            Alocare auto
          </button>
          <button
            type="button"
            onClick={addApartment}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition"
          >
            + Apartament
          </button>
        </div>
      </div>

      {consistencyWarning && (
        <div className="text-[11px] px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
          {consistencyWarning}
        </div>
      )}

      {/* Bulk import */}
      {bulkImportOpen && (
        <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
          <div className="text-[11px] opacity-60">
            Format CSV: <code className="text-amber-400">numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj</code>
            <br />
            Exemplu: <code className="opacity-70">1,A,P,58.5,N;E,3,true,false</code>
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Lipește aici CSV-ul (cu sau fără antet)..."
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded p-2 text-[11px] font-mono"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setBulkImportOpen(false)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={doBulkImport}
              disabled={!bulkText.trim()}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-30"
            >
              Importă
            </button>
          </div>
        </div>
      )}

      {/* Tabel apartamente */}
      {apartments.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-xs opacity-50">
          Nu sunt apartamente definite. Adaugă manual sau importă din CSV.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider opacity-40">
                <th className="text-left py-2 pr-2 font-normal">Nr.</th>
                <th className="text-left py-2 pr-2 font-normal">Sc.</th>
                <th className="text-left py-2 pr-2 font-normal">Etaj</th>
                <th className="text-right py-2 pr-2 font-normal">Au [m²]</th>
                <th className="text-left py-2 pr-2 font-normal">Orient.</th>
                <th className="text-center py-2 pr-2 font-normal">Oc.</th>
                <th className="text-center py-2 pr-2 font-normal">Colț</th>
                <th className="text-center py-2 pr-2 font-normal">Top</th>
                <th className="text-right py-2 pr-2 font-normal">Comun %</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-1.5 pr-2">
                    <input
                      value={a.number}
                      onChange={(e) => updateApartment(a.id, "number", e.target.value)}
                      className="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={a.staircase}
                      onChange={(e) => updateApartment(a.id, "staircase", e.target.value)}
                      className="w-10 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={a.floor}
                      onChange={(e) => updateApartment(a.id, "floor", e.target.value)}
                      className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      value={a.areaUseful}
                      onChange={(e) => updateApartment(a.id, "areaUseful", e.target.value)}
                      min="0"
                      step="0.1"
                      className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-right"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                      {ORIENTATIONS.map((o) => {
                        const active = (a.orientation || []).includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => toggleOrientation(a.id, o)}
                            className={`text-[9px] px-1 py-0.5 rounded border transition ${
                              active
                                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                                : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      type="number"
                      value={a.occupants}
                      onChange={(e) =>
                        updateApartment(a.id, "occupants", parseInt(e.target.value, 10) || 0)
                      }
                      min="0"
                      className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-center"
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!a.corner}
                      onChange={(e) => updateApartment(a.id, "corner", e.target.checked)}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!a.topFloor}
                      onChange={(e) => updateApartment(a.id, "topFloor", e.target.checked)}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono opacity-70">
                    {a.allocatedCommonPct != null ? a.allocatedCommonPct.toFixed(1) : "—"}
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeApartment(a.id)}
                      className="w-5 h-5 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400"
                      title="Șterge apartament"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sisteme comune — colapsabil */}
      <div className="pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={() => setShowCommon((v) => !v)}
          className="w-full text-left flex items-center justify-between text-[11px] font-semibold text-amber-400/80 py-1"
        >
          <span>Sisteme comune bloc {showCommon ? "▾" : "▸"}</span>
          <span className="text-[10px] opacity-40 font-normal">
            Lift · iluminat scări · centrală termică · ventilație · pompe
          </span>
        </button>

        {showCommon && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            {[
              { key: "elevator", label: "Lift" },
              { key: "stairsLighting", label: "Iluminat scări/holuri" },
              { key: "commonVentilation", label: "Ventilație comună" },
              { key: "pumpGroup", label: "Grup pompe ACM/circulare" },
            ].map(({ key, label }) => {
              const sys = commonSystems[key] || {};
              return (
                <div
                  key={key}
                  className="p-2 rounded-lg border border-white/5 bg-white/[0.02]"
                >
                  <label className="flex items-center gap-2 mb-1 font-medium opacity-80">
                    <input
                      type="checkbox"
                      checked={!!sys.installed}
                      onChange={(e) => updateCommon(key, "installed", e.target.checked)}
                    />
                    {label}
                  </label>
                  {sys.installed && (
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <div className="text-[10px] opacity-40">Putere [kW]</div>
                        <input
                          type="number"
                          step="0.1"
                          value={sys.powerKW || ""}
                          onChange={(e) => updateCommon(key, "powerKW", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] opacity-40">Ore/an</div>
                        <input
                          type="number"
                          value={sys.hoursYear || ""}
                          onChange={(e) => updateCommon(key, "hoursYear", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Centrală termică — câmpuri speciale */}
            <div className="p-2 rounded-lg border border-white/5 bg-white/[0.02] md:col-span-2">
              <label className="flex items-center gap-2 mb-1 font-medium opacity-80">
                <input
                  type="checkbox"
                  checked={!!commonSystems.centralHeating?.installed}
                  onChange={(e) =>
                    updateCommon("centralHeating", "installed", e.target.checked)
                  }
                />
                Centrală termică comună (bloc)
              </label>
              {commonSystems.centralHeating?.installed && (
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <div className="text-[10px] opacity-40">Combustibil</div>
                    <select
                      value={commonSystems.centralHeating?.fuel || "gaz_cond"}
                      onChange={(e) => updateCommon("centralHeating", "fuel", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="gaz_cond">Gaz condensare</option>
                      <option value="gaz_conv">Gaz convențional</option>
                      <option value="biomasa">Biomasă (peleți/lemn)</option>
                      <option value="pc_aa">Pompă căldură aer-apă</option>
                      <option value="pc_aw">Pompă căldură apă-apă (geotermală)</option>
                      <option value="termoficare">Termoficare SACET</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
