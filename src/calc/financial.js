// ═══════════════════════════════════════════════════════════════
// ANALIZĂ FINANCIARĂ REABILITARE — EN 15459-1 / Reg. Delegat UE 244/2012 (republicat 2025/2273)
// Referință cost-optimă: 50 kWh/m²·an (Reg. 2025/2273), perioadă 30 ani, rată actualizare 5%
// ═══════════════════════════════════════════════════════════════

// ─── Parametri impliciti per perspectivă (Reg. 2025/2273 + Ord. MDLPA 16/2023) ─────────────
// Sprint 26 P1.2: macroeconomic discountRate 4 → 3 (Reg. UE 244/2012 republicat
// 2025/2273 Anexa I — perspectiva macro folosește rată identică cu socială pentru
// că ambele exclud distorsionări fiscale). Financial private rămâne 4%.
export const DEFAULT_RATES_BY_PERSPECTIVE = {
  financial:     { discountRate: 4, escalation: 3, includeVAT: true,  label: "Financiară (privat)" },
  social:        { discountRate: 3, escalation: 3, includeVAT: true,  label: "Socială" },
  macroeconomic: { discountRate: 3, escalation: 3, includeVAT: false, label: "Macroeconomică (fără TVA)" },
};

const VAT_RATE = 0.21;

// ─── Valoare reziduală liniară pentru componente cu durate diferite ──────────────────────────
// Folosit de EN 15459-1 Anexa B pentru calcul cost global complet.
function calcResidualValue(components, period, discountRate) {
  let totalResidual = 0;
  components.forEach(c => {
    const lifespan = c.lifespan || 1;
    const timeSinceStart = period - (c.startYear || 0);
    // ageAtEnd: câți ani are componenta la sfârșitul perioadei (modulo lifespan)
    const ageAtEnd = timeSinceStart % lifespan;
    // Dacă ageAtEnd=0, tocmai a terminat ciclul → valoare reziduală 0
    const remainingLifespan = ageAtEnd === 0 ? 0 : lifespan - ageAtEnd;
    const residualLinear = (c.invest || 0) * (remainingLifespan / lifespan);
    totalResidual += residualLinear / Math.pow(1 + discountRate, period);
  });
  return totalResidual;
}

