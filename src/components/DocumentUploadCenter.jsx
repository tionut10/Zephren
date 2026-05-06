import React, { useState, useEffect, useCallback } from "react";
import { cn } from "./ui.jsx";
import {
  DOCUMENT_SLOTS,
  saveDocument,
  listDocuments,
  deleteDocument,
  validateMagicBytes,
  getSlotMeta,
} from "../lib/document-upload-store.js";

/**
 * DocumentUploadCenter — UI standalone pentru upload documente input client.
 *
 * Acoperă itemii P0-05..P0-09 din audit conformitate 2026-05-06:
 *   - Cartea Tehnică (≥1995)
 *   - Procesul-verbal recepție
 *   - Releveu actualizat (PDF/DWG)
 *   - Autorizație construire
 *   - Avize ANCPI / ISC / monumente (condiționate)
 *   - Acord scris proprietari (RC)
 *
 * Persistență: IndexedDB local prin `document-upload-store.js`. Hash SHA-256
 * pe fiecare upload (integritate + dedup). Cleanup automat 7 zile.
 *
 * Usage:
 *   <DocumentUploadCenter
 *     cpeCode={auditor.cpeCode || `session_${sessionId}`}
 *     buildingCategory={building.category}
 *     buildingYearBuilt={building.yearBuilt}
 *     scopCpe={building.scopCpe}
 *     onChange={(uploadedDocs) => { ... }}
 *   />
 *
 * Slot-urile condiționate (autorizație, avize, acord RC) apar/dispar pe baza
 * datelor clădirii. NU impune obligativitate hard pentru a nu rupe fluxurile
 * existente — afișează doar warning recomandare.
 *
 * Sprint Conformitate P0-05..P0-09 (6-7 mai 2026).
 */

