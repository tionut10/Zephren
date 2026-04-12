/**
 * BACS Validation Endpoint
 * Validates BACS EN 15232-1 parameters and dependencies
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { buildingType, controlFeatures = [], faurtValue } = req.body;

  if (!buildingType) {
    return res.status(400).json({ error: 'Missing buildingType' });
  }

  try {
    const validBuildingTypes = ['RI', 'RC', 'RA', 'NR'];
    const validFeatures = [
      'predictive-control',
      'machine-learning',
      'weather-compensation',
      'occupancy-based-control',
      'demand-controlled-ventilation',
      'energy-monitoring-real-time',
      'fault-detection-diagnosis',
      'optimized-start-stop',
      'time-based-scheduling',
      'zone-temperature-control',
      'power-factor-correction',
      'demand-response',
      'thermostatic-control',
      'basic-scheduling',
      'manual-override',
      'basic-monitoring',
      'on-off-control',
      'manual-operation',
    ];

    const errors = [];
    const warnings = [];
    const validations = {};

    // Validate building type
    if (!validBuildingTypes.includes(buildingType)) {
      errors.push(`Invalid building type: ${buildingType}. Must be one of: ${validBuildingTypes.join(', ')}`);
    }
    validations.buildingType = {
      valid: validBuildingTypes.includes(buildingType),
      value: buildingType,
    };

    // Validate control features
    const invalidFeatures = controlFeatures.filter(
      (f) => !validFeatures.includes(f)
    );

    if (invalidFeatures.length > 0) {
      errors.push(`Invalid control features: ${invalidFeatures.join(', ')}`);
    }

    validations.controlFeatures = {
      valid: invalidFeatures.length === 0,
      count: controlFeatures.length,
      features: controlFeatures,
      invalid: invalidFeatures,
    };

    // Warn if too few features for advanced class
    if (controlFeatures.length < 3) {
      warnings.push('Few control features specified. System may default to Class D (limited control).');
    }

    // Validate faut value if provided
    if (faurtValue !== undefined) {
      const validFaurtRange = { min: 0.8, max: 1.25 };

      if (faurtValue < validFaurtRange.min || faurtValue > validFaurtRange.max) {
        errors.push(
          `faut value ${faurtValue} outside valid range: ${validFaurtRange.min} - ${validFaurtRange.max}`
        );
      }

      validations.faurtValue = {
        valid: faurtValue >= validFaurtRange.min && faurtValue <= validFaurtRange.max,
        value: faurtValue,
        range: validFaurtRange,
      };
    }

    // Check feature dependencies
    const dependencyValidation = validateDependencies(controlFeatures);
    if (dependencyValidation.warnings.length > 0) {
      warnings.push(...dependencyValidation.warnings);
    }

    validations.dependencies = dependencyValidation;

    // Overall validation result
    const isValid = errors.length === 0;

    return res.status(isValid ? 200 : 400).json({
      success: isValid,
      type: 'bacs-validation',
      isValid,
      errors,
      warnings,
      validations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('BACS validation error:', error);
    return res.status(500).json({
      error: 'BACS validation failed',
      details: error.message,
    });
  }
}

/**
 * Validate feature dependencies
 */
function validateDependencies(features) {
  const warnings = [];

  // If occupancy-based-control is present, check for monitoring
  if (features.includes('occupancy-based-control')) {
    if (!features.includes('energy-monitoring-real-time')) {
      warnings.push(
        'Occupancy-based control should be paired with real-time energy monitoring for optimal operation.'
      );
    }
  }

  // If demand-response is present, check for monitoring
  if (features.includes('demand-response')) {
    if (!features.includes('fault-detection-diagnosis')) {
      warnings.push(
        'Demand response systems should include fault detection for reliability.'
      );
    }
  }

  // If predictive-control is present, recommend machine-learning
  if (features.includes('predictive-control')) {
    if (!features.includes('machine-learning')) {
      warnings.push(
        'Predictive control can be enhanced with machine learning for better accuracy.'
      );
    }
  }

  // If weather-compensation is present without zone-control, warn
  if (
    features.includes('weather-compensation') &&
    !features.includes('zone-temperature-control')
  ) {
    warnings.push(
      'Weather compensation is more effective when combined with zone-based temperature control.'
    );
  }

  // If demand-controlled-ventilation without occupancy-detection
  if (
    features.includes('demand-controlled-ventilation') &&
    !features.includes('occupancy-based-control')
  ) {
    warnings.push(
      'Demand-controlled ventilation should ideally work with occupancy detection.'
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
    dependenciesChecked: [
      'occupancy + monitoring',
      'demand-response + fault-detection',
      'predictive + ml',
      'weather-comp + zone-control',
      'dcv + occupancy',
    ],
  };
}
