/**
 * Tests pentru pdf-brand-kit.js — Sprint Visual-1 (8 mai 2026)
 *
 * Acoperire:
 *   - Constants (paletă culori, font sizes, A4 dims, spacing)
 *   - formatRomanianDate (long/short/iso)
 *   - formatRomanianNumber + formatRON + formatEUR
 *   - getEnergyClassTextColor (contrast WCAG B/C → negru)
 *   - buildBrandMetadata (defaults + overrides)
 *   - setBrandColor (apel jsPDF cu RGB)
 */

import { describe, it, expect, vi } from "vitest";
import {
  BRAND_COLORS,
  ENERGY_CLASS_COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  A4,
  SPACING,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  formatRomanianNumber,
  formatRON,
  formatEUR,
  buildBrandMetadata,
  getEnergyClassTextColor,
} from "../pdf-brand-kit.js";

describe("pdf-brand-kit · constants", () => {
  it("BRAND_COLORS — paletă completă cu PRIMARY verde Zephren", () => {
    expect(BRAND_COLORS.PRIMARY).toEqual([0, 122, 61]); // #007A3D
    expect(BRAND_COLORS.PRIMARY_LIGHT).toEqual([0, 165, 80]); // #00A550
    expect(BRAND_COLORS.WHITE).toEqual([255, 255, 255]);
    expect(BRAND_COLORS.SLATE_900).toEqual([15, 23, 42]);
    expect(BRAND_COLORS.SUCCESS).toEqual([22, 163, 74]);
    expect(BRAND_COLORS.WARNING).toEqual([245, 158, 11]);
    expect(BRAND_COLORS.DANGER).toEqual([220, 38, 38]);
  });

  it("ENERGY_CLASS_COLORS — 9 clase A++ → G", () => {
    expect(Object.keys(ENERGY_CLASS_COLORS)).toHaveLength(9);
    expect(ENERGY_CLASS_COLORS["A++"]).toEqual([0, 122, 61]);
    expect(ENERGY_CLASS_COLORS["A"]).toEqual([76, 184, 72]);
    expect(ENERGY_CLASS_COLORS["G"]).toEqual([179, 18, 23]);
  });

  it("FONT_SIZES — hierarchy logic (TITLE > H1 > H2 > BODY > CAPTION > FOOTER)", () => {
    expect(FONT_SIZES.TITLE).toBeGreaterThan(FONT_SIZES.H1);
    expect(FONT_SIZES.H1).toBeGreaterThan(FONT_SIZES.H2);
    expect(FONT_SIZES.H2).toBeGreaterThan(FONT_SIZES.BODY);
    expect(FONT_SIZES.BODY).toBeGreaterThan(FONT_SIZES.CAPTION);
    expect(FONT_SIZES.CAPTION).toBeGreaterThan(FONT_SIZES.FOOTER);
    expect(FONT_SIZES.KPI_VALUE).toBeGreaterThan(FONT_SIZES.TITLE);
  });

  it("FONT_WEIGHTS — 4 weights jsPDF compat", () => {
    expect(FONT_WEIGHTS.REGULAR).toBe("normal");
    expect(FONT_WEIGHTS.BOLD).toBe("bold");
    expect(FONT_WEIGHTS.ITALIC).toBe("italic");
    expect(FONT_WEIGHTS.BOLD_ITALIC).toBe("bolditalic");
  });

  it("A4 — dimensiuni portret 210×297mm + margini standard", () => {
    expect(A4.WIDTH).toBe(210);
    expect(A4.HEIGHT).toBe(297);
    expect(A4.CONTENT_WIDTH).toBe(174); // 210 - 18 - 18
    expect(A4.CONTENT_HEIGHT).toBe(257); // 297 - 22 - 18
    expect(A4.MARGIN_LEFT).toBe(18);
    expect(A4.MARGIN_RIGHT).toBe(18);
    expect(A4.MARGIN_TOP).toBe(22);
    expect(A4.MARGIN_BOTTOM).toBe(18);
  });

  it("SPACING — scale logică XS < SM < MD < LG < XL < XXL", () => {
    expect(SPACING.XS).toBeLessThan(SPACING.SM);
    expect(SPACING.SM).toBeLessThan(SPACING.MD);
    expect(SPACING.MD).toBeLessThan(SPACING.LG);
    expect(SPACING.LG).toBeLessThan(SPACING.XL);
    expect(SPACING.XL).toBeLessThan(SPACING.XXL);
  });

  it("STROKE_WIDTH — scale logică HAIRLINE < THIN < MEDIUM < THICK < HEAVY", () => {
    expect(STROKE_WIDTH.HAIRLINE).toBeLessThan(STROKE_WIDTH.THIN);
    expect(STROKE_WIDTH.THIN).toBeLessThan(STROKE_WIDTH.MEDIUM);
    expect(STROKE_WIDTH.MEDIUM).toBeLessThan(STROKE_WIDTH.THICK);
    expect(STROKE_WIDTH.THICK).toBeLessThan(STROKE_WIDTH.HEAVY);
  });

  it("BRAND_COLORS, ENERGY_CLASS_COLORS, FONT_SIZES — toate frozen (Object.freeze)", () => {
    expect(Object.isFrozen(BRAND_COLORS)).toBe(true);
    expect(Object.isFrozen(ENERGY_CLASS_COLORS)).toBe(true);
    expect(Object.isFrozen(FONT_SIZES)).toBe(true);
    expect(Object.isFrozen(A4)).toBe(true);
    expect(Object.isFrozen(SPACING)).toBe(true);
    expect(Object.isFrozen(STROKE_WIDTH)).toBe(true);
  });
});

