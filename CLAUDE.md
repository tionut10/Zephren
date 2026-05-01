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

## 💰 PRICING v7.1 FINAL (2 mai 2026 — Sursă autoritară: src/data/landingData.js)

> **REGULĂ:** Înainte de a cita prețuri în răspunsuri, verifică ÎNTOTDEAUNA `src/data/landingData.js` (PLANS array). LandingPage = sursa de adevăr. Dacă găsești discrepanțe între cod și acest CLAUDE.md, prioritate la cod.

### Prețuri actuale (verificat 2 mai 2026):

| Plan | Preț fără TVA | Notes |
|---|---:|---|
| Zephren Free | 0 RON | 3 CPE/lună hard cap, watermark DEMO |
| Zephren EDU | 0 RON | cu dovadă · studenți + doctoranzi + atestare în curs |
| **Zephren AE IIci** | **599 RON/lună** | Step 1-6 · CPE locuințe (Art. 6 alin. 2) |
| **Zephren AE Ici** ⭐ | **1.499 RON/lună** | Step 1-7 · CPE + audit + nZEB toate clădirile (Art. 6 alin. 1) |
| **Zephren Expert** | **2.999 RON/lună** | Step 1-8 · 18 module avansate + BIM |
| **Zephren Birou** | **5.999 RON/lună** | 2-5 useri · CPE + audit NELIMITAT |
| **Zephren Enterprise** | **9.999 RON/lună** | 6-100+ useri · SLA 99.9% |

### Filozofie diferențiere (CRITIC pentru gating UI):

**Plan-urile sunt orientate FUNCȚIONAL, NU pe gradul atestatului.**

- AE IIci 599 = pentru orice auditor care face DOAR CPE + Anexa 1+2 (gradul Ici care face doar CPE poate folosi acest plan, economisind 900 RON/lună)
- AE Ici 1.499 = pentru auditorii AE Ici care fac CPE + audit energetic + nZEB
- Expert 2.999 = pentru auditori AE Ici senior + consultanți (Step 8 + BIM)

**Plan = ce vede în UI** (limită comercială Zephren)
**Atestat MDLPA = ce poate semna LEGAL pe CPE-uri** (Ord. 348/2026 Art. 6)

### TVA RO 2026: 21% standard (afișat „cu TVA 21%: X RON" pe fiecare card)

### Fișiere sincron cu landingData.js:
- `src/data/landingData.js` — **SURSA DE ADEVĂR** (PLANS array)
- `src/lib/planGating.js` — PLAN_FEATURES (limite tehnice)
- `supabase/migrations/*pricing*.sql` — Stripe price IDs

---

## 💰 PRICING v7.0 (înlocuit — păstrat ca istoric pentru context legacy)

### Filozofie v7.0
- **Volum CPE/lună standardizat la 30** pe IIci, Ici, Expert (acoperă media aritmetică națională ~32 CPE/lună)
- **Diferențierea** între planuri NU mai e prin volum, ci prin **CE POATE FACE** auditorul (grad MDLPA + funcționalități)
- **AI Pack inclus pe TOATE planurile plătite** (era doar Ici+ în v6.x)
- **Cloud retention NELIMITAT pe TOATE planurile plătite** (era 6 luni IIci, nelim Ici+ în v6.x)
- **Audituri energetice/lună incluse** ca cap separat (Ici 2/lună, Expert 4/lună, Birou+Enterprise nelim)

### 7 niveluri Zephren X (toate cu TVA 21% afișat pe card)

