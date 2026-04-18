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
