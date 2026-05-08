/**
 * pdf-brand-layout.js — Layout helpers (header + footer + cover + KPI + scale)
 *
 * Sprint Visual-1 (8 mai 2026)
 *
 * Helperii principali pentru aplicare brand kit pe documente PDF:
 *
 *   • applyBrandHeader(doc, meta, options)        — bandă antet repetată pe pagini
 *   • applyBrandFooter(doc, meta, page, total)    — bandă footer cu Pag X/Y
 *   • renderCoverPage(doc, meta, options)         — pagina 1 cover cu logo + titlu + KPI
 *   • renderKpiBox(doc, x, y, w, h, opts)         — card KPI cu valoare + label
 *   • renderEnergyClassBar(doc, x, y, w, opts)    — scala A-G îmbunătățită
 *   • renderSectionDivider(doc, y, options)       — bară primară sub titlu secțiune
 *   • renderWatermark(doc, text, options)         — watermark diagonal central
 *   • renderSignatureBox(doc, x, y, opts)         — box semnătură + ștampilă
 *
 * Toate helperii respectă constants din pdf-brand-kit.js.
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
  getEnergyClassTextColor,
} from "./pdf-brand-kit.js";

import {
  drawZephrenLogoCompact,
  drawZephrenLogoFull,
  drawZephrenLogoIcon,
} from "./pdf-brand-logo.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. HEADER REPETAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplică bandă antet brand pe pagina curentă.
 *
 * Layout (12mm înălțime):
 *   [LOGO compact] ............. [Cod CPE / Doc type] ............. [Dată]
 *   ────────────────────────────────────────────────────────────── (bară 1px)
 *
 * @param {jsPDF} doc
 * @param {object} meta — vezi buildBrandMetadata din pdf-brand-kit.js
 * @param {object} [options]
 * @param {boolean} [options.skipOnFirstPage=true] — primul page e de obicei cover (skip)
 * @param {boolean} [options.includeBar=true] — bară orizontală sub header
 */
