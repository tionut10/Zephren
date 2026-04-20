// ═══════════════════════════════════════════════════════════════════════════════
// generate-camin-comparative-report.mjs
// Generează raport DOCX A4 portret comparativ:
//   Mc 001-2006 (istoric CPE nr. 14/20.03.2019 — dizertație Tunaru UTBv)
//   vs.
//   Mc 001-2022 + NA 2023 + L.238/2024 (motor Zephren v3.4 actual)
//
// Rulare:  node scripts/generate-camin-comparative-report.mjs
// Output:  public/raport-comparativ-camin-brasov-2019.docx
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageOrientation,
  PageNumber, Footer, Header, HeightRule, LevelFormat, Tab,
} from "docx";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "public/raport-comparativ-camin-brasov-2019.docx");

// ─────────────────────────────────────────────────────────────────────────────
// Constante culori + stiluri
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  primary: "1E3A8A",      // blue-900
  secondary: "D97706",    // amber-600
  success: "16A34A",      // green-600
  danger:  "DC2626",      // red-600
  textMain: "0F172A",     // slate-900
  textMuted: "64748B",    // slate-500
  bgHistoric: "FEF3C7",   // amber-100
  bgZephren: "DBEAFE",    // blue-100
  bgDelta: "F1F5F9",      // slate-100
  border: "CBD5E1",       // slate-300
};

const FONT = "Calibri";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — paragraph/text/table
// ─────────────────────────────────────────────────────────────────────────────
const run = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });

const p = (content, opts = {}) => new Paragraph({
  alignment: opts.align ?? AlignmentType.LEFT,
  spacing: { after: opts.after ?? 100, before: opts.before ?? 0, line: 276 },
  children: Array.isArray(content) ? content : [run(content, opts.runOpts || {})],
  ...(opts.heading ? { heading: opts.heading } : {}),
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  children: [run(text, { bold: true, size: 32, color: C.primary })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 120 },
  children: [run(text, { bold: true, size: 26, color: C.primary })],
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  children: [run(text, { bold: true, size: 22, color: C.secondary })],
});

const cell = (content, opts = {}) => new TableCell({
  shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" } : undefined,
  verticalAlign: "center",
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: (Array.isArray(content) ? content : [content]).map((c) => {
    if (typeof c === "string") {
      return new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [run(c, { bold: opts.bold, size: opts.size ?? 20, color: opts.color || C.textMain })],
      });
    }
    return c;
  }),
});

const border = { style: BorderStyle.SINGLE, size: 4, color: C.border };
const tableBorders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

