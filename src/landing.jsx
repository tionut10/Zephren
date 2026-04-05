import { useState } from "react";

const FEATURES = [
  { icon: "📊", title: "Calcul Mc 001-2022", desc: "Bilanț energetic lunar ISO 13790, 60+ localități, 5 zone climatice, dashboard sumar cu grafic Sankey" },
  { icon: "📜", title: "Certificat DOCX oficial", desc: "12 template-uri MDLPA completate automat, export XML registru electronic, PDF cu QR code" },
  { icon: "🏗️", title: "Anvelopă detaliată", desc: "87 materiale, 30 punți termice SVG, calcul Glaser, ISO 6946/10077/13370, catalog produse reale" },
  { icon: "☀️", title: "Surse regenerabile", desc: "PV, solar termic, pompe căldură, biomasă, eolian, cogenerare — RER automat, Solar-ready & EV-ready" },
  { icon: "🔍", title: "Audit & reabilitare", desc: "Scenarii cost-optimă, deviz estimativ, raport nZEB, smart rehab suggestions, raport audit automat" },
  { icon: "⚡", title: "nZEB & ZEB ready", desc: "Praguri Legea 238/2024, EPBD 2024/1275, scala A-G, GWP ciclu viață, BACS-ready" },
  { icon: "🗺️", title: "Hartă climatică interactivă", desc: "Selectare localitate pe hartă, zone climatice vizuale, date meteo interpolate automat" },
  { icon: "📤", title: "Export complet", desc: "Export XML MDLPA, PDF cu QR code, JSON/CSV, raport audit automat cu semnătură digitală" },
];

const PLANS = [
  {
    id: "free", name: "Free", price: "0", period: "",
    features: [
      "2 proiecte",
      "Calculator complet 7 pași",
      "87 materiale în baza de date",
      "30 punți termice",
      "Export JSON/CSV",
      "Preview certificat",
    ],
    cta: "Începe gratuit", highlight: false,
  },
  {
    id: "pro", name: "Pro", price: "99", period: "/lună",
    features: [
      "Proiecte nelimitate",
      "Dashboard sumar cu grafic Sankey",
      "GWP ciclu viață complet",
      "Smart rehab suggestions",
      "Export DOCX oficial MDLPA",
      "Export XML registru electronic",
      "PDF cu QR code",
      "Raport audit automat",
      "15 certificate/lună",
      "Suport email prioritar",
    ],
    cta: "Activează Pro", highlight: true,
  },
  {
    id: "business", name: "Business", price: "249", period: "/lună",
    features: [
      "Tot din Pro +",
      "Certificate nelimitate",
      "API REST acces",
      "Multi-utilizator (echipă)",
      "Portofoliu clienți",
      "Branding personalizat CPE",
      "AI Assistant integrat",
      "Notificări expirare CPE",
    ],
    cta: "Contactează-ne", highlight: false,
  },
];

const STATS = [
  { value: "12", label: "Template-uri MDLPA" },
  { value: "87", label: "Materiale în baza de date" },
  { value: "60", label: "Localități climatice" },
  { value: "30", label: "Tipuri punți termice" },
  { value: "5", label: "Template-uri noi v3.0" },
];

const V3_NEWS = [
  { icon: "📈", title: "Dashboard sumar", desc: "Vizualizare sintetică a performanței energetice cu indicatori cheie și grafice interactive." },
  { icon: "🔀", title: "Grafic Sankey", desc: "Flux energetic vizual: surse, conversii și pierderi, toate într-un singur grafic interactiv." },
  { icon: "🌍", title: "GWP ciclu viață", desc: "Calculul emisiilor de gaze cu efect de seră pe întregul ciclu de viață al clădirii conform EN 15978." },
  { icon: "🏠", title: "BACS / EV / Solar-ready", desc: "Evaluare automatizare clădire (BACS), pregătire stație EV și panouri solare conform EPBD." },
  { icon: "🗺️", title: "Hartă climatică interactivă", desc: "Selectare localitate direct pe hartă, vizualizare zone climatice, date meteo automate." },
  { icon: "🧱", title: "Catalog produse reale", desc: "Bază de date cu materiale de construcție reale de pe piața românească, cu proprietăți termice." },
  { icon: "💡", title: "Smart rehab suggestions", desc: "Recomandări inteligente de reabilitare bazate pe analiza cost-beneficiu și economia de energie." },
  { icon: "📤", title: "Export XML MDLPA", desc: "Export direct în formatul XML cerut de registrul electronic MDLPA." },
  { icon: "📱", title: "PDF cu QR code", desc: "Certificat PDF cu QR code unic pentru verificare autenticitate online." },
  { icon: "📋", title: "Raport audit automat", desc: "Generare automată raport audit energetic complet cu toate datele și recomandările." },
];

