/**
 * Export pașaport renovare ca document DOCX A4 portret.
 * Format obligatoriu conform feedback proiect: 11906 x 16838 DXA (A4 portret).
 */

function defaultFilename(passport) {
  const id = (passport?.passportId || "nou").slice(0, 8);
  const date = (passport?.timestamp || new Date().toISOString()).slice(0, 10);
  return `pasaport_renovare_${id}_${date}.docx`;
}

function fmtNum(v, decimals = 0) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function buildKeyValueRows(Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, rows) {
  const tableRows = rows.map(
    ([k, v]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(k), bold: true, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(v), size: 18 })],
              }),
            ],
          }),
        ],
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "EEEEEE" },
    },
  });
}

export async function exportPassportDOCX(passport, options = {}) {
  const { filename } = options;
  const {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    AlignmentType,
    PageOrientation,
    WidthType,
    BorderStyle,
    Packer,
  } = await import("docx");

  const buildTable = (rows) =>
    buildKeyValueRows(Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, rows);

  const b = passport.building || {};
  const base = passport.baseline || {};
  const target = passport.targetState || {};
  const fin = passport.financial || {};
  const road = passport.roadmap || {};
  const audit = passport.auditor || {};

  const sectionChildren = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "PAȘAPORT DE RENOVARE CLĂDIRE",
          bold: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Conform EPBD 2024/1275 Art. 12 + L.238/2024  |  ID: ${passport.passportId}`,
          size: 18,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "1. Identificare clădire", bold: true })],
    }),
    buildTable([
      ["Denumire", b.name || "—"],
      ["Adresă", b.address || "—"],
      ["Județ", b.county || "—"],
      ["Nr. cadastral", b.cadastralNumber || "—"],
      ["Categorie", b.category || "—"],
      ["Suprafață utilă", `${fmtNum(b.areaUseful, 1)} m²`],
      ["An construcție", b.yearBuilt ?? "—"],
      ["Zona climatică", b.climateZone || "—"],
      ["Regim înălțime", b.heightRegime || "—"],
      ["Apartamente", b.apartments ?? "—"],
      ["Protejat patrimoniu", b.protectedStatus ? "DA" : "Nu"],
      ["CPE anterior", b.cpePreviousNumber || "—"],
    ]),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "2. Stare energetică inițială (baseline)", bold: true })],
    }),
    buildTable([
      ["Data baseline", base.date || "—"],
      ["EP total", `${fmtNum(base.ep_total, 1)} kWh/(m²·an)`],
      ["EP neregenerabil", `${fmtNum(base.ep_nren, 1)} kWh/(m²·an)`],
      ["EP regenerabil", `${fmtNum(base.ep_ren, 1)} kWh/(m²·an)`],
      ["CO₂ total", `${fmtNum(base.co2, 2)} kg/(m²·an)`],
      ["Clasă energetică", base.energyClass || "—"],
      ["Cotă RER", `${fmtNum(base.rer_pct, 1)} %`],
      ["Conform MEPS 2030", base.meps2030_compliant ? "DA" : "Nu"],
      ["Conform MEPS 2033", base.meps2033_compliant ? "DA" : "Nu"],
      ["CPE nr.", base.cpeNumber || "—"],
    ]),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "3. Plan de renovare etapizat", bold: true })],
    }),
    buildTable([
      ["Strategie", road.strategy || "—"],
      ["Durată totală plan", `${road.totalYears || 0} ani`],
      ["Buget anual", `${fmtNum(road.annualBudgetRON, 0)} RON`],
      ["Preț energie", `${fmtNum(road.energyPriceRON, 2)} RON/kWh`],
      ["Rată actualizare", `${fmtNum((road.discountRate || 0) * 100, 1)} %`],
      ["Nr. faze", String((road.phases || []).length)],
    ]),
    new Paragraph({ text: "" }),

    ...(road.phases || []).flatMap((p, idx) => [
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [
          new TextRun({
            text: `Faza ${idx + 1} — Anul ${p.year} — Clasă ${p.class_after}`,
            bold: true,
          }),
        ],
      }),
      buildTable([
        ["Cost fază", `${fmtNum(p.phaseCost_RON, 0)} RON`],
        ["Cost cumulativ", `${fmtNum(p.cumulativeCost_RON, 0)} RON`],
        ["EP după", `${fmtNum(p.ep_after, 1)} kWh/(m²·an)`],
        ["Economie anuală", `${fmtNum(p.annualSaving_RON, 0)} RON/an`],
        [
          "MEPS 2030",
          p.mepsComplianceAfterPhase?.meps2030 ? "atins" : "nu încă",
        ],
        [
          "MEPS 2033",
          p.mepsComplianceAfterPhase?.meps2033 ? "atins" : "nu încă",
        ],
        [
          "Măsuri",
          (p.measures || []).map((m) => `${m.name} (−${fmtNum(m.ep_reduction_kWh_m2, 1)} kWh)`).join("; ") || "—",
        ],
      ]),
      new Paragraph({ text: "" }),
    ]),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "4. Stare țintă post-renovare", bold: true })],
    }),
    buildTable([
      ["EP țintă", `${fmtNum(target.ep_target, 1)} kWh/(m²·an)`],
      ["Clasă țintă", target.energyClass_target || "—"],
      ["Conform nZEB", target.nzebCompliant ? "DA" : "Nu"],
      ["Conform cost-optimal (≤50 kWh)", target.costOptimalCompliant ? "DA" : "Nu"],
      ["Țintă MEPS 2030", target.mepsComplianceTarget?.meps2030 ? "DA" : "Nu"],
      ["Țintă MEPS 2033", target.mepsComplianceTarget?.meps2033 ? "DA" : "Nu"],
    ]),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "5. Analiză financiară", bold: true })],
    }),
    buildTable([
      ["Investiție totală", `${fmtNum(fin.totalInvestment_RON, 0)} RON`],
      ["Grant total", `${fmtNum(fin.totalGrant_RON, 0)} RON`],
      ["Investiție netă", `${fmtNum(fin.netInvestment_RON, 0)} RON`],
      ["NPV 30 ani", `${fmtNum(fin.npv_30years_RON, 0)} RON`],
      ["IRR", `${fmtNum(fin.irr_pct, 1)} %`],
      ["Payback simplu", `${fmtNum(fin.paybackSimple_years, 1)} ani`],
      ["Payback actualizat", `${fmtNum(fin.paybackDiscounted_years, 1)} ani`],
      ["Perspectivă", fin.perspective || "financial"],
      [
        "Programe finanțare",
        Array.isArray(fin.fundingPrograms) && fin.fundingPrograms.length > 0
          ? fin.fundingPrograms.join("; ")
          : "—",
      ],
    ]),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "6. Istoric modificări pașaport", bold: true })],
    }),
    ...(passport.history || []).map(
      (h, i) =>
        new Paragraph({
          children: [
            new TextRun({
              text: `${i + 1}. ${h.timestamp} — ${h.changedBy} — ${h.changeReason || "—"} (v${h.version})`,
              size: 18,
            }),
          ],
        })
    ),
    new Paragraph({ text: "" }),

    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "7. Auditor energetic", bold: true })],
    }),
    buildTable([
      ["Nume", audit.name || "—"],
      ["Nr. atestat", audit.certNumber || "—"],
      ["Categorie atestare", audit.category || "—"],
      ["Firmă", audit.firm || "—"],
      ["Contact", audit.contact || "—"],
    ]),
    new Paragraph({ text: "" }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Document generat ${new Date().toLocaleString("ro-RO")} de Zephren Energy Calculator. Referințe: EPBD 2024/1275 Art. 12 + Anexa VIII, L.238/2024, Ord. MDLPA 16/2023.`,
          size: 14,
          color: "999999",
          italics: true,
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            // A4 portret: 11906 x 16838 DXA (conform feedback proiect)
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2 cm
          },
        },
        children: sectionChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fname = filename || defaultFilename(passport);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { size: blob.size, filename: fname };
}
