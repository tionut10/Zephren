/**
 * ANCPIVerificationPanel — Verificare cadastrală auditor (Sprint D Task 1)
 *
 * ANCPI nu oferă API public pentru SaaS comercial — accesul programatic e
 * rezervat instituțiilor publice via SOAP/RENNS. Ca atare, fluxul corect este:
 *
 *   1. Auditorul cumpără extras CF online de pe epay.ancpi.ro (15 RON / imobil)
 *      sau își folosește contul eTerra propriu (PJA / PFA).
 *   2. Încarcă PDF-ul extrasului în Zephren (max 2 MB → base64 în state).
 *   3. Bifează „Am verificat manual" → flag-ul ancpiVerified=true se persistă
 *      în payload-ul proiectului și deblochează exportul CPE oficial în Step 6.
 *
 * Fără bifare, blocaj hard în Step 6 (cerință utilizator: opțiunea „b" hard
 * blocaj total). Soft warning posibil prin prop `softMode`.
 *
 * Props:
 *   data        — { verified, fileName, fileSize, fileBase64, uploadDate,
 *                    cadastralNr, carteFunciara, ownerType }
 *   onUpdate    — (partialFields) => void; merge în data
 *   address     — string (informativ, pentru pre-completare query epay)
 *   lang        — "RO" | "EN"
 */
import { useState, useCallback, useRef } from "react";
import { cn } from "./ui.jsx";

const EPAY_URL = "https://epay.ancpi.ro/epay/Welcome.action";
const ETERRA_URL = "https://eterra.ancpi.ro/eterra/";
const MYETERRA_URL = "https://myeterra.ancpi.ro/";
const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB hard cap

const T_RO = {
  title: "Verificare cadastrală (ANCPI)",
  subtitle: "Extras de carte funciară pentru informare — obligatoriu pentru CPE oficial",
  noApiNote: "ANCPI nu oferă API public pentru aplicații SaaS — verificarea se face manual de auditor.",
  step1Label: "Pasul 1 — Obține extras CF",
  step1HelpText: "Cumpără online (15 RON, max 24h) sau folosește contul tău eTerra (PJA / PFA).",
  buyOnlineBtn: "🔗 Cumpără extras CF (epay.ancpi.ro)",
  eterraBtn: "🏛️ Cont eTerra (PJA/PFA)",
  myeterraBtn: "👤 MyEterra (cetățeni cu ROeID)",
  step2Label: "Pasul 2 — Încarcă PDF extrasul CF",
  step2HelpText: "Format PDF, maxim 2 MB. Stocat local în browser, GDPR-conform.",
  uploadBtn: "📎 Încarcă PDF extras CF",
  uploadAgainBtn: "📎 Înlocuiește PDF",
  removeBtn: "🗑️ Șterge",
  step3Label: "Pasul 3 — Date cadastrale (manual)",
  cadastralLabel: "Nr. cadastral",
  carteFunciaraLabel: "Carte funciară (CF)",
  cadastralPlaceholder: "ex. 123456",
  carteFunciaraPlaceholder: "ex. 123456-CF-1234",
  step4Label: "Pasul 4 — Confirmare",
  checkboxLabel: "Confirm că am verificat manual extrasul de carte funciară la OCPI și datele introduse corespund cu cele din extras.",
  verifiedStatus: "✅ Cadastru verificat",
  notVerifiedStatus: "⚠️ Cadastru neverificat — exportul CPE oficial este blocat",
  fileTooLarge: "Fișierul depășește 2 MB. Comprimă PDF-ul sau încarcă doar paginile relevante.",
  invalidType: "Doar fișiere PDF acceptate.",
  fileLoaded: "PDF încărcat:",
  uploadDate: "Data încărcare:",
};

const T_EN = {
  title: "Cadastral verification (ANCPI)",
  subtitle: "Land registry extract — required for official CPE",
  noApiNote: "ANCPI does not offer a public API for SaaS apps — verification is done manually by the auditor.",
  step1Label: "Step 1 — Obtain CF extract",
  step1HelpText: "Buy online (15 RON, max 24h) or use your eTerra account (legal entity / authorized).",
  buyOnlineBtn: "🔗 Buy CF extract (epay.ancpi.ro)",
  eterraBtn: "🏛️ eTerra account (PJA/PFA)",
  myeterraBtn: "👤 MyEterra (citizens with ROeID)",
  step2Label: "Step 2 — Upload CF extract PDF",
  step2HelpText: "PDF format, max 2 MB. Stored locally in browser, GDPR-compliant.",
  uploadBtn: "📎 Upload CF extract PDF",
  uploadAgainBtn: "📎 Replace PDF",
  removeBtn: "🗑️ Remove",
  step3Label: "Step 3 — Cadastral data (manual entry)",
  cadastralLabel: "Cadastral nr.",
  carteFunciaraLabel: "Land book (CF)",
  cadastralPlaceholder: "e.g. 123456",
  carteFunciaraPlaceholder: "e.g. 123456-CF-1234",
  step4Label: "Step 4 — Confirmation",
  checkboxLabel: "I confirm I have manually verified the land registry extract at the local OCPI office and the data entered matches the extract.",
  verifiedStatus: "✅ Cadastre verified",
  notVerifiedStatus: "⚠️ Cadastre not verified — official CPE export is blocked",
  fileTooLarge: "File exceeds 2 MB. Compress PDF or upload only relevant pages.",
  invalidType: "Only PDF files accepted.",
  fileLoaded: "PDF loaded:",
  uploadDate: "Upload date:",
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function validatePDFUpload(file, maxSize = MAX_PDF_SIZE_BYTES) {
  if (!file) return { ok: false, reason: "no_file" };
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name || "")) {
    return { ok: false, reason: "invalid_type" };
  }
  if (file.size > maxSize) {
    return { ok: false, reason: "file_too_large", size: file.size, max: maxSize };
  }
  return { ok: true };
}

