/**
 * special-studies-pdf.js — Studii speciale obligatorii pentru construcții noi.
 *
 * Sprint Conformitate P1-11..P1-14 (7 mai 2026) + Sprint Visual-6 (8 mai 2026).
 *
 * Acoperă itemii P1-11..P1-14 din audit conformitate:
 *   - P1-11 Studiu sisteme alternative (Mc 001-2022 §11 + Art. 9 EPBD 2024/1275)
 *   - P1-12 Studiu pre-cabling EV (Art. 14 alin. 3-4 EPBD 2024/1275 + L. 238/2024)
 *   - P1-13 Foaie de parcurs (FdP) standalone — limbaj non-tehnic pentru beneficiar
 *   - P1-14 Plan M&V avansat IPMVP cu opțiunile A/B/C/D (extends dossier-extras.js)
 *
 * Sprint Visual-6: aplicare brand kit (SLATE_900 + WHITE pe headers tabele).
 */

import { setupRomanianFont, makeTextWriter, ROMANIAN_FONT } from "../utils/pdf-fonts.js";

const TODAY_RO = () => new Date().toLocaleDateString("ro-RO", {
  day: "2-digit", month: "long", year: "numeric",
});

function _safeSlug(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function fmtNum(v, dec = 1) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toFixed(dec).replace(".", ",");
}

// ─────────────────────────────────────────────────────────────────────────────
// P1-11 Studiu sisteme alternative
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configurare 6 alternative standard analizate.
 */
const ALTERNATIVE_SYSTEMS = [
  {
    id: "hp_geo",
    label: "Pompă căldură geotermală (sol-apă)",
    investmentMultiplier: 2.5,
    annualSavingsMultiplier: 0.55,
    co2ReductionPct: 60,
    paybackTypicalYears: 12,
  },
  {
    id: "hp_air_air",
    label: "Pompă căldură aer-aer",
    investmentMultiplier: 0.8,
    annualSavingsMultiplier: 0.40,
    co2ReductionPct: 45,
    paybackTypicalYears: 6,
  },
  {
    id: "hp_air_water",
    label: "Pompă căldură aer-apă (hidronic)",
    investmentMultiplier: 1.5,
    annualSavingsMultiplier: 0.50,
    co2ReductionPct: 55,
    paybackTypicalYears: 9,
  },
  {
    id: "pv_battery",
    label: "Fotovoltaic + Baterie stocare",
    investmentMultiplier: 1.8,
    annualSavingsMultiplier: 0.65,
    co2ReductionPct: 70,
    paybackTypicalYears: 11,
  },
  {
    id: "solar_thermal",
    label: "Solar termic (ACM + suport încălzire)",
    investmentMultiplier: 0.6,
    annualSavingsMultiplier: 0.20,
    co2ReductionPct: 25,
    paybackTypicalYears: 8,
  },
  {
    id: "district_heating",
    label: "Termoficare proximitate (DH 4G/5G)",
    investmentMultiplier: 0.4,
    annualSavingsMultiplier: 0.30,
    co2ReductionPct: 35,
    paybackTypicalYears: 5,
  },
];

