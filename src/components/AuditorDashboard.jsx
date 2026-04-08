import { useState, useMemo } from "react";
import { cn, Card, Badge } from "./ui.jsx";

const CLASS_ORDER = ["A+", "A", "B", "C", "D", "E", "F", "G"];
const CLASS_COLORS = {
  "A+": { bar: "#22c55e", text: "#22c55e" },
  "A":  { bar: "#4ade80", text: "#4ade80" },
  "B":  { bar: "#a3e635", text: "#a3e635" },
  "C":  { bar: "#facc15", text: "#facc15" },
  "D":  { bar: "#fb923c", text: "#fb923c" },
  "E":  { bar: "#f87171", text: "#f87171" },
  "F":  { bar: "#ef4444", text: "#ef4444" },
  "G":  { bar: "#b91c1c", text: "#b91c1c" },
};

const CAT_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#a78bfa", "#f43f5e", "#06b6d4", "#fb923c", "#84cc16"];

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

function loadProjectsFromLS() {
  const results = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("zephren_project_") && !key.startsWith("project_")) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      const b = data.building || data.buildingData || data || {};
      const ep =
        parseFloat(data.renewSummary?.ep_adjusted_m2) ||
        parseFloat(data.instSummary?.ep_total_m2) ||
        parseFloat(data.ep_total_m2) ||
        null;
      const cls = data.energyClass || (ep != null ? epToClass(ep) : "?");
      const savedDate = data.savedDate || data.updatedAt || null;
      results.push({
        id: key,
        address:  b.address  || b.strada || "—",
        category: b.category || b.categorie || "Necategorizat",
        au:       parseFloat(b.areaUseful || b.arieUtila) || null,
        ep,
        cls,
        savedDate,
      });
    } catch (_) {}
  }
  return results;
}

