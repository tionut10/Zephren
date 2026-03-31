/**
 * POST /api/ai-assistant
 *
 * Receives a question + building context, calls Anthropic Claude API,
 * and returns an expert answer about Romanian building energy regulations.
 *
 * Uses ANTHROPIC_API_KEY from server environment (not exposed to client).
 */

import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an expert consultant in Romanian building energy performance regulations. You have deep knowledge of:

- Mc 001-2022 (Metodologia de calcul al performantei energetice a cladirilor)
- Legea 238/2024 (Legea privind performanta energetica a cladirilor)
- EPBD 2024/1275 (EU Energy Performance of Buildings Directive recast)
- ISO 52000-1/NA:2023 (Energy performance of buildings — national annex for Romania)

You provide clear, practical answers in Romanian (or English if asked). You reference specific articles, annexes, and calculation methods when relevant. You help energy auditors, architects, and engineers understand requirements, calculation methodology, minimum performance thresholds, nZEB criteria, and compliance pathways.

Always be precise with numbers, formulas, and regulatory references. If you are unsure about a specific detail, say so rather than guessing.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      answer:
        "Cheia API Anthropic nu este configurata. Configurati ANTHROPIC_API_KEY in variabilele de mediu ale serverului.",
      error: true,
    });
  }

  try {
    const { question, context } = req.body || {};

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({ error: "A valid 'question' string is required" });
    }

    // Build context message from building data if provided
    let contextMessage = "";
    if (context && typeof context === "object") {
      const parts = [];
      if (context.building) {
        parts.push(`Cladire: ${JSON.stringify(context.building)}`);
      }
      if (context.energyClass) {
        parts.push(`Clasa energetica: ${context.energyClass}`);
      }
      if (context.ep !== undefined) {
        parts.push(`Energie primara specifica (ep): ${context.ep} kWh/m2/an`);
      }
      if (context.rer !== undefined) {
        parts.push(`RER (rata energie regenerabila): ${context.rer}`);
      }
      if (context.category) {
        parts.push(`Categorie cladire: ${context.category}`);
      }
      if (parts.length > 0) {
        contextMessage = `\n\nContextul proiectului curent:\n${parts.join("\n")}`;
      }
    }

    const userMessage = question + contextMessage;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const answer =
      response.content?.[0]?.type === "text"
        ? response.content[0].text
        : "Nu am putut genera un raspuns.";

    return res.status(200).json({ answer });
  } catch (err) {
    console.error("[api/ai-assistant] Error:", err);

    if (err.status === 401) {
      return res.status(200).json({
        answer: "Cheia API Anthropic este invalida. Verificati ANTHROPIC_API_KEY.",
        error: true,
      });
    }

    if (err.status === 429) {
      return res.status(200).json({
        answer: "Limita de rate atinsa. Incercati din nou in cateva secunde.",
        error: true,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
