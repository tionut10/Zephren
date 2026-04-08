// sentry-stub.js — Stub Sentry pentru error tracking
// Pct. 57 — Infrastructură tehnică Zephren v3.4
//
// Activare reală:
//   1. Instalează: npm install @sentry/react
//   2. Setează VITE_SENTRY_DSN în fișierul .env
//   3. Înlocuiește implementarea stub cu SDK-ul real (vezi comentariile de mai jos)
//
// Dacă VITE_SENTRY_DSN nu este setat, toate funcțiile sunt no-op.

const DSN = import.meta.env?.VITE_SENTRY_DSN ?? '';
const IS_ACTIVE = Boolean(DSN);

if (IS_ACTIVE) {
  console.info('[Sentry] DSN detectat — activați SDK-ul real (@sentry/react) pentru raportare completă.');
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
    // Cu SDK real:
    // import * as _Sentry from '@sentry/react';
    // _Sentry.init({ dsn: DSN, ...options });
    console.info('[Sentry stub] init() — DSN configurat, dar SDK-ul real nu este instalat.', options);
  },

  /**
   * Capturează o excepție și o trimite la Sentry.
   * @param {Error | unknown} error
   * @param {object} [context] — context suplimentar (extra, tags, user, etc.)
   */
  captureException(error, context = {}) {
    if (!IS_ACTIVE) return;
    // Cu SDK real: _Sentry.captureException(error, context);
    console.error('[Sentry stub] captureException:', error, context);
  },

  /**
   * Capturează un mesaj text și îl trimite la Sentry.
   * @param {string} msg
   * @param {'fatal'|'error'|'warning'|'info'|'debug'} [level]
   */
  captureMessage(msg, level = 'info') {
    if (!IS_ACTIVE) return;
    // Cu SDK real: _Sentry.captureMessage(msg, level);
    console.info(`[Sentry stub] captureMessage [${level}]:`, msg);
  },

  /**
   * Setează identitatea utilizatorului curent pentru sesiunea Sentry.
   * @param {{ id?: string, email?: string, username?: string }} user
   */
  setUser(user) {
    if (!IS_ACTIVE) return;
    // Cu SDK real: _Sentry.setUser(user);
    console.info('[Sentry stub] setUser:', user);
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
