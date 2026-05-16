/**
 * @vitest-environment jsdom
 *
 * proposed-measures.test.js — Sprint Suggestion Queue (16 mai 2026)
 *
 * Acoperă:
 *   - buildMeasure() validare schemă + categorii + status
 *   - proposeMeasure() adăugare + deduplicare
 *   - removeMeasure() / updateMeasure() / clearAll()
 *   - getMeasures() filtru
 *   - subscribe() notificări
 *   - Persistența localStorage (cu jsdom mock)
 *   - Imutabilitate câmpuri protejate (id, sourceStep, proposedAt, catalogEntryId)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  buildMeasure,
  proposeMeasure,
  removeMeasure,
  updateMeasure,
  clearAll,
  getMeasures,
  getMeasuresStats,
  subscribeProposedMeasures,
  MEASURE_CATEGORIES,
  MEASURE_STATUSES,
  MEASURE_SOURCES,
  _resetForTests,
} from "../proposed-measures.js";

beforeEach(() => {
  _resetForTests();
});

// ─── Constante ───────────────────────────────────────────────────────────────

describe("Constante exportate", () => {
  it("MEASURE_CATEGORIES include toate categoriile așteptate", () => {
    expect(MEASURE_CATEGORIES).toContain("heating");
    expect(MEASURE_CATEGORIES).toContain("acm");
    expect(MEASURE_CATEGORIES).toContain("cooling");
    expect(MEASURE_CATEGORIES).toContain("ventilation");
    expect(MEASURE_CATEGORIES).toContain("lighting");
    expect(MEASURE_CATEGORIES).toContain("pv");
    expect(MEASURE_CATEGORIES).toContain("solar-thermal");
    expect(MEASURE_CATEGORIES).toContain("envelope-opaque");
    expect(MEASURE_CATEGORIES.length).toBeGreaterThanOrEqual(13);
  });

  it("MEASURE_STATUSES = [proposed, edited, approved, rejected]", () => {
    expect(MEASURE_STATUSES).toEqual(["proposed", "edited", "approved", "rejected"]);
  });

  it("MEASURE_SOURCES include Step3, Step4, Step7-auto, manual", () => {
    expect(MEASURE_SOURCES).toContain("Step3");
    expect(MEASURE_SOURCES).toContain("Step4");
    expect(MEASURE_SOURCES).toContain("Step7-auto");
    expect(MEASURE_SOURCES).toContain("manual");
  });

  it("constantele sunt frozen (imutabile)", () => {
    expect(Object.isFrozen(MEASURE_CATEGORIES)).toBe(true);
    expect(Object.isFrozen(MEASURE_STATUSES)).toBe(true);
    expect(Object.isFrozen(MEASURE_SOURCES)).toBe(true);
  });
});

// ─── buildMeasure ────────────────────────────────────────────────────────────

describe("buildMeasure()", () => {
  it("construiește un obiect cu id, status='proposed', proposedAt ISO", () => {
    const entry = { id: "PC_AA_R290", label: "Pompă căldură aer-aer", tech: { SCOP: 4.2 } };
    const m = buildMeasure(entry, { sourceStep: "Step3", category: "heating" });

    expect(m.id).toMatch(/^pm_/);
    expect(m.status).toBe("proposed");
    expect(m.sourceStep).toBe("Step3");
    expect(m.category).toBe("heating");
    expect(m.catalogEntryId).toBe("PC_AA_R290");
    expect(m.label).toBe("Pompă căldură aer-aer");
    expect(m.tech.SCOP).toBe(4.2);
    expect(m.proposedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("copiază profund tech, priceRange, tags, warnings (nu shared reference)", () => {
    const entry = {
      id: "X",
      label: "X",
      tech: { COP: 3 },
      priceRange: { min: 100, max: 200 },
      tags: ["nZEB"],
      warnings: ["test"],
    };
    const m = buildMeasure(entry, { sourceStep: "Step3", category: "heating" });
    entry.tech.COP = 99;
    entry.tags.push("modified");
    expect(m.tech.COP).toBe(3);
    expect(m.tags).toEqual(["nZEB"]);
  });

  it("aruncă eroare pentru entry null/invalid", () => {
    expect(() => buildMeasure(null, { sourceStep: "Step3", category: "heating" })).toThrow();
    expect(() => buildMeasure(undefined, { sourceStep: "Step3", category: "heating" })).toThrow();
  });

  it("aruncă eroare pentru categorie invalidă", () => {
    expect(() => buildMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "invalid-cat" }))
      .toThrow(/invalid category/);
  });

  it("aruncă eroare pentru sourceStep invalid", () => {
    expect(() => buildMeasure({ id: "X", label: "X" }, { sourceStep: "InvalidStep", category: "heating" }))
      .toThrow(/invalid sourceStep/);
  });

  it("fallback label dacă entry.label lipsește", () => {
    const m = buildMeasure({ id: "X", name: "Nume alternativ" }, { sourceStep: "Step3", category: "heating" });
    expect(m.label).toBe("Nume alternativ");
  });

  it("fallback la 'Măsură fără denumire' dacă nici label nici name", () => {
    const m = buildMeasure({ id: "X" }, { sourceStep: "Step3", category: "heating" });
    expect(m.label).toBe("Măsură fără denumire");
  });
});

// ─── proposeMeasure ──────────────────────────────────────────────────────────

describe("proposeMeasure()", () => {
  it("adaugă o măsură nouă în coadă", () => {
    const result = proposeMeasure(
      { id: "PC_AA", label: "Pompă căldură" },
      { sourceStep: "Step3", category: "heating" }
    );
    expect(result.duplicate).toBe(false);
    expect(result.id).toMatch(/^pm_/);

    const list = getMeasures();
    expect(list).toHaveLength(1);
    expect(list[0].catalogEntryId).toBe("PC_AA");
  });

  it("NU duplică aceeași măsură (catalogEntryId + sourceStep)", () => {
    proposeMeasure({ id: "PC_AA", label: "PC" }, { sourceStep: "Step3", category: "heating" });
    const result2 = proposeMeasure({ id: "PC_AA", label: "PC v2" }, { sourceStep: "Step3", category: "heating" });

    expect(result2.duplicate).toBe(true);
    expect(getMeasures()).toHaveLength(1);
  });

  it("ACCEPTĂ aceeași entry din sursă diferită", () => {
    proposeMeasure({ id: "X", label: "Y" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "X", label: "Y" }, { sourceStep: "Step4", category: "heat-pump" });
    expect(getMeasures()).toHaveLength(2);
  });

  it("permite re-propunere după rejected", () => {
    const { id } = proposeMeasure({ id: "X", label: "Y" }, { sourceStep: "Step3", category: "heating" });
    updateMeasure(id, { status: "rejected" });
    const result2 = proposeMeasure({ id: "X", label: "Y" }, { sourceStep: "Step3", category: "heating" });
    expect(result2.duplicate).toBe(false);
    expect(getMeasures().filter(m => m.status !== "rejected")).toHaveLength(1);
    expect(getMeasures()).toHaveLength(2); // rejected + new proposed
  });
});

// ─── removeMeasure ───────────────────────────────────────────────────────────

describe("removeMeasure()", () => {
  it("șterge măsura după id", () => {
    const { id } = proposeMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "heating" });
    expect(removeMeasure(id)).toBe(true);
    expect(getMeasures()).toHaveLength(0);
  });

  it("returnează false pentru id inexistent", () => {
    expect(removeMeasure("pm_inexistent")).toBe(false);
  });
});

// ─── updateMeasure ───────────────────────────────────────────────────────────

describe("updateMeasure()", () => {
  it("actualizează status valid", () => {
    const { id } = proposeMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "heating" });
    expect(updateMeasure(id, { status: "approved" })).toBe(true);
    expect(getMeasures()[0].status).toBe("approved");
  });

  it("respinge status invalid", () => {
    const { id } = proposeMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "heating" });
    expect(updateMeasure(id, { status: "invalid-status" })).toBe(false);
    expect(getMeasures()[0].status).toBe("proposed");
  });

  it("ignoră silent câmpurile protejate (id, sourceStep, proposedAt, catalogEntryId)", () => {
    const { id } = proposeMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "heating" });
    updateMeasure(id, {
      id: "pm_hack",
      sourceStep: "Step4",
      proposedAt: "2000-01-01",
      catalogEntryId: "HACK",
      auditorNotes: "ok",
    });
    const m = getMeasures()[0];
    expect(m.id).toBe(id); // neschimbat
    expect(m.sourceStep).toBe("Step3");
    expect(m.catalogEntryId).toBe("X");
    expect(m.auditorNotes).toBe("ok"); // doar non-protected aplicat
  });

  it("permite auditorEdits + auditorNotes free-form", () => {
    const { id } = proposeMeasure({ id: "X", label: "X" }, { sourceStep: "Step3", category: "heating" });
    updateMeasure(id, {
      auditorEdits: { SCOP: 4.5 },
      auditorNotes: "Recomand modul invertor R290 pentru noxe minime",
    });
    expect(getMeasures()[0].auditorEdits).toEqual({ SCOP: 4.5 });
    expect(getMeasures()[0].auditorNotes).toContain("R290");
  });

  it("returnează false pentru id inexistent", () => {
    expect(updateMeasure("pm_inexistent", { status: "approved" })).toBe(false);
  });
});

// ─── getMeasures (filtru) ────────────────────────────────────────────────────

describe("getMeasures() — filtru", () => {
  beforeEach(() => {
    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "B", label: "B" }, { sourceStep: "Step3", category: "cooling" });
    proposeMeasure({ id: "C", label: "C" }, { sourceStep: "Step4", category: "pv" });
    // Aprobă una
    const list = getMeasures();
    updateMeasure(list[0].id, { status: "approved" });
  });

  it("fără filtru: toate măsurile", () => {
    expect(getMeasures()).toHaveLength(3);
  });

  it("filtru sourceStep='Step3': 2 măsuri", () => {
    expect(getMeasures({ sourceStep: "Step3" })).toHaveLength(2);
  });

  it("filtru sourceStep=['Step3', 'Step4']: 3 măsuri", () => {
    expect(getMeasures({ sourceStep: ["Step3", "Step4"] })).toHaveLength(3);
  });

  it("filtru category='pv': 1 măsură", () => {
    expect(getMeasures({ category: "pv" })).toHaveLength(1);
  });

  it("filtru status='approved': 1 măsură", () => {
    expect(getMeasures({ status: "approved" })).toHaveLength(1);
  });

  it("filtru combinat sourceStep='Step3' + status='approved': 1 măsură", () => {
    const list = getMeasures({ sourceStep: "Step3", status: "approved" });
    expect(list).toHaveLength(1);
    expect(list[0].catalogEntryId).toBe("A");
  });
});

// ─── getMeasuresStats ────────────────────────────────────────────────────────

describe("getMeasuresStats()", () => {
  it("conțeagă pe sursă + categorie + status", () => {
    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "B", label: "B" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "C", label: "C" }, { sourceStep: "Step4", category: "pv" });

    const stats = getMeasuresStats();
    expect(stats.total).toBe(3);
    expect(stats.bySource.Step3).toBe(2);
    expect(stats.bySource.Step4).toBe(1);
    expect(stats.byCategory.heating).toBe(2);
    expect(stats.byCategory.pv).toBe(1);
    expect(stats.byStatus.proposed).toBe(3);
  });

  it("returnează zero pentru coadă goală", () => {
    const stats = getMeasuresStats();
    expect(stats.total).toBe(0);
    expect(stats.bySource.Step3).toBe(0);
  });
});

// ─── clearAll ────────────────────────────────────────────────────────────────

describe("clearAll()", () => {
  it("șterge toate măsurile", () => {
    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "B", label: "B" }, { sourceStep: "Step4", category: "pv" });

    expect(clearAll()).toBe(true);
    expect(getMeasures()).toHaveLength(0);
  });

  it("returnează false dacă coada e deja goală", () => {
    expect(clearAll()).toBe(false);
  });
});

// ─── Subscribe + notify ──────────────────────────────────────────────────────

describe("subscribeProposedMeasures()", () => {
  it("notifică listener-ii la propunere", () => {
    let callCount = 0;
    const unsub = subscribeProposedMeasures(() => callCount++);

    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    proposeMeasure({ id: "B", label: "B" }, { sourceStep: "Step3", category: "cooling" });

    expect(callCount).toBe(2);
    unsub();

    proposeMeasure({ id: "C", label: "C" }, { sourceStep: "Step4", category: "pv" });
    expect(callCount).toBe(2); // nu mai primește (unsubscribed)
  });

  it("notifică la remove + update + clearAll", () => {
    let callCount = 0;
    subscribeProposedMeasures(() => callCount++);

    const { id } = proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    expect(callCount).toBe(1);

    updateMeasure(id, { status: "approved" });
    expect(callCount).toBe(2);

    removeMeasure(id);
    expect(callCount).toBe(3);

    proposeMeasure({ id: "B", label: "B" }, { sourceStep: "Step3", category: "heating" });
    clearAll();
    expect(callCount).toBe(5); // propose + clearAll
  });
});

// ─── Persistență localStorage ────────────────────────────────────────────────

describe("Persistență localStorage", () => {
  it("salvează automat după fiecare mutație", () => {
    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    const raw = localStorage.getItem("zephren_proposed_measures");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.measures).toHaveLength(1);
    expect(parsed.measures[0].catalogEntryId).toBe("A");
  });

  it("clearAll șterge și din localStorage", () => {
    proposeMeasure({ id: "A", label: "A" }, { sourceStep: "Step3", category: "heating" });
    clearAll();
    const raw = localStorage.getItem("zephren_proposed_measures");
    const parsed = JSON.parse(raw);
    expect(parsed.measures).toHaveLength(0);
  });
});
