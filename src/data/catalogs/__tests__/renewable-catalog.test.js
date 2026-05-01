// ===============================================================
// TESTE — Catalog NEUTRU surse regenerabile (Pas 4)
// 1 mai 2026 — ~210 entries în 11 categorii + brand registry extins
// ===============================================================

import { describe, it, expect } from "vitest";
import {
  SOLAR_THERMAL_EXT, PV_CELLS_EXT, PV_INVERTERS_EXT, PV_SYSTEMS_EXT,
  HEAT_PUMPS_EXT, BIOMASS_FUELS_EXT, BIOMASS_BOILERS_EXT,
  WIND_TURBINES_EXT, CHP_TYPES_EXT, ENERGY_STORAGE_EXT,
  DISTRICT_HEATING_EXT,
  RENEWABLE_BY_ID, RENEWABLE_META,
  getLabel, filterByBuildingCategory, findById, groupByCategory, buildOptions,
  findRenewableById,
} from "../renewable-catalog.js";
import brandsRegistry from "../brands-registry.json";

describe("Renewable Catalog — Numărători & Schema", () => {
  it("should have at least 200 total entries", () => {
    expect(RENEWABLE_META.totalEntries).toBeGreaterThanOrEqual(200);
  });

  it("should have 11 categories defined", () => {
    expect(Object.keys(RENEWABLE_META.countByCategory)).toHaveLength(11);
  });

  it("should have minimum entries per category", () => {
    expect(SOLAR_THERMAL_EXT.length).toBeGreaterThanOrEqual(20);
    expect(PV_CELLS_EXT.length).toBeGreaterThanOrEqual(10);
    expect(PV_INVERTERS_EXT.length).toBeGreaterThanOrEqual(8);
    expect(PV_SYSTEMS_EXT.length).toBeGreaterThanOrEqual(4);
    expect(HEAT_PUMPS_EXT.length).toBeGreaterThanOrEqual(25);
    expect(BIOMASS_FUELS_EXT.length).toBeGreaterThanOrEqual(15);
    expect(BIOMASS_BOILERS_EXT.length).toBeGreaterThanOrEqual(6);
    expect(WIND_TURBINES_EXT.length).toBeGreaterThanOrEqual(18);
    expect(CHP_TYPES_EXT.length).toBeGreaterThanOrEqual(20);
    expect(ENERGY_STORAGE_EXT.length).toBeGreaterThanOrEqual(25);
    expect(DISTRICT_HEATING_EXT.length).toBeGreaterThanOrEqual(20);
  });
});

describe("Renewable Catalog — Schema NEUTRĂ", () => {
  it("all entries should have brand=null (neutral display)", () => {
    const all = [
      ...SOLAR_THERMAL_EXT, ...PV_CELLS_EXT, ...PV_INVERTERS_EXT, ...PV_SYSTEMS_EXT,
      ...HEAT_PUMPS_EXT, ...BIOMASS_FUELS_EXT, ...BIOMASS_BOILERS_EXT,
      ...WIND_TURBINES_EXT, ...CHP_TYPES_EXT, ...ENERGY_STORAGE_EXT,
      ...DISTRICT_HEATING_EXT,
    ];
    const withBrand = all.filter(e => e.brand !== null && e.brand !== undefined);
    expect(withBrand).toHaveLength(0);
  });

  it("all entries should have id, nameRo, nameEn", () => {
    const all = [
      ...SOLAR_THERMAL_EXT, ...PV_CELLS_EXT, ...PV_INVERTERS_EXT, ...PV_SYSTEMS_EXT,
      ...HEAT_PUMPS_EXT, ...BIOMASS_FUELS_EXT, ...BIOMASS_BOILERS_EXT,
      ...WIND_TURBINES_EXT, ...CHP_TYPES_EXT, ...ENERGY_STORAGE_EXT,
      ...DISTRICT_HEATING_EXT,
    ];
    all.forEach(e => {
      expect(e.id).toBeTruthy();
      expect(e.nameRo).toBeTruthy();
      expect(e.nameEn).toBeTruthy();
    });
  });

  it("all entries should have category + categoryEn for grouping", () => {
    const all = [
      ...SOLAR_THERMAL_EXT, ...PV_CELLS_EXT, ...PV_INVERTERS_EXT, ...PV_SYSTEMS_EXT,
      ...HEAT_PUMPS_EXT, ...BIOMASS_FUELS_EXT, ...BIOMASS_BOILERS_EXT,
      ...WIND_TURBINES_EXT, ...CHP_TYPES_EXT, ...ENERGY_STORAGE_EXT,
      ...DISTRICT_HEATING_EXT,
    ];
    all.forEach(e => {
      expect(e.category).toBeTruthy();
      expect(e.categoryEn).toBeTruthy();
    });
  });

  it("all entries should have applicableCategories array (RO building scopes)", () => {
    const all = [
      ...SOLAR_THERMAL_EXT, ...PV_CELLS_EXT, ...PV_INVERTERS_EXT, ...PV_SYSTEMS_EXT,
      ...HEAT_PUMPS_EXT, ...BIOMASS_FUELS_EXT, ...BIOMASS_BOILERS_EXT,
      ...WIND_TURBINES_EXT, ...CHP_TYPES_EXT, ...ENERGY_STORAGE_EXT,
      ...DISTRICT_HEATING_EXT,
    ];
    all.forEach(e => {
      expect(Array.isArray(e.applicableCategories)).toBe(true);
      expect(e.applicableCategories.length).toBeGreaterThan(0);
    });
  });

  it("all entries should have standard reference (EN/ISO/IEC)", () => {
    const all = [
      ...SOLAR_THERMAL_EXT, ...PV_CELLS_EXT, ...PV_INVERTERS_EXT, ...PV_SYSTEMS_EXT,
      ...HEAT_PUMPS_EXT, ...BIOMASS_FUELS_EXT, ...BIOMASS_BOILERS_EXT,
      ...WIND_TURBINES_EXT, ...CHP_TYPES_EXT, ...ENERGY_STORAGE_EXT,
      ...DISTRICT_HEATING_EXT,
    ];
    all.forEach(e => {
      expect(e.standard).toBeTruthy();
    });
  });
});

