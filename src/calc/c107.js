/**
 * c107.js — Verificare conformitate rezistențe/transmitanțe termice minime
 *
 * Referințe normative:
 *   - C107/2-2005  Normativ privind calculul termotehnic al elementelor de construcție ale clădirilor
 *                  Tabel 2 — Valori maxime ale coeficienților de transfer termic U [W/(m²·K)]
 *   - Mc 001-2022  Metodologie de calcul al performanței energetice a clădirilor
 *                  Tabel 2.5 — Valori U max renovare majoră (≥25% din suprafața anvelopei)
 *
 * Tipuri de elemente (coduri):
 *   PE  — Perete exterior opac
 *   PT  — Planșeu terasă (acoperiș plat)
 *   PP  — Planșeu pod (acoperiș șarpantă)
 *   PL  — Planșeu în contact cu solul (pardoseală peste sol)
 *   PB  — Planșeu în contact cu subsol neîncălzit
 *   FE  — Fereastră / element vitrat exterior
 *   UE  — Ușă exterioară plină
 *
 * Categorii de clădiri:
 *   RI  — Rezidențial individual (case)
 *   RC  — Rezidențial colectiv (blocuri)
 *   AL  — Alte clădiri (culturale, sănătate, sport, etc.)
 *   BI  — Birouri / clădiri administrative
 *   CO  — Comerț / servicii
 *   IN  — Industrial / depozite
 *
 * Exporturi: C107_U_MAX, C107_R_MIN, checkC107Conformity, getC107UMax, getRenovUMax
 */

// ---------------------------------------------------------------------------
// Tabelul C107_U_MAX — U maxim admis [W/(m²·K)]
// Sursă: C107/2-2005, Tabel 2
// ---------------------------------------------------------------------------

/**
 * Coeficienți maximi de transfer termic U [W/(m²·K)]
 * conform C107/2-2005 Tabel 2, organizați pe tip element și categorie clădire.
 *
 * Structură: C107_U_MAX[tip_element][categorie_cladire]
 *
 * Notă: valorile pentru IN (industrial) nu sunt reglementate explicit de C107;
 * se folosesc valorile AL ca referință.
 */
export const C107_U_MAX = {
  /** Perete exterior opac */
  PE: {
    RI: 0.35,  // rezidențial individual — cea mai strictă cerință
    RC: 0.35,  // rezidențial colectiv
    AL: 0.40,  // alte clădiri
    BI: 0.35,  // birouri (cerință strictă, populație densă)
    CO: 0.40,  // comerț
    IN: 0.40,  // industrial (referință AL)
  },

  /** Planșeu terasă (acoperiș plat / acoperiș-terasă) */
  PT: {
    RI: 0.30,
    RC: 0.30,
    AL: 0.35,
    BI: 0.30,
    CO: 0.35,
    IN: 0.35,
  },

  /** Planșeu pod (sub spațiu neîncălzit / șarpantă) */
  PP: {
    RI: 0.30,
    RC: 0.30,
    AL: 0.35,
    BI: 0.30,
    CO: 0.35,
    IN: 0.35,
  },

  /** Planșeu în contact cu solul (pardoseală pe sol) */
  PL: {
    RI: 0.45,
    RC: 0.45,
    AL: 0.50,
    BI: 0.45,
    CO: 0.50,
    IN: 0.50,
  },

  /** Planșeu în contact cu subsol neîncălzit */
  PB: {
    RI: 0.45,
    RC: 0.45,
    AL: 0.50,
    BI: 0.45,
    CO: 0.50,
    IN: 0.50,
  },

  /** Ferestre și elemente vitrate (tâmplărie + geam) */
  FE: {
    RI: 1.30,  // geam dublu Low-E minim
    RC: 1.30,
    AL: 1.70,
    BI: 1.50,
    CO: 1.70,
    IN: 2.20,  // mai permisiv pentru spații industriale
  },

  /** Uși exterioare pline */
  UE: {
    RI: 1.70,
    RC: 1.70,
    AL: 1.70,
    BI: 1.70,
    CO: 1.70,
    IN: 2.00,
  },
};

