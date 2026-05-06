/**
 * watermark.js — Watermark juridic centralizat pentru export-uri PDF.
 *
 * Conform Sprint Pricing v6.1 + Art. 5 alin. 5 Ord. MDLPA 348/2026:
 * documentele emise în plan Free/EDU NU pot fi confundate cu documente reale.
 *
 * Watermark-uri suportate:
 *   - „DEMO"          — auditori în plan Free (testing/familiarizare)
 *   - „SCOP DIDACTIC" — studenți EDU (utilizare academică)
 *   - „MOCK SIGNATURE" — pentru documente semnate cu mock provider QTSP
 *   - null            — plan plătit valid + atestat MDLPA real → fără watermark
 *
 * Sprint Conformitate P0-11 (6 mai 2026).
 *
 * NOTĂ INTEGRARE: acest modul e disponibil pentru integrare în export-urile
 * existente (cover-letter-pdf.js, dossier-extras.js {FIC, DCA, M&V},
 * passport-export.js, passport-docx.js, element-annex-docx.js). Integrarea
 * efectivă în fiecare fișier necesită edit punctual + tests dedicate per
 * fișier — task amânat la P0-11-bis pentru a evita regresii multi-fișier.
 *
 * Pattern de utilizare în orice export jsPDF:
 *   import { applyJsPdfWatermarkAllPages, getWatermarkText } from "./watermark.js";
 *   const wmText = getWatermarkText(userPlan, isEduStudent);
 *   if (wmText) applyJsPdfWatermarkAllPages(doc, wmText);
 */

/**
 * Configurații watermark per tip.
 */
export const WATERMARK_PRESETS = Object.freeze({
  DEMO: {
    text: "DEMO",
    color: [255, 80, 80],     // roșu deschis
    opacity: 0.15,
    fontSize: 90,
    angle: -35,
  },
  EDU: {
    text: "SCOP DIDACTIC",
    color: [251, 191, 36],    // amber
    opacity: 0.18,
    fontSize: 70,
    angle: -35,
  },
  MOCK_SIGNATURE: {
    text: "MOCK SIGNATURE",
    color: [255, 165, 0],     // orange
    opacity: 0.12,
    fontSize: 60,
    angle: -35,
  },
  PREVIEW: {
    text: "PREVIEW EPBD 2024",
    color: [120, 120, 200],   // bluish-gray
    opacity: 0.10,
    fontSize: 60,
    angle: -35,
  },
});

/**
 * Determină textul watermark-ului pe baza planului utilizatorului.
 *
 * @param {string} plan — „free" | „edu" | „audit" | „pro" | „expert" | „birou" | „enterprise"
 * @param {boolean} [isEduValid=false] — pentru plan „edu", true dacă dovada studentă e validă
 * @returns {string|null} „DEMO" | „SCOP DIDACTIC" | null
 */
export function getWatermarkText(plan, isEduValid = false) {
  const planLower = String(plan || "").toLowerCase();
  if (planLower === "free" || planLower === "" || planLower === undefined) {
    return WATERMARK_PRESETS.DEMO.text;
  }
  if (planLower === "edu") {
    return isEduValid ? WATERMARK_PRESETS.EDU.text : WATERMARK_PRESETS.DEMO.text;
  }
  // Plan plătit (audit/pro/expert/birou/enterprise) → fără watermark
  return null;
}

/**
 * Returnează config complet (preset) pentru tipul de watermark detectat.
 *
 * @param {string} plan
 * @param {boolean} [isEduValid=false]
 * @param {object} [extra] — flag-uri suplimentare { isMockSigned?, isPreview? }
 * @returns {object|null} preset complet sau null
 */
export function getWatermarkConfig(plan, isEduValid = false, extra = {}) {
  if (extra.isMockSigned) return WATERMARK_PRESETS.MOCK_SIGNATURE;
  if (extra.isPreview) return WATERMARK_PRESETS.PREVIEW;

  const planLower = String(plan || "").toLowerCase();
  if (planLower === "free" || planLower === "") return WATERMARK_PRESETS.DEMO;
  if (planLower === "edu") {
    return isEduValid ? WATERMARK_PRESETS.EDU : WATERMARK_PRESETS.DEMO;
  }
  return null;
}

