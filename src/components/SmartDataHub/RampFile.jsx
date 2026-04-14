/**
 * RampFile — importuri de fișiere reale (upload).
 *
 * Conținut:
 *   ├─ Planșă tehnică AI (PDF/JPG/PNG) — extrage Au, V, etaje, adresă
 *   ├─ IFC/BIM (Revit, ArchiCAD, BIM 360)
 *   ├─ CSV climatic (12 luni)
 *   ├─ EPW EnergyPlus
 *   └─ JSON proiect Zephren (restore)
 */
import { useRef } from "react";

function ActionButton({ icon, title, description, accent = "sky", onClick, disabled, loading }) {
  const accentMap = {
    indigo:  "border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300",
    emerald: "border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300",
    violet:  "border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300",
    slate:   "border-slate-600/25 bg-slate-800/25 hover:bg-slate-700/30 text-slate-200",
    amber:   "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed group ${accentMap[accent]}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold group-hover:brightness-110">{title}</div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      {loading
        ? <span className="w-4 h-4 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
        : <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>}
    </button>
  );
}

export default function RampFile({
  drawingLoading,
  onDrawingFile,
  onOpenIFC,
  onCSVImport,
  onEPWImport,
  onOpenJSONImport,
  importStatus,
  importStatusMsg,
  importedClimateData,
}) {
  const drawingRef = useRef(null);
  const csvRef     = useRef(null);
  const epwRef     = useRef(null);
  const jsonRef    = useRef(null);

  return (
    <div className="space-y-2">

      {/* ── Planșă tehnică AI ────────────────────────────────────────────────── */}
      <input
        ref={drawingRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={onDrawingFile}
        className="hidden"
      />
      <ActionButton
        icon="📐"
        title={drawingLoading ? "Se analizează planșa..." : "Planșă tehnică (AI)"}
        description="PDF sau imagine — Claude Vision extrage automat Au, V, etaje, înălțime, structură, adresă"
        accent="indigo"
        onClick={() => drawingRef.current?.click()}
        disabled={drawingLoading}
        loading={drawingLoading}
      />

      {/* ── IFC/BIM ──────────────────────────────────────────────────────────── */}
      <ActionButton
        icon="📎"
        title="Import IFC/BIM"
        description="Fișier .ifc din Revit, ArchiCAD sau BIM 360 — completare automată toate câmpurile"
        accent="emerald"
        onClick={onOpenIFC}
      />

      {/* ── CSV climatic ─────────────────────────────────────────────────────── */}
      <input ref={csvRef} type="file" accept=".csv,.txt" onChange={onCSVImport} className="hidden" />
      <ActionButton
        icon="📊"
        title="CSV date climatice"
        description="12 rânduri: Lună, T_medie, T_min, T_max, GHI, RH, Vânt (m/s)"
        accent="slate"
        onClick={() => csvRef.current?.click()}
      />

      {/* ── EPW ──────────────────────────────────────────────────────────────── */}
      <input ref={epwRef} type="file" accept=".epw" onChange={onEPWImport} className="hidden" />
      <ActionButton
        icon="🌡️"
        title="EPW (EnergyPlus)"
        description="Fișier .epw standard — extrage medii lunare de temperatură și radiație solară"
        accent="violet"
        onClick={() => epwRef.current?.click()}
      />

      {/* ── JSON proiect ─────────────────────────────────────────────────────── */}
      {onOpenJSONImport && (
        <>
          <input
            ref={jsonRef}
            type="file"
            accept=".json"
            onChange={e => { const f = e.target.files?.[0]; if (f) { onOpenJSONImport(f); e.target.value = ""; } }}
            className="hidden"
          />
          <ActionButton
            icon="💾"
            title="Restore proiect JSON"
            description="Încarcă un proiect Zephren exportat anterior — toate cele 8 pași"
            accent="amber"
            onClick={() => jsonRef.current?.click()}
          />
        </>
      )}

      {/* ── Status import climă ──────────────────────────────────────────────── */}
      {importStatus === "ok" && importStatusMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-green-900/20 border border-green-700/30 p-2 text-[11px] text-green-300">
          <span className="shrink-0 mt-0.5">✓</span>
          <div>
            <div className="font-medium">{importStatusMsg}</div>
            {importedClimateData?.temp_month && (
              <div className="text-[10px] text-green-400/80 mt-0.5">
                T ian.: {importedClimateData.temp_month[0]}°C · T iul.: {importedClimateData.temp_month[6]}°C
                {importedClimateData.GHI_month?.length === 12
                  ? ` · GHI iul.: ${importedClimateData.GHI_month[6]} kWh/m²`
                  : ""}
              </div>
            )}
          </div>
        </div>
      )}
      {importStatus === "error" && importStatusMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-700/30 p-2 text-[11px] text-red-300">
          <span className="shrink-0 mt-0.5">✗</span>
          <div>{importStatusMsg}</div>
        </div>
      )}

      <div className="text-[10px] text-slate-600 italic pt-1 px-1">
        Datele climatice importate sunt informative. Calculele folosesc datele Mc 001-2022 din baza internă.
      </div>
    </div>
  );
}
