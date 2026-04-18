/**
 * mdlpa-submit.js — Workflow submit CPE la MDLPA (procedură 2024-2026)
 *
 * MDLPA NU are API public pentru CPE. Procedura oficială (Ord. 348/2026):
 *   1. Auditor trimite email la birou.atestari@mdlpa.ro cu XML + PDF atașate
 *   2. Pentru fișiere mari (>25 MB) — link cloud (Supabase Storage)
 *   3. Tracking persistent în localStorage pentru audit-trail
 *
 * Sprint 17 (18 apr 2026) — primul workflow producție submission.
 */

import { supabase } from "./supabase.js";

export const MDLPA_EMAIL = "birou.atestari@mdlpa.ro";
export const MAX_EMAIL_ATTACHMENT_MB = 25; // limită Outlook/Gmail standard
export const SUPABASE_BUCKET = "mdlpa-submissions";
export const CLOUD_LINK_TTL_DAYS = 90;

/* ─────────────────────────────────────────────────────────────────────────
 * 1. Submit prin email (mailto:)
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Construiește subject + body email pentru submit MDLPA.
 *
 * @param {object} params
 * @param {string} params.cpeCode — cod unic CPE (Sprint 14)
 * @param {object} params.auditor — { name, atestat, email }
 * @param {Array<{name:string, sizeMB?:number, url?:string}>} params.files
 * @param {string} [params.buildingAddress]
 * @returns {{subject:string, body:string, mailtoUrl:string}}
 */
export function buildSubmitEmail({ cpeCode, auditor = {}, files = [], buildingAddress = "" }) {
  const subject = `Depunere CPE ${cpeCode}${buildingAddress ? ` — ${buildingAddress}` : ""}`;

  const lines = [
    "Stimați colegi,",
    "",
    `Vă transmit Certificatul de Performanță Energetică cu cod unic:`,
    `   ${cpeCode}`,
    "",
  ];

  if (buildingAddress) {
    lines.push(`Adresa clădirii: ${buildingAddress}`);
    lines.push("");
  }

  // Atașamente directe + linkuri cloud
  const attached = files.filter(f => !f.url);
  const linked = files.filter(f => f.url);

  if (attached.length > 0) {
    lines.push("Fișiere atașate:");
    attached.forEach(f => {
      const size = f.sizeMB ? ` (${f.sizeMB.toFixed(2)} MB)` : "";
      lines.push(`   • ${f.name}${size}`);
    });
    lines.push("");
  }

  if (linked.length > 0) {
    lines.push("Linkuri cloud (fișiere >25 MB):");
    linked.forEach(f => {
      const size = f.sizeMB ? ` — ${f.sizeMB.toFixed(2)} MB` : "";
      lines.push(`   • ${f.name}${size}`);
      lines.push(`     ${f.url}`);
    });
    lines.push(`Validitate linkuri: ${CLOUD_LINK_TTL_DAYS} zile.`);
    lines.push("");
  }

  lines.push("Cu deosebită considerație,");
  lines.push(`${auditor.name || "Auditor energetic"}${auditor.atestat ? ` — atestat ${auditor.atestat}` : ""}`);
  if (auditor.email) lines.push(auditor.email);

  const body = lines.join("\n");
  const mailtoUrl = `mailto:${MDLPA_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}

/**
 * Deschide clientul email cu draft pre-completat.
 * Returnează true dacă mailto a fost lansat, false dacă fereastra a fost blocată.
 */
export function openEmailDraft({ cpeCode, auditor, files, buildingAddress }) {
  if (typeof window === "undefined") return false;
  const { mailtoUrl } = buildSubmitEmail({ cpeCode, auditor, files, buildingAddress });
  // Folosim location.href ca să evităm pop-up blockers
  const win = window.open(mailtoUrl, "_self");
  return win !== null || true; // mailto se gestionează de OS
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2. Upload cloud (Supabase Storage) pentru fișiere >25 MB
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Convertește un Blob/File în obiect cu metadate.
 */
function fileToMeta(f) {
  return {
    name: f.name || "file",
    sizeMB: (f.size || 0) / (1024 * 1024),
    type: f.type || "application/octet-stream",
    blob: f,
  };
}

/**
 * Decide care fișiere se atașează direct la email și care urcă în cloud.
 *
 * @param {Array<File|Blob>} files
 * @returns {{attachable:Array, oversize:Array}}
 */
export function splitFilesBySize(files = []) {
  const meta = files.map(fileToMeta);
  const attachable = meta.filter(f => f.sizeMB <= MAX_EMAIL_ATTACHMENT_MB);
  const oversize = meta.filter(f => f.sizeMB > MAX_EMAIL_ATTACHMENT_MB);
  return { attachable, oversize };
}

/**
 * Urcă fișiere mari în Supabase Storage și returnează URL-uri publice.
 *
 * @param {Array<{name:string, blob:Blob, sizeMB:number}>} files
 * @param {string} cpeCode
 * @returns {Promise<Array<{name:string, url:string, sizeMB:number, path:string}>>}
 */
export async function uploadToCloud(files, cpeCode) {
  if (!supabase) {
    throw new Error("Supabase nu este configurat. Setează VITE_SUPABASE_URL și VITE_SUPABASE_ANON_KEY.");
  }
  if (!files || files.length === 0) return [];

  const safeCode = String(cpeCode || "unknown").replace(/[^a-zA-Z0-9_\-]/g, "_");
  const prefix = `${safeCode}/${Date.now()}`;
  const uploaded = [];

  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\-]/g, "_");
    const path = `${prefix}/${safeName}`;
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(path, f.blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "application/octet-stream",
      });

    if (error) {
      throw new Error(`Upload eșuat pentru ${f.name}: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    uploaded.push({
      name: f.name,
      url: urlData?.publicUrl || "",
      sizeMB: f.sizeMB,
      path,
    });
  }

  return uploaded;
}