| # | Plan | Fără TVA | Cu TVA 21% | CPE/lună | Audit/lună | Conținut |
|---|---|---|---|---|---|---|
| 1 | **Zephren Free** | 0 RON | 0 RON | 3 hard cap | 0 | Step 1-6 cu watermark |
| 2 | **Zephren Edu** | 0 cu dovadă | 0 | nelim cu watermark didactic | nelim | TOATE Expert (DOAR studenți + doctoranzi auto) |
| 3 | **Zephren AE IIci** | **499 RON** | **603,79** | 30 + 6 burst, overage 39→69→99 | 0 (legal blocat) | Step 1-6 · grad II civile · CPE locuințe (Art. 6 alin. 2) + AI Pack + Cloud nelim |
| 4 | **Zephren AE Ici** ⭐ | **1.299 RON** | **1.571,79** | 30 + 6 burst, overage 39→69→99 | 2 + 1 burst, overage 999→1.499→1.999 | **Step 1-7 COMPLET + AI Pack + Pașaport basic** · grad I civile · CPE + audit + nZEB TOATE clădirile (Art. 6 alin. 1) |
| 5 | **Zephren Expert** | **2.499 RON** | **3.023,79** | 30 + 6 burst, overage 39→69→99 | 4 + 2 burst, overage 999→1.499→1.999 | **Step 1-8 COMPLET + BIM Pack + Pașaport detaliat LCC** |
| 6 | **Zephren Birou** | **4.999 flat** | **6.048,79** | NELIMITAT | NELIMITAT | Expert × 2-5 useri + white-label + API |
| 7 | **Zephren Enterprise** | de la **9.999** | 12.098,79+ | NELIMITAT | NELIMITAT | 6-100+ useri + SLA 99.9% + INCERC |
| + | **Pașaport Renovare** | 79 / 199 RON/doc | 95,59 / 240,79 | one-time | — | DOAR pentru NON-auditori (proprietari/dezvoltatori) |

### Stripe amounts (subunit RON × 100 = bani)
- **Lunar (M)**: audit 49.900 / pro 129.900 / expert 249.900 / birou 499.900 / enterprise 999.900
- **Anual Y (10 luni)**: audit 499.000 / pro 1.299.000 / expert 2.499.000 / birou 4.999.000 / enterprise 9.999.000

### TVA RO 2026
- **Standard**: **21%** (era 19% în v5.x — actualizat în 8 fișiere code)
- **Cota redusă**: 11% (era 5% în v5.x)
- **B2B UE VIES**: 0% taxare inversă
- Banner global „Toate prețurile FĂRĂ TVA" + linie pe FIECARE card „cu TVA 21%: X RON"

### EDU plan — RESTRÂNS la auto-grant studenți + doctoranzi
- Pentru profesori/trainee/cercetători/instituții → cerere separată **edu@zephren.ro**
- Banner Edu cu 2 sub-secțiuni: „Aplică cu dovadă →" vs „📩 Cerere colaborare →"

### Pay-per-use SIMPLIFICAT
- ELIMINATE: CPE single 99, Pachet 10 CPE 790, CPE+Step 8 199 (canibalizate de AE IIci 499 v7.0)
- PĂSTRATE: doar Pașaport Renovare basic 79 + detaliat 199 pentru NON-auditori
- Badge „OBLIGATORIU EPBD · 29 MAI 2026"

### Diferențierea pe AXE FUNCȚIONALE v7.0 (NU pe volum CPE)

| Funcționalitate | IIci 499 | Ici 1.299 | Expert 2.499 |
|---|---|---|---|
| CPE/lună | 30+6 | 30+6 | 30+6 |
| Audituri/lună | 0 | 2+1 | 4+2 |
| Tip clădiri permise legal | DOAR rezidențial | TOATE | TOATE |
| Step 1-6 (CPE) | ✅ | ✅ | ✅ |
| Step 7 (Audit Mc 001 + LCC + NPV) | ❌ | ✅ | ✅ |
| Raport conformare nZEB (Art. 6 lit. c) | ❌ | ✅ | ✅ |
| Step 8 (18 module avansate) | ❌ | ❌ | ✅ |
| AI Pack (OCR + chat + assistant) | ✅ | ✅ | ✅ |
| BIM Pack (IFC import) | ❌ | ❌ | ✅ |
| BACS detaliat 200 factori | ❌ (doar A-D) | ❌ (doar A-D) | ✅ |
| SRI complet 42 servicii | ❌ (doar auto) | ❌ (doar auto) | ✅ |
| MEPS optimizator + roadmap 2050 | ❌ (doar binar) | ❌ (doar binar) | ✅ |
| Pașaport Renovare | ❌ | basic | detaliat LCC |
| Climate import EPW + TMY | ❌ | ✅ | ✅ |
| Cloud retention | NELIMITAT | NELIMITAT | NELIMITAT |
| Suport email | 48h | 24h | 24h |

