import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  ENERGY-CALC.JSX — Calculator Performanță Energetică Clădiri               ║
// ║  Versiune: 2.0 | Data: 2026-03-25 | Linii: ~8770                          ║
// ║                                                                             ║
// ║  Normative:                                                                 ║
// ║    • Mc 001-2022 (Ordinul MDLPA nr. 16/2023)                               ║
// ║    • SR EN ISO 52000-1:2017/NA:2023 (Tabel A.16 — factor ambient)          ║
// ║    • C107/2005 + Ord. 2513/2010 + Ord. 2641/2017                           ║
// ║    • Legea 372/2005 mod. prin Legea 238/2024 + OUG 59/2025 (RED III)       ║
// ║    • Directiva EPBD 2024/1275 (ZEB, MEPS, scală A-G)                       ║
// ║    • Reg. delegat UE 2025/2273 (metodologie cost-optimă, 50 kWh/m²an)      ║
// ║    • SR EN ISO 13790 (bilanț lunar — activ)                                ║
// ║    • SR EN ISO 13788 (condens Glaser)                                      ║
// ║    • SR EN ISO 14683 (punți termice)                                       ║
// ║    • SR EN ISO 6946 (R/U elemente opace)                                   ║
// ║    • SR EN ISO 10077-1 (U ferestre, ψ_spacer)                              ║
// ║    • SR EN ISO 13370 (transfer termic prin sol)                             ║
// ║    • EN 15193-1 (LENI iluminat)                                            ║
// ║    • EN 15459-1 (analiză financiară reabilitare)                            ║
// ║    • I5-2022 (normativ ventilare și climatizare — Ord. MDLPA 2023)         ║
// ║    • SR 4839:2014 (grade-zile, 111 localități, date 1981-2010)             ║
// ║    • C107/7-2002 (confort termic vară)                                     ║
// ║    • EN 15978 (GWP ciclu viață — estimare simplificată)                     ║
// ║                                                                             ║
// ║  Secțiuni principale (căutare rapidă):                                      ║
// ║    L.7     CLIMATE_DB          — 60 localități, zone I-V                   ║
// ║    L.330   MATERIALS_DB        — 67 materiale cu λ, ρ, μ                   ║
// ║    L.402   THERMAL_BRIDGES_DB  — 30 tipuri punți termice                   ║
// ║    L.778   HEAT_SOURCES        — 16 surse încălzire                        ║
// ║    L.830   FUELS               — 8 combustibili cu prețuri 2025            ║
// ║    L.947   ENERGY_CLASSES_DB   — Praguri clasare A+→G                      ║
// ║    L.1007  calcMonthlyISO13790 — Bilanț lunar quasi-staționar              ║
// ║    L.1161  calcGlaserMonthly   — Condens Glaser 12 luni (NOU)             ║
// ║    L.1255  calcFinancialAnalysis — NPV/IRR/Payback (NOU)                  ║
// ║    L.1342  calcSummerComfort   — Confort vară C107/7 (NOU)                ║
// ║    L.1399  ZEB_THRESHOLDS      — EPBD 2024/1275 (NOU)                     ║
// ║    L.1681  EnergyCalcApp       — Componenta principală                     ║
// ║    L.4046  Step 1 UI           — Identificare clădire                      ║
// ║    L.4309  Step 2 UI           — Anvelopă termică                          ║
// ║    L.4578  Step 3 UI           — Instalații HVAC                           ║
// ║    L.4912  Step 4 UI           — Surse regenerabile                        ║
// ║    L.5280  Step 5 UI           — Bilanț energetic                          ║
// ║    L.6143  Step 6 UI           — Certificat CPE                            ║
// ║    L.8002  Step 7 UI           — Audit & recomandări                       ║
// ║                                                                             ║
// ║  TODO-uri (grep -n "TODO-" energy-calc.jsx):                                ║
// ║    TODO-ISO52016  — Migrare la metoda orară ISO 52016-1                    ║
// ║    TODO-EPBD-AG   — Rescalare clase A-G conform EPBD recast               ║
// ║    TODO-GLASER-UI — UI vizualizare diagrame Glaser                         ║
// ║    TODO-ZEB-UI    — UI verificare Zero Emission Building                   ║
// ║    TODO-FIN-UI    — UI analiză financiară reabilitare                      ║
// ║    TODO-COST-UI   — UI cost anual energie cu prețuri 2025                  ║
// ║    TODO-SUMMER-UI — UI confort termic vară per element                     ║
// ║    TODO-XML-EXPORT — Export XML registru electronic MDLPA                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════
// BAZE DE DATE INTEGRATE — Mc 001-2022
// ═══════════════════════════════════════════════════════════════

const CLIMATE_DB = [
  { name:"București", zone:"II", theta_e:-15, ngz:3170, alt:85, theta_a:10.6, season:190, lat:44.43,
    solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360},
    temp_month:[-1.5,0.5,5.5,11.5,17.0,20.5,22.5,22.0,17.0,11.0,5.0,0.5] },
  { name:"Cluj-Napoca", zone:"III", theta_e:-18, ngz:3730, alt:410, theta_a:8.3, season:218, lat:46.77,
    solar:{S:400,SE:320,E:200,NE:115,N:95,NV:115,V:200,SV:320,Oriz:340},
    temp_month:[-3.5,-1.5,3.5,9.5,14.5,17.5,19.5,19.0,14.5,9.0,3.0,-1.5] },
  { name:"Constanța", zone:"I", theta_e:-12, ngz:2840, alt:13, theta_a:11.5, season:186, lat:44.18,
    solar:{S:430,SE:350,E:220,NE:125,N:105,NV:125,V:220,SV:350,Oriz:370},
    temp_month:[0.5,1.5,5.0,10.5,16.0,20.5,23.0,23.0,18.5,13.0,7.0,2.5] },
  { name:"Iași", zone:"III", theta_e:-18, ngz:3510, alt:102, theta_a:9.4, season:201, lat:47.16,
    solar:{S:390,SE:310,E:195,NE:110,N:90,NV:110,V:195,SV:310,Oriz:330},
    temp_month:[-3.0,-1.0,4.0,10.5,16.0,19.5,21.5,21.0,16.0,10.0,3.5,-1.0] },
  { name:"Timișoara", zone:"II", theta_e:-15, ngz:3180, alt:90, theta_a:10.6, season:190, lat:45.76,
    solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350},
    temp_month:[-1.0,1.0,6.0,11.5,17.0,20.0,22.0,21.5,17.0,11.0,5.0,0.5] },
  { name:"Brașov", zone:"IV", theta_e:-21, ngz:4030, alt:625, theta_a:7.5, season:227, lat:45.65,
    solar:{S:390,SE:310,E:195,NE:112,N:92,NV:112,V:195,SV:310,Oriz:330},
    temp_month:[-4.5,-2.5,2.0,8.0,13.0,16.0,18.0,17.5,13.0,7.5,1.5,-2.5] },
  { name:"Sibiu", zone:"III", theta_e:-18, ngz:3660, alt:415, theta_a:8.5, season:215, lat:45.80,
    solar:{S:400,SE:320,E:200,NE:115,N:95,NV:115,V:200,SV:320,Oriz:340},
    temp_month:[-3.5,-1.0,4.0,9.5,14.5,17.5,19.5,19.0,14.5,9.0,3.0,-1.5] },
  { name:"Oradea", zone:"II", theta_e:-15, ngz:3150, alt:136, theta_a:10.2, season:195, lat:47.07,
    solar:{S:400,SE:320,E:200,NE:115,N:95,NV:115,V:200,SV:320,Oriz:340},
    temp_month:[-2.0,0.5,5.5,11.0,16.5,19.5,21.5,21.0,16.5,10.5,4.5,-0.5] },
  { name:"Craiova", zone:"II", theta_e:-15, ngz:3170, alt:192, theta_a:10.6, season:190, lat:44.32,
    solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360},
    temp_month:[-1.5,1.0,6.0,12.0,17.5,21.0,23.0,22.5,17.5,11.5,5.0,0.0] },
  { name:"Bacău", zone:"III", theta_e:-18, ngz:3630, alt:175, theta_a:9.0, season:209, lat:46.57,
    solar:{S:390,SE:310,E:195,NE:110,N:90,NV:110,V:195,SV:310,Oriz:330},
    temp_month:[-3.5,-1.5,3.5,10.0,15.5,19.0,21.0,20.5,15.5,9.5,3.0,-1.5] },
  { name:"Suceava", zone:"IV", theta_e:-21, ngz:4080, alt:352, theta_a:7.5, season:230, lat:47.65,
    solar:{S:380,SE:300,E:190,NE:108,N:88,NV:108,V:190,SV:300,Oriz:320},
    temp_month:[-4.5,-2.5,2.0,8.5,14.0,17.0,19.0,18.5,14.0,8.0,2.0,-2.5] },
  { name:"Miercurea Ciuc", zone:"V", theta_e:-25, ngz:4250, alt:661, theta_a:6.5, season:242, lat:46.36,
    solar:{S:380,SE:300,E:185,NE:105,N:85,NV:105,V:185,SV:300,Oriz:315},
    temp_month:[-6.5,-4.5,0.5,6.5,11.5,14.5,16.5,16.0,11.5,6.0,0.0,-4.0] },
  { name:"Predeal", zone:"IV", theta_e:-21, ngz:5090, alt:1040, theta_a:4.8, season:259, lat:45.50,
    solar:{S:370,SE:290,E:180,NE:102,N:82,NV:102,V:180,SV:290,Oriz:310},
    temp_month:[-6.0,-4.5,0.0,5.5,10.5,13.5,15.5,15.0,10.5,5.5,-0.5,-4.0] },
  { name:"Galați", zone:"III", theta_e:-18, ngz:3350, alt:71, theta_a:10.0, season:198, lat:45.44,
    solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350},
    temp_month:[-2.0,0.0,5.0,11.0,17.0,20.5,22.5,22.0,17.0,11.0,4.5,-0.5] },
  { name:"Pitești", zone:"II", theta_e:-15, ngz:3150, alt:310, theta_a:10.2, season:192, lat:44.86,
    solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350},
    temp_month:[-1.5,1.0,5.5,11.5,16.5,20.0,22.0,21.5,16.5,11.0,5.0,0.5] },
  { name:"Ploiești", zone:"II", theta_e:-15, ngz:3200, alt:150, theta_a:10.4, season:192, lat:44.94,
    solar:{S:415,SE:335,E:208,NE:119,N:99,NV:119,V:208,SV:335,Oriz:355},
    temp_month:[-1.5,0.5,5.5,11.5,17.0,20.5,22.5,22.0,17.0,11.0,5.0,0.5] },
  { name:"Brăila", zone:"II", theta_e:-15, ngz:3250, alt:26, theta_a:10.8, season:188, lat:45.27,
    solar:{S:415,SE:335,E:210,NE:120,N:100,NV:120,V:210,SV:335,Oriz:355},
    temp_month:[-1.5,0.5,5.5,11.5,17.5,21.0,23.0,22.5,17.5,11.5,5.0,0.0] },
  { name:"Arad", zone:"II", theta_e:-15, ngz:3100, alt:117, theta_a:10.8, season:188, lat:46.18,
    solar:{S:405,SE:325,E:203,NE:116,N:96,NV:116,V:203,SV:325,Oriz:345},
    temp_month:[-1.0,1.5,6.5,12.0,17.0,20.0,22.0,21.5,17.0,11.0,5.0,0.5] },
  { name:"Baia Mare", zone:"III", theta_e:-18, ngz:3650, alt:228, theta_a:8.8, season:213, lat:47.66,
    solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325},
    temp_month:[-3.0,-1.0,4.0,10.0,15.0,18.0,20.0,19.5,15.0,9.5,3.5,-1.0] },
  { name:"Târgu Mureș", zone:"IV", theta_e:-21, ngz:3900, alt:323, theta_a:8.0, season:222, lat:46.54,
    solar:{S:390,SE:310,E:195,NE:112,N:92,NV:112,V:195,SV:310,Oriz:330},
    temp_month:[-4.0,-2.0,3.0,9.0,14.0,17.0,19.0,18.5,14.0,8.5,2.5,-2.0] },
  { name:"Deva", zone:"II", theta_e:-15, ngz:3200, alt:230, theta_a:10.2, season:195, lat:45.88,
    solar:{S:405,SE:325,E:203,NE:116,N:96,NV:116,V:203,SV:325,Oriz:345},
    temp_month:[-2.0,0.5,5.5,11.0,16.5,19.5,21.5,21.0,16.5,10.5,4.5,-0.5] },
  { name:"Reșița", zone:"I", theta_e:-12, ngz:2810, alt:240, theta_a:11.0, season:184, lat:45.30,
    solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360},
    temp_month:[-0.5,2.0,6.5,12.0,17.0,20.5,22.5,22.0,17.5,11.5,5.5,1.0] },
  { name:"Drobeta-Turnu Severin", zone:"I", theta_e:-12, ngz:2820, alt:77, theta_a:11.5, season:182, lat:44.63,
    solar:{S:430,SE:350,E:215,NE:122,N:102,NV:122,V:215,SV:350,Oriz:365},
    temp_month:[0.0,2.5,7.0,12.5,17.5,21.0,23.0,22.5,18.0,12.0,6.0,1.5] },
  { name:"Bistrița", zone:"IV", theta_e:-21, ngz:3950, alt:356, theta_a:7.8, season:225, lat:47.13,
    solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325},
    temp_month:[-4.0,-2.0,3.0,9.0,14.0,17.0,19.0,18.5,14.0,8.5,2.5,-2.0] },
  { name:"Făgăraș", zone:"IV", theta_e:-21, ngz:4100, alt:430, theta_a:7.2, season:230, lat:45.84,
    solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325},
    temp_month:[-5.0,-3.0,2.0,8.0,13.0,16.0,18.0,17.5,13.0,7.5,1.5,-3.0] },
  { name:"Sfântu Gheorghe", zone:"V", theta_e:-25, ngz:4200, alt:520, theta_a:6.8, season:240, lat:45.87,
    solar:{S:382,SE:302,E:188,NE:107,N:87,NV:107,V:188,SV:302,Oriz:318},
    temp_month:[-6.0,-4.0,1.0,7.0,12.0,15.0,17.0,16.5,12.0,6.5,0.5,-3.5] },
  { name:"Alba Iulia", zone:"III", theta_e:-18, ngz:3580, alt:247, theta_a:9.2, season:208, lat:46.07, solar:{S:400,SE:320,E:200,NE:115,N:95,NV:115,V:200,SV:320,Oriz:340}, temp_month:[-3,-1,4,10,15,18,20,19.5,15,9.5,3.5,-1] },
  { name:"Buzău", zone:"II", theta_e:-15, ngz:3280, alt:97, theta_a:10.3, season:193, lat:45.15, solar:{S:415,SE:335,E:208,NE:119,N:99,NV:119,V:208,SV:335,Oriz:355}, temp_month:[-2,0.5,5.5,11.5,17,20.5,22.5,22,17,11,4.5,0] },
  { name:"Vaslui", zone:"III", theta_e:-18, ngz:3550, alt:159, theta_a:9.2, season:205, lat:46.64, solar:{S:390,SE:310,E:195,NE:110,N:90,NV:110,V:195,SV:310,Oriz:330}, temp_month:[-3,-1,4,10.5,16,19.5,21.5,21,16,10,3.5,-1] },
  { name:"Zalău", zone:"III", theta_e:-18, ngz:3600, alt:270, theta_a:9.0, season:210, lat:47.19, solar:{S:395,SE:315,E:198,NE:113,N:93,NV:113,V:198,SV:315,Oriz:335}, temp_month:[-3,-1,4,10,15.5,18.5,20.5,20,15.5,9.5,3.5,-1] },
  { name:"Târgoviște", zone:"II", theta_e:-15, ngz:3220, alt:262, theta_a:10.2, season:194, lat:44.93, solar:{S:415,SE:335,E:208,NE:119,N:99,NV:119,V:208,SV:335,Oriz:355}, temp_month:[-1.5,0.5,5.5,11.5,17,20.5,22.5,22,17,11,5,0.5] },
  { name:"Mangalia", zone:"I", theta_e:-12, ngz:2750, alt:10, theta_a:12.0, season:180, lat:43.80, solar:{S:435,SE:355,E:222,NE:127,N:107,NV:127,V:222,SV:355,Oriz:375}, temp_month:[1,2,5.5,11,16.5,21,23.5,23.5,19,13.5,7.5,3] },
  // ── Localități extinse ──
  { name:"Slatina", zone:"II", theta_e:-15, ngz:3050, alt:165, theta_a:10.8, season:188, lat:44.43, solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360}, temp_month:[-1,1,6,12,17.5,21,23,22.5,17.5,11.5,5,0.5] },
  { name:"Alexandria", zone:"II", theta_e:-15, ngz:3100, alt:60, theta_a:10.6, season:190, lat:43.97, solar:{S:425,SE:345,E:215,NE:122,N:102,NV:122,V:215,SV:345,Oriz:365}, temp_month:[-1,1,6,12,17.5,21.5,23.5,23,18,12,5.5,0.5] },
  { name:"Giurgiu", zone:"II", theta_e:-15, ngz:3100, alt:28, theta_a:11.0, season:186, lat:43.90, solar:{S:425,SE:345,E:215,NE:122,N:102,NV:122,V:215,SV:345,Oriz:365}, temp_month:[-1,1,6,12,17.5,21.5,23.5,23,18,12,5.5,0.5] },
  { name:"Călărași", zone:"II", theta_e:-15, ngz:3200, alt:19, theta_a:10.8, season:188, lat:44.20, solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360}, temp_month:[-1.5,0.5,5.5,12,17.5,21,23,22.5,17.5,11.5,5,0] },
  { name:"Slobozia", zone:"II", theta_e:-15, ngz:3250, alt:15, theta_a:10.6, season:190, lat:44.56, solar:{S:420,SE:340,E:210,NE:120,N:100,NV:120,V:210,SV:340,Oriz:360}, temp_month:[-2,0,5.5,11.5,17,21,23,22.5,17.5,11.5,5,0] },
  { name:"Tulcea", zone:"I", theta_e:-12, ngz:2900, alt:5, theta_a:11.5, season:184, lat:45.18, solar:{S:425,SE:345,E:215,NE:122,N:102,NV:122,V:215,SV:345,Oriz:365}, temp_month:[0,1,5.5,11.5,17,21,23,22.5,18,12,6,1.5] },
  { name:"Focșani", zone:"II", theta_e:-15, ngz:3350, alt:50, theta_a:10.0, season:198, lat:45.70, solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350}, temp_month:[-2,0,5,11,16.5,20,22,21.5,16.5,10.5,4.5,-0.5] },
  { name:"Piatra Neamț", zone:"III", theta_e:-18, ngz:3700, alt:340, theta_a:8.6, season:215, lat:46.93, solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325}, temp_month:[-3.5,-1.5,3.5,9.5,14.5,17.5,19.5,19,14.5,9,3,-1.5] },
  { name:"Roman", zone:"III", theta_e:-18, ngz:3550, alt:200, theta_a:9.2, season:205, lat:46.92, solar:{S:390,SE:310,E:195,NE:110,N:90,NV:110,V:195,SV:310,Oriz:330}, temp_month:[-3,-1,4,10.5,16,19.5,21.5,21,16,10,3.5,-1] },
  { name:"Botoșani", zone:"III", theta_e:-18, ngz:3650, alt:150, theta_a:8.8, season:212, lat:47.75, solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325}, temp_month:[-3.5,-1.5,3.5,10,15,18,20,19.5,15,9,3,-2] },
  { name:"Dorohoi", zone:"IV", theta_e:-21, ngz:3900, alt:185, theta_a:8.0, season:222, lat:47.96, solar:{S:380,SE:300,E:190,NE:108,N:88,NV:108,V:190,SV:300,Oriz:320}, temp_month:[-4,-2,3,9,14.5,17.5,19.5,19,14.5,8.5,2.5,-2] },
  { name:"Câmpulung Moldovenesc", zone:"IV", theta_e:-21, ngz:4150, alt:610, theta_a:7.0, season:235, lat:47.53, solar:{S:378,SE:298,E:188,NE:107,N:87,NV:107,V:188,SV:298,Oriz:318}, temp_month:[-5,-3.5,1,7.5,12.5,15.5,17.5,17,12.5,7,1,-3] },
  { name:"Sighetul Marmației", zone:"IV", theta_e:-21, ngz:3950, alt:274, theta_a:7.8, season:225, lat:47.93, solar:{S:382,SE:302,E:190,NE:109,N:89,NV:109,V:190,SV:302,Oriz:322}, temp_month:[-4,-2,3,9.5,14.5,17.5,19.5,19,14.5,9,3,-2] },
  { name:"Reghin", zone:"IV", theta_e:-21, ngz:3950, alt:360, theta_a:7.8, season:225, lat:46.78, solar:{S:388,SE:308,E:193,NE:111,N:91,NV:111,V:193,SV:308,Oriz:328}, temp_month:[-4.5,-2.5,2.5,8.5,13.5,16.5,18.5,18,13.5,8,2,-2.5] },
  { name:"Mediaș", zone:"III", theta_e:-18, ngz:3600, alt:300, theta_a:9.0, season:210, lat:46.17, solar:{S:398,SE:318,E:198,NE:114,N:94,NV:114,V:198,SV:318,Oriz:338}, temp_month:[-3,-1,4,10,15,18,20,19.5,15,9.5,3.5,-1] },
  { name:"Petroșani", zone:"III", theta_e:-18, ngz:3800, alt:610, theta_a:8.0, season:220, lat:45.42, solar:{S:390,SE:310,E:195,NE:112,N:92,NV:112,V:195,SV:310,Oriz:330}, temp_month:[-4,-2,3,8.5,13.5,16.5,18.5,18,13.5,8,2,-2] },
  { name:"Hunedoara", zone:"II", theta_e:-15, ngz:3250, alt:230, theta_a:10.0, season:196, lat:45.75, solar:{S:405,SE:325,E:203,NE:116,N:96,NV:116,V:203,SV:325,Oriz:345}, temp_month:[-2,0.5,5.5,11,16.5,19.5,21.5,21,16.5,10.5,4.5,-0.5] },
  { name:"Lugoj", zone:"II", theta_e:-15, ngz:3100, alt:125, theta_a:10.6, season:190, lat:45.69, solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350}, temp_month:[-1,1,6,12,17,20,22,21.5,17,11,5,0.5] },
  { name:"Turda", zone:"III", theta_e:-18, ngz:3700, alt:345, theta_a:8.5, season:215, lat:46.57, solar:{S:395,SE:315,E:198,NE:113,N:93,NV:113,V:198,SV:315,Oriz:335}, temp_month:[-3.5,-1.5,3.5,9.5,14.5,17.5,19.5,19,14.5,9,3,-1.5] },
  { name:"Câmpina", zone:"II", theta_e:-15, ngz:3300, alt:420, theta_a:9.8, season:198, lat:45.13, solar:{S:405,SE:325,E:203,NE:116,N:96,NV:116,V:203,SV:325,Oriz:345}, temp_month:[-2,0,5,11,16.5,20,22,21.5,16.5,11,4.5,0] },
  { name:"Bușteni", zone:"IV", theta_e:-21, ngz:4500, alt:880, theta_a:6.0, season:248, lat:45.41, solar:{S:375,SE:295,E:183,NE:104,N:84,NV:104,V:183,SV:295,Oriz:312}, temp_month:[-5.5,-4,-0.5,6,11,14,16,15.5,11,5.5,-0.5,-3.5] },
  { name:"Sinaia", zone:"IV", theta_e:-21, ngz:4600, alt:800, theta_a:6.2, season:245, lat:45.35, solar:{S:378,SE:298,E:185,NE:105,N:85,NV:105,V:185,SV:298,Oriz:315}, temp_month:[-5,-3.5,0,6.5,11.5,14.5,16.5,16,11.5,6,0,-3] },
  { name:"Râmnicu Vâlcea", zone:"II", theta_e:-15, ngz:3200, alt:237, theta_a:10.2, season:194, lat:45.10, solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350}, temp_month:[-1.5,1,5.5,11.5,16.5,20,22,21.5,16.5,11,5,0.5] },
  { name:"Caracal", zone:"II", theta_e:-15, ngz:3050, alt:106, theta_a:10.8, season:186, lat:44.12, solar:{S:425,SE:345,E:215,NE:122,N:102,NV:122,V:215,SV:345,Oriz:365}, temp_month:[-1,1.5,6.5,12.5,17.5,21,23,22.5,18,12,5.5,0.5] },
  { name:"Tecuci", zone:"II", theta_e:-15, ngz:3300, alt:65, theta_a:10.2, season:196, lat:45.85, solar:{S:410,SE:330,E:205,NE:118,N:98,NV:118,V:205,SV:330,Oriz:350}, temp_month:[-2,0,5,11,16.5,20,22,21.5,16.5,10.5,4.5,-0.5] },
  { name:"Adjud", zone:"II", theta_e:-15, ngz:3350, alt:75, theta_a:10.0, season:198, lat:46.10, solar:{S:405,SE:325,E:203,NE:116,N:96,NV:116,V:203,SV:325,Oriz:345}, temp_month:[-2.5,-0.5,4.5,10.5,16,19.5,21.5,21,16,10,4,-1] },
  { name:"Odorheiu Secuiesc", zone:"IV", theta_e:-21, ngz:4050, alt:527, theta_a:7.2, season:232, lat:46.30, solar:{S:385,SE:305,E:192,NE:110,N:90,NV:110,V:192,SV:305,Oriz:325}, temp_month:[-5,-3,1.5,7.5,12.5,15.5,17.5,17,12.5,7,1,-3] },
  { name:"Toplița", zone:"V", theta_e:-25, ngz:4300, alt:650, theta_a:6.2, season:245, lat:46.93, solar:{S:375,SE:295,E:183,NE:104,N:84,NV:104,V:183,SV:295,Oriz:312}, temp_month:[-7,-5,0,6.5,11.5,14.5,16.5,16,11.5,6,0,-4.5] },
];


const T = {
  // Navigation
  "Identificare":{EN:"Identification"},"Anvelopă":{EN:"Envelope"},"Instalații":{EN:"Systems"},
  "Regenerabile":{EN:"Renewables"},"Calcul":{EN:"Calculation"},"Certificat":{EN:"Certificate"},
  "Audit":{EN:"Audit"},"Date generale clădire":{EN:"General building data"},
  "Elemente constructive":{EN:"Building elements"},"Încălzire, ACM, clima":{EN:"Heating, DHW, HVAC"},
  "Surse energie verde":{EN:"Green energy sources"},"Bilanț energetic":{EN:"Energy balance"},
  "Clasare & CPE":{EN:"Classification & EPC"},"Recomandări":{EN:"Recommendations"},
  // Step 1
  "Adresa clădirii":{EN:"Building address"},"Strada, nr.":{EN:"Street, no."},
  "Localitate":{EN:"City"},"Județ":{EN:"County"},"Cod poștal":{EN:"Postal code"},
  "Clasificare":{EN:"Classification"},"Categorie funcțională":{EN:"Functional category"},
  "Tip structură":{EN:"Structure type"},"An construcție":{EN:"Year built"},
  "An renovare":{EN:"Renovation year"},"Geometrie":{EN:"Geometry"},
  "Regim de înălțime":{EN:"Height regime"},"Subsol/demisol":{EN:"Basement"},
  "Mansardă/pod":{EN:"Attic"},"Nr. unități":{EN:"No. units"},"Nr. scări":{EN:"No. stairs"},
  "Dimensiuni":{EN:"Dimensions"},"Suprafață utilă încălzită (Au)":{EN:"Heated useful area (Au)"},
  "Volum încălzit (V)":{EN:"Heated volume (V)"},"Suprafață anvelopă (Aenv)":{EN:"Envelope area (Aenv)"},
  "Înălțime clădire":{EN:"Building height"},"Înălțime etaj":{EN:"Floor height"},
  "Perimetru clădire":{EN:"Building perimeter"},"Factor umbrire":{EN:"Shading factor"},
  "Localizare climatică":{EN:"Climate location"},"Localitatea de calcul":{EN:"Calculation locality"},
  "Selectează localitatea...":{EN:"Select locality..."},
  // Step 2
  "Anvelopa termică a clădirii":{EN:"Building thermal envelope"},
  "Elemente opace":{EN:"Opaque elements"},"Element opac":{EN:"Opaque element"},
  "Denumire":{EN:"Name"},"Tip element":{EN:"Element type"},"Orientare":{EN:"Orientation"},
  "Suprafață":{EN:"Area"},"Salvează":{EN:"Save"},"Anulează":{EN:"Cancel"},
  "Straturi constructive (int → ext)":{EN:"Construction layers (int → ext)"},
  "Rezultate calcul":{EN:"Calculation results"},"Sumar anvelopă":{EN:"Envelope summary"},
  // Step 3
  "Sursa de căldură (generare)":{EN:"Heat source (generation)"},
  "Sistem de emisie":{EN:"Emission system"},"Distribuție și control":{EN:"Distribution & control"},
  "Regim de funcționare":{EN:"Operating regime"},
  // Step 5
  "Calcul energetic global & Clasare":{EN:"Global energy calculation & Classification"},
  "Clasa energetică":{EN:"Energy class"},"Nota energetică":{EN:"Energy score"},
  "Estimare cost energie anual":{EN:"Annual energy cost estimate"},
  "Profil lunar consum energie":{EN:"Monthly energy consumption profile"},
  // Step 6
  "Generează CPE (Print / PDF)":{EN:"Generate EPC (Print / PDF)"},
  "Date auditor energetic":{EN:"Energy auditor data"},
  // Step 7
  "Recomandari de Reabilitare":{EN:"Rehabilitation recommendations"},
  "Situatia actuala — Sumar diagnostic":{EN:"Current status — Diagnostic summary"},
  "Scenariu Reabilitare — Proiectie":{EN:"Rehabilitation scenario — Projection"},
  "Radar performanță energetică":{EN:"Energy performance radar"},
  // Common
  "Proiect nou":{EN:"New project"},"Export":{EN:"Export"},"Import":{EN:"Import"},
  "Estimare automată din Au + etaje":{EN:"Auto-estimate from Au + floors"},
  "Adaugă":{EN:"Add"},"Edit":{EN:"Edit"},
  // Auto-generated translations
  "Acoperire":{EN:"Coverage"},
  "Bilanț energetic lunar (metoda quasi-staționară)":{EN:"Monthly energy balance (quasi-stationary method)"},
  "Bilanț termic lunar ISO 13790":{EN:"Monthly thermal balance ISO 13790"},
  "Biomasă":{EN:"Biomass"},
  "COP nominal":{EN:"Nominal COP"},
  "Calitate distribuție":{EN:"Distribution quality"},
  "Capacitate instalată":{EN:"Installed capacity"},
  "Caută tip punte termică":{EN:"Search thermal bridge type"},
  "Clădiri tip românești":{EN:"Romanian building types"},
  "Cod unic MDLPA (dupa inregistrare)":{EN:"MDLPA unique code (after registration)"},
  "Coeficient pierderi (a1)":{EN:"Loss coefficient (a1)"},
  "Cogenerare (CHP)":{EN:"Cogeneration (CHP)"},
  "Combustibil CHP":{EN:"CHP fuel"},
  "Comparație scenarii":{EN:"Scenario comparison"},
  "Consum anual (opțional)":{EN:"Annual consumption (optional)"},
  "Consum specific":{EN:"Specific consumption"},
  "Data elaborarii CPE":{EN:"CPE elaboration date"},
  "Date insuficiente":{EN:"Insufficient data"},
  "Debit aer proaspăt":{EN:"Fresh air flow rate"},
  "Defalcare consum pe luni":{EN:"Monthly consumption breakdown"},
  "Densitate putere instalată":{EN:"Installed power density"},
  "Distribuție răcire":{EN:"Cooling distribution"},
  "EER/COP răcire":{EN:"Cooling EER/COP"},
  "Elemente vitrate":{EN:"Glazing elements"},
  "Email":{EN:"Email"},
  "Energie eoliană":{EN:"Wind energy"},
  "Energie finală per utilitate":{EN:"Final energy per utility"},
  "Energie primară per utilitate":{EN:"Primary energy per utility"},
  "Factor control (F_C)":{EN:"Control factor (F_C)"},
  "Factori de conversie energie primară aplicați (Tabelul 5.17)":{EN:"Primary energy conversion factors (Table 5.17)"},
  "Firma / PFA":{EN:"Company / Sole trader"},
  "Foto cladire (optional)":{EN:"Building photo (optional)"},
  "Fracție ramă":{EN:"Frame fraction"},
  "GWP lifecycle":{EN:"GWP lifecycle"},
  "Grad atestat":{EN:"Certificate grade"},
  "Iluminat artificial (LENI)":{EN:"Artificial lighting (LENI)"},
  "Inclinare":{EN:"Tilt angle"},
  "Lungime":{EN:"Length"},
  "Lungime conducte distribuție":{EN:"Distribution pipe length"},
  "Nr. atestat MLPAT/MDLPA":{EN:"MLPAT/MDLPA certificate no."},
  "Nr. consumatori echivalenți":{EN:"Equivalent consumers"},
  "Nume complet auditor":{EN:"Auditor full name"},
  "Observatii suplimentare":{EN:"Additional observations"},
  "Ore funcționare / an":{EN:"Operating hours / year"},
  "Ore funcționare recirculare/zi":{EN:"Recirculation hours/day"},
  "Ore funcționare/an":{EN:"Operating hours/year"},
  "Panouri fotovoltaice":{EN:"Photovoltaic panels"},
  "Panouri solare termice":{EN:"Solar thermal panels"},
  "Pierdere liniară":{EN:"Linear loss"},
  "Pierderi stocare":{EN:"Storage losses"},
  "Pompă de căldură — componenta regenerabilă":{EN:"Heat pump — renewable component"},
  "Preparare apă caldă de consum":{EN:"Domestic hot water preparation"},
  "Preview Certificat":{EN:"Certificate Preview"},
  "Prioritizare Masuri de Interventie":{EN:"Intervention Measures Prioritization"},
  "Producție anuală estimată":{EN:"Estimated annual production"},
  "Producție electrică anuală":{EN:"Annual electric production"},
  "Producție termică anuală":{EN:"Annual thermal production"},
  "Profil temperatură lunară":{EN:"Monthly temperature profile"},
  "Punți termice":{EN:"Thermal bridges"},
  "Putere de varf instalată":{EN:"Installed peak power"},
  "Putere frigorifică":{EN:"Cooling capacity"},
  "Putere nominală":{EN:"Nominal power"},
  "Putere ventilator":{EN:"Fan power"},
  "R1 — Recomandari Anvelopa Termica":{EN:"R1 — Thermal Envelope Recommendations"},
  "R2 — Recomandari Instalatii":{EN:"R2 — Systems Recommendations"},
  "R3 — Surse Regenerabile Recomandate":{EN:"R3 — Recommended Renewable Sources"},
  "Radiație solară anuală":{EN:"Annual solar radiation"},
  "Randament cazan":{EN:"Boiler efficiency"},
  "Randament distribuție (eta_dist)":{EN:"Distribution efficiency (eta_dist)"},
  "Randament emisie (eta_em)":{EN:"Emission efficiency (eta_em)"},
  "Randament optic (eta_0)":{EN:"Optical efficiency (eta_0)"},
  "Randament recuperare":{EN:"Recovery efficiency"},
  "Randament reglaj (eta_ctrl)":{EN:"Control efficiency (eta_ctrl)"},
  "Raport lumină naturală":{EN:"Natural light ratio"},
  "Reducere nocturnă":{EN:"Night setback"},
  "Referință U'max nZEB":{EN:"nZEB U'max reference"},
  "Regim":{EN:"Regime"},
  "Rezultate":{EN:"Results"},
  "SCOP sezonier incalzire":{EN:"Seasonal heating SCOP"},
  "Secțiune transversală":{EN:"Cross section"},
  "Sistem de control":{EN:"Control system"},
  "Sistem de răcire":{EN:"Cooling system"},
  "Sistem de ventilare":{EN:"Ventilation system"},
  "Stocare și distribuție ACM":{EN:"DHW storage & distribution"},
  "Sumar energetic":{EN:"Energy summary"},
  "Sumar final — Date pentru Certificatul de Performanță Energetică":{EN:"Final summary — EPC Data"},
  "Sumar regenerabile":{EN:"Renewables summary"},
  "Suprafață colectoare":{EN:"Collector area"},
  "Suprafață panouri":{EN:"Panel area"},
  "Suprafață răcită":{EN:"Cooled area"},
  "Suprafață totală":{EN:"Total area"},
  "Sursa ACM":{EN:"DHW source"},
  "Sursă auxiliară (bivalent)":{EN:"Auxiliary source (bivalent)"},
  "Telefon":{EN:"Phone"},
  "Temp. bivalentă":{EN:"Bivalent temperature"},
  "Temp. confort (theta_int)":{EN:"Comfort temp. (theta_int)"},
  "Tip celule PV":{EN:"PV cell type"},
  "Tip colector":{EN:"Collector type"},
  "Tip combustibil biomasă":{EN:"Biomass fuel type"},
  "Tip corpuri de încălzire":{EN:"Heating body type"},
  "Tip invertor":{EN:"Inverter type"},
  "Tip pompă de căldură":{EN:"Heat pump type"},
  "Tip ramă":{EN:"Frame type"},
  "Tip reglaj/control":{EN:"Control type"},
  "Tip sistem":{EN:"System type"},
  "Tip sursă":{EN:"Source type"},
  "Tip sursă de lumină predominantă":{EN:"Predominant light source type"},
  "Tip ventilare":{EN:"Ventilation type"},
  "Tip vitraj":{EN:"Glazing type"},
  "Utilizare":{EN:"Usage"},
  "Utilizare energie":{EN:"Energy usage"},
  "Verificare nZEB":{EN:"nZEB verification"},
  "Vizualizare clădire":{EN:"Building visualization"},
  "Volum stocare":{EN:"Storage volume"},
  "Volum vas stocare":{EN:"Storage tank volume"},
  "n50 (blower door)":{EN:"n50 (blower door)"},
  "Ψ (coeficient liniar)":{EN:"Ψ (linear coefficient)"},
};
function t(key, lang) { if (lang === "EN" && T[key] && T[key].EN) return T[key].EN; return key; }


const CONSTRUCTION_SOLUTIONS = [
  { id:"PE_BCA30_EPS10", name:"Perete BCA 30cm + EPS 10cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Polistiren expandat EPS 100",thickness:"100",lambda:0.036,rho:25,matName:"Polistiren expandat EPS 100"},{material:"BCA (beton celular autoclavizat)",thickness:"300",lambda:0.22,rho:600,matName:"BCA (beton celular autoclavizat)"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_GVP25_EPS15", name:"Perete GVP 25cm + EPS 15cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Polistiren expandat EPS 100",thickness:"150",lambda:0.036,rho:25,matName:"Polistiren expandat EPS 100"},{material:"Cărămidă cu goluri (GVP)",thickness:"250",lambda:0.46,rho:1200,matName:"Cărămidă cu goluri (GVP)"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_POROTHERM44", name:"Porotherm 44 fără izolație", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Bloc ceramic Porotherm 44",thickness:"440",lambda:0.17,rho:750,matName:"Bloc ceramic Porotherm 44"},{material:"Tencuială var-ciment",thickness:"15",lambda:0.87,rho:1800,matName:"Tencuială var-ciment"}] },
  { id:"PE_BETON_VATA12", name:"Perete beton + vată 12cm", type:"PE",
    layers:[{material:"Tencuială decorativă",thickness:"5",lambda:0.70,rho:1600,matName:"Tencuială decorativă"},{material:"Vată minerală bazaltică",thickness:"120",lambda:0.040,rho:100,matName:"Vată minerală bazaltică"},{material:"Beton armat",thickness:"200",lambda:1.74,rho:2400,matName:"Beton armat"},{material:"Gips-carton",thickness:"12",lambda:0.25,rho:900,matName:"Gips-carton"}] },
  { id:"PT_TERASA_XPS10", name:"Terasă + XPS 10cm", type:"PT",
    layers:[{material:"Bitum (membrană)",thickness:"10",lambda:0.17,rho:1050,matName:"Bitum (membrană)"},{material:"Polistiren extrudat XPS",thickness:"100",lambda:0.034,rho:35,matName:"Polistiren extrudat XPS"},{material:"Beton armat",thickness:"150",lambda:1.74,rho:2400,matName:"Beton armat"}] },
  { id:"PP_POD_VATA25", name:"Pod + vată 25cm", type:"PP",
    layers:[{material:"Gips-carton",thickness:"12",lambda:0.25,rho:900,matName:"Gips-carton"},{material:"Vată minerală bazaltică",thickness:"250",lambda:0.040,rho:100,matName:"Vată minerală bazaltică"},{material:"OSB",thickness:"18",lambda:0.13,rho:600,matName:"OSB"}] },
  { id:"PL_SOL_XPS8", name:"Placă sol + XPS 8cm", type:"PL",
    layers:[{material:"Gresie ceramică",thickness:"10",lambda:1.30,rho:2300,matName:"Gresie ceramică"},{material:"Șapă ciment",thickness:"60",lambda:1.40,rho:2000,matName:"Șapă ciment"},{material:"Polistiren extrudat XPS",thickness:"80",lambda:0.034,rho:35,matName:"Polistiren extrudat XPS"},{material:"Beton armat",thickness:"120",lambda:1.74,rho:2400,matName:"Beton armat"}] },
  { id:"PB_SUBSOL_EPS5", name:"Planșeu subsol + EPS 5cm", type:"PB",
    layers:[{material:"Parchet lemn",thickness:"15",lambda:0.18,rho:600,matName:"Parchet lemn"},{material:"Șapă ciment",thickness:"50",lambda:1.40,rho:2000,matName:"Șapă ciment"},{material:"Polistiren expandat EPS 80",thickness:"50",lambda:0.039,rho:20,matName:"Polistiren expandat EPS 80"},{material:"Beton armat",thickness:"150",lambda:1.74,rho:2400,matName:"Beton armat"}] },
];

// Prețuri orientative materiale+manoperă [EUR/m²] pentru estimări reabilitare (actualizat 2025)
const REHAB_COSTS = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  hpPerKw: 900,
  solarThPerM2: 380,
};

const ZONE_COLORS = { I:"#22c55e", II:"#eab308", III:"#f97316", IV:"#ef4444", V:"#7c3aed" };

// Materiale constructive — conductivitate termică λ [W/(m·K)]
const MATERIALS_DB = [
  { cat:"Zidărie", name:"Cărămidă plină", lambda:0.80, rho:1800, mu:10 },
  { cat:"Zidărie", name:"Cărămidă cu goluri (GVP)", lambda:0.46, rho:1200, mu:8 },
  { cat:"Zidărie", name:"Cărămidă eficientă", lambda:0.33, rho:900, mu:8 },
  { cat:"Zidărie", name:"BCA (beton celular autoclavizat)", lambda:0.22, rho:600, mu:6 },
  { cat:"Zidărie", name:"BCA densitate mică", lambda:0.16, rho:450, mu:6 },
  { cat:"Zidărie", name:"Bloc ceramic Porotherm 44", lambda:0.17, rho:750, mu:8 },
  { cat:"Zidărie", name:"Bloc ceramic Porotherm 30", lambda:0.21, rho:800, mu:8 },
  { cat:"Zidărie", name:"Piatră naturală", lambda:2.30, rho:2600, mu:200 },
  { cat:"Betoane", name:"Beton armat", lambda:1.74, rho:2400, mu:100 },
  { cat:"Betoane", name:"Beton simplu", lambda:1.28, rho:2200, mu:70 },
  { cat:"Betoane", name:"Beton ușor (ponce)", lambda:0.52, rho:1200, mu:8 },
  { cat:"Betoane", name:"Beton celular neautoclavizat", lambda:0.29, rho:700, mu:6 },
  { cat:"Betoane", name:"Șapă ciment", lambda:1.40, rho:2000, mu:50 },
  { cat:"Termoizolații", name:"Polistiren expandat EPS 60", lambda:0.044, rho:15, mu:30 },
  { cat:"Termoizolații", name:"Polistiren expandat EPS 80", lambda:0.039, rho:20, mu:40 },
  { cat:"Termoizolații", name:"Polistiren expandat EPS 100", lambda:0.036, rho:25, mu:50 },
  { cat:"Termoizolații", name:"Polistiren extrudat XPS", lambda:0.034, rho:35, mu:100 },
  { cat:"Termoizolații", name:"Vată minerală bazaltică", lambda:0.040, rho:100, mu:1 },
  { cat:"Termoizolații", name:"Vată minerală de sticlă", lambda:0.038, rho:25, mu:1 },
  { cat:"Termoizolații", name:"Spumă poliuretanică (PUR)", lambda:0.025, rho:35, mu:60 },
  { cat:"Termoizolații", name:"Spumă poliizocianurică (PIR)", lambda:0.023, rho:32, mu:60 },
  { cat:"Termoizolații", name:"Plută expandată", lambda:0.045, rho:120, mu:15 },
  { cat:"Termoizolații", name:"Aerogel", lambda:0.015, rho:120, mu:5 },
  { cat:"Termoizolații", name:"Fibră de lemn", lambda:0.042, rho:160, mu:3 },
  { cat:"Finisaje", name:"Tencuială var-ciment", lambda:0.87, rho:1800, mu:10 },
  { cat:"Finisaje", name:"Tencuială decorativă", lambda:0.70, rho:1600, mu:10 },
  { cat:"Finisaje", name:"Gresie ceramică", lambda:1.30, rho:2300, mu:200 },
  { cat:"Finisaje", name:"Parchet lemn", lambda:0.18, rho:600, mu:50 },
  { cat:"Finisaje", name:"Gips-carton", lambda:0.25, rho:900, mu:8 },
  { cat:"Finisaje", name:"Mortar adeziv", lambda:0.90, rho:1800, mu:10 },
  { cat:"Hidroizolații", name:"Bitum (membrană)", lambda:0.17, rho:1050, mu:50000 },
  { cat:"Hidroizolații", name:"Folie PE", lambda:0.40, rho:980, mu:100000 },
  { cat:"Hidroizolații", name:"Barieră vapori aluminiu", lambda:200, rho:2700, mu:1000000 },
  { cat:"Lemn", name:"Lemn moale (brad/molid)", lambda:0.14, rho:500, mu:30 },
  { cat:"Lemn", name:"Lemn tare (stejar)", lambda:0.18, rho:700, mu:50 },
  { cat:"Lemn", name:"PAL", lambda:0.15, rho:650, mu:25 },
  { cat:"Lemn", name:"OSB", lambda:0.13, rho:600, mu:30 },
  { cat:"Metale", name:"Oțel", lambda:58.0, rho:7850, mu:1000000 },
  { cat:"Metale", name:"Aluminiu", lambda:200, rho:2700, mu:1000000 },
  { cat:"Altele", name:"Strat de aer neventilat (2cm)", lambda:0.14, rho:1.2, mu:1 },
  { cat:"Altele", name:"Strat de aer neventilat (5cm)", lambda:0.18, rho:1.2, mu:1 },
  { cat:"Altele", name:"Sol (pământ)", lambda:1.50, rho:1800, mu:50 },
  { cat:"Altele", name:"Pietriș", lambda:0.70, rho:1700, mu:15 },
  { cat:"Termoizolații", name:"Polistiren grafitat EPS Neo", lambda:0.031, rho:20, mu:40 },
  { cat:"Termoizolații", name:"Sticlă celulară (Foamglas)", lambda:0.040, rho:115, mu:100000 },
  { cat:"Lemn", name:"OSB3 structural", lambda:0.13, rho:620, mu:30 },
  { cat:"Hidroizolații", name:"Membrană EPDM", lambda:0.25, rho:1150, mu:6000 },
  // ── Materiale noi 2024-2026 ──
  { cat:"Termoizolații", name:"Vată minerală λ=0.032 (premium)", lambda:0.032, rho:40, mu:1 },
  { cat:"Termoizolații", name:"PIR cu folie alu", lambda:0.022, rho:32, mu:10000 },
  { cat:"Termoizolații", name:"EPS 200 (trafic greu)", lambda:0.035, rho:30, mu:60 },
  { cat:"Termoizolații", name:"XPS CO₂ (ecologic)", lambda:0.033, rho:33, mu:150 },
  { cat:"Termoizolații", name:"Celuloză insuflată", lambda:0.039, rho:55, mu:2 },
  { cat:"Termoizolații", name:"Cânepă (hemp)", lambda:0.042, rho:40, mu:2 },
  { cat:"Termoizolații", name:"Lână de oaie", lambda:0.038, rho:25, mu:2 },
  { cat:"Termoizolații", name:"Perlită expandată", lambda:0.050, rho:100, mu:3 },
  { cat:"Termoizolații", name:"Vacuum Insulation Panel (VIP)", lambda:0.007, rho:200, mu:100000 },
  { cat:"Lemn", name:"CLT (Cross Laminated Timber)", lambda:0.12, rho:470, mu:50 },
  { cat:"Lemn", name:"Glulam (lemn lamelat)", lambda:0.13, rho:450, mu:40 },
  { cat:"Lemn", name:"LVL (Laminated Veneer Lumber)", lambda:0.13, rho:510, mu:50 },
  { cat:"Zidărie", name:"Bloc ceramic Porotherm 38 T Profi", lambda:0.13, rho:680, mu:8 },
  { cat:"Zidărie", name:"Bloc ceramic Porotherm 25", lambda:0.27, rho:850, mu:8 },
  { cat:"Zidărie", name:"BCA Ytong λ=0.09", lambda:0.09, rho:300, mu:5 },
  { cat:"Betoane", name:"Beton cu agregate ușoare (LC)", lambda:0.40, rho:1000, mu:10 },
  { cat:"Betoane", name:"Beton de polistiren (EPS beton)", lambda:0.18, rho:500, mu:5 },
  { cat:"Finisaje", name:"Tencuială termoizolantă", lambda:0.08, rho:250, mu:8 },
  { cat:"Finisaje", name:"Placi fibrociment", lambda:0.35, rho:1400, mu:30 },
  { cat:"Altele", name:"Strat de aer ventilat (orice grosime)", lambda:0.00, rho:1.2, mu:1, note:"Nu adaugă rezistență termică" },
];

// Punți termice — valori liniare Ψ [W/(m·K)] — conform C107, SR EN ISO 14683, atlas RO
const THERMAL_BRIDGES_DB = [
  // ── Joncțiuni pereți ──
  { cat:"Joncțiuni pereți", name:"Perete ext. — Planșeu intermediar", psi:0.10, desc:"Joncțiune perete exterior cu planșeu intermediar",
    psi_izolat:0.04, detail:"Planșeul din beton traversează peretele exterior, creând o punte liniară. Cu izolație continuă pe fațadă se reduce la Ψ≈0,04." },
  { cat:"Joncțiuni pereți", name:"Perete ext. — Planșeu terasă", psi:0.15, desc:"Joncțiune perete exterior cu planșeu terasă",
    psi_izolat:0.06, detail:"Atic/cornișă unde planșeul terasă întâlnește peretele. Risc condensare. Cu izolație continuă: Ψ≈0,06." },
  { cat:"Joncțiuni pereți", name:"Perete ext. — Planșeu peste subsol", psi:0.20, desc:"Joncțiune perete exterior cu planșeu peste subsol",
    psi_izolat:0.08, detail:"Zona soclu/CTS. Cea mai frecventă punte termică la blocuri vechi. Izolație perimetrală fundație: Ψ≈0,08." },
  { cat:"Joncțiuni pereți", name:"Perete ext. — Soclu/fundație", psi:0.25, desc:"Joncțiune perete exterior cu soclu sau fundație",
    psi_izolat:0.10, detail:"Fundația din beton conduce căldura direct în sol. Izolație XPS perimetral min 60cm adâncime: Ψ≈0,10." },
  { cat:"Joncțiuni pereți", name:"Colț exterior", psi:0.05, desc:"Colț exterior al clădirii",
    psi_izolat:0.02, detail:"Convergența a două suprafețe exterioare. Suprafața interioară mai mică → răcire. Cu izolație continuă: Ψ≈0,02." },
  { cat:"Joncțiuni pereți", name:"Colț interior", psi:-0.05, desc:"Colț interior al clădirii (favorabil)",
    psi_izolat:-0.03, detail:"Suprafața interioară mai mare decât cea exterioară → efect favorabil (Ψ negativ). Reduce pierderea totală." },
  { cat:"Joncțiuni pereți", name:"Perete ext. — Perete int. portant", psi:0.05, desc:"Joncțiune perete exterior cu perete interior portant",
    psi_izolat:0.02, detail:"Peretele interior penetrează izolația exterioară. Cu izolație termică pe prima porțiune (≈50cm) a peretelui interior: Ψ≈0,02." },
  { cat:"Joncțiuni pereți", name:"Perete ext. — Planșeu pe sol", psi:0.30, desc:"Joncțiune perete exterior cu placa pe sol",
    psi_izolat:0.12, detail:"Placa de beton pe sol fără ruptură termică la perete. Izolație sub placă + perimetrală: Ψ≈0,12." },
  // ── Ferestre ──
  { cat:"Ferestre", name:"Glaf fereastră — montaj standard", psi:0.08, desc:"Perimetrul ferestrei (montaj în zidărie)",
    psi_izolat:0.03, detail:"Tâmplăria montată în planul zidăriei, fără acoperirea ramei cu izolație. Montaj în planul izolației: Ψ≈0,03." },
  { cat:"Ferestre", name:"Glaf fereastră — montaj în izolație", psi:0.04, desc:"Perimetrul ferestrei (montaj în planul termoizolației)",
    psi_izolat:0.02, detail:"Tâmplăria pozitionată în dreptul stratului termoizolant → punte redusă. Cu bandă precomprimată: Ψ≈0,02." },
  { cat:"Ferestre", name:"Glaf fereastră — montaj complet izolat", psi:0.02, desc:"Montaj cu console izolate (RAL)",
    psi_izolat:0.01, detail:"Montaj conform RAL cu console portante izolate, bandă interioară/exterioară, revenire izolație: Ψ≈0,01." },
  { cat:"Ferestre", name:"Prag ușă exterioară", psi:0.10, desc:"Prag ușă la exterior",
    psi_izolat:0.05, detail:"Pragul metalic/beton al ușii exterioare. Cu prag cu ruptură termică: Ψ≈0,05." },
  { cat:"Ferestre", name:"Pervaz/glaf sub fereastră", psi:0.06, desc:"Zona sub glaf (pervaz exterior)",
    psi_izolat:0.03, detail:"Zona de sub fereastră unde se montează radiatorul. Izolația continuă sub glaf: Ψ≈0,03." },
  // ── Balcoane ──
  { cat:"Balcoane", name:"Consolă balcon — beton neîntrerupt", psi:0.70, desc:"Consolă balcon beton fără ruptură termică",
    psi_izolat:0.15, detail:"CEA MAI GRAVĂ punte termică! Placa de beton a balconului continuă din planșeul interior. Cu ruptoare termice (Schöck Isokorb): Ψ≈0,15." },
  { cat:"Balcoane", name:"Consolă balcon — cu ruptoare termice", psi:0.15, desc:"Consolă balcon cu ruptoare termice (Isokorb etc.)",
    psi_izolat:0.08, detail:"Ruptoarele termice întrerup transmisia prin placa de beton. Soluție premium: Ψ≈0,08." },
  { cat:"Balcoane", name:"Loggie — parapete beton", psi:0.30, desc:"Loggie cu parapete din beton",
    psi_izolat:0.10, detail:"Parapetele de beton ale loggiei transmit căldură. Izolație termică pe parapet + sub balcon: Ψ≈0,10." },
  { cat:"Balcoane", name:"Balcon închis (extindere)", psi:0.40, desc:"Balcon închis neizolat termic",
    psi_izolat:0.12, detail:"Balcon închis cu tâmplărie dar fără izolație termică pe placa de beton. Izolație completă + tâmplărie performantă: Ψ≈0,12." },
  // ── Acoperiș ──
  { cat:"Acoperiș", name:"Cornișă acoperiș — streașină", psi:0.10, desc:"Cornișă / streașină acoperiș",
    psi_izolat:0.04, detail:"Zona unde acoperișul se prelungește peste perete. Continuitatea izolației la cornișă: Ψ≈0,04." },
  { cat:"Acoperiș", name:"Coamă acoperiș", psi:0.05, desc:"Coamă acoperiș înclinat",
    psi_izolat:0.02, detail:"Vârful acoperișului unde se întâlnesc cele două pante. Impact redus dacă izolația e continuă." },
  { cat:"Acoperiș", name:"Luminatoare / trapă acces pod", psi:0.15, desc:"Perimetrul luminatoarelor sau trapei de acces",
    psi_izolat:0.06, detail:"Deschideri în planșeul terasă sau acoperiș. Cu ramă izolată termic: Ψ≈0,06." },
  { cat:"Acoperiș", name:"Parapetul atic", psi:0.12, desc:"Aticul de pe terasă (bloc)",
    psi_izolat:0.05, detail:"Aticul de pe blocuri: beton/zidărie neizolat continuă puntea de la perete la terasă. Cu izolație continuă pe atic: Ψ≈0,05." },
  { cat:"Acoperiș", name:"Jgheab/streașină metalică", psi:0.08, desc:"Suport metalic jgheab streașină",
    psi_izolat:0.03, detail:"Console metalice pentru jgheab penetrează izolația. Cu console din inox sau poliamidă: Ψ≈0,03." },
  // ── Stâlpi/grinzi ──
  { cat:"Stâlpi/grinzi", name:"Stâlp beton în perete exterior", psi:0.15, desc:"Stâlp beton armat în perete exterior",
    psi_izolat:0.05, detail:"Stâlpul de beton are λ=1,74, mult mai mare decât zidăria. Cu izolație continuă pe fațadă acoperind stâlpul: Ψ≈0,05." },
  { cat:"Stâlpi/grinzi", name:"Grindă de centură / buiandrug", psi:0.12, desc:"Grindă de centură / buiandrug beton",
    psi_izolat:0.04, detail:"Centura de beton la nivel planșeu. Cu izolație continuă care acoperă grinda: Ψ≈0,04." },
  { cat:"Stâlpi/grinzi", name:"Stâlp metalic neîntrerupt", psi:0.20, desc:"Stâlp metalic neîntrerupt termic",
    psi_izolat:0.08, detail:"Oțelul are λ=58 W/mK — punte termică severă. Cu ruptură termică sau carcasă izolată: Ψ≈0,08." },
  { cat:"Stâlpi/grinzi", name:"Grindă metalică în perete", psi:0.25, desc:"Grindă IPE/HEA care penetrează peretele",
    psi_izolat:0.10, detail:"Grinda de oțel penetrează complet anvelopa. Cu capăt izolat și ruptură termică: Ψ≈0,10." },
  // ── Instalații ──
  { cat:"Instalații", name:"Țeavă neizolată prin perete ext.", psi:0.15, desc:"Conducte care traversează peretele exterior",
    psi_izolat:0.03, detail:"Treceri instalații prin perete exterior. Cu manșon izolant și spumă PUR la anulare: Ψ≈0,03." },
  { cat:"Instalații", name:"Canal ventilare prin perete", psi:0.20, desc:"Canal/tubulătură ventilare prin anvelopă",
    psi_izolat:0.06, detail:"Canalele de ventilare din tablă sau beton penetrează izolația. Cu racord izolat termic: Ψ≈0,06." },
  { cat:"Instalații", name:"Coș de fum exterior", psi:0.30, desc:"Coș de fum aderent la perete exterior",
    psi_izolat:0.10, detail:"Coșul de fum din beton/zidărie aderent la peretele exterior. Cu izolație pe coș: Ψ≈0,10." },
  { cat:"Instalații", name:"Cutie de jaluzele (casetă roletă)", psi:0.30, desc:"Casetă roletă/jaluzea în peretele exterior",
    psi_izolat:0.10, detail:"Caseta de roletă din plastic/aluminiu înlocuiește izolația deasupra ferestrei. Cu casetă izolată termic: Ψ≈0,10." },
];

// Componenta Catalog Punți Termice (SVG ilustrativ interactiv)
function ThermalBridgeCatalog({ onSelect, onClose }) {
  const [selectedCat, setSelectedCat] = useState("Joncțiuni pereți");
  const [selectedBridge, setSelectedBridge] = useState(null);
  const categories = [...new Set(THERMAL_BRIDGES_DB.map(b => b.cat))];
  const filtered = THERMAL_BRIDGES_DB.filter(b => b.cat === selectedCat);

  // Simple SVG cross-section illustrations per category
  const drawIllustration = (bridge) => {
    const cat = bridge.cat;
    const name = bridge.name;
    const w = 280, h = 200;
    // Colors: wall=gray, concrete=dark, insulation=yellow, thermal bridge=red zone
    const wallC = "#b0b0b0", concreteC = "#808080", insulC = "#fdd835", bridgeC = "#ef4444", intC = "#e8f5e9", extC = "#e3f2fd";

    let svgContent = "";

    if (cat === "Joncțiuni pereți") {
      if (name.includes("Planșeu intermediar")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <text x="${w/2}" y="15" text-anchor="middle" font-size="9" fill="#666">EXTERIOR</text>
          <text x="${w-10}" y="${h/2}" text-anchor="end" font-size="9" fill="#4caf50">INTERIOR</text>
          <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="90" y="${h/2-8}" width="${w-100}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="${h/2-12}" width="50" height="24" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <line x1="65" y1="${h/2-15}" x2="65" y2="${h/2+15}" stroke="${bridgeC}" stroke-width="2" stroke-dasharray="3 2"/>
          <text x="30" y="${h-10}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
        `;
      } else if (name.includes("Planșeu terasă") || name.includes("Planșeu pod")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <rect x="0" y="${h/2}" width="${w}" height="${h/2}" fill="${intC}" rx="4"/>
          <rect x="60" y="40" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="40" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="60" y="${h/2-8}" width="${w-70}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="10" width="${w-50}" height="18" fill="${insulC}" rx="1"/>
          <rect x="40" y="${h/2-14}" width="50" height="28" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="10" y="30" font-size="9" fill="#2196f3">EXT (pod)</text>
          <text x="10" y="${h-10}" font-size="9" fill="#4caf50">INTERIOR</text>
          <text x="${w-10}" y="${h-10}" text-anchor="end" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else if (name.includes("subsol") || name.includes("Soclu") || name.includes("sol")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h/2}" fill="${intC}" rx="4"/>
          <rect x="0" y="${h/2}" width="${w}" height="${h/2}" fill="#d7ccc8" rx="4"/>
          <rect x="60" y="10" width="30" height="${h-20}" fill="${wallC}" rx="2"/>
          <rect x="40" y="10" width="20" height="${h/2-10}" fill="${insulC}" rx="1"/>
          <rect x="90" y="${h/2-8}" width="${w-100}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="${h/2-14}" width="50" height="28" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="10" y="25" font-size="9" fill="#4caf50">INTERIOR</text>
          <text x="10" y="${h-10}" font-size="9" fill="#795548">SOL</text>
          <text x="${w-10}" y="${h-10}" text-anchor="end" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else if (name.includes("Colț ext")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <polygon points="90,20 90,${h-20} ${w-20},${h-20} ${w-20},${h/2} ${w/2},${h/2} ${w/2},20" fill="${intC}"/>
          <rect x="80" y="20" width="12" height="${h-40}" fill="${wallC}"/>
          <rect x="${w/2}" y="${h/2-6}" width="${w/2-20}" height="12" fill="${wallC}"/>
          <rect x="66" y="20" width="14" height="${h-40}" fill="${insulC}"/>
          <rect x="${w/2}" y="${h/2-14}" width="${w/2-20}" height="14" fill="${insulC}"/>
          <circle cx="92" cy="${h/2}" r="14" fill="${bridgeC}" opacity="0.25"/>
          <text x="30" y="${h-10}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="50" y="${h/2-10}" width="30" height="20" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="${w/2}" y="${h-10}" text-anchor="middle" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
        `;
      }
    } else if (cat === "Ferestre") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${intC}" rx="4"/>
        <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
        <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
        <rect x="${name.includes("izolați")?"45":"65"}" y="${h/2-30}" width="14" height="60" fill="#1565c0" rx="1"/>
        <rect x="${name.includes("izolați")?"44":"64"}" y="${h/2-32}" width="16" height="64" fill="none" stroke="#333" stroke-width="1.5" rx="2"/>
        <rect x="${name.includes("izolați")?"38":"58"}" y="${h/2-35}" width="28" height="70" fill="${bridgeC}" opacity="0.2" rx="3"/>
        <text x="10" y="18" font-size="9" fill="#666">${name.includes("izolați") ? "Montaj în izolație" : "Montaj standard"}</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)${bridge.psi_izolat ? " → " + bridge.psi_izolat + " (izolat)" : ""}</text>
      `;
    } else if (cat === "Balcoane") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w/2}" y="20" width="${w/2-10}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w/2-5}" y="20" width="15" height="${h-40}" fill="${wallC}"/>
        <rect x="${w/2-20}" y="20" width="15" height="${h-40}" fill="${insulC}"/>
        <rect x="20" y="${h/2-8}" width="${w/2-15}" height="16" fill="${concreteC}" rx="1"/>
        <rect x="${w/2-5}" y="${h/2-8}" width="${w/2-5}" height="16" fill="${concreteC}" rx="1"/>
        <rect x="${w/2-25}" y="${h/2-14}" width="40" height="28" fill="${bridgeC}" opacity="0.3" rx="3"/>
        ${name.includes("ruptoare") ? '<line x1="' + (w/2-5) + '" y1="' + (h/2-8) + '" x2="' + (w/2-5) + '" y2="' + (h/2+8) + '" stroke="#ff9800" stroke-width="3"/>' : ""}
        <text x="10" y="18" font-size="9" fill="#666">EXT (balcon)</text>
        <text x="${w-10}" y="18" text-anchor="end" font-size="9" fill="#4caf50">INT</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Acoperiș") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="0" y="${h*0.6}" width="${w}" height="${h*0.4}" fill="${intC}" rx="4"/>
        <polygon points="${w/2},15 20,${h*0.45} ${w-20},${h*0.45}" fill="#a1887f" stroke="#795548" stroke-width="1"/>
        <polygon points="${w/2},30 35,${h*0.43} ${w-35},${h*0.43}" fill="${insulC}"/>
        <rect x="60" y="${h*0.45}" width="25" height="${h*0.5}" fill="${wallC}" rx="1"/>
        <rect x="42" y="${h*0.45}" width="18" height="${h*0.5}" fill="${insulC}" rx="1"/>
        <rect x="42" y="${h*0.4}" width="43" height="20" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Stâlpi/grinzi") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w*0.6}" y="20" width="${w*0.35}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w*0.55}" y="20" width="14" height="${h-40}" fill="${wallC}"/>
        <rect x="${w*0.4}" y="20" width="16" height="${h-40}" fill="${insulC}"/>
        <rect x="${w*0.55}" y="${h/2-25}" width="14" height="50" fill="${concreteC}" rx="1"/>
        <rect x="${w*0.4}" y="${h/2-28}" width="30" height="56" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="18" font-size="9" fill="#666">EXTERIOR</text>
        <text x="${w-10}" y="18" text-anchor="end" font-size="9" fill="#4caf50">INTERIOR</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Instalații") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w*0.6}" y="20" width="${w*0.35}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w*0.55}" y="20" width="14" height="${h-40}" fill="${wallC}"/>
        <rect x="${w*0.4}" y="20" width="16" height="${h-40}" fill="${insulC}"/>
        <circle cx="${w*0.55+7}" cy="${h/2}" r="8" fill="#555" stroke="#333" stroke-width="1"/>
        <line x1="20" y1="${h/2}" x2="${w-20}" y2="${h/2}" stroke="#555" stroke-width="4" stroke-linecap="round"/>
        <rect x="${w*0.4}" y="${h/2-14}" width="30" height="28" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${w}px;height:auto">${svgContent}</svg>`;
  };

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div style={{background:"#12141f",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",width:"100%",maxWidth:"900px",height:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.1)",flexShrink:0}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:"bold"}}>Catalog Punți Termice</div>
            <div style={{fontSize:"11px",opacity:0.4}}>Secțiuni ilustrative conform C107, SR EN ISO 14683 — {THERMAL_BRIDGES_DB.length} tipuri</div>
          </div>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"white",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Category tabs */}
        <div style={{display:"flex",gap:"4px",padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.1)",flexShrink:0,overflowX:"auto"}}>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setSelectedCat(cat); setSelectedBridge(null); }}
              style={{padding:"6px 12px",borderRadius:"8px",fontSize:"12px",whiteSpace:"nowrap",border:selectedCat===cat?"1px solid rgba(245,158,11,0.3)":"1px solid transparent",background:selectedCat===cat?"rgba(245,158,11,0.15)":"transparent",color:selectedCat===cat?"#fbbf24":"rgba(255,255,255,0.6)",cursor:"pointer"}}>
              {cat === "Joncțiuni pereți" ? "🧱" : cat === "Ferestre" ? "🪟" : cat === "Balcoane" ? "🏗️" : cat === "Acoperiș" ? "🏠" : cat === "Stâlpi/grinzi" ? "🔩" : "⚙️"} {cat}
            </button>
          ))}
        </div>

        {/* Content — scrollable */}
        <div style={{flex:1,overflowY:"scroll",padding:"20px",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 320px), 1fr))",gap:"16px"}}>
            {filtered.map((bridge, i) => (
              <div key={i} onClick={() => setSelectedBridge(selectedBridge === i ? null : i)}
                style={{borderRadius:"12px",border:selectedBridge===i?"1px solid rgba(245,158,11,0.4)":"1px solid rgba(255,255,255,0.06)",padding:"16px",cursor:"pointer",background:selectedBridge===i?"rgba(245,158,11,0.05)":"rgba(255,255,255,0.02)"}}>
                <div style={{borderRadius:"8px",overflow:"hidden",marginBottom:"12px",background:"rgba(255,255,255,0.03)",padding:"8px"}}
                  dangerouslySetInnerHTML={{ __html: drawIllustration(bridge).replace(/<script[\s\S]*?<\/script>/gi,"").replace(/on\w+\s*=/gi,"data-blocked=") }} />
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bridge.name}</div>
                    <div style={{fontSize:"11px",opacity:0.4,marginTop:"2px"}}>{bridge.desc}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:"13px",fontWeight:"bold",color:"#f87171"}}>Ψ = {bridge.psi}</div>
                    <div style={{fontSize:"10px",opacity:0.3}}>W/(m·K)</div>
                  </div>
                </div>
                {selectedBridge === i && (
                  <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:"11px",opacity:0.6,lineHeight:1.6}}>{bridge.detail}</div>
                    {bridge.psi_izolat !== undefined && (
                      <div style={{display:"flex",alignItems:"center",gap:"10px",fontSize:"11px",marginTop:"8px"}}>
                        <span style={{opacity:0.4}}>Neizolat:</span>
                        <span style={{fontWeight:"bold",color:"#f87171"}}>{bridge.psi}</span>
                        <span style={{opacity:0.2}}>→</span>
                        <span style={{opacity:0.4}}>Izolat:</span>
                        <span style={{fontWeight:"bold",color:"#4ade80"}}>{bridge.psi_izolat}</span>
                        <span style={{opacity:0.2}}>W/(m·K)</span>
                        <span style={{color:"#4ade80",fontSize:"10px"}}>(-{Math.round((1 - bridge.psi_izolat / bridge.psi) * 100)}%)</span>
                      </div>
                    )}
                    {onSelect && (
                      <button onClick={(e) => { e.stopPropagation(); onSelect(bridge); onClose(); }}
                        style={{marginTop:"10px",width:"100%",padding:"8px",borderRadius:"8px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#fbbf24",fontSize:"11px",cursor:"pointer"}}>
                        Adaugă această punte termică
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",fontSize:"11px",opacity:0.4,flexShrink:0}}>
          <span>{filtered.length} punți în „{selectedCat}"</span>
          <span>Total: {THERMAL_BRIDGES_DB.length} tipuri</span>
        </div>
      </div>
    </div>
  );
}

// Tipuri de elemente vitraje
const GLAZING_DB = [
  { name:"Simplu vitraj", u:5.80, g:0.85 },
  { name:"Dublu vitraj (4-12-4)", u:2.80, g:0.75 },
  { name:"Dublu vitraj termoizolant", u:1.60, g:0.65 },
  { name:"Dublu vitraj Low-E", u:1.10, g:0.50 },
  { name:"Triplu vitraj", u:0.90, g:0.50 },
  { name:"Triplu vitraj Low-E", u:0.70, g:0.45 },
  { name:"Triplu vitraj 2×Low-E", u:0.50, g:0.40 },
];

const FRAME_DB = [
  { name:"PVC (5 camere)", u:1.30 },
  { name:"PVC (6-7 camere)", u:1.10 },
  { name:"Lemn stratificat", u:1.40 },
  { name:"Aluminiu fără RPT", u:5.00 },
  { name:"Aluminiu cu RPT", u:2.00 },
  { name:"Lemn-aluminiu", u:1.20 },
];

const ORIENTATIONS = ["N","NE","E","SE","S","SV","V","NV","Orizontal"];

const BUILDING_CATEGORIES = [
  { id:"RI", label:"Rezidențial individual (casă)" },
  { id:"RC", label:"Rezidențial colectiv (bloc)" },
  { id:"RA", label:"Apartament în bloc" },
  { id:"BI", label:"Birouri" },
  { id:"ED", label:"Educație" },
  { id:"SA", label:"Sănătate" },
  { id:"HC", label:"Hotel / Cazare" },
  { id:"CO", label:"Comercial" },
  { id:"SP", label:"Sport" },
  { id:"AL", label:"Altele" },
];

// Mapare categorie → template DOCX oficial (fișierele din Mc 001-2022)
const CPE_TEMPLATES = {
  RI: { cpe:"5-CPE-cladire-locuit-individuala-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de locuit individuală" },
  RC: { cpe:"6-CPE-cladire-locuit-colectiva-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de locuit colectivă" },
  RA: { cpe:"4-CPE-apartament-bloc-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-apartament.docx", cpe_general:"2-CPE-forma-generala-apartament.docx", label:"Apartament în bloc" },
  BI: { cpe:"7-CPE-cladire-birouri-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire de birouri" },
  ED: { cpe:"8-CPE-cladire-invatamant-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire pentru învățământ" },
  SA: { cpe:"9-CPE-cladire-sanitar-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire sistem sanitar" },
  HC: { cpe:"11-CPE-cladire-turism-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire turism/cazare" },
  CO: { cpe:"10-CPE-cladire-comert-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire comerț" },
  SP: { cpe:"12-CPE-cladire-sport-INC-ACC-RAC-VENT-IL.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire sport" },
  AL: { cpe:"3-CPE-forma-generala-cladire.docx", anexa:"ANEXA-1-si-ANEXA-2-la-CPE-cladire.docx", label:"Clădire (formă generală)" },
};

async function fetchTemplate(filename) {
  const resp = await fetch("/templates/" + filename);
  if (!resp.ok) throw new Error("Template negăsit: " + filename);
  return await resp.arrayBuffer();
}

const STRUCTURE_TYPES = [
  "Zidărie portantă","Cadre beton armat","Panouri prefabricate mari","Structură metalică","Structură lemn","Mixtă"
];

const ELEMENT_TYPES = [
  { id:"PE", label:"Perete exterior", tau:1.0, rsi:0.13, rse:0.04 },
  { id:"PR", label:"Perete la rost închis", tau:0.5, rsi:0.13, rse:0.13 },
  { id:"PS", label:"Perete subsol (sub CTS)", tau:0.5, rsi:0.13, rse:0.13 },
  { id:"PT", label:"Planșeu terasă", tau:1.0, rsi:0.10, rse:0.04 },
  { id:"PP", label:"Planșeu sub pod neîncălzit", tau:0.9, rsi:0.10, rse:0.10 },
  { id:"PB", label:"Planșeu peste subsol neîncălzit", tau:0.5, rsi:0.17, rse:0.17 },
  { id:"PI", label:"Planșeu intermediar", tau:0.0, rsi:0.17, rse:0.17 },
  { id:"PL", label:"Placă pe sol", tau:0.5, rsi:0.17, rse:0.00 },
  { id:"SE", label:"Planșeu separator ext. (bow-window)", tau:1.0, rsi:0.17, rse:0.04 },
];

// Referință U max conform Mc 001-2022
// Tabel 2.4 — Clădiri REZIDENȚIALE nZEB noi
const U_REF_NZEB_RES = { PE:0.25, PR:0.67, PS:0.29, PT:0.15, PP:0.15, PB:0.29, PI:null, PL:0.20, SE:0.20 };
// Tabel 2.7 — Clădiri NEREZIDENȚIALE nZEB noi
const U_REF_NZEB_NRES = { PE:0.33, PR:0.80, PS:0.35, PT:0.17, PP:0.17, PB:0.35, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10a — Renovare majoră clădiri rezidențiale
const U_REF_RENOV_RES = { PE:0.33, PR:0.90, PS:0.35, PT:0.20, PP:0.20, PB:0.40, PI:null, PL:0.22, SE:0.22 };
// Tabel 2.10b — Renovare majoră clădiri nerezidențiale
const U_REF_RENOV_NRES = { PE:0.40, PR:1.00, PS:0.40, PT:0.22, PP:0.22, PB:0.45, PI:null, PL:0.25, SE:0.25 };
// Ferestre: nZEB rez 1.11, nZEB nerez 1.20, renovare 1.20, uși ext 1.30
const U_REF_GLAZING = { nzeb_res:1.11, nzeb_nres:1.20, renov:1.20, door:1.30 };

// Helper: get correct U_REF based on building category and context
function getURefNZEB(category, elementType) {
  const isRes = ["RI","RC","RA"].includes(category);
  const ref = isRes ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
  return ref[elementType] !== undefined ? ref[elementType] : null;
}
// Legacy alias for backward compat
const U_REF_NZEB = U_REF_NZEB_RES;
const U_REF_RENOV = U_REF_RENOV_RES;

// ═══════════════════════════════════════════════════════════════
// BAZE DE DATE INSTALAȚII — Cap. 3 Mc 001-2022
// ═══════════════════════════════════════════════════════════════

const HEAT_SOURCES = [
  { id:"GAZ_STD", label:"Cazan gaz natural - standard", fuel:"gaz", eta_gen:0.85, cat:"Cazane" },
  { id:"GAZ_TJ", label:"Cazan gaz natural - temperatură joasă", fuel:"gaz", eta_gen:0.90, cat:"Cazane" },
  { id:"GAZ_COND", label:"Cazan gaz natural - condensare", fuel:"gaz", eta_gen:0.97, cat:"Cazane" },
  { id:"MOT_STD", label:"Cazan motorină - standard", fuel:"motorina", eta_gen:0.83, cat:"Cazane" },
  { id:"MOT_COND", label:"Cazan motorină - condensare", fuel:"motorina", eta_gen:0.95, cat:"Cazane" },
  { id:"CARB", label:"Cazan cărbune", fuel:"carbune", eta_gen:0.75, cat:"Cazane" },
  { id:"BIO_MAN", label:"Cazan biomasă - manual", fuel:"biomasa", eta_gen:0.78, cat:"Cazane" },
  { id:"BIO_AUT", label:"Cazan peleți - automat", fuel:"biomasa", eta_gen:0.88, cat:"Cazane" },
  { id:"ELEC", label:"Cazan electric", fuel:"electricitate", eta_gen:0.99, cat:"Cazane" },
  { id:"GPL_STD", label:"Cazan GPL - standard", fuel:"gpl", eta_gen:0.85, cat:"Cazane" },
  { id:"GPL_COND", label:"Cazan GPL - condensare", fuel:"gpl", eta_gen:0.95, cat:"Cazane" },
  { id:"PC_AA", label:"Pompă de căldură aer-apă", fuel:"electricitate", eta_gen:3.50, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_AERAER", label:"Pompă de căldură aer-aer", fuel:"electricitate", eta_gen:4.00, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_SA", label:"Pompă de căldură sol-apă", fuel:"electricitate", eta_gen:4.50, cat:"Pompe de caldura", isCOP:true },
  { id:"PC_APA", label:"Pompă de căldură apă-apă", fuel:"electricitate", eta_gen:5.00, cat:"Pompe de caldura", isCOP:true },
  { id:"TERMO", label:"Termoficare (racord urban)", fuel:"termoficare", eta_gen:0.95, cat:"Termoficare" },
  { id:"COGEN", label:"Cogenerare (CHP)", fuel:"gaz", eta_gen:0.85, cat:"Cogenerare" },
];

const EMISSION_SYSTEMS = [
  { id:"RAD_OT", label:"Radiatoare din oțel", eta_em:0.93 },
  { id:"RAD_FO", label:"Radiatoare din fontă", eta_em:0.90 },
  { id:"RAD_AL", label:"Radiatoare din aluminiu", eta_em:0.94 },
  { id:"CONV", label:"Convectoare", eta_em:0.92 },
  { id:"PARD", label:"Incălzire in pardoseală", eta_em:0.97 },
  { id:"PERE", label:"Incălzire in perete", eta_em:0.96 },
  { id:"PLAF", label:"Incălzire in plafon", eta_em:0.95 },
  { id:"VENT_CONV", label:"Ventiloconvectoare", eta_em:0.93 },
  { id:"AERO", label:"Aeroterme", eta_em:0.88 },
  { id:"SOBA_TER", label:"Sobă de teracotă", eta_em:0.80 },
  { id:"SOBA_MET", label:"Sobă metalică", eta_em:0.75 },
];

const DISTRIBUTION_QUALITY = [
  { id:"BINE_INT", label:"Bine izolată - interioară", eta_dist:0.95 },
  { id:"MED_INT", label:"Mediu izolată - interioară", eta_dist:0.90 },
  { id:"SLAB_INT", label:"Slab izolată - interioară", eta_dist:0.85 },
  { id:"BINE_EXT", label:"Bine izolată - exterioară", eta_dist:0.88 },
  { id:"MED_EXT", label:"Mediu izolată - exterioară", eta_dist:0.82 },
  { id:"SLAB_EXT", label:"Slab izolată - exterioară", eta_dist:0.75 },
  { id:"NEIZ", label:"Neizolată", eta_dist:0.70 },
];

const CONTROL_TYPES = [
  { id:"FARA", label:"Fără reglaj", eta_ctrl:0.82 },
  { id:"CENTR", label:"Centralizat (termostat ambiental)", eta_ctrl:0.88 },
  { id:"TERMO_RAD", label:"Robinete termostatice pe radiatoare", eta_ctrl:0.93 },
  { id:"ZONAL", label:"Reglaj zonal (multizonă)", eta_ctrl:0.95 },
  { id:"INTELIG", label:"Reglaj inteligent (smart/BMS)", eta_ctrl:0.97 },
];

const FUELS = [
  // Prețuri actualizate Q1/2026 conform date normative, OUG 6/2025, OUG 12/2026
  { id:"gaz", label:"Gaz natural", fP_nren:1.17, fP_ren:0.00, fP_tot:1.17, fCO2:0.202, pci:34.00, unit:"mc", price_lei_kwh:0.31, price_note:"Plafonat 310 lei/MWh TVA incl. (OUG 6/2025), din apr.2026: min(contract, reglementat) per OUG 12/2026" },
  { id:"motorina", label:"Motorină/combustibil lichid", fP_nren:1.10, fP_ren:0.00, fP_tot:1.10, fCO2:0.279, pci:42.60, unit:"litri", price_lei_kwh:0.75, price_note:"Preț orientativ 2025-2026" },
  { id:"carbune", label:"Cărbune (huilă)", fP_nren:1.20, fP_ren:0.00, fP_tot:1.20, fCO2:0.341, pci:26.00, unit:"kg", price_lei_kwh:0.18, price_note:"Preț orientativ 2025" },
  { id:"biomasa", label:"Biomasă (lemn/peleți)", fP_nren:0.23, fP_ren:0.85, fP_tot:1.08, fCO2:0.029, pci:17.50, unit:"kg", price_lei_kwh:0.22, price_note:"Peleți ENplus A1: 1300-1500 lei/t; Lemn 5.0-5.3 kWh/kg" },
  { id:"electricitate", label:"Electricitate din rețea (SEN)", fP_nren:2.50, fP_ren:0.00, fP_tot:2.50, fCO2:0.107, pci:null, unit:"kWh", price_lei_kwh:1.10, price_note:"Post-dereglementare 1 iul 2025: 1.03-1.15 lei/kWh TVA incl. (variații zonale)" },
  { id:"termoficare", label:"Termoficare/cogenerare", fP_nren:0.92, fP_ren:0.00, fP_tot:0.92, fCO2:0.220, pci:null, unit:"kWh", price_lei_kwh:0.40, price_note:"Tarif mediu 2025, subvenționat local" },
  { id:"gpl", label:"GPL (gaz petrolier lichefiat)", fP_nren:1.15, fP_ren:0.00, fP_tot:1.15, fCO2:0.227, pci:46.00, unit:"litri", price_lei_kwh:0.55, price_note:"Preț variabil ~4.5-6.0 lei/L (2024-2025)" },
  { id:"lemn_foc", label:"Lemne de foc", fP_nren:0.09, fP_ren:1.00, fP_tot:1.09, fCO2:0.018, pci:14.40, unit:"kg", price_lei_kwh:0.12, price_note:"Plafonat 400 lei/mc, putere calorifică ~5.0-5.3 kWh/kg" },
];

// Factor energie ambientală conform SR EN ISO 52000-1:2017/NA:2023 (Tabel A.16)
// OAER: factor 0 pentru energia ambientală a pompelor de căldură (în loc de 1.0 din Mc001 original)
const AMBIENT_ENERGY_FACTOR = {
  mc001_original: { fP_nren: 1.0, fP_ren: 0.0, fP_tot: 1.0, fCO2: 0.0, label: "Mc001-2022 original (Tabel 5.17)" },
  na2023:         { fP_nren: 0.0, fP_ren: 0.0, fP_tot: 0.0, fCO2: 0.0, label: "SR EN ISO 52000-1/NA:2023 (Tabel A.16)" },
};

const ACM_SOURCES = [
  { id:"CAZAN_H", label:"Același cazan cu încălzirea", eta:null },
  { id:"BOILER_E", label:"Boiler electric", eta:0.95, fuel:"electricitate" },
  { id:"BOILER_G", label:"Boiler pe gaz", eta:0.85, fuel:"gaz" },
  { id:"PC_ACM", label:"Pompă de căldură dedicată ACM", eta:3.0, fuel:"electricitate", isCOP:true },
  { id:"SOLAR_AUX", label:"Solar termic + auxiliar electric", eta:0.95, fuel:"electricitate", solarFraction:0.60 },
  { id:"TERMO_ACM", label:"Termoficare", eta:0.92, fuel:"termoficare" },
  { id:"INSTANT_G", label:"Instant pe gaz (centrală murală)", eta:0.88, fuel:"gaz" },
  { id:"INSTANT_E", label:"Instant electric", eta:0.97, fuel:"electricitate" },
];

const COOLING_SYSTEMS = [
  { id:"SPLIT", label:"Split/Multi-split", eer:3.50, fuel:"electricitate" },
  { id:"VRF", label:"Sistem VRF/VRV", eer:4.50, fuel:"electricitate" },
  { id:"CHILLER_A", label:"Chiller răcit cu aer", eer:3.00, fuel:"electricitate" },
  { id:"CHILLER_W", label:"Chiller răcit cu apă", eer:4.00, fuel:"electricitate" },
  { id:"ABSORB", label:"Mașină cu absorbție", eer:0.80, fuel:"gaz" },
  { id:"PC_REV", label:"Pompă de căldură reversibilă", eer:4.00, fuel:"electricitate" },
  { id:"NONE", label:"Fără sistem de răcire", eer:0, fuel:null },
];

// Tipuri ventilare conform I5-2022 (Ord. MDLPA 2023) + Mc 001-2022 Cap. 3
// SFP conform EN 13779 Tabel B.5 + I5-2022 Tabel 6.1 (W/(m³/s))
const VENTILATION_TYPES = [
  { id:"NAT", label:"Ventilare naturală", hasHR:false, sfp:0 },
  { id:"MEC_EXT", label:"Ventilare mecanică - extracție", hasHR:false, sfp:0.50 },
  { id:"MEC_INT", label:"Ventilare mecanică - introducere", hasHR:false, sfp:0.50 },
  { id:"MEC_DUB", label:"Ventilare mecanică dublă (fără recuperare)", hasHR:false, sfp:1.00 },
  { id:"MEC_HR70", label:"Ventilare mecanică cu recuperare 70%", hasHR:true, hrEta:0.70, sfp:1.20 },
  { id:"MEC_HR80", label:"Ventilare mecanică cu recuperare 80%", hasHR:true, hrEta:0.80, sfp:1.40 },
  { id:"MEC_HR90", label:"Ventilare mecanică cu recuperare 90%", hasHR:true, hrEta:0.90, sfp:1.60 },
  { id:"UTA", label:"Unitate de tratare aer (UTA)", hasHR:true, hrEta:0.75, sfp:2.00 },
];

const LIGHTING_TYPES = [
  { id:"INCAND", label:"Incandescent (bec clasic)", pDensity:25.0, efficacy:12 },
  { id:"HALOGEN", label:"Halogen", pDensity:18.0, efficacy:18 },
  { id:"CFL", label:"Fluorescent compact (CFL)", pDensity:8.0, efficacy:55 },
  { id:"TUB_T8", label:"Tub fluorescent T8", pDensity:10.0, efficacy:80 },
  { id:"TUB_T5", label:"Tub fluorescent T5", pDensity:7.0, efficacy:95 },
  { id:"LED", label:"LED", pDensity:4.5, efficacy:130 },
  { id:"LED_PRO", label:"LED profesional/panel", pDensity:3.5, efficacy:160 },
];

const LIGHTING_CONTROL = [
  { id:"MAN", label:"Manual (întrerupător)", fCtrl:1.00 },
  { id:"TIMER", label:"Programator orar", fCtrl:0.90 },
  { id:"PREZ", label:"Senzor de prezență", fCtrl:0.80 },
  { id:"DAYLIGHT", label:"Reglaj funcție de lumină naturală", fCtrl:0.70 },
  { id:"PREZ_DAY", label:"Prezență + lumină naturală", fCtrl:0.60 },
  { id:"BMS", label:"Sistem BMS integrat", fCtrl:0.55 },
];

const ACM_CONSUMPTION = { RI:60, RC:50, RA:50, BI:10, ED:15, SA:40, HC:80, CO:10, SP:30, AL:20 };
const LIGHTING_HOURS = { RI:1800, RC:1800, RA:1800, BI:2500, ED:2000, SA:3500, HC:3000, CO:3000, SP:2000, AL:2200 };

// ═══════════════════════════════════════════════════════════════
// BAZE DE DATE REGENERABILE — Cap. 4 Mc 001-2022
// ═══════════════════════════════════════════════════════════════

const SOLAR_THERMAL_TYPES = [
  { id:"PLAN", label:"Colector solar plan", eta0:0.75, a1:3.5, a2:0.015 },
  { id:"TUB_VID", label:"Colector tuburi vidate", eta0:0.70, a1:1.5, a2:0.005 },
  { id:"TUB_HP", label:"Tuburi vidate heat-pipe", eta0:0.65, a1:1.2, a2:0.004 },
  { id:"NEGL", label:"Colector neglazurat (piscine)", eta0:0.85, a1:15.0, a2:0.00 },
];

const PV_TYPES = [
  { id:"MONO", label:"Monocristalin", eta:0.21, degradation:0.005 },
  { id:"POLI", label:"Policristalin", eta:0.17, degradation:0.006 },
  { id:"THIN", label:"Film subțire (CdTe/CIGS)", eta:0.14, degradation:0.004 },
  { id:"BIFACIAL", label:"Bifacial monocristalin", eta:0.22, degradation:0.004 },
  { id:"HJT", label:"Heterojuncțiune (HJT)", eta:0.24, degradation:0.003 },
];

const PV_INVERTER_ETA = [
  { id:"STD", label:"Invertor standard", eta:0.95 },
  { id:"PREM", label:"Invertor premium", eta:0.97 },
  { id:"MICRO", label:"Micro-invertoare", eta:0.96 },
  { id:"OPTIM", label:"Optimizatoare + invertor", eta:0.97 },
];

const TILT_FACTORS = {
  "0":0.87, "10":0.93, "15":0.96, "20":0.98, "25":0.99, "30":1.00,
  "35":1.00, "40":0.99, "45":0.97, "50":0.94, "60":0.87, "70":0.78, "90":0.56,
};

const ORIENT_FACTORS = { S:1.00, SE:0.95, SV:0.95, E:0.82, V:0.82, NE:0.60, NV:0.60, N:0.45, Oriz:0.87 };

const BIOMASS_TYPES = [
  { id:"LEMN_CRUD", label:"Lemne de foc (crude)", pci:14.4, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"LEMN_UCAT", label:"Lemne de foc (uscate)", pci:16.5, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"PELETI", label:"Peleți din lemn", pci:17.5, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"BRICHETE", label:"Brichete din lemn", pci:17.0, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
  { id:"TOCATURA", label:"Tocătură / așchii lemn", pci:12.0, fP_nren:0.20, fP_ren:0.80, fCO2:0.00 },
];

// ═══════════════════════════════════════════════════════════════
// GRILE CLASARE ENERGETICĂ — Cap. 5 Mc 001-2022
// ═══════════════════════════════════════════════════════════════

// Clase: A+, A, B, C, D, E, F, G — praguri [kWh/(m2·an)] energie primară
// TODO-EPBD-AG: Rescalare conform EPBD 2024/1275 Art.16 (A=ZEB, G=15% stoc național) — așteptăm ordin ministerial RO
const ENERGY_CLASSES_DB = {
  RI_cool: { label:"Case individuale (cu răcire)", thresholds:[86,122,243,372,501,626,751] },
  RI_nocool: { label:"Case individuale (fără răcire)", thresholds:[73,103,210,330,450,560,665] },
  RC_cool: { label:"Bloc locuințe colective (cu răcire)", thresholds:[80,112,220,335,450,565,680] },
  RC_nocool: { label:"Bloc locuințe colective (fără răcire)", thresholds:[68,95,190,290,390,490,590] },
  RA_cool: { label:"Apartament (cu răcire)", thresholds:[73,101,198,297,396,495,595] },
  RA_nocool: { label:"Apartament (fără răcire)", thresholds:[62,86,172,260,348,436,524] },
  BI: { label:"Birouri", thresholds:[95,140,280,420,560,700,840] },
  ED: { label:"Educație", thresholds:[80,115,230,345,460,575,690] },
  SA: { label:"Sănătate", thresholds:[130,190,380,570,760,950,1140] },
  HC: { label:"Hotel / Cazare", thresholds:[110,160,320,480,640,800,960] },
  CO: { label:"Comercial", thresholds:[100,145,290,435,580,725,870] },
  SP: { label:"Sport", thresholds:[90,130,260,390,520,650,780] },
  AL: { label:"Altele", thresholds:[95,140,280,420,560,700,840] },
};

const CLASS_LABELS = ["A+","A","B","C","D","E","F","G"];
const CLASS_COLORS = ["#10b981","#22c55e","#84cc16","#eab308","#f97316","#ef4444","#dc2626","#7f1d1d"];

// Praguri nZEB per categorie [kWh/(m²·an)] energie primară + RER minim
// ZEB (Zero Emission Building) — EPBD IV Art. 11: fără emisii fosile on-site, EP < nZEB*0.9
// Obligatoriu: clădiri publice noi din 01.01.2028, toate clădirile noi din 01.01.2030
const ZEB_FACTOR = 0.90; // EP max = nZEB_threshold * 0.90

// Praguri nZEB conform Mc 001-2022 Tabel 5.6 + Legea 238/2024 Art.6
// ep_max: valoare maximă (zona climatică IV-V); variază 120.1-147.9 pentru RI pe zone I-V
// rer_min: 30% minim surse regenerabile (Legea 238/2024)
// rer_onsite_min: 10% pe amplasament (Legea 238/2024 + 20% prin garanții de origine)
// ZEB (EPBD 2024/1275): ep_max * 0.9, fără emisii fosile on-site — termen transpunere 29 mai 2026
const NZEB_THRESHOLDS = {
  RI: { ep_max: 148, rer_min: 30, rer_onsite_min: 10 },
  RC: { ep_max: 130, rer_min: 30, rer_onsite_min: 10 },
  RA: { ep_max: 120, rer_min: 30, rer_onsite_min: 10 },
  BI: { ep_max: 170, rer_min: 30, rer_onsite_min: 10 },
  ED: { ep_max: 140, rer_min: 30, rer_onsite_min: 10 },
  SA: { ep_max: 200, rer_min: 30, rer_onsite_min: 10 },
  HC: { ep_max: 180, rer_min: 30, rer_onsite_min: 10 },
  CO: { ep_max: 160, rer_min: 30, rer_onsite_min: 10 },
  SP: { ep_max: 150, rer_min: 30, rer_onsite_min: 10 },
  AL: { ep_max: 170, rer_min: 30, rer_onsite_min: 10 },
};

// Praguri CO2 per categorie [kg CO2/(m²·an)] — A+ la G (7 praguri)
const CO2_CLASSES_DB = {
  RI: { thresholds: [5, 10, 20, 35, 50, 70, 90] },
  RC: { thresholds: [4, 8, 17, 30, 43, 60, 78] },
  RA: { thresholds: [4, 7, 15, 26, 38, 53, 68] },
  BI: { thresholds: [6, 11, 22, 34, 45, 56, 67] },
  ED: { thresholds: [5, 9, 18, 28, 37, 46, 55] },
  SA: { thresholds: [8, 15, 30, 46, 61, 76, 91] },
  HC: { thresholds: [7, 13, 26, 38, 51, 64, 77] },
  CO: { thresholds: [6, 12, 23, 35, 46, 58, 70] },
  SP: { thresholds: [6, 10, 21, 31, 42, 52, 62] },
  AL: { thresholds: [6, 11, 22, 34, 45, 56, 67] },
};

const WATER_TEMP_MONTH = [5, 5, 7, 9, 12, 15, 17, 17, 14, 11, 8, 6];

function calcUtilFactor(gamma, a) {
  if (gamma < 0) return 1;
  if (Math.abs(gamma - 1) < 0.001) return a / (a + 1);
  return (1 - Math.pow(gamma, a)) / (1 - Math.pow(gamma, a + 1));
}

// TODO-ISO52016: Înlocuire cu metoda orară ISO 52016-1:2017 (necesită date climatice orare din SR EN ISO 52010-1/NA:2023)
// Metoda lunară rămâne validă conform Mc 001-2022 dar va fi deprecată la viitoarea actualizare normativă
function calcMonthlyISO13790(params) {
  var G_env = params.G_env, V = params.V, Au = params.Au, climate = params.climate;
  var theta_int = params.theta_int, gEls = params.glazingElements, sf = parseFloat(params.shadingFactor) || 0.90;
  var hrEta = params.hrEta || 0, category = params.category, n50 = parseFloat(params.n50) || 4.0;
  if (!climate || !Au || !V) return null;
  var days = [31,28,31,30,31,30,31,31,30,31,30,31];
  var mNames = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  var H_tr = G_env, H_ve = 0.34 * 0.5 * V * (1 - hrEta);
  var H_inf = 0.34 * n50 * V * 0.07 / 3.6;
  var Cm = Au * 80000;
  var H_total = H_tr + H_ve;
  var tau = H_total > 0 ? Cm / (H_total * 3600) : 50;
  var a_H = 1 + tau / 15;
  var qIntMap = {RI:4,RC:4,RA:4,BI:8,ED:6,SA:5,HC:4.5,CO:8,SP:5,AL:5};
  var phi_int = (qIntMap[category] || 4) * Au;
  var mFrac = [0.04,0.05,0.08,0.10,0.12,0.13,0.14,0.12,0.09,0.06,0.04,0.03];
  var orientDist = [{d:"N",f:0.10},{d:"E",f:0.25},{d:"S",f:0.40},{d:"V",f:0.25}];
  return mNames.map(function(name, i) {
    var tExt = climate.temp_month[i], deltaT = theta_int - tExt, hours = days[i] * 24;
    var Q_tr = H_tr * deltaT * hours / 1000;
    var Q_ve = (H_ve + H_inf) * deltaT * hours / 1000;
    var Q_loss = Math.max(0, Q_tr + Q_ve);
    var Q_int = phi_int * hours / 1000;
    var Q_sol = 0;
    if (gEls && climate.solar) {
      for (var gi = 0; gi < gEls.length; gi++) {
        var el = gEls[gi], aG = parseFloat(el.area)||0, gV = parseFloat(el.g)||0.5;
        var fr = (parseFloat(el.frameRatio)||25)/100, ori = el.orientation||"S";
        if (ori === "Mixt") {
          for (var oi = 0; oi < orientDist.length; oi++) Q_sol += aG*orientDist[oi].f*gV*(1-fr)*sf*(climate.solar[orientDist[oi].d]||200)*mFrac[i];
        } else {
          var k = ori === "Orizontal" ? "Oriz" : ori;
          Q_sol += aG*gV*(1-fr)*sf*(climate.solar[k]||390)*mFrac[i];
        }
      }
    }
    var Q_gain = Q_int + Q_sol;
    var gamma_H = Q_loss > 0 ? Q_gain/Q_loss : 999;
    var eta_H = calcUtilFactor(gamma_H, a_H);
    var qH_nd = Math.max(0, Q_loss - eta_H * Q_gain);
    var gamma_C = Q_gain > 0 ? Q_loss/Q_gain : 999;
    var eta_C = calcUtilFactor(gamma_C, a_H);
    var qC_nd = tExt > 15 ? Math.max(0, Q_gain - eta_C * Q_loss) : 0;
    return {name:name,tExt:tExt,deltaT:deltaT,Q_tr:Q_tr,Q_ve:Q_ve,Q_loss:Q_loss,Q_int:Q_int,Q_sol:Q_sol,Q_gain:Q_gain,gamma_H:gamma_H,eta_H:eta_H,qH_nd:qH_nd,qC_nd:qC_nd};
  });
}

// Verificare condensare Glaser — punct de rouă pe secțiune
function glaserCheck(layers, theta_int, theta_ext, phi_int, phi_ext) {
  // Extended Glaser — calculates condensation quantity g_c [g/(m²·season)]

  if (!layers || layers.length === 0) return null;
  var tInt = theta_int || 20, tExt = theta_ext || -15;
  var phiI = phi_int || 0.55, phiE = phi_ext || 0.80;
  // Presiune saturație (Magnus formula) [Pa]
  function pSat(t) { return 611.2 * Math.exp(17.67 * t / (t + 243.5)); }
  // Rezistențe termice și temperaturi pe interfețe
  var rsi = 0.13, rse = 0.04;
  var rLayers = layers.map(function(l) { var d = (parseFloat(l.thickness)||0)/1000; return d > 0 && l.lambda > 0 ? d/l.lambda : 0; });
  var rTotal = rsi + rLayers.reduce(function(s,r){return s+r;},0) + rse;
  // Temperaturi pe interfețe
  var temps = [tInt];
  var rCum = rsi;
  for (var i = 0; i < rLayers.length; i++) {
    rCum += rLayers[i];
    temps.push(tInt - (tInt - tExt) * rCum / rTotal);
  }
  temps.push(tExt);
  // Presiuni vapori (simplificat — difuzie liniară)
  var pvInt = phiI * pSat(tInt);
  var pvExt = phiE * pSat(tExt);
  // Rezistențe la difuzie (sd = mu * d)
  // Lookup mu: use layer.mu if available, else match from MATERIALS_DB by name, else fallback by lambda
  var muFallback = {0.87:10, 0.70:10, 1.30:200, 0.18:50, 0.25:8, 0.90:10, 0.17:50000, 0.40:100000, 0.80:10, 0.46:8, 0.33:8, 0.22:6, 0.16:6, 0.044:30, 0.039:40, 0.036:50, 0.034:100, 0.040:1, 0.038:1, 0.025:60, 0.023:60, 0.045:15, 0.015:5, 0.042:3, 0.031:40, 1.74:100, 1.28:70, 0.52:8, 1.40:50, 0.14:30, 0.13:30, 0.15:25};
  var sdLayers = layers.map(function(l) {
    var d = (parseFloat(l.thickness)||0)/1000;
    var mu;
    if (l.mu !== undefined && l.mu !== null) {
      mu = l.mu;
    } else {
      var matMatch = MATERIALS_DB.find(function(m) { return m.name === (l.matName || l.material); });
      mu = matMatch && matMatch.mu !== undefined ? matMatch.mu : (muFallback[l.lambda] || 10);
    }
    return mu * d;
  });
  var sdTotal = sdLayers.reduce(function(s,v){return s+v;},0);
  // Presiuni vapori pe interfețe
  var pvs = [pvInt];
  var sdCum = 0;
  for (var j = 0; j < sdLayers.length; j++) {
    sdCum += sdLayers[j];
    pvs.push(pvInt - (pvInt - pvExt) * sdCum / Math.max(sdTotal, 0.001));
  }
  pvs.push(pvExt);
  // Verificare condensare
  var results = [];
  var hasCondensation = false;
  for (var k = 0; k < temps.length; k++) {
    var tK = temps[k], pvK = pvs[k] !== undefined ? pvs[k] : pvInt;
    var psK = pSat(tK);
    var condensing = pvK >= psK;
    if (condensing) hasCondensation = true;
    results.push({ interface: k, temp: tK, pv: pvK, ps: psK, condensing: condensing });
  }
  // Estimate condensation quantity [g/m² per heating season ~180 days]
  var gc = 0;
  for (var ci = 0; ci < results.length; ci++) {
    if (results[ci].condensing) {
      var excess = results[ci].pv - results[ci].ps;
      gc += excess * 0.0001 * 180; // simplified g/(m²·season)
    }
  }
  return { results: results, hasCondensation: hasCondensation, gc: Math.round(gc) };
}

function getEnergyClass(epKwhM2, categoryKey) {
  const grid = ENERGY_CLASSES_DB[categoryKey];
  if (!grid) return { cls:"—", idx:-1, score:0, color:"#666666" };
  const t = grid.thresholds;
  for (let i = 0; i < t.length; i++) {
    if (epKwhM2 <= t[i]) {
      const low = i === 0 ? 0 : t[i-1];
      const high = t[i];
      const pctInBand = high > low ? (epKwhM2 - low) / (high - low) : 0;
      const score = Math.round(100 - (i * (100/8)) - pctInBand * (100/8));
      return { cls:CLASS_LABELS[i], idx:i, score:Math.max(1,Math.min(100,score)), color:CLASS_COLORS[i] };
    }
  }
  return { cls:"G", idx:7, score:1, color:CLASS_COLORS[7] };
}

function getCO2Class(co2KgM2, category) {
  const grid = CO2_CLASSES_DB[category] || CO2_CLASSES_DB.AL;
  const t = grid.thresholds;
  for (let i = 0; i < t.length; i++) {
    if (co2KgM2 <= t[i]) {
      const low = i === 0 ? 0 : t[i-1];
      const high = t[i];
      const pctInBand = high > low ? (co2KgM2 - low) / (high - low) : 0;
      const score = Math.round(100 - (i * (100/8)) - pctInBand * (100/8));
      return { cls:CLASS_LABELS[i], idx:i, score:Math.max(1,Math.min(100,score)), color:CLASS_COLORS[i] };
    }
  }
  return { cls:"G", idx:7, score:1, color:CLASS_COLORS[7] };
}

// ═══════════════════════════════════════════════════════════════
// CALCUL CONDENS GLASER LUNAR — SR EN ISO 13788:2012
// ═══════════════════════════════════════════════════════════════

function pSatMagnus(t) {
  return t >= 0 ? 610.5 * Math.exp(17.269 * t / (237.3 + t)) : 610.5 * Math.exp(21.875 * t / (265.5 + t));
}

function calcGlaserMonthly(layers, climate, tInt, rhInt) {
  if (!layers || !layers.length || !climate) return null;
  var tI = tInt || 20;
  var rhi = (rhInt || 50) / 100;
  var months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  var rhExt = [0.85, 0.82, 0.75, 0.70, 0.68, 0.65, 0.63, 0.63, 0.70, 0.78, 0.83, 0.86];

  // Build layer data
  var rsi = 0.13, rse = 0.04;
  var layerData = layers.map(function(l) {
    var d = (parseFloat(l.thickness) || 0) / 1000;
    var lam = l.lambda || 0.5;
    var mu = l.mu || 10;
    var mat = MATERIALS_DB.find(function(m) { return m.name === (l.matName || l.material); });
    if (mat && mat.mu) mu = mat.mu;
    return { d: d, R: d > 0 && lam > 0 ? d / lam : 0, sd: mu * d, name: l.matName || l.material || "Strat" };
  });

  var rTotal = rsi + layerData.reduce(function(s, l) { return s + l.R; }, 0) + rse;
  var sdTotal = layerData.reduce(function(s, l) { return s + l.sd; }, 0);

  var monthlyResults = [];
  var cumulativeCondensation = 0;
  var maxCondensation = 0;

  for (var m = 0; m < 12; m++) {
    var tExt = climate.temp_month[m];
    var pvInt = pSatMagnus(tI) * rhi;
    var pvExt = pSatMagnus(tExt) * rhExt[m];

    // Temperature at each interface
    var temps = [tI - (tI - tExt) * rsi / rTotal];
    var rCum = rsi;
    for (var i = 0; i < layerData.length; i++) {
      rCum += layerData[i].R;
      temps.push(tI - (tI - tExt) * rCum / rTotal);
    }

    // Vapor pressure at each interface
    var pvs = [pvInt];
    var sdCum = 0;
    for (var j = 0; j < layerData.length; j++) {
      sdCum += layerData[j].sd;
      pvs.push(pvInt - (pvInt - pvExt) * sdCum / Math.max(sdTotal, 0.001));
    }
    pvs.push(pvExt);

    // Check condensation at each interface
    var interfaces = [];
    var monthCondensation = 0;
    var monthEvaporation = 0;
    for (var k = 0; k <= layerData.length; k++) {
      var tK = temps[k];
      var pvK = pvs[k];
      var psK = pSatMagnus(tK);
      var condensing = pvK > psK * 1.001;
      var gcRate = condensing ? (pvK - psK) * 0.0002 : -(psK - pvK) * 0.00015;
      if (condensing) monthCondensation += gcRate * 30; // g/m² per month
      else monthEvaporation += Math.abs(gcRate) * 30;
      interfaces.push({ layer: k, temp: Math.round(tK * 10) / 10, pv: Math.round(pvK), ps: Math.round(psK), condensing: condensing });
    }

    cumulativeCondensation += monthCondensation - monthEvaporation;
    if (cumulativeCondensation < 0) cumulativeCondensation = 0;
    if (cumulativeCondensation > maxCondensation) maxCondensation = cumulativeCondensation;

    monthlyResults.push({
      month: months[m], tExt: tExt, interfaces: interfaces,
      condensation: Math.round(monthCondensation),
      evaporation: Math.round(monthEvaporation),
      cumulative: Math.round(cumulativeCondensation),
    });
  }

  // NP 057-02: apa acumulată iarna < apa evaporată vara → OK
  var winterAccum = monthlyResults.slice(0, 4).concat(monthlyResults.slice(10)).reduce(function(s, m) { return s + Math.max(0, m.condensation); }, 0);
  var summerEvap = monthlyResults.slice(4, 10).reduce(function(s, m) { return s + m.evaporation; }, 0);
  var annualOk = summerEvap >= winterAccum;

  return {
    monthly: monthlyResults,
    maxCumulative: Math.round(maxCondensation),
    winterAccum: Math.round(winterAccum),
    summerEvap: Math.round(summerEvap),
    annualOk: annualOk,
    layers: layerData,
    verdict: annualOk ? "OK — condensul se evaporă complet" : "NECONFORM — acumulare reziduală de umiditate",
  };
}

// ═══════════════════════════════════════════════════════════════
// ANALIZĂ FINANCIARĂ REABILITARE — EN 15459-1 / Reg. Delegat UE 244/2012 (republicat 2025/2273)
// Referință cost-optimă: 50 kWh/m²·an (Reg. 2025/2273), perioadă 30 ani, rată actualizare 5%
// ═══════════════════════════════════════════════════════════════

function calcFinancialAnalysis(params) {
  var investCost = params.investCost || 0;         // EUR total
  var annualSaving = params.annualSaving || 0;     // EUR/an economie energie
  var annualMaint = params.annualMaint || 0;       // EUR/an mentenanță suplimentară
  var discountRate = (params.discountRate || 5) / 100;  // rată actualizare
  var escalation = (params.escalation || 3) / 100;      // escaladare preț energie/an
  var period = params.period || 30;                // ani
  var residualValue = params.residualValue || 0;   // valoare reziduală la final

  if (investCost <= 0 || annualSaving <= 0) return null;

  // Cash flows
  var cashFlows = [-investCost];
  var cumulativeCF = [-investCost];
  var cumulativeDiscCF = [-investCost];
  var npv = -investCost;
  var paybackSimple = null;
  var paybackDisc = null;

  for (var y = 1; y <= period; y++) {
    var saving = annualSaving * Math.pow(1 + escalation, y - 1);
    var maint = annualMaint * Math.pow(1.02, y - 1); // mentenanță crește 2%/an
    var cf = saving - maint;
    if (y === period) cf += residualValue;
    cashFlows.push(cf);
    var cumCF = cumulativeCF[y - 1] + cf;
    cumulativeCF.push(cumCF);
    var discCF = cf / Math.pow(1 + discountRate, y);
    npv += discCF;
    cumulativeDiscCF.push(cumulativeDiscCF[y - 1] + discCF);

    if (paybackSimple === null && cumCF >= 0) {
      paybackSimple = cf > 0 ? (y - 1 + (-cumulativeCF[y - 1]) / cf) : y;
    }
    if (paybackDisc === null && cumulativeDiscCF[y] >= 0) {
      paybackDisc = y;
    }
  }

  // IRR calculation (Newton-Raphson)
  var irr = 0.10;
  for (var iter = 0; iter < 100; iter++) {
    var fVal = 0, fDeriv = 0;
    for (var t = 0; t < cashFlows.length; t++) {
      fVal += cashFlows[t] / Math.pow(1 + irr, t);
      if (t > 0) fDeriv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(fDeriv) < 1e-10) break;
    var newIrr = irr - fVal / fDeriv;
    if (Math.abs(newIrr - irr) < 1e-6) { irr = newIrr; break; }
    irr = newIrr;
  }
  if (irr < -0.5 || irr > 2.0 || isNaN(irr)) irr = null;

  // Benefit/Cost ratio
  var totalBenefits = 0;
  for (var b = 1; b <= period; b++) {
    totalBenefits += (annualSaving * Math.pow(1 + escalation, b - 1)) / Math.pow(1 + discountRate, b);
  }
  var bcRatio = investCost > 0 ? totalBenefits / investCost : 0;

  // Cost global per EN 15459 (simplificat)
  var globalCost = investCost;
  for (var gc = 1; gc <= period; gc++) {
    globalCost += (annualSaving * Math.pow(1 + escalation, gc - 1) * -1 + annualMaint * Math.pow(1.02, gc - 1)) / Math.pow(1 + discountRate, gc);
  }
  globalCost -= residualValue / Math.pow(1 + discountRate, period);

  return {
    npv: Math.round(npv),
    irr: irr !== null ? Math.round(irr * 10000) / 100 : null,
    paybackSimple: paybackSimple !== null ? Math.round(paybackSimple * 10) / 10 : null,
    paybackDiscounted: paybackDisc,
    bcRatio: Math.round(bcRatio * 100) / 100,
    globalCost: Math.round(globalCost),
    cashFlows: cashFlows,
    cumulativeCF: cumulativeCF,
    investCost: investCost,
    annualSaving: annualSaving,
    verdict: npv > 0 ? "PROFITABIL" : "NEPROFITABIL",
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFORT TERMIC VARĂ — C107/7-2002, SR EN ISO 7730
// ═══════════════════════════════════════════════════════════════

function calcSummerComfort(layers, climate, orientation) {
  if (!layers || !layers.length || !climate) return null;
  // Indicele de inerție termică D = Σ(Ri × si)
  // si = coeficient asimilare termică ≈ sqrt(λ × ρ × c) cu c ≈ 1000 J/(kg·K)
  var totalD = 0;
  var rCum = 0;
  for (var i = 0; i < layers.length; i++) {
    var d = (parseFloat(layers[i].thickness) || 0) / 1000;
    var lam = layers[i].lambda || 0.5;
    var rho = layers[i].rho || 1500;
    var c = 1000; // capacitate termică specifică [J/(kg·K)]
    var s = Math.sqrt(lam * rho * c); // coef. asimilare termică
    var R = d > 0 && lam > 0 ? d / lam : 0;
    totalD += R * s;
    rCum += R;
  }

  // Factor amortizare ν = e^(-D) (simplificat)
  var dampingFactor = Math.exp(-totalD / 2);
  // Defazaj Δφ ≈ D / (2π) × 24 [ore]
  var phaseShift = (totalD / (2 * Math.PI)) * 24;

  // Temperatura maximă pe suprafața interioară
  var tExtMax = Math.max.apply(null, climate.temp_month.slice(5, 8)) + 12; // temp max zilnică vara
  var tInt = 24; // temperatura medie interioară
  var amplitudeExt = (tExtMax - tInt);
  var amplitudeInt = amplitudeExt * dampingFactor;
  var tSurfMax = tInt + amplitudeInt;

  // Sarcină solară prin orientare
  var solarGain = (climate.solar[orientation] || climate.solar.S || 400) * 0.15; // factor transmisie estimat

  // Categorii confort SR EN 16798-1
  var category = tSurfMax <= 25 ? "I" : tSurfMax <= 26 ? "II" : tSurfMax <= 27 ? "III" : "IV";
  var ok = tSurfMax <= 27; // maxim cat. III

  return {
    D: Math.round(totalD * 100) / 100,
    dampingFactor: Math.round(dampingFactor * 1000) / 1000,
    phaseShift: Math.round(phaseShift * 10) / 10,
    tSurfMax: Math.round(tSurfMax * 10) / 10,
    tExtMax: Math.round(tExtMax * 10) / 10,
    amplitudeExt: Math.round(amplitudeExt * 10) / 10,
    amplitudeInt: Math.round(amplitudeInt * 10) / 10,
    solarGain: Math.round(solarGain),
    comfortCategory: category,
    ok: ok,
    verdict: ok ? "OK — confort termic asigurat vara" : "ATENȚIE — risc supraîncălzire",
  };
}

// ═══════════════════════════════════════════════════════════════
// EPBD 2024/1275 — Praguri ZEB (Zero Emission Building)
// Clădiri publice noi: de la 01.01.2028
// Toate clădirile noi: de la 01.01.2030
// ═══════════════════════════════════════════════════════════════

const ZEB_THRESHOLDS = {
  RI: { ep_max: 133, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  RC: { ep_max: 117, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  RA: { ep_max: 108, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  BI: { ep_max: 153, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  ED: { ep_max: 126, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  SA: { ep_max: 180, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  HC: { ep_max: 162, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  CO: { ep_max: 144, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  SP: { ep_max: 135, co2_max: 0, fossil_onsite: false, rer_min: 50 },
  AL: { ep_max: 153, co2_max: 0, fossil_onsite: false, rer_min: 50 },
};

// EPBD Art. 16 — Standarde minime performanță energetică (MEPS)
// Clădiri nerezidențiale: 16% cele mai ineficiente renovate până 2030, 26% până 2033
const MEPS_THRESHOLDS = {
  nonres_2030: { pct: 16, note: "16% cele mai performante scăzut (clasele F-G)" },
  nonres_2033: { pct: 26, note: "26% cele mai performante scăzut (clasele E-G)" },
  res_2030: { note: "Media stocului rezidențial: sub clasa D la nivel de kWh/m² prim." },
  res_2033: { note: "Reducere 16% consum mediu stoc rezidențial vs. 2020" },
};

// Prețuri orientative reabilitare actualizate 2025 [EUR/m²]
const REHAB_COSTS_2025 = {
  insulWall: {5:28, 8:36, 10:42, 12:50, 15:62, 20:78},
  insulRoof: {8:25, 10:32, 15:42, 20:55, 25:68},
  insulBasement: {5:34, 8:45, 10:56, 12:68},
  windows: {1.40:135, 1.10:200, 0.90:280, 0.70:390},
  hr70: 3800, hr80: 5500, hr90: 8200,
  pvPerM2: 180,
  pvPerKwp: 1100,
  hpAerApa: 900,
  hpSolApa: 1400,
  solarThPerM2: 380,
  bmsSimple: 2000, bmsComplex: 8000,
  evCharger: 1500,
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE AUXILIARE
// ═══════════════════════════════════════════════════════════════

const cn = (...classes) => classes.filter(Boolean).join(" ");

function Select({ label, value, onChange, options, placeholder, className="" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => (typeof o === "string" ? o : o.value) === value);
  const selectedLabel = selected ? (typeof selected === "string" ? selected : selected.label) : (placeholder || "Selecteaza...");

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={ref} style={{position:"relative"}}>
      {label && <label className="text-xs font-medium uppercase tracking-wider opacity-60">{label}</label>}
      <button type="button" onClick={() => setOpen(!open)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all flex items-center justify-between gap-2"
        style={{minHeight:"38px"}}>
        <span className={!selected && placeholder ? "opacity-40" : ""}>{selectedLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{flexShrink:0,transform:open?"rotate(180deg)":"",transition:"transform 0.15s"}}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          style={{top:"100%",background:"#1a1d2e",maxHeight:"240px",overflowY:"auto",scrollbarWidth:"thin"}}>
          {placeholder && (
            <div onClick={() => { onChange(""); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-white/10 transition-colors opacity-40">{placeholder}</div>
          )}
          {options.map((o, i) => {
            const val = typeof o === "string" ? o : o.value;
            const lab = typeof o === "string" ? o : o.label;
            const isActive = val === value;
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); }}
                className={cn("px-3 py-2 text-sm cursor-pointer transition-colors",
                  isActive ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/10")}>
                {lab}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type="text", unit, placeholder, min, max, step, className="", disabled=false, tooltip="" }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <label className="text-xs font-medium uppercase tracking-wider opacity-60">{label}{tooltip && <span className="ml-1 opacity-30 cursor-help" title={tooltip}>ⓘ</span>}</label>}
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          min={min} max={max} step={step} disabled={disabled}
          className={cn("w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all",
            unit && "pr-12", disabled && "opacity-40 cursor-not-allowed")} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40">{unit}</span>}
      </div>
    </div>
  );
}

function Badge({ children, color="amber" }) {
  const colors = { amber:"bg-amber-500/15 text-amber-400 border-amber-500/20", green:"bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    red:"bg-red-500/15 text-red-400 border-red-500/20", blue:"bg-sky-500/15 text-sky-400 border-sky-500/20", purple:"bg-violet-500/15 text-violet-400 border-violet-500/20" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", colors[color])}>{children}</span>;
}

function Card({ children, className="", title, badge }) {
  return (
    <div className={cn("bg-white/[0.03] border border-white/[0.06] rounded-xl p-5", className)}>
      {(title||badge) && <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70">{title}</h3>}
        {badge}
      </div>}
      {children}
    </div>
  );
}

function ResultRow({ label, value, unit, status }) {
  const statusColors = { ok:"text-emerald-400", warn:"text-amber-400", fail:"text-red-400" };
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs opacity-60">{label}</span>
      <span className={cn("text-sm font-mono font-medium", status ? statusColors[status] : "text-white")}>
        {value} {unit && <span className="opacity-40 text-xs ml-1">{unit}</span>}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTA PRINCIPALĂ
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { id:1, label:"Identificare", labelEN:"Identification", icon:"📋", desc:"Date generale clădire", descEN:"General building data" },
  { id:2, label:"Anvelopă", labelEN:"Envelope", icon:"🏗️", desc:"Elemente constructive", descEN:"Building elements" },
  { id:3, label:"Instalații", labelEN:"Systems", icon:"⚙️", desc:"Încălzire, ACM, clima", descEN:"Heating, DHW, HVAC" },
  { id:4, label:"Regenerabile", labelEN:"Renewables", icon:"☀️", desc:"Surse energie verde", descEN:"Green energy" },
  { id:5, label:"Calcul", labelEN:"Calculation", icon:"📊", desc:"Bilanț energetic", descEN:"Energy balance" },
  { id:6, label:"Certificat", labelEN:"Certificate", icon:"📜", desc:"Clasare & CPE", descEN:"Classification & EPC" },
  { id:7, label:"Audit", labelEN:"Audit", icon:"🔍", desc:"Recomandări", descEN:"Recommendations" },
];

// ═══════════════════════════════════════════════════════════
// CLĂDIRI TIP ROMÂNEȘTI — template-uri pre-populate
// ═══════════════════════════════════════════════════════════
const TYPICAL_BUILDINGS = [
  { id:"BLOC_P4_70", label:"Bloc P+4, anii '70 (panouri BCA)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+4", basement:true, attic:false, units:"40", stairs:"2", heightBuilding:"16.5", heightFloor:"2.75" },
    opaque:[
      { name:"Pereți ext. panouri BCA 30cm", type:"PE", area:"1200", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Terasă necirculabilă", type:"PT", area:"350", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 60", thickness:"50", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"350", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC dublu", u:"1.60", g:"0.65", area:"280", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșeu intermediar ×5", psi:"0.10", length:"200" },
      { name:"PE — Terasă", psi:"0.15", length:"76" },
      { name:"Glaf ferestre", psi:"0.08", length:"420" },
      { name:"Stâlpi beton", psi:"0.15", length:"120" },
    ],
  },
  { id:"CASA_INTER", label:"Casă interbelică (zidărie 50cm)", cat:"RI",
    building:{ category:"RI", structure:"Zidărie portantă", floors:"P+1", basement:true, attic:true, units:"1", stairs:"1", heightBuilding:"7.5", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți ext. cărămidă plină 50cm", type:"PE", area:"180", layers:[
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"500", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"30", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu lemn sub pod", type:"PP", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Lemn moale (brad/molid)", thickness:"200", lambda:0.14, rho:500 },
        { material:"Strat de aer neventilat (5cm)", thickness:"50", lambda:0.18, rho:1.2 },
      ]},
      { name:"Planșeu beton peste subsol", type:"PB", area:"95", layers:[
        { material:"Parchet lemn", thickness:"22", lambda:0.18, rho:600 },
        { material:"Beton simplu", thickness:"200", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[{ name:"Ferestre lemn simplu vitraj", u:"3.50", g:"0.85", area:"22", orientation:"Mixt", frameRatio:"35" }],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"40" },
      { name:"PE — Soclu/fundație", psi:"0.25", length:"40" },
      { name:"Cornișă acoperiș", psi:"0.10", length:"40" },
      { name:"Glaf ferestre lemn", psi:"0.08", length:"55" },
    ],
  },
  { id:"VILA_P1_2000", label:"Vilă P+1, post-2000 (GVP + EPS)", cat:"RI",
    building:{ category:"RI", structure:"Cadre beton armat", floors:"P+1", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"6.50", heightFloor:"2.80" },
    opaque:[
      { name:"Pereți ext. GVP 25cm + EPS 10cm", type:"PE", area:"160", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 100", thickness:"100", lambda:0.036, rho:25 },
        { material:"Cărămidă cu goluri (GVP)", thickness:"250", lambda:0.46, rho:1200 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș înclinat (vată 20cm)", type:"PP", area:"100", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"OSB", thickness:"18", lambda:0.13, rho:600 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"85", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"60", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"50", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC Low-E", u:"1.10", g:"0.50", area:"30", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"36" },
      { name:"Cornișă acoperiș", psi:"0.10", length:"36" },
      { name:"Glaf ferestre — izolat", psi:"0.04", length:"48" },
      { name:"Stâlpi beton", psi:"0.15", length:"30" },
    ],
  },
  { id:"BLOC_P10_80", label:"Bloc P+10, anii '80 (panouri prefab)", cat:"RC",
    building:{ category:"RC", structure:"Panouri prefabricate mari", floors:"P+10", basement:true, attic:false, units:"120", stairs:"4", heightBuilding:"33", heightFloor:"2.75" },
    opaque:[
      { name:"Panouri sandwich GBN 60cm", type:"PE", area:"3200", layers:[
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 60", thickness:"60", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
      ]},
      { name:"Terasă inversată", type:"PT", area:"420", layers:[
        { material:"Pietriș", thickness:"50", lambda:0.70, rho:1700 },
        { material:"Polistiren extrudat XPS", thickness:"80", lambda:0.034, rho:35 },
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Ferestre PVC termopan", u:"1.60", g:"0.65", area:"950", orientation:"Mixt", frameRatio:"25" }],
    bridges:[
      { name:"PE — Planșee ×11", psi:"0.10", length:"880" },
      { name:"PE — Terasă", psi:"0.15", length:"84" },
      { name:"Consolă balcon beton ×80", psi:"0.70", length:"320" },
      { name:"Glaf ferestre", psi:"0.08", length:"1100" },
    ],
  },
  { id:"BIROURI_2010", label:"Clădire birouri post-2010", cat:"BI",
    building:{ category:"BI", structure:"Cadre beton armat", floors:"P+3", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"14", heightFloor:"3.20" },
    opaque:[
      { name:"Pereți cortină + izolație", type:"PE", area:"800", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Terasă", type:"PT", area:"400", layers:[
        { material:"Bitum (membrană)", thickness:"10", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[{ name:"Perete cortină tripan", u:"0.90", g:"0.45", area:"600", orientation:"Mixt", frameRatio:"15" }],
    bridges:[
      { name:"PE — Planșee ×4", psi:"0.10", length:"240" },
      { name:"Glaf ferestre", psi:"0.04", length:"380" },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // DEMO-URI NOI — diverse categorii, clase energetice, nZEB
  // ═══════════════════════════════════════════════════════════

  // ── Clasa E-F: Apartament nerenovat, anii '80, București ──
  { id:"APT_NERENOVAT_80", label:"Apt. 2 cam nerenovat '80 (clasa E-F)", cat:"RA",
    building:{ category:"RA", structure:"Panouri prefabricate mari", floors:"P+8", basement:true, attic:false, units:"1", stairs:"1", heightBuilding:"27", heightFloor:"2.75",
      yearBuilt:"1982", address:"Bd. Timișoara nr. 50, Bl. C3, Sc. 2, Et. 4, Ap. 18", city:"București", county:"București", postalCode:"061344", locality:"București" },
    opaque:[
      { name:"Pereți ext. GBN 30cm fără izolație", type:"PE", area:"42", layers:[
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
        { material:"Beton armat", thickness:"60", lambda:1.74, rho:2400 },
        { material:"Polistiren expandat EPS 60", thickness:"40", lambda:0.044, rho:15 },
        { material:"Beton armat", thickness:"80", lambda:1.74, rho:2400 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu peste subsol neîncălzit", type:"PB", area:"52", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"40", lambda:1.40, rho:2000 },
        { material:"Beton armat", thickness:"140", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"8.5", orientation:"S", frameRatio:"30" },
      { name:"Ferestre lemn dublu vitraj N", u:"2.80", g:"0.75", area:"3.2", orientation:"N", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșeu intermediar", psi:"0.10", length:"14" },
      { name:"Glaf ferestre vechi", psi:"0.08", length:"18" },
      { name:"Consolă balcon beton", psi:"0.70", length:"3.5" },
    ],
  },

  // ── Clasa A nZEB: Casă pasivă nouă 2024, Cluj ──
  { id:"CASA_PASIVA_2024", label:"Casă pasivă nouă 2024 (clasa A, nZEB)", cat:"RI",
    building:{ category:"RI", structure:"Cadre lemn (CLT/timberframe)", floors:"P+1", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.20", heightFloor:"2.80",
      yearBuilt:"2024", yearRenov:"", address:"Str. Fânațelor nr. 12A", city:"Cluj-Napoca", county:"Cluj", postalCode:"400608", locality:"Cluj-Napoca", n50:"0.6" },
    opaque:[
      { name:"Pereți ext. CLT + vată minerală 25cm", type:"PE", area:"145", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"250", lambda:0.035, rho:80 },
        { material:"OSB", thickness:"15", lambda:0.13, rho:600 },
        { material:"Lemn moale (brad/molid)", thickness:"100", lambda:0.14, rho:500 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Acoperiș plat verde (30cm vată)", type:"PT", area:"75", layers:[
        { material:"Substrat vegetal", thickness:"80", lambda:1.00, rho:1500 },
        { material:"Bitum (membrană)", thickness:"8", lambda:0.17, rho:1050 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.032, rho:35 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.035, rho:80 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol izolată 20cm XPS", type:"PL", area:"75", layers:[
        { material:"Gresie ceramică", thickness:"10", lambda:1.30, rho:2300 },
        { material:"Șapă ciment", thickness:"65", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"200", lambda:0.032, rho:35 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Tripan Low-E argon Sud", u:"0.70", g:"0.42", area:"18", orientation:"S", frameRatio:"20" },
      { name:"Tripan Low-E argon Est/Vest", u:"0.70", g:"0.42", area:"8", orientation:"E", frameRatio:"20" },
      { name:"Tripan Low-E argon Nord (mic)", u:"0.70", g:"0.42", area:"4", orientation:"N", frameRatio:"22" },
    ],
    bridges:[
      { name:"PE — Placă pe sol (izolat perimetral)", psi:"0.08", length:"34" },
      { name:"PE — Acoperiș (izolat continuu)", psi:"0.06", length:"34" },
      { name:"Glaf ferestre montaj RAL", psi:"0.02", length:"52" },
      { name:"Colț exterior", psi:"0.05", length:"25" },
    ],
  },

  // ── Clasa C-D: Grădiniță (învățământ), anii '90, Iași ──
  { id:"GRADINITA_90", label:"Grădiniță anii '90 Iași (clasa C-D)", cat:"ED",
    building:{ category:"ED", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"4.50", heightFloor:"3.50",
      yearBuilt:"1993", address:"Str. Profesor Ion Creangă nr. 8", city:"Iași", county:"Iași", postalCode:"700100", locality:"Iași" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + EPS 5cm", type:"PE", area:"260", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Polistiren expandat EPS 80", thickness:"50", lambda:0.040, rho:20 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod neîncălzit (vată 10cm)", type:"PP", area:"420", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"100", lambda:0.040, rho:100 },
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol", type:"PL", area:"420", layers:[
        { material:"Linoleum", thickness:"5", lambda:0.17, rho:1200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton simplu", thickness:"150", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[
      { name:"Ferestre PVC dublu vitraj", u:"1.40", g:"0.60", area:"85", orientation:"Mixt", frameRatio:"25" },
    ],
    bridges:[
      { name:"PE — Soclu/fundație", psi:"0.20", length:"84" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"84" },
      { name:"Glaf ferestre", psi:"0.08", length:"110" },
    ],
  },

  // ── Clasa B: Hotel boutique renovat, Sibiu ──
  { id:"HOTEL_SIBIU", label:"Hotel boutique renovat Sibiu (clasa B)", cat:"HC",
    building:{ category:"HC", structure:"Zidărie portantă", floors:"P+2", basement:true, attic:true, units:"18", stairs:"1", heightBuilding:"12", heightFloor:"3.20",
      yearBuilt:"1920", yearRenov:"2021", address:"Str. Mitropoliei nr. 5", city:"Sibiu", county:"Sibiu", postalCode:"550179", locality:"Sibiu" },
    opaque:[
      { name:"Pereți ext. cărămidă 60cm + vată 12cm", type:"PE", area:"480", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"120", lambda:0.040, rho:100 },
        { material:"Cărămidă plină", thickness:"600", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"20", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod (vată 20cm)", type:"PP", area:"180", layers:[
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Lemn moale (brad/molid)", thickness:"200", lambda:0.14, rho:500 },
      ]},
      { name:"Planșeu peste subsol", type:"PB", area:"180", layers:[
        { material:"Parchet lemn", thickness:"15", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Polistiren expandat EPS 100", thickness:"80", lambda:0.036, rho:25 },
        { material:"Beton armat", thickness:"200", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn tripan (reabilitate)", u:"1.10", g:"0.50", area:"95", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Planșee ×3", psi:"0.10", length:"120" },
      { name:"PE — Soclu izolat", psi:"0.12", length:"56" },
      { name:"Glaf ferestre", psi:"0.04", length:"125" },
      { name:"PE — Cornișă", psi:"0.10", length:"56" },
    ],
  },

  // ── Clasa A-B nZEB: Supermarket nou 2025, Timișoara ──
  { id:"SUPERMARKET_2025", label:"Supermarket nou 2025 Timișoara (clasa A-B, nZEB)", cat:"CO",
    building:{ category:"CO", structure:"Structură metalică", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"6.00", heightFloor:"5.50",
      yearBuilt:"2025", address:"Calea Aradului nr. 95", city:"Timișoara", county:"Timiș", postalCode:"300088", locality:"Timișoara" },
    opaque:[
      { name:"Panouri sandwich 15cm PU", type:"PE", area:"650", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Spumă poliuretanică (PUR/PIR)", thickness:"150", lambda:0.024, rho:40 },
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
      ]},
      { name:"Acoperiș sandwich 20cm PU", type:"PT", area:"1200", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Spumă poliuretanică (PUR/PIR)", thickness:"200", lambda:0.024, rho:40 },
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
      ]},
      { name:"Placă pe sol izolată 15cm XPS", type:"PL", area:"1200", layers:[
        { material:"Beton lustruit", thickness:"20", lambda:1.28, rho:2200 },
        { material:"Șapă ciment", thickness:"80", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"150", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Vitrină dublu vitraj selectiv", u:"1.10", g:"0.35", area:"120", orientation:"S", frameRatio:"10" },
      { name:"Uși automate", u:"2.00", g:"0.60", area:"15", orientation:"S", frameRatio:"40" },
    ],
    bridges:[
      { name:"PE — Soclu", psi:"0.15", length:"140" },
      { name:"Joncțiune perete-acoperiș", psi:"0.10", length:"140" },
      { name:"Glaf vitrine", psi:"0.04", length:"65" },
    ],
  },

  // ── Clasa D-E: Dispensar sătesc, Vaslui ──
  { id:"DISPENSAR_VASLUI", label:"Dispensar sătesc '70 Vaslui (clasa D-E)", cat:"SA",
    building:{ category:"SA", structure:"Zidărie portantă", floors:"P", basement:false, attic:true, units:"1", stairs:"1", heightBuilding:"4.00", heightFloor:"3.20",
      yearBuilt:"1975", address:"Str. Principală nr. 45", city:"Vaslui", county:"Vaslui", postalCode:"730008", locality:"Vaslui" },
    opaque:[
      { name:"Pereți ext. cărămidă 38cm fără izolație", type:"PE", area:"155", layers:[
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
        { material:"Cărămidă plină", thickness:"380", lambda:0.80, rho:1800 },
        { material:"Tencuială var-ciment", thickness:"25", lambda:0.87, rho:1800 },
      ]},
      { name:"Planșeu sub pod (fără izolație)", type:"PP", area:"220", layers:[
        { material:"Beton armat", thickness:"120", lambda:1.74, rho:2400 },
      ]},
      { name:"Placă pe sol (fără izolație)", type:"PL", area:"220", layers:[
        { material:"Linoleum", thickness:"5", lambda:0.17, rho:1200 },
        { material:"Șapă ciment", thickness:"50", lambda:1.40, rho:2000 },
        { material:"Beton simplu", thickness:"150", lambda:1.28, rho:2200 },
      ]},
    ],
    glazing:[
      { name:"Ferestre lemn dublu vitraj vechi", u:"2.80", g:"0.75", area:"32", orientation:"Mixt", frameRatio:"30" },
    ],
    bridges:[
      { name:"PE — Soclu/fundație", psi:"0.25", length:"60" },
      { name:"PE — Cornișă acoperiș", psi:"0.10", length:"60" },
      { name:"Glaf ferestre", psi:"0.08", length:"48" },
    ],
  },

  // ── Clasa B-C: Sală sport școală, Brașov ──
  { id:"SALA_SPORT_BV", label:"Sală sport școală Brașov (clasa B-C)", cat:"SP",
    building:{ category:"SP", structure:"Cadre beton armat", floors:"P", basement:false, attic:false, units:"1", stairs:"1", heightBuilding:"8.00", heightFloor:"7.50",
      yearBuilt:"2018", address:"Str. Sportivilor nr. 2", city:"Brașov", county:"Brașov", postalCode:"500200", locality:"Brașov" },
    opaque:[
      { name:"Pereți ext. BCA 30cm + vată 15cm", type:"PE", area:"320", layers:[
        { material:"Tencuială decorativă", thickness:"5", lambda:0.70, rho:1600 },
        { material:"Vată minerală bazaltică", thickness:"150", lambda:0.040, rho:100 },
        { material:"BCA (beton celular autoclavizat)", thickness:"300", lambda:0.22, rho:600 },
        { material:"Tencuială var-ciment", thickness:"15", lambda:0.87, rho:1800 },
      ]},
      { name:"Acoperiș metalic izolat (vată 20cm)", type:"PT", area:"800", layers:[
        { material:"Tablă zincată", thickness:"0.6", lambda:50.0, rho:7800 },
        { material:"Vată minerală bazaltică", thickness:"200", lambda:0.040, rho:100 },
        { material:"Barieră de vapori", thickness:"0.5", lambda:0.40, rho:900 },
        { material:"Gips-carton", thickness:"12", lambda:0.25, rho:900 },
      ]},
      { name:"Placă pe sol izolată", type:"PL", area:"800", layers:[
        { material:"Parchet sport", thickness:"20", lambda:0.18, rho:600 },
        { material:"Șapă ciment", thickness:"80", lambda:1.40, rho:2000 },
        { material:"Polistiren extrudat XPS", thickness:"100", lambda:0.034, rho:35 },
        { material:"Beton armat", thickness:"150", lambda:1.74, rho:2400 },
      ]},
    ],
    glazing:[
      { name:"Ferestre aluminiu dublu vitraj", u:"1.40", g:"0.55", area:"65", orientation:"Mixt", frameRatio:"20" },
    ],
    bridges:[
      { name:"PE — Soclu", psi:"0.15", length:"120" },
      { name:"PE — Joncțiune acoperiș", psi:"0.10", length:"120" },
      { name:"Glaf ferestre", psi:"0.06", length:"70" },
    ],
  },
];

export default function EnergyCalcApp() {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("RO");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  // ═══════════════════════════════════════════════════════════════
  // TIER SYSTEM — Free / Pro / Business
  // ═══════════════════════════════════════════════════════════════
  const TIERS = {
    free:     { id:"free",     label:"Free",     price:0,   maxProjects:2, maxCerts:0,  multiUser:false, watermark:true,  nzebReport:false, docxExport:false, brandingCPE:false },
    pro:      { id:"pro",      label:"Pro",      price:199, maxProjects:999, maxCerts:15, multiUser:false, watermark:false, nzebReport:true,  docxExport:true,  brandingCPE:false },
    business: { id:"business", label:"Business", price:399, maxProjects:999, maxCerts:999,multiUser:true,  watermark:false, nzebReport:true,  docxExport:true,  brandingCPE:true  },
  };

  const [userTier, setUserTier] = useState("free");
  const [projectCount, setProjectCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [certResetDate, setCertResetDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d.toISOString().slice(0,10);
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [showPricingPage, setShowPricingPage] = useState(false);

  const tier = TIERS[userTier] || TIERS.free;

  // Load tier data from storage
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !window.storage) return;
      try {
        const r = await window.storage.get("certen-tier-data");
        if (r && r.value) {
          const d = JSON.parse(r.value);
          if (d.tier) setUserTier(d.tier);
          if (d.projectCount) setProjectCount(d.projectCount);
          if (d.certCount) setCertCount(d.certCount);
          if (d.certResetDate) setCertResetDate(d.certResetDate);
        }
      } catch(e) {}
    })();
  }, []);

  // Save tier data
  const saveTierData = useCallback(async (t, pc, cc, rd) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      await window.storage.set("certen-tier-data", JSON.stringify({tier:t||userTier, projectCount:pc??projectCount, certCount:cc??certCount, certResetDate:rd||certResetDate}));
    } catch(e) {}
  }, [userTier, projectCount, certCount, certResetDate]);

  // Reset cert count monthly
  useEffect(() => {
    const now = new Date().toISOString().slice(0,10);
    if (now >= certResetDate) {
      setCertCount(0);
      const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
      const newReset = d.toISOString().slice(0,10);
      setCertResetDate(newReset);
      saveTierData(userTier, projectCount, 0, newReset);
    }
  }, [certResetDate]);

  // Check limits
  const canCreateProject = projectCount < tier.maxProjects;
  const canGenerateCert = userTier !== "free" ? (tier.maxCerts === 999 || certCount < tier.maxCerts) : false;
  const canExportDocx = tier.docxExport;
  const canNzebReport = tier.nzebReport;
  const hasWatermark = tier.watermark;

  const requireUpgrade = (reason) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const activateTier = async (newTier) => {
    setUserTier(newTier);
    setShowUpgradeModal(false);
    setShowPricingPage(false);
    await saveTierData(newTier, projectCount, certCount, certResetDate);
  };

  const incrementCertCount = async () => {
    const nc = certCount + 1;
    setCertCount(nc);
    await saveTierData(userTier, projectCount, nc, certResetDate);
  };

  // ─── STEP 1 STATE ───
  const INITIAL_BUILDING = {
    address:"", city:"", county:"", postal:"",
    category:"RI", structure:"Zidărie portantă",
    yearBuilt:"", yearRenov:"",
    floors:"P", basement:false, attic:false,
    units:"1", stairs:"1",
    areaUseful:"", volume:"", areaEnvelope:"",
    heightBuilding:"", heightFloor:"2.80",
    locality:"",
    perimeter:"", n50:"4.0", shadingFactor:"0.90",
    gwpLifecycle:"", solarReady:false,
    scopCpe:"vanzare", parkingSpaces:"0",
  };
  const [building, setBuilding] = useState({...INITIAL_BUILDING});

  // ─── STEP 2 STATE ───
  const [opaqueElements, setOpaqueElements] = useState([]);
  const [glazingElements, setGlazingElements] = useState([]);
  const [thermalBridges, setThermalBridges] = useState([]);

  // Editing states for opaque element modal
  const [editingOpaque, setEditingOpaque] = useState(null);
  const [showOpaqueModal, setShowOpaqueModal] = useState(false);
  const [showGlazingModal, setShowGlazingModal] = useState(false);
  const [editingGlazing, setEditingGlazing] = useState(null);
  const [showBridgeModal, setShowBridgeModal] = useState(false);
  const [editingBridge, setEditingBridge] = useState(null);
  const [showBridgeCatalog, setShowBridgeCatalog] = useState(false);

  // ─── STEP 3 STATE ───
  const [instSubTab, setInstSubTab] = useState("heating");

  const INITIAL_HEATING = {
    source:"GAZ_COND", power:"", eta_gen:"0.97",
    emission:"RAD_OT", eta_em:"0.93",
    distribution:"BINE_INT", eta_dist:"0.95",
    control:"TERMO_RAD", eta_ctrl:"0.93",
    regime:"intermitent", theta_int:"20", nightReduction:"4",
    tStaircase:"15", tBasement:"10", tAttic:"5",
  };
  const [heating, setHeating] = useState({...INITIAL_HEATING});

  const INITIAL_ACM = {
    source:"CAZAN_H", consumers:"", dailyLiters:"60",
    storageVolume:"", storageLoss:"2.0",
    pipeLength:"", pipeInsulated:true,
    circRecirculation:false, circHours:"",
  };
  const [acm, setAcm] = useState({...INITIAL_ACM});

  const INITIAL_COOLING = {
    system:"NONE", power:"", eer:"",
    cooledArea:"", distribution:"BINE_INT",
    hasCooling:false,
  };
  const [cooling, setCooling] = useState({...INITIAL_COOLING});

  const INITIAL_VENTILATION = {
    type:"NAT", airflow:"", fanPower:"",
    operatingHours:"", hrEfficiency:"",
  };
  const [ventilation, setVentilation] = useState({...INITIAL_VENTILATION});

  const INITIAL_LIGHTING = {
    type:"LED", pDensity:"4.5", controlType:"MAN",
    fCtrl:"1.00", operatingHours:"", naturalLightRatio:"30",
  };
  const [lighting, setLighting] = useState({...INITIAL_LIGHTING});

  // ─── STEP 4 STATE ───
  const [renewSubTab, setRenewSubTab] = useState("solar_th");

  const INITIAL_SOLAR_TH = {
    enabled:false, type:"PLAN", area:"", orientation:"S", tilt:"35",
    usage:"acm", storageVolume:"", eta0:"0.75", a1:"3.5",
  };
  const [solarThermal, setSolarThermal] = useState({...INITIAL_SOLAR_TH});

  const INITIAL_PV = {
    enabled:false, type:"MONO", area:"", peakPower:"",
    orientation:"S", tilt:"30", inverterType:"STD",
    inverterEta:"0.95", usage:"all",
  };
  const [photovoltaic, setPhotovoltaic] = useState({...INITIAL_PV});

  const INITIAL_HP = {
    enabled:false, type:"PC_AA", cop:"3.50", scopHeating:"3.00",
    scopCooling:"", covers:"heating_acm", bivalentTemp:"-5",
    auxSource:"GAZ_COND", auxEta:"0.97",
  };
  const [heatPump, setHeatPump] = useState({...INITIAL_HP});

  const INITIAL_BIO = {
    enabled:false, type:"PELETI", boilerEta:"0.88", power:"",
    covers:"heating", annualConsumption:"",
  };
  const [biomass, setBiomass] = useState({...INITIAL_BIO});

  const INITIAL_OTHER = {
    windEnabled:false, windCapacity:"", windProduction:"",
    cogenEnabled:false, cogenElectric:"", cogenThermal:"", cogenFuel:"gaz",
  };
  const [otherRenew, setOtherRenew] = useState({...INITIAL_OTHER});

  // ─── STEP 6 STATE ───
  const INITIAL_AUDITOR = {
    name:"", atestat:"", grade:"I", company:"",
    phone:"", email:"", date: new Date().toISOString().slice(0,10),
    mdlpaCode:"", observations:"", photo:"",
    // Câmpuri noi CPE conform Mc001-2022 + Legea 238/2024
    scopCpe:"vanzare", // vanzare | inchiriere | reabilitare | constructie_noua
    validityYears:"10", // 10 ani standard, 5 ani pentru clasele D-G (EPBD 2024/1275)
    registruEvidenta:"", // număr în registrul de evidență al auditorului
    nrCadastral:"", // număr cadastral al clădirii
    codUnicMDLPA:"", // format: Nr_Data_Nume_Prenume_Serie_Nr_Registru_CPE
  };
  const [auditor, setAuditor] = useState({...INITIAL_AUDITOR});

  // ── Toggle Tabel 5.17 / Tabel A.16 (SR EN ISO 52000-1/NA:2023) ──
  const [useNA2023, setUseNA2023] = useState(true); // implicit: NA:2023 (recomandat OAER)
  
  // ── Analiza financiară reabilitare ──
  const [finAnalysisInputs, setFinAnalysisInputs] = useState({
    discountRate:"5", escalation:"3", period:"30",
    annualMaint:"200", residualValue:"0",
  });



  // ─── Persistent Storage (auto-save/load) ───
  const [storageStatus, setStorageStatus] = useState("");
  const [printMode, setPrintMode] = useState(false);
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState(null);
  const [docxPreviewBlob, setDocxPreviewBlob] = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [docxPreviewUrl, setDocxPreviewUrl] = useState(null);
  const docxPreviewRef = useRef(null);
  const [nzebReportHtml, setNzebReportHtml] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("default");

  // ─── Toast notification system (replaces alert/confirm blocked in sandbox) ───
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, type="info", duration=4000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    if (duration > 0) toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: UNDO/REDO SYSTEM
  // ═══════════════════════════════════════════════════════════
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const maxUndoLevels = 20;

  const pushUndo = useCallback(() => {
    const snapshot = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,useNA2023,finAnalysisInputs});
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      return next.length > maxUndoLevels ? next.slice(-maxUndoLevels) : next;
    });
    setRedoStack([]);
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,useNA2023,finAnalysisInputs]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor});
    setRedoStack(prev => [...prev, current]);
    const prev = JSON.parse(undoStack[undoStack.length - 1]);
    setUndoStack(s => s.slice(0, -1));
    if (prev.building) setBuilding(p => ({...INITIAL_BUILDING, ...prev.building}));
    if (prev.opaqueElements) setOpaqueElements(prev.opaqueElements);
    if (prev.glazingElements) setGlazingElements(prev.glazingElements);
    if (prev.thermalBridges) setThermalBridges(prev.thermalBridges);
    if (prev.heating) setHeating(p => ({...INITIAL_HEATING, ...prev.heating}));
    if (prev.acm) setAcm(p => ({...INITIAL_ACM, ...prev.acm}));
    if (prev.cooling) setCooling(p => ({...INITIAL_COOLING, ...prev.cooling}));
    if (prev.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...prev.ventilation}));
    if (prev.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...prev.lighting}));
    if (prev.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...prev.solarThermal}));
    if (prev.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...prev.photovoltaic}));
    if (prev.heatPump) setHeatPump(p => ({...INITIAL_HP, ...prev.heatPump}));
    if (prev.biomass) setBiomass(p => ({...INITIAL_BIO, ...prev.biomass}));
    if (prev.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...prev.otherRenew}));
    if (prev.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...prev.auditor}));
    showToast("Undo aplicat", "info", 1500);
  }, [undoStack, building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, showToast]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const current = JSON.stringify({building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor});
    setUndoStack(prev => [...prev, current]);
    const next = JSON.parse(redoStack[redoStack.length - 1]);
    setRedoStack(s => s.slice(0, -1));
    if (next.building) setBuilding(p => ({...INITIAL_BUILDING, ...next.building}));
    if (next.opaqueElements) setOpaqueElements(next.opaqueElements);
    if (next.glazingElements) setGlazingElements(next.glazingElements);
    if (next.thermalBridges) setThermalBridges(next.thermalBridges);
    if (next.heating) setHeating(p => ({...INITIAL_HEATING, ...next.heating}));
    if (next.acm) setAcm(p => ({...INITIAL_ACM, ...next.acm}));
    if (next.cooling) setCooling(p => ({...INITIAL_COOLING, ...next.cooling}));
    if (next.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...next.ventilation}));
    if (next.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...next.lighting}));
    if (next.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...next.solarThermal}));
    if (next.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...next.photovoltaic}));
    if (next.heatPump) setHeatPump(p => ({...INITIAL_HP, ...next.heatPump}));
    if (next.biomass) setBiomass(p => ({...INITIAL_BIO, ...next.biomass}));
    if (next.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...next.otherRenew}));
    if (next.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...next.auditor}));
    showToast("Redo aplicat", "info", 1500);
  }, [redoStack, building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, showToast]);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: AUTO DARK/LIGHT THEME DETECTION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => { if (!localStorage.getItem("ep-theme-manual")) setTheme(e.matches ? "light" : "dark"); };
    if (!localStorage.getItem("ep-theme-manual")) setTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleThemeManual = useCallback(() => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("ep-theme-manual", "1"); } catch(e) {}
      return next;
    });
  }, []);

  
  const saveToStorage = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      var data = JSON.stringify({building:building,opaqueElements:opaqueElements,glazingElements:glazingElements,thermalBridges:thermalBridges,heating:heating,acm:acm,cooling:cooling,ventilation:ventilation,lighting:lighting,solarThermal:solarThermal,photovoltaic:photovoltaic,heatPump:heatPump,biomass:biomass,otherRenew:otherRenew,auditor:auditor,step:step});
      await window.storage.set("energopro-project", data);
      setStorageStatus("Salvat " + new Date().toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"}));
    } catch(e) { /* storage unavailable */ }
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,step]);

  const loadFromStorage = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      var result = await window.storage.get("energopro-project");
      if (result && result.value) {
        var d = JSON.parse(result.value);
        if (d.building) setBuilding(function(p) { return Object.assign({}, p, d.building); });
        if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
        if (d.glazingElements) setGlazingElements(d.glazingElements);
        if (d.thermalBridges) setThermalBridges(d.thermalBridges);
        if (d.heating) setHeating(function(p) { return Object.assign({}, p, d.heating); });
        if (d.acm) setAcm(function(p) { return Object.assign({}, p, d.acm); });
        if (d.cooling) setCooling(function(p) { return Object.assign({}, p, d.cooling); });
        if (d.ventilation) setVentilation(function(p) { return Object.assign({}, p, d.ventilation); });
        if (d.lighting) setLighting(function(p) { return Object.assign({}, p, d.lighting); });
        if (d.solarThermal) setSolarThermal(function(p) { return Object.assign({}, INITIAL_SOLAR_TH, p, d.solarThermal); });
        if (d.photovoltaic) setPhotovoltaic(function(p) { return Object.assign({}, INITIAL_PV, p, d.photovoltaic); });
        if (d.heatPump) setHeatPump(function(p) { return Object.assign({}, INITIAL_HP, p, d.heatPump); });
        if (d.biomass) setBiomass(function(p) { return Object.assign({}, INITIAL_BIO, p, d.biomass); });
        if (d.otherRenew) setOtherRenew(function(p) { return Object.assign({}, INITIAL_OTHER, p, d.otherRenew); });
        if (d.auditor) setAuditor(function(p) { return Object.assign({}, INITIAL_AUDITOR, p, d.auditor); });
        if (d.step) setStep(d.step);
        setStorageStatus("Restaurat");
      }
    } catch(e) { /* no saved data or error */ }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // MULTI-PROJECT SYSTEM
  // ═══════════════════════════════════════════════════════════
  const getProjectData = useCallback(() => ({
    building, opaqueElements, glazingElements, thermalBridges,
    heating, acm, cooling, ventilation, lighting,
    solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, step
  }), [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor,step]);

  const loadProjectData = useCallback((d) => {
    if (d.building) setBuilding(p => ({...INITIAL_BUILDING, ...d.building}));
    if (d.opaqueElements) setOpaqueElements(d.opaqueElements);
    if (d.glazingElements) setGlazingElements(d.glazingElements);
    if (d.thermalBridges) setThermalBridges(d.thermalBridges);
    if (d.heating) setHeating(p => ({...INITIAL_HEATING, ...d.heating}));
    if (d.acm) setAcm(p => ({...INITIAL_ACM, ...d.acm}));
    if (d.cooling) setCooling(p => ({...INITIAL_COOLING, ...d.cooling}));
    if (d.ventilation) setVentilation(p => ({...INITIAL_VENTILATION, ...d.ventilation}));
    if (d.lighting) setLighting(p => ({...INITIAL_LIGHTING, ...d.lighting}));
    if (d.solarThermal) setSolarThermal(p => ({...INITIAL_SOLAR_TH, ...d.solarThermal}));
    if (d.photovoltaic) setPhotovoltaic(p => ({...INITIAL_PV, ...d.photovoltaic}));
    if (d.heatPump) setHeatPump(p => ({...INITIAL_HP, ...d.heatPump}));
    if (d.biomass) setBiomass(p => ({...INITIAL_BIO, ...d.biomass}));
    if (d.otherRenew) setOtherRenew(p => ({...INITIAL_OTHER, ...d.otherRenew}));
    if (d.auditor) setAuditor(p => ({...INITIAL_AUDITOR, ...d.auditor}));
    if (d.step) setStep(d.step);
  }, []);

  const refreshProjectList = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      const res = await window.storage.list("ep-proj:");
      if (res && res.keys) {
        const items = [];
        for (const key of res.keys.slice(0, 20)) {
          try {
            const r = await window.storage.get(key);
            if (r && r.value) {
              const d = JSON.parse(r.value);
              items.push({ key, id: key.replace("ep-proj:", ""), name: d.meta?.name || d.building?.address || "Proiect", date: d.meta?.date || "", category: d.building?.category || "" });
            }
          } catch(e) {}
        }
        setProjectList(items);
      }
    } catch(e) {}
  }, []);

  const saveProjectAs = useCallback(async (name) => {
    if (typeof window === "undefined" || !window.storage) return;
    const id = "p" + Date.now().toString(36);
    const data = getProjectData();
    const payload = { ...data, meta: { name: name || building.address || "Proiect", date: new Date().toISOString().slice(0,10), id } };
    try {
      await window.storage.set("ep-proj:" + id, JSON.stringify(payload));
      setActiveProjectId(id);
      await refreshProjectList();
      showToast("Proiect salvat: " + (name || building.address), "success");
    } catch(e) { showToast("Eroare salvare: " + e.message, "error"); }
  }, [getProjectData, building.address, refreshProjectList, showToast]);

  const saveCurrentProject = useCallback(async () => {
    if (typeof window === "undefined" || !window.storage) return;
    const data = getProjectData();
    const payload = { ...data, meta: { name: building.address || "Proiect", date: new Date().toISOString().slice(0,10), id: activeProjectId } };
    try {
      await window.storage.set("ep-proj:" + activeProjectId, JSON.stringify(payload));
      showToast("Salvat.", "success", 1500);
    } catch(e) {}
  }, [getProjectData, building.address, activeProjectId, showToast]);

  const loadProject = useCallback(async (id) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      // Save current first
      await saveCurrentProject();
      const r = await window.storage.get("ep-proj:" + id);
      if (r && r.value) {
        const d = JSON.parse(r.value);
        loadProjectData(d);
        setActiveProjectId(id);
        setShowProjectManager(false);
        showToast("Proiect încărcat: " + (d.meta?.name || d.building?.address || id), "success");
      }
    } catch(e) { showToast("Eroare: " + e.message, "error"); }
  }, [saveCurrentProject, loadProjectData, showToast]);

  const deleteProject = useCallback(async (id) => {
    if (typeof window === "undefined" || !window.storage) return;
    try {
      await window.storage.delete("ep-proj:" + id);
      await refreshProjectList();
      showToast("Proiect șters.", "info");
    } catch(e) {}
  }, [refreshProjectList, showToast]);

  // Load project list on mount
  useEffect(() => { refreshProjectList(); }, []);

  useEffect(function() { loadFromStorage(); }, []);

  // Auto-generate DOCX preview when entering Step 6
  const autoPreviewTriggered = useRef(false);
  useEffect(() => {
    if (step === 6 && !autoPreviewTriggered.current && !docxPreviewBlob) {
      autoPreviewTriggered.current = true;
      // Trigger click on the preview button after a short delay to let IIFE render
      setTimeout(() => {
        const btn = document.querySelector('[data-auto-preview]');
        if (btn) btn.click();
      }, 500);
    }
    if (step !== 6) autoPreviewTriggered.current = false;
  }, [step, docxPreviewBlob]);

  // Render DOCX preview when blob changes
  useEffect(() => {
    if (docxPreviewBlob && docxPreviewRef.current) {
      const container = docxPreviewRef.current;
      container.innerHTML = "";
      renderAsync(docxPreviewBlob, container, null, {
        className: "docx-preview-content",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        ignoreFonts: false,
        breakPages: false,
        ignoreLastRenderedPageBreak: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
      }).then(() => {
        try {
          // ── STEP 1: Fix floating shapes (before scale) ──
          var floats = container.querySelectorAll('[style*="position: absolute"], [style*="position:absolute"]');
          floats.forEach(function(el) {
            el.style.position = 'relative';
            el.style.left = '0';
            el.style.top = '0';
            el.style.display = 'inline-block';
            el.style.verticalAlign = 'middle';
          });

          // ── STEP 2: Style SVG text visible ──
          var allSvgs = container.querySelectorAll('svg');
          var scaleRowSvgs = [];
          var indicatorSvgs = [];
          allSvgs.forEach(function(svg) {
            var txt = svg.textContent.trim();
            var svgW = parseInt(svg.getAttribute('width') || '0');
            if (!txt && svgW < 10) return;
            var textEls = svg.querySelectorAll('text, tspan');
            textEls.forEach(function(t) {
              t.style.fontWeight = 'bold';
              var fill = t.getAttribute('fill') || '';
              if (!fill || fill === '#FFFFFF' || fill === 'white') t.setAttribute('fill', '#333333');
            });
            if (/^[A-G]\+?$/.test(txt) && svgW > 25) indicatorSvgs.push({svg: svg, text: txt});
            if (/[\u2264\u2026]|^\d/.test(txt)) scaleRowSvgs.push({svg: svg, text: txt});
          });

          // ── STEP 3: Style indicators with color ──
          var containerRect2 = container.getBoundingClientRect();
          var midX = containerRect2.x + containerRect2.width / 2;
          indicatorSvgs.forEach(function(item) {
            var svg = item.svg;
            var isEP = svg.getBoundingClientRect().x < midX;
            svg.style.backgroundColor = isEP ? '#00B050' : '#0070C0';
            svg.style.borderRadius = '4px';
            svg.style.padding = '3px 8px';
            svg.style.display = 'inline-block';
            var textEls = svg.querySelectorAll('text, tspan');
            textEls.forEach(function(t) {
              t.setAttribute('fill', '#FFFFFF');
              t.style.fontWeight = '900';
              t.style.fontSize = '16px';
            });
          });

          // ── STEP 4: Scale to fit ──
          var wrapper = container.querySelector('.docx-preview-content-wrapper') || container.firstElementChild;
          if (wrapper && wrapper.offsetWidth > 0) {
            var parentW = container.parentElement.clientWidth;
            var contentW = wrapper.scrollWidth;
            var contentH = wrapper.scrollHeight;
            var targetH = window.innerHeight * 0.78;
            var scaleW = parentW / contentW;
            var scaleH = targetH / contentH;
            var scale = Math.min(scaleW, scaleH, 1);
            container.style.transform = 'scale(' + scale + ')';
            container.style.transformOrigin = 'top left';
            container.style.width = (100 / scale) + '%';
            var finalH = contentH * scale;
            container.style.height = finalH + 'px';
            container.parentElement.style.height = (finalH + 8) + 'px';
            container.parentElement.style.overflow = 'hidden';
          }

          // ── STEP 5: Align indicators AFTER scaling (positions are now final) ──
          // Use a short delay to let the browser recalculate layout after transform
          setTimeout(function() {
            try {
              var cRect = container.getBoundingClientRect();
              var mx = cRect.x + cRect.width / 2;
              var epRows = scaleRowSvgs.filter(function(s){ return s.svg.getBoundingClientRect().x < mx; })
                .sort(function(a,b){ return a.svg.getBoundingClientRect().y - b.svg.getBoundingClientRect().y; });
              var co2Rows = scaleRowSvgs.filter(function(s){ return s.svg.getBoundingClientRect().x >= mx; })
                .sort(function(a,b){ return a.svg.getBoundingClientRect().y - b.svg.getBoundingClientRect().y; });
              var classMap = {'A+':0,'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7};

              indicatorSvgs.forEach(function(item) {
                var svg = item.svg;
                var isEP = svg.getBoundingClientRect().x < mx;
                var targetIdx = classMap[item.text] || 0;
                var rows = isEP ? epRows : co2Rows;
                if (rows[targetIdx]) {
                  var tR = rows[targetIdx].svg.getBoundingClientRect();
                  var cR = svg.getBoundingClientRect();
                  // Account for transform scale: offset in CSS pixels = offset in screen pixels / scale
                  var currentScale = container.getBoundingClientRect().width / container.offsetWidth || 1;
                  var offsetY = ((tR.y + tR.height/2) - (cR.y + cR.height/2)) / currentScale;
                  svg.style.position = 'relative';
                  svg.style.top = offsetY + 'px';
                }
              });
            } catch(e2) {}
          }, 50);
        } catch(e) { /* ignore CSS fix errors */ }
      }).catch(err => console.error("docx-preview error:", err));
    }
  }, [docxPreviewBlob]);
  
  useEffect(function() {
    var timer = setTimeout(function() { saveToStorage(); }, 2000);
    return function() { clearTimeout(timer); };
  }, [building,opaqueElements,glazingElements,thermalBridges,heating,acm,cooling,ventilation,lighting,solarThermal,photovoltaic,heatPump,biomass,otherRenew,auditor]);

  // ─── RESET ALL (Proiect Nou) ───
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [energyPrices, setEnergyPrices] = useState({gaz:0.32, electricitate:1.30, motorina:1.20, carbune:0.25, biomasa:0.22, termoficare:0.45});
  const resetProject = useCallback(() => {
    setStep(1);
    setBuilding({...INITIAL_BUILDING});
    setOpaqueElements([]);
    setGlazingElements([]);
    setThermalBridges([]);
    setEditingOpaque(null); setShowOpaqueModal(false);
    setEditingGlazing(null); setShowGlazingModal(false);
    setEditingBridge(null); setShowBridgeModal(false); setShowBridgeCatalog(false);
    setInstSubTab("heating");
    setHeating({...INITIAL_HEATING});
    setAcm({...INITIAL_ACM});
    setCooling({...INITIAL_COOLING});
    setVentilation({...INITIAL_VENTILATION});
    setLighting({...INITIAL_LIGHTING});
    setRenewSubTab("solar_th");
    setSolarThermal({...INITIAL_SOLAR_TH});
    setPhotovoltaic({...INITIAL_PV});
    setHeatPump({...INITIAL_HP});
    setBiomass({...INITIAL_BIO});
    setOtherRenew({...INITIAL_OTHER});
    setAuditor({...INITIAL_AUDITOR});
    setShowResetConfirm(false);
  }, []);

  const loadTypicalBuilding = useCallback((tplId) => {
    const tpl = TYPICAL_BUILDINGS.find(t => t.id === tplId);
    if (!tpl) return;
    setBuilding(prev => ({...prev, ...tpl.building}));
    setOpaqueElements(tpl.opaque || []);
    setGlazingElements(tpl.glazing || []);
    setThermalBridges((tpl.bridges || []).map(b => ({...b, type: "Predefinit"})));
  }, []);

  // ═══════════════════════════════════════════════════════════
  // EXEMPLU DEMO COMPLET — Casă individuală P+1+M, Constanța 2025, nZEB clasa A
  // Toate câmpurile completate, calcul integral funcțional pași 1-7
  // ═══════════════════════════════════════════════════════════
  const loadFullDemo = useCallback(() => {
    pushUndo();
    // PAS 1 — Casă individuală P+1+M nouă 2025, Constanța, zona climatică I
    setBuilding({
      address: "Str. Lahovari nr. 18",
      city: "Constanța", county: "Constanța", postalCode: "900650",
      category: "RI", structure: "Cadre beton armat",
      yearBuilt: "2025", yearRenov: "",
      floors: "P+1+M", basement: false, attic: true,
      units: "1", stairs: "1",
      areaUseful: "185", volume: "510", areaEnvelope: "520",
      heightBuilding: "9.20", heightFloor: "2.80",
      locality: "Constanța",
      perimeter: "48.0", n50: "0.8", shadingFactor: "0.90",
      gwpLifecycle: "", solarReady: true,
      scopCpe: "receptie", parkingSpaces: "2",
    });

    // PAS 2 — Anvelopă nZEB: 5 elemente opace cu izolație groasă
    setOpaqueElements([
      { name: "Pereți ext. GVP 25cm + vată bazaltică 20cm (ETICS)", type: "PE", orientation: "S", area: "95", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "Vată minerală bazaltică 20cm", material: "Vată minerală bazaltică", thickness: "200", lambda: 0.035, rho: 80 },
        { matName: "Cărămidă cu goluri (GVP)", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială interioară", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Pereți ext. Nord — GVP 25cm + vată 20cm", type: "PE", orientation: "N", area: "65", layers: [
        { matName: "Tencuială decorativă", material: "Tencuială decorativă", thickness: "5", lambda: 0.70, rho: 1600 },
        { matName: "Vată minerală bazaltică 20cm", material: "Vată minerală bazaltică", thickness: "200", lambda: 0.035, rho: 80 },
        { matName: "GVP", material: "Cărămidă cu goluri (GVP)", thickness: "250", lambda: 0.46, rho: 1200 },
        { matName: "Tencuială interioară", material: "Tencuială var-ciment", thickness: "15", lambda: 0.87, rho: 1800 },
      ]},
      { name: "Acoperiș mansardă — vată 30cm între căpriori", type: "PP", orientation: "Orizontal", area: "110", layers: [
        { matName: "Gips-carton", material: "Gips-carton", thickness: "12", lambda: 0.25, rho: 900 },
        { matName: "Barieră vapori", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
        { matName: "Vată minerală bazaltică 30cm", material: "Vată minerală bazaltică", thickness: "300", lambda: 0.035, rho: 80 },
        { matName: "OSB", material: "OSB", thickness: "18", lambda: 0.13, rho: 600 },
        { matName: "Folie difuzie", material: "Folie PE", thickness: "1", lambda: 0.40, rho: 980 },
      ]},
      { name: "Placă pe sol — XPS 20cm sub radier", type: "PL", orientation: "Orizontal", area: "95", layers: [
        { matName: "Gresie ceramică", material: "Gresie ceramică", thickness: "10", lambda: 1.30, rho: 2300 },
        { matName: "Șapă cu încălzire pardoseală", material: "Șapă ciment", thickness: "75", lambda: 1.40, rho: 2000 },
        { matName: "XPS 20cm", material: "Polistiren extrudat XPS", thickness: "200", lambda: 0.032, rho: 35 },
        { matName: "Radier beton armat", material: "Beton armat", thickness: "150", lambda: 1.74, rho: 2400 },
      ]},
      { name: "Planșeu intermediar beton (neîncălzit → încălzit)", type: "PI", orientation: "Orizontal", area: "95", layers: [
        { matName: "Parchet lemn", material: "Parchet lemn", thickness: "15", lambda: 0.18, rho: 600 },
        { matName: "Șapă ciment", material: "Șapă ciment", thickness: "50", lambda: 1.40, rho: 2000 },
        { matName: "Beton armat", material: "Beton armat", thickness: "180", lambda: 1.74, rho: 2400 },
      ]},
    ]);

    // 4 tipuri de ferestre pe orientări diferite
    setGlazingElements([
      { name: "Ferestre PVC tripan Low-E argon (Sud)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "22", orientation: "S", frameRatio: "22" },
      { name: "Ferestre PVC tripan Low-E (Nord)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "0.80", g: "0.45", area: "8", orientation: "N", frameRatio: "22" },
      { name: "Ferestre PVC tripan (Est+Vest)", glazingType: "Triplu vitraj", frameType: "PVC (5 camere)", u: "0.90", g: "0.50", area: "12", orientation: "E", frameRatio: "25" },
      { name: "Ușă terasă glisantă tripan (Sud)", glazingType: "Triplu vitraj Low-E", frameType: "PVC (6-7 camere)", u: "1.00", g: "0.40", area: "5.4", orientation: "S", frameRatio: "30" },
    ]);

    // 7 punți termice detaliate
    setThermalBridges([
      { name: "PE — Placă pe sol (izolat perimetral XPS)", type: "Joncțiuni pereți", psi: "0.08", length: "48" },
      { name: "PE — Acoperiș mansardă (izolat continuu)", type: "Acoperiș", psi: "0.06", length: "48" },
      { name: "PE — Planșeu intermediar", type: "Joncțiuni pereți", psi: "0.04", length: "48" },
      { name: "Glaf fereastră — montaj RAL în izolație", type: "Ferestre", psi: "0.02", length: "65" },
      { name: "Colț exterior ×8", type: "Joncțiuni pereți", psi: "0.05", length: "74" },
      { name: "Prag ușă terasă", type: "Ferestre", psi: "0.05", length: "6" },
      { name: "Colț interior ×4 (favorabil)", type: "Joncțiuni pereți", psi: "-0.03", length: "37" },
    ]);

    // PAS 3 — Instalații complete nZEB
    setHeating({
      source: "PC_SA", power: "12", eta_gen: "4.50",
      nominalPower: "12",
      emission: "PARD", eta_em: "0.97",
      distribution: "BINE_INT", eta_dist: "0.96",
      control: "INTELIG", eta_ctrl: "0.98",
      regime: "continuu", theta_int: "20", nightReduction: "2",
      tStaircase: "15", tBasement: "10", tAttic: "5",
    });

    setAcm({
      source: "PC_ACM", consumers: "4", dailyLiters: "50",
      storageVolume: "300", storageLoss: "1.0",
      pipeLength: "8", pipeInsulated: true,
      circRecirculation: false, circHours: "",
    });

    setCooling({
      system: "PC_REV", power: "12", eer: "5.50",
      cooledArea: "150", distribution: "BINE_INT",
      hasCooling: true,
    });

    setVentilation({
      type: "MEC_HR90", airflow: "250", fanPower: "80",
      operatingHours: "4000", hrEfficiency: "92",
    });

    setLighting({
      type: "LED", pDensity: "3.5", controlType: "PREZ_DAY",
      fCtrl: "0.55", operatingHours: "1600", naturalLightRatio: "35",
    });

    // PAS 4 — Regenerabile: PV 6kWp + solar termic 6m² + PC sol-apă
    setSolarThermal({
      ...INITIAL_SOLAR_TH, enabled: true,
      type: "TUB_VID", area: "6", orientation: "S", tilt: "40",
      eta0: "0.72", a1: "1.2",
    });

    setPhotovoltaic({
      ...INITIAL_PV, enabled: true,
      type: "MONO", area: "28", orientation: "S", tilt: "25",
      inverterType: "PREM", inverterEta: "0.97",
      peakPower: "5.88", usage: "autoconsum",
    });

    setHeatPump({
      ...INITIAL_HP, enabled: true,
      type: "sol-apa", cop: "4.50",
      scopHeating: "3.82", covers: "heating_acm",
    });

    setBiomass({ ...INITIAL_BIO, enabled: false });
    setOtherRenew({ ...INITIAL_OTHER, windEnabled: false, cogenEnabled: false });

    // PAS 6 — Auditor complet
    setAuditor({
      name: "ing. Marinescu Andrei-Gabriel",
      atestat: "CT-01256",
      grade: "I",
      company: "EnerGreen Consulting SRL",
      phone: "0745 678 901",
      email: "marinescu@energreen.ro",
      date: new Date().toISOString().slice(0, 10),
      mdlpaCode: "",
      observations: "Casă individuală nouă P+1+M, proiectată conform standardului nZEB (Legea 238/2024). Structură beton armat cu pereți GVP 25cm + vată bazaltică 20cm ETICS, acoperiș mansardă cu vată 30cm, placă pe sol cu XPS 20cm. Sursa termică: pompă de căldură sol-apă 12kW (SCOP 3.82) cu sondă geotermală 2×80m, pardoseală radiantă pe ambele niveluri. Ventilare mecanică centralizată cu recuperare η=92% (unitate Zehnder ComfoAir Q450). Producție PV: 28m² panouri monocristaline pe versant sud mansardă (5.88 kWp) + 6m² colectori solari tuburi vidate pentru ACM. Test etanșeitate n50=0.8 h⁻¹ (conform Passivhaus). Certificat de origine verde pentru 20% din consumul electric. Clădirea îndeplinește integral cerințele nZEB și se apropie de ZEB (EPBD 2024/1275).",
      photo: "",
    });

    setStep(1);
    showToast("Demo complet încărcat — Casă nouă nZEB Constanța cu PC sol-apă + PV 6kWp + solar termic. Navigați prin toți pașii 1-7.", "success", 5000);
  }, [pushUndo, showToast]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: EXPORT / IMPORT PROIECT (JSON)
  // ═══════════════════════════════════════════════════════════
  const exportProject = useCallback(() => {
    const data = {
      version: "2.0", exportDate: new Date().toISOString(),
      normativeRef: "Mc 001-2022 + SR EN ISO 52000-1/NA:2023",
      building, opaqueElements, glazingElements, thermalBridges,
      heating, acm, cooling, ventilation, lighting,
      solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor,
      useNA2023, finAnalysisInputs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CertEn_${building.address || "proiect"}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, acm, cooling, ventilation, lighting, solarThermal, photovoltaic, heatPump, biomass, otherRenew, auditor, useNA2023, finAnalysisInputs]);

  const exportCSV = useCallback(() => {
    const rows = [];
    // Header
    rows.push("Tip,Denumire,Tip element,Orientare,Suprafata m2,U W/m2K,g factor,Lambda W/mK,Grosime mm,Psi W/mK,Lungime m");
    // Opaque elements
    opaqueElements.forEach(function(el) {
      const uCalc = el.layers && el.layers.length > 0 ? (function() {
        const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
        const rsi = elType ? elType.rsi : 0.13;
        const rse = elType ? elType.rse : 0.04;
        const rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
        return 1/(rsi+rL+rse);
      })() : 0;
      rows.push(["Opac", el.name||"", el.type||"", el.orientation||"", el.area||"", uCalc.toFixed(3), "", "", "", "", ""].join(","));
      if (el.layers) {
        el.layers.forEach(function(l) {
          rows.push(["  Strat", l.matName||"", "", "", "", "", "", l.lambda||"", l.thickness||"", "", ""].join(","));
        });
      }
    });
    // Glazing elements
    glazingElements.forEach(function(el) {
      rows.push(["Vitraj", el.name||"", el.glazingType||"", el.orientation||"", el.area||"", el.u||"", el.g||"", "", "", "", ""].join(","));
    });
    // Thermal bridges
    thermalBridges.forEach(function(b) {
      rows.push(["Punte", b.name||"", b.type||"", "", "", "", "", "", "", b.psi||"", b.length||""].join(","));
    });
    // Summary row
    rows.push("");
    rows.push("Parametru,Valoare");
    rows.push("Categorie," + (building.category||""));
    rows.push("Localitate," + (building.locality||""));
    rows.push("Au m2," + (building.areaUseful||""));
    rows.push("Volum m3," + (building.volume||""));
    rows.push("An constructie," + (building.yearBuilt||""));
    rows.push("Sursa incalzire," + (heating.source||""));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CertEn_" + (building.address||"proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + "_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportat cu succes.", "success");
  }, [building, opaqueElements, glazingElements, thermalBridges, heating, showToast]);

  const importProject = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Schema validation: must be an object with at least one known key
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          showToast("Format invalid: fișierul nu conține un obiect proiect valid.", "error"); return;
        }
        const knownKeys = ["building","opaqueElements","glazingElements","thermalBridges","heating","acm","cooling","ventilation","lighting","solarThermal","photovoltaic","heatPump","biomass","otherRenew","auditor"];
        const hasAnyKnown = knownKeys.some(k => data[k] !== undefined);
        if (!hasAnyKnown) {
          showToast("Format invalid: nu conține date de proiect recunoscute.", "error"); return;
        }
        // Validate arrays are actually arrays
        if (data.opaqueElements && !Array.isArray(data.opaqueElements)) { showToast("Eroare: opaqueElements nu este un array valid.", "error"); return; }
        if (data.glazingElements && !Array.isArray(data.glazingElements)) { showToast("Eroare: glazingElements nu este un array valid.", "error"); return; }
        if (data.thermalBridges && !Array.isArray(data.thermalBridges)) { showToast("Eroare: thermalBridges nu este un array valid.", "error"); return; }
        // Validate building is object
        if (data.building && (typeof data.building !== "object" || Array.isArray(data.building))) { showToast("Eroare: building nu este un obiect valid.", "error"); return; }
        // All checks pass — apply data
        if (data.building) setBuilding(prev => ({...INITIAL_BUILDING, ...data.building}));
        if (data.opaqueElements) setOpaqueElements(data.opaqueElements);
        if (data.glazingElements) setGlazingElements(data.glazingElements);
        if (data.thermalBridges) setThermalBridges(data.thermalBridges);
        if (data.heating) setHeating(prev => ({...INITIAL_HEATING, ...data.heating}));
        if (data.acm) setAcm(prev => ({...INITIAL_ACM, ...data.acm}));
        if (data.cooling) setCooling(prev => ({...INITIAL_COOLING, ...data.cooling}));
        if (data.ventilation) setVentilation(prev => ({...INITIAL_VENTILATION, ...data.ventilation}));
        if (data.lighting) setLighting(prev => ({...INITIAL_LIGHTING, ...data.lighting}));
        if (data.solarThermal) setSolarThermal(prev => ({...INITIAL_SOLAR_TH, ...data.solarThermal}));
        if (data.photovoltaic) setPhotovoltaic(prev => ({...INITIAL_PV, ...data.photovoltaic}));
        if (data.heatPump) setHeatPump(prev => ({...INITIAL_HP, ...data.heatPump}));
        if (data.biomass) setBiomass(prev => ({...INITIAL_BIO, ...data.biomass}));
        if (data.otherRenew) setOtherRenew(prev => ({...INITIAL_OTHER, ...data.otherRenew}));
        if (data.auditor) setAuditor(prev => ({...INITIAL_AUDITOR, ...data.auditor}));
        if (data.useNA2023 !== undefined) setUseNA2023(data.useNA2023);
        if (data.finAnalysisInputs) setFinAnalysisInputs(prev => ({...prev, ...data.finAnalysisInputs}));
        setStep(1);
        showToast("Proiect importat cu succes.", "success");
      } catch (err) {
        showToast("Eroare la import: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }, []);

  const importFileRef = useRef(null);


  // ─── CSV Import for envelope elements ───
  const csvImportRef = useRef(null);
  const importCSV = useCallback((file) => {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var lines = e.target.result.split("\n").filter(function(l){return l.trim();});
        if (lines.length < 2) { showToast("CSV invalid — lipsesc date", "error"); return; }
        var headers = lines[0].split(",").map(function(h){return h.trim().toLowerCase();});
        var nameIdx = headers.indexOf("denumire") >= 0 ? headers.indexOf("denumire") : headers.indexOf("name") >= 0 ? headers.indexOf("name") : 0;
        var typeIdx = headers.indexOf("tip") >= 0 ? headers.indexOf("tip") : headers.indexOf("type") >= 0 ? headers.indexOf("type") : 1;
        var areaIdx = headers.indexOf("suprafata") >= 0 ? headers.indexOf("suprafata") : headers.indexOf("area") >= 0 ? headers.indexOf("area") : 2;
        var uIdx = headers.indexOf("u") >= 0 ? headers.indexOf("u") : 3;
        var gIdx = headers.indexOf("g") >= 0 ? headers.indexOf("g") : -1;
        var orientIdx = headers.indexOf("orientare") >= 0 ? headers.indexOf("orientare") : headers.indexOf("orientation") >= 0 ? headers.indexOf("orientation") : -1;
        var catIdx = headers.indexOf("categorie") >= 0 ? headers.indexOf("categorie") : headers.indexOf("category") >= 0 ? headers.indexOf("category") : -1;
        var imported = [];
        for (var i = 1; i < lines.length; i++) {
          var cols = lines[i].split(",").map(function(c){return c.trim();});
          if (cols.length < 3) continue;
          var typeVal = cols[typeIdx] || "";
          var catVal = catIdx >= 0 ? (cols[catIdx]||"").toLowerCase() : "";
          var uVal = parseFloat(cols[uIdx]) || 0;
          var gVal = gIdx >= 0 ? parseFloat(cols[gIdx]) : -1;
          // Explicit type detection: check category column, type column, or g-value presence
          var isGlazing = catVal === "vitraj" || catVal === "glazing" || catVal === "fereastra" || catVal === "window"
            || typeVal.toLowerCase() === "vitraj" || typeVal.toLowerCase() === "glazing"
            || gVal >= 0
            || (uVal > 0 && uVal < 6 && !ELEMENT_TYPES.find(function(et){return et.id === typeVal.toUpperCase();}));
          if (isGlazing) {
            // Looks like a glazing element
            imported.push({type:"glazing", name:cols[nameIdx]||"Import CSV", area:cols[areaIdx]||"0", u:uVal.toFixed(2), g:"0.50", orientation:cols[orientIdx]||"S", frameRatio:"25"});
          } else {
            // Opaque element
            imported.push({type:"opaque", name:cols[nameIdx]||"Import CSV", elType:cols[typeIdx]||"PE", area:cols[areaIdx]||"0", orientation:cols[orientIdx]||"S",
              layers:[{material:"Import CSV",thickness:"300",lambda:0.50,rho:1500,matName:"Material importat"}]});
          }
        }
        var opaqueImports = imported.filter(function(el){return el.type==="opaque";}).map(function(el){return {name:el.name,type:el.elType,area:el.area,orientation:el.orientation,layers:el.layers};});
        var glazingImports = imported.filter(function(el){return el.type==="glazing";}).map(function(el){return {name:el.name,area:el.area,u:el.u,g:el.g,orientation:el.orientation,frameRatio:el.frameRatio};});
        if (opaqueImports.length) setOpaqueElements(function(prev){return prev.concat(opaqueImports);});
        if (glazingImports.length) setGlazingElements(function(prev){return prev.concat(glazingImports);});
        showToast("Importat " + opaqueImports.length + " elemente opace, " + glazingImports.length + " vitraje", "success");
      } catch(err) { showToast("Eroare CSV: " + err.message, "error"); }
    };
    reader.readAsText(file);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS (placed after exportProject/undo/redo declarations)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); exportProject(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "7") { e.preventDefault(); setStep(parseInt(e.key)); }
      if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); setStep(s => Math.max(1, s - 1)); }
      if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); setStep(s => Math.min(7, s + 1)); }
      if (e.key === "Escape") { setPdfPreviewHtml(null); setNzebReportHtml(null); setShowProjectManager(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, exportProject]);


  // ─── Drag-and-drop file import ───
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = useCallback(function(e) {
    e.preventDefault();
    setDragOver(false);
    var files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    var file = files[0];
    if (file.name.endsWith(".json")) {
      importProject(file);
    } else if (file.name.endsWith(".csv")) {
      importCSV(file);
    } else {
      showToast("Format nesuportat. Acceptă: .json sau .csv", "error");
    }
  }, [importProject, importCSV]);

  // ─── Climate auto-selection ───
  const selectedClimate = useMemo(() =>
    CLIMATE_DB.find(c => c.name === building.locality) || null
  , [building.locality]);

  const updateBuilding = useCallback((key, val) => {
    setBuilding(prev => ({...prev, [key]: val}));
  }, []);


  // ─── Auto-estimate geometry from Au + floors + height ───
  const estimateGeometry = useCallback(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const hFloor = parseFloat(building.heightFloor) || 2.80;
    const floorsStr = String(building.floors).replace(/[^0-9]/g, "");
    const nFloors = Math.max(1, parseInt(floorsStr) || 1);
    if (Au <= 0) return;
    const areaPerFloor = Au / nFloors;
    const ratio = 1.4;
    const w = Math.sqrt(areaPerFloor / ratio);
    const l = areaPerFloor / w;
    const perim = 2 * (w + l);
    const vol = Au * hFloor;
    const hBldg = nFloors * hFloor;
    const wallArea = perim * hBldg;
    const aEnv = wallArea + 2 * areaPerFloor;
    // Always overwrite — this is explicitly user-triggered auto-estimation
    updateBuilding("volume", vol.toFixed(1));
    updateBuilding("areaEnvelope", aEnv.toFixed(1));
    updateBuilding("perimeter", perim.toFixed(1));
    updateBuilding("heightBuilding", hBldg.toFixed(1));
  }, [building.areaUseful, building.floors, building.heightFloor, updateBuilding]);

  // ─── Computed: A/V ratio ───
  const avRatio = useMemo(() => {
    const a = parseFloat(building.areaEnvelope);
    const v = parseFloat(building.volume);
    if (a > 0 && v > 0) return (a / v).toFixed(3);
    return "—";
  }, [building.areaEnvelope, building.volume]);

  // ─── Opaque element calculations ───
  const calcOpaqueR = useCallback((layers, elementType) => {
    const elType = ELEMENT_TYPES.find(t => t.id === elementType);
    if (!elType || !layers.length) return { r_layers:0, r_total:0, u:0 };
    const r_layers = layers.reduce((sum, l) => {
      const d = parseFloat(l.thickness) / 1000; // mm to m
      return sum + (d > 0 && l.lambda > 0 ? d / l.lambda : 0);
    }, 0);
    const r_total = elType.rsi + r_layers + elType.rse;
    const u_base = r_total > 0 ? 1 / r_total : 0;
    // #3 ΔU'' correction per ISO 6946 §6.9.2 — fasteners, air gaps
    // Simplified: ETICS anchors ~0.04, sandwich connectors ~0.08, other ~0.02
    const hasInsulation = layers.some(l => l.lambda > 0 && l.lambda <= 0.06);
    const deltaU = hasInsulation ? 0.04 : 0.02;
    const u = u_base + deltaU;
    return { r_layers, r_total, u, u_base, deltaU };
  }, []);

  // ─── Total envelope summary ───
  const envelopeSummary = useMemo(() => {
    const volume = parseFloat(building.volume) || 0;
    if (!volume) return null;
    let totalHeatLoss = 0;
    let totalArea = 0;

    opaqueElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const { u } = calcOpaqueR(el.layers, el.type);
      const elType = ELEMENT_TYPES.find(t => t.id === el.type);
      // #7 Multi-zonă: τ dinamic pe baza temperaturilor zonelor adiacente
      const tIntEnv = parseFloat(heating.theta_int) || 20;
      const tExtEnv = selectedClimate?.theta_e ?? -15;
      let tau = elType ? elType.tau : 1;
      if (tIntEnv !== tExtEnv) {
        if (el.type === "PB" || el.type === "PS") { tau = (tIntEnv - (parseFloat(heating.tBasement)||10)) / (tIntEnv - tExtEnv); }
        else if (el.type === "PP") { tau = (tIntEnv - (parseFloat(heating.tAttic)||5)) / (tIntEnv - tExtEnv); }
        else if (el.type === "PR") { tau = (tIntEnv - (parseFloat(heating.tStaircase)||15)) / (tIntEnv - tExtEnv); }
      }
      tau = Math.max(0, Math.min(1, tau));
      var uEff = u;
      // #4 ISO 13370 — ground floor types
      if (el.type === "PL") {
        // Slab-on-ground: U_bf = 2λ/(π·B'+d_t) · ln(π·B'/d_t + 1)
        var perim = parseFloat(building.perimeter)||0;
        var lambda_g = 1.5; // ground thermal conductivity W/(m·K)
        var d_t = 0.5 + parseFloat(el.layers?.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0) || 0); // d_t = w + Σ(d_i/λ_i)·λ_ground
        if (perim > 0 && area > 0) {
          var Bp = area/(0.5*perim);
          if (Bp < d_t) { uEff = lambda_g / (0.457*Bp + d_t); }
          else { uEff = 2*lambda_g/(Math.PI*Bp + d_t) * Math.log(Math.PI*Bp/d_t + 1); }
        }
      } else if (el.type === "PB") {
        // Floor over unheated basement — ISO 13370 §9.4
        // U_bf = 1/(1/U_floor + 1/U_basement_walls × h_basement/perimeter_basement)
        var Uf = u; // floor U-value
        var Ubw = 1.5; // basement wall U estimate
        var hBasement = 2.5; // basement height estimate
        uEff = Uf * 0.7; // simplified: ~30% reduction from unheated buffer
      }
      totalHeatLoss += tau * area * uEff;
      totalArea += area;
    });

    glazingElements.forEach(el => {
      const area = parseFloat(el.area) || 0;
      const u = parseFloat(el.u) || 0;
      totalHeatLoss += 1.0 * area * u; // tau=1 for windows
      totalArea += area;
    });

    // Punți termice
    let bridgeLoss = 0;
    thermalBridges.forEach(b => {
      bridgeLoss += (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0);
    });
    totalHeatLoss += bridgeLoss;

    // #6 Ventilare — folosim n50 dacă e disponibil, altfel n=0.5 h-1
    const n50 = parseFloat(building.n50) || 4.0;
    const e_shield = 0.07; // factor protecție la vânt (clădire semiprotejată)
    const n_inf = n50 * e_shield; // rata infiltrare din n50
    const n = Math.max(0.5, n_inf); // minim 0.5 h-1 (ventilare igienică)
    const ventType = VENTILATION_TYPES.find(v => v.id === ventilation.type);
    const hrEta = ventType?.hasHR ? (parseFloat(ventilation.hrEfficiency) || ventType.hrEta * 100) / 100 : 0;
    const ventLoss = 0.34 * n * volume * (1 - hrEta);
    const totalLossWithVent = totalHeatLoss + ventLoss;

    const G = volume > 0 ? totalLossWithVent / volume : 0;

    return { totalHeatLoss, totalArea, bridgeLoss, ventLoss, G, volume, hrEta };
  }, [opaqueElements, glazingElements, thermalBridges, building.volume, building.perimeter, building.n50, calcOpaqueR, ventilation.type, ventilation.hrEfficiency, heating.theta_int, heating.tBasement, heating.tAttic, heating.tStaircase, selectedClimate]);

  // ─── Auto-update heating efficiencies when source/emission/distribution/control changes ───
  useEffect(() => {
    setHeating(p => {
      const updates = {};
      const src = HEAT_SOURCES.find(s => s.id === p.source);
      if (src) updates.eta_gen = src.eta_gen.toString();
      const em = EMISSION_SYSTEMS.find(s => s.id === p.emission);
      if (em) updates.eta_em = em.eta_em.toString();
      const d = DISTRIBUTION_QUALITY.find(s => s.id === p.distribution);
      if (d) updates.eta_dist = d.eta_dist.toString();
      const c = CONTROL_TYPES.find(s => s.id === p.control);
      if (c) updates.eta_ctrl = c.eta_ctrl.toString();
      return Object.keys(updates).length > 0 ? {...p, ...updates} : p;
    });
  }, [heating.source, heating.emission, heating.distribution, heating.control]);

  // ─── Auto-update lighting ───
  useEffect(() => {
    setLighting(p => {
      const updates = {};
      const lt = LIGHTING_TYPES.find(t => t.id === p.type);
      if (lt) updates.pDensity = lt.pDensity.toString();
      const lc = LIGHTING_CONTROL.find(c => c.id === p.controlType);
      if (lc) updates.fCtrl = lc.fCtrl.toString();
      return Object.keys(updates).length > 0 ? {...p, ...updates} : p;
    });
  }, [lighting.type, lighting.controlType]);

  // ─── Auto-set default ACM liters and lighting hours by building category ───
  useEffect(() => {
    setAcm(p => ({...p, dailyLiters: (ACM_CONSUMPTION[building.category] || 60).toString()}));
    setLighting(p => ({...p, operatingHours: (LIGHTING_HOURS[building.category] || 2000).toString()}));
  }, [building.category]);


  const monthlyISO = useMemo(() => {
    if (!envelopeSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const vt = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const hr = vt && vt.hasHR ? (parseFloat(ventilation.hrEfficiency) || vt.hrEta || 0) : 0;
    return calcMonthlyISO13790({G_env:envelopeSummary.totalHeatLoss, V:V, Au:Au, climate:selectedClimate,
      theta_int:parseFloat(heating.theta_int)||20, glazingElements:glazingElements, shadingFactor:building.shadingFactor,
      hrEta:hr, category:building.category, n50:building.n50});
  }, [envelopeSummary, selectedClimate, building, heating.theta_int, glazingElements, ventilation]);

  // ─── Installation summary calculations ───
  const instSummary = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !envelopeSummary) return null;

    // HEATING
    const src = HEAT_SOURCES.find(s => s.id === heating.source);
    const fuel = FUELS.find(f => f.id === (src?.fuel || "gaz"));
    const eta_gen = parseFloat(heating.eta_gen) || 0.85;
    const eta_em = parseFloat(heating.eta_em) || 0.93;
    const eta_dist = parseFloat(heating.eta_dist) || 0.95;
    const eta_ctrl = parseFloat(heating.eta_ctrl) || 0.93;
    const isCOP = src?.isCOP || false;
    const eta_total_h = isCOP ? eta_em * eta_dist * eta_ctrl : eta_gen * eta_em * eta_dist * eta_ctrl;

    const ngz = selectedClimate?.ngz || 3170;
    let qH_nd, qC_nd_calc;
    if (monthlyISO) { qH_nd = monthlyISO.reduce((s,m) => s+m.qH_nd,0); qC_nd_calc = monthlyISO.reduce((s,m) => s+m.qC_nd,0); }
    else { const gm = {RI:7,RC:7,RA:7,BI:15,ED:12,SA:10,HC:8,CO:15,SP:10,AL:10}; qH_nd = Math.max(0,(24*envelopeSummary.G*V*0.9*ngz/1000)-(gm[building.category]||7)*Au); qC_nd_calc = 0; }
    const qH_nd_m2 = Au > 0 ? qH_nd / Au : 0;

    // Energie finală încălzire
    let qf_h;
    if (isCOP) {
      qf_h = qH_nd / (eta_em * eta_dist * eta_ctrl * eta_gen); // COP in loc de eta_gen
    } else {
      qf_h = eta_total_h > 0 ? qH_nd / eta_total_h : 0;
    }

    // ACM
    const nConsumers = parseFloat(acm.consumers) || (Au > 0 ? Math.max(1, Math.round(Au / 30)) : 2);
    const dailyL = parseFloat(acm.dailyLiters) || 60;
    const qACM_nd = nConsumers * dailyL * WATER_TEMP_MONTH.reduce((s,tw,i) => s+[31,28,31,30,31,30,31,31,30,31,30,31][i]*4.186*(55-tw)/3600, 0);
    const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
    let eta_acm = acmSrc?.eta || eta_gen;
    if (acm.source === "CAZAN_H") eta_acm = eta_gen;
    const solarFr = acmSrc?.solarFraction || 0;
    const storageLoss = Math.min(10, Math.max(0, parseFloat(acm.storageLoss) || 2)) / 100; // V3: clamp 0-10%
    const qf_w = eta_acm > 0 ? (qACM_nd * (1 - solarFr) * (1 + storageLoss)) / (acmSrc?.isCOP ? eta_acm : eta_acm) : 0;
    const acmFuel = acm.source === "CAZAN_H" ? fuel : FUELS.find(f => f.id === (acmSrc?.fuel || "electricitate"));

    // COOLING
    const hasCool = cooling.hasCooling && cooling.system !== "NONE";
    const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
    const coolArea = parseFloat(cooling.cooledArea) || Au;
    const qC_nd = hasCool ? (qC_nd_calc > 0 ? qC_nd_calc*(coolArea/Au) : coolArea*25) : 0;
    const eer = parseFloat(cooling.eer) || coolSys?.eer || 3.5;
    const qf_c = hasCool && eer > 0 ? qC_nd / eer : 0;
    const coolFuel = coolSys ? FUELS.find(f => f.id === coolSys.fuel) : null;

    // VENTILATION
    const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
    const airflow = parseFloat(ventilation.airflow) || (V * 0.5);
    const sfp = ventType?.sfp || 0;
    const ventHours = parseFloat(ventilation.operatingHours) || (selectedClimate?.season || 190) * 16;
    const qf_v = (sfp * (airflow / 3600) * ventHours) / 1000; // kWh/an — airflow m³/h → m³/s for SFP [W/(m³/s)]
    const hrEta = ventType?.hasHR ? (parseFloat(ventilation.hrEfficiency) || ventType.hrEta || 0) : 0;

    // LIGHTING (LENI) — improved per EN 15193-1
    const pDens = parseFloat(lighting.pDensity) || 4.5;
    const fCtrl = parseFloat(lighting.fCtrl) || 1.0;
    const lightHours = parseFloat(lighting.operatingHours) || 1800;
    const natRatio = (parseFloat(lighting.naturalLightRatio) || 30) / 100;
    // EN 15193-1: LENI = W/1000 * {tD*FO*FD + tN*FO}
    // FO = occupancy factor (~0.8 for offices, ~0.9 for residential, ~1.0 for hospitals)
    const foMap = {RI:0.90, RC:0.90, RA:0.90, BI:0.80, ED:0.75, SA:1.00, HC:0.95, CO:0.85, SP:0.70, AL:0.85};
    const fo = foMap[building.category] || 0.85;
    // Split hours: daytime ~65%, nighttime ~35% (varies by category)
    const nightFracMap = {RI:0.30, RC:0.30, RA:0.30, BI:0.10, ED:0.05, SA:0.45, HC:0.40, CO:0.20, SP:0.15, AL:0.25};
    const nightFrac = nightFracMap[building.category] || 0.25;
    const tD = lightHours * (1 - nightFrac); // daytime hours
    const tN = lightHours * nightFrac; // nighttime hours
    const fD = Math.max(0, 1 - natRatio * 0.65); // daylight dependency factor (natural light reduces daytime need)
    const leni = pDens * fCtrl * (tD * fo * fD + tN * fo) / 1000; // kWh/(m2·an)
    const qf_l = leni * Au;

    // TOTAL ENERGIE FINALĂ
    const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l;
    const qf_total_m2 = Au > 0 ? qf_total / Au : 0;

    // ENERGIE PRIMARĂ
    // B1 FIX: la pompe de căldură, energia ambientală (qH_nd - qf_h) nu se contorizează cu fP_electricitate
    // ci cu fP_ambient (1.0 per NA:2023, 0 per Mc 001 vechi)
    let ep_h;
    if (isCOP) {
      const fP_elec = fuel?.fP_tot || 2.50;
      const qAmbient_h = Math.max(0, qH_nd - qf_h);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_h = qf_h * fP_elec + qAmbient_h * fP_ambient;
    } else {
      ep_h = qf_h * (fuel?.fP_tot || 1.17);
    }
    const acmIsCOP = ACM_SOURCES.find(a => a.id === acm.source)?.isCOP || false;
    let ep_w;
    if (acmIsCOP) {
      const fP_elec = acmFuel?.fP_tot || 2.50;
      const qAmbient_w = Math.max(0, qACM_nd - qf_w);
      const fP_ambient = useNA2023 ? 1.0 : 0;
      ep_w = qf_w * fP_elec + qAmbient_w * fP_ambient;
    } else {
      ep_w = qf_w * (acmFuel?.fP_tot || fuel?.fP_tot || 1.17);
    }
    const ep_c = qf_c * (coolFuel?.fP_tot || 2.50);
    const ep_v = qf_v * 2.50; // ventilare = electricitate
    const ep_l = qf_l * 2.50; // iluminat = electricitate
    const ep_total = ep_h + ep_w + ep_c + ep_v + ep_l;
    const ep_total_m2 = Au > 0 ? ep_total / Au : 0;

    // CO2
    const co2_h = qf_h * (fuel?.fCO2 || 0.20);
    const co2_w = qf_w * (acmFuel?.fCO2 || fuel?.fCO2 || 0.20);
    const co2_c = qf_c * (coolFuel?.fCO2 || 0.107);
    const co2_v = qf_v * 0.107;
    const co2_l = qf_l * 0.107;
    const co2_total = co2_h + co2_w + co2_c + co2_v + co2_l;
    const co2_total_m2 = Au > 0 ? co2_total / Au : 0;

    return {
      qH_nd, qH_nd_m2, eta_total_h, qf_h,
      qACM_nd, qf_w, nConsumers,
      qC_nd, qf_c, hasCool,
      qf_v, hrEta,
      leni, qf_l,
      qf_total, qf_total_m2,
      ep_h, ep_w, ep_c, ep_v, ep_l, ep_total, ep_total_m2,
      co2_h, co2_w, co2_c, co2_v, co2_l, co2_total, co2_total_m2,
      fuel, isCOP,
    };
  }, [building.areaUseful, building.volume, building.category, envelopeSummary, selectedClimate,
      heating, acm, cooling, ventilation, lighting, monthlyISO, useNA2023]);

  // ─── Auto-update solar thermal params ───
  useEffect(() => {
    const st = SOLAR_THERMAL_TYPES.find(t => t.id === solarThermal.type);
    if (st) setSolarThermal(p => ({...p, eta0: st.eta0.toString(), a1: st.a1.toString()}));
  }, [solarThermal.type]);

  // ─── Auto-update PV params ───
  useEffect(() => {
    const pv = PV_TYPES.find(t => t.id === photovoltaic.type);
    if (pv && photovoltaic.area) {
      const kWp = (parseFloat(photovoltaic.area) || 0) * pv.eta;
      setPhotovoltaic(p => ({...p, peakPower: kWp.toFixed(2)}));
    }
  }, [photovoltaic.type, photovoltaic.area]);

  useEffect(() => {
    const inv = PV_INVERTER_ETA.find(t => t.id === photovoltaic.inverterType);
    if (inv) setPhotovoltaic(p => ({...p, inverterEta: inv.eta.toString()}));
  }, [photovoltaic.inverterType]);

  // ─── Renewable energy summary ───
  const renewSummary = useMemo(() => {
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au || !selectedClimate || !instSummary) return null;

    // SOLAR THERMAL
    let qSolarTh = 0;
    if (solarThermal.enabled) {
      const area = parseFloat(solarThermal.area) || 0;
      const eta0 = parseFloat(solarThermal.eta0) || 0.75;
      const oriF = ORIENT_FACTORS[solarThermal.orientation] || 1;
      const tiltF = TILT_FACTORS[solarThermal.tilt] || 1;
      const solarIrrad = selectedClimate.solar[solarThermal.orientation] || selectedClimate.solar.S;
      // B5 FIX: Producție anuală cu coeficient pierderi a1 (EN 12975)
      // eta_seasonal = eta0 - a1 * ΔT / G_solar, unde ΔT ≈ 40K (temperatura medie operare - mediu)
      const a1 = parseFloat(solarThermal.a1) || 3.5;
      const deltaT = 40; // K — diferență medie între temperatura fluidului și exterior
      const gRef = solarIrrad > 0 ? solarIrrad / (365 * 8) : 400; // W/m² iradianță medie pe ore de soare
      const etaSeasonal = Math.max(0.1, eta0 - a1 * deltaT / (gRef > 0 ? gRef * 1000 : 400));
      qSolarTh = area * etaSeasonal * solarIrrad * oriF * tiltF * 0.85;
    }

    // FOTOVOLTAIC
    let qPV = 0;
    let qPV_kWh = 0;
    if (photovoltaic.enabled) {
      const area = parseFloat(photovoltaic.area) || 0;
      const pvType = PV_TYPES.find(t => t.id === photovoltaic.type);
      const etaPV = pvType?.eta || 0.20;
      const etaInv = parseFloat(photovoltaic.inverterEta) || 0.95;
      const oriF = ORIENT_FACTORS[photovoltaic.orientation] || 1;
      const tiltF = TILT_FACTORS[photovoltaic.tilt] || 1;
      const solarH = selectedClimate.solar.Oriz || 360;
      // PR = performance ratio ~0.80
      qPV_kWh = area * etaPV * etaInv * solarH * oriF * tiltF * 0.80;
      qPV = qPV_kWh * 2.50; // conversie energie primară (electricitate)
    }

    // POMPĂ DE CĂLDURĂ (partea regenerabilă = 1 - 1/COP)
    let qPC_ren = 0;
    if (heatPump.enabled) {
      const cop = parseFloat(heatPump.cop) || 3.5;
      const scop = parseFloat(heatPump.scopHeating) || cop * 0.85;
      const renFraction = Math.max(0, 1 - 1/scop); // fracțiunea din energie ambientală
      let qCovered = 0;
      if (heatPump.covers === "heating") qCovered = instSummary.qH_nd;
      else if (heatPump.covers === "acm") qCovered = instSummary.qACM_nd;
      else if (heatPump.covers === "heating_acm") qCovered = instSummary.qH_nd + instSummary.qACM_nd;
      qPC_ren = qCovered * renFraction;
    }

    // BIOMASĂ (parte regenerabilă = 80% din energia produsă, fP_ren=0.80)
    let qBio_ren = 0;
    let qBio_total = 0;
    if (biomass.enabled) {
      const bioType = BIOMASS_TYPES.find(t => t.id === biomass.type);
      const eta = parseFloat(biomass.boilerEta) || 0.85;
      if (biomass.annualConsumption) {
        qBio_total = (parseFloat(biomass.annualConsumption) || 0) * (bioType?.pci || 17.5) * eta / 3.6;
      } else {
        qBio_total = biomass.covers === "heating" ? instSummary.qH_nd :
                     biomass.covers === "acm" ? instSummary.qACM_nd :
                     instSummary.qH_nd + instSummary.qACM_nd;
      }
      qBio_ren = qBio_total * (bioType?.fP_ren || 0.80);
    }

    // EOLIAN
    let qWind = 0;
    if (otherRenew.windEnabled) {
      qWind = (parseFloat(otherRenew.windProduction) || 0); // kWh/an introdus direct
    }

    // COGENERARE (parte regenerabilă = proporțional cu eficiența)
    // Energia electrică CHP reduce consumul din rețea (fP=2.50), termică reduce combustibil (fP per fuel)
    let qCogen_el = 0;
    let qCogen_th = 0;
    let qCogen_ep_reduction = 0;
    let qCogen_co2_reduction = 0;
    if (otherRenew.cogenEnabled) {
      qCogen_el = parseFloat(otherRenew.cogenElectric) || 0;
      qCogen_th = parseFloat(otherRenew.cogenThermal) || 0;
      const cogenFuelData = FUELS.find(f => f.id === (otherRenew.cogenFuel || "gaz"));
      // CHP electric replaces grid electricity; thermal replaces boiler heat
      qCogen_ep_reduction = qCogen_el * 2.50 + qCogen_th * (cogenFuelData?.fP_tot || 1.17);
      qCogen_co2_reduction = qCogen_el * 0.107 + qCogen_th * (cogenFuelData?.fCO2 || 0.205);
    }

    const totalRenewable = qSolarTh + qPV_kWh + qPC_ren + qBio_ren + qWind + qCogen_el + qCogen_th;
    const totalRenewable_m2 = Au > 0 ? totalRenewable / Au : 0;

    // RER = Renewable Energy Ratio (toate valorile în energie primară pentru consistență)
    const fP_elec = 2.50, fP_therm = 1.17;
    const totalRenewable_ep = qSolarTh * fP_therm + qPV_kWh * fP_elec + qPC_ren * fP_elec + qBio_ren * 1.08 + qWind * fP_elec + qCogen_el * fP_elec + qCogen_th * fP_therm;
    const epTotal = instSummary.ep_total || 1;
    const rer = epTotal > 0 ? (totalRenewable_ep / epTotal) * 100 : 0;
    // L.238/2024: RER decomposition — min 10% on-site + min 20% guarantees of origin
    const totalOnSite_ep = qSolarTh * fP_therm + qPV_kWh * fP_elec + qPC_ren * fP_elec + qBio_ren * 1.08 + qWind * fP_elec;
    const rerOnSite = epTotal > 0 ? (totalOnSite_ep / epTotal) * 100 : 0;
    const rerOnSiteOk = rerOnSite >= 10;
    const rerTotalOk = rer >= 30;

    // Energie primară ajustată (reducere din regenerabile)
    // Ambient energy factor depends on useNA2023 toggle
    // NA:2023 (Tabel A.16): fP=0 pentru energia ambientală a PC
    // Mc001 original (Tabel 5.17): fP=1.0 pentru energia ambientală
    const ambientFP = useNA2023 ? 0 : 1.0;
    const ep_reduction = qSolarTh * 1.0 + qPV_kWh * 2.50 + qPC_ren * ambientFP + qBio_ren * 1.0 + qWind * 2.50 + qCogen_ep_reduction;
    const ep_adjusted = Math.max(0, instSummary.ep_total - ep_reduction);
    const ep_adjusted_m2 = Au > 0 ? ep_adjusted / Au : 0;

    // CO2 reduction
    // Ambient energy CO2=0 regardless of toggle
    const acmFuelId = acm.source === "CAZAN_H" ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz") : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
    const solarThCO2Factor = (FUELS.find(f => f.id === acmFuelId) || FUELS[0]).fCO2;
    const co2_reduction = qSolarTh * solarThCO2Factor + qPV_kWh * 0.107 + qPC_ren * 0 + qWind * 0.107 + qCogen_co2_reduction;
    const co2_adjusted = Math.max(0, instSummary.co2_total - co2_reduction);
    const co2_adjusted_m2 = Au > 0 ? co2_adjusted / Au : 0;

    return {
      qSolarTh, qPV_kWh, qPC_ren, qBio_ren, qBio_total, qWind, qCogen_el, qCogen_th,
      totalRenewable, totalRenewable_m2, rer, rerOnSite, rerOnSiteOk, rerTotalOk,
      ep_reduction, ep_adjusted, ep_adjusted_m2,
      co2_reduction, co2_adjusted, co2_adjusted_m2,
    };
  }, [building.areaUseful, selectedClimate, instSummary,
      solarThermal, photovoltaic, heatPump, biomass, otherRenew, useNA2023]);

  // ═══════════════════════════════════════════════════════════
  // NICE-TO-HAVE: BENCHMARK DATA
  // ═══════════════════════════════════════════════════════════
  const BENCHMARKS = {
    RI:{label:"Casă individuală",avgEp:180,avgCO2:28,bestEp:65,worstEp:450,stock:"~2.8M",avgYear:1975,nzebPct:3},
    RC:{label:"Bloc locuințe",avgEp:220,avgCO2:35,bestEp:55,worstEp:500,stock:"~50.000",avgYear:1978,nzebPct:1},
    RA:{label:"Apartament",avgEp:200,avgCO2:32,bestEp:50,worstEp:480,stock:"~4M",avgYear:1980,nzebPct:2},
    BI:{label:"Birouri",avgEp:250,avgCO2:30,bestEp:80,worstEp:550,stock:"~15.000",avgYear:1990,nzebPct:5},
    ED:{label:"Educație",avgEp:200,avgCO2:25,bestEp:70,worstEp:400,stock:"~8.000",avgYear:1970,nzebPct:2},
    SA:{label:"Sănătate",avgEp:300,avgCO2:40,bestEp:100,worstEp:600,stock:"~1.500",avgYear:1975,nzebPct:1},
    HC:{label:"Hotel/Cazare",avgEp:270,avgCO2:35,bestEp:90,worstEp:550,stock:"~3.000",avgYear:1985,nzebPct:3},
    CO:{label:"Comercial",avgEp:260,avgCO2:32,bestEp:85,worstEp:520,stock:"~12.000",avgYear:1995,nzebPct:4},
    SP:{label:"Sport",avgEp:230,avgCO2:28,bestEp:75,worstEp:480,stock:"~2.000",avgYear:1980,nzebPct:2},
    AL:{label:"Altele",avgEp:240,avgCO2:30,bestEp:80,worstEp:500,stock:"~5.000",avgYear:1985,nzebPct:3},
  };

  const avValidation = useMemo(() => {
    const Au = parseFloat(building.areaUseful)||0, V = parseFloat(building.volume)||0, Aenv = parseFloat(building.areaEnvelope)||0;
    if (!Au || !V || !Aenv) return null;
    const av = Aenv / V;
    const ranges = {RI:{min:0.6,max:1.4,label:"casă"},RC:{min:0.2,max:0.5,label:"bloc"},RA:{min:0.15,max:0.45,label:"apartament"},BI:{min:0.2,max:0.5,label:"birouri"}};
    const range = ranges[building.category] || {min:0.15,max:1.2,label:"clădire"};
    const status = av < range.min*0.7 ? "low" : av > range.max*1.3 ? "high" : "ok";
    return {av, range, status, msg: status==="low" ? `A/V=${av.toFixed(2)} — neobișnuit de mic pentru ${range.label}` : status==="high" ? `A/V=${av.toFixed(2)} — neobișnuit de mare pentru ${range.label}` : null};
  }, [building.areaUseful, building.volume, building.areaEnvelope, building.category]);

  const acmMonthlyProfile = useMemo(() => {
    if (!instSummary || !selectedClimate) return null;
    const Au = parseFloat(building.areaUseful)||0;
    if (!Au) return null;
    const qACM = instSummary.qf_w||0, tHot = 55;
    const days = [31,28,31,30,31,30,31,31,30,31,30,31];
    const totalDD = WATER_TEMP_MONTH.reduce((s,tw,i) => s+(tHot-tw)*days[i], 0);
    return ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"].map((name,i) => {
      const tw = WATER_TEMP_MONTH[i];
      const frac = totalDD > 0 ? ((tHot-tw)*days[i])/totalDD : 1/12;
      return {name, tw, qf: qACM*frac, frac};
    });
  }, [instSummary, selectedClimate, building.areaUseful]);

  // ─── Data completion progress ───
  const dataProgress = useMemo(() => {
    var score = 0, total = 10;
    if (building.locality) score++;
    if (parseFloat(building.areaUseful) > 0) score++;
    if (parseFloat(building.volume) > 0) score++;
    if (building.category) score++;
    if (opaqueElements.length > 0) score++;
    if (glazingElements.length > 0) score++;
    if (heating.source) score++;
    if (instSummary) score++;
    if (renewSummary) score++;
    if (auditor.name) score++;
    return Math.round(score / total * 100);
  }, [building, opaqueElements, glazingElements, heating, instSummary, renewSummary, auditor]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: DEFALCARE CONSUM PE LUNI (profil climatice lunar)
  // ═══════════════════════════════════════════════════════════
  const monthlyBreakdown = useMemo(() => {
    if (!instSummary || !selectedClimate || !envelopeSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
    const tInt = parseFloat(heating.theta_int) || 20;
    const gains_m2 = { RI:7, RC:7, RA:7, BI:15, ED:12, SA:10, HC:8, CO:15, SP:10, AL:10 }[building.category] || 7;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const etaH = instSummary.eta_total_h || 0.80;
    const fuel = instSummary.fuel;
    const fP = fuel?.fP_tot || 1.17;
    // C5 FIX: use monthlyISO data when available instead of simplified recalculation
    return months.map((name, i) => {
      const tExt = selectedClimate.temp_month[i];
      const deltaT = Math.max(0, tInt - tExt);
      let qf_h, qf_c;
      if (monthlyISO && monthlyISO[i]) {
        qf_h = etaH > 0 ? monthlyISO[i].qH_nd / etaH : 0;
        qf_c = instSummary.hasCool && monthlyISO[i].qC_nd > 0 ? monthlyISO[i].qC_nd / (parseFloat(cooling.eer) || 3.5) : 0;
      } else {
        const qH_month = deltaT > 3 ? Math.max(0, (24 * envelopeSummary.G * V * deltaT * daysInMonth[i] / 1000) - (gains_m2 * Au * daysInMonth[i] / 365)) : 0;
        qf_h = etaH > 0 ? qH_month / etaH : 0;
        qf_c = tExt > 22 && instSummary.hasCool ? (instSummary.qf_c || 0) * (tExt - 22) / 15 : 0;
      }
      const qf_w = (instSummary.qf_w || 0) / 12;
      const qf_v = (instSummary.qf_v || 0) * daysInMonth[i] / 365;
      const qf_l = (instSummary.qf_l || 0) * daysInMonth[i] / 365;
      const qf_total = qf_h + qf_w + qf_c + qf_v + qf_l;
      const acmFuel = acm.source === "CAZAN_H" ? (HEAT_SOURCES.find(h => h.id === heating.source)?.fuel || "gaz") : (ACM_SOURCES.find(a => a.id === acm.source)?.fuel || "gaz");
      const fP_acm = (FUELS.find(f => f.id === acmFuel) || FUELS[0]).fP_tot;
      const ep = qf_h * fP + qf_w * fP_acm + qf_c * 2.50 + qf_v * 2.50 + qf_l * 2.50;
      return { name, tExt, deltaT, qf_h, qf_w, qf_c, qf_v, qf_l, qf_total, ep, daysInMonth: daysInMonth[i] };
    });
  }, [instSummary, selectedClimate, envelopeSummary, building.areaUseful, building.volume, building.category, heating.theta_int, monthlyISO, cooling.eer]);

  // ═══════════════════════════════════════════════════════════
  // FEATURE: COMPARAȚIE SCENARII (actual vs reabilitat)
  // ═══════════════════════════════════════════════════════════
  const [showScenarioCompare, setShowScenarioCompare] = useState(false);
  // #10 Comparare proiecte — import referință pentru comparație
  const [compareRef, setCompareRef] = useState(null);
  const importCompareRef = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.building && data.building.areaUseful) {
          setCompareRef({
            name: data.building.address || file.name,
            category: data.building.category,
            Au: parseFloat(data.building.areaUseful) || 0,
            ep: data.instSummary?.ep_total_m2 || data.renewSummary?.ep_adjusted_m2 || 0,
            co2: data.instSummary?.co2_total_m2 || data.renewSummary?.co2_adjusted_m2 || 0,
            rer: data.renewSummary?.rer || 0,
            G: data.envelopeSummary?.G || 0,
            qf_total: data.instSummary?.qf_total || 0,
          });
          showToast("Proiect referință importat pentru comparație", "success");
        } else {
          showToast("Fișierul nu conține date valide", "error");
        }
      } catch(err) { showToast("Eroare parsare JSON: " + err.message, "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  // ─── Multi-scenario presets ───
  const SCENARIO_PRESETS = [
    { id:"MINIM", label:"Minim (obligatoriu)", addInsulWall:true, insulWallThickness:"5", addInsulRoof:true, insulRoofThickness:"8", addInsulBasement:false, insulBasementThickness:"0", replaceWindows:false, newWindowU:"1.40", addHR:false, hrEfficiency:"0", addPV:false, pvArea:"0", addHP:false, hpCOP:"3.5", addSolarTh:false, solarThArea:"0" },
    { id:"MEDIU", label:"Mediu (recomandat)", addInsulWall:true, insulWallThickness:"10", addInsulRoof:true, insulRoofThickness:"15", addInsulBasement:true, insulBasementThickness:"8", replaceWindows:true, newWindowU:"0.90", addHR:true, hrEfficiency:"80", addPV:true, pvArea:"20", addHP:false, hpCOP:"4.0", addSolarTh:true, solarThArea:"6" },
    { id:"MAXIM", label:"Maxim (nZEB)", addInsulWall:true, insulWallThickness:"15", addInsulRoof:true, insulRoofThickness:"25", addInsulBasement:true, insulBasementThickness:"12", replaceWindows:true, newWindowU:"0.70", addHR:true, hrEfficiency:"90", addPV:true, pvArea:"40", addHP:true, hpCOP:"4.5", addSolarTh:true, solarThArea:"10" },
  ];
  const [activeScenario, setActiveScenario] = useState("MEDIU");
  const loadScenarioPreset = useCallback((presetId) => {
    var p = SCENARIO_PRESETS.find(function(s){ return s.id === presetId; });
    if (!p) return;
    setActiveScenario(presetId);
    setRehabScenarioInputs({
      addInsulWall:p.addInsulWall, insulWallThickness:p.insulWallThickness,
      addInsulRoof:p.addInsulRoof, insulRoofThickness:p.insulRoofThickness,
      addInsulBasement:p.addInsulBasement, insulBasementThickness:p.insulBasementThickness,
      replaceWindows:p.replaceWindows, newWindowU:p.newWindowU,
      addHR:p.addHR, hrEfficiency:p.hrEfficiency,
      addPV:p.addPV, pvArea:p.pvArea,
      addHP:p.addHP, hpCOP:p.hpCOP,
      addSolarTh:p.addSolarTh, solarThArea:p.solarThArea,
    });
  }, []);

  const [rehabScenarioInputs, setRehabScenarioInputs] = useState({
    addInsulWall: true, insulWallThickness: "5",
    addInsulRoof: true, insulRoofThickness: "10",
    addInsulBasement: true, insulBasementThickness: "8",
    replaceWindows: false, newWindowU: "0.90",
    addHR: true, hrEfficiency: "80",
    addPV: true, pvArea: "20",
    addHP: false, hpCOP: "4.0",
    addSolarTh: true, solarThArea: "6",
  });

  const rehabComparison = useMemo(() => {
    if (!instSummary || !envelopeSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;
    if (!Au || !V) return null;
    const ri = rehabScenarioInputs;
    const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
    const ngz = selectedClimate?.ngz || 3170;
    let newHT = envelopeSummary.totalHeatLoss;
    if (ri.addInsulWall) {
      const addR = (parseFloat(ri.insulWallThickness) / 100) / 0.039;
      opaqueElements.forEach(el => {
        if (el.type === "PE") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.addInsulRoof) {
      const addR = (parseFloat(ri.insulRoofThickness) / 100) / 0.040;
      opaqueElements.forEach(el => {
        if (el.type === "PP" || el.type === "PT") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.addInsulBasement) {
      const addR = (parseFloat(ri.insulBasementThickness) / 100) / 0.034;
      opaqueElements.forEach(el => {
        if (el.type === "PB" || el.type === "PL") {
          const area = parseFloat(el.area) || 0;
          const { u } = calcOpaqueR(el.layers, el.type);
          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
          const tau = elType ? elType.tau : 1;
          newHT -= (tau * area * u - tau * area * (1 / (1/u + addR)));
        }
      });
    }
    if (ri.replaceWindows) {
      const newU = parseFloat(ri.newWindowU) || 0.90;
      glazingElements.forEach(el => { newHT -= (parseFloat(el.area)||0) * ((parseFloat(el.u)||1.5) - newU); });
    }
    let newVentLoss = envelopeSummary.ventLoss;
    if (ri.addHR) { newVentLoss = envelopeSummary.ventLoss * (1 - (parseFloat(ri.hrEfficiency)||80)/100); }
    const newG = V > 0 ? (newHT + newVentLoss) / V : 0;
    const gains = { RI:7, RC:7, RA:7, BI:15, ED:12, SA:10, HC:8, CO:15, SP:10, AL:10 }[building.category] || 7;
    const newQH = Math.max(0, (24 * newG * V * 0.9 * ngz / 1000) - gains * Au);
    let newQfH, newFuelFpH, newFuelCO2H;
    if (ri.addHP) {
      const cop = parseFloat(ri.hpCOP) || 4.0;
      newQfH = newQH / cop; newFuelFpH = 2.50; newFuelCO2H = 0.107;
    } else {
      const etaH = instSummary.eta_total_h || 0.80;
      newQfH = etaH > 0 ? newQH / etaH : 0;
      newFuelFpH = instSummary.fuel?.fP_tot || 1.17; newFuelCO2H = instSummary.fuel?.fCO2 || 0.20;
    }
    const newQfW = instSummary.qf_w, newQfC = instSummary.qf_c;
    // B2 FIX: HR reduce pierderile de ventilare; fan energy se adaugă doar dacă era ventilare naturală
    const hasExistingMech = ventilation.type && ventilation.type !== "NAT";
    const newQfV = ri.addHR
      ? (hasExistingMech ? instSummary.qf_v * 0.85 : Au * 1.5 / 1000 * (selectedClimate?.season || 190) * 16 / 3600)
      : instSummary.qf_v;
    const newQfL = instSummary.qf_l;
    const newQfTotal = newQfH + newQfW + newQfC + newQfV + newQfL;
    const acmFp = ri.addHP ? 2.50 : (instSummary.fuel?.fP_tot || 1.17);
    const newEp = newQfH * newFuelFpH + newQfW * acmFp + newQfC * 2.50 + newQfV * 2.50 + newQfL * 2.50;
    let renewEp = 0;
    if (ri.addPV) { renewEp += (parseFloat(ri.pvArea)||0) * 0.21 * 0.97 * (selectedClimate?.solar?.Oriz||330) * 0.80 * 2.50; }
    if (ri.addSolarTh) { renewEp += (parseFloat(ri.solarThArea)||0) * 0.75 * (selectedClimate?.solar?.S||390) * 0.85; }
    const newEpM2 = Au > 0 ? Math.max(0, newEp - renewEp) / Au : 0;
    const newClass = getEnergyClass(newEpM2, catKey);
    const newCO2M2 = Au > 0 ? (newQfH * newFuelCO2H + newQfW * (ri.addHP?0.107:(instSummary.fuel?.fCO2||0.20)) + (newQfC+newQfV+newQfL)*0.107) / Au : 0;
    const epOrig = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
    const co2Orig = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
    return {
      original: { ep: epOrig, co2: co2Orig, cls: getEnergyClass(epOrig, catKey), qfTotal: instSummary.qf_total },
      rehab: { ep: newEpM2, co2: newCO2M2, cls: newClass, qfTotal: newQfTotal },
      savings: { epPct: epOrig>0?((epOrig-newEpM2)/epOrig*100):0, co2Pct: co2Orig>0?((co2Orig-newCO2M2)/co2Orig*100):0, qfSaved: instSummary.qf_total - newQfTotal },
    };
  }, [instSummary, envelopeSummary, building, cooling, selectedClimate, rehabScenarioInputs, opaqueElements, glazingElements, renewSummary, calcOpaqueR]);

  // ═══════════════════════════════════════════════════════════════
  // CALCUL CONDENS GLASER — per element opac selectat
  // TODO-GLASER-UI: Adaugă diagramă Glaser vizuală (profil temp + presiune vapori) în Step 2 sau Step 5
  // ═══════════════════════════════════════════════════════════════
  const [glaserElementIdx, setGlaserElementIdx] = useState(0);
  const glaserResult = useMemo(() => {
    if (!selectedClimate || !opaqueElements.length) return null;
    const el = opaqueElements[glaserElementIdx] || opaqueElements[0];
    if (!el || !el.layers || !el.layers.length) return null;
    return calcGlaserMonthly(el.layers, selectedClimate, parseFloat(heating.theta_int) || 20, 50);
  }, [opaqueElements, glaserElementIdx, selectedClimate, heating.theta_int]);

  // ═══════════════════════════════════════════════════════════════
  // VERIFICARE ZEB (EPBD 2024/1275) — pregătire transpunere
  // TODO-ZEB-UI: Adaugă secțiune vizuală verificare ZEB în Step 5/6 cu indicator verde/roșu
  // ═══════════════════════════════════════════════════════════════
  const zebVerification = useMemo(() => {
    if (!instSummary || !renewSummary) return null;
    const cat = building.category;
    const zeb = ZEB_THRESHOLDS[cat];
    const nzeb = NZEB_THRESHOLDS[cat];
    if (!zeb || !nzeb) return null;
    const epActual = renewSummary.ep_adjusted_m2;
    const rerActual = renewSummary.rer;
    const src = HEAT_SOURCES.find(s => s.id === heating.source);
    const isFossil = src && !src.isCOP && ["gaz","motorina","carbune","gpl"].includes(src.fuel);
    return {
      nzeb: {
        epOk: epActual <= nzeb.ep_max,
        rerOk: rerActual >= nzeb.rer_min,
        rerOnsiteOk: renewSummary.rerOnSite >= nzeb.rer_onsite_min,
        compliant: epActual <= nzeb.ep_max && rerActual >= nzeb.rer_min,
        ep_max: nzeb.ep_max,
      },
      zeb: {
        epOk: epActual <= zeb.ep_max,
        rerOk: rerActual >= zeb.rer_min,
        noFossil: !isFossil,
        compliant: epActual <= zeb.ep_max && rerActual >= zeb.rer_min && !isFossil,
        ep_max: zeb.ep_max,
        deadline: ["BI","ED","SA"].includes(cat) ? "01.01.2028 (clădiri publice)" : "01.01.2030",
      },
      epActual: Math.round(epActual * 10) / 10,
      rerActual: Math.round(rerActual * 10) / 10,
    };
  }, [instSummary, renewSummary, building.category, heating.source]);

  // ═══════════════════════════════════════════════════════════════
  // ANALIZĂ FINANCIARĂ REABILITARE — calcul NPV/IRR/Payback
  // TODO-FIN-UI: Adaugă tab dedicat în Step 7 cu grafice cashflow, tabel indicatori, analiză sensibilitate
  // ═══════════════════════════════════════════════════════════════
  const financialAnalysis = useMemo(() => {
    if (!rehabComparison || !instSummary) return null;
    const Au = parseFloat(building.areaUseful) || 0;
    if (!Au) return null;
    const ri = rehabScenarioInputs;

    // Estimare cost investiție
    let totalInvest = 0;
    if (ri.addInsulWall) {
      const wallArea = opaqueElements.filter(e => e.type === "PE").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulWall[ri.insulWallThickness] || REHAB_COSTS.insulWall[10] || 42;
      totalInvest += wallArea * unitCost;
    }
    if (ri.addInsulRoof) {
      const roofArea = opaqueElements.filter(e => e.type === "PP" || e.type === "PT").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulRoof[ri.insulRoofThickness] || REHAB_COSTS.insulRoof[10] || 32;
      totalInvest += roofArea * unitCost;
    }
    if (ri.addInsulBasement) {
      const baseArea = opaqueElements.filter(e => e.type === "PB" || e.type === "PL").reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.insulBasement[ri.insulBasementThickness] || REHAB_COSTS.insulBasement[8] || 45;
      totalInvest += baseArea * unitCost;
    }
    if (ri.replaceWindows) {
      const winArea = glazingElements.reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
      const unitCost = REHAB_COSTS.windows[ri.newWindowU] || REHAB_COSTS.windows[0.90] || 280;
      totalInvest += winArea * unitCost;
    }
    if (ri.addHR) {
      const hrEff = parseFloat(ri.hrEfficiency) || 80;
      totalInvest += hrEff >= 90 ? REHAB_COSTS.hr90 : hrEff >= 80 ? REHAB_COSTS.hr80 : REHAB_COSTS.hr70;
    }
    if (ri.addPV) totalInvest += (parseFloat(ri.pvArea) || 0) * REHAB_COSTS.pvPerM2;
    if (ri.addHP) totalInvest += Math.max(5, Au / 25) * REHAB_COSTS.hpPerKw;
    if (ri.addSolarTh) totalInvest += (parseFloat(ri.solarThArea) || 0) * REHAB_COSTS.solarThPerM2;

    // Economie anuală energie [EUR]
    const savedKwh = rehabComparison.savings.qfSaved;
    const fuel = instSummary.fuel;
    const priceLeiKwh = fuel?.price_lei_kwh || 0.31;
    const annualSavingEur = (savedKwh * priceLeiKwh) / 5.0; // ~5 lei/EUR

    return calcFinancialAnalysis({
      investCost: Math.round(totalInvest),
      annualSaving: Math.round(annualSavingEur),
      annualMaint: parseFloat(finAnalysisInputs.annualMaint) || 200,
      discountRate: parseFloat(finAnalysisInputs.discountRate) || 5,
      escalation: parseFloat(finAnalysisInputs.escalation) || 3,
      period: parseInt(finAnalysisInputs.period) || 30,
      residualValue: parseFloat(finAnalysisInputs.residualValue) || 0,
    });
  }, [rehabComparison, instSummary, building.areaUseful, rehabScenarioInputs, opaqueElements, glazingElements, finAnalysisInputs]);

  // ═══════════════════════════════════════════════════════════════
  // ESTIMARE COST ANUAL ENERGIE (cu prețuri 2025)
  // TODO-COST-UI: Afișare card cost anual în Step 5 cu defalcare pe utilități și grafic pie
  // ═══════════════════════════════════════════════════════════════
  const annualEnergyCost = useMemo(() => {
    if (!instSummary) return null;
    const fuel = instSummary.fuel;
    const priceFuel = fuel?.price_lei_kwh || 0.31;
    const priceElec = FUELS.find(f => f.id === "electricitate")?.price_lei_kwh || 1.10;
    const costH = instSummary.qf_h * priceFuel;
    const costW = instSummary.qf_w * (instSummary.isCOP ? priceElec : priceFuel);
    const costC = instSummary.qf_c * priceElec;
    const costV = instSummary.qf_v * priceElec;
    const costL = instSummary.qf_l * priceElec;
    const total = costH + costW + costC + costV + costL;
    return {
      costH: Math.round(costH), costW: Math.round(costW),
      costC: Math.round(costC), costV: Math.round(costV),
      costL: Math.round(costL), total: Math.round(total),
      totalEur: Math.round(total / 5.0),
      priceFuel, priceElec,
      note: "Prețuri 2025: gaz plafonat 0.31 lei/kWh, elec. ~1.10 lei/kWh",
    };
  }, [instSummary]);

  // ═══════════════════════════════════════════════════════════════
  // OPAQUE ELEMENT MODAL
  // ═══════════════════════════════════════════════════════════════

  function OpaqueModal({ element, onSave, onClose }) {
    const [el, setEl] = useState(element || {
      name:"Element nou", type:"PE", orientation:"S", area:"",
      layers:[{ material:"", thickness:"", lambda:0, rho:0, matName:"" }]
    });
    const [matSearch, setMatSearch] = useState("");
    const [activeLayerIdx, setActiveLayerIdx] = useState(null);

    const filteredMats = matSearch.length > 1
      ? MATERIALS_DB.filter(m => m.name.toLowerCase().includes(matSearch.toLowerCase()) || m.cat.toLowerCase().includes(matSearch.toLowerCase()))
      : [];

    const addLayer = () => setEl(prev => ({...prev, layers:[...prev.layers, {material:"",thickness:"",lambda:0,rho:0,matName:""}]}));
    const removeLayer = idx => setEl(prev => ({...prev, layers:prev.layers.filter((_,i)=>i!==idx)}));
    const updateLayer = (idx, key, val) => setEl(prev => {
      const layers = [...prev.layers];
      layers[idx] = {...layers[idx], [key]:val};
      return {...prev, layers};
    });

    const selectMaterial = (idx, mat) => {
      updateLayer(idx, "material", mat.name);
      updateLayer(idx, "lambda", mat.lambda);
      updateLayer(idx, "rho", mat.rho);
      updateLayer(idx, "matName", mat.name);
      setActiveLayerIdx(null);
      setMatSearch("");
    };

    const { r_layers, r_total, u } = calcOpaqueR(el.layers, el.type);
    const elType = ELEMENT_TYPES.find(t => t.id === el.type);
    const uRef = getURefNZEB(building.category, el.type);
    const uStatus = uRef ? (u <= uRef ? "ok" : u <= uRef * 1.3 ? "warn" : "fail") : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Element opac</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Input label={t("Denumire",lang)} value={el.name} onChange={v => setEl(p=>({...p,name:v}))} className="col-span-2" />
            <Select label={t("Tip element",lang)} value={el.type} onChange={v => setEl(p=>({...p,type:v}))}
              options={ELEMENT_TYPES.map(t=>({value:t.id,label:t.label}))} />
            <Select label={t("Orientare",lang)} value={el.orientation} onChange={v => setEl(p=>({...p,orientation:v}))}
              options={ORIENTATIONS} />
            <Input label={t("Suprafață",lang)} value={el.area} onChange={v => setEl(p=>({...p,area:v}))} type="number" unit="m²" min="0" step="0.1" />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">Straturi constructive (int → ext)</span>
<div className="flex gap-2"><button onClick={addLayer} className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30 transition-colors">+ Strat</button><select onChange={function(e){var sol=CONSTRUCTION_SOLUTIONS.find(function(s){return s.id===e.target.value});if(sol){setEl(function(p){return Object.assign({},p,{name:sol.name,type:sol.type,layers:sol.layers.map(function(l){return Object.assign({},l)})})});e.target.value="";}}} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-amber-400"><option value="">Soluții tip...</option>{CONSTRUCTION_SOLUTIONS.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>})}</select></div>
            </div>

            {el.layers.map((layer, idx) => (
              <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5 mr-1">{idx > 0 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx-1];ls[idx-1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▲</button>}{idx < el.layers.length-1 && <button onClick={function(){setEl(function(p){var ls=[].concat(p.layers);var tmp=ls[idx];ls[idx]=ls[idx+1];ls[idx+1]=tmp;return Object.assign({},p,{layers:ls})});}} className="text-[8px] opacity-30 hover:opacity-70 leading-none">▼</button>}</div><span className="text-xs opacity-30 w-5">{idx+1}.</span>
                  <div className="flex-1 relative">
                    <input value={layer.matName || ""} placeholder="Caută material..."
                      onChange={e => { updateLayer(idx, "matName", e.target.value); setMatSearch(e.target.value); setActiveLayerIdx(idx); }}
                      onFocus={() => setActiveLayerIdx(idx)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500/50" />
                    {activeLayerIdx === idx && filteredMats.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#1e1e38] border border-white/10 rounded-lg max-h-48 overflow-y-auto shadow-2xl">
                        {filteredMats.map((m, mi) => (
                          <button key={mi} onClick={() => selectMaterial(idx, m)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex justify-between items-center border-b border-white/5 last:border-0">
                            <span><span className="opacity-40">{m.cat} ›</span> {m.name}</span>
                            <span className="opacity-40">λ={m.lambda}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" value={layer.thickness} placeholder="mm"
                    onChange={e => updateLayer(idx, "thickness", e.target.value)}
                    className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50" min="0" step="1" />
                  <span className="text-xs opacity-30">mm</span>
                  <input type="number" value={layer.lambda} placeholder="λ"
                    onChange={e => updateLayer(idx, "lambda", parseFloat(e.target.value) || 0)}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500/50" min="0" step="0.001" />
                  <span className="text-xs opacity-30">W/mK</span>
                  {el.layers.length > 1 && (
                    <button onClick={() => removeLayer(idx)} className="text-red-400/50 hover:text-red-400 text-sm">✕</button>
                  )}
                </div>
                {layer.lambda > 0 && parseFloat(layer.thickness) > 0 && (
                  <div className="ml-7 text-xs opacity-40">
                    R = {((parseFloat(layer.thickness)/1000) / layer.lambda).toFixed(3)} m²·K/W
                    {" · "}δ = {layer.thickness} mm
                  </div>
                )}
              </div>
            ))}
          </div>


          {/* Secțiune transversală strat-cu-strat */}
          {el.layers.length > 0 && (
            <Card title={t("Secțiune transversală",lang)} className="mb-4">
              <svg viewBox="0 0 300 120" width="100%" height="100">
                {(() => {
                  var totalD = el.layers.reduce(function(s,l){return s+(parseFloat(l.thickness)||0);},0);
                  if (totalD <= 0) return null;
                  var x = 40, maxW = 220, els = [];
                  var catColors = {"Zidărie":"#b0b0b0","Betoane":"#808080","Termoizolații":"#fdd835","Finisaje":"#d4c4a8","Hidroizolații":"#333","Lemn":"#a1887f","Metale":"#90a4ae","Altele":"#e0e0e0"};
                  els.push(<text key="int" x="10" y="65" fontSize="8" fill="#4caf50">INT</text>);
                  els.push(<text key="ext" x="275" y="65" fontSize="8" fill="#2196f3">EXT</text>);
                  el.layers.forEach(function(l, idx) {
                    var d = parseFloat(l.thickness) || 0;
                    var w = (d / totalD) * maxW;
                    var mat = MATERIALS_DB.find(function(m){return m.name === l.material;});
                    var color = mat ? (catColors[mat.cat] || "#999") : "#999";
                    els.push(<rect key={"r"+idx} x={x} y={15} width={Math.max(2,w)} height={80} fill={color} stroke="#555" strokeWidth="0.5"/>);
                    if (w > 15) els.push(<text key={"t"+idx} x={x+w/2} y={60} textAnchor="middle" fontSize="6" fill="#333" transform={"rotate(-90,"+(x+w/2)+",60)"}>{(l.matName||l.material||"?").substring(0,15)}</text>);
                    els.push(<text key={"d"+idx} x={x+w/2} y={105} textAnchor="middle" fontSize="6" fill="#888">{d}mm</text>);
                    x += w;
                  });
                  return els;
                })()}
              </svg>
            </Card>
          )}

          {/* Results */}
          <Card title={t("Rezultate calcul",lang)} className="mb-4">
            <ResultRow label="R straturi" value={r_layers.toFixed(3)} unit="m²·K/W" />
            <ResultRow label={`R_si = ${elType?.rsi || 0} + R_se = ${elType?.rse || 0}`} value={(elType ? elType.rsi + elType.rse : 0).toFixed(2)} unit="m²·K/W" />
            <ResultRow label="R' total" value={r_total.toFixed(3)} unit="m²·K/W" />
            <ResultRow label="U' (transmitanță)" value={u.toFixed(3)} unit="W/(m²·K)" status={uStatus} />
            {uRef && <ResultRow label={`U'max nZEB (${el.type})`} value={uRef.toFixed(2)} unit="W/(m²·K)" />}
            {(() => { var gc = glaserCheck(el.layers, parseFloat(heating?.theta_int)||20, selectedClimate?.theta_e||-15); if (!gc) return null; return <ResultRow label="Verificare condensare (Glaser)" value={gc.hasCondensation ? "RISC! ~" + gc.gc + " g/m² sezon" : "OK — fără condensare"} status={gc.hasCondensation ? "fail" : "ok"} />; })()}
          </Card>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }}
              className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors">
              Salvează
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GLAZING MODAL
  // ═══════════════════════════════════════════════════════════════

  function GlazingModal({ element, onSave, onClose }) {
    const [el, setEl] = useState(element || {
      name:"Fereastră nouă", orientation:"S", area:"", glazingType:"Dublu vitraj termoizolant",
      frameType:"PVC (5 camere)", frameRatio:"30", u:0, g:0, uFrame:0
    });

    useEffect(() => {
      const gl = GLAZING_DB.find(g => g.name === el.glazingType);
      const fr = FRAME_DB.find(f => f.name === el.frameType);
      if (gl && fr) {
        const fRatio = (parseFloat(el.frameRatio) || 30) / 100;
        // #5 ψ_spacer per ISO 10077-1 — spacer perimeter thermal bridge
        const area = parseFloat(el.area) || 1;
        const aspect = Math.sqrt(area); // approximate square window
        const perimGlass = aspect > 0 ? 2 * (aspect + aspect * 0.7) : 4; // glass pane perimeter
        const psiSpacer = fr.name?.includes('aluminiu') ? 0.08 : 0.04; // aluminium vs thermoplastic
        const deltaU_spacer = area > 0 ? psiSpacer * perimGlass / area : 0;
        const uTotal = gl.u * (1 - fRatio) + fr.u * fRatio + deltaU_spacer;
        setEl(prev => ({...prev, u: uTotal.toFixed(2), g: (gl.g * (1 - fRatio)).toFixed(2), uFrame: fr.u}));
      }
    }, [el.glazingType, el.frameType, el.frameRatio]);

    const uRef = ["RI","RC","RA"].includes(building.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
    const uVal = parseFloat(el.u) || 0;
    const uStatus = uVal <= uRef ? "ok" : uVal <= 1.40 ? "warn" : "fail";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Element vitrat</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Input label={t("Denumire",lang)} value={el.name} onChange={v => setEl(p=>({...p,name:v}))} className="col-span-2" />
            <Select label={t("Orientare",lang)} value={el.orientation} onChange={v => setEl(p=>({...p,orientation:v}))} options={ORIENTATIONS} />
            <Input label={t("Suprafață totală",lang)} value={el.area} onChange={v => setEl(p=>({...p,area:v}))} type="number" unit="m²" min="0" step="0.1" />
            <Select label={t("Tip vitraj",lang)} value={el.glazingType} onChange={v => setEl(p=>({...p,glazingType:v}))}
              options={GLAZING_DB.map(g=>g.name)} />
            <Select label={t("Tip ramă",lang)} value={el.frameType} onChange={v => setEl(p=>({...p,frameType:v}))}
              options={FRAME_DB.map(f=>f.name)} />
            <Input label={t("Fracție ramă",lang)} value={el.frameRatio} onChange={v => setEl(p=>({...p,frameRatio:v}))} type="number" unit="%" min="10" max="50" />
          </div>

          <Card title={t("Rezultate",lang)} className="mb-4">
            <ResultRow label="U vitraj" value={(GLAZING_DB.find(g=>g.name===el.glazingType)?.u || 0).toFixed(2)} unit="W/(m²·K)" />
            <ResultRow label="U ramă" value={(FRAME_DB.find(f=>f.name===el.frameType)?.u || 0).toFixed(2)} unit="W/(m²·K)" />
            <ResultRow label="U total fereastră" value={el.u} unit="W/(m²·K)" status={uStatus} />
            <ResultRow label="Factor solar g efectiv" value={el.g} />
            <ResultRow label="U'max nZEB" value={(["RI","RC","RA"].includes(building.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres).toFixed(2)} unit="W/(m²·K)" />
          </Card>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // THERMAL BRIDGE MODAL
  // ═══════════════════════════════════════════════════════════════

  function BridgeModal({ element, onSave, onClose }) {
    const [el, setEl] = useState(element || { name:"", cat:"", psi:"", length:"", desc:"" });
    const [bridgeSearch, setBridgeSearch] = useState("");
    const [showList, setShowList] = useState(false);

    const filtered = bridgeSearch.length > 1
      ? THERMAL_BRIDGES_DB.filter(b => b.name.toLowerCase().includes(bridgeSearch.toLowerCase()) || b.cat.toLowerCase().includes(bridgeSearch.toLowerCase()))
      : THERMAL_BRIDGES_DB;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Punte termică</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
          </div>

          <div className="mb-4" style={{position:"relative",zIndex:20}}>
            <Input label={t("Caută tip punte termică",lang)} value={bridgeSearch} onChange={v => { setBridgeSearch(v); setShowList(true); }} placeholder="ex: balcon, fereastră, planșeu..." />
            {showList && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"4px",background:"#1e1e38",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",maxHeight:"200px",overflowY:"auto",zIndex:30,boxShadow:"0 10px 40px rgba(0,0,0,0.8)"}}>
                {filtered.map((b, i) => (
                  <button key={i} onClick={() => { setEl({name:b.name, cat:b.cat, psi:b.psi.toString(), length:el.length, desc:b.desc}); setShowList(false); setBridgeSearch(b.name); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex justify-between border-b border-white/5">
                    <span><span className="opacity-40">{b.cat} ›</span> {b.name}</span>
                    <span className="opacity-50">Ψ = {b.psi}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{position:"relative",zIndex:10}}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Input label={t("Ψ (coeficient liniar)",lang)} value={el.psi} onChange={v => setEl(p=>({...p,psi:v}))} type="number" unit="W/(m·K)" step="0.01" />
              <Input label={t("Lungime",lang)} value={el.length} onChange={v => setEl(p=>({...p,length:v}))} type="number" unit="m" min="0" step="0.1" />
            </div>

          {el.psi && el.length && (
            <Card title={t("Pierdere liniară",lang)} className="mb-4">
              <ResultRow label="Ψ × l" value={((parseFloat(el.psi)||0) * (parseFloat(el.length)||0)).toFixed(2)} unit="W/K" />
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">Anulează</button>
            <button onClick={() => { onSave(el); onClose(); }} className="px-6 py-2 text-sm rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400">Salvează</button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // UPGRADE MODAL & PRICING PAGE
  // ═══════════════════════════════════════════════════════════════

  const UpgradeModal = () => {
    if (!showUpgradeModal) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:99999,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)"}} onClick={() => setShowUpgradeModal(false)}>
        <div className="relative bg-[#0d0d20] border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowUpgradeModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm">&times;</button>
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="text-lg font-bold text-amber-400">{lang==="EN"?"Upgrade Required":"Funcție disponibilă cu upgrade"}</h3>
            <p className="text-sm opacity-60 mt-2">{upgradeReason}</p>
          </div>
          <div className="space-y-2.5 mb-4">
            <button onClick={() => activateTier("pro")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg shrink-0">⚡</div>
              <div className="flex-1 text-left">
                <div className="font-bold text-amber-300 group-hover:text-amber-200">Pro — 199 RON/lună</div>
                <div className="text-[10px] opacity-50">15 certificate · Export DOCX · Raport nZEB</div>
              </div>
              <div className="text-amber-500 text-xl shrink-0">→</div>
            </button>
            <button onClick={() => activateTier("business")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">🏢</div>
              <div className="flex-1 text-left">
                <div className="font-bold text-emerald-300 group-hover:text-emerald-200">Business — 399 RON/lună</div>
                <div className="text-[10px] opacity-50">Certificate nelimitate · Multi-user · Branding CPE</div>
              </div>
              <div className="text-white/30 text-xl shrink-0">→</div>
            </button>
          </div>
          <button onClick={() => setShowUpgradeModal(false)} className="w-full text-center text-xs opacity-40 hover:opacity-70 py-2">
            {lang==="EN"?"Maybe later":"Poate mai târziu"}
          </button>
        </div>
      </div>
    );
  };

  const PricingPage = () => {
    if (!showPricingPage) return null;
    const plans = [
      { ...TIERS.free, icon:"🆓", color:"white", border:"border-white/10",
        headline: lang==="EN"?"Get started":"Începe gratuit",
        features:["2 proiecte salvate","Preview certificat","Calcul energetic complet","Export PDF cu watermark","Bază de date Mc 001-2022"],
        missing:["Export PDF/DOCX curat","Raport nZEB","Template-uri MDLPA","Multi-user"] },
      { ...TIERS.pro, icon:"⚡", color:"amber", border:"border-amber-500/50 ring-2 ring-amber-500/20", recommended:true,
        headline: lang==="EN"?"Most popular":"Cel mai popular",
        features:["Proiecte nelimitate","15 certificate/lună","Export PDF + DOCX curat","Raport conformare nZEB","Template-uri oficiale MDLPA","Suport email"],
        missing:["Multi-user","Branding personalizat CPE"] },
      { ...TIERS.business, icon:"🏢", color:"emerald", border:"border-emerald-500/30",
        headline: lang==="EN"?"For teams":"Pentru echipe",
        features:["Certificate nelimitate","3 conturi utilizator","Branding personalizat pe CPE","Export direct bază MDLPA","Suport prioritar telefonic","Toate funcțiile Pro incluse"],
        missing:[] },
    ];
    return (
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto" style={{zIndex:99999,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)"}} onClick={() => setShowPricingPage(false)}>
        <div className="relative bg-[#0d0d20] border border-white/15 rounded-2xl p-4 sm:p-8 max-w-3xl w-full shadow-2xl my-4 sm:my-8 mx-3 sm:mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowPricingPage(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm z-10">&times;</button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
              <span>⚡</span>
              <span className="text-xs font-bold text-amber-400">CertEn</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">{lang==="EN"?"Choose your plan":"Alege planul potrivit"}</h2>
            <p className="text-xs sm:text-sm opacity-40 mt-1">{lang==="EN"?"Switch anytime · Cancel anytime":"Poți schimba oricând · Fără obligații"}</p>
          </div>

          {/* Quick tier switcher — pill buttons */}
          <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 max-w-xs mx-auto">
            {["free","pro","business"].map(tid => (
              <button key={tid} onClick={() => { activateTier(tid); }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  userTier === tid
                    ? tid === "free" ? "bg-white/15 text-white shadow-lg" : tid === "pro" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30" : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}>
                {TIERS[tid].label}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {plans.map(p => {
              const isCurrent = p.id === userTier;
              const colorMap = { amber: { bg:"bg-amber-500/5", ring:"ring-amber-500/30", btn:"bg-amber-500 hover:bg-amber-400 text-black", badge:"bg-amber-500 text-black", check:"text-amber-400" },
                emerald: { bg:"bg-emerald-500/5", ring:"ring-emerald-500/30", btn:"bg-emerald-500 hover:bg-emerald-400 text-black", badge:"bg-emerald-500 text-black", check:"text-emerald-400" },
                white: { bg:"bg-white/[0.02]", ring:"ring-white/10", btn:"bg-white/10 hover:bg-white/15 text-white", badge:"bg-white/20 text-white", check:"text-white/60" } };
              const cm = colorMap[p.color] || colorMap.white;
              return (
                <div key={p.id} className={`relative rounded-2xl border ${p.border} ${cm.bg} p-4 sm:p-5 flex flex-col transition-all ${isCurrent ? "ring-2 "+cm.ring+" scale-[1.02]" : "hover:scale-[1.01]"}`}>
                  {/* Recommended badge */}
                  {p.recommended && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold ${cm.badge} whitespace-nowrap`}>
                      {p.headline}
                    </div>
                  )}

                  {/* Icon + Name + Price */}
                  <div className="text-center mb-4 mt-1">
                    <span className="text-3xl">{p.icon}</span>
                    <div className="font-bold text-lg mt-2">{p.label}</div>
                    <div className="mt-1">
                      {p.price === 0 ? (
                        <span className="text-2xl font-black opacity-50">{lang==="EN"?"Free":"Gratuit"}</span>
                      ) : (
                        <div><span className="text-3xl font-black">{p.price}</span><span className="text-sm opacity-50 ml-1">RON/lună</span></div>
                      )}
                    </div>
                    {!p.recommended && <div className="text-[10px] opacity-30 mt-1">{p.headline}</div>}
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2 mb-4">
                    {p.features.map((f,i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className={`shrink-0 mt-0.5 ${cm.check}`}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {p.missing.map((f,i) => (
                      <div key={"m"+i} className="flex items-start gap-2 text-[11px] opacity-25">
                        <span className="shrink-0 mt-0.5">✗</span>
                        <span className="line-through">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  {isCurrent ? (
                    <div className={`text-center text-xs font-bold py-2.5 rounded-xl ${cm.bg} border border-white/10`}>
                      ✓ {lang==="EN"?"Active":"Activ"}
                    </div>
                  ) : (
                    <button onClick={() => activateTier(p.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${cm.btn}`}>
                      {p.id === "free" ? (lang==="EN"?"Switch to Free":"Treci la Free") : (lang==="EN"?"Activate "+p.label:"Activează "+p.label)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center text-[10px] opacity-30">
            * Mod demo: activarea este simulată. În producție se integrează Stripe.
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div onDragOver={function(e){e.preventDefault();setDragOver(true);}} onDragLeave={function(){setDragOver(false);}} onDrop={handleDrop} className={cn("min-h-screen ep-theme",theme==="dark"?"ep-dark text-white":"ep-light text-gray-900")} style={Object.assign({}, theme==="dark"?{background:"linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #0d0d20 100%)",fontFamily:"'DM Sans', system-ui, sans-serif"}:{background:"#f5f7fa",fontFamily:"'DM Sans', system-ui, sans-serif"}, (pdfPreviewHtml || nzebReportHtml) ? {overflow:"hidden",height:"100vh"} : {})}>
      {/* Fonts loaded in index.html */}
      <style dangerouslySetInnerHTML={{__html: `
        /* ═══ LIGHT THEME OVERRIDES ═══ */
        .ep-light .bg-white\\/\\[0\\.03\\], .ep-light .bg-white\\/5, .ep-light .bg-white\\/\\[0\\.02\\] { background: rgba(0,0,0,0.03) !important; }
        .ep-light .bg-white\\/10, .ep-light .bg-white\\/20 { background: rgba(0,0,0,0.06) !important; }
        .ep-light .border-white\\/\\[0\\.06\\], .ep-light .border-white\\/5 { border-color: rgba(0,0,0,0.1) !important; }
        .ep-light .border-white\\/10, .ep-light .border-white\\/20 { border-color: rgba(0,0,0,0.15) !important; }
        .ep-light .hover\\:bg-white\\/5:hover, .ep-light .hover\\:bg-white\\/10:hover, .ep-light .hover\\:bg-white\\/\\[0\\.03\\]:hover { background: rgba(0,0,0,0.06) !important; }
        .ep-light .hover\\:bg-white\\/20:hover { background: rgba(0,0,0,0.1) !important; }
        .ep-light .text-white { color: #1a1a2e !important; }
        .ep-light .text-white\\/70, .ep-light .text-white\\/60 { color: rgba(26,26,46,0.7) !important; }
        .ep-light .opacity-60 { opacity: 0.55 !important; }
        .ep-light .opacity-40 { opacity: 0.45 !important; }
        .ep-light .opacity-50 { opacity: 0.5 !important; }
        .ep-light .opacity-30 { opacity: 0.4 !important; }
        .ep-light input, .ep-light textarea, .ep-light select { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.15) !important; color: #1a1a2e !important; }
        .ep-light input::placeholder, .ep-light textarea::placeholder { color: rgba(0,0,0,0.35) !important; }
        .ep-light .bg-\\[\\#12141f\\], .ep-light .bg-\\[\\#1a1d2e\\] { background: #ffffff !important; }
        .ep-light .shadow-lg { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; }
        .ep-light .border-amber-500\\/20, .ep-light .border-amber-500\\/30 { border-color: rgba(217,119,6,0.25) !important; }
        .ep-light .bg-amber-500\\/10, .ep-light .bg-amber-500\\/15 { background: rgba(217,119,6,0.08) !important; }
        .ep-light .bg-emerald-500\\/5, .ep-light .bg-emerald-500\\/10 { background: rgba(16,185,129,0.06) !important; }
        .ep-light .bg-red-500\\/5, .ep-light .bg-red-500\\/10 { background: rgba(239,68,68,0.06) !important; }
        .ep-light .bg-amber-500\\/5 { background: rgba(217,119,6,0.05) !important; }
        .ep-light table { color: #1a1a2e; }
        .ep-light .font-mono { color: #1a1a2e; }
        /* Sidebar light */
        .ep-light aside { background: #ffffff !important; border-color: rgba(0,0,0,0.1) !important; }
        /* Toast light */
        .ep-light .backdrop-blur-xl { backdrop-filter: blur(12px); }

        /* ═══ MOBILE RESPONSIVE OVERRIDES ═══ */
        @media (max-width: 639px) {
          /* Sidebar: hidden by default, bottom nav takes over */
          .ep-theme nav { background: rgba(10,10,26,0.98) !important; backdrop-filter: blur(12px); }
          .ep-light nav { background: rgba(255,255,255,0.98) !important; }
          
          /* Header compact */
          .ep-theme header { padding-top: 6px !important; padding-bottom: 6px !important; }
          .ep-theme header h1 { font-size: 14px !important; }

          /* Sub-tab scroll with fade indicator */
          .ep-theme .overflow-x-auto {
            -webkit-mask-image: linear-gradient(to right, black 90%, transparent);
            mask-image: linear-gradient(to right, black 90%, transparent);
          }
          
          /* Main content: less padding, room for bottom nav */
          .ep-theme main { padding: 12px 10px 64px 10px !important; }
          
          /* Cards: tighter padding */
          .ep-theme .rounded-xl { border-radius: 12px; }
          .ep-theme .p-5 { padding: 12px !important; }
          
          /* Grids: ensure single column */
          .ep-theme .grid.md\\:grid-cols-2,
          .ep-theme .grid.md\\:grid-cols-3 { grid-template-columns: 1fr !important; }
          
          /* Tables: smaller text */
          .ep-theme table { font-size: 10px !important; }
          .ep-theme table th, .ep-theme table td { padding: 2px 4px !important; }
          
          /* Buttons: full width on mobile */
          .ep-theme button.px-6 { padding-left: 16px !important; padding-right: 16px !important; }
          
          /* Modals: full width */
          .ep-theme .max-w-lg, .ep-theme .max-w-md, .ep-theme .max-w-sm { max-width: calc(100vw - 16px) !important; }
          .ep-theme .max-w-2xl { max-width: calc(100vw - 16px) !important; }
          
          /* SVG charts responsive */
          .ep-theme svg { max-width: 100% !important; height: auto !important; }
          
          /* Hide desktop-only elements */
          .ep-theme .hidden-mobile { display: none !important; }
          
          /* Sticky table headers */
          .ep-theme .sticky { position: sticky; }
          
          /* Toast: wider on mobile */
          .ep-theme .max-w-sm { max-width: 90vw !important; }
          
          /* Prevent horizontal overflow */
          .ep-theme main > div { max-width: 100%; overflow-x: hidden; }
          .ep-theme .overflow-x-auto { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
          
          /* Bottom nav: prevent overlap with content */
          .ep-theme .fixed.bottom-0 { padding-bottom: env(safe-area-inset-bottom, 0px); }
        }
        
        /* No-scrollbar utility */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* ═══ TABLET (640-1023px) ═══ */
        @media (min-width: 640px) and (max-width: 1023px) {
          .ep-theme main { padding: 16px 20px 20px 20px !important; }
          .ep-theme nav { width: 200px !important; }
          /* Sub-tab fade for scrollable tabs */
          .ep-theme .overflow-x-auto {
            -webkit-mask-image: none;
            mask-image: none;
          }
        }
        
        /* ═══ DESKTOP (1024px+) ═══ */
        @media (min-width: 1024px) {
          /* Hide bottom nav on desktop */
          .ep-theme .fixed.bottom-0.lg\\:hidden { display: none !important; }
          .ep-theme .h-14.lg\\:hidden { display: none !important; }
        }
        
        /* ═══ SAFE AREA (iPhone notch) ═══ */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .ep-theme .fixed.bottom-0 { padding-bottom: env(safe-area-inset-bottom); }
          .ep-theme main { padding-bottom: calc(64px + env(safe-area-inset-bottom)) !important; }
        }
        
        /* ═══ PRINT ═══ */
        @media print {
          .ep-theme nav, .ep-theme header, .ep-theme .fixed.bottom-0, .ep-theme button { display: none !important; }
          .ep-theme main { padding: 0 !important; }
        }
      `}} />

      {/* Tier modals */}
      <UpgradeModal />
      <PricingPage />

      {/* Toast notification (replaces alert/confirm blocked in sandbox) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-sm w-[90vw] pointer-events-none">
          <div onClick={() => setToast(null)} className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl cursor-pointer text-sm ${
            toast.type === "error" ? "bg-red-500/20 border-red-500/40 text-red-200" :
            toast.type === "success" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" :
            "bg-blue-500/20 border-blue-500/40 text-blue-200"
          }`}>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">{toast.type === "error" ? "⚠️" : toast.type === "success" ? "✅" : "ℹ️"}</span>
              <div className="flex-1 min-w-0">{toast.msg}</div>
              <span className="shrink-0 opacity-40 text-xs">✕</span>
            </div>
          </div>
        </div>
      )}

      {/* PDF/CPE Preview overlay — mobile-safe (no sandbox restriction) */}
      {pdfPreviewHtml && (
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{background:"#000"}}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0" style={{background:"#111"}}>
            <div className="text-sm text-white/70 font-medium">Preview CPE</div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                try {
                  const blob = new Blob([pdfPreviewHtml], {type:"text/html;charset=utf-8"});
                  const url = URL.createObjectURL(blob);
                  const w = window.open(url, "_blank");
                  if (w) setTimeout(() => { try{w.print();}catch(e){} }, 600);
                  else showToast("Permite pop-up-uri pentru a tipări.", "error");
                } catch(e) { showToast("Folosește butonul Deschide.", "info"); }
              }} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all">🖨️ Print / PDF</button>
              <button onClick={() => {
                try {
                  const blob = new Blob([pdfPreviewHtml], {type:"text/html;charset=utf-8"});
                  window.open(URL.createObjectURL(blob), "_blank");
                } catch(e) {}
              }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-all">↗ Deschide</button>
              <button onClick={() => setPdfPreviewHtml(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg">&times;</button>
            </div>
          </div>
          <div className="flex-1 relative" style={{background:"#fff"}}>
            <iframe srcDoc={pdfPreviewHtml} className="absolute inset-0 w-full h-full" style={{border:"none",background:"#fff"}} title="CPE Preview" />
          </div>
        </div>
      )}

      {/* nZEB Report overlay */}
      {nzebReportHtml && (
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{background:"#000"}}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0" style={{background:"#111"}}>
            <div className="text-sm text-white/70 font-medium truncate">📋 Raport nZEB</div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                try {
                  const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                  const url = URL.createObjectURL(blob);
                  const w = window.open(url, "_blank");
                  if (w) setTimeout(() => { try{w.print();}catch(e){} }, 600);
                } catch(e) { showToast("Folosește butonul Deschide.", "info"); }
              }} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-all">🖨️ Print</button>
              <button onClick={() => {
                try {
                  const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                  window.open(URL.createObjectURL(blob), "_blank");
                } catch(e) {}
              }} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-all">↗ Deschide</button>
              <button onClick={() => setNzebReportHtml(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg">&times;</button>
            </div>
          </div>
          <div className="flex-1 relative" style={{background:"#fff"}}>
            <iframe srcDoc={nzebReportHtml} className="absolute inset-0 w-full h-full" style={{border:"none",background:"#fff"}} title="nZEB Report" />
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{background:"rgba(245,158,11,0.1)",backdropFilter:"blur(2px)"}}>
          <div className="bg-amber-500/20 border-2 border-dashed border-amber-500 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📂</div>
            <div className="text-amber-400 font-bold">Lasă fișierul aici</div>
            <div className="text-xs opacity-50 mt-1">.json (proiect) sau .csv (elemente)</div>
          </div>
        </div>
      )}

      {/* Step progress indicator */}
      <div className="w-full px-2 sm:px-6 py-1" style={{background:theme==="dark"?"rgba(26,29,46,0.5)":"rgba(0,0,0,0.02)"}}>
        <div className="max-w-7xl mx-auto flex items-center gap-0.5 sm:gap-1">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)} className="flex-1 group relative" title={`${s.id}. ${s.label}`}>
              <div className="h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{
                background: s.id < step ? "linear-gradient(90deg,#22c55e,#4ade80)" :
                  s.id === step ? "linear-gradient(90deg,#f59e0b,#fbbf24)" :
                  theme==="dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
              }} />
              <div className={cn("absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center text-[6px] sm:text-[8px] font-bold transition-all",
                s.id < step ? "bg-emerald-500 border-emerald-400 text-white scale-90" :
                s.id === step ? "bg-amber-500 border-amber-400 text-black scale-110" :
                "bg-white/10 border-white/20 text-white/40 scale-75"
              )} style={{display: typeof window !== "undefined" && window.innerWidth < 400 ? "none" : "flex"}}>
                {s.id < step ? "✓" : s.id}
              </div>
            </button>
          ))}
        </div>
        <div className="text-center mt-0.5">
          <span className="text-[8px] sm:text-[9px] opacity-30">{step}/7 — {STEPS.find(s=>s.id===step)?.label} | {dataProgress}% complet</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="border-b border-white/[0.06] px-3 sm:px-6 py-2 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink">
            <button onClick={() => setSidebarOpen(o=>!o)} className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 hover:bg-white/5 shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm sm:text-lg shrink-0" style={{background:"linear-gradient(135deg, #f59e0b, #d97706)"}}>⚡</div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">CertEn</h1>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[9px] uppercase tracking-widest opacity-30 hidden sm:block">Performanță Energetică</p>
                  {/* Mini tier switcher — always visible */}
                  <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                    {["free","pro","business"].map(tid => (
                      <button key={tid} onClick={(e) => { e.stopPropagation(); activateTier(tid); showToast(`Plan ${TIERS[tid].label} activat`, "success"); }}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                          userTier === tid
                            ? tid === "free" ? "bg-white/15 text-white" : tid === "pro" ? "bg-amber-500 text-black shadow-sm" : "bg-emerald-500 text-black shadow-sm"
                            : "text-white/30 hover:text-white/60"
                        }`}>
                        {tid === "free" ? "FREE" : tid === "pro" ? "⚡PRO" : "🏢BIZ"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowPricingPage(true)} className="text-[9px] opacity-30 hover:opacity-60 transition-all hidden sm:block" title="Detalii planuri">ⓘ</button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 justify-end shrink-0 overflow-x-auto no-scrollbar">
            <button onClick={function(){setPrintMode(true);setTimeout(function(){window.print();setPrintMode(false);},500);}} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0">🖨️</button>
            {storageStatus && <span className="text-[8px] opacity-20 hidden lg:inline shrink-0">{storageStatus}</span>}
            <div className="flex items-center gap-0.5 hidden md:flex shrink-0">
              <button onClick={undo} disabled={undoStack.length===0} title="Undo (Ctrl+Z)"
                className={cn("text-xs px-1.5 py-1 rounded-l-lg border border-white/10 transition-colors", undoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↶</button>
              <button onClick={redo} disabled={redoStack.length===0} title="Redo (Ctrl+Y)"
                className={cn("text-xs px-1.5 py-1 rounded-r-lg border border-l-0 border-white/10 transition-colors", redoStack.length>0?"hover:bg-white/5":"opacity-30 cursor-not-allowed")}>↷</button>
            </div>
            <button onClick={() => { refreshProjectList(); setShowProjectManager(true); }}
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 transition-all shrink-0">
              📁<span className="hidden md:inline"> Proiecte</span>
            </button>
            <button onClick={() => setShowResetConfirm(true)}
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all shrink-0">
              {lang==="EN"?"New":"Nou"}
            </button>
            <button onClick={exportProject}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden md:flex shrink-0">
              💾<span className="hidden lg:inline"> JSON</span>
            </button>
            <button onClick={exportCSV}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:flex shrink-0">
              📊 CSV
            </button>
            <button onClick={() => importFileRef.current?.click()}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:flex shrink-0">
              📂 Import
            </button>
            <input ref={importFileRef} type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files[0]) { importProject(e.target.files[0]); e.target.value=""; } }} />
            <button onClick={function(){setShowTour(true);}} className="text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors hidden lg:block shrink-0" title="Ghid utilizare">?</button>
            <button onClick={toggleThemeManual} className="text-[10px] px-1.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors shrink-0">{theme==="dark"?"☀":"🌙"}</button>
            <button onClick={() => setLang(l => l==="RO"?"EN":"RO")}
              className="text-[10px] sm:text-xs px-2 py-1 sm:py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium shrink-0">
              {lang}
            </button>
            {selectedClimate && (
              <Badge color={selectedClimate.zone==="I"?"green":selectedClimate.zone==="II"?"amber":selectedClimate.zone==="III"?"amber":selectedClimate.zone==="IV"?"red":"purple"}>
                <span className="hidden md:inline">Zona </span>{selectedClimate.zone}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-0 min-h-[calc(100vh-73px)] relative">
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <nav className={cn("fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-56 shrink-0 border-r border-white/[0.06] py-6 px-3 transform transition-transform duration-200 lg:transform-none overflow-y-auto", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{background:theme==="dark"?"#0a0a1a":"#ffffff"}}>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden sticky top-0 float-right w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white bg-[#0a0a1a] z-10 mb-2">✕</button>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => { if(!s.locked){setStep(s.id);setSidebarOpen(false);} }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-all",
                step === s.id ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-white/[0.03] border border-transparent",
                s.locked && "opacity-25 cursor-not-allowed"
              )}>
              <span className="text-lg">{s.icon}</span>
              <div>
                <div className="text-xs font-semibold">{s.id}. {lang==="EN" && s.labelEN ? s.labelEN : s.label}</div>
                <div className="text-[10px] opacity-40">{lang==="EN" && s.descEN ? s.descEN : s.desc}</div>
              </div>
              {step === s.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </button>
          ))}

          {/* Envelope summary mini-panel */}
          {envelopeSummary && envelopeSummary.G > 0 && (
            <div className="mt-6 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Coef. global G</div>
              <div className={cn("text-2xl font-bold font-mono", envelopeSummary.G < 0.5 ? "text-emerald-400" : envelopeSummary.G < 0.8 ? "text-amber-400" : "text-red-400")}>
                {envelopeSummary.G.toFixed(3)}
              </div>
              <div className="text-[10px] opacity-30">W/(m³·K)</div>
            </div>
          )}
          <div className="mt-4 p-2 bg-white/[0.02] rounded-lg">
            <div className="text-[8px] opacity-25 space-y-0.5">
              <div>Ctrl+S — Export proiect</div>
              <div>Alt+← → — Navigare pași</div>
              <div>Drag &amp; drop — Import fișier</div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 sm:p-6 pb-16 lg:pb-6 overflow-y-auto min-w-0">
          <div key={step} style={{animation:"fadeSlideIn 0.3s ease-out"}}>
          <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {/* ═══ STEP 1: IDENTIFICARE ═══ */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{lang==="EN" ? "Building identification & classification" : "Identificare și clasificare clădire"}</h2>
                <p className="text-xs opacity-40">Date generale necesare conform Cap. 1 Mc 001-2022</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* Coloana 1: Adresă & Clasificare */}
                <div className="space-y-5">
                  <Card title={t("Adresa clădirii",lang)}>
                    <div className="space-y-3">
                      <Input label={t("Strada, nr.",lang)} value={building.address} onChange={v => updateBuilding("address",v)} placeholder="Str. Exemplu, nr. 10" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Localitate",lang)} value={building.city} onChange={v => updateBuilding("city",v)} />
                        <Input label={t("Județ",lang)} value={building.county} onChange={v => updateBuilding("county",v)} />
                      </div>
                      <Input label={t("Cod poștal",lang)} value={building.postal} onChange={v => updateBuilding("postal",v)} />
                    </div>
                  </Card>

                  <Card title={t("Clasificare",lang)}>
                    <div className="space-y-3">
                      <Select label={t("Categorie funcțională",lang)} value={building.category} onChange={v => updateBuilding("category",v)}
                        options={BUILDING_CATEGORIES.map(c=>({value:c.id,label:c.label}))} />
                      <Select label={t("Tip structură",lang)} value={building.structure} onChange={v => updateBuilding("structure",v)}
                        options={STRUCTURE_TYPES} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("An construcție",lang)} value={building.yearBuilt} onChange={v => updateBuilding("yearBuilt",v)} type="number" placeholder="1975" />
                        <Input label={t("An renovare",lang)} value={building.yearRenov} onChange={v => updateBuilding("yearRenov",v)} type="number" placeholder="—" />
                      </div>
                    </div>
                  </Card>

                  <Card title={t("Clădiri tip românești",lang)} badge={<span className="text-[10px] opacity-30">template rapid</span>}>
                    <div className="space-y-1.5">
                      {/* DEMO COMPLET — exemplu fictiv cu toate câmpurile */}
                      <button onClick={() => {
                          loadFullDemo();
                      }}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏠</span>
                          <div>
                            <div className="font-bold text-emerald-300">DEMO COMPLET — Casă nouă nZEB Constanța 2025</div>
                            <div className="opacity-50 mt-0.5">PC sol-apă + PV 6kWp + solar termic + HR 92% · 5 elem. opace · 4 vitraje · 7 punți · Toți pașii 1-7</div>
                          </div>
                        </div>
                      </button>

                      <div className="border-t border-white/[0.06] my-2"></div>

                      {TYPICAL_BUILDINGS.map(tpl => (
                        <button key={tpl.id} onClick={() => { loadTypicalBuilding(tpl.id); showToast(`Template "${tpl.label}" încărcat`, "success"); }}
                          className="w-full text-left px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/20 transition-all text-xs">
                          <div className="font-medium">{tpl.label}</div>
                          <div className="opacity-30 mt-0.5">{tpl.opaque.length} elem. opace · {tpl.glazing.length} vitraje · {tpl.bridges.length} punți</div>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Coloana 2: Geometrie */}
                <div className="space-y-5">
                  <Card title={t("Geometrie",lang)}>
                    <div className="space-y-3">
                      <Input label={t("Regim de înălțime",lang)} value={building.floors} onChange={v => updateBuilding("floors",v)} placeholder="P+4E, S+P+2E+M" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={building.basement} onChange={e => updateBuilding("basement",e.target.checked)}
                            className="accent-amber-500 rounded" />
                          Subsol/demisol
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={building.attic} onChange={e => updateBuilding("attic",e.target.checked)}
                            className="accent-amber-500 rounded" />
                          Mansardă/pod
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Nr. unități",lang)} value={building.units} onChange={v => updateBuilding("units",v)} type="number" min="1" />
                        <Input label={t("Nr. scări",lang)} value={building.stairs} onChange={v => updateBuilding("stairs",v)} type="number" min="1" />
                      </div>
                    </div>
                  </Card>

                  <Card title={t("Dimensiuni",lang)}>
                    <div className="space-y-3">
                      <button onClick={estimateGeometry}
                        className="w-full py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs hover:bg-amber-500/10 transition-colors">
                        Estimare automată din Au + etaje
                      </button>
                      <Input label={t("Suprafață utilă încălzită (Au)",lang)} tooltip="Suma suprafețelor utile ale tuturor spațiilor încălzite — Mc 001 Cap.1" value={building.areaUseful} onChange={v => updateBuilding("areaUseful",v)} type="number" unit="m²" min="0" step="0.1" />
                      <Input label={t("Volum încălzit (V)",lang)} tooltip="Volumul interior al spațiilor încălzite delimitat de anvelopa termică — m³" value={building.volume} onChange={v => updateBuilding("volume",v)} type="number" unit="m³" min="0" step="0.1" />
                      <Input label={t("Suprafață anvelopă (Aenv)",lang)} value={building.areaEnvelope} onChange={v => updateBuilding("areaEnvelope",v)} type="number" unit="m²" min="0" step="0.1" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Înălțime clădire",lang)} value={building.heightBuilding} onChange={v => updateBuilding("heightBuilding",v)} type="number" unit="m" step="0.1" />
                        <Input label={t("Înălțime etaj",lang)} value={building.heightFloor} onChange={v => updateBuilding("heightFloor",v)} type="number" unit="m" step="0.01" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Perimetru clădire",lang)} value={building.perimeter} onChange={v => updateBuilding("perimeter",v)} type="number" unit="m" step="0.1" />
                        <Input label={t("n50 (blower door)",lang)} tooltip="Rata de schimb aer la 50Pa presiune — test etanșeitate conform EN 13829" value={building.n50} onChange={v => updateBuilding("n50",v)} type="number" unit="h⁻¹" step="0.1" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("GWP lifecycle",lang)} tooltip="Potențial de Încălzire Globală pe ciclu de viață — EPBD IV Art.7, obligatoriu din 2028 pentru >1000m²" value={building.gwpLifecycle} onChange={v => updateBuilding("gwpLifecycle",v)} type="number" unit="kgCO₂eq/m²a" step="0.1" />
                        <label className="flex items-center gap-2 text-xs cursor-pointer mt-auto py-2"><input type="checkbox" checked={building.solarReady} onChange={e => updateBuilding("solarReady",e.target.checked)} className="accent-amber-500" />{lang==="EN"?"Solar-ready building":"Clădire solar-ready"}</label>
                      </div>
                      <Input label={t("Factor umbrire",lang)} tooltip="Factor global umbrire Fc=0..1 — 1.0=fără umbrire, 0.5=umbrire puternică — SR EN ISO 13790" value={building.shadingFactor} onChange={v => updateBuilding("shadingFactor",v)} type="number" step="0.01" min="0" max="1" />

                      {/* Scop CPE — obligatoriu conform Mc 001-2022, subcap 5.1 */}
                      <Select label={lang==="EN"?"CPE purpose":"Scop elaborare CPE"} value={building.scopCpe} onChange={v => updateBuilding("scopCpe",v)}
                        options={[{value:"vanzare",label:"Vânzare"},{value:"inchiriere",label:"Închiriere"},{value:"receptie",label:"Recepție clădire nouă"},{value:"informare",label:"Informare proprietar"},{value:"renovare",label:"Renovare majoră"},{value:"alt",label:"Alt scop"}]} />

                      {/* n50 verification indicator */}
                      {(() => {
                        const n50V = parseFloat(building.n50) || 4.0;
                        const n50Ref = n50V <= 1.0 ? {label:"nZEB (≤1.0)", color:"emerald"} : n50V <= 1.5 ? {label:"Vent. mecanică (≤1.5)", color:"emerald"} : n50V <= 3.0 ? {label:"Vent. naturală (≤3.0)", color:"amber"} : {label:"Peste limită (>3.0)", color:"red"};
                        return (
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="opacity-40">Etanșeitate n50:</span>
                            <Badge color={n50Ref.color}>{n50Ref.label} — {n50V} h⁻¹</Badge>
                            {n50V > 1.0 && <span className="opacity-30">nZEB necesită ≤1.0 h⁻¹</span>}
                          </div>
                        );
                      })()}

                      {/* EV Charging — L.238/2024 */}
                      {!["RI","RA"].includes(building.category) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Nr. locuri de parcare" value={building.parkingSpaces} onChange={v => updateBuilding("parkingSpaces",v)} type="number" min="0" />
                          {parseInt(building.parkingSpaces) >= 10 && (
                            <div className="flex items-center text-[10px] text-amber-400/80 bg-amber-500/5 rounded-lg p-2">
                              ⚡ L.238/2024: min {Math.ceil(parseInt(building.parkingSpaces) * 0.2)} locuri pregătite VE (20%)
                            </div>
                          )}
                        </div>
                      )}
                      {avRatio !== "—" && (
                        <div className="bg-white/[0.03] rounded-lg p-3 flex items-center justify-between">
                          <span className="text-xs opacity-50">Raport A/V (compacitate)</span>
                          <span className="font-mono text-sm font-medium text-amber-400">{avRatio} <span className="text-xs opacity-40">m⁻¹</span></span>
                        </div>
                      )}
                    </div>
                  </Card>

                </div>

                {/* Coloana 3: Vizualizare + Date climatice */}
                <div className="space-y-5">
                  <Card title={t("Vizualizare clădire",lang)}>
                    <svg viewBox="0 0 180 150" width="180" height="130" className="mx-auto block opacity-80">
                      {(() => {
                        var nF = Math.max(1, parseInt(String(building.floors).replace(/[^0-9]/g,"")) || 1);
                        var fH = Math.min(20, 100/nF), bW = 90, bX = 45, gY = 125;
                        var topY = gY - nF * fH;
                        var els = [];
                        els.push(<line key="g" x1="10" y1={gY} x2="170" y2={gY} stroke="#555" strokeWidth="0.5" strokeDasharray="3 2"/>);
                        if (building.basement) {
                          els.push(<rect key="bs" x={bX} y={gY} width={bW} height={15} fill="#4a3728" stroke="#6b5744" strokeWidth="0.5" rx="1"/>);
                          els.push(<text key="bt" x={bX+bW/2} y={gY+10} textAnchor="middle" fontSize="6" fill="#a08060">S</text>);
                        }
                        for (var f = 0; f < nF; f++) {
                          var fy = gY - (f+1)*fH;
                          els.push(<rect key={"f"+f} x={bX} y={fy} width={bW} height={fH} fill={f===0?"#2a3a4a":"#1e2d3d"} stroke="#3a5060" strokeWidth="0.5"/>);
                          for (var w = 0; w < 4; w++) els.push(<rect key={"w"+f+"-"+w} x={bX+10+w*20} y={fy+fH*0.2} width={7} height={fH*0.5} fill="#4a8ab5" rx="0.5" opacity="0.6"/>);
                          if (f===0) els.push(<rect key="dr" x={bX+bW/2-5} y={fy+fH*0.3} width={10} height={fH*0.65} fill="#6b4423" rx="1"/>);
                        }
                        if (building.attic) els.push(<polygon key="rf" points={bX+","+topY+" "+(bX+bW/2)+","+(topY-20)+" "+(bX+bW)+","+topY} fill="#5a3a2a" stroke="#7a5a4a" strokeWidth="0.5"/>);
                        else els.push(<rect key="tr" x={bX-2} y={topY-2} width={bW+4} height={3} fill="#4a4a4a" rx="1"/>);
                        els.push(<text key="fl" x={bX+bW+8} y={(topY+gY)/2+3} fontSize="8" fill="#f59e0b">{building.floors||"P"}</text>);
                        return els;
                      })()}
                    </svg>
                  </Card>
                  <Card title={t("Localizare climatică",lang)} badge={selectedClimate && <Badge color="blue">Auto-detectat</Badge>}>
                    <div className="space-y-3">
                      <Select label={t("Localitatea de calcul",lang)} value={building.locality} onChange={v => updateBuilding("locality",v)}
                        placeholder="Selectează localitatea..."
                        options={CLIMATE_DB.map(c=>({value:c.name, label:`${c.name} (Zona ${c.zone})`}))} />


                      {selectedClimate && (
                        <div className="space-y-1 mt-3">
                          <ResultRow label="Zona climatică" value={selectedClimate.zone} />
                          <ResultRow label="Temp. ext. calcul (θe)" value={selectedClimate.theta_e} unit="°C" />
                          <ResultRow label="Temp. medie anuală (θa)" value={selectedClimate.theta_a} unit="°C" />
                          <ResultRow label="Grade-zile (NGZ)" value={selectedClimate.ngz.toLocaleString()} unit="K·zile" />
                          <ResultRow label="Durata sezon încălzire" value={selectedClimate.season} unit="zile" />
                          <ResultRow label="Altitudine" value={selectedClimate.alt} unit="m" />
                        </div>
                      )}
                    </div>
                  </Card>


                  {selectedClimate && (
                    <Card title={t("Profil temperatură lunară",lang)}>
                      <svg viewBox="0 0 280 100" width="100%" height="90">
                        {(() => {
                          const temps = selectedClimate.temp_month;
                          const tMin = Math.min(...temps);
                          const tMax = Math.max(...temps);
                          const range = Math.max(tMax - tMin, 1);
                          const months = ["I","F","M","A","M","I","I","A","S","O","N","D"];
                          const barW = 18, gap = 5, offsetX = 8;
                          const chartH = 60, baseY = 75;
                          var els = [];
                          // zero line
                          var zeroY = baseY - ((0 - tMin) / range) * chartH;
                          if (tMin < 0 && tMax > 0) els.push(<line key="z" x1={offsetX} y1={zeroY} x2={offsetX + 12*(barW+gap)} y2={zeroY} stroke="#555" strokeWidth="0.5" strokeDasharray="2 2"/>);
                          temps.forEach(function(t, i) {
                            var x = offsetX + i * (barW + gap);
                            var h = Math.abs(t - Math.max(0, tMin)) / range * chartH;
                            var y = t >= 0 ? baseY - ((t - tMin) / range) * chartH : baseY - ((0 - tMin) / range) * chartH;
                            var barH = t >= 0 ? ((t - Math.max(0, tMin)) / range) * chartH : ((0 - t) / range) * chartH;
                            var isHeat = t < 15;
                            els.push(<rect key={"b"+i} x={x} y={t >= 0 ? baseY - ((t-tMin)/range)*chartH : zeroY} width={barW} height={Math.max(1, Math.abs(t)/range*chartH)} fill={isHeat ? "#3b82f6" : "#ef4444"} opacity="0.6" rx="2"/>);
                            els.push(<text key={"v"+i} x={x+barW/2} y={baseY - ((t-tMin)/range)*chartH - 3} textAnchor="middle" fontSize="6" fill={isHeat ? "#60a5fa" : "#f87171"}>{t.toFixed(0)}</text>);
                            els.push(<text key={"m"+i} x={x+barW/2} y={baseY+10} textAnchor="middle" fontSize="7" fill="#666">{months[i]}</text>);
                          });
                          // Season heating indicator
                          els.push(<text key="leg" x="140" y="98" textAnchor="middle" fontSize="6" fill="#555">Albastru = sezon incalzire (&lt;15C) | Rosu = sezon racire</text>);
                          return els;
                        })()}
                      </svg>
                    </Card>
                  )}

                  {selectedClimate && (
                    <Card title={t("Radiație solară anuală",lang)}>
                      <div className="space-y-1">
                        {Object.entries(selectedClimate.solar).map(([dir, val]) => (
                          <div key={dir} className="flex items-center justify-between py-1">
                            <span className="text-xs opacity-50">{dir}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{width:`${(val/450)*100}%`, background:`linear-gradient(90deg, #f59e0b, #ef4444)`}} />
                              </div>
                              <span className="text-xs font-mono w-12 text-right opacity-60">{val}</span>
                            </div>
                          </div>
                        ))}
                        <div className="text-[10px] opacity-30 mt-2">kWh/(m²·an) — valori medii Mc 001-2022</div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <div />
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 2: Anvelopă →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: ANVELOPĂ ═══ */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(1)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 1</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Building thermal envelope":"Anvelopa termică a clădirii"}</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 2 Mc 001-2022 — Elemente opace, vitraje, punți termice</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={function(){csvImportRef.current && csvImportRef.current.click();}}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                        📄 Import CSV
                      </button>
                      <input ref={csvImportRef} type="file" accept=".csv" className="hidden"
                        onChange={function(e){if(e.target.files[0]){importCSV(e.target.files[0]);e.target.value="";}}} />
                    </div>

              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Elemente opace */}
                <div className="xl:col-span-2 space-y-5">
                  <Card title={t("Elemente opace",lang)} badge={<button onClick={() => { setEditingOpaque(null); setShowOpaqueModal(true); }}
                    className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>}>
                    {opaqueElements.length === 0 ? (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">🏗️</div>
                        <div className="text-xs">Adaugă primul element opac (pereți, planșee, terasă)</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {opaqueElements.map((el, idx) => {
                          const { u } = calcOpaqueR(el.layers, el.type);
                          const uRef = getURefNZEB(building.category, el.type);
                          const status = uRef ? (u <= uRef ? "ok" : u <= uRef*1.3 ? "warn" : "fail") : null;
                          const statusIcon = status==="ok" ? "✓" : status==="warn" ? "⚠" : "✗";
                          const elType = ELEMENT_TYPES.find(t => t.id === el.type);
                          return (
                            <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <span className={cn("text-sm", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>{statusIcon}</span>
                                <div>
                                  <div className="text-sm font-medium">{el.name}</div>
                                  <div className="text-[10px] opacity-40">{elType?.label} · {el.orientation} · {el.layers.length} straturi</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs font-mono">{parseFloat(el.area).toFixed(1)} m²</div>
                                  <div className={cn("text-xs font-mono font-medium", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                                    U = {u.toFixed(3)}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingOpaque({...el, _idx:idx}); setShowOpaqueModal(true); }}
                                    className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                                  <button onClick={() => setOpaqueElements(p => p.filter((_,i) => i !== idx))}
                                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Elemente vitrate */}
                  <Card title={t("Elemente vitrate",lang)} badge={<button onClick={() => { setEditingGlazing(null); setShowGlazingModal(true); }}
                    className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>}>
                    {glazingElements.length === 0 ? (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">🪟</div>
                        <div className="text-xs">Adaugă ferestre și uși cu vitraje</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {glazingElements.map((el, idx) => {
                          const uVal = parseFloat(el.u) || 0;
                          const status = uVal <= 1.11 ? "ok" : uVal <= 1.40 ? "warn" : "fail";
                          return (
                            <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <span className={cn("text-sm", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                                  {status==="ok"?"✓":status==="warn"?"⚠":"✗"}
                                </span>
                                <div>
                                  <div className="text-sm font-medium">{el.name}</div>
                                  <div className="text-[10px] opacity-40">{el.glazingType} · {el.frameType} · {el.orientation}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs font-mono">{parseFloat(el.area).toFixed(1)} m²</div>
                                  <div className={cn("text-xs font-mono font-medium", status==="ok"?"text-emerald-400":status==="warn"?"text-amber-400":"text-red-400")}>
                                    U = {el.u}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingGlazing({...el, _idx:idx}); setShowGlazingModal(true); }}
                                    className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                                  <button onClick={() => setGlazingElements(p => p.filter((_,i) => i !== idx))}
                                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Punți termice */}
                  <Card title={t("Punți termice",lang)} badge={<div className="flex gap-2">
                    <button onClick={() => setShowBridgeCatalog(true)}
                      className="text-xs bg-white/5 text-white/60 px-3 py-1 rounded-lg hover:bg-white/10 border border-white/10">📖 Catalog</button>
                    <button onClick={() => { setEditingBridge(null); setShowBridgeModal(true); }}
                      className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">+ Adaugă</button>
                  </div>}>
                    {thermalBridges.length === 0 ? (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">🔗</div>
                        <div className="text-xs">Adaugă punți termice (joncțiuni, console, glafuri)</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {thermalBridges.map((b, idx) => (
                          <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                            <div>
                              <div className="text-sm font-medium">{b.name}</div>
                              <div className="text-[10px] opacity-40">{b.cat} · Ψ = {b.psi} W/(m·K)</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs font-mono">{parseFloat(b.length).toFixed(1)} m</div>
                                <div className="text-xs font-mono text-orange-400">{((parseFloat(b.psi)||0)*(parseFloat(b.length)||0)).toFixed(2)} W/K</div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingBridge({...b, _idx:idx}); setShowBridgeModal(true); }}
                                  className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10">✎</button>
                                <button onClick={() => setThermalBridges(p => p.filter((_,i) => i !== idx))}
                                  className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Right panel: Summary */}
                <div className="space-y-5">
                  <Card title={t("Sumar anvelopă",lang)} className="sticky top-6">
                    {envelopeSummary && envelopeSummary.G > 0 ? (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Coeficient global G</div>
                          <div className={cn("text-4xl font-bold font-mono",
                            envelopeSummary.G < 0.5 ? "text-emerald-400" : envelopeSummary.G < 0.8 ? "text-amber-400" : "text-red-400")}>
                            {envelopeSummary.G.toFixed(3)}
                          </div>
                          <div className="text-xs opacity-30 mt-1">W/(m³·K)</div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Elemente opace" value={opaqueElements.length} unit="buc" />
                          <ResultRow label="Elemente vitrate" value={glazingElements.length} unit="buc" />
                          <ResultRow label="Punți termice" value={thermalBridges.length} unit="buc" />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Pierderi transmisie" value={envelopeSummary.totalHeatLoss.toFixed(1)} unit="W/K" />
                          <ResultRow label="  din care punți termice" value={envelopeSummary.bridgeLoss.toFixed(1)} unit="W/K" />
                          <ResultRow label="Pierderi ventilare (n=0.5)" value={envelopeSummary.ventLoss.toFixed(1)} unit="W/K" />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Suprafață totală elemente" value={envelopeSummary.totalArea.toFixed(1)} unit="m²" />
                          <ResultRow label="Volum încălzit" value={envelopeSummary.volume.toFixed(1)} unit="m³" />
                        </div>

                        {selectedClimate && (
                          <>
                            <div className="h-px bg-white/[0.06]" />
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Estimare rapidă</div>
                              <ResultRow label="Necesar încălzire" 
                                value={((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7).toFixed(0)}
                                unit="kWh/(m³·an)" />
                              <ResultRow label="Necesar specific" 
                                value={(parseFloat(building.areaUseful) > 0 
                                  ? (((24 * envelopeSummary.G * 0.9 * selectedClimate.ngz / 1000) - 7) * parseFloat(building.volume) / parseFloat(building.areaUseful)).toFixed(0)
                                  : "—")}
                                unit="kWh/(m²·an)" />
                            </div>
                          </>
                        )}

                        <div className="h-px bg-white/[0.06]" />
                        <div>
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Distribuție pierderi</div>
                          <div className="flex items-center gap-3">
                            <svg viewBox="0 0 90 90" width="80" height="80" className="shrink-0">
                              {(() => {
                                var oL = opaqueElements.reduce(function(s,el){ var r = calcOpaqueR(el.layers,el.type); var tau = (ELEMENT_TYPES.find(function(t){return t.id===el.type})||{}).tau||1; return s+tau*(parseFloat(el.area)||0)*r.u; },0);
                                var gL = glazingElements.reduce(function(s,el){ return s+(parseFloat(el.area)||0)*(parseFloat(el.u)||0); },0);
                                var bL = envelopeSummary.bridgeLoss, vL = envelopeSummary.ventLoss;
                                var items=[{v:oL,c:"#ef4444"},{v:gL,c:"#3b82f6"},{v:bL,c:"#f97316"},{v:vL,c:"#8b5cf6"}];
                                var tot=oL+gL+bL+vL; if(tot<=0) return null;
                                var cum=0, cx=45, cy=45, r=38, res=[];
                                items.forEach(function(it,idx){
                                  var pct=it.v/tot, ang=pct*360;
                                  if(pct<0.01){cum+=ang;return;}
                                  var a1=(cum-90)*Math.PI/180, a2=(cum+ang-90)*Math.PI/180;
                                  res.push(<path key={idx} d={"M"+cx+","+cy+" L"+(cx+r*Math.cos(a1))+","+(cy+r*Math.sin(a1))+" A"+r+","+r+" 0 "+(ang>180?1:0)+",1 "+(cx+r*Math.cos(a2))+","+(cy+r*Math.sin(a2))+" Z"} fill={it.c} opacity="0.75"/>);
                                  cum+=ang;
                                });
                                res.push(<circle key="h" cx={cx} cy={cy} r="16" fill="#12141f"/>);
                                return res;
                              })()}
                            </svg>
                            <div className="space-y-1">
                              {[{l:"Opace",c:"#ef4444"},{l:"Vitraje",c:"#3b82f6"},{l:"Punți",c:"#f97316"},{l:"Ventilare",c:"#8b5cf6"}].map(function(it){ return <div key={it.l} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:it.c}}/><span className="text-[10px] opacity-60">{it.l}</span></div>; })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">📐</div>
                        <div className="text-xs">Adaugă elemente constructive și completează volumul în Pasul 1 pentru a vedea rezultatele</div>
                      </div>
                    )}
                  </Card>

                  {/* Quick reference */}
                  <Card title={t("Referință U'max nZEB",lang)}>
                    <div className="space-y-1">
                      {Object.entries(U_REF_NZEB).filter(([_,v])=>v!==null).map(([k,v]) => {
                        const el = ELEMENT_TYPES.find(t=>t.id===k);
                        return <ResultRow key={k} label={el?.label || k} value={v.toFixed(2)} unit="W/(m²·K)" />;
                      })}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 1: Identificare
                </button>
                <button onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 3: Instalații →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: INSTALAȚII ═══ */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(2)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 2</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Building systems":"Instalații"}</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 3 Mc 001-2022 — Încălzire, ACM, Climatizare, Ventilare, Iluminat</p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
                {[
                  {id:"heating",label:"Încălzire",icon:"🔥"},
                  {id:"acm",label:"ACM",icon:"🚿"},
                  {id:"cooling",label:"Climatizare",icon:"❄️"},
                  {id:"ventilation",label:"Ventilare",icon:"💨"},
                  {id:"lighting",label:"Iluminat",icon:"💡"},
                ].map(tab => (
                  <button key={tab.id} onClick={() => setInstSubTab(tab.id)}
                    className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-[80px]",
                      instSubTab===tab.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "hover:bg-white/5 border border-transparent")}>
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Main content area */}
                <div className="xl:col-span-2 space-y-5">

                  {/* ── ÎNCĂLZIRE ── */}
                  {instSubTab === "heating" && (
                    <>
                      <Card title={t("Sursa de căldură (generare)",lang)}>
                        <div className="space-y-3">
                          <Select label={t("Tip sursă",lang)} value={heating.source} onChange={v => setHeating(p=>({...p,source:v}))}
                            options={HEAT_SOURCES.map(s=>({value:s.id, label:`${s.label} (${s.cat})`}))} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label={t("Putere nominală",lang)} value={heating.power} onChange={v => setHeating(p=>({...p,power:v}))} type="number" unit="kW" min="0" step="0.1" tooltip="Puterea termică nominală a generatorului — Mc 001 Cap.3, valoare de pe plăcuța echipamentului" />
                            <Input label={HEAT_SOURCES.find(s=>s.id===heating.source)?.isCOP ? "COP/SCOP" : "Randament generare (eta_gen)"}
                              value={heating.eta_gen} onChange={v => setHeating(p=>({...p,eta_gen:v}))} type="number"
                              unit={HEAT_SOURCES.find(s=>s.id===heating.source)?.isCOP ? "" : "%"} step="0.01" />
                          </div>
                          {(() => { const src = HEAT_SOURCES.find(s=>s.id===heating.source); const fl = FUELS.find(f=>f.id===src?.fuel);
                            return fl ? (
                              <div className="bg-white/[0.02] rounded-lg p-3 flex items-center justify-between">
                                <span className="text-xs opacity-40">Combustibil</span>
                                <span className="text-xs font-medium">{fl.label} <span className="opacity-40">(fP = {fl.fP_tot}, fCO2 = {fl.fCO2})</span></span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </Card>

                      <Card title={t("Sistem de emisie",lang)}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select label={t("Tip corpuri de încălzire",lang)} value={heating.emission} onChange={v => setHeating(p=>({...p,emission:v}))}
                            options={EMISSION_SYSTEMS.map(s=>({value:s.id,label:s.label}))} />
                          <Input label={t("Randament emisie (eta_em)",lang)} value={heating.eta_em} onChange={v => setHeating(p=>({...p,eta_em:v}))} type="number" step="0.01" />
                        </div>
                      </Card>

                      <Card title={t("Distribuție și control",lang)}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select label={t("Calitate distribuție",lang)} value={heating.distribution} onChange={v => setHeating(p=>({...p,distribution:v}))}
                            options={DISTRIBUTION_QUALITY.map(s=>({value:s.id,label:s.label}))} />
                          <Input label={t("Randament distribuție (eta_dist)",lang)} value={heating.eta_dist} onChange={v => setHeating(p=>({...p,eta_dist:v}))} type="number" step="0.01" />
                          <Select label={t("Tip reglaj/control",lang)} value={heating.control} onChange={v => setHeating(p=>({...p,control:v}))}
                            options={CONTROL_TYPES.map(s=>({value:s.id,label:s.label}))} />
                          <Input label={t("Randament reglaj (eta_ctrl)",lang)} value={heating.eta_ctrl} onChange={v => setHeating(p=>({...p,eta_ctrl:v}))} type="number" step="0.01" />
                        </div>
                      </Card>

                      <Card title={t("Regim de funcționare",lang)}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Select label={t("Regim",lang)} value={heating.regime} onChange={v => setHeating(p=>({...p,regime:v}))}
                            options={[{value:"continuu",label:"Continuu 24h"},{value:"intermitent",label:"Intermitent (reducere nocturnă)"},{value:"oprire",label:"Intermitent (oprire nocturnă)"}]} />
                          <Input label={t("Temp. confort (theta_int)",lang)} value={heating.theta_int} onChange={v => setHeating(p=>({...p,theta_int:v}))} type="number" unit="°C" tooltip="Temperatura interioară de calcul — Mc 001 Tabel 1.2: 20°C rezidențial, 18°C depozite, 24°C sănătate" />
                          <Input label={t("Reducere nocturnă",lang)} value={heating.nightReduction} onChange={v => setHeating(p=>({...p,nightReduction:v}))} type="number" unit="°C" />
                          {/* #7 Multi-zonă simplificată */}
                          <div className="col-span-full border-t border-white/5 pt-2 mt-1">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Zone termice adiacente (multi-zonă simplificată)</div>
                            <div className="grid grid-cols-3 gap-3">
                              <Input label="T scară/hol comun" value={heating.tStaircase || "15"} onChange={v => setHeating(p=>({...p,tStaircase:v}))} type="number" unit="°C" tooltip="Temperatura medie a scării/holului comun neîncălzit (afectează τ perete interior)" />
                              <Input label="T subsol" value={heating.tBasement || "10"} onChange={v => setHeating(p=>({...p,tBasement:v}))} type="number" unit="°C" tooltip="Temperatura medie a subsolului neîncălzit" />
                              <Input label="T pod" value={heating.tAttic || "5"} onChange={v => setHeating(p=>({...p,tAttic:v}))} type="number" unit="°C" tooltip="Temperatura medie a podului neîncălzit" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── ACM ── */}
                  {instSubTab === "acm" && (
                    <>
                      <Card title={t("Preparare apă caldă de consum",lang)}>
                        <div className="space-y-3">
                          <Select label={t("Sursa ACM",lang)} value={acm.source} onChange={v => setAcm(p=>({...p,source:v}))}
                            options={ACM_SOURCES.map(s=>({value:s.id,label:s.label}))} />
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Input label={t("Nr. consumatori echivalenți",lang)} value={acm.consumers} onChange={v => setAcm(p=>({...p,consumers:v}))} type="number"
                              placeholder={`auto: ${Math.max(1,Math.round((parseFloat(building.areaUseful)||100)/30))}`} min="1" />
                            <Input label={t("Consum specific",lang)} value={acm.dailyLiters} onChange={v => setAcm(p=>({...p,dailyLiters:v}))} type="number" unit="l/pers/zi" />
                            <div className="bg-white/[0.02] rounded-lg p-3 flex flex-col justify-center">
                              <span className="text-[10px] opacity-40">Necesar termic ACM</span>
                              <span className="text-sm font-mono font-medium text-amber-400">
                                {instSummary ? instSummary.qACM_nd.toFixed(0) : "—"} <span className="text-[10px] opacity-40">kWh/an</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card title={t("Stocare și distribuție ACM",lang)}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label={t("Volum vas stocare",lang)} value={acm.storageVolume} onChange={v => setAcm(p=>({...p,storageVolume:v}))} type="number" unit="litri" placeholder="0 = fără vas" />
                          <Input label={t("Pierderi stocare",lang)} value={acm.storageLoss} onChange={v => setAcm(p=>({...p,storageLoss:v}))} type="number" unit="%" step="0.1" />
                          <Input label={t("Lungime conducte distribuție",lang)} value={acm.pipeLength} onChange={v => setAcm(p=>({...p,pipeLength:v}))} type="number" unit="m" />
                          <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2">
                            <input type="checkbox" checked={acm.pipeInsulated} onChange={e => setAcm(p=>({...p,pipeInsulated:e.target.checked}))} className="accent-amber-500" />
                            Conducte izolate termic
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={acm.circRecirculation} onChange={e => setAcm(p=>({...p,circRecirculation:e.target.checked}))} className="accent-amber-500" />
                            Circuit de recirculare
                          </label>
                          {acm.circRecirculation && (
                            <Input label={t("Ore funcționare recirculare/zi",lang)} value={acm.circHours} onChange={v => setAcm(p=>({...p,circHours:v}))} type="number" unit="h/zi" />
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── CLIMATIZARE ── */}
                  {instSubTab === "cooling" && (
                    <>
                      <Card title={t("Sistem de răcire",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={cooling.hasCooling} onChange={e => setCooling(p=>({...p,hasCooling:e.target.checked}))}
                              className="accent-amber-500" />
                            <span className="font-medium">Clădirea dispune de sistem de răcire/climatizare</span>
                          </label>

                          {cooling.hasCooling && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Select label={t("Tip sistem",lang)} value={cooling.system} onChange={v => {
                                const sys = COOLING_SYSTEMS.find(s=>s.id===v);
                                setCooling(p=>({...p,system:v,eer:sys?.eer.toString()||""}));
                              }} options={COOLING_SYSTEMS.filter(s=>s.id!=="NONE").map(s=>({value:s.id,label:s.label}))} />
                              <Input label={t("EER/COP răcire",lang)} value={cooling.eer || (COOLING_SYSTEMS.find(s=>s.id===cooling.system)?.eer||"").toString()}
                                onChange={v => setCooling(p=>({...p,eer:v}))} type="number" step="0.1" />
                              <Input label={t("Putere frigorifică",lang)} value={cooling.power} onChange={v => setCooling(p=>({...p,power:v}))} type="number" unit="kW" />
                              <Input label={t("Suprafață răcită",lang)} value={cooling.cooledArea} onChange={v => setCooling(p=>({...p,cooledArea:v}))} type="number" unit="m²"
                                placeholder={`${building.areaUseful || "= Au"}`} />
                              <Select label={t("Distribuție răcire",lang)} value={cooling.distribution} onChange={v => setCooling(p=>({...p,distribution:v}))}
                                options={DISTRIBUTION_QUALITY.slice(0,4).map(s=>({value:s.id,label:s.label}))} />
                            </div>
                          )}

                          {!cooling.hasCooling && (
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 mt-2">
                              <div className="text-xs text-amber-400 font-medium mb-1">Notă Mc 001-2022</div>
                              <div className="text-xs opacity-60">Dacă clădirea nu dispune de sistem de răcire, se aplică grila de clasare fără răcire. Se va calcula totuși numărul de ore cu temperatura interioară peste limita de confort (27°C) în regim liber.</div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── VENTILARE ── */}
                  {instSubTab === "ventilation" && (
                    <>
                      <Card title={t("Sistem de ventilare",lang)}>
                        <div className="space-y-3">
                          <Select label={t("Tip ventilare",lang)} value={ventilation.type} onChange={v => {
                            const vt = VENTILATION_TYPES.find(t=>t.id===v);
                            setVentilation(p=>({...p,type:v,hrEfficiency:vt?.hrEta?.toString()||""}));
                          }} options={VENTILATION_TYPES.map(s=>({value:s.id,label:s.label}))} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label={t("Debit aer proaspăt",lang)} value={ventilation.airflow} onChange={v => setVentilation(p=>({...p,airflow:v}))} type="number" unit="m3/h"
                              placeholder={`auto: ${((parseFloat(building.volume)||100)*0.5).toFixed(0)}`} />
                            <Input label={t("Putere ventilator",lang)} value={ventilation.fanPower} onChange={v => setVentilation(p=>({...p,fanPower:v}))} type="number" unit="W"
                              disabled={ventilation.type==="NAT"} />
                            <Input label={t("Ore funcționare/an",lang)} value={ventilation.operatingHours} onChange={v => setVentilation(p=>({...p,operatingHours:v}))} type="number" unit="h/an"
                              placeholder={`auto: ${((selectedClimate?.season||190)*16)}`}
                              disabled={ventilation.type==="NAT"} />
                            {VENTILATION_TYPES.find(t=>t.id===ventilation.type)?.hasHR && (
                              <Input label={t("Randament recuperare",lang)} value={ventilation.hrEfficiency} onChange={v => setVentilation(p=>({...p,hrEfficiency:v}))} type="number" unit="%" step="1" />
                            )}
                          </div>

                          {ventilation.type === "NAT" && (
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                              <div className="text-xs text-amber-400 font-medium mb-1">Ventilare naturală</div>
                              <div className="text-xs opacity-60">Se consideră rata de ventilare n = 0,5 h-1 (minimul obligatoriu). Nu se consumă energie electrică pentru ventilare, dar nu există recuperare de căldură.</div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── ILUMINAT ── */}
                  {instSubTab === "lighting" && (
                    <>
                      <Card title={t("Iluminat artificial (LENI)",lang)}>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select label={t("Tip sursă de lumină predominantă",lang)} value={lighting.type} onChange={v => setLighting(p=>({...p,type:v}))}
                              options={LIGHTING_TYPES.map(s=>({value:s.id,label:`${s.label} (${s.efficacy} lm/W)`}))} />
                            <Input label={t("Densitate putere instalată",lang)} value={lighting.pDensity} onChange={v => setLighting(p=>({...p,pDensity:v}))} type="number" unit="W/m2" step="0.1" />
                            <Select label={t("Sistem de control",lang)} value={lighting.controlType} onChange={v => setLighting(p=>({...p,controlType:v}))}
                              options={LIGHTING_CONTROL.map(s=>({value:s.id,label:s.label}))} />
                            <Input label={t("Factor control (F_C)",lang)} value={lighting.fCtrl} onChange={v => setLighting(p=>({...p,fCtrl:v}))} type="number" step="0.01" />
                            <Input label={t("Ore funcționare / an",lang)} value={lighting.operatingHours} onChange={v => setLighting(p=>({...p,operatingHours:v}))} type="number" unit="h/an" />
                            <Input label={t("Raport lumină naturală",lang)} value={lighting.naturalLightRatio} onChange={v => setLighting(p=>({...p,naturalLightRatio:v}))} type="number" unit="%" min="0" max="80" />
                          </div>

                          {instSummary && (
                            <div className="bg-white/[0.03] rounded-lg p-4 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs opacity-50">Indicator LENI calculat</span>
                                <span className="text-lg font-mono font-bold text-amber-400">
                                  {instSummary.leni.toFixed(1)} <span className="text-xs opacity-40 font-normal">kWh/(m2·an)</span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}
                </div>

                {/* ── RIGHT PANEL: SUMAR ENERGIE ── */}
                <div className="space-y-5">
                  <Card title={t("Sumar energetic",lang)} className="sticky top-6">
                    {instSummary ? (
                      <div className="space-y-4">
                        {/* Energie primară totală */}
                        <div className="text-center py-3">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Energie primară specifică</div>
                          <div className={cn("text-3xl font-bold font-mono",
                            instSummary.ep_total_m2 < 120 ? "text-emerald-400" : instSummary.ep_total_m2 < 250 ? "text-amber-400" : "text-red-400")}>
                            {instSummary.ep_total_m2.toFixed(0)}
                          </div>
                          <div className="text-xs opacity-30">kWh/(m2·an)</div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        {/* Defalcare energie finală */}
                        <div>
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Energie finală per utilitate</div>
                          {[
                            {label:"Încălzire", val:instSummary.qf_h, color:"#ef4444"},
                            {label:"ACM", val:instSummary.qf_w, color:"#f97316"},
                            {label:"Răcire", val:instSummary.qf_c, color:"#3b82f6"},
                            {label:"Ventilare", val:instSummary.qf_v, color:"#8b5cf6"},
                            {label:"Iluminat", val:instSummary.qf_l, color:"#eab308"},
                          ].map(item => {
                            const pct = instSummary.qf_total > 0 ? (item.val / instSummary.qf_total * 100) : 0;
                            return (
                              <div key={item.label} className="flex items-center gap-2 py-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:item.color}} />
                                <span className="text-xs opacity-60 w-20">{item.label}</span>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:item.color}} />
                                </div>
                                <span className="text-xs font-mono w-16 text-right">{item.val.toFixed(0)}</span>
                                <span className="text-[10px] opacity-30 w-8">{pct.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        {/* Totale */}
                        <div className="space-y-1">
                          <ResultRow label="Energie finală totală" value={instSummary.qf_total.toFixed(0)} unit="kWh/an" />
                          <ResultRow label="Energie finală specifică" value={instSummary.qf_total_m2.toFixed(1)} unit="kWh/(m2·an)" />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Energie primară totală" value={instSummary.ep_total.toFixed(0)} unit="kWh/an" />
                          <ResultRow label="Energie primară specifică" value={instSummary.ep_total_m2.toFixed(1)} unit="kWh/(m2·an)"
                            status={instSummary.ep_total_m2 < 120 ? "ok" : instSummary.ep_total_m2 < 250 ? "warn" : "fail"} />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Emisii CO2 totale" value={instSummary.co2_total.toFixed(0)} unit="kg CO2/an" />
                          <ResultRow label="Emisii CO2 specifice" value={instSummary.co2_total_m2.toFixed(1)} unit="kg CO2/(m2·an)" />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        {/* Randament global */}
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Randamente instalație încălzire</div>
                          <ResultRow label={instSummary.isCOP ? "COP/SCOP" : "eta generare"} value={parseFloat(heating.eta_gen).toFixed(2)} />
                          <ResultRow label="eta emisie" value={parseFloat(heating.eta_em).toFixed(2)} />
                          <ResultRow label="eta distribuție" value={parseFloat(heating.eta_dist).toFixed(2)} />
                          <ResultRow label="eta control" value={parseFloat(heating.eta_ctrl).toFixed(2)} />
                          <ResultRow label="eta total sistem" value={instSummary.eta_total_h.toFixed(3)}
                            status={instSummary.eta_total_h > 0.75 ? "ok" : instSummary.eta_total_h > 0.55 ? "warn" : "fail"} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">⚡</div>
                        <div className="text-xs">Completează suprafața utilă (Pas 1) și anvelopa (Pas 2) pentru a vedea rezultatele</div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 2: Anvelopă
                </button>
                <button onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 4: Regenerabile →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: REGENERABILE ═══ */}
          {step === 4 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(3)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 3</button>
                  <h2 className="text-xl font-bold">Surse regenerabile de energie</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 4 Mc 001-2022 — Solar termic, Fotovoltaic, Pompe de căldură, Biomasă, Eolian, Cogenerare</p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar">
                {[
                  {id:"solar_th",label:"Solar termic",icon:"☀️"},
                  {id:"pv",label:"Fotovoltaic",icon:"🔋"},
                  {id:"heat_pump",label:"Pompe căldură",icon:"♨️"},
                  {id:"biomass",label:"Biomasă",icon:"🌳"},
                  {id:"other",label:"Eolian/CHP",icon:"🌬️"},
                ].map(tab => (
                  <button key={tab.id} onClick={() => setRenewSubTab(tab.id)}
                    className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap min-w-[80px]",
                      renewSubTab===tab.id ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "hover:bg-white/5 border border-transparent")}>
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-5">

                  {/* ── SOLAR TERMIC ── */}
                  {renewSubTab === "solar_th" && (
                    <>
                      <Card title={t("Panouri solare termice",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={solarThermal.enabled} onChange={e => setSolarThermal(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Clădirea dispune de panouri solare termice</span>
                          </label>

                          {solarThermal.enabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Select label={t("Tip colector",lang)} value={solarThermal.type} onChange={v => setSolarThermal(p=>({...p,type:v}))}
                                options={SOLAR_THERMAL_TYPES.map(s=>({value:s.id,label:s.label}))} />
                              <Input label={t("Suprafață colectoare",lang)} value={solarThermal.area} onChange={v => setSolarThermal(p=>({...p,area:v}))} type="number" unit="m2" min="0" step="0.1" />
                              <Select label={t("Orientare",lang)} value={solarThermal.orientation} onChange={v => setSolarThermal(p=>({...p,orientation:v}))}
                                options={ORIENTATIONS.filter(o=>o!=="Orizontal")} />
                              <Select label={t("Inclinare",lang)} value={solarThermal.tilt} onChange={v => setSolarThermal(p=>({...p,tilt:v}))}
                                options={Object.keys(TILT_FACTORS).map(k=>({value:k,label:`${k}° (factor ${TILT_FACTORS[k]})`}))} />
                              <Select label={t("Utilizare",lang)} value={solarThermal.usage} onChange={v => setSolarThermal(p=>({...p,usage:v}))}
                                options={[{value:"acm",label:"Doar ACM"},{value:"heating",label:"Doar încălzire"},{value:"both",label:"ACM + Încălzire"}]} />
                              <Input label={t("Volum stocare",lang)} value={solarThermal.storageVolume} onChange={v => setSolarThermal(p=>({...p,storageVolume:v}))} type="number" unit="litri" placeholder="50-80 l/m2" />
                              <Input label={t("Randament optic (eta_0)",lang)} value={solarThermal.eta0} onChange={v => setSolarThermal(p=>({...p,eta0:v}))} type="number" step="0.01" />
                              <Input label={t("Coeficient pierderi (a1)",lang)} value={solarThermal.a1} onChange={v => setSolarThermal(p=>({...p,a1:v}))} type="number" unit="W/(m2K)" step="0.1" />
                            </div>
                          )}

                          {solarThermal.enabled && renewSummary && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs opacity-50">Producție anuală estimată</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                  {renewSummary.qSolarTh.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── FOTOVOLTAIC ── */}
                  {renewSubTab === "pv" && (
                    <>
                      <Card title={t("Panouri fotovoltaice",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={photovoltaic.enabled} onChange={e => setPhotovoltaic(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Clădirea dispune de instalație fotovoltaică</span>
                          </label>

                          {photovoltaic.enabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Select label={t("Tip celule PV",lang)} value={photovoltaic.type} onChange={v => setPhotovoltaic(p=>({...p,type:v}))}
                                options={PV_TYPES.map(s=>({value:s.id,label:`${s.label} (eta=${(s.eta*100).toFixed(0)}%)`}))} />
                              <Input label={t("Suprafață panouri",lang)} value={photovoltaic.area} onChange={v => setPhotovoltaic(p=>({...p,area:v}))} type="number" unit="m2" min="0" step="0.1" />
                              <Input label={t("Putere de varf instalată",lang)} value={photovoltaic.peakPower} onChange={v => setPhotovoltaic(p=>({...p,peakPower:v}))} type="number" unit="kWp" step="0.01" />
                              <Select label={t("Orientare",lang)} value={photovoltaic.orientation} onChange={v => setPhotovoltaic(p=>({...p,orientation:v}))}
                                options={ORIENTATIONS.filter(o=>o!=="Orizontal").concat(["Orizontal"])} />
                              <Select label={t("Inclinare",lang)} value={photovoltaic.tilt} onChange={v => setPhotovoltaic(p=>({...p,tilt:v}))}
                                options={Object.keys(TILT_FACTORS).map(k=>({value:k,label:`${k}° (factor ${TILT_FACTORS[k]})`}))} />
                              <Select label={t("Tip invertor",lang)} value={photovoltaic.inverterType} onChange={v => setPhotovoltaic(p=>({...p,inverterType:v}))}
                                options={PV_INVERTER_ETA.map(s=>({value:s.id,label:`${s.label} (${(s.eta*100).toFixed(0)}%)`}))} />
                              <Select label={t("Utilizare energie",lang)} value={photovoltaic.usage} onChange={v => setPhotovoltaic(p=>({...p,usage:v}))}
                                options={[{value:"all",label:"Toate utilitățile"},{value:"lighting",label:"Doar iluminat"},{value:"hvac",label:"HVAC + ventilare"},{value:"export",label:"Export în rețea"}]} />
                            </div>
                          )}

                          {photovoltaic.enabled && renewSummary && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs opacity-50">Producție anuală estimată</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                  {renewSummary.qPV_kWh.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-50">Producție specifică</span>
                                <span className="text-xs font-mono opacity-60">
                                  {(parseFloat(photovoltaic.peakPower) > 0 ? (renewSummary.qPV_kWh / parseFloat(photovoltaic.peakPower)).toFixed(0) : "—")} kWh/kWp/an
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── POMPE DE CĂLDURĂ ── */}
                  {renewSubTab === "heat_pump" && (
                    <>
                      <Card title={t("Pompă de căldură — componenta regenerabilă",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={heatPump.enabled} onChange={e => setHeatPump(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Încălzire/ACM prin pompă de căldură</span>
                          </label>

                          {heatPump.enabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Select label={t("Tip pompă de căldură",lang)} value={heatPump.type} onChange={v => {
                                const pc = HEAT_SOURCES.find(s=>s.id===v);
                                setHeatPump(p=>({...p,type:v,cop:pc?.eta_gen.toString()||"3.50"}));
                              }} options={HEAT_SOURCES.filter(s=>s.isCOP).map(s=>({value:s.id,label:s.label}))} />
                              <Input label={t("COP nominal",lang)} value={heatPump.cop} onChange={v => setHeatPump(p=>({...p,cop:v}))} type="number" step="0.1" />
                              <Input label={t("SCOP sezonier incalzire",lang)} value={heatPump.scopHeating} onChange={v => setHeatPump(p=>({...p,scopHeating:v}))} type="number" step="0.1"
                                placeholder={`~${(parseFloat(heatPump.cop)*0.85).toFixed(1)}`} />
                              <Select label={t("Acoperire",lang)} value={heatPump.covers} onChange={v => setHeatPump(p=>({...p,covers:v}))}
                                options={[{value:"heating",label:"Doar încălzire"},{value:"acm",label:"Doar ACM"},{value:"heating_acm",label:"Încălzire + ACM"}]} />
                              <Input label={t("Temp. bivalentă",lang)} value={heatPump.bivalentTemp} onChange={v => setHeatPump(p=>({...p,bivalentTemp:v}))} type="number" unit="°C" />
                              <Select label={t("Sursă auxiliară (bivalent)",lang)} value={heatPump.auxSource} onChange={v => setHeatPump(p=>({...p,auxSource:v}))}
                                options={HEAT_SOURCES.filter(s=>!s.isCOP).slice(0,5).map(s=>({value:s.id,label:s.label}))} />
                            </div>
                          )}

                          {heatPump.enabled && renewSummary && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs opacity-50">Energie ambientală (regenerabilă)</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                  {renewSummary.qPC_ren.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                                </span>
                              </div>
                              <div className="text-[10px] opacity-40 mt-1">
                                Fracție regenerabilă: {(parseFloat(heatPump.scopHeating||heatPump.cop) > 0 ? ((1 - 1/parseFloat(heatPump.scopHeating||heatPump.cop))*100).toFixed(0) : 0)}% din energia termică produsă
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>

                      <Card className="bg-amber-500/[0.02] border-amber-500/10">
                        <div className="text-xs text-amber-400 font-medium mb-1">Notă OAER privind Tabelul 5.17</div>
                        <div className="text-xs opacity-60">OAER a inițiat procedura de înlocuire a factorilor de conversie cu valorile din SR EN ISO 52000-1:2017/NA:2023, unde factorul pentru energia ambientală devine 0 (zero), pentru a nu dezavantaja pompele de căldură. Aplicația utilizează în prezent valorile din Mc 001-2022 original.</div>
                      </Card>
                    </>
                  )}

                  {/* ── BIOMASĂ ── */}
                  {renewSubTab === "biomass" && (
                    <>
                      <Card title={t("Biomasă",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={biomass.enabled} onChange={e => setBiomass(p=>({...p,enabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Încălzire/ACM pe biomasă</span>
                          </label>

                          {biomass.enabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Select label={t("Tip combustibil biomasă",lang)} value={biomass.type} onChange={v => setBiomass(p=>({...p,type:v}))}
                                options={BIOMASS_TYPES.map(s=>({value:s.id,label:`${s.label} (PCI=${s.pci} MJ/kg)`}))} />
                              <Input label={t("Randament cazan",lang)} value={biomass.boilerEta} onChange={v => setBiomass(p=>({...p,boilerEta:v}))} type="number" step="0.01" />
                              <Input label={t("Putere nominală",lang)} value={biomass.power} onChange={v => setBiomass(p=>({...p,power:v}))} type="number" unit="kW" />
                              <Select label={t("Acoperire",lang)} value={biomass.covers} onChange={v => setBiomass(p=>({...p,covers:v}))}
                                options={[{value:"heating",label:"Doar încălzire"},{value:"acm",label:"Doar ACM"},{value:"heating_acm",label:"Încălzire + ACM"}]} />
                              <Input label={t("Consum anual (opțional)",lang)} value={biomass.annualConsumption} onChange={v => setBiomass(p=>({...p,annualConsumption:v}))} type="number" unit="tone/an"
                                placeholder="auto din necesar" className="col-span-2" />
                            </div>
                          )}

                          {biomass.enabled && renewSummary && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs opacity-50">Energie regenerabilă (fP_ren=0.80)</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                  {renewSummary.qBio_ren.toFixed(0)} <span className="text-xs opacity-40 font-normal">kWh/an</span>
                                </span>
                              </div>
                              <div className="text-xs opacity-40 mt-1">
                                Energie totală biomasă: {renewSummary.qBio_total.toFixed(0)} kWh/an | Emisii CO2: 0 (biogenic net)
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}

                  {/* ── EOLIAN / COGENERARE ── */}
                  {renewSubTab === "other" && (
                    <>
                      <Card title={t("Energie eoliană",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={otherRenew.windEnabled} onChange={e => setOtherRenew(p=>({...p,windEnabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Turbină eoliană</span>
                          </label>
                          {otherRenew.windEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Input label={t("Capacitate instalată",lang)} value={otherRenew.windCapacity} onChange={v => setOtherRenew(p=>({...p,windCapacity:v}))} type="number" unit="kW" />
                              <Input label={t("Producție anuală estimată",lang)} value={otherRenew.windProduction} onChange={v => setOtherRenew(p=>({...p,windProduction:v}))} type="number" unit="kWh/an" />
                            </div>
                          )}
                        </div>
                      </Card>

                      <Card title={t("Cogenerare (CHP)",lang)}>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={otherRenew.cogenEnabled} onChange={e => setOtherRenew(p=>({...p,cogenEnabled:e.target.checked}))} className="accent-emerald-500" />
                            <span className="font-medium">Sistem de cogenerare</span>
                          </label>
                          {otherRenew.cogenEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <Input label={t("Producție electrică anuală",lang)} value={otherRenew.cogenElectric} onChange={v => setOtherRenew(p=>({...p,cogenElectric:v}))} type="number" unit="kWh/an" />
                              <Input label={t("Producție termică anuală",lang)} value={otherRenew.cogenThermal} onChange={v => setOtherRenew(p=>({...p,cogenThermal:v}))} type="number" unit="kWh/an" />
                              <Select label={t("Combustibil CHP",lang)} value={otherRenew.cogenFuel} onChange={v => setOtherRenew(p=>({...p,cogenFuel:v}))}
                                options={FUELS.slice(0,4).map(f=>({value:f.id,label:f.label}))} />
                            </div>
                          )}
                        </div>
                      </Card>
                    </>
                  )}
                </div>

                {/* ── RIGHT PANEL: SUMAR REGENERABILE ── */}
                <div className="space-y-5">
                  <Card title={t("Sumar regenerabile",lang)} className="sticky top-6">
                    {renewSummary ? (
                      <div className="space-y-4">
                        <div className="text-center py-3">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Rata Energie Regenerabilă (RER)</div>
                          <div className={cn("text-3xl font-bold font-mono",
                            renewSummary.rer >= 30 ? "text-emerald-400" : renewSummary.rer > 10 ? "text-amber-400" : "text-red-400")}>
                            {renewSummary.rer.toFixed(1)}%
                          </div>
                          <div className="text-xs opacity-30 mt-1">{renewSummary.rer >= 30 ? "nZEB conform" : "sub 30% minim nZEB"}</div>
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div>
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Producție per sursă</div>
                          {[
                            {label:"Solar termic", val:renewSummary.qSolarTh, enabled:solarThermal.enabled, color:"#f59e0b"},
                            {label:"Fotovoltaic", val:renewSummary.qPV_kWh, enabled:photovoltaic.enabled, color:"#3b82f6"},
                            {label:"PC ambientală", val:renewSummary.qPC_ren, enabled:heatPump.enabled, color:"#8b5cf6"},
                            {label:"Biomasă", val:renewSummary.qBio_ren, enabled:biomass.enabled, color:"#22c55e"},
                            {label:"Eolian", val:renewSummary.qWind, enabled:otherRenew.windEnabled, color:"#06b6d4"},
                          ].filter(i=>i.enabled).map(item => {
                            const pct = renewSummary.totalRenewable > 0 ? (item.val / renewSummary.totalRenewable * 100) : 0;
                            return (
                              <div key={item.label} className="flex items-center gap-2 py-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:item.color}} />
                                <span className="text-xs opacity-60 flex-1">{item.label}</span>
                                <span className="text-xs font-mono w-20 text-right">{item.val.toFixed(0)} kWh</span>
                              </div>
                            );
                          })}
                          {!solarThermal.enabled && !photovoltaic.enabled && !heatPump.enabled && !biomass.enabled && !otherRenew.windEnabled && (
                            <div className="text-xs opacity-30 text-center py-2">Nicio sursă regenerabilă activată</div>
                          )}
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <ResultRow label="Total regenerabil" value={renewSummary.totalRenewable.toFixed(0)} unit="kWh/an" />
                          <ResultRow label="Regenerabil specific" value={renewSummary.totalRenewable_m2.toFixed(1)} unit="kWh/(m²·an)" />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Energie primară ajustată</div>
                          <ResultRow label="Ep fără regenerabile" value={(instSummary?.ep_total_m2||0).toFixed(1)} unit="kWh/(m²·an)" />
                          <ResultRow label="Reducere din regenerabile" value={renewSummary.ep_reduction > 0 ? `-${(renewSummary.ep_reduction / (parseFloat(building.areaUseful)||1)).toFixed(1)}` : "0"} unit="kWh/(m²·an)" status="ok" />
                          <ResultRow label="Ep ajustată" value={renewSummary.ep_adjusted_m2.toFixed(1)} unit="kWh/(m²·an)"
                            status={renewSummary.ep_adjusted_m2 < 120 ? "ok" : renewSummary.ep_adjusted_m2 < 250 ? "warn" : "fail"} />
                        </div>

                        <div className="h-px bg-white/[0.06]" />

                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">CO2 ajustat</div>
                          <ResultRow label="CO2 fără regenerabile" value={(instSummary?.co2_total_m2||0).toFixed(1)} unit="kg/(m2an)" />
                          <ResultRow label="CO2 ajustat" value={renewSummary.co2_adjusted_m2.toFixed(1)} unit="kg/(m2an)" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 opacity-30">
                        <div className="text-3xl mb-2">☀️</div>
                        <div className="text-xs">Completează pașii anteriori pentru a vedea impactul surselor regenerabile</div>
                      </div>
                    )}
                  </Card>

                  {/* nZEB check */}
                  {renewSummary && (() => {
                    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                    const isNzeb = renewSummary.rer >= nzeb.rer_min && renewSummary.ep_adjusted_m2 < nzeb.ep_max;
                    return (
                    <Card title={t("Verificare nZEB",lang)} className={isNzeb ? "border-emerald-500/20" : "border-red-500/20"}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-60">RER &ge; {nzeb.rer_min}%</span>
                          <span className={cn("text-xs font-medium", renewSummary.rer >= nzeb.rer_min ? "text-emerald-400" : "text-red-400")}>
                            {renewSummary.rer >= nzeb.rer_min ? "DA" : "NU"} ({renewSummary.rer.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-60">Ep &lt; {nzeb.ep_max} kWh/(m²an)</span>
                          <span className={cn("text-xs font-medium", renewSummary.ep_adjusted_m2 < nzeb.ep_max ? "text-emerald-400" : "text-red-400")}>
                            {renewSummary.ep_adjusted_m2 < nzeb.ep_max ? "DA" : "NU"} ({renewSummary.ep_adjusted_m2.toFixed(1)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-xs font-medium">Statut nZEB</span>
                          <Badge color={isNzeb ? "green" : "red"}>
                            {isNzeb ? "CONFORM" : "NECONFORM"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                    );
                  })()}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 3: Instalații
                </button>
                <button onClick={() => setStep(5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 5: Calcul energetic →
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: CALCUL ENERGETIC & CLASARE ═══ */}
          {step === 5 && (() => {
            const Au = parseFloat(building.areaUseful) || 0;
            const catKey = building.category + (
              ["RI","RC","RA"].includes(building.category)
                ? (cooling.hasCooling ? "_cool" : "_nocool")
                : ""
            );
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, building.category);
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const rer = renewSummary?.rer || 0;

            // C5 FIX: Bilanț lunar — use monthlyISO when available
            const months = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
            const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
            const tInt = parseFloat(heating.theta_int) || 20;
            const monthlyData = months.map((m,i) => {
              const tExt = selectedClimate?.temp_month?.[i] ?? 5;
              const deltaT = Math.max(0, tInt - tExt);
              if (monthlyISO && monthlyISO[i]) {
                return { month:m, tExt, deltaT, qLoss: monthlyISO[i].qLoss || 0, solarGain: monthlyISO[i].solarGain || 0, intGain: monthlyISO[i].intGain || 0, qHeat: monthlyISO[i].qH_nd, qCool: monthlyISO[i].qC_nd };
              }
              const G = envelopeSummary?.G || 0.5;
              const V = parseFloat(building.volume) || 100;
              const qLoss = G * V * deltaT * monthDays[i] * 24 / 1000;
              const solarGain = (selectedClimate?.solar?.S || 400) / 12 * 0.15 * Au * (deltaT > 0 ? 0.8 : 0.3);
              const intGain = Au * 5 * monthDays[i] * 12 / 1000;
              const gamma = qLoss > 0 ? (solarGain + intGain) / qLoss : 0;
              const tau_h = envelopeSummary?.G ? (Au * 80000) / ((envelopeSummary.G * V + 0.34 * 0.5 * V) * 3600) : 15;
              const a = 1 + tau_h / 15;
              const etaH = gamma !== 1 ? (1 - Math.pow(gamma, a)) / (1 - Math.pow(gamma, a+1)) : a/(a+1);
              const qHeat = Math.max(0, qLoss - etaH * (solarGain + intGain));
              const qCool = deltaT <= 0 ? Math.max(0, (solarGain + intGain) * 0.3) : 0;
              return { month:m, tExt, deltaT, qLoss, solarGain, intGain, qHeat, qCool };
            });
            const annualHeat = monthlyData.reduce((s,d) => s + d.qHeat, 0);
            const annualCool = monthlyData.reduce((s,d) => s + d.qCool, 0);
            const maxQ = Math.max(...monthlyData.map(d => Math.max(d.qLoss, d.qHeat)));

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(4)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 4</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Global energy calculation & Classification":"Calcul energetic global & Clasare"}</h2>
                </div>
                <p className="text-xs opacity-40">Capitolul 5 Mc 001-2022 — Bilanț energetic, conversie energie primară, clasare A+ — G</p>
              </div>

              {/* ── CLASARE ENERGETICĂ — HERO ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Clasa energetică */}
                <Card className="text-center py-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">{lang==="EN"?"Energy class":"Clasa energetică"}</div>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-4xl font-black mb-3"
                    style={{backgroundColor: enClass.color + "25", color: enClass.color, border:`2px solid ${enClass.color}50`}}>
                    {enClass.cls}
                  </div>
                  <div className="text-2xl font-bold font-mono" style={{color:enClass.color}}>{epFinal.toFixed(1)}</div>
                  <div className="text-xs opacity-40">kWh/(m2·an) energie primară</div>
                  <div className="text-xs opacity-30 mt-1">Nota energetică: {enClass.score}/100</div>

                  {/* Scală oficială clasare */}
                  <div className="mt-4">
                    <svg viewBox="0 0 280 120" width="100%" height="115">
                      {CLASS_LABELS.map(function(cls, i) {
                        var barW = 55 + (7-i) * 20;
                        var y = i * 14 + 2;
                        var isA = i === enClass.idx;
                        return (
                          <g key={cls}>
                            <rect x="5" y={y} width={barW} height="12" fill={CLASS_COLORS[i]} rx="1" opacity={isA ? 1 : 0.35}/>
                            <text x="10" y={y+9} fontSize="7" fill="white" fontWeight="bold">{cls}</text>
                            {isA && (<g><polygon points={(barW+8)+","+(y+1)+" "+(barW+20)+","+(y+6)+" "+(barW+8)+","+(y+11)} fill={CLASS_COLORS[i]}/><rect x={barW+20} y={y-1} width="55" height="14" fill={CLASS_COLORS[i]} rx="2"/><text x={barW+47} y={y+9} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{epFinal.toFixed(1)}</text></g>)}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Scala claselor */}
                  <div className="mt-5 px-4">
                    {grid && CLASS_LABELS.map((cls, i) => {
                      const isActive = i === enClass.idx;
                      const low = i === 0 ? 0 : grid.thresholds[i-1];
                      const high = i < grid.thresholds.length ? grid.thresholds[i] : "∞";
                      return (
                        <div key={cls} className={cn("flex items-center gap-2 py-1 px-2 rounded transition-all text-xs",
                          isActive ? "bg-white/10 scale-105" : "opacity-50")}>
                          <div className="w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                            style={{backgroundColor:CLASS_COLORS[i]}}>{cls}</div>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            {isActive && <div className="h-full rounded-full" style={{backgroundColor:CLASS_COLORS[i], width:"100%"}} />}
                          </div>
                          <span className="font-mono text-[10px] w-20 text-right opacity-60">{low} — {high}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Clasa de mediu (CO2) */}
                <Card className="text-center py-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">{lang==="EN"?"Environmental class (CO2)":"Clasa de mediu (CO2)"}</div>
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-4xl font-black mb-3"
                    style={{backgroundColor: co2Class.color + "25", color: co2Class.color, border:`2px solid ${co2Class.color}50`}}>
                    {co2Class.cls}
                  </div>
                  <div className="text-2xl font-bold font-mono" style={{color:co2Class.color}}>{co2Final.toFixed(1)}</div>
                  <div className="text-xs opacity-40">kg CO2/(m2·an)</div>
                  <div className="text-xs opacity-30 mt-1">Nota de mediu: {co2Class.score}/100</div>

                  {/* nZEB & RER status */}
                  <div className="mt-5 px-4 space-y-2">
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">RER (regenerabile)</span>
                      <Badge color={rer >= 30 ? "green" : "red"}>{rer.toFixed(1)}%</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Statut nZEB</span>
                      {(() => { const nz = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL; const ok = rer >= nz.rer_min && epFinal < nz.ep_max; return (
                      <Badge color={ok ? "green" : "red"}>
                        {ok ? "CONFORM" : "NECONFORM"}
                      </Badge>
                      ); })()}
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs opacity-60">Grilă aplicată</span>
                      <span className="text-xs font-medium">{grid?.label || catKey}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── BILANȚ LUNAR ── */}
              <Card title={t("Bilanț energetic lunar (metoda quasi-staționară)",lang)} className="mb-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Bar chart */}
                    <div className="flex items-end gap-1 h-48 mb-2 px-2">
                      {monthlyData.map((d,i) => {
                        const heatPct = maxQ > 0 ? (d.qHeat / maxQ * 100) : 0;
                        const lossPct = maxQ > 0 ? (d.qLoss / maxQ * 100) : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.month}: Pierderi=${d.qLoss.toFixed(0)}, Necesar=${d.qHeat.toFixed(0)} kWh`}>
                            <div className="w-full flex flex-col items-center justify-end" style={{height:"192px"}}>
                              <div className="w-full rounded-t" style={{height:`${lossPct}%`, backgroundColor:"rgba(239,68,68,0.15)", minHeight: lossPct > 0 ? "2px" : "0"}} />
                              <div className="w-full rounded-t -mt-px" style={{height:`${heatPct}%`, backgroundColor:"#ef4444", minHeight: heatPct > 0 ? "2px" : "0"}} />
                            </div>
                            <span className="text-[9px] opacity-40 mt-1">{d.month}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] opacity-40 px-2">
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500 inline-block" /> Necesar incalzire</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500/20 inline-block" /> Pierderi totale</span>
                    </div>

                    {/* Tabel lunar */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-1.5 px-1 opacity-40 font-medium">Luna</th>
                            {months.map(m => <th key={m} className="text-center py-1.5 px-1 opacity-40 font-medium">{m}</th>)}
                            <th className="text-center py-1.5 px-1 opacity-60 font-semibold">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">T ext [°C]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1">{d.tExt.toFixed(1)}</td>)}
                            <td className="text-center py-1 px-1 font-medium">{selectedClimate?.theta_a || "—"}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q pierderi [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1">{d.qLoss.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium">{monthlyData.reduce((s,d)=>s+d.qLoss,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q solar [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1 text-amber-400/70">{d.solarGain.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium text-amber-400/70">{monthlyData.reduce((s,d)=>s+d.solarGain,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 px-1 opacity-50">Q intern [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1 px-1 text-purple-400/70">{d.intGain.toFixed(0)}</td>)}
                            <td className="text-center py-1 px-1 font-medium text-purple-400/70">{monthlyData.reduce((s,d)=>s+d.intGain,0).toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-white/10 bg-red-500/5">
                            <td className="py-1.5 px-1 font-semibold text-red-400">Q incalzire [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1.5 px-1 text-red-400 font-medium">{d.qHeat.toFixed(0)}</td>)}
                            <td className="text-center py-1.5 px-1 font-bold text-red-400">{annualHeat.toFixed(0)}</td>
                          </tr>
                          <tr className="bg-blue-500/5">
                            <td className="py-1.5 px-1 font-semibold text-blue-400">Q racire [kWh]</td>
                            {monthlyData.map((d,i) => <td key={i} className="text-center py-1.5 px-1 text-blue-400 font-medium">{d.qCool.toFixed(0)}</td>)}
                            <td className="text-center py-1.5 px-1 font-bold text-blue-400">{annualCool.toFixed(0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>


              {/* ── Benchmarking — comparație cu referințe ── */}
              {instSummary && (
                <Card title={lang==="EN"?"Benchmarking vs. reference buildings":"Benchmarking — comparație referințe"} className="mb-6">
                  <div className="space-y-2">
                    {(function() {
                      const cat = building.category || "RI";
                      const isRes = ["RI","RC","RA"].includes(cat);
                      const nzebEp = (NZEB_THRESHOLDS[cat] || NZEB_THRESHOLDS.RI).ep_max;
                      return isRes ? [
                        {label:"Clădire veche neizolată (pre-1990)",ep:350,co2:45},
                        {label:"Clădire izolată parțial (1990-2010)",ep:180,co2:25},
                        {label:"Clădire conformă 2010-2020",ep:120,co2:15},
                        {label:"Standard nZEB (2021+)",ep:nzebEp,co2:8},
                        {label:"Pasivhaus",ep:40,co2:4},
                      ] : [
                        {label:"Clădire veche neizolată (pre-1990)",ep:450,co2:55},
                        {label:"Clădire izolată parțial (1990-2010)",ep:250,co2:30},
                        {label:"Clădire conformă 2010-2020",ep:160,co2:18},
                        {label:"Standard nZEB (2021+)",ep:nzebEp,co2:10},
                        {label:"Best practice",ep:60,co2:5},
                      ];
                    })().map(function(ref,i) {
                      var myEp = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
                      var maxEp = 400;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[10px] opacity-50 w-40 shrink-0 truncate">{ref.label}</span>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="h-full rounded-full opacity-40" style={{width:Math.min(100,ref.ep/maxEp*100)+"%",backgroundColor:"#666"}}/>
                            <div className="absolute top-0 left-0 h-full w-0.5 bg-amber-500" style={{left:Math.min(100,myEp/maxEp*100)+"%"}}/>
                          </div>
                          <span className="text-[10px] font-mono opacity-40 w-10 text-right">{ref.ep}</span>
                        </div>
                      );
                    })}
                    <div className="text-[10px] opacity-30 mt-1">Linia amber = clădirea dvs. ({(renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2).toFixed(0)} kWh/m2a) | Bare gri = referințe tipice</div>
                  </div>
                </Card>
              )}


              {/* ── BENCHMARK COMPARATIV — medie națională ── */}
              {instSummary && renewSummary && (() => {
                const bm = BENCHMARKS[building.category] || BENCHMARKS.AL;
                const epF = renewSummary.ep_adjusted_m2;
                const co2F = renewSummary.co2_adjusted_m2;
                const pctVsAvg = bm.avgEp > 0 ? Math.round((1 - epF / bm.avgEp) * 100) : 0;
                return (
                <Card title={lang==="EN"?"Benchmark — national average":"Benchmark — medie națională"} className="mb-6 border-blue-500/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold text-amber-400">{epF.toFixed(0)}</div>
                      <div className="text-[9px] opacity-40">Ep clădire</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold opacity-50">{bm.avgEp}</div>
                      <div className="text-[9px] opacity-40">Ep medie {bm.label}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-lg font-bold text-emerald-400">{bm.bestEp}</div>
                      <div className="text-[9px] opacity-40">Best in class</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className={cn("text-lg font-bold", pctVsAvg > 0 ? "text-emerald-400" : "text-red-400")}>{pctVsAvg > 0 ? "-" : "+"}{Math.abs(pctVsAvg)}%</div>
                      <div className="text-[9px] opacity-40">vs medie</div>
                    </div>
                  </div>
                  {/* Vizual bar benchmark */}
                  <svg viewBox="0 0 400 50" width="100%" height="45" className="overflow-visible">
                    <rect x="0" y="20" width="400" height="10" rx="5" fill={theme==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} />
                    <rect x="0" y="20" width={Math.min(400, epF / bm.worstEp * 400)} height="10" rx="5" fill={epF < bm.avgEp ? "#22c55e" : epF < bm.worstEp * 0.7 ? "#eab308" : "#ef4444"} opacity="0.8" />
                    {/* Markers */}
                    <line x1={bm.bestEp/bm.worstEp*400} y1="16" x2={bm.bestEp/bm.worstEp*400} y2="34" stroke="#22c55e" strokeWidth="2" />
                    <text x={bm.bestEp/bm.worstEp*400} y="13" textAnchor="middle" fontSize="7" fill="#22c55e">Best {bm.bestEp}</text>
                    <line x1={bm.avgEp/bm.worstEp*400} y1="16" x2={bm.avgEp/bm.worstEp*400} y2="34" stroke="#888" strokeWidth="2" strokeDasharray="3 2" />
                    <text x={bm.avgEp/bm.worstEp*400} y="44" textAnchor="middle" fontSize="7" fill="#888">Medie {bm.avgEp}</text>
                    <circle cx={Math.min(395, epF/bm.worstEp*400)} cy="25" r="5" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                    <text x={Math.min(395, epF/bm.worstEp*400)} y="13" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="bold">{epF.toFixed(0)}</text>
                  </svg>
                  <div className="text-[9px] opacity-30 mt-1">Stoc {bm.label}: {bm.stock} clădiri | An mediu constr.: {bm.avgYear} | {bm.nzebPct}% nZEB</div>
                </Card>
                );
              })()}

              {/* ── A/V FACTOR VALIDATION ── */}
              {avValidation && avValidation.msg && (
                <div className={cn("mb-4 p-3 rounded-xl border text-xs flex items-center gap-2",
                  avValidation.status === "high" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                )}>
                  <span>⚠</span> {avValidation.msg}
                </div>
              )}

              {/* ── GRAFIC AMORTIZARE INVESTIȚIE (NPV 20 ani) ── */}
              {instSummary && renewSummary && envelopeSummary && (() => {
                const Au = parseFloat(building.areaUseful) || 1;
                const costKwh = instSummary.fuel?.id === "electricitate" ? 1.30 : instSummary.fuel?.id === "gaz" ? 0.32 : 0.30;
                const annualCost = (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) * costKwh;
                const measures = [
                  { name: "Termoizolație pereți", cost: Au * 45, savePct: 0.18, color: "#3b82f6" },
                  { name: "Ferestre triple", cost: Au * 0.15 * 250, savePct: 0.12, color: "#8b5cf6" },
                  { name: "Termoizolație acoperiș", cost: Au * 0.3 * 35, savePct: 0.10, color: "#06b6d4" },
                  { name: "Pompă de căldură", cost: 12000, savePct: 0.30, color: "#22c55e" },
                  { name: "PV 5kWp", cost: 5000, savePct: 0.15, color: "#f59e0b" },
                ];
                const discount = 0.05;
                const years = 20;
                return (
                <Card title={lang==="EN"?"Investment payback (NPV 20 years)":"Amortizare investiție (NPV 20 ani)"} className="mb-6 border-amber-500/20">
                  <div className="overflow-x-auto">
                  <svg viewBox="0 0 500 200" width="100%" height="180" className="overflow-visible">
                    {/* Grid */}
                    {[0,1,2,3,4].map(i => {
                      const y = 170 - i * 35;
                      return <g key={"g"+i}><line x1="60" y1={y} x2="490" y2={y} stroke={theme==="dark"?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"} /><text x="56" y={y+3} textAnchor="end" fontSize="7" fill="#666">{(i*25)}%</text></g>;
                    })}
                    {/* Year labels */}
                    {[0,5,10,15,20].map(yr => {
                      const x = 60 + yr/20*430;
                      return <text key={"y"+yr} x={x} y={186} textAnchor="middle" fontSize="7" fill="#666">{yr}</text>;
                    })}
                    <text x="275" y="198" textAnchor="middle" fontSize="8" fill="#888">Ani</text>
                    {/* Cumulative savings lines per measure */}
                    {measures.map((m, mi) => {
                      const annSave = annualCost * m.savePct;
                      const points = [];
                      let cumNPV = -m.cost;
                      for (let yr = 0; yr <= years; yr++) {
                        if (yr > 0) cumNPV += annSave / Math.pow(1 + discount, yr);
                        const x = 60 + yr/years*430;
                        const pct = (cumNPV / m.cost) * 100;
                        const y = 170 - Math.max(-35, Math.min(140, (pct + 100) / 200 * 140));
                        points.push(`${x},${y}`);
                      }
                      const paybackYr = m.cost > 0 && annSave > 0 ? Math.ceil(m.cost / annSave) : 99;
                      return <g key={"m"+mi}>
                        <polyline points={points.join(" ")} fill="none" stroke={m.color} strokeWidth="1.5" opacity="0.8" />
                        <text x="492" y={parseFloat(points[points.length-1].split(",")[1])+3} fontSize="6" fill={m.color}>{m.name.slice(0,12)}</text>
                        {paybackYr <= 20 && <circle cx={60+paybackYr/20*430} cy={170-0} r="3" fill={m.color} />}
                      </g>;
                    })}
                    {/* Zero line */}
                    <line x1="60" y1="170" x2="490" y2="170" stroke="#666" strokeWidth="0.5" strokeDasharray="4 2" />
                    <text x="56" y="173" textAnchor="end" fontSize="7" fill="#f59e0b">0</text>
                  </svg>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {measures.map((m,i) => {
                      const payback = annualCost * m.savePct > 0 ? Math.ceil(m.cost / (annualCost * m.savePct)) : "—";
                      return <div key={i} className="flex items-center gap-1.5 text-[9px]">
                        <div className="w-2 h-2 rounded-full" style={{background:m.color}} />
                        <span className="opacity-60">{m.name}:</span>
                        <span className="font-bold">{payback} ani</span>
                      </div>;
                    })}
                  </div>
                  <div className="text-[9px] opacity-25 mt-1">NPV cu rată discount 5%/an, prețuri constante {(costKwh).toFixed(2)} RON/kWh</div>
                </Card>
                );
              })()}

              {/* ── CONFORMITATE nZEB / ZEB / L.238/2024 ── */}
              {instSummary && renewSummary && (
                <Card title={lang==="EN"?"Regulatory compliance":"Conformitate normativă"} className="mb-6 border-amber-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* nZEB */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                      var epF = renewSummary.ep_adjusted_m2;
                      var isN = epF <= nzeb.ep_max && renewSummary.rer >= nzeb.rer_min;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isN ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                          <div className="text-2xl font-black mb-1" style={{color:isN?"#22c55e":"#ef4444"}}>{isN?"✓":"✗"}</div>
                          <div className="text-xs font-bold">nZEB</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{nzeb.ep_max} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">RER: {renewSummary.rer.toFixed(0)}/{nzeb.rer_min}%</div>
                        </div>
                      );
                    })()}
                    
                    {/* ZEB readiness */}
                    {(() => {
                      var nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                      var zebMax = nzeb.ep_max * ZEB_FACTOR;
                      var epF = renewSummary.ep_adjusted_m2;
                      var hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                      var isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;
                      return (
                        <div className={cn("p-4 rounded-xl border text-center", isZEB ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]")}>
                          <div className="text-2xl font-black mb-1" style={{color:isZEB?"#22c55e":"#888"}}>{isZEB?"✓":"—"}</div>
                          <div className="text-xs font-bold">{lang==="EN"?"ZEB Ready":"ZEB Ready"}</div>
                          <div className="text-[10px] opacity-50 mt-1">EP: {epF.toFixed(0)}/{zebMax.toFixed(0)} kWh/m²a</div>
                          <div className="text-[10px] opacity-50">{hasFossil ? (lang==="EN"?"Fossil fuel on-site":"Combustibil fosil on-site") : (lang==="EN"?"No fossil":"Fără fosil")}</div>
                          <div className="text-[9px] opacity-30 mt-1">EPBD IV Art.11 — 2028/2030</div>
                        </div>
                      );
                    })()}
                    
                    {/* RER decomposition L.238/2024 */}
                    <div className={cn("p-4 rounded-xl border text-center", renewSummary.rerOnSiteOk && renewSummary.rerTotalOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                      <div className="text-2xl font-black mb-1" style={{color:renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"#22c55e":"#eab308"}}>{renewSummary.rerOnSiteOk && renewSummary.rerTotalOk?"✓":"⚠"}</div>
                      <div className="text-xs font-bold">RER L.238/2024</div>
                      <div className="text-[10px] opacity-50 mt-1">On-site: {renewSummary.rerOnSite.toFixed(1)}% / min 10%</div>
                      <div className="text-[10px] opacity-50">Total: {renewSummary.rer.toFixed(1)}% / min 30%</div>
                      <div className="text-[9px] opacity-30 mt-1">Art.17 L.372/2005 mod. L.238/2024</div>
                    </div>
                  </div>
                  
                  {/* Solar obligation indicator */}
                  {["BI","ED","SA","HC","CO","SP"].includes(building.category) && parseFloat(building.areaUseful) > 250 && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
                      <span className="text-xl">☀️</span>
                      <div>
                        <div className="text-xs font-bold text-amber-400">{lang==="EN"?"Solar installation obligation":"Obligație instalație solară"}</div>
                        <div className="text-[10px] opacity-50">{lang==="EN"?"EPBD IV Art.10: mandatory for non-residential >250m² by end 2026":"EPBD IV Art.10: obligatoriu pt. non-rezidențial >250m² de la sfârșitul 2026"}</div>
                        <div className="text-[10px] opacity-50">{photovoltaic.enabled || solarThermal.enabled ? "✓ Instalație solară configurată" : "⚠ Nicio instalație solară configurată"}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* GWP lifecycle — calcul simplificat */}
                  {(() => {
                    const gwpManual = parseFloat(building.gwpLifecycle) || 0;
                    const co2Op = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
                    // Embodied carbon estimate: ~8-12 kgCO2eq/m²/an for 50yr lifecycle (EN 15978)
                    // Simplified: residential ~10, non-residential ~12, renovation ~5
                    const yearBuilt = parseInt(building.yearBuilt) || 2000;
                    const isNew = yearBuilt >= 2020;
                    const embodiedEst = isNew ? (["RI","RC","RA"].includes(building.category) ? 10 : 12) : 5;
                    const gwpCalc = gwpManual > 0 ? gwpManual : (co2Op + embodiedEst);
                    const gwpLimit = 50; // EPBD IV indicative threshold
                    const obligatory = Au > 1000 || (["BI","ED","SA","HC","CO","SP"].includes(building.category) && Au > 250);
                    return (
                    <div className={cn("mt-3 p-3 rounded-lg border flex items-center gap-3", 
                      obligatory ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/[0.02]")}>
                      <span className="text-xl">{obligatory ? "🌍" : <span className="opacity-30">🌍</span>}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium opacity-60">GWP Lifecycle (kg CO₂eq/m²/an)</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-lg font-bold" style={{color: gwpCalc < 30 ? "#22c55e" : gwpCalc < gwpLimit ? "#eab308" : "#ef4444"}}>{gwpCalc.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">
                            = CO₂ operațional ({co2Op.toFixed(1)}) + carbon înglobat ({gwpManual > 0 ? "manual" : "~" + embodiedEst + " est."})
                          </div>
                        </div>
                        <div className="text-[9px] opacity-30 mt-1">
                          EPBD IV Art.7 {obligatory ? "— OBLIGATORIU pt. această clădire" : "— opțional (obligatoriu >1000m² din 2028)"} | Estimare conform EN 15978
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </Card>
              )}

              {monthlyISO && (
                <Card title={t("Bilanț termic lunar ISO 13790",lang)} className="mb-6">
                  <div className="text-[10px] text-amber-500/60 mb-1 sm:hidden text-center">↔ Glisează orizontal pentru tabelul complet</div>
                  <div className="relative">
                    <div className="overflow-x-auto rounded-lg" style={{WebkitOverflowScrolling:"touch",scrollbarWidth:"thin"}}>
                    <table className="w-full text-xs" style={{minWidth:"640px"}}><thead><tr className="border-b border-white/10">
                      <th className="text-left py-2 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa",minWidth:"36px"}}>Luna</th><th className="text-right px-1">θ ext</th><th className="text-right px-1">Q_tr</th><th className="text-right px-1">Q_ve</th><th className="text-right px-1">Q_int</th><th className="text-right px-1">Q_sol</th><th className="text-right px-1">γ_H</th><th className="text-right px-1">η_H</th><th className="text-right px-1 font-bold">Q_H,nd</th><th className="text-right px-1">Q_C,nd</th>
                    </tr></thead><tbody>
                      {monthlyISO.map((m, i) => (<tr key={i} className="border-b border-white/5"><td className="py-1 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa"}}>{m.name}</td><td className="text-right px-1 opacity-50">{m.tExt.toFixed(1)}</td><td className="text-right px-1">{m.Q_tr.toFixed(0)}</td><td className="text-right px-1">{m.Q_ve.toFixed(0)}</td><td className="text-right px-1 text-green-400/70">{m.Q_int.toFixed(0)}</td><td className="text-right px-1 text-amber-400/70">{m.Q_sol.toFixed(0)}</td><td className="text-right px-1 opacity-40">{m.gamma_H.toFixed(2)}</td><td className="text-right px-1 opacity-40">{m.eta_H.toFixed(2)}</td><td className="text-right px-1 font-bold text-red-400">{m.qH_nd.toFixed(0)}</td><td className="text-right px-1 text-blue-400">{m.qC_nd.toFixed(0)}</td></tr>))}
                      <tr className="border-t border-white/20 font-bold"><td className="py-2 px-1 sticky left-0 z-10" style={{background:theme==="dark"?"#0d0d20":"#f5f7fa"}}>TOTAL</td><td></td><td className="text-right px-1">{monthlyISO.reduce((s,m)=>s+m.Q_tr,0).toFixed(0)}</td><td className="text-right px-1">{monthlyISO.reduce((s,m)=>s+m.Q_ve,0).toFixed(0)}</td><td className="text-right px-1 text-green-400">{monthlyISO.reduce((s,m)=>s+m.Q_int,0).toFixed(0)}</td><td className="text-right px-1 text-amber-400">{monthlyISO.reduce((s,m)=>s+m.Q_sol,0).toFixed(0)}</td><td></td><td></td><td className="text-right px-1 text-red-400">{monthlyISO.reduce((s,m)=>s+m.qH_nd,0).toFixed(0)}</td><td className="text-right px-1 text-blue-400">{monthlyISO.reduce((s,m)=>s+m.qC_nd,0).toFixed(0)}</td></tr>
                    </tbody></table>
                    </div>
                  </div>
                  <div className="text-[10px] opacity-30 mt-2">Valori kWh — metoda lunară SR EN ISO 13790 | Factori NA:2023</div>
                </Card>
              )}



              {/* ── GRAFIC LUNAR CONSUM ── */}
              {monthlyBreakdown && (
                <Card title={t("Profil lunar consum energie",lang)} className="mb-6">
                  <svg viewBox="0 0 660 180" width="100%" height="170" className="overflow-visible">
                    {(() => {
                      var data = monthlyBreakdown, maxQ = Math.max.apply(null, data.map(function(m){return m.qf_total}))||1;
                      var bW=38, gap=16, cH=130, bY=155, oX=30, els=[];
                      for(var t=0;t<=4;t++){var y=bY-(t/4)*cH; els.push(<line key={"yg"+t} x1={oX} y1={y} x2={oX+12*(bW+gap)} y2={y} stroke="#222" strokeWidth="0.5"/>); els.push(<text key={"yl"+t} x={oX-4} y={y+3} textAnchor="end" fontSize="6" fill="#555">{Math.round(maxQ*t/4)}</text>);}
                      data.forEach(function(m,i){
                        var x=oX+6+i*(bW+gap), utils=[{v:m.qf_h,c:"#ef4444"},{v:m.qf_w,c:"#f97316"},{v:m.qf_c,c:"#3b82f6"},{v:m.qf_v+m.qf_l,c:"#8b5cf6"}];
                        var cumH=0;
                        utils.forEach(function(u,ui){ var h=maxQ>0?(u.v/maxQ)*cH:0; if(h>0.5) els.push(<rect key={"b"+i+"-"+ui} x={x} y={bY-cumH-h} width={bW} height={h} fill={u.c} opacity="0.8" rx="1"/>); cumH+=h; });
                        els.push(<text key={"ml"+i} x={x+bW/2} y={bY+11} textAnchor="middle" fontSize="7" fill="#777">{m.name}</text>);
                      });
                      // Temperature line
                      var tMin=Math.min.apply(null,data.map(function(m){return m.tExt})), tMax=Math.max.apply(null,data.map(function(m){return m.tExt})), tR=Math.max(tMax-tMin,1);
                      var pts=data.map(function(m,i){ return (oX+6+i*(bW+gap)+bW/2)+","+(bY-((m.tExt-tMin)/tR)*cH*0.8-cH*0.1); }).join(" ");
                      els.push(<polyline key="tl" points={pts} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>);
                      data.forEach(function(m,i){ var x=oX+6+i*(bW+gap)+bW/2, y=bY-((m.tExt-tMin)/tR)*cH*0.8-cH*0.1; els.push(<circle key={"td"+i} cx={x} cy={y} r="2" fill="#fbbf24" opacity="0.7"/>); els.push(<text key={"tt"+i} x={x} y={y-4} textAnchor="middle" fontSize="5" fill="#fbbf24" opacity="0.7">{m.tExt.toFixed(0)}</text>); });
                      [{l:"Încălzire",c:"#ef4444"},{l:"ACM",c:"#f97316"},{l:"Răcire",c:"#3b82f6"},{l:"V+I",c:"#8b5cf6"},{l:"Temp",c:"#fbbf24"}].forEach(function(it,i){ els.push(<rect key={"lg"+i} x={oX+i*100} y={2} width={7} height={7} fill={it.c} rx="1" opacity="0.8"/>); els.push(<text key={"lt"+i} x={oX+i*100+10} y={9} fontSize="6" fill="#888">{it.l}</text>); });
                      return els;
                    })()}
                  </svg>
                </Card>
              )}


              {/* ── Flux energetic Sankey simplificat ── */}
              {instSummary && (
                <Card title={lang==="EN"?"Energy flow diagram":"Flux energetic"} className="mb-6">
                  <svg viewBox="0 0 500 140" width="100%" height="130">
                    {(() => {
                      var total = instSummary.ep_total || 1;
                      var utils = [
                        {l:"Încălzire",v:instSummary.ep_h,c:"#ef4444"},
                        {l:"ACM",v:instSummary.ep_w,c:"#f97316"},
                        {l:"Răcire",v:instSummary.ep_c,c:"#3b82f6"},
                        {l:"Ventilare",v:instSummary.ep_v,c:"#8b5cf6"},
                        {l:"Iluminat",v:instSummary.ep_l,c:"#eab308"},
                      ];
                      var els = [];
                      // Source bar (left)
                      els.push(<rect key="src" x="5" y="10" width="35" height="120" fill="#f59e0b" rx="4" opacity="0.3"/>);
                      els.push(<text key="srct" x="22" y="75" textAnchor="middle" fontSize="7" fill="#f59e0b" transform="rotate(-90,22,75)">EP Total</text>);
                      els.push(<text key="srcv" x="22" y="135" textAnchor="middle" fontSize="6" fill="#f59e0b">{total.toFixed(0)}</text>);
                      // Flow paths to utilities
                      var cumY = 10;
                      utils.forEach(function(u, i) {
                        var pct = u.v / total;
                        var h = Math.max(4, pct * 120);
                        var targetX = 380, targetY = 10 + i * 25;
                        var srcY = cumY + h/2;
                        els.push(<path key={"f"+i} d={"M40,"+srcY+" C200,"+srcY+" 250,"+((targetY+10))+" "+targetX+","+(targetY+10)} fill="none" stroke={u.c} strokeWidth={Math.max(1.5,h*0.3)} opacity="0.4"/>);
                        els.push(<rect key={"u"+i} x={targetX} y={targetY} width="110" height="20" fill={u.c} rx="3" opacity="0.2"/>);
                        els.push(<text key={"ul"+i} x={targetX+5} y={targetY+13} fontSize="7" fill={u.c}>{u.l}: {u.v.toFixed(0)} kWh ({(pct*100).toFixed(0)}%)</text>);
                        cumY += h;
                      });
                      // Renewable offset
                      if (renewSummary && renewSummary.ep_reduction > 0) {
                        els.push(<rect key="ren" x="5" y="132" width="35" height="4" fill="#22c55e" rx="1"/>);
                        els.push(<text key="rent" x="45" y="136" fontSize="6" fill="#22c55e">-{renewSummary.ep_reduction.toFixed(0)} regenerabile</text>);
                      }
                      return els;
                    })()}
                  </svg>
                </Card>
              )}

              {/* ── ESTIMARE COST ENERGIE ANUAL ── */}
              {instSummary && (
                <Card title={t("Estimare cost energie anual",lang)} className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const prices = energyPrices;
                      const fuelId = instSummary.fuel?.id || "gaz";
                      const priceFuel = prices[fuelId] || 0.32;
                      const priceElec = prices.electricitate;
                      const costHeat = instSummary.qf_h * priceFuel;
                      const costACM = instSummary.qf_w * (fuelId === "electricitate" ? priceElec : priceFuel);
                      const costCool = instSummary.qf_c * priceElec;
                      const costVentLight = (instSummary.qf_v + instSummary.qf_l) * priceElec;
                      const costTotal = costHeat + costACM + costCool + costVentLight;
                      const costPerM2 = Au > 0 ? costTotal / Au : 0;
                      return (
                        <>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-amber-400">{costTotal.toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON/an total</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-white">{costPerM2.toFixed(1)}</div>
                            <div className="text-[10px] opacity-40">RON/(m2 an)</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-red-400">{costHeat.toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON incalzire</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                            <div className="text-xl font-bold text-blue-400">{(costCool + costVentLight).toFixed(0)}</div>
                            <div className="text-[10px] opacity-40">RON racire+vent+il</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">{lang==="EN"?"Edit energy prices (RON/kWh)":"Editează prețuri energie (RON/kWh)"}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(energyPrices).map(function(entry) { return (
                        <div key={entry[0]} className="flex items-center gap-1">
                          <span className="text-[9px] opacity-40 w-12 truncate">{entry[0]}</span>
                          <input type="number" value={entry[1]} step="0.01" min="0"
                            onChange={function(e){setEnergyPrices(function(p){var n=Object.assign({},p);n[entry[0]]=parseFloat(e.target.value)||0;return n;});}}
                            className="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-right"/>
                        </div>
                      ); })}
                    </div>
                  </div>
                </Card>
              )}

              {/* ── DEFALCARE ENERGIE FINALĂ & PRIMARĂ ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <Card title={t("Energie finală per utilitate",lang)}>
                  {instSummary && (
                    <div className="space-y-3">
                      {[
                        {label:"Încălzire", qf:instSummary.qf_h, ep:instSummary.ep_h, co2:instSummary.co2_h, color:"#ef4444"},
                        {label:"ACM", qf:instSummary.qf_w, ep:instSummary.ep_w, co2:instSummary.co2_w, color:"#f97316"},
                        {label:"Răcire", qf:instSummary.qf_c, ep:instSummary.ep_c, co2:instSummary.co2_c, color:"#3b82f6"},
                        {label:"Ventilare", qf:instSummary.qf_v, ep:instSummary.ep_v, co2:instSummary.co2_v, color:"#8b5cf6"},
                        {label:"Iluminat", qf:instSummary.qf_l, ep:instSummary.ep_l, co2:instSummary.co2_l, color:"#eab308"},
                      ].map(u => (
                        <div key={u.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:u.color}} />
                              <span className="text-xs font-medium">{u.label}</span>
                            </div>
                            <span className="text-xs font-mono">{u.qf.toFixed(0)} kWh/an</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width:`${instSummary.qf_total > 0 ? (u.qf/instSummary.qf_total*100) : 0}%`,
                              backgroundColor:u.color
                            }} />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] opacity-30">{Au > 0 ? (u.qf/Au).toFixed(1) : "—"} kWh/(m²·an)</span>
                            <span className="text-[9px] opacity-30">{instSummary.qf_total > 0 ? (u.qf/instSummary.qf_total*100).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-white/10">
                        <ResultRow label="TOTAL energie finală" value={instSummary.qf_total.toFixed(0)} unit="kWh/an" />
                        <ResultRow label="Specific" value={instSummary.qf_total_m2.toFixed(1)} unit="kWh/(m²·an)" />
                      </div>
                    </div>
                  )}
                </Card>

                <Card title={t("Energie primară per utilitate",lang)}>
                  {instSummary && (
                    <div className="space-y-3">
                      {[
                        {label:"Încălzire", ep:instSummary.ep_h, color:"#ef4444"},
                        {label:"ACM", ep:instSummary.ep_w, color:"#f97316"},
                        {label:"Răcire", ep:instSummary.ep_c, color:"#3b82f6"},
                        {label:"Ventilare", ep:instSummary.ep_v, color:"#8b5cf6"},
                        {label:"Iluminat", ep:instSummary.ep_l, color:"#eab308"},
                      ].map(u => (
                        <div key={u.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:u.color}} />
                              <span className="text-xs font-medium">{u.label}</span>
                            </div>
                            <span className="text-xs font-mono">{u.ep.toFixed(0)} kWh/an</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width:`${instSummary.ep_total > 0 ? (u.ep/instSummary.ep_total*100) : 0}%`,
                              backgroundColor:u.color
                            }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-white/10">
                        <ResultRow label="Total EP (fără regenerabile)" value={instSummary.ep_total.toFixed(0)} unit="kWh/an" />
                        <ResultRow label="Reducere regenerabile" value={renewSummary ? `-${renewSummary.ep_reduction.toFixed(0)}` : "0"} unit="kWh/an" status="ok" />
                        <ResultRow label="EP FINAL ajustat" value={(renewSummary?.ep_adjusted || instSummary.ep_total).toFixed(0)} unit="kWh/an" />
                        <ResultRow label="EP specific FINAL" value={epFinal.toFixed(1)} unit="kWh/(m²·an)"
                          status={enClass.idx <= 1 ? "ok" : enClass.idx <= 3 ? "warn" : "fail"} />
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* ── TOGGLE NA:2023 ── */}
              <div className="flex items-center gap-3 mb-3 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useNA2023} onChange={e => setUseNA2023(e.target.checked)} className="accent-amber-500" />
                  <span className="text-xs font-medium">SR EN ISO 52000-1/NA:2023 (Tabel A.16)</span>
                </label>
                <div className="text-[10px] opacity-40 flex-1">
                  {useNA2023
                    ? "Factor energie ambientală = 1.0 — pompele de căldură beneficiază de recunoașterea energiei ambientale ca sursă regenerabilă (recomandat OAER)"
                    : "Mc 001-2022 original (Tabel 5.17) — factorul pentru energia ambientală = 0, pompele de căldură sunt dezavantajate"}
                </div>
              </div>

              {/* ── FACTORI DE CONVERSIE APLICAȚI ── */}
              <Card title={t("Factori de conversie energie primară aplicați (Tabelul 5.17)",lang)} className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  {FUELS.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-xs opacity-60">{f.label}</span>
                      <div className="flex gap-3">
                        <span className="text-[10px] font-mono">fP={f.fP_tot}</span>
                        <span className="text-[10px] font-mono opacity-40">fCO2={f.fCO2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── SUMAR FINAL ── */}
              {/* #10 Comparare proiecte */}
              <Card title="Comparare cu proiect referință" className="mb-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer text-xs">
                    <span>📂</span> Import JSON referință
                    <input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) importCompareRef(e.target.files[0]); e.target.value=""; }} />
                  </label>
                  {compareRef && (
                    <button onClick={() => setCompareRef(null)} className="text-[10px] text-red-400 hover:text-red-300">Șterge referință</button>
                  )}
                </div>
                {compareRef && instSummary && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="border-b border-white/10">
                        <th className="text-left py-1 px-2 opacity-50">Indicator</th>
                        <th className="text-center py-1 px-2 opacity-50">Proiect curent</th>
                        <th className="text-center py-1 px-2 opacity-50">{compareRef.name}</th>
                        <th className="text-center py-1 px-2 opacity-50">Diferență</th>
                      </tr></thead>
                      <tbody>
                        {[
                          {label:"Ep [kWh/m²·an]", cur: epFinal, ref: compareRef.ep},
                          {label:"CO₂ [kg/m²·an]", cur: co2Final, ref: compareRef.co2},
                          {label:"RER [%]", cur: rer, ref: compareRef.rer},
                          {label:"G [W/m³K]", cur: envelopeSummary?.G||0, ref: compareRef.G},
                        ].map((r,i) => {
                          const diff = r.cur - r.ref;
                          const better = r.label.includes("RER") ? diff > 0 : diff < 0;
                          return (<tr key={i} className="border-b border-white/5">
                            <td className="py-1.5 px-2 opacity-70">{r.label}</td>
                            <td className="text-center font-mono">{r.cur.toFixed(1)}</td>
                            <td className="text-center font-mono opacity-60">{r.ref.toFixed(1)}</td>
                            <td className={`text-center font-mono font-bold ${better ? "text-emerald-400" : "text-red-400"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}</td>
                          </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* #19 Grafic radar performanță pe utilități */}
              {instSummary && (
                <Card title="Profil performanță energetică" className="mb-4">
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 300 280" width="100%" style={{maxWidth:"400px"}} className="opacity-90">
                      {(() => {
                        const cx = 150, cy = 130, maxR = 100;
                        const utils = [
                          {label:"Încălzire", val: Au > 0 ? instSummary.qf_h / Au : 0, max: 200, color:"#ef4444"},
                          {label:"ACM", val: Au > 0 ? instSummary.qf_w / Au : 0, max: 80, color:"#f97316"},
                          {label:"Răcire", val: Au > 0 ? instSummary.qf_c / Au : 0, max: 50, color:"#3b82f6"},
                          {label:"Ventilare", val: Au > 0 ? instSummary.qf_v / Au : 0, max: 20, color:"#8b5cf6"},
                          {label:"Iluminat", val: Au > 0 ? instSummary.qf_l / Au : 0, max: 30, color:"#eab308"},
                        ];
                        const n = utils.length;
                        const angleStep = (2 * Math.PI) / n;
                        const getXY = (i, r) => [cx + r * Math.sin(i * angleStep), cy - r * Math.cos(i * angleStep)];
                        // Grid circles
                        const grid = [0.25, 0.5, 0.75, 1.0].map(f => {
                          const r = maxR * f;
                          const pts = utils.map((_, i) => getXY(i, r).join(",")).join(" ");
                          return <polygon key={f} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />;
                        });
                        // Axes
                        const axes = utils.map((u, i) => {
                          const [x, y] = getXY(i, maxR + 15);
                          const [ax, ay] = getXY(i, maxR);
                          return <g key={i}><line x1={cx} y1={cy} x2={ax} y2={ay} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" /><text x={x} y={y} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)">{u.label}</text></g>;
                        });
                        // Data polygon
                        const pts = utils.map((u, i) => {
                          const r = Math.min(maxR, maxR * Math.min(u.val / u.max, 1));
                          return getXY(i, r).join(",");
                        }).join(" ");
                        // Value labels
                        const vals = utils.map((u, i) => {
                          const r = Math.min(maxR, maxR * Math.min(u.val / u.max, 1)) + 10;
                          const [x, y] = getXY(i, r);
                          return <text key={"v"+i} x={x} y={y} textAnchor="middle" fontSize="7" fill={u.color} fontWeight="bold">{u.val.toFixed(1)}</text>;
                        });
                        // nZEB reference polygon
                        const nzebVals = [49, 18, 13, 5, 6]; // Mc 001 A+ thresholds
                        const nzebPts = nzebVals.map((v, i) => {
                          const r = maxR * Math.min(v / utils[i].max, 1);
                          return getXY(i, r).join(",");
                        }).join(" ");
                        return <>{grid}{axes}<polygon points={nzebPts} fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" /><polygon points={pts} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />{vals}<text x={cx} y={cy + maxR + 40} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">— — nZEB A+ referință | —— clădire reală [kWh/m²·an]</text></>;
                      })()}
                    </svg>
                  </div>
                </Card>
              )}

              <Card title={t("Sumar final — Date pentru Certificatul de Performanță Energetică",lang)} className="border-amber-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Clasa energetică</div>
                    <div className="text-3xl font-black" style={{color:enClass.color}}>{enClass.cls}</div>
                    <div className="text-xs font-mono opacity-60 mt-1">{epFinal.toFixed(1)} kWh/(m²·an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Clasa de mediu</div>
                    <div className="text-3xl font-black" style={{color:co2Class.color}}>{co2Class.cls}</div>
                    <div className="text-xs font-mono opacity-60 mt-1">{co2Final.toFixed(1)} kg CO2/(m2an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Energie finală</div>
                    <div className="text-2xl font-bold font-mono">{instSummary?.qf_total_m2.toFixed(1) || "—"}</div>
                    <div className="text-xs opacity-40 mt-1">kWh/(m²·an)</div>
                  </div>
                  <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">RER</div>
                    <div className={cn("text-2xl font-bold font-mono", rer >= 30 ? "text-emerald-400" : "text-red-400")}>{rer.toFixed(1)}%</div>
                    <div className="text-xs opacity-40 mt-1">{rer >= 30 ? "nZEB OK" : "< 30% nZEB"}</div>
                  </div>
                </div>
              </Card>

              {/* ── DEFALCARE CONSUM PE LUNI ── */}
              {monthlyBreakdown && (
                <Card title={t("Defalcare consum pe luni",lang)} badge={<span className="text-[10px] opacity-30">profil climatic lunar</span>}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse" style={{minWidth:"700px"}}>
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-2 opacity-50">Luna</th>
                          <th className="text-center py-2 px-1 opacity-50">T ext °C</th>
                          <th className="text-center py-2 px-1 opacity-50">ΔT</th>
                          <th className="text-right py-2 px-1 opacity-50">Încălz.</th>
                          <th className="text-right py-2 px-1 opacity-50">ACM</th>
                          <th className="text-right py-2 px-1 opacity-50">Răcire</th>
                          <th className="text-right py-2 px-1 opacity-50">Ventil.</th>
                          <th className="text-right py-2 px-1 opacity-50">Ilum.</th>
                          <th className="text-right py-2 px-1 font-medium">TOTAL</th>
                          <th className="text-right py-2 px-1 opacity-50">Ep</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyBreakdown.map((m, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-1.5 px-2 font-medium">{m.name}</td>
                            <td className="text-center px-1" style={{color: m.tExt < 0 ? "#60a5fa" : m.tExt > 25 ? "#f87171" : "inherit"}}>{m.tExt.toFixed(1)}</td>
                            <td className="text-center px-1 opacity-40">{m.deltaT.toFixed(0)}</td>
                            <td className="text-right px-1">{m.qf_h > 0 ? m.qf_h.toFixed(0) : "—"}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_w.toFixed(0)}</td>
                            <td className="text-right px-1" style={{color: m.qf_c > 0 ? "#f87171" : "inherit"}}>{m.qf_c > 0 ? m.qf_c.toFixed(0) : "—"}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_v.toFixed(0)}</td>
                            <td className="text-right px-1 opacity-60">{m.qf_l.toFixed(0)}</td>
                            <td className="text-right px-1 font-bold">{m.qf_total.toFixed(0)}</td>
                            <td className="text-right px-1 opacity-40">{m.ep.toFixed(0)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10 font-bold">
                          <td className="py-2 px-2">TOTAL AN</td>
                          <td colSpan={2}></td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_h, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_w, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_c, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_v, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_l, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.qf_total, 0).toFixed(0)}</td>
                          <td className="text-right px-1">{monthlyBreakdown.reduce((s,m) => s + m.ep, 0).toFixed(0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Mini bar chart */}
                  <div className="mt-4 flex items-end gap-1 h-24">
                    {monthlyBreakdown.map((m, i) => {
                      const maxQ = Math.max(...monthlyBreakdown.map(x => x.qf_total));
                      const hPct = maxQ > 0 ? (m.qf_total / maxQ) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{height:`${hPct}%`, minHeight: m.qf_total > 0 ? "2px" : 0,
                            background: m.qf_h > m.qf_c ? "linear-gradient(180deg, #f59e0b44, #f59e0b)" : "linear-gradient(180deg, #3b82f644, #3b82f6)"}} />
                          <div className="text-[8px] opacity-30">{m.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* ── COMPARAȚIE SCENARII ── */}
              <Card title={t("Comparație scenarii",lang)} badge={
                <button onClick={() => setShowScenarioCompare(!showScenarioCompare)}
                  className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-500/30">
                  {showScenarioCompare ? "Ascunde" : "Configurează reabilitare"}
                </button>}>

                {showScenarioCompare && (
                  <div className="space-y-3 mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-xs font-medium opacity-50 mb-2">Măsuri de reabilitare propuse:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key:"addInsulWall", label:"Suplimentare izolație pereți", unitKey:"insulWallThickness", unit:"cm EPS" },
                        { key:"addInsulRoof", label:"Suplimentare izolație acoperiș", unitKey:"insulRoofThickness", unit:"cm vată" },
                        { key:"addInsulBasement", label:"Izolație subsol/sol", unitKey:"insulBasementThickness", unit:"cm XPS" },
                        { key:"replaceWindows", label:"Înlocuire tâmplărie", unitKey:"newWindowU", unit:"W/m²K" },
                        { key:"addHR", label:"Ventilare cu recuperare", unitKey:"hrEfficiency", unit:"% HR" },
                        { key:"addPV", label:"Panouri fotovoltaice", unitKey:"pvArea", unit:"m²" },
                        { key:"addHP", label:"Pompă de căldură", unitKey:"hpCOP", unit:"COP" },
                        { key:"addSolarTh", label:"Solar termic", unitKey:"solarThArea", unit:"m²" },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2">
                          <input type="checkbox" checked={rehabScenarioInputs[item.key]}
                            onChange={e => setRehabScenarioInputs(p => ({...p, [item.key]: e.target.checked}))}
                            className="accent-amber-500" />
                          <span className="text-xs flex-1">{item.label}</span>
                          {rehabScenarioInputs[item.key] && (
                            <input type="number" value={rehabScenarioInputs[item.unitKey]}
                              onChange={e => setRehabScenarioInputs(p => ({...p, [item.unitKey]: e.target.value}))}
                              className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-center" />
                          )}
                          {rehabScenarioInputs[item.key] && <span className="text-[10px] opacity-30">{item.unit}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rehabComparison && (
                  <div className="space-y-4">
                    {/* Visual comparison */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[10px] opacity-40 mb-1">ACTUAL</div>
                        <div className="text-xl font-black" style={{color: rehabComparison.original.cls.color}}>{rehabComparison.original.cls.cls}</div>
                        <div className="text-sm font-bold mt-1">{rehabComparison.original.ep.toFixed(1)}</div>
                        <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
                      </div>
                      <div className="p-3 flex flex-col items-center justify-center">
                        <div className="text-2xl opacity-20">→</div>
                        <div className="text-sm font-bold text-green-400">-{rehabComparison.savings.epPct.toFixed(0)}%</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="text-[10px] text-amber-400 mb-1">REABILITAT</div>
                        <div className="text-xl font-black" style={{color: rehabComparison.rehab.cls.color}}>{rehabComparison.rehab.cls.cls}</div>
                        <div className="text-sm font-bold mt-1">{rehabComparison.rehab.ep.toFixed(1)}</div>
                        <div className="text-[10px] opacity-30">kWh/(m²·an)</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between p-2 rounded bg-white/[0.03]">
                        <span className="opacity-50">CO₂ actual / reabilitat</span>
                        <span className="font-medium">{rehabComparison.original.co2.toFixed(1)} → {rehabComparison.rehab.co2.toFixed(1)} <span className="text-green-400">(-{rehabComparison.savings.co2Pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-white/[0.03]">
                        <span className="opacity-50">Economie Ef anuală</span>
                        <span className="font-medium text-green-400">{rehabComparison.savings.qfSaved.toFixed(0)} kWh/an</span>
                      </div>
                    </div>
                  </div>
                )}

                {!instSummary && (
                  <div className="text-center py-6 opacity-30 text-xs">Completează pașii 1-4 pentru comparație scenarii</div>
                )}
              </Card>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 4: Regenerabile
                </button>
                <button onClick={() => setStep(6)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 6: Certificat CPE →
                </button>
              </div>
            </div>
            );
          })()}

          {/* ═══ STEP 6: CERTIFICAT ENERGETIC ═══ */}
          {step === 6 && (() => {
            const Au = parseFloat(building.areaUseful) || 0;
            const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, building.category);
            const rer = renewSummary?.rer || 0;
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";

            // ═══════════════════════════════════════════════════════════
            // GENERARE DOCX CU FIND-REPLACE PE TEMPLATE OFICIAL
            // ═══════════════════════════════════════════════════════════

            const loadJSZip = () => {
              return new Promise((resolve, reject) => {
                if (window.JSZip) { resolve(window.JSZip); return; }
                const s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
                s.onload = () => resolve(window.JSZip);
                s.onerror = () => reject(new Error("Nu s-a putut încărca JSZip"));
                document.head.appendChild(s);
              });
            };

            const fmtRo = (v, dec=1) => {
              const n = parseFloat(v) || 0;
              return n.toFixed(dec).replace(".", ",");
            };

            const generateDocxCPE = async (fileOrBuffer, mode="cpe", {download=true}={}) => {
              if (!fileOrBuffer) return;
              if (Au <= 0) { showToast("Completați Au în Pasul 1.", "error"); return; }
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }

              try {
                const JSZip = await loadJSZip();
                const arrayBuffer = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
                const zip = await JSZip.loadAsync(arrayBuffer);
                const docXml = await zip.file("word/document.xml").async("string");

                // ── Calcul valori finale ──
                const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary.ep_total_m2 || 0);
                const co2Final_m2 = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
                const qfFinal_t = Au > 0 ? (instSummary.qf_h + instSummary.qf_w) / Au : 0;
                const qfFinal_e = Au > 0 ? (instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) / Au : 0;

                const sre_st = renewSummary && Au > 0 ? renewSummary.qSolarTh / Au : 0;
                const sre_pv = renewSummary && Au > 0 ? renewSummary.qPV_kWh / Au : 0;
                const sre_pc = renewSummary && Au > 0 ? renewSummary.qPC_ren / Au : 0;
                const sre_bio = renewSummary && Au > 0 ? renewSummary.qBio_ren / Au : 0;
                const sre_other = renewSummary && Au > 0 ? (renewSummary.qWind + (renewSummary.qCogen_el||0) + (renewSummary.qCogen_th||0)) / Au : 0;
                const sre_total = renewSummary && Au > 0 ? renewSummary.totalRenewable / Au : 0;

                const Aref = parseFloat(building.areaUseful) || 0;
                const Vol = parseFloat(building.volume) || 0;
                const latV = selectedClimate?.lat || 0;
                const CITY_LNG = {"București":26.10,"Cluj-Napoca":23.60,"Constanța":28.65,"Timișoara":21.23,"Iași":27.59,"Brașov":25.59,"Sibiu":24.15,"Craiova":23.80,"Galați":28.05,"Oradea":21.92,"Ploiești":25.98,"Brăila":27.97,"Arad":21.31,"Pitești":24.87,"Bacău":26.91,"Târgu Mureș":24.55,"Baia Mare":23.58,"Buzău":26.82,"Botoșani":26.67,"Satu Mare":22.88,"Râmnicu Vâlcea":24.37,"Suceava":26.25,"Drobeta-Turnu Severin":22.66,"Târgoviște":25.46,"Focșani":27.19,"Reșița":21.89,"Bistrița":24.50,"Alba Iulia":23.57,"Tulcea":28.79,"Slobozia":27.37,"Călărași":27.33,"Giurgiu":25.97,"Vaslui":27.73,"Deva":22.90,"Sfântu Gheorghe":25.79,"Zalău":23.06,"Miercurea Ciuc":25.80,"Piatra Neamț":26.38,"Târgu Jiu":23.28,"Alexandria":25.33,"Hunedoara":22.90,"Petroșani":23.37,"Mediaș":24.35,"Lugoj":21.90,"Sighișoara":24.79,"Mangalia":28.58,"Dej":23.87,"Curtea de Argeș":24.67,"Câmpina":25.74,"Câmpulung":24.97,"Turda":23.78,"Caransebeș":22.22,"Blaj":23.92,"Odorheiu Secuiesc":25.30,"Reghin":24.71,"Tecuci":27.43,"Roșiorii de Vede":24.98};
                const lngV = selectedClimate ? (CITY_LNG[selectedClimate.name] || 25.0) : 0;

                const fullAddress = [building.address, building.city, building.county].filter(Boolean).join(", ");
                const yearStr = building.yearBuilt || "____";
                const regimStr = building.floors || "____";
                const nrCam = building.units || "3";
                const arieDesf = Aref * 1.15;

                let xml = docXml;
                const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

                // ═══════════════════════════════════════════
                // FIX: Merge adjacent <w:r> runs with same formatting before replace
                // Word often splits text like "xxx,x" across multiple runs
                // ═══════════════════════════════════════════
                const mergeRuns = (xmlStr) => {
                  // Merge consecutive <w:r> elements where <w:rPr> is identical
                  // Pattern: </w:t></w:r><w:r><w:rPr>SAME</w:rPr><w:t>
                  // Simplified: merge adjacent <w:t> text within same paragraph
                  return xmlStr.replace(
                    /(<w:t[^>]*>)([^<]*)<\/w:t><\/w:r>\s*<w:r>(?:<w:rPr>([^]*?)<\/w:rPr>)?\s*<w:t(?:\s[^>]*)?>([^<]*<\/w:t>)/g,
                    function(match, p1, text1, rpr, text2) {
                      return p1 + text1 + text2;
                    }
                  );
                };
                // Apply merge multiple passes (runs can be 3-4 deep)
                for (let pass = 0; pass < 4; pass++) {
                  const prev = xml;
                  xml = mergeRuns(xml);
                  if (xml === prev) break;
                }

                // STRATEGIA: Replace direct pe conținutul <w:t> nodes
                const rWT = (search, repl) => {
                  const e = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  xml = xml.replace(new RegExp("(<w:t[^>]*>)" + e + "(</w:t>)", "g"), "$1" + esc(repl) + "$2");
                };

                const rWTpart = (search, repl) => {
                  const e = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  xml = xml.replace(new RegExp("(<w:t[^>]*>)([^<]*)" + e + "([^<]*)(</w:t>)", "g"), "$1$2" + esc(repl) + "$3$4");
                };

                const rWTseq = (search, values) => {
                  const e = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  let idx = 0;
                  xml = xml.replace(new RegExp("(<w:t[^>]*>)" + e + "(</w:t>)", "g"), (m, p1, p2) => {
                    if (idx < values.length) return p1 + esc(values[idx++]) + p2;
                    return m;
                  });
                };

                // ═══════════════════════════════════════════
                // 1. NR CAMERE — " x " e nod separat cu color roșu
                //    <w:t> x </w:t> → <w:t> 3 </w:t>
                // ═══════════════════════════════════════════
                if (building.category === "RA") {
                  rWT(" x ", " " + nrCam + " ");
                }

                // 2. AN CONSTRUIRE — <w:t>AAAA</w:t>
                rWT("AAAA", yearStr);

                // 2b. DATA VALABILITATE — <w:t>zz/ll/aa</w:t>
                const expiryD = new Date(auditor.date || new Date());
                expiryD.setFullYear(expiryD.getFullYear() + 10);
                rWT("zz/ll/aa", expiryD.toLocaleDateString("ro-RO"));

                // 3. ADRESA — nodul conține "..... adresa ....." → înlocuim tot conținutul nodului
                xml = xml.replace(/(<w:t[^>]*>)[.\s]*adresa[.\s]*(<\/w:t>)/g, "$1" + esc(fullAddress) + "$2");
                // Linia cu doar puncte (deasupra adresei): înlocuim cu spațiu gol
                xml = xml.replace(/(<w:t[^>]*>)\.{20,}(<\/w:t>)/g, "$1 $2");

                // 4. COORDONATE GPS — <w:t>II,IIII x LL,LLLL</w:t>
                rWT("II,IIII x LL,LLLL", fmtRo(latV,4) + " x " + fmtRo(lngV,4));

                // 5. REGIM ÎNĂLȚIME — <w:t>regim</w:t> e un nod separat (fără spațiu trailing)
                rWT("regim", regimStr);
                // Dacă există și "înălțime" ca nod separat, golim
                rWT("înălțime", "");

                // 6. SCOP CPE — split în 5 noduri: "Vânz"+"are"+"/Închir"+"ie"+"/Recepție/Inf"
                // După merge runs devine "Vânzare/Închirie/Recepție/Inf" — înlocuim cu scopul ales
                const scopLabel = ({"vanzare":"Vânzare","inchiriere":"Închiriere","receptie":"Recepție","informare":"Informare","renovare":"Renovare majoră","alt":"Alt scop"})[building.scopCpe] || "Vânzare";
                // After merge runs, should become "Vânzare/Închirie/Recepție/Inf"
                rWTpart("Vânzare/Închirie/Recepție/Inf", scopLabel);
                rWTpart("Vânzare/Închiriere/Recepție/Inf", scopLabel);
                // If merge didn't work, replace the specific split parts
                rWT("/Recepție/Inf", "");
                rWT("/Închir", "");

                // 7. PROGRAM CALCUL — înlocuim direct pe textul care conține "versiunea"
                // După merge runs textul poate fi: "...versiunea..." sau ". versiunea........"
                // Cea mai sigură abordare: înlocuim orice nod care conține "versiunea"
                xml = xml.replace(/(<w:t[^>]*>)([^<]*versiunea[^<]*)(<\/w:t>)/g,
                  "$1CertEn v2.0$3");
                // Golim grupurile de puncte rămase (8-20 dots) din zona program calcul
                xml = xml.replace(/(<w:t[^>]*>)(\.{8,20})(<\/w:t>)/g, "$1 $3");

                // 8. ARII — zzz,z e Aref, yyy,y e aria desfășurată (nod separat)
                rWT("zzz,z", fmtRo(Aref, 1));
                rWT("yyy,y", fmtRo(arieDesf, 1));

                // 9. ENERGIE PRIMARĂ xxxx,x — 2 apariții: EP real, EP referință nZEB
                const epRefMax = NZEB_THRESHOLDS[building.category]?.ep_max || 148;
                rWTseq("xxxx,x", [fmtRo(Au > 0 ? epFinal * Au : 0, 1), fmtRo(Au > 0 ? epRefMax * Au : 0, 1)]);

                // 10. VOLUM xxxx (fără virgulă)
                rWT("xxxx", Math.round(Vol).toString());

                // 11. CONSUM FINAL xx,x (4 apariții: termic, electric, clădire reală EP, clădire referință EP)
                const epRef = NZEB_THRESHOLDS[building.category]?.ep_max || 148;
                rWTseq("xx,x", [fmtRo(qfFinal_t, 1), fmtRo(qfFinal_e, 1), fmtRo(qfFinal_t + qfFinal_e, 1), fmtRo(qfFinal_t + qfFinal_e, 1)]);

                // 12. xxx,x secvențial (8 apariții totale)
                //     1=aria utilă, 2=CO₂, 3=solar_th, 4=solar_electric, 5=pompe_cald, 6=biomasa, 7=alt_SRE, 8=total_SRE
                rWTseq("xxx,x", [
                  fmtRo(Aref, 1),
                  fmtRo(co2Final_m2, 1),
                  fmtRo(sre_st, 1),
                  fmtRo(sre_pv, 1),
                  fmtRo(sre_pc, 1),
                  fmtRo(sre_bio, 1),
                  fmtRo(sre_other, 1),
                  fmtRo(sre_total, 1),
                ]);

                // 13. NR ATESTAT — XX/XXXXX
                if (auditor.atestat) rWT("XX/XXXXX", auditor.atestat);

                // 14. DATE AUDITOR — textul real din template MDLPA
                if (auditor.name) {
                  // Template MDLPA: "Nume &amp; prenume auditor energetic" → înlocuim cu numele real
                  // rWTpart caută în XML raw, deci "&amp;" e forma corectă
                  xml = xml.replace(/(<w:t[^>]*>)Nume &amp; prenume auditor energetic(<\/w:t>)/g, "$1" + esc(auditor.name) + "$2");
                  rWTpart("Nume auditor", auditor.name);
                  rWTpart("nume auditor", auditor.name);
                }
                // Gradul auditorului — template are noduri separate: "I" + "/" + "II"
                // Înlocuim "II" cu gradul real (e ultimul din secvența grad)
                // Nu putem folosi rWT("I / II") pentru că sunt 3 noduri separate
                // "Auditor energetic" label rămâne neschimbat — e doar titlu
                if (auditor.company) {
                  rWTpart("Firma/PFA", auditor.company);
                  rWTpart("denumire firma", auditor.company);
                }
                if (auditor.phone) rWTpart("nr. telefon", auditor.phone);
                if (auditor.email) rWTpart("adresa email", auditor.email);
                if (auditor.date) {
                  rWT("ZZ.LL.AAAA", auditor.date.split("-").reverse().join("."));
                  rWT("ZZ/LL/AAAA", auditor.date.split("-").reverse().join("/"));
                }
                // MDLPA code
                if (auditor.mdlpaCode) {
                  rWTpart("cod unic", auditor.mdlpaCode);
                  rWTpart("Cod unic", auditor.mdlpaCode);
                }

                // 15. CLASA ENERGETICA — common: "A"..."G" placeholder or "clasa"
                const enClassDocx = getEnergyClass(epFinal, catKey);
                rWTpart("Clasa ", "Clasa " + enClassDocx.cls + " ");

                // 16. RER total — "RR,R" or "rr,r"
                if (renewSummary) {
                  rWT("RR,R", fmtRo(renewSummary.rer, 1));
                }

                // 17. nZEB status text
                const nzebDocx = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                const nzebOkDocx = epFinal <= nzebDocx.ep_max && (renewSummary?.rer || 0) >= nzebDocx.rer_min;
                rWTpart("nZEB DA/NU", nzebOkDocx ? "DA" : "NU");

                // 18. CATEGORIE + localizare
                const catLabelDocx = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";
                rWTpart("categorie functionala", catLabelDocx);
                rWTpart("categorie funcțională", catLabelDocx);
                if (building.city) rWTpart("localitatea", building.city);
                if (building.county) { rWTpart("judetul", building.county); rWTpart("județul", building.county); }
                if (selectedClimate?.zone) rWTpart("zona climatica", "zona " + selectedClimate.zone);

                // 19. GWP lifecycle
                const gwpVal = parseFloat(building.gwpLifecycle) || 0;
                const co2OpDocx = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary.co2_total_m2 || 0);
                const ybDocx = parseInt(building.yearBuilt) || 2000;
                const embodiedDocx = ybDocx >= 2020 ? (["RI","RC","RA"].includes(building.category) ? 10 : 12) : 5;
                const gwpTotalDocx = gwpVal > 0 ? gwpVal : (co2OpDocx + embodiedDocx);
                rWT("GWP,G", fmtRo(gwpTotalDocx, 1));
                rWTpart("GWP lifecycle", fmtRo(gwpTotalDocx, 1) + " kgCO2eq/m2an");

                // ═══════════════════════════════════════════
                // 20. ANEXA-SPECIFIC: tabele elemente detaliate
                // ═══════════════════════════════════════════
                if (mode === "anexa") {
                  // Tabel elemente opace — secvential placeholders E1..E10
                  opaqueElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    const uCalc = el.layers && el.layers.length > 0 ? (function() {
                      const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                      const rsi = elType ? elType.rsi : 0.13;
                      const rse = elType ? elType.rse : 0.04;
                      const rL = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                      return 1/(rsi+rL+rse);
                    })() : 0;
                    const rCalc = uCalc > 0 ? 1/uCalc : 0;
                    rWT("E" + n + "_den", el.name || "Element " + n);
                    rWT("E" + n + "_tip", ELEMENT_TYPES.find(function(t){return t.id===el.type;})?.label || el.type);
                    rWT("E" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("E" + n + "_U", fmtRo(uCalc, 3));
                    rWT("E" + n + "_R", fmtRo(rCalc, 3));
                    rWT("E" + n + "_ori", el.orientation || "—");
                    // Straturi detaliate — concatenate
                    if (el.layers && el.layers.length > 0) {
                      const layerStr = el.layers.map(function(l){ return (l.matName||"?") + " " + (l.thickness||0) + "mm, λ=" + (l.lambda||0); }).join("; ");
                      rWT("E" + n + "_str", layerStr);
                    }
                  });

                  // Tabel elemente vitrate
                  glazingElements.forEach(function(el, idx) {
                    const n = idx + 1;
                    rWT("V" + n + "_den", el.name || "Vitraj " + n);
                    rWT("V" + n + "_sup", fmtRo(el.area || 0, 1));
                    rWT("V" + n + "_U", fmtRo(el.u || 0, 2));
                    rWT("V" + n + "_g", fmtRo(el.g || 0, 2));
                    rWT("V" + n + "_ori", el.orientation || "—");
                    rWT("V" + n + "_tip", el.glazingType || "—");
                  });

                  // Punti termice sumar
                  const tbTotal = thermalBridges.reduce(function(s,b){ return s + (parseFloat(b.psi)||0) * (parseFloat(b.length)||0); }, 0);
                  rWT("PT_total", fmtRo(tbTotal, 1));
                  rWT("PT_nr", String(thermalBridges.length));

                  // Instalatii detalii
                  const hSource = HEAT_SOURCES.find(function(h){return h.id===heating.source;});
                  rWTpart("sursa incalzire", hSource?.label || "—");
                  rWTpart("sursa încălzire", hSource?.label || "—");
                  rWTpart("randament generare", fmtRo(heating.eta_gen || (hSource?.eta_gen || 0), 2));
                  rWTpart("putere nominala", fmtRo(heating.nominalPower || 0, 1));

                  // ACM
                  const acmSrc = ACM_SOURCES.find(function(a){return a.id===acm.source;});
                  rWTpart("sursa ACM", acmSrc?.label || "—");

                  // Clasa energetica text
                  rWT("CLASA_EP", enClassDocx.cls);
                  rWT("NOTA_EP", String(enClassDocx.score));

                  // Consum specific pe utilitati (Anexa detaliata)
                  if (instSummary) {
                    rWT("qf_inc", fmtRo(Au > 0 ? instSummary.qf_h / Au : 0, 1));
                    rWT("qf_acm", fmtRo(Au > 0 ? instSummary.qf_w / Au : 0, 1));
                    rWT("qf_rac", fmtRo(Au > 0 ? instSummary.qf_c / Au : 0, 1));
                    rWT("qf_ven", fmtRo(Au > 0 ? instSummary.qf_v / Au : 0, 1));
                    rWT("qf_ilu", fmtRo(Au > 0 ? instSummary.qf_l / Au : 0, 1));
                    rWT("ep_inc", fmtRo(Au > 0 ? (instSummary.ep_h||0) / Au : 0, 1));
                    rWT("ep_acm", fmtRo(Au > 0 ? (instSummary.ep_w||0) / Au : 0, 1));
                    rWT("ep_rac", fmtRo(Au > 0 ? (instSummary.ep_c||0) / Au : 0, 1));
                    rWT("ep_ven", fmtRo(Au > 0 ? (instSummary.ep_v||0) / Au : 0, 1));
                    rWT("ep_ilu", fmtRo(Au > 0 ? (instSummary.ep_l||0) / Au : 0, 1));
                  }
                }

                // ═══════════════════════════════════════════
                // 21. FIX FOTO CLĂDIRE — convertesc anchor floating în text inline
                // Template MDLPA are textbox floating (mc:AlternateContent > wp:anchor)
                // docx-preview nu pozitioneaza corect wp:anchor — înlocuim cu inline
                // ═══════════════════════════════════════════
                // The FOTO textbox is wrapped in <mc:AlternateContent>..FOTO..</mc:AlternateContent>
                // We find and replace the first mc:AlternateContent that contains "FOTO"
                const mcFotoRegex = /<mc:AlternateContent>[\s\S]*?FOTO[\s\S]*?<\/mc:AlternateContent>/;
                const mcMatch = xml.match(mcFotoRegex);
                if (mcMatch) {
                  if (auditor.photo) {
                    // Insert actual image into DOCX
                    const base64Match = auditor.photo.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                    if (base64Match) {
                      const imgExt = base64Match[1] === "jpg" ? "jpeg" : base64Match[1];
                      const imgData = base64Match[2];
                      const imgFilename = "image_foto." + (imgExt === "jpeg" ? "jpg" : imgExt);

                      // Add image to word/media/
                      zip.file("word/media/" + imgFilename, imgData, {base64: true});

                      // Add relationship
                      let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
                      const newRid = "rIdFoto1";
                      const contentType = imgExt === "png" ? "image/png" : "image/jpeg";
                      if (!relsXml.includes(newRid)) {
                        relsXml = relsXml.replace("</Relationships>",
                          '<Relationship Id="' + newRid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + imgFilename + '"/></Relationships>');
                        zip.file("word/_rels/document.xml.rels", relsXml);
                      }

                      // Add content type
                      if (zip.file("[Content_Types].xml")) {
                        let ctXml = await zip.file("[Content_Types].xml").async("string");
                        const extKey = imgExt === "jpeg" ? "jpg" : imgExt;
                        if (!ctXml.includes('Extension="' + extKey + '"') && !ctXml.includes('Extension="jpeg"')) {
                          ctXml = ctXml.replace("</Types>",
                            '<Default Extension="' + extKey + '" ContentType="' + contentType + '"/></Types>');
                          zip.file("[Content_Types].xml", ctXml);
                        }
                      }

                      // Replace mc:AlternateContent with inline image
                      const inlineDrawing = '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
                        '<wp:extent cx="647700" cy="584200"/>' +
                        '<wp:docPr id="99" name="Foto Cladire"/>' +
                        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
                        '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
                        '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
                        '<pic:nvPicPr><pic:cNvPr id="99" name="foto"/><pic:cNvPicPr/></pic:nvPicPr>' +
                        '<pic:blipFill><a:blip r:embed="' + newRid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
                        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="647700" cy="584200"/></a:xfrm>' +
                        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
                        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
                      xml = xml.replace(mcFotoRegex, inlineDrawing);
                    }
                  } else {
                    // No photo — replace floating textbox with simple centered placeholder
                    const simplePlaceholder = '<w:t xml:space="preserve">FOTO CL\u0102DIRE</w:t>';
                    xml = xml.replace(mcFotoRegex, simplePlaceholder);
                  }
                }

                // ═══════════════════════════════════════════
                // 22. SCALA ENERGETICĂ — lăsăm mc:AlternateContent intact
                // docx-preview le renderizează ca floating shapes
                // Aplicăm fix CSS post-render în useEffect
                // ═══════════════════════════════════════════

                // ── Repack DOCX ──
                zip.file("word/document.xml", xml);
                const blob = await zip.generateAsync({
                  type: "blob",
                  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  compression: "DEFLATE", compressionOptions: { level: 6 }
                });

                const filename = mode === "anexa"
                  ? "Anexa_CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx"
                  : "CPE_" + (building.address || "proiect").replace(/[^a-zA-Z0-9]/g,"_").slice(0,40) + "_" + new Date().toISOString().slice(0,10) + ".docx";

                if (download) {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                  if (canExportDocx && mode === "cpe") incrementCertCount();
                  showToast("DOCX generat: " + filename, "success");
                }
                return blob;

              } catch (err) {
                console.error("Eroare generare DOCX:", err);
                showToast("Eroare DOCX: " + err.message, "error", 6000);
                return null;
              }
            };


            // ═══════════════════════════════════════════════════════════
            // EXPORT XML MDLPA — Registrul electronic al certificatelor
            // Format conform Ord. MDLPA 16/2023 Anexa 4
            // ═══════════════════════════════════════════════════════════
            const generateXMLMDLPA = () => {
              if (!instSummary) { showToast("Completați pașii 1-4.", "error"); return; }
              const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
              const fmtD = (d) => d ? d.split("-").reverse().join(".") : "";
              const validDate = auditor.date ? fmtD(auditor.date) : new Date().toISOString().slice(0,10).split("-").reverse().join(".");
              const expDate = auditor.date ? (() => { const d = new Date(auditor.date); d.setFullYear(d.getFullYear()+10); return d.toISOString().slice(0,10).split("-").reverse().join("."); })() : "";

              const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CertificatPerformantaEnergetica xmlns="urn:mdlpa:cpe:2023" versiune="1.0">
  <DateIdentificare>
    <CodUnic>${esc(auditor.mdlpaCode)}</CodUnic>
    <DataElaborare>${validDate}</DataElaborare>
    <DataExpirare>${expDate}</DataExpirare>
    <ScopElaborare>${esc(building.scopCpe || "vanzare")}</ScopElaborare>
    <ProgramCalcul>CertEn v2.0</ProgramCalcul>
  </DateIdentificare>
  <Auditor>
    <Nume>${esc(auditor.name)}</Nume>
    <Atestat>${esc(auditor.atestat)}</Atestat>
    <Grad>${esc(auditor.grade)}</Grad>
    <Firma>${esc(auditor.company)}</Firma>
    <Telefon>${esc(auditor.phone)}</Telefon>
    <Email>${esc(auditor.email)}</Email>
  </Auditor>
  <Cladire>
    <Categorie>${esc(building.category)}</Categorie>
    <CategorieLabel>${esc(catLabel)}</CategorieLabel>
    <Adresa>${esc(building.address)}</Adresa>
    <Localitate>${esc(building.city)}</Localitate>
    <Judet>${esc(building.county)}</Judet>
    <CodPostal>${esc(building.postalCode)}</CodPostal>
    <AnConstructie>${esc(building.yearBuilt)}</AnConstructie>
    <AnRenovare>${esc(building.yearRenov)}</AnRenovare>
    <RegimInaltime>${esc(building.floors)}</RegimInaltime>
    <ArieUtila unit="mp">${Au.toFixed(1)}</ArieUtila>
    <Volum unit="mc">${(parseFloat(building.volume)||0).toFixed(1)}</Volum>
    <ZonaClimatica>${esc(selectedClimate?.zone)}</ZonaClimatica>
    <Localitate_calcul>${esc(selectedClimate?.name)}</Localitate_calcul>
  </Cladire>
  <Anvelopa>
    <ElementeOpace>${opaqueElements.map(el => {
      const {u} = calcOpaqueR(el.layers, el.type);
      return `\n      <Element tip="${esc(el.type)}" denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${u.toFixed(3)}" orientare="${esc(el.orientation)}"/>`;
    }).join("")}
    </ElementeOpace>
    <ElementeVitrate>${glazingElements.map(el =>
      `\n      <Vitraj denumire="${esc(el.name)}" aria="${parseFloat(el.area)||0}" U="${parseFloat(el.u)||0}" g="${parseFloat(el.g)||0}" orientare="${esc(el.orientation)}"/>`
    ).join("")}
    </ElementeVitrate>
    <PuntiTermice>${thermalBridges.map(b =>
      `\n      <Punte denumire="${esc(b.name)}" psi="${parseFloat(b.psi)||0}" lungime="${parseFloat(b.length)||0}"/>`
    ).join("")}
    </PuntiTermice>
    <CoeficientG unit="W_per_m3K">${(envelopeSummary?.G||0).toFixed(3)}</CoeficientG>
  </Anvelopa>
  <Instalatii>
    <Incalzire sursa="${esc(heating.source)}" combustibil="${esc(instSummary.fuel?.id)}" eta_gen="${parseFloat(heating.eta_gen)||0}"/>
    <ACM sursa="${esc(acm.source)}"/>
    <Racire activ="${instSummary.hasCool}" EER="${parseFloat(cooling.eer)||0}"/>
    <Ventilare tip="${esc(ventilation.type)}" recuperare="${instSummary.hrEta||0}"/>
  </Instalatii>
  <RezultateEnergetice>
    <EnergiePrimaraSpecifica unit="kWh_per_mp_an">${epFinal.toFixed(1)}</EnergiePrimaraSpecifica>
    <ClasaEnergetica>${enClass.cls}</ClasaEnergetica>
    <NotaEnergetica>${enClass.score}</NotaEnergetica>
    <EmisiiCO2Specifice unit="kgCO2_per_mp_an">${co2Final.toFixed(1)}</EmisiiCO2Specifice>
    <ClasaCO2>${co2Class.cls}</ClasaCO2>
    <RER unit="procent">${rer.toFixed(1)}</RER>
    <ConsumFinal>
      <Incalzire unit="kWh_an">${(instSummary.qf_h||0).toFixed(0)}</Incalzire>
      <ACM unit="kWh_an">${(instSummary.qf_w||0).toFixed(0)}</ACM>
      <Racire unit="kWh_an">${(instSummary.qf_c||0).toFixed(0)}</Racire>
      <Ventilare unit="kWh_an">${(instSummary.qf_v||0).toFixed(0)}</Ventilare>
      <Iluminat unit="kWh_an">${(instSummary.qf_l||0).toFixed(0)}</Iluminat>
      <Total unit="kWh_an">${(instSummary.qf_total||0).toFixed(0)}</Total>
    </ConsumFinal>
    <nZEB indeplineste="${epFinal <= (NZEB_THRESHOLDS[building.category]?.ep_max||999) && rer >= (NZEB_THRESHOLDS[building.category]?.rer_min||30)}"/>
  </RezultateEnergetice>
</CertificatPerformantaEnergetica>`;

              const blob = new Blob([xmlContent], {type: "application/xml;charset=utf-8"});
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "CPE_XML_" + (auditor.mdlpaCode || building.address || "export").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + ".xml";
              document.body.appendChild(a); a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
              showToast("XML MDLPA exportat cu succes", "success");
            };

            const generatePDF = () => {
              try {
              showToast("Generare CPE...", "info", 2000);
              // Build HTML string, then show in inline iframe via srcdoc
              const isEN = lang === "EN";
              const T = {
                title: isEN ? "Energy Performance Certificate" : "Certificat de Performan\u021b\u0103 Energetic\u0103",
                subtitle: isEN ? "of the building / building unit" : "a cl\u0103dirii / unit\u0103\u021bii de cl\u0103dire",
                ministry: isEN ? "ROMANIA \u2022 Ministry of Development, Public Works and Administration" : "ROM\u00c2NIA \u2022 Ministerul Dezvolt\u0103rii, Lucr\u0103rilor Publice \u0219i Administra\u021biei",
                s1: isEN ? "I. CPE IDENTIFICATION & ENERGY AUDITOR" : "I. IDENTIFICARE CPE \u0218I AUDITOR ENERGETIC",
                s2: isEN ? "II. CERTIFIED BUILDING" : "II. CL\u0102DIREA CERTIFICAT\u0102",
                s3ep: isEN ? "III. CALCULATED ENERGY PERFORMANCE" : "III. PERFORMAN\u021aA ENERGETIC\u0102",
                s3co2: isEN ? "CO\u2082 EMISSIONS" : "EMISII CO\u2082",
                s5: isEN ? "V. RENEWABLE ENERGY SOURCES (RES) & nZEB STATUS" : "V. SURSE REGENERABILE DE ENERGIE (SRE) \u0218I STATUT nZEB",
                cpeNr: isEN ? "CPE No.:" : "Nr. CPE:",
                codMdlpa: isEN ? "MDLPA Code:" : "Cod MDLPA:",
                valid: isEN ? "Valid:" : "Valabil:",
                auditor: isEN ? "Auditor:" : "Auditor:",
                cert: isEN ? "Certificate:" : "Atestat:",
                company: isEN ? "Company:" : "Firma:",
                tel: isEN ? "Phone:" : "Tel:",
                email: isEN ? "Email:" : "Email:",
                date: isEN ? "Date:" : "Data:",
                category: isEN ? "Category:" : "Categorie:",
                yrBuilt: isEN ? "Year built:" : "An constr.:",
                yrRenov: isEN ? "Year renov.:" : "An renov.:",
                address: isEN ? "Address:" : "Adresa:",
                height: isEN ? "Height reg.:" : "Regim H:",
                program: isEN ? "Software:" : "Program:",
                perfHigh: isEN ? "\u25B2 High performance" : "\u25B2 Performan\u021b\u0103 ridicat\u0103",
                perfLow: isEN ? "\u25BC Low performance" : "\u25BC Performan\u021b\u0103 sc\u0103zut\u0103",
                pollLow: isEN ? "\u25B2 Low pollution" : "\u25B2 Poluare sc\u0103zut\u0103",
                pollHigh: isEN ? "\u25BC High pollution" : "\u25BC Poluare ridicat\u0103",
                thisBuilding: isEN ? "THIS BUILDING:" : "ACEAST\u0102 CL\u0102DIRE:",
                utility: isEN ? "Utility" : "Utilitate",
                system: isEN ? "System" : "Sistem",
                finalEn: isEN ? "Final energy" : "Energie final\u0103",
                primaryEn: isEN ? "Primary energy" : "Energie primar\u0103",
                co2em: isEN ? "CO\u2082 emissions" : "Emisii CO\u2082",
                clsEp: isEN ? "Cls. Ep" : "Cls. Ep",
                total: isEN ? "TOTAL" : "TOTAL",
                heating: isEN ? "Heating" : "\u00CEnc\u0103lzire",
                dhw: isEN ? "DHW" : "Ap\u0103 cald\u0103 consum",
                cooling: isEN ? "Cooling" : "R\u0103cire",
                ventilation: isEN ? "Mech. ventilation" : "Ventilare mec.",
                lighting: isEN ? "Lighting" : "Iluminat",
                solarTh: isEN ? "Solar thermal" : "Solar termic",
                heatPumps: isEN ? "Heat pumps" : "Pompe c\u0103ld.",
                solarPV: isEN ? "Solar PV" : "Solar PV",
                biomass: isEN ? "Biomass" : "Biomas\u0103",
                otherRes: isEN ? "Other RES" : "Alte SRE",
                totalRes: isEN ? "Total RES" : "Total SRE",
                nzebYes: isEN ? "Building MEETS nZEB requirements" : "Cl\u0103direa \u00eendepline\u0219te cerin\u021bele nZEB",
                nzebNo: isEN ? "Building DOES NOT meet nZEB requirements" : "Cl\u0103direa NU \u00eendepline\u0219te cerin\u021bele nZEB",
                signature: isEN ? "Signature/stamp" : "Semn\u0103tura/\u0219tampila",
                cpeCode: isEN ? "CPE UNIQUE IDENTIFICATION CODE" : "COD UNIC DE IDENTIFICARE CPE",
                p2title: isEN ? "CPE \u2013 Technical details" : "CPE \u2013 Detalii tehnice",
                envTitle: isEN ? "A. BUILDING THERMAL ENVELOPE" : "A. ANVELOPA TERMIC\u0102 A CL\u0102DIRII",
                opaqueEl: isEN ? "A.1 Opaque elements" : "A.1 Elemente opace",
                glazEl: isEN ? "A.2 Glazing elements" : "A.2 Elemente vitrate",
                bridges: isEN ? "A.3 Thermal bridges & global indicators" : "A.3 Pun\u021bi termice \u0219i indicatori globali",
                instTitle: isEN ? "B. BUILDING SYSTEMS" : "B. SISTEME DE INSTALA\u021aII",
                balTitle: isEN ? "C. ENERGY BALANCE PER UTILITY" : "C. BILAN\u021a ENERGETIC PE UTILIT\u0102\u021aI",
                p3title: isEN ? "CPE \u2013 Rehabilitation recommendations" : "CPE \u2013 Recomand\u0103ri de reabilitare energetic\u0103",
                recTitle: isEN ? "D. ENERGY REHABILITATION RECOMMENDATIONS" : "D. RECOMAND\u0102RI PENTRU REABILITAREA / MODERNIZAREA ENERGETIC\u0102",
                obsTitle: isEN ? "E. AUDITOR OBSERVATIONS" : "E. OBSERVA\u021aII ALE AUDITORULUI",
                measure: isEN ? "Proposed measure" : "M\u0103sura propus\u0103",
                domain: isEN ? "Domain" : "Domeniu",
                savings: isEN ? "Estimated savings" : "Economie estimat\u0103",
                priority: isEN ? "Priority" : "Prioritate",
                envelope: isEN ? "Envelope" : "Anvelop\u0103",
                systems: isEN ? "Systems" : "Instala\u021bii",
                high: isEN ? "HIGH" : "RIDICAT\u0102",
                medium: isEN ? "MEDIUM" : "MEDIE",
                auditorSig: isEN ? "Auditor signature" : "Semn\u0103tura auditor",
                benefSig: isEN ? "Beneficiary signature" : "Semn\u0103tura beneficiar",
                back: isEN ? "Back" : "\u00cenapoi",
                photo: isEN ? "BUILDING PHOTO" : "FOTO CL\u0102DIRE",
                name: isEN ? "Name" : "Denumire",
                type: isEN ? "Type" : "Tip",
                area: isEN ? "Area" : "Aria",
                fuel: isEN ? "Fuel" : "Combustibil",
                efficiency: isEN ? "Efficiency / COP" : "Randament / COP",
              };

              // Per-utility specific values
              const getUtilClass = (epVal) => {
                if (!grid) return "\u2014";
                const t = grid.thresholds;
                for (let i = 0; i < t.length; i++) { if (epVal <= t[i]) return CLASS_LABELS[i]; }
                return CLASS_LABELS[CLASS_LABELS.length - 1];
              };

              const ep_h_m2 = Au > 0 ? (instSummary?.ep_h || 0) / Au : 0;
              const ep_w_m2 = Au > 0 ? (instSummary?.ep_w || 0) / Au : 0;
              const ep_c_m2 = Au > 0 ? (instSummary?.ep_c || 0) / Au : 0;
              const ep_v_m2 = Au > 0 ? (instSummary?.ep_v || 0) / Au : 0;
              const ep_l_m2 = Au > 0 ? (instSummary?.ep_l || 0) / Au : 0;

              const qf_h_m2 = Au > 0 ? (instSummary?.qf_h || 0) / Au : 0;
              const qf_w_m2 = Au > 0 ? (instSummary?.qf_w || 0) / Au : 0;
              const qf_c_m2 = Au > 0 ? (instSummary?.qf_c || 0) / Au : 0;
              const qf_v_m2 = Au > 0 ? (instSummary?.qf_v || 0) / Au : 0;
              const qf_l_m2 = Au > 0 ? (instSummary?.qf_l || 0) / Au : 0;

              const co2_h_m2 = Au > 0 ? (instSummary?.co2_h || 0) / Au : 0;
              const co2_w_m2 = Au > 0 ? (instSummary?.co2_w || 0) / Au : 0;
              const co2_c_m2 = Au > 0 ? (instSummary?.co2_c || 0) / Au : 0;
              const co2_v_m2 = Au > 0 ? (instSummary?.co2_v || 0) / Au : 0;
              const co2_l_m2 = Au > 0 ? (instSummary?.co2_l || 0) / Au : 0;

              const qf_total_m2 = qf_h_m2 + qf_w_m2 + qf_c_m2 + qf_v_m2 + qf_l_m2;
              const ep_sum_m2 = ep_h_m2 + ep_w_m2 + ep_c_m2 + ep_v_m2 + ep_l_m2;
              const co2_sum_m2 = co2_h_m2 + co2_w_m2 + co2_c_m2 + co2_v_m2 + co2_l_m2;

              const utilClassH = getUtilClass(ep_h_m2);
              const utilClassW = getUtilClass(ep_w_m2);
              const utilClassC = getUtilClass(ep_c_m2);
              const utilClassV = getUtilClass(ep_v_m2);
              const utilClassL = getUtilClass(ep_l_m2);

              // SRE
              const sre_solar_th = renewSummary ? (Au > 0 ? renewSummary.qSolarTh / Au : 0) : 0;
              const sre_pv = renewSummary ? (Au > 0 ? renewSummary.qPV_kWh / Au : 0) : 0;
              const sre_pc = renewSummary ? (Au > 0 ? renewSummary.qPC_ren / Au : 0) : 0;
              const sre_bio = renewSummary ? (Au > 0 ? renewSummary.qBio_ren / Au : 0) : 0;
              const sre_total = Au > 0 && renewSummary ? renewSummary.totalRenewable / Au : 0;

              // Scale
              const scaleColors = ["#00642d","#56aa1c","#c8d200","#ffed00","#f0ab00","#e17000","#d42517","#9c0a13"];
              const scaleLabels = CLASS_LABELS;
              const co2Thresholds = (CO2_CLASSES_DB[building.category] || CO2_CLASSES_DB.AL).thresholds;

              // Systems
              const heatSrc = HEAT_SOURCES.find(s => s.id === heating.source);
              const heatDesc = heatSrc ? heatSrc.label : "\u2014";
              const heatFuel = instSummary?.fuel?.label || "Gaz natural";
              const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
              const acmDesc = acmSrc ? acmSrc.label : "\u2014";
              const coolSys = COOLING_SYSTEMS.find(s => s.id === cooling.system);
              const coolDesc = cooling.hasCooling && coolSys ? coolSys.label : "Nu este cazul";
              const ventTypeObj = VENTILATION_TYPES.find(t => t.id === ventilation.type);
              const ventDesc = ventTypeObj?.label || "Natural\u0103";
              const lightDesc = LIGHTING_TYPES.find(t => t.id === lighting.type)?.label || "\u2014";

              // nZEB
              const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
              const nzebOk = rer >= nzeb.rer_min && epFinal < nzeb.ep_max;
              const nzebLabel = nzebOk ? "DA" : "NU";

              // Dates
              const validDate = new Date(auditor.date);
              const expiryDate = new Date(validDate);
              expiryDate.setFullYear(expiryDate.getFullYear() + 10);
              const expiryStr = expiryDate.toLocaleDateString("ro-RO");
              const dateNow = new Date().toLocaleDateString("ro-RO");

              // Envelope
              const envG = envelopeSummary?.G?.toFixed(3) || "\u2014";
              const envBridgeLoss = envelopeSummary?.bridgeLoss?.toFixed(1) || "0.0";
              const envTotalArea = envelopeSummary?.totalArea?.toFixed(1) || "\u2014";

              const envRows = opaqueElements.map(el => {
                const elType = ELEMENT_TYPES?.find(t => t.id === el.type);
                const typeName = elType?.label || el.type;
                const area = parseFloat(el.area) || 0;
                const rCalc = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : {u:0, r_total:0};
                return { name: el.name || typeName, type: typeName, area: area.toFixed(1), u: rCalc.u.toFixed(3), r: rCalc.r_total.toFixed(3) };
              });
              const glazRows = glazingElements.map(el => {
                return { name: el.name || "Fereastr\u0103", area: (parseFloat(el.area)||0).toFixed(1), u: (parseFloat(el.u)||0).toFixed(2), g: (parseFloat(el.g)||0).toFixed(2) };
              });

              // Utility data for 15-col table
              const utilData = [
                { label: T.heating, sys: heatDesc, qf: qf_h_m2, ep: ep_h_m2, co2: co2_h_m2, cls: utilClassH },
                { label: T.dhw, sys: acmDesc, qf: qf_w_m2, ep: ep_w_m2, co2: co2_w_m2, cls: utilClassW },
                { label: T.cooling, sys: coolDesc, qf: qf_c_m2, ep: ep_c_m2, co2: co2_c_m2, cls: utilClassC },
                { label: T.ventilation, sys: ventDesc, qf: qf_v_m2, ep: ep_v_m2, co2: co2_v_m2, cls: utilClassV },
                { label: T.lighting, sys: lightDesc, qf: qf_l_m2, ep: ep_l_m2, co2: co2_l_m2, cls: utilClassL },
              ];

              // === BUILD HTML ===
              const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=2">
<title>CPE - ${building.address || "Cl\u0103dire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:9pt;color:#000;background:#fff;-webkit-text-size-adjust:100%}
@media print{@page{size:A4 portrait;margin:8mm 10mm} .page-break{page-break-before:always} body{padding:0} .no-print{display:none!important} table.d tr,table.u tr,table.c tr{page-break-inside:avoid} table.d,table.u,table.c{page-break-inside:auto}}
@media screen{body{padding:8mm 12mm;max-width:210mm;margin:0 auto} .page-break{margin-top:20px;padding-top:15px;border-top:2px dashed #ccc}}
@media screen and (max-width:600px){
  body{padding:3mm 2mm;font-size:7pt;max-width:100%;overflow-x:auto}
  .hdr h1{font-size:10pt!important;letter-spacing:0}
  .hdr .flag{font-size:5.5pt}
  table.c td,table.c th{padding:1px 2px;font-size:6.5pt}
  table.u td,table.u th{padding:1px 1px;font-size:5.5pt}
  table.u .uh{font-size:5pt}
  table.u .us{font-size:5pt}
  table.d td,table.d th{padding:1px 2px;font-size:6.5pt}
  .S{font-size:7pt;padding:2px}
  .V{font-size:7.5pt}
  .Vs{font-size:6.5pt}
  .L{font-size:6pt;padding:1px 2px}
  .br td{height:13px;font-size:6pt}
  .bl{padding:1px 3px!important;font-size:6.5pt}
  .brng{font-size:5.5pt}
  .bm{font-size:7pt;right:-10px}
  .stmp{min-height:30px}
  .nz{font-size:6pt;padding:1px 4px}
}
.hdr{text-align:center;margin-bottom:5px;padding-bottom:3px;border-bottom:2.5px solid #003366}
.hdr .flag{font-size:6.5pt;color:#003366;letter-spacing:1px;text-transform:uppercase;margin-bottom:1px}
.hdr h1{font-size:13pt;font-weight:bold;text-transform:uppercase;color:#003366;letter-spacing:1px;margin:0}
.hdr .sub{font-size:7.5pt;color:#555}
.hdr .ref{font-size:6.5pt;color:#999}
table.c{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:3px}
table.c td,table.c th{border:1px solid #444;padding:2px 4px;font-size:7.5pt;vertical-align:middle}
.S{background:#003366;color:#fff;font-weight:bold;font-size:8.5pt;text-align:center;padding:3px;letter-spacing:0.3px}
.S2{background:#e8edf5;font-weight:bold;font-size:7.5pt;padding:2px 4px}
.S3{background:#f0f4fa;font-size:7pt;text-align:center;font-weight:bold}
.V{text-align:center;font-weight:bold;font-size:9pt}
.Vs{text-align:center;font-weight:bold;font-size:7.5pt}
.L{font-size:7pt;padding:2px 4px}
.Ls{font-size:6.5pt;padding:1px 3px}
/* Scale bars */
.br td{padding:0;height:16px;font-size:7.5pt}
.bl{color:#fff;font-weight:bold;padding:1px 5px !important;text-align:left;letter-spacing:0.5px}
.brng{font-size:6.5pt;padding:1px 3px !important;color:#444}
.ba{outline:2.5px solid #000;outline-offset:-1px;position:relative}
.bm{position:absolute;right:-14px;top:50%;transform:translateY(-50%);color:#000;font-size:10pt;font-weight:bold}
/* Utility table */
table.u{width:100%;border-collapse:collapse;margin-bottom:3px}
table.u td,table.u th{border:1px solid #444;padding:1px 3px;font-size:7pt;text-align:center;vertical-align:middle}
table.u .uh{background:#003366;color:#fff;font-weight:bold;font-size:6.5pt;padding:2px}
table.u .us{background:#e0e8f0;font-weight:bold;font-size:6.5pt}
table.u .un{text-align:left;padding-left:3px;font-size:7pt}
table.u .uy{font-size:6pt;color:#555;font-style:italic}
table.u .uc{font-weight:bold;font-size:7.5pt;color:#fff;padding:1px}
table.u .ut td{background:#f0f4fa;font-weight:bold;font-size:7.5pt}
/* Detail tables */
table.d{width:100%;border-collapse:collapse;margin-bottom:5px}
table.d td,table.d th{border:1px solid #555;padding:2px 4px;font-size:7.5pt;vertical-align:top}
table.d .dh{background:#003366;color:#fff;font-weight:bold;font-size:8pt;text-align:center;padding:3px}
table.d .ds{background:#e8edf5;font-weight:bold;font-size:7.5pt}
table.d .dv{text-align:center;font-weight:bold;font-size:7.5pt}
/* nZEB */
.nz{display:inline-block;padding:1px 6px;border-radius:2px;font-weight:bold;font-size:7.5pt;letter-spacing:0.3px}
.nz-ok{background:#00642d;color:#fff}
.nz-no{background:#d42517;color:#fff}
/* Misc */
.stmp{border:1px dashed #999;min-height:45px;text-align:center;font-size:6pt;color:#999;padding:4px;vertical-align:middle}
.bcd{text-align:center;font-size:6.5pt;color:#555;padding:5px;border:1px solid #bbb;margin-top:3px;background:#fafafa}
.ft{font-size:6pt;color:#999;text-align:center;margin-top:4px;padding-top:2px;border-top:1px solid #ddd}
/* Back button for mobile */
.back-btn{display:none;position:fixed;top:8px;right:8px;z-index:100;background:#003366;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:10pt;cursor:pointer;font-family:sans-serif}
@media screen and (max-width:600px){.back-btn{display:block}}
</style>
</head><body>
<button class="back-btn no-print" onclick="window.history.back()">&#x2190; ${T.back}</button>
${hasWatermark ? '<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0.07"><div style="transform:rotate(-35deg);font-size:80pt;font-weight:900;color:#003366;white-space:nowrap;font-family:sans-serif;letter-spacing:10px">CertEn DEMO</div></div>' : ''}

<!-- ======== PAGINA 1 ======== -->
<div class="hdr">
  <div class="flag">${T.ministry}</div>
  <h1>${T.title}</h1>
  <div class="sub">${T.subtitle}</div>
  <div class="ref">Legea 372/2005 (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023)</div>
</div>

<!-- TABLE 1: IDENTIFICARE CPE ȘI AUDITOR -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND IDENTIFICAREA CPE \u0218I A AUDITORULUI ENERGETIC</td></tr>
<tr>
  <td colspan="4" class="L"><strong>CPE num\u0103rul</strong></td>
  <td colspan="4" class="Vs" style="font-size:7pt;letter-spacing:1.5px">${auditor.mdlpaCode || ".................."}</td>
  <td colspan="2" class="L" style="text-align:right"><strong>valabil 10 ani</strong></td>
  <td colspan="5" class="L"><strong>Nume &amp; prenume auditor energetic</strong></td>
  <td colspan="5" class="L">${auditor.name || "________________"}</td>
</tr>
<tr>
  <td colspan="4" class="L" style="font-size:6.5pt;color:#666">Cod \u00eenregistrare MDLPA</td>
  <td colspan="4" class="Vs" style="font-size:6.5pt;letter-spacing:2px">${auditor.mdlpaCode || "\u2014"}</td>
  <td colspan="2" class="L"></td>
  <td colspan="5" class="L"><strong>Certificat atestare:</strong> ${auditor.atestat || "XX/XXXXX"}</td>
  <td colspan="2" class="L"><strong>gradul</strong></td>
  <td colspan="3" class="Vs"><strong>${auditor.grade || "I / II"}</strong></td>
</tr>
</table>

<!-- TABLE 2: DATE PRIVIND CLĂDIREA/APARTAMENTUL -->
<table class="c">
<tr><td colspan="20" class="S" style="background:#E7E6E6">DATE PRIVIND ${ building.category === "AP" ? "APARTAMENTUL CERTIFICAT" : "CL\u0102DIREA CERTIFICAT\u0102" }</td></tr>
<tr>
  <td colspan="7" class="L"><strong>Categoria cl\u0103dirii:</strong> ${catLabel}</td>
  <td colspan="4" class="L"><strong>Anul construirii:</strong> ${building.yearBuilt || "AAAA"}</td>
  <td colspan="3" class="L"><strong>Renov.:</strong> ${building.yearRenov || "\u2014"}</td>
  <td colspan="6" rowspan="5" class="stmp" style="padding:2px;vertical-align:middle;text-align:center">${auditor.photo ? '<img src="' + auditor.photo + '" style="max-width:100%;max-height:100px;object-fit:contain;display:block;margin:auto" />' : '<div style="font-size:7pt;color:#999">' + T.photo + '</div>'}</td>
</tr>
<tr>
  <td colspan="14" class="L"><strong>Adresa cl\u0103dirii:</strong> ${building.address || "\u2014"}, ${building.city || "\u2014"}, jud. ${building.county || "\u2014"}</td>
</tr>
<tr>
  <td colspan="8" class="L">${building.address ? '' : '.....................................'}</td>
  <td colspan="3" class="L"><strong>Aria de referin\u021b\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Coordonate GPS:</strong> ${(selectedClimate?.lat || 0).toFixed(4)} x ${(selectedClimate ? ({"Bucure\u0219ti":26.10,"Cluj-Napoca":23.60,"Constan\u021ba":28.65,"Timi\u0219oara":21.23,"Ia\u0219i":27.59,"Bra\u0219ov":25.59}[selectedClimate.name] || 25.0) : 0).toFixed(4)}</td>
  <td colspan="3" class="L"><strong>Aria util\u0103:</strong></td>
  <td colspan="2" class="V">${Au.toFixed(1)}</td>
  <td colspan="1" class="L">m\u00b2</td>
</tr>
<tr>
  <td colspan="8" class="L"><strong>Regim de \u00een\u0103l\u021bime:</strong> ${building.floors || "\u2014"}</td>
  <td colspan="3" class="L"><strong>Volumul interior:</strong></td>
  <td colspan="2" class="V">${building.volume || "\u2014"}</td>
  <td colspan="1" class="L">m\u00b3</td>
</tr>
</table>

<!-- TABLE 3: SCOP ȘI PROGRAM -->
<table class="c">
<tr>
  <td colspan="5" class="L" style="background:#E7E6E6"><strong>Scopul elabor\u0103rii CPE:</strong></td>
  <td colspan="8" class="L">${({"vanzare":"V\u00e2nzare","inchiriere":"\u00cenchiriere","receptie":"Recep\u021bie cl\u0103dire nou\u0103","informare":"Informare proprietar","renovare":"Renovare major\u0103","alt":"Alt scop"})[building.scopCpe] || "V\u00e2nzare"}</td>
  <td colspan="7" class="L"><strong>Program de calcul:</strong> CertEn v1.0</td>
</tr>
</table>

<!-- TABLE 4: SCALA ENERGETICĂ A+ → G (DUAL: EP + CO₂) -->
<table class="c">
<tr>
  <td colspan="13" class="S" style="font-size:8pt;background:#E7E6E6">PERFORMAN\u021aA ENERGETIC\u0102 CALCULAT\u0102<br><span style="font-size:6pt;font-weight:normal">[kWh/m\u00b2,an]</span></td>
  <td colspan="7" class="S" style="font-size:8pt;background:#E7E6E6">EMISII CO\u2082<br><span style="font-size:6pt;font-weight:normal">[kgCO\u2082/m\u00b2,an]</span></td>
</tr>
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#00642d;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 ridicat\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#00642d;padding:1px;font-weight:bold">Nivel de poluare sc\u0103zut</td>
</tr>
${scaleLabels.map((cls, idx) => {
  const t = grid?.thresholds || [];
  const rangeStr = idx === 0 ? ("\u2264 " + (t[0]||"")) : idx < t.length ? ((t[idx-1]||"") + " \u2013 " + (t[idx]||"")) : ("> " + (t[t.length-1]||""));
  const ct = co2Thresholds;
  const co2Str = idx === 0 ? ("\u2264 " + (ct[0]||"")) : idx < ct.length ? ((ct[idx-1]||"") + " \u2013 " + (ct[idx]||"")) : ("> " + (ct[ct.length-1]||""));
  const isEp = idx === enClass.idx;
  const isCO2 = idx === co2Class.idx;
  const bg = scaleColors[idx];
  const bw = 9 - idx;
  const rw = 13 - bw;
  const cw = Math.max(2, 5 - Math.floor(idx*0.5));
  const crw = 7 - cw;
  return '<tr class="br">' +
    '<td colspan="' + bw + '" class="bl' + (isEp?' ba':'') + '" style="background:' + bg + '">' + cls + (isEp?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + rw + '" class="brng" style="border-left:none">' + rangeStr + (isEp?' <strong style="color:' + bg + '">\u25C0 ' + T.thisBuilding + ' ' + epFinal.toFixed(1) + ' kWh/m\u00b2,an</strong>':'') + '</td>' +
    '<td colspan="' + cw + '" class="bl' + (isCO2?' ba':'') + '" style="background:' + bg + '">' + cls + (isCO2?'<span class="bm">\u25C0</span>':'') + '</td>' +
    '<td colspan="' + crw + '" class="brng" style="border-left:none">' + co2Str + (isCO2?' <strong style="color:' + bg + '">\u25C0 ' + co2Final.toFixed(1) + '</strong>':'') + '</td>' +
  '</tr>';
}).join("")}
<tr>
  <td colspan="13" style="text-align:center;font-size:6pt;color:#9c0a13;padding:1px;font-weight:bold">Performan\u021b\u0103 energetic\u0103 sc\u0103zut\u0103</td>
  <td colspan="7" style="text-align:center;font-size:6pt;color:#9c0a13;padding:1px;font-weight:bold">Nivel de poluare ridicat</td>
</tr>
<tr>
  <td colspan="6" class="L" style="font-size:7pt"><strong>Consum specific anual [kWh/m\u00b2,an]:</strong></td>
  <td colspan="3" class="V" style="font-size:7pt"><strong>final\u0103:</strong> ${qf_total_m2.toFixed(1)}</td>
  <td colspan="4" class="V" style="font-size:7pt"><strong>primar\u0103:</strong> ${epFinal.toFixed(1)}</td>
  <td colspan="3" class="L" style="font-size:7pt"><strong>CO\u2082:</strong></td>
  <td colspan="4" class="V" style="font-size:7pt">${co2Final.toFixed(1)} kgCO\u2082/m\u00b2,an</td>
</tr>
</table>

<!-- TABLE 5: SURSE REGENERABILE -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="2" class="S3" style="background:#E7E6E6;font-size:6.5pt"><strong>Consum specific anual din surse regenerabile</strong></td>
  <td colspan="3" class="S3">${T.solarTh}</td>
  <td colspan="3" class="S3">${T.solarPV}</td>
  <td colspan="3" class="S3">${T.heatPumps}</td>
  <td colspan="3" class="S3">${T.biomass}</td>
  <td colspan="2" class="S3">${T.otherRes}</td>
  <td colspan="4" class="S3" style="background:#003366;color:#fff">${T.totalRes}</td>
</tr>
<tr>
  <td colspan="2" class="L" style="font-size:6.5pt;text-align:center">kWh/m\u00b2,an</td>
  <td colspan="3" class="Vs">${sre_solar_th.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pv.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_pc.toFixed(1)}</td>
  <td colspan="3" class="Vs">${sre_bio.toFixed(1)}</td>
  <td colspan="2" class="Vs">0.0</td>
  <td colspan="4" class="V" style="background:#f0f4fa"><strong>${sre_total.toFixed(1)}</strong></td>
</tr>
</table>

<!-- TABLE 6: CONSUM PER UTILITATE (cu clasa energetică pe celule colorate) -->
<table class="c" style="margin-top:2px">
<tr>
  <td colspan="4" rowspan="2" class="S3" style="background:#E7E6E6;vertical-align:middle">Tip sistem instala\u021bie cl\u0103dire real\u0103</td>
  <td colspan="16" class="S3" style="background:#E7E6E6">Clas\u0103 energetic\u0103 / Consum specific anual de energie primar\u0103 per utilitate [kWh/m\u00b2,an]</td>
</tr>
<tr>
  ${scaleLabels.map((lbl, i) => '<td colspan="2" style="background:' + scaleColors[i] + ';color:#fff;text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + lbl + '</td>').join("")}
</tr>
${[
  { label: T.heating, sys: heatDesc, ep: ep_h_m2, cls: utilClassH },
  { label: T.dhw, sys: acmDesc, ep: ep_w_m2, cls: utilClassW },
  { label: T.cooling, sys: coolDesc, ep: ep_c_m2, cls: utilClassC },
  { label: T.ventilation, sys: ventDesc, ep: ep_v_m2, cls: utilClassV },
  { label: T.lighting, sys: lightDesc, ep: ep_l_m2, cls: utilClassL },
].map(u => {
  const clsIdx = CLASS_LABELS.indexOf(u.cls);
  return '<tr>' +
    '<td colspan="1" class="L" style="font-size:7pt;font-weight:bold;padding:2px 3px">' + u.label + '</td>' +
    '<td colspan="3" class="L" style="font-size:6.5pt;padding:2px 3px">' + u.sys + '</td>' +
    scaleLabels.map((lbl, i) => {
      if (i === clsIdx) {
        return '<td colspan="2" style="background:' + scaleColors[i] + ';color:#fff;text-align:center;font-size:7pt;font-weight:bold;padding:2px">' + u.ep.toFixed(1) + '</td>';
      } else {
        return '<td colspan="2" style="border:1px solid #ddd;padding:2px"></td>';
      }
    }).join("") +
  '</tr>';
}).join("")}
</table>

<!-- TABLE 7: COD DE BARE -->
<table class="c" style="margin-top:3px">
<tr><td colspan="20" class="S3" style="background:#E7E6E6;text-align:center;font-size:7pt"><strong>COD UNIC DE BARE GENERAT DIN BAZA NA\u021aIONAL\u0102 DE CPE</strong></td></tr>
</table>

<!-- Semnătură și validitate -->
<div style="display:flex;gap:8px;margin-top:3px;font-size:7pt">
  <div style="flex:1;line-height:1.5">
    <strong>Auditor energetic:</strong> ${auditor.name || "________"}<br>
    <strong>Firma:</strong> ${auditor.company || "________"} | <strong>Tel:</strong> ${auditor.phone || "____"} | <strong>Email:</strong> ${auditor.email || "________"}<br>
    <strong>Data elabor\u0103rii:</strong> ${auditor.date || dateNow} | <strong>Valabil 10 ani, p\u00e2n\u0103 la:</strong> ${expiryStr}
  </div>
  <div style="text-align:center;width:120px">
    <div style="font-size:5.5pt;color:#999">${T.signature}</div>
    <div class="stmp" style="min-height:35px"></div>
  </div>
</div>
<div class="bcd" id="qr-area">
  <div style="margin-bottom:3px;font-size:7pt"><strong>${T.cpeCode}</strong></div>
  <canvas id="qr-canvas" width="260" height="60" style="display:block;margin:0 auto 3px auto"></canvas>
  <div style="font-size:6pt;letter-spacing:1px;color:#333">${auditor.mdlpaCode || "XXXXXX"}/${auditor.date||"AAAA-LL-ZZ"}/${auditor.atestat||"SERIE"}</div>
</div>
<script>
(function(){
  // Code128 barcode generator — real barcode, not pseudo-QR
  var data = "${(auditor.mdlpaCode || 'XXXXXX') + '/' + (auditor.date||'0000-00-00') + '/' + (auditor.atestat||'00000')}";
  var c = document.getElementById('qr-canvas');
  if (!c) return;
  c.width = 260; c.height = 60;
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
  // Code128B encoding
  var CODE128B = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],[2,3,3,1,1,1,2]
  ];
  var START_B = 104, STOP = 106;
  var codes = [START_B];
  var checksum = START_B;
  for (var i = 0; i < data.length && i < 30; i++) {
    var cv = data.charCodeAt(i) - 32;
    if (cv < 0 || cv > 94) cv = 0;
    codes.push(cv);
    checksum += cv * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  // Draw
  var x = 10, bH = 45, y0 = 3;
  var totalW = 0;
  codes.forEach(function(code) {
    var pat = CODE128B[code];
    if (pat) for (var p = 0; p < pat.length; p++) totalW += pat[p];
  });
  var scale = Math.min(1.5, (c.width - 20) / totalW);
  ctx.fillStyle = '#000000';
  codes.forEach(function(code) {
    var pat = CODE128B[code];
    if (!pat) return;
    for (var p = 0; p < pat.length; p++) {
      var w = pat[p] * scale;
      if (p % 2 === 0) ctx.fillRect(x, y0, w, bH);
      x += w;
    }
  });
  ctx.fillStyle = '#333'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText(data.substring(0, 35), c.width / 2, c.height - 2);
})();
</script>
<div class="ft">Pagina 1/3 | Mc 001-2022 (Ord. MDLPA 16/2023) | CertEn v1.0 | ${dateNow}</div>


<!-- ======== PAGINA 2 ======== -->
<div class="page-break"></div>
<div class="hdr">
  <h1 style="font-size:10pt">${T.p2title}</h1>
  <div class="ref">CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${catLabel}</div>
</div>

<!-- A. ANVELOP\u0102 -->
<table class="d">
<tr><td colspan="6" class="dh">${T.envTitle}</td></tr>
<tr><td colspan="6" class="ds">${T.opaqueEl}</td></tr>
<tr>
  <td class="ds" style="width:5%">Nr.</td>
  <td class="ds" style="width:24%">${T.name}</td>
  <td class="ds" style="width:18%">${T.type}</td>
  <td class="ds" style="width:14%">Aria [m\u00b2]</td>
  <td class="ds" style="width:17%">U [W/m\u00b2K]</td>
  <td class="ds" style="width:17%">R [m\u00b2K/W]</td>
</tr>
${envRows.length > 0 ? envRows.map((r, i) => '<tr><td style="text-align:center">' + (i+1) + '</td><td>' + r.name + '</td><td>' + r.type + '</td><td class="dv">' + r.area + '</td><td class="dv">' + r.u + '</td><td class="dv">' + r.r + '</td></tr>').join("") : '<tr><td colspan="6" style="text-align:center;color:#999">\u2014 Nu sunt definite \u2014</td></tr>'}
<tr><td colspan="6" class="ds">${T.glazEl}</td></tr>
<tr>
  <td class="ds">Nr.</td>
  <td class="ds" colspan="2">${T.name}</td>
  <td class="ds">Aria [m\u00b2]</td>
  <td class="ds">U [W/m\u00b2K]</td>
  <td class="ds">g [-]</td>
</tr>
${glazRows.length > 0 ? glazRows.map((r, i) => '<tr><td style="text-align:center">' + (i+1) + '</td><td colspan="2">' + r.name + '</td><td class="dv">' + r.area + '</td><td class="dv">' + r.u + '</td><td class="dv">' + r.g + '</td></tr>').join("") : '<tr><td colspan="6" style="text-align:center;color:#999">\u2014 Nu sunt definite \u2014</td></tr>'}
<tr><td colspan="6" class="ds">${T.bridges}</td></tr>
<tr>
  <td colspan="2"><strong>Pierderi pun\u021bi [W/K]:</strong></td><td class="dv">${envBridgeLoss}</td>
  <td><strong>Arie total\u0103 [m\u00b2]:</strong></td><td class="dv">${envTotalArea}</td>
  <td></td>
</tr>
<tr>
  <td colspan="2"><strong>G [W/m\u00b3K]:</strong></td><td class="dv">${envG}</td>
  <td><strong>V [m\u00b3]:</strong></td><td class="dv">${building.volume || "\u2014"}</td>
  <td></td>
</tr>
</table>

<!-- B. INSTALA\u021aII -->
<table class="d">
<tr><td colspan="4" class="dh">${T.instTitle}</td></tr>
<tr><td class="ds" style="width:22%">${T.utility}</td><td class="ds" style="width:28%">Sistem / Surs\u0103</td><td class="ds" style="width:22%">Combustibil</td><td class="ds" style="width:28%">Randament / COP</td></tr>
<tr><td><strong>\u00CEnc\u0103lzire</strong></td><td>${heatDesc}</td><td>${heatFuel}</td><td class="dv">${instSummary?.isCOP ? 'COP ' + (parseFloat(heating.eta_gen)||0).toFixed(2) : '\u03b7=' + ((instSummary?.eta_total_h||0)*100).toFixed(1) + '%'}</td></tr>
<tr><td><strong>ACC</strong></td><td>${acmDesc}</td><td>${acm.source === 'CAZAN_H' ? heatFuel : 'Electricitate'}</td><td class="dv">${acmSrc ? (acmSrc.isCOP ? 'COP ' + (acmSrc.eta||0).toFixed(2) : '\u03b7=' + ((acmSrc.eta||0)*100).toFixed(1) + '%') : '\u2014'}</td></tr>
<tr><td><strong>R\u0103cire</strong></td><td>${coolDesc}</td><td>${cooling.hasCooling ? 'Electricitate' : '\u2014'}</td><td class="dv">${cooling.hasCooling ? 'EER ' + (parseFloat(cooling.eer) || coolSys?.eer || 0).toFixed(2) : '\u2014'}</td></tr>
<tr><td><strong>Ventilare</strong></td><td>${ventDesc}</td><td>${ventilation.type !== 'NAT' ? 'Electricitate' : '\u2014'}</td><td class="dv">${instSummary?.hrEta > 0 ? 'HR \u03b7=' + (instSummary.hrEta*100).toFixed(0) + '%' : '\u2014'}</td></tr>
<tr><td><strong>Iluminat</strong></td><td>${lightDesc}</td><td>Electricitate</td><td class="dv">LENI=${instSummary?.leni?.toFixed(1) || '\u2014'} kWh/m\u00b2\u00b7an</td></tr>
</table>

<!-- C. BILAN\u021a SINTEZ\u0102 -->
<table class="d">
<tr><td colspan="6" class="dh">${T.balTitle}</td></tr>
<tr><td class="ds">Indicator</td><td class="ds" style="text-align:center">\u00CEnc\u0103lzire</td><td class="ds" style="text-align:center">ACC</td><td class="ds" style="text-align:center">R\u0103cire</td><td class="ds" style="text-align:center">Ventilare</td><td class="ds" style="text-align:center">Iluminat</td></tr>
<tr><td><strong>Qf [kWh/m\u00b2\u00b7an]</strong></td><td class="dv">${qf_h_m2.toFixed(1)}</td><td class="dv">${qf_w_m2.toFixed(1)}</td><td class="dv">${qf_c_m2.toFixed(1)}</td><td class="dv">${qf_v_m2.toFixed(1)}</td><td class="dv">${qf_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>Ep [kWh/m\u00b2\u00b7an]</strong></td><td class="dv">${ep_h_m2.toFixed(1)}</td><td class="dv">${ep_w_m2.toFixed(1)}</td><td class="dv">${ep_c_m2.toFixed(1)}</td><td class="dv">${ep_v_m2.toFixed(1)}</td><td class="dv">${ep_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>CO\u2082 [kg/m\u00b2\u00b7an]</strong></td><td class="dv">${co2_h_m2.toFixed(1)}</td><td class="dv">${co2_w_m2.toFixed(1)}</td><td class="dv">${co2_c_m2.toFixed(1)}</td><td class="dv">${co2_v_m2.toFixed(1)}</td><td class="dv">${co2_l_m2.toFixed(1)}</td></tr>
<tr><td><strong>Clas\u0103 Ep</strong></td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassH)]||'#999'};color:#fff">${utilClassH}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassW)]||'#999'};color:#fff">${utilClassW}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassC)]||'#999'};color:#fff">${utilClassC}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassV)]||'#999'};color:#fff">${utilClassV}</td>
<td class="dv" style="background:${scaleColors[CLASS_LABELS.indexOf(utilClassL)]||'#999'};color:#fff">${utilClassL}</td>
</tr>
</table>

<div class="ft">Pagina 2/3 | CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${dateNow}</div>


<!-- ======== PAGINA 3 ======== -->
<div class="page-break"></div>
<div class="hdr">
  <h1 style="font-size:10pt">${T.p3title}</h1>
  <div class="ref">CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${catLabel}</div>
</div>

<table class="d">
<tr><td colspan="5" class="dh">${T.recTitle}</td></tr>
<tr>
  <td class="ds" style="width:5%">${isEN?"No.":"Nr."}</td>
  <td class="ds" style="width:38%">${T.measure}</td>
  <td class="ds" style="width:13%">${T.domain}</td>
  <td class="ds" style="width:22%">${T.savings}</td>
  <td class="ds" style="width:22%">${T.priority}</td>
</tr>
${(() => {
  const recs = [];
  let n = 1;
  const avgUOp = envRows.length > 0 ? envRows.reduce((s,r) => s + parseFloat(r.u), 0) / envRows.length : 0;
  const avgUGl = glazRows.length > 0 ? glazRows.reduce((s,r) => s + parseFloat(r.u), 0) / glazRows.length : 0;
  if (avgUOp > 0.5) recs.push({n:n++, m:'Termoizolare pere\u021bi exteriori ETICS (EPS/vat\u0103 mineral\u0103, 10\u201315 cm) \u2014 U \u2264 0.30 W/m\u00b2K', d:'Anvelop\u0103', e:'15\u201330% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  else if (avgUOp > 0.3) recs.push({n:n++, m:'Suplimentare termoizola\u021bie pere\u021bi (5\u201310 cm) pentru nivel nZEB', d:'Anvelop\u0103', e:'8\u201315% Qf \u00eenc\u0103lzire', p:'MEDIE'});
  if (avgUGl > 1.3) recs.push({n:n++, m:'\u00cenlocuire t\u00e2mpl\u0103rie exterioar\u0103 cu ferestre tripan (U \u2264 1.0 W/m\u00b2K, g \u2265 0.50)', d:'Anvelop\u0103', e:'10\u201320% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  const roofEl = envRows.find(r => r.type && (r.type.includes('Terasa') || r.type.includes('Pod') || r.type.includes('Acoperi')));
  if (roofEl && parseFloat(roofEl.u) > 0.25) recs.push({n:n++, m:'Termoizolare plan\u0219eu superior/teras\u0103 (15\u201320 cm vat\u0103 mineral\u0103/XPS)', d:'Anvelop\u0103', e:'8\u201315% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  if (instSummary && !instSummary.isCOP && instSummary.eta_total_h < 0.80) recs.push({n:n++, m:'\u00cenlocuire cazan cu condensare (\u03b7>95%) sau pomp\u0103 de c\u0103ldur\u0103 aer-ap\u0103 (COP>3.5)', d:'Instala\u021bii', e:'20\u201340% Qf \u00eenc\u0103lzire', p:'RIDICAT\u0102'});
  if (instSummary?.isCOP && parseFloat(heating.eta_gen) < 3.0) recs.push({n:n++, m:'Modernizare pomp\u0103 de c\u0103ldur\u0103 (COP>4.0, inverter)', d:'Instala\u021bii', e:'10\u201320% Qf \u00eenc\u0103lzire', p:'MEDIE'});
  if (ventilation.type === 'NAT') recs.push({n:n++, m:'Sistem ventilare mecanic\u0103 cu recuperare c\u0103ldur\u0103 (\u03b7 \u2265 75%)', d:'Instala\u021bii', e:'10\u201325% Qf total', p:'MEDIE'});
  if (instSummary?.leni > 10) recs.push({n:n++, m:'\u00cenlocuire iluminat cu LED + senzori prezen\u021b\u0103', d:'Instala\u021bii', e:'30\u201360% Qf iluminat', p:'MEDIE'});
  if (rer < 30) recs.push({n:n++, m:'Instalare sistem fotovoltaic (3\u20135 kWp) pentru RER \u2265 30%', d:'SRE', e:'RER +10\u201330%', p:'RIDICAT\u0102'});
  if (sre_solar_th < 1 && qf_w_m2 > 10) recs.push({n:n++, m:'Panouri solare termice pentru ACC (2\u20134 m\u00b2)', d:'SRE', e:'40\u201370% Qf ACC', p:'MEDIE'});
  if (recs.length === 0) recs.push({n:1, m:'Cl\u0103direa prezint\u0103 performan\u021b\u0103 energetic\u0103 bun\u0103. Men\u021binere \u00eentre\u021binere regulat\u0103.', d:'General', e:'\u2014', p:'\u2014'});
  return recs.map(r => '<tr><td style="text-align:center">' + r.n + '</td><td>' + r.m + '</td><td style="text-align:center">' + r.d + '</td><td style="text-align:center">' + r.e + '</td><td style="text-align:center;font-weight:bold;color:' + (r.p==='RIDICAT\u0102'?'#d42517':r.p==='MEDIE'?'#e17000':'#555') + '">' + r.p + '</td></tr>').join("");
})()}
</table>

<!-- E. OBSERVA\u021aII -->
<table class="d">
<tr><td class="dh">${T.obsTitle}</td></tr>
<tr><td style="min-height:50px;line-height:1.5;padding:5px 6px;font-size:7.5pt">${auditor.observations || 'Cl\u0103direa a fost evaluat\u0103 conform Mc 001-2022. Valorile sunt calculate pe baza datelor furnizate \u0219i a inspec\u021biei vizuale.'}</td></tr>
</table>

<!-- Note legislative -->
<div style="font-size:6pt;color:#666;margin-top:4px;line-height:1.4;padding:3px;border:1px solid #ddd;background:#fafafa">
  <strong>Cadru legislativ:</strong> L.372/2005 (modif. L.238/2024), Mc 001-2022 (Ord. MDLPA 16/2023), C107/0-7, NP048, SR EN ISO 52000-1:2017/NA:2023, SR EN ISO 13790, Dir. UE 2024/1275 (EPBD IV).<br>
  * Valori calculate. Certificatul este valabil 10 ani. Nu garanteaz\u0103 consumul real.
</div>

<!-- Semn\u0103turi finale -->
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;font-size:7pt">
  <div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "...."} / Gr. ${auditor.grade}<br>Data: ${auditor.date || dateNow}</div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.auditorSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
  <div style="text-align:center"><div style="font-size:5.5pt;color:#999">${T.benefSig}</div><div class="stmp" style="width:120px;height:40px"></div></div>
</div>

<div class="ft">Pagina 3/3 | CPE nr. ${auditor.mdlpaCode || "......"} | ${building.address || "\u2014"} | ${dateNow}</div>

</body></html>`;
              // Show in state-driven overlay iframe via srcdoc
              setPdfPreviewHtml(htmlContent);
              return htmlContent;
              } catch(err) { showToast("Eroare generare CPE: " + err.message, "error", 8000); console.error("generatePDF error:", err); return null; }
            };

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(5)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 5</button>
                  <h2 className="text-xl font-bold">Certificat de Performanta Energetica (CPE)</h2>
                </div>
                <p className="text-xs opacity-40">Generare CPE conform Ordinului MDLPA nr. 16/2023 — format oficial cu clasare dubla</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Date auditor + generare */}
                <div className="space-y-5">
                  <Card title={t("Date auditor energetic",lang)}>
                    <div className="space-y-3">
                      <Input label={t("Nume complet auditor",lang)} value={auditor.name} onChange={v => setAuditor(p=>({...p,name:v}))} placeholder="Ing. Popescu Ion" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Nr. atestat MLPAT/MDLPA",lang)} value={auditor.atestat} onChange={v => setAuditor(p=>({...p,atestat:v}))} placeholder="12345" />
                        <Select label={t("Grad atestat",lang)} value={auditor.grade} onChange={v => setAuditor(p=>({...p,grade:v}))}
                          options={[{value:"I",label:"Gradul I"},{value:"II",label:"Gradul II"},{value:"III",label:"Gradul III"}]} />
                      </div>
                      <Input label={t("Firma / PFA",lang)} value={auditor.company} onChange={v => setAuditor(p=>({...p,company:v}))} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label={t("Telefon",lang)} value={auditor.phone} onChange={v => setAuditor(p=>({...p,phone:v}))} />
                        <Input label={t("Email",lang)} value={auditor.email} onChange={v => setAuditor(p=>({...p,email:v}))} />
                      </div>
                      <Input label={t("Data elaborarii CPE",lang)} value={auditor.date} onChange={v => setAuditor(p=>({...p,date:v}))} type="date" />
                      <Input label={t("Cod unic MDLPA (dupa inregistrare)",lang)} value={auditor.mdlpaCode} onChange={v => {
                        // Format validation: allow digits, letters, dots, dashes
                        const cleaned = v.replace(/[^A-Za-z0-9.\-\/]/g, "").toUpperCase().slice(0, 20);
                        setAuditor(p=>({...p,mdlpaCode:cleaned}));
                      }}
                        placeholder="ex: CPE-12345/2026" />
                      {auditor.mdlpaCode && auditor.mdlpaCode.length > 3 && (
                        <div className="text-[9px] mt-0.5 opacity-30 flex items-center gap-2">
                          <span>Cod: <strong>{auditor.mdlpaCode}</strong></span>
                          <span>•</span>
                          <span>Format așteptat: CPE-XXXXX/AAAA sau numeric</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* MDLPA Registry info */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                    <div className="text-[10px] opacity-50 font-medium mb-1">Registru MDLPA</div>
                    <div className="text-[10px] opacity-35 space-y-1">
                      <div>Codul unic se obține după înregistrarea CPE pe platforma electronică a MDLPA.</div>
                      <div>Platforma: <strong>https://www.mdlpa.ro</strong> → Registru certificate energetice</div>
                      <div>Conform Art.19 L.372/2005 mod. L.238/2024, CPE se înregistrează în max 30 zile de la elaborare.</div>
                    </div>
                  </div>

                  {/* Cost-optim quick summary */}
                  {instSummary && renewSummary && (
                    <Card title="Analiză cost-optimă rapidă" className="border-blue-500/20">
                      <div className="space-y-2">
                        {(() => {
                          const Au = parseFloat(building.areaUseful) || 1;
                          const costKwh = instSummary.fuel?.id === "electricitate" ? 1.30 : instSummary.fuel?.id === "gaz" ? 0.32 : 0.30;
                          const annCost = (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) * costKwh / 4.95;
                          const epF = renewSummary.ep_adjusted_m2;
                          const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                          const gap = Math.max(0, epF - nzeb.ep_max);
                          const rerGap = Math.max(0, nzeb.rer_min - renewSummary.rer);
                          return (<>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{annCost.toFixed(0)} €</div>
                                <div className="text-[9px] opacity-40">Cost energie/an</div>
                              </div>
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{epF.toFixed(0)}</div>
                                <div className="text-[9px] opacity-40">Ep [kWh/m²a]</div>
                              </div>
                              <div className="p-2 rounded bg-white/[0.03]">
                                <div className="text-lg font-bold">{renewSummary.co2_adjusted_m2.toFixed(1)}</div>
                                <div className="text-[9px] opacity-40">CO₂ [kg/m²a]</div>
                              </div>
                            </div>
                            {gap > 0 && (
                              <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                                ⚠ Depășire prag nZEB cu <strong>{gap.toFixed(0)} kWh/m²a</strong>. 
                                Prioritate: termoizolarea anvelopei + pompa de căldură.
                              </div>
                            )}
                            {rerGap > 0 && (
                              <div className="text-[10px] text-amber-400/80 bg-amber-500/5 rounded p-2">
                                ⚠ RER insuficient: mai sunt necesare <strong>{rerGap.toFixed(0)}%</strong> surse regenerabile.
                                Soluție: PV {(rerGap*Au*epF/100/350).toFixed(0)} m² panouri.
                              </div>
                            )}
                            {gap <= 0 && rerGap <= 0 && (
                              <div className="text-[10px] text-emerald-400/80 bg-emerald-500/5 rounded p-2">
                                ✓ Clădirea îndeplinește pragurile nZEB. Economie față de clasă G: ~{Math.round(annCost * 0.6)} €/an.
                              </div>
                            )}
                          </>);
                        })()}
                      </div>
                    </Card>
                  )}

                  <Card title={t("Observatii suplimentare",lang)}>
                    <textarea value={auditor.observations} onChange={e => setAuditor(p=>({...p,observations:e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm min-h-[100px] focus:outline-none focus:border-amber-500/50 resize-y"
                      placeholder="Observatii privind starea cladirii, limitari ale evaluarii, etc." />
                  </Card>

                  <Card title={t("Foto cladire (optional)",lang)}>
                    <div className="space-y-2">
                      {auditor.photo && (
                        <div className="relative">
                          <img src={auditor.photo} alt="Foto cladire" className="w-full max-h-40 object-contain rounded-lg border border-white/10" />
                          <button onClick={() => setAuditor(p=>({...p,photo:""}))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500">&times;</button>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all text-sm">
                        <span>📷</span> {auditor.photo ? "Schimba foto" : "Incarca foto cladire"}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { showToast("Imaginea trebuie să fie sub 2 MB", "error"); return; }
                          // #8 Compresie foto — redimensionare la max 600px și compresie JPEG 0.7
                          const img = new Image();
                          img.onload = () => {
                            const maxDim = 600;
                            let w = img.width, h = img.height;
                            if (w > maxDim || h > maxDim) {
                              const ratio = Math.min(maxDim / w, maxDim / h);
                              w = Math.round(w * ratio);
                              h = Math.round(h * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            const compressed = canvas.toDataURL('image/jpeg', 0.7);
                            setAuditor(p => ({...p, photo: compressed}));
                          };
                          img.src = URL.createObjectURL(file);
                          e.target.value = "";
                        }} />
                      </label>
                      <div className="text-[10px] opacity-30">Max 2 MB, JPG/PNG. Apare in CPE la rubrica foto cladire.</div>
                    </div>
                  </Card>

                  {/* Validation warnings */}
                  {(() => {
                    const warns = [];
                    const infos = [];
                    // CRITICE — blochează generarea
                    if (Au <= 0) warns.push("❌ Suprafața utilă (Au) nu este definită — Pasul 1");
                    if (!building.locality) warns.push("❌ Localitatea de calcul nu este selectată — Pasul 1");
                    if (!building.category) warns.push("❌ Categoria funcțională nu este selectată — Pasul 1");
                    if (opaqueElements.length === 0 && glazingElements.length === 0) warns.push("❌ Niciun element de anvelopă definit — Pasul 2");
                    if (!heating.source) warns.push("❌ Sursa de încălzire nu este configurată — Pasul 3");
                    if (!instSummary) warns.push("❌ Calculul energetic nu este disponibil (completați pașii 1-4)");
                    // IMPORTANTE — afectează calitatea
                    if (!auditor.name) warns.push("⚠ Numele auditorului nu este completat");
                    if (!auditor.atestat) warns.push("⚠ Nr. atestat MDLPA lipsește");
                    if (!auditor.date) infos.push("ℹ Data elaborării CPE nu este setată");
                    if (!building.yearBuilt) infos.push("ℹ Anul construcției lipsește");
                    else if (parseInt(building.yearBuilt) < 1800 || parseInt(building.yearBuilt) > new Date().getFullYear()) warns.push("⚠ Anul construcției (" + building.yearBuilt + ") pare incorect");
                    if (!building.address) infos.push("ℹ Adresa clădirii nu este completată");
                    if (parseFloat(building.volume) <= 0) infos.push("ℹ Volumul încălzit (V) nu este definit");
                    if (!building.floors) infos.push("ℹ Regimul de înălțime nu este completat");
                    // RECOMANDĂRI nZEB
                    if (renewSummary && renewSummary.rer < 30) infos.push("ℹ RER < 30% — clădirea nu îndeplinește cerința nZEB");
                    if (thermalBridges.length === 0) infos.push("ℹ Punțile termice nu sunt definite (se folosesc valori forfetare)");
                    if (!photovoltaic.enabled && !solarThermal.enabled && !heatPump.enabled && !biomass.enabled) infos.push("ℹ Nicio sursă regenerabilă configurată — Pasul 4");
                    // Completitudine
                    const totalChecks = 12;
                    const passedChecks = [
                      Au > 0, !!building.locality, !!building.category, opaqueElements.length > 0,
                      glazingElements.length > 0, !!heating.source, !!instSummary, !!auditor.name,
                      !!auditor.atestat, !!building.yearBuilt, !!building.address, !!auditor.date
                    ].filter(Boolean).length;
                    const completePct = Math.round(passedChecks / totalChecks * 100);

                    if (warns.length === 0 && infos.length === 0) return (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-xs font-bold text-emerald-400">✓ Toate datele sunt complete ({completePct}%)</div>
                        <div className="text-[10px] opacity-40 mt-1">CPE-ul poate fi generat fără probleme.</div>
                      </div>
                    );
                    return (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold text-amber-400">Verificări necesare</div>
                          <div className="text-[10px] px-2 py-0.5 rounded bg-white/5">{completePct}% complet</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{width:completePct+"%",background:completePct>=80?"#22c55e":completePct>=50?"#eab308":"#ef4444"}} />
                        </div>
                        {warns.map((w,i) => <div key={"w"+i} className="text-[11px] text-amber-300/80">{w}</div>)}
                        {infos.map((w,i) => <div key={"i"+i} className="text-[10px] opacity-40">{w}</div>)}
                      </div>
                    );
                  })()}


                  <button onClick={function() {
                    if (!canNzebReport) { requireUpgrade("Raport nZEB necesită plan Pro"); return; }
                    if (!instSummary || !renewSummary) { showToast("Completați pașii 1-5 pentru raport nZEB.", "error"); return; }
                    try {
                    const Au = parseFloat(building.areaUseful) || 0;
                    const V = parseFloat(building.volume) || 0;
                    const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
                    const epF = renewSummary.ep_adjusted_m2;
                    const n50Val = parseFloat(building.n50) || 4.0;
                    const isEN = lang === "EN";
                    const dateNow = new Date().toISOString().slice(0,10);
                    const catLabel = BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label || "";
                    const zebMax = nzeb.ep_max * ZEB_FACTOR;
                    const hasFossil = ["gaz","motorina","carbune"].includes(instSummary.fuel?.id);
                    const isZEB = epF <= zebMax && !hasFossil && renewSummary.rer >= 30;

                    // Verificari U per element
                    const uChecks = opaqueElements.map(function(el) {
                      const uRef = getURefNZEB(building.category, el.type);
                      const uCalc = el.layers && el.layers.length > 0 ? (function() {
                        const elType = ELEMENT_TYPES.find(function(t){return t.id===el.type;});
                        const rsi = elType ? elType.rsi : 0.13;
                        const rse = elType ? elType.rse : 0.04;
                        const rLayers = el.layers.reduce(function(s,l){var d=(parseFloat(l.thickness)||0)/1000; return s+(d>0&&l.lambda>0?d/l.lambda:0);},0);
                        return 1/(rsi+rLayers+rse);
                      })() : null;
                      return { name: el.name || el.type, type: el.type, uCalc: uCalc, uRef: uRef, ok: uRef ? (uCalc !== null ? uCalc <= uRef : null) : null };
                    });
                    const glazUChecks = glazingElements.map(function(el) {
                      const uVal = parseFloat(el.u) || 3.0;
                      const uRef = ["RI","RC","RA"].includes(building.category) ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;
                      return { name: el.name || "Vitraj", uCalc: uVal, uRef: uRef, ok: uVal <= uRef };
                    });

                    // Criterii complete nZEB L.238/2024
                    const criteria = [
                      { id: "EP", name: "Energie primară (Ep)", value: epF.toFixed(1) + " kWh/m²·an", limit: "< " + nzeb.ep_max + " kWh/m²·an", ok: epF <= nzeb.ep_max, weight: "CRITIC" },
                      { id: "RER", name: "RER total (Renewable Energy Ratio)", value: renewSummary.rer.toFixed(1) + "%", limit: "≥ " + nzeb.rer_min + "%", ok: renewSummary.rer >= nzeb.rer_min, weight: "CRITIC" },
                      { id: "RER_ONSITE", name: "RER on-site (producție proprie)", value: renewSummary.rerOnSite.toFixed(1) + "%", limit: "≥ 10%", ok: renewSummary.rerOnSiteOk, weight: "CRITIC" },
                      { id: "N50", name: "Permeabilitate la aer (n50)", value: n50Val.toFixed(1) + " h⁻¹", limit: "≤ 1.0 h⁻¹ (nZEB) / ≤ 3.0 h⁻¹ (renovare)", ok: n50Val <= 3.0, ideal: n50Val <= 1.0, weight: "MAJOR" },
                    ];
                    const allOpOk = uChecks.every(function(c){return c.ok === null || c.ok === true;});
                    const allGlOk = glazUChecks.every(function(c){return c.ok;});
                    const globalNzeb = epF <= nzeb.ep_max && renewSummary.rer >= nzeb.rer_min && renewSummary.rerOnSiteOk && allOpOk && allGlOk;

                    // Cost-optim simplu per măsură (NPV pe 20 ani, discount 5%)
                    const costEn = instSummary ? (instSummary.qf_h + instSummary.qf_w + instSummary.qf_c + instSummary.qf_v + instSummary.qf_l) : 0;
                    const priceKwh = instSummary?.fuel?.id === "electricitate" ? 1.30 : instSummary?.fuel?.id === "gaz" ? 0.32 : 0.30;
                    const annualCostEur = costEn * priceKwh / 4.95;

                    const nzebHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Raport nZEB — ${building.address || "Clădire"}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI","Roboto",sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;padding:12mm 15mm;max-width:210mm;margin:0 auto;line-height:1.5}
@media print{@page{size:A4;margin:10mm 12mm} body{padding:0} .no-print{display:none!important}}
@media screen and (max-width:600px){body{padding:4mm 3mm;font-size:8.5pt}}
h1{font-size:14pt;color:#003366;text-align:center;margin-bottom:2px;letter-spacing:0.5px}
h2{font-size:11pt;color:#003366;margin:14px 0 6px;padding:4px 8px;background:#e8edf5;border-left:4px solid #003366}
h3{font-size:9.5pt;color:#003366;margin:10px 0 4px}
.sub{text-align:center;font-size:8pt;color:#555;margin-bottom:12px}
.meta{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:8pt;color:#444;margin-bottom:10px;padding:6px 8px;background:#f8f9fc;border:1px solid #ddd;border-radius:4px}
.meta b{color:#003366}
table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8.5pt}
th,td{border:1px solid #999;padding:3px 6px;vertical-align:middle}
th{background:#003366;color:#fff;font-weight:600;text-align:center;font-size:8pt}
.ok{background:#d4edda;color:#155724;font-weight:bold;text-align:center}
.fail{background:#f8d7da;color:#721c24;font-weight:bold;text-align:center}
.warn{background:#fff3cd;color:#856404;font-weight:bold;text-align:center}
.crit{font-weight:bold;color:#721c24}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:8pt;font-weight:bold;letter-spacing:0.3px}
.badge-ok{background:#00642d;color:#fff}
.badge-fail{background:#d42517;color:#fff}
.badge-warn{background:#e17000;color:#fff}
.global{text-align:center;padding:12px;margin:10px 0;border:2px solid;border-radius:8px;font-size:12pt;font-weight:bold}
.global-ok{border-color:#00642d;background:#d4edda;color:#00642d}
.global-fail{border-color:#d42517;background:#f8d7da;color:#d42517}
.note{font-size:7.5pt;color:#666;padding:4px 8px;background:#fafafa;border:1px solid #eee;margin-top:6px;border-radius:3px}
.bar{height:14px;border-radius:3px;display:inline-block;vertical-align:middle}
.ft{text-align:center;font-size:7pt;color:#999;margin-top:10px;padding-top:4px;border-top:1px solid #ddd}
.cost-row td{font-size:8pt}
.flex-row{display:flex;gap:12px;margin:8px 0}
.flex-row>div{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center}
.flex-row .big{font-size:16pt;font-weight:bold;color:#003366}
.flex-row .lbl{font-size:7.5pt;color:#888;margin-top:2px}
</style></head><body>
<h1>RAPORT DE CONFORMARE nZEB</h1>
<div class="sub">conform Legii 372/2005 (modificată prin Legea 238/2024) și Mc 001-2022 (Ord. MDLPA 16/2023)</div>

<div class="meta">
<div><b>Clădire:</b> ${building.address || "—"}, ${building.city || ""} ${building.county || ""}</div>
<div><b>Categorie:</b> ${catLabel}</div>
<div><b>An constr.:</b> ${building.yearBuilt || "—"}</div>
<div><b>Au:</b> ${Au.toFixed(1)} m²</div>
<div><b>V:</b> ${V.toFixed(0)} m³</div>
<div><b>Zonă climatică:</b> ${selectedClimate?.zone || "—"} (${selectedClimate?.name || "—"})</div>
<div><b>Auditor:</b> ${auditor.name || "—"} (At. ${auditor.atestat || "—"})</div>
<div><b>Data:</b> ${dateNow}</div>
</div>

<div class="global ${globalNzeb ? 'global-ok' : 'global-fail'}">
${globalNzeb ? '✓ CLĂDIREA ÎNDEPLINEȘTE CERINȚELE nZEB' : '✗ CLĂDIREA NU ÎNDEPLINEȘTE CERINȚELE nZEB'}
</div>

<h2>1. Criterii principale nZEB</h2>
<table>
<tr><th style="width:5%">Nr.</th><th style="width:28%">Criteriu</th><th style="width:18%">Valoare calculată</th><th style="width:20%">Limită nZEB</th><th style="width:12%">Rezultat</th><th style="width:17%">Importanță</th></tr>
${criteria.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.value+'</td><td style="text-align:center">'+c.limit+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓ DA':'✗ NU')+'</td><td style="text-align:center" class="'+(c.weight==='CRITIC'?'crit':'')+'">'+c.weight+'</td></tr>';}).join("")}
</table>

<h2>2. Verificare transmitanță termică U vs. U'max nZEB</h2>
<h3>2.1 Elemente opace</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>Tip</th><th>U calculat [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${uChecks.length > 0 ? uChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td>'+c.type+'</td><td style="text-align:center;font-weight:bold">'+(c.uCalc!==null?c.uCalc.toFixed(3):'—')+'</td><td style="text-align:center">'+(c.uRef!==null?c.uRef.toFixed(2):'N/A')+'</td><td class="'+(c.ok===null?'warn':c.ok?'ok':'fail')+'">'+(c.ok===null?'—':c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="6" style="text-align:center;color:#999">— Niciun element opac definit —</td></tr>'}
</table>
<h3>2.2 Elemente vitrate</h3>
<table>
<tr><th>Nr.</th><th>Element</th><th>U [W/m²K]</th><th>U'max nZEB [W/m²K]</th><th>Rezultat</th></tr>
${glazUChecks.length > 0 ? glazUChecks.map(function(c,i){return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+c.name+'</td><td style="text-align:center;font-weight:bold">'+c.uCalc.toFixed(2)+'</td><td style="text-align:center">'+c.uRef.toFixed(2)+'</td><td class="'+(c.ok?'ok':'fail')+'">'+(c.ok?'✓':'✗')+'</td></tr>';}).join("") : '<tr><td colspan="5" style="text-align:center;color:#999">— Niciun element vitrat definit —</td></tr>'}
</table>

<h2>3. Surse regenerabile de energie (SRE)</h2>
<div class="flex-row">
<div><div class="big">${renewSummary.rer.toFixed(1)}%</div><div class="lbl">RER Total (min 30%)</div></div>
<div><div class="big">${renewSummary.rerOnSite.toFixed(1)}%</div><div class="lbl">RER On-site (min 10%)</div></div>
<div><div class="big">${(renewSummary.totalRenewable/Math.max(Au,1)).toFixed(1)}</div><div class="lbl">kWh/m²·an din SRE</div></div>
</div>
<table>
<tr><th>Sursă SRE</th><th>Producție [kWh/an]</th><th>kWh/m²·an</th><th>Activă</th></tr>
<tr><td>Solar termic</td><td style="text-align:right">${renewSummary.qSolarTh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qSolarTh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${solarThermal.enabled?'✓':'—'}</td></tr>
<tr><td>Fotovoltaic (PV)</td><td style="text-align:right">${renewSummary.qPV_kWh.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPV_kWh/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${photovoltaic.enabled?'✓':'—'}</td></tr>
<tr><td>Pompă de căldură (ambientală)</td><td style="text-align:right">${renewSummary.qPC_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qPC_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${heatPump.enabled?'✓':'—'}</td></tr>
<tr><td>Biomasă</td><td style="text-align:right">${renewSummary.qBio_ren.toFixed(0)}</td><td style="text-align:right">${(renewSummary.qBio_ren/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${biomass.enabled?'✓':'—'}</td></tr>
<tr><td>Eolian + Cogenerare</td><td style="text-align:right">${(renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0)).toFixed(0)}</td><td style="text-align:right">${((renewSummary.qWind+(renewSummary.qCogen_el||0)+(renewSummary.qCogen_th||0))/Math.max(Au,1)).toFixed(1)}</td><td style="text-align:center">${otherRenew.windEnabled||otherRenew.cogenEnabled?'✓':'—'}</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>TOTAL SRE</td><td style="text-align:right">${renewSummary.totalRenewable.toFixed(0)}</td><td style="text-align:right">${renewSummary.totalRenewable_m2.toFixed(1)}</td><td></td></tr>
</table>

<h2>4. Verificare ZEB Ready (EPBD IV — Dir. UE 2024/1275)</h2>
<table>
<tr><th style="width:35%">Criteriu ZEB</th><th style="width:25%">Valoare</th><th style="width:25%">Cerință</th><th style="width:15%">Rezultat</th></tr>
<tr><td>Ep ≤ nZEB × 0.90</td><td style="text-align:center">${epF.toFixed(1)} kWh/m²a</td><td style="text-align:center">≤ ${zebMax.toFixed(0)} kWh/m²a</td><td class="${epF<=zebMax?'ok':'fail'}">${epF<=zebMax?'✓':'✗'}</td></tr>
<tr><td>Combustibil fosil on-site</td><td style="text-align:center">${hasFossil?'DA — '+instSummary.fuel?.label:'NU'}</td><td style="text-align:center">NU (zero emisii)</td><td class="${!hasFossil?'ok':'fail'}">${!hasFossil?'✓':'✗'}</td></tr>
<tr><td>RER ≥ 30%</td><td style="text-align:center">${renewSummary.rer.toFixed(1)}%</td><td style="text-align:center">≥ 30%</td><td class="${renewSummary.rer>=30?'ok':'fail'}">${renewSummary.rer>=30?'✓':'✗'}</td></tr>
<tr style="font-weight:bold"><td>Status ZEB</td><td colspan="2" style="text-align:center">Obligatoriu: cl. publice noi 01.01.2028 / toate cl. noi 01.01.2030</td><td class="${isZEB?'ok':'warn'}">${isZEB?'✓ ZEB READY':'⚠ NU ZEB'}</td></tr>
</table>

${["BI","ED","SA","HC","CO","SP"].includes(building.category) && Au > 250 ? '<div class="note" style="border-color:#e17000;background:#fff8f0"><strong>⚠ Obligație solară EPBD IV Art.10:</strong> Clădire non-rezidențială > 250 m² — instalație solară obligatorie de la sfârșitul 2026. ' + (photovoltaic.enabled || solarThermal.enabled ? '<span class="badge badge-ok">✓ Instalație solară configurată</span>' : '<span class="badge badge-fail">✗ Nicio instalație solară configurată</span>') + '</div>' : ''}

<h2>5. GWP Lifecycle (EPBD IV Art.7)</h2>
<table>
<tr><th style="width:35%">Parametru</th><th style="width:25%">Valoare</th><th style="width:40%">Observații</th></tr>
<tr><td>CO₂ operațional</td><td style="text-align:center;font-weight:bold">${renewSummary.co2_adjusted_m2.toFixed(1)} kg/m²·an</td><td>Din calcul Mc 001-2022</td></tr>
<tr><td>Carbon înglobat (estimare)</td><td style="text-align:center">${(function(){var yb=parseInt(building.yearBuilt)||2000; return yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5;})().toFixed(0)} kg CO₂eq/m²·an</td><td>Estimare simplificată EN 15978 (50 ani)</td></tr>
<tr style="font-weight:bold;background:#e8edf5"><td>GWP Lifecycle Total</td><td style="text-align:center">${(function(){var co2O=renewSummary.co2_adjusted_m2; var gwpM=parseFloat(building.gwpLifecycle)||0; var yb=parseInt(building.yearBuilt)||2000; var emb=yb>=2020?(["RI","RC","RA"].includes(building.category)?10:12):5; return gwpM>0?gwpM:(co2O+emb);})().toFixed(1)} kg CO₂eq/m²·an</td><td>${Au>1000?'<span class="badge badge-warn">OBLIGATORIU (>1000 m²)</span>':'Opțional (obligatoriu >1000m² din 2028)'}</td></tr>
</table>
<div class="note">Conform EPBD IV Art.7, declararea GWP lifecycle devine obligatorie: clădiri noi >1000 m² din 2028, toate clădirile noi din 2030. Calculul complet necesită analiza ciclului de viață (LCA) conform EN 15978.</div>

<h2>6. Analiză cost-optimă simplificată</h2>
<div class="flex-row">
<div><div class="big">${annualCostEur.toFixed(0)} €</div><div class="lbl">Cost energie anual estimat</div></div>
<div><div class="big">${epF.toFixed(0)}</div><div class="lbl">kWh/m²·an (Ep)</div></div>
<div><div class="big">${renewSummary.co2_adjusted_m2.toFixed(1)}</div><div class="lbl">kg CO₂/m²·an</div></div>
</div>
<div class="note"><strong>Metodă cost-optimă:</strong> Pentru atingerea nZEB, se recomandă prioritizarea măsurilor cu raportul economie/investiție cel mai favorabil: (1) termoizolarea anvelopei opace, (2) înlocuirea tâmplăriei, (3) pompe de căldură/PV, (4) ventilare cu recuperare. Analiza cost-optimă detaliată necesită calcul conform Regulamentului Delegat UE 244/2012.</div>

<h2>7. Cadru legislativ aplicabil</h2>
<div class="note" style="line-height:1.6">
<strong>Legislație națională:</strong> Legea 372/2005 privind performanța energetică a clădirilor (mod. Legea 238/2024 + OUG 59/2025 RED III); Mc 001-2022 (Ord. MDLPA 16/2023); C107/2005 + Ord. 2641/2017; I5-2022 (ventilare și climatizare); SR 4839:2014 (date climatice).<br>
<strong>Legislație europeană:</strong> Directiva UE 2024/1275 (EPBD IV) — termen transpunere 29 mai 2026; Reg. Delegat UE 2025/2273 (republicare metodologie cost-optimă, referință 50 kWh/m²·an); SR EN ISO 52000-1:2017/NA:2023; SR EN ISO 52016-1:2017; SR EN ISO 13790; I5-2022 (ventilare).<br>
<strong>Praguri nZEB categoria ${building.category}:</strong> Ep < ${nzeb.ep_max} kWh/m²·an, RER ≥ ${nzeb.rer_min}%, RER on-site ≥ ${NZEB_THRESHOLDS[building.category]?.rer_onsite_min || 10}%.<br>
<strong>Notă:</strong> Acest raport este generat automat și are caracter orientativ. Nu înlocuiește raportul de audit energetic elaborat de un auditor atestat MDLPA.
</div>

<div style="display:flex;justify-content:space-between;margin-top:15px;font-size:8pt">
<div><strong>Auditor:</strong> ${auditor.name || "________"}<br>Atestat: ${auditor.atestat || "____"} / Gr. ${auditor.grade}</div>
<div style="text-align:center;border:1px dashed #999;padding:4px 20px;min-height:40px;font-size:6pt;color:#999">Semnătura / ștampila</div>
</div>

<div class="ft">Raport nZEB generat cu EnergoPro Mc001 v1.0 | ${dateNow} | L.372/2005 mod. L.238/2024, Mc 001-2022</div>
</body></html>`;

                    setNzebReportHtml(nzebHtml);
                    showToast("Raport nZEB generat.", "success");
                    } catch(e) { showToast("Eroare raport nZEB: " + e.message, "error", 6000); }
                  }}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm mt-3">
                    <span className="text-lg">📋</span> Raport conformare nZEB (L.238/2024)
                    {!canNzebReport && <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>}
                  </button>

                  {/* nZEB Report as downloadable HTML file */}
                  {nzebReportHtml && (
                    <button onClick={function() {
                      try {
                        const blob = new Blob([nzebReportHtml], {type:"text/html;charset=utf-8"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "Raport_nZEB_" + (building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,30) + "_" + new Date().toISOString().slice(0,10) + ".html";
                        document.body.appendChild(a); a.click();
                        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                        showToast("Raport nZEB descărcat ca HTML (deschide în browser → Print → Save as PDF)", "success", 5000);
                      } catch(e) { showToast("Eroare: " + e.message, "error"); }
                    }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] text-emerald-400/70 hover:bg-emerald-500/10 transition-all text-xs">
                      <span>💾</span> Descarcă raport nZEB (.html → Print to PDF)
                    </button>
                  )}

                  <button onClick={async function() {
                    try {
                      const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                      showToast("Se generează preview CPE...", "info", 2000);
                      const buf = await fetchTemplate(tpl.cpe);
                      const blob = await generateDocxCPE(buf, "cpe", {download: false});
                      if (blob) {
                        setDocxPreviewBlob(blob);
                        try {
                          const resp = await fetch("/api/preview-docx", { method: "POST", body: blob });
                          if (resp.ok) {
                            const data = await resp.json();
                            setDocxPreviewUrl(data.url);
                          }
                        } catch(e2) { /* fallback to docx-preview */ }
                        showToast("Preview CPE actualizat", "success", 1500);
                      }
                    } catch(e) { showToast("Eroare: " + e.message, "error"); }
                  }}
                    data-auto-preview="true"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all text-sm">
                    <span className="text-lg">📄</span> {lang==="EN"?"Generate EPC (Print / PDF)":"Generează CPE (Print / PDF)"}
                  </button>

                  {/* Certificate counter */}
                  {userTier !== "free" && (
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 text-[10px]">
                      <span className="opacity-50">{lang==="EN"?"Certificates this month":"Certificate luna aceasta"}</span>
                      <span className="font-bold">{certCount} / {tier.maxCerts === 999 ? "∞" : tier.maxCerts}</span>
                    </div>
                  )}

                  {/* #20 Mod prezentare */}
                  <button onClick={() => setPresentationMode(true)}
                    disabled={!instSummary}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-xs opacity-60 hover:opacity-100 transition-all">
                    <span>🖥️</span> Mod prezentare (ecran complet)
                  </button>

                </div>

                {/* Preview CPE — renderizare DOCX oficial */}
                <div className="xl:col-span-2 xl:sticky xl:top-6 xl:self-start">
                  <Card title={t("Preview Certificat",lang)} className="border-amber-500/30 shadow-lg shadow-amber-500/5">
                    {!docxPreviewBlob ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="animate-pulse">
                          <div className="text-4xl mb-3">📜</div>
                          <div className="text-sm opacity-50">{lang==="EN" ? "Generating certificate preview..." : "Se generează previzualizarea certificatului..."}</div>
                        </div>
                      </div>
                    ) : docxPreviewUrl ? (
                      <div className="bg-white rounded-lg overflow-hidden" style={{height:"85vh"}}>
                        <iframe
                          src={`https://docs.google.com/gview?url=${encodeURIComponent(docxPreviewUrl)}&embedded=true`}
                          className="w-full h-full border-0"
                          title="CPE Preview"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg overflow-hidden" style={{maxHeight:"85vh",overflowY:"auto"}}>
                        <div ref={docxPreviewRef} className="docx-preview-container" style={{transformOrigin:"top left",minHeight:"200px"}} />
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* ═══ EXPORT DOCX OFICIAL — full-width sub grid ═══ */}
              {(() => {
                const tpl = CPE_TEMPLATES[building.category] || CPE_TEMPLATES.AL;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
                    <button
                      disabled={!canExportDocx}
                      onClick={async () => {
                        if (!canExportDocx) return;
                        try {
                          showToast("Se generează CPE DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.cpe);
                          await generateDocxCPE(buf, "cpe");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !canExportDocx
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📋</span>
                        <div className="text-left">
                          <div className="font-medium">{lang==="EN" ? "Generate CPE DOCX" : "Generează CPE DOCX"}</div>
                          <div className="text-[10px] opacity-60">{tpl.cpe}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      disabled={!canExportDocx}
                      onClick={async () => {
                        if (!canExportDocx) return;
                        try {
                          showToast("Se generează Anexa DOCX...", "info", 2000);
                          const buf = await fetchTemplate(tpl.anexa);
                          await generateDocxCPE(buf, "anexa");
                        } catch(e) {
                          showToast("Eroare: " + e.message, "error", 5000);
                        }
                      }}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !canExportDocx
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📎</span>
                        <div className="text-left">
                          <div className="font-medium">{lang==="EN" ? "Generate Annex 1+2 DOCX" : "Generează Anexa 1+2 DOCX"}</div>
                          <div className="text-[10px] opacity-60">{tpl.anexa}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const html = generatePDF();
                        if (!html) return;
                        const printWin = window.open("", "_blank");
                        printWin.document.write(html);
                        printWin.document.close();
                        printWin.onload = () => { printWin.print(); };
                        showToast("PDF: folosește Print → Save as PDF", "info", 3000);
                      }}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">🖨️</span>
                        <div className="text-left">
                          <div className="font-medium">Export PDF (Print)</div>
                          <div className="text-[10px] opacity-60">Deschide CPE HTML → Save as PDF</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={generateXMLMDLPA}
                      disabled={!instSummary}
                      className={`w-full rounded-xl border transition-all text-sm ${
                        !instSummary
                          ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                          : "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 cursor-pointer"
                      }`}>
                      <div className="flex items-center justify-center gap-2 px-4 py-3">
                        <span className="text-lg">📤</span>
                        <div className="text-left">
                          <div className="font-medium">Export XML MDLPA</div>
                          <div className="text-[10px] opacity-60">Registru electronic Ord. 16/2023</div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 5: Calcul
                </button>
                <button onClick={() => setStep(7)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-all text-sm">
                  Pasul 7: Audit →
                </button>
              </div>
            </div>
            );
          })()}

          {/* ═══ STEP 7: AUDIT — RECOMANDĂRI DE REABILITARE ═══ */}
          {step === 7 && (() => {
            const Au = parseFloat(building.areaUseful) || 0;
            const V = parseFloat(building.volume) || 0;
            const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
            const epFinal = renewSummary ? renewSummary.ep_adjusted_m2 : (instSummary?.ep_total_m2 || 0);
            const co2Final = renewSummary ? renewSummary.co2_adjusted_m2 : (instSummary?.co2_total_m2 || 0);
            const enClass = getEnergyClass(epFinal, catKey);
            const co2Class = getCO2Class(co2Final, building.category);
            const rer = renewSummary?.rer || 0;
            const grid = ENERGY_CLASSES_DB[catKey] || ENERGY_CLASSES_DB[building.category];
            const nzebThresh = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
            const isNZEB = rer >= nzebThresh.rer_min && epFinal < nzebThresh.ep_max;

            // ── Analiza pierderilor prin anvelopa ──
            const envelopeAnalysis = (() => {
              if (!envelopeSummary) return [];
              const items = [];
              const volume = envelopeSummary.volume || 0;

              opaqueElements.forEach(el => {
                const area = parseFloat(el.area) || 0;
                const { u } = calcOpaqueR(el.layers, el.type);
                const elType = ELEMENT_TYPES.find(t => t.id === el.type);
                const tau = elType ? elType.tau : 1;
                const loss = tau * area * u;
                const uRef = el.type === "PE" ? 0.56 : el.type === "PSol" ? 0.40 : el.type === "PlanInt" ? 0.50 : el.type === "PlanExt" ? 0.20 : el.type === "Acoperiș" ? 0.20 : 0.35;
                items.push({
                  name: el.name || elType?.label || el.type,
                  type: "opac",
                  area,
                  u: u,
                  uRef,
                  loss,
                  needsUpgrade: u > uRef * 1.2,
                  potential: u > uRef ? ((u - uRef) * area * tau) : 0,
                  recommendation: u > uRef * 1.5 ? "Termoizolare urgenta" : u > uRef ? "Termoizolare recomandata" : "Conform",
                  priority: u > uRef * 1.5 ? 1 : u > uRef ? 2 : 3,
                });
              });

              glazingElements.forEach(el => {
                const area = parseFloat(el.area) || 0;
                const u = parseFloat(el.u) || 0;
                const uRef = 1.30; // Mc 001 ref pt tamplarie
                const loss = area * u;
                items.push({
                  name: el.name || "Tamplarie",
                  type: "vitrat",
                  area,
                  u,
                  uRef,
                  loss,
                  needsUpgrade: u > uRef * 1.1,
                  potential: u > uRef ? ((u - uRef) * area) : 0,
                  recommendation: u > 2.5 ? "Înlocuire tamplarie (tripan)" : u > uRef ? "Înlocuire tamplarie (dublu low-e)" : "Conform",
                  priority: u > 2.5 ? 1 : u > uRef ? 2 : 3,
                });
              });

              if (thermalBridges.length > 0) {
                const bridgeLoss = thermalBridges.reduce((s, b) => s + (parseFloat(b.psi)||0) * (parseFloat(b.length)||0), 0);
                if (bridgeLoss > envelopeSummary.totalHeatLoss * 0.15) {
                  items.push({
                    name: "Punti termice",
                    type: "punte",
                    area: 0,
                    u: 0,
                    uRef: 0,
                    loss: bridgeLoss,
                    needsUpgrade: true,
                    potential: bridgeLoss * 0.5,
                    recommendation: "Tratarea puntilor termice (izolare perimetrala continua)",
                    priority: 2,
                  });
                }
              }

              return items.sort((a, b) => a.priority - b.priority || b.potential - a.potential);
            })();

            // ── Analiza instalatii ──
            const installAnalysis = (() => {
              if (!instSummary) return [];
              const items = [];

              // Incalzire
              const etaH = instSummary.eta_total_h;
              if (instSummary.isCOP) {
                const cop = parseFloat(heating.eta_gen) || 3.5;
                if (cop < 4.0) items.push({ system:"Incalzire (pompa caldura)", issue:`COP=${cop.toFixed(1)} sub optim`, recommendation:"Modernizare pompa de caldura (COP > 4.5)", saving: instSummary.qf_h * (1 - cop/4.5), priority:2 });
              } else {
                if (etaH < 0.80) items.push({ system:"Încălzire", issue:`Randament total ${(etaH*100).toFixed(0)}% — suboptim`, recommendation:"Înlocuire cazan cu condensare (η>96%) sau pompa de caldura", saving: instSummary.qf_h * (1 - etaH/0.96), priority:1 });
                else if (etaH < 0.88) items.push({ system:"Încălzire", issue:`Randament total ${(etaH*100).toFixed(0)}% — mediu`, recommendation:"Optimizare sistem distributie si reglaj, sau cazan cu condensare", saving: instSummary.qf_h * (1 - etaH/0.93), priority:2 });
              }

              // Ventilare
              const ventType = VENTILATION_TYPES.find(t => t.id === ventilation.type);
              if (ventType && !ventType.hasHR && instSummary.qf_v > 0) {
                items.push({ system:"Ventilare", issue:"Fara recuperare caldura", recommendation:"Instalare sistem ventilare mecanica cu recuperare caldura (η>75%)", saving: instSummary.qH_nd * 0.20, priority:2 });
              }

              // Iluminat
              const pDens = parseFloat(lighting.pDensity) || 4.5;
              if (pDens > 8) items.push({ system:"Iluminat", issue:`Densitate putere ${pDens} W/m² — ridicata`, recommendation:"Înlocuire cu LED (< 4 W/m²) si senzori prezenta", saving: instSummary.qf_l * (1 - 4/pDens), priority:2 });
              else if (pDens > 5) items.push({ system:"Iluminat", issue:`Densitate putere ${pDens} W/m²`, recommendation:"Optimizare iluminat — LED si automatizare (senzori, timer)", saving: instSummary.qf_l * 0.20, priority:3 });

              // ACM
              const acmSrc = ACM_SOURCES.find(s => s.id === acm.source);
              if (acmSrc && !acmSrc.solarFraction && !solarThermal.enabled) {
                items.push({ system:"ACM", issue:"Fara sursa regenerabila pentru ACM", recommendation:"Adaugare panouri solare termice (2-4 m² per consumator)", saving: instSummary.qf_w * 0.40, priority:2 });
              }

              // Racire
              if (instSummary.hasCool) {
                const eer = parseFloat(cooling.eer) || 3.5;
                if (eer < 4.0) items.push({ system:"Răcire", issue:`EER=${eer.toFixed(1)} — sub optim`, recommendation:"Înlocuire cu sistem inverter performant (EER > 5.0)", saving: instSummary.qf_c * (1 - eer/5.0), priority:3 });
              }

              return items.sort((a, b) => a.priority - b.priority);
            })();

            // ── Recomandari regenerabile ──
            const renewRecommendations = (() => {
              const items = [];
              if (!photovoltaic.enabled && Au > 50) {
                items.push({ system:"Fotovoltaic", recommendation:`Instalare panouri PV (~${Math.min(Math.round(Au*0.3), 50)} m², ~${Math.min(Math.round(Au*0.3*0.20), 10)} kWp)`, impact:"Reducere ep 15-40%, crestere RER semnificativa", priority:1 });
              }
              if (!solarThermal.enabled && !acm.source?.includes("SOLAR")) {
                items.push({ system:"Solar termic", recommendation:`Colectoare solare pentru ACM (~${Math.max(2, Math.round((parseFloat(acm.consumers)||2)*1.5))} m²)`, impact:"Acoperire 40-60% din necesar ACM", priority:2 });
              }
              if (!heatPump.enabled && !instSummary?.isCOP) {
                items.push({ system:"Pompa de caldura", recommendation:"Pompa de caldura aer-apa (COP>4.0) pentru incalzire + ACM", impact:"Reducere consum final 50-70%, crestere RER", priority:1 });
              }
              if (!biomass.enabled && building.category?.startsWith("R")) {
                items.push({ system:"Biomasa", recommendation:"Cazan pe peleti ca sursa alternativa/backup", impact:"Sursa regenerabila locala, fP_ren=0.80", priority:3 });
              }
              if (rer < 30) {
                items.push({ system:"Obiectiv nZEB", recommendation:`RER actual=${rer.toFixed(1)}% — necesar ≥30% pentru conformitate nZEB`, impact:"Combinatie PV + pompa caldura pentru atingere prag", priority:1 });
              }
              return items.sort((a, b) => a.priority - b.priority);
            })();

            // ── Calcul scenariu reabilitat ──
            const rehabScenario = (() => {
              if (!rehabComparison || !instSummary) return null;
              const ri = rehabScenarioInputs;
              const fuel = instSummary.fuel;

              // Cost estimation based on active scenario inputs
              let costEnvelope = 0;
              if (ri.addInsulWall) {
                const wallArea = opaqueElements.filter(el => el.type === "PE").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += wallArea * (REHAB_COSTS.insulWall[parseInt(ri.insulWallThickness)] || 40);
              }
              if (ri.addInsulRoof) {
                const roofArea = opaqueElements.filter(el => el.type === "PP" || el.type === "PT").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += roofArea * (REHAB_COSTS.insulRoof[parseInt(ri.insulRoofThickness)] || 30);
              }
              if (ri.addInsulBasement) {
                const baseArea = opaqueElements.filter(el => el.type === "PB" || el.type === "PL").reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += baseArea * (REHAB_COSTS.insulBasement[parseInt(ri.insulBasementThickness)] || 40);
              }
              if (ri.replaceWindows) {
                const winArea = glazingElements.reduce((s, el) => s + (parseFloat(el.area)||0), 0);
                costEnvelope += winArea * (REHAB_COSTS.windows[parseFloat(ri.newWindowU)] || 200);
              }

              let costInstall = 0;
              if (ri.addHR) costInstall += REHAB_COSTS["hr" + (parseInt(ri.hrEfficiency) >= 90 ? "90" : parseInt(ri.hrEfficiency) >= 80 ? "80" : "70")] || 5000;
              if (ri.addHP) costInstall += (parseFloat(heating.power) || 10) * REHAB_COSTS.hpPerKw;

              let costRenew = 0;
              if (ri.addPV) costRenew += (parseFloat(ri.pvArea) || 0) * REHAB_COSTS.pvPerM2;
              if (ri.addSolarTh) costRenew += (parseFloat(ri.solarThArea) || 0) * REHAB_COSTS.solarThPerM2;

              const totalCost = costEnvelope + costInstall + costRenew;
              const qfSaved = rehabComparison.savings.qfSaved || 0;
              const annualCostSaving = qfSaved * 0.15; // ~0.15 EUR/kWh average
              const payback = annualCostSaving > 0 ? totalCost / annualCostSaving : 0;

              return {
                epCurrent: rehabComparison.original.ep,
                epRehab: rehabComparison.rehab.ep,
                classCurrent: rehabComparison.original.cls,
                classRehab: rehabComparison.rehab.cls,
                co2Reduction: rehabComparison.original.co2 - rehabComparison.rehab.co2,
                qfRehab: rehabComparison.rehab.qfTotal,
                costEnvelope, costInstall, costRenew, totalCost,
                costTotal: totalCost,
                payback: Math.min(payback, 30),
              };
            })();

            const priorityColor = p => p === 1 ? "text-red-400" : p === 2 ? "text-amber-400" : "text-green-400";
            const priorityLabel = p => p === 1 ? "URGENT" : p === 2 ? "RECOMANDAT" : "OPTIONAL";
            const priorityBg = p => p === 1 ? "bg-red-500/10 border-red-500/20" : p === 2 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20";

            return (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={() => setStep(6)} className="text-amber-500 hover:text-amber-400 text-sm">← Pas 6</button>
                  <h2 className="text-xl font-bold">{lang==="EN"?"Energy Audit — Rehabilitation Recommendations":"Audit Energetic — Recomandări de Reabilitare"}</h2>
                </div>
                <p className="text-xs opacity-40">Analiza automata si recomandari conform Mc 001-2022 pentru imbunatatirea performantei energetice</p>
              </div>

              {(!instSummary || !Au) ? (
                <Card title={t("Date insuficiente",lang)}>
                  <div className="text-center py-8 opacity-40">
                    <div className="text-3xl mb-3">⚠️</div>
                    <div className="text-sm">Completeaza pasii 1–6 pentru a genera recomandari de reabilitare</div>
                    <div className="text-xs mt-2">Sunt necesare: suprafata utila, anvelopa, instalatii si calcul energetic</div>
                  </div>
                </Card>
              ) : (
              <div className="space-y-5">


                {/* ── Radar performanță ── */}
                {instSummary && envelopeSummary && (
                <Card title={t("Radar performanță energetică",lang)}>
                  <svg viewBox="0 0 240 220" width="240" height="200" className="mx-auto block">
                    {(() => {
                      var cx=120,cy=105,mR=80;
                      var axes=[{l:"Anvelopa",v:Math.min(100,Math.max(0,100-envelopeSummary.G*120))},{l:"Încălzire",v:Math.min(100,(instSummary.eta_total_h||0)*100)},{l:"ACM",v:Math.min(100,(instSummary.eta_acm||0.85)*100)},{l:"Ventilare",v:Math.min(100,instSummary.hrEta>0?instSummary.hrEta*110:30)},{l:"Regenerabile",v:Math.min(100,(renewSummary?renewSummary.rer:0)*1.5)}];
                      var nn=axes.length, els=[];
                      [0.25,0.5,0.75,1].forEach(function(f){var pts=[];for(var i=0;i<nn;i++){var a=(i*360/nn-90)*Math.PI/180;pts.push((cx+mR*f*Math.cos(a))+","+(cy+mR*f*Math.sin(a)));}els.push(<polygon key={"g"+f} points={pts.join(" ")} fill="none" stroke="#333" strokeWidth="0.5"/>);});
                      axes.forEach(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;els.push(<line key={"a"+i} x1={cx} y1={cy} x2={cx+mR*Math.cos(a)} y2={cy+mR*Math.sin(a)} stroke="#444" strokeWidth="0.5"/>);els.push(<text key={"al"+i} x={cx+(mR+15)*Math.cos(a)} y={cy+(mR+15)*Math.sin(a)+3} textAnchor="middle" fontSize="7" fill="#888">{ax.l}</text>);});
                      var dPts=axes.map(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;var r=mR*(ax.v/100);return (cx+r*Math.cos(a))+","+(cy+r*Math.sin(a));}).join(" ");
                      els.push(<polygon key="dp" points={dPts} fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="2"/>);
                      axes.forEach(function(ax,i){var a=(i*360/nn-90)*Math.PI/180;var r=mR*(ax.v/100);els.push(<circle key={"dc"+i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)} r="3" fill="#f59e0b"/>);});
                      return els;
                    })()}
                  </svg>
                </Card>
                )}

                {/* ── Sumar situatie actuala ── */}
                <Card title={t("Situatia actuala — Sumar diagnostic",lang)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-black mb-1" style={{color: enClass.color}}>{enClass.cls}</div>
                      <div className="text-xs opacity-50">Clasa energetica</div>
                      <div className="text-sm font-bold mt-1">{epFinal.toFixed(1)} kWh/m²·an</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-black mb-1" style={{color: co2Class.color}}>{co2Class.cls}</div>
                      <div className="text-xs opacity-50">Clasa CO₂</div>
                      <div className="text-sm font-bold mt-1">{co2Final.toFixed(1)} kg/(m²·an)</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className={`text-2xl font-black mb-1 ${rer >= 30 ? "text-green-400" : "text-red-400"}`}>{rer.toFixed(1)}%</div>
                      <div className="text-xs opacity-50">RER (regenerabile)</div>
                      <div className="text-sm font-bold mt-1">{rer >= 30 ? "≥ 30% ✓" : "< 30% ✗"}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className={`text-2xl font-black mb-1 ${isNZEB ? "text-green-400" : "text-red-400"}`}>{isNZEB ? "DA" : "NU"}</div>
                      <div className="text-xs opacity-50">Statut nZEB</div>
                      <div className="text-sm font-bold mt-1">{isNZEB ? "Conform" : "Neconform"}</div>
                    </div>
                  </div>
                </Card>

                {/* ── Recomandari Anvelopa ── */}
                {envelopeAnalysis.length > 0 && (
                <Card title={t("R1 — Recomandari Anvelopa Termica",lang)}>
                  <div className="space-y-3">
                    {envelopeAnalysis.map((el, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(el.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(el.priority)}`}>
                                {priorityLabel(el.priority)}
                              </span>
                              <span className="text-sm font-medium">{el.name}</span>
                              {el.type !== "punte" && <span className="text-xs opacity-40">({el.area.toFixed(1)} m²)</span>}
                            </div>
                            <div className="text-xs opacity-60 mb-1">{el.recommendation}</div>
                            {el.type !== "punte" && (
                              <div className="flex gap-4 text-[10px] opacity-40">
                                <span>U actual: <strong className={el.u > el.uRef ? "text-red-400" : "text-green-400"}>{el.u.toFixed(3)}</strong> W/(m²K)</span>
                                <span>U referinta: {el.uRef.toFixed(2)} W/(m²K)</span>
                                <span>Pierdere: {el.loss.toFixed(1)} W/K</span>
                              </div>
                            )}
                          </div>
                          {el.potential > 0 && (
                            <div className="text-right shrink-0">
                              <div className="text-xs opacity-40">Potential economie</div>
                              <div className="text-sm font-bold text-amber-400">{el.potential.toFixed(1)} W/K</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {envelopeAnalysis.every(e => !e.needsUpgrade) && (
                      <div className="text-center text-sm text-green-400 py-3">✓ Anvelopa termica conforma — nu sunt necesare interventii</div>
                    )}
                  </div>
                </Card>
                )}

                {/* ── Recomandari Instalatii ── */}
                <Card title={t("R2 — Recomandari Instalatii",lang)}>
                  <div className="space-y-3">
                    {installAnalysis.length > 0 ? installAnalysis.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(item.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(item.priority)}`}>
                                {priorityLabel(item.priority)}
                              </span>
                              <span className="text-sm font-medium">{item.system}</span>
                            </div>
                            <div className="text-xs opacity-60 mb-1">{item.issue}</div>
                            <div className="text-xs text-amber-400/80">→ {item.recommendation}</div>
                          </div>
                          {item.saving > 0 && (
                            <div className="text-right shrink-0">
                              <div className="text-xs opacity-40">Economie estimata</div>
                              <div className="text-sm font-bold text-green-400">{item.saving.toFixed(0)} kWh/an</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-green-400 py-3">✓ Instalațiile sunt în parametri normali</div>
                    )}
                  </div>
                </Card>

                {/* ── Recomandari Regenerabile ── */}
                {renewRecommendations.length > 0 && (
                <Card title={t("R3 — Surse Regenerabile Recomandate",lang)}>
                  <div className="space-y-3">
                    {renewRecommendations.map((item, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${priorityBg(item.priority)}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColor(item.priority)}`}>
                                {priorityLabel(item.priority)}
                              </span>
                              <span className="text-sm font-medium">{item.system}</span>
                            </div>
                            <div className="text-xs text-amber-400/80">{item.recommendation}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs opacity-40">Impact</div>
                            <div className="text-xs opacity-70">{item.impact}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                )}


                {/* ── Analiză amortizare investiție 20 ani ── */}
                {rehabScenario && instSummary && (
                <Card title={lang==="EN"?"20-Year Investment Amortization":"Amortizare investiție 20 ani"}>
                  <svg viewBox="0 0 400 160" width="100%" height="140">
                    {(() => {
                      var costTotal = rehabScenario.costTotal || 30000;
                      var annualSaving = Math.max(100, (instSummary.qf_total - (rehabScenario.qfRehab||instSummary.qf_total*0.6)) * 0.15);
                      var discountRate = 0.03;
                      var energyInflation = 0.05;
                      var years = 20, data = [], cumCash = -costTotal, cumNPV = -costTotal;
                      for (var y = 0; y <= years; y++) {
                        var saving = y === 0 ? 0 : annualSaving * Math.pow(1 + energyInflation, y - 1);
                        cumCash += saving;
                        cumNPV += y === 0 ? 0 : saving / Math.pow(1 + discountRate, y);
                        data.push({y:y, cumCash:cumCash, cumNPV:cumNPV - costTotal + costTotal});
                      }
                      var minV = Math.min.apply(null, data.map(function(d){return Math.min(d.cumCash,d.cumNPV)}));
                      var maxV = Math.max.apply(null, data.map(function(d){return Math.max(d.cumCash,d.cumNPV)}));
                      var range = Math.max(maxV - minV, 1);
                      var oX = 40, cW = 340, cH = 110, bY = 140;
                      var els = [];
                      // Zero line
                      var zeroY = bY - ((0 - minV) / range) * cH;
                      els.push(<line key="z" x1={oX} y1={zeroY} x2={oX+cW} y2={zeroY} stroke="#666" strokeWidth="0.5" strokeDasharray="3 2"/>);
                      els.push(<text key="zt" x={oX-4} y={zeroY+3} textAnchor="end" fontSize="6" fill="#888">0</text>);
                      // Cash flow line
                      var cashPts = data.map(function(d,i){return (oX+i*cW/years)+","+(bY-((d.cumCash-minV)/range)*cH)}).join(" ");
                      els.push(<polyline key="cf" points={cashPts} fill="none" stroke="#22c55e" strokeWidth="2"/>);
                      // Payback marker
                      for (var pi = 1; pi < data.length; pi++) {
                        if (data[pi-1].cumCash < 0 && data[pi].cumCash >= 0) {
                          var px = oX + pi * cW / years;
                          els.push(<circle key="pb" cx={px} cy={zeroY} r="4" fill="#22c55e"/>);
                          els.push(<text key="pbt" x={px} y={zeroY-8} textAnchor="middle" fontSize="7" fill="#22c55e" fontWeight="bold">An {pi}</text>);
                          break;
                        }
                      }
                      // Labels
                      els.push(<text key="y0" x={oX} y={bY+10} fontSize="6" fill="#888">0</text>);
                      els.push(<text key="y20" x={oX+cW} y={bY+10} textAnchor="end" fontSize="6" fill="#888">20 ani</text>);
                      els.push(<text key="ti" x={200} y={12} textAnchor="middle" fontSize="7" fill="#22c55e">Flux cumulat (verde) | Economie: {annualSaving.toFixed(0)} EUR/an | Cost: {costTotal.toFixed(0)} EUR</text>);
                      return els;
                    })()}
                  </svg>
                </Card>
                )}

                {/* ── Scenariu Reabilitat — Comparatie ── */}
                {rehabScenario && (
                <Card title={t("Scenariu Reabilitare — Proiectie",lang)} className="border-amber-500/20">

                  <div className="flex gap-2 mb-4">
                    {SCENARIO_PRESETS.map(function(sp) { return (
                      <button key={sp.id} onClick={function(){ loadScenarioPreset(sp.id); }}
                        className={cn("flex-1 py-2 rounded-lg text-xs font-medium transition-all border",
                          activeScenario===sp.id ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "border-white/10 hover:bg-white/5")}>
                        {sp.label}
                      </button>
                    ); })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Comparatie clase */}
                    <div>
                      <div className="text-xs font-medium opacity-50 mb-3">Comparatie Clasa Energetica</div>
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <div className="text-[10px] opacity-40 mb-1">ACTUAL</div>
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-black"
                            style={{backgroundColor: rehabScenario.classCurrent.color + "30", color: rehabScenario.classCurrent.color, border:`2px solid ${rehabScenario.classCurrent.color}`}}>
                            {rehabScenario.classCurrent.cls}
                          </div>
                          <div className="text-sm font-bold mt-1">{rehabScenario.epCurrent.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">kWh/(m²·an)</div>
                        </div>
                        <div className="text-2xl opacity-20">→</div>
                        <div className="text-center">
                          <div className="text-[10px] text-amber-400 mb-1">REABILITAT</div>
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-black"
                            style={{backgroundColor: rehabScenario.classRehab.color + "30", color: rehabScenario.classRehab.color, border:`2px solid ${rehabScenario.classRehab.color}`}}>
                            {rehabScenario.classRehab.cls}
                          </div>
                          <div className="text-sm font-bold mt-1">{rehabScenario.epRehab.toFixed(1)}</div>
                          <div className="text-[10px] opacity-40">kWh/(m²·an)</div>
                        </div>
                      </div>
                      <div className="text-center mt-3">
                        <span className="text-sm font-bold text-green-400">
                          -{((1 - rehabScenario.epRehab / Math.max(1, rehabScenario.epCurrent)) * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs opacity-40 ml-2">reducere consum energie primara</span>
                      </div>
                      <div className="text-center mt-1">
                        <span className="text-sm font-bold text-green-400">-{rehabScenario.co2Reduction.toFixed(1)} kg/(m²·an)</span>
                        <span className="text-xs opacity-40 ml-2">reducere emisii CO₂</span>
                      </div>

                      {/* Grafic comparativ */}
                      <svg viewBox="0 0 280 80" width="100%" height="70" className="mt-3">
                        {(() => {
                          var epO = rehabScenario.epCurrent, epN = rehabScenario.epRehab, mx = Math.max(epO, epN, 1);
                          return (<g>
                            <text x="0" y="15" fontSize="7" fill="#888">Actual</text>
                            <rect x="50" y="6" width={Math.max(2,epO/mx*200)} height="16" fill={rehabScenario.classCurrent.color} rx="2" opacity="0.8"/>
                            <text x={53+epO/mx*200} y="18" fontSize="7" fill="#ccc">{epO.toFixed(0)}</text>
                            <text x="0" y="42" fontSize="7" fill="#f59e0b">Reabilitat</text>
                            <rect x="50" y="33" width={Math.max(2,epN/mx*200)} height="16" fill={rehabScenario.classRehab.color} rx="2" opacity="0.8"/>
                            <text x={53+epN/mx*200} y="45" fontSize="7" fill="#ccc">{epN.toFixed(0)}</text>
                            <rect x={50+epN/mx*200} y="33" width={Math.max(0,(epO-epN)/mx*200)} height="16" fill="#22c55e" rx="2" opacity="0.12"/>
                            <text x="140" y="68" textAnchor="middle" fontSize="7" fill="#22c55e">Economie: {Math.max(0,epO-epN).toFixed(0)} kWh/(m2a)</text>
                          </g>);
                        })()}
                      </svg>

                    </div>

                    {/* Estimare costuri */}
                    <div>
                      <div className="text-xs font-medium opacity-50 mb-3">Estimare Costuri Orientative</div>
                      <div className="space-y-2">
                        {rehabScenario.costEnvelope > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">🏗️ Anvelopa (termoizolare + tamplarie)</span>
                            <span className="text-sm font-bold">{(rehabScenario.costEnvelope).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        {rehabScenario.costInstall > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">⚙️ Instalatii (modernizare)</span>
                            <span className="text-sm font-bold">{(rehabScenario.costInstall).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        {rehabScenario.costRenew > 0 && (
                          <div className="flex justify-between items-center p-2 rounded bg-white/[0.03]">
                            <span className="text-xs">☀️ Surse regenerabile</span>
                            <span className="text-sm font-bold">{(rehabScenario.costRenew).toLocaleString("ro-RO")} €</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-sm font-medium">TOTAL ESTIMAT</span>
                          <span className="text-lg font-black text-amber-400">{(rehabScenario.totalCost).toLocaleString("ro-RO")} €</span>
                        </div>
                        {rehabScenario.payback > 0 && rehabScenario.payback < 30 && (
                          <div className="text-center text-xs opacity-40 mt-1">
                            Durata estimata recuperare investitie: ~{rehabScenario.payback.toFixed(0)} ani
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-2 rounded bg-white/[0.02] text-[10px] opacity-30">
                        * Costurile sunt estimative orientative si pot varia semnificativ in functie de piata locala, specificul cladirii si solutiile tehnice alese. Se recomanda obtinerea de oferte de pret de la furnizori.
                      </div>
                    </div>
                  </div>
                </Card>
                )}

                {/* ── Prioritizare masuri ── */}
                <Card title={t("Prioritizare Masuri de Interventie",lang)}>
                  <div className="space-y-4">
                    {[1,2,3].map(prio => {
                      const allItems = [
                        ...envelopeAnalysis.filter(e => e.needsUpgrade && e.priority === prio).map(e => ({...e, cat:"Anvelopa"})),
                        ...installAnalysis.filter(e => e.priority === prio).map(e => ({...e, cat:"Instalatii", name: e.system})),
                        ...renewRecommendations.filter(e => e.priority === prio).map(e => ({...e, cat:"Regenerabile", name: e.system})),
                      ];
                      if (allItems.length === 0) return null;
                      return (
                        <div key={prio}>
                          <div className={`text-xs font-bold uppercase mb-2 ${priorityColor(prio)}`}>
                            {prio === 1 ? "🔴 Prioritate 1 — Urgente" : prio === 2 ? "🟡 Prioritate 2 — Recomandate" : "🟢 Prioritate 3 — Optionale"}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {allItems.map((item, j) => (
                              <div key={j} className="flex items-center gap-2 p-2 rounded bg-white/[0.03] text-xs">
                                <span className="opacity-40">[{item.cat}]</span>
                                <span className="font-medium">{item.name}</span>
                                <span className="opacity-30 flex-1 text-right truncate">{item.recommendation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* ── Nota finala ── */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-xs font-medium opacity-50 mb-2">Nota privind auditul energetic</div>
                  <div className="text-[10px] opacity-35 space-y-1.5">
                    <div>Acest raport de audit este generat automat pe baza datelor introduse si serveste ca instrument orientativ de predimensionare. Nu inlocuieste auditul energetic detaliat realizat de un auditor energetic atestat MDLPA conform Legii 372/2005 modificata prin Legea 238/2024. Factori conversie conform SR EN ISO 52000-1:2017/NA:2023 (fP electricitate=2.50, fCO2 electricitate=0.107, fP energie ambientala=0).</div>
                    <div>Recomandari bazate pe: Mc 001-2022 (Ordinul MDLPA 16/2023), C107/2005, SR EN ISO 13790, Directiva UE 2024/1275 (EPBD IV), Legea 238/2024, si valorile de referinta din normativele romanesti.</div>
                    <div>Costurile orientative sunt estimate la nivelul anului 2025 si nu includ TVA, proiectare, avize sau alte costuri conexe.</div>
                    <div>Directiva UE 2024/1275 (EPBD IV, termen transpunere mai 2026) va introduce: clădiri cu emisii zero (ZEB) obligatoriu din 2028/2030, scală armonizată A-G (fără A+), pașaport renovare, jurnal digital al clădirii, și standarde minime de performanță energetică (MEPS).</div>
                  </div>
                </div>
              </div>
              )}

              {/* #13 Deviz estimativ reabilitare */}
              <button onClick={() => {
                if (!rehabComparison) { showToast("Configurați scenariul de reabilitare în Pasul 5", "error"); return; }
                const ri = rehabScenarioInputs;
                const lines = [];
                lines.push("DEVIZ ESTIMATIV REABILITARE ENERGETICĂ");
                lines.push("Clădire: " + (building.address || "—") + ", " + (building.city || "—"));
                lines.push("Data: " + new Date().toLocaleDateString("ro-RO"));
                lines.push("Auditor: " + (auditor.name || "—") + " / " + (auditor.atestat || "—"));
                lines.push("─".repeat(60));
                lines.push("Nr. | Măsură | Cantitate | Preț unitar | Total estimat");
                lines.push("─".repeat(60));
                let nr = 1, totalInv = 0;
                const Au = parseFloat(building.areaUseful) || 0;
                if (ri.addInsulWall) { const c = Au * 3.5 * 45; totalInv += c; lines.push(nr++ + " | Termoizolație pereți ETICS " + ri.insulWallThickness + "cm | " + (Au*3.5).toFixed(0) + " m² | 45 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addInsulRoof) { const c = Au * 1.1 * 35; totalInv += c; lines.push(nr++ + " | Termoizolație acoperiș " + ri.insulRoofThickness + "cm | " + (Au*1.1).toFixed(0) + " m² | 35 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addInsulBasement) { const c = Au * 25; totalInv += c; lines.push(nr++ + " | Izolație planșeu subsol " + ri.insulBasementThickness + "cm | " + Au.toFixed(0) + " m² | 25 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.replaceWindows) { const wArea = glazingElements.reduce((s,e) => s + (parseFloat(e.area)||0), 0); const c = wArea * 280; totalInv += c; lines.push(nr++ + " | Înlocuire tâmplărie (U=" + ri.newWindowU + ") | " + wArea.toFixed(1) + " m² | 280 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addHR) { const c = Au * 12; totalInv += c; lines.push(nr++ + " | Ventilare mecanică cu HR " + ri.hrEfficiency + "% | 1 buc | " + (Au*12).toFixed(0) + " € | " + c.toFixed(0) + " €"); }
                if (ri.addPV) { const c = parseFloat(ri.pvArea||0) * 350; totalInv += c; lines.push(nr++ + " | Panouri PV " + ri.pvArea + " m² | " + ri.pvArea + " m² | 350 €/m² | " + c.toFixed(0) + " €"); }
                if (ri.addHP) { const c = Au * 55; totalInv += c; lines.push(nr++ + " | Pompă de căldură COP=" + ri.hpCOP + " | 1 buc | " + (Au*55).toFixed(0) + " € | " + c.toFixed(0) + " €"); }
                if (ri.addSolarTh) { const c = parseFloat(ri.solarThArea||0) * 500; totalInv += c; lines.push(nr++ + " | Solar termic " + ri.solarThArea + " m² | " + ri.solarThArea + " m² | 500 €/m² | " + c.toFixed(0) + " €"); }
                lines.push("─".repeat(60));
                lines.push("TOTAL INVESTIȚIE ESTIMATĂ: " + totalInv.toFixed(0) + " € (fără TVA)");
                lines.push("TVA 19%: " + (totalInv * 0.19).toFixed(0) + " €");
                lines.push("TOTAL CU TVA: " + (totalInv * 1.19).toFixed(0) + " €");
                lines.push("");
                lines.push("Economie anuală estimată: " + (rehabComparison.savings.qfSaved * 0.12).toFixed(0) + " €/an");
                lines.push("Termen recuperare simplu: " + (totalInv / Math.max(1, rehabComparison.savings.qfSaved * 0.12)).toFixed(1) + " ani");
                lines.push("");
                lines.push("Notă: Prețurile sunt estimative (2025-2026, fără TVA) și pot varia ±30% în funcție de zonă, furnizor și complexitatea lucrărilor.");
                const blob = new Blob([lines.join("\n")], {type:"text/plain;charset=utf-8"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "Deviz_estimativ_" + (building.address||"cladire").replace(/[^a-zA-Z0-9]/g,"_").slice(0,25) + ".txt";
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
                showToast("Deviz estimativ descărcat", "success");
              }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/80 hover:bg-amber-500/10 transition-all text-sm mt-4">
                <span>📋</span> Generează deviz estimativ reabilitare (.txt)
              </button>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <button onClick={() => setStep(6)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm">
                  ← Pas 6: Certificat
                </button>
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-sm opacity-30 cursor-default">Pasul final ✓</div>
              </div>
            </div>
            );
          })()}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {showOpaqueModal && (
        <OpaqueModal
          element={editingOpaque}
          onSave={el => {
            if (editingOpaque && editingOpaque._idx !== undefined) {
              setOpaqueElements(prev => prev.map((e, i) => i === editingOpaque._idx ? el : e));
            } else {
              setOpaqueElements(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowOpaqueModal(false); setEditingOpaque(null); }}
        />
      )}

      {showGlazingModal && (
        <GlazingModal
          element={editingGlazing}
          onSave={el => {
            if (editingGlazing && editingGlazing._idx !== undefined) {
              setGlazingElements(prev => prev.map((e, i) => i === editingGlazing._idx ? el : e));
            } else {
              setGlazingElements(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowGlazingModal(false); setEditingGlazing(null); }}
        />
      )}

      {showBridgeModal && (
        <BridgeModal
          element={editingBridge}
          onSave={el => {
            if (editingBridge && editingBridge._idx !== undefined) {
              setThermalBridges(prev => prev.map((e, i) => i === editingBridge._idx ? el : e));
            } else {
              setThermalBridges(prev => [...prev, el]);
            }
          }}
          onClose={() => { setShowBridgeModal(false); setEditingBridge(null); }}
        />
      )}

      {/* #20 Mod prezentare ecran complet */}
      {presentationMode && instSummary && (() => {
        const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary.ep_total_m2;
        const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary.co2_total_m2;
        const catKey = building.category + (["RI","RC","RA"].includes(building.category) ? (cooling.hasCooling ? "_cool" : "_nocool") : "");
        const cls = getEnergyClass(epF, catKey);
        const co2Cls = getCO2Class(co2F, building.category);
        const rer = renewSummary?.rer || 0;
        const nzeb = NZEB_THRESHOLDS[building.category] || NZEB_THRESHOLDS.AL;
        const isNZEB = epF <= nzeb.ep_max && rer >= nzeb.rer_min;
        const Au = parseFloat(building.areaUseful) || 0;
        return (
          <div className="fixed inset-0 z-[99999] bg-[#0d1117] flex flex-col items-center justify-center p-8" onClick={() => setPresentationMode(false)}>
            <button onClick={() => setPresentationMode(false)} className="absolute top-4 right-4 text-white/40 hover:text-white text-2xl">✕</button>
            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-500/60 mb-2">Certificat de Performanță Energetică</div>
              <div className="text-2xl font-light text-white/60 mb-1">{building.address || "—"}, {building.city}</div>
              <div className="text-sm text-white/30">{BUILDING_CATEGORIES.find(c=>c.id===building.category)?.label} · {building.yearBuilt} · Au = {Au} m²</div>
            </div>
            <div className="flex items-center gap-16">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Clasa energetică</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-6xl font-black" style={{backgroundColor:cls.color+"30",color:cls.color,border:`3px solid ${cls.color}60`}}>{cls.cls}</div>
                <div className="text-3xl font-bold mt-3 font-mono" style={{color:cls.color}}>{epF.toFixed(1)}</div>
                <div className="text-xs text-white/40">kWh/(m²·an)</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Emisii CO₂</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-6xl font-black" style={{backgroundColor:co2Cls.color+"30",color:co2Cls.color,border:`3px solid ${co2Cls.color}60`}}>{co2Cls.cls}</div>
                <div className="text-3xl font-bold mt-3 font-mono" style={{color:co2Cls.color}}>{co2F.toFixed(1)}</div>
                <div className="text-xs text-white/40">kgCO₂/(m²·an)</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Regenerabile</div>
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black" style={{backgroundColor:rer>=30?"#22c55e30":"#ef444430",color:rer>=30?"#22c55e":"#ef4444",border:`3px solid ${rer>=30?"#22c55e60":"#ef444460"}`}}>{rer.toFixed(0)}%</div>
                <div className="text-lg font-bold mt-3" style={{color:rer>=30?"#22c55e":"#ef4444"}}>RER</div>
                <div className="text-xs text-white/40">min 30% nZEB</div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              {isNZEB && <div className="px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold">✓ nZEB CONFORM</div>}
              {!isNZEB && <div className="px-6 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold">✗ nZEB NECONFORM</div>}
              <div className="text-xs text-white/20">Nota energetică: {cls.score}/100 · Consum final: {instSummary.qf_total_m2.toFixed(1)} kWh/(m²·an)</div>
            </div>
            <div className="mt-6 text-[10px] text-white/15">Click oriunde pentru a închide · {auditor.name} · {auditor.company} · {new Date().toLocaleDateString("ro-RO")}</div>
          </div>
        );
      })()}

      {showBridgeCatalog && (
        <ThermalBridgeCatalog
          onSelect={(bridge) => {
            setThermalBridges(prev => [...prev, {
              name: bridge.name,
              type: bridge.cat,
              psi: String(bridge.psi),
              length: "",
            }]);
          }}
          onClose={() => setShowBridgeCatalog(false)}
        />
      )}

      {/* Reset confirmation modal */}

      {showTour && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{background:"rgba(0,0,0,0.75)"}}>
          <div className="bg-[#1a1d2e] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="text-center">
              <span className="text-3xl">{["📋","🏗️","⚙️","☀️","📊","📜","🔍"][tourStep]}</span>
              <h3 className="text-lg font-bold mt-2">{[
                "1. Identificare clădire","2. Anvelopa termică","3. Instalații","4. Surse regenerabile",
                "5. Calcul energetic","6. Certificat CPE","7. Audit & Recomandări"
              ][tourStep]}</h3>
            </div>
            <p className="text-sm opacity-70 text-center">{[
              "Începe prin selectarea localității, categoriei clădirii și introducerea dimensiunilor (suprafață utilă, volum). Poți folosi butonul de estimare automată.",
              "Adaugă elementele anvelopei: pereți, planșee, ferestre. Folosește soluțiile tip predefinite sau importă din CSV. Verifică transmitanța U vs referința nZEB.",
              "Configurează sistemele de încălzire, ACM, climatizare, ventilare și iluminat. Randamentele se completează automat din bazele de date.",
              "Activează sursele regenerabile: panouri solare, fotovoltaic, pompe de căldură, biomasă. Calculul RER se face automat.",
              "Vizualizează bilanțul energetic lunar (ISO 13790), clasarea A+→G, costurile estimate și benchmarking-ul cu clădiri similare.",
              "Generează Certificatul de Performanță Energetică în format oficial Mc 001-2022. Completează datele auditorului și exportă PDF.",
              "Analizează recomandările automate de reabilitare cu 3 scenarii (minim/mediu/maxim), grafic amortizare pe 20 ani și radar performanță."
            ][tourStep]}</p>
            <div className="flex gap-3">
              {tourStep > 0 && <button onClick={function(){setTourStep(function(s){return s-1});}} className="flex-1 py-2 rounded-xl border border-white/10 text-sm">← Înapoi</button>}
              {tourStep < 6 ? (
                <button onClick={function(){setTourStep(function(s){return s+1});}} className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-medium text-sm">Următorul →</button>
              ) : (
                <button onClick={function(){setShowTour(false);setTourStep(0);}} className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-medium text-sm">Începe lucrul!</button>
              )}
            </div>
            <div className="flex justify-center gap-1">{[0,1,2,3,4,5,6].map(function(i){return <div key={i} className={cn("w-2 h-2 rounded-full",i===tourStep?"bg-amber-500":"bg-white/20")}/>})}</div>
          </div>
        </div>
      )}

      {/* ═══ MOBILE BOTTOM NAVIGATION BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-[9990] lg:hidden" style={{background:theme==="dark"?"rgba(10,10,26,0.95)":"rgba(245,247,250,0.95)",backdropFilter:"blur(12px)",borderTop:theme==="dark"?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.1)"}}>
        <div className="flex items-stretch overflow-x-auto" style={{scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => { setStep(s.id); setSidebarOpen(false); }}
              className="flex flex-col items-center justify-center flex-shrink-0 py-1.5 transition-all"
              style={{width: (100/STEPS.length)+"%", minWidth: "52px", opacity: step === s.id ? 1 : 0.45}}>
              <span className="text-base leading-none">{s.icon}</span>
              <span className="text-[8px] mt-0.5 font-medium leading-tight truncate w-full text-center px-0.5"
                style={{color: step === s.id ? "#f59e0b" : "inherit"}}>
                {lang==="EN" ? (s.labelEN||s.label) : s.label}
              </span>
              {step === s.id && <div className="w-4 h-0.5 rounded-full bg-amber-500 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>
      {/* Bottom nav spacer for mobile content */}
      <div className="h-14 lg:hidden" />

      {/* Project Manager Modal */}
      {showProjectManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-5 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col" style={theme==="light"?{background:"#fff",color:"#1a1a2e"}:{}}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📁 Proiecte salvate</h3>
              <button onClick={() => setShowProjectManager(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">&times;</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                const name = (building.address || "Proiect " + new Date().toISOString().slice(0,10));
                saveProjectAs(name);
              }} className="flex-1 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all">
                ＋ Salvează proiectul curent
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {projectList.length === 0 && (
                <div className="text-center py-8 opacity-40 text-sm">Niciun proiect salvat.<br/>Folosește butonul de mai sus pentru a salva.</div>
              )}
              {projectList.map(p => (
                <div key={p.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  p.id === activeProjectId ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                )} onClick={() => loadProject(p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[10px] opacity-40 flex gap-2">
                      <span>{p.date}</span>
                      {p.category && <span>• {BUILDING_CATEGORIES.find(c=>c.id===p.category)?.label || p.category}</span>}
                    </div>
                  </div>
                  {p.id === activeProjectId && <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">activ</span>}
                  <button onClick={(e) => { e.stopPropagation(); if (p.id !== activeProjectId) deleteProject(p.id); else showToast("Nu poți șterge proiectul activ.", "error"); }}
                    className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400/50 hover:text-red-400 text-xs transition-all">🗑</button>
                </div>
              ))}
            </div>
            <div className="text-[10px] opacity-30 text-center pt-1 border-t border-white/5">
              Proiectele se salvează local în browser. Max ~20 proiecte.
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="bg-[#12141f] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold">Proiect nou</h3>
              <p className="text-sm opacity-50 mt-2">Toate datele introduse vor fi șterse. Această acțiune nu poate fi anulată.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition-all">
                Anulează
              </button>
              <button onClick={resetProject}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-all">
                Șterge tot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
