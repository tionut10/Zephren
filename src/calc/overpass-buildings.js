/**
 * Overpass Buildings — Sprint D Task 5
 *
 * Fetch polygon-uri clădiri din OpenStreetMap via Overpass API pentru
 * un punct geografic dat. Folosit pentru calculul umbririi de la
 * clădiri vecine în BuildingMapAdvanced + integrare cu shading-dynamic.js.
 *
 * Endpoint: https://overpass-api.de/api/interpreter (free, no key, rate ~10 q/s)
 * Documentație: https://wiki.openstreetmap.org/wiki/Overpass_API
 *
 * Estimare înălțime clădire (în ordinea preferinței):
 *   1. tag `height` (în metri sau cu unit) — exact
 *   2. tag `building:levels` × 3 m/etaj — estimat
 *   3. fallback 8 m (clădire mică P+1)
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const FLOOR_HEIGHT_M = 3.0;
const FALLBACK_HEIGHT_M = 8.0;

// Cache simplu in-memory (LRU mic, max 20 chei) — evită hammering Overpass la pan/zoom
const _cache = new Map();
const CACHE_MAX = 20;

function cacheKey(lat, lon, radius) {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${radius}`;
}

function parseHeight(tags) {
  if (!tags) return null;
  // tag `height` poate fi „12", „12 m", „12.5 metres"
  if (tags.height) {
    const m = String(tags.height).match(/^([\d.]+)/);
    if (m) {
      const h = parseFloat(m[1]);
      if (!isNaN(h) && h > 0 && h < 500) return Math.round(h * 10) / 10;
    }
  }
  // tag `building:levels` (etaje peste sol)
  if (tags["building:levels"]) {
    const lvl = parseFloat(tags["building:levels"]);
    if (!isNaN(lvl) && lvl > 0 && lvl < 200) {
      return Math.round(lvl * FLOOR_HEIGHT_M * 10) / 10;
    }
  }
  return null;
}

/**
 * Calcul centroid pentru polygon (medie aritmetică simplă, OK pt clădiri mici).
 */
function polygonCentroid(coords) {
  if (!coords || coords.length === 0) return null;
  let lat = 0, lon = 0;
  for (const c of coords) {
    lat += c.lat;
    lon += c.lon;
  }
  return { lat: lat / coords.length, lon: lon / coords.length };
}

/**
 * Calcul distanță haversine în metri.
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcul azimut de la (lat1,lon1) către (lat2,lon2). Rezultat 0-360°
 * unde 0=N, 90=E, 180=S, 270=V.
 */
function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Map azimut → orientare 16 puncte (compatibil cu shading-dynamic.js)
 */
function azimuthToOrientation(az) {
  // Normalizez 0-360, transform la „față de S" 0=S, +180=N, +90=V, -90=E
  const sectors = [
    { from: 348.75, to:  11.25, name: "N" },
    { from:  11.25, to:  33.75, name: "NNE" },
    { from:  33.75, to:  56.25, name: "NE" },
    { from:  56.25, to:  78.75, name: "ENE" },
    { from:  78.75, to: 101.25, name: "E" },
    { from: 101.25, to: 123.75, name: "ESE" },
    { from: 123.75, to: 146.25, name: "SE" },
    { from: 146.25, to: 168.75, name: "SSE" },
    { from: 168.75, to: 191.25, name: "S" },
    { from: 191.25, to: 213.75, name: "SSV" },
    { from: 213.75, to: 236.25, name: "SV" },
    { from: 236.25, to: 258.75, name: "VSV" },
    { from: 258.75, to: 281.25, name: "V" },
    { from: 281.25, to: 303.75, name: "VNV" },
    { from: 303.75, to: 326.25, name: "NV" },
    { from: 326.25, to: 348.75, name: "NNV" },
  ];
  for (const s of sectors) {
    if (s.from > s.to) {
      // wrap-around N
      if (az >= s.from || az < s.to) return s.name;
    } else {
      if (az >= s.from && az < s.to) return s.name;
    }
  }
  return "S";
}

/**
 * Fetch buildings around a point.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius - Raza căutare în metri (default 80 m, max 200)
 * @returns {Promise<{
 *   buildings: Array<{
 *     id, coords (lat/lon[]), centroid, height, levels, name, type,
 *     distance, bearing, orientation,
 *   }>,
 *   meta: { center, radius, count, source, fetchedAt }
 * }>}
 */
