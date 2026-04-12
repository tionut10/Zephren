/**
 * Validate Audit Data
 * Checker pentru consum anomalii, date incomplete, inconsistențe
 * Scindre din import-document.js
 */

/**
 * Validează consum facturat vs. calcul teoretic
 * Flag: spike, zero, negative, outlier
 */
function validateConsumption(invoices, expectedRange = { min: 0.5, max: 2.0 }) {
  const issues = [];

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return [{ type: 'noData', severity: 'error', message: 'No consumption data provided' }];
  }

  // Calculează statistici
  const consumptions = invoices
    .map(inv => parseFloat(inv.consumption) || 0)
    .filter(c => c > 0);

  if (consumptions.length === 0) {
    return [{ type: 'allZero', severity: 'error', message: 'All consumption values are zero' }];
  }

  const avg = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
  const median = consumptions.sort((a, b) => a - b)[Math.floor(consumptions.length / 2)];
  const stdDev = Math.sqrt(
    consumptions.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / consumptions.length,
  );

  // Check fiecare factură
  invoices.forEach((inv, idx) => {
    const c = parseFloat(inv.consumption) || 0;
    const month = inv.month || `Month ${idx}`;

    // Zero consumption
    if (c === 0) {
      issues.push({
        type: 'zeroConsumption',
        severity: 'warning',
        month,
        message: `No consumption recorded for ${month}`,
      });
    }

    // Negative consumption
    if (c < 0) {
      issues.push({
        type: 'negativeConsumption',
        severity: 'error',
        month,
        value: c,
        message: `Negative consumption: ${c} (likely data entry error)`,
      });
    }

    // Spike (>2.5 std dev from mean)
    if (c > avg + 2.5 * stdDev) {
      issues.push({
        type: 'consumptionSpike',
        severity: 'warning',
        month,
        value: c,
        average: avg.toFixed(1),
        spike_factor: (c / avg).toFixed(1),
        message: `Consumption spike: ${c} (${((c / avg - 1) * 100).toFixed(0)}% above average)`,
      });
    }

    // Outlier low (>2.5 std dev below mean)
    if (c < avg - 2.5 * stdDev && c > 0) {
      issues.push({
        type: 'lowConsumption',
        severity: 'info',
        month,
        value: c,
        average: avg.toFixed(1),
        message: `Low consumption: ${c} (${((1 - c / avg) * 100).toFixed(0)}% below average)`,
      });
    }

    // Price check
    const price = parseFloat(inv.price) || 0;
    if (price < 0) {
      issues.push({
        type: 'negativePrice',
        severity: 'error',
        month,
        value: price,
        message: `Negative price: ${price} EUR`,
      });
    }

    // Price/consumption ratio
    if (c > 0 && price > 0) {
      const unitPrice = price / c;
      if (unitPrice < 0.01 || unitPrice > 1000) {
        issues.push({
          type: 'suspiciousPrice',
          severity: 'warning',
          month,
          unitPrice: unitPrice.toFixed(3),
          message: `Unusual unit price: ${unitPrice.toFixed(3)} EUR/unit`,
        });
      }
    }
  });

  return issues;
}

/**
 * Validează date clădire completate
 */
function validateBuildingData(building) {
  const issues = [];
  const required = ['address', 'Au', 'V', 'category'];

  required.forEach(field => {
    if (!building[field]) {
      issues.push({
        type: 'missingField',
        severity: 'error',
        field,
        message: `Required field missing: ${field}`,
      });
    }
  });

  // Validație logică
  const au = parseFloat(building.Au) || 0;
  const v = parseFloat(building.V) || 0;

  if (au < 10) {
    issues.push({
      type: 'invalidArea',
      severity: 'error',
      value: au,
      message: 'Useful area too small (<10 m²)',
    });
  }

  if (v < 20) {
    issues.push({
      type: 'invalidVolume',
      severity: 'error',
      value: v,
      message: 'Volume too small (<20 m³)',
    });
  }

  // Check plausibility: V/Au ratio (should be 2.5–4.5)
  if (au > 0) {
    const ratio = v / au;
    if (ratio < 2.0 || ratio > 5.0) {
      issues.push({
        type: 'implausibleRatio',
        severity: 'warning',
        Au: au,
        V: v,
        ratio: ratio.toFixed(2),
        message: `V/Au ratio seems off (${ratio.toFixed(2)}), expected 2.5–4.5`,
      });
    }
  }

  return issues;
}

/**
 * Validează caracteristici constructive (U-values, straturi)
 */
function validateEnvelopeData(opaqueElements, glazingElements) {
  const issues = [];

  // Check opaque elements
  (opaqueElements || []).forEach((el, idx) => {
    if (!el.U && (!el.layers || el.layers.length === 0)) {
      issues.push({
        type: 'missingUValue',
        severity: 'error',
        element: `Opaque #${idx} (${el.type})`,
        message: 'U-value or layer composition required',
      });
    }

    // Check layers
    if (el.layers && el.layers.length > 0) {
      el.layers.forEach((layer, lidx) => {
        if (!layer.material) {
          issues.push({
            type: 'missingMaterial',
            severity: 'warning',
            element: `Opaque #${idx}, Layer #${lidx}`,
            message: 'Material name missing',
          });
        }
        const lambda = parseFloat(layer.lambda) || 0;
        if (lambda <= 0 || lambda > 10) {
          issues.push({
            type: 'implausibleLambda',
            severity: 'error',
            element: `Opaque #${idx}, Layer #${lidx}`,
            value: lambda,
            message: `Lambda coefficient out of range: ${lambda} (expected 0.05–2.0)`,
          });
        }
      });
    }
  });

  // Check glazing elements
  (glazingElements || []).forEach((gl, idx) => {
    const u = parseFloat(gl.U) || 0;
    if (u <= 0 || u > 10) {
      issues.push({
        type: 'implausibleU',
        severity: 'error',
        element: `Glazing #${idx}`,
        value: u,
        message: `U-value out of range: ${u} (expected 0.5–5.0 W/m²K)`,
      });
    }

    const g = parseFloat(gl.g) || 0;
    if (g < 0 || g > 1) {
      issues.push({
        type: 'implausibleG',
        severity: 'warning',
        element: `Glazing #${idx}`,
        value: g,
        message: `Solar transmittance out of range: ${g} (expected 0–1)`,
      });
    }
  });

  return issues;
}

/**
 * Vercel Handler
 * POST /api/validate-audit-data
 * Body: { consumption: [{month, consumption, price}], building, opaqueElements, glazingElements }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { consumption, building, opaqueElements, glazingElements } = req.body;

  try {
    const allIssues = [];

    // Validare consum
    if (consumption) {
      const consumptionIssues = validateConsumption(consumption);
      allIssues.push(...consumptionIssues);
    }

    // Validare date clădire
    if (building) {
      const buildingIssues = validateBuildingData(building);
      allIssues.push(...buildingIssues);
    }

    // Validare anvelopă
    if (opaqueElements || glazingElements) {
      const envelopeIssues = validateEnvelopeData(opaqueElements, glazingElements);
      allIssues.push(...envelopeIssues);
    }

    // Classifcă severity
    const errors = allIssues.filter(i => i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');
    const info = allIssues.filter(i => i.severity === 'info');

    const isValid = errors.length === 0;

    return res.status(200).json({
      valid: isValid,
      summary: {
        total: allIssues.length,
        errors: errors.length,
        warnings: warnings.length,
        info: info.length,
      },
      issues: allIssues,
      recommendation: isValid
        ? 'Data looks good. Ready for energy calculation.'
        : 'Please fix errors before proceeding.',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: error.message,
    });
  }
}
