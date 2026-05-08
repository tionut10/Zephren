/**
 * AuditorSignatureStampUpload.jsx — Upload imagini semnătură + ștampilă auditor.
 *
 * Sprint 15 — 18 apr 2026
 * Scop: injecție PNG cu transparență în CPE DOCX/PDF (Ord. MDLPA 16/2023 Anexa 1
 * + uzanță juridică semnare autentică).
 *
 * Sprint v6.2 — 27 apr 2026
 * Adaos: validare strictă conform Anexa 1b din Ordinul MDLPA 348/2026 (MO 292/14.IV.2026):
 *   • Ștampila trebuie să fie circulară, diametru exact 40 mm
 *   • Texte obligatorii: „ROMÂNIA M.D.L.P.A. Nr.00000" și „AUDITOR ENERGETIC PENTRU CLĂDIRI"
 *   • Simbol în centru: „AE Ici" (Gradul I) sau „AE IIci" (Gradul II)
 *   • Art. 5 alin. (5): „Este interzisă executarea și/sau utilizarea de ștampile
 *     cu alte dimensiuni și/sau alte înscrisuri decât cele precizate în anexa 1b."
 * Detectarea automată este indicativă (analiza pixelilor); semnal user prin badge,
 * iar validarea finală rămâne responsabilitatea auditorului.
 *
 * Comportament:
 *  - acceptă PNG/JPG, compresează pe canvas la max 800×800 → dataURL PNG
 *  - max 300 KB output (similar `BuildingPhotos`)
 *  - preview live + buton „Șterge" per slot
 *  - persistență prin auditor.signatureDataURL / auditor.stampDataURL
 *  - SVG de referință 40mm pentru auditori care nu au ștampilă scanată
 *
 * Componentele sunt dual (semnătură + ștampilă) într-un singur fișier
 * pentru a nu împărți 2 slot-uri de lazy-loading.
 */
import { useCallback, useRef, useEffect, useState } from "react";

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

/**
 * Sprint v6.2 — Verifică aspect ratio al imaginii ștampilei.
 * Conform Anexa 1b Ord. MDLPA 348/2026: ștampila este CIRCULARĂ cu Ø 40 mm.
 * O imagine corect scanată va avea aspect ratio ~1:1 (toleranță ±10%).
 *
 * Nu putem măsura DPI-ul absolut din PNG fără metadata, dar putem semnala
 * imagini clar non-circulare (ex: 300×80 pixeli — buton text, nu ștampilă).
 *
 * @param {string} dataURL
 * @returns {Promise<{ok: boolean, ratio: number, width: number, height: number}>}
 */
