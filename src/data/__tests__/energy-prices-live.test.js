/**
 * @vitest-environment jsdom
 */
/**
 * energy-prices-live.test.js — Sprint P2 (6 mai 2026)
 *
 * Teste pentru integrarea Eurostat live + fallback ANRE static + override user.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLatestEurostatPeriod,
  getEurostatRoElectricityPriceSync,
  getEnergyPriceLiveOrFallback,
  setUserElectricityPriceOverride,
  getUserElectricityPriceOverride,
} from "../energy-prices-live.js";

describe("Sprint P2 — getLatestEurostatPeriod (semestru recent publicat)", () => {
  it("Iunie 2026 → 2025-S2 (S2 anul trecut publicat în mai/iunie)", () => {
    expect(getLatestEurostatPeriod(new Date("2026-06-15"))).toBe("2025-S2");
  });

  it("Decembrie 2026 → 2025-S2", () => {
    expect(getLatestEurostatPeriod(new Date("2026-12-31"))).toBe("2025-S2");
  });

  it("Ianuarie 2026 → 2025-S1 (S2 nu încă publicat)", () => {
    expect(getLatestEurostatPeriod(new Date("2026-01-15"))).toBe("2025-S1");
  });

  it("Mai 2026 → 2025-S1", () => {
    expect(getLatestEurostatPeriod(new Date("2026-05-31"))).toBe("2025-S1");
  });
});

describe("Sprint P2 — getEurostatRoElectricityPriceSync (cache localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returnează null dacă cache lipsește", () => {
    expect(getEurostatRoElectricityPriceSync()).toBeNull();
  });

  it("returnează null dacă cache expirat (>7 zile)", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem("zephren_eurostat_electricity_ro", JSON.stringify({
      priceEUR: 0.18,
      period: "2025-S2",
      source: "Eurostat",
      fetchedAt: oldDate,
    }));
    expect(getEurostatRoElectricityPriceSync()).toBeNull();
  });

  it("returnează cache valid cu priceRON convertit", () => {
    localStorage.setItem("zephren_eurostat_electricity_ro", JSON.stringify({
      priceEUR: 0.20,
      period: "2025-S2",
      source: "Eurostat",
      fetchedAt: new Date().toISOString(),
    }));
    const r = getEurostatRoElectricityPriceSync();
    expect(r).not.toBeNull();
    expect(r.priceEUR).toBe(0.20);
    expect(r.priceRON).toBeGreaterThan(0.5); // 0.20 * ~5.05 = ~1.01 RON
    expect(r.priceRON).toBeLessThan(2.0);
  });

  it("returnează null dacă cache corupt JSON", () => {
    localStorage.setItem("zephren_eurostat_electricity_ro", "{invalid");
    expect(getEurostatRoElectricityPriceSync()).toBeNull();
  });
});

describe("Sprint P2 — getEnergyPriceLiveOrFallback", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("electricitate cu cache live → priceRON live + isLive=true", () => {
    localStorage.setItem("zephren_eurostat_electricity_ro", JSON.stringify({
      priceEUR: 0.18,
      period: "2025-S2",
      source: "Eurostat",
      fetchedAt: new Date().toISOString(),
    }));
    const r = getEnergyPriceLiveOrFallback("electricitate");
    expect(r.isLive).toBe(true);
    expect(r.source).toMatch(/Eurostat 2025-S2/);
    expect(r.priceRON).toBeGreaterThan(0.5);
  });

  it("electricitate fără cache → fallback ANRE static + isLive=false", () => {
    const r = getEnergyPriceLiveOrFallback("electricitate");
    expect(r.isLive).toBe(false);
    expect(r.source).toMatch(/ANRE casnic 2025/);
    expect(r.priceRON).toBe(1.29); // ANRE casnic_2025 electricitate
  });

  it("gaz întotdeauna fallback static (Eurostat acoperă doar electricitate)", () => {
    localStorage.setItem("zephren_eurostat_electricity_ro", JSON.stringify({
      priceEUR: 0.18, period: "2025-S2", source: "Eurostat",
      fetchedAt: new Date().toISOString(),
    }));
    const r = getEnergyPriceLiveOrFallback("gaz");
    expect(r.isLive).toBe(false);
    expect(r.priceRON).toBe(0.31); // ANRE casnic_2025 gaz
  });

  it("biomasă fallback static", () => {
    const r = getEnergyPriceLiveOrFallback("biomasa");
    expect(r.isLive).toBe(false);
    expect(r.priceRON).toBe(0.21);
  });
});

describe("Sprint P2 — Override manual preț electricitate (sessionStorage)", () => {
  beforeEach(() => sessionStorage.clear());

  it("setUserElectricityPriceOverride salvează valoare validă", () => {
    expect(setUserElectricityPriceOverride(1.45)).toBe(true);
    expect(getUserElectricityPriceOverride()).toBe(1.45);
  });

  it("respinge valoare prea mică (<0.05)", () => {
    expect(setUserElectricityPriceOverride(0.01)).toBe(false);
    expect(getUserElectricityPriceOverride()).toBeNull();
  });

  it("respinge valoare prea mare (>5)", () => {
    expect(setUserElectricityPriceOverride(10)).toBe(false);
    expect(getUserElectricityPriceOverride()).toBeNull();
  });

  it("respinge valoare non-numerică", () => {
    expect(setUserElectricityPriceOverride("abc")).toBe(false);
    expect(setUserElectricityPriceOverride(null)).toBe(false);
  });

  it("getUserElectricityPriceOverride returnează null dacă nimic salvat", () => {
    expect(getUserElectricityPriceOverride()).toBeNull();
  });
});
