/**
 * Integrare cu registru central pașapoarte renovare MDLPA.
 * Status la 23 apr 2026: API INCĂ NEPUBLICAT (termen EPBD 29 mai 2026).
 * Implementare provizorie: contract JSON + UUID v5 determinist + TODO pt. activare post-ordin.
 *
 * Termen transpunere EPBD 2024/1275: 29 mai 2026.
 * Sprint 20 (23 apr 2026): adăugat UUID v5 determinist pentru identificare
 * pașapoarte/CPE independent de API-ul MDLPA (reduplicare prevenită).
 */

import { v5 as uuidv5 } from "uuid";

export const REGISTRY_CONFIG = {
  enabled: false,
  baseUrl: null, // ex. "https://api.mdlpa.gov.ro/passport/v1" la publicare
  expectedApiVersion: "v1",
  lastChecked: "2026-04-23",
  documentationUrl: "https://mdlpa.gov.ro/passport-api-docs",
};

/**
 * Namespace UUID v5 pentru Zephren (generat deterministic — SHA-1 "zephren.energy" sub OID namespace)
 * Folosit pentru a genera UUID-uri stabile pentru CPE-uri și pașapoarte.
 * Dacă MDLPA publică propriul namespace, se va migra.
 */
export const ZEPHREN_NAMESPACE_CPE = "6b4d8a2e-1f3c-5e7a-9b8d-3c2f1a5e9b4d";      // CPE
export const ZEPHREN_NAMESPACE_PASSPORT = "8c5e9b3f-2a4d-6f8b-acbe-4d3f2a6f0c5e"; // Pașaport renovare

/**
 * Generează UUID v5 determinist pentru un CPE sau Pașaport renovare.
 * Aceeași intrare → același UUID, mereu. Esențial pentru:
 *   - prevenire duplicate la sincronizare MDLPA
 *   - reconciliere CPE ↔ Pașaport ↔ Raport audit (Sprint 17)
 *   - verificare integritate pe termen lung
 *
 * @param {object} params
 * @param {"cpe"|"passport"} params.type — tipul documentului
 * @param {string} params.address — adresa clădirii (stradă, nr, oraș, județ)
 * @param {string} params.cadastralNr — nr cadastral (opțional, crește unicitatea)
 * @param {string} params.auditorCode — codul auditor MLPAT/MDLPA
 * @param {string} params.certDate — data emiterii (YYYY-MM-DD)
 * @returns {string} — UUID v5 format standard
 */
export function generateDocumentUUID({ type = "cpe", address = "", cadastralNr = "", auditorCode = "", certDate = "" }) {
  const namespace = type === "passport" ? ZEPHREN_NAMESPACE_PASSPORT : ZEPHREN_NAMESPACE_CPE;
  // Cheie canonică: normalizată (lowercase, fără spații multiple) pentru stabilitate
  const canonical = [address, cadastralNr, auditorCode, certDate]
    .map(s => String(s || "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return uuidv5(canonical, namespace);
}

/**
 * Verifică dacă un UUID v5 a fost generat din datele date (recomputare + compare)
 * Util pentru validarea integrității pașaportului/CPE la import/re-audit.
 */
export function verifyDocumentUUID(existingUuid, params) {
  return generateDocumentUUID(params) === existingUuid;
}

/**
 * TODO — când API MDLPA e disponibil:
 *   1. POST   /passport          → înregistrare pașaport nou
 *   2. PUT    /passport/{id}     → update pașaport existent
 *   3. GET    /passport/{id}     → fetch pașaport înregistrat
 *   4. DELETE /passport/{id}     → arhivare (admin only)
 */
export async function registerPassport(passport) {
  if (!REGISTRY_CONFIG.enabled || !REGISTRY_CONFIG.baseUrl) {
    return {
      success: false,
      reason: "registry_not_available",
      localOnly: true,
      note: "Registru MDLPA nepublicat oficial. Pașaport salvat doar local.",
    };
  }
  try {
    const res = await fetch(`${REGISTRY_CONFIG.baseUrl}/passport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passport),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      success: true,
      registryId: data.registryId,
      registryUrl: data.url,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { success: false, reason: "network_error", error: err.message };
  }
}

export async function syncPassportWithRegistry(passport) {
  if (!REGISTRY_CONFIG.enabled || !REGISTRY_CONFIG.baseUrl) {
    return { success: false, reason: "registry_not_available" };
  }
  const id = passport?.registryId || passport?.uuid;
  if (!id) return { success: false, reason: "missing_uuid" };
  try {
    const res = await fetch(`${REGISTRY_CONFIG.baseUrl}/passport/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passport),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, registryId: data.registryId || id, syncedAt: new Date().toISOString() };
  } catch (err) {
    return { success: false, reason: "network_error", error: err.message };
  }
}

export async function fetchPassportFromRegistry(passportId) {
  if (!REGISTRY_CONFIG.enabled || !REGISTRY_CONFIG.baseUrl) {
    return { success: false, reason: "registry_not_available" };
  }
  if (!passportId) return { success: false, reason: "missing_uuid" };
  try {
    const res = await fetch(`${REGISTRY_CONFIG.baseUrl}/passport/${encodeURIComponent(passportId)}`);
    if (res.status === 404) return { success: false, reason: "not_found" };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true, passport: await res.json() };
  } catch (err) {
    return { success: false, reason: "network_error", error: err.message };
  }
}

export function getRegistryStatus() {
  return {
    enabled: REGISTRY_CONFIG.enabled,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    lastChecked: REGISTRY_CONFIG.lastChecked,
    note: REGISTRY_CONFIG.enabled
      ? "Registru MDLPA activ — pașapoartele pot fi sincronizate central."
      : "Registru MDLPA încă nepublicat oficial. Pașaportul se salvează doar local până la publicarea API-ului.",
  };
}
