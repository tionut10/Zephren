// Sprint 25 P0.6 — verifică pragurile U adaptive RES/NRES/RENOVARE.
// Mc 001-2022 Tab 2.4 (nZEB rez) / 2.7 (nZEB nrez) / 2.10a (renov rez) / 2.10b (renov nrez).
import { describe, it, expect } from 'vitest';
import { calcSmartRehab, getURefAdaptive, getURefGlazingAdaptive } from '../smart-rehab.js';
import {
  U_REF_NZEB_RES, U_REF_NZEB_NRES,
  U_REF_RENOV_RES, U_REF_RENOV_NRES,
  U_REF_GLAZING,
} from '../../data/u-reference.js';

describe('Sprint 25 P0.6 — getURefAdaptive', () => {
  it('rezidențial nou (yearBuilt 2010) → Tab 2.4 nZEB rez', () => {
    expect(getURefAdaptive('RC', 'PE', { yearBuilt: 2010 })).toBe(U_REF_NZEB_RES.PE);
    expect(getURefAdaptive('RC', 'PT', { yearBuilt: 2010 })).toBe(U_REF_NZEB_RES.PT);
  });

  it('rezidențial vechi (yearBuilt 1985) → Tab 2.10a renov rez', () => {
    expect(getURefAdaptive('RC', 'PE', { yearBuilt: 1985 })).toBe(U_REF_RENOV_RES.PE);
    expect(getURefAdaptive('RI', 'PT', { yearBuilt: 1990 })).toBe(U_REF_RENOV_RES.PT);
  });

  it('nerezidențial nou → Tab 2.7 nZEB nrez', () => {
    expect(getURefAdaptive('BI', 'PE', { yearBuilt: 2015 })).toBe(U_REF_NZEB_NRES.PE);
    expect(getURefAdaptive('ED', 'PT', { yearBuilt: 2020 })).toBe(U_REF_NZEB_NRES.PT);
  });

  it('nerezidențial vechi → Tab 2.10b renov nrez', () => {
    expect(getURefAdaptive('BI', 'PE', { yearBuilt: 1990 })).toBe(U_REF_RENOV_NRES.PE);
    expect(getURefAdaptive('SA', 'PT', { yearBuilt: 1985 })).toBe(U_REF_RENOV_NRES.PT);
  });

  it('scopCpe="renovare" override → renovare chiar dacă yearBuilt nou', () => {
    expect(getURefAdaptive('RC', 'PE', { yearBuilt: 2018, scopCpe: 'renovare' })).toBe(U_REF_RENOV_RES.PE);
  });

  it('scopCpe="renovare_majora" override', () => {
    expect(getURefAdaptive('BI', 'PE', { yearBuilt: 2018, scopCpe: 'renovare_majora' })).toBe(U_REF_RENOV_NRES.PE);
  });
});

describe('Sprint 25 P0.6 — getURefGlazingAdaptive', () => {
  it('rezidențial nou → 1.11 (Mc 001-2022 Tab 2.5 nZEB rez)', () => {
    expect(getURefGlazingAdaptive('RC', { yearBuilt: 2018 })).toBe(U_REF_GLAZING.nzeb_res);
    expect(U_REF_GLAZING.nzeb_res).toBe(1.11);
  });

  it('nerezidențial nou → 1.20 (nZEB nrez)', () => {
    expect(getURefGlazingAdaptive('BI', { yearBuilt: 2015 })).toBe(U_REF_GLAZING.nzeb_nres);
    expect(U_REF_GLAZING.nzeb_nres).toBe(1.20);
  });

  it('renovare (orice) → 1.20 (Tab 2.5 renov)', () => {
    expect(getURefGlazingAdaptive('RC', { yearBuilt: 1985 })).toBe(U_REF_GLAZING.renov);
    expect(getURefGlazingAdaptive('BI', { yearBuilt: 1985 })).toBe(U_REF_GLAZING.renov);
  });
});