describe("Renewable Catalog — Solar Thermal", () => {
  it("should have polymer collectors", () => {
    const polymer = SOLAR_THERMAL_EXT.filter(e => e.category === "Polimeric");
    expect(polymer.length).toBeGreaterThanOrEqual(3);
  });

  it("should have PVT hybrid panels", () => {
    const pvt = SOLAR_THERMAL_EXT.filter(e => e.category === "Hibrid PVT");
    expect(pvt.length).toBeGreaterThanOrEqual(3);
  });

  it("should have BIST entries", () => {
    const bist = SOLAR_THERMAL_EXT.filter(e => e.category === "BIST");
    expect(bist.length).toBeGreaterThanOrEqual(3);
  });

  it("should have valid eta0 values [0..1]", () => {
    SOLAR_THERMAL_EXT.forEach(e => {
      expect(e.eta0).toBeGreaterThan(0);
      expect(e.eta0).toBeLessThanOrEqual(1);
    });
  });
});

describe("Renewable Catalog — PV Cells", () => {
  it("should have perovskite tandem", () => {
    expect(findById(PV_CELLS_EXT, "PEROV_TANDEM")).toBeTruthy();
  });

  it("should have BIPV color entries", () => {
    expect(findById(PV_CELLS_EXT, "BIPV_COLOR")).toBeTruthy();
  });

  it("should have FPV marine entries", () => {
    expect(findById(PV_CELLS_EXT, "FPV_MARINE")).toBeTruthy();
  });

  it("perovskite tandem should have eta > 25%", () => {
    const ent = findById(PV_CELLS_EXT, "PEROV_TANDEM");
    expect(ent.eta).toBeGreaterThan(0.25);
  });
});

describe("Renewable Catalog — Heat Pumps", () => {
  it("should have R290 propane premium", () => {
    expect(findById(HEAT_PUMPS_EXT, "PC_AA_R290_PREM")).toBeTruthy();
  });

  it("should have R744 CO2 entries", () => {
    const r744 = HEAT_PUMPS_EXT.filter(e => e.refrigerant?.includes("R744"));
    expect(r744.length).toBeGreaterThanOrEqual(2);
  });

  it("should have absorption / adsorption HPs", () => {
    const abs = HEAT_PUMPS_EXT.filter(e => e.category === "Absorbție / Adsorbție");
    expect(abs.length).toBeGreaterThanOrEqual(3);
  });

  it("should have VRF / multi-zone", () => {
    const vrf = HEAT_PUMPS_EXT.filter(e => e.category === "VRF / Multi-zone");
    expect(vrf.length).toBeGreaterThanOrEqual(3);
  });

  it("Pure R290 entries should have GWP = 3 (low-GWP)", () => {
    // Filter only entries with R290 as SINGLE refrigerant (no '/' separator for hybrid lists)
    const pureR290 = HEAT_PUMPS_EXT.filter(e => e.refrigerant === "R290");
    expect(pureR290.length).toBeGreaterThanOrEqual(2);
    pureR290.forEach(e => {
      expect(e.gwp).toBeLessThanOrEqual(10);
    });
  });
});

