/**
 * cpe-post-rehab-pdf.js — Generator CPE estimat post-reabilitare (PDF A4)
 *
 * Sprint Pas 7 docs (6 mai 2026) + Sprint Visual-1 (8 mai 2026)
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
 * Layout (Sprint Visual-1 — 2 pagini A4 portret):
 *   PAG 1 (cover):
 *     • Logo Zephren full + titlu + sub-titlu cu watermark "ESTIMAT"
 *     • Identificare clădire + auditor
 *     • 3 KPI box-uri: clasa actuală → estimată / reducere EP% / payback ani
 *     • Disclaimer + bază legală
 *   PAG 2 (detaliu):
 *     • Header brand repetat + footer cu Pag X/Y
 *     • Comparație EP/CO₂ + scala A-G îmbunătățită cu prag nZEB
 *     • Reducere estimată (tabel)
 *     • Măsuri incluse + sumar financiar
 *     • Box semnătură + ștampilă auditor
 */

import {
  BRAND_COLORS,
  ENERGY_CLASS_COLORS,
  FONT_SIZES,
  A4,
  SPACING,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  formatRomanianNumber,
  formatRON,
  buildBrandMetadata,
} from "./pdf-brand-kit.js";

import {
  applyBrandHeader,
  applyBrandFooter,
  renderCoverPage,
  renderEnergyClassBar,
  renderSectionHeader,
  renderWatermark,
  renderSignatureBox,
} from "./pdf-brand-layout.js";

