import { useState } from "react";
import { cn } from "../components/ui.jsx";
import { inferData } from "./QuickFillWizard.jsx";

// ── Template demo: Casă individuală 1985, neizolată, gaz clasic, Cluj-Napoca ─
export const DEMO_ANSWERS = {
  type:        "house",
  period:      "p1981_89",
  insulation:  "none",
  heating:     "gaz_conv",
  ventilation: "nat",
  windows:     "old_dbl",
  dimensions:  { areaUseful: "120", floors: "P+1E", city: "Cluj-Napoca", county: "CJ", address: "Str. Independenței 14" },
  scope:       "vanzare",
};

export const DEMO = inferData(DEMO_ANSWERS);
const D = DEMO;

// ── Profil demo vizibil în header ────────────────────────────────────────────
const DEMO_PROFILE = "🏡 Casă individuală · 1985 · neizolată · gaz clasic · 120 m² · Cluj-Napoca";

// ── Conținut detaliat pe fiecare pas ─────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    title: "Identificare clădire",
    icon: "📋",
    subtitle: "Date generale, geometrie, climă",
    description:
      "Pasul 1 stabilește identitatea clădirii și parametrii de bază. Toate calculele ulterioare (EP, nZEB, CO₂) depind de suprafața utilă Au și de zona climatică. Exemplul demo urmărește o casă individuală din 1985, neizolată, din Cluj-Napoca.",
    fields: [
      { label: "Adresă + localitate + județ", value: `${D.building.address}, ${D.building.city}, ${D.building.county}`, note: "auto-completare OSM" },
      { label: "Categorie funcțională", value: "RI — Rezidențial individual", note: "determină limitele nZEB" },
      { label: "Suprafață utilă (Au)", value: `${D.building.areaUseful} m²`, note: "câmp obligatoriu — EP se raportează la Au" },
      { label: "Volum interior (V)", value: `${D.building.volume} m³`, note: "estimat din Au × h_nivel × nr. niveluri" },
      { label: "An construcție", value: D.building.yearBuilt, note: "perioadă panouri / zidărie, pre-normă termică" },
      { label: "Regim înălțime", value: "P+1E (2 niveluri)", note: "" },
      { label: "Înălțime nivel", value: `${D.building.heightFloor} m`, note: "implicit pentru casă individuală" },
      { label: "Etanșeitate la aer (n₅₀)", value: `${D.building.n50} h⁻¹`, note: "clădire veche, fără lucrări de etanșare" },
    ],
    checks: [
      "Zona climatică se detectează automat din localitate (Cluj-Napoca → Zona II)",
      "Raportul A/V (anvelopă / volum) se calculează automat — normal 0.4–0.8",
      "Clădirile construite înainte de 1990 au de obicei U_pereți > 1.0 W/m²K",
    ],
    tip: "Cap. 1 Mc 001-2022 — Datele de identificare sunt obligatorii în certificatul CPE.",
    mistake: "Greșeală frecventă: Au ≠ Ac. Au este suprafața locuită (fără grosimea pereților), Ac include structura.",
    impact: "Au incorect cu ±10% → EP se modifică invers proporțional → risc clasare greșită.",
    color: "amber",
  },
  {
    id: 2,
    title: "Anvelopa termică",
    icon: "🏗️",
    subtitle: "Elemente opace, vitraje, punți termice",
    description:
      `Anvelopa este stratul dintre interior și exterior: pereți, planșee, terasă, ferestre, uși. Pentru casa demo (${D.building.yearBuilt}, neizolată), pierderile prin anvelopă reprezintă 70–80% din necesarul de căldură.`,
    fields: [
      { label: "Perete exterior (PE)", value: `Zidărie 30 cm, neizolat → U = ${D._meta.upe.toFixed(2)} W/m²K, S = ${D.opaqueElements[0]?.area || "—"} m²`, note: "tipic 1981–1989" },
      { label: "Planșeu sub pod (PP)", value: `Beton 15 cm → U = ${D._meta.upt.toFixed(2)} W/m²K, S = ${D.opaqueElements[1]?.area || "—"} m²`, note: "fără izolație suplimentară" },
      { label: "Planșeu pe sol / subsol (PB)", value: `Beton 15 cm → U = ${D._meta.upl.toFixed(2)} W/m²K, S = ${D.opaqueElements[2]?.area || "—"} m²`, note: "" },
      { label: "Ferestre dublu vitraj vechi", value: `Uw = ${D._meta.u_win} W/m²K, g = ${D.glazingElements[0]?.g || "0.70"}, S = ${D._meta.glazingArea} m²`, note: "termopan '90–2000, ramă PVC simplă" },
      { label: "Punte termică — planșeu terasă", value: `ψ = ${D.thermalBridges[0]?.psi || "0.50"} W/mK × ${D.thermalBridges[0]?.length || "—"} m = ${((parseFloat(D.thermalBridges[0]?.psi||0.5))*(parseFloat(D.thermalBridges[0]?.length||31))).toFixed(1)} W/K`, note: "din catalog tipologic" },
    ],
    checks: [
      "U calculat vs U_ref nZEB → coloana verde/portocaliu în tabel (pereți: U_ref = 0.35 W/m²K)",
      "Suprafața vitrajelor să nu depășească 40% din suprafața pereților (confort vară)",
      "Verificare condens Glaser (tab dedicat în pasul 2) — risc ridicat la U_perete = 1.00",
    ],
    tip: "Cap. 2 Mc 001-2022 + C107/3 — U_ref nZEB rezidențial: pereți ≤ 0.35, planșee ≤ 0.20, ferestre ≤ 1.30 W/m²K.",
    mistake: "Greșeală frecventă: omiterea punților termice. La clădiri vechi, pierderile prin punți pot reprezenta 15–25% din total.",
    impact: `Izolarea pereților cu 10 cm EPS reduce U_perete de la ${D._meta.upe.toFixed(2)} → 0.35 W/m²K și EP_heating cu ~35–45%.`,
    color: "sky",
  },
  {
    id: 3,
    title: "Instalații tehnice",
    icon: "⚙️",
    subtitle: "Încălzire, ACM, climatizare, ventilare, iluminat",
    description:
      "Instalațiile determină eficiența cu care energia finală (gaz, electricitate) se transformă în confort. Pentru casa demo, cazanul convențional cu η = 85% este tipic pentru clădirile din perioadă.",
    fields: [
      { label: "Sursă căldură", value: `Centrală termică gaz convențional, η_gen = ${D.heating.eta_gen}`, note: "cazan pre-condensație, tipic pre-2000" },
      { label: "Sistem emisie", value: "Radiatoare oțel (η_em = 0.95)", note: "pardoseală caldă → η_em = 0.99" },
      { label: "Distribuție + control", value: "η_dist = 0.87, termostat manual η_ctrl = 0.85", note: "fără programare automată" },
      { label: "ACM — sursă", value: `Boiler integrat în centrală (${D.acm.source})`, note: `necesar estimat: ${D.acm.dailyLiters} L/zi` },
      { label: "Ventilare", value: `Naturală (infiltrații n₅₀ = ${D.building.n50} h⁻¹)`, note: "fără recuperare — pierderi mari iarnă" },
      { label: "Iluminat", value: `Fluorescent + incandescent, ρ = ${D.lighting.pDensity} W/m²`, note: "LENI ≈ 20 kWh/(m²·an)" },
    ],
    checks: [
      "Combustibilul gaz natural → fP_gaz = 1.1 (factor conversie energie primară, 2024)",
      "Randamentul total = η_gen × η_dist × η_ctrl = 0.85 × 0.87 × 0.85 = 0.63",
      "Ventilarea mecanică cu recuperare poate reduce EP_ventilare cu 70%",
    ],
    tip: "Cap. 3 Mc 001-2022 + EN 15316 — Factorul fP al electricității se actualizează anual de ANRE.",
    mistake: "Greșeală frecventă: η_gen pentru cazane vechi (pre-2000) este 75–85%, nu 90–95%.",
    impact: "Înlocuirea cazanului clasic (η=85%) cu condensație (η=97%) reduce EP cu ~12–15%.",
    color: "orange",
  },
  {
    id: 4,
    title: "Surse regenerabile",
    icon: "☀️",
    subtitle: "Solar termic, fotovoltaic, pompă de căldură",
    description:
      "Regenerabilele reduc energia primară consumată și cresc indicatorul RER. Casa demo (1985, neizolată) are RER = 0% — stare inițială fără nicio sursă regenerabilă.",
    fields: [
      { label: "Stare inițială demo", value: "RER = 0% — fără regenerabile", note: "clădire nemodificată din 1985" },
      { label: "Scenariu: solar termic", value: "2.0 m², inclinare 45°, SUD, η_col = 68%", note: "acoperă ~40% necesar ACM" },
      { label: "Scenariu: fotovoltaic", value: "3 kWp, inclinare 35°, SUD, η_inv = 97%", note: "producție ≈ 3.300 kWh/an în Cluj" },
      { label: "Scenariu: pompă de căldură", value: "Aer-apă, SCOP = 3.2, înlocuiește cazanul", note: "necesar la reabilitare spre clasa A" },
    ],
    checks: [
      "RER se calculează automat după completarea producției regenerabile",
      "Orientarea optimă în România: SUD ±15°, inclinare 30–45°",
      "PV auto-consum: excedentul vândut în rețea nu reduce EP (doar cel consumat pe loc)",
    ],
    tip: "Anexa 1 Mc 001-2022 — RER = Energie regenerabilă / Energie finală totală × 100.",
    mistake: "Greșeală frecventă: includerea producției PV totale în RER. Doar energia consumată pe loc se contabilizează.",
    impact: "2 m² solar termic + 3 kWp PV → RER ≈ 22–28% pentru această casă (aproape de pragul nZEB de 30%).",
    color: "emerald",
  },
  {
    id: 5,
    title: "Calcul energetic",
    icon: "📊",
    subtitle: "EP total, clasare A+–G, CO₂, costuri",
    description:
      "Pasul 5 agregă toți parametrii și calculează energia primară (EP) conform ISO 13790. Pentru casa demo (1985, neizolată, gaz clasic), rezultatul așteptat este Clasa E–F.",
    fields: [
      { label: "EP_încălzire (dominantă)", value: "≈ 185 kWh/(m²·an)", note: "U_perete = 1.00, cazan η = 0.85" },
      { label: "EP_ACM", value: "≈ 35 kWh/(m²·an)", note: "120 m², 40 L/zi, cazan gaz" },
      { label: "EP_iluminat", value: "≈ 12 kWh/(m²·an)", note: "fluorescent × fP_el = 2.0" },
      { label: "EP_total", value: "≈ 232 kWh/(m²·an) → Clasa F", note: "limita nZEB RI = 125 kWh/(m²·an)" },
      { label: "CO₂", value: "≈ 47 kgCO₂eq/(m²·an)", note: "inclus în CPE din 2024 (EPBD IV)" },
      { label: "Cost estimat", value: "≈ 5.200 RON/an", note: "gaz + electricitate, prețuri 2025" },
    ],
    checks: [
      "Bilanțul lunar (grafic): lunile cu Q_heat > 0 trebuie să scadă după izolare",
      "Diagrama Sankey arată distribuția EP pe categorii (hover pentru valori)",
      "Verificare nZEB: butonul verde/roșu în partea de jos — casa demo este NON-CONFORM",
    ],
    tip: "Cap. 5 Mc 001-2022 + ISO 13790:2008 — Calcul cvasistationar lunar, factor de utilizare η_H.",
    mistake: "Greșeală frecventă: confuzie energie finală vs. energie primară. EP = Ef × fP (factorul de conversie).",
    impact: "Diferența dintre Clasa F (232) și clasa nZEB B (125 kWh/m²an) necesită reabilitare completă: izolație + ferestre noi + cazan condensație.",
    color: "violet",
  },
  {
    id: 6,
    title: "Certificat CPE",
    icon: "📜",
    subtitle: "Export PDF, DOCX, XML MDLPA",
    description:
      "Certificatul de Performanță Energetică (CPE) este documentul oficial reglementat de Mc 001-2022. Casa demo primește Clasa F la starea inițială — un rezultat frecvent pentru clădirile din 1985 neizolate.",
    fields: [
      { label: "Date auditor", value: "Nume complet, nr. certificat MDLPA, dată emitere", note: "obligatorii pentru export oficial" },
      { label: "Dată expirare CPE", value: "10 ani de la emitere", note: "sau la tranzacție/renovare majoră" },
      { label: "Export PDF", value: "Raport complet format A4, pagini 1–4", note: "include grafic scală A+–G cu Clasa F evidențiată" },
      { label: "Export DOCX", value: "Template Mc 001 editabil", note: "necesită plan Standard+" },
      { label: "Export XML MDLPA", value: "Format oficial pentru Registrul CPE", note: "necesită plan Pro" },
      { label: "QR Code sharing", value: "Link read-only pentru proprietar/cumpărător", note: "gratuit, nu expiră" },
    ],
    checks: [
      "Completați datele auditorului înainte de export — câmpuri marcate cu *",
      "Verificați clasa CO₂ — obligatorie în CPE conform EPBD IV (2024)",
      "XML-ul generat respectă schema MDLPA v2.1 (actualizată apr. 2024)",
    ],
    tip: "Art. 13 L.372/2005 mod. L.238/2024 — CPE obligatoriu la vânzare, închiriere, dare în administrare.",
    mistake: "Greșeală frecventă: emiterea CPE fără completarea Anexei nr. 2 (Recomandări de reabilitare).",
    impact: "CPE Clasa F vs Clasa B poate reduce prețul de vânzare al proprietății cu 20–30% (studii UE 2023).",
    color: "amber",
  },
  {
    id: 7,
    title: "Audit energetic",
    icon: "🔍",
    subtitle: "Consum real, scenarii reabilitare, ROI",
    description:
      "Auditul energetic compară consumul calculat cu cel real (din facturi) și propune scenarii de reabilitare prioritizate. Pentru casa demo de 120 m² Clasa F, trei scenarii duc spre nZEB.",
    fields: [
      { label: "Consum facturat gaz 2023", value: "≈ 22.000 kWh/an (facturi colectate)", note: "se poate importa cu OCR" },
      { label: "Consum calculat demo", value: "≈ 25.600 kWh/an (EP × Au / fP)", note: "diferență 16% — acceptabilă < 20%" },
      { label: "Scenariu S1 — Izolație pereți 10 cm EPS", value: "Invest: 9.000 EUR → EP: 155 → Cls D, payback 7 ani", note: "" },
      { label: "Scenariu S2 — S1 + ferestre Low-E + VMC", value: "Invest: 18.000 EUR → EP: 108 → Cls B, payback 10 ani", note: "" },
      { label: "Scenariu S3 — S2 + pompă căldură + PV", value: "Invest: 30.000 EUR → EP: 65 → Cls A, payback 13 ani", note: "" },
    ],
    checks: [
      "Diferența consum real/calculat > 20% → verificați tipologia de utilizare (ore ocupare, T_int)",
      "Costul specific reabilitare: ~200–350 EUR/m² pentru rehab completă la nZEB (casă 120 m²)",
      "PNRR 2024: finanțare 30–50% din investiție eligibilă (tab PNRR în Pasul 8)",
    ],
    tip: "Ord. MDLPA 2461/2011 mod. 2023 — Auditorul atestat semnează Raportul de Audit Energetic.",
    mistake: "Greșeală frecventă: scenariile de reabilitare parțială (doar ferestre sau doar izolație) nu ating nZEB.",
    impact: "Scenariu S2 complet → economie ≈ 1.500 EUR/an → plus valoare proprietate ≈ 12.000–18.000 EUR.",
    color: "red",
  },
  {
    id: 8,
    title: "Instrumente avansate",
    icon: "🔬",
    subtitle: "nZEB, PNRR, sarcina termică, export XML",
    description:
      "Step 8 conține instrumente specializate: verificare nZEB conform EPBD IV, calcul sarcină termică EN 12831, eligibilitate fonduri europene. Casa demo este NON-CONFORM nZEB la starea inițială.",
    fields: [
      { label: "Verificare nZEB", value: "EP_calc = 232 > EP_max_nZEB = 125 → NON-CONFORM", note: "limita RI conform Mc 001-2022" },
      { label: "Sarcina termică EN 12831", value: "Φ_design ≈ 9.5 kW (79 W/m²)", note: "pentru dimensionare instalații rehab" },
      { label: "Eligibilitate PNRR", value: "DA — reducere EP > 30% posibilă, cost eligibil ≈ 15.000 EUR", note: "calcul orientativ S1+S2" },
      { label: "Verificare Pasivhaus", value: "NON-CONFORM — necesită Q_heat ≤ 15 kWh/(m²·an)", note: "standard voluntar, mult mai strict" },
      { label: "Export XML MDLPA", value: "Fișier .xml conform schemei oficiale v2.1", note: "pentru înregistrare Registru CPE" },
      { label: "Benchmark național", value: "Casa demo vs. stocul similar — percentila 40%", note: "mai bine ca 40% din casele din 1985" },
    ],
    checks: [
      "BACS (EN 15232): clădiri nerezidențiale > 290 kW trebuie să dețină BMS clasa B minim",
      "SRI (Smart Readiness Indicator) — obligatoriu în rapoartele de audit din 2025",
      "Tracker CPE — monitorizare portofoliu, alerte expirare certificate",
    ],
    tip: "EPBD IV (2024/1275/EU) + Mc 001-2022 rev. — Clădirile rezidențiale existente trebuie să atingă cel puțin Clasa E până în 2030.",
    mistake: "Greșeală frecventă: confuzie Pasivhaus (standard voluntar) cu nZEB (cerință legală). Sunt standarde diferite.",
    impact: "Un SRI ridicat crește atractivitatea clădirii pe piața de leasing și poate accesa finanțări verzi bancare.",
    color: "purple",
  },
];

