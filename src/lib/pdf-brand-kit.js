/**
 * pdf-brand-kit.js — Brand kit unitar pentru toate exporturile PDF Zephren
 *
 * Sprint Visual-1 (8 mai 2026)
 *
 * Scop: elimina fragmentarea vizuală între cele ~10 generatoare PDF (cpe-post-rehab,
 * cover-letter, dossier-extras, special-studies, zeb-study, construction-docs,
 * client-request, passport-export, etc.) prin centralizarea:
 *
 *   • Paletă culori (primary verde Zephren #007A3D + scala A-G UE standard)
 *   • Tipografie (mărimi, weights, hierarchy)
 *   • Spacing & layout (A4 portret + margini standard)
 *   • Helperi reutilizabili: header repetat, footer cu Pag X/Y, cover page,
 *     KPI box, scala energetică îmbunătățită, watermark, format dată RO
 *
 * Sursă autoritară:
 *   • Logo Zephren: public/logo.svg (Z verde #007A3D + scala A-G)
 *   • Brand color primary: #007A3D (verde închis, energy/sustenability vibe)
 *   • Tagline: „Energy Performance Calculator"
 *
 * Compatibilitate: jsPDF v4.x (utilizat în toate generatoarele existente)
 *
 * Bază legală referințe footer: Mc 001-2022 + Ord. MDLPA 348/2026 +
 *   EPBD 2024/1275 + ISO 14641 + eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PALETĂ CULORI
// ─────────────────────────────────────────────────────────────────────────────

// Sprint P4.4-bis (15 mai 2026) — currency toggle support pentru formatMoney.
// Import explicit (chain singular: currency-context → rehab-prices → leaf).
import { formatCurrencyForExport as _formatCurrencyForExport } from "../data/currency-context.js";

/**
 * Paletă brand Zephren — derivată din logo.svg.
 *
 * Toate valorile în format RGB tuple [r, g, b] pentru jsPDF (0-255).
 * Hex echivalent în comentarii pentru referință.
 */
export const BRAND_COLORS = Object.freeze({
  // Brand primary — verde Zephren (Z din logo)
  PRIMARY: [0, 122, 61],            // #007A3D — verde închis, sustenability
  PRIMARY_LIGHT: [0, 165, 80],      // #00A550 — verde A+ scala UE
  PRIMARY_DARK: [0, 90, 45],        // #005A2D — verde forest, accent profound
  PRIMARY_FAINT: [232, 246, 238],   // #E8F6EE — verde foarte deschis, fundal

  // Slate — text + headers (din logo: Z text gri deschis, casa gri)
  SLATE_900: [15, 23, 42],          // #0F172A — text headlines
  SLATE_700: [51, 65, 85],          // #334155 — text secondary
  SLATE_500: [100, 116, 139],       // #64748B — captions, footers, muted
  SLATE_400: [148, 163, 184],       // #94A3B8 — borders, dividers (din logo casa)
  SLATE_200: [226, 232, 240],       // #E2E8F0 — backgrounds light (logo Z text)
  SLATE_50:  [248, 250, 252],       // #F8FAFC — table zebra rows

  // Status colors (warning/error/info/success)
  SUCCESS: [22, 163, 74],           // #16A34A — verde OK, conformitate
  WARNING: [245, 158, 11],          // #F59E0B — amber, atenționare
  DANGER:  [220, 38, 38],           // #DC2626 — roșu, eroare/critic
  INFO:    [37, 99, 235],           // #2563EB — albastru, informație

  // Neutrals
  WHITE:   [255, 255, 255],
  BLACK:   [0, 0, 0],

  // Watermark (pentru documente "estimat" / "preview")
  WATERMARK_AMBER: [245, 158, 11],  // amber-500
});

/**
 * Paletă clase energetice UE standard (din logo.svg).
 *
 * Folosit pentru scala A-G + badge-uri clasă în CPE/RAE/Pașaport.
 * Ordine: A++ → G (cea mai bună → cea mai slabă).
 */
export const ENERGY_CLASS_COLORS = Object.freeze({
  "A++": [0, 122, 61],     // #007A3D — verde Zephren primary
  "A+":  [0, 165, 80],     // #00A550
  "A":   [76, 184, 72],    // #4CB848
  "B":   [189, 214, 48],   // #BDD630
  "C":   [255, 242, 0],    // #FFF200 — galben pur (text negru!)
  "D":   [253, 185, 19],   // #FDB913
  "E":   [243, 112, 33],   // #F37021
  "F":   [237, 28, 36],    // #ED1C24
  "G":   [179, 18, 23],    // #B31217 — vișiniu închis
});

