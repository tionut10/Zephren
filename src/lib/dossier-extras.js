/**
 * dossier-extras.js — Documente suplimentare dosar reabilitare 100%
 *
 * Sprint P2 audit Pas 7 (06 mai 2026) — implementează 4 documente normative
 * lipsă din pachetul Pas 7:
 *   1. FIC  — Fișa Identitate Clădire (Mc 001-2022 Anexa G)
 *   2. DCA — Declarație de conformitate auditor (Ord. 348/2026 Anexa I)
 *   3. SHA — Manifest hash SHA-256 (Ord. 348/2026 Art. 11 — deduplicare MDLPA)
 *   4. M&V — Plan monitorizare consum post-renovare (IPMVP Opțiunea C)
 *
 * Toate folosesc jsPDF + setupRomanianFont pentru diacritice native.
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";

const TODAY_RO = new Date().toLocaleDateString("ro-RO", {
  day: "2-digit", month: "long", year: "numeric",
});

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FIȘA IDENTITATE CLĂDIRE (FIC) — Mc 001-2022 Anexa G
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} args
 * @param {object} args.building — date clădire complete
 * @param {object} args.owner   — { name, type:"PF"|"PJ", cui, address }
 * @param {object} args.auditor — { name, atestat, grade }
 * @param {object} args.climate — { zone, gd, t_ext_min, locality }
 * @param {object} args.instSummary — { ep_total_m2, energyClass, qf_total }
 * @param {Array}  args.opaqueElements
 * @param {Array}  args.glazingElements
 * @param {boolean} [args.download=true]
 */
