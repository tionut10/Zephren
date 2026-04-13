// ═══════════════════════════════════════════════════════════════
// P 130-2025 — URMĂRIREA COMPORTĂRII ÎN EXPLOATARE A CONSTRUCȚIILOR
// Ordinul nr. 770/2025 MDLPA, publicat MOf 19.06.2025
// Înlocuiește P 130-1999 + abrogă MP 031-03
// ═══════════════════════════════════════════════════════════════
// Scop: Monitorizare tehnică pe întreaga durată de viață a clădirii
//        (de la recepție la post-utilizare)
// Aplicabilitate: Toate construcțiile civile, industriale, agricole
//        (exceptie: lucrări hidrotehnice, construcții rurale simplificate)
// ═══════════════════════════════════════════════════════════════

// ── CATEGORII DE IMPORTANȚĂ (influențează frecvența monitorizării) ──
export const IMPORTANCE_CATEGORIES = {
  A: { label: "Importanță excepțională",  interval_months: 3,  example: "Spitale, adăposturi protecție civilă, clădiri > 10 etaje" },
  B: { label: "Importanță deosebită",     interval_months: 6,  example: "Școli, creșe, sălile de spectacol, clădiri > 5 etaje" },
  C: { label: "Importanță normală",       interval_months: 12, example: "Locuințe colective, birouri, magazine" },
  D: { label: "Importanță redusă",        interval_months: 24, example: "Locuințe individuale, anexe gospodărești" },
};

// ── TIPURI MONITORIZARE ────────────────────────────────────────
export const MONITORING_TYPES = {
  current: {
    label: "Monitorizare curentă",
    description: "Observații periodice, înregistrare parametri tehnici cu instrumente simple",
    responsible: "Proprietar / Administrator",
    frequency: "Conform categoriei de importanță",
  },
  special: {
    label: "Monitorizare specială",
    description: "Măsurători detaliate și analize când se identifică riscuri sau deteriorări",
    responsible: "Expert tehnic atestat / Proiectant",
    trigger: "Deteriorări vizibile, depășiri praguri, evenimente seismice/climatice",
  },
};

// ── PARAMETRI MONITORIZAȚI ─────────────────────────────────────
export const MONITORED_PARAMETERS = [
  {
    id: "deformation",
    label: "Deformații / tasări",
    unit: "mm",
    thresholds: { warning: 10, alert: 25, critical: 50 },
    sensors: ["senzor deplasare LVDT", "nivelment topografic", "inclinometru"],
    frequency: "lunar → trimestrial",
  },
  {
    id: "vibration",
    label: "Vibrații",
    unit: "mm/s (PPV)",
    thresholds: { warning: 3, alert: 8, critical: 15 },
    sensors: ["accelerometru", "sismograf", "geofon"],
    frequency: "continuă → eveniment seismic",
  },
  {
    id: "temperature",
    label: "Temperatură",
    unit: "°C",
    thresholds: { warning: null, alert: null, critical: null }, // depinde de material
    sensors: ["termocuplu", "termistor", "senzor IR"],
    frequency: "zilnică → sezonieră",
  },
  {
    id: "humidity",
    label: "Umiditate",
    unit: "%RH / % greutate",
    thresholds: { warning: 65, alert: 80, critical: 95 },
    sensors: ["higrometru", "senzor capacitiv", "TDR"],
    frequency: "săptămânală → lunară",
  },
  {
    id: "crack_width",
    label: "Deschidere fisuri",
    unit: "mm",
    thresholds: { warning: 0.3, alert: 1.0, critical: 3.0 },
    sensors: ["fisurometru mecanic", "senzor crack", "fotogrammetrie"],
    frequency: "lunară → trimestrială",
  },
  {
    id: "gas_emission",
    label: "Emisii gaze",
    unit: "ppm",
    thresholds: { warning: 50, alert: 200, critical: 500 },
    sensors: ["detector CO", "detector radon", "senzor VOC"],
    frequency: "continuă (senzori automat)",
  },
  {
    id: "corrosion",
    label: "Coroziune armătură",
    unit: "µm/an",
    thresholds: { warning: 5, alert: 20, critical: 50 },
    sensors: ["potențial electrochimic", "rezistivitate beton", "ultrasunet"],
    frequency: "anuală → bianuală",
  },
  {
    id: "pressure",
    label: "Presiune (instalații, fundații)",
    unit: "kPa",
    thresholds: { warning: null, alert: null, critical: null },
    sensors: ["manometru", "traductor presiune", "piezometru"],
    frequency: "zilnică → lunară",
  },
];

