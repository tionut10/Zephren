/**
 * BACS EN 15232-1 Calculator
 * Calculates automation factor (faut) for building control systems
 * Based on control features and system complexity
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { buildingType, controlFeatures = [] } = req.body;

  if (!buildingType) {
    return res.status(400).json({ error: 'Missing buildingType' });
  }

  try {
    // BACS class determination based on features
    const bacsClass = determineBacsClass(controlFeatures);

    // Reference faut values per EN 15232-1
    const faurtValues = {
      // Residential buildings
      RI: {
        A: 0.90,  // Advanced automation
        B: 0.98,  // High level control
        C: 1.05,  // Standard control
        D: 1.15,  // Limited control
      },
      // Office buildings
      RC: {
        A: 0.85,  // Advanced automation
        B: 0.93,  // High level control
        C: 1.05,  // Standard control
        D: 1.20,  // Limited control
      },
      // Educational
      RA: {
        A: 0.88,  // Advanced automation
        B: 0.96,  // High level control
        C: 1.06,  // Standard control
        D: 1.18,  // Limited control
      },
      // Hospital/Healthcare
      NR: {
        A: 0.82,  // Advanced automation
        B: 0.91,  // High level control
        C: 1.08,  // Standard control
        D: 1.25,  // Limited control
      },
    };

    // Get faut value for building type and BACS class
    const typeValues = faurtValues[buildingType] || faurtValues.RC;
    const faut = typeValues[bacsClass] || typeValues.C;

    // Calculate detailed feature scoring
    const featureScores = calculateFeatureScores(controlFeatures);

    // Determine energy savings potential
    const savingsPotential = calculateSavingsPotential(bacsClass);

    return res.status(200).json({
      success: true,
      type: 'bacs-calculation',
      buildingType,
      bacsClass,
      faut: Number(faut.toFixed(3)),
      featureScores,
      savingsPotential,
      details: {
        description: getBacsClassDescription(bacsClass),
        features: controlFeatures,
        reference: 'EN 15232-1:2017',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('BACS calculation error:', error);
    return res.status(500).json({
      error: 'BACS calculation failed',
      details: error.message,
    });
  }
}

/**
 * Determine BACS class (A, B, C, D) based on control features
 */
function determineBacsClass(features) {
  if (!Array.isArray(features) || features.length === 0) {
    return 'D'; // Default to limited control
  }

  const featureMap = {
    // Class A features (Advanced automation)
    'predictive-control': 10,
    'machine-learning': 10,
    'weather-compensation': 9,
    'occupancy-based-control': 8,
    'demand-controlled-ventilation': 8,
    'energy-monitoring-real-time': 8,
    'fault-detection-diagnosis': 9,

    // Class B features (High level control)
    'optimized-start-stop': 7,
    'time-based-scheduling': 6,
    'zone-temperature-control': 6,
    'power-factor-correction': 6,
    'demand-response': 7,

    // Class C features (Standard control)
    'thermostatic-control': 4,
    'basic-scheduling': 3,
    'manual-override': 2,
    'basic-monitoring': 3,

    // Class D features (Limited control)
    'on-off-control': 1,
    'manual-operation': 1,
  };

  let totalScore = 0;
  features.forEach((feature) => {
    const score = featureMap[feature] || 0;
    totalScore += score;
  });

  // Determine class based on cumulative score
  if (totalScore >= 24) return 'A';
  if (totalScore >= 15) return 'B';
  if (totalScore >= 8) return 'C';
  return 'D';
}

/**
 * Calculate detailed feature scores
 */
function calculateFeatureScores(features) {
  const scores = {
    automation: 0,
    monitoring: 0,
    control: 0,
    efficiency: 0,
  };

  const featureCategories = {
    automation: [
      'predictive-control',
      'machine-learning',
      'optimized-start-stop',
      'demand-response',
    ],
    monitoring: [
      'energy-monitoring-real-time',
      'fault-detection-diagnosis',
      'basic-monitoring',
    ],
    control: [
      'weather-compensation',
      'occupancy-based-control',
      'zone-temperature-control',
      'thermostatic-control',
      'time-based-scheduling',
    ],
    efficiency: [
      'demand-controlled-ventilation',
      'power-factor-correction',
      'manual-override',
    ],
  };

  Object.entries(featureCategories).forEach(([category, categoryFeatures]) => {
    const matchCount = features.filter((f) =>
      categoryFeatures.includes(f)
    ).length;
    scores[category] = Math.min(100, (matchCount / categoryFeatures.length) * 100);
  });

  return scores;
}

/**
 * Calculate energy savings potential based on BACS class
 */
function calculateSavingsPotential(bacsClass) {
  const savingsMap = {
    A: {
      min: 20,
      max: 35,
      description: 'Advanced automation: 20-35% annual energy savings',
    },
    B: {
      min: 15,
      max: 25,
      description: 'High-level control: 15-25% annual energy savings',
    },
    C: {
      min: 5,
      max: 15,
      description: 'Standard control: 5-15% annual energy savings',
    },
    D: {
      min: 0,
      max: 5,
      description: 'Limited control: 0-5% annual energy savings',
    },
  };

  return savingsMap[bacsClass] || savingsMap.C;
}

/**
 * Get textual description for BACS class
 */
function getBacsClassDescription(bacsClass) {
  const descriptions = {
    A: 'Systèmes d\'automatisation et de contrôle avancés avec optimisation énergétique intégrée',
    B: 'Niveau élevé de contrôle automatique avec régulation climatique et gestion de la demande',
    C: 'Contrôle régulé courant basique avec thermostat et programmation horaire',
    D: 'Contrôle manuel limité ou non contrôlé',
  };

  return descriptions[bacsClass] || descriptions.C;
}
