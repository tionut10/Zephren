/**
 * Unified Document Generator
 * Generates CPE, Audit Reports, and other documents
 * Consolidates generate-cpe.py + generate-audit-report.py
 * Routes requests to appropriate generator based on document type
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Dispatch to appropriate document generator
 * Types: cpe, audit_report, annexa_1, annexa_2
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;

  if (!type || !data) {
    return res.status(400).json({
      error: 'Missing type or data',
      supported_types: ['cpe', 'audit_report', 'annexa_1', 'annexa_2'],
    });
  }

  try {
    let result;

    switch (type.toLowerCase()) {
      case 'cpe':
        result = await generateCPE(data);
        break;
      case 'audit_report':
        result = await generateAuditReport(data);
        break;
      case 'annexa_1':
        result = await generateAnnexA1(data);
        break;
      case 'annexa_2':
        result = await generateAnnexA2(data);
        break;
      default:
        return res.status(400).json({
          error: `Unsupported document type: ${type}`,
          supported: ['cpe', 'audit_report', 'annexa_1', 'annexa_2'],
        });
    }

    return res.status(200).json({
      success: true,
      type,
      document: result,
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      details: error.message,
    });
  }
}

/**
 * Generate CPE (Certificat Performanță Energetică)
 * Compliant with MDLPA 16/2023
 */
async function generateCPE(data) {
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

    return jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text };
  } catch (err) {
    throw new Error(`CPE generation failed: ${err.message}`);
  }
}

/**
 * Generate Audit Report
 */
async function generateAuditReport(data) {
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

    return jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text };
  } catch (err) {
    throw new Error(`Audit report generation failed: ${err.message}`);
  }
}

/**
 * Generate Annexa 1: Current Building State
 */
async function generateAnnexA1(data) {
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

    return jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text };
  } catch (err) {
    throw new Error(`Annexa 1 generation failed: ${err.message}`);
  }
}

/**
 * Generate Annexa 2: Recommended Measures
 */
async function generateAnnexA2(data) {
  try {
    const prompt = `Generează Annexa 2 (Măsuri de ameliorare energetică) conform Ord. MDLPA 16/2023.

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

    return jsonMatch ? JSON.parse(jsonMatch[0]) : { status: 'generated', raw: textContent.text };
  } catch (err) {
    throw new Error(`Annexa 2 generation failed: ${err.message}`);
  }
}
