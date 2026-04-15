// ═══════════════════════════════════════════════════════════════════════════
// REGISTRU DE EVIDENȚĂ — PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────
// Afișează preview-ul Registrului de Evidență (Anexa 6, Ord. MDLPA 348/2026)
// și permite descărcarea fișierului .xlsx pentru depunere la MDLPA.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Card, Badge, cn } from "./ui.jsx";
import {
  exportRegistruEvidenta,
  projectToAnexa6Row,
  validateAnexa6Row,
} from "../lib/registru-evidenta-export.js";

// Încarcă proiecte din localStorage (suport pentru ambele scheme de chei)
function loadProjectsFromStorage() {
  if (typeof window === "undefined") return [];
  const results = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      !key.startsWith("zephren_project_") &&
      !key.startsWith("project_") &&
      !key.startsWith("ep-proj:")
    ) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      results.push({ ...data, _storageKey: key });
    } catch (_) { /* ignoră proiectele corupte */ }
  }
  return results;
}

export default function RegistruEvidentaPanel({
  projects: projectsProp,
  auditor = {},
  onExportComplete,
}) {
  const [downloading, setDownloading] = useState(false);
  const [lastExportDate, setLastExportDate] = useState(null);

  // Sursă proiecte: prop sau localStorage
  const projects = useMemo(() => {
    if (projectsProp && projectsProp.length > 0) return projectsProp;
    return loadProjectsFromStorage();
  }, [projectsProp]);

  // Transformă toate proiectele în rânduri Anexa 6 + validare
  const rows = useMemo(() => {
    return projects.map((p) => {
      const row = projectToAnexa6Row(p, auditor);
      const missing = validateAnexa6Row(row);
      return { row, missing, project: p };
    });
  }, [projects, auditor]);

  const hasWarnings = rows.some((r) => r.missing.length > 0);

  async function handleDownload() {
    if (projects.length === 0) {
      alert("Nu există CPE-uri înregistrate în proiectele tale.");
      return;
    }
    setDownloading(true);
    try {
      exportRegistruEvidenta(projects, auditor, { download: true });
      const now = new Date();
      setLastExportDate(now);
      if (onExportComplete) onExportComplete(now);
    } catch (err) {
      alert("Eroare la generarea Registrului: " + err.message);
      console.error("[RegistruEvidenta] export error:", err);
    } finally {
      setDownloading(false);
    }
  }

  const validCount = rows.filter((r) => r.missing.length === 0).length;
  const incompleteCount = rows.length - validCount;

  return (
    <div className="space-y-4">
      {/* Header informativ */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0" aria-hidden="true">📋</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-amber-300 mb-1">
              Registru de Evidență — Anexa 6, Ord. MDLPA 348/2026
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Acest registru se depune la MDLPA pentru prelungirea dreptului
              de practică (art. 31 alin. 2 lit. c). Formatul .xlsx respectă
              exact structura oficială publicată în MO nr. 292/14.04.2026.
            </p>
          </div>
        </div>
      </div>

      {/* Statistici rapide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="CPE-uri înregistrate"
          value={rows.length}
          color="text-white"
        />
        <StatCard
          label="Complete"
          value={validCount}
          color="text-emerald-400"
        />
        <StatCard
          label="Incomplete"
          value={incompleteCount}
          color={incompleteCount > 0 ? "text-amber-400" : "text-white/40"}
        />
        <StatCard
          label="Ultima descărcare"
          value={lastExportDate
            ? lastExportDate.toLocaleDateString("ro-RO", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })
            : "—"}
          color="text-sky-400"
          small
        />
      </div>

      {/* Avertismente */}
      {hasWarnings && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <strong>⚠️ Atenție:</strong> {incompleteCount} CPE
          {incompleteCount === 1 ? " are câmpuri obligatorii lipsă" : " au câmpuri obligatorii lipsă"}.
          Verifică rândurile marcate mai jos înainte de depunerea la MDLPA.
        </div>
      )}

      {/* Preview tabel */}
      <Card title="Preview — Coloane Anexa 6">
        {rows.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">
            Nu există proiecte înregistrate în localStorage.<br />
            <span className="text-xs opacity-60">Salvează un proiect pentru a vedea preview-ul registrului.</span>
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Nr.</th>
                  <th className="text-left py-2 px-2 font-semibold text-white/70 whitespace-nowrap">CPE / Data</th>
                  <th className="text-left py-2 px-2 font-semibold text-white/70">Adresa</th>
                  <th className="text-left py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Categorie</th>
                  <th className="text-right py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Au (m²)</th>
                  <th className="text-right py-2 px-2 font-semibold text-white/70 whitespace-nowrap">EP (kWh/m²)</th>
                  <th className="text-center py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Clasa E</th>
                  <th className="text-center py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Clasa CO₂</th>
                  <th className="text-center py-2 px-2 font-semibold text-white/70 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ row, missing }, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/[0.03] transition-colors",
                      missing.length > 0 ? "bg-amber-500/[0.03]" : ""
                    )}
                  >
                    <td className="py-2 px-2 text-white/40 font-mono">{i + 1}</td>
                    <td className="py-2 px-2 text-white/80 font-mono text-[11px] whitespace-nowrap">
                      {row.cpeNrData || <span className="text-amber-400/60">— lipsă —</span>}
                    </td>
                    <td className="py-2 px-2 text-white/80 max-w-[220px] truncate" title={row.address}>
                      {row.address || <span className="text-amber-400/60">— lipsă —</span>}
                    </td>
                    <td className="py-2 px-2 text-white/60 whitespace-nowrap">
                      {row.catTip}
                      {row.catSubtip && <span className="text-white/40"> / {row.catSubtip}</span>}
                    </td>
                    <td className="py-2 px-2 text-white/80 text-right font-mono">
                      {row.areaUseful || "—"}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-amber-300">
                      {row.epPrimary || "—"}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {row.energyClass
                        ? <Badge color={classColor(row.energyClass)}>{row.energyClass}</Badge>
                        : <span className="text-amber-400/60 text-[10px]">—</span>}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {row.emissionClass
                        ? <Badge color={classColor(row.emissionClass)}>{row.emissionClass}</Badge>
                        : <span className="text-amber-400/60 text-[10px]">—</span>}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {missing.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OK
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-400 text-[10px] cursor-help"
                          title={"Lipsesc: " + missing.join(", ")}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {missing.length} lipsă
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Buton export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-white/50">
          {auditor?.name ? (
            <span>Auditor: <strong className="text-white/80">{auditor.name}</strong>
              {auditor.atestat && <span className="text-white/40"> · Atestat: {auditor.atestat}</span>}
            </span>
          ) : (
            <span className="text-amber-400/80">⚠ Completează datele auditorului în Pasul 7 înainte de export.</span>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {downloading ? (
            <span className="w-4 h-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {downloading ? "Se generează…" : "Descarcă Registru (.xlsx)"}
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE HELPER ────────────────────────────────────────────────
function StatCard({ label, value, color = "text-white", small = false }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className={cn(small ? "text-sm font-semibold" : "text-2xl font-bold", color)}>
        {value}
      </div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

function classColor(cls) {
  if (!cls) return "amber";
  const c = cls.trim();
  if (c === "A+" || c === "A") return "green";
  if (c === "B" || c === "C") return "amber";
  return "red";
}
