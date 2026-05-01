// ===============================================================
// BrandPartnersAdmin.jsx — Admin UI activare parteneriate brand-uri
// Sprint P2 — 30 apr 2026
// ===============================================================
//
// Modal accesibil doar pentru proprietar Zephren. Permite:
//   - Listarea celor ~165 brand-uri din registry
//   - Editare instant: partnerStatus / partnerSince / partnerTier / affiliateUrl / contactEmail
//   - Salvare în localStorage (override layer) — UI-ul dropdown reflectă instant
//   - Export overrides ca JSON sau CSV (pentru promovare manuală la production)
//   - Import overrides batch din CSV (update masiv post-parteneriate)
//   - Statistici telemetrie click conversii partener
//   - Reset overrides

import { useState, useMemo, useEffect } from "react";
import { cn, Card, Input, Select } from "./ui.jsx";
import {
  BRANDS,
  getActivePartners,
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
  exportOverridesJson,
  importOverridesJson,
  exportOverridesCsv,
  importOverridesCsv,
  getTelemetryByBrand,
  getTelemetryEvents,
  exportTelemetryCsv,
  clearTelemetry,
} from "../data/catalogs/hvac-catalog.js";

const PARTNER_STATUS_OPTIONS = [
  { value: "none", label: "Inactiv (fără parteneriat)" },
  { value: "pending", label: "În discuție (pending)" },
  { value: "active", label: "ACTIV (prioritizare UI)" },
  { value: "discontinued", label: "Discontinuat" },
];

const PARTNER_TIER_OPTIONS = [
  { value: "", label: "—" },
  { value: "basic", label: "Basic" },
  { value: "premium", label: "Premium" },
  { value: "exclusive", label: "Exclusive (singurul în categorie)" },
];

const CATEGORY_LABELS = {
  heating: "Încălzire",
  cooling: "Răcire / AC",
  acm: "ACM",
  ventilation: "Ventilare",
  lighting: "Iluminat",
  "smart-home": "Smart Home",
  distribution: "Distribuție / țevi",
  solar: "Solar",
  battery: "Baterii",
  fuels: "Combustibili / Furnizori",
};

