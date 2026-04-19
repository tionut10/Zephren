// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-changelog.js
// Ultima generare: 2026-04-19

export const APP_VERSION = "0.3.0";
export const CHANGELOG = [
  {
    "version": "0.3.0",
    "week": "Săpt. 3",
    "dateRange": "13 – 19 apr 2026",
    "color": "#f59e0b",
    "label": "CURENT",
    "items": [
      {
        "icon": "✨",
        "text": "feat(api): consolidează preview-docx+preview-pdf în preview-document"
      },
      {
        "icon": "🔸",
        "text": "chore(dev): activează --host pentru npm run dev (acces LAN)"
      },
      {
        "icon": "🔸",
        "text": "actualizare fișiere auto-generate (changelog + program-stats)"
      },
      {
        "icon": "🔸",
        "text": "P1-3: EPBD rescalare A-G — sistem versioning praguri"
      },
      {
        "icon": "📥",
        "text": "P1-2: OCR facturi Claude Vision — prompt specializat distribuitori RO"
      },
      {
        "icon": "🔸",
        "text": "P1-1: Stripe Customer Portal în create-checkout.js (fără fișier nou)"
      },
      {
        "icon": "📋",
        "text": "P0-5: checklist migrare GDPR pas-cu-pas pentru Supabase Dashboard"
      },
      {
        "icon": "📄",
        "text": "P0-4: TTL 1 oră pe Vercel Blob în preview-docx.js"
      }
    ]
  },
  {
    "version": "0.2.0",
    "week": "Săpt. 2",
    "dateRange": "6 – 12 apr 2026",
    "color": "#6366f1",
    "label": "",
    "items": [
      {
        "icon": "📄",
        "text": "culori litere sageti CPE (A/A+/G=alb, B-F=negru) + auto-preview la deschidere Pas 6 + ascundere sageti duplica"
      },
      {
        "icon": "✨",
        "text": "preview CPE via Vercel Blob + Office Online Viewer (rendering Word-fidel)"
      },
      {
        "icon": "📄",
        "text": "scalare responsivă + săgeți CSS injectate în preview CPE (CLĂDIRE REALĂ/REF/CO2)"
      },
      {
        "icon": "📄",
        "text": "scalare corectă docx-preview + ascunde doar elementele floating din afara paginii"
      },
      {
        "icon": "📄",
        "text": "docx-preview - overflow hidden pe pagini, constrângere săgeți indicator"
      },
      {
        "icon": "🔧",
        "text": "TDZ epRefMax - mut calculul qfRef după declararea const epRefMax"
      },
      {
        "icon": "✨",
        "text": "preview CPE cu docx-preview (identic cu fișierul descărcat)"
      },
      {
        "icon": "📄",
        "text": "completare automată xx,x energie finală clădire referință în CPE"
      }
    ]
  },
  {
    "version": "0.1.0",
    "week": "Săpt. 1",
    "dateRange": "30 mar – 5 apr 2026",
    "color": "#10b981",
    "label": "LANSARE",
    "items": [
      {
        "icon": "📦",
        "text": "Refactoring major: code split, JSON DB, teste, catalog extins, landing v3.2"
      },
      {
        "icon": "✨",
        "text": "Add MDLPA upload, thermography, 3D view, marketplace, push notifications"
      },
      {
        "icon": "✨",
        "text": "Add SRI, Renovation Passport, MEPI, IEQ, CHP, MCCL, Logbook, Pipeline"
      },
      {
        "icon": "✨",
        "text": "Add what-if simulation, deviz export, white-label logo, audit cleanup"
      },
      {
        "icon": "📄",
        "text": "Cleanup: remove unused docxtemplater+pizzip, note remaining TODOs"
      },
      {
        "icon": "📥",
        "text": "Fix audit items 15-23: ErrorBoundary, OAuth, favicon, PWA, XML, prices"
      },
      {
        "icon": "📋",
        "text": "Fix remaining audit items: dual Supabase, tier sync, cleanup"
      },
      {
        "icon": "💰",
        "text": "Fix critical bugs from audit: security, pricing, auth, code quality"
      }
    ]
  }
];
