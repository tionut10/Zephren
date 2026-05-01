// ===============================================================
// HVAC EXTENDED CATALOG — Sprint Cercetare Pas 2 Instalații
// 30 apr 2026 — Catalog NEUTRU bilingv RO+EN
// 424 entries noi + entries existente din constants.js
// ===============================================================
//
// Acest modul agregă cataloagele extinse pentru Pas 2 Instalații:
//   - Surse de căldură (heating sources)
//   - Sisteme de emisie (emission)
//   - Calitate distribuție + Reglaj/control
//   - Surse ACM, stocare ACM, anti-Legionella, izolație conducte
//   - Sisteme răcire, emisie răcire, distribuție răcire
//   - Sisteme ventilare
//   - Tipuri iluminat + control iluminat
//   - Combustibili / vectori energetici extinși
//
// SCHEMA:
//   - Entries existente din constants.js păstrează `id` + `label` (RO)
//   - Entries noi au `nameRo` + `nameEn` + metadate suplimentare
//   - Helper `getLabel(entry, lang)` returnează label adaptat limbii
//
// SURSE: Catalog 100% NEUTRU (zero brand-uri); referințe SR EN/ISO/EU/ASHRAE/REHVA.
// Pentru parteneriate cu producători (post-lansare), vezi câmpul `brand` rezervat
// pentru completare ulterioară (acum null/undefined în toate entries).

import {
  HEAT_SOURCES as BASE_HEAT_SOURCES,
  EMISSION_SYSTEMS as BASE_EMISSION_SYSTEMS,
  DISTRIBUTION_QUALITY as BASE_DISTRIBUTION_QUALITY,
  CONTROL_TYPES as BASE_CONTROL_TYPES,
  ACM_SOURCES as BASE_ACM_SOURCES,
  COOLING_SYSTEMS as BASE_COOLING_SYSTEMS,
  COOLING_EMISSION_EFFICIENCY as BASE_COOLING_EMISSION,
  COOLING_DISTRIBUTION_EFFICIENCY as BASE_COOLING_DISTRIBUTION,
  COOLING_CONTROL_EFFICIENCY as BASE_COOLING_CONTROL,
  VENTILATION_TYPES as BASE_VENTILATION_TYPES,
  LIGHTING_TYPES as BASE_LIGHTING_TYPES,
  LIGHTING_CONTROL as BASE_LIGHTING_CONTROL,
  FUELS as BASE_FUELS,
} from "../constants.js";

import rawA1 from "./_raw_a1_heating_sources.json";
import rawA2 from "./_raw_a2_emission_systems.json";
import rawA3 from "./_raw_a3_distribution_control.json";
import rawA4 from "./_raw_a4_acm.json";
import rawA5 from "./_raw_a5_cooling.json";
import rawA6 from "./_raw_a6_ventilation.json";
import rawA7 from "./_raw_a7_lighting.json";
import rawA8 from "./_raw_a8_fuels.json";
import brandsRegistry from "./brands-registry.json";

// ── Helper pentru normalizare entries: asigură `label` (RO) și `nameRo`/`nameEn` ──
function normalize(entry, fallbackCategory) {
  // Entries vechi din constants.js au doar `label`; adăugăm aliasuri.
  const nameRo = entry.nameRo ?? entry.label ?? "";
  const nameEn = entry.nameEn ?? entry.label ?? entry.nameRo ?? "";
  return {
    ...entry,
    nameRo,
    nameEn,
    label: entry.label ?? nameRo,
    category: entry.category ?? fallbackCategory ?? "",
    // Aliase snake_case ↔ camelCase pentru compat constants.js (eta_gen) ↔ extensions (etaGen)
    eta_gen: entry.eta_gen ?? entry.etaGen,
    etaGen: entry.etaGen ?? entry.eta_gen,
    eta_em: entry.eta_em ?? entry.etaEm,
    etaEm: entry.etaEm ?? entry.eta_em,
    eta_dist: entry.eta_dist ?? entry.etaDist,
    etaDist: entry.etaDist ?? entry.eta_dist,
    eta_ctrl: entry.eta_ctrl ?? entry.etaCtrl,
    etaCtrl: entry.etaCtrl ?? entry.eta_ctrl,
    // Aliase răcire / iluminat / ACM
    p_density: entry.p_density ?? entry.pDensity,
    pDensity: entry.pDensity ?? entry.p_density,
    fctrl: entry.fctrl ?? entry.fCtrl,
    fCtrl: entry.fCtrl ?? entry.fctrl,
    // Categorie alias `cat` ↔ `category` pentru cod existent
    cat: entry.cat ?? entry.category ?? fallbackCategory ?? "",
  };
}