export default function BrandPartnersAdmin({ open, onClose }) {
  const [overridesState, setOverridesState] = useState(() => getOverrides());
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [tab, setTab] = useState("brands"); // brands | telemetry | import

  // Forțează re-render când localStorage se schimbă din alt tab
  useEffect(() => {
    const handler = () => setOverridesState(getOverrides());
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  }, []);

  // Brand-uri cu overrides aplicate
  const brandsLive = useMemo(() => {
    return BRANDS.map(b => {
      const ovr = overridesState[b.id];
      return ovr ? { ...b, ...ovr, _hasOverride: true } : { ...b, _hasOverride: false };
    });
  }, [overridesState]);

  // Filtrare
  const filtered = useMemo(() => {
    let arr = brandsLive;
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      arr = arr.filter(b => b.categories.includes(filterCategory));
    }
    if (filterStatus) {
      arr = arr.filter(b => b.partnerStatus === filterStatus);
    }
    return arr;
  }, [brandsLive, search, filterCategory, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = brandsLive.length;
    const active = brandsLive.filter(b => b.partnerStatus === "active").length;
    const pending = brandsLive.filter(b => b.partnerStatus === "pending").length;
    const overridesCount = Object.keys(overridesState).length;
    return { total, active, pending, overridesCount };
  }, [brandsLive, overridesState]);

  const startEdit = (brand) => {
    setEditingId(brand.id);
    setDraft({
      partnerStatus: brand.partnerStatus || "none",
      partnerSince: brand.partnerSince || "",
      partnerTier: brand.partnerTier || "",
      affiliateUrl: brand.affiliateUrl || "",
      contactEmail: brand.contactEmail || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = (brandId) => {
    const fields = {
      partnerStatus: draft.partnerStatus || "none",
      partnerSince: draft.partnerSince || null,
      partnerTier: draft.partnerTier || null,
      affiliateUrl: draft.affiliateUrl || null,
      contactEmail: draft.contactEmail || null,
    };
    setOverride(brandId, fields);
    setOverridesState(getOverrides());
    setEditingId(null);
    setDraft({});
  };

  const removeOverride = (brandId) => {
    if (!confirm(`Resetezi override-ul pentru "${brandId}" (revine la valoarea din JSON)?`)) return;
    clearOverride(brandId);
    setOverridesState(getOverrides());
  };

  const resetAll = () => {
    if (!confirm("Reset COMPLET al tuturor overrides? (toate brand-urile revin la partnerStatus='none' din JSON original)")) return;
    clearAllOverrides();
    setOverridesState(getOverrides());
  };

  const downloadFile = (content, filename, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const content = exportOverridesJson();
    downloadFile(content, `zephren-partner-overrides-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  };

  const handleExportCsv = () => {
    const content = exportOverridesCsv();
    downloadFile(content, `zephren-partner-overrides-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      const success = importOverridesJson(text);
      if (success) {
        setOverridesState(getOverrides());
        alert(`Import JSON reușit. ${Object.keys(getOverrides()).length} overrides încărcate.`);
      } else {
        alert("Eroare import JSON. Verifică formatul.");
      }
    } else if (file.name.endsWith(".csv")) {
      const result = importOverridesCsv(text);
      setOverridesState(getOverrides());
      if (result.errors.length > 0) {
        alert(`Import CSV: ${result.success} brand-uri actualizate, ${result.errors.length} erori:\n${result.errors.slice(0, 5).map(e => `Linia ${e.line}: ${e.brandId} — ${e.error}`).join("\n")}`);
      } else {
        alert(`Import CSV reușit: ${result.success} brand-uri actualizate.`);
      }
    } else {
      alert("Format necunoscut. Acceptat: .json sau .csv");
    }
    e.target.value = ""; // reset input
  };

  const handleExportTelemetryCsv = () => {
    const content = exportTelemetryCsv();
    downloadFile(content, `zephren-partner-telemetry-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  };

  const handleClearTelemetry = () => {
    if (!confirm("Ștergi toate evenimentele de telemetrie? (după export la backend)")) return;
    clearTelemetry();
    alert("Telemetrie ștearsă.");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              🤝 Brand Partners Admin
            </h2>
            <p className="text-xs opacity-50 mt-0.5">
              Activare instant parteneriate (override layer localStorage) — politică NEUTRĂ păstrată în JSON-ul registry
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white/90 text-2xl leading-none"
            aria-label="Închide"
          >×</button>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/10 bg-white/[0.02]">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{stats.total}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Total brand-uri</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-emerald-400">{stats.active}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Parteneri activi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-amber-400">{stats.pending}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">În discuție</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">{stats.overridesCount}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Overrides locale</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-white/5">
          {[
            { id: "brands", label: "Brand-uri" },
            { id: "telemetry", label: "Telemetrie click" },
            { id: "import", label: "Import / Export" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn("px-4 py-2 text-xs font-medium rounded-t-lg transition-all",
                tab === t.id ? "bg-amber-500/15 text-amber-400 border-b-2 border-amber-500" : "opacity-60 hover:opacity-100")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "brands" && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Input
                  label="Caută brand"
                  value={search}
                  onChange={setSearch}
                  placeholder="nume / id / țară / notes"
                />
                <Select
                  label="Categorie"
                  value={filterCategory}
                  onChange={setFilterCategory}
                  placeholder="Toate"
                  options={[
                    { value: "", label: "Toate categoriile" },
                    ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
                  ]}
                />
                <Select
                  label="Status partener"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  placeholder="Toate"
                  options={[
                    { value: "", label: "Toate statusurile" },
                    ...PARTNER_STATUS_OPTIONS,
                  ]}
                />
              </div>

              {/* Brand list */}
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <div className="text-center py-10 opacity-40 text-sm">Niciun brand găsit cu acest filtru.</div>
                )}
                {filtered.map(b => {
                  const isEditing = editingId === b.id;
                  const statusColor = b.partnerStatus === "active" ? "text-emerald-400"
                    : b.partnerStatus === "pending" ? "text-amber-400"
                    : b.partnerStatus === "discontinued" ? "text-red-400"
                    : "opacity-50";
                  return (
                    <div key={b.id} className={cn("border rounded-lg p-3",
                      b._hasOverride ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-white/5 bg-white/[0.02]")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{b.name}</span>
                            <span className="text-[10px] opacity-40 font-mono">{b.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded">{b.country}</span>
                            <span className={cn("text-[10px] uppercase tracking-wider font-bold", statusColor)}>
                              {b.partnerStatus}
                            </span>
                            {b.partnerTier && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                                {b.partnerTier}
                              </span>
                            )}
                            {b._hasOverride && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-bold">
                                OVERRIDE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] opacity-60 mt-1">{b.notes}</div>
                          <div className="text-[10px] opacity-40 mt-0.5">
                            {b.categories.map(c => CATEGORY_LABELS[c] || c).join(" · ")}
                            {" · "}
                            {b.matchesEntries.length} entries linkate
                          </div>
                          {(b.partnerSince || b.affiliateUrl || b.contactEmail) && (
                            <div className="text-[10px] opacity-50 mt-1 space-x-3">
                              {b.partnerSince && <span>Partner since: {b.partnerSince}</span>}
                              {b.affiliateUrl && <span>URL: <a href={b.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">{b.affiliateUrl}</a></span>}
                              {b.contactEmail && <span>Email: {b.contactEmail}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!isEditing && (
                            <button
                              onClick={() => startEdit(b)}
                              className="px-2 py-1 text-[10px] bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 rounded transition-colors"
                            >
                              Editare
                            </button>
                          )}
                          {b._hasOverride && !isEditing && (
                            <button
                              onClick={() => removeOverride(b.id)}
                              className="px-2 py-1 text-[10px] bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded transition-colors"
                              title="Șterge override (revine la JSON original)"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
                          <Select
                            label="Partner Status"
                            value={draft.partnerStatus}
                            onChange={v => setDraft(p => ({ ...p, partnerStatus: v }))}
                            options={PARTNER_STATUS_OPTIONS}
                          />
                          <Input
                            label="Partner Since (ISO date)"
                            value={draft.partnerSince}
                            onChange={v => setDraft(p => ({ ...p, partnerSince: v }))}
                            placeholder="2026-08-15"
                            type="date"
                          />
                          <Select
                            label="Partner Tier"
                            value={draft.partnerTier}
                            onChange={v => setDraft(p => ({ ...p, partnerTier: v }))}
                            options={PARTNER_TIER_OPTIONS}
                          />
                          <Input
                            label="Affiliate URL"
                            value={draft.affiliateUrl}
                            onChange={v => setDraft(p => ({ ...p, affiliateUrl: v }))}
                            placeholder="https://zephren.ro/go/..."
                          />
                          <Input
                            label="Contact Email"
                            value={draft.contactEmail}
                            onChange={v => setDraft(p => ({ ...p, contactEmail: v }))}
                            placeholder="vanzari@brand.ro"
                            type="email"
                          />
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => saveEdit(b.id)}
                              className="flex-1 px-3 py-2 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg font-medium transition-colors"
                            >
                              Salvează
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              Anulează
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "telemetry" && (
            <TelemetryTab onExport={handleExportTelemetryCsv} onClear={handleClearTelemetry} />
          )}

          {tab === "import" && (
            <Card title="Import / Export Overrides">
              <div className="space-y-4">
                <div className="text-xs opacity-70 leading-relaxed">
                  <p className="mb-2">
                    <strong className="text-amber-400">Export</strong>: descarcă overrides curente ca JSON
                    sau CSV. JSON-ul poate fi promovat manual la production prin commit în
                    <code className="bg-white/5 px-1 rounded mx-1">brands-registry.json</code>.
                  </p>
                  <p>
                    <strong className="text-amber-400">Import</strong>: încarcă overrides batch din JSON
                    sau CSV. CSV format:
                    <code className="bg-white/5 px-1 rounded ml-1 text-[10px]">
                      id,partnerStatus,partnerSince,partnerTier,affiliateUrl,contactEmail
                    </code>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportJson}
                    className="px-4 py-3 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 rounded-lg text-sm font-medium transition-colors"
                  >
                    📤 Export JSON
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-3 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 rounded-lg text-sm font-medium transition-colors"
                  >
                    📤 Export CSV
                  </button>
                </div>

                <label className="block">
                  <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
                    Import overrides (JSON sau CSV)
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleImportFile}
                    className="block w-full text-sm text-white/70
                      file:mr-3 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-xs file:font-medium
                      file:bg-amber-500/15 file:text-amber-300
                      hover:file:bg-amber-500/25
                      file:cursor-pointer"
                  />
                </label>

                <div className="border-t border-white/5 pt-3">
                  <button
                    onClick={resetAll}
                    className="px-4 py-2 bg-red-500/15 text-red-300 hover:bg-red-500/25 rounded-lg text-xs font-medium transition-colors"
                  >
                    🔥 Reset toate overrides
                  </button>
                  <p className="text-[10px] opacity-40 mt-1">
                    Toate brand-urile revin la valorile din JSON (partnerStatus='none' inițial).
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] opacity-60">
          <span>
            Politica NEUTRĂ păstrată în <code className="bg-white/5 px-1 rounded">brands-registry.json</code>;
            UI-ul reflectă overrides instant via localStorage.
          </span>
          <span className="font-mono opacity-50">v1.0.0 — Sprint P2 30 apr 2026</span>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: Telemetry Tab ─────────────────────────────────
function TelemetryTab({ onExport, onClear }) {
  const [events, setEvents] = useState(() => getTelemetryEvents());
  const [byBrand, setByBrand] = useState(() => getTelemetryByBrand());

  const refresh = () => {
    setEvents(getTelemetryEvents());
    setByBrand(getTelemetryByBrand());
  };

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(() => {
    return Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
  }, [byBrand]);

  return (
    <Card title={`Telemetrie click parteneri — ${events.length} evenimente totale`}>
      <div className="space-y-3">
        {events.length === 0 && (
          <div className="text-center py-10 opacity-40 text-sm">
            Niciun click înregistrat încă pe entries cu parteneri activi.
            <br />
            <span className="text-[10px] opacity-60">
              Activează un brand (status='active') și interacționează cu dropdown-urile din Step 3 pentru a popula.
            </span>
          </div>
        )}

        {sorted.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wider opacity-60">Top brand-uri (clicks pe entries linkate)</div>
            <div className="space-y-1">
              {sorted.map(([brandId, count]) => (
                <div key={brandId} className="flex items-center justify-between bg-white/[0.02] rounded px-3 py-2 text-sm">
                  <span className="font-mono">{brandId}</span>
                  <span className="font-bold text-amber-400">{count} clicks</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-3 border-t border-white/5">
          <button
            onClick={onExport}
            disabled={events.length === 0}
            className="px-3 py-2 text-xs bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            📤 Export CSV ({events.length} evenimente)
          </button>
          <button
            onClick={() => { onClear(); refresh(); }}
            disabled={events.length === 0}
            className="px-3 py-2 text-xs bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            🗑 Șterge telemetrie
          </button>
          <button
            onClick={refresh}
            className="px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </Card>
  );
}
