// Sprint 26 P1.2 + P1.3 + P1.4 + P1.5 — verifică:
//  P1.2: macroeconomic discountRate 4 → 3
//  P1.3: sensitivity NPV pe rate (discount/escalation) ±200 bp
//  P1.4: LCOE include replacements actualizate
//  P1.5: paybackDiscounted cu interpolare liniară
import { describe, it, expect } from 'vitest';
import { calcFinancialAnalysis, DEFAULT_RATES_BY_PERSPECTIVE, calcAllPerspectives } from '../financial.js';

describe('Sprint 26 P1.2 — DEFAULT_RATES_BY_PERSPECTIVE', () => {
  it('macroeconomic discountRate = 3% (Reg. UE 2025/2273 Anexa I)', () => {
    expect(DEFAULT_RATES_BY_PERSPECTIVE.macroeconomic.discountRate).toBe(3);
  });

  it('financial private rămâne 4%', () => {
    expect(DEFAULT_RATES_BY_PERSPECTIVE.financial.discountRate).toBe(4);
  });

  it('socială rămâne 3%', () => {
    expect(DEFAULT_RATES_BY_PERSPECTIVE.social.discountRate).toBe(3);
  });

  it('macroeconomic exclude TVA (includeVAT=false)', () => {
    expect(DEFAULT_RATES_BY_PERSPECTIVE.macroeconomic.includeVAT).toBe(false);
  });

  it('calcAllPerspectives folosește valorile actualizate', () => {
    const params = { investCost: 50000, annualSaving: 4000, annualMaint: 200, period: 30, annualEnergyKwh: 8000 };
    const all = calcAllPerspectives(params);
    expect(all.macroeconomic).toBeDefined();
    // Cu rata 3% în loc de 4%, NPV macro > NPV financial (rate mai mică = mai puternic discount)
    expect(all.macroeconomic.npv).toBeGreaterThan(all.financial.npv);
  });
});

describe('Sprint 26 P1.3 — sensitivity NPV pe rate (rate_m200bp/p200bp/esc_m200bp/p200bp)', () => {
  const baseParams = {
    investCost: 50000,
    annualSaving: 4500,
    annualMaint: 200,
    discountRate: 4,
    escalation: 3,
    period: 30,
  };

  it('returnează 4 valori noi: rate_m200bp, rate_p200bp, esc_m200bp, esc_p200bp', () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.sensitivity).toHaveProperty('rate_m200bp');
    expect(r.sensitivity).toHaveProperty('rate_p200bp');
    expect(r.sensitivity).toHaveProperty('esc_m200bp');
    expect(r.sensitivity).toHaveProperty('esc_p200bp');
  });

  it('rate_m200bp (rată mai mică) → NPV mai mare ca baseline', () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.sensitivity.rate_m200bp).toBeGreaterThan(r.sensitivity.saving_base);
  });

  it('rate_p200bp (rată mai mare) → NPV mai mic ca baseline', () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.sensitivity.rate_p200bp).toBeLessThan(r.sensitivity.saving_base);
  });

  it('esc_p200bp (escalare mai mare) → NPV mai mare', () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.sensitivity.esc_p200bp).toBeGreaterThan(r.sensitivity.saving_base);
  });

  it('esc_m200bp (escalare mai mică) → NPV mai mic', () => {
    const r = calcFinancialAnalysis(baseParams);
    expect(r.sensitivity.esc_m200bp).toBeLessThan(r.sensitivity.saving_base);
  });

  it('rate ≥ 0 chiar dacă discountRate = 1% și scădem 200bp', () => {
    const r = calcFinancialAnalysis({ ...baseParams, discountRate: 1 });
    // Math.max(0, discountRate - 0.02) → cu discountRate=0.01, max(0, -0.01) = 0
    expect(r.sensitivity.rate_m200bp).toBeDefined();
    expect(Number.isFinite(r.sensitivity.rate_m200bp)).toBe(true);
  });
});

describe('Sprint 26 P1.4 — LCOE include replacements actualizate', () => {
  it('LCOE crește când există replacements (consistent cu globalCost + B/C)', () => {
    const baseParams = {
      investCost: 50000,
      annualSaving: 4500,
      annualMaint: 200,
      annualEnergyKwh: 8000,
      discountRate: 4,
      period: 30,
    };
    const lcoeNoReplace = calcFinancialAnalysis(baseParams).lcoe;
    const lcoeWithReplace = calcFinancialAnalysis({
      ...baseParams,
      replacementCosts: [{ year: 15, cost: 10000 }],
    }).lcoe;
    expect(lcoeWithReplace).toBeGreaterThan(lcoeNoReplace);
  });

  it('LCOE = null când annualEnergyKwh = 0 (defensive)', () => {
    const r = calcFinancialAnalysis({ investCost: 50000, annualSaving: 4500, annualEnergyKwh: 0, period: 30 });
    expect(r.lcoe).toBeNull();
  });
});

describe('Sprint 26 P1.5 — paybackDiscounted cu interpolare liniară', () => {
  it('paybackDiscounted are decimale (interpolare), NU integer brut', () => {
    const r = calcFinancialAnalysis({
      investCost: 50000,
      annualSaving: 6000,
      annualMaint: 100,
      discountRate: 4,
      escalation: 3,
      period: 30,
    });
    expect(r.paybackDiscounted).toBeGreaterThan(0);
    // Interpolarea produce valori non-integer (cu excepția cazurilor unde discCF[y]=cumulativeDiscCF[y-1])
    // Verificăm că nu e Math.round() la integer
    expect(r.paybackDiscounted % 1).not.toBe(0);
  });

  it('paybackDiscounted ≥ paybackSimple (pentru rate > 0)', () => {
    const r = calcFinancialAnalysis({
      investCost: 50000,
      annualSaving: 6000,
      annualMaint: 100,
      discountRate: 4,
      escalation: 3,
      period: 30,
    });
    expect(r.paybackDiscounted).toBeGreaterThanOrEqual(r.paybackSimple);
  });
});
