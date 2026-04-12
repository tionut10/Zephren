/**
 * ACM EN 15316 Calculator
 * Calculates heating and cooling system efficiency
 * Technology-specific efficiency curves per EN 15316 standard
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    heatingSystem = {},
    coolingSystem = {},
    buildingData = {},
    climateData = {},
  } = req.body;

  try {
    // Calculate heating efficiency
    let heatingResult = { efficiency: 0, losses: 0 };
    if (heatingSystem.type) {
      heatingResult = calculateHeatingEfficiency(heatingSystem, buildingData, climateData);
    }

    // Calculate cooling efficiency
    let coolingResult = { efficiency: 0, losses: 0 };
    if (coolingSystem.type) {
      coolingResult = calculateCoolingEfficiency(coolingSystem, buildingData, climateData);
    }

    // Calculate combined system efficiency
    const combinedEfficiency =
      (heatingResult.efficiency + coolingResult.efficiency) / 2;

    // Energy consumption calculations
    const heatingEnergyNeeded = calculateHeatingLoad(buildingData, climateData);
    const coolingEnergyNeeded = calculateCoolingLoad(buildingData, climateData);

    const heatingEnergy = heatingEnergyNeeded / (heatingResult.efficiency || 1);
    const coolingEnergy = coolingEnergyNeeded / (coolingResult.efficiency || 1);

    const totalEnergy = heatingEnergy + coolingEnergy;

    return res.status(200).json({
      success: true,
      type: 'acm-calculation',
      heating: {
        systemType: heatingSystem.type || 'none',
        efficiency: Number(heatingResult.efficiency.toFixed(3)),
        losses: Number(heatingResult.losses.toFixed(1)),
        energyNeeded: Number(heatingEnergyNeeded.toFixed(1)),
        primaryEnergy: Number(heatingEnergy.toFixed(1)),
        unit: 'kWh/m²/year',
      },
      cooling: {
        systemType: coolingSystem.type || 'none',
        efficiency: Number(coolingResult.efficiency.toFixed(3)),
        losses: Number(coolingResult.losses.toFixed(1)),
        energyNeeded: Number(coolingEnergyNeeded.toFixed(1)),
        primaryEnergy: Number(coolingEnergy.toFixed(1)),
        unit: 'kWh/m²/year',
      },
      summary: {
        combinedEfficiency: Number(combinedEfficiency.toFixed(3)),
        totalHeatingEnergy: Number(heatingEnergy.toFixed(1)),
        totalCoolingEnergy: Number(coolingEnergy.toFixed(1)),
        totalPrimaryEnergy: Number(totalEnergy.toFixed(1)),
        totalEnergyWithLosses: Number((totalEnergy + heatingResult.losses + coolingResult.losses).toFixed(1)),
      },
      reference: 'EN 15316-4-1:2017',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ACM calculation error:', error);
    return res.status(500).json({
      error: 'ACM calculation failed',
      details: error.message,
    });
  }
}

/**
 * Calculate heating system efficiency based on technology
 */
function calculateHeatingEfficiency(heatingSystem, buildingData = {}, climateData = {}) {
  const { type, age = 0, size = 1 } = heatingSystem;

  // Base efficiency curves per EN 15316
  const efficiencyCurves = {
    'boiler-gas': {
      modern: 0.92,  // <5 years, condensing
      standard: 0.85, // 5-15 years
      old: 0.75,      // >15 years
    },
    'boiler-oil': {
      modern: 0.90,
      standard: 0.82,
      old: 0.72,
    },
    'boiler-biomass': {
      modern: 0.88,
      standard: 0.80,
      old: 0.68,
    },
    'heat-pump-air': {
      modern: 3.5, // COP value, not %, convert to decimal
      standard: 3.0,
      old: 2.5,
    },
    'heat-pump-ground': {
      modern: 4.2,
      standard: 3.8,
      old: 3.2,
    },
    'electric-resistance': {
      modern: 1.0,
      standard: 1.0,
      old: 0.95,
    },
    'district-heating': {
      modern: 0.95,
      standard: 0.90,
      old: 0.85,
    },
  };

  const curves = efficiencyCurves[type] || { modern: 0.80, standard: 0.75, old: 0.70 };

  // Determine age category
  let ageCategory;
  if (age < 5) ageCategory = 'modern';
  else if (age < 15) ageCategory = 'standard';
  else ageCategory = 'old';

  const baseEfficiency = curves[ageCategory];

  // Apply size factor (oversized systems are less efficient)
  const sizeFactor = Math.max(0.7, 1 - (size - 1) * 0.15);

  // For heat pumps, apply climate adjustment
  let climateAdjustment = 1;
  if (type.includes('heat-pump')) {
    const heatingDays = climateData.heatingDegreeDays || 2500;
    climateAdjustment = Math.max(0.7, 1 - (heatingDays - 2000) / 5000);
  }

  const efficiency = baseEfficiency * sizeFactor * climateAdjustment;

  // Calculate system losses (distribution, storage, etc.)
  const systemLosses = 8 + (type === 'heat-pump-ground' ? 2 : 5);

  return {
    efficiency,
    losses: systemLosses,
  };
}

