// PlanComparisonTable.jsx — comparator interactiv plan-uri Zephren v7.0
//
// Component pentru landing page. Afișează tabelă comprehensivă side-by-side
// cu TOATE funcționalitățile diferențiate pe categorii. Permite clienților să
// vadă rapid diferența reală dintre cele 7 planuri (Free, AE IIci, AE Ici,
// Expert, Birou, Enterprise + Edu).
//
// Sursa de adevăr: PLAN_FEATURES din planGating.js + PLANS din landingData.js
// Categorii grupate logic: Volum & Cap-uri / Restricții MDLPA / Step-uri funcționale
// / Audit & nZEB / Funcții avansate / AI & BIM / EPBD compliance / Cloud & Multi-user
// / Suport & SLA.

import React, { useState, useMemo } from "react";
import { PLAN_FEATURES } from "../lib/planGating";

// Coloane = planurile pe care le comparăm (ordine fixă logic)
const COMPARED_PLANS = [
  { id: "free",       name: "Free",         price: "0",            highlight: false, color: "#22c55e" },
  { id: "audit",      name: "AE IIci",      price: "499",          highlight: false, color: "#3b82f6" },
  { id: "pro",        name: "AE Ici",       price: "1.299",        highlight: true,  color: "#f59e0b" },
  { id: "expert",     name: "Expert",       price: "2.499",        highlight: false, color: "#8b5cf6" },
  { id: "birou",      name: "Birou",        price: "4.999 flat",   highlight: false, color: "#ec4899" },
  { id: "enterprise", name: "Enterprise",   price: "de la 9.999",  highlight: false, color: "#dc2626" },
];