/**
 * Aplică watermark pe pagina curentă a unui document jsPDF.
 *
 * @param {object} doc — instanță jsPDF
 * @param {string} text — textul watermark-ului
 * @param {object} [options] — override-uri pentru preset
 * @param {number[]} [options.color=[255,80,80]] — RGB
 * @param {number} [options.opacity=0.15] — 0..1
 * @param {number} [options.fontSize=90]
 * @param {number} [options.angle=-35] — grade
 * @param {string} [options.font="helvetica"]
 */
export function applyJsPdfWatermark(doc, text, options = {}) {
  if (!doc || typeof doc.text !== "function") return;
  const color = options.color || [255, 80, 80];
  const opacity = typeof options.opacity === "number" ? options.opacity : 0.15;
  const fontSize = options.fontSize || 90;
  const angle = options.angle || -35;
  const font = options.font || "helvetica";

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const x = pageW / 2;
  const y = pageH / 2;

  // Salvează state curent
  let prevTextColor = null;
  try {
    if (typeof doc.getTextColor === "function") prevTextColor = doc.getTextColor();
  } catch { /* ignore */ }

  try {
    if (typeof doc.setGState === "function") {
      // GState pentru opacity (suportat în jsPDF cu plugin)
      try {
        doc.setGState(new doc.GState({ opacity }));
      } catch { /* GState plugin lipsă — fallback la culoare deschisă */ }
    }
    doc.setFont(font, "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align: "center", angle });
  } catch (e) {
    console.warn("[watermark] applyJsPdfWatermark failed:", e?.message);
  } finally {
    // Resetează GState (opacity 1) pentru conținutul restul
    try {
      if (typeof doc.setGState === "function") {
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    } catch { /* */ }
    if (prevTextColor !== null) {
      try { doc.setTextColor(prevTextColor); } catch { /* */ }
    } else {
      try { doc.setTextColor(0, 0, 0); } catch { /* */ }
    }
  }
}

/**
 * Aplică watermark pe TOATE paginile unui document jsPDF.
 *
 * Trebuie apelat DUPĂ ce toate paginile au fost create (înainte de save/output).
 *
 * @param {object} doc
 * @param {string} text
 * @param {object} [options]
 */
export function applyJsPdfWatermarkAllPages(doc, text, options = {}) {
  if (!doc || typeof doc.getNumberOfPages !== "function") return;
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    if (typeof doc.setPage === "function") doc.setPage(i);
    applyJsPdfWatermark(doc, text, options);
  }
}

/**
 * Generează HTML watermark pentru documente DOCX preview / HTML reports.
 *
 * Folosit în Step6Certificate.jsx linia ~1936 (deja există pattern similar inline —
 * acest helper centralizează pentru consistență).
 *
 * @param {string} text
 * @returns {string} HTML element string
 */
export function buildHtmlWatermark(text) {
  if (!text) return "";
  return `<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;` +
    `pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:0.10">` +
    `<div style="transform:rotate(-35deg);font-size:80pt;font-weight:900;color:#003366;` +
    `white-space:nowrap;font-family:sans-serif;letter-spacing:8px">${text}</div></div>`;
}

/**
 * Helper combinat: aplică automat watermark dacă planul îl cere.
 *
 * @param {object} doc — jsPDF
 * @param {object} args
 * @param {string} args.plan
 * @param {boolean} [args.isEduValid=false]
 * @param {object} [args.extra] — { isMockSigned?, isPreview? }
 * @returns {boolean} true dacă a aplicat watermark
 */
export function autoWatermark(doc, { plan, isEduValid = false, extra = {} } = {}) {
  const cfg = getWatermarkConfig(plan, isEduValid, extra);
  if (!cfg) return false;
  applyJsPdfWatermarkAllPages(doc, cfg.text, {
    color: cfg.color,
    opacity: cfg.opacity,
    fontSize: cfg.fontSize,
    angle: cfg.angle,
  });
  return true;
}
