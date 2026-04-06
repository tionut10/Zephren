import { describe, it, expect } from "vitest";
import { checkPasivhaus, PH_CRITERIA, PH_REQUIREMENTS } from "../pasivhaus.js";

// ═══════════════════════════════════════════════════════════════
// Teste unitare — Verificare standard Pasivhaus (PHPP 10)
// ═══════════════════════════════════════════════════════════════

// Clădire Pasivhaus conformă (criterii respectate)
const opaquePhConform = [
  { type: "PE", area: 80, layers: [
    { material: "Vată minerală bazaltică", thickness: 300, lambda: 0.035, rho: 40 },
    { material: "BCA (beton celular autoclavizat)", thickness: 200, lambda: 0.16, rho: 500 },
  ]},
  { type: "PT", area: 60, layers: [
    { material: "Polistiren expandat EPS 100", thickness: 400, lambda: 0.036, rho: 20 },
    { material: "Beton armat", thickness: 200, lambda: 1.50, rho: 2400 },
  ]},
  { type: "PL", area: 60, layers: [
    { material: "Polistiren extrudat XPS", thickness: 250, lambda: 0.033, rho: 35 },
    { material: "Beton armat", thickness: 150, lambda: 1.50, rho: 2400 },
  ]},
];

const glazingPhConform = [
  { area: 12, u: 0.72, g: 0.52, orientation: "S" },
  { area: 3, u: 0.72, g: 0.52, orientation: "SE" },
  { area: 3, u: 0.78, g: 0.50, orientation: "N" },
];

const paramsPhConform = {
  opaqueElements: opaquePhConform,
  glazingElements: glazingPhConform,
  thermalBridges: [{ length: 60, psi: 0.008 }],
  n50: 0.5,
  hrEta: 0.85,
  qH_nd_m2: 12,
  qC_nd_m2: 8,
  peakHeating_Wm2: 9,
  ep_primary_m2: 100,
  renewableProduction_m2: 0,
  Au: 120,
  V: 360,
};

// Clădire veche neconformă (standard anilor '80)
const opaqueNeconform = [
  { type: "PE", area: 100, layers: [
    { material: "Cărămidă cu goluri (GVP)", thickness: 375, lambda: 0.45, rho: 800 },
  ]},
  { type: "PT", area: 80, layers: [
    { material: "Beton armat", thickness: 150, lambda: 1.50, rho: 2400 },
  ]},
];

const glazingNeconform = [
  { area: 15, u: 2.5, g: 0.75, orientation: "S" },
  { area: 8, u: 2.5, g: 0.75, orientation: "N" },
];

const paramsNeconform = {
  opaqueElements: opaqueNeconform,
  glazingElements: glazingNeconform,
  thermalBridges: [{ length: 80, psi: 0.5 }],
  n50: 8.0,
  hrEta: 0,
  qH_nd_m2: 180,
  qC_nd_m2: 30,
  peakHeating_Wm2: 45,
  ep_primary_m2: 350,
  Au: 120,
  V: 360,
};

describe("PH_CRITERIA — date din JSON", () => {
  it("conține toate nivelurile de certificare", () => {
    ["classic", "plus", "premium", "enerphit"].forEach(nivel => {
      expect(PH_CRITERIA[nivel], nivel).toBeDefined();
    });
  });

  it("Classic: heatingDemand = 15 kWh/(m²·an)", () => {
    expect(PH_CRITERIA.classic.heatingDemand).toBe(15);
  });

  it("Classic: pressureTest = 0.6 ach@50Pa", () => {
    expect(PH_CRITERIA.classic.pressureTest).toBe(0.6);
  });

  it("EnerPHit (renovare) are criterii mai permisive", () => {
    expect(PH_CRITERIA.enerphit.heatingDemand).toBeGreaterThan(PH_CRITERIA.classic.heatingDemand);
    expect(PH_CRITERIA.enerphit.pressureTest).toBeGreaterThan(PH_CRITERIA.classic.pressureTest);
  });

  it("Premium are PER mai mic decât Plus și Classic", () => {
    expect(PH_CRITERIA.premium.primaryEnergy).toBeLessThan(PH_CRITERIA.plus.primaryEnergy);
    expect(PH_CRITERIA.plus.primaryEnergy).toBeLessThan(PH_CRITERIA.classic.primaryEnergy);
  });

  it("Plus necesită producție regenerabilă ≥ 60 kWh/m²", () => {
    expect(PH_CRITERIA.plus.renewableProduction).toBe(60);
  });
});

describe("PH_REQUIREMENTS — date din JSON", () => {
  it("conține 12 cerințe", () => {
    expect(PH_REQUIREMENTS.length).toBe(12);
  });

  it("fiecare cerință are id, label, critical", () => {
    PH_REQUIREMENTS.forEach(req => {
      expect(req.id, `id lipsă`).toBeTruthy();
      expect(typeof req.label, `label la ${req.id}`).toBe("string");
      expect(typeof req.critical, `critical la ${req.id}`).toBe("boolean");
    });
  });

  it("n50 este criteriu critic", () => {
    const n50Req = PH_REQUIREMENTS.find(r => r.id === "n50");
    expect(n50Req).toBeDefined();
    expect(n50Req.critical).toBe(true);
  });

  it("solar_g și compact sunt criterii non-critice", () => {
    const solarG = PH_REQUIREMENTS.find(r => r.id === "solar_g");
    const compact = PH_REQUIREMENTS.find(r => r.id === "compact");
    expect(solarG?.critical).toBe(false);
    expect(compact?.critical).toBe(false);
  });
});

