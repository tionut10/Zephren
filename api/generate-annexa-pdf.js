/**
 * Anexa PDF Generator (Anexa 1 & 2)
 * Converts Anexa JSON output to professional PDF per MDLPA 16/2023
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { anexa1Data, anexa2Data, buildingData } = req.body;

  if (!anexa1Data && !anexa2Data) {
    return res.status(400).json({ error: 'Missing anexa1Data or anexa2Data' });
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // ANEXA 1 - Building State Before Renovation
    if (anexa1Data) {
      doc.setFontSize(14);
      doc.setTextColor(25, 45, 85);
      doc.text('ANEXA 1', margin, y);
      doc.setFontSize(12);
      doc.text('Starea clădirii înainte de renovare', margin + 30, y);
      y += 12;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Conform Ord. MDLPA 16/2023', margin, y);
      y += 12;

      // Building info
      if (buildingData) {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('Identificarea clădirii:', margin, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        const buildingInfo = [
          ['Adresă', buildingData.adresa || 'N/A'],
          ['Tip', buildingData.tip_cladire || 'N/A'],
          ['Suprafață utilă', buildingData.suprafata_utila ? `${buildingData.suprafata_utila} m²` : 'N/A'],
        ];

        doc.autoTable({
          startY: y,
          head: [['Parametru', 'Valoare']],
          body: buildingInfo,
          margin: margin,
          headStyles: { fillColor: [100, 140, 180], textColor: [255, 255, 255] },
          bodyStyles: { textColor: [40, 40, 40] },
          columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: pageWidth - 2 * margin - 50 } },
        });

        y = doc.lastAutoTable.finalY + 10;
      }

      // General description
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, 'bold');
      doc.text('Descrierea generală a stării clădirii:', margin, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const descWrapped = doc.splitTextToSize(
        anexa1Data.descriere_generala || 'N/A',
        pageWidth - 2 * margin - 5
      );
      doc.text(descWrapped, margin + 3, y);
      y += descWrapped.length * 4 + 8;

      // Current systems
      if (anexa1Data.sisteme_actuale) {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('Sisteme actuale:', margin, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const systemsWrapped = doc.splitTextToSize(
          Array.isArray(anexa1Data.sisteme_actuale)
            ? anexa1Data.sisteme_actuale.join('\n')
            : String(anexa1Data.sisteme_actuale),
          pageWidth - 2 * margin - 5
        );
        doc.text(systemsWrapped, margin + 3, y);
        y += systemsWrapped.length * 4 + 8;
      }

      // Current consumption
      if (anexa1Data.consumuri_actuale_kwh_an) {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('Consum energetic anual actual:', margin, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(220, 53, 69); // Red
        doc.text(
          `${anexa1Data.consumuri_actuale_kwh_an} kWh/an`,
          margin,
          y
        );
        y += 12;
      }

      // Add page break for Anexa 2
      if (anexa2Data) {
        doc.addPage();
        y = margin;
      }
    }

    // ANEXA 2 - Energy Improvement Measures
    if (anexa2Data) {
      doc.setFontSize(14);
      doc.setTextColor(25, 45, 85);
      doc.text('ANEXA 2', margin, y);
      doc.setFontSize(12);
      doc.text('Măsuri de ameliorare energetică', margin + 35, y);
      y += 12;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Conform Ord. MDLPA 16/2023', margin, y);
      y += 12;

      // Priority measures
      if (anexa2Data.masuri_prioritare) {
        doc.setFontSize(10);
        doc.setTextColor(25, 45, 85);
        doc.setFont(undefined, 'bold');
        doc.text('Măsuri prioritare:', margin, y);
        y += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const measures = Array.isArray(anexa2Data.masuri_prioritare)
          ? anexa2Data.masuri_prioritare
          : [anexa2Data.masuri_prioritare];

        measures.forEach((measure, idx) => {
          const wrappedText = doc.splitTextToSize(
            `${idx + 1}. ${measure}`,
            pageWidth - 2 * margin - 5
          );
          doc.text(wrappedText, margin + 3, y);
          y += wrappedText.length * 4 + 3;
        });

        y += 5;
      }

      // Summary metrics table
      const metricsData = [];

      if (anexa2Data.costuri_estimate) {
        metricsData.push([
          'Cost estimat',
          typeof anexa2Data.costuri_estimate === 'object'
            ? `${anexa2Data.costuri_estimate.total || 0} RON`
            : `${anexa2Data.costuri_estimate} RON`,
        ]);
      }

      if (anexa2Data.durata_implementare_luni) {
        metricsData.push([
          'Durată implementare',
          `${anexa2Data.durata_implementare_luni} luni`,
        ]);
      }

      if (anexa2Data.reducere_consum_anual_procent) {
        metricsData.push([
          'Reducere consum anual',
          `${anexa2Data.reducere_consum_anual_procent}%`,
        ]);
      }

      if (anexa2Data.perioada_amortizare_ani) {
        metricsData.push([
          'Perioada amortizare',
          `${anexa2Data.perioada_amortizare_ani} ani`,
        ]);
      }

      if (metricsData.length > 0) {
        doc.autoTable({
          startY: y,
          head: [['Parametru', 'Valoare']],
          body: metricsData,
          margin: margin,
          headStyles: { fillColor: [25, 45, 85], textColor: [255, 255, 255] },
          bodyStyles: { textColor: [40, 40, 40] },
          alternateRowStyles: { fillColor: [240, 245, 250] },
          columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: pageWidth - 2 * margin - 70 } },
        });

        y = doc.lastAutoTable.finalY + 10;
      }

      // Impact on comfort
      if (anexa2Data.impactul_asupra_confortului) {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont(undefined, 'bold');
        doc.text('Impactul asupra confortului:', margin, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const impactWrapped = doc.splitTextToSize(
          String(anexa2Data.impactul_asupra_confortului),
          pageWidth - 2 * margin - 5
        );
        doc.text(impactWrapped, margin + 3, y);
        y += impactWrapped.length * 4 + 8;
      }
    }

    // Footer on last page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageHeight - margin + 5;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${i}/${totalPages}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );
    }

    // Return PDF as base64
    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return res.status(200).json({
      success: true,
      type: 'anexa-pdf',
      filename: `Anexe_${new Date().toISOString().split('T')[0]}.pdf`,
      pdf: pdfBase64,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Anexa PDF generation error:', error);
    return res.status(500).json({
      error: 'Anexa PDF generation failed',
      details: error.message,
    });
  }
}
