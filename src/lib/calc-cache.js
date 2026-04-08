// calc-cache.js — Cache pentru rezultate calcule energetice
// Pct. 61 — Infrastructură tehnică Zephren v3.4
//
// Evită recalcularea identică a ISO 13790 / ISO 52016 când inputs-urile nu s-au schimbat.
// Cheie cache = hash simplu al inputs relevante (fără funcții, fără referințe circulare).

// ── Hash simplu al inputs ────────────────────────────────────────────────────

/**
 * Generează o cheie de cache din inputs relevante pentru calcul.
 * Exclude funcții, referințe DOM, câmpuri non-serializabile.
 *
 * @param {object} building
 * @param {object} climate
 * @param {Array}  opaqueElements
 * @param {Array}  glazingElements
 * @param {object} [extras] — orice alți parametri serializabili (ventilation, heating, etc.)
 * @returns {string} hash string
 */
export function hashCalcInputs(building, climate, opaqueElements, glazingElements, extras = {}) {
  // Subset minimal relevant pentru calcul termic (omite câmpuri UI-only)
  const relevant = {
    b: pickBuildingFields(building),
    c: pickClimateFields(climate),
    oe: (opaqueElements ?? []).map(pickOpaqueFields),
    ge: (glazingElements ?? []).map(pickGlazingFields),
    x: sanitize(extras),
  };

  try {
    return JSON.stringify(relevant);
  } catch {
    // Fallback pentru structuri circulare / non-serializabile
    return String(Date.now());
  }
}

// ── Selectori câmpuri relevante ───────────────────────────────────────────────

function pickBuildingFields(b) {
  if (!b) return null;
  return {
    type: b.type,
    af: b.af,
    volume: b.volume,
    floors: b.floors,
    height: b.height,
    climate: b.climate,
    orientation: b.orientation,
    thermalMass: b.thermalMass,
    infiltration: b.infiltration,
    internalGains: b.internalGains,
    occupancy: b.occupancy,
    setpointHeating: b.setpointHeating,
    setpointCooling: b.setpointCooling,
  };
}

function pickClimateFields(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    zone: c.zone,
    // Include datele lunare dacă există
    T_ext: c.T_ext,
    I_sol: c.I_sol,
    HDD: c.HDD,
    CDD: c.CDD,
  };
}

function pickOpaqueFields(e) {
  if (!e) return null;
  return {
    type: e.type,
    area: e.area,
    u: e.u,
    orientation: e.orientation,
    layers: e.layers,
  };
}

function pickGlazingFields(e) {
  if (!e) return null;
  return {
    type: e.type,
    area: e.area,
    u: e.u,
    g: e.g,
    orientation: e.orientation,
    shading: e.shading,
  };
}

/** Elimină funcții și valori non-JSON din obiect (shallow). */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'function' && v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

// ── Factory cache ────────────────────────────────────────────────────────────

/**
 * Creează o instanță de cache LRU simplă pentru rezultate calcule.
 *
 * @param {number} [maxEntries=50] — numărul maxim de intrări în cache
 * @returns {{
 *   get: (inputs: object) => any | null,
 *   set: (inputs: object, result: any) => void,
 *   invalidate: () => void,
 *   stats: () => { hits: number, misses: number, size: number },
 * }}
 */
export function createCalcCache(maxEntries = 50) {
  /** @type {Map<string, any>} — Map păstrează ordinea inserției (LRU simplu) */
  const store = new Map();
  let hits = 0;
  let misses = 0;

  return {
    /**
     * Returnează rezultatul cached pentru inputs-urile date, sau `null` dacă nu există.
     * @param {object} inputs — { building, climate, opaqueElements, glazingElements, extras }
     */
    get(inputs) {
      const key = buildKey(inputs);
      if (store.has(key)) {
        hits++;
        // Mută la end (LRU: cel mai recent accesat)
        const val = store.get(key);
        store.delete(key);
        store.set(key, val);
        return val;
      }
      misses++;
      return null;
    },

    /**
     * Salvează un rezultat de calcul în cache.
     * @param {object} inputs — același obiect ca la get()
     * @param {any}    result — rezultatul de salvat
     */
    set(inputs, result) {
      const key = buildKey(inputs);

      // Evictare LRU dacă cache-ul e plin
      if (store.size >= maxEntries && !store.has(key)) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }

      store.set(key, result);
    },

    /** Golește complet cache-ul. */
    invalidate() {
      store.clear();
      hits = 0;
      misses = 0;
    },

    /** Statistici cache: hits, misses, dimensiune curentă. */
    stats() {
      return { hits, misses, size: store.size };
    },
  };
}

// ── Helper intern ────────────────────────────────────────────────────────────

/**
 * Construiește cheia din obiectul de inputs care poate conține fie
 * câmpurile desfășurate, fie un obiect `{ building, climate, ... }`.
 */
function buildKey(inputs) {
  if (!inputs) return 'null';

  // Dacă e apelat cu un singur obiect structurat
  if ('building' in inputs || 'climate' in inputs) {
    const { building, climate, opaqueElements, glazingElements, ...rest } = inputs;
    return hashCalcInputs(building, climate, opaqueElements, glazingElements, rest);
  }

  // Fallback: serializare directă
  try {
    return JSON.stringify(inputs);
  } catch {
    return String(Date.now());
  }
}

// ── Instanță globală (opțional de folosit direct) ────────────────────────────

/** Cache global singleton pentru calcule curente. */
export const globalCalcCache = createCalcCache(50);
