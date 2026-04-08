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
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError, checkFileSize } from "./_middleware/rateLimit.js";

const IFC_PROMPT = `Ești un expert BIM și certificare energetică clădiri (Mc 001-2022, ISO 13790).
Analizează fișierul IFC (STEP format) și extrage datele disponibile.

Returnează DOAR JSON cu aceeași structură ca mai jos:
{
  "building": {
    "address": "", "city": "", "county": "",
    "category": "RI|RC|RA|BI|ED|SA|HC|CO|SP|AL",
    "structure": "Zidărie portantă|Cadre beton|Structură metalică|Panouri prefabricate|Lemn",
    "yearBuilt": "", "floors": "",
    "areaUseful": "", "volume": "", "heightFloor": ""
  },
  "opaqueElements": [
    { "name": "", "type": "PE|PT|PP|PL|PB|PI", "area": "", "orientation": "", "tau": 1.0,
      "layers": [{ "matName": "", "thickness": "", "lambda": 0.0, "rho": 0 }] }
  ],
  "glazingElements": [
    { "name": "", "area": "", "u": 0, "g": 0, "orientation": "", "frameRatio": "25", "type": "" }
  ],
  "thermalBridges": [],
  "heating": { "source": "", "power": "", "eta_gen": "", "theta_int": "20" },
  "acm": { "source": "", "dailyLiters": "60" },
  "cooling": { "hasCooling": false },
  "ventilation": { "type": "NAT" }
}

Mapări IFC→tip element:
- IfcWall cu IsExternal=true → PE (perete exterior)
- IfcRoof, IfcSlab tip roof → PT sau PP
- IfcSlab tip floor/baseslab → PL
- IfcWindow, IfcDoor cu geam → glazingElement
- Orientare: calculează din normalele pereților (0°=N, 90°=E, 180°=S, 270°=V)
- IfcSpace → volum și suprafață
- IfcBuilding, IfcSite → adresă, an construcție

RĂSPUNDE DOAR CU JSON.`;

const FACADE_PROMPT = `Ești un expert în evaluarea clădirilor din România pentru certificare energetică (Mc 001-2022).
Analizează fotografia FAȚADEI și estimează toate datele vizibile sau inferate.

Returnează DOAR JSON:
{
  "building": {
    "category": "RI|RC|RA|BI|ED|SA|HC|CO|SP|AL",
    "structure": "Zidărie portantă|Cadre beton|Structură metalică|Panouri prefabricate|Lemn",
    "yearBuilt": "",
    "floors": "",
    "heightFloor": "2.80",
    "areaUseful": ""
  },
  "opaqueElements": [
    { "name": "Perete exterior fațadă", "type": "PE", "area": "", "orientation": "",
      "layers": [] }
  ],
  "glazingElements": [
    { "name": "Ferestre fațadă", "area": "", "u": 0, "g": 0, "orientation": "", "type": "" }
  ],
  "confidence": {
    "buildingType": "high|medium|low",
    "yearEstimate": "high|medium|low",
    "insulationStatus": "izolat|neizolat|partial|necunoscut",
    "windowType": "simplu|dublu|triplu|necunoscut",
    "generalCondition": "buna|medie|rea|necunoscut"
  },
  "notes": "Observații vizuale: stare tencuială, tip ferestrele, prezență izolație, etc."
}

Inferențe tipice pentru România:
- Bloc panouri prefabricate (1970-1989) → yearBuilt ≈ 1980, structure = Panouri prefabricate, n50 ≈ 6
- Bloc cărămidă fără izolație → structure = Zidărie portantă
- Casă interbelică → yearBuilt 1920-1940
- Izolație ETICS vizibilă (plăci EPS la exterior) → izolat
- Ferestre PVC → dublu sau triplu vitraj
- Ferestre lemn vechi → simplu sau dublu vitraj

RĂSPUNDE DOAR CU JSON.`;

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

  // Auth + rate limit
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const limit = checkRateLimit(auth.user.id, 10);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  try {
    const { fileType, fileData, mimeType } = req.body;
    if (!fileData) return res.status(400).json({ error: "No file data provided" });

    // Validate file size (max 5 MB decoded)
    if (!checkFileSize(fileData)) {
      return res.status(413).json({ error: "Fisierul depaseste limita de 5 MB." });
    }

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
    } else if (fileType === "ifc") {
      // IFC STEP text — trimis ca text simplu (primele 15000 chars)
      messageContent = [
        { type: "text", text: `Fișier IFC (STEP format):\n\n${fileData.slice(0, 15000)}\n\n---\n\n${IFC_PROMPT}` },
      ];
    } else if (fileType === "facade") {
      // Fotografie fațadă clădire
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64Data },
        },
        { type: "text", text: FACADE_PROMPT },
      ];
    } else {
      return res.status(400).json({ error: "fileType invalid. Acceptat: pdf, docx_text, image, ifc, facade" });
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
