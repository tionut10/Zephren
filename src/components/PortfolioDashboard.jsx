import { useState, useMemo } from "react";
import { cn, Card, Badge } from "./ui.jsx";

// Determină clasa energetică din EP total (kWh/m²an)
function epToClass(ep) {
  if (ep == null || isNaN(ep)) return "?";
  if (ep < 91)  return "A+";
  if (ep < 129) return "A";
  if (ep < 257) return "B";
  if (ep < 390) return "C";
  if (ep < 522) return "D";
  if (ep < 652) return "E";
  if (ep < 783) return "F";
  return "G";
}

const CLASS_ORDER  = ["A+", "A", "B", "C", "D", "E", "F", "G"];
const CLASS_COLORS = {
  "A+": { bar: "#22c55e", badge: "green",  text: "#22c55e" },
  "A":  { bar: "#4ade80", badge: "green",  text: "#4ade80" },
  "B":  { bar: "#a3e635", badge: "green",  text: "#a3e635" },
  "C":  { bar: "#facc15", badge: "amber",  text: "#facc15" },
  "D":  { bar: "#fb923c", badge: "amber",  text: "#fb923c" },
  "E":  { bar: "#f87171", badge: "red",    text: "#f87171" },
  "F":  { bar: "#ef4444", badge: "red",    text: "#ef4444" },
  "G":  { bar: "#b91c1c", badge: "red",    text: "#b91c1c" },
};

function classBadgeColor(cls) {
  return CLASS_COLORS[cls]?.badge || "amber";
}

// Citește și parsează proiectele din localStorage
function loadProjects() {
  const results = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("zephren_project_") && !key.startsWith("project_")) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const b = data.building || data.buildingData || data || {};
      const ep =
        parseFloat(data.renewSummary?.ep_adjusted_m2) ||
        parseFloat(data.instSummary?.ep_total_m2) ||
        parseFloat(data.ep_total_m2) ||
        null;
      const cls =
        data.energyClass ||
        (ep != null ? epToClass(ep) : "?");
      results.push({
        id: key,
        address:  b.address  || b.strada || "—",
        city:     b.city     || b.localitate || "—",
        category: b.category || b.categorie || "—",
        au:       parseFloat(b.areaUseful || b.arieUtila) || null,
        year:     parseInt(b.yearBuilt   || b.anConstructie) || null,
        ep,
        cls,
        auditor:  data.auditor || data.auditorName || "",
      });
    } catch (_) {
      // key invalid, skip
    }
  }
  return results;
}

