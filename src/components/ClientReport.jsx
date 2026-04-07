/**
 * ClientReport — pagină read-only pentru clienți
 * Afișează rezultatele certificării fără acces la datele de intrare.
 * Activat prin URL ?view=<base64>
 */

const CLASS_COLORS = {
  "A+": "#00A550", "A": "#4CB848", "B": "#BDD630",
  "C": "#FFF200", "D": "#FDB913", "E": "#F37021",
  "F": "#ED1C24", "G": "#B31217",
};
const CLASS_TEXT_DARK = ["C", "B"];

const UTILITY_LABELS = {
  qfH: "Încălzire", qfW: "ACM", qfC: "Răcire",
  qfV: "Ventilare", qfL: "Iluminat",
};
const UTILITY_COLORS = {
  qfH: "#ef4444", qfW: "#f97316", qfC: "#3b82f6",
  qfV: "#8b5cf6", qfL: "#eab308",
};

function ClassBadge({ label, size = "lg" }) {
  const bg = CLASS_COLORS[label] || "#888";
  const textDark = CLASS_TEXT_DARK.includes(label);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: bg, color: textDark ? "#333" : "#fff",
      fontWeight: 900, borderRadius: size === "lg" ? "12px" : "6px",
      fontSize: size === "lg" ? "42px" : "16px",
      width: size === "lg" ? "90px" : "40px",
      height: size === "lg" ? "90px" : "40px",
      boxShadow: `0 4px 20px ${bg}66`,
    }}>
      {label || "—"}
    </div>
  );
}

export default function ClientReport({ data, onOpenApp }) {
  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#e2e8f0" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>Link invalid sau expirat</div>
          <button onClick={onOpenApp} style={{ marginTop: "24px", padding: "12px 32px", borderRadius: "10px", background: "#f59e0b", color: "#000", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "14px" }}>
            Deschide Zephren →
          </button>
        </div>
      </div>
    );
  }

  const { b, s, r, ec, cc } = data;
  const epFinal = r?.ep ?? s?.ep ?? null;
  const co2Final = r?.co2 ?? s?.co2 ?? null;
  const rer = r?.rer ?? null;
  const adresa = [b?.addr, b?.city].filter(Boolean).join(", ") || "Clădire necunoscută";

  const utilities = s ? Object.entries(UTILITY_LABELS).map(([key, label]) => ({
    label, value: s[key] || 0, color: UTILITY_COLORS[key],
  })) : [];
  const totalQf = utilities.reduce((acc, u) => acc + u.value, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", fontFamily: "DM Sans, system-ui, sans-serif", color: "#e2e8f0", padding: "0 0 60px 0" }}>
      {/* Header */}
      <div style={{ background: "rgba(10,10,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.svg" alt="Zephren" style={{ height: "34px", width: "auto" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", fontWeight: "600" }}>
              🔒 Vizualizare
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Titlu */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", opacity: 0.4, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Certificat de performanță energetică
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0 }}>{adresa}</h1>
          {b?.year && <div style={{ fontSize: "13px", opacity: 0.5, marginTop: "4px" }}>An construcție: {b.year} · Au: {b.au} m²</div>}
        </div>

        {/* Clasă energetică */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "24px" }}>
          <ClassBadge label={ec} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", opacity: 0.4, textTransform: "uppercase", letterSpacing: "1px" }}>Clasă energetică</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: CLASS_COLORS[ec] || "#fff" }}>{ec || "—"}</div>
            {epFinal !== null && (
              <div style={{ fontSize: "14px", opacity: 0.7, marginTop: "4px" }}>
                {epFinal.toFixed(1)} kWh/m²·an energie primară
              </div>
            )}
          </div>
          {cc && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", opacity: 0.4, marginBottom: "4px" }}>CO₂</div>
              <ClassBadge label={cc} size="sm" />
            </div>
          )}
        </div>

        {/* Indicatori principali */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Energie primară", value: epFinal !== null ? epFinal.toFixed(1) : "—", unit: "kWh/m²an", color: CLASS_COLORS[ec] },
            { label: "Emisii CO₂", value: co2Final !== null ? co2Final.toFixed(1) : "—", unit: "kg CO₂/m²an", color: "#3b82f6" },
            { label: "Surse regenerabile", value: rer !== null ? (rer * 100).toFixed(1) + "%" : "—", unit: "RER", color: "#10b981" },
          ].map(ind => (
            <div key={ind.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "22px", fontWeight: "900", color: ind.color || "#f59e0b" }}>{ind.value}</div>
              <div style={{ fontSize: "9px", opacity: 0.4, textTransform: "uppercase", marginTop: "2px" }}>{ind.unit}</div>
              <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "4px" }}>{ind.label}</div>
            </div>
          ))}
        </div>

        {/* Defalcare utilități */}
        {utilities.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", opacity: 0.4, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
              Defalcare energie finală
            </div>
            <div style={{ space: "12px" }}>
              {utilities.map(u => (
                <div key={u.label} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "11px", width: "72px", opacity: 0.7 }}>{u.label}</div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: u.color, borderRadius: "4px", width: `${totalQf > 0 ? (u.value / totalQf * 100) : 0}%`, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontSize: "11px", width: "64px", textAlign: "right", opacity: 0.8 }}>{u.value.toFixed(0)} kWh/an</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "11px", opacity: 0.3, marginBottom: "16px" }}>
            Raport generat cu Zephren · Mc 001-2022 · ISO 52000-1/NA:2023
          </div>
          <button onClick={onOpenApp} style={{ padding: "10px 28px", borderRadius: "10px", background: "#f59e0b", color: "#000", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "13px" }}>
            Deschide calculatorul Zephren →
          </button>
        </div>
      </div>
    </div>
  );
}
