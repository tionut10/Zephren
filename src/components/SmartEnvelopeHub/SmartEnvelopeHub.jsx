/**
 * SmartEnvelopeHub — hub centralizat pentru completarea datelor de anvelopă
 * (Step 2 Zephren). Refactor aprobat în envelope_hub_design.md (14.04.2026).
 *
 * S2 (Sesiunea 2 - această sesiune): SHELL SCAFOLDING.
 *   ✅ Header + progress tracker (10/10 gate-uri)
 *   ✅ Drop zone universal (.gbxml / .ifc / .csv / .json)
 *   ✅ 3 cartele rampă (Instant / Fișier / Ghidat) — conținut TODO în S3/S4
 *   ✅ Context hints (next-best-action)
 *   ✅ Warning D1 (auto-generate punți) — doar banner, acțiunea vine în S3
 *   ⬜ Conținut complet rampe                → S3 (Instant+File), S4 (Guided)
 *   ⬜ Integrare în Step2Envelope.jsx        → S4 (sub feature flag)
 *
 * Layout (consistent cu SmartDataHub):
 *   ├─ Header   : titlu + badge progres X/10
 *   ├─ Warning  : avertisment estimare orientativă (D1)
 *   ├─ DropZone : fișiere gbXML/IFC/CSV/JSON
 *   ├─ Ramps    : 3 cartele tab-like (amber / sky / violet)
 *   ├─ Hint     : next-best-action contextual
 *   └─ Progress : lista celor 10 gate-uri (expandabilă)
 *
 * Shortcuts tastatură (D7) — scaffold în useEffect (active în S4):
 *   N = new opaque · G = new glazing · B = new bridge
 *   I = switch Instant · F = switch Fișier · H = switch Ghidat
 */
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import RampInstant from "./RampInstant.jsx";
import RampFile from "./RampFile.jsx";
import RampGuided from "./RampGuided.jsx";
import EnvelopeLossChart from "./EnvelopeLossChart.jsx";
import { computeEnvelopeProgress, STEP2_FIELDS } from "./EnvelopeProgress.js";

// ── Detectare tip fișier pentru drop zone universal ─────────────────────────
function detectEnvelopeFileType(file) {
  const name = (file.name || "").toLowerCase();
  const mime = file.type || "";
  if (name.endsWith(".ifc"))                                 return "ifc";
  if (name.endsWith(".gbxml") || name.endsWith(".xml"))      return "gbxml";
  if (name.endsWith(".csv") || name.endsWith(".txt"))        return "csv";
  if (name.endsWith(".json"))                                return "json";
  if (mime.startsWith("image/") || name.endsWith(".pdf"))    return "drawing";
  return null;
}

// ── Cartelă rampă tab-like (reutilizare pattern SmartDataHub) ───────────────
function RampCard({ id, icon, title, subtitle, accent, active, onToggle, shortcut }) {
  const accentMap = {
    amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/5",  text: "text-amber-300",  hover: "hover:bg-amber-500/10",  ring: "focus-visible:ring-amber-400/60"  },
    sky:    { border: "border-sky-500/30",    bg: "bg-sky-500/5",    text: "text-sky-300",    hover: "hover:bg-sky-500/10",    ring: "focus-visible:ring-sky-400/60"    },
    violet: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-300", hover: "hover:bg-violet-500/10", ring: "focus-visible:ring-violet-400/60" },
  };
  const c = accentMap[accent] || accentMap.sky;
  return (
    <button
      id={`env-ramp-tab-${id}`}
      role="tab"
      aria-selected={active}
      aria-controls={`env-ramp-panel-${id}`}
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
        {shortcut && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono">
            {shortcut}
          </span>
        )}
        <span className={`ml-auto text-xs transition-transform ${active ? "rotate-180" : ""}`}>▾</span>
      </div>
      <span className="text-[10px] opacity-60">{subtitle}</span>
    </button>
  );
}

