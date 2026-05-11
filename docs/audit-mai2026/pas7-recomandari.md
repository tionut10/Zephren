# Pas 7 — Recomandări reabilitare + ofertă + chat AI — Audit mai 2026 (F5)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Fișiere principale**:
- `src/steps/Step7Audit.jsx` (~2880 linii — orchestrator UI, gating Step 7)
- `src/calc/cpe-recommendations.js` (motor unificat Sprint P1.4)
- `src/calc/phased-rehab.js` (plan etapizat multi-an)
- `src/calc/smart-rehab.js` (Quick wins + ROI)
- `src/calc/rehab-comparator.js` (3 scenarii minim/mediu/maxim)
- `src/calc/unified-rehab-costs.js` (Sprint P3.1 — sursă canonică rehab-prices)
- `src/data/rehab-prices.js` (REHAB_PRICES — Sprint Audit Maraton 9 mai 2026)
- `src/data/rehab-scenarios.js` (MINIM 5cm / MEDIU 10cm / MAXIM 15cm, Sprint P0-C)
- `src/components/CostOptimalCurve.jsx` (curba cost-optim 3 perspective)
- `src/components/RehabAIChat.jsx` **NOU F5** (chat AI flotant + multiplexare)
- `src/components/OfertaReabilitare.jsx` (ofertă PDF/DOCX)
- `src/components/LCCAnalysis.jsx` (Life Cycle Cost EN 15459-1)
- `api/ai-assistant.js` (extins F5 cu intent="rehab-chat")

**Documente conexe**: `AUDIT_PRETURI_2026-05-09.md` (Sprint Audit Maraton 11 commits +136 teste), `PRICES_ARCHITECTURE.md`, sprint_audit_pas7_implementation_06may2026.md (12 bug-uri rezolvate)

---

## ✅ Funcționează corect

### Motor recomandări (Sprint P1.4 + F4 wrapper)

Detalii în [pas6-cpe.md](./pas6-cpe.md) — motorul `generateCpeRecommendations()` + wrapper `anexa-recommendations-aeIIci.js` acoperă AE IIci legal şi conform Cap. 9 Mc 001-2022.

### Plan etapizat reabilitare (`phased-rehab.js`)

Sprint P0-A (6 mai 2026) — refactor Card „Pașaport de Renovare":
- Apel `calcPhasedRehabPlan(measures, budget, strategy, epFinal, category, Au, targetReduction)`
- Mapper smartSuggestions → measures (cost EUR→RON cu getEurRonSync)
- 4 mini-card sumar + listă faze cu măsuri concrete + buton Export DOCX Foaie de Parcurs
- Sprint 17 Pașaport Renovare basic conform EPBD 2024/1275 Art. 12 (DEZACTIVAT temporar 08may2026 — neacceptat juridic RO până la transpunere)

### 3 Scenarii — minim/mediu/maxim (`rehab-scenarios.js`)

Sprint P0-C (6 mai 2026) — sursă canonică unică:
- **MINIM 5cm**: cost mic, reducere EP minimă, doar anvelopă
- **MEDIU 10cm**: cost-optim (NPV maxim tipic)
- **MAXIM 15cm**: nZEB sau mai bine + HP + PV (cu Casa Verde Plus)
- Eliminat conflict multiScenarios-vs-SCENARIO_PRESETS
- Marker `_isHeuristicEstimate: true` la 3 surse cu banner amber în UI

### Cost-optimal Reg. UE 244/2012 / 2025/2273

Vezi [pas5-bilant.md](./pas5-bilant.md) §"NPV / IRR / Cost optimal (`financial.js`)" — implementare completă:
- 3 perspective (financial 4% / social 3% / macroeconomic 3% fără TVA 21%)
- Period 30 ani rezidențial / 20 ani nerezidențial
- Cost global EN 15459-1 Anexa B cu replacements + reziduală automată
- LCOE + B/C Ratio + IRR Newton-Raphson + payback interpolat
- Sensitivity ±10/20% saving + ±200bp rate + ±200bp escalation
- Curba cost-optim Pareto frontier (CostOptimalCurve.jsx)

