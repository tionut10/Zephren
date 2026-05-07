/**
 * cover-letter-pdf.js — T4 Sprint Tranziție 2026 (2 mai 2026)
 *
 * Generează „Scrisoare de însoțire" PDF pentru depunerea fizică a CPE la MDLPA
 * în perioada în care portalul electronic nu este operațional (până la 8.VII.2026,
 * conform Art. 19 alin. (3) Ord. MDLPA 348/2026 — 60 zile lucrătoare de la publicare).
 *
 * Document conține:
 *   - Antet auditor (nume, atestat, grad, cod MDLPA)
 *   - Date clădire (adresă, cadastral, an, suprafață)
 *   - Cod unic CPE local generat
 *   - Lista anexelor depuse (XML, DOCX, PDF, foto etc.)
 *   - Declarație conformitate cu Mc 001-2022 + Ord. MDLPA aplicabil
 *   - Spațiu semnătură + ștampilă
 *
 * Format: A4 portret, 1 pagină.
 */

import { getAttestationOrdinanceLabel } from "../calc/auditor-attestation-validity.js";
import { setupRomanianFont, makeTextWriter, normalizeForPdf, ROMANIAN_FONT } from "../utils/pdf-fonts.js";

/**
 * Generează scrisoarea de însoțire ca PDF Blob și descarcă automat.
 *
 * Audit 7 mai 2026 (CR-1) — diacritice fix: cover-letter folosea Helvetica
 * direct fără setupRomanianFont, ducând la PDF cu „SCRISOARE DE ÎNSOIRE"
 * (litere spaced + diacritice eliminate). Acum încarcă Liberation Sans cu
 * fallback transliterare ASCII pentru text și autoTable.
 *
 * @param {object} args
 * @param {object} args.auditor — date auditor (name, atestat, grade, mdlpaCode, attestationIssueDate)
 * @param {object} args.building — date clădire (address, cadastralNumber, locality, county, yearBuilt, areaUseful, category)
 * @param {string} args.cpeCode — codul unic CPE generat local
 * @param {Array<{name:string, sizeMB?:number}>} args.attachments — lista atașamente
 * @param {boolean} [args.download=true] — declanșează download automat
 * @returns {Promise<Blob>}
 */
