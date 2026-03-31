# energy-calc.jsx — Hartă Navigare pentru Claude Code

## Fișier: energy-calc.jsx (8760 linii)
## Normativ: Mc 001-2022 + SR EN ISO 52000-1/NA:2023
## Versiune: 2.0 (martie 2026)

---

## STRUCTURĂ PE SECȚIUNI

### 📊 BAZE DE DATE (Liniile 1–940)
| Linie | Constanta | Descriere |
|-------|-----------|-----------|
| 7 | `CLIMATE_DB` | 60 localități, zone I-V, θe, NGZ, solar, temp_month |
| 124 | `T` | Traduceri RO/EN |
| 296 | `CONSTRUCTION_SOLUTIONS` | Soluții constructive prefabricate |
| 330 | `MATERIALS_DB` | **67 materiale** cu λ, ρ, μ |
| 402 | `THERMAL_BRIDGES_DB` | 30 tipuri punți termice cu Ψ, Ψ_izolat |
| 688 | `GLAZING_DB` | Tipuri vitraj cu U, g |
| 709 | `BUILDING_CATEGORIES` | 10 categorii funcționale |
| 740 | `ELEMENT_TYPES` | Tipuri element anvelopă cu Rsi, Rse, τ |
| 750 | `U_REF_NZEB_RES/NRES` | U maxim nZEB rezidențial/nerezidențial |
| 757 | `U_REF_RENOV_RES/NRES` | U maxim renovare |

### ⚙️ INSTALAȚII (Liniile 774–940)
| Linie | Constanta | Descriere |
|-------|-----------|-----------|
| 778 | `HEAT_SOURCES` | **16 surse** incl. GPL, PC aer-aer |
| 798 | `EMISSION_SYSTEMS` | 11 sisteme emisie |
| 812 | `DISTRIBUTION_QUALITY` | 5 niveluri distribuție |
| 822 | `CONTROL_TYPES` | 5 tipuri control |
| 830 | `FUELS` | **8 combustibili** cu fP, fCO2, **prețuri 2025** |
| 843 | `AMBIENT_ENERGY_FACTOR` | Toggle Tabel 5.17 / A.16 (NA:2023) |
| 848 | `ACM_SOURCES` | 8 surse ACM |
| 859 | `COOLING_SYSTEMS` | 7 sisteme răcire |
| 869 | `VENTILATION_TYPES` | 8 tipuri ventilare |
| 880 | `LIGHTING_TYPES` | 7 tipuri iluminat |
| 890 | `LIGHTING_CONTROL` | 6 tipuri control iluminat |
| 906 | `SOLAR_THERMAL_TYPES` | 4 tipuri colectori solari |
| 913 | `PV_TYPES` | 5 tipuri PV (incl. HJT, Bifacial) |
| 935 | `BIOMASS_TYPES` | 5 tipuri biomasă |

### 📐 CLASARE ENERGETICĂ (Liniile 943–998)
| Linie | Constanta | Descriere |
|-------|-----------|-----------|
| 947 | `ENERGY_CLASSES_DB` | Praguri A+→G per categorie |
| 964 | `CLASS_LABELS/COLORS` | Etichete și culori clase |
| 972 | `NZEB_THRESHOLDS` | nZEB: ep_max, rer_min 30% |
| 985 | `CO2_CLASSES_DB` | Praguri CO2 per categorie |

### 🔢 FUNCȚII CALCUL (Liniile 999–1150)
| Linie | Funcție | Standard |
|-------|---------|----------|
| 1001 | `calcUtilFactor()` | Factor utilizare câștiguri (ISO 13790) |
| 1007 | `calcMonthlyISO13790()` | **Bilanț lunar quasi-staționar** |
| 1055 | `glaserCheck()` | Verificare condens simplificată (originală) |
| 1122 | `getEnergyClass()` | Determinare clasă energetică |
| 1138 | `getCO2Class()` | Determinare clasă CO2 |

### 🆕 FUNCȚII NOI (Liniile 1153–1440)
| Linie | Funcție | Standard | Desc |
|-------|---------|----------|------|
| 1157 | `pSatMagnus()` | ISO 13788 | Presiune saturație vapori |
| 1161 | `calcGlaserMonthly()` | **SR EN ISO 13788** | Condens Glaser 12 luni |
| 1255 | `calcFinancialAnalysis()` | **EN 15459-1** | NPV, IRR, Payback, B/C |
| 1342 | `calcSummerComfort()` | **C107/7** | Inerție termică, confort vară |
| 1399 | `ZEB_THRESHOLDS` | **EPBD 2024/1275** | Praguri Zero Emission Building |
| 1412 | `MEPS_THRESHOLDS` | EPBD Art.16 | Standarde minime performanță |
| 1419 | `REHAB_COSTS_2025` | — | Prețuri reabilitare actualizate |

