import { ENERGY_CLASSES_DB, CO2_CLASSES_DB, CLASS_LABELS, CLASS_COLORS } from '../data/energy-classes.js';

export function getEnergyClass(epKwhM2, categoryKey) {
  const grid = ENERGY_CLASSES_DB[categoryKey];
  if (!grid) return { cls:"—", idx:-1, score:0, color:"#666666" };
  // Audit 2 mai 2026 — Fix bug clasă A+ pentru sistem absent: dacă EP=0 sau invalid,
  // sistemul nu există în clădire (ex. răcire/ventilare absente). Returnez "—" în loc
  // de A+ care ar implica eronat „eficiență maximă".
  if (epKwhM2 == null || isNaN(epKwhM2) || epKwhM2 <= 0) {
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
  // Audit 2 mai 2026 — Fix bug clasă A+ pentru sistem absent (consistent cu getEnergyClass)
  if (co2KgM2 == null || isNaN(co2KgM2) || co2KgM2 <= 0) {
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
