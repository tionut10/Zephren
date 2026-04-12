/**
 * OCR Invoice Batch Processor
 * Digitalizează și validează facturi utilități în batch
 * Scindre din import-document.js pentru a respecta Vercel function limit
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Parse monthly invoice via Claude Vision
 * Input: base64 image (PNG/JPG/PDF) + expected month
 * Output: { month, consumption, price, unit, anomaly }
 */
async function ocrInvoice(imageBase64, month, utilityType = 'gas') {
  try {
    const mediaType = imageBase64.includes('PNG') || imageBase64.includes('png')
      ? 'image/png'
      : 'image/jpeg';

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64.replace(/^data:image\/[^;]+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: `Extrage datele din această factură ${utilityType}. Răspunde JSON:
{
  "month": "${month}",
  "consumption": <number kWh/m³/l>,
  "consumptionUnit": "kWh|m3|l",
  "price": <total EUR>,
  "priceUnit": "EUR",
  "invoiceDate": "YYYY-MM-DD",
  "supplier": "<text>",
  "accountNumber": "<text>",
  "anomaly": null | "description of issue"
}

Dacă nu găsești valori, pune 0. Daca e anomalie (consum anormal, factură dublă, etc), descrie în anomaly.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) throw new Error('No text response from Claude');

    // Parse JSON din răspuns
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return {
      month,
      consumption: 0,
      price: 0,
      anomaly: `OCR failed: ${error.message}`,
      error: true,
    };
  }
}

/**
 * Detectează anomalii de consum (spikes, missing months, zero consumption)
 */
function detectConsumptionAnomalies(invoices) {
  const anomalies = [];

  // Check: missing months
  const months = invoices
    .map(inv => new Date(inv.invoiceDate || `${inv.month}-01`).getMonth())
    .sort((a, b) => a - b);

  for (let i = 0; i < months.length - 1; i++) {
    if (months[i + 1] - months[i] > 1 && months[i + 1] - months[i] !== 11) {
      anomalies.push({
        type: 'missingMonth',
        months: `${months[i] + 1} → ${months[i + 1] + 1}`,
      });
    }
  }

  // Check: consumption spikes (>150% vs median)
  const consumptions = invoices.map(inv => inv.consumption).filter(c => c > 0);
  if (consumptions.length > 2) {
    const median = consumptions.sort((a, b) => a - b)[Math.floor(consumptions.length / 2)];
    invoices.forEach((inv, idx) => {
      if (inv.consumption > median * 1.5) {
        anomalies.push({
          type: 'consumptionSpike',
          month: inv.month,
          value: inv.consumption,
          median,
          percentage: ((inv.consumption / median - 1) * 100).toFixed(0),
        });
      }
    });
  }

  // Check: zero or missing consumption
  invoices.forEach(inv => {
    if (!inv.consumption || inv.consumption === 0) {
      anomalies.push({
        type: 'noConsumption',
        month: inv.month,
      });
    }
  });

  return anomalies;
}

/**
 * Vercel Handler
 * POST /api/ocr-invoice-batch
 * Body: { invoices: [{ image: base64, month, utilityType }] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invoices } = req.body;

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(400).json({ error: 'invoices array required' });
  }

  try {
    // OCR batch
    const results = await Promise.all(
      invoices.map(inv =>
        ocrInvoice(inv.image, inv.month, inv.utilityType || 'gas'),
      ),
    );

    // Detectare anomalii
    const anomalies = detectConsumptionAnomalies(results);

    return res.status(200).json({
      success: true,
      invoices: results,
      anomalies,
      summary: {
        processed: results.length,
        withErrors: results.filter(r => r.error).length,
        anomalyCount: anomalies.length,
        totalConsumption: results.reduce((sum, r) => sum + (r.consumption || 0), 0),
        totalCost: results.reduce((sum, r) => sum + (r.price || 0), 0),
      },
    });
  } catch (error) {
    console.error('OCR batch error:', error);
    return res.status(500).json({
      error: 'Batch processing failed',
      details: error.message,
    });
  }
}
