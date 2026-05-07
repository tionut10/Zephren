/**
 * funding-bundles.js — Generator bundle-uri ZIP pentru programe finanțare RO 2026.
 *
 * Programe acoperite:
 *   - PNRR C5 (deadline 31.VII.2026) — există deja în report-generators.js
 *   - AFM Casa Eficientă (CPE max 6 luni + RAE + raport implementare)
 *   - AFM Casa Verde Fotovoltaice (NU cere CPE — doar bundle PV calc)
 *   - POR/FEDR 2021-2027 (audit + CPE pre/post + ACB Reg. UE 244/2012)
 *   - FTJ Tranziție Justă (deadline 26.VIII.2026 — audit + studiu fezabilitate)
 *   - Modernization Fund (audit + plan investiții + reduceri CO₂ EU ETS)
 *   - UAT cofinanțare blocuri (audit RC + acord proprietari + plan financiar)
 *
 * Sprint Conformitate P1-05..P1-10 (7 mai 2026).
 *
 * INTEGRARE: nou component FundingBundlePanel.jsx care apelează generateFundingBundle
 * cu programType selectat. Modulul rămâne disponibil pentru consumatori externi.
 */

/**
 * Catalog programe disponibile.
 */
export const FUNDING_PROGRAMS = Object.freeze({
  "afm-casa-eficienta": {
    name: "AFM Casa Eficientă",
    deadline: "rolling 2026",
    requiresCpe: true,
    requiresRae: true,
    requiresFotoPre: true,
    requiresFotoPost: false,
    foldersStructure: [
      "01_CPE_pre",
      "02_RAE",
      "03_Raport_implementare",
      "04_Foto_pre",
      "05_Foto_post",
      "06_Calcul_economii",
    ],
    notes: [
      "CPE pre-renovare valid maxim 6 luni la depunere",
      "Foto pre-renovare obligatorii (minim 5 fotografii fațade + interior)",
      "Raport implementare cu lista detaliată măsuri",
      "Calcul economii energetice + reduceri CO₂",
    ],
    legalRefs: [
      "Ghid AFM Casa Eficientă 2026",
      "L. 121/2014 (eficiență energetică)",
      "OUG 196/2005 (mediu)",
    ],
  },
  "afm-casa-verde-pv": {
    name: "AFM Casa Verde Fotovoltaice",
    deadline: "rolling 2026",
    requiresCpe: false,
    requiresRae: false,
    requiresFotoPre: false,
    foldersStructure: [
      "01_Documentatie_tehnica_PV",
      "02_Plan_instalare",
      "03_Estimare_productie",
      "04_Avize",
    ],
    notes: [
      "NU se cere CPE/RAE pentru acest program",
      "Putere maximă 8 kW per gospodărie (limita OUG 163/2022)",
      "Doar pentru locuințe individuale (nu apartamente)",
    ],
    legalRefs: [
      "Ghid AFM Casa Verde Fotovoltaice 2026",
      "OUG 163/2022 (autoconsum)",
      "Reg. UE 2018/2001 (RED II)",
    ],
  },
  "por-fedr-2027": {
    name: "POR/FEDR 2021-2027 Axa 2",
    deadline: "apeluri trimestriale",
    requiresCpe: true,
    requiresRae: true,
    requiresFotoPre: false,
    foldersStructure: [
      "01_Audit_RAE",
      "02_CPE_pre",
      "03_CPE_post",
      "04_ACB_curba_cost_optim",
      "05_Plan_investitii_fazat",
    ],
    notes: [
      "Pentru clădiri publice (școli, spitale, primării)",
      "Curba cost-optim Reg. UE 244/2012 obligatorie",
      "Plan investiții fazat 5-10 ani",
    ],
    legalRefs: [
      "Ghid POR/FEDR 2021-2027",
      "Reg. UE 244/2012 (cost-optim)",
      "EPBD 2024/1275",
    ],
  },
  "ftj-tranzitie-justa": {
    name: "FTJ Tranziție Justă",
    deadline: "26.VIII.2026 (CRITIC)",
    requiresCpe: true,
    requiresRae: true,
    requiresFotoPre: true,
    foldersStructure: [
      "01_Audit_RAE",
      "02_Studiu_fezabilitate",
      "03_Plan_retrofit",
      "04_Analiza_CO2",
      "05_Planning_just_transition",
    ],
    notes: [
      "DEADLINE FERM 26.VIII.2026 — fereastra finanțare se închide",
      "Eligibile DOAR regiuni cărbune: Hunedoara, Gorj, Mehedinți",
      "Studiu fezabilitate energetică obligatoriu",
      "Calcul reduceri CO₂ pre/post",
    ],
    legalRefs: [
      "Reg. UE 2021/1056 (FTJ)",
      "Plan Teritorial Tranziție Justă RO",
    ],
  },
  "modernization-fund": {
    name: "Modernization Fund",
    deadline: "apeluri trimestriale (Q3 2026)",
    requiresCpe: false,
    requiresRae: true,
    requiresFotoPre: false,
    foldersStructure: [
      "01_Audit_RAE",
      "02_Plan_investitii_2026_2030",
      "03_Calcul_reduceri_CO2",
      "04_Plan_MV_IPMVP",
    ],
    notes: [
      "Doar 7 sectoare eligibile (energie, industrie, transport, etc.)",
      "Calcul reduceri CO₂ tCO₂eq riguros",
      "Plan M&V IPMVP Op. C obligatoriu",
    ],
    legalRefs: [
      "Reg. UE 2018/842 (effort sharing)",
      "EU ETS Directive 2003/87",
    ],
  },
  "uat-cofinantare-bloc": {
    name: "UAT cofinanțare reabilitare blocuri",
    deadline: "rolling (consultă UAT)",
    requiresCpe: true,
    requiresRae: true,
    requiresAcordProprietari: true,
    foldersStructure: [
      "01_Audit_RC_integral",
      "02_Anexa_2_multiapartament",
      "03_Acord_scris_proprietari",
      "04_Plan_financiar_50_50",
      "05_Buget_categorii_interventie",
    ],
    notes: [
      "Audit pentru bloc INTEGRAL (nu apartament individual)",
      "Acord scris ≥50% proprietari obligatoriu (L. 196/2018)",
      "Plan financiar 50% UAT / 50% asociație proprietari",
      "Volum estimat 2026: ~700 milioane RON la nivel național",
    ],
    legalRefs: [
      "L. 196/2018 (asociații proprietari)",
      "OUG 18/2009 (reabilitare termică)",
      "L. 372/2005 republicată",
    ],
  },
});

