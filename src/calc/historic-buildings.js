import { NZEB_THRESHOLDS } from '../data/energy-classes.js';

// ═══════════════════════════════════════════════════════════════
// CLĂDIRI ISTORICE / MONUMENTE — Constrângeri și soluții permise
// Pct. 64 — Conform Legea 422/2001 + OG 43/2000 + HG 1430/2003
// ═══════════════════════════════════════════════════════════════

// Clasele LMI (Lista Monumentelor Istorice) — conform Ordinul 2314/2004
export const HISTORIC_BUILDING_CLASSES = ['A', 'B', 'C', 'D'];
// A = monument UNESCO / importanță națională excepțională
// B = monument de importanță locală / regională
// C = zonă protejată (nu monument în sine, dar are restricții)
// D = clădire cu valoare arhitecturală — restricții parțiale

// Intervenții interzise per clasă LMI
const FORBIDDEN_BY_CLASS = {
  A: [
    'Modificare fațadă exterioară',
    'Înlocuire tâmplărie cu profil modern (PVC/aluminiu)',
    'Termoizolație exterioară (placă EPS/vată)',
    'Modificare acoperiș (formă, pantă, materiale vizibile)',
    'Demolare elemente decorative originale',
    'Adăugare echipamente tehnice vizibile exterior',
    'Modificare tencuieli exterioare originale',
  ],
  B: [
    'Modificare fațadă exterioară fără aviz MCPN',
    'Înlocuire tâmplărie cu profil PVC vizibil neconform',
    'Termoizolație exterioară clasică (EPS gros)',
    'Modificare acoperișuri tradiționale fără aviz',
    'Înlăturare ornamente sau elemente valoroase',
  ],
  C: [
    'Termoizolație exterioară în zonă de fațadă stradală fără aviz',
    'Modificare tâmplărie fără aviz din partea autorității locale',
    'Modificare volumetrie clădire',
  ],
  D: [
    'Modificare fațadă principală fără notificare',
    'Înlocuire tâmplărie originală fără documentare prealabilă',
  ],
};

// Intervenții permise per clasă LMI
const ALLOWED_BY_CLASS = {
  A: [
    'Termoizolație interioară (nu afectează fațada)',
    'Ferestre cu profil historic (lemn, oțel subțire, termoizo lat)',
    'Tencuieli de var respirabile termoizolante (argilă/silice)',
    'Izolație termică la planșeu peste ultimul nivel',
    'Izolație la planșeu peste subsol/beci',
    'Sisteme de ventilare discretă (fante în tâmplărie istorică)',
    'Panouri PV pe versanți invizibili din spațiul public',
    'Pompe de căldură geotermale (fără modificare fațadă)',
    'Colectori solar-termici pe acoperișuri ascunse',
  ],
  B: [
    'Termoizolație interioară cu materiale respirabile',
    'Ferestre cu profil historic cu geam termoizolant',
    'Tencuieli termoizolante pe bază de var/silicate',
    'Termoizolație acoperiș (interior mansardă)',
    'Izolație planșeu subsol',
    'Panouri PV/solar-termici pe versanți secundari',
    'Pompe de căldură aer-apă (unitate externă în curte)',
    'Recuperatoare de căldură în ventilare (unitate interioară)',
  ],
  C: [
    'Termoizolație interioară sau pe fațade secundare',
    'Înlocuire tâmplărie cu profil similar (lemn/echivalent)',
    'Termoizolație standard pe fațade nestradale cu aviz',
    'Toate intervențiile clasice cu aviz din partea primăriei',
  ],
  D: [
    'Termoizolație exterioară cu aviz (EPS, vată, sistem ETICS)',
    'Înlocuire tâmplărie (cu profil similar ca aspect)',
    'Termoizolație acoperiș și planșee',
    'Toate intervențiile standard cu documentare fotografică',
  ],
};

/**
 * Verifică constrângerile pentru o clădire istorică.
 * @param {Object} building - { lmiClass: 'A'|'B'|'C'|'D', yearBuilt, name }
 * @param {Array}  opaqueElements - elementele de anvelopă opacă
 * @returns {{ isHistoric, lmiClass, constraints, allowedInterventions, forbiddenInterventions, notes }}
 */
