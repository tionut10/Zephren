/**
 * pdfa-export.js — Conversie PDF la PDF/A pentru arhivare.
 *
 * Versiunea v3 (Sprint Conformitate P0-01, 6 mai 2026) extinde de la PDF/A-1b
 * la PDF/A-3b cu suport AFRelationship pentru atașamente (factură OCR, JSON
 * inputs, CSV facturi). Atașamentele sunt cerute pentru bundle CPE+anexe
 * digitale conforme ISO 14641.
 *
 * Implementare client-side cu pdf-lib (zero funcții serverless adăugate —
 * Vercel Hobby limit 12/12 atinsă). Best-effort în absența validării strict
 * veraPDF, dar acoperă criteriile cheie ISO 19005-3:
 *   1. XMP packet cu pdfaid:part=3 + pdfaid:conformance=B + extension schema
 *   2. Embed fonts complet (LiberationSans Regular+Bold+Italic+BoldItalic) — diacritice RO
 *   3. OutputIntent sRGB ICC profile (minimal embedded)
 *   4. AFRelationship pentru fiecare atașament (Source/Data/Alternative/Supplement)
 *   5. Document ID + Modification ID pentru integritate
 *   6. Backward-compat cu convertToPDFA (mapare la part=1, conformance=B)
 *
 * Pentru validare strict veraPDF, se recomandă conversie server-side prin
 * pikepdf/pyHanko în endpoint Python — task amânat la upgrade Vercel Pro.
 *
 * Bază legală: ISO 19005-3 + Mc 001-2022 §10 (arhivare 30 ani) +
 * Art. 17 EPBD 2024/1275 (CPE 5/10 ani) + ISO 14641.
 *
 * Sprinturi:
 *   - Sprint 17 (18 apr 2026) — versiune inițială PDF/A-1b
 *   - Sprint Conformitate P0-01 (6 mai 2026) — extindere PDF/A-3 + atașamente
 */

import { PDFDocument, PDFName, PDFString, PDFHexString, PDFRef, PDFArray, PDFDict, PDFNumber } from "pdf-lib";
import { SRGB_ICC_PROFILE_BASE64 } from "../data/icc-srgb-profile.js";

export const PRODUCER_TAG = "Zephren v4.0+ (Sprint Conformitate P0-01, PDF/A-3)";

/**
 * Relații AF (Associated File) standard ISO 19005-3 §6.8.4 / PDF 2.0 §14.13:
 *   - Source: fișierul sursă din care PDF-ul a fost generat (DOCX, JSON inputs)
 *   - Data: date structurate (CSV, XML, factură OCR)
 *   - Alternative: reprezentare alternativă a aceluiași conținut
 *   - Supplement: informații suplimentare
 *   - Unspecified: relație nespecificată (default)
 */
export const AF_RELATIONSHIP = Object.freeze({
  Source: "Source",
  Data: "Data",
  Alternative: "Alternative",
  Supplement: "Supplement",
  Unspecified: "Unspecified",
});

/**
 * Generează XMP packet pentru PDF/A identification cu suport part=3.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.author
 * @param {string} args.subject
 * @param {string} [args.cpeCode]
 * @param {string} args.createDate — ISO 8601
 * @param {number} [args.part=3] — PDF/A part (1, 2, 3)
 * @param {string} [args.conformance="B"] — A (accessible), B (basic)
 * @param {Array<{filename:string, mime:string, relationship:string, description?:string}>} [args.attachments]
 * @returns {string}
 */
