/**
 * planGating.js — v6.0 (25 apr 2026)
 *
 * Feature gating per plan abonament Zephren.
 *
 * STRUCTURĂ 8 NIVELURI:
 *   Free → Edu → Audit → Pro ⭐ → Expert → Birou → Enterprise
 *
 * SPLIT STEP 1-7 vs STEP 8:
 *   - Step 1-7 (CPE + Anexe complete) = Pro 499 RON ← cel mai ales
 *   - Step 8 (18 module avansate)     = Expert 899 RON
 *
 * BACS/SRI/MEPS DUAL MODE:
 *   - Versiune simplă (obligatorie EPBD) = în Step 6/7 inclus în Pro
 *   - Versiune detaliată (optimizator)   = în Step 8 inclus în Expert
 *
 * AI PACK inclus în Pro+ (OCR facturi, OCR CPE, chat import, AI assistant)
 * BIM PACK inclus în Expert+ (IFC import, parser STEP nativ)
 *
 * EDU PLAN: GRATIS pe perioada formării (studenți + trainee + profesori +
 * cercetători) cu watermark obligatoriu „SCOP DIDACTIC" + XML MDLPA blocat.
 *
 * Sursă completă: memorie pricing_strategy.md v6.0
 */

export const PLAN_FEATURES = {
  // ─────────────────────────── FREE ───────────────────────────
  free: {
    // CPE + limite
    maxProjects:        99,
    maxCertsPerMonth:   3,           // hard cap
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     0,
    cpeWatermark:       true,        // „DEMO"
    // Useri
    maxUsers:           1,
    multiUser:          false,
    // Step gating
    step7Audit:         false,       // Audit financiar BLOCAT
    step8Advanced:      false,
    // Export oficial
    exportDOCX:         true,        // cu watermark
    exportXML:          false,
    submitMDLPA:        false,
    auditorStamp:       false,
    // BACS/SRI/MEPS
    bacsSimple:         true,
    bacsDetailed:       false,
    sriAuto:            true,
    sriDetailed:        false,
    mepsBinar:          true,
    mepsOptimizer:      false,
    pasaportBasic:      false,
    pasaportDetailed:   false,
    // AI Pack
    aiPack:             false,
    aiAssistant:        false,
    ocrInvoice:         false,
    ocrCPE:             false,
    chatImport:         false,
    aiDocumentImport:   false,
    // BIM Pack
    bimPack:            false,
    ifcImport:          false,
    // Cloud & colaborare
    cloudSync:          false,
    cloudRetentionDays: 30,
    shareReadOnly:      false,
    teamDashboard:      false,
    whiteLabel:         false,
    apiAccess:          false,
    calendarTeam:       false,
    // Avansate
    gwpReport:          false,
    portfolioMulti:     false,
    monteCarloEP:       false,
    pasivhaus:          false,
    pmvPpd:             false,
    en12831Rooms:       false,
    thermovision:       false,
    urbanHeatIsland:    false,
    historicBuildings:  false,
    mixedUseBuildings:  false,
    consumReconciliere: false,
    consumoTracker:     false,
    acoustic:           false,
    nightVentilation:   false,
    shadingDynamic:     false,
    coolingHourly:      false,
    // Lifecycle CPE
    cpeTracker:         false,
    cpeAlertSystem:     false,
    // Climă & date
    climateImportEPW:   false,
    ancpiCadastru:      false,
    // Suport
    supportEmailHours:  null,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    // EDU specific
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── EDU (gratis cu dovadă) ───────────────────────────
  edu: {
    maxProjects:        9999,
    maxCertsPerMonth:   100,         // hard cap anti-abuse
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     0,
    cpeWatermark:       true,        // OBLIGATORIU „SCOP DIDACTIC"
    maxUsers:           1,
    multiUser:          false,
    step7Audit:         true,
    step8Advanced:      true,        // toate Step 8
    exportDOCX:         true,
    exportXML:          false,       // BLOCAT tehnic (nu doar UI)
    submitMDLPA:        false,       // BLOCAT
    auditorStamp:       false,       // BLOCAT (n-are atestat)
    bacsSimple:         true,
    bacsDetailed:       true,
    sriAuto:            true,
    sriDetailed:        true,
    mepsBinar:          true,
    mepsOptimizer:      true,
    pasaportBasic:      true,
    pasaportDetailed:   true,
    aiPack:             true,
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            true,
    ifcImport:          true,
    cloudSync:          true,
    cloudRetentionDays: 365,
    shareReadOnly:      true,
    teamDashboard:      false,
    whiteLabel:         false,
    apiAccess:          false,
    calendarTeam:       false,
    gwpReport:          true,
    portfolioMulti:     true,
    monteCarloEP:       true,
    pasivhaus:          true,
    pmvPpd:             true,
    en12831Rooms:       true,
    thermovision:       true,
    urbanHeatIsland:    true,
    historicBuildings:  true,
    mixedUseBuildings:  true,
    consumReconciliere: true,
    consumoTracker:     true,
    acoustic:           true,
    nightVentilation:   true,
    shadingDynamic:     true,
    coolingHourly:      true,
    cpeTracker:         true,
    cpeAlertSystem:     true,
    climateImportEPW:   true,
    ancpiCadastru:      true,
    supportEmailHours:  72,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    isEdu:              true,
    eduValidationDate:  null,        // se completează la activare
  },

  // ─────────────────────────── AUDIT (199 RON) ───────────────────────────
  audit: {
    maxProjects:        9999,
    maxCertsPerMonth:   8,           // 8 incluse + 2 burst gratis
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 11, toCertCount: 15, pricePerCert: 49 },
      { fromCertCount: 16, toCertCount: 20, pricePerCert: 79 },
      { fromCertCount: 21, toCertCount: null, pricePerCert: 99 },
    ],
    burstPercent:       25,          // ~2 CPE peste 8 = burst gratis (10 total)
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    step7Audit:         false,       // BLOCAT — diferențiator vs Pro
    step8Advanced:      false,
    exportDOCX:         true,
    exportXML:          true,
    submitMDLPA:        true,
    auditorStamp:       true,
    bacsSimple:         true,
    bacsDetailed:       false,
    sriAuto:            true,
    sriDetailed:        false,
    mepsBinar:          true,
    mepsOptimizer:      false,
    pasaportBasic:      false,
    pasaportDetailed:   false,
    aiPack:             false,
    aiAssistant:        false,
    ocrInvoice:         false,
    ocrCPE:             false,
    chatImport:         false,
    aiDocumentImport:   false,
    bimPack:            false,
    ifcImport:          false,
    cloudSync:          true,
    cloudRetentionDays: 180,         // 6 luni
    shareReadOnly:      true,
    teamDashboard:      false,
    whiteLabel:         false,
    apiAccess:          false,
    calendarTeam:       false,
    gwpReport:          false,
    portfolioMulti:     false,
    monteCarloEP:       false,
    pasivhaus:          false,
    pmvPpd:             false,
    en12831Rooms:       false,
    thermovision:       false,
    urbanHeatIsland:    false,
    historicBuildings:  false,
    mixedUseBuildings:  false,
    consumReconciliere: false,
    consumoTracker:     false,
    acoustic:           false,
    nightVentilation:   false,
    shadingDynamic:     false,
    coolingHourly:      false,
    cpeTracker:         true,
    cpeAlertSystem:     false,
    climateImportEPW:   false,
    ancpiCadastru:      true,
    supportEmailHours:  48,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── PRO (499 RON) ⭐ POPULAR ───────────────────────────
  pro: {
    maxProjects:        9999,
    maxCertsPerMonth:   30,          // 30 + 6 burst gratis = 36 total
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 37, toCertCount: 50, pricePerCert: 49 },
      { fromCertCount: 51, toCertCount: 65, pricePerCert: 79 },
      { fromCertCount: 66, toCertCount: null, pricePerCert: 99 },
    ],
    burstPercent:       20,
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    step7Audit:         true,        // ✅ DIFERENȚIATOR vs Audit
    step8Advanced:      false,       // BLOCAT — Step 8 doar Expert+
    exportDOCX:         true,
    exportXML:          true,
    submitMDLPA:        true,
    auditorStamp:       true,
    bacsSimple:         true,
    bacsDetailed:       false,
    sriAuto:            true,
    sriDetailed:        false,
    mepsBinar:          true,
    mepsOptimizer:      false,
    pasaportBasic:      true,        // ✅ Pașaport basic în Pro
    pasaportDetailed:   false,
    aiPack:             true,        // ✅ AI Pack INCLUS
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            false,
    ifcImport:          false,
    cloudSync:          true,
    cloudRetentionDays: 9999,        // nelimitat
    shareReadOnly:      true,
    teamDashboard:      false,
    whiteLabel:         false,
    apiAccess:          false,
    calendarTeam:       false,
    gwpReport:          true,
    portfolioMulti:     false,
    monteCarloEP:       false,
    pasivhaus:          false,
    pmvPpd:             false,
    en12831Rooms:       false,
    thermovision:       false,
    urbanHeatIsland:    false,
    historicBuildings:  false,
    mixedUseBuildings:  false,
    consumReconciliere: false,
    consumoTracker:     false,
    acoustic:           false,
    nightVentilation:   false,
    shadingDynamic:     false,
    coolingHourly:      false,
    cpeTracker:         true,
    cpeAlertSystem:     true,
    climateImportEPW:   true,
    ancpiCadastru:      true,
    supportEmailHours:  24,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── EXPERT (899 RON) ───────────────────────────
  expert: {
    maxProjects:        9999,
    maxCertsPerMonth:   60,          // 60 + 12 burst gratis = 72 total
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 73, toCertCount: 100, pricePerCert: 39 },
      { fromCertCount: 101, toCertCount: 130, pricePerCert: 69 },
      { fromCertCount: 131, toCertCount: null, pricePerCert: 99 },
    ],
    burstPercent:       20,
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    step7Audit:         true,
    step8Advanced:      true,        // ✅ Step 8 COMPLET
    exportDOCX:         true,
    exportXML:          true,
    submitMDLPA:        true,
    auditorStamp:       true,
    bacsSimple:         true,
    bacsDetailed:       true,        // ✅ BACS calculator detaliat 200 factori
    sriAuto:            true,
    sriDetailed:        true,        // ✅ SRI complet 42 servicii
    mepsBinar:          true,
    mepsOptimizer:      true,        // ✅ MEPS optimizator + roadmap 2050
    pasaportBasic:      true,
    pasaportDetailed:   true,        // ✅ Pașaport detaliat LCC + multi-fază
    aiPack:             true,
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            true,        // ✅ BIM Pack INCLUS
    ifcImport:          true,
    cloudSync:          true,
    cloudRetentionDays: 9999,
    shareReadOnly:      true,
    teamDashboard:      false,
    whiteLabel:         false,
    apiAccess:          false,
    calendarTeam:       false,
    gwpReport:          true,
    portfolioMulti:     true,
    monteCarloEP:       true,
    pasivhaus:          true,
    pmvPpd:             true,
    en12831Rooms:       true,
    thermovision:       true,
    urbanHeatIsland:    true,
    historicBuildings:  true,
    mixedUseBuildings:  true,
    consumReconciliere: true,
    consumoTracker:     true,
    acoustic:           true,
    nightVentilation:   true,
    shadingDynamic:     true,
    coolingHourly:      true,
    cpeTracker:         true,
    cpeAlertSystem:     true,
    climateImportEPW:   true,
    ancpiCadastru:      true,
    supportEmailHours:  24,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── BIROU (1.890 RON flat) ───────────────────────────
  birou: {
    maxProjects:        9999,
    maxCertsPerMonth:   9999,        // NELIMITAT
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     6,
    cpeWatermark:       false,
    maxUsers:           5,           // 2-5 useri
    multiUser:          true,
    step7Audit:         true,
    step8Advanced:      true,
    exportDOCX:         true,
    exportXML:          true,
    submitMDLPA:        true,
    auditorStamp:       true,
    bacsSimple:         true,
    bacsDetailed:       true,
    sriAuto:            true,
    sriDetailed:        true,
    mepsBinar:          true,
    mepsOptimizer:      true,
    pasaportBasic:      true,
    pasaportDetailed:   true,
    aiPack:             true,
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            true,
    ifcImport:          true,
    cloudSync:          true,
    cloudRetentionDays: 9999,
    shareReadOnly:      true,
    teamDashboard:      true,        // ✅ Multi-user dashboard
    whiteLabel:         true,        // ✅ White-label complet
    apiAccess:          true,        // ✅ API CRM/ERP
    calendarTeam:       true,        // ✅ Calendar audit echipă
    gwpReport:          true,
    portfolioMulti:     true,
    monteCarloEP:       true,
    pasivhaus:          true,
    pmvPpd:             true,
    en12831Rooms:       true,
    thermovision:       true,
    urbanHeatIsland:    true,
    historicBuildings:  true,
    mixedUseBuildings:  true,
    consumReconciliere: true,
    consumoTracker:     true,
    acoustic:           true,
    nightVentilation:   true,
    shadingDynamic:     true,
    coolingHourly:      true,
    cpeTracker:         true,
    cpeAlertSystem:     true,
    climateImportEPW:   true,
    ancpiCadastru:      true,
    supportEmailHours:  12,
    accountManager:     true,        // ✅ Manager cont jr
    slaGuaranteed:      false,
    trainingHours:      2,           // 2h training inclus
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── ENTERPRISE (de la 4.990 RON) ───────────────────────────
  enterprise: {
    maxProjects:        9999,
    maxCertsPerMonth:   9999,        // NELIMITAT
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     12,
    cpeWatermark:       false,
    maxUsers:           999,         // 6-100+ useri
    multiUser:          true,
    step7Audit:         true,
    step8Advanced:      true,
    exportDOCX:         true,
    exportXML:          true,
    submitMDLPA:        true,
    auditorStamp:       true,
    bacsSimple:         true,
    bacsDetailed:       true,
    sriAuto:            true,
    sriDetailed:        true,
    mepsBinar:          true,
    mepsOptimizer:      true,
    pasaportBasic:      true,
    pasaportDetailed:   true,
    aiPack:             true,
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            true,
    ifcImport:          true,
    cloudSync:          true,
    cloudRetentionDays: 9999,
    shareReadOnly:      true,
    teamDashboard:      true,
    whiteLabel:         true,
    apiAccess:          true,
    calendarTeam:       true,
    gwpReport:          true,
    portfolioMulti:     true,
    monteCarloEP:       true,
    pasivhaus:          true,
    pmvPpd:             true,
    en12831Rooms:       true,
    thermovision:       true,
    urbanHeatIsland:    true,
    historicBuildings:  true,
    mixedUseBuildings:  true,
    consumReconciliere: true,
    consumoTracker:     true,
    acoustic:           true,
    nightVentilation:   true,
    shadingDynamic:     true,
    coolingHourly:      true,
    cpeTracker:         true,
    cpeAlertSystem:     true,
    climateImportEPW:   true,
    ancpiCadastru:      true,
    supportEmailHours:  4,
    accountManager:     true,        // Manager cont senior
    slaGuaranteed:      true,        // ✅ SLA 99.9%
    trainingHours:      8,           // 8h training inclus
    isEdu:              false,
    eduValidationDate:  null,
  },
};

