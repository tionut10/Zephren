import { useState, useRef, useCallback } from "react";
import { cn, Card, Badge } from "./ui.jsx";
import { canAccess } from "../lib/planGating.js";
import PlanGate from "./PlanGate.jsx";

// ═══════════════════════════════════════════════════════════════
// OCR FACTURI ENERGIE — extragere automată kWh/m³ din facturi
// Folosește api/import-invoice.js (Claude Haiku Vision)
// Suportă PDF și imagini (JPG, PNG, WEBP)
// Gating v6.0: feature `ocrInvoice` — disponibil Pro+ / Edu (AI Pack inclus).
// ═══════════════════════════════════════════════════════════════

const ENERGY_LABELS = {
  gaz: { icon: "🔥", label: "Gaz natural", color: "#f97316" },
  electricitate: { icon: "⚡", label: "Electricitate", color: "#eab308" },
  termoficare: { icon: "♨️", label: "Termoficare", color: "#ef4444" },
  mix: { icon: "⚡🔥", label: "Mixt", color: "#8b5cf6" },
};

function formatKwh(v) {
  if (!v || v === "" || v === "0") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n.toLocaleString("ro-RO") + " kWh/an";
}

export default function InvoiceOCR({ onApply, onClose, userPlan }) {
  // Pricing v6.0 — OCR facturi disponibil Pro+ / Edu (AI Pack inclus).
  // Wrapper extern → previne încălcarea Rules of Hooks la schimbarea planului.
  if (!canAccess(userPlan, "ocrInvoice")) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 w-full max-w-lg shadow-2xl"
          onClick={e => e.stopPropagation()}>
          <PlanGate feature="ocrInvoice" plan={userPlan} requiredPlan="pro" mode="upgrade" />
          <div className="flex justify-end p-2">
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">Închide</button>
          </div>
        </div>
      </div>
    );
  }
  return <InvoiceOCRInternal onApply={onApply} onClose={onClose} />;
}

