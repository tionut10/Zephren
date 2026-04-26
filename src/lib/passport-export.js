/**
 * Export pașaport renovare EPBD 2024/1275 Art. 12 — JSON + XML + clipboard.
 * Toate exporturile generează fișier download prin Blob + anchor.
 */

import { XML_SCHEMA_NAMESPACE } from "../data/renovation-passport-schema.js";

function defaultFilename(passport, ext) {
  const id = (passport?.passportId || "nou").slice(0, 8);
  const date = (passport?.timestamp || new Date().toISOString()).slice(0, 10);
  return `pasaport_renovare_${id}_${date}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { size: blob.size, filename };
}

export function exportPassportJSON(passport, options = {}) {
  const { prettify = true, filename } = options;
  const json = JSON.stringify(passport, null, prettify ? 2 : 0);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  return triggerDownload(blob, filename || defaultFilename(passport, "json"));
}

export function copyPassportToClipboard(passport) {
  const json = JSON.stringify(passport, null, 2);
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(json);
  }
  return Promise.reject(new Error("Clipboard API indisponibil"));
}

// ──────────────────────────────────────────────
// XML conversion
// ──────────────────────────────────────────────

const XML_TAG_FALLBACK = /[^a-zA-Z0-9_\-]/g;

function safeTagName(name) {
  if (typeof name !== "string" || name.length === 0) return "item";
  // XML: must start with letter or underscore
  let cleaned = name.replace(XML_TAG_FALLBACK, "_");
  if (!/^[a-zA-Z_]/.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convertește obiect JS în fragment XML. Arrays — fiecare item ca <nodeName>.
 */
export function jsonToXml(obj, nodeName = "value", indent = 0, xmlns = null) {
  const pad = "  ".repeat(indent);
  const tag = safeTagName(nodeName);
  const ns = xmlns ? ` xmlns="${escapeXml(xmlns)}"` : "";

  if (obj === null || obj === undefined) {
    return `${pad}<${tag}${ns}/>\n`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}<${tag}${ns}/>\n`;
    return obj.map((item) => jsonToXml(item, nodeName, indent)).join("");
  }

  if (typeof obj !== "object") {
    return `${pad}<${tag}${ns}>${escapeXml(obj)}</${tag}>\n`;
  }

  const children = Object.entries(obj)
    .map(([k, v]) => jsonToXml(v, k, indent + 1))
    .join("");
  if (!children) return `${pad}<${tag}${ns}/>\n`;
  return `${pad}<${tag}${ns}>\n${children}${pad}</${tag}>\n`;
}