export function applyBrandHeader(doc, meta = {}, options = {}) {
  const { includeBar = true } = options;

  // Logo compact stânga
  drawZephrenLogoCompact(doc, A4.MARGIN_LEFT, 6, 25);

  // Cod CPE centru
  if (meta.cpeCode && meta.cpeCode !== "—") {
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(`Cod: ${meta.cpeCode}`, A4.WIDTH / 2, 10, { align: "center" });
  }

  // Dată dreapta
  if (meta.dateText) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(meta.dateText, A4.WIDTH - A4.MARGIN_RIGHT, 10, { align: "right" });
  }

  // Bară orizontală sub header
  if (includeBar) {
    setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
    doc.setLineWidth(STROKE_WIDTH.MEDIUM);
    doc.line(
      A4.MARGIN_LEFT,
      A4.HEADER_HEIGHT + 4,
      A4.WIDTH - A4.MARGIN_RIGHT,
      A4.HEADER_HEIGHT + 4,
    );
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FOOTER REPETAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplică bandă footer brand pe pagina curentă.
 *
 * Layout (8mm înălțime):
 *   ────────────────────────────────────────────────────────────── (linie subțire)
 *   [Auditor + atestat] ........... [Pag X / Y] ........... [Generator + ver]
 *
 * @param {jsPDF} doc
 * @param {object} meta — vezi buildBrandMetadata
 * @param {number} pageNumber — pagina curentă (1-indexed)
 * @param {number} totalPages — total pagini document
 * @param {object} [options]
 * @param {string} [options.legalText] — text suplimentar (ex: "Document orientativ")
 */
export function applyBrandFooter(doc, meta = {}, pageNumber = 1, totalPages = 1, options = {}) {
  const { legalText } = options;
  const footerY = A4.HEIGHT - A4.MARGIN_BOTTOM + 2;

  // Linie subțire deasupra footer
  setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
  doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
  doc.line(A4.MARGIN_LEFT, footerY - 4, A4.WIDTH - A4.MARGIN_RIGHT, footerY - 4);

  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");

  // Stânga: auditor
  if (meta.auditor && meta.auditor.name && meta.auditor.name !== "—") {
    const auditorText = `${meta.auditor.name} · ${meta.auditor.atestat || "—"}`;
    doc.text(auditorText, A4.MARGIN_LEFT, footerY);
  }

  // Centru: numărul paginii
  doc.text(
    `Pag. ${pageNumber} / ${totalPages}`,
    A4.WIDTH / 2,
    footerY,
    { align: "center" },
  );

  // Dreapta: generator + versiune
  doc.text(
    meta.generator || "Zephren v4.0",
    A4.WIDTH - A4.MARGIN_RIGHT,
    footerY,
    { align: "right" },
  );

  // Linia 2 (opțional): legal text
  if (legalText) {
    doc.setFontSize(FONT_SIZES.FOOTER - 1);
    doc.text(
      legalText,
      A4.WIDTH / 2,
      footerY + 3,
      { align: "center" },
    );
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render cover page (pagina 1) cu logo mare + titlu + identificare clădire + KPI.
 *
 * Layout (A4 portret 297×210mm):
 *
 *   ┌─────────────────────────────────┐
 *   │                                 │
 *   │       [LOGO ZEPHREN FULL]       │  y: 30-65mm
 *   │                                 │
 *   │       TITLU DOCUMENT (24pt)     │  y: 80mm
 *   │       Subtitlu metadata (12pt)  │  y: 90mm
 *   │       ═══════════════ (bara)    │  y: 95mm
 *   │                                 │
 *   │  Identificare clădire:          │  y: 105mm
 *   │  • Adresă: ...                  │
 *   │  • Categorie + Au + an + cad.   │
 *   │                                 │
 *   │  Auditor:                        │  y: 145mm
 *   │  • Nume + atestat + firmă       │
 *   │                                 │
 *   │  ┌───────┐ ┌───────┐ ┌───────┐  │  y: 180-215mm
 *   │  │ KPI 1 │ │ KPI 2 │ │ KPI 3 │  │  (3 KPI box-uri)
 *   │  └───────┘ └───────┘ └───────┘  │
 *   │                                 │
 *   │  [legal basis + dată]           │  y: 240mm
 *   │  Cod CPE: ... | Generat: ...    │
 *   └─────────────────────────────────┘
 *
 * @param {jsPDF} doc
 * @param {object} meta — vezi buildBrandMetadata
 * @param {object} [options]
 * @param {Array<{value:string, label:string, color?:[number,number,number]}>} [options.kpis] — 0-3 KPI box-uri
 * @param {string} [options.subtitle] — sub-titlu sub titlu principal
 * @param {string} [options.disclaimer] — text disclaimer la final (ex: estimare/orientativ)
 */
export function renderCoverPage(doc, meta = {}, options = {}) {
  const { kpis = [], subtitle, disclaimer } = options;

  // ── 1. Logo mare centrat (35mm)
  const logoX = (A4.WIDTH - 50) / 2;
  drawZephrenLogoFull(doc, logoX, 30, 50);

  // ── 2. Titlu document
  const title = String(meta.title || "Document Zephren").toUpperCase();
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.TITLE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  doc.text(title, A4.WIDTH / 2, 85, { align: "center" });

  // ── 3. Subtitlu (opțional)
  if (subtitle) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(subtitle, A4.WIDTH / 2, 92, { align: "center" });
  }

  // ── 4. Bară primary sub titlu
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(A4.WIDTH / 2 - 30, 96, A4.WIDTH / 2 + 30, 96);

  // ── 5. Identificare clădire
  let y = 110;
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.H3);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  doc.text("IDENTIFICARE CLĂDIRE", A4.MARGIN_LEFT, y);
  y += 5;

  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");

  if (meta.building?.address) {
    doc.text(`Adresă: ${meta.building.address}`, A4.MARGIN_LEFT, y);
    y += 5;
  }

  const buildingDetails = [];
  if (meta.building?.category) buildingDetails.push(`Categorie ${meta.building.category}`);
  if (meta.building?.areaUseful) buildingDetails.push(`Au ${meta.building.areaUseful} m²`);
  if (meta.building?.year) buildingDetails.push(`Construit ${meta.building.year}`);
  if (meta.building?.cadastral) buildingDetails.push(`Cad. ${meta.building.cadastral}`);
  if (buildingDetails.length > 0) {
    doc.text(buildingDetails.join(" · "), A4.MARGIN_LEFT, y);
    y += 5;
  }

  // ── 6. Auditor
  y += 10;
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.H3);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  doc.text("AUDITOR ENERGETIC", A4.MARGIN_LEFT, y);
  y += 5;

  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");

  if (meta.auditor?.name) {
    doc.text(meta.auditor.name, A4.MARGIN_LEFT, y);
    y += 5;
  }
  const auditorDetails = [];
  if (meta.auditor?.atestat) auditorDetails.push(`Atestat MDLPA ${meta.auditor.atestat}`);
  if (meta.auditor?.grade) auditorDetails.push(meta.auditor.grade);
  if (meta.auditor?.firm && meta.auditor.firm !== "—") auditorDetails.push(meta.auditor.firm);
  if (auditorDetails.length > 0) {
    doc.text(auditorDetails.join(" · "), A4.MARGIN_LEFT, y);
    y += 5;
  }

  // ── 7. KPI box-uri (opțional, 1-3 box-uri orizontale)
  if (kpis.length > 0) {
    y += 12;
    const boxWidth = (A4.CONTENT_WIDTH - SPACING.MD * (kpis.length - 1)) / kpis.length;
    const boxHeight = 32;
    kpis.forEach((kpi, i) => {
      const bx = A4.MARGIN_LEFT + i * (boxWidth + SPACING.MD);
      renderKpiBox(doc, bx, y, boxWidth, boxHeight, kpi);
    });
    y += boxHeight + SPACING.LG;
  }

  // ── 8. Disclaimer (opțional)
  if (disclaimer) {
    y = Math.max(y, 240);
    doc.setFont(undefined, "italic");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    const lines = doc.splitTextToSize(disclaimer, A4.CONTENT_WIDTH);
    doc.text(lines, A4.MARGIN_LEFT, y);
    y += lines.length * 4;
  }

  // ── 9. Footer cover page (cod CPE + dată generare)
  const footerY = A4.HEIGHT - 25;
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  doc.text(`Cod CPE / CUC: ${meta.cpeCode || "—"}`, A4.MARGIN_LEFT, footerY);
  doc.text(`Generat: ${meta.dateText || formatRomanianDate(new Date())}`, A4.WIDTH - A4.MARGIN_RIGHT, footerY, { align: "right" });

  // Bază legală pe ultimul rând
  const legalText = (meta.legalBasis || []).join(" · ");
  if (legalText) {
    doc.setFontSize(FONT_SIZES.FOOTER);
    doc.text(legalText, A4.WIDTH / 2, footerY + 5, { align: "center" });
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. KPI BOX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render KPI card cu valoare mare + label + accent border.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w — lățime
 * @param {number} h — înălțime
 * @param {object} options
 * @param {string} options.value — valoare principală (ex: "78.381")
 * @param {string} [options.unit] — unitate (ex: "RON")
 * @param {string} options.label — descriere sub valoare (ex: "Investiție totală")
 * @param {[number,number,number]} [options.color] — culoare accent border (default PRIMARY)
 * @param {string} [options.icon] — emoji/text mic în colț (opțional)
 */
export function renderKpiBox(doc, x, y, w, h, options = {}) {
  const { value, unit, label, color = BRAND_COLORS.PRIMARY, icon } = options;

  // Fundal alb cu border-stânga colorat
  setBrandColor(doc, BRAND_COLORS.SLATE_50, "fill");
  doc.rect(x, y, w, h, "F");

  // Border stânga groasă (4mm) cu culoare accent
  setBrandColor(doc, color, "fill");
  doc.rect(x, y, 1.5, h, "F");

  // Border restul (subțire gri)
  setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
  doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
  doc.rect(x, y, w, h, "S");

  // Icon (opțional, dreapta sus)
  if (icon) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.H2);
    setBrandColor(doc, color, "text");
    doc.text(icon, x + w - 4, y + 6, { align: "right" });
  }

  // Valoare mare
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.KPI_VALUE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  const valueText = String(value || "—");
  doc.text(valueText, x + 5, y + h * 0.55);

  // Unitate (mai mică, lângă valoare)
  if (unit) {
    const valueWidth = doc.getTextWidth(valueText);
    doc.setFont(undefined, "normal");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(unit, x + 5 + valueWidth + 2, y + h * 0.55);
  }

  // Label dedesubt
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.KPI_LABEL);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  doc.text(String(label || "").toUpperCase(), x + 5, y + h - 3);

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENERGY CLASS BAR (scala A-G îmbunătățită)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scala A-G colorată cu marker-i ACTUAL + ESTIMAT îmbunătățiți.
 *
 * Față de versiunea originală drawEnergyScale din cpe-post-rehab-pdf.js:
 *   • Marker-ii sunt mai mari (4×6mm vs 4×3mm)
 *   • Valoarea numerică EP afișată pe marker (ex: "EP 781")
 *   • Etichete „STARE ACTUALĂ" / „POST-REHAB" mai vizibile
 *   • Linie prag nZEB opțională (pentru raport conformare)
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} totalWidth
 * @param {number} height — înălțime bară
 * @param {object} options
 * @param {string} [options.actualClass] — clasa actuală (A-G)
 * @param {number} [options.actualEP] — EP kWh/m²·an actual
 * @param {string} [options.targetClass] — clasa post-reabilitare (A-G)
 * @param {number} [options.targetEP] — EP kWh/m²·an post-rehab
 * @param {string} [options.thresholdClass] — clasă prag nZEB (ex: "B" pentru rezidențial)
 * @param {boolean} [options.showLabels=true] — etichete A-G în interiorul barei
 */
