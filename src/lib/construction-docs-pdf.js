/**
 * construction-docs-pdf.js — Documente specifice construcții noi (Faza B/C).
 *
 * Sprint Conformitate P3-02..P3-04 (7 mai 2026) + Sprint Visual-6 (8 mai 2026).
 *
 * Module incluse:
 *   - generateCarteaTehnicaNotesPdf (P3-02) — Note pentru Cartea Tehnică (faza execuție)
 *   - generatePhotoAlbumPdf (P3-03) — Foto-album construcții noi (≥30 fotografii cu EXIF)
 *   - generateCtInsertionDossierPdf (P3-04) — Inserare CT recepție (agregat)
 *
 * Sprint Visual-6: aplicare brand kit (SLATE_900 + WHITE pe header tabele,
 * brand header/footer pe paginile principale).
 *
 * Bază legală: HG 273/1994 Art. 17 (Cartea Tehnică obligatorie).
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
import {
  BRAND_COLORS,
  FONT_SIZES,
  A4,
  setBrandColor,
  formatRomanianDate,
  buildBrandMetadata,
} from "./pdf-brand-kit.js";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderQrCode,
  buildVerifyUrl,
} from "./pdf-brand-layout.js";

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 40);
}

function fmtNum(v, dec = 1) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toFixed(dec).replace(".", ",");
}

// ─────────────────────────────────────────────────────────────────────────────
// P3-02 Note Cartea Tehnică — fază execuție
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} args
 * @param {object} args.building
 * @param {Array<{spec:string, planned:string, executed:string, deviation?:string}>} args.deviations
 * @param {Array<{name:string, value:string, target?:string}>} args.measurements — n50, U, EP test, etc.
 * @param {object} args.auditor
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateCarteaTehnicaNotesPdf({
  building = {},
  deviations = [],
  measurements = [],
  auditor = {},
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("NOTE PENTRU CARTEA TEHNICĂ A CONSTRUCȚIEI", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Faza execuție — măsurători și abateri vs proiect (HG 273/1994 Art. 17)",
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // 1. Identificare clădire
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. IDENTIFICARE CONSTRUCȚIE", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  writeText(`Adresă: ${building.address || "—"}`, M, y); y += 5;
  writeText(`Categorie: ${building.category || "—"}`, M, y); y += 5;
  writeText(`Suprafață utilă proiect: ${fmtNum(building.areaUseful)} m²`, M, y); y += 5;
  writeText(`Auditor faza execuție: ${auditor.name || "—"} (atestat ${auditor.atestat || "—"})`, M, y); y += 8;

  // 2. Abateri vs proiect
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. ABATERI vs PROIECT", M, y); y += 7;

  if (deviations.length > 0) {
    doc.setFillColor(15, 23, 42); // Sprint V6: SLATE_900 brand kit (era custom slate)
    doc.rect(M, y, pageW - 2 * M, 7, "F");
    doc.setTextColor(255, 255, 255); // Sprint V6: WHITE brand kit (era amber accent)
    doc.setFont(baseFont, "bold"); doc.setFontSize(8);
    writeText("Specificație", M + 2, y + 5);
    writeText("Planificat", M + 60, y + 5);
    writeText("Executat", M + 110, y + 5);
    writeText("Abatere", M + 150, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 9;

    deviations.forEach((dev, idx) => {
      if (y > 265) { doc.addPage(); y = 22; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(M, y - 4, pageW - 2 * M, 6, "F");
      }
      doc.setFont(baseFont, "normal"); doc.setFontSize(8);
      writeText(dev.spec || "—", M + 2, y);
      writeText(dev.planned || "—", M + 60, y);
      writeText(dev.executed || "—", M + 110, y);
      if (dev.deviation) {
        doc.setTextColor(180, 30, 30);
        writeText(dev.deviation, M + 150, y);
        doc.setTextColor(0, 0, 0);
      }
      y += 6;
    });
    y += 4;
  } else {
    doc.setFont(baseFont, "italic"); doc.setFontSize(9);
    doc.setTextColor(20, 100, 20);
    writeText("✓ Construcția este executată în concordanță cu proiectul aprobat.", M, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // 3. Măsurători cheie
  if (y > 230) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("3. MĂSURĂTORI CHEIE POST-EXECUȚIE", M, y); y += 6;

  if (measurements.length === 0) {
    measurements = [
      { name: "n50 (etanșeitate, blower-door test)", value: "—", target: "≤ 1.5 h⁻¹ (rezidențial)" },
      { name: "EP final test (kWh/m²·an)", value: "—", target: "≤ valoare proiect" },
      { name: "U mediu anvelopă (W/m²K)", value: "—", target: "≤ valoare proiect" },
    ];
  }

  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  measurements.forEach(m => {
    if (y > 265) { doc.addPage(); y = 22; }
    doc.setDrawColor(220, 220, 230);
    doc.line(M, y + 2, pageW - M, y + 2);
    doc.setFont(baseFont, "bold");
    writeText(m.name, M + 2, y);
    doc.setFont(baseFont, "normal");
    writeText(`Valoare: ${m.value || "—"}`, M + 100, y);
    if (m.target) {
      doc.setTextColor(100, 100, 130);
      writeText(`Țintă: ${m.target}`, M + 2, y + 4);
      doc.setTextColor(0, 0, 0);
    }
    y += 9;
  });
  y += 4;

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 285, pageW - M, 285);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P3-02. " +
    "Bază: HG 273/1994 Art. 17 + Mc 001-2022 + L. 50/1991.",
    M, 290, { maxWidth: pageW - 2 * M });

  const fname = `Note_CT_${_safeSlug(building.address || "constructie")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// P3-03 Foto-album construcții noi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorii foto-album standard.
 */
