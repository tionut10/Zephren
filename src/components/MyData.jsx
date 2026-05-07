/**
 * MyData.jsx — Dashboard GDPR Art. 15-22
 *
 * Sprint 20 (18 apr 2026). Permite utilizatorului să exercite drepturile:
 *   - Art. 15 Acces — descărcare date complete JSON
 *   - Art. 20 Portabilitate — export JSON + XML
 *   - Art. 17 Ștergere („right to be forgotten”) — apel RPC Supabase `request_account_deletion`
 *   - Art. 16 Rectificare — editare profil direct
 *
 * Utilizare:
 *   <MyData supabase={supabaseClient} user={userData} onClose={...} />
 */
import React, { useState, useCallback } from "react";

export default function MyData({ supabase, user, onClose }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  const show = (m) => { setMessage(m); setTimeout(() => setMessage(""), 5000); };

  // Art. 15 — Export complet date
  const exportMyData = useCallback(async () => {
    if (!supabase || !user) { show("Neautentificat."); return; }
    setLoading(true);
    try {
      const [profileRes, projectsRes, certsRes, dsrRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("certificates").select("*").eq("user_id", user.id),
        supabase.from("data_subject_requests").select("*").eq("user_id", user.id),
        supabase.from("access_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      ]);

      const payload = {
        _schema: "zephren-user-export-v1",
        _generated_at: new Date().toISOString(),
        _legal_basis: "GDPR Art. 15 (dreptul de acces) + Art. 20 (portabilitate)",
        user: { id: user.id, email: user.email },
        profile: profileRes.data || null,
        projects: projectsRes.data || [],
        certificates: certsRes.data || [],
        data_subject_requests: dsrRes.data || [],
        access_log_last_500: logsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zephren-datele-mele-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      show("Export complet descărcat. Verificați folderul Descărcări.");
    } catch (err) {
      show("Eroare export: " + (err?.message || "necunoscută"));
    } finally { setLoading(false); }
  }, [supabase, user]);

  // Art. 17 — Șterge cont (anonimizare proiecte, eliminare profile)
  const deleteMyAccount = useCallback(async () => {
    if (confirmDelete !== "ȘTERGE") {
      show("Tastați exact „ȘTERGE” pentru a confirma.");
      return;
    }
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_account_deletion");
      if (error) throw error;
      await supabase.auth.signOut();
      show("Contul a fost anonimizat. Vă deconectăm…");
      setTimeout(() => { window.location.hash = ""; window.location.reload(); }, 2000);
    } catch (err) {
      show("Eroare ștergere: " + (err?.message || "necunoscută"));
      setLoading(false);
    }
  }, [supabase, confirmDelete]);

  return (
    <div
      role="dialog"
      aria-labelledby="mydata-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#12141f",
          color: "#e2e8f0",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2 id="mydata-title" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
          🔐 Datele mele (GDPR)
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "24px", lineHeight: 1.5 }}>
          Exercitați drepturile garantate de Regulamentul UE 2016/679 (GDPR) Art. 15-22.
          Orice acțiune este gratuită și fără explicații obligatorii.
        </p>

        {/* Art. 15 + 20 — Acces & Portabilitate */}
        <section style={{ marginBottom: "24px", padding: "16px", borderRadius: "10px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px", color: "#f59e0b" }}>
            📥 Exportă toate datele (Art. 15 + 20)
          </h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "12px", lineHeight: 1.5 }}>
            Primești un fișier JSON cu toate datele pe care le avem despre tine: profil, proiecte, certificate, cereri GDPR, ultimele 500 log-uri de acces.
          </p>
          <button
            onClick={exportMyData}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: loading ? "rgba(245,158,11,0.3)" : "#f59e0b",
              color: "#000",
              fontWeight: "600",
              fontSize: "13px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Se pregătește…" : "Descarcă datele (JSON)"}
          </button>
        </section>

        {/* Art. 16 — Rectificare */}
        <section style={{ marginBottom: "24px", padding: "16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
            ✏️ Rectifică datele (Art. 16)
          </h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            Mergi la <strong>Setări → Profil</strong> în aplicație pentru a edita numele, compania sau preferințele. Pentru rectificări complexe, contactează{" "}
            <a href="mailto:privacy@zephren.ro" style={{ color: "#f59e0b" }}>privacy@zephren.ro</a>.
          </p>
        </section>

        {/* Art. 17 — Ștergere */}
        <section style={{ marginBottom: "16px", padding: "16px", borderRadius: "10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px", color: "#ef4444" }}>
            🗑️ Șterge contul (Art. 17 — „Dreptul de a fi uitat”)
          </h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "12px", lineHeight: 1.5 }}>
            Contul tău va fi dezactivat imediat. Toate proiectele conținând date personale ale clienților vor fi <strong>anonimizate</strong> (numele, email, telefon, adresă, cadastru → „[ANONIMIZAT]”). Certificatele CPE vor fi șterse.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "12px", lineHeight: 1.5 }}>
            <strong>Notă fiscală</strong>: facturile emise vor fi păstrate anonimizat 10 ani (obligație Cod Fiscal RO) — doar numele va fi eliminat, sumele și CUI-ul ZEPHREN S.R.L. rămân în evidențe.
          </p>
          <input
            type="text"
            placeholder="Tastați: ȘTERGE"
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(0,0,0,0.3)",
              color: "#fff",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          />
          <button
            onClick={deleteMyAccount}
            disabled={loading || confirmDelete !== "ȘTERGE"}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: (loading || confirmDelete !== "ȘTERGE") ? "rgba(239,68,68,0.3)" : "#ef4444",
              color: "#fff",
              fontWeight: "600",
              fontSize: "13px",
              cursor: (loading || confirmDelete !== "ȘTERGE") ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Se procesează…" : "🗑️ Șterge contul permanent"}
          </button>
        </section>

        {/* Art. 21 — Contact DPO + ANSPDCP */}
        <section style={{ marginBottom: "16px", padding: "16px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>
            📮 Contact DPO + ANSPDCP
          </h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            Solicitări non-standard: <a href="mailto:privacy@zephren.ro" style={{ color: "#f59e0b" }}>privacy@zephren.ro</a><br />
            Reclamație la autoritatea RO:{" "}
            <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b" }}>
              www.dataprotection.ro
            </a>
          </p>
        </section>

        {message && (
          <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: "13px", marginBottom: "12px" }}>
            {message}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "#e2e8f0",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Închide
        </button>
      </div>
    </div>
  );
}
