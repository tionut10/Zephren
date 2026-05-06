// GENERAT AUTOMAT — nu edita manual
// Script: scripts/update-changelog.js
// Ultima generare: 2026-05-06

export const APP_VERSION = "0.6.0";
export const CHANGELOG = [
  {
    "version": "0.6.0",
    "week": "Săpt. 6",
    "dateRange": "4 – 10 mai 2026",
    "color": "#f59e0b",
    "label": "CURENT",
    "items": [
      {
        "icon": "🔸",
        "text": "landing: mutat 2019 pe același rând cu Brașov în cardul fondator"
      },
      {
        "icon": "🚀",
        "text": "landing: eliminare linie AE Ici din cardul fondator"
      },
      {
        "icon": "🚀",
        "text": "landing: corecție denumire licență CCIA (Agricole, nu Agrozootehnice)"
      },
      {
        "icon": "🎨",
        "text": "landing: înlocuire M.Sc. cu titluri academice complete (Licență CCIA + Masterat traseu cercetare MEMC, Faculta"
      },
      {
        "icon": "📄",
        "text": "Sprint P1 cleanup — Costuri energie + curs EUR/RON live + MEPI redirect + RaportNZEB"
      },
      {
        "icon": "🔸",
        "text": "Sprint P0-C — Coerență matematică recomandări + unificare SCENARIO_PRESETS"
      },
      {
        "icon": "📋",
        "text": "Sprint P0-B — Dosar Audit AAECR + U_REF anvelopă adaptiv"
      },
      {
        "icon": "🔸",
        "text": "Sprint P0-A — Reactivare Pașaport Renovare EPBD 2024 (PREVIEW)"
      }
    ]
  },
  {
    "version": "0.5.0",
    "week": "Săpt. 5",
    "dateRange": "27 apr – 3 mai 2026",
    "color": "#6366f1",
    "label": "",
    "items": [
      {
        "icon": "🔧",
        "text": "fix(anexa): nr_persoane + secțiuni neaplicabile (radiant, debit nominal)"
      },
      {
        "icon": "🎨",
        "text": "fix(anexa): inlocuire 'nr. ......' si '(nr)' care erau split intre run-uri"
      },
      {
        "icon": "🔧",
        "text": "aliniere toleranta aspect ratio stampila 1.18→1.15 (simetric ±15%)"
      },
      {
        "icon": "✨",
        "text": "contrast panou Registru MDLPA (opacity-35→75, culori warning) + title tooltip pe Select la hover"
      },
      {
        "icon": "✨",
        "text": "Step6: completare panou Registru MDLPA — modalitate transmitere, format cod unic, invaliditate fără cod, amend"
      },
      {
        "icon": "🔧",
        "text": "fix(anexa): muta sectiunea H la final, corecteaza nr certificat si regim inaltime"
      },
      {
        "icon": "📄",
        "text": "Step6: elimină generare cod CPE local, păstrează doar index registru simplu cu persistență localStorage per au"
      },
      {
        "icon": "🔸",
        "text": "ux: butoanele 'Generează Preview' identice ca stil + mutate deasupra Card-urilor preview"
      }
    ]
  },
  {
    "version": "0.4.0",
    "week": "Săpt. 4",
    "dateRange": "20 – 26 apr 2026",
    "color": "#10b981",
    "label": "",
    "items": [
      {
        "icon": "🔸",
        "text": "S27 batch 3 — P2.6 + P2.9 + P2.12 + P2.14"
      },
      {
        "icon": "🔸",
        "text": "S27 batch 2 — P2.3 + P2.2 + P2.10 + P2.15 + P2.11"
      },
      {
        "icon": "🔸",
        "text": "S27 batch 1 — P2.5 + P2.7 + P2.4 + P2.8 + P2.13"
      },
      {
        "icon": "🔸",
        "text": "S26 P1.15+P1.16+P1.17: LCCAnalysis sincronizat + HG 906 cofinanțare variabilă"
      },
      {
        "icon": "🔸",
        "text": "S26 P1.13+P1.14+P1.18: MEPS rezidențial 2035 + invest realist + disclaimer extins"
      },
      {
        "icon": "💰",
        "text": "S26 P1.8+P1.9+P1.10+P1.11+P1.12: calibrare prețuri + praguri normative"
      },
      {
        "icon": "🚀",
        "text": "S26 P1.1+P1.2+P1.3+P1.4+P1.5+P1.6+P1.7: macro economice + financial.js îmbunătățiri"
      },
      {
        "icon": "🔸",
        "text": "S25 P0.6: smart-rehab praguri U adaptive RES/NRES/RENOVARE (varianta C)"
      }
    ]
  },
  {
    "version": "0.3.0",
    "week": "Săpt. 3",
    "dateRange": "13 – 19 apr 2026",
    "color": "#22c55e",
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
    "color": "#8b5cf6",
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
    "color": "#f97316",
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
