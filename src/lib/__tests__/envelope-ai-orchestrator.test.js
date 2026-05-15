// @vitest-environment jsdom
/**
 * envelope-ai-orchestrator.test.js — Sprint Pas 2 AI-First (16 mai 2026)
 *
 * Acoperă orchestratorul AI pentru anvelopă termică (Pas 2):
 *  - normalizeConfidence: text/numeric → high/medium/low
 *  - dedupElements: păstrează highest confidence per cheie
 *  - mergeResults: combină 2+ surse cu dedup automat
 *  - sanitizeEnvelope: filtrează elemente fără arie / psi
 *  - extractFromImage: mock fetch /api/import-document
 *  - extractFromText: mock fetch /api/ai-assistant intent=envelope-fill
 *  - extractFromFile: ramificare MIME → image vs delegated
 *  - Batch: Promise.allSettled cu unele eșecuri parțiale
 *
 * NOTE: mock global.fetch + localStorage din vitest jsdom env.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  normalizeConfidence,
  dedupElements,
  mergeResults,
  extractFromText,
  extractFromImage,
  extractFromFile,
  extractFromImageBatch,
  __testing__,
} from "../envelope-ai-orchestrator.js";

const { sanitizeEnvelope } = __testing__;

const FAKE_API_PAYLOAD = {
  opaqueElements: [
    { name: "Perete S", type: "PE", area: "120", orientation: "S", confidence: "high" },
    { name: "Perete N", type: "PE", area: "120", orientation: "N", confidence: "medium" },
  ],
  glazingElements: [
    { name: "Ferestre S", area: "20", orientation: "S", u: 1.4, confidence: "high" },
  ],
  thermalBridges: [
    { name: "Colț ext", type: "COL_EXT", psi: 0.1, length: "10", confidence: "medium" },
  ],
  confidence: "high",
  notes: "Bloc panou prefabricat 1980",
};

beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeConfidence", () => {
  it("text → high/medium/low", () => {
    expect(normalizeConfidence("high")).toBe("high");
    expect(normalizeConfidence("MEDIUM")).toBe("medium");
    expect(normalizeConfidence("Low")).toBe("low");
    expect(normalizeConfidence("h")).toBe("high");
    expect(normalizeConfidence("m")).toBe("medium");
    expect(normalizeConfidence("l")).toBe("low");
  });

  it("numeric → bandă (0.45 / 0.75)", () => {
    expect(normalizeConfidence(0.9)).toBe("high");
    expect(normalizeConfidence(0.75)).toBe("high");
    expect(normalizeConfidence(0.6)).toBe("medium");
    expect(normalizeConfidence(0.45)).toBe("medium");
    expect(normalizeConfidence(0.2)).toBe("low");
    expect(normalizeConfidence(0)).toBe("low");
  });

  it("fallback medium pentru valori invalide", () => {
    expect(normalizeConfidence(null)).toBe("medium");
    expect(normalizeConfidence(undefined)).toBe("medium");
    expect(normalizeConfidence("garbage")).toBe("medium");
    expect(normalizeConfidence("")).toBe("medium");
  });
});

describe("dedupElements", () => {
  it("păstrează un element per cheie", () => {
    const els = [
      { name: "A", confidence: "high" },
      { name: "A", confidence: "low" },
      { name: "B", confidence: "medium" },
    ];
    const out = dedupElements(els, (e) => e.name);
    expect(out).toHaveLength(2);
  });

  it("păstrează elementul cu cea mai mare confidence", () => {
    const els = [
      { name: "A", confidence: "low", area: "10" },
      { name: "A", confidence: "high", area: "50" },
    ];
    const out = dedupElements(els, (e) => e.name);
    expect(out).toHaveLength(1);
    expect(out[0].area).toBe("50");
    expect(out[0].confidence).toBe("high");
  });

  it("array gol → array gol", () => {
    expect(dedupElements([], (e) => e.name)).toEqual([]);
    expect(dedupElements(null, (e) => e.name)).toEqual([]);
  });
});

describe("mergeResults", () => {
  it("combină 2 surse cu dedup automat", () => {
    const r1 = {
      opaqueElements: [{ name: "Perete S", type: "PE", orientation: "S", confidence: "high" }],
      glazingElements: [],
      thermalBridges: [],
    };
    const r2 = {
      opaqueElements: [
        { name: "Perete S", type: "PE", orientation: "S", confidence: "low" },
        { name: "Perete N", type: "PE", orientation: "N", confidence: "medium" },
      ],
      glazingElements: [],
      thermalBridges: [],
    };
    const merged = mergeResults(r1, r2);
    expect(merged.opaqueElements).toHaveLength(2);
    const peretSud = merged.opaqueElements.find((e) => e.orientation === "S");
    expect(peretSud.confidence).toBe("high");
  });

  it("ignoră surse null", () => {
    const r1 = { opaqueElements: [{ name: "A", type: "PE", orientation: "S" }] };
    const merged = mergeResults(null, r1, undefined);
    expect(merged.opaqueElements).toHaveLength(1);
  });

  it("agregă building + notes + assumptions", () => {
    const r1 = { building: { yearBuilt: 1980 }, notes: "primul", assumptions: ["BCA 25"] };
    const r2 = { notes: "al doilea", assumptions: ["EPS 10"] };
    const merged = mergeResults(r1, r2);
    expect(merged.building.yearBuilt).toBe(1980);
    expect(merged.notes).toContain("primul");
    expect(merged.notes).toContain("al doilea");
    expect(merged.assumptions).toContain("BCA 25");
    expect(merged.assumptions).toContain("EPS 10");
  });
});

describe("sanitizeEnvelope", () => {
  it("filtrează opaqueElements fără arie", () => {
    const out = sanitizeEnvelope({
      opaqueElements: [
        { name: "ok", area: "50" },
        { name: "fără arie", area: "" },
        { name: "zero", area: "0" },
        { name: "negativ", area: "-5" },
      ],
    });
    expect(out.opaqueElements).toHaveLength(1);
    expect(out.opaqueElements[0].name).toBe("ok");
  });

  it("filtrează thermalBridges cu psi <= 0", () => {
    const out = sanitizeEnvelope({
      thermalBridges: [
        { name: "ok", psi: 0.1 },
        { name: "zero", psi: 0 },
        { name: "lipsă", psi: undefined },
      ],
    });
    expect(out.thermalBridges).toHaveLength(1);
  });

  it("normalizează confidence pe fiecare element", () => {
    const out = sanitizeEnvelope({
      opaqueElements: [{ name: "A", area: "50", confidence: 0.9 }],
    });
    expect(out.opaqueElements[0].confidence).toBe("high");
  });

  it("returnează schemă goală validă pentru input null", () => {
    expect(sanitizeEnvelope(null)).toBeNull();
    expect(sanitizeEnvelope(undefined)).toBeNull();
  });

  it("acceptă schemă fără arrays (defensive)", () => {
    const out = sanitizeEnvelope({});
    expect(out.opaqueElements).toEqual([]);
    expect(out.glazingElements).toEqual([]);
    expect(out.thermalBridges).toEqual([]);
  });
});

describe("extractFromText", () => {
  it("rejects empty/null text", async () => {
    await expect(extractFromText("")).rejects.toThrow(/gol/i);
    await expect(extractFromText("   ")).rejects.toThrow(/gol/i);
    await expect(extractFromText(null)).rejects.toThrow();
  });

  it("apelează /api/ai-assistant cu intent envelope-fill", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: JSON.stringify(FAKE_API_PAYLOAD),
        intent: "envelope-fill",
        model: "claude-sonnet-4-6",
      }),
    });
    global.fetch = fetchMock;
    const result = await extractFromText("Bloc P+4 BCA 25 din 1985");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ai-assistant");
    const body = JSON.parse(opts.body);
    expect(body.intent).toBe("envelope-fill");
    expect(body.question).toBe("Bloc P+4 BCA 25 din 1985");
    expect(result.opaqueElements).toHaveLength(2);
    expect(result.source).toBe("Chat AI text/voce");
  });

  it("extrage JSON din răspuns AI cu text inainte și după", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: `Iată anvelopa estimată: ${JSON.stringify(FAKE_API_PAYLOAD)} Notă finală.`,
      }),
    });
    const result = await extractFromText("test");
    expect(result.opaqueElements).toHaveLength(2);
  });

  it("aruncă eroare când AI nu returnează JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: "Doar text, fără JSON." }),
    });
    await expect(extractFromText("test")).rejects.toThrow(/JSON valid/i);
  });

  it("aruncă eroare la HTTP 500", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(extractFromText("test")).rejects.toThrow(/HTTP 500/);
  });

  it("aruncă eroare când răspunsul e marcat error: true", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: true, answer: "AI Pack indisponibil" }),
    });
    await expect(extractFromText("test")).rejects.toThrow(/AI Pack indisponibil/);
  });
});

describe("extractFromImage", () => {
  it("apelează /api/import-document cu fileType facade pentru imagine", async () => {
    const fakeFile = new File(["x"], "fatada.jpg", { type: "image/jpeg" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: FAKE_API_PAYLOAD }),
    });
    const result = await extractFromImage(fakeFile, "facade");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fileType).toBe("facade");
    expect(body.mimeType).toBe("image/jpeg");
    expect(result.source).toBe("Fotografie fațadă AI");
  });

  it("setează fileType=drawing pentru PDF", async () => {
    const fakePdf = new File(["x"], "plan.pdf", { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: FAKE_API_PAYLOAD }),
    });
    await extractFromImage(fakePdf, "drawing");
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fileType).toBe("drawing");
  });

  it("aruncă eroare la HTTP eșec", async () => {
    const fakeFile = new File(["x"], "f.jpg", { type: "image/jpeg" });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) });
    await expect(extractFromImage(fakeFile)).rejects.toThrow(/HTTP 413/);
  });
});

describe("extractFromFile (auto-detect)", () => {
  it("ramifică image/* la facade AI", async () => {
    const fakeFile = new File(["x"], "f.jpg", { type: "image/jpeg" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: FAKE_API_PAYLOAD }),
    });
    const out = await extractFromFile(fakeFile);
    expect(out.envelope).toBeTruthy();
    expect(out.delegated).toBeNull();
  });

  it("ramifică application/pdf la drawing AI", async () => {
    const fakePdf = new File(["x"], "plan.pdf", { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: FAKE_API_PAYLOAD }),
    });
    const out = await extractFromFile(fakePdf);
    expect(out.envelope).toBeTruthy();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.fileType).toBe("drawing");
  });

  it("delegate la legacy parser pentru .ifc", async () => {
    const fakeIfc = new File(["IFC2X3"], "model.ifc", { type: "application/octet-stream" });
    const out = await extractFromFile(fakeIfc);
    expect(out.envelope).toBeNull();
    expect(out.delegated).toBe("ifc");
    expect(out.file).toBe(fakeIfc);
  });

  it("delegate la legacy parser pentru .csv și .json", async () => {
    const csv = new File(["a,b,c"], "data.csv", { type: "text/csv" });
    const json = new File(["{}"], "proj.json", { type: "application/json" });
    const outCsv = await extractFromFile(csv);
    const outJson = await extractFromFile(json);
    expect(outCsv.delegated).toBe("csv");
    expect(outJson.delegated).toBe("json");
  });

  it("aruncă eroare pentru tip nesuportat", async () => {
    const fakeFile = new File(["x"], "x.bin", { type: "application/octet-stream" });
    await expect(extractFromFile(fakeFile)).rejects.toThrow(/nesuportat/i);
  });
});

describe("extractFromImageBatch", () => {
  it("returnează merge când toate reușesc", async () => {
    const files = [
      new File(["x"], "f1.jpg", { type: "image/jpeg" }),
      new File(["x"], "f2.jpg", { type: "image/jpeg" }),
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: FAKE_API_PAYLOAD }),
    });
    const result = await extractFromImageBatch(files);
    expect(result.batchTotal).toBe(2);
    expect(result.batchSuccess).toBe(2);
    expect(result.batchFailures).toHaveLength(0);
  });

  it("partial success: ignoră eșecurile, păstrează succesele", async () => {
    const files = [
      new File(["x"], "f1.jpg", { type: "image/jpeg" }),
      new File(["x"], "f2.jpg", { type: "image/jpeg" }),
    ];
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) return Promise.resolve({ ok: true, json: async () => ({ data: FAKE_API_PAYLOAD }) });
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
    });
    const result = await extractFromImageBatch(files);
    expect(result.batchSuccess).toBe(1);
    expect(result.batchFailures).toHaveLength(1);
  });

  it("aruncă eroare când toate eșuează", async () => {
    const files = [new File(["x"], "f.jpg", { type: "image/jpeg" })];
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(extractFromImageBatch(files)).rejects.toThrow(/Toate.*eșuat/i);
  });

  it("rejects pe array gol", async () => {
    await expect(extractFromImageBatch([])).rejects.toThrow(/batch/i);
  });
});
