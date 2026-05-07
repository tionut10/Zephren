/**
 * PrivacyPolicy.jsx — Politica de confidențialitate Zephren
 *
 * Sprint 20 (18 apr 2026) — GDPR compliance.
 * Versiune 1.0 / 18.04.2026.
 *
 * Este afișată la:
 *   - /privacy (rutare hash sau URL)
 *   - link din formularul de înregistrare (consent checkbox)
 *   - link din footer aplicație
 *
 * Orice modificare majoră trebuie să incrementeze `PRIVACY_VERSION` în
 *   `src/config/legalVersions.js` pentru a declanșa reconfirmarea consimțământului.
 */
import React from "react";

const SECTION = { marginTop: "24px", marginBottom: "8px" };
const H2 = { fontSize: "18px", fontWeight: "700", marginBottom: "10px" };
const P = { fontSize: "14px", lineHeight: 1.6, marginBottom: "10px", color: "rgba(0,0,0,0.75)" };

export default function PrivacyPolicy({ theme = "dark" }) {
  const dark = theme === "dark";
  const bg = dark ? "#0a0a1a" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#1a202c";
  const muted = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.75)";

  return (
    <div style={{ background: bg, color: text, minHeight: "100vh", padding: "48px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>
          Politica de confidențialitate — Zephren
        </h1>
        <p style={{ ...P, color: muted, fontStyle: "italic" }}>
          Versiune 1.0 · În vigoare din 18 aprilie 2026.
        </p>

        <div style={SECTION}>
          <h2 style={H2}>1. Operatorul de date</h2>
          <p style={{ ...P, color: muted }}>
            <strong>ZEPHREN S.R.L.</strong>, cu sediul social în B-dul Libertății,
            nr. 38, ap. 4, Bușteni, jud. Prahova, România.
            CUI: 54561142 | Nr. Reg. Com.: J29/2027529009.
            <br />Contact Protecție Date: <a href="mailto:privacy@zephren.ro" style={{ color: "#f59e0b" }}>privacy@zephren.ro</a>.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>2. Categoriile de date prelucrate</h2>
          <p style={{ ...P, color: muted }}>În aplicația Zephren se prelucrează:</p>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li><strong>Date cont auditor</strong>: email, parolă (stocată sub formă de hash bcrypt), nume, companie, preferințe UI.</li>
            <li><strong>Date profesionale auditor</strong>: nr. atestat MDLPA, categoria I/II, imagine semnătură, imagine ștampilă.</li>
            <li><strong>Date client final al auditului</strong> (introduse de auditor cu consimțământul explicit al clientului său): nume, prenume, adresă de email, număr telefon, adresa imobilului, coordonate GPS, număr cadastral, carte funciară, fotografii ale clădirii, facturi de utilități.</li>
            <li><strong>Date de plată</strong>: CUI (pentru B2B România), VAT number (pentru B2B UE), adresă facturare. Datele cardului bancar sunt procesate exclusiv de Stripe și <em>nu sunt stocate</em> de Zephren.</li>
            <li><strong>Date tehnice</strong>: adresa IP, user-agent, log-uri autentificare, pentru securitate și prevenire fraudă.</li>
          </ul>
          <p style={{ ...P, color: muted }}>
            <strong>Zephren NU colectează CNP</strong> prin interfața aplicației. Pentru transmiterea CPE în sistemul MDLPA (dacă este necesar), CNP-ul este inclus ulterior direct de auditor în formularul XML de depunere, fără a fi stocat persistent în baza de date Zephren.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>3. Scopurile prelucrării și temeiurile juridice (Art. 6 GDPR)</h2>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li><strong>Executare contract</strong> (Art. 6(1)(b)) — oferirea serviciului de calcul energetic, generare CPE, raport audit și păstrarea proiectelor.</li>
            <li><strong>Obligație legală</strong> (Art. 6(1)(c)) — arhivare documente fiscale 10 ani (Codul Fiscal RO), transmitere eFactura ANAF, conformitate Mc 001-2022 și Legea 238/2024.</li>
            <li><strong>Consimțământ</strong> (Art. 6(1)(a)) — comunicări marketing opționale, analytics opționale.</li>
            <li><strong>Interes legitim</strong> (Art. 6(1)(f)) — prevenire fraudă, securitatea informației, monitorizare performanță.</li>
          </ul>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>4. Destinatarii (subprocesatori)</h2>
          <p style={{ ...P, color: muted }}>
            Datele sunt transmise către următorii subprocesatori care au semnat (sau urmează să semneze) acorduri de prelucrare date (DPA) conform Art. 28 GDPR:
          </p>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li><strong>Vercel Inc.</strong> (US + regiuni AWS UE) — hosting aplicație și funcții serverless.</li>
            <li><strong>Supabase Inc.</strong> (US + AWS UE configurabil) — autentificare, bază de date PostgreSQL, storage.</li>
            <li><strong>Stripe Payments Europe Ltd.</strong> (Irlanda) — procesare plăți, abonamente, facturare.</li>
            <li><strong>Anthropic Inc.</strong> (California, US) — asistent AI, OCR facturi/CPE, import automat documente. Anthropic nu antrenează modele pe conținutul transmis prin API și șterge datele în maximum 30 zile.</li>
            <li><strong>Microsoft Corp.</strong> (US) — opțional, pentru previzualizare DOCX prin Office Online. Poate fi dezactivat (aplicația folosește alternativ Gotenberg deployat în UE).</li>
            <li><strong>SmartBill (Intelligent IT SRL)</strong> (România) — facturare electronică + transmitere eFactura ANAF.</li>
            <li><strong>Google LLC</strong> (US) — fonturi web, autentificare OAuth opțională.</li>
            <li><strong>PVGIS (Joint Research Centre UE)</strong>, <strong>OpenMeteo</strong> (Germania) — date publice climatice și solare.</li>
          </ul>
          <p style={{ ...P, color: muted }}>
            Transferurile internaționale către entități din afara UE/SEE se realizează în baza clauzelor contractuale standard (SCC) adoptate de Comisia Europeană.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>5. Durata păstrării datelor</h2>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li><strong>Cont auditor activ</strong>: pe durata contractului + 3 ani inactivitate.</li>
            <li><strong>Proiecte audit + CPE</strong>: 10 ani (obligație arhivare profesională), apoi anonimizare (numele, email, telefon, adresă sunt înlocuite cu „[ANONIMIZAT]”).</li>
            <li><strong>Facturi și evidențe fiscale</strong>: 10 ani (Codul Fiscal RO).</li>
            <li><strong>Log-uri acces</strong>: 12 luni.</li>
            <li><strong>Date marketing (consimțământ)</strong>: până la retragerea consimțământului.</li>
          </ul>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>6. Drepturile persoanei vizate (Art. 15-22 GDPR)</h2>
          <p style={{ ...P, color: muted }}>
            Aveți dreptul de:
          </p>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li><strong>Acces</strong> (Art. 15) — obțineți o copie a datelor pe care le avem despre dumneavoastră. Descărcare directă din „Setări → Datele mele” în aplicație.</li>
            <li><strong>Rectificare</strong> (Art. 16) — editați datele incorecte direct din contul dumneavoastră.</li>
            <li><strong>Ștergere / „Dreptul de a fi uitat”</strong> (Art. 17) — solicitați ștergerea contului și anonimizarea datelor din „Setări → Șterge contul”.</li>
            <li><strong>Restricționare prelucrare</strong> (Art. 18) — pe durata soluționării unei contestații.</li>
            <li><strong>Portabilitate</strong> (Art. 20) — export complet în format JSON sau XML.</li>
            <li><strong>Opoziție</strong> (Art. 21) — la prelucrări bazate pe interes legitim sau marketing.</li>
            <li><strong>Reclamație la ANSPDCP</strong> — <a href="https://www.dataprotection.ro" target="_blank" rel="noopener" style={{ color: "#f59e0b" }}>www.dataprotection.ro</a>.</li>
          </ul>
          <p style={{ ...P, color: muted }}>
            Exercitarea drepturilor se face gratuit în termen de maximum 30 de zile de la cerere. Trimiteți solicitarea la <a href="mailto:privacy@zephren.ro" style={{ color: "#f59e0b" }}>privacy@zephren.ro</a>.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>7. Măsuri de securitate</h2>
          <ul style={{ ...P, color: muted, paddingLeft: "24px" }}>
            <li>Transmitere criptată TLS 1.2+ obligatoriu.</li>
            <li>Criptare at-rest pe serverele Supabase (AES-256).</li>
            <li>Row-Level Security (RLS) — utilizatorul poate accesa exclusiv datele proprii.</li>
            <li>Autentificare JWT cu refresh automat.</li>
            <li>Rate limiting și CORS allowlist pe toate endpoint-urile API.</li>
            <li>Content Security Policy (CSP) strict, HSTS, X-Frame-Options DENY.</li>
            <li>Monitorizare anomalii (Sentry) cu alertă în caz de incident de securitate.</li>
          </ul>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>8. Notificare incidente (breach)</h2>
          <p style={{ ...P, color: muted }}>
            În cazul unei breșe de securitate cu risc pentru drepturile dumneavoastră, Zephren notifică ANSPDCP în cel mult 72 de ore (Art. 33 GDPR) și, dacă există risc ridicat, și persoanele vizate afectate (Art. 34 GDPR) prin email.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>9. Minori</h2>
          <p style={{ ...P, color: muted }}>
            Serviciul este destinat exclusiv profesioniștilor (auditori energetici atestați MDLPA sau în curs de atestare). Nu colectăm intenționat date despre minori sub 16 ani.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>10. Modificări ale acestei politici</h2>
          <p style={{ ...P, color: muted }}>
            Orice modificare materială va fi notificată prin email cu minim 14 zile înainte de intrare în vigoare. Continuarea utilizării serviciului după notificare constituie acceptare.
          </p>
        </div>

        <div style={{ ...SECTION, paddingTop: "24px", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
          <p style={{ ...P, color: muted, fontSize: "12px" }}>
            Pentru întrebări juridice: <a href="mailto:privacy@zephren.ro" style={{ color: "#f59e0b" }}>privacy@zephren.ro</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
