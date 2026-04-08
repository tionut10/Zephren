// PWAInstallPrompt.jsx — Banner instalare PWA
// Pct. 62 — Infrastructură tehnică Zephren v3.4
//
// Detectează evenimentul beforeinstallprompt și afișează un banner subtil
// în colțul din dreapta-jos al ecranului.
// Dacă utilizatorul refuză, nu mai arată bannerul timp de 30 de zile.

import { useState, useEffect, useCallback } from 'react';

const LS_KEY_DISMISSED = 'zephren_pwa_dismiss_until';
const DISMISS_DAYS = 30;

/** Verifică dacă utilizatorul a refuzat recent instalarea. */
function isDismissed() {
  try {
    const until = localStorage.getItem(LS_KEY_DISMISSED);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

/** Marchează că utilizatorul a refuzat instalarea pentru DISMISS_DAYS zile. */
function markDismissed() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(LS_KEY_DISMISSED, String(until));
  } catch {
    // localStorage indisponibil — ignorăm
  }
}

// ── Componentă ───────────────────────────────────────────────────────────────

/**
 * Banner PWA install.
 *
 * Props:
 *   onInstalled — callback apelat după instalare reușită (opțional)
 */
export default function PWAInstallPrompt({ onInstalled }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Nu arăta dacă utilizatorul a refuzat recent
    if (isDismissed()) return;

    // Nu arăta dacă aplicația rulează deja în mod standalone (deja instalată)
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;
    if (window.navigator?.standalone === true) return; // iOS Safari

    const handleBeforeInstall = (e) => {
      e.preventDefault(); // Previne promptul automat al browserului
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        typeof onInstalled === 'function' && onInstalled();
      } else {
        markDismissed();
      }
    } catch (err) {
      console.warn('[PWAInstallPrompt] Eroare la promptul de instalare:', err);
    }

    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt, onInstalled]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalează aplicația Zephren"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        maxWidth: '340px',
        width: 'calc(100vw - 2.5rem)',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.875rem',
        padding: '1rem 1.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        animation: 'zephren-pwa-slide-in 0.3s ease',
      }}
    >
      {/* Injectează animația o singură dată */}
      <style>{`
        @keyframes zephren-pwa-slide-in {
          from { opacity: 0; transform: translateY(1rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <img
          src="/favicon.svg"
          alt="Zephren"
          width={36}
          height={36}
          style={{ borderRadius: '0.5rem', flexShrink: 0 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3 }}>
            Instalează Zephren ca aplicație desktop
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Acces rapid offline, fără browser, direct din bara de activități.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            borderRadius: '0.5rem',
            padding: '0.4rem 0.9rem',
            color: '#94a3b8',
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#cbd5e1'; }}
          onMouseOut={(e)  => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          Nu acum
        </button>

        <button
          onClick={handleInstall}
          style={{
            background: '#f59e0b',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.4rem 1rem',
            color: '#0d1117',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#fbbf24'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = '#f59e0b'; }}
        >
          Instalează
        </button>
      </div>
    </div>
  );
}
