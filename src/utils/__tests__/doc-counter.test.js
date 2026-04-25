/**
 * @vitest-environment jsdom
 *
 * Smoke tests Sprint A Task 9 — doc-counter (counter secvențial documente)
 * Verifică: incrementare, persistare, reset anual, peek fără increment, izolare pe prefix
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextDocNumber, peekNextDocNumber } from "../doc-counter.js";

describe("doc-counter — nextDocNumber", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("returnează primul număr cu prefixul corect și an curent", () => {
    const year = new Date().getFullYear();
    const nr = nextDocNumber("AE");
    expect(nr).toBe(`AE-${year}-100`);
  });

  it("incrementează la fiecare apel consecutiv", () => {
    const year = new Date().getFullYear();
    expect(nextDocNumber("CS")).toBe(`CS-${year}-100`);
    expect(nextDocNumber("CS")).toBe(`CS-${year}-101`);
    expect(nextDocNumber("CS")).toBe(`CS-${year}-102`);
    expect(nextDocNumber("CS")).toBe(`CS-${year}-103`);
  });

  it("zero-padded la 3 cifre", () => {
    const year = new Date().getFullYear();
    for (let i = 0; i < 5; i++) nextDocNumber("FV");
    const nr = nextDocNumber("FV");
    expect(nr).toBe(`FV-${year}-105`);
    expect(nr.split("-")[2]).toHaveLength(3);
  });

  it("prefixele diferite au countere independente", () => {
    const year = new Date().getFullYear();
    nextDocNumber("AE"); // 100
    nextDocNumber("AE"); // 101
    nextDocNumber("CS"); // 100 (prefix diferit → start proaspăt)
    expect(nextDocNumber("AE")).toBe(`AE-${year}-102`);
    expect(nextDocNumber("CS")).toBe(`CS-${year}-101`);
  });

  it("persistă în localStorage sub cheia zephren_doc_counter_<PREFIX>", () => {
    nextDocNumber("OF");
    const raw = localStorage.getItem("zephren_doc_counter_OF");
    expect(raw).toBeTruthy();
    const state = JSON.parse(raw);
    expect(state).toHaveProperty("year");
    expect(state).toHaveProperty("n");
    expect(state.n).toBe(100);
  });

  it("respectă parametrul startAt personalizat", () => {
    const year = new Date().getFullYear();
    expect(nextDocNumber("XX", 500)).toBe(`XX-${year}-500`);
    expect(nextDocNumber("XX", 500)).toBe(`XX-${year}-501`);
  });

  it("resetează counter-ul la schimbare an", () => {
    const currYear = new Date().getFullYear();
    // Simulează counter pentru anul trecut
    localStorage.setItem("zephren_doc_counter_AE", JSON.stringify({ year: currYear - 1, n: 250 }));
    const nr = nextDocNumber("AE");
    expect(nr).toBe(`AE-${currYear}-100`);
  });

  it("recuperează din state corupt (JSON malformed) cu reset la startAt", () => {
    localStorage.setItem("zephren_doc_counter_BAD", "{{{ corrupt json");
    const year = new Date().getFullYear();
    expect(nextDocNumber("BAD")).toBe(`BAD-${year}-100`);
  });

  it("respectă state parțial invalid (missing fields)", () => {
    localStorage.setItem("zephren_doc_counter_PARTIAL", JSON.stringify({ unrelated: "data" }));
    const year = new Date().getFullYear();
    expect(nextDocNumber("PARTIAL")).toBe(`PARTIAL-${year}-100`);
  });
});

describe("doc-counter — peekNextDocNumber", () => {
  beforeEach(() => localStorage.clear());

  it("returnează următorul număr FĂRĂ a incrementa counter-ul", () => {
    const year = new Date().getFullYear();
    nextDocNumber("AE"); // 100
    expect(peekNextDocNumber("AE")).toBe(`AE-${year}-101`);
    expect(peekNextDocNumber("AE")).toBe(`AE-${year}-101`); // apel repetat → același
    // Abia acum incrementăm real
    expect(nextDocNumber("AE")).toBe(`AE-${year}-101`);
  });

  it("returnează startAt dacă nu există counter", () => {
    const year = new Date().getFullYear();
    expect(peekNextDocNumber("NEW")).toBe(`NEW-${year}-100`);
  });

  it("returnează startAt dacă anul e diferit", () => {
    const currYear = new Date().getFullYear();
    localStorage.setItem("zephren_doc_counter_OLD", JSON.stringify({ year: currYear - 1, n: 500 }));
    expect(peekNextDocNumber("OLD")).toBe(`OLD-${currYear}-100`);
  });
});

describe("doc-counter — garanții anti-coliziune", () => {
  beforeEach(() => localStorage.clear());

  it("1000 apeluri consecutive produc 1000 numere UNICE", () => {
    const set = new Set();
    for (let i = 0; i < 1000; i++) {
      set.add(nextDocNumber("TEST"));
    }
    expect(set.size).toBe(1000);
  });
});
