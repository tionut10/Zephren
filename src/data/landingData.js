/**
 * landingData.js — Sursă de adevăr pentru pagina principală
 *
 * Importă direct din fișierele de date ale aplicației.
 * Vite urmărește aceste dependențe → orice modificare în
 * products.json, steps.json etc. actualizează automat landing-ul.
 */

import PRODUCTS   from "./products.json";
import STEPS      from "./steps.json";
import CLIMATE    from "./climate.json";
import BRIDGES    from "./thermal-bridges.json";
import NORMATIVE_RAW from "./normative.json";
import FEATURES_DATA from "./features.json";
export { CHANGELOG, APP_VERSION } from "./changelog.generated.js";
export {
  CALC_MODULES_COUNT,
  API_ENDPOINTS_COUNT,
  COMPONENTS_COUNT,
  IMPORT_SOURCES_COUNT,
  EXPORT_FORMATS_COUNT,
} from "./program-stats.generated.js";

// ── Date din registrul de funcționalități (features.json) ───
export const STEPS_DATA    = FEATURES_DATA.steps;
export const FEATURES      = FEATURES_DATA.main;
export const EXPORTS_DATA  = FEATURES_DATA.exports;
export const IMPORTS_DATA  = FEATURES_DATA.imports;
export const CALC_MODULES  = FEATURES_DATA.calcModules;

// ── Statistici produse (calculate din sursa reală) ──────────────────────────
export const PRODUCT_COUNTS = {
  windows:   PRODUCTS.windows?.length   ?? 0,
  heatPumps: PRODUCTS.heatPumps?.length ?? 0,
  pvPanels:  PRODUCTS.pvPanels?.length  ?? 0,
  inverters: PRODUCTS.inverters?.length ?? 0,
  batteries: PRODUCTS.batteries?.length ?? 0,
  boilers:   PRODUCTS.boilers?.length   ?? 0,
};
export const TOTAL_PRODUCTS = Object.values(PRODUCT_COUNTS).reduce((a, b) => a + b, 0);

// ── Statistici alte surse ────────────────────────────────────────────────────
export const CLIMATE_COUNT  = Array.isArray(CLIMATE) ? CLIMATE.length : 0;
export const BRIDGES_COUNT  = Array.isArray(BRIDGES) ? BRIDGES.length : 0;
export const STEPS_COUNT    = Array.isArray(STEPS)   ? STEPS.length   : 0;

// ── Normative integrate — editează src/data/normative.json ──────────────────
export const NORMATIVE       = NORMATIVE_RAW;
export const NORMATIVE_COUNT = NORMATIVE_RAW.length;

// APP_VERSION — derivat automat din changelog.generated.js (primul entry = CURENT)

// ── Statistici hero (auto-derivate din surse reale) ─────────────────────────
import {
  CALC_MODULES_COUNT as _CMC,
  API_ENDPOINTS_COUNT as _AEC,
} from "./program-stats.generated.js";

export const STATS = [
  { value: String(CLIMATE_COUNT), label: "Localități climatice" },
  { value: String(BRIDGES_COUNT), label: "Punți termice" },
  { value: String(_CMC),          label: "Module de calcul" },
  { value: String(NORMATIVE_COUNT),label: "Normative integrate" },
  { value: String(STEPS_COUNT),   label: "Pași calculator" },
];

// ── Categorii produse pentru secțiunea catalog ───────────────────────────────
export const PRODUCT_BRANDS = [
  {
    cat: "Ferestre & Uși",
    count: PRODUCT_COUNTS.windows,
    brands: "Rehau, Veka, Gealan, Salamander, Internorm, Schüco, Kömmerling, Aluplast, Deceuninck, Aluprof, FAKRO, Velux",
  },
  {
    cat: "Pompe de căldură",
    count: PRODUCT_COUNTS.heatPumps,
    brands: "Daikin, Viessmann, Bosch, Vaillant, Nibe, Mitsubishi, Panasonic, Samsung, LG, Toshiba, Buderus, Wolf, Stiebel Eltron, Atlantic",
  },
  {
    cat: "Panouri PV",
    count: PRODUCT_COUNTS.pvPanels,
    brands: "LONGi, JA Solar, Canadian Solar, Trina, Jinko, REC, SunPower, Q CELLS, Meyer Burger, Risen, Hyundai",
  },
  {
    cat: "Invertoare",
    count: PRODUCT_COUNTS.inverters,
    brands: "Fronius, SMA, Huawei, SolarEdge, GoodWe, Growatt, Deye, Sungrow, Victron",
  },
  {
    cat: "Baterii stocare",
    count: PRODUCT_COUNTS.batteries,
    brands: "BYD, Huawei, Pylontech, Tesla, LG, Sonnen, Alpha ESS",
  },
  {
    cat: "Centrale termice",
    count: PRODUCT_COUNTS.boilers,
    brands: "Viessmann, Vaillant, Bosch, Buderus, Wolf, Ariston, Immergas, Baxi, Ferroli, Protherm",
  },
];

