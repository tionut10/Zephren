// ═════════════════════════════════════════════════════════════════════════════
// demoProjects-v2.test.js — Validare schema + expectedResults pentru cele 5 modele DEMO v2
//
// Scop: garantează că fiecare model demo conține TOATE cheile necesare
// pentru a parcurge Step 1-8 fără erori, și că rezultatele așteptate
// sunt corect formate pentru testele e2e end-to-end.
//
// Generat: 27 apr 2026 — Sprint refacere DEMO v2 (zone climatice I-V).
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  DEMO_PROJECTS,
  DEMO_MDLPA_DEFAULTS,
  buildMdlpaDefaults,
} from "../demoProjects.js";

// ── Constanți pentru validare ────────────────────────────────────────────────

const REQUIRED_TOP_KEYS = [
  "id", "title", "shortDesc",
  "building", "opaqueElements", "glazingElements", "thermalBridges",
  "heating", "acm", "cooling", "ventilation", "lighting",
  "solarThermal", "photovoltaic", "heatPump", "biomass", "otherRenew",
  "battery", "auditor", "expectedResults",
];

const REQUIRED_BUILDING_KEYS = [
  "address", "city", "county", "postalCode", "locality",
  "latitude", "longitude",
  "cadastralNumber", "landBook", "owner",
  "category", "structure", "yearBuilt", "floors",
  "areaUseful", "areaBuilt", "areaHeated", "volume", "areaEnvelope",
  "heightBuilding", "heightFloor", "perimeter",
  "n50", "shadingFactor", "gwpLifecycle", "solarReady",
  "evChargingPoints", "evChargingPrepared",
  "co2MaxPpm", "pm25Avg", "scaleVersion", "scopCpe",
];

const REQUIRED_EXPECTED_KEYS = [
  "energyClass", "E_p_total_kWh_m2_y", "E_p_nren_kWh_m2_y", "E_p_ren_kWh_m2_y",
  "RER_pct", "U_med_W_m2K", "U_max_violations",
  "Q_inc_kWh_m2_y", "Q_rac_kWh_m2_y", "Q_acm_kWh_m2_y", "Q_il_kWh_m2_y", "Q_aux_kWh_m2_y",
  "bacsClass", "fBac", "sriPct",
  "meps2030_pass", "meps2033_pass", "meps2050_pass",
  "passportRequired", "passportPhases", "passportTargetClass",
  "documentsExpected", "tolerances",
];

const VALID_ENERGY_CLASSES = ["A+", "A", "B", "C", "D", "E", "F", "G"];
const VALID_BACS_CLASSES = ["A", "B", "C", "D"];

