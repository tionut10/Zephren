import { useState, useEffect, useMemo } from "react";
import { cn } from "./ui.jsx";
import { getExpiryDate, getValidityYears, getValidityLabel } from "../utils/cpe-validity.js";

const LS_KEY = "zephren_cpe_registry";
const TODAY = new Date().toISOString().slice(0, 10);

const ENERGY_CLASSES = ["A+", "A", "B", "C", "D", "E", "F", "G"];
const CLASS_COLORS = {
  "A+": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "A":  "bg-green-500/20 text-green-300 border-green-500/30",
  "B":  "bg-lime-500/20 text-lime-300 border-lime-500/30",
  "C":  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "D":  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "E":  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "F":  "bg-red-500/20 text-red-300 border-red-500/30",
  "G":  "bg-rose-600/20 text-rose-300 border-rose-600/30",
};

const CATEGORIES = [
  "Locuință unifamilială", "Bloc de locuințe", "Birouri", "Comercial",
  "Industrie ușoară", "Educație", "Sănătate", "Hoteluri", "Restaurante",
  "Sport", "Altele",
];

function ClassBadge({ cls }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold", CLASS_COLORS[cls] || "bg-white/10 text-white/60 border-white/20")}>
      {cls || "—"}
    </span>
  );
}

function expiryDate(issueDate, energyClass) {
  return getExpiryDate(issueDate, energyClass);
}

function monthsUntil(date) {
  const now = new Date();
  const diff = (date - now) / (1000 * 60 * 60 * 24 * 30.44);
  return diff;
}

