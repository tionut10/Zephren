/**
 * cpe-validity.js — Helper valabilitate CPE diferențiată pe clasa energetică
 *
 * Conform EPBD IV (Directiva UE 2024/1275) Art. 17 — termen transpunere 29 mai 2026:
 *   - Clădiri cu performanță bună (clase A+, A, B, C) → valabilitate 10 ani
 *   - Clădiri cu performanță scăzută (clase D, E, F, G) → valabilitate 5 ani
 *
 * Motivare normativă: clădirile cu clasă energetică slabă au potențial
 * de îmbunătățire semnificativ și trebuie re-evaluate mai des pentru a
 * surprinde renovările și pentru a semnala proprietarilor nevoia de
 * reabilitare termică.
 *
 * Regimul anterior (HG 917/2021 Art. 9 — 10 ani uniform) rămâne aplicabil
 * pentru CPE emise înainte de 29 mai 2026, dar tot mai multe state membre
 * aplică diferențierea începând cu transpunerea națională.
 *
 * Sprint 15 — 18 apr 2026
 */

/** Clasele „bune" care primesc valabilitate 10 ani (EPBD 2024 Art. 17). */
export const LONG_VALIDITY_CLASSES = ["A+", "A", "B", "C"];

/** Ani valabilitate pentru clase A+..C (EPBD 2024 Art. 17). */
export const VALIDITY_LONG = 10;

/** Ani valabilitate pentru clase D..G (EPBD 2024 Art. 17). */
export const VALIDITY_SHORT = 5;

/**
 * Calculează numărul de ani de valabilitate pentru o clasă energetică dată.
 *
 * S30A·A3 — regulă unificată cu scopCpe + scaleVersion:
 *   - În RO Ord. MDLPA 16/2023 (în vigoare până la transpunerea EPBD 29 mai 2026):
 *     valabilitate uniformă 10 ani.
 *   - Începând cu EPBD 2024/1275 Art.17 (transpunere RO 29 mai 2026 → scaleVersion="2026"):
 *     5 ani pentru clase D..G, 10 ani pentru A+..C.
 *   - Recepție clădire nouă nZEB: tratată ca o clasă bună A-C (default 10 ani uniform RO).
 *
 * @param {string} energyClass — "A+", "A", "B", "C", "D", "E", "F", "G"
 * @param {object} [opts] — { scopCpe?: string, scaleVersion?: "2023"|"2026" }
 * @returns {number} — 10 pentru A+..C sau scaleVersion legacy; 5 pentru D..G sub EPBD 2026
 */
export function getValidityYears(energyClass, opts = {}) {
  // Backward compat: dacă primim un object ca prim arg (vechea semnătură), interpretăm ca opts
  if (typeof energyClass === "object" && energyClass !== null) {
    opts = energyClass;
    energyClass = opts.energyClass;
  }
  const scopCpe = opts.scopCpe;
  const scaleVersion = opts.scaleVersion;
  // S30A·A3 — regulă explicită cu opts.scaleVersion="2026" pentru cei care folosesc EPBD post-29 mai 2026.
  // Fără opts (vechea semnătură doar cu energyClass) păstrăm comportamentul backward: clasă-based.
  // Cu opts.scaleVersion absent (sau ≠ "2026"): aplicăm Ord. MDLPA 16/2023 (10 ani uniform).
  const usedAsLegacyApi = arguments.length === 1 && (opts === undefined || (typeof opts === "object" && Object.keys(opts).length === 0));
  if (!usedAsLegacyApi && scaleVersion !== "2026") {
    // Ord. MDLPA 16/2023: 10 ani uniform indiferent de clasă
    return VALIDITY_LONG;
  }
  // Recepție clădire nouă fără clasă: 10 ani default
  if (scopCpe === "receptie" && !energyClass) return VALIDITY_LONG;
  if (!energyClass) return VALIDITY_LONG;
  return LONG_VALIDITY_CLASSES.includes(String(energyClass).trim().toUpperCase())
    ? VALIDITY_LONG
    : VALIDITY_SHORT;
}

/**
 * Calculează data de expirare pornind de la data emiterii și clasa energetică.
 *
 * @param {string|Date} issueDate — ISO string sau Date
 * @param {string} energyClass — clasa energetică
 * @returns {Date|null} — null dacă issueDate invalid
 */
export function getExpiryDate(issueDate, energyClass) {
  if (!issueDate) return null;
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return null;
  const years = getValidityYears(energyClass);
  const exp = new Date(d);
  exp.setFullYear(exp.getFullYear() + years);
  return exp;
}

/**
 * Formatare label pentru UI/certificat: „valabil X ani (clasa Y, EPBD 2024/1275 Art. 17)"
 *
 * @param {string} energyClass
 * @param {string} [lang="RO"]
 * @returns {string}
 */
export function getValidityLabel(energyClass, lang = "RO") {
  const years = getValidityYears(energyClass);
  if (lang === "EN") {
    return `valid ${years} years (class ${energyClass || "—"}, EPBD 2024/1275 Art. 17)`;
  }
  return `valabil ${years} ani (clasa ${energyClass || "—"}, EPBD 2024/1275 Art. 17)`;
}

/**
 * Numărul de luni rămase până la expirare.
 *
 * @param {string|Date} issueDate
 * @param {string} energyClass
 * @returns {number|null} — null dacă date invalid; negativ dacă expirat
 */
export function monthsUntilExpiry(issueDate, energyClass) {
  const exp = getExpiryDate(issueDate, energyClass);
  if (!exp) return null;
  return (exp - new Date()) / (1000 * 60 * 60 * 24 * 30.44);
}

/**
 * Interval recomandat de notificare înainte de expirare, diferențiat pe valabilitate.
 *
 * Pentru CPE de 5 ani, notificările pornesc mai devreme (proporțional).
 *
 * @param {string} energyClass
 * @returns {{ id: string, months: number, label: string }[]}
 */
export function getNotificationIntervals(energyClass) {
  const years = getValidityYears(energyClass);
  if (years === VALIDITY_SHORT) {
    // 5 ani → intervale proporționale (de la 50% din valabilitate)
    return [
      { id: "30m", months: 30, label: "30 luni înainte" },
      { id: "18m", months: 18, label: "18 luni înainte" },
      { id: "6m",  months: 6,  label: "6 luni înainte" },
      { id: "1m",  months: 1,  label: "1 lună înainte" },
      { id: "exp", months: 0,  label: "La expirare" },
    ];
  }
  // 10 ani → intervale standard
  return [
    { id: "12m", months: 12, label: "12 luni înainte" },
    { id: "6m",  months: 6,  label: "6 luni înainte" },
    { id: "3m",  months: 3,  label: "3 luni înainte" },
    { id: "1m",  months: 1,  label: "1 lună înainte" },
    { id: "exp", months: 0,  label: "La expirare" },
  ];
}
