import { useState, useMemo, useEffect } from "react";
import { cn } from "./ui.jsx";
import { getExpiryDate, getValidityYears, getNotificationIntervals } from "../utils/cpe-validity.js";

/**
 * CPENotificationManager — Gestionare notificări expirare CPE către proprietari
 *
 * Funcționalități:
 * 1. Programare notificări email la 12, 6, 3 luni și la expirare
 * 2. Template-uri email personalizabile
 * 3. Istoric notificări trimise
 * 4. Integrare cu servicii email (EmailJS / Supabase Edge Functions)
 */

const LS_KEY = "zephren_cpe_notifications";

const NOTIFICATION_INTERVALS = [
  { id: "12m", label: "12 luni înainte", months: 12, icon: "🟢" },
  { id: "6m",  label: "6 luni înainte",  months: 6,  icon: "🟡" },
  { id: "3m",  label: "3 luni înainte",  months: 3,  icon: "🟠" },
  { id: "1m",  label: "1 lună înainte",  months: 1,  icon: "🔴" },
  { id: "exp", label: "La expirare",      months: 0,  icon: "⛔" },
];

const DEFAULT_TEMPLATE = {
  subject: "Certificat de performanță energetică — expirare iminentă",
  body: `Stimate/Stimată {{proprietar}},

Certificatul de performanță energetică (CPE) al imobilului situat la adresa:

  {{adresa}}

emis la data de {{data_emitere}} expiră la {{data_expirare}} ({{interval}}).

Conform Directivei UE 2024/1275 (EPBD IV) Art. 17, valabilitatea CPE este de {{valabilitate_ani}} ani pentru clasa energetică {{clasa}} a clădirii dumneavoastră. Pentru reînnoire, este necesară o nouă evaluare energetică de către un auditor atestat.

Vă recomandăm să planificați reînnoirea din timp pentru a evita orice inconveniență legală sau financiară.

Cu stimă,
{{auditor_nume}}
Auditor energetic atestat — Legitimație nr. {{auditor_legitimatie}}

---
Mesaj generat automat de Zephren Energy Calculator.
Pentru dezabonare, răspundeți cu „STOP" la acest email.`,
};

const SEND_METHODS = [
  { id: "email",    label: "Email",        icon: "📧", available: true },
  { id: "sms",      label: "SMS",          icon: "📱", available: false },
  { id: "whatsapp", label: "WhatsApp",     icon: "💬", available: false },
];

function expiryDate(issueDate, energyClass) {
  return getExpiryDate(issueDate, energyClass);
}

function monthsUntil(date) {
  return (date - new Date()) / (1000 * 60 * 60 * 24 * 30.44);
}

