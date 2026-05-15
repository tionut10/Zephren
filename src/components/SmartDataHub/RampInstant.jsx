/**
 * RampInstant — metode de completare instantanee (fără upload, fără tastare extinsă).
 *
 * Conținut:
 *   ├─ Șabloane clădiri tip românești (5 modele · Zone I-V) — buton ce deschide modal
 *   ├─ Demo proiecte — listă mostre exemplu expandabilă (DEMO_PROJECTS)
 *   ├─ Geocodare adresă OSM (Nominatim) — one click
 *   ├─ Căutare număr cadastral (ANCPI via OSM) — input + lookup
 *   └─ Descărcare climat Open-Meteo ERA5 — one click (dacă localitate setată)
 *
 * Toate acțiunile sunt non-destructive — completează doar câmpuri goale sau
 * afișează un modal de confirmare înainte de a suprascrie.
 */
import { useState, lazy, Suspense } from "react";
import { DEMO_PROJECTS } from "../../data/demoProjects.js";
// Sprint Smart Input 2026 (1.5) — proiecte recente
import { useRecentProjects } from "../../hooks/useRecentProjects.js";

const BuildingTemplateModal = lazy(() => import("../BuildingTemplateModal.jsx"));

function ActionButton({ icon, title, description, accent = "sky", onClick, disabled, loading, badge }) {
  const accentMap = {
    amber:   "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300",
    sky:     "border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-300",
    emerald: "border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300",
    violet:  "border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300",
    slate:   "border-slate-500/25 bg-slate-500/5 hover:bg-slate-500/10 text-slate-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed group ${accentMap[accent]}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold group-hover:brightness-110 flex items-center gap-2">
          {title}
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-normal">{badge}</span>}
        </div>
        <div className="text-[10px] opacity-60 mt-0.5 leading-snug">{description}</div>
      </div>
      {loading
        ? <span className="w-4 h-4 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
        : <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>}
    </button>
  );
}

