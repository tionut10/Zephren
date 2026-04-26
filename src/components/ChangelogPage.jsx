import { CHANGELOG, APP_VERSION } from "../data/changelog.generated.js";

const ICON_LEGEND = [
  { icon: "✨", label: "Funcționalitate nouă" },
  { icon: "🔧", label: "Fix tehnic" },
  { icon: "📄", label: "Corecție / document" },
  { icon: "💰", label: "Prețuri / financiar" },
  { icon: "📦", label: "Refactoring" },
  { icon: "🎨", label: "UI / design" },
  { icon: "📥", label: "Audit fix" },
  { icon: "📋", label: "Cleanup" },
];

export default function ChangelogPage() {
  const theme =
    typeof window !== "undefined"
      ? localStorage.getItem("ep-theme-manual") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : "dark";
  const isDark = theme !== "light";

  const bg        = isDark ? "#0a0a1a" : "#f5f7fa";
  const text       = isDark ? "#e2e8f0" : "#1a202c";
  const textMuted  = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const textFaint  = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const cardBg     = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const navBg      = isDark ? "rgba(10,10,26,0.95)" : "rgba(245,247,250,0.95)";
  const border     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: bg, color: text, minHeight: "100vh" }}>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: navBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a href="/" onClick={e => { e.preventDefault(); window.location.hash = ""; }} style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <img src="/logo.svg" alt="Zephren" style={{ height: "28px", width: "auto" }} />
            </a>
            <span style={{ fontSize: "12px", color: textFaint }}>/</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: text }}>Istoricul versiunilor</span>
          </div>
          <a
            href="/"
            onClick={e => { e.preventDefault(); window.location.hash = ""; }}
            style={{ fontSize: "13px", color: textMuted, textDecoration: "none", padding: "6px 14px", borderRadius: "8px", border: `1px solid ${border}` }}
          >
            ← Pagina principală
          </a>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "16px", fontWeight: "600" }}>
          RELEASE NOTES · v{APP_VERSION} CURENT
        </div>
        <h1 style={{ fontSize: "36px", fontWeight: "900", color: text, marginBottom: "12px" }}>Istoricul versiunilor</h1>
        <p style={{ fontSize: "15px", color: textMuted, maxWidth: "520px", margin: "0 auto" }}>
          Toate modificările, corecțiile și funcționalitățile noi adăugate în fiecare versiune Zephren.
        </p>
      </div>

      {/* Legendă iconuri */}
      <div style={{ maxWidth: "900px", margin: "0 auto 40px", padding: "0 24px" }}>
        <div style={{ padding: "16px 20px", borderRadius: "12px", background: cardBg, border: `1px solid ${cardBorder}`, display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: textFaint, textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center" }}>Legendă:</span>
          {ICON_LEGEND.map(l => (
            <span key={l.icon} style={{ fontSize: "12px", color: textMuted, display: "flex", alignItems: "center", gap: "5px" }}>
              <span>{l.icon}</span>{l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline versiuni */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px 80px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {CHANGELOG.map((release, ri) => (
          <div key={release.version} id={`v${release.version}`} style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            {/* Dot + linie */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "6px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `${release.color}20`, border: `2px solid ${release.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", flexShrink: 0 }}>
                <span style={{ fontSize: "9px", fontWeight: "800", color: release.color, lineHeight: 1 }}>{release.week}</span>
                <span style={{ fontSize: "8px", fontWeight: "600", color: `${release.color}aa`, lineHeight: 1 }}>v{release.version}</span>
              </div>
              {ri < CHANGELOG.length - 1 && (
                <div style={{ width: "2px", flex: 1, minHeight: "24px", background: `linear-gradient(to bottom, ${release.color}50, transparent)`, marginTop: "6px" }} />
              )}
            </div>

            {/* Card complet */}
            <div style={{ flex: 1, padding: "22px 28px", borderRadius: "14px", background: cardBg, border: `1px solid ${release.color}25`, marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "17px", fontWeight: "800", color: text }}>{release.week}</span>
                <span style={{ fontSize: "13px", color: textFaint }}>— {release.dateRange}</span>
                {release.label && (
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 10px", borderRadius: "10px", background: `${release.color}25`, color: release.color, border: `1px solid ${release.color}50` }}>
                    {release.label}
                  </span>
                )}
                <a href={`#v${release.version}`} style={{ marginLeft: "auto", fontSize: "11px", color: textFaint, textDecoration: "none" }}>#{release.version}</a>
              </div>

              {/* Toate item-urile grupate pe categorie */}
              {["✨","💰","🔧","📦","🎨","📄","📥","📋"].map(icon => {
                const items = release.items.filter(it => it.icon === icon);
                if (!items.length) return null;
                const legendItem = ICON_LEGEND.find(l => l.icon === icon);
                return (
                  <div key={icon} style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: textFaint, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{icon}</span>{legendItem?.label || icon}
                      <span style={{ padding: "1px 6px", borderRadius: "6px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", fontSize: "10px", fontWeight: "600" }}>{items.length}</span>
                    </div>
                    <ul style={{ listStyle: "none", padding: "0 0 0 4px", margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                      {items.map((item, i) => (
                        <li key={i} style={{ fontSize: "13px", color: textMuted, lineHeight: 1.6, paddingLeft: "12px", borderLeft: `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${border}`, padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: textFaint, margin: 0 }}>
          Zephren v{APP_VERSION} · Software pentru auditori energetici atestați MDLPA · conform Mc 001-2022
        </p>
      </div>
    </div>
  );
}
