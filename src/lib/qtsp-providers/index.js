/**
 * qtsp-providers/index.js — Factory pentru semnături QTSP RO.
 *
 * Furnizori suportați (la 6 mai 2026):
 *   - mock      — placeholder funcțional pentru testing și pilot pre-onboarding
 *   - certsign  — certSIGN PARAPHE (REST API + OAuth 2.0) — skeleton, activare cu env vars
 *   - digisign  — DigiSign (TBD post-onboarding)
 *   - transsped — TransSped (TBD post-onboarding)
 *   - alfasign  — AlfaSign (TBD post-onboarding)
 *
 * Activare provider real:
 *   1. Cont test la QTSP RO (formă juridică SRL/PFA + CNP/CUI verificat ANAF)
 *   2. Setare env vars (vezi docs/CERTSIGN_SETUP.md)
 *   3. Setare signerConfig.provider = "certsign" în Step6Certificate.jsx
 *
 * Toate provider-ele expun aceeași interfață:
 *   sign(hash: Uint8Array, options): Promise<{
 *     cmsHex: string,
 *     providerLabel?: string,
 *     certificateSubject?: string,
 *     certificateIssuer?: string,
 *     isMock?: boolean,
 *     warnings?: string[]
 *   }>
 *
 * Sprint Conformitate P0-02 (6 mai 2026).
 */

/**
 * Providers disponibili — registry cu lazy import.
 * Ordine: mock primul (default fallback), apoi REST providers.
 */
const PROVIDERS_REGISTRY = {
  mock: () => import("./mock.js"),
  certsign: () => import("./certsign.js"),
  // digisign, transsped, alfasign — TBD post-onboarding
};

/**
 * Returnează signer-ul pentru un provider specific.
 *
 * @param {string} providerName — "mock" | "certsign" | ...
 * @param {object} [credentials] — credențiale specifice provider
 * @returns {Promise<{sign: Function, providerName: string, label: string}>}
 */
export async function getProvider(providerName = "mock", credentials = {}) {
  const lower = String(providerName || "mock").toLowerCase();
  const importer = PROVIDERS_REGISTRY[lower];

  if (!importer) {
    console.warn(
      `[QTSP] Provider "${providerName}" not registered. Available: ${Object.keys(PROVIDERS_REGISTRY).join(", ")}. Fallback la mock.`,
    );
    return getProvider("mock", credentials);
  }

  try {
    const module = await importer();
    if (typeof module.createSigner !== "function") {
      throw new Error(`Provider "${providerName}" missing createSigner() export`);
    }
    return module.createSigner(credentials);
  } catch (e) {
    // Fallback la mock cu warning user-friendly
    console.warn(
      `[QTSP] Failed to instantiate "${providerName}": ${e?.message}. Fallback la mock.`,
    );
    if (lower !== "mock") {
      return getProvider("mock", credentials);
    }
    throw e; // dacă mock-ul însuși eșuează, propagăm
  }
}

/**
 * Lista provider-elor disponibili (pentru UI selector).
 *
 * @returns {Array<{id: string, label: string, status: "available"|"skeleton"|"planned"}>}
 */
export function listProviders() {
  return [
    { id: "mock", label: "Mock (testing/pilot)", status: "available" },
    { id: "certsign", label: "certSIGN PARAPHE", status: "skeleton" },
    { id: "digisign", label: "DigiSign", status: "planned" },
    { id: "transsped", label: "TransSped", status: "planned" },
    { id: "alfasign", label: "AlfaSign", status: "planned" },
  ];
}
