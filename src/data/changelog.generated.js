// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-changelog.js
// Ultima generare: 2026-04-12

export const APP_VERSION = "0.2.0";
export const CHANGELOG = [
  {
    "version": "0.2.0",
    "week": "Săpt. 2",
    "dateRange": "6 – 12 apr 2026",
    "color": "#f59e0b",
    "label": "CURENT",
    "items": [
      {
        "icon": "📄",
        "text": "preview CPE fallback HTML + butoane DOCX active cu upgrade prompt pe free tier"
      },
      {
        "icon": "📄",
        "text": "corelare clase energetice CPE — detectare a:t, clasificare h, table highlighting"
      },
      {
        "icon": "📄",
        "text": "CPE DOCX: fixează culoarea textului din săgețile indicator (w:color cu themeColor + DrawingML a:rPr)"
      },
      {
        "icon": "✨",
        "text": "CPE: adaugă indicator Clădire de Referință pe scala EP și CO₂; fixează culoarea textului din săgeți să corespu"
      },
      {
        "icon": "✨",
        "text": "10 template-uri noi clădiri + ROICalculator/CPETracker/AuditInvoice integrate + AuditClientDataForm auto-popul"
      },
      {
        "icon": "🔬",
        "text": "Normative în normative.json — editare manuală fără cod JS"
      },
      {
        "icon": "🔸",
        "text": "APP_VERSION dinamic din changelog: badge v0.2.0 se sincronizează automat cu istoricul versiunilor"
      },
      {
        "icon": "✨",
        "text": "Landing dinamic: secțiune 8 pași reali, features din features.json, export/import auto-derivate, 48 module cal"
      }
    ]
  },
  {
    "version": "0.1.0",
    "week": "Săpt. 1",
    "dateRange": "30 mar – 5 apr 2026",
    "color": "#6366f1",
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
