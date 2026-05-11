/**
 * advanced-report-pdf.js — S30C
 *
 * Generator unificat de rapoarte PDF A4 pentru cele 13 module avansate Step 8.
 * Folosit de: MonteCarloEP, Pasivhaus, PMV/PPD, EN 12831, BACS detaliat,
 * SRI complet, MEPS optimizator, Pașaport renovare detaliat, Thermovision,
 * Acoustic, Cooling hourly, Shading dynamic, Night ventilation.
 *
 * Toate rapoartele:
 *   - format A4 portret (210 × 297 mm)
 *   - font Liberation Sans (diacritice RO native)
 *   - header cu logo + titlu + dată
 *   - footer cu „Zephren ${APP_VERSION} | <normativ>"
 *   - secțiuni cu sub-titluri + bullet-uri / tabele
 *   - referințe normative la final
 *
 * Sprint 30 — apr 2026
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
import { APP_VERSION } from "../data/app-version.js";
// audit-mai2026 MEGA Visual-2.A — migrare la brand kit Sprint Visual-1 (8 mai 2026)
import { buildBrandMetadata, BRAND_COLORS, setBrandColor } from "./pdf-brand-kit.js";
import { applyBrandHeader, applyBrandFooter } from "./pdf-brand-layout.js";

/**
 * Generează un raport PDF unificat pentru un modul Step 8.
 *
 * @param {object} payload
 * @param {string} payload.title - Titlu raport (ex: "Confort termic PMV/PPD")
 * @param {string} payload.subtitle - Subtitlu (ex: "Conform SR EN ISO 7730:2005")
 * @param {object} payload.building - { address, category, areaUseful }
 * @param {Array<object>} payload.sections - [{ heading, paragraphs?, table?, bullets? }]
 * @param {Array<string>} payload.references - referințe normative
 * @param {string} payload.filename - nume fișier de salvat (fără .pdf)
 * @returns {Promise<void>}
 */
export async function generateAdvancedReportPDF(payload) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // S30A·A1 — diacritice RO
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";

  const M = 18;
  const W = 210;
  const H = 297;
  let y = 18;

  // ─── Header (Visual-2.A audit-mai2026: migrare la brand kit) ─────────
  const brandMeta = buildBrandMetadata({
    title: payload.title || "Raport Zephren",
    building: payload.building,
    auditor: payload.auditor,
    date: new Date(),
    docType: payload.docType || "advanced-report",
    version: APP_VERSION,
  });
  applyBrandHeader(doc, brandMeta);
  y = 35;
  doc.setTextColor(20, 30, 60);
  doc.setFont(baseFont, "bold");
  doc.setFontSize(14);
  writeText(payload.title || "Raport Zephren", M, y);
  y += 6;

  if (payload.subtitle) {
    doc.setFontSize(9);
    doc.setFont(baseFont, "italic");
    doc.setTextColor(80, 80, 100);
    writeText(payload.subtitle, M, y);
    y += 6;
  }

  // ─── Date clădire ───────────────────────────────────────────────────
  if (payload.building) {
    const b = payload.building;
    doc.setFont(baseFont, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    const buildingLine = [
      b.address && `Clădire: ${b.address}`,
      b.category && `Categorie: ${b.category}`,
      b.areaUseful && `Au: ${b.areaUseful} m²`,
    ].filter(Boolean).join(" | ");
    if (buildingLine) {
      writeText(buildingLine, M, y);
      y += 5;
    }
  }

  doc.setDrawColor(200, 200, 220);
  doc.line(M, y, W - M, y);
  y += 6;

  // ─── Secțiuni ───────────────────────────────────────────────────────
  for (const section of (payload.sections || [])) {
    // Page break dacă rămas < 30 mm
    if (y > H - 40) {
      doc.addPage();
      y = 25;
    }

    doc.setFont(baseFont, "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 60);
    writeText(section.heading || "", M, y);
    y += 6;

    doc.setFont(baseFont, "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 60);

    // Paragraphs (text liber, line-wrap automat)
    if (section.paragraphs) {
      for (const p of section.paragraphs) {
        const lines = doc.splitTextToSize(p, W - M * 2);
        // Page break dacă paragraph nu încape
        if (y + lines.length * 4.5 > H - 15) { doc.addPage(); y = 25; }
        for (const line of lines) {
          writeText(line, M, y);
          y += 4.5;
        }
        y += 2;
      }
    }

    // Bullets
    if (section.bullets) {
      for (const bullet of section.bullets) {
        if (y > H - 15) { doc.addPage(); y = 25; }
        const lines = doc.splitTextToSize("• " + bullet, W - M * 2 - 5);
        for (let i = 0; i < lines.length; i++) {
          writeText(lines[i], M + (i === 0 ? 0 : 5), y);
          y += 4.5;
        }
      }
      y += 2;
    }

    // Tabele (jspdf-autotable)
    if (section.table) {
      const t = section.table;
      doc.autoTable({
        head: [t.head],
        body: t.body,
        startY: y,
        margin: { left: M, right: M },
        styles: { fontSize: 8, font: baseFont, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 30, 60], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        columnStyles: t.columnStyles || {},
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    y += 3;
  }

  // ─── Referințe normative ────────────────────────────────────────────
  if (payload.references && payload.references.length) {
    if (y > H - 30) { doc.addPage(); y = 25; }
    doc.setFont(baseFont, "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 60);
    writeText("Referințe normative:", M, y);
    y += 5;
    doc.setFont(baseFont, "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    for (const ref of payload.references) {
      const lines = doc.splitTextToSize("· " + ref, W - M * 2);
      for (const line of lines) {
        if (y > H - 12) { doc.addPage(); y = 25; }
        writeText(line, M, y);
        y += 3.5;
      }
    }
  }

  // ─── Footer pe fiecare pagină (Visual-2.A: migrare la brand kit) ─────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    applyBrandFooter(doc, brandMeta, i, pageCount);
  }

  // Save
  const filename = (payload.filename || "raport_zephren") + "_" + new Date().toISOString().slice(0, 10) + ".pdf";
  doc.save(filename);
}

/**
 * Helper rapid pentru rapoarte cu 1 secțiune + 1 tabel.
 */
export async function generateQuickReportPDF({ title, subtitle, building, headers, rows, references, filename }) {
  return generateAdvancedReportPDF({
    title,
    subtitle,
    building,
    sections: [
      {
        heading: "Rezultate",
        table: { head: headers, body: rows },
      },
    ],
    references,
    filename,
  });
}
