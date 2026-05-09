/**
 * suggestions-catalog.js — Catalog NEUTRU de soluții orientative pentru auditor.
 *
 * Scop: oferă sugestii tehnice (materiale, vitraje, HVAC, PV) bazate pe
 * parametri fizici (U, λ, COP, kWp), FĂRĂ nume de marcă/produs.
 *
 * Schema include câmpuri rezervate (brand, supplierId, affiliateUrl, sku)
 * setate la `null` — vor fi populate ulterior, după lansare, prin colaborări
 * comerciale, fără refactor de arhitectură.
 *
 * SURSE TEHNICE (fizica):
 *   - Mc 001-2022 (U_ref nZEB, λ tipic)
 *   - SR EN ISO 10456 (proprietăți materiale)
 *   - SR EN ISO 10077-1 (vitraje + rame)
 *   - SR EN 14511, SR EN 16147 (HVAC)
 *   - SR EN 15193-1 (iluminat)
 *
 * Costuri: medii orientative piață RO 2025-2026, fără brand.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SCHEMA `priceRange` — IMPORTANT pentru consistența cu rehab-prices.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Sprint Audit Prețuri P2.6 (9 mai 2026) — clarificare schemă:
 *
 * `priceRange.{min, max}` în RON/{m²|buc|sistem} reprezintă DOAR materialul
 * (consultanță tehnică pentru auditor — listă alternative).
 *
 * NU este 1:1 cu rehab-prices.js, care reprezintă sistem instalat COMPLET
 * (material + manoperă + transport + accesorii). Diferență tipică: rehab-prices
 * = 2-3× suggestions-catalog (ex: ins-eps-100 30 RON/m² material vs
 * envelope.wall_eps_10cm.mid 49 EUR × 5.10 ≈ 250 RON/m² sistem ETICS instalat).
 *
 * Step8Advanced afișează explicit footer: „Adăugați 30-50% pentru manoperă".
 *
 * Pentru calcul cost OFERTA / DEVIZ / CPE Post-Rehab → folosiți rehab-prices.js
 * (3 scenarii low/mid/high) sau wrapper-ul cost-index.js cu indexare inflație.
 * Pentru consultanță tehnică selecție material → suggestions-catalog (acest fișier).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @module data/suggestions-catalog
 */

// ── Schema (referință) ────────────────────────────────────────────────────────
// Fiecare entry conține:
//   id            : string unic (slug)
//   category      : "opaque-insulation" | "glazing" | "frame" | "hvac-heating"
//                 | "hvac-cooling" | "ventilation" | "pv" | "lighting" | "bridge"
//   subcategory   : detaliere (ex. "EPS", "vata bazaltica", "PVC", "pompa caldura")
//   label         : denumire generică în RO
//   labelEN       : denumire generică în EN
//   description   : 1 frază orientativă (utilizare tipică)
//   tech          : { lambda, thickness_mm, U, R, g, COP, SCOP, ... }
//   useCase       : array tip element ("PE", "PI", "PT", "AC", "fereastra", ...)
//   priceRange    : { min, max, unit, currency } — interval orientativ piață
//   normRefs      : array referințe normative (ex. ["Mc 001-2022 §3.4", "EN 13163"])
//   tags          : array ("nZEB", "passivhaus", "low-cost", "premium", ...)
//   ─── câmpuri rezervate pentru integrare comercială viitoare ───────────────
//   brand         : null (rezervat — completat post-lansare)
//   supplierId    : null
//   sku           : null
//   affiliateUrl  : null
//   sponsored     : false (flag — entry plătit/sponsorizat)
//   meta          : { createdAt, updatedAt, source: "internal" | "partner" }

const T_NULL = {
  brand: null,
  supplierId: null,
  sku: null,
  affiliateUrl: null,
  sponsored: false,
};

