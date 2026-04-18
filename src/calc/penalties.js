/**
 * Penalizări p0–p11 — Mc 001-2022 Partea III §8.10
 * „Utilizare irațională a energiei în clădire"
 *
 * Fiecare penalizare reprezintă o deviație documentată de la cerințele
 * minimale nZEB / Mc 001-2022. Când penalizarea se aplică, EP-ul se
 * majorează cu un procent (`delta_EP_pct`) pentru a reflecta consumul
 * real crescut față de un caz de referință optim.
 *
 * Formula de aplicare globală:
 *   EP_total = EP_base × (1 + Σ delta_EP_pct / 100)
 *
 * Contract returnat de fiecare funcție calcPi:
 *   {
 *     value: number,        // valoarea indicatorului evaluat (ex: U mediu)
 *     applied: boolean,     // true dacă penalizarea se aplică
 *     reason: string,       // descriere umană (română, diacritice)
 *     delta_EP_pct: number, // % adaos EP (0 dacă applied=false)
 *   }
 *
 * Thresholds (pragurile) sunt calibrate pe:
 *   - C 107-2005 (U_ref) + U_REF_NZEB pentru anvelopă
 *   - NZEB_THRESHOLDS pentru RER
 *   - BACS EN 15232 / ISO 52120 pentru automatizare
 *   - EN 15316 pentru randamente generare/distribuție/emisie
 */

import { U_REF_NZEB_RES, U_REF_NZEB_NRES, U_REF_GLAZING } from "../data/u-reference.js";
import { NZEB_THRESHOLDS } from "../data/energy-classes.js";

// ═══════════════════════════════════════════════════════
// PRAGURI DE REFERINȚĂ — Mc 001-2022 Partea III §8.10
// ═══════════════════════════════════════════════════════
export const PENALTY_THRESHOLDS = Object.freeze({
  // p0 — anvelopa subizolată (U mediu vs. U referință)
  U_MEDIU_RATIO_LIMIT: 1.20,      // peste 120% din U_ref → penalizare
  // p1 — ferestre slabe (U_w > prag)
  U_WINDOW_LIMIT: 1.80,           // W/(m²·K) — Ord. MDLPA 16/2023
  // p2 — punți termice neacordate (ψ > ψ_ref)
  PSI_REF: 0.10,                  // W/(m·K) pentru punte nZEB
  PSI_RATIO_LIMIT: 1.50,          // ψ > 1.5 × ψ_ref → penalizare
  // p3 — cazan ineficient (η_gen < prag)
  ETA_GEN_LIMIT: 0.85,            // η generare mai mic de 85% → penalizare
  // p4 — distribuție neoptimă (η_dist < prag)
  ETA_DIST_LIMIT: 0.85,
  // p5 — lipsă reglare (no BACS / control manual)
  CONTROL_MIN: "termostat",       // dacă mai slab → penalizare
  // p6 — ACM ineficient (fără recirculare sau η_dhw slab)
  ETA_DHW_LIMIT: 0.70,
  // p7 — stocare fără izolație
  STORAGE_LOSS_MAX_WK: 0.50,      // W/K per litru stocaj — peste = slab
  // p8 — ventilație fără recuperare (când ar fi obligatorie)
  HR_EFFICIENCY_MIN: 0.70,        // 70% recuperare minim pentru nZEB
  // p9 — iluminat cu LENI ridicat
  LENI_LIMIT: 15,                 // kWh/(m²·an) — peste → penalizare
  // p10 — fără BACS (clasă D sau absent)
  BACS_MIN_CLASS: "C",            // sub C = penalizare
  // p11 — fără surse regenerabile (RER < 30%)
  RER_MIN: 30,                    // %
});