function PieChart({ data, size = 120 }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = 0;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startRad = (cumAngle - 90) * (Math.PI / 180);
    const endRad   = (cumAngle + angle - 90) * (Math.PI / 180);
    cumAngle += angle;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: d.color,
      label: d.label,
      value: d.value,
      pct: Math.round((d.value / total) * 100),
    };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#0d0f1a" strokeWidth="1.5" opacity="0.85" />
        ))}
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-white/60">{s.label}</span>
            <span className="text-xs font-semibold text-white/80 ml-auto pl-2">{s.value}</span>
            <span className="text-xs text-white/40">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-xs font-medium text-amber-300">{d.count > 0 ? d.count : ""}</span>
          <div className="w-full flex items-end" style={{ height: "56px" }}>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: d.count > 0 ? `${Math.max((d.count / max) * 100, 8)}%` : "2px",
                background: d.count > 0 ? "#f59e0b" : "#1e2235",
                opacity: d.count > 0 ? 0.85 : 0.4,
              }}
            />
          </div>
          <span className="text-xs text-white/40 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditorDashboard({ projectList: projectListProp, certCount }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const projects = useMemo(() => {
    if (projectListProp && projectListProp.length > 0) return projectListProp;
    return loadProjectsFromLS();
  }, [projectListProp]);

  const epValues = projects.map(p => p.ep).filter(v => v != null);
  const epMediu  = epValues.length
    ? Math.round(epValues.reduce((a, b) => a + b, 0) / epValues.length)
    : null;

  const classDist = useMemo(() => {
    const counts = {};
    CLASS_ORDER.forEach(c => (counts[c] = 0));
    projects.forEach(p => { if (counts[p.cls] != null) counts[p.cls]++; });
    return counts;
  }, [projects]);
  const maxCount = Math.max(...Object.values(classDist), 1);

  const topEPMax = useMemo(() =>
    [...projects].filter(p => p.ep != null).sort((a, b) => b.ep - a.ep).slice(0, 5),
  [projects]);
  const topEPMin = useMemo(() =>
    [...projects].filter(p => p.ep != null).sort((a, b) => a.ep - b.ep).slice(0, 5),
  [projects]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("ro-RO", { month: "short" }),
        count: 0,
      };
    });
    projects.forEach(p => {
      if (!p.savedDate) return;
      const key = String(p.savedDate).slice(0, 7);
      const m = months.find(m => m.key === key);
      if (m) m.count++;
    });
    return months;
  }, [projects]);

  const catData = useMemo(() => {
    const counts = {};
    projects.forEach(p => {
      const cat = p.category || "Necategorizat";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value], i) => ({
      label, value, color: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [projects]);

  async function exportPDF() {
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString("ro-RO");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(245, 158, 11);
      doc.text("Statistici Auditor Energetic", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "normal");
      doc.text(`Generat: ${now}`, 14, 26);

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.line(14, 30, 196, 30);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Rezumat", 14, 40);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Total proiecte: ${projects.length}`, 14, 50);
      doc.text(`EP mediu: ${epMediu != null ? epMediu + " kWh/m\u00B2an" : "—"}`, 14, 58);
      doc.text(`Certificate emise (prop): ${certCount ?? "—"}`, 14, 66);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("Distributie clase energetice", 14, 80);

      let yPos = 88;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      CLASS_ORDER.forEach(cls => {
        doc.setTextColor(180, 180, 180);
        doc.text(`Clasa ${cls}: ${classDist[cls]} proiecte`, 14, yPos);
        yPos += 7;
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("Top 5 EP maxim", 14, yPos + 6);
      yPos += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      topEPMax.forEach((p, i) => {
        doc.setTextColor(180, 180, 180);
        doc.text(`${i + 1}. ${p.address} — ${p.ep.toFixed(1)} kWh/m\u00B2an (Cls. ${p.cls})`, 14, yPos);
        yPos += 7;
      });

      doc.save(`statistici_auditor_${now.replace(/\./g, "-")}.pdf`);
    } catch (err) {
      alert("Eroare la generarea PDF: " + err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  const totalProj = projects.length;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total proiecte",    value: totalProj,                      color: "text-white" },
          { label: "EP mediu",          value: epMediu != null ? `${epMediu}` : "—", unit: "kWh/m²an", color: "text-amber-400" },
          { label: "Certificate emise", value: certCount ?? totalProj,         color: "text-sky-400" },
          { label: "Proiecte A/A+/B",   value: projects.filter(p => ["A+","A","B"].includes(p.cls)).length, color: "text-emerald-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className={cn("text-2xl font-bold", kpi.color)}>
              {kpi.value}{kpi.unit && <span className="text-sm font-normal opacity-60 ml-1">{kpi.unit}</span>}
            </div>
            <div className="text-xs text-white/50 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Distribuție clase */}
      <Card title="Distribuție clase energetice">
        {totalProj === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">Nu există proiecte în localStorage.</p>
        ) : (
          <div className="flex items-end justify-around gap-2 h-36">
            {CLASS_ORDER.map(cls => {
              const count = classDist[cls];
              const col = CLASS_COLORS[cls];
              return (
                <div key={cls} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-semibold" style={{ color: col.text }}>
                    {count > 0 ? count : ""}
                  </span>
                  <div className="w-full flex items-end" style={{ height: "80px" }}>
                    <div className="w-full rounded-t transition-all"
                      style={{
                        height: count > 0 ? `${Math.max((count / maxCount) * 100, 5)}%` : "2px",
                        background: count > 0 ? col.bar : "#1e2235",
                        opacity: count > 0 ? 0.85 : 0.35,
                      }} />
                  </div>
                  <span className="text-xs font-bold text-white">{cls}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Grafic lunar + Distribuție categorii */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Certificate emise — ultimele 12 luni">
          {totalProj === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Fără date.</p>
          ) : (
            <MonthlyChart data={monthlyData} />
          )}
        </Card>

        <Card title="Distribuție categorii clădiri">
          {catData.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Fără date.</p>
          ) : (
            <PieChart data={catData} size={110} />
          )}
        </Card>
      </div>

      {/* Top clădiri EP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top 5 — EP cel mai mare">
          {topEPMax.length === 0 ? (
            <p className="text-white/30 text-sm py-2">Fără date EP.</p>
          ) : (
            <div className="space-y-2">
              {topEPMax.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-white/30 w-4">{i + 1}.</span>
                    <span className="text-xs text-white/70 truncate">{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-red-400">{p.ep.toFixed(0)}</span>
                    <span className="text-xs text-white/30">kWh/m²</span>
                    <Badge color="red">{p.cls}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Top 5 — EP cel mai mic">
          {topEPMin.length === 0 ? (
            <p className="text-white/30 text-sm py-2">Fără date EP.</p>
          ) : (
            <div className="space-y-2">
              {topEPMin.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-white/30 w-4">{i + 1}.</span>
                    <span className="text-xs text-white/70 truncate">{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-semibold text-emerald-400">{p.ep.toFixed(0)}</span>
                    <span className="text-xs text-white/30">kWh/m²</span>
                    <Badge color="green">{p.cls}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Export PDF */}
      <div className="flex justify-end">
        <button onClick={exportPDF} disabled={pdfLoading || totalProj === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {pdfLoading ? (
            <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          )}
          Export PDF statistici
        </button>
      </div>
    </div>
  );
}
