# Prompt pentru sesiunea nouă — Execuție restanțe Zephren v4.0

**Generat: 27 aprilie 2026 · Sursa: sesiunea Opus MAX cu finalizare Sprint MDLPA Faza 0**

---

## 🎯 INSTRUCȚIUNI PENTRU UTILIZATOR

Pornește o sesiune nouă Claude Code cu modelul **Opus 4.7 1M Max** și paste-ază prompt-ul de mai jos. Sesiunea va executa toate restanțele în ordine optimă, cu commit-uri atomice per sprint și push doar la confirmarea ta per item.

---

## 📝 PROMPT (paste-ează exact între liniile ═══)

═══════════════════════════════════════════════════════════════════════════

# Sesiune execuție restanțe Zephren v4.0 (post-MDLPA Faza 0)

## CONTEXT PROIECT

Sunt Ionuț, fondatorul **Zephren** — platformă SaaS românească pentru certificare energetică a clădirilor (CPE) + audit energetic conform Mc 001-2022, Ord. MDLPA 16/2023, EPBD 2024.

**Stack tehnic**:
- Frontend: React + Vite 6
- Hosting: Vercel (plan Hobby — max 12 funcții în /api/, cron jobs zilnice doar)
- Database: Supabase (Postgres + Storage + RLS)
- Plăți: Stripe + SmartBill (eFactura ANAF)
- Tests: Vitest (115 fișiere · 2.117 teste actuale)
- Limba: română cu diacritice obligatorii (ă, â, î, ș, ț)

**Locații cheie**:
- Cod: `D:/Claude Projects/Zephren/energy-app/`
- Memorie internă: `C:/Users/tionu/.claude/projects/D--Claude-Projects-Zephren/memory/`
- Producție: https://energy-app-ruby.vercel.app
- GitHub: https://github.com/tionut10/Zephren (branch `master`)
- Documentație utilă în `docs/`:
  - `INTEGRARE_PORTAL_MDLPA_348_2026.md` v1.1 — brief MDLPA Faza 0 LIVRAT
  - `PR_EPBD_2024_READY.md` — comunicat presă lansare 1 iun
  - `LANDING_EPBD_2024_COPY.md` — copy landing /epbd-2024
  - `STRIPE_PRICING_V6_SETUP.md` — ghid setup pricing v6.2

**Status actual (27 apr 2026)**:
- v3.4 deployed în producție — pregătit pentru lansare v4.0 pe **1 iunie 2026** (EPBD 2024)
- Ord. MDLPA 348/2026 introduce **portal electronic obligatoriu** ~8 iulie 2026 (60 zile lucrătoare după MO 292/14 apr)
- Sprint MDLPA Faza 0 LIVRAT (commit `01df03b`) — adapter + queue + validator + API endpoint în mock mode
- Pricing v6.2 LIVRAT — eliminat „price-lock pe viață", politică nouă „anunț 90 zile pentru orice modificare"
- Badge-uri pricing rescrise (Sistem A audience-first): GRATUIT · VOLUM REDUS · ⭐ RECOMANDAT · AUDIT APROFUNDAT · BIROURI 2-5 PERSOANE · 6-100+ USERI · SLA

## REGULI OBLIGATORII (din CLAUDE.md proiect)

1. **AUTO-SELECT MODEL** — la fiecare sarcină concretă, afișează blocul de recomandare model+effort și **așteaptă confirmare explicită** înainte de execuție:
   ```
   ─────────────────────────────────────
   🟢 HAIKU  /  🟡 SONNET medium  /  🔴 OPUS MAX
   Model optim: <model> | Effort: <nivel>
   Motiv: <trigger detectat>
   ─────────────────────────────────────
   Aștept confirmarea ta înainte să încep.
   ```

2. **GIT FLOW**: după modificări → `git add` + `git commit` LOCAL. **NU push automat**. Întreabă utilizatorul când e momentul pentru `git push origin master` + `npx vercel --prod`.

3. **DIACRITICE OBLIGATORII** în toate textele (ă, â, î, ș, ț). Verifică inclusiv în comentarii cod și în fișierele de documentație.

4. **TESTE OBLIGATORII** — orice modificare cod trebuie verificată cu `npx vitest run --reporter=dot --no-coverage`. Toate testele trebuie să rămână PASS.

