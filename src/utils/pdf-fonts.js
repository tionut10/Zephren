/**
 * pdf-fonts.js — Suport diacritice RO + TOC pentru jsPDF
 * Sprint 16 Task 6 — Zephren
 *
 * STRATEGIE DUBLĂ:
 *   A) Roboto TTF embedded — dacă fișierul /public/fonts/Roboto-Regular.ttf
 *      există, e fetch-uit, encodat base64 și înregistrat în VFS-ul jsPDF.
 *      Rezultat: diacriticele ă â î ș ț sunt afișate natural în PDF.
 *
 *   B) Fallback transliterare — dacă TTF-ul lipsește sau nu poate fi încărcat,
 *      `normalizeDiacritics(text)` convertește diacriticele în echivalente
 *      ASCII (ă→a, î→i, ș→s etc.) pentru a evita squares/garbage în PDF.
 *
 * INSTALARE Roboto (pentru diacritice native):
 *   Descarcă Roboto-Regular.ttf de pe https://fonts.google.com/specimen/Roboto
 *   și copiază-l în `public/fonts/Roboto-Regular.ttf`.
 *   Licență: Apache 2.0 — permite redistribuire comercială.
 *
 * TOC NAVIGABIL:
 *   `buildPdfOutline(doc, entries)` adaugă un cuprins clickable folosind
 *   jsPDF.outline API (PDF bookmarks). Entries: [{ title, page }, ...].
 */

let robotoLoaded = null;       // "loaded" | "failed" | null
let robotoPromise = null;       // Promise<boolean>

// ═══════════════════════════════════════════════════════════════
// ROBOTO TTF LOADING (lazy, deduplicat)
// ═══════════════════════════════════════════════════════════════
/**
 * Încarcă Roboto-Regular.ttf de la /fonts/Roboto-Regular.ttf, îl encodează
 * base64 și returnează stringul. Cache-uit după prima încărcare.
 *
 * @returns {Promise<string|null>} base64 string sau null dacă font lipsește
 */
async function loadRobotoBase64() {
  if (typeof window === "undefined") return null;
  if (robotoLoaded === "failed") return null;
  if (robotoPromise) return robotoPromise;

  robotoPromise = (async () => {
    try {
      const res = await fetch("/fonts/Roboto-Regular.ttf", { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Conversie Uint8Array → base64 (chunked, safe pentru fișiere mari)
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(i, i + chunk)
        );
      }
      robotoLoaded = "loaded";
      return btoa(binary);
    } catch (err) {
      robotoLoaded = "failed";
      return null;
    }
  })();

  return robotoPromise;
}

/**
 * Instalează Roboto în jsPDF (lazy) și setează-l ca font curent.
 * Dacă Roboto lipsește → întoarce false; apelantul va folosi normalizeDiacritics.
 *
 * @param {jsPDF} doc
 * @returns {Promise<boolean>} true = Roboto disponibil; false = fallback
 */
export async function setupRomanianFont(doc) {
  const base64 = await loadRobotoBase64();
  if (!base64) return false;
  try {
    doc.addFileToVFS("Roboto-Regular.ttf", base64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");
    return true;
  } catch (err) {
    console.warn("[pdf-fonts] addFont Roboto failed:", err.message);
    return false;
  }
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
 * Util când font-ul TTF Roboto nu e disponibil (helvetica default nu
 * suportă ă â î ș ț).
 *
 * @param {string|any} text
 * @returns {string}
 */
export function normalizeDiacritics(text) {
  if (typeof text !== "string") return text ?? "";
  return text.replace(/[ăâîșțĂÂÎȘȚşţŞŢ]/g, (c) => DIACRITIC_MAP[c] || c);
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
    console.warn("[pdf-fonts] jsPDF outline API nu este disponibil.");
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
  normalizeDiacritics,
  makeTextWriter,
  buildPdfOutline,
  drawTocPage,
};
