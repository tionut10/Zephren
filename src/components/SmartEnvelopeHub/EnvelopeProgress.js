/**
 * EnvelopeProgress — gate-uri pentru tracker-ul de progres Step 2 Anvelopă.
 *
 * 10 câmpuri critice (STEP2_FIELDS) care indică dacă anvelopa este completă
 * conform Mc 001-2022. Fiecare gate are:
 *   - key    : identificator stabil pentru mapare UI
 *   - label  : text afișat în tooltip/lista lipsă (RO)
 *   - weight : pondere (toate 1 momentan — se poate ajusta în S3/S4)
 *   - check  : funcție (state) => boolean
 *
 * Ordinea gate-urilor este cea aprobată în envelope_hub_design.md (D1-D7).
 * NU schimbați ordinea fără actualizarea memoriei + documentației UX.
 */

// ── Tipuri elemente opace (preluate din energy-calc.jsx ELEMENT_TYPES) ─────────
// PE  = perete exterior
// PT  = terasă (acoperiș plat)
// PP  = planșeu pod (sub acoperiș)
// PL  = planșeu pe sol
// PB  = planșeu peste subsol neîncălzit
// Aici doar comparăm cu id-urile — nu avem nevoie de ELEMENT_TYPES la runtime.
const ROOF_TYPES  = ["PT", "PP"];
const FLOOR_TYPES = ["PL", "PB"];

/**
 * Verifică dacă un element opac are cel puțin un strat cu conductivitate λ > 0.
 * Folosim guard defensiv pentru layers lipsă sau malformate.
 */
function hasAtLeastOneValidLayer(element) {
  if (!element || !Array.isArray(element.layers)) return false;
  return element.layers.some(l => {
    const lambda = parseFloat(l?.lambda);
    return Number.isFinite(lambda) && lambda > 0;
  });
}

/**
 * Suma suprafețelor opace + vitrate în m².
 */
function sumAreas(opaqueElements, glazingElements) {
  const o = (opaqueElements || []).reduce((s, el) => s + (parseFloat(el?.area) || 0), 0);
  const g = (glazingElements || []).reduce((s, el) => s + (parseFloat(el?.area) || 0), 0);
  return o + g;
}

/**
 * Lista celor 10 gate-uri de progres anvelopă. Ordonate conform design doc.
 */
export const STEP2_FIELDS = Object.freeze([
  {
    key: "opaqueCount",
    label: "Cel puțin 3 elemente opace",
    weight: 1,
    check: ({ opaqueElements }) => (opaqueElements?.length || 0) >= 3,
  },
  {
    key: "hasExternalWall",
    label: "Cel puțin un perete exterior (PE)",
    weight: 1,
    check: ({ opaqueElements }) =>
      (opaqueElements || []).some(el => el?.type === "PE"),
  },
  {
    key: "hasRoof",
    label: "Cel puțin un acoperiș (PT sau PP)",
    weight: 1,
    check: ({ opaqueElements }) =>
      (opaqueElements || []).some(el => ROOF_TYPES.includes(el?.type)),
  },
  {
    key: "hasFloor",
    label: "Cel puțin un planșeu inferior (PL sau PB)",
    weight: 1,
    check: ({ opaqueElements }) =>
      (opaqueElements || []).some(el => FLOOR_TYPES.includes(el?.type)),
  },
  {
    key: "allOrientationsSet",
    label: "Toate elementele opace au orientare setată",
    weight: 1,
    check: ({ opaqueElements }) => {
      const list = opaqueElements || [];
      if (list.length === 0) return false;
      return list.every(el => !!(el?.orientation && String(el.orientation).trim()));
    },
  },
  {
    key: "allLayersValid",
    label: "Toate elementele opace au straturi cu λ > 0",
    weight: 1,
    check: ({ opaqueElements }) => {
      const list = opaqueElements || [];
      if (list.length === 0) return false;
      return list.every(hasAtLeastOneValidLayer);
    },
  },
  {
    key: "hasGlazing",
    label: "Cel puțin un element vitrat",
    weight: 1,
    check: ({ glazingElements }) => (glazingElements?.length || 0) >= 1,
  },
  {
    key: "hasBridges",
    label: "Cel puțin 3 punți termice",
    weight: 1,
    check: ({ thermalBridges }) => (thermalBridges?.length || 0) >= 3,
  },
  {
    key: "areasMatchEnvelope",
    label: "Suprafețe totale ≈ suprafață anvelopă (±10%)",
    weight: 1,
    check: ({ opaqueElements, glazingElements, building }) => {
      const target = parseFloat(building?.areaEnvelope) || 0;
      if (target <= 0) return false;
      const sum = sumAreas(opaqueElements, glazingElements);
      if (sum <= 0) return false;
      const delta = Math.abs(sum - target) / target;
      return delta <= 0.10;
    },
  },
  {
    key: "allUComputed",
    label: "Toate elementele au U calculat (finit)",
    weight: 1,
    check: ({ opaqueElements, glazingElements, calcOpaqueR }) => {
      const opaque = opaqueElements || [];
      const glazing = glazingElements || [];
      if (opaque.length === 0 && glazing.length === 0) return false;

      // U opace — folosim calcOpaqueR injectat din energy-calc.jsx
      if (typeof calcOpaqueR === "function") {
        const allOpaqueOk = opaque.every(el => {
          try {
            const { u } = calcOpaqueR(el.layers, el.type) || {};
            return Number.isFinite(u) && u > 0;
          } catch {
            return false;
          }
        });
        if (!allOpaqueOk) return false;
      }

      // U vitrate — introduse manual, verificare directă
      const allGlazingOk = glazing.every(el => {
        const u = parseFloat(el?.u);
        return Number.isFinite(u) && u > 0;
      });
      return allGlazingOk;
    },
  },
]);

/**
 * Calculează progresul anvelopei — câte gate-uri sunt îndeplinite.
 *
 * @param {Object} state - Starea Step 2.
 * @param {Array}  state.opaqueElements  - Elemente opace (PE, PT, PP, PL, PB).
 * @param {Array}  state.glazingElements - Elemente vitrate (ferestre, uși).
 * @param {Array}  state.thermalBridges  - Punți termice liniare.
 * @param {Object} state.building        - Date clădire din Step 1 (areaEnvelope).
 * @param {Function} state.calcOpaqueR   - Calculator U pentru elemente opace.
 * @returns {{ filled: number, total: number, pct: number, missing: Array, gates: Array }}
 */
export function computeEnvelopeProgress(state) {
  const gates = STEP2_FIELDS.map(gate => {
    let ok = false;
    try {
      ok = !!gate.check(state);
    } catch {
      ok = false; // gate defensiv: orice eroare = nerezolvat
    }
    return { key: gate.key, label: gate.label, weight: gate.weight, ok };
  });

  const filled = gates.filter(g => g.ok).length;
  const total = gates.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const missing = gates.filter(g => !g.ok);

  return { filled, total, pct, missing, gates };
}
