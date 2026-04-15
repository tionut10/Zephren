/**
 * POST /api/ocr-cpe
 * OCR multi-purpose via Claude Vision:
 *   - mode="cpe"     (default) — extrage date clădire din certificat energetic
 *   - mode="invoice" — extrage date consum din factură energie/gaz
 *   - mode="meter"   — citește contor energie/gaz (index vechi → nou)
 *
 * S7.6 extension: adăugat mode switch pentru facturi fără a consuma funcție Vercel
 * nouă (limită Hobby 12/12).
 */
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError, checkFileSize } from "./_middleware/rateLimit.js";

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT-uri pe mod (RO, struct JSON strict)
// ═══════════════════════════════════════════════════════════════════════════
const PROMPTS = {
  cpe: `Analizează acest Certificat de Performanță Energetică (CPE) și extrage datele într-un obiect JSON cu următoarele câmpuri:
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

  invoice: `Analizează această factură de utilitate (energie electrică, gaz natural, termoficare, apă caldă) și extrage datele într-un obiect JSON:
{
  "supplier": "numele furnizor (Enel, E.ON, Electrica, Engie, Digi, etc.)",
  "invoiceNumber": "numărul facturii",
  "energyType": "electric|gaz|termoficare|apa_calda|combustibil",
  "periodStart": "YYYY-MM-DD (începutul perioadei de consum)",
  "periodEnd": "YYYY-MM-DD (sfârșitul perioadei)",
  "issueDate": "YYYY-MM-DD (data emitere factură)",
  "consumption_kWh": "consum în kWh (sau m³ pentru gaz, conversie în kWh folosind PCS=10.66 pentru gaz natural)",
  "consumption_raw": "consumul brut așa cum apare pe factură (ex: '350 m³' sau '1200 kWh')",
  "consumption_unit": "kWh|m3|Gcal|MWh",
  "indexOld": "index contor început perioadă (dacă apare)",
  "indexNew": "index contor sfârșit perioadă",
  "totalCost_lei": "total de plată în lei (cu TVA)",
  "totalCost_eur": "total în EUR (dacă disponibil)",
  "avgPrice_leiPerKwh": "prețul mediu unitar lei/kWh",
  "tariff": "denumire tarif (Monom, Binom, A, CZ, etc.)",
  "clientCode": "cod client sau POD",
  "clientAddress": "adresa locului de consum",
  "clientName": "nume client",
  "paymentDue": "YYYY-MM-DD (data scadenței)"
}
Reguli:
- Pentru gaz în m³: convertește la kWh (m³ × 10.66 PCS gaz natural România)
- Dacă un câmp lipsește sau nu e lizibil → null
- Data format ISO 8601 strict
- Consum și costuri: numerice fără unități (unitățile în câmpuri separate)
Răspunde DOAR cu JSON-ul, fără text suplimentar.`,

  meter: `Analizează această imagine cu un contor de energie (electric/gaz/termic) și extrage indecșii într-un JSON:
{
  "meterType": "electric|gaz|termic|apa",
  "currentIndex": "indexul curent afișat (numere întregi)",
  "decimalIndex": "fracțiunea indexului (dacă vizibilă, separat de roșu/cifrele zecimale)",
  "meterSerialNumber": "serie contor (dacă vizibilă)",
  "readingDate": "YYYY-MM-DD (data citirii din imagine, dacă e vizibilă)",
  "unit": "kWh|m3|Gcal",
  "tariffIndicator": "T1|T2|T3|null (pentru contoare multi-tarif)"
}
Răspunde DOAR cu JSON-ul, fără text suplimentar.`,
};

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
    const { image, mediaType, mode } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    // Validate mode
    const ocrMode = mode && PROMPTS[mode] ? mode : "cpe";
    const promptText = PROMPTS[ocrMode];

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
          { type: "text", text: promptText },
        ],
      }],
    });

    const text = response.content[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ data: parsed, mode: ocrMode });
    }

    return res.status(200).json({ data: null, raw: text, mode: ocrMode });
  } catch (err) {
    console.error("OCR error:", err);
    return res.status(500).json({ error: err.message || "OCR failed" });
  }
}
