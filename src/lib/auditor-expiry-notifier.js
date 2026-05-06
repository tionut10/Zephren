/**
 * auditor-expiry-notifier.js — Notificări expirare atestat + drept practică auditor.
 *
 * Sprint Conformitate P2-16 (7 mai 2026).
 *
 * Atestat MDLPA expiră 5 ani conform Art. 30 alin. 3 Ord. 348/2026.
 * Fereastra renewal: 30-90 zile înainte de expirare (Art. 31 alin. 1).
 *
 * Folosește calc/auditor-attestation-validity.js (existing) pentru calc days_until.
 * Adaugă layer notificări UX:
 *   - Severity levels (verde/amber/red) cu thresholds custom
 *   - Notification text RO + EN
 *   - Sidebar banner config
 *   - Email notification payload (pentru Vercel cron + Resend, post-implementare)
 */

/**
 * Severity thresholds (zile rămase până la expirare).
 */
export const EXPIRY_THRESHOLDS = Object.freeze({
  CRITICAL: 30,    // < 30 zile — blocare parțială (banner red, NU permite operațiuni noi)
  URGENT: 90,      // 30-90 — fereastra renewal Art. 31
  WARNING: 180,    // 90-180 — pregătire renewal
  INFO: 365,       // 180-365 — informare generală
  // > 365 — niciun banner
});

/**
 * Calculează zilele rămase până la expirare.
 *
 * @param {string|Date} attestationIssueDate
 * @param {number} [validityYears=5]
 * @param {Date} [now=new Date()]
 * @returns {{daysUntilExpiry:number, expiryDate:Date, isExpired:boolean}}
 */
export function calcDaysUntilExpiry(attestationIssueDate, validityYears = 5, now = new Date()) {
  if (!attestationIssueDate) {
    return { daysUntilExpiry: null, expiryDate: null, isExpired: null };
  }
  const issue = attestationIssueDate instanceof Date ? attestationIssueDate : new Date(attestationIssueDate);
  if (isNaN(issue.getTime())) {
    return { daysUntilExpiry: null, expiryDate: null, isExpired: null };
  }
  const expiry = new Date(issue);
  expiry.setFullYear(expiry.getFullYear() + validityYears);
  const msPerDay = 86400000;
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / msPerDay);
  return {
    daysUntilExpiry,
    expiryDate: expiry,
    isExpired: daysUntilExpiry < 0,
  };
}

/**
 * Determină severity level pe baza zilelor rămase.
 *
 * @param {number} daysUntilExpiry
 * @returns {"expired"|"critical"|"urgent"|"warning"|"info"|"ok"}
 */
export function getExpirySeverity(daysUntilExpiry) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) return "ok";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < EXPIRY_THRESHOLDS.CRITICAL) return "critical";
  if (daysUntilExpiry < EXPIRY_THRESHOLDS.URGENT) return "urgent";
  if (daysUntilExpiry < EXPIRY_THRESHOLDS.WARNING) return "warning";
  if (daysUntilExpiry < EXPIRY_THRESHOLDS.INFO) return "info";
  return "ok";
}

/**
 * Construiește notificare completă pentru UI / email.
 *
 * @param {object} args
 * @param {string|Date} args.attestationIssueDate
 * @param {string} [args.auditorName]
 * @param {string} [args.atestat]
 * @param {number} [args.validityYears=5]
 * @param {string} [args.lang="RO"]
 * @returns {{
 *   severity: string,
 *   daysUntilExpiry: number|null,
 *   expiryDate: string|null,
 *   bannerColor: string,
 *   bannerText: string,
 *   actionRequired: string|null,
 *   shouldBlockOperations: boolean,
 *   emailPayload: object|null
 * }}
 */
