# Pas 5 — Bilanț energetic + clasă A++→G + NPV — Audit mai 2026 (F3)

**Data**: 11 mai 2026
**Auditor**: Claude Opus 4.7 (1M, Max effort)
**Fișiere principale**:
- `src/steps/Step5Calculation.jsx` (orchestrator UI)
- `src/calc/iso13790.js` (metodă lunară quasi-stationary)
- `src/calc/hourly.js` (metodă orară SR EN ISO 52016-1 — opțional Pro+)
- `src/calc/energy-class.js` (clasificare A+→G cu versioning EPBD 2024)
- `src/calc/classification.js` (legacy wrapper)
- `src/calc/reference-building.js` (clădire de referință Cap. 6 Mc 001-2022)
- `src/calc/financial.js` (NPV / IRR / B/C / LCOE / sensitivity)
- `src/calc/shading-factor.js` (Anexa E Mc 001 — calcFsh)
- `src/data/energy-classes.js` (CLASS_LABELS + CLASS_COLORS)
- `src/data/u-reference.js` (factori fp + ZEB_THRESHOLDS + NZEB_EP_FALLBACK)
- `src/components/CostOptimalCurve.jsx` (curba cost-optimă cu 3 perspective)

**Documente conexe**: `CONFORMITATE_NORMATIVA_v4.md` §6 (calcule energetice 94/100), `DEMO_MODELS_TEST_MATRIX.md`

---

## ✅ Funcționează corect

### Metodă lunară quasi-stationary (`iso13790.js`)

1. **Formula bilanț lunar conform SR EN ISO 13790 / 52016-1:**
   ```
   H_total = H_tr + H_ve + H_inf
   Q_loss = (H_tr + H_ve + H_inf) × ΔT × hours
   Q_gain = Q_int + Q_sol
   Q_H,nd = Q_loss − η_H × Q_gain  (sezon încălzire)
   Q_C,nd = Q_gain − η_C × Q_loss  (sezon răcire)
   ```

2. **Termeni H corect implementați**:
   - `H_tr = G_env` (transmission din useEnvelopeSummary)
   - `H_ve = 0.34 × n_vent × V × (1 − hrEta)` cu n_vent configurabil (fallback 0.5 h⁻¹ minim igienic)
   - `H_inf = 0.34 × n50 × V × e_shield` cu `WIND_SHIELD_FACTOR` (protejat 0.02 / mediu 0.07 / expus 0.15) — conform SR EN ISO 13789:2017 §8.3 Tab 8

3. **Capacitate termică interioară** `Cm = Au × THERMAL_MASS_CLASS[structure]`:
   - 8 tipuri structură mapate la valori J/(m²·K) conform Mc 001-2022 Tab 2.20:
     - Foarte ușoară (metal / lemn): 80.000
     - Medie (panouri prefabricate / cadre beton / pereți cortină / BCA / mixtă): 165.000
     - Masivă (zidărie portantă): 260.000

4. **Constantă timp + factor utilizare câștiguri** (Sprint 13, 18 apr 2026):
   - `τ = Cm / (H_total × 3600)` în ore
   - `τ_H,0` diferențiat per categorie conform SR EN ISO 52016-1:2017/NA:2023 §A.34:
     - **15h rezidențial** (RI, RC, RA, CP) — ocupare continuă 24/24
     - **30h nerezidențial** (BI, ED, SA, HC, CO, SP, AL) — ocupare intermitentă, inerție amplificată
   - `a_H = 1 + τ / τ_H,0`
   - `η_H = calcUtilFactor(γ, a)` formula ISO 13790 (1 − γ^a)/(1 − γ^(a+1))
   - Edge cases: γ<0 → 1; |γ−1|<0.001 → a/(a+1)

5. **Câștiguri interne `Q_int = q_int × Au × hours`**:
   `qIntMap`: RI/RC/RA=4, BI=8, ED=6, SA=5, HC=4.5, CO=8, SP=5, AL=5 W/m²
   - Rezidențial 4 W/m² la limita inferioară Mc 001 (4-6 W/m² interval)
   - Birou 8 W/m² conform Mc 001 standard (plan general propunea 10-15 dar Mc 001 RO folosește 8 ca default — **conform**)

