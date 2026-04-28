/**
 * SmartDataHub — hub centralizat pentru toate metodele de introducere date în Step 1.
 *
 * Înlocuiește vechiul ImportHub, consolidând:
 *   - Fișiere (IFC, Planșă AI, CSV, EPW, JSON) → RampFile
 *   - Metode "instant" (șabloane, demo, OSM geocode, ANCPI, Open-Meteo) → RampInstant
 *   - Metode ghidate (QuickFill Wizard, Chat AI, Tutorial, formular manual) → RampGuided
 *
 * Layout:
 *   ├─ Welcome banner (doar pe proiect gol)
 *   ├─ Drop zone universal (orice fișier)
 *   ├─ Progress tracker (X/15 câmpuri Step 1)
 *   ├─ 3 cartele mari (Instant / Fișier / Ghidat) — una se expandează la un moment dat
 *   └─ Hint contextual ("ai scris adresa, vrei să geocodăm?")
 */
import { useState, useRef, useCallback, useMemo } from "react";
import RampInstant from "./RampInstant.jsx";
import RampFile from "./RampFile.jsx";
import RampGuided from "./RampGuided.jsx";
import { validateStep1, computeStep1Progress } from "../../calc/step1-validators.js";

// ── Detectare tip fișier pentru drop zone universal ───────────────────────────
function detectFileType(file) {
  const name = (file.name || "").toLowerCase();
  const mime = file.type || "";
  if (name.endsWith(".ifc"))                                           return "ifc";
  if (name.endsWith(".epw"))                                           return "epw";
  if (name.endsWith(".csv") || name.endsWith(".txt"))                  return "csv";
  if (name.endsWith(".json"))                                          return "json";
  if (mime.startsWith("image/") || name.endsWith(".pdf") ||
      name.endsWith(".png")    || name.endsWith(".jpg") ||
      name.endsWith(".jpeg")   || name.endsWith(".webp"))              return "drawing";
  return null;
}

// ── Etichete câmpuri pentru "missing fields hint" (folosite doar de UI) ───────
const FIELD_LABELS_RO = {
  city:            "Localitate",
  county:          "Județ",
  category:        "Categorie",
  structure:       "Structură",
  yearBuilt:       "An construcție",
  floors:          "Regim înălțime",
  areaUseful:      "Suprafață utilă",
  volume:          "Volum încălzit",
  areaEnvelope:    "Suprafață anvelopă",
  heightFloor:     "Înălțime etaj",
  locality:        "Localitate climatică",
  scopCpe:         "Scop CPE",
  apartmentNo:     "Nr. apartament",
  nApartments:     "Nr. apartamente",
};

// Sincronizat cu `src/calc/step1-validators.js` (Sprint 21 #14)
function computeProgress(building) {
  const p = computeStep1Progress(building, "RO");
  return {
    filled: p.filled,
    total: p.total,
    missing: p.missing.map(key => ({ key, label: FIELD_LABELS_RO[key] || key })),
  };
}

// ── Cartelă rampă (click → expandare) ─────────────────────────────────────────
function RampCard({ id, icon, title, subtitle, accent, active, onToggle }) {
  const accentMap = {
    amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/5",  text: "text-amber-300",  hover: "hover:bg-amber-500/10",  ring: "focus-visible:ring-amber-400/60"  },
    sky:    { border: "border-sky-500/30",    bg: "bg-sky-500/5",    text: "text-sky-300",    hover: "hover:bg-sky-500/10",    ring: "focus-visible:ring-sky-400/60"    },
    violet: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-300", hover: "hover:bg-violet-500/10", ring: "focus-visible:ring-violet-400/60" },
  };
  const c = accentMap[accent] || accentMap.sky;
  return (
    <button
      id={`ramp-tab-${id}`}
      role="tab"
      aria-selected={active}
      aria-controls={`ramp-panel-${id}`}
      onClick={onToggle}
      className={`flex-1 flex flex-col items-start gap-1 rounded-xl border-2 transition-all p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f1117] ${c.ring} ${
        active
          ? `${c.border} ${c.bg} ${c.text} shadow-md`
          : `border-white/10 bg-white/[0.02] ${c.hover} text-white/80`
      }`}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-2xl">{icon}</span>
        <span className="font-semibold text-sm">{title}</span>
        <span className={`ml-auto text-xs transition-transform ${active ? "rotate-180" : ""}`}>▾</span>
      </div>
      <span className="text-[10px] opacity-60">{subtitle}</span>
    </button>
  );
}

