// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-changelog.js
// Ultima generare: 2026-04-26

export const APP_VERSION = "0.4.0";
export const CHANGELOG = [
  {
    "version": "0.4.0",
    "week": "Săpt. 4",
    "dateRange": "20 – 26 apr 2026",
    "color": "#f59e0b",
    "label": "CURENT",
    "items": [
      {
        "icon": "📄",
        "text": "4 bug-uri export PDF + curățare butoane Pas 6"
      },
      {
        "icon": "✨",
        "text": "optimizări grafice landing + light mode"
      },
      {
        "icon": "📄",
        "text": "fix(pdf): diacritice native + simboluri safe + Step 7 TXT→PDF"
      },
      {
        "icon": "📦",
        "text": "refactor(landing): curățare pagină principală — badge, catalog, changelog, normative"
      },
      {
        "icon": "✨",
        "text": "feat(changelog): pagină dedicată #changelog + modal WhatsNew la update"
      },
      {
        "icon": "📦",
        "text": "refactor(landing): normativ sub logo, eliminare catalog produse, changelog filtrat, export/import complet"
      },
      {
        "icon": "✨",
        "text": "adaugă Roboto-Regular.ttf pentru diacritice native în PDF"
      },
      {
        "icon": "📄",
        "text": "corectare etichete diacritice lipsă în exportPDFNative"
      }
    ]
  },
  {
    "version": "0.3.0",
    "week": "Săpt. 3",
    "dateRange": "13 – 19 apr 2026",
    "color": "#6366f1",
    "label": "",
    "items": [
      {
        "icon": "📄",
        "text": "test(smoke): E2E pentru toate template-ele MDLPA + categorii Mc 001-2022 (Etapa 6)"
      },
      {
        "icon": "📄",
        "text": "fix(penalties): legare thermalBridges în calcPenalties (BUG-8 Etapa 5)"
      },
      {
        "icon": "✨",
        "text": "feat(anexa_bloc): endpoint + injecție tabel apartamente + sisteme comune (BUG-4)"
      },
      {
        "icon": "✨",
        "text": "feat(anexa): mapping dinamic checkbox keyword→index (BUG-11 fix)"
      },
      {
        "icon": "📄",
        "text": "fix(payload): BACS/SRI/n50/longitude/penalties propagate corect + regex CPE relaxat"
      },
      {
        "icon": "✨",
        "text": "feat(cpe): pagină supliment legal cu cod unic, QR, semnătură, cadastru, pașaport"
      },
      {
        "icon": "📄",
        "text": "fix(cpe): m² lipit de valoare — concatenez la paragraf + golesc celula separată"
      },
      {
        "icon": "📄",
        "text": "fix(cpe): forțează XML <w:jc val='left'/> pentru celulele m² (fix anterior n-a avut efect vizual)"
      }
    ]
  },
  {
    "version": "0.2.0",
    "week": "Săpt. 2",
    "dateRange": "6 – 12 apr 2026",
    "color": "#10b981",
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
    "color": "#22c55e",
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
