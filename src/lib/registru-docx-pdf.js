/**
 * registru-docx-pdf.js — Export Registru Evidență ca DOCX A4 + PDF A4 portret.
 *
 * Complementar cu `registru-evidenta-export.js` (care produce XLSX).
 * Inspectoratele MDLPA pot solicita formatul printabil DOCX/PDF pe lângă XLSX.
 *
 * Format: A4 portret, 2 cm margini, font Calibri 9pt (capete tabel mai mici
 * pentru a încăpea cele 21 de coloane Anexa 6 pe pagină).
 *
 * Sprint 17 (18 apr 2026).
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, HeadingLevel, PageOrientation,
  TableLayoutType,
} from "docx";
import { projectToAnexa6Row } from "./registru-evidenta-export.js";

// ── Constante ────────────────────────────────────────────────────────────

const A4_WIDTH_DXA = 11906;
const A4_HEIGHT_DXA = 16838;
const MARGIN_DXA = 720; // ~1.27 cm

// 21 coloane Anexa 6 — labels scurte pentru tabel printabil
const COLUMNS = [
  { key: "nrCrt",            label: "Nr.",           width: 4 },
  { key: "cpeNrData",        label: "Nr/Data CPE",   width: 9 },
  { key: "address",          label: "Adresa",        width: 14 },
  { key: "coords",           label: "GPS",           width: 8 },
  { key: "catTip",           label: "Categ. tip",    width: 7 },
  { key: "catSubtip",        label: "Subtip",        width: 6 },
  { key: "owner",            label: "Proprietar",    width: 10 },
  { key: "yearBuilt",        label: "An",            width: 4 },
  { key: "heightRegime",     label: "Reg.",          width: 4 },
  { key: "areaUseful",       label: "Au m²",         width: 5 },
  { key: "epPrimary",        label: "EP prim.",      width: 6 },
  { key: "efFinal",          label: "EF",            width: 5 },
  { key: "co2",              label: "CO₂",           width: 5 },
  { key: "energyClass",      label: "Cls. E",        width: 4 },
  { key: "emissionClass",    label: "Cls. CO₂",      width: 4 },
  { key: "energyClassAfter", label: "Cls. E renov",  width: 4 },
  { key: "emissionClassAfter", label: "Cls. CO₂ renov", width: 4 },
  { key: "energySavings",    label: "Econ.",         width: 4 },
  { key: "co2Reduction",     label: "Red. CO₂",      width: 4 },
  { key: "dataTransmitere",  label: "Data MDLPA",    width: 6 },
  { key: "observations",     label: "Obs.",          width: 9 },
];

const TOTAL_WIDTH_PCT = COLUMNS.reduce((s, c) => s + c.width, 0);

function formatDateRO(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function buildRows(projects, auditor) {
  return (projects || []).map((p, i) => {
    const r = projectToAnexa6Row(p, auditor);
    return { nrCrt: i + 1, ...r };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// EXPORT DOCX A4 PORTRET
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generează fișier DOCX A4 portret cu Registrul de Evidență.
 *
 * @param {Array} projects
 * @param {object} auditor
 * @param {object} [options]
 * @param {boolean} [options.download=true]
 * @param {string} [options.filename]
 * @returns {Promise<Blob|null>}
 */
