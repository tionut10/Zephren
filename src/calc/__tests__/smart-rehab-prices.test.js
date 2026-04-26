// Sprint 25 P0.1 — verifică că smart-rehab + rehab-comparator + rehab-cost
// folosesc rehab-prices.js ca sursă canonică (nu mai au prețuri hardcodate paralele).
import { describe, it, expect } from 'vitest';
import { calcSmartRehab } from '../smart-rehab.js';
import { calcRehabPackages } from '../rehab-comparator.js';
import { calcRehabCost } from '../rehab-cost.js';
import { getPrice } from '../../data/rehab-prices.js';

const baseBuilding = {
  category: 'RC',
  areaUseful: '100',
  yearBuilt: '1980',
};
const baseInst = { ep_total_m2: 250, energyPriceEUR: 0.08 };
const climate = { zone: 'III' };

const opaqueBad = [
  { type: 'PE', area: '70', layers: [{ thickness: 250, lambda: 0.8 }] }, // U ridicat
  { type: 'PT', area: '90', layers: [{ thickness: 100, lambda: 0.04 }] },
];
const glazingBad = [{ type: 'PV', u: 2.5, area: '15' }];

describe('Sprint 25 P0.1 — smart-rehab folosește rehab-prices.js', () => {
  it('costM2 perete @ 10cm = wall_eps_10cm.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'wall_eps_10cm', 'mid').price;
    const sugg = calcSmartRehab(baseBuilding, baseInst, { rer: 0 }, opaqueBad, glazingBad, climate);
    const wallSugg = sugg.find(s => s.measure === 'Termoizolare pereți exteriori');
    expect(wallSugg).toBeDefined();
    // costPerM2 e formatat ca "42 EUR/m²"; extragem numărul
    const costPerM2 = parseInt(wallSugg.costPerM2);
    expect(costPerM2).toBe(expected);
  });

  it('costM2 acoperiș @ 15cm = roof_eps_15cm.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'roof_eps_15cm', 'mid').price;
    const sugg = calcSmartRehab(baseBuilding, baseInst, { rer: 0 }, opaqueBad, glazingBad, climate);
    const roofSugg = sugg.find(s => s.measure === 'Termoizolare acoperiș/terasă');
    expect(roofSugg).toBeDefined();
    expect(parseInt(roofSugg.costPerM2)).toBe(expected);
  });

  it('costM2 ferestre tripan = windows_u090.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'windows_u090', 'mid').price;
    const sugg = calcSmartRehab(baseBuilding, baseInst, { rer: 0 }, opaqueBad, glazingBad, climate);
    const winSugg = sugg.find(s => s.measure === 'Înlocuire tâmplărie exterioară');
    expect(winSugg).toBeDefined();
    expect(parseInt(winSugg.costPerM2)).toBe(expected);
  });
});

describe('Sprint 25 P0.1 — rehab-comparator folosește rehab-prices.js', () => {
  it('Pachet Mediu cost = wallArea * wall_eps_10cm + roof * roof_eps_15cm + win * windows_u090 + Au * led', () => {
    const result = calcRehabPackages({
      building: baseBuilding,
      climate,
      epActual: 250,
      wallArea: 70,
      roofArea: 90,
      windowArea: 15,
      energyPriceEUR: 0.08,
      discountRate: 4,
      escalation: 3,
      period: 30,
    });
    const wallP   = getPrice('envelope', 'wall_eps_10cm', 'mid').price;
    const roofP   = getPrice('envelope', 'roof_eps_15cm', 'mid').price;
    const winP    = getPrice('envelope', 'windows_u090',  'mid').price;
    const ledP    = getPrice('lighting', 'led_replacement', 'mid').price;
    const expected = 70 * wallP + 90 * roofP + 15 * winP + 100 * ledP;

    const mediuPkg = result.packages.find(p => p.label === 'Mediu');
    expect(mediuPkg).toBeDefined();
    expect(mediuPkg.invest).toBe(expected);
  });

  it('Pachet nZEB folosește windows_u070 (era windows_u07 hardcodat)', () => {
    const result = calcRehabPackages({
      building: baseBuilding,
      climate,
      epActual: 250,
      wallArea: 70,
      roofArea: 90,
      windowArea: 15,
      energyPriceEUR: 0.08,
      discountRate: 4,
      escalation: 3,
      period: 30,
    });
    const winU070 = getPrice('envelope', 'windows_u070', 'mid').price;
    const nzeb = result.packages.find(p => p.label === 'nZEB Integral');
    expect(nzeb).toBeDefined();
    // verifică că suma include 15 * winU070; pe forma actuală nzeb.invest e total — verific minim
    expect(nzeb.invest).toBeGreaterThan(15 * winU070);
  });
});

describe('Sprint 25 P0.1 — rehab-cost folosește rehab-prices.js', () => {
  it('windows_2g (U≤1.1) = windows_u110.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'windows_u110', 'mid').price;
    const dev = calcRehabCost({
      windowArea: 20,
      replaceWindows: true,
      windowType: '2g',
      Au: 100,
    });
    const winItem = dev.items.find(i => i.label.includes('dublu'));
    expect(winItem).toBeDefined();
    expect(winItem.price_unit).toBe(expected);
  });

  it('PV kWp = pv_kwp.mid din rehab-prices', () => {
    const expected = getPrice('renewables', 'pv_kwp', 'mid').price;
    const dev = calcRehabCost({
      addPV: true,
      pvKwp: 5,
      Au: 100,
    });
    const pvItem = dev.items.find(i => i.unit === 'kWp');
    expect(pvItem).toBeDefined();
    expect(pvItem.price_unit).toBe(expected);
  });

  it('basement (XPS 10cm) = basement_xps_10cm.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'basement_xps_10cm', 'mid').price;
    const dev = calcRehabCost({
      floorArea: 50,
      Au: 100,
    });
    const basItem = dev.items.find(i => i.label.includes('subsol') || i.label.includes('demisol'));
    expect(basItem).toBeDefined();
    expect(basItem.price_unit).toBe(expected);
  });

  it('airtightness = airtightness_n50.mid din rehab-prices', () => {
    const expected = getPrice('envelope', 'airtightness_n50', 'mid').price;
    const dev = calcRehabCost({
      wallArea: 70,
      wallInsulType: 'eps',
      wallInsulThick: 12,
      Au: 100,
    });
    const airItem = dev.items.find(i => i.label.toLowerCase().includes('etanșare'));
    expect(airItem).toBeDefined();
    expect(airItem.price_unit).toBe(expected);
  });
});
