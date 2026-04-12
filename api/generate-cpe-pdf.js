/**
 * CPE PDF Generator
 * Converts CPE JSON output to professional PDF per MDLPA 16/2023
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cpeData, buildingData } = req.body;

  if (!cpeData) {
    return res.status(400).json({ error: 'Missing cpeData' });
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(25, 45, 85); // Dark blue
    doc.text('CERTIFICAT DE PERFORMANȚĂ ENERGETICĂ', pageWidth / 2, y, {
      align: 'center',
    });
    y += 10;

    // Regulatory reference
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Conform MDLPA 16/2023', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Certificate ID and issue date
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(
      `ID Certificat: ${cpeData.certificat_id || 'N/A'}`,
      margin,
      y
    );
    y += 7;
    doc.text(
      `Data Emiterii: ${cpeData.data_emiterii || 'N/A'}`,
      margin,
      y
    );
    y += 7;
    if (cpeData.perioada_valabilitate) {
      doc.text(
        `Perioada Valabilitate: ${cpeData.perioada_valabilitate}`,
        margin,
        y
      );
      y += 7;
    }
    y += 8;

    // Building Information Section
    if (buildingData) {
      doc.setFontSize(11);
      doc.setTextColor(25, 45, 85);
      doc.text('INFORMAȚII CLĂDIRE', margin, y);
      y += 8;

      const buildingInfo = [
        ['Adresă', buildingData.adresa || 'N/A'],
        ['Tip Clădire', buildingData.tip_cladire || 'N/A'],
        ['Suprafață Utilă', buildingData.suprafata_utila ? `${buildingData.suprafata_utila} m²` : 'N/A'],
        ['An Construcție', buildingData.an_constructie || 'N/A'],
      ];

      doc.autoTable({
        startY: y,
        head: [['Parametru', 'Valoare']],
        body: buildingInfo,
        margin: margin,
        headStyles: { fillColor: [25, 45, 85], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [240, 245, 250] },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: pageWidth - 2 * margin - 50 } },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Energy Performance Section
    doc.setFontSize(11);
    doc.setTextColor(25, 45, 85);
    doc.text('PERFORMANȚĂ ENERGETICĂ', margin, y);
    y += 8;

    // Energy class box (prominent)
    const classColor = getEnergyClassColor(cpeData.clasa_energetica);
    doc.setFillColor(...classColor);
    doc.rect(margin, y, 40, 20, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(cpeData.clasa_energetica || 'N/A', margin + 20, y + 13, {
      align: 'center',
    });

    // Energy values
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Energie Primară: ${cpeData.energia_primara_kWh_m2_an || 'N/A'} kWh/m²/an`,
      margin + 50,
      y + 6
    );
    doc.text(
      `Clasă Energetică: ${cpeData.clasa_energetica || 'N/A'}`,
      margin + 50,
      y + 13
    );

    y += 25;

    // Recommendations Section
    if (cpeData.recomandari_principale && cpeData.recomandari_principale.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(25, 45, 85);
      doc.text('RECOMANDĂRI PRINCIPALE', margin, y);
      y += 8;

      cpeData.recomandari_principale.forEach((rec, idx) => {
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        const wrappedText = doc.splitTextToSize(
          `${idx + 1}. ${rec}`,
          pageWidth - 2 * margin - 5
        );
        doc.text(wrappedText, margin + 3, y);
        y += wrappedText.length * 5 + 3;
      });

      y += 5;
    }

    // Footer
    y = pageHeight - margin - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toISOString().split('T')[0]}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    doc.text(
      `Energy App v3.4 | MDLPA 16/2023 Compliant`,
      pageWidth / 2,
      y + 5,
      { align: 'center' }
    );

    // Return PDF as base64
    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return res.status(200).json({
      success: true,
      type: 'cpe-pdf',
      filename: `CPE_${cpeData.certificat_id || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`,
      pdf: pdfBase64,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CPE PDF generation error:', error);
    return res.status(500).json({
      error: 'CPE PDF generation failed',
      details: error.message,
    });
  }
}

/**
 * Get color for energy class
 */
function getEnergyClassColor(energyClass) {
  const colorMap = {
    'A+': [0, 160, 80],    // Green
    'A': [50, 180, 80],    // Light green
    'B': [100, 200, 80],   // Yellow-green
    'C': [255, 192, 0],    // Yellow
    'D': [255, 128, 0],    // Orange
    'E': [255, 64, 0],     // Dark orange
    'F': [200, 0, 0],      // Red
    'G': [180, 0, 0],      // Dark red
  };

  return colorMap[energyClass] || [128, 128, 128]; // Gray default
}