export const PHOTO_CATEGORIES = Object.freeze({
  SAPATURI: "Săpături + fundație",
  STRUCTURA: "Structură (beton, zidărie, lemn)",
  ANVELOPA: "Anvelopă (izolație, ferestre, acoperiș)",
  INSTALATII: "Instalații (HVAC, electrice, sanitare)",
  FINISAJE: "Finisaje interioare/exterioare",
  ALTELE: "Altele (organizare șantier, recepții parțiale)",
});

/**
 * @param {object} args
 * @param {object} args.building
 * @param {Array<{
 *   dataUrl: string, // base64 image
 *   category: string,
 *   caption: string,
 *   timestamp?: string,
 *   gpsLat?: number,
 *   gpsLng?: number
 * }>} args.photos
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generatePhotoAlbumPdf({
  building = {},
  photos = [],
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 15;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  // Cover
  doc.setFont(baseFont, "bold"); doc.setFontSize(16);
  writeText("FOTO-ALBUM CONSTRUCȚIE", pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11); doc.setFont(baseFont, "normal");
  writeText(building.address || "—", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText(`${photos.length} fotografii · Generat ${new Date().toLocaleDateString("ro-RO")}`,
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // Grup pe categorii
  const grouped = {};
  for (const p of photos) {
    const cat = p.category || "ALTELE";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  // 4 fotografii per pagină (grid 2×2)
  const photoW = 85;
  const photoH = 60;
  let gridX = M;
  let gridY = y;
  let gridIdx = 0;

  for (const [catKey, catPhotos] of Object.entries(grouped)) {
    if (gridIdx > 0 || y > 50) {
      doc.addPage();
      gridX = M;
      gridY = 18;
      y = 18;
      gridIdx = 0;
    }
    doc.setFont(baseFont, "bold"); doc.setFontSize(12);
    writeText(`📸 ${PHOTO_CATEGORIES[catKey] || catKey} (${catPhotos.length})`, M, y);
    y += 8;
    gridY = y;

    catPhotos.forEach((photo, idx) => {
      if (gridIdx >= 4) {
        doc.addPage();
        gridX = M;
        gridY = 18;
        gridIdx = 0;
      }
      const col = gridIdx % 2;
      const row = Math.floor(gridIdx / 2);
      const x = M + col * (photoW + 5);
      const yy = gridY + row * (photoH + 18);

      // Imagine (sau placeholder dacă dataUrl invalid)
      try {
        if (photo.dataUrl && photo.dataUrl.startsWith("data:image")) {
          doc.addImage(photo.dataUrl, "JPEG", x, yy, photoW, photoH);
        } else {
          doc.setDrawColor(180, 180, 200);
          doc.setFillColor(240, 240, 245);
          doc.rect(x, yy, photoW, photoH, "FD");
          doc.setFont(baseFont, "italic"); doc.setFontSize(8); doc.setTextColor(100, 100, 130);
          writeText("[imagine]", x + photoW / 2, yy + photoH / 2, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
      } catch {
        doc.setDrawColor(180, 180, 200);
        doc.rect(x, yy, photoW, photoH);
      }

      // Caption + metadata
      doc.setFont(baseFont, "normal"); doc.setFontSize(8);
      const caption = (photo.caption || "—").slice(0, 60);
      writeText(`${idx + 1}. ${caption}`, x, yy + photoH + 4);
      if (photo.timestamp) {
        doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 140);
        writeText(`📅 ${photo.timestamp}`, x, yy + photoH + 8);
        doc.setTextColor(0, 0, 0);
      }
      if (photo.gpsLat && photo.gpsLng) {
        doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 140);
        writeText(`📍 ${fmtNum(photo.gpsLat, 4)}, ${fmtNum(photo.gpsLng, 4)}`, x, yy + photoH + 12);
        doc.setTextColor(0, 0, 0);
      }

      gridIdx++;
    });
    gridIdx = 0; // reset pentru categoria următoare
    y = 280; // forțează page break
  }

  const fname = `Foto_album_${_safeSlug(building.address || "constructie")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// P3-04 ENERGOBILANȚ MO industrial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} args
 * @param {object} args.facility
 * @param {Array<{name:string, consumption_kwh:number, productionUnits?:number, indicator?:string}>} args.processes
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateEnergobilantPdf({
  facility = {},
  processes = [],
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("ENERGOBILANȚ MANAGEMENT OPERAȚIONAL", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Conform HG 122/2024 + L. 121/2014 (eficiență energetică industrială)",
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // 1. Date facilitate
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. FACILITATE INDUSTRIALĂ", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  writeText(`Denumire: ${facility.name || "—"}`, M, y); y += 5;
  writeText(`Adresă: ${facility.address || "—"}`, M, y); y += 5;
  writeText(`Cod CAEN: ${facility.caen || "—"}`, M, y); y += 5;
  writeText(`Suprafață totală: ${fmtNum(facility.areaTotal)} m²`, M, y); y += 8;

  // 2. Procese principale
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. PROCESE PRINCIPALE + INDICATORI SPECIFICI", M, y); y += 7;

  if (processes.length > 0) {
    doc.setFillColor(15, 23, 42); // Sprint V6: SLATE_900 brand kit (era custom slate)
    doc.rect(M, y, pageW - 2 * M, 7, "F");
    doc.setTextColor(255, 255, 255); // Sprint V6: WHITE brand kit (era amber accent)
    doc.setFont(baseFont, "bold"); doc.setFontSize(8.5);
    writeText("Proces", M + 2, y + 5);
    writeText("Consum kWh/an", M + 75, y + 5);
    writeText("Producție unități/an", M + 115, y + 5);
    writeText("Indicator", M + 160, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 9;

    let totalConsumption = 0;
    processes.forEach((p, idx) => {
      if (y > 265) { doc.addPage(); y = 22; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(M, y - 4, pageW - 2 * M, 6, "F");
      }
      doc.setFont(baseFont, "normal"); doc.setFontSize(8);
      writeText(p.name || "—", M + 2, y);
      writeText(fmtNum(p.consumption_kwh, 0), M + 75, y);
      writeText(p.productionUnits ? fmtNum(p.productionUnits, 0) : "—", M + 115, y);
      writeText(p.indicator || (p.productionUnits && p.consumption_kwh
        ? `${fmtNum(p.consumption_kwh / p.productionUnits, 2)} kWh/buc`
        : "—"), M + 160, y);
      y += 6;
      totalConsumption += Number(p.consumption_kwh) || 0;
    });
    y += 4;

    doc.setFillColor(255, 248, 220);
    doc.rect(M, y, pageW - 2 * M, 8, "F");
    doc.setFont(baseFont, "bold"); doc.setFontSize(10); doc.setTextColor(140, 80, 20);
    writeText(`TOTAL CONSUM: ${fmtNum(totalConsumption, 0)} kWh/an`, M + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 285, pageW - M, 285);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P3-06. " +
    "Bază: HG 122/2024 + L. 121/2014 + EU EED 2023/1791.",
    M, 290, { maxWidth: pageW - 2 * M });

  const fname = `ENERGOBILANT_${_safeSlug(facility.name || "facilitate")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