export function renderEnergyClassBar(doc, x, y, totalWidth, height, options = {}) {
  const {
    actualClass,
    actualEP,
    targetClass,
    targetEP,
    thresholdClass,
    showLabels = true,
  } = options;

  const classes = ["A", "B", "C", "D", "E", "F", "G"];
  const barWidth = totalWidth / classes.length;

  // Bare colorate
  classes.forEach((cls, i) => {
    const [r, g, bl] = ENERGY_CLASS_COLORS[cls] || [128, 128, 128];
    doc.setFillColor(r, g, bl);
    doc.rect(x + i * barWidth, y, barWidth, height, "F");

    if (showLabels) {
      const [tr, tg, tb] = getEnergyClassTextColor(cls);
      doc.setFont(undefined, "bold");
      doc.setFontSize(FONT_SIZES.H3);
      doc.setTextColor(tr, tg, tb);
      doc.text(cls, x + i * barWidth + barWidth / 2, y + height / 2 + 1.5, { align: "center" });
    }
  });

  // Linie prag nZEB (opțional)
  if (thresholdClass && classes.includes(thresholdClass)) {
    const idx = classes.indexOf(thresholdClass);
    const lineX = x + (idx + 1) * barWidth; // dreapta clasei prag
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "draw");
    doc.setLineWidth(STROKE_WIDTH.MEDIUM);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.line(lineX, y - 2, lineX, y + height + 2);
    doc.setLineDashPattern([], 0);

    doc.setFont(undefined, "italic");
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
    doc.text("prag nZEB", lineX, y - 3, { align: "center" });
  }

  // Marker ACTUAL (jos, triunghi gri închis)
  if (actualClass && classes.includes(actualClass)) {
    const idx = classes.indexOf(actualClass);
    const cx = x + idx * barWidth + barWidth / 2;
    const triY = y + height + 1.5;
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "fill");
    doc.triangle(cx - 3, triY + 4, cx + 3, triY + 4, cx, triY, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    const epText = Number.isFinite(actualEP) ? `EP ${Math.round(actualEP)}` : "";
    doc.text(`STARE ACTUALĂ ${epText}`, cx, triY + 9, { align: "center" });
  }

  // Marker ESTIMAT (sus, triunghi verde primary)
  if (targetClass && classes.includes(targetClass)) {
    const idx = classes.indexOf(targetClass);
    const cx = x + idx * barWidth + barWidth / 2;
    const triY = y - 1.5;
    setBrandColor(doc, BRAND_COLORS.PRIMARY, "fill");
    doc.triangle(cx - 3, triY - 4, cx + 3, triY - 4, cx, triY, "F");

    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.PRIMARY, "text");
    const epText = Number.isFinite(targetEP) ? `EP ${Math.round(targetEP)}` : "";
    doc.text(`POST-REHAB ${epText}`, cx, triY - 6, { align: "center" });
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SECTION DIVIDER (titlu secțiune cu bară primary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bară primary 2.5pt sub titlu secțiune (replicare layout cover bar).
 *
 * @param {jsPDF} doc
 * @param {number} y
 * @param {object} [options]
 * @param {number} [options.width=30] — lățime bară (mm)
 * @param {number} [options.x] — poziție X (default A4.MARGIN_LEFT)
 */
export function renderSectionDivider(doc, y, options = {}) {
  const { width = 30, x = A4.MARGIN_LEFT } = options;
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(x, y, x + width, y);
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
}

/**
 * Render header secțiune (h1) cu titlu mare + bară primary dedesubt + spacing.
 *
 * @param {jsPDF} doc
 * @param {string} title
 * @param {number} y — poziție baseline titlu
 * @param {object} [options]
 * @returns {number} — noul Y după secțiune (titlu + bară + spacing)
 */
export function renderSectionHeader(doc, title, y, options = {}) {
  const { x = A4.MARGIN_LEFT } = options;

  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.H1);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  doc.text(String(title || "").toUpperCase(), x, y);

  // Bară primary
  renderSectionDivider(doc, y + 2, { x, width: 25 });

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");

  return y + SPACING.LG;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. WATERMARK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Watermark diagonal central (45°) cu text mare amber semi-transparent.
 *
 * @param {jsPDF} doc
 * @param {string} text — ex: "ESTIMAT", "PREVIEW", "PRELIMINAR"
 * @param {object} [options]
 * @param {number} [options.opacity=0.10]
 * @param {[number,number,number]} [options.color] — default WATERMARK_AMBER
 */
export function renderWatermark(doc, text, options = {}) {
  const { opacity = 0.10, color = BRAND_COLORS.WATERMARK_AMBER } = options;

  if (typeof doc.GState !== "function") return; // jsPDF older versions

  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity }));
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.WATERMARK);
  setBrandColor(doc, color, "text");
  doc.text(String(text || "").toUpperCase(), A4.WIDTH / 2, A4.HEIGHT / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SIGNATURE BOX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Box semnătură + ștampilă standardizat (70×30mm).
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │                                   │  ← spațiu liber pentru semnătură
 *   │  [Semnătură + ștampilă]          │
 *   │                                   │
 *   ├──────────────────────────────────┤
 *   │  Auditor: ing. Stoica Vlad-Răzvan│  ← label dedesubt
 *   │  Atestat MDLPA: CT-01875         │
 *   │  Data: 08 mai 2026               │
 *   └──────────────────────────────────┘
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {object} options
 * @param {string} options.label — ex: "AUDITOR ENERGETIC"
 * @param {string} [options.name]
 * @param {string} [options.atestat]
 * @param {string} [options.date]
 * @param {number} [options.width=70]
 * @param {number} [options.height=35]
 */
export function renderSignatureBox(doc, x, y, options = {}) {
  const {
    label = "SEMNĂTURĂ",
    name,
    atestat,
    date,
    width = 70,
    height = 35,
  } = options;

  // Border box
  setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
  doc.rect(x, y, width, height, "S");

  // Linie internă (separare zonă semnătură vs label)
  doc.line(x, y + 22, x + width, y + 22);

  // Label sus (în zona signaturii)
  doc.setFont(undefined, "italic");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  doc.text(label.toUpperCase(), x + width / 2, y + 4, { align: "center" });

  // Date dedesubt linie
  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");

  let infoY = y + 26;
  if (name) {
    doc.text(name, x + 2, infoY);
    infoY += 3.5;
  }
  if (atestat) {
    doc.setFontSize(FONT_SIZES.FOOTER);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text(`Atestat: ${atestat}`, x + 2, infoY);
    infoY += 3;
  }
  if (date) {
    doc.text(`Data: ${date}`, x + 2, infoY);
  }

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.5 QR COD pentru verificare integritate document (Sprint Visual-6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generează QR cod și îl atașează la documentul jsPDF.
 *
 * Payload format recomandat:
 *   - URL public: "https://zephren.ro/verify/{cpeCode}" (validator MDLPA viitor)
 *   - Sau structurat: "ZEPHREN|{cpeCode}|{dateISO}|{hashSHA256_8chars}"
 *
 * Folosește pachetul `qrcode` (deja instalat). Async — folosi în context async.
 *
 * @param {jsPDF} doc
 * @param {string} payload — text encodat în QR
 * @param {object} [options]
 * @param {number} [options.x=15]
 * @param {number} [options.y=A4.HEIGHT - 35]
 * @param {number} [options.size=18] — lățime/înălțime (mm) — recomandat 15-25
 * @param {string} [options.label] — text dedesubt (ex: "Verifică online")
 * @param {[number,number,number]} [options.darkColor] — culoare pixel-uri QR
 * @returns {Promise<{x:number, y:number, size:number, payload:string}>}
 */
export async function renderQrCode(doc, payload, options = {}) {
  const {
    x = 15,
    y = A4.HEIGHT - 35,
    size = 18,
    label,
    darkColor = BRAND_COLORS.SLATE_900,
  } = options;

  if (!payload) return null;

  try {
    const QRCode = (await import("qrcode")).default;
    const darkHex = `#${darkColor.map(c => c.toString(16).padStart(2, "0")).join("")}`;
    const dataURL = await QRCode.toDataURL(String(payload), {
      width: 256, // sursă mare pentru calitate
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: darkHex, light: "#ffffff" },
    });

    // jsPDF addImage(dataURL, format, x, y, w, h)
    doc.addImage(dataURL, "PNG", x, y, size, size);

    // Label dedesubt (opțional)
    if (label) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(FONT_SIZES.FOOTER);
      setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
      doc.text(String(label), x + size / 2, y + size + 2.5, { align: "center" });
      setBrandColor(doc, BRAND_COLORS.BLACK, "text");
    }

    return { x, y, size, payload: String(payload) };
  } catch (err) {
    // Fallback grafic: chenar gri cu text "QR" + payload short
    setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
    doc.setLineWidth(STROKE_WIDTH.THIN);
    doc.rect(x, y, size, size, "S");
    doc.setFont(undefined, "bold");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    doc.text("QR", x + size / 2, y + size / 2, { align: "center" });
    if (label) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(FONT_SIZES.FOOTER);
      doc.text(String(label).slice(0, 16), x + size / 2, y + size + 2.5, { align: "center" });
    }
    setBrandColor(doc, BRAND_COLORS.BLACK, "text");
    setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
    return { x, y, size, payload: String(payload), error: err?.message };
  }
}

