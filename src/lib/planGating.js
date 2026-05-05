/**
 * planGating.js — v6.2 (27 apr 2026)
 *
 * Feature gating per plan abonament Zephren.
 *
 * STRUCTURĂ 8 NIVELURI:
 *   Free → Edu → Audit (AE IIci 199) → Pro (AE Ici 499) ⭐ → Expert → Birou → Enterprise
 *
 * REBRAND v6.2 (Ord. MDLPA 348/2026, MO 292/14.IV.2026):
 *   - Plan `audit` (cheie internă păstrată) → label „Zephren AE IIci" — auditori grad
 *     profesional II civile, restrânși legal la CPE rezidențial (locuințe unifamiliale,
 *     blocuri și apartamente din blocurile de locuințe). Conform Art. 6 alin. (2).
 *   - Plan `pro` (cheie internă păstrată) → label „Zephren AE Ici" — auditori grad
 *     profesional I civile, scop complet: CPE toate clădirile + Audit energetic +
 *     Raport conformare nZEB + Pașaport renovare. Conform Art. 6 alin. (1).
 *   - Câmpuri noi: gradMdlpaRequired, nzebReport, auditEnergetic,
 *     buildingCategoryRestricted (legal limit AE IIci la rezidențial).
 *
 * SPLIT STEP 1-7 vs STEP 8:
 *   - Step 1-7 (CPE + Anexe complete) = AE Ici 499 RON ← cel mai ales
 *   - Step 8 (18 module avansate)     = Expert 899 RON
 *
 * BACS/SRI/MEPS DUAL MODE:
 *   - Versiune simplă (obligatorie EPBD) = în Step 6/7 inclus în AE Ici
 *   - Versiune detaliată (optimizator)   = în Step 8 inclus în Expert
 *
 * AI PACK inclus în AE Ici+ (OCR facturi, OCR CPE, chat import, AI assistant)
 * BIM PACK inclus în Expert+ (IFC import, parser STEP nativ)
 *
 * EDU PLAN: GRATIS pe perioada studiilor (DOAR studenți și doctoranzi cu
 * dovadă valabilă) cu watermark obligatoriu „SCOP DIDACTIC" + XML MDLPA blocat.
 * Pentru universități, centre formare profesională, institute cercetare și
 * alte organizații: cerere separată de colaborare la edu@zephren.ro
 * (NU plan Edu automat).
 *
 * BACKWARD COMPAT:
 *   - Cheile interne `audit` și `pro` rămân neschimbate — utilizatorii v6.0/v6.1
 *     migrează transparent la noile labels fără efort.
 *   - LEGACY_PLAN_ALIAS: starter→audit, standard→pro, professional→expert etc.
 *
 * Sursă completă: memorie sprint_v62_mdlpa_348_2026.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// FLAG GLOBAL — Pașaport Renovare EPBD 2024/1275 Art. 12 + Anexa VIII.
//
// Sprint P0-A (6 mai 2026): REACTIVAT pentru pregătirea termenului de transpunere
// națională (29 mai 2026). Documentul are caracter PREVIEW (watermark obligatoriu
// pe DOCX/PDF) și NU produce efecte juridice în RO până la actul național.
//
// Sursă completă context: memory/sprint_p0_a_pasaport_epbd_06may2026.md
// ─────────────────────────────────────────────────────────────────────────────
export const RENOVATION_PASSPORT_ENABLED = true;

export const PLAN_FEATURES = {
  // ─────────────────────────── FREE ───────────────────────────
  free: {
    // Navigare pași wizard (1-8)
    maxStep:            7,           // Free: Steps 1-7 accesibili, Step 8 blocat
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
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  null,        // demo: fără validare grad
    auditEnergetic:     false,       // raport audit energetic Mc 001-2022
    nzebReport:         false,       // raport conformare nZEB (Art. 6 lit. c)
    buildingCategoryRestricted: null, // null = toate categoriile permise (free e demo)
    // ── Sprint v6.3 — MDLPA Ord. 348/2026 Art. 6 — gating fin scope/categorie ──
    scopCpeAllowed:     "all",       // demo: toate scope-urile pentru testare
    publicBuildingAllowed: true,     // demo: poate testa și public
    blocIntregScopRestricted: false, // RC vânzare/închiriere permis (demo)
    apartmentScopRestricted: false,  // BC construire permis (demo)
    // Step gating
    step7Audit:         false,       // Audit energetic complet BLOCAT
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
    maxStep:            8,           // Edu: toți cei 8 pași accesibili
    maxProjects:        9999,
    maxCertsPerMonth:   100,         // hard cap anti-abuse
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     0,
    cpeWatermark:       true,        // OBLIGATORIU „SCOP DIDACTIC"
    maxUsers:           1,
    multiUser:          false,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  null,        // edu: fără atestare obligatorie (watermark didactic)
    auditEnergetic:     true,
    nzebReport:         true,
    buildingCategoryRestricted: null, // edu: toate clădirile pentru învățare
    // ── Sprint v6.3 — scop didactic, fără restricții legale (watermark obligatoriu) ──
    scopCpeAllowed:     "all",       // edu: poate practica orice scope (cu watermark)
    publicBuildingAllowed: true,     // edu: clădiri publice didactic
    blocIntregScopRestricted: false,
    apartmentScopRestricted: false,
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

  // ─────────────────────────── AUDIT — „Zephren AE IIci" (199 RON) ───────────────────────────
  // REBRAND v6.2 (27 apr 2026): Plan pentru auditori grad profesional II civile.
  // Conform Art. 6 alin. (2) din Ord. MDLPA 348/2026: AE IIci elaborează CPE
  // EXCLUSIV pentru locuințe unifamiliale, blocuri de locuințe și apartamente
  // din blocurile de locuințe care se vând sau se închiriază. NU pot face audit
  // energetic (Art. 6 alin. 1 lit. b) și NU pot întocmi raport conformare nZEB
  // (Art. 6 alin. 1 lit. c) — acestea sunt rezervate exclusiv AE Ici.
  audit: {
    maxStep:            6,           // AE IIci: Steps 1-6, Step 7 și 8 blocate (Art. 6 alin. 2)
    maxProjects:        9999,
    maxCertsPerMonth:   30,          // v7.0: standardizat 30 + 6 burst (36 total)
    maxAuditsPerMonth:  0,           // v7.0: AE IIci NU poate face audit (Art.6 alin.2)
    maxAuditsBurst:     0,
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 37, toCertCount: 50, pricePerCert: 39 },
      { fromCertCount: 51, toCertCount: 65, pricePerCert: 69 },
      { fromCertCount: 66, toCertCount: null, pricePerCert: 99 },
    ],
    burstPercent:       20,          // 30 * 1.20 = 36 burst total
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  "IIci",      // auditor trebuie să aibă atestat AE IIci
    auditEnergetic:     false,       // BLOCAT — Art. 6 alin. (2): IIci NU face audit
    nzebReport:         false,       // BLOCAT — Art. 6 alin. (2): IIci NU face nZEB
    buildingCategoryRestricted: ["RI", "RC", "RA", "BC"], // doar rezidențial
    // ── Sprint v6.3 — Art. 6 alin. (2) STRICT scope per regulament ──
    // Permis: locuințe care SE CONSTRUIESC, SE VÂND, SE ÎNCHIRIAZĂ.
    // INTERZIS: renovare energetică (lit. a), schimbare destinație, clădiri publice.
    scopCpeAllowed:     ["construire", "receptie", "vanzare", "inchiriere"],
    publicBuildingAllowed: false,    // case de protocol, locuințe sociale publice → AE Ici
    blocIntregScopRestricted: true,  // RC (bloc) doar la construire/recepție, NU vânzare bloc întreg
    apartmentScopRestricted: true,   // BC (apartament) doar la vânzare/închiriere
    step7Audit:         false,       // BLOCAT — diferențiator vs AE Ici
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
    // v7.0 — AI Pack inclus pe toate planurile plătite
    aiPack:             true,
    aiAssistant:        true,
    ocrInvoice:         true,
    ocrCPE:             true,
    chatImport:         true,
    aiDocumentImport:   true,
    bimPack:            false,
    ifcImport:          false,
    cloudSync:          true,
    cloudRetentionDays: 9999,        // v7.0: nelimitat pe toate planurile plătite
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
    cpeAlertSystem:     true,        // v7.0: alerts pe toate plătite
    climateImportEPW:   false,
    ancpiCadastru:      true,
    supportEmailHours:  48,
    accountManager:     false,
    slaGuaranteed:      false,
    trainingHours:      0,
    isEdu:              false,
    eduValidationDate:  null,
  },

  // ─────────────────────────── PRO — „Zephren AE Ici" (499 RON) ⭐ POPULAR ───────────────────────────
  // REBRAND v6.2 (27 apr 2026): Plan pentru auditori grad profesional I civile.
  // Conform Art. 6 alin. (1) din Ord. MDLPA 348/2026: AE Ici elaborează CPE
  // pentru TOATE categoriile de clădiri (rezidențial + nerezidențial + public +
  // industrial), realizează audit energetic și raport audit Mc 001-2022, și
  // întocmește raportul de conformare nZEB pentru clădiri în faza de proiectare.
  // Vechime profesională cerută MDLPA: minimum 5 ani.
  pro: {
    maxStep:            7,           // AE Ici: Steps 1-7, Step 8 blocat
    maxProjects:        9999,
    maxCertsPerMonth:   30,          // v7.0: 30 + 6 burst (36 total)
    maxAuditsPerMonth:  2,           // v7.0: 2 audituri/lună incluse + 1 burst
    maxAuditsBurst:     1,
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 37, toCertCount: 50, pricePerCert: 39 },
      { fromCertCount: 51, toCertCount: 65, pricePerCert: 69 },
      { fromCertCount: 66, toCertCount: null, pricePerCert: 99 },
    ],
    overageAuditTiers: [             // v7.0: trepte audit overage
      { fromAuditCount: 4, toAuditCount: 5, pricePerAudit: 999 },
      { fromAuditCount: 6, toAuditCount: 7, pricePerAudit: 1499 },
      { fromAuditCount: 8, toAuditCount: null, pricePerAudit: 1999 },
    ],
    burstPercent:       20,
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  "Ici",       // auditor trebuie să aibă atestat AE Ici (5 ani exp.)
    auditEnergetic:     true,        // ✅ Art. 6 alin. (1) lit. b
    nzebReport:         true,        // ✅ Art. 6 alin. (1) lit. c
    buildingCategoryRestricted: null, // toate categoriile permise
    // ── Sprint v6.3 — Art. 6 alin. (1) — scop COMPLET ──
    scopCpeAllowed:     "all",       // toate scope-urile (inclusiv renovare lit. a)
    publicBuildingAllowed: true,     // clădiri publice permise
    blocIntregScopRestricted: false, // bloc întreg vânzare/închiriere permis
    apartmentScopRestricted: false,  // apartament în orice scop
    step7Audit:         true,        // ✅ DIFERENȚIATOR vs AE IIci
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
    maxStep:            8,           // Expert: toți cei 8 pași accesibili
    maxProjects:        9999,
    maxCertsPerMonth:   30,          // v7.0: standardizat 30 + 6 burst (36 total)
    maxAuditsPerMonth:  4,           // v7.0: 4 audituri/lună incluse + 2 burst
    maxAuditsBurst:     2,
    overageEnabled:     true,
    overageTiers: [
      { fromCertCount: 37, toCertCount: 50, pricePerCert: 39 },
      { fromCertCount: 51, toCertCount: 65, pricePerCert: 69 },
      { fromCertCount: 66, toCertCount: null, pricePerCert: 99 },
    ],
    overageAuditTiers: [             // v7.0: trepte audit overage
      { fromAuditCount: 7, toAuditCount: 9, pricePerAudit: 999 },
      { fromAuditCount: 10, toAuditCount: 12, pricePerAudit: 1499 },
      { fromAuditCount: 13, toAuditCount: null, pricePerAudit: 1999 },
    ],
    burstPercent:       20,
    rolloverMonths:     3,
    cpeWatermark:       false,
    maxUsers:           1,
    multiUser:          false,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  "Ici",       // Expert necesită grad I (extinde AE Ici)
    auditEnergetic:     true,
    nzebReport:         true,
    buildingCategoryRestricted: null,
    // ── Sprint v6.3 — Expert moștenește scope COMPLET de la AE Ici ──
    scopCpeAllowed:     "all",
    publicBuildingAllowed: true,
    blocIntregScopRestricted: false,
    apartmentScopRestricted: false,
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
    maxStep:            8,           // Birou: toți cei 8 pași accesibili
    maxProjects:        9999,
    maxCertsPerMonth:   9999,        // NELIMITAT
    maxAuditsPerMonth:  9999,        // v7.0: audituri NELIMITATE
    maxAuditsBurst:     0,
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     6,
    cpeWatermark:       false,
    maxUsers:           5,           // 2-5 useri
    multiUser:          true,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  "Ici",       // Birou: echipă cu cel puțin un AE Ici
    auditEnergetic:     true,
    nzebReport:         true,
    buildingCategoryRestricted: null,
    // ── Sprint v6.3 — Birou: scope complet, dar fiecare user limitat de gradul lui real ──
    scopCpeAllowed:     "all",       // limitare per-user în runtime (canEmitForBuilding)
    publicBuildingAllowed: true,
    blocIntregScopRestricted: false,
    apartmentScopRestricted: false,
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
    maxStep:            8,           // Enterprise: toți cei 8 pași accesibili
    maxProjects:        9999,
    maxCertsPerMonth:   9999,        // NELIMITAT
    maxAuditsPerMonth:  9999,        // v7.0: audituri NELIMITATE
    maxAuditsBurst:     0,
    overageEnabled:     false,
    burstPercent:       0,
    rolloverMonths:     12,
    cpeWatermark:       false,
    maxUsers:           999,         // 6-100+ useri
    multiUser:          true,
    // ── Sprint v6.2 — MDLPA Ord. 348/2026 ──
    gradMdlpaRequired:  "Ici",       // Enterprise: organizație cu auditori AE Ici
    auditEnergetic:     true,
    nzebReport:         true,
    buildingCategoryRestricted: null,
    // ── Sprint v6.3 — Enterprise: scope complet, limitare per-user în runtime ──
    scopCpeAllowed:     "all",
    publicBuildingAllowed: true,
    blocIntregScopRestricted: false,
    apartmentScopRestricted: false,
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
// Mapare nume vechi (v5.x + v6.2 rebrand) → nume canonice pentru migrare smooth.
// Utilizatorii existenți rămân funcționali fără migrare DB imediat.
const LEGACY_PLAN_ALIAS = {
  starter:      "audit",   // Starter 199 → Audit 199
  standard:     "pro",     // Standard 499 (vag) → Pro 499 (cu AI Pack inclus)
  business:     "birou",   // Business 749/u → Birou 1.890 flat
  asociatie:    "birou",   // Asociație → Birou (sau Enterprise dacă >5u)
  professional: "expert",  // Professional 799 → Expert 899
  // Sprint v6.2 (27 apr 2026) — alias-uri brand AE Ici/IIci pentru noul rebrand
  // conform Ord. MDLPA 348/2026. Cheile interne `audit` și `pro` rămân stabile,
  // dar utilizatorii pot intra cu noul slug brandat și ajung la același plan.
  aeiici:       "audit",   // „AE IIci" (case-insensitive) → audit (199 RON, rezidențial)
  aeici:        "pro",     // „AE Ici"  (case-insensitive) → pro   (499 RON, complet)
  ae_iici:      "audit",
  ae_ici:       "pro",
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
  // S30A·A6 — bypass plan-gating când demo mode e activ (utilizatorul a încărcat
  // un model M1-M5 din butonul „Mostre exemplu"). Cerere user: demo-urile trebuie
  // să poată parcurge TOATE etapele (Step 1-8) inclusiv funcționalități Pro/Expert
  // pentru evaluarea completă a calculatorului. Nu produce CPE oficiale.
  if (typeof window !== "undefined") {
    const sess = (typeof sessionStorage !== "undefined") ? sessionStorage.getItem("zephren_demo_mode") : null;
    if (window.__demoModeActive || sess === "1") return true;
  }
  // Sprint P0-A — Pașaport Renovare reactivat în mod PREVIEW EPBD 2024.
  // Gating-ul revine la nivel de plan (PLAN_FEATURES.pasaportBasic / pasaportDetailed).
  // Watermark juridic obligatoriu se aplică pe DOCX/PDF la export (passport-docx.js + passport-export.js).
  if (!RENOVATION_PASSPORT_ENABLED && (feature === "pasaportBasic" || feature === "pasaportDetailed")) return false;
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

// ═══════════════════════════════════════════════════════════════════════
// Sprint v6.2 — Helpers MDLPA Ord. 348/2026
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returnează gradul MDLPA cerut pentru un plan: „Ici" / „IIci" / null.
 * Util pentru afișare label brand (AE Ici / AE IIci) și validare auditor.
 *
 * @param {string|null|undefined} plan
 * @returns {string|null}
 */
