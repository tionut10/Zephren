/**
 * canEmitForBuilding.js — Sprint Tranziție 2026 (2 mai 2026)
 *
 * Verificare centralizată drept LEGAL de emitere CPE pentru o clădire dată
 * conform Ord. MDLPA nr. 348/2026 (MO 292/14.IV.2026), Art. 6.
 *
 * ⚖️ FILOZOFIE FUNDAMENTALĂ (Sprint Tranziție 2026):
 *
 *   Atestatul REAL al auditorului DOMINĂ peste planul Zephren cumpărat.
 *   - Plan-ul = produs comercial (ce vede utilizatorul în UI, Step 1-6 vs 1-7 vs 1-8).
 *   - Atestatul = drept legal de SEMNARE pe CPE-uri (Ord. 348/2026 Art. 6).
 *
 *   Această funcție verifică DOAR drepturile LEGALE pe baza `auditorGrad` (atestat).
 *   Plan-restricțiile UI sunt separate (vezi PlanGate.jsx, GradeGate.jsx, planFeatures).
 *
 *   Astfel:
 *   - AE Ici real cu plan AE IIci 599 RON + clădire BIR → ALLOWED legal (plan limitează
 *     doar UI/funcționalități, nu drept de semnare).
 *   - AE IIci real cu plan Expert 2.999 RON + clădire BIR → BLOCKED legal (atestatul II
 *     civile NU poate semna nerezidențial, indiferent de plan).
 *
 * 🕐 PERIOADĂ TRANZIȚIE (14.IV.2026 → 11.X.2026):
 *
 *   Conform Art. 7 Ord. 348/2026, vechiul Ord. 2237/2010 se abrogă în 180 zile (11.X.2026).
 *   Atestatele emise pe regimul vechi rămân valabile până la expirarea naturală.
 *   Portalul electronic MDLPA pentru distincția Ici/IIci NU e operațional până la 8.VII.2026.
 *
 *   În această fereastră, dacă atestatul real al utilizatorului ar bloca o operațiune
 *   conform Art. 6 (ex: AE IIci real încercând nerezidențial), returnăm:
 *     - ok: true (unblock acțiune)
 *     - severity: "warning"
 *     - softWarning: text explicativ + data începerii regim strict
 *
 *   După 11.X.2026 (sau cu `window.__forceStrictGrade=true` pentru testare),
 *   verificările redevin strict blocante (`ok: false`, `severity: "blocking"`).
 *
 *  Reguli legale enforced (Art. 6):
 *
 *  ┌──────────────────────┬─────────────┬───────────────────────────────┐
 *  │ Operațiune           │ AE IIci real│ AE Ici real (orice plan)      │
 *  ├──────────────────────┼─────────────┼───────────────────────────────┤
 *  │ CPE rezidențial nou  │ ✅          │ ✅                            │
 *  │ CPE rezidențial vânz.│ ✅ (RI/BC)  │ ✅                            │
 *  │ CPE bloc întreg vânz.│ 🚫          │ ✅                            │
 *  │ CPE renovare         │ 🚫          │ ✅                            │
 *  │ CPE nerezidențial    │ 🚫          │ ✅                            │
 *  │ CPE clădiri publice  │ 🚫          │ ✅                            │
 *  │ Audit energetic      │ 🚫          │ ✅                            │
 *  │ Raport nZEB          │ 🚫          │ ✅                            │
 *  └──────────────────────┴─────────────┴───────────────────────────────┘
 *
 * Folosit de:
 *   - Step1Identification.jsx → banner blocaj la editare câmpuri
 *   - Step6Certificate.jsx    → refuz export DOCX/XML/submit MDLPA
 *   - Step7Audit.jsx          → blocaj generare raport audit (AE IIci)
 *   - RaportConformareNZEB    → blocaj generare raport nZEB (AE IIci)
 */

import { PLAN_FEATURES, resolvePlan } from "./planGating.js";
import { isResidentialCategory } from "../calc/auditor-grad-validation.js";
import {
  isInTransitionWindow,
  ORD_2237_REPEAL_DATE,
} from "../calc/auditor-attestation-validity.js";

/**
 * Verifică override-ul global care forțează regimul strict înainte de 11.X.2026.
 * Util pentru testare/preview comportament post-tranziție.
 * @returns {boolean}
 */
function isForceStrictMode() {
  if (typeof window === "undefined") return false;
  return window.__forceStrictGrade === true;
}

/**
 * Determină gradul efectiv al utilizatorului pentru verificări LEGALE.
 *
 * Filozofie: prioritate atestat real (auditorGrad). Dacă lipsește, fallback la
 * planul cumpărat ca proxy (un user pe plan AE IIci fără profil completat e
 * presumat IIci — fail-safe restrictiv).
 *
 * @param {string|null} auditorGrad — "Ici" | "IIci" | null (din profil)
 * @param {object} planFeatures — PLAN_FEATURES[planId]
 * @returns {"Ici"|"IIci"|null}
 */
