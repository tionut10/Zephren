// @vitest-environment jsdom
/**
 * currency-cross-integration.test.js — Sprint Îmbunătățiri E (9 mai 2026)
 *
 * Teste integrare cross-currency: verifică că fmtMoney (currency-context) produce
 * conversii consistente cu getPriceRON (rehab-prices) când curs identic.
 *
 * Garanții:
 *   - fmtMoney("EUR" → "RON") × eurRon = priceRON din getPriceRON
 *   - fmtMoney target=auto afișează ambele monede consistent
 *   - convertCurrency(value, "EUR", "RON") match getPriceRON.priceRON / priceEUR
 *   - Round-trip EUR → RON → EUR preserves valoare cu eroare <0.1%
 */

import { describe, it, expect, beforeEach } from "vitest";
import { fmtMoney, convertCurrency, setCurrencyMode } from "../currency-context.js";
import { getPriceRON, getPrice, getEurRonSync, REHAB_PRICES } from "../rehab-prices.js";

beforeEach(() => {
  try { localStorage.removeItem("zephren_display_currency"); } catch {}
  try { sessionStorage.removeItem("user_eur_ron_override"); } catch {}
});

describe("Sprint E — Cross-currency integration fmtMoney ↔ getPriceRON", () => {
  it("getPriceRON.priceRON match convertCurrency(priceEUR, EUR→RON, eurRon)", () => {
    const eurRon = getEurRonSync() || REHAB_PRICES.eur_ron_fallback;
    const priceRON = getPriceRON("envelope", "wall_eps_10cm", "mid");
    expect(priceRON).not.toBeNull();
    const converted = convertCurrency(priceRON.priceEUR, "EUR", "RON", eurRon);
    expect(Math.round(converted)).toBe(priceRON.priceRON);
  });

  it("fmtMoney target=RON pe price EUR canonic = getPriceRON RON", () => {
    const eurRon = REHAB_PRICES.eur_ron_fallback; // 5.10 fix pentru reproductibilitate
    const wall = getPrice("envelope", "wall_eps_10cm", "mid");
    const fmtRON = fmtMoney(wall.price, "EUR", { target: "RON", eurRon });
    expect(fmtRON).toContain("RON");
    // Extrage numărul: "250 RON" → 250
    const num = parseInt(fmtRON.replace(/[^\d]/g, ""), 10);
    expect(num).toBe(Math.round(wall.price * eurRon));
  });

  it("Round-trip EUR → RON → EUR preserves valoare cu rotunjire <0.1%", () => {
    const eurRon = 5.10;
    const originalEUR = 1100; // pv_kwp.mid
    const ron = convertCurrency(originalEUR, "EUR", "RON", eurRon);
    const backToEur = convertCurrency(ron, "RON", "EUR", eurRon);
    expect(Math.abs(backToEur - originalEUR) / originalEUR).toBeLessThan(0.001);
  });

  it("fmtMoney auto mode include ambele monede (EUR + RON)", () => {
    const fmt = fmtMoney(1000, "EUR", { target: "auto", eurRon: 5.10 });
    expect(fmt).toContain("EUR");
    expect(fmt).toContain("RON");
    expect(fmt).toContain("1.000");
    expect(fmt).toContain("5.100");
  });

  it("fmtMoney mode=EUR pe valoare RON sursă convertește invers", () => {
    const fmt = fmtMoney(5100, "RON", { target: "EUR", eurRon: 5.10 });
    expect(fmt).toBe("1.000 EUR");
  });

  it("Lanț: getPriceRON → fmtMoney target=RON → identitate", () => {
    const eurRon = REHAB_PRICES.eur_ron_fallback;
    const items = [
      { cat: "envelope", item: "wall_eps_10cm", scenario: "low" },
      { cat: "envelope", item: "windows_u090", scenario: "mid" },
      { cat: "heating",  item: "hp_aw_12kw",   scenario: "high" },
      { cat: "renewables", item: "pv_kwp",     scenario: "mid" },
    ];
    for (const { cat, item, scenario } of items) {
      const ronCanonic = getPriceRON(cat, item, scenario);
      const eurValue = getPrice(cat, item, scenario).price;
      const fmt = fmtMoney(eurValue, "EUR", { target: "RON", eurRon });
      // Extrage numărul din fmt: "250 RON" → 250
      const num = parseInt(fmt.replace(/[^\d]/g, ""), 10);
      expect(num).toBe(ronCanonic.priceRON);
    }
  });

  it("setCurrencyMode persistă + fmtMoney citește global", () => {
    setCurrencyMode("EUR");
    const fmt = fmtMoney(5100, "RON", { eurRon: 5.10 }); // target inferit din mode global
    expect(fmt).toBe("1.000 EUR");

    setCurrencyMode("RON");
    const fmt2 = fmtMoney(1000, "EUR", { eurRon: 5.10 });
    expect(fmt2).toBe("5.100 RON");
  });

  it("Conversia 0 / NaN / null robustă în lanț", () => {
    expect(convertCurrency(0, "EUR", "RON", 5.10)).toBe(0);
    expect(convertCurrency(NaN, "EUR", "RON", 5.10)).toBe(0);
    expect(fmtMoney(0, "EUR", { target: "RON", eurRon: 5.10 })).toBe("0 RON");
    expect(fmtMoney(null, "EUR")).toBe("—");
  });
});
