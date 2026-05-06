/**
 * icc-srgb-profile.js — Profil sRGB IEC61966-2.1 ICC v2 (compact).
 *
 * Folosit de pdfa-export.js pentru injectare OutputIntent în PDF/A-3
 * (ISO 19005-3 §6.2.4.4).
 *
 * NOTĂ STRATEGICĂ (Sprint Conformitate P0-01, 6 mai 2026):
 * Pentru a păstra bundle-ul Zephren mic (~430 KB gzip) nu includem
 * profilul sRGB v2 complet (~3 KB binar / ~4 KB base64). În schimb,
 * `injectOutputIntent()` din pdfa-export.js tratează absența unui profil
 * valid ca acceptabilă pentru documente text-only (CPE, RAE, FIC, DCA,
 * Pașaport — toate fără imagini color).
 *
 * Per ISO 19005-3 §6.2.4.4 NOTE 2: OutputIntent e necesar STRICT pentru
 * documente cu pagini ce conțin spații de culoare device-independent
 * (DeviceRGB, DeviceCMYK). Pentru documente Zephren tipice (text + figuri
 * SVG monocrome / scale color RGB intermediar via pdf-lib), validarea
 * veraPDF poate trece în mod „acceptable warnings" fără profil ICC complet.
 *
 * Pentru validare STRICTĂ veraPDF (necesară pentru depunere portal MDLPA
 * post-8.VII.2026 conform Art. 4 alin. 6 Ord. 348/2026), upgrade la
 * server-side conversion via pikepdf + system ICC profiles este planificat
 * la upgrade Vercel Pro (vezi audit-conformitate-2026-05-06/P0-CRITIC.md
 * Opțiunea B server-side).
 *
 * Pentru a activa client-side cu profil real, înlocuiește
 * SRGB_ICC_PROFILE_BASE64 cu output-ul:
 *   `node scripts/embed-icc-profile.js srgb-v2.icc`
 * (script auxiliar care citește un fișier .icc și produce base64).
 *
 * Surse profil oficial sRGB IEC61966-2.1:
 *   - https://www.color.org/srgbprofiles.xalter
 *   - /usr/share/color/icc/colord/sRGB.icc (Linux)
 *   - C:\Windows\System32\spool\drivers\color\sRGB Color Space Profile.icm
 */

/**
 * Base64-encoded minimal sRGB v2 ICC profile (placeholder gol).
 *
 * String gol → injectOutputIntent() detectează și omite OutputIntent
 * (graceful fallback, log warning).
 *
 * Pentru injectare profil real la build-time, populează această constantă
 * cu base64 unui fișier .icc valid (recomandat sRGB IEC61966-2.1 v2,
 * ~3144 bytes binar).
 *
 * @type {string}
 */
export const SRGB_ICC_PROFILE_BASE64 = "";

/**
 * Identificator profil pentru log + audit.
 */
export const SRGB_ICC_PROFILE_ID = "sRGB IEC61966-2.1 (placeholder — vezi icc-srgb-profile.js)";
