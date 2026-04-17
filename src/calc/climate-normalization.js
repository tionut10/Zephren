// ===============================================================
// NORMALIZARE CLIMATICĂ CONSUM REAL
// ===============================================================
//
// Normativ: SR 4839:2014 §4.2 + Mc 001-2022 Cap. 3.3.2 + ET pct. 6.3
// Scop: corectează consumul real măsurat al unei clădiri la condiții
// climatice convenționale (anul standard al localității) pentru a permite
// comparația validă cu valorile calculate conform Mc 001.
//
// Formula:
//   k_clim = GZE_convențional / GZE_real_an_masurat
//   Consum_normalizat = Consum_real × k_clim
//
// Unde:
//   - GZE_convențional = grade-zile încălzire pentru localitate (Tab NA:2023)
//   - GZE_real         = grade-zile încălzire efective în anul facturilor
//                        (calculate din T_ext_zilnic sau T_ext_lunar)
//
// Exemplu București (iarnă blândă 2023-2024):
//   GZE_conv = 3170 K·zi (Mc 001)
//   GZE_real = 2700 K·zi (iarnă blândă)
//   k_clim   = 3170 / 2700 = 1.174
//   → un consum real de 9.000 kWh devine 9.000 × 1.174 ≈ 10.563 kWh
//     pentru comparație cu valoarea calculată.
//
// Referință implementare: AUDIT_14_step10_real_consumption.md §2
// ===============================================================

import {
  getGzeConventional,
  gzeFromMonthlyMeans,
  DAYS_PER_MONTH,
} from "../data/climate-data-na-2023.js";

// Limite pragmatice pentru factorul de corecție climatică: evită amplificări
// aberante (ex. GZE_real aproape de 0 → k_clim ∞).
const K_CLIM_MIN = 0.5;
const K_CLIM_MAX = 2.0;

/**
 * Calculează GZE (grade-zile încălzire) pe baza temperaturilor zilnice.
 * @param {number[]} dailyTemps - array cu temperaturile medii zilnice [°C]
 * @param {number} tBase - temperatura de bază [°C] (implicit 12°C — bază Mc 001)
 * @returns {number} GZE [K·zi]
 */
export function calcGzeDaily(dailyTemps, tBase = 12) {
  if (!Array.isArray(dailyTemps) || dailyTemps.length === 0) return 0;
  return dailyTemps.reduce((acc, t) => {
    if (typeof t !== "number" || !isFinite(t)) return acc;
    return t < tBase ? acc + (tBase - t) : acc;
  }, 0);
}

/**
 * Calculează GZE pe baza temperaturilor lunare medii (aproximare rezonabilă
 * când datele zilnice nu sunt disponibile).
 * @param {number[]} monthlyTemps - 12 temperaturi medii lunare [°C]
 * @param {number} tBase - temperatura de bază [°C]
 * @param {number[]} daysPerMonth - zile pe lună (standard)
 * @returns {number} GZE [K·zi/an]
 */
export function calcGzeMonthly(monthlyTemps, tBase = 12, daysPerMonth = DAYS_PER_MONTH) {
  return gzeFromMonthlyMeans(monthlyTemps, tBase, daysPerMonth) || 0;
}

/**
 * Calculează factorul de corecție climatică k_clim = GZE_conv / GZE_real.
 * Clamped la [0.5, 2.0] pentru robustețe.
 * @param {number} gzeConventional - GZE convențional localitate
 * @param {number} gzeReal - GZE real (an măsurat)
 * @returns {number} k_clim — factor de corecție climatică adimensional
 */
export function climaticCorrectionFactor(gzeConventional, gzeReal) {
  if (!gzeConventional || !gzeReal || gzeReal <= 0) return 1;
  const k = gzeConventional / gzeReal;
  if (!isFinite(k)) return 1;
  return Math.min(Math.max(k, K_CLIM_MIN), K_CLIM_MAX);
}