export function checkHistoricConstraints(building, opaqueElements = []) {
  const lmiClass = building?.lmiClass || null;
  const isHistoric = !!lmiClass && HISTORIC_BUILDING_CLASSES.includes(lmiClass);

  if (!isHistoric) {
    return {
      isHistoric: false,
      lmiClass: null,
      constraints: [],
      allowedInterventions: [],
      forbiddenInterventions: [],
      notes: [],
    };
  }

  const forbidden = FORBIDDEN_BY_CLASS[lmiClass] || [];
  const allowed   = ALLOWED_BY_CLASS[lmiClass] || [];

  // Constrângeri derivate din elementele de anvelopă
  const constraints = [];
  const hasExternalWalls = opaqueElements.some(e => e.type === 'PE');
  const hasRoof          = opaqueElements.some(e => ['PT','PP','PI'].includes(e.type));

  if (hasExternalWalls) {
    if (['A','B'].includes(lmiClass)) {
      constraints.push('Pereții exteriori nu pot fi termoizolați la exterior — necesară izolație interioară');
    }
    if (lmiClass === 'C') {
      constraints.push('Pereții exteriori pe fațada stradală necesită aviz pentru izolație exterioară');
    }
  }
  if (hasRoof) {
    if (lmiClass === 'A') {
      constraints.push('Acoperișul nu poate fi modificat vizibil — izolarea se face numai interior (la planșeu sau mansardă)');
    }
  }

  const notes = [];
  if (['A','B'].includes(lmiClass)) {
    notes.push('Orice intervenție necesită avizul Ministerului Culturii (MCPN) + Proiect tehnic specialitate');
    notes.push('Documentare fotografică și releveu obligatorii înainte de execuție');
    notes.push('Autorizație de construire cu aviz MCPN — termen avizare 30 zile calendaristice');
  }
  if (lmiClass === 'C') {
    notes.push('Aviz Consiliul Local / Direcția Județeană de Cultură obligatoriu');
  }

  return {
    isHistoric,
    lmiClass,
    constraints,
    allowedInterventions: allowed,
    forbiddenInterventions: forbidden,
    notes,
  };
}

