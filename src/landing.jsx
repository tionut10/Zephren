import { useState } from "react";

const FEATURES = [
  { icon: "📊", title: "Calcul Mc 001-2022", desc: "Bilanț energetic lunar ISO 13790, 60+ localități, 5 zone climatice" },
  { icon: "📜", title: "Certificat DOCX oficial", desc: "12 template-uri MDLPA completate automat, export XML registru electronic" },
  { icon: "🏗️", title: "Anvelopă detaliată", desc: "80+ materiale, 30 punți termice SVG, calcul Glaser, ISO 6946/10077/13370" },
  { icon: "☀️", title: "Surse regenerabile", desc: "PV, solar termic, pompe căldură, biomasă, eolian, cogenerare — RER automat" },
  { icon: "🔍", title: "Audit & reabilitare", desc: "Scenarii cost-optimă, deviz estimativ, raport nZEB, comparație ante/post" },
  { icon: "⚡", title: "nZEB & ZEB ready", desc: "Praguri Legea 238/2024, EPBD 2024/1275, scala A-G, GWP ciclu viață" },
];

const PLANS = [
  { id: "free", name: "Free", price: "0", period: "", features: ["2 proiecte", "Calcul complet 7 pași", "Preview certificat", "Export JSON/CSV"], cta: "Începe gratuit", highlight: false },
  { id: "pro", name: "Pro", price: "99", period: "/lună", features: ["Proiecte nelimitate", "Export DOCX oficial MDLPA", "Export XML registru", "Raport nZEB PDF", "15 certificate/lună", "Suport email prioritar"], cta: "Activează Pro", highlight: true },
  { id: "business", name: "Business", price: "249", period: "/lună", features: ["Tot din Pro +", "Certificate nelimitate", "Multi-utilizator (echipă)", "Branding personalizat CPE", "API acces", "Portofoliu clienți", "Notificări expirare CPE"], cta: "Contactează-ne", highlight: false },
];

const STATS = [
  { value: "12", label: "Template-uri MDLPA" },
  { value: "80+", label: "Materiale în baza de date" },
  { value: "60", label: "Localități climatice" },
  { value: "30", label: "Tipuri punți termice" },
];

export default function LandingPage({ onStart }) {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#0a0a1a", color: "#e2e8f0", minHeight: "100vh" }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,26,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>⚡</span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#f59e0b" }}>Zephren</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="#features" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Funcționalități</a>
            <a href="#pricing" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Prețuri</a>
            <button onClick={() => setShowLogin(true)} style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer" }}>Autentificare</button>
            <button onClick={onStart} style={{ fontSize: "13px", fontWeight: "600", padding: "8px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>Deschide aplicația →</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "100px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "24px" }}>
          Mc 001-2022 · ISO 52000-1/NA:2023 · EPBD 2024/1275
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "900", lineHeight: 1.1, marginBottom: "24px" }}>
          Calculator performanță<br />
          <span style={{ color: "#f59e0b" }}>energetică clădiri</span>
        </h1>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", maxWidth: "600px", margin: "0 auto 40px", lineHeight: 1.6 }}>
          Software profesional pentru auditori energetici. Certificat de performanță energetică conform normativelor românești în vigoare.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ fontSize: "16px", fontWeight: "700", padding: "16px 40px", borderRadius: "12px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer", boxShadow: "0 4px 24px rgba(245,158,11,0.3)" }}>
            Începe calculul gratuit →
          </button>
          <a href="https://github.com/tionut10/Zephren" target="_blank" rel="noopener" style={{ fontSize: "16px", padding: "16px 32px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            GitHub ↗
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", maxWidth: "800px", margin: "60px auto 0" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#f59e0b" }}>{s.value}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "48px" }}>Tot ce ai nevoie pentru certificare energetică</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: "32px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.2s" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ NORMATIVE ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ padding: "40px", borderRadius: "16px", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.1)", textAlign: "center" }}>
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Normative integrate</h3>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            {["Mc 001-2022", "SR EN ISO 52000-1/NA:2023", "SR EN ISO 13790", "SR EN ISO 6946", "SR EN ISO 10077-1", "SR EN ISO 13370", "SR EN ISO 13788", "SR EN ISO 14683", "EN 15193-1", "EN 15459-1", "I5-2022", "C107/2005", "Legea 372/2005 + L.238/2024", "EPBD 2024/1275", "EN 15978 (GWP)"].map(n => (
              <span key={n} style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "48px" }}>Planuri și prețuri</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", maxWidth: "960px", margin: "0 auto" }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ padding: "32px", borderRadius: "16px", background: p.highlight ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)", border: p.highlight ? "2px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
              {p.highlight && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#f59e0b", color: "#000", fontSize: "11px", fontWeight: "700" }}>RECOMANDAT</div>}
              <h3 style={{ fontSize: "20px", fontWeight: "700" }}>{p.name}</h3>
              <div style={{ margin: "16px 0" }}>
                <span style={{ fontSize: "40px", fontWeight: "900" }}>{p.price}</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}> €{p.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "24px 0" }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: "14px", padding: "6px 0", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#22c55e" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={onStart} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: p.highlight ? "none" : "1px solid rgba(255,255,255,0.15)", background: p.highlight ? "#f59e0b" : "transparent", color: p.highlight ? "#000" : "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "18px" }}>⚡</span>
          <span style={{ fontWeight: "700", color: "#f59e0b" }}>Zephren</span>
        </div>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", maxWidth: "500px", margin: "0 auto" }}>
          Software profesional pentru auditori energetici atestați MDLPA.
          Calculator performanță energetică conform Mc 001-2022.
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", marginTop: "16px" }}>© {new Date().getFullYear()} Zephren. Toate drepturile rezervate.</p>
      </footer>

      {/* ═══ LOGIN MODAL ═══ */}
      {showLogin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }} onClick={() => setShowLogin(false)}>
          <div style={{ background: "#12141f", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "100%", margin: "16px", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>Autentificare Zephren</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", outline: "none" }} />
              <input type="password" placeholder="Parolă" style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", outline: "none" }} />
              <button style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "8px" }}>Autentificare</button>
              <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>
                Nu ai cont? <a href="#" style={{ color: "#f59e0b" }}>Înregistrare</a>
              </div>
            </div>
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              Sau continuă fără cont → <a href="#" onClick={(e) => { e.preventDefault(); setShowLogin(false); onStart(); }} style={{ color: "#f59e0b" }}>Deschide aplicația</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