5. **BUILD OBLIGATORIU** — verifică `npm run build` înainte de commit. Zero erori sintaxă.

6. **VERCEL LIMIT** — max 12 funcții în `/api/` (Hobby plan). Suntem la **12/12 EXACT**. Orice funcție nouă trebuie consolidată într-una existentă.

7. **TVA RO 2026 = 21%** (nu 19%). Cota redusă = 11% (nu 5%). B2B UE cu VIES = 0%.

8. **STIL** — fraze naturale, elaborate, vocabular bogat. Evită ton robotic/telegrafic.

## RESTANȚE DE EXECUTAT (ordine recomandată)

### 🔴 P0 — Blocante v4.0 (lansare 1 iun)

| # | Item | Estimare | Dependențe | Note |
|---|---|---|---|---|
| 1 | **SmartBill webhook integration** | 4-6h | Stripe webhook existent | În `api/stripe-webhook.js` adaugă apel SmartBill API pentru emitere factură automată B2B RO/B2C/B2B UE |
| 2 | **Supabase migration v6 SQL apply** | 1h (admin) | — | Aplică `supabase/migrations/20260425_pricing_v6.sql` + `20260427_mdlpa_portal_integration.sql` în Supabase Dashboard SQL Editor |

### 🟠 P1 — Sprint 21→22 restanțe Step 1 hardening

| # | Item | Estimare | Dependențe |
|---|---|---|---|
| 3 | **EXIF GPS extraction** | 3-4h | `exifr` npm package; integrare în Step 1 wizard |
| 4 | **Hartă Leaflet** (Step 1) | 6-8h | `react-leaflet` + tile provider OSM gratuit |
| 5 | **TMY UI dedicat** | 6-8h | Citire EPW/ERA5 deja existentă; UI pentru import/preview |
| 6 | **ANCPI API real** | 12-16h | **Blocat pe acces ANCPI** — necesită cont API. Dacă blocat, lasă mock cu disclaimer „date estimate" în UI |

### 📅 EPBD 2024 (29 mai 2026 — 32 zile rămase)

| # | Item | Estimare | Note |
|---|---|---|---|
| 7 | **Rescalare A-G versioning** | 8-10h | Scala UE unificată; coexistență cu scala RO actuală + migrare date istorice |
| 8 | **Jurnal digital al clădirii** | 5-7h | Modul nou — istoric intervenții + verificări periodice + linkuri către CPE/RAE/Pașaport |

### 🟡 P2 — Sprint 23-24 features avansate

| # | Item | Estimare | Note |
|---|---|---|---|
| 9 | **OCR facturi** (Sprint 23) | 10-15h | Claude Vision API; extragere date consum din facturi PDF/imagine; necesită refactor `api/ocr-cpe.js` (sau funcție nouă consolidată) |
| 10 | **IFC web-ifc extindere** (Sprint 24) | 16-20h | `web-ifc` parțial integrat în Step 8 (Expert+); extindere pentru import complet geometrie clădire |

### ✅ DEJA LIVRATE (NU le re-implementa)

- BACS detaliat — Sprint 5 (ISO 52120, 200 factori × 10 tipologii × 4 clase × 5 sisteme)
- MEPS optimizator + roadmap 2050 — Step 8 (Expert plan)

## ORDINE OPTIMĂ DE EXECUȚIE (recomandare)

```
Sprint A (P0 blocante, 5-7h):
  1. SmartBill webhook
  2. Apply migrations SQL (instrucțiuni pas-cu-pas pentru utilizator)

Sprint B (Step 1 hardening, 15-20h):
  3. EXIF GPS extraction (3-4h) ← cel mai rapid win
  4. Hartă Leaflet (6-8h)
  5. TMY UI dedicat (6-8h)

Sprint C (EPBD 2024 urgent, 13-17h):
  7. Rescalare A-G UE
  8. Jurnal digital clădire

Sprint D (ANCPI cu fallback, 12-16h sau 2h dacă blocat):
  6. ANCPI API real SAU mock cu disclaimer

Sprint E (P2 features, 26-35h):
  9. OCR facturi
  10. IFC web-ifc extindere

TOTAL: 71-95 ore (echivalent 2-3 sesiuni extinse Opus MAX)
```