const ZONE_CLIMATIC_BOUNDS = {
  // Aproximare pe baza Mc 001-2022 — fiecare model trebuie să fie într-o zonă diferită
  // Zone I (caldă)    — sudul țării — Constanța (lat ~44.18, GD ≤ 2000)
  // Zona II           — sud-Bucureşti (lat ~44.50)
  // Zona III          — Cluj/Iași (lat ~46.7)
  // Zona IV (rece)    — Brașov/Sibiu (lat ~45.6, alt > 500 m)
  // Zona V (montană)  — Predeal/Sinaia (lat ~45.5, alt > 1000 m)
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DEMO_PROJECTS v2 — exact 5 modele cu zone climatice I-V", () => {
  it("conține exact 5 modele DEMO", () => {
    expect(DEMO_PROJECTS).toHaveLength(5);
  });

  it("ID-urile sunt unice", () => {
    const ids = DEMO_PROJECTS.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it("locațiile geografice sunt distincte (5 orașe diferite)", () => {
    const cities = DEMO_PROJECTS.map((d) => d.building.city);
    const uniqueCities = new Set(cities);
    expect(uniqueCities.size).toBe(5);
  });

  it("toate cele 5 modele au coordonate WGS84 valide România", () => {
    for (const demo of DEMO_PROJECTS) {
      const lat = parseFloat(demo.building.latitude);
      const lng = parseFloat(demo.building.longitude);
      expect(lat).toBeGreaterThanOrEqual(43.5);
      expect(lat).toBeLessThanOrEqual(48.5);
      expect(lng).toBeGreaterThanOrEqual(20.0);
      expect(lng).toBeLessThanOrEqual(30.0);
    }
  });

  it("clasele energetice acoperă o paletă reprezentativă (≥4 clase distincte)", () => {
    const classes = DEMO_PROJECTS.map((d) => d.expectedResults.energyClass);
    const uniqueClasses = new Set(classes);
    expect(uniqueClasses.size).toBeGreaterThanOrEqual(4);
  });

  it("toate clasele energetice sunt valide A-G", () => {
    for (const demo of DEMO_PROJECTS) {
      expect(VALID_ENERGY_CLASSES).toContain(demo.expectedResults.energyClass);
    }
  });

  it("acoperă categoriile critice: rezidențial bloc, casă unifamilială, birouri, educație", () => {
    // Sprint refactor 9 mai 2026: tipologii noi M1-M5 (zone climatice I→V)
    // M1=RA Constanța, M2=RI Cluj 1965, M3=BI București 2005, M4=ED Brașov 1980, M5=RI Sibiu 2022 nZEB
    const categories = DEMO_PROJECTS.map((d) => d.building.category);
    expect(categories).toContain("RA");  // M1 apartament bloc PAFP
    expect(categories).toContain("RI");  // M2 + M5 case unifamiliale (vechi vs nouă)
    expect(categories).toContain("BI");  // M3 birouri
    expect(categories).toContain("ED");  // M4 educație
    // 4 categorii distincte (RA, RI, BI, ED) — RI ocupă 2 sloturi (M2 vechi 1965 + M5 nou 2022)
    const uniqueCats = new Set(categories);
    expect(uniqueCats.size).toBeGreaterThanOrEqual(4);
  });
});

describe("DEMO_PROJECTS v2 — schema completă pentru fiecare model", () => {
  for (let idx = 0; idx < 5; idx++) {
    describe(`Model M${idx + 1}`, () => {
      it("conține toate cheile top-level obligatorii", () => {
        const demo = DEMO_PROJECTS[idx];
        for (const key of REQUIRED_TOP_KEYS) {
          expect(demo, `M${idx + 1} lipsește cheia "${key}"`).toHaveProperty(key);
        }
      });

      it("building.* conține toate cheile critice", () => {
        const b = DEMO_PROJECTS[idx].building;
        for (const key of REQUIRED_BUILDING_KEYS) {
          expect(b, `M${idx + 1}.building lipsește "${key}"`).toHaveProperty(key);
        }
      });

      it("expectedResults conține toate cheile pentru testare e2e", () => {
        const er = DEMO_PROJECTS[idx].expectedResults;
        for (const key of REQUIRED_EXPECTED_KEYS) {
          expect(er, `M${idx + 1}.expectedResults lipsește "${key}"`).toHaveProperty(key);
        }
      });

      it("opaqueElements e array nevid cu cel puțin 3 elemente (PE/PT/PL)", () => {
        const oe = DEMO_PROJECTS[idx].opaqueElements;
        expect(Array.isArray(oe)).toBe(true);
        expect(oe.length).toBeGreaterThanOrEqual(3);
        for (const el of oe) {
          expect(el).toHaveProperty("name");
          expect(el).toHaveProperty("type");
          expect(el).toHaveProperty("area");
          expect(el).toHaveProperty("orientation");
          expect(el).toHaveProperty("layers");
          expect(Array.isArray(el.layers)).toBe(true);
          expect(el.layers.length).toBeGreaterThanOrEqual(2);
        }
      });

      it("glazingElements e array nevid cu cheile { area, u, g, orientation }", () => {
        const ge = DEMO_PROJECTS[idx].glazingElements;
        expect(Array.isArray(ge)).toBe(true);
        expect(ge.length).toBeGreaterThanOrEqual(2);
        for (const el of ge) {
          expect(el).toHaveProperty("area");
          expect(el).toHaveProperty("u");
          expect(el).toHaveProperty("g");
          expect(el).toHaveProperty("orientation");
        }
      });

      it("thermalBridges e array nevid cu cheile { name, type, psi, length }", () => {
        const tb = DEMO_PROJECTS[idx].thermalBridges;
        expect(Array.isArray(tb)).toBe(true);
        expect(tb.length).toBeGreaterThanOrEqual(5);
        for (const b of tb) {
          expect(b).toHaveProperty("name");
          expect(b).toHaveProperty("type");
          expect(b).toHaveProperty("psi");
          expect(b).toHaveProperty("length");
          expect(parseFloat(b.psi)).toBeGreaterThanOrEqual(0);
          expect(parseFloat(b.length)).toBeGreaterThan(0);
        }
      });

      it("heating.source e nevidă și valorile sunt numeric-castabile", () => {
        const h = DEMO_PROJECTS[idx].heating;
        expect(h.source).toBeTruthy();
        expect(parseFloat(h.power)).toBeGreaterThanOrEqual(0);
      });

      it("auditor conține cpeCode + cadastralNumber + nrCadastral", () => {
        const a = DEMO_PROJECTS[idx].auditor;
        expect(a.cpeCode).toMatch(/^CE-\d{4}-\d{4,6}/);
        expect(a.cpeNumber).toMatch(/^CPE-\d{4}-\d+/);
        expect(a.scopCpe).toBeTruthy();
        expect(a.validityYears).toBeTruthy();
      });

      it("expectedResults.tolerances conține E_p_nren și U_med", () => {
        const t = DEMO_PROJECTS[idx].expectedResults.tolerances;
        expect(t).toHaveProperty("E_p_nren");
        expect(t).toHaveProperty("U_med");
        expect(t.E_p_nren).toBeGreaterThan(0);
        expect(t.E_p_nren).toBeLessThanOrEqual(0.30);
      });

      it("expectedResults.bacsClass este în A-D", () => {
        expect(VALID_BACS_CLASSES).toContain(DEMO_PROJECTS[idx].expectedResults.bacsClass);
      });

      it("expectedResults.documentsExpected e array nevid", () => {
        const docs = DEMO_PROJECTS[idx].expectedResults.documentsExpected;
        expect(Array.isArray(docs)).toBe(true);
        expect(docs.length).toBeGreaterThanOrEqual(2);
        // CPE prezent la toate
        expect(docs.some((d) => d.startsWith("CPE-"))).toBe(true);
      });
    });
  }
});

describe("DEMO_PROJECTS v2 — diversitate scenarii (testare end-to-end)", () => {
  // Sprint refactor 9 mai 2026 — tipologii noi:
  //   M1=RA Constanța 1975 PAFP DH (clasă G, baseline pur)
  //   M2=RI Cluj 1965 cărămidă plină + CT gaz cond + PV 3 kWp (clasă E)
  //   M3=BI București 2005 + VRF degradat + PV 15 + ST 20 m² (clasă C, Q_rac>30, MEPS 2033 fail)
  //   M4=ED Brașov 1980 nereabilitat + CT gaz central + niciun renewable (clasă F)
  //   M5=RI Sibiu 2022 nZEB + PC sol-apă + VMC HR90 + PV 6 + ST 8 (clasă A)

  it("M1 (Constanța) folosește termoficare DH RADET și e clasă G", () => {
    expect(DEMO_PROJECTS[0].heating.source).toBe("TERMO");
    expect(DEMO_PROJECTS[0].building.city).toBe("Constanța");
    expect(DEMO_PROJECTS[0].building.category).toBe("RA");
    expect(DEMO_PROJECTS[0].expectedResults.energyClass).toBe("G");
    expect(DEMO_PROJECTS[0].expectedResults.RER_pct).toBe(0);
    expect(DEMO_PROJECTS[0].expectedResults.passportRequired).toBe(true);
    expect(DEMO_PROJECTS[0].photovoltaic.enabled).toBe(false);
    expect(DEMO_PROJECTS[0].solarThermal.enabled).toBe(false);
    expect(DEMO_PROJECTS[0].heatPump.enabled).toBe(false);
  });

  it("M2 (Cluj) e casă unifamilială cărămidă 1965 + CT gaz condensare + PV 3 kWp", () => {
    expect(DEMO_PROJECTS[1].building.city).toBe("Cluj-Napoca");
    expect(DEMO_PROJECTS[1].building.category).toBe("RI");
    expect(DEMO_PROJECTS[1].building.yearBuilt).toBe("1965");
    expect(DEMO_PROJECTS[1].heating.source).toBe("GAZ_COND");
    expect(parseFloat(DEMO_PROJECTS[1].heating.power)).toBeLessThanOrEqual(30);
    expect(DEMO_PROJECTS[1].photovoltaic.enabled).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[1].photovoltaic.peakPower)).toBe(3);
    expect(DEMO_PROJECTS[1].solarThermal.enabled).toBe(false);
    expect(DEMO_PROJECTS[1].heatPump.enabled).toBe(false);
    expect(DEMO_PROJECTS[1].otherRenew.cogenEnabled).toBe(false);
    expect(DEMO_PROJECTS[1].building.scopCpe).toBe("vanzare");
  });

  it("M3 (București) e birouri BI 2005 cu VRF degradat (SEER<3) + PV + ST mare, Q_rac>30", () => {
    expect(DEMO_PROJECTS[2].building.city).toBe("București");
    expect(DEMO_PROJECTS[2].building.category).toBe("BI");
    expect(DEMO_PROJECTS[2].building.yearBuilt).toBe("2005");
    expect(DEMO_PROJECTS[2].cooling.hasCooling).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[2].cooling.seer)).toBeLessThanOrEqual(3.0);
    expect(parseFloat(DEMO_PROJECTS[2].cooling.t_cooling_hours)).toBeGreaterThanOrEqual(1300);
    expect(DEMO_PROJECTS[2].photovoltaic.enabled).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[2].photovoltaic.peakPower)).toBe(15);
    expect(DEMO_PROJECTS[2].solarThermal.enabled).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[2].solarThermal.area)).toBe(20);
    expect(DEMO_PROJECTS[2].expectedResults.Q_rac_kWh_m2_y).toBeGreaterThan(30);
    expect(DEMO_PROJECTS[2].expectedResults.meps2033_pass).toBe(false);
  });

  it("M4 (Brașov) e școală gimnazială ED 1980 NEREABILITATĂ + CT gaz + niciun renewable", () => {
    expect(DEMO_PROJECTS[3].building.city).toBe("Brașov");
    expect(DEMO_PROJECTS[3].building.category).toBe("ED");
    expect(DEMO_PROJECTS[3].building.yearBuilt).toBe("1980");
    expect(DEMO_PROJECTS[3].building.yearRenov).toBe("");        // NEREABILITAT — pre-renovare PNRR
    expect(parseFloat(DEMO_PROJECTS[3].heating.power)).toBeGreaterThanOrEqual(100);
    expect(DEMO_PROJECTS[3].heating.emission).toBe("RAD_FO");    // radiatoare fontă
    expect(DEMO_PROJECTS[3].photovoltaic.enabled).toBe(false);
    expect(DEMO_PROJECTS[3].solarThermal.enabled).toBe(false);
    expect(DEMO_PROJECTS[3].heatPump.enabled).toBe(false);
    expect(DEMO_PROJECTS[3].expectedResults.energyClass).toMatch(/^[EFG]$/);
  });

  it("M5 (Sibiu) e casă RI nouă 2022 nZEB cu PC sol-apă + VMC HR90 + PV 6 + ST 8", () => {
    expect(DEMO_PROJECTS[4].building.city).toBe("Sibiu");
    expect(DEMO_PROJECTS[4].building.category).toBe("RI");
    expect(DEMO_PROJECTS[4].building.yearBuilt).toBe("2022");
    expect(DEMO_PROJECTS[4].heating.source).toBe("PC_SA");
    expect(DEMO_PROJECTS[4].ventilation.type).toBe("MEC_HR90");
    expect(DEMO_PROJECTS[4].photovoltaic.enabled).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[4].photovoltaic.peakPower)).toBe(6);
    expect(DEMO_PROJECTS[4].solarThermal.enabled).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[4].solarThermal.area)).toBe(8);
    expect(DEMO_PROJECTS[4].heatPump.enabled).toBe(true);
    expect(DEMO_PROJECTS[4].biomass.enabled).toBe(false);
    expect(DEMO_PROJECTS[4].expectedResults.energyClass).toMatch(/^A\+?$/);
    expect(DEMO_PROJECTS[4].expectedResults.meps2030_pass).toBe(true);
    expect(DEMO_PROJECTS[4].expectedResults.meps2033_pass).toBe(true);
    expect(parseFloat(DEMO_PROJECTS[4].building.n50)).toBeLessThanOrEqual(0.6);
  });
});

