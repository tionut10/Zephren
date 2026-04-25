import { useState, useMemo } from "react";
import { cn } from "../components/ui.jsx";
import { sanitizeSvg } from "../lib/sanitize-html.js";
import { nextDocNumber } from "../utils/doc-counter.js";

const pad = (n, w = 3) => String(n).padStart(w, "0");
const isoDate = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const due30 = new Date(today); due30.setDate(due30.getDate() + 30);

const TVA_OPTIONS = [
  { value: "19", label: "19%" },
  { value: "5",  label: "5%" },
  { value: "0",  label: "0%" },
  { value: "S",  label: "Scutit" },
];

// Sprint A Task 7: counter secvențial, fără Math.random (critic pt. e-Factură ANAF)
function autoNr() {
  return nextDocNumber("FV");
}

function defaultLines(building) {
  const Au = parseFloat(building?.areaUseful) || 100;
  return [
    { desc: "Audit energetic clădire — deplasare, măsurători, calcul", qty: "1", unit: "forfetar", pret: String(Math.round(Au * 1.4 + 350)), tva: "19" },
    { desc: "Elaborare Certificat Performanță Energetică (CPE)", qty: "1", unit: "buc", pret: String(Math.round(Au * 0.4 + 100)), tva: "19" },
  ];
}

// ── XML highlight (naiv, fără librărie) ───────────────────────────────────────
function highlightXml(xml) {
  return xml
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(&lt;\/?)([\w:]+)/g, '<span class="text-sky-400">$1$2</span>')
    .replace(/([\w:]+)="([^"]*)"/g, '<span class="text-amber-300">$1</span>=<span class="text-emerald-300">"$2"</span>')
    .replace(/(&lt;!--.*?--&gt;)/gs, '<span class="text-slate-500">$1</span>');
}