export function getRequiredMdlpaGrade(plan) {
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  return tier?.gradMdlpaRequired ?? null;
}

/**
 * Verifică dacă un plan permite o anumită categorie de clădire.
 *
 * Conform Art. 6 alin. (2) din Ord. MDLPA 348/2026, AE IIci certifică
 * EXCLUSIV: locuințe unifamiliale (RI), blocuri (RC/RA) și apartamente
 * din blocurile de locuințe (BC). Toate celelalte categorii (birouri,
 * spitale, școli, hoteluri, comerț, industrial, AL etc.) sunt rezervate
 * AE Ici (Art. 6 alin. 1 lit. a).
 *
 * @param {string|null|undefined} plan
 * @param {string|null|undefined} buildingCategory - cod Mc 001-2022 (RI, BIR, SP etc.)
 * @returns {boolean} true dacă planul permite categoria
 */
export function canCertifyBuildingCategory(plan, buildingCategory) {
  if (!buildingCategory) return true;
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  if (!tier) return false;
  const restricted = tier.buildingCategoryRestricted;
  // null sau array gol → toate categoriile permise
  if (!restricted || !Array.isArray(restricted) || restricted.length === 0) return true;
  return restricted.includes(buildingCategory);
}

/**
 * Returnează lista categoriilor permise pentru un plan, sau null dacă fără restricții.
 *
 * @param {string|null|undefined} plan
 * @returns {string[]|null}
 */