// ── V3_FEATURES — generat din features.json (compatibilitate) ───────────────
export const V3_FEATURES = (FEATURES_DATA.main || []).map(f => ({
  icon: f.icon, title: f.title, desc: f.desc,
}));

// ── Planuri de prețuri v6.0 (25 apr 2026) ────────────────────────────────────
// Set 11 naming „Zephren X" + Birou (RO autentic) + tiered overage + EDU gratis
// Sursă completă: memorie pricing_strategy.md v6.0
// ────────────────────────────────────────────────────────────────────────────
export const PLANS = [
  {
    id: "free",
    name: "Zephren Free",
    price: "0",
    period: "",
    priceAn: null,
    discount: null,
    audience: "Evaluare gratuită · maxim 3 CPE/lună cu watermark",
    features: [
      "3 CPE/lună (hard cap)",
      "Calculator complet Step 1-7",
      "60 localități climatice",
      "165 punți termice interactive",
      "Export PDF/DOCX cu watermark DEMO",
    ],
    cta: "Începe gratuit",
    highlight: false,
  },
  {
    id: "edu",
    name: "Zephren Edu",
    price: "0",
    period: " cu dovadă",
    priceAn: null,
    discount: "Studenți, doctoranzi, absolvenți în curs de atestare MDLPA, stagiari în birouri de audit",
    audience: "Studenți · doctoranzi · absolvenți în curs de atestare MDLPA · stagiari în birouri de audit · CPE nelimitat cu watermark didactic",
    features: [
      "TOATE funcțiile Zephren Expert (Step 1-8 complet)",
      "AI Pack + BIM Pack incluse",
      "CPE NELIMITATE cu watermark SCOP DIDACTIC — practică reală, fără risc de emitere neoficială",
      "Pregătire proiect de atestare MDLPA — simulare completă CPE conform Ord. 348/2026",
      "Upgrade direct la AE IIci sau AE Ici la obținerea atestamentului — proiectele se păstrează",
      "Acces reînnoit la fiecare 6 luni cu dovadă valabilă",
      "Suport email 72h",
    ],
    cta: "Aplică cu dovadă",
    highlight: false,
    badge: "EDUCAȚIE",
  },
  {
    id: "audit",
    name: "Zephren AE IIci",
    subtitle: "Pentru auditori AE IIci · grad II civile · CPE locuințe (Art. 6 alin. 2)",
    price: "599",
    period: "/lună",
    priceAn: null,
    discount: null,
    vatIncluded: true,
    audience: "Auditor energetic AE IIci · grad II civile · CPE locuințe (case + bloc nou + apartament)",
    legalScope: "Conform Art. 6 alin. (2) Ord. MDLPA 348/2026: locuințe unifamiliale + blocuri de locuințe + apartamente",
    features: [
      "Step 1-6 complet (CPE + Anexa 1+2 MDLPA oficial)",
      "Restricție legală: doar clădiri rezidențiale (case, blocuri, apartamente)",
      "Export DOCX MDLPA + XML registru + PDF/A",
      "Submit portal MDLPA + ștampilă AE IIci 40mm",
      "AI Pack inclus (OCR facturi/CPE + chat import + AI assistant)",
      "Cloud sync NELIMITAT · ANCPI cadastru · CPETracker + Alerts",
      "BACS A-D simplu + SRI auto + MEPS check binar (EPBD)",
      "Suport email 48h",
      "1 utilizator",
    ],
    cta: "Activează AE IIci",
    highlight: false,
    badge: "AE IIci",
  },
  {
    id: "pro",
    name: "Zephren AE Ici",
    subtitle: "Pentru auditori AE Ici · grad I civile · CPE + audit + nZEB toate clădirile (Art. 6 alin. 1)",
    price: "1.499",
    period: "/lună",
    priceAn: null,
    discount: null,
    vatIncluded: true,
    audience: "Auditor energetic AE Ici · grad I civile · CPE + audit + nZEB toate clădirile (rezidențial + nerezidențial + public)",
    legalScope: "Conform Art. 6 alin. (1) Ord. MDLPA 348/2026: toate categoriile + audit energetic + raport conformare nZEB",
    features: [
      "Step 1-7 COMPLET — TOATE clădirile (rezidențial + nerezidențial + public)",
      "Audit energetic complet Mc 001-2022 + raport audit",
      "Raport conformare nZEB pentru clădiri în faza de proiectare (Art. 6 lit. c)",
      "AI Pack inclus (OCR facturi/CPE + chat import + AI assistant)",
      "BACS A-D + SRI auto + MEPS check (conform EPBD)",
      "Cloud sync NELIMITAT · CPETracker + Alerts",
      "Climate import EPW + TMY orar",
      "Submit portal MDLPA + ștampilă AE Ici 40mm",
      "Suport prioritar 24h",
      "1 utilizator",
    ],
    cta: "Activează AE Ici",
    highlight: true,
    badge: "POPULAR · AE Ici",
  },
  {
    id: "expert",
    name: "Zephren Expert",
    subtitle: "Pentru auditori AE Ici senior + consultanți · scop complet + 18 module avansate Step 8",
    price: "2.999",
    period: "/lună",
    priceAn: null,
    discount: null,
    vatIncluded: true,
    audience: "Auditor senior AE Ici + consultant · CPE + audit + nZEB + BIM + Pasivhaus + MonteCarlo",
    features: [
      "Tot Zephren AE Ici, plus:",
      "Step 8 COMPLET (18 module avansate)",
      "BIM Pack inclus (IFC/Revit/ArchiCAD import)",
      "MonteCarloEP · Pasivhaus · PMV/PPD ISO 7730",
      "PortfolioDashboard multi-clădire · ThermovisionModule",
      "BACS detaliat 200 factori · SRI complet 42 servicii",
      "MEPS optimizator + roadmap 2030/2033/2050",
      "EN 12831 sarcini per cameră · UrbanHeatIsland",
      "Historic + Mixed-use buildings · Acoustic P 122-89",
      "ConsumReconciliere + ConsumoTracker",
      "Night ventilation · Shading dynamic · Cooling hourly",
      "1 utilizator",
    ],
    cta: "Activează Expert",
    highlight: false,
  },
  {
    id: "birou",
    name: "Zephren Birou",
    subtitle: "Pentru birouri 2-5 auditori (mix AE Ici + AE IIci) · CPE + audit NELIMITAT · preț FIX per birou",
    price: "5.999",
    period: "/lună",
    priceAn: null,
    discount: null,
    vatIncluded: true,
    tierNote: "2–5 utilizatori · CPE + audit NELIMITAT pentru toți",
    audience: "Birou audit 2-5 auditori (AE Ici și/sau AE IIci) · CPE + audit NELIMITAT pentru toți · preț FIX per birou",
    features: [
      "Tot Zephren Expert × 2-5 utilizatori",
      "CPE NELIMITAT (rollover 6 luni)",
      "Audituri energetice NELIMITATE",
      "TeamDashboard multi-user + Calendar audit echipă",
      "White-label complet (branding firmă)",
      "API access (integrări CRM/ERP)",
      "Facturare pe firmă (CUI, date fiscale)",
      "Manager cont dedicat (junior)",
      "Training inclus 2 ore",
      "Suport email 12h",
    ],
    cta: "Activează Birou",
    highlight: false,
  },
  {
    id: "enterprise",
    name: "Zephren Enterprise",
    subtitle: "Pentru organizații 6-100+ auditori (toate gradele) · SLA 99.9% + INCERC validation",
    price: "9.999",
    period: "/lună",
    priceAn: null,
    discount: null,
    vatIncluded: true,
    tierNote: "6-100+ utilizatori · SLA 99.9% · volum negociat",
    audience: "Organizații 6-100+ auditori (toate gradele AE Ici / AE IIci) · CPE + audit NELIMITAT · SLA 99.9% · INCERC validation",
    features: [
      "Tot Zephren Birou, plus:",
      "6-100+ utilizatori (volume scaling)",
      "CPE + audit NELIMITAT pentru toți utilizatorii",
      "SLA garantat 99.9%",
      "Manager cont dedicat senior",
      "Training inclus 8 ore",
      "Contract personalizat",
      "Camere, ordine profesionale, municipalități",
      "INCERC validation roadmap",
      "Suport email 4h",
    ],
    cta: "Contactează-ne",
    highlight: false,
  },
];

