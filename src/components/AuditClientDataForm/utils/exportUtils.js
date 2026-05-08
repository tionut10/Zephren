/**
 * exportUtils.js — Export date audit energetic
 *
 * Sprint Client-Form-v2 (8 mai 2026)
 *
 * Formate:
 *   exportToJSON       — date brute JSON
 *   exportToCSV        — date plate CSV
 *   downloadChecklist  — progres TXT
 *   exportToDOCX       — Fișă sinteză profesională cu logo, copertă, zebra, header/footer
 *   DEMO_DATA          — date fictive pentru testare formular client
 */

import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber,
  WidthType, AlignmentType, HeadingLevel, BorderStyle,
  ShadingType, Packer, VerticalAlign,
} from "docx";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTimestamp() {
  return new Date().toISOString().split("T")[0];
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function fetchLogoArrayBuffer() {
  try {
    const resp = await fetch("/logo_ro.png");
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON export
// ─────────────────────────────────────────────────────────────────────────────

export function exportToJSON(formData) {
  const dataStr = JSON.stringify(formData, null, 2);
  triggerDownload(
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr),
    `solicitare-client-${getTimestamp()}.json`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

export function exportToCSV(formData) {
  const flat = {};
  Object.entries(formData).forEach(([k, v]) => {
    if (v !== null && v !== undefined) {
      flat[k] = typeof v === "object" ? JSON.stringify(v) : v;
    }
  });
  const headers = Object.keys(flat);
  const values = headers.map(h => `"${String(flat[h]).replace(/"/g, '""')}"`);
  const csv = [headers.join(","), values.join(",")].join("\n");
  triggerDownload(
    "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
    `solicitare-client-${getTimestamp()}.csv`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist TXT
// ─────────────────────────────────────────────────────────────────────────────

export function downloadChecklist(completionStatus, SECTIONS) {
  const lines = Object.entries(SECTIONS).map(([key, section]) => {
    const status = completionStatus[key] || { completed: 0, required: 0 };
    const pct = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 100;
    const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
    return `${section.icon} ${section.label.padEnd(30)} ${bar} ${pct}% (${status.completed}/${status.required})`;
  });

  const totalCompleted = Object.values(completionStatus).reduce((a, b) => a + (b.completed || 0), 0);
  const totalRequired = Object.values(completionStatus).reduce((a, b) => a + (b.required || 0), 0);
  const totalPct = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

  const doc = [
    "CHECKLIST SOLICITARE AUDIT ENERGETIC — ZEPHREN",
    `Data: ${new Date().toLocaleDateString("ro-RO")}`,
    "═".repeat(60),
    "",
    ...lines,
    "",
    "═".repeat(60),
    `TOTAL: ${totalCompleted}/${totalRequired} câmpuri obligatorii (${totalPct}%)`,
    "═".repeat(60),
    "",
    `Generat: ${new Date().toLocaleString("ro-RO")}`,
  ].join("\n");

  triggerDownload(
    "data:text/plain;charset=utf-8," + encodeURIComponent(doc),
    `checklist-${getTimestamp()}.txt`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX — Fișă sinteză profesională
// ─────────────────────────────────────────────────────────────────────────────

// Culori brand Zephren
const COLOR = {
  PRIMARY: "007A3D",
  PRIMARY_LIGHT: "E8F6EE",
  SLATE_900: "0F172A",
  SLATE_700: "334155",
  SLATE_500: "64748B",
  SLATE_200: "E2E8F0",
  SLATE_50: "F8FAFC",
  WHITE: "FFFFFF",
  RED: "DC2626",
  AMBER: "F59E0B",
};

function _makeCell(text, opts = {}) {
  const {
    bold = false,
    color = COLOR.SLATE_900,
    shade = null,
    width = 50,
    size = 20,
    align = AlignmentType.LEFT,
    italic = false,
  } = opts;

  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shade ? { type: ShadingType.SOLID, color: shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text: String(text ?? "—"), bold, color, size, italics: italic }),
        ],
      }),
    ],
  });
}

function _makeSectionHeader(icon, label) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [
      new TextRun({ text: `${icon}  ${label.toUpperCase()}`, bold: true, size: 24, color: COLOR.SLATE_900 }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.PRIMARY, space: 2 },
    },
  });
}

function _makeDataRow(label, value, isZebra = false) {
  const shade = isZebra ? COLOR.SLATE_50 : COLOR.WHITE;
  return new TableRow({
    children: [
      _makeCell(label, { bold: true, color: COLOR.SLATE_700, shade, width: 40, size: 18 }),
      _makeCell(value, { color: COLOR.SLATE_900, shade, width: 60, size: 18 }),
    ],
  });
}

function _makeTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: COLOR.SLATE_200 },
      insideV: { style: BorderStyle.NONE },
    },
    rows,
  });
}

