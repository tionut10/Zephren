/**
 * auditor-attestation-validity.js — Sprint v6.2 (27 apr 2026)
 *
 * Calculează valabilitatea dreptului de practică al auditorului energetic și
 * generează alerte pentru cererea de prelungire în fereastra legală.
 *
 * Sursă legală: Ordinul MDLPA nr. 348/2026 (MO 292/14.IV.2026)
 *
 *  Art. 30 alin. (3) — Durata dreptului de practică:
 *    „Dreptul de practică se acordă pe o perioadă de 5 ani de la data emiterii
 *     certificatului de atestare și se poate prelungi din 5 în 5 ani […]."
 *
 *  Art. 31 alin. (1) — Fereastra de prelungire:
 *    „Auditorul […] încarcă în portalul electronic […] cu minimum 30 de zile
 *     înainte de data expirării valabilității legitimației sau, după caz, a
 *     dreptului de practică înscris pe pagina de internet a autorității
 *     competente, dar nu mai devreme de 90 de zile înainte de data expirării
 *     valabilității […]."
 *
 *  Art. 30 alin. (4) — Sancțiuni:
 *    „Exercitarea dreptului de practică de către auditorii energetici pentru
 *     clădiri în afara perioadei de valabilitate a acestuia constituie
 *     contravenție și se sancționează conform prevederilor art. 36 din Legea
 *     nr. 10/1995, republicată […]."
 *
 *  Art. 7 (din ordin, nu din regulament) — Tranziție:
 *    Vechiul Ord. 2237/2010 se abrogă în 180 zile de la 14.IV.2026 = 11.X.2026.
 *    Atestatele emise pe ordinul vechi rămân valabile până la expirarea naturală.
 */

// ── Constante legale ──
export const ATTESTATION_VALIDITY_YEARS = 5;
export const RENEWAL_WINDOW_MIN_DAYS = 30;   // minim 30 zile înainte de expirare
export const RENEWAL_WINDOW_MAX_DAYS = 90;   // dar nu mai devreme de 90 zile

// Data abrogării Ord. 2237/2010 (180 zile lucrătoare de la 14.IV.2026,
// dar legiuitorul folosește „180 de zile" calendaristice → 11 octombrie 2026)
export const ORD_2237_REPEAL_DATE = new Date("2026-10-11T00:00:00.000Z");

// ── Helpers ──
const MS_PER_DAY = 86_400_000;

/**
 * Convertește o intrare flexibilă (ISO string, Date, timestamp) la Date sau null.
 * @param {Date|string|number|null|undefined} input
 * @returns {Date|null}
 */
function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calculează data expirării dreptului de practică (5 ani de la emitere).
 *
 * @param {Date|string|number|null} issueDate - data emiterii atestatului
 * @returns {Date|null}
 */
export function calcExpiryDate(issueDate) {
  const issued = toDate(issueDate);
  if (!issued) return null;
  const exp = new Date(issued.getTime());
  exp.setFullYear(exp.getFullYear() + ATTESTATION_VALIDITY_YEARS);
  return exp;
}

/**
 * Numărul de zile rămase până la expirare (negativ = deja expirat).
 *
 * @param {Date|string|number|null} expiryDate
 * @param {Date} [now=new Date()]
 * @returns {number|null}
 */
export function daysUntilExpiry(expiryDate, now = new Date()) {
  const exp = toDate(expiryDate);
  if (!exp) return null;
  const ref = toDate(now) || new Date();
  return Math.floor((exp.getTime() - ref.getTime()) / MS_PER_DAY);
}

/**
 * Determină statusul atestatului unui auditor.
 *
 * Stări posibile:
 *   - "missing"         — data emiterii lipsește din profil
 *   - "expired"         — atestatul a expirat (interzicere exercitare practică)
 *   - "renewal_urgent"  — < 30 zile rămase (fereastra obligatorie închisă)
 *   - "renewal_window"  — între 30 și 90 zile (fereastra optimă de cerere)
 *   - "active_warning"  — > 90 zile dar < 180 zile (preavizare)
 *   - "active"          — > 180 zile rămase
 *
 * @param {object} args
 * @param {Date|string|null} args.attestationIssueDate
 * @param {Date|string|null} [args.attestationExpiryDate] - opțional, dacă lipsește se calculează din issue
 * @param {Date} [args.now=new Date()]
 * @returns {{
 *   status: string,
 *   severity: "ok"|"info"|"warning"|"blocking",
 *   expiryDate: Date|null,
 *   daysLeft: number|null,
 *   canRenew: boolean,
 *   message: string,
 *   legalRef: string,
 * }}
 */