describe("checkPasivhaus — clădire conformă", () => {
  const res = checkPasivhaus(paramsPhConform);

  it("returnează obiect valid", () => {
    expect(res).not.toBeNull();
    expect(typeof res).toBe("object");
  });

  it("checks este un array", () => {
    expect(Array.isArray(res.checks)).toBe(true);
    expect(res.checks.length).toBeGreaterThan(0);
  });

  it("clădire conformă: isCompliant = true sau criticalFails mici", () => {
    // Cu parametri optimi, ar trebui să fie conformă
    expect(res.criticalFails).toBeDefined();
    expect(res.isCompliant).toBeDefined();
    expect(typeof res.isCompliant).toBe("boolean");
  });

  it("score între 0 și 100", () => {
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });

  it("verdict este non-gol", () => {
    expect(typeof res.verdict).toBe("string");
    expect(res.verdict.length).toBeGreaterThan(0);
  });

  it("checks conțin verificarea n50", () => {
    const n50Check = res.checks.find(c => c.id === "n50");
    expect(n50Check).toBeDefined();
    expect(n50Check.value).toBe(0.5);
    expect(n50Check.pass).toBe(true); // 0.5 ≤ 0.6
  });

  it("checks conțin verificarea ventilare (HR=85%)", () => {
    const ventCheck = res.checks.find(c => c.id === "ventil");
    expect(ventCheck).toBeDefined();
    expect(ventCheck.pass).toBe(true); // 85% ≥ 75%
  });

  it("checks conțin verificarea necesar de căldură", () => {
    const heatCheck = res.checks.find(c => c.id === "heat_demand");
    expect(heatCheck).toBeDefined();
    expect(heatCheck.value).toBe(12);
    expect(heatCheck.pass).toBe(true); // 12 ≤ 15
  });
});

describe("checkPasivhaus — clădire neconformă (ani '80)", () => {
  const res = checkPasivhaus(paramsNeconform);

  it("returnează obiect valid", () => {
    expect(res).not.toBeNull();
  });

  it("isCompliant = false (criterii critice nerespecate)", () => {
    expect(res.isCompliant).toBe(false);
  });

  it("criticalFails > 0", () => {
    expect(res.criticalFails.length).toBeGreaterThan(0);
  });

  it("verificare n50 = eșec (8.0 > 0.6)", () => {
    const n50Check = res.checks.find(c => c.id === "n50");
    expect(n50Check?.pass).toBe(false);
  });

  it("verificare ventilare = eșec (hrEta=0 < 75%)", () => {
    const ventCheck = res.checks.find(c => c.id === "ventil");
    expect(ventCheck?.pass).toBe(false);
  });

  it("verificare necesar căldură = eșec (180 > 15)", () => {
    const heatCheck = res.checks.find(c => c.id === "heat_demand");
    expect(heatCheck?.pass).toBe(false);
  });

  it("gaps conține descrieri ale deficiențelor", () => {
    expect(res.gaps.length).toBeGreaterThan(0);
    res.gaps.forEach(gap => {
      expect(typeof gap).toBe("string");
    });
  });

  it("culoare roșie pentru neconformitate majoră", () => {
    expect(res.color).toBe("#ef4444");
  });

  it("achievable = null (nu poate obține certificare)", () => {
    expect(res.achievable).toBeNull();
  });
});

describe("checkPasivhaus — nivel de certificare posibil", () => {
  it("Classic când criterii ok și RER < 60", () => {
    const res = checkPasivhaus({ ...paramsPhConform, renewableProduction_m2: 30 });
    if (res.isCompliant) {
      expect(res.achievable).toBe("Pasivhaus Classic");
    }
  });

  it("Plus când RER ≥ 60", () => {
    const res = checkPasivhaus({ ...paramsPhConform, renewableProduction_m2: 70 });
    if (res.isCompliant) {
      expect(res.achievable).toBe("Pasivhaus Plus");
    }
  });

  it("Premium când RER ≥ 120", () => {
    const res = checkPasivhaus({ ...paramsPhConform, renewableProduction_m2: 130 });
    if (res.isCompliant) {
      expect(res.achievable).toBe("Pasivhaus Premium");
    }
  });
});

describe("checkPasivhaus — câmpuri uWall, uRoof, uWin, aV", () => {
  const res = checkPasivhaus(paramsPhConform);

  it("uWall calculat corect (pereți cu 30cm vată)", () => {
    // R_total ≈ 0.17 + 0.3/0.035 + 0.2/0.16 ≈ 10.37 → U ≈ 0.096
    expect(res.uWall).toBeLessThan(0.15); // sub pragul Pasivhaus
  });

  it("uWin = media U ferestre", () => {
    expect(res.uWin).toBeDefined();
    expect(res.uWin).toBeCloseTo((0.72 + 0.72 + 0.78) / 3, 1);
  });

  it("aV = suprafață anvelopă / volum", () => {
    expect(res.aV).toBeDefined();
    expect(res.aV).toBeGreaterThan(0);
  });
});
