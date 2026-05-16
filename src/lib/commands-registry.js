// ═══════════════════════════════════════════════════════════════
// COMMANDS REGISTRY — Command Palette Ctrl+K (D3 Sprint Optimizări 16 mai 2026)
// ═══════════════════════════════════════════════════════════════
//
// Pattern: comenzile sunt obiecte pure cu metadate + action(ctx).
// Context (ctx) e injectat la apel din CommandPalette.jsx la nivelul
// energy-calc.jsx, unde toate state-urile + handler-ele sunt disponibile.
//
// Filtering:
// - `requires.step`     — comanda apare doar când currentStep === step
// - `requires.plan`     — comanda are nevoie de plan >= cerut (gating canAccess)
//                         dacă plan insuficient → afișat grayed-out cu badge upgrade
// - `requires.always`   — comanda apare oriunde (default true)
//
// Recent commands: tracked în localStorage `zephren_cmdk_recent`
// (FIFO top 5, ID-uri).
// ═══════════════════════════════════════════════════════════════

export const COMMAND_GROUPS = {
  NAVIGARE: "🧭 Navigare",
  EXPORT: "📤 Export",
  ACTIUNI: "⚡ Acțiuni rapide",
  MODULE: "🧩 Module Pas 7-8",
  IMPORT: "📥 Import",
  SETTINGS: "⚙️ Setări",
  HELP: "❓ Ajutor",
  PROJECT: "📁 Proiect",
};

/**
 * Registry comenzi.
 * Fiecare comandă = { id, label, group, icon?, keywords?, requires?, action(ctx) }
 *
 * @typedef {Object} CommandContext
 * @property {number} currentStep
 * @property {(s:number)=>void} setStep
 * @property {string} userPlan
 * @property {()=>void} [exportProject]
 * @property {(name:string)=>void} [toggleModal]
 * @property {()=>void} [undo]
 * @property {()=>void} [redo]
 * @property {(msg:string)=>void} [showToast]
 */

