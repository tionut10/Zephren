import { NZEB_THRESHOLDS } from '../data/energy-classes.js';
import { ENERGY_CLASSES_DB, CLASS_LABELS } from '../data/energy-classes.js';

// ═══════════════════════════════════════════════════════════════
// REABILITARE ETAPIZATĂ — Planificare multi-an cu bugete anuale
// Pct. 70 — Optimizare portofoliu de măsuri pe ani
// ═══════════════════════════════════════════════════════════════

// Strategii de prioritizare disponibile
export const PHASING_STRATEGIES = {
  quick_wins:      'Câștiguri rapide (ROI < 5 ani primele)',
  envelope_first:  'Anvelopă prima (reducere maximă EP)',
  systems_first:   'Sisteme prima (instalații eficiente)',
  balanced:        'Echilibrat (mix anvelopă + sisteme)',
};

// Sisteme categorii pentru strategia "balanced"
const SYSTEM_CATEGORIES    = ['Instalații', 'Regenerabile', 'Iluminat'];
const ENVELOPE_CATEGORIES  = ['Anvelopă'];

// Sprint 26 P1.6+P1.7 — aliniere cu Reg. UE 2025/2273 financial private + escalation default 3%
// Rata de actualizare implicită pentru NPV [%/an]
const DEFAULT_DISCOUNT_RATE = 0.04; // 4% (Reg. UE 2025/2273 financial private)
// Rata inflației energie [%/an] — escalation default 3% (alinare cu financial.js)
const DEFAULT_ENERGY_INFLATION = 0.03; // 3%

/**
 * Determină clasa energetică dintr-un EP și o categorie de clădire.
 * @param {number} ep
 * @param {string} category - ex: 'RI', 'RC', 'BI'
 * @param {boolean} hasCooling
 * @returns {string}
 */
function getEpClass(ep, category = 'AL', hasCooling = false) {
  const key = hasCooling ? `${category}_cool` : `${category}_nocool`;
  const db  = ENERGY_CLASSES_DB[key] || ENERGY_CLASSES_DB[category] || ENERGY_CLASSES_DB.AL;
  for (let i = 0; i < db.thresholds.length; i++) {
    if (ep <= db.thresholds[i]) return CLASS_LABELS[i];
  }
  return 'G';
}

/**
 * Sortează măsurile conform strategiei alese.
 * @param {Array} measures
 * @param {string} strategy
 * @returns {Array} măsuri sortate (prioritate descrescătoare → prima = cea mai urgentă)
 */
