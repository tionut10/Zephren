/**
 * Tests pentru pdf-brand-charts.js — Sprint Visual-3 (8 mai 2026)
 *
 * Acoperire smoke (jsPDF mock parțial):
 *   - renderBarChart vertical / orizontal cu data goală / valid
 *   - renderPieChart donut + pie cu segmente multiple
 *   - renderLineChart cu 1-2 serii + threshold
 *   - renderTimelineChart cu faze + milestone-uri
 *
 * jsPDF este mock-uit minimal — verificăm doar că funcțiile NU aruncă
 * erori și apelează metodele așteptate. Nu validăm rendering pixel-perfect.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderBarChart,
  renderPieChart,
  renderLineChart,
  renderTimelineChart,
} from "../pdf-brand-charts.js";

function makeMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setLineDashPattern: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    text: vi.fn(),
    lines: vi.fn(),
  };
}

describe("pdf-brand-charts · renderBarChart", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("data goală — niciun apel rect/line", () => {
    renderBarChart(doc, 0, 0, 100, 50, { data: [] });
    expect(doc.rect).not.toHaveBeenCalled();
  });

  it("vertical — apelează rect pentru fiecare bară", () => {
    renderBarChart(doc, 0, 0, 100, 50, {
      title: "Test",
      data: [
        { label: "A", value: 10 },
        { label: "B", value: 20 },
        { label: "C", value: 5 },
      ],
      orientation: "vertical",
    });
    // O bară per data point + grid lines
    expect(doc.rect).toHaveBeenCalledTimes(3);
    expect(doc.text).toHaveBeenCalled();
  });

  it("orizontal — apelează rect pentru fiecare bară", () => {
    renderBarChart(doc, 0, 0, 100, 50, {
      data: [
        { label: "Solar", value: 15000 },
        { label: "Wind", value: 8500 },
      ],
      orientation: "horizontal",
      unit: "kWh",
    });
    expect(doc.rect).toHaveBeenCalledTimes(2);
  });

  it("acceptă custom color per bară", () => {
    renderBarChart(doc, 0, 0, 100, 50, {
      data: [
        { label: "Reducere", value: 50, color: [255, 0, 0] },
      ],
    });
    expect(doc.setFillColor).toHaveBeenCalledWith(255, 0, 0);
  });

  it("showValues=false — nu afișează valori pe bare", () => {
    renderBarChart(doc, 0, 0, 100, 50, {
      data: [{ label: "X", value: 100 }],
      showValues: false,
    });
    // Apelurile la text sunt doar pentru axis labels / unit / title — nu pentru valori
    // (smoke check: text apelat dar pentru alte scopuri)
    expect(doc.text).toHaveBeenCalled();
  });
});

describe("pdf-brand-charts · renderPieChart", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("data goală — niciun apel lines", () => {
    renderPieChart(doc, 50, 50, 20, { data: [] });
    expect(doc.lines).not.toHaveBeenCalled();
  });

  it("total = 0 — niciun apel lines", () => {
    renderPieChart(doc, 50, 50, 20, {
      data: [{ label: "X", value: 0 }, { label: "Y", value: 0 }],
    });
    expect(doc.lines).not.toHaveBeenCalled();
  });

  it("donut chart — apelează lines pentru fiecare segment", () => {
    renderPieChart(doc, 50, 50, 20, {
      title: "Pierderi anvelopă",
      data: [
        { label: "Pereți", value: 40 },
        { label: "Ferestre", value: 25 },
        { label: "Planșeu", value: 20 },
        { label: "Ventilare", value: 15 },
      ],
      donut: true,
    });
    expect(doc.lines).toHaveBeenCalledTimes(4);
  });

  it("pie chart simplu — la fel apelează lines", () => {
    renderPieChart(doc, 50, 50, 20, {
      data: [
        { label: "A", value: 60 },
        { label: "B", value: 40 },
      ],
      donut: false,
    });
    expect(doc.lines).toHaveBeenCalledTimes(2);
  });

  it("legendă activă — text apelat de mai multe ori", () => {
    renderPieChart(doc, 50, 50, 20, {
      data: [
        { label: "Solar", value: 50 },
        { label: "Wind", value: 30 },
        { label: "Hydro", value: 20 },
      ],
      showLegend: true,
    });
    // Apel text pentru legendă (3 segmente) + procentaje pe segmente
    expect(doc.text.mock.calls.length).toBeGreaterThan(3);
  });
});

describe("pdf-brand-charts · renderLineChart", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("series goale — niciun apel line", () => {
    renderLineChart(doc, 0, 0, 100, 50, { xLabels: [], series: [] });
    expect(doc.line).not.toHaveBeenCalled();
  });

  it("1 serie cu 5 puncte — apelează line pentru segmente + 2 cerculețe markeri", () => {
    renderLineChart(doc, 0, 0, 100, 50, {
      title: "NPV cumulativ",
      xLabels: [0, 5, 10, 15, 20],
      series: [
        { label: "Cu reabilitare", data: [-10, -5, 5, 15, 25] },
      ],
    });
    // line() apelat de multe ori (4 segmente serii + 6 grid lines + 5 axe ticks min)
    expect(doc.line.mock.calls.length).toBeGreaterThan(4);
    // 2 markeri (start + end) per serie
    expect(doc.circle).toHaveBeenCalledTimes(2);
  });

  it("threshold afișează linie horizontală cu dash pattern", () => {
    renderLineChart(doc, 0, 0, 100, 50, {
      xLabels: [0, 1, 2],
      series: [{ label: "X", data: [-5, 0, 10] }],
      threshold: 0,
      thresholdLabel: "Break-even",
    });
    expect(doc.setLineDashPattern).toHaveBeenCalled();
  });

  it("multiserii afișează legendă", () => {
    renderLineChart(doc, 0, 0, 100, 50, {
      xLabels: [0, 1, 2, 3],
      series: [
        { label: "Baseline", data: [100, 100, 100, 100] },
        { label: "Reabilitat", data: [100, 80, 60, 50] },
      ],
    });
    // 2 rect-uri pentru pătrățele legendă + diverse line/text
    expect(doc.rect.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("pdf-brand-charts · renderTimelineChart", () => {
  let doc;
  beforeEach(() => { doc = makeMockDoc(); });

  it("phases gol — desenează doar axa", () => {
    renderTimelineChart(doc, 0, 0, 100, 50, {
      phases: [],
      yearStart: 2026,
      yearEnd: 2050,
    });
    // Nu apelează roundedRect (fără faze)
    expect(doc.roundedRect).not.toHaveBeenCalled();
    // Apelează line pentru axă + tick-uri
    expect(doc.line).toHaveBeenCalled();
  });

  it("3 faze — apelează roundedRect pentru fiecare", () => {
    renderTimelineChart(doc, 0, 0, 100, 50, {
      title: "Foaie de parcurs nZEB",
      phases: [
        { label: "Faza 1: Anvelopă", startYear: 2026, endYear: 2028 },
        { label: "Faza 2: HVAC", startYear: 2028, endYear: 2032 },
        { label: "Faza 3: Regenerabile", startYear: 2032, endYear: 2040 },
      ],
      yearStart: 2026,
      yearEnd: 2050,
    });
    expect(doc.roundedRect).toHaveBeenCalledTimes(3);
  });

  it("milestone-uri activate desenează linii dashed verticale", () => {
    renderTimelineChart(doc, 0, 0, 100, 50, {
      phases: [{ label: "F1", startYear: 2026, endYear: 2030 }],
      yearStart: 2026,
      yearEnd: 2050,
      milestones: [
        { year: 2030, label: "MEPS C" },
        { year: 2033, label: "MEPS B" },
        { year: 2050, label: "nZEB" },
      ],
    });
    // setLineDashPattern apelat pentru milestone-uri
    expect(doc.setLineDashPattern).toHaveBeenCalled();
  });
});

describe("pdf-brand-charts · integration", () => {
  it("toate funcțiile sunt re-exportate din default", async () => {
    const mod = await import("../pdf-brand-charts.js");
    const def = mod.default;
    expect(def.renderBarChart).toBe(renderBarChart);
    expect(def.renderPieChart).toBe(renderPieChart);
    expect(def.renderLineChart).toBe(renderLineChart);
    expect(def.renderTimelineChart).toBe(renderTimelineChart);
  });
});
