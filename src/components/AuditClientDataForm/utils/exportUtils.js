/**
 * exportUtils.js - Funcții export date audit energetic
 * JSON, CSV, TXT Checklist, DOCX
 */
import { getCategoryLabel } from "../../../data/anexa6-mapping.js";
import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, Packer
} from "docx";

/**
 * Formatează data curentă pentru nume fișier
 */
function getTimestamp() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Export date la JSON
 */
export function exportToJSON(formData) {
  const dataStr = JSON.stringify(formData, null, 2);
  const element = document.createElement("a");
  element.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(dataStr));
  element.setAttribute("download", `audit-client-data-${getTimestamp()}.json`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Export date la CSV
 */
export function exportToCSV(formData) {
  const flatData = {};
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      flatData[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }
  });

  const headers = Object.keys(flatData);
  const values = headers.map(h => `"${String(flatData[h]).replace(/"/g, '""')}"`);
  const csv = [headers.join(","), values.join(",")].join("\n");

  const element = document.createElement("a");
  element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  element.setAttribute("download", `audit-client-data-${getTimestamp()}.csv`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Export checklist în format TXT
 */
export function downloadChecklist(completionStatus, SECTIONS) {
  const checklistText = Object.entries(SECTIONS)
    .map(([key, section]) => {
      const status = completionStatus[key] || { completed: 0, required: 0 };
      const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 0;
      return `${section.label}: ${status.completed}/${status.required} câmpuri obligatorii (${percentage}%)`;
    })
    .join("\n");

  const totalCompleted = Object.values(completionStatus).reduce((a, b) => a + (b.completed || 0), 0);
  const totalRequired = Object.values(completionStatus).reduce((a, b) => a + (b.required || 0), 0);
  const totalPercentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

  const doc = `CHECKLIST AUDIT ENERGETIC
Data: ${new Date().toLocaleDateString('ro-RO')}
${new Array(50).fill("=").join("")}

PROGRES PE ETAPE:
${checklistText}

${new Array(50).fill("=").join("")}
PROGRES TOTAL: ${totalCompleted} / ${totalRequired} câmpuri obligatorii
Procent: ${totalPercentage}%
${new Array(50).fill("=").join("")}

Generat: ${new Date().toLocaleString('ro-RO')}
`;

  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(doc));
  element.setAttribute("download", `checklist-audit-${getTimestamp()}.txt`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Formatează date pentru PDF export (pentru viitor)
 */
export function formatDataForPDF(formData, completionStatus, SECTIONS) {
  return {
    header: {
      title: "AUDIT ENERGETIC - FORMULAR DATE",
      date: new Date().toLocaleDateString('ro-RO'),
      time: new Date().toLocaleTimeString('ro-RO')
    },
    sections: Object.entries(SECTIONS).map(([key, section]) => ({
      key,
      label: section.label,
      icon: section.icon,
      completion: completionStatus[key],
      fields: section.fields.map(field => ({
        id: field.id,
        label: field.label,
        value: formData[field.id] || "-",
        required: field.required
      }))
    })),
    summary: {
      totalCompleted: Object.values(completionStatus).reduce((a, b) => a + (b.completed || 0), 0),
      totalRequired: Object.values(completionStatus).reduce((a, b) => a + (b.required || 0), 0)
    }
  };
}

/**
 * Validează completare date înainte de export
 */
export function validateBeforeExport(formData, completionStatus, SECTIONS) {
  const errors = [];

  Object.entries(SECTIONS).forEach(([key, section]) => {
    const requiredFields = section.fields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !formData[f.id]);

    if (missingRequired.length > 0) {
      errors.push({
        section: section.label,
        missingCount: missingRequired.length,
        fields: missingRequired.map(f => f.label)
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generează raport text detaliat pentru completare date
 */
export function generateDetailedReport(formData, completionStatus, SECTIONS) {
  let report = "RAPORT DETALIAT COLECTARE DATE AUDIT ENERGETIC\n";
  report += `Generated: ${new Date().toLocaleString('ro-RO')}\n`;
  report += "=".repeat(70) + "\n\n";

  let totalFields = 0;
  let completedFields = 0;

  Object.entries(SECTIONS).forEach(([key, section]) => {
    const status = completionStatus[key];
    const percentage = status.required > 0 ? Math.round((status.completed / status.required) * 100) : 0;

    report += `\n${section.icon} ${section.label.toUpperCase()}\n`;
    report += "-".repeat(70) + "\n";
    report += `Progres: ${status.completed}/${status.required} obligatori (${percentage}%)\n`;
    report += `Total: ${status.completedTotal}/${status.total} câmpuri\n\n`;

    section.fields.forEach(field => {
      const value = formData[field.id];
      const isCompleted = !!value;
      const status_icon = isCompleted ? "✓" : field.required ? "✗" : "○";

      totalFields++;
      if (isCompleted) completedFields++;

      report += `  ${status_icon} ${field.label}: `;
      report += isCompleted ? `"${value}"` : "(necompletat)";
      report += field.required ? " [OBLIGATORIU]" : "\n";
      report += "\n";
    });
  });

  report += "\n" + "=".repeat(70) + "\n";
  report += `TOTAL: ${completedFields}/${totalFields} câmpuri completate\n`;
  report += `Procent: ${Math.round((completedFields / totalFields) * 100)}%\n`;

  return report;
}

/**
 * Date demo pentru pre-populare formular (exemplu fictiv)
 */
export const DEMO_DATA = {
  // Documentație
  ownerName: "Ionescu Maria",
  ownerEmail: "maria.ionescu@gmail.com",
  ownerPhone: "0721 234 567",
  buildingAddress: "Str. Florilor nr. 12, Brașov, jud. Brașov",
  propertyAct: "Contract vânzare-cumpărare nr. 1234/2005",
  constructionYear: 1978,
  urbanismCert: "CU nr. 45/2023",
  buildingAuthority: "AC nr. 123/1978",
  technicalBook: "Parțial",
  planArchitectural: "Parter+niveluri",
  buildingTipAnex6: "Rezidențial",
  buildingSubtipAnex6: "Rezidențial – unifamilial",
  latitude: 45.6427,
  longitude: 25.5887,
  cadastralNumber: "123456",
  landBook: "CF nr. 123456 Brașov",
  areaBuilt: 210,
  nApartments: 1,
  // Anvelopă
  totalBuildingArea: 185,
  usefulArea: 142,
  buildingVolume: 490,
  externalWallMaterial: "Cărămidă GVP 30 cm",
  externalWallThickness: 30,
  insulationThickness: 0,
  windowsType: "Dublu vitraj",
  windowsYear: 2010,
  frameProfile: "PVC",
  roofType: "Țiglă ceramică pe șarpantă lemn",
  roofInsulation: 10,
  thermalBridgesPresent: "Da",
  // Termice
  heatingSystem: "Cazan gaz",
  boilerYear: 2008,
  boilerPower: 24,
  boilerEfficiency: 89,
  hotWaterSystem: "Individual (gaz)",
  hotWaterStorage: 80,
  hasCooling: "Aer condiționat",
  coolingSystemType: "Split 9000 BTU dormitor + living",
  gasConsumptionYearly: 1850,
  heatingOilConsumption: 0,
  ventilationType: "Naturală",
  ventilationDetails: "Grile ventilație baie + bucătărie",
  // Electrice
  electricityConsumptionYearly: 3200,
  hasPV: "Nu",
  pvInstalledPower: 0,
  pvAnnualProduction: 0,
  hasSolarThermal: "Nu",
  lightingType: "Mixă",
  hasSmartMetering: "Nu",
  // Măsurători
  inspectionDate: "2026-04-24",
  interiorTemperature: 21,
  exteriorTemperature: 8,
  relativeHumidity: 65,
  envelopeCondition: "Satisfăcătoare",
  roofCondition: "Necesită reparații minore",
  windowsCondition: "Bună",
  moistureIssues: "Ușoare",
  thermalPhotosAvailable: "Nu",
  infiltrationTests: "Nu",
  // Administrativ
  auditorName: "Popescu Alexandru",
  auditorRegistry: "AE-BV-00123",
  auditorCompany: "ZEPHREN S.R.L.",
  auditType: "CPE obligatoriu",
  occupancyType: "Rezidență permanentă",
  occupantsNumber: 4,
  hasElectricHeating: "Nu",
  financialDocumentsAvailable: "Ultimii 3 ani",
  budgetForRehab: 45000,
  notesAndObservations: "Clădire construită înainte de 1980, fără izolație termică pe pereții exteriori. Podul mansardat parțial utilizabil. Necesită audit termografic complet în sezon rece.",
};

/**
 * Export date la DOCX — Fișă sinteză audit energetic
 */
export async function exportToDOCX(formData, SECTIONS) {
  const labelOf = (sectionKey, fieldId) => {
    const section = SECTIONS[sectionKey];
    if (!section) return fieldId;
    const field = section.fields.find(f => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  const makeRow = (label, value, isHeader = false) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: isHeader ? { fill: "2563EB" } : { fill: "F3F4F6" },
          children: [new Paragraph({
            children: [new TextRun({
              text: label,
              bold: true,
              color: isHeader ? "FFFFFF" : "374151",
              size: 20,
            })],
          })],
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({
              text: String(value || "—"),
              size: 20,
              color: "111827",
            })],
          })],
        }),
      ],
    });

  const sectionChildren = [];

  Object.entries(SECTIONS).forEach(([key, section]) => {
    sectionChildren.push(
      new Paragraph({
        text: `${section.icon || ""} ${section.label}`.trim(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
      })
    );

    const rows = section.fields
      .filter(f => formData[f.id] !== undefined && formData[f.id] !== "")
      .map(f => makeRow(f.label, formData[f.id]));

    if (rows.length === 0) {
      sectionChildren.push(new Paragraph({
        children: [new TextRun({ text: "(nicio dată completată)", italics: true, color: "9CA3AF", size: 20 })],
      }));
    } else {
      sectionChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideH: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideV: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          },
        })
      );
    }
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 portret
          margin: { top: 1134, right: 850, bottom: 1134, left: 850 },
        },
      },
      children: [
        new Paragraph({
          text: "FIȘĂ SINTEZĂ AUDIT ENERGETIC",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: `Data: ${new Date().toLocaleDateString("ro-RO")}`, size: 20, color: "6B7280" }),
            new TextRun({ text: "   |   ", size: 20, color: "9CA3AF" }),
            new TextRun({ text: `Proprietar: ${formData.ownerName || "—"}`, size: 20, color: "6B7280" }),
            new TextRun({ text: "   |   ", size: 20, color: "9CA3AF" }),
            new TextRun({ text: `Adresă: ${formData.buildingAddress || "—"}`, size: 20, color: "6B7280" }),
          ],
        }),
        ...sectionChildren,
        new Paragraph({
          text: `Generat de Zephren — ${new Date().toLocaleString("ro-RO")}`,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
          children: [new TextRun({ text: `Generat de Zephren — ${new Date().toLocaleString("ro-RO")}`, size: 18, color: "9CA3AF", italics: true })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fisa-audit-${formData.ownerName?.replace(/\s+/g, "-").toLowerCase() || "client"}-${getTimestamp()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export registru conform Anexa 6, Ord. MDLPA 348/2026
 * Generează CSV cu structura oficială pentru înregistrare CPE
 * @param {object} formData - Datele din formular audit
 * @param {string} [internalCategory] - Codul categorie intern opțional (RI, RC etc.)
 */
export function exportRegistruAnex6(formData, internalCategory = null) {
  // Determină clasificarea Anexa 6
  let tip = formData.buildingTipAnex6 || "";
  let subtip = "";

  if (formData.buildingSubtipAnex6) {
    // Extrage subtipul din formatul "Rezidențial – unifamilial"
    const parts = formData.buildingSubtipAnex6.split(" – ");
    subtip = parts.length > 1 ? parts[1] : formData.buildingSubtipAnex6;
    if (!tip && parts.length > 1) tip = parts[0];
  }

  // Fallback: mapare din codul intern dacă câmpurile Anexa 6 lipsesc
  if (!tip && internalCategory) {
    const mapped = getCategoryLabel(internalCategory);
    tip = mapped.tip;
    subtip = mapped.subtip;
  }

  const record = {
    "Data export": new Date().toLocaleDateString("ro-RO"),
    "Auditor": formData.auditorName || "",
    "Nr. înregistrare auditor": formData.auditorRegistry || "",
    "Proprietar": formData.ownerName || "",
    "Adresă clădire": formData.buildingAddress || "",
    "An construcție": formData.constructionYear || "",
    "Arie utilă (m²)": formData.usefulArea || formData.totalBuildingArea || "",
    "Tip Anexa 6 (Ord. 348/2026)": tip,
    "Subtip Anexa 6 (Ord. 348/2026)": subtip,
    "Data inspecție": formData.inspectionDate || "",
    "Tip audit": formData.auditType || "",
  };

  const headers = Object.keys(record);
  const values = headers.map(h => `"${String(record[h]).replace(/"/g, '""')}"`);
  const csv = [headers.join(","), values.join(",")].join("\n");

  const element = document.createElement("a");
  element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  element.setAttribute("download", `registru-anexa6-${getTimestamp()}.csv`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
