// Sprint 25 P0.8 — verifică că CostOptimalCurve.jsx folosește rehab-prices.js
// drept sursă canonică pentru prețurile pachetelor benchmark.
//
// Test indirect: import default-ul componentei NU e necesar; verificăm că
// modulul nu (re-)declară PRICES const local (audit P0.1 → o singură sursă).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPrice } from '../../data/rehab-prices.js';

const SRC = readFileSync(
  resolve(__dirname, '../../components/CostOptimalCurve.jsx'),
  'utf8'
);

describe('Sprint 25 P0.8 — CostOptimalCurve elimină PRICES duplicat', () => {
  it('importă getPrice din rehab-prices.js', () => {
    expect(SRC).toMatch(/import\s+\{[^}]*getPrice[^}]*\}\s+from\s+['"]\.\.\/data\/rehab-prices\.js['"]/);
  });

  it('NU mai conține obiectul const PRICES top-level (cu chei envelope/heating)', () => {
    // Caută un PRICES const cu chei tipice — pattern strict pentru a evita
    // false-positives în comentarii sau JSX ulterior.
    expect(SRC).not.toMatch(/^const\s+PRICES\s*=\s*\{[^}]*envelope[^}]*\{[^}]*wall_eps_10cm/m);
  });

  it('declară _getPackagePrices() factory care derivă din getPrice()', () => {
    expect(SRC).toMatch(/_getPackagePrices/);
    // Helper-ul `_p(cat, item, fb) => getPrice(cat, item)?.price ?? fb`
    // referențiază `wall_eps_10cm` în factory.
    expect(SRC).toMatch(/_p\s*\(\s*['"]envelope['"]\s*,\s*['"]wall_eps_10cm['"]/);
    // și apelează getPrice() undeva
    expect(SRC).toMatch(/getPrice\s*\(/);
  });

  it('referințele la P.envelope/P.heating folosesc factory-ul, nu obiectul vechi', () => {
    // const P = _getPackagePrices()
    expect(SRC).toMatch(/const\s+P\s*=\s*_getPackagePrices\(\)/);
  });
});

describe('Sprint 25 P0.8 — prețurile sunt sincronizate cu rehab-prices.js', () => {
  it('rehab-prices.js conține toate cheile referențiate de CostOptimalCurve', () => {
    const requiredKeys = [
      ['envelope', 'wall_eps_10cm'],
      ['envelope', 'wall_eps_15cm'],
      ['envelope', 'roof_eps_15cm'],
      ['envelope', 'roof_mw_25cm'],
      ['envelope', 'windows_u140'],
      ['envelope', 'windows_u110'],
      ['envelope', 'windows_u090'],
      ['heating',  'boiler_cond_24kw'],
      ['heating',  'hp_aw_12kw'],
      ['cooling',  'vmc_hr_90_per_m2'],
      ['renewables', 'pv_kwp'],
      ['renewables', 'pv_battery_kwh'],
      ['lighting', 'led_replacement'],
      ['lighting', 'dali_upgrade'],
      ['bacs',     'class_c_to_b'],
    ];
    for (const [cat, item] of requiredKeys) {
      const p = getPrice(cat, item);
      expect(p, `${cat}.${item} lipsește din rehab-prices.js`).not.toBeNull();
      expect(p.price, `${cat}.${item}.price invalid`).toBeGreaterThan(0);
    }
  });
});
