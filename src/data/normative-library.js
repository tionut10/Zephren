/**
 * Bibliotecă normative Zephren (Sprint B Task 4)
 *
 * Structură:
 *   - Normative cu drepturi libere (RO/UE) → conținut INTEGRAL (excerpts paragrafe cheie)
 *   - Normative ASRO / EN cu drepturi închise → linkuri externe + metadate
 *
 * Categorii: foundational (Mc 001-2022, EPBD), regulation (HG, Legi, OG, OUG),
 *            standard_en (SR EN ISO/EN), standard_ro (C107, NP, GP), guideline (Ord.)
 */

export const NORMATIVE_TYPES = {
  free:        { label: "Acces liber", color: "#22c55e", icon: "🆓" },
  asro:        { label: "ASRO (plătit)", color: "#eab308", icon: "💰" },
  eu:          { label: "UE (acces liber via EUR-Lex)", color: "#3b82f6", icon: "🇪🇺" },
  rebuild:     { label: "MDLPA (acces liber)", color: "#22c55e", icon: "🇷🇴" },
};

export const NORMATIVE_CATEGORIES = {
  foundational: { label: "Metodologii fundamentale",  icon: "📜" },
  regulation:   { label: "Legislație (Legi/HG/OG)",   icon: "⚖️" },
  standard_en:  { label: "Standarde SR EN ISO / EN",  icon: "🌍" },
  standard_ro:  { label: "Normative tehnice RO",      icon: "🇷🇴" },
  guideline:    { label: "Ordine MDLPA / ANRE",       icon: "📋" },
};

