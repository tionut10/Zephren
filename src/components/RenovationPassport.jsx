/**
 * RenovationPassport — modal UI pentru pașaportul digital EPBD 2024/1275 Art. 12.
 * - Auto-save localStorage pe adresa clădirii (identificator local)
 * - Istoric versiuni cu motivație
 * - Export JSON + XML + DOCX + clipboard
 * - QR code pentru registru MDLPA viitor
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";
import {
  buildRenovationPassport,
  validatePassportShallow,
} from "../calc/renovation-passport.js";
import {
  exportPassportJSON,
  exportPassportXML,
  copyPassportToClipboard,
} from "../lib/passport-export.js";
import { generatePassportQR } from "../lib/qr-passport.js";
import { getRegistryStatus } from "../calc/mdlpa-registry.js";

const STORAGE_KEY_PREFIX = "zephren_passport_";

function loadPassportFromStorage(buildingId) {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + buildingId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePassportToStorage(buildingId, passport) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY_PREFIX + buildingId,
      JSON.stringify(passport)
    );
  } catch (e) {
    console.error("Salvare pașaport eșuată (localStorage plin?):", e);
  }
}

function archivePassportInStorage(buildingId, passport) {
  try {
    if (typeof localStorage === "undefined") return;
    const key = `${STORAGE_KEY_PREFIX}${buildingId}_archive_${passport.passportId}`;
    localStorage.setItem(key, JSON.stringify({ ...passport, status: "archived" }));
  } catch {
    /* ignore */
  }
}

function StatusPill({ status }) {
  const map = {
    draft: { bg: "bg-amber-500/15", txt: "text-amber-300", lbl: "Draft" },
    active: { bg: "bg-green-500/15", txt: "text-green-300", lbl: "Activ" },
    updated: { bg: "bg-blue-500/15", txt: "text-blue-300", lbl: "Actualizat" },
    archived: { bg: "bg-slate-500/15", txt: "text-slate-300", lbl: "Arhivat" },
  };
  const s = map[status] || map.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-white/10",
        s.bg,
        s.txt
      )}
    >
      {s.lbl}
    </span>
  );
}