export const COMMANDS = [
  // ─── NAVIGARE (8 comenzi Pas 1-8) ───────────────────────────
  { id: "nav.pas1", label: "Mergi la Pas 1 — Identificare clădire", group: COMMAND_GROUPS.NAVIGARE, icon: "1️⃣", keywords: ["identificare", "date", "client", "adresa"], action: ctx => ctx.setStep(1) },
  { id: "nav.pas2", label: "Mergi la Pas 2 — Anvelopă clădire", group: COMMAND_GROUPS.NAVIGARE, icon: "2️⃣", keywords: ["pereti", "acoperis", "ferestre", "anvelopa", "envelope"], action: ctx => ctx.setStep(2) },
  { id: "nav.pas3", label: "Mergi la Pas 3 — Instalații", group: COMMAND_GROUPS.NAVIGARE, icon: "3️⃣", keywords: ["instalatii", "incalzire", "acm", "ventilatie"], action: ctx => ctx.setStep(3) },
  { id: "nav.pas4", label: "Mergi la Pas 4 — Surse regenerabile", group: COMMAND_GROUPS.NAVIGARE, icon: "4️⃣", keywords: ["pv", "solar", "fotovoltaic", "pompa de caldura", "res", "regenerabile"], action: ctx => ctx.setStep(4) },
  { id: "nav.pas5", label: "Mergi la Pas 5 — Calcul bilanț energetic", group: COMMAND_GROUPS.NAVIGARE, icon: "5️⃣", keywords: ["bilant", "ep", "clasa", "energie", "iso 13790"], action: ctx => ctx.setStep(5) },
  { id: "nav.pas6", label: "Mergi la Pas 6 — Certificat CPE", group: COMMAND_GROUPS.NAVIGARE, icon: "6️⃣", keywords: ["cpe", "certificat", "auditor", "semnatura", "anexa"], action: ctx => ctx.setStep(6) },
  { id: "nav.pas7", label: "Mergi la Pas 7 — Audit energetic + AAECR", group: COMMAND_GROUPS.NAVIGARE, icon: "7️⃣", requires: { plan: "ici" }, keywords: ["audit", "aaecr", "npv", "rehab", "masuri", "pasaport"], action: ctx => ctx.setStep(7) },
  { id: "nav.pas8", label: "Mergi la Pas 8 — Module avansate (Expert)", group: COMMAND_GROUPS.NAVIGARE, icon: "8️⃣", requires: { plan: "expert" }, keywords: ["expert", "monte carlo", "bim", "reconciliere"], action: ctx => ctx.setStep(8) },

  // ─── EXPORT (6 comenzi) ────────────────────────────────────
  { id: "export.cpe", label: "Export CPE PDF/A-3", group: COMMAND_GROUPS.EXPORT, icon: "📄", keywords: ["certificat", "pdf", "anexa", "mdlpa"], requires: { step: 6 },
    action: ctx => ctx.showToast?.("Mergi la Pas 6 → buton Generează CPE PDF") || ctx.setStep(6) },
  { id: "export.audit", label: "Export Raport audit DOCX", group: COMMAND_GROUPS.EXPORT, icon: "📝", keywords: ["docx", "word", "raport", "aaecr"], requires: { plan: "ici", step: 7 },
    action: ctx => ctx.showToast?.("Mergi la Pas 7 → buton Generează Raport audit") || ctx.setStep(7) },
  { id: "export.passport", label: "Export Pașaport renovare DOCX+PDF+XML", group: COMMAND_GROUPS.EXPORT, icon: "🛂", keywords: ["pasaport", "renovation", "passport", "epbd"], requires: { plan: "ici", step: 7 },
    action: ctx => ctx.showToast?.("Mergi la Pas 7 → Card Pașaport renovare") || ctx.setStep(7) },
  { id: "export.dossier", label: "Export Dosar AAECR ZIP complet", group: COMMAND_GROUPS.EXPORT, icon: "📦", keywords: ["dosar", "zip", "bundle", "aaecr"], requires: { plan: "ici", step: 7 },
    action: ctx => ctx.showToast?.("Mergi la Pas 7 → Card Dosar AAECR") || ctx.setStep(7) },
  { id: "export.roadmap", label: "Export Foaie de parcurs renovare", group: COMMAND_GROUPS.EXPORT, icon: "🗺️", keywords: ["foaie", "parcurs", "roadmap", "etapizat"], requires: { plan: "ici", step: 7 },
    action: ctx => ctx.showToast?.("Mergi la Pas 7 → Card Foaie de parcurs") || ctx.setStep(7) },
  { id: "export.reconciliere", label: "Export Reconciliere consum CSV", group: COMMAND_GROUPS.EXPORT, icon: "📊", keywords: ["consum", "facturi", "csv", "reconciliere"], requires: { plan: "expert", step: 8 },
    action: ctx => ctx.showToast?.("Mergi la Pas 8 → tab Reconciliere consum → Export CSV") || ctx.setStep(8) },

  // ─── ACȚIUNI RAPIDE (5 comenzi) ────────────────────────────
  { id: "action.preflight", label: "Verifică conformitate (Preflight)", group: COMMAND_GROUPS.ACTIUNI, icon: "🔍", keywords: ["preflight", "verificare", "validare", "conformitate"],
    action: ctx => ctx.showToast?.("Preflight check engine — sprint B3 în curs de implementare") },
  { id: "action.clone", label: "Clonează proiect curent ca punct start", group: COMMAND_GROUPS.ACTIUNI, icon: "📋", keywords: ["clona", "duplicate", "copiaza", "punct start", "audit similar"],
    action: ctx => ctx.cloneCurrentProject?.() || ctx.showToast?.("Funcția de clonare necesită un proiect activ salvat") },
  { id: "action.currency", label: "Comută monedă EUR ↔ RON", group: COMMAND_GROUPS.ACTIUNI, icon: "💱", keywords: ["eur", "ron", "moneda", "currency", "curs"],
    action: ctx => ctx.toggleCurrency?.() || ctx.showToast?.("Comutare monedă din sidebar settings") },
  { id: "action.save", label: "Salvează draft manual (Ctrl+S)", group: COMMAND_GROUPS.ACTIUNI, icon: "💾", keywords: ["save", "salvare", "backup", "export"],
    action: ctx => ctx.exportProject?.() || ctx.showToast?.("Ctrl+S → exportă draft JSON") },
  { id: "action.undo", label: "Anulează ultima acțiune (Ctrl+Z)", group: COMMAND_GROUPS.ACTIUNI, icon: "↩️", keywords: ["undo", "anuleaza", "reset"],
    action: ctx => ctx.undo?.() },

  // ─── MODULE Pas 7-8 (5 comenzi) ────────────────────────────
  { id: "mod.bacs", label: "Deschide BACS (EN 15232-1)", group: COMMAND_GROUPS.MODULE, icon: "🏢", keywords: ["bacs", "automation", "bms", "en 15232"], requires: { plan: "iici" },
    action: ctx => { ctx.setStep(5); ctx.showToast?.("Pas 5 → Card BACS"); } },
  { id: "mod.acm", label: "Deschide ACM (EN 15316-3)", group: COMMAND_GROUPS.MODULE, icon: "🚿", keywords: ["acm", "apa calda", "menajera", "en 15316"], requires: { plan: "iici" },
    action: ctx => { ctx.setStep(5); ctx.showToast?.("Pas 5 → Card ACM"); } },
  { id: "mod.sri", label: "Deschide SRI Smart Readiness", group: COMMAND_GROUPS.MODULE, icon: "🤖", keywords: ["sri", "smart readiness", "indicator"], requires: { plan: "iici" },
    action: ctx => { ctx.setStep(5); ctx.showToast?.("Pas 5 → Card SRI"); } },
  { id: "mod.meps", label: "Deschide MEPS verificare 2030", group: COMMAND_GROUPS.MODULE, icon: "🎯", keywords: ["meps", "epbd", "2030", "2033", "2050"], requires: { plan: "iici" },
    action: ctx => { ctx.setStep(5); ctx.showToast?.("Pas 5 → Card MEPS"); } },
  { id: "mod.npv", label: "Deschide NPV 20 ani comparativ", group: COMMAND_GROUPS.MODULE, icon: "📈", keywords: ["npv", "rentabilitate", "amortizare", "rehab"], requires: { plan: "ici", step: 7 },
    action: ctx => { ctx.setStep(7); ctx.showToast?.("Pas 7 → Card NPV 20 ani"); } },

  // ─── IMPORT (3 comenzi) ────────────────────────────────────
  { id: "import.invoice", label: "Importă factură (OCR Claude Vision)", group: COMMAND_GROUPS.IMPORT, icon: "📸", keywords: ["ocr", "factura", "enel", "engie", "vision", "ai"],
    action: ctx => { ctx.setStep(8); ctx.showToast?.("Pas 8 → Reconciliere consum → buton Importă din factură"); } },
  { id: "import.cpe", label: "Importă CPE precedent (prefill)", group: COMMAND_GROUPS.IMPORT, icon: "📂", keywords: ["cpe", "vechi", "precedent", "prefill", "audit anterior"],
    action: ctx => ctx.showToast?.("Funcție în dezvoltare — Sprint Optimizări A4") },
  { id: "import.xlsx", label: "Importă date din XLSX (template)", group: COMMAND_GROUPS.IMPORT, icon: "📊", keywords: ["xlsx", "excel", "import", "template", "bulk"],
    action: ctx => { ctx.setStep(1); ctx.showToast?.("Pas 1 → buton Importă XLSX"); } },

  // ─── SETTINGS (3 comenzi) ──────────────────────────────────
  { id: "settings.dashboard", label: "Comută Dashboard (Ctrl+D)", group: COMMAND_GROUPS.SETTINGS, icon: "📊", keywords: ["dashboard", "rezumat", "sumary"],
    action: ctx => ctx.toggleDashboard?.() },
  { id: "settings.tour", label: "Pornește tur ghidat (F1)", group: COMMAND_GROUPS.SETTINGS, icon: "🎓", keywords: ["tour", "tutorial", "ajutor", "ghidaj"],
    action: ctx => ctx.startTour?.() },
  { id: "settings.changelog", label: "Vezi ce e nou (changelog)", group: COMMAND_GROUPS.SETTINGS, icon: "📰", keywords: ["changelog", "ce e nou", "noutati", "update"],
    action: ctx => { window.location.hash = "#changelog"; } },

  // ─── HELP (4 comenzi) ──────────────────────────────────────
  { id: "help.bacs", label: "Cum funcționează BACS? (EN 15232-1)", group: COMMAND_GROUPS.HELP, icon: "📚", keywords: ["bacs explain", "documentatie", "en 15232"],
    action: ctx => ctx.showToast?.("Hover badge BACS în Pas 5 pentru narrative AI") },
  { id: "help.mc001", label: "Documentație Mc 001-2022", group: COMMAND_GROUPS.HELP, icon: "📖", keywords: ["mc 001", "normativ", "metodologie"],
    action: ctx => { window.open("https://www.mdlpa.ro/", "_blank"); } },
  { id: "help.ord348", label: "Ordinul MDLPA 348/2026 (tranziție)", group: COMMAND_GROUPS.HELP, icon: "⚖️", keywords: ["ord 348", "ordin", "tranzitie", "8 iulie 2026"],
    action: ctx => { window.open("https://www.mdlpa.ro/", "_blank"); } },
  { id: "help.tutorial", label: "Tutorial interactiv Zephren", group: COMMAND_GROUPS.HELP, icon: "🎬", keywords: ["tutorial", "ghidaj", "onboarding"],
    action: ctx => { window.location.hash = "#tutorial"; } },

  // ─── PROJECT (3 comenzi) ───────────────────────────────────
  { id: "project.new", label: "Proiect nou (resetează tot)", group: COMMAND_GROUPS.PROJECT, icon: "✨", keywords: ["nou", "new", "reset", "clean"],
    action: ctx => {
      if (confirm("Sigur vrei să resetezi proiectul curent? Datele nesalvate se vor pierde.")) {
        ctx.resetProject?.() || window.location.reload();
      }
    } },
  { id: "project.manager", label: "Deschide manager proiecte salvate", group: COMMAND_GROUPS.PROJECT, icon: "📁", keywords: ["proiecte", "salvate", "manager", "biblioteca"],
    action: ctx => ctx.openProjectManager?.() || ctx.showToast?.("Manager proiecte în dezvoltare") },
  { id: "project.export-json", label: "Exportă proiect ca JSON (backup)", group: COMMAND_GROUPS.PROJECT, icon: "📦", keywords: ["export", "json", "backup", "save"],
    action: ctx => ctx.exportProject?.() },
];

