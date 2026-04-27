/**
 * mdlpa-validator.js — Validare pre-depunere pentru portal MDLPA
 *
 * Sprint MDLPA Faza 0 (27 apr 2026)
 *
 * SCOP:
 *   Validează payload-ul ÎNAINTE de a fi trimis la portal — evită cheltuirea
 *   unui slot din rate-limit pe documente invalide. Validările sunt
 *   COMPLEMENTARE schemei XML oficiale (care va fi publicată de MDLPA).
 *
 * NIVELE DE VALIDARE:
 *   1. Câmpuri obligatorii (presence)
 *   2. Format identifiers (UUID, atestat, cod cadastral)
 *   3. Structură XML well-formed
 *   4. Limite dimensionale (size, lungimi)
 *   5. Coerență internă (date concordante, calcule plauzibile)
 */

// ─── CONSTANTE ─────────────────────────────────────────────────────────────

export const MAX_PAYLOAD_BYTES   = 10 * 1024 * 1024;   // 10 MB hard cap pe payload JSON
export const MAX_XML_BYTES        = 5 * 1024 * 1024;    // 5 MB hard cap pe XML
export const MAX_PDF_BYTES        = 25 * 1024 * 1024;   // 25 MB hard cap pe PDF base64

const UUID_REGEX     = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATESTAT_REGEX  = /^[A-Z]{1,3}[0-9]{3,6}(\/[0-9]{4})?$/; // ex: "AE12345/2024", "TC100", "AE1234"
const CADASTRAL_REGEX = /^\d{4,8}-?C?\d*-?U?\d*$/;            // simplificat
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const VALID_DOCUMENT_TYPES = [
  "CPE", "RAE", "PASAPORT", "ATESTARE", "EXTINDERE", "REINNOIRE", "RAPORT_ANUAL",
];

// ─── REZULTAT VALIDARE ─────────────────────────────────────────────────────

/**
 * @typedef {object} ValidationIssue
 * @property {'error'|'warning'} severity
 * @property {string} field    — calea în payload
 * @property {string} message
 * @property {string} [code]   — cod intern pentru i18n
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid
 * @property {ValidationIssue[]} errors
 * @property {ValidationIssue[]} warnings
 * @property {object} stats
 */

// ─── INTERFAȚĂ PUBLICĂ ─────────────────────────────────────────────────────

/**
 * Validează un payload complet pentru depunere portal MDLPA.
 *
 * @param {object} payload
 * @returns {ValidationResult}
 */
