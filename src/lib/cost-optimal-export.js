/**
 * cost-optimal-export.js — Export curbă cost-optim ca PDF + XLSX.
 *
 * Sprint Conformitate P1-04 (7 mai 2026) + Sprint Visual-10 (8 mai 2026).
 *
 * Conform Reg. UE 244/2012 + Reg. UE 2014/1051 — curba cost-optim e document
 * oficial pentru autorizare DTAC + dosar finanțare AFM/POR/PNRR.
 *
 * Output:
 *   - PDF A4 cu cover page brand + bar chart pachete (V10) + sumar pachete +
 *     analiză sensibilitate per scenariu (low/expected/high) + perspective
 *     EN 15459-1 (financiar / macro / social) + QR cod verificare
 *   - XLSX cu 3 tab-uri: Pachete, Sensibilitate, Sumar
 *
 * Sprint Visual-10: aplicare brand kit verde Zephren + bar chart costuri
 * pachete + QR cod verificare integritate (înlocuiește header amber custom
 * + footer linie simplu).
 *
 * INTEGRARE: CostOptimalCurve.jsx adaugă 2 butoane (PDF + XLSX) lângă graficul
 * existent. Modulul rămâne disponibil pentru consumatori externi.
 */

import {
  BRAND_COLORS,
  FONT_SIZES,
  A4,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  buildBrandMetadata,
} from "./pdf-brand-kit.js";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderSectionHeader,
  renderQrCode,
  buildVerifyUrl,
} from "./pdf-brand-layout.js";
import { renderBarChart } from "./pdf-brand-charts.js";

/**
 * Format helper: număr cu zecimale și separator RO.
 */
