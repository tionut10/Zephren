import { describe, it, expect } from "vitest";
import {
  REGISTRY_CONFIG,
  registerPassport,
  syncPassportWithRegistry,
  fetchPassportFromRegistry,
  getRegistryStatus,
} from "../mdlpa-registry.js";

describe("mdlpa-registry (API MDLPA încă nepublicat)", () => {
  it("registru dezactivat implicit", () => {
    expect(REGISTRY_CONFIG.enabled).toBe(false);
    expect(REGISTRY_CONFIG.baseUrl).toBe(null);
  });

  it("registerPassport returnează localOnly dacă registry disabled", async () => {
    const r = await registerPassport({ passportId: "test" });
    expect(r.success).toBe(false);
    expect(r.reason).toBe("registry_not_available");
    expect(r.localOnly).toBe(true);
  });

  it("syncPassportWithRegistry returnează registry_not_available", async () => {
    const r = await syncPassportWithRegistry({ passportId: "test" });
    expect(r.success).toBe(false);
  });

  it("fetchPassportFromRegistry returnează registry_not_available", async () => {
    const r = await fetchPassportFromRegistry("test-id");
    expect(r.success).toBe(false);
  });

  it("getRegistryStatus expune note + lastChecked", () => {
    const s = getRegistryStatus();
    expect(s.enabled).toBe(false);
    expect(typeof s.note).toBe("string");
    expect(s.note).toMatch(/MDLPA/);
    expect(s.lastChecked).toMatch(/^2026-04-\d{2}$/); // data actualizată la fiecare Sprint
  });
});
