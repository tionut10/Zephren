/**
 * Envelope AI Orchestrator — Pas 2 anvelopă termică.
 *
 * Rutează input-urile multimodale (text, voce, imagine, PDF, paste) la:
 *  - POST /api/import-document  (fileType: facade|drawing|pdf|image)
 *  - POST /api/ai-assistant     (intent: envelope-fill)
 *
 * Normalizează rezultatul în schema unificată:
 *   { opaqueElements, glazingElements, thermalBridges,
 *     building, confidence, source, notes, assumptions }
 *
 * Toate apelurile sunt loggate în ai-telemetry pentru audit cost.
 *
 * Folosit de: Step2Envelope.jsx, SmartEnvelopeHub.jsx, RampFile.jsx,
 *             EnvelopeAssistant.jsx (tab AI nou).
 */

import { logAIEvent } from "./ai-telemetry.js";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB limit Vercel Hobby payload
const COMPRESSION_TARGET_MB = 3.5;

/* ────────────────────────────────────────────────────────────────────── *
 * Compresie imagine (lazy import pentru a evita bundle bloat)
 * ────────────────────────────────────────────────────────────────────── */
async function compressIfNeeded(file) {
  if (!file || !(file instanceof File || file instanceof Blob)) return file;
  if (file.size <= MAX_IMAGE_BYTES) return file;
  if (!file.type?.startsWith("image/")) return file;
  try {
    const mod = await import("browser-image-compression");
    const compress = mod.default || mod;
    return await compress(file, {
      maxSizeMB: COMPRESSION_TARGET_MB,
      maxWidthOrHeight: 2400,
      useWebWorker: true,
      initialQuality: 0.85,
    });
  } catch (err) {
    console.warn("[envelope-ai] compression failed, sending raw:", err?.message);
    return file;
  }
}

async function fileToBase64(file) {
  // Pattern portabil: funcționează în browser (FileReader) + jsdom/Node (arrayBuffer)
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  // Fallback Node/jsdom: convert via ArrayBuffer + base64 manual
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return `data:${file.type || "application/octet-stream"};base64,${b64}`;
}

/* ────────────────────────────────────────────────────────────────────── *
 * Normalizare confidence: text/numeric → "high"|"medium"|"low"
 * ────────────────────────────────────────────────────────────────────── */
export function normalizeConfidence(raw) {
  if (raw == null) return "medium";
  if (typeof raw === "number") {
    if (raw >= 0.75) return "high";
    if (raw >= 0.45) return "medium";
    return "low";
  }
  const s = String(raw).toLowerCase().trim();
  if (s === "high" || s === "h") return "high";
  if (s === "medium" || s === "med" || s === "m") return "medium";
  if (s === "low" || s === "l") return "low";
  return "medium";
}

/* ────────────────────────────────────────────────────────────────────── *
 * Dedup: păstrează cel cu confidence mai mare (key = name+orientation+type)
 * ────────────────────────────────────────────────────────────────────── */
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1, inferred: 0 };

export function dedupElements(elements, keyFn) {
  if (!Array.isArray(elements) || elements.length === 0) return [];
  const map = new Map();
  for (const el of elements) {
    if (!el) continue;
    const key = keyFn(el);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, el);
      continue;
    }
    const rNew = CONFIDENCE_RANK[normalizeConfidence(el.confidence)] ?? 1;
    const rOld = CONFIDENCE_RANK[normalizeConfidence(existing.confidence)] ?? 1;
    if (rNew > rOld) map.set(key, el);
  }
  return Array.from(map.values());
}

const opaqueKey = (el) => `${el.type || "PE"}|${el.orientation || ""}|${el.name || ""}`;
const glazingKey = (el) => `${el.orientation || ""}|${el.name || ""}|${el.area || ""}`;
const bridgeKey = (br) => `${br.type || ""}|${br.name || ""}|${br.length || ""}`;