describe("pdf-brand-kit · formatRomanianDate", () => {
  const fixed = new Date("2026-05-08T12:00:00Z");

  it("format long (default) — '08 mai 2026'", () => {
    const result = formatRomanianDate(fixed, "long");
    expect(result).toMatch(/^08 mai 2026$/);
  });

  it("format short — '08.05.2026'", () => {
    expect(formatRomanianDate(fixed, "short")).toBe("08.05.2026");
  });

  it("format iso — '2026-05-08'", () => {
    expect(formatRomanianDate(fixed, "iso")).toBe("2026-05-08");
  });

  it("default = long când format omis", () => {
    expect(formatRomanianDate(fixed)).toBe("08 mai 2026");
  });

  it("acceptă string ISO ca input", () => {
    expect(formatRomanianDate("2026-12-31T00:00:00Z", "short")).toBe("31.12.2026");
  });

  it("acceptă timestamp number", () => {
    const t = fixed.getTime();
    expect(formatRomanianDate(t, "iso")).toBe("2026-05-08");
  });

  it("input invalid → '—'", () => {
    expect(formatRomanianDate("not-a-date", "long")).toBe("—");
  });

  it("toate 12 luni RO traduse corect", () => {
    const months = [
      ["2026-01-15", "ianuarie"], ["2026-02-15", "februarie"], ["2026-03-15", "martie"],
      ["2026-04-15", "aprilie"], ["2026-05-15", "mai"], ["2026-06-15", "iunie"],
      ["2026-07-15", "iulie"], ["2026-08-15", "august"], ["2026-09-15", "septembrie"],
      ["2026-10-15", "octombrie"], ["2026-11-15", "noiembrie"], ["2026-12-15", "decembrie"],
    ];
    months.forEach(([d, name]) => {
      expect(formatRomanianDate(d, "long")).toContain(name);
    });
  });
});

describe("pdf-brand-kit · formatRomanianNumber + RON/EUR", () => {
  it("formatRomanianNumber separator mii spațiu, virgulă decimală", () => {
    expect(formatRomanianNumber(78381, 0)).toMatch(/78[\s.]381/);
    expect(formatRomanianNumber(1234.5, 1)).toMatch(/1[\s.]234,5/);
  });

  it("formatRomanianNumber NaN/null → '—'", () => {
    expect(formatRomanianNumber(NaN)).toBe("—");
    expect(formatRomanianNumber(null)).toBe("—");
    expect(formatRomanianNumber(undefined)).toBe("—");
  });

  it("formatRON — adaugă suffix 'RON'", () => {
    expect(formatRON(78381)).toMatch(/78[\s.]381 RON/);
    expect(formatRON(0)).toMatch(/^0 RON$/);
    expect(formatRON(NaN)).toBe("—");
  });

  it("formatEUR — adaugă suffix '€'", () => {
    expect(formatEUR(15369)).toMatch(/15[\s.]369 €/);
    expect(formatEUR(NaN)).toBe("—");
  });
});

describe("pdf-brand-kit · getEnergyClassTextColor (contrast WCAG)", () => {
  it("clasa B (verde-galben deschis) → text negru", () => {
    expect(getEnergyClassTextColor("B")).toEqual(BRAND_COLORS.SLATE_900);
  });

  it("clasa C (galben pur) → text negru", () => {
    expect(getEnergyClassTextColor("C")).toEqual(BRAND_COLORS.SLATE_900);
  });

  it("clasele întunecate (A, D, E, F, G) → text alb", () => {
    expect(getEnergyClassTextColor("A")).toEqual(BRAND_COLORS.WHITE);
    expect(getEnergyClassTextColor("D")).toEqual(BRAND_COLORS.WHITE);
    expect(getEnergyClassTextColor("E")).toEqual(BRAND_COLORS.WHITE);
    expect(getEnergyClassTextColor("F")).toEqual(BRAND_COLORS.WHITE);
    expect(getEnergyClassTextColor("G")).toEqual(BRAND_COLORS.WHITE);
  });
});