// ───────────────────────────────────────────────────────────────
// CATALOG IZOLAȚII INTERIOARE — Soluții pentru clădiri istorice
// λ = conductivitate termică [W/(m·K)], ρ = densitate [kg/m³]
// ───────────────────────────────────────────────────────────────
export const HISTORIC_INSULATION_CATALOG = [
  {
    id: 'calcium_silicate',
    name: 'Placă calciu-silicat',
    lambda: 0.065,
    rho: 265,
    vapor_mu: 6,    // factor rezistență la difuzie vapori
    cost_m2_per_cm: 28, // RON/m² per cm grosime
    breathable: true,
    maxThickness_mm: 120,
    pros: ['Respirabil (reglare umiditate)', 'Anti-mucegai', 'Nu necesită barieră vapori', 'Compatibil tencuieli var'],
    cons: ['Cost ridicat față de EPS', 'Grosimi limitate (~8-12 cm)', 'Execuție specializată'],
    suitable_for: ['A','B','C','D'],
    notes: 'Recomandat prioritar pentru monumente (clasa A/B). Tolerează umiditate.',
  },
  {
    id: 'aerogel_blanket',
    name: 'Pătură aerogel',
    lambda: 0.015,
    rho: 150,
    vapor_mu: 3,
    cost_m2_per_cm: 110, // RON/m² per cm — foarte scump
    breathable: true,
    maxThickness_mm: 30,
    pros: ['Performanță termică maximă la grosime minimă', 'Flexibil, ușor de montat', 'Respirabil'],
    cons: ['Cost extrem de ridicat', 'Fragil la impact mecanic', 'Disponibilitate limitată în RO'],
    suitable_for: ['A','B'],
    notes: 'Ideal când spațiul interior este critic. Grosime 2-3 cm = EPS 10-15 cm.',
  },
  {
    id: 'vacuum_insulation_panel',
    name: 'Panou izolație în vid (VIP)',
    lambda: 0.008,
    rho: 200,
    vapor_mu: 999, // practic impermeabil
    cost_m2_per_cm: 180,
    breathable: false,
    maxThickness_mm: 40,
    pros: ['Cea mai slabă λ disponibilă', 'Grosime minimă absolută', 'Ideal subsol/planșee'],
    cons: ['Cost foarte mare', 'Nu se taie pe șantier', 'Degradare la perforare', 'Nu respirabil'],
    suitable_for: ['A','B','C'],
    notes: 'Folosit pentru planșee peste subsoluri sau detalii specifice. Evitați pentru pereți cu umiditate.',
  },
  {
    id: 'wood_fiber_board',
    name: 'Placă fibră lemn (Gutex/Steico)',
    lambda: 0.040,
    rho: 160,
    vapor_mu: 5,
    cost_m2_per_cm: 18,
    breathable: true,
    maxThickness_mm: 200,
    pros: ['Respirabil', 'Ecologic, stocare carbon', 'Compatibil tencuieli argilo-var', 'Cost moderat'],
    cons: ['Grosime mai mare față de aerogel', 'Sensibil la umiditate prelungită'],
    suitable_for: ['B','C','D'],
    notes: 'Foarte bun pentru clădiri clasă B-D cu tencuieli tradiționale.',
  },
  {
    id: 'cork_board',
    name: 'Plăci plută expandată',
    lambda: 0.040,
    rho: 120,
    vapor_mu: 10,
    cost_m2_per_cm: 22,
    breathable: true,
    maxThickness_mm: 150,
    pros: ['Natural, durabil 50+ ani', 'Respirabil', 'Bun regulator higrothermal', 'Rezistent mucegai'],
    cons: ['Grosime moderată', 'Disponibilitate limitată în RO'],
    suitable_for: ['A','B','C','D'],
    notes: 'Soluție tradiționala europeana pentru monumente. Durabilitate excepțională.',
  },
  {
    id: 'mineral_render_thermal',
    name: 'Tencuială termoizolantă minerală (Baumit/Knauf)',
    lambda: 0.080,
    rho: 350,
    vapor_mu: 8,
    cost_m2_per_cm: 14,
    breathable: true,
    maxThickness_mm: 60,
    pros: ['Aplicare directă fără structură', 'Respirabil', 'Compatibil fațade istorice', 'Cost redus'],
    cons: ['Performanță termică limitată (U redus modest)', 'Max 5-6 cm grosime practică'],
    suitable_for: ['A','B','C','D'],
    notes: 'Ideal pentru suplimentare mică sau când nu se poate pune structură portantă.',
  },
  {
    id: 'foam_glass_board',
    name: 'Sticlă celulară (Foamglas)',
    lambda: 0.038,
    rho: 120,
    vapor_mu: 999,
    cost_m2_per_cm: 45,
    breathable: false,
    maxThickness_mm: 120,
    pros: ['Impermeabil absolut la vapori și apă', 'Ideal subsol/fundații', 'Durabil', 'Neinflamabil'],
    cons: ['Nu respirabil — necesită gestionare vapori', 'Cost ridicat', 'Fragil la impact'],
    suitable_for: ['A','B','C','D'],
    notes: 'Recomandat exclusiv pentru planșee peste sol/subsol umed. Nu folosiți la pereți interiori fără calcul de condens.',
  },
  {
    id: 'hemp_lime',
    name: 'Beton de cânepă (cânepă + var)',
    lambda: 0.070,
    rho: 420,
    vapor_mu: 4,
    cost_m2_per_cm: 20,
    breathable: true,
    maxThickness_mm: 200,
    pros: ['Extrem de respirabil', 'Ecologic', 'Reglator termic-higrometric natural', 'Anti-mucegai'],
    cons: ['Conductivitate termică mai mare', 'Execuție specializată', 'Uscare lentă (4-8 săptămâni)'],
    suitable_for: ['A','B','C','D'],
    notes: 'Excelent pentru monumente din chirpici/piatră cu umiditate. Tradițional compatibil.',
  },
];

/**
 * Calculează opțiunile de izolație interioară pentru atingerea unui U-țintă.
 * @param {Object} element - { type, layers: [{thickness, lambda}], area }
 * @param {number} targetU  - coeficient U dorit [W/(m²·K)]
 * @param {string} lmiClass - clasa LMI pentru filtrarea soluțiilor compatibile
 * @returns {Array} [{ material, thickness_mm, U_achieved, cost_m2, pros, cons, suitable }]
 */