// ─────────────────────────── BACKWARD COMPAT ───────────────────────────
// Mapare nume vechi (v5.x) → nume noi v6.0 pentru migrare smooth.
// Utilizatorii existenți rămân funcționali fără migrare DB imediat.
const LEGACY_PLAN_ALIAS = {
  starter:    "audit",   // Starter 199 → Audit 199
  standard:   "pro",     // Standard 499 (vag) → Pro 499 (cu AI Pack inclus)
  business:   "birou",   // Business 749/u → Birou 1.890 flat
  asociatie:  "birou",   // Asociație → Birou (sau Enterprise dacă >5u)
  professional: "expert", // Professional 799 → Expert 899
};

/**
 * Rezolvă numele plan cu suport backward-compat.
 * @param {string|null|undefined} plan
 * @returns {string} canonical plan name (free/edu/audit/pro/expert/birou/enterprise)
 */
export function resolvePlan(plan) {
  if (!plan) return "free";
  const key = String(plan).toLowerCase();
  if (PLAN_FEATURES[key]) return key;
  if (LEGACY_PLAN_ALIAS[key]) return LEGACY_PLAN_ALIAS[key];
  return "free";
}

/**
 * Verifică dacă un plan oferă acces la o funcționalitate.
 * Suportă: bool, număr (>0 = true), string (non-empty = true).
 *
 * @param {string|null|undefined} plan
 * @param {string} feature - cheie din PLAN_FEATURES[plan]
 * @returns {boolean}
 */