// ── Barră progres compactă (0-100%) ──────────────────────────────────────────
function ProgressBar({ pct }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-400";
  const textColor = pct >= 80 ? "text-green-400" : pct >= 50 ? "text-amber-400" : "text-slate-300";
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-semibold ${textColor}`}>{pct}%</span>
      <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Listă gate-uri expandabilă (arată ce lipsește) ──────────────────────────
function GateList({ gates, expanded, onToggle }) {
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▸</span>
        {expanded ? "Ascunde detalii" : "Arată ce lipsește"}
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 pl-4">
          {gates.map(g => (
            <li key={g.key} className="flex items-center gap-2 text-[11px]">
              <span className={g.ok ? "text-emerald-400" : "text-slate-500"}>
                {g.ok ? "✓" : "○"}
              </span>
              <span className={g.ok ? "text-slate-300" : "text-slate-400"}>
                {g.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SmartEnvelopeHub({
  // ── State Step 2 (citit, nu modificat direct) ──────────────────────────────
  building,
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  envelopeSummary,
  calcOpaqueR,
  ELEMENT_TYPES = [],
  lang = "RO",
  selectedClimate,

  // ── Callback-uri CRUD (delegate către Step2Envelope existent) ──────────────
  setEditingOpaque,
  setShowOpaqueModal,
  setEditingGlazing,
  setShowGlazingModal,
  setEditingBridge,
  setShowBridgeModal,
  setShowBridgeCatalog,

  // ── Callback-uri RampInstant (TODO S3: șabloane, demo, pachet punți) ──────
  loadDemoByIndex,
  applyStandardBridgesPack,    // → utils/applyStandardBridgesPack.js (S3)

  // ── Callback-uri RampFile (TODO S3: import IFC/gbXML, CSV pereți) ──────────
  onOpenIFC,
  onCSVImport,
  onOpenJSONImport,
  onGbxmlImport,               // nou în S3 (wrapper peste IFCImport existent)

  // ── Callback-uri RampGuided (TODO S4: wizard 3 pași + chat AI) ────────────
  onOpenWizard,
  onOpenChat,

  // ── Utils ──────────────────────────────────────────────────────────────────
  t = (key) => key,
  showToast,
}) {
  // ── Rampă activă (null = toate colapsate) ──────────────────────────────────
  const [activeRamp, setActiveRamp] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropInfo, setDropInfo] = useState(null);
  const [gatesExpanded, setGatesExpanded] = useState(false);
  const browseFileRef = useRef(null);

  // ── Progres calculat (10 gate-uri STEP2_FIELDS) ────────────────────────────
  const progress = useMemo(
    () => computeEnvelopeProgress({
      opaqueElements,
      glazingElements,
      thermalBridges,
      building,
      calcOpaqueR,
    }),
    [opaqueElements, glazingElements, thermalBridges, building, calcOpaqueR]
  );

  // ── Router drop zone universal ─────────────────────────────────────────────
  const routeFile = useCallback((file) => {
    const type = detectEnvelopeFileType(file);
    if (!type) {
      showToast?.("Tip fișier nerecunoscut: " + file.name, "error");
      return;
    }
    if (type === "ifc" || type === "gbxml") {
      // Deschidem IFCImport existent (parser gbXML). În S3 vom adăuga wrapper
      // explicit onGbxmlImport dacă avem nevoie de preprocessing.
      onOpenIFC?.();
      setDropInfo({ label: `${file.name} → Import ${type.toUpperCase()}`, type: "success" });
      setActiveRamp("file");
      return;
    }
    if (type === "csv") {
      onCSVImport?.({ target: { files: [file], value: "" } });
      setDropInfo({ label: `${file.name} → Import CSV pereți`, type: "success" });
      setActiveRamp("file");
      return;
    }
    if (type === "json") {
      onOpenJSONImport?.(file);
      setDropInfo({ label: `${file.name} → Import proiect JSON`, type: "success" });
      return;
    }
    if (type === "drawing") {
      // TODO S3: planșă AI pentru detectare geometrie pereți
      showToast?.("Import planșă AI pentru anvelopă vine în S3", "info");
      setDropInfo({ label: `${file.name} → Analiză planșă (S3)`, type: "info" });
    }
  }, [onOpenIFC, onCSVImport, onOpenJSONImport, showToast]);

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

  // ── Shortcut-uri tastatură (D7) — scaffold activ, handler simplificat ──────
  // Nu conflict cu globals (Ctrl+1..8, Alt+←→, Ctrl+S, Ctrl+Z/Y, Esc, Ctrl+M/D, F1).
  useEffect(() => {
    const onKey = (e) => {
      // Skip dacă cursor în input/textarea/contenteditable
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      switch (e.key.toLowerCase()) {
        case "n": setEditingOpaque?.(null); setShowOpaqueModal?.(true); break;
        case "g": setEditingGlazing?.(null); setShowGlazingModal?.(true); break;
        case "b": setEditingBridge?.(null); setShowBridgeModal?.(true); break;
        case "i": setActiveRamp("instant"); break;
        case "f": setActiveRamp("file"); break;
        case "h": setActiveRamp("guided"); break;
        default: return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setEditingOpaque, setShowOpaqueModal, setEditingGlazing, setShowGlazingModal, setEditingBridge, setShowBridgeModal]);

  // ── Hint contextual (next-best-action) ─────────────────────────────────────
  const contextHint = useMemo(() => {
    if (opaqueElements.length === 0 && glazingElements.length === 0 && thermalBridges.length === 0) {
      return { icon: "💡", text: "Începe cu un demo de anvelopă sau un șablon — RampInstant (amber).", action: "instant" };
    }
    if (opaqueElements.length >= 3 && thermalBridges.length === 0) {
      return { icon: "🔗", text: "Ai 3+ pereți — poți aplica pachetul standard de 5 punți termice.", action: "bridges" };
    }
    if (opaqueElements.length > 0 && progress.pct < 50) {
      return { icon: "🧭", text: "Câmpuri importante lipsesc — deschide wizard-ul ghidat pentru completare asistată.", action: "guided" };
    }
    return null;
  }, [opaqueElements.length, glazingElements.length, thermalBridges.length, progress.pct]);

  const handleHintAction = useCallback(() => {
    if (!contextHint) return;
    if (contextHint.action === "instant")  setActiveRamp("instant");
    else if (contextHint.action === "bridges") applyStandardBridgesPack?.();
    else if (contextHint.action === "guided")  setActiveRamp("guided");
  }, [contextHint, applyStandardBridgesPack]);

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🏗️</span>
            <span className="font-semibold text-sm text-white">Anvelopă termică</span>
            <span className="text-[10px] text-slate-500 ml-1 hidden sm:inline">
              completează rapid sau importă
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Step 2: <span className={
                progress.pct >= 80 ? "text-green-400 font-semibold"
                : progress.pct >= 50 ? "text-amber-400 font-semibold"
                : "text-slate-300 font-semibold"
              }>{progress.filled}/{progress.total}</span>
            </span>
            <ProgressBar pct={progress.pct} />
          </div>
        </div>
      </div>

      {/* ── Warning D1: auto-generate punți este estimare orientativă ────── */}
      <div className="mx-4 mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 flex items-start gap-3">
        <span className="text-xl shrink-0" aria-hidden="true">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-amber-200 text-xs mb-0.5">
            Estimare orientativă
          </div>
          <p className="text-[11px] text-amber-100/70 leading-snug">
            Valorile auto-generate (pachete punți, profile standard, geometrii dedusa din IFC/gbXML)
            sunt aproximări. Verifică cu proiectul tehnic sau un auditor acreditat înainte de a folosi
            în CPE final.
          </p>
        </div>
      </div>

      {/* ── Drop zone universal ──────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-3">
        <input
          ref={browseFileRef}
          type="file"
          accept=".ifc,.gbxml,.xml,.csv,.txt,.json,image/jpeg,image/png,image/webp,application/pdf"
          onChange={e => { const f = e.target.files?.[0]; if (f) routeFile(f); e.target.value = ""; }}
          className="hidden"
        />
        <div
          role="region"
          aria-label="Zonă drag și drop fișiere anvelopă"
          aria-describedby="env-drop-zone-filetypes"
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
              <div className="text-xs font-medium text-slate-300">Trage fișier anvelopă aici</div>
              <div id="env-drop-zone-filetypes" className="text-[10px] text-slate-500">
                <span className="text-emerald-400/70" title="Momentan suportă doar gbXML. Import IFC complet în roadmap Pro.">
                  .ifc / .gbxml
                </span> ·{" "}
                <span className="text-slate-400/70">.csv pereți</span> ·{" "}
                <span className="text-sky-400/70">.json proiect</span>
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
            <div className={`mt-2 text-[10px] font-medium ${
              dropInfo.type === "success" ? "text-green-400" : "text-sky-400"
            }`}>
              {dropInfo.type === "success" ? "✓" : "ℹ"} {dropInfo.label}
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
              className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 underline decoration-dotted underline-offset-2"
            >
              acționează →
            </button>
          </div>
        )}
      </div>

      {/* ── 3 cartele rampă ──────────────────────────────────────────────── */}
      <div role="tablist" aria-label="Metode de completare anvelopă" className="px-4 pb-3 flex flex-col sm:flex-row gap-2">
        <RampCard
          id="instant"
          icon="⚡"
          title="Instant"
          subtitle="Șabloane, demo, pachet 5 punți — completare rapidă"
          accent="amber"
          active={activeRamp === "instant"}
          onToggle={() => toggleRamp("instant")}
          shortcut="I"
        />
        <RampCard
          id="file"
          icon="📁"
          title="Din fișier"
          subtitle="IFC, gbXML, CSV pereți — import din BIM/CAD"
          accent="sky"
          active={activeRamp === "file"}
          onToggle={() => toggleRamp("file")}
          shortcut="F"
        />
        <RampCard
          id="guided"
          icon="🧭"
          title="Ghidat"
          subtitle="Wizard 3 pași + chat AI — pas cu pas"
          accent="violet"
          active={activeRamp === "guided"}
          onToggle={() => toggleRamp("guided")}
          shortcut="H"
        />
      </div>

      {/* ── Panouri expandate ────────────────────────────────────────────── */}
      {activeRamp === "instant" && (
        <div
          role="tabpanel"
          id="env-ramp-panel-instant"
          aria-labelledby="env-ramp-tab-instant"
          className="px-4 pb-4 border-t border-white/[0.06] pt-3"
        >
          <RampInstant
            building={building}
            opaqueElements={opaqueElements}
            glazingElements={glazingElements}
            thermalBridges={thermalBridges}
            loadDemoByIndex={loadDemoByIndex}
            applyStandardBridgesPack={applyStandardBridgesPack}
            setEditingOpaque={setEditingOpaque}
            setShowOpaqueModal={setShowOpaqueModal}
            setEditingGlazing={setEditingGlazing}
            setShowGlazingModal={setShowGlazingModal}
            setShowBridgeCatalog={setShowBridgeCatalog}
            showToast={showToast}
          />
        </div>
      )}

      {activeRamp === "file" && (
        <div
          role="tabpanel"
          id="env-ramp-panel-file"
          aria-labelledby="env-ramp-tab-file"
          className="px-4 pb-4 border-t border-white/[0.06] pt-3"
        >
          <RampFile
            building={building}
            onOpenIFC={onOpenIFC}
            onGbxmlImport={onGbxmlImport}
            onCSVImport={onCSVImport}
            onOpenJSONImport={onOpenJSONImport}
            showToast={showToast}
          />
        </div>
      )}

      {activeRamp === "guided" && (
        <div
          role="tabpanel"
          id="env-ramp-panel-guided"
          aria-labelledby="env-ramp-tab-guided"
          className="px-4 pb-4 border-t border-white/[0.06] pt-3"
        >
          <RampGuided
            building={building}
            opaqueElements={opaqueElements}
            glazingElements={glazingElements}
            thermalBridges={thermalBridges}
            onOpenWizard={onOpenWizard}
            onOpenChat={onOpenChat}
            setEditingOpaque={setEditingOpaque}
            setShowOpaqueModal={setShowOpaqueModal}
            showToast={showToast}
          />
        </div>
      )}

      {/* ── Progress tracker detaliat (ce lipsește din 10 gate-uri) ──────── */}
      <div className="px-4 pb-3">
        <GateList
          gates={progress.gates}
          expanded={gatesExpanded}
          onToggle={() => setGatesExpanded(v => !v)}
        />
      </div>

      {/* ── Mini-chart pierderi (dacă există date) ───────────────────────── */}
      {envelopeSummary && envelopeSummary.totalHeatLoss > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">
            Distribuție pierderi
          </div>
          <EnvelopeLossChart
            opaqueElements={opaqueElements}
            glazingElements={glazingElements}
            envelopeSummary={envelopeSummary}
            calcOpaqueR={calcOpaqueR}
            ELEMENT_TYPES={ELEMENT_TYPES}
            lang={lang}
            t={t}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
