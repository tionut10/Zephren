// ═══════════════════════════════════════════════════════════════
// PROJECT CLONE — C2 Sprint Optimizări 16 mai 2026
// ═══════════════════════════════════════════════════════════════
//
// Permite auditorului să pornească un proiect nou de la zero pornind
// de la un proiect existent similar (ex: alt bloc P+4 1970s) ca punct
// de start. Reduce timpul Pas 1-4 de la ~45 min la ~10 min pentru
// proiecte cu pattern similar (foarte comun în portofoliul auditor).
//
// Fields RESETATE (per cerințe legale + integritate Mc 001-2022):
// - cpeCode / cpeCodeManual    — unic per CPE (regenerat)
// - auditor.signature          — auditorul poate refolosi sau schimba
// - auditor.signatureDate      — dată nouă audit
// - passport.passportId        — UUID v5 nou la prima emisiune EPBD
// - passport.history           — nou audit trail
// - documentUploads            — documentele fizice per proiect
//
// Fields PĂSTRATE (punct de start):
// - building.* (geometrie, materiale, anvelopă, ferestre, BCA etc.)
// - heating / acm / cooling / ventilation / lighting / RES (instalații)
// - thermalBridges (catalog punți)
// - opaqueElements / glazingElements (componente)
// - tot restul calc state
// ═══════════════════════════════════════════════════════════════

const CLONE_NAME_PREFIX = "Clonă din";

/**
 * Pure function — clonează datele unui proiect cu reset selectiv.
 * Folosește deep clone via JSON (toate datele Zephren sunt JSON-serializable).
 *
 * @param {object} sourceData — payload complet salvat (cu meta + building + ...)
 * @param {string} newId       — ID nou pentru clonă (format `p<base36>`)
 * @param {string} [sourceName] — nume original pentru afișare în meta clonă
 * @returns {object} cloned data, gata de salvare în storage
 */
export function cloneProjectData(sourceData, newId, sourceName) {
  if (!sourceData || typeof sourceData !== "object") {
    throw new Error("cloneProjectData: sourceData invalid");
  }
  if (!newId) {
    throw new Error("cloneProjectData: newId obligatoriu");
  }

  // Deep clone via JSON round-trip (sigur pentru data Zephren, no Date/Map/Set)
  const cloned = JSON.parse(JSON.stringify(sourceData));

  const today = new Date().toISOString().slice(0, 10);
  const nowISO = new Date().toISOString();
  const originalName = sourceName || cloned.meta?.name || cloned.building?.address || "proiect";

  // ─── Meta reset cu telemetrie clonare ───────────────────────
  cloned.meta = {
    ...(cloned.meta || {}),
    name: `${CLONE_NAME_PREFIX} ${originalName}`,
    date: today,
    id: newId,
    clonedFrom: sourceData.meta?.id || null,
    clonedAt: nowISO,
  };

  // ─── Building: reset cod CPE (unic per CPE per Mc 001 §10) ──
  if (cloned.building && typeof cloned.building === "object") {
    delete cloned.building.cpeCode;
    delete cloned.building.cpeCodeManual;
    // Adresă păstrată — auditorul probabil schimbă manual
  }

  // ─── Auditor: reset semnătură (poate refolosi sau schimba) ──
  if (cloned.auditor && typeof cloned.auditor === "object") {
    delete cloned.auditor.signature;
    delete cloned.auditor.signatureDate;
    delete cloned.auditor.signatureBase64;
    delete cloned.auditor.signedDocument;
    delete cloned.auditor.qtspToken;
  }

  // ─── Passport: reset (nou pașaport per EPBD Anexa VIII) ─────
  if (cloned.passport && typeof cloned.passport === "object") {
    cloned.passport = {
      ...cloned.passport,
      passportId: null,    // UUID v5 regenerat la prima emisiune
      version: 0,           // versiune nouă
      history: [],          // audit trail nou
      status: "draft",
    };
  }

  // ─── Documente fizice: reset (per proiect) ──────────────────
  delete cloned.documentUploads;
  delete cloned.documentSlots;
  delete cloned.uploadedFiles;

  // ─── CPE precedent (deja folosit pentru prefill): reset ─────
  delete cloned.priorAuditData;
  delete cloned.priorCpeMetadata;

  // ─── Reset orice cache calc dinamic (va fi recomputat) ──────
  delete cloned.lastCalculatedAt;
  delete cloned.cachedResults;

  return cloned;
}

/**
 * Async helper — citește proiect din storage, clonează, salvează clona.
 *
 * @param {string} sourceId — ID proiect sursă (fără prefix `ep-proj:`)
 * @param {string} [sourceName] — nume original pentru afișare
 * @param {object} storage  — window.storage API (cu .get / .set)
 * @returns {Promise<{newId: string, clonedData: object}>}
 */
export async function cloneProjectToStorage(sourceId, sourceName, storage) {
  if (!storage) throw new Error("Storage indisponibil");
  if (!sourceId) throw new Error("sourceId obligatoriu");

  // Read source
  const sourceKey = "ep-proj:" + sourceId;
  const r = await storage.get(sourceKey);
  if (!r || !r.value) {
    throw new Error(`Proiect sursă negăsit: ${sourceId}`);
  }

  let sourceData;
  try {
    sourceData = JSON.parse(r.value);
  } catch (e) {
    throw new Error("Proiect sursă corupt: nu se poate parsa JSON");
  }

  // Generate new ID (matches energy-calc.jsx pattern `p<base36-timestamp>`)
  const newId = "p" + Date.now().toString(36);
  const newKey = "ep-proj:" + newId;

  // Clone data
  const clonedData = cloneProjectData(sourceData, newId, sourceName);

  // Save to storage
  await storage.set(newKey, JSON.stringify(clonedData));

  return { newId, clonedData };
}

/**
 * Helper pentru afișare nume sursă în UI/banner clonă.
 * Extrage numele original chiar dacă e prefixat cu „Clonă din".
 */
export function extractOriginalName(clonedName) {
  if (!clonedName) return "";
  if (clonedName.startsWith(CLONE_NAME_PREFIX + " ")) {
    return clonedName.slice(CLONE_NAME_PREFIX.length + 1);
  }
  return clonedName;
}
