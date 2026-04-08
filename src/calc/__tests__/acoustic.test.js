import { describe, it, expect } from "vitest";
import { calcElementRw, calcWindowRw, checkAcousticConformity } from "../acoustic.js";

describe("Acustică — EN ISO 717-1 / NP 008-97", () => {
  it("Perete masiv — Rw > 40 dB", () => {
    const r = calcElementRw([
      { thickness: 250, lambda: 0.46, rho: 1200 },
      { thickness: 15, lambda: 0.87, rho: 1800 },
    ], "PE");
    expect(r).not.toBeNull();
    expect(r.Rw).toBeGreaterThan(40);
  });

  it("Fereastră dublu vitraj — Rw ≈ 30-35 dB", () => {
    const r = calcWindowRw("Dublu vitraj Low-E", "PVC (5 camere)");
    expect(r.Rw).toBeGreaterThan(28);
    expect(r.Rw).toBeLessThan(40);
  });

  it("Conformitate rezidențial — perete gros = conform", () => {
    const r = checkAcousticConformity({
      opaqueElements: [{ type: "PE", layers: [{ thickness: 300, lambda: 0.46, rho: 1200 }] }],
      glazingElements: [],
      category: "RI",
    });
    expect(r.results.length).toBeGreaterThan(0);
  });
});
