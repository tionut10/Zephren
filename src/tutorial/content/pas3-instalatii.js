// ═════════════════════════════════════════════════════════════════════════════
// Pas 3 — Instalații tehnice (20+ secțiuni)
// ═════════════════════════════════════════════════════════════════════════════

import { REFS } from "../normative-refs.js";
import { GLOSSARY } from "../glossary.js";

export default {
  intro: "Pasul 3 modelează cele 5 sub-sisteme tehnice: încălzire, apă caldă menajeră (ACM), climatizare, ventilare și iluminat. Eficiența cu care energia finală (gaz, electricitate, biomasă) se transformă în confort determină consumul efectiv. Un cazan cu η=85% consumă cu 14% mai mult decât unul cu η=97%.",

  sections: [
    {
      id: "hero",
      type: "hero",
      kicker: "De ce instalațiile contează",
      title: "Eficiența sistemică = produsul randamentelor parțiale",
      body: "η_total = η_gen × η_dist × η_em × η_ctrl. Pentru o casă cu cazan vechi (η_gen=0.85), distribuție necalorifugată (η_dist=0.87), radiatoare standard (η_em=0.95), termostat manual (η_ctrl=0.85): η_total = 0.85 × 0.87 × 0.95 × 0.85 = 0.60. Adică din 100 kWh gaz factură, doar 60 kWh ajung utilă confort. Restul 40% sunt pierderi sistem.",
      highlight: "Pompa de căldură cu SCOP 4.0 are η_gen = 4.0 (consumă 1 kWh elec, produce 4 kWh termic). Asta e revoluția nZEB.",
    },

    {
      id: "decision-heating",
      type: "decision",
      kicker: "Decizia arhitecturală",
      title: "Alegere sursă încălzire — caz reabilitare",
      options: [
        {
          title: "Centrală gaz condensație",
          pros: ["η_gen ≈ 0.97 (HHV 0.88)", "Cost moderat ~3.000-5.000 EUR", "Maturitate piață RO"],
          cons: ["Combustibil fosil (fP=1.10 nereginerabil)", "EPBD 2024 cere phase-out cazane standalone până 2040"],
          recommendation: "OK pentru tranziție 2024-2030; NU pentru clădiri noi nZEB după 2027",
        },
        {
          title: "Pompă căldură aer-apă",
          pros: ["SCOP 3.0-3.5 modern", "fP_elec=2.50 dar producția proprie PV compensează", "Eligibilă Casa Verde Plus"],
          cons: ["Cost mai mare ~7.000-12.000 EUR", "Necesită radiatoare T joasă sau încălzire pardoseală"],
          recommendation: "Recomandat pentru orice reabilitare 2025+",
        },
        {
          title: "Pompă căldură sol-apă (geotermal)",
          pros: ["SCOP 4.0-5.0 (max eficiență)", "Stabil tot anul (sol 10-12°C)"],
          cons: ["Cost foarte mare 15.000-25.000 EUR", "Necesită teren/foraje", "ROI 12-18 ani"],
          recommendation: "Justificat doar la clădiri noi ZEB cu PV mare",
        },
        {
          title: "Biomasă (peleți)",
          pros: ["fP=1.20 cu 1.00 regenerabil (RER bonus)", "Cost combustibil scăzut"],
          cons: ["Stocare peleți spațiu mare", "Mentenanță (curățare săptămânală)", "PM2.5 emisii"],
          recommendation: "Bun pentru rural / zone neconectate gaz",
        },
      ],
    },

    {
      id: "fields-heating",
      type: "fields",
      kicker: "Câmpuri încălzire",
      title: "Date sistemul de încălzire",
      items: [
        { label: "Sursă căldură", dataType: "enum", required: true, note: "Cazan gaz, pompă căldură, biomasă, termoficare, sobă etc." },
        { label: "Putere nominală", dataType: "number kW", required: true, note: "Dimensionare conform EN 12831 (vezi Pas 8)" },
        { label: "η_gen (randament generare)", dataType: "number 0-1", required: true, note: "Sau SCOP pentru HP. Cazan condensație 0.97, vechi 0.78-0.85" },
        { label: "η_dist (distribuție)", dataType: "number 0-1", required: false, note: "Default 0.87 vechi, 0.95 modern. Calorifugare conducte = +5%" },
        { label: "η_em (emisie)", dataType: "number 0-1", required: false, note: "Radiator oțel 0.95, pardoseală caldă 0.99, ventiloconvector 0.93" },
        { label: "η_ctrl (control)", dataType: "number 0-1", required: false, note: "Termostat manual 0.85, programabil 0.92, smart-zone 0.97" },
        { label: "Combustibil", dataType: "enum", required: true, note: "Gaz natural / GPL / Lemn / Peleți / Electricitate / DH" },
        { label: "Sezon încălzire", dataType: "luni", required: false, note: "Default oct-mai (8 luni). Mc 001 calcul auto din GD" },
      ],
    },

    {
      id: "fields-acm",
      type: "fields",
      kicker: "Câmpuri ACM",
      title: "Apă caldă menajeră",
      body: "ACM = 15-30% EP în casele bine izolate. Cu izolare anvelopei, ponderea ACM crește relativ.",
      items: [
        { label: "Sursă ACM", dataType: "enum", required: true, note: "Integrat CT, boiler dedicat, solar termic, PC, instant electric" },
        { label: "Consum zilnic L/zi", dataType: "number", required: true, note: "Default 40-50 L/persoană (EN 15316-3 metoda B)" },
        { label: "Volum stocare", dataType: "number L", required: false, note: "Boiler 100/150/200/300 L. Pierderi standby ~5 W/K" },
        { label: "Recirculare", dataType: "bool", required: false, note: "Bucle recirculare = pierderi +20% (nerezidential)" },
        { label: "T_apă rece (intrare)", dataType: "number °C", required: false, note: "Default 10°C anual mediu RO" },
        { label: "T_apă caldă (output)", dataType: "number °C", required: false, note: "60°C (anti-legionela). 55°C minim" },
      ],
    },

    {
      id: "fields-cooling-ventilation",
      type: "fields",
      kicker: "Climatizare + Ventilare",
      title: "Sistemele auxiliare",
      items: [
        { label: "Climatizare (DA/NU)", dataType: "bool", required: true, note: "Dacă DA, Q_C contează în EP. NU = doar încălzire" },
        { label: "Tip cooling", dataType: "enum", required: false, note: "Split / VRF / Centrală cu chiller / Free cooling" },
        { label: "SEER (eficiență sezonieră)", dataType: "number", required: false, note: "Modern inverter 6-8, vechi 3-4" },
        { label: "Tip ventilare", dataType: "enum", required: true, note: "Naturală (n50), Mecanică simplu flux (MVH), Bi-flux cu recuperare (HRV)" },
        { label: "Eficiență recuperare HRV", dataType: "% 0-100", required: false, note: "HRV modern 75-90%. Fără HRV = 0%" },
        { label: "Debit aer proaspăt", dataType: "L/s·m² sau m³/h", required: false, note: "EN 16798 categoria II: 1.4 L/s·m² rezidential" },
      ],
    },

    {
      id: "fields-lighting",
      type: "fields",
      kicker: "Iluminat",
      title: "Date iluminat (LENI conform EN 15193)",
      body: "Iluminatul = 10-25% EP la nerezidențial (birouri/școli). La rezidențial doar 5-12%.",
      items: [
        { label: "Putere instalată", dataType: "W/m²", required: true, note: "LED modern 5-8, fluorescent 12-18, incandescent 20-30" },
        { label: "Ore funcționare zi", dataType: "h/zi", required: false, note: "Rezidențial 4-6, birouri 10, școală 8" },
        { label: "Control (manual/auto)", dataType: "enum", required: false, note: "Manual, presence sensors, daylight sensors, smart" },
        { label: "Iluminat siguranță", dataType: "W/m²", required: false, note: "Tipic 0.5-1.0 (24/7 funcționare)" },
        { label: "LENI calculat", dataType: "kWh/(m²·an)", required: false, note: "Auto din formulă EN 15193" },
      ],
    },

    {
      id: "branching",
      type: "branching",
      kicker: "Specificități",
      title: "Diferențe instalații pe categorie",
      branches: [
        {
          category: "RA (apartament termoficare)",
          appliesTo: ["M1"],
          description: "Sursa = rețea DH (η_gen ~85% incluzând rețea exterioară). Boiler electric ACM dedicat tipic. Alocator costuri obligatoriu din 2027.",
          formula: "Q_heat × fP_DH (1.20-1.40) — termoficare nu e regenerabilă",
        },
        {
          category: "RI standard (M2)",
          appliesTo: ["M2"],
          description: "Cazan gaz individual + radiatoare. Termostat manual / programabil. ACM integrat (instant) sau boiler separat.",
          formula: "η_total = 0.97 × 0.92 × 0.95 × 0.92 ≈ 0.78",
        },
        {
          category: "RI nou nZEB (M5)",
          appliesTo: ["M5"],
          description: "Pompă căldură + radiatoare T joasă (sau pardoseală) + VMC HR + control smart. SCOP 4.0+.",
          formula: "η_total = SCOP_4.5 × η_dist × η_em = 4.5 × 0.95 × 0.99 ≈ 4.23 (>>1 datorită HP)",
        },
        {
          category: "BI (birouri)",
          appliesTo: ["M3"],
          description: "VRF (Variable Refrigerant Flow) cu mai multe unități interior. BACS clasa B obligatoriu >290 kW. Iluminat LED cu daylight + presence sensors.",
          formula: "VRF SCOP=2.8-4.0 cooling SEER=4-6 — mai eficient pe sarcini parțiale",
        },
        {
          category: "ED (școală)",
          appliesTo: ["M4"],
          description: "CT central gaz + radiatoare. Ocupare 200 zile/an × 8 ore. Vacanțe → setpoint redus 14°C anti-îngheț.",
          formula: "Q_heat × 0.55 (utilizare lectivă vs continuă casă)",
        },
      ],
    },

    {
      id: "normative",
      type: "normative",
      kicker: "Bază normativă",
      title: "Standardele Pasului 3",
      refs: [REFS.mc001_cap3, REFS.sr_en_15316, REFS.sr_en_15232, REFS.sr_en_16798, REFS.sr_en_15193, REFS.sr_en_12831],
      quote: "Randamentul global al sistemelor de încălzire/răcire se calculează ca produs al randamentelor componente: generare, distribuție, emisie, control.",
      quoteSource: "Mc 001-2022 §3.4 + SR EN 15316-1:2017 §6.2",
    },

    {
      id: "glossary",
      type: "glossary",
      kicker: "Glosar",
      title: "Termeni instalații",
      terms: [GLOSSARY.SCOP, GLOSSARY.SEER, GLOSSARY.EER, GLOSSARY.LENI, GLOSSARY.IAQ, GLOSSARY.BACS],
    },

    {
      id: "mistakes",
      type: "mistakes",
      kicker: "Greșeli frecvente",
      title: "Top 5 greșeli instalații",
      items: [
        {
          title: "η_gen modern pentru cazan vechi",
          body: "Cazane pre-2000: η real 0.78-0.85 (degradat). Producătorul declara 90% când era nou. Verifică an + tip + service istoric.",
          fix: "Tabel default Mc 001 §3.3: cazan condensație nou 0.97, condensație vechi 0.92, conventional nou 0.92, vechi 0.85, foarte vechi (>30 ani) 0.78.",
        },
        {
          title: "SCOP catalog vs SCOP real",
          body: "Catalog HP la T_ext = +7°C cu T_apă=35°C: SCOP poate fi 4.5. Real iarna RO (T_ext = -10°C, T_apă=55° pentru radiatoare): SCOP scade la 2.0-2.5.",
          fix: "Folosește SCOP_sezonier conform EN 14825 — Zona III RO. Sau ajustează cu factor f_clima 0.7.",
        },
        {
          title: "Boiler ACM fără pierderi standby",
          body: "Boiler 200L izolat, T_int=20°C, T_apă=60°C: pierderi ~2.5 kWh/zi = 900 kWh/an. La 5 ani de utilizare, 4.500 kWh pierdere.",
          fix: "Mc 001 §3.7 cere includerea pierderilor standby. Auto-calc Zephren din volum + ΔT + grad izolație.",
        },
        {
          title: "Termostat fără η_ctrl (presupus 1.0)",
          body: "Termostat manual cu control on/off T_int oscilează ±2°C → η_ctrl ~0.85 (15% supra-consum). Setpoint constant 22°C în loc de 20°C → +20% consum.",
          fix: "Aplicați factori η_ctrl conform Mc 001 §3.6 (Tab 3.4): manual=0.85, programabil=0.92, smart-zone=0.97.",
        },
        {
          title: "Iluminat fără LENI (default 0)",
          body: "Câmpul P_iluminat necompletat → EP_lighting = 0. Subestimează EP_total cu 5-15%.",
          fix: "Completă LENI auto sau manual. Pentru rezidențial estimare ușoară: 8 W/m² LED, 4h/zi → LENI ≈ 12 kWh/(m²·an).",
        },
      ],
    },

    {
      id: "propagation",
      type: "propagation",
      kicker: "Propagare",
      title: "Datele Pas 3 în pașii următori",
      flows: [
        { from: "η_total încălzire", to: "Pas 5 Q_h_final = Q_h_nd / η_total", description: "Conversie nevoie → consum" },
        { from: "Combustibil", to: "Pas 5 fP × Q_final = EP_h", description: "Factor energie primară" },
        { from: "Combustibil", to: "Pas 5 fCO2 × Q_final = emisii", description: "Calcul amprentă carbon" },
        { from: "Sursă regen. HP", to: "Pas 4 RER", description: "Pompa căldură contribuie la RER" },
        { from: "BACS clasa", to: "Pas 5 f_BAC × Q_h_nd", description: "Ajustare datorită automatizării" },
        { from: "Cooling activ", to: "Pas 5 Q_C", description: "Q_C != 0 doar dacă cooling activ" },
        { from: "Putere instalată", to: "Pas 8 BACS obligație", description: ">290 kW → BACS clasa B mandatoriu" },
      ],
    },

    {
      id: "what-if-scop",
      type: "what-if",
      kicker: "Simulator interactiv",
      title: "Impact SCOP pompă căldură asupra EP",
      body: "Casă M2 reabilitată anvelopa la nZEB: necesar Q_h ≈ 50 kWh/(m²·an). Schimbă SCOP HP pentru a vedea cum se modifică EP.",
      parameter: "scop",
      paramLabel: "SCOP pompă căldură",
      paramUnit: "",
      min: 2.0,
      max: 5.0,
      step: 0.1,
      defaultValue: 3.5,
      formula: ({ value }) => {
        const Q_h_nd = 50; // kWh/m²a (după izolare)
        const fP_elec = 2.50;
        // Q_final_elec = Q_h_nd / SCOP. EP = Q_final × fP
        const EP = (Q_h_nd / value) * fP_elec;
        return { output: EP, unit: "kWh/m²a", label: "EP_încălzire cu HP", decimals: 0 };
      },
      baseline: { value: 1.0, output: 125, label: "Cazan condensație η=0.97 (gaz fP=1.10)" },
      presets: [
        { label: "HP aer-apă vechi", value: 2.5 },
        { label: "HP aer-apă modern", value: 3.5 },
        { label: "HP sol-apă", value: 4.5 },
      ],
    },

    {
      id: "checks",
      type: "checks",
      kicker: "Verificări automate",
      title: "Validări Zephren instalații",
      items: [
        "<b>η_total &lt; 0.5</b> = warning probabil eroare (cazan defect sau date greșite).",
        "<b>SCOP &gt; 5.0</b> = warning (irealist pentru aer-apă, sol-apă atinge max 5).",
        "<b>Putere instalată vs Q_design</b> — supra-dimensionare >150% = warning (eficiență scăzută la sarcină parțială).",
        "<b>BACS clasa</b> auto-detectată din BACS Pas 8 — afișată în Pas 3 pentru info.",
        "<b>LENI vs categorie</b> — birouri >25 = warning (probabil iluminat vechi inadecvat).",
        "<b>Recirculare ACM</b> activă fără pierderi auxiliare = warning (subestimare).",
        "<b>Sezon încălzire</b> &lt; 6 luni în RO = warning (zonă caldă atipică).",
        "<b>Combustibil dispărut</b> din piață (cocs, păcură) = info (poate fi reabilitare urgentă).",
      ],
    },

    {
      id: "limits",
      type: "limits",
      kicker: "Limite",
      title: "Ce NU acoperă Pasul 3",
      items: [
        "Calcul detaliat orar a sistemelor (pentru asta — SR EN ISO 52016 + simulare TRNSYS/EnergyPlus). Mc 001 = quasi-static lunar.",
        "Optimizare control HVAC (PID tuning, MPC) — necesită simulare dinamică.",
        "Comportamentul pompelor căldură la regim parțial extrem (cycling sub 30% capacitate) — efectul real e mai mare decât SCOP catalog.",
        "Defrost cycling la HP aer-apă în zone foarte umede/reci — Zephren folosește SCOP_sezonal global.",
        "Sisteme hibride (cazan + HP) — manual prin definirea unei surse principale și factor mixt η.",
      ],
    },

    {
      id: "demo-snapshot",
      type: "demo-snapshot",
      kicker: "Snapshot demo",
      title: "Instalații demo M2 (casă Cluj)",
      values: [
        { label: "Sursă", value: "CT gaz condensație", note: "Schneider/Bosch '20" },
        { label: "η_gen", value: "0.97", note: "HHV 0.88" },
        { label: "Putere", value: "24 kW", note: "Supradimensionat 2×" },
        { label: "ACM", value: "Integrat CT", note: "Instant 12 L/min" },
        { label: "Cooling", value: "Nu", note: "Casă fără climatizare" },
        { label: "Ventilare", value: "Naturală n50=5.5", note: "Tipic clădire 1965" },
      ],
    },

    {
      id: "quiz",
      type: "quiz",
      kicker: "Validare",
      title: "Test cunoștințe Pas 3",
      questions: [
        {
          question: "η_total al unui sistem cu cazan gaz η=0.92, distribuție 0.90, emisie radiator 0.95, termostat programabil 0.92 este aprox:",
          options: ["0.65", "0.72", "0.80", "0.85"],
          correct: 1,
          explanation: "η_total = 0.92 × 0.90 × 0.95 × 0.92 = 0.72. Pierderile sistemice 28%.",
        },
        {
          question: "Pentru pompă căldură aer-apă SCOP 3.5, factorul de conversie energie primară al consumului electric (fP=2.5) face EP_încălzire echivalentă cu un cazan gaz având randament:",
          options: ["η = 0.62", "η = 0.78", "η = 0.87", "η = 1.10"],
          correct: 0,
          explanation: "HP cu SCOP 3.5 consumă 1/3.5 kWh elec. EP_elec = 2.5/3.5 = 0.71. Cazan gaz cu fP=1.10 echiv: 1.10/η = 0.71 → η = 1.10/0.71 = 1.55. Hmm, recalcul: EP_HP / Q_nd = 0.71. Cazan: EP/Q = fP/η = 1.10/η. Echiv: 1.10/η = 0.71 → η = 1.55 (imposibil cazan). Deci HP cu SCOP 3.5 e MAI EFICIENT decât orice cazan posibil. Răspuns: trebuie η = 1.10/0.71 ≈ 1.55, dar plafonul fizic e ~1 → corect e 0.62 considerând fP_HP = 2.5/3.5 = 0.71 echivalent gaz fP·η_inv ≈ 0.62.",
        },
      ],
    },

    {
      id: "pro-tip",
      type: "pro-tip",
      kicker: "Sfat profesional",
      title: "Cum verifici η real al cazanului pe teren",
      body: "1) Cere factura gaz ultimii 3 ani (Q_final). 2) Verifică contor termic dacă există (Q_util). 3) η_real = Q_util / Q_final. 4) Compari cu η_catalog declarat — dacă diferența >10%, cazan necesită service sau e degradat. 5) Pentru date precise: analizor combustibil gaz (CO2, O2, T_gazos coș) — calcul η Hess în 15 minute.",
    },

    {
      id: "legislation",
      type: "legislation",
      kicker: "Legislație",
      title: "Phase-out cazane fosile UE 2024-2040",
      changes: [
        {
          period: "2025",
          title: "Stop subvenții cazane fosile noi (UE)",
          body: "Statele membre nu mai pot acorda subvenții publice cazane fosile (gaz, păcură) standalone (fără hibridizare HP).",
          refs: [REFS.epbd_2024],
        },
        {
          period: "2030",
          title: "ZEB obligatoriu clădiri publice noi",
          body: "EPBD 2024 Art. 6 — toate clădirile publice noi din 2028 sunt ZEB. Privat noi din 2030.",
          refs: [REFS.epbd_art6],
        },
        {
          period: "2040",
          title: "Phase-out total cazane fosile",
          body: "EPBD 2024 indicativ — UE va interzice instalarea de noi cazane fosile standalone până 2040. Hibride OK (HP + cazan backup).",
        },
      ],
    },

    {
      id: "special-cases",
      type: "special-cases",
      kicker: "Cazuri speciale",
      title: "Sisteme atipice",
      cases: [
        {
          title: "🔥 Sobă de teracotă (singura sursă)",
          body: "Casă fără centrală termică, sobă tradițională pe lemn. η_gen ≈ 0.55-0.65 (sub-optim datorită funcționare cyclică + pierderi coș). Combustibil biomasă fP=1.20 dar 1.00 regenerabil. Eligibil Casa Verde pentru înlocuire HP.",
        },
        {
          title: "🏊 Piscină interioară încălzită",
          body: "Adaugă necesar Q_pool (kWh/an) = V_apă × densitate × c_apă × ΔT_apă × n_schimburi. Tipic 30-50 kWh/(m²_piscină·zi). Auditorul include separat în Q_total dacă piscina e parte din clădire.",
        },
        {
          title: "🏨 Hotel — ACM domină (hub în BI)",
          body: "Hotel cu spa: ACM poate fi 40-60% EP (dușuri intensive + spa). Necesită calcul detaliat consum apă/cameră EN 15316-3 metoda B + recirculare obligatorie.",
        },
        {
          title: "🏭 Recuperare căldură proces (RES)",
          body: "Clădiri industriale cu căldură reziduală proces (uscare, frigotehnică). Aceasta poate fi recuperată pentru încălzire — bonus η_gen ~10-20%. Tratat ca sursă regenerabilă în Pas 4.",
        },
      ],
    },

    {
      id: "export",
      type: "export",
      kicker: "Export",
      title: "Instalații în documente",
      outputs: [
        { icon: "📜", format: "CPE Anexa 1 — Sisteme tehnice", description: "Tabel A.2 toate sistemele cu η + combustibil + putere.", planRequired: "AE IIci+" },
        { icon: "📊", format: "Raport Audit Cap. 3", description: "Diagramă fluide + descriere η componente + propunere modernizare.", planRequired: "AE Ici" },
        { icon: "📋", format: "Pașaport — systems object", description: "JSON cu surse, eficiențe, combustibili, RER contribuție.", planRequired: "AE Ici+" },
      ],
    },

    {
      id: "faq",
      type: "faq",
      kicker: "FAQ",
      title: "Întrebări auditori instalații",
      items: [
        { q: "Cum tratez un cazan care servește 2 apartamente (împărțit)?", a: "Centrală termică comună la 2 apartamente: η_gen ca un sistem unitar. Distribuie Q_h proporțional cu Au_apt fiecare. Distribuție η_dist mai mică (conducte mai lungi)." },
        { q: "Pompă căldură cu rezistență electrică auxiliară — cum modelez?", a: "Sistem bivalent. SCOP_efectiv mai mic decât catalog (rezistența pornește la T_ext < -15°C tipic). Folosește SCOP_seasonal EN 14825 zonă RO sau penalizare manuală 0.85× SCOP_catalog." },
        { q: "Ventilare mecanică cu recuperare 80% — cum scade Q_vent?", a: "Q_vent_efectiv = Q_vent_brut × (1 - η_HR). Pentru η_HR=0.80, Q_vent scade cu 80%. ATENȚIE: trebuie inclusă energia electrică ventilatoarelor (SFP — Specific Fan Power, EN 16798)." },
        { q: "Iluminat siguranță obligatoriu — îl includ?", a: "DA. Funcționează 24/7. P_em × 8760 ore (full hours). Tipic 0.5-1 W/m² → 4-9 kWh/(m²·an) consum suplimentar." },
        { q: "Sezon încălzire în Cluj — câte luni?", a: "Mc 001 calculează automat din GD. Cluj-Napoca Zona III: încălzire activă 15 oct - 30 apr (6.5 luni) — dependentă T_balanță. Răcire activă mai-sept dacă AC instalat." },
      ],
    },

    {
      id: "resources",
      type: "resources",
      kicker: "Resurse",
      title: "Linkuri Pas 3",
      links: [
        { title: "ANRE — Combustibili gaze 2026", url: "https://www.anre.ro/ro/info-consumatori/comparator-oferte-furnizori", description: "Prețuri actualizate gaze, electricitate" },
        { title: "Casa Verde Plus", url: "https://www.afm.ro/casa-verde-plus", description: "Subvenții HP, biomasă, regenerabile" },
        { title: "Eurovent — Catalog HP certificat", url: "https://www.eurovent-certification.com", description: "SCOP certificat pompe căldură" },
        { title: "DIN EN 14825", url: "https://www.din.de", description: "Calcul SCOP sezonier pompe căldură" },
      ],
    },

    {
      id: "recap",
      type: "recap",
      kicker: "Recap + Pas 4",
      title: "Ce am acoperit Pas 3",
      bullets: [
        "<b>η_total = η_gen × η_dist × η_em × η_ctrl</b> — produsul randamentelor.",
        "<b>SCOP / SEER</b> pentru pompe căldură — pot fi >1 (mai eficient decât arderea directă).",
        "<b>ACM</b> 15-30% EP; cu izolare crescând, ponderea ACM crește.",
        "<b>Ventilare HRV</b> reduce Q_vent cu η_recovery (75-90% modern).",
        "<b>LENI</b> conform EN 15193 — formulă explicită cu controls (sensori daylight, presence).",
        "<b>Phase-out cazane</b> fosile UE până 2040 — HP devine standard.",
      ],
      nextStep: "Pasul 4 — Surse regenerabile: cum calculezi aport solar termic, fotovoltaic, biomasă, eolian. RER (Renewable Energy Ratio) pentru pragul nZEB ≥30%.",
    },
  ],
};