export default function DocumentUploadCenter({
  cpeCode = "session_default",
  buildingCategory = "RI",
  buildingYearBuilt = null,
  scopCpe = "vanzare",
  isResidentialCollective = false, // building.category === "RC"
  protectedZone = false,
  isHistoric = false,
  onChange = () => {},
  showInfo = true,
}) {
  const [docs, setDocs] = useState([]); // listă uploads existente (fără bytes)
  const [uploading, setUploading] = useState(null); // slotKey curent în upload
  const [error, setError] = useState(null);

  // Reload listă la mount + la schimbare cpeCode
  const reload = useCallback(async () => {
    try {
      const list = await listDocuments(cpeCode);
      setDocs(list);
      onChange(list);
    } catch (e) {
      console.error("[DocumentUploadCenter] listDocuments error:", e);
      setError(e?.message || "Eroare listare documente");
    }
  }, [cpeCode, onChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Determină ce slot-uri să afișeze pe baza datelor clădirii
  const visibleSlots = [];
  // Întotdeauna disponibile
  if (buildingYearBuilt && Number(buildingYearBuilt) >= 1995) {
    visibleSlots.push({ ...DOCUMENT_SLOTS.CARTEA_TEHNICA, recommended: true, reason: "Construcție ≥1995 (HG 273/1994 Art. 17)" });
  } else {
    visibleSlots.push({ ...DOCUMENT_SLOTS.CARTEA_TEHNICA, recommended: false });
  }
  visibleSlots.push({ ...DOCUMENT_SLOTS.RELEVEU, recommended: true, reason: "Bază calcul anvelopă" });
  if (scopCpe === "receptie" || scopCpe === "construire") {
    visibleSlots.push({ ...DOCUMENT_SLOTS.PV_RECEPTIE, recommended: true, reason: "Scop CPE = recepție" });
  } else {
    visibleSlots.push({ ...DOCUMENT_SLOTS.PV_RECEPTIE, recommended: false });
  }
  if (scopCpe === "renovare" || scopCpe === "renovare_majora" || scopCpe === "construire") {
    visibleSlots.push({ ...DOCUMENT_SLOTS.AUTORIZATIE, recommended: true, reason: "Scop renovare/construire" });
  }
  if (protectedZone) {
    visibleSlots.push({ ...DOCUMENT_SLOTS.AVIZ_ANCPI, recommended: true, reason: "Zonă protejată" });
  }
  if (scopCpe === "construire" || scopCpe === "renovare_majora") {
    visibleSlots.push({ ...DOCUMENT_SLOTS.AVIZ_ISC, recommended: true, reason: "Construcție / renovare majoră — siguranță foc" });
  }
  if (isHistoric) {
    visibleSlots.push({ ...DOCUMENT_SLOTS.AVIZ_MONUMENTE, recommended: true, reason: "Clădire monument — DJC" });
  }
  if (isResidentialCollective || buildingCategory === "RC") {
    visibleSlots.push({ ...DOCUMENT_SLOTS.ACORD_PROPRIETARI, recommended: true, reason: "Bloc RC — Mc 001 P.III + Legea 196/2018" });
  }

  // Map docs by slotKey pentru afișare
  const docsBySlot = {};
  docs.forEach(d => { docsBySlot[d.slotKey] = d; });

  const handleFileChange = async (slotKey, accept, maxMb, e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(slotKey);

    try {
      // Validare dimensiune
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxMb) {
        throw new Error(`Fișierul are ${sizeMb.toFixed(1)} MB — maxim ${maxMb} MB`);
      }

      // Validare magic bytes
      const ab = await file.arrayBuffer();
      const u8 = new Uint8Array(ab.slice(0, Math.min(64, ab.byteLength)));
      if (!validateMagicBytes(u8, accept)) {
        throw new Error(`Tip fișier invalid — așteptat ${accept}`);
      }

      // Salvare cu hash + IndexedDB
      await saveDocument({ cpeCode, slotKey, file });
      await reload();
    } catch (err) {
      setError(err?.message || "Eroare upload");
    } finally {
      setUploading(null);
      // Reset input pentru a permite re-upload același fișier
      if (e?.target) e.target.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      await reload();
    } catch (err) {
      setError(err?.message || "Eroare ștergere");
    }
  };

  return (
    <div className="space-y-3" data-testid="document-upload-center">
      {showInfo && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-[12px] text-cyan-100/85">
          <div className="font-semibold mb-1">📄 Documente input client (P0-05..P0-09)</div>
          <div className="opacity-80">
            Stocare temporară IndexedDB (TTL 7 zile) cu hash SHA-256 per fișier.
            Slot-urile condiționate apar/dispar pe baza datelor clădirii (an construcție, scop CPE, zonă protejată, monument, RC).
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200">
          ❌ {error}
        </div>
      )}

      <div className="space-y-2">
        {visibleSlots.map((slot) => {
          const existing = docsBySlot[slot.key];
          const isUploading = uploading === slot.key;
          return (
            <div
              key={slot.key}
              className={cn(
                "rounded-lg border p-3 text-[12px]",
                existing
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : slot.recommended
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-white/10 bg-white/5",
              )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {existing ? "✅" : (slot.recommended ? "⚠️" : "○")} {slot.label}
                  </div>
                  {slot.reason && !existing && (
                    <div className="text-[10px] opacity-70 mt-0.5">{slot.reason}</div>
                  )}
                  {existing && (
                    <div className="text-[10px] opacity-80 mt-1 space-y-0.5">
                      <div>📁 {existing.filename} · {(existing.size / 1024).toFixed(1)} KB</div>
                      <div className="opacity-60">SHA-256: {existing.hash.slice(0, 16)}…{existing.hash.slice(-8)}</div>
                      <div className="opacity-60">Uploaded: {new Date(existing.uploadedAt).toLocaleString("ro-RO")}</div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] opacity-60 whitespace-nowrap">
                    {slot.accept} · max {slot.maxMb} MB
                  </span>
                  {existing ? (
                    <button
                      onClick={() => handleDelete(existing.id)}
                      className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px]">
                      Șterge
                    </button>
                  ) : (
                    <label
                      className={cn(
                        "px-3 py-1.5 rounded cursor-pointer text-[11px] font-medium",
                        isUploading
                          ? "bg-white/10 cursor-wait opacity-60"
                          : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200",
                      )}>
                      {isUploading ? "⏳ Upload…" : "Încarcă fișier"}
                      <input
                        type="file"
                        accept={slot.accept}
                        disabled={isUploading}
                        onChange={(e) => handleFileChange(slot.key, slot.accept, slot.maxMb, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] opacity-50 mt-2">
        Total {docs.length} document(e) încărcat(e) pentru CPE „{cpeCode}".
        Bază legală: HG 273/1994 + Art. 6 alin. 1 Ord. 348/2026 + L. 196/2018 (RC) + L. 422/2001 (monumente) + GDPR (Reg. UE 2016/679).
      </div>
    </div>
  );
}