import {
  renderBarChart,
  renderPieChart,
} from "./pdf-brand-charts.js";

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
    download = true,
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

  // ─── Sprint Visual-1: build brand metadata pentru header/footer/cover ───
  const cpeEstCode = cpeCodeBase ? `${cpeCodeBase}-EST` : `EST-${new Date().toISOString().slice(0, 10)}`;
  const brandMeta = buildBrandMetadata({
    title: "CPE Estimat — Post-Reabilitare",
    cpeCode: cpeEstCode,
    building: {
      address: building?.address,
      category: building?.category,
      areaUseful: building?.areaUseful,
      year: building?.yearBuilt,
      cadastral: building?.cadastralNumber,
    },
    auditor: {
      name: auditor?.name,
      atestat: auditor?.atestat,
      grade: auditor?.grade || "AE Ici",
      firm: auditor?.company || auditor?.firma,
    },
    docType: "cpe-post-rehab",
    version: "v4.0",
  });

  // ─── Pre-calcul savings + cost pentru KPI box-uri cover ───
  const orig = rehabComparison.original;
  const reh = rehabComparison.rehab;
  const sav = rehabComparison.savings || {};
  const origCls = String(orig?.cls?.cls || orig?.cls || "—");
  const rehCls = String(reh?.cls?.cls || reh?.cls || "—");
  // Sprint 8 mai 2026 — Filtru măsuri cu cost 0 RON (ex: planșeu superior pentru
  // apartament etaj inferior). Audit 8 mai 2026 raportă că măsuri inactive apar
  // în tabel cu cost "—" și aglomerează lista. Excludem cele cu cost <= 0 ȘI
  // qty <= 0 (păstrăm cele cu 0 cost dar qty>0 pentru transparență — ex: lucrări
  // gratuite incluse în pachet).
  const measuresAll = buildMeasuresList(rehabScenarioInputs, opaqueElements, glazingElements, REHAB_COSTS);
  const measures = measuresAll.filter(m => (m.cost || 0) > 0 || (m.area || 0) > 0);
  const totalCost = measures.reduce((s, m) => s + (m.cost || 0), 0);
  const annualKwhSaved = sav.qfSaved || 0;
  const fuelId = instSummary?.fuel?.id || "gaz";
  const annualSavingRON = estimateAnnualEnergyCostRON(annualKwhSaved, fuelId);
  const paybackYears = annualSavingRON > 0 ? totalCost / annualSavingRON : 0;

  // ═══════════════════════════════════════════════════════════════════════
  // PAGINA 1 — COVER PAGE (brand kit unitar)
  // ═══════════════════════════════════════════════════════════════════════

  renderCoverPage(doc, brandMeta, {
    // Sprint 8 mai 2026 — Săgeata "→" U+2192 nu e în Liberation Sans;
    // SYMBOL_MAP convertește în "->" — folosim direct ASCII pentru consistență.
    subtitle: `Document orientativ · ${rehCls} estimată · reducere EP ${formatRomanianNumber(sav.epPct || 0, 1)}%`,
    kpis: [
      {
        value: `${origCls} -> ${rehCls}`,
        label: "Clasa energetică",
        color: ENERGY_CLASS_COLORS[rehCls] || BRAND_COLORS.PRIMARY,
      },
      {
        value: `${formatRomanianNumber(sav.epPct || 0, 1)}%`,
        label: "Reducere EP primar",
        color: BRAND_COLORS.SUCCESS,
      },
      {
        value: paybackYears > 0 && paybackYears < 100 ? `${formatRomanianNumber(paybackYears, 1)} ani` : "—",
        label: "Recuperare simplă",
        color: BRAND_COLORS.PRIMARY,
      },
    ],
    disclaimer: "Document orientativ generat pentru informare — NU înlocuiește CPE oficial emis după realizarea lucrărilor (Legea 372/2005, Mc 001-2022, Ord. MDLPA 348/2026). Performanța reală post-reabilitare se atestă prin CPE oficial înregistrat la portalul MDLPA.",
  });

  // Sprint 8 mai 2026 — Watermark cover ELIMINAT.
  // Motiv audit 8 mai 2026: watermark "ESTIMAT" la centrul paginii se suprapune
  // cu titlul "CPE ESTIMAT — POST-REABILITARE" care deja conține cuvântul
  // ESTIMAT. Dublarea creează vizual confuz. Watermark rămâne pe pag. 2 detaliu.

  // ═══════════════════════════════════════════════════════════════════════
  // PAGINA 2 — DETALIU TEHNIC
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  applyBrandHeader(doc, brandMeta);

  let y = A4.MARGIN_TOP + 4;

  // ── 1. IDENTIFICARE CLĂDIRE ──
  y = renderSectionHeader(doc, "1. Identificare clădire", y);

  doc.autoTable({
    startY: y,
    margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.SLATE_900,
      textColor: BRAND_COLORS.WHITE,
      fontStyle: "bold",
      fontSize: FONT_SIZES.TABLE_HEADER,
    },
    bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY },
    alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    body: [
      ["Adresă", building?.address || "—"],
      ["Categorie funcțională", building?.category || "—"],
      ["Suprafață utilă", `${building?.areaUseful || "—"} m²`],
      ["An construcție", String(building?.yearBuilt || "—")],
      ["Nr. cadastral", building?.cadastralNumber || "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + SPACING.LG;

  // ── 2. PERFORMANȚĂ ENERGETICĂ — comparație ──
  y = renderSectionHeader(doc, "2. Performanță energetică — comparație", y);

  // Badge ACTUAL (stânga)
  drawClassBadge(doc, A4.MARGIN_LEFT, y, 26, 22, origCls, "ACTUAL");
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  doc.text(`EP: ${fmt(orig?.ep || 0, 1)} kWh/(m²·an)`, A4.MARGIN_LEFT + 30, y + 8);
  doc.text(`CO₂: ${fmt(orig?.co2 || 0, 1)} kg/(m²·an)`, A4.MARGIN_LEFT + 30, y + 14);
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  doc.text("Bilanț Mc 001-2022 stare existentă", A4.MARGIN_LEFT + 30, y + 19);

  // Săgeată centrală — Liberation Sans nu conține → (U+2192), folosim ASCII
  // (SYMBOL_MAP convertește auto, dar explicit aici pentru claritate).
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.H1);
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "text");
  doc.text("->", w / 2 - 5, y + 14);

  // Badge POST-REHAB (dreapta)
  drawClassBadge(doc, w - 40, y, 26, 22, rehCls, "POST-REHAB");
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const rightTxtX = w / 2 + 8;
  doc.text(`EP: ${fmt(reh?.ep || 0, 1)} kWh/(m²·an)`, rightTxtX, y + 8);
  doc.text(`CO₂: ${fmt(reh?.co2 || 0, 1)} kg/(m²·an)`, rightTxtX, y + 14);
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  doc.text("Estimat după implementare scenariu", rightTxtX, y + 19);
  y += 30;

  // ── Scala A-G îmbunătățită cu markeri ACTUAL + ESTIMAT + prag nZEB ──
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  doc.text("Scala energetică A-G (cu prag nZEB orientativ)", w / 2, y, { align: "center" });
  y += 10; // spațiu pentru marker POST-REHAB (sus)
  renderEnergyClassBar(doc, 24, y, w - 48, 8, {
    actualClass: origCls,
    actualEP: orig?.ep,
    targetClass: rehCls,
    targetEP: reh?.ep,
    thresholdClass: building?.category && /^(R|C)/.test(building.category) ? "B" : "C",
  });
  y += 22; // spațiu jos pentru marker ACTUAL + etichete

  // ── 3. REDUCERE consum + emisii ──
  y = renderSectionHeader(doc, "3. Reducere estimată", y);

  const epReductionAbs = (orig?.ep || 0) - (reh?.ep || 0);
  const co2ReductionAbs = (orig?.co2 || 0) - (reh?.co2 || 0);
  const Au = parseFloat(building?.areaUseful) || 0;
  const co2TotalSavedKg = co2ReductionAbs * Au;

  doc.autoTable({
    startY: y,
    margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
    theme: "striped",
    headStyles: {
      fillColor: BRAND_COLORS.SLATE_900,
      textColor: BRAND_COLORS.WHITE,
      fontStyle: "bold",
      fontSize: FONT_SIZES.TABLE_HEADER,
    },
    bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY },
    alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
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
  y = doc.lastAutoTable.finalY + SPACING.MD;

  // Sprint Visual-3: Bar chart vizual EP+CO₂ baseline vs post (compact 70mm înălțime)
  if (Number.isFinite(orig?.ep) && Number.isFinite(reh?.ep)) {
    renderBarChart(doc, A4.MARGIN_LEFT, y, A4.CONTENT_WIDTH, 38, {
      title: "Evoluție indicatori — baseline vs post-reabilitare",
      data: [
        { label: "EP actual", value: orig.ep, color: BRAND_COLORS.DANGER },
        { label: "EP post-rehab", value: reh.ep, color: BRAND_COLORS.SUCCESS },
        { label: "CO₂ actual", value: orig.co2, color: BRAND_COLORS.DANGER },
        { label: "CO₂ post-rehab", value: reh.co2, color: BRAND_COLORS.SUCCESS },
      ],
      orientation: "vertical",
      unit: "kWh/m²·an / kg CO₂",
      showValues: true,
      showGrid: true,
    });
    y += 38 + SPACING.LG;
  }

  // ── 4. MĂSURI INCLUSE ──
  if (measures.length > 0) {
    y = renderSectionHeader(doc, "4. Măsuri incluse în scenariu", y);

    doc.autoTable({
      startY: y,
      margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
      theme: "grid",
      headStyles: {
        fillColor: BRAND_COLORS.SLATE_900,
        textColor: BRAND_COLORS.WHITE,
        fontStyle: "bold",
        fontSize: FONT_SIZES.TABLE_HEADER,
      },
      bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY },
      alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
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
      footStyles: {
        fillColor: BRAND_COLORS.PRIMARY_FAINT,
        textColor: BRAND_COLORS.PRIMARY_DARK,
        fontStyle: "bold",
        fontSize: FONT_SIZES.TABLE_HEADER,
      },
      // Sprint 8 mai 2026 — Footer DOAR pe ultima pagină (audit raportă că
      // TOTAL ESTIMAT apărea pe pag. 2 ȘI pag. 3 când tabelul se rupe).
      showFoot: "lastPage",
    });
    y = doc.lastAutoTable.finalY + SPACING.MD;

    // Sumar financiar
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.BODY);
    setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
    const lines = [
      `Cost total estimat: ${fmt(totalCost, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")} RON (fără TVA, fără proiectare/avize)`,
      `Economie anuală estimată: ~${fmt(annualSavingRON, 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")} RON/an (preț energie 2025)`,
      `Perioadă de recuperare simplă: ${paybackYears > 0 && paybackYears < 100 ? fmt(paybackYears, 1) + " ani" : "—"}`,
    ];
    lines.forEach((line) => { doc.text(line, A4.MARGIN_LEFT, y); y += 5; });
    y += SPACING.SM;

    // Sprint Visual-3: Donut chart distribuție costuri măsuri (dacă mai e loc)
    if (measures.length >= 2 && y < A4.HEIGHT - 70) {
      const pieData = measures
        .filter(m => (m.cost || 0) > 0)
        .map(m => ({
          label: m.label.length > 20 ? m.label.slice(0, 19) + "…" : m.label,
          value: m.cost || 0,
        }));
      if (pieData.length >= 2) {
        // Pie chart pe stânga + legendă pe dreapta — folosim renderPieChart
        renderPieChart(doc, A4.MARGIN_LEFT + 25, y + 25, 22, {
          data: pieData,
          title: "Distribuție costuri pe măsură",
          donut: true,
          showLegend: true,
          showPercentages: true,
        });
        y += 60;
      }
    }
  }

  // ── 5. SEMNĂTURĂ AUDITOR ──
  if (auditor?.name || auditor?.atestat) {
    // Verifică dacă mai e spațiu pentru box semnătură (35mm) + footer (20mm)
    if (y > A4.HEIGHT - 60) {
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 4;
    }

    y = renderSectionHeader(doc, "5. Auditor energetic", y);
    renderSignatureBox(doc, A4.MARGIN_LEFT, y, {
      label: "AUDITOR ENERGETIC",
      name: auditor?.name,
      atestat: `${auditor?.atestat || "—"} / ${auditor?.grade || "AE Ici"}`,
      date: brandMeta.dateText,
      width: 80,
      height: 35,
    });
    // Box opțional dreapta — firmă/ștampilă
    if (auditor?.company || auditor?.firma) {
      renderSignatureBox(doc, A4.WIDTH - A4.MARGIN_RIGHT - 80, y, {
        label: "ȘTAMPILĂ FIRMĂ / PFA",
        name: auditor?.company || auditor?.firma,
        atestat: "",
        date: "",
        width: 80,
        height: 35,
      });
    }
    y += 38;
  }

  // ── WATERMARK pe pag 2 ──
  renderWatermark(doc, "ESTIMAT", { opacity: 0.06 });

  // ── FOOTER pag 2 (brand kit) ──
  applyBrandFooter(doc, brandMeta, 2, 2, {
    legalText: "Document orientativ — atestat prin CPE oficial post-lucrări (L. 372/2005, Mc 001-2022, Ord. MDLPA 348/2026)",
  });

  const blob = doc.output("blob");
  const fn = filename || defaultFilename(building);
  if (!download) return { blob, filename: fn };
  return triggerDownload(blob, fn);
}

// Export helpers for testing
export const _internals = {
  buildMeasuresList,
  estimateAnnualEnergyCostRON,
  CLASS_COLORS_RGB,
  FUEL_PRICE_RON_KWH,
};
