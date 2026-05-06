// ═══════════════════════════════════════════════════════════════
// ZEPHREN — Modul generare rapoarte PDF
// Toate funcțiile sunt async și folosesc import() dinamic jsPDF
// Color scheme: header dark (#0d0f1a / amber), corp alb/gri
// Normative: Mc 001-2022, ISO 52000-1, EN 15978, EN ISO 717-1,
//            EN ISO 13788, C125, NP 008-97, SR 6156:2016
// ═══════════════════════════════════════════════════════════════
import { U_REF_NZEB_RES as U_REF_RES, U_REF_NZEB_NRES as U_REF_NRES, U_REF_GLAZING } from "../data/u-reference.js";

const BRAND = "ZEPHREN";
const VERSION = "v3.4";
const COL_H = [13, 15, 26];   // #0d0f1a — header dark
const COL_A = [251, 191, 36]; // #fbbf24 — amber accent
const COL_G = [80, 80, 90];   // text gri corp
const COL_W = [255, 255, 255];
const COL_ERR = [220, 38, 38];
const COL_OK  = [22, 163, 74];

// ── Utilitar: inițializare jsPDF ──────────────────────────────
// jspdf-autotable v5 nu mai patch-ează automat prototipul jsPDF — apelul
// `doc.autoTable(...)` eșuează cu "is not a function". Folosim fallback
// pe default export `autoTable(doc, options)` și atașăm manual la instanță.
//
// Diacritice RO: Roboto TTF (Regular + opțional Bold/Italic/BoldItalic)
// înregistrat în VFS pe TOATE 4 stilurile, ca `setFont(undefined,"bold")` și
// celulele autoTable cu `fontStyle:"bold"` să rămână pe Roboto (nu cad pe
// Helvetica → ar pierde ș/ț/ă/î/â). Vezi `src/utils/pdf-fonts.js`.
async function initDoc() {
  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = autoTableMod.default || autoTableMod.autoTable || autoTableMod;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Patch autoTable + injectează font Liberation Sans în toate stilurile
  let fontName = null;
  let normalizeForPdf = (t) => t;
  try {
    const { setupRomanianFont, normalizeForPdf: _norm, ROMANIAN_FONT } = await import("../utils/pdf-fonts.js");
    const fontOk = await setupRomanianFont(doc);
    if (fontOk) fontName = ROMANIAN_FONT;
    // Aplicăm ÎNTOTDEAUNA normalizarea simbolurilor (✓ ✗ ⚠ → text safe);
    // dacă font-ul nu e disponibil, aplicăm și transliterarea diacriticelor.
    normalizeForPdf = (t) => _norm(t, fontOk);
  } catch (_) { /* font indisponibil — text trece raw */ }

  // Helper de normalizare aplicabil pe valori autoTable (string sau {content})
  const normCell = (cell) => {
    if (typeof cell === "string") return normalizeForPdf(cell);
    if (cell && typeof cell === "object" && typeof cell.content === "string") {
      return { ...cell, content: normalizeForPdf(cell.content) };
    }
    return cell;
  };
  const normRow = (row) => Array.isArray(row) ? row.map(normCell) : row;

  // Patch doc.text pentru normalizare simboluri + diacritice
  const origText = doc.text.bind(doc);
  doc.text = (text, ...args) => {
    if (Array.isArray(text)) return origText(text.map((t) => typeof t === "string" ? normalizeForPdf(t) : t), ...args);
    return origText(typeof text === "string" ? normalizeForPdf(text) : text, ...args);
  };

  // Atașează autoTable + injectează font + normalizare în toate secțiunile
  if (typeof doc.autoTable !== "function" && typeof autoTableFn === "function") {
    doc.autoTable = function (opts) {
      const merged = applyFontDefaults(opts || {}, fontName);
      if (Array.isArray(merged.body)) merged.body = merged.body.map(normRow);
      if (Array.isArray(merged.head)) merged.head = merged.head.map(normRow);
      if (Array.isArray(merged.foot)) merged.foot = merged.foot.map(normRow);
      const result = autoTableFn(doc, merged);
      if (!doc.lastAutoTable && result) doc.lastAutoTable = result;
      return doc.lastAutoTable;
    };
  } else if (typeof doc.autoTable === "function") {
    const origAt = doc.autoTable.bind(doc);
    doc.autoTable = (opts) => {
      const merged = applyFontDefaults(opts || {}, fontName);
      if (Array.isArray(merged.body)) merged.body = merged.body.map(normRow);
      if (Array.isArray(merged.head)) merged.head = merged.head.map(normRow);
      if (Array.isArray(merged.foot)) merged.foot = merged.foot.map(normRow);
      return origAt(merged);
    };
  }

  return doc;
}

// Injectează font Roboto în styles/headStyles/bodyStyles/footStyles ale
// autoTable, fără să suprascrie alte proprietăți deja setate de apelant.
function applyFontDefaults(opts, fontName) {
  if (!fontName) return opts;
  const merge = (existing) => ({ font: fontName, ...(existing || {}) });
  return {
    ...opts,
    styles: merge(opts.styles),
    headStyles: merge(opts.headStyles),
    bodyStyles: merge(opts.bodyStyles),
    footStyles: merge(opts.footStyles),
  };
}

// ── Utilitar: header pagini ───────────────────────────────────
// Layout: [BRAND ZEPHREN] (fix 28mm stânga) | [title centrat, clamp lățime] | [auditor + data dreapta, clamp 60mm]
// Evităm suprapunerile dintre titlu și sigla auditor măsurând lățimea reală.
function addPageHeader(doc, title, auditorName, dateStr) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COL_H);
  doc.rect(0, 0, w, 18, "F");
  doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.setTextColor(...COL_A);
  doc.text(BRAND, 10, 12);

  // Auditor + data — lățime maximă 60mm, aliniat dreapta
  doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(180, 180, 180);
  const audMeta = `${auditorName || ""}${auditorName && dateStr ? "  |  " : ""}${dateStr || ""}`;
  const audMaxW = 62;
  const audClipped = clampText(doc, audMeta, audMaxW);
  doc.text(audClipped, w - 10, 12, { align: "right" });
  const audActualW = doc.getTextWidth(audClipped);

  // Titlu — centrat dar într-o casetă care respectă spațiul liber dintre brand și auditor
  const brandRight = 10 + doc.getTextWidth(BRAND) + 4; // după brand
  const audLeft = w - 10 - audActualW - 4;             // înainte de meta
  const titleZoneCenter = (brandRight + audLeft) / 2;
  const titleZoneWidth = Math.max(40, audLeft - brandRight - 2);
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  doc.setTextColor(...COL_W);
  const titleClamped = clampText(doc, title || "", titleZoneWidth);
  doc.text(titleClamped, titleZoneCenter, 12, { align: "center" });
}

// Trunchiază un text astfel încât să încapă în maxWidth (mm), adăugând "…" la final.
function clampText(doc, text, maxWidth) {
  if (!text) return "";
  const t = String(text);
  if (doc.getTextWidth(t) <= maxWidth) return t;
  const ellipsis = "…";
  let lo = 0, hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(t.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return t.slice(0, lo) + ellipsis;
}

// ── Utilitar: footer pagini ───────────────────────────────────
function addPageFooter(doc, normative, pageNum) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200); doc.setLineWidth(0.3);
  doc.line(10, h - 10, w - 10, h - 10);
  doc.setFontSize(6); doc.setTextColor(150);
  doc.text(normative || "", 10, h - 6);
  doc.text(`${BRAND} ${VERSION}  |  Pagina ${pageNum}`, w - 10, h - 6, { align: "right" });
}

// ── Utilitar: secțiune titlu ──────────────────────────────────
function sectionTitle(doc, text, y) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COL_H);
  doc.rect(10, y - 4, w - 20, 7, "F");
  doc.setFontSize(9); doc.setFont(undefined, "bold");
  doc.setTextColor(...COL_A);
  doc.text(text, 13, y + 0.5);
  doc.setTextColor(0);
  return y + 8;
}

// ── Utilitar: tabel autoTable cu stil consistent ──────────────
function autoTable(doc, opts) {
  doc.autoTable({
    theme: "grid",
    headStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COL_G },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 10, right: 10 },
    ...opts,
  });
  return doc.lastAutoTable.finalY + 5;
}

// ── Utilitar: finalizare PDF → blob sau download ──────────────
function finalize(doc, filename, download) {
  if (download !== false) {
    doc.save(filename);
    return null;
  }
  return doc.output("blob");
}

// ── Utilitar: data formatată ──────────────────────────────────
function dateRO() {
  return new Date().toLocaleDateString("ro-RO");
}

// ── Utilitar: sigla auditor ───────────────────────────────────
function auditorBlock(doc, auditor, y) {
  const rows = [
    ["Auditor energetic", auditor?.name || "-"],
    ["Nr. atestat / Grad", `${auditor?.atestat || "-"} / ${auditor?.grade || "-"}`],
    ["Firma / Organizație", auditor?.company || "-"],
    ["Data elaborării", auditor?.date || dateRO()],
  ];
  return autoTable(doc, { startY: y, columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } }, body: rows });
}

// ═══════════════════════════════════════════════════════════════
// 1. RAPORT TEHNIC COMPLET — inginer (pct. 18)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport tehnic complet pentru inginer (pct. 18)
 * Include: toate formulele, calculele intermediare, bilanț lunar ISO 13790,
 * Ht, Hv, tau, utilizare factor, pierderi și aportul de căldură per lună,
 * date climatice complete, U-values toate elementele.
 * @returns {Promise<Blob|null>}
 */
export async function generateTechnicalReport({
  building, selectedClimate, instSummary, renewSummary,
  envelopeSummary, opaqueElements, glazingElements, thermalBridges, monthlyISO,
  heating, cooling, ventilation, lighting, acm, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT TEHNIC ENERGETIC — ISO 52000-1";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    // ── Pagina 1: Identificare și rezumat ──
    addPageHeader(doc, title, audName, today);
    let y = 26;

    // Titlu document
    doc.setFontSize(13); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT DE CALCUL ENERGETIC DETALIAT", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("Metodologie: SR EN ISO 52000-1:2017, Mc 001-2022 (MDLPA 16/2023), EPBD 2024/1275", w / 2, y, { align: "center" }); y += 8;

    y = sectionTitle(doc, "1. DATE CLĂDIRE ȘI CLIMĂ", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Adresă", `${building?.address || "-"}, ${building?.city || "-"}, jud. ${building?.county || "-"}`],
        ["Categorie funcțională", building?.category || "-"],
        ["An construcție / renovare", `${building?.yearBuilt || "-"} / ${building?.yearRenov || "-"}`],
        ["Suprafață utilă Au", `${building?.areaUseful || "-"} m²`],
        ["Volum încălzit V", `${building?.volume || "-"} m³`],
        ["Număr niveluri", building?.floors || "-"],
        ["Stație climatică", `${selectedClimate?.name || "-"} — Zona ${selectedClimate?.zone || "-"}`],
        ["Temperatură ext. calcul θe", `${selectedClimate?.theta_e ?? "-"} °C`],
        ["Grade-zile încălzire GZ", `${selectedClimate?.gz || "-"} °C·zile`],
        ["Iradiere solară anuală", `${selectedClimate?.solar_annual || "-"} kWh/m²·an`],
      ],
    });

    y = sectionTitle(doc, "2. COEFICIENȚI GLOBALI DE TRANSFER TERMIC", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Parametru", "Simbol", "Valoare", "Unitate", "Metodă"]],
      body: [
        ["Coef. transfer termic prin anvelopă", "H_T", envelopeSummary?.Ht?.toFixed(2) || "-", "W/K", "ISO 13789"],
        ["Coef. transfer termic prin ventilare", "H_V", instSummary?.Hv?.toFixed(2) || "-", "W/K", "ISO 13789"],
        ["Coef. total pierderi termice", "H_tot", ((envelopeSummary?.Ht || 0) + (instSummary?.Hv || 0)).toFixed(2), "W/K", "calculat"],
        ["Coef. specific pierderi q_H50", "q50", building?.q50 || "-", "m³/(h·m²)", "Blower door"],
        ["Număr schimburi aer n_inf", "n_inf", instSummary?.n_inf?.toFixed(3) || "-", "h⁻¹", "EN 12831"],
        ["Factor utilizare aport intern η", "η_H", instSummary?.eta_H?.toFixed(3) || "-", "—", "ISO 13790"],
        ["Constantă timp termică τ", "τ", instSummary?.tau?.toFixed(1) || "-", "h", "ISO 13790"],
      ],
    });

    y = sectionTitle(doc, "3. VALORI U — ELEMENTE OPACE", y);
    const opRows = (opaqueElements || []).map(el => [
      el.name || el.type || "-",
      el.type || "-",
      `${el.area || "-"} m²`,
      el.U?.toFixed(3) || "-",
      el.U_max || "-",
      el.U <= (el.U_max || 999) ? "✓ OK" : "✗ DEPAȘ.",
    ]);
    y = autoTable(doc, {
      startY: y,
      head: [["Element", "Tip", "Suprafață", "U [W/m²K]", "U_max", "Conform"]],
      body: opRows.length ? opRows : [["—", "", "", "", "", ""]],
      columnStyles: {
        5: { halign: "center" },
      },
    });

    y = sectionTitle(doc, "4. VALORI U — ELEMENTE VITRATE", y);
    const glRows = (glazingElements || []).map(gl => [
      gl.orientation || "-",
      gl.type || gl.name || "-",
      gl.frameType || "-",
      `${gl.area || "-"} m²`,
      gl.U?.toFixed(2) || "-",
      gl.g?.toFixed(2) || "-",
    ]);
    y = autoTable(doc, {
      startY: y,
      head: [["Orientare", "Tip geam", "Ramă", "Suprafață", "U [W/m²K]", "g [-]"]],
      body: glRows.length ? glRows : [["—", "", "", "", "", ""]],
    });

    addPageFooter(doc, "SR EN ISO 52000-1:2017 | Mc 001-2022 | EN 12831", page);

    // ── Pagina 2: Bilanț lunar ISO 13790 ──
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "5. BILANȚ ENERGETIC LUNAR ISO 13790 — ÎNCĂLZIRE", y);
    const months = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mRows = (monthlyISO || months.map(m => ({ month: m }))).map(mr => [
      mr.month || "-",
      mr.theta_e?.toFixed(1) ?? "-",
      mr.Q_H_tr?.toFixed(0) ?? "-",
      mr.Q_H_ve?.toFixed(0) ?? "-",
      mr.Q_sol?.toFixed(0) ?? "-",
      mr.Q_int?.toFixed(0) ?? "-",
      mr.eta?.toFixed(3) ?? "-",
      mr.Q_H_nd?.toFixed(0) ?? "-",
    ]);
    y = autoTable(doc, {
      startY: y,
      head: [["Lună", "θe [°C]", "Q_tr [kWh]", "Q_ve [kWh]", "Q_sol [kWh]", "Q_int [kWh]", "η [-]", "Q_H_nd [kWh]"]],
      body: mRows,
    });

    y = sectionTitle(doc, "6. CONSUMURI FINALE ȘI PRIMARE", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Utilitate", "Q_f [kWh/an]", "EP [kWh/m²·an]", "CO₂ [kgCO₂/m²·an]", "Factor fp"]],
      body: [
        ["Încălzire",  instSummary?.qf_h?.toFixed(0) || "-",  instSummary?.ep_h?.toFixed(1) || "-",  instSummary?.co2_h?.toFixed(1) || "-",  heating?.fp || "-"],
        ["Apă caldă",  instSummary?.qf_w?.toFixed(0) || "-",  instSummary?.ep_w?.toFixed(1) || "-",  instSummary?.co2_w?.toFixed(1) || "-",  acm?.fp || "-"],
        ["Climatizare", instSummary?.qf_c?.toFixed(0) || "-", instSummary?.ep_c?.toFixed(1) || "-",  instSummary?.co2_c?.toFixed(1) || "-",  cooling?.fp || "-"],
        ["Ventilare",  instSummary?.qf_v?.toFixed(0) || "-",  instSummary?.ep_v?.toFixed(1) || "-",  instSummary?.co2_v?.toFixed(1) || "-",  ventilation?.fp || "-"],
        ["Iluminat",   instSummary?.qf_l?.toFixed(0) || "-",  instSummary?.ep_l?.toFixed(1) || "-",  instSummary?.co2_l?.toFixed(1) || "-",  lighting?.fp || "-"],
        ["TOTAL",      instSummary?.qf_total?.toFixed(0) || "-", instSummary?.ep_total_m2?.toFixed(1) || "-", instSummary?.co2_total_m2?.toFixed(1) || "-", "—"],
      ],
      footStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold" },
    });

    if (renewSummary) {
      y = sectionTitle(doc, "7. ENERGIE REGENERABILĂ ȘI EP AJUSTAT", y);
      y = autoTable(doc, {
        startY: y,
        columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" } },
        body: [
          ["EP ajustat după SRE", `${renewSummary.ep_adjusted_m2?.toFixed(1) || "-"} kWh/(m²·an)`],
          ["CO₂ ajustat", `${renewSummary.co2_adjusted_m2?.toFixed(1) || "-"} kgCO₂/(m²·an)`],
          ["Rată energie regenerabilă RER", `${renewSummary.rer?.toFixed(1) || "-"} %`],
          ["Producție SRE totală", `${renewSummary.e_ren_total?.toFixed(0) || "-"} kWh/an`],
        ],
      });
    }

    y = sectionTitle(doc, "8. DATE AUDITOR", y);
    auditorBlock(doc, auditor, y);
    addPageFooter(doc, "SR EN ISO 52000-1:2017 | Mc 001-2022 | EN 12831", page);

    // ── Pagina 3: Punți termice și date instalații ──
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    if (thermalBridges?.length) {
      y = sectionTitle(doc, "9. PUNȚI TERMICE — SR EN ISO 10211", y);
      y = autoTable(doc, {
        startY: y,
        head: [["Tip punte termică", "Lungime [m]", "ψ [W/m·K]", "χ [W/K]", "ΔU contrib."]],
        body: thermalBridges.map(tb => [
          tb.type || tb.name || "-",
          tb.length?.toFixed(1) ?? "-",
          tb.psi?.toFixed(3) ?? "-",
          tb.chi?.toFixed(2) ?? "-",
          tb.deltaU?.toFixed(4) ?? "-",
        ]),
      });
    }

    y = sectionTitle(doc, "10. DATE SISTEME TEHNICE", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Sistem", "Tip", "Eficiență / COP / EER", "Note"]],
      body: [
        ["Încălzire",    heating?.type    || "-", heating?.eta    || heating?.cop    || "-", heating?.fuel || "-"],
        ["Apă caldă",   acm?.type        || "-", acm?.eta        || "-",                   acm?.solar ? "Solar termic" : "-"],
        ["Climatizare",  cooling?.type    || "-", cooling?.eer    || cooling?.cop    || "-", cooling?.hasCooling ? "DA" : "NU"],
        ["Ventilare",    ventilation?.type|| "-", ventilation?.hrv|| "-",                   ventilation?.hrv ? "HRV/ERV" : "-"],
        ["Iluminat",     lighting?.type   || "-", lighting?.w_m2  ? `${lighting.w_m2} W/m²` : "-", lighting?.sensors || "-"],
      ],
    });

    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("* Valorile EP și CO₂ sunt calculate conform metodologiei naționale Mc 001-2022, factori fp conform Ordinul MDLPA 16/2023.", 10, y + 3);

    addPageFooter(doc, "SR EN ISO 52000-1:2017 | Mc 001-2022 | SR EN ISO 10211 | EN 12831", page);

    const addr = (building?.address || "raport").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportTehnic_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateTechnicalReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. RAPORT SIMPLIFICAT PROPRIETAR (pct. 19)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport simplificat pentru proprietar (pct. 19)
 * Zero termeni tehnici. Limbaj simplu: "Casa ta pierde X% din căldură prin pereți"
 * Include: clasa energetică vizualizată mare, factura estimată, top 3 recomandări,
 * economie în RON și CO₂, comparație cu clădiri similare.
 * @returns {Promise<Blob|null>}
 */
