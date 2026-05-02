/**
 * cpe-completeness.js — Listă unificată de câmpuri obligatorii CPE.
 *
 * Audit 2 mai 2026 — P1.1: completeness score Step 6 raporta 100% chiar și
 * când lipseau 14+ câmpuri obligatorii MDLPA. Acest modul centralizează lista
 * canonică de câmpuri și produce două vizualizări:
 *   - `getCpeCompletenessItems()` — lista detaliată (22 itemi grupați)
 *   - `getCpeCompletenessScore()` — { score, total, pct, missing, allDone }
 *
 * Câmpurile sunt grupate pe șapte secțiuni:
 *   1. Identificare clădire
 *   2. Geometrie
 *   3. Climatică
 *   4. Anvelopă
 *   5. Instalații
 *   6. Calcul (Pas 4 + Pas 5)
 *   7. Auditor
 *
 * Câmpuri condiționale:
 *   - „Verificare ANCPI" — obligatoriu doar pentru scop ∈
 *     { vanzare, inchiriere, renovare, renovare_majora }
 *   - „Apartamente bloc" — obligatoriu doar pentru categoria RC
 *
 * Item-ii marcați cu `optional: true` apar în UI dar NU intră în scor.
 *
 * Sursă unică pentru:
 *   - Block 1: validation warnings (Step6Certificate.jsx:2541)
 *   - Block 2: checklist progress bar (Step6Certificate.jsx:3158)
 */

/** Scopuri CPE care necesită verificare ANCPI (regim juridic clădire). */
export const ANCPI_REQUIRED_SCOPES = [
  "vanzare",
  "inchiriere",
  "renovare",
  "renovare_majora",
];

/** Categorii care necesită listă de apartamente (bloc multi-unitate). */
export const APARTMENT_LIST_CATEGORIES = ["RC"];

/**
 * @typedef {Object} CompletenessContext
 * @property {Object} building
 * @property {Object} [selectedClimate]
 * @property {Array}  [opaqueElements]
 * @property {Array}  [glazingElements]
 * @property {Object} [heating]
 * @property {Object} [acm]
 * @property {Object} [instSummary]
 * @property {Object} [renewSummary]
 * @property {Object} [auditor]
 */

/**
 * @typedef {Object} CompletenessItem
 * @property {string}  group     — etichetă secțiune (Identificare, Geometrie, ...)
 * @property {string}  label     — text scurt afișat în UI
 * @property {boolean} ok        — true dacă e completat valid
 * @property {boolean} [optional] — dacă true, NU intră în scor
 * @property {string}  [hint]    — ghid scurt pentru completare (opțional)
 */

/**
 * Construiește lista canonică de itemi.
 * @param {CompletenessContext} ctx
 * @returns {CompletenessItem[]}
 */
