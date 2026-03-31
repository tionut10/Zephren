/**
 * planGating.js
 *
 * Feature gating based on user subscription plan.
 * Defines which features are available at each tier (free, pro, business)
 * and provides a helper to check access.
 */

export const PLAN_FEATURES = {
  free: {
    maxProjects: 2,
    exportDOCX: false,
    exportXML: false,
    nzebReport: false,
    aiAssistant: false,
    multiUser: false,
    api: false,
  },
  pro: {
    maxProjects: Infinity,
    exportDOCX: true,
    exportXML: true,
    nzebReport: true,
    aiAssistant: false,
    multiUser: false,
    api: false,
  },
  business: {
    maxProjects: Infinity,
    exportDOCX: true,
    exportXML: true,
    nzebReport: true,
    aiAssistant: true,
    multiUser: true,
    api: true,
  },
};

/**
 * Check whether a given plan grants access to a specific feature.
 *
 * @param {string|null|undefined} plan - The user's plan ("free", "pro", "business").
 *   Falls back to "free" when null/undefined.
 * @param {string} feature - One of the keys in PLAN_FEATURES (e.g. "exportDOCX").
 * @returns {boolean} Whether the feature is enabled for the plan.
 */
export function canAccess(plan, feature) {
  return PLAN_FEATURES[plan || "free"][feature] || false;
}
