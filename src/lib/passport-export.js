/**
 * Export pașaport renovare EPBD 2024/1275 Art. 12 — JSON + XML + clipboard + PDF.
 * Toate exporturile generează fișier download prin Blob + anchor.
 *
 * Sprint Pas 7 docs (6 mai 2026) — extindere PDF de la 1 pagină (4 secțiuni minime)
 * la 3-4 pagini A4 cu 9 secțiuni complete:
 *   1. Identificare clădire (extinsă: cadastru + climă)
 *   2. Performanță energetică actuală (clasă + servicii separate)
 *   3. Țintă renovare + tabel MEPS (2030/2033/2035)
 *   4. Foaie de parcurs etapizată (faze cu costuri + clase intermediare)
 *   5. Tabel detaliat măsuri (cost, economie, CO2, durata viață, finanțare)
 *   6. Grafic traiectorie EP (actual → faze → țintă) + linii MEPS
 *   7. Reducere emisii CO2
 *   8. Analiză financiară (NPV, IRR, payback, finanțare disponibilă)
 *   9. Auditor energetic + footer juridic
 */

import { XML_SCHEMA_NAMESPACE } from "../data/renovation-passport-schema.js";

function defaultFilename(passport, ext) {
  const id = (passport?.passportId || "nou").slice(0, 8);
  const date = (passport?.timestamp || new Date().toISOString()).slice(0, 10);
  return `pasaport_renovare_${id}_${date}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { size: blob.size, filename };
}

export function exportPassportJSON(passport, options = {}) {
  const { prettify = true, filename } = options;
  const json = JSON.stringify(passport, null, prettify ? 2 : 0);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  return triggerDownload(blob, filename || defaultFilename(passport, "json"));
}

export function copyPassportToClipboard(passport) {
  const json = JSON.stringify(passport, null, 2);
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(json);
  }
  return Promise.reject(new Error("Clipboard API indisponibil"));
}

// ──────────────────────────────────────────────
// XML conversion
// ──────────────────────────────────────────────

const XML_TAG_FALLBACK = /[^a-zA-Z0-9_\-]/g;

function safeTagName(name) {
  if (typeof name !== "string" || name.length === 0) return "item";
  let cleaned = name.replace(XML_TAG_FALLBACK, "_");
  if (!/^[a-zA-Z_]/.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function jsonToXml(obj, nodeName = "value", indent = 0, xmlns = null) {
  const pad = "  ".repeat(indent);
  const tag = safeTagName(nodeName);
  const ns = xmlns ? ` xmlns="${escapeXml(xmlns)}"` : "";

  if (obj === null || obj === undefined) {
    return `${pad}<${tag}${ns}/>\n`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}<${tag}${ns}/>\n`;
    return obj.map((item) => jsonToXml(item, nodeName, indent)).join("");
  }

  if (typeof obj !== "object") {
    return `${pad}<${tag}${ns}>${escapeXml(obj)}</${tag}>\n`;
  }

  const children = Object.entries(obj)
    .map(([k, v]) => jsonToXml(v, k, indent + 1))
    .join("");
  if (!children) return `${pad}<${tag}${ns}/>\n`;
  return `${pad}<${tag}${ns}>\n${children}${pad}</${tag}>\n`;
}