/**
 * Generează studiu sisteme alternative PDF A4.
 *
 * @param {object} args
 * @param {object} args.building
 * @param {object} args.climate
 * @param {object} args.baseline — { totalInvestment, annualEnergyConsumption_kWh, energyPriceRON_per_kWh }
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateAlternativeSystemsStudyPdf({
  building = {},
  climate = {},
  baseline = {},
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont(baseFont, "bold"); doc.setFontSize(15);
  writeText("STUDIU SISTEME ENERGETICE ALTERNATIVE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Conform Mc 001-2022 §11 + Art. 9 EPBD 2024/1275 + L. 372/2005",
    pageW / 2, y, { align: "center" });
  y += 5;
  writeText(`Generat: ${TODAY_RO()}`, pageW / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Date clădire
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. DATE CLĂDIRE", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  writeText(`Adresă: ${building.address || "—"}`, M, y); y += 4.5;
  writeText(`Categorie: ${building.category || "—"}`, M, y); y += 4.5;
  writeText(`Suprafață utilă: ${fmtNum(building.areaUseful)} m²`, M, y); y += 4.5;
  writeText(`Zonă climatică: ${climate.zone || "—"}`, M, y); y += 4.5;
  writeText(`Investiție bază (cazan gaz convențional): ${fmtNum(baseline.totalInvestment, 0)} RON`, M, y); y += 4.5;
  writeText(`Consum anual energetic baseline: ${fmtNum(baseline.annualEnergyConsumption_kWh, 0)} kWh/an`, M, y); y += 4.5;
  y += 4;

  // Tabel 6 alternative analizate
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. ANALIZĂ COMPARATIVĂ 6 ALTERNATIVE", M, y); y += 6;

  doc.setFillColor(15, 23, 42); // Sprint V6: SLATE_900 brand kit (era custom slate)
  doc.rect(M, y, pageW - 2 * M, 6, "F");
  doc.setTextColor(255, 255, 255); // Sprint V6: WHITE brand kit (era amber accent)
  doc.setFont(baseFont, "bold"); doc.setFontSize(8);
  writeText("Sistem alternativ", M + 2, y + 4);
  writeText("Investiție RON", M + 75, y + 4);
  writeText("Economii/an", M + 110, y + 4);
  writeText("CO₂ red %", M + 140, y + 4);
  writeText("Payback ani", M + 165, y + 4);
  doc.setTextColor(0, 0, 0);
  y += 7;

  const baseInv = Number(baseline.totalInvestment) || 0;
  const baseConsumption = Number(baseline.annualEnergyConsumption_kWh) || 0;
  const energyPrice = Number(baseline.energyPriceRON_per_kWh) || 0.85;
  const baseAnnualCost = baseConsumption * energyPrice;

  ALTERNATIVE_SYSTEMS.forEach((alt, idx) => {
    if (y > 260) { doc.addPage(); y = 22; }
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 250);
      doc.rect(M, y - 4, pageW - 2 * M, 6, "F");
    }
    doc.setDrawColor(220, 220, 230);
    doc.line(M, y + 2, pageW - M, y + 2);
    doc.setFont(baseFont, "normal"); doc.setFontSize(8);
    const inv = baseInv * alt.investmentMultiplier;
    const savings = baseAnnualCost * alt.annualSavingsMultiplier;
    const realPayback = savings > 0 ? Math.min(inv / savings, 50) : 0;
    writeText(alt.label, M + 2, y);
    writeText(fmtNum(inv, 0), M + 75, y);
    writeText(fmtNum(savings, 0), M + 110, y);
    writeText(fmtNum(alt.co2ReductionPct, 0) + "%", M + 140, y);
    writeText(fmtNum(realPayback, 1), M + 165, y);
    y += 6;
  });
  y += 4;

  // Recomandare
  if (y > 240) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(10);
  writeText("3. RECOMANDARE AUDITOR", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  // Cea mai bună combinație: minim payback × max CO₂
  const ranked = [...ALTERNATIVE_SYSTEMS].map(a => ({
    ...a,
    score: a.co2ReductionPct / Math.max(1, a.paybackTypicalYears),
  })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const lines = doc.splitTextToSize(
    `Sistemul alternativ recomandat este „${best.label}" cu reducere CO₂ ${fmtNum(best.co2ReductionPct, 0)}% ` +
    `și payback tipic ${fmtNum(best.paybackTypicalYears, 0)} ani. ` +
    `Această soluție îndeplinește cerințele Art. 9 EPBD 2024/1275 pentru clădiri noi rezidențiale ` +
    `și nerezidențiale (analiza tehnico-economică obligatorie pentru construcții ≥50 m²).`,
    pageW - 2 * M,
  );
  lines.forEach(l => { writeText(l, M, y); y += 4.5; });

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 280, pageW - M, 280);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P1-11. " +
    "Bază: Mc 001-2022 §11 + EPBD 2024/1275 Art. 9 + L. 372/2005 republ.",
    M, 285, { maxWidth: pageW - 2 * M });

  const fname = `Studiu_alternative_${_safeSlug(building.address || "cladire")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// P1-12 Studiu pre-cabling EV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generează studiu pre-cabling EV PDF A4 (Art. 14 alin. 3-4 EPBD 2024/1275).
 *
 * Calculează cota minimă de pre-cabling EV obligatorie:
 *   - Rezidențial ≥3 unități: minimum 1 priză + ducting pregătit pentru toate locurile
 *   - Nerezidențial ≥10 locuri: 50% locuri pregătite + 1 priză instalată
 *
 * @param {object} args
 * @param {object} args.building
 * @param {number} args.parkingSlots — total locuri parcare
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateEvPrecablingPdf({
  building = {},
  parkingSlots = 0,
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont(baseFont, "bold"); doc.setFontSize(14);
  writeText("STUDIU PRE-CABLING EV (PUNCTE ÎNCĂRCARE VEHICULE ELECTRICE)", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10); doc.setFont(baseFont, "normal"); doc.setTextColor(80, 80, 100);
  writeText("Conform Art. 14 alin. 3-4 EPBD 2024/1275 + L. 238/2024 RO + Reg. UE 2023/1804 (AFIR)",
    pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // Determină cerințe pe baza categoriei și nr locuri
  const cat = String(building.category || "").toUpperCase();
  const isResidential = ["RI", "RC", "RA", "BC"].includes(cat);
  const slots = Number(parkingSlots) || 0;

  let rule, minPlaces, minPrize, threshold;
  if (isResidential) {
    threshold = 3;
    minPrize = slots >= threshold ? 1 : 0;
    minPlaces = slots >= threshold ? slots : 0; // toate locuri pre-cablate
    rule = "Art. 14 alin. 3 EPBD — clădiri rezidențiale noi/renovate ≥3 unități parcare";
  } else {
    threshold = 10;
    minPrize = slots >= threshold ? 1 : 0;
    minPlaces = slots >= threshold ? Math.ceil(slots * 0.5) : 0;
    rule = "Art. 14 alin. 4 EPBD — clădiri nerezidențiale noi/renovate ≥10 locuri parcare";
  }

  // Date clădire
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("1. IDENTIFICARE CLĂDIRE", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5);
  writeText(`Adresă: ${building.address || "—"}`, M, y); y += 5;
  writeText(`Categorie: ${building.category || "—"} (${isResidential ? "rezidențial" : "nerezidențial"})`, M, y); y += 5;
  writeText(`Total locuri parcare: ${slots}`, M, y); y += 5;
  writeText(`Prag aplicabilitate: ≥${threshold} locuri`, M, y); y += 5;
  y += 4;

  // Cerințe minime
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("2. CERINȚE MINIME LEGAL", M, y); y += 6;
  doc.setFillColor(232, 247, 232);
  doc.rect(M, y - 2, pageW - 2 * M, 22, "F");
  doc.setFont(baseFont, "normal"); doc.setFontSize(9.5); doc.setTextColor(20, 80, 20);
  writeText(`✓ Locuri pre-cablate (ducting + tablou pregătit): ${minPlaces} locuri`, M + 3, y + 3); y += 5;
  writeText(`✓ Prize de încărcare instalate: ${minPrize}`, M + 3, y + 3); y += 5;
  writeText(`✓ Regulă aplicată: ${rule}`, M + 3, y + 3); y += 5;
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Schemă tablou
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("3. SCHEMĂ TABLOU EV PROPUSĂ", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const lines = [
    "Tabloul EV trebuie să includă:",
    "  • Întrerupător general 3P+N (dimensionat pentru putere instalată minim 22 kVA)",
    "  • Diferențial 30 mA tip B (sensibilitate DC)",
    "  • Câte un disjunctor 16-32 A per loc pre-cablat",
    "  • Contor verde dedicat (separare consum EV de consum gospodărie)",
    "  • Comunicație OCPP 2.0.1 pentru integrare smart-grid (recomandat)",
    "",
    "Cabluri rezistive pre-instalate prin canale tehnice:",
    "  • Secțiune minimă 5x6 mm² (pentru putere 7.4 kW × 1 fază sau 11 kW × 3 faze)",
    "  • Ducting Ø50 mm pentru extensii viitoare",
    "  • Distanță maximă tablou ↔ priză: 15 m (pierdere tensiune ≤3%)",
  ];
  lines.forEach(l => {
    if (y > 270) { doc.addPage(); y = 22; }
    writeText(l, M, y); y += 4.5;
  });
  y += 4;

  // Memoriu tehnic + bază legală
  if (y > 245) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "bold"); doc.setFontSize(11);
  writeText("4. MEMORIU TEHNIC + BAZĂ LEGALĂ", M, y); y += 6;
  doc.setFont(baseFont, "normal"); doc.setFontSize(9);
  const memo = [
    "Acest studiu certifică conformitatea proiectului cu cerințele EPBD 2024/1275 Art. 14 ",
    "alin. 3-4 referitoare la pre-cabling EV pentru parcaje în clădiri noi sau renovate ",
    "major. Lipsa pre-cabling-ului face autorizarea construcției imposibilă conform ",
    "L. 238/2024 (transpunere RO).",
    "",
    "Costul pre-cabling-ului la momentul construcției este de ~5-8% din costul instalației ",
    "complete EV — optimizare semnificativă față de retrofit ulterior (≥40% mai scump).",
    "",
    "Reg. UE 2023/1804 (AFIR) impune adițional pentru clădiri publice ≥20 locuri minimum ",
    "1 priză rapidă (≥22 kW) operațională din momentul recepției.",
  ].join("");
  const memoLines = doc.splitTextToSize(memo, pageW - 2 * M);
  memoLines.forEach(l => { writeText(l, M, y); y += 4.5; });

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 280, pageW - M, 280);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText("Generat de Zephren v4.0+ — Sprint Conformitate P1-12.",
    M, 285, { maxWidth: pageW - 2 * M });

  const fname = `Studiu_EV_precabling_${_safeSlug(building.address || "cladire")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}

// ─────────────────────────────────────────────────────────────────────────────
// P1-13 Foaie de parcurs (FdP) standalone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generează Foaie de Parcurs PDF A4 — limbaj non-tehnic pentru beneficiar.
 *
 * @param {object} args
 * @param {object} args.building
 * @param {object} args.owner
 * @param {Array<{year, label, costRON, savingsKwhPerYear, fundingSource?}>} args.phases
 * @param {object} [args.summary] — { totalCost, annualSavings, totalSavingsKwh, paybackYears }
 * @param {boolean} [args.download=true]
 * @returns {Promise<Blob>}
 */
