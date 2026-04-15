import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resetProject,
  importProject,
  importENERGPlus,
  importDOSET,
  importGbXML,
  importCSV,
  importCompareRef,
  importBulkProjects,
  importIFC,
} from "../importHandlers.js";

// ═══════════════════════════════════════════════════════════════════════════
// FileReader mock — majoritatea importurilor citesc file-uri via FileReader
// ═══════════════════════════════════════════════════════════════════════════
class MockFileReader {
  constructor() { this.onload = null; this.onerror = null; this.result = null; }
  readAsText(file) {
    setTimeout(() => {
      this.result = file?._content ?? "";
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  readAsDataURL(file) {
    setTimeout(() => {
      this.result = `data:${file?.type || "image/jpeg"};base64,bW9jaw==`;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
}

// DOMParser mock minimal — returnează o structură fake pentru XML parsing
class MockDOMParser {
  parseFromString(str, type) {
    const doc = {
      _src: str,
      _type: type,
      documentElement: { namespaceURI: "" },
      querySelector(sel) {
        // Cazuri specifice pentru testele noastre
        const patterns = {
          "Adresa": /<Adresa>([^<]*)<\/Adresa>/,
          "SuprafataUtila": /<SuprafataUtila[^>]*>([^<]*)<\/SuprafataUtila>/,
          "AnConstructie": /<AnConstructie>([^<]*)<\/AnConstructie>/,
          "adresa_cladire": /<adresa_cladire>([^<]*)<\/adresa_cladire>/,
          "aria_utila": /<aria_utila>([^<]*)<\/aria_utila>/,
          "an_constructie": /<an_constructie>([^<]*)<\/an_constructie>/,
          "categorie_functionala": /<categorie_functionala>([^<]*)<\/categorie_functionala>/,
          "Building": /<Building>([^<]*)<\/Building>/,
        };
        const re = patterns[sel];
        if (re) {
          const m = str.match(re);
          return m ? { textContent: m[1] } : null;
        }
        return null;
      },
      querySelectorAll(sel) { return []; },
      getElementsByTagNameNS(ns, tag) {
        if (tag === "Surface") return [];
        if (tag === "Building") return [];
        return [];
      },
    };
    return doc;
  }
}

beforeEach(() => {
  vi.stubGlobal("FileReader", MockFileReader);
  vi.stubGlobal("DOMParser", MockDOMParser);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const makeFile = (content, type = "text/plain", name = "test.txt") => ({
  name, type, _content: content,
});

// ═══════════════════════════════════════════════════════════════════════════
// resetProject — reset complet state la valori INITIAL_*
// ═══════════════════════════════════════════════════════════════════════════
describe("resetProject", () => {
  it("apelează toate setterii cu valori inițiale", () => {
    const setters = {
      setStep: vi.fn(), setBuilding: vi.fn(), setOpaqueElements: vi.fn(),
      setGlazingElements: vi.fn(), setThermalBridges: vi.fn(),
      setEditingOpaque: vi.fn(), setShowOpaqueModal: vi.fn(),
      setEditingGlazing: vi.fn(), setShowGlazingModal: vi.fn(),
      setEditingBridge: vi.fn(), setShowBridgeModal: vi.fn(), setShowBridgeCatalog: vi.fn(),
      setInstSubTab: vi.fn(), setHeating: vi.fn(), setAcm: vi.fn(), setCooling: vi.fn(),
      setVentilation: vi.fn(), setLighting: vi.fn(), setRenewSubTab: vi.fn(),
      setSolarThermal: vi.fn(), setPhotovoltaic: vi.fn(), setHeatPump: vi.fn(),
      setBiomass: vi.fn(), setOtherRenew: vi.fn(), setAuditor: vi.fn(),
      setShowResetConfirm: vi.fn(),
    };
    resetProject(setters);
    expect(setters.setStep).toHaveBeenCalledWith(1);
    expect(setters.setBuilding).toHaveBeenCalledWith(expect.objectContaining({ category: expect.any(String) }));
    expect(setters.setOpaqueElements).toHaveBeenCalledWith([]);
    expect(setters.setGlazingElements).toHaveBeenCalledWith([]);
    expect(setters.setThermalBridges).toHaveBeenCalledWith([]);
    expect(setters.setInstSubTab).toHaveBeenCalledWith("heating");
    expect(setters.setRenewSubTab).toHaveBeenCalledWith("solar_th");
    expect(setters.setShowResetConfirm).toHaveBeenCalledWith(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importProject — JSON project cu validare schemă
// ═══════════════════════════════════════════════════════════════════════════
describe("importProject", () => {
  const makeCtx = () => ({
    file: null, lang: "RO", showToast: vi.fn(), setStep: vi.fn(),
    setBuilding: vi.fn(), setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(),
    setThermalBridges: vi.fn(), setHeating: vi.fn(), setAcm: vi.fn(),
    setCooling: vi.fn(), setVentilation: vi.fn(), setLighting: vi.fn(),
    setSolarThermal: vi.fn(), setPhotovoltaic: vi.fn(), setHeatPump: vi.fn(),
    setBiomass: vi.fn(), setOtherRenew: vi.fn(), setAuditor: vi.fn(),
    setUseNA2023: vi.fn(), setFinAnalysisInputs: vi.fn(),
  });

  it("respinge JSON ce nu e obiect (array la root)", async () => {
    const ctx = makeCtx();
    ctx.file = makeFile(JSON.stringify([1, 2, 3]));
    importProject(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Format invalid"), "error");
    expect(ctx.setBuilding).not.toHaveBeenCalled();
  });

  it("respinge obiect fără chei cunoscute", async () => {
    const ctx = makeCtx();
    ctx.file = makeFile(JSON.stringify({ foo: 1, bar: 2 }));
    importProject(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Format invalid"), "error");
  });

  it("aplică proiect valid și setează step=1", async () => {
    const ctx = makeCtx();
    const data = {
      building: { address: "Test", category: "RI" },
      opaqueElements: [{ name: "P1", type: "PE", area: "50" }],
      glazingElements: [],
      thermalBridges: [],
      heating: { source: "CAZAN_GAZ" },
    };
    ctx.file = makeFile(JSON.stringify(data));
    importProject(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.setBuilding).toHaveBeenCalled();
    expect(ctx.setOpaqueElements).toHaveBeenCalledWith(data.opaqueElements);
    expect(ctx.setHeating).toHaveBeenCalled();
    expect(ctx.setStep).toHaveBeenCalledWith(1);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("succes"), "success");
  });

  it("respinge opaqueElements care nu e array", async () => {
    const ctx = makeCtx();
    ctx.file = makeFile(JSON.stringify({ building: { address: "x" }, opaqueElements: "not-array" }));
    importProject(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("opaqueElements"), "error");
  });

  it("mesaj în engleză când lang=EN", async () => {
    const ctx = makeCtx();
    ctx.lang = "EN";
    ctx.file = makeFile(JSON.stringify([1]));
    importProject(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/Invalid format/i), "error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importENERGPlus — XML energetic generic
// ═══════════════════════════════════════════════════════════════════════════
describe("importENERGPlus", () => {
  it("extrage adresa și suprafața din XML standard", async () => {
    const ctx = {
      file: makeFile(`
        <?xml version="1.0"?>
        <Root>
          <Adresa>Bd. Unirii 10</Adresa>
          <SuprafataUtila>150</SuprafataUtila>
          <AnConstructie>1985</AnConstructie>
        </Root>
      `),
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), showToast: vi.fn(),
    };
    importENERGPlus(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.setBuilding).toHaveBeenCalled();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Import XML"), "success");
  });

  it("raportează eroare la XML malformat", async () => {
    const ctx = {
      file: makeFile(""),
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), showToast: vi.fn(),
    };
    // Override DOMParser ca să arunce eroare
    vi.stubGlobal("DOMParser", class { parseFromString() { throw new Error("bad xml"); } });
    importENERGPlus(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Eroare parsare"), "error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importDOSET — XML format DOSET/MDLPA
// ═══════════════════════════════════════════════════════════════════════════
describe("importDOSET", () => {
  it("extrage câmpuri specifice DOSET (adresa_cladire, aria_utila)", async () => {
    const ctx = {
      file: makeFile(`<?xml version="1.0"?>
        <root>
          <adresa_cladire>Strada DOSET 5</adresa_cladire>
          <aria_utila>200</aria_utila>
          <an_constructie>2000</an_constructie>
          <categorie_functionala>1</categorie_functionala>
        </root>`),
      setBuilding: vi.fn(), showToast: vi.fn(),
    };
    importDOSET(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.setBuilding).toHaveBeenCalled();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Import DOSET"), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importGbXML — parser gbXML pentru surfaces
// ═══════════════════════════════════════════════════════════════════════════
describe("importGbXML", () => {
  it("rulează fără crash pe XML vid", async () => {
    const ctx = {
      file: makeFile(`<?xml version="1.0"?><gbXML></gbXML>`),
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), showToast: vi.fn(),
    };
    importGbXML(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Import gbXML"), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importCSV — CSV cu elemente opace și vitrate
// ═══════════════════════════════════════════════════════════════════════════
describe("importCSV", () => {
  it("respinge CSV cu mai puțin de 2 linii", async () => {
    const ctx = {
      file: makeFile("header-only"),
      setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(), showToast: vi.fn(),
    };
    importCSV(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("CSV invalid"), "error");
  });

  it("procesează CSV valid cu elemente opace și vitrate", async () => {
    const ctx = {
      file: makeFile(`Denumire,Tip,Suprafata,U,g,Categorie
Perete N,PE,50,0.4,,opaque
Fereastra S,,2.5,1.1,0.7,glazing`),
      setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(), showToast: vi.fn(),
    };
    importCSV(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Importat"), "success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importCompareRef — referință proiect pentru comparație scenarii
// ═══════════════════════════════════════════════════════════════════════════
describe("importCompareRef", () => {
  it("setează compareRef pentru JSON valid cu areaUseful", async () => {
    const ctx = {
      file: makeFile(JSON.stringify({
        building: { address: "Ref", category: "RI", areaUseful: "100" },
        instSummary: { ep_total_m2: 150, co2_total_m2: 25, qf_total: 6000 },
        renewSummary: { ep_adjusted_m2: 120, co2_adjusted_m2: 20, rer: 30 },
        envelopeSummary: { G: 0.4 },
      })),
      setCompareRef: vi.fn(), showToast: vi.fn(),
    };
    importCompareRef(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.setCompareRef).toHaveBeenCalledWith(expect.objectContaining({
      name: "Ref", Au: 100, ep: 150, rer: 30, // ep_total_m2 are prioritate peste ep_adjusted_m2
    }));
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("referință"), "success");
  });

  it("respinge fișier fără areaUseful", async () => {
    const ctx = {
      file: makeFile(JSON.stringify({ building: {} })),
      setCompareRef: vi.fn(), showToast: vi.fn(),
    };
    importCompareRef(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("nu conține date"), "error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importIFC — format BIM IFC 2x3/IFC4 (STEP ASCII)
// ═══════════════════════════════════════════════════════════════════════════
describe("importIFC", () => {
  it("respinge file cu extensie greșită", () => {
    const ctx = {
      file: { name: "test.txt", size: 100, _content: "" },
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(),
      showToast: vi.fn(),
    };
    importIFC(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("extensia .ifc"), "error");
  });

  it("respinge file > 50 MB", () => {
    const ctx = {
      file: { name: "huge.ifc", size: 60 * 1024 * 1024, _content: "" },
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(),
      showToast: vi.fn(),
    };
    importIFC(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("50 MB"), "error");
  });

  it("procesează IFC minimal cu pereți și ferestre", async () => {
    const ifcText = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition'),'2;1');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#100 = IFCPROJECT('abc','Owner','Project Test',$,$,$,$,(#110),#200);
#101 = IFCBUILDING('def','Owner','Building Test',$,$,$,$,$,.ELEMENT.,$,$,$);
#110 = IFCBUILDINGSTOREY('ghi','Owner','Parter',$,$,$,$,$,.ELEMENT.,0.0);
#200 = IFCWALL('xyz','Owner','Perete 1',$,$,$,$,$,.STANDARD.);
#201 = IFCWINDOW('win','Owner','Fereastră 1',$,$,$,$,$,1.2,1.5);
ENDSEC;
END-ISO-10303-21;`;
    const ctx = {
      file: { name: "test.ifc", size: ifcText.length, _content: ifcText },
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(),
      showToast: vi.fn(),
    };
    importIFC(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Import IFC"), "success", 5000);
  });

  it("raportează eroare la IFC gol fără elemente recunoscute", async () => {
    const ctx = {
      file: { name: "empty.ifc", size: 10, _content: "ISO-10303-21;\nEND-ISO-10303-21;" },
      setBuilding: vi.fn(), setOpaqueElements: vi.fn(), setGlazingElements: vi.fn(),
      showToast: vi.fn(),
    };
    importIFC(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("nu conține elemente"), "error");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// importBulkProjects — arhivă JSON multi-proiect
// ═══════════════════════════════════════════════════════════════════════════
describe("importBulkProjects", () => {
  it("respinge format incorect (fără zephren-bulk marker)", async () => {
    const ctx = {
      file: makeFile(JSON.stringify({ random: "data" })),
      lang: "RO", showToast: vi.fn(),
    };
    importBulkProjects(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining("Format invalid"), "error");
  });

  it("procesează bulk valid și scrie în localStorage", async () => {
    vi.stubGlobal("localStorage", { setItem: vi.fn(), getItem: vi.fn() });
    vi.stubGlobal("window", { storage: null });
    const ctx = {
      file: makeFile(JSON.stringify({
        format: "zephren-bulk",
        version: "3.0",
        projects: [
          { id: "p1", name: "P1", date: "2026-01-01", data: { building: {} } },
          { id: "p2", name: "P2", date: "2026-02-01", data: { building: {} } },
        ],
      })),
      lang: "RO", showToast: vi.fn(),
    };
    importBulkProjects(ctx);
    await vi.runAllTimersAsync();
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringMatching(/\d+\/2 proiecte importate/), "success");
  });
});
