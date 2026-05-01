# Prompt Sprint Tranziție Legală 2026 — Zephren

**Scop**: implementare modificări provizorii pentru perioada 14.IV.2026 → 11.X.2026 (Ord. MDLPA 348/2026 vs Ord. 2237/2010 coexistă) + clarificări pricing v7.1.

**Pentru**: sesiune nouă Claude Code Opus MAX 1M, cwd = `D:/Claude Projects/Zephren/energy-app`.

**Pornire recomandată**: `co` (Opus 4.7 1M, effort high).

---

## CONTEXT LEGAL

**Calendar:**
- **14.IV.2026** — Ord. MDLPA 348/2026 publicat în MO 292/14.IV.2026 și formal în vigoare
- **8.VII.2026** — Operaționalizare portal electronic MDLPA (60 zile lucrătoare)
- **11.X.2026** — Abrogare completă Ord. MDLPA 2237/2010 (Art. 7 din Ord. 348/2026 — 180 zile)

**ÎN PERIOADA DE TRANZIȚIE (acum):**
- Atestatele AE existente (emise pe Ord. 2237/2010) rămân valabile pe vechiul regim până la expirarea naturală (5 ani).
- Portalul MDLPA pentru distincția Ici/IIci NU e operațional.
- Auditorii actuali pot continua practica conform Ord. 2237/2010.

**DUPĂ 11.X.2026:**
- Doar Ord. 348/2026 se aplică.
- AE IIci STRICT limitat la CPE locuințe (RI/RC/RA/BC + scop construire/vânzare/închiriere).
- AE Ici poate face audit + nZEB + LCC + toate clădirile.

**Sursă autoritară în cod:**
- `src/calc/auditor-attestation-validity.js` — `isInTransitionWindow()`, `ORD_2237_REPEAL_DATE`, `getAttestationOrdinanceVersion()`
- `src/components/MDLPATransitionBanner.jsx` — banner global existent

---

## CONTEXT PRICING v7.1 (verificat 2 mai 2026 din landingData.js)

**Prețuri reale:**
| Plan | Preț |
|---|---:|
| Free | 0 |
| Edu | 0 (cu dovadă) |
| AE IIci | **599 RON/lună** |
| AE Ici | **1.499 RON/lună** |
| Expert | **2.999 RON/lună** |
| Birou | **5.999 RON/lună** |
| Enterprise | **9.999 RON/lună** |

**FILOZOFIE CRITICĂ — planuri orientate FUNCȚIONAL, nu pe grad:**
- Plan **AE IIci 599** = pentru ORICE auditor care face DOAR CPE + Anexa 1+2 (Step 1-6). Un AE Ici care face doar CPE economisește 900 RON/lună folosind acest plan.
- Plan **AE Ici 1.499** = pentru auditorii cu drept legal de audit (gradul I real) care vor și Step 7 (audit + nZEB + LCC).
- Plan **Expert 2.999** = AE Ici senior + consultanți (Step 8 + BIM).

**Distincție:**
- **Plan** = ce vede auditorul în UI (limita comercială Zephren)
- **Atestat MDLPA real** = ce poate SEMNA legal pe CPE-uri (Ord. 348/2026 Art. 6)

**Sursă autoritară:** `src/data/landingData.js` — `PLANS` array. Înainte de a cita prețuri în mesaje, citește acest fișier.

---

## CONTEXT TEHNIC EXISTENT

Sprint-uri deja finalizate (2 mai 2026, commits master local):
- **Faza D** `e7111b0` — curățare 3 secțiuni duplicate Pas 5 (-108 linii)
- **Faza 0** `84ec1c4` + `88e2596` — infrastructură GradeGate + matrice 33 features + 48 teste
- **Faza A** `7b2a8ce` — wrap 4 carduri financiare cu GradeGate
- **Faza B** `14c8a73` — wrap EV Charger + Benchmark Pasivhaus
- **Faza C** `2250049` — wrap GWP lifecycle (card + badge)
- **Faza E** `208b565` — banner contextual AE IIci la final Pas 5
- **Opțiunea B** `1178ba5` — SOFT WARNING în fereastra de tranziție (allowed=true + softWarning text când grad-blocked în tranziție; plan-blocking rămâne strict)
- **Pricing v7.1** `65bb881` — actualizare CLAUDE.md cu prețurile reale din landingData.js

