/**
 * epbd-art17-fossil.js — S30B·B3
 *
 * Verificare obligații EPBD 2024/1275 Art.17 (eliminare combustibili fosili).
 *
 * Sursă: Directiva (UE) 2024/1275 Art.17 + Considerentele 51-58
 * Locație: Normative/UE-Directive/DIR_2024-1275_EPBD-recast.pdf
 *
 * Obligații cheie EPBD Art.17:
 *   1. SUBVENȚII INTERZISE (de la 1 ianuarie 2025) pentru cazane stand-alone
 *      cu combustibili fosili (gaz natural, lignit, păcură). RO are infringement
 *      deschis (cauza C-XXX/2025) pentru încă nu transpus integral.
 *
 *   2. ELIMINARE TOTALĂ (până la 1 ianuarie 2040) a cazanelor stand-alone
 *      pe combustibili fosili în cădiri rezidențiale și nerezidențiale.
 *      Excepții: hibride cu pompă de căldură ≥ 50% acoperire termică.
 *
 *   3. CASE READY ZERO-EMISSION (2030+) — clădiri noi nu mai pot folosi
 *      cazane fosile direct (Art.7). Aceasta e tratată separat în zeb-check.js.
 *
 * Sprint 30 — apr 2026
 */

/** Combustibili fosili monitorizați (din src/data/constants.js FUELS). */
const FOSSIL_FUEL_IDS = new Set([
  "gaz_natural",
  "gaz",
  "GPL",
  "gpl",
  "motorina",
  "pacura",
  "carbune",
  "lignit",
  "antracit",
]);

/** Surse termice cu cazane (excludem PC / DH / electric / biomasă). */
const BOILER_SOURCES = new Set(["CAZAN", "BOILER", "CENTRALA", "FIRE_PLACE"]);

/**
 * Verifică obligația eliminare cazane fosile conform EPBD Art.17.
 *
 * @param {object} heating - { source, fuel, hybridWithHP?, capacityKW? }
 * @returns {object} { isFossil, subsidyBanned, mustReplaceBy, recommendation, sources }
 */
export function checkEPBDArt17Fossil(heating) {
  if (!heating) {
    return { isFossil: false, subsidyBanned: false, mustReplaceBy: null, recommendation: "" };
  }

  const fuel = heating.fuel || heating.fuelId || "";
  const source = (heating.source || "").toUpperCase();
  const isHybridHP = heating.hybridWithHP === true || heating.hybrid === true;

  // Identificare cazan + combustibil fosil
  const isBoiler = BOILER_SOURCES.has(source) || source.includes("CAZAN");
  const isFossil = isBoiler && FOSSIL_FUEL_IDS.has(String(fuel).toLowerCase());

  if (!isFossil) {
    return {
      isFossil: false,
      subsidyBanned: false,
      mustReplaceBy: null,
      recommendation: "Sistem termic neutru / regenerabil — nu intră sub EPBD Art.17.",
      sources: ["EPBD 2024/1275 Art.17"],
    };
  }

  // Hibrid cu PC ≥ 50% — exceptat de la eliminare totală
  if (isHybridHP) {
    return {
      isFossil: true,
      subsidyBanned: false,
      mustReplaceBy: null,
      recommendation: "Sistem hibrid (cazan fosil + pompă căldură ≥ 50%) — eligibil EPBD Art.17 §2 (excepție hibrid). Subvenții posibile pentru componenta PC.",
      sources: ["EPBD 2024/1275 Art.17 §2"],
    };
  }

  // Calculează zile rămase până la 2040
  const today = new Date();
  const deadline2040 = new Date("2040-01-01");
  const yearsRemaining = Math.round((deadline2040 - today) / (1000 * 60 * 60 * 24 * 365.25));

  // Verdict + recomandare
  return {
    isFossil: true,
    subsidyBanned: true, // de la 1 ianuarie 2025
    mustReplaceBy: "2040-01-01",
    yearsRemaining,
    recommendation: `Cazan ${fuel} stand-alone — INTERZIS să primească subvenții (EPBD Art.17 din 1 ian 2025). Eliminare obligatorie până 1 ianuarie 2040 (${yearsRemaining} ani rămași). Recomandare: înlocuire cu pompă de căldură (apă-apă, aer-apă) sau sistem hibrid cu PC ≥ 50%.`,
    alternatives: [
      "Pompă de căldură aer-apă (COP ≥ 3.5)",
      "Pompă de căldură apă-apă (COP ≥ 4.5)",
      "Sistem hibrid cu PC pentru bază + cazan condensare pentru vârf",
      "Termoficare urbană (DH) cu mix regenerabil ≥ 50%",
      "Biomasă (pelete/lemn) cu eficiență ≥ 85%",
    ],
    sources: [
      "EPBD 2024/1275 Art.17 (Fossil fuel boilers phase-out)",
      "EPBD Considerent 56-58 (subvenții interzise 2025)",
      "Locație: Normative/UE-Directive/DIR_2024-1275_EPBD-recast.pdf",
    ],
  };
}

/** Verdict scurt pentru afișare în Step 3 / Pașaport renovare. */
export function getEPBDArt17Verdict(heating) {
  const check = checkEPBDArt17Fossil(heating);
  if (!check.isFossil) return { level: "success", message: check.recommendation };
  if (check.subsidyBanned) return { level: "error", message: check.recommendation };
  return { level: "warning", message: check.recommendation };
}