const inputStyle = {
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function LoginModal({ show, onClose, onLogin, onRegister, onGoogleLogin, onStart }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState("");

  if (!show) return null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin({ email, password });
    } else {
      showToast("Autentificare în curând disponibilă");
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Parolele nu se potrivesc");
      return;
    }
    if (onRegister) {
      onRegister({ name, email, password });
    } else {
      showToast("Înregistrare în curând disponibilă");
    }
  };

  const handleGoogle = () => {
    if (onGoogleLogin) {
      onGoogleLogin();
    } else {
      showToast("Autentificare Google în curând disponibilă");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) { showToast("Introdu adresa de email."); return; }
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
        import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder"
      );
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#reset",
      });
      if (error) throw error;
      showToast("Link de resetare trimis la " + email);
    } catch(err) {
      showToast("Eroare: " + (err.message || "Nu s-a putut trimite linkul"));
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div style={{ background: "#12141f", borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "100%", margin: "16px", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "absolute", top: "-48px", left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: "8px", background: "#f59e0b", color: "#000", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            {toast}
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>Autentificare Zephren</h3>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Autentificare</button>
            </form>

            {/* Google OAuth */}
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              Continuă cu Google
            </button>

            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("forgot"); }} style={{ color: "rgba(255,255,255,0.5)", textDecoration: "underline", marginRight: "16px" }}>Ai uitat parola?</a>
              Nu ai cont? <a href="#" onClick={e => { e.preventDefault(); setMode("register"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Înregistrare</a>
            </div>
          </>
        )}

        {/* REGISTER */}
        {mode === "register" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>Crează cont Zephren</h3>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder="Nume complet" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Confirmă parola" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Creează cont</button>
            </form>

            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              Înregistrare cu Google
            </button>

            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              Ai deja cont? <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Autentificare</a>
            </div>
          </>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>Resetare parolă</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "20px" }}>Introdu adresa de email pentru a primi un link de resetare.</p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Trimite link de resetare</button>
            </form>
            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Înapoi la autentificare</a>
            </div>
          </>
        )}

        {/* Continue without account */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          Sau continuă fără cont → <a href="#" onClick={(e) => { e.preventDefault(); onClose(); onStart(); }} style={{ color: "#f59e0b" }}>Deschide aplicația</a>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onStart, onLogin, onRegister, onGoogleLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#0a0a1a", color: "#e2e8f0", minHeight: "100vh" }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,26,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>⚡</span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#f59e0b" }}>Zephren</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700", marginLeft: "4px" }}>v3.0</span>
          </div>
          {/* Desktop nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="nav-desktop">
            <a href="#features" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Funcționalități</a>
            <a href="#v3news" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Noutăți v3.0</a>
            <a href="#pricing" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Prețuri</a>
            <button onClick={() => setShowLogin(true)} style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer" }}>Autentificare</button>
            <button onClick={onStart} style={{ fontSize: "13px", fontWeight: "600", padding: "8px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>Deschide aplicația →</button>
          </div>
          {/* Mobile hamburger */}
          <button className="nav-mobile" onClick={() => setMobileMenu(!mobileMenu)} style={{ display: "none", background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "4px" }}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      {/* Mobile menu dropdown */}
      {mobileMenu && (
        <div style={{ background: "rgba(10,10,26,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }} className="nav-mobile-menu">
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Funcționalități</a>
          <a href="#v3news" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Noutăți v3.0</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Prețuri</a>
          <button onClick={() => { setMobileMenu(false); setShowLogin(true); }} style={{ fontSize: "13px", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", textAlign: "left" }}>Autentificare</button>
          <button onClick={() => { setMobileMenu(false); onStart(); }} style={{ fontSize: "13px", fontWeight: "600", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>Deschide aplicația →</button>
        </div>
      )}

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "24px", maxWidth: "900px", margin: "60px auto 0" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card" style={{ padding: "32px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.3s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ NOUTĂȚI v3.0 ═══ */}
      <section id="v3news" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "16px" }}>
            NOU
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800" }}>Noutăți v3.0</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", maxWidth: "600px", margin: "12px auto 0" }}>
            Cele mai recente funcționalități adăugate în versiunea 3.0
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          {V3_NEWS.map(item => (
            <div key={item.title} style={{ padding: "24px", borderRadius: "12px", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.08)", transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{item.icon}</div>
              <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px" }}>{item.title}</h4>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</p>
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
              {p.id === "free" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: "700" }}>GRATUIT</div>}
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
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700" }}>v3.0</span>
        </div>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", maxWidth: "500px", margin: "0 auto" }}>
          Software profesional pentru auditori energetici atestați MDLPA.
          Calculator performanță energetică conform Mc 001-2022.
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", marginTop: "16px" }}>© {new Date().getFullYear()} Zephren. Toate drepturile rezervate.</p>
      </footer>

      {/* ═══ LOGIN MODAL ═══ */}
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={onLogin}
        onRegister={onRegister}
        onGoogleLogin={onGoogleLogin}
        onStart={onStart}
      />
    </div>
  );
}