// ═══════════════════════════════════════════════════════════════
// calcFinancialAnalysis — motor principal EN 15459-1
// Parametri noi (opționali, backward-compat):
//   perspective: 'financial' | 'social' | 'macroeconomic' (default: niciuna = comportament vechi)
//   replacementCosts: [{ year, cost, component }] — înlocuiri intermediare
//   componentsForResidual: [{ name, invest, lifespan, startYear }] — calcul valoare reziduală auto
// ═══════════════════════════════════════════════════════════════
export function calcFinancialAnalysis(params) {
  const perspective = params.perspective || null;
  const perspDefaults = perspective ? DEFAULT_RATES_BY_PERSPECTIVE[perspective] : null;

  // Investiție și mentenanță — ajustate pentru perspectivă macroeconomică (excludere TVA 21% RO 2026)
  var rawInvest = params.investCost || 0;
  var rawMaint  = params.annualMaint || 0;
  var adjustedInvest = rawInvest;
  var adjustedMaint  = rawMaint;
  var vatExcluded = false;
  if (perspective === 'macroeconomic') {
    adjustedInvest = rawInvest / (1 + VAT_RATE);
    adjustedMaint  = rawMaint  / (1 + VAT_RATE);
    vatExcluded = true;
  }

  var investCost = adjustedInvest;
  var annualSaving = params.annualSaving || 0;
  var annualMaint  = adjustedMaint;

  // Rată actualizare: perspectivă default > explicit params > fallback vechi (5%)
  var discountRate;
  if (perspective && perspDefaults) {
    discountRate = (params.discountRate ?? perspDefaults.discountRate) / 100;
  } else {
    discountRate = (params.discountRate || 5) / 100;
  }

  var escalation      = (params.escalation      || (perspDefaults?.escalation ?? 3))  / 100;
  var maintEscalation = (params.maintEscalation  || 2) / 100;
  var period          = params.period || 30;
  var residualValue   = params.residualValue || 0;
  var annualEnergyKwh = params.annualEnergyKwh || 0;

  // Parametri noi EN 15459-1 Anexa B
  var replacementCosts      = params.replacementCosts      || [];
  var componentsForResidual = params.componentsForResidual || null;

  // S30A·A10 — guard explicit: investCost ≤ 0 sau annualSaving ≤ 0 produce IRR/VAN absurd.
  // Bug pre-S30A: IRR=1430%, VAN=24.663 lei când utilizatorul lăsa câmpuri goale.
  // Returnăm structură null explicit (consumatori UI pot face `result?.npv ?? "—"`).
  if (!Number.isFinite(investCost) || investCost <= 0 ||
      !Number.isFinite(annualSaving) || annualSaving <= 0) {
    return null;
  }

  // ─── Cash flows + NPV / IRR / Payback ────────────────────────────────────────────────────
  var cashFlows       = [-investCost];
  var cumulativeCF    = [-investCost];
  var cumulativeDiscCF = [-investCost];
  var npv             = -investCost;
  var paybackSimple   = null;
  var paybackDisc     = null;

  for (var y = 1; y <= period; y++) {
    var saving = annualSaving * Math.pow(1 + escalation, y - 1);
    var maint  = annualMaint  * Math.pow(1 + maintEscalation, y - 1);
    var cf = saving - maint;
    if (y === period) cf += residualValue;
    cashFlows.push(cf);
    var cumCF = cumulativeCF[y - 1] + cf;
    cumulativeCF.push(cumCF);
    var discCF = cf / Math.pow(1 + discountRate, y);
    npv += discCF;
    cumulativeDiscCF.push(cumulativeDiscCF[y - 1] + discCF);

    if (paybackSimple === null && cumCF >= 0) {
      paybackSimple = cf > 0 ? (y - 1 + (-cumulativeCF[y - 1]) / cf) : y;
    }
    if (paybackDisc === null && cumulativeDiscCF[y] >= 0) {
      // Sprint 26 P1.5 — interpolare liniară (consistent cu paybackSimple)
      paybackDisc = discCF > 0 ? (y - 1 + (-cumulativeDiscCF[y - 1]) / discCF) : y;
    }
  }

  // ─── IRR (Newton-Raphson) ────────────────────────────────────────────────────────────────
  var irr = 0.10;
  for (var iter = 0; iter < 100; iter++) {
    var fVal = 0, fDeriv = 0;
    for (var t = 0; t < cashFlows.length; t++) {
      fVal   += cashFlows[t] / Math.pow(1 + irr, t);
      if (t > 0) fDeriv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(fDeriv) < 1e-10) break;
    var newIrr = irr - fVal / fDeriv;
    if (Math.abs(newIrr - irr) < 1e-6) { irr = newIrr; break; }
    irr = newIrr;
  }
  if (irr < -0.5 || irr > 2.0 || isNaN(irr)) irr = null;

  // ─── B/C Ratio — EN 15459-1 B.1.3: Σ Benefits_disc / (I + Σ Maint_disc + Σ Replace_disc) ───
  var totalBenefits = 0;
  for (var b = 1; b <= period; b++) {
    totalBenefits += (annualSaving * Math.pow(1 + escalation, b - 1)) / Math.pow(1 + discountRate, b);
  }
  // Numărătorul: suma beneficiilor actualizate
  // Numitorul (EN 15459-1 B.1.3): investiție + mentenanță actualizată + înlocuiri actualizate
  var totalDiscountedCosts = investCost;
  for (var b2 = 1; b2 <= period; b2++) {
    totalDiscountedCosts += (annualMaint * Math.pow(1 + maintEscalation, b2 - 1)) / Math.pow(1 + discountRate, b2);
  }
  replacementCosts.forEach(function(rc) {
    if (rc.year <= period) {
      totalDiscountedCosts += rc.cost / Math.pow(1 + discountRate, rc.year);
    }
  });
  var bcRatio = totalDiscountedCosts > 0 ? totalBenefits / totalDiscountedCosts : 0;

  // ─── Cost global EN 15459-1 Anexa B — cu înlocuiri + valoare reziduală ──────────────────
  var globalCost = investCost;
  for (var gc = 1; gc <= period; gc++) {
    globalCost += (annualSaving * Math.pow(1 + escalation, gc - 1) * -1 +
                   annualMaint  * Math.pow(1 + maintEscalation, gc - 1)) / Math.pow(1 + discountRate, gc);
  }
  // Înlocuiri intermediare actualizate
  replacementCosts.forEach(function(rc) {
    if (rc.year <= period) {
      globalCost += rc.cost / Math.pow(1 + discountRate, rc.year);
    }
  });
  // Valoare reziduală: automată via componentsForResidual sau clasică (residualValue)
  var residualTotal;
  if (componentsForResidual && componentsForResidual.length > 0) {
    residualTotal = calcResidualValue(componentsForResidual, period, discountRate);
  } else {
    residualTotal = residualValue / Math.pow(1 + discountRate, period);
  }
  globalCost -= residualTotal;

  // ─── LCOE (EUR/kWh) — EN 15459-1 Anexa B ────────────────────────────────────────────────
  // Sprint 26 P1.4 — include replacements actualizate (anterior lipseau din numărător)
  var lcoe = null;
  if (annualEnergyKwh > 0) {
    var totalDiscountedCostLCOE = investCost;
    var totalDiscountedEnergy   = 0;
    for (var le = 1; le <= period; le++) {
      totalDiscountedCostLCOE += (annualMaint * Math.pow(1 + maintEscalation, le - 1)) / Math.pow(1 + discountRate, le);
      totalDiscountedEnergy   += annualEnergyKwh / Math.pow(1 + discountRate, le);
    }
    // Adaugă înlocuirile actualizate la numărător (consistență cu B/C ratio + globalCost)
    replacementCosts.forEach(function(rc) {
      if (rc.year <= period) {
        totalDiscountedCostLCOE += rc.cost / Math.pow(1 + discountRate, rc.year);
      }
    });
    lcoe = totalDiscountedEnergy > 0 ? totalDiscountedCostLCOE / totalDiscountedEnergy : null;
  }

  // ─── Analiză sensitivitate NPV (±10%, ±20%) — EN 15459-1 §8 ────────────────────────────
  function calcNPVForSaving(savingAdj) {
    var n = -investCost;
    for (var y2 = 1; y2 <= period; y2++) {
      var cf2 = savingAdj * Math.pow(1 + escalation, y2 - 1) - annualMaint * Math.pow(1 + maintEscalation, y2 - 1);
      if (y2 === period) cf2 += residualValue;
      n += cf2 / Math.pow(1 + discountRate, y2);
    }
    return Math.round(n);
  }
  // Sprint 26 P1.3 — sensitivity NPV pe rate (discount/escalation) ±200 bp
  function calcNPVForRates(savingBase, dRate, esc) {
    var n = -investCost;
    for (var y3 = 1; y3 <= period; y3++) {
      var cf3 = savingBase * Math.pow(1 + esc, y3 - 1) - annualMaint * Math.pow(1 + maintEscalation, y3 - 1);
      if (y3 === period) cf3 += residualValue;
      n += cf3 / Math.pow(1 + dRate, y3);
    }
    return Math.round(n);
  }
  var sensitivity = {
    saving_m20:  calcNPVForSaving(annualSaving * 0.80),
    saving_m10:  calcNPVForSaving(annualSaving * 0.90),
    saving_base: Math.round(npv),
    saving_p10:  calcNPVForSaving(annualSaving * 1.10),
    saving_p20:  calcNPVForSaving(annualSaving * 1.20),
    // Sprint 26 P1.3 — variație rată actualizare ±200 bp
    rate_m200bp: calcNPVForRates(annualSaving, Math.max(0, discountRate - 0.02), escalation),
    rate_p200bp: calcNPVForRates(annualSaving, discountRate + 0.02,                escalation),
    // Sprint 26 P1.3 — variație rată escalare ±200 bp
    esc_m200bp:  calcNPVForRates(annualSaving, discountRate, Math.max(0, escalation - 0.02)),
    esc_p200bp:  calcNPVForRates(annualSaving, discountRate, escalation + 0.02),
  };

  return {
    // Indicatori principali
    npv:                Math.round(npv),
    irr:                irr !== null ? Math.round(irr * 10000) / 100 : null,
    paybackSimple:      paybackSimple !== null ? Math.round(paybackSimple * 10) / 10 : null,
    paybackDiscounted:  paybackDisc,
    bcRatio:            Math.round(bcRatio * 100) / 100,
    globalCost:         Math.round(globalCost),
    lcoe:               lcoe !== null ? Math.round(lcoe * 1000) / 1000 : null,
    // Cashflows
    cashFlows,
    cumulativeCF,
    // Input-uri reflectate
    investCost,
    annualSaving,
    // Câmpuri noi perspectivă
    perspective:        perspective || 'default',
    perspectiveLabel:   perspDefaults?.label || 'Implicită',
    adjustedInvest:     Math.round(adjustedInvest * 100) / 100,
    vatExcluded,
    residualTotal:      Math.round(residualTotal * 100) / 100,
    // Sensitivitate
    sensitivity,
    // Verdict
    verdict:      npv > 0 ? "PROFITABIL" : "NEPROFITABIL",
    verdictColor: npv > 0 ? "#22c55e" : "#ef4444",
  };
}

