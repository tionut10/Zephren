// ═══════════════════════════════════════════════════════════════
// TIERS — Planuri abonament Zephren v6.1 (apr 2026)
// Sincronizat cu PLAN_FEATURES din src/lib/planGating.js (sursă canonică).
// Acest obiect rămâne pentru backward-compat: cod existent citește
// `tier.maxCerts`, `tier.watermark`, `tier.exportXML`, etc. Nu adăuga
// feature noi aici — toate gating-urile noi trec prin planGating.canAccess().
// ═══════════════════════════════════════════════════════════════

export const TIERS = {
  // ═══ V6.1 PLANS (canonical) ═══
  free: {
    id: "free", label: "Zephren Free", price: 0, priceAn: 0,
    maxProjects: 99, maxCerts: 3,
    multiUser: false, maxUsers: 1,
    watermark: true, watermarkType: "DEMO",
    nzebReport: false, docxExport: true, exportXML: false,
    brandingCPE: false, api: false,
  },
  edu: {
    id: "edu", label: "Zephren Edu", price: 0, priceAn: 0,
    maxProjects: 9999, maxCerts: 100,
    multiUser: false, maxUsers: 1,
    watermark: true, watermarkType: "SCOP DIDACTIC",
    nzebReport: true, docxExport: true, exportXML: false,
    brandingCPE: false, api: false,
  },
  audit: {
    id: "audit", label: "Zephren Audit", price: 199, priceAn: 1990,
    maxProjects: 9999, maxCerts: 8,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: false, api: false,
  },
  pro: {
    id: "pro", label: "Zephren Pro", price: 499, priceAn: 4990,
    maxProjects: 9999, maxCerts: 30,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: false, api: false,
  },
  expert: {
    id: "expert", label: "Zephren Expert", price: 899, priceAn: 8990,
    maxProjects: 9999, maxCerts: 60,
    multiUser: false, maxUsers: 1,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: false, api: false,
  },
  birou: {
    id: "birou", label: "Zephren Birou", price: 1890, priceAn: 18900,
    maxProjects: 9999, maxCerts: 999,
    multiUser: true, maxUsers: 5,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: true, api: true,
  },
  enterprise: {
    id: "enterprise", label: "Zephren Enterprise", price: 4990, priceAn: 49900,
    maxProjects: 9999, maxCerts: 999,
    multiUser: true, maxUsers: 999,
    watermark: false, watermarkType: null,
    nzebReport: true, docxExport: true, exportXML: true,
    brandingCPE: true, api: true,
  },

  // ═══ Backward-compat aliases (v5.x → v6.0) ═══
  // Userii pe planurile vechi rămân funcționali fără migrare DB imediată.
  starter:      { id: "starter",      label: "Starter (legacy → Audit)",   price: 199, priceAn: 1990, maxProjects: 9999, maxCerts: 8,   multiUser: false, maxUsers: 1,   watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: false, api: false },
  standard:     { id: "standard",     label: "Standard (legacy → Pro)",    price: 349, priceAn: 3490, maxProjects: 9999, maxCerts: 30,  multiUser: false, maxUsers: 1,   watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: false, api: false },
  professional: { id: "professional", label: "Professional (legacy → Expert)", price: 799, priceAn: 7990, maxProjects: 9999, maxCerts: 60, multiUser: false, maxUsers: 1, watermark: false, watermarkType: null, nzebReport: true, docxExport: true, exportXML: true, brandingCPE: false, api: false },
  business:     { id: "business",     label: "Business (legacy → Birou)",  price: 749, priceAn: 7490, maxProjects: 9999, maxCerts: 999, multiUser: true,  maxUsers: 10,  watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: true,  api: true  },
  asociatie:    { id: "asociatie",    label: "Asociație (legacy → Birou)", price: 699, priceAn: 6990, maxProjects: 9999, maxCerts: 999, multiUser: true,  maxUsers: 10,  watermark: false, watermarkType: null, nzebReport: true,  docxExport: true,  exportXML: true,  brandingCPE: true,  api: true  },
};
