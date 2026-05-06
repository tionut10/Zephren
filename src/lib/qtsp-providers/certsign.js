/**
 * qtsp-providers/certsign.js — Provider certSIGN PARAPHE (REST API + OAuth 2.0).
 *
 * STATUS: SKELETON (Sprint Conformitate P0-02, 6 mai 2026).
 * Activare necesită:
 *   - Cont test la certSIGN (https://www.certsign.ro/business — formular înrolare)
 *   - Env vars CERTSIGN_CLIENT_ID + CERTSIGN_CLIENT_SECRET (Vercel project settings)
 *   - Sau în development: VITE_CERTSIGN_CLIENT_ID + VITE_CERTSIGN_CLIENT_SECRET în .env
 *
 * REFERINȚĂ API certSIGN PARAPHE (v3.0):
 *   - Auth:     POST /api/oauth/token (client_credentials grant)
 *   - Certs:    GET  /api/certificates (listă certs disponibile pentru user)
 *   - Sign:     POST /api/sign (PDF hash + cert ID → CMS detached signature)
 *   - Verify:   POST /api/verify (CMS + hash → status PADES)
 *   - Timestamp: POST /api/tsa (RFC 3161 TSA pentru B-T)
 *
 * IMPORTANT: certSIGN API nu are CORS public (per documentație 2025). Apelurile DIRECT
 * din browser eșuează cu CORS error. Soluții:
 *   a) Endpoint serverless proxy (api/qtsp-proxy.js) — DAR Vercel limit 12/12 ATIN
 *   b) Apeluri server-side din altă funcție existentă (api/generate-document.py extension)
 *   c) Browser extension nativ certSIGN (instalat user) — cheie hardware token
 *
 * Strategia recomandată Sprint P0-02-bis (post upgrade Vercel Pro):
 *   - Adaugă endpoint api/qtsp-proxy.js care relay-uiește requests OAuth + sign
 *   - Browser apelează propriul endpoint Zephren → endpoint apelează certSIGN
 *   - Token cache server-side (memory cu TTL 1h)
 *
 * Pentru MVP fără upgrade Vercel: provider-ul aruncă eroare clară cu mesaj setup.
 *
 * BAZĂ LEGALĂ:
 *   - eIDAS 2 (Reg. UE 910/2014 modif. 2024/1183) — semnături calificate QTSP UE
 *   - Legea 214/2024 RO — transpunere eIDAS 2
 *   - Art. 4 alin. 6 Ord. MDLPA 348/2026 — portal MDLPA semnături calificate
 */

import { PADES_SUBFILTERS, PADES_LEVELS } from "../pades-sign.js";

const CERTSIGN_API_BASE = "https://api.certsign.ro/api";
const CERTSIGN_OAUTH_PATH = "/oauth/token";
const CERTSIGN_SIGN_PATH = "/sign";
const CERTSIGN_CERTS_PATH = "/certificates";

/**
 * Detecție mediu: read env vars în mod compatibil browser (globalThis config) + Node.
 *
 * Strategie:
 *   - Node/Vercel runtime: process.env.CERTSIGN_CLIENT_ID + CERTSIGN_CLIENT_SECRET
 *   - Browser runtime: globalThis.__ZEPHREN_CONFIG__ = { CERTSIGN_CLIENT_ID, ... }
 *     (set la init aplicație din Vite import.meta.env.VITE_CERTSIGN_*; vezi
 *     src/main.jsx pentru bootstrap pattern recomandat — TBD post-onboarding)
 *
 * @returns {{clientId: string|null, clientSecret: string|null, apiBase: string}}
 */
function readCertsignEnv() {
  let clientId = null;
  let clientSecret = null;
  let apiBase = CERTSIGN_API_BASE;

  // Node/Vercel runtime
  try {
    if (typeof process !== "undefined" && process.env) {
      clientId = process.env.CERTSIGN_CLIENT_ID || clientId;
      clientSecret = process.env.CERTSIGN_CLIENT_SECRET || clientSecret;
      apiBase = process.env.CERTSIGN_API_BASE || apiBase;
    }
  } catch { /* process not available */ }

  // Browser runtime (config global injectat la bootstrap)
  try {
    const cfg = (typeof globalThis !== "undefined" && globalThis.__ZEPHREN_CONFIG__) || null;
    if (cfg) {
      clientId = clientId || cfg.CERTSIGN_CLIENT_ID || null;
      clientSecret = clientSecret || cfg.CERTSIGN_CLIENT_SECRET || null;
      apiBase = cfg.CERTSIGN_API_BASE || apiBase;
    }
  } catch { /* globalThis access failed */ }

  return { clientId, clientSecret, apiBase };
}

/**
 * Token cache (in-memory, TTL 50 min — certSIGN tokens sunt valide 60 min).
 */
