/**
 * landingData.js — Sursă de adevăr pentru pagina principală
 *
 * Importă direct din fișierele de date ale aplicației.
 * Vite urmărește aceste dependențe → orice modificare în
 * products.json, steps.json etc. actualizează automat landing-ul.
 */

import PRODUCTS  from "./products.json";
import STEPS     from "./steps.json";
import CLIMATE   from "./climate.json";
import BRIDGES   from "./thermal-bridges.json";
import FEATURES_DATA from "./features.json";
export { CHANGELOG } from "./changelog.generated.js";
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

// ── Normative integrate (lista manuală — actualizare manuală când se adaugă) ─
export const NORMATIVE = [
  "Mc 001-2022",
  "SR EN ISO 52000-1/NA:2023",
  "SR EN ISO 13790",
  "SR EN ISO 52016-1",
  "SR EN ISO 6946",
  "SR EN ISO 10077-1",
  "SR EN ISO 13370",
  "SR EN ISO 13788",
  "SR EN ISO 14683",
  "EN 15193-1",
  "EN 15459-1",
  "EN 15978 (GWP)",
  "I5-2022",
  "C107/7-2002",
  "Legea 372/2005 + L.238/2024",
  "EPBD 2024/1275",
  "Reg. delegat UE 2025/2273",
];
export const NORMATIVE_COUNT = NORMATIVE.length;

// ── Versiune software ─────────────────────────────────────────────────────────
export const APP_VERSION = "3.5";

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
    id: "starter", name: "Starter", price: "199", period: "/lună",
    priceAn: null, discount: null,
    features: [
      "Proiecte CPE nelimitate",
      "Export PDF + Word oficial (Mc 001-2022)",
      "Stocare proiecte 6 luni",
      "Hartă climatică interactivă",
      "Suport email (48h)",
      "1 utilizator",
    ],
    cta: "Activează Starter", highlight: false,
  },
  {
    id: "standard", name: "Standard", price: "499", period: "/lună",
    priceAn: null, discount: null,
    features: [
      "Tot ce include Starter, plus:",
      "Funcționalități extinse — detalii în curând",
      "1 utilizator",
    ],
    cta: "Activează Standard", highlight: false,
  },
  {
    id: "professional", name: "Professional", price: "799", period: "/lună",
    priceAn: "7.999", discount: "Toate funcțiile incluse · cel mai bun raport calitate-preț",
    features: [
      "Tot ce include Standard, plus:",
      "Calcule SRE, nZEB, audit energetic complet",
      "Export XML MDLPA",
      "Bază de date climatică completă (per județ)",
      "Șabloane clădiri tipice preconfigurate",
      "Comparator clase energetice",
      "Stocare proiecte nelimitată",
      "Suport prioritar (24h)",
      "1 utilizator",
    ],
    cta: "Activează Professional", highlight: true,
  },
  {
    id: "business", name: "Business", price: "749", period: "/user/lună",
    priceAn: "7.499", discount: "/user/an · 10 luni",
    tierNote: "2–3u: 749 · 4–7u: 699 · 8–10u: 649 RON/user",
    features: [
      "Tot ce include Professional, plus:",
      "2–10 utilizatori",
      "Facturare pe firmă (CUI, date fiscale)",
      "API access (integrări CRM/ERP)",
      "White-label complet (branding firmă)",
      "Dashboard statistici per utilizator",
    ],
    cta: "Activează Business", highlight: false,
  },
  {
    id: "enterprise", name: "Enterprise", price: "599", period: "/user/lună",
    priceAn: "5.999", discount: "/user/an · 10 luni",
    tierNote: "11–30u: 599 · 31–60u: 549 · 61–100u: 499 RON/user",
    features: [
      "Tot ce include Business, plus:",
      "11–100+ utilizatori",
      "SLA garantat (99,9%)",
      "Manager cont dedicat",
      "Training inclus",
      "Contract personalizat",
      "Camere, ordine, municipalități",
    ],
    cta: "Contactează-ne", highlight: false,
  },
];