const exportCSV = (projects) => {
  const lines = ["Adresa,Oras,Categorie,Au(m2),An,EP(kWh/m2an),Clasa,Auditor"];
  projects.forEach(p =>
    lines.push(
      `"${p.address}","${p.city}","${p.category}",${p.au ?? ""},${p.year ?? ""},${p.ep != null ? p.ep.toFixed(1) : ""},${p.cls},"${p.auditor || ""}"`
    )
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "portofoliu_audit.csv";
  a.click();
};

const SORT_KEYS = {
  address:  (p) => p.address,
  category: (p) => p.category,
  au:       (p) => p.au ?? -1,
  year:     (p) => p.year ?? 0,
  ep:       (p) => p.ep ?? -1,
  cls:      (p) => CLASS_ORDER.indexOf(p.cls),
};

export default function PortfolioDashboard({ onClose, onOpenProject }) {
  const projects = useMemo(() => loadProjects(), []);

  const [filterText, setFilterText]     = useState("");
  const [filterCat,  setFilterCat]      = useState("");
  const [sortKey,    setSortKey]        = useState("address");
  const [sortAsc,    setSortAsc]        = useState(true);

  const categories = useMemo(() => {
    const set = new Set(projects.map(p => p.category).filter(Boolean));
    return [...set].sort();
  }, [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(p =>
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    }
    if (filterCat) list = list.filter(p => p.category === filterCat);
    const getter = SORT_KEYS[sortKey] || SORT_KEYS.address;
    list = [...list].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [projects, filterText, filterCat, sortKey, sortAsc]);

  // KPI
  const totalProj = projects.length;
  const epValues  = projects.map(p => p.ep).filter(v => v != null);
  const epMediu   = epValues.length ? epValues.reduce((a, b) => a + b, 0) / epValues.length : null;
  const efficient = projects.filter(p => ["A+", "A", "B"].includes(p.cls)).length;
  const ineficient = projects.filter(p => ["E", "F", "G"].includes(p.cls)).length;
  const pctEfic   = totalProj ? Math.round((efficient / totalProj) * 100) : 0;
  const pctInef   = totalProj ? Math.round((ineficient / totalProj) * 100) : 0;

  // distribuție clase
  const classDist = useMemo(() => {
    const counts = {};
    CLASS_ORDER.forEach(c => (counts[c] = 0));
    projects.forEach(p => { if (counts[p.cls] != null) counts[p.cls]++; });
    return counts;
  }, [projects]);
  const maxCount = Math.max(...Object.values(classDist), 1);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }) =>
    sortKey === k ? (
      <span className="ml-1 opacity-70">{sortAsc ? "▲" : "▼"}</span>
    ) : (
      <span className="ml-1 opacity-20">▲</span>
    );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-6xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Portofoliu Proiecte</h2>
            <span className="bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">
              {totalProj} proiecte
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportCSV(projects)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export Excel (CSV)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Închide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{totalProj}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Total proiecte</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {epMediu != null ? epMediu.toFixed(0) : "—"}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">EP mediu (kWh/m²an)</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{pctEfic}%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Clasa A+/A/B</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-1">{pctInef}%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Clasa E/F/G</div>
            </Card>
          </div>

          {/* Distribuție clase — bar chart SVG */}
          <Card title="Distribuție clase energetice">
            {totalProj === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nu există proiecte în localStorage.</p>
            ) : (
              <div className="flex items-end justify-around gap-2 h-40">
                {CLASS_ORDER.map(cls => {
                  const count = classDist[cls];
                  const heightPct = (count / maxCount) * 100;
                  const col = CLASS_COLORS[cls];
                  return (
                    <div key={cls} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-semibold" style={{ color: col.text }}>
                        {count > 0 ? count : ""}
                      </span>
                      <div className="w-full flex items-end" style={{ height: "96px" }}>
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: count > 0 ? `${Math.max(heightPct, 5)}%` : "2px",
                            background: count > 0 ? col.bar : "#334155",
                            opacity: count > 0 ? 1 : 0.3,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white">{cls}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Filtre */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Caută după adresă sau oraș..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Toate categoriile</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tabel proiecte */}
          <Card>
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                {totalProj === 0
                  ? "Nu există proiecte salvate în localStorage."
                  : "Niciun proiect nu corespunde filtrelor."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {[
                        { key: "address",  label: "Adresă" },
                        { key: "category", label: "Categorie" },
                        { key: "au",       label: "Au (m²)" },
                        { key: "year",     label: "An" },
                        { key: "ep",       label: "EP (kWh/m²)" },
                        { key: "cls",      label: "Clasă" },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 py-2 px-3 cursor-pointer select-none hover:text-white transition-colors"
                        >
                          {col.label}
                          <SortIcon k={col.key} />
                        </th>
                      ))}
                      <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 py-2 px-3">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-slate-800 hover:bg-slate-800/60 transition-colors",
                          idx % 2 === 0 ? "" : "bg-slate-800/20"
                        )}
                      >
                        <td className="py-2.5 px-3 text-white">
                          <div className="font-medium">{p.address}</div>
                          {p.city && p.city !== "—" && (
                            <div className="text-xs text-slate-400">{p.city}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.category}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {p.au != null ? p.au.toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.year ?? "—"}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {p.ep != null ? p.ep.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.cls !== "?" ? (
                            <Badge color={classBadgeColor(p.cls)}>{p.cls}</Badge>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onOpenProject?.(p.id)}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Deschide
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
