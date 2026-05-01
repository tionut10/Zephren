// ===============================================================
// RENEWABLE EXTENDED CATALOG — Pas 4 Surse regenerabile
// 1 mai 2026 — Catalog NEUTRU bilingv RO+EN
// ~210 entries grupate în 11 categorii
// ===============================================================
//
// Modul-pereche cu hvac-catalog.js (Pas 3 Instalații).
//
// Categorii livrate:
//   - solarThermal       (28 entries) — colectoare polimerice, PVT, aer, concentratoare, BIST
//   - pvCells            (13 entries) — perovskit-tandem, OPV, DSSC, BIPV, FPV, agrivoltaic
//   - pvInverters        (10 entries) — string, central, hibrid+EV, micro RSD, smart-grid
//   - pvSystems          (5 entries)  — tracker, carport, pergolă, balcon plug-and-play
//   - heatPumps          (30 entries) — refrigerant low-GWP, sursă specială, absorbție, VRF
//   - biomassFuels       (18 entries) — torefiat, agro, biochar BECCS, biometan, BioLPG, HVO
//   - biomassBoilers     (8 entries)  — peleți ESP, gazificare downdraft, hidronică, cascadă
//   - windTurbines       (20 entries) — HAWT, VAWT, BIWT, specialty
//   - chpTypes           (25 entries) — Stirling, ICE, GT, Steam/ORC, Fuel Cell, Hibrid
//   - energyStorage      (28 entries) — Na-ion, LTO, VRFB, Fe-air, PCM, BTES, ATES, hidrogen
//   - districtHeating    (25 entries) — DH 2G-5G, geo, biomasă, comunitate, PPA
//
// SCHEMA NEUTRĂ:
//   - Toate entries cu `brand: null`, `partnerStatus: 'none'`, `supplierId: null`
//   - Câmpuri bilingv: `nameRo` + `nameEn` + `category` + `categoryEn`
//   - `applicableCategories[]` filtrare per tipologie clădire RO (RI/RC/BC/SC/IN/HOSP/CL/SP)
//   - Helper `getLabel(entry, lang)` → returnează numele în limba cerută
//
// Pentru parteneriate: edit `brands-registry.json` (partnerStatus='active'),
// helperul applyPartnerSorting() va prioritiza automat în UI dropdown-uri.

import rawRenewable from "./_raw_renewable.json";

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

// ── Helper: build dropdown options grupate, cu label bilingv + tooltip standard ──
export function buildOptions(entries, lang = "RO", { includeStandard = true } = {}) {
  const grouped = groupByCategory(entries, lang);
  const options = [];
  Object.entries(grouped).forEach(([cat, items]) => {
    if (items.length === 0) return;
    options.push({ value: `__group_${cat}`, label: cat, isGroupHeader: true });
    items.forEach(e => {
      options.push({
        value: e.id,
        label: getLabel(e, lang),
        tooltip: includeStandard ? e.standard : undefined,
      });
    });
  });
  return options;
}

// ═══════════════════════════════════════════════════════════════
// CATALOAGE EXPORT — direct din raw JSON cu schema neutră
// ═══════════════════════════════════════════════════════════════

export const SOLAR_THERMAL_EXT      = rawRenewable.solarThermal;
export const PV_CELLS_EXT           = rawRenewable.pvCells;
export const PV_INVERTERS_EXT       = rawRenewable.pvInverters;
export const PV_SYSTEMS_EXT         = rawRenewable.pvSystems;       // tracker, carport, pergolă, balcon
export const HEAT_PUMPS_EXT         = rawRenewable.heatPumps;
export const BIOMASS_FUELS_EXT      = rawRenewable.biomassFuels;
export const BIOMASS_BOILERS_EXT    = rawRenewable.biomassBoilers;
export const WIND_TURBINES_EXT      = rawRenewable.windTurbines;
export const CHP_TYPES_EXT          = rawRenewable.chpTypes;
export const ENERGY_STORAGE_EXT     = rawRenewable.energyStorage;
export const DISTRICT_HEATING_EXT   = rawRenewable.districtHeating;

// ═══════════════════════════════════════════════════════════════
// ALL-IN-ONE: lookup global ID → entry (pentru tooltip cross-tab)
// ═══════════════════════════════════════════════════════════════

const ALL_RENEWABLE_ENTRIES = [
  ...SOLAR_THERMAL_EXT,
  ...PV_CELLS_EXT,
  ...PV_INVERTERS_EXT,
  ...PV_SYSTEMS_EXT,
  ...HEAT_PUMPS_EXT,
  ...BIOMASS_FUELS_EXT,
  ...BIOMASS_BOILERS_EXT,
  ...WIND_TURBINES_EXT,
  ...CHP_TYPES_EXT,
  ...ENERGY_STORAGE_EXT,
  ...DISTRICT_HEATING_EXT,
];

export const RENEWABLE_BY_ID = Object.freeze(
  ALL_RENEWABLE_ENTRIES.reduce((acc, e) => {
    if (e.id) acc[e.id] = e;
    return acc;
  }, {})
);

export function findRenewableById(id) {
  return RENEWABLE_BY_ID[id] ?? null;
}

// ═══════════════════════════════════════════════════════════════
// META + STATISTICĂ
// ═══════════════════════════════════════════════════════════════

export const RENEWABLE_META = {
  version: rawRenewable._meta.version,
  generated: rawRenewable._meta.generated,
  totalEntries: ALL_RENEWABLE_ENTRIES.length,
  countByCategory: {
    solarThermal: SOLAR_THERMAL_EXT.length,
    pvCells: PV_CELLS_EXT.length,
    pvInverters: PV_INVERTERS_EXT.length,
    pvSystems: PV_SYSTEMS_EXT.length,
    heatPumps: HEAT_PUMPS_EXT.length,
    biomassFuels: BIOMASS_FUELS_EXT.length,
    biomassBoilers: BIOMASS_BOILERS_EXT.length,
    windTurbines: WIND_TURBINES_EXT.length,
    chpTypes: CHP_TYPES_EXT.length,
    energyStorage: ENERGY_STORAGE_EXT.length,
    districtHeating: DISTRICT_HEATING_EXT.length,
  },
};