export default function CPENotificationManager({
  cpeList = [],
  auditorInfo = {},
  emailService,
}) {
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (_) { return []; }
  });
  const [showTemplate, setShowTemplate]     = useState(false);
  const [template, setTemplate]             = useState(DEFAULT_TEMPLATE);
  const [sendingId, setSendingId]           = useState(null);
  const [enabledIntervals, setEnabledIntervals] = useState(["12m", "6m", "3m", "1m", "exp"]);
  const [showHistory, setShowHistory]       = useState(false);
  const [testEmail, setTestEmail]           = useState("");

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Calculează CPE-uri care necesită notificare
  const pendingNotifications = useMemo(() => {
    const pending = [];

    cpeList.forEach(cpe => {
      if (!cpe.issueDate || cpe.renewed) return;
      const exp = expiryDate(cpe.issueDate, cpe.energyClass);
      if (!exp) return;

      const months = monthsUntil(exp);

      // Sprint 15 (EPBD 2024 Art. 17) — intervale diferențiate pe clasa energetică:
      // 10 ani (A+..C) → intervale standard 12/6/3/1/exp
      // 5 ani (D..G)   → intervale proporționale 30/18/6/1/exp
      const classIntervals = getNotificationIntervals(cpe.energyClass);

      classIntervals.forEach(interval => {
        if (!enabledIntervals.includes(interval.id)) return;

        // Pentru fiecare interval, calculăm fereastra în care notificarea trebuie trimisă:
        // fereastra = (următorul interval mai mic .. intervalul curent]
        const sorted = [...classIntervals].sort((a, b) => a.months - b.months);
        const idx = sorted.findIndex(i => i.id === interval.id);
        const lowerBound = idx > 0 ? sorted[idx - 1].months : 0;

        const shouldNotify =
          (interval.months === 0 && months <= 0) ||
          (interval.months > 0 && months <= interval.months && months > lowerBound);

        if (!shouldNotify) return;

        // Verifică dacă nu a fost deja trimisă
        const alreadySent = notifications.some(n =>
          n.cpeId === cpe.id && n.intervalId === interval.id
        );

        if (!alreadySent) {
          pending.push({
            cpe,
            interval,
            months,
            email: cpe.ownerEmail || cpe.email || "",
            phone: cpe.ownerPhone || cpe.phone || "",
          });
        }
      });
    });

    return pending.sort((a, b) => a.months - b.months);
  }, [cpeList, enabledIntervals, notifications]);

  // Generează email din template
  function renderTemplate(cpe, interval) {
    const exp = expiryDate(cpe.issueDate, cpe.energyClass);
    const replacements = {
      "{{proprietar}}":         cpe.owner || "Proprietar",
      "{{adresa}}":             cpe.address || "—",
      "{{data_emitere}}":       formatDate(cpe.issueDate),
      "{{data_expirare}}":      exp ? formatDate(exp.toISOString().slice(0, 10)) : "—",
      "{{interval}}":           interval.label,
      "{{clasa}}":              cpe.energyClass || "—",
      "{{valabilitate_ani}}":   String(getValidityYears(cpe.energyClass)),
      "{{auditor_nume}}":       auditorInfo.name || "—",
      "{{auditor_legitimatie}}": auditorInfo.license_number || "—",
    };

    let subject = template.subject;
    let body = template.body;
    Object.entries(replacements).forEach(([key, val]) => {
      subject = subject.replaceAll(key, val);
      body = body.replaceAll(key, val);
    });

    return { subject, body };
  }

  // Trimite notificare
  async function sendNotification(cpe, interval, email) {
    if (!email) return;

    const id = `${cpe.id}_${interval.id}`;
    setSendingId(id);

    const { subject, body } = renderTemplate(cpe, interval);

    try {
      if (emailService?.send) {
        await emailService.send({ to: email, subject, body });
      } else {
        // Fallback: mailto link
        const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, "_blank");
      }

      // Înregistrează notificarea ca trimisă
      setNotifications(prev => [...prev, {
        id: `n_${Date.now()}`,
        cpeId: cpe.id,
        intervalId: interval.id,
        email,
        sentAt: new Date().toISOString(),
        method: emailService?.send ? "api" : "mailto",
      }]);
    } catch (err) {
      console.error("[CPENotificationManager] Eroare trimitere:", err);
    } finally {
      setSendingId(null);
    }
  }

  // Trimite toate notificările pending
  async function sendAll() {
    for (const p of pendingNotifications) {
      if (p.email) await sendNotification(p.cpe, p.interval, p.email);
    }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function toggleInterval(id) {
    setEnabledIntervals(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const sentCount = notifications.length;
  const pendingCount = pendingNotifications.length;
  const withEmail = pendingNotifications.filter(p => p.email).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
          Notificări expirare CPE — Proprietari
        </h3>
        <div className="flex gap-2">
          <span className="text-xs text-white/30">{sentCount} trimise</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              {pendingCount} de trimis
            </span>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="CPE monitorizate" value={cpeList.length} color="text-white/60" />
        <KPI label="Notificări necesare" value={pendingCount} color={pendingCount > 0 ? "text-red-400" : "text-emerald-400"} />
        <KPI label="Cu email configurat" value={withEmail} color="text-blue-400" />
        <KPI label="Deja trimise" value={sentCount} color="text-emerald-400" />
      </div>

      {/* Intervale de notificare */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Intervale de notificare</div>
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_INTERVALS.map(interval => (
            <button key={interval.id} onClick={() => toggleInterval(interval.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                enabledIntervals.includes(interval.id)
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10")}>
              {interval.icon} {interval.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metode de trimitere */}
      <div className="flex flex-wrap gap-2">
        {SEND_METHODS.map(method => (
          <div key={method.id}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border",
              method.available
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-white/5 text-white/20 border-white/10")}>
            {method.icon} {method.label}
            {!method.available && <span className="ml-1 text-[10px]">(în curând)</span>}
          </div>
        ))}
      </div>

      {/* Lista notificări pending */}
      {pendingNotifications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Notificări de trimis ({pendingCount})
            </div>
            {withEmail > 0 && (
              <button onClick={sendAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all">
                Trimite toate ({withEmail})
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white/40">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white/40">Adresă</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white/40">Proprietar</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white/40">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-white/40">Interval</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-white/40">Acțiune</th>
                </tr>
              </thead>
              <tbody>
                {pendingNotifications.map((p, i) => {
                  const id = `${p.cpe.id}_${p.interval.id}`;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2">{p.interval.icon}</td>
                      <td className="px-3 py-2 text-white/70 max-w-[180px] truncate">{p.cpe.address}</td>
                      <td className="px-3 py-2 text-white/50 text-xs">{p.cpe.owner || "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {p.email ? (
                          <span className="text-blue-400">{p.email}</span>
                        ) : (
                          <span className="text-red-400/60">lipsă email</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/40">{p.interval.label}</td>
                      <td className="px-3 py-2 text-center">
                        {p.email ? (
                          <button
                            onClick={() => sendNotification(p.cpe, p.interval, p.email)}
                            disabled={sendingId === id}
                            className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-40">
                            {sendingId === id ? "..." : "Trimite"}
                          </button>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingNotifications.length === 0 && (
        <div className="text-center py-8 text-white/30 text-sm border border-white/5 rounded-xl bg-white/[0.02]">
          {cpeList.length === 0
            ? "Nu există CPE-uri monitorizate. Adăugați certificate din CPE Alert System."
            : "Toate notificările au fost trimise sau nu sunt necesare momentan."}
        </div>
      )}

      {/* Template editor */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowTemplate(v => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
          {showTemplate ? "Ascunde template" : "Editare template email"}
        </button>
        <button onClick={() => setShowHistory(v => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all">
          Istoric notificări ({sentCount})
        </button>
      </div>

      {showTemplate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Template email notificare</div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Subiect</label>
            <input value={template.subject} onChange={e => setTemplate(t => ({ ...t, subject: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-all" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Corp email</label>
            <textarea value={template.body} onChange={e => setTemplate(t => ({ ...t, body: e.target.value }))}
              rows={12}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:border-amber-500/50 transition-all resize-y" />
          </div>
          <div className="text-xs text-white/25">
            Variabile: {"{{proprietar}}"}, {"{{adresa}}"}, {"{{data_emitere}}"}, {"{{data_expirare}}"}, {"{{interval}}"}, {"{{clasa}}"}, {"{{valabilitate_ani}}"}, {"{{auditor_nume}}"}, {"{{auditor_legitimatie}}"}
          </div>
          <button onClick={() => setTemplate(DEFAULT_TEMPLATE)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-all">
            Resetează template implicit
          </button>
        </div>
      )}

      {/* Istoric */}
      {showHistory && notifications.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Istoric notificări trimise</div>
          {notifications.slice(0, 20).map(n => (
            <div key={n.id} className="flex items-center gap-3 text-xs text-white/40 py-1 border-b border-white/5">
              <span className="text-emerald-400">Trimis</span>
              <span>{n.email}</span>
              <span>{n.intervalId}</span>
              <span className="text-white/20">{new Date(n.sentAt).toLocaleString("ro-RO")}</span>
              <span className="text-white/15">{n.method}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-white/20 text-right">
        EPBD 2024/1275 Art. 17 — CPE valid 10 ani (clase A+..C) / 5 ani (clase D..G) · Email via mailto / EmailJS / Supabase Edge · SMS în dezvoltare
      </p>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}