describe("pdf-brand-kit · buildBrandMetadata", () => {
  it("returnează defaults pentru input gol", () => {
    const meta = buildBrandMetadata({});
    expect(meta.title).toBe("Document Zephren");
    expect(meta.cpeCode).toBe("—");
    expect(meta.building.address).toBe("—");
    expect(meta.auditor.name).toBe("—");
    expect(meta.docType).toBe("doc");
    expect(meta.version).toBe("v4.0");
    expect(meta.legalBasis).toContain("Mc 001-2022 (Ord. MDLPA 16/2023)");
    expect(meta.legalBasis).toContain("Ord. MDLPA 348/2026");
    expect(meta.legalBasis).toContain("EPBD 2024/1275");
  });

  it("populează toate câmpurile din input complet", () => {
    const meta = buildBrandMetadata({
      title: "CPE Estimat",
      cpeCode: "EST-2026-05-08",
      building: {
        address: "Bd. Tomis 287",
        category: "RA",
        areaUseful: 65,
        year: 1972,
        cadastral: "215680-C1-U18",
      },
      auditor: {
        name: "ing. Stoica Vlad-Răzvan",
        atestat: "CT-01875",
        grade: "AE Ici",
        firm: "EnergyConstanța Audit SRL",
      },
      date: new Date("2026-05-08"),
      docType: "cpe-post-rehab",
      version: "v4.0",
    });

    expect(meta.title).toBe("CPE Estimat");
    expect(meta.cpeCode).toBe("EST-2026-05-08");
    expect(meta.building.address).toBe("Bd. Tomis 287");
    expect(meta.building.areaUseful).toBe(65);
    expect(meta.auditor.name).toBe("ing. Stoica Vlad-Răzvan");
    expect(meta.auditor.atestat).toBe("CT-01875");
    expect(meta.auditor.firm).toBe("EnergyConstanța Audit SRL");
    expect(meta.dateText).toBe("08 mai 2026");
    expect(meta.dateShort).toBe("08.05.2026");
    expect(meta.dateISO).toBe("2026-05-08");
  });

  it("acceptă alias certNumber pentru atestat", () => {
    const meta = buildBrandMetadata({
      auditor: { certNumber: "B-12345", company: "Audit SRL" },
    });
    expect(meta.auditor.atestat).toBe("B-12345");
    expect(meta.auditor.firm).toBe("Audit SRL");
  });

  it("default date = now când nu specificat", () => {
    const before = Date.now();
    const meta = buildBrandMetadata({});
    const after = Date.now();
    const ts = (meta.date instanceof Date ? meta.date : new Date(meta.date)).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});

describe("pdf-brand-kit · setBrandColor", () => {
  function makeMockDoc() {
    return {
      setFillColor: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
    };
  }

  it("type='fill' → setFillColor(r, g, b)", () => {
    const doc = makeMockDoc();
    setBrandColor(doc, BRAND_COLORS.PRIMARY, "fill");
    expect(doc.setFillColor).toHaveBeenCalledWith(0, 122, 61);
    expect(doc.setTextColor).not.toHaveBeenCalled();
    expect(doc.setDrawColor).not.toHaveBeenCalled();
  });

  it("type='text' → setTextColor(r, g, b)", () => {
    const doc = makeMockDoc();
    setBrandColor(doc, BRAND_COLORS.SUCCESS, "text");
    expect(doc.setTextColor).toHaveBeenCalledWith(22, 163, 74);
  });

  it("type='draw' → setDrawColor(r, g, b)", () => {
    const doc = makeMockDoc();
    setBrandColor(doc, BRAND_COLORS.DANGER, "draw");
    expect(doc.setDrawColor).toHaveBeenCalledWith(220, 38, 38);
  });

  it("default type = 'fill'", () => {
    const doc = makeMockDoc();
    setBrandColor(doc, BRAND_COLORS.WARNING);
    expect(doc.setFillColor).toHaveBeenCalledWith(245, 158, 11);
  });

  it("RGB null/undefined → fallback [0,0,0]", () => {
    const doc = makeMockDoc();
    setBrandColor(doc, null, "fill");
    expect(doc.setFillColor).toHaveBeenCalledWith(0, 0, 0);
  });
});

describe("pdf-brand-kit · helper integration", () => {
  it("toate constantele sunt re-exportate din default", async () => {
    const mod = await import("../pdf-brand-kit.js");
    const def = mod.default;
    expect(def.BRAND_COLORS).toBe(BRAND_COLORS);
    expect(def.ENERGY_CLASS_COLORS).toBe(ENERGY_CLASS_COLORS);
    expect(def.FONT_SIZES).toBe(FONT_SIZES);
    expect(def.A4).toBe(A4);
    expect(def.formatRomanianDate).toBe(formatRomanianDate);
    expect(def.formatRON).toBe(formatRON);
    expect(def.buildBrandMetadata).toBe(buildBrandMetadata);
  });
});
