// ═════════════════════════════════════════════════════════════════════════════
// glossary.js — Glosar termeni tutorial Zephren
//
// Folosit de secțiunile cu type "glossary" pentru a defini termeni cheie.
// Fiecare termen: { term, short (max 60 char), long (explicație 1-2 paragrafe) }
// ═════════════════════════════════════════════════════════════════════════════

export const GLOSSARY = {
  EP: {
    term: "EP",
    short: "Energie primară kWh/(m²·an)",
    long: "Energia primară totală consumată de clădire raportată la suprafața utilă Au și la un an. EP = Σ(Q_final,combustibil × fP_combustibil) / Au. Indicatorul principal pentru clasare A+→G și verificare nZEB.",
  },
  EP_nren: {
    term: "EP_nren",
    short: "EP din surse nereginerabile kWh/(m²·an)",
    long: "Componenta EP provenind doar din combustibili fosili și electricitate din rețea (fără producția proprie regenerabilă). Folosit pentru pragul nZEB în Mc 001-2022 după actualizare 2024.",
  },
  Au: {
    term: "Au",
    short: "Suprafață utilă încălzită m²",
    long: "Suprafața utilă a spațiilor încălzite ale clădirii (fără ziduri, balcoane, spații tehnice). EP se raportează la Au. NU confunda cu Ac (aria construită, include zidurile) sau Aeb (aria de evacuare a căldurii).",
  },
  V: {
    term: "V",
    short: "Volum interior încălzit m³",
    long: "Volumul interior al spațiilor încălzite. V ≈ Au × h_nivel × nr_niveluri. Folosit pentru calculul pierderilor prin ventilație și infiltrații.",
  },
  fP: {
    term: "fP",
    short: "Factor conversie energie primară",
    long: "Coeficient de conversie energie finală → energie primară. Tipic: gaz natural 1.10, electricitate 2.50 (din 2024, Tab A.16 Mc 001 + corecție MDLPA), biomasă 1.20 (din care 1.00 regenerabil), termoficare 1.20.",
  },
  fCO2: {
    term: "fCO₂",
    short: "Factor emisii CO₂ kg/kWh",
    long: "Coeficient de emisii CO₂ asociate combustibilului. Gaz natural ~0.205, electricitate RO mix ~0.280, biomasă ~0 (biogen). Folosit pentru calculul amprentei de carbon în CPE actualizat EPBD 2024.",
  },
  nZEB: {
    term: "nZEB",
    short: "Nearly Zero Energy Building",
    long: "Clădire cu consum aproape zero de energie. Mc 001-2022: limite EP_max per categorie clădire (RI ≤125, RC ≤110, BI ≤145, ED ≤60, SP ≤70, HC ≤100 kWh/m²a). Obligatoriu pentru clădiri noi din 2021 (EPBD III).",
  },
  ZEB: {
    term: "ZEB",
    short: "Zero Emission Building",
    long: "Clădire cu emisii nete zero. EPBD 2024 cere ca toate clădirile noi să fie ZEB din 2030 (publice) și 2032 (private). Mc 001 va fi actualizat pentru a defini criteriile naționale.",
  },
  MEPS: {
    term: "MEPS",
    short: "Minimum Energy Performance Standards",
    long: "Praguri minime obligatorii de performanță energetică EPBD 2024 Art. 9. Rezidențial: clasa E până 2030, clasa D până 2033. Nerezidențial: 16% cele mai slabe clădiri renovate până 2030. Verificat în Pas 8.",
  },
  RER: {
    term: "RER",
    short: "Renewable Energy Ratio %",
    long: "Procentul de energie regenerabilă în consumul total. RER = Σ(E_regen_consumată_pe_loc) / Σ(E_finală_totală) × 100. Mc 001-2022 cere RER ≥ 30% pentru clădiri noi nZEB.",
  },
  BACS: {
    term: "BACS",
    short: "Building Automation & Control Systems",
    long: "Sisteme automatizare/control clădire. EN 15232 definește clase A-D. A = high performance, factor f_BAC = 0.83 (reduce EP cu 17%). D = non-energy-efficient, f_BAC = 1.10. Obligatoriu clasa B pentru clădiri nerezidențiale >290 kW.",
  },
  SRI: {
    term: "SRI",
    short: "Smart Readiness Indicator 0-100%",
    long: "Indicator readiness inteligent al clădirii (Reg. UE 2020/2155). Evaluează 42 servicii pe 9 domenii. Obligatoriu pentru clădiri >290 kW din 2025 în RO. Pas 8 calculează SRI complet sau auto-simplu.",
  },
  CPE: {
    term: "CPE",
    short: "Certificat Performanță Energetică",
    long: "Document oficial care atestă performanța energetică a clădirii. Obligatoriu la vânzare, închiriere, dare în administrare. Valabilitate 10 ani sau până la renovare majoră. AE IIci semnează CPE rezidențial, AE Ici toate.",
  },
  AE_Ici: {
    term: "AE Ici",
    short: "Auditor Energetic Inspector Construcții Ici",
    long: "Auditor cu grad I (sau gradul nou Ici Ord. 348/2026). Poate emite CPE + audit energetic + Raport nZEB pentru TOATE categoriile de clădiri. Plan Zephren 1.499 RON/lună.",
  },
  AE_IIci: {
    term: "AE IIci",
    short: "Auditor Energetic IIci",
    long: "Auditor cu grad II (sau gradul nou IIci Ord. 348/2026). Poate emite DOAR CPE pentru clădiri rezidențiale (Anexa 1+2). NU poate face audit energetic complet. Plan Zephren 599 RON/lună.",
  },
  PAdES: {
    term: "PAdES",
    short: "PDF Advanced Electronic Signatures",
    long: "Standard ETSI EN 319 142-1 pentru semnături electronice avansate în PDF. Nivele B-T (cu timestamp), B-LT (cu DSS validare lung termen), B-LTA (archive). Necesar QTSP RO (certSIGN/DigiSign) pentru CPE oficial.",
  },
  PDFA3: {
    term: "PDF/A-3",
    short: "Format arhivare PDF cu atașamente",
    long: "ISO 19005-3. Format PDF pentru arhivare lung termen (10+ ani). Suportă atașamente cu AFRelationship (Source/Data/Alternative). Zephren generează CPE+Anexă PDF/A-3 cu JSON+CSV+XML atașate.",
  },
  U: {
    term: "U",
    short: "Coef. transfer termic W/(m²·K)",
    long: "Coeficient de transfer termic global al unui element opac sau vitraj. Calculat conform ISO 6946 (opac) sau ISO 10077 (vitraj). U_ref nZEB RI: pereți ≤0.35, planșee ≤0.20, ferestre ≤1.30 W/m²K.",
  },
  Psi: {
    term: "Ψ (psi)",
    short: "Coef. transfer punte termică W/(m·K)",
    long: "Coeficient liniar punte termică. Catalog ISO 14683 sau calcul numeric ISO 10211. Adâncimi peste 25% din peretele opac sunt critice — pierderi totale prin punți 15-30% la clădiri vechi neizolate.",
  },
  n50: {
    term: "n₅₀",
    short: "Etanșeitate aer la 50 Pa h⁻¹",
    long: "Schimburi de aer pe oră la diferență de presiune 50 Pa (test Blower Door). Clădire nouă etanșă: <1.5. Clădire veche fără lucrări etanșare: 4-10. Influențează masiv pierderile prin infiltrații.",
  },
  GD: {
    term: "GD / GZ",
    short: "Grade-zile încălzire °C·zile",
    long: "Suma diferențelor (T_int_baza - T_ext_zilnică) pentru zilele cu încălzire. T_baza = 20°C în RO. Zona I (Constanța): ~2.000 GD. Zona V (Brașov): ~3.800 GD. Determină consum încălzire.",
  },
  SCOP: {
    term: "SCOP",
    short: "Seasonal Coefficient of Performance",
    long: "Eficiență sezonieră a pompei de căldură (encălzire). SCOP = E_termică_produsă / E_electrică_consumată pe sezon. Pompă aer-apă modernă: SCOP 3.0-3.5. Sol-apă: SCOP 4.0-5.0.",
  },
  SEER: {
    term: "SEER",
    short: "Seasonal Energy Efficiency Ratio",
    long: "Eficiență sezonieră răcire. Analog SCOP dar pentru regim răcire. SEER 5-7 climatizare modernă inverter, 3-4 unități vechi non-inverter.",
  },
  EER: {
    term: "EER",
    short: "Energy Efficiency Ratio (răcire instant)",
    long: "Eficiența instantanee răcire în condiții nominale. EER < SEER pentru că nu integrează părți încărcare. Folosit pentru dimensionare.",
  },
  LENI: {
    term: "LENI",
    short: "Lighting Energy Numeric Indicator",
    long: "Indicator EN 15193 pentru consum iluminat kWh/(m²·an). LENI = (P_n × t_d × F_O × F_C + P_pc + P_em) / Au. Folosit în Mc 001 §3.5. LED modern <10, fluorescent vechi 15-25.",
  },
  IAQ: {
    term: "IAQ",
    short: "Indoor Air Quality",
    long: "Calitatea aerului interior. EN 16798-1 definește categorii I-IV (I=high quality, IV=acceptable for short period). CO₂ <1000 ppm cat. I, <1400 ppm cat. III. Influențează necesarul ventilare.",
  },
  GWP: {
    term: "GWP",
    short: "Global Warming Potential kg CO₂eq/m²",
    long: "Amprenta de carbon lifecycle a clădirii (50 ani). Include materiale, transport, montaj, operare, demolare. EPBD 2024 Art. 17 cere GWP în CPE pentru clădiri noi din 2028. Calcul cradle-to-grave EN 15978.",
  },
};
