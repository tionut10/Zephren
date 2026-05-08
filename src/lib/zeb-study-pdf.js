/**
 * zeb-study-pdf.js — Studiu ZEB (Zero Emission Building) post-2030 EPBD 2024.
 *
 * Sprint Conformitate P3-01 (7 mai 2026) + Sprint Visual-6 (8 mai 2026).
 *
 * Conform Art. 9 alin. 1 EPBD 2024/1275:
 *   - Post 1.I.2030: clădiri publice noi → ZEB obligatoriu
 *   - Post 1.I.2033: toate clădirile noi → ZEB obligatoriu
 *
 * Sprint Visual-6: aplicare brand kit unitar verde Zephren (header + footer +
 * section headers + box semnătură + QR cod verificare integritate).
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
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

/**
 * Threshold-uri ZEB recomandate pentru România (în absența ordinului MDLPA explicit).
 *
 * Derivat din Art. 9 EPBD 2024/1275 + benchmark Passive House Plus + Living Building.
 */
export const ZEB_THRESHOLDS_RO = Object.freeze({
  RI: { epPrimary: 50, epNren: 5, rerMin: 0.75 },
  RC: { epPrimary: 45, epNren: 5, rerMin: 0.75 },
  RA: { epPrimary: 50, epNren: 5, rerMin: 0.75 },
  BC: { epPrimary: 80, epNren: 8, rerMin: 0.70 },
  BI: { epPrimary: 80, epNren: 8, rerMin: 0.70 },
  ED: { epPrimary: 65, epNren: 6, rerMin: 0.75 },
  SP: { epPrimary: 60, epNren: 5, rerMin: 0.75 },
  HC: { epPrimary: 100, epNren: 10, rerMin: 0.65 },
  CO: { epPrimary: 90, epNren: 8, rerMin: 0.70 },
  SA: { epPrimary: 110, epNren: 10, rerMin: 0.65 },
  AL: { epPrimary: 120, epNren: 12, rerMin: 0.60 },
});

/**
 * Verifică conformitatea ZEB pentru o clădire.
 *
 * @param {object} args
 * @param {string} args.category
 * @param {number} args.epPrimary — kWh/m²·an
 * @param {number} args.epNren — kWh/m²·an
 * @param {number} args.rer — 0..1
 * @returns {{
 *   compliant: boolean,
 *   thresholds: object,
 *   gaps: { epPrimary?, epNren?, rer? },
 *   year: 2030|2033
 * }}
 */
export function checkZebCompliance({ category, epPrimary, epNren, rer }) {
  const thresholds = ZEB_THRESHOLDS_RO[category] || ZEB_THRESHOLDS_RO.AL;
  const gaps = {};
  if (epPrimary > thresholds.epPrimary) {
    gaps.epPrimary = `EP=${fmtNum(epPrimary)} > prag ${thresholds.epPrimary}`;
  }
  if (epNren > thresholds.epNren) {
    gaps.epNren = `EP_nren=${fmtNum(epNren)} > prag ${thresholds.epNren}`;
  }
  if ((rer || 0) < thresholds.rerMin) {
    gaps.rer = `RER=${fmtNum((rer || 0) * 100, 0)}% < prag ${thresholds.rerMin * 100}%`;
  }
  const isPublic = ["BI", "ED", "SP", "HC", "AL"].includes(category);
  return {
    compliant: Object.keys(gaps).length === 0,
    thresholds,
    gaps,
    year: isPublic ? 2030 : 2033,
  };
}