/**
 * Normalizează consumul real la condiții climatice convenționale.
 * @param {object} params
 * @param {number} params.consumKWh - consum real măsurat [kWh]
 * @param {number} [params.gzeReal] - GZE efectiv al anului (dacă e cunoscut)
 * @param {number[]} [params.monthlyTemps] - 12 T medii lunare (alternativă la gzeReal)
 * @param {number[]} [params.dailyTemps] - array T zilnice (preferat dacă e disponibil)
 * @param {string} [params.localitate] - numele localității pentru lookup GZE_conv
 * @param {number} [params.gzeConventional] - GZE convențional (override dacă e dat)
 * @param {number} [params.tBase=12] - temperatura de bază pentru GZE [°C]
 * @returns {object} { consumNormalizat, kClim, gzeReal, gzeConventional }
 */
export function normalizeConsumption({
  consumKWh,
  gzeReal = null,
  monthlyTemps = null,
  dailyTemps = null,
  localitate = null,
  gzeConventional = null,
  tBase = 12,
}) {
  // Rezolvă GZE_conv (prioritate: parametru explicit > lookup localitate)
  const gzeConv =
    gzeConventional ??
    (localitate ? getGzeConventional(localitate) : null);

  // Rezolvă GZE_real (prioritate: zilnic > lunar > valoare explicită)
  let gzeR = gzeReal;
  if (gzeR == null && Array.isArray(dailyTemps) && dailyTemps.length > 0) {
    gzeR = calcGzeDaily(dailyTemps, tBase);
  }
  if (gzeR == null && Array.isArray(monthlyTemps) && monthlyTemps.length === 12) {
    gzeR = calcGzeMonthly(monthlyTemps, tBase);
  }

  const kClim = climaticCorrectionFactor(gzeConv, gzeR);
  const c = typeof consumKWh === "number" && isFinite(consumKWh) ? consumKWh : 0;

  return {
    consumNormalizat: c * kClim,
    kClim,
    gzeReal: gzeR,
    gzeConventional: gzeConv,
    aplicat: kClim !== 1,
  };
}

/**
 * Calculează factorul de calibrare c (Mc 001 Cap. 9.3) împreună cu
 * interpretarea calitativă.
 * @param {number} consumRealNormalizat - consum real normalizat climatic [kWh]
 * @param {number} consumCalculat - consum calculat motor Zephren [kWh]
 * @returns {object} { c, status, interpretare, recomandari }
 */
export function calibrationFactor(consumRealNormalizat, consumCalculat) {
  if (
    consumRealNormalizat == null ||
    consumCalculat == null ||
    typeof consumRealNormalizat !== "number" ||
    typeof consumCalculat !== "number" ||
    !consumCalculat ||
    consumCalculat <= 0 ||
    !isFinite(consumRealNormalizat) ||
    !isFinite(consumCalculat)
  ) {
    return {
      c: null,
      status: "unknown",
      interpretare: "Date insuficiente pentru calcul factor c",
      recomandari: [],
    };
  }

  const c = consumRealNormalizat / consumCalculat;

  if (c >= 0.8 && c <= 1.2) {
    return {
      c,
      status: "ok",
      interpretare: "✓ Model calibrat — discrepanță în limitele ±20% (ET pct. 6.3)",
      recomandari: [],
    };
  }

  if (c < 0.8) {
    return {
      c,
      status: "supraestimare",
      interpretare:
        "⚠️ Model supraestimează consumul real — verificați parametrii de exploatare",
      recomandari: [
        "Reduceți temperatura interioară setpoint (poate 18–19°C în loc de 20°C)",
        "Verificați ocuparea reală vs. cea presupusă (locuință neocupată parțial?)",
        "Verificați programul intermitent de încălzire (nopți/concediu)",
        "Verificați starea reală a anvelopei — poate fi îmbunătățită față de ipoteze",
      ],
    };
  }

  // c > 1.2
  return {
    c,
    status: "subestimare",
    interpretare:
      "⚠️ Model subestimează consumul real — verificați punți termice + infiltrații",
    recomandari: [
      "Verificați punțile termice necalculate (Ψ real > Ψ tabular)",
      "Verificați infiltrațiile reale (n₅₀ real > cel presupus)",
      "Verificați randamentul real al echipamentelor (uzură în exploatare)",
      "Verificați dacă temperatura interioară este mai mare decât 20°C",
      "Verificați consumul auxiliar (pompe, ventilatoare) — poate lipsi din calcul",
    ],
  };
}