### 🧩 COMPONENTE UI AUXILIARE (Liniile 1440–1535)
| Linie | Componentă |
|-------|-----------|
| 1443 | `Select` |
| 1489 | `Input` |
| 1504 | `Badge` |
| 1510 | `Card` |
| 1522 | `ResultRow` |

### 🏗️ COMPONENTA PRINCIPALĂ (Linia 1681+)

#### State-uri (1681–1920)
| Linie | State | Tab |
|-------|-------|-----|
| 1770 | `building` | Step 1 |
| 1786 | `opaqueElements, glazingElements, thermalBridges` | Step 2 |
| 1800 | `heating, acm, cooling, ventilation, lighting` | Step 3 |
| 1839 | `solarThermal, photovoltaic, heatPump, biomass, otherRenew` | Step 4 |
| 1874 | `auditor` | Step 6 |
| 1889 | `useNA2023` | **Toggle Tabel 5.17/A.16** |
| 1892 | `finAnalysisInputs` | Parametri NPV |

#### Logică Calcul (2530–3260)
| Linie | useMemo | Desc |
|-------|---------|------|
| 2530 | `selectedClimate` | Auto-select climate din localitate |
| 2574 | `calcOpaqueR()` | R termic per element |
| 2587 | `envelopeSummary` | Sumar pierderi anvelopă |
| 2663 | `monthlyISO` | Bilanț lunar ISO 13790 |
| 2676 | `instSummary` | **Calcul instalații complet** |
| 2806 | `renewSummary` | **Sumar regenerabile + EP ajustat** |
| 2924 | `BENCHMARKS` | Date referință stoc clădiri RO |
| 2988 | `monthlyBreakdown` | Defalcare consum pe luni |
| 3047 | `rehabComparison` | Comparație scenarii reabilitare |

#### 🆕 Computații Noi (3130–3260)
| Linie | useMemo | Desc |
|-------|---------|------|
| 3132 | `glaserResult` | Condens Glaser per element |
| 3142 | `zebVerification` | **Verificare nZEB + ZEB** |
| 3172 | `financialAnalysis` | **NPV/IRR/Payback reabilitare** |
| 3224 | `annualEnergyCost` | **Cost anual cu prețuri 2025** |

#### Modale (3264–3475)
| Linie | Modal | Desc |
|-------|-------|------|
| 3264 | `OpaqueModal` | Editor element opac cu straturi |
| 3478 | Bridge Modal inline | Editor punte termică |

#### Randare UI per Step (4046–8600)
| Linie | Step | Conținut |
|-------|------|---------|
| 4046 | **Step 1** | Identificare clădire, geometrie, climă |
| 4309 | **Step 2** | Anvelopă: opace, vitrate, punți termice |
| 4578 | **Step 3** | Instalații: încălzire, ACM, răcire, ventilare, iluminat |
| 4912 | **Step 4** | Regenerabile: solar termic, PV, PC, biomasă, eolian, CHP |
| 5280 | **Step 5** | Calcul: bilanț, clase, grafice, consum lunar |
| 6143 | **Step 6** | Certificat: preview CPE, date auditor, export |
| 8002 | **Step 7** | Audit: recomandări, scenarii reabilitare, radar |

#### Elemente Fixe (8600+)
| Linie | Element |
|-------|---------|
| 8666 | Tour/Onboarding overlay |
| 8672 | Mobile bottom navigation |
| 8692 | Project Manager modal |
| 8736 | Reset confirm modal |

---

## TODO-uri pentru dezvoltare ulterioară

### 🔴 PRIORITATE CRITICĂ — TOATE REZOLVATE

### 🟡 PRIORITATE MEDIE (rămase)
- [ ] Dev mode preview crash — SWC Fast Refresh pe 80+ hooks. Workaround: `npm run build && npx serve dist -s -l 5173`. Build-ul de producție funcționează perfect.
- [ ] Praguri EPBD A-G — Valorile curente sunt estimate bazate pe EPBD 2024/1275 + Reg. UE 2025/2273. Actualizare necesară când se publică ordinul ministerial RO oficial.

