/**
 * auditor-grad-validation.js — Sprint v6.2 (27 apr 2026)
 *
 * Validare cross-checking între gradul profesional al auditorului energetic
 * și categoria clădirii pentru care se emite CPE.
 *
 * Sursă legală: Ordinul MDLPA nr. 348/2026 publicat în Monitorul Oficial
 * nr. 292 din 14 aprilie 2026, anexat „Regulament privind atestarea
 * tehnico-profesională a auditorilor energetici pentru clădiri".
 *
 *  Art. 5 alin. (a)(b) — Gradele profesionale:
 *    • AE Ici  — auditor grad I civile  (vechime ≥ 5 ani)
 *    • AE IIci — auditor grad II civile (vechime ≥ 3 ani)
 *
 *  Art. 6 alin. (1) — Competențele AE Ici (scop COMPLET):
 *    a) elaborează CPE pentru TOATE categoriile de clădiri/unități de clădire
 *       prevăzute de Legea 372/2005 (republicată), care se construiesc, se
 *       vând, se închiriază sau sunt supuse renovării energetice;
 *    b) realizează activitatea de audit energetic și elaborează raportul de
 *       audit energetic pentru toate categoriile de clădiri existente;
 *    c) întocmesc raportul de conformare nZEB pentru clădiri în fază de
 *       proiectare.
 *
 *  Art. 6 alin. (2) — Competențele AE IIci (scop RESTRÂNS):
 *    elaborează CPE EXCLUSIV pentru:
 *      • clădiri tip locuință unifamilială (RI)
 *      • blocuri de locuințe (RC, RA, BC)
 *      • apartamente din blocurile de locuințe care se vând sau se închiriază
 *    AE IIci NU poate face audit energetic, NU poate emite raport conformare
 *    nZEB, și NU poate certifica clădiri nerezidențiale (birouri, școli,
 *    spitale, comerciale, industriale, hoteluri, culturale etc.).
 *
 *  Art. 7 din Ordinul 348/2026 — Tranziție:
 *    Vechiul Ord. 2237/2010 se abrogă în 180 de zile de la 14.IV.2026,
 *    adică la 11 octombrie 2026. Atestatele emise pe Ord. 2237/2010 rămân
 *    valabile până la expirarea naturală a dreptului de practică.
 */

// ── Categorii rezidențiale Mc 001-2022 — singurele permise pentru AE IIci ──
// Sursă: src/data/building-catalog.js · CATEGORY_BASE_MAP / BUILDING_CATEGORIES
//   RI — Rezidențial individual (locuință unifamilială)
//   RC — Rezidențial colectiv comun (bloc de locuințe)
//   RA — Rezidențial colectiv apartament
//   BC — Bloc complet (apartament în bloc, vânzare/închiriere)
export const RESIDENTIAL_CATEGORIES = ["RI", "RC", "RA", "BC"];

// ── Categorii nerezidențiale, rezervate exclusiv AE Ici ──
// Birouri, școli, spitale, sportive, hoteluri, comerciale, restaurante,
// culturale, industriale, depozite, hale, agricole etc.
export const NON_RESIDENTIAL_CATEGORIES = [
  "BIR", "SC", "SP", "STX", "HOT", "REST", "COM", "MUZ", "CUL",
  "TEA", "CIN", "IU", "HAL", "DEP", "AG", "AL",
];

/**
 * Verifică dacă o categorie de clădire este rezidențială.
 *
 * @param {string|null|undefined} category — cod Mc 001-2022 (RI, BIR, ...)
 * @returns {boolean}
 */
export function isResidentialCategory(category) {
  if (!category) return false;
  return RESIDENTIAL_CATEGORIES.includes(String(category).toUpperCase());
}

/**
 * Validează conformitatea grad auditor ↔ categorie clădire.
 *
 * Returnează un obiect cu următoarele câmpuri:
 *   - valid       (bool)   — true dacă gradul permite legal această categorie
 *   - severity    (string) — "ok" | "blocking" | "warning" | "info"
 *   - message     (string) — text explicativ user-friendly
 *   - legalRef    (string) — referința articolului din Ord. 348/2026
 *   - upgradePath (string) — sugestie upgrade dacă blocking (ex: „AE Ici")
 *
 * Severitățile:
 *   - "ok"        — totul în regulă
 *   - "blocking"  — utilizatorul nu poate emite CPE legal pentru această clădire
 *   - "warning"   — atenționare (ex: grad lipsă, completează profilul)
 *   - "info"      — info contextual (ex: tranziție Ord. vechi)
 *
 * @param {object} args
 * @param {string|null} args.gradMdlpaRequired — gradul cerut de plan ("Ici" | "IIci" | null)
 * @param {string|null} args.auditorGrad        — gradul auditorului din profil ("Ici" | "IIci" | "" | null)
 * @param {string|null} args.buildingCategory   — categoria clădirii (RI/BIR/...)
 * @returns {{valid: boolean, severity: string, message: string, legalRef: string, upgradePath: string|null}}
 */