/**
 * Determinare culoare text pe fundal clasă (alb sau negru) pentru contrast WCAG.
 *
 * @param {string} cls — clasa "A"..."G" (sau "A+", "A++")
 * @returns {[number, number, number]} RGB tuple
 */
export function getEnergyClassTextColor(cls) {
  // Pe galben (C) și verde deschis (B) — text negru pentru lizibilitate
  if (cls === "B" || cls === "C") return BRAND_COLORS.SLATE_900;
  return BRAND_COLORS.WHITE;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TIPOGRAFIE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mărimi font standardizate (în puncte = pt).
 *
 * jsPDF default font = Helvetica (sans-serif). Pentru diacritice complete,
 * codul existent încarcă Roboto/Liberation din public/fonts/ (vezi pdfa-export.js).
 * Acest brand kit nu schimbă fontul (compat cu existing) — doar standardizează
 * mărimile + weights.
 */
export const FONT_SIZES = Object.freeze({
  TITLE:        24,   // Cover page, primă pagină
  H1:           18,   // Header secțiune principală
  H2:           14,   // Sub-secțiune
  H3:           11,   // Sub-sub-secțiune
  BODY:         10,   // Text normal
  TABLE_HEADER:  9,   // Antet tabel
  TABLE_BODY:    9,   // Corp tabel
  CAPTION:       8,   // Subtitlu, legendă
  FOOTER:        7,   // Footer, disclaimer
  KPI_VALUE:    28,   // Valoare KPI mare (cover page)
  KPI_LABEL:     8,   // Label KPI sub valoare
  WATERMARK:    72,   // Watermark central
  CLASS_BADGE:  32,   // Litera clasă energetică (A-G) în badge mare
});

/**
 * Font weights (jsPDF style).
 */
export const FONT_WEIGHTS = Object.freeze({
  REGULAR: "normal",
  BOLD: "bold",
  ITALIC: "italic",
  BOLD_ITALIC: "bolditalic",
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SPACING & LAYOUT (A4 portret)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dimensiuni pagină A4 portret (mm) — folosim mm pentru consistență cu
 * jsPDF default unit „mm".
 */
export const A4 = Object.freeze({
  WIDTH: 210,
  HEIGHT: 297,
  MARGIN_LEFT: 18,
  MARGIN_RIGHT: 18,
  MARGIN_TOP: 22,         // 22mm pentru header band 12mm + 10mm spacing
  MARGIN_BOTTOM: 18,      // 18mm pentru footer band 8mm + 10mm spacing
  HEADER_HEIGHT: 12,      // bandă header repetat
  FOOTER_HEIGHT: 8,       // bandă footer repetat
  CONTENT_WIDTH: 174,     // 210 - 18 - 18
  CONTENT_HEIGHT: 257,    // 297 - 22 - 18
});

/**
 * Spacing vertical între elemente (mm).
 */
export const SPACING = Object.freeze({
  XS: 1.5,
  SM: 3,
  MD: 5,
  LG: 8,
  XL: 12,
  XXL: 18,
});

/**
 * Lățime border-uri standard (pt).
 */
export const STROKE_WIDTH = Object.freeze({
  HAIRLINE: 0.2,    // borduri tabel fine
  THIN: 0.4,        // borduri normale
  MEDIUM: 0.8,      // accent borders
  THICK: 1.5,       // section dividers
  HEAVY: 2.5,       // primary brand bar
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HELPERI CULORI / FORMAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplică o culoare brand pe doc (helper pentru DRY).
 *
 * @param {jsPDF} doc
 * @param {[number, number, number]} rgb — tuple din BRAND_COLORS
 * @param {"fill"|"text"|"draw"} type
 */
export function setBrandColor(doc, rgb, type = "fill") {
  const [r, g, b] = rgb || [0, 0, 0];
  if (type === "fill") doc.setFillColor(r, g, b);
  else if (type === "text") doc.setTextColor(r, g, b);
  else if (type === "draw") doc.setDrawColor(r, g, b);
}

/**
 * Format dată RO standardizat — folosește pentru text vizibil în documente.
 *
 * Formate suportate:
 *   - "long":  "08 mai 2026"   (DEFAULT pentru documente vizibile)
 *   - "short": "08.05.2026"    (pentru tabele/headers compacte)
 *   - "iso":   "2026-05-08"    (pentru metadate tehnice/manifest)
 *
 * @param {Date|string|number} input
 * @param {"long"|"short"|"iso"} format
 * @returns {string}
 */
export function formatRomanianDate(input, format = "long") {
  let d;
  if (input instanceof Date) d = input;
  else if (typeof input === "string" || typeof input === "number") d = new Date(input);
  else d = new Date();
  if (Number.isNaN(d.getTime())) return "—";

  const day = String(d.getDate()).padStart(2, "0");
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();

  const MONTHS_RO = [
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
  ];

  if (format === "short") return `${day}.${String(month + 1).padStart(2, "0")}.${year}`;
  if (format === "iso") return `${year}-${String(month + 1).padStart(2, "0")}-${day}`;
  return `${day} ${MONTHS_RO[month]} ${year}`;
}

/**
 * Format număr RO (separator zecimal virgulă, separator mii spațiu).
 *
 * @param {number} n
 * @param {number} decimals
 * @returns {string}
 */
export function formatRomanianNumber(n, decimals = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format RON cu separator mii + simbol monedă.
 *
 * @param {number} n
 * @returns {string}
 */
export function formatRON(n) {
  if (!Number.isFinite(n)) return "—";
  return `${formatRomanianNumber(n, 0)} RON`;
}

/**
 * Format EUR cu separator mii + simbol monedă.
 *
 * @param {number} n
 * @returns {string}
 */
export function formatEUR(n) {
  if (!Number.isFinite(n)) return "—";
  return `${formatRomanianNumber(n, 0)} €`;
}

/**
 * Sprint P4.4-bis (15 mai 2026) — format money respectând currency toggle global.
 *
 * Spre deosebire de `formatRON` (fix RON, păstrat pentru documente legale MDLPA
 * unde RON e obligatoriu), `formatMoney` respectă alegerea utilizatorului din
 * `CurrencyToggle` (Auto/EUR/RON). Folosit în export-uri B2B / multilingv.
 *
 * @param {number} n
 * @param {"RON"|"EUR"} sourceCurrency — moneda în care e stocată valoarea (default RON)
 * @param {{ decimals?: number }} [options]
 * @returns {string}
 */
export function formatMoney(n, sourceCurrency = "RON", options = {}) {
  if (!Number.isFinite(Number(n))) return "—";
  try {
    return _formatCurrencyForExport(Number(n), sourceCurrency, {
      decimals: options.decimals ?? 0,
    });
  } catch {
    // Fallback dacă currency-context nu e disponibil (test environment without DOM)
    return sourceCurrency === "EUR" ? formatEUR(Number(n)) : formatRON(Number(n));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. METADATA STANDARD pentru documente Zephren
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construiește obiect metadata standard pentru un document Zephren.
 *
 * Folosit în header/footer + cover page + manifest hash.
 *
 * @param {object} input
 * @param {string} input.title — titlu document (ex: "CPE Estimat Post-Reabilitare")
 * @param {string} input.cpeCode — cod CPE/CUC (ex: "2026-CT-00875")
 * @param {object} input.building — { address, category, areaUseful, year, cadastral }
 * @param {object} input.auditor — { name, atestat, grade, firm }
 * @param {Date|string} [input.date]
 * @param {string} [input.docType] — slug intern (ex: "cpe-post-rehab", "fic", "ipmvp")
 * @param {string} [input.version] — versiune generator (ex: "v4.0")
 * @returns {object}
 */
export function buildBrandMetadata({
  title,
  cpeCode,
  building,
  auditor,
  date,
  docType,
  version,
} = {}) {
  return {
    title: String(title || "Document Zephren"),
    cpeCode: String(cpeCode || "—"),
    building: {
      address: building?.address || "—",
      category: building?.category || "—",
      areaUseful: building?.areaUseful || null,
      year: building?.year || null,
      cadastral: building?.cadastral || null,
    },
    auditor: {
      name: auditor?.name || "—",
      atestat: auditor?.atestat || auditor?.certNumber || "—",
      grade: auditor?.grade || auditor?.gradeLabel || "—",
      firm: auditor?.firm || auditor?.company || "—",
    },
    date: date || new Date(),
    dateText: formatRomanianDate(date),
    dateShort: formatRomanianDate(date, "short"),
    dateISO: formatRomanianDate(date, "iso"),
    docType: String(docType || "doc"),
    version: String(version || "v4.0"),
    generator: `Zephren ${version || "v4.0"}`,
    legalBasis: [
      "Mc 001-2022 (Ord. MDLPA 16/2023)",
      "Ord. MDLPA 348/2026",
      "EPBD 2024/1275",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXPORT DEFAULT — toate constantele într-un singur obiect (DX)
// ─────────────────────────────────────────────────────────────────────────────

export default Object.freeze({
  BRAND_COLORS,
  ENERGY_CLASS_COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  A4,
  SPACING,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  formatRomanianNumber,
  formatRON,
  formatEUR,
  buildBrandMetadata,
  getEnergyClassTextColor,
});