export function getAllowedBuildingCategories(plan) {
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  return tier?.buildingCategoryRestricted ?? null;
}

/**
 * Returnează numărul maxim de pas accesibil pentru un plan (1-8).
 * Folosit pentru gating navigare sidebar wizard.
 *
 * | Plan        | maxStep | Pași accesibili       |
 * |-------------|---------|-----------------------|
 * | free        |    7    | 1-7  (Step 8 blocat)  |
 * | edu         |    8    | 1-8  (toți)           |
 * | audit/IIci  |    6    | 1-6  (7+8 blocate)    |
 * | pro/Ici     |    7    | 1-7  (Step 8 blocat)  |
 * | expert      |    8    | 1-8  (toți)           |
 * | birou       |    8    | 1-8  (toți)           |
 * | enterprise  |    8    | 1-8  (toți)           |
 *
 * @param {string|null|undefined} plan
 * @returns {number} 1-8
 */
export function getMaxStep(plan) {
  // Demo mode: toți pașii accesibili
  if (typeof window !== "undefined") {
    const sess = (typeof sessionStorage !== "undefined") ? sessionStorage.getItem("zephren_demo_mode") : null;
    if (window.__demoModeActive || sess === "1") return 8;
  }
  const tier = PLAN_FEATURES[resolvePlan(plan)];
  return tier?.maxStep ?? 8;
}
