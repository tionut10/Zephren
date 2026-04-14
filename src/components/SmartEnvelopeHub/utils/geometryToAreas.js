/**
 * geometryToAreas.js — generator 4 pereți N/S/E/V din geometria aproximativă.
 *
 * CONTEXT: opțiunea „4 pereți N/S/E/V" din RampInstant (sesiunea S3). Auditorul
 * are deja `areaEnvelope`, `perimeter`, `heightBuilding` din Step 1. Din aceste
 * valori generăm o distribuție rezonabilă pe 4 orientări.
 *
 * IPOTEZE:
 *   - Clădire rectangulară aprox. pătrată (aspect ~1:1). Dacă `perimeter` lipsește,
 *     derivăm din suprafața utilă aproximată ca pătrat.
 *   - Raport suprafață pereți / (pereți + acoperiș) = 0.70 default (tipic RO).
 *     → areaWalls = areaEnvelope * 0.70; areaOpen = areaEnvelope * 0.30 (acoperiș+planșeu)
 *   - Distribuție pereți: 2 perechi orientate N-S și E-V cu raport 60/40 (front/lateral).
 *     → N+S = 60%, E+V = 40%. Individual: N=S=30%, E=V=20% din areaWalls.
 *   - 1 acoperiș PT (terasă) + 1 planșeu pe sol PL = 15% fiecare din areaEnvelope.
 *
 * OUTPUT: 4 pereți (PE) + 1 acoperiș (PT) + 1 planșeu pe sol (PL), toate fără
 * layers (user trebuie să completeze straturile — doar dimensiunile sunt generate).
 *
 * Warning: estimare orientativă (banner D1). Nu aplicare automată fără confirmare.
 */

/**
 * Generează 6 elemente opace (4 pereți + acoperiș + planșeu) din geometria clădirii.
 * @param {Object} building - Obiectul building din Step 1.
 * @param {Object} [opts] - Opțiuni de override.
 * @param {number} [opts.wallRatio=0.70]  - Fracția din anvelopă care e perete.
 * @param {number} [opts.roofRatio=0.15]  - Fracția din anvelopă care e acoperiș.
 * @param {number} [opts.floorRatio=0.15] - Fracția din anvelopă care e planșeu pe sol.
 * @returns {Array<Object>|null} Listă elemente opace sau null dacă geometria lipsește.
 */
export function generateElementsFromGeometry(building, opts = {}) {
  const wallRatio  = opts.wallRatio  ?? 0.70;
  const roofRatio  = opts.roofRatio  ?? 0.15;
  const floorRatio = opts.floorRatio ?? 0.15;

  const areaEnvelope = parseFloat(building?.areaEnvelope);
  if (!Number.isFinite(areaEnvelope) || areaEnvelope <= 0) return null;

  const totalWalls = areaEnvelope * wallRatio;
  const totalRoof  = areaEnvelope * roofRatio;
  const totalFloor = areaEnvelope * floorRatio;

  // Distribuție pe orientări: N=S=30%, E=V=20% din totalWalls
  // (ipoteza clădire cu fațadă mai mare pe N-S).
  const wN = totalWalls * 0.30;
  const wS = totalWalls * 0.30;
  const wE = totalWalls * 0.20;
  const wV = totalWalls * 0.20;

  const emptyLayers = [
    { material: "", matName: "", thickness: "", lambda: 0, rho: 0 },
  ];

  return [
    {
      name: "Perete exterior N",
      type: "PE",
      area: wN.toFixed(2),
      orientation: "N",
      tau: "1",
      layers: [...emptyLayers],
    },
    {
      name: "Perete exterior S",
      type: "PE",
      area: wS.toFixed(2),
      orientation: "S",
      tau: "1",
      layers: [...emptyLayers],
    },
    {
      name: "Perete exterior E",
      type: "PE",
      area: wE.toFixed(2),
      orientation: "E",
      tau: "1",
      layers: [...emptyLayers],
    },
    {
      name: "Perete exterior V",
      type: "PE",
      area: wV.toFixed(2),
      orientation: "V",
      tau: "1",
      layers: [...emptyLayers],
    },
    {
      name: "Acoperiș terasă",
      type: "PT",
      area: totalRoof.toFixed(2),
      orientation: "Orizontal",
      tau: "1",
      layers: [...emptyLayers],
    },
    {
      name: "Placă pe sol",
      type: "PL",
      area: totalFloor.toFixed(2),
      orientation: "Orizontal",
      tau: "0.5",
      layers: [...emptyLayers],
    },
  ];
}

/**
 * Verifică dacă geometria clădirii e suficientă pentru generare.
 * @returns {{ok: boolean, reason?: string}}
 */
export function canGenerateFromGeometry(building) {
  const a = parseFloat(building?.areaEnvelope);
  if (!Number.isFinite(a) || a <= 0) {
    return { ok: false, reason: "Lipsește suprafața anvelopei (Step 1)" };
  }
  if (a < 30) {
    return { ok: false, reason: "Suprafață anvelopă prea mică (<30 m²)" };
  }
  return { ok: true };
}
