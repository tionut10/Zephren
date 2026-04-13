// ═══════════════════════════════════════════════════════════════
// TIERS — Planuri de abonament Zephren
// Prețuri RON; sursa: SCENARII_MONETIZARE_ZEPHREN v1.0, apr. 2026
// ═══════════════════════════════════════════════════════════════

export const TIERS = {
  free:       { id:"free",       label:"Free",       price:0,    priceAn:0,     maxProjects:99,  maxCerts:3,   multiUser:false, maxUsers:1,   watermark:true,  nzebReport:false, docxExport:false, exportXML:false, brandingCPE:false, api:false },
  starter:    { id:"starter",    label:"Starter",    price:299,  priceAn:1799,  maxProjects:999, maxCerts:999, multiUser:false, maxUsers:1,   watermark:false, nzebReport:false, docxExport:true,  exportXML:false, brandingCPE:false, api:false },
  standard:   { id:"standard",   label:"Standard",   price:349,  priceAn:3490,  maxProjects:999, maxCerts:999, multiUser:false, maxUsers:1,   watermark:false, nzebReport:true,  docxExport:true,  exportXML:false, brandingCPE:false, api:false },
  pro:        { id:"pro",        label:"Pro",        price:309,  priceAn:4990,  maxProjects:999, maxCerts:999, multiUser:false, maxUsers:1,   watermark:false, nzebReport:true,  docxExport:true,  exportXML:true,  brandingCPE:false, api:false },
  business:   { id:"business",   label:"Business",   price:699,  priceAn:5990,  maxProjects:999, maxCerts:999, multiUser:true,  maxUsers:10,  watermark:false, nzebReport:true,  docxExport:true,  exportXML:true,  brandingCPE:true,  api:true  },
  enterprise: { id:"enterprise", label:"Enterprise", price:0,    priceAn:0,     maxProjects:999, maxCerts:999, multiUser:true,  maxUsers:999, watermark:false, nzebReport:true,  docxExport:true,  exportXML:true,  brandingCPE:true,  api:true  },
  // backward compat
  asociatie:  { id:"business",   label:"Business",   price:699,  priceAn:5990,  maxProjects:999, maxCerts:999, multiUser:true,  maxUsers:10,  watermark:false, nzebReport:true,  docxExport:true,  exportXML:true,  brandingCPE:true,  api:true  },
};
