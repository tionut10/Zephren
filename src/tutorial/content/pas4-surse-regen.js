// ═════════════════════════════════════════════════════════════════════════════
// Pas 4 — Surse regenerabile (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 4 modelează aportul surselor regenerabile (solar termic, fotovoltaic, pompă căldură, biomasă, eolian, geotermal) și calculează RER (Renewable Energy Ratio). Mc 001-2022 + EPBD 2024 cer RER ≥30% pentru clădiri noi nZEB. Pentru clădiri reabilitate, RER nu e obligatoriu dar contribuie la clasă energetică superioară.",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "De ce regenerabilele contează",
      title: "Decarbonizarea EPBD prin RER ≥30% obligatoriu",
      body: "RER = E_regenerabilă_consumată_pe_loc / E_finală_totală × 100. Pentru clădiri noi: RER ≥ 30% (RI), 25% (RC), 27% (BI), 50% pentru SP/AL. ATENȚIE: doar energia consumată pe loc se contează, NU excedentul vândut în rețea. PV de 5 kWp poate fi 70% auto-consumat doar cu baterie sau ACM electric mare.",
      highlight: "Pompa de căldură contează ca regenerabilă în RER (aerul/solul = sursă termică regenerabilă). HP cu SCOP 4 contribuie cu 75% energie regenerabilă din total furnizat.",
    },

    {
      id: "decision-renewables",
      type: "decision",
      kicker: "Decizia arhitecturală",
      title: "Mix regenerabile recomandat pentru reabilitare RO",
      options: [
        {
          title: "Solar termic ACM",
          pros: ["Cost mic ~3.000-5.000 EUR pentru 4 m²", "Acoperă 60-80% ACM iarna+vară", "Tehnologie matură 30+ ani"],
          cons: ["Nu acoperă încălzire spațiu (decât în combinație complexă)", "Stocare 200-300 L necesar", "Risc supraîncălzire vară"],
          recommendation: "Excelent pentru case cu consum ACM mare (familie 4+ persoane)",
        },
        {
          title: "Fotovoltaic + auto-consum",
          pros: ["Eligibil Casa Verde Foto (~6.000 EUR rebursare)", "Producție 1.100-1.250 kWh/kWp/an în RO", "Vindere excedent rețea PROSUMATOR"],
          cons: ["Auto-consum doar ~30% fără baterie", "Necesită orientare S ±45°", "Mentenanță minimă dar inverter 10 ani"],
          recommendation: "Standard 2025+ pentru toate clădirile noi RI",
        },
        {
          title: "Pompă căldură (RER din aer/sol)",
          pros: ["RER 75% automat datorită SCOP 4", "Înlocuiește cazan = decarbonizare", "Reversibilă (cooling vara)"],
          cons: ["Cost mediu-mare 7-15.000 EUR", "Necesită distribuție T_joasă (radiatoare mari sau pardoseală)"],
          recommendation: "Recomandare PRINCIPALĂ pentru reabilitare nZEB",
        },
        {
          title: "Biomasă (peleți)",
          pros: ["RER 100% (combustibil regenerabil)", "Cost combustibil mic", "Stabil iarna"],
          cons: ["Stocare peleți 10+ m³", "PM2.5 emisii", "Mentenanță săptămânală"],
          recommendation: "Doar rural / zone fără gaz",
        },
      ],
    },

    {
      id: "fields-solar-thermal",
      type: "fields",
      kicker: "Solar termic",
      title: "Date instalație solar termic ACM",
      items: [
        { label: "Suprafață colectoare", dataType: "number m²", required: true, note: "Tipic 1-1.5 m²/persoană. Familie 4 = 4-6 m²" },
        { label: "Tip colector", dataType: "enum", required: true, note: "Plat (η=0.55-0.70) / Tuburi vid (0.65-0.80) / Polimeric (0.50)" },
        { label: "Orientare", dataType: "azimut°", required: true, note: "S=0°, E=-90°, V=+90°. Optim: ±30° de S" },
        { label: "Înclinare", dataType: "număr°", required: true, note: "Optim ACM RO: 45-60° (max iarna). 30° = max vara" },
        { label: "Volum stocare", dataType: "number L", required: true, note: "≈ 50-75 L/m² colector. Pentru 4 m² → 200-300L" },
        { label: "η_colector (η₀)", dataType: "0-1", required: false, note: "Valoarea declarată producător sau test ISO 9806" },
      ],
    },

    {
      id: "fields-pv",
      type: "fields",
      kicker: "Fotovoltaic",
      title: "Date instalație PV",
      body: "Producția se calculează cu modelul PVGIS v5.2 (JRC EU) calibrat 29 apr 2026 — eroare <5% față de instrumente PVGIS oficiale.",
      items: [
        { label: "Putere instalată", dataType: "number kWp", required: true, note: "1 kWp ≈ 5-6 m² panouri policrist." },
        { label: "Tehnologie celule", dataType: "enum", required: false, note: "Monocrist / Policrist / Perovskit-tandem / OPV. Default monocrist 22% eficiență" },
        { label: "Orientare", dataType: "azimut°", required: true, note: "S optim RO. Iar E sau V pierderi 15%; N -30%" },
        { label: "Înclinare", dataType: "număr°", required: true, note: "Optim anual RO: 30-35°. Acoperiș tipic 25-45°" },
        { label: "η_invertor", dataType: "0-1", required: false, note: "Default 0.97. Hibrid cu baterie 0.94" },
        { label: "Sistem stocare baterie", dataType: "kWh", required: false, note: "Crește auto-consum 30%→70%. Tipic 5-10 kWh familie" },
        { label: "Auto-consum %", dataType: "0-100", required: false, note: "Auto-calc sau manual. PV fără baterie ~30%, cu baterie ~70%" },
      ],
    },

    {
      id: "fields-heat-pump",
      type: "fields",
      kicker: "Pompă căldură",
      title: "HP cu contribuție RER",
      body: "Pompele căldură contribuie la RER prin energia extrasă din mediu (aer, sol, apă). Formula Mc 001 §4.4: E_regen_HP = Q_furnizat × (1 - 1/SCOP).",
      items: [
        { label: "Tip HP", dataType: "enum", required: true, note: "Aer-apă / Sol-apă vertical / Sol-apă orizontal / Apă-apă" },
        { label: "Putere termică nominală", dataType: "number kW", required: true, note: "La A2W7 (T_ext 2°C, T_apă 35°C)" },
        { label: "SCOP sezonier", dataType: "number", required: true, note: "Aer-apă 2.5-3.5, Sol-apă 4.0-5.0" },
        { label: "Agent frigorific", dataType: "enum", required: false, note: "R290 (propan, GWP=3 modern), R32 (675), R410A (2088 — eliminat 2025)" },
        { label: "Sistem fundament (sol-apă)", dataType: "enum", required: false, note: "Sonde verticale 100-150m / Schimbătoare orizontale 150-300m² / Energie freatică (apă pânza)" },
      ],
    },

    {
      id: "fields-other",
      type: "fields",
      kicker: "Alte surse",
      title: "Biomasă, eolian, hidro mic",
      items: [
        { label: "Biomasă tip", dataType: "enum", required: false, note: "Peleți / Brichete / Lemn local / Torrefiat" },
        { label: "Consum anual biomasă", dataType: "kg/an sau MWh/an", required: false, note: "Lemn 1 m³ ≈ 1.500 kWh PCI" },
        { label: "Turbină eoliană", dataType: "kW + tip", required: false, note: "HAWT/VAWT — rar economic în RO (v_med < 6 m/s)" },
        { label: "Eolian putere", dataType: "kW", required: false, note: "Tipic 1-5 kW micro-rezidential" },
        { label: "Hidro micro", dataType: "kW", required: false, note: "<10 kW. Doar lângă cursuri apă cu cădere >2m" },
        { label: "CHP/cogenerare", dataType: "kW_e + kW_t", required: false, note: "Mc 001 §4.7. Util pentru clădiri mari cu cerere termică constantă" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Cum diferă pe categorie",
      title: "Strategii regenerabile per categorie",
      branches: [
        {
          category: "RA (apartament bloc)",
          appliesTo: ["M1"],
          description: "Auto-consum PV individual NU este posibil (acoperiș comun). Soluție: PV comun bloc + alocare proporțională. RER apartament = 0 tipic.",
        },
        {
          category: "RI (casă unifamilială)",
          appliesTo: ["M2", "M5"],
          description: "Toate opțiunile disponibile. M2 (vechi) recomandat PV 3-5 kWp + ST 4-6 m². M5 (nou ZEB) are deja PV 6 kWp + ST + HP + baterie.",
          formula: "RER = (E_PV_auto + E_ST + E_HP_regen) / E_total ≥ 30%",
        },
        {
          category: "BI (birouri)",
          appliesTo: ["M3"],
          description: "PV rooftop foarte rentabil (consum diurn = producție diurnă, auto-consum ~80%). Solar termic mai puțin util (consum ACM mic în birouri).",
        },
        {
          category: "ED (școală)",
          appliesTo: ["M4"],
          description: "Vacanțe = excedent PV mare în iulie-august. Recomandat schemă PROSUMATOR cu vânzare la rețea + recuperare credit toamna.",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Standardele Pasului 4",
      refs: [REFS.mc001_cap4, REFS.epbd_2024, REFS.epbd_art6, REFS.pvgis],
      quote: "Energia regenerabilă produsă pe loc se contabilizează în RER doar pentru cantitatea consumată în clădire. Excedentul exportat în rețea nu contribuie la pragul nZEB.",
      quoteSource: "Mc 001-2022 §4.2 alin. 2",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni regenerabile",
      terms: [GLOSSARY.RER, GLOSSARY.SCOP, GLOSSARY.nZEB, GLOSSARY.ZEB],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli regenerabile",
      items: [
        {
          title: "Producție PV totală în RER (în loc de auto-consum)",
          body: "PV 5 kWp produce ~6.000 kWh/an. Fără baterie, doar 30% auto-consumat = 1.800 kWh. Restul 4.200 kWh vândut rețea NU se contează în RER.",
          fix: "Folosește auto-consum (default 30% fără baterie, 70% cu baterie). Sau calcul orar PV vs consum.",
        },
        {
          title: "SCOP catalog HP în loc de SCOP sezonal",
          body: "SCOP catalog A7/W35 (T_ext +7°C, T_apă 35°C) e 4.5 dar SCOP sezonal RO Zona III cu radiatoare T=55° e 3.0. Diferența impactează RER.",
          fix: "Folosește SCOP_sezonal EN 14825 Zone D (rece) sau alege componenta cu T_apă potrivită distribuției.",
        },
        {
          title: "Solar termic supradimensionat",
          body: "Pentru familie 4 pers., 4-6 m² e suficient. 10 m² → stocare lipsă vară → supraîncălzire → pagube + waste.",
          fix: "Regula: 1-1.5 m²/persoană + 50-75 L stocare/m². Mai mare → necesar drenaj termic vară.",
        },
        {
          title: "PV pe orientare V/N (subestimare pierderi)",
          body: "PV pe V produce cu 15% mai puțin decât S. Pe N cu 30-40% mai puțin. Folosirea valorii S pentru orientări sub-optime supraestimează RER.",
          fix: "Folosește factor orientare PVGIS Tab. Sau date orar reale cu sun-path în ProgramVEGIS.",
        },
        {
          title: "RER calculat pe E_total în loc de E_finală",
          body: "Confuzie: RER = E_regen / E_finală (NU EP). Eroare comună: aplică fP la regenerabile (regen are fP=1.00 sau 0).",
          fix: "Mc 001 §4.2: numărător = E_regen consumat pe loc; numitor = E_finală totală (gaz, elec, biomasă, regen, toate kWh-uri finale).",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Cum se folosește Pas 4 în calcul final",
      flows: [
        { from: "E_PV_auto", to: "Pas 5 EP_nren reducere", description: "PV scade electricitatea cumpărată" },
        { from: "E_ST", to: "Pas 5 Q_ACM scădere", description: "Solar termic acoperă parte din ACM" },
        { from: "SCOP HP", to: "Pas 3 + Pas 5", description: "Eficiență sursă încălzire" },
        { from: "Biomasă fP=1.20 (1 regen + 0.20 nren)", to: "Pas 5 fP mixt", description: "Combustibil regenerabil scade EP_nren" },
        { from: "Σ E_regen / Σ E_finală", to: "Pas 8 verificare RER nZEB", description: "Threshold ≥30%" },
        { from: "PV kWp", to: "Pas 7 ROI scenariu", description: "Calcul economie + payback PV" },
      ],
    },

    {
      id: "what-if-pv",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Cum se schimbă RER cu puterea PV",
      body: "Casă M2 reabilitată: consum elec ~4.500 kWh/an (HP + lighting). Adaugă PV pentru a vedea RER.",
      parameter: "pv_kwp",
      paramLabel: "Putere PV instalată",
      paramUnit: "kWp",
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      formula: ({ value }) => {
        // Producție PV ~1200 kWh/kWp/an în Cluj
        // Auto-consum 30% fără baterie
        const producție_PV = value * 1200;
        const auto_consum = producție_PV * 0.30;
        // Total energie finală casă (cu HP) ~ 5500 kWh
        const E_final_total = 5500;
        const E_regen_HP = 3000 * (1 - 1 / 3.5); // ~2143 kWh
        const E_regen_total = auto_consum + E_regen_HP;
        const RER = (E_regen_total / (E_final_total + E_regen_HP)) * 100;
        return { output: RER, unit: "% RER", label: "RER calculat", decimals: 1 };
      },
      baseline: { value: 0, output: 28, label: "Fără PV, doar HP contribuție" },
      presets: [
        { label: "Niciun PV", value: 0 },
        { label: "3 kWp tipic", value: 3 },
        { label: "5 kWp recomandat", value: 5 },
        { label: "8 kWp casă mare", value: 8 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Zephren regenerabile",
      items: [
        "<b>PVGIS calibrat</b> — producția PV verificată automat vs PVGIS v5.2 (eroare <5%).",
        "<b>Auto-consum &gt; 80% fără baterie</b> = warning (irealist).",
        "<b>SCOP &gt; 5 HP aer-apă</b> = warning (max realistic 5.0 sol-apă).",
        "<b>Orientare colectoare ±45° de S</b> — warning dacă în afara range.",
        "<b>Stocare ACM &lt; 50 L/m²</b> colector = warning sub-dimensionat.",
        "<b>RER &lt; 30%</b> + scop=construire = warning nZEB non-conform.",
        "<b>Biomasă fără stocare</b> declarată = warning (peleți necesită siloz).",
        "<b>Eolian &lt; 5 m/s med</b> = warning (irealist RO).",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 4",
      items: [
        "Calcul orar PV cu sun-path real — Mc 001 folosește valori medii lunare. Pentru proiecte mari, sim. PVsyst/SAM.",
        "Optimizare baterie (charge/discharge cycles) — Zephren ia auto-consum % fixed.",
        "Comportament colectoare la stagnare vară — necesar drenaj termic manual modelat.",
        "Eolian micro <10 kW — recomandat instrumente specializate WAsP.",
        "Hidro picohidro — incident rar RO, nu e modelat.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Regenerabile demo M2",
      values: [
        { label: "PV existent", value: "3 kWp", note: "Instalat 2020" },
        { label: "Producție anuală", value: "3.300 kWh", note: "PVGIS Cluj Zona III" },
        { label: "Auto-consum", value: "30%", note: "Fără baterie" },
        { label: "ST", value: "0", note: "Neinstalat" },
        { label: "HP", value: "0", note: "Cazan gaz" },
        { label: "RER existent", value: "2.7%", note: "Sub pragul nZEB" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test Pas 4",
      questions: [
        {
          question: "Un PV 5 kWp în Cluj produce ~6.000 kWh/an. Dacă auto-consumul este 30%, energia regenerabilă consumată pe loc este:",
          options: ["1.000 kWh", "1.800 kWh", "3.000 kWh", "6.000 kWh"],
          correct: 1,
          explanation: "Auto-consum 30% × 6.000 = 1.800 kWh. Restul 4.200 vândut rețea NU se contează în RER.",
        },
        {
          question: "Pompă căldură cu SCOP 4.0 furnizează 8.000 kWh termic. Energia regenerabilă contabilizată în RER este:",
          options: ["2.000 kWh", "6.000 kWh", "8.000 kWh", "10.000 kWh"],
          correct: 1,
          explanation: "E_regen_HP = Q_furnizat × (1 - 1/SCOP) = 8.000 × (1 - 0.25) = 8.000 × 0.75 = 6.000 kWh. Diferența 2.000 kWh = electricitatea consumată.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum optimizezi RER cu buget limitat",
      body: "Pentru RER ≥30% economic: 1) Prioritizează HP (RER 75% automat per kWh produs). 2) Adaugă PV mediu 3-5 kWp pentru auto-consum lighting + HP. 3) Solar termic doar dacă consum ACM mare (>200L/zi). 4) Baterie 5-10 kWh adaugă RER cu 10-15% (auto-consum 30%→70%). Cost-optim 2025: HP (10.000 EUR) + PV 5 kWp (6.000 EUR) — RER tipic 50-65% pentru RI.",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Programe finanțare regenerabile RO 2025-2027",
      changes: [
        {
          period: "2024-2026",
          title: "Casa Verde Plus — HP + solar",
          body: "Subvenție 30-50% cost instalație (max 6.000 EUR/HP, 3.000 EUR/ST). Eligibili: PF cu casă proprie.",
        },
        {
          period: "2024-2027",
          title: "Casa Verde Foto — PV",
          body: "Subvenție fixă 20.000 RON / instalație PV 3-5 kWp. Restanță Pasul 8 — link la dosar.",
        },
        {
          period: "2024-2027",
          title: "PNRR Componenta C5 — Eficiență",
          body: "Finanțare 30-70% pentru reabilitare profundă incluzând regenerabile. Eligibil bloc + casă.",
        },
        {
          period: "2025+",
          title: "PROSUMATOR Lege 226/2020",
          body: "Vânzare excedent PV la rețea cu compensare 1:1 (max 100 kWh/lună). Beneficiar trebuie să fie consumator final.",
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Configurații regenerabile atipice",
      cases: [
        {
          title: "☀️ PV-T (fotovoltaic + termic hibrid)",
          body: "Panou care produce simultan electricitate + apă caldă. Eficiență electrică ~17% + termică ~50% (răcirea celulei + colectare căldură). Util la suprafețe limitate de acoperiș (≤20 m²).",
        },
        {
          title: "🔥 Cogenerare microCHP gaz",
          body: "Micro-CHP 1-5 kWe produce electric + termic simultan. η_e ~25%, η_t ~70%, η_total ~95%. Util consum termic constant (hotel, spa). Combustibil gaz — RER 0 dacă fără biogaz.",
        },
        {
          title: "🌬️ Recuperare căldură ventilare grupată",
          body: "VMC HR + baterie de încălzire glycol înainte de unitatea HR (pre-heating). Util în zone reci (Zona V) unde aerul exterior -15°C riscă să înghețe schimbătorul.",
        },
        {
          title: "💧 Heat pump apă-apă (puț forat)",
          body: "Cea mai eficientă HP (SCOP 5+) folosind apă freatică 8-12°C. Necesită puț foraj + autorizație Apele Române. Cost mare 20-30.000 EUR. Doar la clădiri mari noi.",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export",
      title: "Regenerabile în documente",
      outputs: [
        { icon: "📜", format: "CPE Anexa 1 — Energie regenerabilă", description: "Tabel A.3 cu surse + producție + auto-consum.", planRequired: "AE IIci+" },
        { icon: "📊", format: "Raport Audit Cap. 4", description: "Analiză RER + scenarii recomandate + ROI.", planRequired: "AE Ici" },
        { icon: "🎓", format: "Dosar Casa Verde", description: "Fișă tehnică solar/PV/HP pentru aplicație finanțare.", planRequired: "AE Ici+" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări auditori regenerabile",
      items: [
        { q: "Cum tratez un PV deja existent pe acoperiș (instalat fără auditor)?", a: "Cere factura instalator + datele tehnice (kWp, tip celule, an instalare). Producție estimată = kWp × 1.150 (RO Zona III) × (1 - 0.005 × ani_vârstă). Atașează imagine vizibilă cu panourile la dosar." },
        { q: "Pompa căldură contează ca regenerabilă în orice condiție?", a: "DA, dacă SCOP_sezonal > 1/(1-0.75) = 4.0 (UE Directiva RES). În RO Mc 001 acceptă orice HP cu SCOP>2.5 ca sursă regenerabilă parțială. SCOP 4+ = 75% energie regenerabilă din total produs." },
        { q: "Pot include lemnul foc rezidențial ca biomasă?", a: "DA cu condiție: lemn local (max 50 km transport), uscat <20% umiditate, sobă cu η>0.65. Mc 001 §4.5 — atașează declarație origine + factură comercială." },
        { q: "Cum calculez excedentul PV vândut la rețea?", a: "Excedent = Producție - Auto-consum. Pentru Casa M2 PV 3 kWp: 3.300 × (1-0.30) = 2.310 kWh vândut. NU contează în RER. Valoare comercială ~ 250 RON/an la 0.10 EUR/kWh." },
        { q: "RER ≥30% pentru toate clădirile noi?", a: "Da pentru clădiri noi nZEB (Mc 001 §4.2). Pentru reabilitare clădiri existente nu e obligatoriu, dar contribuie la clasa superioară (peste E)." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 4",
      links: [
        { title: "PVGIS — Calculator PV oficial JRC", url: "https://re.jrc.ec.europa.eu/pvg_tools/en/", description: "Calculator open-source PVGIS v5.2" },
        { title: "Casa Verde Plus / Foto", url: "https://www.afm.ro/casa-verde-plus", description: "Programe finanțare AFM" },
        { title: "PROSUMATOR ANRE", url: "https://www.anre.ro/ro/info-consumatori/prosumatori", description: "Schema vânzare excedent PV" },
        { title: "Eurovent HP database", url: "https://www.eurovent-certification.com", description: "Catalog HP certificat cu SCOP_sezonal" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 5",
      title: "Ce am acoperit Pas 4",
      bullets: [
        "<b>RER</b> = E_regen_consumat_pe_loc / E_finală × 100. Doar auto-consum se contează.",
        "<b>HP cu SCOP 4</b> contribuie cu 75% energie regenerabilă automat.",
        "<b>PV fără baterie</b> = auto-consum ~30%; cu baterie ~70%.",
        "<b>Solar termic</b> 1-1.5 m²/persoană + stocare 50-75 L/m².",
        "<b>PVGIS v5.2</b> calibrat — producție estimată cu eroare <5%.",
        "<b>RER ≥30%</b> obligatoriu clădiri noi nZEB. Reabilitare opțional.",
      ],
      nextStep: "Pasul 5 — Calcul energetic: agregare bilanț lunar ISO 13790. Q_h_nd / η_total × fP = EP. Clasificare A+→G. CO₂. Cost anual.",
    },
  ],
};
