/**
 * app-version.js — sursă unică pentru versiunea Zephren afișată în UI și documente.
 *
 * S30A·A5 — Sprint 30 (apr 2026): centralizare versiune după ce S29 a relevat
 * 4 valori distincte hardcodate ("v3.0", "v3.1", "v3.2", "v3.4", "v3.8") prin
 * 5 generatoare PDF/DOCX/XML. Documentul oficial CPE trebuie să fie consistent.
 *
 * Sursă: variabila VITE_APP_VERSION din .env.production (prioritate),
 * altfel fallback v3.5-S30 (Sprint 30 launch).
 *
 * Folosire:
 *   import { APP_VERSION, APP_VERSION_FULL } from "./app-version.js";
 *   doc.text(`Generat cu Zephren ${APP_VERSION}`, ...);
 */

const ENV_VERSION =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_APP_VERSION) ||
  null;

/** Versiunea scurtă afișată în UI (ex: "v4.0").
 * Sprint 8 mai 2026 — bump v3.5 → v4.0 după Sprint Visual-1..8 (brand kit unitar)
 * + Sprint Conformitate P0/P1/P2/P3 (PDF/A-3, PAdES, manifest, dossier bundle).
 */
export const APP_VERSION = ENV_VERSION || "v4.0";

/** Versiunea extinsă cu marca normativă (ex: "v3.5 — Mc 001-2022, ISO 52000-1/NA:2023"). */
export const APP_VERSION_FULL = `${APP_VERSION} — Mc 001-2022, ISO 52000-1/NA:2023, EPBD 2024/1275`;

/** Linie oficială pentru footer documente (ex: "Zephren v3.5 — zephren.energy"). */
export const APP_FOOTER = `Zephren ${APP_VERSION} — zephren.energy`;

export default { APP_VERSION, APP_VERSION_FULL, APP_FOOTER };
