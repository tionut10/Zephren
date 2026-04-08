import { useState, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";
import { useZephrenCloud } from "../lib/useZephrenCloud.js";

const LS_MEMBERS = "zephren_team_members";
const LS_ASSIGN  = "zephren_project_assignments";
const LS_LOG     = "zephren_activity_log";
const ROLES      = ["Auditor Principal", "Auditor Asociat", "Stagiar", "Administrator"];
const STATUSES   = ["În lucru", "Revizuire", "Finalizat", "Suspendat"];
const PRIORITIES = ["Urgent", "Normal", "Scăzut"];

const ls = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } };
const lsSet = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const initials = (name) => name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0,2);
const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString("ro-RO") : "–";
const fmtTS    = (iso) => iso ? new Date(iso).toLocaleString("ro-RO", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "";

function addLog(action, user, projectAddress) {
  const log = ls(LS_LOG, []);
  log.unshift({ timestamp: new Date().toISOString(), action, user, projectAddress });
  lsSet(LS_LOG, log.slice(0, 50));
}

const roleBadgeColor = (role) => ({
  "Auditor Principal": "bg-amber-500/20 text-amber-300",
  "Auditor Asociat":   "bg-blue-500/20 text-blue-300",
  "Stagiar":           "bg-green-500/20 text-green-300",
  "Administrator":     "bg-purple-500/20 text-purple-300",
}[role] ?? "bg-slate-500/20 text-slate-300");

const loadBar = (ratio) => ratio < 0.5 ? "#22c55e" : ratio < 0.8 ? "#f59e0b" : "#ef4444";

export default function TeamDashboard({ building, auditor }) {
  const cloud   = useZephrenCloud();
  const projKey = building?.address || "Proiect curent";

  const [members,  setMembers]  = useState(() => ls(LS_MEMBERS, []));
  const [assigns,  setAssigns]  = useState(() => ls(LS_ASSIGN,  []));
  const [actLog,   setActLog]   = useState(() => ls(LS_LOG,     []));
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name:"", email:"", role: ROLES[0], certNr:"" });
  const [assign,   setAssign]   = useState(() => ls(LS_ASSIGN, []).find(a => a.projectKey === (building?.address || "Proiect curent")) || { assignedTo:"", status: STATUSES[0], deadline:"", priority: PRIORITIES[1] });

  const refreshLog = useCallback(() => setActLog(ls(LS_LOG, [])), []);

  useEffect(() => { lsSet(LS_MEMBERS, members); }, [members]);
  useEffect(() => {
    const rest = assigns.filter(a => a.projectKey !== projKey);
    const next = assign.assignedTo ? [...rest, { ...assign, projectKey: projKey }] : rest;
    lsSet(LS_ASSIGN, next);
    setAssigns(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assign]);

  const addMember = () => {
    if (!form.name.trim()) return;
    const m = { id: Date.now().toString(), ...form, activeProjects: 0, totalProjects: 0, lastActive: new Date().toISOString() };
    const next = [...members, m];
    setMembers(next);
    addLog(`Membru adăugat: ${m.name}`, auditor || "–", projKey);
    refreshLog();
    setForm({ name:"", email:"", role: ROLES[0], certNr:"" });
    setShowForm(false);
  };

  const deleteMember = (id) => {
    const m = members.find(x => x.id === id);
    setMembers(members.filter(x => x.id !== id));
    addLog(`Membru eliminat: ${m?.name}`, auditor || "–", projKey);
    refreshLog();
  };

  const saveAssign = () => {
    addLog(`Proiect asignat: ${projKey}`, auditor || "–", projKey);
    refreshLog();
  };

  // KPIs
  const activeAuditors = members.filter(m => {
    const la = m.lastActive ? new Date(m.lastActive) : null;
    return la && (Date.now() - la.getTime()) < 30 * 86400_000;
  }).length;
  const inProgress   = assigns.filter(a => a.status === "În lucru").length;
  const finishedMonth = assigns.filter(a => {
    if (a.status !== "Finalizat" || !a.deadline) return false;
    const d = new Date(a.deadline);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const urgentDeadlines = assigns.filter(a => {
    if (!a.deadline || a.status === "Finalizat") return false;
    return (new Date(a.deadline).getTime() - Date.now()) < 7 * 86400_000;
  }).length;

  // Workload
  const maxActive = Math.max(1, ...members.map(m => m.activeProjects || 0));

  // CSV export
  const exportCSV = () => {
    const rows = [
      ["Nume","Email","Rol","Nr. Cert.","Proiecte active","Total","Ultima activitate"],
      ...members.map(m => [m.name, m.email, m.role, m.certNr, m.activeProjects, m.totalProjects, fmtDate(m.lastActive)]),
      [],
      ["Proiect","Asignat","Status","Prioritate","Deadline"],
      ...assigns.map(a => {
        const mem = members.find(m => m.id === a.assignedTo);
        return [a.projectKey, mem?.name || "–", a.status, a.priority, fmtDate(a.deadline)];
      })
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "echipa_zephren.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Dashboard Echipă
        </h2>
        <div className="flex gap-2">
          {cloud?.user && <span className="text-xs text-green-400 opacity-70">● Cloud conectat</span>}
          <button onClick={exportCSV} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Auditori activi",      val: activeAuditors,  color:"text-amber-400" },
          { label:"Proiecte în lucru",    val: inProgress,      color:"text-blue-400" },
          { label:"Finalizate luna ac.",  val: finishedMonth,   color:"text-green-400" },
          { label:"Deadline-uri <7 zile", val: urgentDeadlines, color: urgentDeadlines > 0 ? "text-red-400" : "text-slate-400" },
        ].map(k => (
          <div key={k.label} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
            <div className={cn("text-2xl font-bold", k.color)}>{k.val}</div>
            <div className="text-xs text-slate-400">{k.label}</div>
          </div>
        ))}
      </div>

      {/* 2-column layout */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* LEFT: Members panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Membri echipă</span>
            <button onClick={() => setShowForm(!showForm)}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors">
              {showForm ? "Anulează" : "+ Adaugă"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              {[["Nume","name","text"],["Email","email","email"],["Nr. Certificat","certNr","text"]].map(([lbl,key,type]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1">{lbl}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={addMember} className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-2 rounded-lg text-sm transition-colors">
                Adaugă Membru
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{scrollbarWidth:"thin"}}>
            {members.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Niciun membru adăugat.</p>
            )}
            {members.map(m => (
              <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xs font-bold flex-shrink-0">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200 truncate">{m.name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", roleBadgeColor(m.role))}>{m.role}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-2 mt-0.5 flex-wrap">
                    {m.certNr && <span>Cert. {m.certNr}</span>}
                    <span>{m.activeProjects ?? 0} active</span>
                    <span>Activ: {fmtDate(m.lastActive)}</span>
                  </div>
                </div>
                <button onClick={() => deleteMember(m.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Workload SVG chart */}
          {members.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-2 font-medium">Încărcare proiecte</div>
              <svg width="100%" height={members.length * 22 + 4} style={{display:"block"}}>
                {members.map((m, i) => {
                  const ratio  = (m.activeProjects || 0) / maxActive;
                  const barW   = Math.max(ratio * 160, 2);
                  const color  = loadBar(ratio);
                  return (
                    <g key={m.id} transform={`translate(0,${i * 22})`}>
                      <text x="0" y="14" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">{initials(m.name)}</text>
                      <rect x="28" y="4" width={barW} height="13" rx="3" fill={color} opacity="0.7"/>
                      <text x={barW + 32} y="14" fill="#64748b" fontSize="9" fontFamily="sans-serif">{m.activeProjects || 0}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* RIGHT: Stats + Assignment + Activity */}
        <div className="space-y-3">
          {/* Project assignment */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="text-sm font-medium text-slate-300 truncate">Asignare: {projKey}</div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Asignat la</label>
              <select value={assign.assignedTo} onChange={e => setAssign(a => ({...a, assignedTo: e.target.value}))}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50">
                <option value="">— Neasignat —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select value={assign.status} onChange={e => setAssign(a => ({...a, status: e.target.value}))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Prioritate</label>
                <select value={assign.priority} onChange={e => setAssign(a => ({...a, priority: e.target.value}))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Deadline</label>
                <input type="date" value={assign.deadline || ""} onChange={e => setAssign(a => ({...a, deadline: e.target.value}))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none" />
              </div>
            </div>
            <button onClick={saveAssign} className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 py-2 rounded-lg text-sm transition-colors">
              Salvează Asignare
            </button>
          </div>

          {/* Activity log */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-sm font-medium text-slate-300 mb-2">Jurnal activitate</div>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1" style={{scrollbarWidth:"thin"}}>
              {actLog.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-3">Nicio activitate înregistrată.</p>
              )}
              {actLog.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <svg className="flex-shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-slate-500 flex-shrink-0">{fmtTS(e.timestamp)}</span>
                  <span className="flex-1 text-slate-300">{e.action}</span>
                  {e.user && e.user !== "–" && <span className="text-slate-500 flex-shrink-0">{e.user}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