export function buildExpiryNotification({
  attestationIssueDate,
  auditorName = "Auditor",
  atestat = "—",
  validityYears = 5,
  lang = "RO",
} = {}) {
  const { daysUntilExpiry, expiryDate, isExpired } = calcDaysUntilExpiry(attestationIssueDate, validityYears);
  const severity = getExpirySeverity(daysUntilExpiry);

  const colors = {
    expired: "red",
    critical: "red",
    urgent: "amber",
    warning: "amber",
    info: "blue",
    ok: "green",
  };

  const isRO = lang === "RO";
  let bannerText = "";
  let actionRequired = null;
  let shouldBlockOperations = false;

  switch (severity) {
    case "expired":
      bannerText = isRO
        ? `🚫 Atestat MDLPA EXPIRAT cu ${Math.abs(daysUntilExpiry)} zile (${auditorName}). Nu puteți emite documente cu valoare juridică.`
        : `🚫 MDLPA attestation EXPIRED ${Math.abs(daysUntilExpiry)} days ago (${auditorName}). Cannot issue legally valid documents.`;
      actionRequired = isRO
        ? "Inițiați procedura de re-atestare URGENT (examen + curs perfecționare)."
        : "Initiate re-attestation procedure URGENTLY (exam + refresher course).";
      shouldBlockOperations = true;
      break;
    case "critical":
      bannerText = isRO
        ? `⚠️ Atestat MDLPA expiră în ${daysUntilExpiry} zile (${atestat}). Acțiune urgentă necesară!`
        : `⚠️ MDLPA attestation expires in ${daysUntilExpiry} days (${atestat}). Urgent action required!`;
      actionRequired = isRO
        ? "Aplicați IMEDIAT pentru renewal (formularul MDLPA)."
        : "Apply NOW for renewal (MDLPA form).";
      shouldBlockOperations = false; // soft warning, NU blocaj total
      break;
    case "urgent":
      bannerText = isRO
        ? `🟡 Atestat expiră în ${daysUntilExpiry} zile. Sunteți în fereastra de renewal (30-90 zile).`
        : `🟡 Attestation expires in ${daysUntilExpiry} days. You are in renewal window (30-90 days).`;
      actionRequired = isRO
        ? "Pregătiți documentele pentru renewal (Art. 31 alin. 1 Ord. 348/2026)."
        : "Prepare renewal documents (Art. 31 par. 1 Ord. 348/2026).";
      break;
    case "warning":
      bannerText = isRO
        ? `📅 Atestat expiră în ${daysUntilExpiry} zile (~${Math.round(daysUntilExpiry / 30)} luni).`
        : `📅 Attestation expires in ${daysUntilExpiry} days (~${Math.round(daysUntilExpiry / 30)} months).`;
      actionRequired = isRO
        ? "Verificați-vă orele de perfecționare profesională (CPD)."
        : "Check your professional development hours (CPD).";
      break;
    case "info":
      bannerText = isRO
        ? `ℹ️ Atestat valid încă ${daysUntilExpiry} zile (~${Math.round(daysUntilExpiry / 30)} luni).`
        : `ℹ️ Attestation valid for ${daysUntilExpiry} more days.`;
      break;
    default:
      bannerText = "";
  }

  // Email payload (pentru Vercel cron + Resend, post-P2-16-bis)
  const emailPayload = (severity === "critical" || severity === "expired" || severity === "urgent")
    ? {
        to: null, // populat de caller cu auditor.email
        subject: isRO
          ? `[Zephren] ${severity === "expired" ? "Atestat EXPIRAT" : "Atestat expiră curând"} — acțiune necesară`
          : `[Zephren] ${severity === "expired" ? "Attestation EXPIRED" : "Attestation expiring soon"}`,
        bodyText: bannerText + "\n\n" + (actionRequired || ""),
        priority: severity === "expired" || severity === "critical" ? "high" : "normal",
      }
    : null;

  return {
    severity,
    daysUntilExpiry,
    expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
    bannerColor: colors[severity] || "gray",
    bannerText,
    actionRequired,
    shouldBlockOperations,
    emailPayload,
  };
}