## SUCCESS CRITERIA per sprint

Pentru fiecare sprint:
- ✅ Cod scris cu diacritice corecte
- ✅ Teste unitare scrise (target ≥85% coverage funcții noi)
- ✅ `npx vitest run` — toate testele PASS
- ✅ `npm run build` — zero erori
- ✅ Vercel function count rămâne ≤12 (consolidare obligatorie)
- ✅ Commit local cu mesaj descriptiv (Co-Authored-By: Claude Opus)
- ✅ Update `docs/` dacă feature nou are impact public
- ✅ Întreabă utilizatorul înainte de `git push` + `npx vercel --prod`

## OUTPUT AȘTEPTAT

Pentru fiecare sprint:
1. Afișează blocul de recomandare model+effort, așteaptă „da/continuă"
2. Implementare cod
3. Teste + build verification
4. Commit local cu mesaj structurat
5. Sumar concis: ce s-a făcut, fișiere modificate, teste, status verificări
6. Întreabă: „Push + deploy acum sau continuăm cu sprint-ul următor?"

## REAMINTIRE CONTEXT IMPORTANT

- Ai acces la memoria persistentă a utilizatorului în `MEMORY.md`
- Brief-ul tehnic complet pentru MDLPA: `docs/INTEGRARE_PORTAL_MDLPA_348_2026.md`
- Pricing strategy actualizat în `docs/STRIPE_PRICING_V6_SETUP.md`
- Existing code patterns: vezi `api/_middleware/` pentru auth/rateLimit/cors

## ÎNCEPE CU

Afișează blocul de recomandare model+effort pentru **Sprint A (SmartBill webhook + apply migrations)** și așteaptă confirmare. Apoi parcurge sprint-urile în ordinea recomandată.

═══════════════════════════════════════════════════════════════════════════

## 📌 NOTE PENTRU UTILIZATOR

### Cum să folosești acest prompt

1. Deschide o **sesiune nouă** Claude Code în directorul `D:/Claude Projects/Zephren/energy-app/`
2. Verifică modelul: `claude --model claude-opus-4-7-1m` sau alias `co`
3. Paste-ează prompt-ul de mai sus (totul între liniile `═══`)
4. Răspunde cu „da" / „continuă" la fiecare bloc de recomandare model
5. Răspunde cu „push+deploy" sau „continuă" după fiecare sprint

### Estimare timp per sesiune

- Sesiune 1 (4-6h): Sprint A + Sprint B (P0 blocante + Step 1 hardening)
- Sesiune 2 (4-6h): Sprint C + Sprint D (EPBD + ANCPI)
- Sesiune 3 (6-8h): Sprint E (OCR + IFC — features mari)

### Riscuri și mitigări

| Risc | Mitigare |
|---|---|
| Specs API MDLPA publicate între sesiuni | Sprint MDLPA Faza 1 va fi adăugată ca prioritate maximă peste plan |
| ANCPI nu acordă acces API | Fallback la mock cu disclaimer transparent în UI |
| EPBD 2024 transpunere amânată | Sprint C devine opțional — focus pe Sprint A+B |
| Vercel limit 12/12 atins iar | Consolidare obligatorie sau upgrade Pro (~100 RON/lună) |

### Fișiere de consultat înainte de fiecare sprint

| Sprint | Fișiere de consultat |
|---|---|
| A SmartBill | `api/stripe-webhook.js` (linia ~30 — funcția SmartBill există parțial) |
| B Step 1 | `src/steps/Step1Identify.jsx` (sau echivalent) + `src/calc/step1-validators.js` |
| C EPBD | `src/calc/grading-classification.js` (sau scale.js) |
| D ANCPI | `api/ancpi-proxy.js` (există deja stub) |
| E OCR | `api/ocr-cpe.js` (există deja pentru CPE) |
| E IFC | `src/lib/ifc-import.js` sau `src/components/Step8Advanced.jsx` |

---

*Document generat automat de sesiunea Opus MAX după finalizarea Sprint MDLPA Faza 0.*
*Pentru întrebări, contactează Ionuț Tatu — tionut10@gmail.com.*
