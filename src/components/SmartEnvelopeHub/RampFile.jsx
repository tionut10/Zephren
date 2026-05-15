/**
 * RampFile (anvelopă) — COMPLETARE S3 (14.04.2026).
 *
 * 8 tipuri de import din fișier:
 *   1. IFC / gbXML       — reutilizează IFCImport existent (parser gbXML)
 *   2. CSV pereți        — template dedicat (name, type, area, orientation, layers?)
 *   3. CSV vitraje       — NOU în S3, template dedicat (name, area, u, g, orientation, frame)
 *   4. CSV punți         — NOU în S3, template dedicat (name, cat, psi, length)
 *   5. Excel .xlsx       — stub cu mesaj de ghidaj (S4: parser openpyxl serverless)
 *   6. Planșă PDF/img AI — stub cu mesaj (S4: OCR + detect pereți)
 *   7. Catalog producător — stub cu mesaj (S4: parser PDF materiale)
 *   8. Proiect complet .json — reutilizează importProject existent
 *
 * Decizie UX: template downloader pentru fiecare CSV (user click → descarcă .csv gol).
 */

import { useRef, useCallback } from "react";

// ── Acțiune activă ────────────────────────────────────────────────────────
function ActiveAction({ icon, title, description, tooltip, onClick, secondary }) {
  return (
    <div
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-sky-500/25 bg-sky-500/[0.04] hover:bg-sky-500/10 text-sky-200 transition-all group focus-within:ring-2 focus-within:ring-sky-400/60"
    >
      <span className="text-xl shrink-0" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      {secondary}
      <button
        onClick={onClick}
        title={tooltip}
        className="opacity-70 group-hover:opacity-100 text-xs px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      >
        Import →
      </button>
    </div>
  );
}

// ── Placeholder (S4) ──────────────────────────────────────────────────────
function PlaceholderAction({ icon, title, description, sessionTag = "S4" }) {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-sky-500/15 bg-sky-500/[0.015] text-left opacity-55 cursor-not-allowed">
      <span className="text-xl shrink-0" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-sky-200/80 flex items-center gap-2">
          {title}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300/80 font-normal">
            {sessionTag}
          </span>
        </div>
        <div className="text-[10px] text-sky-100/50 mt-0.5 leading-snug">{description}</div>
      </div>
      <span className="text-sky-300/40 text-xs shrink-0">🔒</span>
    </div>
  );
}

// ── Generatori templates CSV (descărcare directă) ─────────────────────────
const TEMPLATE_OPAQUE = [
  "categorie,denumire,tip,suprafata,orientare,u,strat_material,strat_grosime_mm,strat_lambda",
  "opaque,Perete S izolat,PE,45,S,0.28,Zidărie + EPS 12 cm,300,0.12",
  "opaque,Terasă,PT,82,Orizontal,0.20,Vată minerală 20 cm,200,0.035",
].join("\n");

const TEMPLATE_GLAZING = [
  "categorie,denumire,tip_vitraj,suprafata,orientare,u,g,frame_ratio",
  "glazing,Fereastră S,Dublu vitraj Low-E,8.5,S,1.10,0.50,25",
  "glazing,Ușă balcon E,Triplu vitraj Low-E,2.1,E,0.90,0.45,35",
].join("\n");

const TEMPLATE_BRIDGES = [
  "categorie,denumire,tip,psi,lungime",
  "bridge,Joncțiune perete-terasă,PE-PT,0.35,45",
  "bridge,Colț vertical exterior,CV,0.10,40",
  "bridge,Glaf fereastră,GF,0.10,24",
].join("\n");

function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Parser CSV specific glazing (S3 — fără a modifica importCSV clasic) ──
function parseGlazingCSV(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { ok: false, reason: "CSV gol sau fără header." };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const nameI   = idx(["denumire", "name"]);
  const typeI   = idx(["tip_vitraj", "type", "tip"]);
  const areaI   = idx(["suprafata", "area"]);
  const orientI = idx(["orientare", "orientation"]);
  const uI      = idx(["u"]);
  const gI      = idx(["g"]);
  const frameI  = idx(["frame_ratio", "frameratio", "frame"]);
  if (nameI < 0 || areaI < 0 || uI < 0) {
    return { ok: false, reason: "Lipsesc coloanele: denumire, suprafata sau u." };
  }
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const area = parseFloat(cols[areaI]);
    const u = parseFloat(cols[uI]);
    if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(u) || u <= 0) continue;
    out.push({
      name: cols[nameI] || `Vitraj ${i}`,
      glazingType: typeI >= 0 ? (cols[typeI] || "Dublu vitraj termoizolant") : "Dublu vitraj termoizolant",
      area: area.toFixed(2),
      orientation: orientI >= 0 ? (cols[orientI] || "S") : "S",
      u: u.toFixed(2),
      g: gI >= 0 ? (parseFloat(cols[gI]) || 0.50).toFixed(2) : "0.50",
      frameRatio: frameI >= 0 ? (cols[frameI] || "25") : "25",
      frameType: "PVC (5 camere)",
    });
  }
  return { ok: true, rows: out };
}

