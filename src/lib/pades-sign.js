/**
 * pades-sign.js — Semnături electronice PAdES B-T / B-LT pentru documente Zephren.
 *
 * Implementare conform ETSI EN 319 142-1 (PAdES baseline) + eIDAS 2 (Reg. UE 910/2014
 * modif. 2024/1183) + Legea 214/2024 RO (transpunere eIDAS 2). Acoperă:
 *   - PAdES B-T (Baseline + Time-Stamp): semnătură + timestamp TSA
 *   - PAdES B-LT (B-T + LTV): cert chain + CRL/OCSP în DSS dictionary
 *
 * Bază legală pentru auditul energetic România:
 *   - Art. 4 alin. 6 Ord. MDLPA 348/2026 — portal electronic operațional 8.VII.2026,
 *     necesită semnături electronice calificate pe documente CPE/RAE.
 *   - Art. 17 EPBD 2024/1275 — valabilitate CPE 5/10 ani; LTV obligatoriu pentru
 *     verificare semnătură post-expirare certificat.
 *   - Mc 001-2022 §10 — arhivare 30 ani; semnătură LTV cerută.
 *
 * ARHITECTURĂ:
 *   pades-sign.js (acest fișier) — orchestrator + structură PDF (ByteRange, AcroForm,
 *   SigField, /Contents placeholder, /DSS dictionary)
 *   ↓
 *   qtsp-providers/index.js — factory pentru providers
 *   ↓
 *   qtsp-providers/mock.js — provider mock (self-signed cert + dummy CMS pentru testing)
 *   qtsp-providers/certsign.js — provider REAL certSIGN (REST API + OAuth 2.0)
 *   qtsp-providers/digisign.js — TBD post-onboarding
 *   qtsp-providers/transsped.js — TBD post-onboarding
 *
 * MVP STATUS (Sprint Conformitate P0-02, 6 mai 2026):
 *   - Mock provider: produce structură PAdES B-T validă (ByteRange + AcroForm + Sig dict);
 *     signature bytes sunt deterministically padded — nu verificabile criptografic, dar
 *     structurally compliant cu PDF 2.0 §12.8 + ETSI EN 319 142 §4.2.
 *   - certSIGN provider: skeleton cu interfață REST API + OAuth 2.0 (PARAPHE service);
 *     activare necesită env vars CERTSIGN_CLIENT_ID + CERTSIGN_CLIENT_SECRET + cont
 *     test la certSIGN. Fallback automat la mock în absența credentials.
 *
 * IMPORTANT: pentru lansare comercială, Zephren afișează banner clar UI:
 *   „🟡 Semnătură mock — necesită cont QTSP RO (certSIGN/DigiSign/TransSped/AlfaSign)
 *    pentru valabilitate juridică conform eIDAS 2 + Legea 214/2024."
 *
 * Sprinturi:
 *   - Sprint Conformitate P0-02 (6 mai 2026) — implementare inițială MVP mock + certSIGN skeleton.
 *   - Sprint Conformitate P0-02-bis (TBD) — integrare reală post-onboarding QTSP cu cont test.
 */

import { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFDict } from "pdf-lib";

/**
 * Sub-filtere PAdES standard ETSI EN 319 142-1 §4.1.3.
 * Pentru auditul energetic Zephren folosim ETSI.CAdES.detached pentru toate documentele
 * (CPE, RAE, FIC, DCA, Pașaport, Anexa MDLPA).
 */
export const PADES_SUBFILTERS = Object.freeze({
  // ETSI.CAdES.detached — semnătură PAdES B-B / B-T / B-LT / B-LTA
  ETSI_CADES_DETACHED: "ETSI.CAdES.detached",
  // ETSI.RFC3161 — timestamp standalone
  ETSI_RFC3161: "ETSI.RFC3161",
  // adbe.pkcs7.detached — legacy Adobe PPKLite (NU recomandat pentru EU)
  ADBE_PKCS7_DETACHED: "adbe.pkcs7.detached",
});

/**
 * Niveluri PAdES baseline (ETSI EN 319 142-1 §5).
 */
export const PADES_LEVELS = Object.freeze({
  B_B: "B-B",     // Baseline (signature only)
  B_T: "B-T",     // Baseline + Timestamp
  B_LT: "B-LT",   // Baseline + Long-Term (cert chain + CRL/OCSP)
  B_LTA: "B-LTA", // Baseline + Long-Term + Archive timestamp
});