export async function generateOwnerReport({
  building, instSummary, renewSummary,
  envelopeSummary, energyPrices, lang,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT ENERGETIC — PROPRIETAR";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, "", today);
    let y = 26;

    const epF = renewSummary ? renewSummary.ep_adjusted_m2 : instSummary?.ep_total_m2 || 0;
    const co2F = renewSummary ? renewSummary.co2_adjusted_m2 : instSummary?.co2_total_m2 || 0;

    // Clasa energetică determinată dinamic
    let clsLabel = "?", clsColor = "#888888";
    if      (epF <= 50)  { clsLabel = "A+"; clsColor = "#15803d"; }
    else if (epF <= 100) { clsLabel = "A";  clsColor = "#22c55e"; }
    else if (epF <= 150) { clsLabel = "B";  clsColor = "#84cc16"; }
    else if (epF <= 200) { clsLabel = "C";  clsColor = "#eab308"; }
    else if (epF <= 300) { clsLabel = "D";  clsColor = "#f97316"; }
    else if (epF <= 400) { clsLabel = "E";  clsColor = "#ef4444"; }
    else                  { clsLabel = "F";  clsColor = "#7f1d1d"; }

    // Hexadecimal → RGB
    const hexRgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];

    // Titlu prietenos
    doc.setFontSize(15); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("Performanța energetică a clădirii tale", w / 2, y, { align: "center" }); y += 6;
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(`${building?.address || ""}, ${building?.city || ""}`, w / 2, y, { align: "center" }); y += 10;

    // Clasa energetică — vizualizare mare
    doc.setFillColor(...hexRgb(clsColor));
    doc.roundedRect(w / 2 - 20, y, 40, 30, 6, 6, "F");
    doc.setFontSize(26); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(clsLabel, w / 2, y + 20, { align: "center" });
    y += 36;

    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text(`${epF.toFixed(0)} kWh pe metru pătrat pe an`, w / 2, y, { align: "center" }); y += 8;

    // Comparație benchmark simplu
    const benchmarkNat = 250;
    const pctVsBenchmark = benchmarkNat > 0 ? Math.round((1 - epF / benchmarkNat) * 100) : 0;
    doc.setFontSize(9); doc.setTextColor(...COL_G); doc.setFont(undefined, "normal");
    if (pctVsBenchmark > 0) {
      doc.text(`Casa ta consumă cu ${pctVsBenchmark}% mai puțină energie față de media națională (${benchmarkNat} kWh/m²·an).`, w / 2, y, { align: "center" });
    } else {
      doc.text(`Casa ta consumă cu ${Math.abs(pctVsBenchmark)}% mai multă energie față de media națională (${benchmarkNat} kWh/m²·an).`, w / 2, y, { align: "center" });
    }
    y += 8;

    // Factură estimată
    const pGaz = energyPrices?.gas || 0.35;    // RON/kWh
    const pEl  = energyPrices?.electricity || 1.20; // RON/kWh
    const Au   = parseFloat(building?.areaUseful) || 100;
    const costAnual = Math.round(epF * Au * pGaz);
    const costLunar = Math.round(costAnual / 12);

    y = sectionTitle(doc, "CÂT PLĂTEȘTI?", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["Cost anual estimat energie", `aprox. ${costAnual.toLocaleString("ro-RO")} RON / an`],
        ["Cost lunar mediu",           `aprox. ${costLunar.toLocaleString("ro-RO")} RON / lună`],
        ["Emisii CO₂",                 `${(co2F * Au).toFixed(0)} kg CO₂ pe an`],
      ],
    });

    // Pierderi de căldură — limbaj simplu
    y = sectionTitle(doc, "UNDE SE PIERDE CĂLDURA?", y);
    const HtPct = envelopeSummary?.Ht && instSummary?.Hv
      ? Math.round(envelopeSummary.Ht / (envelopeSummary.Ht + instSummary.Hv) * 100) : 70;
    const HvPct = 100 - HtPct;
    y = autoTable(doc, {
      startY: y,
      body: [
        [`Prin pereți, ferestre și acoperiș`, `${HtPct}% din căldura pierdută`],
        [`Prin aerul de ventilare și infiltrații`, `${HvPct}% din căldura pierdută`],
      ],
      columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right", fontStyle: "bold" } },
    });

    // Top 3 recomandări
    y = sectionTitle(doc, "TOP 3 LUCRURI PE CARE LE POȚI FACE", y);
    const recs = [
      ["1", "Izolează pereții exteriori cu 15–20 cm EPS/Vată minerală", "Economie: 30–40% din factură"],
      ["2", "Înlocuiește ferestrele cu triplu vitraj Low-E", "Economie: 10–15% din factură"],
      ["3", "Montează o pompă de căldură sau centrală condensare", "Economie: 20–35% din factură"],
    ];
    y = autoTable(doc, {
      startY: y,
      head: [["#", "Recomandare", "Beneficiu estimat"]],
      body: recs,
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 60 } },
    });

    // Economie în RON și CO₂
    const economiePct = 0.35;
    const economieRON = Math.round(costAnual * economiePct);
    const economieCO2 = Math.round(co2F * Au * economiePct);
    y = sectionTitle(doc, "DACĂ APLICI TOATE RECOMANDĂRILE", y);
    y = autoTable(doc, {
      startY: y,
      body: [
        ["Economie anuală estimată", `aprox. ${economieRON.toLocaleString("ro-RO")} RON / an`],
        ["Reducere emisii CO₂",      `aprox. ${economieCO2} kg CO₂ / an`],
        ["Timp de recuperare investiție", "8–12 ani (estimativ)"],
      ],
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { halign: "right" } },
    });

    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("* Valorile sunt estimative. Contactați un auditor energetic autorizat pentru un calcul detaliat conform Mc 001-2022.", 10, y + 3);

    addPageFooter(doc, "Mc 001-2022 | EPBD 2024/1275 | Zephren Energy Calculator", page);

    const addr = (building?.address || "proprietar").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportProprietar_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateOwnerReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. RAPORT PNRR DOSAR (pct. 20)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport PNRR dosar (pct. 20)
 * Format specific AFM/PNRR cu câmpuri obligatorii.
 * @returns {Promise<Blob|null>}
 */
export async function generatePNRRReport({
  building, instSummary, renewSummary,
  rehabComparison, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT PNRR — REABILITARE ENERGETICĂ";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, audName, today);
    let y = 26;

    // Titlu oficial
    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("FIȘĂ TEHNICĂ REABILITARE ENERGETICĂ", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("PNRR — Componenta C5 | Axa I2 (blocuri) / I3 (clădiri publice) | AFM România", w / 2, y, { align: "center" }); y += 10;

    y = sectionTitle(doc, "1. DATE CLĂDIRE (obligatorii AFM)", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 65, fontStyle: "bold" } },
      body: [
        ["Adresă completă", `${building?.address || "-"}, ${building?.city || "-"}, jud. ${building?.county || "-"}`],
        ["Cod SIRSUP / Cod clădire", building?.sirsup || building?.codCladire || "-"],
        ["Categorie funcțională PNRR", building?.category || "-"],
        ["An construcție", building?.yearBuilt || "-"],
        ["Regim înălțime / Nr. niveluri", `${building?.regimH || "-"} / ${building?.floors || "-"} etaje`],
        ["Suprafață utilă totală [m²]", building?.areaUseful || "-"],
        ["Suprafață desfășurată [m²]", building?.areaDesfasurata || "-"],
        ["Număr apartamente / utilizatori", building?.nrApt || building?.nrUsers || "-"],
        ["Sistem de încălzire existent", building?.existingHeating || "-"],
        ["An ultimei reabilitări (dacă există)", building?.yearRenov || "—"],
      ],
    });

    y = sectionTitle(doc, "2. PERFORMANȚĂ ENERGETICĂ — ÎNAINTE DE REABILITARE", y);
    const epBefore = rehabComparison?.epBefore || instSummary?.ep_total_m2 || 0;
    const co2Before = rehabComparison?.co2Before || instSummary?.co2_total_m2 || 0;
    const clsBefore = epBefore <= 100 ? "A/B" : epBefore <= 200 ? "C" : epBefore <= 300 ? "D" : epBefore <= 400 ? "E" : "F/G";

    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["Energie primară EP [kWh/m²·an]", epBefore.toFixed(1)],
        ["Clasa energetică actuală", clsBefore],
        ["Emisii CO₂ [kgCO₂/m²·an]", co2Before.toFixed(1)],
        ["Consum final total [kWh/an]", instSummary?.qf_total?.toFixed(0) || "-"],
      ],
    });

    y = sectionTitle(doc, "3. PERFORMANȚĂ ENERGETICĂ — DUPĂ REABILITARE (SCENARIUL B)", y);
    const epAfter  = rehabComparison?.epAfter  || (epBefore  * 0.60);
    const co2After = rehabComparison?.co2After || (co2Before * 0.60);
    const redEP    = epBefore > 0 ? ((1 - epAfter / epBefore) * 100).toFixed(1) : "—";
    const redCO2   = co2Before > 0 ? ((1 - co2After / co2Before) * 100).toFixed(1) : "—";
    const clsAfter = epAfter <= 100 ? "A/B" : epAfter <= 200 ? "C" : "D";

    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["Energie primară EP după [kWh/m²·an]", epAfter.toFixed(1)],
        ["Clasa energetică după reabilitare", clsAfter],
        ["Reducere EP față de situația inițială", `${redEP} %`],
        ["Emisii CO₂ după [kgCO₂/m²·an]", co2After.toFixed(1)],
        ["Reducere emisii GHG", `${redCO2} %`],
        ["Prag minim PNRR reducere EP (C5-I2)", "≥ 30%"],
        ["Conformitate prag minim", parseFloat(redEP) >= 30 ? "✓ CONFORM" : "✗ NECONFORM"],
      ],
    });

    y = sectionTitle(doc, "4. ELIGIBILITATE AXE PNRR", y);
    const epRedPct = parseFloat(redEP) || 0;
    const eligI2 = epRedPct >= 30;
    const eligI3 = epRedPct >= 50 && epAfter <= 150;
    y = autoTable(doc, {
      startY: y,
      head: [["Axă PNRR", "Condiție", "Valoare calculată", "Eligibil"]],
      body: [
        ["C5-I2 — Blocuri de locuințe", "Reducere EP ≥ 30%", `${redEP}%`, eligI2 ? "✓ DA" : "✗ NU"],
        ["C5-I3 — Clădiri publice",     "Reducere EP ≥ 50% și EP_final ≤ 150 kWh/m²·an", `${redEP}% / ${epAfter.toFixed(0)} kWh/m²`, eligI3 ? "✓ DA" : "✗ NU"],
        ["nZEB (EPBD 2024/1275)",        "EP_adj ≤ prag nZEB zonă", renewSummary?.ep_adjusted_m2?.toFixed(0) || "-", "—"],
      ],
    });

    y = sectionTitle(doc, "5. DATE AUDITOR ATESTAT", y);
    y = auditorBlock(doc, auditor, y);

    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("Acest document a fost generat automat de Zephren și trebuie semnat de auditor energetic atestat MDLPA (AE Ici sau AE IIci).", 10, y + 3);
    doc.text("Se completează conform cerințelor AFM / ghidului solicitantului PNRR C5 în vigoare la data depunerii dosarului.", 10, y + 7);

    addPageFooter(doc, "PNRR C5-I2/I3 | Mc 001-2022 | EPBD 2024/1275 | HG 1369/2022", page);

    const addr = (building?.address || "pnrr").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportPNRR_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generatePNRRReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. RAPORT ACUSTIC (pct. 21)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport acustic (pct. 21)
 * Conformitate C125 / SR EN ISO 717 per element.
 * @returns {Promise<Blob|null>}
 */
export async function generateAcousticReport({
  building, opaqueElements, acousticData, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT ACUSTIC — SR EN ISO 717";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT DE CALCUL IZOLARE ACUSTICĂ", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("SR EN ISO 717-1:2013 | NP 008-97 | SR 6156:2016 | C125-2013", w / 2, y, { align: "center" }); y += 10;

    y = sectionTitle(doc, "1. DATE CLĂDIRE", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
      body: [
        ["Adresă", `${building?.address || "-"}, ${building?.city || "-"}`],
        ["Categorie funcțională", building?.category || "-"],
        ["Nivel zgomot exterior", acousticData?.externalNoise ? `${acousticData.externalNoise} dB(A)` : "Nespecificat"],
        ["Metodă calcul", "Legea masei + corecții — SR EN ISO 717-1 / SR EN 12354-1"],
      ],
    });

    // Verdict global
    const results  = acousticData?.results || [];
    const allOK    = acousticData?.allConform !== false && results.every(r => r.conform !== false);
    const nonConformCount = results.filter(r => r.conform === false).length;

    y = sectionTitle(doc, "2. VERDICT GLOBAL", y);
    doc.setFillColor(...(allOK ? COL_OK : COL_ERR));
    doc.roundedRect(10, y, w - 20, 12, 3, 3, "F");
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    const verdictText = allOK
      ? "✓ CONFORM ACUSTIC — toate elementele respectă Rw minim NP 008-97"
      : `✗ NECONFORM ACUSTIC — ${nonConformCount} element(e) sub Rw minim NP 008-97`;
    doc.text(verdictText, w / 2, y + 8, { align: "center" });
    y += 18;

    y = sectionTitle(doc, "3. VERIFICARE ELEMENTE — Rw IZOLARE AERIANĂ [dB]", y);
    const rwRows = results.map(r => [
      r.name || "-",
      r.type || "-",
      r.Rw?.toString() || "-",
      r.Rw_req?.toString() || "-",
      r.massPerM2 ? `${r.massPerM2} kg/m²` : "-",
      r.conform ? "✓ OK" : `✗ deficit ${r.deficit || "?"} dB`,
    ]);
    y = autoTable(doc, {
      startY: y,
      head: [["Element", "Tip", "Rw calc. [dB]", "Rw min [dB]", "Masă sup.", "Conform"]],
      body: rwRows.length ? rwRows : [["Nu există date", "", "", "", "", ""]],
      columnStyles: {
        2: { halign: "center" },
        3: { halign: "center" },
        5: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const val = data.cell.text?.[0] || "";
          if (val.startsWith("✗")) data.cell.styles.textColor = COL_ERR;
          else if (val.startsWith("✓")) data.cell.styles.textColor = COL_OK;
        }
      },
    });

    // Cerințe minime tabel de referință
    y = sectionTitle(doc, "4. CERINȚE MINIME Rw [dB] — NP 008-97", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Tip element", "Rezidențial", "Birouri", "Școli", "Spitale", "Hoteluri"]],
      body: [
        ["Pereți exteriori (PE)",          "38", "35", "38", "45", "40"],
        ["Pereți despărțitori (PD)",        "53", "42", "45", "50", "52"],
        ["Planșee interioare (PL_INT)",     "52", "45", "48", "52", "54"],
        ["Ferestre/uși exterioare (FE)",    "30", "28", "32", "35", "32"],
      ],
    });

    // Recomandări pentru elemente neconforme
    const recs = acousticData?.recommendations || results.filter(r => !r.conform).map(r =>
      `${r.name}: deficit ${r.deficit || "?"} dB — adăugați izolație fonică sau strat GC dublu`
    );
    if (recs.length) {
      y = sectionTitle(doc, "5. RECOMANDĂRI ÎMBUNĂTĂȚIRE", y);
      y = autoTable(doc, {
        startY: y,
        body: recs.map((r, i) => [`${i + 1}.`, r]),
        columnStyles: { 0: { cellWidth: 8, halign: "center" } },
      });
    }

    y = sectionTitle(doc, "6. DATE AUDITOR", y);
    auditorBlock(doc, auditor, y);
    addPageFooter(doc, "SR EN ISO 717-1:2013 | NP 008-97 | SR 6156:2016 | SR EN 12354-1", page);

    const addr = (building?.address || "acustic").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportAcustic_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateAcousticReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. RAPORT CONDENS GLASER (pct. 22)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport condens Glaser detaliat (pct. 22)
 * Include: diagnoză per element, risk de mucegai, recomandări,
 * bilanț condensare/evaporare lunar.
 * @returns {Promise<Blob|null>}
 */
