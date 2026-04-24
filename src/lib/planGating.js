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
    // funcționalități noi
    gwpReport:              false, // Raport CO₂ lifecycle (EN 15978)
    devizPDF:               false, // Export deviz PDF (cu watermark pe free)
    devizExcel:             false, // Export deviz Excel
    buildingTemplatesFull:  false, // Toate șabloanele clădiri (free: doar 3)
    cpeAlertsExport:        false, // Export CSV alerte CPE
    mobileWizard:           false, // Wizard mobil colectare date
  },
  starter: {
    maxProjects:  999,
    maxCerts:     999,
    exportDOCX:   true,   // PDF fără watermark + DOCX
    exportXML:    false,
    nzebReport:   false,
    aiAssistant:  false,
    multiUser:    false,
    maxUsers:     1,
    api:          false,
    watermark:    false,
    brandingCPE:  false,
    // funcționalități noi
    gwpReport:              false,
    devizPDF:               true,
    devizExcel:             false,
    buildingTemplatesFull:  false, // Șabloanele complete rămân Standard+
    cpeAlertsExport:        false,
    mobileWizard:           false,
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
    // funcționalități noi
    gwpReport:              true,
    devizPDF:               true,
    devizExcel:             false,
    buildingTemplatesFull:  true,
    cpeAlertsExport:        true,
    mobileWizard:           true,
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
    // funcționalități noi
    gwpReport:              true,
    devizPDF:               true,
    devizExcel:             true,
    buildingTemplatesFull:  true,
    cpeAlertsExport:        true,
    mobileWizard:           true,
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
    // funcționalități noi
    gwpReport:              true,
    devizPDF:               true,
    devizExcel:             true,
    buildingTemplatesFull:  true,
    cpeAlertsExport:        true,
    mobileWizard:           true,
  },
  enterprise: {
    maxProjects:  999,
    maxCerts:     999,
    exportDOCX:   true,
    exportXML:    true,
    nzebReport:   true,
    aiAssistant:  true,
    multiUser:    true,
    maxUsers:     999,
    api:          true,
    watermark:    false,
    brandingCPE:  true,
    // funcționalități noi
    gwpReport:              true,
    devizPDF:               true,
    devizExcel:             true,
    buildingTemplatesFull:  true,
    cpeAlertsExport:        true,
    mobileWizard:           true,
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
    // funcționalități noi
    gwpReport:              true,
    devizPDF:               true,
    devizExcel:             true,
    buildingTemplatesFull:  true,
    cpeAlertsExport:        true,
    mobileWizard:           true,
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
