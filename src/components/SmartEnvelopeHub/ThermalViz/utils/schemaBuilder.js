/**
 * schemaBuilder.js — Construiește modelul 3D schematic al clădirii din state-ul anvelopei.
 *
 * Input: arrays de elemente (opace, vitrate, punți) + date building (lungime/lățime/înălțime).
 * Output: structură cu 6 fețe (N/S/E/V/Top/Bottom), fiecare cu rect-uri elemente
 *         proporționale cu aria reală, + muchii pentru punți termice.
 *
 * NU rezolvăm geometrie arhitecturală reală — template parametric cutie dreptunghiulară.
 */

import { getURefNZEB } from "../../utils/wizardOpaqueCalc.js";

// ── Dimensiuni fallback dacă nu există în building.geom ─────────────────────
const DEFAULT_LENGTH = 10; // m (dir. E-V)
const DEFAULT_WIDTH  = 8;  // m (dir. N-S)
const DEFAULT_HEIGHT = 3;  // m (pe nivel)

/**
 * Extrage dimensiunile cutiei din state-ul clădirii.
 * Acceptă mai multe forme (building.geom.{length,width,height} sau derivate din areaUseful).
 * @param {Object} building
 * @returns {{length:number, width:number, height:number, nFloors:number}}
 */
export function getBoxDimensions(building) {
  const g = building?.geom || {};
  const area = parseFloat(building?.areaUseful) || 0;
  const nFloors = parseInt(building?.nFloors) || 1;

  // Lungime și lățime: dacă nu sunt specificate, derivăm din aria per nivel (aspect ratio 1.25)
  const areaPerFloor = area > 0 ? area / nFloors : DEFAULT_LENGTH * DEFAULT_WIDTH;
  const derivedW = Math.sqrt(areaPerFloor / 1.25);
  const derivedL = derivedW * 1.25;

  return {
    length: parseFloat(g.length) || derivedL || DEFAULT_LENGTH,
    width:  parseFloat(g.width)  || derivedW || DEFAULT_WIDTH,
    height: (parseFloat(g.height) || DEFAULT_HEIGHT) * nFloors,
    nFloors,
  };
}

// ── Mapare orientare → identificator față ────────────────────────────────────
// În state orientările sunt "N", "S", "E", "V" (Vest), "Horizontal".
const ORIENT_TO_FACE = {
  N: "north", S: "south", E: "east", V: "west",
  Horizontal: "top", // terasă sau acoperiș
};

/**
 * Returnează dimensiunile reale ale unei fețe (în m²).
 * @param {string} face
 * @param {{length, width, height}} dims
 */
function faceArea(face, dims) {
  switch (face) {
    case "north":
    case "south":  return dims.length * dims.height;
    case "east":
    case "west":   return dims.width  * dims.height;
    case "top":
    case "bottom": return dims.length * dims.width;
    default:       return 0;
  }
}

/**
 * Grupează elementele pe fețele cutiei.
 * Elementele de tip PL (placă sol) merg pe "bottom"; PT/PP (terasă/pod) merg pe "top".
 * Restul (pereți PE + glazing) merg pe fațada corespunzătoare orientării.
 * @param {Array} opaques
 * @param {Array} glazing
 * @returns {Object} { north: [...], south: [...], east: [...], west: [...], top: [...], bottom: [...] }
 */
function groupByFace(opaques, glazing) {
  const faces = { north: [], south: [], east: [], west: [], top: [], bottom: [] };

  const push = (arr, item, face) => {
    if (faces[face]) faces[face].push({ ...item, _face: face });
  };

  for (const el of opaques || []) {
    if (el.type === "PL" || el.type === "PB") { push(null, el, "bottom"); faces.bottom.push({ ...el, _face: "bottom" }); continue; }
    if (el.type === "PT" || el.type === "PP") { faces.top.push({ ...el, _face: "top" }); continue; }
    const face = ORIENT_TO_FACE[el.orientation];
    if (face && faces[face]) faces[face].push({ ...el, _face: face });
    else faces.south.push({ ...el, _face: "south" }); // fallback
  }

  for (const el of glazing || []) {
    const face = ORIENT_TO_FACE[el.orientation];
    if (face && faces[face] && face !== "top" && face !== "bottom") {
      faces[face].push({ ...el, _face: face, _kind: "glazing" });
    } else {
      faces.south.push({ ...el, _face: "south", _kind: "glazing" }); // fallback sud
    }
  }

  return faces;
}

