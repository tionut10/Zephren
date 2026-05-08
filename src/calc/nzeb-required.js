/**
 * nzeb-required.js — Sprint 8 mai 2026
 *
 * Determină dacă o clădire DAT-Ă necesită raport de conformare nZEB conform
 * legislației române în vigoare. Helper-ul este folosit de UI (Step 6 buton
 * „PDF oficial", Step 7 card referință) pentru a bloca generarea când
 * raportul nu e juridic obligatoriu, evitând astfel:
 *   1. Documente inutile (CPE simplu vânzare/închiriere → nu trebuie nZEB)
 *   2. Verdict înșelător (clădire <50 m² nu intră în obligația nZEB)
 *   3. Confuzie auditor (când e obligatoriu vs. opțional)
 *
 * BAZA LEGALĂ:
 *   • Art. 13¹ alin. (2) Legea 372/2005 R2:
 *     „toate clădirile noi trebuie să fie clădiri al căror consum de energie
 *      este aproape egal cu zero"  → necesar pentru clădiri noi (proiectare,
 *      construire, recepție)
 *   • Art. 9 EPBD 2010/31 + 2024/1275:
 *     renovările majore trebuie să atingă cerințele nZEB (cost-optimal)
 *   • Art. 4 Legea 372/2005 R2 — categorii EXCEPTATE:
 *     - clădiri monument istoric / situri protejate (categorii A+B LMI)
 *     - locuri de cult (biserici, moschei, sinagogi, mănăstiri)
 *     - clădiri provizorii cu folosință ≤ 2 ani
 *     - clădiri industriale / agricole non-rezidențiale dominant tehnologice
 *     - clădiri rezidențiale ocupate < 4 luni/an (case de vacanță)
 *     - clădiri independente cu Au < 50 m²
 *
 * UTILIZARE:
 *   const { required, reason, severity } = requiresNZEBReport(building);
 *   if (required) → buton activ verde (cazul juridic-obligatoriu)
 *   else          → buton disabled + tooltip cu motivul
 *
 *   severity:
 *     - "required"   = obligatoriu legal (Art. 13¹ + Art. 9 EPBD)
 *     - "optional"   = nu e necesar legal, dar generarea ar fi informativă
 *     - "exempted"   = explicit exceptat (Art. 4 L.372/2005)
 */

import { isRenovationScope } from "../utils/scop-cpe-labels.js";

// Scopuri CPE care implică OBLIGATORIU raport nZEB (clădire nouă)
const NEW_BUILDING_SCOPES = new Set(["construire", "receptie", "proiectare"]);

/**
 * Verifică dacă o clădire necesită raport de conformare nZEB.
 *
 * @param {object} building - obiectul standard `building` din state
 *   @param {string} [building.scopCpe]      — scop CPE (construire/renovare/vanzare/...)
 *   @param {string|number} [building.areaUseful] — Au [m²]
 *   @param {string} [building.category]     — RI/RC/RA/BI/ED/SA/HC/CO/SP/AL/IN
 *   @param {boolean} [building.isHistoric]  — clădire LMI clasa A/B
 *   @param {string} [building.lmiClass]     — clasa LMI ("A"|"B"|null)
 *   @param {boolean} [building.isReligious] — loc de cult
 *   @param {boolean} [building.isProvisional] — folosință ≤ 2 ani
 *   @param {number} [building.occupancyMonths] — luni de ocupare/an
 *
 * @returns {{
 *   required: boolean,
 *   severity: "required"|"optional"|"exempted",
 *   reason: string,
 *   article: string,
 * }}
 */
