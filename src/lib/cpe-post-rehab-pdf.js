/**
 * cpe-post-rehab-pdf.js — Generator CPE estimat post-reabilitare (PDF A4)
 *
 * Sprint Pas 7 docs (6 mai 2026)
 *
 * Generează un document PDF orientativ care prezintă clasa energetică estimată
 * pe care clădirea ar atinge-o DUPĂ implementarea scenariului de reabilitare
 * configurat în Pasul 5.
 *
 * IMPORTANT — Acest document NU este un CPE oficial:
 *   - NU înlocuiește CPE oficial emis după realizarea lucrărilor
 *   - NU se înregistrează pe portalul MDLPA
 *   - Are watermark vizibil „ESTIMAT POST-REABILITARE" pe fiecare pagină
 *   - Codul CPE include sufixul „-EST" pentru a marca caracterul orientativ
 *
 * Scop: instrument de informare pentru client/dezvoltator/finanțator —
 *   răspunde la întrebarea „dacă fac lucrările, ce clasă obțin?"
 *
 * Layout (1 pagină A4 portret):
 *   1. Header amber „CPE ESTIMAT — POST-REABILITARE"
 *   2. Identificare clădire (adresă, categorie, Au, an, cadastru)
 *   3. Comparație vizuală EP/clasă: ACTUAL vs. POST-REABILITARE (badge dual)
 *   4. Reducere consum + emisii CO2 (tabel: kWh/m²·an, kg CO2/m²·an, %)
 *   5. Măsuri incluse în scenariu (listă bifată cu costuri)
 *   6. Cost total estimat + economie anuală + perioadă recuperare
 *   7. Watermark central diagonal „ESTIMAT" + footer disclaimer juridic
 */

const CLASS_COLORS_RGB = {
  A: [22, 163, 74],
  B: [132, 204, 22],
  C: [234, 179, 8],
  D: [249, 115, 22],
  E: [239, 68, 68],
  F: [185, 28, 28],
  G: [127, 29, 29],
};

const FUEL_PRICE_RON_KWH = {
  electricitate: 1.40,
  gaz: 0.45,
  termoficare: 0.35,
  biomasa: 0.21,
  motorina: 0.95,
  gpl: 0.85,
  carbune: 0.30,
};