function resolveLegalGrade(auditorGrad, planFeatures) {
  const real = auditorGrad ? String(auditorGrad) : null;
  if (real === "Ici" || real === "IIci") return real;
  // Fallback la plan ca proxy când profilul nu are grad declarat
  return planFeatures?.gradMdlpaRequired ?? null;
}

/**
 * Construiește un verdict cu suport pentru perioada de tranziție.
 * Dacă inTransition && blocking → returnează soft warning în loc de blocaj.
 *
 * @param {object|null} blocking — { reason, legalRef, upgradePath } sau null pentru OK
 * @param {boolean} inTransition
 * @returns {object}
 */
function buildVerdict(blocking, inTransition) {
  if (!blocking) {
    return {
      ok: true,
      severity: "ok",
      reason: "",
      legalRef: "",
      upgradePath: null,
      inTransition,
      softWarning: null,
      blockedBy: null,
    };
  }
  if (inTransition) {
    const expiryStr = ORD_2237_REPEAL_DATE.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return {
      ok: true, // unblock în tranziție
      severity: "warning",
      reason: blocking.reason,
      legalRef: blocking.legalRef,
      upgradePath: blocking.upgradePath,
      inTransition: true,
      blockedBy: "grade-transition",
      softWarning:
        `⏱️ Perioadă de tranziție Ord. MDLPA 348/2026: această acțiune e ` +
        `permisă acum, dar din ${expiryStr} (abrogare Ord. 2237/2010, Art. 7 ` +
        `Ord. 348/2026) va deveni blocantă. ${blocking.reason}`,
    };
  }
  return {
    ok: false,
    severity: "blocking",
    reason: blocking.reason,
    legalRef: blocking.legalRef,
    upgradePath: blocking.upgradePath,
    inTransition: false,
    softWarning: null,
    blockedBy: "grade",
  };
}

/**
 * Evaluează dacă auditorul (cu atestatul real) poate emite legal pe această
 * clădire, pentru această operațiune, în această dată.
 *
 * @param {object} args
 * @param {string} args.plan — id plan (free/edu/audit/pro/expert/birou/enterprise)
 * @param {string|null} args.auditorGrad — gradul real al auditorului din profil ("Ici"|"IIci"|null)
 * @param {object} args.building — { category, scopCpe, isPublic, ... }
 * @param {string} [args.operation] — "cpe" (default) | "audit" | "nzeb"
 * @param {Date} [args.now] — pentru testabilitate; default = new Date()
 * @returns {{
 *   ok: boolean,
 *   severity: "ok"|"info"|"warning"|"blocking",
 *   reason: string,
 *   legalRef: string,
 *   upgradePath: string|null,
 *   inTransition: boolean,
 *   softWarning: string|null,
 *   blockedBy: "grade"|"grade-transition"|null
 * }}
 */
