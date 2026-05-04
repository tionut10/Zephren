import { describe, it, expect } from "vitest";
import {
  GLAZING_DB,
  FRAME_DB,
  SPACER_TYPES,
  U_REF_GLAZING,
  ELEMENT_CATEGORIES,
  getURefGlazing,
  computeUTotal,
  resolveSpacer,
  filterGlazingByCategory,
  countByCategory,
} from "../utils/glazingCalc.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Teste unitare — WizardGlazing: GLAZING_DB, FRAME_DB, computeUTotal,
//                                getURefGlazing (ISO 10077-1)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GLAZING_DB — structură ────────────────────────────────────────────────────
// Sprint Catalog NEUTRAL 30 apr 2026: GLAZING_DB conține legacy 7 + 22 noi
// din glazingTypes.json (deduplicate). Legacy 7 păstrate la index 0-6.
describe("GLAZING_DB — structură și valori", () => {
  it("conține minim 7 tipuri legacy + extindere catalog (>= 20 total)", () => {
    expect(GLAZING_DB.length).toBeGreaterThanOrEqual(7);
    expect(GLAZING_DB.length).toBeGreaterThanOrEqual(20);
  });

  it("legacy: primele 7 entries păstrate cu name/u/g/icon/desc", () => {
    for (let i = 0; i < 7; i++) {
      expect(GLAZING_DB[i]).toHaveProperty("name");
      expect(GLAZING_DB[i]).toHaveProperty("u");
      expect(GLAZING_DB[i]).toHaveProperty("g");
      expect(GLAZING_DB[i]).toHaveProperty("icon");
      expect(GLAZING_DB[i]).toHaveProperty("desc");
    }
  });

  it("prima intrare este 'Simplu vitraj' cu U=5.80 (cel mai slab)", () => {
    expect(GLAZING_DB[0].name).toBe("Simplu vitraj");
    expect(GLAZING_DB[0].u).toBe(5.80);
  });

  it("legacy: la index 6 este 'Triplu vitraj 2×Low-E' cu U=0.50 (top legacy)", () => {
    expect(GLAZING_DB[6].name).toBe("Triplu vitraj 2×Low-E");
    expect(GLAZING_DB[6].u).toBe(0.50);
  });

  it("legacy: U valorile sunt în ordine descrescătoare (performanță crescătoare) în primele 7", () => {
    for (let i = 0; i < 6; i++) {
      expect(GLAZING_DB[i].u).toBeGreaterThanOrEqual(GLAZING_DB[i + 1].u);
    }
  });

  it("'Dublu vitraj Low-E' are U=1.10 (atinge nZEB rezidențial)", () => {
    const dw = GLAZING_DB.find(g => g.name === "Dublu vitraj Low-E");
    expect(dw).toBeDefined();
    expect(dw.u).toBe(1.10);
    expect(dw.g).toBe(0.50);
  });

  it("toate valorile g sunt între 0 și 1 (uși plino-opace pot avea g=0)", () => {
    GLAZING_DB.forEach(gl => {
      // Batch C (4 mai 2026): uși exterioare opace au g=0 — acceptat.
      expect(gl.g).toBeGreaterThanOrEqual(0);
      expect(gl.g).toBeLessThanOrEqual(1);
    });
  });

  it("toate vitrajele (window/skylight/curtainwall) au g > 0", () => {
    GLAZING_DB.forEach(gl => {
      const cat = gl.elementCategory || "window";
      if (cat !== "door") {
        expect(gl.g).toBeGreaterThan(0);
      }
    });
  });

  it("conține entries noi din glazingTypes.json (BIPV, VIG, electrocrom)", () => {
    const names = GLAZING_DB.map(g => g.name);
    const hasInnovation = names.some(n => /BIPV|VIG|electrocrom|fotocrom/i.test(n));
    expect(hasInnovation).toBe(true);
  });
});

