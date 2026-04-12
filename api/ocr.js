/**
 * Unified OCR Handler
 * Processes images using Claude Vision API
 * Consolidates: ocr-cpe.js, ocr-invoice-batch.js
 * Types: cpe (certificate), invoice (utility bills), document (general)
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Main OCR dispatcher
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'invoice', images = [] } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Missing images array' });
  }

  try {
    let results;

    switch (type.toLowerCase()) {
      case 'invoice':
        results = await processInvoices(images);
        break;
      case 'cpe':
        results = await processCPE(images);
        break;
      case 'document':
        results = await processDocuments(images);
        break;
      default:
        return res.status(400).json({
          error: `Unsupported OCR type: ${type}`,
          supported: ['invoice', 'cpe', 'document'],
        });
    }

    return res.status(200).json({
      success: true,
      type,
      results,
      processed: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('OCR error:', error);
    return res.status(500).json({
      error: 'OCR processing failed',
      details: error.message,
    });
  }
}

/**
 * Process utility invoice images
 */
async function processInvoices(images) {
  const results = [];

  for (const img of images) {
    try {
      const { base64, month = 'unknown', utilityType = 'gas' } = img;

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
                  media_type: 'image/jpeg',
                  data: base64.replace(/^data:image\/[^;]+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: `Extrage datele din această factură ${utilityType}. Răspunde JSON:
{
  "month": "${month}",
  "consumption": <number>,
  "consumptionUnit": "kWh|m3|l",
  "price": <number EUR>,
  "supplier": "<text>",
  "invoiceDate": "YYYY-MM-DD",
  "anomaly": null | "<description>"
}`,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);

      results.push(
        jsonMatch
          ? JSON.parse(jsonMatch[0])
          : { month, error: 'Failed to extract structured data', raw: textContent.text }
      );
    } catch (err) {
      results.push({ error: `Invoice processing failed: ${err.message}` });
    }
  }

  return results;
}

/**
 * Process CPE (Certificat Performanță Energetică) images
 */
async function processCPE(images) {
  const results = [];

  for (const img of images) {
    try {
      const { base64, title = 'CPE Document' } = img;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64.replace(/^data:image\/[^;]+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: `Extrage datele din acest Certificat de Performanță Energetică. Răspunde JSON:
{
  "tip_cladire": "RI|RC|RA|NR|etc",
  "adresa": "<text>",
  "ep_kwh_m2_an": <number>,
  "clasa_energetica": "A+|A|B|C|D|E|F|G",
  "data_eliberarii": "YYYY-MM-DD",
  "auditor_nume": "<text>",
  "recomandari_principale": ["<text>", ...]
}`,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);

      results.push(
        jsonMatch
          ? JSON.parse(jsonMatch[0])
          : { title, error: 'Failed to extract CPE data', raw: textContent.text }
      );
    } catch (err) {
      results.push({ error: `CPE processing failed: ${err.message}` });
    }
  }

  return results;
}

/**
 * Process general documents (architectural drawings, photos, etc.)
 */
async function processDocuments(images) {
  const results = [];

  for (const img of images) {
    try {
      const { base64, hint = 'general building document' } = img;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64.replace(/^data:image\/[^;]+;base64,/, ''),
                },
              },
              {
                type: 'text',
                text: `Analizează acest document de construcție (${hint}). Extrage orice date relevante pentru audit energetic. Răspunde JSON cu ce ai găsit.`,
              },
            ],
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/) || null;

      results.push({
        type: 'document',
        hint,
        extracted_data: jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: textContent.text },
      });
    } catch (err) {
      results.push({ error: `Document processing failed: ${err.message}` });
    }
  }

  return results;
}