// ---------------------------------------------------------------------------
// Tabelul C107_R_MIN — R minim admis [m²·K/W]
// Inversul lui C107_U_MAX, calculat automat
// ---------------------------------------------------------------------------

/**
 * Rezistențe termice minime R [m²·K/W] conform C107/2-2005
 * Inversul valorilor din C107_U_MAX (R = 1/U)
 */
export const C107_R_MIN = Object.fromEntries(
  Object.entries(C107_U_MAX).map(([elementType, categories]) => [
    elementType,
    Object.fromEntries(
      Object.entries(categories).map(([cat, uMax]) => [cat, Math.round((1 / uMax) * 100) / 100])
    ),
  ])
);

// ---------------------------------------------------------------------------
// Tabelul valorilor la renovare majoră — Mc 001-2022 Tabel 2.5
// Mai stricte decât C107/2-2005 (cerințe NZEB)
// ---------------------------------------------------------------------------

/**
 * Coeficienți maximi de transfer termic U [W/(m²·K)]
 * pentru renovare majoră (≥25% suprafată anvelopă sau >25% cost clădire)
 * Sursă: Mc 001-2022, Tabel 2.5 (cerințe minime NZEB pentru renovare)
 */
const MC001_U_MAX_RENOV = {
  PE: {
    RI: 0.22,  // renovare = standard mai ridicat
    RC: 0.22,
    AL: 0.25,
    BI: 0.22,
    CO: 0.25,
    IN: 0.30,
  },
  PT: {
    RI: 0.20,
    RC: 0.20,
    AL: 0.22,
    BI: 0.20,
    CO: 0.22,
    IN: 0.25,
  },
  PP: {
    RI: 0.20,
    RC: 0.20,
    AL: 0.22,
    BI: 0.20,
    CO: 0.22,
    IN: 0.25,
  },
  PL: {
    RI: 0.30,
    RC: 0.30,
    AL: 0.35,
    BI: 0.30,
    CO: 0.35,
    IN: 0.40,
  },
  PB: {
    RI: 0.30,
    RC: 0.30,
    AL: 0.35,
    BI: 0.30,
    CO: 0.35,
    IN: 0.40,
  },
  FE: {
    RI: 1.10,  // geam triplu sau dublu performant
    RC: 1.10,
    AL: 1.30,
    BI: 1.20,
    CO: 1.40,
    IN: 1.80,
  },
  UE: {
    RI: 1.30,
    RC: 1.30,
    AL: 1.40,
    BI: 1.30,
    CO: 1.50,
    IN: 1.70,
  },
};

// ---------------------------------------------------------------------------
// Funcții de acces la tabele
// ---------------------------------------------------------------------------

/**
 * Returnează U maxim admis conform C107/2-2005
 * @param {string} elementType - tipul elementului (PE, PT, PP, PL, PB, FE, UE)
 * @param {string} category    - categoria clădirii (RI, RC, AL, BI, CO, IN)
 * @returns {number|null} U maxim [W/(m²·K)] sau null dacă combinația nu există
 */
export function getC107UMax(elementType, category) {
  const typeData = C107_U_MAX[elementType];
  if (!typeData) {
    console.warn(`getC107UMax: tip element necunoscut "${elementType}"`);
    return null;
  }
  const uMax = typeData[category];
  if (uMax === undefined) {
    console.warn(`getC107UMax: categorie necunoscută "${category}" pentru tipul "${elementType}"`);
    return null;
  }
  return uMax;
}

/**
 * Returnează U maxim admis pentru renovare majoră conform Mc 001-2022
 * @param {string} elementType - tipul elementului (PE, PT, PP, PL, PB, FE, UE)
 * @param {string} category    - categoria clădirii (RI, RC, AL, BI, CO, IN)
 * @returns {number|null} U maxim renovare [W/(m²·K)] sau null dacă nu există
 */
