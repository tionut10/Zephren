/**
 * cades-detached-sign.js — Semnătură CAdES B-T detașată (PKCS#7) pentru documente
 * standalone (manifest SHA-256, scrisoare însoțire, etc.).
 *
 * Conform ETSI EN 319 122-1 (CAdES baseline) + RFC 5652 (CMS) + eIDAS 2.
 *
 * Diferență față de PAdES (encapsulated în /Contents PDF):
 *   - CAdES detașat = fișier .p7s standalone, separat de fișierul semnat
 *   - Document original NESCHIMBAT (TXT/JSON/etc rămân byte-perfect)
 *   - Verificare: cititorul are nevoie de AMBELE fișiere (original + .p7s)
 *
 * Folosit pentru:
 *   - Manifest SHA-256 dosar audit (Art. 11 Ord. 348/2026 — deduplicare MDLPA)
 *   - Scrisoare însoțire MDLPA (cover-letter.pdf.p7s)
 *   - Plan M&V (când e cerut semnat la depunere)
 *
 * Reutilizează providerii din qtsp-providers/ (mock + certSIGN) prin factory.
 * Provider-ele întorc CMS SignedData hex — extragem bytes pentru .p7s standalone.
 *
 * Sprint Conformitate P0-03 (6 mai 2026).
 */

import { getProvider } from "./qtsp-providers/index.js";
import { PADES_SUBFILTERS } from "./pades-sign.js";

/**
 * Calculează SHA-256 hash al unui buffer.
 *
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>} hash 32 octeți
 */
async function sha256(bytes) {
  const subtle = (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle)
    ? globalThis.crypto.subtle
    : null;
  if (!subtle) {
    throw new Error("Web Crypto API not available — required for CAdES signing");
  }
  const hashBuf = await subtle.digest("SHA-256", bytes);
  return new Uint8Array(hashBuf);
}

/**
 * Convertește hex string în Uint8Array.
 *
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  // Trim whitespace în caz că vine din XML/PEM
  const clean = String(hex || "").replace(/\s+/g, "").replace(/^0x/, "");
  if (clean.length % 2 !== 0) {
    throw new Error("[CAdES] hex string trebuie să aibă lungime pară");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

/**
 * Normalizează input la Uint8Array (cross-realm safe).
 *
 * @param {Uint8Array|ArrayBuffer|Blob|string} input
 * @returns {Promise<Uint8Array>}
 */
async function normalizeBytes(input) {
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  if (input instanceof Blob) {
    const ab = await input.arrayBuffer();
    return new Uint8Array(ab.slice(0));
  }
  // Duck-typing pentru typed array (Uint8Array etc.) — au .byteLength + .buffer
  if (input && typeof input.byteLength === "number" && input.buffer) {
    return new Uint8Array(input.buffer.slice(
      input.byteOffset || 0,
      (input.byteOffset || 0) + input.byteLength,
    ));
  }
  // Duck-typing pentru ArrayBuffer — are .byteLength + .slice (fără .buffer)
  if (input && typeof input.byteLength === "number" && typeof input.slice === "function") {
    return new Uint8Array(input.slice(0));
  }
  throw new Error("[CAdES] input nesuportat (acceptă Uint8Array | ArrayBuffer | Blob | string)");
}

/**
 * Semnează un document cu CAdES B-T detașat.
 *
 * @param {Uint8Array|ArrayBuffer|Blob|string} content — conținutul de semnat
 * @param {object} signerConfig
 * @param {string} signerConfig.provider — „mock" | „certsign" | ...
 * @param {object} [signerConfig.credentials]
 * @param {object} [options]
 * @param {Date} [options.signingTime]
 * @param {string} [options.contentType] — pentru log/audit (text/plain, application/json)
 * @returns {Promise<{
 *   p7sBytes: Uint8Array,
 *   p7sHex: string,
 *   contentHash: Uint8Array,
 *   contentHashHex: string,
 *   signerInfo: object,
 *   signedAt: string
 * }>}
 */
export async function signCadesDetached(content, signerConfig = {}, options = {}) {
  const bytes = await normalizeBytes(content);
  const contentHash = await sha256(bytes);
  const signingTime = options.signingTime || new Date();

  // Apel provider — primim CMS hex (același API ca pentru PAdES)
  const provider = signerConfig.provider || "mock";
  const signerImpl = await getProvider(provider, signerConfig.credentials);
  const signResult = await signerImpl.sign(contentHash, {
    signingTime,
    subFilter: PADES_SUBFILTERS.ETSI_CADES_DETACHED,
    level: "B-T",
  });

  // CMS hex → bytes pentru fișier .p7s standalone
  const p7sBytes = hexToBytes(signResult.cmsHex);

  // Hex content hash pentru audit
  let contentHashHex = "";
  for (const b of contentHash) contentHashHex += b.toString(16).padStart(2, "0");

  return {
    p7sBytes,
    p7sHex: signResult.cmsHex,
    contentHash,
    contentHashHex,
    signedAt: signingTime.toISOString(),
    signerInfo: {
      provider,
      providerLabel: signResult.providerLabel || provider,
      certificateSubject: signResult.certificateSubject || null,
      certificateIssuer: signResult.certificateIssuer || null,
      isMock: signResult.isMock === true,
      warnings: signResult.warnings || [],
      contentType: options.contentType || "application/octet-stream",
    },
  };
}

/**
 * Verifică integritatea unui pachet CAdES detașat (recalculează hash + match
 * cu hash-ul din .p7s — best-effort fără validare cripto reală pentru mock).
 *
 * Pentru validare strictă, folosește o librărie ASN.1 dedicată (pkijs, node-forge).
 *
 * @param {Uint8Array|ArrayBuffer|Blob|string} content — fișierul original
 * @param {Uint8Array} p7sBytes — semnătura detașată
 * @returns {Promise<{
 *   contentHashOk: boolean,
 *   contentHashHex: string,
 *   p7sLength: number,
 *   structurallyValid: boolean
 * }>}
 */
export async function verifyCadesDetached(content, p7sBytes) {
  const contentBytes = await normalizeBytes(content);
  const contentHash = await sha256(contentBytes);
  let contentHashHex = "";
  for (const b of contentHash) contentHashHex += b.toString(16).padStart(2, "0");

  // Heuristic: hash-ul originalului apare ca substring în CMS bytes (mock signer
  // include hash-ul în payload). Pentru CAdES real, hash-ul e în SignedAttributes
  // → trebuie parsare ASN.1 propriu-zisă. MVP best-effort.
  const p7sHex = Array.from(p7sBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const contentHashOk = p7sHex.includes(contentHashHex);

  // Structurally valid: începe cu tag SEQUENCE 0x30, are minim ~64 bytes
  const structurallyValid = p7sBytes.length >= 32 &&
    p7sBytes[0] === 0x30 &&
    (p7sBytes[1] === 0x82 || p7sBytes[1] === 0x81 || (p7sBytes[1] & 0x80) === 0);

  return {
    contentHashOk,
    contentHashHex,
    p7sLength: p7sBytes.length,
    structurallyValid,
  };
}
