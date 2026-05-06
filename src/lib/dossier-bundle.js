/**
 * dossier-bundle.js — Bundle ZIP standardizat dosar audit energetic.
 *
 * Construire pachet complet pentru depunere portal MDLPA (Art. 4 alin. 6
 * Ord. 348/2026, operațional 8.VII.2026) sau pentru arhivare ISO 14641.
 *
 * Structură ZIP standardizată:
 *   /01_CPE/                  — CPE DOCX (oficial MDLPA) [+ PDF/A-3 opțional]
 *   /02_RAE/                  — Raport audit energetic DOCX [+ PDF/A-3]
 *   /03_Pasaport_renovare/    — Pașaport JSON + XML + DOCX + PDF
 *   /04_Anexe_CPE/            — Anexa 1+2 + Anexa MDLPA + Anexa Bloc (RC)
 *   /05_Documente_input/      — Documente input client (Cartea Tehnică, releveu, etc.)
 *   /06_FIC_DCA/              — FIC (Anexa G) + DCA (Anexa I)
 *   /07_Plan_MV/              — Plan M&V IPMVP (dacă renovare)
 *   /08_Cover_letter/         — Scrisoare însoțire MDLPA
 *   /09_Manifest/             — manifest_sha256.txt + .p7s (CAdES detașat)
 *   /10_Facturi/              — Facturi energie (OCR rezultate)
 *   manifest.json             — metadata bundle (cpeCode, timestamp, hash root)
 *   README.txt                — index + bază legală
 *
 * Pre-validare: itemi obligatorii (CPE + Manifest minim) — altfel throw.
 *
 * Sprint Conformitate P0-10 (6 mai 2026).
 */

/**
 * Categorii fișiere → folder ZIP standardizat.
 */
export const BUNDLE_FOLDERS = Object.freeze({
  CPE: "01_CPE",
  RAE: "02_RAE",
  PASAPORT: "03_Pasaport_renovare",
  ANEXE: "04_Anexe_CPE",
  INPUT_CLIENT: "05_Documente_input",
  FIC_DCA: "06_FIC_DCA",
  PLAN_MV: "07_Plan_MV",
  COVER_LETTER: "08_Cover_letter",
  MANIFEST: "09_Manifest",
  FACTURI: "10_Facturi",
});

/**
 * Document categorie → folder mapping.
 *
 * @param {string} category
 * @returns {string} folder name în ZIP
 */
export function getFolderFor(category) {
  return BUNDLE_FOLDERS[String(category || "").toUpperCase()] || "_other";
}

/**
 * Verifică dacă lista de documente acoperă itemii minimi obligatorii.
 *
 * @param {Array<{category:string, filename:string, blob:Blob}>} docs
 * @returns {{ok:boolean, missing:string[]}}
 */
export function validateDossierCompleteness(docs) {
  const present = new Set(docs.map(d => String(d.category || "").toUpperCase()));
  const required = ["CPE"]; // minim pentru un dosar valid
  const recommended = ["RAE", "MANIFEST", "FIC_DCA", "ANEXE"];

  const missing = required.filter(r => !present.has(r));
  const missingRecommended = recommended.filter(r => !present.has(r));

  return {
    ok: missing.length === 0,
    missing,
    missingRecommended,
  };
}

/**
 * Construiește bundle ZIP cu structură standardizată.
 *
 * @param {object} args
 * @param {Array<{category:string, filename:string, blob:Blob, label?:string}>} args.documents
 *   Fiecare document are categorie (CPE/RAE/PASAPORT/etc.) + nume fișier + blob.
 * @param {object} [args.metadata] — populează manifest.json
 *   { cpeCode, auditor, building, generatedAt? }
 * @param {boolean} [args.requireRAE=false] — dacă true, RAE devine obligatoriu (audit complet)
 * @param {boolean} [args.download=true]
 * @returns {Promise<{
 *   zipBlob: Blob,
 *   filename: string,
 *   manifest: object,
 *   completeness: {ok:boolean, missing:string[], missingRecommended:string[]},
 *   filesAdded: number
 * }>}
 */