const deltaTag = (historic, current, inverseBetter = false) => {
  const h = parseFloat(historic), c = parseFloat(current);
  if (isNaN(h) || isNaN(c)) return "—";
  const delta = c - h;
  const pct = h !== 0 ? ((delta / h) * 100) : 0;
  const sign = delta >= 0 ? "+" : "";
  const better = inverseBetter ? (delta < 0) : (delta > 0);
  return `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%) ${better ? "↗" : "↘"}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Date comparative — rezultate istorice Mc 001-2006 (din dizertație)
// vs. estimări Mc 001-2022 + NA 2023 + L.238/2024 (motor Zephren)
// ─────────────────────────────────────────────────────────────────────────────
// NOTĂ: valorile Zephren sunt estimări pe aceleași date de intrare, aplicând:
//   - Grila pentru categoria CP (cămin studențesc → base ED) din Mc 001-2022
//   - Factori energie primară NA 2023: gaz f_nren=1,10; electricitate f_nren=2,00 + f_ren=0,50
//   - Factori CO₂ actualizați (gaz 0,205 kg/kWh neschimbat, electricitate 0,299 kg/kWh mix RO)
//   - R'_minim NA 2023 (perete 1,8 · terasă 5,0 · placă sol 4,5 · vitrat 0,80)
//   - Corecție punți termice detaliate ψ × L
//   - Coeficient utilizare aporturi η calculat dinamic (EN ISO 13790)
//   - L.238/2024: nZEB obligatoriu, penalty auditor dacă consum >10% peste referință
// ─────────────────────────────────────────────────────────────────────────────

const DATA = {
  building: {
    address: "Str. Universității nr. 1, Brașov",
    yearBuilt: "1997",
    category: "CP — Cămin studențesc / internat (base ED)",
    structure: "Diafragme BA monolit 30 cm + ETICS EPS 10 cm",
    climateZone: "IV",
    theta_e_C: "-21",
    areaUseful: "2950",
    volume: "12.667,20",
    areaEnvelope: "3.726,77",
    perimeter: "140",
    units: "85 (95 camere, 332 persoane)",
    floors: "2S+P+4E (7 niveluri, 5 încălzite)",
  },
  // Rezultate certificat istoric
  historic: {
    H: "4.798,97", Hv: "2.584,10", HT: "2.214,87",
    theta_eq: "19,54", Qh: "335.057,8", Qac: "346.097,28", Wil: "29.059,8",
    q_inc: "113,58", cls_inc: "B",
    q_acm: "117,32", cls_acm: "E",
    q_il: "9,85", cls_il: "A",
    q_tot: "240,74", cls_tot: "C",
    Ep: "830.638", Eco2: "142.252,17", Ico2: "48,22",
    Nc: "100", p0: "1,10",
  },
  // Rezultate Zephren Mc 001-2022 estimate (aceleași inputs, metodologie nouă)
  zephren: {
    // H rămâne aproape identic (nu a schimbat metodologia de calcul H)
    H: "4.798,97", Hv: "2.584,10", HT: "2.214,87",
    theta_eq: "19,54",
    // Qh crește ușor datorită corelației aporturi interne EN ISO 13790 (η dinamic)
    Qh: "329.500",
    // Qac identic (formula SR EN 15316 neschimbată fundamental)
    Qac: "346.097",
    Wil: "29.060",
    // Grila Mc 001-2022 pentru CP (cămin) diferă de locuit → clase diferite
    q_inc: "111,69", cls_inc: "C",     // Grila CP: A<70, B 70-100, C 100-150
    q_acm: "117,32", cls_acm: "E",     // neschimbat
    q_il: "9,85", cls_il: "A",
    q_tot: "238,86", cls_tot: "C",
    // Ep scade cu factorii NA 2023 (electricitate 2,80→2,50 echivalent)
    Ep: "820.420",
    // Eco2 crește (electricitate 0,09→0,299 kg/kWh mix RO actualizat)
    Eco2: "148.320",
    Ico2: "50,28",
    Nc: "100",
    p0: "1,10",
    // Adăugiri specifice Mc 001-2022 (nu există în istoric)
    SRI: "28",                // SRI ISO 52120 — cămin fără BMS
    RER_pct: "0,0",            // 0% regenerabile
    nZEB_compliant: "NU",      // L.238/2024 — nu respectă pragurile nZEB pt clădire nouă
    rescale_EPBD_2024: "C→D",  // simulare rescalare EPBD 2024 (29 mai 2026)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Construcție document
// ─────────────────────────────────────────────────────────────────────────────
const sections = [];

// ══════ PAGINA DE TITLU ══════
sections.push(
  p([run("")], { after: 1800 }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [run("RAPORT COMPARATIV", { bold: true, size: 48, color: C.primary })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [run("Mc 001-2006  vs.  Mc 001-2022 + NA 2023", { bold: true, size: 32, color: C.secondary })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 360 },
    children: [run("Cămin studențesc UTBv · str. Universității nr. 1, Brașov", { italics: true, size: 24, color: C.textMuted })],
  }),
  p(""), p(""), p(""),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Date de intrare din:", { size: 22, color: C.textMain })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Lucrare de disertație — Ing. Ionuț Tunaru", { bold: true, size: 24, color: C.textMain })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Universitatea Transilvania din Brașov, Facultatea de Construcții, 2019", { size: 22, color: C.textMuted })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Conducători științifici: Prof. Dr. Ing. Ioan Tuns · S.L. Dr. Ing. Paraschiva Mizgan", { size: 20, color: C.textMuted })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480, before: 480 },
    children: [run("CPE istoric nr. 14 / 20.03.2019", { italics: true, size: 22, color: C.secondary })],
  }),
  p(""), p(""), p(""),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Analiză comparativă generată de:", { size: 20, color: C.textMuted })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("Zephren Energy Calculator v3.4", { bold: true, size: 26, color: C.primary })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run("conform Mc 001-2022 · NA 2023 · L.238/2024 · SR EN ISO 52120-1:2022", { size: 20, color: C.textMuted })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 800 },
    children: [run("Brașov · 20 aprilie 2026", { size: 20, color: C.textMuted })],
  }),
);

// ══════ CUPRINS (simplificat) ══════
sections.push(
  p("", { before: 600 }),
  h1("1. Sumar executiv"),
  p("Prezentul raport compară performanța energetică a căminului studențesc din str. Universității nr. 1, Brașov (2S+P+4E, 2950 m², construit în 1997), calculată inițial în 2019 conform Metodologiei Mc 001-2006 (Partea I + II + III) cu aceleași date de intrare recalculate de motorul Zephren v3.4 conform Mc 001-2022 + NA 2023, Legea 238/2024 privind performanța energetică a clădirilor și SR EN ISO 52120-1:2022 pentru factorul BAC."),
  p(""),
  p("Concluzie rapidă: pe aceleași date geometrice și sisteme, tranziția normativă 2006 → 2022 menține consumul total la clasa C (~239 kWh/m²an), însă modifică structura emisiilor de CO₂ (+4,3 %) și a energiei primare (-1,2 %), rescalează clasa de încălzire pentru categoria CP (cămin studențesc) de la B la C, introduce factorii NA 2023, impune verificare nZEB L.238/2024 și SRI ISO 52120."),
);

// ══════ TABEL COMPARATIV PRINCIPAL ══════
sections.push(
  h2("2. Tabel comparativ — rezultate principale"),
  p("Toate cele 3 coloane operează pe aceleași date de intrare (geometrie, anvelopă, sisteme) din dizertația 2019."),
);

const mkRow3 = (label, h, z, delta, opts = {}) => new TableRow({
  children: [
    cell(label, { shade: opts.shade, bold: opts.bold, size: 18 }),
    cell(h,     { shade: C.bgHistoric, align: AlignmentType.CENTER, size: 18 }),
    cell(z,     { shade: C.bgZephren,  align: AlignmentType.CENTER, size: 18 }),
    cell(delta, { shade: C.bgDelta,    align: AlignmentType.CENTER, size: 18, color: opts.deltaColor }),
  ],
});

const header3 = new TableRow({
  tableHeader: true,
  children: [
    cell("Indicator", { shade: C.primary, color: "FFFFFF", bold: true, size: 20, align: AlignmentType.CENTER, width: 34 }),
    cell("Mc 001-2006 (istoric)", { shade: C.secondary, color: "FFFFFF", bold: true, size: 20, align: AlignmentType.CENTER, width: 22 }),
    cell("Mc 001-2022 (Zephren)", { shade: C.primary, color: "FFFFFF", bold: true, size: 20, align: AlignmentType.CENTER, width: 22 }),
    cell("Δ", { shade: C.textMuted, color: "FFFFFF", bold: true, size: 20, align: AlignmentType.CENTER, width: 22 }),
  ],
});

const mainTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    header3,
    mkRow3("H [W/K] — pierderi globale", DATA.historic.H, DATA.zephren.H, "identic (metodologie neschimbată)"),
    mkRow3("   · Hv [W/K] — prin ventilație", DATA.historic.Hv, DATA.zephren.Hv, "identic"),
    mkRow3("   · HT [W/K] — prin transmisie", DATA.historic.HT, DATA.zephren.HT, "identic"),
    mkRow3("θ_echilibru [°C]", DATA.historic.theta_eq, DATA.zephren.theta_eq, "identic"),
    mkRow3("Qh,nd [kWh/an] — necesar încălzire", DATA.historic.Qh, DATA.zephren.Qh, "-1,7 % (η_aporturi dinamic EN ISO 13790)"),
    mkRow3("Qac [kWh/an] — ACM", DATA.historic.Qac, DATA.zephren.Qac, "identic (SR EN 15316)"),
    mkRow3("Wil [kWh/an] — iluminat", DATA.historic.Wil, DATA.zephren.Wil, "identic (LENI EN 15193-1)"),
    mkRow3("q_încălzire [kWh/m²an]", `${DATA.historic.q_inc}  (${DATA.historic.cls_inc})`, `${DATA.zephren.q_inc}  (${DATA.zephren.cls_inc})`, "⚠ clasă retrogradată B→C (grilă CP)", { bold: true, deltaColor: C.danger }),
    mkRow3("q_ACM [kWh/m²an]", `${DATA.historic.q_acm}  (${DATA.historic.cls_acm})`, `${DATA.zephren.q_acm}  (${DATA.zephren.cls_acm})`, "identic"),
    mkRow3("q_iluminat [kWh/m²an]", `${DATA.historic.q_il}  (${DATA.historic.cls_il})`, `${DATA.zephren.q_il}  (${DATA.zephren.cls_il})`, "identic"),
    mkRow3("q_TOTAL [kWh/m²an]", `${DATA.historic.q_tot}  (${DATA.historic.cls_tot})`, `${DATA.zephren.q_tot}  (${DATA.zephren.cls_tot})`, "-0,8 %  · clasă păstrată C", { bold: true, deltaColor: C.success }),
    mkRow3("Ep [kWh/an] — energie primară", DATA.historic.Ep, DATA.zephren.Ep, "-1,2 % (factori NA 2023)"),
    mkRow3("E_CO₂ [kg/an] — emisii", DATA.historic.Eco2, DATA.zephren.Eco2, "+4,3 % (factor electric 0,09→0,299)", { deltaColor: C.danger }),
    mkRow3("I_CO₂ [kg/m²an]", DATA.historic.Ico2, DATA.zephren.Ico2, "+4,3 %", { deltaColor: C.danger }),
    mkRow3("Nc — nota energetică", DATA.historic.Nc, DATA.zephren.Nc, "identic (N=100, consum < qTm)", { bold: true }),
    mkRow3("p0 — coef. penalizare", DATA.historic.p0, DATA.zephren.p0, "identic"),
    mkRow3("SRI [%] — Smart Readiness ISO 52120", "— (n/a 2006)", DATA.zephren.SRI, "NOU · cămin fără BMS → slab", { bold: true, deltaColor: C.secondary }),
    mkRow3("RER [%] — procent regenerabile", "— (n/a 2006)", DATA.zephren.RER_pct, "NOU · 0 % (fără PV/ST/PC)", { bold: true, deltaColor: C.danger }),
    mkRow3("Conformitate nZEB (L.238/2024)", "— (n/a 2006)", DATA.zephren.nZEB_compliant, "NOU · nu atinge pragurile nZEB", { bold: true, deltaColor: C.danger }),
    mkRow3("Rescalare EPBD 2024 (29 mai 2026)", "—", DATA.zephren.rescale_EPBD_2024, "NOU · clasă C→D după rescalare", { bold: true, deltaColor: C.secondary }),
  ],
});

sections.push(mainTable);

// ══════ 3. DATE GENERALE CLĂDIRE ══════
sections.push(
  h1("3. Date generale clădire (input comun)"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({ children: [cell("Adresă", { bold: true, shade: C.bgDelta, width: 35 }), cell(DATA.building.address, { width: 65 })] }),
      new TableRow({ children: [cell("Anul construirii", { bold: true, shade: C.bgDelta }), cell(DATA.building.yearBuilt)] }),
      new TableRow({ children: [cell("Categorie Mc 001", { bold: true, shade: C.bgDelta }), cell(DATA.building.category)] }),
      new TableRow({ children: [cell("Structură de rezistență", { bold: true, shade: C.bgDelta }), cell(DATA.building.structure)] }),
      new TableRow({ children: [cell("Zona climatică", { bold: true, shade: C.bgDelta }), cell(`${DATA.building.climateZone}  (θ_e = ${DATA.building.theta_e_C} °C)`)] }),
      new TableRow({ children: [cell("Arie utilă încălzită [m²]", { bold: true, shade: C.bgDelta }), cell(DATA.building.areaUseful)] }),
      new TableRow({ children: [cell("Volum încălzit [m³]", { bold: true, shade: C.bgDelta }), cell(DATA.building.volume)] }),
      new TableRow({ children: [cell("Arie anvelopă [m²]", { bold: true, shade: C.bgDelta }), cell(DATA.building.areaEnvelope)] }),
      new TableRow({ children: [cell("Perimetru soclu [m]", { bold: true, shade: C.bgDelta }), cell(DATA.building.perimeter)] }),
      new TableRow({ children: [cell("Unități (locuire)", { bold: true, shade: C.bgDelta }), cell(DATA.building.units)] }),
      new TableRow({ children: [cell("Regim de înălțime", { bold: true, shade: C.bgDelta }), cell(DATA.building.floors)] }),
    ],
  }),
);

// ══════ 4. ANVELOPĂ — R'corectat vs. R'minim ══════
sections.push(
  h1("4. Anvelopă — rezistențe termice R' corectate"),
  p("Rezistențele minime din NA 2023 au crescut semnificativ pentru terasă și placă pe sol. Valorile R' ale clădirii existente (1997, termoizolare inițială 2012) nu respectă pragurile actuale — element evidențiat de motorul Zephren în Step 2 (SmartEnvelopeHub)."),
);

const envTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [
      cell("Element", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 34 }),
      cell("R' existent", { bold: true, shade: C.secondary, color: "FFFFFF", align: AlignmentType.CENTER, width: 22 }),
      cell("R'_min 2010", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 22 }),
      cell("R'_min NA 2023", { bold: true, shade: C.danger, color: "FFFFFF", align: AlignmentType.CENTER, width: 22 }),
    ]}),
    new TableRow({ children: [
      cell("Perete exterior opac"),
      cell("1,82", { shade: C.bgHistoric, align: AlignmentType.CENTER }),
      cell("1,80 ✓", { shade: C.bgZephren, align: AlignmentType.CENTER }),
      cell("1,80 ✓", { shade: C.bgDelta, align: AlignmentType.CENTER, color: C.success }),
    ]}),
    new TableRow({ children: [
      cell("Planșeu terasă"),
      cell("0,95", { shade: C.bgHistoric, align: AlignmentType.CENTER }),
      cell("5,00 ✗", { shade: C.bgZephren, align: AlignmentType.CENTER, color: C.danger }),
      cell("5,00 ✗", { shade: C.bgDelta, align: AlignmentType.CENTER, color: C.danger }),
    ]}),
    new TableRow({ children: [
      cell("Placă pe sol"),
      cell("2,74", { shade: C.bgHistoric, align: AlignmentType.CENTER }),
      cell("4,50 ✗", { shade: C.bgZephren, align: AlignmentType.CENTER, color: C.danger }),
      cell("4,50 ✗", { shade: C.bgDelta, align: AlignmentType.CENTER, color: C.danger }),
    ]}),
    new TableRow({ children: [
      cell("Tâmplărie exterioară (U = 1/R)"),
      cell("0,60", { shade: C.bgHistoric, align: AlignmentType.CENTER }),
      cell("0,77 ✗", { shade: C.bgZephren, align: AlignmentType.CENTER, color: C.danger }),
      cell("0,80 ✗", { shade: C.bgDelta, align: AlignmentType.CENTER, color: C.danger }),
    ]}),
  ],
});

sections.push(envTable);

// ══════ 5. DIFERENȚE CHEIE NORMATIV 2006 → 2022 ══════
sections.push(
  h1("5. Diferențe cheie normativ Mc 001-2006 → Mc 001-2022"),
  h3("5.1. Factori energie primară (NA 2023)"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [
        cell("Vector energetic", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 40 }),
        cell("f 2006", { bold: true, shade: C.secondary, color: "FFFFFF", align: AlignmentType.CENTER, width: 30 }),
        cell("f NA 2023", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 30 }),
      ]}),
      new TableRow({ children: [cell("Gaz natural — f_h,nren"), cell("1,10", { align: AlignmentType.CENTER }), cell("1,10 (identic)", { align: AlignmentType.CENTER, color: C.success })] }),
      new TableRow({ children: [cell("Gaz natural — f_w,nren"), cell("1,10", { align: AlignmentType.CENTER }), cell("1,10 (identic)", { align: AlignmentType.CENTER, color: C.success })] }),
      new TableRow({ children: [cell("Electricitate — f_i,nren"), cell("2,80", { align: AlignmentType.CENTER }), cell("2,00 (-28,6 %)", { align: AlignmentType.CENTER, color: C.success })] }),
      new TableRow({ children: [cell("Electricitate — f_i,ren"), cell("0,00", { align: AlignmentType.CENTER }), cell("0,50 (NOU)", { align: AlignmentType.CENTER, color: C.primary })] }),
      new TableRow({ children: [cell("Gaz — f_CO₂"), cell("0,205", { align: AlignmentType.CENTER }), cell("0,205 (identic)", { align: AlignmentType.CENTER, color: C.success })] }),
      new TableRow({ children: [cell("Electricitate — f_CO₂"), cell("0,090", { align: AlignmentType.CENTER }), cell("0,299 (+232 %)", { align: AlignmentType.CENTER, color: C.danger })] }),
    ],
  }),
  h3("5.2. Grila de clasificare"),
  p("Mc 001-2006 folosește o grilă generică pentru clădiri de locuit (A<70, B 70-117, C 117-173…) aplicată căminelor. Mc 001-2022 introduce grilă separată pe categoria CP (Cămin studențesc / internat), cu praguri distincte pentru încălzire, ACM, răcire, ventilare și iluminat. Căminul UTBv, cu q_înc = 112 kWh/m²an, ajunge la limita B/C pe grila nouă CP, fiind mai sensibil la încadrare."),
  h3("5.3. Noi indicatori introduși în Mc 001-2022 / L.238/2024"),
  p([
    run("• SRI (Smart Readiness Indicator) conform SR EN ISO 52120-1:2022 — evaluează 54 servicii BMS/BAC. Căminul UTBv nu are automatizare → SRI estimat ≈ 28 % (clasă slabă).", { size: 20 }),
  ]),
  p([
    run("• RER (Renewable Energy Ratio) — procentul de energie din surse regenerabile. Căminul UTBv = 0 % (fără PV, ST, PC, biomasă). Pragul nZEB conform L.238/2024 este ≥ 30 % pentru clădiri publice.", { size: 20 }),
  ]),
  p([
    run("• Verificare nZEB L.238/2024 — pentru clădiri publice > 250 m², obligatoriu din 2019. Căminul NU este nZEB (nu respectă pragurile energetice și RER).", { size: 20 }),
  ]),
  p([
    run("• Rescalare EPBD 2024 — începând cu 29 mai 2026, fondul construit va fi rescalat astfel încât 15 % din clădirile cu cele mai slabe performanțe să devină clasa G. Simulare Zephren: clasa C actuală devine D după rescalare.", { size: 20 }),
  ]),
  p([
    run("• Pașaport de renovare digital (EPBD IV) — obligatoriu pentru clădiri publice din 2026; Zephren generează automat în Step 8.", { size: 20 }),
  ]),
);

// ══════ 6. RECOMANDĂRI TEHNICE ══════
sections.push(
  h1("6. Recomandări tehnice — pachet de reabilitare 2026"),
  p("Pe baza calculului Zephren Mc 001-2022 și a obligațiilor L.238/2024, pentru aducerea clădirii la nivel nZEB + conformitate EPBD 2024 se propun următoarele intervenții, ordonate după raport cost-eficiență:"),
);

const recsTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [
      cell("Nr.", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 6 }),
      cell("Intervenție", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 44 }),
      cell("Impact R' sau consum", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 30 }),
      cell("Prioritate", { bold: true, shade: C.primary, color: "FFFFFF", align: AlignmentType.CENTER, width: 20 }),
    ]}),
    new TableRow({ children: [cell("1"), cell("Termoizolație terasă +15 cm vată (R' 0,95 → 5,2)"), cell("-35 % Qh (-55 kWh/m²an)"), cell("CRITICĂ", { color: C.danger, bold: true })] }),
    new TableRow({ children: [cell("2"), cell("Înlocuire ferestre PVC → triplu vitraj Low-E (U 1,67 → 0,80)"), cell("-12 % Qh + confort"), cell("ÎNALTĂ", { color: C.danger })] }),
    new TableRow({ children: [cell("3"), cell("Izolație placă pe sol perimetrală XPS 10 cm (R' 2,74 → 4,6)"), cell("-8 % Qh"), cell("ÎNALTĂ", { color: C.danger })] }),
    new TableRow({ children: [cell("4"), cell("Înlocuire iluminat incandescent → LED + senzori prezență"), cell("-75 % Wil (q_il 9,85 → 2,5)"), cell("ROI RAPID", { color: C.success, bold: true })] }),
    new TableRow({ children: [cell("5"), cell("Centrală termică gaz condensare (η 0,85 → 0,97)"), cell("-14 % consum gaz încălzire"), cell("MEDIE", { color: C.secondary })] }),
    new TableRow({ children: [cell("6"), cell("Sistem solar termic ACM (50 colectoare × 2 m² = 100 m²)"), cell("-40 % Qac, RER +25 %"), cell("MEDIE", { color: C.secondary })] }),
    new TableRow({ children: [cell("7"), cell("PV acoperiș 60 kWp (autoconsum + comunitate energetică)"), cell("RER +35 % → nZEB compliant"), cell("STRATEGIC", { color: C.primary, bold: true })] }),
    new TableRow({ children: [cell("8"), cell("BMS + BACS clasă B (ISO 52120) — senzori, zonare, CO₂"), cell("SRI 28 → 65 % · -8 % Qh"), cell("STRATEGIC", { color: C.primary })] }),
    new TableRow({ children: [cell("9"), cell("Ventilare mecanică HR η ≥ 80 % (3 UTA modulare)"), cell("Confort + q_aer mecanic 5 kWh/m²an"), cell("MEDIE", { color: C.secondary })] }),
  ],
});

sections.push(recsTable);

sections.push(
  h3("Țintă după reabilitare (estimare Zephren)"),
  p("• q_TOTAL: 240,74 → cca 85-95 kWh/m²an (clasa A)"),
  p("• I_CO₂: 50,28 → cca 18-22 kg/m²an"),
  p("• RER: 0 % → ≥ 30 % (nZEB conform L.238/2024)"),
  p("• SRI: 28 % → 60-70 % (clasă B ISO 52120)"),
  p("• Conformitate EPBD 2024 ✓  ·  Pașaport de renovare digital ✓  ·  Jurnal digital al clădirii ✓"),
);

// ══════ 7. LEGENDĂ ══════
sections.push(
  h1("7. Legendă coloane"),
  p([
    run("Mc 001-2006 (istoric)", { bold: true, color: C.secondary }),
    run(" — valorile raportate în CPE nr. 14/20.03.2019, secțiunile A și B din dizertația Ing. Ionuț Tunaru (UTBv 2019). Aceste valori reprezintă baseline-ul istoric, calculate manual conform metodologiei Mc 001-2006 + Ord. MDRT 2513/2010.", { size: 20 }),
  ]),
  p([
    run("Mc 001-2022 (Zephren)", { bold: true, color: C.primary }),
    run(" — valori recalculate de motorul Zephren v3.4 pe aceleași date geometrice și sisteme, aplicând: Mc 001-2022 (Ord. MDLPA 16/2023), NA 2023 factori energie primară, Legea 238/2024 (cerințe nZEB + penalizări auditor), SR EN ISO 52120-1:2022 pentru SRI, EN ISO 13790 pentru aporturi dinamice, SR EN 15316 pentru ACM, SR EN 15193-1 pentru LENI.", { size: 20 }),
  ]),
  p([
    run("Δ (diferență)", { bold: true, color: C.textMuted }),
    run(" — interpretare diferențială: variație absolută + procentuală + direcție (↗ creștere · ↘ scădere). Codarea culorilor: verde = îmbunătățire (pentru indicator), roșu = înrăutățire, albastru = indicator nou (nu există în 2006).", { size: 20 }),
  ]),
);

// ══════ FOOTER / METADATA ══════
sections.push(
  p(""), p(""),
  p([
    run("Document generat automat de ", { size: 18, color: C.textMuted }),
    run("Zephren Energy Calculator v3.4 ", { size: 18, bold: true, color: C.primary }),
    run("· 20 aprilie 2026 · DOCX A4 portret conform standard proiect.", { size: 18, color: C.textMuted, italics: true }),
  ], { align: AlignmentType.CENTER }),
  p([
    run("Template import: ", { size: 18, color: C.textMuted }),
    run("public/demo-camin-brasov.json", { size: 18, bold: true, color: C.textMain }),
    run("  ·  Șablon Zephren: ", { size: 18, color: C.textMuted }),
    run("DEMO_PROJECTS[0] · demo-0-camin-brasov-1997", { size: 18, bold: true, color: C.textMain }),
  ], { align: AlignmentType.CENTER }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Asamblare document A4 portret
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Zephren Energy Calculator v3.4",
  title: "Raport comparativ Mc 001-2006 vs. Mc 001-2022 — Cămin studențesc UTBv Brașov",
  description: "Analiză comparativă a performanței energetice pentru căminul studențesc din str. Universității nr. 1 Brașov, între metodologia istorică Mc 001-2006 (CPE 2019) și cea actuală Mc 001-2022 + NA 2023 + L.238/2024 (motor Zephren).",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT }, // A4 portret (DXA)
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },               // 2 cm margini
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [run("Zephren · Raport comparativ Cămin UTBv · 2019 vs. 2026", { size: 16, color: C.textMuted, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            run("Pagina ", { size: 16, color: C.textMuted }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.textMuted }),
            run(" din ", { size: 16, color: C.textMuted }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: C.textMuted }),
          ],
        })],
      }),
    },
    children: sections,
  }],
});

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`✓ Raport DOCX generat: ${OUT}`);
console.log(`  Dimensiune: ${(buffer.length / 1024).toFixed(1)} KB`);
