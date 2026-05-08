/**
 * element-annex-docx.js — Sprint 22 #23 + Sprint Visual-8 (8 mai 2026)
 *
 * Export anexă DOCX per element opac cu:
 *  - Titlu "Anexa 1.N — Fișă tehnică [nume element]"
 *  - Descriere textuală a secțiunii (int → ext) cu grosimi
 *  - Tabel straturi: λ, μ, ρ, grosime, R parțial
 *  - Metrici sumar: R total, U, U_base, ΔU″, masă/m², inerție termică
 *  - Justificare normativă (Mc 001-2022, ISO 6946)
 *
 * Sprint Visual-8: aplicare brand kit colors în DOCX (PRIMARY verde Zephren
 * pe titluri secțiuni + SLATE_900 pe header tabele + SLATE_50 pe zebra rows).
 *
 * Format: A4 portret (11906 × 16838 DXA — conform feedback proiect).
 */
import { calcOpaqueR } from "../calc/opaque.js";
import { getMaterialFireClass, FIRE_CLASSES } from "../calc/fire-safety.js";
import { BRAND_COLORS } from "./pdf-brand-kit.js";

// Sprint V8: convertor RGB tuple → hex string fără # (DOCX format)
function _rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return "000000";
  return rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Brand colors în format DOCX hex (fără #)
const DOCX_BRAND = Object.freeze({
  PRIMARY: _rgbToHex(BRAND_COLORS.PRIMARY),         // 007A3D
  PRIMARY_DARK: _rgbToHex(BRAND_COLORS.PRIMARY_DARK), // 005A2D
  PRIMARY_FAINT: _rgbToHex(BRAND_COLORS.PRIMARY_FAINT), // E8F6EE
  SLATE_900: _rgbToHex(BRAND_COLORS.SLATE_900),     // 0F172A
  SLATE_700: _rgbToHex(BRAND_COLORS.SLATE_700),     // 334155
  SLATE_500: _rgbToHex(BRAND_COLORS.SLATE_500),     // 64748B
  SLATE_400: _rgbToHex(BRAND_COLORS.SLATE_400),     // 94A3B8
  SLATE_200: _rgbToHex(BRAND_COLORS.SLATE_200),     // E2E8F0
  SLATE_50: _rgbToHex(BRAND_COLORS.SLATE_50),       // F8FAFC
  WHITE: "FFFFFF",
});

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

  // Sprint V8: header SLATE_900 + text WHITE bold (era custom EEEEEE light gri)
  const makeHeaderCell = (text) => new TableCell({
    width: { size: 20, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: DOCX_BRAND.WHITE })] })],
    shading: { fill: DOCX_BRAND.SLATE_900 },
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
      // Sprint V8: borders SLATE_400/SLATE_200 (era custom 888888/CCCCCC gri neutru)
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        left: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        right: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
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
      // Sprint V8: borders brand kit
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        left: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        right: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
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
        size: 18, color: DOCX_BRAND.SLATE_500, italics: true, // Sprint V8: brand SLATE_500 (era 666666)
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
        size: 14, color: DOCX_BRAND.SLATE_500, italics: true, // Sprint V8: brand SLATE_500 (era 999999)
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
  if (typeof document === "undefined" || options.download === false) {
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

/**
 * Sprint P0-B (6 mai 2026) P1-11 — Export DOCX EXTINS cu toate categoriile de anexe:
 * opace + vitraj + punți termice + sisteme HVAC. Format A4 portret consolidat.
 *
 * @param {{
 *   opaque?: Array,    // elemente opace (PE, PT, PB, etc.)
 *   glazing?: Array,   // ferestre / vitraj
 *   bridges?: Array,   // punți termice
 *   systems?: { heating?, cooling?, ventilation?, lighting?, acm? }
 * }} data
 * @param {{ filename?: string, building?: object }} options
 * @returns {Promise<{blob, filename, sectionsCount}>}
 */
export async function exportFullAnnexesDOCX(data, options = {}) {
  const {
    Document, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, PageOrientation, WidthType, BorderStyle,
    Packer, PageBreak,
  } = await import("docx");

  const opaque   = Array.isArray(data?.opaque)  ? data.opaque  : [];
  const glazing  = Array.isArray(data?.glazing) ? data.glazing : [];
  const bridges  = Array.isArray(data?.bridges) ? data.bridges : [];
  const systems  = data?.systems || {};

  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "ANEXE TEHNICE COMPLETE — DOSAR AUDIT", bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "Opace + Vitraj + Punți termice + Sisteme HVAC · Mc 001-2022 + SR EN ISO 6946:2017",
        size: 18, color: DOCX_BRAND.SLATE_500, italics: true, // Sprint V8: brand SLATE_500
      })],
    }),
    new Paragraph({ text: "" }),
  ];

  let sectionsCount = 0;

  // ── Secțiune 1: Elemente OPACE (re-folosește pipeline-ul existent) ──
  if (opaque.length > 0) {
    sectionsCount++;
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "1. Elemente opace", bold: true, size: 28 })],
    }));
    opaque.forEach((el, idx) => {
      const metrics = computeElementMetrics(el);
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({
            text: `1.${idx + 1} — ${el.name || elementTypeName(el.type) || `Element ${idx + 1}`}`,
            bold: true, size: 22,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: `Tip: ${elementTypeName(el.type)} (${el.type}) · Suprafață: ${fmtNum(el.area, 2)} m² · `
              + `U=${fmtNum(metrics.u, 3)} W/(m²·K) · R=${fmtNum(metrics.r_total, 3)} m²·K/W · `
              + `D=${fmtNum(metrics.D, 3)} · Foc: ${metrics.worstFireClass}`,
            size: 18,
          })],
        }),
        new Paragraph({ text: "" }),
      );
    });
  }

  // ── Secțiune 2: Elemente VITRATE ──
  if (glazing.length > 0) {
    sectionsCount++;
    if (children.length > 4) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "2. Elemente vitrate", bold: true, size: 28 })],
    }));
    const tblRows = [
      new TableRow({
        children: ["Nr.", "Denumire", "Tip", "Orientare", "Suprafață [m²]", "U [W/(m²·K)]", "g [-]"].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
          })
        ),
      }),
      ...glazing.map((g, i) => new TableRow({
        children: [
          String(i + 1),
          String(g.name || "—"),
          String(g.type || "—"),
          String(g.orientation || "—"),
          fmtNum(g.area, 2),
          fmtNum(g.u, 2),
          fmtNum(g.g_value || g.g, 2),
        ].map(c => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c, size: 18 })] })],
        })),
      })),
    ];
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tblRows,
      borders: {
        // Sprint V8: borders brand kit
        top:    { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        left:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        right:  { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
      },
    }));
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: "Referințe: SR EN 14351-1 (vitraj), SR EN 673 (U), SR EN 410 (g_value), Mc 001-2022 §3.3.2 + Tab 2.5.",
        size: 16, italics: true, color: DOCX_BRAND.SLATE_500, // Sprint V8: brand SLATE_500
      })],
    }));
  }

  // ── Secțiune 3: PUNȚI TERMICE ──
  if (bridges.length > 0) {
    sectionsCount++;
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "3. Punți termice liniare", bold: true, size: 28 })],
    }));
    const tblRows = [
      new TableRow({
        children: ["Nr.", "Denumire", "ψ [W/(m·K)]", "Lungime [m]", "Pierdere [W/K]"].map(h =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
          })
        ),
      }),
      ...bridges.map((b, i) => {
        const psi = parseFloat(b.psi) || 0;
        const len = parseFloat(b.length) || 0;
        return new TableRow({
          children: [
            String(i + 1), String(b.name || "Punte " + (i + 1)),
            fmtNum(psi, 3), fmtNum(len, 2), fmtNum(psi * len, 3),
          ].map(c => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: c, size: 18 })] })],
          })),
        });
      }),
    ];
    const totalLoss = bridges.reduce((s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0), 0);
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tblRows,
      borders: {
        // Sprint V8: borders brand kit
        top:    { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
        left:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        right:  { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
      },
    }));
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: `Pierdere totală liniară: ${fmtNum(totalLoss, 3)} W/K. `
          + `Referințe: SR EN ISO 14683:2017, SR EN ISO 10211:2017, Mc 001-2022 §3.3.4 + Catalog MCCL 165 tipologii.`,
        size: 16, italics: true, color: DOCX_BRAND.SLATE_500, // Sprint V8: brand SLATE_500
      })],
    }));
  }

  // ── Secțiune 4: SISTEME HVAC ──
  const hasSystems = !!(systems.heating || systems.cooling || systems.ventilation || systems.lighting || systems.acm);
  if (hasSystems) {
    sectionsCount++;
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "4. Sisteme tehnice (HVAC + ACM + Iluminat)", bold: true, size: 28 })],
    }));

    const subSection = (title, obj, fields) => {
      if (!obj || Object.keys(obj).length === 0) return;
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: title, bold: true, size: 22 })],
      }));
      const rows = fields.filter(([_, key]) => obj[key] !== undefined && obj[key] !== null && obj[key] !== "")
        .map(([label, key, unit]) => new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: `${obj[key]}${unit ? " " + unit : ""}`, size: 18 })] })],
            }),
          ],
        }));
      if (rows.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left:   { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right:  { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
            insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
          },
        }));
        children.push(new Paragraph({ text: "" }));
      }
    };

    subSection("4.1 Încălzire", systems.heating, [
      ["Sursă", "source"], ["Combustibil", "fuel"], ["Putere", "power", "kW"],
      ["η generare", "eta_gen"], ["η distribuție", "eta_distr"], ["η reglaj", "eta_reg"], ["η emisie", "eta_em"],
      ["Clasă BACS", "bacsClass"],
    ]);
    subSection("4.2 Răcire", systems.cooling, [
      ["Tip", "type"], ["Putere", "power", "kW"], ["EER", "eer"], ["SEER", "seer"],
      ["Activă", "hasCooling"],
    ]);
    subSection("4.3 Ventilare", systems.ventilation, [
      ["Tip", "type"], ["Recuperare căldură", "hasHR"], ["η HR", "hrEfficiency", "%"],
      ["Debit", "flow", "m³/h"],
    ]);
    subSection("4.4 Iluminat", systems.lighting, [
      ["Tip", "type"], ["Densitate putere", "pDensity", "W/m²"], ["Control", "control"],
    ]);
    subSection("4.5 ACM", systems.acm, [
      ["Sursă", "source"], ["Stocare", "storageType"], ["Consumatori", "consumers"],
      ["Anti-Legionella", "legionellaMethod"], ["Izolație conducte", "pipeInsulationType"],
    ]);

    children.push(new Paragraph({
      children: [new TextRun({
        text: "Referințe: SR EN 15316-1 (încălzire), SR EN 15243 (răcire), SR EN 16798-7 (ventilare), "
          + "SR EN 15193-1 (iluminat), SR EN 15316-3 (ACM), EN 15232-1 (BACS).",
        size: 16, italics: true, color: DOCX_BRAND.SLATE_500, // Sprint V8: brand SLATE_500
      })],
    }));
  }

  // Footer
  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `Document generat ${new Date().toLocaleString("ro-RO")} de Zephren Energy Calculator. `
          + `Anexe complete pentru Dosar Audit Energetic AAECR (Cap. 8).`,
        size: 14, color: DOCX_BRAND.SLATE_500, italics: true, // Sprint V8: brand SLATE_500 (era 999999)
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
  const filename = options.filename || `anexe_complete_${new Date().toISOString().slice(0, 10)}.docx`;
  if (typeof document === "undefined" || options.download === false) {
    return { blob, filename, sectionsCount };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { blob, filename, sectionsCount };
}

// Expus doar pentru testare (builder-ul pur de metrici fără DOCX)
export const __testing__ = {
  computeElementMetrics,
  buildSectionDescription,
  fmtNum,
  elementTypeName,
};
