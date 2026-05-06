/**
 * zeb-study-pdf.js — Studiu ZEB (Zero Emission Building) post-2030 EPBD 2024.
 *
 * Sprint Conformitate P3-01 (7 mai 2026).
 *
 * Conform Art. 9 alin. 1 EPBD 2024/1275:
 *   - Post 1.I.2030: clădiri publice noi → ZEB obligatoriu
 *   - Post 1.I.2033: toate clădirile noi → ZEB obligatoriu
 *
 * ZEB e mai strict decât nZEB:
 *   - EP_nren = 0 (sau aproape 0) — interzis fossil fuels onsite
 *   - RER ≥ 70% (vs ~30% nZEB)
 *   - Producție onsite + grid sau district heating regenerabil
 *
 * Folosește ZEB_THRESHOLDS din u-reference.js (existing).
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";

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
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont(baseFont, "bold"); doc.setFontSize(15);
  writeText("STUDIU ZEB (Zero Emission Building)", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Conform Art. 9 alin. 1 EPBD 2024/1275 — clădiri publice noi 1.I.2030, toate noi 1.I.2033",
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // 1. Verificare conformitate
  const compliance = checkZebCompliance({
    category: building.category,
    epPrimary: energy.epPrimary,
    epNren: energy.epNren,
    rer: energy.rer,
  });

  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. VERIFICARE CONFORMITATE ZEB", M, y); y += 7;

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
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. PRAGURI ZEB CATEGORIA " + (building.category || "—"), M, y); y += 7;

  doc.setFillColor(35, 41, 70);
  doc.rect(M, y, pageW - 2 * M, 7, "F");
  doc.setTextColor(251, 191, 36);
  doc.setFont(baseFont, "bold"); doc.setFontSize(9);
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
  if (y > 230) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("3. COMPARAȚIE SCENARII (curent / nZEB / ZEB)", M, y); y += 7;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
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
  if (y > 240) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("4. RECOMANDĂRI TEHNICE PENTRU ZEB", M, y); y += 7;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
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
    if (y > 270) { doc.addPage(); y = 22; }
    writeText(r, M, y); y += 4.5;
  });

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 285, pageW - M, 285);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P3-01. " +
    "Bază: Art. 9 EPBD 2024/1275 + L. 238/2024 + Mc 001-2022.",
    M, 290, { maxWidth: pageW - 2 * M });

  const fname = `Studiu_ZEB_${_safeSlug(building.address || "cladire")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
