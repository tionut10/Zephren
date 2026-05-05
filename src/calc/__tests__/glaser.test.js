import { describe, it, expect } from "vitest";
import { glaserCheck, pSatMagnus, calcGlaserMonthly } from "../glaser.js";
import CLIMATE_DB from "../../data/climate.json";

const bucuresti = CLIMATE_DB.find(c => c.name === "București");

// ═══════════════════════════════════════════════════════════════
// pSatMagnus — presiune de saturație a vaporilor de apă
// ═══════════════════════════════════════════════════════════════

describe("pSatMagnus", () => {
  it("returnează ~2338 Pa la 20°C", () => {
    const ps = pSatMagnus(20);
    // Valoarea tabelată: ~2338 Pa la 20°C
    expect(ps).toBeGreaterThan(2300);
    expect(ps).toBeLessThan(2400);
  });

  it("returnează ~611 Pa la 0°C", () => {
    const ps = pSatMagnus(0);
    expect(ps).toBeCloseTo(610.5, 0);
  });

  it("crește cu temperatura", () => {
    expect(pSatMagnus(30)).toBeGreaterThan(pSatMagnus(20));
    expect(pSatMagnus(20)).toBeGreaterThan(pSatMagnus(10));
    expect(pSatMagnus(10)).toBeGreaterThan(pSatMagnus(0));
  });

  it("funcționează pentru temperaturi negative", () => {
    const ps = pSatMagnus(-10);
    expect(ps).toBeGreaterThan(0);
    expect(ps).toBeLessThan(pSatMagnus(0));
  });

  it("folosește formula corectă pentru temp >= 0 vs temp < 0", () => {
    // La 0°C ambele formule dau 610.5
    const ps0 = pSatMagnus(0);
    expect(ps0).toBeCloseTo(610.5, 1);
    // La -1°C formula cu 21.875 / 265.5
    const psNeg = pSatMagnus(-1);
    const expected = 610.5 * Math.exp(21.875 * (-1) / (265.5 + (-1)));
    expect(psNeg).toBeCloseTo(expected, 5);
  });
});

// ═══════════════════════════════════════════════════════════════
// glaserCheck — verificare punctuală condens
// ═══════════════════════════════════════════════════════════════

