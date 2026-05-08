/**
 * client-request-pdf.js — Cerere oficială client → auditor pentru CPE/Audit.
 *
 * Sprint Client-Form-v2 (8 mai 2026)
 *
 * Document inițial al dosarului energetic: clientul completează datele de bază,
 * descrie scopul și semnează olograf. Auditorul folosește această cerere ca
 * baza juridică pentru deschiderea dosarului (Art. 6 alin. 1 Ord. 348/2026).
 *
 * Structură document:
 *   Pagina 1 — Copertă cu logo mare, date cheie, cod cerere
 *   Pagina 2+ — Secțiuni 1-6: client, clădire, servicii, documente, GDPR, auditor
 *
 * Bază legală:
 *   - Art. 6 alin. 1 Ord. MDLPA 348/2026
 *   - HG 273/1994 — documentația obligatorie pentru clădiri
 *   - GDPR (Reg. UE 2016/679 + Legea 190/2018 RO)
 *   - AFM Casa Eficientă 2026 — cerere obligatorie în dosar finanțare
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";
import {
  BRAND_COLORS,
  FONT_SIZES,
  A4,
  STROKE_WIDTH,
  setBrandColor,
  formatRomanianDate,
  buildBrandMetadata,
} from "./pdf-brand-kit.js";
import {
  applyBrandHeader,
  applyBrandFooter,
  renderSignatureBox,
  renderQrCode,
  buildVerifyUrl,
} from "./pdf-brand-layout.js";
import {
  drawZephrenLogoFull,
} from "./pdf-brand-logo.js";

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ── Helper: încarcă logo PNG din /public pentru addImage (fallback la vector)
async function _loadLogoDataUrl() {
  try {
    const resp = await fetch("/logo_ro.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generează cerere oficială client → auditor (PDF A4 portret).
 *
 * @param {object} args
 * @param {object} [args.client]   — { name, type:"PF"|"PJ", cnp?, cui?, address?, email?, phone?, city? }
 * @param {object} [args.building] — { address, locality?, county?, cadastralNumber?, landBook?, category?, areaUseful?, yearBuilt?, scopCpe?, nFloors? }
 * @param {object} [args.auditor]  — { name?, atestat?, grade?, company? }
 * @param {object} [args.services] — { cpe:bool, audit:bool, passport:bool, nzebRoadmap:bool }
 * @param {Array<{label:string, available:boolean}>} [args.documents]
 * @param {Date} [args.requestDate]
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateClientRequestPdf({
  client = {},
  building = {},
  auditor = {},
  services = { cpe: true, audit: false, passport: false, nzebRoadmap: false },
  documents = [],
  requestDate = new Date(),
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = A4.MARGIN_LEFT;
  const pageW = A4.WIDTH;
  const lineW = A4.CONTENT_WIDTH;

  const isPJ = String(client.type || "").toUpperCase() === "PJ";
  const requestCode = "CR-" + formatRomanianDate(requestDate, "iso");

  const brandMeta = buildBrandMetadata({
    title: "Cerere Documentație Energetică",
    cpeCode: requestCode,
    building: {
      address: [building.address, building.locality, building.county].filter(Boolean).join(", "),
      category: building.category,
      areaUseful: building.areaUseful,
      year: building.yearBuilt,
      cadastral: building.cadastralNumber,
    },
    auditor: {
      name: auditor.name,
      atestat: auditor.atestat,
      grade: auditor.grade,
      firm: auditor.company,
    },
    date: requestDate,
    docType: "client-request",
    version: "v5.0",
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PAGINA 1 — COPERTĂ
  // ════════════════════════════════════════════════════════════════════════════

  // Fundal top verde gradient (bandă 55mm)
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "fill");
  doc.rect(0, 0, pageW, 55, "F");

  // Logo mare alb pe verde — vector (drawZephrenLogoFull desenează cu SLATE_400)
  // Suprascriem cu versiune albă pentru contrast pe fundal verde
  _drawLogoWhite(doc, (pageW - 48) / 2, 8, 48);

  // Tagline sub logo
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, [255, 255, 255], "text");
  writeText("Energy Performance Calculator", pageW / 2, 50, { align: "center" });

  // Titlu principal
  const titleY = 68;
  doc.setFont(baseFont, "bold");
  doc.setFontSize(FONT_SIZES.TITLE);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
  writeText("CERERE", pageW / 2, titleY, { align: "center" });

  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.H3);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("pentru elaborare documentație energetică", pageW / 2, titleY + 7, { align: "center" });

  // Linie accent
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.HEAVY);
  doc.line(pageW / 2 - 28, titleY + 11, pageW / 2 + 28, titleY + 11);

  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.CAPTION);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText("Conform Art. 6 alin. 1 Ord. MDLPA 348/2026 · L. 372/2005 republicată",
    pageW / 2, titleY + 16, { align: "center" });

  // ── INFO BOX SUMAR (4 câmpuri cheie în card cu fundal primar light)
  const boxY = titleY + 24;
  const boxH = 52;
  const boxPad = 5;

  // Fundal box
  setBrandColor(doc, BRAND_COLORS.PRIMARY_FAINT, "fill");
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
  doc.setLineWidth(STROKE_WIDTH.MEDIUM);
  doc.roundedRect(M, boxY, lineW, boxH, 2, 2, "FD");

  // Linie stânga accent
  setBrandColor(doc, BRAND_COLORS.PRIMARY, "fill");
  doc.rect(M, boxY, 2, boxH, "F");

  // Conținut box — 2 coloane × 2 rânduri
  const col1X = M + 6;
  const col2X = M + lineW / 2 + 4;
  const row1Y = boxY + 11;
  const row2Y = boxY + 28;
  const row3Y = boxY + 43;

  const _infoLabel = (txt, x, y) => {
    doc.setFont(baseFont, "bold");
    doc.setFontSize(FONT_SIZES.CAPTION);
    setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
    writeText(txt, x, y);
  };
  const _infoValue = (txt, x, y, maxW = 75) => {
    doc.setFont(baseFont, "bold");
    doc.setFontSize(FONT_SIZES.BODY);
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
    const lines = doc.splitTextToSize(String(txt || "—"), maxW);
    writeText(lines[0], x, y);
  };

  _infoLabel("PROPRIETAR", col1X, row1Y - 3);
  _infoValue(client.name, col1X, row1Y + 2, lineW / 2 - 10);

  _infoLabel("CLĂDIRE", col2X, row1Y - 3);
  _infoValue(
    [building.address, building.locality, building.county].filter(Boolean).join(", ") || building.address,
    col2X, row1Y + 2, lineW / 2 - 10,
  );

  _infoLabel("SCOP SOLICITARE", col1X, row2Y - 3);
  _infoValue(
    _scopLabel(building.scopCpe),
    col1X, row2Y + 2, lineW / 2 - 10,
  );

  _infoLabel("SERVICII SOLICITATE", col2X, row2Y - 3);
  const servicesList = [
    services.cpe && "CPE",
    services.audit && "Audit energetic",
    services.nzebRoadmap && "Foaie de parcurs nZEB",
  ].filter(Boolean).join(" + ") || "—";
  _infoValue(servicesList, col2X, row2Y + 2, lineW / 2 - 10);

  _infoLabel("COD CERERE", col1X, row3Y - 3);
  _infoValue(requestCode, col1X, row3Y + 2);

  _infoLabel("DATA SOLICITĂRII", col2X, row3Y - 3);
  _infoValue(brandMeta.dateText, col2X, row3Y + 2);

  // ── Linie separator
  const sepY = boxY + boxH + 10;
  setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
  doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
  doc.line(M, sepY, pageW - M, sepY);

  // ── Text instructaj
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  const intro =
    "Prin prezenta solicit elaborarea documentației energetice indicate mai sus pentru imobilul " +
    "identificat în Secțiunea 2. Datele furnizate sunt corecte și complete conform cunoștințelor mele. " +
    "Documentul va fi semnat olograf și depus la auditorul energetic înainte de începerea lucrărilor.";
  const introLines = doc.splitTextToSize(intro, lineW);
  let y = sepY + 8;
  introLines.forEach(l => { writeText(l, M, y); y += 4.5; });

  // ── Footer copertă (fără header — prima pagină)
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.FOOTER);
  setBrandColor(doc, BRAND_COLORS.SLATE_500, "text");
  writeText(
    "Mc 001-2022 · Ord. MDLPA 348/2026 · L. 372/2005 R2 · GDPR Reg. UE 2016/679",
    pageW / 2, A4.HEIGHT - 8, { align: "center" },
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGINA 2 — SECȚIUNI DETALIATE
  // ════════════════════════════════════════════════════════════════════════════

  doc.addPage();
  applyBrandHeader(doc, brandMeta);
  y = A4.MARGIN_TOP + 6;

  // ── Helper: secțiune cu header colorat
  const section = (title) => {
    if (y > 252) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages() - 1,
        doc.internal.getNumberOfPages(), { legalText: "Mc 001-2022 · Ord. MDLPA 348/2026" });
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 6;
    }
    // Fundal header secțiune
    setBrandColor(doc, BRAND_COLORS.SLATE_900, "fill");
    doc.rect(M, y - 4.5, lineW, 7, "F");
    doc.setFont(baseFont, "bold");
    doc.setFontSize(FONT_SIZES.H3);
    setBrandColor(doc, BRAND_COLORS.WHITE, "text");
    writeText(title, M + 3, y + 0.5);
    setBrandColor(doc, BRAND_COLORS.BLACK, "text");
    y += 6;
  };

  // ── Helper: rând date cu zebra alternant
  let _zebraToggle = false;
  const row = (label, value) => {
    if (y > 272) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages() - 1,
        doc.internal.getNumberOfPages());
      doc.addPage();
      applyBrandHeader(doc, brandMeta);
      y = A4.MARGIN_TOP + 6;
      _zebraToggle = false;
    }
    _zebraToggle = !_zebraToggle;

    // Fundal zebra
    if (_zebraToggle) {
      setBrandColor(doc, BRAND_COLORS.SLATE_50, "fill");
      doc.rect(M, y - 3, lineW, 5.5, "F");
    }

    // Label
    doc.setFont(baseFont, "bold");
    doc.setFontSize(9);
    setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
    writeText(label, M + 2, y + 0.5);

    // Valoare
    doc.setFont(baseFont, "normal");
    const val = String(value || "—");
    const labelW = 72;
    const valLines = doc.splitTextToSize(val, lineW - labelW - 2);
    valLines.forEach((l, i) => {
      setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");
      writeText(l, M + labelW, y + 0.5 + i * 3.5);
    });

    // Linie subțire
    setBrandColor(doc, BRAND_COLORS.SLATE_200, "draw");
    doc.setLineWidth(STROKE_WIDTH.HAIRLINE);
    doc.line(M, y + 2.5 + (valLines.length - 1) * 3.5, pageW - M, y + 2.5 + (valLines.length - 1) * 3.5);
    setBrandColor(doc, BRAND_COLORS.BLACK, "draw");

    y += Math.max(5.5, 2 + valLines.length * 3.5);
  };

  // ── Secțiunea 1: Client
  _zebraToggle = false;
  section("1. IDENTIFICARE SOLICITANT (PROPRIETAR)");
  row("Nume / Denumire", client.name);
  row("Tip", isPJ ? "Persoană Juridică (PJ)" : "Persoană Fizică (PF)");
  if (isPJ) {
    row("CUI", client.cui);
  } else {
    const cnp = client.cnp || "";
    const masked = cnp.length === 13 ? cnp.slice(0, 7) + "******" : (cnp ? "[completat]" : "—");
    row("CNP (parțial mascat)", masked);
  }
  row("Adresă domiciliu / sediu", client.address);
  row("Localitate domiciliu", client.city);
  row("Email", client.email);
  row("Telefon", client.phone);
  y += 3;

  // ── Secțiunea 2: Clădire
  _zebraToggle = false;
  section("2. IDENTIFICARE CLĂDIRE");
  row("Adresă clădire", building.address);
  row("Localitate / Județ", [building.locality, building.county].filter(Boolean).join(" / ") || "—");
  row("Număr cadastral ANCPI", building.cadastralNumber);
  row("Carte Funciară (CF)", building.landBook);
  row("Tip clădire / categorie", building.category);
  row("Suprafață utilă Au", building.areaUseful ? `${building.areaUseful} m²` : "—");
  row("An construcție", building.yearBuilt);
  row("Nr. etaje", building.nFloors);
  row("Scop solicitare CPE", _scopLabel(building.scopCpe));
  y += 3;

  // ── Secțiunea 3: Servicii
  _zebraToggle = false;
  section("3. SERVICII SOLICITATE");
  doc.setFont(baseFont, "normal");
  doc.setFontSize(9);
  setBrandColor(doc, BRAND_COLORS.SLATE_900, "text");

  const _checkRow = (checked, label) => {
    if (y > 272) { doc.addPage(); applyBrandHeader(doc, brandMeta); y = A4.MARGIN_TOP + 6; }
    // Căsuță desenată
    doc.setLineWidth(STROKE_WIDTH.THIN);
    setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
    doc.rect(M + 2, y - 3, 4, 4, "S");
    if (checked) {
      setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
      doc.setLineWidth(STROKE_WIDTH.MEDIUM);
      doc.line(M + 2.5, y - 1, M + 3.8, y + 0.5);
      doc.line(M + 3.8, y + 0.5, M + 5.8, y - 2.8);
      doc.setLineWidth(STROKE_WIDTH.THIN);
    }
    setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
    doc.setFont(baseFont, checked ? "bold" : "normal");
    doc.setFontSize(9);
    setBrandColor(doc, checked ? BRAND_COLORS.SLATE_900 : BRAND_COLORS.SLATE_500, "text");
    writeText(label, M + 9, y + 0.3);
    y += 5.5;
  };

  _checkRow(services.cpe,       "Certificat de Performanță Energetică (CPE) — model standardizat MDLPA");
  _checkRow(services.audit,     "Audit energetic (RAE) cu analiză cost-optim și recomandări măsuri");
  _checkRow(services.nzebRoadmap, "Foaie de parcurs nZEB (renovare etapizată — Art. 6 lit. c Ord. 348/2026)");
  y += 3;

  // ── Secțiunea 4: Documente atașate
  _zebraToggle = false;
  section("4. DOCUMENTE ATAȘATE LA CERERE (declarate de client)");
  doc.setFont(baseFont, "normal");
  doc.setFontSize(9);

  const defaultDocs = [
    { label: "Copie CI proprietar (PF) / Certificat ONRC (PJ)", available: false },
    { label: "Extras de Carte Funciară (CF) — eliberat în ultimele 30 zile", available: false },
    { label: "Plan / releveu construcție (arhitectură)", available: false },
    { label: "Cartea Tehnică a construcției (clădiri ≥ 1995)", available: false },
    { label: "Procesul-verbal de recepție", available: false },
    { label: "Autorizație de construire (renovare/extindere)", available: false },
    { label: "Facturi energie ultimii 3 ani (electricitate / gaz / lemn)", available: false },
    { label: "Detalii sisteme HVAC (poze, fișe tehnice)", available: false },
  ];
  const docList = Array.isArray(documents) && documents.length > 0 ? documents : defaultDocs;

  docList.forEach(d => {
    if (y > 270) { doc.addPage(); applyBrandHeader(doc, brandMeta); y = A4.MARGIN_TOP + 6; }
    doc.setLineWidth(STROKE_WIDTH.THIN);
    setBrandColor(doc, BRAND_COLORS.SLATE_400, "draw");
    doc.rect(M + 2, y - 3, 4, 4, "S");
    if (d.available) {
      setBrandColor(doc, BRAND_COLORS.PRIMARY, "draw");
      doc.setLineWidth(STROKE_WIDTH.MEDIUM);
      doc.line(M + 2.5, y - 1, M + 3.8, y + 0.5);
      doc.line(M + 3.8, y + 0.5, M + 5.8, y - 2.8);
      doc.setLineWidth(STROKE_WIDTH.THIN);
    }
    setBrandColor(doc, BRAND_COLORS.BLACK, "draw");
    doc.setFont(baseFont, d.available ? "bold" : "normal");
    setBrandColor(doc, d.available ? BRAND_COLORS.SLATE_900 : BRAND_COLORS.SLATE_500, "text");
    writeText(d.label, M + 9, y + 0.3);
    y += 4.8;
  });
  y += 4;

  // ── Secțiunea 5: GDPR
  if (y > 220) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages() - 1, doc.internal.getNumberOfPages());
    doc.addPage(); applyBrandHeader(doc, brandMeta); y = A4.MARGIN_TOP + 6;
  }
  _zebraToggle = false;
  section("5. ACORD PRELUCRARE DATE PERSONALE (GDPR)");
  doc.setFont(baseFont, "normal");
  doc.setFontSize(8.5);
  setBrandColor(doc, [40, 40, 60], "text");
  const gdprText =
    "Subsemnatul/Subsemnata, în calitate de proprietar al imobilului identificat mai sus, declar pe propria " +
    "răspundere că datele furnizate sunt corecte și îmi exprim acordul pentru prelucrarea datelor cu caracter " +
    "personal de către auditorul energetic, în conformitate cu Reg. UE 2016/679 (GDPR) și Legea 190/2018 RO. " +
    "Datele vor fi folosite exclusiv pentru emiterea documentațiilor energetice solicitate și depunerea lor " +
    "la portalul electronic MDLPA (Art. 4 alin. 6 Ord. 348/2026). " +
    "Datele se păstrează 30 ani conform Mc 001-2022 §10.";
  const gdprLines = doc.splitTextToSize(gdprText, lineW);
  gdprLines.forEach(l => { writeText(l, M, y); y += 4; });
  setBrandColor(doc, BRAND_COLORS.BLACK, "text");
  y += 4;

  // ── Secțiunea 6: Auditor (opțional)
  if (auditor && (auditor.name || auditor.atestat)) {
    if (y > 245) {
      applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages() - 1, doc.internal.getNumberOfPages());
      doc.addPage(); applyBrandHeader(doc, brandMeta); y = A4.MARGIN_TOP + 6;
    }
    _zebraToggle = false;
    section("6. AUDITOR ENERGETIC PREFERAT (opțional)");
    row("Nume auditor", auditor.name);
    row("Atestat MDLPA / grad", `${auditor.atestat || "—"}${auditor.grade ? " (grad " + auditor.grade + ")" : ""}`);
    row("Companie / PFA", auditor.company);
    y += 3;
  }

  // ── Loc + Dată + Semnătură
  if (y > 238) {
    applyBrandFooter(doc, brandMeta, doc.internal.getNumberOfPages() - 1, doc.internal.getNumberOfPages());
    doc.addPage(); applyBrandHeader(doc, brandMeta); y = A4.MARGIN_TOP + 6;
  }
  y += 8;
  doc.setFont(baseFont, "normal");
  doc.setFontSize(FONT_SIZES.BODY);
  setBrandColor(doc, BRAND_COLORS.SLATE_700, "text");
  writeText(`Locul: ${client.city || "_____________________"}`, M, y);
  writeText(`Data: ${brandMeta.dateText}`, pageW - M - 55, y);
  y += 10;

  renderSignatureBox(doc, M, y, {
    label: isPJ ? "SEMNĂTURĂ OLOGRAF + ȘTAMPILĂ" : "SEMNĂTURĂ OLOGRAF SOLICITANT",
    name: client.name,
    atestat: isPJ && client.cui ? `CUI ${client.cui}` : "",
    date: brandMeta.dateText,
    width: 90,
    height: 35,
  });

  // QR verificare
  await renderQrCode(doc, buildVerifyUrl(brandMeta), {
    x: A4.WIDTH - A4.MARGIN_RIGHT - 20,
    y: y,
    size: 20,
    label: "Verifică online",
  });

  // Footer final
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    applyBrandFooter(doc, brandMeta, p, totalPages, {
      legalText: "Mc 001-2022 · Ord. MDLPA 348/2026 · L. 372/2005 R2 · GDPR Reg. UE 2016/679",
    });
  }

  // ── Save
  const fname = `Cerere_${_safeSlug(client.name || building.address || "client").slice(0, 40)}_${formatRomanianDate(new Date(), "iso")}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers interne
// ─────────────────────────────────────────────────────────────────────────────

function _scopLabel(scop) {
  const map = {
    "vanzare": "Vânzare imobil",
    "inchiriere": "Închiriere",
    "receptie": "Recepție lucrări (DTAC/finală)",
    "informare": "Informare proprietar",
    "renovare": "Renovare majoră",
    "renovare_majora": "Renovare majoră",
    "finantare": "Acces finanțare (AFM/PNRR/bancă)",
    "alt": "Alt scop",
  };
  return map[scop] || scop || "—";
}

/**
 * Desenează logo Zephren cu text alb pe fundal colorat (pentru copertă).
 * Refolosește drawZephrenLogoFull dar suprascrie textul cu alb.
 */
function _drawLogoWhite(doc, x, y, width = 30) {
  const scale = width / 30;

  // Coș (rect alb)
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 19.92 * scale, y + 4.44 * scale, 2.16 * scale, 5.40 * scale, "F");

  // Acoperiș (alb)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.84 * scale);
  doc.setLineCap("butt");
  doc.line(x + 3.0 * scale, y + 12.30 * scale, x + 15.0 * scale, y + 3.00 * scale);
  doc.line(x + 15.0 * scale, y + 3.00 * scale, x + 27.0 * scale, y + 12.30 * scale);

  // Perete + podea (alb)
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 3.0 * scale, y + 12.30 * scale, 0.84 * scale, 14.46 * scale, "F");
  doc.rect(x + 3.0 * scale, y + 26.76 * scale, 24.0 * scale, 0.84 * scale, "F");

  // Text "Zephren" alb
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12 * scale);
  doc.setTextColor(255, 255, 255);
  doc.text("Zephren", x + 15.0 * scale, y + 35.0 * scale, { align: "center" });

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
}
