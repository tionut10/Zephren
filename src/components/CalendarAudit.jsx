import { useState, useEffect, useMemo } from "react";
import { cn } from "./ui.jsx";
import { canAccess } from "../lib/planGating.js";
import PlanGate from "./PlanGate.jsx";

const LS_KEY = "zephren_calendar_audit";

const DAYS_RO   = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const MONTHS_RO = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
                    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

const VISIT_TYPES = [
  { value: "inspectie",  label: "Inspecție teren",   color: "bg-sky-500/25 text-sky-300 border-sky-500/30" },
  { value: "predare",    label: "Predare CPE",        color: "bg-emerald-500/25 text-emerald-300 border-emerald-500/30" },
  { value: "followup",   label: "Follow-up",          color: "bg-amber-500/25 text-amber-300 border-amber-500/30" },
  { value: "masuratori", label: "Măsurători teren",   color: "bg-violet-500/25 text-violet-300 border-violet-500/30" },
  { value: "altele",     label: "Altele",             color: "bg-white/10 text-white/50 border-white/20" },
];

function typeInfo(t) {
  return VISIT_TYPES.find(v => v.value === t) || VISIT_TYPES[VISIT_TYPES.length - 1];
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // 0=Lu, 6=Du
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function fmtHour(h) {
  if (!h) return "";
  return h;
}

function fmtDateRO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const EMPTY_FORM = { address: "", type: "inspectie", date: "", hour: "09:00", notes: "" };

function generateICS(visits) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zephren Audit Calendar//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  visits.forEach(v => {
    const dtStart = v.date.replace(/-/g, "") + (v.hour ? `T${v.hour.replace(":", "")}00` : "T090000");
    const dtEnd   = v.date.replace(/-/g, "") + (v.hour ? `T${v.hour.replace(":", "")}00` : "T100000");
    const type    = typeInfo(v.type).label;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${v.id}@zephren-audit`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${type}: ${v.address}`);
    if (v.notes) lines.push(`DESCRIPTION:${v.notes.replace(/\n/g, "\\n")}`);
    lines.push(`CATEGORIES:AUDIT ENERGETIC`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default function CalendarAudit({ onClose, userPlan }) {
  // Pricing v6.0 — Calendar audit echipă disponibil Birou+ / Edu.
  if (!canAccess(userPlan, "calendarTeam")) {
    return <PlanGate feature="calendarTeam" plan={userPlan} requiredPlan="birou" mode="upgrade" />;
  }
  return <CalendarAuditInternal onClose={onClose} />;
}

function CalendarAuditInternal({ onClose }) {
  const today = new Date();

  const [visits, setVisits] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  });

  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM, date: toDateStr(today) });
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(visits));
  }, [visits]);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.address || !form.date) return;
    setVisits(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setForm({ ...EMPTY_FORM, date: form.date });
    setShowForm(false);
  }

  function handleDelete(id) {
    setVisits(prev => prev.filter(v => v.id !== id));
  }

  function prevMonth() {
    setViewDate(({ year, month }) => month === 0
      ? { year: year - 1, month: 11 }
      : { year, month: month - 1 });
  }
  function nextMonth() {
    setViewDate(({ year, month }) => month === 11
      ? { year: year + 1, month: 0 }
      : { year, month: month + 1 });
  }

  const visitsByDate = useMemo(() => {
    const map = {};
    visits.forEach(v => {
      if (!map[v.date]) map[v.date] = [];
      map[v.date].push(v);
    });
    return map;
  }, [visits]);

  // Vizite azi + 7 zile
  const upcoming = useMemo(() => {
    const todayStr = toDateStr(today);
    const limitStr = toDateStr(addDays(today, 7));
    return [...visits]
      .filter(v => v.date >= todayStr && v.date <= limitStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.hour || "").localeCompare(b.hour || ""));
  }, [visits, today]);

  const { year, month } = viewDate;
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOW   = getFirstDayOfWeek(year, month);
  const todayStr     = toDateStr(today);

  function exportICS() {
    const ics = generateICS(visits);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vizite_audit.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const selectedVisits = selectedDate ? (visitsByDate[selectedDate] || []) : [];

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Calendar Audit</h2>
            <p className="text-xs text-white/40 mt-0.5">Programare vizite și inspecții</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(v => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all">
              {showForm ? "Anulează" : "+ Vizită nouă"}
            </button>
            <button onClick={exportICS} disabled={!visits.length}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Export .ics pentru Google Calendar / Outlook">
              Export .ics
            </button>
            {onClose && (
              <button onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Formular */}
          {showForm && (
            <form onSubmit={handleAdd}
              className="bg-white/5 border border-amber-500/20 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Adaugă vizită</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">Adresă *</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required
                    placeholder="Str. Exemplu nr. 1, București"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">Tip vizită</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-white/80">
                    {VISIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">Ora</label>
                  <input value={form.hour} onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                    type="time"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-white/80" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">Data *</label>
                  <input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    type="date" required
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-white/80" />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium uppercase tracking-wider text-white/50">Note</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Observații, contact, etc."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-white/25" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all">
                  Salvează vizita
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM, date: toDateStr(today) }); }}
                  className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
                  Anulează
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Calendar grid */}
            <div className="lg:col-span-2">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <h3 className="text-sm font-semibold text-white">
                    {MONTHS_RO[month]} {year}
                  </h3>
                  <button onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                {/* Zile săptămână */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_RO.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-white/30 py-1">{d}</div>
                  ))}
                </div>

                {/* Celule */}
                <div className="grid grid-cols-7 gap-0.5">
                  {/* Padding zile anterioare */}
                  {Array.from({ length: firstDayOW }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day    = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isToday    = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const dayVisits  = visitsByDate[dateStr] || [];
                    return (
                      <button key={day}
                        onClick={() => setSelectedDate(s => s === dateStr ? null : dateStr)}
                        className={cn(
                          "relative flex flex-col items-center py-1.5 rounded-lg transition-all text-xs font-medium",
                          isToday && "ring-1 ring-amber-500/60",
                          isSelected ? "bg-amber-500/25 text-amber-300" : "hover:bg-white/10 text-white/70",
                        )}>
                        <span>{day}</span>
                        {dayVisits.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                            {dayVisits.slice(0, 3).map((v, vi) => {
                              const ti = typeInfo(v.type);
                              return (
                                <span key={vi} className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    background: v.type === "inspectie" ? "#38bdf8"
                                      : v.type === "predare"    ? "#34d399"
                                      : v.type === "followup"   ? "#fbbf24"
                                      : v.type === "masuratori" ? "#a78bfa"
                                      : "#ffffff40"
                                  }} />
                              );
                            })}
                            {dayVisits.length > 3 && <span className="text-[8px] text-white/40">+{dayVisits.length-3}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Vizite zi selectată */}
                {selectedDate && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                      {fmtDateRO(selectedDate)}
                    </h4>
                    {selectedVisits.length === 0 ? (
                      <p className="text-xs text-white/30">Nicio vizită în această zi.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedVisits.map(v => {
                          const ti = typeInfo(v.type);
                          return (
                            <div key={v.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                              <span className={cn("text-xs px-2 py-0.5 rounded border whitespace-nowrap mt-0.5", ti.color)}>{ti.label}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-white/80">{v.address}</div>
                                {v.hour && <div className="text-xs text-amber-400/70">{v.hour}</div>}
                                {v.notes && <div className="text-xs text-white/40 mt-0.5">{v.notes}</div>}
                              </div>
                              <button onClick={() => handleDelete(v.id)}
                                className="text-white/20 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0">×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reminder: azi + 7 zile */}
            <div className="space-y-3">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Vizite — azi și 7 zile
                </h3>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-white/30">Nicio vizită programată în săptămâna curentă.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcoming.map(v => {
                      const ti     = typeInfo(v.type);
                      const isToday = v.date === todayStr;
                      return (
                        <div key={v.id}
                          className={cn("p-2.5 rounded-lg border transition-all",
                            isToday
                              ? "bg-amber-500/10 border-amber-500/25"
                              : "bg-white/[0.02] border-white/[0.06]")}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {isToday && <span className="text-[10px] font-bold text-amber-400 uppercase">AZI</span>}
                                <span className="text-[10px] text-white/40">{fmtDateRO(v.date)}</span>
                                {v.hour && <span className="text-[10px] text-amber-400/70">{v.hour}</span>}
                              </div>
                              <div className="text-xs font-medium text-white/80 truncate">{v.address}</div>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border mt-1 inline-block", ti.color)}>{ti.label}</span>
                              {v.notes && <div className="text-[10px] text-white/40 mt-1">{v.notes}</div>}
                            </div>
                            <button onClick={() => handleDelete(v.id)}
                              className="text-white/20 hover:text-red-400 transition-colors text-base leading-none flex-shrink-0">×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legendă */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Tipuri vizite</h3>
                <div className="space-y-1.5">
                  {VISIT_TYPES.map(t => (
                    <div key={t.value} className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", t.color)}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/25 text-right">
            {visits.length} vizite salvate local · Export .ics compatibil Google Calendar, Outlook, Apple Calendar
          </p>
        </div>
      </div>
    </div>
  );
}
