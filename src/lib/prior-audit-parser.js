/**
 * prior-audit-parser.js — Extracție date dintr-un audit energetic anterior (PDF).
 *
 * Sprint Conformitate P2-08 (7 mai 2026).
 *
 * Pentru clădiri reabilitate parțial, auditul precedent dă baseline-ul Eᵢ
 * pre-implementare. Modulul oferă:
 *   - parseStaticTextPdf(blob) — extracție text simplu via pdfjs-dist (când disponibil)
 *   - extractAuditMetrics(text) — parser regex pentru valori cheie (EP, U, η, n50)
 *   - matchPriorAuditFields() — pre-fill candidate fields pentru Step 5
 *
 * NOTE: pentru extracție high-fidelity (tabele, scale color, signature info)
 * recomandat Claude Vision API prin api/ocr-cpe.js (existing endpoint). Acest
 * modul oferă fallback pur client-side fără cost API.
 */

/**
 * Pattern-uri regex pentru extracție valori cheie dintr-un PDF audit.
 * Pattern-urile acoperă variantele uzuale de formatare RO + units.
 */
const PATTERNS = Object.freeze({
  ep_primary: [
    /EP\s*(?:total)?\s*=?\s*([\d.,]+)\s*kWh\s*\/\s*m[2²]\s*[·\.]?\s*an/i,
    /Energie\s+primar[aă]\s+specific[aă]\s*[:=]?\s*([\d.,]+)/i,
    /Indicator\s+EP\s*[:=]?\s*([\d.,]+)/i,
  ],
  ep_class: [
    /Clas[aă]\s+(?:energetic[aă])?\s*[:=]?\s*([A-G]\+?)/i,
    /Clasa\s+([A-G]\+?)\s/i,
  ],
  co2: [
    /CO[2₂]\s*[:=]?\s*([\d.,]+)\s*kg\s*\/\s*m[2²]/i,
    /Emisii\s+CO[2₂]\s*specifice\s*[:=]?\s*([\d.,]+)/i,
  ],
  u_med: [
    /U\s*med\s*[:=]?\s*([\d.,]+)\s*W\s*\/\s*m[2²]\s*K/i,
    /Coeficient\s+global\s+G\s*[:=]?\s*([\d.,]+)/i,
  ],
  area_useful: [
    /Suprafa[tț][aă]\s+util[aă]\s*(?:Au)?\s*[:=]?\s*([\d.,]+)\s*m[2²]/i,
    /Au\s*[:=]?\s*([\d.,]+)\s*m[2²]/i,
  ],
  area_built: [
    /Suprafa[tț][aă]\s+construit[aă]\s*[:=]?\s*([\d.,]+)\s*m[2²]/i,
  ],
  volume: [
    /Volum\s+(?:incalzit|inc[aă]lzit)?\s*[:=]?\s*([\d.,]+)\s*m[3³]/i,
  ],
  n50: [
    /n\s*50\s*[:=]?\s*([\d.,]+)\s*h\s*[-‐]\s*1/i,
    /Etan[șs]eitate\s*[:=]?\s*([\d.,]+)/i,
  ],
  year_built: [
    /An\s+construc[tț]ie\s*[:=]?\s*(\d{4})/i,
    /Construit\s+(?:in|în)\s+(\d{4})/i,
  ],
  year_audit: [
    /Data\s+(?:elaborare|emiterii)\s*[:=]?\s*\d{1,2}[\.\/-](\d{1,2})[\.\/-](\d{4})/i,
    /Anul\s+auditului\s*[:=]?\s*(\d{4})/i,
  ],
});

/**
 * Parse număr românesc (virgulă ca separator zecimal) → JS Number.
 *
 * @param {string} s
 * @returns {number|null}
 */
function parseRoNumber(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

/**
 * Extracție date cheie din text PDF cu pattern matching.
 *
 * @param {string} text — text extras din PDF
 * @returns {object} câmpuri populate (EP, clasă, CO₂, U, Au, V, n50, an)
 */
export function extractAuditMetrics(text) {
  if (!text || typeof text !== "string") return {};

  const result = {};

  for (const [field, patterns] of Object.entries(PATTERNS)) {
    for (const pat of patterns) {
      const m = pat.exec(text);
      if (m && m[1]) {
        // EP class e literal (A+, B, etc.); restul sunt numere
        if (field === "ep_class") {
          result[field] = m[1].toUpperCase();
        } else if (field === "year_built" || field === "year_audit") {
          result[field] = parseInt(m[1], 10);
        } else {
          const n = parseRoNumber(m[1]);
          if (n !== null) result[field] = n;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Parse PDF la text raw via pdfjs-dist (best-effort).
 *
 * NOTE: pdfjs-dist NU e încă în package.json. Funcția returnează null gracefully
 * dacă lib lipsește; consumatorii pot folosi extractAuditMetrics direct cu text
 * preluat manual sau via Claude Vision API.
 *
 * @param {Blob|ArrayBuffer|Uint8Array} input
 * @returns {Promise<string|null>}
 */
export async function parsePdfToText(input) {
  try {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    let buffer;
    if (input instanceof Blob) buffer = await input.arrayBuffer();
    else if (input instanceof ArrayBuffer) buffer = input;
    else if (input?.buffer) buffer = input.buffer.slice(input.byteOffset || 0, (input.byteOffset || 0) + input.byteLength);
    else return null;

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(" ") + "\n";
    }
    return text;
  } catch (e) {
    console.warn("[prior-audit-parser] pdfjs-dist indisponibil sau eroare:", e?.message);
    return null;
  }
}

/**
 * Wrapper end-to-end: parse PDF audit precedent + extract metrics + map la
 * câmpuri Step 5 (pre-fill).
 *
 * @param {Blob|ArrayBuffer|Uint8Array} input
 * @returns {Promise<{
 *   text: string|null,
 *   metrics: object,
 *   stepFields: object — { building.areaUseful, instSummary.ep_total_m2, etc. }
 * }>}
 */
export async function parseAndMapPriorAudit(input) {
  const text = await parsePdfToText(input);
  if (!text) {
    return { text: null, metrics: {}, stepFields: {}, source: "no-text-extracted" };
  }
  const metrics = extractAuditMetrics(text);
  const stepFields = {
    "building.areaUseful": metrics.area_useful || null,
    "building.areaBuilt": metrics.area_built || null,
    "building.volume": metrics.volume || null,
    "building.n50": metrics.n50 || null,
    "building.yearBuilt": metrics.year_built || null,
    "instSummary.ep_total_m2": metrics.ep_primary || null,
    "instSummary.co2_total_m2": metrics.co2 || null,
    "envelopeSummary.U_med": metrics.u_med || null,
    "energyClass.cls": metrics.ep_class || null,
    "audit.year": metrics.year_audit || null,
  };
  // Filtrare valori null
  const filteredFields = {};
  for (const [k, v] of Object.entries(stepFields)) {
    if (v !== null && v !== undefined && v !== "") filteredFields[k] = v;
  }

  return {
    text: text.slice(0, 5000), // truncate text pentru a nu bloat-a state-ul
    metrics,
    stepFields: filteredFields,
    source: "pdfjs-text",
  };
}
