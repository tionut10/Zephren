// ═══════════════════════════════════════════════════════════════
// NP 048-2000 — Expertizare termică și energetică a clădirilor existente
// Procedură de audit energetic conform Ordinul MLPAT 324/N/2000
// Completat cu cerințele Legii 372/2005 (mod. L.238/2024)
// ═══════════════════════════════════════════════════════════════

/**
 * Etapele auditului energetic conform NP 048-2000
 * Procedura completă cu checklist pentru fiecare etapă
 */
export const AUDIT_STAGES = [
  {
    id: "stage_1",
    name: "Etapa 1 — Investigare preliminară",
    description: "Analiza documentației tehnice și vizita de amplasament",
    steps: [
      { id: "S1_1", label: "Colectare documentație tehnică (proiect, As-Built, relevee)", required: true },
      { id: "S1_2", label: "Identificare an construcție, tipologie structurală, regim înălțime", required: true },
      { id: "S1_3", label: "Identificare suprafață utilă, suprafață anvelopă, volum încălzit", required: true },
      { id: "S1_4", label: "Verificare zone climatice și date meteorologice locale", required: true },
      { id: "S1_5", label: "Identificare destinație clădire și regim de utilizare", required: true },
      { id: "S1_6", label: "Vizită amplasament — stare generală anvelopă", required: true },
      { id: "S1_7", label: "Fotografiere fațade, detalii constructive, defecte vizibile", required: true },
      { id: "S1_8", label: "Identificare surse de energie și racorduri utilități", required: true },
    ],
  },
  {
    id: "stage_2",
    name: "Etapa 2 — Evaluare stare termică anvelopă",
    description: "Determinarea performanței termice a elementelor de anvelopă",
    steps: [
      { id: "S2_1", label: "Identificare compoziție elemente opace (pereți, planșee, acoperiș)", required: true },
      { id: "S2_2", label: "Calcul rezistență termică corectată R' per element", required: true },
      { id: "S2_3", label: "Verificare conformitate R' vs R'min normat (C107)", required: true },
      { id: "S2_4", label: "Identificare tâmplărie exterioară (tip, U, g, stare)", required: true },
      { id: "S2_5", label: "Identificare și evaluare punți termice", required: true },
      { id: "S2_6", label: "Măsurare etanșeitate la aer (n50) — test Blower Door", required: false },
      { id: "S2_7", label: "Termografie în infraroșu (opțional — identificare defecte)", required: false },
      { id: "S2_8", label: "Evaluare risc condensare (Glaser — SR EN ISO 13788)", required: true },
    ],
  },
  {
    id: "stage_3",
    name: "Etapa 3 — Evaluare instalații",
    description: "Analiza sistemelor de încălzire, ACM, ventilare, răcire și iluminat",
    steps: [
      { id: "S3_1", label: "Identificare generatoare de căldură (tip, putere, vechime, randament)", required: true },
      { id: "S3_2", label: "Evaluare distribuție agent termic (izolație conducte, pierderi)", required: true },
      { id: "S3_3", label: "Evaluare corpuri de încălzire (tip, stare, control termostat)", required: true },
      { id: "S3_4", label: "Evaluare sistem ACM (sursă, stocare, recirculare, izolație)", required: true },
      { id: "S3_5", label: "Evaluare ventilare (naturală/mecanică, debite, recuperare)", required: true },
      { id: "S3_6", label: "Evaluare sistem răcire (dacă există)", required: false },
      { id: "S3_7", label: "Evaluare iluminat (tip surse, putere instalată, control)", required: true },
      { id: "S3_8", label: "Evaluare surse regenerabile existente (PV, solar, PC)", required: true },
    ],
  },
  {
    id: "stage_4",
    name: "Etapa 4 — Bilanț energetic",
    description: "Calcul performanță energetică conform Mc 001-2022",
    steps: [
      { id: "S4_1", label: "Calcul necesaruri de energie (încălzire, ACM, răcire, ventilare, iluminat)", required: true },
      { id: "S4_2", label: "Calcul energie finală per serviciu și combustibil", required: true },
      { id: "S4_3", label: "Calcul energie primară totală (fP per SR EN ISO 52000-1/NA:2023)", required: true },
      { id: "S4_4", label: "Calcul emisii CO₂ (fCO2 per combustibil)", required: true },
      { id: "S4_5", label: "Clasare energetică (clasă EP + clasă CO₂)", required: true },
      { id: "S4_6", label: "Verificare nZEB (EP ≤ prag, RER ≥ 30%, RER_onsite ≥ 10%)", required: true },
      { id: "S4_7", label: "Verificare MEPS 2030/2033 (clasă minimă impusă)", required: true },
      { id: "S4_8", label: "Comparare cu stoc clădiri similare (benchmark)", required: false },
    ],
  },
  {
    id: "stage_5",
    name: "Etapa 5 — Măsuri de reabilitare",
    description: "Propunere pachete de măsuri cu analiză cost-beneficiu",
    steps: [
      { id: "S5_1", label: "Propunere măsuri izolație anvelopă opacă (grosimi optime)", required: true },
      { id: "S5_2", label: "Propunere înlocuire/reabilitare tâmplărie", required: true },
      { id: "S5_3", label: "Propunere modernizare sistem încălzire/ACM", required: true },
      { id: "S5_4", label: "Propunere sistem ventilare cu recuperare căldură", required: false },
      { id: "S5_5", label: "Propunere instalare surse regenerabile (PV, solar, PC)", required: true },
      { id: "S5_6", label: "Calcul economii energie per măsură", required: true },
      { id: "S5_7", label: "Estimare costuri investiție per măsură", required: true },
      { id: "S5_8", label: "Calcul termen de recuperare simplu și NPV", required: true },
      { id: "S5_9", label: "Prioritizare măsuri (raport economie/investiție)", required: true },
      { id: "S5_10", label: "Verificare atingere nZEB după reabilitare", required: true },
    ],
  },
  {
    id: "stage_6",
    name: "Etapa 6 — Raport final",
    description: "Întocmire documentație conform cerințelor legale",
    steps: [
      { id: "S6_1", label: "Întocmire raport de audit energetic (conform model MDLPA)", required: true },
      { id: "S6_2", label: "Emitere certificat de performanță energetică (CPE)", required: true },
      { id: "S6_3", label: "Întocmire fișă tehnică clădire", required: true },
      { id: "S6_4", label: "Foaie de parcurs renovare (Renovation Passport) — EPBD Art.12", required: false },
      { id: "S6_5", label: "Semnare și ștampilare auditor energetic atestat MDLPA", required: true },
    ],
  },
];

