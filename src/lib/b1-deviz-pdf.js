/**
 * b1-deviz-pdf.js — Generator B1 Deviz Estimativ Reabilitare (PDF A4)
 *
 * Sprint Visual-6 (8 mai 2026) — refactor extract + brand kit + chart-uri
 *
 * Anterior: cod inline 50 LOC în Step8Advanced.jsx (export PDF onClick handler)
 * cu fillColor amber `[79, 70, 229]` indigo + watermark text simplu pentru Free.
 *
 * Acum:
 *   • Cover page brand cu logo Zephren + 3 KPI box (total fără TVA / cu TVA / EUR/m²)
 *   • Bar chart vertical cost per categorie (anvelopă/ferestre/HVAC/regenerabile)
 *   • Tabel detaliat lucrări cu header SLATE_900 + zebra rows SLATE_50
 *   • Footer brand cu QR cod verificare integritate (Sprint V-QR)
 *   • Watermark "ORIENTATIV ZEPHREN FREE" doar pentru plan Free
 *
 * Bază legală: Mc 001-2022 + EPBD 2024/1275 + PNRR C5 + Casa Verde Plus
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
import {
  BRAND_COLORS,
  FONT_SIZES,
  A4,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  formatRomanianNumber,
  formatMoney,           // Sprint P4.4-bis (15 mai 2026) — currency toggle
  buildBrandMetadata,
} from "./pdf-brand-kit.js";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderCoverPage,
  renderSectionHeader,
  renderSignatureBox,
  renderWatermark,
  renderQrCode,
  buildVerifyUrl,
} from "./pdf-brand-layout.js";
import { renderBarChart } from "./pdf-brand-charts.js";

/**
 * Categorizare item-uri deviz pe 4 grupe pentru bar chart cost per categorie.
 */
function categorizeItems(items) {
  const cats = {
    "Anvelopă opacă": 0,
    "Tâmplărie": 0,
    "Sisteme HVAC": 0,
    "Regenerabile": 0,
    "Altele": 0,
  };
  (items || []).forEach(item => {
    const lbl = String(item.label || "").toLowerCase();
    const val = item.totalEUR || 0;
    if (/peret|izolat|terasa|acoperis|planseu|fundatie|anvelopa|etics/i.test(lbl)) {
      cats["Anvelopă opacă"] += val;
    } else if (/tamplar|fereastra|usa|geam|profil|low-e/i.test(lbl)) {
      cats["Tâmplărie"] += val;
    } else if (/pompa|caldur|hp|boiler|cazan|vmc|ventilare|recuperare|hvac/i.test(lbl)) {
      cats["Sisteme HVAC"] += val;
    } else if (/pv|fotovoltaic|solar|panou|invertor|regenerabil/i.test(lbl)) {
      cats["Regenerabile"] += val;
    } else {
      cats["Altele"] += val;
    }
  });
  return cats;
}

