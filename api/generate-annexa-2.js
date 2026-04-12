/**
 * Anexa 2 Generator: Măsuri de ameliorare energetică
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
    const prompt = `Generează Anexa 2 (Măsuri de ameliorare energetică) conform Ord. MDLPA 16/2023.

Date audit:
${JSON.stringify(data, null, 2)}

Returnează JSON cu:
- masuri_prioritare (min 3)
- costuri_estimate
- durata_implementare_luni
- reducere_consum_anual_procent
- perioada_amortizare_ani
- impactul_asupra_confortului`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
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
      type: 'annexa_2',
      document: jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text },
    });
  } catch (error) {
    console.error('Annexa 2 generation error:', error);
    return res.status(500).json({
      error: 'Annexa 2 generation failed',
      details: error.message,
    });
  }
}