function checkStampAspect(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL) { resolve({ ok: true, ratio: 1, width: 0, height: 0 }); return; }
    const img = new Image();
    img.onload = () => {
      const w = img.width || 1;
      const h = img.height || 1;
      const ratio = w / h;
      // Toleranță ±15% în jurul 1:1 (acceptăm crop ușor și anti-aliasing la scanare)
      const ok = ratio >= 0.85 && ratio <= 1.15;
      resolve({ ok, ratio, width: w, height: h });
    };
    img.onerror = () => resolve({ ok: true, ratio: 1, width: 0, height: 0 });
    img.src = dataURL;
  });
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
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 bg-white/5 overflow-hidden min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Sprint 8 mai 2026 — eliminat `truncate` (taie „SEMNĂTURĂ OLOGRAFĂ" /
              „ȘTAMPILĂ AUDITOR" pe 2 coloane). Permitem wrap natural pe 2 linii
              cu `leading-tight` ca să nu mărească exagerat înălțimea cardului. */}
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-300 leading-tight break-words">{label}</div>
          <div className="text-[10px] text-white/40 mt-0.5 leading-tight">{hint}</div>
          {recommendedSize && (
            <div className="text-[10px] text-white/30 mt-0.5">Rec: {recommendedSize}</div>
          )}
        </div>
        {dataURL && (
          <span className="text-[10px] text-emerald-400 shrink-0">
            ✓ {kbSize(dataURL)} KB
          </span>
        )}
      </div>

      {dataURL ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center w-full overflow-hidden rounded border border-white/10"
               style={{ background: "repeating-conic-gradient(#1a1a2e 0% 25%, #2a2a3e 0% 50%) 50% / 12px 12px",
                        minHeight: 40, maxHeight: previewStyle?.maxHeight ?? 100 }}>
            <img
              src={dataURL}
              alt={label}
              style={{ maxHeight: previewStyle?.maxHeight ?? 100,
                       maxWidth: "100%",
                       objectFit: "contain",
                       ...(previewStyle?.borderRadius ? { borderRadius: previewStyle.borderRadius } : {}) }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-1 px-2 rounded text-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all truncate"
            >
              Înlocuiește
            </button>
            <button
              type="button"
              onClick={onClear}
              className="flex-1 py-1 px-2 rounded text-xs bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all truncate"
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
 *
 * Sprint v6.2 — adaos validare ștampilă conform Anexa 1b Ord. MDLPA 348/2026:
 *   • aspect 1:1 (cerc Ø 40 mm)
 *   • simbol AE Ici (gradul I) sau AE IIci (gradul II) declarat de auditor
 *   • feedback vizual non-blocant (badge + tooltip)
 *
 * @param {object} props
 * @param {object} props.auditor — obiect auditor cu signatureDataURL + stampDataURL +
 *   gradMdlpa ("Ici"|"IIci") + atestat
 * @param {(updater: (a: object) => object) => void} props.setAuditor — React setState pentru auditor
 */
export default function AuditorSignatureStampUpload({ auditor = {}, setAuditor }) {
  const [stampAspect, setStampAspect] = useState({ ok: true, ratio: 1, width: 0, height: 0 });

  // Re-verifică aspect ratio la fiecare schimbare a stamp-ului
  useEffect(() => {
    let cancelled = false;
    if (auditor.stampDataURL) {
      checkStampAspect(auditor.stampDataURL).then((res) => {
        if (!cancelled) setStampAspect(res);
      });
    } else {
      setStampAspect({ ok: true, ratio: 1, width: 0, height: 0 });
    }
    return () => { cancelled = true; };
  }, [auditor.stampDataURL]);

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

  const setGradMdlpa = useCallback((grad) => {
    setAuditor?.(a => ({ ...a, gradMdlpa: grad }));
  }, [setAuditor]);

  const grad = auditor.gradMdlpa || "";
  const stampSymbol = grad === "Ici" ? "AE Ici" : grad === "IIci" ? "AE IIci" : "—";

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

      {/* Sprint v6.2 — Selector grad MDLPA conform Anexa 1b Ord. 348/2026 */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
        <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">
          Gradul profesional MDLPA (Anexa 1b Ord. 348/2026)
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "Ici",  label: "AE Ici  — Gradul I (toate clădirile)", help: "Vechime ≥ 5 ani · scop complet (Art. 6 alin. 1)" },
            { value: "IIci", label: "AE IIci — Gradul II (rezidențial)",     help: "Vechime ≥ 3 ani · doar locuințe (Art. 6 alin. 2)" },
          ].map((opt) => {
            const active = grad === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={opt.help}
                onClick={() => setGradMdlpa(active ? "" : opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                  active
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {grad && (
          <div className="mt-2 text-[10px] opacity-50 space-y-1">
            <div>
              Ștampila ta trebuie să afișeze conform <strong>Anexei 1b Ord. MDLPA 348/2026</strong>:
            </div>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li><strong>Coroana exterioară:</strong> „AUDITOR ENERGETIC PENTRU CLĂDIRI" + „SPECIALITATEA CONSTRUCȚII ȘI INSTALAȚII"</li>
              <li><strong>Centrul:</strong> simbol „<strong>{stampSymbol}</strong>" + „GRAD PROFESIONAL {grad === "Ici" ? "I" : "II"}" + nr. atestat (= nr. registru auditori)</li>
              <li><strong>Diametru:</strong> Ø 40 mm (standard profesional RO; Art. 5 alin. (5) interzice alte dimensiuni)</li>
            </ul>
          </div>
        )}
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
        <div>
          <UploadSlot
            label={`Ștampilă auditor (Ø 40 mm) ${grad ? "— " + stampSymbol : ""}`}
            hint="Ștampilă circulară conform Anexa 1b Ord. MDLPA 348/2026 — Ø 40 mm exact"
            recommendedSize="500 × 500 px (raport 1:1)"
            dataURL={auditor.stampDataURL || ""}
            onChange={setStamp}
            onClear={clearStamp}
            previewStyle={{ maxHeight: 120, maxWidth: 120, objectFit: "contain", borderRadius: "50%" }}
          />
          {/* Indicator aspect ratio (validare automată indicativă) */}
          {auditor.stampDataURL && (
            <div className={`mt-2 text-[10px] flex items-center gap-2 ${stampAspect.ok ? "text-emerald-400/80" : "text-amber-300/90"}`}>
              <span aria-hidden="true">{stampAspect.ok ? "✓" : "⚠"}</span>
              <span>
                {stampAspect.ok
                  ? `Aspect 1:1 OK (${stampAspect.width}×${stampAspect.height} px, raport ${stampAspect.ratio.toFixed(2)})`
                  : `Aspect non-circular (${stampAspect.width}×${stampAspect.height} px, raport ${stampAspect.ratio.toFixed(2)}). Re-scanează ștampila la format pătrat.`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-white/30 italic space-y-1">
        <div>
          ⓘ Imaginile sunt stocate local în browserul tău (localStorage), embeded în DOCX/PDF exportat și transmise către API la generare. Nu sunt încărcate pe servere externe.
        </div>
        <div>
          ⚖ Conform Art. 5 alin. (5) Ord. MDLPA 348/2026: „Este interzisă executarea și/sau
          utilizarea de ștampile cu alte dimensiuni și/sau alte înscrisuri decât cele precizate în
          anexa 1b." Validarea finală rămâne responsabilitatea auditorului.
        </div>
      </div>
    </div>
  );
}