export function passportToXml(passport) {
  const body = jsonToXml(passport, "renovationPassport", 0, XML_SCHEMA_NAMESPACE);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

export function exportPassportXML(passport, options = {}) {
  const { filename } = options;
  const xml = passportToXml(passport);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  return triggerDownload(blob, filename || defaultFilename(passport, "xml"));
}

// ──────────────────────────────────────────────
// PDF export — basic 1-page A4 (jsPDF + autoTable)
// EPBD 2024 Art. 12 acceptă format vizual lizibil pentru beneficiar.
// ──────────────────────────────────────────────

export async function exportPassportPDF(passport, options = {}) {
  const { filename, building = {}, auditor = {}, energyClass, epPrimary } = options;
  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Patch autoTable v5 (nu mai patch-ează prototipul automat)
  if (typeof doc.autoTable !== "function" && typeof autoTableFn === "function") {
    doc.autoTable = function (opts) {
      const r = autoTableFn(doc, opts);
      if (!doc.lastAutoTable && r) doc.lastAutoTable = r;
      return doc.lastAutoTable;
    };
  }

  // Font Roboto pentru diacritice ro (ă â î ș ț). Fallback transliterare.
  let normalize = (t) => t;
  try {
    const { setupRomanianFont, normalizeForPdf } = await import("../utils/pdf-fonts.js");
    const ok = await setupRomanianFont(doc);
    normalize = (t) => typeof t === "string" ? normalizeForPdf(t, ok) : t;
    const origText = doc.text.bind(doc);
    doc.text = (text, ...args) => origText(
      Array.isArray(text) ? text.map(normalize) : normalize(text), ...args
    );
  } catch (_) { /* fallback Helvetica raw */ }

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ── Header bandă albastră ──
  doc.setFillColor(13, 71, 161); // blue-800
  doc.rect(0, 0, w, 28, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  doc.text("PAȘAPORT RENOVARE EPBD", w / 2, 13, { align: "center" });
  doc.setFont(undefined, "normal"); doc.setFontSize(9);
  doc.setTextColor(200, 220, 240);
  doc.text("Directiva (UE) 2024/1275 Art. 12 — obligatoriu de la 29 mai 2026", w / 2, 20, { align: "center" });

  // ── ID pașaport (subtitle) ──
  doc.setFontSize(8); doc.setTextColor(180, 200, 220);
  const passportId = passport?.passportId || passport?.generatedAt || "—";
  doc.text(`ID: ${String(passportId).slice(0, 36)}`, w / 2, 25, { align: "center" });

  let y = 38;

  // ── Secțiune 1: Identificare clădire ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("1. Identificare clădire", 14, y); y += 2;
  doc.setDrawColor(13, 71, 161); doc.setLineWidth(0.4); doc.line(14, y, w - 14, y); y += 4;

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    body: [
      ["Adresă", building?.address || passport?.building?.address || "—"],
      ["Categorie funcțională", building?.category || passport?.building?.category || "—"],
      ["Suprafață utilă", `${building?.areaUseful || passport?.building?.areaUseful || "—"} m²`],
      ["An construcție", String(building?.yearBuilt || passport?.building?.yearBuilt || "—")],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Secțiune 2: Performanță actuală ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("2. Performanța energetică actuală", 14, y); y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  // Badge clasă energetică
  const cls = String(energyClass || passport?.currentState?.energyClass || "—").trim();
  const ep = epPrimary ?? passport?.currentState?.epPrimary ?? 0;
  const classColors = { A: [22, 163, 74], B: [132, 204, 22], C: [234, 179, 8], D: [249, 115, 22], E: [239, 68, 68], F: [185, 28, 28], G: [127, 29, 29] };
  const [cr, cg, cb] = classColors[cls] || [100, 100, 100];
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(14, y, 26, 22, 3, 3, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(cls, 27, y + 14, { align: "center" });
  doc.setFontSize(7); doc.text("CLASĂ", 27, y + 19, { align: "center" });

  doc.setTextColor(0, 0, 0); doc.setFont(undefined, "normal"); doc.setFontSize(10);
  doc.text(`EP primar: ${typeof ep === "number" ? ep.toFixed(1) : ep} kWh/(m²·an)`, 46, y + 8);
  doc.text(`Format date: ${passport?.format || "EPBD-2024-RO"}`, 46, y + 14);
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text(`Generat la: ${(passport?.generatedAt || passport?.timestamp || new Date().toISOString()).slice(0, 10)}`, 46, y + 19);
  y += 28;

  // ── Secțiune 3: Recomandări ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("3. Țintă renovare & recomandări", 14, y); y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  const targetClass = passport?.recommendations?.targetClass || passport?.target?.class || "B";
  const targetYear = passport?.recommendations?.targetYear || passport?.target?.year || 2030;
  const note = passport?.recommendations?.note || passport?.note || "Pașaport basic — pentru analiză LCC + multi-fază + benchmark național, upgrade la Zephren Expert.";

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    body: [
      ["Clasă țintă recomandată", String(targetClass)],
      ["Orizont implementare", String(targetYear)],
      ["Observații", note],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Secțiune 4: Auditor (dacă disponibil) ──
  if (auditor?.name || passport?.generatedBy) {
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("4. Auditor energetic", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      body: [
        ["Auditor", auditor?.name || passport?.generatedBy || "—"],
        ["Atestat MDLPA", `${auditor?.atestat || "—"} / ${auditor?.grade || "—"}`],
        ["Firmă / PFA", auditor?.company || "—"],
      ],
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Footer ──
  doc.setFontSize(7); doc.setTextColor(120, 120, 120);
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
  doc.line(14, h - 14, w - 14, h - 14);
  doc.text("Zephren · Pașaport Renovare EPBD basic · Format JSON+XML+PDF EPBD 2024-RO", 14, h - 10);
  doc.text(`Pag. 1/1`, w - 14, h - 10, { align: "right" });

  // Generează blob și descarcă
  const blob = doc.output("blob");
  return triggerDownload(blob, filename || defaultFilename(passport, "pdf"));
}
