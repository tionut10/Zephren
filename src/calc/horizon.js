// ═══════════════════════════════════════════════════════════════
// UMBRIRE ORIZONT (Horizon Masking) — SR EN ISO 52010-1:2017 §6.5.1
// Corecție radiație directă pentru obstrucții: clădiri învecinate, deal/munte,
// copaci. Sprint 20 (23 apr 2026) — înainte lipsea complet → supraestimare
// radiație cu 20-40% în mediu urban dens sau canyon adânc.
//
// Metodă: profil de orizont per orientare cardinală (8 azimute), cu elevație
// maximă a obstrucției [°] de la orizontală. Soarele sub elevația orizontului
// → componenta directă = 0 (doar difuză ajunge pe suprafață).
// ═══════════════════════════════════════════════════════════════

const DEG = Math.PI / 180;

/**
 * Profil de orizont standard pentru categorii tipice de mediu urban.
 * Valori tipice (°) per orientare — pot fi suprascrise de utilizator.
 * Convenție: azimut Sud = 0°, Vest = 90°, Nord = ±180°, Est = -90°.
 *
 * Sursa: SR EN ISO 52010-1 Tab. E.1 + PVGIS default environments.
 */
export const HORIZON_PROFILES = {
  open_rural: {
    label: "Teren deschis / rural",
    elevations: { S: 3, SV: 3, V: 5, NV: 5, N: 5, NE: 5, E: 5, SE: 3 },
  },
  suburban: {
    label: "Cartier rezidențial / suburban",
    elevations: { S: 8, SV: 10, V: 12, NV: 12, N: 15, NE: 12, E: 12, SE: 10 },
  },
  urban_medium: {
    label: "Urban mediu (clădiri 4-8 etaje)",
    elevations: { S: 15, SV: 18, V: 22, NV: 22, N: 25, NE: 22, E: 22, SE: 18 },
  },
  urban_dense: {
    label: "Urban dens (clădiri >10 etaje, canyon)",
    elevations: { S: 25, SV: 30, V: 35, NV: 35, N: 40, NE: 35, E: 35, SE: 30 },
  },
  mountain_valley: {
    label: "Vale de munte (orizont ridicat pe E/V)",
    elevations: { S: 10, SV: 15, V: 35, NV: 40, N: 30, NE: 40, E: 35, SE: 15 },
  },
  no_obstruction: {
    label: "Fără obstrucții (teren elevat)",
    elevations: { S: 0, SV: 0, V: 0, NV: 0, N: 0, NE: 0, E: 0, SE: 0 },
  },
};

/** Orientări cardinale în ordine — pentru interpolare */
const AZIMUTH_CARDINAL = [
  { key: "S",  az:   0 },
  { key: "SV", az:  45 },
  { key: "V",  az:  90 },
  { key: "NV", az: 135 },
  { key: "N",  az: 180 },
  { key: "NE", az:-135 },
  { key: "E",  az: -90 },
  { key: "SE", az: -45 },
];

/**
 * Returnează elevația orizontului la un azimut solar dat [°]
 * Interpolează liniar între orientările cardinale.
 *
 * @param {number} solarAzimuth — azimut solar [°] (convenție: S=0, V=90, N=±180, E=-90)
 * @param {object} elevations — map { S, SV, V, ... } cu elevație [°]
 * @returns {number} — elevație orizont [°] la azimutul dat
 */
export function horizonElevationAtAzimuth(solarAzimuth, elevations) {
  // Normalizăm azimutul la intervalul [-180, 180]
  let az = solarAzimuth;
  while (az > 180) az -= 360;
  while (az < -180) az += 360;

  // Găsim perechea cardinală care încadrează azimutul
  // Sortăm după azimut pentru interpolare sigură
  const sorted = AZIMUTH_CARDINAL
    .map(c => ({ ...c, elev: elevations[c.key] ?? 0 }))
    .sort((a, b) => a.az - b.az);

  // Dacă az e sub prima sau peste ultima → wrap
  if (az <= sorted[0].az) {
    const prev = sorted[sorted.length - 1];
    const next = sorted[0];
    const prevAzWrap = prev.az - 360; // ex. -135 → -225
    const t = (az - prevAzWrap) / (next.az - prevAzWrap);
    return prev.elev + t * (next.elev - prev.elev);
  }
  if (az >= sorted[sorted.length - 1].az) {
    const prev = sorted[sorted.length - 1];
    const next = sorted[0];
    const nextAzWrap = next.az + 360;
    const t = (az - prev.az) / (nextAzWrap - prev.az);
    return prev.elev + t * (next.elev - prev.elev);
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    if (az >= sorted[i].az && az <= sorted[i + 1].az) {
      const t = (az - sorted[i].az) / (sorted[i + 1].az - sorted[i].az);
      return sorted[i].elev + t * (sorted[i + 1].elev - sorted[i].elev);
    }
  }
  return 0;
}

/**
 * Verifică dacă soarele este BLOCAT de orizont (componenta directă = 0)
 *
 * @param {number} solarAltitude — înălțime soare [°] (0-90)
 * @param {number} solarAzimuth — azimut soare [°]
 * @param {object} elevations — profil de orizont { S, SV, V, ... }
 * @returns {boolean} — true dacă soarele e sub orizont obstrucționat
 */
export function isSunBlocked(solarAltitude, solarAzimuth, elevations) {
  if (solarAltitude <= 0) return true; // sub orizontul geografic
  const horizonAlt = horizonElevationAtAzimuth(solarAzimuth, elevations);
  return solarAltitude < horizonAlt;
}

/**
 * Factor de corecție pentru radiație directă — 1 dacă soarele e vizibil, 0 dacă blocat.
 * Pentru un tranziție lină (sfumato 1° la limită), folosește interpolare.
 *
 * @param {number} solarAltitude — [°]
 * @param {number} solarAzimuth — [°]
 * @param {string|object} profile — cheie HORIZON_PROFILES sau obiect cu elevations
 * @returns {number} — 0 (blocat) .. 1 (vizibil complet)
 */
export function directBeamVisibility(solarAltitude, solarAzimuth, profile) {
  const elevations = typeof profile === "string"
    ? (HORIZON_PROFILES[profile]?.elevations || HORIZON_PROFILES.open_rural.elevations)
    : profile;
  if (solarAltitude <= 0) return 0;
  const horizonAlt = horizonElevationAtAzimuth(solarAzimuth, elevations);
  // Sfumato: 0 sub orizont, 1 peste orizont+1°, liniar între
  if (solarAltitude <= horizonAlt) return 0;
  if (solarAltitude >= horizonAlt + 1) return 1;
  return solarAltitude - horizonAlt;
}

/**
 * Factor mediu de umbrire pentru componenta difuză (sky view factor simplificat).
 * Cu cât orizontul e mai înalt global → cerul vizibil e mai mic → difuza scade.
 * Formula: f_svf ≈ 1 - <avg elev>/90 (cos²-weighted pentru izotropic).
 *
 * @param {string|object} profile
 * @returns {number} — 0..1 (1 = cer 180° deschis, 0 = blocat total)
 */
export function skyViewFactor(profile) {
  const elevations = typeof profile === "string"
    ? (HORIZON_PROFILES[profile]?.elevations || HORIZON_PROFILES.open_rural.elevations)
    : profile;
  const vals = Object.values(elevations);
  if (!vals.length) return 1;
  const avgElev = vals.reduce((s, v) => s + v, 0) / vals.length;
  // Aproximare cos²: f_svf = cos²(avgElev)
  const c = Math.cos(avgElev * DEG);
  return Math.max(0, Math.min(1, c * c));
}
