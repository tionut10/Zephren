/**
 * PlanGate.jsx — v6.0 (25 apr 2026)
 *
 * Wrapper React pentru gating de funcționalități per plan abonament.
 *
 * Utilizare tipică:
 *   <PlanGate feature="step8Advanced" plan={user.plan} requiredPlan="expert">
 *     <Step8Advanced ... />
 *   </PlanGate>
 *
 * Dacă userul are acces → randează `children`.
 * Dacă NU are acces → afișează fallback cu CTA upgrade către `requiredPlan`.
 *
 * Suportă și mod "soft" (overlay blurat cu mesaj) pentru preview funcție.
 */

import React from "react";
import { canAccess } from "../lib/planGating.js";

// Inline resolvePlan pentru a evita probleme de cache Vite cu re-export.
// Sincronizat cu src/lib/planGating.js — actualizează în ambele locuri.
const LEGACY_PLAN_ALIAS = {
  starter: "audit",
  standard: "pro",
  business: "birou",
  asociatie: "birou",
  professional: "expert",
};
const VALID_PLANS = ["free", "edu", "audit", "pro", "expert", "birou", "enterprise"];
function resolvePlan(plan) {
  if (!plan) return "free";
  const key = String(plan).toLowerCase();
  if (VALID_PLANS.includes(key)) return key;
  if (LEGACY_PLAN_ALIAS[key]) return LEGACY_PLAN_ALIAS[key];
  return "free";
}

const PLAN_DISPLAY = {
  free:       { label: "Zephren Free",       price: "0 RON",         color: "#6B7280" },
  edu:        { label: "Zephren Edu",        price: "Gratis cu dovadă", color: "#10B981" },
  audit:      { label: "Zephren AE IIci",    price: "199 RON/lună",  color: "#3B82F6" },
  pro:        { label: "Zephren AE Ici",     price: "499 RON/lună",  color: "#F59E0B" },
  expert:     { label: "Zephren Expert",     price: "899 RON/lună",  color: "#8B5CF6" },
  birou:      { label: "Zephren Birou",      price: "1.890 RON flat", color: "#EC4899" },
  enterprise: { label: "Zephren Enterprise", price: "de la 4.990 RON", color: "#DC2626" },
};

const FEATURE_LABELS = {
  step7Audit:         "Step 7 — Audit & Reabilitare",
  step8Advanced:      "Step 8 — Module avansate",
  exportXML:          "Export XML registru MDLPA",
  submitMDLPA:        "Submit oficial MDLPA",
  auditorStamp:       "Ștampilă digitală auditor",
  bacsDetailed:       "BACS calculator detaliat (200 factori)",
  sriDetailed:        "SRI complet (42 servicii)",
  mepsOptimizer:      "MEPS optimizator + roadmap 2050",
  pasaportBasic:      "Pașaport Renovare basic",
  pasaportDetailed:   "Pașaport Renovare detaliat (LCC + multi-fază)",
  aiPack:             "AI Pack (OCR + chat import + AI assistant)",
  aiAssistant:        "AI Assistant",
  ocrInvoice:         "OCR facturi energie",
  ocrCPE:             "OCR CPE existent",
  chatImport:         "Chat import NL → date",
  bimPack:            "BIM Pack (IFC import)",
  ifcImport:          "Import IFC/BIM",
  monteCarloEP:       "MonteCarlo EP (analiză incertitudine)",
  pasivhaus:          "Pasivhaus 15 kWh/(m²·a)",
  pmvPpd:             "PMV/PPD ISO 7730",
  en12831Rooms:       "EN 12831 sarcini per cameră",
  thermovision:       "Thermovision IR adnotare",
  urbanHeatIsland:    "UrbanHeatIsland",
  historicBuildings:  "Clădiri istorice / patrimoniu",
  mixedUseBuildings:  "Clădiri mixed-use",
  portfolioMulti:     "Portfolio multi-clădire",
  consumReconciliere: "Reconciliere consum măsurat",
  consumoTracker:     "ConsumoTracker monitoring",
  acoustic:           "Acoustic P 122-89",
  nightVentilation:   "Ventilare nocturnă",
  shadingDynamic:     "Shading dinamic",
  coolingHourly:      "Cooling hourly 8760h",
  teamDashboard:      "TeamDashboard multi-user",
  whiteLabel:         "White-label complet (branding firmă)",
  apiAccess:          "API access (CRM/ERP)",
  calendarTeam:       "Calendar audit echipă",
  cpeAlertSystem:     "CPE Alert System (5/10 ani)",
  climateImportEPW:   "Import climă EPW/ERA5",
  ancpiCadastru:      "ANCPI cadastru integrat",
  gwpReport:          "GWP CO₂ lifecycle EN 15978",
};

/**
 * @param {object} props
 * @param {string} props.feature - cheie din PLAN_FEATURES (ex: "step8Advanced")
 * @param {string} props.plan - planul curent al userului
 * @param {string} [props.requiredPlan] - planul minim necesar (pentru CTA upgrade)
 * @param {React.ReactNode} props.children - conținutul gated
 * @param {("hide"|"upgrade"|"soft")} [props.mode="upgrade"] - cum se comportă fallback
 *   - "hide":    nu afișează nimic dacă blocat
 *   - "upgrade": afișează card mare „Upgrade la X" (default)
 *   - "soft":    afișează children cu overlay blurat + buton upgrade
 * @param {function} [props.onUpgradeClick] - handler click buton upgrade
 */
