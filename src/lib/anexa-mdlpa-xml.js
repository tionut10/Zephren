/**
 * anexa-mdlpa-xml.js — Generator XML Anexa MDLPA pentru portal electronic.
 *
 * Conform Art. 4 alin. 6 Ord. MDLPA 348/2026 — portal electronic operațional
 * 8.VII.2026, acceptă Anexa CPE în format XML structurat (validare server-side).
 *
 * STATUS LA 6 mai 2026:
 *   - Schema XML oficială MDLPA NU este încă publicată
 *   - Folosim namespace provizoriu mdlpa.gov.ro/schemas/anexa-cpe/2026
 *   - Structură derivată din Anexa 1+2 Ord. MDLPA 16/2023 (35 câmpuri)
 *   - Helper validateAnexaMdlpaXml face checks basic; AJV/XSD strict post-publicare
 *
 * Integrare ulterioară: AnexaMDLPAFields.jsx adăuga buton „Export XML portal MDLPA"
 * (~30 minute). Modulul rămâne disponibil pentru consumatori externi.
 *
 * Sprint Conformitate P1-03 (6-7 mai 2026).
 */

/**
 * Namespace XML provizoriu (actualizare la publicarea schemei oficiale).
 */
export const ANEXA_MDLPA_XML_NAMESPACE = "https://portal.mdlpa.ro/schemas/anexa-cpe/2026";
export const ANEXA_MDLPA_XML_VERSION = "1.0.0-pending-mdlpa";

/**
 * Categorii clădire conform Mc 001-2022 (acceptate în Anexa MDLPA).
 */
const VALID_CATEGORIES = new Set([
  "RI", "RC", "RA", "BC",     // rezidențial
  "BI", "ED", "SP", "HC", "CO", "SA", "AL", // nerezidențial
]);

/**
 * Scope CPE valide.
 */
const VALID_SCOPES = new Set([
  "vanzare", "inchiriere", "receptie", "informare",
  "renovare", "renovare_majora", "construire", "alt",
]);

/**
 * Escape XML special chars.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format dată ISO YYYY-MM-DD pentru XML.
 *
 * @param {Date|string|null} d
 * @returns {string}
 */
function formatXmlDate(d) {
  if (!d) return "";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  } catch { return ""; }
}

/**
 * Round helper cu fallback empty string.
 *
 * @param {*} val
 * @param {number} dec
 * @returns {string}
 */
function fmtNum(val, dec = 2) {
  const n = Number(val);
  if (!isFinite(n)) return "";
  return n.toFixed(dec);
}

/**
 * Generează XML Anexa MDLPA CPE pentru depunere portal electronic.
 *
 * Câmpurile sunt structurate pe 7 secțiuni:
 *   1. Identificare CPE (cod unic, dată, scop, validitate)
 *   2. Clădire (adresă, cadastral, categorie, suprafață, an)
 *   3. Geometrie (Au, V, A_envelope, n50, regim)
 *   4. Performanță energetică (EP, EP_nren, EP_ren, RER, U_med, clasă)
 *   5. Servicii (heating/cooling/ACM/ventilation/lighting cu fuel + η)
 *   6. CO₂ + emisii (kg/m²·an + clasă)
 *   7. Auditor (nume, atestat, grad, registry, semnătură type)
 *
 * @param {object} args
 * @param {string} args.cpeCode — cod unic CPE/CUC MDLPA
 * @param {object} args.building — date complete clădire (din Step 1+2)
 * @param {object} [args.instSummary] — rezultat calcul instalații
 * @param {object} [args.renewSummary] — rezultat regenerabile
 * @param {object} [args.envelopeSummary] — sumar anvelopă
 * @param {object} args.auditor — date auditor (nume, atestat, grad, etc.)
 * @param {object} [args.auditorAttestation] — { issueDate, ordinance, gradeMdlpa }
 * @param {object} [args.energyClass] — { cls, score }
 * @param {object} [args.co2Class] — { cls }
 * @param {object} [args.signature] — { type: PAdES-B-T|B-LT, signedAt, qtspProvider }
 * @param {Date|string} [args.issueDate]
 * @param {number} [args.validityYears] — 5 sau 10
 * @returns {{xml:string, errors:Array<{path:string, message:string}>}}
 */
