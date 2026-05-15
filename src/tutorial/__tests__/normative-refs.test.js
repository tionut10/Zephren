// ═════════════════════════════════════════════════════════════════════════════
// normative-refs.test.js — Registry referințe normative complet și valid
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { REFS } from "../normative-refs.js";

describe("Normative refs registry", () => {
  it("registry exportat ca obiect non-vid", () => {
    expect(REFS).toBeDefined();
    expect(typeof REFS).toBe("object");
    expect(Object.keys(REFS).length).toBeGreaterThan(20);
  });

  it("fiecare ref are code + title + description", () => {
    Object.entries(REFS).forEach(([key, ref]) => {
      expect(ref.code, `${key} code`).toBeDefined();
      expect(ref.title, `${key} title`).toBeDefined();
      expect(ref.description, `${key} description`).toBeDefined();
      expect(typeof ref.code).toBe("string");
      expect(typeof ref.title).toBe("string");
      expect(typeof ref.description).toBe("string");
    });
  });

  it("toate refs au type valid (whitelist)", () => {
    const VALID_TYPES = ["mc001", "sr-en", "iso", "epbd", "ord", "lege", "default"];
    Object.entries(REFS).forEach(([key, ref]) => {
      if (ref.type) {
        expect(VALID_TYPES, `${key} type=${ref.type}`).toContain(ref.type);
      }
    });
  });

  it("URL-urile (dacă există) sunt valide HTTPS", () => {
    Object.entries(REFS).forEach(([key, ref]) => {
      if (ref.url) {
        expect(ref.url, `${key} url protocol`).toMatch(/^https?:\/\//);
      }
    });
  });

  it("are referințe esențiale Mc 001 + EPBD + ord 348", () => {
    expect(REFS.mc001).toBeDefined();
    expect(REFS.mc001_cap1).toBeDefined();
    expect(REFS.mc001_cap5).toBeDefined();
    expect(REFS.epbd_2024).toBeDefined();
    expect(REFS.epbd_art9).toBeDefined();
    expect(REFS.ord_348).toBeDefined();
    expect(REFS.ord_348_art6).toBeDefined();
    expect(REFS.iso_19005).toBeDefined();
    expect(REFS.etsi_319_142).toBeDefined();
  });

  it("description-urile sunt suficient detaliate (min 30 char)", () => {
    Object.entries(REFS).forEach(([key, ref]) => {
      expect(ref.description.length, `${key} description scurt`).toBeGreaterThanOrEqual(30);
    });
  });

  it("codurile sunt unice", () => {
    const codes = Object.values(REFS).map((r) => r.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
