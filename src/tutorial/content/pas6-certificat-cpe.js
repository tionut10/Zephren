// ═════════════════════════════════════════════════════════════════════════════
// Pas 6 — Certificat CPE (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 6 emite Certificatul de Performanță Energetică (CPE) — documentul oficial reglementat de Mc 001-2022 + Ord. MDLPA 16/2023. Export în 3 formate: PDF/A-3 (arhivare lung termen ISO 19005-3), DOCX (editabil), XML MDLPA v2.1 (Registrul oficial). Semnătura PAdES B-LT cu QTSP RO (certSIGN/DigiSign) obligatorie pentru valoare juridică.",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "Documentul oficial",
      title: "Certificatul de Performanță Energetică — bază legală",
      body: "Conform Legii 372/2005 modificată L.238/2024 (transpunere EPBD 2024), CPE este obligatoriu la: vânzare, închiriere, dare în administrare, construire nouă, renovare majoră. Valabilitate: 10 ani sau până la renovare majoră. Sancțiune absența CPE: amendă 5.000-15.000 RON pentru vânzător/locator.",
      highlight: "Tranziție Ord. MDLPA 348/2026: din 8.VII.2026 — gradele auditor I/II devin AE Ici/IIci. AE IIci poate emite DOAR CPE rezidențial (Art. 6 alin. 2). AE Ici toate categoriile + Raport nZEB (Art. 6 alin. 1).",
    },

    {
      id: "decision-format",
      type: "decision",
      kicker: "Decizia formatului export",
      title: "Care format alegi?",
      options: [
        {
          title: "PDF/A-3 (recomandat — arhivare oficială)",
          pros: ["ISO 19005-3 — arhivare 10+ ani garantată", "Atașamente JSON+CSV+XML cu AFRelationship", "Semnătura PAdES B-LT validare lung termen", "Prevăzut Ord. MDLPA 348/2026"],
          cons: ["Nu poate fi editat fără invalidarea semnăturii", "Necesită cont QTSP RO (certSIGN ~150-400 EUR/lună)"],
          recommendation: "Pentru CPE oficial înregistrat MDLPA — singura opțiune validă juridic",
        },
        {
          title: "DOCX (template editabil)",
          pros: ["Editabil în Word/LibreOffice", "Util pentru draft / colaborare", "Compatibil cu vechile sisteme"],
          cons: ["NU are valoare juridică fără PDF/A-3 final", "Nu suportă PAdES", "Poate fi modificat post-emitere"],
          recommendation: "Doar pentru draft intern și revizuire client înainte de PDF/A-3 final",
        },
        {
          title: "XML MDLPA v2.1",
          pros: ["Format oficial Registru CPE", "Compatibil cu portalul atestare 8.VII.2026"],
          cons: ["Necesar paralel cu PDF/A-3 (nu înlocuiește)", "Plan Expert necesar"],
          recommendation: "Obligatoriu pentru CPE-uri înregistrate la MDLPA portal",
        },
      ],
    },

    {
      id: "fields-auditor",
      type: "fields",
      kicker: "Date auditor",
      title: "Datele obligatorii ale auditorului",
      body: "Toate câmpurile sunt obligatorii pentru CPE oficial. Sistemul nu permite export fără completare.",
      items: [
        { label: "Nume complet", dataType: "text", required: true, note: "Conform CI" },
        { label: "Atestat MDLPA (cert. nr.)", dataType: "text", required: true, note: "Format: A123/AB456 sau cod portal nou Ord. 348/2026" },
        { label: "Grad atestat", dataType: "enum", required: true, note: "AE Ici / AE IIci (sau legacy I/II)" },
        { label: "Ordin emitere", dataType: "enum", required: true, note: "Ord. 2237/2010 (legacy) sau Ord. 348/2026 (nou)" },
        { label: "Dată emitere atestat", dataType: "date", required: true, note: "Auditul atestatului în Pas 6 (Pas 7+ pentru tranziție)" },
        { label: "Companie/Firmă", dataType: "text", required: false, note: "Dacă auditor angajat" },
        { label: "Email contact", dataType: "email", required: true, note: "Pentru notificări MDLPA și verificare publică" },
        { label: "Telefon", dataType: "tel", required: true, note: "Necesar Anexa 1 CPE" },
        { label: "Semnătură imagine", dataType: "PNG/JPG", required: true, note: "Upload semnătură olografă scanată pentru CPE PDF" },
        { label: "Ștampilă imagine", dataType: "PNG/JPG", required: true, note: "Upload ștampila auditor (cu nr. atestat)" },
      ],
    },

    {
      id: "fields-cpe",
      type: "fields",
      kicker: "Date CPE",
      title: "Câmpuri specifice certificatului",
      items: [
        { label: "Cod CPE", dataType: "auto-generat", required: true, note: "Format Mc 001: AN-CC-CN-NNNN (an-cod_localitate-cod_clasă-număr)" },
        { label: "Scop CPE", dataType: "enum", required: true, note: "Vânzare / Închiriere / Renovare / Construire / Consum / Administrare" },
        { label: "Beneficiar (proprietar)", dataType: "text", required: true, note: "Nume PF sau denumire PJ" },
        { label: "Dată emitere", dataType: "date", required: true, note: "Auto-completată curentă" },
        { label: "Dată expirare", dataType: "date", required: true, note: "Auto-completată +10 ani de la emitere" },
        { label: "Cod cadastral", dataType: "text", required: false, note: "ANCPI verificare auto" },
        { label: "Anexa 1 (Date tehnice)", dataType: "auto-fill", required: true, note: "Din Pașii 1-5 — auditor verifică" },
        { label: "Anexa 2 (Recomandări)", dataType: "auto-fill", required: true, note: "Top 5 măsuri prioritate din Pas 7" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă CPE pe categorie",
      title: "Conținut variabil per categorie",
      branches: [
        {
          category: "RA (apartament bloc)",
          appliesTo: ["M1"],
          description: "Cod CPE pe nivel apartament. Anexa 1 + 2 specifică apartamentului. Bloc complet are CPE separat opțional pe asociație.",
        },
        {
          category: "RI/RC (rezidențial)",
          appliesTo: ["M2", "M5"],
          description: "Format standard Anexa 1+2 Ord. MDLPA 16/2023. AE IIci poate emite. Scop: vânzare/închiriere tipic.",
        },
        {
          category: "BI/ED (nerezidențial)",
          appliesTo: ["M3", "M4"],
          description: "Format extins cu Anexa 3 — BACS, SRI, MEPS. DOAR AE Ici poate emite. Necesită Raport nZEB pentru clădiri noi.",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Cadrul legal CPE",
      refs: [REFS.legea_372, REFS.legea_372_art13, REFS.mc001, REFS.ord_16_2023, REFS.ord_348, REFS.ord_348_art6, REFS.epbd_art17, REFS.iso_19005, REFS.etsi_319_142],
      quote: "Auditorul energetic atestat răspunde pentru exactitatea datelor și aplicabilitatea metodologiei. CPE emis cu grad inferior celui legal (ex: AE IIci pentru BI) este nul de drept.",
      quoteSource: "Ord. MDLPA 348/2026 Art. 6 alin. 4",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni CPE",
      terms: [GLOSSARY.CPE, GLOSSARY.AE_Ici, GLOSSARY.AE_IIci, GLOSSARY.PAdES, GLOSSARY.PDFA3],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli emitere CPE",
      items: [
        {
          title: "AE IIci emite CPE pentru birouri (BI)",
          body: "Art. 6 alin. 2 Ord. 348/2026 — AE IIci competent DOAR rezidențial (Anexa 1+2). CPE pentru BI emis de IIci = nul de drept + sancțiune profesională.",
          fix: "Verifică categoria în Pas 1 vs grad atestat. Zephren blochează auto dacă incompatibilitate.",
        },
        {
          title: "PDF fără PAdES B-LT (doar imagine semnătură)",
          body: "PDF cu doar imagine semnătură = doar semnătură olografă scanată. NU semnătură electronică validă juridic. EPBD 2024 + Ord. 348/2026 cer PAdES min B-T.",
          fix: "Plan Zephren cu cont QTSP RO. Pentru free/AE IIci basic — banner warning 'semnătură olografă, fără valoare PAdES'.",
        },
        {
          title: "Anexa 2 fără măsuri obligatorii",
          body: "CPE fără Anexa 2 Recomandări = neconform. Auditorul TREBUIE să listeze min 3 măsuri prioritare cu cost estimat.",
          fix: "Zephren auto-fill Anexa 2 din Pas 7. Verifică să existe min 3 măsuri afișate.",
        },
        {
          title: "Cod cadastral neverificat ANCPI",
          body: "CF nr. greșit sau cadastral inexistent → respingere CPE la audit MDLPA.",
          fix: "Pas 6 — buton 'Verifică ANCPI'. Validare online (necesită cont ANCPI ePay sau Zephren API).",
        },
        {
          title: "QR Code lipsă",
          body: "Mc 001-2022 §6.5 — QR Code obligatoriu pe CPE. Permite verificarea autenticității + linkul către instanța read-only.",
          fix: "Auto-generat de Zephren. Link unic per CPE + valabilitate publică nelimitată (chiar după 10 ani expirare).",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Datele CPE — destinație finală",
      flows: [
        { from: "CPE PDF/A-3", to: "Dosar audit", description: "Arhivare client 10+ ani" },
        { from: "Cod CPE", to: "Registru MDLPA portal", description: "8.VII.2026+" },
        { from: "QR Code", to: "URL public verificare", description: "Validare autenticitate" },
        { from: "Anexa 1+2", to: "ANCPI înregistrare imobiliară", description: "Adăugare la dosarul de carte funciară" },
        { from: "Cost estimat", to: "Anunț vânzare/închiriere", description: "Obligatoriu menționat conform Art. 13" },
      ],
    },

    {
      id: "what-if-class",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Impact clasă energetică asupra valorii imobil",
      body: "Studii UE 2023 (DG Energy) arată că diferența clasă energetică afectează prețul vânzare. Glisează clasa demo.",
      parameter: "class_idx",
      paramLabel: "Clasă energetică",
      paramUnit: "(A+=0, G=7)",
      min: 0,
      max: 7,
      step: 1,
      defaultValue: 5,
      formula: ({ value }) => {
        // Premium % vs clasa medie D (=3): A+ +28%, A +18%, B +10%, C +5%, D 0%, E -10%, F -20%, G -30%
        const premiums = [28, 18, 10, 5, 0, -10, -20, -30];
        const premium = premiums[Math.round(value)] || 0;
        const price_base = 100000; // EUR pentru casă tipică 100m²
        const price_adjusted = price_base * (1 + premium / 100);
        return { output: price_adjusted, unit: "EUR", label: "Valoare estimată", decimals: 0 };
      },
      baseline: { value: 3, output: 100000, label: "Clasă D = 100.000 EUR baseline" },
      presets: [
        { label: "A+ (ZEB)", value: 0 },
        { label: "B (nZEB)", value: 2 },
        { label: "D (mediu)", value: 3 },
        { label: "F (vechi)", value: 5 },
        { label: "G (foarte slab)", value: 7 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Zephren pre-emitere",
      items: [
        "<b>Date auditor complete</b> — toate 10 câmpuri obligatorii.",
        "<b>Atestat valid</b> — Pas 6 verifică din portalul MDLPA (8.VII.2026+).",
        "<b>Grad atestat vs categorie</b> — IIci pentru BI = blocaj.",
        "<b>Cod cadastral ANCPI</b> — verificare online (warning dacă nu match CF).",
        "<b>Anexa 2 min 3 măsuri</b> — blocaj dacă <3.",
        "<b>Cod CPE unic</b> — verificare anti-duplicat în Registru.",
        "<b>QR Code generat</b> auto + URL valid.",
        "<b>CO₂ + GWP completate</b> — obligatorii EPBD 2024 Art. 17.",
        "<b>Semnătură PAdES B-LT</b> — banner dacă plan free (doar olografă).",
        "<b>Dată expirare</b> = emitere + 10 ani auto-calc.",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 6",
      items: [
        "Generare automată cod cadastral — necesită intrare manuală din CF.",
        "Înregistrare automată în Registru MDLPA — portalul disponibil 8.VII.2026, până atunci download manual + upload în portal.",
        "Verificare istoric anterior CPE pe același imobil — Zephren nu integrează cu Registru pentru a citi CPE-uri vechi.",
        "Format dual DOCX+PDF/A-3 — actualmente DOCX separat, PDF/A-3 separat. Planificare Sprint Conformitate dual format.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "CPE M2 emis pre-completat",
      values: [
        { label: "Cod CPE", value: "2026-CJ-G-0142", note: "Generat auto" },
        { label: "Scop", value: "Vânzare", note: "M2 demo" },
        { label: "Clasa", value: "G", note: "EP=976 kWh/m²a" },
        { label: "Valid", value: "10 ani", note: "Până 2036" },
        { label: "Beneficiar", value: "Ionescu Vasile", note: "Auto demo" },
        { label: "QR Code", value: "Generat", note: "Link unic public" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test Pas 6",
      questions: [
        {
          question: "Un auditor AE IIci primește solicitare pentru CPE birou (BI). Acțiunea corectă conform Ord. MDLPA 348/2026 este:",
          options: ["Emite CPE-ul, fiindcă birourile mici sunt incluse în RI", "Refuză legal — IIci doar rezidențial. Recomandă AE Ici", "Emite cu mențiune 'sub limite IIci' în Anexa 1", "Emite, apoi solicită aprobare AE Ici"],
          correct: 1,
          explanation: "Art. 6 alin. 2 Ord. 348/2026 — AE IIci competent DOAR rezidențial (Anexa 1+2). BI = nerezidențial → necesită AE Ici. Refuzul + recomandare colaborare = profesional corect.",
        },
        {
          question: "PDF/A-3 cu PAdES B-LT este preferat pentru CPE oficial deoarece:",
          options: ["Este mai compact (mai puține KB)", "Permite validare semnătură pe lung termen + arhivare 10+ ani conform ISO 19005-3", "Se poate edita după semnare", "Este obligatoriu doar pentru CPE birouri"],
          correct: 1,
          explanation: "PDF/A-3 + PAdES B-LT include DSS dictionary (Document Security Store) cu certificate chain + OCSP — permite validare semnătură chiar și după 10+ ani când serverul CA original poate fi indisponibil. Critic pentru arhivare lung termen.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum gestionezi tranziția grade 2026 corect",
      body: "Din 8.VII.2026 Ord. MDLPA 348/2026 activează grade noi Ici/IIci. Tranziție: 1) Auditori existenți grad I/II = automap la AE Ici/IIci. 2) Atestate emise pe Ord. 2237/2010 rămân valide până expirare. 3) Pentru CPE-uri emise în tranziție (14.IV → 11.X.2026), Zephren afișează banner explicativ + permite emitere cu grad legacy. 4) Update profil auditor în Pas 6 cu noul ordin = automatic. 5) Cont MDLPA portal (8.VII.2026) — păstrează login pentru verificări automate.",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Schimbări legislative CPE 2024-2026",
      changes: [
        {
          period: "Apr 2024",
          title: "L.238/2024 — Transpunere EPBD IV",
          body: "Modificare L.372/2005: CPE obligatoriu dare în administrare publică. CO₂eq obligatoriu. Format Anexa actualizat.",
          refs: [REFS.legea_372],
        },
        {
          period: "14.IV.2026",
          title: "Ord. MDLPA 348/2026 publicat",
          body: "Tranziție grade I/II → Ici/IIci. Sample portal MDLPA. Aplicabil 8.VII.2026.",
          refs: [REFS.ord_348],
        },
        {
          period: "8.VII.2026",
          title: "Portal MDLPA atestare activ",
          body: "Verificare online atestate. Registru CPE accesibil public. Upload CPE direct din Zephren.",
          refs: [REFS.ord_348],
        },
        {
          period: "29.V.2026",
          title: "Pașaport Renovare obligatoriu EPBD",
          body: "EPBD 2024 Art. 12 — pașaport renovare obligatoriu pentru clădiri >250 m² la vânzare. Zephren oferă opțional în Pas 7.",
          refs: [REFS.epbd_art17],
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Situații atipice emitere CPE",
      cases: [
        {
          title: "🏛️ Clădire monument — derogări nZEB",
          body: "Mc 001 §6.6 — clădiri monument istoric pot deroga de la cerințe nZEB. CPE menționează 'derogare istorica' + nr. aviz Direcția Cultură. Recomandări Anexa 2 limitate la măsuri compatibile.",
        },
        {
          title: "🏘️ CPE pe asociație bloc (toate apartamentele)",
          body: "Asociația cere CPE pe întreg bloc — RC complet. Anexa 1+2 pe nivel bloc. Apartamentele individuale pot avea CPE separate cu mențiune 'asociație CPE existent: cod XXX'.",
        },
        {
          title: "🏗️ Clădire în construcție (CPE provizoriu)",
          body: "Pentru clădiri în construcție, CPE = estimat conform proiect. Final CPE = la finalizare cu măsurători reale. Scop = 'construire' + 'estimat proiect' menționat în Anexa 1.",
        },
        {
          title: "🌪️ Clădire avariată (cutremur, incendiu)",
          body: "Anvelopa compromisă → CPE = curent stare degradată. Anexa 2 = măsuri reconstrucție prioritar (nu doar eficiență). Atașament: raport expert tehnic structural.",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export multi-format",
      title: "Cele 3 formate CPE",
      outputs: [
        { icon: "📜", format: "PDF/A-3 + PAdES B-LT", description: "Format oficial arhivare lung termen + semnătură electronică validă juridic UE.", planRequired: "AE Ici 1.499 RON+" },
        { icon: "📝", format: "DOCX editabil", description: "Template Mc 001 editable in Word. Pentru draft / revizuire client.", planRequired: "AE IIci 599 RON+" },
        { icon: "📊", format: "XML MDLPA v2.1", description: "Format Registru oficial. Upload portal MDLPA atestare.", planRequired: "Expert 2.999 RON+" },
        { icon: "🌐", format: "Link public + QR Code", description: "URL read-only pentru proprietar/cumpărător. Verificare autenticitate.", planRequired: "Toate (gratuit)" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări emitere CPE",
      items: [
        { q: "Pot edita un CPE după semnare PAdES?", a: "NU. Editarea invalidează semnătura digitală. Pentru corecturi: emite un CPE nou cu mențiune 'corecție CPE XXX/dd.mm.yyyy'. Vechiul rămâne valid în Registru ca istoric." },
        { q: "Câte CPE-uri pot avea același imobil?", a: "Doar UNUL curent valid per scop (vânzare, închiriere etc.). Schimbarea destinației sau renovare majoră = CPE nou. Vechiul devine 'istoric' în Registru." },
        { q: "Ce se întâmplă cu CPE-urile emise pre-2026 după Ord. 348?", a: "Rămân valide până la data expirării (10 ani de la emitere). Auditorii cu grad I/II vechi se mapează automat la Ici/IIci în portal." },
        { q: "Imobil cu mai multe apartamente — câte CPE-uri?", a: "Depinde scop. Pentru vânzare individuală apt: CPE per apartament. Pentru asociație cerere finanțare reabilitare: CPE pe bloc. Pentru CPE complet bloc — categoria RC, AE Ici." },
        { q: "Costul CPE plătit cui?", a: "Auditorul emite CPE-ul. Plata: tarif liber negociat (tipic 500-2.000 RON RI, 1.500-5.000 RON BI/ED). Zephren NU stabilește tarif client — doar facilitează emiterea." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 6",
      links: [
        { title: "Portal MDLPA Atestare (8.VII.2026)", url: "https://atestare.mdlpa.ro", description: "Verificare atestate + Registru CPE" },
        { title: "certSIGN — QTSP RO", url: "https://www.certsign.ro", description: "Cont B2B pentru PAdES B-LT" },
        { title: "DigiSign — QTSP RO", url: "https://www.digisign.ro", description: "Alternativă certSIGN" },
        { title: "ANCPI ePay", url: "https://epay.ancpi.ro", description: "Verificare CF + cadastral online" },
        { title: "EUR-Lex L.372/2005", url: "https://legislatie.just.ro", description: "Text oficial Legea CPE" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 7",
      title: "Ce am acoperit Pas 6",
      bullets: [
        "<b>CPE</b> obligatoriu vânzare/închiriere/dare administrare. Valid 10 ani.",
        "<b>Grade auditor</b> Ord. 348/2026: AE Ici (toate) vs AE IIci (doar rezidențial).",
        "<b>PDF/A-3 + PAdES B-LT</b> pentru valoare juridică UE — necesită QTSP RO.",
        "<b>Anexa 1 + 2</b> obligatorii. Anexa 2 min 3 măsuri.",
        "<b>QR Code public</b> pentru verificare autenticitate.",
        "<b>Cost CPE</b> tarif liber 500-5.000 RON dependent categorie.",
      ],
      nextStep: "Pasul 7 — Audit energetic: scenarii reabilitare detaliate, analiza NPV/IRR, cost-optimum, pașaport renovare EPBD, finanțare Casa Verde + PNRR.",
    },
  ],
};