/**
 * Mărime placeholder pentru /Contents (CMS SignedData hex).
 * 16384 octeți = 32 KB hex; suficient pentru cert chain medium + timestamp + 1-2 OCSP.
 * Pentru cert chains mari sau B-LTA cu archive timestamps, crește la 32768.
 */
export const SIGNATURE_PLACEHOLDER_SIZE = 16384;

/**
 * Pregătește un PDF pentru semnătură PAdES.
 *
 * Adaugă:
 *   - /AcroForm dict cu /Fields [signature_field_ref] + /SigFlags 3 (SignaturesExist + AppendOnly)
 *   - Signature field (Type=Annot, Subtype=Widget, FT=Sig, T=Signature1, F=132 hidden, P=page1, Rect=[0 0 0 0])
 *   - Sig dict cu /Filter, /SubFilter, /Reason, /Location, /M, /Name, /ContactInfo, /ByteRange placeholder, /Contents placeholder
 *
 * Pentru B-LT adaugă și /DSS dictionary cu placeholders pentru cert chain + OCSP/CRL.
 *
 * @param {PDFDocument} pdfDoc
 * @param {object} options
 * @param {string} [options.reason="Certificat performanță energetică"]
 * @param {string} [options.location="București, RO"]
 * @param {string} [options.contactInfo]
 * @param {string} [options.signerName]
 * @param {Date} [options.signingTime]
 * @param {string} [options.subFilter=ETSI_CADES_DETACHED]
 * @param {string} [options.level=B_T]
 * @param {number} [options.placeholderSize=SIGNATURE_PLACEHOLDER_SIZE]
 * @returns {{sigDictRef: import('pdf-lib').PDFRef, fieldRef: import('pdf-lib').PDFRef}}
 */
export function prepareSignaturePlaceholder(pdfDoc, options = {}) {
  const {
    reason = "Certificat de performanță energetică Mc 001-2022",
    location = "București, RO",
    contactInfo = "",
    signerName = "Auditor energetic MDLPA",
    signingTime = new Date(),
    subFilter = PADES_SUBFILTERS.ETSI_CADES_DETACHED,
    level = PADES_LEVELS.B_T,
    placeholderSize = SIGNATURE_PLACEHOLDER_SIZE,
  } = options;

  // 1. Construire Sig dict cu /Contents placeholder umplut cu zerouri
  // /Contents are sintaxă <hex> — placeholder cu „0" repetat de N×2 ori (hex chars)
  const placeholder = "0".repeat(placeholderSize);
  const dateStr = formatPdfDate(signingTime);

  // ByteRange placeholder: [0 ********** ********** **********] cu „*" placeholder
  // pe care îl vom înlocui după ce știm offset-urile finale (post-save).
  // Folosim spații pentru a păstra lungimea fixă a array-ului.
  const sigDict = pdfDoc.context.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: subFilter,
    M: PDFString.of(dateStr),
    Reason: PDFHexString.fromText(reason),
    Location: PDFHexString.fromText(location),
    ContactInfo: PDFHexString.fromText(contactInfo || "audit@zephren.ro"),
    Name: PDFHexString.fromText(signerName),
    // ByteRange + Contents sunt completate după save — trimitem placeholder special.
    // pdf-lib nu acceptă număr text 0xFFFFFFFF în array direct, folosim string sentinel.
    ByteRange: pdfDoc.context.obj([0, 0, 0, 0]), // Va fi rescris post-save
    Contents: PDFHexString.of(placeholder),
    // Property: PAdES level marker (custom)
    Prop_Build: pdfDoc.context.obj({
      Filter: pdfDoc.context.obj({
        Name: "Zephren PAdES Signer",
        Date: PDFString.of(dateStr),
      }),
      App: pdfDoc.context.obj({
        Name: "Zephren v4.0+",
      }),
      Sig: pdfDoc.context.obj({
        Level: level,
      }),
    }),
  });
  const sigDictRef = pdfDoc.context.register(sigDict);

  // 2. Construire signature field (annotation widget invisible)
  const fieldDict = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    T: PDFHexString.fromText("Signature1"),
    F: 132, // bit 3 (Print) + bit 8 (Locked) — invisible widget
    P: pdfDoc.getPage(0).ref,
    Rect: pdfDoc.context.obj([0, 0, 0, 0]),
    V: sigDictRef,
  });
  const fieldRef = pdfDoc.context.register(fieldDict);

  // 3. Adaugă annotation pe page 1
  try {
    const page = pdfDoc.getPage(0);
    let annots = page.node.lookup(PDFName.of("Annots"));
    if (!annots || typeof annots.push !== "function") {
      annots = pdfDoc.context.obj([]);
      page.node.set(PDFName.of("Annots"), annots);
    }
    annots.push(fieldRef);
  } catch (e) {
    console.warn("[PAdES] Failed to add annotation to page 1:", e?.message);
  }

  // 4. Construire / extindere AcroForm
  const catalog = pdfDoc.catalog;
  let acroForm = catalog.lookup(PDFName.of("AcroForm"));
  if (!acroForm || typeof acroForm.set !== "function") {
    acroForm = pdfDoc.context.obj({
      Fields: pdfDoc.context.obj([]),
      SigFlags: 3, // bit 1 (SignaturesExist) + bit 2 (AppendOnly)
    });
    catalog.set(PDFName.of("AcroForm"), acroForm);
  }
  let fields = acroForm.lookup(PDFName.of("Fields"));
  if (!fields || typeof fields.push !== "function") {
    fields = pdfDoc.context.obj([]);
    acroForm.set(PDFName.of("Fields"), fields);
  }
  fields.push(fieldRef);
  acroForm.set(PDFName.of("SigFlags"), pdfDoc.context.obj(3));

  // 5. Pentru level B-LT, pregătim DSS placeholder (populat post-signing)
  if (level === PADES_LEVELS.B_LT || level === PADES_LEVELS.B_LTA) {
    const dssDict = pdfDoc.context.obj({
      Certs: pdfDoc.context.obj([]),
      OCSPs: pdfDoc.context.obj([]),
      CRLs: pdfDoc.context.obj([]),
      VRI: pdfDoc.context.obj({}),
    });
    const dssRef = pdfDoc.context.register(dssDict);
    catalog.set(PDFName.of("DSS"), dssRef);
  }

  return { sigDictRef, fieldRef };
}

