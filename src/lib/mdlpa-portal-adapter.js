/**
 * mdlpa-portal-adapter.js — Adapter pattern pentru portal electronic MDLPA
 *
 * Sprint MDLPA Faza 0 (27 apr 2026) — Layer de abstracție peste viitorul API
 * portal MDLPA introdus prin Ord. 348/2026 (MO 292 / 14 apr 2026).
 *
 * STATUS ACTUAL:
 *   - Specificațiile API NU sunt încă publicate de MDLPA (estimat: mai-iunie 2026)
 *   - Acest adapter rulează în MOCK MODE — răspunsuri simulate cu latency realist
 *   - Când API real devine disponibil → înlocuim doar `_realApiCall()` cu fetch real
 *
 * COMPATIBILITATE:
 *   - Coexistă cu fluxul email existent (mdlpa-submit.js — Sprint 17)
 *   - Auditorul alege metoda în UI (`MDLPAPortalSubmit` vs. `MDLPASubmitPanel`)
 *
 * INTERFAȚĂ STABILĂ:
 *   - submitDocument(payload) → Promise<SubmitResult>
 *   - checkStatus(reference_id) → Promise<StatusResult>
 *   - healthCheck() → Promise<HealthStatus>
 */

// ─── CONSTANTE ─────────────────────────────────────────────────────────────

export const PORTAL_BASE_URL = "https://portal.mdlpa.ro/api/v1"; // estimat; va fi confirmat
export const PORTAL_OPERATIONAL_DATE = "2026-07-08";              // estimat: 60 zile lucrătoare după MO 292
export const ADAPTER_VERSION = "0.1.0-mock";

export const SUBMIT_ENDPOINTS = {
  CPE: "/submissions/cpe",
  RAE: "/submissions/rae",
  PASAPORT: "/submissions/pasaport-renovare",
  ATESTARE: "/atestari/cerere",
  EXTINDERE: "/atestari/extindere",
  REINNOIRE: "/atestari/reinnoire",
  RAPORT_ANUAL: "/raportari/anual",
};

// Erori specifice portal
export const PORTAL_ERRORS = {
  NETWORK: "PORTAL_NETWORK_ERROR",
  TIMEOUT: "PORTAL_TIMEOUT",
  AUTH: "PORTAL_AUTH_ERROR",
  VALIDATION: "PORTAL_VALIDATION_ERROR",
  RATE_LIMIT: "PORTAL_RATE_LIMIT",
  SERVER: "PORTAL_SERVER_ERROR",
  UNKNOWN: "PORTAL_UNKNOWN",
};

// ─── MOD MOCK / REAL ───────────────────────────────────────────────────────

/**
 * Determină dacă rulăm în mod mock (înainte de operaționalizarea API)
 * sau în mod real (după). Default: mock.
 *
 * Override prin env var: VITE_MDLPA_PORTAL_MODE=real
 */
export function isMockMode() {
  if (typeof process !== "undefined" && process.env?.MDLPA_PORTAL_MODE === "real") return false;
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_MDLPA_PORTAL_MODE === "real") return false;
  return true;
}

// ─── INTERFAȚĂ PUBLICĂ ─────────────────────────────────────────────────────

/**
 * Trimite un document la portalul MDLPA.
 *
 * @param {object} payload
 * @param {string} payload.document_type — CPE | RAE | PASAPORT | ATESTARE | etc.
 * @param {string} payload.document_uuid — UUID v5 generat de Zephren
 * @param {string} payload.document_xml  — Conținut XML conform schemei MDLPA
 * @param {string} payload.auditor_atestat — Nr. atestat
 * @param {string} [payload.document_pdf_base64] — PDF/A-1b opțional
 * @param {object} [payload.metadata] — Câmpuri suplimentare
 *
 * @returns {Promise<{
 *   success: boolean,
 *   reference_id: string|null,
 *   registry_url: string|null,
 *   acknowledged_at: string|null,
 *   error_code: string|null,
 *   error_message: string|null,
 *   raw_response: object,
 * }>}
 */
export async function submitDocument(payload) {
  validatePayloadShape(payload);

  if (isMockMode()) {
    return _mockSubmit(payload);
  }
  return _realApiCall(payload);
}

/**
 * Verifică statusul unei depuneri anterioare.
 *
 * @param {string} reference_id — ID returnat de portal la submit
 * @returns {Promise<{
 *   status: 'pending'|'accepted'|'rejected'|'unknown',
 *   processed_at: string|null,
 *   note: string|null,
 *   raw_response: object,
 * }>}
 */
export async function checkStatus(reference_id) {
  if (!reference_id) throw new Error("reference_id required");
  if (isMockMode()) return _mockCheckStatus(reference_id);
  return _realCheckStatus(reference_id);
}

/**
 * Verifică dacă portalul e disponibil (health check).
 *
 * @returns {Promise<{
 *   up: boolean,
 *   latency_ms: number,
 *   version: string|null,
 *   mode: 'mock'|'real',
 * }>}
 */