function InvoiceOCRInternal({ onApply, onClose }) {
  const [status, setStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedItems, setSelectedItems] = useState({
    gasKwh: true, elecKwh: true, heatKwh: true, address: true, tariff: true,
  });
  const fileRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const maxSizeMB = file.type === "application/pdf" ? 10 : 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setStatus("error");
      setErrorMsg(`Fișierul depășește ${maxSizeMB}MB. Comprimați imaginea sau trimiteți o pagină din PDF.`);
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setData(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const fileData = ev.target.result; // data URL base64

        const resp = await fetch("/api/import-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileType: "invoice",
            fileData,
            mimeType: file.type || "image/jpeg",
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const result = await resp.json();
        if (!result.data) throw new Error("Nu s-au putut extrage date din document.");

        setData(result.data);
        setStatus("ok");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Eroare la procesarea documentului.");
      }
    };
    reader.onerror = () => {
      setStatus("error");
      setErrorMsg("Nu s-a putut citi fișierul.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFile = useCallback((e) => {
    processFile(e.target.files?.[0]);
    e.target.value = "";
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    processFile(e.dataTransfer.files?.[0]);
  }, [processFile]);

  const handleApply = useCallback(() => {
    if (!data) return;
    const toApply = {};
    const gas = parseFloat(data.annualGasKwh) || 0;
    const elec = parseFloat(data.annualElecKwh) || 0;
    const heat = parseFloat(data.annualHeatKwh) || 0;

    if (selectedItems.gasKwh && gas > 0) toApply.measuredGasKwh = gas;
    if (selectedItems.elecKwh && elec > 0) toApply.measuredElecKwh = elec;
    if (selectedItems.heatKwh && heat > 0) toApply.measuredHeatKwh = heat;
    if (selectedItems.address && data.address) toApply.address = [data.address, data.city].filter(Boolean).join(", ");
    if (selectedItems.tariff && data.tariffGas) toApply.tariffGas = parseFloat(data.tariffGas);
    if (selectedItems.tariff && data.tariffElec) toApply.tariffElec = parseFloat(data.tariffElec);
    toApply.supplier = data.supplier;
    toApply.invoicePeriod = data.periodStart && data.periodEnd
      ? `${data.periodStart} — ${data.periodEnd}`
      : "";

    onApply?.(toApply);
    onClose?.();
  }, [data, selectedItems, onApply, onClose]);

  const energyInfo = data ? ENERGY_LABELS[data.energyType] || ENERGY_LABELS.mix : null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">OCR Facturi Energie</h2>
            <p className="text-xs text-slate-400">Extrage automat kWh/an din facturi scanate sau fotografiate</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => status !== "loading" && fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4",
            status === "loading" ? "border-indigo-500 bg-indigo-900/10 cursor-wait" :
            status === "ok" ? "border-green-600 bg-green-900/10 cursor-pointer" :
            status === "error" ? "border-red-600 bg-red-900/10 cursor-pointer" :
            "border-slate-600 hover:border-indigo-500 bg-slate-800/30 cursor-pointer"
          )}>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFile} className="hidden"/>

          {status === "loading" && (
            <div>
              <div className="text-2xl mb-2 animate-pulse">🔍</div>
              <p className="text-indigo-300 text-sm font-medium">Claude analizează factura...</p>
              <p className="text-slate-500 text-xs mt-1">Extrage valori kWh, furnizor, tarife</p>
            </div>
          )}
          {status === "ok" && data && energyInfo && (
            <div>
              <div className="text-3xl mb-2">{energyInfo.icon}</div>
              <p className="font-medium text-sm" style={{ color: energyInfo.color }}>{data.supplier || energyInfo.label}</p>
              <p className="text-slate-400 text-xs mt-1">
                {data.periodStart && `${data.periodStart}`}
                {data.periodEnd && ` — ${data.periodEnd}`}
              </p>
            </div>
          )}
          {status === "error" && (
            <div>
              <div className="text-2xl mb-2">❌</div>
              <p className="text-red-300 text-xs">{errorMsg}</p>
              <p className="text-slate-500 text-xs mt-1">Click pentru a încerca alt fișier</p>
            </div>
          )}
          {!status && (
            <div>
              <div className="text-3xl mb-2">📄</div>
              <p className="text-slate-300 text-sm font-medium">Trage sau click pentru factură</p>
              <p className="text-slate-500 text-xs mt-1">PDF · JPG · PNG · WEBP — max 10MB</p>
              <p className="text-slate-600 text-xs mt-0.5">Gaz, electricitate, termoficare</p>
            </div>
          )}
        </div>

        {/* Date extrase */}
        {status === "ok" && data && (
          <div className="space-y-3 mb-4">
            <div className="text-xs font-medium text-slate-400 uppercase">Consum extras din factură</div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  key: "gasKwh",
                  label: "Gaz natural",
                  icon: "🔥",
                  primary: formatKwh(data.annualGasKwh),
                  secondary: data.annualGasM3 ? `${parseFloat(data.annualGasM3).toLocaleString("ro-RO")} m³/an` : null,
                  available: !!(data.annualGasKwh && parseFloat(data.annualGasKwh) > 0),
                },
                {
                  key: "elecKwh",
                  label: "Electricitate",
                  icon: "⚡",
                  primary: formatKwh(data.annualElecKwh),
                  secondary: data.tariffElec ? `Tarif: ${data.tariffElec} lei/kWh` : null,
                  available: !!(data.annualElecKwh && parseFloat(data.annualElecKwh) > 0),
                },
                {
                  key: "heatKwh",
                  label: "Termoficare",
                  icon: "♨️",
                  primary: formatKwh(data.annualHeatKwh),
                  secondary: data.annualHeatGcal ? `${data.annualHeatGcal} Gcal/an` : null,
                  available: !!(data.annualHeatKwh && parseFloat(data.annualHeatKwh) > 0),
                },
              ].filter(item => item.available).map(item => (
                <label key={item.key}
                  className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-750 transition-colors">
                  <input type="checkbox" checked={selectedItems[item.key]}
                    onChange={e => setSelectedItems(p => ({...p, [item.key]: e.target.checked}))}
                    className="accent-indigo-500 w-4 h-4 flex-shrink-0"/>
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-slate-300 font-medium">{item.label}</div>
                    <div className="text-indigo-300 font-mono font-bold">{item.primary}</div>
                    {item.secondary && <div className="text-slate-500 text-[10px]">{item.secondary}</div>}
                  </div>
                </label>
              ))}
            </div>

            {/* Adresă + tarife */}
            {(data.address || data.tariffGas) && (
              <div className="space-y-1.5">
                {data.address && (
                  <label className="flex items-center gap-2 text-xs bg-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-750">
                    <input type="checkbox" checked={selectedItems.address}
                      onChange={e => setSelectedItems(p => ({...p, address: e.target.checked}))}
                      className="accent-indigo-500"/>
                    <span>📍</span>
                    <span className="text-slate-400">{[data.address, data.city].filter(Boolean).join(", ")}</span>
                  </label>
                )}
                {data.tariffGas && (
                  <label className="flex items-center gap-2 text-xs bg-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-750">
                    <input type="checkbox" checked={selectedItems.tariff}
                      onChange={e => setSelectedItems(p => ({...p, tariff: e.target.checked}))}
                      className="accent-indigo-500"/>
                    <span>💰</span>
                    <span className="text-slate-400">Tarif gaz: {data.tariffGas} lei/m³</span>
                  </label>
                )}
              </div>
            )}

            {data.notes && (
              <div className="text-xs text-slate-500 bg-slate-800/50 rounded px-3 py-2">
                💬 {data.notes}
              </div>
            )}

            {data.totalCostLei && (
              <div className="flex justify-between text-xs bg-slate-800 rounded px-3 py-2">
                <span className="text-slate-400">Cost total facturat</span>
                <span className="text-white font-medium">{parseFloat(data.totalCostLei).toLocaleString("ro-RO")} lei/an</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-all">
            Anulare
          </button>
          {status === "ok" && (
            <button onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
              Aplică date consum
            </button>
          )}
          {status !== "ok" && status !== "loading" && (
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-all">
              Încarcă factură
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-600 mt-3 text-center">
          Procesare securizată via Claude AI · Datele se aplică la secțiunea Consum real măsurat.
        </p>
      </div>
    </div>
  );
}
