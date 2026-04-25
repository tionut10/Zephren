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
  { value: `${TOTAL_PRODUCTS}+`,  label: "Produse în catalog" },
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
    audience: "Demo public",
    features: [
      "3 CPE/lună (hard cap)",
      "Calculator complet Step 1-7",
      "60 localități climatice",
      "165 punți termice interactive",
      "413+ produse în catalog",
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
    discount: "Pentru studenți, doctoranzi, profesori, trainee OAER, cercetători",
    audience: "Educație & formare profesională",
    features: [
      "TOATE funcțiile Zephren Expert (Step 1-8 complet)",
      "AI Pack + BIM Pack incluse",
      "CPE NELIMITATE cu watermark „SCOP DIDACTIC”",
      "Export XML MDLPA blocat (nu pentru utilizare oficială)",
      "Submit MDLPA blocat",
      "Gratis pe perioada formării (anuală cu dovadă)",
      "Suport email 72h",
    ],
    cta: "Aplică cu dovadă",
    highlight: false,
    badge: "EDUCAȚIE",
  },
  {
    id: "audit",
    name: "Zephren Audit",
    price: "199",
    period: "/lună",
    priceAn: "1.999",
    discount: "/an (10 luni)",
    audience: "Auditor ocazional 1-3 CPE/lună",
    features: [
      "Step 1-6 complet (CPE + Anexe oficial)",
      "8 CPE/lună incluse + 2 burst gratis",
      "Overage: 49→79→99 RON/CPE pe trepte",
      "Rollover CPE neutilizate 3 luni",
      "Export DOCX MDLPA + XML registru + PDF/A",
      "Submit MDLPA + ștampilă auditor",
      "Cloud sync 6 luni · ANCPI cadastru",
      "Suport email 48h",
      "1 utilizator",
    ],
    cta: "Activează Audit",
    highlight: false,
  },
  {
    id: "pro",
    name: "Zephren Pro",
    price: "499",
    period: "/lună",
    priceAn: "4.990",
    discount: "/an (10 luni) · CEL MAI ALES",
    audience: "Auditor activ MDLPA cu CPE + audit financiar",
    features: [
      "Step 1-7 COMPLET (CPE + Anexe + Audit financiar)",
      "30 CPE/lună incluse + 6 burst gratis",
      "Overage: 49→79→99 RON/CPE pe trepte",
      "Rollover CPE neutilizate 3 luni",
      "AI Pack inclus (OCR facturi/CPE + chat import + AI assistant)",
      "Pașaport Renovare EPBD + GWP CO₂ lifecycle",
      "BACS A-D + SRI auto + MEPS check (conform EPBD)",
      "Cloud sync nelimitat · CPETracker + Alerts",
      "Suport prioritar 24h",
      "1 utilizator",
    ],
    cta: "Activează Pro",
    highlight: true,
    badge: "POPULAR",
  },
  {
    id: "expert",
    name: "Zephren Expert",
    price: "899",
    period: "/lună",
    priceAn: "8.990",
    discount: "/an (10 luni) · Toate modulele avansate",
    audience: "Auditor senior + consultant Pasivhaus / NZEB+",
    features: [
      "Tot Zephren Pro, plus:",
      "Step 8 COMPLET (18 module avansate)",
      "60 CPE/lună + 12 burst gratis · Overage 39→69→99 RON",
      "BIM Pack inclus (IFC/Revit/ArchiCAD import)",
      "MonteCarloEP · Pasivhaus · PMV/PPD ISO 7730",
      "PortfolioDashboard multi-clădire · ThermovisionModule",
      "BACS detaliat 200 factori · SRI complet 42 servicii",
      "MEPS optimizator + roadmap 2050 · Pașaport detaliat LCC",
      "EN 12831 sarcini per cameră · UrbanHeatIsland",
      "Historic + Mixed-use buildings · Acoustic P 122-89",
      "1 utilizator",
    ],
    cta: "Activează Expert",
    highlight: false,
  },
  {
    id: "birou",
    name: "Zephren Birou",
    price: "1.890",
    period: "/lună flat",
    priceAn: "18.900",
    discount: "/an (10 luni) · Preț FIX, nu per user",
    tierNote: "2–5 utilizatori · CPE NELIMITAT pentru toți",
    audience: "Birou de audit 2-5 useri",
    features: [
      "Tot Zephren Expert × 2-5 utilizatori",
      "CPE NELIMITAT (rollover 6 luni)",
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
    price: "de la 4.990",
    period: "/lună",
    priceAn: "Negociat",
    discount: "Volume tiers transparente · 6-100+ utilizatori",
    tierNote: "11-30u: ajustat · 31-60u: ajustat · 61-100+u: ajustat (negociat)",
    audience: "Organizații, ordine profesionale, primării, INCERC",
    features: [
      "Tot Zephren Birou, plus:",
      "6-100+ utilizatori (volume scaling)",
      "CPE NELIMITAT pentru toți utilizatorii",
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

// ── Pay-per-use (fără abonament) — pentru auditori ocazionali ──────────────
export const PAY_PER_USE = [
  {
    id: "cpe-single",
    name: "CPE single",
    price: "99",
    unit: "RON/CPE",
    desc: "1 CPE complet Step 1-7 · Valid 30 zile",
    audience: "Auditor cu < 1 CPE/lună",
  },
  {
    id: "cpe-pack-10",
    name: "Pachet 10 CPE",
    price: "790",
    unit: "RON (79/CPE)",
    desc: "10 credite CPE Step 1-7 · Valabilitate 6 luni",
    audience: "Auditor sezonier",
    discount: "-20% vs single",
  },
  {
    id: "cpe-step8",
    name: "CPE + Step 8",
    price: "199",
    unit: "RON/CPE",
    desc: "1 CPE complet + 1 modul avansat la alegere (MonteCarlo, Pasivhaus etc.)",
    audience: "Auditor cu nevoie ocazională modul avansat",
  },
  {
    id: "pasaport-basic",
    name: "Pașaport Renovare basic",
    price: "79",
    unit: "RON/doc",
    desc: "Pașaport EPBD format JSON+XML+PDF · obligatoriu 29 mai 2026",
    audience: "Standalone EPBD",
  },
  {
    id: "pasaport-detailed",
    name: "Pașaport Renovare detaliat",
    price: "199",
    unit: "RON/doc",
    desc: "Pașaport + LCC + multi-fază + benchmark",
    audience: "Property owner pe termen lung",
  },
];

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