export default function SmartDataHub({
  // State clădire (pentru progress + context hints)
  building,
  isEmptyProject,
  // Callback-uri Welcome
  onOpenTutorial,
  // Callback-uri RampInstant
  loadDemoByIndex,
  loadTypicalBuilding,
  userPlan,
  onGeocode,
  geoStatus,
  cadastralNr,
  onCadastralNrChange,
  onCadastralLookup,
  cadastralLoading,
  cadastralMsg,
  cadastralSimulated,
  cadastralBannerDismissed,
  onCadastralBannerDismiss,
  selectedClimate,
  importStatus,
  importStatusMsg,
  importedClimateData,
  onOpenMeteoImport,
  // Callback-uri RampFile
  drawingLoading,
  onDrawingFile,
  onOpenIFC,
  onCSVImport,
  onEPWImport,
  onOpenJSONImport,
  // Callback-uri RampGuided
  onOpenQuickFill,
  onOpenChat,
  // Utils
  showToast,
}) {
  // Rampă activă (null = toate colapsate, doar cartelele vizibile)
  // Default: dacă proiect gol → deschis "Instant", altfel toate colapsate
  const [activeRamp, setActiveRamp] = useState(isEmptyProject ? "instant" : null);
  const [dragOver, setDragOver] = useState(false);
  const [dropInfo, setDropInfo] = useState(null);
  const browseFileRef = useRef(null);

  // Progress calculat dinamic
  const progress = useMemo(() => computeProgress(building), [building]);
  const pct = Math.round((progress.filled / progress.total) * 100);

  // ── Router drop zone universal ─────────────────────────────────────────────
  const routeFile = useCallback((file) => {
    const type = detectFileType(file);
    if (!type) {
      showToast?.("Tip fișier nerecunoscut: " + file.name, "error");
      return;
    }
    if (type === "ifc") {
      onOpenIFC?.();
      setDropInfo({ label: `${file.name} → Import IFC/BIM`, type: "success" });
      setActiveRamp("file");
      return;
    }
    if (type === "epw") {
      onEPWImport?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → Import climă EPW`, type: "success" });
      setActiveRamp("file");
      return;
    }
    if (type === "csv") {
      onCSVImport?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → Import climă CSV`, type: "success" });
      setActiveRamp("file");
      return;
    }
    if (type === "json") {
      onOpenJSONImport?.(file);
      setDropInfo({ label: `${file.name} → Import proiect JSON`, type: "success" });
      return;
    }
    if (type === "drawing") {
      onDrawingFile?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → Analiză planșă AI`, type: "success" });
      setActiveRamp("file");
    }
  }, [onOpenIFC, onEPWImport, onCSVImport, onOpenJSONImport, onDrawingFile, showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) routeFile(file);
  }, [routeFile]);

  const handleDragOver  = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const toggleRamp = useCallback((id) => {
    setActiveRamp(prev => prev === id ? null : id);
  }, []);

  // ── Sugestie contextuală (next-best-action) ────────────────────────────────
  const contextHint = useMemo(() => {
    if (building.address && building.city && !selectedClimate) {
      return { icon: "🗺️", text: "Ai scris adresa — poți geocoda automat pentru a detecta amprenta clădirii.", action: "geocode" };
    }
    if (isEmptyProject) {
      return { icon: "💡", text: "Sugestie: încearcă un Șablon clădire tip pentru completare în ~10 secunde.", action: "template" };
    }
    return null;
  }, [building.address, building.city, selectedClimate, isEmptyProject]);

  const handleHintAction = useCallback(() => {
    if (!contextHint) return;
    if (contextHint.action === "geocode") {
      onGeocode?.();
    } else if (contextHint.action === "template") {
      setActiveRamp("instant");
    }
  }, [contextHint, onGeocode]);

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📥</span>
            <span className="font-semibold text-sm text-white">Date clădire</span>
            <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
              alege cum vrei să începi
            </span>
          </div>
          {/* Badge progres compact */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Step 1: <span className={pct >= 80 ? "text-green-400 font-semibold" : pct >= 50 ? "text-amber-400 font-semibold" : "text-slate-300 font-semibold"}>{progress.filled}/{progress.total}</span>
            </span>
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Welcome banner (proiect gol + tutorial) ────────────────────────── */}
      {isEmptyProject && onOpenTutorial && (
        <div className="mx-4 mt-3 rounded-xl border border-purple-500/25 bg-purple-500/[0.07] p-3 flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden="true">🎓</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-xs mb-0.5">Prima dată în Zephren?</div>
            <p className="text-[11px] text-slate-400 leading-snug mb-2">
              Pornește tutorialul interactiv — ghid pas cu pas cu o clădire exemplu precompletată.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={onOpenTutorial}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">
                🎓 Pornește tutorialul
              </button>
              <button onClick={() => loadDemoByIndex?.(0)}
                className="px-3 py-1 rounded-lg text-[10px] font-medium border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80 transition-all">
                sau încarcă exemplu direct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drop zone universal ──────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-3">
        <input
          ref={browseFileRef}
          type="file"
          accept=".ifc,.epw,.csv,.txt,.json,image/jpeg,image/png,image/webp,application/pdf"
          onChange={e => { const f = e.target.files?.[0]; if (f) routeFile(f); e.target.value = ""; }}
          className="hidden"
        />
        <div
          role="region"
          aria-label="Zonă drag și drop fișiere"
          aria-describedby="drop-zone-filetypes"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); browseFileRef.current?.click(); } }}
          className={`rounded-xl border-2 border-dashed py-3 px-3 text-center transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f1117] ${
            dragOver
              ? "border-indigo-400/70 bg-indigo-500/10 scale-[1.005]"
              : "border-white/10 bg-white/[0.015] hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="text-xl" aria-hidden="true">🎯</div>
            <div className="text-left">
              <div className="text-xs font-medium text-slate-300">Trage orice fișier aici</div>
              <div id="drop-zone-filetypes" className="text-[10px] text-slate-500">
                <span className="text-emerald-400/70">.ifc</span> ·{" "}
                <span className="text-indigo-400/70">.pdf/.jpg/.png</span> ·{" "}
                <span className="text-violet-400/70">.epw</span> ·{" "}
                <span className="text-slate-400/70">.csv</span> ·{" "}
                <span className="text-sky-400/70">.json</span>
              </div>
            </div>
            <button
              onClick={() => browseFileRef.current?.click()}
              aria-label="Alege fișier de pe disc"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 hover:text-white text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <span aria-hidden="true">📂</span> Alege fișier
            </button>
          </div>
          {dropInfo && (
            <div className="mt-2 text-[10px] text-green-400 font-medium">
              ✓ {dropInfo.label}
            </div>
          )}
        </div>

        {/* Context hint (next-best-action) */}
        {contextHint && !dropInfo && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/15 px-3 py-2">
            <span className="text-sm">{contextHint.icon}</span>
            <span className="text-[11px] text-indigo-200/80 flex-1">{contextHint.text}</span>
            <button
              onClick={handleHintAction}
              className="text-[10px] px-2 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold transition-all"
            >
              Aplică
            </button>
          </div>
        )}
      </div>

      {/* ── 3 Rampe — cartele ────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex flex-col sm:flex-row gap-2" role="tablist" aria-label="Metode introducere date clădire">
          <RampCard
            id="instant"
            icon="⚡"
            title="Instant"
            subtitle="~10-30 sec · șabloane, OSM, demo"
            accent="amber"
            active={activeRamp === "instant"}
            onToggle={() => toggleRamp("instant")}
          />
          <RampCard
            id="file"
            icon="📎"
            title="Din fișier"
            subtitle="IFC, planșă, climă, JSON"
            accent="sky"
            active={activeRamp === "file"}
            onToggle={() => toggleRamp("file")}
          />
          <RampCard
            id="guided"
            icon="✍️"
            title="Ghidat"
            subtitle="wizard, chat AI, manual"
            accent="violet"
            active={activeRamp === "guided"}
            onToggle={() => toggleRamp("guided")}
          />
        </div>

        {/* Conținut rampă activă */}
        {activeRamp === "instant" && (
          <div id="ramp-panel-instant" role="tabpanel" aria-labelledby="ramp-tab-instant" className="mt-3">
            <RampInstant
              building={building}
              loadDemoByIndex={loadDemoByIndex}
              loadTypicalBuilding={loadTypicalBuilding}
              userPlan={userPlan}
              onGeocode={onGeocode}
              geoStatus={geoStatus}
              cadastralNr={cadastralNr}
              onCadastralNrChange={onCadastralNrChange}
              onCadastralLookup={onCadastralLookup}
              cadastralLoading={cadastralLoading}
              cadastralMsg={cadastralMsg}
              cadastralSimulated={cadastralSimulated}
              cadastralBannerDismissed={cadastralBannerDismissed}
              onCadastralBannerDismiss={onCadastralBannerDismiss}
              selectedClimate={selectedClimate}
              importStatus={importStatus}
              importStatusMsg={importStatusMsg}
              importedClimateData={importedClimateData}
              onOpenMeteoImport={onOpenMeteoImport}
              showToast={showToast}
            />
          </div>
        )}
        {activeRamp === "file" && (
          <div id="ramp-panel-file" role="tabpanel" aria-labelledby="ramp-tab-file" className="mt-3">
            <RampFile
              drawingLoading={drawingLoading}
              onDrawingFile={onDrawingFile}
              onOpenIFC={onOpenIFC}
              onCSVImport={onCSVImport}
              onEPWImport={onEPWImport}
              onOpenJSONImport={onOpenJSONImport}
              importStatus={importStatus}
              importStatusMsg={importStatusMsg}
              importedClimateData={importedClimateData}
            />
          </div>
        )}
        {activeRamp === "guided" && (
          <div id="ramp-panel-guided" role="tabpanel" aria-labelledby="ramp-tab-guided" className="mt-3">
            <RampGuided
              onOpenQuickFill={onOpenQuickFill}
              onOpenChat={onOpenChat}
              onOpenTutorial={onOpenTutorial}
            />
          </div>
        )}
      </div>

      {/* ── Lista câmpuri lipsă (când progres < 100% și rampă închisă) ─────── */}
      {activeRamp === null && progress.filled < progress.total && progress.filled > 0 && (
        <div className="px-4 pb-4 pt-0">
          <details className="rounded-lg border border-white/[0.06] bg-white/[0.015] overflow-hidden">
            <summary className="px-3 py-2 text-[11px] text-slate-400 cursor-pointer hover:bg-white/[0.02] select-none">
              ⚠ Mai sunt {progress.missing.length} câmpuri de completat — click pentru listă
            </summary>
            <div className="px-3 py-2 border-t border-white/[0.04] flex flex-wrap gap-1.5">
              {progress.missing.map(f => (
                <span key={f.key} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/[0.04]">
                  {f.label}
                </span>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