// ── DOCUMENTE OBLIGATORII P 130-2025 ──────────────────────────
export const REQUIRED_DOCUMENTS = [
  {
    id: "fisa_tehnica",
    label: "Fișa tehnică a construcției",
    description: "Document centralizator cu date tehnice, proiect, execuție, intervenții",
    responsible: "Proprietar / Administrator",
    mandatory: true,
  },
  {
    id: "jurnal_intamplari",
    label: "Jurnalul de întâmplări",
    description: "Înregistrarea cronologică a evenimentelor semnificative (seisme, inundații, defecțiuni)",
    responsible: "Proprietar / Administrator",
    mandatory: true,
  },
  {
    id: "raport_monitorizare",
    label: "Raportul de monitorizare",
    description: "Rezultate inspecții periodice, măsurători, interpretare, recomandări",
    responsible: "Expert tehnic / Inginer structurist",
    mandatory: true,
  },
  {
    id: "program_monitorizare",
    label: "Programul de monitorizare",
    description: "Plan anual cu parametri, frecvențe, metode, responsabili",
    responsible: "Proiectant / Expert tehnic",
    mandatory: true,
  },
  {
    id: "cartea_tehnica",
    label: "Cartea tehnică a construcției",
    description: "Dosarul complet al construcției (proiect, recepție, procesele verbale)",
    responsible: "Investitor → Proprietar",
    mandatory: true,
  },
];

// ── CHECKLIST INSPECȚIE CURENTĂ ────────────────────────────────
export const INSPECTION_CHECKLIST = [
  // STRUCTURĂ
  { id: "str_01", group: "Structură", item: "Fisuri vizibile în pereți structurali",   severity: "critical" },
  { id: "str_02", group: "Structură", item: "Deformații vizibile grinzi/stâlpi",       severity: "critical" },
  { id: "str_03", group: "Structură", item: "Tasări diferențiale (vizuale)",            severity: "critical" },
  { id: "str_04", group: "Structură", item: "Coroziune vizibilă armătură",             severity: "major" },
  { id: "str_05", group: "Structură", item: "Segregare / exfoliere beton",             severity: "major" },

  // ANVELOPĂ
  { id: "env_01", group: "Anvelopă", item: "Fisuri tencuială exterioară",              severity: "minor" },
  { id: "env_02", group: "Anvelopă", item: "Despărțire termosistem",                   severity: "major" },
  { id: "env_03", group: "Anvelopă", item: "Infiltrații apă la acoperiș / terasă",     severity: "major" },
  { id: "env_04", group: "Anvelopă", item: "Condensare / mucegai interior",            severity: "major" },
  { id: "env_05", group: "Anvelopă", item: "Degradare hidroizolație fundație",          severity: "major" },
  { id: "env_06", group: "Anvelopă", item: "Tâmplărie degradată (etanșeitate redusă)", severity: "minor" },

  // INSTALAȚII
  { id: "ins_01", group: "Instalații", item: "Scurgeri apă/gaz vizibile",              severity: "critical" },
  { id: "ins_02", group: "Instalații", item: "Coroziune conducte încălzire",            severity: "major" },
  { id: "ins_03", group: "Instalații", item: "Funcționare cazan / centrală termică",    severity: "major" },
  { id: "ins_04", group: "Instalații", item: "Sistem ventilare funcțional",             severity: "minor" },
  { id: "ins_05", group: "Instalații", item: "Tablou electric — protecții funcționale", severity: "critical" },
  { id: "ins_06", group: "Instalații", item: "Instalație gaz — verificare etanșeitate", severity: "critical" },

  // SIGURANȚĂ ÎN EXPLOATARE
  { id: "saf_01", group: "Siguranță", item: "Balustrade / parapete stabile",           severity: "critical" },
  { id: "saf_02", group: "Siguranță", item: "Trepte / pardoseală antiderapantă",       severity: "major" },
  { id: "saf_03", group: "Siguranță", item: "Iluminat de siguranță funcțional",        severity: "major" },
  { id: "saf_04", group: "Siguranță", item: "Căi de evacuare libere",                  severity: "critical" },
  { id: "saf_05", group: "Siguranță", item: "Sistem detecție și stingere incendiu",    severity: "critical" },
];

/**
 * Calcul program de monitorizare P 130-2025
 * @param {object} building — Date clădire
 * @returns {object} Program monitorizare personalizat
 */
