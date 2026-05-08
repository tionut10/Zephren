/**
 * cover-letter-pdf.js — Scrisoare de însoțire PDF pentru depunere CPE la MDLPA
 *
 * T4 Sprint Tranziție 2026 (2 mai 2026) + Sprint Visual-2 (8 mai 2026)
 *
 * Generează „Scrisoare de însoțire" PDF pentru depunerea fizică a CPE la MDLPA
 * în perioada în care portalul electronic nu este operațional (până la 8.VII.2026,
 * conform Art. 19 alin. (3) Ord. MDLPA 348/2026).
 *
 * Layout (Sprint Visual-2 — 1 pagină A4 portret):
 *   • Header brand (logo + cod CPE + dată)
 *   • Titlu „SCRISOARE DE ÎNSOȚIRE" cu bară primary
 *   • Destinatar MDLPA
 *   • 3 secțiuni cu titluri brand: AUDITOR / CLĂDIRE / DOCUMENTE DEPUSE
 *   • Declarație + notă tranziție în box
 *   • Box semnătură 80×35mm + Box ștampilă cerc 40mm
 *   • Footer brand (auditor + Pag X/Y + generator)
 */

import { getAttestationOrdinanceLabel } from "../calc/auditor-attestation-validity.js";
import { setupRomanianFont, makeTextWriter, normalizeForPdf, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
import {
  BRAND_COLORS,
  FONT_SIZES,
  A4,
  SPACING,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  buildBrandMetadata,
} from "./pdf-brand-kit.js";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderSectionHeader,
  renderSignatureBox,
  renderQrCode,
  buildVerifyUrl,
} from "./pdf-brand-layout.js";

