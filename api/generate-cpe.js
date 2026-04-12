/**
 * CPE Generator (Certificat Performanță Energetică)
 * Compliant with MDLPA 16/2023
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const prompt = `Generează certificat de performanță energetică conform MDLPA 16/2023.

Date audit:
${JSON.stringify(data, null, 2)}

Returnează JSON cu:
- certificat_id
- data_emiterii
- perioada_valabilitate
- energia_primara_kWh_m2_an
- clasa_energetica
- recomandari_principale (max 5)`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);

    return res.status(200).json({
      success: true,
      type: 'cpe',
      document: jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text },
    });
  } catch (error) {
    console.error('CPE generation error:', error);
    return res.status(500).json({
      error: 'CPE generation failed',
      details: error.message,
    });
  }
}
