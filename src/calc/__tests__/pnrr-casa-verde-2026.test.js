// Sprint 25 P0.3 — Casa Verde Plus 2026: valorile sunt în RON conform AFM 2026.
// Surse: energieacasa.ro, money.ro (până la 20k RON pompă), termo-solar.ro.
import { describe, it, expect } from 'vitest';
import { FUNDING_PROGRAMS } from '../pnrr-funding.js';

const cv = FUNDING_PROGRAMS.find(p => p.id === 'casa_verde_plus_rez');

describe('Sprint 25 P0.3 — Casa Verde Plus 2026 RON breakdown', () => {
  it('maxGrant_RON = 30.000 RON (sol-apă)', () => {
    expect(cv.maxGrant_RON).toBe(30000);
  });

  it('maxGrant_EUR ≈ 5.882 EUR (la curs 5.10 fallback)', () => {
    // Acceptă rotunjire ±10 EUR
    expect(cv.maxGrant_EUR).toBeGreaterThan(5870);
    expect(cv.maxGrant_EUR).toBeLessThan(5895);
  });

  it('breakdown_RON: aer-apă=20k, sol-apă=30k, hibrid=35k, solar_thermal=10k', () => {
    expect(cv.maxGrantBreakdown_RON.hp_aw).toBe(20000);
    expect(cv.maxGrantBreakdown_RON.hp_gw).toBe(30000);
    expect(cv.maxGrantBreakdown_RON.hp_hybrid).toBe(35000);
    expect(cv.maxGrantBreakdown_RON.solar_thermal).toBe(10000);
    expect(cv.maxGrantBreakdown_RON.cumul_max).toBe(35000);
  });

  it('PV/baterii ELIMINATE — sunt în Casa Verde Fotovoltaice (program separat)', () => {
    expect(cv.maxMeasures.pv_kwp).toBe(0);
    expect(cv.maxMeasures.storage_kwh).toBe(0);
    expect(cv.maxGrantBreakdown.pv_addon).toBe(0);
  });

  it('eligibleMeasures NU mai conține "PV + stocare"', () => {
    expect(cv.eligibleMeasures.join('|')).not.toMatch(/PV|stocare|baterie/i);
    expect(cv.eligibleMeasures).toContain('Pompă de căldură');
    expect(cv.eligibleMeasures).toContain('Solar termic');
  });

  it('legal referențiază Ghid AFM 2026', () => {
    expect(cv.legal).toMatch(/2026/);
    expect(cv.legal).toMatch(/OUG 20\/2023|AFM/);
  });

  it('note menționează program separat Casa Verde Fotovoltaice', () => {
    expect(cv.note).toMatch(/Casa Verde Fotovoltaice/i);
  });

  it('grantPct = 90% (sub-decontare AFM)', () => {
    expect(cv.grantPct).toBe(90);
  });

  it('cofinancePct = 10%', () => {
    expect(cv.cofinancePct).toBe(10);
  });

  it('discrepanța cu OLD = 6.7× (30k EUR → 30k RON ≈ 5.882 EUR) e corectată', () => {
    // OLD: maxGrant_EUR = 30000 → 30000 * 5.10 = 153.000 RON (greșit, era 6.7× peste real)
    // NEW: maxGrant_EUR ≈ 5.882 EUR (= 30.000 RON la 5.10) — corect
    expect(cv.maxGrant_EUR).toBeLessThan(7000); // verifică NU mai e 30000
  });
});
