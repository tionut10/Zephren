// ═══════════════════════════════════════════════════════════════
// EN 15193-1:2017 + A1:2021 — LENI (Lighting Energy Numeric Indicator)
// Mc 001-2022 Partea IV — Iluminat artificial
// ═══════════════════════════════════════════════════════════════
// Formula completă:
//   LENI = (W_L + W_P) / A  [kWh/(m²·an)]
//
//   W_L = Σ P_n × (t_D × F_o × F_d × F_c + t_N × F_o) / 1000   [kWh/(m²·an)]
//         ── termen diurn: F_d (daylight) și F_c (constant illuminance) active
//         ── termen nocturn: doar F_o (ocupare), fără F_d/F_c (nu există daylight)
//
//   W_P = W_em + W_standby   [kWh/(m²·an)]
//         W_em       = P_em     × 8760 / 1000              (iluminat urgență continuu)
//         W_standby  = P_stb    × (8760 − t_operare) / 1000 (drivere LED + senzori OFF)
// ═══════════════════════════════════════════════════════════════

// Factori ocupare F_o per categorie clădire — EN 15193-1 Tab. B.3 + Mc 001-2022
export const F_O_BY_CATEGORY = {
  RI: 0.90, RC: 0.90, RA: 0.90,   // rezidențial
  BI: 0.80,                        // birouri
  ED: 0.75,                        // educație
  SA: 1.00,                        // sănătate (continuu)
  HC: 0.95,                        // hotel
  CO: 0.85,                        // comerț
  SP: 0.70,                        // sport
  IN: 0.85,                        // industrial
  AL: 0.85,                        // altele
};

// Fracțiune ore nocturne per categorie — Mc 001-2022 Anexa
export const NIGHT_FRAC_BY_CATEGORY = {
  RI: 0.30, RC: 0.30, RA: 0.30,
  BI: 0.10,
  ED: 0.05,
  SA: 0.45,
  HC: 0.40,
  CO: 0.20,
  SP: 0.15,
  IN: 0.20,
  AL: 0.25,
};

// LENI_MAX per categorie — EN 15193-1 Tab. NA.1 + Mc 001-2022 Partea IV [kWh/(m²·an)]
export const LENI_MAX_BY_CATEGORY = {
  BI: 25, ED: 20, SA: 35, HC: 25, CO: 35, SP: 20, IN: 20,
  RI: 12, RC: 12, RA: 12, AL: 20,
};

// ═══════════════════════════════════════════════════════════════
// F_D — Factor daylight (EN 15193-1 Anexa F, Tab F.1 + F.26)
// Sprint 20 (23 apr 2026): înlocuire aproximare liniară `1 − 0,65·ratio`
// cu tabel discret + interpolare, conform Anexei F pentru latitudini 42-48° (RO).
//
// F_D = F_D,S (supply) × F_D,C (constant) × F_D,N (no-daylight fraction)
// Implementare simplificată: F_D final funcție de WFR (window-to-wall ratio)
// și tip control daylight.
// ═══════════════════════════════════════════════════════════════

/** Tabel WFR (window-to-wall ratio) → F_D,S pentru zone daylight (EN 15193-1 Tab F.26) */
const F_D_S_TABLE = [
  { wfr: 0.00, fds: 1.00 },
  { wfr: 0.10, fds: 0.90 },
  { wfr: 0.20, fds: 0.76 },
  { wfr: 0.30, fds: 0.62 },
  { wfr: 0.40, fds: 0.48 },
  { wfr: 0.50, fds: 0.38 },
  { wfr: 0.60, fds: 0.32 },
  { wfr: 0.70, fds: 0.28 },
];

/**
 * Multiplicator F_D,C (exploatare daylight) — EN 15193-1 Tab F.18
 * Valorile < 1 reduc F_D final → consum artificial redus când controlul
 * exploatează efectiv lumina naturală. Manual = fără reducere suplimentară.
 */
const F_D_C_BY_CONTROL = {
  manual:       1.00, // fără daylight dimming — folosește fDs direct
  auto_switch:  0.85, // comutator automat 2-poziții
  dimming:      0.72, // dimming liniar DALI / 1-10V
  advanced:     0.55, // dimming + prezență + constant illuminance (BMS)
};

/**
 * Calculează F_D conform EN 15193-1 Anexa F (tabular + interpolare liniară)
 * F_D = fds_WFR × fdc_control. Valoare mai mică → consum artificial redus.
 *
 * @param {number} wfr — raport suprafață fereastră/perete (0-1); în practică 0,1-0,5
 * @param {"manual"|"auto_switch"|"dimming"|"advanced"} controlType — tip control daylight
 * @returns {number} — F_D final [0-1], factor reducere lumină artificială datorat daylight
 */
