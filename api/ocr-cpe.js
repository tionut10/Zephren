/**
 * CPE OCR Handler
 * Processes CPE (Certificat Performanță Energetică) images
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

    return res.status(200).json({
      success: true,
      type: 'cpe',
      results,
      processed: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CPE OCR error:', error);
    return res.status(500).json({
      error: 'CPE OCR processing failed',
      details: error.message,
    });
  }
}