describe('Sprint 25 P0.6 — calcSmartRehab folosește pragurile adaptive', () => {
  const baseInst = { ep_total_m2: 250, energyPriceEUR: 0.08 };
  const climate = { zone: 'III' };
  // Helper: layers care produc U specific (single layer EPS λ=0.04, Rsi=0.17 conform smart-rehab)
  const layer = (thicknessMm) => [{ thickness: thicknessMm, lambda: 0.04 }];
  // Verificare U calculat: t=200→U≈0.193, t=130→U≈0.292, t=100→U≈0.375, t=80→U≈0.461,
  //                       t=60→U≈0.599, t=50→U≈0.704

  it('REZ NOU (yearBuilt 2010) cu U_perete ≈0.19 (sub uRef=0.25) NU declanșează', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 2010 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(200) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    expect(sugg.find(s => s.measure === 'Suplimentare izolație pereți')).toBeUndefined();
  });

  it('REZ NOU cu U_perete ≈0.46 (>0.25×1.20=0.30) declanșează priority 1', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 2010 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(80) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    const wallSugg = sugg.find(s => s.measure === 'Termoizolare pereți exteriori');
    expect(wallSugg).toBeDefined();
    expect(wallSugg.priority).toBe(1);
    expect(wallSugg.detail).toMatch(/nZEB rez/);
  });

  it('REZ NOU cu U_perete ≈0.29 (între 0.25 și 0.30) → priority 2 moderate', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 2010 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(130) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    const moderate = sugg.find(s => s.measure === 'Suplimentare izolație pereți');
    expect(moderate).toBeDefined();
    expect(moderate.priority).toBe(2);
  });

  it('REZ VECHI (yearBuilt 1985) cu U_perete ≈0.29 (sub uRef renov 0.33) NU declanșează', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 1985 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(130) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    expect(sugg.find(s => s.measure === 'Suplimentare izolație pereți')).toBeUndefined();
  });

  it('REZ VECHI cu U_perete ≈0.38 (între 0.33 și 0.396) → priority 2', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 1985 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(100) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    const moderate = sugg.find(s => s.measure === 'Suplimentare izolație pereți');
    expect(moderate).toBeDefined();
    expect(moderate.priority).toBe(2);
    expect(moderate.detail).toMatch(/renovare/);
  });

  it('REZ VECHI cu U_perete ≈0.70 (>0.396) → priority 1 strict', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 1985 };
    const opaque = [{ type: 'PE', area: '70', layers: layer(50) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    const wallSugg = sugg.find(s => s.measure === 'Termoizolare pereți exteriori');
    expect(wallSugg).toBeDefined();
    expect(wallSugg.priority).toBe(1);
    expect(wallSugg.detail).toMatch(/renovare rez/);
  });

  it('NREZ NOU (BI yearBuilt 2015) cu U_perete ≈0.19 (sub 0.33 NRES) NU declanșează', () => {
    // U_REF_NZEB_NRES.PE = 0.33 conform Mc 001-2022 Tab 2.7
    const building = { category: 'BI', areaUseful: '500', yearBuilt: 2015 };
    const opaque = [{ type: 'PE', area: '300', layers: layer(200) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    expect(sugg.find(s => s.measure === 'Suplimentare izolație pereți')).toBeUndefined();
  });

  it('NREZ NOU cu U_perete ≈0.46 (>0.33×1.20=0.396) → priority 1 (nZEB nrez)', () => {
    const building = { category: 'BI', areaUseful: '500', yearBuilt: 2015 };
    const opaque = [{ type: 'PE', area: '300', layers: layer(80) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    const wallSugg = sugg.find(s => s.measure === 'Termoizolare pereți exteriori');
    expect(wallSugg).toBeDefined();
    expect(wallSugg.priority).toBe(1);
    expect(wallSugg.detail).toMatch(/nZEB nrez/);
  });

  it('NREZ VECHI (BI yearBuilt 1985) cu U_perete ≈0.46 (între 0.40 și 0.48) → priority 2 renovare nrez', () => {
    // U_REF_RENOV_NRES.PE = 0.40 conform Mc 001-2022 Tab 2.10b
    const building = { category: 'BI', areaUseful: '500', yearBuilt: 1985 };
    const opaque = [{ type: 'PE', area: '300', layers: layer(80) }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, opaque, [], climate);
    expect(sugg.find(s => s.measure === 'Termoizolare pereți exteriori')).toBeUndefined();
    const moderate = sugg.find(s => s.measure === 'Suplimentare izolație pereți');
    expect(moderate).toBeDefined();
    expect(moderate.priority).toBe(2);
    expect(moderate.detail).toMatch(/renovare nrez/);
  });

  it('Recomandarea pentru ferestre la REZ NOU țintește U≤0.90 (tripan)', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 2015 };
    const glazing = [{ u: 2.5, area: '20' }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, [], glazing, climate);
    const winSugg = sugg.find(s => s.measure === 'Înlocuire tâmplărie exterioară');
    expect(winSugg).toBeDefined();
    expect(winSugg.detail).toMatch(/instalat 0\.9/);
  });

  it('Recomandarea pentru ferestre la REZ VECHI (renovare) țintește U≤1.10', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: 1985 };
    const glazing = [{ u: 2.5, area: '20' }];
    const sugg = calcSmartRehab(building, baseInst, { rer: 0 }, [], glazing, climate);
    const winSugg = sugg.find(s => s.measure === 'Înlocuire tâmplărie exterioară');
    expect(winSugg).toBeDefined();
    expect(winSugg.detail).toMatch(/instalat 1\.1/);
  });
});