export function generateAnexaMdlpaXml({
  cpeCode = "",
  building = {},
  instSummary = {},
  renewSummary = null,
  envelopeSummary = null,
  auditor = {},
  auditorAttestation = {},
  energyClass = null,
  co2Class = null,
  signature = null,
  issueDate = new Date(),
  validityYears = 10,
} = {}) {
  const errors = [];

  // Validare basic câmpuri obligatorii
  if (!cpeCode) errors.push({ path: "/cpeCode", message: "Cod CPE obligatoriu" });
  if (!building.address) errors.push({ path: "/building/address", message: "Adresă clădire obligatorie" });
  if (!building.category) {
    errors.push({ path: "/building/category", message: "Categorie clădire obligatorie" });
  } else if (!VALID_CATEGORIES.has(building.category)) {
    errors.push({
      path: "/building/category",
      message: `Categorie „${building.category}" necunoscută (valid: ${[...VALID_CATEGORIES].join(",")})`,
    });
  }
  if (!auditor.name) errors.push({ path: "/auditor/name", message: "Nume auditor obligatoriu" });
  if (!auditor.atestat) errors.push({ path: "/auditor/atestat", message: "Atestat MDLPA obligatoriu" });

  if (building.scopCpe && !VALID_SCOPES.has(building.scopCpe)) {
    errors.push({
      path: "/building/scopCpe",
      message: `Scop „${building.scopCpe}" necunoscut`,
    });
  }

  const issueDateStr = formatXmlDate(issueDate);
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + Number(validityYears));
  const expiryDateStr = formatXmlDate(expiryDate);

  // EP + clasă
  const epPrimary = renewSummary?.ep_adjusted_m2 || instSummary?.ep_total_m2 || 0;
  const epNren = renewSummary?.ep_nren_m2 || instSummary?.ep_nren_m2 || 0;
  const epRen = renewSummary?.ep_ren_m2 || 0;
  const co2Final = renewSummary?.co2_adjusted_m2 || instSummary?.co2_total_m2 || 0;
  const rer = renewSummary?.rer || 0;

  // Auditor grade
  const grade = auditor.grade || auditor.gradMdlpa || auditorAttestation.gradeMdlpa || "";
  const ordinance = auditorAttestation.ordinance ||
    (auditorAttestation.issueDate && new Date(auditorAttestation.issueDate) >= new Date("2026-04-14")
      ? "Ord. MDLPA 348/2026"
      : "Ord. MDLPA 2237/2010");

  // Construire XML
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<anexaCpe xmlns="${ANEXA_MDLPA_XML_NAMESPACE}" schemaVersion="${ANEXA_MDLPA_XML_VERSION}">`,
    `  <!-- Sprint Conformitate P1-03 — generat de Zephren v4.0+ -->`,
    `  <!-- Bază legală: Art. 4 alin. 6 Ord. MDLPA 348/2026 + Mc 001-2022 + L. 372/2005 republ. -->`,
    ``,
    `  <!-- 1. IDENTIFICARE CPE -->`,
    `  <identificareCpe>`,
    `    <codUnic>${escapeXml(cpeCode)}</codUnic>`,
    `    <dataElaborare>${issueDateStr}</dataElaborare>`,
    `    <dataExpirare>${expiryDateStr}</dataExpirare>`,
    `    <valabilitateAni>${Number(validityYears)}</valabilitateAni>`,
    `    <scopElaborare>${escapeXml(building.scopCpe || "vanzare")}</scopElaborare>`,
    `    <programCalcul>Zephren v4.0+ (Sprint Conformitate P0+P1)</programCalcul>`,
    `    <normativReferinta>Mc 001-2022 (Ord. MDLPA 16/2023)</normativReferinta>`,
    `  </identificareCpe>`,
    ``,
    `  <!-- 2. CLĂDIRE -->`,
    `  <cladire>`,
    `    <adresa>${escapeXml(building.address)}</adresa>`,
    `    <localitate>${escapeXml(building.locality || building.city || "")}</localitate>`,
    `    <judet>${escapeXml(building.county || "")}</judet>`,
    `    <codPostal>${escapeXml(building.postal || building.postalCode || "")}</codPostal>`,
    `    <numarCadastral>${escapeXml(building.cadastralNumber || "")}</numarCadastral>`,
    `    <carteFunciara>${escapeXml(building.landBook || "")}</carteFunciara>`,
    `    <categorieFunctionala>${escapeXml(building.category)}</categorieFunctionala>`,
    `    <structuraConstructiva>${escapeXml(building.structure || "")}</structuraConstructiva>`,
    `    <anConstructie>${escapeXml(building.yearBuilt || "")}</anConstructie>`,
    `    <anReabilitare>${escapeXml(building.yearRenov || "")}</anReabilitare>`,
    `    <regimInaltime>${escapeXml(building.floors || "")}</regimInaltime>`,
    `    <subsol>${building.basement ? "true" : "false"}</subsol>`,
    `    <mansarda>${building.attic ? "true" : "false"}</mansarda>`,
    `    <numarApartamente>${escapeXml(building.nApartments || "")}</numarApartamente>`,
    `    <coordonateGps>`,
    `      <latitudine>${fmtNum(building.latitude, 6)}</latitudine>`,
    `      <longitudine>${fmtNum(building.longitude, 6)}</longitudine>`,
    `    </coordonateGps>`,
    `    <zonaClimatica>${escapeXml(building.zonaClimatica || building.climateZone || "")}</zonaClimatica>`,
    `  </cladire>`,
    ``,
    `  <!-- 3. GEOMETRIE -->`,
    `  <geometrie>`,
    `    <suprafataUtila unit="mp">${fmtNum(building.areaUseful, 1)}</suprafataUtila>`,
    `    <suprafataConstruita unit="mp">${fmtNum(building.areaBuilt, 1)}</suprafataConstruita>`,
    `    <suprafataIncalzita unit="mp">${fmtNum(building.areaHeated, 1)}</suprafataIncalzita>`,
    `    <volumIncalzit unit="mc">${fmtNum(building.volume, 1)}</volumIncalzit>`,
    `    <suprafataAnvelopa unit="mp">${fmtNum(building.areaEnvelope, 1)}</suprafataAnvelopa>`,
    `    <perimetru unit="m">${fmtNum(building.perimeter, 1)}</perimetru>`,
    `    <inaltimeMedieEtaj unit="m">${fmtNum(building.heightFloor, 2)}</inaltimeMedieEtaj>`,
    `    <inaltimeTotala unit="m">${fmtNum(building.heightBuilding, 2)}</inaltimeTotala>`,
    `    <etanseitate_n50 unit="h-1">${fmtNum(building.n50, 2)}</etanseitate_n50>`,
    `    <coeficientGlobalG unit="W_per_mp_K">${fmtNum(envelopeSummary?.G || envelopeSummary?.coefG || 0, 3)}</coeficientGlobalG>`,
    `  </geometrie>`,
    ``,
    `  <!-- 4. PERFORMANȚĂ ENERGETICĂ -->`,
    `  <performantaEnergetica>`,
    `    <energiePrimara unit="kWh_per_mp_an">${fmtNum(epPrimary, 1)}</energiePrimara>`,
    `    <energiePrimaraNeregenerabila unit="kWh_per_mp_an">${fmtNum(epNren, 1)}</energiePrimaraNeregenerabila>`,
    `    <energiePrimaraRegenerabila unit="kWh_per_mp_an">${fmtNum(epRen, 1)}</energiePrimaraRegenerabila>`,
    `    <RER unit="procent">${fmtNum(rer * 100, 2)}</RER>`,
    `    <U_mediuAnvelopa unit="W_per_mp_K">${fmtNum(envelopeSummary?.uMed || envelopeSummary?.U_med || 0, 3)}</U_mediuAnvelopa>`,
    `    <clasaEnergetica>${escapeXml(energyClass?.cls || "")}</clasaEnergetica>`,
    `    <notaEnergetica>${fmtNum(energyClass?.score, 0)}</notaEnergetica>`,
    `  </performantaEnergetica>`,
    ``,
    `  <!-- 5. SISTEME / SERVICII -->`,
    `  <sistemeServicii>`,
  ];

  // Add HVAC sub-elements if available
  if (instSummary && (instSummary.qf_h !== undefined || instSummary.qf_w !== undefined)) {
    lines.push(
      `    <incalzire>`,
      `      <energieFinala unit="kWh_per_mp_an">${fmtNum((instSummary.qf_h || 0) / Math.max(1, building.areaUseful || 1), 1)}</energieFinala>`,
      `      <eficienta unit="adim">${fmtNum(instSummary.eta_h, 2)}</eficienta>`,
      `    </incalzire>`,
      `    <apaCaldaMenajera>`,
      `      <energieFinala unit="kWh_per_mp_an">${fmtNum((instSummary.qf_w || 0) / Math.max(1, building.areaUseful || 1), 1)}</energieFinala>`,
      `      <eficienta unit="adim">${fmtNum(instSummary.eta_w, 2)}</eficienta>`,
      `    </apaCaldaMenajera>`,
      `    <racire>`,
      `      <energieFinala unit="kWh_per_mp_an">${fmtNum((instSummary.qf_c || 0) / Math.max(1, building.areaUseful || 1), 1)}</energieFinala>`,
      `      <EER unit="adim">${fmtNum(instSummary.eer, 2)}</EER>`,
      `    </racire>`,
      `    <ventilare>`,
      `      <energieFinala unit="kWh_per_mp_an">${fmtNum((instSummary.qf_v || 0) / Math.max(1, building.areaUseful || 1), 1)}</energieFinala>`,
      `      <SFP unit="kW_per_mc_per_s">${fmtNum(instSummary.sfp, 2)}</SFP>`,
      `    </ventilare>`,
      `    <iluminat>`,
      `      <energieFinala unit="kWh_per_mp_an">${fmtNum((instSummary.qf_l || 0) / Math.max(1, building.areaUseful || 1), 1)}</energieFinala>`,
      `      <LENI unit="kWh_per_mp_an">${fmtNum(instSummary.leni, 1)}</LENI>`,
      `    </iluminat>`,
    );
  }
  lines.push(`  </sistemeServicii>`);
  lines.push(``);

  // Renewable
  if (renewSummary) {
    lines.push(
      `  <!-- 5.b. SURSE REGENERABILE -->`,
      `  <surseRegenerabile>`,
      `    <solarTermic unit="kWh_per_an">${fmtNum(renewSummary.qSolarTh, 0)}</solarTermic>`,
      `    <fotovoltaic unit="kWh_per_an">${fmtNum(renewSummary.qPV_kWh, 0)}</fotovoltaic>`,
      `    <pompaCaldura unit="kWh_per_an">${fmtNum(renewSummary.qPC_ren, 0)}</pompaCaldura>`,
      `    <biomasa unit="kWh_per_an">${fmtNum(renewSummary.qBio_ren, 0)}</biomasa>`,
      `    <eolian unit="kWh_per_an">${fmtNum(renewSummary.qWind, 0)}</eolian>`,
      `    <cogenerare unit="kWh_per_an">${fmtNum((renewSummary.qCogen_el || 0) + (renewSummary.qCogen_th || 0), 0)}</cogenerare>`,
      `    <totalRegenerabil unit="kWh_per_an">${fmtNum(renewSummary.totalRenewable, 0)}</totalRegenerabil>`,
      `  </surseRegenerabile>`,
      ``,
    );
  }

  // CO₂
  lines.push(
    `  <!-- 6. EMISII CO₂ -->`,
    `  <emisiiCO2>`,
    `    <emisiiSpecifice unit="kg_per_mp_an">${fmtNum(co2Final, 1)}</emisiiSpecifice>`,
    `    <clasaCO2>${escapeXml(co2Class?.cls || "")}</clasaCO2>`,
    `  </emisiiCO2>`,
    ``,
    `  <!-- 7. AUDITOR ENERGETIC -->`,
    `  <auditorEnergetic>`,
    `    <numeComplet>${escapeXml(auditor.name)}</numeComplet>`,
    `    <numarAtestat>${escapeXml(auditor.atestat)}</numarAtestat>`,
    `    <gradAtestat>${escapeXml(grade)}</gradAtestat>`,
    `    <ordinAtestare>${escapeXml(ordinance)}</ordinAtestare>`,
    `    <dataEmiterii>${escapeXml(formatXmlDate(auditorAttestation.issueDate))}</dataEmiterii>`,
    `    <indexRegistru>${escapeXml(auditor.registryIndex || "")}</indexRegistru>`,
    `    <firma>${escapeXml(auditor.company || auditor.firm || "")}</firma>`,
    `    <email>${escapeXml(auditor.email || auditor.contact || "")}</email>`,
    `    <telefon>${escapeXml(auditor.phone || "")}</telefon>`,
    `  </auditorEnergetic>`,
    ``,
  );

  // Signature
  if (signature && signature.type) {
    lines.push(
      `  <!-- 8. SEMNĂTURĂ ELECTRONICĂ -->`,
      `  <semnaturaElectronica>`,
      `    <tip>${escapeXml(signature.type)}</tip>`,
      `    <dataSemnare>${escapeXml(signature.signedAt || "")}</dataSemnare>`,
      `    <furnizorQTSP>${escapeXml(signature.qtspProvider || "")}</furnizorQTSP>`,
      `    <bazaLegala>eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183) + Legea 214/2024 RO</bazaLegala>`,
      `  </semnaturaElectronica>`,
      ``,
    );
  }

  lines.push(`</anexaCpe>`);

  return {
    xml: lines.join("\n"),
    errors,
    valid: errors.length === 0,
  };
}

/**
 * Validare basic XML Anexa MDLPA (verificare structură + namespace).
 *
 * Pentru validare strictă XSD, post-publicare schema oficială MDLPA.
 *
 * @param {string} xml
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateAnexaMdlpaXml(xml) {
  const errors = [];
  if (!xml || typeof xml !== "string") {
    errors.push("XML lipsește sau invalid");
    return { valid: false, errors };
  }
  if (!xml.startsWith("<?xml")) {
    errors.push("Lipsește declarație XML <?xml version=...?>");
  }
  if (!xml.includes(ANEXA_MDLPA_XML_NAMESPACE)) {
    errors.push(`Lipsește namespace corect: ${ANEXA_MDLPA_XML_NAMESPACE}`);
  }
  if (!xml.includes("<anexaCpe")) {
    errors.push("Lipsește root element <anexaCpe>");
  }
  if (!xml.includes("</anexaCpe>")) {
    errors.push("Lipsește închidere </anexaCpe>");
  }
  if (!xml.includes("<codUnic>")) {
    errors.push("Lipsește <codUnic> obligatoriu");
  }
  if (!xml.includes("<numarAtestat>")) {
    errors.push("Lipsește <numarAtestat> obligatoriu");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Helper: descarcă XML-ul ca fișier .xml.
 *
 * @param {string} xml
 * @param {string} [filename]
 */
export function downloadAnexaMdlpaXml(xml, filename) {
  if (typeof document === "undefined") return;
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `Anexa_MDLPA_${new Date().toISOString().slice(0, 10)}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
