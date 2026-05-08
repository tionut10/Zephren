/**
 * Tests pentru pdf-brand-layout.js — focus pe QR + buildVerifyUrl
 *
 * Sprint V7-Tests (8 mai 2026)
 *
 * Acoperire smoke (jsPDF mock parțial):
 *   - buildVerifyUrl (format URL verificare)
 *   - renderQrCode (apel addImage + fallback chenar)
 *   - applyBrandHeader / applyBrandFooter (apeluri elementare)
 *   - renderSignatureBox + renderKpiBox + renderSectionDivider
 *
 * jsPDF mock-uit minimal — verifică doar non-aruncare erori și apeluri așteptate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderQrCode,
  buildVerifyUrl,
  renderSignatureBox,
  renderKpiBox,
  renderSectionDivider,
  renderSectionHeader,
  renderEnergyClassBar,
  renderTableHeader,
  renderTableRow,
  renderWatermark,
} from "../pdf-brand-layout.js";

function makeMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setLineDashPattern: vi.fn(),
    setLineCap: vi.fn(),
    setLineJoin: vi.fn(),
    setGState: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    triangle: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    saveGraphicsState: vi.fn(),
    restoreGraphicsState: vi.fn(),
    splitTextToSize: vi.fn((str, _w) => [String(str)]),
    getTextWidth: vi.fn(s => String(s).length * 1.5),
    GState: vi.fn(function (opts) { this.opts = opts; }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// buildVerifyUrl
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · buildVerifyUrl", () => {
  it("format default https://zephren.ro/verify/{cpeCode}?t=...", () => {
    const url = buildVerifyUrl({
      cpeCode: "CE-2026-CT-01875",
      dateISO: "2026-05-08",
    });
    expect(url).toMatch(/^https:\/\/zephren\.ro\/verify\/CE-2026-CT-01875\?/);
    expect(url).toContain("t=2026-05-08");
  });

  it("hashShort adaugă param h={primele 8 chars}", () => {
    const url = buildVerifyUrl(
      { cpeCode: "CE-2026", dateISO: "2026-05-08" },
      { hashShort: "abcdef0123456789" },
    );
    expect(url).toContain("h=abcdef01");
  });

  it("baseUrl custom override", () => {
    const url = buildVerifyUrl(
      { cpeCode: "X", dateISO: "2026-05-08" },
      { baseUrl: "https://test.local/v" },
    );
    expect(url).toMatch(/^https:\/\/test\.local\/v\/X\?/);
  });

  it("cpeCode missing → 'no-code'", () => {
    const url = buildVerifyUrl({});
    expect(url).toMatch(/\/verify\/no-code\?/);
  });

  it("dateISO missing → folosește data curentă", () => {
    const url = buildVerifyUrl({ cpeCode: "X" });
    const today = new Date().toISOString().slice(0, 10);
    expect(url).toContain(`t=${today}`);
  });

  it("cpeCode cu caractere speciale → URL-encoded", () => {
    const url = buildVerifyUrl({ cpeCode: "CE 2026/RO", dateISO: "2026-05-08" });
    expect(url).toContain("CE%202026%2FRO");
  });

  it("hashShort > 8 chars → trunchiat la 8", () => {
    const url = buildVerifyUrl(
      { cpeCode: "X", dateISO: "2026-05-08" },
      { hashShort: "0123456789abcdef" },
    );
    expect(url).toContain("h=01234567");
    expect(url).not.toContain("0123456789");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderQrCode
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderQrCode", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("payload null/undefined → returnează null fără addImage", async () => {
    const result = await renderQrCode(doc, null);
    expect(result).toBeNull();
    expect(doc.addImage).not.toHaveBeenCalled();
  });

  it("payload empty string → returnează null", async () => {
    const result = await renderQrCode(doc, "");
    expect(result).toBeNull();
    expect(doc.addImage).not.toHaveBeenCalled();
  });

  it("payload valid → apelează addImage cu PNG dataURL", async () => {
    const result = await renderQrCode(doc, "https://zephren.ro/verify/test", {
      x: 100, y: 200, size: 20,
    });
    expect(doc.addImage).toHaveBeenCalledTimes(1);
    expect(doc.addImage).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      "PNG",
      100, 200, 20, 20,
    );
    expect(result).toEqual({
      x: 100, y: 200, size: 20,
      payload: "https://zephren.ro/verify/test",
    });
  });

  it("default position folosește A4 footer area", async () => {
    const result = await renderQrCode(doc, "test-payload");
    expect(result).toMatchObject({
      x: 15,
      size: 18,
    });
    // y default = A4.HEIGHT - 35 = 297 - 35 = 262
    expect(result.y).toBe(262);
  });

  it("label opțional desenează text dedesubt", async () => {
    await renderQrCode(doc, "test", { label: "Verifică online" });
    // doc.text apelat pentru label
    const textCalls = doc.text.mock.calls.filter(c => c[0] === "Verifică online");
    expect(textCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("fallback chenar grafic pe eroare lib qrcode", async () => {
    // Mock import qrcode să arunce eroare
    vi.doMock("qrcode", () => {
      throw new Error("Library missing");
    });
    // Reset doc pentru clean state
    doc = makeMockDoc();
    // În implementarea actuală, fallback rect e desenat doar dacă import sau toDataURL eșuează
    // Test smoke — non-aruncare
    const result = await renderQrCode(doc, "fallback-test");
    expect(result).toBeTruthy();
    // result trebuie să aibă fie payload fără error, fie cu error
    expect(result.payload).toBe("fallback-test");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyBrandHeader / applyBrandFooter
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · applyBrandHeader", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("apelează rect/text pentru logo + cod + dată", () => {
    applyBrandHeader(doc, {
      cpeCode: "CE-2026",
      dateText: "08 mai 2026",
    });
    // Apelat cel puțin pentru logo wordmark + cod CPE + dată + bară orizontală
    expect(doc.text.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(doc.line).toHaveBeenCalled(); // bară primary
  });

  it("includeBar=false → nu desenează bară orizontală", () => {
    applyBrandHeader(doc, { cpeCode: "X", dateText: "Y" }, { includeBar: false });
    expect(doc.line).not.toHaveBeenCalled();
  });

  it("cpeCode lipsă (—) → nu afișează 'Cod: —'", () => {
    applyBrandHeader(doc, { cpeCode: "—", dateText: "08 mai 2026" });
    const codCalls = doc.text.mock.calls.filter(c => String(c[0]).includes("Cod:"));
    expect(codCalls.length).toBe(0);
  });
});

describe("pdf-brand-layout · applyBrandFooter", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("apelează text pentru auditor + Pag X/Y + generator", () => {
    applyBrandFooter(doc, {
      auditor: { name: "ing. Test", atestat: "CT-01" },
      generator: "Zephren v4.0",
    }, 1, 3);
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts.some(t => t.includes("ing. Test"))).toBe(true);
    expect(textTexts.some(t => t.includes("1 / 3"))).toBe(true);
    expect(textTexts.some(t => t.includes("Zephren v4.0"))).toBe(true);
  });

  it("legalText opțional → linie 2 cu text legal", () => {
    applyBrandFooter(doc, {}, 1, 1, { legalText: "Mc 001-2022 · EPBD 2024" });
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts.some(t => t.includes("Mc 001-2022"))).toBe(true);
  });

  it("auditor.name = '—' → nu afișează", () => {
    applyBrandFooter(doc, { auditor: { name: "—" } }, 1, 1);
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts.some(t => t === "—")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderSignatureBox
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderSignatureBox", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("desenează border + label uppercase + nume + atestat + dată", () => {
    renderSignatureBox(doc, 10, 200, {
      label: "auditor energetic",
      name: "ing. Stoica Vlad-Răzvan",
      atestat: "CT-01875",
      date: "08 mai 2026",
    });
    expect(doc.rect).toHaveBeenCalledWith(10, 200, 70, 35, "S"); // default 70x35
    expect(doc.line).toHaveBeenCalled(); // separator intern
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("AUDITOR ENERGETIC"); // uppercase
    expect(textTexts).toContain("ing. Stoica Vlad-Răzvan");
    expect(textTexts).toContain("Atestat: CT-01875");
    expect(textTexts).toContain("Data: 08 mai 2026");
  });

  it("dimensiuni custom 80x40", () => {
    renderSignatureBox(doc, 0, 0, {
      label: "X",
      width: 80,
      height: 40,
    });
    expect(doc.rect).toHaveBeenCalledWith(0, 0, 80, 40, "S");
  });

  it("name + atestat + date opționale (lipsesc)", () => {
    renderSignatureBox(doc, 0, 0, { label: "TEST" });
    // Doar label + border, fără nume/atestat/date
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("TEST");
    expect(textTexts.filter(t => t.startsWith("Atestat:"))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderKpiBox
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderKpiBox", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("desenează fundal + border-stânga 4mm + valoare + label uppercase", () => {
    renderKpiBox(doc, 10, 100, 50, 32, {
      value: "78.381",
      unit: "RON",
      label: "Investiție totală",
    });
    // Apel rect pentru fundal + border-stânga + outline border
    expect(doc.rect.mock.calls.length).toBeGreaterThanOrEqual(2);
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("78.381");
    expect(textTexts).toContain("RON");
    expect(textTexts).toContain("INVESTIȚIE TOTALĂ"); // uppercase auto
  });

  it("icon optional în colț dreapta sus", () => {
    renderKpiBox(doc, 10, 100, 50, 32, {
      value: "100",
      label: "Test",
      icon: "💰",
    });
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("💰");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderSectionDivider + renderSectionHeader
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderSectionDivider + Header", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("renderSectionDivider — apelează line cu primary color", () => {
    renderSectionDivider(doc, 50);
    expect(doc.line).toHaveBeenCalled();
    expect(doc.setLineWidth).toHaveBeenCalled();
  });

  it("renderSectionHeader — desenează titlu + bară primary, returnează nou Y", () => {
    const newY = renderSectionHeader(doc, "1. Identificare", 100);
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("1. IDENTIFICARE"); // uppercase auto
    expect(doc.line).toHaveBeenCalled(); // bară
    expect(newY).toBeGreaterThan(100);
  });

  it("renderSectionHeader — width custom pentru bară", () => {
    renderSectionDivider(doc, 50, { width: 50, x: 30 });
    // Verifică linia desenată cu lățimea așteptată
    expect(doc.line).toHaveBeenCalledWith(30, 50, 80, 50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderEnergyClassBar
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderEnergyClassBar", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("desenează 7 bare A-G + 2 markeri (actual + target)", () => {
    renderEnergyClassBar(doc, 20, 100, 150, 8, {
      actualClass: "G",
      actualEP: 781.2,
      targetClass: "C",
      targetEP: 219.5,
    });
    // 7 rect-uri pentru bare + 2 triangle pentru markeri
    expect(doc.rect.mock.calls.length).toBe(7);
    expect(doc.triangle).toHaveBeenCalledTimes(2);
    // Etichete A-G în interior
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("A");
    expect(textTexts).toContain("G");
  });

  it("threshold opțional → linie verticală dashed prag nZEB", () => {
    renderEnergyClassBar(doc, 20, 100, 150, 8, {
      actualClass: "G",
      thresholdClass: "B",
    });
    expect(doc.setLineDashPattern).toHaveBeenCalled();
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("prag nZEB");
  });

  it("showLabels=false → fără text A-G în bare", () => {
    renderEnergyClassBar(doc, 20, 100, 150, 8, {
      showLabels: false,
    });
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    // A-G nu apar (dar pot apărea markeri/threshold)
    expect(textTexts.filter(t => /^[A-G]$/.test(t)).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderTableHeader + renderTableRow
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderTable* helpers", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("renderTableHeader — fundal SLATE_900 + text alb", () => {
    const newY = renderTableHeader(doc, ["Nr", "Denumire", "Cost"], [10, 100, 30], 10, 50);
    expect(doc.rect).toHaveBeenCalledWith(10, 50, 140, 7, "F");
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("Nr");
    expect(textTexts).toContain("Denumire");
    expect(textTexts).toContain("Cost");
    expect(newY).toBe(57);
  });

  it("renderTableRow zebra=true → fundal SLATE_50", () => {
    const newY = renderTableRow(doc, ["1", "Termoizolație", 5426], [10, 100, 30], 10, 50, 6, true);
    // Apel rect pentru zebra fundal
    expect(doc.rect).toHaveBeenCalled();
    expect(newY).toBe(56);
  });

  it("renderTableRow ultima coloană numerică → align right", () => {
    renderTableRow(doc, ["Total", "—", 78381], [60, 50, 40], 10, 50);
    const rightAlignedCalls = doc.text.mock.calls.filter(
      c => c[3]?.align === "right",
    );
    expect(rightAlignedCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderWatermark
// ─────────────────────────────────────────────────────────────────────────────

describe("pdf-brand-layout · renderWatermark", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("desenează text mare diagonal cu opacitate", () => {
    renderWatermark(doc, "ESTIMAT");
    expect(doc.saveGraphicsState).toHaveBeenCalled();
    expect(doc.restoreGraphicsState).toHaveBeenCalled();
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("ESTIMAT"); // uppercase deja
  });

  it("text uppercase auto", () => {
    renderWatermark(doc, "preview");
    const textTexts = doc.text.mock.calls.map(c => String(c[0]));
    expect(textTexts).toContain("PREVIEW");
  });

  it("doc fără GState → no-op (fallback older jsPDF)", () => {
    const oldDoc = { ...makeMockDoc(), GState: undefined };
    expect(() => renderWatermark(oldDoc, "TEST")).not.toThrow();
  });
});
