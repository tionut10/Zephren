/**
 * POST /api/calculate
 *
 * Receives building data and returns energy calculation results.
 * This keeps calculation logic server-side so it can be updated
 * independently of the client bundle.
 *
 * Sprint 20 (18 apr 2026) — auth + rate-limit + CORS allowlist.
 */
import { requireAuth } from "./_middleware/auth.js";
import { checkRateLimit, sendRateLimitError } from "./_middleware/rateLimit.js";
import { applyCors } from "./_middleware/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: require authenticated user (Sprint 20)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Rate limit: 60 calcule/h per user (calcul e ieftin dar previne scraping)
  const limit = checkRateLimit(auth.user.id, 60);
  if (!limit.allowed) return sendRateLimitError(res, limit);

  // Size limit body (max 256 KB JSON)
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 256 * 1024) {
    return res.status(413).json({ error: "Request body too large (max 256 KB)" });
  }

  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }

    const {
      buildingType,    // "residential" | "office" | "commercial" | "industrial"
      area,            // m2 (number)
      volume,          // m3 (number)
      floors,          // number of floors
      yearBuilt,       // year
      climateZone,     // Romanian climate zone I-V
      heatingSystem,   // "centrala_gaz" | "pompa_caldura" | "electric" | etc.
      coolingSystem,   // "none" | "split" | "chiller" | etc.
      hotWater,        // "centrala" | "boiler_electric" | "solar" | etc.
      ventilation,     // "natural" | "mechanical" | "recuperare"
      lighting,        // "LED" | "fluorescent" | "incandescent"
      renewable,       // { solar_kwp, solar_thermal_m2 } or null
      envelope,        // { walls_u, roof_u, floor_u, windows_u } W/(m2*K)
    } = body;

    // --- Validate required fields ---
    if (!area || area <= 0) {
      return res.status(400).json({ error: "Valid 'area' (m2) is required" });
    }

    // --- Climate zone degree-days (simplified Romanian data) ---
    const degreeDays = {
      I: 2200,
      II: 2600,
      III: 3000,
      IV: 3400,
      V: 3800,
    };

    const dd = degreeDays[climateZone] || 3000;

    // --- Envelope defaults (if not provided) ---
    const walls_u = envelope?.walls_u || 0.56;
    const roof_u = envelope?.roof_u || 0.35;
    const floor_u = envelope?.floor_u || 0.40;
    const windows_u = envelope?.windows_u || 1.30;

    // --- Heating system efficiency ---
    const heatingEfficiency = {
      centrala_gaz: 0.92,
      pompa_caldura: 3.5,    // COP
      electric: 1.0,
      lemne: 0.75,
      peleti: 0.88,
      termoficare: 0.85,
    };

    const heatEff = heatingEfficiency[heatingSystem] || 0.90;
    const isHeatPump = heatingSystem === "pompa_caldura";

    // --- Simplified energy need calculation (Mc 001-2022 methodology) ---
    const floorArea = area;
    const vol = volume || area * 2.7 * (floors || 1);

    // Transmission losses (W/K)
    const wallArea = Math.sqrt(floorArea / (floors || 1)) * 4 * 2.7 * (floors || 1);
    const roofArea = floorArea / (floors || 1);
    const windowRatio = 0.20;
    const opaqueWallArea = wallArea * (1 - windowRatio);
    const windowArea = wallArea * windowRatio;

    const H_tr =
      opaqueWallArea * walls_u +
      roofArea * roof_u +
      roofArea * floor_u +
      windowArea * windows_u;

    // Ventilation losses (W/K)
    const airChangeRate = ventilation === "recuperare" ? 0.3 : ventilation === "mechanical" ? 0.5 : 0.8;
    const H_ve = 0.34 * vol * airChangeRate;

    // Annual heating need (kWh)
    const Q_heat = ((H_tr + H_ve) * dd * 24) / 1000;

    // Primary energy for heating (kWh)
    // fP conform Mc 001-2022 Tabel 5.17: electricitate=2.62, gaz=1.17, termoficare=0.92
    const primaryFactor_heat = isHeatPump ? 2.62 : heatingSystem === "electric" ? 2.62 : heatingSystem === "termoficare" ? 0.92 : 1.17;
    const EP_heat = (Q_heat / (isHeatPump ? heatEff : heatEff)) * primaryFactor_heat;

    // Hot water (kWh/m2/year — simplified)
    const hotWaterFactors = {
      centrala: 15,
      boiler_electric: 25,
      solar: 5,
      pompa_caldura: 8,
    };
    const EP_hotwater = (hotWaterFactors[hotWater] || 20) * floorArea;

    // Cooling (kWh/m2/year — simplified)
    const coolingFactors = {
      none: 0,
      split: 12,
      chiller: 18,
      vrv: 10,
    };
    const EP_cooling = (coolingFactors[coolingSystem] || 0) * floorArea;

    // Lighting (kWh/m2/year)
    const lightingFactors = {
      LED: 8,
      fluorescent: 15,
      incandescent: 30,
    };
    const EP_lighting = (lightingFactors[lighting] || 12) * floorArea;

    // Renewable offset (kWh/year)
    const solarPV = renewable?.solar_kwp ? renewable.solar_kwp * 1100 : 0; // 1100 kWh/kWp in Romania avg
    const solarThermal = renewable?.solar_thermal_m2 ? renewable.solar_thermal_m2 * 500 : 0;
    const EP_renewable = solarPV + solarThermal;

    // Total primary energy
    const EP_total = EP_heat + EP_hotwater + EP_cooling + EP_lighting - EP_renewable;
    const ep = Math.max(0, EP_total / floorArea); // kWh/m2/an

    // RER (renewable energy ratio)
    const totalBeforeRenewable = EP_heat + EP_hotwater + EP_cooling + EP_lighting;
    const rer = totalBeforeRenewable > 0 ? EP_renewable / totalBeforeRenewable : 0;

    // --- Energy class determination (Romanian Mc 001-2022 classification) ---
    // Synced with src/data/energy-classes.js ENERGY_CLASSES_DB
    // Map buildingType to category key used by client-side classification
    const hasCooling = coolingSystem && coolingSystem !== "none";
    const categoryMap = {
      residential: hasCooling ? "RI_cool" : "RI_nocool",
      apartment: hasCooling ? "RC_cool" : "RC_nocool",
      office: "BI", commercial: "CO", education: "ED",
      hospital: "SA", hotel: "HC", sport: "SP",
    };
    const catKey = categoryMap[buildingType] || "AL";

    // Thresholds per Mc 001-2022 Cap. 5 (A+ through F; above last = G)
    const CLASS_THRESHOLDS = {
      RI_cool:   [91,129,257,390,522,652,783],
      RI_nocool: [78,110,220,340,460,575,690],
      RC_cool:   [73,101,198,297,396,495,595],
      RC_nocool: [60,84,168,260,352,440,528],
      BI: [68,97,193,302,410,511,614],
      ED: [55,78,157,248,340,425,510],
      SA: [130,190,380,570,760,950,1140],
      HC: [85,120,240,370,500,625,750],
      CO: [75,107,213,330,447,558,670],
      SP: [70,100,200,310,420,525,630],
      AL: [68,97,193,302,410,511,614],
    };
    const CLASS_LABELS = ["A+","A","B","C","D","E","F","G"];

    const thresholds = CLASS_THRESHOLDS[catKey] || CLASS_THRESHOLDS.AL;
    let energyClass = "G";
    for (let i = 0; i < thresholds.length; i++) {
      if (ep <= thresholds[i]) { energyClass = CLASS_LABELS[i]; break; }
    }

    // CO2 emissions (kg CO2/m2/year — simplified)
    const co2Factor = 0.25; // average kg CO2 per kWh primary
    const co2 = ep * co2Factor;

    return res.status(200).json({
      ep: Math.round(ep * 100) / 100,
      energyClass,
      rer: Math.round(rer * 1000) / 1000,
      co2: Math.round(co2 * 100) / 100,
      breakdown: {
        heating: Math.round(EP_heat / floorArea * 100) / 100,
        hotWater: Math.round(EP_hotwater / floorArea * 100) / 100,
        cooling: Math.round(EP_cooling / floorArea * 100) / 100,
        lighting: Math.round(EP_lighting / floorArea * 100) / 100,
        renewable: Math.round(EP_renewable / floorArea * 100) / 100,
      },
      metadata: {
        degreeDays: dd,
        transmissionLoss: Math.round(H_tr * 100) / 100,
        ventilationLoss: Math.round(H_ve * 100) / 100,
        heatingEfficiency: heatEff,
        area: floorArea,
      },
    });
  } catch (err) {
    console.error("[api/calculate] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
