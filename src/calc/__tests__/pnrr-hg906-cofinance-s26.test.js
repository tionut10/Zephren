// Sprint 26 P1.17 — verifică cofinanțarea variabilă HG 906/2023 per ownerType.
import { describe, it, expect } from 'vitest';
import { FUNDING_PROGRAMS, calcPNRRFunding } from '../pnrr-funding.js';

const hg906 = FUNDING_PROGRAMS.find(p => p.id === 'hg906_blocuri');

describe('Sprint 26 P1.17 — HG 906/2023 cofinanceByOwnerType', () => {
  it('expune mapare 3 tipuri owner: uat, asociation, mixed', () => {
    expect(hg906.cofinanceByOwnerType).toBeDefined();
    expect(hg906.cofinanceByOwnerType.uat).toEqual({ grantPct: 70, cofinancePct: 30 });
    expect(hg906.cofinanceByOwnerType.asociation).toEqual({ grantPct: 50, cofinancePct: 50 });
    expect(hg906.cofinanceByOwnerType.mixed).toEqual({ grantPct: 60, cofinancePct: 40 });
  });

  it('grantPct default rămâne 50 (asociație, cazul cel mai frecvent)', () => {
    expect(hg906.grantPct).toBe(50);
    expect(hg906.cofinancePct).toBe(50);
  });
});

describe('Sprint 26 P1.17 — calcPNRRFunding aplică override per ownerType', () => {
  const baseParams = {
    building: { category: 'RC', areaUseful: 5000, yearBuilt: 1985 },
    investTotal: 100000,
    epActual: 250,
    epAfterRehab: 100,
    measures: ['Termoizolare fațadă'],
    pvKwp: 0,
    storageKwh: 0,
    isPublicBuilding: false,
  };

  it('UAT: grant 70% → 70.000 EUR (cap 40k EUR maxGrant)', () => {
    const r = calcPNRRFunding({ ...baseParams, ownerType: 'uat' });
    const hg906Result = r.results.find(p => p.programId === 'hg906_blocuri');
    expect(hg906Result.grantPct).toBe(70);
    // Capped la maxGrant_EUR=40.000
    expect(hg906Result.grantAmount).toBe(40000);
  });

  it('Asociație (default): grant 50% → 50.000 EUR (capped)', () => {
    const r = calcPNRRFunding({ ...baseParams, ownerType: 'fizica' });
    const hg906Result = r.results.find(p => p.programId === 'hg906_blocuri');
    expect(hg906Result.grantPct).toBe(50);
    expect(hg906Result.grantAmount).toBe(40000); // capped
  });

  it('Mixt: grant 60% → 60.000 EUR (capped)', () => {
    const r = calcPNRRFunding({ ...baseParams, ownerType: 'mixed' });
    const hg906Result = r.results.find(p => p.programId === 'hg906_blocuri');
    expect(hg906Result.grantPct).toBe(60);
    expect(hg906Result.grantAmount).toBe(40000); // capped la 40k
  });

  it('Asociație cu invest mic 30k → grant 50% = 15k (sub cap)', () => {
    const r = calcPNRRFunding({ ...baseParams, investTotal: 30000, ownerType: 'asociation' });
    const hg906Result = r.results.find(p => p.programId === 'hg906_blocuri');
    expect(hg906Result.grantAmount).toBe(15000);
  });

  it('UAT cu invest mic 30k → grant 70% = 21k', () => {
    const r = calcPNRRFunding({ ...baseParams, investTotal: 30000, ownerType: 'uat' });
    const hg906Result = r.results.find(p => p.programId === 'hg906_blocuri');
    expect(hg906Result.grantAmount).toBe(21000);
  });
});
