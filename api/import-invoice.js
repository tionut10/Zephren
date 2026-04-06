/**
 * POST /api/import-invoice
 * Extrage date consum energie din facturi (gaz, curent, termoficare) via Claude AI.
 * Body: { fileType: "pdf"|"image", fileData: base64, mimeType }
 * Returns: { data: { supplier, energyType, annualGasKwh, annualElecKwh, ... } }
 */
import Anthropic from "@anthropic-ai/sdk";

const INVOICE_PROMPT = `Ești un expert în analiza facturilor de energie din România.
Analizează documentul și extrage datele de consum în format JSON strict.

Returnează DOAR JSON:
{
  "supplier": "numele furnizorului (ex: E.ON, CEZ, Engie, DIGI, Electrica)",
  "energyType": "gaz|electricitate|termoficare|mix",
  "annualGasM3": "",
  "annualGasKwh": "",
  "annualElecKwh": "",
  "annualHeatGcal": "",
  "annualHeatKwh": "",
  "periodStart": "YYYY-MM",
  "periodEnd": "YYYY-MM",
  "address": "",
  "city": "",
  "tariffGas": "",
  "tariffElec": "",
  "totalCostLei": "",
  "monthlyValues": [],
  "notes": "observații utile (contor, nr. contract, etc.)"
}

Conversii:
- 1 m³ gaz natural ≈ 10.55 kWh (putere calorifică inferioară standard România)
- 1 Gcal = 1163 kWh
- Dacă există valori lunare, calculează totalul anual și pune în annualGasKwh/annualElecKwh
- Dacă sunt mai puțin de 12 luni, extrapolează pro-rata la 12 luni

RĂSPUNDE DOAR CU JSON.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { fileType, fileData, mimeType } = req.body || {};
  if (!fileData) return res.status(400).json({ error: "No file data" });

  try {
    const client = new Anthropic({ apiKey });
    let content;
    const base64 = fileData.replace(/^data:[^;]+;base64,/, "");

    if (fileType === "pdf") {
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: INVOICE_PROMPT },
      ];
    } else {
      content = [
        { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64 } },
        { type: "text", text: INVOICE_PROMPT },
      ];
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ data: null, raw: text.slice(0, 300) });

    return res.status(200).json({ data: JSON.parse(jsonMatch[0]) });
  } catch (err) {
    console.error("import-invoice error:", err);
    return res.status(500).json({ error: err.message });
  }
}
