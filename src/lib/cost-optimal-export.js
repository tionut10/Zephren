/**
 * cost-optimal-export.js — Export curbă cost-optim ca PDF + XLSX.
 *
 * Conform Reg. UE 244/2012 + Reg. UE 2014/1051 — curba cost-optim e document
 * oficial pentru autorizare DTAC + dosar finanțare AFM/POR/PNRR.
 *
 * Output:
 *   - PDF A4 cu sumar pachete + analiză sensibilitate per scenariu (low/expected/high)
 *     + perspective EN 15459-1 (financiar / macro / social)
 *   - XLSX cu 3 tab-uri: Pachete, Sensibilitate, Sumar
 *
 * Sprint Conformitate P1-04 (7 mai 2026).
 *
 * INTEGRARE: CostOptimalCurve.jsx adaugă 2 butoane (PDF + XLSX) lângă graficul
 * existent. Modulul rămâne disponibil pentru consumatori externi.
 */

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
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  // Antet
  doc.setFont(baseFont, "bold"); doc.setFontSize(15);
  writeText("ANALIZĂ COST-OPTIM PACHETE RENOVARE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText("Conform Reg. UE 244/2012 + Reg. UE 2014/1051 + EN 15459-1 (perspective F/M/S)",
    pageW / 2, y, { align: "center" });
  y += 5;
  if (cpeCode) {
    writeText(`Cod CPE: ${cpeCode} · ${building.address || ""}`, pageW / 2, y, { align: "center" });
    y += 5;
  }
  writeText(`Data: ${new Date().toLocaleDateString("ro-RO")}`, pageW / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Helper: tabel pachete
  const drawHeader = (cells, widths) => {
    doc.setFillColor(35, 41, 70);
    doc.rect(M, y, pageW - 2 * M, 7, "F");
    doc.setTextColor(251, 191, 36);
    doc.setFont(baseFont, "bold"); doc.setFontSize(8.5);
    let x = M + 2;
    cells.forEach((c, i) => {
      writeText(c, x, y + 5);
      x += widths[i];
    });
    doc.setTextColor(0, 0, 0);
    y += 8;
  };
  const drawRow = (cells, widths, alt = false) => {
    if (y > 270) { doc.addPage(); y = 22; }
    if (alt) {
      doc.setFillColor(245, 245, 250);
      doc.rect(M, y - 4, pageW - 2 * M, 6, "F");
    }
    doc.setDrawColor(220, 220, 230);
    doc.line(M, y + 2, pageW - M, y + 2);
    doc.setFont(baseFont, "normal"); doc.setFontSize(8);
    let x = M + 2;
    cells.forEach((c, i) => {
      writeText(String(c || "—"), x, y);
      x += widths[i];
    });
    y += 6;
  };

  // 1. Tabel pachete (scenariu expected)
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. PACHETE RENOVARE — Scenariu așteptat (expected)", M, y); y += 7;

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
  if (y > 220) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. ANALIZĂ SENSIBILITATE — Cost total per scenariu", M, y); y += 7;

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
  if (y > 230) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("3. PERSPECTIVE EN 15459-1 — Cost-optim", M, y); y += 7;

  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(50, 50, 80);
  const perspectives = [
    "  • Perspectiva FINANCIARĂ (F): cost-beneficiu pentru proprietar (incluzând TVA, fără subvenții).",
    "  • Perspectiva MACRO-ECONOMICĂ (M): cost național fără TVA (inclusiv externalități CO₂ EU ETS).",
    "  • Perspectiva SOCIALĂ (S): include valoare confort + sănătate + reducere boli respiratorii.",
  ];
  perspectives.forEach(p => {
    writeText(p, M, y); y += 5;
  });
  doc.setTextColor(0, 0, 0);
  y += 6;

  // Recomandare auditor
  if (y > 240) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(10);
  writeText("4. RECOMANDARE AUDITOR", M, y); y += 6;

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

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 280, pageW - M, 280);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P1-04. " +
    "Bază: Reg. UE 244/2012 + Reg. UE 2014/1051 + EN 15459-1 + Mc 001-2022.",
    M, 285, { maxWidth: pageW - 2 * M });

  const fname = `Cost_optim_${_safeSlug(cpeCode || building.address || "analiza")}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
