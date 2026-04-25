import { useState } from "react";
import { cn, Card } from "./ui.jsx";
import { nextDocNumber } from "../utils/doc-counter.js";

const TODAY = new Date().toLocaleDateString("ro-RO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Sprint A Task 7: counter secvențial, fără Math.random (risc coliziune)
function makeInvoiceNr() {
  return nextDocNumber("AE");
}

function buildDefaultItems(building) {
  const Au = parseFloat(building?.areaUseful) || 100;
  return [
    {
      desc: "Audit energetic la fața locului (deplasare + măsurători)",
      qty: 1,
      unit: "forfetar",
      unitPrice: Math.round(Au * 0.8 + 200),
    },
    {
      desc: "Calcul performanță energetică (EN ISO 13790)",
      qty: 1,
      unit: "forfetar",
      unitPrice: Math.round(Au * 0.6 + 150),
    },
    {
      desc: "Elaborare Certificat Performanță Energetică (CPE)",
      qty: 1,
      unit: "buc",
      unitPrice: Math.round(Au * 0.4 + 100),
    },
    {
      desc: "Raport audit energetic complet",
      qty: 1,
      unit: "forfetar",
      unitPrice: Math.round(Au * 0.3 + 80),
    },
  ];
}

function generatePDF(data) {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 15;
    let y = 20;

    // Titlu
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DEVIZ SERVICII AUDIT ENERGETIC", 105, y, { align: "center" });
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Nr: ${data.invoiceNr}`, 105, y, { align: "center" });
    y += 5;
    doc.text(`Data: ${data.date}`, 105, y, { align: "center" });
    y += 10;

    // Date auditor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PRESTATOR (Auditor energetic):", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (data.auditor?.name)    { doc.text(data.auditor.name,    margin, y); y += 4; }
    if (data.auditor?.code)    { doc.text(`Cod: ${data.auditor.code}`, margin, y); y += 4; }
    if (data.auditor?.address) { doc.text(data.auditor.address, margin, y); y += 4; }
    if (data.auditor?.phone)   { doc.text(`Tel: ${data.auditor.phone}`, margin, y); y += 4; }
    if (data.auditor?.email)   { doc.text(`Email: ${data.auditor.email}`, margin, y); y += 4; }
    y += 4;

    // Date client
    doc.setFont("helvetica", "bold");
    doc.text("BENEFICIAR:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (data.clientName)    { doc.text(data.clientName,    margin, y); y += 4; }
    if (data.clientAddress) { doc.text(data.clientAddress, margin, y); y += 4; }
    y += 6;

    // Header tabel
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Nr.", margin,       y);
    doc.text("Denumire serviciu",  margin + 8,  y);
    doc.text("Cant.",              margin + 110, y);
    doc.text("UM",                 margin + 122, y);
    doc.text("Preț unit.",         margin + 136, y);
    doc.text("Total",              margin + 154, y);
    y += 2;
    doc.line(margin, y, 195, y);
    y += 4;

    // Rânduri tabel
    doc.setFont("helvetica", "normal");
    data.items.forEach((item, i) => {
      const total = (item.qty || 0) * (item.unitPrice || 0);
      const lines = doc.splitTextToSize(item.desc, 100);
      doc.text(String(i + 1),             margin,       y);
      doc.text(lines,                      margin + 8,   y);
      doc.text(String(item.qty),           margin + 110, y);
      doc.text(item.unit,                  margin + 122, y);
      doc.text(`${item.unitPrice} ${data.currency}`, margin + 136, y);
      doc.text(`${total} ${data.currency}`, margin + 154, y);
      y += Math.max(lines.length * 4, 6) + 2;
    });

    y += 2;
    doc.line(margin, y, 195, y);
    y += 6;

    // Totaluri
    const subtotal = data.items.reduce((s, it) => s + (it.qty || 0) * (it.unitPrice || 0), 0);
    const tvaVal   = Math.round(subtotal * data.tva / 100);
    const total    = subtotal + tvaVal;

    doc.setFontSize(9);
    doc.text(`Subtotal:`,           margin + 120, y);
    doc.text(`${subtotal} ${data.currency}`, margin + 154, y);
    y += 5;
    doc.text(`TVA ${data.tva}%:`,   margin + 120, y);
    doc.text(`${tvaVal} ${data.currency}`,  margin + 154, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`TOTAL GENERAL:`,      margin + 120, y);
    doc.text(`${total} ${data.currency}`,   margin + 154, y);
    y += 10;

    // Observații
    if (data.observations) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Observații:", margin, y);
      y += 4;
      const obsLines = doc.splitTextToSize(data.observations, 165);
      doc.text(obsLines, margin, y);
    }

    doc.save(`Deviz_${data.invoiceNr}.pdf`);
  }).catch(() => {
    alert("jsPDF nu este instalat. Adaugă 'jspdf' în package.json.");
  });
}

export default function AuditInvoice({ building, auditor, onClose }) {
  const [items, setItems]               = useState(() => buildDefaultItems(building));
  const [tva, setTva]                   = useState(19);
  const [currency]                      = useState("RON");
  const [invoiceNr]                     = useState(makeInvoiceNr);
  const [clientName, setClientName]     = useState("");
  const [clientAddress, setClientAddress] = useState(
    [building?.address, building?.city].filter(Boolean).join(", ")
  );
  const [observations, setObservations] = useState(
    "Prețul nu include TVA. Valabil 30 zile."
  );

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0), 0);
  const tvaVal   = Math.round(subtotal * tva / 100);
  const total    = subtotal + tvaVal;

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { desc: "", qty: 1, unit: "forfetar", unitPrice: 0 }]);
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCopy = () => {
    const lines = [
      `DEVIZ SERVICII AUDIT ENERGETIC`,
      `Nr: ${invoiceNr}  |  Data: ${TODAY}`,
      ``,
      `Beneficiar: ${clientName || "—"}`,
      `Adresă imobil: ${clientAddress || "—"}`,
      ``,
      ...items.map((it, i) =>
        `${i + 1}. ${it.desc} — ${it.qty} ${it.unit} × ${it.unitPrice} ${currency} = ${(parseFloat(it.qty)||0)*(parseFloat(it.unitPrice)||0)} ${currency}`
      ),
      ``,
      `Subtotal: ${subtotal} ${currency}`,
      `TVA ${tva}%: ${tvaVal} ${currency}`,
      `TOTAL GENERAL: ${total} ${currency}`,
      ``,
      observations,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() =>
      alert("Devizul a fost copiat în clipboard.")
    );
  };

  const handlePDF = () => {
    generatePDF({
      invoiceNr,
      date: TODAY,
      auditor,
      clientName,
      clientAddress,
      items,
      tva,
      currency,
      observations,
    });
  };

  const inputCls =
    "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-full";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">

        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Generator Deviz Audit Energetic</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Închide"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Header factură */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Date auditor */}
            <Card title="Date Prestator (Auditor)">
              <div className="space-y-1 text-sm text-slate-300">
                {auditor?.name    && <div className="font-semibold text-white">{auditor.name}</div>}
                {auditor?.code    && <div className="text-slate-400">Cod auditor: {auditor.code}</div>}
                {auditor?.address && <div>{auditor.address}</div>}
                {auditor?.phone   && <div>Tel: {auditor.phone}</div>}
                {auditor?.email   && <div>{auditor.email}</div>}
                {!auditor?.name && (
                  <p className="text-slate-500 italic text-xs">
                    Completați datele auditorului în setările aplicației.
                  </p>
                )}
              </div>
            </Card>

            {/* Date factură */}
            <Card title="Date Deviz">
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">Număr deviz</label>
                  <div className="text-white font-mono font-semibold">{invoiceNr}</div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">Data emiterii</label>
                  <div className="text-white">{TODAY}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Date client */}
          <Card title="Date Beneficiar">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">
                  Nume beneficiar
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Persoană fizică / juridică..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-400 mb-1 block">
                  Adresă imobil auditat
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  placeholder="Str. ..., nr. ..., oraș"
                  className={inputCls}
                />
              </div>
            </div>
          </Card>

          {/* Tabel servicii */}
          <Card title="Servicii / Lucrări">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2 w-8">Nr</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2">Denumire serviciu</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2 w-16">Cant.</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2 w-24">UM</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2 w-32">Preț unitar ({currency})</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-wider py-2 px-2 w-28">Total ({currency})</th>
                    <th className="w-8"/>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.desc}
                            onChange={e => updateItem(idx, "desc", e.target.value)}
                            className={cn(inputCls, "min-w-[200px]")}
                            placeholder="Descriere serviciu..."
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={e => updateItem(idx, "qty", e.target.value)}
                            min="0"
                            step="0.5"
                            className={cn(inputCls, "text-center")}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => updateItem(idx, "unit", e.target.value)}
                            className={inputCls}
                            placeholder="forfetar"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={e => updateItem(idx, "unitPrice", e.target.value)}
                            min="0"
                            step="10"
                            className={inputCls}
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-white whitespace-nowrap">
                          {rowTotal.toLocaleString("ro-RO")} {currency}
                        </td>
                        <td className="py-2 px-1">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            aria-label="Șterge rând"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adaugă linie
            </button>
          </Card>

          {/* Totaluri */}
          <Card>
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex items-center gap-6">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-white font-medium w-36 text-right">
                  {subtotal.toLocaleString("ro-RO")} {currency}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400 flex items-center gap-2">
                  TVA
                  <input
                    type="number"
                    value={tva}
                    onChange={e => setTva(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white text-center text-xs focus:outline-none"
                  />
                  %:
                </span>
                <span className="text-white font-medium w-36 text-right">
                  {tvaVal.toLocaleString("ro-RO")} {currency}
                </span>
              </div>
              <div className="flex items-center gap-6 border-t border-slate-700 pt-2 mt-1">
                <span className="text-white font-bold text-base">Total general:</span>
                <span className="text-amber-400 font-bold text-xl w-36 text-right">
                  {total.toLocaleString("ro-RO")} {currency}
                </span>
              </div>
            </div>
          </Card>

          {/* Observații */}
          <Card title="Observații">
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              rows={3}
              className={cn(inputCls, "resize-none")}
              placeholder="Ex: Prețul nu include TVA. Valabil 30 zile."
            />
          </Card>

          {/* Butoane acțiuni */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Copiază text
            </button>
            <button
              onClick={handlePDF}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Descarcă PDF
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