// ═══════════════════════════════════════════════════════════════
// calcAllPerspectives — Rulează simultan pentru cele 3 perspective Reg. 2025/2273
// Folosit de CostOptimalCurve.jsx pentru toggle instantaneu fără re-calcul.
// ═══════════════════════════════════════════════════════════════
export function calcAllPerspectives(params) {
  return {
    financial:     calcFinancialAnalysis({ ...params, perspective: 'financial' }),
    social:        calcFinancialAnalysis({ ...params, perspective: 'social' }),
    macroeconomic: calcFinancialAnalysis({ ...params, perspective: 'macroeconomic' }),
  };
}

// ═══════════════════════════════════════════════════════════════
// calcFinancialScenarios — Comparator scenarii financiare (2-4 pachete)
// ═══════════════════════════════════════════════════════════════
export function calcFinancialScenarios(scenarios, commonParams) {
  if (!scenarios || scenarios.length < 2) return null;
  var cp = commonParams || {};
  var results = scenarios.map(function(sc) {
    var res = calcFinancialAnalysis({
      investCost:    sc.investCost,
      annualSaving:  sc.annualSaving,
      annualMaint:   sc.annualMaint   || 0,
      annualEnergyKwh: sc.annualEnergyKwh || 0,
      discountRate:  cp.discountRate  || 5,
      escalation:    cp.escalation    || 3,
      maintEscalation: cp.maintEscalation || 2,
      period:        cp.period        || 30,
      residualValue: sc.residualValue || 0,
    });
    return { label: sc.label, epReduction: sc.epReduction || 0, rerGain: sc.rerGain || 0, result: res };
  });
  var bestIdx = 0;
  results.forEach(function(r, i) {
    if (r.result && results[bestIdx].result && r.result.npv > results[bestIdx].result.npv) bestIdx = i;
  });
  results[bestIdx].isBest = true;
  return results;
}
