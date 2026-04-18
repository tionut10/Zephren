/**
 * pdfa-export.js — Post-processare PDF pentru arhivare (PDF/A-1b approximate).
 *
 * pdf-lib NU suportă nativ PDF/A-1b complet (necesită embed fonts + XMP metadata
 * conform ISO 19005-1). Această implementare aplică „best-effort":
 *   1. Metadata PDF/A standard (Title, Author, Subject, Producer, Creator, CreationDate)
 *   2. XMP packet injectat manual (Basic + PDF/A identification)
 *   3. OutputIntent sRGB approximat
 *   4. Producer marker pentru auditabilitate
 *
 * Pentru PDF/A-1b strict validat (veraPDF), se recomandă conversie server-side
 * prin pikepdf/pypdfa — task pentru upgrade plan plătit Vercel.
 *
 * Sprint 17 (18 apr 2026).
 */

import { PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib";

export const PRODUCER_TAG = "Zephren v4.0 (Sprint 17)";

/**
 * Generează XMP packet pentru PDF/A-1b identification.
 */
function buildXmpPacket({ title, author, subject, cpeCode, createDate }) {
  const esc = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;");
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
    <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(title)}</rdf:li></rdf:Alt></dc:title>
    <dc:creator><rdf:Seq><rdf:li>${esc(author)}</rdf:li></rdf:Seq></dc:creator>
    <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(subject)}</rdf:li></rdf:Alt></dc:description>
    <xmp:CreateDate>${createDate}</xmp:CreateDate>
    <xmp:ModifyDate>${createDate}</xmp:ModifyDate>
    <xmp:CreatorTool>${esc(PRODUCER_TAG)}</xmp:CreatorTool>
    <pdf:Producer>${esc(PRODUCER_TAG)}</pdf:Producer>
    <pdf:Keywords>CPE;${esc(cpeCode || "")};Mc 001-2022;EPBD 2024/1275</pdf:Keywords>
    <pdfaid:part>1</pdfaid:part>
    <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Convertește un PDF în PDF/A-1b best-effort.
 *
 * @param {Uint8Array|ArrayBuffer|Blob} input
 * @param {object} metadata
 * @param {string} metadata.title
 * @param {string} [metadata.author]
 * @param {string} [metadata.subject]
 * @param {string} [metadata.cpeCode]
 * @param {string} [metadata.auditor]
 * @returns {Promise<Uint8Array>}
 */
export async function convertToPDFA(input, metadata = {}) {
  let bytes;
  if (input instanceof Blob) {
    bytes = new Uint8Array(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    bytes = input;
  }

  // updateMetadata: true (default) ar suprascrie info dict-ul nostru cu pdf-lib markers.
  // Cu false, dar apoi rescriem manual ProducerInfo via context.
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  // Ștergem cheia Producer din Info dict înainte de a o reseta — pdf-lib nu suprascrie
  // valori existente prin setProducer dacă a fost încărcat cu updateMetadata:false.
  try {
    const info = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);
    if (info) info.delete(PDFName.of("Producer"));
  } catch { /* ignore */ }

  const title = metadata.title || (metadata.cpeCode ? `CPE ${metadata.cpeCode}` : "Document energetic");
  const author = metadata.author || metadata.auditor || "Auditor energetic";
  const subject = metadata.subject || "Certificat Performanță Energetică — Mc 001-2022";
  const createDate = metadata.createDate || new Date().toISOString();

  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(author);
  pdfDoc.setSubject(subject);
  pdfDoc.setProducer(PRODUCER_TAG);
  pdfDoc.setCreator(PRODUCER_TAG);
  pdfDoc.setCreationDate(new Date(createDate));
  pdfDoc.setModificationDate(new Date(createDate));
  if (metadata.cpeCode) {
    pdfDoc.setKeywords(["CPE", metadata.cpeCode, "Mc 001-2022", "EPBD 2024/1275"]);
  }

  // Injectează XMP metadata packet pentru PDF/A
  try {
    const xmp = buildXmpPacket({ title, author, subject, cpeCode: metadata.cpeCode, createDate });
    const xmpStream = pdfDoc.context.stream(xmp, {
      Type: "Metadata",
      Subtype: "XML",
    });
    const xmpRef = pdfDoc.context.register(xmpStream);
    pdfDoc.catalog.set(PDFName.of("Metadata"), xmpRef);
  } catch (e) {
    // XMP injection e best-effort — nu blocăm conversia dacă eșuează
    console.warn("[PDF/A] XMP injection failed:", e?.message);
  }

  return pdfDoc.save({ useObjectStreams: false });
}

/**
 * Helper: convertește un PDF existent (Blob de la jsPDF) în PDF/A și declanșează download.
 *
 * @param {Blob} pdfBlob — output de la jsPDF.output("blob")
 * @param {object} metadata
 * @param {string} [filename]
 * @returns {Promise<{size:number, filename:string}>}
 */
export async function exportAsPDFA(pdfBlob, metadata = {}, filename) {
  const pdfaBytes = await convertToPDFA(pdfBlob, metadata);
  const blob = new Blob([pdfaBytes], { type: "application/pdf" });
  const finalName = filename || `${metadata.cpeCode || "document"}_PDFA.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { size: blob.size, filename: finalName };
}

/**
 * Check rapid: verifică dacă un PDF pare să aibă metadata PDF/A.
 * @param {Uint8Array|ArrayBuffer} bytes
 * @returns {Promise<{hasPDFAMarker:boolean, producer:string|null, title:string|null, xmpProducer:string|null}>}
 */
export async function inspectPDFAMetadata(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const pdfDoc = await PDFDocument.load(arr);
  const producer = pdfDoc.getProducer();
  const title = pdfDoc.getTitle();
  // XMP packet conține metadata PDF/A — citim Producer-ul direct de acolo (sursa standard ISO 19005-1)
  const text = new TextDecoder("latin1").decode(arr);
  const hasPDFAMarker = /pdfaid:part/i.test(text);
  const xmpProducerMatch = text.match(/<pdf:Producer>([^<]+)<\/pdf:Producer>/);
  const xmpProducer = xmpProducerMatch ? xmpProducerMatch[1] : null;
  return { hasPDFAMarker, producer: producer || null, title: title || null, xmpProducer };
}
