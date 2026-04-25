/**
 * FAQ + Best Practices pentru auditori energetici (Sprint B Task 5)
 *
 * 20 întrebări frecvente categorizate, cu răspunsuri scurte (max 4-5 propoziții)
 * + linkuri rapide la tab-urile Step 8 / normativele relevante.
 */

export const FAQ_CATEGORIES = {
  anvelopa:    { label: "Anvelopă termică",         icon: "🧱" },
  instalatii:  { label: "Sisteme HVAC + ACM",       icon: "♨️" },
  regenerab:   { label: "Regenerabile (PV/solar)",  icon: "☀️" },
  normative:   { label: "Normative + conformitate", icon: "📋" },
  cpe_audit:   { label: "CPE + raport audit",       icon: "📑" },
  business:    { label: "Cabinet auditor",          icon: "💼" },
};

export const FAQ_ENTRIES = [
  // ═══════════════════════════════════════════════════════════════
  // ANVELOPĂ
  // ═══════════════════════════════════════════════════════════════
  {
    id: "n50-default",
    category: "anvelopa",
    question: "Ce valoare n50 introduc dacă nu am test Blower Door?",
    answer:
      "Conform Mc 001-2022 Anexa C și EN 12831-1:2017 Anexa H:\n" +
      "  • Clădire nouă (post-2010, izolație continuă): 1.5–3.0 h⁻¹\n" +
      "  • Clădire reabilitată (anvelopă 2003-2010): 3.0–5.0 h⁻¹\n" +
      "  • Clădire neizolată / panou prefabricat: 6.0–10.0 h⁻¹\n" +
      "  • Pasivhaus / nZEB: ≤ 0.6 h⁻¹\n" +
      "Pentru valoare exactă recomandăm test Blower Door (~600-1500 RON). " +
      "Când nu există test, justificați în raport metoda de estimare.",
    relatedTabs: ["infiltratii"],
    relatedNormatives: ["mc001-2022", "en-12831"],
  },
  {
    id: "u-max-renovare",
    category: "anvelopa",
    question: "Ce U_max trebuie să respect la renovare majoră (>25% anvelopă)?",
    answer:
      "Conform C107/2-2005 Tabel 2.5 (modif. Mc 001-2022):\n" +
      "  • Pereți exteriori (PE): 0.30 W/(m²K) — rezid. / 0.25 — non-rez.\n" +
      "  • Acoperiș terasă (PT): 0.20 — rezid. / 0.18 — non-rez.\n" +
      "  • Planșeu peste sol (PB): 0.30\n" +
      "  • Tâmplărie: 1.30 — rezid. / 1.10 — non-rez.\n" +
      "Renovarea majoră se definește prin >25% suprafață anvelopă atinsă (L. 372/2005 Art. 6).",
    relatedTabs: ["verificare_U"],
    relatedNormatives: ["c107-2005", "lege-372-2005"],
  },
  {
    id: "psi-punte-termica",
    category: "anvelopa",
    question: "De unde iau ψ pentru o punte termică nestandard?",
    answer:
      "Trei opțiuni, în ordinea preferinței:\n" +
      "  1. Catalog C107/3-2005 + ISO 14683:2017 — 165 tipologii standard\n" +
      "  2. Calcul 2D cu THERM/Antherm/Heat — pentru detalii noi/atipice\n" +
      "  3. Tab „Punți termice ψ\" Zephren calculează ψ_dynamic interpolat liniar " +
      "între ψ_neizolat și ψ_izolat funcție de R-ul izolației efective adiacente.\n" +
      "Pentru audit oficial: ψ_default + corecție ψ_dynamic acceptat de MDLPA.",
    relatedTabs: ["tb_dinamic"],
    relatedNormatives: ["c107-2005", "iso-14683"],
  },
  {
    id: "condens-glaser",
    category: "anvelopa",
    question: "Cum interpretez rezultatul Glaser când există condens?",
    answer:
      "Conform NP 057-02 + ISO 13788:2012, condensul de iarnă e ACCEPTABIL dacă:\n" +
      "  • se evaporă complet în sezonul cald (verifică rândul „Cumulat\" la sfârșitul anului)\n" +
      "  • acumularea max < 200 g/m² (per tipologie material)\n" +
      "  • nu se acumulează în straturi sensibile (vată minerală fără barieră vapori)\n" +
      "Tab Glaser Zephren afișează verdict automat. Dacă „Acumulare reziduală\", " +
      "soluții: barieră vapori sub izolație + ventilare suplimentară.",
    relatedTabs: ["glaser"],
    relatedNormatives: ["iso-13788"],
  },

  // ═══════════════════════════════════════════════════════════════
  // INSTALAȚII
  // ═══════════════════════════════════════════════════════════════
  {
    id: "scop-pompa",
    category: "instalatii",
    question: "Ce SCOP minim acceptat pentru pompă căldură în CPE?",
    answer:
      "Conform Mc 001-2022 §5 + EN 14825:2022:\n" +
      "  • Aer-Apă (A/W) standard: SCOP ≥ 3.5\n" +
      "  • Aer-Apă High-Temp (W65): SCOP ≥ 3.0\n" +
      "  • Sol-Apă (G/W) sonde: SCOP ≥ 4.5\n" +
      "  • Apă-Apă (W/W) freatic: SCOP ≥ 5.0\n" +
      "Tab „Pompă căldură\" calculează SCOP real pe date climatice locale " +
      "(EN 14825:2022). Sub aceste valori, în CPE se folosește SCOP_real, NU cel nominal de catalog.",
    relatedTabs: ["pompa", "sonde_geo"],
    relatedNormatives: ["mc001-2022", "en-15316"],
  },
  {
    id: "sri-obligatoriu",
    category: "instalatii",
    question: "Când e obligatoriu SRI?",
    answer:
      "Conform EPBD 2024/1275 Art. 15 (transpus L. 238/2024):\n" +
      "  • OBLIGATORIU începând cu 2027 pentru clădiri non-rezidențiale > 290 kW HVAC nominal\n" +
      "  • OPȚIONAL pentru rezidențial (recomandat pentru blocuri > 50 apt)\n" +
      "  • Calculul: Reg. UE 2020/2155 + 2020/2156 (54 servicii inteligente, 8 domenii)\n" +
      "Tab „SRI Indicator\" Zephren mapează automat din BAC + HVAC + Iluminat și " +
      "afișează scorul (0-100) + clasa A-E.",
    relatedTabs: ["sri", "bacs"],
    relatedNormatives: ["epbd-2024", "iso-52120"],
  },
  {
    id: "bacs-clasa",
    category: "instalatii",
    question: "Ce clasă BACS să recomand pentru o clădire de birouri?",
    answer:
      "EPBD 2024 impune minimum clasa B pentru clădiri noi non-rezidențiale > 290 kW. Recomandare practică:\n" +
      "  • Clasa A (BMS predictiv + AI): ROI 5-7 ani, economie 25-40%\n" +
      "  • Clasa B (control avansat, setpoint adaptiv): ROI 3-5 ani, economie 10-25%\n" +
      "  • Clasa C (referință, termostat programabil): minim acceptat\n" +
      "  • Clasa D (manual): NEACCEPTAT pentru clădiri noi din 2025\n" +
      "Tab „BACS\" calculează economia per clasă pe categoria specifică.",
    relatedTabs: ["bacs"],
    relatedNormatives: ["iso-52120", "epbd-2024"],
  },
  {
    id: "vmc-hr-eta",
    category: "instalatii",
    question: "Ce randament HR (η_recuperare) realist pentru VMC retro într-un bloc?",
    answer:
      "Conform EN 308 + măsurători reale:\n" +
      "  • VMC nou (post-2020) certificat Eurovent: η = 75-90%\n" +
      "  • VMC standard pre-2015: η = 60-75%\n" +
      "  • Sistem entalpic (recuperare căldură + umiditate): +10-15% suplimentar\n" +
      "Pierderi reale (by-pass, infiltrații, dezechilibru flux) reduc η cu 5-15%. " +
      "În CPE folosim η_seasonally_adjusted = η_nominal × 0.85. Pentru retro într-un bloc " +
      "cu canale existente, η realist 50-65% după corecție.",
    relatedTabs: ["vmc_hr"],
    relatedNormatives: ["en-16798"],
  },

  // ═══════════════════════════════════════════════════════════════
  // REGENERABILE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "rer-onsite-min",
    category: "regenerab",
    question: "Ce înseamnă „RER on-site minim 10%\" din L. 238/2024?",
    answer:
      "Pentru clădiri rezidențiale noi, minim 10% din energia primară totală trebuie " +
      "produsă on-site din surse regenerabile. Surse acceptate:\n" +
      "  • PV pe acoperiș (kWp × producție specifică zonă × f_p_el)\n" +
      "  • Solar termic ACM (m² × randament × radiație)\n" +
      "  • Pompă căldură (cota „regenerabilă\" = 1 - 1/SCOP, conform Dir. RED III)\n" +
      "  • Biomasă (lemn certificat sustenabil)\n" +
      "Verificare automată în tab „nZEB\". Sub 10% → non-conform pentru autorizație.",
    relatedTabs: ["nzeb_check", "gp123", "solar_acm"],
    relatedNormatives: ["lege-238-2024", "mc001-2022"],
  },
  {
    id: "pv-tilt-azimut",
    category: "regenerab",
    question: "Ce tilt și azimut sunt acceptabile pentru PV în RO?",
    answer:
      "Conform GP 123/2004 + atlas solar PVGIS:\n" +
      "  • Tilt OPTIM: 30-40° (latitudine 44-48° RO)\n" +
      "  • Tilt acceptabil: 10-60°\n" +
      "  • Azimut OPTIM: S (180°)\n" +
      "  • Acceptabil: SE/SV (135°-225°), penalitate -3-5%\n" +
      "  • Marginal: E/V (90°/270°), penalitate -15-20%\n" +
      "  • Inacceptabil: N (penalitate -50%)\n" +
      "Tab GP 123 + import PVGIS calculează factori de corecție automat.",
    relatedTabs: ["gp123"],
    relatedNormatives: ["gp-123-2004"],
  },
  {
    id: "solar-fractie",
    category: "regenerab",
    question: "Ce fracție solară (f_sol) realistă pentru ACM în casă unifamilială?",
    answer:
      "Conform EN ISO 9806:2017 + practică RO:\n" +
      "  • Plan selectiv 4-6 m² + boiler 200-300 L: f_sol_anual = 50-65%\n" +
      "  • Tuburi vidate 3-4 m²: f_sol = 55-70% (mai bun iarna)\n" +
      "  • Sub-dimensionat (2-3 m² pt 4 pers): f_sol = 30-40%\n" +
      "  • Supra-dimensionat (>8 m² fără consum mare): risc stagnare vară, f_sol util scade\n" +
      "Tab „Solar termic\" calculează lunar și recomandă vas + fluid.",
    relatedTabs: ["solar_acm"],
    relatedNormatives: [],
  },

  // ═══════════════════════════════════════════════════════════════
  // NORMATIVE + CONFORMITATE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "diff-mc001-mc006",
    category: "normative",
    question: "Care e diferența esențială Mc 001-2006 vs Mc 001-2022?",
    answer:
      "Mc 001-2022 (în vigoare din ian. 2023):\n" +
      "  • Aliniat cu standardele EN ISO 13790, ISO 52016, EN 12831:2017\n" +
      "  • Praguri nZEB obligatorii (pre-2022 era voluntar)\n" +
      "  • Anexa A.10 nouă scară clase A+/A/B/C/D/E/F/G\n" +
      "  • Anexa K factori orientativi consum specific\n" +
      "  • Coeficienți de penalizare actualizați (Anexa A.11)\n" +
      "  • Metodologie LENI iluminat (EN 15193-1) integrată\n" +
      "  • Calcul punți termice ψ_dynamic (cu izolație) — opțional dar recomandat\n" +
      "CPE-uri emise pre-2023 rămân valabile până la expirare (10 ani).",
    relatedTabs: ["nzeb_check", "verificare_U"],
    relatedNormatives: ["mc001-2022"],
  },
  {
    id: "valabilitate-cpe",
    category: "normative",
    question: "Câți ani e valabil un CPE după Legea 238/2024?",
    answer:
      "Diferențiat pe clasă energetică:\n" +
      "  • Clase A+ / A / B / C: 10 ani (neschimbat)\n" +
      "  • Clase D / E / F / G: 5 ani (NOU în L. 238/2024)\n" +
      "Tracker CPE Zephren aplică automat această regulă. CPE emise înainte de " +
      "intrarea în vigoare a L. 238/2024 (29 mai 2026) păstrează valabilitatea de 10 ani indiferent de clasă.",
    relatedTabs: ["cpe_tracker"],
    relatedNormatives: ["lege-238-2024"],
  },
  {
    id: "meps-2030",
    category: "normative",
    question: "Ce sunt MEPS 2030/2033 și pe cine afectează?",
    answer:
      "MEPS = Minimum Energy Performance Standards (EPBD 2024 Art. 9):\n" +
      "  • 2030: clădirile non-rezidențiale cele mai energointensive 16% trebuie să atingă clasă ≥ E\n" +
      "  • 2033: cele mai energointensive 26% (cumulativ) trebuie să atingă clasă ≥ D\n" +
      "  • Pentru rezidențial: traiectorie -16% consum primar mediu (2030) și -20-22% (2035)\n" +
      "Practic: clădirile clasa F-G NU mai pot fi închiriate / vândute fără reabilitare după 2030. " +
      "Tab MEPS Zephren calculează status + roadmap recomandat.",
    relatedTabs: ["meps", "rehab"],
    relatedNormatives: ["epbd-2024", "lege-238-2024"],
  },
  {
    id: "rer-vs-rer-onsite",
    category: "normative",
    question: "Ce diferență e între RER total și RER on-site?",
    answer:
      "RER total (~RER global): include toate sursele regenerabile, INCLUSIV cele " +
      "din rețea (curent verde garantat). Calculat cu f_p_ren al combustibilului.\n" +
      "RER on-site (RER local): doar surse generate la fața locului — PV pe acoperiș, " +
      "solar termic, pompă căldură (cota regenerabilă). NU include energia verde din rețea.\n" +
      "L. 238/2024 impune RER on-site ≥ 10% pentru clădiri rezidențiale noi (specific cota locală).",
    relatedTabs: ["nzeb_check"],
    relatedNormatives: ["lege-238-2024"],
  },

  // ═══════════════════════════════════════════════════════════════
  // CPE + RAPORT AUDIT
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cpe-vs-audit",
    category: "cpe_audit",
    question: "Care e diferența între CPE și raport audit energetic?",
    answer:
      "CPE (Certificat) — document scurt (1 pagină + anexe):\n" +
      "  • Notă energetică (clasă A-G), EP total, RER%, CO₂\n" +
      "  • Recomandări sumar (3-5 măsuri principale)\n" +
      "  • Valabil 5 sau 10 ani (L. 238/2024)\n" +
      "Raport audit — document amplu (20-50 pagini):\n" +
      "  • Toate calculele detaliate Mc 001-2022\n" +
      "  • Pachete reabilitare cu NPV/LCC/payback\n" +
      "  • Capitole 4-8 conform Mc 001-2022 P.IV\n" +
      "Auditul e obligatoriu pentru: cofinanțare PNRR/AFM, refacere clădiri publice, recepție clădire nouă.",
    relatedTabs: ["raport_audit", "cpe_tracker"],
    relatedNormatives: ["mc001-2022", "lege-372-2005"],
  },
  {
    id: "anexa-1-2-format",
    category: "cpe_audit",
    question: "Cum completez corect Anexa 1 și Anexa 2 MDLPA?",
    answer:
      "Anexele 1 (fișă identificare) și 2 (raport audit) sunt obligatorii — Ord. MDLPA 2641/2022:\n" +
      "  • Anexa 1: 12 secțiuni — date clădire, climat, anvelopă, instalații, EP, clasă, recomandări\n" +
      "  • Anexa 2: tabele T1-T18 cu calculele detaliate per metodă\n" +
      "  • Format A4 portret obligatoriu\n" +
      "  • Semnătură + ștampilă auditor pe ultima pagină\n" +
      "Zephren generează automat ambele anexe din state-ul curent al proiectului. " +
      "Tab „Raport audit\" → Export DOCX/PDF.",
    relatedTabs: ["raport_audit"],
    relatedNormatives: ["mc001-2022", "ord-mdlpa-16-2023"],
  },
  {
    id: "registru-mdlpa",
    category: "cpe_audit",
    question: "Cum se depune CPE în Registrul național MDLPA?",
    answer:
      "Stadiul actual (apr 2026): registrul digital MDLPA este în implementare, " +
      "API public NU e încă disponibil. Procedura curentă:\n" +
      "  1. Generez XML CPE (tab MDLPA Registru — sub-tab Export XML)\n" +
      "  2. Arhivez local + predau clientului în PDF\n" +
      "  3. La cerere MDLPA depune fizic la inspectoratul teritorial\n" +
      "Când API devine public (estimat T3 2026), Zephren va transmite automat. " +
      "Verificați tab MDLPA pentru status conexiune.",
    relatedTabs: ["mdlpa"],
    relatedNormatives: ["lege-372-2005"],
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSINESS / CABINET
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tarif-audit",
    category: "business",
    question: "Ce tarif standard de audit energetic în RO (2026)?",
    answer:
      "Tarife orientative piață RO (apr 2026):\n" +
      "  • Casă unifamilială < 200 m²: 800-1.500 RON\n" +
      "  • Bloc apartament: 200-400 RON / apt + 500-800 RON parte comună\n" +
      "  • Birouri / comercial < 1000 m²: 2.500-4.500 RON\n" +
      "  • Spital / școală: 5.000-15.000 RON funcție de complexitate\n" +
      "Audit + CPE împreună: cost +30% peste CPE simplu. Pentru cofinanțare " +
      "PNRR/AFM tariful e reglementat (max 1% din valoarea investiției).\n" +
      "Tab „Deviz servicii\" Zephren generează propunere automată.",
    relatedTabs: ["facturare", "contract"],
    relatedNormatives: [],
  },
  {
    id: "e-factura-anaf",
    category: "business",
    question: "E obligatorie e-Factura ANAF pentru auditori energetici?",
    answer:
      "DA, începând cu 1 iulie 2024 (OUG 70/2024):\n" +
      "  • B2B (cabinet auditor → client persoană juridică): obligatoriu RO e-Factura SAF-T\n" +
      "  • B2C (client persoană fizică): NU obligatoriu, dar recomandat\n" +
      "  • Format: XML UBL 2.1 (RO-CIUS) trimis în SPV ANAF\n" +
      "  • Termen: 5 zile lucrătoare de la emiterea facturii\n" +
      "Tab „e-Factură ANAF\" Zephren generează XML conform RO-CIUS, " +
      "transmiterea în SPV o face contabilul/SmartBill/Saga.",
    relatedTabs: ["efactura"],
    relatedNormatives: [],
  },
];

/** Caută în FAQ după query (full-text). */
export function searchFAQ(query, category) {
  const q = (query || "").trim().toLowerCase();
  return FAQ_ENTRIES.filter(f => {
    if (category && category !== "all" && f.category !== category) return false;
    if (!q) return true;
    return (
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q)
    );
  });
}