export function calcFD(wfr, controlType = "manual") {
  const r = Math.max(0, Math.min(0.7, wfr || 0));
  // Interpolare liniară în tabel
  let fds = 1.0;
  for (let i = 0; i < F_D_S_TABLE.length - 1; i++) {
    const a = F_D_S_TABLE[i];
    const b = F_D_S_TABLE[i + 1];
    if (r >= a.wfr && r <= b.wfr) {
      const t = (r - a.wfr) / (b.wfr - a.wfr);
      fds = a.fds + t * (b.fds - a.fds);
      break;
    }
  }
  if (r >= 0.7) fds = F_D_S_TABLE[F_D_S_TABLE.length - 1].fds;
  const fdc = F_D_C_BY_CONTROL[controlType] || 1.0;
  return fds * fdc;
}

export { F_D_S_TABLE, F_D_C_BY_CONTROL };

/**
 * Calcul LENI complet conform EN 15193-1 + Mc 001-2022.
 *
 * @param {object} params
 * @param {string} params.category         - Categoria clădirii (RI, BI, SA, ...)
 * @param {number} params.area             - Suprafață utilă [m²]
 * @param {number} params.pDensity         - Densitate putere iluminat [W/m²]
 * @param {number} params.fCtrl            - Factor control F_C ∈ [0.3, 1.0]
 * @param {number} params.operatingHours   - Ore funcționare/an [h] (0 < h ≤ 8760)
 * @param {number} params.naturalLightRatio - Raport lumină naturală [0..0.8] (legacy, folosit dacă wfr nu e dat)
 * @param {number} [params.wfr]            - Window-to-wall ratio [0..0.7] — Sprint 20: F_D tabular Anexa F
 * @param {string} [params.daylightControl] - "manual"|"auto_switch"|"dimming"|"advanced"
 * @param {number} [params.pEmergency]     - Putere iluminat urgență [W/m²] (default: 0 rezidențial, 1.0 public)
 * @param {number} [params.pStandby]       - Putere standby drivere [W/m²] (default 0.3)
 * @param {number} [params.fo]             - Factor ocupare explicit (default din F_O_BY_CATEGORY)
 * @param {number} [params.nightFrac]      - Fracțiune nocturnă (default din NIGHT_FRAC_BY_CATEGORY)
 *
 * @returns {object} { LENI, qf_l, W_L, W_P, W_em, W_standby, LENI_max, status, tD, tN, fD }
 */
export function calcLENI(params) {
  const {
    category,
    area,
    pDensity,
    fCtrl,
    operatingHours,
    naturalLightRatio,
    wfr,
    daylightControl,
    pEmergency,
    pStandby,
    fo: foOverride,
    nightFrac: nightFracOverride,
  } = params;

  if (!area || area <= 0 || !pDensity || pDensity < 0) {
    return { LENI: 0, qf_l: 0, W_L: 0, W_P: 0, W_em: 0, W_standby: 0, LENI_max: 25, status: "invalid", tD: 0, tN: 0, fD: 1 };
  }

  const fo = typeof foOverride === "number" ? foOverride : (F_O_BY_CATEGORY[category] || 0.85);
  const nightFrac = typeof nightFracOverride === "number" ? nightFracOverride : (NIGHT_FRAC_BY_CATEGORY[category] || 0.25);

  const tD = operatingHours * (1 - nightFrac);
  const tN = operatingHours * nightFrac;

  // Sprint 20: F_D tabular EN 15193-1 Anexa F când `wfr` e dat; altfel formula legacy
  let fD;
  if (typeof wfr === "number" && wfr > 0) {
    fD = calcFD(wfr, daylightControl || "manual");
  } else {
    const natRatio = Math.max(0, Math.min(0.8, naturalLightRatio || 0));
    fD = Math.max(0, 1 - natRatio * 0.65);
  }

  // W_L — F_d/F_c DOAR pe termen diurn (nu există daylight noaptea — fix Sprint 2)
  const W_L = pDensity * (tD * fo * fD * fCtrl + tN * fo) / 1000;

  // W_P — parazită EN 15193-1 Annex B
  const isResidential = ["RI", "RC", "RA"].includes(category);
  const pEm = (typeof pEmergency === "number" && pEmergency >= 0)
    ? pEmergency
    : (isResidential ? 0 : 1.0);
  const pStb = (typeof pStandby === "number" && pStandby >= 0) ? pStandby : 0.3;

  const W_em = pEm * 8760 / 1000;
  const W_standby = pStb * Math.max(0, 8760 - operatingHours) / 1000;
  const W_P = W_em + W_standby;

  const LENI = W_L + W_P;
  const qf_l = LENI * area;

  const LENI_max = LENI_MAX_BY_CATEGORY[category] || 25;
  const status = LENI <= LENI_max * 0.7 ? "excelent"
               : LENI <= LENI_max ? "conform"
               : "neconform";

  return { LENI, qf_l, W_L, W_P, W_em, W_standby, LENI_max, status, tD, tN, fD };
}
