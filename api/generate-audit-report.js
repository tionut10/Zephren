/**
 * Audit Report Generator
 * Generează raport audit energetic complet
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
    const prompt = `Generează raport audit energetic complet în limba română.

Date audit:
${JSON.stringify(data, null, 2)}

Returnează JSON cu:
- titlu
- adresa
- data_audit
- durata_audit
- auditor_nume
- constatari_principale
- recomandari_prioritare
- estimare_costuri_implementare`;

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
      type: 'audit_report',
      document: jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text },
    });
  } catch (error) {
    console.error('Audit report generation error:', error);
    return res.status(500).json({
      error: 'Audit report generation failed',
      details: error.message,
    });
  }
}
