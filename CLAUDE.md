# Instrucțiuni Claude Code — Proiect Zephren

---

## 🤖 AUTO-SELECT MODEL & EFFORT

La **fiecare mesaj**, evaluează promptul și afișează **întotdeauna** blocul de sugestie:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 OPUS MAX  /  🟡 SONNET  /  🟢 HAIKU
Model recomandat : claude-opus-4-6
Effort recomandat: high (1M tokens)
Comandă terminal : co   sau   ca "<prompt>"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Afișează blocul chiar dacă modelul curent e deja corect — utilizatorul vrea să vadă confirmarea.
Dacă modelul curent din sesiune NU e cel recomandat, adaugă:
```
⚠️  Sesiunea curentă rulează pe <model-curent>.
    Redeschide cu: co / cs / ch  sau  ca "<prompt>"
```

### Reguli de selecție:

#### 🔴 OPUS MAX — Opus 4.6 · 1M tokens · effort high
Orice prompt conține:
- `audit`, `aprofundat`, `complet`, `arhitectur`, `architect`
- `implementez`, `implementează`, `modul nou`, `integrare`, `integrez`
- `ținând cont de`, `tinand cont de`, `adaptează`, `adapteaza`
- `verifică în detaliu`, `verifica in detaliu`
- `ce mai este util`, `ce ar mai trebui`
- `BACS EN`, `ACM EN`, `EN 15232`, `EN 15316`, `EN 16798`
- `IFC`, `BIM`, `OCR facturi`
- `refactor global`, `state management`, `migrate`, `rewrite`, `rescrie`
- `security`, `vulnerab`, `GDPR`, `encrypt`, `credential`
- `data loss`, `backup`, `corrupt`, `disaster`, `recover`
- `scale`, `memory leak`, `crash`, `1000+`
- `compliance`, `normativ`, `regulation`

#### 🟡 SONNET medium (effort medium)
Orice prompt conține:
- `fix`, `bug`, `corecte`, `repara`, `eroare`
- `feature`, `adaugă`, `modifică`, `actualizez`, `optimizează`, `optimizez`
- `verifică`, `verifica` (fără "în detaliu")
- `generează`, `genereaza`, `încearcă`, `incearca`
- `vreau să`, `vreau sa`
- `refactor component`, `optimizez`, `cache`
- `form`, `export`, `validare`, `UI`, `dark mode`, `responsive`, `landing`
- `scrie`, `creează`, `redactează`, `raport`, `document`, `propunere`, `email`
- `deploy`, `vercel`, `github`, `build`, `test`
- `import`, `CSV`, `Excel`, `JSON`, `PDF`
- `continuă`, `continua` (continuare task în curs)

#### 🟢 HAIKU (effort default)
Orice prompt conține:
- `cum`, `ce`, `care`, `explicație`, `de ce`, `unde`
- `ce înseamnă`, `cum funcționează`, `ce e`
- `dacă aș`, `daca as`, `dacă am`, `daca am`, `dacă ar`, `daca ar`
- `da` singur (confirmare scurtă)
- debugging rapid: `de ce nu`, `parse error`, `NaN`
- întrebări domeniu fără implementare

**Regula de aur: dacă ești în dubiu → OPUS MAX**

---

## 📌 COMPORTAMENT ÎN SESIUNE

Când folosești Agent tool → setează `model: "opus"` pentru task-uri complexe.

### Comenzi rapide terminal
| Alias | Comandă completă | Când |
|---|---|---|
| `co` | `claude --model claude-opus-4-6 --effort high` | OPUS MAX — task complex |
| `cs` | `claude --model claude-sonnet-4-6` | SONNET — feature/fix |
| `ch` | `claude --model claude-haiku-4-5-20251001` | HAIKU — întrebare rapidă |
| `ca "prompt"` | auto-detectează modelul + effort | oricând |

---

## 🔄 GIT COMMIT — MANUAL

După orice modificare de cod, fă **doar** commit local:

```bash
cd "D:/Claude Projects/Zephren/energy-app"
git add -A
git commit -m "<mesaj relevant>"
```

- **NU** face `git push` și **NU** rula `npx vercel --prod` automat
- Întreabă utilizatorul când consideri că e momentul pentru push + deploy (ex: după mai multe modificări grupate, înainte de o sesiune de testare, etc.)
- Push și deploy se execută doar după confirmarea utilizatorului
- Remote: `https://github.com/tionut10/Zephren.git` (branch `master`)

---

## 📋 PROIECT