// ═══════════════════════════════════════════════════════
// PROCENTE DE PENALIZARE — delta_EP_pct per penalizare
// ═══════════════════════════════════════════════════════
export const PENALTY_DELTAS = Object.freeze({
  p0: 15,  // anvelopa subizolată — impact major
  p1: 8,   // ferestre slabe
  p2: 5,   // punți termice
  p3: 12,  // cazan ineficient
  p4: 6,   // distribuție slabă
  p5: 4,   // reglare inadecvată
  p6: 7,   // ACM ineficient
  p7: 3,   // stocare neizolată
  p8: 8,   // ventilație fără HR
  p9: 5,   // iluminat ineficient
  p10: 6,  // fără BACS
  p11: 10, // fără regenerabile
});

// ═══════════════════════════════════════════════════════
// UTILITARE INTERNE
// ═══════════════════════════════════════════════════════
function _num(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function _isResidential(category) {
  return ["RI", "RC", "RA"].includes(category);
}

function _uRefTable(category) {
  return _isResidential(category) ? U_REF_NZEB_RES : U_REF_NZEB_NRES;
}

function _uRefGlazing(category) {
  const glaz = _isResidential(category)
    ? U_REF_GLAZING?.nzeb_res
    : U_REF_GLAZING?.nzeb_nres;
  return _num(glaz, PENALTY_THRESHOLDS.U_WINDOW_LIMIT);
}

// ═══════════════════════════════════════════════════════
// p0 — ANVELOPA SUBIZOLATĂ
// ═══════════════════════════════════════════════════════
export function calcP0_AnvelopaSubizolata(envelope, category = "RC") {
  const opaque = envelope?.opaque || [];
  if (!opaque.length) {
    return { value: 0, applied: false, reason: "Fără elemente opace evaluate", delta_EP_pct: 0 };
  }
  const uRef = _uRefTable(category);
  let totalArea = 0;
  let weightedU = 0;
  let weightedURef = 0;
  for (const el of opaque) {
    const area = _num(el.area);
    const u = _num(el.u);
    const uR = _num(uRef?.[el.type], 0.30);
    if (area > 0 && u > 0) {
      totalArea += area;
      weightedU += u * area;
      weightedURef += uR * area;
    }
  }
  if (totalArea === 0) {
    return { value: 0, applied: false, reason: "Arii 0", delta_EP_pct: 0 };
  }
  const uMediu = weightedU / totalArea;
  const uRefMediu = weightedURef / totalArea;
  const ratio = uRefMediu > 0 ? uMediu / uRefMediu : 0;
  const applied = ratio > PENALTY_THRESHOLDS.U_MEDIU_RATIO_LIMIT;
  return {
    value: parseFloat(uMediu.toFixed(3)),
    applied,
    reason: applied
      ? `U mediu ${uMediu.toFixed(3)} W/(m²·K) depășește ${(PENALTY_THRESHOLDS.U_MEDIU_RATIO_LIMIT * 100).toFixed(0)}% din U_ref ${uRefMediu.toFixed(3)}`
      : `U mediu ${uMediu.toFixed(3)} respectă U_ref ${uRefMediu.toFixed(3)}`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p0 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p1 — FERESTRE SLABE (U_w > 1.80, Ord. MDLPA 16/2023)
// Pragul U_WINDOW_LIMIT=1.80 este prag de penalizare (Mc 001 §8.10),
// distinct de U_REF_GLAZING care e target nZEB (mai strict, ~1.11).
// ═══════════════════════════════════════════════════════
export function calcP1_FerestreSlab(glazing = [], category = "RC") {
  if (!glazing?.length) {
    return { value: 0, applied: false, reason: "Fără tâmplărie evaluată", delta_EP_pct: 0 };
  }
  // `category` rezervat pentru diferențiere viitoare res/nres (L.238/2024 Art.6)
  void category;
  const limit = PENALTY_THRESHOLDS.U_WINDOW_LIMIT;
  const maxU = Math.max(...glazing.map((g) => _num(g.u)));
  const applied = maxU > limit;
  return {
    value: parseFloat(maxU.toFixed(2)),
    applied,
    reason: applied
      ? `U_w maxim ${maxU.toFixed(2)} W/(m²·K) depășește pragul ${limit.toFixed(2)}`
      : `U_w maxim ${maxU.toFixed(2)} ≤ ${limit.toFixed(2)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p1 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p2 — PUNȚI TERMICE NEACORDATE
// ═══════════════════════════════════════════════════════
export function calcP2_PuntiNecorectate(bridges = []) {
  if (!bridges?.length) {
    return { value: 0, applied: false, reason: "Fără punți termice evaluate", delta_EP_pct: 0 };
  }
  const psiRef = PENALTY_THRESHOLDS.PSI_REF;
  const limit = psiRef * PENALTY_THRESHOLDS.PSI_RATIO_LIMIT;
  const worst = Math.max(...bridges.map((b) => _num(b.psi)));
  const applied = worst > limit;
  return {
    value: parseFloat(worst.toFixed(3)),
    applied,
    reason: applied
      ? `ψ maxim ${worst.toFixed(3)} W/(m·K) depășește ${limit.toFixed(3)} (1.5 × ψ_ref)`
      : `ψ maxim ${worst.toFixed(3)} ≤ ${limit.toFixed(3)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p2 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p3 — CAZAN INEFICIENT (η_gen < 0.85)
// ═══════════════════════════════════════════════════════
export function calcP3_CazanIneficient(heating = {}) {
  const eta = _num(heating.eta_gen);
  if (eta <= 0) {
    return { value: 0, applied: false, reason: "η_gen nedefinit", delta_EP_pct: 0 };
  }
  const limit = PENALTY_THRESHOLDS.ETA_GEN_LIMIT;
  // COP > 1 (pompă de căldură) nu e penalizat
  const isCOP = eta > 1;
  const applied = !isCOP && eta < limit;
  return {
    value: parseFloat(eta.toFixed(3)),
    applied,
    reason: applied
      ? `η_gen ${eta.toFixed(2)} sub pragul ${limit.toFixed(2)} — cazan uzat/vechi`
      : isCOP
      ? `Sistem cu COP=${eta.toFixed(2)} (pompă căldură) — nu se aplică pragul cazan`
      : `η_gen ${eta.toFixed(2)} ≥ ${limit.toFixed(2)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p3 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p4 — DISTRIBUȚIE NEOPTIMĂ (η_dist < 0.85)
// ═══════════════════════════════════════════════════════
export function calcP4_DistributieNeoptima(heating = {}) {
  const eta = _num(heating.eta_dist);
  if (eta <= 0) {
    return { value: 0, applied: false, reason: "η_dist nedefinit", delta_EP_pct: 0 };
  }
  const limit = PENALTY_THRESHOLDS.ETA_DIST_LIMIT;
  const applied = eta < limit;
  return {
    value: parseFloat(eta.toFixed(3)),
    applied,
    reason: applied
      ? `η_dist ${eta.toFixed(2)} sub pragul ${limit.toFixed(2)} — conducte neizolate`
      : `η_dist ${eta.toFixed(2)} ≥ ${limit.toFixed(2)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p4 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p5 — REGLARE INADECVATĂ (fără termostat / control manual)
// ═══════════════════════════════════════════════════════
export function calcP5_Reglare(controls = {}) {
  const type = typeof controls === "string" ? controls : String(controls?.type || controls?.control || "");
  const hasAdequate = ["termostat", "pid", "bacs_a", "bacs_b", "bacs"].some((t) =>
    type.toLowerCase().includes(t)
  );
  const applied = !hasAdequate;
  return {
    value: hasAdequate ? 1 : 0,
    applied,
    reason: applied
      ? "Lipsă sistem de reglare automat (termostat/PID/BACS)"
      : `Reglare: ${type} — adecvată`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p5 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p6 — ACM INEFICIENT (η_dhw < 0.70 sau fără recirculare)
// ═══════════════════════════════════════════════════════
export function calcP6_ACMIneficient(dhw = {}) {
  const eta = _num(dhw.eta_dhw ?? dhw.eta_gen);
  if (eta <= 0) {
    return { value: 0, applied: false, reason: "η ACM nedefinit", delta_EP_pct: 0 };
  }
  const limit = PENALTY_THRESHOLDS.ETA_DHW_LIMIT;
  const applied = eta < limit;
  return {
    value: parseFloat(eta.toFixed(3)),
    applied,
    reason: applied
      ? `η_ACM ${eta.toFixed(2)} sub pragul ${limit.toFixed(2)}`
      : `η_ACM ${eta.toFixed(2)} ≥ ${limit.toFixed(2)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p6 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p7 — STOCARE FĂRĂ IZOLAȚIE (W/K/L peste prag)
// ═══════════════════════════════════════════════════════
export function calcP7_Stocare(storage = {}) {
  const volume = _num(storage.volume);
  const lossWK = _num(storage.standing_loss ?? storage.lossWK);
  if (volume === 0 || lossWK === 0) {
    return { value: 0, applied: false, reason: "Stocaj nedefinit", delta_EP_pct: 0 };
  }
  const lossPerLiter = lossWK / volume;
  const limit = PENALTY_THRESHOLDS.STORAGE_LOSS_MAX_WK;
  const applied = lossPerLiter > limit;
  return {
    value: parseFloat(lossPerLiter.toFixed(3)),
    applied,
    reason: applied
      ? `Pierderi stocaj ${lossPerLiter.toFixed(3)} W/(K·L) peste ${limit.toFixed(2)}`
      : `Pierderi ${lossPerLiter.toFixed(3)} W/(K·L) ≤ ${limit.toFixed(2)} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p7 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p8 — VENTILAȚIE FĂRĂ RECUPERARE (HR < 70% în clădiri obligate)
// ═══════════════════════════════════════════════════════
export function calcP8_Ventilatie(ventilation = {}) {
  const type = String(ventilation?.type || "").toLowerCase();
  const hrEff = _num(ventilation.hrEfficiency) / 100; // % → fracțiune
  const needsHR = type.includes("mecanic") || type.includes("mvhr") || type.includes("vmc");
  if (!needsHR) {
    return { value: 0, applied: false, reason: `Ventilație tip ${type || "nedefinit"} — HR nu e obligatoriu`, delta_EP_pct: 0 };
  }
  const limit = PENALTY_THRESHOLDS.HR_EFFICIENCY_MIN;
  const applied = hrEff < limit;
  return {
    value: parseFloat((hrEff * 100).toFixed(1)),
    applied,
    reason: applied
      ? `Recuperare căldură ${(hrEff * 100).toFixed(0)}% sub ${(limit * 100).toFixed(0)}%`
      : `Recuperare ${(hrEff * 100).toFixed(0)}% ≥ ${(limit * 100).toFixed(0)}% — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p8 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p9 — ILUMINAT (LENI > 15)
// ═══════════════════════════════════════════════════════
export function calcP9_Iluminat(lighting = {}) {
  const leni = _num(lighting.leni);
  if (leni <= 0) {
    return { value: 0, applied: false, reason: "LENI nedefinit", delta_EP_pct: 0 };
  }
  const limit = PENALTY_THRESHOLDS.LENI_LIMIT;
  const applied = leni > limit;
  return {
    value: parseFloat(leni.toFixed(1)),
    applied,
    reason: applied
      ? `LENI ${leni.toFixed(1)} kWh/(m²·an) peste ${limit} — iluminat ineficient`
      : `LENI ${leni.toFixed(1)} ≤ ${limit} — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p9 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p10 — FĂRĂ BACS (sub clasa C sau absent)
// ═══════════════════════════════════════════════════════
export function calcP10_FaraBACS(bacs = {}) {
  const cls = typeof bacs === "string" ? bacs : String(bacs?.class || bacs?.bacsClass || "");
  if (!cls) {
    return { value: "D", applied: true, reason: "BACS absent — echivalent clasă D", delta_EP_pct: PENALTY_DELTAS.p10 };
  }
  const applied = cls === "D";
  return {
    value: cls,
    applied,
    reason: applied
      ? `Clasa BACS ${cls} (fără automatizare) — penalizare`
      : `Clasa BACS ${cls} — acceptabilă`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p10 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// p11 — FĂRĂ REGENERABILE (RER < 30%)
// ═══════════════════════════════════════════════════════
export function calcP11_FaraRegenerabile(renewables = {}, category = "RC") {
  const rer = _num(renewables.rer);
  const limit = NZEB_THRESHOLDS?.[category]?.rer_min ?? PENALTY_THRESHOLDS.RER_MIN;
  const applied = rer < limit;
  return {
    value: parseFloat(rer.toFixed(1)),
    applied,
    reason: applied
      ? `RER ${rer.toFixed(1)}% sub pragul nZEB ${limit}%`
      : `RER ${rer.toFixed(1)}% ≥ ${limit}% — OK`,
    delta_EP_pct: applied ? PENALTY_DELTAS.p11 : 0,
  };
}

// ═══════════════════════════════════════════════════════
// AGREGATOR — Mc 001-2022 Partea III §8.10
// ═══════════════════════════════════════════════════════
/**
 * Calculează toate penalizările p0-p11 pentru o clădire.
 *
 * @param {Object} input
 * @param {Object} input.envelope     { opaque: [{type, area, u}], glazing: [{u}], bridges: [{psi}] }
 * @param {Object} input.instSummary  { heating: {eta_gen, eta_dist, control}, dhw: {eta_dhw, storage:{volume, standing_loss}}, lighting: {leni}, bacs: "A|B|C|D" }
 * @param {Object} input.ventilation  { type, hrEfficiency }
 * @param {Object} input.building     { category: "RC|BI|..." }
 * @param {Object} input.renewables   { rer }
 * @returns {Object} { p0..p11, summary: { total_delta_pct, count_applied, ep_multiplier } }
 */
export function calcPenalties({
  envelope = {},
  instSummary = {},
  ventilation = {},
  building = {},
  renewables = {},
} = {}) {
  const category = building.category || "RC";
  const results = {
    p0: calcP0_AnvelopaSubizolata(envelope, category),
    p1: calcP1_FerestreSlab(envelope.glazing, category),
    p2: calcP2_PuntiNecorectate(envelope.bridges),
    p3: calcP3_CazanIneficient(instSummary.heating),
    p4: calcP4_DistributieNeoptima(instSummary.heating),
    p5: calcP5_Reglare(instSummary.heating?.controls || instSummary.heating?.control),
    p6: calcP6_ACMIneficient(instSummary.dhw),
    p7: calcP7_Stocare(instSummary.dhw?.storage),
    p8: calcP8_Ventilatie(ventilation),
    p9: calcP9_Iluminat(instSummary.lighting),
    p10: calcP10_FaraBACS(instSummary.bacs),
    p11: calcP11_FaraRegenerabile(renewables, category),
  };
  const applied = Object.values(results).filter((r) => r.applied);
  const totalDeltaPct = applied.reduce((sum, r) => sum + r.delta_EP_pct, 0);
  results.summary = {
    total_delta_pct: totalDeltaPct,
    count_applied: applied.length,
    ep_multiplier: 1 + totalDeltaPct / 100,
  };
  return results;
}

/**
 * Aplică multiplicatorul de penalizări pe EP de bază.
 * EP_total = EP_base × (1 + Σ delta_EP_pct / 100)
 */
export function applyPenaltiesToEP(epBase, penalties) {
  const mult = penalties?.summary?.ep_multiplier ?? 1;
  return _num(epBase) * mult;
}