export function generateMonitoringProgram(building) {
  const {
    category = "C",      // categoria de importanță (A/B/C/D)
    yearBuilt = 2000,
    floors = 4,
    structure = "Cadre beton armat",
    Au = 500,
    hasBasement = false,
    seismicZone = "III",  // zona seismică România
    // Senzori existenți
    existingSensors = [], // ["temperature", "humidity", ...]
    // Inspecții efectuate
    lastInspectionDate = null,
    completedChecks = {},  // { str_01: true, str_02: false, ... }
  } = building;

  const importance = IMPORTANCE_CATEGORIES[category] || IMPORTANCE_CATEGORIES.C;
  const buildingAge = new Date().getFullYear() - (yearBuilt || 2000);

  // ── 1. PARAMETRI RELEVANȚI ───────────────────────────────
  // Selectare parametri în funcție de tipul construcției
  const relevantParams = MONITORED_PARAMETERS.filter(p => {
    if (p.id === "vibration" && ["I", "II", "III"].includes(seismicZone)) return true;
    if (p.id === "humidity" && hasBasement) return true;
    if (p.id === "corrosion" && buildingAge > 30) return true;
    if (p.id === "gas_emission") return true; // mereu relevant (CO, radon)
    if (["deformation", "temperature", "crack_width"].includes(p.id)) return true;
    if (p.id === "pressure") return false; // doar dacă specific
    return false;
  });

  // ── 2. FRECVENȚĂ AJUSTATĂ ────────────────────────────────
  // Factor vârstă: clădiri vechi → monitorizare mai frecventă
  const ageFactor = buildingAge > 50 ? 0.5 : buildingAge > 30 ? 0.75 : 1.0;
  const interval = Math.round(importance.interval_months * ageFactor);

  // ── 3. SENZORI RECOMANDAȚI ───────────────────────────────
  const recommendedSensors = relevantParams
    .filter(p => !existingSensors.includes(p.id))
    .map(p => ({
      parameter: p.label,
      sensors: p.sensors,
      priority: p.thresholds.critical !== null ? "ridicată" : "medie",
    }));

  // ── 4. EVALUARE CHECKLIST ────────────────────────────────
  const checklistResults = INSPECTION_CHECKLIST.map(item => {
    const completed = completedChecks[item.id] !== undefined;
    const hasIssue = completedChecks[item.id] === false;
    return {
      ...item,
      status: !completed ? "neverificat" : hasIssue ? "problemă" : "ok",
    };
  });
  const issues = checklistResults.filter(c => c.status === "problemă");
  const unchecked = checklistResults.filter(c => c.status === "neverificat");
  const criticalIssues = issues.filter(c => c.severity === "critical");

  // ── 5. DOCUMENTE NECESARE ────────────────────────────────
  const documentsStatus = REQUIRED_DOCUMENTS.map(doc => ({
    ...doc,
    status: building[`has_${doc.id}`] ? "complet" : "lipsă",
  }));
  const missingDocs = documentsStatus.filter(d => d.status === "lipsă");

  // ── 6. RECOMANDARE MONITORIZARE SPECIALĂ ─────────────────
  const needsSpecialMonitoring = criticalIssues.length > 0 || buildingAge > 50 ||
    (seismicZone === "I" && buildingAge > 20);

  // ── 7. SCOR CONFORMITATE ─────────────────────────────────
  const totalPoints = INSPECTION_CHECKLIST.length + REQUIRED_DOCUMENTS.length;
  const okPoints = checklistResults.filter(c => c.status === "ok").length +
                   documentsStatus.filter(d => d.status === "complet").length;
  const conformityScore = Math.round((okPoints / totalPoints) * 100);

  return {
    // Context
    importanceCategory: category,
    importanceLabel: importance.label,
    buildingAge,
    interval_months: interval,

    // Parametri monitorizare
    parameters: relevantParams.map(p => ({
      id: p.id, label: p.label, unit: p.unit,
      thresholds: p.thresholds,
      frequency: p.frequency,
    })),

    // Senzori
    existingSensors,
    recommendedSensors,
    sensorCoverage_pct: Math.round((existingSensors.length / relevantParams.length) * 100),

    // Checklist inspecție
    checklist: checklistResults,
    issueCount: issues.length,
    criticalIssueCount: criticalIssues.length,
    uncheckedCount: unchecked.length,

    // Documente
    documents: documentsStatus,
    missingDocCount: missingDocs.length,

    // Monitorizare specială
    needsSpecialMonitoring,
    specialMonitoringReason: needsSpecialMonitoring
      ? (criticalIssues.length > 0 ? "Probleme critice identificate" :
         buildingAge > 50 ? "Clădire cu vârstă > 50 ani" :
         "Zonă seismică + vârstă > 20 ani")
      : null,

    // Scor
    conformityScore,

    // Verdict
    verdict: conformityScore >= 80
      ? "BINE MONITORIZAT — program de monitorizare funcțional"
      : conformityScore >= 50
        ? `PARȚIAL — ${unchecked.length} verificări restante, ${missingDocs.length} documente lipsă`
        : `INSUFICIENT — necesită program de monitorizare complet P 130-2025`,
    color: conformityScore >= 80 ? "#22c55e" : conformityScore >= 50 ? "#eab308" : "#ef4444",

    // Calendar
    nextInspection: lastInspectionDate
      ? new Date(new Date(lastInspectionDate).getTime() + interval * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      : "IMEDIAT — nicio inspecție anterioară înregistrată",

    reference: "P 130-2025 (Ordinul nr. 770/2025 MDLPA) — înlocuiește P 130-1999",
  };
}

/**
 * Evaluare urgentă post-eveniment (seism, inundație, explozie, incendiu)
 * P 130-2025 Cap.6 — Monitorizare specială
 * @param {string} eventType — Tipul evenimentului
 * @param {object} building — Date clădire
 * @returns {object} Protocol evaluare de urgență
 */
export function emergencyAssessmentProtocol(eventType, building = {}) {
  const protocols = {
    seism: {
      label: "Post-seism",
      immediateActions: [
        "Evacuare imediată dacă structura prezintă semne vizibile de avarie",
        "Inspecție vizuală rapidă (faza 1): fisuri, deformații, căderi de tencuială",
        "Verificare instalații gaz — închidere robinet principal",
        "Fotografiere / documentare deteriorări vizibile",
      ],
      technicalAssessment: [
        "Expertiză tehnică de urgență (inginer structurist autorizat)",
        "Clasificare avarie: verde (utilizabil) / galben (restricționat) / roșu (interzis)",
        "Măsurare deviere verticală stâlpi/pereți (max 1/300 din înălțime)",
        "Verificare lățime fisuri noi (> 1mm = avertizare, > 3mm = pericol)",
      ],
      sensors: ["accelerometru", "fisurometru", "inclinometru"],
      deadline_hours: 24,
    },
    inundatie: {
      label: "Post-inundație",
      immediateActions: [
        "Deconectare instalații electrice din zonele afectate",
        "Pompare apă acumulată în subsol/parter",
        "Documentare cota maximă apă (semne pe pereți)",
      ],
      technicalAssessment: [
        "Evaluare degradare fundații și sol de fundare",
        "Verificare umiditate pereți (minim 2 săptămâni după retragere apă)",
        "Evaluare integritate hidroizolație subterană",
        "Verificare instalații electrice înainte de repunere sub tensiune",
      ],
      sensors: ["higrometru", "senzor nivel apă", "termocuplu"],
      deadline_hours: 48,
    },
    incendiu: {
      label: "Post-incendiu",
      immediateActions: [
        "Verificare stabilitate elemente structurale expuse la foc",
        "Interdicție acces în zone cu risc de prăbușire",
        "Evaluare integritate plafoane / planșee",
      ],
      technicalAssessment: [
        "Evaluare rezistență reziduală beton (testare cu sclerometru)",
        "Verificare deformații permanente elemente metalice",
        "Evaluare necesitate consolidare / demolare parțială",
      ],
      sensors: ["termocuplu", "sclerometru", "ultrasunet beton"],
      deadline_hours: 72,
    },
    explozie: {
      label: "Post-explozie",
      immediateActions: [
        "Evacuare completă + perimetru de siguranță",
        "Verificare gaz — sigilare alimentare",
        "Apelare ISU + verificare stabilitate generală",
      ],
      technicalAssessment: [
        "Expertiză de urgență cu prioritate maximă",
        "Evaluare integritate structurală completă",
        "Verificare instalații pe tot parcursul clădirii",
      ],
      sensors: ["detector gaz", "accelerometru", "inclinometru"],
      deadline_hours: 12,
    },
  };

  const protocol = protocols[eventType] || protocols.seism;

  return {
    eventType,
    ...protocol,
    building: {
      category: building.category || "C",
      age: new Date().getFullYear() - (building.yearBuilt || 2000),
      floors: building.floors || 4,
    },
    reference: "P 130-2025 Cap.6 — Monitorizare specială post-eveniment",
  };
}
