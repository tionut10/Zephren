import { useState } from "react";

const FEATURES = [
  { icon: "📊", title: "Calcul Mc 001-2022 complet", desc: "Bilanț energetic lunar ISO 13790, 60 localități climatice, 5 zone, dashboard sumar cu grafic Sankey, calcul orar ISO 52016-1" },
  { icon: "📜", title: "Certificat DOCX oficial MDLPA", desc: "12 template-uri MDLPA completate automat, export XML registru electronic, PDF cu QR code, semnătură digitală" },
  { icon: "🏗️", title: "Anvelopă cu 151 materiale", desc: "151 materiale constructive, 30 punți termice SVG interactive, verificare Glaser ISO 13788, ISO 6946/10077-1/13370" },
  { icon: "☀️", title: "Surse regenerabile complete", desc: "PV (28 modele), solar termic, pompe căldură (57 modele), biomasă, eolian, cogenerare — RER automat" },
  { icon: "🔋", title: "Catalog produse reale", desc: "204+ produse: 36 profile ferestre, 57 pompe căldură, 28 panouri PV, 37 invertoare, 16 baterii, 30 centrale termice" },
  { icon: "🔍", title: "Audit & reabilitare inteligentă", desc: "Scenarii cost-optimă EN 15459-1, deviz estimativ, smart rehab suggestions, comparație multi-scenariu" },
  { icon: "⚡", title: "nZEB & ZEB conform EPBD", desc: "Legea 238/2024, EPBD 2024/1275, scala A-G, verificare completă nZEB cu RER, GWP ciclu viață EN 15978" },
  { icon: "🏠", title: "BACS, EV-ready, Solar-ready", desc: "Evaluare automatizare clădire BACS, pregătire stație EV conform EPBD Art.12, verificare solar-ready Art.14" },
  { icon: "🗺️", title: "Hartă climatică interactivă", desc: "Selectare localitate pe hartă SVG, zone climatice vizuale, profil temperatură lunară, radiație solară" },
  { icon: "❄️", title: "Confort termic vară C107/7", desc: "Analiza confortului termic vara conform C107/7-2002, temperatură operativă, recomandări per element" },
  { icon: "💧", title: "Verificare condensare Glaser", desc: "Diagramă Glaser SVG vizuală per element, verificare lunară 12 luni, presiuni saturație, risc condensare" },
  { icon: "📤", title: "Export complet multi-format", desc: "Export DOCX oficial, XML MDLPA, PDF raport, JSON proiect, CSV date, XLSX tabelar — import/export rapid" },
];

