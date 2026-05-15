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
import UnifiedSmartInput from "./UnifiedSmartInput.jsx";
import { validateStep1, computeStep1Progress } from "../../calc/step1-validators.js";
import { routePaste } from "./pasteRouter.js";
import {
  useAutoSaveStep1Draft,
  readStep1Draft,
  clearStep1Draft,
  formatRelativeTime,
} from "../../hooks/useAutoSaveStep1Draft.js";

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

// Sincronizat cu `src/calc/step1-validators.js` (Sprint 21 #14 + Sprint Smart Input 2026)
// Acum returnează și sub-counters tri-nivel pentru bar de progres segmentat.
function computeProgress(building) {
  const p = computeStep1Progress(building, "RO");
  return {
    filled: p.filled,
    total: p.total,
    missing: p.missing.map(key => ({ key, label: FIELD_LABELS_RO[key] || key })),
    essential: p.essential,
    recommended: p.recommended,
    official: p.official,
    cpeReady: p.cpeReady,
    cpeOfficial: p.cpeOfficial,
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
  facadeLoading,        // Sprint Smart Input 2026 (3.1) — Foto fațadă AI
  onFacadeFile,
  onOpenIFC,
  onCSVImport,
  onEPWImport,
  onOpenJSONImport,
  // Callback-uri RampGuided
  onOpenQuickFill,
  onOpenChat,
  // Sprint Smart Input 2026 (1.3) — restore draft
  applyBuildingPatch,
  // Sprint Smart Input 2026 (1.5) — duplică proiect recent
  onDuplicateRecent,
  currentProjectId,
  // Sprint Smart Input 2026 (2.1) — paste handler text → Chat AI cu text inițial
  onPasteText,
  // Sprint Smart Input 2026 (D3) — voice commands proceduriale (open tutorial / quickfill / chat)
  onVoiceCommand,
  // Sprint Smart Input 2026 (D6) — autocomplete inline din templates RO
  templates,
  onApplyTemplate,
  // Sprint Smart Input 2026 (3.2) — Import CPE precedent
  cpePriorLoading,
  onCpePriorFile,
  // Utils
  showToast,
}) {
  // Rampă activă (null = toate colapsate, doar cartelele vizibile)
  // Default: dacă proiect gol → deschis "Instant", altfel toate colapsate
  const [activeRamp, setActiveRamp] = useState(isEmptyProject ? "instant" : null);
  const [dragOver, setDragOver] = useState(false);
  const [dropInfo, setDropInfo] = useState(null);
  const browseFileRef = useRef(null);

  // ── Sprint Smart Input 2026 (1.3) — Auto-save draft Step 1 ──────────────
  // Salvează building cu debounce 2s în localStorage pentru recovery la F5/crash.
  useAutoSaveStep1Draft(building, { enabled: true });

  // Recovery banner: la mount, dacă există draft cu mai multe câmpuri decât building actual
  const [draftRecovery, setDraftRecovery] = useState(() => {
    if (!isEmptyProject) return null; // doar pentru proiecte goale propunem recovery
    const draft = readStep1Draft();
    if (!draft || draft.fieldsCount < 2) return null;
    return draft;
  });

  const handleRestoreDraft = useCallback(() => {
    if (!draftRecovery || typeof applyBuildingPatch !== "function") return;
    applyBuildingPatch(draftRecovery.building);
    clearStep1Draft();
    setDraftRecovery(null);
    showToast?.(`Draft restaurat (${draftRecovery.fieldsCount} câmpuri)`, "success");
  }, [draftRecovery, applyBuildingPatch, showToast]);

  const handleDismissDraft = useCallback(() => {
    clearStep1Draft();
    setDraftRecovery(null);
  }, []);

  // Progress calculat dinamic (cu sub-counters tri-nivel)
  const progress = useMemo(() => computeProgress(building), [building]);
  const pct = Math.round((progress.filled / progress.total) * 100);
  const pctEssential   = progress.essential.total   ? Math.round((progress.essential.filled   / progress.essential.total)   * 100) : 0;
  const pctRecommended = progress.recommended.total ? Math.round((progress.recommended.filled / progress.recommended.total) * 100) : 0;
  const pctOfficial    = progress.official.total    ? Math.round((progress.official.filled    / progress.official.total)    * 100) : 0;

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

  // Sprint Smart Input 2026 (2.1) — Paste handler universal (refactor 1.5b)
  // Logica e extrasă în `pasteRouter.routePaste` pentru testare unitară fără React.
  const handlePaste = useCallback((e) => {
    if (!e?.clipboardData) return;
    const result = routePaste({
      clipboardData: e.clipboardData,
      callbacks: {
        onImage: routeFile,
        onFile:  routeFile,
        onText:  onPasteText,
      },
    });
    if (result.handled) {
      e.preventDefault();
      if (result.info) setDropInfo({ label: result.info, type: "success" });
    }
  }, [routeFile, onPasteText]);

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

      {/* ── Header (Sprint Smart Input 2026 — tri-nivel) ───────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📥</span>
            <span className="font-semibold text-sm text-white">Date clădire</span>
            <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
              alege cum vrei să începi
            </span>
          </div>
          {/* Badge stare CPE (înlocuiește vechiul X/Y) */}
          <div className="flex items-center gap-1.5">
            {progress.cpeOfficial ? (
              <span
                title="Toate câmpurile esențiale + geometrie + cadastru/CF completate. Poți emite CPE pentru depunere oficială MDLPA."
                className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/15 text-green-300 border border-green-500/30 font-semibold"
              >
                📋 Gata pentru depunere oficială
              </span>
            ) : progress.cpeReady ? (
              <span
                title="Câmpurile esențiale sunt completate. Poți rula calcul preliminar Mc 001-2022; pentru depunere oficială mai trebuie geometrie + cadastru."
                className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
              >
                🟢 CPE generabil ({progress.essential.filled}/{progress.essential.total} esențiale)
              </span>
            ) : (
              <span
                title="Mai trebuie completate câteva câmpuri esențiale înainte de a putea rula motorul de calcul."
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/10 font-semibold"
              >
                Esențiale: {progress.essential.filled}/{progress.essential.total}
              </span>
            )}
          </div>
        </div>

        {/* Bară tri-segment cu refs Mc 001-2022 (B5) */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex h-1.5 gap-0.5 rounded-full overflow-hidden bg-white/[0.04]"
            role="progressbar"
            aria-label="Progres completare câmpuri Step 1"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.filled}
          >
            {/* Segment 1 — ESENȚIAL (verde) */}
            <div
              className="flex-[2] relative bg-white/[0.04]"
              title={`ESENȚIAL pentru calcul: ${progress.essential.filled}/${progress.essential.total} câmpuri\n\nReferință: Mc 001-2022 Cap. 1 §1.3 (identificare clădire) — categorie + an + Au + localitate climatică sunt minimul absolut pentru a iniția algoritmul ISO 13790.`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                style={{ width: `${pctEssential}%` }}
              />
            </div>
            {/* Segment 2 — RECOMANDAT (amber) */}
            <div
              className="flex-[4] relative bg-white/[0.04]"
              title={`RECOMANDAT pentru CPE de calitate: ${progress.recommended.filled}/${progress.recommended.total} câmpuri\n\nReferință: Mc 001-2022 Cap. 2 §2.1 (geometrie) + Ord. MDLPA 16/2023 Anexa 1 — geometria completă (V, A_env, h_etaj) reduce eroarea EP cu până la 15% față de estimări implicite.`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-500"
                style={{ width: `${pctRecommended}%` }}
              />
            </div>
            {/* Segment 3 — OFICIAL MDLPA (sky) */}
            <div
              className="flex-[1] relative bg-white/[0.04]"
              title={`OBLIGATORIU pentru depunere oficială MDLPA: ${progress.official.filled}/${progress.official.total} câmpuri\n\nReferință: Ord. MDLPA 16/2023 + L. 238/2024 Art. 12 — număr cadastral + CF obligatorii pentru CPE depus la portalul MDLPA (din 8.VII.2026 conform Ord. 348/2026).`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-sky-500 transition-all duration-500"
                style={{ width: `${pctOfficial}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 tabular-nums shrink-0 min-w-[2.5rem] text-right">
            {progress.filled}/{progress.total}
          </span>
        </div>

        {/* Legendă mini cu tooltips Mc 001 refs (B5) */}
        {pct < 100 && (
          <div className="hidden sm:flex items-center gap-3 mt-1.5 text-[9px] text-slate-500">
            <span
              className="flex items-center gap-1 cursor-help"
              title="Mc 001-2022 Cap. 1 §1.3 — minim pentru EP/clasificare"
            >
              <span className="w-2 h-2 rounded-sm bg-green-500" /> esențial calcul
            </span>
            <span
              className="flex items-center gap-1 cursor-help"
              title="Mc 001-2022 Cap. 2 §2.1 + Anexa 1 MDLPA 16/2023 — geometrie + scop"
            >
              <span className="w-2 h-2 rounded-sm bg-amber-500" /> recomandat CPE
            </span>
            <span
              className="flex items-center gap-1 cursor-help"
              title="Ord. MDLPA 16/2023 + L. 238/2024 Art. 12 — cadastru + CF obligatorii"
            >
              <span className="w-2 h-2 rounded-sm bg-sky-500" /> oficial MDLPA
            </span>
          </div>
        )}
      </div>

      {/* ── Sprint Smart Input 2026 (1.3) — Banner Recovery Draft ─────────── */}
      {draftRecovery && applyBuildingPatch && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.06] p-3 flex items-start gap-3"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">💾</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-200 text-xs mb-0.5 flex items-center gap-2 flex-wrap">
              Draft nesalvat detectat
              <span className="text-[9px] font-normal text-amber-300/70">
                {formatRelativeTime(draftRecovery.savedAt)}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-snug mb-2">
              Ai început completarea Step 1 cu <strong className="text-amber-100">{draftRecovery.fieldsCount} câmpuri</strong> dar nu ai salvat proiectul. Le restaurăm acum?
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                💾 Restaurează draft
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="px-3 py-1 rounded-lg text-[10px] font-medium border border-amber-500/30 hover:bg-amber-500/10 text-amber-300/80 hover:text-amber-200 transition-all"
              >
                Ignoră
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome banner (proiect gol + tutorial) ────────────────────────── */}
      {isEmptyProject && onOpenTutorial && !draftRecovery && (
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

      {/* ── Sprint Smart Input 2026 (2.2) — Unified Smart Input ──────────── */}
      {(onPasteText || routeFile) && (
        <div className="px-4 pt-3">
          <UnifiedSmartInput
            onSubmitText={onPasteText}
            onPickImage={(file) => { routeFile(file); }}
            onPickFile={(file) => { routeFile(file); }}
            onVoiceCommand={onVoiceCommand}
            templates={templates}
            onApplyTemplate={onApplyTemplate}
            showToast={showToast}
          />
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
          aria-label="Zonă drag și drop fișiere — acceptă și paste Ctrl+V cu text sau imagini"
          aria-describedby="drop-zone-filetypes"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
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
              <div className="text-xs font-medium text-slate-300">
                Trage fișier · sau lipește <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-200 border border-white/10">Ctrl+V</kbd> text/imagine
              </div>
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
            <div
              role="status"
              aria-live="polite"
              className="mt-2 text-[10px] text-green-400 font-medium"
            >
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
            subtitle="IFC, planșă, JSON · climă opțional"
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
              onDuplicateRecent={onDuplicateRecent}
              currentProjectId={currentProjectId}
              cpePriorLoading={cpePriorLoading}
              onCpePriorFile={onCpePriorFile}
            />
          </div>
        )}
        {activeRamp === "file" && (
          <div id="ramp-panel-file" role="tabpanel" aria-labelledby="ramp-tab-file" className="mt-3">
            <RampFile
              drawingLoading={drawingLoading}
              onDrawingFile={onDrawingFile}
              facadeLoading={facadeLoading}
              onFacadeFile={onFacadeFile}
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