// ── Soluții termoizolație opaca ──────────────────────────────────────────────
export const OPAQUE_INSULATION_SUGGESTIONS = [
  {
    id: "ins-eps-100",
    category: "opaque-insulation",
    subcategory: "EPS",
    label: "Polistiren expandat (EPS) 100 mm",
    labelEN: "Expanded polystyrene (EPS) 100 mm",
    description: "Termosistem ETICS standard pentru pereți exteriori — bun raport preț/performanță.",
    tech: { lambda: 0.037, thickness_mm: 100, R: 2.7 },
    useCase: ["PE"],
    priceRange: { min: 25, max: 35, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13163", "Mc 001-2022 §3.4"],
    tags: ["low-cost", "etics", "rezidential"],
    ...T_NULL,
  },
  {
    id: "ins-eps-150",
    category: "opaque-insulation",
    subcategory: "EPS",
    label: "Polistiren expandat (EPS) 150 mm",
    labelEN: "Expanded polystyrene (EPS) 150 mm",
    description: "Grosime mărită pentru atingere clase superioare A/A+ pe pereți exteriori existenți.",
    tech: { lambda: 0.037, thickness_mm: 150, R: 4.05 },
    useCase: ["PE"],
    priceRange: { min: 38, max: 50, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13163", "Mc 001-2022 §3.4"],
    tags: ["nZEB", "etics"],
    ...T_NULL,
  },
  {
    id: "ins-mw-100",
    category: "opaque-insulation",
    subcategory: "vata-bazaltica",
    label: "Vată bazaltică (MW) 100 mm",
    labelEN: "Stone wool (MW) 100 mm",
    description: "Termoizolație rezistentă la foc (clasa A1) — recomandată pentru clădiri publice și pereți H>28m.",
    tech: { lambda: 0.035, thickness_mm: 100, R: 2.86, fireClass: "A1" },
    useCase: ["PE", "PI", "AC"],
    priceRange: { min: 38, max: 52, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13162", "P118-2013", "Mc 001-2022 §3.4"],
    tags: ["fire-safe", "publica", "nZEB"],
    ...T_NULL,
  },
  {
    id: "ins-mw-150",
    category: "opaque-insulation",
    subcategory: "vata-bazaltica",
    label: "Vată bazaltică (MW) 150 mm",
    labelEN: "Stone wool (MW) 150 mm",
    description: "Premium pentru pereți + acoperiș — performanță termică ridicată cu rezistență la foc.",
    tech: { lambda: 0.035, thickness_mm: 150, R: 4.29, fireClass: "A1" },
    useCase: ["PE", "AC"],
    priceRange: { min: 58, max: 78, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13162", "P118-2013"],
    tags: ["fire-safe", "premium", "nZEB"],
    ...T_NULL,
  },
  {
    id: "ins-xps-80",
    category: "opaque-insulation",
    subcategory: "XPS",
    label: "Polistiren extrudat (XPS) 80 mm",
    labelEN: "Extruded polystyrene (XPS) 80 mm",
    description: "Pentru zone umede sau în contact cu solul (soclu, pardoseli, planșee inferior).",
    tech: { lambda: 0.034, thickness_mm: 80, R: 2.35, waterAbsorption: "<0.7%" },
    useCase: ["PT", "PI-sol"],
    priceRange: { min: 50, max: 70, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13164", "Mc 001-2022 §3.4"],
    tags: ["waterproof", "soclu"],
    ...T_NULL,
  },
  {
    id: "ins-pir-80",
    category: "opaque-insulation",
    subcategory: "PIR",
    label: "Spumă poliuretanică rigidă (PIR) 80 mm",
    labelEN: "Polyurethane (PIR) board 80 mm",
    description: "Performanță maximă în grosime mică — soluție pentru spații cu restricție dimensională.",
    tech: { lambda: 0.022, thickness_mm: 80, R: 3.64 },
    useCase: ["PE", "AC", "PT"],
    priceRange: { min: 95, max: 130, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 13165"],
    tags: ["premium", "passivhaus", "thin"],
    ...T_NULL,
  },
  {
    id: "ins-cellulose-150",
    category: "opaque-insulation",
    subcategory: "celuloza",
    label: "Celuloză insuflată 150 mm",
    labelEN: "Blown cellulose 150 mm",
    description: "Soluție bio pentru poduri și cavități — eco-friendly, capacitate mare termică.",
    tech: { lambda: 0.040, thickness_mm: 150, R: 3.75, biobased: true },
    useCase: ["AC-pod", "PI"],
    priceRange: { min: 32, max: 48, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 15101-1"],
    tags: ["bio", "low-gwp", "rezidential"],
    ...T_NULL,
  },
  {
    id: "ins-aerogel-30",
    category: "opaque-insulation",
    subcategory: "aerogel",
    label: "Saltea aerogel 30 mm",
    labelEN: "Aerogel blanket 30 mm",
    description: "Top tehnologie — folosit pentru clădiri patrimoniu unde grosimea e limitată.",
    tech: { lambda: 0.014, thickness_mm: 30, R: 2.14 },
    useCase: ["patrimoniu", "PI-istoric"],
    priceRange: { min: 380, max: 580, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 16873"],
    tags: ["patrimoniu", "thin", "premium"],
    ...T_NULL,
  },
];

// ── Soluții vitraje ───────────────────────────────────────────────────────────
export const GLAZING_SUGGESTIONS = [
  {
    id: "glz-2g-lowe",
    category: "glazing",
    subcategory: "dublu-vitraj",
    label: "Dublu vitraj Low-E argon",
    labelEN: "Double glazing Low-E argon-filled",
    description: "Standard actual pentru rezidențial — atinge U ≤ 1.30 W/m²K.",
    tech: { U: 1.1, g: 0.62, configuration: "4-16Ar-4 Low-E" },
    useCase: ["fereastra", "usa-vitrata"],
    priceRange: { min: 280, max: 380, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 1279", "EN 410", "EN 673"],
    tags: ["nZEB-rezidential", "standard"],
    ...T_NULL,
  },
  {
    id: "glz-3g-lowe",
    category: "glazing",
    subcategory: "triplu-vitraj",
    label: "Triplu vitraj Low-E argon",
    labelEN: "Triple glazing Low-E argon-filled",
    description: "Premium pentru clase A+ și nZEB strict — U ≤ 0.80 W/m²K.",
    tech: { U: 0.7, g: 0.50, configuration: "4-12Ar-4-12Ar-4 2×Low-E" },
    useCase: ["fereastra", "usa-vitrata"],
    priceRange: { min: 480, max: 680, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 1279", "EN 410", "EN 673"],
    tags: ["nZEB", "passivhaus", "premium"],
    ...T_NULL,
  },
  {
    id: "glz-3g-krypton",
    category: "glazing",
    subcategory: "triplu-vitraj",
    label: "Triplu vitraj Low-E krypton (Passivhaus)",
    labelEN: "Triple glazing Low-E krypton-filled",
    description: "Performanță Passivhaus certificată — U ≤ 0.50 W/m²K, recomandat clădiri zero-energie.",
    tech: { U: 0.5, g: 0.50, configuration: "4-12Kr-4-12Kr-4 2×Low-E" },
    useCase: ["fereastra"],
    priceRange: { min: 850, max: 1200, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 1279", "EN 410", "EN 673", "PHI Passivhaus criterii"],
    tags: ["passivhaus", "premium"],
    ...T_NULL,
  },
  {
    id: "glz-2g-acustic",
    category: "glazing",
    subcategory: "dublu-vitraj",
    label: "Dublu vitraj acustic Low-E",
    labelEN: "Acoustic double glazing Low-E",
    description: "Pentru clădiri în zone cu trafic intens — atenuare ≥ 38 dB + Low-E.",
    tech: { U: 1.2, g: 0.60, Rw: 38 },
    useCase: ["fereastra-zona-zgomot"],
    priceRange: { min: 380, max: 520, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 12758", "ISO 717-1"],
    tags: ["acoustic", "urban"],
    ...T_NULL,
  },
];

// ── Soluții rame tâmplărie ───────────────────────────────────────────────────
export const FRAME_SUGGESTIONS = [
  {
    id: "frm-pvc-5cam",
    category: "frame",
    subcategory: "PVC",
    label: "Ramă PVC 5 camere",
    labelEN: "PVC frame 5 chambers",
    description: "Standard rezidențial actual — bună izolare termică, mentenanță minimă.",
    tech: { U: 1.4, depth_mm: 70, chambers: 5 },
    useCase: ["fereastra", "usa-vitrata"],
    priceRange: { min: 140, max: 220, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 12608", "EN ISO 10077-2"],
    tags: ["rezidential", "standard"],
    ...T_NULL,
  },
  {
    id: "frm-pvc-7cam",
    category: "frame",
    subcategory: "PVC",
    label: "Ramă PVC 7 camere (premium)",
    labelEN: "PVC frame 7 chambers premium",
    description: "Performanță avansată — pentru combinație cu triplu vitraj nZEB/Passivhaus.",
    tech: { U: 0.9, depth_mm: 86, chambers: 7 },
    useCase: ["fereastra"],
    priceRange: { min: 280, max: 420, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 12608", "EN ISO 10077-2"],
    tags: ["nZEB", "passivhaus", "premium"],
    ...T_NULL,
  },
  {
    id: "frm-alu-rupt",
    category: "frame",
    subcategory: "aluminiu",
    label: "Ramă aluminiu cu rupere termică",
    labelEN: "Thermally broken aluminum frame",
    description: "Estetic minimalist + rezistență mare — pentru clădiri comerciale și birouri.",
    tech: { U: 1.6, depth_mm: 70, thermalBreak: true },
    useCase: ["fereastra-comercial", "fatada-cortina"],
    priceRange: { min: 380, max: 550, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 14351-1", "EN ISO 10077-2"],
    tags: ["comercial", "birouri"],
    ...T_NULL,
  },
  {
    id: "frm-lemn-stratif",
    category: "frame",
    subcategory: "lemn",
    label: "Ramă lemn stratificat",
    labelEN: "Laminated wood frame",
    description: "Clădiri patrimoniu și construcții bio — estetic clasic, izolare excelentă.",
    tech: { U: 1.3, depth_mm: 78, biobased: true },
    useCase: ["patrimoniu", "rezidential-premium"],
    priceRange: { min: 450, max: 750, unit: "RON/m²", currency: "RON" },
    normRefs: ["EN 14220", "EN ISO 10077-2"],
    tags: ["bio", "patrimoniu"],
    ...T_NULL,
  },
];

// ── Soluții HVAC încălzire ───────────────────────────────────────────────────
export const HEATING_SUGGESTIONS = [
  {
    id: "hp-aer-apa-8",
    category: "hvac-heating",
    subcategory: "pompa-caldura-aer-apa",
    label: "Pompă de căldură aer-apă 8 kW",
    labelEN: "Air-to-water heat pump 8 kW",
    description: "Tipic pentru locuință individuală 100-150 m² — încălzire + ACM + cooling reversibil.",
    tech: { capacity_kW: 8, COP: 4.2, SCOP: 4.0, refrigerant: "R32", fuelType: "electric" },
    useCase: ["rezidential-locuinta", "rezidential-bloc-mic"],
    priceRange: { min: 14000, max: 22000, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 14511", "EN 14825", "Mc 001-2022 §V"],
    tags: ["nZEB", "regenerabil-partial", "L.238/2024"],
    ...T_NULL,
  },
  {
    id: "hp-aer-apa-16",
    category: "hvac-heating",
    subcategory: "pompa-caldura-aer-apa",
    label: "Pompă de căldură aer-apă 16 kW",
    labelEN: "Air-to-water heat pump 16 kW",
    description: "Pentru bloc mic / locuință mare 200-300 m² — încălzire + ACM centralizat.",
    tech: { capacity_kW: 16, COP: 4.0, SCOP: 3.8, refrigerant: "R32" },
    useCase: ["rezidential-bloc", "comercial-mic"],
    priceRange: { min: 26000, max: 38000, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 14511", "EN 14825"],
    tags: ["nZEB", "regenerabil-partial"],
    ...T_NULL,
  },
  {
    id: "hp-sol-apa-10",
    category: "hvac-heating",
    subcategory: "pompa-caldura-sol-apa",
    label: "Pompă de căldură sol-apă 10 kW (geotermală)",
    labelEN: "Ground-source heat pump 10 kW",
    description: "COP cel mai stabil — investiție mai mare, recuperare 8-12 ani.",
    tech: { capacity_kW: 10, COP: 4.8, SCOP: 4.5 },
    useCase: ["rezidential-locuinta-mare", "publica"],
    priceRange: { min: 45000, max: 75000, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 14511", "EN 15450"],
    tags: ["nZEB", "regenerabil", "premium"],
    ...T_NULL,
  },
  {
    id: "boiler-condens-24",
    category: "hvac-heating",
    subcategory: "centrala-condensatie",
    label: "Centrală condensație 24 kW",
    labelEN: "Condensing boiler 24 kW",
    description: "Backup sau soluție tranzitorie — randament ≥ 92% (interzisă post-2030 conform EPBD).",
    tech: { capacity_kW: 24, efficiency: 0.94, fuelType: "gaz-natural" },
    useCase: ["rezidential", "tranzitoriu"],
    priceRange: { min: 4500, max: 8000, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 15502-1", "EPBD 2024 art.17"],
    tags: ["legacy", "fade-out-2030"],
    warnings: ["EPBD 2024: interdicție subvenții 2025, interdicție instalare nouă 2030."],
    ...T_NULL,
  },
];

// ── Soluții HVAC răcire ──────────────────────────────────────────────────────
export const COOLING_SUGGESTIONS = [
  {
    id: "vrf-12kw",
    category: "hvac-cooling",
    subcategory: "VRF",
    label: "Sistem VRF 12 kW (multi-split)",
    labelEN: "VRF multi-split 12 kW",
    description: "Pentru clădiri cu zone multiple — control individual per cameră.",
    tech: { capacity_kW: 12, EER: 3.6, SEER: 6.5, refrigerant: "R32" },
    useCase: ["birouri", "comercial", "rezidential-mare"],
    priceRange: { min: 18000, max: 28000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 14511", "EN 14825"],
    tags: ["birouri", "modular"],
    ...T_NULL,
  },
  {
    id: "split-3.5kw",
    category: "hvac-cooling",
    subcategory: "split-inverter",
    label: "Split inverter 3.5 kW (cameră 25-35 m²)",
    labelEN: "Split inverter 3.5 kW (room 25-35 m²)",
    description: "Soluție individuală — răcire + încălzire pompă căldură pentru 1 cameră.",
    tech: { capacity_kW: 3.5, EER: 3.8, SEER: 7.0, SCOP: 4.0 },
    useCase: ["rezidential-camera", "birou-mic"],
    priceRange: { min: 2200, max: 3500, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 14511"],
    tags: ["rezidential", "low-cost"],
    ...T_NULL,
  },
];

// ── Soluții ventilare ────────────────────────────────────────────────────────
// Sprint mai 2026 — sizeTag pentru filtrare per suprafață clădire
export const VENTILATION_SUGGESTIONS = [
  {
    id: "vmc-dual-small",
    category: "ventilation",
    subcategory: "VMC-dual-flow-small",
    label: "VMC dual-flux compact (apartament ≤ 120 m²)",
    labelEN: "Compact MVHR dual-flow (apartment ≤ 120 m²)",
    description: "Dimensiune redusă — debit 100-200 m³/h, recuperare ≥ 85%, instalare bucătărie/dressing.",
    tech: { recoveryEff: 0.85, sfp_kW_per_m3s: 0.40, airflow_m3h_max: 200, sizeTag: "small", filterClass: "F7" },
    useCase: ["nZEB", "rezidential-mic", "rezidential-existent"],
    priceRange: { min: 6000, max: 12000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 13141-7", "EN 16798-3"],
    tags: ["nZEB", "rezidential", "compact"],
    ...T_NULL,
  },
  {
    id: "vmc-dual-90",
    category: "ventilation",
    subcategory: "VMC-dual-flow-recuperare",
    label: "VMC dual-flux cu recuperare ≥ 90% (medium)",
    labelEN: "MVHR dual-flow ≥ 90% recovery (medium)",
    description: "Obligatoriu nZEB — recuperator căldură entalpic, filtre F7+, SFP < 0.45 W/(l/s).",
    tech: { recoveryEff: 0.92, sfp_kW_per_m3s: 0.42, airflow_m3h_max: 1000, sizeTag: "medium", filterClass: "F7" },
    useCase: ["nZEB", "passivhaus"],
    priceRange: { min: 12000, max: 24000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 13141", "EN 16798-3", "Mc 001-2022 §VI"],
    tags: ["nZEB", "passivhaus", "obligatoriu"],
    ...T_NULL,
  },
  {
    id: "vmc-doas-commercial",
    category: "ventilation",
    subcategory: "DOAS",
    label: "DOAS comercial (clădiri ≥ 500 m²)",
    labelEN: "DOAS commercial (buildings ≥ 500 m²)",
    description: "Sistem dedicat aer proaspăt — debit 1000-5000 m³/h, recuperare entalpică 80%, decuplat de încălzire/răcire.",
    tech: { recoveryEff: 0.80, sfp_kW_per_m3s: 1.80, airflow_m3h_max: 5000, sizeTag: "large", hasEnthalpy: true, filterClass: "F9" },
    useCase: ["birouri", "comercial", "publica"],
    priceRange: { min: 35000, max: 80000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 16798-3", "ASHRAE 62.1"],
    tags: ["nZEB", "comercial", "passivhaus"],
    ...T_NULL,
  },
  {
    id: "vmc-single",
    category: "ventilation",
    subcategory: "VMC-single-flow",
    label: "VMC simplu flux (extragere centralizată)",
    labelEN: "MEV single-flow (central extraction)",
    description: "Soluție economică pentru rezidențial mic — fără recuperare căldură.",
    tech: { recoveryEff: 0, sfp_kW_per_m3s: 0.30, airflow_m3h_max: 500, sizeTag: "small" },
    useCase: ["rezidential-existent"],
    priceRange: { min: 3500, max: 6500, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 13141"],
    tags: ["low-cost", "renovare-usoara"],
    ...T_NULL,
  },
];

// ── Soluții ACM ──────────────────────────────────────────────────────────────
// Sprint mai 2026 — Task 4 catalog dedicat preparare apă caldă consum
export const ACM_SUGGESTIONS = [
  {
    id: "hpwh-200l",
    category: "hvac-acm",
    subcategory: "boiler-pompa-caldura",
    label: "Boiler pompă căldură 200L (HPWH)",
    labelEN: "Heat pump water heater 200L",
    description: "COP = 3.2 cu agent R290 — autonomie ridicată locuință 4 persoane, eligibil Casa Verde.",
    tech: { capacity_L: 200, COP: 3.2, refrigerant: "R290", powerInput_kW: 0.6 },
    useCase: ["rezidential-locuinta", "rezidential-bloc-mic"],
    priceRange: { min: 1500, max: 3500, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 16147", "ErP Reg. 814/2013"],
    tags: ["nZEB", "regenerabil-partial", "casa-verde"],
    ...T_NULL,
  },
  {
    id: "solar-acm-flat-2m2",
    category: "hvac-acm",
    subcategory: "solar-termic-acm",
    label: "Sistem solar termic 2 m² + boiler 150L",
    labelEN: "Solar thermal 2 m² + 150L tank",
    description: "Acoperă 50-65% necesar ACM anual — colector plat selectiv, boiler bivalent dublu serpentine.",
    tech: { capacity_L: 150, collectorArea_m2: 2, solarFraction: 0.6, COP: 3.5 },
    useCase: ["rezidential-locuinta", "nZEB"],
    priceRange: { min: 4000, max: 7000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 12975", "EN 12976", "Solar Keymark"],
    tags: ["nZEB", "regenerabil", "passivhaus"],
    ...T_NULL,
  },
  {
    id: "boiler-electric-100l",
    category: "hvac-acm",
    subcategory: "boiler-electric",
    label: "Boiler electric 100L (rezistor)",
    labelEN: "Electric resistance water heater 100L",
    description: "Soluție tranzitorie low-cost — randament 99% conversie dar fP ridicat, NU recomandat nZEB.",
    tech: { capacity_L: 100, COP: 0.99, fuelType: "electricitate" },
    useCase: ["rezidential", "tranzitoriu"],
    priceRange: { min: 600, max: 1800, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 60335-2-21"],
    tags: ["legacy", "low-cost"],
    warnings: ["fP_ren = 2.0 → consum primar mare; preferați HPWH sau solar termic pentru nZEB."],
    ...T_NULL,
  },
];

// ── Soluții fotovoltaice ─────────────────────────────────────────────────────
export const PV_SUGGESTIONS = [
  {
    id: "pv-3kwp-rezidential",
    category: "pv",
    subcategory: "sistem-rezidential",
    label: "Sistem PV 3 kWp (rezidențial standard)",
    labelEN: "PV system 3 kWp (residential)",
    description: "Acoperă ~30-40% consum locuință medie — 7-9 panouri 400W + invertor 3kW.",
    tech: { kWp: 3, panelCount: 8, panelW: 400, inverter_kW: 3, productionMWh: 3.6 },
    useCase: ["rezidential", "casa-verde"],
    priceRange: { min: 14000, max: 20000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 50380", "Programul Casa Verde Fotovoltaice"],
    tags: ["nZEB", "regenerabil", "rezidential", "casa-verde"],
    ...T_NULL,
  },
  {
    id: "pv-6kwp-rezidential",
    category: "pv",
    subcategory: "sistem-rezidential",
    label: "Sistem PV 6 kWp + storage 5 kWh",
    labelEN: "PV system 6 kWp + 5 kWh battery",
    description: "Autonomie ridicată — locuință 4 persoane cu pompă căldură + EV.",
    tech: { kWp: 6, batteryKWh: 5, productionMWh: 7.2 },
    useCase: ["rezidential-premium", "nZEB"],
    priceRange: { min: 32000, max: 48000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 50380", "EN 62619 baterii"],
    tags: ["nZEB", "regenerabil", "battery"],
    ...T_NULL,
  },
  {
    id: "pv-30kwp-comercial",
    category: "pv",
    subcategory: "sistem-comercial",
    label: "Sistem PV 30 kWp (comercial mediu)",
    labelEN: "PV system 30 kWp (commercial)",
    description: "Acoperă cca 60-80 m² acoperiș — birouri / hală mică.",
    tech: { kWp: 30, panelCount: 75, panelW: 400, productionMWh: 36 },
    useCase: ["comercial", "birouri", "industrial-mic"],
    priceRange: { min: 95000, max: 145000, unit: "RON/sistem", currency: "RON" },
    normRefs: ["EN 50380"],
    tags: ["comercial", "regenerabil"],
    ...T_NULL,
  },
];

// ── Soluții iluminat ─────────────────────────────────────────────────────────
export const LIGHTING_SUGGESTIONS = [
  {
    id: "led-4000k-corp",
    category: "lighting",
    subcategory: "corp-led",
    label: "Corp LED 36W 4000K (panel 60×60)",
    labelEN: "LED panel 36W 4000K (60×60)",
    description: "Tipic birou — eficacitate ≥ 110 lm/W, IRC ≥ 80, control DALI compatibil.",
    tech: { power_W: 36, efficacy_lm_W: 115, CRI: 80, dimmable: true },
    useCase: ["birou", "comercial", "publica"],
    priceRange: { min: 180, max: 320, unit: "RON/buc", currency: "RON" },
    normRefs: ["EN 12464-1", "SR EN 15193-1"],
    tags: ["LED", "DALI", "comercial"],
    ...T_NULL,
  },
  {
    id: "led-control-presence",
    category: "lighting",
    subcategory: "control-prezenta",
    label: "Control prezență + lumina zilei (BACS C)",
    labelEN: "Presence + daylight control (BACS class C)",
    description: "Reducere LENI cu 30-50% — obligatoriu pentru birouri nZEB.",
    tech: { savings_pct: 35, BACS_class: "C" },
    useCase: ["birou", "publica", "nZEB"],
    priceRange: { min: 800, max: 1500, unit: "RON/zonă", currency: "RON" },
    normRefs: ["SR EN ISO 52120-1", "EN 15193-1"],
    tags: ["BACS", "nZEB", "smart"],
    ...T_NULL,
  },
];

// ── Soluții tratare punți termice ────────────────────────────────────────────
export const BRIDGE_SUGGESTIONS = [
  {
    id: "br-balcon-thermal-break",
    category: "bridge",
    subcategory: "balcon-rupere-termica",
    label: "Element izolare termică racord balcon",
    labelEN: "Thermal break for balcony connection",
    description: "Reduce ψ de la ~0.95 la ~0.20 W/(m·K) — obligatoriu nZEB pe consolă.",
    tech: { psi_before: 0.95, psi_after: 0.20, classISO: "A" },
    useCase: ["balcon-consola"],
    priceRange: { min: 380, max: 650, unit: "RON/m liniar", currency: "RON" },
    normRefs: ["ISO 14683", "Mc 001-2022 Anexa K"],
    tags: ["nZEB", "punte-termica"],
    ...T_NULL,
  },
  {
    id: "br-soclu-xps",
    category: "bridge",
    subcategory: "soclu-XPS",
    label: "Tratare soclu cu XPS 80 mm (-30 cm)",
    labelEN: "Plinth treatment XPS 80 mm (-30 cm)",
    description: "Continuitate izolație de la fațadă în soclu — eliminare punte termică sol.",
    tech: { psi_before: 0.55, psi_after: 0.12, depth_cm: 30 },
    useCase: ["soclu", "racord-sol"],
    priceRange: { min: 85, max: 130, unit: "RON/m liniar", currency: "RON" },
    normRefs: ["ISO 14683"],
    tags: ["soclu", "nZEB"],
    ...T_NULL,
  },
];

// ── Index global pentru filtrare rapidă ──────────────────────────────────────
export const ALL_SUGGESTIONS = [
  ...OPAQUE_INSULATION_SUGGESTIONS,
  ...GLAZING_SUGGESTIONS,
  ...FRAME_SUGGESTIONS,
  ...HEATING_SUGGESTIONS,
  ...COOLING_SUGGESTIONS,
  ...VENTILATION_SUGGESTIONS,
  ...ACM_SUGGESTIONS,
  ...PV_SUGGESTIONS,
  ...LIGHTING_SUGGESTIONS,
  ...BRIDGE_SUGGESTIONS,
];

// ── Metadate ─────────────────────────────────────────────────────────────────
// Sprint 27 P2.12 — versiune SemVer pentru migrare automată consumatori
// Sprint 27 P2.14 — minor bump 1.0.0 → 1.1.0 (suport sortare GWP în suggestForOpaqueElement)
export const CATALOG_VERSION = "1.1.0";
export const CATALOG_UPDATED = "2026-04-26";
export const CATALOG_DISCLAIMER =
  "Sugestii orientative bazate pe parametri fizici tipici. Prețurile sunt estimative pentru piața RO 2025-2026 " +
  "și NU constituie ofertă comercială. Pentru oferte concrete, contactați furnizori autorizați.";

// ─────────────────────────────────────────────────────────────────────────────
// API public — funcții de filtrare
// ─────────────────────────────────────────────────────────────────────────────

/**
 * filterByCategory — Returnează entries dintr-o categorie.
 * @param {string} category — "opaque-insulation" | "glazing" | ...
 * @returns {Array} entries
 */
export function filterByCategory(category) {
  if (!category) return [];
  return ALL_SUGGESTIONS.filter(s => s.category === category);
}

/**
 * filterByUseCase — Returnează entries care se aplică unui caz de utilizare.
 * @param {string} useCase — "PE", "fereastra", "rezidential", ...
 * @returns {Array} entries
 */
export function filterByUseCase(useCase) {
  if (!useCase) return [];
  return ALL_SUGGESTIONS.filter(s => s.useCase?.includes(useCase));
}

/**
 * suggestForOpaqueElement — Sugerează termoizolații pentru element opac.
 *
 * Algoritm:
 *   1. Filtrează doar OPAQUE_INSULATION pentru tipul elementului (PE/PI/AC/PT)
 *   2. Calculează R necesar = 1/U_target − R_existent_estimat
 *   3. Ordonează după (atinge target ? 0 : 1) THEN cost ascendent
 *   4. Returnează top N
 *
 * @param {object} params
 * @param {string} params.elementType — "PE" | "PI" | "AC" | "PT"
 * @param {number} params.uCurrent — U actual (W/m²K)
 * @param {number} params.uTarget — U țintă (W/m²K)
 * @param {string[]} params.preferredTags — preferințe ("low-cost", "premium", "fire-safe", ...)
 * @param {number} params.limit — număr maxim rezultate (default 3)
 * @returns {Array} top sugestii cu câmp `meetsTarget` adăugat
 */
export function suggestForOpaqueElement({
  elementType,
  uCurrent,
  uTarget,
  preferredTags = [],
  limit = 3,
}) {
  const candidates = OPAQUE_INSULATION_SUGGESTIONS.filter(s =>
    s.useCase?.some(u => u === elementType || u.startsWith(elementType + "-"))
  );

  // R necesar suplimentar pentru atingerea uTarget
  // Pornind de la uCurrent: Rc = 1/uCurrent. Dorim 1/uTarget. ΔR = 1/uTarget − 1/uCurrent
  const deltaR =
    uCurrent > 0 && uTarget > 0
      ? Math.max(0, 1 / uTarget - 1 / uCurrent)
      : null;

  const scored = candidates.map(s => {
    const meetsTarget = deltaR === null ? true : s.tech.R >= deltaR;
    const tagMatch = preferredTags.length
      ? s.tags.filter(t => preferredTags.includes(t)).length
      : 0;
    const avgPrice = (s.priceRange.min + s.priceRange.max) / 2;
    return { ...s, meetsTarget, tagMatch, _avgPrice: avgPrice };
  });

  // Sprint 27 P2.13 — prioritizare patrimoniu (aerogel, celuloză, materiale tradiționale)
  // când preferredTags include "patrimoniu" → soluții cu tag "patrimoniu" prioritizate
  const isPatrimony = preferredTags.includes("patrimoniu");
  // Sprint 27 P2.14 — sort secundar pe GWP când preferredTags include "low-gwp"
  // (folosește gwp_kgco2e_per_m2 din entry sau 999 fallback dacă nedefinit)
  const isLowGwp = preferredTags.includes("low-gwp");
  scored.sort((a, b) => {
    if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
    // Patrimoniu: solutiile compatibile (aerogel, celuloză) primele indiferent de cost
    if (isPatrimony) {
      const aPat = a.tags.includes("patrimoniu") ? 1 : 0;
      const bPat = b.tags.includes("patrimoniu") ? 1 : 0;
      if (aPat !== bPat) return bPat - aPat;
    }
    if (a.tagMatch !== b.tagMatch) return b.tagMatch - a.tagMatch;
    // Sprint 27 P2.14 — Low-GWP: sortare ascendentă pe GWP (mai mic = mai bun)
    if (isLowGwp) {
      const aGwp = a.gwp_kgco2e_per_m2 ?? 999;
      const bGwp = b.gwp_kgco2e_per_m2 ?? 999;
      if (aGwp !== bGwp) return aGwp - bGwp;
    }
    return a._avgPrice - b._avgPrice;
  });

  return scored.slice(0, limit);
}

/**
 * suggestForGlazingElement — Sugerează vitraje + rame pentru un element glazat.
 *
 * @param {object} params
 * @param {number} params.uTarget — U țintă pentru element vitrat (W/m²K)
 * @param {boolean} params.isDoor
 * @param {string[]} params.preferredTags
 * @param {number} params.limit — default 3 vitraje + 3 rame
 * @returns {{ glazings: Array, frames: Array }}
 */
export function suggestForGlazingElement({
  uTarget,
  isDoor = false,
  preferredTags = [],
  limit = 3,
}) {
  const useCase = isDoor ? "usa-vitrata" : "fereastra";

  const filterAndScore = (pool) => {
    const candidates = pool.filter(
      s => s.useCase?.includes(useCase) || s.useCase?.some(u => u.startsWith("fereastra"))
    );
    return candidates
      .map(s => {
        const meetsTarget = uTarget ? s.tech.U <= uTarget : true;
        const tagMatch = preferredTags.length
          ? s.tags.filter(t => preferredTags.includes(t)).length
          : 0;
        const avgPrice = (s.priceRange.min + s.priceRange.max) / 2;
        return { ...s, meetsTarget, tagMatch, _avgPrice: avgPrice };
      })
      .sort((a, b) => {
        if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
        if (a.tagMatch !== b.tagMatch) return b.tagMatch - a.tagMatch;
        return a._avgPrice - b._avgPrice;
      })
      .slice(0, limit);
  };

  return {
    glazings: filterAndScore(GLAZING_SUGGESTIONS),
    frames: filterAndScore(FRAME_SUGGESTIONS),
  };
}

/**
 * suggestHVAC — Sugerează soluții HVAC bazate pe necesar termic + funcție.
 *
 * @param {object} params
 * @param {"heating"|"cooling"|"both"} params.functionType
 * @param {number} params.peakLoad_kW — sarcină maximă (opțional, auto din area)
 * @param {string} params.climateZone — "I"|"II"|"III"|"IV"|"V" (Mc 001-2022)
 * @param {string} params.buildingCategory — categorie clădire (RI/RC/BCC/BI/...)
 * @param {number} params.buildingArea — Au m² (pentru estimare load orientativă)
 * @param {string[]} params.preferredTags
 * @param {number} params.limit
 */
export function suggestHVAC({
  functionType = "heating",
  peakLoad_kW,
  climateZone,
  buildingCategory,
  buildingArea,
  preferredTags = [],
  limit = 3,
}) {
  // Auto peakLoad din suprafață (orientativ ~70 W/m² locuință medie zonă III)
  let effectiveLoad = peakLoad_kW;
  if (!effectiveLoad && buildingArea > 0) {
    effectiveLoad = buildingArea * 0.07;
  }

  // Prag SCOP dinamic per zonă climatică Mc 001-2022:
  //   Zona I (Tg-Mureș/Suceava, design −21 °C): 3.8 (HP sol-apă preferred)
  //   Zona II-III (Cluj/București): 3.6
  //   Zona IV-V (litoral/Dobrogea-sud): 3.5
  let scopThreshold = 3.5;
  if (climateZone === "I") scopThreshold = 3.8;
  else if (climateZone === "II" || climateZone === "III") scopThreshold = 3.6;

  // Clădire publică (cf. P118/2013): EPS-baseline interzis pe pereți H>28m,
  // soluțiile fără tag "fire-safe" pierd meetsTarget chiar dacă SCOP e suficient.
  const isPublic = ["BCC", "BCA", "BC", "BI"].includes(buildingCategory || "");

  const pools = [];
  if (functionType === "heating" || functionType === "both") pools.push(...HEATING_SUGGESTIONS);
  if (functionType === "cooling" || functionType === "both") pools.push(...COOLING_SUGGESTIONS);

  const scored = pools
    .map(s => {
      const cap = s.tech.capacity_kW || 0;
      const matchLoad = effectiveLoad ? Math.abs(cap - effectiveLoad) / effectiveLoad : 0;
      const tagMatch = preferredTags.length
        ? s.tags.filter(t => preferredTags.includes(t)).length
        : 0;
      const avgPrice = (s.priceRange.min + s.priceRange.max) / 2;

      // meetsTarget: prag nZEB Mc 001-2022 / EPBD 2024 cu ajustare zonă
      let meetsTarget = true;
      if (functionType === "heating" || functionType === "both") {
        const scop = s.tech?.SCOP ?? s.tech?.COP;
        if (scop != null) meetsTarget = scop >= scopThreshold;
        else if (s.tech?.efficiency != null) meetsTarget = false;
        if (s.tech?.fuelType === "gaz-natural") meetsTarget = false;
      }
      if (functionType === "cooling") {
        const seer = s.tech?.SEER ?? s.tech?.EER;
        if (seer != null) meetsTarget = seer >= 5.0;
      }
      // Constrângere foc clădire publică (P118/2013)
      if (isPublic && meetsTarget && !s.tags.includes("fire-safe")) {
        meetsTarget = false;
      }

      return { ...s, meetsTarget, _matchLoad: matchLoad, tagMatch, _avgPrice: avgPrice };
    })
    .sort((a, b) => {
      if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
      if (a.tagMatch !== b.tagMatch) return b.tagMatch - a.tagMatch;
      if (Math.abs(a._matchLoad - b._matchLoad) > 0.01) return a._matchLoad - b._matchLoad;
      return a._avgPrice - b._avgPrice;
    })
    .slice(0, limit);

  return scored;
}

/**
 * suggestPV — Sugerează sisteme PV bazate pe consum / suprafață disponibilă.
 *
 * @param {object} params
 * @param {number} params.targetKWp — kWp orientativ (opțional, auto din area)
 * @param {number} params.buildingArea — Au m² pentru estimare ~50 Wp/m²
 * @param {string[]} params.preferredTags
 * @param {number} params.limit
 */
export function suggestPV({ targetKWp, buildingArea, preferredTags = [], limit = 3 }) {
  // Auto targetKWp din suprafață utilă (~50 Wp/m² regulă orientativă RO 2026)
  let effectiveTarget = targetKWp;
  if (!effectiveTarget && buildingArea > 0) {
    effectiveTarget = buildingArea * 0.05;
  }

  const scored = PV_SUGGESTIONS.map(s => {
    const match = effectiveTarget ? Math.abs(s.tech.kWp - effectiveTarget) / effectiveTarget : 0;
    const tagMatch = preferredTags.length
      ? s.tags.filter(t => preferredTags.includes(t)).length
      : 0;
    const avgPrice = (s.priceRange.min + s.priceRange.max) / 2;
    return { ...s, _match: match, tagMatch, _avgPrice: avgPrice };
  })
    .sort((a, b) => {
      if (Math.abs(a._match - b._match) > 0.05) return a._match - b._match;
      if (a.tagMatch !== b.tagMatch) return b.tagMatch - a.tagMatch;
      return a._avgPrice - b._avgPrice;
    })
    .slice(0, limit);
  return scored;
}

/**
 * suggestACM — Sugerează soluții preparare apă caldă consum.
 *
 * @param {object} params
 * @param {number} params.residents — număr locatari (filtrare capacity_L ≥ 50L × residents)
 * @param {string[]} params.preferredTags
 * @param {number} params.limit
 */
export function suggestACM({ residents, preferredTags = [], limit = 3 }) {
  const minCapacity = residents > 0 ? residents * 50 : 0;

  const scored = ACM_SUGGESTIONS.map(s => {
    const cap = s.tech.capacity_L || 0;
    const matchSize = minCapacity > 0
      ? Math.abs(cap - minCapacity) / Math.max(minCapacity, 1)
      : 0;
    const tagMatch = preferredTags.length
      ? s.tags.filter(t => preferredTags.includes(t)).length
      : 0;
    const avgPrice = (s.priceRange.min + s.priceRange.max) / 2;
    // meetsTarget pentru nZEB: COP ≥ 2.5 (HPWH/solar) și fără tag legacy
    const cop = s.tech?.COP ?? 1.0;
    const meetsTarget = cop >= 2.5 && !s.tags.includes("legacy");
    return { ...s, meetsTarget, _matchSize: matchSize, tagMatch, _avgPrice: avgPrice };
  });

  // Filtrare soft: dacă residents furnizat și există entries cu capacitate suficientă,
  // ascundem entries sub-dimensionate; altfel păstrăm tot pool-ul
  let pool = scored;
  if (minCapacity > 0) {
    const sized = scored.filter(s => (s.tech.capacity_L || 0) >= minCapacity);
    if (sized.length > 0) pool = sized;
  }

  return pool
    .sort((a, b) => {
      if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1;
      if (a.tagMatch !== b.tagMatch) return b.tagMatch - a.tagMatch;
      if (Math.abs(a._matchSize - b._matchSize) > 0.05) return a._matchSize - b._matchSize;
      return a._avgPrice - b._avgPrice;
    })
    .slice(0, limit);
}

/**
 * formatPriceRange — Helper UI pentru afișare interval preț.
 */
export function formatPriceRange(range) {
  if (!range || range.min == null || range.max == null) return "—";
  return `${range.min}-${range.max} ${range.unit}`;
}

export default {
  ALL_SUGGESTIONS,
  CATALOG_VERSION,
  CATALOG_UPDATED,
  CATALOG_DISCLAIMER,
  filterByCategory,
  filterByUseCase,
  suggestForOpaqueElement,
  suggestForGlazingElement,
  suggestHVAC,
  suggestPV,
  suggestACM,
  formatPriceRange,
};
