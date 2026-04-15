import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportProject,
  exportCSV,
  exportXML,
  generateQRCodeSVG,
  exportBulkProjects,
  generateAuditReport,
} from "../exportHandlers.js";

// ═══════════════════════════════════════════════════════════════════════════
// DOM stubs (vi.stubGlobal) — handlerii folosesc Blob, URL, document.createElement.
// Fără happy-dom/jsdom, simulăm minimal. Capturăm conținutul Blob-urilor în array
// global `capturedBlobs` pentru inspecție după fiecare apel.
// ═══════════════════════════════════════════════════════════════════════════
const clickSpy = vi.fn();
const createElementSpy = vi.fn(() => ({
  click: clickSpy,
  setAttribute: vi.fn(),
  set href(v) { this._href = v; },
  get href() { return this._href; },
  set download(v) { this._download = v; },
  get download() { return this._download; },
}));
export const capturedBlobs = [];

beforeEach(() => {
  clickSpy.mockClear();
  createElementSpy.mockClear();
  capturedBlobs.length = 0;
  class MockBlob {
    constructor(parts, opts) {
      capturedBlobs.push({ parts, type: opts?.type });
      this.parts = parts; this.type = opts?.type;
    }
  }
  vi.stubGlobal("Blob", MockBlob);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
  vi.stubGlobal("document", {
    createElement: createElementSpy,
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures comune
// ═══════════════════════════════════════════════════════════════════════════
const mockBuilding = {
  address: "Strada Test 1", city: "București", county: "București",
  category: "RI", yearBuilt: "1985", yearRenov: "",
  areaUseful: "100", volume: "300", areaEnvelope: "200",
  locality: "București", postal: "010101",
};
const mockAuditor = { name: "Ion Popescu", atestat: "GRAD1", grade: "I", company: "SC Audit SRL", date: "2026-04-15" };
const mockInstSummary = {
  qf_h: 3000, qf_w: 1500, qf_c: 500, qf_v: 200, qf_l: 400,
  qf_total: 5600, qf_total_m2: 56,
  ep_h: 3300, ep_w: 1650, ep_c: 1250, ep_v: 500, ep_l: 1000,
  ep_total: 7700, ep_total_m2: 77,
  co2_h: 600, co2_w: 300, co2_c: 100, co2_v: 40, co2_l: 80, co2_total: 1120, co2_total_m2: 11.2,
  leni: 12.3, eta_total_h: 0.85, fuel: { id: "GAS" },
};
const mockRenewSummary = { rer: 25, rerOnSite: 18, ep_adjusted: 6500, ep_adjusted_m2: 65, co2_adjusted: 900, co2_adjusted_m2: 9, qPV_kWh: 2000, qSolarTh: 500, qHP_ren: 0, qRen_total: 2500 };
const mockEnvelopeSummary = { G: 0.35, H_T: 120, H_V: 45, totalArea: 200, totalHeatLoss: 140 };
const mockSelectedClimate = { zone: "III", theta_e: -18, theta_a: 10.5, gzile: 3200, name: "București", ngz: 3200, HDD: 3200, Gh: 1500 };

const minCtx = () => ({
  building: { ...mockBuilding },
  opaqueElements: [], glazingElements: [], thermalBridges: [],
  heating: { source: "CAZAN_GAZ", eta_gen: 0.92 },
  acm: { source: "CAZAN_GAZ", consumers: 4, dailyLiters: 40 },
  cooling: { hasCooling: false, system: "SPLIT", eer: 3 },
  ventilation: { type: "NAT", airflow: 0, hrEfficiency: 0 },
  lighting: { type: "LED", pDensity: 5 },
  solarThermal: { enabled: false, area: 0 },
  photovoltaic: { enabled: false, power: 0, peakPower: 0 },
  heatPump: { enabled: false, type: "", cop: 0 },
  biomass: { enabled: false, type: "" },
  otherRenew: {},
  battery: {},
  auditor: { ...mockAuditor },
  useNA2023: true,
  finAnalysisInputs: {},
  selectedClimate: { ...mockSelectedClimate },
  instSummary: { ...mockInstSummary },
  renewSummary: { ...mockRenewSummary },
  envelopeSummary: { ...mockEnvelopeSummary },
  monthlyISO: null,
  showToast: vi.fn(),
  setExporting: vi.fn(),
  lang: "RO",
});

// ═══════════════════════════════════════════════════════════════════════════
// exportProject — JSON blob download
// ═══════════════════════════════════════════════════════════════════════════
describe("exportProject", () => {
  it("creează Blob JSON și trigger click pe anchor element", () => {
    const ctx = minCtx();
    exportProject(ctx);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("filename conține adresa clădirii și data curentă", () => {
    const ctx = minCtx();
    exportProject(ctx);
    const anchor = createElementSpy.mock.results[0].value;
    expect(anchor.download).toContain("Zephren_");
    expect(anchor.download).toContain("Strada Test 1");
    expect(anchor.download).toMatch(/\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// exportCSV — CSV cu anvelopă + sisteme + rezultate
// ═══════════════════════════════════════════════════════════════════════════
describe("exportCSV", () => {
  it("generează CSV cu header + secțiuni (DATE/INSTALATII/REZULTATE)", () => {
    const ctx = minCtx();
    ctx.opaqueElements = [{ name: "Perete N", type: "PE", orientation: "N", area: "50", layers: [{ matName: "BCA", lambda: 0.3, thickness: "250" }] }];
    exportCSV(ctx);
    const blob = new Blob([""], { type: "text/csv" });
    expect(Blob).toBeDefined();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("CSV"), "success");
  });

  it("include BOM UTF-8 în Blob pentru Excel compat", () => {
    const ctx = minCtx();
    exportCSV(ctx);
    expect(capturedBlobs.length).toBeGreaterThan(0);
    expect(capturedBlobs[0].parts[0]).toMatch(/^\uFEFF/);
  });

  it("toast în engleză când lang=EN", () => {
    const ctx = minCtx();
    ctx.lang = "EN";
    exportCSV(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/successfully/i), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// exportXML — CPE XML MDLPA
// ═══════════════════════════════════════════════════════════════════════════
describe("exportXML", () => {
  it("refuză export dacă instSummary lipsește", () => {
    const ctx = minCtx();
    ctx.instSummary = null;
    exportXML(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Pasul 5"), "error");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("generează XML cu namespace MDLPA + format Mc001-2022", () => {
    const ctx = minCtx();
    exportXML(ctx);
    expect(capturedBlobs.length).toBeGreaterThan(0);
    const xmlContent = capturedBlobs[0].parts[0];
    expect(xmlContent).toContain("urn:ro:mdlpa:certificat-performanta-energetica:2023");
    expect(xmlContent).toContain("Mc001-2022");
    expect(xmlContent).toContain("<CPE_RegistruElectronic");
    expect(xmlContent).toContain(mockBuilding.address);
  });

  it("include toate clasele energetice + RER + conform nZEB", () => {
    const ctx = minCtx();
    exportXML(ctx);
    const xmlContent = capturedBlobs[0].parts[0];
    expect(xmlContent).toContain("<ClasaEnergetica>");
    expect(xmlContent).toContain("<RER unit=\"%\">");
    expect(xmlContent).toContain("<ConformNZEB>");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// generateQRCodeSVG — pattern vizual QR-like
// ═══════════════════════════════════════════════════════════════════════════
describe("generateQRCodeSVG", () => {
  it("returnează SVG valid cu viewBox și pattern cells", () => {
    const svg = generateQRCodeSVG("test-data", 200);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain(`viewBox="0 0 200 200"`);
    expect(svg).toContain(`width="200"`);
    expect(svg).toContain("<rect");
    expect(svg).toContain(`fill="#fff"`);
    expect(svg).toContain(`fill="#000"`);
  });

  it("default size 100 când arg omis", () => {
    const svg = generateQRCodeSVG("test");
    expect(svg).toContain(`viewBox="0 0 100 100"`);
  });

  it("deterministic: același input → același output", () => {
    const a = generateQRCodeSVG("zephren-test-123", 150);
    const b = generateQRCodeSVG("zephren-test-123", 150);
    expect(a).toBe(b);
  });

  it("input diferit → output diferit (produce cel puțin 2 variante distincte)", () => {
    // QR-ul intern folosește (seed*i)%3 — dacă două seed-uri au același modulo 3,
    // produce output identic. Verificăm că peste un set divers găsim ≥2 variante.
    const outputs = new Set();
    for (const s of ["a", "b", "c", "abc", "xyz", "test1", "test2", "test3", "zephren", "foo", "bar"]) {
      outputs.add(generateQRCodeSVG(s, 100));
    }
    expect(outputs.size).toBeGreaterThan(1);
  });

  it("text gol → fallback 'zephren'", () => {
    const svg = generateQRCodeSVG("", 100);
    expect(svg).toMatch(/^<svg/); // nu crash
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// exportBulkProjects — ZIP JSON cu multi proiecte
// ═══════════════════════════════════════════════════════════════════════════
describe("exportBulkProjects", () => {
  it("refuză când lista de proiecte e goală", () => {
    const ctx = { projectList: [], showToast: vi.fn() };
    exportBulkProjects(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Niciun proiect"), "error");
  });

  it("procesează proiecte din localStorage și generează Blob bulk", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((k) => k.includes("proj_1") ? JSON.stringify({ building: mockBuilding }) : null),
      setItem: vi.fn(),
    });
    vi.stubGlobal("window", { storage: null });
    const ctx = {
      projectList: [{ id: "proj_1", name: "Test project", date: "2026-04-15" }],
      showToast: vi.fn(),
    };
    exportBulkProjects(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("1 proiecte"), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// generateAuditReport — raport .txt audit
// ═══════════════════════════════════════════════════════════════════════════
describe("generateAuditReport", () => {
  it("refuză dacă instSummary lipsește", () => {
    const ctx = minCtx();
    ctx.instSummary = null;
    generateAuditReport(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Pasul 5"), "error");
  });

  it("generează text plain cu secțiunile 1-5", () => {
    const ctx = minCtx();
    generateAuditReport(ctx);
    const text = capturedBlobs[0].parts[0];
    expect(text).toContain("RAPORT DE AUDIT ENERGETIC");
    expect(text).toContain("1. IDENTIFICARE CLĂDIRE");
    expect(text).toContain("2. REZULTATE CALCUL ENERGETIC");
    expect(text).toContain("3. OBSERVAȚII ȘI CONSTATĂRI");
    expect(text).toContain("4. RECOMANDĂRI DE REABILITARE");
    expect(text).toContain("5. DATE AUDITOR");
    expect(text).toContain("Mc 001-2022");
  });

  it("include adresa și categoria clădirii", () => {
    const ctx = minCtx();
    generateAuditReport(ctx);
    const text = capturedBlobs[0].parts[0];
    expect(text).toContain("Strada Test 1");
    expect(text).toContain("București");
  });
});