// ── Helper public: returnează eticheta în limba cerută ──
export function getLabel(entry, lang = "RO") {
  if (!entry) return "";
  if (lang === "EN") return entry.nameEn || entry.label || entry.nameRo || "";
  return entry.nameRo || entry.label || entry.nameEn || "";
}

// ── Helper public: filtrare per categorie clădire (Mc 001-2022) ──
export function filterByBuildingCategory(entries, categoryCode) {
  if (!categoryCode) return entries;
  return entries.filter(e => {
    const apps = e.applicableCategories;
    if (!apps || apps.length === 0) return true;
    if (apps.includes("all")) return true;
    return apps.includes(categoryCode);
  });
}

// ── Helper public: lookup per ID ──
export function findById(entries, id) {
  return entries.find(e => e.id === id) ?? null;
}

// ── Helper public: grupare per categorie pentru optgroup în dropdown ──
export function groupByCategory(entries, lang = "RO") {
  const grouped = {};
  for (const entry of entries) {
    const cat = lang === "EN" ? (entry.categoryEn ?? entry.category) : entry.category;
    const key = cat || (lang === "EN" ? "Other" : "Altele");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }
  return grouped;
}

// ═══════════════════════════════════════════════════════════════
// CATALOAGE EXTINSE — fuziune base (constants.js) + extensions (raw JSON)
// ═══════════════════════════════════════════════════════════════

export const HEAT_SOURCES_EXT = [
  ...BASE_HEAT_SOURCES.map(e => normalize(e, e.cat)),
  ...rawA1.map(e => normalize(e, e.category)),
];

export const EMISSION_SYSTEMS_EXT = [
  ...BASE_EMISSION_SYSTEMS.map(e => normalize(e, "Emisie")),
  ...rawA2.map(e => normalize(e, e.category)),
];

export const DISTRIBUTION_QUALITY_EXT = [
  ...BASE_DISTRIBUTION_QUALITY.map(e => normalize(e, "Distribuție")),
  ...rawA3.distribution.map(e => normalize(e, "Distribuție extinsă")),
];

export const CONTROL_TYPES_EXT = [
  ...BASE_CONTROL_TYPES.map(e => normalize(e, "Reglaj/Control")),
  ...rawA3.control.map(e => normalize(e, "Reglaj/Control extins")),
];

export const ACM_SOURCES_EXT = [
  ...BASE_ACM_SOURCES.map(e => normalize(e, "ACM")),
  ...rawA4.dhwSources.map(e => normalize(e, e.category)),
];

// Cataloage NOI introduse de A4 (nu existau în constants.js)
export const ACM_STORAGE_TYPES = rawA4.storage.map(e => normalize(e, "Stocare ACM"));
export const ACM_ANTI_LEGIONELLA = rawA4.antiLegionella.map(e => normalize(e, "Anti-Legionella"));
export const PIPE_INSULATION_TYPES = rawA4.pipeInsulation.map(e => normalize(e, "Izolație conducte"));

export const COOLING_SYSTEMS_EXT = [
  ...BASE_COOLING_SYSTEMS.map(e => normalize(e, e.cat)),
  ...rawA5.coolingSystems.map(e => normalize(e, e.category)),
];

