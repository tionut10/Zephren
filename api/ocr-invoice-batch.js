/**
 * Invoice Batch OCR Handler
 * Processes utility invoice images (gas, electricity, water)
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { images = [] } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Missing images array' });
  }

  try {
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

    return res.status(200).json({
      success: true,
      type: 'invoice',
      results,
      processed: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Invoice OCR error:', error);
    return res.status(500).json({
      error: 'Invoice OCR processing failed',
      details: error.message,
    });
  }
}
