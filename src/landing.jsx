import { useState, useEffect } from "react";
import {
  FEATURES, V3_FEATURES, PLANS, STATS, PRODUCT_BRANDS,
  NORMATIVE, NORMATIVE_COUNT, TOTAL_PRODUCTS, STEPS_COUNT,
  APP_VERSION, CHANGELOG,
} from "./data/landingData.js";

// Traduceri pagină principală
const LT = {
  nav_features:  { EN: "Features" },
  nav_catalog:   { EN: "Product Catalog" },
  nav_pricing:   { EN: "Pricing" },
  nav_login:     { EN: "Login" },
  nav_open:      { EN: "Open App →" },
  hero_badge:    { EN: "Mc 001-2022 · ISO 52000-1/NA:2023 · EPBD 2024/1275 · Law 238/2024" },
  hero_title1:   { EN: "Building energy" },
  hero_title2:   { EN: "performance calculator" },
  hero_sub:      { EN: `Professional software for certified energy auditors. EPC compliant with Mc 001-2022, ${TOTAL_PRODUCTS}+ real products, ${STEPS_COUNT} calculation steps, nZEB/ZEB verification.` },
  hero_cta:      { EN: "Start free calculation →" },
  feat_title:    { EN: "Everything you need for energy certification" },
  feat_sub:      { EN: `From building identification to the audit report — ${STEPS_COUNT} steps, one software` },
  cat_title:     { EN: "Updated 2026 Product Catalog" },
  cat_sub:       { EN: "All major brands on the Romanian and European market, with real technical specifications" },
  v3_title:      { EN: "Advanced features" },
  v3_sub:        { EN: "Professional calculations, visualizations and reports" },
  norm_title:    { EN: `${NORMATIVE_COUNT} integrated standards` },
  price_title:   { EN: "Plans & Pricing" },
  footer_copy:   { EN: "Professional software for MDLPA certified energy auditors. EPC calculator compliant with Mc 001-2022." },
  plan_free_cta:      { EN: "Start free" },
  plan_standard_cta:  { EN: "Activate Standard" },
  plan_pro_cta:       { EN: "Activate Pro" },
  plan_asociatie_cta: { EN: "Contact us" },
  login_title:   { EN: "Login to Zephren" },
  login_google:  { EN: "Continue with Google" },
  login_forgot:  { EN: "Forgot password?" },
  login_no_acc:  { EN: "No account?" },
  login_reg:     { EN: "Register" },
  login_or_free: { EN: "Or continue without account →" },
  login_open:    { EN: "Open app" },
  reg_title:     { EN: "Create Zephren account" },
  reg_google:    { EN: "Register with Google" },
  reg_has_acc:   { EN: "Already have an account?" },
  reg_login:     { EN: "Login" },
  forgot_title:  { EN: "Password reset" },
  forgot_sub:    { EN: "Enter your email address to receive a reset link." },
  forgot_btn:    { EN: "Send reset link" },
  forgot_back:   { EN: "Back to login" },
};

function lt(key, lang) {
  if (lang === "RO") return null; // folosim textul direct în JSX
  return LT[key]?.EN || null;
}

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