// ── FRAME_DB — structură ──────────────────────────────────────────────────────
describe("FRAME_DB — structură și valori", () => {
  it("conține minim 6 legacy + extindere (>= 15 total)", () => {
    expect(FRAME_DB.length).toBeGreaterThanOrEqual(6);
    expect(FRAME_DB.length).toBeGreaterThanOrEqual(15);
  });

  it("legacy: primele 6 entries păstrate cu name/u/icon/desc", () => {
    for (let i = 0; i < 6; i++) {
      expect(FRAME_DB[i]).toHaveProperty("name");
      expect(FRAME_DB[i]).toHaveProperty("u");
      expect(FRAME_DB[i]).toHaveProperty("icon");
      expect(FRAME_DB[i]).toHaveProperty("desc");
    }
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

  it("conține entries noi din frameTypes.json (PVC 7/8 camere, GFRP, Accoya)", () => {
    const names = FRAME_DB.map(f => f.name);
    const hasModern = names.some(n => /7 camere|8 camere|GFRP|Accoya|modificat termic/i.test(n));
    expect(hasModern).toBe(true);
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

// ── computeUTotal — validări fără clamp tăcut (P2-2 refactor) ────────────────
describe("computeUTotal — validări input fără clamp silentios", () => {
  it("arie validă 0.1 m² → calculează NORMAL (nu mai face clamp la 0.5)", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 0.1);
    expect(r.u).toBeGreaterThan(0);
    expect(Number.isFinite(r.u)).toBe(true);
    // 0.1 m² real produce U semnificativ mai mare decât 0.5 m² (perimetru relativ mai mare)
  });

  it("arie 0 → returnează rezultat invalid (u=0) cu warning explicit", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 0);
    expect(r.u).toBe(0);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.some(w => /Suprafață|invalidă/i.test(w))).toBe(true);
  });

  it("arie negativă → warning explicit", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, -5);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("frameRatio invalid → fallback 30% cu warning", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", "abc", 2);
    expect(r.warnings.some(w => /Fracție/i.test(w))).toBe(true);
  });

  it("input valid → array warnings gol", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    expect(r.warnings).toEqual([]);
  });
});

// ── SPACER_TYPES + resolveSpacer (P1-1) ──────────────────────────────────────
describe("SPACER_TYPES — ψ_spacer parametrizat (EN ISO 10077-1 §E)", () => {
  it("conține 5 tipuri (alu_clasic / alu_modern / warm_edge_std / warm_edge_premium / foam_passivhaus)", () => {
    expect(SPACER_TYPES).toHaveLength(5);
    const ids = SPACER_TYPES.map(s => s.id);
    expect(ids).toContain("alu_clasic");
    expect(ids).toContain("warm_edge_std");
    expect(ids).toContain("foam_passivhaus");
  });

  it("ψ scade pe ordinea tipurilor (alu_clasic > foam_passivhaus)", () => {
    const aluClasic = SPACER_TYPES.find(s => s.id === "alu_clasic");
    const foam = SPACER_TYPES.find(s => s.id === "foam_passivhaus");
    expect(aluClasic.psi).toBeGreaterThan(foam.psi);
  });

  it("toate au psiRange.min ≤ psi ≤ psiRange.max", () => {
    SPACER_TYPES.forEach(s => {
      expect(s.psiRange.min).toBeLessThanOrEqual(s.psi);
      expect(s.psi).toBeLessThanOrEqual(s.psiRange.max);
    });
  });

  it("toate au sursă normativă citată", () => {
    SPACER_TYPES.forEach(s => {
      expect(typeof s.source).toBe("string");
      expect(s.source.length).toBeGreaterThan(10);
    });
  });

  it("alu_clasic ψ ≈ 0.10 (EN ISO 10077-1 Tab E.1)", () => {
    expect(SPACER_TYPES.find(s => s.id === "alu_clasic").psi).toBeCloseTo(0.10, 2);
  });

  it("warm_edge_std ψ ≈ 0.05 (TGI/Swisspacer V)", () => {
    expect(SPACER_TYPES.find(s => s.id === "warm_edge_std").psi).toBeCloseTo(0.05, 2);
  });

  it("foam_passivhaus ψ ≤ 0.03 (PHI certified)", () => {
    expect(SPACER_TYPES.find(s => s.id === "foam_passivhaus").psi).toBeLessThanOrEqual(0.03);
  });
});

