/**
 * landingData.js — Sursă de adevăr pentru pagina principală
 *
 * Importă direct din fișierele de date ale aplicației.
 * Vite urmărește aceste dependențe → orice modificare în
 * products.json, steps.json etc. actualizează automat landing-ul.
 */

import PRODUCTS from "./products.json";
import STEPS    from "./steps.json";
import CLIMATE  from "./climate.json";
import BRIDGES  from "./thermal-bridges.json";

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
export const APP_VERSION = "3.4";

// ── Statistici hero ──────────────────────────────────────────────────────────
export const STATS = [
  { value: `${TOTAL_PRODUCTS}+`, label: "Produse în catalog" },
  { value: String(CLIMATE_COUNT),  label: "Localități climatice" },
  { value: String(BRIDGES_COUNT),  label: "Punți termice" },
  { value: String(NORMATIVE_COUNT),label: "Normative integrate" },
  { value: String(STEPS_COUNT),    label: "Pași calculator" },
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

// ── Features principale ──────────────────────────────────────────────────────
export const FEATURES = [
  {
    icon: "📊",
    title: "Calcul Mc 001-2022 complet",
    desc: `Bilanț energetic lunar ISO 13790, ${CLIMATE_COUNT} localități climatice, 5 zone, dashboard sumar cu grafic Sankey, calcul orar ISO 52016-1`,
  },
  {
    icon: "📜",
    title: "Certificat DOCX oficial MDLPA",
    desc: "12 template-uri MDLPA completate automat, export XML registru electronic, PDF cu QR code, semnătură digitală",
  },
  {
    icon: "🏗️",
    title: "Anvelopă & Punți termice",
    desc: `Materiale constructive extinse, ${BRIDGES_COUNT} punți termice SVG interactive, verificare Glaser ISO 13788, ISO 6946/10077-1/13370`,
  },
  {
    icon: "☀️",
    title: "Surse regenerabile complete",
    desc: `PV (${PRODUCT_COUNTS.pvPanels} modele), solar termic, pompe căldură (${PRODUCT_COUNTS.heatPumps} modele), biomasă, eolian, cogenerare — RER automat`,
  },
  {
    icon: "🔋",
    title: "Catalog produse reale",
    desc: `${TOTAL_PRODUCTS}+ produse: ${PRODUCT_COUNTS.windows} ferestre, ${PRODUCT_COUNTS.heatPumps} pompe căldură, ${PRODUCT_COUNTS.pvPanels} panouri PV, ${PRODUCT_COUNTS.inverters} invertoare, ${PRODUCT_COUNTS.batteries} baterii, ${PRODUCT_COUNTS.boilers} centrale`,
  },
  {
    icon: "🔍",
    title: "Audit & reabilitare inteligentă",
    desc: "Scenarii cost-optimă EN 15459-1, deviz estimativ, smart rehab suggestions, comparație multi-scenariu",
  },
  {
    icon: "⚡",
    title: "nZEB & ZEB conform EPBD",
    desc: "Legea 238/2024, EPBD 2024/1275, scala A-G, verificare completă nZEB cu RER, GWP ciclu viață EN 15978",
  },
  {
    icon: "🏠",
    title: "BACS, EV-ready, Solar-ready",
    desc: "Evaluare automatizare clădire BACS, pregătire stație EV conform EPBD Art.12, verificare solar-ready Art.14",
  },
  {
    icon: "🗺️",
    title: "Hartă climatică interactivă",
    desc: `Selectare localitate pe hartă SVG, ${CLIMATE_COUNT} localități, zone climatice I-V vizuale, profil temperatură lunară`,
  },
  {
    icon: "❄️",
    title: "Confort termic vară C107/7",
    desc: "Temperatură operativă, analiză per element, conformitate C107/7-2002, recomandări protecție solară",
  },
  {
    icon: "💧",
    title: "Verificare condensare Glaser",
    desc: "Diagramă Glaser SVG vizuală per element, verificare lunară 12 luni, presiuni parțiale vs. saturație",
  },
  {
    icon: "📤",
    title: "Export complet multi-format",
    desc: "Export DOCX oficial, XML MDLPA, PDF raport, JSON proiect, CSV date, XLSX tabelar — import drag & drop",
  },
];

// ── Features v3 detaliate ────────────────────────────────────────────────────
export const V3_FEATURES = [
  { icon: "📈", title: "Dashboard sumar", desc: "Vizualizare sintetică cu indicatori cheie: clasă energetică, cost anual, RER, emisii CO₂ — totul într-o singură pagină." },
  { icon: "🔀", title: "Grafic Sankey", desc: "Flux energetic vizual: surse, conversii și pierderi, de la energie primară la energia utilă, într-un singur grafic interactiv." },
  { icon: "🌍", title: "GWP ciclu viață EN 15978", desc: "Emisii gaze efect de seră pe ciclul complet de viață: construcție, operare, demoliție — per material și per element." },
  { icon: "❄️", title: "Confort termic vară C107/7", desc: "Temperatură operativă, analiză per element, conformitate C107/7-2002, recomandări de protecție solară." },
  { icon: "💧", title: "Diagramă Glaser vizuală", desc: "Diagramă SVG interactivă per element constructiv, verificare condens 12 luni, presiuni parțiale vs. saturație." },
  { icon: "🏠", title: "BACS / EV / Solar-ready", desc: "Evaluare BACS (automatizare), pregătire EV (EPBD Art.12), solar-ready (Art.14) — verificare conformitate completă." },
  { icon: "🗺️", title: "Hartă climatică interactivă", desc: `Selectare localitate pe hartă SVG, ${CLIMATE_COUNT} localități, vizualizare zone I-V, auto-populare date meteo.` },
  { icon: "🧱", title: `Catalog ${TOTAL_PRODUCTS}+ produse reale`, desc: `Ferestre (${PRODUCT_COUNTS.windows}), pompe căldură (${PRODUCT_COUNTS.heatPumps}), PV (${PRODUCT_COUNTS.pvPanels}), invertoare, baterii, centrale.` },
  { icon: "💡", title: "Smart rehab suggestions", desc: "Recomandări inteligente bazate pe cost-beneficiu: scenariu ușor, mediu, profund, cu investiție și economie anuală." },
  { icon: "📊", title: "Calcul orar ISO 52016-1", desc: "Simulare orară 8760 ore pe baza datelor TMY generate, validare rezultate lunare, profil termic detaliat." },
  { icon: "🔬", title: "EN 12831 · PNRR · Pasivhaus", desc: "Calcul necesar de căldură EN 12831, verificare eligibilitate PNRR, conformitate Pasivhaus 15 kWh/(m²·an)." },
  { icon: "🔄", title: "Comparație multi-scenariu", desc: "Comparație scenarii reabilitare side-by-side: investiție, economie, termen recuperare, clasă energetică rezultată." },
  { icon: "📤", title: "Export complet", desc: "DOCX oficial MDLPA, XML registru electronic, PDF cu QR code, JSON/CSV/XLSX — import drag & drop." },
];

// ── Planuri de prețuri (sursa: SCENARII_MONETIZARE_ZEPHREN v1.0, apr. 2026) ──
export const PLANS = [
  {
    id: "free", name: "Free", price: "0", period: "",
    priceAn: null, discount: null,
    features: [
      "3 CPE/lună incluse",
      `Calculator complet ${STEPS_COUNT} pași`,
      `${CLIMATE_COUNT} localități climatice`,
      `${BRIDGES_COUNT} punți termice interactive`,
      `${TOTAL_PRODUCTS}+ produse în catalog`,
      "Export JSON/CSV/XLSX",
      "DOCX cu watermark",
    ],
    cta: "Începe gratuit", highlight: false,
  },
  {
    id: "standard", name: "Standard", price: "149", period: "/lună",
    priceAn: "1.499", discount: "~16%",
    features: [
      "CPE nelimitat",
      "Export PDF fără watermark",
      "Template-uri oficiale MDLPA",
      "Raport conformare nZEB",
      "Hartă climatică interactivă",
      "Webinare lunare",
      "1 utilizator",
    ],
    cta: "Activează Standard", highlight: false,
  },
  {
    id: "pro", name: "Pro", price: "299", period: "/lună",
    priceAn: "2.999", discount: "~16%",
    features: [
      "Tot din Standard +",
      "Export XML registru MDLPA",
      "API REST acces",
      "Până la 5 utilizatori",
      "Suport prioritar 24h",
      "Calcul orar ISO 52016-1",
      "EN 12831 · PNRR · Pasivhaus",
    ],
    cta: "Activează Pro", highlight: true,
  },
  {
    id: "asociatie", name: "Asociație", price: "negociat", period: "",
    priceAn: null, discount: null,
    features: [
      "Licență instituțională",
      "Până la 20 utilizatori",
      "Branding personalizat CPE",
      "AI Assistant integrat",
      "Portofoliu clienți",
      "Notificări expirare CPE",
      "Suport dedicat",
    ],
    cta: "Contactează-ne", highlight: false,
  },
];