/**
 * Generează studiu ZEB PDF A4.
 *
 * @param {object} args
 * @param {object} args.building
 * @param {object} args.energy — { epPrimary, epNren, rer, co2 }
 * @param {object} [args.scenarios] — { current, nzebTarget, zebTarget }
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateZebStudyPdf({
  building = {},
  energy = {},
  scenarios = {},
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = A4.MARGIN_LEFT;
  const pageW = A4.WIDTH;

  // Sprint Visual-6: brand metadata
  const brandMeta = buildBrandMetadata({
    title: "Studiu ZEB (Zero Emission Building)",
    cpeCode: building?.cpeCode || `ZEB-${formatRomanianDate(new Date(), "iso")}`,
    building: {
      address: building.address,
      category: building.category,
      areaUseful: building.areaUseful,
      year: building.yearBuilt,
      cadastral: building.cadastralNumber,
    },
    docType: "zeb-study",
    version: "v4.0",
  });

  // Header brand
  applyBrandHeader(doc, brandMeta);
  let y = A4.MARGIN_TOP + 4;

  // Antet titlu cu bară primary
  doc.setFont(baseFont, "bold"); doc.setFontSize(FONT_SIZES.TITLE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("STUDIU ZEB", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(FONT_SIZES.H3); doc.setFont(baseFont, "normal");
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("Zero Emission Building — EPBD 2024 Art. 9", pageW / 2, y, { align: "center" });
  y += 4;
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  y += 4;
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("clădiri publice noi 1.I.2030 · toate noi 1.I.2033", pageW / 2, y, { align: "center" });
  y += 8;
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");

  // 1. Verificare conformitate
  const compliance = checkZebCompliance({
    category: building.category,
    epPrimary: energy.epPrimary,
    epNren: energy.epNren,
    rer: energy.rer,
  });

  y = renderSectionHeader(doc, "1. Verificare conformitate ZEB", y);

  // Status banner
  const isCompliant = compliance.compliant;
  doc.setFillColor(...(isCompliant ? [220, 250, 220] : [255, 230, 230]));
  doc.rect(M, y, pageW - 2 * M, 18, "F");
  doc.setTextColor(...(isCompliant ? [20, 100, 20] : [180, 30, 30]));
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText(isCompliant ? "✓ CONFORM ZEB" : "✗ NECONFORM ZEB", M + 3, y + 6);
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  writeText(`Țintă obligatorie: ${compliance.year} (${compliance.year === 2030 ? "clădire publică" : "rezidențial/privat"})`,
    M + 3, y + 12);
  doc.setTextColor(0, 0, 0);
  y += 22;

  // 2. Praguri ZEB pentru categoria
  y = renderSectionHeader(doc, "2. Praguri ZEB · Categoria " + (building.category || "—"), y);

  // Header tabel custom cu brand colors (era custom slate dark + amber)
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "fill");
  doc.rect(M, y, pageW - 2 * M, 7, "F");
  setBrandColor(doc, BRAND_COLORS.WHITE, "text");
  doc.setFont(baseFont, "bold"); doc.setFontSize(FONT_SIZES.TABLE_HEADER);
  writeText("Indicator", M + 2, y + 5);
  writeText("Valoare actuală", M + 70, y + 5);
  writeText("Prag ZEB", M + 115, y + 5);
  writeText("Status", M + 150, y + 5);
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const t = compliance.thresholds;
  const checkRow = (label, value, threshold, gap) => {
    doc.setDrawColor(220, 220, 230);
    doc.line(M, y + 2, pageW - M, y + 2);
    writeText(label, M + 2, y);
    writeText(fmtNum(value), M + 70, y);
    writeText(threshold, M + 115, y);
    if (gap) {
      doc.setTextColor(180, 30, 30);
      writeText("✗", M + 150, y);
    } else {
      doc.setTextColor(20, 100, 20);
      writeText("✓", M + 150, y);
    }
    doc.setTextColor(0, 0, 0);
    y += 6;
  };
  checkRow("EP primar (kWh/m²·an)", energy.epPrimary, `≤ ${t.epPrimary}`, compliance.gaps.epPrimary);
  checkRow("EP_nren (kWh/m²·an)", energy.epNren, `≤ ${t.epNren}`, compliance.gaps.epNren);
  checkRow("RER (%)", (energy.rer || 0) * 100, `≥ ${t.rerMin * 100}%`, compliance.gaps.rer);
  y += 6;

  // 3. Comparație scenarii
  if (y > 230) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, "3. Comparație scenarii (curent / nZEB / ZEB)", y);
  doc.setFont(baseFont, "normal"); doc.setFontSize(FONT_SIZES.TABLE_BODY);
  const scLabels = ["Curent (existent)", "Țintă nZEB (Mc 001-2022)", "Țintă ZEB (EPBD 2024 Art. 9)"];
  const scKeys = ["current", "nzebTarget", "zebTarget"];
  scKeys.forEach((key, i) => {
    const sc = scenarios[key] || {};
    writeText(`${scLabels[i]}:`, M + 2, y); y += 4.5;
    writeText(`  EP=${fmtNum(sc.epPrimary)} kWh/m²a · RER=${fmtNum((sc.rer || 0) * 100, 0)}% · CO₂=${fmtNum(sc.co2)} kg/m²a`,
      M + 5, y); y += 5;
  });
  y += 4;

  // 4. Recomandări tehnice
  if (y > 240) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
    doc.addPage();
    applyBrandHeader(doc, brandMeta);
    y = A4.MARGIN_TOP + 4;
  }
  y = renderSectionHeader(doc, "4. Recomandări tehnice pentru ZEB", y);
  doc.setFont(baseFont, "normal"); doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const recommendations = isCompliant ? [
    "✓ Clădirea îndeplinește deja pragurile ZEB. Recomandăm:",
    "  • Monitorizare anuală performanță (M&V IPMVP)",
    "  • Verificare periodică sisteme regenerabile (PV, HP)",
    "  • Update calcul la modificări structurale > 10%",
  ] : [
    "Pentru a atinge ZEB, recomandăm sub-componentele:",
    "  • Anvelopă Passive House sau echivalent (U_med ≤ 0.20 W/m²K)",
    "  • Pompă căldură cu COP_seasonal ≥ 4.0 (geotermală preferat)",
    "  • Fotovoltaic on-site: 1.5-3.0 kWp / 100 m² Au",
    "  • Recuperare căldură ventilație η ≥ 80% (MVHR)",
    "  • Eliminare combustibili fosili onsite (gaz, petrol)",
    "  • Stocare termică (PCM) sau electrică (battery 5-15 kWh)",
    "  • Smart-grid conectivitate (OCPP / V2G ready)",
  ];
  recommendations.forEach(r => {
    if (y > 270) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages(), 0);
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 4;
    }
    writeText(r, M, y); y += 4.5;
  });

  // QR cod verificare integritate (footer ultima pagină)
  await renderQrCode(doc, buildVerifyUrl(brandMeta), {
    x: A4.WIDTH - A4.MARGIN_RIGHT - 18,
    y: A4.HEIGHT - 35 - 15,
    size: 18,
    label: "Verifică online",
  });

  // Footer brand toate paginile
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    applyBrandFooter(doc, brandMeta, i, totalPages, {
      legalText: "Art. 9 EPBD 2024/1275 · L. 238/2024 · Mc 001-2022 · Sprint Conformitate P3-01",
    });
  }

  const fname = `Studiu_ZEB_${_safeSlug(building.address || "cladire")}_${formatRomanianDate(new Date(), "iso")}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