function fmt(n, dec = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function defaultFilename(building) {
  const name = String(building?.name || building?.address || "cladire")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `cpe_estimat_post_reabilitare_${name}_${date}.pdf`;
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
  return { size: blob.size, filename };
}

/**
 * Estimare cost anual energie pe baza qfTotal + combustibil principal încălzire.
 * Aproximare orientativă (mix gaz/electricitate pentru servicii multiple).
 */
function estimateAnnualEnergyCostRON(qfTotalKwh, fuelId) {
  const heatingPriceRON = FUEL_PRICE_RON_KWH[fuelId] || 0.45;
  const elecPriceRON = FUEL_PRICE_RON_KWH.electricitate;
  // Mix 70% combustibil principal (încălzire+ACM) + 30% electricitate (răcire+vent+iluminat)
  const blendedPrice = heatingPriceRON * 0.70 + elecPriceRON * 0.30;
  return qfTotalKwh * blendedPrice;
}

/**
 * Construiește listă măsuri incluse din rehabScenarioInputs — DEPRECATED.
 * Sprint Pas 7 docs (6 mai 2026) — folosește buildCanonicalMeasures din
 * src/calc/unified-rehab-costs.js (sursa unică pentru toate cele 3 documente).
 *
 * Adaptor: convertește output-ul canonic în format compatibil cu PDF-ul curent
 * ({ label, area, cost }) pentru a evita refactor masiv în drawTable.
 */
function buildMeasuresList(rehabInputs, opaqueElements, glazingElements, _ignoredREHAB_COSTS) {
  // Import lazy ca să evităm import circular în testing
  if (!buildMeasuresList._canonical) {
    // Setat la prima utilizare (vezi exportCpePostRehabPDF mai jos)
    return [];
  }
  const canonical = buildMeasuresList._canonical(rehabInputs, opaqueElements, glazingElements);
  return canonical.map(m => ({
    label: m.label,
    area: m.qty,
    cost: m.costRON,
    costEUR: m.costEUR,
    normativ: m.normativ,
    unit: m.unit,
  }));
}

/**
 * Desenează scală orizontală A-G colorată (similar CPE oficial MDLPA).
 * Marker triunghiular indică clasa estimată.
 */
function drawEnergyScale(doc, x, y, totalWidth, height, currentCls, targetCls) {
  const classes = ["A", "B", "C", "D", "E", "F", "G"];
  const barWidth = totalWidth / classes.length;

  // Bare colorate
  classes.forEach((cls, i) => {
    const [r, g, b] = CLASS_COLORS_RGB[cls] || [128, 128, 128];
    doc.setFillColor(r, g, b);
    doc.rect(x + i * barWidth, y, barWidth, height, "F");
    // Etichete în interior
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(cls, x + i * barWidth + barWidth / 2, y + height / 2 + 1.2, { align: "center" });
  });

  // Marker triunghi „CURRENT" (jos)
  if (currentCls && classes.includes(currentCls)) {
    const idx = classes.indexOf(currentCls);
    const cx = x + idx * barWidth + barWidth / 2;
    const triY = y + height + 1;
    doc.setFillColor(60, 60, 60);
    doc.triangle(cx - 2, triY + 3, cx + 2, triY + 3, cx, triY, "F");
    doc.setFont(undefined, "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text("ACTUAL", cx, triY + 7, { align: "center" });
  }

  // Marker triunghi „TARGET" (sus)
  if (targetCls && classes.includes(targetCls)) {
    const idx = classes.indexOf(targetCls);
    const cx = x + idx * barWidth + barWidth / 2;
    const triY = y - 1;
    doc.setFillColor(180, 83, 9);
    doc.triangle(cx - 2.5, triY - 4, cx + 2.5, triY - 4, cx, triY, "F");
    doc.setFont(undefined, "bold");
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text("ESTIMAT", cx, triY - 5, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
}

function drawClassBadge(doc, x, y, w, h, cls, label) {
  const [r, g, b] = CLASS_COLORS_RGB[cls] || [100, 100, 100];
  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(String(cls || "—"), x + w / 2, y + h * 0.55, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(7);
  doc.text(String(label || ""), x + w / 2, y + h * 0.85, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function drawWatermark(doc, w, h) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.10 }));
  doc.setFont(undefined, "bold");
  doc.setFontSize(72);
  doc.setTextColor(180, 83, 9); // amber-700
  // Diagonal text approximate at -45 degrees, centered
  doc.text("ESTIMAT", w / 2, h / 2 + 10, { align: "center", angle: 30 });
  doc.text("POST-REABILITARE", w / 2, h / 2 + 30, { align: "center", angle: 30 });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
}

/**
 * Generează PDF CPE estimat post-reabilitare.
 *
 * @param {Object} params
 * @param {Object} params.building - Date clădire (address, category, areaUseful, yearBuilt, cadastralNumber)
 * @param {Object} params.auditor  - Date auditor (name, atestat, grade, company)
 * @param {Object} params.rehabComparison - { original: {ep, co2, cls}, rehab: {ep, co2, cls, qfTotal}, savings: {epPct, co2Pct, qfSaved} }
 * @param {Object} params.rehabScenarioInputs - Configurarea scenariu (addInsulWall, replaceWindows, etc.)
 * @param {Array}  params.opaqueElements
 * @param {Array}  params.glazingElements
 * @param {Object} params.REHAB_COSTS
 * @param {Object} params.instSummary - Pentru qfTotal + fuel
 * @param {string} params.cpeCodeBase - Cod CPE original (se adaugă sufix -EST)
 * @param {string} params.filename
 * @returns {Promise<{size, filename}>}
 */
export async function exportCpePostRehabPDF(params = {}) {
  const {
    building = {},
    auditor = {},
    rehabComparison = null,
    rehabScenarioInputs = null,
    opaqueElements = [],
    glazingElements = [],
    REHAB_COSTS = {},
    instSummary = null,
    cpeCodeBase = null,
    filename,
  } = params;

  if (!rehabComparison) {
    throw new Error("Lipsește scenariul de reabilitare. Configurează măsurile în Pasul 5.");
  }

  // Sprint Pas 7 docs (6 mai 2026) P0-1 — injectăm helper-ul canonic.
  // buildMeasuresList devine adaptor peste buildCanonicalMeasures (sursa unică).
  const { buildCanonicalMeasures, buildFinancialSummary } = await import("../calc/unified-rehab-costs.js");
  buildMeasuresList._canonical = (inputs, opaque, glazing) =>
    buildCanonicalMeasures(inputs, opaque, glazing);

  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (typeof doc.autoTable !== "function" && typeof autoTableFn === "function") {
    doc.autoTable = function (opts) {
      const r = autoTableFn(doc, opts);
      if (!doc.lastAutoTable && r) doc.lastAutoTable = r;
      return doc.lastAutoTable;
    };
  }

  // Setup font diacritice RO
  let normFn = (t) => t;
  try {
    const { setupRomanianFont, normalizeForPdf, ROMANIAN_FONT } = await import("../utils/pdf-fonts.js");
    const fontOk = await setupRomanianFont(doc);
    normFn = (t) => typeof t === "string" ? normalizeForPdf(t, fontOk) : t;
    const origText = doc.text.bind(doc);
    doc.text = (text, ...args) => origText(
      Array.isArray(text) ? text.map(normFn) : normFn(text), ...args
    );
    if (typeof doc.autoTable === "function" && fontOk) {
      const origAt = doc.autoTable.bind(doc);
      const normCell = (cell) => {
        if (typeof cell === "string") return normFn(cell);
        if (cell && typeof cell === "object" && typeof cell.content === "string") {
          return { ...cell, content: normFn(cell.content) };
        }
        return cell;
      };
      const normRow = (row) => Array.isArray(row) ? row.map(normCell) : row;
      doc.autoTable = (opts) => {
        const merged = { ...(opts || {}) };
        const inject = (existing) => ({ font: ROMANIAN_FONT, ...(existing || {}) });
        merged.styles = inject(merged.styles);
        merged.headStyles = inject(merged.headStyles);
        merged.bodyStyles = inject(merged.bodyStyles);
        if (Array.isArray(merged.body)) merged.body = merged.body.map(normRow);
        if (Array.isArray(merged.head)) merged.head = merged.head.map(normRow);
        return origAt(merged);
      };
    }
  } catch (_) { /* fallback Helvetica + ASCII */ }

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ── 1. HEADER amber „ESTIMAT POST-REABILITARE" ──
  doc.setFillColor(180, 83, 9); // amber-700
  doc.rect(0, 0, w, 30, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CPE ESTIMAT — POST-REABILITARE", w / 2, 12, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(8);
  doc.setTextColor(254, 243, 199);
  doc.text("Document orientativ — NU înlocuiește CPE oficial emis după lucrări", w / 2, 18, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(254, 215, 170);
  const cpeEstCode = cpeCodeBase ? `${cpeCodeBase}-EST` : `EST-${new Date().toISOString().slice(0, 10)}`;
  doc.text(`Cod orientativ: ${cpeEstCode} · Generat la: ${new Date().toLocaleDateString("ro-RO")}`, w / 2, 24, { align: "center" });

  let y = 38;

  // ── 2. IDENTIFICARE CLĂDIRE ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(180, 83, 9);
  doc.text("1. Identificare clădire", 14, y);
  y += 2;
  doc.setDrawColor(180, 83, 9); doc.setLineWidth(0.4);
  doc.line(14, y, w - 14, y); y += 4;

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    body: [
      ["Adresă", building?.address || "—"],
      ["Categorie funcțională", building?.category || "—"],
      ["Suprafață utilă", `${building?.areaUseful || "—"} m²`],
      ["An construcție", String(building?.yearBuilt || "—")],
      ["Nr. cadastral", building?.cadastralNumber || "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 3. COMPARAȚIE EP/CLASĂ ACTUAL vs. POST-REABILITARE ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(180, 83, 9);
  doc.text("2. Performanță energetică — comparație", 14, y);
  y += 2;
  doc.line(14, y, w - 14, y); y += 6;

  const orig = rehabComparison.original;
  const reh = rehabComparison.rehab;
  const origCls = String(orig?.cls?.cls || orig?.cls || "—");
  const rehCls = String(reh?.cls?.cls || reh?.cls || "—");

  // Badge ACTUAL (stânga)
  drawClassBadge(doc, 14, y, 26, 22, origCls, "ACTUAL");
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`EP: ${fmt(orig?.ep || 0, 1)} kWh/(m²·an)`, 44, y + 8);
  doc.text(`CO₂: ${fmt(orig?.co2 || 0, 1)} kg/(m²·an)`, 44, y + 14);
  doc.setFontSize(7); doc.setTextColor(120, 120, 120);
  doc.text("Bilanț Mc 001-2022 stare existentă", 44, y + 19);

  // Săgeată
  doc.setFont(undefined, "bold"); doc.setFontSize(20); doc.setTextColor(180, 83, 9);
  doc.text("→", w / 2 - 5, y + 14);

  // Badge POST-REHAB (dreapta)
  drawClassBadge(doc, w - 40, y, 26, 22, rehCls, "POST-REHAB");
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const rightTxtX = w / 2 + 8;
  doc.text(`EP: ${fmt(reh?.ep || 0, 1)} kWh/(m²·an)`, rightTxtX, y + 8);
  doc.text(`CO₂: ${fmt(reh?.co2 || 0, 1)} kg/(m²·an)`, rightTxtX, y + 14);
  doc.setFontSize(7); doc.setTextColor(120, 120, 120);
  doc.text("Estimat după implementare scenariu", rightTxtX, y + 19);
  y += 30;

  // ── Scală A-G vizuală cu markeri ACTUAL + ESTIMAT (ca CPE oficial) ──
  doc.setFont(undefined, "bold");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Scala energetică A-G", w / 2, y, { align: "center" });
  y += 8; // spațiu pentru marker ESTIMAT (sus)
  drawEnergyScale(doc, 24, y, w - 48, 7, origCls, rehCls);
  y += 18; // spațiu jos pentru marker ACTUAL + etichetă

  // ── 4. REDUCERE consum + emisii ──
  const sav = rehabComparison.savings || {};
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(180, 83, 9);
  doc.text("3. Reducere estimată", 14, y);
  y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  const epReductionAbs = (orig?.ep || 0) - (reh?.ep || 0);
  const co2ReductionAbs = (orig?.co2 || 0) - (reh?.co2 || 0);
  const Au = parseFloat(building?.areaUseful) || 0;
  const annualKwhSaved = sav.qfSaved || 0;
  const co2TotalSavedKg = co2ReductionAbs * Au;

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "striped",
    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: "bold" },
      1: { cellWidth: 50, halign: "right" },
      2: { halign: "right" },
    },
    head: [["Indicator", "Valoare", "Reducere"]],
    body: [
      ["EP primar (kWh/m²·an)", `${fmt(orig?.ep, 1)} → ${fmt(reh?.ep, 1)}`, `−${fmt(epReductionAbs, 1)} (${fmt(sav.epPct, 1)}%)`],
      ["Emisii CO₂ (kg/m²·an)", `${fmt(orig?.co2, 1)} → ${fmt(reh?.co2, 1)}`, `−${fmt(co2ReductionAbs, 1)} (${fmt(sav.co2Pct, 1)}%)`],
      ["Energie finală anuală totală (kWh)", `${fmt(annualKwhSaved, 0)} salvați/an`, `${fmt(co2TotalSavedKg, 0)} kg CO₂/an`],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 5. MĂSURI INCLUSE ──
  const measures = buildMeasuresList(rehabScenarioInputs, opaqueElements, glazingElements, REHAB_COSTS);
  if (measures.length > 0) {
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(180, 83, 9);
    doc.text("4. Măsuri incluse în scenariu", 14, y);
    y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    const totalCost = measures.reduce((s, m) => s + (m.cost || 0), 0);
    const fuelId = instSummary?.fuel?.id || "gaz";
    const annualSavingRON = estimateAnnualEnergyCostRON(annualKwhSaved, fuelId);
    const paybackYears = annualSavingRON > 0 ? totalCost / annualSavingRON : 0;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 35, halign: "right" },
      },
      head: [["#", "Măsură", "Cost estimat (RON)"]],
      body: measures.map((m, idx) => [
        String(idx + 1),
        m.label + (m.area ? ` · ${fmt(m.area, 0)} ${m.unit || "m²"}` : ""),
        m.cost ? fmt(m.cost, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "—",
      ]),
      foot: [["", "TOTAL ESTIMAT", fmt(totalCost, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")]],
      footStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: "bold", fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 6;

    // Sumar financiar
    doc.setFont(undefined, "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    const lines = [
      `Cost total estimat: ${fmt(totalCost, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")} RON (fără TVA, fără proiectare/avize)`,
      `Economie anuală estimată: ~${fmt(annualSavingRON, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")} RON/an (preț energie 2025)`,
      `Perioadă de recuperare simplă: ${paybackYears > 0 && paybackYears < 100 ? fmt(paybackYears, 1) + " ani" : "—"}`,
    ];
    lines.forEach((line) => { doc.text(line, 14, y); y += 5; });
    y += 3;
  }

  // ── 6. AUDITOR ──
  if (auditor?.name || auditor?.atestat) {
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(180, 83, 9);
    doc.text("5. Auditor energetic", 14, y);
    y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Auditor", auditor?.name || "—"],
        ["Atestat MDLPA", `${auditor?.atestat || "—"} / ${auditor?.grade || "AE Ici"}`],
        ["Firmă / PFA", auditor?.company || auditor?.firma || "—"],
      ],
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // ── WATERMARK diagonal central ──
  drawWatermark(doc, w, h);

  // ── FOOTER disclaimer ──
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.line(14, h - 18, w - 14, h - 18);
  doc.setFont(undefined, "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
  doc.text(
    "Document orientativ — bazat pe scenariul de reabilitare configurat în Pasul 5. Performanța reală post-reabilitare se",
    14, h - 13
  );
  doc.text(
    "atestă prin CPE oficial emis după realizarea lucrărilor (Legea 372/2005, Mc 001-2022, Ord. MDLPA 348/2026).",
    14, h - 9
  );
  doc.setFont(undefined, "normal"); doc.setFontSize(7);
  doc.text(`Zephren · ${new Date().getFullYear()}`, w - 14, h - 9, { align: "right" });

  const blob = doc.output("blob");
  return triggerDownload(blob, filename || defaultFilename(building));
}

// Export helpers for testing
export const _internals = {
  buildMeasuresList,
  estimateAnnualEnergyCostRON,
  CLASS_COLORS_RGB,
  FUEL_PRICE_RON_KWH,
};