function LoginModal({ show, onClose, onLogin, onRegister, onGoogleLogin, onStart, lang = "RO", theme = "dark" }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState("");

  if (!show) return null;

  const isDark = theme === "dark";
  const modalBg   = isDark ? "#12141f" : "#ffffff";
  const modalText = isDark ? "#e2e8f0" : "#1a202c";
  const modalMuted= isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const modalBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputSt = {
    ...inputStyle,
    border: `1px solid ${modalBorder}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    color: modalText,
  };
  const TM = (key, fallback) => (lang === "EN" && LT[key]?.EN) ? LT[key].EN : fallback;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) { onLogin({ email, password }); }
    else { showToast("Autentificare in curand disponibila"); }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { showToast("Parolele nu se potrivesc"); return; }
    if (onRegister) { onRegister({ name, email, password }); }
    else { showToast("Inregistrare in curand disponibila"); }
  };

  const handleGoogle = () => {
    if (onGoogleLogin) { onGoogleLogin(); }
    else { showToast("Autentificare Google in curand disponibila"); }
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
      <div style={{ background: modalBg, color: modalText, borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "100%", margin: "16px", border: `1px solid ${modalBorder}`, position: "relative" }} onClick={e => e.stopPropagation()}>

        {toast && (
          <div style={{ position: "absolute", top: "-48px", left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: "8px", background: "#f59e0b", color: "#000", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            {toast}
          </div>
        )}

        {mode === "login" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>{TM("login_title", "Autentificare Zephren")}</h3>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} />
              <input type="password" placeholder={lang === "EN" ? "Password" : "Parola"} value={password} onChange={e => setPassword(e.target.value)} required style={inputSt} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>{lang === "EN" ? "Login" : "Autentificare"}</button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: `1px solid ${modalBorder}`, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: modalText, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              {TM("login_google", "Continua cu Google")}
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("forgot"); }} style={{ color: modalMuted, textDecoration: "underline", marginRight: "16px" }}>{TM("login_forgot", "Ai uitat parola?")}</a>
              {TM("login_no_acc", "Nu ai cont?")} <a href="#" onClick={e => { e.preventDefault(); setMode("register"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("login_reg", "Inregistrare")}</a>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>{TM("reg_title", "Creaza cont Zephren")}</h3>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder={lang === "EN" ? "Full name" : "Nume complet"} value={name} onChange={e => setName(e.target.value)} required style={inputSt} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} />
              <input type="password" placeholder={lang === "EN" ? "Password" : "Parola"} value={password} onChange={e => setPassword(e.target.value)} required style={inputSt} />
              <input type="password" placeholder={lang === "EN" ? "Confirm password" : "Confirma parola"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputSt} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>{lang === "EN" ? "Create account" : "Creaza cont"}</button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: `1px solid ${modalBorder}`, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: modalText, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              {TM("reg_google", "Inregistrare cu Google")}
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              {TM("reg_has_acc", "Ai deja cont?")} <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("reg_login", "Autentificare")}</a>
            </div>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>{TM("forgot_title", "Resetare parola")}</h3>
            <p style={{ fontSize: "13px", color: modalMuted, textAlign: "center", marginBottom: "20px" }}>{TM("forgot_sub", "Introdu adresa de email pentru a primi un link de resetare.")}</p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>{TM("forgot_btn", "Trimite link de resetare")}</button>
            </form>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("forgot_back", "Inapoi la autentificare")}</a>
            </div>
          </>
        )}

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${modalBorder}`, textAlign: "center", fontSize: "11px", color: modalMuted }}>
          {TM("login_or_free", "Sau continua fara cont →")} <a href="#" onClick={(e) => { e.preventDefault(); onClose(); onStart(); }} style={{ color: "#f59e0b" }}>{TM("login_open", "Deschide aplicatia")}</a>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onStart, onLogin, onRegister, onGoogleLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("ep-lang") || "RO"; } catch { return "RO"; }
  });
  const [theme, setTheme] = useState(() => {
    try {
      const manual = localStorage.getItem("ep-theme-manual");
      if (manual) return manual === "light" ? "light" : "dark";
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch { return "dark"; }
  });

  // Sincronizare theme cu OS și energy-calc
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => {
      if (!localStorage.getItem("ep-theme-manual-forced")) {
        setTheme(e.matches ? "light" : "dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("ep-theme-manual", next);
      localStorage.setItem("ep-theme-manual-forced", "1");
    } catch {}
  };

  const toggleLang = () => {
    const next = lang === "RO" ? "EN" : "RO";
    setLang(next);
    try { localStorage.setItem("ep-lang", next); } catch {}
  };

  // Funcție traducere shorthand
  const T = (key, fallback) => (lang === "EN" && LT[key]?.EN) ? LT[key].EN : fallback;

  // Stiluri dependente de temă
  const isDark = theme === "dark";
  const bg         = isDark ? "#0a0a1a" : "#f5f7fa";
  const text        = isDark ? "#e2e8f0" : "#1a202c";
  const textMuted   = isDark ? "rgba(255,255,255,0.5)"  : "rgba(0,0,0,0.5)";
  const textFaint   = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.4)";
  const border      = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const borderHover = isDark ? "rgba(245,158,11,0.2)"   : "rgba(245,158,11,0.4)";
  const navBg       = isDark ? "rgba(10,10,26,0.9)"     : "rgba(245,247,250,0.9)";
  const cardBg      = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const cardBorder  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  const greenCardBg = isDark ? "rgba(16,185,129,0.03)"  : "rgba(16,185,129,0.04)";
  const amberCardBg = isDark ? "rgba(245,158,11,0.03)"  : "rgba(245,158,11,0.04)";
  const footerBg    = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: bg, color: text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: navBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}`, padding: "0 24px", transition: "background 0.3s" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.svg" alt="Zephren" style={{ height: "40px", width: "auto" }} />
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700" }}>v{APP_VERSION}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="nav-desktop">
            <a href="#features" style={{ fontSize: "14px", color: textMuted, textDecoration: "none" }}>{T("nav_features", "Functionalitati")}</a>
            <a href="#products" style={{ fontSize: "14px", color: textMuted, textDecoration: "none" }}>{T("nav_catalog", "Catalog produse")}</a>
            <a href="#pricing" style={{ fontSize: "14px", color: textMuted, textDecoration: "none" }}>{T("nav_pricing", "Preturi")}</a>
            {/* Toggle limbă */}
            <button onClick={toggleLang} title={lang === "RO" ? "Switch to English" : "Comută în Română"} style={{ fontSize: "12px", fontWeight: "700", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", letterSpacing: "0.5px", transition: "border-color 0.2s" }}>
              {lang === "RO" ? "EN" : "RO"}
            </button>
            {/* Toggle luminozitate */}
            <button onClick={toggleTheme} title={isDark ? "Mod luminos" : "Mod întunecat"} style={{ fontSize: "14px", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", transition: "border-color 0.2s" }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setShowLogin(true)} style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>{T("nav_login", "Autentificare")}</button>
            <button onClick={onStart} style={{ fontSize: "13px", fontWeight: "600", padding: "8px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>{T("nav_open", "Deschide aplicatia →")}</button>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Toggle-uri mobile */}
            <button onClick={toggleLang} className="nav-mobile" title={lang === "RO" ? "Switch to English" : "Comută în Română"} style={{ display: "none", fontSize: "11px", fontWeight: "700", padding: "5px 8px", borderRadius: "6px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>
              {lang === "RO" ? "EN" : "RO"}
            </button>
            <button onClick={toggleTheme} className="nav-mobile" style={{ display: "none", fontSize: "14px", padding: "5px 8px", borderRadius: "6px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <button className="nav-mobile" onClick={() => setMobileMenu(!mobileMenu)} style={{ display: "none", background: "none", border: "none", color: text, fontSize: "24px", cursor: "pointer", padding: "4px" }}>
              {mobileMenu ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>
      {mobileMenu && (
        <div style={{ background: isDark ? "rgba(10,10,26,0.97)" : "rgba(245,247,250,0.97)", borderBottom: `1px solid ${border}`, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }} className="nav-mobile-menu">
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: textMuted, textDecoration: "none", padding: "8px 0" }}>{T("nav_features", "Functionalitati")}</a>
          <a href="#products" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: textMuted, textDecoration: "none", padding: "8px 0" }}>{T("nav_catalog", "Catalog produse")}</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: textMuted, textDecoration: "none", padding: "8px 0" }}>{T("nav_pricing", "Preturi")}</a>
          <button onClick={() => { setMobileMenu(false); setShowLogin(true); }} style={{ fontSize: "13px", padding: "10px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", textAlign: "left" }}>{T("nav_login", "Autentificare")}</button>
          <button onClick={() => { setMobileMenu(false); onStart(); }} style={{ fontSize: "13px", fontWeight: "600", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>{T("nav_open", "Deschide aplicatia →")}</button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "100px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <img src="/logo.svg" alt="Zephren" style={{ width: "min(420px, 85vw)", height: "auto" }} />
        </div>
        <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "24px" }}>
          {T("hero_badge", "Mc 001-2022 · ISO 52000-1/NA:2023 · EPBD 2024/1275 · Legea 238/2024")}
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "900", lineHeight: 1.1, marginBottom: "24px", color: text }}>
          {T("hero_title1", "Calculator performanță")}<br />
          <span style={{ color: "#f59e0b" }}>{T("hero_title2", "energetică clădiri")}</span>
        </h1>
        <p style={{ fontSize: "18px", color: textMuted, maxWidth: "640px", margin: "0 auto 40px", lineHeight: 1.6 }}>
          {T("hero_sub", `Software profesional pentru auditori energetici. Certificat de performanta energetica conform Mc 001-2022, cu ${TOTAL_PRODUCTS}+ produse reale, ${STEPS_COUNT} pași de calcul, verificare nZEB/ZEB.`)}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ fontSize: "16px", fontWeight: "700", padding: "16px 40px", borderRadius: "12px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer", boxShadow: "0 4px 24px rgba(245,158,11,0.3)" }}>
            {T("hero_cta", "Incepe calculul gratuit →")}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "24px", maxWidth: "900px", margin: "60px auto 0" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#f59e0b" }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: textFaint }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "16px", color: text }}>{T("feat_title", "Tot ce ai nevoie pentru certificare energetica")}</h2>
        <p style={{ fontSize: "15px", color: textFaint, textAlign: "center", maxWidth: "600px", margin: "0 auto 48px" }}>
          {T("feat_sub", `De la identificarea cladirii pana la raportul de audit — ${STEPS_COUNT} pasi, un singur software`)}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card" style={{ padding: "32px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}`, transition: "all 0.3s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = borderHover; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: text }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: textMuted, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CATALOG PRODUSE ═══ */}
      <section id="products" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", color: "#10b981", marginBottom: "16px" }}>
            {TOTAL_PRODUCTS}+ PRODUSE REALE
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: text }}>{T("cat_title", "Catalog produse actualizat 2026")}</h2>
          <p style={{ fontSize: "15px", color: textFaint, maxWidth: "600px", margin: "12px auto 0" }}>
            {T("cat_sub", "Toate brandurile majore de pe piata romaneasca si europeana, cu specificatii tehnice reale")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
          {PRODUCT_BRANDS.map(p => (
            <div key={p.cat} style={{ padding: "24px", borderRadius: "12px", background: greenCardBg, border: `1px solid rgba(16,185,129,0.08)`, transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "700", color: text }}>{p.cat}</h4>
                <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "10px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: "700" }}>{p.count} produse</span>
              </div>
              <p style={{ fontSize: "12px", color: textFaint, lineHeight: 1.6 }}>{p.brands}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FUNCTIONALITATI v3 ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "16px" }}>
            v{APP_VERSION}
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: text }}>{T("v3_title", "Functionalitati avansate")}</h2>
          <p style={{ fontSize: "15px", color: textFaint, maxWidth: "600px", margin: "12px auto 0" }}>
            {T("v3_sub", "Calcule, vizualizari si rapoarte profesionale")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          {V3_FEATURES.map(item => (
            <div key={item.title} style={{ padding: "24px", borderRadius: "12px", background: amberCardBg, border: `1px solid rgba(245,158,11,0.08)`, transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{item.icon}</div>
              <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: text }}>{item.title}</h4>
              <p style={{ fontSize: "13px", color: textMuted, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ NORMATIVE ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ padding: "40px", borderRadius: "16px", background: amberCardBg, border: `1px solid rgba(245,158,11,0.1)`, textAlign: "center" }}>
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", color: text }}>{T("norm_title", `${NORMATIVE_COUNT} normative integrate`)}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", fontSize: "11px", color: textFaint }}>
            {NORMATIVE.map(n => (
              <span key={n} style={{ padding: "4px 10px", borderRadius: "6px", background: cardBg, border: `1px solid ${cardBorder}` }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHANGELOG / NOUTĂȚI ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "14px" }}>
            {lang === "EN" ? "RELEASE NOTES" : "ISTORICUL VERSIUNILOR"}
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: text }}>{lang === "EN" ? "What's new" : "Ce este nou"}</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px", margin: "0 auto" }}>
          {CHANGELOG.map((release, ri) => (
            <div key={release.version} style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
              {/* Timeline dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "4px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${release.color}20`, border: `2px solid ${release.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: release.color }}>v{release.version}</span>
                </div>
                {ri < CHANGELOG.length - 1 && <div style={{ width: "2px", flex: 1, minHeight: "16px", background: `linear-gradient(to bottom, ${release.color}40, transparent)`, marginTop: "4px" }} />}
              </div>
              {/* Card */}
              <div style={{ flex: 1, padding: "20px 24px", borderRadius: "14px", background: cardBg, border: `1px solid ${release.color}20`, marginBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: text }}>v{release.version}</span>
                  {release.label && (
                    <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "8px", background: `${release.color}25`, color: release.color, border: `1px solid ${release.color}40` }}>
                      {release.label}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: textFaint }}>{release.date}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {release.items.map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: textMuted, lineHeight: 1.5 }}>
                      <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "48px", color: text }}>{T("price_title", "Planuri si preturi")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", maxWidth: "1140px", margin: "0 auto" }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ padding: "28px", borderRadius: "16px", background: p.highlight ? "rgba(245,158,11,0.05)" : cardBg, border: p.highlight ? "2px solid rgba(245,158,11,0.3)" : `1px solid ${cardBorder}`, position: "relative" }}>
              {p.highlight && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#f59e0b", color: "#000", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "RECOMMENDED" : "RECOMANDAT"}</div>}
              {p.id === "free" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{lang === "EN" ? "FREE" : "GRATUIT"}</div>}
              {p.id === "starter" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#6366f1", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>🔒 PRICE LOCK</div>}
              {p.id === "institutional" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#10b981", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "ENTERPRISE" : "INSTITUȚIONAL"}</div>}
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: text }}>{p.name}</h3>
              <div style={{ margin: "14px 0" }}>
                <span style={{ fontSize: p.price === "0" ? "38px" : "30px", fontWeight: "900", color: text }}>{p.price === "0" ? (lang === "EN" ? "Free" : "Gratuit") : p.price}</span>
                {p.period && <span style={{ fontSize: "13px", color: textFaint }}>{" RON"}{p.period}</span>}
                {p.tierNote && <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px" }}>{p.tierNote}</div>}
                {p.priceAn && <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px" }}>{p.priceAn} RON/an <span style={{ color: "#f59e0b" }}>({p.discount})</span></div>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: "13px", padding: "5px 0", color: textMuted, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#22c55e" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {p.id !== "free" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px", background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px" }}>🔒</span>
                  <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: "600", lineHeight: "1.4" }}>
                    {lang === "EN" ? "Price locked while subscription is active" : "Prețul rămâne blocat cât abonamentul e activ"}
                  </span>
                </div>
              )}
              {p.id === "institutional" ? (
                <a href="mailto:contact@zephren.ro" style={{ display: "block", width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, background: "transparent", color: text, fontSize: "14px", fontWeight: "600", cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  {T("plan_asociatie_cta", p.cta)}
                </a>
              ) : (
                <button onClick={() => onStart()} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: p.highlight ? "none" : `1px solid ${border}`, background: p.highlight ? "#f59e0b" : "transparent", color: p.highlight ? "#000" : text, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                  {p.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Price Lock explicație ── */}
        <div style={{ maxWidth: "1140px", margin: "32px auto 0", padding: "24px 32px", borderRadius: "16px", background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "28px", lineHeight: 1 }}>🔒</div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#6366f1", marginBottom: "8px" }}>
                {lang === "EN" ? "Price locked for life — how it works" : "Prețul tău, blocat pe viață — cum funcționează"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                {[
                  {
                    icon: "✅",
                    title: lang === "EN" ? "Subscribe today" : "Te abonezi azi",
                    desc: lang === "EN" ? "You pay the current price — forever, as long as the subscription is active." : "Plătești prețul de azi — pentru totdeauna, cât abonamentul rămâne activ.",
                  },
                  {
                    icon: "📈",
                    title: lang === "EN" ? "Prices may increase" : "Prețurile pot crește",
                    desc: lang === "EN" ? "We will raise prices as we add features. Your locked price is never affected." : "Pe măsură ce adăugăm funcționalități, prețurile vor crește. Prețul tău blocat nu e afectat.",
                  },
                  {
                    icon: "⚠️",
                    title: lang === "EN" ? "If you cancel" : "Dacă anulezi",
                    desc: lang === "EN" ? "The price lock is lost. When you reactivate, you pay the current price at that time." : "Beneficiul se pierde. La reactivare, vei fi taxat cu prețul curent din acel moment.",
                  },
                ].map(it => (
                  <div key={it.title} style={{ padding: "14px 16px", borderRadius: "10px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid rgba(99,102,241,0.15)` }}>
                    <div style={{ fontSize: "16px", marginBottom: "6px" }}>{it.icon}</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: text, marginBottom: "4px" }}>{it.title}</div>
                    <div style={{ fontSize: "11px", color: textFaint, lineHeight: "1.5" }}>{it.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Ofertă de lansare ── */}
        <div style={{ maxWidth: "1140px", margin: "40px auto 0", padding: "28px 32px", borderRadius: "16px", background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#6366f1" }}>
              {lang === "EN" ? "Launch offer — first 90 days" : "Ofertă lansare — primele 90 de zile"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {[
              { plan: "Starter", monthly: "169", normalMonthly: "229", annual: "1.090", normalAnnual: "1.490", saving: "400" },
              { plan: "Professional", monthly: "359", normalMonthly: "489", annual: "4.190", normalAnnual: "5.790", saving: "1.600" },
              { plan: "Business", monthly: "549", normalMonthly: "759", annual: "5.490", normalAnnual: "7.490", saving: "2.000" },
            ].map(o => (
              <div key={o.plan} style={{ padding: "18px 20px", borderRadius: "10px", border: `1px solid rgba(99,102,241,0.2)`, background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: text, marginBottom: "10px" }}>{o.plan}</div>
                {o.monthly && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "22px", fontWeight: "900", color: "#6366f1" }}>{o.monthly}</span>
                    <span style={{ fontSize: "11px", color: textFaint }}>RON/lună</span>
                    <span style={{ fontSize: "11px", color: textFaint, textDecoration: "line-through" }}>{o.normalMonthly}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: o.monthly ? "16px" : "22px", fontWeight: "700", color: o.monthly ? textMuted : "#6366f1" }}>{o.annual}</span>
                  <span style={{ fontSize: "11px", color: textFaint }}>RON/an</span>
                  <span style={{ fontSize: "11px", color: textFaint, textDecoration: "line-through" }}>{o.normalAnnual}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "6px" }}>
                  {lang === "EN" ? `Save ${o.saving} RON` : `Economie ${o.saving} RON`}
                </div>
              </div>
            ))}
            <div style={{ padding: "18px 20px", borderRadius: "10px", border: `1px solid rgba(99,102,241,0.2)`, background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "12px", color: textFaint, lineHeight: "1.6" }}>
                {lang === "EN"
                  ? "Valid for new accounts created within the first 90 days of launch. Applied automatically at checkout."
                  : "Valabilă pentru conturi noi create în primele 90 de zile de la lansare. Aplicată automat la plată."}
              </div>
            </div>
          </div>
        </div>

        {/* ── Add-on per-raport (utilizatori Free) ── */}
        <div style={{ maxWidth: "1140px", margin: "24px auto 0", padding: "28px 32px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              {lang === "EN" ? "Free plan add-ons" : "Add-on plan Free"}
            </span>
            <span style={{ fontSize: "13px", color: textMuted }}>
              {lang === "EN" ? "Extra CPE reports beyond 1/month" : "Rapoarte CPE suplimentare peste limita de 1/lună"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { label: lang === "EN" ? "Extra CPE report" : "Raport CPE suplimentar", price: "29", unit: "RON/raport", note: lang === "EN" ? "over 1/month" : "peste 1/lună" },
              { label: lang === "EN" ? "Pack 10 reports" : "Pachet 10 rapoarte", price: "249", unit: "RON", note: lang === "EN" ? "≈24,9 RON/report" : "≈24,9 RON/raport" },
              { label: lang === "EN" ? "Building Renovation Passport" : "Pașaport Renovare Clădire", price: "49", unit: "RON/doc", note: "PDF" },
            ].map(a => (
              <div key={a.label} style={{ padding: "16px 20px", borderRadius: "10px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: text }}>{a.label}</div>
                  <div style={{ fontSize: "11px", color: textFaint, marginTop: "2px" }}>{a.note}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: "20px", fontWeight: "900", color: "#f59e0b" }}>{a.price}</span>
                  <span style={{ fontSize: "11px", color: textFaint, marginLeft: "3px" }}>{a.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Credite pay-per-project ── */}
        <div style={{ maxWidth: "1140px", margin: "24px auto 0", padding: "28px 32px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
              {lang === "EN" ? "Pay-per-project credits" : "Credite pay-per-project"}
            </span>
            <span style={{ fontSize: "13px", color: textMuted }}>
              {lang === "EN" ? "No subscription · credits never expire · 1 simple CPE = 1 credit · complex audit = 2–3 credits" : "Fără abonament · creditele nu expiră · 1 CPE simplu = 1 credit · audit complex = 2–3 credite"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {[
              { label: "Micro", credits: "10", price: "99", perCredit: "9,9" },
              { label: "Standard", credits: "50", price: "390", perCredit: "7,8" },
              { label: "Pro", credits: "100", price: "690", perCredit: "6,9" },
              { label: "Enterprise", credits: "200", price: "1.190", perCredit: "6,0" },
            ].map(c => (
              <div key={c.label} style={{ padding: "16px 20px", borderRadius: "10px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: textFaint, textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                <div style={{ fontSize: "11px", color: textMuted, margin: "4px 0 10px" }}>{c.credits} {lang === "EN" ? "credits" : "credite"}</div>
                <div>
                  <span style={{ fontSize: "22px", fontWeight: "900", color: "#22c55e" }}>{c.price}</span>
                  <span style={{ fontSize: "11px", color: textFaint, marginLeft: "3px" }}>RON</span>
                </div>
                <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px" }}>~{c.perCredit} RON/{lang === "EN" ? "credit" : "credit"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Licențe perpetue ── */}
        <div style={{ maxWidth: "1140px", margin: "24px auto 0", padding: "28px 32px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
              {lang === "EN" ? "Perpetual licenses" : "Licențe perpetue"}
            </span>
            <span style={{ fontSize: "13px", color: textMuted }}>
              {lang === "EN" ? "One-time payment · no recurring fees" : "Plată unică · fără taxe recurente"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { label: lang === "EN" ? "Single-user" : "1 utilizator", price: "5.790", ea: "4.190" },
              { label: lang === "EN" ? "2 users" : "2 utilizatori", price: "11.690", ea: "8.490" },
              { label: lang === "EN" ? "Office (5 users)" : "Birou (5 utilizatori)", price: "28.990", ea: "20.990" },
            ].map(l => (
              <div key={l.label} style={{ padding: "16px 20px", borderRadius: "10px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: text }}>{l.label}</div>
                  <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "2px" }}>EA: {l.ea} RON 🔒</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: "20px", fontWeight: "900", color: "#10b981" }}>{l.price}</span>
                  <span style={{ fontSize: "11px", color: textFaint, marginLeft: "3px" }}>RON</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Metode de plată ── */}
        <div style={{ maxWidth: "960px", margin: "32px auto 0", padding: "24px 32px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: textFaint, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                {lang === "EN" ? "Accepted payment methods" : "Metode de plată acceptate"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* Stripe */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(99,91,255,0.08)" : "rgba(99,91,255,0.06)" }}>
                  <svg width="38" height="16" viewBox="0 0 60 25" fill="none"><text x="0" y="18" fontSize="18" fontWeight="700" fill="#635BFF" fontFamily="system-ui">stripe</text></svg>
                </div>
                {/* Visa */}
                <div style={{ display: "flex", alignItems: "center", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <svg width="38" height="16" viewBox="0 0 60 20" fill="none"><text x="0" y="16" fontSize="17" fontWeight="900" fill="#1A1F71" fontFamily="system-ui,sans-serif" letterSpacing="-1">VISA</text></svg>
                </div>
                {/* Mastercard */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <svg width="28" height="18" viewBox="0 0 28 18"><circle cx="10" cy="9" r="9" fill="#EB001B"/><circle cx="18" cy="9" r="9" fill="#F79E1B"/><path d="M14 2.8a9 9 0 010 12.4A9 9 0 0114 2.8z" fill="#FF5F00"/></svg>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: textMuted }}>Mastercard</span>
                </div>
                {/* Google Pay */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: textMuted }}>G Pay</span>
                </div>
                {/* Apple Pay */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", border: `1px solid ${cardBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: textMuted }}>Apple Pay</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#22c55e" opacity=".2"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#22c55e" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "11px", color: textFaint }}>{lang === "EN" ? "Secure payment via Stripe" : "Plată securizată prin Stripe"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} strokeWidth="1.5"/><path d="M2 10h20" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} strokeWidth="1.5"/></svg>
                <span style={{ fontSize: "11px", color: textFaint }}>{lang === "EN" ? "Monthly or annual billing · SmartBill invoice" : "Facturare lunară sau anuală · Factură SmartBill"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: "11px", color: textFaint }}>{lang === "EN" ? "Cancel anytime · No hidden fees" : "Anulare oricând · Fără costuri ascunse"}</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
          <img src="/logo.svg" alt="Zephren" style={{ height: "32px", width: "auto" }} />
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700" }}>v{APP_VERSION}</span>
        </div>
        <p style={{ fontSize: "12px", color: textFaint, maxWidth: "500px", margin: "0 auto" }}>
          {T("footer_copy", "Software profesional pentru auditori energetici atestati MDLPA. Calculator performanta energetica conform Mc 001-2022.")}
        </p>
        <p style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.25)", marginTop: "16px" }}>© {new Date().getFullYear()} Zephren. Toate drepturile rezervate.</p>
      </footer>

      {/* ═══ LOGIN MODAL ═══ */}
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={onLogin}
        onRegister={onRegister}
        onGoogleLogin={onGoogleLogin}
        onStart={onStart}
        lang={lang}
        theme={theme}
      />
    </div>
  );
}