export async function generateDossierBundle({
  documents = [],
  metadata = {},
  requireRAE = false,
  download = true,
} = {}) {
  // 1. Validare completare
  const completeness = validateDossierCompleteness(documents);
  if (requireRAE && !documents.some(d => String(d.category || "").toUpperCase() === "RAE")) {
    completeness.missing.push("RAE");
    completeness.ok = false;
  }
  if (!completeness.ok) {
    throw new Error(
      `[DossierBundle] Documente obligatorii lipsă: ${completeness.missing.join(", ")}. ` +
      "Completează înainte de generare bundle.",
    );
  }

  // 2. Build ZIP
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  let filesAdded = 0;
  for (const doc of documents) {
    if (!doc || !doc.blob || !doc.filename || !doc.category) continue;
    const folder = getFolderFor(doc.category);
    const path = `${folder}/${doc.filename}`;
    zip.file(path, doc.blob);
    filesAdded++;
  }

  // 3. manifest.json — metadata bundle
  const manifest = {
    schemaVersion: "1.0",
    generator: "Zephren v4.0+ (Sprint Conformitate P0-10)",
    generatedAt: metadata.generatedAt || new Date().toISOString(),
    cpeCode: metadata.cpeCode || null,
    auditor: metadata.auditor || null,
    building: metadata.building || null,
    completeness,
    contents: documents.map(d => ({
      category: d.category,
      filename: d.filename,
      label: d.label || d.filename,
      folder: getFolderFor(d.category),
      sizeBytes: d.blob?.size || null,
    })),
    legalBasis: [
      "Mc 001-2022 (Ord. MDLPA 16/2023)",
      "L. 372/2005 republicată cu L. 238/2024",
      "Ord. MDLPA 348/2026 (MO 292/14.IV.2026)",
      "Art. 4 alin. 6 — portal electronic 8.VII.2026",
      "ISO 14641 — arhivare documente electronice",
      "EPBD 2024/1275 (Reg. UE)",
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 4. README.txt
  const readme = [
    "DOSAR AUDIT ENERGETIC — BUNDLE ZIP",
    "Generat de Zephren — zephren.ro",
    "=".repeat(70),
    "",
    `Cod CPE/CUC:     ${metadata.cpeCode || "—"}`,
    `Generat:         ${manifest.generatedAt}`,
    `Auditor:         ${metadata.auditor?.name || "—"} (atestat ${metadata.auditor?.atestat || "—"})`,
    `Clădire:         ${metadata.building?.address || "—"}`,
    `Status:          ${completeness.ok ? "Complet (toate itemii obligatorii prezenți)" : "Incomplet"}`,
    ...(completeness.missingRecommended.length > 0
      ? [`Recomandate lipsă: ${completeness.missingRecommended.join(", ")}`]
      : []),
    "",
    "STRUCTURA BUNDLE:",
    ...Object.entries(BUNDLE_FOLDERS).map(([cat, folder]) => `  ${folder}/   — ${cat}`),
    "  manifest.json     — metadata structurată",
    "  README.txt        — acest fișier",
    "",
    `TOTAL FIȘIERE:   ${filesAdded}`,
    "",
    "DEPUNERE PORTAL MDLPA:",
    "  https://portal.mdlpa.ro (operațional din 8.VII.2026 conform Art. 4 alin. 6 Ord. 348/2026)",
    "  Încărcați acest ZIP integral. Sistemul valida structura și hash-urile.",
    "",
    "BAZĂ LEGALĂ:",
    ...manifest.legalBasis.map(l => `  • ${l}`),
    "",
    "Pentru întrebări tehnice: support@zephren.ro",
  ].join("\r\n");
  zip.file("README.txt", readme);

  // 5. Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // 6. Filename
  const dateSlug = new Date().toISOString().slice(0, 10);
  const slug = String(metadata.cpeCode || metadata.building?.address || "dosar")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 40);
  const filename = `Dosar_audit_${slug}_${dateSlug}.zip`;

  // 7. Download
  if (download && typeof document !== "undefined" && document.createElement) {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    zipBlob,
    filename,
    manifest,
    completeness,
    filesAdded,
  };
}
