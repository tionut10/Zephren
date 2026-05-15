// ═════════════════════════════════════════════════════════════════════════════
// normative-refs.js — Registry centralizat referințe normative pentru tutorial
//
// Folosit de NormativeBadge prin spread (...REFS.mc001_cap1).
// Toate URL-urile sunt verificate: oficial MDLPA, EUR-Lex, ANRE, ASRO.
// ═════════════════════════════════════════════════════════════════════════════

export const REFS = {
  // ─── Mc 001-2022 — Metodologie românească ─────────────────────────────────
  mc001: {
    code: "Mc 001-2022",
    title: "Metodologia de calcul a performanței energetice a clădirilor",
    description: "Document de referință în RO pentru calculul EP, CPE și auditul energetic. Aprobat prin Ord. MDLPA 1071/2022. Părți I-III + Anexe A-G.",
    url: "https://www.mdlpa.ro/pages/regulamenttehniccladiri",
    type: "mc001",
  },
  mc001_cap1: {
    code: "Mc 001-2022 §1",
    title: "Capitolul 1 — Date generale, geometrie, climă",
    description: "Reglementează datele de identificare a clădirii, suprafețele de referință (Au, Ac, Aeb), volum, zona climatică (I-V).",
    type: "mc001",
  },
  mc001_cap2: {
    code: "Mc 001-2022 §2",
    title: "Capitolul 2 — Anvelopa termică",
    description: "U_calculat conform ISO 6946, U_referință pentru nZEB (Tab 2.4/2.7/2.10), punți termice catalog tipologic.",
    type: "mc001",
  },
  mc001_cap3: {
    code: "Mc 001-2022 §3",
    title: "Capitolul 3 — Instalații tehnice",
    description: "Randamentele η_gen, η_dist, η_em, η_ctrl pentru sisteme încălzire, ACM, climatizare. EN 15316 / 15243.",
    type: "mc001",
  },
  mc001_cap4: {
    code: "Mc 001-2022 §4",
    title: "Capitolul 4 — Surse regenerabile",
    description: "Calcul aport solar termic, fotovoltaic, pompă căldură, biomasă, eolian. RER (Renewable Energy Ratio).",
    type: "mc001",
  },
  mc001_cap5: {
    code: "Mc 001-2022 §5",
    title: "Capitolul 5 — Calcul energetic",
    description: "Metoda cvasistationară lunară ISO 13790. EP = Σ(Q_nd × fP) / Au. Factor utilizare η_H, η_C.",
    type: "mc001",
  },
  mc001_anexa1: {
    code: "Mc 001-2022 Anexa 1",
    title: "Anexa 1 — Date climatice și GD",
    description: "Tabele zone climatice I-V, grade-zile încălzire (GZ_h), grade-zile răcire (GZ_c) per județ.",
    type: "mc001",
  },
  mc001_anexa_g: {
    code: "Mc 001-2022 Anexa G",
    title: "Anexa G — Foaie informativă conformitate (FIC)",
    description: "Format obligatoriu pentru raportare conformitate cu metodologia Mc 001 în dosarul de audit.",
    type: "mc001",
  },

  // ─── Standarde SR EN (versiuni RO ale EN europene) ────────────────────────
  sr_en_iso_6946: {
    code: "SR EN ISO 6946:2018",
    title: "Componente și elemente de construcție — Rezistență termică",
    description: "Calculul rezistenței termice R și coeficientului U pentru elemente opace omogene/eterogene. Rsi/Rse standard.",
    url: "https://www.asro.ro",
    type: "iso",
  },
  sr_en_iso_13790: {
    code: "SR EN ISO 13790:2008",
    title: "Performanța energetică a clădirilor — Calculul consumului de energie pentru încălzire și răcire",
    description: "Metodă cvasistationară lunară pentru EP. Înlocuită parțial de SR EN ISO 52016 dar Mc 001-2022 încă referențiază 13790.",
    type: "iso",
  },
  sr_en_iso_52016: {
    code: "SR EN ISO 52016-1:2017",
    title: "Performanța energetică a clădirilor — Necesarul de energie pentru încălzire și răcire (orar)",
    description: "Metodă orară modernă, în implementare la nivel UE. Mc 001 versiunile viitoare vor migra spre 52016.",
    type: "iso",
  },
  sr_en_iso_14683: {
    code: "SR EN ISO 14683:2017",
    title: "Punți termice în construcții — Coeficienți liniari Ψ",
    description: "Catalog tipologic punți termice (colț, planșeu intermediar, atic, fundație etc.). Valori Ψ default.",
    type: "iso",
  },
  sr_en_iso_10211: {
    code: "SR EN ISO 10211:2017",
    title: "Punți termice — Calcul numeric detaliat",
    description: "Calcul numeric MEF/MDF pentru punți speciale. Folosit când catalog 14683 nu acoperă geometria.",
    type: "iso",
  },
  sr_en_15316: {
    code: "SR EN 15316",
    title: "Performanța energetică instalații încălzire/ACM",
    description: "Părți: -1 (general), -2 (emisie), -3 (distribuție), -4 (generare). η_gen, η_dist, η_em.",
    type: "sr-en",
  },
  sr_en_16798: {
    code: "SR EN 16798-1:2019",
    title: "Performanța energetică — Parametri de mediu interior",
    description: "IAQ, CO₂, T_int, umiditate. Categorii I-IV mediu interior. Folosit în EN 16798-2 calcul ventilare.",
    type: "sr-en",
  },
  sr_en_15232: {
    code: "SR EN 15232-1:2017",
    title: "BACS — Sisteme automatizare și management clădiri",
    description: "Clasificare A-D (A=high performance, D=non-energy efficient). Factor f_BAC ajustare EP în Mc 001 §5.6.",
    type: "sr-en",
  },
  sr_en_15193: {
    code: "SR EN 15193-1:2017",
    title: "Performanța energetică iluminat",
    description: "Calcul LENI (Lighting Energy Numeric Indicator) kWh/(m²·an). Folosit în Mc 001 §3.5.",
    type: "sr-en",
  },
  sr_en_12831: {
    code: "SR EN 12831-1:2017",
    title: "Sarcina termică de calcul — Metodă",
    description: "Calcul Φ_design (kW) pentru dimensionare instalații încălzire. T_int proiect, T_ext proiect, n_inf.",
    type: "sr-en",
  },
  sr_en_15603: {
    code: "SR EN 15603:2008",
    title: "Performanța energetică globală — Definiții indicatori",
    description: "Definiția EP_total, EP_nren, EP_ren, factor fP de conversie energie primară.",
    type: "sr-en",
  },

  // ─── EPBD UE ──────────────────────────────────────────────────────────────
  epbd_2024: {
    code: "EPBD 2024/1275/UE",
    title: "Directiva (UE) 2024/1275 — Performanța energetică a clădirilor (recast)",
    description: "Cerințe nZEB obligatorii toate clădirile noi din 2030, MEPS rezidențial clasa E până 2030, ZEB până 2050.",
    url: "https://eur-lex.europa.eu/eli/dir/2024/1275/oj",
    type: "epbd",
  },
  epbd_art6: {
    code: "EPBD 2024 Art. 6",
    title: "Articolul 6 — Cerințe energetice minime de performanță",
    description: "Statele membre stabilesc MEPS și asigură că toate clădirile noi sunt ZEB (zero-emission buildings) din 2030.",
    type: "epbd",
  },
  epbd_art9: {
    code: "EPBD 2024 Art. 9",
    title: "Articolul 9 — Renovări trepte",
    description: "9.1.a: rezidențial clasa E până 2030 + clasa D până 2033; 9.1.b: nerezidențial 16% cele mai slabe până 2030.",
    type: "epbd",
  },
  epbd_art17: {
    code: "EPBD 2024 Art. 17",
    title: "Articolul 17 — Certificate energetice",
    description: "Format CPE actualizat: clasă A-G, CO₂eq, GWP, pașaport renovare, recomandări reabilitare.",
    type: "epbd",
  },

  // ─── Legi române ──────────────────────────────────────────────────────────
  legea_372: {
    code: "L. 372/2005 mod. L.238/2024",
    title: "Legea privind performanța energetică a clădirilor",
    description: "Cadru legal RO pentru CPE, audit energetic, sancțiuni. Modificată L.238/2024 pentru armonizare EPBD IV.",
    type: "lege",
  },
  legea_372_art13: {
    code: "L. 372/2005 Art. 13",
    title: "Art. 13 — Obligativitate CPE la vânzare/închiriere",
    description: "Vânzător/locator obligat să prezinte CPE cumpărătorului/chiriașului. Amendă 5.000–15.000 RON.",
    type: "lege",
  },

  // ─── Ordine MDLPA ─────────────────────────────────────────────────────────
  ord_348: {
    code: "Ord. MDLPA 348/2026",
    title: "Ord. MDLPA 348/2026 — Atestare auditori energetici",
    description: "Tranziție grade I/II → AE Ici/IIci. Portal MDLPA disponibil 8.VII.2026. Bază: EPBD 2024 Art. 19.",
    type: "ord",
  },
  ord_348_art6: {
    code: "Ord. 348/2026 Art. 6",
    title: "Art. 6 — Competențe pe grade auditor",
    description: "6.1: AE Ici poate emite CPE + audit toate clădirile + Raport nZEB. 6.2: AE IIci DOAR CPE rezidențial (Anexa 1+2).",
    type: "ord",
  },
  ord_16_2023: {
    code: "Ord. MDLPA 16/2023",
    title: "Ord. MDLPA 16/2023 — Format Anexa 1+2 CPE",
    description: "Conținut obligatoriu Anexa 1 (date tehnice) + Anexa 2 (recomandări reabilitare). Schema XML v2.1.",
    type: "ord",
  },
  ord_2461_2011: {
    code: "Ord. MDLPA 2461/2011",
    title: "Ord. MDLPA 2461/2011 mod. 2023 — Audit energetic",
    description: "Conținut Raport Audit Energetic. Cap. 1-8 obligatorii. AE Ici semnează.",
    type: "ord",
  },
  ord_1071_2022: {
    code: "Ord. MDLPA 1071/2022",
    title: "Ord. MDLPA 1071/2022 — Aprobare Mc 001",
    description: "Ordinul de aprobare a Metodologiei Mc 001-2022 publicat în M.Of. nr. 1059/2022.",
    type: "ord",
  },

  // ─── Standarde internaționale ISO/EN extra ────────────────────────────────
  iso_19005: {
    code: "ISO 19005-3",
    title: "PDF/A-3 — Format arhivare cu atașamente",
    description: "Format arhivare PDF pentru dosar audit Zephren. Atașamente bilingv (JSON+CSV+XML) cu AFRelationship.",
    type: "iso",
  },
  etsi_319_142: {
    code: "ETSI EN 319 142-1",
    title: "PAdES — Semnături electronice avansate PDF",
    description: "Format semnătură PAdES B-T/B-LT pentru CPE oficial. Necesar QTSP RO (certSIGN, DigiSign).",
    type: "iso",
  },
  eidas2: {
    code: "Reg. UE 910/2014 mod. 2024/1183",
    title: "eIDAS 2 — Cadru semnături electronice UE",
    description: "Reglementare UE care permite recunoașterea transfrontalieră a semnăturilor PAdES B-LT.",
    type: "epbd",
  },

  // ─── ASRO/ANRE ────────────────────────────────────────────────────────────
  anre_tarife: {
    code: "ANRE",
    title: "Autoritatea Națională de Reglementare în domeniul Energiei",
    description: "Comparator tarife energie electrică + gaz naturale. Sursă oficială prețuri folosite în CPE.",
    url: "https://www.anre.ro/ro/info-consumatori/comparator-oferte-furnizori",
    type: "ord",
  },
  asro: {
    code: "ASRO",
    title: "Asociația de Standardizare din România",
    description: "Distribuitor oficial SR EN/SR ISO. Standarde necesare auditor energetic.",
    url: "https://www.asro.ro",
    type: "iso",
  },
  pvgis: {
    code: "PVGIS v5.2",
    title: "Photovoltaic Geographical Information System",
    description: "Calculator JRC EU pentru producție PV. Folosit în Zephren pentru calibrare regenerabile.",
    url: "https://re.jrc.ec.europa.eu/pvg_tools/en/",
    type: "epbd",
  },
};