**Status actual:**
- 2535 teste PASS · build OK
- AE IIci VEDE toate cardurile în Pas 5 (cu soft warning amber pe cele audit-only)
- Plan-blocking comercial rămâne strict
- Trecerea automată la enforcement strict la 11.X.2026

**Componente cheie create:**
- `src/data/grade-features.js` — `STEP_FEATURE_GRADE_MATRIX` cu 33 entries
- `src/lib/effectiveGate.js` — `evaluateGate({ feature, plan, auditorGrad, now })` cu suport tranziție
- `src/components/GradeGate.jsx` — wrapper React + hook `useGradeGate`

---

## TASK-URI DE EXECUTAT (în ordine de prioritate)

### 🔴 PRIORITATE 1 — Bug-uri legale critice

#### T1.5 — Fix `canEmitForBuilding.js`
**Problemă**: folosește `effectiveGrade` (combinat plan + atestat) pentru verificare drepturi LEGALE pe categorii clădiri. Asta blochează AE Ici cu plan IIci de la a emite CPE pe non-rezidențial — dar atestatul lui Ici îi permite legal.

**Fix:**
1. Înlocuiește `effectiveGrade` cu `auditorGrad` strict (atestat real, nu plan-influenced) pentru toate verificările LEGALE (categorii clădiri, scop CPE, public buildings).
2. Adaugă parametru `now = new Date()` pentru testabilitate.
3. În fereastra de tranziție (`isInTransitionWindow(now) === true`), schimbă `severity: "blocking"` → `severity: "warning"` cu mesaj soft pentru AE IIci real care încearcă non-rezidențial sau scope nepermis.
4. Plan-restricțiile rămân (sunt comerciale, nu legale).

**Test:**
- AE Ici real cu plan IIci + clădire BIR → ALLOWED (atestat permite, plan limitează doar UI)
- AE IIci real cu plan oricare + clădire BIR în tranziție → ALLOWED + warning
- AE IIci real cu plan oricare + clădire BIR post-11.X.2026 → BLOCKED

**Fișiere:**
- `src/lib/canEmitForBuilding.js`
- `src/lib/__tests__/canEmitForBuilding.test.js` — actualizează cu cazuri tranziție

#### T1.6 — Fix `RaportConformareNZEB.jsx`
**Problemă**: gating HARD cu `canAccess(userPlan, "nzebReport")` blochează AE IIci de la raport nZEB. În tranziție, ar trebui soft warning.

**Fix:**
1. Folosește `evaluateGate({ feature: "nzebReport", plan, auditorGrad })` în loc de `canAccess`.
2. Adaugă entry `nzebReport` în `STEP_FEATURE_GRADE_MATRIX` (`minGrade: "Ici"`, `minPlan: "pro"`, `mode: "hide"`, `legalRef: "Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026"`).
3. În tranziție, randează raportul + banner amber.

**Fișiere:**
- `src/data/grade-features.js` — adaugă `nzebReport`
- `src/components/RaportConformareNZEB.jsx` — schimbă gating
- Teste

#### T1.7 — Fix `getMaxStep` pentru plan AE IIci în tranziție
**Problemă**: `planGating.js` setează `maxStep: 6` pentru plan `audit`. Asta blochează AE IIci de la Pas 7, chiar și în tranziție când legal poate.

**Decizie**: NU modifica `maxStep` pentru plan IIci. Argumentul:
- Plan-ul IIci e un produs comercial Step 1-6.
- Cei care vor Step 7 cumpără AE Ici 1.499.
- Atestatul real Ici cu plan IIci = alegere conștientă (face doar CPE).

