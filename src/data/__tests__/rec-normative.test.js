// Sprint 27 P2.11 — verifică REC_NORMATIVE map
import { describe, it, expect } from 'vitest';
import { REC_NORMATIVE, getRecNormative, recNormativeCount } from '../rec-normative.js';

describe('Sprint 27 P2.11 — REC_NORMATIVE map', () => {
  it('expune ≥26 chei REC_* (toate cheile din CHECKBOX_KEYWORD_MAP)', () => {
    expect(recNormativeCount()).toBeGreaterThanOrEqual(26);
  });

  it('include cheile critice anvelopă', () => {
    expect(REC_NORMATIVE.REC_PE_INSULATE).toMatch(/Mc 001-2022 Tab 2\.4/);
    expect(REC_NORMATIVE.REC_GLAZING).toMatch(/Tab 2\.5/);
    expect(REC_NORMATIVE.REC_GLAZING).toMatch(/L\.238\/2024/);
  });

  it('include cheile critice instalații', () => {
    expect(REC_NORMATIVE.REC_HEAT_PIPES).toMatch(/EN 15316-3/);
    expect(REC_NORMATIVE.REC_HEAT_RECOVERY).toMatch(/EN 16798-3/);
    expect(REC_NORMATIVE.REC_AUTOMATION).toMatch(/SR EN ISO 52120-1/);
  });

  it('REC_RENEWABLES citează L.238/2024', () => {
    expect(REC_NORMATIVE.REC_RENEWABLES).toMatch(/L\.238\/2024.*RER/);
  });

  it('include 14 chei S25 P0.2 noi (REC_SARPANTA, REC_SHADING, etc.)', () => {
    const s25_keys = [
      'REC_SARPANTA', 'REC_SHADING', 'REC_HEAT_PIPES', 'REC_DHW_PIPES',
      'REC_HEAT_INSULATE', 'REC_DHW_INSULATE', 'REC_BAL_VALVES',
      'REC_AIR_QUALITY', 'REC_FLOW_METERS', 'REC_HEAT_METERS',
      'REC_LOW_FLOW', 'REC_DHW_RECIRC', 'REC_HEAT_EQUIP', 'REC_VENT_EQUIP',
    ];
    for (const k of s25_keys) {
      expect(REC_NORMATIVE[k], `Cheia ${k} lipsă din REC_NORMATIVE`).toBeDefined();
      expect(REC_NORMATIVE[k].length).toBeGreaterThan(5);
    }
  });

  it('getRecNormative returnează null pentru cheie necunoscută', () => {
    expect(getRecNormative('REC_NONEXISTENT')).toBeNull();
  });

  it('getRecNormative returnează string pentru cheie validă', () => {
    expect(getRecNormative('REC_PE_INSULATE')).toMatch(/Mc 001-2022/);
  });

  it('toate valorile sunt string-uri non-goale', () => {
    for (const [k, v] of Object.entries(REC_NORMATIVE)) {
      expect(typeof v, `${k} ar trebui string`).toBe('string');
      expect(v.length, `${k} ar trebui non-gol`).toBeGreaterThan(0);
    }
  });
});