export function getRenovUMax(elementType, category) {
  const typeData = MC001_U_MAX_RENOV[elementType];
  if (!typeData) {
    console.warn(`getRenovUMax: tip element necunoscut "${elementType}"`);
    return null;
  }
  const uMax = typeData[category];
  if (uMax === undefined) {
    console.warn(`getRenovUMax: categorie necunoscută "${category}" pentru tipul "${elementType}"`);
    return null;
  }
  return uMax;
}

// ---------------------------------------------------------------------------
// Funcția principală de verificare conformitate
// ---------------------------------------------------------------------------

/**
 * Verifică conformitatea elementelor de anvelopă cu cerințele C107/2-2005
 *
 * @param {Array<Object>} opaqueElements - elemente opace
 *   Fiecare obiect: { name, type, layers }
 *     - name   {string}   denumire element (ex: "Perete Nord")
 *     - type   {string}   cod tip: PE | PT | PP | PL | PB
 *     - layers {Array}    straturi pentru calcul R (transmis la calcOpaqueR)
 *
 * @param {Array<Object>} glazingElements - elemente vitrate
 *   Fiecare obiect: { name, type, u_value }
 *     - name    {string}  denumire element (ex: "Fereastră Sud")
 *     - type    {string}  cod tip: FE | UE
 *     - u_value {number}  U al tâmplăriei/ușii [W/(m²·K)]
 *
 * @param {string} category - categoria clădirii (RI | RC | AL | BI | CO | IN)
 *
 * @param {Function} calcOpaqueR - funcție externă pentru calculul rezistenței termice
 *   Semnătură: calcOpaqueR(layers, type) → number [m²·K/W]
 *   (se importă din modulele existente, ex: din thermal.js sau glaser.js)
 *
 * @returns {{
 *   checks: Array<{
 *     name:       string,
 *     type:       string,
 *     u_actual:   number,
 *     u_max:      number,
 *     r_actual:   number,
 *     r_min:      number,
 *     conform:    boolean,
 *     margin_pct: number,
 *     severity:   string
 *   }>,
 *   nConform:      number,
 *   nNonConform:   number,
 *   totalElements: number,
 *   summary:       string
 * }}
 */
