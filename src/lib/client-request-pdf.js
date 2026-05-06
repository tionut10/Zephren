/**
 * client-request-pdf.js — Cerere oficială client → auditor pentru CPE/Audit.
 *
 * Document inițial al dosarului energetic: clientul completează datele de bază,
 * descrie scopul și semnează olograf. Auditorul folosește această cerere ca
 * baza juridică pentru deschiderea dosarului (Art. 6 alin. 1 Ord. 348/2026).
 *
 * Conține:
 *   1. Antet + identificare proprietar (nume/CNP/CUI/adresă/contact)
 *   2. Date clădire (adresă/cadastral/categorie/suprafață/an/scop)
 *   3. Servicii solicitate (CPE / Audit / Pașaport / Roadmap nZEB)
 *   4. Documente atașate (declarate de client — checklist)
 *   5. Acord GDPR pentru prelucrare date personale (Reg. UE 2016/679)
 *   6. Loc + dată + semnătură olograf client
 *
 * Bază legală:
 *   - Art. 6 alin. 1 Ord. MDLPA 348/2026 — auditor primește cerere scrisă
 *   - HG 273/1994 — documentația obligatorie pentru clădiri
 *   - GDPR (Reg. UE 2016/679 + Legea 190/2018 RO)
 *   - AFM Casa Eficientă 2026 — cerere obligatorie în dosar finanțare
 *
 * Sprint Conformitate P0-04 (6 mai 2026).
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";

const TODAY_RO = () => new Date().toLocaleDateString("ro-RO", {
  day: "2-digit", month: "long", year: "numeric",
});

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Generează cerere oficială client → auditor (PDF A4 portret).
 *
 * @param {object} args
 * @param {object} [args.client] — { name, type:"PF"|"PJ", cnp?, cui?, address?, email?, phone?, city? }
 * @param {object} [args.building] — { address, cadastralNumber?, landBook?, category?, areaUseful?, areaBuilt?, yearBuilt?, scopCpe?, locality?, county? }
 * @param {object} [args.auditor] — { name?, atestat?, grade?, company?, email?, phone? }
 * @param {object} [args.services] — { cpe:bool, audit:bool, passport:bool, nzebRoadmap:bool }
 * @param {Array<{label:string, available:boolean}>} [args.documents] — checklist documente atașate de client
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
  const M = 20;
  const pageW = doc.internal.pageSize.getWidth();
  const lineW = pageW - 2 * M;
  let y = 22;

  // ── Antet ────────────────────────────────────────────────────────────
  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("CERERE", pageW / 2, y, { align: "center" });
  y += 6;
  writeText("pentru elaborare documentație energetică", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Conform Art. 6 alin. 1 Ord. MDLPA 348/2026 + L. 372/2005 republicată cu L. 238/2024",
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // ── Helper: secțiune cu titlu îngroșat + subtitle ───────────────────
  const section = (title) => {
    if (y > 250) { doc.addPage(); y = 22; }
    doc.setFont(baseFont, "bold"); doc.setFontSize(11);
    doc.setFillColor(35, 41, 70); doc.rect(M, y - 4, lineW, 6, "F");
    doc.setTextColor(251, 191, 36);
    writeText(title, M + 2, y + 0.5);
    doc.setTextColor(0, 0, 0);
    y += 5;
  };

  // Helper: rând cu label/valoare aliniat
  const row = (label, value, opts = {}) => {
    if (y > 270) { doc.addPage(); y = 22; }
    doc.setDrawColor(220, 220, 230);
    doc.line(M, y + 2, pageW - M, y + 2);
    doc.setFont(baseFont, "bold"); doc.setFontSize(9);
    writeText(label, M + 2, y + 1);
    doc.setFont(baseFont, "normal");
    const val = String(value || "—");
    const labelW = opts.labelW || 70;
    const valLines = doc.splitTextToSize(val, lineW - labelW);
    valLines.forEach((line, idx) => {
      writeText(line, M + labelW, y + 1 + idx * 3.5);
    });
    y += Math.max(5.5, 1 + valLines.length * 3.5);
  };

  // ── Secțiunea 1: Identificare client ─────────────────────────────────
  section("1. IDENTIFICARE SOLICITANT (PROPRIETAR)");
  row("Nume / Denumire", client.name);
  const isPJ = String(client.type || "").toUpperCase() === "PJ";
  row("Tip", isPJ ? "Persoană Juridică (PJ)" : "Persoană Fizică (PF)");
  if (isPJ) {
    row("CUI", client.cui);
  } else {
    // CNP-ul nu se afișează integral pe documente publice — masking ultimele 6
    const cnp = client.cnp || "";
    const masked = cnp.length === 13 ? cnp.slice(0, 7) + "******" : (cnp ? "[completat]" : "—");
    row("CNP", masked);
  }
  row("Adresă", client.address);
  row("Localitate", client.city);
  row("Email", client.email);
  row("Telefon", client.phone);
  y += 2;

  // ── Secțiunea 2: Identificare clădire ────────────────────────────────
  section("2. IDENTIFICARE CLĂDIRE");
  row("Adresă clădire", building.address);
  row("Localitate / Județ", `${building.locality || "—"} / ${building.county || "—"}`);
  row("Număr cadastral", building.cadastralNumber);
  row("Carte funciară", building.landBook);
  row("Categorie funcțională", building.category);
  row("Suprafață utilă Au", building.areaUseful ? `${building.areaUseful} m²` : null);
  row("Suprafață construită", building.areaBuilt ? `${building.areaBuilt} m²` : null);
  row("An construcție", building.yearBuilt);
  const scopMap = {
    "vanzare": "Vânzare imobil",
    "inchiriere": "Închiriere",
    "receptie": "Recepție lucrări (DTAC/finală)",
    "informare": "Informare proprietar",
    "renovare": "Renovare majoră",
    "renovare_majora": "Renovare majoră",
    "alt": "Alt scop",
  };
  row("Scop solicitare", scopMap[building.scopCpe] || building.scopCpe);
  y += 2;

  // ── Secțiunea 3: Servicii solicitate ─────────────────────────────────
  section("3. SERVICII SOLICITATE");
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const checkbox = (checked) => checked ? "[X]" : "[ ]";
  const lines = [
    `${checkbox(services.cpe)} Certificat de Performanță Energetică (CPE) — model standardizat MDLPA`,
    `${checkbox(services.audit)} Audit energetic (RAE) cu analiză cost-optim + recomandări măsuri`,
    `${checkbox(services.passport)} Pașaport de Renovare (EPBD 2024 Anexa VIII)`,
    `${checkbox(services.nzebRoadmap)} Foaie de parcurs nZEB (renovare etapizată)`,
  ];
  lines.forEach(l => {
    if (y > 270) { doc.addPage(); y = 22; }
    writeText(l, M + 2, y); y += 5;
  });
  y += 2;

  // ── Secțiunea 4: Documente atașate ───────────────────────────────────
  section("4. DOCUMENTE ATAȘATE LA CERERE (declarate de client)");
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const defaultDocs = [
    { label: "Copie CI proprietar (PF) / Certificat ONRC (PJ)", available: false },
    { label: "Extras de Carte Funciară (CF) — eliberat în ultimele 30 zile", available: false },
    { label: "Plan/releveu construcție (arhitectură)", available: false },
    { label: "Cartea Tehnică a construcției (clădiri ≥ 1995)", available: false },
    { label: "Procesul-verbal de recepție", available: false },
    { label: "Autorizație de construire (renovare/extindere)", available: false },
    { label: "Facturi energie ultimii 3 ani (electricitate/gaz/lemn)", available: false },
    { label: "Detalii sisteme HVAC (poze, fișe tehnice)", available: false },
  ];
  const docList = (Array.isArray(documents) && documents.length > 0) ? documents : defaultDocs;
  docList.forEach(d => {
    if (y > 268) { doc.addPage(); y = 22; }
    writeText(`${checkbox(d.available)} ${d.label}`, M + 2, y);
    y += 4.5;
  });
  y += 4;

  // ── Secțiunea 5: Acord GDPR ──────────────────────────────────────────
  if (y > 215) { doc.addPage(); y = 22; }
  section("5. ACORD PRELUCRARE DATE PERSONALE (GDPR)");
  doc.setFont(baseFont, "normal"); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60);
  const gdprText =
    "Subsemnatul/Subsemnata, în calitate de proprietar al imobilului identificat mai sus, declar pe propria " +
    "răspundere că datele furnizate sunt corecte și îmi exprim acordul pentru prelucrarea datelor cu caracter " +
    "personal de către auditorul energetic, în conformitate cu Reg. UE 2016/679 (GDPR) și Legea 190/2018 RO. " +
    "Datele vor fi folosite exclusiv pentru emiterea documentațiilor energetice solicitate și depunerea lor " +
    "la portalul electronic MDLPA (Art. 4 alin. 6 Ord. 348/2026). Datele se păstrează 30 ani conform Mc 001-2022 §10.";
  const gdprLines = doc.splitTextToSize(gdprText, lineW);
  gdprLines.forEach(l => { writeText(l, M, y); y += 4; });
  doc.setTextColor(0, 0, 0);
  y += 4;

  // ── Secțiunea 6: Auditor (preferat) ─────────────────────────────────
  if (auditor && (auditor.name || auditor.atestat)) {
    if (y > 240) { doc.addPage(); y = 22; }
    section("6. AUDITOR ENERGETIC PREFERAT (opțional)");
    row("Nume auditor", auditor.name);
    row("Atestat MDLPA", `${auditor.atestat || "—"} (gradul ${auditor.grade || "—"})`);
    row("Companie / PFA", auditor.company);
    row("Contact", `${auditor.email || ""} ${auditor.phone ? "· " + auditor.phone : ""}`.trim() || "—");
    y += 2;
  }

  // ── Loc + Dată + Semnătură ──────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 22; }
  y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(10);
  const dateStr = requestDate.toLocaleDateString("ro-RO", {
    day: "2-digit", month: "long", year: "numeric",
  });
  writeText(`Locul: ${client.city || "_______________________"}`, M, y);
  writeText(`Data: ${dateStr}`, pageW - M - 60, y);
  y += 18;

  // Linie semnătură + label
  doc.setDrawColor(80, 80, 100);
  doc.line(M, y, M + 80, y);
  doc.setFont(baseFont, "italic"); doc.setFontSize(8); doc.setTextColor(100, 100, 130);
  writeText("Semnătură olograf solicitant", M, y + 4);
  if (isPJ) writeText("(+ ștampilă companie pentru PJ)", M, y + 7.5);
  doc.setTextColor(0, 0, 0);

  // ── Footer juridic ──────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(150, 150, 170);
  doc.line(M, footerY, pageW - M, footerY);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText(
    "Generat de Zephren — Calculator energetic clădiri (zephren.ro). " +
    `Document emis: ${TODAY_RO()}. Bază legală: Mc 001-2022, Ord. MDLPA 16/2023, Ord. MDLPA 348/2026.`,
    M, footerY + 4, { maxWidth: lineW },
  );

  // ── Save ────────────────────────────────────────────────────────────
  const fname = `Cerere_${_safeSlug(client.name || building.address || "client").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
