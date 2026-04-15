/**
 * exportPng.js — Utilitare pentru export PNG al vizualizărilor termice.
 *
 * - exportSvgAsPng(svgEl, opts) — serializează un <svg> și produce un PNG via Canvas.
 * - exportDomAsPng(domEl, opts) — capturează un fragment DOM (ex: cutie 3D CSS) folosind
 *   html2canvas (deja existent în deps). Lazy import pentru a nu îngreuna bundle-ul.
 * - downloadBlob(blob, filename) — declanșează descărcare în browser.
 */

const DEFAULT_PIXEL_RATIO = 2;

/**
 * Forțează descărcarea unui Blob ca fișier (creează <a> temporar).
 */
export function downloadBlob(blob, filename) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Convertește un <svg> la PNG.
 * @param {SVGElement} svgEl
 * @param {Object} [opts]
 * @param {number} [opts.pixelRatio=2] - Multiplicator rezoluție
 * @param {string} [opts.background="#020617"] - Culoare fundal canvas (slate-950)
 * @returns {Promise<Blob>}
 */
export async function exportSvgAsPng(svgEl, opts = {}) {
  if (!svgEl) throw new Error("SVG element required");
  const pixelRatio = opts.pixelRatio || DEFAULT_PIXEL_RATIO;
  const background = opts.background || "#020617";

  // Determină dimensiuni — folosim viewBox dacă există, sau bbox
  let width, height;
  const vb = svgEl.viewBox?.baseVal;
  if (vb && vb.width > 0) {
    width = vb.width;
    height = vb.height;
  } else {
    const r = svgEl.getBoundingClientRect();
    width = r.width;
    height = r.height;
  }

  // Clonează și asigură dimensiuni explicit (necesar pentru serializare)
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = typeof window !== "undefined" && window.btoa
    ? window.btoa(unescape(encodeURIComponent(xml)))
    : Buffer.from(xml, "utf8").toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${svg64}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob returned null"));
      }, "image/png");
    };
    img.onerror = (e) => reject(new Error("Image load failed: " + e?.message));
    img.src = dataUrl;
  });
}

/**
 * Capturează un fragment DOM (cu CSS 3D transforms) ca PNG via html2canvas.
 * Lazy import — html2canvas e ~200KB.
 * @param {HTMLElement} domEl
 * @param {Object} [opts]
 * @returns {Promise<Blob>}
 */
export async function exportDomAsPng(domEl, opts = {}) {
  if (!domEl) throw new Error("DOM element required");
  const html2canvasMod = await import("html2canvas");
  const html2canvas = html2canvasMod.default || html2canvasMod;
  const canvas = await html2canvas(domEl, {
    backgroundColor: opts.background || "#020617",
    scale: opts.pixelRatio || DEFAULT_PIXEL_RATIO,
    logging: false,
    useCORS: true,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob returned null"));
    }, "image/png");
  });
}

/**
 * Construiește un nume de fișier standard pentru export.
 */
export function buildExportFilename(viewName, projectName) {
  const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const proj = projectName ? `-${safe(projectName)}` : "";
  return `zephren-termic-${safe(viewName)}${proj}-${ts}.png`;
}