export const COOLING_EMISSION_EXT = [
  ...BASE_COOLING_EMISSION.map(e => normalize(e, "Emisie răcire")),
  ...rawA5.coolingEmission.map(e => normalize(e, "Emisie răcire extinsă")),
];

export const COOLING_DISTRIBUTION_EXT = [
  ...BASE_COOLING_DISTRIBUTION.map(e => normalize(e, "Distribuție răcire")),
  ...rawA5.coolingDistribution.map(e => normalize(e, "Distribuție răcire extinsă")),
];

// Reglaj răcire — neutru (a fost în BASE_COOLING_CONTROL doar)
export const COOLING_CONTROL_EXT = BASE_COOLING_CONTROL.map(e => normalize(e, "Reglaj răcire"));

export const VENTILATION_TYPES_EXT = [
  ...BASE_VENTILATION_TYPES.map(e => normalize(e, e.cat)),
  ...rawA6.map(e => normalize(e, e.category)),
];

export const LIGHTING_TYPES_EXT = [
  ...BASE_LIGHTING_TYPES.map(e => normalize(e, e.cat)),
  ...rawA7.lightingTypes.map(e => normalize(e, e.category)),
];

export const LIGHTING_CONTROL_EXT = [
  ...BASE_LIGHTING_CONTROL.map(e => normalize(e, e.cat)),
  ...rawA7.lightingControl.map(e => normalize(e, e.category)),
];

export const FUELS_EXT = [
  ...BASE_FUELS.map(e => normalize(e, "Combustibil clasic")),
  ...rawA8.map(e => normalize(e, e.categoryRo)),
];

// ═══════════════════════════════════════════════════════════════
// META: numărători + versiune catalog
// ═══════════════════════════════════════════════════════════════

