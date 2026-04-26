// Sprint 25 P0.7 — verifică mapare combustibil → preț energie EUR/kWh.
import { describe, it, expect } from 'vitest';
import { FUEL_PRICES_EUR, getEnergyPriceEUR } from '../smart-rehab.js';

describe('Sprint 25 P0.7 — getEnergyPriceEUR mapează combustibilul', () => {
  it('override explicit energyPriceEUR are prioritate', () => {
    expect(getEnergyPriceEUR({ energyPriceEUR: 0.15 })).toBeCloseTo(0.15);
  });

  it('default fără source → gaz natural', () => {
    expect(getEnergyPriceEUR({})).toBe(FUEL_PRICES_EUR.gaz_natural);
  });

  it('source "electric" → preț electric', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'electric_direct' } })).toBe(FUEL_PRICES_EUR.electric);
  });

  it('source "termoficare" → preț termoficare', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'termoficare_urban' } })).toBe(FUEL_PRICES_EUR.termoficare);
  });

  it('source "peleti" → preț peleti', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'cazan_peleti' } })).toBe(FUEL_PRICES_EUR.peleti);
  });

  it('source "lemn" → preț lemn', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'soba_lemn' } })).toBe(FUEL_PRICES_EUR.lemn);
  });

  it('source "pc_aer_apa" (pompă căldură) → preț electric', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'pc_aer_apa' } })).toBe(FUEL_PRICES_EUR.electric);
  });

  it('source "pompa_caldura" → preț electric', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'pompa_caldura_aer_apa' } })).toBe(FUEL_PRICES_EUR.electric);
  });

  it('source "gaz_natural_centrala" → preț gaz natural', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'gaz_natural_centrala' } })).toBe(FUEL_PRICES_EUR.gaz_natural);
  });

  it('source "biomasa" → preț biomasă', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'cazan_biomasa' } })).toBe(FUEL_PRICES_EUR.biomasa);
  });

  it('source "motorina" → preț motorină', () => {
    expect(getEnergyPriceEUR({ heating: { source: 'cazan_motorina' } })).toBe(FUEL_PRICES_EUR.motorina);
  });

  it('FUEL_PRICES_EUR include 11 combustibili distincți', () => {
    expect(Object.keys(FUEL_PRICES_EUR).length).toBeGreaterThanOrEqual(11);
    expect(FUEL_PRICES_EUR.electric).toBeGreaterThan(FUEL_PRICES_EUR.gaz_natural); // electric > gaz
    expect(FUEL_PRICES_EUR.lemn).toBeLessThan(FUEL_PRICES_EUR.gaz_natural);         // lemn < gaz
  });

  it('alias instSummary.heatingSource (camelCase) → același preț', () => {
    expect(getEnergyPriceEUR({ heatingSource: 'electric_direct' })).toBe(FUEL_PRICES_EUR.electric);
  });
});