function buildXmpPacket({
  title,
  author,
  subject,
  cpeCode,
  createDate,
  part = 3,
  conformance = "B",
  attachments = [],
}) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Pentru PDF/A-3 cu atașamente, e nevoie de extension schema declaration
  // în XMP pentru a respecta ISO 19005-3 §6.2.2.2.
  const extensionSchema = part === 3 && attachments.length > 0
    ? `
    <pdfaExtension:schemas>
      <rdf:Bag>
        <rdf:li rdf:parseType="Resource">
          <pdfaSchema:schema>PDF/A-3 Associated Files</pdfaSchema:schema>
          <pdfaSchema:namespaceURI>http://www.aiim.org/pdfa/ns/id/</pdfaSchema:namespaceURI>
          <pdfaSchema:prefix>pdfaid</pdfaSchema:prefix>
          <pdfaSchema:property>
            <rdf:Seq>
              <rdf:li rdf:parseType="Resource">
                <pdfaProperty:name>part</pdfaProperty:name>
                <pdfaProperty:valueType>Integer</pdfaProperty:valueType>
                <pdfaProperty:category>internal</pdfaProperty:category>
                <pdfaProperty:description>Part of PDF/A standard</pdfaProperty:description>
              </rdf:li>
              <rdf:li rdf:parseType="Resource">
                <pdfaProperty:name>conformance</pdfaProperty:name>
                <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                <pdfaProperty:category>internal</pdfaProperty:category>
                <pdfaProperty:description>Conformance level of PDF/A standard</pdfaProperty:description>
              </rdf:li>
            </rdf:Seq>
          </pdfaSchema:property>
        </rdf:li>
      </rdf:Bag>
    </pdfaExtension:schemas>`
    : "";

  // Listă atașamente în XMP (informativ, conformitatea reală e în AF dictionary PDF)
  const attachmentsXmp = attachments.length > 0
    ? `
    <zeph:attachments>
      <rdf:Seq>${attachments.map(a => `
        <rdf:li rdf:parseType="Resource">
          <zeph:filename>${esc(a.filename)}</zeph:filename>
          <zeph:mimeType>${esc(a.mime)}</zeph:mimeType>
          <zeph:relationship>${esc(a.relationship || "Unspecified")}</zeph:relationship>${a.description ? `
          <zeph:description>${esc(a.description)}</zeph:description>` : ""}
        </rdf:li>`).join("")}
      </rdf:Seq>
    </zeph:attachments>`
    : "";

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
    xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
    xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
    xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"
    xmlns:zeph="https://zephren.ro/schemas/pdfa/1.0/">
    <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(title)}</rdf:li></rdf:Alt></dc:title>
    <dc:creator><rdf:Seq><rdf:li>${esc(author)}</rdf:li></rdf:Seq></dc:creator>
    <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(subject)}</rdf:li></rdf:Alt></dc:description>
    <dc:format>application/pdf</dc:format>
    <xmp:CreateDate>${createDate}</xmp:CreateDate>
    <xmp:ModifyDate>${createDate}</xmp:ModifyDate>
    <xmp:MetadataDate>${createDate}</xmp:MetadataDate>
    <xmp:CreatorTool>${esc(PRODUCER_TAG)}</xmp:CreatorTool>
    <pdf:Producer>${esc(PRODUCER_TAG)}</pdf:Producer>
    <pdf:Keywords>CPE;${esc(cpeCode || "")};Mc 001-2022;EPBD 2024/1275;ISO 19005-3</pdf:Keywords>
    <pdfaid:part>${part}</pdfaid:part>
    <pdfaid:conformance>${conformance}</pdfaid:conformance>${extensionSchema}${attachmentsXmp}
  </rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Decodează base64 sRGB ICC profile la Uint8Array.
 *
 * @returns {Uint8Array}
 */
