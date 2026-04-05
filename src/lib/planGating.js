/**
 * planGating.js
 *
 * Feature gating based on user subscription plan.
 * Defines which features are available at each tier (free, pro, business).
 * Synced with TIERS in energy-calc.jsx.
 */

export const PLAN_FEATURES = {
  free: {
    maxProjects: 2,
    maxCerts: 0,
    exportDOCX: false,
    exportXML: false,
    nzebReport: false,
    aiAssistant: false,
    multiUser: false,
    api: false,
    watermark: true,
    brandingCPE: false,
  },
  pro: {
    maxProjects: 999,
    maxCerts: 15,
    exportDOCX: true,
    exportXML: true,
    nzebReport: true,
    aiAssistant: false,
    multiUser: false,
    api: false,
    watermark: false,
    brandingCPE: false,
  },
  business: {
    maxProjects: 999,
    maxCerts: 999,
    exportDOCX: true,
    exportXML: true,
    nzebReport: true,
    aiAssistant: true,
    multiUser: true,
    api: true,
    watermark: false,
    brandingCPE: true,
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
