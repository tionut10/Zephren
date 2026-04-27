/**
 * canEmitForBuilding.js — Sprint v6.3 (27 apr 2026)
 *
 * Verificare centralizată drept de emitere CPE pentru o clădire dată
 * conform Ord. MDLPA nr. 348/2026 (MO 292/14.IV.2026), Art. 6.
 *
 * Folosit de:
 *   - Step1Identification.jsx → banner blocaj la editare câmpuri
 *   - Step6Certificate.jsx    → refuz export DOCX/XML/submit MDLPA
 *   - Step7Audit.jsx          → blocaj generare raport audit (AE IIci)
 *   - RaportConformareNZEB    → blocaj generare raport nZEB (AE IIci)
 *
 * Reguli legale enforced (Art. 6):
 *
 *  ┌──────────────────────┬─────────────┬───────────────────────────────┐
 *  │ Operațiune           │ AE IIci     │ AE Ici / Expert / Birou / Ent │
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
 */

import { PLAN_FEATURES, resolvePlan } from "./planGating.js";
import { isResidentialCategory } from "../calc/auditor-grad-validation.js";

/**
 * Evaluează dacă pachetul + auditorul + clădirea formează o combinație legală.
 *
 * @param {object} args
 * @param {string} args.plan — id plan (free/edu/audit/pro/expert/birou/enterprise)
 * @param {string|null} args.auditorGrad — gradul real al auditorului din profil ("Ici"|"IIci"|null)
 * @param {object} args.building — { category, scopCpe, isPublic, ... }
 * @param {string} [args.operation] — "cpe" (default) | "audit" | "nzeb"
 * @returns {{ ok: boolean, severity: "ok"|"blocking"|"warning"|"info",
 *            reason: string, legalRef: string, upgradePath: string|null }}
 */
