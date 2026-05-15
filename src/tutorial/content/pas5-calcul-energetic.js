// ═════════════════════════════════════════════════════════════════════════════
// Pas 5 — Calcul energetic (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 5 agregă toate datele introduse în Pașii 1-4 și calculează indicatorii energetici principali: EP_total, clasă energetică A+ → G, emisii CO₂, costuri estimate, RER, verificare nZEB. Calculul folosește metoda cvasistationară lunară ISO 13790 (Mc 001-2022). Pentru rezultate orare detaliate, vezi Pasul 8 (cooling hourly).",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "Esența calculului energetic",
      title: "Bilanțul lunar — pierderi vs aporturi",
      body: "EP_total = Σ_lună [Q_loss × η_utilizare - Q_aporturi] × fP / η_sistem / Au. Pentru fiecare lună: calculează pierderile transmisie (H_tr × ΔT) + ventilație (H_ve × ΔT), scade aporturile interne (oameni, electronice) + solare prin vitraje. Diferența pozitivă = nevoie de încălzire. Negativă = supraîncălzire (necesar cooling).",
      highlight: "Diferența ENERGIE FINALĂ vs ENERGIE PRIMARĂ: gaz natural fP=1.10, electricitate fP=2.50. 1 kWh elec consumat = 2.50 kWh primary; 1 kWh gaz = 1.10 kWh primary. De aceea HP cu SCOP 4 (consum 0.25 kWh elec) e mai eficient decât cazan gaz.",
    },

    {
      id: "decision-method",
      type: "decision",
      kicker: "Decizia metodologică",
      title: "Quasi-static lunar vs orar dinamic",
      options: [
        {
          title: "Quasi-static lunar (Mc 001)",
          pros: ["Reglementar RO actual", "Calcul rapid sub 1s", "Suficient pentru CPE rezidențial standard"],
          cons: ["Subestimează cooling vara (pic uri orare)", "Nu modelează inerția termică detaliată"],
          recommendation: "Standard pentru toate clădirile RI/RC. Singurul acceptat oficial CPE.",
        },
        {
          title: "Orar dinamic (ISO 52016, EnergyPlus)",
          pros: ["Precizie cooling ±5%", "Modelează inerția termică", "Util pentru cooling dominant (BI/HC)"],
          cons: ["Necesită date orare TMY", "Calcul ~30s", "Neacceptat oficial CPE (doar info)"],
          recommendation: "Pasul 8 — Cooling hourly pentru BI cu sarcină cooling >50% Q_total",
        },
      ],
    },

    {
      id: "fields-readonly",
      type: "fields",
      kicker: "Câmpuri",
      title: "Pasul 5 e majoritar READ-ONLY",
      body: "Aproape toate valorile sunt calculate automat din Pașii 1-4. Auditorul doar verifică și ajustează parametrii globali.",
      items: [
        { label: "T_int proiect încălzire", dataType: "°C", required: false, note: "Default 20°C rezidențial, 19°C birouri. Mc 001 §5.2" },
        { label: "T_int proiect răcire", dataType: "°C", required: false, note: "Default 26°C rezidențial, 25°C birouri" },
        { label: "Setback nocturn", dataType: "°C", required: false, note: "Default -2°C (18°C noapte 22:00-06:00)" },
        { label: "Ocupare zile/an", dataType: "număr", required: false, note: "Rezidențial 365, birouri 220, școală 180" },
        { label: "Aport intern q_int", dataType: "W/m²", required: false, note: "Rezidențial 4-5, birouri 7-10. Mc 001 Tab 5.2" },
        { label: "Schimburi aer n_aer", dataType: "h⁻¹", required: false, note: "Auto din n50 / cred 20 + ventilare mecanică" },
      ],
    },

    {
      id: "fields-outputs",
      type: "fields",
      kicker: "Outputs principale",
      title: "Ce calculează automat Zephren",
      items: [
        { label: "Q_h_nd (necesar net încălzire)", dataType: "kWh/an", required: true, note: "Σ_lună (Q_loss - η_H × Q_gain). Mc 001 §5.5" },
        { label: "Q_c_nd (necesar net răcire)", dataType: "kWh/an", required: true, note: "Σ_lună (Q_gain × η_C - Q_loss). Doar lunile cu Q_gain > Q_loss" },
        { label: "Q_ACM", dataType: "kWh/an", required: true, note: "Mc 001 §3.7. V × ρ × c × ΔT / η_ACM" },
        { label: "EP_total", dataType: "kWh/(m²·an)", required: true, note: "(Q_h + Q_c + Q_ACM + E_iluminat) × fP / Au" },
        { label: "EP_nren", dataType: "kWh/(m²·an)", required: true, note: "Doar componenta nereginerabilă (fP_nren)" },
        { label: "Clasa energetică", dataType: "A+ - G", required: true, note: "Conform Mc 001 §6.4 — scala dependentă de categorie" },
        { label: "CO₂ emisii", dataType: "kg CO₂eq/(m²·an)", required: true, note: "Σ (Q_final × fCO2_combustibil) / Au" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă per categorie",
      title: "Scale clasificare per categorie",
      body: "Pragul EP pentru clasă A+ → G diferă per categorie. Mai jos limitele clasă A+ și pragul G (default).",
      branches: [
        {
          category: "RI (rezidențial individual)",
          appliesTo: ["M2", "M5"],
          description: "Scala Mc 001-2022 §6.4 RI: A+ ≤50, A 51-90, B 91-125 (=nZEB), C 126-160, D 161-200, E 201-260, F 261-330, G >330 kWh/m²a",
          formula: "M2 cu EP=976 → clasa G",
        },
        {
          category: "RC/RA (rezidențial colectiv)",
          appliesTo: ["M1"],
          description: "Scala RC: A+ ≤45, A 46-80, B 81-110 (=nZEB), C 111-150, D 151-190, E 191-250, F 251-310, G >310",
          formula: "M1 cu EP=700 → clasa G",
        },
        {
          category: "BI (birouri)",
          appliesTo: ["M3"],
          description: "Scala BI: A+ ≤60, A 61-100, B 101-145 (=nZEB), C 146-200, D 201-280, E 281-380, F 381-470, G >470",
          formula: "M3 cu EP=334 → clasa D",
        },
        {
          category: "ED (educație)",
          appliesTo: ["M4"],
          description: "Scala ED stringentă: A+ ≤25, A 26-45, B 46-60 (=nZEB foarte strict), C 61-100, D 101-150, E 151-220, F 221-300, G >300",
          formula: "M4 cu EP=1099 → clasa G",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Calcul ISO 13790 + Mc 001",
      refs: [REFS.mc001_cap5, REFS.sr_en_iso_13790, REFS.sr_en_iso_52016, REFS.sr_en_15603, REFS.epbd_2024],
      quote: "Metoda de calcul cvasistationară lunară din ISO 13790 oferă rezultate cu precizie ±15% față de simulări dinamice orare pentru clădiri rezidențiale de complexitate medie. Este metoda standardizată în Mc 001-2022 pentru calculul CPE.",
      quoteSource: "Mc 001-2022 §5.1 alin. 2 + comentariu UTCB",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni calcul energetic",
      terms: [GLOSSARY.EP, GLOSSARY.EP_nren, GLOSSARY.fP, GLOSSARY.fCO2, GLOSSARY.GD, GLOSSARY.nZEB],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli interpretare rezultate",
      items: [
        {
          title: "EP confundat cu E_final (factura)",
          body: "Factura gaz 22.000 kWh/an ≠ EP. EP = (Q_final × fP) / Au. Pentru casa M2 cu 22.000 kWh × 1.10 / 142 = 170 kWh/(m²·an).",
          fix: "Întotdeauna divide la Au și aplică fP per combustibil. Mc 001 §5.7.",
        },
        {
          title: "Clasa pe scală RI pentru un BI",
          body: "Aceleași EP=200 kWh/m²a: RI = clasa D, BI = clasa C. Confuzia scalelor → clasificare greșită.",
          fix: "Zephren auto-detectează din categorie. Verifică categoria în Pas 1.",
        },
        {
          title: "Q_cooling = 0 pentru clădire fără AC",
          body: "Q_c_nd se calculează în orice condiție (există supraîncălzire vara). Zero înseamnă fără sistem activ; necesarul fizic poate exista (confort vară degradat).",
          fix: "Verifică în Pas 5 Q_c_nd indicator. Dacă >0 fără AC = recomandare cooling sau measures pasive.",
        },
        {
          title: "fP_elec hardcoded vechi (2.78)",
          body: "Mc 001 actualizat 2024 (corecție MDLPA): fP_elec = 2.50, NU 2.78. Diferența ~10% EP.",
          fix: "Zephren folosește valori actuale Tab A.16. Verifică banner toggle 'useNA2023' on (default 2024+).",
        },
        {
          title: "RER ignorat în interpretare",
          body: "Clădire cu EP=120 (sub limita nZEB 125) DAR RER=15% (sub 30%) → NU e nZEB conform. Lipsesc regenerabile.",
          fix: "Verifică ambele criterii Mc 001 §nZEB: EP ≤ limită + RER ≥ 30% (rezidențial) sau 27% (BI).",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Datele Pas 5 în pașii finali",
      flows: [
        { from: "EP_total", to: "Pas 6 CPE clasificare", description: "Clasă A+ → G afișată" },
        { from: "EP_nren", to: "Pas 8 verificare nZEB", description: "Verificare EP_nren ≤ limita" },
        { from: "Q_h_nd lunar", to: "Pas 7 grafic Sankey", description: "Vizualizare pierderi" },
        { from: "Cost estimat", to: "Pas 7 economie scenarii", description: "Bază comparație rehab" },
        { from: "CO₂", to: "Pas 6 Anexa CPE", description: "Indicator obligatoriu EPBD 2024" },
        { from: "Φ_design", to: "Pas 8 EN 12831", description: "Sarcină termică dimensionare" },
      ],
    },

    {
      id: "what-if-fp",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Impact factor fP_elec asupra EP",
      body: "Casă cu HP — consum elec 1.500 kWh/an + lighting 600 kWh/an = 2.100 kWh/an. Variază fP_elec.",
      parameter: "fp_elec",
      paramLabel: "Factor fP electricitate",
      paramUnit: "",
      min: 1.0,
      max: 3.5,
      step: 0.1,
      defaultValue: 2.5,
      formula: ({ value }) => {
        const Q_final_elec = 2100; // kWh/an
        const Au = 142;
        const EP_elec = (Q_final_elec * value) / Au;
        return { output: EP_elec, unit: "kWh/m²a", label: "EP_elec contribuție", decimals: 1 };
      },
      baseline: { value: 2.5, output: 37, label: "fP=2.50 (Mc 001 2024)" },
      presets: [
        { label: "Vechi (pre-2024) fP=2.78", value: 2.78 },
        { label: "Actual fP=2.50", value: 2.50 },
        { label: "Optimist (verde) 2.00", value: 2.00 },
        { label: "Future 100% renew = 1.00", value: 1.00 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Zephren Pas 5",
      items: [
        "<b>EP_total vs benchmark național</b> — percentilă calculată automat (Pas 8).",
        "<b>Discrepanță real (Pas 7) vs calculat &gt; 25%</b> = warning ajustare ocupare/T_int.",
        "<b>Q_c_nd &gt; 0 fără AC</b> declarat = warning supraîncălzire vara.",
        "<b>Clasa A+</b> + clădire pre-2010 = warning extreme rar (verifică date).",
        "<b>RER ≥30% + EP &lt; limită</b> = banner verde nZEB conform.",
        "<b>CO₂ &gt; 100 kg/m²a</b> = info — domeniu emisii ridicate.",
        "<b>Cost &gt; 10.000 RON/an</b> = info pentru auditor (necesită discuție client).",
        "<b>Bilanț lunar negativ iarna</b> = imposibil (verifică Q_gain / η_utilizare).",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 5",
      items: [
        "Pic-uri orare în zile extrême — pentru asta Pas 8 cooling hourly cu TMY.",
        "Comportament real ocupanți (presetting T diferit, geam deschis iarna) — Mc 001 folosește profile standardizate.",
        "Calcul detaliat inerție termică (timp lag) — important la clădiri masive cu cooling pasiv noaptea.",
        "Schimbări climatice viitoare (Mc 001 folosește GD anuali fixi, nu predictie).",
        "Combustibili alternativi (hidrogen, biogaz, e-fuel) — momentan fP=1.00 placeholder, dar valori reale UE 2027+.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Output calc M2 (casă Cluj)",
      values: [
        { label: "Q_h_nd", value: "28.000 kWh/an", note: "Necesar net încălzire" },
        { label: "Q_ACM", value: "3.200 kWh/an", note: "Apă caldă" },
        { label: "EP_total", value: "976 kWh/m²a", note: "Live calculator" },
        { label: "Clasa", value: "G", note: "Foarte ineficientă" },
        { label: "CO₂", value: "195 kg/m²a", note: "Foarte ridicat" },
        { label: "Cost estimat", value: "7.800 RON/an", note: "Gaz + elec" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test calcul Pas 5",
      questions: [
        {
          question: "Pentru o casă RI cu Au=120 m² și consum total gaz 18.000 kWh/an (fP=1.10), EP_total este aprox:",
          options: ["120 kWh/m²a", "150 kWh/m²a", "165 kWh/m²a", "200 kWh/m²a"],
          correct: 2,
          explanation: "EP = (Q_final × fP) / Au = (18.000 × 1.10) / 120 = 19.800 / 120 = 165 kWh/m²a. Clasă C-D pe scala RI.",
        },
        {
          question: "Diferența principală între EP_total și EP_nren este:",
          options: ["EP_nren include doar combustibili fosili (fără regenerabile auto-consumate)", "EP_total include cooling, EP_nren doar heating", "EP_nren este la 1m² standard, EP_total la suprafața reală", "EP_total este pentru CPE, EP_nren pentru audit"],
          correct: 0,
          explanation: "EP_total = tot ce consumă clădirea × fP_combustibil. EP_nren = doar componenta nereginerabilă (electric din rețea + gaz + petrol). Regenerabilele auto-consumate au fP=1.00 sau 0. Pragul nZEB se aplică pe EP_nren (actualizare Mc 001 2024+).",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum interpretezi diferența real vs calculat",
      body: "Compari Q_calc_lunar cu Q_factură_lunar. Diferențe acceptabile: ±15-25% (Mc 001 inerență metodă). Diferențe mai mari: 1) Ocupare reală mai mică (case secundare, vacanțe lungi) — reduce ocupare zile/an în Pas 5. 2) T_int real mai mare (24°C în loc de 20°C) — crește Q proporțional cu (T_int - T_ext). 3) Cazan degradat (η_real < η_declarat) — recalibrează în Pas 3. 4) Anvelopa cu degradări neidentificate (izolație umedă) — re-verifică Pas 2.",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Migrare ISO 13790 → ISO 52016 (orar)",
      changes: [
        {
          period: "Actual 2024-2026",
          title: "Mc 001-2022 folosește ISO 13790 lunar",
          body: "Standard actual RO. Acceptat oficial CPE.",
          refs: [REFS.sr_en_iso_13790, REFS.mc001_cap5],
        },
        {
          period: "2027-2030",
          title: "Migrare graduală spre ISO 52016 orar",
          body: "UE direcționează spre metodă orară mai precisă. Mc 001 next revision (2027) va include opțional ISO 52016 ca alternativă.",
          refs: [REFS.sr_en_iso_52016, REFS.epbd_2024],
        },
        {
          period: "2030+",
          title: "ISO 52016 default + Mc 001 v3",
          body: "Probabil ISO 52016 devine metoda principală + Mc 001 v3 cu integrare full TMY orar.",
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Profiluri ocupare atipice",
      cases: [
        {
          title: "🏖️ Casă vacanță (ocupare 60 zile/an)",
          body: "T_int = 8°C anti-îngheț 305 zile + 20°C confort 60 zile. Q_h_nd dramatic redus. Auditorul completează manual 'ocupare zile' = 60 în Pas 5.",
        },
        {
          title: "🏥 Spital 24/7 (ocupare 365 × 24)",
          body: "T_int constant 22°C + ACM intensiv (clinici, spălătorii) + cooling activ. Q_total foarte mare. Categoria SP cu prag nZEB ≤70 kWh/m²a — strict.",
        },
        {
          title: "🎓 Școală (vacanțe 105 zile/an)",
          body: "Mc 001 §5.8 — calcul Q_h vacanță separat T_int = 14°C reducție anti-îngheț. Zephren auto-aplică pentru categoria ED.",
        },
        {
          title: "🏢 Open-space cu pre-cooling nocturn",
          body: "Birouri moderne BI cu cooling night-time (T_int noapte 18°C vară) → reduce sarcină cooling zi. Modelat în Pas 8 cooling hourly, nu Pas 5 standard.",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export",
      title: "Output Pas 5 în documente",
      outputs: [
        { icon: "📜", format: "CPE Pagina 1", description: "Indicator EP_total + clasa + CO₂ — afișați pe coperta CPE.", planRequired: "AE IIci+" },
        { icon: "📊", format: "Raport Audit Cap. 5 — Bilanț", description: "Tabel Q_h_lunar + grafic + comparare cu Q_factură.", planRequired: "AE Ici" },
        { icon: "🎯", format: "Anexa 2 CPE — Recomandări", description: "Scenarii ordonate după EP_post / cost / payback.", planRequired: "AE IIci+" },
        { icon: "📈", format: "Sankey Excel", description: "Diagrama Sankey pierderi/aporturi/consum pentru raport.", planRequired: "Expert" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări calcul",
      items: [
        { q: "De ce EP-ul calculat e mai mare decât consumul real?", a: "Mc 001 presupune T_int=20°C constant 24h/365. Comportament real: setpoint mai mic, vacanțe, geam deschis. Eroare tipică 15-25% supraestimare." },
        { q: "Pot ajusta GD (grade-zile) manual?", a: "Zephren extrage automat din OSM/Mc 001 Anexa 1. Manual doar dacă proiect special (microclimat valley, lacuri). Adaugă în Pas 1 câmp GD custom." },
        { q: "Q_aporturi solare lunare cum se calculează?", a: "Σ (g_vitraj × A × I_solar_lunar × factor_umbră). I_solar din Mc 001 Anexa 1 per orientare + zonă climatică. Zephren auto-calc." },
        { q: "Bilanțul iarna negativ (gain > loss) = supraîncălzire?", a: "În iarna RO improbabil. Dacă apare, verifică: orientare vitraje (toate S?), A_vitraje (suprasized), q_int (prea mare?), η_utilizare (prea mic? default 0.95 OK)." },
        { q: "Cost estimat cum se calculează?", a: "Q_final × preț_combustibil. Default Zephren: gaz casnic ANRE Q4-2024 (~0.34 RON/kWh), elec 0.85 RON/kWh, peleți 0.40 RON/kWh. Modificabil în Pas 7." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 5",
      links: [
        { title: "EPBD calc methods comparison", url: "https://buildup.eu", description: "Comparare ISO 13790 vs 52016 vs IDA-ICE" },
        { title: "ANRE Tarife reglementate", url: "https://www.anre.ro/ro/info-consumatori/comparator-oferte-furnizori", description: "Prețuri actuale energie pentru cost estimat" },
        { title: "Eurostat fP factor by country", url: "https://ec.europa.eu/eurostat", description: "Factori fP comparat țări UE" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 6",
      title: "Ce am acoperit",
      bullets: [
        "<b>EP_total</b> = bilanț lunar pierderi - aporturi, agregat anual, raportat la Au.",
        "<b>EP_nren</b> = doar componenta nereginerabilă — pragul nZEB se aplică aici (Mc 001 2024+).",
        "<b>Clasificare A+ → G</b> per categorie (RI, RC, BI, ED diferite scale).",
        "<b>fP_elec = 2.50</b> (corecție MDLPA 2024, nu 2.78 vechi).",
        "<b>CO₂eq</b> obligatoriu în CPE din 2024 — formula EPBD 2024 Art. 17.",
        "<b>Real vs calculat ±20%</b> acceptabil. >25% = ajustare ocupare/T_int.",
      ],
      nextStep: "Pasul 6 — Certificat CPE: export PDF/A-3 + DOCX + XML MDLPA + PAdES B-LT cu semnătură QTSP. Cod CPE unic + QR code public.",
    },
  ],
};
