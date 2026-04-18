/**
 * CORS allowlist — Sprint 20 (18 apr 2026)
 *
 * Înlocuiește `Access-Control-Allow-Origin: *` cu allowlist explicită pentru a
 * preveni apeluri direct din site-uri third-party (reducere amplificare DoS +
 * reducere suprafață atac cross-origin).
 *
 * Utilizare:
 *   import { applyCors } from "./_middleware/cors.js";
 *   if (applyCors(req, res)) return;  // preflight handled
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://zephren.ro",
  "https://www.zephren.ro",
  "https://energy-app-ruby.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

function getAllowedOrigins() {
  const envList = process.env.CORS_ALLOWED_ORIGINS;
  if (envList) {
    return envList.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Aplică header-ele CORS pentru originea cerută dacă e în allowlist.
 * Returnează `true` dacă a răspuns deja (preflight OPTIONS) — apelantul
 * trebuie să facă `return` imediat.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ methods?: string, allowCredentials?: boolean }} [opts]
 * @returns {boolean} true dacă request-ul a fost preflight și deja răspuns
 */
export function applyCors(req, res, opts = {}) {
  const origin = req.headers.origin || "";
  const allowed = getAllowedOrigins();
  const methods = opts.methods || "POST, GET, OPTIONS";

  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    if (opts.allowCredentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }
  // Fără `*` — dacă originea nu e permisă, browserul blochează request-ul CORS.

  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24h cache preflight

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export default applyCors;
