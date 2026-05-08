/**
 * pdf-fonts.js — Suport diacritice RO + TOC pentru jsPDF
 * Sprint 16 Task 6 — Zephren  |  patch 26 apr 2026: Liberation Sans (jsPDF compat)
 *
 * STRATEGIE DUBLĂ:
 *   A) Liberation Sans TTF embedded — fișierele din /public/fonts/
 *      LiberationSans-{Regular,Bold,Italic,BoldItalic}.ttf sunt fetch-uite,
 *      encodate base64 și înregistrate în VFS-ul jsPDF pe toate 4 stilurile
 *      (normal, bold, italic, bolditalic). Astfel `setFont(undefined,"bold")`
 *      și autoTable cu `fontStyle:"bold"` păstrează font-ul Unicode (cu
 *      diacritice ă â î ș ț) în loc să cadă pe Helvetica.
 *      ALEGERE FONT: Liberation Sans (Red Hat, SIL OFL 1.1) e metric-
 *      compatibil Arial, are 3 subtabele cmap (platform 0+3, format 4) și
 *      este parsabil de jsPDF v4.x — testat. Roboto v2 are subtable format
 *      12 care declanșează „No unicode cmap for font" în jsPDF.
 *
 *   B) Fallback transliterare — dacă TTF-urile lipsesc, sau jsPDF nu poate
 *      parsa font-ul (validare sintetică `setFont` + `getTextWidth` →
 *      „Cannot read 'widths'"), `normalizeDiacritics(text)` convertește
 *      diacriticele în ASCII (ă→a, ș→s, ț→t etc.). PDF rămâne lizibil.
 *
 * INSTALARE FONT (pentru diacritice native):
 *   Liberation Sans 4 stiluri sunt deja în /public/fonts/ (din pdfjs-dist).
 *   Total ~575 KB. Licență SIL OFL 1.1 — redistribuire/embed liber permis.
 *
 * TOC NAVIGABIL:
 *   `buildPdfOutline(doc, entries)` adaugă un cuprins clickable folosind
 *   jsPDF.outline API (PDF bookmarks). Entries: [{ title, page }, ...].
 */

// Numele font-ului folosit intern în jsPDF (poate diferi de fișierul TTF)
export const ROMANIAN_FONT = "LiberationSans";

// Cache la nivel de modul pentru a evita re-fetch
const fontCache = {
  // 'normal' | 'bold' | 'italic' | 'bolditalic' → base64 string | null
  normal: undefined,
  bold: undefined,
  italic: undefined,
  bolditalic: undefined,
};
const fontPromises = {};

const FONT_FILES = {
  normal: "/fonts/LiberationSans-Regular.ttf",
  bold: "/fonts/LiberationSans-Bold.ttf",
  italic: "/fonts/LiberationSans-Italic.ttf",
  bolditalic: "/fonts/LiberationSans-BoldItalic.ttf",
};

const VFS_NAMES = {
  normal: "LiberationSans-Regular.ttf",
  bold: "LiberationSans-Bold.ttf",
  italic: "LiberationSans-Italic.ttf",
  bolditalic: "LiberationSans-BoldItalic.ttf",
};