// Categoriile de feature-uri și mapping pe câmpurile PLAN_FEATURES
const CATEGORIES = [
  {
    title: "Volum & cap-uri lunare",
    icon: "📊",
    rows: [
      { key: "maxCertsPerMonth",  label: "CPE/lună incluse",            type: "number_or_unlimited" },
      { key: "burstPercent",       label: "Burst gratis (% peste cap)", type: "percent" },
      { key: "maxAuditsPerMonth",  label: "Audituri energetice/lună",   type: "number_or_unlimited" },
      { key: "maxUsers",           label: "Utilizatori",                type: "users" },
      { key: "rolloverMonths",     label: "Rollover CPE neutilizate",   type: "months" },
      { key: "maxProjects",        label: "Proiecte total stocate",     type: "number_or_unlimited" },
    ],
  },
  {
    title: "Restricții legale MDLPA (Ord. 348/2026)",
    icon: "⚖️",
    rows: [
      { key: "gradMdlpaRequired",            label: "Grad MDLPA cerut",                  type: "grade" },
      { key: "buildingCategoryRestricted",   label: "Tip clădiri permise",               type: "building_category" },
      { key: "publicBuildingAllowed",        label: "Clădiri publice (școli, spitale)",  type: "bool" },
      { key: "auditEnergetic",               label: "Audit energetic Mc 001-2022",       type: "bool" },
      { key: "nzebReport",                   label: "Raport conformare nZEB (Art. 6 c)", type: "bool" },
    ],
  },
  {
    title: "Calculator energetic (Step 1-8)",
    icon: "🧮",
    rows: [
      { key: "step1to6",       label: "Step 1-6 (CPE complet + Anexa 1+2 MDLPA)", type: "always_true_paid" },
      { key: "step7Audit",     label: "Step 7 (Audit + LCC + NPV/IRR)",           type: "bool" },
      { key: "step8Advanced",  label: "Step 8 (18 module avansate)",              type: "bool" },
      { key: "monteCarloEP",   label: "MonteCarloEP analiză sensibilitate",       type: "bool" },
      { key: "pasivhaus",      label: "Pasivhaus + PMV/PPD ISO 7730",             type: "bool" },
      { key: "en12831Rooms",   label: "EN 12831 sarcini per cameră",              type: "bool" },
      { key: "thermovision",   label: "ThermovisionModule",                       type: "bool" },
      { key: "urbanHeatIsland",label: "UrbanHeatIsland",                          type: "bool" },
      { key: "historicBuildings", label: "Historic buildings",                    type: "bool" },
      { key: "mixedUseBuildings", label: "Mixed-use buildings",                   type: "bool" },
      { key: "acoustic",       label: "Acoustic P 122-89",                        type: "bool" },
      { key: "nightVentilation", label: "Night ventilation",                      type: "bool" },
      { key: "shadingDynamic", label: "Shading dynamic",                          type: "bool" },
      { key: "coolingHourly",  label: "Cooling hourly",                           type: "bool" },
      { key: "portfolioMulti", label: "PortfolioDashboard multi-clădire",         type: "bool" },
      { key: "consumReconciliere", label: "ConsumReconciliere",                   type: "bool" },
      { key: "consumoTracker", label: "ConsumoTracker",                           type: "bool" },
    ],
  },
  {
    title: "EPBD 2024 — conformitate (BACS / SRI / MEPS / Pașaport)",
    icon: "🇪🇺",
    rows: [
      { key: "bacsSimple",       label: "BACS A-D simplu (selector)",            type: "bool" },
      { key: "bacsDetailed",     label: "BACS detaliat 200 factori",             type: "bool" },
      { key: "sriAuto",          label: "SRI score auto",                        type: "bool" },
      { key: "sriDetailed",      label: "SRI complet 42 servicii",               type: "bool" },
      { key: "mepsBinar",        label: "MEPS check binar (2030)",               type: "bool" },
      { key: "mepsOptimizer",    label: "MEPS optimizator + roadmap 2050",       type: "bool" },
      // Pașaport Renovare dezactivat până la EPBD 29 mai 2026
      // { key: "pasaportBasic",    label: "Pașaport Renovare basic",               type: "bool" },
      // { key: "pasaportDetailed", label: "Pașaport Renovare detaliat (LCC)",      type: "bool" },
      { key: "gwpReport",        label: "GWP report EN 15978 (CO₂ lifecycle)",   type: "bool" },
    ],
  },
  {
    title: "AI Pack & BIM Pack",
    icon: "🤖",
    rows: [
      { key: "aiPack",           label: "AI Pack (suite completă)",              type: "bool" },
      { key: "ocrInvoice",       label: "OCR facturi automat",                   type: "bool" },
      { key: "ocrCPE",           label: "OCR CPE (auto-import documente)",       type: "bool" },
      { key: "chatImport",       label: "Chat import (date din Excel/PDF)",      type: "bool" },
      { key: "aiAssistant",      label: "AI assistant (sugestii calcul)",        type: "bool" },
      { key: "aiDocumentImport", label: "AI document import",                    type: "bool" },
      { key: "bimPack",          label: "BIM Pack (suite completă)",             type: "bool" },
      { key: "ifcImport",        label: "IFC/Revit/ArchiCAD import",             type: "bool" },
    ],
  },
  {
    title: "Export & integrare oficială",
    icon: "📤",
    rows: [
      { key: "exportDOCX",      label: "Export DOCX MDLPA + Anexa 1+2",          type: "bool_with_watermark" },
      { key: "exportXML",       label: "Export XML registru MDLPA",              type: "bool" },
      { key: "submitMDLPA",     label: "Submit portal MDLPA online",             type: "bool" },
      { key: "auditorStamp",    label: "Ștampilă auditor 40mm",                  type: "bool" },
      { key: "ancpiCadastru",   label: "ANCPI cadastru auto-import",             type: "bool" },
      { key: "climateImportEPW",label: "Climate import EPW + TMY orar",          type: "bool" },
    ],
  },
  {
    title: "Cloud, colaborare & multi-user",
    icon: "☁️",
    rows: [
      { key: "cloudSync",         label: "Cloud sync",                            type: "bool" },
      { key: "cloudRetentionDays",label: "Cloud retention",                       type: "retention" },
      { key: "shareReadOnly",     label: "Share read-only",                       type: "bool" },
      { key: "cpeTracker",        label: "CPETracker (status proiecte)",          type: "bool" },
      { key: "cpeAlertSystem",    label: "Alerts expirare CPE",                   type: "bool" },
      { key: "multiUser",         label: "Multi-user real",                       type: "bool" },
      { key: "teamDashboard",     label: "TeamDashboard",                         type: "bool" },
      { key: "calendarTeam",      label: "Calendar audit echipă",                 type: "bool" },
      { key: "whiteLabel",        label: "White-label (branding firmă)",          type: "bool" },
      { key: "apiAccess",         label: "API access (CRM/ERP)",                  type: "bool" },
    ],
  },
  {
    title: "Suport & garanții",
    icon: "🎯",
    rows: [
      { key: "supportEmailHours",  label: "Suport email — răspuns",   type: "support_hours" },
      { key: "accountManager",     label: "Manager cont dedicat",     type: "bool" },
      { key: "slaGuaranteed",      label: "SLA 99.9% garantat",       type: "bool" },
      { key: "trainingHours",      label: "Training inclus",          type: "training_hours" },
    ],
  },
];

