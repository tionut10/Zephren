/**
 * Teste pentru useAutoSaveStep1Draft — Sprint Smart Input 2026 (1.3)
 *
 * Testează doar API-ul pur (read/clear/hasUsableDraft/formatRelativeTime).
 * Hook-ul React în sine (useAutoSaveStep1Draft) e verificat manual în browser
 * — testarea cu @testing-library/react-hooks adaugă dependențe ne-justificate
 * pentru un hook de ~30 LOC.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readStep1Draft,
  clearStep1Draft,
  hasUsableDraft,
  formatRelativeTime,
} from "../useAutoSaveStep1Draft.js";

// ─────────────────────────────────────────────────────────────────────────────
// Mock localStorage (jsdom oferă deja, dar resetăm între teste)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "zephren_step1_draft_v1";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// readStep1Draft
// ─────────────────────────────────────────────────────────────────────────────

describe("readStep1Draft", () => {
  it("returnează null când nu există draft", () => {
    expect(readStep1Draft()).toBeNull();
  });

  it("returnează draft valid cu building + savedAt + fieldsCount", () => {
    const payload = {
      building: { category: "RI", yearBuilt: "1985", areaUseful: "120", locality: "Cluj" },
      savedAt: "2026-05-15T20:00:00Z",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const draft = readStep1Draft();
    expect(draft).not.toBeNull();
    expect(draft.building.category).toBe("RI");
    expect(draft.savedAt).toBe("2026-05-15T20:00:00Z");
    expect(draft.fieldsCount).toBe(4); // category, yearBuilt, areaUseful, locality
  });

  it("returnează null pentru JSON corupt", () => {
    localStorage.setItem(STORAGE_KEY, "{invalid json");
    expect(readStep1Draft()).toBeNull();
  });

  it("returnează null când building lipsește din payload", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: "..." }));
    expect(readStep1Draft()).toBeNull();
  });

  it("ignoră câmpurile goale/null la calcul fieldsCount", () => {
    const payload = {
      building: {
        category: "RI", yearBuilt: "", areaUseful: null, locality: "Cluj",
        city: undefined, county: "  ", structure: "Diafragme",
      },
      savedAt: "2026-05-15T20:00:00Z",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const draft = readStep1Draft();
    expect(draft.fieldsCount).toBe(3); // category + locality + structure
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearStep1Draft
// ─────────────────────────────────────────────────────────────────────────────

describe("clearStep1Draft", () => {
  it("șterge draft-ul existent", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      building: { category: "RI" },
      savedAt: "2026-05-15T20:00:00Z",
    }));
    expect(readStep1Draft()).not.toBeNull();
    clearStep1Draft();
    expect(readStep1Draft()).toBeNull();
  });

  it("nu eșuează dacă nu există draft", () => {
    expect(() => clearStep1Draft()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasUsableDraft
// ─────────────────────────────────────────────────────────────────────────────

describe("hasUsableDraft", () => {
  it("returnează false când nu există draft", () => {
    expect(hasUsableDraft({})).toBe(false);
  });

  it("returnează true când draft are ≥2 câmpuri în plus față de current", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      building: {
        category: "RI", yearBuilt: "1985", areaUseful: "120", locality: "Cluj",
        structure: "Diafragme",
      },
      savedAt: "2026-05-15T20:00:00Z",
    }));
    expect(hasUsableDraft({ category: "RI", yearBuilt: "1985" })).toBe(true);
  });

  it("returnează false când draft are exact aceleași câmpuri ca current", () => {
    const sameBuilding = { category: "RI", yearBuilt: "1985", areaUseful: "120" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      building: sameBuilding,
      savedAt: "2026-05-15T20:00:00Z",
    }));
    expect(hasUsableDraft(sameBuilding)).toBe(false);
  });

  it("returnează false când current e mai bogat decât draft", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      building: { category: "RI" },
      savedAt: "2026-05-15T20:00:00Z",
    }));
    const richer = {
      category: "RI", yearBuilt: "1985", areaUseful: "120",
      locality: "Cluj", structure: "Diafragme",
    };
    expect(hasUsableDraft(richer)).toBe(false);
  });

  it("respectă minDeltaFields personalizat", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      building: { category: "RI", yearBuilt: "1985", areaUseful: "120" },
      savedAt: "2026-05-15T20:00:00Z",
    }));
    // current = 1 câmp, draft = 3 câmpuri → delta = 2
    expect(hasUsableDraft({ category: "RI" }, 2)).toBe(true);
    expect(hasUsableDraft({ category: "RI" }, 3)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRelativeTime
// ─────────────────────────────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  it("returnează 'recent' pentru input invalid", () => {
    expect(formatRelativeTime(null)).toBe("recent");
    expect(formatRelativeTime("not-a-date")).toBe("recent");
    expect(formatRelativeTime("")).toBe("recent");
  });

  it("formatează secunde", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T20:00:30Z"));
    expect(formatRelativeTime("2026-05-15T20:00:00Z")).toBe("acum câteva secunde");
    vi.useRealTimers();
  });

  it("formatează minute (singular și plural)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T20:01:30Z"));
    expect(formatRelativeTime("2026-05-15T20:00:00Z")).toBe("acum 2 minute");
    vi.setSystemTime(new Date("2026-05-15T20:00:30Z"));
    // Border: <60s = secunde, ≥60s = minut
    vi.setSystemTime(new Date("2026-05-15T20:01:00Z"));
    expect(formatRelativeTime("2026-05-15T20:00:00Z")).toBe("acum 1 minut");
    vi.useRealTimers();
  });

  it("formatează ore", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T22:00:00Z"));
    expect(formatRelativeTime("2026-05-15T20:00:00Z")).toBe("acum 2 ore");
    vi.useRealTimers();
  });

  it("formatează zile", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T20:00:00Z"));
    expect(formatRelativeTime("2026-05-15T20:00:00Z")).toBe("acum 3 zile");
    vi.useRealTimers();
  });
});
