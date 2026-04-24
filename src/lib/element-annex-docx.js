/**
 * element-annex-docx.js — Sprint 22 #23
 * Export anexă DOCX per element opac cu:
 *  - Titlu "Anexa 1.N — Fișă tehnică [nume element]"
 *  - Descriere textuală a secțiunii (int → ext) cu grosimi
 *  - Tabel straturi: λ, μ, ρ, grosime, R parțial
 *  - Metrici sumar: R total, U, U_base, ΔU″, masă/m², inerție termică
 *  - Justificare normativă (Mc 001-2022, ISO 6946)
 *
 * Format: A4 portret (11906 × 16838 DXA — conform feedback proiect).
 */
import { calcOpaqueR } from "../calc/opaque.js";
import { getMaterialFireClass, FIRE_CLASSES } from "../calc/fire-safety.js";

function fmtNum(v, decimals = 2) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function elementTypeName(code) {
  const map = {
    PE: "Perete exterior",
    PR: "Perete la rost închis",
    PS: "Perete subsol",
    PT: "Planșeu terasă",
    PP: "Planșeu sub pod neîncălzit",
    PB: "Planșeu peste subsol neîncălzit",
    PI: "Planșeu intermediar",
    PL: "Placă pe sol",
    SE: "Planșeu separator exterior",
  };
  return map[code] || code;
}

/**
 * Calculează metrici per element (R, U, masă/m², D inerție, fire_class).
 */
function computeElementMetrics(element) {
  const layers = element.layers || [];
  const res = calcOpaqueR(layers, element.type, element.fastener);

  // Masa pe m² (kg/m²) = Σ (thickness_m × density)
  const massPerM2 = layers.reduce((s, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000;
    const rho = parseFloat(l.rho) || 0;
    return s + d * rho;
  }, 0);

  // Inerție termică D = Σ (s_i · d_i) simplificat
  // s = √(λ · ρ · cp · 2π/T) cu T = 86400s (24h); aproximare cp=1000 dacă lipsă
  const T_period = 86400;
  const D = layers.reduce((s, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000;
    const lambda = parseFloat(l.lambda) || 0;
    const rho = parseFloat(l.rho) || 0;
    const cp = parseFloat(l.cp) || 1000;
    if (d > 0 && lambda > 0 && rho > 0) {
      const omega = (2 * Math.PI) / T_period;
      const s_coef = Math.sqrt(lambda * rho * cp * omega);
      return s + s_coef * d;
    }
    return s;
  }, 0);

  // Fire class: cea mai slabă din toate straturile
  let worstFireRank = -1;
  let worstFireClass = "A1";
  layers.forEach(l => {
    const fc = getMaterialFireClass(l);
    const rank = FIRE_CLASSES[fc]?.rank ?? 99;
    if (rank > worstFireRank) {
      worstFireRank = rank;
      worstFireClass = fc;
    }
  });

  return {
    ...res,
    massPerM2: Math.round(massPerM2 * 10) / 10,
    D: Math.round(D * 1000) / 1000,
    worstFireClass,
    fastenerLabel: res.fastenerLabel,
  };
}

/**
 * Construiește o "secțiune SVG" textuală (ASCII) pentru DOCX.
 * Structura: linie orizontală cu zone colorate pentru fiecare strat + etichete.
 */
function buildSectionDescription(element) {
  const layers = element.layers || [];
  if (layers.length === 0) return "(fără straturi)";
  const totalD = layers.reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);
  const lines = [
    `Secțiune: total ${totalD.toFixed(0)} mm (interior → exterior)`,
  ];
  layers.forEach((l, i) => {
    const d = parseFloat(l.thickness) || 0;
    const pct = totalD > 0 ? (d / totalD * 100).toFixed(0) : "0";
    lines.push(
      `  ${i + 1}. ${l.matName || l.material || "?"} — ${d} mm (${pct}% din grosime) · λ=${l.lambda || "—"} W/(m·K)`
    );
  });
  return lines.join("\n");
}

/**
 * Export anexe DOCX pentru toate elementele opace (unul câte unul sau toate într-un singur fișier).
 * @param {Array} opaqueElements
 * @param {object} options - { filename?, building?, asSingleDoc? (default true) }
 */