// ── Parser CSV specific punți termice ────────────────────────────────────
function parseBridgesCSV(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { ok: false, reason: "CSV gol sau fără header." };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const idx = (names) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const nameI = idx(["denumire", "name"]);
  const typeI = idx(["tip", "type", "cat"]);
  const psiI  = idx(["psi", "ψ"]);
  const lenI  = idx(["lungime", "length"]);
  if (nameI < 0 || psiI < 0 || lenI < 0) {
    return { ok: false, reason: "Lipsesc coloanele: denumire, psi sau lungime." };
  }
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const psi = parseFloat(cols[psiI]);
    const len = parseFloat(cols[lenI]);
    if (!Number.isFinite(psi) || !Number.isFinite(len) || len <= 0) continue;
    out.push({
      name: cols[nameI] || `Punte ${i}`,
      type: typeI >= 0 ? (cols[typeI] || "GEN") : "GEN",
      cat:  typeI >= 0 ? (cols[typeI] || "Generic") : "Generic",
      psi:  psi.toFixed(3),
      length: len.toFixed(2),
    });
  }
  return { ok: true, rows: out };
}

export default function RampFile({
  building,
  onOpenIFC,
  onCSVImport,
  onOpenJSONImport,
  // NEW S3:
  setGlazingElements,
  setThermalBridges,
  showToast,
  // Sprint Pas 2 AI-First (16 mai 2026):
  onPickAIFile,                  // (file, hint="facade"|"drawing") → orchestrator
}) {
  const csvOpaqueRef   = useRef(null);
  const csvGlazingRef  = useRef(null);
  const csvBridgesRef  = useRef(null);
  const jsonRef        = useRef(null);
  const aiImageRef     = useRef(null);  // NEW: input pentru AI planșă
  const aiCatalogRef   = useRef(null);  // NEW: input pentru AI catalog producător (S6)

  const handleGlazingFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { ok, rows, reason } = parseGlazingCSV(e.target.result);
      if (!ok) { showToast?.("Eroare CSV vitraje: " + reason, "error"); return; }
      if (rows.length === 0) { showToast?.("Nu am găsit vitraje valide în CSV", "error"); return; }
      setGlazingElements?.(prev => [...(prev || []), ...rows]);
      showToast?.(`Importate ${rows.length} vitraje din CSV`, "success", 4000);
    };
    reader.readAsText(file);
  }, [setGlazingElements, showToast]);

  const handleBridgesFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { ok, rows, reason } = parseBridgesCSV(e.target.result);
      if (!ok) { showToast?.("Eroare CSV punți: " + reason, "error"); return; }
      if (rows.length === 0) { showToast?.("Nu am găsit punți valide în CSV", "error"); return; }
      setThermalBridges?.(prev => [...(prev || []), ...rows]);
      showToast?.(`Importate ${rows.length} punți termice din CSV`, "success", 4000);
    };
    reader.readAsText(file);
  }, [setThermalBridges, showToast]);

  const handleJsonFile = useCallback((file) => {
    if (!file) return;
    onOpenJSONImport?.(file);
  }, [onOpenJSONImport]);

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-sky-200/70 mb-2">
        📁 Import din fișiere — AI primul, determinist dupa.
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 🤖 SECȚIUNEA AI — Sprint Pas 2 AI-First (16 mai 2026)            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="text-[10px] uppercase tracking-widest text-violet-300/80 font-semibold pt-1">
        🤖 Cu AI (extragere automată)
      </div>

      {/* ─── 4F. Planșă PDF / imagine (AI) — ACTIVAT ───────────────────── */}
      <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/[0.05] hover:bg-violet-500/10 transition-all group">
        <span className="text-xl shrink-0" aria-hidden="true">🖼️</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-violet-200 flex items-center gap-2">
            Planșă PDF / fotografie (AI)
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-normal">NEW</span>
          </div>
          <div className="text-[10px] text-violet-100/60 mt-0.5 leading-snug">
            AI detectează pereți, vitraje, dimensiuni din plan arhitectural sau foto fațadă. Review manual înainte de import.
          </div>
        </div>
        <button
          onClick={() => aiImageRef.current?.click()}
          disabled={!onPickAIFile}
          className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Încarcă →
        </button>
      </div>
      <input
        ref={aiImageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const isImage = (f.type || "").startsWith("image/");
            onPickAIFile?.(f, isImage ? "facade" : "drawing");
          }
          e.target.value = "";
        }}
      />

      {/* ─── 4G. Catalog producător PDF — placeholder S6 (out-of-scope) ─ */}
      <PlaceholderAction
        icon="📑"
        title="Catalog producător (fișe PDF)"
        description="Import materiale și coeficienți U direct din fișe tehnice producător → bibliotecă materiale separată."
        sessionTag="S6"
      />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 📊 SECȚIUNEA DETERMINIST                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="text-[10px] uppercase tracking-widest text-sky-300/70 font-semibold pt-3 border-t border-white/[0.06] mt-2">
        📊 Determinist (fără AI, parser nativ)
      </div>

      {/* ─── 1. IFC / gbXML (funcțional) ──────────────────────────────── */}
      <ActiveAction
        icon="🏢"
        title="IFC / gbXML"
        description="Import din BIM — extrage pereți, ferestre, zone. Momentan doar gbXML (parser IFC complet în roadmap Pro)."
        tooltip="Momentan suportă doar gbXML. Import IFC complet în roadmap Pro."
        onClick={() => onOpenIFC?.()}
      />

      {/* ─── 2. CSV pereți (funcțional din S2) ────────────────────────── */}
      <ActiveAction
        icon="📊"
        title="CSV pereți"
        description="Coloane: categorie, denumire, tip (PE/PT/PP/PL/PB), suprafata, orientare, u, strat_material, strat_grosime_mm, strat_lambda."
        onClick={() => csvOpaqueRef.current?.click()}
        secondary={
          <button
            onClick={() => downloadCSV("template-pereti.csv", TEMPLATE_OPAQUE)}
            className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Descarcă template CSV pentru pereți"
          >
            ⬇ Template
          </button>
        }
      />
      <input
        ref={csvOpaqueRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onCSVImport?.(e); e.target.value = ""; }}
      />

      {/* ─── 3. CSV vitraje (NOU S3) ──────────────────────────────────── */}
      <ActiveAction
        icon="🪟"
        title="CSV vitraje"
        description="Coloane: denumire, tip_vitraj, suprafata, orientare, u, g, frame_ratio. Append la lista existentă."
        onClick={() => csvGlazingRef.current?.click()}
        secondary={
          <button
            onClick={() => downloadCSV("template-vitraje.csv", TEMPLATE_GLAZING)}
            className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Descarcă template CSV pentru vitraje"
          >
            ⬇ Template
          </button>
        }
      />
      <input
        ref={csvGlazingRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleGlazingFile(f); e.target.value = ""; }}
      />

      {/* ─── 4. CSV punți (NOU S3) ─────────────────────────────────────── */}
      <ActiveAction
        icon="🔗"
        title="CSV punți termice"
        description="Coloane: denumire, tip, psi, lungime. Append la lista existentă."
        onClick={() => csvBridgesRef.current?.click()}
        secondary={
          <button
            onClick={() => downloadCSV("template-punti.csv", TEMPLATE_BRIDGES)}
            className="text-[9px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Descarcă template CSV pentru punți"
          >
            ⬇ Template
          </button>
        }
      />
      <input
        ref={csvBridgesRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleBridgesFile(f); e.target.value = ""; }}
      />

      {/* ─── 5. Proiect complet .json ─────────────────────────────────── */}
      {onOpenJSONImport && (
        <>
          <ActiveAction
            icon="📦"
            title="Proiect complet (.json)"
            description="Import proiect Zephren întreg — înlocuiește Step 1 + 2 + 3 + instalații + regenerabile + auditor."
            onClick={() => jsonRef.current?.click()}
          />
          <input
            ref={jsonRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleJsonFile(f); e.target.value = ""; }}
          />
        </>
      )}

      {/* ─── 4E. Excel xlsx (placeholder S6) ──────────────────────────── */}
      <PlaceholderAction
        icon="📗"
        title="Excel .xlsx multi-sheet"
        description="Un singur fișier cu 3 sheet-uri: Pereți / Vitraje / Punți. Parser openpyxl serverless."
        sessionTag="S6"
      />
    </div>
  );
}
