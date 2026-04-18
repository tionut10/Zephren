/**
 * Integrare cu registru central pașapoarte renovare MDLPA.
 * Status la 18 apr 2026: API INCĂ NEPUBLICAT.
 * Implementare provizorie: contract JSON + TODO pentru activare post-ordin.
 *
 * Termen transpunere EPBD 2024/1275: 29 mai 2026.
 */

export const REGISTRY_CONFIG = {
  enabled: false,
  baseUrl: null, // ex. "https://api.mdlpa.gov.ro/passport/v1" la publicare
  expectedApiVersion: "v1",
  lastChecked: "2026-04-18",
  documentationUrl: "https://mdlpa.gov.ro/passport-api-docs",
};

/**
 * TODO — când API MDLPA e disponibil:
 *   1. POST   /passport          → înregistrare pașaport nou
 *   2. PUT    /passport/{id}     → update pașaport existent
 *   3. GET    /passport/{id}     → fetch pașaport înregistrat
 *   4. DELETE /passport/{id}     → arhivare (admin only)
 */
export async function registerPassport(passport) {
  if (!REGISTRY_CONFIG.enabled || !REGISTRY_CONFIG.baseUrl) {
    return {
      success: false,
      reason: "registry_not_available",
      localOnly: true,
      note: "Registru MDLPA nepublicat oficial. Pașaport salvat doar local.",
    };
  }
  try {
    const res = await fetch(`${REGISTRY_CONFIG.baseUrl}/passport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passport),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      success: true,
      registryId: data.registryId,
      registryUrl: data.url,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { success: false, reason: "network_error", error: err.message };
  }
}

export async function syncPassportWithRegistry(passport) {
  if (!REGISTRY_CONFIG.enabled) {
    return { success: false, reason: "registry_not_available" };
  }
  // TODO: PUT /passport/{id} când API disponibil
  return { success: false, reason: "not_implemented" };
}

export async function fetchPassportFromRegistry(passportId) {
  if (!REGISTRY_CONFIG.enabled || !passportId) {
    return { success: false, reason: "registry_not_available" };
  }
  // TODO: GET /passport/{id}
  return { success: false, reason: "not_implemented" };
}

export function getRegistryStatus() {
  return {
    enabled: REGISTRY_CONFIG.enabled,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    lastChecked: REGISTRY_CONFIG.lastChecked,
    note: REGISTRY_CONFIG.enabled
      ? "Registru MDLPA activ — pașapoartele pot fi sincronizate central."
      : "Registru MDLPA încă nepublicat oficial. Pașaportul se salvează doar local până la publicarea API-ului.",
  };
}