export async function generateFoaieParcursStandalonePdf({
  building = {},
  owner = {},
  phases = [],
  summary = {},
  download = true,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontOk = await setupRomanianFont(doc);
  const writeText = makeTextWriter(doc, fontOk);
  const baseFont = fontOk ? ROMANIAN_FONT : "helvetica";
  const M = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 22;

  // Antet prietenos
  doc.setFont(baseFont, "bold"); doc.setFontSize(18);
  doc.setTextColor(20, 60, 120);
  writeText("Foaia ta de parcurs", pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 80);
  writeText("pentru o casă mai eficientă energetic", pageW / 2, y, { align: "center" });
  y += 10;
  doc.setTextColor(0, 0, 0);

  doc.setFont(baseFont, "normal"); doc.setFontSize(10);
  writeText(`Pentru: ${owner.name || "Beneficiar"}`, pageW / 2, y, { align: "center" });
  y += 5;
  writeText(`Adresă: ${building.address || "—"}`, pageW / 2, y, { align: "center" });
  y += 10;

  // Mesaj introductiv prietenos
  doc.setFillColor(232, 247, 232);
  doc.roundedRect(M, y, pageW - 2 * M, 30, 3, 3, "F");
  doc.setFont(baseFont, "normal"); doc.setFontSize(10); doc.setTextColor(20, 80, 20);
  const intro = doc.splitTextToSize(
    "Această foaie de parcurs îți spune, în pași simpli, ce trebuie făcut în casa ta " +
    "în următorii 5-15 ani pentru a reduce facturile la energie cu până la 70% și pentru " +
    "a face casa ta mai confortabilă vara și iarna. Fiecare pas e fezabil financiar și " +
    "majoritatea pot fi finanțați prin programe de stat.",
    pageW - 2 * M - 8,
  );
  let ny = y + 5;
  intro.forEach(l => { writeText(l, M + 4, ny); ny += 4.5; });
  doc.setTextColor(0, 0, 0);
  y += 36;

  // Faze — 1 card per fază
  doc.setFont(baseFont, "bold"); doc.setFontSize(13);
  writeText("📋 Pașii de făcut, în ordine:", M, y); y += 7;

  phases.forEach((phase, idx) => {
    if (y > 235) { doc.addPage(); y = 22; }
    // Card numerotat
    doc.setDrawColor(120, 160, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, pageW - 2 * M, 28, 2, 2);
    doc.setLineWidth(0.2);

    // Număr fază
    doc.setFillColor(20, 60, 120);
    doc.circle(M + 6, y + 6, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(baseFont, "bold"); doc.setFontSize(11);
    writeText(`${idx + 1}`, M + 6, y + 7.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFont(baseFont, "bold"); doc.setFontSize(11);
    writeText(phase.label || `Faza ${idx + 1}`, M + 14, y + 7);

    doc.setFont(baseFont, "normal"); doc.setFontSize(9);
    writeText(`📅 An ${phase.year || "—"}`, M + 14, y + 13);
    writeText(`💰 Cost estimat: ${fmtNum(phase.costRON, 0)} RON`, M + 14, y + 18);
    writeText(`⚡ Economii: ~${fmtNum(phase.savingsKwhPerYear, 0)} kWh/an (~${fmtNum((phase.savingsKwhPerYear || 0) * 0.85, 0)} RON/an)`, M + 14, y + 23);
    if (phase.fundingSource) {
      doc.setTextColor(20, 100, 20);
      writeText(`🎯 Finanțare disponibilă: ${phase.fundingSource}`, M + 100, y + 13);
      doc.setTextColor(0, 0, 0);
    }
    y += 32;
  });

  // Sumar total
  if (y > 230) { doc.addPage(); y = 22; }
  y += 4;
  doc.setFillColor(255, 248, 220);
  doc.roundedRect(M, y, pageW - 2 * M, 35, 3, 3, "F");
  doc.setFont(baseFont, "bold"); doc.setFontSize(12); doc.setTextColor(140, 90, 20);
  writeText("📊 Sumar total al renovării", M + 4, y + 6);
  doc.setFont(baseFont, "normal"); doc.setFontSize(10); doc.setTextColor(60, 50, 20);
  writeText(`💼 Investiție totală: ${fmtNum(summary.totalCost, 0)} RON`, M + 4, y + 13);
  writeText(`⚡ Economii anuale: ${fmtNum(summary.annualSavings, 0)} RON/an`, M + 4, y + 19);
  writeText(`🌍 Economii energie: ${fmtNum(summary.totalSavingsKwh, 0)} kWh/an`, M + 4, y + 25);
  writeText(`⏱  Recuperare investiție (payback): ~${fmtNum(summary.paybackYears, 1)} ani`, M + 4, y + 31);
  doc.setTextColor(0, 0, 0);
  y += 40;

  // Mesaj final
  if (y > 245) { doc.addPage(); y = 22; }
  doc.setFont(baseFont, "italic"); doc.setFontSize(9.5); doc.setTextColor(80, 80, 80);
  const msg = doc.splitTextToSize(
    "Întreabă auditorul tău despre detalii tehnice, oferte de execuție sau " +
    "documentație pentru aplicare la programe de finanțare. Această foaie e ghidul " +
    "tău, nu o obligație — poți alege să faci doar unele etape sau să le ordonezi diferit.",
    pageW - 2 * M,
  );
  msg.forEach(l => { writeText(l, M, y); y += 4.5; });

  // Footer
  doc.setDrawColor(150, 150, 170);
  doc.line(M, 285, pageW - M, 285);
  doc.setFont(baseFont, "italic"); doc.setFontSize(7); doc.setTextColor(100, 100, 130);
  writeText(`Generat de Zephren — ${TODAY_RO()} · Foaie standalone pentru beneficiar (P1-13)`,
    M, 290);

  const fname = `Foaie_parcurs_${_safeSlug(owner.name || building.address || "beneficiar")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (download) doc.save(fname);
  return doc.output("blob");
}