// ── Helper: formatare valori per tip ─────────────────────────────────────
function formatValue(planId, planFeatures, row) {
  const v = planFeatures[row.key];
  const isPaid = planId !== "free" && planId !== "edu";

  // Edu = totul ✓ pentru learning, dar cu watermark
  // Free = limitat fundamental

  switch (row.type) {
    case "number_or_unlimited":
      if (v === undefined || v === null) return "—";
      if (v >= 9999) return { type: "unlimited" };
      if (v === 0) return { type: "zero" };
      return { type: "number", value: v };

    case "percent":
      if (!v) return { type: "zero" };
      return { type: "text", value: `+${v}%` };

    case "users":
      if (v >= 999) return { type: "text", value: "6-100+" };
      if (v >= 5) return { type: "text", value: "2-5" };
      return { type: "text", value: String(v) };

    case "months":
      if (!v) return { type: "zero" };
      return { type: "text", value: `${v} luni` };

    case "grade":
      if (!v) return { type: "text", value: "—" };
      return { type: "text", value: `AE ${v}` };

    case "building_category":
      if (!v || (Array.isArray(v) && v.length === 0)) return { type: "text", value: "TOATE" };
      if (Array.isArray(v)) return { type: "text", value: "doar rezidențial" };
      return { type: "text", value: String(v) };

    case "bool":
      return { type: v ? "yes" : "no" };

    case "bool_with_watermark":
      // Free are exportDOCX=true dar cu watermark
      if (planId === "free" && v) return { type: "watermark" };
      if (planId === "edu" && v) return { type: "watermark" };
      return { type: v ? "yes" : "no" };

    case "always_true_paid":
      // Step 1-6 e disponibil pe toate planurile (chiar și Free are calculator complet)
      return { type: isPaid ? "yes" : "yes_watermark" };

    case "retention":
      if (!v) return { type: "text", value: "30 zile" };
      if (v >= 9999) return { type: "text", value: "NELIMITAT", strong: true };
      return { type: "text", value: `${v} zile` };

    case "support_hours":
      if (!v) return { type: "text", value: "—" };
      return { type: "text", value: `${v}h` };

    case "training_hours":
      if (!v) return { type: "no" };
      return { type: "text", value: `${v}h` };

    default:
      return { type: "text", value: String(v ?? "—") };
  }
}

// ── Render cell ─────────────────────────────────────────────────────────
function Cell({ formatted, isDark }) {
  const text  = isDark ? "#e2e8f0" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";

  if (!formatted) {
    return <span style={{ color: muted }}>—</span>;
  }

  switch (formatted.type) {
    case "yes":
      return <span style={{ color: "#22c55e", fontSize: "16px", fontWeight: "700" }}>✓</span>;
    case "yes_watermark":
      return (
        <span style={{ color: "#22c55e", fontSize: "13px" }}>
          ✓ <span style={{ color: muted, fontSize: "10px", marginLeft: 4 }}>watermark</span>
        </span>
      );
    case "watermark":
      return <span style={{ color: muted, fontSize: "11px" }}>⚠ cu watermark</span>;
    case "no":
      return <span style={{ color: "#ef4444", fontSize: "14px", opacity: 0.6 }}>✕</span>;
    case "zero":
      return <span style={{ color: muted, fontSize: "13px" }}>0</span>;
    case "unlimited":
      return <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "700" }}>NELIMITAT</span>;
    case "number":
      return <span style={{ color: text, fontSize: "13px", fontWeight: "600" }}>{formatted.value}</span>;
    case "text":
      return (
        <span style={{ color: text, fontSize: "12px", fontWeight: formatted.strong ? "700" : "500" }}>
          {formatted.value}
        </span>
      );
    default:
      return <span style={{ color: muted }}>—</span>;
  }
}