### ✅ REZOLVATE în v3.1 (2026-03-31)
- [x] **Export PDF nativ**: jsPDF + autotable, A4, 4 secțiuni, clase colorate, tabel consum, badge nZEB
- [x] **ISO 52016-1 framework**: calcHourlyISO52016() — 5R1C simplified, 8760h, ready for TMY data
- [x] **EPBD A-G rescaling**: getEnergyClassEPBD() cu EPBD_AG_THRESHOLDS configurabile + toggle EPBD_AG_ACTIVE
- [x] **Team UI**: Modal echipă cu creare, invitații, manage members, cloud projects browser, buton 👥 toolbar
- [x] **Supabase Auth**: Login/Register/Google OAuth + cloud projects (src/lib/auth.jsx, useZephrenCloud.js)
- [x] **API REST**: 3 endpoints Vercel serverless (api/calculate.js, generate-xml.js, ai-assistant.js)
- [x] **Stripe Checkout**: api/create-checkout.js + api/stripe-webhook.js, activateTier() cu redirect
- [x] **Multi-user/echipă**: Schema SQL (teams, team_members, team_invitations) + RLS policies
- [x] **AI Assistant**: Claude Haiku funcțional, chat cu context (building, ep, rer, category)
- [x] **Export Excel**: .xlsx cu 5 sheet-uri (Clădire, Opace, Vitraje, Punți, Rezultate) via xlsx
- [x] **Import ENERG+**: Parser XML pentru format ENERG+ (building info + opaque elements)
- [x] **Export XML MDLPA**: Client-side XML complet + API endpoint generate-xml.js
- [x] **Cloud sync**: Buton ☁️ salvare cloud, indicator user, logout din toolbar
- [x] **Plan gating**: free/pro/business cu canAccess(), sync tier din Supabase profile
- [x] **SWC plugin**: Migrare @vitejs/plugin-react → @vitejs/plugin-react-swc (fix Fast Refresh 82+ hooks)
- [x] **TMY Generator**: generateTMY() — sinusoidal diurnal + solar radiation, 8760h din 12 luni
- [x] **ISO 52016-1 hourly calc**: calcHourlyISO52016 wired cu TMY auto-generat, useMemo hourlyISO
- [x] **EPBD A-G activat**: EPBD_AG_ACTIVE=true, getEnergyClassEPBD() folosită peste tot
- [x] **Dev mode fix**: launch.json cu npx serve dist pentru preview production build

### ✅ REZOLVATE în v3.0 (2026-03-31)
- [x] **GLASER-UI**: Diagramă Glaser SVG vizuală (profil temp + punct de rouă)
- [x] **ZEB-UI**: Dashboard sumar cu status nZEB/ZEB + badges
- [x] **FIN-UI**: Analiză financiară + multi-scenariu comparație
- [x] **COST-UI**: Cost anual cu defalcare + dashboard KPI
- [x] **SUMMER-UI**: Confort termic vară per element (Cat. I-IV)
- [x] **BACS**: Verificare BACS obligatoriu (EPBD Art.14, >290kW)
- [x] **EV-CHARGER**: Calcul puncte încărcare EV (EPBD Art.12)
- [x] **SOLAR-READY**: Checklist solar-ready (EPBD Art.11)
- [x] **GWP-LIFECYCLE**: GWP detaliat EN 15978 pe materiale
- [x] **Grafic Sankey**: Flux energie intrări vs. pierderi
- [x] **Hartă climatică**: SVG interactivă România cu 30+ localități
- [x] **Galerie foto**: Upload imagini clădire pe zone
- [x] **Catalog produse**: Ferestre (Rehau/Veka/Gealan), PC (Daikin/Viessmann), PV (LONGi/JA Solar)
- [x] **Smart rehab**: Motor sugestii reabilitare prioritizate
- [x] **Infiltrații aer**: Calcul n50 → clasificare etanșeitate
- [x] **Iluminat natural**: FLZ simplificat + reducere LENI
- [x] **Print layout**: CSS print optimizat A4
- [x] **Animații**: fadeSlideIn + scaleIn tranziții
- [x] **Keyboard shortcuts**: Ctrl+M (hartă), Ctrl+Shift+P (prezentare), F1 (ghid)
- [x] **Notificări CPE**: Alert expirare în <1 an
- [x] **Template-uri noi**: +5 tipologii (garsonieră, duplex, hală, școală, spital)
- [x] **Prețuri materiale 2026**: Bază de date detaliată EUR
- [x] **Traduceri EN**: 11 chei noi pentru features v3

---

## Comenzi utile Claude Code

```bash
# Navigare rapidă la secțiuni
grep -n "TODO-" energy-calc.jsx
grep -n "FUELS\|HEAT_SOURCES\|MATERIALS_DB" energy-calc.jsx
grep -n "step === [1-7]" energy-calc.jsx
grep -n "useMemo\|useCallback" energy-calc.jsx | head -30

# Verificare structură
python3 -c "c=open('energy-calc.jsx').read(); print(f'{{: {c.count(chr(123))}  }}: {c.count(chr(125))}')"

# Căutare funcții de calcul
grep -n "^function \|= useMemo\|= useCallback" energy-calc.jsx
```