export async function exportRegistruDOCX(projects, auditor = {}, options = {}) {
  const { download = true, filename } = options;
  const rows = buildRows(projects, auditor);

  const titleP = new Paragraph({
    text: "REGISTRU DE EVIDENȚĂ AL AUDITORULUI ENERGETIC",
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  });

  const subtitleP = new Paragraph({
    text: "Anexa 6 la Ordinul MDLPA nr. 348/2026 (MO nr. 292/14.04.2026)",
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });

  // Antet auditor — 2 rânduri tabel
  const auditorTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          buildLabel("Nume și prenume auditor:"),
          buildValue(auditor.name || ""),
          buildLabel("Nr. atestat:"),
          buildValue(auditor.atestat || ""),
          buildLabel("Specialitate / grad:"),
          buildValue([auditor.grade, auditor.specialty].filter(Boolean).join(" — ")),
        ],
      }),
      new TableRow({
        children: [
          buildLabel("Telefon:"),
          buildValue(auditor.phone || ""),
          buildLabel("E-mail:"),
          buildValue(auditor.email || ""),
          buildLabel("Drept practică:"),
          buildValue(auditor.dataExpirareDrept ? formatDateRO(new Date(auditor.dataExpirareDrept)) : ""),
        ],
      }),
    ],
  });

  // Tabel principal
  const headerRow = new TableRow({
    tableHeader: true,
    children: COLUMNS.map(c => new TableCell({
      width: { size: (c.width / TOTAL_WIDTH_PCT) * 100, type: WidthType.PERCENTAGE },
      shading: { fill: "E0E0E0" },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: c.label, bold: true, size: 14 })],
      })],
    })),
  });

  const dataRows = rows.length === 0
    ? [new TableRow({
        children: COLUMNS.map((_, i) => new TableCell({
          children: [new Paragraph({
            text: i === 1 ? "(Niciun CPE înregistrat încă)" : "",
            alignment: AlignmentType.CENTER,
          })],
        })),
      })]
    : rows.map(row => new TableRow({
        children: COLUMNS.map(c => new TableCell({
          children: [new Paragraph({
            alignment: ["nrCrt", "areaUseful", "epPrimary", "efFinal", "co2"].includes(c.key)
              ? AlignmentType.RIGHT
              : ["energyClass", "emissionClass", "energyClassAfter", "emissionClassAfter"].includes(c.key)
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            children: [new TextRun({ text: String(row[c.key] ?? ""), size: 12 })],
          })],
        })),
      }));

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "808080" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "808080" },
      left:   { style: BorderStyle.SINGLE, size: 4, color: "808080" },
      right:  { style: BorderStyle.SINGLE, size: 4, color: "808080" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
    },
    rows: [headerRow, ...dataRows],
  });

  // Footer cu semnătură
  const footer = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400 },
    children: [
      new TextRun({ text: "Auditor: ", italics: true }),
      new TextRun({ text: auditor.name || "______________________", bold: true }),
      new TextRun({ text: ` — atestat ${auditor.atestat || "______"}`, italics: true }),
    ],
  });

  const dateFooter = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 100 },
    children: [
      new TextRun({ text: `Data: ${formatDateRO(new Date())}`, italics: true, size: 18 }),
    ],
  });

  const noteFooter = new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 300 },
    children: [
      new TextRun({
        text: "Document de depus la MDLPA pentru prelungirea dreptului de practică (art. 31 alin. 2 lit. c, Ord. 348/2026). Coloanele Cls. E renov / Cls. CO₂ renov / Econ. / Red. CO₂ se completează doar pentru clădirile renovate.",
        italics: true,
        size: 16,
        color: "555555",
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA, orientation: PageOrientation.PORTRAIT },
          margin: { top: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA, right: MARGIN_DXA },
        },
      },
      children: [
        titleP,
        subtitleP,
        auditorTable,
        new Paragraph({ text: "", spacing: { after: 200 } }),
        mainTable,
        footer,
        dateFooter,
        noteFooter,
      ],
    }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 18 }, // 9pt
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);

  if (download) {
    triggerDownload(blob, filename || defaultFilename(auditor, "docx"));
    return null;
  }
  return blob;
}

// ──────────────────────────────────────────────────────────────────────────
// EXPORT PDF A4 PORTRET (jsPDF)
// ──────────────────────────────────────────────────────────────────────────

export async function exportRegistruPDF(projects, auditor = {}, options = {}) {
  const { download = true, filename } = options;
  const rows = buildRows(projects, auditor);

  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Titlu
  doc.setFontSize(14); doc.setFont(undefined, "bold");
  doc.text("REGISTRU DE EVIDENTA AL AUDITORULUI ENERGETIC", w / 2, 12, { align: "center" });
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  doc.text("Anexa 6 la Ord. MDLPA nr. 348/2026 (MO 292/14.04.2026)", w / 2, 18, { align: "center" });

  // Antet auditor
  doc.setFontSize(8);
  doc.text(`Auditor: ${auditor.name || ""} | Atestat: ${auditor.atestat || ""} | Spec.: ${auditor.grade || ""} ${auditor.specialty ? "(" + auditor.specialty + ")" : ""}`, 10, 26);
  doc.text(`Tel: ${auditor.phone || ""} | Email: ${auditor.email || ""} | Drept practica: ${auditor.dataExpirareDrept ? formatDateRO(new Date(auditor.dataExpirareDrept)) : ""}`, 10, 31);

  // Tabel
  const headers = COLUMNS.map(c => c.label);
  const body = rows.length === 0
    ? [["—", "Niciun CPE inregistrat", ...Array(COLUMNS.length - 2).fill("")]]
    : rows.map(r => COLUMNS.map(c => String(r[c.key] ?? "")));

  doc.autoTable({
    startY: 36,
    head: [headers],
    body,
    margin: { left: 6, right: 6 },
    theme: "grid",
    styles: { fontSize: 6, cellPadding: 1, overflow: "linebreak" },
    headStyles: { fillColor: [224, 224, 224], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6 },
    columnStyles: COLUMNS.reduce((acc, c, i) => {
      acc[i] = { cellWidth: ((c.width / TOTAL_WIDTH_PCT) * (w - 12)) };
      return acc;
    }, {}),
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.text(`Auditor: ${auditor.name || "______"} — atestat ${auditor.atestat || "______"}`, w - 10, finalY, { align: "right" });
  doc.text(`Data: ${formatDateRO(new Date())}`, w - 10, finalY + 5, { align: "right" });
  doc.setFontSize(7); doc.setTextColor(85);
  doc.text("Document de depus la MDLPA pentru prelungirea dreptului de practica (art. 31 alin. 2 lit. c, Ord. 348/2026).", 10, finalY + 12);

  const finalName = filename || defaultFilename(auditor, "pdf");
  if (download) {
    doc.save(finalName);
    return null;
  }
  return doc.output("blob");
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS interne
// ──────────────────────────────────────────────────────────────────────────

function buildLabel(text) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 16 })],
    })],
    shading: { fill: "F5F5F5" },
  });
}

function buildValue(text) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text || ""), size: 16 })],
    })],
  });
}

function defaultFilename(auditor, ext) {
  const slug = (auditor?.name || "auditor")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const dateSlug = new Date().toISOString().slice(0, 10);
  return `Registru_Evidenta_${slug}_${dateSlug}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
