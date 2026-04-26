// Sprint 26 P1.13+P1.14+P1.18 — verifică:
//  P1.13: investEstimate cu formulă realistă 1500/2500/3500 RON/m²
//  P1.18: rezidențial folosește milestone 2035 (NU 2033)
import { describe, it, expect } from 'vitest';
import {
  MEPS_THRESHOLDS,
  getMepsThresholdsFor,
  getMepsStatus,
  isResidentialMepsCategory,
} from '../../components/MEPSCheck.jsx';

describe('Sprint 26 P1.18 — MEPS rezidențial folosește milestone 2035', () => {
  it('RI/RC/RA au milestone2 = 2035 (EPBD 2024 Art. 9.1.a)', () => {
    expect(MEPS_THRESHOLDS.RI.milestone2).toBe(2035);
    expect(MEPS_THRESHOLDS.RC.milestone2).toBe(2035);
    expect(MEPS_THRESHOLDS.RA.milestone2).toBe(2035);
  });

  it('Rezidențial: thresholds expun ep2035 + class2035', () => {
    expect(MEPS_THRESHOLDS.RI.ep2035).toBe(200);
    expect(MEPS_THRESHOLDS.RC.ep2035).toBe(160);
    expect(MEPS_THRESHOLDS.RA.ep2035).toBe(160);
    expect(MEPS_THRESHOLDS.RC.class2035).toBe('E');
  });

  it('Nerezidențial păstrează milestone 2033 (Art. 9.1.b)', () => {
    expect(MEPS_THRESHOLDS.BI.milestone2).toBe(2033);
    expect(MEPS_THRESHOLDS.ED.milestone2).toBe(2033);
    expect(MEPS_THRESHOLDS.SA.milestone2).toBe(2033);
  });

  it('isResidentialMepsCategory diferențiază RES/NRES corect', () => {
    expect(isResidentialMepsCategory('RC')).toBe(true);
    expect(isResidentialMepsCategory('RI')).toBe(true);
    expect(isResidentialMepsCategory('RA')).toBe(true);
    expect(isResidentialMepsCategory('BI')).toBe(false);
    expect(isResidentialMepsCategory('ED')).toBe(false);
    expect(isResidentialMepsCategory('AL')).toBe(false);
  });

  it('getMepsThresholdsFor expune ep2nd/class2nd agnostic la milestone', () => {
    const tRC = getMepsThresholdsFor('RC');
    const tBI = getMepsThresholdsFor('BI');
    expect(tRC.ep2nd).toBe(160);
    expect(tRC.class2nd).toBe('E');
    expect(tRC.milestone2).toBe(2035);
    expect(tBI.ep2nd).toBe(150);
    expect(tBI.class2nd).toBe('E');
    expect(tBI.milestone2).toBe(2033);
  });

  it('getMepsStatus pentru RC clasa F + EP 220 → red 2030', () => {
    const r = getMepsStatus('F', 220, 'RC');
    expect(r.level).toBe('red');
    expect(r.year).toBe(2030);
  });

  it('getMepsStatus pentru RC clasa E + EP 180 → amber 2035 (NU 2033)', () => {
    const r = getMepsStatus('E', 180, 'RC');
    expect(r.level).toBe('amber');
    expect(r.year).toBe(2035);
  });

  it('getMepsStatus pentru BI clasa E + EP 165 → amber 2033', () => {
    const r = getMepsStatus('E', 165, 'BI');
    expect(r.level).toBe('amber');
    expect(r.year).toBe(2033);
  });

  it('getMepsStatus pentru RC clasa C + EP 140 → green', () => {
    const r = getMepsStatus('C', 140, 'RC');
    expect(r.level).toBe('green');
  });
});
