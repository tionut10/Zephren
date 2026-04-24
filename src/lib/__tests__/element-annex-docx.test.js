/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportElementAnnexesDOCX,
  __testing__,
} from "../element-annex-docx.js";

const { computeElementMetrics, buildSectionDescription, fmtNum, elementTypeName } = __testing__;

describe("Sprint 22 #23 — element-annex-docx helpers", () => {
  it("fmtNum formatează corect cu decimale", () => {
    expect(fmtNum(1234.567, 2)).toMatch(/1[\s.,]234[.,]57/);
    expect(fmtNum(null, 2)).toBe("—");
    expect(fmtNum(NaN, 2)).toBe("—");
    expect(fmtNum(undefined, 2)).toBe("—");
  });

  it("elementTypeName mapare coduri Mc 001-2022", () => {
    expect(elementTypeName("PE")).toMatch(/perete exterior/i);
    expect(elementTypeName("PT")).toMatch(/terasă/i);
    expect(elementTypeName("PB")).toMatch(/subsol/i);
    expect(elementTypeName("XYZ")).toBe("XYZ"); // cod necunoscut
  });

  it("buildSectionDescription descrie straturi int → ext", () => {
    const el = {
      layers: [
        { matName: "Tencuială", thickness: 15, lambda: 0.87 },
        { matName: "Cărămidă", thickness: 250, lambda: 0.46 },
        { matName: "EPS", thickness: 100, lambda: 0.036 },
      ],
    };
    const desc = buildSectionDescription(el);
    expect(desc).toMatch(/total 365 mm/);
    expect(desc).toMatch(/Tencuială/);
    expect(desc).toMatch(/Cărămidă/);
    expect(desc).toMatch(/EPS/);
    // Cărămida e ~68% din grosime
    expect(desc).toMatch(/250 mm \(68%/);
  });

  it("buildSectionDescription tratează straturi goale", () => {
    expect(buildSectionDescription({ layers: [] })).toMatch(/fără straturi/i);
    expect(buildSectionDescription({})).toMatch(/fără straturi/i);
  });

  it("computeElementMetrics calculează R, U, masă, D, fire_class", () => {
    const el = {
      type: "PE",
      layers: [
        { matName: "Tencuială", thickness: 15, lambda: 0.87, rho: 1800, cp: 1000 },
        { matName: "Cărămidă ceramică", thickness: 250, lambda: 0.46, rho: 1600, cp: 920 },
        { matName: "Polistiren expandat EPS-100", thickness: 100, lambda: 0.036, rho: 20, cp: 1300 },
        { matName: "Tencuială decorativă", thickness: 10, lambda: 0.87, rho: 1800, cp: 1000 },
      ],
    };
    const m = computeElementMetrics(el);

    expect(m.u).toBeGreaterThan(0);
    expect(m.u).toBeLessThan(0.4);
    expect(m.r_total).toBeGreaterThan(2.0);
    // Masă/m²: 0.015*1800 + 0.25*1600 + 0.1*20 + 0.01*1800 = 27+400+2+18 = 447 kg/m²
    expect(m.massPerM2).toBeGreaterThan(440);
    expect(m.massPerM2).toBeLessThan(460);
    expect(m.D).toBeGreaterThan(0);
    // Cea mai slabă clasă foc → EPS = E
    expect(m.worstFireClass).toBe("E");
  });

  it("computeElementMetrics fără straturi → valori default (U implicit)", () => {
    const el = { type: "PE", layers: [] };
    const m = computeElementMetrics(el);
    expect(m.massPerM2).toBe(0);
    expect(m.D).toBe(0);
  });

  it("computeElementMetrics identifică A1 când toate straturile sunt incombustibile", () => {
    const el = {
      type: "PE",
      layers: [
        { matName: "Beton armat", thickness: 250, lambda: 1.74, rho: 2400 },
        { matName: "Vată bazaltică Rockwool", thickness: 100, lambda: 0.038, rho: 80 },
      ],
    };
    const m = computeElementMetrics(el);
    expect(m.worstFireClass).toBe("A1");
  });
});

describe("Sprint 22 #23 — exportElementAnnexesDOCX", () => {
  let clickSpy;
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("aruncă eroare pentru listă goală", async () => {
    await expect(exportElementAnnexesDOCX([])).rejects.toThrow(/nu exist[aă].*element/i);
  });

  it("produce blob DOCX pentru un element", async () => {
    const elements = [{
      name: "Perete exterior sud",
      type: "PE",
      orientation: "S",
      area: 45,
      layers: [
        { matName: "Tencuială", thickness: 15, lambda: 0.87, rho: 1800 },
        { matName: "Cărămidă ceramică", thickness: 250, lambda: 0.46, rho: 1600 },
        { matName: "EPS", thickness: 100, lambda: 0.036, rho: 20 },
      ],
    }];
    const r = await exportElementAnnexesDOCX(elements);
    expect(r.blob).toBeDefined();
    expect(r.blob.size).toBeGreaterThan(1000);
    expect(r.filename).toMatch(/^anexe_elemente_.*\.docx$/);
    expect(clickSpy).toHaveBeenCalled();
  }, 10000);

  it("multi-element → fișier unic cu page breaks", async () => {
    const elements = [
      { name: "PE Sud", type: "PE", orientation: "S", area: 40, layers: [{ matName: "EPS", thickness: 100, lambda: 0.036, rho: 20 }] },
      { name: "PT", type: "PT", orientation: "Orizontal", area: 80, layers: [{ matName: "Vată bazaltică", thickness: 150, lambda: 0.038, rho: 70 }] },
    ];
    const r = await exportElementAnnexesDOCX(elements);
    expect(r.blob.size).toBeGreaterThan(2000); // mai mare decât un singur element
  }, 10000);

  it("filename custom acceptat prin options", async () => {
    const elements = [{
      name: "Test", type: "PE", area: 10,
      layers: [{ matName: "EPS", thickness: 100, lambda: 0.036, rho: 20 }],
    }];
    const r = await exportElementAnnexesDOCX(elements, { filename: "custom_anexe.docx" });
    expect(r.filename).toBe("custom_anexe.docx");
  }, 10000);
});