/**
 * Calculate cooling system efficiency
 */
function calculateCoolingEfficiency(coolingSystem, buildingData = {}, climateData = {}) {
  const { type, age = 0, size = 1 } = coolingSystem;

  const efficiencyCurves = {
    'chiller-centrifugal': {
      modern: 3.2, // EER value
      standard: 2.8,
      old: 2.2,
    },
    'chiller-screw': {
      modern: 3.0,
      standard: 2.6,
      old: 2.0,
    },
    'air-cooled-condenser': {
      modern: 2.8,
      standard: 2.4,
      old: 1.9,
    },
    'split-unit-cooling': {
      modern: 3.5,
      standard: 3.0,
      old: 2.3,
    },
    'free-cooling': {
      modern: 8.0, // Very high efficiency
      standard: 7.0,
      old: 6.0,
    },
  };

  const curves = efficiencyCurves[type] || { modern: 2.8, standard: 2.4, old: 1.9 };

  let ageCategory;
  if (age < 5) ageCategory = 'modern';
  else if (age < 15) ageCategory = 'standard';
  else ageCategory = 'old';

  const baseEfficiency = curves[ageCategory];

  // Size factor for cooling
  const sizeFactor = Math.max(0.6, 1 - (size - 1) * 0.20);

  // Climate adjustment based on cooling degree days
  let climateAdjustment = 1;
  const coolingDays = climateData.coolingDegreeDays || 1500;
  if (coolingDays < 1000) {
    climateAdjustment = 0.8; // Reduced efficiency in mild climates
  } else if (coolingDays > 2500) {
    climateAdjustment = 1.1; // Better efficiency in hot climates
  }

  const efficiency = baseEfficiency * sizeFactor * climateAdjustment;

  // System losses for cooling
  const systemLosses = 6 + (type === 'free-cooling' ? 1 : 4);

  return {
    efficiency,
    losses: systemLosses,
  };
}

/**
 * Calculate heating load based on building characteristics
 */
function calculateHeatingLoad(buildingData = {}, climateData = {}) {
  const {
    area = 1000,
    heatingSetpoint = 21,
    externalTemperature = 0,
    insulationLevel = 'standard', // poor, standard, good, excellent
  } = buildingData;

  // Heating degree days (HDD)
  const hdd = climateData.heatingDegreeDays || 2500;

  // U-value by insulation level (W/m²K)
  const uValueMap = {
    poor: 0.60,
    standard: 0.40,
    good: 0.25,
    excellent: 0.15,
  };

  const uValue = uValueMap[insulationLevel] || 0.40;

  // Transmission losses (through building envelope)
  const transmissionLosses = area * uValue * (hdd / 24);

  // Ventilation losses (air changes per hour)
  const airChanges = insulationLevel === 'excellent' ? 0.3 : 0.5;
  const volumetricHeatCapacity = 1.2; // kJ/m³K
  const ventilationLosses = (area * 2.7 * airChanges * hdd) / 1000;

  // Solar gains reduction
  const solarGainReduction = 0.2; // 20% reduction in gains

  const heatingLoad =
    (transmissionLosses + ventilationLosses) * (1 - solarGainReduction);

  return Math.max(0, heatingLoad / 1000); // Convert to kWh/m²/year
}

/**
 * Calculate cooling load
 */
function calculateCoolingLoad(buildingData = {}, climateData = {}) {
  const {
    area = 1000,
    coolingSetpoint = 26,
    occupancy = 0.5,
    internalGains = 0.4, // W/m²
    insulationLevel = 'standard',
  } = buildingData;

  // Cooling degree days (CDD)
  const cdd = climateData.coolingDegreeDays || 1500;

  // Solar gains (higher in poor insulation)
  const solarFactor =
    insulationLevel === 'poor' ? 50 : insulationLevel === 'excellent' ? 20 : 35;

  const solarGains = (area * solarFactor * cdd) / 1000;

  // Internal gains from occupancy and equipment
  const occupancyGains =
    area * occupancy * internalGains * cdd * 0.024;

  // Transmission through envelope
  const uValue = insulationLevel === 'standard' ? 0.40 : 0.25;
  const transmissionGains = (area * uValue * cdd) / 1000;

  const coolingLoad = (solarGains + occupancyGains + transmissionGains) * 1.1; // 10% margin

  return Math.max(0, coolingLoad / 1000); // kWh/m²/year
}