### REHAB_PRICES — calibrare verificată

Vezi [preturi-actualizate-mai2026.md](./preturi-actualizate-mai2026.md) — 16 surse web 2026 RO verificate (Brig, NovaSol, Greenlead, Necesit, Daibau, etc.):
- ✅ PV on-grid: **perfect calibrat** (1.100 EUR/kWp mid)
- ✅ Centrale gaz condensare: acoperă scenariu manoperă completă
- ✅ HP aer-apă 8-16 kW: acoperă scenarii rural→casă mid-high
- ⚠️ VMC HR full-install: posibil supraestimat 3-5x pentru apartamente standard (notă pentru sprint Q2 2026)
- ✅ Tarife ANRE 2025: electricitate 1.29 RON/kWh ≡ plafon 1.30

**Decizie F2/F5: NU se modifică prețurile** — Sprint Audit Maraton 9 mai 2026 le-a calibrat cu Daibau+ReConstruct+CIDConstruct cross-source + 136 teste noi.

### Pachet documente client reabilitare

Step7Audit.jsx liniile 2034+ („📑 Generare documente — pachet client reabilitare"):
- **Buton ZIP master** A1-A5 + B1 + C1 — toate documentele într-o singură arhivă
- A. Documente oficiale: Raport Audit Energetic (PDF/DOCX), Anexă cost-optim, Plan M&V, FIC (Anexa G Mc 001), Manifest SHA-256
- B. Documente client: Foaie parcurs renovare DOCX (calcPhasedRehabPlan)
- C. Ofertă comercială: Ofertă Reabilitare PDF (OfertaReabilitare.jsx)

### Implementare F5 — Chat AI Reabilitare

**Decizia plan aprobată**: multiplexare pe `api/ai-assistant.js` existing (zero slot Vercel Hobby nou — 12/12 ocupate, Pro planificat dar nu activ).

**`api/ai-assistant.js` extins**:
- Nou param `intent: "rehab-chat"` (default fallback la Q&A normativ original)
- System prompt dedicat `SYSTEM_PROMPT_REHAB_CHAT` cu:
  - Mc 001-2022 Cap. 9 ordine intervenții
  - Ord. MDLPA 16/2023 + 348/2026 (Art. 6 IIci vs Ici)
  - L.372/2005+L.238/2024 + EPBD 2024/1275 (Art. 9 MEPS, Art. 11 ZEB, Art. 13 solar, Art. 17 fosile)
  - Reg. UE 244/2012 republicat 2025/2273 (cost-optim)
  - **Tabel prețuri RO 2026 ÎN PROMPT** (curs EUR/RON ~5.0):
    - Anvelopă, tâmplărie, sisteme HVAC, RES — cu intervale low/mid/high
  - Programe finanțare 2026: Casa Verde Plus, PNRR Comp. C5, Casa Verde Asociații, PEAD
- Context extins (rehab-chat): zoneClimatica, uOpacMediu, uVitrajMediu, heating, acm, buget, au, yearBuilt
- History support max 10 mesaje (5 turns) cu filter role+content valid
- Model selection per intent:
  - `rehab-chat` → **Claude Sonnet 4.6** + 1500 max_tokens (calitate sugestii complexe)
  - `default Q&A` → Claude Haiku 4.5 + 1024 max_tokens (viteză + cost redus)
- Response include `{ answer, intent, model }`

**`src/components/RehabAIChat.jsx` (~250 linii) NOU**:
- Panel flotant bottom-right (W=380px, H=560px) + bubble collapse 💬
- Context auto-trimis la fiecare mesaj din state-ul Step 7
- Calcul U mediu opac (PE/PT/PP) + U mediu vitraj din opaqueElements/glazingElements
- History persistat localStorage cheie unică per proiect (`rehab_chat_history_${projectId}`)
- MAX_HISTORY = 10 (5 turns)
- Auto-scroll la mesaj nou
- Loading indicator 3-dots pulse
- Error handling cu retry message
- Buton clearHistory 🗑
- Suggestions exemple în empty state
- Gating: `hasAccess` prop → if false, sendMessage redirect la `requireUpgrade` callback cu mesaj „Necesită plan AE Ici (1.499 RON/lună) sau superior — AI Pack inclus"
- Context badge top: categorie + clasă + U opac + U vitraj
- Helper exportat `buildChatContext()` pentru testare unitară

**Integrare Step7Audit.jsx**:
- Import `RehabAIChat` adăugat
- `enClassForChat` calculat la top-level main function (nu duplică IIFE deep)
- `<RehabAIChat>` montat înainte de `{/* Navigation */}` (panel flotant — DOM position nu contează)
- Props complete: building/envelopeSummary/instSummary/energyClass/heating/acm/opaqueElements/glazingElements/projectId (cpeCode/mdlpaCode/address fallback) + hasAccess (canAccess step7Audit)

**11 teste noi PASS** în `src/components/__tests__/RehabAIChat.test.js`:
- 2 teste constants (MAX_HISTORY=10, LS_KEY_PREFIX format)
- 9 teste buildChatContext (input gol, building cu address, energyClass obj/string, instSummary ep/rer, U mediu, heating label/source fallback, buget, context complet M1 PAFP Constanța)

---

## ❌ Probleme găsite

**Niciun bug P0 sau P1 nou identificat la engine de calcul Pas 7**. Modulul este foarte matur:
- Sprint Audit Pas 7 IMPLEMENTARE (6 mai 2026): 12 bug-uri rezolvate, 5 docs noi
- Sprint Audit Prețuri Maraton (9 mai 2026): 11 commits, +136 teste, cross-source validation
- Sprint P0-A/B/C (6 mai 2026): RENOVATION_PASSPORT_ENABLED, U_REF anvelopă adaptiv, sursă canonică rehab-scenarios
- Sprint P1 (6 mai 2026): helperi canonici energy-prices + curs EUR/RON LIVE Frankfurter
- Sprint P2 (6 mai 2026): preț electricitate LIVE Eurostat semestrial cu fallback ANRE
- Sprint P3+P4 (9 mai 2026): 6 îmbunătățiri major + Tier 1 cost-index Eurostat

**Implementare nouă F5 — adăugare valoare**:
- ✅ Chat AI Reabilitare cu multiplexare zero-slot Vercel
- ✅ System prompt cu prețuri 2026 RO + programe finanțare actualizate
- ✅ 11 teste noi PASS
- ✅ Zero regresii

---

## 💡 Propuneri îmbunătățire UX

1. **Quick-action chips în RehabAIChat empty state**:
   În locul listă text exemple, butoane click-to-prompt:
   - „🏢 Sumar pachet optim pentru clădirea curentă"
   - „💰 Cum maximizez Casa Verde Plus?"
   - „📊 Compară 3 scenarii — buget 30k EUR"
   - „⚖️ Ce e obligatoriu legal EPBD 2024?"
   **Estimare**: 1-2h impl (3-4 chip buttons cu seed prompts).

2. **Streaming response** (Server-Sent Events):
   Acum `await response.json()` așteaptă răspuns complet. SSE ar afișa tokens progresiv (UX mai bun pentru răspunsuri lungi).
   **Estimare**: 3-4h impl (Anthropic SDK suportă `stream: true` + frontend EventSource).

3. **Markdown rendering** în răspunsuri:
   AI poate returna `**bold**`, listele, tabelele — acum afișat ca plaintext. Adăugare `react-markdown` ar îmbunătăți lizibilitatea.
   **Estimare**: 1h + verificare bundle size (~30KB minified).

4. **Export conversație ca PDF**:
   Buton „📥 Export discuție PDF" la finalul chat-ului — auditorul atașează conversația AI la dosar audit ca dovadă recomandări.
   **Estimare**: 2-3h impl + integrare jsPDF.

---

## 🤖 Funcții AI propuse Pas 7 (deferred sprint viitor)

| Endpoint | Funcție | Ore | Prioritate |
|---|---|---|---|
| `api/ai-rehab-explain.js` (intent="rehab-explain") | Explicație AI per măsură individuală (de ce A1 prioritate) | 3 | P1 |
| `api/_deferred/rehab-prices-update.js` | Vercel cron lunar actualizare prețuri INCD/Daibau | 4 | P2 (post Pro) |
| `api/ai-casa-verde-eligibility.js` | Verificare automată eligibilitate Casa Verde Plus + estimare subvenție | 3 | P2 |

---

## 📊 Grafice Pas 7

Existent:
- ✅ CostOptimalCurve (Pareto frontier 3 perspective + identificare pachet cost-optim)
- ✅ Curba NPV cumulativ 30 ani per pachet (în LCCAnalysis.jsx)
- ✅ Bar chart breakdown investiție per categorie (anvelopă / sisteme / RES)
- ✅ Donut economii energie per măsură
- ✅ Histogram sensitivity NPV ±10/20% saving + ±200bp rate (CostOptimalCurve)

Niciun grafic nou critic.

---

## 📋 Ordine secțiuni Pas 7

Ordine actuală tipică:
1. Quick wins (smart-rehab.js) — măsuri rapide ROI<5 ani
2. 3 scenarii (rehab-comparator.js) — minim/mediu/maxim
3. Pachet etapizat (phased-rehab.js) — plan multi-an
4. CostOptimalCurve — analiză vizuală
5. LCCAnalysis — life cycle cost EN 15459-1
6. MEPSCheck — verificare prag 2030 EPBD Art.9
7. RaportConformareNZEB referință (link spre Pas 6)
8. MEPI — consum reconciliere (link spre Pas 8 Expert+)
9. Pachet documente client (ZIP A1-A5+B1+C1)
10. **Chat AI Reabilitare** (NEW F5 — panel flotant)
11. Navigation Pas 6 / Pas 8

Ordinea este logică. **Reordonare propusă**: mutare „Quick wins" ca primă vizibilitate (auditorul vede instant măsurile cu ROI rapid), apoi scenarii detaliate. Estimare: 2h.

---

## Concluzie Pas 7

**Scor conformitate normativă Pas 7**: **98/100**
- Motor recomandări Mc 001 Cap. 9 + wrapper AE IIci/Ici/Expert tier-aware (F4)
- Plan etapizat conform Sprint P0-A + sursă canonică rehab-scenarios (P0-C)
- Cost-optimal Reg. UE 244/2012 / 2025/2273 cu 3 perspective + replacements + reziduală
- REHAB_PRICES calibrat cu 3 surse cross-validation + teste reproducibile
- Tarife ANRE 2025 + electricitate LIVE Eurostat semestrial (P2 deferred)
- LCC EN 15459-1 Anexa B + LCOE + B/C Ratio + IRR Newton-Raphson
- Pachet documente ZIP master cu manifest SHA-256
- **Chat AI Reabilitare NEW F5** — multiplexare zero-slot Vercel Hobby

**Nou implementat F5**:
- ✅ `api/ai-assistant.js` extins cu intent="rehab-chat" + Sonnet 4.6 + history
- ✅ `src/components/RehabAIChat.jsx` (~250 linii) panel flotant + localStorage
- ✅ Integrare Step7Audit.jsx cu enClassForChat + canAccess gating
- ✅ 11 teste noi PASS (buildChatContext + constants)
- ✅ System prompt dedicat cu prețuri 2026 RO + programe finanțare în text

**Test suite F4→F5**: 3493 → **3504 PASS** (+11 noi, zero regresii, 1 FAIL preexistent neafectat).

**Restanțe deferred** (post upgrade Vercel Pro): `api/_deferred/rehab-prices-update.js` (cron lunar INCD) + `api/_deferred/anre-tariff-scrape.js` (cron lunar ANRE) + `api/_deferred/energy-prices-live.js` (OPCOM/ENTSO-E PV utility-scale spot).