/**
 * Pentru o față, calculează layout-ul rect-urilor elementelor (grid simplu cu flex).
 * Fiecare element primește { xPct, yPct, wPct, hPct } — coordonate procentuale în fața respectivă.
 *
 * Strategie: elementele opace umplu suprafața (stivuite orizontal, redimensionate proporțional);
 * glazing-urile sunt suprapuse peste pereți ca rect-uri mai mici (max 8% din aria fețe per fereastră).
 *
 * @param {string} face
 * @param {Array} elements
 * @param {Object} dims
 * @returns {Array} rect-uri cu coordonate procentuale
 */
function layoutFace(face, elements, dims) {
  const faceAreaM2 = faceArea(face, dims);
  if (!elements.length || faceAreaM2 <= 0) return [];

  const opaques = elements.filter(e => e._kind !== "glazing");
  const glazing = elements.filter(e => e._kind === "glazing");

  const rects = [];

  // ── Opace: stivuite orizontal cu lățime ∝ aria ──────────────────────────
  const sumOpaqueArea = opaques.reduce((s, e) => s + (parseFloat(e.area) || 0), 0);
  if (sumOpaqueArea > 0) {
    let xCursor = 0;
    for (const el of opaques) {
      const areaEl = parseFloat(el.area) || 0;
      const wPct = (areaEl / sumOpaqueArea) * 100;
      rects.push({
        kind: "opaque",
        element: el,
        xPct: xCursor,
        yPct: 0,
        wPct,
        hPct: 100,
      });
      xCursor += wPct;
    }
  } else {
    // Fără opace dar totuși există glazing — desenăm un singur panou de bază
    rects.push({
      kind: "opaque",
      element: null,
      xPct: 0, yPct: 0, wPct: 100, hPct: 100,
    });
  }

  // ── Glazing: distribuite uniform pe lățime, centrat vertical ────────────
  // Fiecare fereastră ocupă un dreptunghi cu lățime = sqrt(areaGlazing / faceArea) · 100%
  // centrate pe 35%-65% din înălțime (banda centrală).
  const nGlazing = glazing.length;
  if (nGlazing > 0) {
    const bandYStart = 30;
    const bandHeight = 40;
    const slotWidth = 100 / (nGlazing + 1);
    glazing.forEach((el, idx) => {
      const areaEl = parseFloat(el.area) || 0;
      const ratio = Math.min(0.9, Math.sqrt(areaEl / faceAreaM2));
      const wPct = Math.max(4, ratio * 70);    // max 70% din slot, min 4%
      const hPct = Math.max(8, ratio * bandHeight * 2);
      rects.push({
        kind: "glazing",
        element: el,
        xPct: slotWidth * (idx + 1) - wPct / 2,
        yPct: bandYStart + (bandHeight - hPct) / 2,
        wPct,
        hPct,
      });
    });
  }

  return rects;
}

/**
 * Calculează U-value pentru un element opac (reutilizează calcOpaqueR dacă dat).
 * Fallback: dacă element.U sau element._U există, returnează direct.
 * @param {Object} el
 * @param {Function} [calcOpaqueR]
 * @returns {number|null}
 */
function getElementU(el, calcOpaqueR) {
  if (!el) return null;
  if (Number.isFinite(el.U)) return el.U;
  if (Number.isFinite(el._U)) return el._U;
  if (Number.isFinite(el.u))  return el.u;  // glazing
  if (typeof calcOpaqueR === "function" && Array.isArray(el.layers)) {
    try {
      const r = calcOpaqueR(el);
      if (Number.isFinite(r) && r > 0) return 1 / r;
    } catch {}
  }
  return null;
}

