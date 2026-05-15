// ═════════════════════════════════════════════════════════════════════════════
// Pas 1 — Identificare clădire (21 secțiuni)
//
// Acoperă: hero, decizia categoriei, câmpuri obligatorii/opționale, ramificare
// pe categorie, normative, glosar, greșeli, propagare la pașii următori,
// simulator Au, verificări automate, limite, demo snapshot, quiz, sfat,
// legislație 2024→2026, cazuri speciale, export, FAQ, resurse, recap.
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 1 stabilește identitatea clădirii și parametrii săi geometrici și climatici fundamentali. Toate calculele ulterioare (EP, nZEB, CO₂, scenarii reabilitare) depind direct de aceste date. O eroare de 10% la suprafața utilă Au se propagă în întreaga aplicație și poate clasifica greșit clădirea.",

  sections: [

    // 01 ───────────────────────────────────────────────────────────────────
    {
      id: "hero",
      type: "hero",
      kicker: "Scop și importanță",
      title: "Ce face Pasul 1 și de ce este critic",
      body: "Stabilește identitatea legală + geometria + zona climatică a clădirii. Datele introduse aici nu se modifică ulterior fără a invalida întregul calcul. Auditorul trebuie să verifice fizic (planuri, fișa cadastrală) ÎNAINTE de a începe.",
      highlight: "Atenție: schimbarea categoriei funcționale (RI→RC, BI→ED) la final invalidează scenariile de reabilitare din Pasul 7 și pragul nZEB din Pasul 8.",
    },

    // 02 ───────────────────────────────────────────────────────────────────
    {
      id: "decision-category",
      type: "decision",
      kicker: "Decizia arhitecturală",
      title: "Alegerea categoriei funcționale — cel mai important câmp",
      body: "Mc 001-2022 Tab 2.4-2.10 definește limite nZEB diferite per categorie. O greșeală aici schimbă pragul cu 50-100%. Verifică destinația din Cartea Funciară + Autorizația de construire.",
      options: [
        {
          title: "Rezidențial Individual (RI)",
          pros: ["Cea mai frecventă categorie", "EP_max nZEB = 125 kWh/m²a", "Aplicabil casă unifamilială standalone"],
          cons: ["NU se aplică case duplex/cuplate cu proprietăți diferite (acelea sunt RC)"],
          recommendation: "M2/M5 (Zephren demo) — case Cluj / Sibiu",
        },
        {
          title: "Rezidențial Colectiv (RC/RA)",
          pros: ["Apartament în bloc → RA", "Bloc întreg → RC", "EP_max nZEB = 110 kWh/m²a"],
          cons: ["Atenție la pereții comuni — temperaturi vecini influențează bilanțul", "Pașaport limitat — proprietate individuală nu poate modifica anvelopa fără asociație"],
          recommendation: "M1 (apartament Constanța)",
        },
        {
          title: "Birouri (BI)",
          pros: ["Calcul ocupare = ore lucrătoare", "EP_max nZEB = 145 kWh/m²a", "BACS clasa B obligatorie dacă >290 kW"],
          cons: ["Necesită LENI EN 15193 detaliat", "SRI complet obligatoriu"],
          recommendation: "M3 (birouri București)",
        },
        {
          title: "Educație (ED) / Sănătate (SP) / Comerț (CO)",
          pros: ["Eligibile PNRR + AFM", "Pragul nZEB foarte strict (ED ≤60, SP ≤70, CO ≤90 kWh/m²a)"],
          cons: ["Necesită profil ocupare specific (vacanțe școală, regim spital 24/7)"],
          recommendation: "M4 (școală Brașov)",
        },
      ],
    },

    // 03 ───────────────────────────────────────────────────────────────────
    {
      id: "fields-required",
      type: "fields",
      kicker: "Câmpuri obligatorii",
      title: "Cele 8 câmpuri minime pentru a continua",
      body: "Fără aceste câmpuri Zephren nu permite trecerea la Pasul 2 — validare hard în UI. Notă: 'auto' = se completează automat din OSM/cadastru.",
      items: [
        { label: "Adresă completă", dataType: "text", required: true, note: "Auto-complete OSM (OpenStreetMap). Folosit pentru geocoding lat/long." },
        { label: "Categorie funcțională", dataType: "enum", required: true, note: "RI/RC/RA/BC/BI/ED/SP/CO/HC/SA/AL — afectează limită nZEB." },
        { label: "Suprafață utilă Au", dataType: "number m²", required: true, note: "EP raportat la Au. Eroare ±10% → clasă schimbată." },
        { label: "Volum interior V", dataType: "number m³", required: true, note: "Pentru calculul pierderilor ventilație. V ≈ Au × h × niv." },
        { label: "An construcție", dataType: "year", required: true, note: "Determină profilul tipologic (panou mare PAFP, cărămidă plină, BCA modern)." },
        { label: "Regim înălțime", dataType: "enum P+xE", required: true, note: "P / P+1E / S+P+2E etc. Influențează A/V." },
        { label: "Înălțime nivel", dataType: "number m", required: true, note: "Tipic 2.50-2.80 rezidențial, 3.00-3.50 nerezidențial." },
        { label: "Etanșeitate n₅₀", dataType: "number h⁻¹", required: true, note: "Tipic 4-10 clădiri vechi, <1.5 clădiri etanșe noi. Blower Door dacă disponibil." },
      ],
    },

    // 04 ───────────────────────────────────────────────────────────────────
    {
      id: "fields-optional",
      type: "fields",
      kicker: "Câmpuri opționale",
      title: "Câmpuri care nu blochează, dar îmbunătățesc calitatea CPE",
      body: "Aceste câmpuri nu sunt mandatorii dar lipsa lor degradează precizia calculului sau forțează valori default (cu warning).",
      items: [
        { label: "Cod cadastral + Carte Funciară", dataType: "text", required: false, note: "Necesar pentru CPE oficial. ANCPI verificare automată în Pas 6." },
        { label: "Coordonate GPS lat/long", dataType: "number°", required: false, note: "Auto din OSM. Folosit pentru PVGIS (orientare PV optimă)." },
        { label: "Proprietar", dataType: "text", required: false, note: "PF/PJ. Apare în CPE Anexa 1." },
        { label: "Suprafață construită Ac", dataType: "number m²", required: false, note: "Include zidurile. Tipic Ac/Au ≈ 1.10-1.25." },
        { label: "Suprafață anvelopă Aeb", dataType: "number m²", required: false, note: "Auto-calc din geometrie. Manual dacă există turnuri sau decupaje." },
        { label: "Factor umbrire", dataType: "number 0-1", required: false, note: "Default 0.85 zone urbane, 0.95 standalone." },
        { label: "GWP lifecycle", dataType: "number kg CO₂eq/m²", required: false, note: "EPBD 2024 Art. 17 — obligatoriu pentru clădiri noi din 2028." },
        { label: "Solar-ready / EV charging", dataType: "bool + count", required: false, note: "EPBD 2024 Art. 12 — clădiri >5 locuri parcare." },
      ],
    },

    // 05 ───────────────────────────────────────────────────────────────────
    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă pe categorie",
      title: "Conținut variabil în funcție de categoria funcțională",
      body: "Pas 1 are 14 câmpuri specifice fiecărei categorii. Mai jos vezi care apar/dispar.",
      branches: [
        {
          category: "RA (apartament bloc)",
          appliesTo: ["M1"],
          description: "Apar: număr apartamente bloc, scara, etajul, ap. nr., sisteme comune (lift, scară). Dispar: an renovare anvelopă (decizie colectivă).",
          formula: "n_apartamente, scara, ap_nr → split DH la nivel apartament",
        },
        {
          category: "RI (casă individuală)",
          appliesTo: ["M2", "M5"],
          description: "Apar: nr. ocupanți, parking, EV charging puncte. Dispar: sisteme comune, alocator costuri.",
          formula: "Au_curte, parking_spaces, ev_charging → trigger pe Pas 4",
        },
        {
          category: "BI (birouri)",
          appliesTo: ["M3"],
          description: "Apar: ore funcționare zilnică, putere instalată kW. Dispar: ocupanți rezidențiali, ACM tipic gospodărie.",
          formula: "P_instalată > 290 kW → forțează BACS clasa B obligatorie în Pas 8",
        },
        {
          category: "ED (școală/grădiniță)",
          appliesTo: ["M4"],
          description: "Apar: nr. elevi, ore funcționare lectivă, vacanțe (calc Q_heat redus). Dispar: ACM intensiv (doar lavoar).",
          formula: "ocupare_lectivă ≈ 200 zile × 8 ore → Q_heat × 0.50-0.65",
        },
      ],
    },

    // 06 ───────────────────────────────────────────────────────────────────
    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Standardele care reglementează Pasul 1",
      body: "Toate datele de identificare urmează cadrul legal Mc 001-2022 + Ord. MDLPA 16/2023 (format CPE) + EPBD 2024 (cerințe UE).",
      refs: [
        REFS.mc001_cap1,
        REFS.ord_16_2023,
        REFS.epbd_2024,
        REFS.epbd_art17,
        REFS.legea_372,
        REFS.mc001_anexa1,
      ],
      quote: "Datele de identificare a clădirii sunt obligatorii în certificatul de performanță energetică. Auditorul are responsabilitatea verificării lor fizice la fața locului înainte de emiterea CPE.",
      quoteSource: "Mc 001-2022 §1.2 alin. 3",
    },

    // 07 ───────────────────────────────────────────────────────────────────
    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar termeni",
      title: "Termeni cheie folosiți în Pasul 1",
      terms: [
        GLOSSARY.Au,
        GLOSSARY.V,
        GLOSSARY.n50,
        GLOSSARY.GD,
        GLOSSARY.EP,
        GLOSSARY.nZEB,
      ],
    },

    // 08 ───────────────────────────────────────────────────────────────────
    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli care invalidează CPE-ul",
      body: "Aceste greșeli pot duce la respingere CPE la audit MDLPA sau la sancțiuni profesionale.",
      items: [
        {
          title: "Au ≠ Ac (confuzie suprafață utilă cu construită)",
          body: "Au este suprafața locuită (fără ziduri). Ac include zidurile. Pentru cărămidă 40 cm, Ac/Au ≈ 1.20-1.25.",
          fix: "Măsoară interior, deduce ziduri. Sau folosește planurile arhitect.",
        },
        {
          title: "Categoria greșită (RI vs RC pentru duplex)",
          body: "Case duplex/triplex cu proprietăți distincte sunt RC, nu RI. Pragul nZEB diferă (RI 125 vs RC 110 kWh/m²a).",
          fix: "Verifică Cartea Funciară — proprietăți separate = RC.",
        },
        {
          title: "n₅₀ subestimat (folosit 1.5 pentru clădire veche)",
          body: "Clădiri vechi neetanșate au n₅₀ 4-10. Folosirea valorii standard 1.5 subestimează pierderile ventilație cu 50-70%.",
          fix: "Cere test Blower Door real sau folosește tabel implicit pe ani construcție (Mc 001 Tab 1.5).",
        },
        {
          title: "An construcție greșit (renovare ≠ construcție)",
          body: "An renovare este SEPARAT de an construcție. Confuzia schimbă tipologia (pre/post normă termică C107/3-2005).",
          fix: "Anul de la fundație. Renovarea anvelopei → 'an renovare'.",
        },
        {
          title: "Adresa incompletă fără localitate/județ",
          body: "Fără localitate, zona climatică nu se detectează auto. Calculul GD greșit cu 30-50%.",
          fix: "Folosește auto-complete OSM. Verifică zona detectată în banner.",
        },
      ],
    },

    // 09 ───────────────────────────────────────────────────────────────────
    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare date",
      title: "Cum se propagă datele Pas 1 în restul aplicației",
      body: "Fiecare câmp din Pas 1 are impact identificabil în pașii ulteriori. Modificarea unui câmp invalidează calculele dependente.",
      flows: [
        { from: "Au", to: "Pas 5 EP/Au", description: "EP = Σ Q × fP / Au — direct proporțional" },
        { from: "Au", to: "Pas 7 cost specific", description: "EUR/m² reabilitare se calculează din Au" },
        { from: "Categorie", to: "Pas 8 prag nZEB", description: "EP_max_nZEB depinde direct de categorie" },
        { from: "An construcție", to: "Pas 2 tipologie", description: "Pre-1990 → U_perete default 1.0-1.5" },
        { from: "Zonă climatică", to: "Pas 5 GD", description: "Grade-zile încălzire/răcire" },
        { from: "n₅₀", to: "Pas 5 Q_inf", description: "Pierderi infiltrații lunare" },
        { from: "Volum V", to: "Pas 5 Q_vent", description: "Pierderi ventilație H_ve = ρ·c·n·V" },
        { from: "h_nivel + niv", to: "Pas 5 verificare V", description: "Validare V = Au × h × n" },
      ],
    },

    // 10 ───────────────────────────────────────────────────────────────────
    {
      id: "what-if-au",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Cum se schimbă EP dacă modifici suprafața utilă",
      body: "Glisează slider-ul de Au pentru a vedea cum se modifică EP_total. Atenție: EP scade când Au crește (numitor mai mare) — dar costul absolut crește. Demo M2 (casă 142 m² Cluj).",
      parameter: "Au",
      paramLabel: "Suprafață utilă Au",
      paramUnit: "m²",
      min: 60,
      max: 250,
      step: 5,
      defaultValue: 142,
      // Formulă simplificată didactică: EP scade ~ 1/Au (consum absolut quasi-constant pe casă vechie)
      formula: ({ value }) => {
        // Q_total absolut pentru M2 (consum constant ~28.000 kWh_final/an)
        const Q_abs = 28000;
        const fP_avg = 1.5;
        const EP = (Q_abs * fP_avg) / value;
        return { output: EP, unit: "kWh/m²a", label: "EP_total calculat", decimals: 0 };
      },
      baseline: { value: 142, output: 296, label: "M2 cu Au=142 m²" },
      presets: [
        { label: "Tipic apt mic", value: 65, description: "Suprafață M1 — Constanța" },
        { label: "Casă M2", value: 142, description: "Suprafață M2 — Cluj-Napoca" },
        { label: "Casă mare", value: 220, description: "Suprafață casă largă" },
      ],
    },

    // 11 ───────────────────────────────────────────────────────────────────
    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate Zephren",
      title: "Validări care rulează automat când completezi câmpurile",
      body: "Zephren rulează validări reactive în UI — vezi warnings/erori inline imediat după modificare.",
      items: [
        "<b>Zona climatică</b> se detectează automat din localitate (OSM → I/II/III/IV/V).",
        "<b>Raport A/V</b> (anvelopă/volum) calculat automat. Normal 0.4-0.8. Sub 0.4 = clădire compactă, peste 0.8 = clădire alungită.",
        "<b>Au vs Ac</b> — warning galben dacă Ac/Au < 1.05 sau > 1.40 (probabil eroare).",
        "<b>V vs Au×h×niv</b> — warning roșu dacă diferență > 10% (verifică câmpuri).",
        "<b>n₅₀ vs tipologie</b> — warning dacă n₅₀ < 2.0 pentru clădiri pre-1990 (probabil greșit).",
        "<b>Categorie vs scop CPE</b> — RC + scop=construire = warning (renovare apartament rar = construire).",
        "<b>Coord GPS</b> verificate vs județul declarat (mismatch → warning).",
        "<b>Anul construcție</b> > anul curent + 5 = blocaj.",
      ],
    },

    // 12 ───────────────────────────────────────────────────────────────────
    {
      id: "limits",
      type: "limits",
      kicker: "Limite cunoscute",
      title: "Ce NU acoperă Pasul 1 (atenționări)",
      items: [
        "Clădiri istorice / monumente — Pasul 1 NU detectează automat statutul. Auditorul trebuie să bifeze 'cladire_monument' pentru exceptări nZEB.",
        "Clădiri mixte (parter comercial + etaje rezidențiale) — Zephren NU permite categorii multiple. Recomandare: alege categoria dominantă (>60% Au), tratează celelalte ca 'spații conexe'.",
        "Zonă climatică custom — dacă localitatea nu există în catalogul OSM, completare manuală obligatorie.",
        "GWP lifecycle — câmpul există dar Zephren NU calculează automat. Necesită calcul extern EN 15978.",
      ],
    },

    // 13 ───────────────────────────────────────────────────────────────────
    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo curent",
      title: "Valori din demo-ul activ pentru Pas 1",
      body: "Aceste valori sunt pre-completate când aplici demo-ul la final.",
      values: [
        { label: "Categorie", value: "RI", note: "Rezidențial individual" },
        { label: "Au", value: "142 m²", note: "Casă unifam." },
        { label: "Volum", value: "398 m³", note: "P+1E" },
        { label: "An construcție", value: "1965", note: "Pre-normă termică" },
        { label: "Zona climatică", value: "III", note: "Cluj-Napoca" },
        { label: "n₅₀", value: "5.5 h⁻¹", note: "Casă veche" },
      ],
    },

    // 14 ───────────────────────────────────────────────────────────────────
    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare înțelegere",
      title: "2 întrebări despre Pasul 1",
      body: "Răspunsuri imediate cu explicații — nu se înregistrează nicăieri.",
      questions: [
        {
          question: "Un apartament într-un bloc cu 20 unități trebuie încadrat ca:",
          options: ["RI (rezidențial individual)", "RA (rezidențial apartament)", "RC (rezidențial colectiv)", "BC (bloc comercial)"],
          correct: 1,
          explanation: "Apartamentele individuale în blocuri sunt RA. RC = blocul ÎNTREG (CPE pe bloc). RI = case unifamiliale standalone. BC nu există ca categorie Mc 001.",
        },
        {
          question: "Au unei case cărămidă plină 40 cm cu Ac = 150 m² (suprafață construită) ar fi cca:",
          options: ["~100 m²", "~120 m²", "~140 m²", "~165 m²"],
          correct: 1,
          explanation: "Au ≈ Ac × 0.80 pentru cărămidă 40 cm. 150 × 0.80 = 120 m². Raportul Ac/Au tipic 1.20-1.25 pentru pereți groși.",
        },
      ],
    },

    // 15 ───────────────────────────────────────────────────────────────────
    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional teren",
      title: "Cum verifici Au în 3 minute la fața locului",
      body: "Aduci ruletă laser + planuri. Măsoară interior cele mai mari camere (sufragerie, dormitoare). Adună fără băi, bucătărie, holuri (acelea sunt incluse în Au dar le calculezi separat). Pentru case 1960-1980 fără planuri: măsoară exteriorul, scade 2 × grosime perete × perimetru. La PAFP '70-'80, ziduri exterioare 25-32 cm.",
    },

    // 16 ───────────────────────────────────────────────────────────────────
    {
      id: "legislation",
      type: "legislation",
      kicker: "Diferențe legislative",
      title: "Cum s-au schimbat cerințele Pasului 1 din 2024",
      body: "Pasul 1 a fost extins în 2024-2026 cu câmpuri noi pentru a respecta EPBD 2024 și Ord. MDLPA 348/2026.",
      changes: [
        {
          period: "2024",
          title: "Adăugare câmp GWP lifecycle",
          body: "EPBD 2024 Art. 17 cere indicator GWP în CPE pentru clădiri noi din 2028. Calcul cradle-to-grave EN 15978.",
          refs: [REFS.epbd_art17],
        },
        {
          period: "2025",
          title: "Adăugare Solar-ready + EV charging",
          body: "EPBD 2024 Art. 12 cere infrastructură EV charging la clădiri noi cu >5 locuri parcare + solar-ready pentru clădiri noi.",
          refs: [REFS.epbd_2024],
        },
        {
          period: "2026",
          title: "Tranziție grade auditor I/II → Ici/IIci",
          body: "Ord. MDLPA 348/2026 — portalul MDLPA disponibil din 8.VII.2026. AE IIci poate completa DOAR CPE rezidențial; AE Ici toate.",
          refs: [REFS.ord_348, REFS.ord_348_art6],
        },
        {
          period: "2030",
          title: "MEPS rezidențial clasa E obligatorie",
          body: "EPBD 2024 Art. 9.1.a — toate clădirile rezidențiale existente clasa E sau mai bună până 2030, clasa D până 2033.",
          refs: [REFS.epbd_art9],
        },
      ],
    },

    // 17 ───────────────────────────────────────────────────────────────────
    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Situații atipice în Pasul 1 și cum le tratezi",
      body: "Aceste cazuri necesită atenție specială sau câmpuri suplimentare.",
      cases: [
        {
          title: "🏛️ Clădiri monument istoric",
          body: "Bifați 'cladire_monument' în câmpurile avansate. Mc 001-2022 §1.5 permite derogări de la cerințe nZEB dacă reabilitarea afectează valoarea istorică. Necesită aviz Direcția Cultură + atașare la dosar. Auditorul NU poate impune măsuri care contravin aviz cultură.",
        },
        {
          title: "🏘️ Multi-tenant cu CPE individual",
          body: "Blocuri vechi în care fiecare proprietar emite CPE separat pentru apartamentul propriu. Câmp 'building.units' = 1 (apartament curent), dar 'building.nApartments' = total bloc pentru context. Sistemul de termoficare comun se modelează ca η_distribuție colectivă.",
        },
        {
          title: "🌳 Clădiri cu spații parțial încălzite",
          body: "Pivnițe, mansarde nelocuite. NU includeți în Au — Au este SUPRAFAȚA ÎNCĂLZITĂ. Subsol neîncălzit (η_distribuție pe acolo) intră separat ca element opac al planșeului peste subsol în Pas 2.",
        },
        {
          title: "🏗️ Clădiri pe etape de construire (extindere)",
          body: "Casă originală 1980 + extindere 2010 (toaletă, dormitor). Folosiți an = an cap-de-corp DOMINANT (1980). Diferențe de izolație se gestionează în Pas 2 ca elemente opace separate cu U diferit.",
        },
        {
          title: "🏢 Conversii destinație (industrial → birou)",
          body: "Hală industrială convertită birou. Categorie = noua destinație (BI). An construcție = an conversie dacă renovare majoră, altfel an original. Atenție la anvelopa industrială (panou sandwich) — adesea U slab.",
        },
      ],
    },

    // 18 ───────────────────────────────────────────────────────────────────
    {
      id: "export",
      type: "export",
      kicker: "Ce iese din pas",
      title: "Datele din Pas 1 în documente exportate",
      body: "Câmpurile din Pas 1 sunt scheletul tuturor exporturilor — CPE, audit, pașaport.",
      outputs: [
        {
          icon: "📜",
          format: "CPE Anexa 1 (PDF/A-3)",
          description: "Toate cele 8 câmpuri obligatorii apar în prima secțiune. Format Mc 001 + Ord. 16/2023.",
          planRequired: "AE IIci+ (599 RON)",
        },
        {
          icon: "📊",
          format: "Raport Audit Cap. 1",
          description: "Datele identificare + descrierea generală a clădirii. Cap. 1 al Raportului de Audit (Ord. 2461/2011).",
          planRequired: "AE Ici (1.499 RON)",
        },
        {
          icon: "📋",
          format: "Pașaport Renovare JSON+XML",
          description: "Building section conform EPBD 2024 Anexa VIII. ID UUID v5 deterministic din date.",
          planRequired: "AE Ici+",
        },
        {
          icon: "📄",
          format: "XML MDLPA v2.1",
          description: "Schema oficială MDLPA pentru Registrul CPE. Toate datele Pas 1 în secțiunea <building>.",
          planRequired: "Expert (2.999 RON)",
        },
      ],
    },

    // 19 ───────────────────────────────────────────────────────────────────
    {
      id: "faq",
      type: "faq",
      kicker: "Întrebări frecvente",
      title: "Răspunsuri la întrebări reale ale auditorilor",
      items: [
        {
          q: "Pot folosi 'estimat din planuri' fără măsurători reale?",
          a: "DA pentru CPE rezidențial simplu (vânzare locuință). NU pentru audit energetic complet sau scop construire (acolo necesită măsurare fizică conform Ord. 2461/2011). Bună practică: măsurare spot-check 30% încăperi pentru validare planuri.",
        },
        {
          q: "Cum tratez o casă duplex unde locuiesc 2 familii?",
          a: "Dacă există carte funciară unică (1 proprietate) → RI cu Au cumulat. Dacă proprietăți separate → RC cu CPE-uri individuale per unitate. Verifică ANCPI înainte.",
        },
        {
          q: "Anul construcție 1985 sau anul renovării 2018?",
          a: "An construcție = 1985 (anul original). Anul renovării 2018 se completează în câmpul separat 'yearRenov'. Mc 001 folosește anul de construcție pentru tipologia anvelopei default; an renovare doar pentru raportare istoric.",
        },
        {
          q: "Ce fac dacă n₅₀ măsurat e diferit de tabelele Mc 001?",
          a: "Valoarea măsurată Blower Door are prioritate ABSOLUTĂ. Atașează raportul testului la dosarul de audit. Tabelele Mc 001 §1.5 sunt doar default-uri pentru cazurile fără testare.",
        },
        {
          q: "Suprafața utilă pentru un duplex pe 2 niveluri?",
          a: "Au = suma Au_etaj_parter + Au_etaj_1 — scăzând golul scării interioare (care nu e suprafață locuită). Volumul V se calculează similar prin cumulare.",
        },
      ],
    },

    // 20 ───────────────────────────────────────────────────────────────────
    {
      id: "resources",
      type: "resources",
      kicker: "Resurse externe",
      title: "Linkuri utile pentru Pasul 1",
      body: "Resurse oficiale pentru completare datelor și pentru aprofundare normativă.",
      links: [
        { title: "MDLPA — Reglementări tehnice clădiri", url: "https://www.mdlpa.ro/pages/regulamenttehniccladiri", description: "Mc 001-2022 + ordinele anexă" },
        { title: "ANCPI — Verificare cadastru", url: "https://epay.ancpi.ro", description: "Validare CF + cadastral nr." },
        { title: "EUR-Lex EPBD 2024/1275", url: "https://eur-lex.europa.eu/eli/dir/2024/1275/oj", description: "Directiva UE oficială" },
        { title: "Portal MDLPA auditori (8.VII.2026)", url: "https://atestare.mdlpa.ro", description: "Registru auditori atestați" },
        { title: "OSM — OpenStreetMap (geocoding)", url: "https://nominatim.openstreetmap.org", description: "Sursă auto-complete adresă" },
      ],
    },

    // 21 ───────────────────────────────────────────────────────────────────
    {
      id: "recap",
      type: "recap",
      kicker: "Recapitulare + Pasul 2",
      title: "Ce ai învățat în Pasul 1 + tranziție",
      body: "Pasul 1 stabilește fundamentul. Toate calculele EP, nZEB, CO₂, scenarii reabilitare depind de aceste date.",
      bullets: [
        "<b>Categoria funcțională</b> e cel mai critic câmp — afectează pragul nZEB (RI 125 vs ED 60 kWh/m²a).",
        "<b>Au ≠ Ac</b> — măsoară suprafața locuită, NU construită.",
        "<b>n₅₀</b> tipic clădiri vechi 4-10 (NU 1.5).",
        "<b>An construcție</b> ≠ an renovare — Mc 001 folosește anul original pentru tipologie.",
        "<b>Datele se propagă</b> în pașii 2-8 — orice modificare invalidează calculele dependente.",
      ],
      nextStep: "Pasul 2 — Anvelopa termică: calculezi U pereți, planșee, ferestre, punți termice. Datele Au și n₅₀ din Pas 1 se folosesc pentru bilanțul pierderilor.",
    },

  ],
};