// ── Pay-per-use (fără abonament) — DOAR Pașaport Renovare (v6.0 25 apr 2026)
// ── Eliminat: CPE single 99, Pachet 10 CPE 790, CPE+Step 8 199
// ── Motiv: abonamentul Audit 199 RON oferă break-even la 2 CPE/lună,
// ── deci pay-per-use pentru auditori e canibalizat de abonament.
// ── Pașaportul rămâne pentru proprietari & clienți NON-auditori care au
// ── nevoie de Pașaport EPBD obligatoriu (29 mai 2026) fără să fie atestați.
// Pașaport Renovare dezactivat până la intrarea în vigoare a Directivei EPBD (29 mai 2026)
// Reactiv array-ul de mai jos pentru a-l reactiva în landing.
export const PAY_PER_USE = [];

// ── Categorii pricing pentru afișare landing ───────────────────────────────
// Layout recomandat: rând 1 = Free + Audit + Pro + Expert (4 carduri)
//                    rând 2 = Birou + Enterprise (2 carduri)
//                    rând 3 = Edu (banner separat „pentru educație")
//                    rând 4 = Pay-per-use (banner separat)
export const PLAN_LAYOUT = {
  primary:    ["free", "audit", "pro", "expert"],
  team:       ["birou", "enterprise"],
  education:  ["edu"],
  payPerUse:  PAY_PER_USE.map(p => p.id),
};