/**
 * Generează B1 Deviz Estimativ Reabilitare ca PDF Blob.
 *
 * @param {object} args
 * @param {object} args.devizResult — { items, totalEUR, totalRON, costPerM2, funding }
 * @param {object} args.building — date clădire (address, areaUseful, etc.)
 * @param {object} [args.auditor] — date auditor
 * @param {string} [args.userPlan] — pentru watermark FREE
 * @param {boolean} [args.hasAccess=true] — dacă plan permite export fără watermark
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateB1DevizPdf({
  devizResult,
  building = {},
  auditor = {},
  userPlan = "free",
  hasAccess = true,
  download = true,
} = {}) {
  if (!devizResult) throw new Error("[B1Deviz] Lipsă devizResult — configurați lucrările în Step 8.");

  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // jspdf-autotable v5 — attach manual la instanță
  if (typeof doc.autoTable !== "function" && typeof autoTableFn === "function") {
    doc.autoTable = function (opts) {
      const r = autoTableFn(doc, opts);
      if (!doc.lastAutoTable && r) doc.lastAutoTable = r;
      return doc.lastAutoTable;
    };
  }

  // Setup font diacritice RO
  const fontOk = await setupRomanianFont(doc);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const writeText = makeTextWriter(doc, fontOk);

  // Brand metadata
  const dateNow = new Date();
  const Au = building?.areaUseful || 0;
  const subtotalEUR = devizResult.totalEUR || 0;
  const tvaEUR = subtotalEUR * 0.21; // Romania post 1.VIII.2025 TVA 21% (OUG 50/2025)
  const totalCuTvaEUR = subtotalEUR + tvaEUR;

  const brandMeta = buildBrandMetadata({
    title: "B1 Deviz Estimativ Reabilitare",
    cpeCode: building?.cpeCode || `DEV-${formatRomanianDate(dateNow, "iso")}`,
    building: {
      address: building?.address,
      category: building?.category,
      areaUseful: Au,
      year: building?.yearBuilt,
      cadastral: building?.cadastralNumber,
    },
    auditor: {
      name: auditor?.name,
      atestat: auditor?.atestat,
      grade: auditor?.grade || "AE Ici",
      firm: auditor?.company || auditor?.firm,
    },
    date: dateNow,
    docType: "b1-deviz",
    version: "v4.0",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGINA 1 — COVER PAGE cu 3 KPI
  // ═══════════════════════════════════════════════════════════════════════

  await renderCoverPage(doc, brandMeta, {
    subtitle: `Costuri orientative 2025-2026 · PNRR C5 + Casa Verde Plus`,
    kpis: [
      {
        value: formatRomanianNumber(subtotalEUR, 0),
        unit: "EUR",
        label: "Subtotal fără TVA",
        color: BRAND_COLORS.PRIMARY,
      },
      {
        value: formatRomanianNumber(totalCuTvaEUR, 0),
        unit: "EUR",
        label: "Total cu TVA 21%",
        color: BRAND_COLORS.PRIMARY_DARK,
      },
      {
        value: Au > 0 ? `${formatRomanianNumber(subtotalEUR / Au, 0)}` : "—",
        unit: "€/m²",
        label: "Cost specific Au",
        color: BRAND_COLORS.INFO,
      },
    ],
    disclaimer: "Costuri orientative ±30% pentru perioada 2025-2026 — fără TVA actualizat. Devizul nu include lucrări conexe (relocare instalații, refacere finisaje, demolări parțiale, organizare șantier). Pentru implementare se recomandă obținerea a minim 3 oferte ferme de la executanți autorizați conform legii. Eligibil PNRR C5 (Valul renovării) + Casa Verde Plus + PNRT 2026.",
  });

  // Watermark FREE pe cover
  if (!hasAccess) {
    renderWatermark(doc, "ORIENTATIV ZEPHREN FREE", { opacity: 0.10 });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGINA 2 — DETALIU TEHNIC cu bar chart + tabel
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  applyBrandHeader(doc, brandMeta);
  let y = A4.MARGIN_TOP + 4;

  // ── Sec. 1 — Identificare clădire ──
  y = renderSectionHeader(doc, "1. Identificare clădire", y);
  doc.autoTable({
    startY: y,
    margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.SLATE_900, textColor: BRAND_COLORS.WHITE, fontStyle: "bold", fontSize: FONT_SIZES.TABLE_HEADER },
    bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY, font: fontOk ? ROMANIAN_FONT : "helvetica" },
    alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    body: [
      ["Adresă", building?.address || "—"],
      ["Suprafață utilă", `${Au || "—"} m²`],
      ["Categorie funcțională", building?.category || "—"],
      ["An construcție", String(building?.yearBuilt || "—")],
      ["Auditor energetic", `${auditor?.name || "—"} (atestat ${auditor?.atestat || "—"})`],
      ["Data devizului", brandMeta.dateText],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── Sec. 2 — Bar chart cost per categorie (Sprint V-B1)
  y = renderSectionHeader(doc, "2. Distribuție cost pe categorie de lucrări", y);
  const categories = categorizeItems(devizResult.items);
  const barData = Object.entries(categories)
    .filter(([, v]) => v > 0)
    .map(([label, value], idx) => ({
      label,
      value,
      color: [
        BRAND_COLORS.PRIMARY,        // Anvelopă opacă
        BRAND_COLORS.INFO,           // Tâmplărie
        BRAND_COLORS.WARNING,        // HVAC
        BRAND_COLORS.SUCCESS,        // Regenerabile
        BRAND_COLORS.SLATE_500,      // Altele
      ][idx % 5],
    }));

  if (barData.length > 0) {
    renderBarChart(doc, A4.MARGIN_LEFT, y, A4.CONTENT_WIDTH, 50, {
      data: barData,
      orientation: "horizontal",
      unit: "EUR (fără TVA)",
      showValues: true,
      showGrid: true,
    });
    y += 54;
  }

  // ── Sec. 3 — Tabel detaliat lucrări ──
  if (y > A4.HEIGHT - 80) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, "3. Tabel detaliat lucrări", y);

  const rows = (devizResult.items || []).map((item, i) => [
    String(i + 1),
    item.label || "—",
    item.unit || "—",
    item.qty != null ? String(item.qty) : "—",
    item.priceUnit != null ? formatRomanianNumber(item.priceUnit, 0) : "—",
    item.totalEUR != null ? formatRomanianNumber(item.totalEUR, 0) : "—",
  ]);

  doc.autoTable({
    head: [["Nr.", "Descriere lucrare", "UM", "Cantitate", "P.U. EUR", "Valoare EUR"]],
    body: rows,
    foot: [["", "", "", "", "Subtotal (fără TVA) EUR:", formatRomanianNumber(subtotalEUR, 0)]],
    startY: y,
    margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
    theme: "grid",
    styles: { fontSize: FONT_SIZES.TABLE_BODY, font: fontOk ? ROMANIAN_FONT : "helvetica" },
    headStyles: { fillColor: BRAND_COLORS.SLATE_900, textColor: BRAND_COLORS.WHITE, fontStyle: "bold", fontSize: FONT_SIZES.TABLE_HEADER },
    bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY },
    alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
    footStyles: { fillColor: BRAND_COLORS.PRIMARY_FAINT, textColor: BRAND_COLORS.PRIMARY_DARK, fontStyle: "bold", fontSize: FONT_SIZES.TABLE_HEADER },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 28 },
    },
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Sec. 4 — Sumar financiar ──
  if (y > A4.HEIGHT - 70) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, "4. Sumar financiar", y);

  doc.autoTable({
    startY: y,
    margin: { left: A4.MARGIN_LEFT, right: A4.MARGIN_RIGHT },
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.SLATE_900, textColor: BRAND_COLORS.WHITE, fontStyle: "bold", fontSize: FONT_SIZES.TABLE_HEADER },
    bodyStyles: { fontSize: FONT_SIZES.TABLE_BODY, font: fontOk ? ROMANIAN_FONT : "helvetica" },
    alternateRowStyles: { fillColor: BRAND_COLORS.SLATE_50 },
    columnStyles: { 0: { cellWidth: 90, fontStyle: "bold" }, 1: { halign: "right" } },
    // Sprint P4.4-bis — formatMoney respectă currency toggle global (Auto/EUR/RON)
    // Sumele native sunt în EUR; conversia EUR↔RON folosește curs live BNR (5.10 fallback).
    body: [
      ["Subtotal (fără TVA)", formatMoney(subtotalEUR, "EUR", { decimals: 0 })],
      ["TVA 21% (Codul Fiscal RO post 1.VIII.2025)", formatMoney(tvaEUR, "EUR", { decimals: 0 })],
      ["TOTAL cu TVA", formatMoney(totalCuTvaEUR, "EUR", { decimals: 0 })],
      ["Cost specific suprafață utilă", Au > 0 ? `${formatMoney(subtotalEUR / Au, "EUR", { decimals: 0 })}/m²` : "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // ── Sec. 5 — Note importante ──
  if (y > A4.HEIGHT - 80) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, "5. Note importante", y);

  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const notes = [
    "• Prețurile sunt estimative pentru perioada 2025-2026 și pot varia ±30% în funcție de zonă, furnizor și complexitatea lucrărilor.",
    "• Devizul nu include lucrări conexe: relocare instalații, refacere finisaje interioare/exterioare, demolări parțiale, organizare șantier.",
    "• Pentru implementare se recomandă obținerea a minim 3 oferte ferme de la executanți autorizați conform legii.",
    "• Eligibil pentru programe de finanțare: PNRR Componenta C5 (Valul renovării), Casa Verde Plus, PNRT 2026, fonduri europene 2021-2027.",
    "• Termenul de recuperare nu include eventuale subvenții/granturi care îl pot reduce semnificativ (până la 50-100% din valoare).",
    "• Standardele tehnice aplicabile: SR EN 13499/13500 (ETICS), SR EN ISO 13788 (transfer umiditate), SR EN 12086 (bariere de vapori), SR EN ISO 6946 (rezistență termică), SR EN 14351-1 (tâmplărie), SR EN 61215 (PV cristaline), SR EN 12975 (colectoare solare termice).",
  ];
  notes.forEach(note => {
    const lines = doc.splitTextToSize(note, A4.CONTENT_WIDTH);
    doc.text(lines, A4.MARGIN_LEFT, y);
    y += lines.length * 4;
  });
  y += 4;

  // ── Sec. 6 — Auditor + box semnătură ──
  if (auditor?.name || auditor?.atestat) {
    if (y > A4.HEIGHT - 60) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 4;
    }
    y = renderSectionHeader(doc, "6. Auditor energetic", y);

    renderSignatureBox(doc, A4.MARGIN_LEFT, y, {
      label: "AUDITOR ENERGETIC",
      name: auditor.name,
      atestat: `${auditor.atestat || "—"} / ${auditor.grade || "AE Ici"}`,
      date: brandMeta.dateText,
      width: 80,
      height: 35,
    });
    if (auditor.company || auditor.firma) {
      renderSignatureBox(doc, A4.WIDTH - A4.MARGIN_RIGHT - 80, y, {
        label: "ȘTAMPILĂ FIRMĂ",
        name: auditor.company || auditor.firma,
        atestat: "",
        date: "",
        width: 80,
        height: 35,
      });
    }
    y += 38;
  }

  // ── QR cod pentru verificare integritate (footer ultima pagină) ──
  const verifyUrl = buildVerifyUrl(brandMeta);
  const lastPageY = A4.HEIGHT - 35;
  await renderQrCode(doc, verifyUrl, {
    x: A4.WIDTH - A4.MARGIN_RIGHT - 18,
    y: lastPageY - 15,
    size: 18,
    label: "Verifică online",
  });

  // ── Watermark FREE ──
  if (!hasAccess) {
    renderWatermark(doc, "ORIENTATIV ZEPHREN FREE", { opacity: 0.06 });
  }

  // ── Footer brand pe TOATE paginile ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    applyBrandFooter(doc, brandMeta, i, totalPages, {
      legalText: "Costuri orientative ±30% · Mc 001-2022 · EPBD 2024/1275 · PNRR C5 · Casa Verde Plus",
    });
  }

  const blob = doc.output("blob");
  if (download) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = String(building?.address || "cladire")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40);
    a.download = `B1_Deviz_${slug}_${formatRomanianDate(dateNow, "iso")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return blob;
}

export default generateB1DevizPdf;
