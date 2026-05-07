/**
 * TermsOfService.jsx — Termeni și condiții de utilizare Zephren
 * Sprint 20 (18 apr 2026) — versiune 1.0.
 */
import React from "react";

const SECTION = { marginTop: "24px", marginBottom: "8px" };
const H2 = { fontSize: "18px", fontWeight: "700", marginBottom: "10px" };
const P = { fontSize: "14px", lineHeight: 1.6, marginBottom: "10px" };

export default function TermsOfService({ theme = "dark" }) {
  const dark = theme === "dark";
  const bg = dark ? "#0a0a1a" : "#ffffff";
  const text = dark ? "#e2e8f0" : "#1a202c";
  const muted = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.75)";

  return (
    <div style={{ background: bg, color: text, minHeight: "100vh", padding: "48px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>
          Termeni și condiții — Zephren
        </h1>
        <p style={{ ...P, color: muted, fontStyle: "italic" }}>
          Versiune 1.0 · În vigoare din 18 aprilie 2026.
        </p>

        <div style={SECTION}>
          <h2 style={H2}>1. Furnizorul serviciului</h2>
          <p style={{ ...P, color: muted }}>
            Serviciul Zephren („Serviciul”) este furnizat de <strong>ZEPHREN S.R.L.</strong>,
            sediu social B-dul Libertății, nr. 38, ap. 4, Bușteni, jud. Prahova, România.
            CUI: 54561142 | Nr. Reg. Com.: J2026027529009.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>2. Acceptarea Termenilor</h2>
          <p style={{ ...P, color: muted }}>
            Prin crearea unui cont sau folosirea Serviciului, acceptați acești Termeni
            și Politica de confidențialitate asociată.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>3. Natura serviciului</h2>
          <p style={{ ...P, color: muted }}>
            Zephren este un instrument informatic de calcul a performanței energetice
            a clădirilor, conform Mc 001-2022, Ord. MDLPA 16/2023, EPBD 2024/1275 și
            Legea 238/2024. Rezultatele generate (CPE, raport audit, pașaport de
            renovare) sunt asistenți profesionali — răspunderea finală pentru
            corectitudinea datelor introduse și a interpretării rezultatelor
            aparține auditorului energetic atestat care semnează documentul.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>4. Conturi și abonamente</h2>
          <p style={{ ...P, color: muted }}>
            Serviciul este oferit pe nivele de abonament: Free, Starter, Standard, Pro,
            Business, Asociație. Detalii complete și prețuri se află pe pagina
            principală (zephren.ro). Abonamentele se reînnoiesc automat; anularea este
            posibilă oricând din panoul de administrare Stripe Customer Portal.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>5. Proprietate intelectuală</h2>
          <p style={{ ...P, color: muted }}>
            Codul sursă, designul, logo-ul și algoritmii de calcul sunt proprietatea
            ZEPHREN S.R.L. Utilizatorul primește o licență neexclusivă, netransferabilă,
            pentru utilizare profesională. Datele introduse de utilizator rămân
            proprietatea acestuia.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>6. Limitări de răspundere</h2>
          <p style={{ ...P, color: muted }}>
            Serviciul este oferit „ca atare”. ZEPHREN S.R.L. nu răspunde pentru:
            (a) erori în datele introduse de utilizator, (b) interpretări incorecte
            ale rezultatelor, (c) întreruperi punctuale de serviciu cauzate de
            furnizorii externi (Vercel, Supabase, Stripe, Anthropic). Răspunderea
            maximă totală este limitată la suma achitată în ultimele 12 luni de
            abonament.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>7. Utilizare acceptabilă</h2>
          <p style={{ ...P, color: muted }}>
            Utilizatorul se angajează să nu: (a) folosească Serviciul în scopuri
            ilegale, (b) încerce compromiterea securității, (c) folosească scripturi
            automate pentru apeluri API masive, (d) introducă date de la clienți
            fără consimțământul acestora GDPR.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>8. Încetare</h2>
          <p style={{ ...P, color: muted }}>
            ZEPHREN S.R.L. poate suspenda conturi în caz de încălcare a Termenilor. La
            încetare, datele personale ale utilizatorului vor fi anonimizate sau
            șterse conform Politicii de confidențialitate.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>9. Legea aplicabilă</h2>
          <p style={{ ...P, color: muted }}>
            Prezentul contract este guvernat de legislația română. Orice litigiu se
            soluționează amiabil sau prin instanțele competente din București.
          </p>
        </div>

        <div style={SECTION}>
          <h2 style={H2}>10. Contact</h2>
          <p style={{ ...P, color: muted }}>
            Întrebări juridice: <a href="mailto:legal@zephren.ro" style={{ color: "#f59e0b" }}>legal@zephren.ro</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
