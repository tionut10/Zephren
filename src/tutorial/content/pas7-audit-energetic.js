// ═════════════════════════════════════════════════════════════════════════════
// Pas 7 — Audit energetic (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 7 transformă datele de calcul în propuneri concrete: scenarii de reabilitare prioritate, calcul ROI/NPV, cost-optim, Pașaport Renovare conform EPBD 2024 Anexa VIII, dosar audit complet conform Ord. MDLPA 2461/2011, eligibilitate fonduri Casa Verde + PNRR. ATENȚIE: Pas 7 este accesibil DOAR auditorilor AE Ici (plan 1.499 RON+).",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "Auditul ca document",
      title: "De ce auditul depășește CPE-ul",
      body: "CPE = clasificare. Audit = plan acțiune. CPE răspunde la 'unde suntem?'. Audit la 'ce facem și cu ce ROI?'. Conform Ord. MDLPA 2461/2011 mod. 2023, Raportul de Audit conține 8 capitole obligatorii: 1) Identificare, 2) Anvelopa, 3) Instalații, 4) Regenerabile, 5) Bilanț calculat, 6) Bilanț real (facturi), 7) Scenarii reabilitare cu ROI, 8) Concluzii + recomandare finală.",
      highlight: "Pașaport Renovare EPBD 2024 — devine obligatoriu 29.V.2026 pentru clădiri >250 m² la vânzare. Plan etapizat reabilitare 2030/2033/2050 cu costuri estimate și emisii target.",
    },

    {
      id: "decision-rehab",
      type: "decision",
      kicker: "Decizia scenarii",
      title: "Cum alegi scenariile de reabilitare prioritare",
      options: [
        {
          title: "Scenariu Minim — payback rapid",
          pros: ["Payback 3-5 ani", "Cost mic 5.000-15.000 EUR", "Acceptabil pentru proprietari budgetari"],
          cons: ["Nu atinge nZEB", "Doar reduceri 20-30% EP"],
          recommendation: "Pentru proprietari care vor să vândă în 2-3 ani — îmbunătățire clasă cu 1-2 trepte",
        },
        {
          title: "Scenariu Mediu — cost-optim",
          pros: ["Payback 7-10 ani", "Reducere 50-65% EP", "Atinge clasa C-D"],
          cons: ["Cost mediu 15.000-25.000 EUR", "Necesită finanțare AFM/bancă"],
          recommendation: "Pentru proprietari care vor să locuiască + economie pe termen mediu",
        },
        {
          title: "Scenariu Maxim — nZEB / ZEB",
          pros: ["Reducere 75-90% EP", "Atinge A/A+ (nZEB)", "Compatibil ZEB EPBD 2030+"],
          cons: ["Cost mare 30.000-50.000 EUR", "Payback 12-18 ani", "Necesită PNRR + AFM"],
          recommendation: "Pentru reabilitare profundă cu finanțare europeană sau ZEB nou",
        },
      ],
    },

    {
      id: "fields-rehab-inputs",
      type: "fields",
      kicker: "Inputs scenariu",
      title: "Date pentru analiza scenarii",
      items: [
        { label: "Cost specific reabilitare", dataType: "EUR/m²", required: true, note: "Tipic 180-350 EUR/m² nZEB rezidențial" },
        { label: "Rata dobândă bancă", dataType: "% anual", required: false, note: "Default 7% (Q4 2025). Pentru NPV." },
        { label: "Inflație preț energie", dataType: "% anual", required: false, note: "Default 3% conform ANRE prognoza" },
        { label: "Perioadă analiză", dataType: "ani", required: false, note: "Default 30 ani (durata viață reabilitare)" },
        { label: "Valoare reziduală", dataType: "%", required: false, note: "Default 10% (cost demontare end-of-life)" },
        { label: "Bonus PNRR", dataType: "%", required: false, note: "30-70% în funcție de cost-eligibil + tip clădire" },
      ],
    },

    {
      id: "fields-passport",
      type: "fields",
      kicker: "Pașaport Renovare",
      title: "Câmpuri Pașaport conform EPBD Anexa VIII",
      body: "Devine obligatoriu 29.V.2026 pentru clădiri >250 m² la vânzare. Plan etapizat cu jaloane.",
      items: [
        { label: "ID Pașaport", dataType: "UUID v5", required: true, note: "Generat deterministic din date" },
        { label: "Versiune schema", dataType: "string", required: true, note: "1.0 actual (UE EPBD 2024)" },
        { label: "Status", dataType: "enum", required: true, note: "Draft / Issued / Updated / Archived" },
        { label: "Jaloane reabilitare", dataType: "array", required: true, note: "Tipic: 2030 (target E), 2033 (target D), 2050 (target ZEB)" },
        { label: "Cost total estimat", dataType: "EUR", required: true, note: "Sumă cumulată toate fazele" },
        { label: "Reducere CO₂ target", dataType: "% sau kg/m²a", required: true, note: "Vs starea inițială baseline" },
        { label: "Finanțare estimată", dataType: "obj", required: false, note: "Casa Verde + PNRR + împrumut bancar" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă per categorie",
      title: "Strategii audit per tip clădire",
      branches: [
        {
          category: "RA (apartament bloc)",
          appliesTo: ["M1"],
          description: "Reabilitare DOAR ce e individual posibil: ferestre, sursă încălzire individuală, izolare interioară perete exterior. Anvelopa exterioară = decizie asociație. Cost mic 5-15.000 EUR.",
        },
        {
          category: "RI (casă unifamilială)",
          appliesTo: ["M2"],
          description: "Caz tipic: izolație EPS 15 cm + ferestre Low-E + HP + PV + VMC HR. Cost 25-40.000 EUR. Payback 8-12 ani. Atinge nZEB.",
          formula: "Cost-optim = punct minim Cost_total = Cost_invest_VAN + Cost_energie_VAN",
        },
        {
          category: "RI nou ZEB (M5)",
          appliesTo: ["M5"],
          description: "Deja conform — audit doar pentru documentare + Raport nZEB obligatoriu Art. 6 alin. 1 Ord. 348/2026.",
        },
        {
          category: "BI (birouri)",
          appliesTo: ["M3"],
          description: "Audit complet OBLIGATORIU pre-renovare profundă. PNRR rezidențial NU se aplică — alternative: PR Anvelopa pentru clădiri publice, KfW pentru private.",
        },
        {
          category: "ED (școală)",
          appliesTo: ["M4"],
          description: "Eligibil PNRR Componenta C5 + PNRR Componenta C10 (educație). Finanțare 70-90% din total. Audit obligatoriu pentru aplicație fonduri.",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Cadrul Pasului 7",
      refs: [REFS.ord_2461_2011, REFS.mc001, REFS.epbd_art9, REFS.epbd_art17, REFS.ord_348_art6],
      quote: "Auditul energetic este un proces sistematic de obținere a unor cunoștințe corespunzătoare despre profilul existent al consumului de energie, identificarea factorilor care influențează consumul, evaluarea măsurilor de îmbunătățire a eficienței energetice.",
      quoteSource: "Ord. MDLPA 2461/2011 §1 alin. 2",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni audit",
      terms: [GLOSSARY.AE_Ici, GLOSSARY.nZEB, GLOSSARY.MEPS, GLOSSARY.RER, GLOSSARY.EP, GLOSSARY.GWP],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli scenarii reabilitare",
      items: [
        {
          title: "Recomandare DOAR ferestre (parțial)",
          body: "Ferestre noi fără izolarea pereților → puntea fereastră-perete devine PUNCT REVE punct rouă. Risc condens + mucegai pe colțuri.",
          fix: "Reabilitare integrală: izolație pereți + ferestre simultan. Sau ferestre + tratament punte termică spalet.",
        },
        {
          title: "Payback fără actualizare valoare bani",
          body: "Payback simplu = Cost / Economie_anuală. Subestimează ROI real (ignoră inflația energiei + actualizare bani). Real: NPV/IRR.",
          fix: "Zephren calculează automat NPV + IRR cu rata dobândă + inflație energie. Payback simplu doar referință.",
        },
        {
          title: "Cost reabilitare subestimat (200 EUR/m²)",
          body: "Reabilitare nZEB completă rezidențial RO 2025: 280-350 EUR/m² (cost mediu). Sub 200 = doar parțial (ferestre + zugrăvit).",
          fix: "Folosește baze date Zephren — costuri actualizate trimestrial (Eurostat construction price index 2026)." ,
        },
        {
          title: "Scenarii fără calcul realizabilitate",
          body: "Recomandare 'pompă căldură sol-apă' într-un apartament la etaj 3 fără teren = imposibil tehnic. Auditorul ignoră contextul.",
          fix: "Verifică în Pas 7 'verifică realizabilitate' — Zephren filtrează măsuri imposibile per tip clădire.",
        },
        {
          title: "Ignorarea bonus PNRR în NPV",
          body: "Pentru clădiri eligibile PNRR (reducere >30% EP), bonus 30-70% reduce dramatic NPV-ul. Ignorarea face investiția să pară non-rentabilă.",
          fix: "Pas 7 — tab 'Eligibilitate fonduri' verifică automat + aplică bonus PNRR în calcul NPV.",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Audit → documente finale",
      flows: [
        { from: "Anexa 2 CPE", to: "Pas 6 export CPE", description: "Top 5 măsuri din scenarii" },
        { from: "Raport Audit DOCX", to: "Pas 7 export", description: "Document 8 capitole Ord. 2461/2011" },
        { from: "Pașaport Renovare", to: "Pas 7 export JSON+XML+PDF", description: "EPBD Anexa VIII" },
        { from: "Cost-optim", to: "Pas 7 grafic + buton aplicare", description: "Pre-completare scenariu" },
        { from: "Eligibilitate fonduri", to: "Pas 8 dosar Casa Verde", description: "Anexă cerere finanțare" },
        { from: "NPV/IRR", to: "Anunț comercial vânzare", description: "Argument valoare adăugată" },
      ],
    },

    {
      id: "what-if-npv",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Cum se schimbă NPV cu rata dobândă",
      body: "Scenariu izolație 15 cm EPS pentru casă M2: cost 18.000 EUR, economie energie 1.500 EUR/an. Variază dobânda.",
      parameter: "rate",
      paramLabel: "Rata dobândă bancă",
      paramUnit: "%",
      min: 2,
      max: 12,
      step: 0.5,
      defaultValue: 7,
      formula: ({ value }) => {
        const cost = 18000;
        const economie = 1500;
        const ani = 30;
        const r = value / 100;
        // NPV = -cost + Σ economie / (1+r)^t
        let npv = -cost;
        for (let t = 1; t <= ani; t++) {
          npv += economie / Math.pow(1 + r, t);
        }
        return { output: npv, unit: "EUR", label: "NPV (30 ani)", decimals: 0 };
      },
      baseline: { value: 7, output: 593, label: "Rata 7% (BCR Q4 2025)" },
      presets: [
        { label: "Zero (cash)", value: 2 },
        { label: "Bună (BCE)", value: 4 },
        { label: "Mediu (RO 2025)", value: 7 },
        { label: "Ridicată", value: 10 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Zephren audit",
      items: [
        "<b>Cost reabilitare</b> vs benchmark Eurostat 2026 — warning dacă <60% sau >150%.",
        "<b>NPV pozitiv</b> = scenariu eligibil. Negativ + bonus PNRR = recalc cu finanțare.",
        "<b>EP_post &lt; limita nZEB</b> = scenariu atinge nZEB.",
        "<b>RER_post ≥ 30%</b> = bonus pentru clasă superioară.",
        "<b>Coerență CPE↔Deviz</b> — Pasul 7 verifică paritate, warning dacă diferență >10%.",
        "<b>Eligibilitate PNRR</b> — automate verificare reducere EP > 30% + criterii eligibili.",
        "<b>Pașaport completed</b> — toate jaloanele 2030/2033/2050 cu cost + emisii.",
        "<b>Bilanț real vs calc</b> &gt; 25% = ajustare recomandată Pas 5.",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 7",
      items: [
        "Calcul detaliat LCC (Life Cycle Cost) cu costuri operare/mentenanță — Plan Expert (2.999 RON+) include.",
        "Optimizare multi-criteriu (cost vs CO₂ vs confort) — Zephren prezintă scenarii ordonate, nu optimum Pareto.",
        "Acordul vecini bloc — recomandările sunt indicative; pentru asociație necesită vot AGA.",
        "Tax legal — Zephren NU calculează scutire impozit (Art. 297 Cod Fiscal) — info auditor manual.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Scenarii audit M2 (casă Cluj)",
      values: [
        { label: "S1 Minim", value: "9.000 EUR", note: "EPS 5cm + ferestre. EP=580" },
        { label: "S2 Mediu", value: "18.000 EUR", note: "+VMC + radiatoare. EP=380" },
        { label: "S3 Maxim", value: "32.000 EUR", note: "+HP+PV. EP=120 (nZEB)" },
        { label: "Cost-optim", value: "23.000 EUR", note: "Calc minim total NPV" },
        { label: "Eligibilitate PNRR", value: "DA", note: "Reducere >30% EP" },
        { label: "Pașaport", value: "Generat", note: "JSON+XML+PDF EPBD" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test Pas 7",
      questions: [
        {
          question: "Scenariu reabilitare profundă RI: cost 25.000 EUR, economie 1.800 EUR/an, dobândă 7%, perioadă 30 ani. NPV este aprox:",
          options: ["-2.500 EUR (nerecuperabil)", "+1.800 EUR (marginal pozitiv)", "+5.000 EUR (rentabil)", "+10.000 EUR (foarte bun)"],
          correct: 1,
          explanation: "NPV = -25.000 + Σ_t=1..30 [1.800/1.07^t] = -25.000 + 1.800 × 12.41 (factor anuitate) = -25.000 + 22.340 = -2.660 EUR. Marginal negativ — necesită bonus PNRR pentru rentabilitate.",
        },
        {
          question: "EPBD 2024 Art. 9.1.a cere clădirilor rezidențiale existente:",
          options: ["Clasa A până 2030 + ZEB 2040", "Clasa E până 2030 + clasa D până 2033", "ZEB obligatoriu pentru toate până 2030", "Doar îmbunătățire cu 1 treaptă față de baseline"],
          correct: 1,
          explanation: "EPBD 2024 Art. 9.1.a — Statele membre asigură ca toate clădirile rezidențiale existente să fie min clasă E până 2030, clasă D până 2033. Pentru nerezidențial Art. 9.1.b: 16% cele mai slabe renovate până 2030, 26% până 2033.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum prezinți audit la client (workflow real)",
      body: "1) Prima vizită: măsurători + Pas 1-3 completate + foto. 2) Birou: complete Pas 4-5 calc. 3) Vizita 2 (~7 zile): prezintă 3 scenarii cu NPV vs client. ÎNTREABĂ: 'Care e bugetul max? Vinzi în 3 ani sau locuiești?'. 4) Pe baza răspunsului: scenariu recomandat finală. 5) Prezintă cu grafic vizual (NPV + payback + CO₂) — clientul înțelege mult mai bine vs tabel cu cifre. 6) Atașează Anexa 2 + Pașaport la CPE. 7) Follow-up 3 luni: client cu finanțare?",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Tranziție audit 2024-2030",
      changes: [
        {
          period: "29.V.2026",
          title: "Pașaport Renovare obligatoriu",
          body: "EPBD Art. 17 — pentru clădiri >250 m² la vânzare. Schema 1.0 EU. Generare în Zephren.",
          refs: [REFS.epbd_art17],
        },
        {
          period: "8.VII.2026",
          title: "Raport nZEB obligatoriu clădiri noi",
          body: "Ord. 348/2026 Art. 6 alin. 1 lit. c — AE Ici emite Raport nZEB pentru clădiri noi/renovate profund.",
          refs: [REFS.ord_348_art6],
        },
        {
          period: "2030",
          title: "MEPS rezidențial clasa E obligatoriu",
          body: "EPBD 9.1.a — toate clădirile clasa E sau mai bună. Sancțiuni: blocaj vânzare/închiriere pentru F/G.",
          refs: [REFS.epbd_art9],
        },
        {
          period: "2033",
          title: "MEPS clasa D obligatoriu",
          body: "Următoarea treaptă. Reabilitarea spre clasa D devine standard piață.",
        },
        {
          period: "2050",
          title: "Stoc clădiri ZEB total UE",
          body: "EPBD 2024 Art. 2 — toate clădirile UE = ZEB până 2050. Audit + pașaport indispensabili.",
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Situații atipice audit",
      cases: [
        {
          title: "💰 Audit pentru finanțare bancă (verde)",
          body: "Bănci RO (BCR Verde, Raiffeisen Green Mortgage) oferă dobânzi reduse (-0.5 pp) pentru achiziție/reabilitare clădiri eficiente. Audit Zephren = document acceptat. Format atașament: PDF Raport + Anexa 2 cu măsuri.",
        },
        {
          title: "🏢 Audit obligatoriu nerezidențial >250 kW",
          body: "Legea 372/2005 Art. 17 — clădiri nerezidențiale cu consum >250 kW (echivalent BI mediu/mare) — audit obligatoriu o dată la 4 ani. Zephren Plan AE Ici acoperă.",
        },
        {
          title: "🏛️ Audit clădire monument",
          body: "Cap. 1 Raport include 'derogări istorice' din avizul Direcția Cultură. Scenariile Anexa 2 limitate la măsuri compatibile (ex: izolare interioară în loc de exterioară pentru fațade protejate).",
        },
        {
          title: "🏭 Audit conformare ISO 50001",
          body: "Companii cu ISO 50001 EnMS — audit Zephren = una din cerințele auditului anual. Format atașament: PDF + JSON pentru import în sistem EnMS.",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export audit",
      title: "Documente Pas 7",
      outputs: [
        { icon: "📊", format: "Raport Audit DOCX (8 capitole)", description: "Conform Ord. MDLPA 2461/2011 + Mc 001-2022. Editabil Word.", planRequired: "AE Ici 1.499 RON+" },
        { icon: "📋", format: "Pașaport Renovare PDF+JSON+XML", description: "EPBD Anexa VIII. Schema 1.0. Plan etapizat 2030/2033/2050.", planRequired: "AE Ici+" },
        { icon: "💰", format: "Dosar Casa Verde", description: "Fișă tehnică + estimare cost + economie energie.", planRequired: "AE Ici+" },
        { icon: "📈", format: "Foaie Parcurs DOCX", description: "Plan etapizat reabilitare cu calendar + costuri.", planRequired: "AE Ici+" },
        { icon: "🎓", format: "Raport nZEB (clădire nouă)", description: "Document oficial Art. 6 alin. 1 Ord. 348/2026. Doar AE Ici.", planRequired: "AE Ici+" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări audit",
      items: [
        { q: "AE IIci poate face audit? Doar CPE?", a: "AE IIci poate emite DOAR CPE rezidențial (Art. 6 alin. 2 Ord. 348/2026). Pentru Raport Audit Energetic complet + Raport nZEB necesită AE Ici (Art. 6 alin. 1). Plan Zephren AE IIci 599 RON pentru CPE; AE Ici 1.499 RON pentru audit complet." },
        { q: "Pașaport Renovare valid câți ani?", a: "Nu are expirare fixă — se actualizează când se completează un jalon (ex: izolație efectuată 2027). Updates voluntare la modificări proprietate. Status 'Updated' în schema." },
        { q: "Cum demonstrez eligibilitate PNRR?", a: "Pas 7 — tab eligibilitate. Verifică automate: reducere EP >30% post-rehab + clădire eligibilă PNRR Componentă C5/C10/C15. Zephren generează fișă tehnică PNRR atașată dosar." },
        { q: "Cost-optim vs scenariu minim — care e diferența?", a: "Cost-optim = punct minim Cost_total = Investiție + Cost_energie pe perioadă (30 ani). Minim = doar scenariu cu cost mic. Cost-optim e adesea mediu (scenariul S2 din demo)." },
        { q: "Bilanț real diferit de calc - când e probabil greșit calc?", a: "Diferență >25% iarna: probabilă T_int real diferit (24 vs 20°C). Diferență >25% vara: cooling neîncadrat. Diferență consum vacanțe: ocupare nereal." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 7",
      links: [
        { title: "PNRR Componenta C5 — Eficiență", url: "https://mfe.gov.ro/pnrr/", description: "Ghid eligibilitate clădiri rezidențiale" },
        { title: "PNRR Componenta C10 — Educație", url: "https://mfe.gov.ro/pnrr/", description: "Eligibilitate școli + grădinițe" },
        { title: "Casa Verde Plus AFM", url: "https://www.afm.ro/casa-verde-plus", description: "HP + solar termic + biomasă" },
        { title: "BCR Verde — Credit reabilitare", url: "https://www.bcr.ro/ro/individual/credite/credit-verde", description: "Credit cu dobândă redusă" },
        { title: "EPBD 2024 Buildings Stock Observatory", url: "https://building-stock-observatory.energy.ec.europa.eu/", description: "Date stat clădiri UE pentru benchmark" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 8",
      title: "Ce am acoperit Pas 7",
      bullets: [
        "<b>Audit</b> = plan acțiune detaliat 8 capitole (Ord. 2461/2011).",
        "<b>Scenarii reabilitare</b> Min/Mediu/Max cu NPV/IRR + cost-optim auto.",
        "<b>Pașaport Renovare</b> obligatoriu 29.V.2026 pentru >250 m². EPBD Anexa VIII.",
        "<b>Cost reabilitare nZEB</b> RO 2025: 280-350 EUR/m² rezidențial.",
        "<b>Eligibilitate PNRR</b> auto-verificată — bonus 30-70% reduce NPV negative.",
        "<b>AE Ici doar</b> — AE IIci NU poate face audit complet (doar CPE).",
      ],
      nextStep: "Pasul 8 — Instrumente avansate: nZEB, MEPS, BACS, SRI, BIM, cooling hourly, Pasivhaus, Monte Carlo EP, Portofoliu manager. 18 module extra.",
    },
  ],
};