/**
 * Verifică dacă o comandă e disponibilă în contextul curent.
 * Returnează: { available: boolean, blocked: 'plan' | 'step' | null }
 */
export function checkCommandAvailability(cmd, ctx) {
  if (!cmd.requires) return { available: true, blocked: null };
  // Plan check (folosește canAccess dacă disponibil în ctx, altfel comparare ierarhică)
  if (cmd.requires.plan) {
    const planOrder = ["free", "edu", "iici", "ici", "expert", "birou", "enterprise"];
    const userIdx = planOrder.indexOf(ctx.userPlan || "free");
    const reqIdx = planOrder.indexOf(cmd.requires.plan);
    if (userIdx < reqIdx) return { available: false, blocked: "plan" };
  }
  // Step check (informativ — comanda apare oricum dacă userul vrea să navigheze)
  // Folosit doar pentru sortare (commands relevante step curent prioritizate)
  return { available: true, blocked: null };
}

/**
 * Sortare comenzi: recent first, apoi relevante pentru step curent, apoi restul.
 */
export function sortCommands(commands, ctx, recentIds = []) {
  const recentSet = new Set(recentIds);
  return [...commands].sort((a, b) => {
    const aRecent = recentSet.has(a.id) ? 0 : 1;
    const bRecent = recentSet.has(b.id) ? 0 : 1;
    if (aRecent !== bRecent) return aRecent - bRecent;

    const aStep = a.requires?.step === ctx.currentStep ? 0 : 1;
    const bStep = b.requires?.step === ctx.currentStep ? 0 : 1;
    if (aStep !== bStep) return aStep - bStep;

    return a.label.localeCompare(b.label, "ro");
  });
}

// ─── Recent commands localStorage helpers ─────────────────────
const RECENT_KEY = "zephren_cmdk_recent";
const RECENT_MAX = 5;

export function getRecentCommandIds() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch { return []; }
}

export function recordRecentCommand(id) {
  try {
    const current = getRecentCommandIds();
    const filtered = current.filter(x => x !== id);
    const next = [id, ...filtered].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignored */ }
}