export function canEmitForBuilding({ plan, auditorGrad, building, operation = "cpe" }) {
  const planId = resolvePlan(plan);
  const features = PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  const cat = building?.category ? String(building.category).toUpperCase() : "";
  const scop = building?.scopCpe ? String(building.scopCpe).toLowerCase() : "";
  const isPublic = building?.isPublic === true;
  const planGrade = features.gradMdlpaRequired;
  const realGrade = auditorGrad ? String(auditorGrad) : null;

  // Determină gradul efectiv al utilizatorului — cel mai restrictiv dintre plan și atestat real.
  // (Un auditor AE IIci real, chiar pe plan Ici/Expert, rămâne limitat de atestatul lui.)
  const effectiveGrade =
    realGrade === "IIci" || planGrade === "IIci"
      ? "IIci"
      : (realGrade === "Ici" || planGrade === "Ici" ? "Ici" : null);

  // ─────────────────────────────────────────────────────────────────────
  // 0) Operațiuni audit/nZEB — blocate pentru AE IIci (orice plan)
  // ─────────────────────────────────────────────────────────────────────
  if (operation === "audit" && effectiveGrade === "IIci") {
    return {
      ok: false,
      severity: "blocking",
      reason:
        "Auditorii grad profesional II civile (AE IIci) NU pot realiza activitatea " +
        "de audit energetic. Conform Art. 6 alin. (1) lit. b) coroborat cu Art. 6 " +
        "alin. (2) din Ord. MDLPA 348/2026, auditul energetic e rezervat exclusiv " +
        "auditorilor grad profesional I civile (AE Ici).",
      legalRef: "Art. 6 alin. (1) lit. b) Ord. MDLPA 348/2026",
      upgradePath: "AE Ici",
    };
  }

  if (operation === "nzeb" && effectiveGrade === "IIci") {
    return {
      ok: false,
      severity: "blocking",
      reason:
        "Auditorii AE IIci NU pot întocmi raportul de conformare nZEB. Conform " +
        "Art. 6 alin. (1) lit. c) coroborat cu Art. 6 alin. (2) din Ord. MDLPA " +
        "348/2026, raportul nZEB pentru clădiri în faza de proiectare e rezervat " +
        "exclusiv auditorilor AE Ici.",
      legalRef: "Art. 6 alin. (1) lit. c) Ord. MDLPA 348/2026",
      upgradePath: "AE Ici",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 1) Categoria clădirii lipsă — info, fără blocaj
  // ─────────────────────────────────────────────────────────────────────
  if (!cat) {
    return {
      ok: true,
      severity: "info",
      reason: "Selectează categoria clădirii pentru a valida conformitatea cu Ord. MDLPA 348/2026.",
      legalRef: "Ord. MDLPA 348/2026 Art. 6",
      upgradePath: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2) Plan free / edu — fără validare legală (demo / scop didactic cu watermark)
  // ─────────────────────────────────────────────────────────────────────
  if (planGrade === null) {
    return { ok: true, severity: "ok", reason: "", legalRef: "", upgradePath: null };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3) AE IIci — restricții stricte Art. 6 alin. (2)
  // ─────────────────────────────────────────────────────────────────────
  if (effectiveGrade === "IIci") {
    // 3.1) Categorie nerezidențială — INTERZIS
    if (!isResidentialCategory(cat)) {
      return {
        ok: false,
        severity: "blocking",
        reason:
          `Această clădire (${cat}) nu poate fi certificată de un auditor AE IIci. ` +
          `Conform Art. 6 alin. (2) Ord. MDLPA 348/2026, auditorii grad II civile ` +
          `elaborează CPE EXCLUSIV pentru locuințe unifamiliale, blocuri de locuințe ` +
          `și apartamente din blocuri.`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.2) Clădire publică (chiar dacă rezidențial) — INTERZIS
    //    (Locuințe sociale ANL publice, case de protocol publice etc. sunt în
    //    sfera competenței AE Ici fiindcă L.372/2005 Art. 7 alin. 1 lit. f le
    //    enumeră separat ca clădiri ocupate de autorități publice.)
    if (isPublic && !features.publicBuildingAllowed) {
      return {
        ok: false,
        severity: "blocking",
        reason:
          "Clădirile ocupate de autorități publice (locuințe sociale publice, case " +
          "de protocol etc.) nu pot fi certificate de AE IIci. Conform L.372/2005 " +
          "Art. 7 alin. (1) lit. f) coroborat cu Art. 6 alin. (1) Ord. MDLPA 348/2026, " +
          "acestea sunt în sfera de competență AE Ici.",
        legalRef: "L.372/2005 Art. 7 alin. (1) lit. f) + Art. 6 alin. (1) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.3) Scop NEPERMIS (renovare, schimbare destinație etc.) — INTERZIS
    //    IMPORTANT: când effectiveGrade=IIci (auditor real IIci pe plan Pro/Expert),
    //    restricția se aplică indiferent de scopCpeAllowed al planului. Atestatul real
    //    al auditorului trumps permisiunile planului.
    const ALLOWED_SCOPES_IICI = ["construire", "receptie", "vanzare", "inchiriere"];
    if (scop && !ALLOWED_SCOPES_IICI.includes(scop)) {
      return {
        ok: false,
        severity: "blocking",
        reason:
          `Scopul „${scop}" nu este permis pentru AE IIci. Conform Art. 6 alin. (2) ` +
          `Ord. MDLPA 348/2026, gradul II civile certifică EXCLUSIV locuințele care ` +
          `SE CONSTRUIESC, SE VÂND sau SE ÎNCHIRIAZĂ. Renovarea energetică, schimbarea ` +
          `destinației și alte scope-uri sunt rezervate AE Ici (Art. 6 alin. 1 lit. a).`,
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.4) Bloc întreg (RC) la vânzare/închiriere — INTERZIS
    //    Art. 6 alin. (2) menționează blocuri DOAR la „se construiesc".
    //    Restricția se aplică indiferent de planul cumpărat — atestatul IIci real domină.
    if (cat === "RC" && (scop === "vanzare" || scop === "inchiriere")) {
      return {
        ok: false,
        severity: "blocking",
        reason:
          "Vânzarea sau închirierea unui bloc de locuințe întreg nu poate fi " +
          "certificată de AE IIci. Conform Art. 6 alin. (2) Ord. MDLPA 348/2026, " +
          "AE IIci certifică blocurile NUMAI la construire (clădiri noi). " +
          "Pentru tranzacția pe bloc întreg existent este necesar AE Ici.",
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.5) Apartament (BC) la construire individuală — INTERZIS
    //    Art. 6 alin. (2) menționează apartamentele DOAR la „se vând sau se
    //    închiriază". Restricția aplicabilă indiferent de plan (atestatul IIci domină).
    if (cat === "BC" && (scop === "construire" || scop === "receptie")) {
      return {
        ok: false,
        severity: "blocking",
        reason:
          "Construirea/recepția unui apartament individual (separat de blocul " +
          "întreg) nu poate fi certificată de AE IIci. Conform Art. 6 alin. (2) " +
          "Ord. MDLPA 348/2026, AE IIci certifică apartamente NUMAI la vânzare " +
          "sau închiriere.",
        legalRef: "Art. 6 alin. (2) Ord. MDLPA 348/2026",
        upgradePath: "AE Ici",
      };
    }

    // 3.6) Toate verificările trecute — OK pentru AE IIci
    return { ok: true, severity: "ok", reason: "", legalRef: "", upgradePath: null };
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4) AE Ici / Expert / Birou / Enterprise — scop complet, fără restricții
  // ─────────────────────────────────────────────────────────────────────
  return { ok: true, severity: "ok", reason: "", legalRef: "", upgradePath: null };
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