/**
 * Returnează lista programelor disponibile (pentru UI selector).
 *
 * @returns {Array<{key, name, deadline}>}
 */
export function listFundingPrograms() {
  return Object.entries(FUNDING_PROGRAMS).map(([key, prog]) => ({
    key,
    name: prog.name,
    deadline: prog.deadline,
    requiresCpe: prog.requiresCpe,
    requiresRae: prog.requiresRae,
  }));
}

/**
 * Verifică dacă un program e cunoscut.
 *
 * @param {string} programType
 * @returns {boolean}
 */
export function isValidProgram(programType) {
  return Object.prototype.hasOwnProperty.call(FUNDING_PROGRAMS, programType);
}

/**
 * Generează bundle ZIP pentru un program specific.
 *
 * @param {object} args
 * @param {string} args.programType — key din FUNDING_PROGRAMS
 * @param {Array<{folder?:string, filename:string, blob:Blob}>} args.documents
 * @param {object} [args.metadata] — { cpeCode, building, auditor, applicantName, requestDate }
 * @param {boolean} [args.download=true]
 * @returns {Promise<{
 *   zipBlob: Blob,
 *   filename: string,
 *   program: object,
 *   filesAdded: number,
 *   completeness: {ok:boolean, missing:string[]}
 * }>}
 */
export async function generateFundingBundle({
  programType,
  documents = [],
  metadata = {},
  download = true,
} = {}) {
  if (!isValidProgram(programType)) {
    throw new Error(
      `[FundingBundle] Program „${programType}" necunoscut. ` +
      `Disponibile: ${Object.keys(FUNDING_PROGRAMS).join(", ")}`,
    );
  }
  const program = FUNDING_PROGRAMS[programType];

  // Validare completeness
  const folders = documents.map(d => d.folder || "_other");
  const missing = [];
  if (program.requiresCpe && !folders.some(f => f.includes("CPE"))) {
    missing.push("CPE");
  }
  if (program.requiresRae && !folders.some(f => f.includes("RAE") || f.includes("Audit"))) {
    missing.push("RAE/Audit");
  }
  if (program.requiresFotoPre && !folders.some(f => f.includes("Foto_pre"))) {
    missing.push("Foto_pre");
  }
  if (program.requiresAcordProprietari && !folders.some(f => f.includes("Acord"))) {
    missing.push("Acord_proprietari");
  }
  const completeness = { ok: missing.length === 0, missing };

  // Build ZIP
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  let filesAdded = 0;
  for (const doc of documents) {
    if (!doc?.blob || !doc?.filename) continue;
    const folder = doc.folder || "_other";
    zip.file(`${folder}/${doc.filename}`, doc.blob);
    filesAdded++;
  }

  // README cu instrucțiuni program
  const readme = [
    `BUNDLE FINANȚARE — ${program.name}`,
    `Generat de Zephren v4.0+ (Sprint Conformitate P1-05..P1-10)`,
    "=".repeat(70),
    "",
    `Program:         ${program.name}`,
    `Deadline:        ${program.deadline}`,
    `Solicitant:      ${metadata.applicantName || "—"}`,
    `Cod CPE:         ${metadata.cpeCode || "—"}`,
    `Adresă clădire:  ${metadata.building?.address || "—"}`,
    `Auditor:         ${metadata.auditor?.name || "—"} (${metadata.auditor?.atestat || "—"})`,
    `Data generare:   ${new Date().toISOString()}`,
    `Status:          ${completeness.ok ? "Complet" : `Incomplet (lipsă: ${missing.join(", ")})`}`,
    "",
    "STRUCTURĂ FOLDERE STANDARD:",
    ...program.foldersStructure.map(f => `  ${f}/`),
    "",
    "NOTE PROGRAM:",
    ...program.notes.map(n => `  • ${n}`),
    "",
    "BAZĂ LEGALĂ:",
    ...program.legalRefs.map(r => `  • ${r}`),
    "",
    `TOTAL FIȘIERE: ${filesAdded}`,
  ].join("\r\n");
  zip.file("README.txt", readme);

  // manifest.json structurat
  const manifest = {
    program: {
      type: programType,
      name: program.name,
      deadline: program.deadline,
    },
    generatedAt: new Date().toISOString(),
    generator: "Zephren v4.0+ (Sprint Conformitate P1-05..P1-10)",
    metadata,
    completeness,
    contents: documents.map(d => ({
      folder: d.folder,
      filename: d.filename,
      sizeBytes: d.blob?.size || null,
    })),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const slug = String(metadata.cpeCode || metadata.building?.address || "bundle")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    // m-6 (7 mai 2026) — slice 30→60 pentru includerea ap./bl./sc.
    .slice(0, 60);
  const filename = `${programType}_${slug}_${dateSlug}.zip`;

  if (download && typeof document !== "undefined") {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { zipBlob, filename, program, filesAdded, completeness };
}
