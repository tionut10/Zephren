/**
 * Teste pentru mdlpa-portal-adapter.js
 * Sprint MDLPA Faza 0 (27 apr 2026)
 */

import { describe, it, expect } from "vitest";
import {
  submitDocument,
  checkStatus,
  healthCheck,
  validatePayloadShape,
  isMockMode,
  PORTAL_ERRORS,
  SUBMIT_ENDPOINTS,
  ADAPTER_VERSION,
} from "../mdlpa-portal-adapter.js";

const VALID_PAYLOAD = {
  document_type: "CPE",
  document_uuid: "550e8400-e29b-41d4-a716-446655440000",
  document_xml: "<cpe><uuid>550e8400-e29b-41d4-a716-446655440000</uuid></cpe>",
  auditor_atestat: "AE12345/2024",
};

describe("mdlpa-portal-adapter — interface", () => {
  it("exportă constantele cheie", () => {
    expect(typeof ADAPTER_VERSION).toBe("string");
    expect(SUBMIT_ENDPOINTS).toHaveProperty("CPE");
    expect(SUBMIT_ENDPOINTS).toHaveProperty("RAE");
    expect(SUBMIT_ENDPOINTS).toHaveProperty("PASAPORT");
    expect(PORTAL_ERRORS).toHaveProperty("NETWORK");
    expect(PORTAL_ERRORS).toHaveProperty("VALIDATION");
  });

  it("isMockMode() returnează true în absența env vars", () => {
    expect(isMockMode()).toBe(true); // default mock
  });
});

describe("validatePayloadShape", () => {
  it("acceptă payload valid", () => {
    expect(() => validatePayloadShape(VALID_PAYLOAD)).not.toThrow();
  });

  it("respinge payload null", () => {
    expect(() => validatePayloadShape(null)).toThrow(/obiect/);
  });

  it("respinge document_type invalid", () => {
    expect(() => validatePayloadShape({ ...VALID_PAYLOAD, document_type: "FOO" })).toThrow(/document_type/);
  });

  it("respinge UUID invalid", () => {
    expect(() => validatePayloadShape({ ...VALID_PAYLOAD, document_uuid: "not-uuid" })).toThrow(/UUID/);
  });

  it("cere toate câmpurile obligatorii", () => {
    const required = ["document_type", "document_uuid", "document_xml", "auditor_atestat"];
    for (const field of required) {
      const partial = { ...VALID_PAYLOAD };
      delete partial[field];
      expect(() => validatePayloadShape(partial)).toThrow(new RegExp(field));
    }
  });
});

describe("submitDocument — mock mode", () => {
  it("returnează success structure validă pe payload bun", async () => {
    const result = await submitDocument(VALID_PAYLOAD);
    // Mock simulează ~95% success rate, dar șansa de eșec rămâne
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("raw_response");
    if (result.success) {
      expect(result.reference_id).toMatch(/^MDLPA-MOCK-/);
      expect(result.registry_url).toMatch(/portal\.mdlpa\.ro/);
      expect(result.acknowledged_at).toBeTruthy();
      expect(result.error_code).toBeNull();
    } else {
      expect(result.error_code).toBeTruthy();
      expect(result.error_message).toBeTruthy();
    }
  });

  it("aruncă eroare pe payload invalid", async () => {
    await expect(submitDocument({})).rejects.toThrow();
  });

  it("are latency realist (>= 200ms)", async () => {
    const start = Date.now();
    await submitDocument(VALID_PAYLOAD);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(200);
  });

  it("setează mock=true în raw_response când rulează în mock mode", async () => {
    const result = await submitDocument(VALID_PAYLOAD);
    if (result.success) {
      expect(result.raw_response.mock).toBe(true);
      expect(result.raw_response.adapter_version).toBe(ADAPTER_VERSION);
    }
  });
});

describe("checkStatus — mock mode", () => {
  it("respinge reference_id gol", async () => {
    await expect(checkStatus("")).rejects.toThrow(/required/);
    await expect(checkStatus(null)).rejects.toThrow(/required/);
  });

  it("returnează status structurat", async () => {
    const result = await checkStatus("MDLPA-MOCK-123-abcdef");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("raw_response");
    expect(["pending", "accepted", "rejected", "unknown"]).toContain(result.status);
  });
});

describe("healthCheck", () => {
  it("returnează up=true în mock mode cu latency rezonabil", async () => {
    const h = await healthCheck();
    expect(h.up).toBe(true);
    expect(h.mode).toBe("mock");
    expect(h.latency_ms).toBeGreaterThanOrEqual(0);
    expect(h.latency_ms).toBeLessThan(500);
  });
});

describe("error mapping", () => {
  // Test indirect: forțăm mock să eșueze pe validation prin manipulare directă
  // (altă opțiune ar fi mock pe Math.random, dar lăsăm testul probabilistic)
  it("erorile au coduri din PORTAL_ERRORS enumerate", async () => {
    // rulăm de mai multe ori pentru a prinde și failure path
    const results = await Promise.all(
      Array.from({ length: 50 }, () => submitDocument(VALID_PAYLOAD))
    );
    const failures = results.filter(r => !r.success);
    for (const f of failures) {
      expect(Object.values(PORTAL_ERRORS)).toContain(f.error_code);
    }
  });
});