// ── Component principal ─────────────────────────────────────────────────
export default function PlanComparisonTable({
  isDark,
  text,
  textMuted,
  textFaint,
  cardBg,
  cardBorder,
  border,
  lang = "RO",
}) {
  const [expanded, setExpanded] = useState(false);
  const [openCategories, setOpenCategories] = useState(() => {
    // Default deschis doar primele 3 categorii
    const init = {};
    CATEGORIES.forEach((c, i) => { init[c.title] = i < 3; });
    return init;
  });

  const toggleCategory = (title) => {
    setOpenCategories((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const expandAll = () => {
    const all = {};
    CATEGORIES.forEach((c) => { all[c.title] = true; });
    setOpenCategories(all);
  };
  const collapseAll = () => {
    const none = {};
    CATEGORIES.forEach((c) => { none[c.title] = false; });
    setOpenCategories(none);
  };

  const totalFeatures = useMemo(
    () => CATEGORIES.reduce((sum, c) => sum + c.rows.length, 0),
    []
  );

  if (!expanded) {
    return (
      <div style={{
        maxWidth: "1140px",
        margin: "48px auto 0",
        padding: "32px",
        borderRadius: "16px",
        background: cardBg,
        border: `2px dashed ${cardBorder}`,
        textAlign: "center",
      }}>
        <h3 style={{ fontSize: "20px", fontWeight: "700", color: text, margin: "0 0 8px" }}>
          📊 {lang === "EN" ? "Compare all plans side-by-side" : "Compară toate pachetele side-by-side"}
        </h3>
        <p style={{ fontSize: "13px", color: textMuted, margin: "0 0 20px", lineHeight: 1.5 }}>
          {lang === "EN"
            ? `Detailed comparison of ${totalFeatures}+ features across all 6 plans, grouped in 8 categories. See exactly what each plan offers.`
            : `Comparare detaliată a ${totalFeatures}+ funcționalități pe toate cele 6 planuri, grupate în 8 categorii. Vezi exact ce oferă fiecare pachet.`}
        </p>
        <button
          onClick={() => setExpanded(true)}
          style={{
            padding: "12px 28px",
            borderRadius: "10px",
            background: "#f59e0b",
            color: "#000",
            fontSize: "14px",
            fontWeight: "700",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
          }}
        >
          {lang === "EN" ? "Show full comparison →" : "Arată comparația completă →"}
        </button>
      </div>
    );
  }

  // Stiluri tabelă
  const headerBg = isDark ? "rgba(15,23,42,0.95)" : "rgba(248,250,252,0.95)";
  const rowAlt   = isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,0.5)";
  const catBg    = isDark ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.06)";

  return (
    <div style={{
      maxWidth: "1340px",
      margin: "48px auto 0",
      padding: "0",
      borderRadius: "16px",
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      overflow: "hidden",
    }}>
      {/* Header secțiune */}
      <div style={{
        padding: "24px 28px",
        borderBottom: `1px solid ${cardBorder}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", color: text, margin: 0 }}>
            📊 {lang === "EN" ? "Detailed plan comparison" : "Comparație detaliată planuri"}
          </h3>
          <p style={{ fontSize: "12px", color: textFaint, margin: "4px 0 0" }}>
            {lang === "EN"
              ? `${totalFeatures} features in ${CATEGORIES.length} categories`
              : `${totalFeatures} funcționalități în ${CATEGORIES.length} categorii`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={expandAll}
            style={{
              padding: "8px 14px", borderRadius: "8px", background: "transparent",
              color: textMuted, border: `1px solid ${border}`, fontSize: "12px",
              fontWeight: "600", cursor: "pointer",
            }}
          >
            {lang === "EN" ? "Expand all" : "Extinde tot"}
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: "8px 14px", borderRadius: "8px", background: "transparent",
              color: textMuted, border: `1px solid ${border}`, fontSize: "12px",
              fontWeight: "600", cursor: "pointer",
            }}
          >
            {lang === "EN" ? "Collapse all" : "Restrânge tot"}
          </button>
          <button
            onClick={() => setExpanded(false)}
            style={{
              padding: "8px 14px", borderRadius: "8px", background: "transparent",
              color: textFaint, border: `1px solid ${border}`, fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ✕ {lang === "EN" ? "Close" : "Închide"}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "900px",
          fontSize: "13px",
        }}>
          {/* Header sticky cu numele planurilor */}
          <thead style={{ position: "sticky", top: 0, background: headerBg, zIndex: 10 }}>
            <tr>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: "700",
                color: textFaint,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: `2px solid ${cardBorder}`,
                width: "32%",
              }}>
                {lang === "EN" ? "Feature" : "Funcționalitate"}
              </th>
              {COMPARED_PLANS.map((plan) => (
                <th key={plan.id} style={{
                  padding: "16px 8px",
                  textAlign: "center",
                  borderBottom: `2px solid ${plan.highlight ? plan.color : cardBorder}`,
                  borderLeft: `1px solid ${cardBorder}`,
                  background: plan.highlight ? `${plan.color}1a` : "transparent",
                  position: "relative",
                }}>
                  {plan.highlight && (
                    <div style={{
                      position: "absolute", top: "-1px", left: 0, right: 0,
                      fontSize: "9px", fontWeight: "700", color: plan.color,
                      textAlign: "center", lineHeight: "12px",
                    }}>⭐ POPULAR</div>
                  )}
                  <div style={{ fontSize: "12px", fontWeight: "700", color: plan.color }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: "11px", color: textFaint, marginTop: "2px" }}>
                    {plan.price === "0" ? (lang === "EN" ? "Free" : "Gratuit") : `${plan.price} RON`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {CATEGORIES.map((category) => {
              const isOpen = openCategories[category.title];
              return (
                <React.Fragment key={category.title}>
                  {/* Header categorie */}
                  <tr
                    onClick={() => toggleCategory(category.title)}
                    style={{ cursor: "pointer", background: catBg }}
                  >
                    <td colSpan={1 + COMPARED_PLANS.length} style={{
                      padding: "12px 16px",
                      borderTop: `1px solid ${cardBorder}`,
                      borderBottom: `1px solid ${cardBorder}`,
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: text,
                      }}>
                        <span style={{ fontSize: "16px" }}>{category.icon}</span>
                        <span>{category.title}</span>
                        <span style={{ fontSize: "10px", color: textFaint, fontWeight: "500", marginLeft: "auto" }}>
                          {category.rows.length} {lang === "EN" ? "features" : "funcții"}
                        </span>
                        <span style={{ fontSize: "12px", color: textFaint }}>
                          {isOpen ? "▾" : "▸"}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Rândurile categoriei */}
                  {isOpen && category.rows.map((row, idx) => (
                    <tr
                      key={row.key}
                      style={{
                        background: idx % 2 === 0 ? "transparent" : rowAlt,
                      }}
                    >
                      <td style={{
                        padding: "10px 16px",
                        color: textMuted,
                        fontSize: "12px",
                        borderBottom: `1px solid ${cardBorder}`,
                      }}>
                        {row.label}
                      </td>
                      {COMPARED_PLANS.map((plan) => {
                        const features = PLAN_FEATURES[plan.id] || {};
                        const formatted = formatValue(plan.id, features, row);
                        return (
                          <td key={plan.id} style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            borderLeft: `1px solid ${cardBorder}`,
                            borderBottom: `1px solid ${cardBorder}`,
                            background: plan.highlight ? `${plan.color}08` : "transparent",
                          }}>
                            <Cell formatted={formatted} isDark={isDark} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div style={{
        padding: "16px 24px",
        borderTop: `1px solid ${cardBorder}`,
        fontSize: "11px",
        color: textFaint,
        lineHeight: 1.6,
        background: rowAlt,
      }}>
        {lang === "EN"
          ? "All paid plans include AI Pack and unlimited cloud retention. Differentiation is via legal MDLPA grade (IIci vs Ici), Step 7 audit, Step 8 advanced modules, monthly audit count, and team functions. Features marked ✓ are included; features marked ✕ are not available in that plan."
          : "Toate planurile plătite includ AI Pack și cloud retention nelimitat. Diferențierea se face prin grad legal MDLPA (IIci vs Ici), Step 7 audit, Step 8 module avansate, număr audituri/lună și funcții de echipă. ✓ = inclus în plan; ✕ = nu este disponibil în acel plan."}
      </div>
    </div>
  );
}