/**
 * Construiește muchiile cutiei pentru punți termice.
 * Grupează punțile după categorie (colț, planșeu, soclu etc.) și le asociază muchii plauzibile.
 * Pentru MVP: distribuie toate punțile pe cele 12 muchii ale cutiei uniform, intensitate ∝ ψ·L.
 * @param {Array} bridges
 * @param {Object} dims
 * @returns {Array} { edgeId, bridge, psiL, intensity }
 */
function buildBridgeEdges(bridges, dims) {
  if (!Array.isArray(bridges) || bridges.length === 0) return [];
  const psiL = bridges.map(b => (parseFloat(b.psi) || 0) * (parseFloat(b.length) || 0));
  const maxPsiL = Math.max(...psiL, 0.001);

  // 12 muchii: 4 verticale (col NE/NV/SE/SV), 4 sus (top N/S/E/W), 4 jos (bottom N/S/E/W)
  const EDGES = [
    "top-north", "top-south", "top-east", "top-west",
    "bottom-north", "bottom-south", "bottom-east", "bottom-west",
    "vert-ne", "vert-nw", "vert-se", "vert-sw",
  ];

  // Mapare euristică categorie → muchii
  const catToEdges = (cat) => {
    if (!cat) return EDGES;
    const c = String(cat).toLowerCase();
    if (c.includes("acoperi") || c.includes("coamă") || c.includes("cornișă") || c.includes("atic"))
      return ["top-north", "top-south", "top-east", "top-west"];
    if (c.includes("balcon") || c.includes("logii") || c.includes("consolă"))
      return ["vert-ne", "vert-nw", "vert-se", "vert-sw"];
    if (c.includes("ferestr") || c.includes("glaf") || c.includes("prag"))
      return []; // tratate separat pe glazing rects, nu pe muchii
    if (c.includes("soclu") || c.includes("subsol") || c.includes("fundație"))
      return ["bottom-north", "bottom-south", "bottom-east", "bottom-west"];
    if (c.includes("stâlp") || c.includes("colț"))
      return ["vert-ne", "vert-nw", "vert-se", "vert-sw"];
    return EDGES;
  };

  const edges = [];
  bridges.forEach((b, i) => {
    const candidateEdges = catToEdges(b.cat);
    if (candidateEdges.length === 0) return;
    // Distribuie round-robin pe muchiile candidate
    candidateEdges.forEach((edgeId, j) => {
      edges.push({
        edgeId,
        bridge: b,
        psiL: psiL[i],
        intensity: maxPsiL > 0 ? psiL[i] / maxPsiL : 0,
      });
    });
  });

  return edges;
}

/**
 * Funcția principală — construiește schema completă a clădirii.
 * @param {Object} params
 * @param {Array} params.opaqueElements
 * @param {Array} params.glazingElements
 * @param {Array} params.thermalBridges
 * @param {Object} params.building
 * @param {Function} [params.calcOpaqueR]
 * @param {Object} [params.climate] - { T_int, T_ext }
 * @returns {Object} { dims, faces: {north, south, ...}, bridgeEdges, dT }
 */
export function buildBuildingSchema({
  opaqueElements = [],
  glazingElements = [],
  thermalBridges = [],
  building = {},
  calcOpaqueR,
  climate = {},
}) {
  const dims = getBoxDimensions(building);
  const grouped = groupByFace(opaqueElements, glazingElements);

  const faces = {};
  for (const [faceId, elements] of Object.entries(grouped)) {
    const rects = layoutFace(faceId, elements, dims);
    // Atașează U și U_ref la fiecare rect pentru heatmap
    const rectsWithU = rects.map(r => ({
      ...r,
      U: getElementU(r.element, calcOpaqueR),
      U_ref: r.element?.type ? getURefNZEB(building.category, r.element.type) : null,
    }));
    faces[faceId] = {
      id: faceId,
      areaM2: faceArea(faceId, dims),
      rects: rectsWithU,
    };
  }

  const bridgeEdges = buildBridgeEdges(thermalBridges, dims);

  const T_int = Number.isFinite(climate.T_int) ? climate.T_int : 20;
  const T_ext = Number.isFinite(climate.T_ext) ? climate.T_ext : -15;
  const dT = T_int - T_ext;

  return { dims, faces, bridgeEdges, dT, T_int, T_ext };
}