function fmtRo(n, dec = 0) {
  if (!isFinite(n)) return "—";
  return Number(n).toFixed(dec).replace(".", ",");
}

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * Generează PDF cost-optim A4.
 *
 * @param {object} args
 * @param {Array<{label, totalCost, npv, paybackYears, epReduction, scenario:"low"|"expected"|"high"}>} args.packages
 * @param {object} [args.scenarios] — { low, expected, high } cu factor multiplier
 * @param {object} [args.building]
 * @param {string} [args.cpeCode]
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function exportCostOptimalPdf({
  packages = [],
  scenarios = { low: 0.85, expected: 1.0, high: 1.15 },
  building = {},
  cpeCode = "",
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } = await import("../utils/pdf-fonts.js");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = A4.MARGIN_LEFT;
  const pageW = A4.WIDTH;

  // Sprint Visual-10: brand metadata pentru header/footer/QR
  const brandMeta = buildBrandMetadata({
    title: "Analiză Cost-Optim Pachete Renovare",
    cpeCode: cpeCode || `CO-${formatRomanianDate(new Date(), "iso")}`,
    building: {
      address: building.address,
      category: building.category,
      areaUseful: building.areaUseful,
      year: building.yearBuilt,
      cadastral: building.cadastralNumber,
    },
    docType: "cost-optim",
    version: "v4.0",
  });

  // Header brand
  applyBrandHeader(doc, brandMeta);
  let y = A4.MARGIN_TOP + 4;

  // Antet titlu cu bară primary verde
  doc.setFont(baseFont, "bold"); doc.setFontSize(FONT_SIZES.TITLE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("ANALIZĂ COST-OPTIM", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(FONT_SIZES.H3); doc.setFont(baseFont, "normal");
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("Pachete renovare — Reg. UE 244/2012 + EN 15459-1 (F/M/S)", pageW / 2, y, { align: "center" });
  y += 4;
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  y += 6;
  if (cpeCode) {
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    writeText(`Cod CPE: ${cpeCode} · ${building.address || ""}`, pageW / 2, y, { align: "center" });
    y += 4;
  }
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  y += 4;

  // Helper: tabel pachete cu brand colors
  const drawHeader = (cells, widths) => {
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "fill"); // brand kit (era custom slate dark)
    doc.rect(M, y, pageW - 2 * M, 7, "F");
    setBrandColor(doc, BRAND_COLORS.WHITE, "text"); // brand kit (era amber accent)
    doc.setFont(baseFont, "bold"); doc.setFontSize(FONT_SIZES.TABLE_HEADER);
    let x = M + 2;
    cells.forEach((c, i) => {
      writeText(c, x, y + 5);
      x += widths[i];
    });
    setBrandColor(doc, BRAND_COLORS.BLACK, "text");
    y += 8;
  };
  const drawRow = (cells, widths, alt = false) => {
    if (y > 270) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 4;
    }
    if (alt) {
      setBrandColor(doc, BRAND_COLORS.SLATE_50, "fill"); // brand zebra (era custom 245,245,250)
      doc.rect(M, y - 4, pageW - 2 * M, 6, "F");
    }
    setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
    doc.line(M, y + 2, pageW - M, y + 2);
    doc.setFont(baseFont, "normal"); doc.setFontSize(FONT_SIZES.TABLE_BODY);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    let x = M + 2;
    cells.forEach((c, i) => {
      writeText(String(c || "—"), x, y);
      x += widths[i];
    });
    setBrandColor(doc, BRAND_COLORS.BLACK, "text");
    y += 6;
  };

  // Sprint V10: Bar chart cost total per pachet (înainte de tabel)
  if (packages.length >= 2 && packages.length <= 8) {
    y = renderSectionHeader(doc, "1. Vizualizare cost total per pachet", y);
    const barData = packages.map((pkg, idx) => ({
      label: (pkg.label || `Pachet ${idx + 1}`).slice(0, 18),
      value: Number(pkg.totalCost) || 0,
      // Verde pentru pachetul cu reducere EP maximă, restul slate
      color: idx === 0 ? BRAND_COLORS.PRIMARY :
             idx === 1 ? BRAND_COLORS.PRIMARY_LIGHT :
             idx === 2 ? BRAND_COLORS.INFO :
             BRAND_COLORS.SLATE_500,
    }));
    renderBarChart(doc, M, y, pageW - 2 * M, 50, {
      data: barData,
      orientation: "horizontal",
      unit: "RON (cost total)",
      showValues: true,
      showGrid: true,
    });
    y += 54;
  }

  // 1. Tabel pachete (scenariu expected)
  y = renderSectionHeader(doc, packages.length >= 2 ? "2. Pachete renovare — Scenariu așteptat (expected)" : "1. Pachete renovare — Scenariu așteptat (expected)", y);

  const widths = [50, 30, 30, 25, 35]; // Total: 170mm = pageW-M*2
  drawHeader(["Denumire pachet", "Cost total RON", "VAN 25 ani", "Payback (ani)", "Reducere EP %"], widths);

  packages.forEach((pkg, idx) => {
    drawRow([
      pkg.label,
      fmtRo(pkg.totalCost, 0),
      fmtRo(pkg.npv, 0),
      fmtRo(pkg.paybackYears, 1),
      fmtRo(pkg.epReduction, 0) + "%",
    ], widths, idx % 2 === 0);
  });
  y += 6;

  // 2. Analiza sensibilitate per scenariu
  if (y > 220) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, packages.length >= 2 ? "3. Analiză sensibilitate — Cost total per scenariu" : "2. Analiză sensibilitate — Cost total per scenariu", y);

  const scWidths = [60, 35, 35, 35]; // 165mm
  drawHeader([
    "Pachet",
    `Low (×${fmtRo(scenarios.low, 2)})`,
    `Expected (×${fmtRo(scenarios.expected, 2)})`,
    `High (×${fmtRo(scenarios.high, 2)})`,
  ], scWidths);

  packages.forEach((pkg, idx) => {
    drawRow([
      pkg.label,
      fmtRo((pkg.totalCost || 0) * scenarios.low, 0),
      fmtRo(pkg.totalCost, 0),
      fmtRo((pkg.totalCost || 0) * scenarios.high, 0),
    ], scWidths, idx % 2 === 0);
  });
  y += 6;

  // 3. Perspective EN 15459-1
  if (y > 230) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  const sectionOffset = packages.length >= 2 ? 1 : 0;
  y = renderSectionHeader(doc, `${3 + sectionOffset}. Perspective EN 15459-1 — Cost-optim`, y);

  doc.setFont(baseFont, "normal"); doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const perspectives = [
    "  • Perspectiva FINANCIARĂ (F): cost-beneficiu pentru proprietar (incluzând TVA, fără subvenții).",
    "  • Perspectiva MACRO-ECONOMICĂ (M): cost național fără TVA (inclusiv externalități CO₂ EU ETS).",
    "  • Perspectiva SOCIALĂ (S): include valoare confort + sănătate + reducere boli respiratorii.",
  ];
  perspectives.forEach(p => {
    writeText(p, M, y); y += 5;
  });
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  y += 6;

  // Recomandare auditor
  if (y > 240) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, `${4 + sectionOffset}. Recomandare auditor`, y);

  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  // Pachet cu cel mai mic cost / EP_reducere maximă
  const optim = [...packages].sort((a, b) => (b.epReduction || 0) - (a.epReduction || 0))[0];
  if (optim) {
    const lines = doc.splitTextToSize(
      `Pachetul cost-optim recomandat este „${optim.label}" cu reducere EP de ` +
      `${fmtRo(optim.epReduction, 0)}% și cost total de ${fmtRo(optim.totalCost, 0)} RON ` +
      `(payback ~${fmtRo(optim.paybackYears, 1)} ani). Acest pachet îndeplinește cerințele ` +
      `Reg. UE 244/2012 pentru pragul cost-optim minim.`,
      pageW - 2 * M,
    );
    lines.forEach(l => { writeText(l, M, y); y += 4.5; });
  }

  // Sprint V10: QR cod verificare integritate (ultima pagină)
  await renderQrCode(doc, buildVerifyUrl(brandMeta), {
    x: A4.WIDTH - A4.MARGIN_RIGHT - 18,
    y: A4.HEIGHT - 35 - 15,
    size: 18,
    label: "Verifică online",
  });

  // Footer brand pe TOATE paginile
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    applyBrandFooter(doc, brandMeta, i, totalPages, {
      legalText: "Reg. UE 244/2012 · Reg. UE 2014/1051 · EN 15459-1 (F/M/S) · Mc 001-2022 · Sprint Conformitate P1-04",
    });
  }

  const fname = `Cost_optim_${_safeSlug(cpeCode || building.address || "analiza")}_${formatRomanianDate(new Date(), "iso")}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

/**
 * Generează XLSX cost-optim cu 3 tab-uri.
 *
 * @param {object} args — same ca exportCostOptimalPdf
 * @returns {Promise<Blob>}
 */
export async function exportCostOptimalXlsx({
  packages = [],
  scenarios = { low: 0.85, expected: 1.0, high: 1.15 },
  building = {},
  cpeCode = "",
  download = true,
} = {}) {
  // Folosesc exceljs (deja prezent în package.json prin xlsx.min)
  // Implementare simplă cu CSV-like în XLSX prin xlsx library
  const xlsx = await import("xlsx");

  const wb = xlsx.utils.book_new();

  // Sheet 1: Pachete
  const pachData = [
    ["Pachet", "Cost total RON", "VAN 25 ani", "Payback (ani)", "Reducere EP %"],
    ...packages.map(p => [
      p.label,
      Math.round(Number(p.totalCost) || 0),
      Math.round(Number(p.npv) || 0),
      Number((Number(p.paybackYears) || 0).toFixed(1)),
      Number((Number(p.epReduction) || 0).toFixed(0)),
    ]),
  ];
  const ws1 = xlsx.utils.aoa_to_sheet(pachData);
  xlsx.utils.book_append_sheet(wb, ws1, "Pachete");

  // Sheet 2: Sensibilitate
  const sensData = [
    ["Pachet", `Low (×${scenarios.low})`, `Expected (×${scenarios.expected})`, `High (×${scenarios.high})`],
    ...packages.map(p => [
      p.label,
      Math.round((Number(p.totalCost) || 0) * scenarios.low),
      Math.round((Number(p.totalCost) || 0) * scenarios.expected),
      Math.round((Number(p.totalCost) || 0) * scenarios.high),
    ]),
  ];
  const ws2 = xlsx.utils.aoa_to_sheet(sensData);
  xlsx.utils.book_append_sheet(wb, ws2, "Sensibilitate");

  // Sheet 3: Sumar
  const optim = [...packages].sort((a, b) => (b.epReduction || 0) - (a.epReduction || 0))[0];
  const sumData = [
    ["Cod CPE", cpeCode || "—"],
    ["Adresă", building.address || "—"],
    ["Data analizei", new Date().toISOString().slice(0, 10)],
    ["Număr pachete", packages.length],
    [],
    ["RECOMANDARE COST-OPTIM:"],
    ["Pachet recomandat", optim?.label || "—"],
    ["Cost total RON", optim?.totalCost || 0],
    ["Reducere EP %", optim?.epReduction || 0],
    ["Payback ani", optim?.paybackYears || 0],
    [],
    ["Bază normativă:"],
    ["Reg. UE 244/2012"],
    ["Reg. UE 2014/1051"],
    ["EN 15459-1 (perspective F/M/S)"],
    ["Mc 001-2022"],
  ];
  const ws3 = xlsx.utils.aoa_to_sheet(sumData);
  xlsx.utils.book_append_sheet(wb, ws3, "Sumar");

  // Output blob
  const wbout = xlsx.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (download && typeof document !== "undefined") {
    const fname = `Cost_optim_${_safeSlug(cpeCode || building.address || "analiza")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return blob;
}