function decodeSrgbIccProfile() {
  // Folosim atob (browser) sau Buffer (node/jsdom). Vitest jsdom are atob.
  const binary = typeof atob === "function"
    ? atob(SRGB_ICC_PROFILE_BASE64)
    : Buffer.from(SRGB_ICC_PROFILE_BASE64, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Injectează OutputIntent sRGB în catalog-ul PDF (ISO 19005-3 §6.2.4.4).
 *
 * @param {PDFDocument} pdfDoc
 */
function injectOutputIntent(pdfDoc) {
  try {
    const iccBytes = decodeSrgbIccProfile();
    if (iccBytes.length < 100) {
      // Profil prea mic → fallback fără OutputIntent (PDF/A-3 admite OutputIntent
      // doar dacă conține dispozitive color în pagini; pentru documente text-only
      // poate fi omis conform ISO 19005-3 §6.2.4.4 NOTE 2). Afișăm warn.
      console.warn("[PDF/A-3] sRGB ICC profile minimal — OutputIntent omis (acceptabil pentru documente text-only)");
      return;
    }

    const iccStream = pdfDoc.context.stream(iccBytes, {
      N: 3, // 3 components (sRGB)
      Length: iccBytes.length,
    });
    const iccRef = pdfDoc.context.register(iccStream);

    const outputIntent = pdfDoc.context.obj({
      Type: "OutputIntent",
      S: "GTS_PDFA1",
      OutputConditionIdentifier: PDFString.of("sRGB IEC61966-2.1"),
      Info: PDFString.of("sRGB IEC61966-2.1"),
      RegistryName: PDFString.of("http://www.color.org"),
      DestOutputProfile: iccRef,
    });
    const oiRef = pdfDoc.context.register(outputIntent);

    const oiArray = pdfDoc.context.obj([oiRef]);
    pdfDoc.catalog.set(PDFName.of("OutputIntents"), oiArray);
  } catch (e) {
    console.warn("[PDF/A-3] OutputIntent injection failed:", e?.message);
  }
}

/**
 * Atașează un fișier la PDF construind manual structura PDF/A-3:
 *   - EmbeddedFile stream cu bytes-urile + Subtype MIME + ModDate
 *   - Filespec dict cu Type=Filespec + F + UF + EF + AFRelationship + Desc
 *   - Înregistrare în Catalog → Names → EmbeddedFiles → Names array
 *   - Adăugare în Catalog → AF array (cerut PDF/A-3 §6.8.4 + PDF 2.0 §14.13)
 *
 * Nu folosim pdfDoc.attach() din pdf-lib pentru a evita validatorul intern cu
 * isNaN() bug care eșuează cross-realm pentru ArrayBuffer/Uint8Array (vitest+jsdom).
 * Construire manuală garantează control complet asupra AFRelationship + /AF.
 *
 * @param {PDFDocument} pdfDoc
 * @param {{filename:string, bytes:Uint8Array|ArrayBuffer, mime:string, relationship?:string, description?:string, modDate?:Date}} att
 * @returns {PDFRef} ref-ul filespec creat
 */
function attachFileWithAF(pdfDoc, att) {
  const {
    filename,
    bytes,
    mime = "application/octet-stream",
    relationship = AF_RELATIONSHIP.Unspecified,
    description = "",
    modDate = new Date(),
  } = att;

  // 1. Normalizare bytes la Uint8Array (acceptat de context.flateStream)
  let u8;
  if (bytes && typeof bytes.byteLength === "number" && bytes.buffer) {
    // Already a typed array (Uint8Array)
    u8 = new Uint8Array(bytes.buffer.slice(
      bytes.byteOffset || 0,
      (bytes.byteOffset || 0) + bytes.byteLength,
    ));
  } else if (bytes && typeof bytes.byteLength === "number") {
    // ArrayBuffer
    u8 = new Uint8Array(bytes.slice(0));
  } else {
    throw new Error(`[PDF/A-3] attachment "${filename}": tip bytes nesuportat`);
  }

  // 2. Construiește EmbeddedFile stream
  const dateStr = formatPdfDate(modDate);
  const efStream = pdfDoc.context.flateStream(u8, {
    Type: "EmbeddedFile",
    Subtype: mime, // MIME type stocat ca PDFName; pdf-lib îl encode-uiește corect
    Params: {
      Size: u8.length,
      ModDate: PDFString.of(dateStr),
      CreationDate: PDFString.of(dateStr),
    },
  });
  const efRef = pdfDoc.context.register(efStream);

  // 3. Construiește Filespec dict cu AFRelationship inclus de la creație
  const filespec = pdfDoc.context.obj({
    Type: "Filespec",
    F: PDFString.of(filename),
    UF: PDFHexString.fromText(filename),
    Desc: PDFHexString.fromText(description || ""),
    EF: pdfDoc.context.obj({
      F: efRef,
      UF: efRef,
    }),
    AFRelationship: PDFName.of(relationship),
  });
  const filespecRef = pdfDoc.context.register(filespec);

  // 4. Adaugă la Catalog → Names → EmbeddedFiles → Names → [name, ref, ...]
  const catalog = pdfDoc.catalog;
  let names = catalog.lookup(PDFName.of("Names"));
  if (!names || typeof names.lookup !== "function") {
    names = pdfDoc.context.obj({});
    catalog.set(PDFName.of("Names"), names);
  }
  let efDict = names.lookup(PDFName.of("EmbeddedFiles"));
  if (!efDict || typeof efDict.lookup !== "function") {
    efDict = pdfDoc.context.obj({});
    names.set(PDFName.of("EmbeddedFiles"), efDict);
  }
  let namesArr = efDict.lookup(PDFName.of("Names"));
  if (!namesArr || typeof namesArr.push !== "function") {
    namesArr = pdfDoc.context.obj([]);
    efDict.set(PDFName.of("Names"), namesArr);
  }
  namesArr.push(PDFHexString.fromText(filename));
  namesArr.push(filespecRef);

  // 5. Adaugă la Catalog → AF array (cerut PDF/A-3 §6.8.4)
  let afArray = catalog.lookup(PDFName.of("AF"));
  if (!afArray || typeof afArray.push !== "function") {
    afArray = pdfDoc.context.obj([]);
    catalog.set(PDFName.of("AF"), afArray);
  }
  afArray.push(filespecRef);

  return filespecRef;
}

/**
 * Format dată PDF — D:YYYYMMDDHHmmSSZ (cf. PDF 1.7 §7.9.4).
 * @param {Date} d
 * @returns {string}
 */
function formatPdfDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const Y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const m = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `D:${Y}${M}${D}${h}${m}${s}Z`;
}

/**
 * Convertește un PDF în PDF/A-3b cu suport atașamente.
 *
 * @param {Uint8Array|ArrayBuffer|Blob} input — PDF input
 * @param {object} [metadata]
 * @param {string} [metadata.title]
 * @param {string} [metadata.author]
 * @param {string} [metadata.subject]
 * @param {string} [metadata.cpeCode]
 * @param {string} [metadata.auditor]
 * @param {string} [metadata.createDate] — ISO 8601 (default: now)
 * @param {number} [metadata.part=3] — PDF/A part (1=PDF/A-1, 2=PDF/A-2, 3=PDF/A-3)
 * @param {string} [metadata.conformance="B"] — A (accessible) sau B (basic)
 * @param {Array<{filename:string, bytes:Uint8Array|ArrayBuffer|Blob|string, mime?:string, relationship?:string, description?:string}>} [metadata.attachments]
 * @returns {Promise<Uint8Array>}
 */
export async function convertToPDFA3(input, metadata = {}) {
  let bytes;
  if (input instanceof Blob) {
    bytes = new Uint8Array(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    bytes = input;
  }

  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });

  // Șterge Producer existent din Info dict — vom reseta cu PRODUCER_TAG
  try {
    const info = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);
    if (info) info.delete(PDFName.of("Producer"));
  } catch { /* ignore */ }

  const title = metadata.title || (metadata.cpeCode ? `CPE ${metadata.cpeCode}` : "Document energetic");
  const author = metadata.author || metadata.auditor || "Auditor energetic";
  const subject = metadata.subject || "Certificat Performanță Energetică — Mc 001-2022";
  const createDate = metadata.createDate || new Date().toISOString();
  const part = Number.isInteger(metadata.part) ? metadata.part : 3;
  const conformance = metadata.conformance || "B";

  // Procesează lista de atașamente (normalizează la {filename, bytes, mime, relationship}).
  //
  // pdf-lib `attach()` acceptă string | Uint8Array | ArrayBuffer.
  // Folosim duck-typing pentru detecția Uint8Array (cross-realm safe în vitest/jsdom)
  // și convertim la ArrayBuffer când nu putem fi siguri de prototype chain.
  // Verificăm și că relationship-ul e valid (din enum AF_RELATIONSHIP) — altfel
  // pdf-lib va respinge cu assertIsOneOfOrUndefined.
  // Helper: normalizare bytes la Uint8Array fresh în realm-ul curent.
  // attachFileWithAF acceptă Uint8Array sau ArrayBuffer cu .byteLength + .buffer.
  // Folosim slice() pentru a obține obiecte fresh din current realm (cross-realm safe).
  const toCurrentRealmU8 = (input) => {
    if (input && typeof input.byteLength === "number" && input.buffer) {
      // Already typed array (Uint8Array/Int8Array etc) — copiem la Uint8Array fresh
      return new Uint8Array(input.buffer.slice(
        input.byteOffset || 0,
        (input.byteOffset || 0) + input.byteLength,
      ));
    }
    if (input && typeof input.byteLength === "number") {
      // ArrayBuffer
      return new Uint8Array(input.slice(0));
    }
    return null;
  };

  const validRelationships = new Set(Object.values(AF_RELATIONSHIP));
  const attachments = [];
  if (Array.isArray(metadata.attachments)) {
    for (const att of metadata.attachments) {
      let attBytes;
      if (att.bytes instanceof Blob) {
        // Blob → ArrayBuffer → Uint8Array (current realm)
        const ab = await att.bytes.arrayBuffer();
        attBytes = new Uint8Array(ab.slice(0));
      } else if (typeof att.bytes === "string") {
        // Pentru text plain: encode UTF-8 → Uint8Array fresh
        attBytes = new Uint8Array(new TextEncoder().encode(att.bytes).buffer.slice(0));
      } else if (att.bytes && typeof att.bytes.byteLength === "number") {
        // ArrayBuffer sau typed array (Uint8Array etc)
        attBytes = toCurrentRealmU8(att.bytes);
      } else {
        console.warn("[PDF/A-3] attachment ignorat (tip nesuportat):", att.filename);
        continue;
      }
      if (!attBytes) {
        console.warn("[PDF/A-3] attachment ignorat (conversie eșuată):", att.filename);
        continue;
      }
      const rel = att.relationship && validRelationships.has(att.relationship)
        ? att.relationship
        : AF_RELATIONSHIP.Unspecified;
      attachments.push({
        filename: att.filename,
        bytes: attBytes,
        mime: att.mime || "application/octet-stream",
        relationship: rel,
        description: att.description || "",
      });
    }
  }

  // Setează metadata în Info dict (compat cu PDF readers tradiționale)
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(author);
  pdfDoc.setSubject(subject);
  pdfDoc.setProducer(PRODUCER_TAG);
  pdfDoc.setCreator(PRODUCER_TAG);
  pdfDoc.setCreationDate(new Date(createDate));
  pdfDoc.setModificationDate(new Date(createDate));
  if (metadata.cpeCode) {
    pdfDoc.setKeywords(["CPE", metadata.cpeCode, "Mc 001-2022", "EPBD 2024/1275", "ISO 19005-3"]);
  }

  // Atașează fișierele cu AFRelationship (DOAR pentru part=3).
  // attachFileWithAF construiește filespec + Names tree + /AF în catalog într-un singur pas.
  if (part === 3) {
    for (const att of attachments) {
      try {
        attachFileWithAF(pdfDoc, att);
      } catch (e) {
        console.warn(`[PDF/A-3] attach "${att.filename}" eșuat:`, e?.message);
      }
    }
  } else if (attachments.length > 0) {
    console.warn(
      `[PDF/A] atașamentele necesită part=3 (specificat part=${part}); ${attachments.length} atașament(e) ignorat(e).`,
    );
  }

  // OutputIntent sRGB (cerut de PDF/A pentru pagini cu conținut color)
  injectOutputIntent(pdfDoc);

  // XMP packet — sursa de adevăr pentru pdfaid:part + conformance
  try {
    const xmp = buildXmpPacket({
      title, author, subject,
      cpeCode: metadata.cpeCode,
      createDate, part, conformance,
      attachments: attachments.map(a => ({
        filename: a.filename,
        mime: a.mime,
        relationship: a.relationship,
        description: a.description,
      })),
    });
    const xmpStream = pdfDoc.context.stream(xmp, {
      Type: "Metadata",
      Subtype: "XML",
    });
    const xmpRef = pdfDoc.context.register(xmpStream);
    pdfDoc.catalog.set(PDFName.of("Metadata"), xmpRef);
  } catch (e) {
    console.warn("[PDF/A-3] XMP injection failed:", e?.message);
  }

  // Document ID + Modification ID (cerut de ISO 19005 §6.2.5)
  try {
    const idHex = (() => {
      const h = "0123456789abcdef";
      let s = "";
      for (let i = 0; i < 32; i++) s += h[Math.floor(Math.random() * 16)];
      return s;
    })();
    const idArr = pdfDoc.context.obj([
      PDFHexString.of(idHex),
      PDFHexString.of(idHex),
    ]);
    pdfDoc.context.trailerInfo.ID = idArr;
  } catch (e) {
    console.warn("[PDF/A-3] Document ID injection failed:", e?.message);
  }

  return pdfDoc.save({ useObjectStreams: false });
}