export function calcHistoricInsulationOptions(element, targetU, lmiClass = 'B') {
  if (!element || !targetU) return [];

  // Rezistența termică actuală a elementului (fără rezistențe suprafață)
  const Rsi = 0.13; // interior [m²·K/W]
  const Rse = 0.04; // exterior
  const R_existing = (element.layers || []).reduce((sum, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000;
    const λ = parseFloat(l.lambda) || 1;
    return sum + (λ > 0 ? d / λ : 0);
  }, 0);

  // Rezistența totală necesară pentru a atinge targetU
  const R_needed_total = 1 / targetU; // = Rsi + R_element + R_insul + Rse
  const R_insul_needed = Math.max(0, R_needed_total - Rsi - R_existing - Rse);

  const options = [];
  const compatible = HISTORIC_INSULATION_CATALOG.filter(m =>
    m.suitable_for.includes(lmiClass)
  );

  compatible.forEach(mat => {
    if (R_insul_needed <= 0) {
      // Elementul deja atinge U țintă
      options.push({
        material: mat.name,
        id: mat.id,
        thickness_mm: 0,
        U_achieved: 1 / (Rsi + R_existing + Rse),
        cost_m2: 0,
        pros: mat.pros,
        cons: mat.cons,
        breathable: mat.breathable,
        notes: 'Elementul atinge deja U-țintă — izolație suplimentară neobligatorie',
        feasible: true,
      });
      return;
    }

    const thickness_m = R_insul_needed * mat.lambda;
    const thickness_mm = Math.ceil(thickness_m * 1000 / 5) * 5; // rotunjit la 5 mm
    const feasible = thickness_mm <= mat.maxThickness_mm;
    const thickness_used = feasible ? thickness_mm : mat.maxThickness_mm;
    const R_achieved = thickness_used / 1000 / mat.lambda;
    const U_achieved = 1 / (Rsi + R_existing + R_achieved + Rse);
    const cost_m2 = Math.round(mat.cost_m2_per_cm * (thickness_used / 10));

    options.push({
      material: mat.name,
      id: mat.id,
      thickness_mm: thickness_used,
      thickness_needed_mm: thickness_mm,
      U_achieved: Math.round(U_achieved * 1000) / 1000,
      U_target: targetU,
      target_met: U_achieved <= targetU * 1.05, // toleranță 5%
      cost_m2,
      cost_total_eur: element.area ? Math.round(cost_m2 * parseFloat(element.area) / 5) : null, // RON→EUR aprox /5
      pros: mat.pros,
      cons: mat.cons,
      breathable: mat.breathable,
      feasible,
      notes: feasible ? mat.notes : `⚠ Grosime necesară (${thickness_mm}mm) depășește max (${mat.maxThickness_mm}mm) — U parțial: ${U_achieved.toFixed(3)} W/(m²·K)`,
    });
  });

  // Sortare: fezabile primele, apoi cost crescător
  return options.sort((a, b) => {
    if (a.feasible !== b.feasible) return b.feasible - a.feasible;
    if (a.target_met !== b.target_met) return b.target_met - a.target_met;
    return a.cost_m2 - b.cost_m2;
  });
}

/**
 * Calculează U-ul actual al unui element dat straturile sale.
 * @param {Object} element - { layers: [{thickness, lambda}] }
 * @param {string} side - 'wall' | 'roof' | 'floor'
 * @returns {number} U [W/(m²·K)]
 */
export function calcUElement(element, side = 'wall') {
  const Rsi = side === 'floor' ? 0.17 : 0.13;
  const Rse = side === 'floor' ? 0.17 : 0.04;
  const R = (element.layers || []).reduce((sum, l) => {
    const d = (parseFloat(l.thickness) || 0) / 1000;
    const λ = parseFloat(l.lambda) || 1;
    return sum + (λ > 0 ? d / λ : 0);
  }, 0);
  return R > 0 ? Math.round(1 / (Rsi + R + Rse) * 1000) / 1000 : 999;
}