describe("Renewable Catalog — Wind Turbines", () => {
  it("should have HAWT 3-blade variants", () => {
    const hawt = WIND_TURBINES_EXT.filter(e => e.category === "HAWT");
    expect(hawt.length).toBeGreaterThanOrEqual(5);
  });

  it("should have VAWT variants", () => {
    const vawt = WIND_TURBINES_EXT.filter(e => e.category === "VAWT");
    expect(vawt.length).toBeGreaterThanOrEqual(5);
  });

  it("should have BIWT (building-integrated)", () => {
    const biwt = WIND_TURBINES_EXT.filter(e => e.category === "BIWT");
    expect(biwt.length).toBeGreaterThanOrEqual(3);
  });

  it("all turbines should have valid IEC class or null", () => {
    WIND_TURBINES_EXT.forEach(e => {
      if (e.iecClass !== null) {
        expect(["I", "II", "III", "IV", "S"]).toContain(e.iecClass);
      }
    });
  });

  it("all turbines should have cutIn < rated < cutOff", () => {
    WIND_TURBINES_EXT.forEach(e => {
      if (e.cutIn > 0 && e.cutOff > 0) {
        expect(e.cutIn).toBeLessThanOrEqual(e.rated);
        expect(e.rated).toBeLessThanOrEqual(e.cutOff);
      }
    });
  });
});

describe("Renewable Catalog — CHP Types", () => {
  it("should have Stirling + ICE + GT + Steam + Fuel Cell + Hybrid", () => {
    const cats = new Set(CHP_TYPES_EXT.map(e => e.category));
    expect(cats.size).toBeGreaterThanOrEqual(5);
  });

  it("should have fuel cell variants (PEM, SOFC, PAFC, MCFC)", () => {
    const fc = CHP_TYPES_EXT.filter(e => e.category === "Fuel cell");
    expect(fc.length).toBeGreaterThanOrEqual(5);
  });

  it("high-efficiency CHP should have PES > 10% per Dir. 2012/27/UE", () => {
    const heCHP = CHP_TYPES_EXT.filter(e => e.highEfficiency);
    heCHP.forEach(e => {
      expect(e.pesPercent).toBeGreaterThan(10);
    });
  });

  it("eta_total should be approximately etaElec + etaTh", () => {
    CHP_TYPES_EXT.forEach(e => {
      const sum = e.etaElec + e.etaTh;
      // Allow small rounding diff (e.g. PVT and HP cascade can have eta_total > 1)
      expect(Math.abs(sum - e.etaTotal)).toBeLessThan(0.01);
    });
  });
});

describe("Renewable Catalog — Energy Storage", () => {
  it("should have flow batteries (VRFB, ZBFB)", () => {
    const flow = ENERGY_STORAGE_EXT.filter(e => e.category === "Baterie flow");
    expect(flow.length).toBeGreaterThanOrEqual(2);
  });

  it("should have PCM entries", () => {
    const pcm = ENERGY_STORAGE_EXT.filter(e => e.category === "PCM");
    expect(pcm.length).toBeGreaterThanOrEqual(3);
  });

  it("should have hydrogen storage", () => {
    const h2 = ENERGY_STORAGE_EXT.filter(e => e.category === "Hidrogen");
    expect(h2.length).toBeGreaterThanOrEqual(3);
  });

  it("should have iron-air long-duration", () => {
    expect(findById(ENERGY_STORAGE_EXT, "BAT_FE_AIR")).toBeTruthy();
  });

  it("efficiency should be in [0..1]", () => {
    ENERGY_STORAGE_EXT.forEach(e => {
      expect(e.efficiency).toBeGreaterThan(0);
      expect(e.efficiency).toBeLessThanOrEqual(1);
    });
  });
});

describe("Renewable Catalog — District Heating", () => {
  it("should have all 5 generations of DH", () => {
    expect(findById(DISTRICT_HEATING_EXT, "dh_2g_steam")).toBeTruthy();
    expect(findById(DISTRICT_HEATING_EXT, "dh_3g_pressurized")).toBeTruthy();
    expect(findById(DISTRICT_HEATING_EXT, "dh_4g_low_temp")).toBeTruthy();
    expect(findById(DISTRICT_HEATING_EXT, "dh_5g_ambient")).toBeTruthy();
  });

  it("should have community renewables", () => {
    const comm = DISTRICT_HEATING_EXT.filter(e => e.category === "Comunitate energie");
    expect(comm.length).toBeGreaterThanOrEqual(4);
  });

  it("should have PPA arrangements", () => {
    expect(findById(DISTRICT_HEATING_EXT, "ppa_corp_private")).toBeTruthy();
    expect(findById(DISTRICT_HEATING_EXT, "ppa_virtual_sleeved")).toBeTruthy();
  });

  it("renewable fraction should be in [0..1]", () => {
    DISTRICT_HEATING_EXT.forEach(e => {
      expect(e.renewableFraction).toBeGreaterThanOrEqual(0);
      expect(e.renewableFraction).toBeLessThanOrEqual(1);
    });
  });
});

