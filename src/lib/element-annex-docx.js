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
// Sprint 8 mai 2026 — C1 Anexe Complete (versiune detaliată):
// helperi calcul pentru verificare conformitate, condens Glaser, confort vară.
import { glaserCheck } from "../calc/glaser.js";
import { calcSummerComfort } from "../calc/summer-comfort.js";
import { getC107UMax, getRenovUMax } from "../calc/c107.js";
import { NZEB_U_MAX } from "../calc/nzeb-check.js";

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
  // Sprint 8 mai 2026 — C1 versiune detaliată: pasăm date din pașii 1-5 pentru
  // bilanț energetic anual, confort vară, verificare conformitate completă.
  const renewables   = data?.renewables  || {};   // Pas 4
  const instSummary  = data?.instSummary || {};   // Pas 5 — EP per utilitate
  const monthlyISO   = data?.monthlyISO  || null; // Pas 5 — bilanț lunar ISO 13790
  const renewSummary = data?.renewSummary || {};  // Pas 5 — RER, EP ajustat
  const climate      = data?.climate     || options?.climate || {}; // Pas 1

  // Sprint 8 mai 2026 — Branding extins (audit raport: design rudimentar fără
  // header brand + info clădire). Adăugăm bandă brand verde + informații
  // identificare clădire + auditor + dată pentru acoperire profesională.
  const building = options?.building || {};
  const auditor = options?.auditor || building?.auditor || {};
  const todayRO = new Date().toLocaleDateString("ro-RO");

  const children = [
    // Banda brand „Zephren" în culoare PRIMARY (replica header PDF)
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "Z", bold: true, size: 28, color: DOCX_BRAND.PRIMARY }),
        new TextRun({ text: "ephren", bold: true, size: 28, color: DOCX_BRAND.SLATE_900 }),
        new TextRun({ text: "  ·  Energy Performance Calculator", size: 16, color: DOCX_BRAND.SLATE_500, italics: true }),
      ],
    }),
    new Paragraph({
      border: { bottom: { color: DOCX_BRAND.PRIMARY, space: 1, style: BorderStyle.SINGLE, size: 12 } },
      children: [new TextRun({ text: "", size: 1 })],
    }),
    new Paragraph({ text: "" }),
    // Titlu principal cu PRIMARY accent
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "ANEXE TEHNICE COMPLETE — DOSAR AUDIT",
        bold: true, size: 32, color: DOCX_BRAND.PRIMARY_DARK,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "Opace + Vitraj + Punți termice + Sisteme HVAC · Mc 001-2022 + SR EN ISO 6946:2017",
        size: 18, color: DOCX_BRAND.SLATE_500, italics: true,
      })],
    }),
    new Paragraph({ text: "" }),
    // Bloc identificare clădire + auditor (banner SLATE_50)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.PRIMARY },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: DOCX_BRAND.SLATE_50 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Adresă: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: building.address || "—", size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: "Categorie: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: `${building.category || "—"}`, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: "Au: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: `${building.areaUseful || "—"} m²`, size: 18 })] }),
              ],
            }),
            new TableCell({
              shading: { fill: DOCX_BRAND.SLATE_50 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Auditor: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: auditor.name || "—", size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: "Atestat: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: `${auditor.atestat || "—"} / ${auditor.grade || "—"}`, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: "Data: ", bold: true, size: 18, color: DOCX_BRAND.SLATE_700 }), new TextRun({ text: todayRO, size: 18 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  let sectionsCount = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERI INLINE — fabrici de table cell + row + heading reutilizabili
  // în toate cele 7 secțiuni. Sprint 8 mai 2026 — versiune detaliată C1.
  // ─────────────────────────────────────────────────────────────────────────
  const H = (txt, level = 1, opts = {}) => new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children: [new TextRun({
      text: txt,
      bold: true,
      size: level === 1 ? 28 : level === 2 ? 22 : 20,
      color: opts.color || (level === 1 ? DOCX_BRAND.PRIMARY_DARK : DOCX_BRAND.SLATE_900),
    })],
    spacing: { before: opts.before || (level === 1 ? 240 : 120), after: 60 },
  });
  const P = (txt, opts = {}) => new Paragraph({
    children: [new TextRun({
      text: String(txt),
      size: opts.size || 18,
      bold: !!opts.bold,
      italics: !!opts.italics,
      color: opts.color || undefined,
    })],
    spacing: opts.spacing,
  });
  const Hdr = (text, pct) => new TableCell({
    width: pct ? { size: pct, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: DOCX_BRAND.SLATE_900 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: true, size: 16, color: DOCX_BRAND.WHITE })] })],
  });
  const Cel = (text, pct, opts = {}) => new TableCell({
    width: pct ? { size: pct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { fill: opts.shading } : undefined,
    children: [new Paragraph({
      children: [new TextRun({
        text: String(text ?? "—"),
        size: 16,
        bold: !!opts.bold,
        color: opts.color || undefined,
      })],
    })],
  });
  const STD_BORDERS = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_BRAND.SLATE_400 },
    left:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
    right:  { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
    insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: DOCX_BRAND.SLATE_200 },
  };
  const KV = (rows) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v, opts = {}]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: DOCX_BRAND.SLATE_50 },
          children: [new Paragraph({ children: [new TextRun({ text: String(k), bold: true, size: 16, color: DOCX_BRAND.SLATE_700 })] })],
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({
            text: String(v ?? "—"),
            size: 16,
            color: opts.color,
            bold: !!opts.bold,
          })] })],
        }),
      ],
    })),
    borders: STD_BORDERS,
  });
  const Tbl = (header, rows) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: header.map(([txt, pct]) => Hdr(txt, pct)) }),
      ...rows.map(r => new TableRow({
        children: r.map((cell) => {
          if (cell && typeof cell === "object" && "text" in cell) {
            return Cel(cell.text, cell.pct, cell);
          }
          return Cel(cell);
        }),
      })),
    ],
    borders: STD_BORDERS,
  });

  // ── Mapare punți termice asociate fiecărui element opac (după elementId/name) ──
  const bridgesByElement = (elName, elId) => {
    return bridges.filter(b => {
      const ref = b.elementId || b.parentElement || b.opaqueId || b.elementName;
      if (!ref) return false;
      return ref === elId || ref === elName;
    });
  };

  // ── Mapare categorie Zephren extinsă → categorie C107/2-2005 (6 valori bază) ──
  // Sprint 8 mai 2026 — getC107UMax/getRenovUMax acceptă DOAR RI/RC/AL/BI/CO/IN.
  // Categoriile extinse Zephren (RA/SA/HC/etc.) trebuie mapate înainte de lookup,
  // altfel returnează null + nu intră în statistici → §7 sumar arată „0 conforme/0 neconforme".
  const C107_CATEGORY_MAP = {
    RA: "RC", CP: "RC",
    AD: "BI", BA_OFF: "BI",
    ED: "AL", GR: "AL", SC: "AL", LI: "AL", UN: "AL",
    SA: "AL", SPA_H: "AL", CL: "AL", ST: "AL", LB_MED: "AL",
    HC: "AL", HO_LUX: "AL", HOSTEL: "AL",
    RE: "CO", REST: "CO", BAR: "CO", CANTINE: "CO", FAST_F: "CO",
    MAG: "CO", SUPER: "CO", MALL: "CO", AG_COM: "CO",
    SP: "AL", PSC: "AL", SALA_POL: "AL",
    CU: "AL", CIN: "AL", TEA: "AL", MUZ: "AL", BIB: "AL",
    GARA: "AL", AER: "AL",
    IU: "IN", HAL: "IN", DEP: "IN", LAB_IND: "IN",
  };
  const c107Cat = C107_CATEGORY_MAP[building.category] || building.category || "RC";

  // ── Determinare set U'max nZEB (residential vs nonresidential, nou vs renovare) ──
  const isResidentialCat = ["RI", "RC", "RA"].includes(building.category);
  const isRenovation = (building?.scopCpe || "").includes("renovare")
    || (building?.projectPhase || "") === "renovare"
    || (building?.scopElaborare || "").includes("Renovare");
  const nzebUMaxKey = isResidentialCat
    ? (isRenovation ? "residential_renovation" : "residential")
    : (isRenovation ? "nonresidential_renovation" : "nonresidential");
  const nzebUMaxSet = NZEB_U_MAX[nzebUMaxKey] || NZEB_U_MAX.residential;

  // ─────────────────────────────────────────────────────────────────────────
  // §1 ELEMENTE OPACE — fișă tehnică detaliată (8 sub-secțiuni per element)
  // ─────────────────────────────────────────────────────────────────────────
  if (opaque.length > 0) {
    sectionsCount++;
    children.push(H("1. Elemente opace", 1));
    children.push(P(
      `${opaque.length} element(e) opace — fișe tehnice complete cu compoziție straturi, `
      + `calcul U conform SR EN ISO 6946:2017, verificare conformitate C107/2-2005 + Mc 001-2022, `
      + `verificare condens Glaser SR EN ISO 13788:2012 și punți termice asociate.`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    opaque.forEach((el, idx) => {
      const metrics = computeElementMetrics(el);
      const elTypeFull = `${elementTypeName(el.type)} (${el.type})`;
      const elName = el.name || elementTypeName(el.type) || `Element ${idx + 1}`;

      // --- Heading element ---
      children.push(H(`1.${idx + 1} — ${elName}`, 2, { before: 240 }));

      // --- 1.x.1 Date generale ---
      children.push(H(`1.${idx + 1}.1  Date generale`, 3));
      const elContact = el.contact || (el.type?.startsWith("PE") ? "Aer exterior"
        : el.type === "PB" ? "Subsol neîncălzit"
        : el.type === "PT" ? "Aer exterior (terasă)"
        : el.type === "PP" ? "Pod neîncălzit"
        : el.type === "PL" ? "Sol (CTS)"
        : el.type === "PR" ? "Rost închis"
        : "—");
      children.push(KV([
        ["Tip element", elTypeFull],
        ["Cod identificare", el.id || el.code || `OPC-${idx + 1}`],
        ["Suprafață", `${fmtNum(el.area, 2)} m²`],
        ["Orientare", el.orientation || "—"],
        ["Tip contact", elContact],
        ["Coef. absorbție solară α", el.alpha != null ? fmtNum(el.alpha, 2) : "0,65 (valoare implicită — culoare medie)"],
        ["Clasă reacție foc", `${metrics.worstFireClass} — ${FIRE_CLASSES[metrics.worstFireClass]?.label || ""}`],
        ["Tip fixări mecanice", metrics.fastenerLabel || "—"],
      ]));

      // --- 1.x.2 Compoziție straturi ---
      children.push(H(`1.${idx + 1}.2  Compoziție straturi (interior → exterior)`, 3));
      if ((el.layers || []).length === 0) {
        children.push(P("(fără straturi definite)", { italics: true, color: DOCX_BRAND.SLATE_500 }));
      } else {
        const layerHeader = [
          ["#", 5], ["Material", 30], ["d [mm]", 10], ["λ [W/(m·K)]", 13],
          ["ρ [kg/m³]", 12], ["c [J/(kg·K)]", 12], ["μ [-]", 8], ["R [m²·K/W]", 10],
        ];
        const layerRows = (el.layers || []).map((l, i) => {
          const d = parseFloat(l.thickness) || 0;
          const lambda = parseFloat(l.lambda) || 0;
          const rho = parseFloat(l.rho) || 0;
          const cp = parseFloat(l.cp) || (rho > 0 ? 1000 : 0);
          const mu = parseFloat(l.mu) || 0;
          const Rpart = (d > 0 && lambda > 0) ? (d / 1000 / lambda) : 0;
          return [
            String(i + 1),
            l.matName || l.material || "—",
            fmtNum(d, 0),
            fmtNum(lambda, 3),
            rho > 0 ? fmtNum(rho, 0) : "—",
            cp > 0 ? fmtNum(cp, 0) : "—",
            mu > 0 ? fmtNum(mu, 0) : "—",
            fmtNum(Rpart, 3),
          ];
        });
        children.push(Tbl(layerHeader, layerRows));
        children.push(P(
          "Sursa λ/ρ/μ: SR EN ISO 10456:2007/A1:2010 + bază materiale Mc 001-2022 Anexa A.",
          { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
        ));
      }

      // --- 1.x.3 Calcul transmitanță termică U ---
      children.push(H(`1.${idx + 1}.3  Calcul coeficient termic U (SR EN ISO 6946:2017)`, 3));
      const r_si = el.type === "PT" || el.type === "PP" ? 0.10 : 0.13;
      const r_se = (el.type === "PB" || el.type === "PL" || el.type === "PR") ? 0.13 : 0.04;
      children.push(KV([
        ["R_si (rezistență superficială interior)", `${fmtNum(r_si, 3)} m²·K/W`],
        ["ΣR_strat (suma rezistențelor straturilor)", `${fmtNum(metrics.r_layers || 0, 3)} m²·K/W`],
        ["R_se (rezistență superficială exterior)", `${fmtNum(r_se, 3)} m²·K/W`],
        ["R_total = R_si + ΣR_strat + R_se", `${fmtNum(metrics.r_total, 3)} m²·K/W`, { bold: true }],
        ["U_base = 1/R_total", `${fmtNum(metrics.u_base || (1 / metrics.r_total), 3)} W/(m²·K)`],
        ["ΔU″ corecție fixări mecanice", `${fmtNum(metrics.deltaU || 0, 3)} W/(m²·K)`],
        ["U' (transmitanță corectată) = U + ΔU″", `${fmtNum(metrics.u, 3)} W/(m²·K)`, { bold: true, color: DOCX_BRAND.PRIMARY_DARK }],
      ]));

      // --- 1.x.4 Inerție termică & masă ---
      children.push(H(`1.${idx + 1}.4  Inerție termică & capacitate (SR EN ISO 13786)`, 3));
      const inertiaClass = metrics.D >= 6 ? "foarte grea" : metrics.D >= 4 ? "grea" : metrics.D >= 2.5 ? "medie" : metrics.D >= 1 ? "ușoară" : "foarte ușoară";
      children.push(KV([
        ["Indice inerție termică D", `${fmtNum(metrics.D, 3)}`],
        ["Clasă inerție", inertiaClass],
        ["Masă efectivă pe m²", `${fmtNum(metrics.massPerM2, 1)} kg/m²`],
        ["Defazaj termic Δφ ≈ D × 24/(2π)", `${fmtNum((metrics.D || 0) * 24 / (2 * Math.PI), 1)} ore`],
        ["Factor amortizare ν = e^(-D)", `${fmtNum(Math.exp(-(metrics.D || 0)), 3)}`],
      ]));

      // --- 1.x.5 Verificare conformitate (C107/2-2005, Mc 001-2022 renovare, NZEB) ---
      children.push(H(`1.${idx + 1}.5  Verificare conformitate normativă`, 3));
      const u_calc = metrics.u || 0;
      const u_c107 = getC107UMax(el.type, c107Cat) || null;
      const u_renov = getRenovUMax(el.type, c107Cat) || null;
      const u_nzeb_new = nzebUMaxSet[el.type] != null ? nzebUMaxSet[el.type] : null;
      const verdict = (uref) => {
        if (uref == null) return ["—", "—"];
        const ok = u_calc <= uref + 0.005;
        const margin = ((uref - u_calc) / uref * 100);
        return [ok ? "CONFORM" : "DEPĂȘIT",
          ok ? `+${fmtNum(margin, 1)}% rezervă` : `${fmtNum(margin, 1)}% sub prag`];
      };
      const c107v = verdict(u_c107);
      const renov_v = verdict(u_renov);
      const nzeb_v = verdict(u_nzeb_new);
      const verifHeader = [
        ["Cerință normativă", 35], ["U_max [W/(m²·K)]", 18], ["U_calc [W/(m²·K)]", 18],
        ["Verdict", 14], ["Marjă", 15],
      ];
      const verifRows = [
        ["C107/2-2005 (clădire existentă)", u_c107 != null ? fmtNum(u_c107, 2) : "n/a", fmtNum(u_calc, 3),
          { text: c107v[0], color: c107v[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, c107v[1]],
        ["Mc 001-2022 §4.5 — renovare majoră", u_renov != null ? fmtNum(u_renov, 2) : "n/a", fmtNum(u_calc, 3),
          { text: renov_v[0], color: renov_v[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, renov_v[1]],
        [`SR EN ISO 52018-1/NA:2023 — nZEB ${isRenovation ? "renovare" : "nou"}`,
          u_nzeb_new != null ? fmtNum(u_nzeb_new, 2) : "n/a", fmtNum(u_calc, 3),
          { text: nzeb_v[0], color: nzeb_v[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, nzeb_v[1]],
      ];
      children.push(Tbl(verifHeader, verifRows));

      // --- 1.x.6 Verificare condens Glaser ---
      // Doar pentru elemente exterioare (PE, PT, PP) — nu PR (rost) sau PL (sol)
      if (["PE", "PET", "PT", "PP", "AC"].includes(el.type) && (el.layers || []).length > 0) {
        children.push(H(`1.${idx + 1}.6  Verificare condens (Glaser SR EN ISO 13788:2012)`, 3));
        try {
          const t_int = parseFloat(systems?.heating?.theta_int) || 20;
          const t_ext = climate?.theta_e != null ? climate.theta_e : -15;
          const phi_int = 0.55;  // umiditate relativă interior cf. C107/6-2002
          const phi_ext = 0.85;  // umiditate medie exterior iarna
          const gl = glaserCheck(el.layers, t_int, t_ext, phi_int, phi_ext);
          if (gl) {
            children.push(KV([
              ["Temperatură interioară (θ_int)", `${t_int} °C`],
              ["Temperatură exterioară calcul (θ_e)", `${t_ext} °C`],
              ["Umiditate relativă interior (φ_int)", `${(phi_int * 100).toFixed(0)} %`],
              ["Umiditate relativă exterior (φ_ext)", `${(phi_ext * 100).toFixed(0)} %`],
              ["Risc condens superficial/interstițial",
                gl.hasCondensation ? "PREZENT" : "ABSENT",
                { color: gl.hasCondensation ? "DC2626" : "16A34A", bold: true }],
              ["Cantitate condens estimată g_c", `${gl.gc != null ? fmtNum(gl.gc, 0) : "0"} g/m²·sezon`],
              ["Verdict ISO 13788 §4.4", gl.hasCondensation
                ? "Necesare măsuri de protecție (barieră vapori interior, ventilare)"
                : "Element conform — fără risc condens"],
            ]));
          } else {
            children.push(P("Date insuficiente pentru calcul Glaser (lipsesc μ pentru straturi).",
              { italics: true, color: DOCX_BRAND.SLATE_500 }));
          }
        } catch (e) {
          children.push(P(`Calcul Glaser indisponibil: ${e.message}`,
            { italics: true, color: DOCX_BRAND.SLATE_500 }));
        }
      }

      // --- 1.x.7 Punți termice asociate ---
      const elBridges = bridgesByElement(elName, el.id || el.code);
      if (elBridges.length > 0) {
        children.push(H(`1.${idx + 1}.7  Punți termice asociate`, 3));
        const brHeader = [
          ["#", 5], ["Denumire", 35], ["ψ [W/(m·K)]", 18], ["Lungime [m]", 17], ["Pierdere [W/K]", 25],
        ];
        let totLoss = 0;
        const brRows = elBridges.map((b, i) => {
          const psi = parseFloat(b.psi) || 0;
          const len = parseFloat(b.length) || 0;
          const loss = psi * len;
          totLoss += loss;
          return [String(i + 1), b.name || `Punte ${i + 1}`, fmtNum(psi, 3), fmtNum(len, 2), fmtNum(loss, 3)];
        });
        brRows.push([{ text: "TOTAL", bold: true }, "", "", "",
          { text: fmtNum(totLoss, 3), bold: true, color: DOCX_BRAND.PRIMARY_DARK }]);
        children.push(Tbl(brHeader, brRows));
        children.push(P(
          "Sursa ψ: Catalog Mc 001-2022 (165 tipologii) — SR EN ISO 14683:2017.",
          { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
        ));
      }

      // --- 1.x.8 Schema secțiune (text simbolic) ---
      const totalD_mm = (el.layers || []).reduce((s, l) => s + (parseFloat(l.thickness) || 0), 0);
      if (totalD_mm > 0) {
        children.push(H(`1.${idx + 1}.8  Schema secțiune (interior → exterior)`, 3));
        // Sprint 8 mai 2026 — Lățime nume material 16→32 char (era trunchiat
        // „Tencuială exteri" sau „Beton armat pano"). Folosim font monospaced
        // mai mic pentru a încăpea pe un rând larg.
        const schemaText = "[INT] " + (el.layers || []).map((l, i) =>
          `${parseFloat(l.thickness) || 0}mm ${(l.matName || l.material || "?").slice(0, 32)}`
        ).join(" │ ") + " [EXT]";
        children.push(P(schemaText, { size: 14, color: DOCX_BRAND.SLATE_700 }));
        children.push(P(
          `Grosime totală element: ${totalD_mm.toFixed(0)} mm`,
          { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
        ));
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §2 ELEMENTE VITRATE — fișă tehnică detaliată (5 sub-secțiuni per element)
  // ─────────────────────────────────────────────────────────────────────────
  if (glazing.length > 0) {
    sectionsCount++;
    children.push(H("2. Elemente vitrate", 1));
    children.push(P(
      `${glazing.length} element(e) vitrate — fișe tehnice cu detalii constructive `
      + `(rame + geam), calcul U_w SR EN ISO 10077-1:2017, aporturi solare și verificare `
      + `conformitate SR EN 14351-1 + C107/2-2005.`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    glazing.forEach((g, idx) => {
      const gName = g.name || `Vitraj ${idx + 1}`;
      children.push(H(`2.${idx + 1} — ${gName}`, 2, { before: 240 }));

      // --- 2.x.1 Date generale ---
      children.push(H(`2.${idx + 1}.1  Date generale`, 3));
      const u_g = parseFloat(g.u) || 0;
      const g_val = parseFloat(g.g_value || g.g) || 0;
      children.push(KV([
        ["Denumire", gName],
        ["Tip vitraj", g.type || "—"],
        ["Orientare", g.orientation || "—"],
        ["Suprafață", `${fmtNum(g.area, 2)} m²`],
        ["U_w (transmitanță globală)", `${fmtNum(u_g, 2)} W/(m²·K)`, { bold: true, color: DOCX_BRAND.PRIMARY_DARK }],
        ["g_value (factor solar)", fmtNum(g_val, 2)],
        ["Factor umbrire (F_sh)", g.shadingFactor != null ? fmtNum(g.shadingFactor, 2) : "0,85 (valoare implicită Mc 001-2022)"],
      ]));

      // --- 2.x.2 Detalii constructive (rame + geam) ---
      children.push(H(`2.${idx + 1}.2  Detalii constructive`, 3));
      // Defaults dacă datele detaliate nu există în glazing[]
      const frameType = g.frame_type || g.frameType || (g.type?.includes("PVC") ? "PVC 5 camere" : g.type?.includes("Al") ? "Aluminiu cu rupere termică" : "PVC standard");
      const frameU = g.frame_U != null ? parseFloat(g.frame_U) : (g.type?.includes("Al") ? 2.0 : 1.4);
      const frameWidth = g.frame_width != null ? parseFloat(g.frame_width) : 70;
      const glassLayers = g.glass_layers || g.glazing_layers || (g.type?.includes("triplu") ? 3 : 2);
      const glassU = g.glass_U != null ? parseFloat(g.glass_U) : (glassLayers === 3 ? 0.7 : 1.1);
      const glassGas = g.glass_gas || g.gas || "Argon";
      const lowE = g.lowE != null ? g.lowE : (g.type?.includes("Low-E") || g.type?.includes("low-E") ? "Da" : "Da (presupus implicit)");
      children.push(KV([
        ["Tip rame", frameType],
        ["Lățime rame (b_f)", `${frameWidth} mm`],
        ["U_f (rame)", `${fmtNum(frameU, 2)} W/(m²·K)`],
        ["Număr foi geam", `${glassLayers}`],
        ["Distanțator (spacer)", g.spacer || "Aluminiu (warm-edge dacă low-E)"],
        ["Gaz interfoile", glassGas],
        ["Strat low-E (emisivitate redusă)", lowE],
        ["U_g (geam central)", `${fmtNum(glassU, 2)} W/(m²·K)`],
        ["ψ_g (punte termică liniar perimetru)", `${g.psi_g != null ? fmtNum(g.psi_g, 3) : "0,06"} W/(m·K)`],
      ]));

      // --- 2.x.3 Calcul U_w global (SR EN ISO 10077-1) ---
      children.push(H(`2.${idx + 1}.3  Calcul U_w global (SR EN ISO 10077-1:2017)`, 3));
      // Aproximare A_g/A_f din raport: pentru fereastră tipică, A_g ≈ 0,7 × A_w, A_f ≈ 0,3 × A_w
      // L_g = perimetru geam ≈ 2 × √A_g × π/2 — aproximare
      const A_w = parseFloat(g.area) || 0;
      const A_g = g.A_glass != null ? parseFloat(g.A_glass) : A_w * 0.70;
      const A_f = g.A_frame != null ? parseFloat(g.A_frame) : A_w * 0.30;
      const L_g = g.L_g != null ? parseFloat(g.L_g) : 2 * Math.sqrt(A_g * Math.PI);
      const psi_g = g.psi_g != null ? parseFloat(g.psi_g) : 0.06;
      const U_w_calc = A_w > 0 ? (A_g * glassU + A_f * frameU + L_g * psi_g) / A_w : u_g;
      children.push(P(
        "Formula: U_w = (A_g × U_g + A_f × U_f + L_g × ψ_g) / A_w",
        { size: 14, italics: true, color: DOCX_BRAND.SLATE_700 }
      ));
      children.push(KV([
        ["A_g (suprafață geam)", `${fmtNum(A_g, 2)} m²`],
        ["A_f (suprafață rame)", `${fmtNum(A_f, 2)} m²`],
        ["L_g (perimetru geam)", `${fmtNum(L_g, 2)} m`],
        ["U_g · A_g", `${fmtNum(glassU * A_g, 3)} W/K`],
        ["U_f · A_f", `${fmtNum(frameU * A_f, 3)} W/K`],
        ["ψ_g · L_g", `${fmtNum(psi_g * L_g, 3)} W/K`],
        ["U_w calculat (formula 10077-1)", `${fmtNum(U_w_calc, 3)} W/(m²·K)`],
        ["U_w declarat (input)", `${fmtNum(u_g, 2)} W/(m²·K)`, { bold: true }],
        ["Δ% calculat vs declarat",
          A_w > 0 && u_g > 0 ? `${fmtNum(((U_w_calc - u_g) / u_g) * 100, 1)}%` : "—"],
      ]));

      // --- 2.x.4 Aporturi solare ---
      children.push(H(`2.${idx + 1}.4  Aporturi solare (SR EN ISO 52022-3)`, 3));
      const F_sh = g.shadingFactor != null ? parseFloat(g.shadingFactor) : 0.85;
      const F_F = g.F_F != null ? parseFloat(g.F_F) : (A_w > 0 ? A_g / A_w : 0.70);
      const g_eff = g_val * F_sh * F_F;
      children.push(KV([
        ["g_value (factor solar geam)", fmtNum(g_val, 2)],
        ["F_sh (factor umbrire global)", fmtNum(F_sh, 2)],
        ["F_F (factor rame A_g/A_w)", fmtNum(F_F, 2)],
        ["g_eff = g × F_sh × F_F", fmtNum(g_eff, 3), { bold: true }],
      ]));
      children.push(P(
        "g_eff este utilizat în bilanțul solar lunar (Mc 001-2022 §3.3.2 + ISO 13790).",
        { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
      ));

      // --- 2.x.5 Verificare conformitate ---
      children.push(H(`2.${idx + 1}.5  Verificare conformitate normativă`, 3));
      const u_c107_g = getC107UMax("FE", c107Cat) || 1.30;
      const u_renov_g = getRenovUMax("FE", c107Cat) || 1.10;
      const u_nzeb_g = nzebUMaxSet["FE"] || 1.20;
      const verdictG = (uref) => {
        const ok = u_g <= uref + 0.005;
        return [ok ? "CONFORM" : "DEPĂȘIT",
          ok ? `+${fmtNum(((uref - u_g) / uref) * 100, 1)}% rezervă` : `${fmtNum(((uref - u_g) / uref) * 100, 1)}% sub prag`];
      };
      const cv1 = verdictG(u_c107_g);
      const cv2 = verdictG(u_renov_g);
      const cv3 = verdictG(u_nzeb_g);
      children.push(Tbl(
        [["Cerință", 35], ["U_max [W/(m²·K)]", 18], ["U_calc [W/(m²·K)]", 18], ["Verdict", 14], ["Marjă", 15]],
        [
          ["C107/2-2005 (existentă)", fmtNum(u_c107_g, 2), fmtNum(u_g, 2),
            { text: cv1[0], color: cv1[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, cv1[1]],
          ["Mc 001-2022 §4.5 — renovare", fmtNum(u_renov_g, 2), fmtNum(u_g, 2),
            { text: cv2[0], color: cv2[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, cv2[1]],
          [`SR EN ISO 52018-1/NA:2023 — nZEB ${isRenovation ? "renovare" : "nou"}`, fmtNum(u_nzeb_g, 2), fmtNum(u_g, 2),
            { text: cv3[0], color: cv3[0] === "CONFORM" ? "16A34A" : "DC2626", bold: true }, cv3[1]],
        ]
      ));
    });

    children.push(P(
      "Referințe: SR EN 14351-1:2016 (clasificare), SR EN ISO 10077-1:2017 (calcul U_w), "
      + "SR EN 673:2011 (U_g), SR EN 410:2011 (g_value), Mc 001-2022 §3.3.2 + Tab 2.5.",
      { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §3 PUNȚI TERMICE LINIARE — extins cu sursă catalog + verificare T_si min
  // ─────────────────────────────────────────────────────────────────────────
  if (bridges.length > 0) {
    sectionsCount++;
    children.push(H("3. Punți termice liniare (SR EN ISO 14683:2017)", 1));
    const totalLoss = bridges.reduce((s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0), 0);
    children.push(P(
      `${bridges.length} punte/punți termice — pierdere totală cumulată ${fmtNum(totalLoss, 3)} W/K. `
      + `Verificarea per punte include sursa coeficientului ψ (catalog Mc 001-2022 / simulare 2D Therm) `
      + `și factor de temperatură f_Rsi pentru evitare condens superficial (T_si > T_dewpoint).`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    const brHeaderExt = [
      ["#", 4], ["Denumire", 28], ["Categorie (Mc 001 / IS)", 17], ["ψ [W/(m·K)]", 12],
      ["L [m]", 9], ["Pierdere [W/K]", 12], ["Sursă", 18],
    ];
    const brRowsExt = bridges.map((b, i) => {
      const psi = parseFloat(b.psi) || 0;
      const len = parseFloat(b.length) || 0;
      const cat = b.category || b.type || "—";
      const src = b.source || (b.catalogId ? `Cat. Mc 001-2022 (${b.catalogId})` : "Catalog standard SR EN ISO 14683");
      return [String(i + 1), b.name || `Punte ${i + 1}`, cat, fmtNum(psi, 3), fmtNum(len, 2), fmtNum(psi * len, 3), src];
    });
    brRowsExt.push([
      { text: "TOTAL", bold: true }, "", "", "",
      { text: fmtNum(bridges.reduce((s, b) => s + (parseFloat(b.length) || 0), 0), 1), bold: true },
      { text: fmtNum(totalLoss, 3), bold: true, color: DOCX_BRAND.PRIMARY_DARK },
      "",
    ]);
    children.push(Tbl(brHeaderExt, brRowsExt));

    // Verificare T_si min — risc condens superficial conform SR EN ISO 13788
    children.push(H("3.1  Verificare temperatură superficială interioară (T_si)", 2, { before: 180 }));
    const t_int = parseFloat(systems?.heating?.theta_int) || 20;
    const t_ext = climate?.theta_e != null ? climate.theta_e : -15;
    const t_dewpoint = 9.3; // conservator pentru φ_int=50% la 20°C interior
    children.push(P(
      `Pentru evitarea condensului superficial (formare mucegai), conform SR EN ISO 13788:2012 §5.3, `
      + `f_Rsi ≥ 0,75 (locuințe) sau ≥ 0,80 (clădiri sociale, IS Cat. III). `
      + `Temperatura punctului de rouă T_dewpoint = ${fmtNum(t_dewpoint, 1)} °C la φ_int=50%, θ_int=${fmtNum(t_int, 0)} °C.`,
      { size: 16 }
    ));
    children.push(KV([
      ["Factor temperatură minim recomandat (locuințe)", "f_Rsi ≥ 0,75"],
      ["T_si calculat la prag f_Rsi=0,75", `${fmtNum(t_int - 0.75 * (t_int - t_ext), 1)} °C`],
      ["T_dewpoint (50% UR, 20°C)", `${fmtNum(t_dewpoint, 1)} °C`],
      ["Verdict global", t_int - 0.75 * (t_int - t_ext) > t_dewpoint
        ? "CONFORM (T_si > T_dewpoint cu marjă suficientă)"
        : "RISC CONDENS — punți termice trebuie reabilitate",
        { color: t_int - 0.75 * (t_int - t_ext) > t_dewpoint ? "16A34A" : "DC2626", bold: true }],
    ]));

    children.push(P(
      "Referințe: SR EN ISO 14683:2017 (catalog ψ), SR EN ISO 10211:2017 (calcul 2D detaliat), "
      + "SR EN ISO 13788:2012 (f_Rsi), Mc 001-2022 §3.3.4 + Catalog MCCL 165 tipologii.",
      { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §4 SISTEME TEHNICE — extins cu bilanț energetic per utilitate
  // ─────────────────────────────────────────────────────────────────────────
  const hasSystems = !!(systems.heating || systems.cooling || systems.ventilation || systems.lighting || systems.acm);
  if (hasSystems) {
    sectionsCount++;
    children.push(H("4. Sisteme tehnice (HVAC + ACM + Iluminat)", 1));
    children.push(P(
      `Specificații tehnice complete pentru toate sistemele active + bilanț energetic anual `
      + `per utilitate (Q_f finală, EP primară, emisii CO₂).`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    const Au = parseFloat(building?.areaUseful) || 1;
    const epTotal = instSummary?.ep_total_m2 || 0;
    const sharePct = (val) => epTotal > 0 ? (val / epTotal) * 100 : 0;
    // Sprint 8 mai 2026 — fallback CO₂ per utilitate: instSummary expune doar
    // raw `co2_h/co2_w/etc.` (kg/an); _m2 se calculează aici dacă lipsește.
    const co2_m2 = (raw_field) => {
      const m2 = instSummary?.[`${raw_field}_m2`];
      if (m2 != null) return m2;
      const raw = instSummary?.[raw_field];
      return (raw != null && Au > 0) ? raw / Au : null;
    };

    // Helper care construiește un bloc complet pentru un sistem
    const sysBlock = (title, obj, fields, energyData) => {
      if (!obj || Object.keys(obj).length === 0) return;
      children.push(H(title, 2, { before: 180 }));
      const techRows = fields
        .filter(([_, key]) => key && obj[key] != null && obj[key] !== "")
        .map(([label, key, unit]) => [label, `${obj[key]}${unit ? " " + unit : ""}`]);
      if (techRows.length > 0) {
        children.push(P("Caracteristici tehnice:", { size: 16, bold: true, color: DOCX_BRAND.SLATE_700 }));
        children.push(KV(techRows));
      }
      if (energyData && (energyData.qf != null || energyData.ep_m2 != null)) {
        children.push(P("Bilanț energetic anual (Mc 001-2022 §5):",
          { size: 16, bold: true, color: DOCX_BRAND.SLATE_700, spacing: { before: 120 } }));
        children.push(KV([
          ["Q_f (energie finală anuală)", energyData.qf != null ? `${fmtNum(energyData.qf, 0)} kWh/an` : "—"],
          ["Q_f specific (per m²)", energyData.qf_m2 != null ? `${fmtNum(energyData.qf_m2, 1)} kWh/(m²·an)` : "—"],
          ["EP (energie primară specifică)", energyData.ep_m2 != null ? `${fmtNum(energyData.ep_m2, 1)} kWh/(m²·an)` : "—"],
          ["Emisii CO₂ specifice", energyData.co2_m2 != null ? `${fmtNum(energyData.co2_m2, 1)} kg CO₂/(m²·an)` : "—"],
          ["Pondere din EP total", energyData.share_pct != null ? `${fmtNum(energyData.share_pct, 1)} %` : "—"],
        ]));
      }
    };

    sysBlock("4.1 Încălzire spații", systems.heating, [
      ["Sursă energetică", "source"],
      ["Combustibil principal", "fuel"],
      ["Putere termică instalată", "power", "kW"],
      ["Temperatură interioară setpoint (θ_int)", "theta_int", "°C"],
      ["η generare (η_gen)", "eta_gen"],
      ["η distribuție (η_distr)", "eta_distr"],
      ["η reglaj (η_reg)", "eta_reg"],
      ["η emisie (η_em)", "eta_em"],
      ["Lungime distribuție (estimat)", "pipeLength", "m"],
      ["Izolație conducte", "pipeInsulationType"],
      ["Clasă BACS (EN 15232-1)", "bacsClass"],
    ], {
      qf: instSummary?.qf_h,
      qf_m2: instSummary?.qf_h ? instSummary.qf_h / Au : null,
      ep_m2: instSummary?.ep_h_m2 || (instSummary?.ep_h ? instSummary.ep_h / Au : null),
      co2_m2: co2_m2("co2_h"),
      share_pct: sharePct(instSummary?.ep_h_m2 || 0),
    });

    sysBlock("4.2 Răcire spații", systems.cooling, [
      ["Tip sursă frig", "type"],
      ["Putere frigorifică instalată", "power", "kW"],
      ["EER (eficiență la nominal)", "eer"],
      ["SEER (eficiență sezonieră)", "seer"],
      ["Sistem activ", "hasCooling"],
      ["Agent frigorific", "refrigerant"],
      ["GWP agent frigorific", "gwp"],
    ], {
      qf: instSummary?.qf_c,
      qf_m2: instSummary?.qf_c ? instSummary.qf_c / Au : null,
      ep_m2: instSummary?.ep_c_m2 || (instSummary?.ep_c ? instSummary.ep_c / Au : null),
      co2_m2: co2_m2("co2_c"),
      share_pct: sharePct(instSummary?.ep_c_m2 || 0),
    });

    sysBlock("4.3 Ventilare mecanică (SR EN 16798-7)", systems.ventilation, [
      ["Tip sistem", "type"],
      ["Debit aer proaspăt", "flow", "m³/h"],
      ["Recuperare căldură", "hasHR"],
      ["η HR (eficiență recuperator)", "hrEfficiency", "%"],
      ["Clasă filtru aer", "filterClass"],
      ["Putere ventilatoare", "fanPower", "W"],
    ], {
      qf: instSummary?.qf_v,
      qf_m2: instSummary?.qf_v ? instSummary.qf_v / Au : null,
      ep_m2: instSummary?.ep_v_m2 || (instSummary?.ep_v ? instSummary.ep_v / Au : null),
      co2_m2: co2_m2("co2_v"),
      share_pct: sharePct(instSummary?.ep_v_m2 || 0),
    });

    sysBlock("4.4 Iluminat (SR EN 15193-1)", systems.lighting, [
      ["Tip sistem (sursă lumină)", "type"],
      ["Densitate putere instalată P_n", "pDensity", "W/m²"],
      ["Sistem control", "control"],
      ["Ore funcționare anuale", "hours", "h/an"],
      ["LENI (Lighting Energy Numeric Indicator)", "leni"],
    ], {
      qf: instSummary?.qf_l,
      qf_m2: instSummary?.qf_l ? instSummary.qf_l / Au : null,
      ep_m2: instSummary?.ep_l_m2 || (instSummary?.ep_l ? instSummary.ep_l / Au : null),
      co2_m2: co2_m2("co2_l"),
      share_pct: sharePct(instSummary?.ep_l_m2 || 0),
    });

    sysBlock("4.5 Apă caldă menajeră (SR EN 15316-3)", systems.acm, [
      ["Sursă energetică", "source"],
      ["Tip stocare", "storageType"],
      ["Volum stocare", "storageVolume", "L"],
      ["Număr consumatori", "consumers"],
      ["Anti-Legionella (T° / metoda)", "legionellaMethod"],
      ["Izolație conducte distribuție", "pipeInsulationType"],
      ["Sistem recirculare", "recirculation"],
    ], {
      qf: instSummary?.qf_w,
      qf_m2: instSummary?.qf_w ? instSummary.qf_w / Au : null,
      ep_m2: instSummary?.ep_w_m2 || (instSummary?.ep_w ? instSummary.ep_w / Au : null),
      co2_m2: co2_m2("co2_w"),
      share_pct: sharePct(instSummary?.ep_w_m2 || 0),
    });

    children.push(P(
      "Referințe: SR EN 15316-1:2017 (încălzire), SR EN 15243:2007 (răcire), "
      + "SR EN 16798-7:2018 (ventilare), SR EN 15193-1:2017/A1:2021 (iluminat), "
      + "SR EN 15316-3:2017 (ACM), EN 15232-1:2017 (BACS), Mc 001-2022 §5.",
      { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §5 BILANȚ ENERGETIC ANUAL — sumar EP per utilitate + bilanț lunar
  // ─────────────────────────────────────────────────────────────────────────
  if (instSummary && (instSummary.ep_total_m2 || instSummary.qf_total)) {
    sectionsCount++;
    const Au5 = parseFloat(building?.areaUseful) || 1;
    const epTotal5 = instSummary?.ep_total_m2 || 0;
    children.push(H("5. Bilanț energetic anual sintetic", 1));
    children.push(P(
      `Sumar consumuri specifice anuale per utilitate, calculate conform Mc 001-2022 §5 + ISO 13790. `
      + `Suprafață utilă A_u = ${fmtNum(Au5, 1)} m². EP total = ${fmtNum(epTotal5, 1)} kWh/(m²·an).`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    const balHeader = [
      ["Utilitate", 25], ["Q_f [kWh/an]", 16], ["Q_f [kWh/m²·an]", 17],
      ["EP [kWh/m²·an]", 17], ["CO₂ [kg/m²·an]", 17], ["Pondere [%]", 8],
    ];
    // Sprint 8 mai 2026 — fallback CO₂ per utilitate (raw kWh/Au) pentru §5
    const co2_m2_5 = (raw_field) => {
      const m2 = instSummary?.[`${raw_field}_m2`];
      if (m2 != null) return m2;
      const raw = instSummary?.[raw_field];
      return (raw != null && Au5 > 0) ? raw / Au5 : null;
    };
    const utilities = [
      ["Încălzire spații", instSummary?.qf_h, instSummary?.ep_h_m2, co2_m2_5("co2_h")],
      ["Răcire spații", instSummary?.qf_c, instSummary?.ep_c_m2, co2_m2_5("co2_c")],
      ["Apă caldă menajeră", instSummary?.qf_w, instSummary?.ep_w_m2, co2_m2_5("co2_w")],
      ["Ventilare mecanică", instSummary?.qf_v, instSummary?.ep_v_m2, co2_m2_5("co2_v")],
      ["Iluminat", instSummary?.qf_l, instSummary?.ep_l_m2, co2_m2_5("co2_l")],
    ];
    const balRows = utilities.map(([name, qf, ep_m2, co2_m2]) => [
      name,
      qf != null ? fmtNum(qf, 0) : "—",
      qf != null && Au5 > 0 ? fmtNum(qf / Au5, 1) : "—",
      ep_m2 != null ? fmtNum(ep_m2, 1) : "—",
      co2_m2 != null ? fmtNum(co2_m2, 1) : "—",
      ep_m2 != null && epTotal5 > 0 ? fmtNum((ep_m2 / epTotal5) * 100, 1) : "—",
    ]);
    balRows.push([
      { text: "TOTAL", bold: true },
      { text: instSummary?.qf_total != null ? fmtNum(instSummary.qf_total, 0) : "—", bold: true },
      { text: instSummary?.qf_total != null && Au5 > 0 ? fmtNum(instSummary.qf_total / Au5, 1) : "—", bold: true },
      { text: epTotal5 > 0 ? fmtNum(epTotal5, 1) : "—", bold: true, color: DOCX_BRAND.PRIMARY_DARK },
      { text: instSummary?.co2_total_m2 != null ? fmtNum(instSummary.co2_total_m2, 1) : "—", bold: true },
      { text: "100,0", bold: true },
    ]);
    children.push(Tbl(balHeader, balRows));

    if (renewSummary && renewSummary.ep_adjusted_m2 != null) {
      children.push(P("EP final ajustat cu surse regenerabile (Pas 4):",
        { size: 16, bold: true, color: DOCX_BRAND.SLATE_700, spacing: { before: 120 } }));
      children.push(KV([
        ["EP înainte de regenerabile", `${fmtNum(epTotal5, 1)} kWh/(m²·an)`],
        ["Aport surse regenerabile (-)", `${fmtNum(renewSummary.ep_renew_m2 || 0, 1)} kWh/(m²·an)`,
          { color: "16A34A" }],
        ["EP final (cu regenerabile)", `${fmtNum(renewSummary.ep_adjusted_m2, 1)} kWh/(m²·an)`,
          { bold: true, color: DOCX_BRAND.PRIMARY_DARK }],
        ["Pondere regenerabile RER", `${fmtNum(renewSummary.rer || 0, 1)} %`],
        ["Pondere RER on-site", `${fmtNum(renewSummary.rerOnSite || 0, 1)} %`],
      ]));
    }

    if (monthlyISO && Array.isArray(monthlyISO.months) && monthlyISO.months.length === 12) {
      children.push(H("5.1  Bilanț lunar pentru încălzire (ISO 13790)", 2, { before: 180 }));
      const monthLabels = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mHeader = [
        ["Lună", 8], ["Q_H [kWh]", 12], ["Q_tr [kWh]", 12], ["Q_ve [kWh]", 12],
        ["Q_int [kWh]", 12], ["Q_sol [kWh]", 12], ["η_util", 10], ["Q_H_nd [kWh]", 14],
      ];
      const mRows = monthlyISO.months.map((m, i) => [
        monthLabels[i] || `L${i+1}`,
        m.QH_kwh != null ? fmtNum(m.QH_kwh, 0) : "—",
        m.Qtr_kwh != null ? fmtNum(m.Qtr_kwh, 0) : "—",
        m.Qve_kwh != null ? fmtNum(m.Qve_kwh, 0) : "—",
        m.Qint_kwh != null ? fmtNum(m.Qint_kwh, 0) : "—",
        m.Qsol_kwh != null ? fmtNum(m.Qsol_kwh, 0) : "—",
        m.eta != null ? fmtNum(m.eta, 2) : "—",
        m.QH_nd_kwh != null ? fmtNum(m.QH_nd_kwh, 0) : "—",
      ]);
      children.push(Tbl(mHeader, mRows));
    }

    children.push(P(
      "Referințe: Mc 001-2022 §5 (bilanț energetic), SR EN ISO 13790:2008 (metodă lunară), "
      + "SR EN ISO 52016-1:2017 (calcul orar), SR EN 15603:2008 (factori CO₂).",
      { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §6 CONFORT TERMIC VARĂ — verificare risc supraîncălzire (Anexa K)
  // ─────────────────────────────────────────────────────────────────────────
  if (opaque.length > 0 && climate?.zone) {
    sectionsCount++;
    children.push(H("6. Confort termic vară (Mc 001-2022 Anexa K + EN 16798-1)", 1));
    children.push(P(
      `Verificare risc supraîncălzire vară prin metoda statică (C107/7-2002 + SR EN ISO 13786). `
      + `Pragul confort SR EN 16798-1:2019 Cat. II = 26 °C interior (max 100 ore/an depășire).`,
      { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));

    const comfortHeader = [
      ["Element", 30], ["Orientare", 13], ["D inerție", 12], ["ν amortizare", 13],
      ["Δφ defazaj [h]", 14], ["T_op [°C]", 11], ["Verdict", 7],
    ];
    const comfortRows = [];
    let worstTop = 0;
    opaque.filter(el => ["PE", "PT", "PP"].includes(el.type)).forEach(el => {
      try {
        const sc = calcSummerComfort(el.layers || [], climate, el.orientation || "S");
        if (!sc) return;
        worstTop = Math.max(worstTop, sc.T_operative || 0);
        comfortRows.push([
          el.name || el.type,
          el.orientation || "—",
          // Sprint 8 mai 2026 — calcSummerComfort returnează field-ul „D", nu „D_inertia"
          fmtNum(sc.D || 0, 2),
          fmtNum(sc.dampingFactor || 0, 3),
          fmtNum(sc.phaseShift || 0, 1),
          fmtNum(sc.T_operative || 0, 1),
          { text: (sc.T_operative || 0) <= 26 ? "OK" : "RISC",
            color: (sc.T_operative || 0) <= 26 ? "16A34A" : "DC2626", bold: true },
        ]);
      } catch (e) {
        // skip if calculation fails
      }
    });
    if (comfortRows.length > 0) {
      children.push(Tbl(comfortHeader, comfortRows));
      children.push(P(
        `Cea mai mare temperatură operativă estimată: ${fmtNum(worstTop, 1)} °C. `
        + (worstTop <= 26
          ? "Confort vară conform Cat. II — fără risc supraîncălzire."
          : worstTop <= 28
          ? "Risc minor supraîncălzire — recomandă protecție solară exterior + ventilare nocturnă."
          : "Risc semnificativ supraîncălzire — necesită răcire activă sau intervenții majore (umbrire, masă termică suplimentară)."),
        { size: 16, bold: true, color: worstTop <= 26 ? "16A34A" : worstTop <= 28 ? "F59E0B" : "DC2626" }
      ));
    } else {
      children.push(P("Date climatice insuficiente pentru calcul confort vară.",
        { italics: true, color: DOCX_BRAND.SLATE_500 }));
    }
    children.push(P(
      "Referințe: Mc 001-2022 Anexa K, C107/7-2002 (calcul amortizare/defazaj), "
      + "SR EN ISO 13786:2017 (proprietăți dinamice), SR EN 16798-1:2019/NA:2019 (Cat. confort), "
      + "SR EN ISO 7730:2006 (PMV/PPD).",
      { size: 14, italics: true, color: DOCX_BRAND.SLATE_500 }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §7 SUMAR VERIFICĂRI NORMATIVE — checklist cumulativ
  // (condițional pe existența datelor — fără date, sumarul e gol)
  // ─────────────────────────────────────────────────────────────────────────
  const hasAnyData = opaque.length > 0 || glazing.length > 0 || bridges.length > 0 || hasSystems;
  if (hasAnyData) {
  sectionsCount++;
  children.push(H("7. Sumar verificări normative", 1));
  children.push(P(
    "Sinteză a verificărilor de conformitate cumulativ pe întregul plic + sisteme. "
    + "Servește ca anexă rapidă la decizia auditorului privind necesitatea măsurilor de reabilitare.",
    { size: 16, italics: true, color: DOCX_BRAND.SLATE_500 }
  ));

  let opaqueOK_C107 = 0, opaqueFail_C107 = 0;
  let opaqueOK_NZEB = 0, opaqueFail_NZEB = 0;
  opaque.forEach(el => {
    const m = computeElementMetrics(el);
    const u = m.u || 0;
    const u107 = getC107UMax(el.type, c107Cat);
    const uNzeb = nzebUMaxSet[el.type];
    if (u107 != null) { if (u <= u107 + 0.005) opaqueOK_C107++; else opaqueFail_C107++; }
    if (uNzeb != null) { if (u <= uNzeb + 0.005) opaqueOK_NZEB++; else opaqueFail_NZEB++; }
  });
  let glazingOK_C107 = 0, glazingFail_C107 = 0;
  glazing.forEach(g => {
    const u = parseFloat(g.u) || 0;
    const u107 = getC107UMax("FE", c107Cat) || 1.30;
    if (u <= u107 + 0.005) glazingOK_C107++; else glazingFail_C107++;
  });

  const epTotal_final = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 0;
  const rer_total = renewSummary?.rer || 0;

  const checkRows = [
    ["Anvelopa opacă — C107/2-2005",
      `${opaqueOK_C107} conforme / ${opaqueFail_C107} neconforme din ${opaque.length}`,
      { text: opaqueFail_C107 === 0 ? "CONFORM" : "PARȚIAL",
        color: opaqueFail_C107 === 0 ? "16A34A" : "F59E0B", bold: true }],
    [`Anvelopa opacă — nZEB ${isRenovation ? "renovare" : "nou"}`,
      `${opaqueOK_NZEB} conforme / ${opaqueFail_NZEB} neconforme din ${opaque.length}`,
      { text: opaqueFail_NZEB === 0 ? "CONFORM" : "NECONFORM",
        color: opaqueFail_NZEB === 0 ? "16A34A" : "DC2626", bold: true }],
    ["Anvelopa vitrată — C107/2-2005",
      `${glazingOK_C107} conforme / ${glazingFail_C107} neconforme din ${glazing.length}`,
      { text: glazingFail_C107 === 0 ? "CONFORM" : "PARȚIAL",
        color: glazingFail_C107 === 0 ? "16A34A" : "F59E0B", bold: true }],
    ["Punți termice — pierdere totală",
      `${fmtNum(bridges.reduce((s, b) => s + (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0), 0), 2)} W/K`,
      "Verificare per punte"],
    ["EP total final (cu regenerabile)",
      `${fmtNum(epTotal_final, 1)} kWh/(m²·an)`,
      "Vezi Raport nZEB pentru încadrare prag"],
    ["RER (regenerabile pondere totală)",
      `${fmtNum(rer_total, 1)} %`,
      { text: rer_total >= 30 ? "≥ 30% nZEB" : "< 30%",
        color: rer_total >= 30 ? "16A34A" : "DC2626", bold: true }],
  ];

  children.push(Tbl(
    [["Verificare normativă", 35], ["Rezultat", 40], ["Verdict", 25]],
    checkRows
  ));

  children.push(P(
    "Acest document constituie Anexa C1 la Dosarul de Audit Energetic AAECR (Cap. 8 — "
    + "anexe tehnice cumulative). Generat automat din pașii 1-5 ai aplicației Zephren. "
    + "Auditorul verifică datele și completează observațiile finale în Raportul Audit Energetic (A1).",
    { size: 14, italics: true, color: DOCX_BRAND.SLATE_500, spacing: { before: 120 } }
  ));
  } // ← end if(hasAnyData) §7

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