export const CATALOG_META = {
  version: "1.0.0",
  generated: "2026-04-30",
  source: "Zephren HVAC Research Sprint 2026-04-30 (8 agenți paraleli OPUS)",
  license: "Internal Zephren — neutral catalog (zero brand-uri)",
  brandPolicy: "Schema cu câmp `brand: null` rezervat pentru parteneriate post-lansare",
  counts: {
    heatingSources: HEAT_SOURCES_EXT.length,
    emissionSystems: EMISSION_SYSTEMS_EXT.length,
    distribution: DISTRIBUTION_QUALITY_EXT.length,
    control: CONTROL_TYPES_EXT.length,
    acmSources: ACM_SOURCES_EXT.length,
    acmStorage: ACM_STORAGE_TYPES.length,
    acmAntiLegionella: ACM_ANTI_LEGIONELLA.length,
    pipeInsulation: PIPE_INSULATION_TYPES.length,
    coolingSystems: COOLING_SYSTEMS_EXT.length,
    coolingEmission: COOLING_EMISSION_EXT.length,
    coolingDistribution: COOLING_DISTRIBUTION_EXT.length,
    coolingControl: COOLING_CONTROL_EXT.length,
    ventilationSystems: VENTILATION_TYPES_EXT.length,
    lightingTypes: LIGHTING_TYPES_EXT.length,
    lightingControl: LIGHTING_CONTROL_EXT.length,
    fuels: FUELS_EXT.length,
  },
  get totalEntries() {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORT GROUP — toate cataloagele într-un singur obiect
// ═══════════════════════════════════════════════════════════════

export const HVAC_CATALOG = {
  heatingSources: HEAT_SOURCES_EXT,
  emissionSystems: EMISSION_SYSTEMS_EXT,
  distribution: DISTRIBUTION_QUALITY_EXT,
  control: CONTROL_TYPES_EXT,
  acmSources: ACM_SOURCES_EXT,
  acmStorage: ACM_STORAGE_TYPES,
  acmAntiLegionella: ACM_ANTI_LEGIONELLA,
  pipeInsulation: PIPE_INSULATION_TYPES,
  coolingSystems: COOLING_SYSTEMS_EXT,
  coolingEmission: COOLING_EMISSION_EXT,
  coolingDistribution: COOLING_DISTRIBUTION_EXT,
  coolingControl: COOLING_CONTROL_EXT,
  ventilationSystems: VENTILATION_TYPES_EXT,
  lightingTypes: LIGHTING_TYPES_EXT,
  lightingControl: LIGHTING_CONTROL_EXT,
  fuels: FUELS_EXT,
};

// ═══════════════════════════════════════════════════════════════
// BRAND REGISTRY — pregătire parteneriate post-lansare
// ═══════════════════════════════════════════════════════════════
//
// Registry intern cu ~165 brand-uri majore HVAC organizate per categorie.
// La inițializare, toate brand-urile au `partnerStatus: "none"` și UI-ul
// rămâne 100% NEUTRU (nu se afișează brand-uri în dropdown-uri).
//
// Pentru activarea unui parteneriat:
//   1. Editează `brands-registry.json` → setează `partnerStatus: "active"`
//      + `partnerSince: "2026-MM-DD"` + `partnerTier: "premium"` etc.
//   2. Helper-ul `applyPartnerSorting(entries)` va prioritiza automat entries
//      legate de acel brand (via `matchesEntries`) la începutul listei.
//   3. UI poate afișa badge "🤝 Partener" pentru aceste entries.
//
// Politica: zero brand-uri în nameRo/nameEn al entries; doar legătură via
// `matchesEntries` din registry. Schema permite multiple parteneriate paralele.

// Layer overrides din localStorage — permite activare instant fără redeploy
import { applyOverride } from "./partner-overrides.js";

// Brand registry static (snapshot din JSON la module load)
export const BRANDS = brandsRegistry.brands;

// Index static pe id (matchesEntries nu se schimbă prin overrides, doar partnerStatus/Since/Tier/URL)
const BRANDS_BY_ID_BASE = Object.fromEntries(BRANDS.map(b => [b.id, b]));

/**
 * Returnează un brand cu overrides aplicate (live din localStorage).
 * @param {string} brandId
 * @returns {Object|undefined}
 */
function getBrandLive(brandId) {
  const base = BRANDS_BY_ID_BASE[brandId];
  if (!base) return undefined;
  return applyOverride(base);
}

// Index live cu Proxy doar pentru property access (tests use BRANDS_BY_ID.viessmann)
export const BRANDS_BY_ID = new Proxy(BRANDS_BY_ID_BASE, {
  get(target, brandId) {
    if (typeof brandId !== "string") return target[brandId];
    return getBrandLive(brandId) ?? target[brandId];
  },
});

/**
 * Returnează lista live de brand-uri cu overrides aplicate.
 * Recalculat la fiecare apel ca să reflecte modificările din localStorage.
 */
export function getBrands() {
  return BRANDS.map(b => applyOverride(b));
}

/**
 * Returnează lista de brand-uri filtrată per categorie HVAC.
 * @param {string} category - "heating" | "cooling" | "acm" | "ventilation" | "lighting" | "smart-home" | "distribution" | "solar" | "battery" | "fuels"
 */
export function getBrandsByCategory(category) {
  return getBrands().filter(b => b.categories.includes(category));
}

/**
 * Returnează brand-urile cu parteneriat activ (după aplicare overrides localStorage).
 * @returns {Array<Brand>} brand-uri cu partnerStatus === "active"
 */
export function getActivePartners() {
  return getBrands().filter(b => b.partnerStatus === "active");
}

/**
 * Returnează ID-urile brand-urilor care matchează un entry catalog.
 * @param {string} entryId - ID-ul entry-ului (ex: "GAZ_COND", "PC_CO2")
 * @returns {Array<string>} IDs brand-uri (ex: ["viessmann", "vaillant"])
 */
export function getBrandsForEntry(entryId) {
  return getBrands()
    .filter(b => Array.isArray(b.matchesEntries) && b.matchesEntries.includes(entryId))
    .map(b => b.id);
}

/**
 * Returnează entries din catalog matchate de un brand.
 * @param {string} brandId - ID-ul brand-ului (ex: "viessmann")
 * @param {Array} entries - Lista de entries în care căutăm (ex: HEAT_SOURCES_EXT)
 * @returns {Array} entries care apar în brand.matchesEntries
 */
export function getEntriesByBrand(brandId, entries) {
  const brand = BRANDS_BY_ID[brandId];
  if (!brand || !Array.isArray(brand.matchesEntries)) return [];
  const ids = new Set(brand.matchesEntries);
  return entries.filter(e => ids.has(e.id));
}

/**
 * Sortează entries punând la început pe cele matchate de brandul partener.
 * Util pentru parteneriate exclusive sau premium.
 * @param {Array} entries - Lista de entries
 * @param {string} partnerBrandId - ID brand partener
 * @returns {Array} sortată — entries partener mai întâi, apoi restul
 */
export function prioritizeBrand(entries, partnerBrandId) {
  if (!partnerBrandId) return entries;
  const brand = BRANDS_BY_ID[partnerBrandId];
  if (!brand || !Array.isArray(brand.matchesEntries)) return entries;
  const matchSet = new Set(brand.matchesEntries);
  const partner = entries.filter(e => matchSet.has(e.id));
  const rest = entries.filter(e => !matchSet.has(e.id));
  return [...partner, ...rest];
}

/**
 * Filtru: păstrează doar entries matchate de cel puțin un brand partener activ.
 * Util pentru filtru "Doar brand-uri partenere" în UI.
 * @param {Array} entries
 * @returns {Array} entries cu cel puțin un partener activ care le matchează
 */
export function filterByActivePartner(entries) {
  const partners = getActivePartners();
  if (partners.length === 0) return [];
  const matchSet = new Set();
  for (const p of partners) {
    if (Array.isArray(p.matchesEntries)) {
      for (const id of p.matchesEntries) matchSet.add(id);
    }
  }
  return entries.filter(e => matchSet.has(e.id));
}

/**
 * Aplică sortare automată pentru toți partenerii activi (cumulativ).
 * Entries matchate de orice partener activ apar primele.
 * @param {Array} entries - Lista de entries
 * @returns {Array} sortată
 */
export function applyPartnerSorting(entries) {
  const partners = getActivePartners();
  if (partners.length === 0) return entries;
  const matchSet = new Set();
  for (const p of partners) {
    if (Array.isArray(p.matchesEntries)) {
      for (const id of p.matchesEntries) matchSet.add(id);
    }
  }
  if (matchSet.size === 0) return entries;
  const partner = entries.filter(e => matchSet.has(e.id));
  const rest = entries.filter(e => !matchSet.has(e.id));
  return [...partner, ...rest];
}

/**
 * Returnează numele brand-urilor partenere active care matchează un entry.
 * Util pentru badge UI.
 * @param {string} entryId
 * @returns {Array<{id, name, partnerTier}>}
 */
export function getActivePartnersForEntry(entryId) {
  return getActivePartners()
    .filter(b => Array.isArray(b.matchesEntries) && b.matchesEntries.includes(entryId))
    .map(b => ({ id: b.id, name: b.name, partnerTier: b.partnerTier }));
}

// Statistici registry — recalculate din BRANDS (snapshot static) pentru numărători stabile
CATALOG_META.brandCount = BRANDS.length;
CATALOG_META.brandActivePartners = getActivePartners().length;
CATALOG_META.brandCategories = [...new Set(BRANDS.flatMap(b => b.categories))].sort();

// Re-exporturi pentru parteneri
export {
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
  exportOverridesJson,
  importOverridesJson,
  importOverridesCsv,
  exportOverridesCsv,
  parseCsv,
  logPartnerClick,
  getTelemetryEvents,
  getTelemetryByBrand,
  clearTelemetry,
  exportTelemetryCsv,
} from "./partner-overrides.js";