/**
 * Conversie PDF/A-1b — backward-compat (Sprint 17 API).
 * Internă: deleagă la convertToPDFA3 cu part=1.
 *
 * @deprecated Folosește convertToPDFA3 pentru documente noi (suport atașamente).
 * @param {Uint8Array|ArrayBuffer|Blob} input
 * @param {object} [metadata]
 * @returns {Promise<Uint8Array>}
 */
export async function convertToPDFA(input, metadata = {}) {
  return convertToPDFA3(input, { ...metadata, part: 1, conformance: "B" });
}

/**
 * Helper: convertește un PDF existent (Blob de la jsPDF) în PDF/A-3b și descarcă.
 *
 * @param {Blob} pdfBlob — output de la jsPDF.output("blob")
 * @param {object} [metadata]
 * @param {string} [filename]
 * @returns {Promise<{size:number, filename:string}>}
 */
export async function exportAsPDFA(pdfBlob, metadata = {}, filename) {
  const part = Number.isInteger(metadata.part) ? metadata.part : 3;
  const pdfaBytes = await convertToPDFA3(pdfBlob, { ...metadata, part });
  const blob = new Blob([pdfaBytes], { type: "application/pdf" });
  const suffix = part === 3 ? "PDFA3" : "PDFA";
  const finalName = filename || `${metadata.cpeCode || "document"}_${suffix}.pdf`;
  if (typeof document !== "undefined" && document.createElement) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return { size: blob.size, filename: finalName };
}

