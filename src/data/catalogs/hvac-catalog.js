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
