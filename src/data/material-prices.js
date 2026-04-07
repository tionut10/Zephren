/**
 * Prețuri materiale izolație termică — piața România 2025
 * Sursa: Leroy Merlin RO, Dedeman, Arabesque (medii orientative)
 * Actualizat: 2025-04-08
 */

export const MATERIAL_PRICES_2025 = {
  // ── Termoizolație ───────────────────────────────────────────
  eps_60mm:   { label: "EPS 60mm",              price_m2: 18,  unit: "m²",  source: "Leroy Merlin 2025",        category: "izolatie" },
  eps_100mm:  { label: "EPS 100mm",             price_m2: 28,  unit: "m²",  source: "Leroy Merlin 2025",        category: "izolatie" },
  eps_150mm:  { label: "EPS 150mm",             price_m2: 38,  unit: "m²",  source: "Leroy Merlin 2025",        category: "izolatie" },
  mw_50mm:    { label: "Vată min 50mm",          price_m2: 22,  unit: "m²",  source: "Dedeman 2025",             category: "izolatie" },
  mw_100mm:   { label: "Vată min 100mm",         price_m2: 40,  unit: "m²",  source: "Dedeman 2025",             category: "izolatie" },
  xps_50mm:   { label: "XPS 50mm",              price_m2: 35,  unit: "m²",  source: "Arabesque 2025",           category: "izolatie" },
  xps_100mm:  { label: "XPS 100mm",             price_m2: 65,  unit: "m²",  source: "Arabesque 2025",           category: "izolatie" },
  // ── Tâmplărie ───────────────────────────────────────────────
  pvc_2g:     { label: "Tâmpl. PVC 2G Low-E",   price_m2: 350, unit: "m²",  source: "Medie piață 2025",         category: "tamplarie" },
  pvc_3g:     { label: "Tâmpl. PVC 3G Low-E",   price_m2: 480, unit: "m²",  source: "Medie piață 2025",         category: "tamplarie" },
  alu_3g:     { label: "Tâmpl. Aluminiu 3G",    price_m2: 650, unit: "m²",  source: "Medie piață 2025",         category: "tamplarie" },
  // ── Sisteme HVAC ────────────────────────────────────────────
  hp_6kw:     { label: "Pompă căldură 6kW A/W",       price_eur: 3200, unit: "buc", source: "Daikin/Viessmann 2025", category: "hvac" },
  hp_10kw:    { label: "Pompă căldură 10kW A/W",      price_eur: 4800, unit: "buc", source: "Daikin/Viessmann 2025", category: "hvac" },
  // ── Sisteme Fotovoltaice ─────────────────────────────────────
  pv_panel:   { label: "Panou PV 400W monocristalin", price_eur: 180,  unit: "buc", source: "Medie piață 2025",      category: "pv" },
  inverter:   { label: "Invertor string 5kW",          price_eur: 800,  unit: "buc", source: "Fronius/SMA 2025",      category: "pv" },
};

// ── Metadate ──────────────────────────────────────────────────────────────────
export const PRICES_UPDATED = "2025-04-08";
export const PRICES_SOURCE  = "Leroy Merlin RO, Dedeman, Arabesque, furnizori HVAC — prețuri orientative";

// Curs EUR/RON orientativ
export const EUR_TO_RON = 5.00;

// ── calcMaterialCost ──────────────────────────────────────────────────────────
// Calculează costul materialului pentru o cantitate dată.
// Returnează { costRON, costEUR, label, unit } sau null dacă materialul nu există.
export function calcMaterialCost(materialId, quantity) {
  const mat = MATERIAL_PRICES_2025[materialId];
  if (!mat) return null;

  const qty = parseFloat(quantity) || 0;

  let costRON = null;
  let costEUR = null;

  if (mat.price_m2 != null) {
    costRON = mat.price_m2 * qty;
    costEUR = costRON / EUR_TO_RON;
  } else if (mat.price_eur != null) {
    costEUR = mat.price_eur * qty;
    costRON = costEUR * EUR_TO_RON;
  }

  return {
    costRON: costRON != null ? parseFloat(costRON.toFixed(2)) : null,
    costEUR: costEUR != null ? parseFloat(costEUR.toFixed(2)) : null,
    label: mat.label,
    unit: mat.unit,
    quantity: qty,
  };
}

// ── getMaterialsByCategory ────────────────────────────────────────────────────
// Returnează toate materialele dintr-o categorie.
// categorii: "izolatie", "tamplarie", "hvac", "pv"
export function getMaterialsByCategory(category) {
  return Object.entries(MATERIAL_PRICES_2025)
    .filter(([, mat]) => mat.category === category)
    .map(([id, mat]) => ({ id, ...mat }));
}