export async function healthCheck() {
  const start = Date.now();
  if (isMockMode()) {
    await _sleep(50 + Math.random() * 100);
    return {
      up: true,
      latency_ms: Date.now() - start,
      version: "mock-1.0",
      mode: "mock",
    };
  }
  try {
    const res = await fetch(`${PORTAL_BASE_URL}/health`, { method: "GET" });
    return {
      up: res.ok,
      latency_ms: Date.now() - start,
      version: res.headers.get("X-Portal-Version") || null,
      mode: "real",
    };
  } catch (e) {
    return { up: false, latency_ms: Date.now() - start, version: null, mode: "real" };
  }
}

// ─── VALIDARE FORMĂ PAYLOAD ────────────────────────────────────────────────

export function validatePayloadShape(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload trebuie să fie un obiect");
  }
  const required = ["document_type", "document_uuid", "document_xml", "auditor_atestat"];
  for (const f of required) {
    if (!payload[f]) throw new Error(`Câmp obligatoriu lipsă: ${f}`);
  }
  if (!SUBMIT_ENDPOINTS[payload.document_type]) {
    throw new Error(`document_type invalid: ${payload.document_type}`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.document_uuid)) {
    throw new Error("document_uuid trebuie să fie UUID v4/v5 valid");
  }
  return true;
}

// ─── IMPLEMENTARE MOCK ─────────────────────────────────────────────────────

async function _mockSubmit(payload) {
  // Simulează latency realist (200-800 ms)
  await _sleep(200 + Math.random() * 600);

  // Simulează rate de eșec controlat (5% în mock, util pentru testare retry)
  const rand = Math.random();
  if (rand < 0.02) {
    return _failureResponse(PORTAL_ERRORS.NETWORK, "Conexiune întreruptă către portal (mock)");
  }
  if (rand < 0.04) {
    return _failureResponse(PORTAL_ERRORS.SERVER, "Eroare internă portal MDLPA (mock 500)");
  }
  if (rand < 0.05) {
    return _failureResponse(PORTAL_ERRORS.VALIDATION, "Validare schema XML eșuată (mock)");
  }

  // Success path
  const referenceId = `MDLPA-MOCK-${Date.now()}-${payload.document_uuid.slice(0, 8)}`;
  return {
    success: true,
    reference_id: referenceId,
    registry_url: `https://portal.mdlpa.ro/registru/${referenceId}`,
    acknowledged_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
    raw_response: {
      mock: true,
      adapter_version: ADAPTER_VERSION,
      document_type: payload.document_type,
      document_uuid: payload.document_uuid,
      received_at: new Date().toISOString(),
    },
  };
}

async function _mockCheckStatus(reference_id) {
  await _sleep(100 + Math.random() * 200);
  return {
    status: "accepted",
    processed_at: new Date().toISOString(),
    note: `Mock: depunere ${reference_id} acceptată`,
    raw_response: { mock: true, reference_id },
  };
}

// ─── IMPLEMENTARE REALĂ (stub — va fi populat când API e publicat) ────────

async function _realApiCall(payload) {
  const endpoint = SUBMIT_ENDPOINTS[payload.document_type];
  const url = `${PORTAL_BASE_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auditor-Atestat": payload.auditor_atestat,
        // TODO: adăugat în Faza 1 când MDLPA publică schema auth (JWT? mTLS?)
        // "Authorization": `Bearer ${getPortalAuthToken()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const code = _mapStatusCodeToError(res.status);
      return _failureResponse(code, data?.message || `HTTP ${res.status}`, data, res.status);
    }

    return {
      success: true,
      reference_id: data.reference_id || data.id || null,
      registry_url: data.registry_url || data.public_url || null,
      acknowledged_at: data.acknowledged_at || new Date().toISOString(),
      error_code: null,
      error_message: null,
      raw_response: data,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return _failureResponse(PORTAL_ERRORS.TIMEOUT, "Timeout 30s către portal MDLPA");
    }
    return _failureResponse(PORTAL_ERRORS.NETWORK, err.message || "Network error");
  }
}

async function _realCheckStatus(reference_id) {
  try {
    const res = await fetch(`${PORTAL_BASE_URL}/submissions/${reference_id}`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    return {
      status: data.status || "unknown",
      processed_at: data.processed_at || null,
      note: data.note || null,
      raw_response: data,
    };
  } catch (e) {
    return { status: "unknown", processed_at: null, note: e.message, raw_response: { error: e.message } };
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function _failureResponse(code, message, raw = {}, statusCode = null) {
  return {
    success: false,
    reference_id: null,
    registry_url: null,
    acknowledged_at: null,
    error_code: code,
    error_message: message,
    status_code: statusCode,
    raw_response: raw,
  };
}

function _mapStatusCodeToError(status) {
  if (status === 401 || status === 403) return PORTAL_ERRORS.AUTH;
  if (status === 422 || status === 400) return PORTAL_ERRORS.VALIDATION;
  if (status === 429) return PORTAL_ERRORS.RATE_LIMIT;
  if (status >= 500) return PORTAL_ERRORS.SERVER;
  return PORTAL_ERRORS.UNKNOWN;
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
