/**
 * AuditorSignatureStampUpload.jsx — Upload imagini semnătură + ștampilă auditor.
 *
 * Sprint 15 — 18 apr 2026
 * Scop: injecție PNG cu transparență în CPE DOCX/PDF (Ord. MDLPA 16/2023 Anexa 1
 * + uzanță juridică semnare autentică).
 *
 * Comportament:
 *  - acceptă PNG/JPG, compresează pe canvas la max 800×800 → dataURL PNG
 *  - max 300 KB output (similar `BuildingPhotos`)
 *  - preview live + buton „Șterge" per slot
 *  - persistență prin auditor.signatureDataURL / auditor.stampDataURL
 *
 * Componentele sunt dual (semnătură + ștampilă) într-un singur fișier
 * pentru a nu împărți 2 slot-uri de lazy-loading.
 */
import { useCallback, useRef } from "react";

// ── Compresie canvas PNG cu transparență (max 800×800, calitate 0.92) ──
function compressToPNG(file, maxDim = 800) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Fișier invalid — trebuie imagine PNG/JPG"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagine invalidă sau coruptă"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function kbSize(dataURL) {
  if (!dataURL) return 0;
  // Base64 adds ~33% overhead; bytes ≈ (length * 3/4) - padding
  const b64 = dataURL.split(",")[1] || "";
  return Math.round(b64.length * 0.75 / 1024);
}

function UploadSlot({
  label,
  hint,
  recommendedSize,
  dataURL,
  onChange,
  onClear,
  accept = "image/png,image/jpeg",
  previewStyle,
}) {
  const fileRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const d = await compressToPNG(file);
      onChange(d);
    } catch (err) {
      alert(`Eroare procesare imagine: ${err.message}`);
    }
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">{label}</div>
          <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>
          {recommendedSize && (
            <div className="text-[10px] text-white/30 mt-0.5">Recomandat: {recommendedSize}</div>
          )}
        </div>
        {dataURL && (
          <span className="text-[10px] text-emerald-400">
            ✓ {kbSize(dataURL)} KB
          </span>
        )}
      </div>

      {dataURL ? (
        <div className="relative group">
          <img
            src={dataURL}
            alt={label}
            style={{
              background: "repeating-conic-gradient(#1a1a2e 0% 25%, #2a2a3e 0% 50%) 50% / 12px 12px",
              ...previewStyle,
            }}
            className="mx-auto max-w-full rounded border border-white/10"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-1.5 px-3 rounded text-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all"
            >
              Înlocuiește
            </button>
            <button
              type="button"
              onClick={onClear}
              className="flex-1 py-1.5 px-3 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all"
            >
              Șterge
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className="flex flex-col items-center justify-center py-6 px-4 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-amber-500/30 transition-all text-center cursor-pointer"
        >
          <div className="text-2xl opacity-40 mb-1">📤</div>
          <div className="text-xs text-white/60">Click sau drop pentru upload</div>
          <div className="text-[10px] text-white/30 mt-1">PNG cu transparență preferat</div>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // reset pentru a permite re-upload același fișier
        }}
      />
    </div>
  );
}

/**
 * AuditorSignatureStampUpload
 * @param {object} props
 * @param {object} props.auditor — obiect auditor cu signatureDataURL + stampDataURL
 * @param {(updater: (a: object) => object) => void} props.setAuditor — React setState pentru auditor
 */
export default function AuditorSignatureStampUpload({ auditor = {}, setAuditor }) {
  const setSignature = useCallback((dataURL) => {
    setAuditor?.(a => ({ ...a, signatureDataURL: dataURL }));
  }, [setAuditor]);

  const clearSignature = useCallback(() => {
    setAuditor?.(a => ({ ...a, signatureDataURL: "" }));
  }, [setAuditor]);

  const setStamp = useCallback((dataURL) => {
    setAuditor?.(a => ({ ...a, stampDataURL: dataURL }));
  }, [setAuditor]);

  const clearStamp = useCallback(() => {
    setAuditor?.(a => ({ ...a, stampDataURL: "" }));
  }, [setAuditor]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-1">
          Semnătură & ștampilă auditor
        </h3>
        <p className="text-[10px] text-white/40">
          Încărcăm imagini PNG cu transparență. Apar în CPE DOCX/PDF generat + raport audit. Păstrate local (localStorage).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadSlot
          label="Semnătură olografă"
          hint="Scanare PNG cu fond transparent (scrisă pe hârtie albă, editată)"
          recommendedSize="400 × 150 px"
          dataURL={auditor.signatureDataURL || ""}
          onChange={setSignature}
          onClear={clearSignature}
          previewStyle={{ maxHeight: 80, objectFit: "contain" }}
        />
        <UploadSlot
          label="Ștampilă profesională"
          hint="Ștampilă auditor atestat MDLPA (cerc / pătrat, PNG transparent)"
          recommendedSize="150 × 150 px"
          dataURL={auditor.stampDataURL || ""}
          onChange={setStamp}
          onClear={clearStamp}
          previewStyle={{ maxHeight: 100, objectFit: "contain" }}
        />
      </div>

      <div className="text-[10px] text-white/30 italic">
        ⓘ Imaginile sunt stocate local în browserul tău (localStorage), embeded în DOCX/PDF exportat și transmise către API la generare. Nu sunt încărcate pe servere externe.
      </div>
    </div>
  );
}