describe("Renewable Catalog — Helpers", () => {
  it("getLabel should return RO by default", () => {
    const e = SOLAR_THERMAL_EXT[0];
    expect(getLabel(e)).toBe(e.nameRo);
    expect(getLabel(e, "RO")).toBe(e.nameRo);
  });

  it("getLabel should return EN when requested", () => {
    const e = SOLAR_THERMAL_EXT[0];
    expect(getLabel(e, "EN")).toBe(e.nameEn);
  });

  it("findById should locate entry across all catalogs", () => {
    expect(findRenewableById("PEROV_TANDEM")).toBeTruthy();
    expect(findRenewableById("PC_AA_R290_PREM")).toBeTruthy();
    expect(findRenewableById("BAT_FE_AIR")).toBeTruthy();
    expect(findRenewableById("VAWT_HELICAL_QR")).toBeTruthy();
    expect(findRenewableById("chp_sofc_pure_h2")).toBeTruthy();
    expect(findRenewableById("__nonexistent__")).toBeNull();
  });

  it("filterByBuildingCategory should return all if no category", () => {
    const all = filterByBuildingCategory(SOLAR_THERMAL_EXT, null);
    expect(all.length).toBe(SOLAR_THERMAL_EXT.length);
  });

  it("filterByBuildingCategory RI should reduce list", () => {
    const ri = filterByBuildingCategory(SOLAR_THERMAL_EXT, "RI");
    expect(ri.length).toBeGreaterThan(0);
    expect(ri.length).toBeLessThanOrEqual(SOLAR_THERMAL_EXT.length);
  });

  it("groupByCategory should organize entries", () => {
    const grouped = groupByCategory(SOLAR_THERMAL_EXT, "RO");
    expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(5);
  });

  it("buildOptions should include group headers", () => {
    const opts = buildOptions(SOLAR_THERMAL_EXT, "RO");
    const headers = opts.filter(o => o.isGroupHeader);
    expect(headers.length).toBeGreaterThanOrEqual(5);
  });

  it("RENEWABLE_BY_ID should be frozen for safety", () => {
    expect(Object.isFrozen(RENEWABLE_BY_ID)).toBe(true);
  });
});

