/**
 * POST /api/ocr-cpe
 * Receives a CPE image (base64), sends to Claude Vision API,
 * extracts building data (address, year, EP, class, etc.)
 */
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError, checkFileSize } from "./_middleware/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth + rate limit
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const limit = checkRateLimit(auth.user.id, 10);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    // Validate file size (max 5 MB decoded)
    if (!checkFileSize(image)) {
      return res.status(413).json({ error: "Imaginea depaseste limita de 5 MB." });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType || "image/jpeg",
              data: image.replace(/^data:image\/[^;]+;base64,/, ""),
            },
          },
          {
            type: "text",
            text: `Analizează acest Certificat de Performanță Energetică (CPE) și extrage datele într-un obiect JSON cu următoarele câmpuri:
{
  "address": "adresa completă a clădirii",
  "city": "orașul",
  "county": "județul",
  "yearBuilt": "anul construcției",
  "category": "RI|RC|RA|BI|ED|SA|HC|CO|SP|AL",
  "areaUseful": "suprafața utilă în m²",
  "volume": "volumul interior în m³",
  "floors": "regim de înălțime (ex: P+4E)",
  "epSpecific": "EP specific kWh/(m²·an)",
  "co2Specific": "CO2 kg/(m²·an)",
  "energyClass": "A+|A|B|C|D|E|F|G",
  "auditorName": "numele auditorului",
  "auditorAtestat": "nr. atestat",
  "scope": "vanzare|inchiriere|receptie"
}
Răspunde DOAR cu JSON-ul, fără text suplimentar.`,
          },
        ],
      }],
    });

    const text = response.content[0]?.text || "";
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ data: parsed });
    }

    return res.status(200).json({ data: null, raw: text });
  } catch (err) {
    console.error("OCR error:", err);
    return res.status(500).json({ error: err.message || "OCR failed" });
  }
}