### Split CRITIC Step 1-7 vs Step 8

- **Step 1-6** = baza CPE accesibilă în toate planurile (IIci/Ici/Expert)
- **Step 7** (Audit + nZEB) = **Zephren AE Ici 1.299** sau mai sus (legal grad I obligatoriu)
- **Step 8** (18 module avansate) = **Zephren Expert 2.499** sau mai sus
- **Module avansate** (Step 8): MonteCarloEP, Pasivhaus, PMV/PPD, EN 12831 rooms, Thermovision, UrbanHeatIsland, Historic, Mixed-use, PortfolioDashboard, ConsumReconciliere, ConsumoTracker, BACS detaliat 200 factori, SRI complet 42 servicii, MEPS optimizator, Pașaport detaliat LCC, Acoustic, Night ventilation, Shading dynamic, Cooling hourly

### BACS+SRI+MEPS+Pașaport — DUAL MODE (CRITIC pentru EPBD)

Versiunea **simplă** OBLIGATORIE EPBD accesibilă pe TOATE planurile plătite (IIci/Ici/Expert/Birou/Enterprise):
- `BACSSelectorSimple.jsx` — selector A-D + factor f_BAC
- `SRIScoreAuto.jsx` — score automat read-only
- `MEPSCheckBinar.jsx` — verificare 2030 binar
- `PasaportBasic.jsx` — generare JSON+XML+PDF (DOAR Ici+ — IIci nu poate emite pașaport)

Versiunea **detaliată** (optimizator avansat) doar în Step 8 = Expert 2.499+:
- `MEPSCheck.jsx` cu roadmap 2030/2033/2050
- `SRICalculator.jsx` complet 42 servicii
- BACS detaliat 200 factori (în Step8 tab `bacs`)
- `RenovationPassport.jsx` cu LCC + multi-fază

### AI Pack & BIM Pack (incluse, NU separate)

- **AI Pack** inclus în TOATE planurile plătite v7.0 (IIci/Ici/Expert/Birou/Enterprise) — OCR facturi, OCR CPE, chat import, AI assistant
- **BIM Pack** inclus în Expert+ (IFC import, parser STEP nativ)

### Componente cheie

- `src/lib/planGating.js` — `PLAN_FEATURES`, `canAccess()`, `getLimit()`, `getOverageCost()`, `isEduValid()`, `resolvePlan()` (cu backward-compat aliases)
- `src/components/PlanGate.jsx` — wrapper React 3 moduri (hide/upgrade/soft)
- `src/data/landingData.js` — `PLANS`, `PAY_PER_USE`, `PLAN_LAYOUT`
- `supabase/migrations/20260425_pricing_v6.sql` — schema v6 (cpe counters + EDU + cpe_log + RPC functions); coloanele `price_locked*` rămân pentru compatibilitate, dar mecanismul price-lock a fost eliminat din ofertă în v6.2 (27 apr 2026) — politica nouă: anunț cu 90 zile pentru orice modificare de preț
- `docs/STRIPE_PRICING_V6_SETUP.md` — ghid setup Stripe Dashboard

### Backward compat

Utilizatorii pe planurile vechi v5.x (starter/standard/professional/business/asociatie) rămân funcționali via `resolvePlan()` aliases. Email notificare cu „prețul rămâne neschimbat + primești bonus AI Pack/Step 8/BIM Pack". Orice modificare ulterioară de preț este anunțată cu minimum 90 zile în avans, conform politicii v6.2.