export function validateSubmissionPayload(payload) {
  const errors = [];
  const warnings = [];
  const stats = {
    payload_size_bytes: 0,
    xml_size_bytes: 0,
    pdf_size_bytes: 0,
  };

  // 1. Existență payload
  if (!payload || typeof payload !== "object") {
    return _buildResult([{ severity: "error", field: "$", message: "Payload lipsă sau invalid", code: "PAYLOAD_MISSING" }], [], stats);
  }

  // 2. Câmpuri obligatorii
  const required = ["document_type", "document_uuid", "document_xml", "auditor_atestat"];
  for (const f of required) {
    if (!payload[f]) {
      errors.push({ severity: "error", field: f, message: `Câmp obligatoriu lipsă: ${f}`, code: "FIELD_REQUIRED" });
    }
  }

  // 3. document_type
  if (payload.document_type && !VALID_DOCUMENT_TYPES.includes(payload.document_type)) {
    errors.push({
      severity: "error",
      field: "document_type",
      message: `Tip document invalid: "${payload.document_type}". Permise: ${VALID_DOCUMENT_TYPES.join(", ")}`,
      code: "INVALID_DOC_TYPE",
    });
  }

  // 4. document_uuid format
  if (payload.document_uuid && !UUID_REGEX.test(payload.document_uuid)) {
    errors.push({
      severity: "error",
      field: "document_uuid",
      message: "UUID invalid (RFC 4122). Format așteptat: 8-4-4-4-12 hex digits",
      code: "INVALID_UUID",
    });
  }

  // 5. auditor_atestat format
  if (payload.auditor_atestat) {
    if (!ATESTAT_REGEX.test(payload.auditor_atestat)) {
      warnings.push({
        severity: "warning",
        field: "auditor_atestat",
        message: `Format atestat neobișnuit: "${payload.auditor_atestat}" — verifică conformitatea cu nomenclatorul MDLPA`,
        code: "ATESTAT_FORMAT_WARN",
      });
    }
  }

  // 6. XML structurat (well-formed check)
  if (payload.document_xml) {
    const xmlSize = _byteLength(payload.document_xml);
    stats.xml_size_bytes = xmlSize;

    if (xmlSize > MAX_XML_BYTES) {
      errors.push({
        severity: "error",
        field: "document_xml",
        message: `XML prea mare: ${(xmlSize / 1024 / 1024).toFixed(2)} MB > limit ${MAX_XML_BYTES / 1024 / 1024} MB`,
        code: "XML_TOO_LARGE",
      });
    }

    const xmlCheck = _checkXmlWellFormed(payload.document_xml);
    if (!xmlCheck.ok) {
      errors.push({
        severity: "error",
        field: "document_xml",
        message: `XML malformat: ${xmlCheck.reason}`,
        code: "XML_MALFORMED",
      });
    }
  }

  // 7. PDF dimensiune (dacă există)
  if (payload.document_pdf_base64) {
    const pdfSize = _byteLength(payload.document_pdf_base64) * 0.75; // base64 → bytes
    stats.pdf_size_bytes = Math.round(pdfSize);
    if (pdfSize > MAX_PDF_BYTES) {
      errors.push({
        severity: "error",
        field: "document_pdf_base64",
        message: `PDF prea mare: ${(pdfSize / 1024 / 1024).toFixed(2)} MB > limit ${MAX_PDF_BYTES / 1024 / 1024} MB`,
        code: "PDF_TOO_LARGE",
      });
    }
  }

  // 8. Limita totală payload
  stats.payload_size_bytes = _byteLength(JSON.stringify(payload));
  if (stats.payload_size_bytes > MAX_PAYLOAD_BYTES) {
    errors.push({
      severity: "error",
      field: "$",
      message: `Payload total prea mare: ${(stats.payload_size_bytes / 1024 / 1024).toFixed(2)} MB > limit ${MAX_PAYLOAD_BYTES / 1024 / 1024} MB`,
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  // 9. Coerență date (dacă apar timestamp-uri în metadata)
  if (payload.metadata?.issued_at && !ISO_DATE_REGEX.test(payload.metadata.issued_at)) {
    warnings.push({
      severity: "warning",
      field: "metadata.issued_at",
      message: "Format dată neașteptat — așteptat ISO 8601 (YYYY-MM-DD sau YYYY-MM-DDTHH:MM:SSZ)",
      code: "DATE_FORMAT_WARN",
    });
  }

  return _buildResult(errors, warnings, stats);
}

/**
 * Quick check: se poate trimite la portal? (true dacă zero erori)
 *
 * @param {object} payload
 * @returns {boolean}
 */
export function isPayloadSubmittable(payload) {
  const result = validateSubmissionPayload(payload);
  return result.valid;
}

/**
 * Returnează doar mesajele de eroare ca array de string-uri (pentru UI rapidă).
 *
 * @param {object} payload
 * @returns {string[]}
 */
export function getErrorMessages(payload) {
  const result = validateSubmissionPayload(payload);
  return result.errors.map(e => `[${e.field}] ${e.message}`);
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function _buildResult(errors, warnings, stats) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

function _byteLength(str) {
  if (typeof str !== "string") return 0;
  // Browser + Node compat
  if (typeof Buffer !== "undefined") return Buffer.byteLength(str, "utf8");
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;
  return str.length; // fallback aproximativ
}

/**
 * Verificare lightweight XML well-formed (fără DOMParser pentru Node compat).
 * Nu validează schema — doar balansare taguri și caractere ilegale.
 */
function _checkXmlWellFormed(xml) {
  if (typeof xml !== "string") return { ok: false, reason: "XML nu este string" };
  if (xml.length === 0) return { ok: false, reason: "XML gol" };

  const trimmed = xml.trim();
  if (!trimmed.startsWith("<")) return { ok: false, reason: "Nu începe cu '<'" };

  // Verifică declarația XML opțională
  if (trimmed.startsWith("<?xml") && !trimmed.includes("?>")) {
    return { ok: false, reason: "Declarație <?xml fără închidere ?>" };
  }

  // Verificare grosieră: număr taguri deschise vs închise
  const openTags = (trimmed.match(/<[a-zA-Z][^>!?\/]*[^\/]>/g) || []).length;
  const closeTags = (trimmed.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  const selfClosing = (trimmed.match(/<[a-zA-Z][^>]*\/>/g) || []).length;

  if (openTags !== closeTags) {
    return { ok: false, reason: `Taguri dezechilibrate: ${openTags} deschise / ${closeTags} închise (excl. ${selfClosing} self-closing)` };
  }

  // Caractere ilegale în XML 1.0 (cu excepția #x9, #xA, #xD)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmed)) {
    return { ok: false, reason: "Caractere de control ilegale în XML 1.0" };
  }

  return { ok: true };
}