export default function PlanGate({
  feature,
  plan,
  requiredPlan = "pro",
  children,
  mode = "upgrade",
  onUpgradeClick,
}) {
  const allowed = canAccess(plan, feature);
  if (allowed) return <>{children}</>;

  const currentPlan = resolvePlan(plan);
  const targetPlan  = PLAN_DISPLAY[requiredPlan] || PLAN_DISPLAY.pro;
  const featureLabel = FEATURE_LABELS[feature] || feature;

  if (mode === "hide") return null;

  if (mode === "soft") {
    return (
      <div style={{ position: "relative" }}>
        <div style={{
          filter:        "blur(4px) grayscale(80%)",
          opacity:       0.6,
          pointerEvents: "none",
          userSelect:    "none",
        }}>
          {children}
        </div>
        <div style={{
          position:       "absolute",
          top:            "50%",
          left:           "50%",
          transform:      "translate(-50%, -50%)",
          background:     "rgba(15, 23, 42, 0.95)",
          color:          "#fff",
          padding:        "24px 32px",
          borderRadius:   "12px",
          border:         `2px solid ${targetPlan.color}`,
          textAlign:      "center",
          maxWidth:       "420px",
          boxShadow:      "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "8px" }}>
            🔒 FUNCȚIE PREMIUM
          </div>
          <h3 style={{ margin: "0 0 12px", fontSize: "18px" }}>
            {featureLabel}
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: "14px", opacity: 0.85 }}>
            Disponibil în <strong style={{ color: targetPlan.color }}>{targetPlan.label}</strong>
            {" "}({targetPlan.price})
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              style={{
                background:   targetPlan.color,
                color:        "#fff",
                border:       "none",
                padding:      "10px 24px",
                borderRadius: "8px",
                fontSize:     "14px",
                fontWeight:   600,
                cursor:       "pointer",
              }}
            >
              Upgrade la {targetPlan.label} →
            </button>
          )}
        </div>
      </div>
    );
  }

  // mode === "upgrade" (default)
  return (
    <div style={{
      background:    "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))",
      color:         "#fff",
      padding:       "48px 32px",
      borderRadius:  "16px",
      border:        `2px solid ${targetPlan.color}`,
      textAlign:     "center",
      maxWidth:      "560px",
      margin:        "32px auto",
    }}>
      <div style={{
        display:      "inline-block",
        padding:      "4px 12px",
        background:   `${targetPlan.color}20`,
        color:        targetPlan.color,
        borderRadius: "12px",
        fontSize:     "12px",
        fontWeight:   600,
        marginBottom: "16px",
        letterSpacing: "0.5px",
      }}>
        🔒 FUNCȚIE PREMIUM
      </div>
      <h2 style={{ margin: "0 0 12px", fontSize: "24px" }}>
        {featureLabel}
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: "15px", opacity: 0.85, lineHeight: 1.6 }}>
        Această funcționalitate este disponibilă începând cu planul
      </p>
      <div style={{
        margin:       "16px 0 24px",
        padding:      "16px 24px",
        background:   "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        display:      "inline-block",
      }}>
        <div style={{ fontSize: "20px", fontWeight: 700, color: targetPlan.color }}>
          {targetPlan.label}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.7, marginTop: "4px" }}>
          {targetPlan.price}
        </div>
      </div>
      <p style={{ margin: "0 0 24px", fontSize: "13px", opacity: 0.6 }}>
        Plan curent: <strong>{PLAN_DISPLAY[currentPlan]?.label || currentPlan}</strong>
      </p>
      {onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          style={{
            background:   targetPlan.color,
            color:        "#fff",
            border:       "none",
            padding:      "14px 32px",
            borderRadius: "10px",
            fontSize:     "16px",
            fontWeight:   600,
            cursor:       "pointer",
            boxShadow:    `0 8px 24px ${targetPlan.color}40`,
          }}
        >
          Upgrade la {targetPlan.label} →
        </button>
      )}
      {!onUpgradeClick && (
        <a
          href="/#pricing"
          style={{
            display:        "inline-block",
            background:     targetPlan.color,
            color:          "#fff",
            textDecoration: "none",
            padding:        "14px 32px",
            borderRadius:   "10px",
            fontSize:       "16px",
            fontWeight:     600,
            boxShadow:      `0 8px 24px ${targetPlan.color}40`,
          }}
        >
          Vezi planurile →
        </a>
      )}
    </div>
  );
}

/**
 * Hook utilitar pentru afișare counter CPE rămase în header.
 *
 * @example
 *   const { used, included, burst, overageActive } = usePlanCpeCounter(user);
 *   return <span>{used}/{included} CPE</span>;
 */
export function usePlanCpeCounter(user) {
  if (!user) return { used: 0, included: 0, burst: 0, overageActive: false };
  // Implementare detaliată în Sub-sprint 2 cu Supabase RPC
  // Aici doar placeholder pentru API consistent
  return {
    used:           user.cpeUsedThisMonth ?? 0,
    included:       user.cpeIncluded     ?? 0,
    burst:          user.cpeBurst         ?? 0,
    overageActive:  (user.cpeUsedThisMonth ?? 0) > (user.cpeIncluded ?? 0) + (user.cpeBurst ?? 0),
  };
}