describe("resolveSpacer — id explicit + fallback heuristic legacy", () => {
  it("id explicit 'warm_edge_premium' → returnează acel tip", () => {
    expect(resolveSpacer("warm_edge_premium").id).toBe("warm_edge_premium");
  });

  it("id necunoscut + nume ramă conține 'Aluminiu' → alu_clasic (legacy compat)", () => {
    expect(resolveSpacer("xxx", "Aluminiu cu RPT").id).toBe("alu_clasic");
  });

  it("id necunoscut + ramă PVC → warm_edge_std (default modern)", () => {
    expect(resolveSpacer(undefined, "PVC (5 camere)").id).toBe("warm_edge_std");
  });

  it("id null + ramă null → warm_edge_std", () => {
    expect(resolveSpacer(null, null).id).toBe("warm_edge_std");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Batch C (4 mai 2026) — catalog vitraje extins cu elementCategory
// 22 windows + 10 doors + 6 skylights + 4 curtain wall = 42 entries (1 legacy dedup)
// ═══════════════════════════════════════════════════════════════════════════════

describe("ELEMENT_CATEGORIES — schema 4 categorii (P1-3 fix)", () => {
  it("conține 4 categorii (window, door, skylight, curtainwall)", () => {
    expect(ELEMENT_CATEGORIES).toHaveLength(4);
    const ids = ELEMENT_CATEGORIES.map(c => c.id);
    expect(ids).toEqual(["window", "door", "skylight", "curtainwall"]);
  });

  it("fiecare categorie are id și label", () => {
    ELEMENT_CATEGORIES.forEach(c => {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("label");
    });
  });
});

describe("filterGlazingByCategory — filtrare per tip element vitrat (P1-3)", () => {
  it("category 'window' returnează minim 20 entries (vitraje + fallback legacy)", () => {
    const windows = filterGlazingByCategory("window");
    expect(windows.length).toBeGreaterThanOrEqual(20);
  });

  it("category 'door' returnează minim 10 uși (P1-2)", () => {
    const doors = filterGlazingByCategory("door");
    expect(doors.length).toBeGreaterThanOrEqual(10);
    doors.forEach(d => expect(d.elementCategory).toBe("door"));
  });

  it("category 'skylight' returnează minim 6 luminator/lucarne (P1-4)", () => {
    const sk = filterGlazingByCategory("skylight");
    expect(sk.length).toBeGreaterThanOrEqual(6);
    sk.forEach(s => expect(s.elementCategory).toBe("skylight"));
  });

  it("category 'curtainwall' returnează minim 4 perete cortină (P1-4)", () => {
    const cw = filterGlazingByCategory("curtainwall");
    expect(cw.length).toBeGreaterThanOrEqual(4);
    cw.forEach(c => expect(c.elementCategory).toBe("curtainwall"));
  });

  it("category necunoscută → array gol (sau doar fallback)", () => {
    const r = filterGlazingByCategory("xxx");
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("countByCategory — numărători per categorie", () => {
  it("returnează obiect cu 4 chei: window/door/skylight/curtainwall", () => {
    const counts = countByCategory();
    expect(counts).toHaveProperty("window");
    expect(counts).toHaveProperty("door");
    expect(counts).toHaveProperty("skylight");
    expect(counts).toHaveProperty("curtainwall");
  });

  it("door = 10 entries (P1-2 cerință minimă)", () => {
    const counts = countByCategory();
    expect(counts.door).toBeGreaterThanOrEqual(10);
  });

  it("skylight = 6 entries", () => {
    const counts = countByCategory();
    expect(counts.skylight).toBeGreaterThanOrEqual(6);
  });

  it("curtainwall = 4 entries", () => {
    const counts = countByCategory();
    expect(counts.curtainwall).toBeGreaterThanOrEqual(4);
  });

  it("total counts ≥ 40 (catalog v2.0 extins)", () => {
    const counts = countByCategory();
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    expect(total).toBeGreaterThanOrEqual(40);
  });
});

describe("Catalog vitraje v2.0 — coverage uși exterioare critice", () => {
  it("acoperă uși standard (sandwich EPS), Passivhaus, automate, antifoc", () => {
    const doors = filterGlazingByCategory("door");
    const ids = doors.map(d => d.id);
    expect(ids.some(id => /sandwich/i.test(id))).toBe(true); // ușă standard
    expect(ids.some(id => /passive|ph/i.test(id))).toBe(true); // PH certif
    expect(ids.some(id => /glisanta|auto/i.test(id))).toBe(true); // automată
    expect(ids.some(id => /tehnic|antifoc/i.test(id))).toBe(true); // antifoc
  });

  it("Ud Passivhaus ≤ 0.85 W/m²K (PHI clasa A)", () => {
    const ph = GLAZING_DB.find(g => g.id === "DR-passive-pu-100-ph");
    expect(ph).toBeDefined();
    expect(ph.u).toBeLessThanOrEqual(0.85);
  });

  it("toate ușile au g=0 (panou opac) sau g≤0.65 (parțial vitrate)", () => {
    const doors = filterGlazingByCategory("door");
    doors.forEach(d => {
      expect(d.g).toBeLessThanOrEqual(0.66);
    });
  });
});

describe("Catalog vitraje v2.0 — coverage skylight/curtain wall", () => {
  it("skylight include Velux + Cupolă PMMA + Subsol + bandou", () => {
    const sk = filterGlazingByCategory("skylight");
    const ids = sk.map(s => s.id);
    expect(ids.some(id => /velux/i.test(id))).toBe(true);
    expect(ids.some(id => /cupola|pmma/i.test(id))).toBe(true);
    expect(ids.some(id => /subsol/i.test(id))).toBe(true);
  });

  it("curtainwall include stick + unitized + vitrină + atrium", () => {
    const cw = filterGlazingByCategory("curtainwall");
    const ids = cw.map(c => c.id);
    expect(ids.some(id => /stick/i.test(id))).toBe(true);
    expect(ids.some(id => /unitized/i.test(id))).toBe(true);
    expect(ids.some(id => /vitrina/i.test(id))).toBe(true);
    expect(ids.some(id => /atrium/i.test(id))).toBe(true);
  });

  it("CW unitized TGU performance: U ≤ 1.0 W/m²K (premium)", () => {
    const cwUnitized = GLAZING_DB.find(g => g.id === "CW-unitized-alu-tgu");
    expect(cwUnitized).toBeDefined();
    expect(cwUnitized.u).toBeLessThanOrEqual(1.0);
  });
});

describe("computeUTotal — spacerId parametru explicit", () => {
  it("spacerId 'foam_passivhaus' → ΔU_spacer mai mic decât 'alu_clasic'", () => {
    const rPh   = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2, "foam_passivhaus");
    const rAlu  = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2, "alu_clasic");
    expect(rPh.deltaUSpacer).toBeLessThan(rAlu.deltaUSpacer);
    expect(rPh.psiSpacer).toBeLessThan(rAlu.psiSpacer);
  });

  it("rezultat include psiSpacer și spacerLabel", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2, "warm_edge_std");
    expect(r.psiSpacer).toBeGreaterThan(0);
    expect(typeof r.spacerLabel).toBe("string");
    expect(r.spacerId).toBe("warm_edge_std");
  });

  it("spacerId omis + ramă PVC → fallback legacy ψ=0.04 (warm_edge_std)", () => {
    const r = computeUTotal("Dublu vitraj Low-E", "PVC (5 camere)", 30, 2);
    expect(r.spacerId).toBe("warm_edge_std");
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