export function mergeResults(...results) {
  const all = results.filter(Boolean);
  return {
    opaqueElements: dedupElements(
      all.flatMap((r) => r.opaqueElements || []),
      opaqueKey,
    ),
    glazingElements: dedupElements(
      all.flatMap((r) => r.glazingElements || []),
      glazingKey,
    ),
    thermalBridges: dedupElements(
      all.flatMap((r) => r.thermalBridges || []),
      bridgeKey,
    ),
    building: all.find((r) => r?.building)?.building || null,
    confidence: all.find((r) => r?.confidence)?.confidence || "medium",
    notes: all.map((r) => r.notes).filter(Boolean).join(" · "),
    assumptions: all.flatMap((r) => r.assumptions || []),
    source: all.map((r) => r.source).filter(Boolean).join(", "),
  };
}

/* ────────────────────────────────────────────────────────────────────── *
 * Sanitizare envelope: elimină elemente fără arie / nepotrivite
 * ────────────────────────────────────────────────────────────────────── */
function sanitizeEnvelope(raw) {
  if (!raw) return null;
  const out = {
    opaqueElements: Array.isArray(raw.opaqueElements) ? raw.opaqueElements : [],
    glazingElements: Array.isArray(raw.glazingElements) ? raw.glazingElements : [],
    thermalBridges: Array.isArray(raw.thermalBridges) ? raw.thermalBridges : [],
    building: raw.building || null,
    notes: raw.notes || "",
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    confidence: normalizeConfidence(raw.confidence),
  };
  out.opaqueElements = out.opaqueElements
    .filter((el) => el && parseFloat(el.area) > 0)
    .map((el) => ({ ...el, confidence: normalizeConfidence(el.confidence) }));
  out.glazingElements = out.glazingElements
    .filter((el) => el && parseFloat(el.area) > 0)
    .map((el) => ({ ...el, confidence: normalizeConfidence(el.confidence) }));
  out.thermalBridges = out.thermalBridges
    .filter((br) => br && parseFloat(br.psi) > 0)
    .map((br) => ({ ...br, confidence: normalizeConfidence(br.confidence) }));
  return out;
}

/* ────────────────────────────────────────────────────────────────────── *
 * Extract from image (fațadă / planșă) → POST /api/import-document
 * ────────────────────────────────────────────────────────────────────── */
export async function extractFromImage(file, hintMode = "facade") {
  if (!file) throw new Error("Fișier lipsă");
  const t0 = Date.now();
  let success = false;
  let elementsCount = 0;
  let errorMsg;
  try {
    const compressed = await compressIfNeeded(file);
    const base64 = await fileToBase64(compressed);
    const isPdf = file.type === "application/pdf";
    const fileType = isPdf ? "drawing" : hintMode === "drawing" ? "drawing" : "facade";
    const res = await fetch("/api/import-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileType,
        fileData: base64,
        mimeType: file.type,
      }),
    });
    if (!res.ok) {
      errorMsg = `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }
    const payload = await res.json();
    const sanitized = sanitizeEnvelope(payload.data);
    if (!sanitized) throw new Error("Răspuns AI invalid");
    elementsCount =
      sanitized.opaqueElements.length +
      sanitized.glazingElements.length +
      sanitized.thermalBridges.length;
    success = true;
    return {
      ...sanitized,
      source: hintMode === "drawing" ? "Planșă PDF AI" : "Fotografie fațadă AI",
    };
  } catch (err) {
    errorMsg = err?.message || "Eroare necunoscută";
    throw err;
  } finally {
    logAIEvent({
      intent: hintMode === "drawing" ? "drawing-vision" : "facade-vision",
      fileType: file.type,
      latencyMs: Date.now() - t0,
      success,
      elementsCount,
      errorMsg,
    });
  }
}

/* ────────────────────────────────────────────────────────────────────── *
 * Extract from text (chat AI) → POST /api/ai-assistant intent=envelope-fill
 * ────────────────────────────────────────────────────────────────────── */
export async function extractFromText(text, building = null) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text gol");
  }
  const t0 = Date.now();
  let success = false;
  let elementsCount = 0;
  let errorMsg;
  try {
    const res = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: text.trim(),
        intent: "envelope-fill",
        context: building ? { building } : undefined,
      }),
    });
    if (!res.ok) {
      errorMsg = `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }
    const payload = await res.json();
    if (payload.error) {
      errorMsg = payload.answer || "Eroare AI";
      throw new Error(errorMsg);
    }
    // Răspunsul AI conține JSON inline → extragem
    const answer = payload.answer || "";
    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      errorMsg = "AI nu a returnat JSON valid";
      throw new Error(errorMsg);
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const sanitized = sanitizeEnvelope(parsed);
    if (!sanitized) throw new Error("Schema AI invalidă");
    elementsCount =
      sanitized.opaqueElements.length +
      sanitized.glazingElements.length +
      sanitized.thermalBridges.length;
    success = true;
    return { ...sanitized, source: "Chat AI text/voce" };
  } catch (err) {
    errorMsg = errorMsg || err?.message || "Eroare necunoscută";
    throw err;
  } finally {
    logAIEvent({
      intent: "envelope-fill",
      fileType: "text",
      latencyMs: Date.now() - t0,
      success,
      elementsCount,
      errorMsg,
    });
  }
}