export async function generateGlaserReport({
  building, opaqueElements, glaserResults, selectedClimate, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT CONDENS GLASER — ISO 13788";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT DIFUZIE VAPORI ȘI CONDENS INTERSTIȚIAL", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("SR EN ISO 13788:2012 | NP 057-02 | Metodă Glaser extinsă", w / 2, y, { align: "center" }); y += 10;

    y = sectionTitle(doc, "1. PARAMETRI DE CALCUL", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" } },
      body: [
        ["Clădire / Adresă", `${building?.address || "-"}, ${building?.city || "-"}`],
        ["Stație climatică", `${selectedClimate?.name || "-"} — Zona ${selectedClimate?.zone || "-"}`],
        ["Temperatură interioară de calcul θi", "20 °C"],
        ["Umiditate relativă interioară φi", "50%"],
        ["Temperaturi exterioare", "Date lunare stație climatică"],
        ["Metodă", "SR EN ISO 13788:2012 — calcul lunar (12 luni)"],
      ],
    });

    // Rezultate per element
    const elements = glaserResults || [];
    let hasAnyCondensation = false;
    elements.forEach(el => { if (el.hasCondensation || el.maxCumulative > 0) hasAnyCondensation = true; });

    // Verdict global
    y = sectionTitle(doc, "2. VERDICT GLOBAL CONDENS", y);
    doc.setFillColor(...(hasAnyCondensation ? [245, 158, 11] : COL_OK));
    doc.roundedRect(10, y, w - 20, 12, 3, 3, "F");
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    const vText = hasAnyCondensation
      ? "⚠ ATENȚIE — Risc de condensare interstițială detectat la unul sau mai multe elemente"
      : "✓ FAVORABIL — Nu există risc semnificativ de condensare interstițială";
    doc.text(vText, w / 2, y + 8, { align: "center" });
    y += 18;

    y = sectionTitle(doc, "3. DIAGNOZĂ PER ELEMENT", y);
    const diagRows = elements.map(el => {
      const verdict = el.annualOk !== false && !el.hasCondensation
        ? "✓ OK" : el.annualOk === false ? "✗ ACUMULARE" : "⚠ CONDENS";
      return [
        el.name || el.type || "-",
        el.maxCumulative ? `${el.maxCumulative} g/m²` : "0",
        el.winterAccum   ? `${el.winterAccum} g/m²`   : "0",
        el.summerEvap    ? `${el.summerEvap} g/m²`     : "0",
        verdict,
      ];
    });
    y = autoTable(doc, {
      startY: y,
      head: [["Element", "Max acumulat", "Acum. iarnă", "Evap. vară", "Verdict NP 057-02"]],
      body: diagRows.length ? diagRows : [["Nu există date de calcul Glaser", "", "", "", ""]],
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = data.cell.text?.[0] || "";
          if (val.startsWith("✗")) data.cell.styles.textColor = COL_ERR;
          else if (val.startsWith("✓")) data.cell.styles.textColor = COL_OK;
          else data.cell.styles.textColor = [245, 158, 11];
        }
      },
    });

    // Detaliu lunar pentru primul element cu condens (cel mai relevant)
    const problematic = elements.find(el => el.hasCondensation || el.maxCumulative > 0);
    if (problematic?.monthly) {
      y = sectionTitle(doc, `4. BILANȚ LUNAR — ${problematic.name || "Element cu condens"}`, y);
      const mRows = problematic.monthly.map(m => [
        m.month,
        m.tExt?.toFixed(1) ?? "-",
        m.condensation?.toString() ?? "0",
        m.evaporation?.toString() ?? "0",
        m.cumulative?.toString() ?? "0",
        m.condensation > 0 ? "⚠" : "—",
      ]);
      y = autoTable(doc, {
        startY: y,
        head: [["Lună", "θe [°C]", "Cond. [g/m²]", "Evap. [g/m²]", "Cumul [g/m²]", "Status"]],
        body: mRows,
      });
    }

    // Risc mucegai
    y = sectionTitle(doc, "5. RISC MUCEGAI ȘI RECOMANDĂRI", y);
    const riskRows = elements.map(el => {
      let risk = "Scăzut";
      let rec  = "Nicio acțiune necesară";
      if (el.maxCumulative > 500) { risk = "Ridicat"; rec = "Adăugați barieră vapori côté cald, creșteți termoizolarea"; }
      else if (el.maxCumulative > 100) { risk = "Mediu"; rec = "Verificați detaliile de execuție, considerați membrană difuzie"; }
      return [el.name || "-", risk, rec];
    });
    y = autoTable(doc, {
      startY: y,
      head: [["Element", "Risc mucegai", "Recomandare"]],
      body: riskRows.length ? riskRows : [["—", "—", "Nu există elemente analizate"]],
      columnStyles: { 2: { cellWidth: 90 } },
    });

    y = sectionTitle(doc, "6. DATE AUDITOR", y);
    auditorBlock(doc, auditor, y);
    addPageFooter(doc, "SR EN ISO 13788:2012 | NP 057-02 | SR EN ISO 10211 | C107-2005", page);

    const addr = (building?.address || "glaser").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportGlaser_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateGlaserReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. RAPORT MULTI-SCENARIU COMPARATIV (pct. 23)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport multi-scenariu comparativ (pct. 23)
 * Tabel comparativ: scenariu / EP / clasă / cost / economie / recuperare / CO₂
 * Grafic bar SVG text simplu pentru EP per scenariu.
 * @returns {Promise<Blob|null>}
 */
export async function generateMultiScenarioReport({
  building, instSummary, scenarios, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT SCENARII REABILITARE COMPARATIV";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("ANALIZĂ COMPARATIVĂ SCENARII DE REABILITARE", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(`Clădire: ${building?.address || "-"}, ${building?.city || "-"} | An construcție: ${building?.yearBuilt || "-"}`, w / 2, y, { align: "center" }); y += 10;

    // Situație inițială
    const epBase = instSummary?.ep_total_m2 || 0;
    y = sectionTitle(doc, "1. SITUAȚIE INIȚIALĂ (referință)", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["EP inițial", `${epBase.toFixed(1)} kWh/(m²·an)`],
        ["CO₂ inițial", `${instSummary?.co2_total_m2?.toFixed(1) || "-"} kgCO₂/(m²·an)`],
        ["Clasă energetică inițială", epBase <= 100 ? "A/B" : epBase <= 200 ? "C" : epBase <= 300 ? "D" : "E/F"],
        ["Consum anual total", `${instSummary?.qf_total?.toFixed(0) || "-"} kWh/an`],
      ],
    });

    // Tabel comparativ scenarii
    y = sectionTitle(doc, "2. TABEL COMPARATIV SCENARII", y);
    const scenRows = (scenarios || []).map((sc, i) => {
      const redPct = epBase > 0 ? ((1 - (sc.ep || 0) / epBase) * 100).toFixed(1) : "—";
      const cls = (sc.ep || 0) <= 100 ? "A/B" : (sc.ep || 0) <= 200 ? "C" : "D+";
      return [
        sc.name || `Scenariu ${i + 1}`,
        sc.ep?.toFixed(1) || "-",
        cls,
        `${redPct}%`,
        sc.cost ? `${sc.cost.toLocaleString("ro-RO")} RON` : "-",
        sc.annualSaving ? `${sc.annualSaving.toLocaleString("ro-RO")} RON/an` : "-",
        sc.payback ? `${sc.payback} ani` : "-",
        sc.co2reduction ? `${sc.co2reduction.toFixed(0)} kgCO₂/an` : "-",
      ];
    });

    y = autoTable(doc, {
      startY: y,
      head: [["Scenariu", "EP [kWh/m²·an]", "Clasă", "Red. EP", "Cost inv. [RON]", "Economie [RON/an]", "Rec. [ani]", "Red. CO₂"]],
      body: scenRows.length ? scenRows : [["Nu există scenarii definite", "", "", "", "", "", "", ""]],
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold", fontSize: 7.5 },
    });

    // Grafic bar ASCII/text: EP per scenariu
    if ((scenarios || []).length > 0) {
      y = sectionTitle(doc, "3. VIZUALIZARE EP — ÎNAINTE ȘI DUPĂ PER SCENARIU", y);
      doc.setFontSize(8); doc.setTextColor(...COL_G);

      const barMaxWidth = w - 60;
      const allEPs = [epBase, ...(scenarios || []).map(s => s.ep || 0)];
      const maxEP = Math.max(...allEPs, 1);

      // Bara referință
      const bh = 7; // bar height mm
      const labelW = 40;
      const scaleF = barMaxWidth / maxEP;

      doc.setFont(undefined, "normal");
      const drawBar = (label, ep, color, yPos) => {
        doc.setFontSize(7); doc.setTextColor(...COL_G);
        doc.text(label.slice(0, 20), 10, yPos + bh - 1);
        doc.setFillColor(...color);
        doc.rect(10 + labelW, yPos, Math.max(2, ep * scaleF), bh - 1, "F");
        doc.setFontSize(6.5); doc.setTextColor(...COL_H);
        doc.text(`${ep.toFixed(0)} kWh/m²`, 10 + labelW + Math.max(2, ep * scaleF) + 1, yPos + bh - 2);
        return yPos + bh + 2;
      };

      y = drawBar("Referință (actual)", epBase, [180, 30, 30], y);
      (scenarios || []).forEach((sc, i) => {
        const shade = Math.max(20, 160 - i * 25);
        y = drawBar(sc.name || `Scenariu ${i + 1}`, sc.ep || 0, [shade, shade + 60, shade + 30], y);
      });
      y += 4;

      // Linie prag nZEB
      doc.setDrawColor(251, 191, 36); doc.setLineWidth(0.5);
      const nzebEP = 100;
      const nzebX = 10 + labelW + nzebEP * scaleF;
      if (nzebX < w - 10) {
        doc.line(nzebX, y - (scenarios.length + 1) * 9 - 4, nzebX, y - 4);
        doc.setFontSize(6); doc.setTextColor(251, 191, 36);
        doc.text("nZEB", nzebX + 1, y - 4);
      }
    }

    // Recomandare scenariu optim
    y = sectionTitle(doc, "4. SCENARIU RECOMANDAT", y + 4);
    if ((scenarios || []).length > 0) {
      const best = scenarios.reduce((a, b) => {
        const scoreA = (a.ep ? 1 / a.ep : 0) + (a.payback ? 1 / a.payback * 0.5 : 0);
        const scoreB = (b.ep ? 1 / b.ep : 0) + (b.payback ? 1 / b.payback * 0.5 : 0);
        return scoreB > scoreA ? b : a;
      });
      y = autoTable(doc, {
        startY: y,
        columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
        body: [
          ["Scenariu recomandat", best.name || "-"],
          ["EP final", `${best.ep?.toFixed(1) || "-"} kWh/(m²·an)`],
          ["Investiție totală", best.cost ? `${best.cost.toLocaleString("ro-RO")} RON` : "-"],
          ["Timp recuperare", best.payback ? `${best.payback} ani` : "-"],
          ["Economie anuală", best.annualSaving ? `${best.annualSaving.toLocaleString("ro-RO")} RON/an` : "-"],
          ["Motivare selecție", "Raport optim EP_final / cost_investiție / timp_recuperare"],
        ],
      });
    } else {
      doc.setFontSize(8); doc.setTextColor(...COL_G);
      doc.text("Nu există scenarii introduse pentru comparație.", 15, y + 5);
      y += 12;
    }

    y = sectionTitle(doc, "5. DATE AUDITOR", y);
    auditorBlock(doc, auditor, y);
    addPageFooter(doc, "Mc 001-2022 | EPBD 2024/1275 | EN 15459 (analiză cost-eficiență) | ISO 52000-1", page);

    const addr = (building?.address || "scenarii").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportScenarii_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateMultiScenarioReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. RAPORT GWP / AMPRENTĂ CO₂ (pct. 26)
// ═══════════════════════════════════════════════════════════════

/**
 * Raport GWP / amprenta CO₂ (pct. 26)
 * Include: GWP per material (A1-A3, A4, C3-C4, D),
 * total CO₂ embodied per element, comparație cu benchmark,
 * recomandări materiale alternative cu GWP mai mic.
 * @returns {Promise<Blob|null>}
 */
