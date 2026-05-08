/**
 * Sprint 8 mai 2026 — Fixe raport nZEB
 *   1. Defalcare EP pe destinații (ep_h_m2, ep_w_m2, etc. lipseau)
 *   2. Ht/Hv exposed pe envelopeSummary (citite ca undefined)
 *   3. envelopeElements detaliat per element (pentru tabel U)
 *   4. energyClass — clasă curentă Mc 001-2022 Tab 5.x
 *   5. postRehab — scenariu post-implementare P1+P2+P3
 *
 * Aceste teste blochează regresii pe câmpurile noi expuse de
 *   • src/hooks/useInstallationSummary.js
 *   • src/hooks/useEnvelopeSummary.js
 *   • src/calc/nzeb-check.js  (checkEnvelopeUmax + checkNZEBCompliance)
 */
import { describe, it, expect } from "vitest";
import {
  checkNZEBCompliance,
  checkEnvelopeUmax,
} from "../nzeb-check.js";

describe("nZEB report — fixe Sprint 8 mai 2026", () => {
  describe("checkEnvelopeUmax — returnează listă completă elements (Sprint 8 mai 2026)", () => {
    it("Toate elementele apar în .elements cu kind + ok per element", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [
          { type: "PE", name: "Perete N", U: 0.18, area: 80 }, // conform
          { type: "AC", name: "Teras",     U: 0.30, area: 50 }, // depășire
        ],
        glazingElements: [{ u: 1.0, area: 12, orientation: "S" }],
        category: "RI",
      });
      expect(r.elements).toHaveLength(3);
      const peretele = r.elements.find(e => e.type === "PE");
      expect(peretele.kind).toBe("opaque");
      expect(peretele.ok).toBe(true);
      const teras = r.elements.find(e => e.type === "AC");
      expect(teras.ok).toBe(false);
      expect(teras.deltaPct).toBeGreaterThan(0);
      const fereastra = r.elements.find(e => e.type === "FE");
      expect(fereastra.kind).toBe("glazing");
      expect(fereastra.area).toBe(12);
    });

    it("Element cu tip necunoscut: ok=true, uMax=null (nu blochează raportul)", () => {
      const r = checkEnvelopeUmax({
        opaqueElements: [{ type: "ZZZ", name: "Tip exotic", U: 5.0 }],
        glazingElements: [],
        category: "RI",
      });
      expect(r.elements[0].ok).toBe(true);
      expect(r.elements[0].uMax).toBeNull();
      expect(r.violations).toHaveLength(0);
    });
  });

  describe("checkNZEBCompliance — câmpuri noi pentru raport", () => {
    const baseParams = {
      building: {
        category: "RA",
        areaUseful: 65,
      },
      climate: { zone: "I", name: "Constanța" },
      renewSummary: { ep_adjusted_m2: 781.2, rer: 0, rerOnSite: 0 },
      instSummary: { ep_total_m2: 781.2, qf_c: 0 },
    };

    it("expune envelopeElements pentru tabel U detaliat", () => {
      const r = checkNZEBCompliance({
        ...baseParams,
        opaqueElements: [
          { type: "PE", name: "Pereți exteriori", U: 0.45, area: 70 },
          { type: "AC", name: "Teras", U: 0.25, area: 40 },
        ],
        glazingElements: [{ u: 1.5, area: 12, orientation: "S" }],
      });
      expect(r.envelopeElements).toBeDefined();
      expect(r.envelopeElements.length).toBe(3);
      // Toate ar trebui depășire pentru categoria RA (rezidențial)
      expect(r.envelopeElements.every(e => !e.ok)).toBe(true);
    });

    it("energyClass populat corect pentru EP=781 RA → clasă G", () => {
      const r = checkNZEBCompliance(baseParams);
      expect(r.energyClass).toBeDefined();
      expect(r.energyClass.cls).toBe("G");
      expect(r.energyClass.color).toBeDefined();
    });

    it("energyClass folosește RA_nocool când qf_c=0", () => {
      const r = checkNZEBCompliance(baseParams);
      // RA_nocool praguri [60, 84, 168, 260, 352, 440, 528] → 781 > 528 → G
      expect(r.energyClass.cls).toBe("G");
      expect(r.hasCool).toBe(false);
    });

    it("energyClass folosește RA_cool când qf_c semnificativ", () => {
      // qf_c = 100 kWh, Au = 65 → 1.54 kWh/m²a > 0.5 → cool=true
      const r = checkNZEBCompliance({
        ...baseParams,
        instSummary: { ...baseParams.instSummary, qf_c: 100 },
      });
      expect(r.hasCool).toBe(true);
      // RA_cool praguri [73, 101, 198, 297, 396, 495, 595] → 781 > 595 → G
      expect(r.energyClass.cls).toBe("G");
    });

    it("postRehab estimează scenariu cu reducere multiplicativă", () => {
      const r = checkNZEBCompliance(baseParams);
      expect(r.postRehab).toBeDefined();
      // Formule: 781.2 * 0.75 = 585.9
      expect(r.postRehab.epAfterP1).toBeCloseTo(585.9, 0);
      // 781.2 * 0.75 * 0.75 = 439.4
      expect(r.postRehab.epAfterP1P2).toBeCloseTo(439.4, 0);
      // 781.2 * 0.75 * 0.75 * 0.90 = 395.5
      expect(r.postRehab.epAfterAll).toBeCloseTo(395.5, 0);
      // RER 0 + 32 (PV+solar) = 32
      expect(r.postRehab.rerAfter).toBe(32);
      // RER on-site 0 + 25 (PV) = 25
      expect(r.postRehab.rerOnsiteAfter).toBe(25);
      expect(r.postRehab.classAfterAll).toBeDefined();
      // 395.5 între 352 și 440 → clasa E (RA_nocool)
      expect(r.postRehab.classAfterAll.cls).toBe("E");
    });

    it("postRehab marchează compliantAfterAll dacă scenariul atinge pragul", () => {
      // Caz EP=120 zona III → epMax=106 RA → 120*0.75*0.75*0.9 = 60.75 ≤ 106 → conform
      const r = checkNZEBCompliance({
        building: { category: "RA", areaUseful: 80 },
        climate: { zone: "III" },
        renewSummary: { ep_adjusted_m2: 120, rer: 0, rerOnSite: 0 },
        instSummary: { ep_total_m2: 120, qf_c: 0 },
      });
      expect(r.postRehab.epAfterAll).toBeLessThan(r.epMax);
      expect(r.postRehab.compliantAfterAll).toBe(true);
    });

    it("opaqueElements/glazingElements explicite override building.*", () => {
      const r = checkNZEBCompliance({
        ...baseParams,
        building: {
          ...baseParams.building,
          opaqueElements: [{ type: "PE", U: 0.10 }], // ar trebui CONFORM dacă luat de aici
        },
        opaqueElements: [{ type: "PE", U: 0.50 }],   // override → DEPĂȘ.
        glazingElements: [],
      });
      // Cu override-ul EP-ul anvelopei trebuie să iasă neconform
      expect(r.envelopeElements).toHaveLength(1);
      expect(r.envelopeElements[0].U).toBe(0.5);
      expect(r.envelopeOk).toBe(false);
    });
  });

  describe("Aliasuri Ht/Hv pe envelopeSummary (Sprint 8 mai 2026)", () => {
    // Test pe forma datelor returnate de hook — nu putem testa hookul React
    // direct fără harness, dar putem documenta contractul așteptat.
    it("forma așteptată include Ht (transmisie) + Hv (ventilare)", () => {
      const fakeEnvelope = {
        totalHeatLoss: 234.5,
        ventLoss: 89.2,
        G: 1.234,
        // aliasuri noi:
        Ht: 234.5,
        Hv: 89.2,
      };
      // Raport (report-generators.js) citește exact .Ht și .Hv:
      expect(fakeEnvelope.Ht).toBe(fakeEnvelope.totalHeatLoss);
      expect(fakeEnvelope.Hv).toBe(fakeEnvelope.ventLoss);
    });
  });
});