export function canAccess(plan, feature) {
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  if (!tier) return false;
  const val = tier[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number")  return val > 0;
  if (typeof val === "string")  return val.length > 0;
  return !!val;
}

/**
 * Returnează limita numerică pentru o funcționalitate cantitativă.
 * Util pentru maxCertsPerMonth, maxUsers, trainingHours etc.
 *
 * @param {string|null|undefined} plan
 * @param {string} feature
 * @returns {number}
 */
export function getLimit(plan, feature) {
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  if (!tier) return 0;
  const val = tier[feature];
  return typeof val === "number" ? val : 0;
}

/**
 * Calculează prețul overage pentru un CPE specific (al N-lea din lună).
 * Returnează 0 dacă plan nu are overage activ sau CPE e în cap.
 *
 * @param {string} plan
 * @param {number} certCount - numărul total CPE consumate (incl. burst)
 * @returns {number} preț RON pentru CPE-ul al `certCount`-lea
 */
export function getOverageCost(plan, certCount) {
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  if (!tier?.overageEnabled || !Array.isArray(tier.overageTiers)) return 0;
  const burstLimit = Math.floor(tier.maxCertsPerMonth * (1 + tier.burstPercent / 100));
  if (certCount <= burstLimit) return 0; // în burst gratis
  for (const t of tier.overageTiers) {
    if (certCount >= t.fromCertCount && (t.toCertCount === null || certCount <= t.toCertCount)) {
      return t.pricePerCert;
    }
  }
  return 0;
}

/**
 * Verifică dacă un user EDU are dovadă validă.
 * Returnează `false` dacă plan nu e edu sau dovada a expirat.
 *
 * @param {object} user - user object cu plan + eduValidationDate
 * @returns {boolean}
 */
export function isEduValid(user) {
  if (!user || resolvePlan(user.plan) !== "edu") return false;
  if (!user.eduValidationDate) return false;
  const validUntil = new Date(user.eduValidationDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 an de la activare
  return validUntil > new Date();
}

// Pentru compat cu codul existent: alias `maxCerts` → `maxCertsPerMonth`
// (vechiul cod folosea `maxCerts`)
for (const key of Object.keys(PLAN_FEATURES)) {
  if (PLAN_FEATURES[key].maxCertsPerMonth !== undefined) {
    PLAN_FEATURES[key].maxCerts = PLAN_FEATURES[key].maxCertsPerMonth;
  }
}
