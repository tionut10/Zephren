/**
 * POST /api/calculate
 *
 * Receives building data and returns energy calculation results.
 * This keeps calculation logic server-side so it can be updated
 * independently of the client bundle.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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
    const primaryFactor_heat = isHeatPump ? 2.5 : heatingSystem === "electric" ? 2.5 : 1.1;
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

    // --- Energy class determination (Romanian classification) ---
    let energyClass;
    if (buildingType === "residential") {
      if (ep <= 50) energyClass = "A+";
      else if (ep <= 100) energyClass = "A";
      else if (ep <= 150) energyClass = "B";
      else if (ep <= 200) energyClass = "C";
      else if (ep <= 250) energyClass = "D";
      else if (ep <= 350) energyClass = "E";
      else if (ep <= 450) energyClass = "F";
      else energyClass = "G";
    } else {
      // Non-residential thresholds (higher)
      if (ep <= 75) energyClass = "A+";
      else if (ep <= 125) energyClass = "A";
      else if (ep <= 175) energyClass = "B";
      else if (ep <= 250) energyClass = "C";
      else if (ep <= 350) energyClass = "D";
      else if (ep <= 500) energyClass = "E";
      else if (ep <= 650) energyClass = "F";
      else energyClass = "G";
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