export function canEmitForBuilding({
  plan,
  auditorGrad,
  building,
  operation = "cpe",
  now = new Date(),
}) {
  const planId = resolvePlan(plan);
  const features = PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  const cat = building?.category ? String(building.category).toUpperCase() : "";
  const scop = building?.scopCpe ? String(building.scopCpe).toLowerCase() : "";
  const isPublic = building?.isPublic === true;

  const inTransition = isInTransitionWindow(now) && !isForceStrictMode();
  const userGrade = resolveLegalGrade(auditorGrad, features);

  // ─────────────────────────────────────────────────────────────────────
  // 1) Plan free / edu — demo / scop didactic, fără validare legală
  // ─────────────────────────────────────────────────────────────────────
  if (planId === "free" || planId === "edu") {
    return buildVerdict(null, inTransition);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2) Operațiune audit — rezervată AE Ici (Art. 6 alin. 1 lit. b)
  // ─────────────────────────────────────────────────────────────────────
  if (operation === "audit" && userGrade === "IIci") {
    return buildVerdict(
      {
        reason:
          "Auditorii grad profesional II civile (AE IIci) NU pot realiza " +
          "activitatea de audit energetic. Conform Art. 6 alin. (1) lit. b) " +
          "coroborat cu Art. 6 alin. (2) din Ord. MDLPA 348/2026, auditul " +
          "energetic e rezervat exclusiv auditorilor grad profesional I " +
          "civile (AE Ici).",
        legalRef: "Art. 6 alin. (1) lit. b) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3) Operațiune nZEB — rezervată AE Ici (Art. 6 alin. 1 lit. c)
  // ─────────────────────────────────────────────────────────────────────
  if (operation === "nzeb" && userGrade === "IIci") {
    return buildVerdict(
      {
        reason:
          "Auditorii AE IIci NU pot întocmi raportul de conformare nZEB. " +
          "Conform Art. 6 alin. (1) lit. c) coroborat cu Art. 6 alin. (2) din " +
          "Ord. MDLPA 348/2026, raportul nZEB pentru clădiri în faza de " +
          "proiectare e rezervat exclusiv auditorilor AE Ici.",
        legalRef: "Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4) Categoria clădirii lipsă — info, fără blocaj
  // ─────────────────────────────────────────────────────────────────────
  if (!cat) {
    return {
      ok: true,
      severity: "info",
      reason:
        "Selectează categoria clădirii pentru a valida conformitatea cu " +
        "Ord. MDLPA 348/2026.",
      legalRef: "Ord. MDLPA 348/2026 Art. 6",
      upgradePath: null,
      inTransition,
      softWarning: null,
      blockedBy: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 5) AE Ici real (sau superior) — drepturi legale complete, fără restricții
  // ─────────────────────────────────────────────────────────────────────
  if (userGrade !== "IIci") {
    return buildVerdict(null, inTransition);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 6) AE IIci real — restricții stricte Art. 6 alin. (2)
  // ─────────────────────────────────────────────────────────────────────

  // 6.1) Categorie nerezidențială — INTERZIS
  if (!isResidentialCategory(cat)) {
    return buildVerdict(
      {
        reason:
          `Această clădire (${cat}) nu poate fi certificată de un auditor ` +
          `AE IIci. Conform Art. 6 alin. (2) Ord. MDLPA 348/2026, auditorii ` +
          `grad II civile elaborează CPE EXCLUSIV pentru locuințe ` +
          `unifamiliale, blocuri de locuințe și apartamente din blocuri.`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // 6.2) Clădire publică (chiar dacă rezidențial) — INTERZIS
  //    Locuințe sociale ANL publice, case de protocol publice etc. sunt în
  //    sfera competenței AE Ici fiindcă L.372/2005 Art. 7 alin. 1 lit. f le
  //    enumeră separat ca clădiri ocupate de autorități publice.
  if (isPublic) {
    return buildVerdict(
      {
        reason:
          "Clădirile ocupate de autorități publice (locuințe sociale " +
          "publice, case de protocol etc.) nu pot fi certificate de AE IIci. " +
          "Conform L.372/2005 Art. 7 alin. (1) lit. f) coroborat cu Art. 6 " +
          "alin. (1) Ord. MDLPA 348/2026, acestea sunt în sfera de " +
          "competență AE Ici.",
        legalRef:
          "L.372/2005 Art. 7 alin. (1) lit. f) + Art. 6 alin. (1) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // 6.3) Scop NEPERMIS (renovare, schimbare destinație etc.) — INTERZIS
  const ALLOWED_SCOPES_IICI = ["construire", "receptie", "vanzare", "inchiriere"];
  if (scop && !ALLOWED_SCOPES_IICI.includes(scop)) {
    return buildVerdict(
      {
        reason:
          `Scopul „${scop}" nu este permis pentru AE IIci. Conform Art. 6 ` +
          `alin. (2) Ord. MDLPA 348/2026, gradul II civile certifică ` +
          `EXCLUSIV locuințele care SE CONSTRUIESC, SE VÂND sau SE ` +
          `ÎNCHIRIAZĂ. Renovarea energetică, schimbarea destinației și alte ` +
          `scope-uri sunt rezervate AE Ici (Art. 6 alin. 1 lit. a).`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // 6.4) Bloc întreg (RC) la vânzare/închiriere — INTERZIS
  //    Art. 6 alin. (2) menționează blocuri DOAR la „se construiesc".
  if (cat === "RC" && (scop === "vanzare" || scop === "inchiriere")) {
    return buildVerdict(
      {
        reason:
          "Vânzarea sau închirierea unui bloc de locuințe întreg nu poate fi " +
          "certificată de AE IIci. Conform Art. 6 alin. (2) Ord. MDLPA " +
          "348/2026, AE IIci certifică blocurile NUMAI la construire " +
          "(clădiri noi). Pentru tranzacția pe bloc întreg existent este " +
          "necesar AE Ici.",
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // 6.5) Apartament (BC) la construire individuală — INTERZIS
  //    Art. 6 alin. (2) menționează apartamentele DOAR la „se vând sau se
  //    închiriază".
  if (cat === "BC" && (scop === "construire" || scop === "receptie")) {
    return buildVerdict(
      {
        reason:
          "Construirea/recepția unui apartament individual (separat de " +
          "blocul întreg) nu poate fi certificată de AE IIci. Conform Art. 6 " +
          "alin. (2) Ord. MDLPA 348/2026, AE IIci certifică apartamente " +
          "NUMAI la vânzare sau închiriere.",
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      },
      inTransition,
    );
  }

  // 6.6) Toate verificările trecute — OK pentru AE IIci
  return buildVerdict(null, inTransition);
}

/**
 * Lista scope-uri PERMISE pentru un plan dat — folosit la disable
 * dropdown options în Step 1.
 *
 * @param {string} plan — id plan
 * @returns {string[]|"all"}
 */
export function getAllowedScopes(plan) {
  const planId = resolvePlan(plan);
  const features = PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  return features.scopCpeAllowed;
}

/**
 * Lista categorii PERMISE pentru un plan dat.
 *
 * @param {string} plan — id plan
 * @returns {string[]|null} — null = toate permise
 */
export function getAllowedCategories(plan) {
  const planId = resolvePlan(plan);
  const features = PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  return features.buildingCategoryRestricted;
}
