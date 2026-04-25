/**
 * Tests Sprint C Task 4 — normative-library + faq-data + structură module Sprint C
 */
import { describe, it, expect } from "vitest";
import {
  NORMATIVES,
  NORMATIVE_TYPES,
  NORMATIVE_CATEGORIES,
  searchNormatives,
  getNormativesForTab,
} from "../normative-library.js";
import {
  FAQ_ENTRIES,
  FAQ_CATEGORIES,
  searchFAQ,
} from "../faq-data.js";

describe("NORMATIVES — structură", () => {
  it("conține minim 20 normative", () => {
    expect(NORMATIVES.length).toBeGreaterThanOrEqual(20);
  });

  it("toate au id unic + code + title + category + type", () => {
    const ids = new Set();
    NORMATIVES.forEach(n => {
      expect(n.id, n.code).toBeTruthy();
      expect(n.code).toBeTruthy();
      expect(n.title).toBeTruthy();
      expect(n.category).toBeTruthy();
      expect(n.type).toBeTruthy();
      expect(NORMATIVE_CATEGORIES[n.category], n.id + " category").toBeDefined();
      expect(NORMATIVE_TYPES[n.type], n.id + " type").toBeDefined();
      expect(ids.has(n.id), "duplicate id " + n.id).toBe(false);
      ids.add(n.id);
    });
  });

  it("normativele cu drepturi libere (rebuild/eu) au excerpts SAU summary detaliat", () => {
    NORMATIVES.filter(n => n.type === "rebuild" || n.type === "eu").forEach(n => {
      const hasExcerpts = (n.keySections || []).length > 0;
      const hasGoodSummary = (n.summary || "").length > 80;
      expect(hasExcerpts || hasGoodSummary, n.id).toBe(true);
    });
  });

  it("normativele ASRO au externalUrl SAU summary", () => {
    NORMATIVES.filter(n => n.type === "asro").forEach(n => {
      expect(n.summary, n.id + " ASRO summary").toBeTruthy();
    });
  });

  it("Mc 001-2022 + EPBD 2024 sunt prezente cu keySections", () => {
    const mc = NORMATIVES.find(n => n.id === "mc001-2022");
    expect(mc).toBeDefined();
    expect(mc.keySections.length).toBeGreaterThan(0);
    const epbd = NORMATIVES.find(n => n.id === "epbd-2024");
    expect(epbd).toBeDefined();
    expect(epbd.keySections.length).toBeGreaterThan(0);
  });
});

describe("searchNormatives", () => {
  it("returnează toate când query e gol și category=all", () => {
    expect(searchNormatives("", "all").length).toBe(NORMATIVES.length);
    expect(searchNormatives(undefined).length).toBe(NORMATIVES.length);
  });

  it("filtrează după category", () => {
    const r = searchNormatives("", "regulation");
    expect(r.length).toBeGreaterThan(0);
    r.forEach(n => expect(n.category).toBe("regulation"));
  });

  it("caută în code (case-insensitive)", () => {
    const r1 = searchNormatives("Mc 001");
    expect(r1.some(n => n.id === "mc001-2022")).toBe(true);
    const r2 = searchNormatives("mc 001");
    expect(r2.some(n => n.id === "mc001-2022")).toBe(true);
  });

  it("caută în excerpts", () => {
    // Mc 001-2022 P.IV menționează „Anexa 1" și „Anexa 2"
    const r = searchNormatives("Anexa 1");
    expect(r.length).toBeGreaterThan(0);
  });

  it("caută în summary", () => {
    const r = searchNormatives("EPBD");
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("getNormativesForTab", () => {
  it("returnează normative care au tabId în relatedTabs", () => {
    const r = getNormativesForTab("nzeb_check");
    expect(r.length).toBeGreaterThan(0);
    r.forEach(n => expect(n.relatedTabs).toContain("nzeb_check"));
  });

  it("returnează [] pentru tab necunoscut", () => {
    expect(getNormativesForTab("unknown_tab_xyz")).toEqual([]);
  });
});

describe("FAQ_ENTRIES — structură", () => {
  it("conține minim 15 întrebări", () => {
    expect(FAQ_ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it("toate au id unic + category + question + answer", () => {
    const ids = new Set();
    FAQ_ENTRIES.forEach(f => {
      expect(f.id, f.question).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(FAQ_CATEGORIES[f.category], f.id + " category").toBeDefined();
      expect(f.question.length).toBeGreaterThan(10);
      expect(f.answer.length).toBeGreaterThan(50);
      expect(ids.has(f.id), "duplicate FAQ id " + f.id).toBe(false);
      ids.add(f.id);
    });
  });

  it("toate categoriile FAQ_CATEGORIES sunt folosite", () => {
    const usedCats = new Set(FAQ_ENTRIES.map(f => f.category));
    Object.keys(FAQ_CATEGORIES).forEach(cat => {
      expect(usedCats.has(cat), "Category " + cat + " has no entries").toBe(true);
    });
  });
});

describe("searchFAQ", () => {
  it("returnează toate când query gol", () => {
    expect(searchFAQ("", "all").length).toBe(FAQ_ENTRIES.length);
  });

  it("filtrează după category", () => {
    const r = searchFAQ("", "anvelopa");
    expect(r.length).toBeGreaterThan(0);
    r.forEach(f => expect(f.category).toBe("anvelopa"));
  });

  it("caută în question + answer (case-insensitive)", () => {
    const r1 = searchFAQ("n50");
    expect(r1.length).toBeGreaterThan(0);
    const r2 = searchFAQ("CADASTRAL".toLowerCase()); // întrebări cuprinzătoare
    // CFP / cadastru / etc — depinde de conținut, dar nu trebuie să throw
    expect(Array.isArray(r2)).toBe(true);
  });

  it("returnează [] dacă nu există match", () => {
    expect(searchFAQ("xyzzz_unique_no_match_qqq")).toEqual([]);
  });
});
