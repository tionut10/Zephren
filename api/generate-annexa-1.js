/**
 * Anexa 1 Generator: Starea clădirii înainte de renovare
 * Conform Ord. MDLPA 16/2023
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
    const prompt = `Generează Anexa 1 (Starea clădirii înainte de renovare) conform Ord. MDLPA 16/2023.

Date clădire:
${JSON.stringify(data, null, 2)}

Returnează JSON cu:
- descriere_generala
- constructie_data_ano
- stare_generala
- sisteme_actuale
- consumuri_actuale_kwh_an`;

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
      type: 'annexa_1',
      document: jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text },
    });
  } catch (error) {
    console.error('Annexa 1 generation error:', error);
    return res.status(500).json({
      error: 'Annexa 1 generation failed',
      details: error.message,
    });
  }
}
