import { describe, it, expect } from "vitest";
import { checkNZEBCompliance, checkEnvelopeUmax, NZEB_U_MAX } from "../nzeb-check.js";

describe("Sprint 19: nZEB — verificare U'max per element (SR EN ISO 52018-1/NA:2023)", () => {
  describe("NZEB_U_MAX — valori Tab A.2b / A.3", () => {
    it("Rezidențial: pereți 0,20 · teras 0,17 · ferestre 1,20", () => {
      expect(NZEB_U_MAX.residential.PE).toBe(0.20);
      expect(NZEB_U_MAX.residential.AC).toBe(0.17);
      expect(NZEB_U_MAX.residential.FE).toBe(1.20);
    });

    it("Nerezidențial: pereți 0,22 · teras 0,17 · ferestre 1,30", () => {
      expect(NZEB_U_MAX.nonresidential.PE).toBe(0.22);
      expect(NZEB_U_MAX.nonresidential.AC).toBe(0.17);
      expect(NZEB_U_MAX.nonresidential.FE).toBe(1.30);
    });
  });

  describe("checkEnvelopeUmax — detectare violări", () => {
    it("Rezidențial cu pereți U=0,25 → violare (>0,20)", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [{ type: "PE", name: "Perete N", U: 0.25 }],
        glazingElements: [],
        category: "RI",
      });
      expect(r.ok).toBe(false);
      expect(r.violations).toHaveLength(1);
      expect(r.violations[0].type).toBe("PE");
      expect(r.violations[0].uMax).toBe(0.20);
      expect(r.violations[0].deltaPct).toBeCloseTo(25, 0);
    });

    it("Rezidențial cu pereți U=0,18 → conform", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [{ type: "PE", name: "Perete N", U: 0.18 }],
        glazingElements: [],
        category: "RI",
      });
      expect(r.ok).toBe(true);
      expect(r.violations).toHaveLength(0);
    });

    it("Nerezidențial permite pereți 0,22 (mai indulgent)", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [{ type: "PE", name: "Perete", U: 0.22 }],
        glazingElements: [],
        category: "BI",
      });
      expect(r.ok).toBe(true);
      expect(r.uMaxSet).toBe("nonresidential");
    });

    it("Ferestre rezidențial U=1,4 → violare (>1,20)", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [],
        glazingElements: [{ u: 1.4, orientation: "S" }],
        category: "RI",
      });
      expect(r.ok).toBe(false);
      expect(r.violations[0].type).toBe("FE");
      expect(r.violations[0].uMax).toBe(1.20);
    });

    it("Multiple violări raportate împreună", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [
          { type: "PE", U: 0.30 }, // violare
          { type: "AC", U: 0.15 }, // conform
          { type: "PS", U: 0.40 }, // violare (>0,29)
        ],
        glazingElements: [{ u: 1.5 }], // violare
        category: "RI",
      });
      expect(r.violations).toHaveLength(3);
    });
  });

  describe("checkNZEBCompliance — integrare envelope", () => {
    const baseParams = {
      building: {
        category: "RI",
        opaqueElements: [{ type: "PE", U: 0.18 }, { type: "AC", U: 0.15 }],
        glazingElements: [{ u: 1.0, orientation: "S" }],
      },
      climate: { zone: "III", name: "Zona III" },
      renewSummary: {
        ep_adjusted_m2: 80,
        rer: 35,
        rerOnSite: 15,
      },
    };

    it("Anvelopă conformă → envelopeOk=true, check prezent", () => {
      const r = checkNZEBCompliance(baseParams);
      expect(r).not.toBeNull();
      expect(r.envelopeOk).toBe(true);
      expect(r.envelopeViolations).toHaveLength(0);
      expect(r.checks.some(c => c.id === "envelope_umax")).toBe(true);
    });

    it("Anvelopă cu violări → compliant=false", () => {
      const r = checkNZEBCompliance({
        ...baseParams,
        building: {
          ...baseParams.building,
          opaqueElements: [{ type: "PE", U: 0.40 }], // violare gravă
        },
      });
      expect(r.envelopeOk).toBe(false);
      expect(r.compliant).toBe(false);
      expect(r.gaps.some(g => /U'max/.test(g))).toBe(true);
    });

    it("Referință SR EN ISO 52018-1 în lista references", () => {
      const r = checkNZEBCompliance(baseParams);
      expect(r.references.some(ref => /52018-1/.test(ref.doc))).toBe(true);
    });
  });
});