function getStatus(issueDate, energyClass) {
  const exp = expiryDate(issueDate, energyClass);
  if (!exp) return { label: "—", color: "text-white/40", badge: "bg-white/10 text-white/40" };
  const months = monthsUntil(exp);
  if (months < 0) return { label: "Expirat", color: "text-red-400", badge: "bg-red-500/20 text-red-300 border border-red-500/30" };
  if (months < 6) return { label: `Expiră în ${Math.ceil(months)} luni`, color: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30" };
  return { label: "Valid", color: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" };
}

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function fmtExpiry(issueDate, energyClass) {
  const exp = expiryDate(issueDate, energyClass);
  if (!exp) return "—";
  return fmtDate(exp.toISOString().slice(0, 10));
}

const EMPTY_FORM = { address: "", category: "", au: "", energyClass: "", issueDate: TODAY, certNr: "", notes: "" };

export default function CPETracker({ building = {}, auditor = {} }) {
  const [registry, setRegistry] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState("toate");
  const [sortKey, setSortKey] = useState("issueDate");
  const [sortDir, setSortDir] = useState("desc");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(registry));
  }, [registry]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!form.address || !form.energyClass || !form.issueDate) return;
    const entry = {
      id: crypto.randomUUID(),
      address: form.address,
      category: form.category,
      au: form.au,
      energyClass: form.energyClass,
      issueDate: form.issueDate,
      certNr: form.certNr,
      notes: form.notes,
      auditorName: auditor.name || "",
      certNrAuditor: auditor.certNr || "",
      projectKey: building.address || "",
    };
    setRegistry(prev => [entry, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleDelete(id) {
    setRegistry(prev => prev.filter(r => r.id !== id));
  }

  function handleImportCurrent() {
    setForm({
      address: building.address || "",
      category: building.category || "",
      au: building.areaUseful ? String(building.areaUseful) : "",
      energyClass: "",
      issueDate: TODAY,
      certNr: "",
      notes: "",
    });
    setShowForm(true);
  }

  function handleExportCSV() {
    const header = ["ID", "Adresă", "Categorie", "Au (m²)", "Clasă", "Data emitere", "Data expirare", "Valabilitate (ani)", "Nr. certificat", "Auditor", "Note", "Status"];
    const rows = registry.map(r => [
      r.id, r.address, r.category, r.au, r.energyClass, fmtDate(r.issueDate),
      fmtExpiry(r.issueDate, r.energyClass), getValidityYears(r.energyClass),
      r.certNr, r.auditorName, r.notes, getStatus(r.issueDate, r.energyClass).label,
    ]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "CPE_registru.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    return registry.filter(r => {
      const exp = expiryDate(r.issueDate, r.energyClass);
      const months = exp ? monthsUntil(exp) : 0;
      if (filter === "active") return months >= 6;
      if (filter === "expirate") return months < 0;
      if (filter === "curand") return months >= 0 && months < 6;
      return true;
    });
  }, [registry, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb;
      if (sortKey === "address") { va = a.address; vb = b.address; }
      else if (sortKey === "energyClass") { va = ENERGY_CLASSES.indexOf(a.energyClass); vb = ENERGY_CLASSES.indexOf(b.energyClass); }
      else if (sortKey === "expiry") {
        va = expiryDate(a.issueDate, a.energyClass)?.getTime() || 0;
        vb = expiryDate(b.issueDate, b.energyClass)?.getTime() || 0;
      }
      else { va = a.issueDate; vb = b.issueDate; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = registry.length;
    const expired = registry.filter(r => {
      const exp = expiryDate(r.issueDate, r.energyClass);
      return exp && monthsUntil(exp) < 0;
    }).length;
    const soon = registry.filter(r => {
      const exp = expiryDate(r.issueDate, r.energyClass);
      if (!exp) return false;
      const m = monthsUntil(exp);
      return m >= 0 && m < 6;
    }).length;
    const active = total - expired;
    return { total, active, expired, soon, activePct: total ? Math.round((active / total) * 100) : 0 };
  }, [registry]);

  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)}
      className={cn("text-left text-xs font-semibold uppercase tracking-wider hover:text-amber-400 transition-colors flex items-center gap-1",
        sortKey === col ? "text-amber-400" : "text-white/50")}>
      {label}
      {sortKey === col && <span className="opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  const TABS = [
    { id: "toate", label: "Toate", count: registry.length },
    { id: "active", label: "Active", count: stats.active },
    { id: "expirate", label: "Expirate", count: stats.expired },
    { id: "curand", label: "Expiră curând", count: stats.soon },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total CPE emise", value: stats.total, color: "text-white" },
          { label: "Active", value: `${stats.active} (${stats.activePct}%)`, color: "text-emerald-400" },
          { label: "Expirate", value: stats.expired, color: stats.expired ? "text-red-400" : "text-white/40" },
          { label: "Expiră în <6 luni", value: stats.soon, color: stats.soon ? "text-amber-400" : "text-white/40" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</div>
            <div className="text-xs text-white/50 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                filter === t.id
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80")}>
              {t.label} <span className="opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleImportCurrent}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 border border-white/10 text-white/70 hover:bg-slate-600/60 hover:text-white transition-all">
            + Proiect curent
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all">
            {showForm ? "Anulează" : "+ CPE nou"}
          </button>
          <button onClick={handleExportCSV} disabled={!registry.length}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Export CSV
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd}
          className="bg-white/5 border border-amber-500/20 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Înregistrare CPE nou</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Adresă *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required
                placeholder="Str. Exemplu nr. 1, București"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Categorie</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-white/80">
                <option value="">— Selectează —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Suprafață utilă (m²)</label>
              <input value={form.au} onChange={e => setForm(f => ({ ...f, au: e.target.value }))}
                type="number" min="0" placeholder="Ex: 250"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Clasă energetică *</label>
              <select value={form.energyClass} onChange={e => setForm(f => ({ ...f, energyClass: e.target.value }))} required
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-white/80">
                <option value="">— Selectează —</option>
                {ENERGY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Data emitere *</label>
              <input value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                type="date" required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-white/80" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Nr. certificat</label>
              <input value={form.certNr} onChange={e => setForm(f => ({ ...f, certNr: e.target.value }))}
                placeholder="Ex: CPE-2026-001234"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Note</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observații suplimentare..."
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all">
              Înregistrează CPE
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm border border-white/5 rounded-xl bg-white/2">
          {registry.length === 0 ? "Nu există certificate înregistrate. Adaugă primul CPE." : "Niciun certificat corespunde filtrului selectat."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-3 py-2.5 text-left"><SortBtn col="address" label="Adresă" /></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Cat.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Au m²</th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="energyClass" label="Clasă" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="issueDate" label="Emisă" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="expiry" label="Expiră" /></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Auditor</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Nr. cert.</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const status = getStatus(r.issueDate, r.energyClass);
                const exp = expiryDate(r.issueDate, r.energyClass);
                const months = exp ? monthsUntil(exp) : 99;
                const validYears = getValidityYears(r.energyClass);
                const rowCls = months < 0
                  ? "bg-red-950/20 border-b border-red-900/20 hover:bg-red-950/30"
                  : months < 6
                  ? "bg-amber-950/20 border-b border-amber-900/20 hover:bg-amber-950/30"
                  : "border-b border-white/5 hover:bg-white/5";
                return (
                  <tr key={r.id} className={cn("transition-colors", rowCls)}>
                    <td className="px-3 py-2.5 text-white/80 max-w-[200px] truncate" title={r.address}>{r.address}</td>
                    <td className="px-3 py-2.5 text-white/50 text-xs max-w-[100px] truncate" title={r.category}>{r.category || "—"}</td>
                    <td className="px-3 py-2.5 text-white/60">{r.au || "—"}</td>
                    <td className="px-3 py-2.5"><ClassBadge cls={r.energyClass} /></td>
                    <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">{fmtDate(r.issueDate)}</td>
                    <td className="px-3 py-2.5 text-white/60 whitespace-nowrap" title={`valabil ${validYears} ani (EPBD 2024 Art. 17)`}>
                      {fmtExpiry(r.issueDate, r.energyClass)}
                      <span className="ml-1 text-[9px] opacity-40">({validYears}a)</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap", status.badge)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-white/50 text-xs whitespace-nowrap">{r.auditorName || "—"}</td>
                    <td className="px-3 py-2.5 text-white/50 text-xs">{r.certNr || "—"}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleDelete(r.id)}
                        title="Șterge"
                        className="text-white/25 hover:text-red-400 transition-colors text-lg leading-none px-1">
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-white/25 text-right">
        Valabilitate CPE: 10 ani clase A+..C / 5 ani clase D..G (EPBD 2024/1275 Art. 17) · {registry.length} înregistrări salvate local
      </p>
    </div>
  );
}