export function validateGradVsBuildingCategory({
  gradMdlpaRequired,
  auditorGrad,
  buildingCategory,
}) {
  const cat = buildingCategory ? String(buildingCategory).toUpperCase() : "";
  const planGrade = gradMdlpaRequired ? String(gradMdlpaRequired) : null;
  const auditGrade = auditorGrad ? String(auditorGrad) : null;

  // 1) Free / Edu (planGrade === null) — fără validare legală (demo / didactic)
  if (planGrade === null) {
    return {
      valid: true,
      severity: "ok",
      message: "",
      legalRef: "",
      upgradePath: null,
    };
  }

  // 2) Categoria clădirii lipsă — fără context, nu putem valida
  if (!cat) {
    return {
      valid: true,
      severity: "info",
      message: "Selectează categoria clădirii pentru a valida conformitatea cu gradul profesional.",
      legalRef: "Ord. MDLPA 348/2026 Art. 6",
      upgradePath: null,
    };
  }

  const residential = isResidentialCategory(cat);

  // 3) Plan AE IIci + clădire NEREZIDENȚIALĂ → BLOCAJ legal
  //    Conform Art. 6 alin. (2): AE IIci nu poate certifica decât rezidențial.
  if (planGrade === "IIci" && !residential) {
    return {
      valid: false,
      severity: "blocking",
      message:
        `Această clădire (${cat}) nu poate fi certificată de un auditor AE IIci. ` +
        `Conform Art. 6 alin. (2) din Ordinul MDLPA nr. 348/2026, auditorii grad ` +
        `profesional II elaborează CPE EXCLUSIV pentru locuințe unifamiliale, ` +
        `blocuri de locuințe și apartamente din blocurile de locuințe.`,
      legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026 (MO 292/14.IV.2026)",
      upgradePath: "AE Ici",
    };
  }

  // 4) Plan AE Ici (sau Expert/Birou/Enterprise care extind Ici) — fără restricții
  if (planGrade === "Ici") {
    // Verificare suplimentară: dacă auditorul declară explicit IIci în profil,
    // chiar dacă planul permite Ici, atestatul real al auditorului blochează.
    if (auditGrade === "IIci" && !residential) {
      return {
        valid: false,
        severity: "blocking",
        message:
          `Atestatul tău MDLPA este AE IIci, care nu permite certificarea ` +
          `acestei clădiri (${cat}). Conform Art. 6 alin. (2) Ord. 348/2026, ` +
          `AE IIci poate emite CPE doar pentru rezidențial. Pentru clădiri ` +
          `nerezidențiale este necesar atestatul AE Ici (vechime min. 5 ani).`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }
    return {
      valid: true,
      severity: "ok",
      message: "",
      legalRef: "",
      upgradePath: null,
    };
  }

  // 5) Plan AE IIci + clădire rezidențială → OK
  return {
    valid: true,
    severity: "ok",
    message: "",
    legalRef: "",
    upgradePath: null,
  };
}

/**
 * Verifică dacă auditorul are atestat valabil pentru emitere CPE.
 * Reguli:
 *   - lipsă atestat (ștergere câmp) → severity "warning"
 *   - grad declarat nu corespunde planului → severity "blocking"
 *
 * @param {object} args
 * @param {string|null} args.auditorGrad
 * @param {string|null} args.gradMdlpaRequired
 * @returns {{valid: boolean, severity: string, message: string}}
 */
export function validateAuditorGradMatchesPlan({ auditorGrad, gradMdlpaRequired }) {
  if (gradMdlpaRequired === null) {
    return { valid: true, severity: "ok", message: "" };
  }
  if (!auditorGrad) {
    return {
      valid: false,
      severity: "warning",
      message:
        `Completează gradul profesional MDLPA (Ici sau IIci) în profilul ` +
        `auditorului pentru a respecta cerința Ord. MDLPA 348/2026.`,
    };
  }
  // AE Ici acoperă și certificarea rezidențială
  if (gradMdlpaRequired === "IIci" && auditorGrad === "Ici") {
    return { valid: true, severity: "ok", message: "" };
  }
  if (auditorGrad !== gradMdlpaRequired) {
    return {
      valid: false,
      severity: "warning",
      message:
        `Atestatul tău (AE ${auditorGrad}) nu corespunde planului ` +
        `(necesar AE ${gradMdlpaRequired}). Verifică în profil sau schimbă planul.`,
    };
  }
  return { valid: true, severity: "ok", message: "" };
}