export const NORMATIVES = [
  // ═══════════════════════════════════════════════════════════════
  // METODOLOGII FUNDAMENTALE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "mc001-2022",
    code: "Mc 001-2022",
    title: "Metodologie de calcul al performanței energetice a clădirilor",
    year: 2022,
    issuer: "MDLPA — Ord. 2641/2022 (cu modificările prin Ord. 16/2023)",
    category: "foundational",
    type: "rebuild",
    externalUrl: "https://www.mdlpa.ro/pages/m_si_p_constructii_termice",
    relatedTabs: ["nzeb_check", "verificare_U", "tb_dinamic", "glaser", "en12831", "racire_orara"],
    summary:
      "Metodologia oficială pentru calcul EP al clădirilor în România. Aliniată cu SR EN ISO 13790, ISO 52016-1, EN 12831, EN 15193, EN 15316. Înlocuiește Mc 001-2006.",
    keySections: [
      { id: "p1", title: "Partea I — Anvelopa clădirii", excerpt:
        "Calculul rezistenței termice unidimensionale R, transmitanței U, factorul punților termice ψ. " +
        "Anexa A: U_max admis per element și categorie. Anexa B: catalog 165 punți termice cu ψ neizolat/izolat. " +
        "Anexa C: factor de difuzie vapori. Pasul 2 din Zephren operează la acest nivel."
      },
      { id: "p2", title: "Partea a II-a — Performanța energetică", excerpt:
        "Calcul nevoi energetice anuale Q_nd cu metoda lunară cvasi-statică (EN ISO 13790 §7). " +
        "Indici: Q_H_nd (încălzire), Q_C_nd (răcire), Q_w (apă caldă), Q_l (iluminat), Q_v (ventilare). " +
        "Anexa D: parametri zone climatice I-V. Anexa K: consum specific orientativ pe categorii."
      },
      { id: "p3", title: "Partea a III-a — Auditul energetic", excerpt:
        "Etape audit: documentare, măsurători, calcul EP, propuneri reabilitare, evaluare TIR/NPV. " +
        "Cap. 4: conformitate cu C107. Cap. 7: concluzii și plan de măsuri. " +
        "Cap. 8: anexe obligatorii (Anexa 1 fișă identificare + Anexa 2 raport)."
      },
      { id: "p4", title: "Partea a IV-a — Certificatul de Performanță Energetică", excerpt:
        "Format CPE conform Ord. MDLPA 16/2023 (modificare Ord. 2641/2022). " +
        "Clase A+ … G calculate prin scara Anexa A.10. Valabilitate: 10 ani A-C, 5 ani D-G (L. 238/2024)."
      },
    ],
  },
  {
    id: "epbd-2024",
    code: "Directiva (UE) 2024/1275",
    title: "Eficiența energetică a clădirilor (EPBD recast 2024)",
    year: 2024,
    issuer: "Parlamentul European și Consiliul UE",
    category: "regulation",
    type: "eu",
    externalUrl: "https://eur-lex.europa.eu/eli/dir/2024/1275/oj",
    relatedTabs: ["meps", "sri", "bacs", "nzeb_check", "gwp_co2"],
    summary:
      "Reformare a EPBD 2010/31/UE și 2018/844/UE. Stabilește MEPS 2030/2033, ZEB obligatoriu pentru clădiri noi din 2030, registru CPE digital, jurnal digital al clădirii.",
    keySections: [
      { id: "art9", title: "Art. 9 — Standarde minime de performanță (MEPS)", excerpt:
        "Statele membre asigură că până la 2030 clădirile non-rezidențiale ating clasă energetică ≥E " +
        "(retro: cele 16% cele mai energointensive); până la 2033 ≥D (cele 26% cele mai energointensive). " +
        "Pentru rezidențial, traiectorie similară cu reducere consum mediu primar -16% (2030) și -20-22% (2035)."
      },
      { id: "art13", title: "Art. 13 — Performanță sisteme tehnice", excerpt:
        "Sistemele HVAC noi sau înlocuite trebuie să aibă control automat optim al setpoint, programare orară, " +
        "monitorizare consum. Clădirile non-rezidențiale cu putere HVAC > 290 kW trebuie să aibă BAC clasa B (ISO 52120-1)."
      },
      { id: "art15", title: "Art. 15 — SRI (Smart Readiness Indicator)", excerpt:
        "Obligatoriu calcul SRI pentru clădiri non-rezidențiale > 290 kW HVAC din 2027. " +
        "Metodologia: Reg. UE 2020/2155 + 2020/2156. Clase A (>80%) … E (<20%). " +
        "Zephren calculează SRI cu mapare automată din BAC/HVAC/IluminantCriterion."
      },
      { id: "art17", title: "Art. 17 — Certificate de performanță energetică", excerpt:
        "CPE digitalizat, integrat în registru național (RO: MDLPA). Valabilitate maximă 10 ani. " +
        "Trebuie să includă: clasă energetică, recomandări de reabilitare, fond renovare estimat, jurnal digital al clădirii."
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEGISLAȚIE RO
  // ═══════════════════════════════════════════════════════════════
  {
    id: "lege-372-2005",
    code: "Legea 372/2005",
    title: "Legea performanței energetice a clădirilor",
    year: 2005,
    issuer: "Parlamentul României (republicată 2020, modif. L. 196/2020 + L. 238/2024)",
    category: "regulation",
    type: "rebuild",
    externalUrl: "https://legislatie.just.ro/Public/DetaliiDocument/68980",
    relatedTabs: ["cpe_tracker", "nzeb_check"],
    summary:
      "Legea-cadru pentru EPBD în România. Definește auditorul energetic atestat, CPE obligatoriu la vânzare/închiriere, fond clădiri publice cu CPE expus la intrare.",
    keySections: [
      { id: "art13", title: "Art. 13 — CPE obligatoriu", excerpt:
        "CPE este obligatoriu la: (a) construcție nouă (recepție); (b) vânzare/închiriere clădire existentă; " +
        "(c) reabilitare majoră; (d) clădiri publice peste 250 m² (obligație afișare la intrare)."
      },
      { id: "art20", title: "Art. 20 — Auditori atestați", excerpt:
        "Auditorul energetic e profesionist atestat de MDLPA în baza unei specializări specifice. " +
        "Lista actualizată: registrul auditorilor energetici publicat de MDLPA. " +
        "Atestat valabil 5 ani, reexamen periodic."
      },
    ],
  },
  {
    id: "lege-238-2024",
    code: "Legea 238/2024",
    title: "Modificări L. 372/2005 — implementare EPBD recast",
    year: 2024,
    issuer: "Parlamentul României (PL-x 379/2024)",
    category: "regulation",
    type: "rebuild",
    externalUrl: "https://legislatie.just.ro/Public/DetaliiDocument/279045",
    relatedTabs: ["nzeb_check", "cpe_tracker", "meps"],
    summary:
      "Transpune EPBD 2024/1275 în legislația RO. Introduce ZEB (Zero Emission Building), reduce valabilitatea CPE pentru clase D-G la 5 ani, impune RER on-site minim, MEPS 2030/2033.",
    keySections: [
      { id: "valabilitate", title: "Valabilitate CPE diferențiată", excerpt:
        "Valabilitate CPE: 10 ani pentru clase A+ / A / B / C; 5 ani pentru clase D / E / F / G. " +
        "Tracker CPE Zephren aplică automat această regulă."
      },
      { id: "zeb", title: "ZEB — Zero Emission Building", excerpt:
        "Începând cu 2028: clădirile publice noi trebuie să fie ZEB (consum operațional zero, RER 100% on-site sau echivalent). " +
        "Începând cu 2030: toate clădirile noi trebuie să fie ZEB."
      },
      { id: "rer-onsite", title: "RER on-site minim", excerpt:
        "Pentru clădiri rezidențiale noi: minim 10% RER on-site (PV, solar termic, pompe căldură) " +
        "din consumul de energie primară. Mc 001-2022 §5 precizează metodologia de calcul."
      },
    ],
  },
  {
    id: "hg-917-2021",
    code: "HG 917/2021",
    title: "Strategia de renovare pe termen lung",
    year: 2021,
    issuer: "Guvernul României",
    category: "regulation",
    type: "rebuild",
    externalUrl: "https://legislatie.just.ro/Public/DetaliiDocument/245751",
    relatedTabs: ["nzeb_check", "rehab", "pnrr"],
    summary:
      "Strategia națională 2021-2050 pentru renovare clădiri. Definește praguri nZEB pe categorii și zone climatice. Co-relaționată cu PNRR și fonduri UE.",
    keySections: [
      { id: "praguri-nzeb", title: "Anexă — Praguri EP nZEB", excerpt:
        "Tabel valori EP_nZEB,max [kWh/(m²·an)] pe categorie și zonă climatică. Exemple:\n" +
        "  • Locuințe individuale (RI): 90 / 100 / 115 / 125 / 130 (zone I…V)\n" +
        "  • Birouri (BI): 100 / 110 / 125 / 140 / 150 (zone I…V)\n" +
        "  • Sănătate (SA): 165 / 180 / 200 / 220 / 240 (zone I…V)\n" +
        "Verificare nZEB Zephren folosește acești factori."
      },
    ],
  },
  {
    id: "ord-mdlpa-16-2023",
    code: "Ord. MDLPA 16/2023",
    title: "Modificări Mc 001-2022 — corecții Anexa A.10 (clase energetice)",
    year: 2023,
    issuer: "MDLPA",
    category: "guideline",
    type: "rebuild",
    externalUrl: "https://www.mdlpa.ro/userfiles/ordin_mdlpa_16_2023.pdf",
    relatedTabs: ["raport_audit", "cpe_tracker"],
    summary:
      "Corecție scara claselor energetice A+/A/B/C/D/E/F/G și format CPE. Aliniere cu EPBD recast.",
  },

  // ═══════════════════════════════════════════════════════════════
  // NORMATIVE TEHNICE RO (acces liber)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "c107-2005",
    code: "C107/2-2005",
    title: "Normativ pentru calculul transferului de masă termică prin elementele de construcție",
    year: 2005,
    issuer: "MTCT (înlocuit de MDRT/MDLPA)",
    category: "standard_ro",
    type: "rebuild",
    externalUrl: "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_VI/6_8_C107_2_2005.pdf",
    relatedTabs: ["verificare_U", "tb_dinamic"],
    summary:
      "Normativul tehnic principal RO pentru calcul U-value, R-value, factori de difuzie vapori. " +
      "Aplicabil pentru toate elementele opace + tâmplărie. Co-coexistă cu Mc 001-2022.",
    keySections: [
      { id: "tab2-5", title: "Tabel 2.5 — U_max admis renovare majoră", excerpt:
        "Valori U_max [W/(m²·K)] pentru renovare > 25% suprafață anvelopă:\n" +
        "  • Pereți exteriori (PE): 0.30 (rezid.) / 0.25 (non-rez.)\n" +
        "  • Acoperiș terasă (PT): 0.20 (rezid.) / 0.18 (non-rez.)\n" +
        "  • Planșeu peste sol (PB): 0.30\n" +
        "  • Tâmplărie: 1.30 (rezid.) / 1.10 (non-rez.)\n" +
        "Verificare U Zephren (sub-tab Renovare majoră) aplică acești factori."
      },
    ],
  },
  {
    id: "np-061-02",
    code: "NP 061-02",
    title: "Normativ proiectare iluminat artificial și natural",
    year: 2002,
    issuer: "MTCT",
    category: "standard_ro",
    type: "rebuild",
    relatedTabs: ["iluminat_nat"],
    summary:
      "Cerințe FLZ (Factor Lumină Zi) ≥ 2% pentru spații de locuit. Aliniat cu EN 17037:2018. Folosit în calcul reducere LENI (Light Energy Numeric Indicator).",
  },
  {
    id: "np-008-97",
    code: "NP 008-97",
    title: "Normativ acustica clădirilor",
    year: 1997,
    issuer: "MTCT",
    category: "standard_ro",
    type: "rebuild",
    relatedTabs: ["acustic"],
    summary:
      "Indicele de izolare acustică Rw [dB] minimum pentru pereți, ferestre, planșee. Pentru zone urbane > 65 dB, Rw_perete ≥ 50 dB.",
  },
  {
    id: "gp-123-2004",
    code: "GP 123/2004",
    title: "Ghid de proiectare sisteme fotovoltaice",
    year: 2004,
    issuer: "MTCT (actualizat ANRE Ord. 11/2023)",
    category: "guideline",
    type: "rebuild",
    relatedTabs: ["gp123"],
    summary:
      "Reglementări pentru proiectare PV: tilt 25-45° optim, deviere azimut max 45° optim, " +
      "pierderi DC < 3%, AC < 1%, mismatch ~2%. Combinat cu ANRE Ord. 11/2023 pentru prosumători.",
  },

  // ═══════════════════════════════════════════════════════════════
  // STANDARDE SR EN ISO / EN (ASRO — drepturi închise, doar metadate)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "iso-52016",
    code: "SR EN ISO 52016-1:2017",
    title: "Performanța energetică a clădirilor — necesarul de energie pentru încălzire/răcire",
    year: 2017,
    issuer: "ISO/CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    externalUrl: "https://standards.iteh.ai/catalog/standards/cen/c0570c1f-d0ff-4ca6-aff2-0aaeae3247c2/en-iso-52016-1-2017",
    relatedTabs: ["racire_orara", "en12831"],
    summary:
      "Metoda orară de calcul Q_H/Q_C — model 5R1C echivalent termic. Înlocuiește metoda lunară EN ISO 13790 (păstrată ca metodă alternativă).",
  },
  {
    id: "iso-13790",
    code: "SR EN ISO 13790:2008",
    title: "Performanța energetică a clădirilor — necesar energie încălzire/răcire (metoda lunară)",
    year: 2008,
    issuer: "ISO/CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["sim8760"],
    summary:
      "Metodă cvasi-statică lunară pentru calcul Q_H/Q_C. Folosită în Mc 001-2022 ca metodă principală. Înlocuită oficial de ISO 52016-1, dar încă în uz.",
  },
  {
    id: "en-12831",
    code: "SR EN 12831-1:2017",
    title: "Performanța energetică — sarcini termice de proiectare (metoda generală)",
    year: 2017,
    issuer: "CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["en12831", "camere", "pompa"],
    summary:
      "Calcul putere termică nominală Φ_H,des. Versiunea -3 detaliază sarcina pe cameră. Folosit pentru dimensionare echipamente HVAC.",
  },
  {
    id: "en-15316",
    code: "SR EN 15316-1…5:2017",
    title: "Sisteme tehnice — calcul randamente",
    year: 2017,
    issuer: "CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["acm_en15316", "pompa"],
    summary:
      "Metode calcul randament generare (-2), distribuție (-3), emisie (-4), stocare (-5). Aplicabil pe ACM, încălzire, răcire.",
  },
  {
    id: "iso-52120",
    code: "SR EN ISO 52120-1:2022",
    title: "Building Automation Controls (BAC) — impact pe performanță energetică",
    year: 2022,
    issuer: "ISO/CEN (publicat ASRO, înlocuiește EN 15232:2017)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["bacs", "sri"],
    summary:
      "200 factori de eficiență BAC × 10 tipologii × 4 clase A/B/C/D × 5 sisteme. Stă la baza calculului SRI conform Reg. UE 2020/2155.",
  },
  {
    id: "iso-13788",
    code: "SR EN ISO 13788:2012",
    title: "Performanța higrotermică — riscul condensării interstițiale (Glaser)",
    year: 2012,
    issuer: "ISO/CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["glaser"],
    summary:
      "Metoda Glaser pentru evaluarea condensării vaporilor în alcătuirea elementelor. Utilizat în Zephren tab Glaser.",
  },
  {
    id: "iso-14683",
    code: "SR EN ISO 14683:2017",
    title: "Punți termice — coeficient liniar Ψ",
    year: 2017,
    issuer: "ISO/CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["tb_dinamic"],
    summary:
      "Cataloguri Ψ neizolat / izolat pentru cca. 165 tipologii de punți termice. Bază pentru tab Punți termice ψ.",
  },
  {
    id: "en-15193",
    code: "SR EN 15193-1:2017",
    title: "Performanța energetică — energia consumată de iluminat (LENI)",
    year: 2017,
    issuer: "CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["iluminat_nat"],
    summary:
      "Calcul LENI [kWh/(m²·an)] = (W_p × t_op + W_par) / Au. Reduceri pentru iluminat natural (FLZ), control prezență, dimming.",
  },
  {
    id: "en-15459",
    code: "SR EN 15459-1:2017",
    title: "Cost ciclu de viață (LCC) — eficiență economică reabilitare",
    year: 2017,
    issuer: "CEN (publicat ASRO, aliniat Reg. UE 244/2012 republicat 2025/2273)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["lcc", "rehab"],
    summary:
      "Metoda NPV pe orizont 20-30 ani. Punct cost-optim 50 kWh/(m²·an) (Mc 001-2022 actualizat). Folosit în tab LCC + Pachete reabilitare.",
  },
  {
    id: "en-16798",
    code: "SR EN 16798-1:2019/NA:2019",
    title: "Calitate aer interior + ventilare",
    year: 2019,
    issuer: "CEN + Anexa Națională RO",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["ventilare", "vmc_hr"],
    summary:
      "Categorii IEQ I-IV cu praguri CO₂ (550/800/1350/1800 ppm) și debit/persoană (10/7/4/2.5 L/s). Anexa Națională RO precizează clase pentru clădiri publice.",
  },
  {
    id: "en-15978",
    code: "SR EN 15978:2011",
    title: "Sustenabilitate — evaluarea ciclului de viață al clădirii (LCA)",
    year: 2011,
    issuer: "CEN (publicat ASRO)",
    category: "standard_en",
    type: "asro",
    relatedTabs: ["gwp_co2"],
    summary:
      "Metoda LCA pe module A1-A3 (producție), A4-A5 (transport+execuție), B1-B5 (utilizare), C (dezasamblare), D (credit reciclare). Folosit în raport CO₂ Lifecycle.",
  },
];

/** Returnează normativele filtrate după categorie + search. */
export function searchNormatives(query, category) {
  const q = (query || "").trim().toLowerCase();
  return NORMATIVES.filter(n => {
    if (category && category !== "all" && n.category !== category) return false;
    if (!q) return true;
    return (
      n.code.toLowerCase().includes(q) ||
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      (n.keySections || []).some(s =>
        s.title.toLowerCase().includes(q) || s.excerpt.toLowerCase().includes(q)
      )
    );
  });
}

/** Returnează normativele asociate unui tab Step 8. */
export function getNormativesForTab(tabId) {
  return NORMATIVES.filter(n => (n.relatedTabs || []).includes(tabId));
}
