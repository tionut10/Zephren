import "./storage-polyfill.js";
import "./index.css";
import React, { useState, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";

const EnergyCalcApp = lazy(() => import("./energy-calc.jsx"));
const LandingPage = lazy(() => import("./landing.jsx"));

function Router() {
  const [route, setRoute] = useState(window.location.hash === "#app" ? "app" : "landing");

  const goToApp = () => { window.location.hash = "#app"; setRoute("app"); };

  React.useEffect(() => {
    const handler = () => setRoute(window.location.hash === "#app" ? "app" : "landing");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a1a",color:"#f59e0b",fontFamily:"DM Sans, sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>⚡</div>
          <div style={{fontSize:"24px",fontWeight:"bold"}}>Zephren</div>
          <div style={{fontSize:"12px",opacity:0.5,marginTop:"8px"}}>Se încarcă...</div>
        </div>
      </div>
    }>
      {route === "app"
        ? <EnergyCalcApp />
        : <LandingPage onStart={goToApp} />
      }
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
