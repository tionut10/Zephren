/**
 * epbd-indicators.js — Indicatori EPBD 2024 (Directiva UE 2024/1275).
 *
 * Sprint 15 — 18 apr 2026
 *
 * Acoperă:
 *  - EV charging points (Art. 14): cazurile obligatorii + recomandate pentru clădiri noi/renovate
 *  - IAQ (Indoor Air Quality, Art. 11 + Anexa IV): limite CO₂ + PM2.5 per categorie
 *  - Rescalare A-G ZEB=A (2030): versiuni de scală energetică cu trecerea la ZEB=A
 */

// ══════════════════════════════════════════════════════════
// EV Charging — EPBD 2024 Art. 14 + L.238/2024 (transpunere RO)
// ══════════════════════════════════════════════════════════

/**
 * Cerințe minime pentru puncte de încărcare EV, pe categorie clădire.
 * Pentru clădiri non-rezidențiale >20 locuri parcare:
 *   - noi/renovate major → 1 pct. instalat la 10 locuri + precablare 50%
 *   - existente (din 2025) → 1 pct. instalat la 20 locuri
 * Pentru rezidențial (bloc) cu >3 locuri parcare:
 *   - precablare 50% din locuri
 */
export function computeEVRequirements({ category, parkingSpaces, yearBuilt, yearRenov }) {
  const n = parseInt(parkingSpaces) || 0;
  const isResidential = ["RI", "RC", "RA"].includes(category);
  const isRecent = (parseInt(yearRenov) || parseInt(yearBuilt) || 0) >= 2024;

  if (n === 0) {
    return { applies: false, reason: "Fără locuri de parcare dedicate" };
  }

  if (isResidential) {
    // Rezidențial: precablare 50% (L.238/2024 + EPBD 2024)
    if (n >= 3) {
      const preparedMin = Math.ceil(n * 0.5);
      return {
        applies: true,
        installedMin: 0,
        preparedMin,
        rule: "Rezidențial ≥3 locuri: precablare 50% (L.238/2024)",
        epbdRef: "EPBD 2024/1275 Art. 14 §3",
      };
    }
    return { applies: false, reason: "Rezidențial <3 locuri parcare — exceptat" };
  }

  // Non-rezidențial
  if (n < 5) {
    return { applies: false, reason: "Non-rezidențial <5 locuri parcare — exceptat" };
  }

  // >20 locuri + nou/renovat major
  if (n > 20 && isRecent) {
    return {
      applies: true,
      installedMin: Math.ceil(n / 10),
      preparedMin: Math.ceil(n * 0.5),
      rule: "Non-rezidențial nou/renovat >20 locuri: 1 pct. la 10 + precablare 50%",
      epbdRef: "EPBD 2024/1275 Art. 14 §1-2",
    };
  }

  // Existent, non-rezidențial
  return {
    applies: true,
    installedMin: Math.max(1, Math.ceil(n / 20)),
    preparedMin: Math.ceil(n * 0.2),
    rule: "Non-rezidențial existent >20 locuri: 1 pct. la 20 (din 2025)",
    epbdRef: "EPBD 2024/1275 Art. 14 §4",
  };
}

/**
 * Verifică dacă instalarea curentă corespunde cerinței EPBD 2024.
 */
export function checkEVCompliance({ installed, prepared, requirements }) {
  if (!requirements?.applies) return { ok: true, gap: null };
  const iOk = (parseInt(installed) || 0) >= (requirements.installedMin || 0);
  const pOk = (parseInt(prepared) || 0) >= (requirements.preparedMin || 0);
  return {
    ok: iOk && pOk,
    gap: iOk && pOk ? null : {
      installed: Math.max(0, (requirements.installedMin || 0) - (parseInt(installed) || 0)),
      prepared: Math.max(0, (requirements.preparedMin || 0) - (parseInt(prepared) || 0)),
    },
  };
}

// ══════════════════════════════════════════════════════════
// IAQ — EPBD 2024 Art. 11 + EN 16798-1 + OMS 2021 (PM2.5)
// ══════════════════════════════════════════════════════════

/**
 * Limite CO₂ indoor (ppm) pe categorie confort (EN 16798-1 Anexa B.2).
 * Cat I: confort ridicat (spitale, creșe)
 * Cat II: confort standard (clădiri noi/renovate — target default)
 * Cat III: confort minim acceptabil (clădiri existente)
 * Cat IV: valori mai slabe — doar temporar
 *
 * Valori absolute (presupunând CO₂ atmosferic ~400 ppm):
 *   Cat I: 950, Cat II: 1200, Cat III: 1750, Cat IV: >1750
 */
