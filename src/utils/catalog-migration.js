/**
 * Sprint 27 P2.12 — Catalog versioning + migration utility
 *
 * Permite consumatorilor să detecteze că un catalog persistent (ex. localStorage,
 * IndexedDB cache) e mai vechi decât cel curent și să declanșeze re-fetch /
 * re-renderare. NU mutează date — doar raportează și sugerează acțiuni.
 *
 * Format versiune: SemVer (major.minor.patch)
 *  - patch: doar prețuri/labels actualizate (compatibil)
 *  - minor: adăugări entries noi (compatibil)
 *  - major: schimbări breaking în schemă (re-fetch obligatoriu)
 */

import { CATALOG_VERSION as CURRENT_VERSION } from "../data/suggestions-catalog.js";

function _parseSemver(v) {
  if (!v || typeof v !== "string") return null;
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

/**
 * Compară 2 versiuni semver. Returnează -1/0/1.
 */
export function semverCompare(a, b) {
  const A = _parseSemver(a) || { major: 0, minor: 0, patch: 0 };
  const B = _parseSemver(b) || { major: 0, minor: 0, patch: 0 };
  if (A.major !== B.major) return A.major < B.major ? -1 : 1;
  if (A.minor !== B.minor) return A.minor < B.minor ? -1 : 1;
  if (A.patch !== B.patch) return A.patch < B.patch ? -1 : 1;
  return 0;
}

/**
 * Verifică dacă o versiune persistată trebuie migrată la cea curentă.
 *
 * @param {string} savedVersion - Versiunea citită din storage user
 * @param {string} [currentVersion] - Versiunea curentă (default CURRENT_VERSION)
 * @returns {{ migrated: boolean, oldVersion: string, newVersion: string, level: 'major'|'minor'|'patch'|'none' }}
 */
export function migrateCatalogIfNeeded(savedVersion, currentVersion = CURRENT_VERSION) {
  const cmp = semverCompare(savedVersion, currentVersion);
  if (cmp >= 0) {
    return { migrated: false, oldVersion: savedVersion, newVersion: currentVersion, level: "none" };
  }
  const old = _parseSemver(savedVersion) || { major: 0, minor: 0, patch: 0 };
  const cur = _parseSemver(currentVersion) || { major: 0, minor: 0, patch: 0 };
  let level = "patch";
  if (old.major !== cur.major) level = "major";
  else if (old.minor !== cur.minor) level = "minor";
  return { migrated: true, oldVersion: savedVersion, newVersion: currentVersion, level };
}

/**
 * Mesaj UI human-readable pentru utilizator când catalog-ul s-a schimbat.
 */
export function migrationMessage(result, lang = "RO") {
  if (!result.migrated) {
    return lang === "EN"
      ? "Catalog up to date."
      : "Catalogul este la zi.";
  }
  if (result.level === "major") {
    return lang === "EN"
      ? `Catalog updated to v${result.newVersion} — breaking changes; re-evaluate suggestions.`
      : `Catalogul a fost actualizat la v${result.newVersion} — modificări majore; reevaluați sugestiile.`;
  }
  if (result.level === "minor") {
    return lang === "EN"
      ? `Catalog v${result.newVersion} adds new entries (was v${result.oldVersion}).`
      : `Catalogul v${result.newVersion} adaugă entries noi (era v${result.oldVersion}).`;
  }
  return lang === "EN"
    ? `Catalog v${result.newVersion} — price refresh (was v${result.oldVersion}).`
    : `Catalogul v${result.newVersion} — actualizare prețuri (era v${result.oldVersion}).`;
}
