/**
 * MDLPAPortalSubmit.jsx — UI pentru depunere CPE/RAE/Pașaport via portal API MDLPA
 *
 * Sprint MDLPA Faza 0 (27 apr 2026)
 *
 * SCOP:
 *   Componentă alternativă la `MDLPASubmitPanel` (email-based, Sprint 17).
 *   Folosește noul flow API (`/api/submit-mdlpa`) prin adapter portal.
 *
 * STATUS:
 *   - În MOCK MODE până când API real e publicat (estimat mai-iulie 2026)
 *   - În UI: badge clar „MOCK · simulare" pentru transparență
 *
 * INTEGRARE:
 *   - Folosit în Step 6 (CPE) și Step 7 (RAE) — opt-in alături de butonul email
 *   - Auditorul vede AMBELE opțiuni: „Email MDLPA" (existent) + „Portal API" (nou)
 */

import { useState, useCallback, useEffect } from "react";
import { isMockMode, healthCheck } from "../lib/mdlpa-portal-adapter.js";
import { validateSubmissionPayload } from "../lib/mdlpa-validator.js";

const STATUS_COLORS = {
  idle:      { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.30)", text: "#6366f1", icon: "📤" },
  validating:{ bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", text: "#f59e0b", icon: "🔍" },
  submitting:{ bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", text: "#f59e0b", icon: "⏳" },
  success:   { bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)",  text: "#16a34a", icon: "✅" },
  error:     { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)",  text: "#dc2626", icon: "❌" },
  rejected:  { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.30)",  text: "#dc2626", icon: "🚫" },
};

/**
 * @param {object} props
 * @param {object} props.payload      — payload conform mdlpa-portal-adapter
 * @param {string} props.lang         — "RO" | "EN"
 * @param {string} props.documentLabel — afișaj prietenos (ex: "CPE", "Pașaport Renovare")
 * @param {(result:object)=>void} [props.onSuccess]
 * @param {(error:object)=>void}  [props.onError]
 * @param {boolean} [props.isDark=false]
 */
export default function MDLPAPortalSubmit({
  payload,
  lang = "RO",
  documentLabel = "document",
  onSuccess,
  onError,
  isDark = false,
}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [validationIssues, setValidationIssues] = useState({ errors: [], warnings: [] });
  const [portalHealth, setPortalHealth] = useState(null);
  const mockMode = isMockMode();

  // Health check inițial (afișează status portal)
  useEffect(() => {
    let alive = true;
    healthCheck().then(h => {
      if (alive) setPortalHealth(h);
    });
    return () => { alive = false; };
  }, []);

  // Validare reactivă a payload-ului
  useEffect(() => {
    if (!payload) {
      setValidationIssues({ errors: [], warnings: [] });
      return;
    }
    const v = validateSubmissionPayload(payload);
    setValidationIssues({ errors: v.errors, warnings: v.warnings });
  }, [payload]);

  const handleSubmit = useCallback(async () => {
    if (!payload) {
      setStatus("error");
      setMessage(lang === "EN" ? "No payload to submit" : "Niciun payload de trimis");
      return;
    }

    setStatus("validating");
    setMessage(lang === "EN" ? "Validating payload..." : "Validare payload...");

    const v = validateSubmissionPayload(payload);
    if (!v.valid) {
      setStatus("error");
      setMessage(lang === "EN"
        ? `${v.errors.length} validation errors — fix before submitting.`
        : `${v.errors.length} erori de validare — corectează înainte de trimitere.`);
      onError?.({ stage: "validation", errors: v.errors });
      return;
    }

    setStatus("submitting");
    setMessage(lang === "EN"
      ? `Submitting to MDLPA portal${mockMode ? " (mock)" : ""}...`
      : `Trimitere la portal MDLPA${mockMode ? " (mock)" : ""}...`);

    try {
      const res = await fetch("/api/submit-mdlpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok && data.status === "success") {
        setStatus("success");
        setResult(data);
        setMessage(lang === "EN"
          ? `${documentLabel} submitted successfully. Reference: ${data.reference_id}`
          : `${documentLabel} depus cu succes. Referință: ${data.reference_id}`);
        onSuccess?.(data);
      } else {
        setStatus(data.error_code === "PORTAL_VALIDATION_ERROR" ? "rejected" : "error");
        setMessage(data.hint || data.error_message || (lang === "EN" ? "Submission failed" : "Depunere eșuată"));
        onError?.({ stage: "submit", ...data });
      }
    } catch (e) {
      setStatus("error");
      setMessage(lang === "EN"
        ? `Network error: ${e.message}`
        : `Eroare rețea: ${e.message}`);
      onError?.({ stage: "network", message: e.message });
    }
  }, [payload, lang, documentLabel, mockMode, onSuccess, onError]);

  const colors = STATUS_COLORS[status] || STATUS_COLORS.idle;
  const hasErrors = validationIssues.errors.length > 0;
  const hasWarnings = validationIssues.warnings.length > 0;

  return (
    <div style={{
      padding: "16px",
      borderRadius: "12px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: isDark ? "#e2e8f0" : "#0f172a",
    }}>
      {/* Header cu mock badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "20px" }}>{colors.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: colors.text }}>
            {lang === "EN" ? "MDLPA Portal Submit" : "Depunere portal MDLPA"}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.7 }}>
            {lang === "EN"
              ? "Direct API submission (Ord. 348/2026)"
              : "Depunere directă prin API (Ord. 348/2026)"}
          </div>
        </div>
        {mockMode && (
          <span style={{
            padding: "2px 8px",
            borderRadius: "8px",
            background: "#f59e0b",
            color: "#000",
            fontSize: "10px",
            fontWeight: "700",
          }}>
            MOCK · SIMULARE
          </span>
        )}
      </div>

      {/* Status portal (health) */}
      {portalHealth && (
        <div style={{ fontSize: "11px", marginBottom: "10px", opacity: 0.75 }}>
          {portalHealth.up ? "🟢" : "🔴"}{" "}
          {lang === "EN" ? "Portal" : "Portal"}: {portalHealth.up ? (lang === "EN" ? "online" : "online") : (lang === "EN" ? "offline" : "indisponibil")}
          {" · "}{portalHealth.latency_ms}ms
          {portalHealth.mode && ` · ${portalHealth.mode}`}
        </div>
      )}

      {/* Validation summary */}
      {hasErrors && (
        <div style={{
          padding: "10px 12px",
          borderRadius: "8px",
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.30)",
          marginBottom: "10px",
          fontSize: "12px",
        }}>
          <strong style={{ color: "#dc2626" }}>
            {lang === "EN" ? "Validation errors:" : "Erori de validare:"}
          </strong>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            {validationIssues.errors.slice(0, 5).map((e, i) => (
              <li key={i} style={{ marginBottom: "2px" }}>
                <code style={{ fontSize: "10px" }}>{e.field}</code> — {e.message}
              </li>
            ))}
            {validationIssues.errors.length > 5 && (
              <li style={{ opacity: 0.6 }}>+{validationIssues.errors.length - 5} {lang === "EN" ? "more" : "altele"}</li>
            )}
          </ul>
        </div>
      )}
      {!hasErrors && hasWarnings && (
        <div style={{ fontSize: "11px", marginBottom: "10px", color: "#f59e0b", opacity: 0.85 }}>
          ⚠️ {validationIssues.warnings.length} {lang === "EN" ? "warning(s) — review before submit." : "avertisment(e) — verifică înainte de trimitere."}
        </div>
      )}

      {/* Status message */}
      {message && (
        <div style={{ fontSize: "12px", marginBottom: "12px", lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      {/* Result links */}
      {result && result.registry_url && (
        <div style={{ fontSize: "11px", marginBottom: "12px" }}>
          🔗 <a href={result.registry_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.text }}>
            {lang === "EN" ? "View in MDLPA registry" : "Vezi în registrul MDLPA"}
          </a>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={status === "validating" || status === "submitting" || hasErrors || !payload}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          background: hasErrors || !payload ? "rgba(100,116,139,0.30)" : colors.text,
          color: "#fff",
          fontSize: "13px",
          fontWeight: "700",
          cursor: (hasErrors || !payload || status === "submitting") ? "not-allowed" : "pointer",
          opacity: (status === "submitting" || hasErrors) ? 0.7 : 1,
        }}
      >
        {status === "submitting"
          ? (lang === "EN" ? "Submitting..." : "Se trimite...")
          : status === "success"
            ? (lang === "EN" ? "Submitted ✓" : "Trimis ✓")
            : (lang === "EN" ? `Submit ${documentLabel} to portal` : `Trimite ${documentLabel} la portal`)
        }
      </button>

      {/* Footer info */}
      <div style={{ fontSize: "10px", marginTop: "10px", opacity: 0.6, lineHeight: 1.5 }}>
        {mockMode
          ? (lang === "EN"
              ? "ⓘ Mock mode — real API will be activated when MDLPA publishes the portal API specification (~July 2026)."
              : "ⓘ Mod simulare — API-ul real va fi activat când MDLPA publică specificațiile portalului (~iulie 2026).")
          : (lang === "EN"
              ? "ⓘ Live mode — submissions go directly to the official MDLPA portal."
              : "ⓘ Mod live — depunerile merg direct la portalul oficial MDLPA.")
        }
      </div>
    </div>
  );
}
