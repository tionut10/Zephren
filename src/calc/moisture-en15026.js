/**
 * Umiditate Relativă Interioară Detaliată — profil condensare și mucegai
 * Referințe:
 * - SR EN 15026:2007 — Transfer termic și de umiditate prin componente
 * - SR EN ISO 13788:2013 — Temperatura interioară de suprafață (mucegai)
 * - SR EN ISO 6946:2017 — Rezistența termică componente de clădire
 * - SR EN 15251:2007 — Condiții mediu interior (umiditate)
 * - DIN 4108-3 — Protecție împotriva umezelii (referință suplimentară)
 *
 * Principiu: se calculează profilul de temperatură și presiune de vapori
 * prin straturile anvelopei, identificând zonele cu risc de condensare
 * interstițială și risc de mucegai pe suprafața interioară.
 */

// ── Constante fizice ────────────────────────────────────────────
const R_SI = 0.13;  // m²·K/W — rezistență termică superficială interioară (EN ISO 6946)
const R_SE = 0.04;  // m²·K/W — rezistență termică superficială exterioară

/**
 * Surse de umiditate interioară [g/h per sursă]
 * Conform EN 15251 Anexa C + DIN 4108-3
 */
export const MOISTURE_SOURCES = {
  person_rest:    40,   // g/h — persoană în repaus
  person_active:  90,   // g/h — persoană activă
  cooking:        600,  // g/h — gătit (aragaz)
  shower:         2600, // g/h — duș
  bath:           700,  // g/h — baie
  laundry_drying: 500,  // g/h — uscat rufe interior
  plants:         10,   // g/h — per plantă
  aquarium:       40,   // g/h — per m² suprafață apă
};

/**
 * Niveluri de risc mucegai conform EN ISO 13788 Secț.5
 * Bazat pe RH superficial pe suprafața interioară
 */
export const MOLD_RISK_LEVELS = {
  safe:     { rh_max: 65, label: "Sigur — fără risc",            color: "#22c55e" },
  low:      { rh_max: 75, label: "Risc scăzut — monitorizare",    color: "#84cc16" },
  moderate: { rh_max: 80, label: "Risc moderat — mucegai posibil", color: "#eab308" },
  high:     { rh_max: 90, label: "Risc ridicat — mucegai probabil",color: "#f97316" },
  critical: { rh_max: 100, label: "Condensare activă",            color: "#ef4444" },
};

/**
 * Presiune de saturație a vaporilor de apă [Pa]
 * Formula Magnus-Tetens (EN 13788 Secț.4.2)
 * @param {number} T — temperatură [°C]
 * @returns {number} presiune saturație [Pa]
 */
function pSat(T) {
  if (T >= 0) {
    return 610.5 * Math.exp((17.269 * T) / (237.29 + T));
  }
  // Sub 0°C — peste gheață
  return 610.5 * Math.exp((21.875 * T) / (265.5 + T));
}

/**
 * Clasificare risc mucegai pe baza RH superficial
 * @param {number} rh — umiditate relativă superficială [%]
 * @returns {string} nivel risc (cheie din MOLD_RISK_LEVELS)
 */
function classifyMoldRisk(rh) {
  if (rh <= 65) return "safe";
  if (rh <= 75) return "low";
  if (rh <= 80) return "moderate";
  if (rh <= 90) return "high";
  return "critical";
}

/**
 * Calcul profil de umiditate și condensare prin anvelopă
 *
 * @param {object} params
 * @param {Array<{name:string, d:number, lambda:number, mu:number}>} params.layers —
 *        straturi de la interior spre exterior:
 *        - name: denumire strat
 *        - d: grosime [m]
 *        - lambda: conductivitate termică [W/(m·K)]
 *        - mu: factor de rezistență la difuzia vaporilor [-] (EN 12524)
 * @param {number[]} params.theta_int_month — temperatură interioară lunară [°C]
 *        (12 valori, default 20°C constant)
 * @param {number[]} params.theta_ext_month — temperatură exterioară lunară [°C]
 *        (12 valori, default referință zona III România)
 * @param {number} params.RH_int — umiditate relativă interioară [%] (default 50)
 * @param {number[]} params.RH_ext_month — umiditate relativă exterioară lunară [%]
 *        (12 valori, default referință)
 * @param {string} params.orientation — orientarea peretelui ("N","S","E","V")
 * @returns {object} rezultat profil umiditate
 */