export function checkC107Conformity(opaqueElements = [], glazingElements = [], category, calcOpaqueR) {
  // Mapare categorii extinse → categorii C107/2-2005
  const categoryMap = {
    'RA': 'RC',  // Rezidențial alte tipuri → RC
    'ED': 'AL',  // Educație → Alte clădiri
    'SA': 'AL',  // Sănătate → Alte clădiri
    'HC': 'AL',  // Hotel/turism → Alte clădiri
    'HO_LUX': 'AL',
    'HOSTEL': 'AL',
    'SP': 'AL',  // Sport → Alte clădiri
    'CU': 'AL',  // Cultură → Alte clădiri
    'RE': 'CO',  // Restaurant → Comerț
    'LB': 'AL',  // Laborator → Alte clădiri
    'AS_SOC': 'AL',
  };
  const mappedCategory = categoryMap[category] ?? category;

  // Validare categorie (după mapare)
  const validCategories = ['RI', 'RC', 'AL', 'BI', 'CO', 'IN'];
  if (!validCategories.includes(mappedCategory)) {
    throw new Error(
      `checkC107Conformity: categorie invalidă "${category}". Valori acceptate: ${validCategories.join(', ')}`
    );
  }
  // Folosim categoria mapată pentru restul calculelor
  category = mappedCategory;

  if (typeof calcOpaqueR !== 'function') {
    throw new Error('checkC107Conformity: calcOpaqueR trebuie să fie o funcție');
  }

  const checks = [];

  // --- elemente opace ---
  for (const elem of opaqueElements) {
    const { name, type, layers } = elem;

    // Calculează R cu funcția externă
    let r_actual;
    try {
      r_actual = calcOpaqueR(layers, type);
    } catch (err) {
      console.error(`checkC107Conformity: eroare la calculul R pentru "${name}":`, err.message);
      r_actual = null;
    }

    const u_actual = r_actual !== null && r_actual > 0 ? 1 / r_actual : null;
    const u_max    = getC107UMax(type, category);
    const r_min    = u_max !== null ? 1 / u_max : null;

    checks.push(
      buildCheck({ name, type, u_actual, u_max, r_actual, r_min })
    );
  }

  // --- elemente vitrate ---
  for (const elem of glazingElements) {
    const { name, type, u_value } = elem;

    const u_actual = u_value;
    const r_actual = u_value > 0 ? 1 / u_value : null;
    const u_max    = getC107UMax(type, category);
    const r_min    = u_max !== null ? 1 / u_max : null;

    checks.push(
      buildCheck({ name, type, u_actual, u_max, r_actual, r_min })
    );
  }

  // --- statistici ---
  const nConform    = checks.filter(c => c.conform).length;
  const nNonConform = checks.filter(c => !c.conform).length;
  const totalElements = checks.length;

  // --- verdict final ---
  const summary = buildSummary(nConform, nNonConform, totalElements, checks);

  return {
    checks,
    nConform,
    nNonConform,
    totalElements,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Funcții interne
// ---------------------------------------------------------------------------

/**
 * Construiește un obiect de verificare per element
 * @param {{ name, type, u_actual, u_max, r_actual, r_min }} p
 * @returns {Object} check
 */
function buildCheck({ name, type, u_actual, u_max, r_actual, r_min }) {
  // Formatare la 3 zecimale
  const uAct = u_actual !== null ? Math.round(u_actual * 1000) / 1000 : null;
  const rAct = r_actual !== null ? Math.round(r_actual * 100) / 100   : null;

  // Conformitate: U actual ≤ U max
  let conform    = false;
  let margin_pct = null;
  let severity   = 'eroare-calcul';

  if (uAct !== null && u_max !== null) {
    conform    = uAct <= u_max;
    // marja procentuală față de limita maximă:
    //   pozitiv = conformă cu x% rezervă
    //   negativ = depășire cu x%
    margin_pct = Math.round(((u_max - uAct) / u_max) * 1000) / 10; // o zecimală

    if (conform) {
      severity = margin_pct >= 20
        ? 'bine'        // rezervă confortabilă
        : 'acceptabil'; // la limită
    } else {
      const depasire = Math.abs(margin_pct);
      if (depasire <= 10) {
        severity = 'neconform-minor';    // depășire ≤ 10%
      } else if (depasire <= 30) {
        severity = 'neconform-moderat';  // depășire 10–30%
      } else {
        severity = 'neconform-major';    // depășire > 30%
      }
    }
  }

  return {
    name,
    type,
    u_actual:   uAct,
    u_max,
    r_actual:   rAct,
    r_min,
    conform,
    margin_pct,
    severity,
  };
}

/**
 * Construiește string-ul de verdict final
 * @param {number} nConform
 * @param {number} nNonConform
 * @param {number} totalElements
 * @param {Array}  checks
 * @returns {string}
 */
function buildSummary(nConform, nNonConform, totalElements, checks) {
  if (totalElements === 0) {
    return 'Niciun element de verificat nu a fost furnizat.';
  }

  if (nNonConform === 0) {
    return `Toate cele ${totalElements} elemente sunt conforme cu C107/2-2005. Anvelopa clădirii îndeplinește cerințele minime de izolare termică.`;
  }

  // Identifică elementele neconforme
  const neconformeList = checks
    .filter(c => !c.conform && c.u_actual !== null)
    .map(c => {
      const dep = c.margin_pct !== null ? Math.abs(c.margin_pct) : '?';
      return `${c.name} (${c.type}: U=${c.u_actual} > U_max=${c.u_max} W/(m²·K), depășire ${dep}%)`;
    });

  const listStr = neconformeList.join('; ');

  if (nConform === 0) {
    return `NECONFORM — Niciun element nu satisface cerințele C107/2-2005. Elemente neconforme (${nNonConform}/${totalElements}): ${listStr}.`;
  }

  return `PARȚIAL NECONFORM — ${nNonConform} din ${totalElements} elemente nu satisfac C107/2-2005. Elemente neconforme: ${listStr}. Sunt necesare măsuri de reabilitare termică.`;
}