function KV({ k, v, mono = false, color }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/40">{k}</span>
      <span
        className={cn(
          "text-right",
          mono && "font-mono tabular-nums",
          color || "text-white/85"
        )}
      >
        {v}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

export default function RenovationPassport({
  building = {},
  instSummary = {},
  renewSummary = {},
  climate = {},
  auditor = {},
  phasedPlan = null,
  mepsStatus = null,
  financialSummary = null,
  fundingEligible = null,
  onClose,
  onPassportChange,  // Sprint 17: notifică parentul când UUID-ul se schimbă
}) {
  const buildingId = useMemo(
    () => (building?.address || "default").replace(/\s+/g, "_").slice(0, 100),
    [building?.address]
  );

  const [passport, setPassport] = useState(() => {
    const existing = loadPassportFromStorage(buildingId);
    if (existing && existing.passportId) {
      return buildRenovationPassport({
        building,
        instSummary,
        renewSummary,
        climate,
        auditor,
        phasedPlan,
        mepsStatus,
        financialSummary,
        fundingEligible,
        existingPassportId: existing.passportId,
        existingHistory: existing.history || [],
        existingTimestamp: existing.timestamp,
        changeReason: "Regenerare din context curent",
        changedBy: auditor?.name,
      });
    }
    return buildRenovationPassport({
      building,
      instSummary,
      renewSummary,
      climate,
      auditor,
      phasedPlan,
      mepsStatus,
      financialSummary,
      fundingEligible,
    });
  });

  const [qrDataURL, setQrDataURL] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");
  const [exportMsg, setExportMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-save la fiecare modificare + notify parent (Sprint 17 — integrare CPE/raport audit)
  useEffect(() => {
    savePassportToStorage(buildingId, passport);
    if (typeof onPassportChange === "function") {
      onPassportChange({
        passportId: passport.passportId,
        timestamp: passport.timestamp,
        url: `https://zephren.ro/passport/${passport.passportId}`,
      });
    }
  }, [buildingId, passport, onPassportChange]);

  // Generate QR pe passportId
  useEffect(() => {
    let cancelled = false;
    generatePassportQR(passport.passportId, { size: 160 })
      .then((r) => {
        if (!cancelled) setQrDataURL(r.dataURL);
      })
      .catch(() => {
        if (!cancelled) setQrDataURL(null);
      });
    return () => {
      cancelled = true;
    };
  }, [passport.passportId]);

  const validation = useMemo(() => validatePassportShallow(passport), [passport]);
  const regStatus = useMemo(() => getRegistryStatus(), []);

  const handleUpdate = useCallback(() => {
    const reason = changeReason.trim() || "Actualizare pașaport";
    const updated = buildRenovationPassport({
      building,
      instSummary,
      renewSummary,
      climate,
      auditor,
      phasedPlan,
      mepsStatus,
      financialSummary,
      fundingEligible,
      existingPassportId: passport.passportId,
      existingHistory: passport.history || [],
      existingTimestamp: passport.timestamp,
      changeReason: reason,
      changedBy: auditor?.name,
    });
    setPassport(updated);
    setChangeReason("");
  }, [
    passport,
    changeReason,
    building,
    instSummary,
    renewSummary,
    climate,
    auditor,
    phasedPlan,
    mepsStatus,
    financialSummary,
    fundingEligible,
  ]);

  const handleNewPassport = useCallback(() => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "Creezi un pașaport NOU (UUID nou)? Versiunea curentă va fi păstrată ca arhivă."
          )
        : true;
    if (!confirmed) return;
    archivePassportInStorage(buildingId, passport);
    const fresh = buildRenovationPassport({
      building,
      instSummary,
      renewSummary,
      climate,
      auditor,
      phasedPlan,
      mepsStatus,
      financialSummary,
      fundingEligible,
    });
    setPassport(fresh);
  }, [
    buildingId,
    passport,
    building,
    instSummary,
    renewSummary,
    climate,
    auditor,
    phasedPlan,
    mepsStatus,
    financialSummary,
    fundingEligible,
  ]);

  const handleExportJSON = useCallback(() => {
    try {
      const { filename } = exportPassportJSON(passport);
      setExportMsg(`JSON descărcat: ${filename}`);
    } catch (e) {
      setExportMsg(`Eroare export JSON: ${e.message}`);
    }
  }, [passport]);

  const handleExportXML = useCallback(() => {
    try {
      const { filename } = exportPassportXML(passport);
      setExportMsg(`XML descărcat: ${filename}`);
    } catch (e) {
      setExportMsg(`Eroare export XML: ${e.message}`);
    }
  }, [passport]);

  const handleExportDOCX = useCallback(async () => {
    setBusy(true);
    try {
      const { exportPassportDOCX } = await import("../lib/passport-docx.js");
      const { filename } = await exportPassportDOCX(passport);
      setExportMsg(`DOCX descărcat: ${filename}`);
    } catch (e) {
      setExportMsg(`Eroare export DOCX: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, [passport]);

  const handleCopy = useCallback(() => {
    copyPassportToClipboard(passport)
      .then(() => {
        setCopyStatus("ok");
        setTimeout(() => setCopyStatus("idle"), 2000);
      })
      .catch(() => {
        setCopyStatus("error");
        setTimeout(() => setCopyStatus("idle"), 2500);
      });
  }, [passport]);

  const base = passport.baseline || {};
  const target = passport.targetState || {};
  const road = passport.roadmap || {};
  const fin = passport.financial || {};
  const bld = passport.building || {};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/10 gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white/90">
                Pașaport Renovare — EPBD 2024/1275 Art. 12
              </h2>
              <StatusPill status={passport.status} />
            </div>
            <p className="text-[11px] text-white/35 mt-0.5 font-mono break-all">
              ID: {passport.passportId}
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">
              Versiune schema {passport.version} · {passport.history?.length || 0} revizii · Transpus prin L.238/2024 (termen 29 mai 2026)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all flex items-center justify-center text-lg"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!validation.valid && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
              <div className="font-semibold">Atenționări validare (date incomplete):</div>
              {validation.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-amber-200/80">
                  • {e.path || "/"}: {e.message}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
            <Section title="1. Identificare clădire">
              <KV k="Adresă" v={bld.address || "—"} />
              <KV k="Categorie" v={bld.category} />
              <KV k="Suprafață utilă" v={`${bld.areaUseful} m²`} mono />
              <KV k="Zona climatică" v={bld.climateZone} />
              <KV k="An construcție" v={bld.yearBuilt ?? "—"} />
              <KV k="Protejat patrimoniu" v={bld.protectedStatus ? "DA" : "Nu"} />
            </Section>

            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                QR pașaport
              </div>
              {qrDataURL ? (
                <img
                  src={qrDataURL}
                  alt="QR pașaport"
                  className="w-32 h-32 bg-white rounded-lg p-1"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-[10px] text-white/30 border border-white/10 rounded-lg">
                  Se generează…
                </div>
              )}
              <div className="text-[9px] text-white/40 text-center break-all leading-tight">
                {passport.passportId.slice(0, 8)}…
              </div>
            </div>
          </div>

          <Section title="2. Baseline (stare inițială)">
            <KV
              k="EP total"
              v={`${base.ep_total?.toFixed?.(1) ?? base.ep_total} kWh/(m²·an)`}
              mono
            />
            <KV k="Clasă energetică" v={base.energyClass} />
            <KV k="CO₂" v={`${base.co2?.toFixed?.(2) ?? base.co2} kg/(m²·an)`} mono />
            <KV k="Cotă RER" v={`${base.rer_pct?.toFixed?.(1) ?? base.rer_pct} %`} mono />
            <KV
              k="Conform MEPS 2030"
              v={base.meps2030_compliant ? "DA" : "Nu"}
              color={base.meps2030_compliant ? "text-green-400" : "text-red-400"}
            />
            <KV
              k="Conform MEPS 2033"
              v={base.meps2033_compliant ? "DA" : "Nu"}
              color={base.meps2033_compliant ? "text-green-400" : "text-amber-400"}
            />
          </Section>

          <Section title="3. Plan etapizat (roadmap)">
            <KV k="Strategie" v={road.strategy} />
            <KV k="Durată plan" v={`${road.totalYears} ani`} />
            <KV k="Buget anual" v={`${road.annualBudgetRON?.toLocaleString("ro-RO")} RON`} mono />
            <KV k="Nr. faze" v={road.phases?.length ?? 0} mono />
            {(road.phases || []).length === 0 && (
              <div className="text-[11px] text-white/30 italic pt-2">
                Nu există plan etapizat încă. Deschideți modulul PhasedRehab pentru a-l genera.
              </div>
            )}
          </Section>

          <Section title="4. Stare țintă post-renovare">
            <KV k="EP țintă" v={`${target.ep_target?.toFixed?.(1) ?? target.ep_target} kWh/(m²·an)`} mono />
            <KV k="Clasă țintă" v={target.energyClass_target} />
            <KV
              k="Conform nZEB"
              v={target.nzebCompliant ? "DA" : "Nu"}
              color={target.nzebCompliant ? "text-green-400" : "text-amber-400"}
            />
            <KV
              k="Cost-optimal (≤50 kWh)"
              v={target.costOptimalCompliant ? "DA" : "Nu"}
              color={target.costOptimalCompliant ? "text-green-400" : "text-white/60"}
            />
            <KV
              k="Țintă MEPS 2030"
              v={target.mepsComplianceTarget?.meps2030 ? "DA" : "Nu"}
              color={target.mepsComplianceTarget?.meps2030 ? "text-green-400" : "text-red-400"}
            />
            <KV
              k="Țintă MEPS 2033"
              v={target.mepsComplianceTarget?.meps2033 ? "DA" : "Nu"}
              color={target.mepsComplianceTarget?.meps2033 ? "text-green-400" : "text-amber-400"}
            />
          </Section>

          <Section title="5. Rezumat financiar">
            <KV k="Investiție totală" v={`${fin.totalInvestment_RON?.toLocaleString("ro-RO")} RON`} mono />
            <KV k="Grant estimat" v={`${fin.totalGrant_RON?.toLocaleString("ro-RO")} RON`} mono />
            <KV k="Investiție netă" v={`${fin.netInvestment_RON?.toLocaleString("ro-RO")} RON`} mono color="text-amber-300" />
            <KV k="NPV 30 ani" v={`${fin.npv_30years_RON?.toLocaleString("ro-RO")} RON`} mono />
            <KV k="IRR" v={`${fin.irr_pct?.toFixed?.(1) ?? fin.irr_pct} %`} mono />
            <KV k="Payback simplu" v={`${fin.paybackSimple_years?.toFixed?.(1) ?? fin.paybackSimple_years} ani`} mono />
            <KV k="Perspectivă" v={fin.perspective} />
          </Section>

          <Section title="6. Istoric versiuni">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {(passport.history || []).slice().reverse().map((h, i) => (
                <div
                  key={i}
                  className="text-[11px] py-1.5 border-b border-white/5 last:border-0 flex justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white/70 truncate">{h.changeReason}</div>
                    <div className="text-[10px] text-white/30 font-mono">
                      {new Date(h.timestamp).toLocaleString("ro-RO")} · {h.changedBy}
                    </div>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">v{h.version}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="7. Registru central MDLPA">
            <div className="text-xs text-blue-300/80 leading-relaxed">{regStatus.note}</div>
            <div className="text-[10px] text-white/35 mt-1">
              Status sync: <span className="font-mono">{passport.registry?.syncStatus}</span>
              {regStatus.lastChecked && (
                <> · Verificat ultima dată: {regStatus.lastChecked}</>
              )}
            </div>
            {!regStatus.enabled && (
              <div className="text-[10px] text-white/40 mt-1">
                Zephren monitorizează publicarea API-ului MDLPA. La disponibilitate, pașapoartele existente vor putea fi sincronizate automat.
              </div>
            )}
          </Section>

          {/* Update form */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-white/30 font-semibold block">
              Motiv actualizare (opțional)
            </label>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="ex. Revizuire după audit intermediar"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-amber-500/50"
              maxLength={150}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleUpdate}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30"
              >
                ↻ Actualizează pașaport
              </button>
              <button
                onClick={handleNewPassport}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10"
              >
                + Pașaport nou (UUID nou)
              </button>
            </div>
          </div>
        </div>

        {/* Footer acțiuni */}
        <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportJSON}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25"
            >
              ↓ Export JSON
            </button>
            <button
              onClick={handleExportXML}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25"
            >
              ↓ Export XML
            </button>
            <button
              onClick={handleExportDOCX}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 disabled:opacity-50"
            >
              ↓ Export DOCX A4
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-all",
                copyStatus === "ok"
                  ? "bg-green-500/20 border-green-500/30 text-green-300"
                  : copyStatus === "error"
                  ? "bg-red-500/15 border-red-500/30 text-red-300"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {copyStatus === "ok"
                ? "✓ Copiat"
                : copyStatus === "error"
                ? "✗ Eșec clipboard"
                : "📋 Clipboard"}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/90"
          >
            Închide
          </button>
        </div>
        {exportMsg && (
          <div className="px-6 pb-4 text-[11px] text-white/50">{exportMsg}</div>
        )}
      </div>
    </div>
  );
}
