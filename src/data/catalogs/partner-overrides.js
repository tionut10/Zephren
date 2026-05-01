// ===============================================================
// PARTNER OVERRIDES — localStorage layer pentru activare parteneriate
// Sprint P2 — 30 apr 2026
// ===============================================================
//
// Brands-registry.json este static asset (JSON). Pentru activare instant a
// unui parteneriat fără commit + deploy, folosim un strat localStorage care
// sub-clasează valorile din JSON.
//
// FLUX:
//   1. Admin (proprietar Zephren) deschide BrandPartnersAdmin.jsx
//   2. Setează partnerStatus='active' + partnerSince + partnerTier + URL afiliat
//   3. Click "Salvează" → scriere în localStorage cheia 'zephren_partner_overrides'
//   4. Helper-urile (getActivePartners, getActivePartnersForEntry, etc.) merge
//      automat overrides peste JSON-ul de bază
//   5. UI-ul reflectă instant: badge '🤝', sortare prioritar, tooltip cu link afiliat
//
// EXPORT: admin poate descărca un patch JSON cu overrides curente, util pentru
// promovare la production (commit ulterior în brands-registry.json).
//
// IMPORT: admin poate importa CSV cu overrides batch (util pentru update masiv
// post-parteneriate exclusive).

const STORAGE_KEY = "zephren_partner_overrides";
const TELEMETRY_KEY = "zephren_partner_telemetry";

/**
 * Schema override:
 * {
 *   "viessmann": {
 *     "partnerStatus": "active",
 *     "partnerSince": "2026-08-15",
 *     "partnerTier": "premium",
 *     "affiliateUrl": "https://zephren.ro/go/viessmann",
 *     "contactEmail": "vanzari@viessmann.ro"
 *   },
 *   ...
 * }
 */

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

/**
 * Returnează toate overrides salvate.
 * @returns {Object} mapping brandId → override fields
 */