export function getAttestationStatus({
  attestationIssueDate,
  attestationExpiryDate,
  now = new Date(),
} = {}) {
  let exp = toDate(attestationExpiryDate);
  if (!exp) exp = calcExpiryDate(attestationIssueDate);

  if (!exp) {
    return {
      status: "missing",
      severity: "warning",
      expiryDate: null,
      daysLeft: null,
      canRenew: false,
      message:
        "Data emiterii atestatului auditor lipsește. Adaug-o în profil pentru " +
        "a beneficia de alertele automate de prelungire conform Art. 31 Ord. 348/2026.",
      legalRef: "Art. 30 alin. (3) Ord. MDLPA 348/2026",
    };
  }

  const daysLeft = daysUntilExpiry(exp, now);

  if (daysLeft < 0) {
    return {
      status: "expired",
      severity: "blocking",
      expiryDate: exp,
      daysLeft,
      canRenew: false,
      message:
        `Atestatul a expirat acum ${Math.abs(daysLeft)} zile. ` +
        `Exercitarea practicii fără valabilitate este contravenție conform ` +
        `Art. 30 alin. (4) Ord. 348/2026 și Art. 36 Legea 10/1995.`,
      legalRef: "Art. 30 alin. (4) Ord. MDLPA 348/2026 + Art. 36 L. 10/1995",
    };
  }

  if (daysLeft <= RENEWAL_WINDOW_MIN_DAYS) {
    return {
      status: "renewal_urgent",
      severity: "warning",
      expiryDate: exp,
      daysLeft,
      canRenew: true,
      message:
        `URGENT: ${daysLeft} zile rămase până la expirare. Cererea de prelungire ` +
        `trebuie depusă cu minim 30 zile înainte (Art. 31 alin. (1) Ord. 348/2026).`,
      legalRef: "Art. 31 alin. (1) Ord. MDLPA 348/2026",
    };
  }

  if (daysLeft <= RENEWAL_WINDOW_MAX_DAYS) {
    return {
      status: "renewal_window",
      severity: "info",
      expiryDate: exp,
      daysLeft,
      canRenew: true,
      message:
        `Ești în fereastra optimă de prelungire: ${daysLeft} zile până la expirare. ` +
        `Depune cererea acum prin portalul electronic MDLPA pentru a evita pauza ` +
        `de practică (Art. 31 Ord. 348/2026).`,
      legalRef: "Art. 31 alin. (1) Ord. MDLPA 348/2026",
    };
  }

  if (daysLeft <= 180) {
    return {
      status: "active_warning",
      severity: "info",
      expiryDate: exp,
      daysLeft,
      canRenew: false,
      message:
        `Mai sunt ${daysLeft} zile până la expirare. Fereastra de cerere de ` +
        `prelungire se va deschide în ${daysLeft - RENEWAL_WINDOW_MAX_DAYS} zile.`,
      legalRef: "Art. 30 alin. (3) Ord. MDLPA 348/2026",
    };
  }

  return {
    status: "active",
    severity: "ok",
    expiryDate: exp,
    daysLeft,
    canRenew: false,
    message: "",
    legalRef: "",
  };
}

/**
 * Returnează un text formatat „xx ani și yy zile" pentru afișare.
 *
 * @param {number} days
 * @returns {string}
 */
export function formatDaysLeft(days) {
  if (days == null || Number.isNaN(days)) return "";
  if (days < 0) return `expirat acum ${Math.abs(days)} zile`;
  if (days < 30) return `${days} zile`;
  if (days < 365) return `${Math.floor(days / 30)} luni`;
  const years = Math.floor(days / 365);
  const remDays = days % 365;
  const months = Math.floor(remDays / 30);
  return months > 0 ? `${years} ani și ${months} luni` : `${years} ani`;
}

/**
 * Verifică dacă atestatul este pe vechiul Ord. 2237/2010 (deci grandfathered)
 * sau pe noul Ord. 348/2026.
 *
 * @param {Date|string|null} attestationIssueDate
 * @returns {"legacy_2237"|"new_348"|null}
 */
export function getAttestationOrdinanceVersion(attestationIssueDate) {
  const issued = toDate(attestationIssueDate);
  if (!issued) return null;
  // Ord. 348/2026 publicat 14 aprilie 2026, intră în vigoare la publicare
  const ord348Effective = new Date("2026-04-14T00:00:00.000Z");
  return issued < ord348Effective ? "legacy_2237" : "new_348";
}

/**
 * Returnează eticheta umană a ordinului prin care auditorul a fost atestat.
 *
 * Pentru atestate emise:
 *   - înainte de 14.IV.2026 → Ord. MDLPA 2237/2010 (vechiul regim, valabil
 *     până la expirarea naturală a atestatului)
 *   - de la 14.IV.2026 încolo → Ord. MDLPA 348/2026 (regim nou, în vigoare)
 *
 * Folosit pentru citare corectă în CPE DOCX/XML/PDF (T3 Sprint Tranziție 2026).
 *
 * @param {Date|string|null} attestationIssueDate
 * @returns {{ short: string, full: string, version: string|null }}
 */
export function getAttestationOrdinanceLabel(attestationIssueDate) {
  const v = getAttestationOrdinanceVersion(attestationIssueDate);
  if (v === "legacy_2237") {
    return {
      short: "Ord. MDLPA 2237/2010",
      full: "Ordinul MDLPA nr. 2237/2010 (regim de tranziție, valabil până la expirarea naturală a atestatului conform Art. 7 Ord. 348/2026)",
      version: "legacy_2237",
    };
  }
  if (v === "new_348") {
    return {
      short: "Ord. MDLPA 348/2026",
      full: "Ordinul MDLPA nr. 348/2026 (MO nr. 292/14.IV.2026)",
      version: "new_348",
    };
  }
  return {
    short: "Ord. MDLPA aplicabil",
    full: "Ordin MDLPA aplicabil — completează data emiterii atestatului în profil pentru citare exactă",
    version: null,
  };
}

/**
 * Pentru perioada de tranziție (până la 11 oct 2026), atestatele vechi rămân
 * valabile. Verifică dacă suntem încă în fereastra de tranziție.
 *
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isInTransitionWindow(now = new Date()) {
  const ref = toDate(now) || new Date();
  return ref < ORD_2237_REPEAL_DATE;
}
