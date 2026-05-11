import { ENERGY_CLASSES_DB, CO2_CLASSES_DB, CLASS_LABELS, CLASS_COLORS } from '../data/energy-classes.js';

export function getEnergyClass(epKwhM2, categoryKey) {
  const grid = ENERGY_CLASSES_DB[categoryKey];
  if (!grid) return { cls:"—", idx:-1, score:0, color:"#666666" };
  // Clădirile cu EP ≤ 0 (net-zero sau net-pozitive după regenerabile) → clasa A+.
  // "—" doar pentru input invalid (null/NaN); EP=0 NU înseamnă sistem absent —
  // pentru utilitare absente se folosește getServiceClass (energy-classes.js).
  if (epKwhM2 == null || isNaN(epKwhM2)) {
    return { cls:"—", idx:-1, score:0, color:"#666666" };
  }
  const t = grid.thresholds;
  for (let i = 0; i < t.length; i++) {
    if (epKwhM2 <= t[i]) {
      const low = i === 0 ? 0 : t[i-1];
      const high = t[i];
      const pctInBand = high > low ? (epKwhM2 - low) / (high - low) : 0;
      const score = Math.round(100 - (i * (100/8)) - pctInBand * (100/8));
      return { cls:CLASS_LABELS[i], idx:i, score:Math.max(1,Math.min(100,score)), color:CLASS_COLORS[i] };
    }
  }
  return { cls:"G", idx:7, score:1, color:CLASS_COLORS[7] };
}

export function getCO2Class(co2KgM2, category) {
  const grid = CO2_CLASSES_DB[category] || CO2_CLASSES_DB.AL;
  // CO₂ ≤ 0 = clădire cu emisii nete zero/negative → clasa A+. Doar null/NaN → "—".
  if (co2KgM2 == null || isNaN(co2KgM2)) {
    return { cls:"—", idx:-1, score:0, color:"#666666" };
  }
  const t = grid.thresholds;
  for (let i = 0; i < t.length; i++) {
    if (co2KgM2 <= t[i]) {
      const low = i === 0 ? 0 : t[i-1];
      const high = t[i];
      const pctInBand = high > low ? (co2KgM2 - low) / (high - low) : 0;
      const score = Math.round(100 - (i * (100/8)) - pctInBand * (100/8));
      return { cls:CLASS_LABELS[i], idx:i, score:Math.max(1,Math.min(100,score)), color:CLASS_COLORS[i] };
    }
  }
  return { cls:"G", idx:7, score:1, color:CLASS_COLORS[7] };
}