// ═══════════════════════════════════════════════════════════════
// ROBOTO TTF LOADING (lazy, deduplicat, per stil)
// ═══════════════════════════════════════════════════════════════
async function loadFontBase64(style) {
  if (typeof window === "undefined") return null;
  if (fontCache[style] !== undefined) return fontCache[style];
  if (fontPromises[style]) return fontPromises[style];

  fontPromises[style] = (async () => {
    try {
      const res = await fetch(FONT_FILES[style], { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength < 1000) throw new Error("font file empty/too small");
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      const b64 = btoa(binary);
      fontCache[style] = b64;
      return b64;
    } catch (_err) {
      fontCache[style] = null;
      return null;
    }
  })();

  return fontPromises[style];
}

/**
 * Instalează Roboto în jsPDF pe toate cele 4 stiluri și setează-l ca font
 * curent. Dacă fișierele bold/italic/bolditalic lipsesc, Regular acoperă
 * stilurile lipsă — astfel `setFont(undefined, "bold")` și autoTable cu
 * `fontStyle: "bold"` păstrează Roboto (cu diacritice) în loc să cadă pe
 * Helvetica.
 *
 * Validare critică: jsPDF nu throw-uiește la `addFont`, ci publică eroarea
 * în PubSub („No unicode cmap for font"). Pentru a detecta eșecul real,
 * după înregistrare facem un test sintetic `setFont` + `getTextWidth`.
 * Dacă aruncă „Cannot read properties of undefined (reading 'widths')",
 * font-ul nu e utilizabil → întoarcem false și apelantul folosește
 * transliterarea ASCII.
 *
 * @param {jsPDF} doc
 * @returns {Promise<boolean>} true = Roboto utilizabil; false = fallback
 */
export async function setupRomanianFont(doc) {
  // Încarcă Regular obligatoriu — dacă lipsește, totul cade pe transliterare
  const regular = await loadFontBase64("normal");
  if (!regular) return false;

  // Încarcă în paralel celelalte stiluri (cele care lipsesc → null)
  const [boldB64, italicB64, biB64] = await Promise.all([
    loadFontBase64("bold"),
    loadFontBase64("italic"),
    loadFontBase64("bolditalic"),
  ]);

  // Salvează fontul curent ca să putem reveni la el dacă Roboto eșuează
  let prevFont = null;
  try { prevFont = doc.getFont(); } catch { /* ignore */ }

  try {
    // Înregistrare per stil cu fișier propriu (sau fallback Regular)
    doc.addFileToVFS(VFS_NAMES.normal, regular);
    doc.addFont(VFS_NAMES.normal, ROMANIAN_FONT, "normal");

    if (boldB64) {
      doc.addFileToVFS(VFS_NAMES.bold, boldB64);
      doc.addFont(VFS_NAMES.bold, ROMANIAN_FONT, "bold");
    } else {
      doc.addFont(VFS_NAMES.normal, ROMANIAN_FONT, "bold");
    }

    if (italicB64) {
      doc.addFileToVFS(VFS_NAMES.italic, italicB64);
      doc.addFont(VFS_NAMES.italic, ROMANIAN_FONT, "italic");
    } else {
      doc.addFont(VFS_NAMES.normal, ROMANIAN_FONT, "italic");
    }

    if (biB64) {
      doc.addFileToVFS(VFS_NAMES.bolditalic, biB64);
      doc.addFont(VFS_NAMES.bolditalic, ROMANIAN_FONT, "bolditalic");
    } else {
      doc.addFont(VFS_NAMES.normal, ROMANIAN_FONT, "bolditalic");
    }

    // Validare sintetică — jsPDF nu throw-uiește la addFont, dar la prima
    // utilizare a font-ului (setFont+getTextWidth) aruncă „Cannot read
    // properties of undefined (reading 'widths')" dacă cmap-ul a fost
    // respins de parser. Detectăm aici și forțăm fallback.
    doc.setFont(ROMANIAN_FONT, "normal");
    doc.getTextWidth("ăâîșț");
    doc.setFont(ROMANIAN_FONT, "bold");
    doc.getTextWidth("ĂÂÎȘȚ");
    // Resetăm la stilul normal, gata de utilizare
    doc.setFont(ROMANIAN_FONT, "normal");
    return true;
  } catch (err) {
    // Font-ul nu e utilizabil — revenim la fontul anterior
    if (typeof console !== "undefined") {
      console.warn(
        "[pdf-fonts] Font Unicode inutilizabil în jsPDF:",
        err.message,
        "— fallback transliterare ASCII"
      );
    }
    try {
      if (prevFont) doc.setFont(prevFont.fontName || "helvetica", prevFont.fontStyle || "normal");
      else doc.setFont("helvetica", "normal");
    } catch { /* ignore */ }
    return false;
  }
}

/**
 * Stiluri default pentru jspdf-autotable astfel încât toate celulele
 * (head/body/foot) să folosească Roboto. Returnează un obiect care poate fi
 * spread-uit în opts.styles / opts.headStyles / opts.bodyStyles / etc.
 *
 * Apelat doar dacă `setupRomanianFont` a returnat true.
 *
 * @returns {object} { font: "Roboto" }
 */
export function autoTableFontStyles() {
  return { font: ROMANIAN_FONT };
}

// ═══════════════════════════════════════════════════════════════
// TRANSLITERARE DIACRITICE (fallback când Roboto lipsește)
// ═══════════════════════════════════════════════════════════════
const DIACRITIC_MAP = {
  "ă": "a", "â": "a", "î": "i", "ș": "s", "ț": "t",
  "Ă": "A", "Â": "A", "Î": "I", "Ș": "S", "Ț": "T",
  // Variante cu cedilă (compatibilitate Unicode veche)
  "ş": "s", "ţ": "t", "Ş": "S", "Ţ": "T",
};

/**
 * Înlocuiește diacriticele românești cu echivalente ASCII.
 * Util când font-ul TTF Liberation Sans nu e disponibil (Helvetica default
 * nu suportă ă â î ș ț).
 *
 * @param {string|any} text
 * @returns {string}
 */
export function normalizeDiacritics(text) {
  if (typeof text !== "string") return text ?? "";
  return text.replace(/[ăâîșțĂÂÎȘȚşţŞŢ]/g, (c) => DIACRITIC_MAP[c] || c);
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZARE SIMBOLURI LIPSĂ (Liberation Sans / Helvetica)
// Liberation Sans NU conține glyph-uri pentru: ✓ ✗ ⚠ ❌ ⭐ etc.
// Aceste caractere se randează ca .notdef (pătrat gol) → arată
// neprofesional în documente oficiale. Înlocuim cu echivalente
// text safe (ex: ✓ → "[OK]", ✗ → "[X]"), aplicate ÎNTOTDEAUNA
// (chiar și când diacriticele funcționează).
// ═══════════════════════════════════════════════════════════════
const SYMBOL_MAP = {
  // Bifă/cruce/atenție — Liberation Sans NU le conține. Înlocuim cu glyph-uri
  // EXISTENTE în Latin-1 (× U+00D7, √ U+221A nu există dar ✓→OK).
  // IMPORTANT: NU folosim "DA"/"NU" — ar crea dublă negație ("✗ NU SE ÎNCADREAZĂ"
  // → "NU NU SE ÎNCADREAZĂ"). Sprint 8 mai 2026: trecem de la "[OK]"/"[X]" la
  // forme mai curate vizual — bifă text "OK", × multiplicare U+00D7 pentru cruce
  // (există în Latin-1 supplement, deci se randează în Liberation Sans/Helvetica).
  "✓": "OK",
  "✔": "OK",
  "✗": "×",
  "✘": "×",
  "❌": "×",
  "⚠": "!",
  "⚠️": "!",
  "❗": "!",
  "ℹ": "i",
  "ℹ️": "i",
  "⭐": "*",
  "★": "*",
  "☆": "*",
  // Săgeți speciale (→ U+2192 NU există în Liberation Sans — folosim ASCII)
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "⇐": "<=",
  "⇔": "<=>",
  "⬆": "sus",
  "⬇": "jos",
  "⬅": "stanga",
  "➡": "dreapta",
  // Puncte/separatori care de obicei lipsesc
  "▶": ">",
  "◀": "<",
  "▲": "^",
  "▼": "v",
  "■": "X",
  "□": "[ ]",
  "●": "*",
  "○": "o",
  // Sprint 8 mai 2026 — Subscripts (U+2080-U+2089) lipsesc din Liberation Sans.
  // Înlocuim cu cifre normale (CO₂ → CO2, H₂O → H2O). Acceptabil științific.
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  // Superscripts care lipsesc din Liberation Sans (¹²³ U+00B9/B2/B3 SUNT în Latin-1
  // și se randează corect, dar ⁰⁴⁻⁺ și ⁻¹ nu sunt). Înlocuim cu echivalent text.
  "⁰": "0", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁻": "-", "⁺": "+", "⁼": "=",
  // Combinații specifice metrologie: m⁻¹ → "m^-1"
  // (regex pe substring; aplicat în normalizeSymbols înainte de char-by-char)
};

const SYMBOL_RE = new RegExp(`[${Object.keys(SYMBOL_MAP).join("")}]`, "g");

// Sprint 8 mai 2026 — substring patterns aplicate ÎNAINTE de char-by-char
// (ex: m⁻¹ → "m^-1" mai natural decât "m-1" rezultat din replace ⁻ → "-").
const SUBSTRING_PATTERNS = [
  [/m⁻¹/g, "1/m"],         // raport Aenv/V (1 pe metru)
  [/m⁻¹/g, "1/m"],
  [/h⁻¹/g, "1/h"],         // permeabilitate aer n50 (1 pe oră)
  [/h⁻¹/g, "1/h"],
  [/s⁻¹/g, "1/s"],         // frecvență
  [/kg\.?\s?CO₂\b/g, "kg CO2"], // emisii — păstrăm CO2 fără subscript
  [/CO₂/g, "CO2"],          // dioxid de carbon (păstrare științifică clară)
];

/**
 * Înlocuiește simbolurile Unicode care lipsesc din Liberation Sans/Helvetica
 * cu echivalente text safe. Păstrează diacriticele românești intacte.
 *
 * @param {string|any} text
 * @returns {string}
 */
export function normalizeSymbols(text) {
  if (typeof text !== "string") return text ?? "";
  let t = text;
  // Substring patterns prima dată (m⁻¹ → 1/m, CO₂ → CO2)
  for (const [pat, repl] of SUBSTRING_PATTERNS) {
    t = t.replace(pat, repl);
  }
  // Apoi char-by-char fallback pentru orice simbol rămas
  return t.replace(SYMBOL_RE, (c) => SYMBOL_MAP[c] || c);
}

/**
 * Combină normalizarea simbolurilor (mereu) + diacritice (dacă font lipsă).
 * @param {string|any} text
 * @param {boolean} fontHasRomanian dacă font-ul rederează diacriticele OK
 */
export function normalizeForPdf(text, fontHasRomanian) {
  if (typeof text !== "string") return text ?? "";
  let t = normalizeSymbols(text);
  if (!fontHasRomanian) t = normalizeDiacritics(t);
  return t;
}

/**
 * Factory pentru funcția `text()` conștientă de diacritice.
 * Dacă fontHasRomanian=true → trece textul direct; altfel normalizează.
 *
 * @param {jsPDF} doc
 * @param {boolean} fontHasRomanian
 * @returns {(text: string, x: number, y: number, opts?: any) => void}
 */
export function makeTextWriter(doc, fontHasRomanian) {
  return (text, x, y, opts) => {
    const t = fontHasRomanian ? text : normalizeDiacritics(text);
    return doc.text(t, x, y, opts);
  };
}

// ═══════════════════════════════════════════════════════════════
// TOC (Table of Contents / Cuprins) — PDF outline
// ═══════════════════════════════════════════════════════════════
/**
 * Adaugă un cuprins navigabil (PDF bookmarks) pe document.
 *
 * @param {jsPDF} doc      Document jsPDF (după toate paginile generate)
 * @param {Array<{title:string, page:number, children?:Array}>} entries
 * @returns {void}
 *
 * Exemplu:
 *   buildPdfOutline(doc, [
 *     { title: "1. Date generale", page: 1 },
 *     { title: "2. Consum energetic", page: 3 },
 *     { title: "4. Conformitate", page: 5, children: [
 *       { title: "4.1 Anvelopa", page: 5 },
 *       { title: "4.3 nZEB", page: 6 },
 *     ]},
 *   ]);
 */
export function buildPdfOutline(doc, entries) {
  if (!doc.outline || typeof doc.outline.add !== "function") {
    if (typeof console !== "undefined") {
      console.warn("[pdf-fonts] jsPDF outline API nu este disponibil.");
    }
    return;
  }
  const addEntry = (parent, e) => {
    const node = doc.outline.add(parent, e.title, { pageNumber: e.page });
    if (Array.isArray(e.children) && e.children.length) {
      e.children.forEach((c) => addEntry(node, c));
    }
    return node;
  };
  entries.forEach((e) => addEntry(null, e));
}

/**
 * Desenează o pagină de cuprins vizibil (tabel titluri + nr. pagină).
 * Apelată ÎNAINTE de restul paginilor (pe prima pagină rezervată TOC).
 *
 * @param {jsPDF} doc
 * @param {Array<{title:string, page:number, level?:number}>} toc
 * @param {object} [opts] { startY=30, lineHeight=7, margin=15, title="Cuprins" }
 */
export function drawTocPage(doc, toc, opts = {}) {
  const {
    startY = 30,
    lineHeight = 7,
    margin = 15,
    title = "Cuprins",
    pageWidth = 210,
  } = opts;
  doc.setFontSize(14);
  doc.text(title, margin, startY - 8);
  doc.setFontSize(10);
  let y = startY;
  toc.forEach((entry) => {
    if (y + lineHeight > 280) {
      doc.addPage();
      y = startY;
    }
    const indent = (entry.level || 0) * 5;
    const titleText = entry.title;
    const pageText = String(entry.page);
    // Linia de puncte între titlu și nr. pagină
    const titleWidth = doc.getTextWidth(titleText);
    const pageWidthVal = doc.getTextWidth(pageText);
    const dotStart = margin + indent + titleWidth + 2;
    const dotEnd = pageWidth - margin - pageWidthVal - 2;
    doc.text(titleText, margin + indent, y);
    if (dotEnd > dotStart) {
      const dots = ".".repeat(Math.max(0, Math.floor((dotEnd - dotStart) / 1.5)));
      doc.setTextColor(180);
      doc.text(dots, dotStart, y);
      doc.setTextColor(0);
    }
    doc.text(pageText, pageWidth - margin - pageWidthVal, y);
    y += lineHeight;
  });
}

export default {
  setupRomanianFont,
  autoTableFontStyles,
  normalizeDiacritics,
  makeTextWriter,
  buildPdfOutline,
  drawTocPage,
  ROMANIAN_FONT,
};
