/**
 * sectionProfiler.js — Calcul profil termic prin straturile unui element opac.
 *
 * Input: layers [{material, thickness_mm (sau thickness), lambda}, ...] + T_int, T_ext + Rsi/Rse.
 * Output: profil complet cu:
 *   - R_total
 *   - Q [W/m²] = ΔT / R_total
 *   - Array de noduri (interfețe) cu { x_mm, T, label, R_cum }
 *   - U = 1 / R_total
 *   - Punct de rouă (Magnus) la umiditate relativă dată
 *   - Flag condensRisk dacă T_interior perete < T_rouă
 *
 * Referințe: ISO 6946:2017, formula Magnus pentru T_rouă.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Extrage grosimea unui strat (în mm), tolerând câmpurile `thickness_mm` sau `thickness`.
 */
function getThicknessMm(layer) {
  const t = Number.isFinite(+layer?.thickness_mm) ? +layer.thickness_mm : +layer?.thickness;
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * Calculează temperatura punctului de rouă (°C) — formula Magnus.
 * @param {number} Tc     - Temperatura aerului în °C
 * @param {number} rhPct  - Umiditatea relativă în % (0..100)
 * @returns {number} T_rouă °C
 */
export function dewPointMagnus(Tc, rhPct) {
  const rh = clamp(rhPct, 1, 100) / 100;
  const a = 17.625, b = 243.04;
  const gamma = Math.log(rh) + (a * Tc) / (b + Tc);
  return (b * gamma) / (a - gamma);
}

/**
 * Construiește profilul termic complet prin perete.
 * @param {Object} params
 * @param {Array}  params.layers       - Straturi (de la INTERIOR la EXTERIOR sau invers, cf. convenției)
 * @param {number} params.T_int        - Temperatura interior °C
 * @param {number} params.T_ext        - Temperatura exterior °C
 * @param {number} [params.Rsi=0.13]   - Rezistența suprafață interior (m²K/W)
 * @param {number} [params.Rse=0.04]   - Rezistența suprafață exterior (m²K/W)
 * @param {number} [params.rhInt=50]   - Umiditate relativă interior (%)
 * @param {"exterior-first"|"interior-first"} [params.order="exterior-first"]
 *                 Ordinea straturilor. Presetele Zephren sunt "exterior-first" (strat[0]=exterior).
 * @returns {Object} { nodes, R_total, U, Q, T_dew, condensRisk, Rsi, Rse }
 *                   nodes: [{ x_mm, T, label, kind:'surface'|'interface'|'material', material? }, ...]
 *                   x_mm începe la 0 la suprafața interioară, crește spre exterior.
 */
export function computeWallProfile({
  layers = [],
  T_int = 20,
  T_ext = -15,
  Rsi = 0.13,
  Rse = 0.04,
  rhInt = 50,
  order = "exterior-first",
}) {
  if (!Array.isArray(layers) || layers.length === 0) {
    return { nodes: [], R_total: 0, U: 0, Q: 0, T_dew: 0, condensRisk: false, Rsi, Rse };
  }

  // Normalizăm ordinea: vrem de la INTERIOR la EXTERIOR pentru calcul
  const layersIntToExt = order === "exterior-first" ? [...layers].reverse() : [...layers];

  // R_total
  let R_total = Rsi + Rse;
  for (const l of layersIntToExt) {
    const d_m = getThicknessMm(l) / 1000;
    const lam = +l.lambda;
    if (d_m > 0 && lam > 0) R_total += d_m / lam;
  }

  const dT = T_int - T_ext;
  const Q = R_total > 0 ? dT / R_total : 0;  // [W/m²]
  const U = R_total > 0 ? 1 / R_total : 0;

  // Noduri de temperatură — începem la suprafața interioară
  const nodes = [];
  let x = 0;        // mm, x=0 = suprafața interioară a peretelui
  let R_cum = Rsi;  // rezistența cumulată din interior

  // Suprafață interioară (după Rsi)
  const T_surf_int = T_int - Q * Rsi;
  nodes.push({ x_mm: 0, T: T_surf_int, label: "suprafață interioară", kind: "surface" });

  // Interfețe între straturi
  for (const l of layersIntToExt) {
    const d_mm = getThicknessMm(l);
    const lam = +l.lambda || 0;
    const R_layer = d_mm > 0 && lam > 0 ? (d_mm / 1000) / lam : 0;
    x += d_mm;
    R_cum += R_layer;
    const T = T_int - Q * R_cum;
    nodes.push({
      x_mm: x,
      T,
      label: `după "${l.material || l.matName || "strat"}"`,
      kind: "interface",
      material: l.material || l.matName,
      lambda: lam,
      thickness_mm: d_mm,
      R_layer,
    });
  }

  // Ultimul nod e suprafața exterioară (coincidentă cu ultima interfață înainte de Rse)
  // Adăugăm și un "nod ambiental exterior" teoretic (după Rse) pentru curbă
  const T_surf_ext = nodes[nodes.length - 1].T;
  // Recalculăm ultimul nod ca "suprafață exterioară"
  nodes[nodes.length - 1].label = "suprafață exterioară";
  nodes[nodes.length - 1].kind = "surface";

  // Dew point & risc condens
  const T_dew = dewPointMagnus(T_int, rhInt);
  const condensRisk = T_surf_int < T_dew;

  return {
    nodes,
    R_total,
    U,
    Q,
    T_dew,
    condensRisk,
    Rsi,
    Rse,
    T_int,
    T_ext,
    totalThickness_mm: x,
    layersIntToExt,
  };
}