// ── Generare XML UBL 2.1 RO-CIUS ──────────────────────────────────────────────
function buildXml({ nr, issueDate, dueDate, furnizor, client, lines }) {
  const sanitize = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cuiFurnizor = furnizor.cui ? (furnizor.cui.startsWith("RO") ? furnizor.cui : `RO${furnizor.cui}`) : "";
  const cuiClient = client.cui ? (client.cui.startsWith("RO") ? client.cui : client.cui) : "";

  let taxableBase = 0, taxAmt = 0;
  const lineItems = lines.map((l, i) => {
    const qty = parseFloat(l.qty) || 0;
    const pret = parseFloat(l.pret) || 0;
    const tvaRate = isNaN(parseInt(l.tva, 10)) ? 0 : parseInt(l.tva, 10);
    const lineExt = +(qty * pret).toFixed(2);
    const lineTax = l.tva === "S" ? 0 : +(lineExt * tvaRate / 100).toFixed(2);
    taxableBase += lineExt;
    taxAmt += lineTax;
    const tvaCode = l.tva === "S" ? "E" : (tvaRate === 0 ? "Z" : "S");
    return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${sanitize(l.unit)}">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RON">${lineExt.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${sanitize(l.desc)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${tvaCode}</cbc:ID>
        <cbc:Percent>${tvaRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="RON">${pret.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  });

  const totalPayable = +(taxableBase + taxAmt).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${sanitize(nr)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${sanitize(furnizor.denumire)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${sanitize(furnizor.adresa)}</cbc:StreetName><cbc:CountrySubentity>RO</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>RO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${sanitize(cuiFurnizor)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${sanitize(furnizor.denumire)}</cbc:RegistrationName><cbc:CompanyID>${sanitize(cuiFurnizor)}</cbc:CompanyID></cac:PartyLegalEntity>
      <cac:Contact><cbc:ElectronicMail>${sanitize(furnizor.email)}</cbc:ElectronicMail></cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${sanitize(client.denumire)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${sanitize(client.adresa)}</cbc:StreetName><cbc:CountrySubentity>RO</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>RO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${sanitize(cuiClient)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${sanitize(client.denumire)}</cbc:RegistrationName><cbc:CompanyID>${sanitize(cuiClient)}</cbc:CompanyID></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount><cbc:ID>${sanitize(furnizor.iban)}</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RON">${taxAmt.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="RON">${taxableBase.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="RON">${taxAmt.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>19</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="RON">${taxableBase.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="RON">${taxableBase.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="RON">${totalPayable.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="RON">${totalPayable.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineItems.join("\n")}
</Invoice>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EFacturaExport({ building, auditor, invoice, onClose }) {
  const [nr, setNr] = useState(invoice?.nr || autoNr());
  const [issueDate, setIssueDate] = useState(isoDate(today));
  const [dueDate, setDueDate] = useState(isoDate(due30));

  const [furnizor, setFurnizor] = useState({
    denumire: auditor?.firma || auditor?.name || "",
    cui: auditor?.cui || "",
    iban: invoice?.iban || "",
    adresa: auditor?.adresa || "",
    email: auditor?.email || "",
  });
  const [client, setClient] = useState({
    denumire: invoice?.clientName || building?.address || "",
    cui: invoice?.clientCUI || "",
    adresa: building?.address || "",
  });
  const [lines, setLines] = useState(invoice?.lines || defaultLines(building));
  const [copied, setCopied] = useState(false);

  const xmlStr = useMemo(() => buildXml({ nr, issueDate, dueDate, furnizor, client, lines }), [nr, issueDate, dueDate, furnizor, client, lines]);

  // Totals
  const totals = useMemo(() => {
    let base = 0, tax = 0;
    lines.forEach(l => {
      const ext = (parseFloat(l.qty) || 0) * (parseFloat(l.pret) || 0);
      const rate = l.tva === "S" ? 0 : (parseInt(l.tva, 10) || 0);
      base += ext;
      tax += ext * rate / 100;
    });
    return { base: +base.toFixed(2), tax: +tax.toFixed(2), total: +(base + tax).toFixed(2) };
  }, [lines]);

  // Validation
  const checks = {
    "Nr. factură completat": !!nr.trim(),
    "CUI furnizor completat": !!furnizor.cui.trim(),
    "CUI/CNP client completat": !!client.cui.trim(),
    "Cel puțin o linie de factură": lines.length > 0,
    "Total > 0 RON": totals.total > 0,
  };
  const allValid = Object.values(checks).every(Boolean);

  function updateLine(i, field, val) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }
  function addLine() {
    setLines(prev => [...prev, { desc: "", qty: "1", unit: "buc", pret: "0", tva: "19" }]);
  }
  function removeLine(i) {
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function downloadXml() {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + xmlStr], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${nr || "efactura"}.xml`; a.click();
    URL.revokeObjectURL(url);
  }

  function copyXml() {
    navigator.clipboard.writeText(xmlStr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all";
  const lbl = "block text-xs opacity-50 mb-0.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#13161f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🧾</span>
            <div>
              <h2 className="font-semibold text-base text-white">Export e-Factură ANAF</h2>
              <p className="text-xs opacity-40">Format UBL 2.1 · RO-CIUS · B2B obligatoriu 2024</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", allValid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-300")}>
              {allValid ? "✓ Valid" : `${Object.values(checks).filter(Boolean).length}/${Object.keys(checks).length} câmpuri`}
            </span>
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity text-xl leading-none px-1">×</button>
          </div>
        </div>

        {/* Body: form | xml */}
        <div className="flex-1 overflow-hidden flex">

          {/* ── FORM (stânga) ── */}
          <div className="w-[52%] overflow-y-auto p-4 space-y-4 border-r border-white/10" style={{ scrollbarWidth: "thin" }}>

            {/* Header factură */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">Antet factură</h3>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={lbl}>Nr. factură</label>
                  <input className={inp} value={nr} onChange={e => setNr(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Data emitere</label>
                  <input type="date" className={inp} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Data scadentă</label>
                  <input type="date" className={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Furnizor */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Furnizor (auditor)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={lbl}>Denumire firmă</label>
                  <input className={inp} value={furnizor.denumire} onChange={e => setFurnizor(f => ({ ...f, denumire: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>CUI (ex: RO12345678)</label>
                  <input className={cn(inp, !furnizor.cui && "border-amber-500/40")} value={furnizor.cui} onChange={e => setFurnizor(f => ({ ...f, cui: e.target.value }))} placeholder="RO..." />
                </div>
                <div>
                  <label className={lbl}>IBAN</label>
                  <input className={inp} value={furnizor.iban} onChange={e => setFurnizor(f => ({ ...f, iban: e.target.value }))} placeholder="RO49AAAA..." />
                </div>
                <div>
                  <label className={lbl}>Adresă</label>
                  <input className={inp} value={furnizor.adresa} onChange={e => setFurnizor(f => ({ ...f, adresa: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input className={inp} value={furnizor.email} onChange={e => setFurnizor(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
            </section>

            {/* Client */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Client (beneficiar)</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={lbl}>Denumire / Nume</label>
                  <input className={inp} value={client.denumire} onChange={e => setClient(c => ({ ...c, denumire: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>CUI / CNP</label>
                  <input className={cn(inp, !client.cui && "border-amber-500/40")} value={client.cui} onChange={e => setClient(c => ({ ...c, cui: e.target.value }))} placeholder="CUI sau CNP" />
                </div>
                <div>
                  <label className={lbl}>Adresă</label>
                  <input className={inp} value={client.adresa} onChange={e => setClient(c => ({ ...c, adresa: e.target.value }))} />
                </div>
              </div>
            </section>

            {/* Linii */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400">Linii factură</h3>
                <button onClick={addLine} className="text-xs px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors">+ Adaugă linie</button>
              </div>
              <div className="space-y-1.5">
                {lines.map((l, i) => (
                  <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input className={cn(inp, "flex-1")} value={l.desc} onChange={e => updateLine(i, "desc", e.target.value)} placeholder="Descriere serviciu..." />
                      <button onClick={() => removeLine(i)} className="text-red-400/60 hover:text-red-400 transition-colors px-1.5 text-lg leading-none">×</button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div>
                        <label className={lbl}>Cant.</label>
                        <input type="number" min="0" className={inp} value={l.qty} onChange={e => updateLine(i, "qty", e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>U.M.</label>
                        <input className={inp} value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Preț/U (RON)</label>
                        <input type="number" min="0" className={inp} value={l.pret} onChange={e => updateLine(i, "pret", e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>TVA</label>
                        <select className={inp} value={l.tva} onChange={e => updateLine(i, "tva", e.target.value)}>
                          {TVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="text-right text-xs opacity-50">
                      Subtotal: {((parseFloat(l.qty) || 0) * (parseFloat(l.pret) || 0)).toFixed(2)} RON (fără TVA)
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 bg-white/3 border border-white/8 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between opacity-60"><span>Bază impozabilă</span><span>{totals.base.toFixed(2)} RON</span></div>
                <div className="flex justify-between opacity-60"><span>TVA total</span><span>{totals.tax.toFixed(2)} RON</span></div>
                <div className="flex justify-between font-semibold text-amber-300 border-t border-white/10 pt-1 mt-1"><span>TOTAL de plată</span><span>{totals.total.toFixed(2)} RON</span></div>
              </div>
            </section>

            {/* Validare */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-2">Validare câmpuri obligatorii</h3>
              <div className="space-y-1">
                {Object.entries(checks).map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={ok ? "text-emerald-400" : "text-amber-400"}>{ok ? "✓" : "○"}</span>
                    <span className={ok ? "opacity-60" : "opacity-80"}>{label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── XML PREVIEW (dreapta) ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/2">
              <span className="text-xs opacity-40 font-mono">XML UBL 2.1 · RO-CIUS preview</span>
              <div className="flex gap-2">
                <button onClick={copyXml} className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all font-medium", copied ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/70")}>
                  {copied ? "✓ Copiat!" : "Copiază XML"}
                </button>
                <button onClick={downloadXml} disabled={!allValid} className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-all", allValid ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-white/5 text-white/20 cursor-not-allowed")}>
                  ↓ Descarcă .xml
                </button>
              </div>
            </div>
            <pre
              className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed font-mono text-slate-300 bg-[#0e1018]"
              style={{ scrollbarWidth: "thin" }}
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(highlightXml(xmlStr)) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
