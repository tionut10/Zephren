/**
 * POST /api/chat-import
 * Extrage date clădire dintr-o descriere verbală în limbaj natural.
 * Body: { message: "bloc din '80, 3 camere, etaj 4, gaz, fără izolație, București" }
 * Returns: { reply: "Confirmare...", data: { building, heating, ... }, missingFields: [] }
 */
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Ești un expert în certificarea energetică a clădirilor din România (Mc 001-2022).
Utilizatorul descrie o clădire în limbaj natural. Tu extragi datele structurate.

Răspunde DOAR cu JSON strict:
{
  "reply": "Scurtă confirmare: ce ai înțeles (1-2 propoziții)",
  "data": {
    "building": {
      "address": "", "city": "", "county": "", "postal": "",
      "category": "RI|RC|RA|BI|ED|SA|HC|CO|SP|AL",
      "structure": "Zidărie portantă|Cadre beton|Structură metalică|Panouri prefabricate|Lemn",
      "yearBuilt": "", "yearRenov": "",
      "floors": "",
      "areaUseful": "", "volume": "", "heightFloor": "2.80",
      "n50": "", "scopCpe": "vanzare|inchiriere|reabilitare|constructie_noua"
    },
    "heating": {
      "source": "GAZ_COND|BIOMASA|HP_AA|ELECTRICA|DISTRICT|GAZ_CONV",
      "power": "", "eta_gen": "", "theta_int": "20"
    },
    "acm": {
      "source": "CAZAN_H|SOLAR_TH|HP_ACM|ELECTRICA|DISTRICT",
      "dailyLiters": "60"
    },
    "cooling": { "hasCooling": false },
    "ventilation": { "type": "NAT|VMC|VMCR", "hrEfficiency": "" },
    "lighting": { "type": "LED|FLUOR|INCAND" },
    "solarThermal": { "enabled": false, "area": "" },
    "photovoltaic": { "enabled": false, "peakPower": "" },
    "heatPump": { "enabled": false, "cop": "" },
    "biomass": { "enabled": false, "type": "PELETI|BRICHETE|LEMNE" }
  },
  "missingFields": ["câmpuri lipsă importante pentru calcul"]
}

Reguli de inferență pentru România:
- "bloc" = RC (ansamblu) sau RA (apartament individual)
- "casă", "vilă" = RI
- "birou", "office" = BI
- "școală", "grădiniță" = ED
- "spital", "clinică" = SA
- "hotel", "pensiune" = HC
- "magazin", "mall", "comercial" = CO
- "'70", "'80", "1980" → yearBuilt inferit
- "gaz" singur → GAZ_COND (condensare, mai eficient)
- "centrală veche" → GAZ_CONV
- "lemne", "sobe", "sobă" → BIOMASA, type LEMNE
- "peleți" → BIOMASA, type PELETI
- "termoficare", "RADET", "district" → DISTRICT
- "pompă de căldură", "PC aer-apă", "inverter" → HP_AA
- "electric", "rezistențe" → ELECTRICA
- "nZEB", "pasivhaus" → n50 ≤ 1, ventilation VMCR hrEfficiency 90
- "VMC recuperare" → VMCR
- "LED" → lighting LED
- "PV", "fotovoltaic", "panouri solare electrice" → photovoltaic.enabled = true
- "solar termic", "panouri solare apă caldă" → solarThermal.enabled = true
- "P+2E" = 3 etaje, "P+4E" = 5 etaje, "S+P+3E" = subzol + parter + 3 etaje
- RĂSPUNDE EXCLUSIV CU JSON`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: "No message provided" });

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message.slice(0, 2000) }],
    });

    const text = response.content[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ reply: text.slice(0, 300), data: null });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("chat-import error:", err);
    return res.status(500).json({ error: err.message });
  }
}