export const CO2_PPM_LIMITS = {
  I: 950,
  II: 1200,
  III: 1750,
  IV: 2000, // limită superioară pentru raportare
};

/**
 * Limite PM2.5 (μg/m³) — OMS 2021 Air Quality Guidelines + EPBD 2024 Anexa IV.
 */
export const PM25_LIMITS = {
  who_2021: 5,    // linie directoare OMS 2021 (anual)
  eu_current: 25, // limită UE actuală (anual, Dir. 2008/50/CE)
  eu_2030: 10,    // limită UE 2030 (nouă directivă)
};

/**
 * Evaluează IAQ pentru valorile actuale.
 */
export function evaluateIAQ({ co2_max_ppm, pm25_avg }) {
  const co2 = parseFloat(co2_max_ppm);
  const pm = parseFloat(pm25_avg);

  const result = { co2: null, pm25: null };

  if (!isNaN(co2) && co2 > 0) {
    if (co2 <= CO2_PPM_LIMITS.I) result.co2 = { category: "I", label: "Confort ridicat", color: "emerald" };
    else if (co2 <= CO2_PPM_LIMITS.II) result.co2 = { category: "II", label: "Confort standard", color: "lime" };
    else if (co2 <= CO2_PPM_LIMITS.III) result.co2 = { category: "III", label: "Minim acceptabil", color: "amber" };
    else result.co2 = { category: "IV", label: "Slab — ventilație insuficientă", color: "red" };
    result.co2.value = co2;
  }

  if (!isNaN(pm) && pm >= 0) {
    if (pm <= PM25_LIMITS.who_2021) result.pm25 = { level: "who_2021", label: "Conform OMS 2021", color: "emerald" };
    else if (pm <= PM25_LIMITS.eu_2030) result.pm25 = { level: "eu_2030", label: "Conform UE 2030", color: "lime" };
    else if (pm <= PM25_LIMITS.eu_current) result.pm25 = { level: "eu_current", label: "Conform UE actual", color: "amber" };
    else result.pm25 = { level: "exceeded", label: "Depășește limite UE", color: "red" };
    result.pm25.value = pm;
  }

  return result;
}

// ══════════════════════════════════════════════════════════
// Rescalare A-G ZEB=A (EPBD 2024 Art. 19 + Anexa III) — 2030+
// ══════════════════════════════════════════════════════════

/**
 * Versiuni de scală energetică:
 *  - "2023": scala actuală A+..G (Mc 001-2022)
 *  - "2030_zeb": rescalare ZEB=A (EPBD 2024 Art. 19) — din 2030
 *
 * Diferența: în scala 2030_zeb, clasa A devine rezervată ZEB (zero-emission
 * buildings), iar clasele existente se shiftează cu +1 poziție. Clădirile
 * existente trec din A→B, B→C etc.
 */
export const SCALE_VERSIONS = {
  "2023": {
    id: "2023",
    label: "Scală actuală Mc 001-2022 (A+..G)",
    description: "Scala standard folosită în prezent. Valabilă până la transpunere EPBD 2024 Art. 19.",
    classes: ["A+", "A", "B", "C", "D", "E", "F", "G"],
    zebClass: null,
  },
  "2030_zeb": {
    id: "2030_zeb",
    label: "Scală rescalată 2030 (ZEB = A)",
    description: "Noua scală EPBD 2024: clasa A rezervată ZEB. Clasele existente se shiftează cu +1.",
    classes: ["A", "B", "C", "D", "E", "F", "G"],
    zebClass: "A",
  },
};

/**
 * Aplicare shift A-G ZEB=A: convertește clasa din scala 2023 în scala 2030_zeb.
 *
 * Regulă:
 *  - Clasa A+ existentă (cu EP ≤ ZEB threshold) → A (ZEB)
 *  - Clasele existente A..G shiftate cu +1 poziție (A→B, B→C, ...)
 *  - G rămâne G (nu există clasă H)
 */
export function shiftClass2023To2030(cls, isZEB = false) {
  if (isZEB) return "A";
  const map = {
    "A+": "A",
    "A": "B",
    "B": "C",
    "C": "D",
    "D": "E",
    "E": "F",
    "F": "G",
    "G": "G", // nu avem clasă H
  };
  return map[cls] || cls;
}

/**
 * Returnează clasa finală afișată în funcție de versiune și status ZEB.
 */
export function getDisplayClass({ energyClass, scaleVersion, isZEB }) {
  if (scaleVersion === "2030_zeb") {
    return shiftClass2023To2030(energyClass, isZEB);
  }
  return energyClass;
}
