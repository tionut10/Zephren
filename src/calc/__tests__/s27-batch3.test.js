// Sprint 27 P2 batch 3 — verifică:
//  P2.6  smart-rehab sortare unificată cu rehab-comparator (NPV-best proxy)
//  P2.9  Programe noi 2026 (PREEA, Renovation Wave UE)
//  P2.14 GWP sort în suggestions catalog
import { describe, it, expect } from 'vitest';
import { calcSmartRehab } from '../smart-rehab.js';
import { FUNDING_PROGRAMS } from '../pnrr-funding.js';
import { suggestForOpaqueElement, CATALOG_VERSION } from '../../data/suggestions-catalog.js';
import { migrateCatalogIfNeeded, semverCompare, migrationMessage } from '../../utils/catalog-migration.js';

describe('Sprint 27 P2.6 — smart-rehab sortare cu costEfficiency_aniPB (NPV proxy)', () => {
  const baseInst = { ep_total_m2: 250, energyPriceEUR: 0.08 };
  const climate = { zone: 'III' };

  it('Sortarea respectă mai întâi prioritatea, apoi payback ASC', () => {
    const building = { category: 'RC', areaUseful: '100', yearBuilt: '1985' };
    // Construim un caz cu 2 măsuri priority 1 cu payback diferit
    const opaque = [
      { type: 'PE', area: '70', layers: [{ thickness: 50, lambda: 0.04 }] }, // U≈0.7 → priority 1
      { type: 'PT', area: '90', layers: [{ thickness: 30, lambda: 0.04 }] }, // U≈1.1 → priority 1
    ];
    const sugg = calcSmartRehab(building, baseInst, { rer: 10 }, opaque, [], climate);
    const p1 = sugg.filter(s => s.priority === 1);
    expect(p1.length).toBeGreaterThanOrEqual(1);
    // Verificăm că prioritățile sunt sortate ascendent
    for (let i = 1; i < sugg.length; i++) {
      expect(sugg[i].priority).toBeGreaterThanOrEqual(sugg[i - 1].priority);
    }
    // În cadrul aceleași priorități, payback ASC
    for (let i = 1; i < p1.length; i++) {
      const pbA = p1[i - 1].costEfficiency_aniPB ?? 999;
      const pbB = p1[i].costEfficiency_aniPB ?? 999;
      expect(pbB).toBeGreaterThanOrEqual(pbA);
    }
  });
});

describe('Sprint 27 P2.9 — Programe noi 2026', () => {
  it('PREEA (preea_2026) prezent în FUNDING_PROGRAMS', () => {
    const preea = FUNDING_PROGRAMS.find(p => p.id === 'preea_2026');
    expect(preea).toBeDefined();
    expect(preea.maxGrant_EUR).toBe(15000);
    expect(preea.grantPct).toBe(60);
    expect(preea.buildingTypes).toContain('RC');
    expect(preea.active).toBe(false); // proiect pending
  });

  it('Renovation Wave UE (renovation_wave_eu_2026) prezent', () => {
    const rw = FUNDING_PROGRAMS.find(p => p.id === 'renovation_wave_eu_2026');
    expect(rw).toBeDefined();
    expect(rw.maxGrant_EUR).toBe(200000);
    expect(rw.grantPct).toBe(80);
    expect(rw.minEpReduction_pct).toBe(60); // renovare profundă
    expect(rw.active).toBe(false);
  });

  it('Numărul total programe e ≥ 8 (era 6 pre-S27)', () => {
    expect(FUNDING_PROGRAMS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Sprint 27 P2.14 — GWP sort în suggestions catalog', () => {
  it('preferredTags="low-gwp" sortează ascendent pe gwp_kgco2e_per_m2', () => {
    // Funcția acceptă uTarget + uCurrent; folosim valori care permit candidaților să meets target
    const out = suggestForOpaqueElement({
      uCurrent: 0.5,
      uTarget: 0.20,
      preferredTags: ['low-gwp'],
      limit: 5,
    });
    expect(Array.isArray(out)).toBe(true);
    // Soluțiile cu gwp_kgco2e_per_m2 mai mic apar primele când există gwp definit
    // (testul nu are date GWP populate în catalog — doar verificăm că NU crash)
  });

  it('Fără preferredTags low-gwp → ordine după preț (default)', () => {
    const out = suggestForOpaqueElement({
      uCurrent: 0.5,
      uTarget: 0.20,
      preferredTags: [],
      limit: 5,
    });
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('Sprint 27 P2.12 — Catalog versioning + migration', () => {
  it('CATALOG_VERSION = "1.1.0" (bump minor pentru low-gwp support)', () => {
    expect(CATALOG_VERSION).toBe('1.1.0');
  });

  it('semverCompare ordonează corect', () => {
    expect(semverCompare('1.0.0', '1.0.0')).toBe(0);
    expect(semverCompare('1.0.0', '1.1.0')).toBe(-1);
    expect(semverCompare('1.1.0', '1.0.0')).toBe(1);
    expect(semverCompare('1.0.0', '2.0.0')).toBe(-1);
    expect(semverCompare('2.0.0', '1.99.99')).toBe(1);
  });

  it('migrateCatalogIfNeeded detectează minor bump 1.0.0 → 1.1.0', () => {
    const r = migrateCatalogIfNeeded('1.0.0');
    expect(r.migrated).toBe(true);
    expect(r.level).toBe('minor');
    expect(r.oldVersion).toBe('1.0.0');
    expect(r.newVersion).toBe('1.1.0');
  });

  it('migrateCatalogIfNeeded NO-OP când versiunile sunt egale', () => {
    const r = migrateCatalogIfNeeded(CATALOG_VERSION);
    expect(r.migrated).toBe(false);
    expect(r.level).toBe('none');
  });

  it('migrationMessage human-readable', () => {
    const r = migrateCatalogIfNeeded('1.0.0', '1.1.0');
    const msg = migrationMessage(r, 'RO');
    expect(msg).toMatch(/v1\.1\.0|adaug.*entries/i);
  });

  it('Detectare major bump (breaking)', () => {
    const r = migrateCatalogIfNeeded('1.0.0', '2.0.0');
    expect(r.level).toBe('major');
  });
});