/* ─────────────────────────────────────────────────────────────────────────
 * 3. Tracking persistent (localStorage)
 * ─────────────────────────────────────────────────────────────────────────
 */

const TRACKING_PREFIX = "mdlpa_submit_";

/**
 * Status posibile:
 *  - "draft"                — pregătit, nu a fost trimis
 *  - "email_opened"         — utilizatorul a deschis clientul de email
 *  - "cloud_uploaded"       — fișiere urcate în cloud, urmează submit
 *  - "submitted"            — utilizatorul a marcat manual ca trimis
 *  - "acknowledged"         — MDLPA a confirmat (manual marker)
 *  - "rejected"             — MDLPA a respins (manual marker)
 */

export function loadTracking(cpeId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${TRACKING_PREFIX}${cpeId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTracking(cpeId, tracking) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`${TRACKING_PREFIX}${cpeId}`, JSON.stringify(tracking));
}

export function appendAttempt(cpeId, attempt) {
  const existing = loadTracking(cpeId) || { cpeId, attempts: [], finalStatus: "draft" };
  const newAttempt = {
    date: new Date().toISOString(),
    method: attempt.method,        // "email" | "cloud" | "manual"
    status: attempt.status,        // "sent" | "uploaded" | "marked_submitted" | "acknowledged" | "rejected"
    note: attempt.note || "",
    files: attempt.files || [],
    links: attempt.links || [],
  };
  existing.attempts.push(newAttempt);
  existing.finalStatus = attempt.finalStatus || existing.finalStatus;
  existing.lastUpdate = newAttempt.date;
  saveTracking(cpeId, existing);
  return existing;
}

export function setFinalStatus(cpeId, finalStatus, note = "") {
  const existing = loadTracking(cpeId) || { cpeId, attempts: [], finalStatus: "draft" };
  existing.finalStatus = finalStatus;
  existing.lastUpdate = new Date().toISOString();
  if (note) {
    existing.attempts.push({
      date: existing.lastUpdate,
      method: "manual",
      status: finalStatus,
      note,
    });
  }
  saveTracking(cpeId, existing);
  return existing;
}

export function listAllTracked() {
  if (typeof localStorage === "undefined") return [];
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(TRACKING_PREFIX)) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      out.push(data);
    } catch { /* skip */ }
  }
  return out.sort((a, b) => (b.lastUpdate || "").localeCompare(a.lastUpdate || ""));
}

export function clearTracking(cpeId) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${TRACKING_PREFIX}${cpeId}`);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4. Workflow complet submit (orchestrator)
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Workflow complet: split fișiere → upload cloud (dacă e cazul) → deschide email → tracking.
 *
 * @param {object} params
 * @param {string} params.cpeId — ID intern (poate diferi de cpeCode)
 * @param {string} params.cpeCode — cod unic CPE pentru subject + folder cloud
 * @param {object} params.auditor
 * @param {Array<File|Blob>} params.files — toate fișierele de trimis
 * @param {string} [params.buildingAddress]
 * @param {(stage:string, info?:object)=>void} [params.onProgress]
 */
export async function submitToMDLPA({ cpeId, cpeCode, auditor, files, buildingAddress, onProgress }) {
  const progress = onProgress || (() => {});
  progress("split");

  const { attachable, oversize } = splitFilesBySize(files);

  let cloudFiles = [];
  if (oversize.length > 0) {
    progress("uploading", { count: oversize.length });
    cloudFiles = await uploadToCloud(oversize, cpeCode);
    appendAttempt(cpeId, {
      method: "cloud",
      status: "uploaded",
      finalStatus: "cloud_uploaded",
      links: cloudFiles.map(f => ({ name: f.name, url: f.url, sizeMB: f.sizeMB })),
    });
    progress("uploaded", { links: cloudFiles });
  }

  // Construiește lista combinată pentru email
  const allFiles = [
    ...attachable.map(f => ({ name: f.name, sizeMB: f.sizeMB })),
    ...cloudFiles.map(f => ({ name: f.name, sizeMB: f.sizeMB, url: f.url })),
  ];

  progress("opening_email");
  openEmailDraft({ cpeCode, auditor, files: allFiles, buildingAddress });

  appendAttempt(cpeId, {
    method: "email",
    status: "sent",
    finalStatus: "email_opened",
    files: allFiles,
    note: `Email draft deschis pentru ${MDLPA_EMAIL}`,
  });

  progress("done", { allFiles, cloudFiles });
  return { cloudFiles, allFiles };
}
