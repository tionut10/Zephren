import { ENERGY_CLASSES_DB, CLASS_LABELS, CO2_CLASSES_DB } from '../data/energy-classes.js';

// ═══════════════════════════════════════════════════════════════
// CLĂDIRI MIXTE — Calcul EP ponderat pe zone funcționale
// Pct. 66 — Conform Mc 001-2022 Art. 5.2 și Tabel 5.2
// ═══════════════════════════════════════════════════════════════

// Categorii funcționale suportate și tipul de prag EP folosit
export const MIXED_USE_CATEGORIES = {
  RI: { label: 'Rezidențial individual',         ep_db_key_cool: 'RI_cool',  ep_db_key_nocool: 'RI_nocool',  co2_key: 'RI' },
  RC: { label: 'Rezidențial colectiv',           ep_db_key_cool: 'RC_cool',  ep_db_key_nocool: 'RC_nocool',  co2_key: 'RC' },
  BI: { label: 'Birouri',                         ep_db_key_cool: 'BI',       ep_db_key_nocool: 'BI',         co2_key: 'BI' },
  CO: { label: 'Comercial',                       ep_db_key_cool: 'CO',       ep_db_key_nocool: 'CO',         co2_key: 'CO' },
  ED: { label: 'Educație',                        ep_db_key_cool: 'ED',       ep_db_key_nocool: 'ED',         co2_key: 'ED' },
  SA: { label: 'Sănătate / Medical',             ep_db_key_cool: 'SA',       ep_db_key_nocool: 'SA',         co2_key: 'SA' },
  HC: { label: 'Hotel / Cazare',                 ep_db_key_cool: 'HC',       ep_db_key_nocool: 'HC',         co2_key: 'HC' },
  SP: { label: 'Sport / Recreere',               ep_db_key_cool: 'SP',       ep_db_key_nocool: 'SP',         co2_key: 'SP' },
  AL: { label: 'Altele',                          ep_db_key_cool: 'AL',       ep_db_key_nocool: 'AL',         co2_key: 'AL' },
};

/**
 * Determină clasa energetică dintr-un EP și un array de praguri.
 * @param {number} ep - energie primară [kWh/(m²·an)]
 * @param {number[]} thresholds - 7 praguri (A+ la F, G implicit)
 * @returns {string} clasa energetică
 */
function getEpClass(ep, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (ep <= thresholds[i]) return CLASS_LABELS[i];
  }
  return 'G';
}

/**
 * Calculează EP ponderat pentru o clădire cu destinație mixtă.
 *
 * @param {Array} zones - [{ id, category: 'RI'|'CO'|..., area_m2, ep_m2, co2_m2, hasCooling }]
 *   - ep_m2: energie primară calculată pentru zona respectivă [kWh/(m²·an)]
 *   - co2_m2: emisii CO₂ pentru zona respectivă [kg CO₂/(m²·an)]
 *   - hasCooling: true dacă zona are sistem de răcire activ
 * @returns {{
 *   ep_weighted: number,
 *   co2_weighted: number,
 *   ep_per_zone: Object,
 *   co2_per_zone: Object,
 *   class_per_zone: Object,
 *   class_global: string,
 *   area_total: number,
 *   dominant_category: string,
 *   breakdown: Array
 * }}
 */
