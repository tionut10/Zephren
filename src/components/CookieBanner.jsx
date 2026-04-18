/**
 * CookieBanner.jsx — Banner consimțământ cookies GDPR-compliant
 *
 * Sprint 20 (18 apr 2026). Respectă Legea 506/2004 (prelucrare date în comunicații
 * electronice) + GDPR Art. 7 (opt-in explicit).
 *
 * Strategie:
 *   - Afișat doar dacă nu există consimțământ salvat (localStorage cheie `cookie-consent`).
 *   - Categorii:
 *       - essentials    — mereu active (session, preferințe UI) — NO OPT-IN nevoie (art.5(3))
 *       - analytics     — opt-in (Plausible, Sentry)
 *       - marketing     — opt-in (campanii viitoare)
 *   - Consimțământul salvat local; înregistrat și în Supabase profile la autentificare.
 *
 * Utilizare:
 *   import CookieBanner, { getCookieConsent } from "./CookieBanner.jsx";
 *   <CookieBanner />
 *   if (getCookieConsent("analytics")) Sentry.init(...);
 */
import React, { useState, useEffect } from "react";

const STORAGE_KEY = "zephren.cookie-consent";
const CONSENT_VERSION = "1.0";

/**
 * Returnează starea curentă a consimțământului per categorie.
 * @param {'essentials'|'analytics'|'marketing'} category
 * @returns {boolean}
 */
export function getCookieConsent(category) {
  if (category === "essentials") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return false;
    return Boolean(parsed[category]);
  } catch { return false; }
}

function saveConsent(analytics, marketing) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      essentials: true,
      analytics,
      marketing,
      savedAt: new Date().toISOString(),
    }));
  } catch { /* private mode */ }
}

export default function CookieBanner({ theme = "dark" }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setVisible(true); return; }
      const parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) { setVisible(true); return; }
    } catch { setVisible(true); }
  }, []);

  if (!visible) return null;

  const dark = theme === "dark";
  const bg = dark ? "rgba(18,20,31,0.98)" : "rgba(255,255,255,0.98)";
  const text = dark ? "#e2e8f0" : "#1a202c";
  const muted = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const border = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  const acceptAll = () => { saveConsent(true, true); setVisible(false); };
  const rejectAll = () => { saveConsent(false, false); setVisible(false); };
  const saveCustom = () => { saveConsent(analytics, marketing); setVisible(false); };

  return (
    <div
      role="dialog"
      aria-label="Consimțământ cookies"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: bg,
        color: text,
        borderTop: `1px solid ${border}`,
        padding: "20px 24px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>
              🍪 Folosim cookies
            </h3>
            <p style={{ fontSize: "13px", color: muted, lineHeight: 1.5 }}>
              Folosim cookies esențiale pentru funcționarea aplicației (sesiune, preferințe).
              Opțional, putem folosi cookies de analiză (Plausible, Sentry) și marketing doar
              cu acordul dumneavoastră (GDPR Art. 7). Detalii în{" "}
              <a href="/privacy" style={{ color: "#f59e0b" }}>Politica de confidențialitate</a>.
            </p>
            {expanded && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <input type="checkbox" checked readOnly style={{ accentColor: "#f59e0b" }} />
                  <span><strong>Esențiale</strong> — mereu active (autentificare, preferințe UI, securitate).</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} style={{ accentColor: "#f59e0b" }} />
                  <span><strong>Analiză</strong> — Plausible (agregat, fără ID personal), Sentry (monitorizare erori).</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} style={{ accentColor: "#f59e0b" }} />
                  <span><strong>Marketing</strong> — campanii remarketing (dezactivate momentan).</span>
                </label>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, fontSize: "13px", cursor: "pointer" }}
            >
              {expanded ? "Ascunde detalii" : "Personalizează"}
            </button>
            <button
              onClick={rejectAll}
              style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, fontSize: "13px", cursor: "pointer" }}
            >
              Refuz
            </button>
            {expanded && (
              <button
                onClick={saveCustom}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "none", background: "rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                Salvează alegerea
              </button>
            )}
            <button
              onClick={acceptAll}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
            >
              Accept toate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
