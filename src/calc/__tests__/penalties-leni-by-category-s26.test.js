// Sprint 26 P1.12 — verifică LENI_LIMITS_BY_CATEGORY și calcP9_Iluminat per categorie.
import { describe, it, expect } from 'vitest';
import { calcP9_Iluminat, LENI_LIMITS_BY_CATEGORY } from '../penalties.js';

describe('Sprint 26 P1.12 — LENI_LIMITS_BY_CATEGORY', () => {
  it('rezidențial RI/RC/RA → 8 kWh/(m²·an)', () => {
    expect(LENI_LIMITS_BY_CATEGORY.RI).toBe(8);
    expect(LENI_LIMITS_BY_CATEGORY.RC).toBe(8);
    expect(LENI_LIMITS_BY_CATEGORY.RA).toBe(8);
  });

  it('birouri BI = 25', () => {
    expect(LENI_LIMITS_BY_CATEGORY.BI).toBe(25);
  });

  it('educație ED = 32 (școli, grădinițe)', () => {
    expect(LENI_LIMITS_BY_CATEGORY.ED).toBe(32);
  });

  it('spitale SA = 90 (24/7 + intensiv)', () => {
    expect(LENI_LIMITS_BY_CATEGORY.SA).toBe(90);
  });

  it('hoteluri HC/HOR = 30', () => {
    expect(LENI_LIMITS_BY_CATEGORY.HC).toBe(30);
    expect(LENI_LIMITS_BY_CATEGORY.HOR).toBe(30);
  });

  it('comerț CO/MAG/MALL = 35', () => {
    expect(LENI_LIMITS_BY_CATEGORY.CO).toBe(35);
    expect(LENI_LIMITS_BY_CATEGORY.MAG).toBe(35);
    expect(LENI_LIMITS_BY_CATEGORY.MALL).toBe(35);
  });

  it('sport SP = 25', () => {
    expect(LENI_LIMITS_BY_CATEGORY.SP).toBe(25);
  });

  it('default AL = 20', () => {
    expect(LENI_LIMITS_BY_CATEGORY.AL).toBe(20);
  });
});

describe('Sprint 26 P1.12 — calcP9_Iluminat folosește limit per categorie', () => {
  it('REZ: LENI 10 > 8 → penalizat', () => {
    const r = calcP9_Iluminat({ leni: 10 }, 'RC');
    expect(r.applied).toBe(true);
    expect(r.reason).toMatch(/peste 8/);
  });

  it('REZ: LENI 6 < 8 → OK', () => {
    const r = calcP9_Iluminat({ leni: 6 }, 'RC');
    expect(r.applied).toBe(false);
  });

  it('Spital: LENI 70 < 90 → OK (folosește limit categorie SA)', () => {
    const r = calcP9_Iluminat({ leni: 70 }, 'SA');
    expect(r.applied).toBe(false);
  });

  it('Birou: LENI 30 > 25 → penalizat', () => {
    const r = calcP9_Iluminat({ leni: 30 }, 'BI');
    expect(r.applied).toBe(true);
    expect(r.reason).toMatch(/peste 25/);
  });

  it('Categorie necunoscută → fallback la PENALTY_THRESHOLDS.LENI_LIMIT (15)', () => {
    const r = calcP9_Iluminat({ leni: 16 }, 'NEEXISTENT');
    expect(r.applied).toBe(true);
    expect(r.reason).toMatch(/peste 15/);
  });

  it('LENI nedefinit → no-op', () => {
    const r = calcP9_Iluminat({ leni: 0 }, 'RC');
    expect(r.applied).toBe(false);
    expect(r.reason).toMatch(/nedefinit/);
  });
});
