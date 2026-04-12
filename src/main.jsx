import "./storage-polyfill.js";
import "./index.css";
import React, { useState, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";

const EnergyCalcApp = lazy(() => import("./energy-calc.jsx"));
const LandingPage = lazy(() => import("./landing.jsx"));
const ClientReport = lazy(() => import("./components/ClientReport.jsx"));
const MobileWizard = lazy(() => import("./components/MobileWizard.jsx"));

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.warn("CRASH:", error?.message, error?.stack?.substring(0, 600)); }
  render() {
    if (this.state.error) return React.createElement("div", {
      style: { color: "#f87171", background: "#0a0a1a", padding: 32, fontFamily: "DM Sans, sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }
    },
      React.createElement("div", { style: { fontSize: "48px", marginBottom: "16px" } }, "⚠️"),
      React.createElement("h1", { style: { fontSize: "20px", fontWeight: "bold", marginBottom: "8px" } }, "Eroare neașteptată"),
      React.createElement("p", { style: { fontSize: "13px", opacity: 0.6, maxWidth: "500px", textAlign: "center", marginBottom: "24px" } }, this.state.error.message),
      React.createElement("div", { style: { display: "flex", gap: "12px" } },
        React.createElement("button", {
          onClick: () => this.setState({ error: null }),
          style: { padding: "10px 24px", borderRadius: "8px", background: "#f59e0b", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer" }
        }, "Încearcă din nou"),
        React.createElement("button", {
          onClick: () => { window.location.hash = ""; window.location.reload(); },
          style: { padding: "10px 24px", borderRadius: "8px", background: "#333", color: "#fff", border: "1px solid #555", cursor: "pointer" }
        }, "Pagina principală")
      ),
      React.createElement("pre", { style: { marginTop: "24px", fontSize: "10px", opacity: 0.3, maxWidth: "600px", overflow: "auto", maxHeight: "200px" } }, this.state.error.stack || "")
    );
    return this.props.children;
  }
}

// Decodare view param pentru raport client
function decodeViewParam() {
  try {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("view");
    if (!v) return null;
    return JSON.parse(decodeURIComponent(escape(atob(v))));
  } catch { return null; }
}

// Detectare mod mobil (?mobile=1 sau /mobile în pathname)
function isMobileRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mobile") === "1" || window.location.pathname === "/mobile";
}

function Router() {
  const viewData = React.useMemo(() => decodeViewParam(), []);
  const [route, setRoute] = useState(() => {
    if (isMobileRoute()) return "mobile";
    if (viewData) return "view";
    return window.location.hash === "#app" ? "app" : "landing";
  });

  const goToApp = () => { window.location.hash = "#app"; setRoute("app"); };

  React.useEffect(() => {
    if (viewData) return; // nu schimba ruta dacă suntem în mod view
    const handler = () => setRoute(window.location.hash === "#app" ? "app" : "landing");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [viewData]);

  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a1a",color:"#f59e0b",fontFamily:"DM Sans, sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <img src="/logo.svg" alt="Zephren" style={{width:"220px",height:"auto",marginBottom:"8px"}} />
          <div style={{fontSize:"12px",opacity:0.5,marginTop:"8px"}}>Se încarcă...</div>
        </div>
      </div>
    }>
      <ErrorBoundary>
        {route === "mobile"
          ? <MobileWizard userPlan="free" />
          : route === "view"
          ? <ClientReport data={viewData} onOpenApp={goToApp} />
          : route === "app"
            ? <EnergyCalcApp />
            : <LandingPage onStart={goToApp} />
        }
      </ErrorBoundary>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