export async function generateGWPReport({
  building, opaqueElements, glazingElements, gwpDetailed, auditor,
  download = true,
}) {
  try {
    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT GWP — AMPRENTĂ CO₂ ÎNCORPORAT";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT EVALUARE GWP — CICLUL DE VIAȚĂ", w / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("SR EN 15978:2011 | EN 15804:2019 | ISO 14040/14044 | EPBD 2024/1275", w / 2, y, { align: "center" }); y += 10;

    y = sectionTitle(doc, "1. DATE CLĂDIRE ȘI PARAMETRI CALCUL", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 65, fontStyle: "bold" } },
      body: [
        ["Adresă", `${building?.address || "-"}, ${building?.city || "-"}`],
        ["Suprafață utilă Au", `${building?.areaUseful || "-"} m²`],
        ["Durată de viață de calcul", `${gwpDetailed?.lifetime || 50} ani`],
        ["Metodologie", "SR EN 15978:2011 — module A1-A3, A4, A5, B2-B4, C3-C4, D"],
        ["Benchmark GWP nZEB (referință EPBD)", `≤ ${gwpDetailed?.benchmarkNZEB || 15} kgCO₂eq/(m²·an)`],
      ],
    });

    // Rezumat module lifecycle
    y = sectionTitle(doc, "2. REZUMAT GWP PE MODULE CICLU DE VIAȚĂ [kgCO₂eq]", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Modul", "Descriere", "GWP [kgCO₂eq]", "% din total"]],
      body: (() => {
        const gd = gwpDetailed || {};
        const tot = Math.abs(gd.totalGWP || 1);
        return [
          ["A1-A3", "Producție materiale (fabricație, materii prime, energie)",
            (gd.gwp_A1A3 || 0).toFixed(0), `${(Math.abs(gd.gwp_A1A3 || 0) / tot * 100).toFixed(1)}%`],
          ["A4",    "Transport până la șantier",
            (gd.gwp_A4 || 0).toFixed(0), `${(Math.abs(gd.gwp_A4 || 0) / tot * 100).toFixed(1)}%`],
          ["A5",    "Execuție, instalare, deșeuri șantier",
            (gd.gwp_A5 || 0).toFixed(0), `${(Math.abs(gd.gwp_A5 || 0) / tot * 100).toFixed(1)}%`],
          ["B2-B3", "Mentenanță și reparații (durata de viață)",
            (gd.gwp_B2B3 || 0).toFixed(0), `${(Math.abs(gd.gwp_B2B3 || 0) / tot * 100).toFixed(1)}%`],
          ["B4",    "Înlocuire materiale cu durabilitate < durată viață",
            (gd.gwp_B4 || 0).toFixed(0), `${(Math.abs(gd.gwp_B4 || 0) / tot * 100).toFixed(1)}%`],
          ["C3-C4", "Dezasamblare, eliminare, depozitare deșeuri",
            (gd.gwp_C || 0).toFixed(0), `${(Math.abs(gd.gwp_C || 0) / tot * 100).toFixed(1)}%`],
          ["D",     "Credit reciclare (carbon negativ: lemn, oțel reciclat)",
            `(${Math.abs(gd.gwp_D || 0).toFixed(0)})`, `credit`],
          ["TOTAL", "GWP ciclu complet de viață",
            (gd.totalGWP || 0).toFixed(0), "100%"],
        ];
      })(),
      footStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold" },
    });

    // Indicatori normalizați
    y = sectionTitle(doc, "3. INDICATORI GWP NORMALIZAȚI", y);
    const gpY = gwpDetailed?.gwpPerM2Year || 0;
    const benchmark = gwpDetailed?.benchmarkNZEB || 15;
    const vsB = gpY > 0 ? ((gpY / benchmark - 1) * 100).toFixed(1) : "—";
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["GWP total ciclu viață",                `${gwpDetailed?.totalGWP?.toFixed(0) || "-"} kgCO₂eq`],
        ["GWP per m² suprafață utilă",           `${gwpDetailed?.gwpPerM2?.toFixed(1) || "-"} kgCO₂eq/m²`],
        ["GWP per m² per an",                    `${gpY.toFixed(1)} kgCO₂eq/(m²·an)`],
        ["Clasă GWP (EN 15978)",                 gwpDetailed?.classification || "-"],
        ["Benchmark nZEB (EPBD ref.)",           `${benchmark} kgCO₂eq/(m²·an)`],
        ["Față de benchmark",                    parseFloat(vsB) > 0 ? `+${vsB}% (PESTE benchmark)` : `${vsB}% (sub benchmark)`],
      ],
    });

    // Detaliu top materiale GWP
    if (gwpDetailed?.details?.length) {
      y = sectionTitle(doc, "4. TOP MATERIALE DUPĂ GWP A1-A3", y);
      y = autoTable(doc, {
        startY: y,
        head: [["Material", "Masă [kg]", "Factor GWP [kgCO₂eq/kg]", "GWP A1-A3 [kgCO₂eq]"]],
        body: gwpDetailed.details.map(d => [
          d.material || "-",
          d.mass?.toFixed(0) || "-",
          d.gwpFactor?.toFixed(3) || "-",
          d.gwp_a1a3?.toFixed(0) || "-",
        ]),
      });
    }

    // Recomandări materiale alternative
    y = sectionTitle(doc, "5. RECOMANDĂRI MATERIALE ALTERNATIVE — GWP REDUS", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Material existent", "Alternativă GWP redus", "GWP alternativă", "Reducere estimată"]],
      body: [
        ["EPS (polistiren expandat)", "Fibră de lemn / Plută expandată",   "~0.8 kgCO₂eq/kg", "~60–70%"],
        ["XPS (polistiren extrudat)", "Vată minerală de stâncă",           "~0.7 kgCO₂eq/kg", "~50–65%"],
        ["Beton armat obișnuit",      "Beton cu zgură / cenușă zburătoare","~0.08 kgCO₂eq/kg","~30–40%"],
        ["Oțel laminat la cald",      "Oțel reciclat (EAF)",              "~0.5 kgCO₂eq/kg", "~50–60%"],
        ["Cărămidă arsă",             "Cărămidă cu goluri mari",           "~0.18 kgCO₂eq/kg","~30%"],
        ["PVC ferestre",              "Lemn stratificat FSC",              "~0.5 kgCO₂eq/kg", "~50%"],
      ],
      styles: { fontSize: 7.5 },
    });

    // Concluzie și conformitate EPBD
    y = sectionTitle(doc, "6. CONCLUZIE CONFORMITATE EPBD 2024/1275", y);
    const epbdConform = gpY <= benchmark;
    doc.setFillColor(...(epbdConform ? COL_OK : COL_ERR));
    doc.roundedRect(10, y, w - 20, 12, 3, 3, "F");
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    const concl = epbdConform
      ? `✓ CONFORM — GWP ${gpY.toFixed(1)} kgCO₂eq/(m²·an) ≤ benchmark ${benchmark} kgCO₂eq/(m²·an)`
      : `✗ NECONFORM — GWP ${gpY.toFixed(1)} kgCO₂eq/(m²·an) > benchmark ${benchmark} kgCO₂eq/(m²·an)`;
    doc.text(concl, w / 2, y + 8, { align: "center" });
    y += 18;

    y = sectionTitle(doc, "7. DATE AUDITOR", y);
    auditorBlock(doc, auditor, y);
    addPageFooter(doc, "SR EN 15978:2011 | EN 15804:2019+A2 | ISO 14040 | EPBD 2024/1275 | EN 15804", page);

    const addr = (building?.address || "gwp").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `RaportGWP_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateGWPReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 8. CPE ANEXA 1 + ANEXA 2 — Ord. MDLPA 16/2023 (format oficial PDF)
// ═══════════════════════════════════════════════════════════════
// Anexa 1: Date generale + tehnice + instalații + indicator energetic
// Anexa 2: Recomandări prioritizate pentru îmbunătățirea performanței
//
// Conformitate: Mc 001-2022, Ord. MDLPA 16/2023 art. 7-12
// Referințe U: Tabel 2.4 (rezidențial nZEB) / Tabel 2.7 (nerezidențial nZEB)
// Font: Helvetica (WinAnsi) — suportă diacritice românești ă â î ș ț
// ═══════════════════════════════════════════════════════════════

// ── Format numeric românesc ───────────────────────────────────
function fmtRo(v, d = 1) {
  if (v == null || isNaN(v)) return "—";
  const n = parseFloat(v);
  if (!isFinite(n)) return "—";
  return n.toFixed(d).replace(".", ",");
}

// ── Clasare energetică EP → etichetă + culoare ────────────────
function epToClass(ep) {
  if (ep == null || isNaN(ep)) return { label: "—", color: [136, 136, 136] };
  if (ep <= 50)  return { label: "A+", color: [21, 128, 61]  };
  if (ep <= 100) return { label: "A",  color: [34, 197, 94]  };
  if (ep <= 150) return { label: "B",  color: [132, 204, 22] };
  if (ep <= 200) return { label: "C",  color: [234, 179, 8]  };
  if (ep <= 300) return { label: "D",  color: [249, 115, 22] };
  if (ep <= 400) return { label: "E",  color: [239, 68, 68]  };
  if (ep <= 500) return { label: "F",  color: [127, 29, 29]  };
  return { label: "G", color: [68, 0, 0] };
}

const ELEMENT_LABELS = {
  PE:"Perete exterior", PR:"Perete la rost", PS:"Perete subsol",
  PT:"Planșeu terasă", PP:"Planșeu pod neîncălzit", PB:"Planșeu subsol neîncălzit",
  PL:"Placă pe sol", SE:"Planșeu bow-window",
};

// ── Lookup sigur în listă de categorii id/label ──────────────
function lbl(list, id, fallback) {
  if (!list || !id) return fallback || id || "—";
  const item = list.find(x => x.id === id);
  return item?.label || fallback || id;
}

// ── Aspect paginare: asigură spațiu minim sau trece pe pagina nouă
function ensureSpace(doc, y, needed, title, audName, today) {
  const hPage = doc.internal.pageSize.getHeight();
  if (y + needed > hPage - 18) {
    doc.addPage();
    addPageHeader(doc, title, audName, today);
    return 26;
  }
  return y;
}

// ── Randare Anexa 1 pe un doc deja inițializat ────────────────
function _renderAnexa1(doc, startPageNum, opts) {
  const {
    building, selectedClimate, auditor,
    heating, cooling, ventilation, lighting, acm,
    solarThermal, photovoltaic, heatPump, biomass,
    instSummary, renewSummary, envelopeSummary,
    opaqueElements, glazingElements,
    epFinal, co2Final, rer,
    getNzebEpMax, bacsClass,
    HEAT_SOURCES, ACM_SOURCES, COOLING_SYSTEMS, VENTILATION_TYPES, LIGHTING_TYPES,
    BUILDING_CATEGORIES,
    calcOpaqueR,
  } = opts;

  const w = doc.internal.pageSize.getWidth();
  const title = "CPE — ANEXA 1 (Date generale și tehnice)";
  const audName = auditor?.name || "";
  const today = dateRO();
  let page = startPageNum || 1;

  const Au = parseFloat(building?.areaUseful) || 0;
  const V = parseFloat(building?.volume) || 0;
  const Aenv = parseFloat(building?.areaEnvelope) || 0;
  const catLabel = lbl(BUILDING_CATEGORIES, building?.category, building?.category);
  const epRefMax = getNzebEpMax ? getNzebEpMax(building?.category, selectedClimate?.zone) : 148;
  const nzebOk = (epFinal || 0) <= epRefMax && (rer || 0) >= 30;
  const cls = epToClass(epFinal);
  const co2Cls = epToClass(co2Final);
  const isRes = ["RI", "RC", "RA"].includes(building?.category);

  // ══════ PAGINA 1: Identificare + Clasă energetică ══════
  addPageHeader(doc, title, audName, today);
  let y = 26;

  // Titlu mare
  doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
  doc.text("CERTIFICAT DE PERFORMANȚĂ ENERGETICĂ", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_A);
  doc.text("ANEXA 1 — Date generale și tehnice", w / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(7); doc.setTextColor(...COL_G);
  doc.text("Conform Mc 001-2022 și Ordinul MDLPA nr. 16/2023", w / 2, y, { align: "center" });
  y += 10;

  // ── Badge clasă energetică (stânga, text valori dreapta cu spațiu generos) ──
  const badgeW = 55, badgeH = 35;
  const badgeX = 12;
  const badgeCenterX = badgeX + badgeW / 2;
  doc.setFillColor(...cls.color);
  doc.roundedRect(badgeX, y, badgeW, badgeH, 4, 4, "F");
  doc.setFontSize(32); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
  doc.text(cls.label, badgeCenterX, y + 22, { align: "center" });
  doc.setFontSize(7); doc.setFont(undefined, "normal");
  doc.text("CLASA ENERGETICĂ", badgeCenterX, y + 30, { align: "center" });

  // ── Valori numerice lângă badge ──
  const valueX = badgeX + badgeW + 8;
  doc.setTextColor(...COL_H); doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text(`EP specific: ${fmtRo(epFinal, 1)} kWh/(m²·an)`, valueX, y + 8);
  doc.text(`EP referință nZEB: ${fmtRo(epRefMax, 1)} kWh/(m²·an)`, valueX, y + 14);
  doc.text(`Emisii CO₂: ${fmtRo(co2Final, 1)} kg/(m²·an)  |  Clasa: ${co2Cls.label}`, valueX, y + 20);
  doc.text(`RER (regenerabil): ${fmtRo(rer, 1)} %`, valueX, y + 26);
  doc.setFont(undefined, "bold"); doc.setFontSize(10);
  doc.setTextColor(...(nzebOk ? COL_OK : COL_ERR));
  doc.text(`Conformitate nZEB: ${nzebOk ? "DA ✓" : "NU ✗"}`, valueX, y + 33);
  doc.setTextColor(...COL_H);
  y += badgeH + 10;

  // ── Secțiunea I: Date generale clădire ──
  y = sectionTitle(doc, "I. DATE GENERALE CLĂDIRE", y);
  y = autoTable(doc, {
    startY: y,
    columnStyles: { 0: { cellWidth: 65, fontStyle: "bold" } },
    body: [
      ["Adresă", [building?.address, building?.city, building?.county && `jud. ${building.county}`, building?.postal].filter(Boolean).join(", ") || "—"],
      ["Destinație", catLabel],
      ["Categorie (cod)", building?.category || "—"],
      ["Structură constructivă", building?.structure || "—"],
      ["An construcție", building?.yearBuilt || "—"],
      ["An ultima renovare", building?.yearRenov || "—"],
      ["Regim înălțime", building?.floors || "—"],
      ["Număr unități/apartamente", building?.units || "—"],
      ["Număr scări", building?.stairs || "—"],
      ["Scop certificare", (building?.scopCpe || "Vânzare")[0].toUpperCase() + (building?.scopCpe || "ânzare").slice(1)],
      ["Localitate climatică", selectedClimate?.name || building?.city || "—"],
      ["Zona climatică", selectedClimate?.zone ? `Zona ${selectedClimate.zone}` : "—"],
      ["Temperatură exterioară calcul θe", selectedClimate?.theta_e != null ? `${selectedClimate.theta_e} °C` : "—"],
      ["Grade-zile încălzire GZ", selectedClimate?.gz || "—"],
    ],
  });

  addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | SR EN ISO 52000-1", page);

  // ══════ PAGINA 2: Geometrie + U-values ══════
  doc.addPage(); page++;
  addPageHeader(doc, title, audName, today);
  y = 26;

  // ── Secțiunea II: Date tehnice geometrie ──
  y = sectionTitle(doc, "II. DATE TEHNICE — GEOMETRIE ȘI ANVELOPĂ", y);
  y = autoTable(doc, {
    startY: y,
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Arie utilă de referință", fmtRo(Au, 2), "m²"],
      ["Volum încălzit V", fmtRo(V, 2), "m³"],
      ["Arie anvelopă exterioară Aenv", fmtRo(Aenv, 2), "m²"],
      ["Raport A/V", V > 0 ? fmtRo(Aenv / V, 3) : "—", "m⁻¹"],
      ["Perimetru fundație P", fmtRo(building?.perimeter, 2), "m"],
      ["Înălțime etaj curent", fmtRo(building?.heightFloor, 2), "m"],
      ["Test permeabilitate la 50 Pa (n50)", fmtRo(building?.n50, 2), "h⁻¹"],
      ["Coeficient global pierderi G", envelopeSummary?.G != null ? fmtRo(envelopeSummary.G, 3) : "—", "W/(m³·K)"],
      ["Coef. transfer termic prin transmisie H_T", envelopeSummary?.Ht != null ? fmtRo(envelopeSummary.Ht, 2) : "—", "W/K"],
      ["Coef. transfer termic prin ventilare H_V", instSummary?.Hv != null ? fmtRo(instSummary.Hv, 2) : "—", "W/K"],
      ["Număr schimburi aer infiltrații n_inf", instSummary?.n_inf != null ? fmtRo(instSummary.n_inf, 3) : "—", "h⁻¹"],
      ["Constantă de timp termică τ", instSummary?.tau != null ? fmtRo(instSummary.tau, 1) : "—", "h"],
    ],
  });

  // ── Secțiunea II.b: Tabel U per element (calculat vs referință) ──
  if ((opaqueElements?.length || 0) > 0 || (glazingElements?.length || 0) > 0) {
    y = ensureSpace(doc, y, 60, title, audName, today);
    y = sectionTitle(doc, `II.b. COEFICIENȚI U — VERIFICARE FAȚĂ DE REFERINȚĂ (Tabel ${isRes ? "2.4" : "2.7"} Mc 001-2022)`, y);
    const uRef = isRes ? U_REF_RES : U_REF_NRES;
    const uRefGlaz = isRes ? U_REF_GLAZING.nzeb_res : U_REF_GLAZING.nzeb_nres;

    const elRows = [];
    (opaqueElements || []).forEach(el => {
      const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : null;
      const uCalc = r?.u || parseFloat(el.U) || 0;
      const uRefVal = uRef[el.type];
      const ok = uRefVal == null || uCalc <= uRefVal;
      elRows.push([
        el.type || "—",
        el.name || ELEMENT_LABELS[el.type] || el.type || "—",
        fmtRo(el.area, 2),
        fmtRo(uCalc, 3),
        uRefVal != null ? fmtRo(uRefVal, 2) : "—",
        uRefVal != null ? (ok ? "✓ Conform" : `✗ +${fmtRo(uCalc - uRefVal, 3)}`) : "—",
      ]);
    });
    (glazingElements || []).forEach(el => {
      const uCalc = parseFloat(el.u) || parseFloat(el.U) || 0;
      const ok = uCalc <= uRefGlaz;
      elRows.push([
        "VM",
        el.name || el.type || "Vitraj/Tâmplărie",
        fmtRo(el.area, 2),
        fmtRo(uCalc, 3),
        fmtRo(uRefGlaz, 2),
        ok ? "✓ Conform" : `✗ +${fmtRo(uCalc - uRefGlaz, 3)}`,
      ]);
    });

    y = autoTable(doc, {
      startY: y,
      head: [["Cod", "Denumire element", "A [m²]", "U calc [W/m²K]", "U ref [W/m²K]", "Verificare"]],
      body: elRows.length ? elRows : [["—", "Nu sunt elemente introduse", "—", "—", "—", "—"]],
      columnStyles: {
        0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
        2: { halign: "right", cellWidth: 20 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "center", cellWidth: 30 },
      },
      didParseCell: (hook) => {
        if (hook.column.index === 5 && hook.section === "body") {
          const txt = String(hook.cell.raw || "");
          if (txt.startsWith("✓")) hook.cell.styles.textColor = COL_OK;
          else if (txt.startsWith("✗")) hook.cell.styles.textColor = COL_ERR;
        }
      },
    });
  }

  addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | SR EN ISO 6946", page);

  // ══════ PAGINA 3: Instalații ══════
  doc.addPage(); page++;
  addPageHeader(doc, title, audName, today);
  y = 26;

  y = sectionTitle(doc, "III. INSTALAȚII TEHNICE", y);

  // Încălzire
  y = autoTable(doc, {
    startY: y,
    head: [["III.a. Instalație încălzire", "", ""]],
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Sursă de energie", lbl(HEAT_SOURCES, heating?.source, heating?.source), ""],
      ["Randament generare η_gen", heating?.eta_gen || "—", "—"],
      ["Randament emitere η_em", heating?.eta_em || "—", "—"],
      ["Randament distribuție η_d", heating?.eta_dist || heating?.eta_d || "—", "—"],
      ["Temperatură setpoint θ_int", `${heating?.theta_int || 20} °C`, ""],
      ["Sistem control", heating?.control || "termostat simplu", ""],
    ],
  });

  // ACM
  y = ensureSpace(doc, y, 45, title, audName, today);
  y = autoTable(doc, {
    startY: y,
    head: [["III.b. Preparare apă caldă menajeră", "", ""]],
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Sursă ACM", lbl(ACM_SOURCES, acm?.source, acm?.source), ""],
      ["Consum specific zilnic", fmtRo(acm?.dailyLiters, 0), "L/zi"],
      ["Temperatură ACM", `${acm?.theta_acm || 60} °C`, ""],
      ["Randament global ACM", acm?.eta || "—", "—"],
      ["Solar termic (fracție)", solarThermal?.enabled ? `${fmtRo(solarThermal?.fraction, 0)} %` : "Nu există", ""],
    ],
  });

  // Răcire
  y = ensureSpace(doc, y, 40, title, audName, today);
  y = autoTable(doc, {
    startY: y,
    head: [["III.c. Climatizare / răcire", "", ""]],
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Sistem răcire", cooling?.hasCooling ? lbl(COOLING_SYSTEMS, cooling?.system, cooling?.system) : "Nu există", ""],
      ...(cooling?.hasCooling ? [
        ["EER", cooling?.eer || "—", "—"],
        ["SEER", cooling?.seer || "—", "—"],
        ["Temperatură setpoint", `${cooling?.theta_set || 26} °C`, ""],
      ] : []),
    ],
  });

  // Ventilare
  y = ensureSpace(doc, y, 35, title, audName, today);
  y = autoTable(doc, {
    startY: y,
    head: [["III.d. Ventilare", "", ""]],
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Tip ventilare", lbl(VENTILATION_TYPES, ventilation?.type, ventilation?.type), ""],
      ["Rată de schimb aer", fmtRo(ventilation?.ach, 2), "h⁻¹"],
      ...(ventilation?.hrEfficiency ? [["Eficiență recuperare căldură", `${ventilation.hrEfficiency}`, "%"]] : []),
    ],
  });

  // Iluminat
  y = ensureSpace(doc, y, 35, title, audName, today);
  y = autoTable(doc, {
    startY: y,
    head: [["III.e. Iluminat artificial", "", ""]],
    columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 2: { cellWidth: 22, halign: "center" } },
    body: [
      ["Tip iluminat", lbl(LIGHTING_TYPES, lighting?.type, lighting?.type), ""],
      ["Densitate putere instalată", fmtRo(lighting?.pDensity, 1), "W/m²"],
      ["LENI (Lighting Energy Numeric Indicator)", fmtRo(instSummary?.leni, 1), "kWh/(m²·an)"],
      ["Control iluminat", lighting?.control || "manual", ""],
    ],
  });

  // Regenerabile
  y = ensureSpace(doc, y, 50, title, audName, today);
  const renewRows = [];
  if (solarThermal?.enabled) renewRows.push(["Solar termic", `${fmtRo(solarThermal.area, 1)} m² — η₀=${solarThermal.eta0 || "—"}`]);
  if (photovoltaic?.enabled) renewRows.push(["Fotovoltaic", `${fmtRo(photovoltaic.area, 1)} m² / ${fmtRo(photovoltaic.peakPower, 2)} kWp`]);
  if (heatPump?.enabled)     renewRows.push(["Pompă de căldură", `COP=${heatPump.cop || "—"} / SCOP=${heatPump.scopHeating || "—"}`]);
  if (biomass?.enabled)      renewRows.push(["Biomasă", biomass.type || "lemn/peleți"]);
  if (renewRows.length === 0) renewRows.push(["Regenerabile", "Nu există surse regenerabile locale"]);
  y = autoTable(doc, {
    startY: y,
    head: [["III.f. Surse de energie regenerabilă", ""]],
    columnStyles: { 0: { cellWidth: 85, fontStyle: "bold" } },
    body: renewRows,
  });

  // BACS & SRI
  if (bacsClass) {
    const bacsFactors = { A: 0.80, B: 0.93, C: 1.00, D: 1.10 };
    const bacsLabels = {
      A: "Clasă A — Înalt performantă (HP-BACS cu buclă continuă de control)",
      B: "Clasă B — Avansată (funcții de monitorizare continuă)",
      C: "Clasă C — Standard (referință EN 15232-1)",
      D: "Clasă D — Nonautomatizată (fără BACS)",
    };
    y = ensureSpace(doc, y, 30, title, audName, today);
    y = autoTable(doc, {
      startY: y,
      head: [["III.g. Automatizare BACS (EN 15232-1)", ""]],
      columnStyles: { 0: { cellWidth: 85, fontStyle: "bold" } },
      body: [
        ["Clasa BACS determinată", `${bacsClass} — factor ${bacsFactors[bacsClass] || "—"}`],
        ["Descriere", bacsLabels[bacsClass] || "—"],
      ],
    });
  }

  addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | EN 15232-1 | SR EN 15193", page);

  // ══════ PAGINA 4: Indicator energetic + date auditor ══════
  doc.addPage(); page++;
  addPageHeader(doc, title, audName, today);
  y = 26;

  y = sectionTitle(doc, "IV. INDICATOR DE PERFORMANȚĂ ENERGETICĂ", y);

  // Tabel consumuri finale + EP per utilitate
  y = autoTable(doc, {
    startY: y,
    head: [["Utilitate", "Q_final [kWh/an]", "EP [kWh/(m²·an)]", "CO₂ [kg/(m²·an)]"]],
    body: [
      ["Încălzire",   fmtRo(instSummary?.qf_h, 0), fmtRo(instSummary?.ep_h, 1), fmtRo(instSummary?.co2_h, 2)],
      ["Apă caldă",   fmtRo(instSummary?.qf_w, 0), fmtRo(instSummary?.ep_w, 1), fmtRo(instSummary?.co2_w, 2)],
      ["Răcire",      fmtRo(instSummary?.qf_c, 0), fmtRo(instSummary?.ep_c, 1), fmtRo(instSummary?.co2_c, 2)],
      ["Ventilare",   fmtRo(instSummary?.qf_v, 0), fmtRo(instSummary?.ep_v, 1), fmtRo(instSummary?.co2_v, 2)],
      ["Iluminat",    fmtRo(instSummary?.qf_l, 0), fmtRo(instSummary?.ep_l, 1), fmtRo(instSummary?.co2_l, 2)],
    ],
    foot: [[
      "TOTAL",
      fmtRo(instSummary?.qf_total, 0),
      fmtRo(instSummary?.ep_total_m2, 1),
      fmtRo(instSummary?.co2_total_m2, 2),
    ]],
    footStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
    },
  });

  // Tabel conformitate
  y = autoTable(doc, {
    startY: y,
    head: [["Indicator de conformitate", "Valoare", "Referință", "Verificare"]],
    body: [
      ["EP specific final (cu SRE ajustat)", fmtRo(epFinal, 1) + " kWh/(m²·an)", fmtRo(epRefMax, 1) + " (nZEB)", epFinal <= epRefMax ? "✓ CONFORM" : "✗ NECONFORM"],
      ["Clasa energetică EP", cls.label, "Cls A (nZEB)", ["A+", "A"].includes(cls.label) ? "✓ CONFORM" : "✗ DE MAJORAT"],
      ["Rata de energie regenerabilă RER", fmtRo(rer, 1) + " %", "≥ 30 % (nZEB)", (rer || 0) >= 30 ? "✓ CONFORM" : "✗ NECONFORM"],
      ["Emisii CO₂ specifice", fmtRo(co2Final, 1) + " kg/(m²·an)", "—", "—"],
      ["Conformitate globală nZEB", nzebOk ? "DA" : "NU", "Mc 001-2022 §2.4", nzebOk ? "✓ CONFORM" : "✗ NECONFORM"],
    ],
    columnStyles: {
      0: { cellWidth: 75, fontStyle: "bold" },
      3: { halign: "center", cellWidth: 32 },
    },
    didParseCell: (hook) => {
      if (hook.column.index === 3 && hook.section === "body") {
        const txt = String(hook.cell.raw || "");
        if (txt.includes("✓")) hook.cell.styles.textColor = COL_OK;
        else if (txt.includes("✗")) hook.cell.styles.textColor = COL_ERR;
      }
    },
  });

  // Date auditor
  y = ensureSpace(doc, y, 40, title, audName, today);
  y = sectionTitle(doc, "V. DATE IDENTIFICARE AUDITOR ENERGETIC", y);
  y = autoTable(doc, {
    startY: y,
    columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    body: [
      ["Nume și prenume auditor", auditor?.name || "—"],
      ["Atestat nr. (serie/număr)", auditor?.atestat || "—"],
      ["Grad atestare", auditor?.grade || "—"],
      ["Firma / Organizație", auditor?.company || "—"],
      ["Contact", [auditor?.phone, auditor?.email].filter(Boolean).join(" · ") || "—"],
      ["Cod unic MDLPA (registru)", auditor?.codUnicMDLPA || auditor?.mdlpaCode || "—"],
      ["Valabilitate certificat", `${auditor?.validityYears || 10} ani de la data emiterii`],
      ["Data elaborării", auditor?.date ? new Date(auditor.date).toLocaleDateString("ro-RO") : dateRO()],
    ],
  });

  // Zonă semnătură/ștampilă (placeholder cu chenar)
  y += 5;
  y = ensureSpace(doc, y, 30, title, audName, today);
  const sigBoxW = 80, sigBoxH = 22;
  doc.setDrawColor(200); doc.setLineWidth(0.3);
  doc.rect(10, y, sigBoxW, sigBoxH);
  doc.rect(w - 10 - sigBoxW, y, sigBoxW, sigBoxH);
  doc.setFontSize(7); doc.setTextColor(...COL_G);
  doc.text("Semnătură auditor", 10 + sigBoxW / 2, y + sigBoxH + 3, { align: "center" });
  doc.text("Ștampilă profesională", w - 10 - sigBoxW / 2, y + sigBoxH + 3, { align: "center" });

  // Încearcă încorporare foto/ștampilă dacă e data URL
  if (auditor?.photo && typeof auditor.photo === "string" && auditor.photo.startsWith("data:image/")) {
    try {
      const fmt = auditor.photo.includes("jpeg") || auditor.photo.includes("jpg") ? "JPEG" : "PNG";
      doc.addImage(auditor.photo, fmt, w - 10 - sigBoxW + 5, y + 2, sigBoxW - 10, sigBoxH - 4, undefined, "FAST");
    } catch { /* ignore bad image */ }
  }

  addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | SR EN ISO 52000-1", page);

  return page; // pentru wrapper — ultima pagină utilizată
}

// ── Randare Anexa 2 pe un doc deja inițializat ────────────────
function _renderAnexa2(doc, startPageNum, opts) {
  const {
    building, auditor, envelopeSummary, glazingElements, opaqueElements,
    instSummary, heating, solarThermal, photovoltaic, calcOpaqueR,
    rehabScenarios, financialAnalysis,
  } = opts;

  const w = doc.internal.pageSize.getWidth();
  const title = "CPE — ANEXA 2 (Recomandări de îmbunătățire)";
  const audName = auditor?.name || "";
  const today = dateRO();
  let page = startPageNum || 1;

  addPageHeader(doc, title, audName, today);
  let y = 26;

  doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
  doc.text("ANEXA 2 — RECOMANDĂRI DE ÎMBUNĂTĂȚIRE", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
  doc.text("Măsuri prioritizate pentru reducerea consumului energetic și a emisiilor CO₂", w / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text(`${building?.address || ""} · ${building?.city || ""} · ${auditor?.date ? new Date(auditor.date).toLocaleDateString("ro-RO") : dateRO()}`, w / 2, y, { align: "center" });
  y += 10;

  // ── Preambul normativ ──
  y = sectionTitle(doc, "1. CADRU NORMATIV", y);
  doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
  const preamblu = [
    "Recomandările de mai jos sunt elaborate în conformitate cu Mc 001-2022 și Ord. MDLPA 16/2023,",
    "având drept scop atingerea sau apropierea de nivelul de performanță nZEB (Mc 001-2022 §2.4).",
    "Măsurile sunt prioritizate pe trei nivele (înaltă / medie / scăzută) în funcție de impactul estimat",
    "asupra indicelui EP specific și de raportul cost/beneficiu estimat.",
  ];
  preamblu.forEach(ln => { doc.text(ln, 10, y); y += 4; });
  y += 4;

  // ── Generare măsuri din analiză ──
  const measures = [];
  // A1 — Termoizolare pereți exteriori (G ridicat)
  if (envelopeSummary?.G > 0.8) {
    measures.push({
      code: "A1", priority: "Înaltă",
      title: "Termoizolare pereți exteriori (sistem ETICS)",
      detail: `Coeficientul G = ${fmtRo(envelopeSummary.G, 3)} W/(m³·K) depășește pragul 0.8 W/(m³·K). Se recomandă aplicarea unui sistem ETICS (External Thermal Insulation Composite System) cu EPS grafitat sau vată minerală, grosime 10-15 cm, conform SR EN 13499 / SR EN 13500.`,
      savings: "15-25 % consum încălzire",
      costRef: "180-250 RON/m²",
      payback: "8-12 ani",
    });
  }
  // A2 — Tâmplărie
  if ((glazingElements || []).some(g => parseFloat(g.u) > 2.5)) {
    measures.push({
      code: "A2", priority: "Înaltă",
      title: "Înlocuire tâmplărie exterioară cu sisteme performante",
      detail: "Există vitraje cu U > 2.5 W/(m²·K). Se recomandă înlocuirea cu tâmplărie PVC sau aluminiu cu rupere de punte termică, echipată cu geam termoizolant cu strat Low-E (U_w ≤ 1.1 W/(m²·K)), conform SR EN 14351-1.",
      savings: "8-15 % consum încălzire",
      costRef: "450-750 RON/m²",
      payback: "10-15 ani",
    });
  }
  // A3 — Planșeu superior
  if ((opaqueElements || []).some(el => {
    const r = calcOpaqueR ? calcOpaqueR(el.layers, el.type) : null;
    return r && r.u > 0.5 && ["PT", "PP"].includes(el.type);
  })) {
    measures.push({
      code: "A3", priority: "Medie",
      title: "Termoizolare planșeu superior (terasă sau pod neîncălzit)",
      detail: "Termoizolația existentă la planșeul superior este insuficientă (U > 0.5 W/(m²·K)). Recomandare: aplicare strat nou de vată minerală sau XPS ≥ 20 cm, cu asigurarea barierei de vapori corespunzătoare (SR EN ISO 6946).",
      savings: "8-12 % consum încălzire",
      costRef: "90-140 RON/m²",
      payback: "6-10 ani",
    });
  }
  // B1 — Înlocuire cazan cu pompă de căldură
  if (heating?.source && String(heating.source).toUpperCase().includes("GAZ")) {
    measures.push({
      code: "B1", priority: "Medie",
      title: "Înlocuire sursă încălzire cu pompă de căldură",
      detail: "Sursa actuală (cazan cu combustibil fosil) are randament inferior pompelor de căldură moderne. Recomandare: instalare pompă de căldură aer-apă cu SCOP ≥ 3.0 (SR EN 14825), cu rezervor tampon și integrare cu ACM.",
      savings: "20-40 % energie primară",
      costRef: "18.000-35.000 RON",
      payback: "8-14 ani",
    });
  }
  // B2 — Solar termic
  if (!solarThermal?.enabled) {
    measures.push({
      code: "B2", priority: "Medie",
      title: "Instalare colectoare solare termice pentru ACM",
      detail: "Nu există sistem solar termic. Recomandare: instalare 4-8 m² colectoare plane sau cu tuburi vidate, orientare sud ±30°, înclinație 30-45°. Fracție solară estimată: 40-60 % din consumul anual ACM.",
      savings: "5-10 % energie primară totală",
      costRef: "7.000-14.000 RON",
      payback: "8-12 ani",
    });
  }
  // C1 — Fotovoltaic
  if (!photovoltaic?.enabled) {
    measures.push({
      code: "C1", priority: "Scăzută",
      title: "Instalare sistem fotovoltaic pentru autoconsum",
      detail: "Sistem PV de 3-5 kWp, orientare sud ±30°, pentru producere locală energie electrică. Acoperă tipic 30-50 % din consumul electric anual al unei clădiri rezidențiale. Eligibil pentru scheme suport (Casa Verde Fotovoltaice).",
      savings: "8-15 % emisii CO₂",
      costRef: "15.000-25.000 RON",
      payback: "7-10 ani",
    });
  }
  // D1 — Iluminat
  if ((instSummary?.leni || 0) > 15) {
    measures.push({
      code: "D1", priority: "Medie",
      title: "Modernizare sistem iluminat — LED + control inteligent",
      detail: `LENI actual = ${fmtRo(instSummary?.leni, 1)} kWh/(m²·an) — ridicat. Înlocuire corpuri luminoase cu LED (eficacitate ≥ 100 lm/W), integrare senzori prezență și reglaj luminozitate conform SR EN 15193-1.`,
      savings: "5-10 % consum electric",
      costRef: "50-120 RON/m²",
      payback: "3-6 ani",
    });
  }

  // ── Dacă nu sunt recomandări (performanță bună) ──
  if (measures.length === 0) {
    y = sectionTitle(doc, "2. CONCLUZIE", y);
    doc.setFillColor(...COL_OK);
    doc.roundedRect(10, y, w - 20, 14, 3, 3, "F");
    doc.setFontSize(10); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text("✓ Performanța energetică este satisfăcătoare.", w / 2, y + 6, { align: "center" });
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text("Nu sunt necesare măsuri prioritare de îmbunătățire.", w / 2, y + 11, { align: "center" });
    y += 22;
  } else {
    // ── Tabel sintetic măsuri ──
    y = sectionTitle(doc, "2. TABEL SINTETIC MĂSURI RECOMANDATE", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Cod", "Denumire măsură", "Prioritate", "Economie est.", "Cost ref.", "Payback"]],
      body: measures.map(m => [m.code, m.title, m.priority, m.savings, m.costRef, m.payback]),
      columnStyles: {
        0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
        2: { halign: "center", cellWidth: 22 },
        3: { cellWidth: 38 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22, halign: "center" },
      },
      didParseCell: (hook) => {
        if (hook.column.index === 2 && hook.section === "body") {
          const txt = String(hook.cell.raw || "");
          if (txt === "Înaltă")  hook.cell.styles.textColor = COL_ERR;
          else if (txt === "Medie")  hook.cell.styles.textColor = [217, 119, 6];
          else if (txt === "Scăzută") hook.cell.styles.textColor = COL_OK;
        }
      },
    });

    // ── Fișe detaliate per măsură ──
    y = ensureSpace(doc, y, 10, title, audName, today);
    y = sectionTitle(doc, "3. FIȘE DETALIATE ALE MĂSURILOR", y);
    const priColor = { "Înaltă": COL_ERR, "Medie": [217, 119, 6], "Scăzută": COL_OK };
    measures.forEach((m) => {
      y = ensureSpace(doc, y, 38, title, audName, today);
      // Bar colorat cu cod + titlu
      doc.setFillColor(...(priColor[m.priority] || COL_G));
      doc.rect(10, y, 6, 6, "F");
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
      doc.text(`${m.code} — ${m.title}`, 18, y + 4.5);
      doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
      doc.text(`Prioritate: ${m.priority}`, w - 10, y + 4.5, { align: "right" });
      y += 8;

      // Descriere (wrap la ~100 caractere)
      doc.setFontSize(8); doc.setTextColor(...COL_G);
      const lines = doc.splitTextToSize(m.detail, w - 22);
      doc.text(lines, 10, y);
      y += lines.length * 3.8 + 1;

      // Sumar economic (mini-tabel inline)
      y = autoTable(doc, {
        startY: y,
        body: [[
          `Economie estimată: ${m.savings}`,
          `Cost orientativ: ${m.costRef}`,
          `Payback: ${m.payback}`,
        ]],
        theme: "plain",
        styles: { fontSize: 7, textColor: COL_H, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: "wrap" }, 1: { cellWidth: "wrap" }, 2: { cellWidth: "wrap" },
        },
      });
      y += 2;
      doc.setDrawColor(230); doc.setLineWidth(0.2);
      doc.line(10, y, w - 10, y);
      y += 4;
    });
  }

  // ── Scenarii de reabilitare (dacă există din Step 7) ──
  if (rehabScenarios && (Array.isArray(rehabScenarios) ? rehabScenarios.length : Object.keys(rehabScenarios).length)) {
    y = ensureSpace(doc, y, 50, title, audName, today);
    y = sectionTitle(doc, "4. SCENARII DE REABILITARE (Step 7 — audit)", y);
    const scenArr = Array.isArray(rehabScenarios)
      ? rehabScenarios
      : Object.entries(rehabScenarios).map(([id, s]) => ({ id, ...s }));
    y = autoTable(doc, {
      startY: y,
      head: [["Scenariu", "Cost investiție [RON]", "Economie anuală [RON]", "Payback simplu [ani]"]],
      body: scenArr.map(s => [
        s.label || s.id || "—",
        fmtRo(s.totalCost, 0),
        fmtRo(s.annualCostSaving, 0),
        fmtRo(s.payback, 1),
      ]),
      columnStyles: {
        1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "center" },
      },
    });
  }

  // ── Analiză financiară (dacă există) ──
  if (financialAnalysis && financialAnalysis.NPV != null) {
    y = ensureSpace(doc, y, 35, title, audName, today);
    y = sectionTitle(doc, "5. ANALIZĂ FINANCIARĂ (VNA / IRR)", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 85, fontStyle: "bold" } },
      body: [
        ["Valoare Netă Actualizată (VNA)", `${fmtRo(financialAnalysis.NPV, 0)} RON`],
        ["Rata internă de rentabilitate (IRR)", `${fmtRo(financialAnalysis.IRR, 2)} %`],
        ["Payback simplu", `${fmtRo(financialAnalysis.paybackSimple, 1)} ani`],
        ["Payback actualizat", `${fmtRo(financialAnalysis.paybackDiscounted, 1)} ani`],
        ["Rata de actualizare aplicată", `${fmtRo(financialAnalysis.discountRate, 2)} %`],
        ["Perioada de analiză", `${financialAnalysis.period || "—"} ani`],
      ],
    });
  }

  // ── Concluzii + semnătură auditor ──
  y = ensureSpace(doc, y, 50, title, audName, today);
  y = sectionTitle(doc, "6. CONCLUZII ȘI SEMNĂTURĂ AUDITOR", y);
  doc.setFontSize(8); doc.setTextColor(...COL_G);
  const concText = measures.length > 0
    ? `Se recomandă implementarea etapizată a măsurilor de mai sus, începând cu cele de prioritate înaltă (A1, A2), urmate de cele cu payback scurt. Ordinea optimă depinde de bugetul disponibil și de eligibilitatea pentru scheme de finanțare (PNRR, Casa Verde, Programul Național de Reabilitare Termică).`
    : `Performanța energetică a clădirii este satisfăcătoare conform criteriilor Mc 001-2022. Se recomandă monitorizarea periodică a consumurilor și întreținerea preventivă a instalațiilor pentru menținerea performanței.`;
  const concLines = doc.splitTextToSize(concText, w - 20);
  doc.text(concLines, 10, y);
  y += concLines.length * 3.8 + 5;

  y = auditorBlock(doc, auditor, y);

  // Zonă semnătură
  y = ensureSpace(doc, y, 28, title, audName, today);
  const sigW = 80, sigH = 22;
  doc.setDrawColor(200); doc.setLineWidth(0.3);
  doc.rect(10, y, sigW, sigH);
  doc.rect(w - 10 - sigW, y, sigW, sigH);
  doc.setFontSize(7); doc.setTextColor(...COL_G);
  doc.text("Semnătură auditor", 10 + sigW / 2, y + sigH + 3, { align: "center" });
  doc.text("Ștampilă profesională", w - 10 - sigW / 2, y + sigH + 3, { align: "center" });
  if (auditor?.photo && typeof auditor.photo === "string" && auditor.photo.startsWith("data:image/")) {
    try {
      const fmt = auditor.photo.includes("jpeg") || auditor.photo.includes("jpg") ? "JPEG" : "PNG";
      doc.addImage(auditor.photo, fmt, w - 10 - sigW + 5, y + 2, sigW - 10, sigH - 4, undefined, "FAST");
    } catch { /* ignore */ }
  }

  addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | EPBD 2024/1275", page);

  return page;
}

/**
 * CPE Anexa 1 — Date generale și tehnice (PDF oficial).
 * Document de 4 pagini A4 conform Ord. MDLPA 16/2023 art. 7-10.
 *
 * Așteaptă toate propsurile folosite de componenta <CpeAnexa />.
 * Vezi `src/components/CpeAnexa.jsx` pentru semnătura completă.
 *
 * @returns {Promise<Blob|null>} — Blob dacă `download=false`, null altfel
 */
export async function generateCPEAnexa1(opts) {
  try {
    const doc = await initDoc();
    _renderAnexa1(doc, 1, opts);
    const addr = (opts?.building?.address || "anexa1").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `CPE_Anexa1_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, opts?.download);
  } catch (e) {
    throw new Error(`generateCPEAnexa1: ${e.message}`);
  }
}