export function calcMixedUsedEP(zones) {
  if (!zones || zones.length === 0) {
    return { ep_weighted: 0, co2_weighted: 0, ep_per_zone: {}, co2_per_zone: {}, class_per_zone: {}, class_global: 'G', area_total: 0, breakdown: [] };
  }

  const totalArea = zones.reduce((s, z) => s + (parseFloat(z.area_m2) || 0), 0);
  if (totalArea <= 0) return { ep_weighted: 0, co2_weighted: 0, ep_per_zone: {}, co2_per_zone: {}, class_per_zone: {}, class_global: 'G', area_total: 0, breakdown: [] };

  let ep_weighted_sum   = 0;
  let co2_weighted_sum  = 0;
  const ep_per_zone     = {};
  const co2_per_zone    = {};
  const class_per_zone  = {};
  const breakdown       = [];

  zones.forEach(zone => {
    const area = parseFloat(zone.area_m2) || 0;
    const ep   = parseFloat(zone.ep_m2) || 0;
    const co2  = parseFloat(zone.co2_m2) || 0;
    const cat  = zone.category || 'AL';
    const catInfo = MIXED_USE_CATEGORIES[cat] || MIXED_USE_CATEGORIES.AL;
    const dbKey = zone.hasCooling ? catInfo.ep_db_key_cool : catInfo.ep_db_key_nocool;
    const db    = ENERGY_CLASSES_DB[dbKey] || ENERGY_CLASSES_DB.AL;
    const co2Db = CO2_CLASSES_DB[catInfo.co2_key] || CO2_CLASSES_DB.AL;

    const weight       = area / totalArea;
    const ep_class     = getEpClass(ep, db.thresholds);
    const co2_class    = getEpClass(co2, co2Db.thresholds);

    ep_weighted_sum  += ep  * weight;
    co2_weighted_sum += co2 * weight;

    const zoneId = zone.id || cat;
    ep_per_zone[zoneId]    = Math.round(ep * 10) / 10;
    co2_per_zone[zoneId]   = Math.round(co2 * 100) / 100;
    class_per_zone[zoneId] = ep_class;

    breakdown.push({
      id: zoneId,
      category: cat,
      label: catInfo.label,
      area_m2: area,
      area_pct: Math.round(weight * 100 * 10) / 10,
      ep_m2: Math.round(ep * 10) / 10,
      co2_m2: Math.round(co2 * 100) / 100,
      ep_class,
      co2_class,
      weight: Math.round(weight * 1000) / 1000,
      ep_contribution: Math.round(ep * weight * 10) / 10,
    });
  });

  const ep_weighted  = Math.round(ep_weighted_sum * 10) / 10;
  const co2_weighted = Math.round(co2_weighted_sum * 100) / 100;

  // Clasa globală: calculată din EP ponderat față de categoria dominantă (cea mai mare suprafață)
  const dominantZone   = zones.reduce((max, z) => (parseFloat(z.area_m2) || 0) > (parseFloat(max.area_m2) || 0) ? z : max, zones[0]);
  const dominantCat    = dominantZone?.category || 'AL';
  const dominantInfo   = MIXED_USE_CATEGORIES[dominantCat] || MIXED_USE_CATEGORIES.AL;
  const globalDbKey    = dominantZone?.hasCooling ? dominantInfo.ep_db_key_cool : dominantInfo.ep_db_key_nocool;
  const globalDb       = ENERGY_CLASSES_DB[globalDbKey] || ENERGY_CLASSES_DB.AL;
  const class_global   = getEpClass(ep_weighted, globalDb.thresholds);

  return {
    ep_weighted,
    co2_weighted,
    ep_per_zone,
    co2_per_zone,
    class_per_zone,
    class_global,
    area_total: Math.round(totalArea * 10) / 10,
    dominant_category: dominantCat,
    breakdown,
  };
}

/**
 * Împarte elementele de anvelopă opacă pe zone funcționale.
 * Logica: elementele sunt atribuite zonei pe baza etajului (floor_index) sau zonei explicite.
 *
 * @param {Array} opaqueElements - [{ id, type, area, floor_index, zoneId, ... }]
 * @param {Array} zones          - [{ id, category, floors: [0,1,2] }]
 * @returns {Object} { [zoneId]: [...elements] }
 */
export function splitEnvelopeByZone(opaqueElements, zones) {
  if (!opaqueElements || !zones) return {};

  const result = {};
  zones.forEach(z => { result[z.id || z.category] = []; });

  opaqueElements.forEach(el => {
    // Atribuire explicită (câmp zoneId)
    if (el.zoneId && result[el.zoneId] !== undefined) {
      result[el.zoneId].push(el);
      return;
    }

    // Atribuire pe baza floor_index
    const floorIdx = el.floor_index ?? null;
    let assigned = false;
    if (floorIdx !== null) {
      for (const z of zones) {
        const floors = z.floors || [];
        if (floors.includes(floorIdx)) {
          const key = z.id || z.category;
          if (result[key]) { result[key].push(el); assigned = true; break; }
        }
      }
    }

    // Fallback: atribuire la zona dominantă (prima zonă)
    if (!assigned) {
      const fallbackKey = zones[0]?.id || zones[0]?.category;
      if (fallbackKey && result[fallbackKey]) {
        result[fallbackKey].push({ ...el, _autoAssigned: true });
      }
    }
  });

  return result;
}

/**
 * Calculează proporția de arie a fiecărei zone față de total.
 * Util pentru afișare/raportare.
 * @param {Array} zones
 * @returns {Array} zone cu câmpul area_pct adăugat
 */
export function calcZoneAreaProportions(zones) {
  const total = zones.reduce((s, z) => s + (parseFloat(z.area_m2) || 0), 0);
  return zones.map(z => ({
    ...z,
    area_pct: total > 0 ? Math.round((parseFloat(z.area_m2) || 0) / total * 1000) / 10 : 0,
  }));
}