const COLOR_MAP = {
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   dot: "bg-amber-500",   active: "bg-amber-500 border-amber-400 text-black" },
  sky:     { bg: "bg-sky-500/10",     border: "border-sky-500/30",     text: "text-sky-400",     dot: "bg-sky-500",     active: "bg-sky-500 border-sky-400 text-white" },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  dot: "bg-orange-500",  active: "bg-orange-500 border-orange-400 text-white" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500", active: "bg-emerald-500 border-emerald-400 text-white" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-400",  dot: "bg-violet-500",  active: "bg-violet-500 border-violet-400 text-white" },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     dot: "bg-red-500",     active: "bg-red-500 border-red-400 text-white" },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  dot: "bg-purple-500",  active: "bg-purple-500 border-purple-400 text-white" },
};

export default function TutorialWizard({ onClose, onApplyExample }) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const progress = Math.round(((step + 1) / total) * 100);
  const c = COLOR_MAP[current.color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">

        {/* Progress bar */}
        <div className="h-1 rounded-t-2xl bg-slate-800 overflow-hidden shrink-0">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{current.icon}</span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Pas {step + 1} din {total} — Tutorial interactiv
              </div>
              <h2 className="text-base font-bold text-white leading-tight">{current.title}</h2>
              <p className="text-[10px] text-slate-400">{current.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700" aria-label="Închide tutorialul">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Demo profile banner */}
        <div className="px-5 py-2 bg-indigo-500/8 border-b border-indigo-500/15 shrink-0">
          <p className="text-[10px] text-indigo-300/80 leading-snug">
            <span className="font-semibold text-indigo-300">Exemplu demo:</span> {DEMO_PROFILE}
          </p>
        </div>

        {/* Body — scrollabil */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Sidebar — step navigator */}
          <div className="hidden sm:flex flex-col gap-0.5 p-3 border-r border-slate-800 shrink-0 w-[130px] overflow-y-auto">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const sc = COLOR_MAP[s.color];
              return (
                <button key={i} onClick={() => setStep(i)}
                  className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-[10px] font-medium",
                    active ? cn(sc.bg, sc.border, "border", sc.text) :
                    done ? "text-emerald-400 hover:bg-emerald-500/10" :
                    "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  )}>
                  <span className={cn("w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold border",
                    active ? cn(sc.dot, "border-transparent text-white") :
                    done ? "bg-emerald-600 border-emerald-500 text-white" :
                    "bg-slate-800 border-slate-600 text-slate-500"
                  )}>
                    {done ? "✓" : s.id}
                  </span>
                  <span className="leading-tight truncate">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

            {/* Descriere */}
            <p className="text-sm text-slate-300 leading-relaxed">{current.description}</p>

            {/* Câmpuri de completat */}
            <div>
              <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", c.text)}>
                Ce completezi în acest pas
              </div>
              <div className="space-y-1.5">
                {current.fields.map((f, i) => (
                  <div key={i} className={cn("flex items-start gap-3 rounded-lg px-3 py-2", c.bg, "border", c.border)}>
                    <span className={cn("mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center text-[8px]", c.dot, "text-white font-bold")}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-300 font-medium">{f.label}</span>
                      <span className="text-xs font-mono text-white ml-2">→ {f.value}</span>
                      {f.note && <span className="text-[10px] text-slate-500 ml-2">({f.note})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verificări */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 mb-2">
                Ce să verifici
              </div>
              <ul className="space-y-1">
                {current.checks.map((ch, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                    <span className="text-sky-500 mt-0.5 shrink-0">✓</span>
                    {ch}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sfat normativ + Greșeală frecventă side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">📖 Bază normativă</div>
                <p className="text-xs text-amber-100/80 leading-relaxed">{current.tip}</p>
              </div>
              <div className="rounded-xl bg-red-500/8 border border-red-500/20 px-3 py-2.5">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">⚠ Greșeală frecventă</div>
                <p className="text-xs text-red-100/80 leading-relaxed">{current.mistake}</p>
              </div>
            </div>

            {/* Impact */}
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2.5">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">💡 Impact asupra rezultatelor</div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">{current.impact}</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 gap-3 shrink-0">
          {/* Mobile step counter */}
          <div className="sm:hidden text-[10px] text-slate-500">
            {step + 1}/{total}
          </div>

          <button onClick={onClose} className="hidden sm:block text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
            Închide
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                step === 0 ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              )}>
              ← Anterior
            </button>

            {step < total - 1 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="px-4 py-1.5 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20">
                Următor →
              </button>
            ) : (
              <button onClick={() => onApplyExample(DEMO)}
                className="px-4 py-1.5 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20">
                🎓 Aplică exemplu & pornește
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