/**
 * CPE Anexa 2 — Recomandări de îmbunătățire (PDF oficial).
 * Măsuri prioritizate conform Mc 001-2022 + analiză financiară dacă e disponibilă.
 *
 * @returns {Promise<Blob|null>}
 */
export async function generateCPEAnexa2(opts) {
  try {
    const doc = await initDoc();
    _renderAnexa2(doc, 1, opts);
    const addr = (opts?.building?.address || "anexa2").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `CPE_Anexa2_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, opts?.download);
  } catch (e) {
    throw new Error(`generateCPEAnexa2: ${e.message}`);
  }
}

/**
 * CPE Anexa 1 + Anexa 2 — PDF combinat (recomandat pentru livrare oficială).
 * Paginație continuă: Anexa 1 (pag. 1-4) + Anexa 2 (pag. 5+).
 *
 * @returns {Promise<Blob|null>}
 */
export async function generateCPEAnexe(opts) {
  try {
    const doc = await initDoc();
    const lastPage = _renderAnexa1(doc, 1, opts);
    doc.addPage();
    _renderAnexa2(doc, lastPage + 1, opts);
    const addr = (opts?.building?.address || "anexe").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `CPE_Anexa1+2_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, opts?.download);
  } catch (e) {
    throw new Error(`generateCPEAnexe: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// RAPORT DE CONFORMARE nZEB
// Conform art. 6 alin. (1) lit. c) din Ord. MDLPA 348/2026 +
// conținut-cadru Mc 001-2022 §2.4 + Legea 238/2024 Art.6
//
// Raportul atestă încadrarea clădirii în categoria celor cu
// consum de energie aproape egal cu zero (nZEB) și este atribut
// exclusiv al auditorului energetic Grad I (AE Ici).
// ═══════════════════════════════════════════════════════════════

/**
 * Raport de conformare nZEB — document oficial pentru clădiri
 * în fază de proiectare sau după renovare majoră.
 *
 * @param {object} opts
 *   @param {object} opts.building       Date clădire (cf. state energy-calc)
 *   @param {object} opts.selectedClimate Date climatice localitate
 *   @param {object} opts.instSummary    Rezultat calcul instalații
 *   @param {object} opts.renewSummary   Rezultat bilanț regenerabile
 *   @param {object} opts.envelopeSummary Sumar anvelopă (G, Ht, Hv)
 *   @param {array}  opts.opaqueElements Elemente opace (pentru listă scurtă)
 *   @param {array}  opts.glazingElements Elemente vitrate
 *   @param {object} opts.heating        Config încălzire
 *   @param {object} opts.cooling        Config răcire
 *   @param {object} opts.ventilation    Config ventilare
 *   @param {object} opts.lighting       Config iluminat
 *   @param {object} opts.acm            Config ACM
 *   @param {object} opts.solarThermal   Config solar termic
 *   @param {object} opts.photovoltaic   Config PV
 *   @param {object} opts.heatPump       Config pompă de căldură
 *   @param {object} opts.biomass        Config biomasă
 *   @param {object} opts.auditor        Auditor { name, atestat, grade, company, ... }
 *   @param {string} [opts.projectPhase] "proiectare" | "audit" | "renovare"
 *   @param {boolean} [opts.download=true]
 * @returns {Promise<Blob|null>}
 */
export async function generateNZEBConformanceReport(opts) {
  try {
    const {
      building, selectedClimate, instSummary, renewSummary, envelopeSummary,
      opaqueElements = [], glazingElements = [],
      heating, cooling, ventilation, lighting, acm,
      solarThermal, photovoltaic, heatPump, biomass,
      auditor, projectPhase = "proiectare",
      download = true,
    } = opts || {};

    // Import dinamic modulul de verificare nZEB
    const { checkNZEBCompliance } = await import("../calc/nzeb-check.js");
    const compliance = checkNZEBCompliance({
      building, climate: selectedClimate,
      renewSummary, instSummary, auditor, projectPhase,
    });

    if (!compliance) {
      throw new Error("Date insuficiente pentru verificarea nZEB (verificați categoria clădirii, zona climatică și rezultatele calculului energetic)");
    }

    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT DE CONFORMARE nZEB";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    const Au = parseFloat(building?.areaUseful) || 0;
    const V = parseFloat(building?.volume) || 0;
    const Aenv = parseFloat(building?.areaEnvelope) || 0;

    // ═══════════════════════════════════════════════════════════
    // PAGINA 1 — COPERTĂ + IDENTIFICARE CLĂDIRE + VERDICT
    // ═══════════════════════════════════════════════════════════
    addPageHeader(doc, title, audName, today);
    let y = 26;

    // Titlu mare
    doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT DE CONFORMARE nZEB", w / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_A);
    doc.text("Clădire cu consum de energie aproape egal cu zero", w / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(8); doc.setTextColor(...COL_G);
    doc.text("Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026  •  Mc 001-2022 §2.4  •  Legea 238/2024 Art.6", w / 2, y, { align: "center" });
    y += 10;

    // ── Badge VERDICT mare (central) ──
    const verdictW = 120, verdictH = 32;
    const verdictX = w / 2 - verdictW / 2;
    const verdictColor = compliance.compliant ? COL_OK : COL_ERR;
    doc.setFillColor(...verdictColor);
    doc.roundedRect(verdictX, y, verdictW, verdictH, 3, 3, "F");
    doc.setFontSize(20); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(compliance.verdictShort, w / 2, y + 14, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    doc.text(
      compliance.compliant
        ? "Clădirea SE ÎNCADREAZĂ în categoria nZEB"
        : "Clădirea NU SE ÎNCADREAZĂ în categoria nZEB",
      w / 2, y + 24, { align: "center" }
    );
    y += verdictH + 10;

    // ── Auditor + validare competență ──
    doc.setTextColor(...COL_H);
    if (!compliance.auditorValid) {
      doc.setFillColor(255, 243, 205); // warning amber light
      doc.roundedRect(10, y, w - 20, 15, 2, 2, "F");
      doc.setFontSize(8); doc.setTextColor(146, 64, 14);
      doc.text("⚠ " + compliance.auditorNote, 13, y + 6, { maxWidth: w - 26 });
      y += 18;
    }

    // ── Secțiunea I: Date identificare clădire ──
    y = sectionTitle(doc, "I. IDENTIFICARE CLĂDIRE", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      body: [
        ["Denumire / adresă", [building?.address, building?.city, building?.county && `jud. ${building.county}`].filter(Boolean).join(", ") || "—"],
        ["Destinație / categorie", `${compliance.categoryLabel} (cod ${building?.category || "—"})`],
        ["Fază proiect", projectPhase === "proiectare" ? "Proiectare — clădire nouă" : projectPhase === "renovare" ? "Renovare majoră" : "Evaluare în exploatare"],
        ["An construcție", building?.yearBuilt || "—"],
        ["Regim înălțime", building?.floors || "—"],
        ["Suprafață utilă Au", `${Au.toFixed(1)} m²`],
        ["Volum util V", `${V.toFixed(1)} m³`],
        ["Suprafață anvelopă Aenv", Aenv ? `${Aenv.toFixed(1)} m²` : "—"],
        ["Raport Aenv/V", Aenv && V ? `${(Aenv / V).toFixed(3)} m⁻¹` : "—"],
        ["Localitate climatică", selectedClimate?.name || building?.city || "—"],
        ["Zona climatică Mc 001", selectedClimate?.zone ? `Zona ${selectedClimate.zone}` : "—"],
        ["Temperatură exterioară calcul θₑ", selectedClimate?.theta_e != null ? `${selectedClimate.theta_e} °C` : "—"],
      ],
    });

    // Auditor
    y = sectionTitle(doc, "II. AUDITOR ENERGETIC (GRAD I)", y);
    y = auditorBlock(doc, auditor, y);

    addPageFooter(doc, "Mc 001-2022 | Legea 238/2024 | Ord. MDLPA 348/2026 Art.6", page);

    // ═══════════════════════════════════════════════════════════
    // PAGINA 2 — INDICATORI ENERGETICI CALCULAȚI
    // ═══════════════════════════════════════════════════════════
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "III. INDICATORI ENERGETICI CALCULAȚI", y);

    // Tabel consumuri specifice pe destinație
    const epH = instSummary?.ep_h_m2 || 0;
    const epC = instSummary?.ep_c_m2 || 0;
    const epW = instSummary?.ep_w_m2 || 0;
    const epV = instSummary?.ep_v_m2 || 0;
    const epL = instSummary?.ep_l_m2 || 0;
    const epTotal = instSummary?.ep_total_m2 || 0;
    const epRenew = renewSummary?.ep_renew_m2 || 0;
    const epFinal = renewSummary?.ep_adjusted_m2 || epTotal;

    y = autoTable(doc, {
      startY: y,
      head: [["Destinație consum", "EP [kWh/(m²·an)]", "Pondere [%]"]],
      body: [
        ["Încălzire spații", epH.toFixed(1), epTotal ? ((epH / epTotal) * 100).toFixed(1) : "—"],
        ["Răcire spații", epC.toFixed(1), epTotal ? ((epC / epTotal) * 100).toFixed(1) : "—"],
        ["Preparare apă caldă menajeră (ACM)", epW.toFixed(1), epTotal ? ((epW / epTotal) * 100).toFixed(1) : "—"],
        ["Ventilare mecanică", epV.toFixed(1), epTotal ? ((epV / epTotal) * 100).toFixed(1) : "—"],
        ["Iluminat (nerezidențial)", epL.toFixed(1), epTotal ? ((epL / epTotal) * 100).toFixed(1) : "—"],
        [{ content: "EP total (înainte de regenerabile)", styles: { fontStyle: "bold" } }, { content: epTotal.toFixed(1), styles: { fontStyle: "bold" } }, "100.0"],
        [{ content: "Aport surse regenerabile (-)", styles: { textColor: [22, 163, 74] } }, { content: `-${epRenew.toFixed(1)}`, styles: { textColor: [22, 163, 74] } }, "—"],
        [{ content: "EP specific final (cu regenerabile)", styles: { fontStyle: "bold", fillColor: [240, 253, 244] } }, { content: epFinal.toFixed(1), styles: { fontStyle: "bold", fillColor: [240, 253, 244] } }, "—"],
      ],
    });

    // Indicatori globali
    y = sectionTitle(doc, "IV. INDICATORI GLOBALI ANVELOPĂ ȘI INSTALAȚII", y);
    const rer = compliance.rer;
    const rerOnsite = compliance.rerOnsite;
    const co2Final = renewSummary?.co2_adjusted_m2 || instSummary?.co2_total_m2 || 0;

    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" } },
      body: [
        ["Coeficient global pierderi termice G", envelopeSummary?.G != null ? `${envelopeSummary.G.toFixed(3)} W/(m³·K)` : "—"],
        ["Pierderi prin transmisie Ht", envelopeSummary?.Ht != null ? `${envelopeSummary.Ht.toFixed(1)} W/K` : "—"],
        ["Pierderi prin ventilare Hv", envelopeSummary?.Hv != null ? `${envelopeSummary.Hv.toFixed(1)} W/K` : "—"],
        ["Număr elemente opace", `${opaqueElements.length}`],
        ["Număr elemente vitrate", `${glazingElements.length}`],
        ["Energie primară totală EP", `${epFinal.toFixed(1)} kWh/(m²·an)`],
        ["Emisii CO₂ specifice", `${co2Final.toFixed(1)} kg CO₂/(m²·an)`],
        ["Pondere surse regenerabile RER (total)", `${rer.toFixed(1)} %`],
        ["Pondere surse regenerabile la fața locului", `${rerOnsite.toFixed(1)} %`],
      ],
    });

    addPageFooter(doc, "Mc 001-2022 §5 Bilanț energetic global", page);

    // ═══════════════════════════════════════════════════════════
    // PAGINA 3 — VERIFICARE CONFORMARE nZEB (CORE)
    // ═══════════════════════════════════════════════════════════
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "V. VERIFICAREA CERINȚELOR MINIME nZEB", y);

    doc.setFontSize(8); doc.setTextColor(...COL_G); doc.setFont(undefined, "italic");
    doc.text(
      "Conform art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026, raportul de conformare nZEB verifică încadrarea",
      10, y
    );
    y += 4;
    doc.text(
      "clădirii în pragurile Mc 001-2022 Tabel 2.10a (EP) și Legea 238/2024 Art.6 (RER total + on-site).",
      10, y
    );
    y += 6;
    doc.setFont(undefined, "normal"); doc.setTextColor(...COL_H);

    // Tabel verificări — 3 criterii cu verdict colorat
    const checkRows = compliance.checks.map(c => [
      c.label,
      `${c.value} ${c.unit || ""}`.trim(),
      `${c.target} ${c.unit || ""}`.trim(),
      c.ok ? "✓ CONFORM" : "✗ NECONFORM",
    ]);

    y = autoTable(doc, {
      startY: y,
      head: [["Criteriu", "Valoare calculată", "Prag minim/maxim", "Verdict"]],
      body: checkRows,
      didParseCell: function (data) {
        if (data.column.index === 3 && data.cell.section === "body") {
          const text = data.cell.raw;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = String(text).includes("✓") ? COL_OK : COL_ERR;
          data.cell.styles.halign = "center";
        }
      },
    });

    // Verdict final central — mare, vizibil
    y += 4;
    const finalVerdictH = 24;
    const finalVerdictColor = compliance.compliant ? COL_OK : COL_ERR;
    doc.setFillColor(...finalVerdictColor);
    doc.roundedRect(10, y, w - 20, finalVerdictH, 3, 3, "F");
    doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(
      compliance.compliant
        ? "✓ CLĂDIREA SE ÎNCADREAZĂ ÎN CATEGORIA nZEB"
        : "✗ CLĂDIREA NU SE ÎNCADREAZĂ ÎN CATEGORIA nZEB",
      w / 2, y + 10, { align: "center" }
    );
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    const verdictDetail = compliance.compliant
      ? `EP = ${compliance.ep} ≤ ${compliance.epMax} kWh/(m²·an)  •  RER = ${compliance.rer}% ≥ ${compliance.rerMin}%  •  RER on-site = ${compliance.rerOnsite}% ≥ ${compliance.rerOnsiteMin}%`
      : `${compliance.gaps.length} criteriu(i) neîndeplinite — vezi Secțiunea VI pentru recomandări`;
    doc.text(verdictDetail, w / 2, y + 18, { align: "center" });
    y += finalVerdictH + 8;

    // Gap-uri identificate (dacă există)
    if (compliance.gaps.length > 0) {
      doc.setTextColor(...COL_H);
      y = sectionTitle(doc, "Gap-uri identificate", y);
      doc.setFontSize(9); doc.setTextColor(...COL_G);
      compliance.gaps.forEach((g, i) => {
        y = ensureSpace(doc, y, 10, title, audName, today);
        doc.setFont(undefined, "bold"); doc.setTextColor(...COL_ERR);
        doc.text(`${i + 1}.`, 12, y);
        doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
        const lines = doc.splitTextToSize(g, w - 30);
        doc.text(lines, 18, y);
        y += lines.length * 4 + 2;
      });
    }

    addPageFooter(doc, "Mc 001-2022 Tabel 2.10a | Legea 238/2024 Art.6", page);

    // ═══════════════════════════════════════════════════════════
    // PAGINA 4 — RECOMANDĂRI (dacă NECONFORM)
    // ═══════════════════════════════════════════════════════════
    if (!compliance.compliant && compliance.recommendations.length > 0) {
      doc.addPage(); page++;
      addPageHeader(doc, title, audName, today);
      y = 26;

      y = sectionTitle(doc, "VI. RECOMANDĂRI PENTRU ATINGEREA nZEB", y);
      doc.setFontSize(8); doc.setTextColor(...COL_G); doc.setFont(undefined, "italic");
      doc.text(
        "Măsurile sunt prioritizate după impactul estimat asupra EP / RER. Implementarea integrată este recomandată",
        10, y
      );
      y += 4;
      doc.text(
        "pentru maximizarea efectului asupra pragurilor nZEB (Mc 001-2022 §6 + Anexa K).",
        10, y
      );
      y += 6;

      const recSorted = [...compliance.recommendations].sort((a, b) => a.priority - b.priority);
      y = autoTable(doc, {
        startY: y,
        head: [["Prio", "Măsură", "Descriere tehnică", "Impact"]],
        body: recSorted.map(r => [
          `P${r.priority}`,
          r.title,
          r.description,
          r.impactEP || r.impactRER || "—",
        ]),
        columnStyles: {
          0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 45, fontStyle: "bold" },
          2: { cellWidth: 105 },
          3: { cellWidth: 25, halign: "center" },
        },
        didParseCell: function (data) {
          if (data.column.index === 0 && data.cell.section === "body") {
            const p = parseInt(String(data.cell.raw).replace("P", ""));
            const colors = { 1: [220, 38, 38], 2: [245, 158, 11], 3: [34, 197, 94] };
            const c = colors[p] || COL_G;
            data.cell.styles.textColor = c;
          }
        },
      });

      y += 4;
      // Notă importantă
      doc.setFillColor(254, 249, 195); // yellow-100
      doc.roundedRect(10, y, w - 20, 18, 2, 2, "F");
      doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(133, 77, 14);
      doc.text("NOTĂ", 13, y + 5);
      doc.setFont(undefined, "normal");
      doc.text(
        "Impactul efectiv depinde de implementarea concretă, calitatea execuției, comportamentul ocupanților",
        13, y + 10
      );
      doc.text(
        "și interacțiunea între măsuri. Se recomandă reevaluarea cu Mc 001-2022 după fiecare intervenție majoră.",
        13, y + 14
      );

      addPageFooter(doc, "Mc 001-2022 §6 + Anexa K | Recomandări reabilitare", page);
    }

    // ═══════════════════════════════════════════════════════════
    // PAGINĂ FINALĂ — REFERINȚE NORMATIVE + SEMNĂTURĂ
    // ═══════════════════════════════════════════════════════════
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "VII. REFERINȚE NORMATIVE", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Document", "Articol / Capitol", "Relevanță"]],
      body: compliance.references.map(r => [r.doc, r.article, r.text]),
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 35 },
        2: { cellWidth: 110 },
      },
    });

    y = sectionTitle(doc, "VIII. DECLARAȚIA AUDITORULUI ENERGETIC", y);
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_H);
    const declaratie = compliance.compliant
      ? "Subsemnatul, auditor energetic atestat Grad I, declar pe propria răspundere că, pe baza calculelor efectuate conform metodologiei Mc 001-2022 și a cerințelor Legii 238/2024 și Legii 372/2005, clădirea descrisă în prezentul raport ÎNDEPLINEȘTE cerințele minime de conformare pentru încadrarea în categoria clădirilor cu consum de energie aproape egal cu zero (nZEB)."
      : "Subsemnatul, auditor energetic atestat Grad I, declar pe propria răspundere că, pe baza calculelor efectuate conform metodologiei Mc 001-2022 și a cerințelor Legii 238/2024 și Legii 372/2005, clădirea descrisă în prezentul raport NU ÎNDEPLINEȘTE integral cerințele minime de conformare nZEB. Se propun măsurile din Secțiunea VI pentru atingerea pragurilor impuse de normativ.";
    const declLines = doc.splitTextToSize(declaratie, w - 20);
    doc.text(declLines, 10, y);
    y += declLines.length * 4 + 8;

    // Caseta semnătură
    const boxW = 80, boxH = 40;
    const boxX1 = 15;
    const boxX2 = w - boxW - 15;
    doc.setDrawColor(...COL_G); doc.setLineWidth(0.3);
    doc.roundedRect(boxX1, y, boxW, boxH, 2, 2, "S");
    doc.roundedRect(boxX2, y, boxW, boxH, 2, 2, "S");

    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("AUDITOR ENERGETIC GRAD I (AE Ici)", boxX1 + 2, y + 4);
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text(auditor?.name || "—", boxX1 + 2, y + 10);
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(`Nr. atestat: ${auditor?.atestat || "—"}`, boxX1 + 2, y + 15);
    doc.text(auditor?.grade || "—", boxX1 + 2, y + 19);
    doc.text("Semnătură + ștampilă", boxX1 + 2, y + boxH - 3);

    doc.setFontSize(7);
    doc.text("DATA ȘI LOCUL", boxX2 + 2, y + 4);
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text(today, boxX2 + 2, y + 10);
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(building?.city || "—", boxX2 + 2, y + 15);
    y += boxH + 6;

    // Footer legal
    doc.setFontSize(6); doc.setTextColor(...COL_G); doc.setFont(undefined, "italic");
    doc.text(
      "Prezentul raport a fost întocmit în conformitate cu art. 6 alin. (1) lit. c) din Ord. MDLPA 348/2026",
      10, y
    );
    y += 3;
    doc.text(
      "și reprezintă atestarea tehnică a conformării clădirii cu cerințele minime de performanță energetică nZEB.",
      10, y
    );

    addPageFooter(doc, "Ord. MDLPA 348/2026 Art.6 | Legea 372/2005 R2", page);

    const addr = (building?.address || "raport-nzeb").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
    const filename = `Raport_Conformare_nZEB_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateNZEBConformanceReport: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// RAPORT DE AUDIT ENERGETIC — PDF (înlocuiește varianta .txt)
// 4 pagini A4: identificare + rezultate + observații + recomandări + auditor
// ═══════════════════════════════════════════════════════════════

/**
 * Raport de audit energetic în format PDF (înlocuiește exportul .txt).
 * Conține: identificare clădire, rezultate calcul, observații/constatări,
 * recomandări de reabilitare, date auditor cu semnătură.
 *
 * @param {object} opts
 *   @param {object} opts.building       Date clădire
 *   @param {object} opts.auditor        Auditor { name, atestat, grade, company, ... }
 *   @param {object} opts.instSummary    Rezultate calcul instalații
 *   @param {object} opts.renewSummary   Rezultate regenerabile
 *   @param {object} opts.envelopeSummary Sumar anvelopă
 *   @param {object} opts.selectedClimate
 *   @param {object} opts.cooling
 *   @param {object} [opts.airInfiltrationCalc]
 *   @param {object} [opts.naturalLightingCalc]
 *   @param {object} [opts.gwpDetailed]
 *   @param {object} [opts.annualEnergyCost]
 *   @param {Array}  [opts.smartSuggestions]
 *   @param {string} [opts.epClass] Clasa energetică derivată
 *   @param {boolean} [opts.isNZEB]
 *   @param {string}  [opts.catLabel]
 *   @param {boolean} [opts.download=true]
 * @returns {Promise<Blob|null>}
 */
export async function generateAuditReportPDF(opts) {
  try {
    const {
      building = {}, auditor = {},
      instSummary, renewSummary, envelopeSummary,
      selectedClimate = {}, cooling = {},
      airInfiltrationCalc, naturalLightingCalc, gwpDetailed, annualEnergyCost,
      smartSuggestions = [],
      epClass, isNZEB, catLabel,
      epRefMax,
      rerMin = 30,
      download = true,
    } = opts || {};

    if (!instSummary) throw new Error("Lipsesc rezultatele calculului energetic (Pasul 5)");

    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "RAPORT DE AUDIT ENERGETIC";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    const epF = renewSummary?.ep_adjusted_m2 ?? instSummary?.ep_total_m2 ?? 0;
    const co2F = renewSummary?.co2_adjusted_m2 ?? instSummary?.co2_total_m2 ?? 0;
    const rer = renewSummary?.rer || 0;
    const cls = epToClass(epF);
    const Au = parseFloat(building.areaUseful) || 0;
    const V = parseFloat(building.volume) || 0;

    // ═══ PAGINA 1: COPERTĂ + IDENTIFICARE + REZULTATE ═══
    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("RAPORT DE AUDIT ENERGETIC", w / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("Mc 001-2022  ·  SR EN ISO 52000-1:2017/NA:2023  ·  Legea 238/2024", w / 2, y, { align: "center" });
    y += 10;

    // Badge clasă energetică (stânga) + verdict nZEB (dreapta)
    const badgeW = 50, badgeH = 32;
    const badgeX = 12;
    doc.setFillColor(...cls.color);
    doc.roundedRect(badgeX, y, badgeW, badgeH, 4, 4, "F");
    doc.setFontSize(28); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(cls.label, badgeX + badgeW / 2, y + 20, { align: "center" });
    doc.setFontSize(7); doc.setFont(undefined, "normal");
    doc.text("CLASA ENERGETICĂ", badgeX + badgeW / 2, y + 28, { align: "center" });

    // Verdict nZEB
    const nzebX = 75;
    const nzebW = w - nzebX - 12;
    doc.setFillColor(...(isNZEB ? COL_OK : COL_ERR));
    doc.roundedRect(nzebX, y, nzebW, badgeH, 4, 4, "F");
    doc.setFontSize(13); doc.setFont(undefined, "bold"); doc.setTextColor(255, 255, 255);
    doc.text(
      isNZEB ? "✓ CLĂDIRE nZEB CONFORMĂ" : "✗ NU SE ÎNCADREAZĂ ÎN nZEB",
      nzebX + nzebW / 2, y + 13,
      { align: "center" }
    );
    doc.setFontSize(8); doc.setFont(undefined, "normal");
    doc.text(
      `EP=${fmtRo(epF, 1)} kWh/(m²·an)  ·  RER=${fmtRo(rer, 1)} %  ·  CO₂=${fmtRo(co2F, 1)} kg/(m²·an)`,
      nzebX + nzebW / 2, y + 22,
      { align: "center" }
    );
    y += badgeH + 10;

    // Identificare clădire
    y = sectionTitle(doc, "1. IDENTIFICARE CLĂDIRE", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      body: [
        ["Adresă", [building.address, building.city, building.county && `jud. ${building.county}`].filter(Boolean).join(", ") || "—"],
        ["Categorie funcțională", catLabel || building.category || "—"],
        ["An construcție / renovare", `${building.yearBuilt || "—"} / ${building.yearRenov || "—"}`],
        ["Suprafață utilă Au", `${fmtRo(Au, 2)} m²`],
        ["Volum încălzit V", `${fmtRo(V, 2)} m³`],
        ["Zonă climatică", `${selectedClimate.name || "—"} (Zona ${selectedClimate.zone || "—"}, θe=${selectedClimate.theta_e ?? "—"} °C)`],
        ["Sistem de răcire", cooling?.hasCooling ? "DA" : "NU"],
      ],
    });

    // Rezultate calcul energetic
    y = ensureSpace(doc, y, 60, title, audName, today);
    y = sectionTitle(doc, "2. REZULTATE CALCUL ENERGETIC", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Indicator", "Valoare", "Prag/Referință", "Verificare"]],
      body: [
        ["Clasa energetică", `${epClass || cls.label}`, "A (nZEB)", ["A+", "A"].includes(epClass || cls.label) ? "✓ CONFORM" : "✗ DE MAJORAT"],
        ["Energie primară EP", `${fmtRo(epF, 1)} kWh/(m²·an)`, epRefMax != null ? `≤ ${fmtRo(epRefMax, 1)}` : "—", epRefMax != null ? (epF <= epRefMax ? "✓ CONFORM" : "✗ NECONFORM") : "—"],
        ["Energie finală totală", `${fmtRo(instSummary.qf_total_m2, 1)} kWh/(m²·an)`, "—", "—"],
        ["Emisii CO₂ specifice", `${fmtRo(co2F, 1)} kg/(m²·an)`, "—", "—"],
        ["RER (rata energie regenerabilă)", `${fmtRo(rer, 1)} %`, `≥ ${rerMin} %`, rer >= rerMin ? "✓ CONFORM" : "✗ NECONFORM"],
        ["Conformitate nZEB", isNZEB ? "DA" : "NU", "Legea 238/2024", isNZEB ? "✓ CONFORM" : "✗ NECONFORM"],
      ],
      columnStyles: {
        0: { cellWidth: 70, fontStyle: "bold" },
        3: { halign: "center", cellWidth: 32 },
      },
      didParseCell: (hook) => {
        if (hook.column.index === 3 && hook.section === "body") {
          const txt = String(hook.cell.raw || "");
          if (txt.includes("✓")) hook.cell.styles.textColor = COL_OK;
          else if (txt.includes("✗")) hook.cell.styles.textColor = COL_ERR;
        }
      },
    });

    addPageFooter(doc, "Mc 001-2022 §5 | Legea 238/2024 Art.6 | SR EN ISO 52000-1", page);

    // ═══ PAGINA 2: OBSERVAȚII + RECOMANDĂRI ═══
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "3. OBSERVAȚII ȘI CONSTATĂRI TEHNICE", y);
    const obsRows = [];
    if (envelopeSummary?.G != null) {
      obsRows.push([
        "Coeficient global pierderi G",
        `${fmtRo(envelopeSummary.G, 3)} W/(m³·K)`,
        envelopeSummary.G > 0.5 ? "⚠ Anvelopă slab izolată" : "✓ În limite",
      ]);
    }
    if (airInfiltrationCalc) {
      obsRows.push([
        "Etanșeitate la aer (n50)",
        `${airInfiltrationCalc.n50} h⁻¹`,
        airInfiltrationCalc.classification || "—",
      ]);
    }
    if (naturalLightingCalc) {
      obsRows.push([
        "Iluminat natural FLZ",
        `${naturalLightingCalc.flz} %`,
        naturalLightingCalc.classification || "—",
      ]);
    }
    if (gwpDetailed) {
      obsRows.push([
        "Amprenta de carbon (GWP)",
        `${gwpDetailed.gwpPerM2Year} kgCO₂eq/(m²·an)`,
        gwpDetailed.classification || "—",
      ]);
    }
    if (annualEnergyCost?.total) {
      // Sprint Pas 7 docs (6 mai 2026) P0-3 — fix bug Raport Tehnic „−3.808 EUR/an":
      // caracterul Unicode ≈ (U+2248 ALMOST EQUAL TO) era rendat ca „−" în PDF
      // după font fallback (Helvetica nu are glif pentru ≈, jsPDF înlocuia cu en-dash).
      // Înlocuit cu ASCII „aprox." pentru randare consistentă.
      obsRows.push([
        "Cost anual de exploatare estimat",
        `${annualEnergyCost.total.toLocaleString("ro-RO")} lei/an`,
        `aprox. ${(annualEnergyCost.totalEur || 0).toLocaleString("ro-RO")} EUR/an`,
      ]);
    }
    if (obsRows.length === 0) {
      obsRows.push(["—", "Nu sunt observații suplimentare disponibile", "—"]);
    }
    y = autoTable(doc, {
      startY: y,
      head: [["Indicator", "Valoare", "Constatare"]],
      body: obsRows,
      columnStyles: {
        0: { cellWidth: 65, fontStyle: "bold" },
      },
    });

    // Recomandări de reabilitare
    y = ensureSpace(doc, y, 50, title, audName, today);
    y = sectionTitle(doc, "4. RECOMANDĂRI DE REABILITARE", y);
    if (smartSuggestions && smartSuggestions.length > 0) {
      y = autoTable(doc, {
        startY: y,
        head: [["#", "Prioritate", "Măsură", "Impact", "Cost", "Recuperare"]],
        body: smartSuggestions.map((s, i) => {
          const pLabel = s.priority === 1 ? "URGENT" : s.priority === 2 ? "RECOMANDAT" : "OPȚIONAL";
          return [
            String(i + 1),
            pLabel,
            s.measure || "—",
            s.impact || "—",
            s.costEstimate || "—",
            s.payback || "—",
          ];
        }),
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 24 },
          2: { cellWidth: 60 },
          3: { cellWidth: 32 },
          4: { cellWidth: 32 },
          5: { halign: "center", cellWidth: 22 },
        },
        didParseCell: (hook) => {
          if (hook.column.index === 1 && hook.section === "body") {
            const txt = String(hook.cell.raw || "");
            if (txt === "URGENT") hook.cell.styles.textColor = COL_ERR;
            else if (txt === "RECOMANDAT") hook.cell.styles.textColor = [217, 119, 6];
            else if (txt === "OPȚIONAL") hook.cell.styles.textColor = COL_OK;
            hook.cell.styles.fontStyle = "bold";
          }
        },
      });

      // Detalii fiecare măsură
      y = ensureSpace(doc, y, 40, title, audName, today);
      doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
      doc.text("Detalii măsuri:", 10, y);
      y += 6;
      doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
      smartSuggestions.forEach((s, i) => {
        if (!s.detail) return;
        y = ensureSpace(doc, y, 14, title, audName, today);
        doc.setFont(undefined, "bold");
        doc.text(`${i + 1}. ${s.measure || ""}`, 10, y);
        y += 4;
        doc.setFont(undefined, "normal");
        const lines = doc.splitTextToSize(s.detail, w - 24);
        doc.text(lines, 14, y);
        y += lines.length * 3.6 + 3;
      });
    } else {
      doc.setFontSize(9); doc.setTextColor(...COL_G);
      doc.text("Nu sunt disponibile recomandări automate. Completați datele anvelopei și instalațiilor în pașii 1-5.", 10, y, { maxWidth: w - 20 });
      y += 8;
    }

    addPageFooter(doc, "Mc 001-2022 §6 Reabilitare | EPBD 2024/1275 | Legea 372/2005 R2", page);

    // ═══ PAGINA 3: AUDITOR + SEMNĂTURĂ ═══
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "5. DATE AUDITOR ENERGETIC", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      body: [
        ["Nume și prenume auditor", auditor?.name || "—"],
        ["Atestat nr. (serie/număr)", auditor?.atestat || "—"],
        ["Grad atestare", auditor?.grade || "—"],
        ["Firmă / Organizație", auditor?.company || "—"],
        ["Contact", [auditor?.phone, auditor?.email].filter(Boolean).join(" · ") || "—"],
        ["Data întocmirii", auditor?.date ? new Date(auditor.date).toLocaleDateString("ro-RO") : dateRO()],
      ],
    });

    // Caseta de semnătură
    y += 6;
    y = ensureSpace(doc, y, 50, title, audName, today);
    const sigW = 80, sigH = 40;
    doc.setDrawColor(...COL_G); doc.setLineWidth(0.3);
    doc.roundedRect(15, y, sigW, sigH, 2, 2, "S");
    doc.roundedRect(w - 15 - sigW, y, sigW, sigH, 2, 2, "S");

    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("AUDITOR ENERGETIC", 17, y + 5);
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text(auditor?.name || "—", 17, y + 11);
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(`Nr. atestat: ${auditor?.atestat || "—"}  ·  Grad: ${auditor?.grade || "—"}`, 17, y + 16);
    doc.text("Semnătură + ștampilă profesională", 17, y + sigH - 4);

    doc.setFontSize(7);
    doc.text("DATA ȘI LOCUL ÎNTOCMIRII", w - 13 - sigW, y + 5);
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text(today, w - 13 - sigW, y + 11);
    doc.setFontSize(7); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text(building?.city || building?.address || "—", w - 13 - sigW, y + 16);
    y += sigH + 8;

    // Notă conformitate
    doc.setFontSize(6); doc.setFont(undefined, "italic"); doc.setTextColor(...COL_G);
    const nota = "Prezentul raport a fost întocmit în conformitate cu metodologia Mc 001-2022 (MDLPA Ord. 16/2023) și SR EN ISO 52000-1:2017/NA:2023. Datele de calcul sunt cele furnizate de beneficiar și măsurătorile efectuate la fața locului. Auditorul își asumă răspunderea pentru corectitudinea calculelor energetice prezentate.";
    const notaLines = doc.splitTextToSize(nota, w - 20);
    doc.text(notaLines, 10, y);

    addPageFooter(doc, "Mc 001-2022 | Ord. MDLPA 16/2023 | EPBD 2024/1275", page);

    const addr = (building?.address || "audit").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
    const filename = `Raport_Audit_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateAuditReportPDF: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// DEVIZ ESTIMATIV REABILITARE — PDF (înlocuiește varianta .txt)
// 2-3 pagini A4: identificare + tabel deviz + sumar economic + auditor
// ═══════════════════════════════════════════════════════════════

/**
 * Deviz estimativ pentru lucrările de reabilitare energetică, în PDF.
 *
 * @param {object} opts
 *   @param {object} opts.building
 *   @param {object} opts.auditor
 *   @param {object} opts.rehabScenarioInputs
 *   @param {Array}  opts.glazingElements
 *   @param {object} opts.rehabComparison
 *   @param {boolean} [opts.download=true]
 * @returns {Promise<Blob|null>}
 */
export async function generateRehabEstimatePDF(opts) {
  try {
    const {
      building = {}, auditor = {},
      rehabScenarioInputs = {}, glazingElements = [],
      rehabComparison,
      vatRate = 0.21,
      download = true,
    } = opts || {};

    if (!rehabComparison) {
      throw new Error("Configurați scenariul de reabilitare (Pasul 5)");
    }

    const ri = rehabScenarioInputs;
    const Au = parseFloat(building.areaUseful) || 0;

    // Sprint Pas 7 docs (6 mai 2026) follow-up — migrare la sursa canonică unică.
    // Anterior, Devizul folosea estimări heuristice `Au × 3.5` pentru pereți și
    // prețuri hardcoded (45 €/m²) DIFERITE de REHAB_COSTS (42 €/m² la 10cm),
    // producând diferențe majore față de CPE Estimat și Pașaport (28.281 € vs
    // 15.369 €). Acum toate cele 3 documente folosesc buildCanonicalMeasures.
    const opaqueElementsArr = opts.opaqueElements || [];
    const { buildCanonicalMeasures } = await import("../calc/unified-rehab-costs.js");
    const canonical = buildCanonicalMeasures(ri, opaqueElementsArr, glazingElements);

    // Adaptor: format canonical → format așteptat de tabelul Deviz existent.
    let totalEUR = 0;
    const measures = canonical.map((c, idx) => {
      totalEUR += c.costEUR;
      return {
        nr: idx + 1,
        denumire: c.label,
        cantitate: `${c.qty.toFixed(c.unit === "buc" ? 0 : 1)} ${c.unit}`,
        pret: `${c.unitPriceEUR.toFixed(0)} €/${c.unit}`,
        cost: Math.round(c.costEUR),
        detalii: c.normativ || "",
      };
    });

    if (measures.length === 0) {
      throw new Error("Nu există măsuri active în scenariul de reabilitare. Activați cel puțin o măsură în Pasul 5.");
    }

    const tva = totalEUR * vatRate;
    const totalCuTVA = totalEUR + tva;
    const econAnualEUR = (rehabComparison?.savings?.qfSaved || 0) * 0.12;
    const payback = econAnualEUR > 0 ? totalEUR / econAnualEUR : null;

    const doc = await initDoc();
    const w = doc.internal.pageSize.getWidth();
    const title = "DEVIZ ESTIMATIV REABILITARE";
    const audName = auditor?.name || "";
    const today = dateRO();
    let page = 1;

    // ═══ PAGINA 1: COPERTĂ + IDENTIFICARE + DEVIZ ═══
    addPageHeader(doc, title, audName, today);
    let y = 26;

    doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
    doc.text("DEVIZ ESTIMATIV REABILITARE ENERGETICĂ", w / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
    doc.text("Costuri orientative actualizate 2025-2026  ·  Mc 001-2022  ·  PNRR + Casa Verde", w / 2, y, { align: "center" });
    y += 10;

    y = sectionTitle(doc, "1. IDENTIFICARE CLĂDIRE", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
      body: [
        ["Adresă", [building.address, building.city].filter(Boolean).join(", ") || "—"],
        ["Suprafață utilă", `${fmtRo(Au, 2)} m²`],
        ["Auditor energetic", `${auditor?.name || "—"} (${auditor?.atestat || "—"})`],
        ["Data devizului", today],
      ],
    });

    // Tabel deviz cu detalii
    y = ensureSpace(doc, y, 70, title, audName, today);
    y = sectionTitle(doc, "2. LUCRĂRI DE REABILITARE — DEVIZ DETALIAT", y);
    y = autoTable(doc, {
      startY: y,
      head: [["Nr.", "Măsură de reabilitare", "Cantitate", "Preț unitar", "Cost total (€)"]],
      body: measures.map(m => [
        String(m.nr),
        m.denumire,
        m.cantitate,
        m.pret,
        m.cost.toLocaleString("ro-RO", { maximumFractionDigits: 0 }),
      ]),
      foot: [
        [
          { content: "TOTAL INVESTIȚIE (fără TVA)", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
          { content: `${totalEUR.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`, styles: { halign: "right", fontStyle: "bold" } },
        ],
        [
          { content: `TVA ${(vatRate * 100).toFixed(0)} %`, colSpan: 4, styles: { halign: "right" } },
          { content: `${tva.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`, styles: { halign: "right" } },
        ],
        [
          { content: "TOTAL CU TVA", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
          { content: `${totalCuTVA.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`, styles: { halign: "right", fontStyle: "bold" } },
        ],
      ],
      footStyles: { fillColor: COL_H, textColor: COL_A, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 80 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "right", cellWidth: 34 },
      },
    });

    // Detalii fișe per măsură (pagina 2)
    if (measures.some(m => m.detalii)) {
      y = ensureSpace(doc, y, 30, title, audName, today);
      y = sectionTitle(doc, "3. SPECIFICAȚII TEHNICE PER MĂSURĂ", y);
      doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
      measures.forEach(m => {
        if (!m.detalii) return;
        y = ensureSpace(doc, y, 12, title, audName, today);
        doc.setFont(undefined, "bold"); doc.setTextColor(...COL_H);
        doc.text(`${m.nr}. ${m.denumire}`, 10, y);
        y += 4;
        doc.setFont(undefined, "normal"); doc.setTextColor(...COL_G);
        const lines = doc.splitTextToSize(m.detalii, w - 24);
        doc.text(lines, 14, y);
        y += lines.length * 3.6 + 3;
      });
    }

    addPageFooter(doc, "Costuri orientative ±30% | Mc 001-2022 | EPBD 2024/1275", page);

    // ═══ PAGINA 2: SUMAR FINANCIAR + AUDITOR ═══
    doc.addPage(); page++;
    addPageHeader(doc, title, audName, today);
    y = 26;

    y = sectionTitle(doc, "4. SUMAR FINANCIAR ȘI ECONOMII", y);
    y = autoTable(doc, {
      startY: y,
      columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { halign: "right" } },
      body: [
        ["Total investiție (fără TVA)", `${totalEUR.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`],
        [`TVA (${(vatRate * 100).toFixed(0)} %)`, `${tva.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`],
        ["Total cu TVA", `${totalCuTVA.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €`],
        ["Economie anuală estimată", econAnualEUR > 0 ? `${econAnualEUR.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} €/an` : "—"],
        ["Termen de recuperare simplu", payback != null ? `${payback.toFixed(1)} ani` : "—"],
        ["Q_final economisit (Pasul 5)", `${(rehabComparison?.savings?.qfSaved || 0).toLocaleString("ro-RO", { maximumFractionDigits: 0 })} kWh/an`],
      ],
    });

    // Note importante
    y = ensureSpace(doc, y, 35, title, audName, today);
    y = sectionTitle(doc, "5. NOTE IMPORTANTE", y);
    doc.setFontSize(8); doc.setTextColor(...COL_G); doc.setFont(undefined, "normal");
    const note = [
      "• Prețurile sunt estimative pentru perioada 2025-2026 (fără TVA) și pot varia ±30% în funcție de zonă, furnizor și complexitatea lucrărilor.",
      "• Devizul nu include lucrări conexe: relocare instalații, refacere finisaje interioare/exterioare, demolări parțiale, organizare șantier.",
      "• Pentru implementare se recomandă obținerea a minim 3 oferte ferme de la executanți autorizați conform legii.",
      "• Eligibil pentru programe de finanțare: PNRR Componenta C5/C7, Casa Verde Fotovoltaice, Programul Național de Reabilitare Termică, fonduri europene 2021-2027.",
      "• Termenul de recuperare nu include eventuale subvenții/granturi care îl pot reduce semnificativ (până la 50-100% din valoare).",
    ];
    note.forEach(line => {
      y = ensureSpace(doc, y, 8, title, audName, today);
      const lines = doc.splitTextToSize(line, w - 20);
      doc.text(lines, 10, y);
      y += lines.length * 3.8 + 1;
    });

    // Auditor
    y = ensureSpace(doc, y, 50, title, audName, today);
    y = sectionTitle(doc, "6. AUDITOR ENERGETIC", y);
    y = auditorBlock(doc, auditor, y);

    // Caseta de semnătură
    y += 4;
    y = ensureSpace(doc, y, 32, title, audName, today);
    const sigW = 80, sigH = 24;
    doc.setDrawColor(...COL_G); doc.setLineWidth(0.3);
    doc.roundedRect(15, y, sigW, sigH, 2, 2, "S");
    doc.roundedRect(w - 15 - sigW, y, sigW, sigH, 2, 2, "S");
    doc.setFontSize(7); doc.setTextColor(...COL_G);
    doc.text("Semnătură auditor", 15 + sigW / 2, y + sigH + 3, { align: "center" });
    doc.text("Ștampilă profesională", w - 15 - sigW / 2, y + sigH + 3, { align: "center" });

    addPageFooter(doc, "Deviz estimativ — orientativ | Mc 001-2022 | PNRR + Casa Verde", page);

    const addr = (building?.address || "deviz").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
    const filename = `Deviz_estimativ_${addr}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return finalize(doc, filename, download);
  } catch (e) {
    throw new Error(`generateRehabEstimatePDF: ${e.message}`);
  }
}