export async function generateCoverLetterPdf({
  auditor = {},
  building = {},
  cpeCode = "",
  attachments = [],
  download = true,
}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const writeText = makeTextWriter(doc, fontOk);
  const norm = (t) => normalizeForPdf(t, fontOk);
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const todayRO = new Date().toLocaleDateString("ro-RO", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const ordLabel = getAttestationOrdinanceLabel(auditor.attestationIssueDate);

  // Antet
  doc.setFont(baseFont, "bold");
  doc.setFontSize(14);
  writeText("SCRISOARE DE ÎNSOȚIRE", pageW / 2, 22, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(baseFont, "normal");
  writeText(
    "depunere fizică Certificat de Performanță Energetică",
    pageW / 2, 28, { align: "center" }
  );
  doc.setDrawColor(180);
  doc.line(margin, 32, pageW - margin, 32);

  // Destinatar
  let y = 40;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(10);
  writeText("Către:", margin, y);
  doc.setFont(baseFont, "normal");
  writeText("Ministerul Dezvoltării, Lucrărilor Publice și Administrației (MDLPA)", margin + 16, y);
  y += 5;
  writeText("Direcția Atestări — Registrul Auditorilor Energetici", margin + 16, y);
  y += 5;
  writeText("Adresa: Str. Apolodor nr. 17, sector 5, București", margin + 16, y);

  // Data + Cod CPE
  y += 10;
  doc.setFont(baseFont, "bold");
  writeText("Data:", margin, y);
  doc.setFont(baseFont, "normal");
  writeText(todayRO, margin + 16, y);
  y += 5;
  doc.setFont(baseFont, "bold");
  writeText("Cod CPE:", margin, y);
  doc.setFont(baseFont, "normal");
  writeText(cpeCode || "—", margin + 22, y);

  // Date auditor
  y += 10;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(11);
  writeText("AUDITOR ENERGETIC", margin, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 1, margin + 60, y + 1);
  doc.setFontSize(10);

  y += 7;
  const auditorRows = [
    ["Nume:", auditor.name || "—"],
    ["Nr. atestat:", auditor.atestat || auditor.license_number || "—"],
    ["Grad atestare:", auditor.grade || "—"],
    ["Atestat conform:", ordLabel.short],
    ["Cod MDLPA:", auditor.mdlpaCode || "(se va atribui la înregistrare)"],
  ];
  for (const [k, v] of auditorRows) {
    doc.setFont(baseFont, "bold");
    writeText(k, margin, y);
    doc.setFont(baseFont, "normal");
    writeText(String(v), margin + 36, y);
    y += 5;
  }

  // Date clădire
  y += 5;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(11);
  writeText("CLĂDIRE CERTIFICATĂ", margin, y);
  doc.line(margin, y + 1, margin + 60, y + 1);
  doc.setFontSize(10);
  y += 7;
  const buildingRows = [
    ["Adresă:", building.address || "—"],
    ["Localitate / județ:", `${building.locality || building.city || "—"} / ${building.county || "—"}`],
    ["Nr. cadastral:", building.cadastralNumber || building.cadastral_number || "—"],
    ["Carte funciară:", building.landBook || "—"],
    ["An construcție:", building.yearBuilt || building.year_built || "—"],
    ["Suprafață utilă:", building.areaUseful || building.useful_area ? `${building.areaUseful || building.useful_area} m²` : "—"],
    ["Destinație:", building.category || building.building_type || "rezidențial"],
  ];
  for (const [k, v] of buildingRows) {
    doc.setFont(baseFont, "bold");
    writeText(k, margin, y);
    doc.setFont(baseFont, "normal");
    writeText(String(v), margin + 42, y);
    y += 5;
  }

  // Lista atașamente
  y += 5;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(11);
  writeText("DOCUMENTE DEPUSE", margin, y);
  doc.line(margin, y + 1, margin + 60, y + 1);
  doc.setFontSize(10);
  y += 7;
  doc.setFont(baseFont, "normal");
  if (!attachments || attachments.length === 0) {
    writeText("(Lista atașamentelor se completează manual)", margin, y);
    y += 5;
  } else {
    attachments.forEach((att, i) => {
      const sizeStr = att.sizeMB ? ` (${att.sizeMB.toFixed(2)} MB)` : "";
      const line = `${i + 1}. ${att.name || "fișier"}${sizeStr}`;
      writeText(line, margin, y);
      y += 5;
    });
  }

  // Declarație
  y += 5;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(10);
  writeText("DECLARAȚIE:", margin, y);
  y += 5;
  doc.setFont(baseFont, "normal");
  doc.setFontSize(9);
  const decl = `Subsemnatul, în calitate de auditor energetic atestat, declar pe propria răspundere că ` +
    `documentele anexate (CPE + Anexa 1 + Anexa 2) sunt complete și conforme cu metodologia ` +
    `Mc 001-2022, ${ordLabel.short} și prevederile Legii 372/2005 R2. Solicit înregistrarea ` +
    `prezentului CPE în Registrul Național al Auditorilor Energetici.`;
  const declLines = doc.splitTextToSize(norm(decl), pageW - 2 * margin);
  doc.text(declLines, margin, y);
  y += declLines.length * 4 + 4;

  // Notă tranziție portal
  doc.setFontSize(8);
  doc.setTextColor(110);
  const transNote =
    "[!] Notă tranziție: documentul este generat în perioada de tranziție Ord. MDLPA 348/2026 " +
    "(14.IV.2026 → 11.X.2026), când portalul electronic MDLPA pentru distincția Ici/IIci nu " +
    "este încă operațional (start prevăzut 8.VII.2026). Depunerea se efectuează prin procedura " +
    "veche (fizică / email birou.atestari@mdlpa.ro).";
  const transLines = doc.splitTextToSize(norm(transNote), pageW - 2 * margin);
  doc.text(transLines, margin, y);
  y += transLines.length * 3.5 + 6;
  doc.setTextColor(0);

  // Spațiu semnătură + ștampilă
  doc.setFont(baseFont, "bold");
  doc.setFontSize(10);
  writeText("Semnătura auditor:", margin, y);
  writeText("Ștampilă (Ø 40 mm):", pageW / 2 + 5, y);
  doc.setLineWidth(0.3);
  doc.rect(margin, y + 2, 70, 25);
  doc.circle(pageW / 2 + 25, y + 14, 12);

  // Footer
  doc.setFont(baseFont, "italic");
  doc.setFontSize(7);
  doc.setTextColor(140);
  writeText(
    `Generat de Zephren Energy Calculator · ${todayRO} · ${ordLabel.short}`,
    pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" }
  );

  const blob = doc.output("blob");
  if (download) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Scrisoare_insotire_CPE_${cpeCode || "draft"}_${new Date()
      .toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return blob;
}