export default function ANCPIVerificationPanel({ data = {}, onUpdate, address, lang = "RO" }) {
  const T = lang === "EN" ? T_EN : T_RO;
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const verified = !!data.verified;
  const hasFile = !!data.fileName;

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const validation = validatePDFUpload(file);
    if (!validation.ok) {
      if (validation.reason === "invalid_type") setError(T.invalidType);
      else if (validation.reason === "file_too_large") setError(T.fileTooLarge);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      onUpdate?.({
        fileName: file.name,
        fileSize: file.size,
        fileBase64: base64,
        uploadDate: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || "upload_error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [onUpdate, T]);

  const handleRemove = useCallback(() => {
    onUpdate?.({
      fileName: null,
      fileSize: null,
      fileBase64: null,
      uploadDate: null,
    });
    setError(null);
  }, [onUpdate]);

  const handleVerifiedToggle = useCallback((e) => {
    onUpdate?.({ verified: !!e.target.checked });
  }, [onUpdate]);

  const handleFieldChange = useCallback((key, value) => {
    onUpdate?.({ [key]: value });
  }, [onUpdate]);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/40 overflow-hidden">
      {/* Header + status */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-white/5 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="text-base">🏛️</span>
          <div>
            <div className="text-sm font-semibold text-white">{T.title}</div>
            <div className="text-[10px] text-slate-500">{T.subtitle}</div>
          </div>
        </div>
        <div className={cn("text-[11px] px-2 py-1 rounded font-medium",
          verified
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
        )}>
          {verified ? T.verifiedStatus : T.notVerifiedStatus}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Notă de context */}
        <div className="text-[11px] text-slate-400 italic bg-slate-900/40 rounded px-3 py-2 border border-white/5">
          ℹ {T.noApiNote}
        </div>

        {/* Pasul 1 — link-uri externe */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">{T.step1Label}</span>
          </div>
          <p className="text-[11px] text-slate-400">{T.step1HelpText}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={EPAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 text-xs font-medium transition-colors"
            >
              {T.buyOnlineBtn}
            </a>
            <a
              href={ETERRA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
            >
              {T.eterraBtn}
            </a>
            <a
              href={MYETERRA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
            >
              {T.myeterraBtn}
            </a>
          </div>
        </div>

        {/* Pasul 2 — upload PDF */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">{T.step2Label}</span>
          </div>
          <p className="text-[11px] text-slate-400">{T.step2HelpText}</p>
          {!hasFile ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label={T.uploadBtn}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  uploading
                    ? "bg-slate-700 text-slate-500 cursor-wait"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                )}
              >
                {uploading
                  ? <><span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> ...</>
                  : T.uploadBtn}
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">📄</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-emerald-200 truncate">
                      {data.fileName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {data.fileSize != null ? formatBytes(data.fileSize) : "—"}
                      {data.uploadDate && <> · {T.uploadDate} {new Date(data.uploadDate).toLocaleString(lang === "EN" ? "en-GB" : "ro-RO")}</>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    {T.uploadAgainBtn}
                  </button>
                  <button
                    onClick={handleRemove}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-colors"
                  >
                    {T.removeBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              ✗ {error}
            </div>
          )}
        </div>

        {/* Pasul 3 — date cadastrale manuale */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">{T.step3Label}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ancpi-cad-nr" className="block text-[10px] text-slate-400 mb-1">
                {T.cadastralLabel}
              </label>
              <input
                id="ancpi-cad-nr"
                type="text"
                value={data.cadastralNr || ""}
                onChange={(e) => handleFieldChange("cadastralNr", e.target.value)}
                placeholder={T.cadastralPlaceholder}
                className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ancpi-cf-nr" className="block text-[10px] text-slate-400 mb-1">
                {T.carteFunciaraLabel}
              </label>
              <input
                id="ancpi-cf-nr"
                type="text"
                value={data.carteFunciara || ""}
                onChange={(e) => handleFieldChange("carteFunciara", e.target.value)}
                placeholder={T.carteFunciaraPlaceholder}
                className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-violet-500/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pasul 4 — confirmare */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">{T.step4Label}</span>
          </div>
          <label
            htmlFor="ancpi-verified"
            className={cn("flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors",
              verified
                ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
            )}
          >
            <input
              id="ancpi-verified"
              type="checkbox"
              checked={verified}
              onChange={handleVerifiedToggle}
              className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer"
              aria-describedby="ancpi-verified-desc"
            />
            <span id="ancpi-verified-desc" className="text-[11px] text-slate-200 leading-relaxed">
              {T.checkboxLabel}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
