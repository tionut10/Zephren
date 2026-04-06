/**
 * POST /api/import-document
 * Extrage date clădire din documente PDF sau DOCX via Claude AI.
 * Completează automat Pașii 1-4 ai calculatorului.
 *
 * Body: { fileType: "pdf"|"docx", fileData: "<base64>", mimeType: "..." }
 * Returns: { building, opaqueElements, glazingElements, thermalBridges,
 *            heating, acm, cooling, ventilation, lighting,
 *            solarThermal, photovoltaic, heatPump, biomass }
 */
import Anthropic from "@anthropic-ai/sdk";

const EXTRACTION_PROMPT = `Ești un expert în certificarea energetică a clădirilor din România (Mc 001-2022).
Analizează documentul și extrage TOATE datele disponibile în format JSON strict.

Returnează DOAR JSON (fără text), cu structura:
{
  "building": {
    "address": "", "city": "", "county": "", "postal": "",
    "category": "RI|RC|RA|BI|ED|SA|HC|CO|SP|AL",
    "structure": "Zidărie portantă|Cadre beton|Structură metalică|Panouri prefabricate|Lemn",
    "yearBuilt": "", "yearRenov": "",
    "floors": "ex: P+4E",
    "areaUseful": "", "volume": "", "areaEnvelope": "", "heightFloor": "",
    "n50": "", "scopCpe": "vanzare|inchiriere|reabilitare|constructie_noua"
  },
  "opaqueElements": [
    {
      "name": "ex: Perete exterior",
      "type": "PE|PT|PP|PL|PB|PI",
      "area": "",
      "orientation": "N|NE|E|SE|S|SV|V|NV",
      "tau": 1.0,
      "layers": [
        {"matName": "ex: Cărămidă cu goluri (GVP)", "thickness": "300", "lambda": 0.46, "rho": 1200}
      ]
    }
  ],
  "glazingElements": [
    {
      "name": "ex: Ferestre PVC",
      "area": "", "u": 1.1, "g": 0.6,
      "orientation": "S",
      "frameRatio": "25", "type": "Dublu vitraj Low-E"
    }
  ],
  "thermalBridges": [
    { "name": "ex: Colț exterior", "type": "COL_EXT", "psi": 0.10, "length": "" }
  ],
  "heating": {
    "source": "GAZ_COND|BIOMASA|HP_AA|ELECTRICA|DISTRICT|GAZ_CONV|SOLAR_TH",
    "power": "", "eta_gen": "0.97",
    "emission": "RAD_OT|CONV_OT|PARDOSEALA|AEROTERME",
    "distribution": "BINE_INT|SLAB_INT|BINE_EXT",
    "control": "TERMO_RAD|TERMO_CAMERA|MANUAL",
    "regime": "continuu|intermitent", "theta_int": "20"
  },
  "acm": {
    "source": "CAZAN_H|SOLAR_TH|HP_ACM|ELECTRICA|DISTRICT",
    "dailyLiters": "60", "storageVolume": ""
  },
  "cooling": {
    "hasCooling": false,
    "system": "NONE|AC_SPLIT|VRF|CHILLER",
    "power": "", "eer": ""
  },
  "ventilation": {
    "type": "NAT|VMC|VMCR",
    "airflow": "", "hrEfficiency": ""
  },
  "lighting": {
    "type": "LED|FLUOR|INCAND",
    "pDensity": "4.5", "operatingHours": ""
  },
  "solarThermal": {
    "enabled": false, "area": "", "orientation": "S", "tilt": "35"
  },
  "photovoltaic": {
    "enabled": false, "peakPower": "", "area": "", "orientation": "S", "tilt": "30"
  },
  "heatPump": {
    "enabled": false, "cop": "", "type": "PC_AA|PC_SA"
  },
  "biomass": {
    "enabled": false, "type": "PELETI|BRICHETE|LEMNE"
  }
}

Reguli:
- Dacă un câmp nu apare în document, lasă-l "" sau valoarea implicită
- category: RI=casă, RC=bloc, RA=apartament, BI=birouri, ED=școală, SA=spital/clinică, HC=hotel, CO=comercial, SP=sport, AL=altele
- type elemente opace: PE=perete exterior, PT=terasă, PP=pod/acoperiș, PL=planșeu/sol, PB=planșeu beci, PI=perete interior
- Completează orice date tehnice vizibile (U, R, straturi izolație)
- RĂSPUNDE DOAR CU JSON, FĂRĂ alt text`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  try {
    const { fileType, fileData, mimeType } = req.body;
    if (!fileData) return res.status(400).json({ error: "No file data provided" });

    const client = new Anthropic({ apiKey });

    let messageContent;

    if (fileType === "pdf") {
      // Claude suportă nativ PDF ca tip document
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      messageContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        },
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    } else if (fileType === "docx_text") {
      // Text extras din DOCX (trimis ca text simplu)
      messageContent = [
        { type: "text", text: `Document DOCX (text extras):\n\n${fileData}\n\n---\n\n${EXTRACTION_PROMPT}` },
      ];
    } else if (fileType === "image") {
      // Imagine (JPG, PNG) — CPE scanat
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType || "image/jpeg",
            data: base64Data,
          },
        },
        { type: "text", text: EXTRACTION_PROMPT },
      ];
    } else {
      return res.status(400).json({ error: "fileType invalid. Acceptat: pdf, docx_text, image" });
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = response.content[0]?.text || "";
    // Extract JSON — permite text înaintea/după JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ data: null, raw: text.slice(0, 500) });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Sanitize: elimină câmpuri goale din arrays (elemente fără arie)
    if (parsed.opaqueElements) {
      parsed.opaqueElements = parsed.opaqueElements.filter(
        el => el.area && parseFloat(el.area) > 0
      );
    }
    if (parsed.glazingElements) {
      parsed.glazingElements = parsed.glazingElements.filter(
        el => el.area && parseFloat(el.area) > 0
      );
    }
    if (parsed.thermalBridges) {
      parsed.thermalBridges = parsed.thermalBridges.filter(
        tb => tb.psi && parseFloat(tb.psi) > 0
      );
    }

    return res.status(200).json({ data: parsed });
  } catch (err) {
    console.error("import-document error:", err);
    return res.status(500).json({ error: err.message || "Import eșuat" });
  }
}
