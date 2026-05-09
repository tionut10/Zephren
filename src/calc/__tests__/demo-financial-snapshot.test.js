/**
 * demo-financial-snapshot.test.js — Sprint Îmbunătățiri #5 (9 mai 2026)
 *
 * Snapshot regression pentru sumarul financiar al demo-urilor M1-M5.
 *
 * Pe fiecare demo, aplicăm un PACHET STANDARD de reabilitare (anvelopă completă +
 * HP + PV) și comparăm sumarul financiar cu snapshot-ul anterior. Orice modificare
 * de prețuri în rehab-prices.js sau de logică în unified-rehab-costs va apărea
 * imediat ca diff vizibil — nu mai trece silent.
 *
 * STRATEGIE:
 *   - Pachet standard fix (același pentru toate demo-urile) ca să izolăm efectul
 *     prețurilor de variațiile geometriei clădirii.
 *   - Suprafețele provin din `demo.building.areaUseful` real
 *   - Snapshot conține: totalEUR, totalRON, totalWithTvaRON, ronPerM2, breakdown măsuri
 *
 * RULARE:
 *   - Primul rulat creează __snapshots__/demo-financial-snapshot.test.js.snap
 *   - Rulările următoare COMPARĂ și eșuează la diff > 0
 *   - Pentru actualizare deliberată: `npm run test -- -u`
 */

import { describe, it, expect } from "vitest";
import { DEMO_PROJECTS } from "../../data/demoProjects.js";
import { buildCanonicalMeasures, buildFinancialSummary } from "../unified-rehab-costs.js";
import { calcBenchmarkInvestmentRON } from "../cost-outlier-detector.js";

// Pachet standard aplicat pe fiecare demo pentru izolare efect prețuri
const STANDARD_PACKAGE = {
  addInsulWall: true,
  insulWallThickness: 10,
  addInsulRoof: true,
  insulRoofThickness: 15,
  replaceWindows: true,
  newWindowU: 1.10,
  addHP: true,
  hpCOP: 4.0,
  hpPower: 8,
  addPV: true,
  pvArea: 25,
};

// Curs EUR/RON FIXED pentru reproductibilitate snapshot (fallback canonic 5.10).
// Cursul live BNR variază — folosim fallback ca să avem snapshot-uri stabile.
const FIXED_EUR_RON = 5.10;

// Geometrie standard derivată din areaUseful (proxy realistic):
//   - pereți exteriori = 1.5 × Au (factor tipic case 1 etaj / apartamente)
//   - acoperiș = 1.0 × Au
//   - ferestre = 0.15 × Au
function buildOpaqueElements(Au) {
  return [
    { type: "PE", area: String(Math.round(Au * 1.5)) },
    { type: "PP", area: String(Math.round(Au * 1.0)) },
  ];
}

function buildGlazingElements(Au) {
  return [
    { area: String(Math.round(Au * 0.15)) },
  ];
}

describe("Sprint Îmbunătățiri #5 — Demo M1-M5 financial snapshot regression", () => {
  // Test pentru fiecare demo — snapshot diferențiat
  DEMO_PROJECTS.forEach((demo, idx) => {
    const M = `M${idx + 1}`;
    const Au = parseFloat(demo.building?.areaUseful) || 0;
    const category = demo.building?.category || "—";

    describe(`${M} — ${demo.building?.city || "?"} (${category}, ${Au} m²)`, () => {
      it(`financial summary cu pachet standard (canonical via unified-rehab-costs)`, () => {
        const measures = buildCanonicalMeasures(
          STANDARD_PACKAGE,
          buildOpaqueElements(Au),
          buildGlazingElements(Au),
          { eurRon: FIXED_EUR_RON }
        );
        const fin = buildFinancialSummary(measures, {
          eurRon: FIXED_EUR_RON,
          qfSavedKwh: 100 * Au,           // 100 kWh/m²·an saving (mediu pentru calcul payback)
          energyPriceEURperKwh: 0.13,     // fixed pentru snapshot
          tvaRate: 0.21,
        });

        // Snapshot stabil — folosim doar valori rotunjite agregate
        const snapshot = {
          M,
          city: demo.building?.city,
          category,
          areaUseful: Au,
          measuresCount: measures.length,
          totalEUR: fin.totalEUR,
          totalRON: fin.totalRON,
          totalWithTvaRON: fin.totalWithTvaRON,
          ronPerM2: Au > 0 ? Math.round(fin.totalRON / Au) : 0,
          paybackYears: fin.paybackYears,
          measureIds: measures.map(m => m.id).sort(),
        };
        expect(snapshot).toMatchSnapshot();
      });

      it(`benchmark investiție (calcBenchmarkInvestmentRON pe Au real)`, () => {
        const benchmark = calcBenchmarkInvestmentRON(Au, { eurRon: FIXED_EUR_RON });
        const snapshot = {
          M,
          areaUseful: Au,
          benchmarkLow: benchmark.low,
          benchmarkMid: benchmark.mid,
          benchmarkHigh: benchmark.high,
          ronPerM2Low:  Au > 0 ? Math.round(benchmark.low / Au) : 0,
          ronPerM2Mid:  Au > 0 ? Math.round(benchmark.mid / Au) : 0,
          ronPerM2High: Au > 0 ? Math.round(benchmark.high / Au) : 0,
          // breakdown pe categorii (pentru diff fin la modificare prețuri categorie)
          breakdownMid: benchmark.breakdown.mid,
        };
        expect(snapshot).toMatchSnapshot();
      });
    });
  });

  describe("Sumar agregat M1-M5", () => {
    it("toate cele 5 demo-uri produc financial summary fără crash", () => {
      const results = DEMO_PROJECTS.map((demo, idx) => {
        const Au = parseFloat(demo.building?.areaUseful) || 0;
        const measures = buildCanonicalMeasures(
          STANDARD_PACKAGE,
          buildOpaqueElements(Au),
          buildGlazingElements(Au),
          { eurRon: FIXED_EUR_RON }
        );
        const fin = buildFinancialSummary(measures, { eurRon: FIXED_EUR_RON });
        return { M: `M${idx + 1}`, totalRON: fin.totalRON };
      });
      // Toate trebuie să producă valori pozitive
      results.forEach(r => {
        expect(r.totalRON).toBeGreaterThan(0);
      });
      // Snapshot pentru sumar — diff la regresie globală
      expect(results).toMatchSnapshot();
    });
  });
});
