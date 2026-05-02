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
 * Validează conformitatea grad auditor ↔ categorie clădire ↔ scop ↔ public.
 *
 * Sprint v6.3 — extins cu `scopCpe` și `isPublic` per Art. 6 alin. (2).
 *
 * Returnează un obiect cu următoarele câmpuri:
 *   - valid       (bool)   — true dacă gradul permite legal această clădire
 *   - severity    (string) — "ok" | "blocking" | "warning" | "info"
 *   - message     (string) — text explicativ user-friendly
 *   - legalRef    (string) — referința articolului din Ord. 348/2026
 *   - upgradePath (string) — sugestie upgrade dacă blocking (ex: „AE Ici")
 *
 * @param {object} args
 * @param {string|null} args.gradMdlpaRequired — gradul cerut de plan ("Ici" | "IIci" | null)
 * @param {string|null} args.auditorGrad        — gradul auditorului din profil
 * @param {string|null} args.buildingCategory   — categoria clădirii (RI/BIR/...)
 * @param {string|null} [args.scopCpe]          — scopul CPE ("construire"|"vanzare"|"renovare"|...)
 * @param {boolean}     [args.isPublic]         — clădire publică (autoritate publică)
 * @returns {{valid: boolean, severity: string, message: string, legalRef: string, upgradePath: string|null}}
 */
export function validateGradVsBuildingCategory({
  gradMdlpaRequired,
  auditorGrad,
  buildingCategory,
  scopCpe = null,
  isPublic = false,
}) {
  const cat = buildingCategory ? String(buildingCategory).toUpperCase() : "";
  const scop = scopCpe ? String(scopCpe).toLowerCase() : "";
  const planGrade = gradMdlpaRequired ? String(gradMdlpaRequired) : null;
  const auditGrade = auditorGrad ? String(auditorGrad) : null;

  // Determină gradul efectiv — cel mai restrictiv dintre plan și atestat real.
  const effectiveGrade =
    auditGrade === "IIci" || planGrade === "IIci"
      ? "IIci"
      : (auditGrade === "Ici" || planGrade === "Ici" ? "Ici" : null);

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

  // 3) Reguli STRICTE pentru AE IIci (efectiv) — Art. 6 alin. (2)
  if (effectiveGrade === "IIci") {
    const residential = isResidentialCategory(cat);

    // 3.1) Categorie nerezidențială → BLOCAJ
    if (!residential) {
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

    // 3.2) Clădire publică — BLOCAJ (chiar dacă rezidențial: locuințe sociale ANL,
    //      case de protocol → L.372/2005 Art. 7 alin. 1 lit. f → AE Ici)
    if (isPublic) {
      return {
        valid: false,
        severity: "blocking",
        message:
          `Clădirile ocupate de autorități publice (locuințe sociale ANL, case de ` +
          `protocol etc.) nu pot fi certificate de AE IIci. Conform L.372/2005 Art. 7 ` +
          `alin. (1) lit. f) coroborat cu Art. 6 alin. (1) Ord. MDLPA 348/2026, ` +
          `acestea sunt în sfera de competență AE Ici.`,
        legalRef: "L.372/2005 Art. 7 alin. (1) lit. f) + Art. 6 alin. (1) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.3) Scop NEPERMIS (renovare, schimbare destinație) → BLOCAJ
    //      Permis pentru AE IIci: construire, receptie, vanzare, inchiriere.
    const ALLOWED_SCOPES_IICI = ["construire", "receptie", "vanzare", "inchiriere"];
    if (scop && !ALLOWED_SCOPES_IICI.includes(scop)) {
      return {
        valid: false,
        severity: "blocking",
        message:
          `Scopul „${scop}" nu este permis pentru AE IIci. Conform Art. 6 alin. (2) ` +
          `Ord. MDLPA 348/2026, gradul II civile certifică EXCLUSIV locuințele care ` +
          `SE CONSTRUIESC, SE VÂND sau SE ÎNCHIRIAZĂ. Renovarea energetică, ` +
          `schimbarea destinației etc. sunt rezervate AE Ici (Art. 6 alin. 1 lit. a).`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.4) Bloc întreg (RC) la vânzare/închiriere → BLOCAJ
    //      Art. 6 alin. (2) menționează blocuri DOAR la „se construiesc".
    if (cat === "RC" && (scop === "vanzare" || scop === "inchiriere")) {
      return {
        valid: false,
        severity: "blocking",
        message:
          `Vânzarea sau închirierea unui bloc de locuințe întreg nu poate fi ` +
          `certificată de AE IIci. Conform Art. 6 alin. (2) Ord. MDLPA 348/2026, ` +
          `AE IIci certifică blocurile NUMAI la construire. Pentru tranzacția pe ` +
          `bloc întreg existent este necesar AE Ici.`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.5) Apartament (BC) la construire/recepție individuală → BLOCAJ
    //      Art. 6 alin. (2) menționează apartamentele DOAR la „se vând/închiriază".
    if (cat === "BC" && (scop === "construire" || scop === "receptie")) {
      return {
        valid: false,
        severity: "blocking",
        message:
          `Construirea/recepția unui apartament individual nu poate fi certificată ` +
          `de AE IIci. Conform Art. 6 alin. (2) Ord. MDLPA 348/2026, AE IIci ` +
          `certifică apartamente NUMAI la vânzare sau închiriere.`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.6) AE IIci — toate verificările trecute → OK
    return {
      valid: true,
      severity: "ok",
      message: "",
      legalRef: "",
      upgradePath: null,
    };
  }

  // 4) AE Ici (efectiv) — fără restricții (Art. 6 alin. 1: scop complet)
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

/**
 * T5 Sprint Tranziție 2026 — mapping grade vechi (Ord. 2237/2010) → nou.
 *
 * Atestatele Ord. 2237/2010 NU folosesc formatul „Ici/IIci" — au denumiri
 * variate ca „grad I civile", „grad II civile", „grad I+II constructii",
 * „grad I instalații" etc. Acest helper extrage gradul I/II din text liber
 * și mapează la noul format.
 *
 * Reguli mapping (cea mai permisivă):
 *   - text conține „I+II" (ambele) → "Ici" (gradul I e cel mai permisiv)
 *   - text conține "II" și NU "I" simplu → "IIci"
 *   - text conține "I" și NU "II" → "Ici"
 *   - altfel → null (cere clarificare)
 *
 * @param {string|null|undefined} legacyGradeText — textul liber din certificat
 * @returns {{ grade: "Ici"|"IIci"|null, confidence: "high"|"medium"|"low",
 *             interpretation: string }}
 */
export function mapLegacyGradeToNew(legacyGradeText) {
  if (!legacyGradeText || typeof legacyGradeText !== "string") {
    return {
      grade: null,
      confidence: "low",
      interpretation: "Text grad lipsă — completează gradul exact din atestat.",
    };
  }
  const text = legacyGradeText.trim();
  if (!text) {
    return {
      grade: null,
      confidence: "low",
      interpretation: "Text grad gol — completează gradul exact din atestat.",
    };
  }
  const upper = text.toUpperCase();
  const hasII = /\bII\b/.test(upper);
  const hasI = /\bI\b/.test(upper);
  const hasBoth =
    /I\s*\+\s*II\b/.test(upper) ||
    /\bI\s+(?:ȘI|SI|AND)\s+II\b/i.test(text);

  if (hasBoth) {
    return {
      grade: "Ici",
      confidence: "high",
      interpretation:
        "Atestat I+II → mapat la AE Ici (cel mai permisiv, acoperă și IIci).",
    };
  }
  if (hasII && !hasI) {
    return {
      grade: "IIci",
      confidence: "high",
      interpretation: "Atestat grad II civile → AE IIci (CPE locuințe).",
    };
  }
  if (hasII && hasI) {
    return {
      grade: "Ici",
      confidence: "medium",
      interpretation:
        "Atestat grad I și II detectate — interpretat ca AE Ici (permisiv). " +
        "Verifică textul exact din certificat.",
    };
  }
  if (hasI) {
    return {
      grade: "Ici",
      confidence: "high",
      interpretation: "Atestat grad I civile → AE Ici (scop complet).",
    };
  }
  return {
    grade: null,
    confidence: "low",
    interpretation:
      `Nu am putut detecta gradul (I sau II) în textul atestatului. ` +
      `Completează exact denumirea („grad I civile", „grad II civile" etc.).`,
  };
}
