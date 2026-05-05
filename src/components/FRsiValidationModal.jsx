/**
 * FRsiValidationModal.jsx — Sprint G4
 * Modal blocant care apare la export CPE când există punți cu fRsi < prag.
 * Permite override cu motivație scrisă obligatorie.
 */
import { useState, useMemo } from "react";
import { suggestOverrideRationale } from "../calc/fRsi-validation.js";

const SEV_COLOR = {
  E: { bg: "rgba(220,38,38,0.12)", fg: "#fca5a5", border: "rgba(220,38,38,0.4)", label: "CRITIC" },
  D: { bg: "rgba(234,88,12,0.12)", fg: "#fdba74", border: "rgba(234,88,12,0.4)", label: "Major" },
  C: { bg: "rgba(245,158,11,0.12)", fg: "#fbbf24", border: "rgba(245,158,11,0.4)", label: "Atenție" },
  B: { bg: "rgba(132,204,22,0.10)", fg: "#bef264", border: "rgba(132,204,22,0.3)", label: "Acceptabil" },
  A: { bg: "rgba(34,197,94,0.10)", fg: "#86efac", border: "rgba(34,197,94,0.3)", label: "Excelent" },
};

export default function FRsiValidationModal({
  open,
  validation,
  onCancel,
  onConfirmOverride,
}) {
  const [accepted, setAccepted] = useState(false);
  const [rationale, setRationale] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);

  const suggestion = useMemo(() => suggestOverrideRationale(validation?.problems || []), [validation]);

  if (!open || !validation) return null;
  const { critical = [], warning = [], threshold = 0.75, missingMetadata = [] } = validation;
  const hasCritical = critical.length > 0;
  const minRationaleLen = hasCritical ? 80 : 40;
  const canSubmit = accepted && rationale.trim().length >= minRationaleLen;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(2,6,23,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)", maxHeight: "92vh", overflow: "auto",
          background: "#0f172a", border: "1px solid rgba(220,38,38,0.4)",
          borderRadius: 16, color: "#e5e7eb",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: hasCritical ? "#fca5a5" : "#fbbf24" }}>
              {hasCritical ? "🛑 Export CPE blocat — risc condens sever" : "⚠️ Verificare condens superficial"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
              SR EN ISO 13788:2012 §6 · Mc 001-2022 §11.5 · prag fRsi ≥ {threshold}
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Anulare"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
          >
            ✕ Anulează
          </button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          {hasCritical && (
            <div style={{ background: SEV_COLOR.E.bg, border: `1px solid ${SEV_COLOR.E.border}`, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12, lineHeight: 1.55 }}>
              <strong style={{ color: SEV_COLOR.E.fg }}>{critical.length}</strong> punți au <strong>fRsi &lt; 0,65</strong> — risc <strong>sever</strong> de condens iarnă și mucegai (Stachybotrys, conform WHO 2009). Acceptarea expune auditorul la răspundere civilă în caz de litigiu cu beneficiarul.
            </div>
          )}
          {warning.length > 0 && (
            <div style={{ background: SEV_COLOR.D.bg, border: `1px solid ${SEV_COLOR.D.border}`, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12, lineHeight: 1.55 }}>
              <strong style={{ color: SEV_COLOR.D.fg }}>{warning.length}</strong> punți au fRsi sub pragul {threshold} — necesită motivare în memoriul tehnic.
            </div>
          )}
          {missingMetadata.length > 0 && (
            <div style={{ background: "rgba(100,116,139,0.10)", border: "1px solid rgba(100,116,139,0.3)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 11, lineHeight: 1.5, color: "#94a3b8" }}>
              <strong>Notă:</strong> {missingMetadata.length} punți nu au metadată fRsi în catalog (intrări manuale sau adăugiri custom). Verifică separat condensarea.
            </div>
          )}

          <div style={{ marginTop: 14, marginBottom: 6, fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>Detalii punți problematice</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {[...critical, ...warning].map((p, i) => {
              const c = SEV_COLOR[p.classification] || SEV_COLOR.D;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>
                      Clasă {c.label} · gap {p.gap.toFixed(3)} sub prag
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.fg }}>fRsi = {Number(p.fRsi).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 12, lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ marginTop: 3, accentColor: "#f59e0b" }}
              />
              <span>
                Am informat beneficiarul despre riscul de condens superficial pe punțile listate și asum responsabilitatea profesională pentru emiterea CPE-ului. CPE-ul va include watermark <strong>„fRsi sub prag — vezi memoriu tehnic"</strong> în Anexa 2.
              </span>
            </label>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, opacity: 0.65 }}>Motivare obligatorie ({rationale.trim().length} / {minRationaleLen} caractere min.)</span>
                {suggestion && !showSuggestion && (
                  <button
                    onClick={() => { setRationale(suggestion); setShowSuggestion(true); }}
                    style={{ background: "transparent", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}
                  >
                    Aplică șablon sugerat
                  </button>
                )}
              </div>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                placeholder="Ex: tipologia constructivă vernaculară, monument istoric, climat interior controlat HR ≤ 50%, plan de remediere etc."
                style={{
                  width: "100%", padding: 10, fontSize: 12, lineHeight: 1.5,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#e5e7eb", outline: "none", resize: "vertical",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 12 }}
          >
            Revenire la editare anvelopă
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onConfirmOverride({ accepted, rationale: rationale.trim(), problems: [...critical, ...warning] })}
            style={{
              background: canSubmit ? "#dc2626" : "rgba(220,38,38,0.25)",
              border: "1px solid " + (canSubmit ? "#b91c1c" : "rgba(220,38,38,0.3)"),
              color: canSubmit ? "#fff" : "rgba(255,255,255,0.4)",
              borderRadius: 8, padding: "9px 16px",
              cursor: canSubmit ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600,
            }}
          >
            Continuă export cu override
          </button>
        </div>
      </div>
    </div>
  );
}