export function getOverrides() {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Setează / actualizează override pentru un brand.
 * @param {string} brandId
 * @param {Object} fields - {partnerStatus, partnerSince, partnerTier, affiliateUrl, contactEmail}
 */
export function setOverride(brandId, fields) {
  const storage = getStorage();
  if (!storage) return false;
  const all = getOverrides();
  all[brandId] = { ...(all[brandId] || {}), ...fields };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/**
 * Șterge override-ul pentru un brand (revine la valoarea din JSON).
 * @param {string} brandId
 */
export function clearOverride(brandId) {
  const storage = getStorage();
  if (!storage) return false;
  const all = getOverrides();
  delete all[brandId];
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/**
 * Șterge toate overrides.
 */
export function clearAllOverrides() {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Aplică overrides peste un brand din registry.
 * @param {Object} brand - din brands-registry.json
 * @returns {Object} brand cu override merged
 */
export function applyOverride(brand) {
  if (!brand) return brand;
  const all = getOverrides();
  const ovr = all[brand.id];
  if (!ovr) return brand;
  return { ...brand, ...ovr };
}

/**
 * Aplică overrides peste o listă de brands.
 * @param {Array} brands
 * @returns {Array} brands cu overrides merged
 */
export function applyOverridesAll(brands) {
  return brands.map(applyOverride);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT / IMPORT JSON pentru promovare overrides la production
// ═══════════════════════════════════════════════════════════════

/**
 * Exportă overrides ca JSON string formatat (pentru download / promovare manual la production).
 */
export function exportOverridesJson() {
  const all = getOverrides();
  return JSON.stringify(all, null, 2);
}

/**
 * Importă overrides dintr-un JSON string (înlocuiește overrides curente).
 * @param {string} jsonStr
 * @returns {boolean} success
 */
export function importOverridesJson(jsonStr) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// IMPORT CSV pentru update masiv brand-uri
// ═══════════════════════════════════════════════════════════════

/**
 * Parser CSV foarte simplu (acceptă quoted strings cu comma).
 * Format așteptat:
 *   id,partnerStatus,partnerSince,partnerTier,affiliateUrl,contactEmail
 *   viessmann,active,2026-08-15,premium,https://zephren.ro/go/viessmann,vanzari@viessmann.ro
 *
 * @param {string} csv
 * @returns {Array<Object>} entries parse-uite
 */
export function parseCsv(csv) {
  if (!csv || typeof csv !== "string") return [];
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      const val = cells[i];
      obj[h] = val === "" || val === undefined ? null : val;
    });
    return obj;
  });
}

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/**
 * Importă overrides batch din CSV.
 * @param {string} csv
 * @returns {{success: number, errors: Array<{line: number, brandId: string, error: string}>}}
 */
export function importOverridesCsv(csv) {
  const parsed = parseCsv(csv);
  let success = 0;
  const errors = [];
  parsed.forEach((row, idx) => {
    const brandId = row.id;
    if (!brandId) {
      errors.push({ line: idx + 2, brandId: "(missing)", error: "Lipsă ID brand în coloana 'id'" });
      return;
    }
    const fields = {};
    if (row.partnerStatus !== undefined) {
      const valid = ["none", "pending", "active", "discontinued"];
      if (!valid.includes(row.partnerStatus)) {
        errors.push({ line: idx + 2, brandId, error: `partnerStatus invalid: ${row.partnerStatus}` });
        return;
      }
      fields.partnerStatus = row.partnerStatus;
    }
    if (row.partnerSince !== undefined) fields.partnerSince = row.partnerSince;
    if (row.partnerTier !== undefined) {
      if (row.partnerTier !== null && !["basic", "premium", "exclusive"].includes(row.partnerTier)) {
        errors.push({ line: idx + 2, brandId, error: `partnerTier invalid: ${row.partnerTier}` });
        return;
      }
      fields.partnerTier = row.partnerTier;
    }
    if (row.affiliateUrl !== undefined) fields.affiliateUrl = row.affiliateUrl;
    if (row.contactEmail !== undefined) fields.contactEmail = row.contactEmail;
    if (setOverride(brandId, fields)) success++;
    else errors.push({ line: idx + 2, brandId, error: "Eroare scriere localStorage" });
  });
  return { success, errors };
}

/**
 * Exportă overrides curente ca CSV (pentru backup sau diff).
 * @returns {string} CSV
 */
export function exportOverridesCsv() {
  const all = getOverrides();
  const headers = ["id", "partnerStatus", "partnerSince", "partnerTier", "affiliateUrl", "contactEmail"];
  const lines = [headers.join(",")];
  for (const [brandId, ovr] of Object.entries(all)) {
    const row = [
      brandId,
      ovr.partnerStatus ?? "",
      ovr.partnerSince ?? "",
      ovr.partnerTier ?? "",
      ovr.affiliateUrl ?? "",
      ovr.contactEmail ?? "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════
// TELEMETRIE — click pe entries cu parteneri (analitică conversii)
// ═══════════════════════════════════════════════════════════════

/**
 * Înregistrează un click pe un entry cu partener activ.
 * Stocat local; în producție va fi trimis la backend.
 * @param {string} entryId - ID entry catalog
 * @param {Array<string>} partnerBrandIds - IDs brand-uri partenere active
 * @param {string} context - context UI (ex: "Step3.heating.source")
 */
export function logPartnerClick(entryId, partnerBrandIds, context = "") {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(TELEMETRY_KEY) || "[]";
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return false;
    events.push({
      entryId,
      partnerBrandIds: Array.isArray(partnerBrandIds) ? partnerBrandIds : [],
      context,
      timestamp: new Date().toISOString(),
    });
    // Limitează la ultimele 1000 events
    const trimmed = events.slice(-1000);
    storage.setItem(TELEMETRY_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returnează toate evenimentele de click pe entries cu parteneri.
 */
export function getTelemetryEvents() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returnează agregare conversii per brand (count clicks).
 */
export function getTelemetryByBrand() {
  const events = getTelemetryEvents();
  const counts = {};
  for (const ev of events) {
    for (const bid of ev.partnerBrandIds || []) {
      counts[bid] = (counts[bid] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Șterge toate evenimentele telemetrie (după export la backend).
 */
export function clearTelemetry() {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(TELEMETRY_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exportă telemetrie ca CSV pentru analiză externă.
 */
export function exportTelemetryCsv() {
  const events = getTelemetryEvents();
  const headers = ["timestamp", "entryId", "partnerBrandIds", "context"];
  const lines = [headers.join(",")];
  for (const ev of events) {
    const row = [
      ev.timestamp,
      ev.entryId,
      (ev.partnerBrandIds || []).join("|"),
      ev.context || "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}