6. **Câștiguri solare lunare per orientare**:
   - 8 orientări cardinale: N (0.08), NE (0.08), E (0.17), SE (0.17), S (0.25), SV (0.08), V (0.10), NV (0.07) — distribuție tipologică `orientDist`
   - Orientare "Mixt" → distribuit pe toate 8
   - Orientare "Orizontal" → cheie "Oriz" din climate.solar
   - Formula: `Q_sol = Σ(Ag × g × (1−frame_ratio) × shading_factor × F_sh × I_solar × monthFraction)`
   - **F_sh per fereastră** via `calcFsh(el)` (Sprint 22 #15) — Mc 001-2022 Anexa E (streașină + aripi laterale + obloane mobile)

7. **Fracții solare lunare** calibrate pe PVGIS RO cu ajustare latitudine ±10% (formula `calcMonthlyRadFraction`):
   - Distribuție tipică: [Ian 0.04, Feb 0.055, Mar 0.09, Apr 0.11, Mai 0.125, Iun 0.13, Iul 0.14, Aug 0.125, Sep 0.095, Oct 0.065, Nov 0.04, Dec 0.03]
   - Normalizare suma = 1

8. **Temperatură echilibru DINAMICĂ** (linia 132-135 iso13790.js):
   - `θ_balance = θ_int − Q_gain / (H_total × hours/1000)`
   - Calcul răcire DOAR dacă `tExt > min(θ_balance, θ_int − 4)` — evită răcire eronată în luni reci
   - Înainte: prag hardcoded tExt>15 — fix aplicat

### Clase A+→G (`energy-class.js`)

9. **Versioning ord16_2023 → epbd_2024**:
   - `ord16_2023` default: 13 categorii cu 7 praguri fiecare conform Mc 001-2022 Cap. 5 Tab. 5.1-5.14
   - `epbd_2024` placeholder (Sprint P1-3): praguri shiftate cu ZEB=A pentru tranziție EPBD 2024/1275 Art. 19 (transpunere RO termen 29 mai 2026)
   - Activare prin feature flag `EPBD_2024_THRESHOLDS` (NU activ în producție până la transpunerea oficială MDLPA)

10. **Praguri verificate**:
    - **RI cu cooling**: 91 (A+) / 129 (A) / 257 (B) / 390 (C) / 522 (D) / 652 (E) / 783 (F), G>783 — conform Mc 001 ✅
    - **RC fără cooling** (rezidențial colectiv standard): 60 / 84 / 168 / 260 / 352 / 440 / 528 ✅
    - **BI birou**: 68 / 97 / 193 / 302 / 410 / 511 / 614 ✅
    - **ED educație**: 48 / 68 / 135 / 246 / 358 / 447 / 536 ✅
    - **SA sănătate spital**: 117 / 165 / 331 / 501 / 671 / 838 / 1005 (cele mai mari praguri datorită utilizării intensive) ✅
    - **CO comercial**: 88 / 124 / 248 / 320 / 393 / 492 / 591 ✅

11. **Funcția `classifyEnergyClass(epKwhM2, categoryKey, version)`**:
    - Returnează `{ cls, idx, score, color, version }`
    - Score 1-100 cu interpolare în bandă
    - Robust la categoryKey lipsă → "—" / score 0 / color #666666
    - Edge case EP > F → returnează G cu score 1

### Clădirea de referință (`reference-building.js`)

12. **Echipamente standard Mc 001-2022 Cap. 6** (Audit P1.9, 2 mai 2026):
    - REF_ETA_HEATING = 0.92 (centrală condensare standard)
    - REF_ETA_ACM = 0.85 (boiler standard)
    - REF_EER_COOLING = 3.5 (split inverter)
    - REF_HR_VENT = 0 (clădirea de referință NU are recuperare căldură)
    - REF_LENI = 8 kWh/(m²·an) (LED standard rezidențial)

13. **Strategy bilanț pe utilități** (NOT scalare totală proporțională):
    - `qf_h_ref = qf_h_real × (η_real / η_ref)` — nevoia termică e aceeași; doar randamentul diferă
    - `qf_w_ref = qf_w_real × (η_real_acm / η_ref_acm)`
    - `qf_c_ref = qf_c_real × (EER_real / EER_ref)`
    - `qf_v_ref = qf_v_real × (1 − REF_HR_VENT) / (1 − hrEta_real)` cu REF_HR_VENT=0
    - `qf_l_ref = REF_LENI × Au` — standard, nu scalare
   
14. **Fallback proporțional** pentru inputs lipsă (`instSummary` undefined) — flag `usedFallback: true` în output. Compatibilitate cu pre-S30A.

15. **NZEB EP fallback per categorie** (Audit P1.10, 2 mai 2026):
    - RI=105, RC=110, RA=105, BI=130, ED=150, SA=145, HC=145, CO=130, SP=145, AL=175 (conservator)
    - Sursă: Mc 001-2022 Partea III §5.4 + HG 1593/2022 (modif. HG 1455/2022)
    - Folosit DOAR când `getNzebEpMax(cat, climateZone)` returnează undefined

### NPV / IRR / Cost optimal (`financial.js`)

16. **3 perspective conform Reg. UE 244/2012 republicat 2025/2273**:
    - `financial` (privat): discountRate **4%**, escalation 3%, includeVAT true
    - `social`: discountRate **3%**, escalation 3%, includeVAT true (Sprint 26 P1.2)
    - `macroeconomic`: discountRate **3%**, escalation 3%, **includeVAT FALSE** (exclude TVA 21% RO 2026)

17. **Perioada default**: **30 ani** (rezidențial conform Reg. UE 244/2012)

18. **Indicatori financiari complete**:
    - **NPV** (Net Present Value) cu actualizare anuală
    - **IRR** Newton-Raphson cu guards (-50% < IRR < 200%, NaN → null)
    - **Payback simplu** + **Payback actualizat** cu interpolare liniară (Sprint 26 P1.5)
    - **B/C Ratio** conform EN 15459-1 §B.1.3 (numărător Σ benefits_disc, numitor I + Σ maint_disc + Σ replace_disc)
    - **Cost global** EN 15459-1 Anexa B cu replacements + valoare reziduală
    - **LCOE** (EUR/kWh) cu replacements actualizate (Sprint 26 P1.4 fix)
    - **Sensitivitate NPV** ±10/20% pe saving + ±200bp pe discountRate + ±200bp pe escalation (Sprint 26 P1.3)

19. **Valoare reziduală automată** prin `componentsForResidual` cu lifespan per componentă:
    - Calcul liniar `(invest × remainingLifespan / lifespan)` actualizat la final perioadă
    - Edge case `ageAtEnd === 0` → reziduală 0 (tocmai a terminat ciclul)

20. **Guards Sprint S30A·A10**:
    - `investCost ≤ 0` || `annualSaving ≤ 0` → returnează `null` explicit
    - Anterior: IRR=1430%, NPV=24.663 lei când câmpuri goale (BUG REPARAT)

21. **VAT 21% RO 2026** corect aplicat pentru perspectiva macroeconomică (exclude TVA din invest + maint)

### CostOptimalCurve

22. **`CostOptimalCurve.jsx`** + `calcAllPerspectives()` permit toggle instantaneu între 3 perspective fără re-calcul (3 calculatoare paralele)
23. Curba cost-optimă afișează:
    - Investiție vs EP_specific reducere
    - Detectare pachet cost-optim (NPV maxim)
    - Pachet nZEB (EP ≤ prag MEPS)
    - Outlier detector 5 niveluri (Sprint Audit Prețuri P3)

### Demo M1-M5

24. **Test `demo-financial-snapshot.test.js`**: **11/11 PASS** — outputs reproductibile cu seed fix (curs EUR/RON 5.10):
    - M1 RA Constanța 1975 PAFP DH → clasă G (baseline pur)
    - M2 RI Cluj 1965 cărămidă → clasă D-E
    - M3 BI București 2005 birouri VRF → clasă C
    - M4 ED Brașov 1980 școală → clasă F
    - M5 RI Sibiu 2022 nZEB → clasă A
   
25. **Test `demoProjects-v2.test.js`** linia 106-222: verifică schema completă demos cu observații tehnice detaliate (PAFP sandwich, U_pereți 1.47, n50=7.5 h⁻¹, Ψ punți 0.45-0.65)

---

## ❌ Probleme găsite

**Niciun bug P0 sau P1 nou identificat la Pas 5 în această sesiune**. Modul matur post multiple sprint-uri:
- Sprint 11: factori fp Tab A.16 (NA:2023)
- Sprint 13: τ_H,0 diferențiat (NA:2023 §A.34)
- Sprint 22 #15: F_sh per fereastră (Mc 001 Anexa E)
- Sprint 26 P1.1-P1.5: financial perspective + escalation + sensitivity + LCOE + payback interpolation
- Sprint S30A·A2/A8/A10: PB peste subsol fix + EP 1 zecimală + guards investCost/annualSaving
- Sprint S30B·B6: profile ocupare extinse
- Sprint P1.9: clădire referință bilanț pe utilități (nu scalare totală)
- Sprint P1.10: NZEB_EP_FALLBACK per categorie

**P2 — observații minore** (nu necesită fix, doar UX optim):

- P2.1 — `qIntMap` câștiguri interne (linia 85 iso13790.js): rezidențial 4 W/m² și birou 8 W/m² sunt la **limita inferioară a intervalelor Mc 001-2022**. Pentru sensibilitate, plan propunea verificare 4-6 (rez) / 10-15 (birou). Valorile Zephren sunt conforme Mc 001 standard dar **conservatoare**. Pentru clădiri ocupate intensiv (open-space cu mulți utilizatori + servere), auditorul ar putea avea nevoie de override manual. **Recomandare**: adaugă slider/input pentru `q_int_override` cu validare 2-20 W/m² în Step5 advanced (~1h impl).

- P2.2 — Metoda lunară SR EN ISO 13790 (deprecat 2017, înlocuit oficial cu ISO 52016-1:2017). Comentariul `TODO-ISO52016` din linia 9 menționează planul de upgrade. **Status actual**: SR EN ISO 52016-1 este implementat parțial în `hourly.js` pentru Pro+, dar valoarea adăugată pentru audit RO este limitată (Mc 001-2022 acceptă metoda lunară). **Recomandare**: amânare deliberată cu update la viitoarea actualizare normativă MDLPA.

- P2.3 — `epbd_2024` placeholder thresholds: valorile sunt provizorii (-25% față de ord16_2023). **Activare doar după transpunere oficială RO** (termen 29 mai 2026 — verifică status la commit deploy).

---

## 💡 Propuneri îmbunătățire UX

1. **Vizualizare lunară Q_H_nd vs Q_C_nd bar chart**:
   În `CostOptimalCurve.jsx` deja există, dar pentru Step5 ar fi util un mini-chart înainte de a intra în CostOptimalCurve (Step 7). 12 bare lunare cu split heating/cooling. **Estimare**: 2-3h impl.

2. **Indicator vizual câștiguri solare vs câștiguri interne**:
   Donut chart Q_int / Q_sol cu detalii per orientare. **Estimare**: 2h impl.

3. **Slider θ_int (temperatura interioară) cu impact real-time**:
   Auditorul poate explora scenarii (20°C standard vs 22°C confort vs 18°C economic) cu recalcul instant EP + clasă. **Estimare**: 2h impl.

4. **Banner conformitate ZEB EPBD Art.11**:
   Dacă `EP ≤ ZEB_THRESHOLDS[category].ep_max × ZEB_FACTOR (0.9)` și `RER ≥ rer_min (80%)` → afișează „🌍 Conform ZEB EPBD 2024 Art.11" cu detalii. Există deja `zeb-compliance.js`, verifică integrare UI Step5.

---

## 🤖 Funcții AI propuse Pas 5 (pentru `ai-features-architecture.md`)

| Endpoint | Funcție | Ore | Prioritate |
|---|---|---|---|
| `api/ai-ep-explain.js` | Text narativ 200-300 cuvinte explicând EP + clasă + factori | 5 | P1 |
| `api/ai-anomaly-detect.js` | EP aberant (>500 casă / <30 RI) → alertă verificare | 3 | P1 |
| `api/ai-class-roadmap.js` | Drum de la clasă curentă la nZEB cu măsuri prioritizate | 5 | P2 |

Toate prin multiplexare `api/ai-assistant.js > intent` (zero slot Vercel nou).

---

## 📊 Grafice Pas 5

- **Bilanț energetic donut**: pierderi (transmission/ventilation/infiltration) vs câștiguri (solar/intern) — există în Step8 Pasivhaus tab
- **Curba 12 luni Q_H_nd + Q_C_nd**: există parțial în `MonteCarloEP.jsx` (Pro+)
- **Clasă energetică gauge A+→G**: există în Step5/Step6 cu CLASS_COLORS din `energy-classes.js`
- **NPV cumulativ 30 ani**: există în `CostOptimalCurve.jsx`
- **Sensitivity NPV waterfall**: există dar e în Step8 (poate fi adus în Step5 pentru AE Ici)

Niciun grafic nou critic propus.

---

## 📋 Ordine secțiuni Pas 5

Ordine actuală tipică Step5:
1. Calcul lunar (table 12 luni × {Q_loss, Q_gain, Q_H,nd, Q_C,nd})
2. EP_H / EP_W / EP_C / EP_V / EP_L breakdown cu fp aplicat
3. EP_total + clasă energetică
4. Verificare nZEB (vs prag categorie + zonă)
5. Verificare ZEB (Art.11 EPBD)
6. Clădire de referință (qf_ref + ep_ref)
7. NPV preview + buton spre Step 7 cost-optimal

Ordinea este logică (calcul → sumar → comparare). Niciun rearanjament urgent.

---

## Concluzie Pas 5

**Scor conformitate normativă Pas 5**: **95/100**
- Metodă lunară SR EN ISO 13790 conformă + extensii NA:2023 (τ_H,0 diferențiat, F_sh per fereastră)
- Clase A+→G cu versioning EPBD 2024 (placeholder)
- Clădire referință cu bilanț pe utilități (P1.9)
- NPV/IRR/B/C/LCOE conform EN 15459-1 + Reg. UE 244/2012 republicat
- 3 perspective financial/social/macroeconomic
- Guards anti-bug pe IRR explosiv (S30A·A10)
- 5 demo-uri M1-M5 snapshot-stable (11 teste PASS)
- Comentariu `TODO-ISO52016` pentru upgrade viitor planificat

**Niciun fix de cod aplicat în F3 — modulul este matur și conformitatea este excelentă.**

Restanțe P2 minore: q_int_override manual (~1h), upgrade SR EN ISO 52016-1 (amânat la actualizare normativă MDLPA), activare `epbd_2024` thresholds (post transpunere oficială RO).
