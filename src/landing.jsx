import { useState, useEffect } from "react";
import {
  V3_FEATURES, PLANS, PAY_PER_USE, PLAN_LAYOUT, STATS,
  NORMATIVE, NORMATIVE_COUNT, STEPS_COUNT,
  APP_VERSION, CHANGELOG,
  STEPS_DATA, FEATURES, EXPORTS_DATA, IMPORTS_DATA,
  CALC_MODULES_COUNT, API_ENDPOINTS_COUNT,
} from "./data/landingData.js";
import PlanComparisonTable from "./components/PlanComparisonTable.jsx";

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
  hero_sub:      { EN: `Professional software for certified energy auditors. EPC compliant with Mc 001-2022 · ${STEPS_COUNT} calculation steps · nZEB/ZEB verification · EPBD 2024 compliant.` },
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
  // Sprint 20 (18 apr 2026) — cablare Supabase auth ca fallback cand props lipsesc.
  // IMPORTANT: toate hook-urile TREBUIE declarate înainte de orice early return
  // (Rules of Hooks: ordine identică la fiecare render, indiferent de `show`).
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

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

  async function getSupabaseClient() {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
      import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder"
    );
  }

  // Validare complexitate parolă (minim 8 caractere, cel puțin o literă + o cifră)
  function validatePasswordStrength(pwd) {
    if (!pwd || pwd.length < 8) return "Parola trebuie să aibă cel puțin 8 caractere.";
    if (!/[A-Za-z]/.test(pwd)) return "Parola trebuie să conțină cel puțin o literă.";
    if (!/[0-9]/.test(pwd))    return "Parola trebuie să conțină cel puțin o cifră.";
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (onLogin) { onLogin({ email, password }); return; }
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast("Autentificare reușită. Se deschide aplicația…");
      setTimeout(() => { if (onStart) onStart(); else window.location.hash = "#app"; }, 600);
    } catch (err) {
      const msg = err?.message || "Eroare autentificare";
      showToast(msg.includes("Invalid login") ? "Email sau parolă incorecte." : msg);
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirmPassword) { showToast("Parolele nu se potrivesc"); return; }
    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) { showToast(pwdErr); return; }
    if (!consentAccepted) { showToast("Acceptați Politica de confidențialitate și Termenii pentru a continua."); return; }
    if (onRegister) { onRegister({ name, email, password }); return; }
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            consent_privacy_at: nowIso,
            consent_terms_at: nowIso,
            privacy_version: "1.0",
            terms_version: "1.0",
          },
          emailRedirectTo: window.location.origin + "/#app",
        },
      });
      if (error) throw error;
      showToast("Cont creat. Verifică emailul pentru confirmare.");
    } catch (err) {
      showToast("Eroare: " + (err?.message || "Înregistrare eșuată"));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (loading) return;
    if (onGoogleLogin) { onGoogleLogin(); return; }
    if (mode === "register" && !consentAccepted) {
      showToast("Acceptați Politica de confidențialitate și Termenii pentru a continua.");
      return;
    }
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/#app" },
      });
      if (error) throw error;
      // redirect automat — toast pentru feedback
      showToast("Redirecționare la Google…");
    } catch (err) {
      showToast("Eroare: " + (err?.message || "Autentificare Google eșuată"));
    } finally { setLoading(false); }
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
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} autoComplete="email" />
              <input type="password" placeholder={lang === "EN" ? "Password" : "Parolă"} value={password} onChange={e => setPassword(e.target.value)} required style={inputSt} autoComplete="current-password" />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: loading ? "rgba(245,158,11,0.4)" : "#f59e0b",
                  color: "#000",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
              >
                {loading ? "Se autentifică…" : (lang === "EN" ? "Login" : "Autentificare")}
              </button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: `1px solid ${modalBorder}`, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: modalText, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              {TM("login_google", "Continuă cu Google")}
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("forgot"); }} style={{ color: modalMuted, textDecoration: "underline", marginRight: "16px" }}>{TM("login_forgot", "Ai uitat parola?")}</a>
              {TM("login_no_acc", "Nu ai cont?")} <a href="#" onClick={e => { e.preventDefault(); setMode("register"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("login_reg", "Înregistrare")}</a>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>{TM("reg_title", "Creează cont Zephren")}</h3>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder={lang === "EN" ? "Full name" : "Nume complet"} value={name} onChange={e => setName(e.target.value)} required style={inputSt} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} />
              <input type="password" placeholder={lang === "EN" ? "Password (min 8, literă + cifră)" : "Parolă (min 8, literă + cifră)"} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputSt} />
              <input type="password" placeholder={lang === "EN" ? "Confirm password" : "Confirmă parola"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} style={inputSt} />
              {/* Sprint 20 — GDPR consent (Art. 6-7 Regulamentul UE 2016/679) */}
              <label style={{ display: "flex", gap: "8px", fontSize: "12px", color: modalMuted, alignItems: "flex-start", marginTop: "4px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={e => setConsentAccepted(e.target.checked)}
                  required
                  style={{ marginTop: "2px", accentColor: "#f59e0b" }}
                />
                <span>
                  {lang === "EN"
                    ? <>Accept the <a href="/privacy" target="_blank" rel="noopener" style={{ color: "#f59e0b" }}>Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener" style={{ color: "#f59e0b" }}>Terms</a> (GDPR Art. 6-7).</>
                    : <>Accept <a href="/privacy" target="_blank" rel="noopener" style={{ color: "#f59e0b" }}>Politica de confidențialitate</a> și <a href="/terms" target="_blank" rel="noopener" style={{ color: "#f59e0b" }}>Termenii de utilizare</a> (GDPR Art. 6-7).</>}
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !consentAccepted}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: (loading || !consentAccepted) ? "rgba(245,158,11,0.4)" : "#f59e0b",
                  color: "#000",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: (loading || !consentAccepted) ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
              >
                {loading ? "Se creează contul…" : (lang === "EN" ? "Create account" : "Creează cont")}
              </button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: `1px solid ${modalBorder}`, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: modalText, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              {TM("reg_google", "Înregistrare cu Google")}
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              {TM("reg_has_acc", "Ai deja cont?")} <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("reg_login", "Autentificare")}</a>
            </div>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>{TM("forgot_title", "Resetare parolă")}</h3>
            <p style={{ fontSize: "13px", color: modalMuted, textAlign: "center", marginBottom: "20px" }}>{TM("forgot_sub", "Introdu adresa de email pentru a primi un link de resetare.")}</p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputSt} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>{TM("forgot_btn", "Trimite link de resetare")}</button>
            </form>
            <div style={{ textAlign: "center", fontSize: "12px", color: modalMuted, marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>{TM("forgot_back", "Înapoi la autentificare")}</a>
            </div>
          </>
        )}

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${modalBorder}`, textAlign: "center", fontSize: "11px", color: modalMuted }}>
          {TM("login_or_free", "Sau continuă fără cont →")} <a href="#" onClick={(e) => { e.preventDefault(); onClose(); onStart(); }} style={{ color: "#f59e0b" }}>{TM("login_open", "Deschide aplicația")}</a>
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
  const bg         = isDark ? "#0a0a1a" : "linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 40%, #F0FDF4 100%)";
  const text        = isDark ? "#e2e8f0" : "#0F172A";
  const textMuted   = isDark ? "rgba(255,255,255,0.5)"  : "#475569";
  const textFaint   = isDark ? "rgba(255,255,255,0.4)"  : "#64748B";
  const border      = isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0";
  const borderHover = isDark ? "rgba(245,158,11,0.2)"   : "rgba(245,158,11,0.5)";
  const navBg       = isDark ? "rgba(10,10,26,0.9)"     : "rgba(248,250,252,0.88)";
  const cardBg      = isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF";
  const cardBorder  = isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0";
  const cardShadow  = isDark ? "none"                   : "0 2px 12px rgba(15,23,42,0.06)";
  const greenCardBg = isDark ? "rgba(16,185,129,0.03)"  : "rgba(5,150,105,0.06)";
  const amberCardBg = isDark ? "rgba(245,158,11,0.03)"  : "rgba(217,119,6,0.06)";
  const footerBg    = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: bg, color: text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }} data-theme={theme}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: navBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}`, padding: "0 24px", transition: "background 0.3s" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={isDark ? "/logo-canva-dark.png" : "/logo-canva.png"} alt="Zephren" style={{ height: "40px", width: "auto", mixBlendMode: isDark ? "normal" : "multiply" }} />
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700", letterSpacing: "0.3px" }}>v{APP_VERSION}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="nav-desktop">
            <a href="#features" style={{ fontSize: "14px", color: textMuted, textDecoration: "none" }}>{T("nav_features", "Funcționalități")}</a>
            <a href="#pricing" style={{ fontSize: "14px", color: textMuted, textDecoration: "none" }}>{T("nav_pricing", "Prețuri")}</a>
            <a href="#changelog" style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#f59e0b", textDecoration: "none", fontWeight: "600", padding: "4px 10px", borderRadius: "6px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", transition: "background 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.16)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}>
              <span style={{ fontSize: "11px" }}>📋</span>
              {lang === "EN" ? `v${APP_VERSION}` : `v${APP_VERSION}`}
              <span style={{ fontSize: "10px", opacity: 0.7 }}>{lang === "EN" ? "changelog" : "noutăți"}</span>
            </a>
            {/* Toggle limbă */}
            <button onClick={toggleLang} title={lang === "RO" ? "Switch to English" : "Comută în Română"} style={{ fontSize: "12px", fontWeight: "700", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", letterSpacing: "0.5px", transition: "border-color 0.2s" }}>
              {lang === "RO" ? "EN" : "RO"}
            </button>
            {/* Toggle luminozitate */}
            <button onClick={toggleTheme} aria-label={isDark ? "Comută la mod luminos" : "Comută la mod întunecat"} title={isDark ? "Mod luminos" : "Mod întunecat"} style={{ fontSize: "14px", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", transition: "border-color 0.2s" }}>
              <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
            </button>
            <button onClick={() => setShowLogin(true)} style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>{T("nav_login", "Autentificare")}</button>
            <button onClick={onStart} style={{ fontSize: "13px", fontWeight: "600", padding: "8px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>{T("nav_open", "Deschide aplicația →")}</button>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Toggle-uri mobile */}
            <button onClick={toggleLang} className="nav-mobile" title={lang === "RO" ? "Switch to English" : "Comută în Română"} style={{ display: "none", fontSize: "11px", fontWeight: "700", padding: "5px 8px", borderRadius: "6px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>
              {lang === "RO" ? "EN" : "RO"}
            </button>
            <button onClick={toggleTheme} aria-label={isDark ? "Comută la mod luminos" : "Comută la mod întunecat"} className="nav-mobile" style={{ display: "none", fontSize: "14px", padding: "5px 8px", borderRadius: "6px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer" }}>
              <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
            </button>
            <button className="nav-mobile" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? "Închide meniu mobil" : "Deschide meniu mobil"} aria-expanded={mobileMenu} style={{ display: "none", background: "none", border: "none", color: text, fontSize: "24px", cursor: "pointer", padding: "4px" }}>
              <span aria-hidden="true">{mobileMenu ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
      </nav>
      {mobileMenu && (
        <div style={{ background: isDark ? "rgba(10,10,26,0.97)" : "rgba(245,247,250,0.97)", borderBottom: `1px solid ${border}`, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }} className="nav-mobile-menu">
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: textMuted, textDecoration: "none", padding: "8px 0" }}>{T("nav_features", "Funcționalități")}</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: textMuted, textDecoration: "none", padding: "8px 0" }}>{T("nav_pricing", "Prețuri")}</a>
          <button onClick={() => { setMobileMenu(false); setShowLogin(true); }} style={{ fontSize: "13px", padding: "10px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: text, cursor: "pointer", textAlign: "left" }}>{T("nav_login", "Autentificare")}</button>
          <button onClick={() => { setMobileMenu(false); onStart(); }} style={{ fontSize: "13px", fontWeight: "600", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>{T("nav_open", "Deschide aplicația →")}</button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px 40px", textAlign: "center" }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <img src={isDark ? "/logo-canva-dark.png" : "/logo-canva.png"} alt="Zephren" style={{ width: "min(400px, 80vw)", height: "auto", mixBlendMode: isDark ? "normal" : "multiply" }} />

          {/* Separator vizual */}
          <div style={{ width: "48px", height: "1px", background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)", margin: "6px 0" }} />

          {/* Credențiale autor */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <span style={{ fontSize: "14px", color: text, fontWeight: "600", letterSpacing: "0.2px" }}>
              {lang === "EN" ? "Developed by Eng. Ionuț Tunaru" : "Dezvoltat de ing. Ionuț Tunaru"}
            </span>
            <span style={{ fontSize: "12px", color: textMuted, fontWeight: "400" }}>
              {lang === "EN"
                ? "M.Sc. Energy Efficiency in the Built Environment (MEMC)"
                : "M.Sc. Modernizare Energetică în Mediul Construit (MEMC)"}
            </span>
            <span style={{ fontSize: "12px", color: textFaint, fontWeight: "400" }}>
              {lang === "EN" ? "Research track · High-performance buildings" : "Traseu cercetare științifică · Clădiri cu performanță energetică ridicată"}
            </span>
            <span style={{ fontSize: "12px", color: textFaint, fontWeight: "400" }}>
              {lang === "EN" ? "Universitatea Transilvania Brașov, 2019" : "Universitatea Transilvania din Brașov, 2019"}
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "900", lineHeight: 1.1, marginBottom: "18px", color: text }}>
          {T("hero_title1", "Calculator performanță")}<br />
          <span style={{ color: "#f59e0b" }}>{T("hero_title2", "energetică clădiri")}</span>
        </h1>
        <p style={{ fontSize: "18px", color: textMuted, maxWidth: "620px", margin: "0 auto 32px", lineHeight: 1.7 }}>
          {lang === "EN"
            ? "Professional software for MDLPA certified energy auditors, compliant with Mc 001-2022."
            : "Software profesional pentru auditori energetici atestați MDLPA, conform Mc 001-2022."}
        </p>

        {/* CTA dublu */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart}
            style={{ fontSize: "16px", fontWeight: "700", padding: "16px 40px", borderRadius: "12px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer", boxShadow: "0 4px 24px rgba(245,158,11,0.3)", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(245,158,11,0.3)"; }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1.03)"; }}>
            {lang === "EN" ? "Start free calculation →" : "Începe calculul gratuit →"}
          </button>
          <a href="#pricing"
            style={{ fontSize: "15px", fontWeight: "600", padding: "16px 32px", borderRadius: "12px", border: `1.5px solid ${border}`, background: "transparent", color: text, cursor: "pointer", textDecoration: "none", transition: "border-color 0.2s, background 0.2s", display: "inline-flex", alignItems: "center" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = "transparent"; }}>
            {lang === "EN" ? "See plans →" : "Vezi planurile →"}
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "24px", maxWidth: "900px", margin: "22px auto 0", padding: "24px 24px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)", border: `1px solid ${cardBorder}` }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "30px", fontWeight: "900", color: "#f59e0b", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: "12px", color: textMuted, marginTop: "4px", lineHeight: 1.4 }}>{lang === "EN" ? s.labelEN || s.label : s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="section-divider" style={{ maxWidth: "800px", margin: "0 auto" }} />

      {/* ═══ CALCULATOR ÎN 8 PAȘI ═══ */}
      <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "12px", color: "#6366f1", marginBottom: "16px" }}>
            {lang === "EN" ? "HOW IT WORKS" : "CUM FUNCȚIONEAZĂ"}
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: text }}>
            {lang === "EN" ? "8-step certified calculator" : "Calculator certificare în 8 pași"}
          </h2>
          <p style={{ fontSize: "15px", color: textFaint, maxWidth: "600px", margin: "12px auto 0" }}>
            {lang === "EN"
              ? `From building identification to the official CPE document — ${STEPS_COUNT} steps, ${CALC_MODULES_COUNT} calculation modules, one platform`
              : `De la identificarea clădirii până la documentul CPE oficial — ${STEPS_COUNT} pași, ${CALC_MODULES_COUNT} module de calcul, o singură platformă`}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {(STEPS_DATA || []).map((step, i) => (
            <div key={step.id} style={{ padding: "24px", borderRadius: "14px", background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, position: "relative", transition: "all 0.25s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = isDark ? "none" : "0 8px 24px rgba(15,23,42,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = cardShadow; }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#6366f1" }}>{step.id}</span>
                </div>
                <span style={{ fontSize: "20px" }}>{step.icon}</span>
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: text, margin: 0 }}>{step.title}</h4>
              </div>
              <p style={{ fontSize: "12px", color: textMuted, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              {step.modules && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "12px" }}>
                  {step.modules.slice(0, 3).map(m => (
                    <span key={m} style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.15)", fontFamily: "monospace" }}>{m}</span>
                  ))}
                  {step.modules.length > 3 && <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", color: textFaint }}>+{step.modules.length - 3}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <hr className="section-divider" style={{ maxWidth: "800px", margin: "0 auto" }} />

      {/* ═══ FUNCȚIONALITĂȚI PRINCIPALE ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "12px", color: "#6366f1", marginBottom: "14px" }}>
            {lang === "EN" ? "FEATURES" : "FUNCȚIONALITĂȚI"}
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: text }}>
            {lang === "EN" ? "Everything you need for energy certification" : "Tot ce ai nevoie pentru certificare energetică"}
          </h2>
          <p style={{ fontSize: "14px", color: textFaint, maxWidth: "560px", margin: "10px auto 0" }}>
            {lang === "EN" ? `${CALC_MODULES_COUNT} specialized modules · ${API_ENDPOINTS_COUNT} server-side APIs · auto-updating from code` : `${CALC_MODULES_COUNT} module specializate · ${API_ENDPOINTS_COUNT} API server-side · se actualizează automat din cod`}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {(FEATURES || []).map(f => (
            <div key={f.id || f.title} style={{ padding: "28px", borderRadius: "14px", background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, transition: "all 0.25s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = borderHover; e.currentTarget.style.boxShadow = isDark ? "0 8px 24px rgba(245,158,11,0.05)" : "0 8px 24px rgba(15,23,42,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.boxShadow = cardShadow; }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <span style={{ fontSize: "28px", flexShrink: 0, marginTop: "2px" }}>{f.icon}</span>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: text }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: textMuted, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      <hr className="section-divider" style={{ maxWidth: "800px", margin: "0 auto" }} />

      {/* ═══ EXPORT & IMPORT ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "14px" }}>
            {lang === "EN" ? "EXPORT & IMPORT" : "EXPORT & IMPORT"}
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: text }}>
            {lang === "EN" ? "All supported formats" : "Toate formatele suportate"}
          </h2>
          <p style={{ fontSize: "14px", color: textFaint, maxWidth: "560px", margin: "10px auto 0" }}>
            {lang === "EN" ? "Export official documents and import data from any source — all in one platform." : "Exportă documente oficiale și importă date din orice sursă — totul dintr-o singură platformă."}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "24px" }}>
          {/* Export */}
          <div style={{ padding: "28px 32px", borderRadius: "14px", background: amberCardBg, border: "1px solid rgba(245,158,11,0.1)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "18px" }}>
              📤 {lang === "EN" ? "Export" : "Export"} — {(EXPORTS_DATA || []).length} {lang === "EN" ? "formats" : "formate"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(EXPORTS_DATA || []).map(e => (
                <div key={e.fmt + e.desc} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px", width: "20px", flexShrink: 0 }}>{e.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", width: "36px", flexShrink: 0 }}>{e.fmt}</span>
                  <span style={{ fontSize: "12px", color: textMuted }}>{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Import */}
          <div style={{ padding: "28px 32px", borderRadius: "14px", background: isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "18px" }}>
              📥 {lang === "EN" ? "Import" : "Import"} — {(IMPORTS_DATA || []).length} {lang === "EN" ? "sources" : "surse"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(IMPORTS_DATA || []).map(im => (
                <div key={im.src} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px", width: "20px", flexShrink: 0 }}>{im.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", width: "90px", flexShrink: 0 }}>{im.src}</span>
                  <span style={{ fontSize: "12px", color: textMuted }}>{im.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NORMATIVE ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "14px" }}>
            {lang === "EN" ? "STANDARDS & REGULATIONS" : "STANDARDE ȘI REGLEMENTĂRI"}
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: text }}>{T("norm_title", `${NORMATIVE_COUNT} normative și standarde integrate`)}</h2>
          <p style={{ color: textMuted, maxWidth: "680px", margin: "12px auto 0", fontSize: "14px", lineHeight: 1.6 }}>
            {lang === "EN"
              ? "All calculations are based on the current Romanian and European normative framework for building energy performance."
              : "Toate calculele sunt fundamentate pe cadrul normativ românesc și european în vigoare pentru performanța energetică a clădirilor."
            }
          </p>
        </div>

        {/* Grupuri normative */}
        {[
          {
            title: lang === "EN" ? "Primary methodology" : "Metodologie principală",
            icon: "📐",
            color: "#f59e0b",
            items: NORMATIVE.filter(n => n.startsWith("Mc ") || n.includes("52000") || n.includes("52003") || n.includes("52010") || n.includes("52016") || n.includes("52018")),
          },
          {
            title: lang === "EN" ? "Building envelope & thermal" : "Anvelopă și termic",
            icon: "🏗️",
            color: "#3b82f6",
            items: NORMATIVE.filter(n => n.includes("12831") || n.includes("13790") || n.includes("6946") || n.includes("10077") || n.includes("13370") || n.includes("13788") || n.includes("14683")),
          },
          {
            title: lang === "EN" ? "Heating systems (EN 15316 series)" : "Sisteme de încălzire (seria EN 15316)",
            icon: "🔥",
            color: "#ef4444",
            items: NORMATIVE.filter(n => n.includes("15316")),
          },
          {
            title: lang === "EN" ? "Indoor climate & lighting" : "Climat interior și iluminat",
            icon: "💡",
            color: "#8b5cf6",
            items: NORMATIVE.filter(n => n.includes("16798") || n.includes("15193") || n.includes("12464")),
          },
          {
            title: lang === "EN" ? "Financial, GWP & lifecycle" : "Financiar, GWP și ciclu de viață",
            icon: "📊",
            color: "#10b981",
            items: NORMATIVE.filter(n => n.includes("15459") || n.includes("15978") || n.includes("I5-2022") || n.includes("C107")),
          },
          {
            title: lang === "EN" ? "European directives & regulations" : "Directive și reglementări europene",
            icon: "🇪🇺",
            color: "#0ea5e9",
            items: NORMATIVE.filter(n => n.includes("EPBD") || n.includes("Reg. delegat") || n.includes("OUG") || n.includes("RED III") || n.includes("ZEB")),
          },
          {
            title: lang === "EN" ? "Romanian legislation & normatives" : "Legislație și normative românești",
            icon: "🇷🇴",
            color: "#f97316",
            items: NORMATIVE.filter(n => n.includes("Legea") || n.includes("NP 048") || n.includes("P 130")),
          },
        ].filter(g => g.items.length > 0).map(group => (
          <div key={group.title} style={{ marginBottom: "20px", padding: "24px 28px", borderRadius: "14px", background: cardBg, border: `1px solid ${cardBorder}`, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "18px" }}>{group.icon}</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: group.color }}>{group.title}</span>
              <span style={{ fontSize: "11px", color: textFaint, marginLeft: "auto", padding: "2px 8px", borderRadius: "10px", background: `${group.color}15`, border: `1px solid ${group.color}25` }}>{group.items.length}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {group.items.map(n => (
                <span key={n} style={{ padding: "4px 10px", borderRadius: "6px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${cardBorder}`, fontSize: "11px", color: textMuted, lineHeight: 1.4 }}>{n}</span>
              ))}
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ textAlign: "center", marginTop: "24px", padding: "16px", borderRadius: "12px", background: amberCardBg, border: "1px solid rgba(245,158,11,0.15)" }}>
          <span style={{ fontSize: "13px", color: textMuted }}>
            {lang === "EN"
              ? `Total: ${NORMATIVE_COUNT} standards and regulations actively used in calculations`
              : `Total: ${NORMATIVE_COUNT} standarde și reglementări utilizate activ în calculele energetice`
            }
          </span>
        </div>
      </section>

      {/* ═══ PRICING v6.0 — 4 carduri (Free + Audit + Pro + Expert) + 2 (Birou + Enterprise) + Edu banner + Pay-per-use ═══ */}
      <section id="pricing" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "14px" }}>
            {lang === "EN" ? "PLANS & PRICING" : "PLANURI & PREȚURI"}
          </div>
        </div>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "16px", color: text }}>{T("price_title", "Planuri și prețuri")}</h2>
        <p style={{ textAlign: "center", fontSize: "14px", color: textFaint, marginBottom: "32px", maxWidth: "640px", margin: "0 auto 32px" }}>
          {lang === "EN"
            ? "Choose the plan that matches your MDLPA grade and building type. All paid plans include unlimited EPC — the difference is in what you can issue and which modules you have access to."
            : "Alege pachetul care se potrivește gradului tău MDLPA și tipului de clădiri pe care le certifici. Toate planurile plătite includ CPE nelimitat — diferența constă în ce poți emite și ce module ai la dispoziție."}
        </p>


        {/* ── Trust banner: Transparență prețuri — anunț 90 zile pentru orice modificare ── */}
        <div style={{ maxWidth: "1140px", margin: "0 auto 40px", padding: "16px 24px", borderRadius: "14px", background: isDark ? "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.03))" : "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.30)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>📅</div>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#16a34a", marginBottom: "6px" }}>
                {lang === "EN" ? "Pricing transparency — 90-day notice guaranteed" : "Transparență prețuri — anunț cu 90 zile garantat"}
              </div>
              <div style={{ fontSize: "12px", color: textFaint, marginBottom: "12px", lineHeight: 1.5 }}>
                {lang === "EN"
                  ? "Any price change is announced at least 90 days in advance, by email and on this page. No surprises at billing. Cancel anytime — no commitment."
                  : "Orice modificare de preț este anunțată cu minimum 90 de zile în avans, prin email și pe această pagină. Fără surprize la facturare. Anulare oricând — fără angajament."}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {[
                  {
                    icon: "📧",
                    title: lang === "EN" ? "Email notification" : "Notificare email",
                    desc: lang === "EN" ? "We email every active subscriber 90 days before any price change takes effect." : "Trimitem email fiecărui abonat activ cu 90 de zile înainte de orice modificare de preț.",
                  },
                  {
                    icon: "🌐",
                    title: lang === "EN" ? "Public roadmap" : "Roadmap public",
                    desc: lang === "EN" ? "Planned price changes are published on this page and on /pricing/roadmap." : "Modificările planificate sunt publicate pe această pagină și pe /pricing/roadmap.",
                  },
                  {
                    icon: "🔓",
                    title: lang === "EN" ? "Cancel anytime" : "Anulare oricând",
                    desc: lang === "EN" ? "No commitment. Cancel from your account or from the Stripe portal in one click." : "Fără angajament. Anulează din contul tău sau din portalul Stripe într-un singur click.",
                  },
                ].map(it => (
                  <div key={it.title} style={{ padding: "12px 14px", borderRadius: "10px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", border: `1px solid rgba(34,197,94,0.15)` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "15px" }}>{it.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: text }}>{it.title}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: textFaint, lineHeight: "1.5" }}>{it.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Rând 1: Plans pentru auditori solo (Free + Audit + Pro + Expert) ── */}
        {(() => {
          const PrimaryPlans = PLANS.filter(p => PLAN_LAYOUT.primary.includes(p.id));
          // Helper TVA 21% RO 2026 — afișare preț + TVA pe fiecare card.
          const VAT_RATE = 0.21;
          const parseRonPrice = (str) => {
            if (!str) return 0;
            const m = String(str).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
            return parseFloat(m) || 0;
          };
          const fmtRon = (n) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const withVat = (priceStr) => {
            const n = parseRonPrice(priceStr);
            if (!n) return null;
            return fmtRon(n * (1 + VAT_RATE));
          };
          const renderCard = (p) => (
            <div key={p.id} style={{ padding: "28px", borderRadius: "16px", background: p.highlight ? "rgba(245,158,11,0.05)" : cardBg, border: p.highlight ? "2px solid rgba(245,158,11,0.3)" : `1px solid ${cardBorder}`, boxShadow: p.highlight ? (isDark ? "0 4px 32px rgba(245,158,11,0.10)" : "0 4px 24px rgba(245,158,11,0.12)") : cardShadow, position: "relative" }}>
              {p.highlight && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#f59e0b", color: "#000", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>⭐ {lang === "EN" ? "EPC + AUDIT + nZEB" : "CPE + AUDIT + nZEB"}</div>}
              {p.id === "free" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{lang === "EN" ? "FREE" : "GRATUIT"}</div>}
              {p.id === "audit" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#3b82f6", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "RESIDENTIAL EPC" : "CPE REZIDENȚIAL"}</div>}
              {p.id === "expert" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#8b5cf6", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "ADVANCED ANALYSIS" : "ANALIZĂ AVANSATĂ"}</div>}
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: text }}>{p.name}</h3>
              {p.audience && <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px", marginBottom: "8px" }}>{p.audience}</div>}
              <div style={{ margin: "14px 0" }}>
                <span style={{ fontSize: p.price === "0" ? "38px" : "30px", fontWeight: "900", color: text }}>{p.price === "0" ? (lang === "EN" ? "Free" : "Gratuit") : p.price}</span>
                {p.period && <span style={{ fontSize: "13px", color: textFaint }}>{" RON"}{p.period}</span>}
                {p.vatIncluded && <span style={{ fontSize: "11px", color: textFaint, marginLeft: "5px" }}>{lang === "EN" ? "VAT incl." : "TVA inclus"}</span>}
                {p.price !== "0" && !p.vatIncluded && withVat(p.price) && (
                  <div style={{ fontSize: "11px", color: textFaint, marginTop: "3px", opacity: 0.85 }}>
                    {lang === "EN" ? "with 21% VAT: " : "cu TVA 21%: "}
                    <strong style={{ color: textMuted }}>{withVat(p.price)} RON{p.period}</strong>
                  </div>
                )}
                {p.tierNote && <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px" }}>{p.tierNote}</div>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: "13px", padding: "5px 0", color: textMuted, display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ color: "#22c55e", marginTop: "2px" }}>✓</span> <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.id !== "free" && p.id !== "edu" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px", background: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.20)", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px" }}>📅</span>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600", lineHeight: "1.4" }}>
                    {lang === "EN" ? "90-day notice for any price change · cancel anytime" : "Anunț cu 90 zile pentru orice modificare · anulare oricând"}
                  </span>
                </div>
              )}
              <button onClick={() => onStart()} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: p.highlight ? "none" : `1px solid ${border}`, background: p.highlight ? "#f59e0b" : "transparent", color: p.highlight ? "#000" : text, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {p.cta}
              </button>
            </div>
          );

          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", maxWidth: "1140px", margin: "0 auto" }}>
                {PrimaryPlans.map(renderCard)}
              </div>

              {/* ── Rând 2: Plans pentru echipe (Birou + Enterprise) ── */}
              <h3 style={{ fontSize: "20px", fontWeight: "700", textAlign: "center", marginTop: "64px", marginBottom: "24px", color: text }}>
                {lang === "EN" ? "For audit teams and organizations" : "Pentru birouri de audit și organizații"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
                {PLANS.filter(p => PLAN_LAYOUT.team.includes(p.id)).map(p => (
                  <div key={p.id} style={{ padding: "28px", borderRadius: "16px", background: cardBg, border: `1px solid ${cardBorder}`, position: "relative" }}>
                    {p.id === "birou" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#ec4899", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "OFFICES 2-5 PEOPLE" : "BIROURI 2-5 PERSOANE"}</div>}
                    {p.id === "enterprise" && <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "2px 12px", borderRadius: "10px", background: "#dc2626", color: "#fff", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>{lang === "EN" ? "6-100+ USERS · SLA" : "6-100+ USERI · SLA"}</div>}
                    <h3 style={{ fontSize: "20px", fontWeight: "700", color: text }}>{p.name}</h3>
                    {p.audience && <div style={{ fontSize: "12px", color: textFaint, marginTop: "4px", marginBottom: "8px" }}>{p.audience}</div>}
                    <div style={{ margin: "14px 0" }}>
                      <span style={{ fontSize: "32px", fontWeight: "900", color: text }}>{p.price}</span>
                      {p.period && <span style={{ fontSize: "13px", color: textFaint }}>{" RON"}{p.period}</span>}
                      {p.vatIncluded && <span style={{ fontSize: "11px", color: textFaint, marginLeft: "5px" }}>{lang === "EN" ? "VAT incl." : "TVA inclus"}</span>}
                      {!p.vatIncluded && withVat(p.price) && (
                        <div style={{ fontSize: "11px", color: textFaint, marginTop: "3px", opacity: 0.85 }}>
                          {lang === "EN" ? "with 21% VAT: " : "cu TVA 21%: "}
                          <strong style={{ color: textMuted }}>{withVat(p.price)} RON{p.period}</strong>
                        </div>
                      )}
                      {p.tierNote && <div style={{ fontSize: "11px", color: textFaint, marginTop: "4px" }}>{p.tierNote}</div>}
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
                      {p.features.map(f => (
                        <li key={f} style={{ fontSize: "13px", padding: "5px 0", color: textMuted, display: "flex", alignItems: "flex-start", gap: "8px" }}>
                          <span style={{ color: "#22c55e", marginTop: "2px" }}>✓</span> <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {p.id === "enterprise" ? (
                      <a href="mailto:contact@zephren.ro" style={{ display: "block", width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, background: "transparent", color: text, fontSize: "14px", fontWeight: "600", cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                        {p.cta}
                      </a>
                    ) : (
                      <button onClick={() => onStart()} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${border}`, background: "transparent", color: text, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                        {p.cta}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Comparator interactiv plan-uri (v7.0) ─────────────────
                  Tabelă comprehensivă cu toate funcționalitățile diferențiate
                  pe categorii. Permite clienților să vadă rapid diferența
                  reală dintre cele 6 planuri principale (Free + 5 plătite).
                  Sursa: PLAN_FEATURES din planGating.js.
                  ───────────────────────────────────────────────────────── */}
              <PlanComparisonTable
                isDark={isDark}
                text={text}
                textMuted={textMuted}
                textFaint={textFaint}
                cardBg={cardBg}
                cardBorder={cardBorder}
                border={border}
                lang={lang}
              />

              {/* ── Banner EDU (gratis pentru studenți + doctoranzi) ── */}
              {(() => {
                const eduPlan = PLANS.find(p => p.id === "edu");
                if (!eduPlan) return null;
                return (
                  <div style={{ maxWidth: "1140px", margin: "32px auto 0", padding: "24px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))", border: "2px solid rgba(16,185,129,0.3)", position: "relative" }}>
                    <div style={{ position: "absolute", top: "-12px", left: "32px", padding: "4px 14px", borderRadius: "12px", background: "#10b981", color: "#fff", fontSize: "12px", fontWeight: "700" }}>
                      🎓 {lang === "EN" ? "EDUCATION — FREE" : "EDUCAȚIE — GRATIS"}
                    </div>

                    {/* Sub-secțiunea 1: Studenți + Doctoranzi (auto-grant) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ fontSize: "22px", fontWeight: "700", color: text, marginTop: 0, marginBottom: "8px" }}>
                          {eduPlan.name} — {lang === "EN" ? "Free during training & attestation" : "Gratis pe perioada formării și atestării"}
                        </h3>
                        <p style={{ fontSize: "14px", color: textMuted, lineHeight: 1.6, marginBottom: "16px" }}>
                          {lang === "EN"
                            ? "All Expert features (Step 1-8 + AI Pack + BIM Pack) free for students, doctoral candidates, graduates awaiting MDLPA attestation, and trainees in audit offices. Practice on real CPE and energy audit projects — documents carry the SCOP DIDACTIC watermark. Calculations fully cover the MDLPA attestation exam syllabus (Ord. 348/2026): Mc 001-2022. Perfect for your bachelor thesis, dissertation, or attestation portfolio — all calculations are exportable as DOCX with full tables and annexes. 60 Romanian climate zones + 165 thermal bridges — not simulated data, but the production database."
                            : "Toate funcțiile Expert (Step 1-8 + AI Pack + BIM Pack) gratis pentru studenți, doctoranzi, absolvenți în curs de atestare MDLPA și stagiari în birouri de audit. Practică pe proiecte reale de CPE și audit energetic — fișierele poartă ștampila SCOP DIDACTIC. Calculele acoperă integral materia examenului de atestare MDLPA (Ord. 348/2026): Mc 001-2022. Ideal pentru proiectul de licență, disertație sau proiectul de atestare — calculele sunt exportabile ca DOCX cu toate tabelele și anexele. 60 localități climatice RO + 165 punți termice — nu date simulate, ci baza de date a aplicației de producție."}
                        </p>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                          {eduPlan.features.slice(0, 9).map(f => (
                            <li key={f} style={{ fontSize: "12px", padding: "3px 0", color: textMuted, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                              <span style={{ color: "#10b981", marginTop: "2px" }}>✓</span> <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "8px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.20)", fontSize: "12px", color: textFaint, lineHeight: 1.6 }}>
                          <strong style={{ color: textMuted }}>{lang === "EN" ? "Accepted proof:" : "Dovadă acceptată:"}</strong>{" "}
                          {lang === "EN"
                            ? "Student/doctoral candidate — valid student ID or enrollment certificate. Graduate awaiting attestation — MDLPA attestation application receipt or registered file confirmation. Trainee — letter from the audit office. Renewed every 6 months."
                            : "Student/doctorand — legitimație student valabilă sau adeverință de înscriere. Absolvent în curs de atestare — confirmare depunere dosar MDLPA sau cerere de atestare înregistrată. Stagiar — adeverință de la biroul de audit. Reînnoire la fiecare 6 luni."}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "180px" }}>
                        <a href="mailto:edu@zephren.ro?subject=Aplicatie%20Zephren%20Edu%20%E2%80%94%20Student%2FDoctorand&body=Salut%2C%0A%0ADoresc%20sa%20activez%20planul%20Zephren%20Edu%20ca%20student%20sau%20doctorand.%0A%0ANume%20complet%3A%20%0AInstitutie%3A%20%0AProgram%20de%20studii%20(licenta%2Fmaster%2Fdoctorat)%3A%20%0AAn%20de%20studii%3A%20%0AEmail%20institutional%3A%20%0A%0AAtasat%3A%20legitimatie%20student%20sau%20adeverinta%20valabila.%0A%0AMultumesc!" style={{ padding: "12px 20px", borderRadius: "10px", background: "#10b981", color: "#fff", fontSize: "13px", fontWeight: "600", textDecoration: "none", textAlign: "center", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
                          {lang === "EN" ? "Apply as student →" : "Aplică ca student →"}
                        </a>
                        <a href="mailto:edu@zephren.ro?subject=Aplicatie%20Zephren%20Edu%20%E2%80%94%20Absolvent%20in%20atestare&body=Salut%2C%0A%0ADoresc%20sa%20activez%20planul%20Zephren%20Edu%20ca%20absolvent%20in%20curs%20de%20atestare%20MDLPA.%0A%0ANume%20complet%3A%20%0AEmail%3A%20%0AStadiu%20atestare%20(dosar%20depus%20%2F%20examen%20programat%20%2F%20stagiar%20in%20birou)%3A%20%0A%0AAtasat%3A%20confirmare%20depunere%20dosar%20MDLPA%20sau%20adeverinta%20birou%20audit.%0A%0AMultumesc!" style={{ padding: "12px 20px", borderRadius: "10px", background: "transparent", color: "#10b981", border: "2px solid #10b981", fontSize: "13px", fontWeight: "600", textDecoration: "none", textAlign: "center" }}>
                          {lang === "EN" ? "Apply as grad →" : "Aplică ca absolvent →"}
                        </a>
                      </div>
                    </div>

                    {/* Separator vizual */}
                    <div style={{ borderTop: "1px dashed rgba(16,185,129,0.3)", margin: "28px 0 20px" }} />

                    {/* Sub-secțiunea 2: Universități + Instituții (cerere de colaborare) */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "24px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      padding: "20px 24px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "18px" }}>🏛️</span>
                          <h4 style={{ fontSize: "15px", fontWeight: "700", color: text, margin: 0 }}>
                            {lang === "EN" ? "For institutions and organizations" : "Pentru instituții și organizații"}
                          </h4>
                        </div>
                        <p style={{ fontSize: "13px", color: textFaint, lineHeight: 1.5, margin: 0 }}>
                          {lang === "EN"
                            ? "Universities, professional training centers, research institutes and audit firms training staff: contact us for an institutional collaboration agreement — multi-user access, custom curriculum, Zephren branding for courses, special pricing."
                            : "Universități, centre de formare MDLPA, institute de cercetare și birouri care formează personal: contactați-ne pentru un acord instituțional — acces multi-user, curriculum personalizat, branding Zephren în cursuri, condiții speciale."}
                        </p>
                      </div>
                      <a
                        href="mailto:edu@zephren.ro?subject=Cerere%20colaborare%20Zephren%20%E2%80%94%20Uz%20didactic%20institu%C8%9Bional&body=Bun%C4%83%20ziua%2C%0A%0ADoresc%20s%C4%83%20discut%20o%20colaborare%20Zephren%20pentru%20uz%20didactic%2Fcercetare.%0A%0ANume%20institu%C8%9Bie%3A%20%0ATip%20institu%C8%9Bie%20(universitate%2Fcentru%20de%20formare%2Finstitut%20cercetare%2Falt)%3A%20%0AContact%3A%20%0APozi%C8%9Bie%2Frol%3A%20%0ANr.%20utilizatori%20estima%C8%9Bi%3A%20%0AScop%20utilizare%20(curs%2Flaborator%2Fproiect%20cercetare%2Fformare%20auditori)%3A%20%0ATermen%20colabor%C4%83rii%3A%20%0A%0AMul%C8%9Bumesc%2C%0A"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "12px 20px",
                          borderRadius: "10px",
                          background: "transparent",
                          color: "#10b981",
                          border: "2px solid #10b981",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📩 {lang === "EN" ? "Request collaboration →" : "Cerere colaborare →"}
                      </a>
                    </div>

                    {/* Footer mic cu email general */}
                    <div style={{ marginTop: "16px", textAlign: "center", fontSize: "11px", color: textFaint }}>
                      {lang === "EN" ? "Direct contact: " : "Contact direct: "}
                      <a href="mailto:edu@zephren.ro" style={{ color: "#10b981", textDecoration: "none", fontWeight: "600" }}>edu@zephren.ro</a>
                    </div>
                  </div>
                );
              })()}

              {/* ── Banner Pașaport Renovare (pay-per-doc, pentru NON-auditori) — ASCUNS TEMPORAR ── */}
              {/* {PAY_PER_USE.length > 0 && false && (
                <div>...</div>
              )} */}
            </>
          );
        })()}

        {/* (Banner trust prețuri mutat sus — anunț 90 zile pentru orice modificare) */}

        {/* ── (Ofertă lansare + Pașaport stand-alone + Credite pay-per-project — UNIFICATE
              în secțiunea PAY_PER_USE de mai sus, Sprint Pricing v6.0, 25 apr 2026) ── */}

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
      <footer style={{ borderTop: `1px solid ${border}`, padding: "48px 24px 32px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
          <img src={isDark ? "/logo-canva-dark.png" : "/logo-canva.png"} alt="Zephren" style={{ height: "32px", width: "auto", mixBlendMode: isDark ? "normal" : "multiply" }} />
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700" }}>v{APP_VERSION}</span>
        </div>
        <p style={{ fontSize: "12px", color: textFaint, maxWidth: "520px", margin: "0 auto 20px", lineHeight: 1.6 }}>
          {lang === "EN"
            ? "Professional software for MDLPA certified energy auditors. EPC calculator compliant with Mc 001-2022."
            : "Software profesional pentru auditori energetici atestați MDLPA. Calculator performanță energetică conform Mc 001-2022."}
        </p>
        {/* Linkuri footer */}
        <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
          {[
            { label: lang === "EN" ? "Privacy Policy" : "Politică de confidențialitate", href: "/privacy" },
            { label: lang === "EN" ? "Terms of Service" : "Termeni și condiții", href: "/terms" },
            { label: "Contact", href: "mailto:contact@zephren.ro" },
          ].map(link => (
            <a key={link.href} href={link.href} style={{ fontSize: "12px", color: textFaint, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = text; }}
              onMouseLeave={e => { e.currentTarget.style.color = textFaint; }}>
              {link.label}
            </a>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.45)", margin: 0 }}>
          © {new Date().getFullYear()} Zephren SRL · Toate drepturile rezervate
        </p>
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
