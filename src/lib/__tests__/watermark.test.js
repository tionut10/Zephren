/**
 * @vitest-environment jsdom
 *
 * Teste pentru watermark.js (Sprint Conformitate P0-11, 6 mai 2026).
 */

import { describe, it, expect, vi } from "vitest";
import {
  WATERMARK_PRESETS,
  getWatermarkText,
  getWatermarkConfig,
  applyJsPdfWatermark,
  applyJsPdfWatermarkAllPages,
  buildHtmlWatermark,
  autoWatermark,
} from "../watermark.js";

// Mock jsPDF instance minimal
function makeMockJsPdf(numPages = 1) {
  const calls = { text: [], setPage: [], setTextColor: [], setFontSize: [], setFont: [] };
  return {
    _calls: calls,
    _currentPage: 1,
    internal: {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    },
    GState: function (opts) { this.opts = opts; },
    setGState: vi.fn(),
    getNumberOfPages: () => numPages,
    setPage(p) { this._currentPage = p; calls.setPage.push(p); },
    setFont(...args) { calls.setFont.push(args); },
    setFontSize(s) { calls.setFontSize.push(s); },
    setTextColor(...args) { calls.setTextColor.push(args); },
    getTextColor: () => "#000000",
    text(t, x, y, opts) { calls.text.push({ t, x, y, opts }); },
  };
}

describe("WATERMARK_PRESETS", () => {
  it("conține DEMO + EDU + MOCK_SIGNATURE + PREVIEW", () => {
    expect(WATERMARK_PRESETS.DEMO.text).toBe("DEMO");
    expect(WATERMARK_PRESETS.EDU.text).toBe("SCOP DIDACTIC");
    expect(WATERMARK_PRESETS.MOCK_SIGNATURE.text).toBe("MOCK SIGNATURE");
    expect(WATERMARK_PRESETS.PREVIEW.text).toContain("PREVIEW");
  });

  it("este înghețat", () => {
    expect(Object.isFrozen(WATERMARK_PRESETS)).toBe(true);
  });
});

describe("getWatermarkText", () => {
  it("plan free → DEMO", () => {
    expect(getWatermarkText("free")).toBe("DEMO");
  });

  it("plan edu cu dovadă validă → SCOP DIDACTIC", () => {
    expect(getWatermarkText("edu", true)).toBe("SCOP DIDACTIC");
  });

  it("plan edu fără dovadă → DEMO", () => {
    expect(getWatermarkText("edu", false)).toBe("DEMO");
  });

  it("planuri plătite (audit/pro/expert/birou/enterprise) → null", () => {
    expect(getWatermarkText("audit")).toBeNull();
    expect(getWatermarkText("pro")).toBeNull();
    expect(getWatermarkText("expert")).toBeNull();
    expect(getWatermarkText("birou")).toBeNull();
    expect(getWatermarkText("enterprise")).toBeNull();
  });

  it("plan undefined/empty → DEMO (fail-safe)", () => {
    expect(getWatermarkText(undefined)).toBe("DEMO");
    expect(getWatermarkText("")).toBe("DEMO");
  });

  it("case-insensitive", () => {
    expect(getWatermarkText("FREE")).toBe("DEMO");
    expect(getWatermarkText("Pro")).toBeNull();
  });
});

describe("getWatermarkConfig", () => {
  it("isMockSigned override → returnează MOCK_SIGNATURE chiar pentru plan plătit", () => {
    const cfg = getWatermarkConfig("pro", false, { isMockSigned: true });
    expect(cfg.text).toBe("MOCK SIGNATURE");
  });

  it("isPreview override → returnează PREVIEW", () => {
    const cfg = getWatermarkConfig("pro", false, { isPreview: true });
    expect(cfg.text).toContain("PREVIEW");
  });

  it("plan plătit fără override → null", () => {
    expect(getWatermarkConfig("expert", false)).toBeNull();
  });

  it("plan free → preset DEMO complet (color, opacity, fontSize, angle)", () => {
    const cfg = getWatermarkConfig("free");
    expect(cfg.text).toBe("DEMO");
    expect(cfg.color).toEqual([255, 80, 80]);
    expect(cfg.opacity).toBeGreaterThan(0);
    expect(cfg.fontSize).toBeGreaterThan(0);
    expect(cfg.angle).toBe(-35);
  });
});

describe("applyJsPdfWatermark + applyJsPdfWatermarkAllPages", () => {
  it("text watermark plasat în centrul paginii cu unghi -35°", () => {
    const doc = makeMockJsPdf();
    applyJsPdfWatermark(doc, "DEMO");
    expect(doc._calls.text).toHaveLength(1);
    expect(doc._calls.text[0].t).toBe("DEMO");
    expect(doc._calls.text[0].opts.align).toBe("center");
    expect(doc._calls.text[0].opts.angle).toBe(-35);
  });

  it("AllPages itererază peste toate paginile", () => {
    const doc = makeMockJsPdf(3);
    applyJsPdfWatermarkAllPages(doc, "DEMO");
    expect(doc._calls.text).toHaveLength(3);
    expect(doc._calls.setPage).toEqual([1, 2, 3]);
  });

  it("nu aruncă dacă doc invalid", () => {
    expect(() => applyJsPdfWatermark(null, "X")).not.toThrow();
    expect(() => applyJsPdfWatermark({}, "X")).not.toThrow();
  });
});

describe("autoWatermark", () => {
  it("plan plătit → returnează false (no watermark applied)", () => {
    const doc = makeMockJsPdf();
    const applied = autoWatermark(doc, { plan: "pro" });
    expect(applied).toBe(false);
    expect(doc._calls.text).toHaveLength(0);
  });

  it("plan free → returnează true cu watermark DEMO", () => {
    const doc = makeMockJsPdf();
    const applied = autoWatermark(doc, { plan: "free" });
    expect(applied).toBe(true);
    expect(doc._calls.text[0].t).toBe("DEMO");
  });

  it("plan edu valid → SCOP DIDACTIC", () => {
    const doc = makeMockJsPdf();
    autoWatermark(doc, { plan: "edu", isEduValid: true });
    expect(doc._calls.text[0].t).toBe("SCOP DIDACTIC");
  });

  it("isMockSigned override pe plan plătit → MOCK SIGNATURE", () => {
    const doc = makeMockJsPdf();
    const applied = autoWatermark(doc, { plan: "pro", extra: { isMockSigned: true } });
    expect(applied).toBe(true);
    expect(doc._calls.text[0].t).toBe("MOCK SIGNATURE");
  });
});

describe("buildHtmlWatermark", () => {
  it("returnează string HTML cu text inclus", () => {
    const html = buildHtmlWatermark("DEMO");
    expect(html).toContain("DEMO");
    expect(html).toContain("position:fixed");
    expect(html).toContain("rotate(-35deg)");
  });

  it("text gol → string gol", () => {
    expect(buildHtmlWatermark("")).toBe("");
    expect(buildHtmlWatermark(null)).toBe("");
  });
});
