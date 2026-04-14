import { describe, it, expect } from "vitest";
import {
  GLAZING_DB,
  FRAME_DB,
  U_REF_GLAZING,
  getURefGlazing,
  computeUTotal,
} from "../utils/glazingCalc.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Teste unitare — WizardGlazing: GLAZING_DB, FRAME_DB, computeUTotal,
//                                getURefGlazing (ISO 10077-1)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GLAZING_DB — structură ────────────────────────────────────────────────────
describe("GLAZING_DB — structură și valori", () => {
  it("conține exact 7 tipuri de vitraj", () => {
    expect(GLAZING_DB).toHaveLength(7);
  });

  it("fiecare intrare are name, u, g, icon, desc", () => {
    GLAZING_DB.forEach(gl => {
      expect(gl).toHaveProperty("name");
      expect(gl).toHaveProperty("u");
      expect(gl).toHaveProperty("g");
      expect(gl).toHaveProperty("icon");
      expect(gl).toHaveProperty("desc");
    });
  });

  it("prima intrare este 'Simplu vitraj' cu U=5.80 (cel mai slab)", () => {
    expect(GLAZING_DB[0].name).toBe("Simplu vitraj");
    expect(GLAZING_DB[0].u).toBe(5.80);
  });

  it("ultima intrare este 'Triplu vitraj 2×Low-E' cu U=0.50 (cel mai performant)", () => {
    const last = GLAZING_DB[GLAZING_DB.length - 1];
    expect(last.name).toBe("Triplu vitraj 2×Low-E");
    expect(last.u).toBe(0.50);
  });

  it("U valorile sunt în ordine descrescătoare (performanță crescătoare)", () => {
    for (let i = 0; i < GLAZING_DB.length - 1; i++) {
      expect(GLAZING_DB[i].u).toBeGreaterThanOrEqual(GLAZING_DB[i + 1].u);
    }
  });

  it("'Dublu vitraj Low-E' are U=1.10 (atinge nZEB rezidențial)", () => {
    const dw = GLAZING_DB.find(g => g.name === "Dublu vitraj Low-E");
    expect(dw).toBeDefined();
    expect(dw.u).toBe(1.10);
    expect(dw.g).toBe(0.50);
  });

  it("toate valorile g sunt între 0 și 1", () => {
    GLAZING_DB.forEach(gl => {
      expect(gl.g).toBeGreaterThan(0);
      expect(gl.g).toBeLessThanOrEqual(1);
    });
  });
});

// ── FRAME_DB — structură ──────────────────────────────────────────────────────
describe("FRAME_DB — structură și valori", () => {
  it("conține exact 6 tipuri de ramă", () => {
    expect(FRAME_DB).toHaveLength(6);
  });

  it("fiecare intrare are name, u, icon, desc", () => {
    FRAME_DB.forEach(fr => {
      expect(fr).toHaveProperty("name");
      expect(fr).toHaveProperty("u");
      expect(fr).toHaveProperty("icon");
      expect(fr).toHaveProperty("desc");
    });
  });

  it("'Aluminiu fără RPT' are U=5.0 (cea mai slabă performanță)", () => {
    const al = FRAME_DB.find(f => f.name === "Aluminiu fără RPT");
    expect(al).toBeDefined();
    expect(al.u).toBe(5.00);
  });

  it("'PVC (6-7 camere)' are U=1.10 (nZEB-ready)", () => {
    const pvc = FRAME_DB.find(f => f.name === "PVC (6-7 camere)");
    expect(pvc).toBeDefined();
    expect(pvc.u).toBe(1.10);
  });

  it("toate valorile U sunt > 0", () => {
    FRAME_DB.forEach(fr => {
      expect(fr.u).toBeGreaterThan(0);
    });
  });
});

// ── computeUTotal — input invalid ─────────────────────────────────────────────
describe("computeUTotal — input invalid", () => {
  it("vitraj necunoscut → u=0", () => {
    const r = computeUTotal("Vitraj inexistent", "PVC (5 camere)", 30, 2);
    expect(r.u).toBe(0);
  });

  it("ramă necunoscută → u=0", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "Ramă inexistentă", 30, 2);
    expect(r.u).toBe(0);
  });

  it("ambele necunoscute → returnează { u: 0, g: 0 }", () => {
    const r = computeUTotal("X", "Y", 30, 2);
    expect(r.u).toBe(0);
    expect(r.g).toBe(0);
  });
});

