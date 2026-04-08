import { describe, it, expect } from "vitest";
import { calcHourlyISO52016 } from "../hourly.js";

describe("Simulare orară 5R1C — ISO 52016-1", () => {
  // Generăm date climatice orare sintetice (sinusoidale, media 10°C, amplitudine 15°C)
  const T_ext = Array.from({ length: 8760 }, (_, h) => {
    const dayOfYear = Math.floor(h / 24);
    return 10 + 15 * Math.sin((dayOfYear - 80) * 2 * Math.PI / 365) + 3 * Math.sin(h * 2 * Math.PI / 24);
  });

  it("Date complete 8760h — returnează rezultate", () => {
    const r = calcHourlyISO52016({
      T_ext, Au: 100, H_tr: 80, H_ve: 30, C_m: 16500000,
      theta_int_set_h: 20, theta_int_set_c: 26,
    });
    expect(r.error).toBeNull();
    expect(r.qH_nd_annual).toBeGreaterThan(0);
    expect(r.hourly_heating).toHaveLength(8760);
    expect(r.hourly_cooling).toHaveLength(8760);
  });

  it("Necesarul de încălzire > 0 iarna", () => {
    const r = calcHourlyISO52016({
      T_ext, Au: 100, H_tr: 80, H_ve: 30, C_m: 16500000,
      theta_int_set_h: 20, theta_int_set_c: 26,
    });
    // Ianuarie (ore 0-743)
    const janHeating = Array.from(r.hourly_heating.slice(0, 744)).reduce((s, v) => s + v, 0);
    expect(janHeating).toBeGreaterThan(0);
  });

  it("Date incomplete → eroare", () => {
    const r = calcHourlyISO52016({
      T_ext: [10, 11, 12], Au: 100, H_tr: 80, H_ve: 30, C_m: 16500000,
      theta_int_set_h: 20, theta_int_set_c: 26,
    });
    expect(r.error).not.toBeNull();
    expect(r.qH_nd_annual).toBeNull();
  });

  it("Clădire bine izolată → necesar mai mic", () => {
    const izolat = calcHourlyISO52016({
      T_ext, Au: 100, H_tr: 30, H_ve: 15, C_m: 26000000,
      theta_int_set_h: 20, theta_int_set_c: 26,
    });
    const neizolat = calcHourlyISO52016({
      T_ext, Au: 100, H_tr: 200, H_ve: 50, C_m: 8000000,
      theta_int_set_h: 20, theta_int_set_c: 26,
    });
    expect(izolat.qH_nd_annual).toBeLessThan(neizolat.qH_nd_annual);
  });
});