const PLANS = [
  {
    id: "free", name: "Free", price: "0", period: "",
    features: [
      "2 proiecte simultane",
      "Calculator complet 7 pași",
      "151 materiale constructive",
      "30 punți termice interactive",
      "204+ produse în catalog",
      "Export JSON/CSV/XLSX",
      "Preview certificat",
    ],
    cta: "Începe gratuit", highlight: false,
  },
  {
    id: "pro", name: "Pro", price: "99", period: "/lună",
    features: [
      "Proiecte nelimitate",
      "Dashboard sumar Sankey",
      "GWP ciclu viață EN 15978",
      "Smart rehab suggestions",
      "Export DOCX oficial MDLPA",
      "Export XML registru electronic",
      "PDF cu QR code + semnătură",
      "Raport audit automat",
      "15 certificate/lună",
      "Calcul orar ISO 52016-1",
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
  { value: "151", label: "Materiale constructive" },
  { value: "204+", label: "Produse în catalog" },
  { value: "60", label: "Localități climatice" },
  { value: "30", label: "Punți termice SVG" },
  { value: "17", label: "Normative integrate" },
  { value: "7", label: "Pași calculator" },
];

const V3_FEATURES = [
  { icon: "📈", title: "Dashboard sumar", desc: "Vizualizare sintetică cu indicatori cheie: clasă energetică, cost anual, RER, emisii CO₂ — totul într-o singură pagină." },
  { icon: "🔀", title: "Grafic Sankey", desc: "Flux energetic vizual: surse, conversii și pierderi, de la energie primară la energia utilă, într-un singur grafic interactiv." },
  { icon: "🌍", title: "GWP ciclu viață EN 15978", desc: "Emisii gaze efect de seră pe ciclul complet de viață: construcție, operare, demoliție — per material și per element." },
  { icon: "❄️", title: "Confort termic vară C107/7", desc: "Temperatură operativă, analiză per element, conformitate C107/7-2002, recomandări de protecție solară." },
  { icon: "💧", title: "Diagramă Glaser vizuală", desc: "Diagramă SVG interactivă per element constructiv, verificare condens 12 luni, presiuni parțiale vs. saturație." },
  { icon: "🏠", title: "BACS / EV / Solar-ready", desc: "Evaluare BACS (automatizare), pregătire EV (EPBD Art.12), solar-ready (Art.14) — verificare conformitate completă." },
  { icon: "🗺️", title: "Hartă climatică interactivă", desc: "Selectare localitate pe hartă SVG, vizualizare zone I-V, auto-populare date meteo, profil temperatură." },
  { icon: "🧱", title: "Catalog 204+ produse reale", desc: "Ferestre (Rehau, Veka, Schüco), pompe căldură (Daikin, Viessmann, Nibe), PV, invertoare, baterii, centrale." },
  { icon: "💡", title: "Smart rehab suggestions", desc: "Recomandări inteligente bazate pe cost-beneficiu: scenariu ușor, mediu, profund, cu investiție și economie anuală." },
  { icon: "📊", title: "Calcul orar ISO 52016-1", desc: "Simulare orară 8760 ore pe baza datelor TMY generate, validare rezultate lunare, profil termic detaliat." },
  { icon: "🔄", title: "Comparație multi-scenariu", desc: "Comparație scenarii reabilitare side-by-side: investiție, economie, termen recuperare, clasă energetică rezultată." },
  { icon: "📤", title: "Export complet", desc: "DOCX oficial MDLPA, XML registru electronic, PDF cu QR code, JSON/CSV/XLSX — import drag & drop." },
];

const PRODUCT_BRANDS = [
  { cat: "Ferestre", count: 36, brands: "Rehau, Veka, Gealan, Salamander, Internorm, Schüco, Kömmerling, Aluplast, Deceuninck, Aluprof, FAKRO, Velux" },
  { cat: "Pompe de căldură", count: 57, brands: "Daikin, Viessmann, Bosch, Vaillant, Nibe, Mitsubishi, Panasonic, Samsung, LG, Toshiba, Buderus, Wolf, Stiebel Eltron, Atlantic" },
  { cat: "Panouri PV", count: 28, brands: "LONGi, JA Solar, Canadian Solar, Trina, Jinko, REC, SunPower, Q CELLS, Meyer Burger, Risen, Hyundai" },
  { cat: "Invertoare", count: 37, brands: "Fronius, SMA, Huawei, SolarEdge, GoodWe, Growatt, Deye, Sungrow, Victron" },
  { cat: "Baterii stocare", count: 16, brands: "BYD, Huawei, Pylontech, Tesla, LG, Sonnen, Alpha ESS" },
  { cat: "Centrale termice", count: 30, brands: "Viessmann, Vaillant, Bosch, Buderus, Wolf, Ariston, Immergas, Baxi, Ferroli, Protherm" },
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
  const [mode, setMode] = useState("login");
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
      <div style={{ background: "#12141f", borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "100%", margin: "16px", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }} onClick={e => e.stopPropagation()}>

        {toast && (
          <div style={{ position: "absolute", top: "-48px", left: "50%", transform: "translateX(-50%)", padding: "8px 20px", borderRadius: "8px", background: "#f59e0b", color: "#000", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            {toast}
          </div>
        )}

        {mode === "login" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>Autentificare Zephren</h3>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Parola" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Autentificare</button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              Continua cu Google
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("forgot"); }} style={{ color: "rgba(255,255,255,0.5)", textDecoration: "underline", marginRight: "16px" }}>Ai uitat parola?</a>
              Nu ai cont? <a href="#" onClick={e => { e.preventDefault(); setMode("register"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Inregistrare</a>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", textAlign: "center" }}>Creaza cont Zephren</h3>
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder="Nume complet" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Parola" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Confirma parola" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Creaza cont</button>
            </form>
            <button onClick={handleGoogle} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.97 6.97 0 015.47 12c0-.72.13-1.43.37-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.42l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.77 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.03 6.16-4.03z" fill="#EA4335"/></svg>
              Inregistrare cu Google
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              Ai deja cont? <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Autentificare</a>
            </div>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>Resetare parola</h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "20px" }}>Introdu adresa de email pentru a primi un link de resetare.</p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginTop: "4px" }}>Trimite link de resetare</button>
            </form>
            <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "16px" }}>
              <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }} style={{ color: "#f59e0b", textDecoration: "none" }}>Inapoi la autentificare</a>
            </div>
          </>
        )}

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          Sau continua fara cont → <a href="#" onClick={(e) => { e.preventDefault(); onClose(); onStart(); }} style={{ color: "#f59e0b" }}>Deschide aplicatia</a>
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
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700", marginLeft: "4px" }}>v3.2</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="nav-desktop">
            <a href="#features" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Functionalitati</a>
            <a href="#products" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Catalog produse</a>
            <a href="#pricing" style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Preturi</a>
            <button onClick={() => setShowLogin(true)} style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer" }}>Autentificare</button>
            <button onClick={onStart} style={{ fontSize: "13px", fontWeight: "600", padding: "8px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>Deschide aplicatia →</button>
          </div>
          <button className="nav-mobile" onClick={() => setMobileMenu(!mobileMenu)} style={{ display: "none", background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "4px" }}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      {mobileMenu && (
        <div style={{ background: "rgba(10,10,26,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }} className="nav-mobile-menu">
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Functionalitati</a>
          <a href="#products" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Catalog produse</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "8px 0" }}>Preturi</a>
          <button onClick={() => { setMobileMenu(false); setShowLogin(true); }} style={{ fontSize: "13px", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", textAlign: "left" }}>Autentificare</button>
          <button onClick={() => { setMobileMenu(false); onStart(); }} style={{ fontSize: "13px", fontWeight: "600", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer" }}>Deschide aplicatia →</button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "100px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "24px" }}>
          Mc 001-2022 · ISO 52000-1/NA:2023 · EPBD 2024/1275 · Legea 238/2024
        </div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "900", lineHeight: 1.1, marginBottom: "24px" }}>
          Calculator performanta<br />
          <span style={{ color: "#f59e0b" }}>energetica cladiri</span>
        </h1>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", maxWidth: "640px", margin: "0 auto 40px", lineHeight: 1.6 }}>
          Software profesional pentru auditori energetici. Certificat de performanta energetica conform Mc 001-2022,
          cu 204+ produse reale, 151 materiale, calcul ISO 13790 si verificare nZEB/ZEB.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ fontSize: "16px", fontWeight: "700", padding: "16px 40px", borderRadius: "12px", border: "none", background: "#f59e0b", color: "#000", cursor: "pointer", boxShadow: "0 4px 24px rgba(245,158,11,0.3)" }}>
            Incepe calculul gratuit →
          </button>
          <a href="https://github.com/tionut10/Zephren" target="_blank" rel="noopener" style={{ fontSize: "16px", padding: "16px 32px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            GitHub ↗
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "24px", maxWidth: "900px", margin: "60px auto 0" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#f59e0b" }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "16px" }}>Tot ce ai nevoie pentru certificare energetica</h2>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", textAlign: "center", maxWidth: "600px", margin: "0 auto 48px" }}>
          De la identificarea cladirii pana la raportul de audit — 7 pasi, un singur software
        </p>
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

      {/* ═══ CATALOG PRODUSE ═══ */}
      <section id="products" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", color: "#10b981", marginBottom: "16px" }}>
            204+ PRODUSE REALE
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800" }}>Catalog produse actualizat 2026</h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", maxWidth: "600px", margin: "12px auto 0" }}>
            Toate brandurile majore de pe piata romaneasca si europeana, cu specificatii tehnice reale
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
          {PRODUCT_BRANDS.map(p => (
            <div key={p.cat} style={{ padding: "24px", borderRadius: "12px", background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)", transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: "700" }}>{p.cat}</h4>
                <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "10px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: "700" }}>{p.count} produse</span>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{p.brands}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FUNCTIONALITATI v3.2 ═══ */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", marginBottom: "16px" }}>
            v3.2
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: "800" }}>Functionalitati avansate</h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", maxWidth: "600px", margin: "12px auto 0" }}>
            Calcule, vizualizari si rapoarte profesionale
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          {V3_FEATURES.map(item => (
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
          <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>17 normative integrate</h3>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            {["Mc 001-2022", "SR EN ISO 52000-1/NA:2023", "SR EN ISO 13790", "SR EN ISO 52016-1", "SR EN ISO 6946", "SR EN ISO 10077-1", "SR EN ISO 13370", "SR EN ISO 13788", "SR EN ISO 14683", "EN 15193-1", "EN 15459-1", "EN 15978 (GWP)", "I5-2022", "C107/7-2002", "Legea 372/2005 + L.238/2024", "EPBD 2024/1275", "Reg. delegat UE 2025/2273"].map(n => (
              <span key={n} style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "800", textAlign: "center", marginBottom: "48px" }}>Planuri si preturi</h2>
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
              <button onClick={() => onStart()} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: p.highlight ? "none" : "1px solid rgba(255,255,255,0.15)", background: p.highlight ? "#f59e0b" : "transparent", color: p.highlight ? "#000" : "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
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
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: "700" }}>v3.2</span>
        </div>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", maxWidth: "500px", margin: "0 auto" }}>
          Software profesional pentru auditori energetici atestati MDLPA.
          Calculator performanta energetica conform Mc 001-2022.
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
