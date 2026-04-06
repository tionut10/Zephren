// ═══════════════════════════════════════════════════════════════
// ANALIZĂ FINANCIARĂ REABILITARE — EN 15459-1 / Reg. Delegat UE 244/2012 (republicat 2025/2273)
// Referință cost-optimă: 50 kWh/m²·an (Reg. 2025/2273), perioadă 30 ani, rată actualizare 5%
// ═══════════════════════════════════════════════════════════════

export function calcFinancialAnalysis(params) {
  var investCost = params.investCost || 0;         // EUR total
  var annualSaving = params.annualSaving || 0;     // EUR/an economie energie
  var annualMaint = params.annualMaint || 0;       // EUR/an mentenanță suplimentară
  var discountRate = (params.discountRate || 5) / 100;  // rată actualizare
  var escalation = (params.escalation || 3) / 100;      // escaladare preț energie/an
  var period = params.period || 30;                // ani
  var residualValue = params.residualValue || 0;   // valoare reziduală la final

  if (investCost <= 0 || annualSaving <= 0) return null;

  // Cash flows
  var cashFlows = [-investCost];
  var cumulativeCF = [-investCost];
  var cumulativeDiscCF = [-investCost];
  var npv = -investCost;
  var paybackSimple = null;
  var paybackDisc = null;

  for (var y = 1; y <= period; y++) {
    var saving = annualSaving * Math.pow(1 + escalation, y - 1);
    var maint = annualMaint * Math.pow(1.02, y - 1); // mentenanță crește 2%/an
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
      paybackDisc = y;
    }
  }

  // IRR calculation (Newton-Raphson)
  var irr = 0.10;
  for (var iter = 0; iter < 100; iter++) {
    var fVal = 0, fDeriv = 0;
    for (var t = 0; t < cashFlows.length; t++) {
      fVal += cashFlows[t] / Math.pow(1 + irr, t);
      if (t > 0) fDeriv -= t * cashFlows[t] / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(fDeriv) < 1e-10) break;
    var newIrr = irr - fVal / fDeriv;
    if (Math.abs(newIrr - irr) < 1e-6) { irr = newIrr; break; }
    irr = newIrr;
  }
  if (irr < -0.5 || irr > 2.0 || isNaN(irr)) irr = null;

  // Benefit/Cost ratio
  var totalBenefits = 0;
  for (var b = 1; b <= period; b++) {
    totalBenefits += (annualSaving * Math.pow(1 + escalation, b - 1)) / Math.pow(1 + discountRate, b);
  }
  var bcRatio = investCost > 0 ? totalBenefits / investCost : 0;

  // Cost global per EN 15459 (simplificat)
  var globalCost = investCost;
  for (var gc = 1; gc <= period; gc++) {
    globalCost += (annualSaving * Math.pow(1 + escalation, gc - 1) * -1 + annualMaint * Math.pow(1.02, gc - 1)) / Math.pow(1 + discountRate, gc);
  }
  globalCost -= residualValue / Math.pow(1 + discountRate, period);

  // Analiză sensitivitate NPV (±10%, ±20% față de economie anuală) — EN 15459-1 §8
  function calcNPVForSaving(savingAdj) {
    var n = -investCost;
    for (var y2 = 1; y2 <= period; y2++) {
      var cf2 = savingAdj * Math.pow(1 + escalation, y2 - 1) - annualMaint * Math.pow(1.02, y2 - 1);
      if (y2 === period) cf2 += residualValue;
      n += cf2 / Math.pow(1 + discountRate, y2);
    }
    return Math.round(n);
  }
  var sensitivity = {
    saving_m20: calcNPVForSaving(annualSaving * 0.80),
    saving_m10: calcNPVForSaving(annualSaving * 0.90),
    saving_base: Math.round(npv),
    saving_p10: calcNPVForSaving(annualSaving * 1.10),
    saving_p20: calcNPVForSaving(annualSaving * 1.20),
  };

  return {
    npv: Math.round(npv),
    irr: irr !== null ? Math.round(irr * 10000) / 100 : null,
    paybackSimple: paybackSimple !== null ? Math.round(paybackSimple * 10) / 10 : null,
    paybackDiscounted: paybackDisc,
    bcRatio: Math.round(bcRatio * 100) / 100,
    globalCost: Math.round(globalCost),
    cashFlows: cashFlows,
    cumulativeCF: cumulativeCF,
    investCost: investCost,
    annualSaving: annualSaving,
    sensitivity: sensitivity,
    verdict: npv > 0 ? "PROFITABIL" : "NEPROFITABIL",
    verdictColor: npv > 0 ? "#22c55e" : "#ef4444",
  };
}