/**
 * Generează URL standard de verificare pentru un document Zephren.
 *
 * Format: https://zephren.ro/verify/{cpeCode}?t={dateISO}&h={hashShort}
 *
 * @param {object} meta — brand metadata (cpeCode, dateISO, etc.)
 * @param {object} [options]
 * @param {string} [options.baseUrl="https://zephren.ro/verify"]
 * @param {string} [options.hashShort] — primele 8 caractere SHA-256 (opțional)
 * @returns {string}
 */
export function buildVerifyUrl(meta = {}, options = {}) {
  const { baseUrl = "https://zephren.ro/verify", hashShort } = options;
  const cpeCode = meta.cpeCode || "no-code";
  const dateISO = meta.dateISO || new Date().toISOString().slice(0, 10);
  const safeCpeCode = encodeURIComponent(String(cpeCode));
  const params = new URLSearchParams();
  params.set("t", dateISO);
  if (hashShort) params.set("h", String(hashShort).slice(0, 8));
  return `${baseUrl}/${safeCpeCode}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. TABEL HEADER (helper pentru tabele zebra cu header brand)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render header tabel cu fundal slate + text alb.
 *
 * @param {jsPDF} doc
 * @param {Array<string>} columns
 * @param {Array<number>} widths — lățimi coloane (mm)
 * @param {number} x — poziție X start
 * @param {number} y — poziție Y top header
 * @param {number} rowHeight
 * @returns {number} — Y după header
 */
export function renderTableHeader(doc, columns, widths, x, y, rowHeight = 7) {
  const totalW = widths.reduce((a, b) => a + b, 0);

  // Fundal slate
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "fill");
  doc.rect(x, y, totalW, rowHeight, "F");

  // Text alb bold
  doc.setFont(undefined, "bold");
  doc.setFontSize(FONT_SIZES.TABLE_HEADER);
  setBrandColor(doc, BRAND_COLORS.WHITE, "text");

  let cx = x;
  columns.forEach((col, i) => {
    doc.text(String(col || ""), cx + 2, y + rowHeight - 2.5);
    cx += widths[i];
  });

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");

  return y + rowHeight;
}

/**
 * Render rând tabel (zebra alternant).
 *
 * @param {jsPDF} doc
 * @param {Array<string|number>} cells
 * @param {Array<number>} widths
 * @param {number} x
 * @param {number} y
 * @param {number} rowHeight
 * @param {boolean} [zebra=false] — true → fundal SLATE_50
 * @returns {number} — Y după rând
 */
export function renderTableRow(doc, cells, widths, x, y, rowHeight = 6, zebra = false) {
  const totalW = widths.reduce((a, b) => a + b, 0);

  if (zebra) {
    setBrandColor(doc, BRAND_COLORS.SLATE_50, "fill");
    doc.rect(x, y, totalW, rowHeight, "F");
  }

  doc.setFont(undefined, "normal");
  doc.setFontSize(FONT_SIZES.TABLE_BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");

  let cx = x;
  cells.forEach((cell, i) => {
    const txt = cell == null ? "—" : String(cell);
    // Coloanele numerice (ultima de obicei) aliniate dreapta
    const isNumeric = i === cells.length - 1 && typeof cell === "number";
    if (isNumeric) {
      doc.text(txt, cx + widths[i] - 2, y + rowHeight - 2, { align: "right" });
    } else {
      doc.text(txt, cx + 2, y + rowHeight - 2);
    }
    cx += widths[i];
  });

  // Border subtilă fund
  setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
  doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
  doc.line(x, y + rowHeight, x + totalW, y + rowHeight);

  // Reset
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);

  return y + rowHeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  applyBrandHeader,
  applyBrandFooter,
  renderCoverPage,
  renderKpiBox,
  renderEnergyClassBar,
  renderSectionDivider,
  renderSectionHeader,
  renderWatermark,
  renderSignatureBox,
  renderTableHeader,
  renderTableRow,
  renderQrCode,
  buildVerifyUrl,
};