/* ────────────────────────────────────────────────────────────────────── *
 * Extract from file (auto-detect MIME) → ramifică
 *  - image/* → extractFromImage(facade)
 *  - application/pdf → extractFromImage(drawing)
 *  - .ifc / .gbxml / .csv / .json → DELEGATE legacy parser (return marker)
 * ────────────────────────────────────────────────────────────────────── */
export async function extractFromFile(file) {
  if (!file) throw new Error("Fișier lipsă");
  const name = (file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() : "";
  const mime = file.type || "";

  if (mime.startsWith("image/")) {
    return { envelope: await extractFromImage(file, "facade"), delegated: null };
  }
  if (mime === "application/pdf") {
    return { envelope: await extractFromImage(file, "drawing"), delegated: null };
  }
  if (ext === "ifc" || ext === "gbxml" || ext === "xml") {
    return { envelope: null, delegated: "ifc", file };
  }
  if (ext === "csv") {
    return { envelope: null, delegated: "csv", file };
  }
  if (ext === "json") {
    return { envelope: null, delegated: "json", file };
  }
  throw new Error(`Tip fișier nesuportat: ${ext || mime || "necunoscut"}`);
}

/* ────────────────────────────────────────────────────────────────────── *
 * Extract from paste (clipboard) → ramifică prin pasteRouter
 * ────────────────────────────────────────────────────────────────────── */
export async function extractFromPaste(clipboardData, building = null) {
  if (!clipboardData) throw new Error("Clipboard gol");
  const items = Array.from(clipboardData.items || []);
  // Caută întâi imagine
  const imageItem = items.find((it) => it.type?.startsWith("image/"));
  if (imageItem) {
    const file = imageItem.getAsFile();
    if (file) {
      return { envelope: await extractFromImage(file, "facade"), source: "paste-image" };
    }
  }
  // Apoi text
  const textItem = items.find((it) => it.type === "text/plain");
  if (textItem) {
    return new Promise((resolve, reject) => {
      textItem.getAsString(async (text) => {
        try {
          const envelope = await extractFromText(text, building);
          logAIEvent({
            intent: "paste-route",
            fileType: "text",
            success: true,
            elementsCount:
              envelope.opaqueElements.length +
              envelope.glazingElements.length +
              envelope.thermalBridges.length,
          });
          resolve({ envelope, source: "paste-text" });
        } catch (err) {
          logAIEvent({
            intent: "paste-route",
            fileType: "text",
            success: false,
            errorMsg: err?.message,
          });
          reject(err);
        }
      });
    });
  }
  throw new Error("Clipboard nu conține imagine sau text");
}

/* ────────────────────────────────────────────────────────────────────── *
 * Batch processing: 1-4 imagini fațadă paralele cu Promise.allSettled
 * ────────────────────────────────────────────────────────────────────── */
export async function extractFromImageBatch(files, hintMode = "facade") {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Lipsă fișiere pentru batch");
  }
  const results = await Promise.allSettled(
    files.map((f) => extractFromImage(f, hintMode)),
  );
  const successes = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  const failures = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason?.message || "necunoscut");
  if (successes.length === 0) {
    throw new Error(`Toate ${files.length} imagini au eșuat: ${failures.join("; ")}`);
  }
  return {
    ...mergeResults(...successes),
    batchTotal: files.length,
    batchSuccess: successes.length,
    batchFailures: failures,
  };
}

export const __testing__ = {
  MAX_IMAGE_BYTES,
  COMPRESSION_TARGET_MB,
  sanitizeEnvelope,
  opaqueKey,
  glazingKey,
  bridgeKey,
};
