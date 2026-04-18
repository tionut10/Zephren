import { useState, useEffect, useMemo } from "react";
import { cn } from "./ui.jsx";
import { getExpiryDate, getValidityYears } from "../utils/cpe-validity.js";

const LS_KEY = "zephren_cpe_alert_system";

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

function expiryDate(issueDate, energyClass) {
  return getExpiryDate(issueDate, energyClass);
}

function monthsUntil(date) {
  return (date - new Date()) / (1000 * 60 * 60 * 24 * 30.44);
}

function getAlertStatus(issueDate, energyClass) {
  const exp = expiryDate(issueDate, energyClass);
  if (!exp) return { label: "—", color: "text-white/40", urgency: 99 };
  const months = monthsUntil(exp);
  if (months < 0)   return { label: "EXPIRAT",  color: "text-red-400",    badge: "bg-red-500/25 text-red-300 border border-red-500/40",       urgency: 0 };
  if (months < 6)   return { label: "< 6 luni", color: "text-red-400",    badge: "bg-red-500/20 text-red-300 border border-red-500/30",        urgency: 1 };
  if (months < 12)  return { label: "< 1 an",   color: "text-orange-400", badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30", urgency: 2 };
  if (months < 24)  return { label: "< 2 ani",  color: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30", urgency: 3 };
  return { label: "Valid",    color: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", urgency: 4 };
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

const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY = { address: "", energyClass: "", owner: "", issueDate: TODAY };

const FILTER_OPTIONS = [
  { id: "toate",    label: "Toate" },
  { id: "expirate", label: "Expirate" },
  { id: "sub1an",   label: "< 1 an" },
  { id: "sub2ani",  label: "< 2 ani" },
];

export default function CPEAlertSystem({ cpeList: cpeListProp = [], onAddCPE, onMarkRenewed }) {
  const [list, setList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved && saved.length > 0) return saved;
    } catch (_) {}
    return cpeListProp.length > 0 ? cpeListProp : [];
  });

  const [filter, setFilter]       = useState("toate");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [sortKey, setSortKey]     = useState("urgency");
  const [sortDir, setSortDir]     = useState("asc");

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }, [list]);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.address || !form.energyClass || !form.issueDate) return;
    const entry = { id: crypto.randomUUID(), ...form, renewed: false };
    setList(prev => [entry, ...prev]);
    onAddCPE?.(entry);
    setForm(EMPTY);
    setShowForm(false);
  }

  function handleRenew(id) {
    setList(prev => prev.map(r => r.id === id ? { ...r, renewed: true, renewedDate: TODAY } : r));
    onMarkRenewed?.(id);
  }

  function handleDelete(id) {
    setList(prev => prev.filter(r => r.id !== id));
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function exportCSV() {
    const header = ["Adresă", "Proprietar", "Clasă", "Data emitere", "Data expirare", "Valabilitate (ani)", "Status", "Reînnoit"];
    const rows = list.map(r => [
      r.address, r.owner || "", r.energyClass, fmtDate(r.issueDate),
      fmtExpiry(r.issueDate, r.energyClass), getValidityYears(r.energyClass),
      getAlertStatus(r.issueDate, r.energyClass).label, r.renewed ? "Da" : "Nu",
    ]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "CPE_alerte_expirare.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const withStatus = useMemo(() =>
    list.map(r => ({ ...r, _status: getAlertStatus(r.issueDate, r.energyClass) })),
  [list]);

  const filtered = useMemo(() => {
    return withStatus.filter(r => {
      const exp = expiryDate(r.issueDate, r.energyClass);
      const months = exp ? monthsUntil(exp) : 0;
      if (filter === "expirate") return months < 0;
      if (filter === "sub1an")   return months < 12;
      if (filter === "sub2ani")  return months < 24;
      return true;
    });
  }, [withStatus, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb;
      if (sortKey === "urgency")    { va = a._status.urgency; vb = b._status.urgency; }
      else if (sortKey === "expiry") {
        va = expiryDate(a.issueDate, a.energyClass)?.getTime() || 0;
        vb = expiryDate(b.issueDate, b.energyClass)?.getTime() || 0;
      }
      else if (sortKey === "address") { va = a.address; vb = b.address; }
      else { va = a.issueDate; vb = b.issueDate; }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const expirate = withStatus.filter(r => r._status.urgency === 0).length;
    const sub6luni = withStatus.filter(r => r._status.urgency === 1).length;
    const sub1an   = withStatus.filter(r => r._status.urgency === 2).length;
    const sub2ani  = withStatus.filter(r => r._status.urgency === 3).length;
    return { expirate, sub6luni, sub1an, sub2ani };
  }, [withStatus]);

  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)}
      className={cn("text-left text-xs font-semibold uppercase tracking-wider hover:text-amber-400 transition-colors flex items-center gap-1",
        sortKey === col ? "text-amber-400" : "text-white/50")}>
      {label}
      {sortKey === col && <span className="opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Expirate",     value: stats.expirate, color: stats.expirate ? "text-red-400"    : "text-white/40" },
          { label: "< 6 luni",    value: stats.sub6luni, color: stats.sub6luni ? "text-red-400"    : "text-white/40" },
          { label: "< 1 an",      value: stats.sub1an,   color: stats.sub1an   ? "text-orange-400" : "text-white/40" },
          { label: "< 2 ani",     value: stats.sub2ani,  color: stats.sub2ani  ? "text-yellow-400" : "text-white/40" },
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
          {FILTER_OPTIONS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                filter === f.id
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80")}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all">
            {showForm ? "Anulează" : "+ CPE nou"}
          </button>
          <button onClick={exportCSV} disabled={!list.length}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Export CSV
          </button>
        </div>
      </div>

      {/* Formular adăugare */}
      {showForm && (
        <form onSubmit={handleAdd}
          className="bg-white/5 border border-amber-500/20 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Adaugă CPE pentru monitorizare</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Adresă *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required
                placeholder="Str. Exemplu nr. 1, București"
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
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Proprietar</label>
              <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                placeholder="Nume proprietar"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white/50">Data emitere *</label>
              <input value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                type="date" required
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-white/80" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all">
              Adaugă în monitorizare
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Tabel */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm border border-white/5 rounded-xl bg-white/[0.02]">
          {list.length === 0
            ? "Nu există CPE-uri monitorizate. Adaugă primul certificat."
            : "Niciun certificat nu corespunde filtrului selectat."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-3 py-2.5 text-left"><SortBtn col="urgency"  label="Status" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="address"  label="Adresă" /></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Proprietar</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Clasă</th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="issueDate" label="Emisă" /></th>
                <th className="px-3 py-2.5 text-left"><SortBtn col="expiry"   label="Expiră" /></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const st = r._status;
                const rowCls = st.urgency === 0
                  ? "bg-red-950/20 border-b border-red-900/20 hover:bg-red-950/30"
                  : st.urgency === 1
                  ? "bg-red-950/10 border-b border-red-900/10 hover:bg-red-950/20"
                  : st.urgency === 2
                  ? "bg-orange-950/15 border-b border-orange-900/15 hover:bg-orange-950/25"
                  : st.urgency === 3
                  ? "bg-yellow-950/10 border-b border-yellow-900/10 hover:bg-yellow-950/20"
                  : "border-b border-white/5 hover:bg-white/5";
                return (
                  <tr key={r.id} className={cn("transition-colors", rowCls)}>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap", st.badge || "bg-white/10 text-white/40")}>
                        {st.label}
                      </span>
                      {r.renewed && (
                        <span className="ml-1 text-xs text-emerald-400/60">(reînnoit)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-white/80 max-w-[220px] truncate" title={r.address}>{r.address}</td>
                    <td className="px-3 py-2.5 text-white/50 text-xs">{r.owner || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold",
                        CLASS_COLORS[r.energyClass] || "bg-white/10 text-white/60 border-white/20")}>
                        {r.energyClass || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">{fmtDate(r.issueDate)}</td>
                    <td className="px-3 py-2.5 text-white/60 whitespace-nowrap" title={`valabil ${getValidityYears(r.energyClass)} ani (EPBD 2024 Art. 17)`}>
                      {fmtExpiry(r.issueDate, r.energyClass)}
                      <span className="ml-1 text-[9px] opacity-40">({getValidityYears(r.energyClass)}a)</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {!r.renewed && (
                          <button onClick={() => handleRenew(r.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all whitespace-nowrap">
                            Reînnoit
                          </button>
                        )}
                        <button onClick={() => handleDelete(r.id)}
                          className="text-white/25 hover:text-red-400 transition-colors text-lg leading-none px-1">
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-white/25 text-right">
        Valabilitate: 10 ani clase A+..C / 5 ani clase D..G (EPBD 2024/1275 Art. 17) · {list.length} certificate monitorizate · sortare automată după urgență
      </p>
    </div>
  );
}