/**
 * Generează scrisoarea de însoțire ca PDF Blob și descarcă automat.
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

  const ordLabel = getAttestationOrdinanceLabel(auditor.attestationIssueDate);

  // Brand metadata
  const brandMeta = buildBrandMetadata({
    title: "Scrisoare de Însoțire",
    cpeCode,
    building: {
      address: building.address,
      category: building.category || building.building_type,
      areaUseful: building.areaUseful || building.useful_area,
      year: building.yearBuilt || building.year_built,
      cadastral: building.cadastralNumber || building.cadastral_number,
    },
    auditor: {
      name: auditor.name,
      atestat: auditor.atestat || auditor.license_number,
      grade: auditor.grade,
      firm: auditor.company || auditor.firm,
    },
    docType: "cover-letter",
    version: "v4.0",
  });

  // ── Header brand
  applyBrandHeader(doc, brandMeta);

  // ── Titlu central cu bară primary
  let y = A4.MARGIN_TOP + 4;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(FONT_SIZES.TITLE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("SCRISOARE DE ÎNSOȚIRE", A4.WIDTH / 2, y, { align: "center" });
  y += 6;
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.H3);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("depunere fizică Certificat de Performanță Energetică", A4.WIDTH / 2, y, { align: "center" });
  y += 3;
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(A4.WIDTH / 2 - 30, y, A4.WIDTH / 2 + 30, y);
  y += SPACING.LG;

  // ── Destinatar
  doc.setFont(baseFont, "bold");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("Către:", A4.MARGIN_LEFT, y);
  doc.setFont(baseFont, "normal");
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  writeText("Ministerul Dezvoltării, Lucrărilor Publice și Administrației (MDLPA)", A4.MARGIN_LEFT + 16, y);
  y += 5;
  writeText("Direcția Atestări — Registrul Auditorilor Energetici", A4.MARGIN_LEFT + 16, y);
  y += 5;
  writeText("Adresa: Str. Apolodor nr. 17, sector 5, București", A4.MARGIN_LEFT + 16, y);

  // ── Data + Cod CPE (în-line, evidențiate)
  y += SPACING.LG;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("Data:", A4.MARGIN_LEFT, y);
  doc.setFont(baseFont, "normal");
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  writeText(brandMeta.dateText, A4.MARGIN_LEFT + 16, y);
  y += 5;
  doc.setFont(baseFont, "bold");
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("Cod CPE:", A4.MARGIN_LEFT, y);
  doc.setFont(baseFont, "normal");
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "text");
  writeText(cpeCode || "—", A4.MARGIN_LEFT + 22, y);

  // ── Date auditor
  y += SPACING.LG;
  y = renderSectionHeader(doc, "Auditor energetic", y);

  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const auditorRows = [
    ["Nume:", auditor.name || "—"],
    ["Nr. atestat:", auditor.atestat || auditor.license_number || "—"],
    ["Grad atestare:", auditor.grade || "—"],
    ["Atestat conform:", ordLabel.short],
    ["Cod MDLPA:", auditor.mdlpaCode || "(se va atribui la înregistrare)"],
  ];
  for (const [k, v] of auditorRows) {
    doc.setFont(baseFont, "bold");
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    writeText(k, A4.MARGIN_LEFT, y);
    doc.setFont(baseFont, "normal");
    setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
    writeText(String(v), A4.MARGIN_LEFT + 36, y);
    y += 5;
  }

  // ── Date clădire
  y += SPACING.SM;
  y = renderSectionHeader(doc, "Clădire certificată", y);

  doc.setFontSize(FONT_SIZES.BODY);
  const buildingRows = [
    ["Adresă:", building.address || "—"],
    ["Localitate / județ:", `${building.locality || building.city || "—"} / ${building.county || "—"}`],
    ["Nr. cadastral:", building.cadastralNumber || building.cadastral_number || "—"],
    ["Carte funciară:", building.landBook || "—"],
    ["An construcție:", building.yearBuilt || building.year_built || "—"],
    ["Suprafață utilă:", (building.areaUseful || building.useful_area) ? `${building.areaUseful || building.useful_area} m²` : "—"],
    ["Destinație:", building.category || building.building_type || "rezidențial"],
  ];
  for (const [k, v] of buildingRows) {
    doc.setFont(baseFont, "bold");
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    writeText(k, A4.MARGIN_LEFT, y);
    doc.setFont(baseFont, "normal");
    setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
    writeText(String(v), A4.MARGIN_LEFT + 42, y);
    y += 5;
  }

  // ── Lista atașamente
  y += SPACING.SM;
  y = renderSectionHeader(doc, "Documente depuse", y);

  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  if (!attachments || attachments.length === 0) {
    doc.setFont(baseFont, "italic");
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    writeText("(Lista atașamentelor se completează manual)", A4.MARGIN_LEFT, y);
    y += 5;
  } else {
    attachments.forEach((att, i) => {
      const sizeStr = att.sizeMB ? ` (${att.sizeMB.toFixed(2)} MB)` : "";
      const line = `${i + 1}. ${att.name || "fișier"}${sizeStr}`;
      writeText(line, A4.MARGIN_LEFT, y);
      y += 5;
    });
  }

  // ── Declarație + notă tranziție în box-uri evidențiate
  y += SPACING.MD;
  // Box declarație
  doc.setFont(baseFont, "bold");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.PRIMARY_DARK, "text");
  writeText("DECLARAȚIE:", A4.MARGIN_LEFT, y);
  y += 5;
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const decl = `Subsemnatul, în calitate de auditor energetic atestat, declar pe propria răspundere că ` +
    `documentele anexate (CPE + Anexa 1 + Anexa 2) sunt complete și conforme cu metodologia ` +
    `Mc 001-2022, ${ordLabel.short} și prevederile Legii 372/2005 R2. Solicit înregistrarea ` +
    `prezentului CPE în Registrul Național al Auditorilor Energetici.`;
  const declLines = doc.splitTextToSize(norm(decl), A4.CONTENT_WIDTH);
  doc.text(declLines, A4.MARGIN_LEFT, y);
  y += declLines.length * 4 + SPACING.SM;

  // Notă tranziție în fundal warning subtil
  setBrandColor(doc, BRAND_COLORS.PRIMARY_FAINT, "fill");
  const noteLines = doc.splitTextToSize(
    norm(
      "Notă tranziție: documentul este generat în perioada de tranziție Ord. MDLPA 348/2026 " +
      "(14.IV.2026 → 11.X.2026), când portalul electronic MDLPA pentru distincția Ici/IIci nu " +
      "este încă operațional (start prevăzut 8.VII.2026). Depunerea se efectuează prin procedura " +
      "veche (fizică / email birou.atestari@mdlpa.ro).",
    ),
    A4.CONTENT_WIDTH - 4,
  );
  const noteHeight = noteLines.length * 3.5 + 4;
  doc.rect(A4.MARGIN_LEFT, y, A4.CONTENT_WIDTH, noteHeight, "F");
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.MEDIUM);
  doc.line(A4.MARGIN_LEFT, y, A4.MARGIN_LEFT, y + noteHeight);
  doc.setFont(baseFont, "italic");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  doc.text(noteLines, A4.MARGIN_LEFT + 2, y + 4);
  y += noteHeight + SPACING.LG;

  // ── Spațiu semnătură + ștampilă (folosind renderSignatureBox)
  // Box semnătură stânga (auditor)
  renderSignatureBox(doc, A4.MARGIN_LEFT, y, {
    label: "SEMNĂTURĂ AUDITOR",
    name: auditor.name,
    atestat: auditor.atestat || auditor.license_number,
    date: brandMeta.dateText,
    width: 80,
    height: 35,
  });

  // Cerc ștampilă dreapta (Ø 40mm)
  setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
  doc.setLineWidth(STROKE_WIDTH.THIN);
  doc.circle(A4.WIDTH - A4.MARGIN_RIGHT - 25, y + 14, 12);
  doc.setFont(baseFont, "italic");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("Ștampilă", A4.WIDTH - A4.MARGIN_RIGHT - 25, y + 31, { align: "center" });
  writeText("(Ø 40 mm)", A4.WIDTH - A4.MARGIN_RIGHT - 25, y + 34, { align: "center" });

  // ── QR cod verificare integritate (Sprint V7-C)
  await renderQrCode(doc, buildVerifyUrl(brandMeta), {
    x: A4.WIDTH - A4.MARGIN_RIGHT - 18,
    y: A4.HEIGHT - 35 - 15,
    size: 18,
    label: "Verifică online",
  });

  // ── Footer brand
  applyBrandFooter(doc, brandMeta, 1, 1, {
    legalText: `Mc 001-2022 · ${ordLabel.short} · Legea 372/2005 R2`,
  });

  const blob = doc.output("blob");
  if (download) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Scrisoare_insotire_CPE_${cpeCode || "draft"}_${formatRomanianDate(new Date(), "iso")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return blob;
}