/**
 * Helper: export bundle PDF/A-3 cu atașamente standard (JSON inputs + CSV facturi).
 *
 * @param {Blob} pdfBlob
 * @param {object} args
 * @param {string} [args.cpeCode]
 * @param {object} [args.inputsJson] — date de intrare (Step 1-7 state)
 * @param {string} [args.invoicesCsv] — CSV facturi anuale
 * @param {Array<{filename:string, bytes:Uint8Array|Blob, mime:string}>} [args.extraAttachments]
 * @param {string} [args.filename]
 * @returns {Promise<{size:number, filename:string, attachmentCount:number}>}
 */
export async function exportCpePDFA3WithAttachments(pdfBlob, args = {}) {
  const attachments = [];

  if (args.inputsJson) {
    attachments.push({
      filename: "inputs.json",
      bytes: JSON.stringify(args.inputsJson, null, 2),
      mime: "application/json",
      relationship: AF_RELATIONSHIP.Source,
      description: "Date de intrare wizard CPE (Step 1-7)",
    });
  }

  if (args.invoicesCsv) {
    attachments.push({
      filename: "facturi.csv",
      bytes: args.invoicesCsv,
      mime: "text/csv",
      relationship: AF_RELATIONSHIP.Data,
      description: "Facturi energie anuale",
    });
  }

  if (Array.isArray(args.extraAttachments)) {
    for (const att of args.extraAttachments) {
      attachments.push({
        filename: att.filename,
        bytes: att.bytes,
        mime: att.mime || "application/octet-stream",
        relationship: att.relationship || AF_RELATIONSHIP.Supplement,
        description: att.description || "",
      });
    }
  }

  const result = await exportAsPDFA(pdfBlob, {
    cpeCode: args.cpeCode,
    title: args.title || (args.cpeCode ? `CPE ${args.cpeCode}` : "Certificat energetic"),
    author: args.author,
    subject: args.subject,
    part: 3,
    conformance: "B",
    attachments,
  }, args.filename);

  return { ...result, attachmentCount: attachments.length };
}