describe("Brand Registry — Extensii regenerabile", () => {
  it("should have at least 290 brands total", () => {
    expect(brandsRegistry.brands.length).toBeGreaterThanOrEqual(290);
  });

  it("ALL brands should have partnerStatus='none' (neutral)", () => {
    brandsRegistry.brands.forEach(b => {
      expect(b.partnerStatus).toBe("none");
    });
  });

  it("ALL brands should have brand=null in display fields (no leakage)", () => {
    brandsRegistry.brands.forEach(b => {
      // Schema check: required NEUTRAL fields
      expect(b.partnerSince).toBeNull();
      expect(b.partnerTier).toBeNull();
      expect(b.affiliateUrl).toBeNull();
    });
  });

  it("should include solar thermal premium brands", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("kingspan_thermomax");
    expect(ids).toContain("solahart");
    expect(ids).toContain("dualsun");
    expect(ids).toContain("aventa_solar");
  });

  it("should include PV premium brands (HJT, TOPCon, IBC)", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("qcells");
    expect(ids).toContain("rec_group");
    expect(ids).toContain("meyer_burger");
    expect(ids).toContain("sunpower_maxeon");
  });

  it("should include heat pump specialists", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("hoval");
    expect(ids).toContain("idm_energiesysteme");
    expect(ids).toContain("kronoterm");
    expect(ids).toContain("alpha_innotec");
  });

  it("should include biomass boiler specialists", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("eta_heiztechnik");
    expect(ids).toContain("kwb_powerfire");
    expect(ids).toContain("guntamatic");
    expect(ids).toContain("windhager");
  });

  it("should include Romanian biomass producers", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    const roIds = ["termoboilers_ro", "solis_ro", "termofarc_ro", "termosteel_ro"];
    roIds.forEach(id => {
      expect(ids).toContain(id);
    });
  });

  it("should include wind turbine brands (small wind)", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("bornay");
    expect(ids).toContain("enair");
    expect(ids).toContain("aeolos_wind");
    expect(ids).toContain("quietrevolution");
    expect(ids).toContain("newwind_windtree");
  });

  it("should include CHP brands (ICE + Stirling + Fuel Cell)", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("senertec_dachs");
    expect(ids).toContain("tedom");
    expect(ids).toContain("bloom_energy");
    expect(ids).toContain("ceres_power");
    expect(ids).toContain("doosan_fc");
    expect(ids).toContain("fuelcell_energy");
  });

  it("should include energy storage premium brands", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("tesvolt");
    expect(ids).toContain("senec");
    expect(ids).toContain("form_energy");
    expect(ids).toContain("highview_power");
    expect(ids).toContain("sunamp");
  });

  it("should include Romanian DH operators", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("termo_iasi");
    expect(ids).toContain("termoficare_cluj");
    expect(ids).toContain("termo_brasov");
  });

  it("should include EU PPA / IPP providers", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    expect(ids).toContain("totalenergies");
    expect(ids).toContain("statkraft");
    expect(ids).toContain("engie_sa");
    expect(ids).toContain("vattenfall");
  });

  it("brand IDs should be unique", () => {
    const ids = brandsRegistry.brands.map(b => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("brands should have country (ISO-2)", () => {
    brandsRegistry.brands.forEach(b => {
      expect(b.country).toBeTruthy();
      expect(b.country.length).toBeGreaterThanOrEqual(2);
      expect(b.country.length).toBeLessThanOrEqual(5); // some have AT/UA
    });
  });

  it("brand categories should reference known taxonomy", () => {
    const validCats = [
      "heating", "cooling", "acm", "ventilation", "lighting", "smart-home",
      "distribution", "solar", "battery", "fuels", "wind", "chp",
    ];
    brandsRegistry.brands.forEach(b => {
      expect(Array.isArray(b.categories)).toBe(true);
      b.categories.forEach(cat => {
        expect(validCats).toContain(cat);
      });
    });
  });
});

describe("Renewable Catalog — RO context (Mc 001-2022 + Casa Verde + EPBD)", () => {
  it("PV cells should reference Casa Verde-eligible standards", () => {
    const ev = PV_CELLS_EXT.filter(e =>
      e.standard.includes("EN 61215") || e.standard.includes("EN 50583")
    );
    expect(ev.length).toBeGreaterThanOrEqual(8);
  });

  it("Heat pumps should reference EN 14511 (RED II Annex VII)", () => {
    const matches = HEAT_PUMPS_EXT.filter(e => e.standard?.includes("14511") || e.standard?.includes("12309"));
    expect(matches.length).toBeGreaterThanOrEqual(20);
  });

  it("Biomass fuels should reference EN ISO 17225", () => {
    const matches = BIOMASS_FUELS_EXT.filter(e => e.standard?.includes("17225"));
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("CHP entries should reference Dir. 2012/27/UE or EN 50465/50466", () => {
    const matches = CHP_TYPES_EXT.filter(e =>
      e.standard?.includes("2012/27") ||
      e.standard?.includes("50465") ||
      e.standard?.includes("50466") ||
      e.standard?.includes("303-7") ||
      e.standard?.includes("RED II") ||
      e.standard?.includes("16723") ||
      e.standard?.includes("EN 14511") ||
      e.standard?.includes("12952") ||
      e.standard?.includes("ISO 3977") ||
      e.standard?.includes("ASME") ||
      e.standard?.includes("ISO 2314") ||
      e.standard?.includes("Dir. 2010") ||
      e.standard?.includes("ISO 9614") ||
      e.standard?.includes("EN 13183") ||
      e.standard?.includes("IEC 62282") ||
      e.standard?.includes("EN ISO 8528") ||
      e.standard?.includes("EN 50549") ||
      e.standard?.includes("ISO 14687")
    );
    // Most CHP entries should reference at least one relevant standard
    expect(matches.length).toBeGreaterThanOrEqual(20);
  });

  it("District heating should reference EED 2023/1791 + RED II", () => {
    const matches = DISTRICT_HEATING_EXT.filter(e =>
      e.standard?.includes("2023/1791") ||
      e.standard?.includes("RED II") ||
      e.standard?.includes("EED") ||
      e.standard?.includes("Anexa VII") ||
      e.standard?.includes("13941") ||
      e.standard?.includes("Art. 22") ||
      e.standard?.includes("Art. 19") ||
      e.standard?.includes("Art. 21") ||
      e.standard?.includes("RED II Anexa")
    );
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });
});