export function passportToXml(passport) {
  const body = jsonToXml(passport, "renovationPassport", 0, XML_SCHEMA_NAMESPACE);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

export function exportPassportXML(passport, options = {}) {
  const { filename, download = true } = options;
  const xml = passportToXml(passport);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const fn = filename || defaultFilename(passport, "xml");
  if (!download) return { blob, filename: fn };
  return triggerDownload(blob, fn);
}

// ──────────────────────────────────────────────
// PDF export — extins multi-pagini A4 (Sprint Pas 7 docs 6 mai 2026)
// Format derivat din EPBD 2024/1275 Art. 12 + Anexa VIII.
// EPBD Art. 12 NU este transpus în drept român până la 29.05.2026.
// ──────────────────────────────────────────────

const CLASS_COLORS_PDF = {
  A: [22, 163, 74],
  B: [132, 204, 22],
  C: [234, 179, 8],
  D: [249, 115, 22],
  E: [239, 68, 68],
  F: [185, 28, 28],
  G: [127, 29, 29],
};

function fmtNum(n, dec = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function fmtRON(n) {
  if (!Number.isFinite(n) || n === 0) return "—";
  return Math.round(n).toLocaleString("ro-RO");
}

/**
 * Sursele de finanțare aplicabile — listă curentă RO 2026.
 * Extinde dinamic pe baza categoriei clădirii și a măsurilor incluse.
 */
function getApplicableFundingPrograms(passport) {
  const cat = passport?.building?.category || "";
  const measures = (passport?.roadmap?.phases || []).flatMap(p => p.measures || []);
  const hasEnvelope = measures.some(m => /anvelop|izol|ferestr|fa.ad/i.test(m.name || m.category || ""));
  const hasRenewable = measures.some(m => /pv|fotovolt|solar|pompa/i.test(m.name || m.category || ""));

  const programs = [];

  // PNRR Componenta C5 — renovare clădiri rezidențiale + publice
  if (["RI", "RC", "RA"].includes(cat)) {
    programs.push({
      name: "PNRR Componenta C5 — Renovare locuințe",
      grant: "Până la 60.000 RON/apartament (renovare moderată) sau 80.000 RON (aprofundată)",
      eligibil: hasEnvelope,
    });
  }
  if (["BI", "ED", "SP", "HC", "CO", "SA", "AL"].includes(cat)) {
    programs.push({
      name: "PNRR Componenta C5 — Clădiri publice",
      grant: "Până la 60% din valoarea investiției (max. 1.500 EUR/m²)",
      eligibil: hasEnvelope,
    });
  }

  // AFM Casa Verde Plus — fotovoltaice + pompe căldură (rezidențial)
  if (["RI", "RC", "RA"].includes(cat) && hasRenewable) {
    programs.push({
      name: "AFM Casa Verde Plus — Fotovoltaice",
      grant: "20.000 RON / sistem PV (până la epuizarea bugetului)",
      eligibil: true,
    });
  }
  if (["RI", "RC", "RA"].includes(cat)) {
    programs.push({
      name: "AFM Casa Verde Plus — Pompe căldură",
      grant: "Până la 30.000 RON / pompă căldură (criterii eligibilitate)",
      eligibil: hasRenewable,
    });
  }

  // ELENA / EIB — proiecte mari (instituționale)
  if (["BI", "SA", "ED"].includes(cat)) {
    programs.push({
      name: "ELENA (BEI) — Asistență tehnică investiții > 30 mil. EUR",
      grant: "Până la 90% costuri pregătire proiect",
      eligibil: false, // doar la cerere
    });
  }

  // Credite verzi BNR (2026)
  programs.push({
    name: "Credit verde BNR (bănci comerciale)",
    grant: "Dobândă redusă cu 0,5-1,5 p.p. pentru renovări energetice",
    eligibil: hasEnvelope || hasRenewable,
  });

  return programs;
}

/**
 * Desenează grafic linie traiectorie EP (actual → faze → țintă) cu linii MEPS de referință.
 * Folosește jsPDF nativ (line + circle), nu o bibliotecă externă.
 */
function drawEpTrajectoryChart(doc, opts) {
  const {
    x, y, width, height,
    epTrajectory = [],
    classTrajectory = [],
    phases = [],
    epBaseline = 0,
    ep2030 = 110,
    ep2nd = 90,
    milestone2 = 2033,
  } = opts;

  if (!epTrajectory.length) return;

  const maxEp = Math.max(...epTrajectory, epBaseline, ep2030, ep2nd) * 1.1;
  const minEp = 0;

  // Axă bordură
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Y-axis labels
  doc.setFont(undefined, "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  for (let i = 0; i <= 4; i++) {
    const val = maxEp * (1 - i / 4);
    const yp = y + height * (i / 4);
    doc.text(fmtNum(val, 0), x - 2, yp + 2, { align: "right" });
    if (i > 0 && i < 4) {
      doc.setDrawColor(230, 230, 230);
      doc.line(x, yp, x + width, yp);
    }
  }
  doc.setDrawColor(180, 180, 180);

  // Linii MEPS de referință
  if (ep2030 > 0 && ep2030 < maxEp) {
    const yMeps = y + height * (1 - (ep2030 - minEp) / (maxEp - minEp));
    doc.setDrawColor(239, 68, 68);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x, yMeps, x + width, yMeps);
    doc.setFontSize(6); doc.setTextColor(239, 68, 68);
    doc.text(`MEPS 2030: ${fmtNum(ep2030, 0)}`, x + width - 2, yMeps - 1, { align: "right" });
  }
  if (ep2nd > 0 && ep2nd < maxEp) {
    const yMeps = y + height * (1 - (ep2nd - minEp) / (maxEp - minEp));
    doc.setDrawColor(34, 197, 94);
    doc.line(x, yMeps, x + width, yMeps);
    doc.setFontSize(6); doc.setTextColor(34, 197, 94);
    doc.text(`MEPS ${milestone2}: ${fmtNum(ep2nd, 0)}`, x + width - 2, yMeps - 1, { align: "right" });
  }
  doc.setLineDashPattern([], 0);

  // Linie traiectorie EP
  const stepX = epTrajectory.length > 1 ? width / (epTrajectory.length - 1) : 0;
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  for (let i = 0; i < epTrajectory.length - 1; i++) {
    const x1 = x + i * stepX;
    const x2 = x + (i + 1) * stepX;
    const y1 = y + height * (1 - (epTrajectory[i] - minEp) / (maxEp - minEp));
    const y2 = y + height * (1 - (epTrajectory[i + 1] - minEp) / (maxEp - minEp));
    doc.line(x1, y1, x2, y2);
  }

  // Puncte pe traiectorie
  epTrajectory.forEach((ep, i) => {
    const cx = x + i * stepX;
    const cy = y + height * (1 - (ep - minEp) / (maxEp - minEp));
    const cls = classTrajectory[i] || "";
    const [r, g, b] = CLASS_COLORS_PDF[cls] || [245, 158, 11];
    doc.setFillColor(r, g, b);
    doc.circle(cx, cy, 1.5, "F");
    // Etichetă valoare deasupra punctului
    doc.setFont(undefined, "bold"); doc.setFontSize(6); doc.setTextColor(60, 60, 60);
    doc.text(`${fmtNum(ep, 0)}`, cx, cy - 2.5, { align: "center" });
  });

  // X-axis labels (ani faze)
  doc.setFont(undefined, "normal"); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  const labels = ["Actual", ...phases.map((p, i) => `Faza ${i + 1}\nAn ${p.year || (i + 1)}`)];
  labels.forEach((label, i) => {
    if (i >= epTrajectory.length) return;
    const xLabel = x + i * stepX;
    label.split("\n").forEach((line, li) => {
      doc.text(line, xLabel, y + height + 4 + li * 3, { align: "center" });
    });
  });
}

/**
 * Verifică spațiul rămas pe pagină; dacă e insuficient, adaugă pagină nouă.
 * Returnează noul y de start.
 */
function ensureSpace(doc, currentY, requiredHeight, w, h, drawHeader) {
  if (currentY + requiredHeight > h - 20) {
    doc.addPage();
    if (typeof drawHeader === "function") drawHeader();
    return 46; // y de început după header
  }
  return currentY;
}

export async function exportPassportPDF(passport, options = {}) {
  const { filename, building = {}, auditor = {}, energyClass, epPrimary } = options;
  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (typeof doc.autoTable !== "function" && typeof autoTableFn === "function") {
    doc.autoTable = function (opts) {
      const r = autoTableFn(doc, opts);
      if (!doc.lastAutoTable && r) doc.lastAutoTable = r;
      return doc.lastAutoTable;
    };
  }

  // Setup font Liberation Sans pentru diacritice RO
  let normFn = (t) => t;
  try {
    const { setupRomanianFont, normalizeForPdf, ROMANIAN_FONT } = await import("../utils/pdf-fonts.js");
    const fontOk = await setupRomanianFont(doc);
    normFn = (t) => typeof t === "string" ? normalizeForPdf(t, fontOk) : t;
    const origText = doc.text.bind(doc);
    doc.text = (text, ...args) => origText(
      Array.isArray(text) ? text.map(normFn) : normFn(text), ...args
    );
    if (typeof doc.autoTable === "function") {
      const origAt = doc.autoTable.bind(doc);
      const normCell = (cell) => {
        if (typeof cell === "string") return normFn(cell);
        if (cell && typeof cell === "object" && typeof cell.content === "string") {
          return { ...cell, content: normFn(cell.content) };
        }
        return cell;
      };
      const normRow = (row) => Array.isArray(row) ? row.map(normCell) : row;
      doc.autoTable = (opts) => {
        const merged = { ...(opts || {}) };
        if (fontOk) {
          const inject = (existing) => ({ font: ROMANIAN_FONT, ...(existing || {}) });
          merged.styles = inject(merged.styles);
          merged.headStyles = inject(merged.headStyles);
          merged.bodyStyles = inject(merged.bodyStyles);
          merged.footStyles = inject(merged.footStyles);
        }
        if (Array.isArray(merged.body)) merged.body = merged.body.map(normRow);
        if (Array.isArray(merged.head)) merged.head = merged.head.map(normRow);
        if (Array.isArray(merged.foot)) merged.foot = merged.foot.map(normRow);
        return origAt(merged);
      };
    }
  } catch (_) { /* fallback */ }

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Helper header pentru paginile 2+
  const drawHeader = () => {
    doc.setFillColor(180, 83, 9);
    doc.rect(0, 0, w, 18, "F");
    doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text("PAȘAPORT RENOVARE — PREVIEW EPBD 2024", w / 2, 8, { align: "center" });
    doc.setFont(undefined, "normal"); doc.setFontSize(7);
    doc.setTextColor(254, 215, 170);
    const passportId = passport?.passportId || "—";
    doc.text(`ID: ${String(passportId).slice(0, 36)}`, w / 2, 14, { align: "center" });
  };

  // ── PAGINA 1: HEADER + Identificare + Performanță ──
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 0, w, 36, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
  doc.text("PAȘAPORT RENOVARE — PREVIEW", w / 2, 12, { align: "center" });
  doc.setFont(undefined, "normal"); doc.setFontSize(8);
  doc.setTextColor(254, 243, 199);
  doc.text("Format derivat din EPBD 2024/1275 Art. 12 + Anexa VIII · termen transpunere RO 29.05.2026", w / 2, 18, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(254, 215, 170);
  doc.text("Document fără valoare juridică în România la data emiterii", w / 2, 24, { align: "center" });
  doc.setFontSize(8); doc.setTextColor(254, 243, 199);
  const passportId = passport?.passportId || passport?.generatedAt || "—";
  doc.text(`ID: ${String(passportId).slice(0, 36)}`, w / 2, 31, { align: "center" });

  let y = 46;

  // ── 1. IDENTIFICARE CLĂDIRE ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("1. Identificare clădire", 14, y); y += 2;
  doc.setDrawColor(13, 71, 161); doc.setLineWidth(0.4); doc.line(14, y, w - 14, y); y += 4;

  const b = passport?.building || {};
  const buildingFull = { ...b, ...building };
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    body: [
      ["Adresă", buildingFull?.address || "—"],
      ["Categorie funcțională", buildingFull?.category || "—"],
      ["Suprafață utilă", `${buildingFull?.areaUseful || "—"} m²`],
      ["An construcție", String(buildingFull?.yearBuilt || "—")],
      ["Nr. cadastral", buildingFull?.cadastralNumber || "—"],
      ["Zonă climatică (Mc 001-2022)", String(buildingFull?.climateZone || b?.climateZone || "—")],
      ["Cod CPE de referință", passport?.cpeCode || buildingFull?.cpeNumber || "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 2. PERFORMANȚĂ ENERGETICĂ ACTUALĂ ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("2. Performanța energetică actuală", 14, y); y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  const baseline = passport?.baseline || {};
  const cls = String(energyClass || baseline.energyClass || "G").trim();
  const ep = epPrimary ?? baseline.ep_total ?? 0;
  const [cr, cg, cb] = CLASS_COLORS_PDF[cls] || [100, 100, 100];
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(14, y, 26, 22, 3, 3, "F");
  doc.setFont(undefined, "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(cls, 27, y + 14, { align: "center" });
  doc.setFontSize(7); doc.text("CLASĂ", 27, y + 19, { align: "center" });

  doc.setTextColor(0, 0, 0); doc.setFont(undefined, "normal"); doc.setFontSize(10);
  doc.text(`EP primar: ${fmtNum(ep, 1)} kWh/(m²·an)`, 46, y + 6);
  doc.text(`EP nereg: ${fmtNum(baseline.ep_nren, 1)} kWh/(m²·an)`, 46, y + 11);
  doc.text(`EP regen: ${fmtNum(baseline.ep_ren, 1)} kWh/(m²·an)`, 46, y + 16);
  doc.text(`Emisii CO₂: ${fmtNum(baseline.co2, 1)} kg/(m²·an)`, 46, y + 21);
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text(`RER: ${fmtNum(baseline.rer_pct, 1)}%`, 110, y + 6);
  doc.text(`Format: ${passport?.format || "EPBD-2024-RO"}`, 110, y + 11);
  doc.text(`Generat: ${(passport?.timestamp || new Date().toISOString()).slice(0, 10)}`, 110, y + 16);
  y += 28;

  // ── 3. ȚINTĂ RENOVARE + MEPS ──
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("3. Țintă renovare & conformitate MEPS", 14, y); y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  const target = passport?.targetState || {};
  const roadmap = passport?.roadmap || {};
  const epTarget = target.ep_target ?? 0;
  const targetClass = target.energyClass_target || "B";
  const targetYear = roadmap.totalYears
    ? new Date().getFullYear() + roadmap.totalYears
    : 2030;

  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    body: [
      ["Clasă țintă post-renovare", String(targetClass)],
      ["EP țintă", `${fmtNum(epTarget, 1)} kWh/(m²·an)`],
      ["Orizont implementare", String(targetYear)],
      ["Reducere EP estimată",
        ep > 0
          ? `${fmtNum(ep - epTarget, 1)} kWh/(m²·an) (${fmtNum(((ep - epTarget) / ep) * 100, 0)}%)`
          : "—"],
      ["Conformitate MEPS 2030 post-renov",
        target.mepsComplianceTarget?.meps2030 ? "✓ Conform" : "✗ Neconform"],
      ["Conformitate MEPS 2033/2035 post-renov",
        target.mepsComplianceTarget?.meps2033 ? "✓ Conform" : "✗ Neconform"],
      ["Atinge nZEB (RER + EP)",
        target.nzebCompliant ? "✓ Da" : "✗ Nu"],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 4. FOAIE DE PARCURS ETAPIZATĂ ──
  const phases = roadmap.phases || [];
  if (phases.length > 0) {
    y = ensureSpace(doc, y, 60, w, h, drawHeader);
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("4. Foaie de parcurs etapizată", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: "auto", fontSize: 7 },
      },
      head: [["Faza", "An", "Cost (RON)", "EP după", "Clasă", "Măsuri"]],
      body: phases.map((p, i) => [
        `${i + 1}`,
        String(p.year || "—"),
        fmtRON(p.phaseCost_RON),
        `${fmtNum(p.ep_after, 1)} kWh`,
        String(p.class_after || "—"),
        (p.measures || []).map(m => m.name).slice(0, 4).join(" · ") +
          (p.measures.length > 4 ? ` …(+${p.measures.length - 4})` : ""),
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── 5. TABEL DETALIAT MĂSURI ──
  const allMeasures = phases.flatMap((p, pi) =>
    (p.measures || []).map(m => ({ ...m, phase: pi + 1, year: p.year }))
  );
  if (allMeasures.length > 0) {
    y = ensureSpace(doc, y, 80, w, h, drawHeader);
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("5. Detaliu măsuri recomandate", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: "auto", fontSize: 7 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 18, halign: "right" },
        6: { cellWidth: 14, halign: "center" },
      },
      head: [["F", "Măsură", "Categorie", "Cost (RON)", "Δ EP\nkWh/m²", "CO₂\nkg/m²", "Durată\nani"]],
      body: allMeasures.map(m => [
        String(m.phase),
        String(m.name || "—"),
        String(m.category || "—"),
        fmtRON(m.cost_RON),
        fmtNum(m.ep_reduction_kWh_m2, 1),
        fmtNum(m.co2_reduction, 1),
        String(m.lifespan_years || "20"),
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── 6. GRAFIC TRAIECTORIE EP ──
  if ((roadmap.epTrajectory || []).length > 1) {
    y = ensureSpace(doc, y, 75, w, h, drawHeader);
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("6. Traiectorie EP — actual → țintă", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 6;

    drawEpTrajectoryChart(doc, {
      x: 24, y: y, width: w - 38, height: 50,
      epTrajectory: roadmap.epTrajectory,
      classTrajectory: roadmap.classTrajectory || [],
      phases: phases,
      epBaseline: ep,
      ep2030: passport?.baseline?.meps2030_compliant !== undefined ? 110 : 110,
      ep2nd: 90,
      milestone2: 2033,
    });
    y += 60;
    doc.setFont(undefined, "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(
      "Linie roșie întreruptă: prag MEPS 2030 (EPBD Art. 9). Linie verde: prag MEPS 2033/2035.",
      14, y
    );
    y += 8;
  }

  // ── 7. REDUCERE EMISII CO₂ ──
  if (allMeasures.length > 0) {
    y = ensureSpace(doc, y, 30, w, h, drawHeader);
    const totalCO2Reduction = allMeasures.reduce((s, m) => s + (parseFloat(m.co2_reduction) || 0), 0);
    const Au = parseFloat(buildingFull?.areaUseful) || 0;
    const annualCO2Saved = totalCO2Reduction * Au;

    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("7. Reducere emisii CO₂", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 75, fontStyle: "bold" } },
      body: [
        ["Emisii actuale (kg CO₂/m²·an)", fmtNum(baseline.co2, 1)],
        ["Reducere estimată (kg CO₂/m²·an)", fmtNum(totalCO2Reduction, 1)],
        ["Reducere anuală totală (kg CO₂/an)", fmtRON(annualCO2Saved)],
        ["Reducere pe durata 20 ani (t CO₂)", fmtNum(annualCO2Saved * 20 / 1000, 1)],
      ],
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── 8. ANALIZĂ FINANCIARĂ + FINANȚARE ──
  const fin = passport?.financial || {};
  y = ensureSpace(doc, y, 80, w, h, drawHeader);
  doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
  doc.text("8. Analiză financiară & surse de finanțare", 14, y); y += 2;
  doc.line(14, y, w - 14, y); y += 4;

  const totalCost = phases.reduce((s, p) => s + (p.phaseCost_RON || 0), 0);
  doc.autoTable({
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 75, fontStyle: "bold" } },
    body: [
      ["Investiție totală estimată", `${fmtRON(totalCost || fin.totalInvestment_RON)} RON`],
      ["Grant maxim eligibil", `${fmtRON(fin.totalGrant_RON)} RON`],
      ["Investiție netă (după grant)", `${fmtRON(fin.netInvestment_RON || totalCost)} RON`],
      ["NPV 30 ani", fin.npv_30years_RON ? `${fmtRON(fin.npv_30years_RON)} RON` : "—"],
      ["IRR (rata internă rentabilitate)", fin.irr_pct ? `${fmtNum(fin.irr_pct, 1)}%` : "—"],
      ["Perioadă recuperare simplă", fin.paybackSimple_years ? `${fmtNum(fin.paybackSimple_years, 1)} ani` : "—"],
      ["Perioadă recuperare actualizată", fin.paybackDiscounted_years ? `${fmtNum(fin.paybackDiscounted_years, 1)} ani` : "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // Programe finanțare aplicabile
  const programs = getApplicableFundingPrograms(passport);
  if (programs.length > 0) {
    y = ensureSpace(doc, y, 40, w, h, drawHeader);
    doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(13, 71, 161);
    doc.text("Surse de finanțare aplicabile (RO 2026)", 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 60, fontStyle: "bold" },
        2: { cellWidth: "auto" },
      },
      head: [["Elig.", "Program", "Detalii grant"]],
      body: programs.map(p => [
        p.eligibil ? "✓" : "—",
        p.name,
        p.grant,
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── 9. AUDITOR ──
  const auditorObj = passport?.auditor || {};
  if (auditorObj.name || auditor?.name) {
    y = ensureSpace(doc, y, 30, w, h, drawHeader);
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(13, 71, 161);
    doc.text("9. Auditor energetic", 14, y); y += 2;
    doc.line(14, y, w - 14, y); y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: { fillColor: [240, 244, 248], textColor: [13, 71, 161], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Auditor", auditorObj.name || auditor?.name || "—"],
        ["Atestat MDLPA", `${auditorObj.certNumber || auditor?.atestat || "—"} / ${auditor?.grade || auditorObj.category || "AE Ici"}`],
        ["Firmă / PFA", auditorObj.firm || auditor?.company || auditor?.firma || "—"],
        ["Contact", auditorObj.contact || auditor?.email || "—"],
      ],
    });
    y = doc.lastAutoTable.finalY + 8;

    // Sprint Pas 7 docs (6 mai 2026) P1-2 — spațiu semnătură + ștampilă (ca în Deviz).
    // Două chenare goale pe care auditorul le poate semna manual / ștampila.
    y = ensureSpace(doc, y, 35, w, h, drawHeader);
    const sigW = (w - 28 - 12) / 2;
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
    doc.rect(14, y, sigW, 22);
    doc.rect(14 + sigW + 12, y, sigW, 22);
    doc.setFont(undefined, "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text("Semnătură auditor", 14 + sigW / 2, y + 26, { align: "center" });
    doc.text("Ștampilă profesională", 14 + sigW + 12 + sigW / 2, y + 26, { align: "center" });
    y += 30;
  }

  // ── FOOTER toate paginile ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.text("Zephren · Pașaport intern (preview EPBD 2024) · Fără bază legală RO la data emiterii", 14, h - 10);
    doc.text(`Pag. ${i}/${pageCount}`, w - 14, h - 10, { align: "right" });
  }

  const blob = doc.output("blob");
  const fn = filename || defaultFilename(passport, "pdf");
  if (options.download === false) return { blob, filename: fn };
  return triggerDownload(blob, fn);
}

// Export helpers for testing
export const _internals = {
  getApplicableFundingPrograms,
  CLASS_COLORS_PDF,
  fmtNum,
  fmtRON,
};
