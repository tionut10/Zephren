/**
 * sanitize-html.js — Sanitizer HTML minimal fără dependențe externe.
 *
 * Sprint 20 (18 apr 2026). Folosit ca substitut DOMPurify pentru conținut
 * derivat din input utilizator în contexte `dangerouslySetInnerHTML` și
 * `document.write`. NU înlocuiește DOMPurify pentru cazuri complexe — pentru
 * conținut HTML arbitrar instalați `dompurify` (4 KB gzipped) și apelați
 * `DOMPurify.sanitize(html)`.
 *
 * Strategii:
 *   - `sanitizeSvg(raw)` — curăță SVG user-provided (ThermalBridgeCatalog,
 *      thermalMap, thermalSVG): elimină `<script>`, handleri `on*=...`,
 *      `href="javascript:..."`, `xlink:href="data:..."` cu payload executabil.
 *   - `sanitizeText(raw)` — elimină caractere de control + escape HTML (pentru
 *      nume client, inserate în șabloane print/export).
 *   - `safePrintWindow(title, bodyHtml)` — helper pentru fereastră print,
 *      rulează `sanitizeSvg` / `sanitizeText` pe conținut.
 */

// ── Sanitizare SVG (conservator) ──────────────────────────────────────────

const SVG_DANGEROUS_ATTRS = [
  "onload", "onclick", "onerror", "onmouseover", "onmouseenter", "onmouseleave",
  "onmouseout", "onfocus", "onblur", "onchange", "onsubmit", "ondblclick",
  "onkeydown", "onkeyup", "onkeypress", "oncopy", "onpaste", "ondrag",
  "onabort", "onbegin", "onend", "onrepeat", "onanimationstart",
  "onanimationend", "onanimationiteration", "ontransitionend",
];

/**
 * Curăță un SVG/HTML fragment — elimină scripturi și handlere eveniment.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeSvg(raw) {
  if (!raw || typeof raw !== "string") return "";

  let s = raw;

  // 1. Elimină <script>...</script> (inclusiv imbrecate sau auto-închise)
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  s = s.replace(/<script\b[^>]*\/>/gi, "");
  s = s.replace(/<script\b[^>]*>/gi, ""); // fragment descoperit

  // 2. Elimină <iframe>, <object>, <embed>, <foreignObject> (pot executa script)
  s = s.replace(/<(iframe|object|embed|foreignObject)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "");
  s = s.replace(/<(iframe|object|embed|foreignObject)\b[^>]*\/?>/gi, "");

  // 3. Elimină atribute on*= (case-insensitive, cu ghilimele sau fără)
  for (const attr of SVG_DANGEROUS_ATTRS) {
    const re = new RegExp(`\\s${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "gi");
    s = s.replace(re, "");
  }
  // Generic fallback — orice on<cuvant>=...
  s = s.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 4. Blochează href/src cu javascript: sau data:text/html
  s = s.replace(/\s(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");
  s = s.replace(/\s(href|src|xlink:href)\s*=\s*(["'])\s*data:text\/html[^"']*\2/gi, "");
  s = s.replace(/\s(href|src|xlink:href)\s*=\s*(["'])\s*vbscript:[^"']*\2/gi, "");

  // 5. Elimină atribute `style` care conțin expression()/behavior:url() (legacy IE)
  s = s.replace(/\sstyle\s*=\s*(["'])[^"']*(?:expression|behavior)[^"']*\1/gi, "");

  return s;
}

/**
 * Escape text → HTML-safe (pentru inserție sigură în document.write + template).
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeText(raw) {
  if (raw == null) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\x00/g, ""); // elimină NUL
}

/**
 * Deschide o fereastră nouă pentru print cu conținut HTML, folosind
 * mecanism mai sigur decât document.write direct: creează un Blob URL.
 *
 * @param {string} titleText — titlu (va fi escape-uit)
 * @param {string} bodyHtml — HTML-ul care poate conține input user, TREBUIE
 *   pre-sanitizat de caller folosind sanitizeSvg/sanitizeText acolo unde e cazul.
 * @returns {Window | null}
 */
export function safePrintWindow(titleText, bodyHtml) {
  const doc = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">` +
    `<title>${sanitizeText(titleText || "Zephren")}</title>` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; script-src 'none'">` +
    `</head><body>${bodyHtml || ""}</body></html>`;
  try {
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    // Revoke după 30s — suficient pentru render + print dialog
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return w;
  } catch {
    // Fallback la document.write dacă Blob blocat
    const w = window.open("", "_blank");
    if (w) { w.document.write(doc); w.document.close(); }
    return w;
  }
}

export default { sanitizeSvg, sanitizeText, safePrintWindow };