export async function exportToDOCX(formData, SECTIONS) {
  const logoBuffer = await fetchLogoArrayBuffer();
  const dateStr = new Date().toLocaleDateString("ro-RO");
  const ownerName = formData.ownerName || "—";
  const buildingAddr = [formData.buildingAddress, formData.buildingLocality, formData.buildingCounty]
    .filter(Boolean).join(", ") || "—";

  // ── Header document (repetat pe fiecare pagină de conținut)
  const headerChildren = [
    new Paragraph({
      spacing: { after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.PRIMARY, space: 2 } },
      children: [
        ...(logoBuffer
          ? [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 24 }, type: "png" })]
          : [new TextRun({ text: "ZEPHREN", bold: true, color: COLOR.PRIMARY, size: 22 })]),
        new TextRun({ text: "   FIȘĂ SINTEZĂ SOLICITARE ENERGETICĂ", bold: true, size: 18, color: COLOR.SLATE_700 }),
        new TextRun({ text: `\t${dateStr}`, size: 16, color: COLOR.SLATE_500 }),
      ],
      tabStops: [{ type: "right", position: 9000 }],
    }),
  ];

  // ── Footer document
  const footerChildren = [
    new Paragraph({
      spacing: { before: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.SLATE_200, space: 2 } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Generat de Zephren Energy Performance Calculator  ·  ", size: 14, italics: true, color: COLOR.SLATE_500 }),
        new TextRun({ text: "Pag. ", size: 14, color: COLOR.SLATE_500 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 14, color: COLOR.SLATE_500 }),
        new TextRun({ text: " / ", size: 14, color: COLOR.SLATE_500 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: COLOR.SLATE_500 }),
      ],
    }),
  ];

  // ── Pagina de copertă
  const coverChildren = [
    // Spațiu de sus
    new Paragraph({ spacing: { before: 1200, after: 0 }, children: [] }),

    // Logo mare
    ...(logoBuffer
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
          children: [new ImageRun({ data: logoBuffer, transformation: { width: 160, height: 48 }, type: "png" })],
        })]
      : [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "ZEPHREN", bold: true, color: COLOR.PRIMARY, size: 52 })],
        })]),

    // Titlu document
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "FIȘĂ SINTEZĂ", bold: true, size: 52, color: COLOR.SLATE_900 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: "SOLICITARE DOCUMENTAȚIE ENERGETICĂ", size: 28, color: COLOR.SLATE_500 }),
      ],
    }),

    // Linie decorativă
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR.PRIMARY } },
      children: [new TextRun({ text: " " })],
    }),

    // Card date cheie
    new Table({
      width: { size: 80, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.PRIMARY },
        left: { style: BorderStyle.SINGLE, size: 4, color: COLOR.PRIMARY },
        right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.PRIMARY },
        insideH: { style: BorderStyle.SINGLE, size: 1, color: COLOR.SLATE_200 },
        insideV: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            _makeCell("Proprietar", { bold: true, color: COLOR.SLATE_500, shade: COLOR.PRIMARY_LIGHT, width: 35, size: 18 }),
            _makeCell(ownerName, { bold: true, color: COLOR.SLATE_900, shade: COLOR.WHITE, width: 65, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            _makeCell("Clădire", { bold: true, color: COLOR.SLATE_500, shade: COLOR.PRIMARY_LIGHT, width: 35, size: 18 }),
            _makeCell(buildingAddr, { color: COLOR.SLATE_900, shade: COLOR.WHITE, width: 65, size: 18 }),
          ],
        }),
        new TableRow({
          children: [
            _makeCell("Scop solicitare", { bold: true, color: COLOR.SLATE_500, shade: COLOR.PRIMARY_LIGHT, width: 35, size: 18 }),
            _makeCell(formData.scopCpe || "—", { color: COLOR.SLATE_900, shade: COLOR.WHITE, width: 65, size: 18 }),
          ],
        }),
        new TableRow({
          children: [
            _makeCell("Servicii dorite", { bold: true, color: COLOR.SLATE_500, shade: COLOR.PRIMARY_LIGHT, width: 35, size: 18 }),
            _makeCell(formData.servicesNeeded || "—", { color: COLOR.SLATE_900, shade: COLOR.WHITE, width: 65, size: 18 }),
          ],
        }),
        new TableRow({
          children: [
            _makeCell("Data solicitării", { bold: true, color: COLOR.SLATE_500, shade: COLOR.PRIMARY_LIGHT, width: 35, size: 18 }),
            _makeCell(dateStr, { color: COLOR.SLATE_900, shade: COLOR.WHITE, width: 65, size: 18 }),
          ],
        }),
      ],
    }),

    // Footer copertă
    new Paragraph({ spacing: { before: 800, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Mc 001-2022 · Ord. MDLPA 348/2026 · GDPR Reg. UE 2016/679", size: 14, italics: true, color: COLOR.SLATE_500 }),
      ],
    }),
  ];

  // ── Secțiuni de conținut
  const sectionChildren = [];

  const LABEL_MAP = {
    identity:     { icon: "👤", label: "Identificare Proprietar" },
    building:     { icon: "🏠", label: "Date Clădire" },
    purpose:      { icon: "🎯", label: "Scop și Servicii Solicitate" },
    buildingInfo: { icon: "🔧", label: "Detalii Clădire (opțional)" },
    documents:    { icon: "📎", label: "Documente Disponibile" },
    confirmation: { icon: "✅", label: "Confirmare și Observații" },
  };

  Object.entries(SECTIONS).forEach(([key, section]) => {
    const meta = LABEL_MAP[key] || { icon: section.icon || "", label: section.label };
    const filledFields = section.fields.filter(
      f => f.type !== "checkbox" && formData[f.id] !== undefined && formData[f.id] !== "",
    );
    const checkboxFields = section.fields.filter(
      f => f.type === "checkbox",
    );

    sectionChildren.push(_makeSectionHeader(meta.icon, meta.label));

    if (filledFields.length === 0 && checkboxFields.length === 0) {
      sectionChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: "(nicio dată completată)", italics: true, color: COLOR.SLATE_500, size: 18 })],
        }),
      );
      return;
    }

    if (filledFields.length > 0) {
      sectionChildren.push(
        _makeTable(
          filledFields.map((f, i) => _makeDataRow(f.label, String(formData[f.id] ?? "—"), i % 2 === 0)),
        ),
      );
    }

    // Checkbox-uri (da/nu vizual)
    checkboxFields.forEach(f => {
      const checked = !!formData[f.id];
      const short = f.label.length > 90 ? f.label.slice(0, 90) + "…" : f.label;
      sectionChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({ text: checked ? "☑  " : "☐  ", size: 20, color: checked ? COLOR.PRIMARY : COLOR.RED }),
            new TextRun({ text: short, size: 18, color: COLOR.SLATE_700, bold: checked }),
          ],
        }),
      );
    });
  });

  // Notă finală
  sectionChildren.push(
    new Paragraph({
      spacing: { before: 600, after: 0 },
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Document generat de Zephren — ${new Date().toLocaleString("ro-RO")}`,
          size: 16, italics: true, color: COLOR.SLATE_500,
        }),
      ],
    }),
  );

  // ── Asamblare document
  const doc = new Document({
    sections: [
      // Secțiunea 1: copertă (fără header/footer)
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 850, bottom: 1134, left: 850 },
          },
        },
        children: coverChildren,
      },
      // Secțiunea 2: conținut (cu header/footer)
      {
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 850, bottom: 1134, left: 850 },
          },
        },
        children: sectionChildren,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const safeOwner = (formData.ownerName || "client")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").toLowerCase().slice(0, 30);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fisa-solicitare-${safeOwner}-${getTimestamp()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Date demo formular client
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_DATA = {
  // Identitate
  ownerType: "Persoană Fizică (PF)",
  ownerName: "Ionescu Maria",
  ownerCNP: "2780315080045",
  ownerCUI: "",
  ownerAddress: "Str. Florilor nr. 12, ap. 3",
  ownerCity: "Brașov",
  ownerEmail: "maria.ionescu@gmail.com",
  ownerPhone: "0721 234 567",

  // Clădire
  buildingAddress: "Str. Principală nr. 45",
  buildingLocality: "Brașov",
  buildingCounty: "Brașov",
  buildingType: "Casă unifamilială",
  usefulArea: 142,
  constructionYear: 1978,
  nFloors: 2,
  hasBasement: "Nu",
  hasMansard: "Nu",
  cadastralNumber: "123456",
  landBook: "CF nr. 123456 Brașov",

  // Scop
  scopCpe: "Vânzare imobil",
  servicesNeeded: "CPE + Audit energetic complet",
  urgency: "Moderat urgentă (1 săptămână)",

  // Detalii clădire
  heatingType: "Gaz natural (centrală proprie)",
  windowsReplaced: "Da — după 2005",
  hasPV: "Nu",
  hasSolarThermal: "Nu",
  hasAC: "Da — în unele camere",
  buildingCondition: "Satisfăcătoare — necesită mici reparații",
  lastRenovationYear: 2010,

  // Documente
  hasPropertyAct: "Da — disponibil",
  hasCF: "Da — eliberat recent (30 zile)",
  hasArchitecturalPlan: "Da — complet",
  hasTechnicalBook: "Nu",
  hasEnergyBills: "Da — ultimii 3 ani",
  hasBuildingPermit: "Nu este cazul",

  // Confirmare
  gdprConsent: true,
  dataCorrect: true,
  notesAndObservations: "Clădire construită înainte de 1980, fără izolație termică pe pereții exteriori. Accesul se face prin poarta din spate — cheia la vecin (Popescu, apt. 2).",
};