// ── computeUTotal — calcul corect ─────────────────────────────────────────────
describe("computeUTotal — calcul ISO 10077-1", () => {
  // Dublu vitraj Low-E (u=1.10, g=0.50) + PVC 5 camere (u=1.30) + 30% frame + 2m²
  const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);

  it("returnează u > 0", () => {
    expect(r.u).toBeGreaterThan(0);
  });

  it("returnează g efectiv = g_vitraj * (1 - frameRatio)", () => {
    // g = 0.50 * (1 - 0.30) = 0.35
    expect(r.g).toBeCloseTo(0.35, 3);
  });

  it("returnează uGlass = 1.10 (vitraj Low-E)", () => {
    expect(r.uGlass).toBe(1.10);
  });

  it("returnează uFrame = 1.30 (PVC 5 camere)", () => {
    expect(r.uFrame).toBe(1.30);
  });

  it("deltaUSpacer > 0 (punte termică distanțier)", () => {
    expect(r.deltaUSpacer).toBeGreaterThan(0);
  });

  it("u total = u_vitraj*0.7 + u_rama*0.3 + ΔU_spacer", () => {
    const expected = 1.10 * 0.7 + 1.30 * 0.3 + r.deltaUSpacer;
    expect(r.u).toBeCloseTo(expected, 5);
  });
});

describe("computeUTotal — efect ramă Aluminiu (ψ spacer mai mare)", () => {
  it("Aluminiu fără RPT are psiSpacer=0.08 (dublu față de PVC)", () => {
    const rAl = computeUTotal("Dublu vitraj Low-E", "Aluminiu fără RPT", 30, 2);
    const rPvc = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    // Aluminiu are deltaUSpacer mai mare din cauza psiSpacer=0.08 vs 0.04
    expect(rAl.deltaUSpacer).toBeGreaterThan(rPvc.deltaUSpacer);
  });

  it("u total cu Aluminiu fără RPT >> u total cu PVC (U ramă mult mai mare)", () => {
    const rAl = computeUTotal("Dublu vitraj Low-E", "Aluminiu fără RPT", 30, 2);
    const rPvc = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    expect(rAl.u).toBeGreaterThan(rPvc.u);
  });
});

describe("computeUTotal — efect fracție ramă", () => {
  it("fracție ramă mai mare → u total mai mare (ramă cu U mai mare decât vitrajul)", () => {
    const r30 = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    const r50 = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 50, 2);
    expect(r50.u).toBeGreaterThan(r30.u);
  });

  it("fracție ramă mai mare → g efectiv mai mic", () => {
    const r30 = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    const r50 = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 50, 2);
    expect(r50.g).toBeLessThan(r30.g);
  });
});

describe("computeUTotal — clampare arie minimă 0.5 m²", () => {
  it("arie 0.1 m² (sub minim) → același rezultat ca 0.5 m²", () => {
    const rMic = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 0.1);
    const rClamp = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 0.5);
    expect(rMic.u).toBeCloseTo(rClamp.u, 5);
  });

  it("arie 0 sau lipsă → clampat la 0.5, nu produce NaN", () => {
    const r = computeUTotal("Duplu vitraj Low-E", "PVC (5 camere)", 30, 0);
    expect(Number.isNaN(r.u)).toBe(false);
  });
});

// ── getURefGlazing — U referință vitraj ───────────────────────────────────────
describe("getURefGlazing — referințe nZEB (Mc 001-2022)", () => {
  it("RI (rezidențial) fereastră → 1.11", () => {
    expect(getURefGlazing("RI", false)).toBe(1.11);
  });

  it("RC (rezidențial colectiv) fereastră → 1.11", () => {
    expect(getURefGlazing("RC", false)).toBe(1.11);
  });

  it("RA (rezidențial asociat) fereastră → 1.11", () => {
    expect(getURefGlazing("RA", false)).toBe(1.11);
  });

  it("BI (birouri, nerezidențial) fereastră → 1.20", () => {
    expect(getURefGlazing("BI", false)).toBe(1.20);
  });

  it("SA (sănătate, nerezidențial) fereastră → 1.20", () => {
    expect(getURefGlazing("SA", false)).toBe(1.20);
  });

  it("orice categorie, isDoor=true → 1.30", () => {
    expect(getURefGlazing("RI", true)).toBe(1.30);
    expect(getURefGlazing("BI", true)).toBe(1.30);
  });

  it("U_REF_GLAZING.nzeb_res = 1.11", () => {
    expect(U_REF_GLAZING.nzeb_res).toBe(1.11);
  });

  it("U_REF_GLAZING.door = 1.30", () => {
    expect(U_REF_GLAZING.door).toBe(1.30);
  });
});