function sortByStrategy(measures, strategy) {
  const scored = measures.map(m => {
    const cost   = parseFloat(m.cost_RON) || 0;
    const epRed  = parseFloat(m.ep_reduction_kWh_m2) || 0;
    const co2Red = parseFloat(m.co2_reduction) || 0;
    const roi    = cost > 0 && epRed > 0 ? cost / (epRed * 10) : 999; // simplu: ani recuperare

    let score = 0;
    if (strategy === 'quick_wins') {
      score = -roi; // mai mic ROI = mai bun → scor mai mare
    } else if (strategy === 'envelope_first') {
      const isEnvelope = ENVELOPE_CATEGORIES.includes(m.system || m.category || '');
      score = isEnvelope ? epRed * 2 : epRed;
    } else if (strategy === 'systems_first') {
      const isSystem = SYSTEM_CATEGORIES.includes(m.system || m.category || '');
      score = isSystem ? epRed * 2 : epRed;
    } else if (strategy === 'balanced') {
      // Alternare anvelopă / sisteme prin factor de echilibrare
      const isEnvelope = ENVELOPE_CATEGORIES.includes(m.system || m.category || '');
      score = epRed + co2Red * 0.5 + (isEnvelope ? 10 : 0);
    } else {
      score = epRed; // fallback: EP reduction
    }

    return { ...m, _score: score, _roi: roi };
  });

  return scored.sort((a, b) => {
    // Prioritate explicită dacă există
    if (a.priority !== undefined && b.priority !== undefined && a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b._score - a._score;
  });
}

/**
 * Calculează planul de reabilitare etapizată multi-an.
 *
 * @param {Array}  measures            - [{ id, name, cost_RON, ep_reduction_kWh_m2, co2_reduction, system, priority }]
 * @param {number} annualBudget_RON    - buget anual disponibil [RON]
 * @param {string} priorityMode        - 'ROI' | 'EP_reduction' | 'cost_asc' | 'envelope_first' | 'systems_first' | 'balanced'
 * @param {number} epInitial_m2        - EP inițial clădire [kWh/(m²·an)]
 * @param {string} buildingCategory    - categorie clădire (pentru clasă energetică)
 * @param {number} areaUseful_m2       - suprafața utilă clădire [m²]
 * @param {number} energyCostRON_kWh   - prețul energiei [RON/kWh]
 * @param {number} discountRate        - rată actualizare pentru NPV (default 0.06)
 * @param {number} energyInflation     - inflație energie anuală (default 0.04)
 * @returns {{
 *   phases: Array,
 *   totalYears: number,
 *   epTrajectory: number[],
 *   classTrajectory: string[],
 *   cumulativeSavings_RON: number,
 *   npv: number,
 *   totalCost_RON: number,
 *   unscheduledMeasures: Array,
 *   summary: Object
 * }}
 */
export function calcPhasedRehabPlan(
  measures,
  annualBudget_RON,
  priorityMode   = 'balanced',
  epInitial_m2   = 200,
  buildingCategory = 'AL',
  areaUseful_m2  = 100,
  energyCostRON_kWh = 0.40,
  discountRate   = DEFAULT_DISCOUNT_RATE,
  energyInflation = DEFAULT_ENERGY_INFLATION,
) {
  if (!measures || measures.length === 0) {
    return { phases: [], totalYears: 0, epTrajectory: [epInitial_m2], classTrajectory: [getEpClass(epInitial_m2, buildingCategory)], cumulativeSavings_RON: 0, npv: 0, totalCost_RON: 0, unscheduledMeasures: [], summary: {} };
  }

  // Mapare alias priorityMode → strategy intern
  const strategyMap = { ROI: 'quick_wins', EP_reduction: 'envelope_first', cost_asc: 'quick_wins' };
  const strategy    = strategyMap[priorityMode] || priorityMode;

  // Sortare măsuri conform strategiei
  const sorted = sortByStrategy([...measures], strategy);

  const phases            = [];
  const scheduled         = new Set();
  // CR-7 (7 mai 2026) — calcul iterativ EP cu diminishing returns:
  // tracker BASELINE pentru calculul ratei de eficiență per măsură
  const epInitialNum      = parseFloat(epInitial_m2) || 200;
  let epCurrent           = epInitialNum;
  // CR-8 (7 mai 2026) — tracker CO₂ inițial pentru cap fizic baseline
  // Estimare CO₂ inițial = sum(co2_reduction)|când nu cunoaștem direct → folosim
  // suma maximă a măsurilor doar ca limita superioară de pornire (ulterior va fi
  // recalibrată dacă suma reducerilor depășește baseline real estimat).
  const co2Sum            = sorted.reduce((s, m) => s + (parseFloat(m.co2_reduction) || 0), 0);
  // Heuristic: pentru clădiri rezidențiale RA, CO₂ baseline ≈ EP × 0.19 (mix
  // termoficare/gaz/electricitate). Folosim raportul ca să estimăm CO₂ baseline
  // dacă utilizatorul nu îl furnizează (nu îl avem la nivelul acestei funcții).
  const co2InitialEstimate = epInitialNum * 0.19;
  // Plafon CO₂ baseline = max(estimat, sum reduceri) pentru a evita ratio>1
  const co2Initial        = Math.max(co2InitialEstimate, co2Sum * 0.6);
  let co2Current          = co2Initial;
  let cumulativeCost_RON  = 0;
  let cumulativeSavingsRON = 0;
  let npv                  = 0;
  let year                 = 1;
  const MAX_YEARS          = 20;
  const budget             = parseFloat(annualBudget_RON) || 50000;

  while (scheduled.size < sorted.length && year <= MAX_YEARS) {
    const phaseMeasures   = [];
    let budgetLeft        = budget;
    let epReductionPhase  = 0;
    let co2ReductionPhase = 0;
    let phaseCost         = 0;

    for (const m of sorted) {
      if (scheduled.has(m.id)) continue;
      const cost = parseFloat(m.cost_RON) || 0;
      if (cost <= budgetLeft) {
        phaseMeasures.push(m);
        scheduled.add(m.id);
        budgetLeft       -= cost;
        phaseCost        += cost;
        // CR-7+CR-8 (7 mai 2026) — agregăm reducerile NOMINAL (independent) doar
        // pentru raportare; aplicarea iterativă cu diminishing returns se face mai jos.
        epReductionPhase += parseFloat(m.ep_reduction_kWh_m2) || 0;
        co2ReductionPhase += parseFloat(m.co2_reduction) || 0;
      }
    }

    if (phaseMeasures.length === 0) {
      // Nici o măsură nu încape în buget — trecem la cea mai ieftină rămasă
      const remaining = sorted.filter(m => !scheduled.has(m.id));
      if (remaining.length === 0) break;

      // Verificăm dacă putem acumula mai mulți ani de buget pentru o măsură mare
      const cheapest = remaining.reduce((min, m) =>
        (parseFloat(m.cost_RON) || 0) < (parseFloat(min.cost_RON) || 0) ? m : min, remaining[0]);

      // Dacă măsura cea mai ieftină e > 3× buget anual → marcăm ca nerealizabilă
      if ((parseFloat(cheapest.cost_RON) || 0) > budget * 3) break;

      year++; // așteptăm un an pentru a acumula buget
      continue;
    }

    // CR-7 (7 mai 2026) — CALCUL ITERATIV CU DIMINISHING RETURNS + cap min 25.
    //
    // Înainte: `epCurrent = Math.max(15, epCurrent - sum(reductions))` — model
    // ADITIV care permitea suma reducerilor să depășească baseline (ex. baseline
    // 856 → year 1: -494 → 362; year 2: -441 → -79 capped la 15). Math invalid:
    // arăta cazul nerealist EP=15 (98% reducere) pentru un buget 80k RON.
    //
    // Acum: model MULTIPLICATIV — fiecare măsură reduce EP curent proporțional
    // cu eficiența ei la baseline. ep_reduction din input e calculată față de
    // baseline-ul inițial, deci convertim în factor de eficiență:
    //   efficiency_i = ep_reduction_i / ep_initial
    //   epCurrent ← epCurrent × (1 - efficiency_i)
    // Acest model respectă proprietatea fizică că măsurile aplicate ulterior
    // au efect marginal redus (efectul lor cumulativ ≠ suma efectelor individuale).
    //
    // Cap absolut: 25 kWh/(m²·an) — passive house realist Mc 001-2022 Tab 2.4
    // pentru clasă A (era 15 = clasă A+ doar pentru clădiri foarte performante).
    const EP_MIN_REALISTIC = 25; // kWh/(m²·an) — clasa A passive house
    let epReductionEffectiveTotal = 0;
    let co2ReductionEffectiveTotal = 0;
    for (const m of phaseMeasures) {
      const epReductionFull = parseFloat(m.ep_reduction_kWh_m2) || 0;
      const co2ReductionFull = parseFloat(m.co2_reduction) || 0;
      // Eficiență față de baseline inițial — cap la 95% pentru a evita
      // anularea completă a EP printr-o singură măsură (fizic improbabil).
      const epEfficiency = epInitialNum > 0
        ? Math.min(0.95, Math.max(0, epReductionFull / epInitialNum))
        : 0;
      const co2Efficiency = co2Initial > 0
        ? Math.min(0.95, Math.max(0, co2ReductionFull / co2Initial))
        : 0;
      // Reducere efectivă = efficiency × valoarea curentă (nu baseline)
      const epReductionEff = epCurrent * epEfficiency;
      const co2ReductionEff = co2Current * co2Efficiency;
      epCurrent = Math.max(EP_MIN_REALISTIC, epCurrent - epReductionEff);
      // CR-8 — cap CO₂ la 0 (fizic imposibil < 0)
      co2Current = Math.max(0, co2Current - co2ReductionEff);
      epReductionEffectiveTotal += epReductionEff;
      co2ReductionEffectiveTotal += co2ReductionEff;
    }
    cumulativeCost_RON += phaseCost;

    // Economii anuale după această fază [RON/an]
    // CR-7 — folosim reducerea EFECTIVĂ (după diminishing returns) nu suma
    // nominală — altfel economiile sunt supraestimate.
    const annualEnergySavingKwh = epReductionEffectiveTotal * areaUseful_m2;
    // Prețul energiei indexat cu inflația la anul curent
    const energyPriceYear = energyCostRON_kWh * Math.pow(1 + energyInflation, year - 1);
    const annualSavingRON  = annualEnergySavingKwh * energyPriceYear;
    cumulativeSavingsRON  += annualSavingRON;

    // NPV contribuție: economii viitoare actualizate (simplificat — flux perpetuu actualizat)
    const remainingYears = Math.max(1, 20 - year);
    // Valoare prezentă flux anual de economii (anuitate)
    const pvFactor = discountRate > 0
      ? (1 - Math.pow(1 + discountRate, -remainingYears)) / discountRate
      : remainingYears;
    npv += annualSavingRON * pvFactor - phaseCost;

    phases.push({
      year,
      measures: phaseMeasures,
      phaseCost_RON: Math.round(phaseCost),
      cumulativeCost_RON: Math.round(cumulativeCost_RON),
      ep_after: Math.round(epCurrent * 10) / 10,
      // CR-7+CR-8 — raportăm REDUCERILE EFECTIVE (după diminishing returns),
      // nu suma nominală — pentru a fi consistente cu valorile EP/CO₂ rezultate.
      // Suma nominală e păstrată în câmpurile *_nominal pentru audit/debug.
      ep_reduction_phase: Math.round(epReductionEffectiveTotal * 10) / 10,
      ep_reduction_phase_nominal: Math.round(epReductionPhase * 10) / 10,
      co2_reduction_phase: Math.round(co2ReductionEffectiveTotal * 100) / 100,
      co2_reduction_phase_nominal: Math.round(co2ReductionPhase * 100) / 100,
      co2_after: Math.round(co2Current * 100) / 100,
      annualSaving_RON: Math.round(annualSavingRON),
      class_after: getEpClass(epCurrent, buildingCategory),
    });

    year++;
  }

  // Măsuri nealocate (buget insuficient chiar și pe MAX_YEARS ani)
  const unscheduledMeasures = sorted.filter(m => !scheduled.has(m.id));

  // Traiectoarii EP și clasă
  const epTrajectory    = [parseFloat(epInitial_m2)];
  const classTrajectory = [getEpClass(parseFloat(epInitial_m2), buildingCategory)];
  phases.forEach(p => {
    epTrajectory.push(p.ep_after);
    classTrajectory.push(p.class_after);
  });

  const totalYears = phases.length > 0 ? phases[phases.length - 1].year : 0;
  const epFinal    = epTrajectory[epTrajectory.length - 1];
  const classFinal = classTrajectory[classTrajectory.length - 1];

  // Verificare atingere nZEB
  const nzebThreshold = NZEB_THRESHOLDS[buildingCategory]?.ep_max?.[2] || 99;
  const nzebReached   = epFinal <= nzebThreshold;

  return {
    phases,
    totalYears,
    epTrajectory:   epTrajectory.map(v => Math.round(v * 10) / 10),
    classTrajectory,
    cumulativeSavings_RON: Math.round(cumulativeSavingsRON),
    npv:            Math.round(npv),
    totalCost_RON:  Math.round(cumulativeCost_RON),
    unscheduledMeasures,
    summary: {
      ep_initial:     Math.round(parseFloat(epInitial_m2) * 10) / 10,
      ep_final:       Math.round(epFinal * 10) / 10,
      ep_reduction_total: Math.round((parseFloat(epInitial_m2) - epFinal) * 10) / 10,
      ep_reduction_pct: epInitial_m2 > 0 ? Math.round((parseFloat(epInitial_m2) - epFinal) / parseFloat(epInitial_m2) * 1000) / 10 : 0,
      class_initial:  classTrajectory[0],
      class_final:    classFinal,
      nzeb_reached:   nzebReached,
      nzeb_threshold: nzebThreshold,
      payback_years:  cumulativeSavingsRON > 0 ? Math.round(cumulativeCost_RON / (cumulativeSavingsRON / Math.max(1, totalYears)) * 10) / 10 : null,
      measures_total: measures.length,
      measures_scheduled: scheduled.size,
      measures_unscheduled: unscheduledMeasures.length,
    },
  };
}

/**
 * Calculează economiile cumulative pe o perioadă de analiză.
 * @param {number} ep_reduction_m2   - reducere EP anuală [kWh/(m²·an)]
 * @param {number} area_m2           - suprafața utilă [m²]
 * @param {number} energyPrice_RON   - prețul energiei [RON/kWh]
 * @param {number} years             - orizont de calcul [ani]
 * @param {number} inflation         - inflație energie anuală
 * @returns {{ savings_per_year: number[], cumulative: number[], total: number }}
 */
export function calcCumulativeSavings(ep_reduction_m2, area_m2, energyPrice_RON, years = 20, inflation = 0.04) {
  const savings_per_year = [];
  const cumulative       = [];
  let total              = 0;

  for (let y = 1; y <= years; y++) {
    const price   = energyPrice_RON * Math.pow(1 + inflation, y - 1);
    const saving  = ep_reduction_m2 * area_m2 * price;
    total        += saving;
    savings_per_year.push(Math.round(saving));
    cumulative.push(Math.round(total));
  }

  return { savings_per_year, cumulative, total: Math.round(total) };
}