/**
 * Calculează progresul auditului pe baza checklist-ului
 * @param {Object} completedSteps — { [stepId]: boolean }
 * @returns {{ stageProgress, overall, nextRequired }}
 */
export function calcAuditProgress(completedSteps = {}) {
  const stageProgress = AUDIT_STAGES.map(stage => {
    const total = stage.steps.length;
    const required = stage.steps.filter(s => s.required).length;
    const done = stage.steps.filter(s => completedSteps[s.id]).length;
    const requiredDone = stage.steps.filter(s => s.required && completedSteps[s.id]).length;
    return {
      id: stage.id,
      name: stage.name,
      total, required, done, requiredDone,
      pct: total > 0 ? Math.round(done / total * 100) : 0,
      requiredPct: required > 0 ? Math.round(requiredDone / required * 100) : 0,
      complete: requiredDone === required,
    };
  });

  const totalSteps = AUDIT_STAGES.reduce((s, st) => s + st.steps.length, 0);
  const totalDone = Object.values(completedSteps).filter(Boolean).length;
  const totalRequired = AUDIT_STAGES.reduce((s, st) => s + st.steps.filter(x => x.required).length, 0);
  const totalRequiredDone = AUDIT_STAGES.reduce((s, st) =>
    s + st.steps.filter(x => x.required && completedSteps[x.id]).length, 0);

  // Următorul pas obligatoriu necompletat
  let nextRequired = null;
  for (const stage of AUDIT_STAGES) {
    for (const step of stage.steps) {
      if (step.required && !completedSteps[step.id]) {
        nextRequired = { stageId: stage.id, stageName: stage.name, ...step };
        break;
      }
    }
    if (nextRequired) break;
  }

  return {
    stageProgress,
    overall: {
      totalSteps, totalDone, totalRequired, totalRequiredDone,
      pct: totalSteps > 0 ? Math.round(totalDone / totalSteps * 100) : 0,
      requiredPct: totalRequired > 0 ? Math.round(totalRequiredDone / totalRequired * 100) : 0,
      complete: totalRequiredDone === totalRequired,
    },
    nextRequired,
    verdict: totalRequiredDone === totalRequired
      ? "AUDIT COMPLET — toate etapele obligatorii finalizate"
      : `Progres audit: ${totalRequiredDone}/${totalRequired} pași obligatorii (${Math.round(totalRequiredDone / totalRequired * 100)}%)`,
    method: "NP 048-2000 + Mc 001-2022 + Legea 372/2005 (mod. L.238/2024)",
  };
}

/**
 * Cerințe legale pentru auditorul energetic
 * Legea 372/2005 + L.238/2024 + Ordinul MDLPA 2217/2023
 */
export const AUDITOR_REQUIREMENTS = {
  certification: "Atestat MDLPA — auditor energetic AE Ici sau AE IIci",
  grades: {
    "AE Ici":  "Grad I — toate categoriile de clădiri (rezidențial + nerezidențial): CPE, audit energetic, raport nZEB",
    "AE IIci": "Grad II — exclusiv rezidențial (unifamilial, bloc, apartament): CPE pentru construire/vânzare/închiriere",
  },
  obligations: [
    "Vizită obligatorie la amplasament (NP 048 Etapa 1)",
    "Măsurări in-situ conform metodologiei (NP 048 Etapa 2)",
    "Calcul bilanț energetic conform Mc 001-2022",
    "Propunere pachete de măsuri cu analiză cost-beneficiu",
    "Emitere CPE valabil 10 ani",
    "Încărcare CPE în baza de date MDLPA",
    "Respectare OUG 59/2025 RED III — verificare RER sector clădiri",
  ],
  validity_years: 10,
  database: "Baza de date MDLPA — sistem informatic CPE",
};
