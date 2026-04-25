/**
 * @vitest-environment jsdom
 *
 * Smoke tests Sprint B Task 1 — tab-usage tracker (Top 5 + pins)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  trackTabClick,
  getTopUsed,
  getPinnedTabs,
  togglePin,
  isPinned,
  getFrequentTabs,
  getClickCount,
  resetUsageData,
} from "../tab-usage.js";

const ALL_TABS = ["benchmark", "nzeb_check", "bacs", "sri", "verificare_U", "rehab", "pnrr", "lcc"];

describe("tab-usage — trackTabClick + getTopUsed", () => {
  beforeEach(() => resetUsageData());

  it("getTopUsed returnează [] când nu există usage", () => {
    expect(getTopUsed(ALL_TABS)).toEqual([]);
  });

  it("trackTabClick incrementează corect counter-ul", () => {
    trackTabClick("rehab");
    trackTabClick("rehab");
    trackTabClick("nzeb_check");
    expect(getClickCount("rehab")).toBe(2);
    expect(getClickCount("nzeb_check")).toBe(1);
    expect(getClickCount("bacs")).toBe(0);
  });

  it("getTopUsed sortează descrescător după click count", () => {
    trackTabClick("benchmark"); trackTabClick("benchmark"); trackTabClick("benchmark"); // 3
    trackTabClick("rehab"); trackTabClick("rehab"); // 2
    trackTabClick("sri"); // 1
    const top = getTopUsed(ALL_TABS, 5);
    expect(top[0]).toBe("benchmark");
    expect(top[1]).toBe("rehab");
    expect(top[2]).toBe("sri");
  });

  it("getTopUsed limitează la N", () => {
    // Click counts: a=1, b=2, c=3, d=4, e=5, f=6, g=7
    ["a","b","c","d","e","f","g"].forEach((id, idx) => {
      for (let i = 0; i <= idx; i++) trackTabClick(id);
    });
    const top = getTopUsed(["a","b","c","d","e","f","g"], 3);
    expect(top.length).toBe(3);
    expect(top).toEqual(["g", "f", "e"]); // top 3 cu cele mai multe clickuri
  });

  it("ignoră tab-uri cu 0 clickuri", () => {
    trackTabClick("rehab");
    const top = getTopUsed(ALL_TABS, 5);
    expect(top).toEqual(["rehab"]);
  });
});

describe("tab-usage — pins manuale", () => {
  beforeEach(() => resetUsageData());

  it("getPinnedTabs returnează [] inițial", () => {
    expect(getPinnedTabs()).toEqual([]);
  });

  it("togglePin adaugă un tab", () => {
    togglePin("rehab");
    expect(getPinnedTabs()).toEqual(["rehab"]);
    expect(isPinned("rehab")).toBe(true);
    expect(isPinned("bacs")).toBe(false);
  });

  it("togglePin elimină un tab existent", () => {
    togglePin("rehab");
    togglePin("rehab");
    expect(getPinnedTabs()).toEqual([]);
    expect(isPinned("rehab")).toBe(false);
  });

  it("togglePin păstrează ordinea adăugării", () => {
    togglePin("rehab");
    togglePin("bacs");
    togglePin("sri");
    expect(getPinnedTabs()).toEqual(["rehab", "bacs", "sri"]);
  });

  it("togglePin la limita de 5 înlocuiește cel mai vechi", () => {
    togglePin("a"); togglePin("b"); togglePin("c"); togglePin("d"); togglePin("e");
    expect(getPinnedTabs()).toEqual(["a", "b", "c", "d", "e"]);
    togglePin("f");
    expect(getPinnedTabs()).toEqual(["b", "c", "d", "e", "f"]); // a eliminat
    expect(getPinnedTabs().length).toBe(5);
  });
});

describe("tab-usage — getFrequentTabs (combinat pin + auto)", () => {
  beforeEach(() => resetUsageData());

  it("returnează pin-urile manuale dacă există", () => {
    togglePin("bacs");
    togglePin("sri");
    trackTabClick("rehab"); trackTabClick("rehab"); trackTabClick("rehab"); // mai multe click-uri pe rehab
    const result = getFrequentTabs(ALL_TABS);
    expect(result).toEqual(["bacs", "sri"]); // pin-urile au prioritate
  });

  it("returnează top auto-tracked dacă nu există pin-uri", () => {
    trackTabClick("rehab"); trackTabClick("rehab"); trackTabClick("rehab");
    trackTabClick("bacs"); trackTabClick("bacs");
    trackTabClick("sri");
    const result = getFrequentTabs(ALL_TABS);
    expect(result[0]).toBe("rehab");
    expect(result[1]).toBe("bacs");
    expect(result[2]).toBe("sri");
  });

  it("returnează [] dacă nu există nici pin-uri nici auto-tracking", () => {
    expect(getFrequentTabs(ALL_TABS)).toEqual([]);
  });
});

describe("tab-usage — robustness (corrupted localStorage)", () => {
  beforeEach(() => resetUsageData());

  it("recuperează din localStorage corupt fără crash", () => {
    localStorage.setItem("zephren_tab_usage", "{{{ malformed");
    expect(() => trackTabClick("rehab")).not.toThrow();
    expect(getClickCount("rehab")).toBe(1); // re-init
  });

  it("ignoră ID-uri null/undefined", () => {
    expect(() => trackTabClick(null)).not.toThrow();
    expect(() => trackTabClick(undefined)).not.toThrow();
    expect(() => togglePin(null)).not.toThrow();
  });
});