export async function exportElementAnnexesDOCX(opaqueElements, options = {}) {
  if (!opaqueElements || opaqueElements.length === 0) {
    throw new Error("Nu există elemente opace pentru export anexe.");
  }

  const {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    AlignmentType,
    PageOrientation,
    PageBreak,
    WidthType,
    BorderStyle,
    Packer,
  } = await import("docx");

  const makeHeaderCell = (text) => new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18 })] })],
    shading: { fill: "EEEEEE" },
  });
  const makeCell = (text, pct = 20) => new TableCell({
    width: { size: pct, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 18 })] })],
  });

  const makeLayersTable = (element) => {
    const header = new TableRow({
      children: [
        makeHeaderCell("#"),
        makeHeaderCell("Material"),
        makeHeaderCell("δ [mm]"),
        makeHeaderCell("λ [W/(m·K)]"),
        makeHeaderCell("ρ [kg/m³]"),
        makeHeaderCell("μ [-]"),
        makeHeaderCell("R [m²·K/W]"),
      ],
    });
    const rows = (element.layers || []).map((l, i) => {
      const d = parseFloat(l.thickness) || 0;
      const lambda = parseFloat(l.lambda) || 0;
      const rho = parseFloat(l.rho) || 0;
      const mu = parseFloat(l.mu) || 0;
      const Rpart = (d > 0 && lambda > 0) ? (d / 1000 / lambda) : 0;
      return new TableRow({
        children: [
          makeCell(i + 1, 5),
          makeCell(l.matName || l.material || "—", 30),
          makeCell(fmtNum(d, 0), 10),
          makeCell(fmtNum(lambda, 3), 13),
          makeCell(fmtNum(rho, 0), 13),
          makeCell(fmtNum(mu, 0), 12),
          makeCell(fmtNum(Rpart, 3), 17),
        ],
      });
    });
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [header, ...rows],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
    });
  };

  const makeMetricsTable = (metrics) => {
    const row = (k, v) => new TableRow({
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 18 })] })],
        }),
      ],
    });
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        row("R straturi",                `${fmtNum(metrics.r_layers, 3)} m²·K/W`),
        row("R total (cu R_si + R_se)",  `${fmtNum(metrics.r_total, 3)} m²·K/W`),
        row("U_base (fără ΔU″)",         `${fmtNum(metrics.u_base, 3)} W/(m²·K)`),
        row("ΔU″ fixări mecanice",       `${fmtNum(metrics.deltaU, 3)} W/(m²·K) (${metrics.fastenerLabel || "—"})`),
        row("U' (transmitanță corectată)", `${fmtNum(metrics.u, 3)} W/(m²·K)`),
        row("Masă/m²",                   `${fmtNum(metrics.massPerM2, 1)} kg/m²`),
        row("Indice inerție termică D",  `${fmtNum(metrics.D, 3)}`),
        row("Clasă foc (cel mai slab strat)", `${metrics.worstFireClass} — ${FIRE_CLASSES[metrics.worstFireClass]?.label || ""}`),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
    });
  };

  // ── Construire conținut ──
  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "ANEXE TEHNICE — ELEMENTE OPACE", bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "Fișe tehnice per element, conform Mc 001-2022 + SR EN ISO 6946:2017",
        size: 18, color: "666666", italics: true,
      })],
    }),
    new Paragraph({ text: "" }),
  ];

  opaqueElements.forEach((el, idx) => {
    const metrics = computeElementMetrics(el);
    const section = buildSectionDescription(el);
    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({
          text: `Anexa 1.${idx + 1} — Fișă tehnică: ${el.name || "Element " + (idx + 1)}`,
          bold: true, size: 24,
        })],
      }),
      new Paragraph({
        children: [new TextRun({
          text: `Tip: ${elementTypeName(el.type)} (${el.type}) · Orientare: ${el.orientation || "—"} · Suprafață: ${fmtNum(el.area, 2)} m²`,
          size: 20,
        })],
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: "1. Secțiune transversală (int → ext)", bold: true, size: 22 })],
      }),
      ...section.split("\n").map(line => new Paragraph({
        children: [new TextRun({ text: line, size: 18, font: "Courier New" })],
      })),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: "2. Straturi constructive", bold: true, size: 22 })],
      }),
      makeLayersTable(el),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: "3. Metrici sumar", bold: true, size: 22 })],
      }),
      makeMetricsTable(metrics),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: "4. Justificare normativă", bold: true, size: 22 })],
      }),
      new Paragraph({
        children: [new TextRun({
          text: "• SR EN ISO 6946:2017 Anexa F — corecție ΔU″ pentru fixări mecanice prin stratul izolant.",
          size: 18,
        })],
      }),
      new Paragraph({
        children: [new TextRun({
          text: "• Mc 001-2022 §3.3.1 + Tabel 2.19 — rezistențe superficiale R_si, R_se per tip element.",
          size: 18,
        })],
      }),
      new Paragraph({
        children: [new TextRun({
          text: "• SR EN 13501-1:2019 — clasificare reacție la foc straturi (Euroclasse A1–F).",
          size: 18,
        })],
      }),
      new Paragraph({ text: "" }),
    );
  });

  // Footer
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `Document generat ${new Date().toLocaleString("ro-RO")} de Zephren Energy Calculator.`,
        size: 14, color: "999999", italics: true,
      })],
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = options.filename || `anexe_elemente_${new Date().toISOString().slice(0, 10)}.docx`;
  // În mediu de test (lipsă `document`) doar întoarce blob + filename
  if (typeof document === "undefined") {
    return { blob, filename };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { blob, filename };
}

// Expus doar pentru testare (builder-ul pur de metrici fără DOCX)
export const __testing__ = {
  computeElementMetrics,
  buildSectionDescription,
  fmtNum,
  elementTypeName,
};