În schimb, **adaugă banner explicit** în Pas 6 pentru utilizatorii cu plan IIci care vor să facă audit: *„Pentru audit energetic, upgrade la AE Ici 1.499 RON/lună (include Step 7 + nZEB + LCC). În tranziție, nu mai blochez nimic legal — ești limitat doar de planul cumpărat."*

**Fișiere:**
- `src/steps/Step6Certificate.jsx` — banner condiționat

---

### 🟡 PRIORITATE 2 — UX & Comunicare

#### T2 — Pricing UX clarificare orientare funcțională
**Acțiune:**
1. Pe LandingPage, **adaugă subtitle** pe fiecare card plan:
   - AE IIci: *„Pentru orice auditor (Ici sau IIci) care face DOAR CPE + Anexa 1+2"*
   - AE Ici: *„Pentru auditorii AE Ici care fac și audit energetic"*
   - Expert: *„Pentru auditori senior + consultanți (Step 8 + BIM)"*
2. **Banner deasupra grid-ului pricing**: *„Plan-urile Zephren sunt orientate funcțional (Step 1-6 vs 1-7 vs 1-8), NU pe gradul atestatului tău MDLPA. Atestatul real determină ce poți semna legal pe CPE; plan-ul determină ce funcționalități vezi în UI."*
3. **Mini-test interactive** pe pagina pricing: *„Care plan e potrivit pentru tine?"* → 2-3 întrebări → recomandare plan.

**Fișiere:**
- `src/data/landingData.js` — adaugă subtitle-urile (verifică dacă există deja proprietatea `subtitle`)
- `src/components/LandingPage.jsx` (sau `landingData/PricingSection.jsx`)

#### T3 — CPE meta cu citare ordin corect
**Acțiune:**
1. În `Step6Certificate.jsx` la generarea DOCX/XML/PDF, citează ordinul aplicabil pe baza `auditor.attestationOrdinanceVersion` (deja calculat în `auditor-attestation-validity.js:225`).
2. Pentru atestate emise înainte de 14.IV.2026 → citează **Ord. MDLPA 2237/2010**
3. Pentru atestate emise după 14.IV.2026 → citează **Ord. MDLPA 348/2026**
4. Banner mic la generarea CPE: *„CPE va fi emis sub Ord. MDLPA [X]/[an], conform atestatului tău."*

**Fișiere:**
- `src/steps/Step6Certificate.jsx`
- `src/lib/cpe-document.js` (sau export-handlers cu logica DOCX)

#### T4 — Submit MDLPA — banner portal indisponibil
**Acțiune:**
1. În `MDLPASubmitPanel.jsx`, dacă `now < new Date("2026-07-08")` → afișează banner *„⚠️ Portalul electronic MDLPA va fi operațional din 8 iulie 2026. Până atunci, CPE-urile se trimit prin procedura veche (depunere fizică/email la MDLPA)."* + link către pagină help.
2. Disable button submit XML cu tooltip explicativ.
3. **Generează „scrisoare de însoțire" PDF** auto pentru depunerea fizică: include toate datele CPE + auditor + clădire + cod CPE local.

**Fișiere:**
- `src/components/MDLPASubmitPanel.jsx`
- `src/lib/cover-letter-pdf.js` (nou)

---

### 🟡 PRIORITATE 3 — Form profil auditor

#### T5 — Câmp `attestationOrdinance` + grad text liber pentru atestate vechi
**Problemă**: Atestatele Ord. 2237/2010 NU folosesc formatul „Ici/IIci" — au „grad I civile", „grad II civile", „grad I+II constructii" etc. Auditorii actuali nu știu ce să selecteze în profil.