/**
 * Format dată PDF — D:YYYYMMDDHHmmSSZ (cf. PDF 1.7 §7.9.4).
 * @param {Date} d
 * @returns {string}
 */
function formatPdfDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `D:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Calculează offset-urile ByteRange după ce PDF-ul este serializat.
 *
 * ByteRange acoperă tot PDF-ul EXCEPTÂND blocul /Contents <hex>:
 *   ByteRange = [0 contentsStart contentsEnd (totalSize - contentsEnd)]
 *
 * Caută în PDF-ul serializat marker-ul `/Contents <` și `>` pentru a determina
 * offset-urile exacte ale placeholder-ului hex.
 *
 * @param {Uint8Array} pdfBytes
 * @returns {{contentsStart: number, contentsEnd: number, byteRange: number[]}|null}
 */
export function locateContentsRange(pdfBytes) {
  const text = new TextDecoder("latin1").decode(pdfBytes);

  // Caută /Contents <00...> placeholder (zerouri hex pure)
  // Pattern: /Contents urmat de spații/newlines apoi <hex>
  const re = /\/Contents\s*<([0-9a-fA-F]+)>/;
  const match = re.exec(text);
  if (!match) return null;

  // Offset-ul lui `<` (start hex content)
  const tagStart = text.indexOf("<", match.index);
  if (tagStart < 0) return null;
  const tagEnd = text.indexOf(">", tagStart);
  if (tagEnd < 0) return null;

  // ByteRange acoperă: [0..tagStart] și [tagEnd+1..end]
  // tagStart = offset al lui `<` (inclus în prima regiune)
  // tagEnd+1 = offset după `>` (start a doua regiune)
  const contentsStart = tagStart;        // include `<`
  const contentsEnd = tagEnd + 1;        // include `>`
  const totalSize = pdfBytes.length;

  return {
    contentsStart,
    contentsEnd,
    byteRange: [
      0,
      contentsStart,
      contentsEnd,
      totalSize - contentsEnd,
    ],
    contentsHexStart: tagStart + 1,     // primul char hex
    contentsHexLength: tagEnd - tagStart - 1, // numărul de hex chars
  };
}

/**
 * Expandează `/ByteRange [0 0 0 0]` (placeholder pdf-lib) la fixed-width 10-digit
 * `/ByteRange [0 9999999999 9999999999 9999999999]` pentru a acomoda valori reale
 * post-signing (offset-uri în PDF-uri până la ~9.9 GB).
 *
 * Această funcție trebuie apelată DUPĂ pdfDoc.save() și ÎNAINTE de
 * locateContentsRange + rewriteByteRangeInPdf. Garantează că rewrite-ul nu
 * întâlnește placeholder-ul prea mic.
 *
 * @param {Uint8Array} pdfBytes
 * @returns {Uint8Array}
 */
export function expandByteRangePlaceholder(pdfBytes) {
  const text = new TextDecoder("latin1").decode(pdfBytes);
  // Găsește /ByteRange [0 0 0 0] sau [0  0  0  0] (cu spații variabile)
  const re = /\/ByteRange\s*\[\s*0\s+0\s+0\s+0\s*\]/;
  const match = re.exec(text);
  if (!match) {
    // Nu e nimic de expandat (poate deja expandat sau lipsește)
    return pdfBytes;
  }
  // Placeholder fixed-width: 10 cifre per număr → max valoare 9.9 GB
  const expanded = "/ByteRange [0 9999999999 9999999999 9999999999]";
  const before = pdfBytes.slice(0, match.index);
  const after = pdfBytes.slice(match.index + match[0].length);
  const replBytes = new TextEncoder().encode(expanded);
  const result = new Uint8Array(before.length + replBytes.length + after.length);
  result.set(before, 0);
  result.set(replBytes, before.length);
  result.set(after, before.length + replBytes.length);
  return result;
}

/**
 * Înlocuiește ByteRange placeholder cu valori reale calculate post-save.
 *
 * Necesită ca PDF-ul să aibă deja un placeholder fixed-width (după
 * expandByteRangePlaceholder). Padding-ul cu spații înăuntrul array-ului păstrează
 * offset-urile stabile.
 *
 * @param {Uint8Array} pdfBytes
 * @param {number[]} byteRange — [start1, length1, start2, length2]
 * @returns {Uint8Array} — bytes finale cu ByteRange real
 */
export function rewriteByteRangeInPdf(pdfBytes, byteRange) {
  const text = new TextDecoder("latin1").decode(pdfBytes);
  // Pattern flexibil: /ByteRange [...nums...]
  const re = /\/ByteRange\s*\[\s*([\d\s]+)\s*\]/;
  const match = re.exec(text);
  if (!match) {
    throw new Error("ByteRange placeholder not found in PDF");
  }

  const fullMatch = match[0];
  const newByteRange = `/ByteRange [${byteRange[0]} ${byteRange[1]} ${byteRange[2]} ${byteRange[3]}]`;

  // Pentru păstrarea offset-urilor stabile, padding cu spații până la lungimea originală
  let replacement = newByteRange;
  if (replacement.length < fullMatch.length) {
    // Padding cu spații în interiorul array-ului (înainte de `]`)
    const padLen = fullMatch.length - replacement.length;
    replacement = newByteRange.slice(0, -1) + " ".repeat(padLen) + "]";
  } else if (replacement.length > fullMatch.length) {
    throw new Error(
      `ByteRange replacement too long (${replacement.length} > ${fullMatch.length}). ` +
      "Increase placeholder padding in prepareSignaturePlaceholder.",
    );
  }

  // Înlocuire byte-level (păstrăm bytes restul neatinși)
  const before = pdfBytes.slice(0, match.index);
  const after = pdfBytes.slice(match.index + fullMatch.length);
  const replBytes = new TextEncoder().encode(replacement);
  const result = new Uint8Array(before.length + replBytes.length + after.length);
  result.set(before, 0);
  result.set(replBytes, before.length);
  result.set(after, before.length + replBytes.length);
  return result;
}

/**
 * Calculează SHA-256 hash pe regiunile ByteRange ale PDF-ului
 * (toate octeții EXCEPT /Contents placeholder).
 *
 * @param {Uint8Array} pdfBytes
 * @param {number[]} byteRange — [start1, length1, start2, length2]
 * @returns {Promise<Uint8Array>} hash 32 octeți
 */
export async function hashPdfByteRange(pdfBytes, byteRange) {
  const [s1, l1, s2, l2] = byteRange;
  // Concatenăm cele 2 regiuni
  const combined = new Uint8Array(l1 + l2);
  combined.set(pdfBytes.subarray(s1, s1 + l1), 0);
  combined.set(pdfBytes.subarray(s2, s2 + l2), l1);

  // Web Crypto API (browser + Node 18+)
  const subtle = (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle)
    ? globalThis.crypto.subtle
    : null;
  if (!subtle) {
    throw new Error("Web Crypto API not available — required for PAdES signing");
  }
  const hashBuf = await subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuf);
}

/**
 * Înlocuiește hex placeholder din /Contents cu CMS SignedData semnat real.
 *
 * @param {Uint8Array} pdfBytes
 * @param {string} cmsHex — hex string CMS SignedData (lungime ≤ placeholderSize × 2)
 * @param {number} contentsHexStart
 * @param {number} contentsHexLength
 * @returns {Uint8Array}
 */
export function embedCmsSignature(pdfBytes, cmsHex, contentsHexStart, contentsHexLength) {
  if (cmsHex.length > contentsHexLength) {
    throw new Error(
      `CMS signature hex too long (${cmsHex.length} > ${contentsHexLength}). ` +
      "Increase SIGNATURE_PLACEHOLDER_SIZE.",
    );
  }
  // Padding cu zerouri pentru a păstra dimensiunea originală
  const paddedHex = cmsHex.padEnd(contentsHexLength, "0");
  const replBytes = new TextEncoder().encode(paddedHex);
  const result = new Uint8Array(pdfBytes);
  result.set(replBytes, contentsHexStart);
  return result;
}

/**
 * Orchestrator: semnează un PDF cu PAdES B-T (sau B-LT pentru level B-LT).
 *
 * Workflow:
 *   1. Pregătește placeholder semnătură (AcroForm + SigField + Sig dict cu /Contents zeros)
 *   2. Save PDF → bytes intermediare
 *   3. Locate /Contents range → calculează ByteRange real
 *   4. Rewrite ByteRange în bytes
 *   5. Hash byte range (SHA-256)
 *   6. Apel signer.sign(hash) → returnează hex CMS
 *   7. Embed CMS în /Contents placeholder
 *   8. Return bytes finale
 *
 * @param {Uint8Array|ArrayBuffer|Blob} input — PDF input
 * @param {object} signerConfig
 * @param {string} signerConfig.provider — "mock" | "certsign" | "digisign" | "transsped"
 * @param {object} [signerConfig.credentials] — credențialele specifice provider
 * @param {object} [options] — opțiuni PAdES (level, reason, location, etc.)
 * @returns {Promise<{bytes: Uint8Array, byteRange: number[], signerInfo: object}>}
 */
export async function signPdfPades(input, signerConfig = {}, options = {}) {
  // Normalizare input la Uint8Array
  let bytes;
  if (input instanceof Blob) {
    bytes = new Uint8Array(await input.arrayBuffer());
  } else if (input && input.byteLength !== undefined && input.buffer) {
    // Uint8Array sau typed array
    bytes = new Uint8Array(input.buffer.slice(
      input.byteOffset || 0,
      (input.byteOffset || 0) + input.byteLength,
    ));
  } else if (input instanceof ArrayBuffer || (input && input.byteLength !== undefined)) {
    bytes = new Uint8Array(input.slice ? input.slice(0) : input);
  } else {
    throw new Error("[PAdES] input must be Blob, ArrayBuffer, or Uint8Array");
  }

  // 1. Load PDF + adaugă placeholder
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  prepareSignaturePlaceholder(pdfDoc, options);

  // 2. Save PDF (cu placeholder Contents zeros + ByteRange [0 0 0 0])
  const savedBytes = await pdfDoc.save({ useObjectStreams: false });

  // 2b. Expandează /ByteRange placeholder la fixed-width 10-digit pentru a permite
  // rewrite-ul ulterior cu valori reale (offset-uri PDF mari)
  const intermBytes = expandByteRangePlaceholder(savedBytes);

  // 3. Locate /Contents range
  const range = locateContentsRange(intermBytes);
  if (!range) {
    throw new Error("[PAdES] Failed to locate /Contents range after signature placeholder");
  }

  // 4. Rewrite ByteRange cu valorile reale
  const rewritten = rewriteByteRangeInPdf(intermBytes, range.byteRange);

  // 5. Re-localizare după rewrite (offset-urile pot diferi cu câteva octeți din cauza
  // padding-ului ByteRange — dar /Contents ar trebui să fie la același offset relativ)
  const range2 = locateContentsRange(rewritten);
  if (!range2) {
    throw new Error("[PAdES] /Contents lost after ByteRange rewrite");
  }

  // 6. Hash byte range REAL (după ByteRange rewrite)
  const hash = await hashPdfByteRange(rewritten, range2.byteRange);

  // 7. Obține CMS SignedData de la signer
  const provider = signerConfig.provider || "mock";
  const { getProvider } = await import("./qtsp-providers/index.js");
  const signerImpl = await getProvider(provider, signerConfig.credentials);
  const signResult = await signerImpl.sign(hash, {
    signingTime: options.signingTime || new Date(),
    subFilter: options.subFilter || PADES_SUBFILTERS.ETSI_CADES_DETACHED,
    level: options.level || PADES_LEVELS.B_T,
  });

  // 8. Embed CMS în /Contents placeholder
  const finalBytes = embedCmsSignature(
    rewritten,
    signResult.cmsHex,
    range2.contentsHexStart,
    range2.contentsHexLength,
  );

  return {
    bytes: finalBytes,
    byteRange: range2.byteRange,
    signerInfo: {
      provider,
      providerLabel: signResult.providerLabel || provider,
      signingTime: (options.signingTime || new Date()).toISOString(),
      level: options.level || PADES_LEVELS.B_T,
      subFilter: options.subFilter || PADES_SUBFILTERS.ETSI_CADES_DETACHED,
      certificateSubject: signResult.certificateSubject || null,
      certificateIssuer: signResult.certificateIssuer || null,
      isMock: signResult.isMock === true,
      warnings: signResult.warnings || [],
    },
  };
}

/**
 * Inspect un PDF pentru date semnătură PAdES (post-signing).
 *
 * @param {Uint8Array|ArrayBuffer|Blob} pdfBytes
 * @returns {Promise<{
 *   hasSignature: boolean,
 *   subFilter: string|null,
 *   filter: string|null,
 *   reason: string|null,
 *   location: string|null,
 *   signerName: string|null,
 *   signingTime: string|null,
 *   byteRange: number[]|null,
 *   contentsLength: number|null,
 *   level: string|null,
 *   hasDss: boolean,
 *   isAcroFormSigned: boolean,
 * }>}
 */
export async function inspectSignature(input) {
  let bytes;
  if (input instanceof Blob) {
    bytes = new Uint8Array(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (input && input.buffer) {
    bytes = new Uint8Array(input.buffer.slice(
      input.byteOffset || 0,
      (input.byteOffset || 0) + input.byteLength,
    ));
  } else {
    bytes = input;
  }

  const text = new TextDecoder("latin1").decode(bytes);

  const subFilterMatch = /\/SubFilter\s*\/([^\s>]+)/.exec(text);
  const filterMatch = /\/Filter\s*\/([^\s>]+)/.exec(text);
  const reasonMatch = /\/Reason\s*<([0-9a-fA-F]+)>/.exec(text);
  const locationMatch = /\/Location\s*<([0-9a-fA-F]+)>/.exec(text);
  const nameMatch = /\/Name\s*<([0-9a-fA-F]+)>/.exec(text);
  const mMatch = /\/M\s*\(([^)]+)\)/.exec(text);
  const byteRangeMatch = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
  const contentsMatch = /\/Contents\s*<([0-9a-fA-F]+)>/.exec(text);
  const levelMatch = /\/Level\s*\(([^)]+)\)/.exec(text);
  const hasDss = /\/DSS\s/.test(text);
  const hasAcroForm = /\/AcroForm\b/.test(text) && /\/SigFlags/.test(text);

  const decodeHex = (hex) => {
    if (!hex) return null;
    try {
      let s = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        if (!isNaN(code)) s += String.fromCharCode(code);
      }
      // PDFHexString text e UTF-16 BE cu BOM (FE FF) pentru text multibyte
      if (s.length >= 2 && s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) {
        let utf16 = "";
        for (let i = 2; i < s.length; i += 2) {
          utf16 += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
        }
        return utf16;
      }
      return s;
    } catch { return null; }
  };

  return {
    hasSignature: !!(byteRangeMatch && contentsMatch),
    subFilter: subFilterMatch ? subFilterMatch[1] : null,
    filter: filterMatch ? filterMatch[1] : null,
    reason: reasonMatch ? decodeHex(reasonMatch[1]) : null,
    location: locationMatch ? decodeHex(locationMatch[1]) : null,
    signerName: nameMatch ? decodeHex(nameMatch[1]) : null,
    signingTime: mMatch ? mMatch[1] : null,
    byteRange: byteRangeMatch
      ? [Number(byteRangeMatch[1]), Number(byteRangeMatch[2]), Number(byteRangeMatch[3]), Number(byteRangeMatch[4])]
      : null,
    contentsLength: contentsMatch ? contentsMatch[1].length : null,
    level: levelMatch ? levelMatch[1] : null,
    hasDss,
    isAcroFormSigned: hasAcroForm,
  };
}
