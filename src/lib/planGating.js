/**
 * planGating.js
 *
 * Feature gating based on user subscription plan.
 * Structura planuri: Free / Standard / Pro / Asociație
 * Sursa prețuri: SCENARII_MONETIZARE_ZEPHREN v1.0, apr. 2026
 */

export const PLAN_FEATURES = {
  free: {
    maxProjects:  99,
    maxCerts:     3,      // 3 CPE/lună
    exportDOCX:   false,  // DOCX cu watermark
    exportXML:    false,
    nzebReport:   false,
    aiAssistant:  false,
    multiUser:    false,
    maxUsers:     1,
    api:          false,
    watermark:    true,
    brandingCPE:  false,
  },
  standard: {
    maxProjects:  999,
    maxCerts:     999,    // CPE nelimitat
    exportDOCX:   true,   // PDF fără watermark + DOCX
    exportXML:    false,
    nzebReport:   true,
    aiAssistant:  false,
    multiUser:    false,
    maxUsers:     1,
    api:          false,
    watermark:    false,
    brandingCPE:  false,
  },
  pro: {
    maxProjects:  999,
    maxCerts:     999,
    exportDOCX:   true,
    exportXML:    true,   // Export XML registru MDLPA
    nzebReport:   true,
    aiAssistant:  false,
    multiUser:    true,
    maxUsers:     5,
    api:          true,
    watermark:    false,
    brandingCPE:  false,
  },
  asociatie: {
    maxProjects:  999,
    maxCerts:     999,
    exportDOCX:   true,
    exportXML:    true,
    nzebReport:   true,
    aiAssistant:  true,
    multiUser:    true,
    maxUsers:     20,
    api:          true,
    watermark:    false,
    brandingCPE:  true,
  },
  // backward compat — mapează vechiul "business" la asociatie
  business: {
    maxProjects:  999,
    maxCerts:     999,
    exportDOCX:   true,
    exportXML:    true,
    nzebReport:   true,
    aiAssistant:  true,
    multiUser:    true,
    maxUsers:     20,
    api:          true,
    watermark:    false,
    brandingCPE:  true,
  },
};

/**
 * Check whether a given plan grants access to a specific feature.
 * @param {string|null|undefined} plan
 * @param {string} feature - Key from PLAN_FEATURES
 * @returns {boolean}
 */
export function canAccess(plan, feature) {
  const tier = PLAN_FEATURES[plan || "free"];
  if (!tier) return false;
  const val = tier[feature];
  return typeof val === "boolean" ? val : !!val;
}