**Fix:**
1. În profil auditor, adaugă câmp `attestationOrdinance: "2237_2010" | "348_2026"`.
2. Pentru `2237_2010`: textbox liber „Grad atestat (din certificat)" + select calculat automat (ex: „grad I civile" → maps la `grade: "Ici"`).
3. Pentru `348_2026`: select strict Ici/IIci.
4. Mapping în background pentru gating: dacă atestat vechi conține „I" și nu „II" → grade `Ici`; dacă conține „II" → `IIci`; dacă conține ambele („I+II") → `Ici` (cel mai permisiv).

**Fișiere:**
- `src/components/AuditorProfile.jsx` (sau formul existent)
- `src/calc/auditor-grad-validation.js` — actualizează cu mapping vechi/nou

---

### 🟢 PRIORITATE 4 — Restanțe & nice-to-have

#### T6 — Anexa 1 CB48-64 skip automat post-11.X pentru IIci
**Acțiune:**
- În `Step6Certificate.jsx:819-843`, wrap blocul cu `if (auditorGrad !== "IIci" || isInTransitionWindow(now))`.
- Banner în Anexa generată: *„CB48-64 reflectă opinia auditorului. Pentru CPE emis de AE IIci după 11.X.2026, această secțiune e marcată N/A (lipsa drept de audit)."*

#### T7 — Categorii clădiri în Step 1 — soft warning în tranziție
**Acțiune:**
- Replica logica T1.5 (canEmitForBuilding) pentru UI banner în Step 1 când AE IIci selectează BIR/SP etc.

#### T8 — Format ștampilă ø40mm vs vechi
**Acțiune:**
- Verifică dacă Ord. 2237/2010 cere ø35mm sau alt format.
- În `AuditorSignatureStampUpload.jsx`, oferă opțiune format auto-detectat din `attestationOrdinanceVersion`.

#### T9 — FAQ tranziție 2026 (pagină statică)
**Acțiune:**
- `src/pages/TranzitieLegala2026.jsx` (sau .html) cu calendar, drepturi, ce se schimbă pe pricing, link-uri către ordine oficiale.

#### T10 — Demo projects M1-M5 — verificare grade hardcodat
**Acțiune:**
- Verifică `loadDemoByIndex` în `demoProjects.js` — confirmă că NU forțează `auditor.grade` strict, lasă tranziția să unblock.

---

## REGULI DE LUCRU

1. **Prețuri**: înainte de orice menționare, citește `src/data/landingData.js`. NU folosi memoria pentru prețuri.
2. **Grad vs plan**: 
   - Verificare LEGALĂ → folosește `auditorGrad` strict (atestat real)
   - Verificare COMERCIALĂ UI → folosește `planGating` cu `effectiveGrade`
3. **Tranziție**: toate enforcement-urile noi trebuie să folosească `isInTransitionWindow(now)` cu fallback strict.
4. **Teste**: parametru `now` pentru orice funcție care depinde de dată.
5. **Override testare**: `window.__forceStrictGrade = true` simulează regimul post-11.X.2026.
6. **Commit**: doar local. Push + deploy doar la cerere explicită utilizator.
7. **Diacritice corecte**: ă, â, î, ș, ț.

---

## VERIFICĂRI FINALE (înainte de commit fiecare task)

```bash
cd "D:/Claude Projects/Zephren/energy-app"
npx vitest run                  # zero regresii (target: 2535+ PASS)
npx vite build 2>&1 | tail -5   # build OK
git status --short              # verifică ce s-a modificat
```

---

## LIVRABIL FINAL

La sfârșitul sesiunii:
1. Tabel sumar cu fiecare T executat: commit hash + LOC + test count
2. Update `MEMORY.md` cu sprint nou: „Sprint Tranziție 2026 finalizat"
3. Recomandări de push + deploy (sau lasă pentru sesiune separată)
4. Lista task-urilor RESTANTE din T6-T10 dacă timpul nu permite toate

---

**Început recomandat**: `T1.5 (canEmitForBuilding fix)` → cel mai critic legal.