let cachedToken = null;
let cachedTokenExpiry = 0;

/**
 * Obține access_token de la certSIGN OAuth.
 *
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} apiBase
 * @returns {Promise<string>}
 */
async function getAccessToken(clientId, clientSecret, apiBase) {
  // Cache hit?
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const url = `${apiBase}${CERTSIGN_OAUTH_PATH}`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "sign",
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`certSIGN OAuth failed (HTTP ${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (!data.access_token) {
    throw new Error("certSIGN OAuth: missing access_token in response");
  }

  cachedToken = data.access_token;
  // Expiră cu 10 min înainte de TTL real (safety margin)
  const expiresIn = (data.expires_in || 3600) - 600;
  cachedTokenExpiry = Date.now() + expiresIn * 1000;

  return cachedToken;
}

/**
 * Apelează certSIGN /sign cu hash + cert ID.
 *
 * @param {Uint8Array} hash
 * @param {object} args
 * @param {string} args.token
 * @param {string} args.certificateId — primul cert disponibil dacă nu e specificat
 * @param {string} args.apiBase
 * @param {string} args.subFilter
 * @param {Date} args.signingTime
 * @returns {Promise<{cmsHex: string, certificateSubject: string, certificateIssuer: string}>}
 */
async function callCertsignSign(hash, { token, certificateId, apiBase, subFilter, signingTime }) {
  const url = `${apiBase}${CERTSIGN_SIGN_PATH}`;

  // hash → base64
  let hashBase64 = "";
  if (typeof btoa === "function") {
    let s = "";
    for (const b of hash) s += String.fromCharCode(b);
    hashBase64 = btoa(s);
  } else {
    hashBase64 = Buffer.from(hash).toString("base64");
  }

  const payload = {
    hash: hashBase64,
    hashAlgorithm: "SHA-256",
    certificateId,
    signatureFormat: "CAdES",
    signaturePackaging: "DETACHED",
    signatureLevel: subFilter === PADES_SUBFILTERS.ETSI_CADES_DETACHED ? "BASELINE-T" : "BASELINE-B",
    signingTime: signingTime.toISOString(),
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`certSIGN /sign failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  if (!data.signatureValue) {
    throw new Error("certSIGN /sign: missing signatureValue in response");
  }

  // Convert base64 CMS la hex
  let cmsHex = "";
  let cmsBytes;
  if (typeof atob === "function") {
    const bin = atob(data.signatureValue);
    cmsBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) cmsBytes[i] = bin.charCodeAt(i);
  } else {
    cmsBytes = Buffer.from(data.signatureValue, "base64");
  }
  for (const b of cmsBytes) cmsHex += b.toString(16).padStart(2, "0");

  return {
    cmsHex,
    certificateSubject: data.certificateSubject || "Unknown",
    certificateIssuer: data.certificateIssuer || "certSIGN",
  };
}

/**
 * Creează signer-ul certSIGN.
 *
 * @param {object} [credentials] — { clientId?, clientSecret?, certificateId? }
 *   Override env vars dacă sunt furnizate explicit.
 * @returns {{providerName: string, label: string, sign: Function}}
 */
export function createSigner(credentials = {}) {
  const env = readCertsignEnv();
  const clientId = credentials.clientId || env.clientId;
  const clientSecret = credentials.clientSecret || env.clientSecret;
  const apiBase = credentials.apiBase || env.apiBase;
  const certificateId = credentials.certificateId || null;

  if (!clientId || !clientSecret) {
    throw new Error(
      "certSIGN provider necesită CERTSIGN_CLIENT_ID + CERTSIGN_CLIENT_SECRET. " +
      "Setează env vars în Vercel project settings sau .env local. " +
      "Vezi docs/CERTSIGN_SETUP.md pentru pași onboarding.",
    );
  }

  return {
    providerName: "certsign",
    label: "certSIGN PARAPHE",

    async sign(hash, options = {}) {
      const signingTime = options.signingTime || new Date();
      const subFilter = options.subFilter || PADES_SUBFILTERS.ETSI_CADES_DETACHED;

      // 1. Obține access token (cache)
      const token = await getAccessToken(clientId, clientSecret, apiBase);

      // 2. Apelează /sign
      const result = await callCertsignSign(hash, {
        token,
        certificateId,
        apiBase,
        subFilter,
        signingTime,
      });

      return {
        cmsHex: result.cmsHex,
        providerLabel: "certSIGN PARAPHE",
        certificateSubject: result.certificateSubject,
        certificateIssuer: result.certificateIssuer,
        isMock: false,
        warnings: options.level === PADES_LEVELS.B_LT
          ? ["Pentru B-LT complet, integrează DSS dictionary post-signing cu certSIGN OCSP/CRL endpoint."]
          : [],
      };
    },
  };
}
