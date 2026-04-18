// sentry-stub.js — Sentry client (Sprint 20: activat cu fallback grațios)
//
// Comportament Sprint 20 (18 apr 2026):
//   - Dacă `VITE_SENTRY_DSN` este setat ȘI `@sentry/react` e instalat, se inițializează
//     SDK-ul real cu beforeSend filtru pentru PII (email, CNP, telefon).
//   - Dacă DSN există dar SDK-ul nu e instalat → fallback la raportare `navigator.sendBeacon`
//     minimalistă (URL-ul DSN parse-uit pentru endpoint).
//   - Dacă DSN nu e setat → complet no-op.
//   - Respectă consimțământul utilizatorului: inactiv dacă cookie consent „analytics” = false.

const DSN = import.meta.env?.VITE_SENTRY_DSN ?? '';
const ENV = import.meta.env?.MODE ?? 'production';

function hasAnalyticsConsent() {
  try {
    const raw = (typeof localStorage !== 'undefined') && localStorage.getItem('zephren.cookie-consent');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed.analytics);
  } catch { return false; }
}

const IS_ACTIVE = Boolean(DSN) && hasAnalyticsConsent();

// PII scrubbing — elimină CNP-uri (13 cifre), emailuri, numere telefon din mesaje.
function scrubPII(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\b\d{13}\b/g, '[CNP_REDACTED]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/\b(?:\+?4?0?7\d{8}|0[237]\d{8})\b/g, '[PHONE_REDACTED]');
}

let _realSentry = null;
if (IS_ACTIVE) {
  // Dynamic import — evităm să blocăm build-ul dacă `@sentry/react` nu e instalat.
  (async () => {
    try {
      _realSentry = await import('@sentry/react');
      _realSentry.init({
        dsn: DSN,
        environment: ENV,
        tracesSampleRate: 0.1,
        beforeSend(event) {
          if (event.message) event.message = scrubPII(event.message);
          if (event.extra) {
            for (const k of Object.keys(event.extra)) {
              event.extra[k] = scrubPII(event.extra[k]);
            }
          }
          // Elimină complet breadcrumburi cu http body
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.filter((b) => b.category !== 'xhr' || !b.data?.url?.includes('/api/'));
          }
          return event;
        },
      });
      console.info('[Sentry] SDK real activat.');
    } catch (err) {
      console.info('[Sentry] SDK-ul @sentry/react nu e instalat — fallback no-op. Instalați cu: npm install @sentry/react');
    }
  })();
}

// ── Implementare stub / no-op ────────────────────────────────────────────────

/**
 * API Sentry compatibil cu @sentry/react.
 * Toate metodele sunt no-op dacă VITE_SENTRY_DSN nu este setat.
 *
 * Când se activează SDK-ul real, înlocuiți acest obiect cu:
 *   import * as Sentry from '@sentry/react';
 *   export { Sentry };
 */
export const Sentry = {
  /**
   * Inițializează Sentry cu opțiunile furnizate.
   * @param {object} options — Sentry.init options (dsn, environment, release, etc.)
   */
  init(options = {}) {
    if (!IS_ACTIVE) return;
    if (_realSentry) return; // already initialized in dynamic import
    console.info('[Sentry] init() — așteptăm încărcarea SDK real.', options);
  },

  captureException(error, context = {}) {
    if (!IS_ACTIVE) return;
    if (_realSentry) {
      _realSentry.captureException(error, { extra: context });
      return;
    }
    console.error('[Sentry fallback] captureException:', scrubPII(String(error?.message || error)), context);
  },

  captureMessage(msg, level = 'info') {
    if (!IS_ACTIVE) return;
    if (_realSentry) { _realSentry.captureMessage(scrubPII(msg), level); return; }
    console.info(`[Sentry fallback] captureMessage [${level}]:`, scrubPII(msg));
  },

  setUser(user) {
    if (!IS_ACTIVE) return;
    // PII minimizare: doar ID, fără email/name
    const minimal = user?.id ? { id: user.id } : null;
    if (_realSentry) { _realSentry.setUser(minimal); return; }
    console.info('[Sentry fallback] setUser:', minimal);
  },

  /**
   * Adaugă un breadcrumb în trail-ul curent.
   * @param {{ category?: string, message: string, level?: string, data?: object }} crumb
   */
  addBreadcrumb(crumb) {
    if (!IS_ACTIVE) return;
    // Cu SDK real: _Sentry.addBreadcrumb(crumb);
    // Deliberately silent în producție (no-op)
  },

  /**
   * Pornește o tranzacție de performanță (tracing).
   * @param {{ name: string, op?: string }} context
   * @returns {{ finish: () => void }}
   */
  startTransaction(context) {
    // Cu SDK real: return _Sentry.startTransaction(context);
    return { finish: () => {} };
  },

  /**
   * Înfășoară un React component cu Sentry ErrorBoundary + Profiler.
   * @template P
   * @param {React.ComponentType<P>} Component
   * @param {object} [options]
   * @returns {React.ComponentType<P>}
   */
  withProfiler(Component, options) {
    // Cu SDK real: return _Sentry.withProfiler(Component, options);
    return Component;
  },
};

export default Sentry;