- **Stack**: React + Vite 6 + Vercel + Python serverless
- **Normativ principal**: Mc 001-2022, Ord. MDLPA 16/2023
- **Producție**: https://energy-app-ruby.vercel.app
- **GitHub**: https://github.com/tionut10/Zephren
- **Vercel limit**: max 12 funcții în `api/` (Hobby plan)
- **Limbă**: Română cu diacritice corecte (ă, â, î, ș, ț) — obligatoriu

---

## 💰 PRICING v6.0 (25 apr 2026 — restructurare COMPLETĂ)

### 8 niveluri (Set 11 naming „Zephren X")

| # | Plan | Preț | CPE/lună | Conținut |
|---|---|---|---|---|
| 1 | **Zephren Free** | 0 RON | 3 hard cap | Step 1-7 cu watermark |
| 2 | **Zephren Edu** | 0 RON cu dovadă | nelim cu watermark didactic | TOATE Expert, XML+submit blocate |
| 3 | **Zephren Audit** | 199 RON | 8 + 2 burst, overage 49→79→99 | Step 1-6 (fără audit) |
| 4 | **Zephren Pro** ⭐ | **499 RON** | 30 + 6 burst, overage 49→79→99 | **Step 1-7 COMPLET + AI Pack** |
| 5 | **Zephren Expert** | 899 RON | 60 + 12 burst, overage 39→69→99 | **Step 1-8 COMPLET + BIM Pack** |
| 6 | **Zephren Birou** | 1.890 RON flat | NELIMITAT | Expert × 2-5 useri + white-label + API |
| 7 | **Zephren Enterprise** | de la 4.990 RON | NELIMITAT | 6-100+ useri + SLA 99.9% + INCERC |
| + | **Pay-per-use** | 99/790/199/79/199 RON | one-time | Pentru fără abonament |

### Split CRITIC Step 1-7 vs Step 8

- **Step 1-7** = pachetul popular **Zephren Pro 499** (CPE + Anexe + Audit financiar)
- **Step 8** (18 module avansate) = **Zephren Expert 899** sau mai sus
- **Module avansate** (Step 8): MonteCarloEP, Pasivhaus, PMV/PPD, EN 12831 rooms, Thermovision, UrbanHeatIsland, Historic, Mixed-use, PortfolioDashboard, ConsumReconciliere, ConsumoTracker, BACS detaliat 200 factori, SRI complet 42 servicii, MEPS optimizator, Pașaport detaliat LCC, Acoustic, Night ventilation, Shading dynamic, Cooling hourly

### BACS+SRI+MEPS+Pașaport — DUAL MODE (CRITIC pentru EPBD)

Versiunea **simplă** OBLIGATORIE EPBD rămâne accesibilă în Pro 499:
- `BACSSelectorSimple.jsx` — selector A-D + factor f_BAC
- `SRIScoreAuto.jsx` — score automat read-only
- `MEPSCheckBinar.jsx` — verificare 2030 binar
- `PasaportBasic.jsx` — generare JSON+XML+PDF

Versiunea **detaliată** (optimizator avansat) doar în Step 8 = Expert 899+:
- `MEPSCheck.jsx` cu roadmap 2030/2033/2050
- `SRICalculator.jsx` complet 42 servicii
- BACS detaliat 200 factori (în Step8 tab `bacs`)
- `RenovationPassport.jsx` cu LCC + multi-fază

### AI Pack & BIM Pack (incluse, NU separate)

- **AI Pack** inclus în Pro+ (OCR facturi, OCR CPE, chat import, AI assistant)
- **BIM Pack** inclus în Expert+ (IFC import, parser STEP nativ)

### Componente cheie

- `src/lib/planGating.js` — `PLAN_FEATURES`, `canAccess()`, `getLimit()`, `getOverageCost()`, `isEduValid()`, `resolvePlan()` (cu backward-compat aliases)
- `src/components/PlanGate.jsx` — wrapper React 3 moduri (hide/upgrade/soft)
- `src/data/landingData.js` — `PLANS`, `PAY_PER_USE`, `PLAN_LAYOUT`
- `supabase/migrations/20260425_pricing_v6.sql` — schema v6 (cpe counters + EDU + price-lock + cpe_log + RPC functions)
- `docs/STRIPE_PRICING_V6_SETUP.md` — ghid setup Stripe Dashboard

### Backward compat

Utilizatorii pe planurile vechi v5.x (starter/standard/professional/business/asociatie) rămân funcționali via `resolvePlan()` aliases. Email notificare cu „prețul rămâne blocat + primești bonus AI Pack/Step 8".