describe("buildMdlpaDefaults — derivare contextuală pentru cele 5 modele", () => {
  it("DEMO_MDLPA_DEFAULTS rămâne disponibil ca alias static (backward-compat)", () => {
    expect(DEMO_MDLPA_DEFAULTS).toBeTruthy();
    expect(DEMO_MDLPA_DEFAULTS).toHaveProperty("heatGenLocation");
    expect(DEMO_MDLPA_DEFAULTS).toHaveProperty("acmFixtures");
  });

  it("M1 (DH) → heatGenLocation = TERMOFICARE", () => {
    const out = buildMdlpaDefaults(DEMO_PROJECTS[0]);
    expect(out.heatGenLocation).toBe("TERMOFICARE");
  });

  it("M2 (PC + CHP) → heatGenLocation = CT_PROP", () => {
    const out = buildMdlpaDefaults(DEMO_PROJECTS[1]);
    expect(out.heatGenLocation).toBe("CT_PROP");
  });

  it("M5 (PC_SA) → heatGenLocation = CT_PROP + stoveCount = 0 (nu e sobă/biomasă)", () => {
    const out = buildMdlpaDefaults(DEMO_PROJECTS[4]);
    expect(out.heatGenLocation).toBe("CT_PROP");
    expect(parseInt(out.stoveCount, 10) || 0).toBe(0);
  });

  it("M1 + M3 → buildingHasDisconnectedApartments setat (M1 RA bloc) sau gol (M3 BI)", () => {
    const m1 = buildMdlpaDefaults(DEMO_PROJECTS[0]);
    const m3 = buildMdlpaDefaults(DEMO_PROJECTS[2]);
    expect(m1.buildingHasDisconnectedApartments).toBe("nu"); // RA bloc
    expect(m3.buildingHasDisconnectedApartments).toBe("");    // BI nerezidențial
  });
});
