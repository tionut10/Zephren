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

// ── Planuri de prețuri (actualizat apr. 2026) ──────────────────────────────
export const PLANS = [
  {
    id: "free", name: "Free", price: "0", period: "",
    priceAn: null, discount: null,
    features: [
      "1 proiect CPE/lună",
      "Calculator complet 8 pași",
      "60 localități climatice",
      "165 punți termice interactive",
      "413+ produse în catalog",
      "Export PDF/DOCX cu watermark DEMO",
    ],
    cta: "Începe gratuit", highlight: false,
  },
  {
    id: "starter", name: "Starter", price: "299", period: "/lună",
    priceAn: "1.799", discount: "/an · economisești 790 RON",
    eaPrice: "219", eaAn: "1.290",
    features: [
      "Proiecte CPE nelimitate",
      "Export PDF + Word oficial (Mc 001-2022)",
      "Stocare proiecte 6 luni",
      "Hartă climatică interactivă",
      "Șabloane clădiri de bază",
      "Suport email (48h)",
      "1 utilizator",
    ],
    cta: "Activează Starter", highlight: false,
  },
  {
    id: "professional", name: "Professional", price: "309", period: "/lună",
    priceAn: "4.990", discount: "/an — nZEB + SRE incluse",
    eaPrice: "229", eaAn: "3.590",
    features: [
      "Tot ce include Starter, plus:",
      "Calcule SRE, nZEB, audit energetic complet",
      "Export XML MDLPA",
      "Bază de date climatică completă (per județ)",
      "Șabloane clădiri tipice preconfigurate",
      "Comparator clase energetice",
      "Stocare proiecte nelimitată",
      "Suport email prioritar (24h)",
      "1 utilizator",
    ],
    cta: "Activează Professional", highlight: true,
  },
  {
    id: "business", name: "Business", price: "699", period: "/lună",
    priceAn: "5.990", discount: "/an · 3 utilizatori incluși",
    eaPrice: "499", eaAn: "4.390",
    tierNote: "+89 RON/user extra/lună",
    features: [
      "Tot ce include Professional, plus:",
      "3 utilizatori incluși (+89 RON/user extra)",
      "Facturare pe firmă (CUI, date fiscale)",
      "API access (integrări CRM/ERP)",
      "White-label complet (branding firmă)",
      "Dashboard statistici per utilizator",
      "Suport telefonic dedicat",
    ],
    cta: "Activează Business", highlight: false,
  },
  {
    id: "asociatie_s", name: "Asociație S", price: "2.999", period: "/lună",
    priceAn: "23.990", discount: "/an · 25 utilizatori",
    eaPrice: "1.999", eaAn: "15.990",
    tierNote: "până la 25 utilizatori",
    features: [
      "Tot ce include Business, plus:",
      "Până la 25 utilizatori",
      "Dashboard centralizat asociație",
      "Rapoarte statistice birou",
      "Facturare centralizată",
      "Manager cont dedicat",
    ],
    cta: "Contactează-ne", highlight: false,
  },
  {
    id: "asociatie_m", name: "Asociație M", price: "4.999", period: "/lună",
    priceAn: "39.990", discount: "/an · 50 utilizatori",
    eaPrice: "3.499", eaAn: "27.990",
    tierNote: "până la 50 utilizatori",
    features: [
      "Tot ce include Asociație S, plus:",
      "Până la 50 utilizatori",
      "Branding personalizat complet",
      "Suport dedicat prioritar",
      "Training inclus (onboarding)",
      "SLA garantat (99,5%)",
    ],
    cta: "Contactează-ne", highlight: false,
  },
  {
    id: "asociatie_pro", name: "Asociație Pro", price: "7.999", period: "/lună",
    priceAn: "63.990", discount: "/an · 100 utilizatori",
    eaPrice: "5.499", eaAn: "43.990",
    tierNote: "până la 100 utilizatori",
    features: [
      "Tot ce include Asociație M, plus:",
      "Până la 100 utilizatori",
      "API access complet",
      "Integrare sistem propriu",
      "White-label total",
      "Contract personalizat",
      "SLA garantat (99,9%)",
    ],
    cta: "Contactează-ne", highlight: false,
  },
  {
    id: "enterprise", name: "Enterprise", price: "Negociat", period: "",
    priceAn: null, discount: null,
    tierNote: "100+ utilizatori",
    features: [
      "Tot ce include Asociație Pro, plus:",
      "100+ utilizatori",
      "White-label complet personalizat",
      "SLA personalizat",
      "Manager cont dedicat",
      "Training și onboarding complet",
      "Camere, ordine, municipalități",
    ],
    cta: "Contactează-ne", highlight: false,
  },
];
