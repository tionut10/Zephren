// ═══════════════════════════════════════════════════════════════
// TIERS — Planuri abonament Zephren v6.2 (27 apr 2026)
// Sincronizat cu PLAN_FEATURES din src/lib/planGating.js (sursă canonică).
// Acest obiect rămâne pentru backward-compat: cod existent citește
// `tier.maxCerts`, `tier.watermark`, `tier.exportXML`, etc. Nu adăuga
// feature noi aici — toate gating-urile noi trec prin planGating.canAccess().
//
// REBRAND v6.2 (Ord. MDLPA 348/2026 — MO 292/14.IV.2026):
//   - audit → label „Zephren AE IIci" (auditori grad II civile, doar rezidențial)
//   - pro   → label „Zephren AE Ici"  (auditori grad I civile, scop complet)
//   Cheile interne `audit` și `pro` rămân stabile pentru backward-compat.
//   Subtitle MDLPA afișat sub label pe carduri pentru claritate profesională.
// ═══════════════════════════════════════════════════════════════

export const TIERS = {
  // ═══ V6.2 PLANS (canonical) ═══
  free: {
    id: "free", label: "Zephren Free", subtitle: "Demo cu watermark", price: 0, priceAn: 0,
    maxProjects: 99, maxCerts: 3,
    multiUser: false, maxUsers: 1,
    watermark: true, watermarkType: "DEMO",
    nzebReport: false, docxExport: true, exportXML: false,
    brandingCPE: false, api: false,
    mdlpaGrade: null,
  },
  edu: {
    id: "edu", label: "Zephren Edu", subtitle: "Studenți + doctoranzi", price: 0, priceAn: 0,
    maxProjects: 9999, maxCerts: 100,
    multiUser: false, maxUsers: 1,
    watermark: true, watermarkType: "SCOP DIDACTIC",
    nzebReport: true, docxExport: true, exportXML: false,
    brandingCPE: false, api: false,
    mdlpaGrade: null,
  },
  audit: {
    id: "audit", label: "Zephren AE IIci",
    subtitle: "Pentru auditori AE IIci · grad II civile · CPE locuințe (Art. 6 alin. 2)",
    price: 199, priceAn: 1990,
    maxProjects: 9999, maxCerts: 8,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: false, docxExport: true, exportXML: true, // Art. 6 alin. (2): IIci NU face nZEB
    brandingCPE: false, api: false,
    mdlpaGrade: "IIci",
    legalScope: "Locuințe unifamiliale + blocuri locuințe + apartamente (Art. 6 alin. 2 Ord. 348/2026)",
  },
  pro: {
    id: "pro", label: "Zephren AE Ici",
    subtitle: "Pentru auditori AE Ici · grad I civile · CPE + audit + nZEB toate clădirile (Art. 6 alin. 1)",
    price: 499, priceAn: 4990,
    maxProjects: 9999, maxCerts: 30,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: false, api: false,
    mdlpaGrade: "Ici",
    legalScope: "Toate categoriile de clădiri + audit energetic + raport nZEB (Art. 6 alin. 1 Ord. 348/2026)",
  },
  expert: {
    id: "expert", label: "Zephren Expert",
    subtitle: "Pentru auditori AE Ici senior + consultanți · scop complet + 18 module avansate Step 8",
    price: 899, priceAn: 8990,
    maxProjects: 9999, maxCerts: 60,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: false, api: false,
    mdlpaGrade: "Ici",
  },
  birou: {
    id: "birou", label: "Zephren Birou",
    subtitle: "Pentru birouri 2-5 auditori (mix AE Ici + AE IIci) · CPE NELIMITAT · preț FIX per birou",
    price: 1890, priceAn: 18900,
    maxProjects: 9999, maxCerts: 999,
    multiUser: true, maxUsers: 5,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: true, api: true,
    mdlpaGrade: "Ici",
  },
  enterprise: {
    id: "enterprise", label: "Zephren Enterprise",
    subtitle: "Pentru organizații 6-100+ auditori (toate gradele) · SLA 99.9% + INCERC validation",
    price: 4990, priceAn: 49900,
    maxProjects: 9999, maxCerts: 999,
    multiUser: true, maxUsers: 999,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: true, api: true,
    mdlpaGrade: "Ici",
  },

  // ═══ Backward-compat aliases (v5.x → v6.0) ═══
  // Userii pe planurile vechi rămân funcționali fără migrare DB imediată.
  starter:      { id: "starter",      label: "Starter (legacy → Audit)",   price: 199, priceAn: 1990, maxProjects: 9999, maxCerts: 8,   multiUser: false, maxUsers: 1,   watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: false, api: false },
  standard:     { id: "standard",     label: "Standard (legacy → Pro)",    price: 349, priceAn: 3490, maxProjects: 9999, maxCerts: 30,  multiUser: false, maxUsers: 1,   watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: false, api: false },
  professional: { id: "professional", label: "Professional (legacy → Expert)", price: 799, priceAn: 7990, maxProjects: 9999, maxCerts: 60, multiUser: false, maxUsers: 1, watermark: false, watermarkType: null, nzebReport: true, docxExport: true, exportXML: true, brandingCPE: false, api: false },
  business:     { id: "business",     label: "Business (legacy → Birou)",  price: 749, priceAn: 7490, maxProjects: 9999, maxCerts: 999, multiUser: true,  maxUsers: 10,  watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: true,  api: true  },
  asociatie:    { id: "asociatie",    label: "Asociație (legacy → Birou)", price: 699, priceAn: 6990, maxProjects: 9999, maxCerts: 999, multiUser: true,  maxUsers: 10,  watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: true,  api: true  },
};