export async function fetchNearbyBuildings(lat, lon, radius = 80) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new Error("Invalid coordinates");
  }
  const r = Math.max(20, Math.min(200, radius));
  const ck = cacheKey(lat, lon, r);
  if (_cache.has(ck)) {
    const cached = _cache.get(ck);
    _cache.delete(ck);
    _cache.set(ck, cached); // LRU touch
    return cached;
  }

  // Overpass query: clădiri cu way (poligon) într-un cerc de rază R
  const query = `
    [out:json][timeout:15];
    (
      way["building"](around:${r},${lat},${lon});
      relation["building"](around:${r},${lat},${lon});
    );
    out body geom;
  `.trim();

  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`Overpass error: ${resp.status}`);
  const data = await resp.json();

  const buildings = [];
  for (const el of (data.elements || [])) {
    if (el.type !== "way" || !Array.isArray(el.geometry)) continue;
    const coords = el.geometry.map(g => ({ lat: g.lat, lon: g.lon }));
    if (coords.length < 3) continue;
    const centroid = polygonCentroid(coords);
    if (!centroid) continue;

    const height = parseHeight(el.tags) ?? FALLBACK_HEIGHT_M;
    const levels = el.tags?.["building:levels"]
      ? parseFloat(el.tags["building:levels"])
      : Math.round(height / FLOOR_HEIGHT_M);

    const distance = haversineMeters(lat, lon, centroid.lat, centroid.lon);
    const bearing = bearingDeg(lat, lon, centroid.lat, centroid.lon);

    buildings.push({
      id: el.id,
      coords,
      centroid,
      height,
      levels,
      name: el.tags?.name || null,
      type: el.tags?.building || "yes",
      heightSource: el.tags?.height ? "tag:height"
                  : el.tags?.["building:levels"] ? "tag:levels"
                  : "fallback",
      distance: Math.round(distance),
      bearing: Math.round(bearing),
      orientation: azimuthToOrientation(bearing),
    });
  }

  // Sortez după distanță
  buildings.sort((a, b) => a.distance - b.distance);

  const result = {
    buildings,
    meta: {
      center: { lat, lon },
      radius: r,
      count: buildings.length,
      source: "OpenStreetMap via Overpass API",
      fetchedAt: new Date().toISOString(),
    },
  };

  // LRU cache: dacă e plin, eliminăm cea mai veche cheie
  if (_cache.size >= CACHE_MAX) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(ck, result);

  return result;
}

/**
 * Pentru fiecare orientare cardinală (S, E, V, N), găsește clădirea vecină
 * dominantă (cea mai înaltă × cea mai apropiată) și returnează parametrii
 * pentru calcBuildingShading.
 *
 * Apoi apelează calcBuildingShading din shading-dynamic.js pentru fiecare
 * orientare și agregă rezultatul.
 */
export function computeShadingFromBuildings(currentBuilding, neighbors, calcBuildingShadingFn) {
  const ORIENTATIONS = ["S", "SE", "E", "NE", "N", "NV", "V", "SV"];
  const lat = currentBuilding.lat;
  const buildingHeight = currentBuilding.height || 10;

  const results = {};
  for (const ori of ORIENTATIONS) {
    // Găsesc vecinii care obstrucționează această orientare (±22.5°)
    const candidates = neighbors.filter(n => n.orientation === ori || _adjacentOrientations(ori).includes(n.orientation));
    if (candidates.length === 0) {
      results[ori] = { hasNeighbor: false, shadingFactor: 0, neighbor: null };
      continue;
    }
    // Vecinul „dominant" = max(height − distanceMargin) — efectiv cel care obstrucționează cel mai mult
    const dominant = candidates.reduce((best, n) => {
      const score = n.height - n.distance / 5; // heuristic empiric
      return score > (best?._score ?? -Infinity) ? { ...n, _score: score } : best;
    }, null);
    if (!dominant) {
      results[ori] = { hasNeighbor: false, shadingFactor: 0, neighbor: null };
      continue;
    }
    const shadingResult = calcBuildingShadingFn({
      faceOrientation: ori,
      adjacentBuildingHeight: dominant.height,
      adjacentBuildingDistance: Math.max(3, dominant.distance),
      buildingHeight,
      latDeg: lat,
    });
    results[ori] = {
      hasNeighbor: true,
      shadingFactor: shadingResult.solarGain_reduction_pct / 100,
      shadingMonthly: shadingResult.shadingFactor_month,
      neighbor: {
        id: dominant.id,
        height: dominant.height,
        distance: dominant.distance,
        name: dominant.name,
      },
      raw: shadingResult,
    };
  }
  return results;
}

function _adjacentOrientations(ori) {
  // Pentru a identifica clădiri ale căror direcție e ±22.5°, aceptăm și sub-direcțiile
  const map = {
    S:  ["SSE", "SSV"],
    SE: ["ESE", "SSE"],
    E:  ["ENE", "ESE"],
    NE: ["NNE", "ENE"],
    N:  ["NNE", "NNV"],
    NV: ["NNV", "VNV"],
    V:  ["VSV", "VNV"],
    SV: ["VSV", "SSV"],
  };
  return map[ori] || [];
}

export { polygonCentroid, haversineMeters, bearingDeg, azimuthToOrientation, parseHeight };
