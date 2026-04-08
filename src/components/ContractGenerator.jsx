import { useState } from "react";
import { cn } from "./ui.jsx";

const YEAR = new Date().getFullYear();
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TODAY_RO = new Date().toLocaleDateString("ro-RO", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

function makeContractNr() {
  return `CS-${YEAR}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

const OBIECTE = [
  { value: "audit", label: "Audit energetic clădire" },
  { value: "cpe", label: "Certificat Performanță Energetică (CPE)" },
  { value: "audit_cpe", label: "Audit energetic + CPE" },
  { value: "audit_cpe_raport", label: "Audit energetic + CPE + Raport complet" },
];

function Field({ label, children, className = "" }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";

export default function ContractGenerator({ building, auditor, onClose }) {
  const [nr, setNr] = useState(makeContractNr);
  const [dataContract, setDataContract] = useState(TODAY_ISO);
  const [benefDenumire, setBenefDenumire] = useState("");
  const [benefAdresa, setBenefAdresa] = useState(building?.address || "");
  const [benefCui, setBenefCui] = useState("");
  const [obiect, setObiect] = useState("audit_cpe");
  const [valoare, setValoare] = useState("");
  const [termen, setTermen] = useState("30");
  const [gdpr, setGdpr] = useState(true);
  const [copied, setCopied] = useState(false);

  const prestatorNume = auditor?.firma || auditor?.name || "—";
  const prestatorCert = auditor?.certNr ? `Cert. nr. ${auditor.certNr}` : "";
  const prestatorContact = [auditor?.phone, auditor?.email].filter(Boolean).join(" | ");
  const obiectLabel = OBIECTE.find((o) => o.value === obiect)?.label || "";
  const valoareNum = parseFloat(valoare) || 0;
  const tva = +(valoareNum * 0.19).toFixed(2);
  const totalTva = +(valoareNum + tva).toFixed(2);
  const dataRo = dataContract
    ? new Date(dataContract).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : TODAY_RO;

  /* ── PDF export ── */
  async function handleExportPDF() {
    let jsPDF;
    try {
      ({ default: jsPDF } = await import("jspdf"));
    } catch {
      alert("jsPDF nu este instalat. Adaugă 'jspdf' în package.json.");
      return;
    }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const L = 20, R = 190, W = R - L;
    let y = 20;

    const line = (txt, size = 10, bold = false, align = "left") => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const x = align === "center" ? 105 : align === "right" ? R : L;
      doc.text(txt, x, y, { align });
    };
    const br = (n = 6) => { y += n; };
    const rule = () => { doc.setDrawColor(180); doc.line(L, y, R, y); br(5); };

    // Header
    line("CONTRACT DE PRESTĂRI SERVICII", 14, true, "center"); br(7);
    line(`Nr. ${nr} din data de ${dataRo}`, 11, false, "center"); br(10);
    rule();

    // Art. 1 – Părțile
    line("Art. 1 – Părțile contractante", 11, true); br(6);
    line("1.1 PRESTATOR:", 10, true); br(5);
    line(`Denumire: ${prestatorNume}`, 10); br(5);
    if (prestatorCert) { line(prestatorCert, 10); br(5); }
    if (prestatorContact) { line(`Contact: ${prestatorContact}`, 10); br(5); }
    br(2);
    line("1.2 BENEFICIAR:", 10, true); br(5);
    line(`Denumire: ${benefDenumire || "—"}`, 10); br(5);
    line(`Adresă: ${benefAdresa || "—"}`, 10); br(5);
    line(`CUI/CNP: ${benefCui || "—"}`, 10); br(8);
    rule();

    // Art. 2 – Obiect
    line("Art. 2 – Obiectul contractului", 11, true); br(6);
    const obiectLines = doc.splitTextToSize(
      `Prestatorul se obligă să execute serviciul: ${obiectLabel}, pentru imobilul situat la adresa: ${building?.address || benefAdresa || "—"}.`,
      W
    );
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(obiectLines, L, y); y += obiectLines.length * 5 + 5;
    rule();

    // Art. 3 – Valoare
    line("Art. 3 – Valoarea contractului și modalități de plată", 11, true); br(6);
    line(`Valoare fără TVA: ${valoareNum.toFixed(2)} RON`, 10); br(5);
    line(`TVA 19%: ${tva.toFixed(2)} RON`, 10); br(5);
    line(`Total de plată: ${totalTva.toFixed(2)} RON`, 10, true); br(5);
    line("Plata se va efectua în termen de 15 zile de la livrarea serviciului, prin virament bancar.", 10); br(8);
    rule();

    // Art. 4 – Termen
    line("Art. 4 – Termenul de execuție", 11, true); br(6);
    line(`Prestatorul se obligă să finalizeze și să predea lucrarea în termen de ${termen} zile calendaristice`, 10); br(5);
    line("de la data semnării prezentului contract și a recepționării datelor necesare.", 10); br(8);
    rule();

    // Art. 5 – Obligații
    line("Art. 5 – Obligațiile părților", 11, true); br(6);
    line("5.1 Obligațiile Prestatorului:", 10, true); br(5);
    const oblPrest = [
      "• Să execute serviciile cu profesionalism, conform reglementărilor tehnice în vigoare.",
      "• Să predea documentația completă la termenul convenit.",
      "• Să respecte confidențialitatea datelor beneficiarului.",
    ];
    oblPrest.forEach((t) => { line(t, 10); br(5); });
    br(2);
    line("5.2 Obligațiile Beneficiarului:", 10, true); br(5);
    const oblBenef = [
      "• Să furnizeze documentele și accesul necesar pentru executarea serviciilor.",
      "• Să achite contravaloarea serviciilor la termenul stabilit.",
      "• Să notifice prestatorul cu privire la orice modificare relevantă a imobilului.",
    ];
    oblBenef.forEach((t) => { line(t, 10); br(5); });
    br(3);
    rule();

    // Art. 6 – GDPR (opțional)
    if (gdpr) {
      line("Art. 6 – Protecția datelor cu caracter personal (GDPR)", 11, true); br(6);
      const gdprText = doc.splitTextToSize(
        "Prestatorul va procesa datele personale ale beneficiarului exclusiv în scopul executării prezentului contract, " +
        "în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și legislația națională aplicabilă. " +
        "Datele nu vor fi transmise terților fără consimțământul explicit al beneficiarului.",
        W
      );
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(gdprText, L, y); y += gdprText.length * 5 + 8;
      rule();
    }

    // Art. 7 (sau 6 fără GDPR) – Dispoziții finale
    const artFinal = gdpr ? "Art. 7" : "Art. 6";
    line(`${artFinal} – Dispoziții finale`, 11, true); br(6);
    line("Prezentul contract este guvernat de legislația română în vigoare.", 10); br(5);
    line("Orice litigiu se va soluționa pe cale amiabilă, iar în caz contrar, prin instanțele competente.", 10); br(5);
    line("Contractul a fost încheiat în 2 (două) exemplare originale, câte unul pentru fiecare parte.", 10); br(12);
    rule();

    // Semnături
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("PRESTATOR", L + 20, y, { align: "center" });
    doc.text("BENEFICIAR", R - 20, y, { align: "center" });
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.text(prestatorNume, L + 20, y, { align: "center" });
    doc.text(benefDenumire || "—", R - 20, y, { align: "center" });
    y += 8;
    doc.text("Semnătură: _______________", L + 20, y, { align: "center" });
    doc.text("Semnătură: _______________", R - 20, y, { align: "center" });
    y += 8;
    doc.text("Data: ___________________", L + 20, y, { align: "center" });
    doc.text("Data: ___________________", R - 20, y, { align: "center" });

    doc.save(`Contract_${nr}.pdf`);
  }

  /* ── Clipboard copy ── */
  function handleCopy() {
    const text = [
      `Contract nr. ${nr} din ${dataRo}`,
      `Prestator: ${prestatorNume}`,
      `Beneficiar: ${benefDenumire || "—"} (CUI/CNP: ${benefCui || "—"})`,
      `Obiect: ${obiectLabel}`,
      `Valoare totală (cu TVA): ${totalTva.toFixed(2)} RON`,
      `Termen livrare: ${termen} zile`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f1120] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Contract de Prestări Servicii</h2>
            <p className="text-xs text-white/40 mt-0.5">Generare contract auto-completat</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5" style={{ scrollbarWidth: "thin" }}>
          {/* Identificare contract */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Identificare contract</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nr. contract">
                <input className={inputCls} value={nr} onChange={(e) => setNr(e.target.value)} />
              </Field>
              <Field label="Data contract">
                <input type="date" className={inputCls} value={dataContract} onChange={(e) => setDataContract(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Prestator */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400/80 mb-3">Prestator</h3>
            <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm text-white font-medium">{prestatorNume}</p>
              {prestatorCert && <p className="text-xs text-white/50">{prestatorCert}</p>}
              {prestatorContact && <p className="text-xs text-white/50">{prestatorContact}</p>}
              {!auditor && <p className="text-xs text-amber-400/70">Completați datele auditorului în setări.</p>}
            </div>
          </section>

          {/* Beneficiar */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400/80 mb-3">Beneficiar</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Denumire / Nume" className="col-span-2">
                <input className={inputCls} placeholder="S.C. Exemplu S.R.L." value={benefDenumire} onChange={(e) => setBenefDenumire(e.target.value)} />
              </Field>
              <Field label="Adresă" className="col-span-2">
                <input className={inputCls} placeholder="Str. …, nr. …, oraș, județ" value={benefAdresa} onChange={(e) => setBenefAdresa(e.target.value)} />
              </Field>
              <Field label="CUI / CNP">
                <input className={inputCls} placeholder="RO12345678" value={benefCui} onChange={(e) => setBenefCui(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Obiect & Valoare */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Obiect și valoare</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Obiect contract" className="col-span-2">
                <select
                  className={cn(inputCls, "cursor-pointer")}
                  value={obiect}
                  onChange={(e) => setObiect(e.target.value)}
                >
                  {OBIECTE.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#1a1d2e" }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valoare fără TVA (RON)">
                <input
                  type="number"
                  min="0"
                  step="10"
                  className={inputCls}
                  placeholder="0.00"
                  value={valoare}
                  onChange={(e) => setValoare(e.target.value)}
                />
              </Field>
              <Field label="Total cu TVA 19%">
                <div className={cn(inputCls, "bg-white/3 text-amber-300 font-semibold cursor-default")}>
                  {totalTva > 0 ? `${totalTva.toFixed(2)} RON` : "—"}
                </div>
              </Field>
              <Field label="Termen livrare (zile)">
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={termen}
                  onChange={(e) => setTermen(e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Clauze */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-3">Clauze</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setGdpr(!gdpr)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-colors",
                  gdpr ? "bg-amber-500" : "bg-white/15"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    gdpr ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </div>
              <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                Include clauza GDPR (Regulamentul UE 2016/679)
              </span>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              copied
                ? "border-green-500/50 text-green-400 bg-green-500/10"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {copied
                ? <path d="M20 6L9 17l-5-5" />
                : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>}
            </svg>
            {copied ? "Copiat!" : "Copiază rezumat"}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
            >
              Anulare
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors shadow-lg shadow-amber-500/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
              </svg>
              Exportă PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
