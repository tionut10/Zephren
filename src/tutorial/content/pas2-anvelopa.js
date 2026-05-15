// ═════════════════════════════════════════════════════════════════════════════
// Pas 2 — Anvelopa termică (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 2 stabilește elementele opace (pereți, planșee, terase), vitrajele (ferestre, uși) și punțile termice. Pentru clădirile vechi neizolate, anvelopa generează 70-80% din pierderile termice — deci este pasul cu cel mai mare leverage pentru reabilitare.",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "Scop și importanță",
      title: "De ce anvelopa decide soarta CPE-ului",
      body: "Calculul U conform ISO 6946 pentru pereți/planșee + ISO 10077 pentru vitraje + ISO 14683 catalog punți + ISO 10211 calcul numeric când catalog nu acoperă. Pentru o casă 1965 neizolată, U_perete ≈ 1.20 W/m²K vs. U_ref nZEB = 0.35 → de 3.4× peste limită. Izolarea cu 15 cm EPS scade U la 0.20 → economie 35-45% EP_heat.",
      highlight: "Pierderile prin punți termice pot reprezenta 15-30% din pierderile prin anvelopă la clădiri vechi. Catalog ISO 14683 obligatoriu.",
    },

    {
      id: "decision-method",
      type: "decision",
      kicker: "Decizia metodologică",
      title: "Cum calculezi U: catalog tipologic vs. stratigrafie completă",
      body: "Mc 001-2022 permite două abordări — catalog pentru clădiri standard sau calcul stratigrafic complet pentru cazuri custom.",
      options: [
        {
          title: "Stratigrafie completă (recomandat)",
          pros: ["Precizie ±5%", "Reflectă materiale reale", "Necesar pentru reabilitare cost-optim"],
          cons: ["Necesită desfacere structură (1-2 cm probe)", "Date materiale exacte (λ, ρ, c)"],
          recommendation: "Standard pentru audit energetic complet (AE Ici)",
        },
        {
          title: "Catalog tipologic (rapid)",
          pros: ["10 minute completare", "Acceptat pentru CPE locuință"],
          cons: ["Precizie ±20%", "Nu permite scenarii avansate", "Nu acoperă clădiri atipice"],
          recommendation: "Acceptabil doar pentru CPE rezidențial simplu (AE IIci)",
        },
      ],
    },

    {
      id: "fields-required",
      type: "fields",
      kicker: "Câmpuri obligatorii per element",
      title: "Pentru fiecare element opac + vitraj + punte",
      body: "Zephren cere minim 1 element opac perete + 1 planșeu + 1 vitraj pentru a continua.",
      items: [
        { label: "Nume element", dataType: "text", required: true, note: "Ex: 'Perete N exterior cărămidă'" },
        { label: "Tip (PE/PT/PP/PB/PI)", dataType: "enum", required: true, note: "PE=perete ext, PT=planșeu terasă, PP=plan. pod, PB=plan. peste subsol, PI=interior" },
        { label: "Suprafață", dataType: "number m²", required: true, note: "Brut (incl. vitraje), Zephren scade automat" },
        { label: "Orientare", dataType: "enum N/NE/E/.../V", required: true, note: "Pentru aporturi solare în Pas 5" },
        { label: "Straturi (stratigrafie)", dataType: "array layer", required: true, note: "Material, grosime (mm), λ (W/mK), ρ (kg/m³)" },
        { label: "Coef. tau (umbrire)", dataType: "number 0-1", required: false, note: "Tipic 1.0 (fără umbrire), 0.5 vecini" },
      ],
    },

    {
      id: "fields-glazing",
      type: "fields",
      kicker: "Câmpuri vitraje",
      title: "Date specifice pentru ferestre și uși exterioare",
      body: "Vitrajele necesită date din certificatul producătorului (declaration of performance EN 14351-1).",
      items: [
        { label: "Tip vitraj", dataType: "enum", required: true, note: "Single/Double/Triple Low-E/Gas filled" },
        { label: "U_window (Uw)", dataType: "number W/m²K", required: true, note: "Pentru ansamblu ramă+sticlă. Modern 0.9-1.4, vechi 2.5-3.5" },
        { label: "g (factor solar)", dataType: "number 0-1", required: true, note: "Modern Low-E 0.45-0.55, vechi 0.70-0.80" },
        { label: "Tip ramă", dataType: "enum", required: true, note: "PVC/Aluminiu/Lemn — afectează U_frame" },
        { label: "Suprafață vitraj net", dataType: "number m²", required: true, note: "Glass area, NU ansamblu" },
        { label: "An producție", dataType: "year", required: false, note: "Pentru estimare degradare (etanșetate)" },
      ],
    },

    {
      id: "fields-bridges",
      type: "fields",
      kicker: "Punți termice",
      title: "Catalog tipologic ISO 14683",
      body: "Mc 001-2022 cere identificarea tuturor punților termice liniare (Ψ) și punctiforme (Χ). Catalog default pentru cazuri standard.",
      items: [
        { label: "Tip punte (catalog)", dataType: "enum", required: true, note: "Atic / Colț / Planșeu intermediar / Buiandrug / Fundație / Spalet ferestre" },
        { label: "Coef. liniar Ψ", dataType: "number W/mK", required: true, note: "Catalog 14683: atic 0.50-1.00, colț 0.05-0.20" },
        { label: "Lungime", dataType: "number m", required: true, note: "Perimetru aplicabil punții" },
        { label: "Material/configurație", dataType: "text", required: false, note: "Beton vs cărămidă, izolat sau nu" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă pe categorie",
      title: "Specificități pe tipul clădirii",
      branches: [
        {
          category: "RA — Apartament în bloc",
          appliesTo: ["M1"],
          description: "Pereți comuni cu vecini (T_int similar) → NU se contează ca pierderi exterioare. Doar pereți spre exterior + tavanul/podelele spre vecini cu temperatura diferită.",
          formula: "Q_loss_perete_comun ≈ 0 (T_vecin ≈ T_int)",
        },
        {
          category: "RI — Casă unifamilială",
          appliesTo: ["M2", "M5"],
          description: "Toată anvelopa = exterioară. Punți termice maxime (4 colțuri + fundație + atic + buiandruguri).",
          formula: "Σ ψ × L poate ajunge 15-30% din H_tr total",
        },
        {
          category: "BI — Birouri",
          appliesTo: ["M3"],
          description: "Fațade cortina vitrate frecvent (>40% Au). Calcul detaliat U_glazing + Ψ_panou-glazing. Verificare condens iarna pe sticlă.",
          formula: "Verificare temperatură suprafață T_si > 12.6°C (anti-mucegai)",
        },
        {
          category: "ED — Școală",
          appliesTo: ["M4"],
          description: "Ferestre mari (orientare lumină pedagogică). Sale clase = aporturi solare iarna importante. Iluminare naturală reduce LENI.",
          formula: "g_window × A × shading → aport solar iarna",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Standardele Pasului 2",
      refs: [REFS.mc001_cap2, REFS.sr_en_iso_6946, REFS.sr_en_iso_14683, REFS.sr_en_iso_10211, REFS.epbd_2024],
      quote: "Pentru clădiri noi nZEB, valorile coeficientului U trebuie să respecte limitele din Tab 2.4 (rezidențial) sau 2.7 (nerezidențial) ale prezentei metodologii.",
      quoteSource: "Mc 001-2022 §2.5",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni anvelopă",
      terms: [GLOSSARY.U, GLOSSARY.Psi, GLOSSARY.nZEB],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli în calculul anvelopei",
      items: [
        {
          title: "Omiterea punților termice",
          body: "Calculul DOAR cu U×A neglijează 15-30% din pierderi. La clădiri vechi cu colțuri reci, condensul/mucegaiul rezultă din punți neidentificate.",
          fix: "Folosește catalog ISO 14683 — atic, colț, planșeu intermediar, buiandrug, fundație, spalet ferestre.",
        },
        {
          title: "U_vitraj fără ramă (doar sticlă)",
          body: "Producătorul declară Ug pentru sticlă (0.6-1.0). Uw pentru ansamblu cu ramă e mai mare (1.0-1.6 PVC, 1.5-2.5 aluminiu nerupt).",
          fix: "Folosește Uw din declarația de performanță EN 14351-1. Pentru ferestre vechi fără date, U=2.8 (dublu vitraj) sau 5.0 (vitraj simplu).",
        },
        {
          title: "Lambda din internet vs. real",
          body: "Polistiren expandat nou: λ=0.038. PS degradat după 30 ani (umiditate, deformare): λ=0.060-0.080.",
          fix: "Pentru izolație existentă veche, măsoară in-situ (heat flow meter) sau folosește λ degradat catalog SR EN ISO 10456.",
        },
        {
          title: "Suprafață vitraje în suprafața pereți",
          body: "Dacă A_perete = 50 m² include vitraj 5 m², calculul Q_loss dublează pierderile vitrajului (o dată ca perete, o dată ca vitraj).",
          fix: "Zephren scade automat. Manual: A_opaque = A_brut - A_vitraje. Verifică în Pas 5 bilanț.",
        },
        {
          title: "Orientarea greșită (S vs SE)",
          body: "Aport solar iarna pe S la 47° lat. RO: ~120 kWh/m²·a; pe N: ~30. Confuzia orientării subestimează aporturi solare cu factor 4×.",
          fix: "Folosește busolă magnetică (atenție declinație N magnetic vs geografic ~5°E în RO). Sau Google Earth orientare clădire.",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare date",
      title: "Cum se folosesc datele Pas 2 mai departe",
      flows: [
        { from: "U × A × ΔT", to: "Pas 5 Q_loss_tr", description: "Pierderi transmisie lunare" },
        { from: "g × A × I_solar", to: "Pas 5 Q_sol", description: "Aporturi solare prin vitraje" },
        { from: "Σ Ψ × L", to: "Pas 5 H_tr_bridges", description: "Contribuție punți termice" },
        { from: "U_window > 1.30", to: "Pas 5 verificare nZEB", description: "Warning pentru clădiri noi" },
        { from: "Stratigrafie", to: "Pas 7 cost-optim", description: "Bază pentru scenarii izolație suplimentară" },
        { from: "Materiale", to: "Pas 8 GWP lifecycle", description: "Calcul amprentă carbon EN 15978" },
      ],
    },

    {
      id: "what-if-insulation",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Impact izolație suplimentară asupra U_perete",
      body: "Glisează grosimea EPS adăugat la peretele M2 (cărămidă 40 cm) pentru a vedea cum scade U.",
      parameter: "thickness_eps",
      paramLabel: "Grosime izolație EPS adăugată",
      paramUnit: "cm",
      min: 0,
      max: 25,
      step: 1,
      defaultValue: 0,
      formula: ({ value }) => {
        // U_brut perete cărămidă 40 cm + tencuieli ≈ 1.18 W/m²K
        // Adăugare EPS λ=0.038, grosime t (cm)
        const R_brut = 1 / 1.18; // R_existent
        const R_eps = (value / 100) / 0.038; // R nou strat
        const R_total = R_brut + R_eps;
        const U = 1 / R_total;
        return { output: U, unit: "W/m²K", label: "U_perete cu izolație nouă", decimals: 2 };
      },
      baseline: { value: 0, output: 1.18, label: "Cărămidă 40 cm fără izolație" },
      presets: [
        { label: "Fără izol.", value: 0 },
        { label: "5 cm (insuficient)", value: 5 },
        { label: "10 cm (standard)", value: 10 },
        { label: "15 cm (recomandat)", value: 15 },
        { label: "20 cm (nZEB)", value: 20 },
      ],
    },

    {
      id: "u-ref-table",
      type: "fields",
      kicker: "Tabel U_referință",
      title: "Limite U_ref nZEB Mc 001-2022 (Tab 2.4 rezidențial)",
      body: "Pentru clădiri noi sau reabilitate la standard nZEB.",
      items: [
        { label: "Pereți exteriori opaci", dataType: "U_max", required: true, note: "0.35 W/m²K (Zona III), 0.30 (Zona IV-V)" },
        { label: "Planșeu pod (sub acoperiș)", dataType: "U_max", required: true, note: "0.20 W/m²K (toate zonele)" },
        { label: "Planșeu peste subsol/sol", dataType: "U_max", required: true, note: "0.30 W/m²K" },
        { label: "Ferestre + uși exterioare", dataType: "U_max", required: true, note: "1.30 W/m²K Uw" },
        { label: "Acoperiș plat (terasă)", dataType: "U_max", required: true, note: "0.20 W/m²K" },
        { label: "Perete spre spațiu neîncălzit", dataType: "U_max", required: false, note: "0.70 W/m²K" },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Ce validează Zephren automat",
      items: [
        "U_calculat vs U_ref nZEB — coloana verde (sub limită) / portocaliu (peste limită) în tabel.",
        "<b>Verificare Glaser</b> — calcul difuzie vapori, alertă condens intra-strat (tab dedicat Pas 2).",
        "<b>Suprafață vitraje vs pereți</b> — warning dacă >40% (overheat vara, oversized cooling).",
        "<b>Σ A_anvelopă vs Aeb</b> — diferență >5% = warning (geometrie inconsistentă).",
        "<b>Ψ × L vs H_tr</b> — punți >25% H_tr = clădire nereabilitată tipică.",
        "<b>U_window > 2.5</b> + clădire nouă (>2015) = warning probabil greșeală.",
        "<b>Lambda materiale</b> verificare vs catalog SR EN ISO 10456 (warning dacă deviație >20%).",
        "<b>Tau (umbrire)</b> nu poate fi <0.3 sau >1.0.",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite cunoscute",
      title: "Ce NU acoperă Pasul 2",
      items: [
        "Calcul 3D detaliat al punților termice — Zephren folosește catalog 14683. Pentru cazuri custom (TFM, MEF) calcul extern.",
        "Higro-termic dinamic — Glaser este metoda quasi-statică. Pentru analize precise umiditate, instrumente specializate WUFI/Delphin.",
        "Comportament elemente prefabricate cu punți gradiente (PAFP). Catalog implicit subestimează ~15%.",
        "Deteriorare λ în timp pentru izolații vechi — Zephren cere valoare actuală, NU recalculează automat din anul instalării.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Valori anvelopă demo M2 (casă Cluj)",
      values: [
        { label: "Perete cărămidă 40cm", value: "U = 1.18", note: "Fără izolație" },
        { label: "Planșeu pod", value: "U = 0.85", note: "Beton fără strat" },
        { label: "Planșeu subsol", value: "U = 0.95", note: "Beton 15 cm" },
        { label: "Ferestre PVC", value: "Uw = 2.20", note: "Dublu vitraj '90" },
        { label: "Punte atic", value: "Ψ = 0.85", note: "Catalog 14683 D.10" },
        { label: "Punte fundație", value: "Ψ = 0.65", note: "Catalog 14683 F.5" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test cunoștințe Pas 2",
      questions: [
        {
          question: "U_referință nZEB pentru ferestre exterioare rezidențial RI în Zona III este:",
          options: ["1.00 W/m²K", "1.30 W/m²K", "1.60 W/m²K", "2.00 W/m²K"],
          correct: 1,
          explanation: "Mc 001-2022 Tab 2.4: ferestre nZEB ≤1.30 W/m²K (Uw ansamblu). Triple Low-E modern atinge 0.9-1.2.",
        },
        {
          question: "Pentru un perete cărămidă 40 cm (U=1.18) cu adăugare 15 cm EPS (λ=0.038), U-ul nou este aprox:",
          options: ["0.10 W/m²K", "0.20 W/m²K", "0.35 W/m²K", "0.60 W/m²K"],
          correct: 1,
          explanation: "R_nou = R_brut + d/λ = 0.85 + 0.15/0.038 = 0.85 + 3.95 = 4.80 → U = 1/4.80 ≈ 0.21 W/m²K. Sub limita nZEB 0.35 → conform.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum identifici stratigrafia fără desfacere",
      body: "1) Cere planurile execuție arhitect/structurist. 2) Pentru clădiri istorice fără planuri, examinează muchii și colțuri (acolo se văd straturile). 3) Folosește termoviziune iarna — temperaturi suprafață revelează heterogenitatea. 4) Compari cu fețe similare ale clădirilor vecine din aceeași epocă. 5) În ultimă instanță, sondaj 5×5 cm cu carotă în spatele unei dulapuri (nedistructiv vizual).",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Tranziție U_ref 2020 → 2030",
      changes: [
        {
          period: "2010-2020",
          title: "C107/3-2010 — Pereți ≤0.56 W/m²K",
          body: "Standard RO pre-EPBD III. Limite mai permisive.",
        },
        {
          period: "2021-2024",
          title: "Mc 001-2022 — Pereți ≤0.35 W/m²K (nZEB)",
          body: "Tightening 35% conform EPBD III + Plan Național PNIESC.",
          refs: [REFS.mc001_cap2],
        },
        {
          period: "2030+",
          title: "EPBD 2024 ZEB — Pereți estimat ≤0.20 W/m²K",
          body: "Clădiri ZEB (zero emission) noi din 2030 — Mc 001 va fi actualizat. Probabil 0.18-0.22 pentru rezidențial Zona III.",
          refs: [REFS.epbd_2024, REFS.epbd_art6],
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Situații anvelopă atipice",
      cases: [
        {
          title: "🌿 Acoperiș verde / fațadă verde",
          body: "Acoperiș verde cu substrat 12 cm: U_efectiv scade cu ~25% vs acoperiș clasic. Tratează ca strat extra λ=0.5, ρ=600. Fațadă verde: efect aerare/umbrire reduce Q_cooling vara — bonus 5-10% Q_C.",
        },
        {
          title: "🪞 Pereți Trombe / atrium solar pasiv",
          body: "Sisteme solare pasive — calcul separat aport solar conform Mc 001 §2.8. Element opac NU se contează ca pierdere obișnuită — are bilanț solar specific.",
        },
        {
          title: "🏚️ Cărămidă plină istorică (>100 ani)",
          body: "Cărămidă plină arsă pe lemn (1850-1900): λ_real adesea 0.65-0.75 (mai bun decât catalog 0.81). Datorită densității superioare. Test calorimetric pentru valoare exactă dacă proiect important.",
        },
        {
          title: "💧 Igrasie / infiltrații pereți subsol",
          body: "Pereți subsol cu umiditate critică (>5% în masă): λ poate fi 2-3× catalog. Necesită diagnoză separată + remediere ÎNAINTE de izolare exterioară (altfel condens intra-strat).",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export",
      title: "Anvelopa în documente",
      outputs: [
        { icon: "📜", format: "Anexa CPE — Anvelopa", description: "Tabel A.1 cu toate elementele opace + U + S. Format Mc 001.", planRequired: "AE IIci+" },
        { icon: "📊", format: "Raport Audit Cap. 2", description: "Descriere detaliată anvelopă + stratigrafii + punți + verificare Glaser.", planRequired: "AE Ici" },
        { icon: "📋", format: "Pașaport — secțiunea building.envelope", description: "JSON cu Aeb, U_avg, n50, GWP_materiale.", planRequired: "AE Ici+" },
        { icon: "📄", format: "XML MDLPA — <envelope>", description: "Toate elementele cu coduri standardizate (PE_001, PT_001 etc).", planRequired: "Expert" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări auditori — anvelopa",
      items: [
        {
          q: "Cum tratez un perete cu izolație DOAR la jumătate (renovare parțială)?",
          a: "Creează 2 elemente separate cu același nume + sufix '_izolat' și '_neizolat'. Distribuie aria proporțional. NU media U-urile (greșit fizic).",
        },
        {
          q: "Ferestre vechi fără declaratie performanță — ce U folosesc?",
          a: "Tabel default Mc 001 §2.7.2: vitraj simplu Uw=5.0, dublu '85-2000 Uw=2.8, dublu Low-E '00-'10 Uw=1.8.",
        },
        {
          q: "Punți termice la apartament în bloc — care se contează?",
          a: "DOAR cele pe perimetrul exterior (atic dacă ultimul etaj, fundație dacă parter, colțuri externe, buiandruguri ferestre). Punțile interioare (intermediar etaje vecinilor) NU se contează.",
        },
        {
          q: "Cum calculez Aeb (aria evacuare căldură) corect?",
          a: "Aeb = Σ A_elemente opace ext + Σ A_vitraje ext. Pentru bloc, doar suprafețele spre exterior. Auto-calc Zephren din geometrie sau manual.",
        },
        {
          q: "Trebuie verificare Glaser obligatoriu?",
          a: "Mc 001-2022 §2.10 cere verificare difuzie vapori pentru izolări noi pe pereți existenti. Critic pentru clădiri istorice + pereți cărămidă cu izolare interioară (risc condens). Zephren calculează automat.",
        },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 2",
      links: [
        { title: "INCD URBAN-INCERC — Catalog punți termice", url: "https://www.urban-incerc.ro", description: "Catalog tipologic RO complement ISO 14683" },
        { title: "EPBD Buildings — U-values database", url: "https://ec.europa.eu/energy/eepublic/buildings", description: "Comparativ U-values UE" },
        { title: "ASRO — SR EN ISO 6946", url: "https://www.asro.ro", description: "Cumpărare standard oficial" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 3",
      title: "Ce am acoperit",
      bullets: [
        "<b>U conform ISO 6946</b> — stratigrafie completă vs catalog tipologic.",
        "<b>Vitraje Uw + g + ramă</b> — date declaration of performance EN 14351-1.",
        "<b>Punți termice Ψ × L</b> — catalog 14683 sau calcul numeric 10211.",
        "<b>Verificare Glaser</b> condens — obligatoriu pentru izolări noi pe pereți existenti.",
        "<b>Tab 2.4 U_ref nZEB</b> — pereți ≤0.35, planșee ≤0.20, ferestre ≤1.30 W/m²K.",
      ],
      nextStep: "Pasul 3 — Instalații tehnice: cum eficient se transformă energia finală în confort. η_gen × η_dist × η_em × η_ctrl. Pierderile anvelopei × 1/η_total = consum efectiv.",
    },
  ],
};