describe("glaserCheck", () => {
  // Convenție Zephren: EXT→INT (layers[0] = exterior). Funcția inversează intern la ISO 13788 INT→EXT.
  const simpleBrickWall = [
    { thickness: 5, lambda: 0.70, mu: 10 },     // tencuială exterioară (EXT, layers[0])
    { thickness: 100, lambda: 0.036, mu: 50 },  // EPS 100mm
    { thickness: 300, lambda: 0.22, mu: 6 },    // BCA 300mm
    { thickness: 15, lambda: 0.87, mu: 10 },    // tencuială interioară (INT, layers[3])
  ];

  it("returnează rezultat valid pentru perete simplu", () => {
    const r = glaserCheck(simpleBrickWall, 20, -15, 0.55, 0.80);
    expect(r).not.toBeNull();
    expect(r.results).toBeDefined();
    expect(r.results.length).toBeGreaterThan(0);
    expect(typeof r.hasCondensation).toBe("boolean");
  });

  it("returnează null pentru straturi goale", () => {
    expect(glaserCheck([], 20, -15)).toBeNull();
    expect(glaserCheck(null, 20, -15)).toBeNull();
  });

  it("fiecare interfață are temp, pv și ps", () => {
    const r = glaserCheck(simpleBrickWall, 20, -15);
    for (const iface of r.results) {
      expect(typeof iface.temp).toBe("number");
      expect(typeof iface.pv).toBe("number");
      expect(typeof iface.ps).toBe("number");
      expect(typeof iface.condensing).toBe("boolean");
    }
  });

  it("temperaturile descresc de la interior la exterior", () => {
    const r = glaserCheck(simpleBrickWall, 20, -15);
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i].temp).toBeLessThanOrEqual(r.results[i - 1].temp);
    }
  });

  it("perete bine izolat cu EPS gros nu condensează", () => {
    // EXT→INT: tencuiala ext | EPS | BCA | tencuiala int
    const wellInsulated = [
      { thickness: 5, lambda: 0.70, mu: 10 },
      { thickness: 200, lambda: 0.036, mu: 50 },   // EPS 200mm — foarte gros (ext)
      { thickness: 250, lambda: 0.22, mu: 6 },     // BCA 250mm
      { thickness: 15, lambda: 0.87, mu: 10 },
    ];
    const r = glaserCheck(wellInsulated, 20, -5, 0.50, 0.80);
    // La -5°C cu izolație groasă, nu ar trebui să fie condens
    expect(r.hasCondensation).toBe(false);
  });

  it("gc (cantitate condens) este >= 0", () => {
    const r = glaserCheck(simpleBrickWall, 20, -15);
    expect(r.gc).toBeGreaterThanOrEqual(0);
  });

  // Fix audit 24 apr 2026 — pSat în glaserCheck trebuie bifurcat over-water/over-ice
  it("pSat over-ice: temperaturi negative dau presiuni de saturație mai mici ca formula over-water", () => {
    // La -15°C:
    //   over-water (vechea formulă): 611.2 × exp(17.67·-15/(-15+243.5)) ≈ 191.5 Pa
    //   over-ice   (noua formulă):   610.5 × exp(21.875·-15/(265.5-15)) ≈ 164.5 Pa
    // Diferența ~15% — afecta direct detectarea condensului pe suprafețe exterioare iarna
    const psInternal = glaserCheck(simpleBrickWall, 20, -15, 0.55, 0.80);
    expect(psInternal.results).toBeDefined();
    // Ultima interfață este exteriorul la -15°C
    const extInterface = psInternal.results[psInternal.results.length - 1];
    // ps_saturation la -15°C (over-ice) trebuie să fie ~164 Pa, nu 191 Pa
    expect(extInterface.ps).toBeGreaterThan(150);
    expect(extInterface.ps).toBeLessThan(175);
  });

  it("folosește valori implicite pentru parametrii lipsă", () => {
    // Nu furnizăm theta_int, theta_ext, phi_int, phi_ext
    const r = glaserCheck(simpleBrickWall);
    expect(r).not.toBeNull();
    // Valorile implicite: tInt=20, tExt=-15, phiI=0.55, phiE=0.80
    expect(r.results[0].temp).toBeCloseTo(20, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcGlaserMonthly — verificare Glaser lunară conform ISO 13788
// ═══════════════════════════════════════════════════════════════

describe("calcGlaserMonthly", () => {
  // Convenție Zephren: EXT→INT — tencuiala ext | EPS | BCA | tencuiala int
  const wall = [
    { thickness: 5, lambda: 0.70, mu: 10 },     // tencuiala exterioară (EXT)
    { thickness: 100, lambda: 0.036, mu: 50 },  // EPS 100mm
    { thickness: 300, lambda: 0.22, mu: 6 },    // BCA 300mm
    { thickness: 15, lambda: 0.87, mu: 10 },    // tencuiala interioară (INT)
  ];

  it("returnează 12 rezultate lunare", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    expect(r).not.toBeNull();
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[0].month).toBe("Ian");
    expect(r.monthly[11].month).toBe("Dec");
  });

  it("conține verdictul annual (OK sau NECONFORM)", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    expect(["OK — condensul se evaporă complet", "NECONFORM — acumulare reziduală de umiditate"])
      .toContain(r.verdict);
  });

  it("winterAccum și summerEvap sunt calculate", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    expect(typeof r.winterAccum).toBe("number");
    expect(typeof r.summerEvap).toBe("number");
    expect(typeof r.annualOk).toBe("boolean");
  });

  it("annualOk = true când summerEvap >= winterAccum", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    if (r.annualOk) {
      expect(r.summerEvap).toBeGreaterThanOrEqual(r.winterAccum);
    } else {
      expect(r.summerEvap).toBeLessThan(r.winterAccum);
    }
  });

  it("cumulativul nu scade sub 0", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    for (const m of r.monthly) {
      expect(m.cumulative).toBeGreaterThanOrEqual(0);
    }
  });

  it("returnează null fără straturi sau climă", () => {
    expect(calcGlaserMonthly(null, bucuresti, 20, 50)).toBeNull();
    expect(calcGlaserMonthly([], bucuresti, 20, 50)).toBeNull();
    expect(calcGlaserMonthly(wall, null, 20, 50)).toBeNull();
  });

  it("conține informații despre straturi", () => {
    const r = calcGlaserMonthly(wall, bucuresti, 20, 50);
    expect(r.layers).toHaveLength(4);
    // calcGlaserMonthly inversează EXT→INT la INT→EXT (ISO 13788 §4.2)
    // wall[3]=5mm ajunge la layers[0] (INT), wall[0]=15mm la layers[3] (EXT)
    expect(r.layers[0].d).toBeCloseTo(0.005, 3);  // INT: 5mm
    expect(r.layers[3].d).toBeCloseTo(0.015, 3);  // EXT: 15mm
    expect(r.layers[1].sd).toBeCloseTo(50 * 0.1, 3); // mu=50, d=0.1m (wall[2] → layers[1])
  });
});
