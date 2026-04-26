import { useState, useEffect } from "react";
import { CHANGELOG, APP_VERSION } from "../data/changelog.generated.js";

const STORAGE_KEY = "ep-seen-version";

export default function WhatsNewModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== APP_VERSION) setVisible(true);
    } catch { /* localStorage indisponibil */ }
  }, []);

  if (!visible) return null;

  const release = CHANGELOG[0]; // versiunea curentă = primul entry
  const features = release.items.filter(it => it.icon === "✨");
  const fixes    = release.items.filter(it => it.icon !== "✨");

  const theme =
    typeof window !== "undefined"
      ? localStorage.getItem("ep-theme-manual") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : "dark";
  const isDark   = theme !== "light";
  const modalBg  = isDark ? "#12141f" : "#ffffff";
  const text      = isDark ? "#e2e8f0" : "#1a202c";
  const textMuted = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const textFaint = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const divider   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch {}
    setVisible(false);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Noutăți Zephren"
        style={{
          background: modalBg, color: text,
          borderRadius: "20px", padding: "0",
          maxWidth: "520px", width: "100%",
          border: "1px solid rgba(245,158,11,0.25)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header colorat */}
        <div style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)",
          borderBottom: `1px solid rgba(245,158,11,0.2)`,
          padding: "28px 32px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "22px" }}>🚀</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Zephren s-a actualizat
                </span>
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: text, margin: 0, lineHeight: 1.2 }}>
                Ce este nou în v{APP_VERSION}
              </h2>
              <p style={{ fontSize: "13px", color: textMuted, margin: "6px 0 0" }}>
                {release.week} · {release.dateRange}
              </p>
            </div>
            <span style={{
              padding: "4px 12px", borderRadius: "20px",
              background: `${release.color}25`, color: release.color,
              border: `1px solid ${release.color}50`,
              fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {release.label || `v${release.version}`}
            </span>
          </div>
        </div>

        {/* Conținut scrollabil */}
        <div style={{ overflowY: "auto", padding: "24px 32px", flex: 1 }}>

          {/* Funcționalități noi */}
          {features.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                ✨ Funcționalități noi
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {features.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: text, lineHeight: 1.6, padding: "8px 12px", borderRadius: "8px", background: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <span style={{ flexShrink: 0, marginTop: "1px" }}>✨</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Corecții și îmbunătățiri */}
          {fixes.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: textFaint, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                🔧 Corecții și îmbunătățiri
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {fixes.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", fontSize: "12px", color: textMuted, lineHeight: 1.6, paddingLeft: "4px" }}>
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer acțiuni */}
        <div style={{ padding: "20px 32px 28px", borderTop: `1px solid ${divider}`, display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={dismiss}
            style={{
              padding: "14px 24px", borderRadius: "12px", border: "none",
              background: "#f59e0b", color: "#000",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
            }}
          >
            Am înțeles — intră în aplicație →
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            <a
              href="#changelog"
              onClick={e => { e.preventDefault(); dismiss(); window.location.hash = "#changelog"; }}
              style={{ fontSize: "12px", color: textFaint, textDecoration: "underline", cursor: "pointer" }}
            >
              Vezi tot istoricul versiunilor
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