export default function RampInstant({
  building,
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
  // Sprint Smart Input 2026 (1.5) — proiecte recente
  onDuplicateRecent,
  currentProjectId,
  showToast,
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const hasAddress = !!(building.address || building.city);

  // Sprint Smart Input 2026 (1.5) — citește top 3 proiecte recente din IndexedDB
  const { projects: recentProjects, loading: loadingRecent } = useRecentProjects({
    limit: 3,
    excludeId: currentProjectId,
  });

  return (
    <div className="space-y-2">

      {/* ── Sprint 1.5 — Duplică din proiectele recente (top 3) ──────────── */}
      {onDuplicateRecent && !loadingRecent && recentProjects.length > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] overflow-hidden">
          <div className="px-3 py-2 border-b border-emerald-500/15 flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-emerald-200">
                Duplică din proiectele recente
                <span className="ml-2 text-[9px] font-normal text-emerald-400/70 uppercase tracking-wide">
                  cel mai rapid pentru bloc-uri similare
                </span>
              </div>
              <div className="text-[10px] text-emerald-300/60 mt-0.5">
                Cele mai recente {recentProjects.length} proiecte salvate
              </div>
            </div>
          </div>
          <div className="px-2 py-2 space-y-1">
            {recentProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onDuplicateRecent(p.raw);
                  showToast?.(`Duplicat: ${p.summary.title}`, "success");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all text-left group"
                aria-label={`Duplică proiectul ${p.summary.title}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-emerald-100 truncate group-hover:text-emerald-50">
                    {p.summary.title}
                  </div>
                  <div className="text-[10px] text-emerald-300/60 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>{p.summary.categoryLabel}</span>
                    <span className="opacity-50">·</span>
                    <span>{p.summary.fieldsCount} câmpuri</span>
                    <span className="opacity-50">·</span>
                    <span className="font-mono text-emerald-400/60">{p.savedAtShort}</span>
                  </div>
                </div>
                <span className="opacity-40 group-hover:opacity-80 text-xs shrink-0 transition-opacity">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Șabloane clădiri tip românești ──────────────────────────────────── */}
      <ActionButton
        icon="🏛️"
        title="Șabloane clădiri tip românești"
        description="5 modele predefinite (zone climatice I-V: apartament, birouri nZEB, casă, școală, pensiune) — completare automată toate câmpurile"
        accent="amber"
        onClick={() => setShowTemplates(true)}
        badge="Recomandat"
      />

      {/* ── Demo proiecte (mostre exemplu) ──────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] overflow-hidden">
        <button
          onClick={() => setShowDemo(s => !s)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-emerald-500/[0.06] group"
        >
          <span className="text-xl shrink-0">🎓</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-300 group-hover:brightness-110 flex items-center gap-2">
              Mostre exemplu (proiecte demo)
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-normal">
                {DEMO_PROJECTS.length} disponibile
              </span>
            </div>
            <div className="text-[10px] text-emerald-300/60 mt-0.5">
              Proiecte pre-completate pentru învățare și testare rapidă
            </div>
          </div>
          <span className={`text-xs shrink-0 text-emerald-300/60 transition-transform ${showDemo ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showDemo && (
          <div className="border-t border-emerald-500/15 px-2 py-2 space-y-1 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {DEMO_PROJECTS.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => {
                  loadDemoByIndex?.(idx);
                  showToast?.(`Mostră aplicată: ${d.title}`, "success");
                  setShowDemo(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all text-xs"
              >
                <div className="font-semibold text-emerald-200 leading-snug">{d.title}</div>
                <div className="text-[10px] text-emerald-300/50 mt-0.5 leading-snug">{d.shortDesc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Geocodare adresă OSM ─────────────────────────────────────────────── */}
      <ActionButton
        icon="🗺️"
        title="Completare din adresă (OSM)"
        description={hasAddress
          ? "Detectează județul, codul poștal și amprenta clădirii din OpenStreetMap"
          : "⚠ Scrie mai întâi adresa sau localitatea în formularul de mai jos"}
        accent="sky"
        onClick={onGeocode}
        disabled={!hasAddress || geoStatus === "loading"}
        loading={geoStatus === "loading"}
      />
      {geoStatus === "ok" && (
        <div className="text-[10px] text-green-400 px-1">✓ Geocodare reușită</div>
      )}
      {geoStatus === "error" && (
        <div className="text-[10px] text-red-400 px-1">✗ Adresa nu a fost găsită — verificați strada și localitatea</div>
      )}

      {/* ── ANCPI Cadastru ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          <div className="flex-1">
            <div className="text-xs font-semibold text-violet-300">Număr cadastral ANCPI</div>
            <div className="text-[10px] text-violet-300/60">Caută adresa după numărul cadastral</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={cadastralNr}
            onChange={e => onCadastralNrChange(e.target.value)}
            placeholder="ex: 12345"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={onCadastralLookup}
            disabled={!cadastralNr?.trim() || cadastralLoading}
            className="px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            {cadastralLoading
              ? <span className="w-3 h-3 rounded-full border border-violet-400 border-t-transparent animate-spin" />
              : "🔍"}
            Caută
          </button>
        </div>
        {cadastralMsg && (
          <div className={`text-[10px] px-1 ${cadastralMsg.startsWith("✓") ? "text-green-400" : "text-amber-400"}`}>
            {cadastralMsg}
          </div>
        )}
        {/* P0-3 (18 apr 2026) — banner date simulate când ANCPI_API_KEY lipsește */}
        {cadastralSimulated && !cadastralBannerDismissed && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
          >
            <span className="text-amber-400 text-sm leading-tight shrink-0" aria-hidden="true">⚠️</span>
            <div className="flex-1 text-[11px] text-amber-200/90 leading-snug">
              <strong className="font-semibold">Date cadastrale simulate</strong> — ANCPI_API_KEY neconfigurat în server.
              Verificați manual la{" "}
              <a
                href="https://geoportal.ancpi.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-100"
              >
                geoportal.ancpi.ro
              </a>
              {" "}sau introduceți datele manual în câmpurile de mai jos.
            </div>
            {typeof onCadastralBannerDismiss === "function" && (
              <button
                type="button"
                onClick={onCadastralBannerDismiss}
                aria-label="Închide avertismentul"
                className="text-amber-400/60 hover:text-amber-300 shrink-0 text-sm leading-none px-1"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>


      {/* ── Modal Șabloane ───────────────────────────────────────────────────── */}
      {showTemplates && (
        <Suspense fallback={null}>
          <BuildingTemplateModal
            isOpen={showTemplates}
            onClose={() => setShowTemplates(false)}
            onApply={(id) => {
              loadTypicalBuilding?.(id);
              showToast?.("Șablon aplicat cu succes", "success");
              setShowTemplates(false);
            }}
            userPlan={userPlan}
          />
        </Suspense>
      )}
    </div>
  );
}