export function getCpeCompletenessItems(ctx) {
  const {
    building = {},
    selectedClimate,
    opaqueElements,
    glazingElements,
    heating,
    acm,
    instSummary,
    renewSummary,
    auditor,
  } = ctx || {};

  const yearNow = new Date().getFullYear();
  const yearBuilt = parseInt(building.yearBuilt);
  const yearBuiltOk =
    Number.isFinite(yearBuilt) && yearBuilt >= 1800 && yearBuilt <= yearNow;

  const Au = parseFloat(building.areaUseful);
  const Vol = parseFloat(building.volume);
  const scop = building.scopCpe || "vanzare";
  const cat = building.category;

  const ancpiRequired = ANCPI_REQUIRED_SCOPES.includes(scop);
  const apartmentsRequired = APARTMENT_LIST_CATEGORIES.includes(cat);

  return [
    // 1. Identificare clădire
    { group: "Identificare", label: "Adresă", ok: !!(building.address?.trim()) },
    { group: "Identificare", label: "Localitate", ok: !!(building.city?.trim() || building.locality?.trim()) },
    { group: "Identificare", label: "Categorie clădire", ok: !!cat },
    { group: "Identificare", label: "Scop CPE", ok: !!building.scopCpe },
    { group: "Identificare", label: "An construcție", ok: yearBuiltOk, hint: "1800–" + yearNow },
    { group: "Identificare", label: "Regim înălțime", ok: !!building.floors },
    { group: "Identificare", label: "Structura constructivă", ok: !!building.structure },

    // 2. Geometrie
    { group: "Geometrie", label: "Suprafață utilă (Au)", ok: Number.isFinite(Au) && Au > 0 },
    { group: "Geometrie", label: "Volum încălzit (V)", ok: Number.isFinite(Vol) && Vol > 0 },

    // 3. Climatică
    {
      group: "Climatică",
      label: "Date climatice",
      ok: !!(selectedClimate?.name && selectedClimate?.zone),
    },

    // 4. Anvelopă
    { group: "Anvelopă", label: "Elemente opace", ok: (opaqueElements?.length ?? 0) > 0 },
    { group: "Anvelopă", label: "Elemente vitrate", ok: (glazingElements?.length ?? 0) > 0 },

    // 5. Instalații
    {
      group: "Instalații",
      label: "Sistem încălzire",
      ok:
        !!heating?.source &&
        heating.source !== "NONE" &&
        heating.source !== "none",
    },
    { group: "Instalații", label: "Sistem ACM", ok: !!acm?.source },

    // 6. Calcul
    { group: "Calcul", label: "Calcul energetic (Pas 5)", ok: !!instSummary },
    { group: "Calcul", label: "Calcul regenerabile (Pas 4)", ok: !!renewSummary },

    // 7. Auditor
    { group: "Auditor", label: "Nume auditor", ok: !!auditor?.name },
    { group: "Auditor", label: "Atestat MDLPA", ok: !!auditor?.atestat },
    { group: "Auditor", label: "Cod MDLPA", ok: !!auditor?.mdlpaCode },
    { group: "Auditor", label: "Data elaborare", ok: !!auditor?.date },
    { group: "Auditor", label: "Grad atestat", ok: !!auditor?.grade },

    // Condiționale — apar în UI dar `optional: true` când nu sunt aplicabile
    {
      group: "Cadastru",
      label: ancpiRequired
        ? "Verificare ANCPI (obligatoriu pentru scopul selectat)"
        : "Verificare ANCPI (opțional pentru acest scop)",
      ok: !!building.ancpi?.verified,
      optional: !ancpiRequired,
      hint: ancpiRequired
        ? `Necesar pentru scop „${scop}"`
        : `Nu este obligatoriu pentru scop „${scop}"`,
    },
    {
      group: "Multi-apartament",
      label: apartmentsRequired
        ? "Listă apartamente bloc"
        : "Listă apartamente bloc (N/A pentru acest tip)",
      ok: (building.apartments?.length ?? 0) > 0,
      optional: !apartmentsRequired,
      hint: apartmentsRequired
        ? "Necesar pentru bloc rezidențial colectiv (RC)"
        : "Aplicabil doar pentru categoria RC (bloc colectiv)",
    },
  ];
}

/**
 * Calculează scorul (item-ii non-optionali doar).
 * @param {CompletenessContext} ctx
 * @returns {{ score: number, total: number, pct: number, allDone: boolean,
 *            missing: CompletenessItem[], items: CompletenessItem[] }}
 */
export function getCpeCompletenessScore(ctx) {
  const items = getCpeCompletenessItems(ctx);
  const required = items.filter((i) => !i.optional);
  const passed = required.filter((i) => i.ok);
  const missing = required.filter((i) => !i.ok);
  const total = required.length;
  const score = passed.length;
  return {
    score,
    total,
    pct: total > 0 ? Math.round((score / total) * 100) : 0,
    allDone: score === total,
    missing,
    items,
  };
}

/**
 * Grupează itemii pe secțiune (pentru UI cu grupuri vizuale).
 * @param {CompletenessItem[]} items
 * @returns {Record<string, CompletenessItem[]>}
 */
export function groupCompletenessItems(items) {
  const groups = {};
  for (const it of items) {
    const g = it.group || "Altele";
    if (!groups[g]) groups[g] = [];
    groups[g].push(it);
  }
  return groups;
}
