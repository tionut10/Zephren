// ErrorBoundary.jsx — Error Boundary React per componentă
// Pct. 56 — Infrastructură tehnică Zephren v3.4
//
// Prinde erorile din arborele de componente copil și afișează un UI de fallback
// în loc să crape întreaga aplicație.

import React from 'react';
import { Sentry } from '../lib/sentry-stub.js';

// ── Componentă principală ────────────────────────────────────────────────────

/**
 * Error Boundary React.
 *
 * Props:
 *   children     — arborele de componente protejat
 *   fallback     — element React custom afișat la eroare (opțional)
 *   moduleName   — numele modulului, afișat în mesajul de eroare
 *   onError      — callback(error, errorInfo) apelat la prinderea erorii
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { moduleName, onError } = this.props;

    // Logare în consolă
    console.error(
      `[ErrorBoundary] Eroare în modulul "${moduleName ?? 'necunoscut'}":`,
      error,
      errorInfo,
    );

    // Raportare Sentry (no-op dacă DSN-ul nu este configurat)
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo?.componentStack,
        moduleName: moduleName ?? 'necunoscut',
      },
    });
    Sentry.addBreadcrumb({
      category: 'error-boundary',
      message: `Eroare prinsă în "${moduleName ?? 'necunoscut'}"`,
      level: 'error',
    });

    // Callback extern opțional
    if (typeof onError === 'function') {
      onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, moduleName } = this.props;

    if (!hasError) return children;

    // Fallback custom furnizat din exterior
    if (fallback) return fallback;

    // ── UI fallback implicit ─────────────────────────────────────────────
    return (
      <div
        role="alert"
        style={{
          border: '1px solid #f87171',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          margin: '1rem 0',
          background: '#1e1e2e',
          color: '#e2e8f0',
          fontFamily: 'DM Sans, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠</span>
          <strong style={{ color: '#f87171', fontSize: '1rem' }}>
            Modulul {moduleName ? `"${moduleName}"` : ''} a întâmpinat o eroare
          </strong>
        </div>

        {error?.message && (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {error.message}
          </p>
        )}

        <button
          onClick={this.handleReset}
          style={{
            background: '#f59e0b',
            color: '#0d1117',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1.2rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#fbbf24'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = '#f59e0b'; }}
        >
          Reîncarcă modulul
        </button>

        {import.meta.env?.DEV && error?.stack && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
              Stack trace (dev)
            </summary>
            <pre
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                overflowX: 'auto',
                marginTop: '0.5rem',
                lineHeight: 1.4,
              }}
            >
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

// ── HOC withErrorBoundary ────────────────────────────────────────────────────

/**
 * Higher-Order Component care învelește o componentă într-un ErrorBoundary.
 *
 * @param {React.ComponentType} Component — componenta de învelit
 * @param {string} [moduleName]            — numele modulului (pentru mesaj)
 * @param {object} [boundaryProps]         — props suplimentare pentru ErrorBoundary
 * @returns {React.ComponentType}
 */
export function withErrorBoundary(Component, moduleName, boundaryProps = {}) {
  const displayName = moduleName ?? Component.displayName ?? Component.name ?? 'Component';

  function WrappedComponent(props) {
    return (
      <ErrorBoundary moduleName={displayName} {...boundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}
