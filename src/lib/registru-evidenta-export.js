// ═══════════════════════════════════════════════════════════════════════════
// REGISTRU DE EVIDENȚĂ AL AUDITORULUI ENERGETIC — ANEXA 6, Ord. MDLPA 348/2026
// ─────────────────────────────────────────────────────────────────────────
// Generează fișierul .xlsx cerut obligatoriu la prelungirea dreptului de
// practică (art. 31 alin. 2 lit. c din Ordinul MDLPA 348/2026).
//
// Structura este EXACT cea din Anexa 6: 21 coloane (A-U) + antet auditor.
// Publicat în MO nr. 292 din 14.04.2026.
// ═══════════════════════════════════════════════════════════════════════════

import * as XLSX from "xlsx-js-style";
import { getCategoryLabel } from "../data/anexa6-mapping.js";

// ────────────────────────────────────────────────────────────────────────
// HELPERS DE FORMATARE
// ────────────────────────────────────────────────────────────────────────

/** Formatează o dată ISO (YYYY-MM-DD sau ISO complet) → "DD.MM.YYYY". */
function formatDateRO(isoDate) {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return String(isoDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}.${mm}.${yy}`;
  } catch (_) {
    return String(isoDate || "");
  }
}

/** Formatează coordonatele într-o singură celulă. */
function formatCoords(lat, lng) {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (isNaN(la) || isNaN(lo)) return "";
  return `lat: ${la.toFixed(4)}, long: ${lo.toFixed(4)}`;
}

/** Formatează numărul și data CPE: "CPE-XXXX / DD.MM.YYYY". */
function formatCpeNumDate(cpeNumber, date) {
  const num = (cpeNumber || "").trim();
  const d = formatDateRO(date);
  if (!num && !d) return "";
  if (!num) return d;
  if (!d) return num;
  return `${num} / ${d}`;
}

/** Formatează regimul de înălțime din building.floors + basement + attic. */
function formatHeightRegime(building) {
  const floors = (building?.floors || "").toString().trim();
  const basement = !!building?.basement;
  const attic = !!building?.attic;
  if (!floors && !basement && !attic) return "";
  let base = floors || "P";
  if (basement && !/^S/i.test(base)) base = "S+" + base;
  if (attic && !/M$/i.test(base)) base = base + "+M";
  return base;
}

/** Număr cu o zecimală sau string gol. */
function num1(v) {
  const n = parseFloat(v);
  return isNaN(n) ? "" : n.toFixed(1);
}

// ────────────────────────────────────────────────────────────────────────
// EXTRAGERE DATE DIN UN PROIECT (structură localStorage Zephren)
// ────────────────────────────────────────────────────────────────────────

/**
 * Transformă un proiect Zephren într-un rând Anexa 6.
 * Funcționează cu structura returnată de loadProjectsFromLS (AuditorDashboard)
 * sau cu structura completă (building + instSummary + renewSummary + auditor).
 */
export function projectToAnexa6Row(project, auditor) {
  // Proiect „slim" (din AuditorDashboard) vs proiect complet din storage
  const b = project.building || project.buildingData || project;
  const inst = project.instSummary || {};
  const renew = project.renewSummary || {};

  // Energii specifice (kWh/m²·an)
  const epPrimary =
    parseFloat(renew.ep_adjusted_m2) ||
    parseFloat(inst.ep_total_m2) ||
    parseFloat(project.ep) || null;

  const efFinal =
    parseFloat(inst.qf_total_m2) ||
    parseFloat(project.qf) || null;

  const co2 =
    parseFloat(renew.co2_adjusted_m2) ||
    parseFloat(inst.co2_total_m2) ||
    parseFloat(project.co2) || null;

  // Clase
  const energyClass = project.energyClass || project.cls || b.energyClass || "";
  const emissionClass = project.co2Class || project.emissionClass || b.emissionClass || "";
  const energyClassAfter = b.energyClassAfterRenov || project.energyClassAfterRenov || "";
  const emissionClassAfter = b.emissionClassAfterRenov || project.emissionClassAfterRenov || "";

  // Categoria Anexa 6
  const cat = getCategoryLabel(b.category || b.categorie || "AL");

  // Info CPE + auditor (din proiect dacă există, altfel din auditor global)
  const a = project.auditor || auditor || {};

  return {
    cpeNrData: formatCpeNumDate(
      a.cpeNumber || project.cpeNumber || "",
      a.date || project.date || project.savedDate || ""
    ),
    address: b.address || b.strada || project.address || "",
    coords: formatCoords(b.latitude, b.longitude),
    catTip: cat.tip,
    catSubtip: cat.subtip,
    owner: b.owner || "",
    yearBuilt: b.yearBuilt || b.year || "",
    heightRegime: formatHeightRegime(b),
    areaUseful: num1(b.areaUseful || b.arieUtila || project.au),
    epPrimary: epPrimary != null ? epPrimary.toFixed(1) : "",
    efFinal: efFinal != null ? efFinal.toFixed(1) : "",
    co2: co2 != null ? co2.toFixed(1) : "",
    energyClass,
    emissionClass,
    energyClassAfter,
    emissionClassAfter,
    energySavings: num1(b.energySavings || project.energySavings),
    co2Reduction: num1(b.co2Reduction || project.co2Reduction),
    dataTransmitere: formatDateRO(a.dataTransmitereMDLPA || project.dataTransmitereMDLPA || ""),
    observations: a.observations || project.observations || "",
  };
}

// ────────────────────────────────────────────────────────────────────────
// STILURI EXCEL (xlsx-js-style)
// ────────────────────────────────────────────────────────────────────────

const BORDER_THIN = {
  top: { style: "thin", color: { rgb: "808080" } },
  bottom: { style: "thin", color: { rgb: "808080" } },
  left: { style: "thin", color: { rgb: "808080" } },
  right: { style: "thin", color: { rgb: "808080" } },
};

const STYLE_TITLE = {
  font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "1E3A8A" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  fill: { patternType: "solid", fgColor: { rgb: "F5F5F5" } },
};

const STYLE_AUDITOR_LABEL = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "right", vertical: "center" },
};

const STYLE_AUDITOR_VALUE = {
  font: { name: "Calibri", sz: 10, bold: false, color: { rgb: "000000" } },
  alignment: { horizontal: "left", vertical: "center" },
};

const STYLE_COL_HEADER = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  fill: { patternType: "solid", fgColor: { rgb: "E0E0E0" } },
  border: BORDER_THIN,
};

const STYLE_COL_HEADER_RENOV = {
  ...STYLE_COL_HEADER,
  fill: { patternType: "solid", fgColor: { rgb: "FFF59D" } }, // galben mai saturat pentru antet
};

const STYLE_ROW_EVEN = {
  font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
  border: BORDER_THIN,
};

const STYLE_ROW_ODD = {
  ...STYLE_ROW_EVEN,
  fill: { patternType: "solid", fgColor: { rgb: "F5F5F5" } },
};

const STYLE_ROW_RENOV_EVEN = {
  ...STYLE_ROW_EVEN,
  fill: { patternType: "solid", fgColor: { rgb: "FFFDE7" } }, // galben deschis
};

const STYLE_ROW_RENOV_ODD = {
  ...STYLE_ROW_EVEN,
  fill: { patternType: "solid", fgColor: { rgb: "FFF9C4" } }, // galben deschis mai saturat
};

const STYLE_FOOTER_INFO = {
  font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "555555" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
};

// Indexarea coloanelor renovare (P-S = col index 15-18, zero-based)
const RENOV_COL_INDICES = new Set([15, 16, 17, 18]);

// ────────────────────────────────────────────────────────────────────────
// FUNCȚIA PRINCIPALĂ: exportRegistruEvidenta
// ────────────────────────────────────────────────────────────────────────

/**
 * Generează fișierul .xlsx cu Registrul de Evidență conform Anexei 6.
 *
 * @param {Array} projects - Lista proiectelor (din localStorage sau state)
 * @param {Object} auditor - Datele auditorului (INITIAL_AUDITOR + câmpuri Anexa 6)
 * @param {Object} [options]
 * @param {string} [options.filename] - Nume fișier (implicit auto-generat)
 * @param {boolean} [options.download=true] - Dacă descarcă automat fișierul
 * @returns {Blob|null} - Blob-ul fișierului .xlsx dacă download=false, null altfel
 */
export function exportRegistruEvidenta(projects, auditor, options = {}) {
  const { filename, download = true } = options;
  const rows = (projects || []).map((p) => projectToAnexa6Row(p, auditor));

  const wb = XLSX.utils.book_new();
  const aoa = [];

  // ─── ANTET AUDITOR (rândurile 1-6) ────────────────────────────
  aoa.push(["REGISTRU DE EVIDENȚĂ AL AUDITORULUI ENERGETIC PENTRU CLĂDIRI", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push(["conform Anexei 6 la Ordinul MDLPA nr. 348/2026 (MO nr. 292/14.04.2026)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push([]); // rând gol separator
  aoa.push([
    "Nume și prenume auditor:", auditor?.name || "",
    "Nr. certificat atestare:", auditor?.atestat || "",
    "Specialitate + grad:", `${auditor?.grade || ""}${auditor?.specialty ? " (" + auditor.specialty + ")" : ""}`,
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
  ]);
  aoa.push([
    "Telefon:", auditor?.phone || "",
    "E-mail:", auditor?.email || "",
    "Drept de practică valabil până la:", formatDateRO(auditor?.dataExpirareDrept),
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
  ]);
  aoa.push([]); // rând gol separator

  // ─── ANTET COLOANE (rândul 7) ────────────────────────────────
  const headerRowIdx = aoa.length; // zero-based
  aoa.push([
    "Nr. crt.",                                     // A
    "Nr. și data elaborării CPE",                   // B
    "Adresa clădirii",                              // C
    "Coordonate geografice",                        // D
    "Categoria clădirii — tip",                     // E
    "Categoria clădirii — subtip",                  // F
    "Proprietarul / Administratorul clădirii",      // G
    "Anul / Perioada de construire",                // H
    "Regimul de înălțime",                          // I
    "Aria de referință a pardoselii (m²)",          // J
    "Consum specific anual — energie primară (kWh/m²·an)", // K
    "Consum specific anual — energie finală (kWh/m²·an)",  // L
    "Indice emisii echivalent CO₂ (kgCO₂/m²·an)",   // M
    "Clasa energetică a clădirii",                  // N
    "Clasa de emisii a clădirii",                   // O
    "Clasa energetică după renovare",               // P
    "Clasa de emisii după renovare",                // Q
    "Economii de energie realizate (kWh/m²·an)",    // R
    "Reducerea emisiilor CO₂ realizată (kgCO₂/m²·an)", // S
    "Data transmiterii informațiilor în baza de date MDLPA", // T
    "Observații",                                   // U
  ]);

  // ─── RÂNDURI DATE ───────────────────────────────────────────
  const dataStartIdx = aoa.length; // zero-based
  rows.forEach((r, i) => {
    aoa.push([
      i + 1,
      r.cpeNrData,
      r.address,
      r.coords,
      r.catTip,
      r.catSubtip,
      r.owner,
      r.yearBuilt,
      r.heightRegime,
      r.areaUseful,
      r.epPrimary,
      r.efFinal,
      r.co2,
      r.energyClass,
      r.emissionClass,
      r.energyClassAfter,
      r.emissionClassAfter,
      r.energySavings,
      r.co2Reduction,
      r.dataTransmitere,
      r.observations,
    ]);
  });

  // Dacă nu sunt rânduri, adaugă un rând de placeholder
  if (rows.length === 0) {
    aoa.push([1, "—", "(Niciun CPE înregistrat încă)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  }
  const dataEndIdx = aoa.length - 1;

  // ─── FOOTER (notă legală) ──────────────────────────────────
  aoa.push([]);
  aoa.push([`Document generat automat de Zephren — ${formatDateRO(new Date().toISOString().slice(0, 10))}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push(["Document ce se depune la MDLPA pentru prelungirea dreptului de practică (art. 31 alin. 2 lit. c, Ord. 348/2026).", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  aoa.push(["Coloanele P-S se completează doar pentru clădirile care au suferit renovări energetice.", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ─── APLICARE STILURI ──────────────────────────────────────
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };

      // Titlu principal (rândurile 0-1)
      if (R <= 1) {
        ws[addr].s = STYLE_TITLE;
        continue;
      }
      // Antet auditor (rândurile 3-4)
      if (R === 3 || R === 4) {
        // Coloanele pare (0, 2, 4) = label; impare (1, 3, 5) = valoare
        if (C === 0 || C === 2 || C === 4) {
          ws[addr].s = STYLE_AUDITOR_LABEL;
        } else if (C === 1 || C === 3 || C === 5) {
          ws[addr].s = STYLE_AUDITOR_VALUE;
        }
        continue;
      }
      // Antet coloane
      if (R === headerRowIdx) {
        ws[addr].s = RENOV_COL_INDICES.has(C) ? STYLE_COL_HEADER_RENOV : STYLE_COL_HEADER;
        continue;
      }
      // Rânduri date
      if (R >= dataStartIdx && R <= dataEndIdx) {
        const rowOffset = R - dataStartIdx;
        const isEven = rowOffset % 2 === 0;
        if (RENOV_COL_INDICES.has(C)) {
          ws[addr].s = isEven ? STYLE_ROW_RENOV_EVEN : STYLE_ROW_RENOV_ODD;
        } else {
          ws[addr].s = isEven ? STYLE_ROW_EVEN : STYLE_ROW_ODD;
        }
        continue;
      }
      // Footer
      if (R > dataEndIdx + 1) {
        ws[addr].s = STYLE_FOOTER_INFO;
      }
    }
  }

  // ─── MERGED CELLS (titluri + antet auditor) ─────────────────
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },  // titlu principal
    { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } },  // subtitlu
    // Antet auditor — rândul 3: valorile pot ocupa mai multe coloane pentru vizibilitate
    { s: { r: 3, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 3 }, e: { r: 3, c: 3 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 20 } },  // "Specialitate + grad" → extins
    { s: { r: 4, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 3 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 20 } },
    // Footer
    { s: { r: dataEndIdx + 2, c: 0 }, e: { r: dataEndIdx + 2, c: 20 } },
    { s: { r: dataEndIdx + 3, c: 0 }, e: { r: dataEndIdx + 3, c: 20 } },
    { s: { r: dataEndIdx + 4, c: 0 }, e: { r: dataEndIdx + 4, c: 20 } },
  ];

  // ─── LĂȚIMI COLOANE (auto-approximate) ──────────────────────
  ws["!cols"] = [
    { wch: 6 },    // A — Nr crt
    { wch: 22 },   // B — Nr și data CPE
    { wch: 35 },   // C — Adresa
    { wch: 28 },   // D — Coordonate
    { wch: 18 },   // E — Categorie tip
    { wch: 15 },   // F — Categorie subtip
    { wch: 28 },   // G — Proprietar
    { wch: 12 },   // H — An construire
    { wch: 15 },   // I — Regim înălțime
    { wch: 15 },   // J — Arie
    { wch: 18 },   // K — EP primară
    { wch: 18 },   // L — Energie finală
    { wch: 18 },   // M — CO₂
    { wch: 12 },   // N — Clasa energetică
    { wch: 12 },   // O — Clasa emisii
    { wch: 15 },   // P — Clasa energetică renov
    { wch: 15 },   // Q — Clasa emisii renov
    { wch: 18 },   // R — Economii
    { wch: 18 },   // S — Reducere CO₂
    { wch: 18 },   // T — Data transmitere
    { wch: 30 },   // U — Observații
  ];

  // ─── ÎNĂLȚIMI RÂNDURI (antet colorat pe 2 rânduri) ─────────
  ws["!rows"] = [];
  ws["!rows"][0] = { hpt: 24 };             // titlu
  ws["!rows"][1] = { hpt: 18 };             // subtitlu
  ws["!rows"][headerRowIdx] = { hpt: 48 };  // antet coloane (wrap pe 2-3 rânduri)

  // ─── SETARE LAYOUT PAGINĂ (A3 landscape pentru imprimare) ──
  ws["!pageSetup"] = {
    orientation: "landscape",
    paperSize: 8, // A3
    fitToWidth: 1,
    fitToHeight: 0,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Registru Evidență");

  // ─── DESCĂRCARE ────────────────────────────────────────────
  const auditorSlug = (auditor?.name || "auditor")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const dateSlug = new Date().toISOString().slice(0, 10);
  const finalName = filename || `Registru_Evidenta_${auditorSlug}_${dateSlug}.xlsx`;

  if (download) {
    XLSX.writeFile(wb, finalName);
    return null;
  }

  // Returnează blob pentru alte utilizări (preview, upload, etc.)
  const arrayBuf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([arrayBuf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ────────────────────────────────────────────────────────────────────────
// VALIDARE — identifică câmpurile lipsă pentru un proiect
// ────────────────────────────────────────────────────────────────────────

/**
 * Verifică ce câmpuri obligatorii lipsesc dintr-un rând Anexa 6.
 * @returns {Array<string>} Lista etichetelor câmpurilor lipsă
 */
export function validateAnexa6Row(row) {
  const missing = [];
  if (!row.cpeNrData) missing.push("Nr./data CPE");
  if (!row.address) missing.push("Adresa");
  if (!row.coords) missing.push("Coordonate GPS");
  if (!row.areaUseful) missing.push("Aria utilă");
  if (!row.epPrimary) missing.push("Consum energie primară");
  if (!row.co2) missing.push("Emisii CO₂");
  if (!row.energyClass) missing.push("Clasa energetică");
  if (!row.emissionClass) missing.push("Clasa emisii");
  return missing;
}
