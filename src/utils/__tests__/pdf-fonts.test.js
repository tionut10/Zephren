import { describe, it, expect } from "vitest";
import { normalizeDiacritics } from "../pdf-fonts.js";

/**
 * Sprint 16 Task 7 — Teste diacritice + transliterare PDF
 */

describe("normalizeDiacritics — transliterare diacritice RO", () => {
  it("convertește ă → a", () => {
    expect(normalizeDiacritics("ăăă")).toBe("aaa");
  });

  it("convertește â → a", () => {
    expect(normalizeDiacritics("ââ")).toBe("aa");
  });

  it("convertește î → i", () => {
    expect(normalizeDiacritics("îîî")).toBe("iii");
  });

  it("convertește ș → s (U+0219)", () => {
    expect(normalizeDiacritics("șș")).toBe("ss");
  });

  it("convertește ț → t (U+021B)", () => {
    expect(normalizeDiacritics("țț")).toBe("tt");
  });

  it("convertește ş → s (U+015F, cedilă veche)", () => {
    expect(normalizeDiacritics("şş")).toBe("ss");
  });

  it("convertește ţ → t (U+0163, cedilă veche)", () => {
    expect(normalizeDiacritics("ţţ")).toBe("tt");
  });

  it("convertește majuscule Ă Â Î Ș Ț", () => {
    expect(normalizeDiacritics("ĂÂÎȘȚ")).toBe("AAIST");
  });

  it("păstrează caracterele ASCII standard", () => {
    expect(normalizeDiacritics("Hello World 123")).toBe("Hello World 123");
  });

  it("gestionează text amestecat cu diacritice", () => {
    expect(normalizeDiacritics("Clădire rezidențială situată în București")).toBe(
      "Cladire rezidentiala situata in Bucuresti"
    );
  });

  it("gestionează null/undefined fără a arunca eroare", () => {
    expect(normalizeDiacritics(null)).toBe("");
    expect(normalizeDiacritics(undefined)).toBe("");
  });

  it("gestionează tipuri non-string", () => {
    expect(normalizeDiacritics(123)).toBe(123);
  });

  it("păstrează spațiile și semnele de punctuație", () => {
    expect(normalizeDiacritics("Auditul — o evaluare tehnică (completă).")).toBe(
      "Auditul — o evaluare tehnica (completa)."
    );
  });

  it("textul propriu fără diacritice rămâne neschimbat", () => {
    const input = "Categoria RC zona II climatica";
    expect(normalizeDiacritics(input)).toBe(input);
  });
});