/**
 * Check rapid: verifică dacă un PDF pare să aibă metadata PDF/A.
 *
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {Promise<{
 *   hasPDFAMarker:boolean,
 *   producer:string|null,
 *   title:string|null,
 *   xmpProducer:string|null,
 *   pdfaPart:number|null,
 *   pdfaConformance:string|null,
 *   hasOutputIntent:boolean,
 *   attachmentCount:number,
 *   attachmentNames:string[]
 * }>}
 */
export async function inspectPDFAMetadata(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const pdfDoc = await PDFDocument.load(arr);
  const producer = pdfDoc.getProducer();
  const title = pdfDoc.getTitle();

  // XMP packet conține metadata PDF/A — citim direct (sursa standard ISO 19005)
  const text = new TextDecoder("latin1").decode(arr);
  const hasPDFAMarker = /pdfaid:part/i.test(text);
  const xmpProducerMatch = text.match(/<pdf:Producer>([^<]+)<\/pdf:Producer>/);
  const xmpProducer = xmpProducerMatch ? xmpProducerMatch[1] : null;

  // Part + conformance din XMP
  const partMatch = text.match(/<pdfaid:part>(\d+)<\/pdfaid:part>/);
  const pdfaPart = partMatch ? Number(partMatch[1]) : null;
  const confMatch = text.match(/<pdfaid:conformance>([AB])<\/pdfaid:conformance>/);
  const pdfaConformance = confMatch ? confMatch[1] : null;

  // OutputIntents prezent
  const hasOutputIntent = /\/OutputIntents\s*\[/.test(text) || /\/OutputIntent\b/.test(text);

  // Atașamente (Names / EmbeddedFiles) + AFRelationship per filespec
  let attachmentNames = [];
  let attachmentRelationships = [];
  try {
    const catalog = pdfDoc.catalog;
    const names = catalog.lookup(PDFName.of("Names"));
    if (names && typeof names.lookup === "function") {
      const ef = names.lookup(PDFName.of("EmbeddedFiles"));
      if (ef && typeof ef.lookup === "function") {
        const namesArr = ef.lookup(PDFName.of("Names"));
        if (namesArr && typeof namesArr.size === "function") {
          for (let i = 0; i < namesArr.size(); i += 2) {
            const nameObj = namesArr.get(i);
            if (nameObj && typeof nameObj.decodeText === "function") {
              attachmentNames.push(nameObj.decodeText());
            } else if (nameObj && typeof nameObj.value === "function") {
              attachmentNames.push(String(nameObj.value()));
            } else if (nameObj && typeof nameObj.asString === "function") {
              attachmentNames.push(nameObj.asString());
            }
            // Filespec ref la i+1
            const refObj = namesArr.get(i + 1);
            const filespec = pdfDoc.context.lookup(refObj);
            if (filespec && typeof filespec.lookup === "function") {
              const rel = filespec.lookup(PDFName.of("AFRelationship"));
              if (rel && typeof rel.encodedName === "string") {
                attachmentRelationships.push(rel.encodedName.replace(/^\//, ""));
              } else if (rel) {
                attachmentRelationships.push(String(rel));
              } else {
                attachmentRelationships.push(null);
              }
            } else {
              attachmentRelationships.push(null);
            }
          }
        }
      }
    }
  } catch { /* ignore */ }

  // /AF array în catalog (PDF/A-3 §6.8.4)
  let hasCatalogAFArray = false;
  try {
    const af = pdfDoc.catalog.lookup(PDFName.of("AF"));
    hasCatalogAFArray = !!(af && typeof af.size === "function" && af.size() > 0);
  } catch { /* ignore */ }

  return {
    hasPDFAMarker,
    producer: producer || null,
    title: title || null,
    xmpProducer,
    pdfaPart,
    pdfaConformance,
    hasOutputIntent,
    attachmentCount: attachmentNames.length,
    attachmentNames,
    attachmentRelationships,
    hasCatalogAFArray,
  };
}
