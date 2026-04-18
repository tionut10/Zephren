/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  exportPassportJSON,
  exportPassportXML,
  copyPassportToClipboard,
  jsonToXml,
  passportToXml,
} from "../passport-export.js";
import { buildRenovationPassport } from "../../calc/renovation-passport.js";

const samplePassport = () =>
  buildRenovationPassport({
    building: { address: "Str. X nr. 5 & Co.", category: "BI", areaUseful: 500 },
    instSummary: { ep_total_m2: 180, co2_total_m2: 40, energyClass: "D" },
    climate: { zone: "II" },
    auditor: { name: "A < B", certNr: "GI-9" },
  });

describe("jsonToXml", () => {
  it("escape corect caractere speciale < > & \" '", () => {
    const xml = jsonToXml({ name: 'A & B <c> "d" \'e\'' }, "root");
    expect(xml).toContain("A &amp; B &lt;c&gt; &quot;d&quot; &apos;e&apos;");
  });

  it("serializează arrays ca elemente repetate", () => {
    const xml = jsonToXml([1, 2, 3], "item");
    expect((xml.match(/<item>/g) || []).length).toBe(3);
  });

  it("produce tag self-closing pentru null / undefined", () => {
    expect(jsonToXml(null, "empty")).toContain("<empty/>");
    expect(jsonToXml(undefined, "empty")).toContain("<empty/>");
  });

  it("serializează obiect imbricat", () => {
    const xml = jsonToXml({ a: { b: 1 } }, "root");
    expect(xml).toContain("<root>");
    expect(xml).toContain("<a>");
    expect(xml).toContain("<b>1</b>");
    expect(xml).toContain("</root>");
  });

  it("aplică xmlns doar pe root", () => {
    const xml = jsonToXml({ a: 1 }, "root", 0, "http://ns/");
    expect(xml).toContain('xmlns="http://ns/"');
    expect((xml.match(/xmlns=/g) || []).length).toBe(1);
  });
});

describe("passportToXml", () => {
  it("produce XML valid cu declarație + namespace Zephren", () => {
    const p = samplePassport();
    const xml = passportToXml(p);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("xmlns=\"http://zephren.ro/schemas/renovation-passport/0.1.0\"");
    expect(xml).toContain("<renovationPassport");
  });

  it("se parsează corect cu DOMParser (well-formed)", () => {
    const p = samplePassport();
    const xml = passportToXml(p);
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror").length).toBe(0);
  });
});

describe("exports cu Blob", () => {
  let urlSpy;
  let clickSpy;
  beforeEach(() => {
    urlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("exportPassportJSON creează fișier application/json", () => {
    const p = samplePassport();
    const r = exportPassportJSON(p);
    expect(r.size).toBeGreaterThan(500);
    expect(r.filename).toContain(".json");
    expect(r.filename).toContain(p.passportId.slice(0, 8));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("exportPassportXML creează fișier application/xml", () => {
    const p = samplePassport();
    const r = exportPassportXML(p);
    expect(r.size).toBeGreaterThan(500);
    expect(r.filename).toContain(".xml");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("filename respectă template pasaport_renovare_<id>_<date>", () => {
    const p = samplePassport();
    const r = exportPassportJSON(p);
    expect(r.filename).toMatch(/^pasaport_renovare_[0-9a-f]{8}_\d{4}-\d{2}-\d{2}\.json$/i);
  });
});

describe("copyPassportToClipboard", () => {
  it("apelează navigator.clipboard.writeText cu JSON formatat", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const p = samplePassport();
    await copyPassportToClipboard(p);
    expect(writeText).toHaveBeenCalled();
    const arg = writeText.mock.calls[0][0];
    expect(arg).toContain(p.passportId);
    expect(arg).toContain('"version"');
  });
});
