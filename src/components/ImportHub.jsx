/**
 * ImportHub — centralizează toate metodele de import date în Etapa 1.
 * Tab-uri: Documente | Adresă & GIS | Climă | Fotografii
 * Drag & drop cu auto-detectare tip fișier.
 */
import { useState, useRef, useCallback } from "react";
import BuildingPhotos from "./BuildingPhotos.jsx";

const TABS = [
  { id: "documente", icon: "📄", label: "Documente" },
  { id: "gis",       icon: "🌍", label: "Adresă & GIS" },
  { id: "clima",     icon: "📡", label: "Climă" },
  { id: "fotografii",icon: "📷", label: "Fotografii" },
];

function detectFileType(file) {
  const name = (file.name || "").toLowerCase();
  const mime = file.type || "";
  if (name.endsWith(".ifc"))                            return "ifc";
  if (name.endsWith(".epw"))                            return "epw";
  if (name.endsWith(".csv") || name.endsWith(".txt"))   return "csv";
  if (mime.startsWith("image/") || name.endsWith(".pdf") ||
      name.endsWith(".png") || name.endsWith(".jpg") ||
      name.endsWith(".jpeg") || name.endsWith(".webp")) return "drawing";
  return null;
}

export default function ImportHub({
  // Documente
  onOpenIFC,
  drawingLoading,
  onDrawingFile,
  // GIS
  onGeocode,
  geoStatus,
  cadastralNr,
  onCadastralNrChange,
  onCadastralLookup,
  cadastralLoading,
  cadastralMsg,
  // Climă
  selectedClimate,
  importStatus,
  importStatusMsg,
  importedClimateData,
  onOpenMeteoImport,
  onCSVImport,
  onEPWImport,
  // Fotografii
  buildingPhotos,
  setBuildingPhotos,
  // Utils
  showToast,
  cn,
}) {
  const [activeTab, setActiveTab] = useState("documente");
  const [dragOver, setDragOver]   = useState(false);
  const [dropInfo, setDropInfo]   = useState(null); // { label } ultimul fișier detectat

  // Ref-uri fișiere în hub (independente de cele din Step1)
  const drawingFileRef = useRef(null);
  const csvFileRef     = useRef(null);
  const epwFileRef     = useRef(null);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const routeFile = useCallback((file) => {
    const type = detectFileType(file);
    if (!type) {
      showToast?.("Tip fișier nerecunoscut: " + file.name, "error");
      return;
    }
    if (type === "ifc") {
      onOpenIFC?.();
      setDropInfo({ label: `${file.name} → deschide Import IFC/BIM` });
      setActiveTab("documente");
      return;
    }
    if (type === "epw") {
      onEPWImport?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → import climă EPW` });
      setActiveTab("clima");
      return;
    }
    if (type === "csv") {
      onCSVImport?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → import climă CSV` });
      setActiveTab("clima");
      return;
    }
    if (type === "drawing") {
      onDrawingFile?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → analiză planșă AI` });
      setActiveTab("documente");
    }
  }, [onOpenIFC, onEPWImport, onCSVImport, onDrawingFile, showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) routeFile(file);
  }, [routeFile]);

  const handleDragOver  = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">

      {/* Header + Drop zone */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📥</span>
          <span className="font-semibold text-sm text-white">Import date clădire</span>
          <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
            Documente, GIS, climă sau fotografii
          </span>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`rounded-xl border-2 border-dashed py-4 px-3 text-center transition-all select-none ${
            dragOver
              ? "border-indigo-400/70 bg-indigo-500/10 scale-[1.005]"
              : "border-white/10 bg-white/[0.015] hover:border-white/20"
          }`}
        >
          <div className="text-xl mb-0.5">🎯</div>
          <div className="text-xs font-medium text-slate-300">Trage orice fișier aici</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            <span className="text-emerald-400/70">.ifc</span> BIM ·{" "}
            <span className="text-indigo-400/70">.pdf/.jpg/.png</span> planșă AI ·{" "}
            <span className="text-violet-400/70">.epw</span> climă ·{" "}
            <span className="text-slate-400/70">.csv</span> date climatice
          </div>
          {dropInfo && (
            <div className="mt-1.5 text-[10px] text-green-400 font-medium">
              ✓ {dropInfo.label}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "text-white border-b-2 border-indigo-400 bg-indigo-500/5"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">

        {/* ── DOCUMENTE ── */}
        {activeTab === "documente" && (
          <div className="space-y-2">
            {/* Planșă tehnică AI */}
            <input
              ref={drawingFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={onDrawingFile}
              className="hidden"
            />
            <button
              onClick={() => drawingFileRef.current?.click()}
              disabled={drawingLoading}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-left transition-all disabled:opacity-50 group"
            >
              <span className="text-xl shrink-0">📐</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200">
                  {drawingLoading ? "Se analizează planșa..." : "Planșă tehnică (AI)"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  PDF sau imagine — extrage Au, V, etaje, înălțime, structură, adresă
                </div>
              </div>
              {drawingLoading
                ? <span className="w-4 h-4 rounded-full border border-indigo-400 border-t-transparent animate-spin shrink-0" />
                : <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>}
            </button>

            {/* IFC/BIM */}
            <button
              onClick={onOpenIFC}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all group"
            >
              <span className="text-xl shrink-0">📎</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">
                  Import IFC/BIM
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Fișier .ifc din Revit, ArchiCAD sau BIM 360 — completare automată toate câmpurile
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>
            </button>

            <div className="text-[10px] text-slate-600 italic pt-1 px-1">
              Tip: poți trage fișierele direct în zona de drop de mai sus.
            </div>
          </div>
        )}

        {/* ── ADRESĂ & GIS ── */}
        {activeTab === "gis" && (
          <div className="space-y-3">
            {/* OSM Geocodare */}
            <button
              onClick={onGeocode}
              disabled={geoStatus === "loading"}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-left transition-all disabled:opacity-50 group"
            >
              <span className="text-xl shrink-0">🔍</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sky-300 group-hover:text-sky-200">
                  {geoStatus === "loading" ? "Geocodare în curs..." : "Autocompletare adresă (OSM)"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Completează județul, codul poștal și detectează automat amprenta clădirii
                </div>
              </div>
              {geoStatus === "loading"
                ? <span className="w-4 h-4 rounded-full border border-sky-400 border-t-transparent animate-spin shrink-0" />
                : <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>}
            </button>

            {geoStatus === "ok" && (
              <div className="text-[10px] text-green-400 px-1">✓ Geocodare reușită</div>
            )}
            {geoStatus === "error" && (
              <div className="text-[10px] text-red-400 px-1">✗ Adresa nu a fost găsită — verificați strada și localitatea</div>
            )}

            {/* ANCPI Cadastru */}
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 space-y-2">
              <div className="text-[10px] font-semibold text-amber-300/70">🏛️ Număr cadastral ANCPI</div>
              <div className="flex gap-2">
                <input
                  value={cadastralNr}
                  onChange={e => onCadastralNrChange(e.target.value)}
                  placeholder="ex: 12345"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={onCadastralLookup}
                  disabled={!cadastralNr.trim() || cadastralLoading}
                  className="px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {cadastralLoading
                    ? <span className="w-3 h-3 rounded-full border border-sky-400 border-t-transparent animate-spin" />
                    : "🏛️"}
                  ANCPI
                </button>
              </div>
              {cadastralMsg && (
                <div className={`text-[10px] px-1 ${cadastralMsg.startsWith("✓") ? "text-green-400" : "text-amber-400"}`}>
                  {cadastralMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CLIMĂ ── */}
        {activeTab === "clima" && (
          <div className="space-y-2">
            {/* ERA5 Open-Meteo */}
            <button
              onClick={onOpenMeteoImport}
              disabled={importStatus === "loading" || !selectedClimate}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 text-left transition-all disabled:opacity-50 group"
            >
              <span className="text-xl shrink-0">🌍</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-violet-300 group-hover:text-violet-200">
                  {importStatus === "loading" ? "Se descarcă..." : "Open-Meteo ERA5 (auto)"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {selectedClimate
                    ? "Descarcă medii lunare 2023 pentru coordonatele localității"
                    : "⚠ Selectați mai întâi o localitate în formularul de sus"}
                </div>
              </div>
              {importStatus === "loading"
                ? <span className="w-4 h-4 rounded-full border border-violet-400 border-t-transparent animate-spin shrink-0" />
                : <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>}
            </button>

            {/* CSV */}
            <input ref={csvFileRef} type="file" accept=".csv,.txt" onChange={onCSVImport} className="hidden" />
            <button
              onClick={() => csvFileRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-600/25 bg-slate-800/25 hover:bg-slate-700/30 text-left transition-all group"
            >
              <span className="text-xl shrink-0">📊</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white">Import CSV climat</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  12 rânduri: Lună, T_medie, T_min, T_max, GHI, RH, Vânt (m/s)
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>
            </button>

            {/* EPW */}
            <input ref={epwFileRef} type="file" accept=".epw" onChange={onEPWImport} className="hidden" />
            <button
              onClick={() => epwFileRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-600/25 bg-slate-800/25 hover:bg-slate-700/30 text-left transition-all group"
            >
              <span className="text-xl shrink-0">📂</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white">Import EPW (EnergyPlus)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Fișier .epw standard — extrage automat medii lunare de temperatură și radiație
                </div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 text-xs shrink-0">→</span>
            </button>

            {/* Status import climă */}
            {importStatus === "ok" && importStatusMsg && (
              <div className="flex items-start gap-2 rounded-lg bg-green-900/30 border border-green-700/30 p-2 text-xs text-green-300">
                <span className="shrink-0 mt-0.5">✓</span>
                <div>
                  <div className="font-medium">{importStatusMsg}</div>
                  {importedClimateData?.temp_month && (
                    <div className="text-[10px] text-green-400 mt-0.5">
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
              <div className="flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/30 p-2 text-xs text-red-300">
                <span className="shrink-0 mt-0.5">✗</span>
                <div>{importStatusMsg}</div>
              </div>
            )}

            <div className="text-[10px] text-slate-600 italic pt-1 px-1">
              Datele importate sunt informative. Calculele folosesc datele Mc 001-2022 din baza internă.
            </div>
          </div>
        )}

        {/* ── FOTOGRAFII ── */}
        {activeTab === "fotografii" && (
          <div>
            <p className="text-[11px] text-slate-400 mb-3">
              Fotografii grupate pe categorii — incluse automat în Anexa fotografică a CPE.
            </p>
            <BuildingPhotos
              buildingPhotos={buildingPhotos || []}
              setBuildingPhotos={setBuildingPhotos}
              showToast={showToast}
              cn={cn}
            />
          </div>
        )}

      </div>
    </div>
  );
}
