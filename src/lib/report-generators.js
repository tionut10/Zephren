// ═══════════════════════════════════════════════════════════════
// ZEPHREN — Modul generare rapoarte PDF
// Toate funcțiile sunt async și folosesc import() dinamic jsPDF
// Color scheme: header dark (#0d0f1a / amber), corp alb/gri
// Normative: Mc 001-2022, ISO 52000-1, EN 15978, EN ISO 717-1,
//            EN ISO 13788, C125, NP 008-97, SR 6156:2016
// ═══════════════════════════════════════════════════════════════

const BRAND = "ZEPHREN";
const VERSION = "v3.4";
const COL_H = [13, 15, 26];   // #0d0f1a — header dark
const COL_A = [251, 191, 36]; // #fbbf24 — amber accent
const COL_G = [80, 80, 90];   // text gri corp
const COL_W = [255, 255, 255];
const COL_ERR = [220, 38, 38];
const COL_OK  = [22, 163, 74];

// ── Utilitar: inițializare jsPDF ──────────────────────────────
async function initDoc() {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

// ── Utilitar: header pagini ───────────────────────────────────
function addPageHeader(doc, title, auditorName, dateStr) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COL_H);
  doc.rect(0, 0, w, 18, "F");
  doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.setTextColor(...COL_A);
  doc.text(BRAND, 10, 12);
  doc.setFontSize(9); doc.setFont(undefined, "normal");
  doc.setTextColor(...COL_W);
  doc.text(title, w / 2, 12, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(180, 180, 180);
  doc.text(`${auditorName || ""}  |  ${dateStr || ""}`, w - 10, 12, { align: "right" });
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
    ["Nr. atestat / Grad", `${auditor?.atestat || "-"} / Grad ${auditor?.grade || "-"}`],
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
        ["Cost anual estimat energie", `≈ ${costAnual.toLocaleString("ro-RO")} RON / an`],
        ["Cost lunar mediu",           `≈ ${costLunar.toLocaleString("ro-RO")} RON / lună`],
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
        ["Economie anuală estimată", `≈ ${economieRON.toLocaleString("ro-RO")} RON / an`],
        ["Reducere emisii CO₂",      `≈ ${economieCO2} kg CO₂ / an`],
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
    doc.text("Acest document a fost generat automat de Zephren și trebuie semnat de auditor energetic atestat MDLPA (Grad I sau II).", 10, y + 3);
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