export function requiresNZEBReport(building) {
  if (!building || typeof building !== "object") {
    return {
      required: false,
      severity: "optional",
      reason: "Date clădire incomplete — nu se poate determina obligativitatea.",
      article: "—",
    };
  }

  const Au = parseFloat(building.areaUseful);
  const scop = String(building.scopCpe || "").toLowerCase();
  const cat = String(building.category || "").toUpperCase();

  // ── 1. EXCEPȚII ABSOLUTE (Art. 4 Legea 372/2005 R2) ──
  // Aceste clădiri NU intră deloc în obligația nZEB, indiferent de scop.

  if (Number.isFinite(Au) && Au > 0 && Au < 50) {
    return {
      required: false,
      severity: "exempted",
      reason: `Clădire independentă cu Au = ${Au.toFixed(1)} m² (sub 50 m²) — exceptată conform Art. 4 alin. (2) lit. f) Legea 372/2005 R2.`,
      article: "Art. 4 alin. (2) lit. f) L.372/2005",
    };
  }

  if (building.isHistoric === true || ["A", "B"].includes(String(building.lmiClass || "").toUpperCase())) {
    const cls = building.lmiClass ? ` (clasa LMI ${building.lmiClass})` : "";
    return {
      required: false,
      severity: "exempted",
      reason: `Monument istoric${cls} — exceptat conform Art. 4 alin. (2) lit. a) Legea 372/2005 R2. Verificați avizul Direcției Județene pentru Cultură pentru limitări de intervenție.`,
      article: "Art. 4 alin. (2) lit. a) L.372/2005",
    };
  }

  // Loc de cult — flag explicit pe building (catalogul Zephren nu are categorie
  // dedicată „cult"; intră de regulă sub AL, deci e nevoie de flag explicit).
  if (building.isReligious === true) {
    return {
      required: false,
      severity: "exempted",
      reason: "Loc de cult (biserică / moschee / sinagogă / mănăstire) — exceptat conform Art. 4 alin. (2) lit. b) Legea 372/2005 R2.",
      article: "Art. 4 alin. (2) lit. b) L.372/2005",
    };
  }

  if (building.isProvisional === true) {
    return {
      required: false,
      severity: "exempted",
      reason: "Clădire provizorie cu durată folosință ≤ 2 ani — exceptată conform Art. 4 alin. (2) lit. c) Legea 372/2005 R2.",
      article: "Art. 4 alin. (2) lit. c) L.372/2005",
    };
  }

  // Clădiri rezidențiale ocupate < 4 luni/an (case de vacanță)
  const occ = parseFloat(building.occupancyMonths);
  if (Number.isFinite(occ) && occ > 0 && occ < 4 && (cat === "RI" || cat === "RC" || cat === "RA")) {
    return {
      required: false,
      severity: "exempted",
      reason: `Clădire rezidențială ocupată ${occ.toFixed(0)} luni/an (sub 4 luni — casă de vacanță) — exceptată conform Art. 4 alin. (2) lit. e) Legea 372/2005 R2.`,
      article: "Art. 4 alin. (2) lit. e) L.372/2005",
    };
  }

  // Clădiri industriale / ateliere cu consum tehnologic dominant
  // Categoria "IN" în Zephren marchează clădiri industriale.
  if (cat === "IN") {
    return {
      required: false,
      severity: "exempted",
      reason: "Clădire industrială / atelier cu consum tehnologic dominant — exceptată conform Art. 4 alin. (2) lit. d) Legea 372/2005 R2.",
      article: "Art. 4 alin. (2) lit. d) L.372/2005",
    };
  }

  // ── 2. CAZURI OBLIGATORII (Art. 13¹ + Art. 9 EPBD) ──

  if (NEW_BUILDING_SCOPES.has(scop)) {
    return {
      required: true,
      severity: "required",
      reason: "Clădire nouă (proiectare / recepție) — raport nZEB obligatoriu conform Art. 13¹ alin. (2) Legea 372/2005 R2.",
      article: "Art. 13¹ alin. (2) L.372/2005",
    };
  }

  if (isRenovationScope(scop)) {
    return {
      required: true,
      severity: "required",
      reason: "Renovare majoră — raport nZEB obligatoriu conform Art. 9 EPBD 2010/31 (transpunere L.372/2005 R2 + Mc 001-2022 §6).",
      article: "Art. 9 EPBD + Mc 001-2022 §6",
    };
  }

  // ── 3. CPE EXISTENT (vânzare / închiriere / informare) — OPȚIONAL ──
  // Raportul nZEB nu e obligatoriu, dar auditorul poate genera unul informativ
  // pentru a documenta abaterea față de pragurile nZEB (util la analiza
  // pre-renovare sau pentru pașaport de renovare).

  if (scop === "vanzare" || scop === "inchiriere") {
    return {
      required: false,
      severity: "optional",
      reason: `CPE pentru tranzacție (${scop === "vanzare" ? "vânzare" : "închiriere"}) — raportul nZEB nu este obligatoriu legal pentru clădirea existentă. Generarea rămâne disponibilă ca document informativ.`,
      article: "—",
    };
  }

  if (scop === "informare" || scop === "alt") {
    return {
      required: false,
      severity: "optional",
      reason: "CPE informativ — raportul nZEB nu este obligatoriu. Generarea rămâne disponibilă pentru evaluare orientativă.",
      article: "—",
    };
  }

  // Scop necunoscut — fallback prudent: opțional
  return {
    required: false,
    severity: "optional",
    reason: `Scop CPE „${scop || "nespecificat"}" — verificați manual obligația nZEB cu beneficiarul.`,
    article: "—",
  };
}

/**
 * Helper sugar — întoarce doar boolean (pentru cazurile simple).
 */
export function isNZEBReportRequired(building) {
  return requiresNZEBReport(building).required;
}