export function calcMoistureProfile({
  layers = [
    { name: "Tencuială int.", d: 0.015, lambda: 0.70, mu: 10 },
    { name: "Cărămidă",       d: 0.300, lambda: 0.70, mu: 10 },
    { name: "Polistiren EPS", d: 0.100, lambda: 0.040, mu: 30 },
    { name: "Tencuială ext.", d: 0.015, lambda: 0.87, mu: 15 },
  ],
  theta_int_month = null,
  theta_ext_month = null,
  RH_int = 50,
  RH_ext_month = null,
  orientation = "N",
} = {}) {
  // ── Date climatice implicite ───────────────────────────────
  const t_int = theta_int_month && theta_int_month.length === 12
    ? theta_int_month
    : Array(12).fill(20);

  const t_ext = theta_ext_month && theta_ext_month.length === 12
    ? theta_ext_month
    : [-1.5, 0.5, 5.5, 11.0, 16.5, 20.0, 22.0, 21.5, 16.5, 11.0, 5.0, 0.5];

  const rh_ext = RH_ext_month && RH_ext_month.length === 12
    ? RH_ext_month
    : [85, 82, 75, 68, 65, 62, 60, 62, 70, 78, 83, 87];

  // ── 1. Rezistență termică totală ───────────────────────────
  // R_total = R_si + Σ(d_i / λ_i) + R_se [m²·K/W]
  const R_layers = layers.map(l => l.d / l.lambda);
  const R_total = R_SI + R_layers.reduce((s, r) => s + r, 0) + R_SE;
  const U_value = 1 / R_total; // W/(m²·K)

  // ── 2. Rezistență la difuzia vaporilor ─────────────────────
  // s_d = Σ(μ_i × d_i) [m] — grosime echivalentă de aer
  const sd_layers = layers.map(l => l.mu * l.d);
  const sd_total = sd_layers.reduce((s, sd) => s + sd, 0);

  // ── 3. Profil lunar ────────────────────────────────────────
  const monthNames = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  const condensation_risk_months = [];
  let total_condensation_g = 0;
  let total_drying_g = 0;

  const RH_profile_monthly = monthNames.map((name, m) => {
    const tI = t_int[m];
    const tE = t_ext[m];
    const deltaT = tI - tE;

    // ── 3a. Temperatură suprafață interioară ──────────────────
    // θ_si = θ_int - R_si / R_total × (θ_int - θ_ext)
    // EN ISO 13788 Secț.5.2
    const theta_si = tI - (R_SI / R_total) * deltaT;

    // ── 3b. Factor de temperatură superficială ───────────────
    // f_Rsi = (θ_si - θ_ext) / (θ_int - θ_ext)
    const f_Rsi = deltaT !== 0 ? (theta_si - tE) / deltaT : 1;

    // ── 3c. Presiuni de vapori ───────────────────────────────
    // p_int = RH_int / 100 × pSat(θ_int)
    const p_int = (RH_int / 100) * pSat(tI);
    const p_ext = (rh_ext[m] / 100) * pSat(tE);
    const p_sat_si = pSat(theta_si);

    // ── 3d. RH pe suprafața interioară ───────────────────────
    // RH_si = p_int / pSat(θ_si) × 100
    const RH_si = p_sat_si > 0 ? Math.min(100, (p_int / p_sat_si) * 100) : 100;

    // ── 3e. Profil temperatură și presiune prin straturi ─────
    // Calculăm temperatura și presiunea de saturație la fiecare interfață
    let R_cumul = R_SI;
    let sd_cumul = 0;
    const interfaces = [{ pos: "Int.", theta: tI, p_sat: pSat(tI) }];

    layers.forEach((l, i) => {
      R_cumul += R_layers[i];
      sd_cumul += sd_layers[i];
      const theta_j = tI - (R_cumul / R_total) * deltaT;
      interfaces.push({
        pos: l.name,
        theta: Math.round(theta_j * 10) / 10,
        p_sat: Math.round(pSat(theta_j)),
      });
    });

    // Presiune vapori prin straturi (variație liniară cu sd)
    const p_vapor_interfaces = interfaces.map((_, j) => {
      const sd_j = j === 0 ? 0 : sd_layers.slice(0, j).reduce((s, v) => s + v, 0);
      return sd_total > 0
        ? p_int - (sd_j / sd_total) * (p_int - p_ext)
        : p_int;
    });

    // ── 3f. Verificare condensare interstițială ──────────────
    // Condensare apare unde p_vapor > p_sat
    let hasCondensation = false;
    interfaces.forEach((iface, j) => {
      if (p_vapor_interfaces[j] > iface.p_sat) {
        hasCondensation = true;
      }
    });

    if (hasCondensation) {
      condensation_risk_months.push(name);
      // Estimare cantitate condensat [g/m²·lună]
      // Simplificat: diferența de presiune maximă × permeabilitate
      const maxExcess = Math.max(0, ...interfaces.map((iface, j) =>
        p_vapor_interfaces[j] - iface.p_sat
      ));
      const days = [31,28,31,30,31,30,31,31,30,31,30,31][m];
      // Flux condensare ≈ Δp / (μ_total × δ_air) × timp
      // δ_air = 1.94 × 10⁻¹⁰ kg/(m·s·Pa) — permeabilitate aer
      const g_condensation = maxExcess * 1.94e-10 * days * 86400 / (sd_total > 0 ? sd_total : 1) * 1000;
      total_condensation_g += g_condensation;
    } else {
      // Potențial de uscare
      const minDeficit = Math.min(...interfaces.map((iface, j) =>
        iface.p_sat - p_vapor_interfaces[j]
      ));
      if (minDeficit > 0) {
        const days = [31,28,31,30,31,30,31,31,30,31,30,31][m];
        const g_drying = minDeficit * 1.94e-10 * days * 86400 / (sd_total > 0 ? sd_total : 1) * 1000;
        total_drying_g += g_drying;
      }
    }

    // ── 3g. Risc mucegai ─────────────────────────────────────
    const moldLevel = classifyMoldRisk(RH_si);

    return {
      month: name,
      theta_ext: tE,
      theta_si: Math.round(theta_si * 10) / 10,
      f_Rsi: Math.round(f_Rsi * 1000) / 1000,
      RH_si: Math.round(RH_si * 10) / 10,
      moldRisk: moldLevel,
      condensation: hasCondensation,
    };
  });

  // ── 4. Capacitate de uscare ────────────────────────────────
  // Conform EN ISO 13788: drying_capacity = uscare - condensare pe an
  const drying_capacity_gm2 = total_drying_g - total_condensation_g;
  const drying_capacity_kgm2 = Math.round(drying_capacity_gm2 / 10) / 100;

  // ── 5. Risc global mucegai ─────────────────────────────────
  // EN ISO 13788 Secț.5.4: risc dacă RH_si > 80% pe mai mult de 2 luni
  const monthsAbove80 = RH_profile_monthly.filter(m => m.RH_si > 80).length;
  const mold_risk = monthsAbove80 >= 3
    ? "ridicat"
    : monthsAbove80 >= 1
      ? "moderat"
      : "scăzut";

  // ── 6. Corecție orientare ──────────────────────────────────
  // Fațada nord este mai rece (radiație solară mai mică)
  const orientationPenalty = {
    N: 1.5, NE: 1.2, NV: 1.2,
    E: 0.5, V: 0.5,
    SE: 0, SV: 0, S: 0,
  };
  const orientPenalty = orientationPenalty[orientation] ?? 0;
  const orientNote = orientPenalty > 0
    ? `Fațada ${orientation} majorează riscul de condensare cu +${orientPenalty}°C echivalent.`
    : null;

  // ── 7. Recomandări ─────────────────────────────────────────
  const recommendations = [];
  if (condensation_risk_months.length > 0) {
    recommendations.push(
      `Risc condensare interstițială în lunile: ${condensation_risk_months.join(", ")}. ` +
      `Verificați bariera de vapori (pe fața caldă a izolației).`
    );
  }
  if (drying_capacity_kgm2 < 0) {
    recommendations.push(
      `Capacitate de uscare negativă (${drying_capacity_kgm2} kg/m²) — ` +
      `umiditatea se acumulează permanent. Adăugați barieră de vapori.`
    );
  }
  if (mold_risk === "ridicat") {
    recommendations.push(
      "Risc ridicat de mucegai — îmbunătățiți izolația termică sau ventilația."
    );
  }
  if (U_value > 0.50) {
    recommendations.push(
      `Valoare U ridicată (${Math.round(U_value * 100) / 100} W/m²K) — ` +
      `crește riscul de condensare superficială. Suplimentați izolația.`
    );
  }
  if (RH_int > 60) {
    recommendations.push(
      "Umiditate interioară ridicată (>60%) — asigurați ventilare adecvată (minim 0.5 h⁻¹)."
    );
  }
  if (orientNote) {
    recommendations.push(orientNote);
  }

  return {
    // Profil lunar
    RH_profile_monthly,
    // Condensare
    condensation_risk_months,
    drying_capacity_kgm2,
    total_condensation_gm2: Math.round(total_condensation_g * 10) / 10,
    total_drying_gm2:       Math.round(total_drying_g * 10) / 10,
    // Mucegai
    mold_risk,
    mold_risk_color: mold_risk === "ridicat" ? "#ef4444" : mold_risk === "moderat" ? "#eab308" : "#22c55e",
    // Proprietăți anvelopă
    R_total:   Math.round(R_total * 100) / 100,
    U_value:   Math.round(U_value * 100) / 100,
    sd_total:  Math.round(sd_total * 100) / 100,
    orientation,
    // Verdict
    recommendations,
    reference: "SR EN 15026:2007 + SR EN ISO 13788:2013",
  };
}