export async function generateFICPdf({
  building = {},
  owner = {},
  auditor = {},
  climate = {},
  instSummary = {},
  opaqueElements = [],
  glazingElements = [],
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  // Antet
  doc.setFont(baseFont, "bold"); doc.setFontSize(15);
  writeText("FIȘA DE IDENTITATE A CLĂDIRII (FIC)", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText("Mc 001-2022 Anexa G — date de bază pentru analiza energetică", pageW / 2, y, { align: "center" });
  y += 4;
  writeText(`Data emiterii: ${TODAY_RO}`, pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // Helper rând tabel
  const rowH = 6;
  const drawRow = (label, value, isHeader = false) => {
    if (isHeader) {
      doc.setFillColor(35, 41, 70);
      doc.rect(M, y, pageW - 2 * M, rowH + 1, "F");
      doc.setTextColor(251, 191, 36);
      doc.setFont(baseFont, "bold"); doc.setFontSize(9);
      writeText(label, M + 2, y + 4.2);
      doc.setTextColor(0, 0, 0);
      y += rowH + 1;
      return;
    }
    doc.setDrawColor(200, 200, 220);
    doc.line(M, y, pageW - M, y);
    doc.setFont(baseFont, "bold"); doc.setFontSize(8.5);
    writeText(label, M + 2, y + 4);
    doc.setFont(baseFont, "normal");
    writeText(String(value || "—"), M + 75, y + 4);
    y += rowH;
  };

  // Secțiunea 1: Identificare
  drawRow("1. IDENTIFICARE CLĂDIRE", "", true);
  drawRow("Adresă", building.address);
  drawRow("Localitate / Județ", `${building.locality || building.city || "—"} / ${building.county || "—"}`);
  drawRow("Cod poștal", building.postal || building.postalCode);
  drawRow("Număr cadastral", building.cadastralNumber);
  drawRow("Carte funciară", building.landBook);
  drawRow("Categorie funcțională", building.category);
  drawRow("Structură constructivă", building.structure);
  drawRow("An construcție / reabilitare", `${building.yearBuilt || "—"} / ${building.yearRenov || "necalibrat"}`);
  drawRow("Regim înălțime", `${building.floors || "—"} (${building.basement ? "subsol" : "fără subsol"}, ${building.attic ? "mansardă" : "fără mansardă"})`);
  y += 3;

  // Secțiunea 2: Date geometrice
  drawRow("2. DATE GEOMETRICE", "", true);
  drawRow("Suprafață utilă Au [m²]", building.areaUseful);
  drawRow("Suprafață construită [m²]", building.areaBuilt);
  drawRow("Suprafață încălzită [m²]", building.areaHeated);
  drawRow("Volum încălzit V [m³]", building.volume);
  drawRow("Suprafață anvelopă [m²]", building.areaEnvelope);
  drawRow("Înălțime medie etaj [m]", building.heightFloor);
  drawRow("Înălțime totală clădire [m]", building.heightBuilding);
  drawRow("Perimetru clădire [m]", building.perimeter);
  drawRow("Etanșeitate n50 [h⁻¹]", building.n50);
  drawRow("Factor umbrire mediu", building.shadingFactor);
  drawRow("Număr apartamente", building.nApartments);
  drawRow("Număr ocupanți", building.nrOcupanti);
  y += 3;

  // Secțiunea 3: Date climatice
  drawRow("3. DATE CLIMATICE (SR 4839/Mc 001-2022)", "", true);
  drawRow("Zonă climatică", climate.zone || building.zonaClimatica);
  drawRow("Locality climatică", climate.locality || building.locality);
  drawRow("Latitudine / Longitudine", `${building.latitude || "—"}° N / ${building.longitude || "—"}° E`);
  drawRow("Temperatură exterioară conv. [°C]", climate.t_ext_min);
  drawRow("Grade-zile [°C·zile]", climate.gd);
  y += 3;

  // Secțiunea 4: Anvelopa termică (sumar)
  drawRow("4. ANVELOPA TERMICĂ (sumar)", "", true);
  const opaqCount = (opaqueElements || []).length;
  const glazCount = (glazingElements || []).length;
  const totalOpaqueA = (opaqueElements || []).reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
  const totalGlazA = (glazingElements || []).reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
  drawRow("Număr elemente opace", `${opaqCount} (Σ A = ${totalOpaqueA.toFixed(1)} m²)`);
  drawRow("Număr elemente vitrate", `${glazCount} (Σ A = ${totalGlazA.toFixed(1)} m²)`);
  drawRow("Raport vitraj/opac [%]", totalOpaqueA > 0 ? ((totalGlazA / (totalOpaqueA + totalGlazA)) * 100).toFixed(1) : "—");
  y += 3;

  // Secțiunea 5: Performanță energetică
  drawRow("5. PERFORMANȚĂ ENERGETICĂ ACTUALĂ", "", true);
  drawRow("EP total [kWh/m²·an]", instSummary.ep_total_m2 ? Number(instSummary.ep_total_m2).toFixed(1) : "—");
  drawRow("Clasă energetică", instSummary.energyClass);
  drawRow("Energie finală totală [kWh/an]", instSummary.qf_total ? Math.round(instSummary.qf_total) : "—");
  drawRow("Scop CPE", building.scopCpe);
  drawRow("Validitate CPE [ani]", building.validityYears || "10");
  y += 3;

  // Verifică dacă mai e loc pentru proprietar — altfel pagină nouă
  if (y > 250) { doc.addPage(); y = 18; }

  // Secțiunea 6: Proprietar
  drawRow("6. PROPRIETAR", "", true);
  drawRow("Nume / Denumire", owner.name || building.owner);
  drawRow("Tip", owner.type || building.ownerType);
  if ((owner.type || building.ownerType) === "PJ") {
    drawRow("CUI", owner.cui || building.ownerCUI);
  }
  drawRow("Adresă proprietar", owner.address || building.address);
  y += 3;

  // Secțiunea 7: Auditor
  drawRow("7. AUDITOR ENERGETIC", "", true);
  drawRow("Nume auditor", auditor.name);
  drawRow("Atestat MDLPA", `${auditor.atestat || "—"} / ${auditor.grade || "—"}`);
  drawRow("Companie / PFA", auditor.company || auditor.firm);
  drawRow("Data întocmirii FIC", TODAY_RO);

  // Footer
  y = Math.max(y + 12, 268);
  doc.setDrawColor(150, 150, 170);
  doc.line(M, y, pageW - M, y);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Mc 001-2022 Metodologia de calcul al performanței energetice a clădirilor — Partea I, Anexa G.",
    M, y + 4);
  writeText("Documentul reflectă datele Pas 1-7 din Zephren la momentul exportului.", M, y + 8);
  doc.setTextColor(0, 0, 0);

  // Save
  const fname = `FIC_${_safeSlug(building.address || "cladire").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DECLARAȚIE DE CONFORMITATE AUDITOR — Ord. 348/2026 Anexa I
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} args
 * @param {object} args.auditor
 * @param {object} args.building
 * @param {string} args.cpeCode
 * @param {boolean} [args.download=true]
 */
export async function generateAuditorDeclarationPdf({
  auditor = {},
  building = {},
  cpeCode = "",
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 22;
  const pageW = doc.internal.pageSize.getWidth();
  const lineMaxW = pageW - 2 * M;
  let y = 28;

  // Antet
  doc.setFont(baseFont, "bold"); doc.setFontSize(13);
  writeText("DECLARAȚIE DE CONFORMITATE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  writeText("a Auditorului Energetic pentru Clădiri", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText("Ord. MDLPA 348/2026 Art. 4 + Anexa I — operaționalizare 8.VII.2026",
    pageW / 2, y, { align: "center" });
  y += 14;
  doc.setTextColor(0, 0, 0);

  // Subsemnatul
  doc.setFont(baseFont, "normal"); doc.setFontSize(10.5);
  const subsemnatulLines = doc.splitTextToSize(
    `Subsemnatul/a, ${auditor.name || "[NUME AUDITOR]"}, Auditor Energetic pentru Clădiri ` +
    `atestat de Ministerul Dezvoltării, Lucrărilor Publice și Administrației, ` +
    `cu numărul de atestat ${auditor.atestat || "[ATESTAT]"} (gradul ${auditor.grade || "[GRAD]"}) ` +
    `și cod unic MDLPA ${auditor.mdlpaCode || auditor.codUnicMDLPA || "[COD MDLPA]"},`,
    lineMaxW
  );
  subsemnatulLines.forEach(l => { writeText(l, M, y); y += 5; });
  y += 4;

  // Declar
  doc.setFont(baseFont, "bold"); doc.setFontSize(10.5);
  writeText("DECLAR pe propria răspundere că:", M, y);
  y += 7;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);

  const declarations = [
    `(1) Documentația tehnică elaborată pentru clădirea situată la adresa ${building.address || "[ADRESA]"} ` +
    `(nr. cadastral ${building.cadastralNumber || "—"}, an construcție ${building.yearBuilt || "—"}, ` +
    `categorie ${building.category || "—"}, suprafață utilă ${building.areaUseful || "—"} m²) ` +
    `a fost întocmită în conformitate cu Mc 001-2022 (Metodologia de calcul al performanței energetice ` +
    `a clădirilor), Legea 372/2005 republicată, Ord. MDLPA 16/2023 și Ord. MDLPA 348/2026.`,

    `(2) Codul unic CPE/CUC ${cpeCode || "[COD CPE]"} este generat conform protocolului electronic MDLPA ` +
    `și nu a fost utilizat anterior pentru aceeași clădire în registrul electronic.`,

    `(3) Calculul indicatorilor de performanță energetică (EP, EP_nren, EP_ren, RER, U_med, Q_inc, ` +
    `Q_acm, Q_il, LENI) a fost efectuat folosind date măsurate sau estimate conform Mc 001-2022, ` +
    `cu mențiunea ipotezelor de calcul în Cap. 0 al raportului de audit anexat.`,

    `(4) Sunt înregistrat în registrul electronic al auditorilor energetici al MDLPA cu data scadenței ` +
    `dreptului de practică ${auditor.dataExpirareDrept || "[DATA]"}, iar atestatul nu este suspendat ` +
    `sau anulat la data emiterii prezentului document.`,

    `(5) Declar că am asigurare de răspundere civilă profesională valabilă cu acoperire minimă de ` +
    `100.000 EUR conform Art. 5 Ord. MDLPA 348/2026.`,

    `(6) Documentele anexate (CPE XML, raport audit DOCX, anexe tehnice, pașaport renovare, ` +
    `extras CF) sunt complete, semnate digital și/sau olograf, și sunt sub responsabilitatea mea ` +
    `profesională integrală.`,
  ];

  declarations.forEach(d => {
    const lines = doc.splitTextToSize(d, lineMaxW);
    lines.forEach(l => {
      if (y > 260) { doc.addPage(); y = 28; }
      writeText(l, M, y);
      y += 4.6;
    });
    y += 3;
  });

  if (y > 245) { doc.addPage(); y = 28; }
  y += 4;

  // Sancțiuni
  doc.setFont(baseFont, "bold"); doc.setFontSize(9);
  doc.setTextColor(180, 30, 30);
  const sanctionLines = doc.splitTextToSize(
    "Cunosc prevederile Codului Penal privind falsul în declarații (Art. 326) și sunt conștient/ă " +
    "de consecințele juridice ale unei declarații false.",
    lineMaxW
  );
  sanctionLines.forEach(l => { writeText(l, M, y); y += 4.5; });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Semnătură
  doc.setFont(baseFont, "normal"); doc.setFontSize(10);
  writeText(`Data: ${TODAY_RO}`, M, y);
  writeText(`Auditor: ${auditor.name || "[NUME]"}`, pageW - M - 80, y);
  y += 5;
  writeText(`Localitate: ${building.locality || building.city || "—"}`, M, y);
  y += 14;
  doc.line(pageW - M - 80, y, pageW - M, y);
  doc.setFontSize(8); doc.setTextColor(100, 100, 130);
  writeText("(Semnătură olograf + ștampilă profesională)", pageW - M - 80, y + 3.5);
  doc.setTextColor(0, 0, 0);

  const fname = `Declaratie_conformitate_${_safeSlug(auditor.atestat || "auditor")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANIFEST HASH SHA-256 — Ord. 348/2026 Art. 11 (deduplicare MDLPA)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calculează SHA-256 pentru fișierele atașate și generează un manifest TXT.
 * @param {object} args
 * @param {Array<{name:string, blob:Blob}>} args.files
 * @param {object} args.auditor
 * @param {object} args.building
 * @param {string} args.cpeCode
 * @param {boolean} [args.download=true]
 */
export async function generateManifestSHA256({
  files = [],
  auditor = {},
  building = {},
  cpeCode = "",
  download = true,
} = {}) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API indisponibilă în acest browser");
  }
  const lines = [];
  lines.push("MANIFEST HASH SHA-256 — DOSAR AUDIT ENERGETIC");
  lines.push("Ord. MDLPA 348/2026 Art. 11 — deduplicare registru electronic");
  lines.push("=".repeat(78));
  lines.push("");
  lines.push(`Data emiterii:   ${new Date().toISOString()}`);
  lines.push(`Cod CPE/CUC:     ${cpeCode || "[NESETAT]"}`);
  lines.push(`Auditor:         ${auditor.name || "—"} (${auditor.atestat || "—"})`);
  lines.push(`Clădire:         ${building.address || "—"}`);
  lines.push(`Cadastral:       ${building.cadastralNumber || "—"}`);
  lines.push("");
  lines.push("FIȘIERE ATAȘATE:");
  lines.push("-".repeat(78));

  for (const file of files) {
    if (!file.blob) {
      lines.push(`[${file.name}] — BLOB LIPSĂ — hash neaplicabil`);
      continue;
    }
    try {
      const buffer = await file.blob.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
      const hashArr = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      const sizeKB = (file.blob.size / 1024).toFixed(1);
      lines.push(`File:  ${file.name}`);
      lines.push(`Size:  ${sizeKB} KB`);
      lines.push(`SHA-256: ${hex}`);
      lines.push("-".repeat(78));
    } catch (e) {
      lines.push(`[${file.name}] — EROARE HASH: ${e.message}`);
      lines.push("-".repeat(78));
    }
  }

  lines.push("");
  lines.push(`Total fișiere:   ${files.length}`);
  lines.push(`Algoritm hash:   SHA-256 (FIPS 180-4 / RFC 6234)`);
  lines.push(`Generator:       Zephren Energy Calculator v3.5+`);
  lines.push("");
  lines.push("Acest manifest poate fi atașat la depunerea fizică sau electronică");
  lines.push("la portalul MDLPA pentru verificare integritate documente.");

  const txt = lines.join("\r\n");
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });

  if (download) {
    const fname = `manifest_sha256_${_safeSlug(cpeCode || "dosar").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.txt`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return { blob, content: txt, fileCount: files.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.b. MANIFEST SHA-256 + CAdES B-T detașat (Sprint Conformitate P0-03, 6 mai 2026)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Variantă semnată CAdES B-T detașat a manifestului SHA-256 — cerută pentru
 * deduplicare strictă la registrul electronic MDLPA (Art. 11 Ord. 348/2026).
 *
 * Output: ZIP cu 2 fișiere:
 *   - manifest_sha256.txt      — manifestul TXT (identic cu generateManifestSHA256)
 *   - manifest_sha256.txt.p7s  — semnătura CAdES detașată PKCS#7 (RFC 5652)
 *
 * NOTĂ: păstrăm generateManifestSHA256 NEATINS pentru retrocompatibilitate cu
 * codul existent în Step 7 (linia 506 + 1652). Această funcție e opțiune nouă.
 *
 * @param {object} args
 * @param {Array<{name:string, blob:Blob}>} args.files — fișiere din dosar
 * @param {object} args.auditor — { name, atestat, ... }
 * @param {object} args.building — { address, cadastralNumber, ... }
 * @param {string} [args.cpeCode]
 * @param {object} [args.signerConfig] — { provider:"mock"|"certsign", credentials? }
 * @param {boolean} [args.download=true]
 * @returns {Promise<{
 *   zipBlob: Blob,
 *   manifestTxt: string,
 *   p7sBytes: Uint8Array,
 *   signerInfo: object,
 *   filename: string
 * }>}
 */
export async function generateManifestSHA256Signed({
  files = [],
  auditor = {},
  building = {},
  cpeCode = "",
  signerConfig = { provider: "mock" },
  download = true,
} = {}) {
  // 1. Generează manifestul TXT (folosește implementarea existentă, fără download)
  const manifest = await generateManifestSHA256({
    files, auditor, building, cpeCode, download: false,
  });

  // 2. Semnează TXT-ul cu CAdES B-T detașat
  const { signCadesDetached } = await import("./cades-detached-sign.js");
  const signResult = await signCadesDetached(
    manifest.content,
    signerConfig,
    { contentType: "text/plain", signingTime: new Date() },
  );

  // 3. Construire ZIP cu .txt + .p7s
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("manifest_sha256.txt", manifest.content);
  zip.file("manifest_sha256.txt.p7s", signResult.p7sBytes);

  // README explicativ pentru utilizator
  const readme = [
    "MANIFEST SEMNAT CAdES B-T DETAȘAT",
    "Sprint Conformitate P0-03 (6 mai 2026) — Zephren",
    "=".repeat(70),
    "",
    `Data semnare:    ${signResult.signedAt}`,
    `Provider QTSP:   ${signResult.signerInfo.providerLabel}`,
    `Subject cert:    ${signResult.signerInfo.certificateSubject || "—"}`,
    `Issuer cert:     ${signResult.signerInfo.certificateIssuer || "—"}`,
    `Hash conținut:   ${signResult.contentHashHex}`,
    `Lungime .p7s:    ${signResult.p7sBytes.length} octeți`,
    `Mock signer:     ${signResult.signerInfo.isMock ? "DA — fără valoare juridică eIDAS 2" : "NU"}`,
    "",
    "VERIFICARE:",
    "1. Cititorul calculează SHA-256 al manifest_sha256.txt",
    "2. Compară cu hash-ul din manifest_sha256.txt.p7s",
    "3. Verifică certificate chain + timestamp + revocation status (CRL/OCSP)",
    "",
    "BAZĂ NORMATIVĂ:",
    "  • ETSI EN 319 122-1 — CAdES baseline",
    "  • RFC 5652 — Cryptographic Message Syntax (CMS)",
    "  • eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183)",
    "  • Legea 214/2024 RO — transpunere eIDAS 2",
    "  • Art. 11 Ord. MDLPA 348/2026 — deduplicare registru electronic",
    "",
    ...((signResult.signerInfo.warnings || []).length > 0
      ? ["AVERTIZĂRI:", ...signResult.signerInfo.warnings.map(w => "  ⚠️ " + w), ""]
      : []),
  ].join("\r\n");
  zip.file("README.txt", readme);

  const zipBlob = await zip.generateAsync({ type: "blob" });

  // 4. Download
  const fname = `manifest_sha256_signed_${_safeSlug(cpeCode || "dosar").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.zip`;
  if (download) {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    zipBlob,
    manifestTxt: manifest.content,
    p7sBytes: signResult.p7sBytes,
    signerInfo: signResult.signerInfo,
    filename: fname,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.b. PLAN M&V AVANSAT — IPMVP Opțiunile A+B+C+D (Sprint Conformitate P1-14)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configurări IPMVP per opțiune (sumar tehnic).
 */
export const IPMVP_OPTIONS_META = Object.freeze({
  A: {
    label: "Opțiunea A — Retrofit isolation, parțial măsurat",
    method: "Măsurare directă pentru parametri cheie + estimare pentru restul",
    boundary: "Sub-sistem retrofit (ex: cazan nou, ferestre)",
    keyMeasurements: "Putere instalată, ore funcționare, eficiență nominală",
    frequency: "Verificare anuală cu instrumente certificate",
    bestFor: "Retrofit izolare anvelopă (ETICS, ferestre)",
    uncertaintyTypical: "5-10%",
  },
  B: {
    label: "Opțiunea B — Retrofit isolation+system, full măsurare",
    method: "Măsurare continuă a tuturor parametrilor (debit, temperatură, energie)",
    boundary: "Sub-sistem complet (ex: tot circuitul HVAC)",
    keyMeasurements: "Energie consumată, eficiență reală, profil orar",
    frequency: "Continuă cu data-logger + raport lunar",
    bestFor: "Retrofit instalații (HP, BACS, BMS)",
    uncertaintyTypical: "3-7%",
  },
  C: {
    label: "Opțiunea C — Whole facility (consum total facturat)",
    method: "Comparație facturi pre/post cu corecție climatică (GD)",
    boundary: "Întreaga clădire",
    keyMeasurements: "Facturi lunare energie + GD ANM",
    frequency: "Lunară (12 luni baseline + 12-24 luni post)",
    bestFor: "Renovare cumulativă majoră (anvelopă + instalații)",
    uncertaintyTypical: "10-20%",
  },
  D: {
    label: "Opțiunea D — Calibrated simulation",
    method: "Simulare termică calibrată cu măsurători punctuale (EnergyPlus, IES-VE, TRNSYS)",
    boundary: "Întreaga clădire sau zone definite",
    keyMeasurements: "Simulare orară 8760h calibrată cu 1-3 luni date măsurate",
    frequency: "Recalibrare anuală + raport final IPMVP",
    bestFor: "Renovare complexă cu schimbare de utilizare sau extindere",
    uncertaintyTypical: "8-15%",
  },
});

/**
 * Generează plan M&V avansat IPMVP cu suport multi-opțiune (A+B+C+D).
 *
 * Diferit față de generateMonitoringPlanPdf (existing, păstrat backward-compat):
 *   - Acceptă options: ["A","B","C","D"] (multi-select); default ["C"] doar
 *   - Pentru fiecare opțiune adaugă capitol distinct cu metodologie + boundary +
 *     measurements + frequency + uncertainty
 *   - Util pentru cazuri complexe care folosesc combinații (ex A+C pentru retrofit
 *     incremental cu verificare facturi globale)
 *
 * @param {object} args
 * @param {object} [args.building]
 * @param {object} [args.auditor]
 * @param {object} [args.instSummary]
 * @param {object} [args.scenario]
 * @param {Array<"A"|"B"|"C"|"D">} [args.options=["C"]] — multi-select
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateMonitoringPlanAdvancedPdf({
  building = {},
  auditor = {},
  instSummary = {},
  scenario = {},
  options = ["C"],
  download = true,
} = {}) {
  // Validare opțiuni
  const validOptions = options.filter(o => Object.prototype.hasOwnProperty.call(IPMVP_OPTIONS_META, o));
  if (validOptions.length === 0) validOptions.push("C");

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const lineMaxW = pageW - 2 * M;
  let y = 22;

  // Antet
  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("PLAN AVANSAT DE MONITORIZARE & VERIFICARE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  writeText(`IPMVP Multi-Opțiune (${validOptions.join(" + ")})`, pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText("International Performance Measurement & Verification Protocol",
    pageW / 2, y, { align: "center" });
  y += 4;
  writeText(`Data: ${TODAY_RO}`, pageW / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0, 0, 0);

  // 1. Date proiect (sumar)
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. Identificare proiect", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  writeText(`Adresă: ${building.address || "—"}`, M, y); y += 5;
  writeText(`Auditor M&V: ${auditor.name || "—"} (atestat ${auditor.atestat || "—"})`, M, y); y += 5;
  writeText(`Investiție totală: ${scenario.totalCost_RON ? Math.round(scenario.totalCost_RON).toLocaleString("ro-RO") + " RON" : "—"}`, M, y); y += 5;
  writeText(`Economii estimate: ${scenario.expectedSavings_RON_y ? Math.round(scenario.expectedSavings_RON_y).toLocaleString("ro-RO") + " RON/an" : "—"}`, M, y); y += 5;
  writeText(`Opțiuni IPMVP selectate: ${validOptions.join(", ")}`, M, y); y += 7;

  // 2. Capitol per opțiune selectată
  validOptions.forEach((opt, idx) => {
    if (y > 230) { doc.addPage(); y = 22; }
    const meta = IPMVP_OPTIONS_META[opt];

    doc.setFillColor(35, 41, 70);
    doc.rect(M, y, lineMaxW, 7, "F");
    doc.setTextColor(251, 191, 36);
    doc.setFont(baseFont, "bold"); doc.setFontSize(10.5);
    writeText(`${idx + 2}. ${meta.label}`, M + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 9;

    doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
    const fields = [
      { label: "Metodă", value: meta.method },
      { label: "Boundary (limită sistem)", value: meta.boundary },
      { label: "Măsurători cheie", value: meta.keyMeasurements },
      { label: "Frecvență", value: meta.frequency },
      { label: "Aplicabilitate optimă", value: meta.bestFor },
      { label: "Incertitudine tipică", value: meta.uncertaintyTypical },
    ];
    fields.forEach(f => {
      doc.setFont(baseFont, "bold"); doc.setFontSize(9);
      writeText(`${f.label}:`, M + 2, y);
      doc.setFont(baseFont, "normal");
      const lines = doc.splitTextToSize(f.value, lineMaxW - 50);
      lines.forEach((l, li) => {
        writeText(l, M + 50, y + li * 4.2);
      });
      y += Math.max(5, lines.length * 4.2) + 1;
    });
    y += 4;
  });

  // 3. Recomandare combinație
  if (y > 240) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText(`${validOptions.length + 2}. Recomandare auditor`, M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  let rec;
  if (validOptions.length === 1) {
    rec = `Acest plan utilizează exclusiv Opțiunea ${validOptions[0]} IPMVP. ` +
      `Pentru un proiect cu intervenții cumulate, considerați combinația cu Opțiunea C ` +
      `(verificare globală) pentru robustețe statistică.`;
  } else {
    rec = `Combinația ${validOptions.join("+")} oferă acoperire completă: măsurători detaliate ` +
      `pe sub-sisteme + verificare globală. Recomandat pentru proiecte cu investiții > 100.000 RON ` +
      `sau finanțare publică (POR/PNRR/AFM Casa Eficientă).`;
  }
  doc.splitTextToSize(rec, lineMaxW).forEach(l => { writeText(l, M, y); y += 4.5; });

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 285, pageW - M, 285);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P1-14. " +
    "Bază: IPMVP Core Concepts (EVO 2022) + ISO 50001 + EN 17463.",
    M, 290);

  const fname = `Plan_MV_avansat_${_safeSlug(building.address || "proiect").slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLAN MONITORIZARE M&V — IPMVP Opțiunea C (consum total facturat)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} args
 * @param {object} args.building
 * @param {object} args.auditor
 * @param {object} args.instSummary — baseline EP înainte de renovare
 * @param {object} args.scenario   — { measures, totalCost_RON, expectedSavings_RON_y }
 * @param {boolean} [args.download=true]
 */
export async function generateMonitoringPlanPdf({
  building = {},
  auditor = {},
  instSummary = {},
  scenario = {},
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const lineMaxW = pageW - 2 * M;
  let y = 22;

  // Antet
  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("PLAN DE MONITORIZARE ȘI VERIFICARE (M&V)", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  writeText("post-renovare energetică", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 100);
  writeText("Conform IPMVP — International Performance Measurement & Verification Protocol",
    pageW / 2, y, { align: "center" });
  y += 4;
  writeText("Opțiunea C — Verificare bazată pe facturile întregii clădiri",
    pageW / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0, 0, 0);

  // 1. Date proiect
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. Date proiect", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  doc.setDrawColor(180, 180, 200);
  const drawKV = (k, v) => {
    doc.setFont(baseFont, "bold");
    writeText(`${k}:`, M + 2, y);
    doc.setFont(baseFont, "normal");
    writeText(String(v || "—"), M + 60, y);
    y += 4.5;
  };
  drawKV("Adresă clădire", building.address);
  drawKV("Categorie", building.category);
  drawKV("Suprafață utilă", `${building.areaUseful || "—"} m²`);
  drawKV("Auditor M&V", `${auditor.name || "—"} (atestat ${auditor.atestat || "—"})`);
  drawKV("Data plan M&V", TODAY_RO);
  y += 5;

  // 2. Baseline pre-renovare
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. Baseline pre-renovare", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  drawKV("EP total baseline", `${instSummary.ep_total_m2 ? Number(instSummary.ep_total_m2).toFixed(1) : "—"} kWh/m²·an`);
  drawKV("Energie finală baseline", `${instSummary.qf_total ? Math.round(instSummary.qf_total) : "—"} kWh/an`);
  drawKV("Clasă energetică baseline", instSummary.energyClass);
  drawKV("Perioada baseline necesară", "12 luni consecutive (facturi gaz + electric)");
  drawKV("Sursă date baseline", "Facturi furnizori (E.ON/Engie/CEZ/Hidroelectrica/etc.)");
  y += 5;

  // 3. Variabile măsurate
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("3. Variabile măsurate (post-renovare)", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const vars = [
    "• Energie finală totală [kWh/an] — sumă lunară facturi pentru toate utilitățile.",
    "• Grade-zile reale [°C·zile] — corecție climatică pe baza datelor ANM/Meteoblue.",
    "• Ocupare [persoane × ore/an] — chestionar trimestrial proprietar / asociație.",
    "• Setpoint mediu [°C] — citire termostate / BMS dacă disponibil.",
    "• Apă caldă consumată [m³/an] — contor dedicat ACM (dacă prezent).",
  ];
  vars.forEach(v => {
    const lines = doc.splitTextToSize(v, lineMaxW);
    lines.forEach(l => { writeText(l, M, y); y += 4.2; });
  });
  y += 4;

  // 4. Frecvență raportare
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("4. Frecvență raportare M&V", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  drawKV("Raport intermediar", "La 6 luni post-finalizare lucrări (date 6 luni)");
  drawKV("Raport anual M&V", "12 luni post-finalizare (comparație baseline vs actual)");
  drawKV("Raport final", "24 luni — confirmare atingere economiilor estimate");
  drawKV("Re-certificare CPE", "După 36 luni sau la modificare regim de utilizare");
  y += 5;

  // 5. Formula calcul economii
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("5. Calcul economii (IPMVP Opțiunea C)", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  const formula = [
    "Savings [kWh/an] = (E_baseline − E_actual_post) × adjustment_factor",
    "",
    "unde:",
    "  • E_baseline = consum mediu 12 luni pre-renovare (facturat)",
    "  • E_actual_post = consum efectiv post-renovare (facturat)",
    "  • adjustment_factor = corecție GD_baseline / GD_actual + ocupare + setpoint",
    "",
    "Tolerance acceptabilă: ±10% față de economia estimată (Pas 7 audit).",
    "Diferențe > 15% → investigație suplimentară (rebound effect, comportament etc.).",
  ];
  formula.forEach(l => { writeText(l, M + 2, y); y += 4.2; });
  y += 4;

  if (y > 220) { doc.addPage(); y = 22; }

  // 6. Scenariu monitorizat
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("6. Scenariu de renovare monitorizat", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  drawKV("Investiție totală", `${scenario.totalCost_RON ? Math.round(scenario.totalCost_RON).toLocaleString("ro-RO") : "—"} RON`);
  drawKV("Economie estimată anuală", `${scenario.expectedSavings_RON_y ? Math.round(scenario.expectedSavings_RON_y).toLocaleString("ro-RO") : "—"} RON/an`);
  drawKV("Număr măsuri implementate", scenario.measures?.length || "—");
  if (Array.isArray(scenario.measures) && scenario.measures.length > 0) {
    y += 2;
    doc.setFont(baseFont, "italic"); doc.setFontSize(8.5);
    scenario.measures.slice(0, 8).forEach((m, i) => {
      writeText(`  ${i + 1}. ${m.name || m.label || "—"} (${m.cost_RON ? Math.round(m.cost_RON).toLocaleString("ro-RO") : "—"} RON)`, M + 4, y);
      y += 3.8;
    });
  }
  y += 5;

  // 7. Responsabilități
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("7. Responsabilități părți", M, y); y += 5;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const responsabilitati = [
    "Beneficiar (proprietar/asociație):",
    "  • Furnizează facturi lunare timpurii (max. 30 zile post-emitere)",
    "  • Notifică auditorul la modificări structurale sau de utilizare > 10%",
    "  • Permite auditorului acces pentru inspecții vizuale anuale",
    "",
    "Auditor M&V:",
    "  • Compilează datele și emite raport conform IPMVP",
    "  • Calculează corecții climatice (GD ANM)",
    "  • Recomandă acțiuni corective în caz de deviații > 15%",
  ];
  responsabilitati.forEach(l => {
    writeText(l, M + 2, y); y += 4.2;
  });

  if (y > 250) { doc.addPage(); y = 22; }
  y += 8;

  // Semnături
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  writeText(`Data: ${TODAY_RO}`, M, y);
  y += 12;
  doc.line(M, y, M + 70, y);
  doc.line(pageW - M - 70, y, pageW - M, y);
  doc.setFontSize(8.5);
  writeText("Auditor M&V (semnătură + ștampilă)", M, y + 4);
  writeText("Beneficiar (semnătură)", pageW - M - 70, y + 4);

  const fname = `plan_monitorizare_M&V_${_safeSlug(building.address || "cladire").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
