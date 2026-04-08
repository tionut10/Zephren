/**
 * exportUtils.js - Funcții export date audit energetic
 * JSON, CSV, TXT Checklist
 */

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
