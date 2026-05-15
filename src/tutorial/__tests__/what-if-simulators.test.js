// ═════════════════════════════════════════════════════════════════════════════
// what-if-simulators.test.js — Toate formulele simulator funcționează matematic
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";

import pas1 from "../content/pas1-identificare.js";
import pas2 from "../content/pas2-anvelopa.js";
import pas3 from "../content/pas3-instalatii.js";
import pas4 from "../content/pas4-surse-regen.js";
import pas5 from "../content/pas5-calcul-energetic.js";
import pas6 from "../content/pas6-certificat-cpe.js";
import pas7 from "../content/pas7-audit-energetic.js";
import pas8 from "../content/pas8-instrumente.js";

const ALL_PASI = [pas1, pas2, pas3, pas4, pas5, pas6, pas7, pas8];

describe("What-if simulators", () => {
  it("fiecare pas are minim 1 simulator what-if", () => {
    ALL_PASI.forEach((pas, idx) => {
      const sims = pas.sections.filter((s) => s.type === "what-if");
      expect(sims.length, `Pas ${idx + 1} are simulator`).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Simulator validation per pas", () => {
    ALL_PASI.forEach((pas, idx) => {
      const sims = pas.sections.filter((s) => s.type === "what-if");
      sims.forEach((sim, simIdx) => {
        describe(`Pas ${idx + 1} sim[${simIdx}] - ${sim.id}`, () => {
          it("are min/max/step/defaultValue valid", () => {
            expect(sim.min).toBeDefined();
            expect(sim.max).toBeDefined();
            expect(sim.min).toBeLessThan(sim.max);
            expect(typeof sim.defaultValue).toBe("number");
            expect(sim.defaultValue).toBeGreaterThanOrEqual(sim.min);
            expect(sim.defaultValue).toBeLessThanOrEqual(sim.max);
          });

          it("are formula callable", () => {
            expect(typeof sim.formula).toBe("function");
          });

          it("formula returnează output cu unit valid", () => {
            const result = sim.formula({ value: sim.defaultValue });
            expect(result).toBeDefined();
            expect(result.output).toBeDefined();
            expect(result.unit).toBeDefined();
            expect(typeof result.unit).toBe("string");
          });

          it("formula NU aruncă erori pe min/max", () => {
            expect(() => sim.formula({ value: sim.min })).not.toThrow();
            expect(() => sim.formula({ value: sim.max })).not.toThrow();
          });

          it("output e numeric și non-NaN", () => {
            const result = sim.formula({ value: sim.defaultValue });
            expect(typeof result.output).toBe("number");
            expect(isNaN(result.output)).toBe(false);
            expect(isFinite(result.output)).toBe(true);
          });

          if (sim.presets) {
            it("toate preset-urile sunt în range", () => {
              sim.presets.forEach((p, pIdx) => {
                expect(p.value, `preset[${pIdx}] min`).toBeGreaterThanOrEqual(sim.min);
                expect(p.value, `preset[${pIdx}] max`).toBeLessThanOrEqual(sim.max);
              });
            });

            it("toate preset-urile dau output valid", () => {
              sim.presets.forEach((p, pIdx) => {
                const r = sim.formula({ value: p.value });
                expect(isNaN(r.output), `preset[${pIdx}] NaN`).toBe(false);
              });
            });
          }

          if (sim.baseline) {
            it("baseline are value + output + label", () => {
              expect(sim.baseline.value).toBeDefined();
              expect(sim.baseline.output).toBeDefined();
              expect(sim.baseline.label).toBeDefined();
            });
          }
        });
      });
    });
  });

  describe("Verificări specifice formule cunoscute", () => {
    it("Pas 1 - Simulator Au returnează EP scăzut când Au crește (1/Au)", () => {
      const sim = pas1.sections.find((s) => s.id === "what-if-au");
      const ep_small = sim.formula({ value: 80 }).output;
      const ep_large = sim.formula({ value: 250 }).output;
      expect(ep_small).toBeGreaterThan(ep_large); // EP scade când Au crește
    });

    it("Pas 2 - Simulator izolație: U scade cu grosime EPS", () => {
      const sim = pas2.sections.find((s) => s.id === "what-if-insulation");
      const u_zero = sim.formula({ value: 0 }).output;
      const u_15cm = sim.formula({ value: 15 }).output;
      expect(u_zero).toBeGreaterThan(u_15cm); // U scade cu izolație
      expect(u_15cm).toBeLessThan(0.35); // 15 cm atinge nZEB
    });

    it("Pas 3 - Simulator SCOP: EP scade când SCOP crește", () => {
      const sim = pas3.sections.find((s) => s.id === "what-if-scop");
      const ep_low_scop = sim.formula({ value: 2.0 }).output;
      const ep_high_scop = sim.formula({ value: 5.0 }).output;
      expect(ep_low_scop).toBeGreaterThan(ep_high_scop);
    });

    it("Pas 4 - Simulator PV: RER crește cu putere", () => {
      const sim = pas4.sections.find((s) => s.id === "what-if-pv");
      const rer_zero = sim.formula({ value: 0 }).output;
      const rer_5kwp = sim.formula({ value: 5 }).output;
      expect(rer_5kwp).toBeGreaterThan(rer_zero);
    });

    it("Pas 7 - Simulator NPV: scade când rata dobândă crește", () => {
      const sim = pas7.sections.find((s) => s.id === "what-if-npv");
      const npv_low = sim.formula({ value: 2 }).output;
      const npv_high = sim.formula({ value: 12 }).output;
      expect(npv_low).toBeGreaterThan(npv_high);
    });
  });
});
