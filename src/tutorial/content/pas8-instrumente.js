// ═════════════════════════════════════════════════════════════════════════════
// Pas 8 — Instrumente avansate (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 8 grupează 18 module avansate accesibile DOAR în planul Zephren Expert (2.999 RON+): verificare nZEB stringent, MEPS optimizator EPBD 2030/2033, BACS detaliat 200 factori EN 15232, SRI complet 42 servicii, cooling hourly TMY, Pasivhaus standard, Monte Carlo EP, Portfolio Manager, BIM IFC import, GWP lifecycle EN 15978 și altele. Esențial pentru clădiri mari, nerezidențiale, sau pentru auditori senior/consultanți.",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "Modulele Expert",
      title: "De ce Pasul 8 e separat — și pentru cine",
      body: "Pasul 8 conține analizele care depășesc CPE-ul standard. Util pentru: 1) Clădiri mari nerezidențiale unde MEPS+BACS+SRI sunt obligatorii. 2) Audituri profunde cu finanțare PNRR/EFRD unde Monte Carlo EP cuantifică riscul. 3) Pasivhaus voluntary (PHI Frankfurt) — standard mai strict decât nZEB. 4) Portofolii clădiri (asociații, firme) cu Portfolio Manager. 5) Clădiri noi cu BIM IFC import — auto-citire planuri.",
      highlight: "BACS+SRI+MEPS simple sunt accesibile pe toate planurile plătite (IIci/Ici/Expert). Pasul 8 = versiunile DETALIATE + module extra.",
    },

    {
      id: "decision-modules",
      type: "decision",
      kicker: "Decizia modulelor relevante",
      title: "Ce module activezi pentru proiectul tău",
      options: [
        {
          title: "RI standard (M2)",
          pros: ["Module utile: Verificare nZEB strict, MEPS 2030, Cooling hourly (dacă AC), Pasivhaus (opțional)"],
          cons: ["Nu necesită BACS detaliat / SRI / Portfolio"],
          recommendation: "Activează doar nZEB + Cooling + Pasivhaus pentru reabilitare profundă",
        },
        {
          title: "BI mare nerezidențial (M3)",
          pros: ["Toate modulele relevante: BACS detaliat, SRI complet, MEPS optimizator, Cooling hourly, Monte Carlo"],
          cons: ["Setup ~2-4 ore complete vs 30 min CPE simplu"],
          recommendation: "Activează toate. BACS clasa B obligatorie >290 kW conform L.372/2005 mod.",
        },
        {
          title: "Educație (M4) — finanțare PNRR",
          pros: ["MEPS optimizator + Monte Carlo pentru cuantificare risc + Portfolio dacă mai multe școli"],
          cons: ["BACS pentru școli — opțional dar recomandat ≥A pentru economie energie operare"],
          recommendation: "Module prioritare: MEPS + Monte Carlo + Foto-album",
        },
        {
          title: "Portfolio clădiri (>5 imobile)",
          pros: ["Portfolio Manager + Monte Carlo pe lot + dashboard clase agregat"],
          cons: ["Necesită Plan Birou 5.999 RON+ sau Enterprise"],
          recommendation: "Plan Birou minim pentru >5 clădiri",
        },
      ],
    },

    {
      id: "fields-modules-list",
      type: "fields",
      kicker: "Lista module Pas 8",
      title: "Cele 18 module accesibile (Expert+)",
      body: "Activare per modul în tab-urile din Pas 8. Fiecare are propriul flow + export.",
      items: [
        { label: "1. Verificare nZEB strict", dataType: "tab", required: false, note: "EP_nren ≤ limită + RER ≥ 30% + GWP ≤ limită" },
        { label: "2. MEPS optimizator", dataType: "tab", required: false, note: "Roadmap 2030/2033/2050 cu reabilitări etapizate" },
        { label: "3. BACS detaliat 200 factori", dataType: "tab", required: false, note: "EN 15232 cu evaluare per serviciu" },
        { label: "4. SRI complet 42 servicii", dataType: "tab", required: false, note: "Reg. UE 2020/2155. Obligatoriu >290 kW din 2025" },
        { label: "5. Cooling hourly TMY", dataType: "tab", required: false, note: "ISO 52016 orar cu Test Reference Year" },
        { label: "6. Pasivhaus", dataType: "tab", required: false, note: "Standard voluntary PHI Frankfurt. Q_h ≤15, blower door ≤0.6, EP_total ≤120" },
        { label: "7. Monte Carlo EP", dataType: "tab", required: false, note: "Cuantificare incertitudine 1000 simulări" },
        { label: "8. EN 12831 rooms", dataType: "tab", required: false, note: "Sarcină termică pe încăpere pentru dimensionare instalații" },
        { label: "9. Thermovision import", dataType: "tab", required: false, note: "Import imagini termoviziune cu auto-detect punți" },
        { label: "10. Urban Heat Island", dataType: "tab", required: false, note: "Ajustare T_ext vară pentru orașe (+2-3°C)" },
        { label: "11. Historic monumente", dataType: "tab", required: false, note: "Derogări nZEB + recomandări compatibile" },
        { label: "12. Mixed-use", dataType: "tab", required: false, note: "Clădiri cu 2+ categorii (parter comercial + etaje rezidențiale)" },
        { label: "13. Portfolio Manager", dataType: "tab", required: false, note: "Multi-clădire dashboard. Plan Birou+" },
        { label: "14. ConsumReconciliere", dataType: "tab", required: false, note: "Real (facturi OCR) vs calc — calibrare automat" },
        { label: "15. ConsumoTracker", dataType: "tab", required: false, note: "Monitorizare live consum (IoT integration)" },
        { label: "16. Pașaport detaliat LCC", dataType: "tab", required: false, note: "Pașaport cu costuri operare + mentenanță 30 ani" },
        { label: "17. BIM IFC import", dataType: "tab", required: false, note: "Citire automată elemente din fișier .ifc Revit/ArchiCAD" },
        { label: "18. GWP lifecycle EN 15978", dataType: "tab", required: false, note: "Calcul amprentă carbon cradle-to-grave 50 ani" },
      ],
    },

    {
      id: "fields-meps-roadmap",
      type: "fields",
      kicker: "MEPS Roadmap",
      title: "Date pentru optimizator MEPS 2030/2033",
      items: [
        { label: "EP actual (Pas 5)", dataType: "auto", required: true, note: "Citit auto" },
        { label: "Target 2030", dataType: "clasă", required: true, note: "RI: ≤200 (clasa E). RC: ≤250" },
        { label: "Target 2033", dataType: "clasă", required: true, note: "Default clasa D (RI ≤160, RC ≤190)" },
        { label: "Target 2050", dataType: "clasă", required: true, note: "ZEB (RI ≤50, RC ≤45, BI ≤60)" },
        { label: "Buget total disponibil", dataType: "EUR", required: false, note: "Pentru optimizare faze. Lipsă = bonus PNRR auto" },
        { label: "Apetit risc", dataType: "enum", required: false, note: "Conservator / Mediu / Agresiv. Influențează scenarii Pasivhaus" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Module per categorie",
      title: "Ce module sunt utile per categorie",
      branches: [
        {
          category: "RA/RC (apartament/bloc)",
          appliesTo: ["M1"],
          description: "Module utile: MEPS, Foto-album. Inaplicabile: BACS detaliat (rezidențial), Portfolio (un imobil).",
        },
        {
          category: "RI standard",
          appliesTo: ["M2"],
          description: "Module utile: nZEB strict, MEPS, Cooling hourly (dacă AC), Pasivhaus voluntary, GWP.",
        },
        {
          category: "RI nou ZEB (M5)",
          appliesTo: ["M5"],
          description: "Toate modulele pentru documentare ZEB: Pasivhaus, nZEB strict, GWP, Monte Carlo (cuantificare riscuri performanță).",
        },
        {
          category: "BI/HC (nerezidențial)",
          appliesTo: ["M3"],
          description: "Module obligatorii: BACS detaliat, SRI complet, MEPS, Cooling hourly, Monte Carlo. Toate Expert.",
        },
        {
          category: "ED/SP (instituțional)",
          appliesTo: ["M4"],
          description: "Module utile: MEPS PNRR-eligibil, Monte Carlo, Portfolio (asociație învățământ), ConsumReconciliere.",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Standardele Pasului 8",
      refs: [REFS.epbd_art9, REFS.sr_en_15232, REFS.sr_en_iso_52016, REFS.epbd_art6, REFS.mc001, REFS.eidas2],
      quote: "Statele membre asigură că toate clădirile nerezidențiale cu sisteme HVAC cu putere efectivă > 290 kW dețin sisteme de automatizare și control al clădirilor de clasa B sau echivalent, până la 31 decembrie 2024.",
      quoteSource: "EPBD 2024 Art. 14 alin. 4",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni Pas 8",
      terms: [GLOSSARY.BACS, GLOSSARY.SRI, GLOSSARY.MEPS, GLOSSARY.ZEB, GLOSSARY.GWP, GLOSSARY.nZEB],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli Pas 8",
      items: [
        {
          title: "Pasivhaus = nZEB (confuzie)",
          body: "Pasivhaus (PHI Frankfurt) e voluntary, MULT mai strict decât nZEB RO. Q_h ≤15 kWh/m²a, n50 ≤0.6, EP_total ≤120 kWh/m²a. nZEB RO RI = EP ≤125, fără Q_h strict.",
          fix: "Folosește Pasivhaus DOAR dacă clientul cere certificare PHI. Standard regulatoriu RO = Mc 001 nZEB.",
        },
        {
          title: "BACS clasa A pentru rezidențial",
          body: "BACS EN 15232 e proiectat pentru nerezidențial. La rezidențial, sistem clasa A subutilizat (proprietarul nu folosește 200 factori). Recomandare: clasa B (echilibru).",
          fix: "Pentru rezidențial — BACS simplu A-D auto-eval. Detaliat doar BI/HC.",
        },
        {
          title: "Monte Carlo fără input variabilitate",
          body: "Monte Carlo cu toate parametrele fixe = simulare deterministă. Trebuie să introduci range incertitudine pentru fiecare param (Au ±5%, U ±15%, fP ±10% etc.).",
          fix: "Pas 8 — tab Monte Carlo cere range explicit. Default 1000 simulări → distribuție EP cu σ.",
        },
        {
          title: "BIM IFC fără ortografie corectă elemente",
          body: "Fișiere IFC din Revit/ArchiCAD pot avea elemente cu nume custom (Wall_TypeA1 vs IfcWall). Importer Zephren caută IFC standard.",
          fix: "Pre-procesează IFC în software original. Verifică nume elemente standardizate IfcWall, IfcSlab, IfcWindow.",
        },
        {
          title: "GWP fără date material cradle-to-grave",
          body: "GWP EN 15978 cere date pentru fiecare material (kg CO₂eq/kg material). Lipsa = subestimare 50-70%.",
          fix: "Zephren are EPD database (Environmental Product Declaration) pentru materiale comune. Pentru custom — atașează EPD producător.",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Output Pas 8 → documente finale",
      flows: [
        { from: "MEPS roadmap", to: "Pașaport Pas 7 jaloane", description: "Plan etapizat 2030/2033" },
        { from: "BACS clasa", to: "Pas 5 f_BAC × EP", description: "Ajustare automată EP" },
        { from: "SRI score", to: "Anexa CPE Pas 6", description: "Indicator readiness inteligent" },
        { from: "Cooling hourly", to: "Pas 5 Q_C calibrat", description: "Override Q_C lunar cu detaliat" },
        { from: "Pasivhaus pass/fail", to: "Anexa raport audit", description: "Certificare voluntary documentată" },
        { from: "Monte Carlo σ", to: "Raport Cap. 8 concluzii", description: "Cuantificare risc performanță" },
        { from: "BIM IFC", to: "Pas 2 anvelopă auto-fill", description: "Pre-completare elementelor" },
        { from: "GWP", to: "Pas 6 CPE EPBD 2024", description: "Indicator obligatoriu Art. 17" },
      ],
    },

    {
      id: "what-if-bacs",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Impact factor BACS asupra EP",
      body: "EN 15232 — clasa BACS reduce EP cu factor f_BAC. Variază clasa pentru a vedea impact.",
      parameter: "bacs_class",
      paramLabel: "Clasa BACS",
      paramUnit: "(A=0, D=3)",
      min: 0,
      max: 3,
      step: 1,
      defaultValue: 2,
      formula: ({ value }) => {
        // f_BAC pentru rezidențial: A=0.83, B=0.87, C=1.0 (ref), D=1.10
        const factors = [0.83, 0.87, 1.0, 1.10];
        const factor = factors[Math.round(value)] || 1.0;
        const EP_baseline = 200; // kWh/m²a pentru clădire reabilitată mediu
        const EP_adjusted = EP_baseline * factor;
        return { output: EP_adjusted, unit: "kWh/m²a", label: "EP ajustat BACS", decimals: 0 };
      },
      baseline: { value: 2, output: 200, label: "Clasa C (referință, fără ajustare)" },
      presets: [
        { label: "A (high)", value: 0 },
        { label: "B (recomandat)", value: 1 },
        { label: "C (ref)", value: 2 },
        { label: "D (slab)", value: 3 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Pas 8",
      items: [
        "<b>BACS &gt;290 kW</b> + clasa &lt;B = blocaj. EPBD 2024 Art. 14.",
        "<b>SRI &lt;30%</b> + clădire nouă = warning (smart-readiness insuficient).",
        "<b>MEPS 2030 nesatisfăcut</b> = warning pentru blocaj vânzare după 2030.",
        "<b>Pasivhaus tested</b> + pass = badge verde în raport.",
        "<b>Monte Carlo σ &gt;30%</b> = warning incertitudine mare.",
        "<b>GWP &gt;500 kg/m²</b> = warning amprentă mare (lifecycle 50 ani).",
        "<b>Portfolio &gt;5 clădiri</b> + plan Free/Ici = blocaj (necesită Birou).",
        "<b>BIM IFC eroare parsare</b> = mesaj clar cu element problematic.",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 8",
      items: [
        "Simulare 3D detaliată CFD (Computational Fluid Dynamics) — pentru asta Ansys Fluent / OpenFOAM.",
        "Calcul răcire pasivă cu mass termică detaliată — Cooling hourly e quasi-static. Real dynamic: TRNSYS.",
        "Optimizare schedules cooling (peak shaving) — Pas 8 doar evaluare; pentru control: BMS dedicat.",
        "Audit lighting detaliat per cameră — LENI agregat, pentru cameră: software Dialux.",
        "Tracking real-time consum IoT — ConsumoTracker afișează date, dar nu controlează (read-only).",
        "Certificare LEED/BREEAM/EDGE — Zephren generează inputs, dar certificarea necesită auditor extern specializat.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Pas 8 pentru M3 (birouri)",
      values: [
        { label: "BACS actual", value: "Clasa C", note: "Tipic 2005" },
        { label: "BACS target", value: "Clasa B oblig.", note: "EPBD 2024 (>290 kW)" },
        { label: "SRI", value: "42%", note: "Categorie 'minimal'" },
        { label: "MEPS 2030", value: "Conform", note: "EP=334 < limita 400" },
        { label: "Pasivhaus", value: "N/A", note: "Renovare comercial" },
        { label: "Monte Carlo σ", value: "±18%", note: "1000 sim. tipic" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test Pas 8",
      questions: [
        {
          question: "Pentru o clădire de birouri cu sistem HVAC 350 kW total, EPBD 2024 Art. 14 cere:",
          options: ["BACS clasa A obligatoriu", "BACS clasa B obligatoriu până 31.12.2024", "BACS opțional (recomandat clasa C)", "Doar SRI calculat, BACS opțional"],
          correct: 1,
          explanation: "EPBD 2024 Art. 14 alin. 4 — clădiri nerezidențiale cu HVAC >290 kW total trebuie să aibă BACS clasa B sau echivalent până 31.12.2024. Sancțiuni naționale conform Stat Membru.",
        },
        {
          question: "Standardul Pasivhaus (PHI Frankfurt) cere pentru clădire nouă:",
          options: ["EP ≤125 kWh/m²a + n50 ≤1.5", "EP ≤120, Q_h ≤15 kWh/m²a, n50 ≤0.6 h⁻¹", "Clasa A energetică + RER ≥30%", "EP_nren = 0 (ZEB)"],
          correct: 1,
          explanation: "Pasivhaus PHI Frankfurt: EP_total ≤120 kWh/m²a, Q_h heating demand ≤15 kWh/m²a, n50 air tightness ≤0.6 h⁻¹, factor confort vară ≤10% ore > 25°C. Mai strict decât nZEB RO.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum justifici Pasul 8 la client (ROI consultanță)",
      body: "Pasul 8 = consultanță avansată, NU CPE standard. Tarif suplimentar 1.500-5.000 RON per clădire. Justificare la client: 1) BACS detaliat — economie operare 10-15% anual. ROI tipic 2-3 ani prin reducerea facturilor. 2) MEPS optimizator — evită amenzi 2030+ (blocaj vânzare clasa F/G). 3) Monte Carlo — necesar dossier finanțare bancă verde (cuantificare risc). 4) Pasivhaus — voluntary, dar +15-25% valoare imobiliară. 5) BIM IFC — accelerare proces 70% (auto-fill din planuri). Foloseste tabel ROI vs cost consultanță, NU expune doar 'modulul X'.",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație Pas 8",
      title: "Cerințe EPBD 2024 pe module avansate",
      changes: [
        {
          period: "31.12.2024",
          title: "BACS clasa B obligatoriu nerezidential >290 kW",
          body: "EPBD 2024 Art. 14 alin. 4. Sancțiuni naționale RO se aplică din 2025.",
          refs: [REFS.epbd_2024, REFS.sr_en_15232],
        },
        {
          period: "2025",
          title: "SRI complet obligatoriu nerezidential",
          body: "Reg. UE 2020/2155 — clădiri >290 kW cu SRI score afișat în CPE.",
        },
        {
          period: "2028",
          title: "GWP lifecycle în CPE",
          body: "EPBD Art. 17 — indicator GWP obligatoriu pentru clădiri noi din 2028. Calcul EN 15978.",
          refs: [REFS.epbd_art17],
        },
        {
          period: "2030",
          title: "Renovari profunde Componenta C5 PNRR — Monte Carlo",
          body: "Banks UE cer Monte Carlo pentru finanțări >500.000 EUR rehab. Cuantificare risc performanță.",
        },
        {
          period: "2050",
          title: "Stoc ZEB complet — toate modulele integrate",
          body: "Pașaport detaliat LCC + GWP + SRI + BACS = standard per clădire UE.",
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Module specializate",
      cases: [
        {
          title: "🌡️ Cooling hourly TMY pentru hospital",
          body: "Spital cu sarcini cooling 24/7 (saloane, săli operație). Quasi-static lunar subestimează pic-uri vară. Cooling hourly cu TMY (Test Reference Year) generat din date 30 ani Brașov INSA. Output: Q_C orar + dimensionare chiller exactă.",
        },
        {
          title: "🤖 BIM IFC import din Revit",
          body: "Auto-citire fișier .ifc (4MB tipic) cu 2.500 elemente. Zephren parse-uri toate IfcWall + IfcWindow + IfcDoor + IfcSlab + IfcRoof. Output: pre-completare Pas 2 anvelopă în 30 secunde vs 2 ore manual.",
        },
        {
          title: "📊 Portfolio Manager — 20 clădiri",
          body: "Dashboard agregat clase A+→G + Σ EP + Σ economie potential reabilitare. Util pentru asociații (vot rehab), bănci (portfolio impact ESG), corporații (CSR reporting).",
        },
        {
          title: "🌍 GWP lifecycle 50 ani",
          body: "Calcul cradle-to-grave EN 15978: materiale anvelopă + structură + finisaje + sisteme + transport + montaj + operare 50 ani + demolare. Output: kg CO₂eq/m² lifecycle. Compare vs ECO scheme (LEED, BREEAM).",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export Pas 8",
      title: "Documente module avansate",
      outputs: [
        { icon: "📊", format: "Raport BACS detaliat PDF", description: "200 factori evaluați + recomandare clasă optimă.", planRequired: "Expert 2.999 RON+" },
        { icon: "🎯", format: "MEPS Roadmap DOCX", description: "Plan etapizat 2030/2033/2050 cu costuri cumulate.", planRequired: "Expert+" },
        { icon: "📈", format: "Monte Carlo Report XLSX", description: "1000 simulări + distribuție EP + intervale confianță.", planRequired: "Expert+" },
        { icon: "🏆", format: "Certificare Pasivhaus", description: "Document pre-certificare PHI. Pentru aplicație oficială externă.", planRequired: "Expert+" },
        { icon: "🌍", format: "GWP Report EN 15978", description: "Cradle-to-grave 50 ani cu EPD references.", planRequired: "Expert+" },
        { icon: "📋", format: "Portfolio Dashboard PDF", description: "Multi-clădire summary cu KPI agregat.", planRequired: "Birou 5.999 RON+" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări module avansate",
      items: [
        { q: "Pasivhaus vs nZEB — care e mai bun?", a: "Pasivhaus mai strict (Q_h ≤15 vs nZEB Q_h ~50-70 RI). Dar nZEB include cooling + ACM + iluminat. Pasivhaus voluntary; nZEB regulatoriu. Recomandare: nZEB obligatoriu, Pasivhaus bonus +15-25% valoare imobiliară." },
        { q: "BACS clasa A merită pentru rezidențial?", a: "Tipic NU. Clasa A optimizată nerezidențial cu ocupare variabilă. Rezidențial — clasa B (smart-thermostat + zoning) suficient. ROI clasa A vs B la rezidențial = >15 ani." },
        { q: "Monte Carlo necesită cât timp?", a: "1000 simulări × ~50ms = ~50 secunde browser. Mai mult dacă date complete (10.000 simulări 8 min). Output: distribuție EP cu media + σ + percentile P05/P95." },
        { q: "BIM IFC funcționează cu Revit 2024?", a: "DA. Zephren parser bazat pe IFC4 (Revit 2018+). Pentru ArchiCAD/Bentley/Allplan — verifică export IFC4 standard. Custom property sets: importate ca metadata, nu calculate." },
        { q: "GWP cradle-to-grave vs cradle-to-gate?", a: "Cradle-to-gate = doar producția materialelor (stage A1-A3). Cradle-to-grave = ciclu complet 50 ani (A1-A5 + B1-B7 + C1-C4). EPBD 2024 cere cradle-to-grave pentru CPE." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 8",
      links: [
        { title: "Pasivhaus PHI Frankfurt", url: "https://passivehouse.com", description: "Standard voluntary internațional" },
        { title: "Reg. UE 2020/2155 SRI", url: "https://eur-lex.europa.eu/eli/reg_del/2020/2155/oj", description: "Smart Readiness Indicator metodologie" },
        { title: "BuildingSMART IFC4", url: "https://www.buildingsmart.org", description: "Schema IFC pentru import BIM" },
        { title: "EPD International (PCR)", url: "https://www.environdec.com", description: "Environmental Product Declarations" },
        { title: "Eurostat Construction Price Index", url: "https://ec.europa.eu/eurostat", description: "Costuri construcție UE quarterly" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap final tutorial",
      title: "Ce am acoperit în toate 8 pași",
      bullets: [
        "<b>Pas 1</b> — Identificare: categoria funcțională, Au, V, n₅₀, zona climatică.",
        "<b>Pas 2</b> — Anvelopa: U opac (ISO 6946), Uw vitraje, punți termice (ISO 14683).",
        "<b>Pas 3</b> — Instalații: η_total = η_gen × η_dist × η_em × η_ctrl. SCOP pentru HP.",
        "<b>Pas 4</b> — Regenerabile: RER ≥30% nZEB. PV auto-consum, ST, HP, biomasă.",
        "<b>Pas 5</b> — Calcul: EP = Σ Q × fP / Au. Clasă A+ → G. CO₂. Cost.",
        "<b>Pas 6</b> — CPE: PDF/A-3 + PAdES B-LT + XML MDLPA. Cod CPE + QR.",
        "<b>Pas 7</b> — Audit: scenarii reabilitare NPV/IRR + Pașaport EPBD + finanțare.",
        "<b>Pas 8</b> — Avansat: nZEB, BACS, SRI, MEPS, BIM, Monte Carlo, GWP, Pasivhaus.",
      ],
      nextStep: "🎓 Aplică demo M2 pentru a pune în practică tot ce ai învățat. Click pe butonul 'Aplică demo & pornește auditul' de mai jos. Datele sunt pre-completate — poți modifica orice câmp și vedea cum se schimbă rezultatele.",
    },
  ],
};
